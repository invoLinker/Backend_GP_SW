import { Injectable, Logger, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { db, firebaseAdmin } from '../Firebase/firebase.config';
import { CreateNotificationDto, NotificationChannel, AttachmentDto } from './create-notification.dto';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  constructor(
    private readonly notificationGateway: NotificationGateway
  ) {}

  async sendNotification(dto: CreateNotificationDto, file?: Express.Multer.File) {
    try {
      let attachmentInfo: AttachmentDto | null = null;
      if (file) {
        attachmentInfo = {
          filename: file.originalname,
          path: `uploads/notification/${file.filename}`,
        };
      }

      // حفظ الاشعار في Firestore
      const notificationRef = db.collection('notifications').doc();
      const notificationId = notificationRef.id;
      
      await notificationRef.set({
        title: dto.title,
        message: dto.message,
        userId: dto.userId,
        channel: dto.channel,
        category: dto.category || 'general',
        payload: { ...dto.payload, attachment: attachmentInfo },
        read: false,
        sender: dto.userEmail || 'System',
        status: 'pending', // pending, sent, delivered, failed
        deliveryInfo: {}, // سيتم تحديثه بعد الإرسال
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      this.logger.log(`Notification saved in Firestore for user: ${dto.userId}, id: ${notificationId}`);

      switch (dto.channel) {
        case NotificationChannel.EMAIL:
          if (!dto.userEmail) throw new Error('User Email is required');
          await this.transporter.sendMail({
            from: `"🖇InvoLinker" <${process.env.EMAIL_USER}>`,
            to: dto.userEmail,
            subject: dto.title,
            text: dto.message,
            attachments: file ? [{ filename: file.originalname, path: `uploads/notification/${file.filename}` }] : [],
          });
          this.logger.log(`Email sent to ${dto.userEmail}`);
          break;

        case NotificationChannel.IN_APP:
          // In-App notification (سيتم إرساله عبر WebSocket في النهاية)
          this.logger.log(`In-App notification ready for user: ${dto.userId}`);
          break;

        case NotificationChannel.PUSH:
          // Push يحتاج FCM token
          const pushResult = await this.sendPushNotification(dto, attachmentInfo, notificationId);
          
          // تحديث status في Firestore
          await notificationRef.update({
            status: pushResult.success ? 'sent' : 'failed',
            deliveryInfo: {
              success: pushResult.success,
              messageIds: pushResult.messageIds || [],
              devicesCount: pushResult.devicesCount || 0,
              successCount: pushResult.successCount || 0,
              failureCount: pushResult.failureCount || 0,
              errors: pushResult.errors || [],
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            },
          });
          break;

        default:
          throw new Error('Invalid channel');
      }

      // إرسال الاشعار عبر WebSocket لجميع القنوات (لإظهاره في In-App)
      const wsNotificationData = {
        id: notificationId,
        title: dto.title,
        message: dto.message,
        userId: dto.userId,
        category: dto.category || 'general',
        payload: { ...dto.payload, attachment: attachmentInfo },
        read: false,
        sender: dto.userEmail || 'System',
        timestamp: new Date().toISOString(),
      };
      this.notificationGateway.sendToUser(dto.userId, wsNotificationData);

      // إرجاع معلومات مفصلة عن حالة الإشعار
      const notificationDoc = await notificationRef.get();
      const notificationDocData = notificationDoc.data();
      
      return {
        success: true,
        message: 'Notification processed',
        id: notificationId,
        status: notificationDocData?.status || 'sent',
        deliveryInfo: notificationDocData?.deliveryInfo || {},
      };
    } catch (error) {
      this.logger.error('Error sending notification', error);
      throw error;
    }
  }

  async getNotificationsByUser(userId: string) {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        message: data.message,
        isRead: data.read,
        timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        sender: data.sender || 'System',
        type: data.category || 'general',
        status: data.status || 'sent',
        deliveryInfo: data.deliveryInfo || {},
      };
    });
  }

  /**
   * الحصول على حالة الإشعار (status) ومعلومات التسليم
   */
  async getNotificationStatus(notificationId: string) {
    const notificationRef = db.collection('notifications').doc(notificationId);
    const doc = await notificationRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    const data = doc.data();
    return {
      id: notificationId,
      status: data?.status || 'unknown', // pending, sent, delivered, failed
      deliveryInfo: data?.deliveryInfo || {},
      createdAt: data?.createdAt?.toDate().toISOString() || null,
      title: data?.title || '',
      message: data?.message || '',
      channel: data?.channel || '',
    };
  }

  async markAsRead(notificationId: string) {
    const notificationRef = db.collection('notifications').doc(notificationId);
    const doc = await notificationRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Notification not found');
    }

    await notificationRef.update({ read: true });
    this.logger.log(`Notification ${notificationId} marked as read`);

    return { success: true, message: 'Notification marked as read' };
  }

  async markAllAsReadByUser(userId: string) {
  const notificationsRef = db.collection('notifications').where('userId', '==', userId);
  const snapshot = await notificationsRef.get();

  if (snapshot.empty) {
    return { success: true, message: 'No notifications to mark as read' };
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
  this.logger.log(`All notifications for user ${userId} marked as read`);

  return { success: true, message: 'All notifications marked as read' };
}

  /**
   * إرسال Push Notification عبر FCM
   * يدعم multiple tokens (لأن المستخدم قد يكون له عدة أجهزة)
   * @returns معلومات مفصلة عن حالة الإرسال
   */
  private async sendPushNotification(
    dto: CreateNotificationDto,
    attachmentInfo: AttachmentDto | null,
    notificationId: string,
  ): Promise<{
    success: boolean;
    messageIds?: string[];
    devicesCount: number;
    successCount: number;
    failureCount: number;
    errors?: Array<{ token: string; error: string }>;
  }> {
    try {
      // جلب FCM tokens من Firestore
      const tokenDoc = await db.collection('fcm_tokens').doc(dto.userId).get();
      
      if (!tokenDoc.exists) {
        throw new Error(`FCM token not found for user: ${dto.userId}`);
      }

      const tokenData = tokenDoc.data();
      
      // دعم single token أو array of tokens
      const tokens: string[] = Array.isArray(tokenData?.tokens)
        ? tokenData.tokens.filter((t: string) => t && t.trim())
        : tokenData?.token
        ? [tokenData.token]
        : [];

      if (tokens.length === 0) {
        throw new Error(`No valid FCM tokens found for user: ${dto.userId}`);
      }

      // إعداد البيانات المرسلة
      const dataPayload: Record<string, string> = {
        notificationId, // ID الإشعار من Firestore
        category: dto.category || 'general',
        userId: dto.userId,
        ...(dto.payload || {}),
      };

      if (attachmentInfo) {
        dataPayload.attachment = attachmentInfo.path;
        dataPayload.attachmentFilename = attachmentInfo.filename;
      }

      // إعداد الـ notification payload
      const notificationPayload: admin.messaging.NotificationMessagePayload = {
        title: dto.title,
        body: dto.message,
      };

      // إعداد الـ message options (base options بدون token)
      const baseMessageOptions: Omit<admin.messaging.TokenMessage, 'token'> = {
        notification: notificationPayload,
        data: Object.fromEntries(
          Object.entries(dataPayload).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'default_channel',
            priority: 'high' as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            requireInteraction: false,
          },
        },
      };

      // إرسال لجميع الأجهزة (multicast)
      if (tokens.length === 1) {
        // Single token
        try {
          const messageId = await firebaseAdmin.messaging().send({
            ...baseMessageOptions,
            token: tokens[0],
          });
          
          this.logger.log(
            `✅ Push notification sent to user ${dto.userId}, messageId: ${messageId}, notificationId: ${notificationId}`
          );
          
          return {
            success: true,
            messageIds: [messageId],
            devicesCount: 1,
            successCount: 1,
            failureCount: 0,
          };
        } catch (error: any) {
          this.logger.error(`❌ Failed to send push notification to user ${dto.userId}:`, error);
          
          // تنظيف token إذا كان invalid
          if (error.code === 'messaging/invalid-registration-token') {
            await this.cleanupInvalidTokens(dto.userId, [tokens[0]]);
          }
          
          return {
            success: false,
            devicesCount: 1,
            successCount: 0,
            failureCount: 1,
            errors: [{ token: tokens[0], error: error.message || 'Unknown error' }],
          };
        }
      } else {
        // Multiple tokens (multicast)
        const response = await firebaseAdmin.messaging().sendEach(
          tokens.map(token => ({
            ...baseMessageOptions,
            token,
          }))
        );
        
        const messageIds: string[] = [];
        const errors: Array<{ token: string; error: string }> = [];
        const invalidTokens: string[] = [];
        
        response.responses.forEach((resp, idx) => {
          if (resp.success && resp.messageId) {
            messageIds.push(resp.messageId);
          } else {
            const errorMsg = resp.error?.message || 'Unknown error';
            errors.push({ token: tokens[idx], error: errorMsg });
            
            if (resp.error?.code === 'messaging/invalid-registration-token') {
              invalidTokens.push(tokens[idx]);
            }
          }
        });
        
        this.logger.log(
          `📊 Push notification results for user ${dto.userId} (notificationId: ${notificationId}): ` +
          `${response.successCount}/${tokens.length} succeeded, ${response.failureCount} failed`
        );

        // تنظيف tokens الفاشلة (invalid tokens)
        if (invalidTokens.length > 0) {
          await this.cleanupInvalidTokens(dto.userId, invalidTokens);
        }
        
        return {
          success: response.successCount > 0,
          messageIds,
          devicesCount: tokens.length,
          successCount: response.successCount,
          failureCount: response.failureCount,
          errors: errors.length > 0 ? errors : undefined,
        };
      }
    } catch (error: any) {
      this.logger.error(`Error sending push notification to user ${dto.userId}:`, error);
      
      // لا نرمي error إذا كان المشكلة في FCM token فقط (لأن باقي القنوات قد تعمل)
      if (error.message?.includes('FCM token not found') || error.message?.includes('No valid FCM tokens')) {
        throw new Error(`Push notification failed: ${error.message}`);
      }
      
      // لأخطاء أخرى، نرمي error لكن نكمل باقي القنوات
      throw error;
    }
  }

  /**
   * تنظيف FCM tokens الفاشلة/غير صالحة
   */
  private async cleanupInvalidTokens(userId: string, invalidTokens: string[]) {
    try {
      const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
      if (!tokenDoc.exists) return;

      const tokenData = tokenDoc.data();
      
      if (Array.isArray(tokenData?.tokens)) {
        // إزالة invalid tokens من الـ array
        const validTokens = tokenData.tokens.filter(
          (t: string) => !invalidTokens.includes(t)
        );
        
        await db.collection('fcm_tokens').doc(userId).update({
          tokens: validTokens,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        this.logger.log(`Cleaned up ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
      } else if (tokenData?.token && invalidTokens.includes(tokenData.token)) {
        // إذا كان single token وهو invalid، نحذف المستند
        await db.collection('fcm_tokens').doc(userId).delete();
        this.logger.log(`Deleted FCM token document for user ${userId} (invalid token)`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up invalid tokens for user ${userId}:`, error);
    }
  }

  /**
   * حفظ/تحديث FCM token للمستخدم
   * يمكن استدعاؤها من endpoint منفصل عند تسجيل الدخول أو تحديث الـ token
   */
  async saveFCMToken(
    userId: string, 
    token: string, 
    deviceInfo?: { platform?: string; deviceId?: string; appId?: string }
  ) {
    try {
      const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
      
      if (tokenDoc.exists) {
        const tokenData = tokenDoc.data();
        
        if (Array.isArray(tokenData?.tokens)) {
          // إذا كان array موجود، نضيف token جديد إذا لم يكن موجود
          if (!tokenData.tokens.includes(token)) {
            await db.collection('fcm_tokens').doc(userId).update({
              tokens: admin.firestore.FieldValue.arrayUnion(token),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              ...(deviceInfo && { deviceInfo }),
            });
          }
        } else if (tokenData?.token && tokenData.token !== token) {
          // إذا كان single token مختلف، نحوله لـ array
          await db.collection('fcm_tokens').doc(userId).update({
            tokens: [tokenData.token, token],
            token: admin.firestore.FieldValue.delete(), // نحذف الـ single token
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(deviceInfo && { deviceInfo }),
          });
        }
      } else {
        // إنشاء مستند جديد
        await db.collection('fcm_tokens').doc(userId).set({
          token, // نضيف single token للتوافق مع الكود القديم
          tokens: [token], // ونضيف array للدعم المستقبلي
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(deviceInfo && { deviceInfo }),
        });
      }
      
      this.logger.log(`FCM token saved/updated for user: ${userId}`);
      return { success: true, message: 'FCM token saved successfully' };
    } catch (error) {
      this.logger.error(`Error saving FCM token for user ${userId}:`, error);
      throw error;
    }
  }

}

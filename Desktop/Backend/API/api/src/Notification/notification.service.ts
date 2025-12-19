import { Injectable, Logger, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { db, firebaseAdmin } from '../Firebase/firebase.config';
import { CreateNotificationDto, NotificationChannel, AttachmentDto } from './create-notification.dto';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { NotificationGateway } from './notification.gateway';
import axios from 'axios';

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
  await this.sendExpoPushNotification(
    dto.userId,
    dto.title,
    dto.message,
    dto.payload
  );

  await notificationRef.update({
    status: 'sent',
    deliveryInfo: {
      provider: 'expo',
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

private async sendExpoPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  const tokenDoc = await db
    .collection('expo_push_tokens')
    .doc(userId)
    .get();

  if (!tokenDoc.exists) {
    throw new Error(`Expo push token not found for user ${userId}`);
  }

  // ✅ الاسم الصح
  const { token } = tokenDoc.data()!;

  // ✅ Expo بده Array مش Object
  const messages = [
    {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    },
  ];

  const response = await axios.post(
    'https://exp.host/--/api/v2/push/send',
    messages, // ⬅️ ARRAY
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}


  /**
   * تنظيف FCM tokens الفاشلة/غير صالحة
   */
  private async cleanupInvalidTokens(userId: string, invalidTokens: string[]) {
    try {
      const tokenDoc = await db.collection('expo_push_tokens').doc(userId).get();
      if (!tokenDoc.exists) return;

      const tokenData = tokenDoc.data();
      
      if (Array.isArray(tokenData?.tokens)) {
        // إزالة invalid tokens من الـ array
        const validTokens = tokenData.tokens.filter(
          (t: string) => !invalidTokens.includes(t)
        );
        
        await db.collection('expo_push_tokens').doc(userId).update({
          tokens: validTokens,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        this.logger.log(`Cleaned up ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
      } else if (tokenData?.token && invalidTokens.includes(tokenData.token)) {
        // إذا كان single token وهو invalid، نحذف المستند
        await db.collection('expo_push_tokens').doc(userId).delete();
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
  async saveExpoPushToken(
  userId: string,
  token: string,
  deviceInfo?: {
    platform?: string;
    deviceId?: string;
    appId?: string;
  }
) {
  await db.collection('expo_push_tokens').doc(userId).set({
    token,
    deviceInfo: deviceInfo || {},
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  this.logger.log(`Expo push token saved for user ${userId}`);
  return { success: true, message: 'Expo push token saved' };
}


}

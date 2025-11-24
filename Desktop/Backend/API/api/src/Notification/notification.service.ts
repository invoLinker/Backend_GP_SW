import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '../Firebase/firebase.config';
import { CreateNotificationDto, NotificationChannel, AttachmentDto } from './create-notification.dto';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';

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
      await notificationRef.set({
        title: dto.title,
        message: dto.message,
        userId: dto.userId,
        channel: dto.channel,
        category: dto.category || 'general',
        payload: { ...dto.payload, attachment: attachmentInfo },
        read: false,
        sender: dto.userEmail || 'System',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      this.logger.log(`Notification saved in Firestore for user: ${dto.userId}`);

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
          // In-App بدون FCM token
          this.logger.log(`In-App notification ready for user: ${dto.userId}`);
          break;

        case NotificationChannel.PUSH:
          // Push يحتاج FCM token
          const tokenDoc = await db.collection('fcm_tokens').doc(dto.userId).get();
          const fcmToken = tokenDoc.exists ? tokenDoc.data()?.token : null;
          if (!fcmToken) throw new Error('FCM token not found for user');

          await admin.messaging().send({
            token: fcmToken,
            notification: { title: dto.title, body: dto.message },
            data: { ...dto.payload, attachment: attachmentInfo ? attachmentInfo.path : '' },
          });
          this.logger.log(`Push notification sent to user: ${dto.userId}`);
          break;

        default:
          throw new Error('Invalid channel');
      }

      return { success: true, message: 'Notification processed', id: notificationRef.id };
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
      };
    });
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

}

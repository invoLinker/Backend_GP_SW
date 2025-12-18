import { Controller, Post, Body, Get, Param, Patch, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './create-notification.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async sendNotification(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any
  ) {
    if (body.payload && typeof body.payload === 'string') {
      try {
        body.payload = JSON.parse(body.payload);
      } catch (e) {
        body.payload = {};
      }
    }

    const dto = new CreateNotificationDto();
    Object.assign(dto, body);

    return this.notificationService.sendNotification(dto, file);
  }

  @Post('fcm-token')
  async saveFCMToken(
    @Body() body: { 
      userId: string; 
      token: string; 
      platform?: string; 
      deviceId?: string;
      appId?: string; // Expo app identifier
    }
  ) {
    if (!body.userId || !body.token) {
      throw new BadRequestException('userId and token are required');
    }

    // Validate FCM token format (should be a long string)
    if (typeof body.token !== 'string' || body.token.length < 50) {
      throw new BadRequestException('Invalid FCM token format');
    }

    return this.notificationService.saveFCMToken(
      body.userId,
      body.token,
      {
        platform: body.platform || 'expo', // Default to 'expo' if not specified
        deviceId: body.deviceId,
        appId: body.appId, // Expo app identifier
      }
    );
  }

  @Get(':userId')
  async getNotifications(@Param('userId') userId: string) {
    return this.notificationService.getNotificationsByUser(userId);
  }

  @Patch(':notificationId/read')
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationService.markAsRead(notificationId);
  }

  @Patch('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsReadByUser(userId);
  }

  @Get('status/:notificationId')
  async getNotificationStatus(@Param('notificationId') notificationId: string) {
    return this.notificationService.getNotificationStatus(notificationId);
  }
}

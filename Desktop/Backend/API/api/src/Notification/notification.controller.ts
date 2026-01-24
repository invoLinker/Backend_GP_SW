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
async savePushToken(
  @Body()
  body: {
    userId: string;
    token: string;       
    platform?: string;
    deviceId?: string;
    appId?: string;
  }
) {
  const { userId, token, platform, deviceId, appId } = body;

  if (!userId || !token) {
    throw new BadRequestException('userId and token are required');
  }

  if (!token.startsWith('ExponentPushToken')) {
    throw new BadRequestException('Invalid Expo push token');
  }

  return this.notificationService.saveExpoPushToken(
    userId,
    token,
    {
      platform: platform || 'expo',
      deviceId,
      appId,
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

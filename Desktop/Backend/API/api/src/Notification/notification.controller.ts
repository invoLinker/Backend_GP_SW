import { Controller, Post, Body, Get, Param, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
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
}

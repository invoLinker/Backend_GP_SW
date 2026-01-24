import { IsString, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';

export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
}

export enum NotificationCategory {
  PAYMENT = 'payment',
  TASK = 'task',
  SYSTEM = 'system',
  SECURITY = 'security',
  GENERAL = 'general',
}

export class AttachmentDto {
  @IsString()
  filename: string;
  @IsString()
  path: string;
}

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  userId: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;

  @IsString()
  @IsOptional()
  userEmail?: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];
}

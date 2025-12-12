import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports:[MulterModule.register({
              storage: diskStorage({
                destination: './uploads/notification', 
                filename: (req, file, cb) => {
                  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                  cb(null, uniqueSuffix + extname(file.originalname));
                },
              }),
            })],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}

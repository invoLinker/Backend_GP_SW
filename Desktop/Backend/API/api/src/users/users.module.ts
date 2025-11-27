import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './users.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesModule } from '../roles/roles.module';
import { Role } from 'src/roles/roles.model';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';
import { NotificationService } from 'src/Notification/notification.service';
import { NotificationModule } from 'src/Notification/notification.module';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads', 
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }), NotificationModule,
    SequelizeModule.forFeature([User,Role, HistoryLog]),
    forwardRef(() => RolesModule),RolePermissionModule,
    JwtModule.register({
          secret: process.env.JWT_SECRET || 'secretKey',
          signOptions: { expiresIn: '1d' },
        }),
  ],
  controllers: [UsersController],
  providers: [UsersService, HistoryLogService, NotificationService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { verification_exceptions } from './verification_exceptions.model';
import { User } from '../users/users.model';
import { AuditExceptionService } from './verification_exceptions.service';
import { AuditExceptionController } from './verification_exceptions.controller';
import { InvoiceService } from 'src/Verification/verification.service';
import { VerificationModule } from 'src/Verification/verification.module';
import { NotificationModule } from 'src/Notification/notification.module';

@Module({
  imports: [
    SequelizeModule.forFeature([verification_exceptions, User]),
    VerificationModule,
    NotificationModule
  ],
  providers: [AuditExceptionService],
  controllers: [AuditExceptionController],
  exports: [AuditExceptionService],
})
export class verificationExceptionsModule {}

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { VerificationLog } from './verification-log.model';
import { AIVerificationService } from './verification-log.service';
import { AIVerificationController } from './verification-log.controller';

@Module({
  imports: [SequelizeModule.forFeature([VerificationLog])],
  providers: [AIVerificationService],
  controllers: [AIVerificationController],
  exports: [AIVerificationService],
})
export class VerificationLogModule {}

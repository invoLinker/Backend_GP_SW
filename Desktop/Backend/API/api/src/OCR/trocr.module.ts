import { Module } from '@nestjs/common';
import { TrOcrService } from './TrOcrService';
import { TrOcrController } from './TrOcrController';

@Module({
  controllers: [TrOcrController],
  providers: [TrOcrService],
})
export class TrOcrModule {}

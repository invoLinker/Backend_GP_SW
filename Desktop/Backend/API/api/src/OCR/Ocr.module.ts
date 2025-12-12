import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { TrOcrController } from './TrOcrController';
import { OcrService } from './ocr.service';
import { TrOcrService } from './TrOcrService';

@Module({
  controllers: [OcrController, TrOcrController],
  providers: [OcrService, TrOcrService],
})
export class OcrModule {}

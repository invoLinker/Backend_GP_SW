import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
// import { imgController } from './imgController';
import { OcrService } from './ocr.service';
// import { imgService } from './imgService';

@Module({
  controllers: [OcrController],
  providers: [OcrService],
})
export class OcrModule {}

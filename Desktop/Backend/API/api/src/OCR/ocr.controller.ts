import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';
import type { Express } from 'express';
import { memoryStorage } from 'multer';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractInvoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    try {
      // ocr
      const text = await this.ocrService.extractText(file);

      // this for ai to extract info from the text
      const invoiceData = await this.ocrService.extractDataByType(text);

      return {
        // extractedText: text,
        invoiceData: invoiceData,
      };
    } catch (err) {
      return { error: err.message };
    }
  }




}



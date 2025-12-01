// import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { OcrService } from './ocr.service';
// import type { Express } from 'express';
// import { memoryStorage } from 'multer';

// @Controller('ocr')
// export class OcrController {
//   constructor(private readonly ocrService: OcrService) {}

//   @Post('extract')
//   @UseInterceptors(FileInterceptor('file'))
//   async extractInvoice(@UploadedFile() file: Express.Multer.File) {
//     if (!file) {
//       return { error: 'No file uploaded' };
//     }
//     console.log("BACKEND RECEIVED SIZE:", file.buffer.length);
// console.log("FRONTEND FILE SIZE:", file.size);

//     try {
//       // ocr
//       const text = await this.ocrService.extractText(file);

//       // this for ai to extract info from the text
//       const invoiceData = await this.ocrService.extractDataByType(text);

//       return {
//         // extractedText: text,
//         invoiceData: invoiceData,
//         file: `/uploads/OCR/${file.filename}`,
//       };
//     } catch (err) {
//       return { error: err.message };
//     }
//   }


// }



import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import crypto from 'crypto';
import { OcrService } from './ocr.service';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file')) // يستعمل memoryStorage
  async extractInvoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    // 🟢 توليد اسم للملف بدون حفظ
    const originalExt = file.originalname.split('.').pop();
    const generatedName =
      crypto.randomBytes(8).toString('hex') + '.' + originalExt;

    try {
      // OCR
      const text = await this.ocrService.extractText(file);

      // AI extraction
      const invoiceData = await this.ocrService.extractDataByType(text);

      return {
        invoiceData,
        file: generatedName,   // ← هون الاسم
      };
    } catch (err) {
      return { error: err.message };
    }
  }
}

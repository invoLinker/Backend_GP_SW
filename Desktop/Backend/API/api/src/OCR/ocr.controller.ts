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



import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import crypto from 'crypto';
import { OcrService } from './ocr.service';
import { TrOcrService } from './TrOcrService';

@Controller('ocr')
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly trOcrService: TrOcrService,
  ) {}

  @Post('extract2')
  @UseInterceptors(FileInterceptor('file')) 
  async extractInvoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    const originalExt = file.originalname.split('.').pop();
    const generatedName =
      crypto.randomBytes(8).toString('hex') + '.' + originalExt;

    try {
      const text = await this.ocrService.extractText(file);

      const invoiceData = await this.ocrService.extractDataByType(text);

      return {
        invoiceData,
        file: generatedName,   
      };
    } catch (err) {
      return { error: err.message };
    }
  }



  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractUnified(@UploadedFile() file: Express.Multer.File){
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const originalExt = file.originalname.split('.').pop();
    const generatedName =
      crypto.randomBytes(8).toString('hex') + '.' + originalExt;

    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext);
    const isPdf = ext === 'pdf';
    const isExcel = ['xls', 'xlsx'].includes(ext);

      let text;
      let invoiceData;

      if (isPdf || isExcel) {
         text = await this.ocrService.extractText(file);

       invoiceData = await this.ocrService.extractDataByType(text);
      }
      else if (isImage) {
        console.log('🔍 Auto-detecting image type...');
      
           text = await this.trOcrService.recognize(file);

           invoiceData = await this.ocrService.extractDataByType(text);
          
          if (text && text.trim().length < 10) {
            console.log('📄 Trying Tesseract for printed text...');
            text = await this.ocrService.extractText(file);
            invoiceData = await this.ocrService.extractDataByType(text);
          }
        
      }
      
       return {
       invoiceData,
       file: generatedName,
      };
    
  }
}

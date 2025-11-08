// import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { imgService } from './imgService';

// @Controller('ocrr')
// export class imgController {
//   constructor(private readonly ocrService: imgService) {}

//   @Post('extractt')
//   @UseInterceptors(FileInterceptor('file'))
//   async extractText(@UploadedFile() file: Express.Multer.File) {
//     if (!file) {
//       return { error: 'No file uploaded' };
//     }

//     try {
//       const text = await this.ocrService.extractText(file);
//       return { text };
//     } catch (err) {
//       return { error: err.message };
//     }
//   }
// }

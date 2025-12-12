import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrOcrService } from './TrOcrService'
@Controller('ocr2')
export class TrOcrController {
  constructor(private readonly trOcrService: TrOcrService) {}

    @Post("handwriting")
    @UseInterceptors(FileInterceptor("image"))
     async scan(@UploadedFile() file: Express.Multer.File) {
    const text = await this.trOcrService.recognize(file);
    return { text };
  }

}

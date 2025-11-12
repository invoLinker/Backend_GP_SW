import { Controller, Post, Body } from '@nestjs/common';
import { GenerateTxtService } from './GenerateTxt.Service';

@Controller('ai')
export class GenerateTxtController {
  constructor(private readonly huggingFaceService: GenerateTxtService) {}

  @Post('parse')
  async parseNotes(@Body() body: { notes: string; totalAmount: number , invoiceDate: Date}) {
    return await this.huggingFaceService.parseInstallments(body.notes, body.totalAmount, body.invoiceDate);
  }
}

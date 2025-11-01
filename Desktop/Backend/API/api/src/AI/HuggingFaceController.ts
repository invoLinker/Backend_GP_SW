import { Controller, Post, Body } from '@nestjs/common';
import { HuggingFaceService } from './AiService';

@Controller('ai')
export class HuggingFaceController {
  constructor(private readonly huggingFaceService: HuggingFaceService) {}

  @Post('parse')
  async parseNotes(@Body() body: { notes: string; totalAmount: number , invoiceDate: Date}) {
    return await this.huggingFaceService.parseInstallments(body.notes, body.totalAmount, body.invoiceDate);
  }
}

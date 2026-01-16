import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { AIVerificationService } from './verification-log.service';

@Controller('verificationLog')
export class AIVerificationController {
  constructor(private readonly aiVerificationService: AIVerificationService) {}

  @Post('log-ai-message')
  async logAIMessage(
    @Body() body: {
      poNumber: string;
      supplierId: number;
      stage: 'PO-SI' | 'PO-DN' | 'PO-GR';
      aiMessage: string;
    },
  ) {
    return this.aiVerificationService.createLog(
      body.poNumber,
      body.supplierId,
      body.stage,
      body.aiMessage,
    );
  }

  @Get('logs')
  async getLogs(@Query('poNumber') poNumber: string) {
    return this.aiVerificationService.getLogsByPONumber(poNumber);
  }

}

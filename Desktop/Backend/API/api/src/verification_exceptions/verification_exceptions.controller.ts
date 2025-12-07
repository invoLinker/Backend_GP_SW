import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request
} from '@nestjs/common';
import { AuditExceptionService } from './verification_exceptions.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { InvoiceService } from 'src/Verification/verification.service';

@Controller('verification_exceptions')
export class AuditExceptionController {
  constructor(private readonly service: AuditExceptionService,
      private readonly workflowService: InvoiceService

  ) {}

//   @Post()
//   @UseGuards(JwtAuthGuard)
//   async create(@Body() body: any, @Request() req) {
//     const { po_number, description } = body;

//     return await this.service.create(po_number, description, req.user.userId);
//   }

@Post()
@UseGuards(JwtAuthGuard)
async create(@Body() body: any, @Request() req) {
  const { po_number, description, stage } = body;

  // أولاً أنشئ الرسالة
  const exception = await this.service.create(
    po_number,
    description,
    req.user.userId
  );

  await this.workflowService.updateWorkflowState(po_number, stage, false);

  return {
    message: 'Message created and workflow halted',
    exception,
  };
}


  @Get('pending')
  @UseGuards(JwtAuthGuard)
  async getPending() {
    return await this.service.getPending();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const { status } = body;

    return await this.service.updateStatus(id, status);
  }
}

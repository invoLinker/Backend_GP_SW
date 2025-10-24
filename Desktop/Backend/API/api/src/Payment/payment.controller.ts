import { Controller, Post, Body, Param, Get, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { CreatePaymentDto } from './CreatePaymentDto';
import { Payment } from './Payment.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

@Post(':invoice_id')
@UseGuards(JwtAuthGuard)
@PermissionName('create_payment')
async create(@Param('invoice_id') invoice_id: number): Promise<Payment> {
  return this.paymentsService.createPayment(invoice_id);
}


//   @Get('invoice/:invoice_id')
//   @UseGuards(JwtAuthGuard)
//   @PermissionName('get_payment')
//   async getByInvoice(@Param('invoice_id', ParseIntPipe) invoice_id: number): Promise<Payment[]> {
//     return this.paymentsService.getPaymentsByInvoice(invoice_id);
//   }
}

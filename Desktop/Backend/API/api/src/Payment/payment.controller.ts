import { Controller, Post, Param, UseGuards, ParseIntPipe, Body, Patch,Get, Delete, Query } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { Payment } from './Payment.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { CreatePaymentDto } from './CreatePaymentDto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':PO_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_payment')
  async payInvoice(@Param('PO_id') PO_id: number, @Body() dto:CreatePaymentDto) {
    const payments =  this.paymentsService.createPayment(PO_id, dto);
    return payments;
  }

  @Patch('complete/:payment_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('comfirm_or_ fail_payment')
  async completePayment(
    @Param('payment_id') payment_id: number,
    @Body('status') status: 'Completed' | 'Failed',
  ):Promise<{ message: string }>  {
    return this.paymentsService.updatePaymentStatus(payment_id, status);
  }

  @Get('invoice/:id/payments')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_all_payment_for_invoice')
  async getInvoicePayments(@Param('id') invoice_id: number) {
    return this.paymentsService.getInvoicePayments(invoice_id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_payment')
  async getPayment(@Param('id') payment_id: number) {
    return this.paymentsService.getPayment(payment_id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_payment')
  async deletePayment(@Param('id') payment_id: number) {
    return this.paymentsService.deletePayment(payment_id);
  }

  @Patch(':id/details')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_payment')
  async updatePaymentDetails(@Param('id') payment_id: number, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.updatePayment(payment_id, dto);
  }


  @Get('invoice/:id/status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_payment')
  async getInvoiceStatus(@Param('id') invoice_id: number) {
    return this.paymentsService.getInvoiceStatus(invoice_id);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_payment')
  async getByStatus(@Param('status') status: 'Pending' | 'Completed' | 'Failed') {
    return await this.paymentsService.getPaymentsByStatus(status);
  }

  //test
  // @Post()
  // parsePayment(@Body() body: { notes: string; totalAmount: number }) {
  //   const { notes, totalAmount } = body;
  //   return PaymentParser.parseInstallments(notes, totalAmount);
  // }


   
}



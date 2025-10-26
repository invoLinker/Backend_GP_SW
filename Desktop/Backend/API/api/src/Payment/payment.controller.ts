import { Controller, Post, Param, UseGuards, ParseIntPipe, Body } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { Payment } from './Payment.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':invoice_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_payment')
  async payInvoice(@Param('invoice_id') invoice_id: number): Promise<Payment> {
    return this.paymentsService.createPayment(invoice_id);
  }

   @Post('complete/:payment_id')
  async completePayment(
    @Param('payment_id', ParseIntPipe) payment_id: number,
    @Body('details') details: string
  ): Promise<Payment> {
    return this.paymentsService.completePayment(payment_id, details);
  }


  @Post()
  parsePayment(@Body() body: { notes: string; totalAmount: number }) {
    const { notes, totalAmount } = body;
    return this.paymentsService.parse(notes, totalAmount);
  }
}

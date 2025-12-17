import { Controller, Post, Param, UseGuards, ParseIntPipe, Body, Patch,Get, Delete, Query, Request } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { Payment } from './Payment.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { CreatePaymentDto } from './CreatePaymentDto';
import { HistoryLogService } from 'src/History/history-log.service';
import { HistoryCategory, HistorySeverity } from 'src/History/create-history-log.dto';
import { StripePaymentService } from './stripe-payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService,
              private readonly historyLogService: HistoryLogService,
              private readonly stripeService: StripePaymentService

  ) {}

  @Post(':PO_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_payment')
  async payInvoice(@Param('PO_id') PO_id: number, @Body() dto:CreatePaymentDto, @Request() req) {
    try {
      const payment = await this.paymentsService.createPayment(PO_id, dto);

      await this.historyLogService.createLog({
        action: 'Payment Created',
        description: `Payment created for PO id=${PO_id}`,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: payment.message,
      });

      return payment;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Payment Creation Failed',
        description: error.message,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Patch('complete/:payment_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('comfirm_or_ fail_payment')
  async completePayment(
    @Param('payment_id') payment_id: number,
    @Body('status') status: 'Completed' | 'Failed',
    @Request() req
  ):Promise<{ message: string }>  {
    try {
      const result = await this.paymentsService.updatePaymentStatus(payment_id, status);

      await this.historyLogService.createLog({
        action: 'Payment Status Updated',
        description: `Payment with id=${payment_id} marked as ${status}`,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity:
          status === 'Completed'
            ? HistorySeverity.SUCCESS
            : HistorySeverity.WARNING,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Payment Status Update Failed',
        description: error.message,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Get('invoice/:id/payments')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_all_payment_for_invoice')
  async getInvoicePayments(@Param('id') invoice_id: number) {
    return this.paymentsService.getInvoicePayments(invoice_id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_all_payment')
  async getAllPaymentBySupplier(@Query('id') id:number) {
    return this.paymentsService.getAllPaymentBySupplier(id);
  }

  @Get('paymentOfficier')
  @UseGuards(JwtAuthGuard)
  async paymentOfficier() {
    return this.paymentsService.paymentOfficier();
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
  async deletePayment(@Param('id') payment_id: number, @Request() req) {
    try {
      const result = await this.paymentsService.deletePayment(payment_id);

      await this.historyLogService.createLog({
        action: 'Payment Deleted',
        description: `Payment with ID ${payment_id} deleted`,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Payment Deletion Failed',
        description: error.message,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Patch(':id/details')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_payment')
  async updatePaymentDetails(@Param('id') payment_id: number, @Body() dto: CreatePaymentDto, @Request() req) {
     try {
      const result = await this.paymentsService.updatePayment(payment_id, dto);

      await this.historyLogService.createLog({
        action: 'Payment Updated',
        description: `Payment with ID ${payment_id} updated`,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Payment Updated Failed',
        description: error.message,
        user: req?.user?.email ?? 'Unknown',
        userRole: req?.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
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

  @Post("stripe-intent")
async createStripeIntent(@Body("amount") amount: number, @Body("currency") currency: string) {
  return this.stripeService.createPaymentIntent(amount, currency);
}


   
}



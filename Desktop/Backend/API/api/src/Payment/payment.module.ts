import { Module } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { PaymentsController } from './payment.controller';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';

@Module({
  imports: [Payment, SupplierInvoice],
  providers: [PaymentsService],
  controllers: [PaymentsController]
})
export class PaymentsModule {}

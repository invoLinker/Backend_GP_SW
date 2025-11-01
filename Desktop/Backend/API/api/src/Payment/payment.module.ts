import { Module } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { PaymentsController } from './payment.controller';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { HuggingFaceService } from 'src/AI/AiService';

@Module({
  imports: [Payment, SupplierInvoice],
  providers: [PaymentsService, HuggingFaceService],
  controllers: [PaymentsController]
})
export class PaymentsModule {}

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentsService } from './payment.service';
import { PaymentsController } from './payment.controller';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { GenerateTxtService } from 'src/GenerateTxt/GenerateTxt.Service';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogModule } from 'src/History/history-log.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Payment, SupplierInvoice]),
    HistoryLogModule,
  ],
  providers: [PaymentsService, GenerateTxtService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}

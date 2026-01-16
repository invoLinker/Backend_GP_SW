import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Stock } from './stock.model';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';
import { NotificationModule } from 'src/Notification/notification.module';
import { InvoiceService } from 'src/Verification/verification.service';
import { VerificationModule } from 'src/Verification/verification.module';

@Module({
  imports: [SequelizeModule.forFeature([Stock, DeliveryNote,GoodsReceipts, SupplierInvoice, HistoryLog]),
  NotificationModule, VerificationModule],
  providers: [StockService, HistoryLogService,],
  controllers: [StockController]
})
export class StockModule {}

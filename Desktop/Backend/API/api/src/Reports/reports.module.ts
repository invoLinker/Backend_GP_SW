import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './Admin/reports.service';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model'; 
import { SupplierInvoiceItem } from '../supplier-invoices/supplier-invoice-item.model';
import { SequelizeModule } from '@nestjs/sequelize';
import { Payment } from 'src/Payment/Payment.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { LlmService } from '../ChatBot/llm.service';
import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { AccountingReportsService } from './Accountant/reports-accounting.service';
import { verification_exceptions } from 'src/verification_exceptions/verification_exceptions.model';
import { Task } from 'src/Task/task.model';

@Module({
  imports: [
    SequelizeModule.forFeature([SupplierInvoice, SupplierInvoiceItem, Payment, PurchaseOrder, DeliveryNote,
         GoodsReceipts, PurchaseOrder, verification_exceptions, Task])
  ],
  controllers: [ReportsController],
  providers: [ReportsService, LlmService, AccountingReportsService],
})
export class ReportsModule {}

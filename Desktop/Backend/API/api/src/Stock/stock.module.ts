// src/stock/stock.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Stock } from './stock.model';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';

@Module({
  imports: [SequelizeModule.forFeature([Stock, DeliveryNote,GoodsReceipts, SupplierInvoice])],
  providers: [StockService],
  controllers: [StockController]
})
export class StockModule {}

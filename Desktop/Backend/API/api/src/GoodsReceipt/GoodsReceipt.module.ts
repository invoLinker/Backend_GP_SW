import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GoodsReceipts } from './GoodsReceipt.model';
import { GoodsReceiptItem } from './GoodsReceiptItem.model';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { GoodsReceiptService } from './GoodsReceipt.service';
import { GoodsReceiptController } from './GoodsReceipt.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      GoodsReceipts,
      GoodsReceiptItem,
      DeliveryNote,
      PurchaseOrder,
    ]),
  ],
  controllers: [GoodsReceiptController],
  providers: [GoodsReceiptService],
})
export class GoodsReceiptModule {}

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GoodsReceipts } from './GoodsReceipt.model';
import { GoodsReceiptItem } from './GoodsReceiptItem.model';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { GoodsReceiptService } from './GoodsReceipt.service';
import { GoodsReceiptController } from './GoodsReceipt.controller';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      GoodsReceipts,
      GoodsReceiptItem,
      DeliveryNote,
      PurchaseOrder,
      HistoryLog
    ]),
  ],
  controllers: [GoodsReceiptController],
  providers: [GoodsReceiptService,HistoryLogService],
})
export class GoodsReceiptModule {}

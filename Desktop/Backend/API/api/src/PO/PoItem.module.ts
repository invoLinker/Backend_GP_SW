import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PurchaseOrderItem } from './PoItem.model';
import { PurchaseOrderItemService } from './PoItem.service';
import { PurchaseOrderItemController } from './PoItem.controller';
import { PurchaseOrder } from './po.model';
import { Item } from 'src/Item/item.model';
import { EditRequest } from 'src/edit_requests/edit_requests.model';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';

@Module({
  imports: [SequelizeModule.forFeature([PurchaseOrderItem, PurchaseOrder, Item, EditRequest, HistoryLog])],
  controllers: [PurchaseOrderItemController],
  providers: [PurchaseOrderItemService, HistoryLogService],
})
export class PurchaseOrderItemModule {}

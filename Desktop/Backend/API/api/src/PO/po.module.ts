import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PurchaseOrder } from './po.model';
import { PurchaseOrderItem } from './PoItem.model';
import { PurchaseOrderService } from './po.service';
import { PurchaseOrderController } from './po.controller';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';
import { PurchaseOrderItemModule } from './PoItem.module';
import { EditRequest } from 'src/edit_requests/edit_requests.model';
import { User } from 'src/users/users.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';

@Module({
  imports: [
  SequelizeModule.forFeature([PurchaseOrder, PurchaseOrderItem, EditRequest, User, Supplier, HistoryLog]),
  RolePermissionModule,
  PurchaseOrderItemModule
  
],

  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService, HistoryLogService],
})
export class PurchaseOrderModule {}

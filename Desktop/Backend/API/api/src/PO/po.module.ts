import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PurchaseOrder } from './po.model';
import { PurchaseOrderItem } from './PoItem.model';
import { PurchaseOrderService } from './po.service';
import { PurchaseOrderController } from './po.controller';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';
import { PurchaseOrderItemModule } from './PoItem.module';
import { EditRequest } from 'src/edit_requests/edit_requests.model';

@Module({
  imports: [
  SequelizeModule.forFeature([PurchaseOrder, PurchaseOrderItem, EditRequest]),
  RolePermissionModule,
  PurchaseOrderItemModule
  
],

  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
})
export class PurchaseOrderModule {}

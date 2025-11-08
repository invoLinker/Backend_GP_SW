import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Supplier } from './supplier.model';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';
import { PurchaseOrder } from 'src/PO/po.model';

@Module({
  imports: [SequelizeModule.forFeature([Supplier, PurchaseOrder]),
   RolePermissionModule
  ],
})
export class SupplierModule {}

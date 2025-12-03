import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Supplier } from './supplier.model';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';
import { PurchaseOrder } from 'src/PO/po.model';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

@Module({
  imports: [SequelizeModule.forFeature([Supplier, PurchaseOrder]),
   RolePermissionModule
  ],
  controllers:[SupplierController],
  providers:[SupplierService],
  exports:[SupplierModule]
})
export class SupplierModule {}

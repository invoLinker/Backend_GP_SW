import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Supplier } from './supplier.model';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';
import { PurchaseOrder } from 'src/PO/po.model';

@Module({
  imports: [SequelizeModule.forFeature([Supplier, PurchaseOrder]),
   RolePermissionModule
  ],
  providers: [SupplierService],
  controllers: [SupplierController],
})
export class SupplierModule {}

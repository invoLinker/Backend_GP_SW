import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SupplierInvoice } from './supplier-invoice.model';
import { SupplierInvoiceItem } from './supplier-invoice-item.model';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierInvoiceController } from './supplier-invoice.controller';
import { Supplier } from 'src/Suppliers/supplier.model';
import { User } from 'src/users/users.model';
import { InvoiceIncident } from 'src/InvoiceIncident/InvoiceIncident.model';
import { InvoiceIncidentItem } from 'src/InvoiceIncident/InvoiceIncidentItem';

@Module({
  imports: [SequelizeModule.forFeature([SupplierInvoice, SupplierInvoiceItem, Supplier, User, InvoiceIncident, InvoiceIncidentItem])],
  providers: [SupplierInvoiceService],
  controllers: [SupplierInvoiceController],
  exports: [SupplierInvoiceService],
})
export class SupplierInvoiceModule {}

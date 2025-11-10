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
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [SequelizeModule.forFeature([SupplierInvoice, SupplierInvoiceItem, Supplier, User, InvoiceIncident, InvoiceIncidentItem, User, Supplier]),
  MulterModule.register({
  storage: diskStorage({
    destination: './uploads/invoices',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + extname(file.originalname));
    },
  }),
}),
],
  providers: [SupplierInvoiceService],
  controllers: [SupplierInvoiceController],
  exports: [SupplierInvoiceService],
})
export class SupplierInvoiceModule {}

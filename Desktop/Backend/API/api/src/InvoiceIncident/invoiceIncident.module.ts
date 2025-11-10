import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InvoiceIncident } from './InvoiceIncident.model';
import { SupplierIncidentService } from './invoiceIncident.service';
import { SupplierIncidentController } from './invoiceIncident.controller';

import { InvoiceIncidentItem } from './InvoiceIncidentItem';

@Module({
  imports: [
    SequelizeModule.forFeature([
    InvoiceIncident,
    InvoiceIncidentItem,
    ]),
  ],
  controllers: [SupplierIncidentController],
  providers: [SupplierIncidentService],
  exports: [SupplierIncidentService],
})
export class InvoiceIncidentModule {}

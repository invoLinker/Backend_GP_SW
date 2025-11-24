import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InvoiceIncident } from './InvoiceIncident.model';
import { SupplierIncidentService } from './invoiceIncident.service';
import { SupplierIncidentController } from './invoiceIncident.controller';

import { InvoiceIncidentItem } from './InvoiceIncidentItem';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
    InvoiceIncident,
    InvoiceIncidentItem,
    HistoryLog
    ]),
  ],
  controllers: [SupplierIncidentController],
  providers: [SupplierIncidentService, HistoryLogService],
  exports: [SupplierIncidentService],
})
export class InvoiceIncidentModule {}

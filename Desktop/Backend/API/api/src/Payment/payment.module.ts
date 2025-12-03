// import { Module } from '@nestjs/common';
// import { SequelizeModule } from '@nestjs/sequelize';
// import { PaymentsService } from './payment.service';
// import { PaymentsController } from './payment.controller';
// import { Payment } from './Payment.model';
// import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
// import { GenerateTxtService } from 'src/GenerateTxt/GenerateTxt.Service';
// import { HistoryLog } from 'src/History/history-log.model';
// import { HistoryLogModule } from 'src/History/history-log.module';
// import { NotificationModule } from 'src/Notification/notification.module';

// @Module({
//   imports: [
//     SequelizeModule.forFeature([Payment, SupplierInvoice]),
//     HistoryLogModule, NotificationModule
//   ],
//   providers: [PaymentsService, GenerateTxtService],
//   controllers: [PaymentsController],
// })
// export class PaymentsModule {}


import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentsService } from './payment.service';
import { PaymentsController } from './payment.controller';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { GenerateTxtService } from 'src/GenerateTxt/GenerateTxt.Service';
import { HistoryLogModule } from 'src/History/history-log.module';
import { NotificationModule } from 'src/Notification/notification.module';
import { StripePaymentService } from './stripe-payment.service';
import { SupplierModule } from 'src/Suppliers/supplier.module';
import { Supplier } from 'src/Suppliers/supplier.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Payment, SupplierInvoice, Supplier]),
    HistoryLogModule,
    NotificationModule,
  ],
  providers: [PaymentsService, GenerateTxtService, StripePaymentService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}

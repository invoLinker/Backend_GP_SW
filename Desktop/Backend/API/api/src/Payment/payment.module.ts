// // payments.module.ts
// import { Module } from '@nestjs/common';
// import { SequelizeModule } from '@nestjs/sequelize';
// import { PaymentsController } from './payment.controller';
// import { PaymentsService } from './payment.service';
// import { Payment } from './Payment.model';
// import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model'; // فاتورة المورد
// // import { HuggingFaceService } from 'src/AI/hugging.service';
// // import { OpenAIService } from 'src/AI/openai.service';

// @Module({
//   imports: [
//     SequelizeModule.forFeature([Payment, SupplierInvoice]),
//   ],
//   controllers: [PaymentsController],
//   providers: [PaymentsService, 
//     // HuggingFaceService
// ],
// })
// export class PaymentsModule {}

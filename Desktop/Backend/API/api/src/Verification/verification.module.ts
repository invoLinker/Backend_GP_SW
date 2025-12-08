// import { Module } from '@nestjs/common';
// import { SequelizeModule } from '@nestjs/sequelize';

// import { InvoiceController } from './verification.controller';
// import { InvoiceService } from './verification.service';
// import { DeliveryNoteService } from '../DeliveryNote/DeliveryNote.service';
// import { GoodsReceiptService } from '../GoodsReceipt/GoodsReceipt.service';
// import { DeliveryNoteItem } from 'src/DeliveryNote/delivery-note-item.model';
// import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
// import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
// import { GoodsReceiptItem } from 'src/GoodsReceipt/GoodsReceiptItem.model';
// import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
// import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
// import { PurchaseOrder } from 'src/PO/po.model';
// import { PurchaseOrderItem } from 'src/PO/PoItem.model';

// @Module({
//     imports: [
//     SequelizeModule.forFeature([
//       DeliveryNote,
//       DeliveryNoteItem,
//       GoodsReceipts,
//       GoodsReceiptItem,
//       SupplierInvoice,
//       SupplierInvoiceItem,
//       PurchaseOrder,
//       PurchaseOrderItem
//     ]),
//   ],
//   controllers: [InvoiceController],
//   providers: [InvoiceService,],
// })
// export class VerificationModule {}

// // import { Module } from '@nestjs/common';
// // import { SequelizeModule } from '@nestjs/sequelize';
// // import { InvoiceService } from './verification.service';
// // import { InvoiceController } from './verification.controller';


// // @Module({
// //     imports: [
// //     SequelizeModule.forFeature([
// //     ]),
// //   ],
// //   controllers: [InvoiceController],
// //   providers: [InvoiceService],
// // })
// // export class VerificationModule {}


import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { InvoiceController } from './verification.controller';
import { InvoiceService } from './verification.service';
import { DeliveryNoteService } from '../DeliveryNote/DeliveryNote.service';
import { GoodsReceiptService } from '../GoodsReceipt/GoodsReceipt.service';
import { DeliveryNoteItem } from 'src/DeliveryNote/delivery-note-item.model';
import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { GoodsReceiptItem } from 'src/GoodsReceipt/GoodsReceiptItem.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { PurchaseOrderItem } from 'src/PO/PoItem.model';
import { HistoryLogService } from 'src/History/history-log.service';
import { HistoryLog } from 'src/History/history-log.model';

@Module({
    imports: [
    SequelizeModule.forFeature([
      DeliveryNote,
      DeliveryNoteItem,
      GoodsReceipts,
      GoodsReceiptItem,
      SupplierInvoice,
      SupplierInvoiceItem,
      PurchaseOrder,
      PurchaseOrderItem,
      HistoryLog
    ]),
    
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService,HistoryLogService],
  exports: [InvoiceService],
})
export class VerificationModule {}

// import { Module } from '@nestjs/common';
// import { SequelizeModule } from '@nestjs/sequelize';
// import { InvoiceService } from './verification.service';
// import { InvoiceController } from './verification.controller';


// @Module({
//     imports: [
//     SequelizeModule.forFeature([
//     ]),
//   ],
//   controllers: [InvoiceController],
//   providers: [InvoiceService],
// })
// export class VerificationModule {}
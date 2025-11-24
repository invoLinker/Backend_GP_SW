// import { Module } from '@nestjs/common';
// import { ChatbotService } from './ChatBotService';
// import { ChatbotController } from './ChatBotController';
// import { SequelizeModule } from '@nestjs/sequelize';
// import { DeliveryNoteItem } from 'src/DeliveryNote/delivery-note-item.model';
// import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
// import { EditRequest } from 'src/edit_requests/edit_requests.model';
// import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
// import { GoodsReceiptItem } from 'src/GoodsReceipt/GoodsReceiptItem.model';
// import { HistoryLog } from 'src/History/history-log.model';
// import { InvoiceIncident } from 'src/InvoiceIncident/InvoiceIncident.model';
// import { InvoiceIncidentItem } from 'src/InvoiceIncident/InvoiceIncidentItem';
// import { Item } from 'src/Item/item.model';
// import { Payment } from 'src/Payment/Payment.model';
// import { Permission } from 'src/permission/permission.model';
// import { PurchaseOrder } from 'src/PO/po.model';
// import { PurchaseOrderItem } from 'src/PO/PoItem.model';
// import { RolePermission } from 'src/RolePermission/RolePermission.model';
// import { Role } from 'src/roles/roles.model';
// import { Stock } from 'src/Stock/stock.model';
// import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
// import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
// import { Supplier } from 'src/Suppliers/supplier.model';
// import { Task } from 'src/Task/task.model';
// import { User } from 'src/users/users.model';

// @Module({
//   imports: [SequelizeModule.forFeature([Role, User, Permission, RolePermission, Supplier,
//            PurchaseOrder, PurchaseOrderItem, Item, EditRequest,
//            SupplierInvoice, SupplierInvoiceItem,
//            GoodsReceipts, GoodsReceiptItem, InvoiceIncident, InvoiceIncidentItem, DeliveryNote, DeliveryNoteItem, Payment, Stock, Task, HistoryLog])], // كل الموديلات موجودة بالSequelize global
//   controllers: [ChatbotController],
//   providers: [ChatbotService],
  
// })
// export class ChatBotModule {}

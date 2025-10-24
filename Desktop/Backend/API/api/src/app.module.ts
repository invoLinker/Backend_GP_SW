import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Role } from './roles/roles.model';
import { User } from './users/users.model';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Permission } from './permission/permission.model';
import { PermissionsModule } from './permission/permission.module';
import { RolePermission } from './RolePermission/RolePermission.model';
import { RolePermissionModule } from './RolePermission/RolePermission.module';
import { Supplier } from './Suppliers/supplier.model';
import { SupplierModule } from './Suppliers/supplier.module';
import { PurchaseOrder } from './PO/po.model';
import { PurchaseOrderModule } from './PO/po.module';
import { PurchaseOrderItem } from './PO/PoItem.model';
import { PurchaseOrderItemModule } from './PO/PoItem.module';
import { ItemModule } from './Item/Item.module';
import { Item } from './Item/item.model';
import { EditRequest } from './edit_requests/edit_requests.model';
import { EditRequestModule } from './edit_requests/edit-request.module';
import { SupplierInvoice } from './supplier-invoices/supplier-invoice.model';
import { SupplierInvoiceItem } from './supplier-invoices/supplier-invoice-item.model';
import { SupplierInvoiceModule } from './supplier-invoices/supplier-invoice.module';
// import { WarehouseReceipt } from './WarehouseReceipt/WarehouseReceipt.model';
import { InvoiceIncident } from './InvoiceIncident/InvoiceIncident.model';
import { InvoiceIncidentItem } from './InvoiceIncident/InvoiceIncidentItem';
import { DeliveryNote } from './DeliveryNote/delivery-note.model';
import { DeliveryNoteItem } from './DeliveryNote/delivery-note-item.model';
import { DeliveryNoteModule } from './DeliveryNote/DeliveryNote.module';
import { GoodsReceipts } from './GoodsReceipt/GoodsReceipt.model';
import { GoodsReceiptModule } from './GoodsReceipt/GoodsReceipt.module';
import { GoodsReceiptItem } from './GoodsReceipt/GoodsReceiptItem.model';
import { VerificationModule } from './Verification/verification.module';
import { PaymentsModule } from './Payment/payment.module';
import { Payment } from './Payment/Payment.model';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './AI/ai.module';
import { StockModule } from './Stock/stock.module';
import { Stock } from './Stock/stock.model';




@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456789',
      database: 'involinker2',
      models: [Role, User, Permission, RolePermission, Supplier,
         PurchaseOrder, PurchaseOrderItem, Item, EditRequest,
         SupplierInvoice, SupplierInvoiceItem,
          // WarehouseReceipt,
         GoodsReceipts, GoodsReceiptItem, InvoiceIncident, InvoiceIncidentItem, DeliveryNote, DeliveryNoteItem, Payment, Stock],
      autoLoadModels: true,
      synchronize: false,
    }),
    RolesModule,
    UsersModule,
    AuthModule,
    PermissionsModule,
    RolePermissionModule,
    SupplierModule,
    PurchaseOrderModule,
    PurchaseOrderItemModule,
    ItemModule,
    EditRequestModule,
    SupplierInvoiceModule,
    DeliveryNoteModule,
    GoodsReceiptModule,
    VerificationModule,
    PaymentsModule,
    StockModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule
    // WarehouseReceiptModule
  ],
})
export class AppModule {}

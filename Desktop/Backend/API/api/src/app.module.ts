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
import { StockModule } from './Stock/stock.module';
import { Stock } from './Stock/stock.model';
import { AiModule } from './AI/aimidule';




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
    // ConfigModule.forRoot({ isGlobal: true }),
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
    AiModule
    // ConfigModule.forRoot({ isGlobal: true }),
    // AiModule,
    // WarehouseReceiptModule
    
  ],
})
export class AppModule {}

// import { Module } from '@nestjs/common';
// import { SequelizeModule } from '@nestjs/sequelize';
// import { ConfigModule } from '@nestjs/config';

// import { Role } from './roles/roles.model';
// import { User } from './users/users.model';
// import { Permission } from './permission/permission.model';
// import { RolePermission } from './RolePermission/RolePermission.model';
// import { Supplier } from './Suppliers/supplier.model';
// import { PurchaseOrder } from './PO/po.model';
// import { PurchaseOrderItem } from './PO/PoItem.model';
// import { Item } from './Item/item.model';
// import { EditRequest } from './edit_requests/edit_requests.model';
// import { SupplierInvoice } from './supplier-invoices/supplier-invoice.model';
// import { SupplierInvoiceItem } from './supplier-invoices/supplier-invoice-item.model';
// import { InvoiceIncident } from './InvoiceIncident/InvoiceIncident.model';
// import { InvoiceIncidentItem } from './InvoiceIncident/InvoiceIncidentItem';
// import { DeliveryNote } from './DeliveryNote/delivery-note.model';
// import { DeliveryNoteItem } from './DeliveryNote/delivery-note-item.model';
// import { GoodsReceipts } from './GoodsReceipt/GoodsReceipt.model';
// import { GoodsReceiptItem } from './GoodsReceipt/GoodsReceiptItem.model';
// import { Payment } from './Payment/Payment.model';
// import { Stock } from './Stock/stock.model';

// import { RolesModule } from './roles/roles.module';
// import { UsersModule } from './users/users.module';
// import { AuthModule } from './auth/auth.module';
// import { PermissionsModule } from './permission/permission.module';
// import { RolePermissionModule } from './RolePermission/RolePermission.module';
// import { SupplierModule } from './Suppliers/supplier.module';
// import { PurchaseOrderModule } from './PO/po.module';
// import { PurchaseOrderItemModule } from './PO/PoItem.module';
// import { ItemModule } from './Item/Item.module';
// import { EditRequestModule } from './edit_requests/edit-request.module';
// import { SupplierInvoiceModule } from './supplier-invoices/supplier-invoice.module';
// import { DeliveryNoteModule } from './DeliveryNote/DeliveryNote.module';
// import { GoodsReceiptModule } from './GoodsReceipt/GoodsReceipt.module';
// import { VerificationModule } from './Verification/verification.module';
// import { PaymentsModule } from './Payment/payment.module';
// import { AiModule } from './AI/ai.module';
// import { StockModule } from './Stock/stock.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true }),

//     SequelizeModule.forRootAsync({
//       useFactory: () => ({
//         dialect: 'postgres',
//         host: process.env.DB_HOST,
//         port: Number(process.env.DB_PORT),
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         database: process.env.DB_NAME,
//         models: [
//           Role, User, Permission, RolePermission, Supplier,
//           PurchaseOrder, PurchaseOrderItem, Item, EditRequest,
//           SupplierInvoice, SupplierInvoiceItem, GoodsReceipts, GoodsReceiptItem,
//           InvoiceIncident, InvoiceIncidentItem, DeliveryNote, DeliveryNoteItem,
//           Payment, Stock
//         ],
//         autoLoadModels: true,
//         synchronize: false,
//         dialectOptions: {
//           ssl: { require: true, rejectUnauthorized: false }, // ضروري على Render
//         },
//       }),
//     }),

//     RolesModule,
//     UsersModule,
//     AuthModule,
//     PermissionsModule,
//     RolePermissionModule,
//     SupplierModule,
//     PurchaseOrderModule,
//     PurchaseOrderItemModule,
//     ItemModule,
//     EditRequestModule,
//     SupplierInvoiceModule,
//     DeliveryNoteModule,
//     GoodsReceiptModule,
//     VerificationModule,
//     PaymentsModule,
//     StockModule,
//     AiModule,
//   ],
// })
// export class AppModule {}

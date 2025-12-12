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
import { GenerateTxt } from './GenerateTxt/GenerateTxt.Module';
import { OcrModule } from './OCR/Ocr.module';
import { MulterModule } from '@nestjs/platform-express';
import { JwtStrategy } from './auth/jwt.strategy';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ChatModule } from './Firebase/chat.module';
import { ChatGateway } from './Firebase/chat.gateway';
import { InvoiceIncidentModule } from './InvoiceIncident/invoiceIncident.module';
import { TaskModule } from './Task/task.module';
import { Task } from './Task/task.model';
import { HistoryLogModule } from './History/history-log.module';
import { HistoryLog } from './History/history-log.model';
import { NotificationModule } from './Notification/notification.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { ChatbotModule } from './ChatBot/chat.module';
import { ReportsModule } from './Reports/reports.module';
import { verificationExceptionsModule } from './verification_exceptions/verification_exceptions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TrOcrModule } from './OCR/trocr.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),    
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    
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
         GoodsReceipts, GoodsReceiptItem, InvoiceIncident, InvoiceIncidentItem, DeliveryNote, DeliveryNoteItem, Payment, Stock, Task, HistoryLog],
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
    GenerateTxt,
    OcrModule, MulterModule.register({}),
    ChatModule,
    InvoiceIncidentModule,
    TaskModule,
    HistoryLogModule,
    NotificationModule,
    ChatbotModule,
    ReportsModule,
    verificationExceptionsModule,
    TrOcrModule
  ],
  providers: [ JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },],
})
export class AppModule {}


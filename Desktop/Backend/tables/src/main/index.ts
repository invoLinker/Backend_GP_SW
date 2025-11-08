import { sequelize } from '../db';
import { Role } from '../models/Tables/Roles';
import { User } from '../models/Tables/Users';
// import { VoiceEntry } from '../models/Tables/VoiceEntries';
import { Supplier } from '../models/Tables/Suppliers';
import { RolePermission } from '../models/Tables/Role_Permissions';
import { Permission } from '../models/Tables/Permissions';
// import { CurrencyRate } from '../models/Tables/CurrencyRates';
// import { Document } from '../models/Tables/Documents';
// import { ESignature } from '../models/Tables/E_Signatures';
import { GoodsReceiptItem } from '../models/Tables/GoodsReceiptItems';
import { GoodsReceipts } from '../models/Tables/GoodsReceipts';
import { PurchaseOrder } from '../models/Tables/PurchaseOrders';
// import { Notification } from '../models/Tables/Notifications';
// import { AiAlert } from '../models/Tables/AiAlerts';
// import { Approval } from '../models/Tables/Approvals';
import { Payment } from '../models/Tables/Payments';
import { PurchaseOrderItem } from '../models/Tables/PurchaseOrderItems';
import { PurchaseTag } from '../models/Tables/PurchaseTags';
import { SupplierBenchmarking } from '../models/Tables/SupplierBenchmarkings';
import { SupplierInvoices} from '../models/Tables/SupplierInvoices';
import { Item} from '../models/Tables/Item';
import { EditRequest} from '../models/Tables/edit_requests';
import { SupplierInvoiceItems } from '../models/Tables/SupplierInvoiceItems';
// import { WarehouseReceipt } from '../models/Tables/WarehouseReceipts';
import { InvoiceIncident } from '../models/Tables/InvoiceIncident';
import { InvoiceIncidentItem } from '../models/Tables/InvoiceIncidentItem';
import { DeliveryNoteItems } from '../models/Tables/DeliveryNoteItem';
import { DeliveryNotes } from '../models/Tables/DeliveryNote';
import { Stock } from '../models/Tables/Stock';



// أي استخدام بسيط كافي لإخبار TypeScript و Sequelize
Role; 
User;
// VoiceEntry;
Supplier;
RolePermission;
Permission;
// CurrencyRate;
// Document;
// ESignature;
GoodsReceiptItem;
GoodsReceipts;
PurchaseOrder;
// Notification;
// AiAlert;
// Approval;
Payment;
PurchaseOrderItem;
PurchaseTag;
SupplierBenchmarking;
SupplierInvoices;
Item;
EditRequest;
SupplierInvoiceItems;
// WarehouseReceipt;
InvoiceIncident;
InvoiceIncidentItem;
DeliveryNoteItems;
DeliveryNotes;
Stock;


async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected!');

    await sequelize.sync({ alter: true, logging: console.log });
    console.log('✅ Tables created/updated!');
  } catch (error) {
    console.error('❌ DB connection error:', error);
  }
}

main();

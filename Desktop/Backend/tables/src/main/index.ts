import { sequelize } from '../db';
import { Role } from '../models/Tables/Roles';
import { User } from '../models/Tables/Users';
import { Supplier } from '../models/Tables/Suppliers';
import { RolePermission } from '../models/Tables/Role_Permissions';
import { Permission } from '../models/Tables/Permissions';
import { GoodsReceiptItem } from '../models/Tables/GoodsReceiptItems';
import { GoodsReceipts } from '../models/Tables/GoodsReceipts';
import { PurchaseOrder } from '../models/Tables/PurchaseOrders';
import { Payment } from '../models/Tables/Payments';
import { PurchaseOrderItem } from '../models/Tables/PurchaseOrderItems';
import { PurchaseTag } from '../models/Tables/PurchaseTags';
import { SupplierBenchmarking } from '../models/Tables/SupplierBenchmarkings';
import { SupplierInvoices} from '../models/Tables/SupplierInvoices';
import { Item} from '../models/Tables/Item';
import { EditRequest} from '../models/Tables/edit_requests';
import { SupplierInvoiceItems } from '../models/Tables/SupplierInvoiceItems';
import { InvoiceIncident } from '../models/Tables/InvoiceIncident';
import { InvoiceIncidentItem } from '../models/Tables/InvoiceIncidentItem';
import { DeliveryNoteItems } from '../models/Tables/DeliveryNoteItem';
import { DeliveryNotes } from '../models/Tables/DeliveryNote';
import { Stock } from '../models/Tables/Stock';
import { Task } from '../models/Tables/Tasks';
import { HistoryLog } from '../models/Tables/HistoryLog';
import { verification_exceptions } from '../models/Tables/verification_exceptions';
import { Shift } from '../models/Tables/shift';
import { VerificationLog } from '../models/Tables/Verification-log';



Role; 
User;
Supplier;
RolePermission;
Permission;
GoodsReceiptItem;
GoodsReceipts;
PurchaseOrder;
Payment;
PurchaseOrderItem;
PurchaseTag;
SupplierBenchmarking;
SupplierInvoices;
Item;
EditRequest;
SupplierInvoiceItems;
InvoiceIncident;
InvoiceIncidentItem;
DeliveryNoteItems;
DeliveryNotes;
Stock;
Task;
HistoryLog;
verification_exceptions;
Shift;
VerificationLog;

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

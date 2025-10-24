// import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
// import { sequelize } from '../../db';
// import { SupplierInvoices } from './SupplierInvoices';
// import { GoodsReceipt } from './GoodsReceipts';
// import { PurchaseOrder } from './PurchaseOrders';
// import { User } from './Users';

// export class PurchaseIncident extends Model<InferAttributes<PurchaseIncident>, InferCreationAttributes<PurchaseIncident>> {
//   declare incident_id: number;
//   declare supplier_invoice_id: number | null;
//   declare goods_receipt_id: number | null;
//   declare po_number: string | null;
//   declare incident_type: string;
//   declare description: string | null;
//   declare reported_by: number | null;
//   declare reported_at: Date | null;
//   declare status: 'Open' | 'Under Investigation' | 'Closed';
// }

// PurchaseIncident.init(
//   {
//     incident_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
//     supplier_invoice_id: { type: DataTypes.INTEGER, allowNull: true },
//     goods_receipt_id: { type: DataTypes.INTEGER, allowNull: true },
//     po_number: { type: DataTypes.STRING, allowNull: true },
//     incident_type: { type: DataTypes.STRING, allowNull: false }, // مثل: Supplier Missing, PO Missing, Mismatch
//     description: { type: DataTypes.TEXT, allowNull: true },
//     reported_by: { type: DataTypes.INTEGER, allowNull: true },
//     reported_at: { type: DataTypes.DATE, allowNull: true },
//     status: { type: DataTypes.ENUM('Open','Under Investigation','Closed'), defaultValue: 'Open' },
//   },
//   { sequelize, tableName: 'purchase_incidents', timestamps: true }
// );

// // العلاقات
// SupplierInvoices.hasMany(PurchaseIncident, { foreignKey: 'supplier_invoice_id' });
// PurchaseIncident.belongsTo(SupplierInvoices, { foreignKey: 'supplier_invoice_id' });

// GoodsReceipt.hasMany(PurchaseIncident, { foreignKey: 'goods_receipt_id' });
// PurchaseIncident.belongsTo(GoodsReceipt, { foreignKey: 'goods_receipt_id' });

// PurchaseOrder.hasMany(PurchaseIncident, { foreignKey: 'po_number', sourceKey: 'po_number' });
// PurchaseIncident.belongsTo(PurchaseOrder, { foreignKey: 'po_number', targetKey: 'po_number' });

// User.hasMany(PurchaseIncident, { foreignKey: 'reported_by' });
// PurchaseIncident.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });


import { DataTypes, Model, InferAttributes, InferCreationAttributes, ForeignKey } from 'sequelize';
import { sequelize } from '../../db';
import { Supplier } from './Suppliers';
import { PurchaseOrder } from './PurchaseOrders';
import { User } from './Users';
import { InvoiceIncidentItem } from './InvoiceIncidentItem';

export class InvoiceIncident extends Model<InferAttributes<InvoiceIncident>, InferCreationAttributes<InvoiceIncident>> {
  declare incident_id: number;
  declare invoice_number: string;
  declare invoice_date: Date;
  declare subtotal: number;
  declare vat: number;
  declare discount: number;
  declare total_amount: number;
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit';
  declare notes: string;
  declare incident_reason: string;
  declare supplier_id: number | null;
  declare supplier_name: string;
  declare supplier_email: string;
  declare supplier_phone: string;
  declare supplier_address: string;
  declare po_number: string | null;
  declare created_by: number | null;
  declare status: 'Pending'|'Resolved'|'Cancelled';
  
}

// تعريف الجدول
InvoiceIncident.init(
  {
    incident_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    invoice_number: { type: DataTypes.STRING, allowNull: false },
    invoice_date: { type: DataTypes.DATEONLY, allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    vat: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Cheque', 'Credit'), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    incident_reason: { type: DataTypes.STRING, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    supplier_name: { type: DataTypes.STRING, allowNull: false },
    supplier_email: { type: DataTypes.STRING, allowNull: false },
    supplier_phone: { type: DataTypes.STRING, allowNull: true },
    supplier_address: { type: DataTypes.STRING, allowNull: true },
    po_number: { type: DataTypes.STRING, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    status:{type:DataTypes.ENUM('Pending','Resolved','Cancelled'), allowNull:false },
  },
  {
    sequelize,
    tableName: 'invoice_incident',
    timestamps: true,
  }
);

// Associations
Supplier.hasMany(InvoiceIncident, { foreignKey: 'supplier_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
InvoiceIncident.belongsTo(Supplier, { foreignKey: 'supplier_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

PurchaseOrder.hasMany(InvoiceIncident, { foreignKey: 'po_number', sourceKey: 'po_number', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
InvoiceIncident.belongsTo(PurchaseOrder, { foreignKey: 'po_number', targetKey: 'po_number', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

User.hasMany(InvoiceIncident, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
InvoiceIncident.belongsTo(User, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE' });


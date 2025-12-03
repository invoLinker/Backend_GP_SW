import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { Supplier } from './Suppliers';
import { PurchaseOrder } from './PurchaseOrders';
import { User } from './Users';
import { SupplierInvoiceItems } from './SupplierInvoiceItems';

export class SupplierInvoices extends Model<InferAttributes<SupplierInvoices>, InferCreationAttributes<SupplierInvoices>> {
 declare invoice_id: number;
  declare supplier_id: number | null; 
  declare po_number: string | null; 
  declare invoice_number: string;
  declare invoice_date: Date;
  declare received_date: Date;
  declare subtotal: number;
  declare vat: number;
  declare discount: number;
  declare total_amount: number;
  declare status: 'Pending' | 'Verified' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled' | 'Pending Verification' | 'On Hold' | 'Received' | 'Incident'| 'Partial_paid'|'ReadyForPaid';
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Stripe' | 'Credit';
  declare notes: string;
  declare supplier_name: string;
  declare supplier_email: string;
  declare supplier_phone: string | null;
  declare supplier_address: string | null;
  declare created_by: number | null;
  declare verified_by: number | null;
  declare verification_notes: string | null;
  declare verified_at: Date | null;
  declare is_verified: boolean;
  declare currency: 'USD'|'ILS'|'JOD';
  declare installmentsData: JSON | null;
  declare bank_account: string;
  declare bank_name?: string;
  declare to_name:string;
  declare to_email:string;
  declare to_phone:string;
  declare to_address:string;
  declare imgUrl:string | null;
  declare pdfUrl: string | null;
  declare excelUrl: string | null;
}


SupplierInvoices.init(
  {
    invoice_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    po_number: { type: DataTypes.STRING, allowNull: true },
    invoice_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    invoice_date: { type: DataTypes.DATEONLY, allowNull: false },
    received_date: { type: DataTypes.DATEONLY, allowNull: false },
    subtotal: { type: DataTypes.DECIMAL, allowNull: false },
    vat: { type: DataTypes.DECIMAL, allowNull: false },
    discount: { type: DataTypes.DECIMAL, allowNull: true, defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL, allowNull: false },
    status: { type: DataTypes.ENUM('Pending','Verified','Approved','Rejected','Paid','Cancelled','Pending Verification','On Hold','Received','Incident', 'Partial_paid','ReadyForPaid'), defaultValue: 'Pending' },
    payment_method: { type: DataTypes.ENUM('Cash','Bank Transfer','Stripe','Credit'), allowNull: true , defaultValue:'Cash'},
    currency:{type:DataTypes.ENUM( 'USD','ILS','JOD'), defaultValue:'ILS', allowNull:false},
    notes: { type: DataTypes.TEXT, allowNull: true },

   
    supplier_name: { type: DataTypes.STRING, allowNull: false },
    supplier_email: { type: DataTypes.STRING, allowNull: false },
    supplier_phone: { type: DataTypes.STRING, allowNull: true },
    supplier_address: { type: DataTypes.STRING, allowNull: true },

    created_by: { type: DataTypes.INTEGER, allowNull: true },
    verified_by: { type: DataTypes.INTEGER, allowNull: true },
    verification_notes:{ type: DataTypes.TEXT, allowNull: true },
    verified_at:{ type: DataTypes.DATE, allowNull: true },
    is_verified:{ type: DataTypes.BOOLEAN, defaultValue: false },
    installmentsData:{type: DataTypes.JSON, allowNull: true },
    bank_account:{type: DataTypes.STRING, allowNull: true },
    bank_name:{ type: DataTypes.STRING, allowNull: true },
    
    to_name:{type: DataTypes.STRING, allowNull: false},
    to_email:{type: DataTypes.STRING, allowNull: false},
    to_phone:{type: DataTypes.STRING, allowNull: false},
    to_address:{type: DataTypes.STRING, allowNull: false},
    imgUrl: { type: DataTypes.STRING, allowNull: true },
    pdfUrl: { type: DataTypes.TEXT, allowNull: true },
    excelUrl:{ type: DataTypes.TEXT, allowNull: true },

  },
  { sequelize, tableName: 'supplier_invoices', timestamps: true }
);

Supplier.hasMany(SupplierInvoices, { foreignKey: 'supplier_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
SupplierInvoices.belongsTo(Supplier, { foreignKey: 'supplier_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

PurchaseOrder.hasMany(SupplierInvoices, { foreignKey: 'po_number', sourceKey: 'po_number', onDelete: 'SET NULL', onUpdate: 'CASCADE'});
SupplierInvoices.belongsTo(PurchaseOrder, { foreignKey: 'po_number', targetKey: 'po_number', onDelete: 'SET NULL', onUpdate: 'CASCADE'});

User.hasMany(SupplierInvoices, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE',});
SupplierInvoices.belongsTo(User, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE',});


User.hasMany(SupplierInvoices, { foreignKey: 'verified_by', onDelete: 'SET NULL', onUpdate: 'CASCADE',});
SupplierInvoices.belongsTo(User, { foreignKey: 'verified_by', onDelete: 'SET NULL', onUpdate: 'CASCADE',});


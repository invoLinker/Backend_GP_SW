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
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Stripe' | 'Credit';
  declare notes: string;
  declare incident_reason: string;
  declare supplier_id: number | null;
  declare supplier_name: string;
  declare supplier_email: string;
  declare supplier_phone: string;
  declare supplier_address: string;
  declare po_number: string | null;
  declare created_by: number | null;
  declare status: 'Pending'|'Resolved';
  declare invoice_image:string|null;
  declare to_name:string;
  declare to_email:string;
  declare to_phone:string;
  declare to_address:string;
  
}

InvoiceIncident.init(
  {
    incident_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    invoice_number: { type: DataTypes.STRING, allowNull: false },
    invoice_date: { type: DataTypes.DATEONLY, allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    vat: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Stripe', 'Credit'), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    incident_reason: { type: DataTypes.STRING, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    supplier_name: { type: DataTypes.STRING, allowNull: false },
    supplier_email: { type: DataTypes.STRING, allowNull: false },
    supplier_phone: { type: DataTypes.STRING, allowNull: true },
    supplier_address: { type: DataTypes.STRING, allowNull: true },
    po_number: { type: DataTypes.STRING, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    status:{type:DataTypes.ENUM('Pending','Resolved'), allowNull:false },
    to_name:{type: DataTypes.STRING, allowNull: false},
    to_email:{type: DataTypes.STRING, allowNull: false},
    to_phone:{type: DataTypes.STRING, allowNull: false},
    to_address:{type: DataTypes.STRING, allowNull: false},
    invoice_image:{type: DataTypes.TEXT, allowNull: true}
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


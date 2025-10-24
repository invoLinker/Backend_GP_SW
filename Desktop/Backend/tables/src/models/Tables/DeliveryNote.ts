import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { Supplier } from './Suppliers';
import { PurchaseOrder } from './PurchaseOrders';
import { User } from './Users';
import { DeliveryNoteItems } from './DeliveryNoteItem';

export class DeliveryNotes extends Model<InferAttributes<DeliveryNotes>, InferCreationAttributes<DeliveryNotes>> {
  declare dn_id: number;
  declare supplier_id: number | null; // FK لو المورد موجود
  declare po_number: string | null; // FK لو الطلب موجود
  declare dn_number: string;
  declare dn_date: Date;
  declare status: 'Pending' | 'Verified' | 'Approved' | 'Rejected' | 'Received' | 'Incident';
  declare notes: string;

  // بيانات المورد كاملة
  declare supplier_name: string;
  declare supplier_email: string;
  declare supplier_phone: string | null;
  declare supplier_address: string | null;

  declare created_by: number | null;
  declare verified_by: number | null;
  declare verification_notes: string | null;
  declare verified_at: Date | null;
  declare is_verified: boolean;
  declare document_images: string | null;
}

DeliveryNotes.init(
  {
    dn_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    po_number: { type: DataTypes.STRING, allowNull: true },
    dn_number: { type: DataTypes.STRING, allowNull: false },
    dn_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('Pending','Verified','Approved','Rejected','Received', 'Incident'), defaultValue: 'Pending' },
    notes: { type: DataTypes.TEXT, allowNull: true },

    // بيانات المورد
    supplier_name: { type: DataTypes.STRING, allowNull: false },
    supplier_email: { type: DataTypes.STRING, allowNull: false },
    supplier_phone: { type: DataTypes.STRING, allowNull: true },
    supplier_address: { type: DataTypes.STRING, allowNull: true },

    created_by: { type: DataTypes.INTEGER, allowNull: true },
    verified_by: { type: DataTypes.INTEGER, allowNull: true },
    verification_notes:{ type: DataTypes.TEXT, allowNull: true },
    verified_at:{ type: DataTypes.DATE, allowNull: true },
    is_verified:{ type: DataTypes.BOOLEAN, defaultValue: false },
    document_images: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'delivery_notes', timestamps: true }
);

// Associations
Supplier.hasMany(DeliveryNotes, { foreignKey: 'supplier_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
DeliveryNotes.belongsTo(Supplier, { foreignKey: 'supplier_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

PurchaseOrder.hasMany(DeliveryNotes, { foreignKey: 'po_number', sourceKey: 'po_number', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
DeliveryNotes.belongsTo(PurchaseOrder, { foreignKey: 'po_number', targetKey: 'po_number', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

User.hasMany(DeliveryNotes, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
DeliveryNotes.belongsTo(User, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

User.hasMany(DeliveryNotes, { foreignKey: 'verified_by', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
DeliveryNotes.belongsTo(User, { foreignKey: 'verified_by', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

// Items association
DeliveryNotes.hasMany(DeliveryNoteItems, { foreignKey: 'dn_id', as: 'items', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
DeliveryNoteItems.belongsTo(DeliveryNotes, { foreignKey: 'dn_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

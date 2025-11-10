import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { PurchaseOrder } from './PurchaseOrders';
import { User } from './Users';
import { DeliveryNotes } from './DeliveryNote';

export class GoodsReceipts extends Model<InferAttributes<GoodsReceipts>, InferCreationAttributes<GoodsReceipts>> {
  declare gr_id: number;
  declare gr_number: string;
  declare gr_date: Date;
  declare dn_id: number | null; 
  declare received_by: number | null; 
  declare notes: string | null;
  declare status: 'Pending' | 'Received' | 'Verified' | 'Incident';
  declare po_number: string | null;
  declare is_verified: boolean;
}

GoodsReceipts.init(
  {
   gr_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gr_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    gr_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dn_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    received_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Received', 'Verified', 'Incident'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    po_number:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_verified:{ type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'goods_receipts',
    timestamps: true,
  }
);

DeliveryNotes.hasMany(GoodsReceipts, {
  foreignKey: 'dn_id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
GoodsReceipts.belongsTo(DeliveryNotes, {
  foreignKey: 'dn_id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

User.hasMany(GoodsReceipts, {
  foreignKey: 'received_by',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
GoodsReceipts.belongsTo(User, {
  foreignKey: 'received_by',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
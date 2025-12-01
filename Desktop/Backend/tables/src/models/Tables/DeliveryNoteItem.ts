import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class DeliveryNoteItems extends Model<InferAttributes<DeliveryNoteItems>, InferCreationAttributes<DeliveryNoteItems>> {
  declare item_id: number;
  declare dn_id: number;
  declare item_name: string;
  declare quantity: number;
  declare unit: string | null;
  declare barcode: string | null;
  declare remarks: string | null;
}

DeliveryNoteItems.init(
  {
    item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dn_id: { type: DataTypes.INTEGER, allowNull: false },
    item_name: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL, allowNull: false },
    unit: { type: DataTypes.STRING, allowNull: true },
    barcode: { type: DataTypes.STRING, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'delivery_note_items', timestamps: false }
);

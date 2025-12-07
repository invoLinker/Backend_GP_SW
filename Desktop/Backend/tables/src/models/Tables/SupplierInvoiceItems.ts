import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { SupplierInvoices } from './SupplierInvoices';

export class SupplierInvoiceItems extends Model<InferAttributes<SupplierInvoiceItems>, InferCreationAttributes<SupplierInvoiceItems>> {
  declare id: number;
  declare invoice_id: number;
  declare item_name: string;
  declare barcode: string;
  declare quantity: number;
  declare unit_price: number;
  declare unit: string;
  declare total_price: number;
  declare remarks: string;
  declare is_matched: boolean;
  declare match_notes: string;
 
}

SupplierInvoiceItems.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    item_name: { type: DataTypes.STRING, allowNull: false },
    barcode: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0, },
    unit_price: { type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0, },
    unit: { type: DataTypes.STRING, allowNull: true },
    total_price: { type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0, },
    remarks: { type: DataTypes.STRING, allowNull: true },
    is_matched:{ type:DataTypes.BOOLEAN , defaultValue: false},
    match_notes:{ type: DataTypes.STRING, allowNull:true},
  },
  { sequelize, tableName: 'supplier_invoice_items', timestamps: false }
);

// Associations
SupplierInvoices.hasMany(SupplierInvoiceItems, { foreignKey: 'invoice_id', as: 'items' });
SupplierInvoiceItems.belongsTo(SupplierInvoices, { foreignKey: 'invoice_id', as: 'invoice' });

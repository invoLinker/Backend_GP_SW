import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { DeliveryNotes } from './DeliveryNote';

export class Stock extends Model<InferAttributes<Stock>, InferCreationAttributes<Stock>> {
  declare stock_id: number;
  declare item_name: string;
  declare barcode: string;
  declare dn_id: number | null;
  declare quantity: number;
  declare unit: string | null;
  declare expiration_date: Date | null;
  declare status: 'Available' | 'Expired' | 'Reserved'|'OutOfStock';
  declare QR: string | null;
  declare Itemlocation: string | null;
}

Stock.init(
  {
    stock_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dn_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Available', 'Expired', 'Reserved','OutOfStock'),
      allowNull: false,
      defaultValue: 'Available',
    },
    QR:{ type: DataTypes.TEXT ,allowNull: true,},
    Itemlocation:{ type: DataTypes.STRING ,allowNull: true,}

  },
  {
    sequelize,
    tableName: 'stock',
    timestamps: true,
  }
);

Stock.belongsTo(DeliveryNotes, {
  foreignKey: 'dn_id',
  as: 'delivery_note',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});


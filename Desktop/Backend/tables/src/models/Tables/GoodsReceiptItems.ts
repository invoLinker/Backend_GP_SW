import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { GoodsReceipts } from './GoodsReceipts';

export class GoodsReceiptItem extends Model<InferAttributes<GoodsReceiptItem>, InferCreationAttributes<GoodsReceiptItem>> {
  declare gri_id: number;
  declare gr_id: number | null; 
  declare item_name: string;
  declare received_quantity: number; 
  declare unit: string | null;
  declare barcode: string ; 
  declare notes: string | null;
  declare expiration_date:Date;

}

GoodsReceiptItem.init(
  {
    gri_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gr_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    received_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiration_date:{type:DataTypes.DATE, allowNull:true}

  },
  {
    sequelize,
    tableName: 'goods_receipt_items',
    timestamps: false,
  }
);

GoodsReceipts.hasMany(GoodsReceiptItem, {
  foreignKey: 'gr_id',
  as: 'items',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
GoodsReceiptItem.belongsTo(GoodsReceipts, {
  foreignKey: 'gr_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
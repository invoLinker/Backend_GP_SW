// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db');
// const GoodsReceipts = require('./GoodsReceipts');

// const GoodsReceiptItem = sequelize.define('GoodsReceiptItem', {
//     gr_item_id:{
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     gr_id:{
//         type: DataTypes.INTEGER,
//         allowNull:false
//     },
//     item_name:{
//         type:DataTypes.STRING,
//         unique:true,
//         allowNull:false
//     },
//     quantity_received:{
//         type:DataTypes.DOUBLE,
//         allowNull:false
//     },
//     unit:{
//         type:DataTypes.STRING, // KG, pieces...
//     },
//     unit_price:{
//         type: DataTypes.DECIMAL(12, 2),
//         allowNull: false
//     },
// }, {
//     tableName: 'GoodsReceiptItems',
//     timestamps: true
// });


// GoodsReceiptItem.belongsTo(GoodsReceipts, { foreignKey: 'gr_id' });
// GoodsReceipts.hasMany(GoodsReceiptItem, { foreignKey: 'gr_id' });

// module.exports = GoodsReceiptItem;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { GoodsReceipts } from './GoodsReceipts';

export class GoodsReceiptItem extends Model<InferAttributes<GoodsReceiptItem>, InferCreationAttributes<GoodsReceiptItem>> {
  declare gri_id: number;
  declare gr_id: number | null; 
  declare product_name: string;
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
    product_name: {
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
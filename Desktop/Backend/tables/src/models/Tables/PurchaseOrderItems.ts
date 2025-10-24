// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db');
// const PurchaseOrders = require('./PurchaseOrders');

// const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
//     po_item_id:{
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     po_id:{
//         type: DataTypes.INTEGER,
//         allowNull:false
//     },
//     item_name:{
//         type:DataTypes.STRING,
//         unique:true,
//         allowNull:false
//     },
//     quantity:{
//         type:DataTypes.DOUBLE,
//         allowNull:false
//     },
//     unit:{
//         type:DataTypes.STRING, // KG, pieces...
//     },
// }, {
//     tableName: 'PurchaseOrderItems',
//     timestamps: true
// });

// // Associations
// PurchaseOrderItem.belongsTo(PurchaseOrders, { foreignKey: 'po_id' });
// PurchaseOrders.hasMany(PurchaseOrderItem, { foreignKey: 'po_id' });

// module.exports = PurchaseOrderItem;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { PurchaseOrder } from './PurchaseOrders';

export class PurchaseOrderItem extends Model<InferAttributes<PurchaseOrderItem>, InferCreationAttributes<PurchaseOrderItem>> {
  declare po_item_id: number;
  declare po_id: number;
  declare item_name: string;
  declare quantity: number;
  declare unit?: string;
  declare unit_price:number;
  declare barcode: string;   
}

PurchaseOrderItem.init(
  {
    po_item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    po_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unit_price: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    sequelize,
    tableName: 'PurchaseOrderItems',
    timestamps: true
  }
);

// Associations
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'po_id' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });

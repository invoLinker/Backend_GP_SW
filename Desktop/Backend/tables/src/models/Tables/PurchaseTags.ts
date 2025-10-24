// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db');
// const PurchaseOrder = require('./PurchaseOrders')

// const PurchaseTag = sequelize.define('PurchaseTag',{
//     tag_id:{
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     po_id:{
//         type: DataTypes.INTEGER,
//         allowNull:false
//     },
//     tag_text:{
//         type:DataTypes.STRING,
//         allowNull:false
//     },
// }, {
// tableName: 'PurchaseTags',
// timestamps: true

// });


// module.exports = PurchaseTag;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { PurchaseOrder } from './PurchaseOrders';

export class PurchaseTag extends Model<InferAttributes<PurchaseTag>, InferCreationAttributes<PurchaseTag>> {
  declare tag_id: number;
  declare po_id: number;
  declare tag_text: string;
}

PurchaseTag.init(
  {
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    po_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tag_text: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'PurchaseTags',
    timestamps: true
  }
);

// Associations
PurchaseOrder.hasMany(PurchaseTag, { foreignKey: 'po_id' });
PurchaseTag.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });

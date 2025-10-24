// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 
// const Suppliers = require('./Suppliers');

// const PurchaseOrders = sequelize.define('PurchaseOrders', {
//     po_id:{
//         type:DataTypes.INTEGER,
//         primaryKey:true,
//         autoIncrement:true,
//         allowNull:false
//     },
//     supplier_id:{
//         type:DataTypes.INTEGER,
//         allowNull: false
//     },
//     order_date:{
//         type:DataTypes.DATE,
//         allowNull:false
//     },
//     total_amount:{
//         type:DataTypes.DOUBLE,
//         allowNull:false
//     },
//     status:{
//         type:DataTypes.ENUM(
//             'Open',
//             'Closed',
//             'Cancelled'
//         ),
//     },
// },
// {
//     tableName: 'PurchaseOrders', timestamps: false
// }
// );
// Suppliers.hasMany(PurchaseOrders, { foreignKey: 'supplier_id' });
// PurchaseOrders.belongsTo(Suppliers, { foreignKey: 'supplier_id' });

// module.exports = PurchaseOrders;

import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../db';
import { Supplier } from './Suppliers';
import { PurchaseOrderItem } from './PurchaseOrderItems';

export class PurchaseOrder extends Model<InferAttributes<PurchaseOrder>, InferCreationAttributes<PurchaseOrder>> {
  declare po_id: number;
  declare po_number: string;
  declare supplier_id: number;
  declare order_date: Date;
  declare subtotal: number;
  declare vat: number;
  declare total_amount: number;
  declare expected_delivery: Date | null;
  declare status: 'Open'| 'Closed' | 'Cancelled' | 'Draft' |'Approved'| 'Sent' |'Incident'| 'ReadyForPaid';
  declare document_images: string | null;
  declare note: Text | null;
  declare is_verified: boolean;
  declare currency: 'USD'|'ILS'|'JOD';
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit';

}

PurchaseOrder.init(
  {
    po_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    po_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    vat: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    expected_delivery: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Open', 'Closed', 'Cancelled', 'Draft', 'Approved', 'Sent', 'Incident', 'ReadyForPaid'),
      allowNull: false,
      defaultValue: 'Open',
    },
    document_images: { type: DataTypes.TEXT, allowNull: true },
    note:{type:DataTypes.TEXT, allowNull:true},
    is_verified:{ type: DataTypes.BOOLEAN, defaultValue: false },
    currency:{type:DataTypes.ENUM( 'USD','ILS','JOD'), defaultValue:'ILS', allowNull:false},
    payment_method: { type: DataTypes.ENUM('Cash','Bank Transfer','Cheque','Credit'), allowNull: true },

  },
  {
    sequelize,
    tableName: 'PurchaseOrders',
    timestamps: true,
  }
);

// العلاقات
Supplier.hasMany(PurchaseOrder, {foreignKey: 'supplier_id', as: 'purchaseOrders',});
PurchaseOrder.belongsTo(Supplier, {foreignKey: 'supplier_id', as: 'supplier',});



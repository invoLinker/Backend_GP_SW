// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 
// const GoodsReceipt = require('./GoodsReceipts')

// const Payment = sequelize.define('Payment',{
//     payment_id:{
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   gr_id:{
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   amount:{
//     type: DataTypes.DECIMAL(12,2),
//     allowNull: true
//   },
//   payment_date:{
//      type:DataTypes.DATE,
//   },
//   payment_method:{
//         type:DataTypes.ENUM(
//             'Cash','Credit','PayPal','Stripe'
//         ), defaultValue:'Cash',
//   },
//   currency:{
//         type:DataTypes.ENUM(
//             'USD',
//             'ILS',
//             'JOD'
//         ),defaultValue:'ILS',
//         allowNull:false
//     }
// },{
//     tableName: 'Payments',
//   timestamps: true
// });

// GoodsReceipt.hasMany(Payment , {foreignKey: 'gr_id'});
// Payment.belongsTo(GoodsReceipt,{foreignKey: 'gr_id'});

// module.exports = Payment;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { GoodsReceipts } from './GoodsReceipts';
import { SupplierInvoices } from './SupplierInvoices';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare payment_id: number;
  declare invoice_id: number;
  declare amount?: number;
  declare payment_date?: Date;
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit';
  declare currency: 'USD' | 'ILS' | 'JOD';
  declare amount_paid: number;
  declare remaining_amount: number;
  declare notes?: string;
  declare  status: 'Pending' | 'Completed'| 'Cancelled';
  declare payment_details: string;
}

Payment.init(
  {
    payment_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    remaining_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Cheque', 'Credit'),
      allowNull: false,
    },
    currency: {
      type: DataTypes.ENUM('USD' , 'ILS' , 'JOD'),
      defaultValue: 'ILS',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status:{
      type: DataTypes.ENUM('Pending','Completed','Cancelled'), defaultValue: 'Pending' 
    },
    payment_details:{type: DataTypes.TEXT, allowNull: true }
  },
  {
    sequelize,
    tableName: 'payments',
    timestamps: true,
  }
);

// العلاقات
SupplierInvoices.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(SupplierInvoices, { foreignKey: 'invoice_id' });

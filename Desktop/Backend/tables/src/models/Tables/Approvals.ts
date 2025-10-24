// // models/Approvals.js
// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); // عدّل حسب مسار ملف db.js

// const PurchaseOrder = require('./PurchaseOrders');
// const GoodsReceipt = require('./GoodsReceipts');
// const Invoice = require('./SupplierInvoices');
// const User = require('./Users');

// const Approval = sequelize.define('Approval', {
//   approval_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   po_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   gr_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   invoice_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   approved_by: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   approval_status: {
//     type: DataTypes.ENUM('Pending','Approved','Rejected'),
//     defaultValue: 'Pending'
//   },
//   approval_date: {
//     type: DataTypes.DATE,
//     allowNull: true
//   }
// }, {
//   tableName: 'Approvals',
//   timestamps: false
// });

// // العلاقات
// Approval.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });
// PurchaseOrder.hasMany(Approval, { foreignKey: 'po_id' });

// Approval.belongsTo(GoodsReceipt, { foreignKey: 'gr_id' });
// GoodsReceipt.hasMany(Approval, { foreignKey: 'gr_id' });

// Approval.belongsTo(Invoice, { foreignKey: 'invoice_id' });
// Invoice.hasMany(Approval, { foreignKey: 'invoice_id' });

// Approval.belongsTo(User, { foreignKey: 'approved_by' });
// User.hasMany(Approval, { foreignKey: 'approved_by' });

// module.exports = Approval;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { PurchaseOrder } from './PurchaseOrders';
import { GoodsReceipts } from './GoodsReceipts';
import { SupplierInvoices } from './SupplierInvoices';
import { User } from './Users';

export class Approval extends Model<InferAttributes<Approval>, InferCreationAttributes<Approval>> {
  declare approval_id: number;
  declare po_id: number;
  declare gr_id: number;
  declare invoice_id: number;
  declare approved_by: number;
  declare approval_status: 'Pending' | 'Approved' | 'Rejected';
  declare approval_date?: Date;
}

Approval.init(
  {
    approval_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    po_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    gr_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    approval_status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      defaultValue: 'Pending'
    },
    approval_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'Approvals',
    timestamps: false
  }
);

// العلاقات
Approval.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });
PurchaseOrder.hasMany(Approval, { foreignKey: 'po_id' });

Approval.belongsTo(GoodsReceipts, { foreignKey: 'gr_id' });
GoodsReceipts.hasMany(Approval, { foreignKey: 'gr_id' });

Approval.belongsTo(SupplierInvoices, { foreignKey: 'invoice_id' });
SupplierInvoices.hasMany(Approval, { foreignKey: 'invoice_id' });

Approval.belongsTo(User, { foreignKey: 'approved_by' });
User.hasMany(Approval, { foreignKey: 'approved_by' });

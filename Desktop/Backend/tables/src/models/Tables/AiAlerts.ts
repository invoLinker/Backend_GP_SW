// // models/AI_Alerts.js
// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); // تأكدي من مسار الاتصال بالداتابيس
// const SupplierInvoice = require('./SupplierInvoices'); 
// const GoodsReceipt = require('./GoodsReceipts'); 


// const AiAlert = sequelize.define('AiAlert', {
//     alert_id: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     gr_id: {
//         type: DataTypes.INTEGER,
//         allowNull: true
//     },
//     invoice_id: {
//         type: DataTypes.INTEGER,
//         allowNull: true
//     },
//     alert_type: {
//         type: DataTypes.ENUM('FraudDetection', 'PriceAnomaly', 'LatePayment'),
//         allowNull: false
//     },
//     description: {
//         type: DataTypes.TEXT,
//         allowNull: true
//     },
//     created_at: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW,
//         allowNull: false
//     }
// }, {
//     tableName: 'AiAlerts',
//     timestamps: false
// });

// SupplierInvoice.hasMany(AiAlert, { foreignKey: 'invoice_id' });
// AiAlert.belongsTo(SupplierInvoice, { foreignKey: 'invoice_id' });


// GoodsReceipt.hasMany(AiAlert, { foreignKey: 'gr_id' });
// AiAlert.belongsTo(GoodsReceipt, { foreignKey: 'gr_id' });

// module.exports = AiAlert;


import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { SupplierInvoices } from './SupplierInvoices';
import { GoodsReceipts } from './GoodsReceipts';

export class AiAlert extends Model<InferAttributes<AiAlert>, InferCreationAttributes<AiAlert>> {
  declare alert_id: number;
  declare gr_id?: number;
  declare invoice_id?: number;
  declare alert_type: 'FraudDetection' | 'PriceAnomaly' | 'LatePayment';
  declare description?: string;
  declare created_at: Date;
}

AiAlert.init(
  {
    alert_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gr_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    alert_type: {
      type: DataTypes.ENUM('FraudDetection', 'PriceAnomaly', 'LatePayment'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'AiAlerts',
    timestamps: false
  }
);

// العلاقات
SupplierInvoices.hasMany(AiAlert, { foreignKey: 'invoice_id' });
AiAlert.belongsTo(SupplierInvoices, { foreignKey: 'invoice_id' });

GoodsReceipts.hasMany(AiAlert, { foreignKey: 'gr_id' });
AiAlert.belongsTo(GoodsReceipts, { foreignKey: 'gr_id' });

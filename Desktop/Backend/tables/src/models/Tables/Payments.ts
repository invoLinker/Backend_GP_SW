import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { GoodsReceipts } from './GoodsReceipts';
import { SupplierInvoices } from './SupplierInvoices';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare payment_id: number;
  declare invoice_id: number;
  declare amount?: number;
  declare payment_date?: Date;
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Stripe' | 'Credit';
  declare currency: 'USD' | 'ILS' | 'JOD';
  declare amount_paid: number;
  declare remaining_amount: number;
  declare notes?: string;
  declare  status: 'Pending' | 'Completed'| 'Failed';
  declare payment_details: string;
  declare currency_difference: number;
  declare installment_amount: number;
  declare currency_paid: 'USD' | 'ILS' | 'JOD';
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
      type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Stripe', 'Credit'),
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
      type: DataTypes.ENUM('Pending','Completed','Failed'), defaultValue: 'Pending' 
    },
    payment_details:{type: DataTypes.TEXT, allowNull: true },
    currency_difference :{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Currency difference in invoice currency'
      },
      installment_amount:{
        type: DataTypes.DECIMAL(12, 2), 
        defaultValue: 0,
        comment: 'Installment amount in invoice currency' 
    },
      currency_paid:{
        type: DataTypes.ENUM('USD' , 'ILS' , 'JOD'),
        defaultValue: 'ILS',
        comment: 'Currency used for payment'
     }
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

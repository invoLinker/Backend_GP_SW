import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model'; 

@Table({
  tableName: 'payments',
  timestamps: true
})
export class Payment extends Model<Payment> {

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  payment_id: number;

  @ForeignKey(() => SupplierInvoice)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  invoice_id: number;

  @BelongsTo(() => SupplierInvoice)
  invoice: SupplierInvoice;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  payment_date: Date;

  @Column({
    type: DataType.DECIMAL(10,2),
    allowNull: false
  })
  amount_paid: number;

  @Column({
    type: DataType.DECIMAL(10,2),
    allowNull: false
  })
  remaining_amount: number;

  @Column({
    type: DataType.ENUM('Cash', 'Bank Transfer', 'Cheque', 'Credit'),
    allowNull: false
  })
  payment_method: 'Cash'| 'Bank Transfer'| 'Cheque'| 'Credit'; 

  @Column({
    type: DataType.ENUM('USD' , 'ILS' , 'JOD'),
    defaultValue: 'ILS'
  })
  currency: 'USD' | 'ILS' | 'JOD';

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  notes: string;

}

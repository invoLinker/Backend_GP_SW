import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Supplier } from '../Suppliers/supplier.model';
import { PurchaseOrderItem } from './PoItem.model';
import { Type } from 'class-transformer';

@Table({
  tableName: 'PurchaseOrders',
  timestamps: true,
})
export class PurchaseOrder extends Model<PurchaseOrder> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  po_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  po_number: string;

  @ForeignKey(() => Supplier)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  supplier_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  order_date: Date;

  @Column({
    type: DataType.DOUBLE,
    defaultValue: 0,
  })
  subtotal: number;

  @Column({
    type: DataType.DOUBLE,
    defaultValue: 0,
  })
  vat: number;

  @Column({type: DataType.BOOLEAN, defaultValue: false})
  is_verified:boolean;

  @Column({
    type: DataType.DOUBLE,
    defaultValue: 0,
  })
  total_amount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expected_delivery?: Date | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note?: string | null;

  @Column({
    type: DataType.ENUM('USD','ILS','JOD'),
    defaultValue:'ILS', allowNull:false
  })
  currency:string;

  @Column({
    type: DataType.ENUM('Open', 'Closed', 'Cancelled', 'Draft', 'Approved', 'Sent','Incident','ReadyForPaid'),
    allowNull: false,
    defaultValue: 'Open',
  })
  status: 'Open'| 'Closed'| 'Cancelled'| 'Draft'| 'Approved'| 'Sent' | 'Incident'| 'ReadyForPaid';

   @Column({
    type: DataType.ENUM('Cash', 'Bank Transfer', 'PayPal', 'Credit'),
    defaultValue: 'Cash',
  })
  payment_method: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  company_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  company_email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  company_phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  company_address: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  supplier_email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  supplier_phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  supplier_address: string;

  @BelongsTo(() => Supplier, { as: 'supplier' })
  supplier: Supplier;

  @HasMany(() => PurchaseOrderItem, { as: 'items', foreignKey: 'po_id' })
  items: PurchaseOrderItem[];

  @Column({ type: DataType.JSON, allowNull: true })
  installmentsData: {
    total_installments: number;
    installments: { amount: number; due_date: string }[];
  } | null;
}

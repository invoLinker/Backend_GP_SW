import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Supplier } from '../Suppliers/supplier.model';
import { PurchaseOrder } from '../PO/po.model';
import { User } from '../users/users.model';
import { SupplierInvoiceItem } from './supplier-invoice-item.model';
import { Payment } from 'src/Payment/Payment.model';

@Table({ tableName: 'supplier_invoices' })
export class SupplierInvoice extends Model<SupplierInvoice> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  invoice_id: number;

  @ForeignKey(() => Supplier)
  @Column(DataType.INTEGER)
  supplier_id: number | null;

  @ForeignKey(() => PurchaseOrder)
  @Column(DataType.STRING)
  po_number: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  invoice_number: string;

  @Column(DataType.STRING)
  supplier_name: string;

  @Column(DataType.STRING)
  supplier_email: string;

  @Column({type: DataType.STRING, allowNull: false })
  supplier_phone: string;

  @Column({type: DataType.STRING, allowNull: false })
  supplier_address: string;


  @Column(DataType.DATE)
  invoice_date: Date;

  @Column(DataType.DATE)
  received_date: Date;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  subtotal: number;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  vat: number;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  discount: number;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  total_amount: number;

  @Column({
    type: DataType.ENUM(
      'Pending',
      'Pending Verification',
      'Verified',
      'Approved',
      'Rejected',
      'Paid',
      'Cancelled',
      'On Hold',
      'Received',
      'Incident',
      'Partial_paid',
      'ReadyForPaid'
    ),
    defaultValue: 'Pending',
  })
  status: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_verified: boolean;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  verified_by: number;

  @Column(DataType.DATE)
  verified_at: Date;

  @Column(DataType.TEXT)
  verification_notes: string;

  @Column({
    type: DataType.ENUM('USD','ILS','JOD'),
    defaultValue:'ILS', allowNull:false
  })
  currency:string;

  @Column({
    type: DataType.ENUM('Cash', 'Bank Transfer', 'Cheque', 'Credit'),
    defaultValue: 'Bank Transfer',
  })
  payment_method: string;

  @Column(DataType.TEXT)
  notes: string;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  created_by: number;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  updatedAt: Date;

  // العلاقات
  @BelongsTo(() => Supplier)
  supplier: Supplier;

  @BelongsTo(() => PurchaseOrder)
  purchaseOrder: PurchaseOrder;

  @BelongsTo(() => User, 'created_by')
  createdBy: User;

  @BelongsTo(() => User, 'verified_by')
  verifiedBy: User;

  @HasMany(() => SupplierInvoiceItem)
  items: SupplierInvoiceItem[];

  // @HasMany(() => Payment)
  // Payments?: Payment[];

}

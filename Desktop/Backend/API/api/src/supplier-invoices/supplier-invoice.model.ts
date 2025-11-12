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

  @Column({ type: DataType.STRING, allowNull: true })
  bank_account?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  bank_name?: string;


  @Column({
    type: DataType.ENUM(
      'Pending',/////اول ما ارفعها
      'Pending Verification',
      'Verified',////// لما اشيك لسا بس هي والبيرشز اوردر 
      'Approved',
      'Rejected',////// في حال صار اغلاط 
      'Paid',///// بس اخلص الدفع
      'Cancelled',///////// بس الغيها
      'On Hold',
      'Received',
      'Incident',////////// اول ما ارفعها لما يشيك ع السبلاير ورقم الطلب
      'Partial_paid',//////////// لما تكون اقساط ولسا مش كل الدفعات اندفعوا
      'ReadyForPaid' ////////// بس اخلص التدقيق كامل فبتكون جاهزة ادفع
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
    type: DataType.ENUM('Cash', 'Bank Transfer', 'PayPal', 'Credit'),
    defaultValue: 'Cash',
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

   @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  to_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  to_email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  to_phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  to_address: string;
 
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  invoice_image: string;

  
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

  @Column({ type: DataType.JSON, allowNull: true })
  installmentsData: {
    total_installments: number;
    installments: { amount: number; due_date: string }[];
  } | null;


}

// import {
//   Table,
//   Column,
//   Model,
//   DataType,
//   ForeignKey,
//   BelongsTo,
// } from 'sequelize-typescript';
// import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
// import { GoodsReceipt } from '../GoodsReceipt/GoodsReceipt.model';
// import { PurchaseOrder } from '../PO/po.model';
// import { User } from '../users/users.model';

// @Table({ tableName: 'purchase_incidents', timestamps: true })
// export class PurchaseIncident extends Model<PurchaseIncident> {
//   @Column({
//     type: DataType.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   })
//   id: number;

//   @ForeignKey(() => SupplierInvoice)
//   @Column(DataType.INTEGER)
//   supplier_invoice_id: number | null;

//   @ForeignKey(() => GoodsReceipt)
//   @Column(DataType.INTEGER)
//   goods_receipt_id: number | null;

//   @ForeignKey(() => PurchaseOrder)
//   @Column(DataType.STRING)
//   po_number: string | null;

//   @Column({
//     type: DataType.STRING,
//     allowNull: false,
//   })
//   incident_type: string; // مثل: Supplier Missing, PO Missing, Mismatch

//   @Column(DataType.TEXT)
//   description: string | null;

//   @ForeignKey(() => User)
//   @Column(DataType.INTEGER)
//   reported_by: number | null;

//   @Column(DataType.DATE)
//   reported_at: Date | null;

//   @Column({
//     type: DataType.ENUM('Open', 'Under Investigation', 'Closed'),
//     defaultValue: 'Open',
//   })
//   status: 'Open' | 'Under Investigation' | 'Closed';

//   // العلاقات
//   @BelongsTo(() => SupplierInvoice)
//   supplierInvoice: SupplierInvoice;

//   @BelongsTo(() => GoodsReceipt)
//   goodsReceipt: GoodsReceipt;

//   @BelongsTo(() => PurchaseOrder)
//   purchaseOrder: PurchaseOrder;

//   @BelongsTo(() => User, 'reported_by')
//   reporter: User;
// }


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
import { InvoiceIncidentItem } from './InvoiceIncidentItem';

@Table({ tableName: 'invoice_incident', timestamps: true })
export class InvoiceIncident extends Model<InvoiceIncident> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  incident_id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  invoice_number: string;

  @Column(DataType.DATE)
  invoice_date: Date;

  @Column(DataType.DECIMAL(10, 2))
  subtotal: number;

  @Column(DataType.DECIMAL(10, 2))
  vat: number;

  @Column(DataType.DECIMAL(10, 2))
  discount: number;

  @Column(DataType.DECIMAL(10, 2))
  total_amount: number;

  @Column({
    type: DataType.ENUM('Cash','Bank Transfer','PayPal','Credit'),
    allowNull: true,
  })
  payment_method: string;

  @Column(DataType.TEXT)
  notes: string;

  @Column(DataType.STRING)
  incident_reason: string;

  @Column({
    type: DataType.ENUM('Pending','Resolved','Rejected'),
    defaultValue: 'Pending',
  })
  status: string;

  // @Column({
  //   type: DataType.BOOLEAN,
  //   defaultValue: false,
  // })
  // resolved: boolean;

  // @Column(DataType.TEXT)
  // resolution_notes: string;

  @ForeignKey(() => Supplier)
  @Column(DataType.INTEGER)
  supplier_id: number | null;

  @Column(DataType.STRING)
  supplier_name: string;

  @Column(DataType.STRING)
  supplier_email: string;

  @Column(DataType.STRING)
  supplier_phone: string;

  @Column(DataType.STRING)
  supplier_address: string;

  @ForeignKey(() => PurchaseOrder)
  @Column(DataType.STRING)
  po_number: string | null;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  created_by: number | null;

  @BelongsTo(() => Supplier)
  supplier: Supplier;

  @BelongsTo(() => PurchaseOrder)
  purchaseOrder: PurchaseOrder;

  @BelongsTo(() => User, 'created_by')
  createdBy: User;

  @HasMany(() => InvoiceIncidentItem, 'incident_id')
  items: InvoiceIncidentItem[];
}

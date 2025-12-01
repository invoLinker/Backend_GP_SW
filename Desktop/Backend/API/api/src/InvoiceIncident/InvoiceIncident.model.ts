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

  @Column({ type: DataType.STRING, allowNull: false})
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
    type: DataType.ENUM('Pending','Resolved'),
    defaultValue: 'Pending',
  })
  status: string;

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

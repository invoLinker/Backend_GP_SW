import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SupplierInvoice } from './supplier-invoice.model';

@Table({ tableName: 'supplier_invoice_items', timestamps: false,})
export class SupplierInvoiceItem extends Model<SupplierInvoiceItem> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => SupplierInvoice)
  @Column(DataType.INTEGER)
  invoice_id: number;


  @Column(DataType.STRING)
  item_name: string;

  @Column(DataType.STRING)
  barcode: string;

  @Column({ type: DataType.DOUBLE,
    defaultValue: 0, })
  quantity: number;

  @Column({ type: DataType.DOUBLE,
    defaultValue: 0,})
  unit_price: number;

  @Column(DataType.STRING)
  unit: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0,
  })
  total_price: number;

  @Column(DataType.STRING)
  remarks: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_matched: boolean;

  @Column(DataType.TEXT)
  match_notes: string;

  @BelongsTo(() => SupplierInvoice)
  invoice: SupplierInvoice;
}

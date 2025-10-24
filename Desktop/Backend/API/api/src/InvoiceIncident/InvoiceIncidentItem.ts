import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { InvoiceIncident } from './InvoiceIncident.model';

@Table({ tableName: 'invoice_incident_items', timestamps: false })
export class InvoiceIncidentItem extends Model<InvoiceIncidentItem> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  item_id: number;

  @ForeignKey(() => InvoiceIncident)
  @Column(DataType.INTEGER)
  incident_id: number;

  @Column(DataType.STRING)
  item_name: string;

  @Column(DataType.STRING)
  barcode: string;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  quantity: number;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
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
  is_resolved: boolean;

  @Column(DataType.TEXT)
  resolution_notes: string;

  @BelongsTo(() => InvoiceIncident)
  incident: InvoiceIncident;
}

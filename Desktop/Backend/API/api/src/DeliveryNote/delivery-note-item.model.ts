import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { DeliveryNote } from './delivery-note.model';

@Table({ tableName: 'delivery_note_items', timestamps:false })
export class DeliveryNoteItem extends Model<DeliveryNoteItem> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  item_id: number;

  @ForeignKey(() => DeliveryNote)
  @Column(DataType.INTEGER)
  dn_id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  product_name: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  quantity: number;

  @Column({ type: DataType.STRING, allowNull: true })
  unit: string;

  @Column({ type: DataType.STRING, allowNull: true })
  barcode: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  remarks: string;
}

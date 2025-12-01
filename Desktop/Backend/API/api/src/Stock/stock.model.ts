import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';

@Table({
  tableName: 'stock',
  timestamps: true, 
})
export class Stock extends Model<Stock> {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  stock_id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  item_name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  barcode: string;

  @ForeignKey(() => DeliveryNote)
  @Column(DataType.INTEGER)
  dn_id: number;

  @BelongsTo(() => DeliveryNote)
  delivery_note: DeliveryNote;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  quantity: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  unit: string; 

  @AllowNull(true)
  @Column(DataType.DATE)
  expiration_date: Date;

  @AllowNull(false)
  @Default('Available')
  @Column(DataType.STRING)
  status: 'Available' | 'Expired' | 'Reserved'|'OutOfStock'; 
}

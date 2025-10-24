import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PurchaseOrder } from './po.model';

@Table({
  tableName: 'PurchaseOrderItems',
  timestamps: true,
})
export class PurchaseOrderItem extends Model<PurchaseOrderItem> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  po_item_id: number;

  @ForeignKey(() => PurchaseOrder)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  po_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  item_name: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  quantity: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  unit?: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  unit_price: number;

  @Column({
    type: DataType.STRING,
      allowNull: false,
  })
  barcode: string;

  @BelongsTo(() => PurchaseOrder)
  purchaseOrder: PurchaseOrder;
}



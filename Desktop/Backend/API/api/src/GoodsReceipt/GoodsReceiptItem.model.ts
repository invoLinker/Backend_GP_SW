// src/tables/GoodsReceiptItem.ts
import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { GoodsReceipts } from './GoodsReceipt.model';

@Table({ tableName: 'goods_receipt_items', timestamps: false })
export class GoodsReceiptItem extends Model<GoodsReceiptItem> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  gri_id!: number;

  @ForeignKey(() => GoodsReceipts)
  @Column({ type: DataType.INTEGER, allowNull: true })
  gr_id!: number | null;

  @Column({ type: DataType.STRING, allowNull: false })
  item_name!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity!: number;

  @Column({ type: DataType.STRING, allowNull: true })
  unit!: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  barcode!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({type:DataType.DATE, allowNull:true})
  expiration_date:Date;

  @BelongsTo(() => GoodsReceipts, 'gr_id')
  goodsReceipt!: GoodsReceipts;
}

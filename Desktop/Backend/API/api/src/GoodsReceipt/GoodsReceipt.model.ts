import { Column, Model, Table, DataType, HasMany, ForeignKey, BelongsTo, AllowNull } from 'sequelize-typescript';
import { User } from '../users/users.model';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { GoodsReceiptItem } from './GoodsReceiptItem.model';
import { DefaultValuePipe } from '@nestjs/common';

@Table({ tableName: 'goods_receipts', timestamps: true })
export class GoodsReceipts extends Model<GoodsReceipts> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  gr_id!: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  gr_number!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  gr_date!: Date;

  @ForeignKey(() => DeliveryNote)
  @Column({ type: DataType.INTEGER, allowNull: true })
  dn_id!: number | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  received_by!: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.ENUM('Pending', // اول ما ارفعها
      'Verified', // كلو تمام من الفيريفيكيشن
      'Incident'), // في غلط بالفيريفيكيشن
      defaultValue: 'Pending' })
  status!: 'Pending' | 'Verified' | 'Incident';

  @Column({ type: DataType.STRING, allowNull: true })
  po_number!: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_verified!: boolean;

  @HasMany(() => GoodsReceiptItem, { foreignKey: 'gr_id', as: 'items' })
  items!: GoodsReceiptItem[];


  @BelongsTo(() => DeliveryNote, 'dn_id')
  deliveryNote!: DeliveryNote;

  @BelongsTo(() => User, 'received_by')
  user!: User;
}

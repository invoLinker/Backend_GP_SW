import { Table, Column, Model, PrimaryKey, AutoIncrement, DataType, CreatedAt, UpdatedAt, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { PurchaseOrder } from 'src/PO/po.model';
import { User } from 'src/users/users.model';

@Table({ tableName: 'edit_requests', timestamps: true })
export class EditRequest extends Model<EditRequest> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id: number;

  @ForeignKey(() => PurchaseOrder)
  @Column({ type: DataType.INTEGER, allowNull: false })
  invoice_id: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  user_id: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  message: string; 

  @Column({
     type: DataType.BOOLEAN,
     defaultValue: false
  })
   is_edit?: boolean; 

   @Column({
  type: DataType.JSON,
  allowNull: true,
  })
  requested_changes: any;

  @Column({ type: DataType.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' })
  status: 'Pending' | 'Approved' | 'Rejected';

  @BelongsTo(() => PurchaseOrder, 'invoice_id')
  invoice: PurchaseOrder;

  @BelongsTo(() => User, 'user_id')
  user: User;
}

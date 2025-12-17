import { Table, Column, Model, DataType, HasMany, AllowNull, ForeignKey } from 'sequelize-typescript';
import { DeliveryNoteItem } from './delivery-note-item.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { User } from 'src/users/users.model';

@Table({ tableName: 'delivery_notes' ,timestamps:true })
export class DeliveryNote extends Model<DeliveryNote> {
   @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  dn_id!: number;

  @Column({ type: DataType.STRING, allowNull: false, unique:true })
  dn_number!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  dn_date!: Date;

  @Column({ type: DataType.STRING, allowNull: false })
  supplier_name!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  supplier_email!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  supplier_phone!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  supplier_address!: string;

  @Column({ 
    type: DataType.ENUM(
      'Pending', // اول ما ارفعها
      'Verified',// جاهزة من الفيريفيكيشن وكلو تمام
      'Incident'), // في خلل بالفيريفيكيشن
    defaultValue: 'Pending' 
  })
  status!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  po_number!: string;

  @ForeignKey(() => Supplier)
  @Column({ type: DataType.INTEGER, allowNull: true })
  supplier_id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  created_by!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  verified_by!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  verification_notes!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  verified_at!: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_verified!: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  imgUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  pdfUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  excelUrl: string;

  @Column({ type: DataType.STRING, allowNull: false})
  to_name: string;

  @Column({ type: DataType.STRING, allowNull: false})
  to_email: string;

 @Column({ type: DataType.STRING, allowNull: false})
  to_phone: string;

  @Column({ type: DataType.STRING, allowNull: false})
  to_address: string;

  @HasMany(() => DeliveryNoteItem, 'dn_id')
  items: DeliveryNoteItem[];
}


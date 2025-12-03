import { Table, Column, Model, PrimaryKey, AutoIncrement, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../users/users.model';

@Table({
  tableName: 'Suppliers',
  timestamps: true,
})
export class Supplier extends Model<Supplier> {

  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  supplier_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false, 
  })
  user_id!: number;

     @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  account_holder: string | null;

   @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  account_number: string | null;

   @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  iban: string | null;

   @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  swift: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  bank_name: string | null;

  @BelongsTo(() => User)
  user!: User;
}
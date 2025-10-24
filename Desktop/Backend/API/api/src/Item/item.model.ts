import { Table, Column, Model, PrimaryKey, AutoIncrement, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'Items',
  timestamps: true,
})
export class Item extends Model<Item> {

  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  item_id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  item_name!: string; // اسم العنصر: مش unique

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  item_code!: string; // الكود: unique

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  min_price?: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  max_price?: number;

  @Column({
    type: DataType.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
  })
  status!: 'active' | 'inactive';

  @CreatedAt
  @Column({ field: 'createdAt' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: 'updatedAt' })
  updatedAt!: Date;
}

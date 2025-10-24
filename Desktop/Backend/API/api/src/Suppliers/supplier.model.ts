import { Table, Column, Model, PrimaryKey, AutoIncrement, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'Suppliers',
  timestamps: true, // Sequelize رح ينشئ createdAt و updatedAt تلقائي
})
export class Supplier extends Model<Supplier> {
  
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  supplier_id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  supplier_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  contact_email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  contact_phone!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  contact_address!: string;

  @CreatedAt
  @Column({
    field: 'createdAt',
  })
  createdAt!: Date;

  @UpdatedAt
  @Column({
    field: 'updatedAt',
  })
  updatedAt!: Date;
}

// import { Table, Column, Model, PrimaryKey, AutoIncrement, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

// @Table({
//   tableName: 'Suppliers',
//   timestamps: true, 
// })
// export class Supplier extends Model<Supplier> {
  
//   @PrimaryKey
//   @AutoIncrement
//   @Column({
//     type: DataType.INTEGER,
//     allowNull: false,
//   })
//   supplier_id!: number;

//   @Column({
//     type: DataType.STRING,
//     allowNull: false,
//   })
//   supplier_name!: string;

//   @Column({
//     type: DataType.STRING,
//     allowNull: false,
//     unique: true,
//   })
//   contact_email!: string;

//   @Column({
//     type: DataType.STRING,
//     allowNull: false,
//     unique: true,
//   })
//   contact_phone!: string;

//   @Column({
//     type: DataType.STRING,
//     allowNull: false,
//   })
//   contact_address!: string;

//   @CreatedAt
//   @Column({
//     field: 'createdAt',
//   })
//   createdAt!: Date;

//   @UpdatedAt
//   @Column({
//     field: 'updatedAt',
//   })
//   updatedAt!: Date;
// }

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

  @BelongsTo(() => User)
  user!: User;
}
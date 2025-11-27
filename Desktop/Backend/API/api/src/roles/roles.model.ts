import { Column, Model, Table, DataType, HasMany, BelongsToMany, AllowNull } from 'sequelize-typescript';
import { User } from '../users/users.model';
import { Permission } from 'src/permission/permission.model';
import { RolePermission } from 'src/RolePermission/RolePermission.model';

@Table({ tableName: 'Roles', timestamps: true })
export class Role extends Model<Role> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  role_id: number;

  @Column({
    type: DataType.TEXT,
    allowNull:false
  })
  description: string;

  @Column({
    type: DataType.ENUM(
      'Admin',
      'Accountant',
      'Warehouse',
      'Supplier',
      'Payment Officer',
      'Viewer',
    ),
    allowNull: false,
    unique: true,
  })
  role_name!: string;

  @HasMany(() => User)
  users: User[];

 @BelongsToMany(() => Permission, () => RolePermission)
permissions: Permission[];
}

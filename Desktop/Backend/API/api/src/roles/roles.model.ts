import { Column, Model, Table, DataType, HasMany, BelongsToMany } from 'sequelize-typescript';
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
    type: DataType.ENUM(
      'Admin',
      'Manager',
      'HeadOfDepartment',
      'Accountant',
      'Supplier',
      'DeliveryAgent',
      'Viewer',
      'AI'
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

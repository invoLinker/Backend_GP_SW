import { Table, Column, Model, DataType, BelongsToMany } from 'sequelize-typescript';
import { RolePermission } from 'src/RolePermission/RolePermission.model';
import { Role } from 'src/roles/roles.model';

@Table({
  tableName: 'Permissions',
  timestamps: true,
})
export class Permission extends Model<Permission> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  permission_id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  permission_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  description?: string;

  @BelongsToMany(() => Role, () => RolePermission)
roles: Role[]; 
}

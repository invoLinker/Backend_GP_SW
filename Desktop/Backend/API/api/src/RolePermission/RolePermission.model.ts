import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Role } from '../roles/roles.model';
import { Permission } from '../permission/permission.model';

@Table({ tableName: 'Role_Permissions', timestamps: false })
export class RolePermission extends Model {
  
  @ForeignKey(() => Role)
  @Column({ allowNull: false, onDelete: 'CASCADE' })
  roleId: number;

  @ForeignKey(() => Permission)
  @Column({ allowNull: false, onDelete: 'CASCADE' })
  permissionId: number;

  @BelongsTo(() => Role)
  role: Role;

  @BelongsTo(() => Permission)
  permission: Permission;
}

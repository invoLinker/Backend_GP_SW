// const { DataTypes, INTEGER } = require('sequelize');
// const sequelize = require('../../db'); 

// const Roles = require('./Roles');
// const Permissions = require('./Permissions');

// const Role_Permissions = sequelize.define('Role_Permissions',{}
//     ,{
//     tableName: 'Role_Permissions',
//     timestamps: false
// });


// Roles.belongsToMany(Permissions, { through: 'Role_Permissions' });
// Permissions.belongsToMany(Roles, { through: 'Role_Permissions' });

// module.exports = Role_Permissions;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { Role } from './Roles';
import { Permission } from './Permissions';

export class RolePermission extends Model<InferAttributes<RolePermission>, InferCreationAttributes<RolePermission>> {
  declare roleId: number;
  declare permissionId: number;
}

RolePermission.init(
  {
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Role, key: 'role_id' },
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Permission, key: 'permission_id' },
    },
  },
  {
    sequelize,
    tableName: 'Role_Permissions',
    timestamps: false,
  }
);

// تعريف العلاقة Many-to-Many
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId' });

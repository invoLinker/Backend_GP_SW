// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db');

// const Role = sequelize.define('Role', {
//   role_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   role_name: {
//     type: DataTypes.ENUM(
//       'Admin',
//       'Manager',
//       'HeadOfDepartment',
//       'Accountant',
//       'Supplier',
//       'DeliveryAgent',
//       'Viewer'
//     ),
//     allowNull: false,
//     unique: true
//   },
// }, {
//   tableName: 'Roles',
//   timestamps: true
// });

// module.exports = Role;

// import { DataTypes } from 'sequelize';
// import { sequelize } from '../../db';

// export const Role = sequelize.define('Role', {
//   role_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   role_name: {
//     type: DataTypes.ENUM(
//       'Admin',
//       'Manager',
//       'HeadOfDepartment',
//       'Accountant',
//       'Supplier',
//       'DeliveryAgent',
//       'Viewer'
//     ),
//     allowNull: false,
//     unique: true,
//   },
//   created_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW,
//     allowNull: false,
//   },
//   updated_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW,
//     allowNull: false,
//   },
// }, {
//   tableName: 'Roles',
//   timestamps: true,
// });


// import { Model, DataTypes } from 'sequelize';
// import { sequelize } from '../../db';

// export class Role extends Model {
//   declare role_id: number;
//   declare role_name: 'Admin' | 'Manager' | 'HeadOfDepartment' | 'Accountant' | 'Supplier' | 'DeliveryAgent' | 'Viewer';
// }

// Role.init({
//   role_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
//   role_name: { type: DataTypes.ENUM('Admin','Manager','HeadOfDepartment','Accountant','Supplier','DeliveryAgent','Viewer'), allowNull: false, unique: true },
// }, {
//   sequelize,
//   tableName: 'Roles',
//   timestamps: true,
// });

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare role_id: number;
  declare role_name: 'Admin' | 'Manager' | 'HeadOfDepartment' | 'Accountant' | 'Supplier' | 'DeliveryAgent' | 'Viewer';
}

Role.init(
  {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_name: {
      type: DataTypes.ENUM(
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
    },
  },
  {
    sequelize,
    tableName: 'Roles',
    timestamps: true,
  }
);

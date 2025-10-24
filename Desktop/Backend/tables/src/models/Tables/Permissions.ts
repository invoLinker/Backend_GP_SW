// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 

// const Permission = sequelize.define('Permissions',{
//     permission_id:{
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   permission_name:{
//     type: DataTypes.STRING,
//     primaryKey: false,
//     allowNull: false
//   },
//   description:{
//     type: DataTypes.STRING,
//     primaryKey: false,
//     allowNull: true
//   },
// },{
//     tableName: 'Permissions',
//   timestamps: true
// });

// module.exports = Permission;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
  declare permission_id: number;
  declare permission_name: string;
  declare description?: string;
}

Permission.init(
  {
    permission_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    permission_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Permissions',
    timestamps: true,
  }
);

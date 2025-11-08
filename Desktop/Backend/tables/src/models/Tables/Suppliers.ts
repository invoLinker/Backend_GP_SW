// import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
// import { sequelize } from '../../db';

// export class Supplier extends Model<InferAttributes<Supplier>, InferCreationAttributes<Supplier>> {
//   declare supplier_id: number;
//   declare supplier_name: string;
//   declare contact_email: string;
//   declare contact_phone: string;
//   declare contact_address: string;
// }

// Supplier.init(
//   {
//     supplier_id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//       allowNull: false,
//     },
//     supplier_name: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     contact_email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//     },
//     contact_phone: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//     },
//     contact_address: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//   },
//   {
//     sequelize,
//     tableName: 'Suppliers',
//     timestamps: true,
//   }
// );

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class Supplier extends Model<InferAttributes<Supplier>, InferCreationAttributes<Supplier>> {
  declare supplier_id: number;
  declare user_id: number;
}

Supplier.init(
  {
    supplier_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false, 
    },
  },
  {
    sequelize,
    tableName: 'Suppliers',
    timestamps: true,
  }
);  

User.hasOne(Supplier, { foreignKey: 'user_id', as: 'supplierProfile' });
Supplier.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare role_id: number;
  declare role_name: 'Admin' | 'Accountant' | 'Warehouse' | 'Supplier' | 'PaymentOfficer' | 'Viewer' ;
  declare description:Text;
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
      'Accountant',
      'Warehouse',
      'Supplier',
      'PaymentOfficer',
      'Viewer'
      ),
      allowNull: false,
      unique: true,
    },
    description:{type: DataTypes.TEXT, allowNull:false}
  },
  {
    sequelize,
    tableName: 'Roles',
    timestamps: true,
  }
);

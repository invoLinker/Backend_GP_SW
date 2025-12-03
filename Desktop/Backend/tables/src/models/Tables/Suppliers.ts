import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class Supplier extends Model<InferAttributes<Supplier>, InferCreationAttributes<Supplier>> {
  declare supplier_id: number;
  declare user_id: number;
  declare bank_name: string | null;
  declare account_holder: string | null;
  declare account_number: string | null;
  declare iban: string | null;
  declare swift: string | null;
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
    account_holder:{type: DataTypes.STRING,allowNull: true},
    account_number:{type: DataTypes.STRING,allowNull: true},
    iban:{type: DataTypes.STRING,allowNull: true},
    swift:{type: DataTypes.STRING,allowNull: true},
    bank_name:{type: DataTypes.STRING,allowNull: true}
  },
  {
    sequelize,
    tableName: 'Suppliers',
    timestamps: true,
  }
);  

User.hasOne(Supplier, { foreignKey: 'user_id', as: 'supplierProfile' });
Supplier.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

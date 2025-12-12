import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { Role } from './Roles';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare user_id: number;
  declare first_name: string;
  declare last_name: string;
  declare email: string;
  declare password_hash: string;
  declare phone_number: string;
  declare location: string;
  declare profile_image: string;
  declare ID_image: string;
  declare gender: 'Male' | 'Female' | 'Other';
  declare birth_date: Date;
  declare role_id: number;
  declare status: 'Active' | 'Inactive';
  declare deletedAt: Date;
  declare google_id: string;
  declare provider: 'local' | 'google';
}

 
User.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female'),
      allowNull: true,
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true, 
    },
    ID_image: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    google_id:{type: DataTypes.STRING, allowNull: true, unique: true,},
    provider:{type: DataTypes.ENUM('local', 'google'), defaultValue: 'local',}
    
  },
  {
    sequelize,
    tableName: 'User',
    timestamps: true,
  }
);

Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

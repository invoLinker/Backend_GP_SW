import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { Role } from './Roles';

export class VerificationLog extends Model<InferAttributes<VerificationLog>, InferCreationAttributes<VerificationLog>> {
  declare id: number;
  declare poNumber: string;
  declare userId: number;
  declare stage: string;
  declare aiMessage: string;
}

 
VerificationLog.init(
  {
     id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    poNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aiMessage: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    sequelize,
    tableName: 'verification_logs',
    timestamps: true,
  }
);


import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class HistoryLog extends Model<InferAttributes<HistoryLog>, InferCreationAttributes<HistoryLog>> {
  declare id: number;
  declare timestamp: Date;
  declare action: string;
  declare description: string;
  declare user: string;
  declare userRole: string;
  declare category: 'auth' | 'system' | 'user' | 'security' | 'data' | 'config';
  declare severity: 'info' | 'warning' | 'error' | 'success';
  declare details?: object;
}

HistoryLog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userRole: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('auth','system','user','security','data','config'),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('info','warning','error','success'),
      allowNull: false,
      defaultValue: 'info',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'history_logs',
    timestamps: true,
  }
);

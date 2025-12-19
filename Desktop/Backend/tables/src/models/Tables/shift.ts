import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class Shift extends Model<InferAttributes<Shift>, InferCreationAttributes<Shift>> {
  declare id: number;
  declare user_id: number;
  declare start_time: Date;
  declare end_time: Date | null;
  declare duration_minutes: number | null;
  declare status: 'ONGOING' | 'COMPLETED';
  
}

Shift.init(
  {
    id:{type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true,},
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true},
    status: { type: DataTypes.ENUM('ONGOING', 'COMPLETED'), allowNull: false, defaultValue: 'ONGOING' },

  },
  {
    sequelize,
    tableName: 'shifts',
    timestamps: true,
  }
);

Shift.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(Shift, {
  foreignKey: 'user_id',
  as: 'shifts',
});

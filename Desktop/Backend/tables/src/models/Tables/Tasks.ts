import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: number;
  declare title: string;
  declare assignedTo: string;
  declare description?: string;
  declare priority: 'High' | 'Medium' | 'Low';
  declare status: 'Pending' | 'In_Progress' | 'Completed';
  declare dueDate: Date;
  declare created_by: number | null;
  
}

Task.init(
  {
    id:{type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true,},
    title: { type: DataTypes.STRING, allowNull: false },
    assignedTo: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    priority: { type: DataTypes.ENUM('High','Medium','Low'), allowNull: false, defaultValue: 'Medium' },
    status: { type: DataTypes.ENUM('Pending','In_Progress','Completed'), allowNull: false, defaultValue: 'Pending' },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    created_by: { type: DataTypes.INTEGER, allowNull: true },

  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
  }
);

User.hasMany(Task, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE',});
Task.belongsTo(User, { foreignKey: 'created_by', onDelete: 'SET NULL', onUpdate: 'CASCADE',});

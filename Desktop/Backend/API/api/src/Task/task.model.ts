import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from 'src/users/users.model';

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

@Table({ tableName: 'tasks', timestamps: true })
export class Task extends Model<Task> {
  @Column({
  type: DataType.INTEGER,
  autoIncrement: true,
  primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.STRING, allowNull: false })
  assignedTo: string;

  @Column({ type: DataType.TEXT })
  description: string;

  @Column({ type: DataType.ENUM(...Object.values(TaskPriority)), defaultValue: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: DataType.ENUM(...Object.values(TaskStatus)), defaultValue: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: DataType.DATE, allowNull: true })
  dueDate: Date;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  created_by: number;

}

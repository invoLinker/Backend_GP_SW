import {
  Column,
  Model,
  Table,
  DataType,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from '../users/users.model';

@Table({ tableName: 'shifts', timestamps: true })
export class Shift extends Model<Shift> {

  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @BelongsTo(() => User)
  user: User;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  start_time: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  end_time: Date | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  duration_minutes: number | null;

  @Column({
    type: DataType.ENUM('ONGOING', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'ONGOING',
  })
  status: 'ONGOING' | 'COMPLETED';
}

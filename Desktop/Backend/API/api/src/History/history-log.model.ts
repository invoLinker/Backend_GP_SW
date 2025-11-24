import { Table, Column, Model, DataType, Default, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { HistoryCategory, HistorySeverity } from './create-history-log.dto';

@Table({ tableName: 'history_logs', timestamps: true })
export class HistoryLog extends Model<HistoryLog> {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number; 

  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  timestamp: Date; 

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  action: string; 

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  description: string; 

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  user: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  userRole: string; 

 @Column({ type: DataType.ENUM(...Object.values(HistoryCategory)), allowNull: false })
  category: HistoryCategory;

  @Column({ type: DataType.ENUM(...Object.values(HistorySeverity)), allowNull: false })
  severity: HistorySeverity;

  @Column({
    type: DataType.JSON,
    allowNull: true
  })
  details: Record<string, any>;
}

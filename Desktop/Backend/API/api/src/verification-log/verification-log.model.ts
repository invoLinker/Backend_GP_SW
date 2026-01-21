import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'verification_logs',
  timestamps: true,
})
export class VerificationLog extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true})
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  poNumber: string; 

  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number; 

  @Column({ type: DataType.STRING, allowNull: false })
  stage: string; // المرحلة: 'PO-SI', 'PO-DN', 'PO-GR'

  @Column({
  type: DataType.TEXT('long'),
  allowNull: true,
})
aiMessage: string;


}

import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Role } from '../roles/roles.model';

@Table({ tableName: 'User', timestamps: true })
export class User extends Model<User> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  user_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  first_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  last_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password_hash: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone_number: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  location: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  profile_image: string; 

  @Column({
    type: DataType.ENUM('Male', 'Female'),
    allowNull: true,
  })
  gender: 'Male' | 'Female';

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  birth_date: Date;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare role_id?: number;

  @Column({
    type: DataType.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
  })
  status: 'Active' | 'Inactive';

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deletedAt: Date | null;

  // العلاقة مع جدول Role
  @BelongsTo(() => Role)
  role: Role;
}

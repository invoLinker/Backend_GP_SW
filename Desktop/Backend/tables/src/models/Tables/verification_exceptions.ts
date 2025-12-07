import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class verification_exceptions extends Model<InferAttributes<verification_exceptions>, InferCreationAttributes<verification_exceptions>> {
  declare id: number;
  declare po_number: string
  declare description:Text;
  declare status : 'Pending' | 'Approved' | 'Rejected';
  declare user_id: number;
}

verification_exceptions.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    po_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description:{type: DataTypes.TEXT, allowNull:false},
    status:{ type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
            allowNull: false,
            defaultValue: 'Pending',},
    user_id:{type: DataTypes.INTEGER,
    allowNull: false,}
  },
  
  {
    sequelize,
    tableName: 'verification_exceptions',
    timestamps: true,
  }
);

verification_exceptions.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

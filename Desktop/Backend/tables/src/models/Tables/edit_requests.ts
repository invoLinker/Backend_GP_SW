import { Model, InferAttributes, InferCreationAttributes, DataTypes } from 'sequelize';
import {sequelize} from '../../db'; 
import { PurchaseOrder } from './PurchaseOrders';
import { User } from './Users';

export class EditRequest extends Model<
  InferAttributes<EditRequest>,
  InferCreationAttributes<EditRequest>
> {
  declare id: number;
  declare invoice_id: number;
  declare user_id: number;
  declare message: string;
  declare status: 'Pending' | 'Approved' | 'Rejected';
  declare is_edit: Boolean;
  declare invoice?: PurchaseOrder;
  declare user?: User;
  declare requested_changes:JSON;
}

EditRequest.init(
  {
    requested_changes:{type: DataTypes.JSON, allowNull:true},
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      defaultValue: 'Pending',
    },
    is_edit:{
      type:DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    }
  },
  {
    sequelize,
    tableName: 'edit_requests',
    timestamps: true,
  }
);

EditRequest.belongsTo(PurchaseOrder, {
  foreignKey: 'invoice_id',
  as: 'invoice',
  onDelete: 'CASCADE',        // ← أهم سطر
});

EditRequest.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});
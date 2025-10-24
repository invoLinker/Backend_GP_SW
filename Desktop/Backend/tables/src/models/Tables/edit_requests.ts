import { Model, InferAttributes, InferCreationAttributes, DataTypes } from 'sequelize';
import {sequelize} from '../../db'; // اتصال قاعدة البيانات
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
  declare status: 'pending' | 'approved' | 'rejected';
  declare is_edit: Boolean;

  // هاد للحفظ بالعلاقات، ممكن تستخدمها عند الـ includes
  declare invoice?: PurchaseOrder;
  declare user?: User;
}

// تعريف الجدول بدون ديكوريتر
EditRequest.init(
  {
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
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
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

// العلاقات
EditRequest.belongsTo(PurchaseOrder, { foreignKey: 'invoice_id', as: 'invoice' });
EditRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class Item extends Model<InferAttributes<Item>, InferCreationAttributes<Item>> {
  declare item_id: number;
  declare item_name: string;
  declare item_code: string;
  declare min_price: number;
  declare max_price: number;
  declare status: 'active' | 'inactive';

}

Item.init(
  {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    min_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    max_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'Items',
    timestamps: true, 
  }
);

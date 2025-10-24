// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db');
// const Suppliers = require('./Suppliers');

// const SupplierBenchmarking = sequelize.define('SupplierBenchmarking', {
//   benchmark_id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true
//   },
//   supplier_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   metric: {
//     type: DataTypes.STRING(100),
//     allowNull: false
//   },
//   score: {
//     type: DataTypes.DECIMAL(5, 2),
//     allowNull: false
//   },
//   rating: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     validate: { min: 1, max: 5 }
//   },
//   calculated_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW,
//     allowNull: false
//   }
// }, {
//   tableName: 'SupplierBenchmarking',
//   timestamps: false
// });

// Suppliers.hasMany(SupplierBenchmarking, { foreignKey: 'supplier_id' });
// SupplierBenchmarking.belongsTo(Suppliers, { foreignKey: 'supplier_id' });

// module.exports = SupplierBenchmarking;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { Supplier } from './Suppliers';

export class SupplierBenchmarking extends Model<InferAttributes<SupplierBenchmarking>, InferCreationAttributes<SupplierBenchmarking>> {
  declare benchmark_id: number;
  declare supplier_id: number;
  declare metric: string;
  declare score: number;
  declare rating: number;
  declare calculated_at: Date;
}

SupplierBenchmarking.init(
  {
    benchmark_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    metric: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    calculated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'SupplierBenchmarking',
    timestamps: false
  }
);

// Associations
Supplier.hasMany(SupplierBenchmarking, { foreignKey: 'supplier_id' });
SupplierBenchmarking.belongsTo(Supplier, { foreignKey: 'supplier_id' });

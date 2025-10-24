// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 

// const CurrencyRates = sequelize.define('CurrencyRates' , {
//     rate_id:{
//         type:DataTypes.INTEGER,
//         autoIncrement:true,
//         allowNull:false,
//         primaryKey:true
//     },
//     from_currency:{
//         type:DataTypes.STRING,
//     },
//     to_currency:{
//         type:DataTypes.STRING,
//     },
//     rate: {
//     type: DataTypes.DECIMAL(10,4),  
//     allowNull: false
//   },
//   date:{
//     type:DataTypes.DATE
//   },
// },
//     {
//     tableName:'CurrencyRate',
//      timestamps: true 
//     }
// );

// module.exports = CurrencyRates ;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class CurrencyRate extends Model<InferAttributes<CurrencyRate>, InferCreationAttributes<CurrencyRate>> {
  declare rate_id: number;
  declare from_currency: string;
  declare to_currency: string;
  declare rate: number;
  declare date?: Date;
}

CurrencyRate.init(
  {
    rate_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    from_currency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    to_currency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'CurrencyRate',
    timestamps: true,
  }
);

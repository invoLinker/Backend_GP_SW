// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db');

// const Suppliers = sequelize.define('Suppliers' , {

//     supplier_id:{
//         type:DataTypes.INTEGER ,
//         autoIncrement : true ,
//         primaryKey : true ,
//         allowNull : false
//     },
//     supplier_name:{
//         type: DataTypes.STRING,
//         allowNull:false
//     },
//     contact_info:{
//         type:DataTypes.STRING,
//         allowNull:false
//     },


//         created_at: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW,
//         allowNull: false,
//     },

// }, {
// tableName: 'Suppliers',
// timestamps: true
// });

// module.exports = Suppliers;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class Supplier extends Model<InferAttributes<Supplier>, InferCreationAttributes<Supplier>> {
  declare supplier_id: number;
  declare supplier_name: string;
  declare contact_email: string;
  declare contact_phone: string;
  declare contact_address: string;
}

Supplier.init(
  {
    supplier_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    supplier_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    contact_phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    contact_address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'Suppliers',
    timestamps: true, // لو بدك Sequelize يعمل createdAt و updatedAt تلقائي
  }
);

// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 

// const Documents = sequelize.define('Documents',{
//     doc_id:{
//         type:DataTypes.INTEGER,
//         allowNull:false,
//         autoIncrement:true,
//         primaryKey:true
//     },
//     related_type:{
//         type:DataTypes.ENUM(
//             'Supplier Invoice',
//             'PO',
//             'GR',
//             'Contract',
//             'Other',
//         ),
//         allowNull:false
//     },
//     related_id:{
//         type:DataTypes.INTEGER,
//         allowNull:false
//     },
//     file_path:{
//         type:DataTypes.STRING,
//     },
//     uploaded_by:{
//         type:DataTypes.INTEGER,
//         allowNull:false
//     },
//     uploaded_at:{
//         type:DataTypes.TIME,
//         defaultValue:DataTypes.NOW,
//     },
// },{
//     tableName:'Documents',
//      timestamps: true 
// });

// module.exports = Documents;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';

export class Document extends Model<InferAttributes<Document>, InferCreationAttributes<Document>> {
  declare doc_id: number;
  declare related_type: 'Supplier Invoice' | 'PO' | 'GR' | 'Contract' | 'Other';
  declare related_id: number;
  declare file_path?: string;
  declare uploaded_by: number;
  declare uploaded_at: Date;
}

Document.init(
  {
    doc_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    related_type: {
      type: DataTypes.ENUM('Supplier Invoice', 'PO', 'GR', 'Contract', 'Other'),
      allowNull: false,
    },
    related_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'Documents',
    timestamps: true,
  }
);

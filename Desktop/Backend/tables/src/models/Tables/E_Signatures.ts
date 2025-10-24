// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 
// const Users = require('./Users');


// const E_Signatures = sequelize.define('E_Signatures', {
//   sign_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//     allowNull: false
//   },
//   related_type: {
//     type: DataTypes.ENUM('Invoice','PO','Contract'),
//     allowNull: false
//   },
//   related_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   signed_by: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   signature_hash: {
//     type: DataTypes.STRING(255),
//     allowNull: false
//   },
//   signed_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW,
//     allowNull: false
//   }
// }, {
//   tableName: 'E_Signatures',
//   timestamps: false,
//   indexes: [
//     {
//       unique: true,
//       fields: ['related_type', 'related_id', 'signed_by'] // يمنع التوقيع المكرر لنفس الشخص
//     }
//   ]
// });
// Users.hasMany(E_Signatures, { foreignKey: 'signed_by' });
// E_Signatures.belongsTo(Users, { foreignKey: 'signed_by' });

// module.exports = E_Signatures;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class ESignature extends Model<InferAttributes<ESignature>, InferCreationAttributes<ESignature>> {
  declare sign_id: number;
  declare related_type: 'Invoice' | 'PO' | 'Contract';
  declare related_id: number;
  declare signed_by: number;
  declare signature_hash: string;
  declare signed_at: Date;
}

ESignature.init(
  {
    sign_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    related_type: {
      type: DataTypes.ENUM('Invoice', 'PO', 'Contract'),
      allowNull: false,
    },
    related_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    signed_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    signature_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    signed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'E_Signatures',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['related_type', 'related_id', 'signed_by'],
      },
    ],
  }
);

// العلاقات
User.hasMany(ESignature, { foreignKey: 'signed_by' });
ESignature.belongsTo(User, { foreignKey: 'signed_by' });

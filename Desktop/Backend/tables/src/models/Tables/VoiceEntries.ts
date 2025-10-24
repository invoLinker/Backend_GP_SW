// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 
// const User = require('./Users'); 

// const VoiceEntry = sequelize.define('VoiceEntry', {
//   voice_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   user_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   transcript: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   created_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW
//   }
// }, {
//   tableName: 'VoiceEntries',
//   timestamps: false
// });

// // العلاقة مع جدول Users
// VoiceEntry.belongsTo(User, { foreignKey: 'user_id' });
// User.hasMany(VoiceEntry, { foreignKey: 'user_id' });

// module.exports = VoiceEntry;


import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class VoiceEntry extends Model<InferAttributes<VoiceEntry>, InferCreationAttributes<VoiceEntry>> {
  declare voice_id: number;
  declare user_id: number;
  declare transcript: string;
  declare created_at: Date;
}

VoiceEntry.init(
  {
    voice_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transcript: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'VoiceEntries',
    timestamps: false, // بما إنك محدد created_at يدويًا
  }
);

// العلاقات
VoiceEntry.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(VoiceEntry, { foreignKey: 'user_id' });

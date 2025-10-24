// const { DataTypes } = require('sequelize');
// const sequelize = require('../../db'); 
// const Users = require('./Users');


// const Notifications = sequelize.define('Notifications', {
//   notif_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//     allowNull: false
//   },
//   user_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   notif_type: {
//     type: DataTypes.ENUM('Email','MobilePush','SystemAlert'),
//     allowNull: false
//   },
//   message: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   related_type: {
//     type: DataTypes.ENUM('Invoice','PO','GR','Other'),
//     allowNull: true
//   },
//   related_id: {
//     type: DataTypes.INTEGER,
//     allowNull: true
//   },
//   status: {
//     type: DataTypes.ENUM('Read','Unread'),
//     defaultValue: 'Unread',
//     allowNull: false
//   },
//   created_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW,
//     allowNull: false
//   }
// }, {
//   tableName: 'Notifications',
//   timestamps: false 
// });
// Users.hasMany(Notifications, { foreignKey: 'user_id' });
// Notifications.belongsTo(Users, { foreignKey: 'user_id' });

// module.exports = Notifications;

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../db';
import { User } from './Users';

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare notif_id: number;
  declare user_id: number;
  declare notif_type: 'Email' | 'MobilePush' | 'SystemAlert';
  declare message: string;
  declare related_type?: 'Invoice' | 'PO' | 'GR' | 'Other';
  declare related_id?: number;
  declare status: 'Read' | 'Unread';
  declare created_at: Date;
}

Notification.init(
  {
    notif_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notif_type: {
      type: DataTypes.ENUM('Email', 'MobilePush', 'SystemAlert'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    related_type: {
      type: DataTypes.ENUM('Invoice', 'PO', 'GR', 'Other'),
      allowNull: true,
    },
    related_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Read', 'Unread'),
      allowNull: false,
      defaultValue: 'Unread',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'Notifications',
    timestamps: false,
  }
);

// العلاقات
User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

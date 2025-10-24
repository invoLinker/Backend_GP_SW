// const { Sequelize } = require("sequelize");
// const sequelize = new Sequelize("involinker2", "root", "123456789", {
//   host: "localhost",
//   dialect: "mysql" 
// });
// module.exports = sequelize;

// db.ts


import { Sequelize } from 'sequelize';

// إعداد الاتصال بالداتابيس
export const sequelize = new Sequelize('involinker2', 'root', '123456789', {
  host: 'localhost',
  dialect: 'mysql', // أو 'postgres' لو PostgreSQL
  logging: console.log, // لو بدك تطبع الاستعلامات في الكونسول
});



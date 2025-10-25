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

// export const sequelize = new Sequelize(
//   'invo_linker_b8cp',   // Database name
//   'root',                   // Username اللي اخترتيه عند الإنشاء
//   'gfVxgEmtWEusPic5dgzsvCC9TJOgqW2A',     // Password اللي اخترتيها عند الإنشاء
//   {
//     host: 'dpg-d3ts4s3ipnbc738h0oj0-a.oregon-postgres.render.com',
//     port: 5432,
//     dialect: 'postgres',
//     logging: console.log,
//     dialectOptions: {
//       ssl: {
//         require: true,
//         rejectUnauthorized: false,
//       },
//     },
//   }
// );

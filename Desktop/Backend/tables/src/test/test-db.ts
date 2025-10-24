

// // // const sequelize = require('../db'); 
// // // const fs = require('fs');
// // // const path = require('path');
// // // const { DataTypes } = require('sequelize');

// // // const modelsPath = path.join(__dirname, '../models/Tables');
// // // const models = [];

// // // fs.readdirSync(modelsPath).forEach(file => {
// // //   if (file.endsWith('.js')) {
// // //     const model = require(path.join(modelsPath, file));
// // //     models.push(model);
// // //   }
// // // });

// // // (async () => {
// // //   try {
// // //     await sequelize.authenticate();
// // //     console.log("✅ Database connected successfully!");

// // //     for (const model of models) {
// // //       await model.sync({ force: false });
// // //     }

// // //     console.log("All tables created!");
// // //   } catch (error) {
// // //     console.error("❌ Unable to connect or create tables:", error);
// // //   } finally {
// // //     await sequelize.close();
// // //   }
// // // })();

// // const sequelize = require('../db');

// // // استدعاء كل الموديلات لتسجيلها بالـ sequelize
// // import '../models/Tables/Roles';
// // // require('../models/Tables/Users');
// // // require('../models/Tables/Permissions');
// // // require('../models/Tables/Role_Permissions');
// // // require('../models/Tables/Suppliers');
// // // require('../models/Tables/PurchaseOrders');
// // // require('../models/Tables/PurchaseOrderItems');
// // // require('../models/Tables/GoodsReceipts');
// // // require('../models/Tables/GoodsReceiptItems');
// // // require('../models/Tables/PurchaseTags');
// // // require('../models/Tables/SupplierInvoices');
// // // require('../models/Tables/Documents');
// // // require('../models/Tables/Payments');
// // // require('../models/Tables/CurrencyRates');
// // // require('../models/Tables/AiAlerts');
// // // require('../models/Tables/SupplierBenchmarkings');
// // // require('../models/Tables/VoiceEntries');
// // // require('../models/Tables/Notifications');
// // // require('../models/Tables/Approvals');
// // // require('../models/Tables/E_Signatures');


// // (async () => {
// //   try {
// //     await sequelize.authenticate();
// //     console.log("✅ Database connected successfully!");

// //     // ينشئ كل الجداول مع علاقاتها
// //     await sequelize.sync({ force: false });

// //     console.log("✅ All tables created!");
// //   } catch (error) {
// //     console.error("❌ Unable to connect or create tables:", error);
// //   } finally {
// //     await sequelize.close();
// //   }
// // })();


// // test-db.ts
// const sequelize = require('../db');
// require('../models/Tables/Roles');

// (async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("✅ Database connected successfully!");
//     await sequelize.sync({ force: false });
//     console.log("✅ All tables created!");
//   } catch (error) {
//     console.error("❌ Unable to connect or create tables:", error);
//   } finally {
//     await sequelize.close();
//   }
// })();

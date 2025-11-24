// import * as admin from 'firebase-admin';
// import { join } from 'path';
// import * as fs from 'fs';

// const serviceAccount = join(process.cwd(), 'src', 'Firebase', 'involinkerchatting-firebase-adminsdk-fbsvc-5a8a4c6c7e.json');

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: 'involinkerchatting.appspot.com', 
//   });
// }

// export const db = admin.firestore();
// export const bucket = admin.storage().bucket();

import * as admin from 'firebase-admin';
import { join } from 'path';
import * as fs from 'fs';

// مسار ملف الخدمة
const serviceAccountPath = join(
  process.cwd(),
  'src',
  'Firebase',
  'involinkerchatting-firebase-adminsdk-fbsvc-5a8a4c6c7e.json',
);

// تأكد أن الملف موجود
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase config file not found at: ${serviceAccountPath}`);
}

// اقرأ ملف الخدمة كـ object
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// إذا ما في أي app تم تهيئته مسبقاً
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'involinkerchatting.appspot.com', // أو أي bucket تستخدمه
  });
}

// تصدير Firestore و Storage للاستخدام في أي خدمة
export const db = admin.firestore();
export const bucket = admin.storage().bucket();
export const firebaseAdmin = admin; // لتصدير كل admin إذا احتجت أي شيء آخر

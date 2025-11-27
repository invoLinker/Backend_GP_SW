import * as admin from 'firebase-admin';
import { join } from 'path';
import * as fs from 'fs';

const serviceAccountPath = join(
  process.cwd(),
  'src',
  'Firebase',
  'involinkerchatting-firebase-adminsdk-fbsvc-5a8a4c6c7e.json',
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase config file not found at: ${serviceAccountPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'involinkerchatting.appspot.com',
  });
}

export const db = admin.firestore();
export const bucket = admin.storage().bucket();
export const firebaseAdmin = admin;

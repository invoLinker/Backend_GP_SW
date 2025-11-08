import * as admin from 'firebase-admin';
import { join } from 'path';
import * as fs from 'fs';

const serviceAccount = join(process.cwd(), 'src', 'Firebase', 'involinkerchatting-firebase-adminsdk-fbsvc-5a8a4c6c7e.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'involinkerchatting.appspot.com', 
  });
}

export const db = admin.firestore();
export const bucket = admin.storage().bucket();

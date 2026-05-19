// lib/firebase.ts
// Add your Firebase project keys here.
// Firebase Console → Project settings → General → Your apps → Web app config

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCJfdiOJ6QpyI24rEDWia71-7RZ6smpOV4",
  authDomain: "teamiy-fb781.firebaseapp.com",
  projectId: "teamiy-fb781",
  storageBucket: "teamiy-fb781.firebasestorage.app",
  messagingSenderId: "286624448213",
  appId: "1:286624448213:web:a9a4a81d72db87c46e2c5c"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);

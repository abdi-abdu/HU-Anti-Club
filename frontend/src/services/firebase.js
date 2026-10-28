import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDMlgNAXuuxGQCaU32n3JABhZe2n7feeik",
  authDomain: "anti-drug-club-website.firebaseapp.com",
  projectId: "anti-drug-club-website",
  storageBucket: "anti-drug-club-website.firebasestorage.app",
  messagingSenderId: "332331226820",
  appId: "1:332331226820:web:fb7496b860b4ec1d039b91",
  measurementId: "G-MHGVXF7DBX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Analytics only runs in a browser that supports it (guards against SSR/test crashes)
export const analytics = isSupported().then((yes) => yes ? getAnalytics(app) : null);

export default app;
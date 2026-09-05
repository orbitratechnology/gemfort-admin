import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyB86SQc9lEcvHogpiNz_sFFFPwJFnFLvmM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "gemfort.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "gemfort",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "gemfort.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "478360291449",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:478360291449:web:3ff441835353200d456ca8",
};

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export function getFirebaseAuth() {
  return getAuth(firebaseApp);
}

export function getFirebaseDb() {
  return getFirestore(firebaseApp);
}

export function getFirebaseStorage() {
  return getStorage(firebaseApp);
}

export function getFirebaseConfigForDisplay() {
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
  };
}

export { firebaseApp, firebaseConfig };

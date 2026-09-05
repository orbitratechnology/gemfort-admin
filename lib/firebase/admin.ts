import "server-only";

import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | undefined;

function getCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
    }

    return cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID ?? "gemfort",
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  return applicationDefault();
}

export function getFirebaseAdminApp() {
  if (adminApp) return adminApp;

  adminApp = getApps()[0] ?? initializeApp({
    credential: getCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "gemfort",
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      "gemfort.firebasestorage.app",
  });

  return adminApp;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminBucket() {
  return getStorage(getFirebaseAdminApp()).bucket();
}

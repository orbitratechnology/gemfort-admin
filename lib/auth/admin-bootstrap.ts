"use server";

import "server-only";

import { timingSafeEqual } from "node:crypto";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

const BOOTSTRAP_TOKEN_MIN_LENGTH = 32;
const BOOTSTRAP_LOCK_REF = ["system", "admin_bootstrap"] as const;

export type AdminBootstrapState = {
  error?: string;
  success?: boolean;
  email?: string;
};

class BootstrapUnavailableError extends Error {}

function getBootstrapToken() {
  const token = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
  return token && token.length >= BOOTSTRAP_TOKEN_MIN_LENGTH ? token : null;
}

function isValidBootstrapToken(candidate: string) {
  const configuredToken = getBootstrapToken();
  if (!configuredToken) return false;

  const candidateBuffer = Buffer.from(candidate);
  const configuredBuffer = Buffer.from(configuredToken);
  return candidateBuffer.length === configuredBuffer.length && timingSafeEqual(candidateBuffer, configuredBuffer);
}

function adminQuery() {
  return getFirebaseAdminDb().collection("users").where("role", "==", "admin").limit(1);
}

export async function isAdminBootstrapAvailable() {
  if (!getBootstrapToken()) return false;

  try {
    const db = getFirebaseAdminDb();
    const [admins, lock] = await Promise.all([
      adminQuery().get(),
      db.collection(BOOTSTRAP_LOCK_REF[0]).doc(BOOTSTRAP_LOCK_REF[1]).get(),
    ]);
    return admins.empty && !lock.exists;
  } catch {
    return false;
  }
}

export async function bootstrapAdminAction(
  _previousState: AdminBootstrapState,
  formData: FormData,
): Promise<AdminBootstrapState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const bootstrapToken = String(formData.get("bootstrapToken") ?? "");

  if (!isValidBootstrapToken(bootstrapToken)) {
    return { error: "Initial admin setup is not available or the setup code is incorrect." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }
  if (displayName.length < 2 || displayName.length > 80) {
    return { error: "Display name must be between 2 and 80 characters." };
  }
  if (password.length < 12 || password.length > 128) {
    return { error: "Password must be between 12 and 128 characters." };
  }
  if (password !== confirmation) {
    return { error: "Passwords do not match." };
  }

  const db = getFirebaseAdminDb();
  const lockRef = db.collection(BOOTSTRAP_LOCK_REF[0]).doc(BOOTSTRAP_LOCK_REF[1]);
  let lockHeld = false;
  let createdUid: string | null = null;

  try {
    await db.runTransaction(async (transaction) => {
      const lock = await transaction.get(lockRef);
      const admins = await transaction.get(adminQuery());
      if (lock.exists || !admins.empty) throw new BootstrapUnavailableError();

      transaction.create(lockRef, { status: "in_progress", startedAt: new Date() });
    });
    lockHeld = true;

    const authUser = await getFirebaseAdminAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
    createdUid = authUser.uid;

    const now = new Date();
    const userRef = db.collection("users").doc(authUser.uid);
    await db.runTransaction(async (transaction) => {
      const admins = await transaction.get(adminQuery());
      if (!admins.empty) throw new BootstrapUnavailableError();

      transaction.set(userRef, {
        uid: authUser.uid,
        email,
        phone: "",
        displayName,
        role: "admin",
        roleIntent: "admin",
        verificationStatus: "none",
        preferredCurrency: "LKR",
        preferredLanguage: "en",
        isActive: true,
        isSuspended: false,
        suspendedReason: null,
        suspendedAt: null,
        companyId: null,
        fcmToken: null,
        phoneVerified: false,
        createdAt: now,
        lastActiveAt: now,
        updatedAt: now,
      });
      transaction.set(lockRef, { status: "completed", uid: authUser.uid, completedAt: now }, { merge: true });
    });

    return { success: true, email };
  } catch (error) {
    if (createdUid) {
      await getFirebaseAdminAuth().deleteUser(createdUid).catch(() => undefined);
    }
    if (lockHeld) {
      await lockRef.delete().catch(() => undefined);
    }
    if (error instanceof BootstrapUnavailableError) {
      return { error: "Initial admin setup has already been completed." };
    }
    return { error: "Could not create the initial admin. Check the server configuration and try again." };
  }
}

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { serializeDataRecord } from "@/lib/firebase/server-data";

export const ADMIN_SESSION_COOKIE = "__session";

export type AdminSession = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  profile: ReturnType<typeof serializeDataRecord>;
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    const profileSnapshot = await getFirebaseAdminDb().collection("users").doc(decoded.uid).get();
    if (!profileSnapshot.exists) return null;

    const profile = profileSnapshot.data() ?? {};
    if (profile.role !== "admin" || profile.isSuspended === true) return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      emailVerified: decoded.email_verified === true,
      profile: serializeDataRecord(profile, profileSnapshot.id),
    };
  } catch {
    return null;
  }
});

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

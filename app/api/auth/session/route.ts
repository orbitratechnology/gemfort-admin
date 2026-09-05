import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin-session";

const SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

// export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const idToken =
    body && typeof body === "object" && "idToken" in body && typeof body.idToken === "string"
      ? body.idToken
      : null;
  if (!idToken || idToken.length > 20000) {
    return NextResponse.json({ error: "A valid Firebase ID token is required." }, { status: 400 });
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const profileSnapshot = await getFirebaseAdminDb().collection("users").doc(decoded.uid).get();
    const profile = profileSnapshot.data();
    if (!profileSnapshot.exists || profile?.role !== "admin" || profile.isSuspended === true) {
      return NextResponse.json({ error: "This account is not authorized for the admin console." }, { status: 403 });
    }

    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not create a secure admin session." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

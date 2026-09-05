"use server";

import { revalidatePath } from "next/cache";
import type { DocumentData, WriteBatch } from "firebase-admin/firestore";
import type { GemShowInput, ReviewDecision, UserAction } from "@/lib/firebase/admin-data";
import { getFirebaseAdminBucket, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { requireAdminSession } from "@/lib/auth/admin-session";

function requiredText(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`${label} must be between ${min} and ${max} characters.`);
  }
  return trimmed;
}

function isValidGemShowImageUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return ["firebasestorage.googleapis.com", "storage.googleapis.com", "gemfort.firebasestorage.app"].includes(hostname);
  } catch {
    return false;
  }
}

function storagePathFromUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = "/o/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    const objectMarker = "/storage/v1/b/";
    const objectIndex = url.pathname.indexOf(objectMarker);
    if (objectIndex >= 0) {
      const encodedObject = url.pathname.split("/o/")[1];
      return encodedObject ? decodeURIComponent(encodedObject) : null;
    }
  } catch {
    return null;
  }
  return null;
}

async function deleteGemShowImage(imageUrl: unknown) {
  if (typeof imageUrl !== "string" || !isValidGemShowImageUrl(imageUrl)) return;
  const storagePath = storagePathFromUrl(imageUrl);
  if (!storagePath) return;

  try {
    await getFirebaseAdminBucket().file(storagePath).delete();
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "404") throw error;
  }
}

function addAuditAction(
  batch: WriteBatch,
  adminUid: string,
  actionType: string,
  targetType: string,
  targetId: string,
  reason: string,
  metadata: DocumentData = {},
) {
  const actionRef = getFirebaseAdminDb().collection("admin_actions").doc();
  batch.set(actionRef, {
    adminUid,
    actionType,
    targetType,
    targetId,
    reason,
    metadata,
    createdAt: new Date(),
  });
}

export async function applyUserActionAction(input: {
  userId: string;
  action: UserAction;
  reason: string;
}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid account action payload.");
  const session = await requireAdminSession();
  const userId = requiredText(input.userId, "User ID", 1, 200);
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!["suspend", "ban", "reinstate", "revoke_verification"].includes(input.action)) {
    throw new Error("Unsupported account action.");
  }
  if (["suspend", "ban", "revoke_verification"].includes(input.action) && reason.length < 5) {
    throw new Error("Add a clear reason before applying this action.");
  }
  if (userId === session.uid && input.action !== "revoke_verification") {
    throw new Error("You cannot suspend, ban, or reinstate your own admin account.");
  }

  const db = getFirebaseAdminDb();
  const userRef = db.collection("users").doc(userId);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) throw new Error("This user no longer exists.");

  const batch = db.batch();
  const userPatch =
    input.action === "reinstate"
      ? { isSuspended: false, isActive: true, suspendedReason: null, suspendedAt: null, updatedAt: new Date() }
      : input.action === "revoke_verification"
        ? { verificationStatus: "revoked", updatedAt: new Date() }
        : { isSuspended: true, isActive: false, suspendedReason: reason, suspendedAt: new Date(), updatedAt: new Date() };
  batch.update(userRef, userPatch);

  addAuditAction(
    batch,
    session.uid,
    input.action === "suspend"
      ? "suspend_user"
      : input.action === "ban"
        ? "ban_user"
        : input.action === "reinstate"
          ? "reinstate_user"
          : "revoke_verification",
    "user",
    userId,
    reason || "Account reinstated after admin review.",
  );

  const notificationRef = db.collection("notifications").doc();
  batch.set(notificationRef, {
    recipientUid: userId,
    type: input.action === "reinstate" ? "account_action" : input.action === "revoke_verification" ? "verification_rejected" : "account_suspended",
    title: input.action === "reinstate" ? "Account reinstated" : input.action === "revoke_verification" ? "Verification revoked" : input.action === "ban" ? "Account access restricted" : "Account suspended",
    message: reason || "Your account is active again.",
    referenceType: "user",
    referenceId: userId,
    isRead: false,
    isPushSent: false,
    createdAt: new Date(),
  });

  await batch.commit();
  revalidatePath("/users");
}

export async function reviewVerificationAction(input: {
  applicationId: string;
  decision: ReviewDecision;
  notes: string;
  verificationTier?: "basic" | "full";
}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid verification payload.");
  const session = await requireAdminSession();
  const applicationId = requiredText(input.applicationId, "Application ID", 1, 200);
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (!["under_review", "approved", "info_requested", "rejected"].includes(input.decision)) {
    throw new Error("Unsupported verification decision.");
  }
  if ((input.decision === "info_requested" || input.decision === "rejected") && notes.length < 5) {
    throw new Error("Add a clear note before requesting information or rejecting an application.");
  }

  const db = getFirebaseAdminDb();
  const applicationRef = db.collection("verification_applications").doc(applicationId);
  const applicationSnapshot = await applicationRef.get();
  if (!applicationSnapshot.exists) throw new Error("This verification application no longer exists.");

  const application = applicationSnapshot.data() ?? {};
  const [userSnapshot, businessSnapshot] = await Promise.all([
    typeof application.applicantUid === "string" ? db.collection("users").doc(application.applicantUid).get() : null,
    typeof application.businessId === "string" ? db.collection("businesses").doc(application.businessId).get() : null,
  ]);
  const isFinal = input.decision === "approved" || input.decision === "rejected";
  const status = input.decision === "approved" ? "approved" : input.decision;
  const reason = notes || (input.decision === "approved" ? "Approved after document review." : "Admin review decision.");
  const batch = db.batch();

  batch.update(applicationRef, {
    status,
    adminUid: session.uid,
    adminNotes: notes,
    reviewedAt: new Date(),
    resolvedAt: isFinal ? new Date() : null,
    ...(input.decision === "info_requested" ? { infoRequested: notes } : {}),
    ...(input.decision === "rejected" ? { rejectionReason: notes } : {}),
  });

  if (userSnapshot?.exists) {
    batch.update(userSnapshot.ref, {
      verificationStatus: input.decision === "approved" ? "verified" : input.decision,
      updatedAt: new Date(),
    });
  }

  if (businessSnapshot?.exists) {
    batch.update(businessSnapshot.ref, {
      verificationStatus: input.decision === "approved" ? "verified" : input.decision,
      verificationTier: input.decision === "approved" ? input.verificationTier ?? "full" : "none",
      verifiedAt: input.decision === "approved" ? new Date() : null,
      verifiedByAdminUid: input.decision === "approved" ? session.uid : null,
      updatedAt: new Date(),
    });
  }

  addAuditAction(
    batch,
    session.uid,
    input.decision === "approved" ? "verify_business" : input.decision === "rejected" ? "reject_business" : "verification_info_requested",
    "business",
    typeof application.businessId === "string" ? application.businessId : applicationId,
    reason,
    { applicationId, verificationTier: input.verificationTier ?? null },
  );

  if (typeof application.applicantUid === "string" && input.decision !== "under_review") {
    const notificationRef = db.collection("notifications").doc();
    batch.set(notificationRef, {
      recipientUid: application.applicantUid,
      type: input.decision === "approved" ? "verification_approved" : input.decision === "rejected" ? "verification_rejected" : "verification_info_requested",
      title: input.decision === "approved" ? "Verification approved" : input.decision === "rejected" ? "Verification needs attention" : "More information requested",
      message: reason,
      referenceType: "verification_application",
      referenceId: applicationId,
      isRead: false,
      isPushSent: false,
      createdAt: new Date(),
    });
  }

  await batch.commit();
  revalidatePath("/verification");
  revalidatePath("/users");
}

export async function saveGemShowAction(input: GemShowInput) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid Gem Show payload.");
  const session = await requireAdminSession();
  const title = requiredText(input.title, "Title", 3, 120);
  const description = requiredText(input.description, "Description", 10, 500);
  const externalUrl = typeof input.externalUrl === "string" ? input.externalUrl.trim() : "";
  if (externalUrl && !/^https:\/\//i.test(externalUrl)) throw new Error("Link must start with https://.");
  if (input.imageUrl !== undefined && input.imageUrl !== null && typeof input.imageUrl !== "string") throw new Error("Invalid cover image.");
  const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() || null : null;
  if (imageUrl && !isValidGemShowImageUrl(imageUrl)) throw new Error("Cover image must be stored in the GemFort Firebase bucket.");

  const db = getFirebaseAdminDb();
  if (input.id && !/^[A-Za-z0-9_-]{1,200}$/.test(input.id)) throw new Error("Invalid Gem Show ID.");
  const showRef = input.id ? db.collection("gem_shows").doc(input.id) : db.collection("gem_shows").doc();
  const existingSnapshot = input.id ? await showRef.get() : null;
  const isUpdate = existingSnapshot?.exists === true;

  const batch = db.batch();
  batch.set(
    showRef,
    {
      title,
      description,
      externalUrl: externalUrl || null,
      ...(imageUrl ? { imageUrl } : {}),
      isVisible: input.isVisible === true,
      updatedByAdminUid: session.uid,
      updatedAt: new Date(),
      ...(!isUpdate ? { createdByAdminUid: session.uid, createdAt: new Date() } : {}),
    },
    { merge: true },
  );
  addAuditAction(batch, session.uid, isUpdate ? "update_gem_show" : "create_gem_show", "gem_show", showRef.id, isUpdate ? "Gem Show updated." : "Gem Show created.", { title });
  await batch.commit();
  if (isUpdate && imageUrl && imageUrl !== existingSnapshot?.data()?.imageUrl) {
    await deleteGemShowImage(existingSnapshot?.data()?.imageUrl);
  }
  revalidatePath("/gem-shows");
  revalidatePath("/");
}

export async function deleteGemShowAction(showId: string) {
  const session = await requireAdminSession();
  const id = requiredText(showId, "Gem Show ID", 1, 200);
  const db = getFirebaseAdminDb();
  const showRef = db.collection("gem_shows").doc(id);
  const snapshot = await showRef.get();
  if (!snapshot.exists) throw new Error("This Gem Show no longer exists.");
  const show = snapshot.data() ?? {};
  await deleteGemShowImage(show.imageUrl);

  const batch = db.batch();
  batch.delete(showRef);
  addAuditAction(batch, session.uid, "delete_gem_show", "gem_show", id, "Gem Show deleted.", { title: show.title ?? null });
  await batch.commit();
  revalidatePath("/gem-shows");
  revalidatePath("/");
}

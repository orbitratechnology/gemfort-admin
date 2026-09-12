"use server";

import { revalidatePath } from "next/cache";
import type { DocumentData, WriteBatch } from "firebase-admin/firestore";
import type { GemShowInput, ReviewDecision, UserAction } from "@/lib/firebase/admin-data";
import { badgeFromVerificationTier, isAutomaticBusinessReputationBadge, hasNicDocument, suggestBusinessReputationBadge, type AutomaticBusinessReputationBadge } from "@/lib/business-reputation";
import { getFirebaseAdminAuth, getFirebaseAdminBucket, getFirebaseAdminDb } from "@/lib/firebase/admin";
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

async function enforceFirebaseAuthState(userId: string, action: UserAction) {
  if (action !== "suspend" && action !== "ban" && action !== "reinstate") return;

  try {
    const auth = getFirebaseAdminAuth();
    if (action === "reinstate") {
      await auth.updateUser(userId, { disabled: false });
      return;
    }

    await auth.updateUser(userId, { disabled: true });
    await auth.revokeRefreshTokens(userId);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    console.error("user-auth-enforcement-failed", { userId, action, code });
    throw new Error("Could not enforce this account action in Firebase Authentication.");
  }
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
  if (!["suspend", "ban", "reinstate", "revoke_verification", "grant_recognized_badge", "remove_recognized_badge"].includes(input.action)) {
    throw new Error("Unsupported account action.");
  }
  if (["suspend", "ban", "revoke_verification", "grant_recognized_badge", "remove_recognized_badge"].includes(input.action) && reason.length < 5) {
    throw new Error("Add a clear reason before applying this action.");
  }
  if (userId === session.uid && ["suspend", "ban", "reinstate"].includes(input.action)) {
    throw new Error("You cannot suspend, ban, or reinstate your own admin account.");
  }

  const db = getFirebaseAdminDb();
  const userRef = db.collection("users").doc(userId);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) throw new Error("This user no longer exists.");
  const nicApplicationsSnapshot = input.action === "grant_recognized_badge"
    ? await db.collection("verification_applications").where("applicantUid", "==", userId).limit(20).get()
    : null;
  const userData = userSnapshot.data() ?? {};
  const hasReviewedNic =
    (userData.nicVerified === true && userData.verificationStatus === "verified") ||
    Boolean(nicApplicationsSnapshot?.docs.some((application) => {
      const data = application.data();
      return data.status === "approved" && hasNicDocument(data.documents);
    }));
  if (input.action === "grant_recognized_badge" && !hasReviewedNic) {
    throw new Error("A NIC document must be reviewed before granting the Recognized tier.");
  }
  const managesBusiness = ["revoke_verification", "grant_recognized_badge", "remove_recognized_badge"].includes(input.action);
  const businessQuerySnapshot = managesBusiness
    ? await db.collection("businesses").where("ownerUid", "==", userId).limit(1).get()
    : null;
  const businessSnapshot = businessQuerySnapshot?.docs[0] ?? null;
  const businessData = businessSnapshot?.data() ?? {};
  const businessBadges =
    businessData.badges && typeof businessData.badges === "object" && !Array.isArray(businessData.badges)
      ? (businessData.badges as Record<string, unknown>)
      : {};
  const recognizedBadgeIsAssigned =
    userData.recognizedBadge === true || businessBadges.businessReputation === "recognized";

  // Disable and revoke before persisting a suspension so a failed Firestore
  // write cannot leave the account usable. Reinstatement is intentionally
  // ordered in the opposite direction so access is not restored early.
  if (input.action === "suspend" || input.action === "ban") {
    await enforceFirebaseAuthState(userId, input.action);
  }

  const batch = db.batch();
  const userPatch =
    input.action === "reinstate"
      ? { isSuspended: false, isActive: true, suspendedReason: null, suspendedAt: null, updatedAt: new Date() }
      : input.action === "revoke_verification"
        ? { verificationStatus: "revoked", updatedAt: new Date() }
        : input.action === "grant_recognized_badge" || input.action === "remove_recognized_badge"
          ? {
              recognizedBadge: input.action === "grant_recognized_badge",
              recognizedBadgeAssignedByAdminUid: input.action === "grant_recognized_badge" ? session.uid : null,
              recognizedBadgeAssignedAt: input.action === "grant_recognized_badge" ? new Date() : null,
              updatedAt: new Date(),
            }
        : { isSuspended: true, isActive: false, suspendedReason: reason, suspendedAt: new Date(), updatedAt: new Date() };
  batch.update(userRef, userPatch);

  if (businessSnapshot) {
    const businessPatch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.action === "grant_recognized_badge") {
      businessPatch["badges.businessReputation"] = "recognized";
      businessPatch.recognizedBadgeAssignedByAdminUid = session.uid;
      businessPatch.recognizedBadgeAssignedAt = new Date();
    } else if (input.action === "remove_recognized_badge") {
      businessPatch["badges.businessReputation"] = badgeFromVerificationTier(businessData.verificationTier);
      businessPatch.recognizedBadgeAssignedByAdminUid = null;
      businessPatch.recognizedBadgeAssignedAt = null;
    } else if (input.action === "revoke_verification") {
      businessPatch.verificationStatus = "revoked";
      businessPatch.verificationTier = "member";
      businessPatch.verifiedAt = null;
      businessPatch.verifiedByAdminUid = null;
      businessPatch["badges.isVerified"] = false;
      businessPatch["badges.businessReputation"] = recognizedBadgeIsAssigned ? "recognized" : "member";
    }
    batch.update(businessSnapshot.ref, businessPatch);
  }

  addAuditAction(
    batch,
    session.uid,
    input.action === "suspend"
      ? "suspend_user"
      : input.action === "ban"
        ? "ban_user"
        : input.action === "reinstate"
          ? "reinstate_user"
          : input.action === "revoke_verification"
            ? "revoke_verification"
            : input.action,
    "user",
    userId,
    reason || "Account reinstated after admin review.",
  );

  if (!["grant_recognized_badge", "remove_recognized_badge"].includes(input.action)) {
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
  }

  await batch.commit();

  if (input.action === "reinstate") {
    // If this fails, the profile is already active but Auth remains disabled;
    // the Firestore trigger retries the Auth reconciliation and the user stays
    // fail-closed until it succeeds.
    await enforceFirebaseAuthState(userId, input.action);
  }
  revalidatePath("/users");
}

export async function reviewVerificationAction(input: {
  applicationId: string;
  decision: ReviewDecision;
  notes: string;
  verificationTier?: AutomaticBusinessReputationBadge;
}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid verification payload.");
  const session = await requireAdminSession();
  const applicationId = requiredText(input.applicationId, "Application ID", 1, 200);
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (!["under_review", "approved", "info_requested", "rejected"].includes(input.decision)) {
    throw new Error("Unsupported verification decision.");
  }
  if (notes.length > 1000) throw new Error("Admin notes cannot exceed 1000 characters.");
  if ((input.decision === "info_requested" || input.decision === "rejected") && notes.length < 5) {
    throw new Error("Add a clear note before requesting information or rejecting an application.");
  }
  const requestedVerificationTier = input.verificationTier;
  const assignedVerificationTier = isAutomaticBusinessReputationBadge(requestedVerificationTier)
    ? requestedVerificationTier
    : null;
  if (input.decision === "approved" && assignedVerificationTier === null) {
    throw new Error("Select the verification tier to assign before approving this application.");
  }

  const db = getFirebaseAdminDb();
  const applicationRef = db.collection("verification_applications").doc(applicationId);
  const applicationSnapshot = await applicationRef.get();
  if (!applicationSnapshot.exists) throw new Error("This verification application no longer exists.");

  const application = applicationSnapshot.data() ?? {};
  const currentStatus = typeof application.status === "string" ? application.status : "pending";
  if (!["pending", "under_review", "info_requested"].includes(currentStatus)) {
    throw new Error("This verification application has already been resolved.");
  }
  const applicantUid = typeof application.applicantUid === "string" ? application.applicantUid : null;
  const requestedBusinessId =
    typeof application.businessId === "string" && application.businessId !== "pending" ? application.businessId : null;
  const [userSnapshot, requestedBusinessSnapshot] = await Promise.all([
    applicantUid ? db.collection("users").doc(applicantUid).get() : null,
    requestedBusinessId ? db.collection("businesses").doc(requestedBusinessId).get() : null,
  ]);
  const requestedBusinessIsOwned =
    requestedBusinessSnapshot?.exists === true &&
    requestedBusinessSnapshot.data()?.ownerUid === applicantUid;
  let businessSnapshot = requestedBusinessIsOwned ? requestedBusinessSnapshot : null;
  if (!businessSnapshot && applicantUid) {
    const ownerBusinessSnapshot = await db
      .collection("businesses")
      .where("ownerUid", "==", applicantUid)
      .limit(1)
      .get();
    businessSnapshot = ownerBusinessSnapshot.docs[0] ?? null;
  }
  const isFinal = input.decision === "approved" || input.decision === "rejected";
  const status = input.decision === "approved" ? "approved" : input.decision;
  const reason = notes || (input.decision === "approved" ? "Approved after document review." : "Admin review decision.");
  const businessId = businessSnapshot?.id ?? requestedBusinessId;
  const now = new Date();
  const batch = db.batch();
  const suggestedVerificationTier = suggestBusinessReputationBadge(application.documents);
  if (input.decision === "approved" && !hasNicDocument(application.documents)) {
    throw new Error("A NIC document is required before approving verification.");
  }
  const applicantRecognizedBadge = userSnapshot?.data()?.recognizedBadge === true;
  const existingBusinessBadges = businessSnapshot?.data()?.badges;
  const existingBusinessRecognizedBadge =
    existingBusinessBadges && typeof existingBusinessBadges === "object" && !Array.isArray(existingBusinessBadges)
      ? (existingBusinessBadges as Record<string, unknown>).businessReputation === "recognized"
      : false;
  const publicBadge =
    applicantRecognizedBadge || existingBusinessRecognizedBadge
      ? "recognized"
      : input.decision === "approved"
        ? assignedVerificationTier ?? "member"
        : "member";

  batch.update(applicationRef, {
    status,
    adminUid: session.uid,
    adminNotes: notes,
    verificationTier: input.decision === "approved" ? assignedVerificationTier ?? "member" : "member",
    reviewedAt: now,
    resolvedAt: isFinal ? now : null,
    infoRequested: input.decision === "info_requested" ? notes : null,
    rejectionReason: input.decision === "rejected" ? notes : null,
  });

  if (userSnapshot?.exists) {
    batch.update(userSnapshot.ref, {
      verificationStatus: input.decision === "approved" ? "verified" : input.decision,
      ...(input.decision === "approved" ? { nicVerified: true } : {}),
      updatedAt: now,
    });
  }

  if (businessSnapshot?.exists) {
    batch.update(businessSnapshot.ref, {
      verificationStatus: input.decision === "approved" ? "verified" : input.decision,
      verificationTier: input.decision === "approved" ? assignedVerificationTier ?? "member" : "member",
      verifiedAt: input.decision === "approved" ? now : null,
      verifiedByAdminUid: input.decision === "approved" ? session.uid : null,
      "badges.isVerified": input.decision === "approved",
      "badges.businessReputation": publicBadge,
      updatedAt: now,
    });
  }

  addAuditAction(
    batch,
    session.uid,
    input.decision === "approved" ? "verify_business" : input.decision === "rejected" ? "reject_business" : "verification_info_requested",
    businessId ? "business" : "verification_application",
    businessId ?? applicationId,
    reason,
    {
      applicationId,
      businessId: businessId ?? null,
      businessReputation: publicBadge,
      suggestedVerificationTier,
      verificationTier: input.decision === "approved" ? assignedVerificationTier ?? "member" : "member",
    },
  );

  // The mobile app's onVerificationStatusChanged trigger creates the applicant notification once the status changes.
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

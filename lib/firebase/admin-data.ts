import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type { DocumentData, QueryConstraint } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { User } from "firebase/auth";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";

export type DataRecord = DocumentData & { id: string };

export type OverviewData = {
  users: number | null;
  businesses: number | null;
  pendingVerifications: number | null;
  activeListings: number | null;
  activeReports: number | null;
  gemShows: number | null;
  activity: DataRecord[];
};

export type GemShowInput = {
  id?: string;
  title: string;
  description: string;
  externalUrl: string;
  isVisible: boolean;
  imageUrl?: string | null;
};

export type ReviewDecision = "under_review" | "approved" | "info_requested" | "rejected";

export type UserAction = "suspend" | "ban" | "reinstate" | "revoke_verification";

function recordsFromSnapshot(snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function countCollection(collectionName: string, constraints: QueryConstraint[] = []) {
  try {
    const snapshot = await getCountFromServer(
      query(collection(getFirebaseDb(), collectionName), ...constraints),
    );
    return snapshot.data().count;
  } catch {
    return null;
  }
}

async function readCollection(collectionName: string, orderField: string, direction: "asc" | "desc" = "desc") {
  const source = collection(getFirebaseDb(), collectionName);
  try {
    return recordsFromSnapshot(await getDocs(query(source, orderBy(orderField, direction), limit(100))));
  } catch {
    return recordsFromSnapshot(await getDocs(query(source, limit(100))));
  }
}

export async function readOverview(): Promise<OverviewData> {
  const [users, businesses, pendingVerifications, activeListings, activeReports, gemShows, activity] =
    await Promise.all([
      countCollection("users"),
      countCollection("businesses", [where("isActive", "==", true)]),
      countCollection("verification_applications", [where("status", "in", ["pending", "under_review", "info_requested"])]),
      countCollection("gems", [where("status", "==", "active")]),
      countCollection("reports", [where("status", "in", ["pending", "investigating"])]),
      countCollection("gem_shows", [where("isVisible", "==", true)]),
      readCollection("admin_actions", "createdAt").catch(() => []),
    ]);

  return { users, businesses, pendingVerifications, activeListings, activeReports, gemShows, activity: activity.slice(0, 8) };
}

export async function readUsers() {
  return readCollection("users", "createdAt");
}

export async function readVerifications() {
  return readCollection("verification_applications", "submittedAt", "asc");
}

export async function readGemShows() {
  return readCollection("gem_shows", "updatedAt");
}

export async function reviewVerification(
  applicationId: string,
  decision: ReviewDecision,
  admin: User,
  notes: string,
  verificationTier?: "basic" | "full",
) {
  const db = getFirebaseDb();
  const applicationRef = doc(db, "verification_applications", applicationId);
  const applicationSnapshot = await getDoc(applicationRef);
  if (!applicationSnapshot.exists()) throw new Error("This verification application no longer exists.");

  const application = applicationSnapshot.data();
  const batch = writeBatch(db);
  const isFinal = decision === "approved" || decision === "rejected";
  const userStatus = decision === "approved" ? "verified" : decision;
  const status = decision === "approved" ? "approved" : decision;
  const reason = notes.trim() || (decision === "approved" ? "Approved after document review." : "Admin review decision.");

  batch.update(applicationRef, {
    status,
    adminUid: admin.uid,
    adminNotes: notes.trim(),
    reviewedAt: serverTimestamp(),
    resolvedAt: isFinal ? serverTimestamp() : null,
    ...(decision === "info_requested" ? { infoRequested: notes.trim() } : {}),
    ...(decision === "rejected" ? { rejectionReason: notes.trim() } : {}),
  });

  if (application.applicantUid) {
    const userRef = doc(db, "users", application.applicantUid);
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      batch.update(userRef, { verificationStatus: userStatus, updatedAt: serverTimestamp() });
    }
  }

  if (application.businessId) {
    const businessRef = doc(db, "businesses", application.businessId);
    const businessSnapshot = await getDoc(businessRef);
    if (businessSnapshot.exists()) {
      batch.update(businessRef, {
        verificationStatus: decision === "approved" ? "verified" : decision,
        verificationTier: decision === "approved" ? verificationTier ?? "full" : "none",
        verifiedAt: decision === "approved" ? serverTimestamp() : null,
        verifiedByAdminUid: decision === "approved" ? admin.uid : null,
        updatedAt: serverTimestamp(),
      });
    }
  }

  const actionRef = doc(collection(db, "admin_actions"));
  batch.set(actionRef, {
    adminUid: admin.uid,
    actionType: decision === "approved" ? "verify_business" : decision === "rejected" ? "reject_business" : "verification_info_requested",
    targetType: "business",
    targetId: application.businessId ?? applicationId,
    reason,
    metadata: { applicationId, verificationTier: verificationTier ?? null },
    createdAt: serverTimestamp(),
  });

  if (application.applicantUid && decision !== "under_review") {
    const notificationRef = doc(collection(db, "notifications"));
    batch.set(notificationRef, {
      recipientUid: application.applicantUid,
      type: decision === "approved" ? "verification_approved" : decision === "rejected" ? "verification_rejected" : "verification_info_requested",
      title: decision === "approved" ? "Verification approved" : decision === "rejected" ? "Verification needs attention" : "More information requested",
      message: reason,
      referenceType: "verification_application",
      referenceId: applicationId,
      isRead: false,
      isPushSent: false,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function applyUserAction(userId: string, action: UserAction, reason: string, admin: User) {
  const trimmedReason = reason.trim();
  if (["suspend", "ban", "revoke_verification"].includes(action) && trimmedReason.length < 5) {
    throw new Error("Add a clear reason before applying this action.");
  }

  const db = getFirebaseDb();
  const userRef = doc(db, "users", userId);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) throw new Error("This user no longer exists.");

  const batch = writeBatch(db);
  const userPatch =
    action === "reinstate"
      ? { isSuspended: false, isActive: true, suspendedReason: null, suspendedAt: null, updatedAt: serverTimestamp() }
      : action === "revoke_verification"
        ? { verificationStatus: "revoked", updatedAt: serverTimestamp() }
        : { isSuspended: true, isActive: false, suspendedReason: trimmedReason, suspendedAt: serverTimestamp(), updatedAt: serverTimestamp() };
  batch.update(userRef, userPatch);

  const actionRef = doc(collection(db, "admin_actions"));
  batch.set(actionRef, {
    adminUid: admin.uid,
    actionType: action === "suspend" ? "suspend_user" : action === "ban" ? "ban_user" : action === "reinstate" ? "reinstate_user" : "revoke_verification",
    targetType: "user",
    targetId: userId,
    reason: trimmedReason || "Account reinstated after admin review.",
    metadata: {},
    createdAt: serverTimestamp(),
  });

  const notificationRef = doc(collection(db, "notifications"));
  batch.set(notificationRef, {
    recipientUid: userId,
    type: action === "reinstate" ? "account_action" : action === "revoke_verification" ? "verification_rejected" : "account_suspended",
    title: action === "reinstate" ? "Account reinstated" : action === "revoke_verification" ? "Verification revoked" : action === "ban" ? "Account access restricted" : "Account suspended",
    message: trimmedReason || "Your account is active again.",
    referenceType: "user",
    referenceId: userId,
    isRead: false,
    isPushSent: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function saveGemShow(input: GemShowInput, admin: User, file?: File) {
  const title = input.title.trim();
  const description = input.description.trim();
  const externalUrl = input.externalUrl.trim();
  if (title.length < 3 || title.length > 120) throw new Error("Title must be between 3 and 120 characters.");
  if (description.length < 10 || description.length > 500) throw new Error("Description must be between 10 and 500 characters.");
  if (externalUrl && !/^https:\/\//i.test(externalUrl)) throw new Error("Link must start with https://.");
  if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
    throw new Error("Choose a JPG, PNG, or WebP image up to 10 MB.");
  }

  const db = getFirebaseDb();
  const showRef = input.id ? doc(db, "gem_shows", input.id) : doc(collection(db, "gem_shows"));
  let imageUrl = input.imageUrl ?? null;

  if (file) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
    const imageRef = ref(getFirebaseStorage(), `gem_shows/${showRef.id}/${Date.now()}-${safeName || "show-image"}`);
    const upload = await uploadBytes(imageRef, file, { contentType: file.type });
    imageUrl = await getDownloadURL(upload.ref);
  }

  const batch = writeBatch(db);
  batch.set(
    showRef,
    {
      title,
      description,
      externalUrl: externalUrl || null,
      imageUrl,
      isVisible: input.isVisible,
      updatedByAdminUid: admin.uid,
      updatedAt: serverTimestamp(),
      ...(input.id ? {} : { createdByAdminUid: admin.uid, createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  const actionRef = doc(collection(db, "admin_actions"));
  batch.set(actionRef, {
    adminUid: admin.uid,
    actionType: input.id ? "update_gem_show" : "create_gem_show",
    targetType: "gem_show",
    targetId: showRef.id,
    reason: input.id ? "Gem Show updated." : "Gem Show created.",
    metadata: { title },
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

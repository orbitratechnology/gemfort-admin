import "server-only";

import type { Query } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import type { DataRecord, OverviewData } from "@/lib/firebase/admin-data";

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);

  if (value && typeof value === "object") {
    if ("toDate" in value && typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date ? date.toISOString() : null;
    }
    if (Array.isArray(value)) return value.map(serializeValue);

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)]),
    );
  }

  return value;
}

function recordFromSnapshot(snapshot: { id: string; data: () => Record<string, unknown> }): DataRecord {
  return { id: snapshot.id, ...serializeValue(snapshot.data()) as Record<string, unknown> };
}

async function countCollection(
  collectionName: string,
  constrain?: (query: Query) => Query,
) {
  try {
    let query = getFirebaseAdminDb().collection(collectionName) as Query;
    if (constrain) query = constrain(query);
    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch {
    return null;
  }
}

async function readCollection(
  collectionName: string,
  orderField: string,
  direction: "asc" | "desc" = "desc",
) {
  const collection = getFirebaseAdminDb().collection(collectionName);
  try {
    const snapshot = await collection.orderBy(orderField, direction).limit(100).get();
    return snapshot.docs.map(recordFromSnapshot);
  } catch {
    const snapshot = await collection.limit(100).get();
    return snapshot.docs.map(recordFromSnapshot);
  }
}

export async function readOverview(): Promise<OverviewData> {
  const [users, businesses, pendingVerifications, activeListings, activeReports, gemShows, activity] =
    await Promise.all([
      countCollection("users"),
      countCollection("businesses", (query) => query.where("isActive", "==", true)),
      countCollection("verification_applications", (query) =>
        query.where("status", "in", ["pending", "under_review", "info_requested"]),
      ),
      countCollection("gems", (query) => query.where("status", "==", "active")),
      countCollection("reports", (query) => query.where("status", "in", ["pending", "investigating"])),
      countCollection("gem_shows", (query) => query.where("isVisible", "==", true)),
      readCollection("admin_actions", "createdAt").catch(() => []),
    ]);

  return {
    users,
    businesses,
    pendingVerifications,
    activeListings,
    activeReports,
    gemShows,
    activity: activity.slice(0, 8),
  };
}

export function readUsers() {
  return readCollection("users", "createdAt");
}

export function readVerifications() {
  return readCollection("verification_applications", "submittedAt", "asc");
}

export function readReports() {
  return readCollection("reports", "createdAt");
}

export function readGemShows() {
  return readCollection("gem_shows", "updatedAt");
}

export function serializeDataRecord(value: Record<string, unknown>, id: string): DataRecord {
  return { id, ...serializeValue(value) as Record<string, unknown> };
}

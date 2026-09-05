import type { DataRecord } from "@/lib/firebase/admin-data";

export function valueOf(record: DataRecord, key: string, fallback = "—") {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

export function formatDate(value: unknown, withTime = false) {
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function initials(value: string) {
  return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GF";
}

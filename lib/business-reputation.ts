export type BusinessReputationBadge = "none" | "member" | "identity" | "business" | "gem" | "recognized";
export type AutomaticBusinessReputationBadge = Exclude<BusinessReputationBadge, "none" | "recognized">;

export const BUSINESS_REPUTATION_BADGE_LABELS: Record<Exclude<BusinessReputationBadge, "none">, string> = {
  member: "Member",
  identity: "Identity Verified",
  business: "Business Verified",
  gem: "Gem Verified",
  recognized: "Recognized",
};

function recordValue(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

export function hasNicDocument(documents: unknown) {
  return recordValue(documents, "nicPhotoUrl") !== null;
}

function hasDocumentPair(documents: unknown, numberKey: string, photoKey: string) {
  return recordValue(documents, numberKey) !== null && recordValue(documents, photoKey) !== null;
}

export function isAutomaticBusinessReputationBadge(value: unknown): value is AutomaticBusinessReputationBadge {
  return value === "member" || value === "identity" || value === "business" || value === "gem";
}

export function suggestBusinessReputationBadge(documents: unknown): AutomaticBusinessReputationBadge {
  if (!hasNicDocument(documents)) return "member";

  const hasTin = recordValue(documents, "tinNumber") !== null;
  const hasBr = hasDocumentPair(documents, "brNumber", "brPhotoUrl");
  const hasGemLicense = hasDocumentPair(documents, "gemLicenseNumber", "gemLicensePhotoUrl");

  if (hasTin && hasBr && hasGemLicense) return "gem";
  if (hasTin && hasBr) return "business";
  return "identity";
}

export function badgeFromVerificationTier(value: unknown): AutomaticBusinessReputationBadge {
  if (value === "gem" || value === "full" || value === "ultra") return "gem";
  if (value === "business" || value === "pro") return "business";
  if (value === "identity" || value === "basic") return "identity";
  return "member";
}

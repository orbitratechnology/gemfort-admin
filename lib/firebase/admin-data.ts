export type DataRecord = Record<string, unknown> & { id: string };

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

export type UserAction =
  | "suspend"
  | "ban"
  | "reinstate"
  | "revoke_verification"
  | "grant_recognized_badge"
  | "remove_recognized_badge";

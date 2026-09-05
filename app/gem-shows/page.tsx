import type { Metadata } from "next";
import { AdminPortalShell } from "@/components/admin-portal-shell";

export const metadata: Metadata = { title: "Gem Shows" };

export default function GemShowsPage() {
  return <AdminPortalShell section="gem-shows" />;
}

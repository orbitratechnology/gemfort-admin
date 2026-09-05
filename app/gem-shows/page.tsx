import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin-portal";

export const metadata: Metadata = { title: "Gem Shows" };

export default function GemShowsPage() {
  return <AdminPortal section="gem-shows" />;
}

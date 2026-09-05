import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin-portal";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <AdminPortal section="settings" />;
}

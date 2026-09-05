import type { Metadata } from "next";
import { AdminPortalShell } from "@/components/admin-portal-shell";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <AdminPortalShell section="settings" />;
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { PortalLoading } from "@/components/portal-loading";
import { SettingsPage } from "@/components/settings-page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsRoute() {
  return <Suspense fallback={<PortalLoading />}><SettingsContent /></Suspense>;
}

async function SettingsContent() {
  const session = await requireAdminSession();
  return <SettingsPage session={session} />;
}

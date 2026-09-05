import type { Metadata } from "next";
import { AdminPortalShell } from "@/components/admin-portal-shell";

export const metadata: Metadata = { title: "Verification queue" };

export default function VerificationPage() {
  return <AdminPortalShell section="verification" />;
}

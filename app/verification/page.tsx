import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin-portal";

export const metadata: Metadata = { title: "Verification queue" };

export default function VerificationPage() {
  return <AdminPortal section="verification" />;
}

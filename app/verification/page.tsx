import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { readVerifications } from "@/lib/firebase/server-data";
import { PortalLoading } from "@/components/portal-loading";
import { VerificationPage } from "@/components/verification-page";

export const metadata: Metadata = { title: "Verification queue" };

export default function VerificationRoute({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <Suspense fallback={<PortalLoading />}><VerificationContent searchParams={searchParams} /></Suspense>;
}

async function VerificationContent({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminSession();
  const [applications, params] = await Promise.all([readVerifications(), searchParams]);
  return <VerificationPage applications={applications} status={params.status ?? "all"} />;
}

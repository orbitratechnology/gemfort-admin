import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { readReports } from "@/lib/firebase/server-data";
import { PortalLoading } from "@/components/portal-loading";
import { ReportsPage } from "@/components/reports-page";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsRoute({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  return <Suspense fallback={<PortalLoading />}><ReportsContent searchParams={searchParams} /></Suspense>;
}

async function ReportsContent({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  await requireAdminSession();
  const [reports, params] = await Promise.all([readReports(), searchParams]);
  return <ReportsPage reports={reports} status={params.status ?? "all"} type={params.type ?? "all"} />;
}

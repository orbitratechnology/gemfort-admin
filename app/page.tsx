import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { readOverview } from "@/lib/firebase/server-data";
import { OverviewPage } from "@/components/overview-page";
import { PortalLoading } from "@/components/portal-loading";

export default function Home() {
  return <Suspense fallback={<PortalLoading />}><OverviewContent /></Suspense>;
}

async function OverviewContent() {
  await requireAdminSession();
  const data = await readOverview();
  return <OverviewPage data={data} />;
}

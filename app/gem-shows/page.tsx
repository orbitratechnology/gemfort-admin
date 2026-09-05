import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { readGemShows } from "@/lib/firebase/server-data";
import { PortalLoading } from "@/components/portal-loading";
import { GemShowsPage } from "@/components/gem-shows-page";

export const metadata: Metadata = { title: "Gem Shows" };

export default function GemShowsRoute() {
  return <Suspense fallback={<PortalLoading />}><GemShowsContent /></Suspense>;
}

async function GemShowsContent() {
  await requireAdminSession();
  const shows = await readGemShows();
  return <GemShowsPage shows={shows} />;
}

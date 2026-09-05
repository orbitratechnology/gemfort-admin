import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { readUsers } from "@/lib/firebase/server-data";
import { PortalLoading } from "@/components/portal-loading";
import { UsersPage } from "@/components/users-page";

export const metadata: Metadata = { title: "Users" };

export default function UsersRoute({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  return <Suspense fallback={<PortalLoading />}><UsersContent searchParams={searchParams} /></Suspense>;
}

async function UsersContent({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const session = await requireAdminSession();
  const [users, params] = await Promise.all([readUsers(), searchParams]);
  return <UsersPage users={users} query={params.q ?? ""} role={params.role ?? "all"} adminUid={session.uid} />;
}

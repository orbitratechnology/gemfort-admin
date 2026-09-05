import type { Metadata } from "next";
import { AdminPortalShell } from "@/components/admin-portal-shell";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return <AdminPortalShell section="users" />;
}

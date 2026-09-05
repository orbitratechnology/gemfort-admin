import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin-portal";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return <AdminPortal section="users" />;
}

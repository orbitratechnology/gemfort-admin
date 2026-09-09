import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AdminBootstrapForm } from "@/components/admin-bootstrap-form";
import { isAdminBootstrapAvailable } from "@/lib/auth/admin-bootstrap";

export default async function SetupPage() {
  await connection();
  if (!(await isAdminBootstrapAvailable())) notFound();

  return (
    <main className="flex min-h-[calc(100svh-9rem)] items-center justify-center bg-background p-4 sm:p-10">
      <AdminBootstrapForm />
    </main>
  );
}

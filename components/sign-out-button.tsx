"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await Promise.allSettled([
        signOut(getFirebaseAuth()),
        fetch("/api/auth/session", { method: "DELETE" }),
      ]);
      router.replace("/login");
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={handleSignOut} disabled={isPending}>
      <LogOut data-icon="inline-start" />
      <span>Sign out</span>
    </Button>
  );
}

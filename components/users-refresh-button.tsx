"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function UsersRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return <Button type="button" variant="outline" size="sm" onClick={() => startTransition(() => router.refresh())} disabled={isPending}>{isPending ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}Refresh</Button>;
}

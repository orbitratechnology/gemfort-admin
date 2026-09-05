"use client";

import { BadgeCheck, Ban, MoreHorizontal, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyUserActionAction } from "@/app/actions/admin-actions";
import type { UserAction } from "@/lib/firebase/admin-data";
import { displayError } from "@/lib/display-error";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserActionDialog } from "@/components/user-action-dialog";

export function UserActionsMenu({ userId, name, isSuspended, verificationStatus, isSelf }: { userId: string; name: string; isSuspended: boolean; verificationStatus: string; isSelf: boolean }) {
  const router = useRouter();
  const [action, setAction] = useState<UserAction | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(reason: string) {
    if (!action) return;
    setError("");
    startTransition(async () => {
      try {
        await applyUserActionAction({ userId, action, reason });
        setAction(null);
        router.refresh();
      } catch (actionError) {
        setError(displayError(actionError));
      }
    });
  }

  function selectAction(nextAction: UserAction) {
    setError("");
    setAction(nextAction);
  }

  return <><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`} />}><MoreHorizontal aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuLabel>Account actions</DropdownMenuLabel></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>{isSuspended ? <DropdownMenuItem onClick={() => selectAction("reinstate")}><ShieldCheck />Reinstate account</DropdownMenuItem> : <DropdownMenuItem onClick={() => selectAction("suspend")} disabled={isSelf}><ShieldAlert />Suspend account</DropdownMenuItem>}<DropdownMenuItem onClick={() => selectAction("revoke_verification")} disabled={verificationStatus !== "verified"}><BadgeCheck />Revoke verification</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => selectAction("ban")} disabled={isSelf}><Ban />Ban account</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu><UserActionDialog key={action ?? "closed"} action={action} name={name} open={Boolean(action)} busy={isPending} error={error} onClose={() => setAction(null)} onSubmit={submit} /></>;
}

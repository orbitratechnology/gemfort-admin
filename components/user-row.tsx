import { UserActionsMenu } from "@/components/user-actions-menu";
import { StatusBadge } from "@/components/admin-primitives";
import { Badge } from "@/components/ui/badge";
import { formatDate, initials, valueOf } from "@/lib/admin-display";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { TableCell, TableRow } from "@/components/ui/table";

export function UserRow({ user, adminUid }: { user: DataRecord; adminUid: string }) {
  const name = valueOf(user, "displayName", "Unnamed account");
  const userId = valueOf(user, "uid", user.id);
  const verificationStatus = valueOf(user, "verificationStatus", "none");
  const hasRecognizedBadge = user.recognizedBadge === true;
  return <TableRow><TableCell><div className="flex min-w-[220px] items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-hidden="true">{initials(name)}</div><div className="min-w-0"><p className="truncate font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{valueOf(user, "email")}</p></div></div></TableCell><TableCell className="hidden capitalize md:table-cell">{valueOf(user, "role")}</TableCell><TableCell><div className="flex flex-wrap items-center gap-2"><StatusBadge status={user.isSuspended === true ? "suspended" : verificationStatus} />{hasRecognizedBadge ? <Badge variant="outline">Recognized</Badge> : null}</div></TableCell><TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(user.createdAt)}</TableCell><TableCell><UserActionsMenu userId={userId} name={name} isSuspended={user.isSuspended === true} verificationStatus={verificationStatus} hasRecognizedBadge={hasRecognizedBadge} isSelf={userId === adminUid} /></TableCell></TableRow>;
}

export function MobileUserCard({ user, adminUid }: { user: DataRecord; adminUid: string }) {
  const name = valueOf(user, "displayName", "Unnamed account");
  const userId = valueOf(user, "uid", user.id);
  const verificationStatus = valueOf(user, "verificationStatus", "none");
  const isSuspended = user.isSuspended === true;
  const hasRecognizedBadge = user.recognizedBadge === true;

  return (
    <article className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-hidden="true">{initials(name)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="break-all text-xs text-muted-foreground">{valueOf(user, "email")}</p>
          </div>
          <UserActionsMenu userId={userId} name={name} isSuspended={isSuspended} verificationStatus={verificationStatus} hasRecognizedBadge={hasRecognizedBadge} isSelf={userId === adminUid} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={isSuspended ? "suspended" : verificationStatus} />
          {hasRecognizedBadge ? <Badge variant="outline">Recognized</Badge> : null}
          <span className="text-xs capitalize text-muted-foreground">{valueOf(user, "role")}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Joined {formatDate(user.createdAt)}</p>
      </div>
    </article>
  );
}

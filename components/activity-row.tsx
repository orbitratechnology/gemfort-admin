import { Activity } from "lucide-react";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { formatDate, valueOf } from "@/lib/admin-display";

export function ActivityRow({ item }: { item: DataRecord }) {
  const action = valueOf(item, "actionType", "admin action").replaceAll("_", " ");
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/60">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Activity aria-hidden="true" /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium capitalize">{action}</p><p className="truncate text-xs text-muted-foreground">{valueOf(item, "targetType", "record")} · {valueOf(item, "targetId", "record")}</p></div>
      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.createdAt, true)}</span>
    </div>
  );
}

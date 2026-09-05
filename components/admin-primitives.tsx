import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: unknown }) {
  const normalized = String(status ?? "none");
  const className =
    normalized === "verified" || normalized === "approved" || normalized === "active"
      ? "bg-primary text-primary-foreground"
      : normalized === "pending" || normalized === "under_review" || normalized === "info_requested"
        ? "bg-muted text-muted-foreground"
        : normalized === "rejected" || normalized === "revoked" || normalized === "suspended"
          ? "bg-destructive text-destructive-foreground"
          : "bg-secondary text-secondary-foreground";

  return <Badge className={cn(className)}>{normalized.replaceAll("_", " ")}</Badge>;
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"><Icon aria-hidden="true" /></div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function DetailTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium">{value}</p></div>;
}

export function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: number | null | undefined; detail: string; icon: LucideIcon }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><Icon aria-hidden="true" /></div>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <CardTitle className="text-3xl font-semibold tabular-nums">{value == null ? "—" : value.toLocaleString()}</CardTitle>
        <span className="mb-1 text-right text-xs text-muted-foreground">{detail}</span>
      </CardContent>
    </Card>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return <Alert variant="destructive"><AlertTitle>Could not load this workspace</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>;
}

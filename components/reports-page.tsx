import Link from "next/link";
import { ExternalLink, Flag } from "lucide-react";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { formatDate, valueOf } from "@/lib/admin-display";
import { AdminPage, PageIntro } from "@/components/admin-page";
import { DetailTile, EmptyState, StatusBadge } from "@/components/admin-primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statusFilters = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "investigating", label: "Investigating" },
  { id: "resolved", label: "Resolved" },
  { id: "dismissed", label: "Dismissed" },
] as const;

const reportTypes = [
  { id: "all", label: "All reasons" },
  { id: "fake_business", label: "Fake business" },
  { id: "scammer", label: "Scammer" },
  { id: "wrong_information", label: "Wrong info" },
  { id: "fake_gems", label: "Fake gems" },
  { id: "harassment", label: "Harassment" },
  { id: "other", label: "Other" },
] as const;

export function ReportsPage({ reports, status, type }: { reports: DataRecord[]; status: string; type: string }) {
  const visibleReports = reports.filter((report) => {
    return (status === "all" || report.status === status) && (type === "all" || report.reportType === type);
  });

  return (
    <AdminPage>
      <PageIntro eyebrow="Trust & safety" title="Reports" description="Review concerns submitted by members about businesses and their listings." />
      <Card>
        <CardHeader className="gap-4 border-b">
          <div>
            <CardTitle>Report inbox</CardTitle>
            <CardDescription>{visibleReports.length.toLocaleString()} of {reports.length.toLocaleString()} reports shown · newest first</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" aria-label="Filter reports by status">
              {statusFilters.map((item) => (
                <Link key={item.id} className={filterClassName(status === item.id)} href={filterHref(item.id, type)}>
                  {item.label}{item.id === "all" ? ` ${reports.length}` : ` ${reports.filter((report) => report.status === item.id).length}`}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Filter reports by reason">
              {reportTypes.map((item) => (
                <Link key={item.id} className={filterClassName(type === item.id)} href={filterHref(status, item.id)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {visibleReports.length ? visibleReports.map((report) => <ReportCard key={report.id} report={report} />) : <EmptyState icon={Flag} title="No reports found" description="Submitted reports will appear here when members flag a concern." />}
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function ReportCard({ report }: { report: DataRecord }) {
  const evidenceUrls = getEvidenceUrls(report.evidenceUrls);
  const adminNotes = valueOf(report, "adminNotes");
  const resolution = valueOf(report, "resolution");
  const actionTaken = valueOf(report, "actionTaken");
  const hasReviewDetails = [adminNotes, resolution, actionTaken].some((value) => value !== "—" && value.length > 0);

  return (
    <article className="rounded-3xl border border-border/70 bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Flag className="size-4 text-primary" aria-hidden="true" />
            <h3 className="font-medium">{reportTypeLabel(report.reportType)}</h3>
            <StatusBadge status={report.status} />
          </div>
          <p className="mt-1 break-all text-xs text-muted-foreground">Received {formatDate(report.createdAt, true)} · Report ID {report.id}</p>
        </div>
        <p className="text-xs text-muted-foreground">Updated {formatDate(report.updatedAt, true)}</p>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{valueOf(report, "description", "No description provided.")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <DetailTile label="Business ID" value={valueOf(report, "reportedBusinessId")} />
        <DetailTile label="Reporter ID" value={valueOf(report, "reporterUid")} />
        <DetailTile label="Reported user ID" value={valueOf(report, "reportedUserUid")} />
      </div>
      {evidenceUrls.length ? <div className="mt-4 flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Evidence:</span>{evidenceUrls.map((url, index) => <a key={`${url}-${index}`} className="inline-flex items-center gap-1 text-primary hover:underline" href={url} target="_blank" rel="noreferrer">Open {index + 1}<ExternalLink aria-hidden="true" /></a>)}</div> : null}
      {hasReviewDetails ? <div className="mt-4 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-3"><ReviewDetail label="Admin notes" value={adminNotes} /><ReviewDetail label="Resolution" value={resolution} /><ReviewDetail label="Action taken" value={actionTaken} /></div> : null}
    </article>
  );
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return value === "—" || !value ? null : <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</p></div>;
}

function getEvidenceUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && isHttpUrl(item));
}

function isHttpUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function reportTypeLabel(value: unknown) {
  const normalized = typeof value === "string" ? value : "";
  return reportTypes.find((item) => item.id === normalized)?.label ?? (normalized ? normalized.replaceAll("_", " ") : "Other");
}

function filterClassName(active: boolean) {
  return `inline-flex h-8 items-center justify-center rounded-4xl px-3 text-sm font-medium transition-colors ${active ? "bg-secondary text-secondary-foreground" : "hover:bg-muted hover:text-foreground"}`;
}

function filterHref(status: string, type: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/reports?${query}` : "/reports";
}

import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { AdminPage, PageIntro } from "@/components/admin-page";
import { EmptyState } from "@/components/admin-primitives";
import { VerificationReviewPanel } from "@/components/verification-review-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const filters = ["all", "pending", "under_review", "info_requested", "approved", "rejected"] as const;

export function VerificationPage({ applications, status }: { applications: DataRecord[]; status: string }) {
  const visibleApplications = applications.filter((application) => status === "all" || application.status === status);
  return <AdminPage><PageIntro eyebrow="Trust & safety" title="Verification queue" description="Work the oldest applications first and keep every decision traceable." /><Card><CardHeader className="gap-4 border-b"><div><CardTitle>Review queue</CardTitle><CardDescription>Oldest submissions first · document review is manual by design.</CardDescription></div></CardHeader><CardContent className="flex flex-col gap-5 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{filters.map((item) => <Link key={item} className={cn("inline-flex h-8 items-center justify-center rounded-4xl px-3 text-sm font-medium capitalize transition-colors", status === item ? "bg-secondary text-secondary-foreground" : "hover:bg-muted hover:text-foreground")} href={item === "all" ? "/verification" : `/verification?status=${item}`}>{item === "all" ? `All ${applications.length}` : item.replaceAll("_", " ")}</Link>)}</div><p className="text-xs text-muted-foreground">{visibleApplications.length} applications</p></div><div className="flex flex-col gap-2">{visibleApplications.length ? visibleApplications.map((application) => <VerificationReviewPanel key={application.id} application={application} />) : <EmptyState icon={FileCheck2} title="Queue is clear" description="New verification applications will appear here when members submit their documents." />}</div></CardContent></Card></AdminPage>;
}

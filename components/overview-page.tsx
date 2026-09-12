import { Activity, BriefcaseBusiness, ChevronRight, ClipboardCheck, Gem, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import type { OverviewData } from "@/lib/firebase/admin-data";
import { AdminPage, PageIntro } from "@/components/admin-page";
import { ActivityRow } from "@/components/activity-row";
import { EmptyState, MetricCard } from "@/components/admin-primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function OverviewPage({ data }: { data: OverviewData }) {
  return (
    <AdminPage>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><PageIntro eyebrow="Platform pulse" title="What needs your attention?" description="A server-rendered view of the people, trust signals, and content shaping GemFort today." /><Link href="/" className="inline-flex h-10 w-full items-center justify-center rounded-4xl border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted sm:w-auto">Refresh data</Link></div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <MetricCard label="Registered users" value={data.users} detail="all accounts" icon={UsersRound} />
        <MetricCard label="Active businesses" value={data.businesses} detail="directory ready" icon={BriefcaseBusiness} />
        <MetricCard label="Pending verification" value={data.pendingVerifications} detail="queue to review" icon={ClipboardCheck} />
        <MetricCard label="Active gem listings" value={data.activeListings} detail="visible inventory" icon={Gem} />
        <MetricCard label="Open reports" value={data.activeReports} detail="trust & safety" icon={ShieldAlert} />
        <MetricCard label="Visible Gem Shows" value={data.gemShows} detail="published stories" icon={Activity} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card>
          <CardHeader><CardTitle>Recent admin activity</CardTitle><CardDescription>Immutable actions written to the shared audit log.</CardDescription><CardAction><Badge variant="outline">Audit trail</Badge></CardAction></CardHeader>
          <CardContent>{data.activity.length ? <div className="flex flex-col gap-1">{data.activity.map((item) => <ActivityRow key={item.id} item={item} />)}</div> : <EmptyState icon={Activity} title="No admin activity yet" description="Actions taken from this console will appear here." />}</CardContent>
          <CardFooter className="border-t"><p className="text-xs text-muted-foreground">Audit entries cannot be edited or deleted by admins.</p></CardFooter>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader><div className="flex size-10 items-center justify-center rounded-2xl bg-primary-foreground text-primary"><ShieldCheck aria-hidden="true" /></div><CardTitle className="text-primary-foreground">Trust desk</CardTitle><CardDescription className="text-primary-foreground/65">The safest workflow is a documented one.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-primary-foreground/75"><div className="flex gap-3"><span className="font-semibold text-primary-foreground">01</span><p>Review submitted identity and business documents.</p></div><div className="flex gap-3"><span className="font-semibold text-primary-foreground">02</span><p>Make the decision with a clear internal note.</p></div><div className="flex gap-3"><span className="font-semibold text-primary-foreground">03</span><p>Let the atomic audit and notification writes finish together.</p></div></CardContent>
          <CardFooter className="border-t border-primary-foreground/15"><Link href="/verification" className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground hover:underline">Open review queue <ChevronRight aria-hidden="true" /></Link></CardFooter>
        </Card>
      </div>
    </AdminPage>
  );
}
import Link from "next/link";

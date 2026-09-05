"use client";

import { Check, ChevronRight, ExternalLink, FileCheck2, FileImage, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewVerificationAction } from "@/app/actions/admin-actions";
import type { DataRecord, ReviewDecision } from "@/lib/firebase/admin-data";
import { displayError } from "@/lib/display-error";
import { formatDate, valueOf } from "@/lib/admin-display";
import { StatusBadge } from "@/components/admin-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export function VerificationReviewPanel({ application }: { application: DataRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(() => valueOf(application, "adminNotes", ""));
  const [tier, setTier] = useState<"basic" | "full">("full");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function decide(decision: ReviewDecision) {
    setError("");
    startTransition(async () => {
      try {
        await reviewVerificationAction({ applicationId: application.id, decision, notes, verificationTier: decision === "approved" ? tier : undefined });
        setOpen(false);
        router.refresh();
      } catch (decisionError) {
        setError(displayError(decisionError));
      }
    });
  }

  const documents = application.documents && typeof application.documents === "object" ? Object.entries(application.documents as Record<string, unknown>).filter(([, value]) => typeof value === "string" && value) : [];

  return <><Button type="button" variant="ghost" className="h-auto w-full justify-start gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left whitespace-normal hover:border-primary/35 hover:bg-muted/40" onClick={() => setOpen(true)}><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><FileCheck2 aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">{valueOf(application, "businessName", "Unnamed business")}</p><StatusBadge status={application.status} /></div><p className="mt-1 truncate text-sm text-muted-foreground">{valueOf(application, "applicantName", valueOf(application, "applicantUid"))} · <span className="capitalize">{valueOf(application, "applicationType", "business")}</span></p></div><div className="hidden shrink-0 text-right sm:block"><p className="text-xs text-muted-foreground">Submitted</p><p className="mt-1 text-sm font-medium">{formatDate(application.submittedAt)}</p></div><ChevronRight aria-hidden="true" /></Button><Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-xl"><SheetHeader className="border-b bg-secondary/50 pr-12"><div className="flex items-center gap-2"><Badge variant="outline">Manual review</Badge><StatusBadge status={application.status} /></div><SheetTitle>{valueOf(application, "businessName", "Verification application")}</SheetTitle><SheetDescription>Review the submitted identity, business information, and supporting documents before deciding.</SheetDescription></SheetHeader><ScrollArea className="h-[calc(100svh-190px)]"><div className="flex flex-col gap-6 p-6"><section className="grid gap-3 sm:grid-cols-2"><DetailTile label="Applicant" value={valueOf(application, "applicantName", valueOf(application, "applicantUid"))} /><DetailTile label="Business type" value={valueOf(application, "applicationType", "—")} /><DetailTile label="Submitted" value={formatDate(application.submittedAt, true)} /><DetailTile label="Business ID" value={valueOf(application, "businessId")} /></section><Separator /><section className="flex flex-col gap-3"><div><p className="font-medium">Submitted documents</p><p className="text-sm text-muted-foreground">Open a document to inspect its full-resolution source.</p></div>{documents.length ? <div className="grid gap-2">{documents.map(([label, value]) => <a key={label} href={String(value)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 transition-colors hover:bg-muted/50"><div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><FileImage aria-hidden="true" /></div><span className="min-w-0 flex-1 truncate text-sm font-medium">{label.replace(/([A-Z])/g, " $1")}</span><ExternalLink aria-hidden="true" /></a>)}</div> : <p className="text-sm text-muted-foreground">No document links found.</p>}</section><Separator /><FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor={`verification-notes-${application.id}`}>Admin notes</FieldLabel><Textarea id={`verification-notes-${application.id}`} aria-invalid={Boolean(error)} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record what you verified or what is missing…" maxLength={1000} /><FieldDescription>{notes.length}/1000 · Information requests and rejection reasons are visible to the applicant.</FieldDescription></Field>{valueOf(application, "applicationType") !== "lapidary" ? <Field><FieldLabel>Approval tier</FieldLabel><Select value={tier} onValueChange={(value) => setTier((value as "basic" | "full") ?? "full")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="full">Full verified</SelectItem><SelectItem value="basic">Basic verified</SelectItem></SelectGroup></SelectContent></Select></Field> : null}</FieldGroup>{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div></ScrollArea><SheetFooter className="border-t bg-background sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => decide("under_review")} disabled={isPending}>Mark under review</Button><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => decide("info_requested")} disabled={isPending}><FileCheck2 data-icon="inline-start" />Request info</Button><Button type="button" variant="destructive" onClick={() => decide("rejected")} disabled={isPending}><X data-icon="inline-start" />Reject</Button><Button type="button" onClick={() => decide("approved")} disabled={isPending}>{isPending ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}Approve</Button></div></SheetFooter></SheetContent></Sheet></>;
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium">{value}</p></div>;
}

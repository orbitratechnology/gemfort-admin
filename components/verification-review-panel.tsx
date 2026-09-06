"use client";

import { Check, ChevronRight, ExternalLink, FileCheck2, FileImage, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewVerificationAction } from "@/app/actions/admin-actions";
import type { DataRecord, ReviewDecision } from "@/lib/firebase/admin-data";
import { displayError } from "@/lib/display-error";
import { formatDate, valueOf } from "@/lib/admin-display";
import { DetailTile, StatusBadge } from "@/components/admin-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const DOCUMENT_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "gemfort.firebasestorage.app",
]);

type DocumentEntry = { label: string; value: string; isLink: boolean; preview: "image" | "pdf" };

function isSafeDocumentUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && DOCUMENT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function formatDocumentLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^(.)/, (match) => match.toUpperCase()).trim();
}

function documentPreviewType(value: string): "image" | "pdf" {
  try {
    const pathname = decodeURIComponent(new URL(value).pathname).toLowerCase();
    return pathname.endsWith(".pdf") ? "pdf" : "image";
  } catch {
    return "image";
  }
}

function documentEntries(value: unknown): DocumentEntry[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    return values.flatMap((item, index) => {
      if (typeof item !== "string" || !item.trim()) return [];
      const label = Array.isArray(rawValue) ? `${formatDocumentLabel(key)} ${index + 1}` : formatDocumentLabel(key);
      const trimmed = item.trim();
      return [{ label, value: trimmed, isLink: isSafeDocumentUrl(trimmed), preview: documentPreviewType(trimmed) }];
    });
  });
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function VerificationReviewPanel({ application }: { application: DataRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(() => valueOf(application, "adminNotes", ""));
  const [tier, setTier] = useState<"basic" | "full">("full");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const status = valueOf(application, "status", "pending");
  const isResolved = status === "approved" || status === "rejected";
  const entries = documentEntries(application.documents);
  const documentLinks = entries.filter((entry) => entry.isLink);
  const documentDetails = entries.filter((entry) => !entry.isLink);
  const services = stringList(application.servicesOffered);

  function decide(decision: ReviewDecision) {
    setError("");
    startTransition(async () => {
      try {
        await reviewVerificationAction({
          applicationId: application.id,
          decision,
          notes,
          verificationTier: decision === "approved" ? tier : undefined,
        });
        setOpen(false);
        router.refresh();
      } catch (decisionError) {
        setError(displayError(decisionError));
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-start gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left whitespace-normal hover:border-primary/35 hover:bg-muted/40"
        onClick={() => setOpen(true)}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><FileCheck2 aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{valueOf(application, "businessName", "Unnamed business")}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {valueOf(application, "applicantName", valueOf(application, "applicantUid"))} · <span className="capitalize">{valueOf(application, "applicationType", "business")}</span>
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block"><p className="text-xs text-muted-foreground">Submitted</p><p className="mt-1 text-sm font-medium">{formatDate(application.submittedAt)}</p></div>
        <ChevronRight aria-hidden="true" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="h-dvh max-h-dvh w-full overflow-hidden p-0 sm:!w-[min(92vw,48rem)] sm:!max-w-2xl">
          <SheetHeader className="border-b bg-secondary/50 pr-12">
            <div className="flex items-center gap-2"><Badge variant="outline">Manual review</Badge><StatusBadge status={status} /></div>
            <SheetTitle>{valueOf(application, "businessName", "Verification application")}</SheetTitle>
            <SheetDescription>Review the submitted identity, business information, and supporting documents before deciding.</SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-6 p-6">
              <section className="grid gap-3 sm:grid-cols-2">
                <DetailTile label="Applicant" value={valueOf(application, "applicantName", valueOf(application, "applicantUid"))} />
                <DetailTile label="Business type" value={valueOf(application, "applicationType", "—")} />
                <DetailTile label="Date of birth" value={valueOf(application, "dateOfBirth")} />
                <DetailTile label="Submitted" value={formatDate(application.submittedAt, true)} />
                <DetailTile label="Business ID" value={valueOf(application, "businessId")} />
                <DetailTile label="Application ID" value={application.id} />
              </section>

              {services.length ? <section className="flex flex-col gap-2"><p className="font-medium">Services offered</p><p className="text-sm text-muted-foreground">{services.join(" · ")}</p></section> : null}

              <Separator />

              <section className="flex flex-col gap-3">
                <div><p className="font-medium">Submitted documents</p><p className="text-sm text-muted-foreground">Open a trusted Firebase Storage link to inspect the full-resolution source.</p></div>
                {documentLinks.length ? <div className="grid gap-4">{documentLinks.map((entry) => <div key={`${entry.label}-${entry.value}`} className="rounded-2xl border border-border/70 p-3"><div className="relative flex h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-2">{entry.preview === "pdf" ? <iframe src={entry.value} title={`${entry.label} preview`} sandbox="allow-same-origin" className="size-full rounded-lg border-0" /> : <Image src={entry.value} alt={`${entry.label} preview`} fill sizes="(max-width: 640px) 90vw, 44rem" unoptimized className="object-contain" />}</div><a href={entry.value} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"><div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><FileImage aria-hidden="true" /></div><span className="min-w-0 flex-1 truncate text-sm font-medium">Open {entry.label}</span><ExternalLink aria-hidden="true" /></a></div>)}</div> : null}
                {documentDetails.length ? <div className="grid gap-3 sm:grid-cols-2">{documentDetails.map((entry) => <DetailTile key={`${entry.label}-${entry.value}`} label={entry.label} value={entry.value} />)}</div> : null}
                {!entries.length ? <p className="text-sm text-muted-foreground">No document details or links found.</p> : null}
              </section>

              <Separator />

              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor={`verification-notes-${application.id}`}>Admin notes</FieldLabel>
                  <Textarea id={`verification-notes-${application.id}`} aria-invalid={Boolean(error)} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record what you verified or what is missing…" maxLength={1000} />
                  <FieldDescription>{notes.length}/1000 · Information requests and rejection reasons are visible to the applicant.</FieldDescription>
                </Field>
                {valueOf(application, "applicationType") !== "lapidary" ? <Field><FieldLabel>Approval tier</FieldLabel><Select value={tier} onValueChange={(value) => setTier((value as "basic" | "full") ?? "full")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="full">Full verified</SelectItem><SelectItem value="basic">Basic verified</SelectItem></SelectGroup></SelectContent></Select></Field> : null}
              </FieldGroup>

              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          </ScrollArea>

          <SheetFooter className="shrink-0 border-t bg-background sm:flex-row sm:justify-between">
            {isResolved ? <p className="text-sm text-muted-foreground">This application is resolved. A new submission is required to restart verification.</p> : <><Button type="button" variant="outline" onClick={() => decide("under_review")} disabled={isPending} aria-busy={isPending}>Mark under review</Button><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => decide("info_requested")} disabled={isPending} aria-busy={isPending}><FileCheck2 data-icon="inline-start" />Request info</Button><Button type="button" variant="destructive" onClick={() => decide("rejected")} disabled={isPending} aria-busy={isPending}><X data-icon="inline-start" />Reject</Button><Button type="button" onClick={() => decide("approved")} disabled={isPending} aria-busy={isPending}>{isPending ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}Approve</Button></div></>}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

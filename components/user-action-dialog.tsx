"use client";

import { Check, RefreshCw } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { UserAction } from "@/lib/firebase/admin-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function UserActionDialog({ action, name, open, busy, error, onClose, onSubmit }: { action: UserAction | null; name: string; open: boolean; busy: boolean; error: string; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const needsReason = action !== "reinstate";
  const title = action === "suspend" ? "Suspend account" : action === "ban" ? "Ban account" : action === "revoke_verification" ? "Revoke verification" : action === "grant_recognized_badge" ? "Mark as Recognized" : action === "remove_recognized_badge" ? "Remove Recognized tier" : "Reinstate account";
  const description = action === "ban" ? "Ban is a permanent access restriction and should only be used after review." : action === "reinstate" ? "This will restore account access and clear the suspension reason." : action === "grant_recognized_badge" ? "Give this manual tier only to an established partner, sponsor, association, institution, lab, or notable industry organization." : action === "remove_recognized_badge" ? "This removes the manual Recognized tier and restores the document-based verification tier." : `This action updates ${name} and creates an immutable audit entry.`;
  const placeholder = action === "grant_recognized_badge" ? "Explain the recognition, partnership, sponsorship, or approval…" : action === "remove_recognized_badge" ? "Explain why the Recognized tier is being removed…" : needsReason ? "Explain the decision for the member and audit log…" : "Optional note for the audit log…";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(reason);
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form className="flex flex-col gap-6" onSubmit={submit}><FieldSet><FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor="user-action-reason">Reason {needsReason ? "(required)" : "(optional)"}</FieldLabel><Textarea id="user-action-reason" aria-invalid={Boolean(error)} placeholder={placeholder} value={reason} onChange={(event) => setReason(event.target.value)} required={needsReason} maxLength={500} /><FieldDescription>{reason.length}/500 characters</FieldDescription></Field></FieldGroup></FieldSet>{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}<DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant={action === "ban" || action === "remove_recognized_badge" ? "destructive" : "default"} disabled={busy}>{busy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}{busy ? "Saving…" : "Confirm action"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

"use client";

import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGemShowAction } from "@/app/actions/admin-actions";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { displayError } from "@/lib/display-error";
import { valueOf } from "@/lib/admin-display";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { GemShowEditor } from "@/components/gem-show-editor";

export function GemShowCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return <><Button type="button" className="w-full sm:w-auto" onClick={() => setOpen(true)}><Plus data-icon="inline-start" />New Gem Show</Button><GemShowEditor key={open ? "new-open" : "new-closed"} open={open} show={null} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} /></>;
}

export function GemShowActions({ show }: { show: DataRecord }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  function deleteShow() {
    setError("");
    startTransition(async () => {
      try {
        await deleteGemShowAction(show.id);
        setDeleteOpen(false);
        router.refresh();
      } catch (deleteError) {
        setError(displayError(deleteError));
      }
    });
  }
  return <><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}><Pencil data-icon="inline-start" />Edit</Button><Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 data-icon="inline-start" />Delete</Button></div><GemShowEditor key={`${show.id}-${editOpen ? "open" : "closed"}`} open={editOpen} show={show} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); router.refresh(); }} /><AlertDialog open={deleteOpen} onOpenChange={(open) => !open && !isPending && setDeleteOpen(false)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {valueOf(show, "title", "this Gem Show")}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the Gem Show and its stored cover image from GemFort. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={isPending} onClick={deleteShow}>{isPending ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Trash2 data-icon="inline-start" />}{isPending ? "Deleting…" : "Delete Gem Show"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

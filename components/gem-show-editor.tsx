"use client";

import { Check, RefreshCw } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { saveGemShowAction } from "@/app/actions/admin-actions";
import type { DataRecord, GemShowInput } from "@/lib/firebase/admin-data";
import { displayError } from "@/lib/display-error";
import { valueOf } from "@/lib/admin-display";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function GemShowEditor({ open, show, onClose, onSaved }: { open: boolean; show: DataRecord | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(() => valueOf(show ?? ({ id: "" } as DataRecord), "title", ""));
  const [description, setDescription] = useState(() => valueOf(show ?? ({ id: "" } as DataRecord), "description", ""));
  const [externalUrl, setExternalUrl] = useState(() => valueOf(show ?? ({ id: "" } as DataRecord), "externalUrl", ""));
  const [isVisible, setIsVisible] = useState(() => show?.isVisible !== false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<File | undefined>(undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current;
    if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError("Choose a JPG, PNG, or WebP image up to 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    void save(file).then((saveError) => {
      if (saveError) setError(saveError);
      else onSaved();
    }).finally(() => setBusy(false));
  }

  async function save(file: File | undefined): Promise<string | null> {
    let uploadedRef: ReturnType<typeof ref> | null = null;
    try {
      let imageUrl = valueOf(show ?? ({ id: "" } as DataRecord), "imageUrl", "") || null;
      const id = show?.id ?? crypto.randomUUID();
      if (file) {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "") || "show-image";
        uploadedRef = ref(getFirebaseStorage(), `gem_shows/${id}/${Date.now()}-${safeName}`);
        const upload = await uploadBytes(uploadedRef, file, { contentType: file.type });
        imageUrl = await getDownloadURL(upload.ref);
      }
      const input: GemShowInput = { id, title, description, externalUrl, isVisible, imageUrl };
      await saveGemShowAction(input);
      return null;
    } catch (saveError) {
      if (uploadedRef) await deleteObject(uploadedRef).catch(() => undefined);
      return displayError(saveError);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{show ? "Edit Gem Show" : "Create Gem Show"}</DialogTitle><DialogDescription>Keep the copy concise and use a strong image that is at least 800 × 600 px.</DialogDescription></DialogHeader><form className="flex flex-col gap-6" onSubmit={submit}><FieldSet><FieldGroup><Field><FieldLabel htmlFor="show-title">Title</FieldLabel><Input id="show-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Beruwala Sapphire Week" maxLength={120} required /><FieldDescription>{title.length}/120</FieldDescription></Field><Field><FieldLabel htmlFor="show-description">Description</FieldLabel><Textarea id="show-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short story for the GemFort community…" maxLength={500} required /><FieldDescription>{description.length}/500 · Shown in the mobile feed.</FieldDescription></Field><Field><FieldLabel htmlFor="show-url">Link (optional)</FieldLabel><Input id="show-url" type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://gemfort.app/events/sapphire-week" /><FieldDescription>Use an https:// link when the story has a destination.</FieldDescription></Field><Field><FieldLabel htmlFor="show-image">Cover image {show ? "(optional replacement)" : ""}</FieldLabel><Input id="show-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { fileRef.current = event.target.files?.[0]; }} /><FieldDescription>JPG, PNG, or WebP · maximum 10 MB. Uploaded through the shared Firebase Storage rules.</FieldDescription></Field><Field orientation="horizontal"><Switch id="show-visible" checked={isVisible} onCheckedChange={setIsVisible} /><FieldLabel htmlFor="show-visible">Visible in GemFort</FieldLabel></Field></FieldGroup></FieldSet>{error ? <FieldError>{error}</FieldError> : null}<DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}{busy ? "Saving…" : show ? "Save changes" : "Publish Gem Show"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

import Image from "next/image";
import { Gem } from "lucide-react";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { StatusBadge } from "@/components/admin-primitives";
import { GemShowActions } from "@/components/gem-show-actions";
import { formatDate, valueOf } from "@/lib/admin-display";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function GemShowCard({ show }: { show: DataRecord }) {
  const imageUrl = valueOf(show, "imageUrl", "");
  const hasSupportedImage = (() => { try { return ["firebasestorage.googleapis.com", "storage.googleapis.com", "gemfort.firebasestorage.app"].includes(new URL(imageUrl).hostname); } catch { return false; } })();
  return <Card className="group"><div className="relative aspect-[16/9] overflow-hidden bg-secondary">{hasSupportedImage ? <Image src={imageUrl} alt="" fill sizes="(min-width: 1280px) 31vw, (min-width: 768px) 47vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><Gem aria-hidden="true" /></div>}<div className="absolute left-3 top-3"><StatusBadge status={show.isVisible ? "active" : "hidden"} /></div></div><CardHeader><CardTitle className="line-clamp-2">{valueOf(show, "title", "Untitled Gem Show")}</CardTitle><CardDescription className="line-clamp-3">{valueOf(show, "description", "No description")}</CardDescription></CardHeader><CardFooter className="justify-between gap-3 border-t"><span className="text-xs text-muted-foreground">Updated {formatDate(show.updatedAt)}</span><GemShowActions show={show} /></CardFooter></Card>;
}

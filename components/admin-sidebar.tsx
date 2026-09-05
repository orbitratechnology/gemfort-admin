import Link from "next/link";
import { Gem } from "lucide-react";
import { AdminNavLinks } from "@/components/admin-nav-links";

export function AdminSidebar() {
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex min-h-18 items-center gap-3 border-b border-sidebar-border px-5">
          <span className="flex min-w-0 flex-col">
            <span className="font-heading text-base font-semibold tracking-tight">GemFort</span>
            <span className="text-[11px] text-sidebar-foreground/60">Admin console</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex flex-col gap-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Workspace</p>
            <AdminNavLinks />
          </div>
        </div>
        <div className="border-t border-sidebar-border p-4 text-xs leading-relaxed text-sidebar-foreground/55">
          Firebase-backed operations console
        </div>
      </aside>
      <div className="sticky top-0 z-30 overflow-x-auto border-b border-border bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="flex min-w-max items-center gap-3">
          <Link href="/" className="flex items-center gap-2 pr-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Gem aria-hidden="true" /></span>
            GemFort
          </Link>
          <AdminNavLinks mobile />
        </div>
      </div>
    </>
  );
}

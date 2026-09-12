import { AdminNavLinks } from "@/components/admin-nav-links";

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex min-h-18 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="flex min-w-0 flex-col">
          <span className="font-heading text-base font-semibold tracking-tight">GemFort</span>
          <span className="text-xs text-sidebar-foreground/60">Admin console</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div className="flex flex-col gap-2">
          <p className="px-3 text-xs font-medium text-sidebar-foreground/55">Workspace</p>
          <AdminNavLinks />
        </div>
      </div>
      <div className="border-t border-sidebar-border p-4 text-xs leading-relaxed text-sidebar-foreground/55">
        Firebase-backed operations console
      </div>
    </aside>
  );
}

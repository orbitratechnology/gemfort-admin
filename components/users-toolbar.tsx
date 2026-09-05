import Link from "next/link";
import { Search } from "lucide-react";
import { UsersRefreshButton } from "@/components/users-refresh-button";
import { CardAction } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const roles = ["all", "trader", "lapidary", "gem_lab", "admin"] as const;

export function UsersToolbar({ total, visible }: { total: number; visible: number }) {
  return (
    <CardAction className="flex items-center gap-2"><UsersRefreshButton /><span className="sr-only">{visible} of {total} accounts shown</span></CardAction>
  );
}

export function UsersFilters({ query, role }: { query: string; role: string }) {
  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-2 sm:flex-row" action="/users" method="get">
        {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
        <div className="relative flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" name="q" placeholder="Search name, email, or phone" defaultValue={query} /></div>
      </form>
      <div className="flex flex-wrap items-center gap-2" aria-label="Filter by role">
        {roles.map((item) => <Link key={item} className={cn("inline-flex h-8 items-center justify-center rounded-4xl px-3 text-sm font-medium capitalize transition-colors", role === item ? "bg-secondary text-secondary-foreground" : "hover:bg-muted hover:text-foreground")} href={item === "all" ? `/users${query ? `?q=${encodeURIComponent(query)}` : ""}` : `/users?role=${item}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>{item === "all" ? "All roles" : item.replaceAll("_", " ")}</Link>)}
      </div>
    </div>
  );
}

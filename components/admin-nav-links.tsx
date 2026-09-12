import Link from "next/link";
import { ClipboardCheck, Flag, Gem, LayoutDashboard, Settings, UsersRound } from "lucide-react";

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: UsersRound },
  { label: "Verification", href: "/verification", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: Flag },
  { label: "Gem Shows", href: "/gem-shows", icon: Gem },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function AdminNavLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? "flex min-w-max items-center gap-1" : "flex flex-col gap-1"} aria-label="Admin navigation">
      {navItems.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} className={mobile ? "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" : "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

import { ClipboardCheck, Flag, Gem, LayoutDashboard, Settings, UsersRound } from "lucide-react";

export const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: UsersRound },
  { label: "Verification", href: "/verification", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: Flag },
  { label: "Gem Shows", href: "/gem-shows", icon: Gem },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

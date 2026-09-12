"use client";

import Link from "next/link";
import { Menu, Gem } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "@/components/admin-nav-items";
import { AdminNavLinks } from "@/components/admin-nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentLabel = navItems.find(({ href }) => href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))?.label ?? "Overview";

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur lg:hidden">
      <div className="flex min-h-16 items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold" aria-label="GemFort overview">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Gem className="size-4" aria-hidden="true" /></span>
          <span>GemFort</span>
        </Link>
        <div className="min-w-0 flex-1 border-l border-border pl-3">
          <p className="text-xs font-medium text-muted-foreground">Admin console</p>
          <p className="truncate text-sm font-medium">{currentLabel}</p>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Open admin navigation" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu aria-hidden="true" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="!w-[min(18rem,85vw)] h-dvh max-h-dvh p-0">
          <SheetHeader className="border-b bg-secondary/30 pr-14">
            <SheetTitle className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Gem className="size-4" aria-hidden="true" /></span>GemFort</SheetTitle>
            <SheetDescription>Move around the admin workspace.</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col justify-between p-4">
            <AdminNavLinks mobile onNavigate={() => setOpen(false)} />
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-xs leading-relaxed text-muted-foreground">Firebase-backed operations console</p>
              <SignOutButton className="w-full justify-start" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

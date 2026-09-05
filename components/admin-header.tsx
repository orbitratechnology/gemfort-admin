import { ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 flex min-h-18 items-center justify-between gap-4 border-b border-border/70 bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><span className="size-1.5 rounded-full bg-primary" />Live</span>
        <SignOutButton />
      </div>
    </header>
  );
}

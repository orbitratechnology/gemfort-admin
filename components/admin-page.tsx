import type { ReactNode } from "react";

export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">{children}</div>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  );
}

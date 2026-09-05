"use client";

import Link from "next/link";
import Image from "next/image";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  BadgeCheck,
  Ban,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileImage,
  Gem,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  applyUserAction,
  deleteGemShow,
  readGemShows,
  readOverview,
  readUsers,
  readVerifications,
  reviewVerification,
  saveGemShow,
  type DataRecord,
  type GemShowInput,
  type OverviewData,
  type ReviewDecision,
  type UserAction,
} from "@/lib/firebase/admin-data";
import { getFirebaseAuth, getFirebaseConfigForDisplay, getFirebaseDb } from "@/lib/firebase/client";
import { PortalLoading } from "@/components/portal-loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";

export type PortalSection = "overview" | "users" | "verification" | "gem-shows" | "settings";
export type PortalSectionMeta = { eyebrow: string; title: string; description: string };

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden"; user: User; reason: string }
  | { status: "ready"; user: User; profile: DataRecord };

type UserDialogState = {
  user: DataRecord;
  action: UserAction;
} | null;

const navItems: Array<{ section: PortalSection; label: string; href: string; icon: LucideIcon }> = [
  { section: "overview", label: "Overview", href: "/", icon: LayoutDashboard },
  { section: "users", label: "Users", href: "/users", icon: UsersRound },
  { section: "verification", label: "Verification", href: "/verification", icon: ClipboardCheck },
  { section: "gem-shows", label: "Gem Shows", href: "/gem-shows", icon: Gem },
];

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GF";
}

function valueOf(record: DataRecord, key: string, fallback = "—") {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function formatDate(value: unknown, withTime = false) {
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (typeof value === "string" || typeof value === "number") date = new Date(value);
  else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const parsed = value.toDate();
    date = parsed instanceof Date ? parsed : null;
  }
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function displayError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Try again later or reset the password.",
    "auth/network-request-failed": "Network connection failed. Check your connection and retry.",
    "permission-denied": "Firebase rules denied this action. Confirm this account has role: admin.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "Something went wrong. Try again.");
}

function signOutCurrentAdmin() {
  void signOut(getFirebaseAuth());
}

function StatusBadge({ status }: { status: unknown }) {
  const normalized = String(status ?? "none");
  const label = normalized.replaceAll("_", " ");
  const className =
    normalized === "verified" || normalized === "approved" || normalized === "active"
      ? "bg-primary text-primary-foreground"
      : normalized === "pending" || normalized === "under_review" || normalized === "info_requested"
        ? "bg-muted text-muted-foreground"
        : normalized === "rejected" || normalized === "revoked" || normalized === "suspended"
          ? "bg-destructive text-background"
          : "bg-secondary text-secondary-foreground";
  return <Badge className={className}>{label}</Badge>;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: number | null | undefined;
  detail: string;
   icon: LucideIcon;
  tone?: "navy" | "gold" | "green" | "blue";
}) {
  const toneClass = {
    navy: "bg-secondary text-secondary-foreground",
    gold: "bg-muted text-foreground",
    green: "bg-secondary text-secondary-foreground",
    blue: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4">
        <div className={`flex size-10 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="size-5" />
        </div>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <CardTitle className="text-3xl font-semibold tabular-nums">{value == null ? "—" : value.toLocaleString()}</CardTitle>
        <span className="mb-1 text-right text-xs text-muted-foreground">{detail}</span>
      </CardContent>
    </Card>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Could not load this workspace</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function AppSidebar({ section, user, onSignOut }: { section: PortalSection; user: User; onSignOut: () => void }) {
  const displayName = user.displayName || user.email?.split("@")[0] || "GemFort admin";
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="gap-4 p-4">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Gem className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-base font-semibold tracking-tight">GemFort</span>
            <span className="text-[11px] text-sidebar-foreground/60">Admin console</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-primary">
            <ShieldCheck className="size-3.5" />
            <span>Protected workspace</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">Admin-only controls are protected by Firebase rules.</p>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.section}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={section === item.section}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {item.section === "verification" && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary group-data-[collapsible=icon]:hidden" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/settings" />} isActive={section === "settings"} tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            }
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 text-left group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-xs font-medium">{displayName}</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/60">Platform admin</span>
            </span>
            <MoreHorizontal className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{user.email ?? "Signed-in admin"}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onSignOut} variant="destructive">
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function PortalFrame({ section, meta, user, children, onSignOut }: { section: PortalSection; meta: PortalSectionMeta; user: User; children: React.ReactNode; onSignOut: () => void }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar section={section} user={user} onSignOut={onSignOut} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex min-h-18 items-center justify-between gap-4 border-b border-border/70 bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="shrink-0" />
              <Separator orientation="vertical" className="hidden h-6 sm:block" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{meta.eyebrow}</p>
                <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{meta.title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="hidden gap-1.5 border-border text-muted-foreground sm:inline-flex">
                <span className="size-1.5 rounded-full bg-primary" />
                Live
              </Badge>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell />
              </Button>
              <Avatar size="sm" className="hidden sm:flex">
                {user.photoURL && <AvatarImage src={user.photoURL} alt="" />}
                <AvatarFallback>{initials(user.displayName || user.email || "GF")}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">{children}</div>
          </main>
          <footer className="px-4 pb-6 text-center text-xs text-muted-foreground sm:px-8">GemFort Admin · Trust infrastructure for the GemFort network</footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResetMessage("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (submissionError) {
      setError(displayError(submissionError));
    }
    setBusy(false);
  }

  async function handleReset() {
    if (!email.trim()) {
      setError("Enter your admin email first, then choose reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setError("");
      setResetMessage("Password reset email sent. Check your inbox.");
    } catch (resetError) {
      setError(displayError(resetError));
    }
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-36 -top-36 size-[460px] rounded-full border border-primary-foreground/10" />
        <div className="absolute -bottom-52 -left-40 size-[520px] rounded-full border border-sidebar-primary/20" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Gem className="size-6" />
          </span>
          <div>
            <p className="font-heading text-lg font-semibold">GemFort</p>
            <p className="text-xs text-primary-foreground/60">Admin console</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <Badge className="mb-6 bg-sidebar-primary text-sidebar-primary-foreground">Private workspace</Badge>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Keep the network worthy of trust.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-primary-foreground/70">Review businesses, protect members, and publish the stories that make Sri Lanka&apos;s gemstone trade easier to navigate.</p>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-6 text-sm">
            <div><p className="text-2xl font-semibold text-sidebar-primary">01</p><p className="mt-1 text-primary-foreground/60">Review</p></div>
            <div><p className="text-2xl font-semibold text-sidebar-primary">02</p><p className="mt-1 text-primary-foreground/60">Decide</p></div>
            <div><p className="text-2xl font-semibold text-sidebar-primary">03</p><p className="mt-1 text-primary-foreground/60">Record</p></div>
          </div>
        </div>
        <p className="relative text-xs text-primary-foreground/45">Role-based access · Firebase protected</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md shadow-xl shadow-primary/5">
          <CardHeader className="gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground lg:hidden"><Gem className="size-6" /></div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in with your authorized GemFort admin account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="admin-email">Email address</FieldLabel>
                  <Input id="admin-email" type="email" autoComplete="email" placeholder="admin@gemfort.app" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="admin-password">Password</FieldLabel>
                    <Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={handleReset}>Reset password</Button>
                  </div>
                  <Input id="admin-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </Field>
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              {resetMessage && <p className="text-sm text-muted-foreground">{resetMessage}</p>}
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {busy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <ShieldCheck data-icon="inline-start" />}
                {busy ? "Signing in…" : "Enter admin console"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t text-xs leading-relaxed text-muted-foreground">Access is checked against your Firebase `users` document. Regular accounts cannot enter this workspace.</CardFooter>
        </Card>
      </section>
    </main>
  );
}

function ForbiddenScreen({ reason, onSignOut }: { reason: string; onSignOut: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><ShieldAlert className="size-6" /></div>
          <CardTitle>Admin access required</CardTitle>
          <CardDescription>{reason}</CardDescription>
        </CardHeader>
        <CardContent><Alert><ShieldCheck /><AlertTitle>Secure by default</AlertTitle><AlertDescription>This account can stay signed in to Firebase, but the admin console will not read or write platform data without the `admin` role.</AlertDescription></Alert></CardContent>
        <CardFooter><Button variant="outline" onClick={onSignOut}><LogOut data-icon="inline-start" />Sign out</Button></CardFooter>
      </Card>
    </main>
  );
}

function OverviewView() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError("");
    try { setData(await readOverview()); } catch (loadError) { setError(displayError(loadError)); }
    setRefreshing(false);
  }
  useEffect(() => {
    let active = true;
    void readOverview()
      .then((result) => { if (active) setData(result); })
      .catch((loadError) => { if (active) setError(displayError(loadError)); })
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-sm text-muted-foreground">Platform pulse</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">What needs your attention?</h2></div>
        <Button variant="outline" onClick={() => void load()} disabled={refreshing}><RefreshCw data-icon="inline-start" className={refreshing ? "animate-spin" : ""} />Refresh data</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Registered users" value={data?.users} detail="all accounts" icon={UsersRound} tone="navy" />
        <MetricCard label="Active businesses" value={data?.businesses} detail="directory ready" icon={BriefcaseBusiness} tone="blue" />
        <MetricCard label="Pending verification" value={data?.pendingVerifications} detail="queue to review" icon={ClipboardCheck} tone="gold" />
        <MetricCard label="Active gem listings" value={data?.activeListings} detail="visible inventory" icon={Gem} tone="green" />
        <MetricCard label="Open reports" value={data?.activeReports} detail="trust & safety" icon={ShieldAlert} tone="gold" />
        <MetricCard label="Visible Gem Shows" value={data?.gemShows} detail="published stories" icon={Activity} tone="navy" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent admin activity</CardTitle>
            <CardDescription>Immutable actions written to the shared audit log.</CardDescription>
            <CardAction><Badge variant="outline">Audit trail</Badge></CardAction>
          </CardHeader>
          <CardContent>
            {data?.activity.length ? <div className="flex flex-col gap-1">{data.activity.map((item) => <ActivityRow key={item.id} item={item} />)}</div> : data ? <EmptyState icon={Activity} title="No admin activity yet" description="Actions taken from this console will appear here." /> : <ActivitySkeleton />}
          </CardContent>
          <CardFooter className="border-t"><p className="text-xs text-muted-foreground">Audit entries cannot be edited or deleted by admins.</p></CardFooter>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader><div className="flex size-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-5" /></div><CardTitle className="text-primary-foreground">Trust desk</CardTitle><CardDescription className="text-primary-foreground/65">The safest workflow is a documented one.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-primary-foreground/75">
            <div className="flex gap-3"><span className="font-semibold text-sidebar-primary">01</span><p>Review submitted identity and business documents.</p></div>
            <div className="flex gap-3"><span className="font-semibold text-sidebar-primary">02</span><p>Make the decision with a clear internal note.</p></div>
            <div className="flex gap-3"><span className="font-semibold text-sidebar-primary">03</span><p>Let the atomic audit and notification writes finish together.</p></div>
          </CardContent>
          <CardFooter className="border-t border-primary-foreground/15"><Link href="/verification" className="inline-flex items-center gap-2 text-sm font-medium text-sidebar-primary hover:underline">Open review queue <ChevronRight className="size-4" /></Link></CardFooter>
        </Card>
      </div>
    </>
  );
}

function ActivityRow({ item }: { item: DataRecord }) {
  const action = valueOf(item, "actionType", "admin action").replaceAll("_", " ");
  const target = valueOf(item, "targetId", "record");
  return <div className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/60"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Activity className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium capitalize">{action}</p><p className="truncate text-xs text-muted-foreground">{valueOf(item, "targetType", "record")} · {target}</p></div><span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.createdAt, true)}</span></div>;
}

function ActivitySkeleton() {
  return <div className="flex flex-col gap-5 px-3 py-3">{[1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3"><Skeleton className="size-9 rounded-xl" /><div className="flex flex-1 flex-col gap-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>;
}

function UsersView({ admin }: { admin: User }) {
  const [users, setUsers] = useState<DataRecord[]>([]);
  const [queryText, setQueryText] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<UserDialogState>(null);
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setUsers(await readUsers()); } catch (loadError) { setError(displayError(loadError)); }
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    void readUsers()
      .then((result) => { if (active) setUsers(result); })
      .catch((loadError) => { if (active) setError(displayError(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredUsers = users.filter((user) => {
    const haystack = [valueOf(user, "displayName", ""), valueOf(user, "email", ""), valueOf(user, "phone", "")].join(" ").toLowerCase();
    const matchesText = !queryText || haystack.includes(queryText.toLowerCase());
    const matchesRole = role === "all" || valueOf(user, "role") === role;
    const userStatus = user.isSuspended === true ? "suspended" : valueOf(user, "verificationStatus", "none");
    const matchesStatus = status === "all" || userStatus === status;
    return matchesText && matchesRole && matchesStatus;
  });

  async function handleAction(reason: string) {
    if (!actionState) return;
    try {
      await applyUserAction(valueOf(actionState.user, "uid", actionState.user.id), actionState.action, reason, admin);
      setSuccess(`${actionState.action.replaceAll("_", " ")} completed and added to the audit log.`);
      setActionState(null);
      await load();
    } catch (actionError) { setError(displayError(actionError)); }
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-4 border-b">
          <div><CardTitle>Accounts</CardTitle><CardDescription>{loading ? "Loading accounts…" : `${filteredUsers.length.toLocaleString()} of ${users.length.toLocaleString()} accounts shown`}</CardDescription></div>
          <CardAction><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : ""} />Refresh</Button></CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_210px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, email, or phone" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></div>
            <Select value={role} onValueChange={(value) => setRole(value ?? "all")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Role</SelectLabel><SelectItem value="all">All roles</SelectItem><SelectItem value="trader">Trader</SelectItem><SelectItem value="lapidary">Lapidary</SelectItem><SelectItem value="gem_lab">Gem Lab</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectGroup></SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Verification</SelectLabel><SelectItem value="all">All statuses</SelectItem><SelectItem value="none">Not submitted</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectGroup></SelectContent></Select>
          </div>
          {error && <ErrorAlert message={error} />}
          {success && <Alert><Check /><AlertTitle>Action recorded</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}
          <div className="rounded-2xl border border-border/70">
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead className="hidden md:table-cell">Role</TableHead><TableHead>Verification</TableHead><TableHead className="hidden lg:table-cell">Joined</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>{loading ? [1, 2, 3, 4].map((item) => <TableRow key={item}><TableCell><div className="flex items-center gap-3"><Skeleton className="size-9 rounded-full" /><div className="flex flex-col gap-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-40" /></div></div></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-3 w-20" /></TableCell><TableCell /></TableRow>) : filteredUsers.length ? filteredUsers.map((user) => <UserRow key={user.id} user={user} onAction={(action) => setActionState({ user, action })} />) : <TableRow><TableCell colSpan={5}><EmptyState icon={UsersRound} title="No matching users" description="Try a different search or filter." /></TableCell></TableRow>}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <UserActionDialog key={actionState ? `${actionState.user.id}-${actionState.action}` : "closed"} state={actionState} onClose={() => setActionState(null)} onSubmit={handleAction} />
    </>
  );
}

function UserRow({ user, onAction }: { user: DataRecord; onAction: (action: UserAction) => void }) {
  const name = valueOf(user, "displayName", "Unnamed account");
  const isSelf = valueOf(user, "uid", user.id) === user.id && valueOf(user, "role") === "admin";
  return <TableRow><TableCell><div className="flex min-w-[220px] items-center gap-3"><Avatar><AvatarFallback>{initials(name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{valueOf(user, "email")}</p></div></div></TableCell><TableCell className="hidden capitalize md:table-cell">{valueOf(user, "role")}</TableCell><TableCell><StatusBadge status={user.isSuspended === true ? "suspended" : user.verificationStatus} /></TableCell><TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(user.createdAt)}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuLabel>Account actions</DropdownMenuLabel></DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>{user.isSuspended === true ? <DropdownMenuItem onClick={() => onAction("reinstate")}><ShieldCheck />Reinstate account</DropdownMenuItem> : <DropdownMenuItem onClick={() => onAction("suspend")} disabled={isSelf}><ShieldAlert />Suspend account</DropdownMenuItem>}<DropdownMenuItem onClick={() => onAction("revoke_verification")} disabled={user.verificationStatus !== "verified"}><BadgeCheck />Revoke verification</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => onAction("ban")} disabled={isSelf}><Ban />Ban account</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu></TableCell></TableRow>;
}

function UserActionDialog({ state, onClose, onSubmit }: { state: UserDialogState; onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const action = state?.action;
  const needsReason = action !== "reinstate";
  const title = action === "suspend" ? "Suspend account" : action === "ban" ? "Ban account" : action === "revoke_verification" ? "Revoke verification" : "Reinstate account";
  const description = action === "ban" ? "Ban is a permanent access restriction and should only be used after review." : action === "reinstate" ? "This will restore account access and clear the suspension reason." : "This action updates the shared user record, notifies the member, and creates an immutable audit entry.";
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); await onSubmit(reason).finally(() => setBusy(false)); }
  return <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form className="flex flex-col gap-6" onSubmit={submit}><FieldSet><FieldGroup><Field><FieldLabel htmlFor="user-action-reason">Reason {needsReason ? "(required)" : "(optional)"}</FieldLabel><Textarea id="user-action-reason" placeholder={needsReason ? "Explain the decision for the member and audit log…" : "Optional note for the audit log…"} value={reason} onChange={(event) => setReason(event.target.value)} required={needsReason} maxLength={500} /><FieldDescription>{reason.length}/500 characters</FieldDescription></Field></FieldGroup></FieldSet><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant={action === "ban" ? "destructive" : "default"} disabled={busy}>{busy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}{busy ? "Saving…" : "Confirm action"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function VerificationView({ admin }: { admin: User }) {
  const [applications, setApplications] = useState<DataRecord[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<DataRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [tier, setTier] = useState<"basic" | "full">("full");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() { setLoading(true); setError(""); try { setApplications(await readVerifications()); } catch (loadError) { setError(displayError(loadError)); } setLoading(false); }
  useEffect(() => {
    let active = true;
    void readVerifications()
      .then((result) => { if (active) setApplications(result); })
      .catch((loadError) => { if (active) setError(displayError(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const visibleApplications = applications.filter((application) => filter === "all" || valueOf(application, "status") === filter);

  async function decide(decision: ReviewDecision) {
    if (!selected) return;
    if ((decision === "info_requested" || decision === "rejected") && notes.trim().length < 5) { setError("Add a clear note before requesting information or rejecting an application."); return; }
    setBusy(true); setError("");
    try { await reviewVerification(selected.id, decision, admin, notes, decision === "approved" ? tier : undefined); setSuccess(decision === "approved" ? `Application approved as ${tier} verified.` : `Application marked ${decision.replaceAll("_", " ")}.`); setSelected(null); setNotes(""); await load(); } catch (decisionError) { setError(displayError(decisionError)); }
    setBusy(false);
  }

  return <>
    <Card>
      <CardHeader className="gap-4 border-b"><div><CardTitle>Review queue</CardTitle><CardDescription>Oldest submissions first · document review is manual by design.</CardDescription></div><CardAction><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : ""} />Refresh</Button></CardAction></CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant={filter === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("all")}>All <span className="ml-1 text-muted-foreground">{applications.length}</span></Button><Button variant={filter === "pending" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("pending")}>Pending</Button><Button variant={filter === "under_review" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("under_review")}>Under review</Button><Button variant={filter === "info_requested" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("info_requested")}>Info requested</Button></div><p className="text-xs text-muted-foreground">{visibleApplications.length} applications</p></div>{error && <ErrorAlert message={error} />}{success && <Alert><Check /><AlertTitle>Review recorded</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}<div className="flex flex-col gap-2">{loading ? [1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />) : visibleApplications.length ? visibleApplications.map((application) => <VerificationRow key={application.id} application={application} onClick={() => { setSelected(application); setNotes(valueOf(application, "adminNotes", "")); }} />) : <EmptyState icon={FileCheck2} title="Queue is clear" description="New verification applications will appear here when members submit their documents." />}</div></CardContent>
    </Card>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-xl"><SheetHeader className="border-b bg-secondary/50 pr-12"><div className="flex items-center gap-2"><Badge variant="outline">Manual review</Badge>{selected && <StatusBadge status={selected.status} />}</div><SheetTitle>{selected ? valueOf(selected, "businessName", "Verification application") : "Verification application"}</SheetTitle><SheetDescription>Review the submitted identity, business information, and supporting documents before deciding.</SheetDescription></SheetHeader>{selected && <ScrollArea className="h-[calc(100svh-190px)]"><div className="flex flex-col gap-6 p-6"><section className="grid gap-3 sm:grid-cols-2"><DetailTile label="Applicant" value={valueOf(selected, "applicantName", valueOf(selected, "applicantUid"))} /><DetailTile label="Business type" value={valueOf(selected, "applicationType", "—")} /><DetailTile label="Submitted" value={formatDate(selected.submittedAt, true)} /><DetailTile label="Business ID" value={valueOf(selected, "businessId")} /></section><Separator /><section className="flex flex-col gap-3"><div><p className="font-medium">Submitted documents</p><p className="text-sm text-muted-foreground">Open a document to inspect its full-resolution source.</p></div><DocumentList documents={selected.documents} /></section><Separator /><FieldGroup><Field><FieldLabel htmlFor="verification-notes">Admin notes</FieldLabel><Textarea id="verification-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record what you verified or what is missing…" maxLength={1000} /><FieldDescription>{notes.length}/1000 · Information requests and rejection reasons are visible to the applicant.</FieldDescription></Field>{valueOf(selected, "applicationType") !== "lapidary" && <Field><FieldLabel>Approval tier</FieldLabel><Select value={tier} onValueChange={(value) => setTier((value as "basic" | "full") ?? "full")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="full">Full verified</SelectItem><SelectItem value="basic">Basic verified</SelectItem></SelectGroup></SelectContent></Select></Field>}</FieldGroup></div></ScrollArea>}<SheetFooter className="border-t bg-background sm:flex-row sm:justify-between"><Button variant="outline" onClick={() => void decide("under_review")} disabled={busy}>Mark under review</Button><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void decide("info_requested")} disabled={busy}><FileCheck2 data-icon="inline-start" />Request info</Button><Button variant="destructive" onClick={() => void decide("rejected")} disabled={busy}><X data-icon="inline-start" />Reject</Button><Button onClick={() => void decide("approved")} disabled={busy}>{busy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}Approve</Button></div></SheetFooter></SheetContent></Sheet>
  </>;
}

function VerificationRow({ application, onClick }: { application: DataRecord; onClick: () => void }) {
  const submitted = application.submittedAt;
  return <Button type="button" variant="ghost" className="h-auto w-full justify-start gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left whitespace-normal hover:border-primary/35 hover:bg-muted/40" onClick={onClick}><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><FileCheck2 className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">{valueOf(application, "businessName", "Unnamed business")}</p><StatusBadge status={application.status} /></div><p className="mt-1 truncate text-sm text-muted-foreground">{valueOf(application, "applicantName", valueOf(application, "applicantUid"))} · <span className="capitalize">{valueOf(application, "applicationType", "business")}</span></p></div><div className="hidden shrink-0 text-right sm:block"><p className="text-xs text-muted-foreground">Submitted</p><p className="mt-1 text-sm font-medium">{formatDate(submitted)}</p></div><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></Button>;
}

function DetailTile({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium">{value}</p></div>; }

function DocumentList({ documents }: { documents: unknown }) {
  const entries = documents && typeof documents === "object" ? Object.entries(documents as Record<string, unknown>).filter(([, value]) => typeof value === "string" && value) : [];
  return entries.length ? <div className="grid gap-2">{entries.map(([label, value]) => <a key={label} href={String(value)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 transition-colors hover:bg-muted/50"><div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><FileImage className="size-4" /></div><span className="min-w-0 flex-1 truncate text-sm font-medium">{label.replace(/([A-Z])/g, " $1")}</span><ExternalLink className="size-4 text-muted-foreground" /></a>)}</div> : <EmptyState icon={FileImage} title="No document links found" description="This application may use a different document shape or has not uploaded files yet." />;
}

function GemShowsView({ admin }: { admin: User }) {
  const [shows, setShows] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() { setLoading(true); setError(""); try { setShows(await readGemShows()); } catch (loadError) { setError(displayError(loadError)); } setLoading(false); }
  useEffect(() => {
    let active = true;
    void readGemShows()
      .then((result) => { if (active) setShows(result); })
      .catch((loadError) => { if (active) setError(displayError(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSave(input: GemShowInput, file?: File) {
    try { await saveGemShow(input, admin, file); setFormOpen(false); setEditing(null); setSuccess(input.id ? "Gem Show updated." : "Gem Show published to the shared Firebase project."); await load(); } catch (saveError) { throw new Error(displayError(saveError)); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError("");
    try {
      await deleteGemShow(deleteTarget, admin);
      setDeleteTarget(null);
      setSuccess("Gem Show deleted.");
      await load();
    } catch (deleteError) {
      setError(displayError(deleteError));
    }
    setDeleteBusy(false);
  }

  return <>
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm text-muted-foreground">Editorial inventory</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Stories worth showing</h2></div><Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus data-icon="inline-start" />New Gem Show</Button></div>
    {error && <ErrorAlert message={error} />}{success && <Alert><Check /><AlertTitle>Content saved</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loading ? [1, 2, 3].map((item) => <Card key={item}><Skeleton className="aspect-[16/9] w-full rounded-none" /><CardHeader><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /></CardHeader></Card>) : shows.length ? shows.map((show) => <GemShowCard key={show.id} show={show} onEdit={() => { setEditing(show); setFormOpen(true); }} onDelete={() => setDeleteTarget(show)} />) : <Card className="md:col-span-2 xl:col-span-3"><EmptyState icon={Gem} title="No Gem Shows yet" description="Create the first story for exhibitions, new collections, or moments from the gemstone trade." /></Card>}</div>
    <GemShowDialog key={`${editing?.id ?? "new"}-${formOpen ? "open" : "closed"}`} open={formOpen} show={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleteBusy && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {deleteTarget ? valueOf(deleteTarget, "title", "this Gem Show") : "this Gem Show"}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently removes the Gem Show and its stored cover image from GemFort. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleteBusy} onClick={() => void handleDelete()}>
            {deleteBusy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
            {deleteBusy ? "Deleting…" : "Delete Gem Show"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function GemShowCard({ show, onEdit, onDelete }: { show: DataRecord; onEdit: () => void; onDelete: () => void }) {
  const imageUrl = valueOf(show, "imageUrl", "");
  const hasSupportedImage = (() => {
    try {
      return ["firebasestorage.googleapis.com", "storage.googleapis.com", "gemfort.firebasestorage.app"].includes(new URL(imageUrl).hostname);
    } catch {
      return false;
    }
  })();
  return <Card className="group"><div className="relative aspect-[16/9] overflow-hidden bg-secondary">{hasSupportedImage ? <Image src={imageUrl} alt="" fill sizes="(min-width: 1280px) 31vw, (min-width: 768px) 47vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><Gem className="size-10 opacity-40" /></div>}<div className="absolute left-3 top-3"><StatusBadge status={show.isVisible ? "active" : "hidden"} /></div></div><CardHeader><CardTitle className="line-clamp-2">{valueOf(show, "title", "Untitled Gem Show")}</CardTitle><CardDescription className="line-clamp-3">{valueOf(show, "description", "No description")}</CardDescription></CardHeader><CardFooter className="justify-between gap-3 border-t"><span className="text-xs text-muted-foreground">Updated {formatDate(show.updatedAt)}</span><div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={onEdit}><Pencil data-icon="inline-start" />Edit</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}><Trash2 data-icon="inline-start" />Delete</Button></div></CardFooter></Card>;
}

function GemShowDialog({ open, show, onClose, onSave }: { open: boolean; show: DataRecord | null; onClose: () => void; onSave: (input: GemShowInput, file?: File) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const fileRef = useRef<File | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await onSave({ id: show?.id, title, description, externalUrl, isVisible, imageUrl: show?.imageUrl ?? null }, fileRef.current); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save this Gem Show."); } setBusy(false); }
  return <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{show ? "Edit Gem Show" : "Create Gem Show"}</DialogTitle><DialogDescription>Keep the copy concise and use a strong image that is at least 800 × 600 px.</DialogDescription></DialogHeader><form className="flex flex-col gap-6" onSubmit={submit}><FieldSet><FieldGroup><Field><FieldLabel htmlFor="show-title">Title</FieldLabel><Input id="show-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Beruwala Sapphire Week" maxLength={120} required /><FieldDescription>{title.length}/120</FieldDescription></Field><Field><FieldLabel htmlFor="show-description">Description</FieldLabel><Textarea id="show-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short story for the GemFort community…" maxLength={500} required /><FieldDescription>{description.length}/500 · Shown in the mobile feed.</FieldDescription></Field><Field><FieldLabel htmlFor="show-url">Link (optional)</FieldLabel><Input id="show-url" type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://gemfort.app/events/sapphire-week" /><FieldDescription>Use an https:// link when the story has a destination.</FieldDescription></Field><Field><FieldLabel htmlFor="show-image">Cover image {show ? "(optional replacement)" : ""}</FieldLabel><Input id="show-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { fileRef.current = event.target.files?.[0]; }} /><FieldDescription>JPG, PNG, or WebP · maximum 10 MB. Files are stored under the admin-only Gem Shows path.</FieldDescription></Field><Field orientation="horizontal"><Switch id="show-visible" checked={isVisible} onCheckedChange={setIsVisible} /><FieldLabel htmlFor="show-visible">Visible in GemFort</FieldLabel></Field></FieldGroup></FieldSet>{error && <FieldError>{error}</FieldError>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}{busy ? "Saving…" : show ? "Save changes" : "Publish Gem Show"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function SettingsView({ user }: { user: User }) {
  const config = getFirebaseConfigForDisplay();
  return <>
    <div><p className="text-sm text-muted-foreground">Configuration</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Safe, shared foundations</h2></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><CardTitle>Firebase connection</CardTitle><CardDescription>This console points at the same project used by the GemFort mobile app.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><DetailTile label="Project ID" value={config.projectId} /><DetailTile label="Auth domain" value={config.authDomain} /><DetailTile label="Storage bucket" value={config.storageBucket} /><DetailTile label="Firestore region" value="asia-south1 · Standard edition" /></CardContent></Card>
      <Card><CardHeader><div className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Settings className="size-5" /></div><CardTitle>Current session</CardTitle><CardDescription>Only this signed-in user can initiate the actions below.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><DetailTile label="Email" value={user.email ?? "—"} /><DetailTile label="Email verified" value={user.emailVerified ? "Yes" : "No"} /><DetailTile label="Provider" value="Firebase Email/Password" /><Alert><ShieldCheck /><AlertTitle>Authorization boundary</AlertTitle><AlertDescription>The client never receives admin credentials. Firestore and Storage rules must approve every read and write using the signed-in user&apos;s admin role.</AlertDescription></Alert></CardContent></Card>
    </div>
  </>;
}

export function AdminPortal({ section, meta }: { section: PortalSection; meta: PortalSectionMeta }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) { if (active) setAuthState({ status: "signed-out" }); return; }
      void (async () => {
        try {
           const profileSnapshot = await getDoc(doc(getFirebaseDb(), "users", user.uid));
          const profile = profileSnapshot.exists() ? ({ id: profileSnapshot.id, ...profileSnapshot.data() } as DataRecord) : null;
          if (!active) return;
          if (!profile) { setAuthState({ status: "forbidden", user, reason: "Your Firebase account does not have a GemFort user profile yet." }); return; }
          if (profile.isSuspended === true) { setAuthState({ status: "forbidden", user, reason: "This account is suspended and cannot access the admin console." }); return; }
          if (profile.role !== "admin") { setAuthState({ status: "forbidden", user, reason: "This account is not assigned the admin role." }); return; }
          setAuthState({ status: "ready", user, profile });
        } catch (profileError) { if (active) setAuthState({ status: "forbidden", user, reason: displayError(profileError) }); }
      })();
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  if (authState.status === "loading") return <PortalLoading />;
  if (authState.status === "signed-out") return <LoginScreen />;
  if (authState.status === "forbidden") return <ForbiddenScreen reason={authState.reason} onSignOut={signOutCurrentAdmin} />;
  const { user } = authState;
  return <PortalFrame section={section} meta={meta} user={user} onSignOut={signOutCurrentAdmin}>{section === "overview" && <OverviewView />}{section === "users" && <UsersView admin={user} />}{section === "verification" && <VerificationView admin={user} />}{section === "gem-shows" && <GemShowsView admin={user} />}{section === "settings" && <SettingsView user={user} />}</PortalFrame>;
}

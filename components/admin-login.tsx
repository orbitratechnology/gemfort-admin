"use client";

import { Gem, RefreshCw, ShieldCheck } from "lucide-react";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { displayError } from "@/lib/display-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setError("");
      setResetMessage("");
      try {
        const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        const idToken = await credential.user.getIdToken();
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!response.ok) {
          await signOut(getFirebaseAuth());
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(payload?.error ?? "This account is not authorized for the admin console.");
          return;
        }
        router.replace("/");
      } catch (submissionError) {
        setError(displayError(submissionError));
      }
    });
  }

  function handleReset() {
    if (!email.trim()) {
      setError("Enter your admin email first, then choose reset password.");
      return;
    }
    startTransition(async () => {
      try {
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
        setError("");
        setResetMessage("Password reset email sent. Check your inbox.");
      } catch (resetError) {
        setError(displayError(resetError));
      }
    });
  }

  return (
    <div className="grid min-h-[calc(100svh-9rem)] bg-background lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="relative hidden overflow-hidden rounded-4xl bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-36 -top-36 size-[460px] rounded-full border border-primary-foreground/10" />
        <div className="absolute -bottom-52 -left-40 size-[520px] rounded-full border border-primary-foreground/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground text-primary"><Gem aria-hidden="true" /></span>
          <div><p className="font-heading text-lg font-semibold">GemFort</p><p className="text-xs text-primary-foreground/60">Admin console</p></div>
        </div>
        <div className="relative max-w-xl">
          <Badge className="mb-6 bg-primary-foreground text-primary">Private workspace</Badge>
          <h2 className="text-balance text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Keep the network worthy of trust.</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-primary-foreground/70">Review businesses, protect members, and publish the stories that make Sri Lanka&apos;s gemstone trade easier to navigate.</p>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-6 text-sm">
            <div><p className="text-2xl font-semibold">01</p><p className="mt-1 text-primary-foreground/60">Review</p></div>
            <div><p className="text-2xl font-semibold">02</p><p className="mt-1 text-primary-foreground/60">Decide</p></div>
            <div><p className="text-2xl font-semibold">03</p><p className="mt-1 text-primary-foreground/60">Record</p></div>
          </div>
        </div>
        <p className="relative text-xs text-primary-foreground/45">Role-based access · Firebase protected</p>
      </section>
      <section className="flex items-center justify-center p-2 sm:p-10">
        <Card className="w-full max-w-md shadow-xl shadow-primary/5">
          <CardHeader className="gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground lg:hidden"><Gem aria-hidden="true" /></div>
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
                  <div className="flex items-center justify-between gap-3"><FieldLabel htmlFor="admin-password">Password</FieldLabel><Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={handleReset} disabled={isPending}>Reset password</Button></div>
                  <Input id="admin-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </Field>
              </FieldGroup>
              {error ? <FieldError>{error}</FieldError> : null}
              {resetMessage ? <Alert><ShieldCheck /><AlertTitle>Password reset</AlertTitle><AlertDescription>{resetMessage}</AlertDescription></Alert> : null}
              <Button type="submit" className="h-11 w-full" disabled={isPending}>{isPending ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <ShieldCheck data-icon="inline-start" />}{isPending ? "Signing in…" : "Enter admin console"}</Button>
            </form>
          </CardContent>
          <CardFooter className="border-t text-xs leading-relaxed text-muted-foreground">Access is checked against your Firebase <code>users</code> document. Regular accounts cannot enter this workspace.</CardFooter>
        </Card>
      </section>
    </div>
  );
}

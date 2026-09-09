"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { bootstrapAdminAction, type AdminBootstrapState } from "@/lib/auth/admin-bootstrap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AdminBootstrapState = {};

export function AdminBootstrapForm() {
  const [state, formAction, isPending] = useActionState(bootstrapAdminAction, initialState);

  if (state.success) {
    return (
      <Card className="w-full max-w-lg shadow-xl shadow-primary/5">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ShieldCheck aria-hidden="true" /></div>
          <CardTitle>Admin created</CardTitle>
          <CardDescription>{state.email} can now enter the private admin console.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert><ShieldCheck /><AlertTitle>Setup is now closed</AlertTitle><AlertDescription>The one-time bootstrap lock prevents another account from claiming first-admin access.</AlertDescription></Alert>
        </CardContent>
        <CardFooter><Link className="inline-flex h-9 w-full items-center justify-center rounded-4xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80" href="/login">Continue to sign in</Link></CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg shadow-xl shadow-primary/5">
      <CardHeader>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><KeyRound aria-hidden="true" /></div>
        <CardTitle>Create the first admin</CardTitle>
        <CardDescription>This one-time setup is available only while GemFort has no admin account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="bootstrap-token">One-time setup code</FieldLabel>
              <Input id="bootstrap-token" name="bootstrapToken" type="password" autoComplete="off" required minLength={32} maxLength={256} />
              <FieldDescription>Use the value configured only on the server as ADMIN_BOOTSTRAP_TOKEN.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="bootstrap-email">Admin email</FieldLabel>
              <Input id="bootstrap-email" name="email" type="email" autoComplete="email" required maxLength={254} />
            </Field>
            <Field>
              <FieldLabel htmlFor="bootstrap-name">Display name</FieldLabel>
              <Input id="bootstrap-name" name="displayName" autoComplete="name" required minLength={2} maxLength={80} />
            </Field>
            <Field>
              <FieldLabel htmlFor="bootstrap-password">Password</FieldLabel>
              <Input id="bootstrap-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
              <FieldDescription>Use at least 12 characters and store it in a password manager.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="bootstrap-confirmation">Confirm password</FieldLabel>
              <Input id="bootstrap-confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
            </Field>
          </FieldGroup>
          {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Creating admin…" : "Create first admin"}</Button>
        </form>
      </CardContent>
      <CardFooter className="border-t text-xs leading-relaxed text-muted-foreground"><Link className="underline underline-offset-4" href="/login">Return to sign in</Link></CardFooter>
    </Card>
  );
}

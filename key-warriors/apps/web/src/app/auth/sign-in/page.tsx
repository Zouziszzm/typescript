"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInWithEmail, null);

  return (
    <div className="mx-auto max-w-md space-y-6 pt-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Powered by Neon Auth for keyboard-wars.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {state?.error && (
          <p className="text-sm text-rose-400">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-sm text-zinc-500">
        No account?{" "}
        <Link href="/auth/sign-up" className="text-amber-400 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpWithEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpWithEmail, null);

  return (
    <div className="mx-auto max-w-md space-y-6 pt-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Create account</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Join Keyboard Warriors with Neon Auth.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" type="text" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
          />
        </div>
        {state?.error && (
          <p className="text-sm text-rose-400">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-amber-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

"use server";

import { neonAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await neonAuth.signIn.email({ email, password });
  if (error) {
    return { error: error.message ?? "Sign in failed" };
  }

  redirect("/play");
}

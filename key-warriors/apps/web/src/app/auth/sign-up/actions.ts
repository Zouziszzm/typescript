"use server";

import { neonAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function signUpWithEmail(
  _prev: { error: string } | null,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await neonAuth.signUp.email({ email, password, name });
  if (error) {
    return { error: error.message ?? "Sign up failed" };
  }

  redirect("/play");
}

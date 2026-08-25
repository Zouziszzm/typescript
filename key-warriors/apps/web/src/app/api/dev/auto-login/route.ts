import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";

const DEV_EMAIL = "dev@keyboardwarriors.local";
const DEV_NAME = "Dev Warrior";

export async function GET(req: Request) {
  if (process.env.ALLOW_DEV_AUTH !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirect") ?? "/play";
  const password =
    process.env.DEV_AUTH_PASSWORD ?? "devpassword12345keyboard";

  let signIn = await neonAuth.signIn.email({
    email: DEV_EMAIL,
    password,
  });

  if (signIn.error) {
    await neonAuth.signUp.email({
      email: DEV_EMAIL,
      password,
      name: DEV_NAME,
    });
    signIn = await neonAuth.signIn.email({
      email: DEV_EMAIL,
      password,
    });
  }

  if (signIn.error) {
    return NextResponse.json(
      { error: signIn.error.message ?? "Dev login failed" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL(redirectTo, req.url));
}

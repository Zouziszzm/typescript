import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/server";

const PROTECTED = ["/history"];

const neonProtect = neonAuth.middleware({
  loginUrl:
    process.env.ALLOW_DEV_AUTH === "true"
      ? "/api/dev/auto-login"
      : "/auth/sign-in",
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (process.env.ALLOW_DEV_AUTH === "true" && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/dev/auto-login";
    url.searchParams.set("redirect", "/play");
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtected) return NextResponse.next();

  if (process.env.ALLOW_DEV_AUTH === "true") {
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) {
      const url = req.nextUrl.clone();
      url.pathname = "/api/dev/auto-login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return neonProtect(req);
}

export const config = {
  matcher: ["/history/:path*"],
};

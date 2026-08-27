"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/theme";

const NAV = [
  { href: "/", label: "Library", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="app-bottom-nav" aria-label="Main navigation">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            prefetch={item.href === "/" ? false : undefined}
            className={`app-bottom-nav-item ${active ? "app-bottom-nav-item-active" : ""}`}
          >
            <span className="app-bottom-nav-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="app-bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
      <span className="app-bottom-nav-version" aria-hidden>
        {APP_VERSION}
      </span>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname.startsWith("/read/");

  if (isReader) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const tabs = [
    { name: "kana", href: "/kana" },
    { name: "kanji", href: "/kanji" },
    { name: "grammer", href: "/grammar" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e2dfd7] bg-[#faf8f5] w-full rounded-none">
      <div className="grid grid-cols-3 w-full rounded-none">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/grammar" && pathname === "/grammer");

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center justify-center py-5 text-lg font-pixel transition-colors duration-150 border-r border-[#e2dfd7] last:border-r-0 rounded-none ${
                isActive
                  ? "text-[#1e1c1b] font-medium"
                  : "text-[#a8a196] hover:text-[#5e5850]"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

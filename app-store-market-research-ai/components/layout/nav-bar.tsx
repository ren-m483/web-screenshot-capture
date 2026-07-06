"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/rankings", label: "ランキング" },
  { href: "/analysis/genre", label: "ジャンル分析" },
  { href: "/diagnosis", label: "アプリ診断" },
  { href: "/reviews", label: "レビュー分析" },
  { href: "/ideas", label: "アプリ案" },
  { href: "/reports", label: "レポート" },
  { href: "/settings", label: "設定" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-4">
        <span className="font-semibold text-sm whitespace-nowrap">App Store Market Research AI</span>
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  active ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

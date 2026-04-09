"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",                label: "Dashboard",        icon: "📊" },
  { href: "/seasons",         label: "Seasons",          icon: "🗓️" },
  { href: "/events",          label: "Events",           icon: "🎡" },
  { href: "/assets",          label: "Assets",           icon: "💎" },
  { href: "/recommendations", label: "Recommendations",  icon: "💡" },
  { href: "/settings",        label: "Settings",         icon: "⚙️" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <nav
      style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="text-xl font-bold mr-4 text-orange-400">🍑 LiveOps</span>
        {links.map((l) => {
          const active = path === l.href || (l.href !== "/" && path.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-orange-500/20 text-orange-400 font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <span>{l.icon}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

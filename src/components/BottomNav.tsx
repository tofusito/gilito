"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Globe, Trophy, ScanLine, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",             label: "Inicio",      Icon: Home },
  { href: "/paises",       label: "Países",      Icon: Globe },
  { href: "/scan",         label: "Escanear",    Icon: ScanLine },
  { href: "/deseos",       label: "Deseos",      Icon: Heart },
  { href: "/logros",       label: "Logros",      Icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#f0ede8] safe-bottom z-50">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isScan = href === "/scan";

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isScan
                  ? active
                    ? "text-[#e8a020]"
                    : "text-[#b45309]/70"
                  : active
                    ? "text-[#e8a020]"
                    : "text-[#78716c]"
              )}
            >
              {isScan ? (
                <div className={cn(
                  "w-16 h-16 rounded-[22px] flex items-center justify-center -mt-7 shadow-xl transition-all",
                  active
                    ? "bg-[#e8a020] scale-105"
                    : "bg-[#1a1a1a]"
                )}>
                  <Icon size={26} className="text-white" strokeWidth={1.6} />
                </div>
              ) : (
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  className="transition-all"
                />
              )}
              {!isScan && <span>{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

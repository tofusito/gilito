"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Globe, Trophy, ScanLine, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <nav className="fixed inset-x-0 bottom-4 px-4 z-50">
      <div className="max-w-lg mx-auto">
        <div className="floating-dock">
          <div className="dock-scan-glow" />
          <div className="flex items-end justify-between gap-1.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isScan = href === "/scan";

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-end gap-1 text-[10px] font-medium transition-colors min-w-0",
                isScan
                  ? active
                    ? "text-white"
                    : "text-[#443b31]"
                  : active
                    ? "text-[#0f172a]"
                    : "text-[#78716c]"
              )}
            >
              {isScan ? (
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  animate={active ? { scale: 1.03 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 340, damping: 24 }}
                  className={cn(
                    "relative w-[4.35rem] h-[4.35rem] rounded-[1.6rem] flex items-center justify-center -mt-8 shadow-[0_18px_40px_rgba(41,37,36,0.24)] transition-all coin-shine",
                    active
                      ? "bg-[linear-gradient(135deg,#4cc9f0,#e8a020)] scale-105"
                      : "bg-[linear-gradient(180deg,#1f2937,#111827)]"
                  )}
                >
                  {active && <span className="nav-ring opacity-60" />}
                  <span className="absolute inset-[1.5px] rounded-[1.45rem] border border-white/30" />
                  <Icon size={26} className="text-white" strokeWidth={1.6} />
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  animate={{ scale: active ? 1.02 : 1 }}
                  transition={{ type: "spring", stiffness: 360, damping: 26 }}
                  className="relative w-12 h-12 flex items-center justify-center"
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.56))] shadow-[0_12px_28px_rgba(41,37,36,0.14)]"
                      transition={{ type: "spring", stiffness: 430, damping: 34 }}
                    />
                  )}
                  <span className="dock-icon-orb" />
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.2 : 1.7}
                    className={cn("relative transition-all", active ? "text-[#0f172a]" : "text-[#7c7468]")}
                  />
                </motion.div>
              )}
              {!isScan && (
                <span className={cn("relative truncate transition-colors", active ? "text-[#0f172a]" : "text-[#7c7468]")}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
          </div>
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryStats } from "@/lib/stats";
import { AnimatePresence, motion } from "framer-motion";

export function PaisesClient({ stats }: { stats: CountryStats[] }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function toggleSearch() {
    if (open) {
      setQuery("");
      setOpen(false);
    } else {
      setOpen(true);
    }
  }

  const filtered = query.trim()
    ? stats.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : stats;

  return (
    <div className="min-h-screen px-4 pt-6 pb-4 max-w-lg mx-auto rise-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className={cn(
          "text-2xl font-bold tracking-tight text-gradient flex-1 transition-all duration-200 origin-left",
          open ? "opacity-0 scale-x-95 pointer-events-none w-0 flex-none overflow-hidden" : "opacity-100"
        )}>
          Países
        </h1>

        <div className={cn(
          "flex-1 transition-all duration-200",
          open ? "opacity-100" : "opacity-0 w-0 pointer-events-none flex-none overflow-hidden"
        )}>
          <div className="glass-button flex items-center gap-2 rounded-2xl px-3 py-2.5">
            <Search size={15} className="text-[#78716c] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar país…"
              className="flex-1 bg-transparent text-sm outline-none text-[#1a1a1a] placeholder:text-[#b4ada4]"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[#b4ada4]">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={toggleSearch}
          className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0",
            open
              ? "bg-[#1a1a1a] text-white shadow-[0_14px_28px_rgba(41,37,36,0.18)]"
              : "glass-button text-[#78716c] hover:text-[#1a1a1a]"
          )}
        >
          {open ? <X size={15} /> : <Search size={15} />}
        </button>
      </div>

      {/* Contador cuando se filtra */}
      <AnimatePresence>
        {open && query && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-[#78716c] mb-3 pl-1"
          >
            {filtered.length === 0
              ? "Sin resultados"
              : `${filtered.length} país${filtered.length !== 1 ? "es" : ""}`}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Lista */}
      <div className="space-y-2.5">
        {filtered.map((c, index) => (
          <motion.div
            key={c.id}
            className="rise-in"
            style={{ animationDelay: `${Math.min(index * 18, 180)}ms` }}
            whileTap={{ scale: 0.988 }}
          >
            <Link
              href={`/paises/${c.code.toLowerCase()}`}
              className="list-card flex items-center gap-3 rounded-[1.45rem] px-4 py-4 coin-card"
            >
              <div className="w-[3.25rem] h-[3.25rem] min-w-[3.25rem] rounded-[1.15rem] bg-white/86 shadow-sm flex items-center justify-center shrink-0">
                <span className="text-3xl">{c.flagEmoji}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-[11px] text-[#78716c]">Euro desde {c.yearJoined}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">{c.code}</span>
                </div>

                {/* Series anuales */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-[#78716c] w-10 shrink-0">Años</span>
                  <div className="flex-1 h-1.5 bg-white/72 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.yearsPct}%` }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: c.yearsPct >= 100 ? "#10b981" : "#e8a020",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[#1a1a1a] w-12 text-right shrink-0">
                    {c.completeYears}/{c.totalYears} sets
                  </span>
                </div>

                {/* Conmemorativas */}
                {c.totalComm > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#78716c] w-10 shrink-0">Conmem.</span>
                    <div className="flex-1 h-1.5 bg-white/72 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.commPct}%` }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: c.commPct >= 100 ? "#10b981" : "#8b5cf6",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[#1a1a1a] w-12 text-right shrink-0">
                      {c.ownedComm}/{c.totalComm}
                    </span>
                  </div>
                )}
              </div>

              <span className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#c7b9a4] shrink-0 shadow-sm">›</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

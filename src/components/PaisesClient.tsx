"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryStats } from "@/lib/stats";

export function PaisesClient({ stats }: { stats: CountryStats[] }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  const filtered = query.trim()
    ? stats.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : stats;

  return (
    <div className="min-h-screen px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className={cn(
          "text-2xl font-bold tracking-tight flex-1 transition-all duration-200 origin-left",
          open ? "opacity-0 scale-x-95 pointer-events-none w-0 flex-none overflow-hidden" : "opacity-100"
        )}>
          Países
        </h1>

        <div className={cn(
          "flex-1 transition-all duration-200",
          open ? "opacity-100" : "opacity-0 w-0 pointer-events-none flex-none overflow-hidden"
        )}>
          <div className="flex items-center gap-2 bg-[#f5f3ef] rounded-xl px-3 py-2">
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
          onClick={() => setOpen(o => !o)}
          className={cn(
            "w-9 h-9 rounded-full border flex items-center justify-center transition-all shrink-0",
            open
              ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
              : "border-[#f0ede8] text-[#78716c] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
          )}
        >
          {open ? <X size={15} /> : <Search size={15} />}
        </button>
      </div>

      {/* Contador cuando se filtra */}
      {open && query && (
        <p className="text-xs text-[#78716c] mb-3 pl-1">
          {filtered.length === 0
            ? "Sin resultados"
            : `${filtered.length} país${filtered.length !== 1 ? "es" : ""}`}
        </p>
      )}

      {/* Lista */}
      <div className="space-y-2.5">
        {filtered.map(c => (
          <Link
            key={c.id}
            href={`/paises/${c.code.toLowerCase()}`}
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#f0ede8] coin-card"
          >
            <span className="text-3xl shrink-0">{c.flagEmoji}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-[11px] text-[#78716c]">Euro desde {c.yearJoined}</p>
                </div>
              </div>

              {/* Series anuales */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-[#78716c] w-10 shrink-0">Años</span>
                <div className="flex-1 h-1.5 bg-[#f5f3ef] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.yearsPct}%`,
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
                  <div className="flex-1 h-1.5 bg-[#f5f3ef] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.commPct}%`,
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

            <span className="text-[#d4c9b8] shrink-0">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

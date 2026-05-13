"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, ChevronLeft, Check, CheckCheck, Search, X } from "lucide-react";
import Link from "next/link";
import { cn, formatDenomination } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

type CoinWithStatus = {
  id: number; denomination: number; year: number; type: string;
  description: string | null; seriesName: string | null;
  owned: boolean; wishlisted: boolean; isCommonIssue: number | boolean;
};

type Country = {
  id: number; code: string; name: string; flagEmoji: string; yearJoined: number;
};

export function CountryDetailClient({
  country, regularCoins, commCoins,
}: {
  country: Country;
  regularCoins: CoinWithStatus[];
  commCoins: CoinWithStatus[];
}) {
  const [tab, setTab] = useState<"regular" | "commemorative">("regular");
  const [burst, setBurst] = useState<{ id: number; kind: "OWNED" | "WISHLIST"; nonce: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const totalOwned = [...regularCoins, ...commCoins].filter(c => c.owned).length;
  const totalCoins = regularCoins.length + commCoins.length;
  const pct = totalCoins > 0 ? Math.round((totalOwned / totalCoins) * 100) : 0;

  function toggle(coinId: number, status: "OWNED" | "WISHLIST") {
    setBurst({ id: coinId, kind: status, nonce: Date.now() });
    startTransition(async () => {
      await fetch("/api/coins/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, status }),
      });
      router.refresh();
    });
  }

  function toggleYearWishlist(coinIds: number[]) {
    startTransition(async () => {
      await fetch("/api/coins/wishlist-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinIds }),
      });
      router.refresh();
    });
  }

  function toggleYearOwned(coinIds: number[]) {
    startTransition(async () => {
      await fetch("/api/coins/own-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinIds }),
      });
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto rise-in">
      <div className="sticky top-0 bg-[#fafaf8]/72 backdrop-blur-2xl border-b border-white/50 px-4 pt-4 pb-3 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/paises" className="glass-button w-10 h-10 flex items-center justify-center rounded-2xl text-[#1a1a1a]">
            <ChevronLeft size={18} />
          </Link>
          <motion.span
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-3xl"
          >
            {country.flagEmoji}
          </motion.span>
          <div>
            <h1 className="text-lg font-bold leading-tight">{country.name}</h1>
            <p className="text-xs text-[#78716c]">Euro desde {country.yearJoined}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xl font-bold text-[#e8a020]">{pct}%</p>
            <p className="text-[10px] text-[#78716c]">{totalOwned}/{totalCoins}</p>
          </div>
        </div>
        <div className="h-1.5 bg-[#f5f3ef] rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="h-full bg-[#e8a020] rounded-full"
          />
        </div>
        <div className="segment-shell flex gap-1">
          {(["regular", "commemorative"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative flex-1 py-2.5 rounded-[0.8rem] text-sm font-semibold transition-all",
                tab === t ? "text-[#0f172a]" : "text-[#6b7280]"
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="country-tab"
                  className="absolute inset-0 rounded-[0.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.62))] shadow-[0_12px_28px_rgba(41,37,36,0.12)]"
                  transition={{ type: "spring", stiffness: 430, damping: 32 }}
                />
              )}
              {tab === t && (
                <motion.span
                  layoutId="country-tab-glow"
                  className={cn(
                    "absolute inset-0 rounded-[0.8rem] opacity-60 blur-md",
                    t === "regular" ? "bg-[#4cc9f0]/30" : "bg-[#e8a020]/28"
                  )}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative flex items-center justify-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", t === "regular" ? "bg-[#4cc9f0]" : "bg-[#e8a020]")} />
                {t === "regular" ? `Regulares (${regularCoins.length})` : `Conmem. (${commCoins.length})`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <AnimatePresence mode="wait" initial={false}>
          {tab === "regular" ? (
            <motion.div
              key="regular"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22 }}
            >
              <RegularGrid coins={regularCoins} onToggle={toggle} onYearWishlist={toggleYearWishlist} onYearOwned={toggleYearOwned} disabled={pending} burst={burst} />
            </motion.div>
          ) : (
            <motion.div
              key="commemorative"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              <CommList coins={commCoins} onToggle={toggle} disabled={pending} burst={burst} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RegularGrid({ coins, onToggle, onYearWishlist, onYearOwned, disabled, burst }: {
  coins: CoinWithStatus[];
  onToggle: (id: number, s: "OWNED" | "WISHLIST") => void;
  onYearWishlist: (ids: number[]) => void;
  onYearOwned: (ids: number[]) => void;
  disabled: boolean;
  burst: { id: number; kind: "OWNED" | "WISHLIST"; nonce: number } | null;
}) {
  const byYear = coins.reduce<Record<number, CoinWithStatus[]>>((acc, c) => {
    if (!acc[c.year]) acc[c.year] = [];
    acc[c.year].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, yearCoins]) => {
        const owned      = yearCoins.filter(c => c.owned).length;
        const notOwned   = yearCoins.filter(c => !c.owned);
        const allWished  = notOwned.length > 0 && notOwned.every(c => c.wishlisted);
        const anyWished  = notOwned.some(c => c.wishlisted);
        const complete   = owned === yearCoins.length;

        return (
          <div
            key={year}
            className="rise-in"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "text-sm font-bold",
                  complete ? "text-emerald-500" : "text-[#1a1a1a]"
                )}>
                  {year}
                </h3>
                {complete && (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ¡Completo!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#78716c] mr-0.5">{owned}/{yearCoins.length}</span>
                {!complete && (
                  <>
                    {/* Marcar todas como poseídas */}
                    <button
                      disabled={disabled}
                      onClick={() => onYearOwned(yearCoins.map(c => c.id))}
                      title="Marcar todas como poseídas"
                      className="w-7 h-7 rounded-full border flex items-center justify-center transition-all border-[#f0ede8] text-[#d4c9b8] hover:border-[#e8a020] hover:text-[#e8a020]"
                    >
                      <CheckCheck size={12} />
                    </button>
                    {/* Wishlist del año */}
                    <button
                      disabled={disabled}
                      onClick={() => onYearWishlist(notOwned.map(c => c.id))}
                      title={allWished ? "Quitar año de deseos" : "Añadir año a deseos"}
                      className={cn(
                        "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                        allWished
                          ? "border-violet-400 bg-violet-50 text-violet-500"
                          : anyWished
                            ? "border-violet-200 text-violet-300"
                            : "border-[#f0ede8] text-[#d4c9b8] hover:border-violet-300 hover:text-violet-400"
                      )}
                    >
                      <Heart size={12} fill={allWished ? "currentColor" : "none"} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {yearCoins.map(coin => (
                <CoinTile key={coin.id} coin={coin} onToggle={onToggle} disabled={disabled} burst={burst} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoinTile({ coin, onToggle, disabled, burst }: {
  coin: CoinWithStatus;
  onToggle: (id: number, s: "OWNED" | "WISHLIST") => void;
  disabled: boolean;
  burst: { id: number; kind: "OWNED" | "WISHLIST"; nonce: number } | null;
}) {
  const isBurst = burst?.id === coin.id;

  return (
    <motion.button
      disabled={disabled}
      onClick={() => onToggle(coin.id, "OWNED")}
      whileTap={{ scale: 0.88 }}
      animate={isBurst ? { scale: [1, 1.13, 0.98, 1], rotate: [0, -3, 3, 0] } : { scale: 1, rotate: 0 }}
      transition={{ duration: 0.42 }}
      className={cn(
        "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all coin-card",
        coin.owned
          ? "bg-[#e8a020] border-[#e8a020] text-white shadow-md coin-shine"
          : coin.wishlisted
            ? "bg-violet-50 border-violet-300 text-violet-500"
            : "bg-white border-[#f0ede8] text-[#78716c]"
      )}
    >
      <AnimatePresence>
        {isBurst && burst.kind === "OWNED" && (
          <motion.span
            key={`ring-${burst.nonce}`}
            initial={{ scale: 0.7, opacity: 0.55 }}
            animate={{ scale: 1.55, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0 rounded-2xl border-2 border-[#e8a020]"
          />
        )}
      </AnimatePresence>
      {isBurst && burst.kind === "OWNED" && (
        <span key={`burst-${burst.nonce}`} className="coin-burst">
          <span /><span /><span /><span /><span /><span /><span />
        </span>
      )}
      {coin.owned && <Check size={10} className="absolute top-1.5 right-1.5 opacity-80" />}
      {coin.wishlisted && !coin.owned && (
        <Heart size={9} className="absolute top-1.5 right-1.5 fill-violet-400 text-violet-400" />
      )}
      <span className="text-xs font-bold">{formatDenomination(coin.denomination)}</span>
    </motion.button>
  );
}

function CommList({ coins, onToggle, disabled, burst }: {
  coins: CoinWithStatus[];
  onToggle: (id: number, s: "OWNED" | "WISHLIST") => void;
  disabled: boolean;
  burst: { id: number; kind: "OWNED" | "WISHLIST"; nonce: number } | null;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? coins.filter(c => c.description?.toLowerCase().includes(query.toLowerCase()) || String(c.year).includes(query))
    : coins;

  return (
    <div>
      {coins.length > 6 && (
        <div className="flex items-center gap-2 bg-[#f5f3ef] rounded-xl px-3 py-2 mb-3">
          <Search size={14} className="text-[#78716c] shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar conmemorativa…"
            className="flex-1 bg-transparent text-sm outline-none text-[#1a1a1a] placeholder:text-[#b4ada4]"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[#b4ada4]">
              <X size={13} />
            </button>
          )}
        </div>
      )}
      {query && (
        <p className="text-xs text-[#78716c] mb-2 pl-1">
          {filtered.length === 0 ? "Sin resultados" : `${filtered.length} moneda${filtered.length !== 1 ? "s" : ""}`}
        </p>
      )}
      <div className="space-y-2">
        {filtered.map((coin, index) => (
          <motion.div
            key={coin.id}
            animate={burst?.id === coin.id ? { scale: [1, 1.025, 1] } : { scale: 1 }}
            transition={{ duration: 0.34 }}
            className={cn(
              "relative bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all rise-in",
              coin.owned ? "border-[#e8a020]/40 bg-[#fef9ee]" : "border-[#f0ede8]"
            )}
            style={{ animationDelay: `${index * 25}ms` }}
          >
            {burst?.id === coin.id && burst.kind === "OWNED" && (
              <span key={`comm-burst-${burst.nonce}`} className="coin-burst">
                <span /><span /><span /><span /><span /><span /><span />
              </span>
            )}
            <div className={cn(
              "w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 text-sm font-bold",
              coin.owned ? "border-[#e8a020] bg-[#e8a020] text-white" : "border-[#f0ede8] text-[#78716c]"
            )}>
              {coin.owned ? <Check size={16} /> : "2€"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug line-clamp-1">{coin.description}</p>
              <p className="text-[11px] text-[#78716c] mt-0.5">
                {coin.year}{coin.seriesName ? ` · ${coin.seriesName}` : ""}
                {coin.isCommonIssue ? " · Emisión común" : ""}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                disabled={disabled}
                onClick={() => onToggle(coin.id, "WISHLIST")}
                className={cn(
                  "w-9 h-9 rounded-full border flex items-center justify-center transition-all",
                  coin.wishlisted ? "border-violet-400 bg-violet-50 text-violet-500" : "border-[#f0ede8] text-[#d4c9b8]"
                )}
              >
                <Heart size={15} fill={coin.wishlisted ? "currentColor" : "none"} />
              </button>
              <button
                disabled={disabled}
                onClick={() => onToggle(coin.id, "OWNED")}
                className={cn(
                  "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all",
                  coin.owned ? "border-[#e8a020] bg-[#e8a020] text-white" : "border-[#f0ede8] text-[#d4c9b8]"
                )}
              >
                <Check size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

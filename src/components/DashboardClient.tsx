"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CountryStats } from "@/lib/stats";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Upload, ArrowRight, Heart, Sparkles } from "lucide-react";

type DashboardData = {
  user: { name: string };
  wishlist: number;
  totalYears: number;
  completeYears: number;
  yearsPct: number;
  totalComm: number;
  ownedComm: number;
  commPct: number;
  countryStats: CountryStats[];
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const { user, wishlist, totalYears, completeYears, yearsPct, totalComm, ownedComm, commPct, countryStats } = data;

  // Ordenar países: primero los que tienen sets parciales (más motivante), luego completos, luego vacíos
  const sorted = [...countryStats].sort((a, b) => {
    const scoreA = a.completeYears + a.partialYears * 0.5 + a.ownedComm * 0.1;
    const scoreB = b.completeYears + b.partialYears * 0.5 + b.ownedComm * 0.1;
    return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen px-4 pt-6 pb-4 max-w-lg mx-auto rise-in">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#78716c] font-medium mb-0.5">Bienvenido</p>
          <h1 className="text-3xl font-black tracking-tight">{user.name}</h1>
        </div>
        <motion.div
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.5 }}
          className="w-12 h-12 rounded-[18px] bg-[#1a1a1a] text-[#e8a020] flex items-center justify-center shadow-xl coin-shine"
        >
          <Sparkles size={21} />
        </motion.div>
      </div>

      {/* Dos bloques de progreso separados */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <ProgressBlock
          label="Series anuales"
          sublabel="sets de 8 monedas"
          value={completeYears}
          total={totalYears}
          pct={yearsPct}
          color="#e8a020"
          icon="🏛"
        />
        <ProgressBlock
          label="Conmemorativas"
          sublabel="monedas de 2€"
          value={ownedComm}
          total={totalComm}
          pct={commPct}
          color="#8b5cf6"
          icon="⭐"
        />
      </div>

      {/* Mini stat — deseos */}
      {wishlist > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.16 }}
        >
        <Link
          href="/deseos"
          className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 mb-5 coin-card"
        >
          <Heart size={18} className="text-violet-500" fill="currentColor" />
          <p className="text-sm font-medium text-violet-700">
            Tienes <span className="font-bold">{wishlist}</span> moneda{wishlist !== 1 ? "s" : ""} en tu lista de deseos
          </p>
          <ArrowRight size={15} className="ml-auto text-violet-400" />
        </Link>
        </motion.div>
      )}

      {/* Sección países */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Por país</h2>
        <Link href="/paises" className="text-sm text-[#e8a020] font-medium">Ver todos →</Link>
      </div>

      <div className="space-y-2.5">
        {sorted.slice(0, 10).map((c, index) => (
          <CountryCard key={c.id} country={c} index={index} />
        ))}
      </div>

      {sorted.length > 10 && (
        <Link
          href="/paises"
          className="mt-3 flex items-center justify-center w-full py-3 rounded-2xl border border-[#f0ede8] text-sm text-[#78716c] font-medium bg-white"
        >
          Ver {sorted.length - 10} países más
        </Link>
      )}

      <BackupSection />
    </div>
  );
}

function ProgressBlock({
  label, sublabel, value, total, pct, color, icon,
}: {
  label: string; sublabel: string; value: number; total: number;
  pct: number; color: string; icon: string;
}) {
  return (
    <div className="surface rounded-[22px] p-4 coin-card rise-in">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-xs text-[#78716c] font-medium">{label}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums mb-0.5">
        {pct}<span className="text-xl text-[#78716c]">%</span>
      </p>
      <div className="h-1.5 bg-[#f5f3ef] rounded-full overflow-hidden my-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, transition: "width 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </div>
      <p className="text-[10px] text-[#78716c]">
        <span className="font-semibold" style={{ color }}>{value}</span> / {total} {sublabel}
      </p>
    </div>
  );
}

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    const res = await fetch("/api/collection/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gilito-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json() as { imported?: number; skipped?: number; error?: string };
      if (data.error) throw new Error(data.error);
      setMsg({ text: `${data.imported} monedas restauradas${data.skipped ? `, ${data.skipped} no encontradas` : ""}`, ok: true });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Error al importar", ok: false });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-6 border-t border-[#f0ede8] pt-5">
      <p className="text-xs text-[#78716c] font-medium mb-3 uppercase tracking-wide">Copia de seguridad</p>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-[#f0ede8] text-sm font-medium text-[#44403c] shadow-sm active:scale-95 transition-transform"
        >
          <Download size={15} /> Exportar
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-[#f0ede8] text-sm font-medium text-[#44403c] shadow-sm active:scale-95 transition-transform disabled:opacity-50"
        >
          <Upload size={15} /> {busy ? "Importando..." : "Restaurar"}
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
      <AnimatePresence>
        {msg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={cn("mt-2 text-xs text-center font-medium", msg.ok ? "text-emerald-600" : "text-red-500")}
          >
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountryCard({ country: c, index }: { country: CountryStats; index: number }) {
  return (
    <div className="rise-in" style={{ animationDelay: `${120 + index * 35}ms` }}>
      <Link
        href={`/paises/${c.code.toLowerCase()}`}
        className="flex items-center gap-3 bg-white/90 rounded-2xl px-4 py-3.5 shadow-sm border border-[#f0ede8] coin-card"
      >
      <span className="text-2xl shrink-0">{c.flagEmoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-2">{c.name}</p>

        {/* Fila series anuales */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-[#78716c] w-14 shrink-0">Anuales</span>
          <div className="flex-1 h-1.5 bg-[#f5f3ef] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${c.yearsPct}%`,
                backgroundColor: c.yearsPct >= 100 ? "#10b981" : "#e8a020",
              }}
            />
          </div>
          <span className="text-[10px] font-semibold text-[#78716c] w-10 text-right shrink-0">
            {c.completeYears}/{c.totalYears}
          </span>
        </div>

        {/* Fila conmemorativas */}
        {c.totalComm > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#78716c] w-14 shrink-0">Conmem.</span>
            <div className="flex-1 h-1.5 bg-[#f5f3ef] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${c.commPct}%`,
                  backgroundColor: c.commPct >= 100 ? "#10b981" : "#8b5cf6",
                }}
              />
            </div>
            <span className="text-[10px] font-semibold text-[#78716c] w-10 text-right shrink-0">
              {c.ownedComm}/{c.totalComm}
            </span>
          </div>
        )}
      </div>

        <ArrowRight size={15} className="text-[#d4c9b8] shrink-0" />
      </Link>
    </div>
  );
}

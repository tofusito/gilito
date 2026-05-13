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
      <div className="mb-5 rounded-[2rem] dashboard-card px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#78716c] font-medium mb-1">Bienvenido</p>
            <h1 className="text-4xl font-black tracking-tight leading-none text-gradient">{user.name}</h1>
            <p className="text-sm text-[#6b7280] mt-2">Tu colección, tus series y tus siguientes objetivos.</p>
          </div>
          <motion.div
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.5 }}
            className="w-14 h-14 rounded-[20px] bg-[#1a1a1a] text-[#e8a020] flex items-center justify-center shadow-[0_18px_36px_rgba(41,37,36,0.22)] coin-shine"
          >
            <Sparkles size={22} />
          </motion.div>
        </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric label="Deseos" value={wishlist} accent="text-violet-500" />
        <MiniMetric label="Sets" value={completeYears} accent="text-[#e8a020]" />
        <MiniMetric label="2€" value={ownedComm} accent="text-[#4cc9f0]" />
      </div>
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
          className="list-card flex items-center gap-3 rounded-[1.45rem] px-4 py-3.5 mb-5 coin-card"
        >
          <div className="w-10 h-10 rounded-2xl bg-violet-100/90 flex items-center justify-center shadow-sm">
            <Heart size={18} className="text-violet-500" fill="currentColor" />
          </div>
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
          className="list-card mt-3 flex items-center justify-center w-full py-3 rounded-[1.35rem] text-sm text-[#78716c] font-medium"
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
    <motion.div
      whileTap={{ scale: 0.985 }}
      className="dashboard-card rounded-[1.6rem] p-4 coin-card rise-in"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{icon}</span>
          <p className="text-xs text-[#78716c] font-medium">{label}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">{sublabel}</span>
      </div>
      <p className="text-3xl font-black tabular-nums mb-0.5">
        {pct}<span className="text-xl text-[#78716c]">%</span>
      </p>
      <div className="h-2 bg-white/70 rounded-full overflow-hidden my-3 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="text-[10px] text-[#78716c]">
        <span className="font-semibold" style={{ color }}>{value}</span> / {total} {sublabel}
      </p>
    </motion.div>
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
    <div className="mt-6 pt-5 dashboard-card rounded-[1.7rem] px-4 pb-4">
      <p className="text-xs text-[#78716c] font-medium mb-3 uppercase tracking-wide">Copia de seguridad</p>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="glass-button flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-[#44403c] active:scale-95 transition-transform"
        >
          <Download size={15} /> Exportar
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="glass-button flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-[#44403c] active:scale-95 transition-transform disabled:opacity-50"
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
        className="list-card flex items-center gap-3 rounded-[1.45rem] px-4 py-4 coin-card"
      >
      <div className="w-12 h-12 rounded-2xl bg-white/85 shadow-sm flex items-center justify-center shrink-0">
        <span className="text-2xl">{c.flagEmoji}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">{c.name}</p>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#9ca3af]">{c.code}</span>
        </div>

        {/* Fila series anuales */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-[#78716c] w-14 shrink-0">Anuales</span>
          <div className="flex-1 h-1.5 bg-white/70 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${c.yearsPct}%` }}
              className="h-full rounded-full"
              style={{
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
            <div className="flex-1 h-1.5 bg-white/70 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.commPct}%` }}
                className="h-full rounded-full"
                style={{
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

function MiniMetric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-white/68 border border-white/70 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#9ca3af]">{label}</p>
      <p className={cn("text-lg font-black mt-1", accent)}>{value}</p>
    </div>
  );
}

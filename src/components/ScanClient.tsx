"use client";

import { useState, useRef } from "react";
import { Camera, Sparkles, Check, Loader2, AlertCircle, X, RefreshCcw } from "lucide-react";
import { cn, formatDenomination } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type ScanResult = {
  country: string; countryCode: string; denomination: number;
  year: number; isCommemorative: boolean; description: string | null;
  confidence: number;
  coinId?: number | null;
};

type Phase = "idle" | "preview" | "loading" | "result" | "error";

export function ScanClient() {
  const [image, setImage]     = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [result, setResult]   = useState<ScanResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [added, setAdded]     = useState(false);
  const [phase, setPhase]     = useState<Phase>("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const router  = useRouter();

  function handleFile(file: File) {
    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target?.result as string);
      setResult(null);
      setError(null);
      setAdded(false);
      setPhase("preview");
    };
    reader.readAsDataURL(file);
  }

  async function scan() {
    if (!image) return;
    setPhase("loading");
    setError(null);
    setResult(null);

    const base64 = image.split(",")[1];
    try {
      const res  = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json() as ScanResult & { error?: string };
      if (data.error) { setError(data.error); setPhase("error"); return; }
      setResult(data);
      setPhase("result");
    } catch {
      setError("No se pudo analizar la imagen");
      setPhase("error");
    }
  }

  async function addToCollection() {
    if (!result) return;

    // coinId ya resuelto por el scan — si no, fallback a /api/coins/find
    let coinId = result.coinId ?? null;
    if (!coinId) {
      const res  = await fetch("/api/coins/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: result.countryCode,
          denomination: result.denomination,
          year: result.year,
          isCommemorative: result.isCommemorative,
          description: result.description,
        }),
      });
      const data = await res.json() as { coinId?: number; error?: string };
      coinId = data.coinId ?? null;
    }

    if (coinId) {
      await fetch("/api/coins/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, status: "OWNED" }),
      });
      setAdded(true);
      router.refresh();
    }
  }

  function reset() {
    setImage(null);
    setResult(null);
    setError(null);
    setAdded(false);
    setPhase("idle");
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto relative overflow-hidden">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* ── IDLE: pantalla de bienvenida centrada ── */}
      <AnimatePresence mode="wait" initial={false}>
      {phase === "idle" && (
        <motion.div
          key="idle"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          className="flex-1 flex flex-col items-center justify-center px-8 pb-24 gap-8"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, -2, 2, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-24 h-24 rounded-[28px] bg-[#1a1a1a] flex items-center justify-center shadow-2xl coin-shine"
            >
              <span className="absolute inset-0 rounded-[28px] border border-[#e8a020]/30 pulse-ring" />
              <Sparkles size={38} className="text-[#e8a020]" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Identificar moneda</h1>
              <p className="text-sm text-[#78716c] mt-1.5">Haz una foto o sube de galería<br/>y la IA reconocerá la moneda</p>
            </div>
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full max-w-xs py-4 bg-[#1a1a1a] text-white rounded-2xl font-semibold flex items-center justify-center gap-2.5 text-base shadow-lg coin-card"
          >
            <Camera size={20} />
            Añadir foto
          </button>
        </motion.div>
      )}

      {/* ── PREVIEW: imagen + botón de escanear ── */}
      {phase === "preview" && image && (
        <motion.div
          key="preview"
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="flex-1 flex flex-col"
        >
          {/* Imagen full width */}
          <div className="relative flex-1 bg-[#1a1a1a] flex items-center justify-center scan-grid" style={{ minHeight: 320 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Moneda" className="w-full h-full object-contain" style={{ maxHeight: 420 }} />
            <button
              onClick={reset}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel inferior */}
          <div className="bg-[#fafaf8] px-6 pt-5 pb-8">
            <p className="text-center text-sm text-[#78716c] mb-4">Imagen cargada correctamente</p>
            <button
              onClick={scan}
              className="w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 text-base shadow-md coin-card"
            >
              <Sparkles size={18} />
              Identificar con IA
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full mt-3 py-3 rounded-2xl border border-[#f0ede8] text-[#78716c] font-medium text-sm"
            >
              Cambiar foto
            </button>
          </div>
        </motion.div>
      )}

      {/* ── LOADING: animación centrada ── */}
      {phase === "loading" && image && (
        <motion.div
          key="loading"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col"
        >
          <div className="relative flex-1 bg-[#1a1a1a] flex items-center justify-center scan-grid overflow-hidden" style={{ minHeight: 320 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Moneda" className="w-full h-full object-contain opacity-40" style={{ maxHeight: 420 }} />
            <div className="absolute inset-x-0 top-1/2 h-20 bg-gradient-to-b from-transparent via-[#e8a020]/35 to-transparent scan-line" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-[#e8a020]/50 pulse-ring" />
                <Loader2 size={34} className="animate-spin text-[#e8a020]" />
              </div>
              <p className="text-white font-semibold text-base drop-shadow">Analizando con Gemini...</p>
            </div>
          </div>
          <div className="bg-[#fafaf8] px-6 py-6">
            <div className="h-12 rounded-2xl bg-[#f5f3ef] animate-pulse" />
          </div>
        </motion.div>
      )}

      {/* ── ERROR ── */}
      {phase === "error" && (
        <motion.div
          key="error"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="flex-1 flex flex-col items-center justify-center px-8 pb-24 gap-6"
        >
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={34} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#1a1a1a]">No se pudo identificar</p>
            <p className="text-sm text-[#78716c] mt-1">{error}</p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 py-3 px-6 rounded-2xl border border-[#f0ede8] text-[#78716c] font-medium"
          >
            <RefreshCcw size={15} />
            Intentar de nuevo
          </button>
        </motion.div>
      )}

      {/* ── RESULT: imagen + bottom sheet ── */}
      {phase === "result" && result && image && (
        <motion.div
          key="result"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="flex-1 flex flex-col"
        >
          <div className="relative bg-[#1a1a1a] flex items-center justify-center" style={{ height: 260 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Moneda" className="w-full h-full object-contain" />
            {/* Badge de confianza */}
            <div className={cn(
              "absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm",
              result.confidence >= 80 ? "bg-emerald-500/90 text-white"
                : result.confidence >= 60 ? "bg-[#e8a020]/90 text-white"
                : "bg-orange-400/90 text-white"
            )}>
              {result.confidence}% confianza
            </div>
            <button
              onClick={reset}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Bottom sheet */}
          <div className="flex-1 bg-[#fafaf8] rounded-t-3xl -mt-4 px-5 pt-5 pb-8 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
            {/* Handle */}
            <div className="w-10 h-1 bg-[#e5e1db] rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] text-[#78716c] font-medium uppercase tracking-wider">Moneda identificada</p>
                <h2 className="text-xl font-bold leading-tight mt-0.5">{result.country}</h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#e8a020] flex items-center justify-center shrink-0 coin-shine">
                <span className="text-white font-bold text-sm">{formatDenomination(result.denomination)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <InfoBlock label="Valor" value={formatDenomination(result.denomination)} />
              <InfoBlock label="Año" value={String(result.year)} />
              <InfoBlock label="Tipo" value={result.isCommemorative ? "Conmem." : "Regular"} />
            </div>

            <div className="bg-[#fef9ee] border border-[#e8a020]/20 rounded-2xl px-4 py-3 mb-4">
              <p className="text-[10px] text-[#b45309] font-semibold uppercase tracking-wider mb-1">Descripción</p>
              <p className="text-sm text-[#1a1a1a] leading-relaxed">
                {result.description ?? "Sin descripción disponible"}
              </p>
            </div>

            {added ? (
              <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 rounded-2xl text-emerald-600 font-semibold">
                <Check size={18} />
                Añadida a tu colección
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 py-3.5 rounded-2xl border border-[#f0ede8] text-[#78716c] font-medium text-sm"
                >
                  Otra foto
                </button>
                <button
                  onClick={addToCollection}
                  className="flex-1 py-3.5 rounded-2xl bg-[#e8a020] text-white font-semibold text-sm shadow-md coin-card"
                >
                  Añadir a colección
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f5f3ef] rounded-xl p-3 text-center">
      <p className="text-[10px] text-[#78716c] uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

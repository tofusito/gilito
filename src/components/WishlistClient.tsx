"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Heart, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDenomination } from "@/lib/utils";
import { motion } from "framer-motion";

type WishItem = {
  ucId: number; coinId: number; denomination: number; year: number;
  type: string; description: string | null;
  countryName: string; countryFlag: string; countryCode: string;
};

export function WishlistClient({ items }: { items: WishItem[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove(coinId: number) {
    startTransition(async () => {
      await fetch("/api/coins/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, status: "WISHLIST" }),
      });
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-4 max-w-lg mx-auto rise-in">
      <div className="dashboard-card rounded-[1.8rem] px-5 py-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.2rem] bg-violet-100/90 flex items-center justify-center shadow-sm">
            <Heart size={22} className="text-violet-500" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient">Lista de deseos</h1>
            <p className="text-sm text-[#78716c] mt-1">Tus próximas monedas pendientes.</p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="dashboard-card rounded-[1.8rem] text-center py-16 px-6">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <Heart size={40} className="mx-auto text-[#f0ede8] mb-3" />
          </motion.div>
          <p className="text-[#78716c] font-medium">Tu lista de deseos está vacía</p>
          <p className="text-sm text-[#78716c]/70 mt-1">Marca monedas con ♥ para añadirlas aquí</p>
          <Link
            href="/paises"
            className="mt-4 inline-block px-5 py-2.5 bg-[#1a1a1a] text-white rounded-2xl text-sm font-medium shadow-[0_14px_28px_rgba(41,37,36,0.18)]"
          >
            Explorar países
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <motion.div
              key={item.ucId}
              className="list-card rounded-[1.45rem] px-4 py-3.5 flex items-center gap-3 coin-card rise-in"
              style={{ animationDelay: `${index * 35}ms` }}
              whileTap={{ scale: 0.988 }}
            >
              <div className="w-11 h-11 rounded-2xl bg-white/84 shadow-sm flex items-center justify-center shrink-0">
                <span className="text-2xl">{item.countryFlag}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {item.type === "COMMEMORATIVE" ? item.description : formatDenomination(item.denomination)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-[#78716c]">
                    {item.countryName} · {item.year}
                  </p>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-violet-400">Watch</span>
                </div>
              </div>
              <button
                disabled={pending}
                onClick={() => remove(item.coinId)}
                className="glass-button w-10 h-10 rounded-2xl flex items-center justify-center text-[#d4c9b8] hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

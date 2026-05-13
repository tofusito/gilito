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
      <div className="flex items-center gap-2 mb-6">
        <Heart size={22} className="text-violet-400" fill="currentColor" />
        <h1 className="text-2xl font-bold tracking-tight">Lista de deseos</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
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
            className="mt-4 inline-block px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium"
          >
            Explorar países
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.ucId}
              className="bg-white/92 rounded-2xl border border-[#f0ede8] px-4 py-3.5 flex items-center gap-3 coin-card rise-in"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <span className="text-2xl">{item.countryFlag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {item.type === "COMMEMORATIVE" ? item.description : formatDenomination(item.denomination)}
                </p>
                <p className="text-[11px] text-[#78716c]">
                  {item.countryName} · {item.year}
                </p>
              </div>
              <button
                disabled={pending}
                onClick={() => remove(item.coinId)}
                className="w-9 h-9 rounded-full border border-[#f0ede8] flex items-center justify-center text-[#d4c9b8] hover:text-red-400 hover:border-red-200 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

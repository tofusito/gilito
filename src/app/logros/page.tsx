export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users } from "@/db/schema";
import { computeAchievements, CATEGORY_LABELS } from "@/lib/achievements";
import type { Achievement } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export default async function LogrosPage() {
  const user = db.select().from(users).limit(1).all()[0];
  const achievements = user ? computeAchievements(user.id) : [];

  const unlocked = achievements.filter(a => a.unlocked);
  const locked   = achievements.filter(a => !a.unlocked);

  // Agrupar por categoría (solo los bloqueados)
  const categories = Object.keys(CATEGORY_LABELS) as Achievement["category"][];

  return (
    <div className="min-h-screen px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Logros</h1>
        <p className="text-sm text-[#78716c] mt-0.5">
          {unlocked.length} desbloqueados · {achievements.length} en total
        </p>
      </div>

      {/* Barra global */}
      <div className="bg-white rounded-2xl border border-[#f0ede8] p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso total</span>
          <span className="text-sm font-bold text-[#e8a020]">
            {unlocked.length}/{achievements.length}
          </span>
        </div>
        <div className="h-2 bg-[#f5f3ef] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#e8a020] rounded-full transition-all duration-700"
            style={{ width: `${Math.round((unlocked.length / achievements.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Desbloqueados recientes */}
      {unlocked.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-3">
            ✅ Desbloqueados
          </h2>
          <div className="space-y-2">
            {unlocked.map(a => (
              <AchievementCard key={a.key} achievement={a} />
            ))}
          </div>
        </section>
      )}

      {/* Pendientes por categoría — solo los 3 más cercanos */}
      {categories.map(cat => {
        const items = locked
          .filter(a => a.category === cat)
          .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
          .slice(0, 3);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mb-5">
            <h2 className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="space-y-2">
              {items.map(a => (
                <AchievementCard key={a.key} achievement={a} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: Achievement }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border px-4 py-3.5 flex items-center gap-3 shadow-sm",
      a.unlocked ? "border-[#e8a020]/30 bg-[#fef9ee]" : "border-[#f0ede8] opacity-75"
    )}>
      <div className={cn(
        "w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0",
        a.unlocked ? "bg-[#e8a020]/15" : "bg-[#f5f3ef]"
      )}>
        {a.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold leading-tight",
          a.unlocked ? "text-[#1a1a1a]" : "text-[#78716c]"
        )}>
          {a.title}
        </p>
        <p className="text-[11px] text-[#78716c] mt-0.5 leading-snug">
          {a.description}
        </p>

        {/* Barra de progreso para los no desbloqueados */}
        {!a.unlocked && a.progress !== undefined && (
          <div className="mt-2">
            <div className="h-1 bg-[#f0ede8] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#d4c9b8] transition-all"
                style={{ width: `${a.progress}%` }}
              />
            </div>
            {a.progressLabel && (
              <p className="text-[10px] text-[#78716c] mt-0.5">{a.progressLabel}</p>
            )}
          </div>
        )}
      </div>

      {a.unlocked && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#e8a020] flex items-center justify-center">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
    </div>
  );
}

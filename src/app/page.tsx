export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users, userCoins } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { DashboardClient } from "@/components/DashboardClient";
import { getGlobalStats } from "@/lib/stats";

export default async function HomePage() {
  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return <div className="p-8 text-center text-[#78716c]">Cargando...</div>;

  const wishlist = db
    .select({ count: count() })
    .from(userCoins)
    .where(and(eq(userCoins.userId, user.id), eq(userCoins.status, "WISHLIST")))
    .all()[0].count;

  const stats = getGlobalStats(user.id);

  return <DashboardClient data={{ user, wishlist, ...stats }} />;
}

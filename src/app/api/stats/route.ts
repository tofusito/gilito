export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { coins, userCoins, users, countries } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET() {
  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const totalCoins = db.select({ count: count() }).from(coins).all()[0].count;

  const ownedCoins = db
    .select({ count: count() })
    .from(userCoins)
    .where(and(eq(userCoins.userId, user.id), eq(userCoins.status, "OWNED")))
    .all()[0].count;

  const wishlistCoins = db
    .select({ count: count() })
    .from(userCoins)
    .where(and(eq(userCoins.userId, user.id), eq(userCoins.status, "WISHLIST")))
    .all()[0].count;

  const totalCommemorative = db
    .select({ count: count() })
    .from(coins)
    .where(eq(coins.type, "COMMEMORATIVE"))
    .all()[0].count;

  const ownedCommemorative = db
    .select({ count: count() })
    .from(userCoins)
    .innerJoin(coins, eq(userCoins.coinId, coins.id))
    .where(and(
      eq(userCoins.userId, user.id),
      eq(userCoins.status, "OWNED"),
      eq(coins.type, "COMMEMORATIVE")
    ))
    .all()[0].count;

  // Progreso por país
  const allCountries = db.select().from(countries).all();
  const countryStats = allCountries.map(c => {
    const total = db.select({ count: count() }).from(coins).where(eq(coins.countryId, c.id)).all()[0].count;
    const owned = db
      .select({ count: count() })
      .from(userCoins)
      .innerJoin(coins, eq(userCoins.coinId, coins.id))
      .where(and(eq(userCoins.userId, user.id), eq(userCoins.status, "OWNED"), eq(coins.countryId, c.id)))
      .all()[0].count;
    return {
      code: c.code,
      name: c.name,
      flagEmoji: c.flagEmoji,
      total,
      owned,
      pct: total > 0 ? Math.round((owned / total) * 100) : 0,
    };
  });

  return NextResponse.json({
    totalCoins,
    ownedCoins,
    wishlistCoins,
    totalCommemorative,
    ownedCommemorative,
    overallPct: totalCoins > 0 ? Math.round((ownedCoins / totalCoins) * 100) : 0,
    countryStats,
  });
}

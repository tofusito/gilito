export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { countries, coins, userCoins, users } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET() {
  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return NextResponse.json([]);

  const allCountries = db.select().from(countries).orderBy(countries.name).all();

  const result = allCountries.map(c => {
    const total = db.select({ count: count() }).from(coins).where(eq(coins.countryId, c.id)).all()[0].count;
    const owned = db
      .select({ count: count() })
      .from(userCoins)
      .innerJoin(coins, eq(userCoins.coinId, coins.id))
      .where(and(eq(userCoins.userId, user.id), eq(userCoins.status, "OWNED"), eq(coins.countryId, c.id)))
      .all()[0].count;

    const totalComm = db
      .select({ count: count() })
      .from(coins)
      .where(and(eq(coins.countryId, c.id), eq(coins.type, "COMMEMORATIVE")))
      .all()[0].count;

    const ownedComm = db
      .select({ count: count() })
      .from(userCoins)
      .innerJoin(coins, eq(userCoins.coinId, coins.id))
      .where(and(
        eq(userCoins.userId, user.id),
        eq(userCoins.status, "OWNED"),
        eq(coins.countryId, c.id),
        eq(coins.type, "COMMEMORATIVE")
      ))
      .all()[0].count;

    return {
      ...c,
      total,
      owned,
      totalComm,
      ownedComm,
      pct: total > 0 ? Math.round((owned / total) * 100) : 0,
    };
  });

  return NextResponse.json(result);
}

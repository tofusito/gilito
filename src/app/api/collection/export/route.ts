export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userCoins, coins, countries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = db
    .select({
      countryCode:   countries.code,
      year:          coins.year,
      denomination:  coins.denomination,
      type:          coins.type,
      description:   coins.description,
      status:        userCoins.status,
      condition:     userCoins.condition,
      quantity:      userCoins.quantity,
      notes:         userCoins.notes,
      acquiredAt:    userCoins.acquiredAt,
      acquiredFrom:  userCoins.acquiredFrom,
      pricePaid:     userCoins.pricePaid,
    })
    .from(userCoins)
    .innerJoin(coins, eq(userCoins.coinId, coins.id))
    .innerJoin(countries, eq(coins.countryId, countries.id))
    .all();

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: rows.length,
    coins: rows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gilito-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

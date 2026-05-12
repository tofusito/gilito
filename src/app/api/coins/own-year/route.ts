export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userCoins, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// Toggle owned para todas las monedas de un año:
// si todas ya son OWNED → eliminar; si no → marcar todas como OWNED
export async function POST(req: NextRequest) {
  const { coinIds } = await req.json() as { coinIds: number[] };

  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const existing = db.select().from(userCoins)
    .where(and(eq(userCoins.userId, user.id), inArray(userCoins.coinId, coinIds)))
    .all();

  const ownedIds = new Set(existing.filter(u => u.status === "OWNED").map(u => u.coinId));
  const allOwned = coinIds.length > 0 && coinIds.every(id => ownedIds.has(id));

  if (allOwned) {
    for (const id of coinIds) {
      db.delete(userCoins)
        .where(and(eq(userCoins.userId, user.id), eq(userCoins.coinId, id)))
        .run();
    }
    return NextResponse.json({ action: "removed", count: coinIds.length });
  } else {
    for (const id of coinIds) {
      if (ownedIds.has(id)) continue;
      // Reemplazar wishlist si existe
      const existingRow = existing.find(e => e.coinId === id);
      if (existingRow) {
        db.delete(userCoins)
          .where(and(eq(userCoins.userId, user.id), eq(userCoins.coinId, id)))
          .run();
      }
      db.insert(userCoins).values({ userId: user.id, coinId: id, status: "OWNED" }).run();
    }
    return NextResponse.json({ action: "added", count: coinIds.length });
  }
}

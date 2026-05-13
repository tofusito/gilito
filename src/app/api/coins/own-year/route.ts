export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, getSqlite } from "@/db";
import { coins, userCoins, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isObject, jsonError, readJsonBody, validateCoinIds } from "@/lib/api";

// Toggle owned para todas las monedas de un año:
// si todas ya son OWNED → eliminar; si no → marcar todas como OWNED
export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  if (!isObject(body.data)) return jsonError("Payload inválido");

  const coinIds = validateCoinIds(body.data.coinIds);
  if (!coinIds) return jsonError("Lista de monedas inválida");

  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const validIds = new Set(
    db.select({ id: coins.id }).from(coins).where(inArray(coins.id, coinIds)).all().map(c => c.id)
  );
  if (validIds.size !== coinIds.length) return jsonError("Alguna moneda no existe", 404);

  const existing = db.select().from(userCoins)
    .where(and(eq(userCoins.userId, user.id), inArray(userCoins.coinId, coinIds)))
    .all();

  const ownedIds = new Set(existing.filter(u => u.status === "OWNED").map(u => u.coinId));
  const allOwned = coinIds.length > 0 && coinIds.every(id => ownedIds.has(id));

  if (allOwned) {
    db.delete(userCoins)
      .where(and(eq(userCoins.userId, user.id), inArray(userCoins.coinId, coinIds)))
      .run();
    return NextResponse.json({ action: "removed", count: coinIds.length });
  } else {
    const toUpsert   = coinIds.filter(id => !ownedIds.has(id));
    const toReplace  = toUpsert.filter(id => existing.some(e => e.coinId === id));
    getSqlite().transaction(() => {
      if (toReplace.length > 0) {
        db.delete(userCoins)
          .where(and(eq(userCoins.userId, user.id), inArray(userCoins.coinId, toReplace)))
          .run();
      }
      if (toUpsert.length > 0) {
        db.insert(userCoins)
          .values(toUpsert.map(id => ({ userId: user.id, coinId: id, status: "OWNED" as const })))
          .run();
      }
    })();
    return NextResponse.json({ action: "added", count: toUpsert.length });
  }
}

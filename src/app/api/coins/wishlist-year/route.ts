export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coins, userCoins, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isObject, jsonError, readJsonBody, validateCoinIds } from "@/lib/api";

// Añade o quita de wishlist todas las monedas de un año de un país
// Si ya están todas → las elimina. Si no → las añade (solo las que no estén owned)
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

  // Ver cuáles de estas monedas ya están en wishlist
  const existing = db.select().from(userCoins)
    .where(and(eq(userCoins.userId, user.id), inArray(userCoins.coinId, coinIds)))
    .all();

  const ownedIds    = new Set(existing.filter(u => u.status === "OWNED").map(u => u.coinId));
  const wishIds     = new Set(existing.filter(u => u.status === "WISHLIST").map(u => u.coinId));

  // Solo operamos sobre las no poseídas
  const notOwned = coinIds.filter(id => !ownedIds.has(id));

  // Toggle: si todas las no-poseídas ya están en wishlist → eliminar; si no → añadir las que faltan
  const allWishlisted = notOwned.length > 0 && notOwned.every(id => wishIds.has(id));

  if (allWishlisted) {
    db.delete(userCoins)
      .where(and(eq(userCoins.userId, user.id), inArray(userCoins.coinId, notOwned)))
      .run();
    return NextResponse.json({ action: "removed", count: notOwned.length });
  } else {
    const toAdd = notOwned.filter(id => !wishIds.has(id));
    if (toAdd.length > 0) {
      db.insert(userCoins)
        .values(toAdd.map(id => ({ userId: user.id, coinId: id, status: "WISHLIST" as const })))
        .run();
    }
    return NextResponse.json({ action: "added", count: toAdd.length });
  }
}

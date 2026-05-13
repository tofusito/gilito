export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coins, userCoins, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isCoinStatus, isObject, isPositiveInt, jsonError, readJsonBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  if (!isObject(body.data)) return jsonError("Payload inválido");

  const { coinId, status } = body.data;
  if (!isPositiveInt(coinId) || !isCoinStatus(status)) {
    return jsonError("Moneda o estado inválido");
  }

  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const coin = db.select({ id: coins.id }).from(coins).where(eq(coins.id, coinId)).all()[0];
  if (!coin) return jsonError("Moneda no encontrada", 404);

  const existing = db
    .select()
    .from(userCoins)
    .where(and(eq(userCoins.userId, user.id), eq(userCoins.coinId, coinId)))
    .all()[0];

  if (existing) {
    if (existing.status === status) {
      // Toggle off — eliminar
      db.delete(userCoins).where(eq(userCoins.id, existing.id)).run();
      return NextResponse.json({ action: "removed" });
    } else {
      // Cambiar estado
      db.update(userCoins)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(eq(userCoins.id, existing.id))
        .run();
      return NextResponse.json({ action: "updated", status });
    }
  }

  db.insert(userCoins).values({
    userId: user.id,
    coinId,
    status,
  }).run();

  return NextResponse.json({ action: "added", status });
}

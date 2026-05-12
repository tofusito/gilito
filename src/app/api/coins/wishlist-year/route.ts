export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userCoins, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// Añade o quita de wishlist todas las monedas de un año de un país
// Si ya están todas → las elimina. Si no → las añade (solo las que no estén owned)
export async function POST(req: NextRequest) {
  const { coinIds } = await req.json() as { coinIds: number[] };

  const user = db.select().from(users).limit(1).all()[0];
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

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
    // Quitar de wishlist
    for (const id of notOwned) {
      db.delete(userCoins)
        .where(and(eq(userCoins.userId, user.id), eq(userCoins.coinId, id)))
        .run();
    }
    return NextResponse.json({ action: "removed", count: notOwned.length });
  } else {
    // Añadir las que no están aún (ni owned ni wishlisted)
    const toAdd = notOwned.filter(id => !wishIds.has(id));
    for (const id of toAdd) {
      db.insert(userCoins).values({ userId: user.id, coinId: id, status: "WISHLIST" }).run();
    }
    return NextResponse.json({ action: "added", count: toAdd.length });
  }
}

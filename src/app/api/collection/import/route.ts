export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userCoins, coins, countries, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type BackupEntry = {
  countryCode: string;
  year: number;
  denomination: number;
  type: "REGULAR" | "COMMEMORATIVE";
  description?: string | null;
  status: "OWNED" | "WISHLIST" | "DUPLICATE";
  condition?: string | null;
  quantity?: number;
  notes?: string | null;
  acquiredAt?: string | null;
  acquiredFrom?: string | null;
  pricePaid?: number | null;
};

export async function POST(req: NextRequest) {
  let body: { version?: number; coins?: BackupEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.coins) || body.coins.length === 0) {
    return NextResponse.json({ error: "El archivo no contiene monedas" }, { status: 400 });
  }

  const user = db.select().from(users).all()[0];
  if (!user) return NextResponse.json({ error: "Sin usuario" }, { status: 500 });

  let imported = 0;
  let skipped = 0;

  for (const entry of body.coins) {
    const country = db.select().from(countries)
      .where(eq(countries.code, entry.countryCode.toUpperCase())).all()[0];
    if (!country) { skipped++; continue; }

    // Buscar la moneda por clave natural
    const coinRows = db.select().from(coins).where(
      and(
        eq(coins.countryId, country.id),
        eq(coins.year, entry.year),
        eq(coins.denomination, entry.denomination),
        eq(coins.type, entry.type),
      )
    ).all();

    let coin = coinRows[0];

    // Para conmemorativas, afinar por descripción si hay varias del mismo año
    if (entry.type === "COMMEMORATIVE" && coinRows.length > 1 && entry.description) {
      const match = coinRows.find(c => c.description === entry.description);
      if (match) coin = match;
    }

    if (!coin) { skipped++; continue; }

    // Upsert: si ya existe la entrada, actualizarla; si no, insertar
    const existing = db.select().from(userCoins).where(
      and(eq(userCoins.userId, user.id), eq(userCoins.coinId, coin.id))
    ).all()[0];

    const values = {
      userId:      user.id,
      coinId:      coin.id,
      status:      entry.status,
      condition:   (entry.condition as "CIRCULATED" | "XF" | "UNC" | "BU" | "PROOF" | null) ?? null,
      quantity:    entry.quantity ?? 1,
      notes:       entry.notes ?? null,
      acquiredAt:  entry.acquiredAt ?? null,
      acquiredFrom: entry.acquiredFrom ?? null,
      pricePaid:   entry.pricePaid ?? null,
      updatedAt:   new Date().toISOString(),
    };

    if (existing) {
      db.update(userCoins).set(values).where(eq(userCoins.id, existing.id)).run();
    } else {
      db.insert(userCoins).values({ ...values, createdAt: new Date().toISOString() }).run();
    }
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}

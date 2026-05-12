export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coins, countries } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { countryCode, denomination, year, isCommemorative, description } =
    await req.json() as {
      countryCode: string; denomination: number; year: number;
      isCommemorative: boolean; description?: string;
    };

  const country = db.select().from(countries)
    .where(eq(countries.code, countryCode.toUpperCase())).all()[0];

  if (!country) return NextResponse.json({ error: "País no encontrado" }, { status: 404 });

  const type = isCommemorative ? "COMMEMORATIVE" : "REGULAR";

  let coin = db.select().from(coins)
    .where(and(
      eq(coins.countryId, country.id),
      eq(coins.denomination, denomination),
      eq(coins.year, year),
      eq(coins.type, type),
    ))
    .all()[0];

  // Si es conmemorativa y hay descripción, buscar por similitud de texto
  if (!coin && isCommemorative && description) {
    const all = db.select().from(coins)
      .where(and(eq(coins.countryId, country.id), eq(coins.year, year), eq(coins.type, "COMMEMORATIVE")))
      .all();
    if (all.length > 0) {
      const words = description.toLowerCase().split(/\W+/).filter((w: string) => w.length > 2);
      let best = all[0];
      let bestScore = -1;
      for (const c of all) {
        const desc = (c.description ?? "").toLowerCase();
        const score = words.filter((w: string) => desc.includes(w)).length;
        if (score > bestScore) { bestScore = score; best = c; }
      }
      coin = best;
    }
  }

  if (!coin) return NextResponse.json({ error: "Moneda no encontrada en la base de datos" }, { status: 404 });

  return NextResponse.json({ coinId: coin.id });
}

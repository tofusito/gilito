export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, getSqlite } from "@/db";
import { userCoins, coins, countries, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getEnvInt,
  isCoinCondition,
  isCoinStatus,
  isCoinType,
  isCountryCode,
  isDenomination,
  isObject,
  isYear,
  jsonError,
  optionalString,
  readJsonBody,
} from "@/lib/api";
import type { CoinCondition, CoinStatus, CoinType } from "@/lib/api";

type BackupEntry = {
  countryCode: string;
  year: number;
  denomination: number;
  type: CoinType;
  description?: string | null;
  status: CoinStatus;
  condition?: CoinCondition | null;
  quantity?: number;
  notes?: string | null;
  acquiredAt?: string | null;
  acquiredFrom?: string | null;
  pricePaid?: number | null;
};

export async function POST(req: NextRequest) {
  const maxImportCoins = getEnvInt("MAX_IMPORT_COINS", 10000);
  const body = await readJsonBody(req, { maxBytes: 4 * 1024 * 1024 });
  if (!body.ok) return body.response;
  if (!isObject(body.data)) return jsonError("Payload inválido");

  if (!Array.isArray(body.data.coins) || body.data.coins.length === 0) {
    return NextResponse.json({ error: "El archivo no contiene monedas" }, { status: 400 });
  }
  if (body.data.coins.length > maxImportCoins) {
    return jsonError(`El backup supera el límite de ${maxImportCoins} monedas`, 413);
  }

  const entries: BackupEntry[] = [];
  for (const item of body.data.coins) {
    if (!isObject(item)) return jsonError("Entrada de backup inválida");

    const countryCode = item.countryCode;
    const year = item.year;
    const denomination = item.denomination;
    const type = item.type;
    const status = item.status;
    const condition = optionalString(item.condition, 20);
    const notes = optionalString(item.notes, 1000);
    const acquiredAt = optionalString(item.acquiredAt, 40);
    const acquiredFrom = optionalString(item.acquiredFrom, 200);
    const description = optionalString(item.description, 500);
    const quantity = item.quantity ?? 1;
    const pricePaid = item.pricePaid ?? null;
    const hasCondition = "condition" in item;
    const hasDescription = "description" in item;
    const hasNotes = "notes" in item;
    const hasAcquiredAt = "acquiredAt" in item;
    const hasAcquiredFrom = "acquiredFrom" in item;

    if (
      !isCountryCode(countryCode) ||
      !isYear(year) ||
      !isDenomination(denomination) ||
      !isCoinType(type) ||
      !isCoinStatus(status) ||
      (hasCondition && condition === undefined) ||
      (hasDescription && description === undefined) ||
      (hasNotes && notes === undefined) ||
      (hasAcquiredAt && acquiredAt === undefined) ||
      (hasAcquiredFrom && acquiredFrom === undefined) ||
      (condition !== undefined && condition !== null && !isCoinCondition(condition)) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 999 ||
      (pricePaid !== null && (typeof pricePaid !== "number" || !Number.isFinite(pricePaid) || pricePaid < 0))
    ) {
      return jsonError("Entrada de backup inválida");
    }

    entries.push({
      countryCode,
      year,
      denomination,
      type: type as CoinType,
      description,
      status: status as CoinStatus,
      condition: condition as CoinCondition | null | undefined,
      quantity,
      notes,
      acquiredAt,
      acquiredFrom,
      pricePaid,
    });
  }

  const user = db.select().from(users).all()[0];
  if (!user) return NextResponse.json({ error: "Sin usuario" }, { status: 500 });

  let imported = 0;
  let skipped = 0;

  getSqlite().transaction(() => {
    for (const entry of entries) {
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
        userId:       user.id,
        coinId:       coin.id,
        status:       entry.status,
        condition:    entry.condition ?? null,
        quantity:     entry.quantity ?? 1,
        notes:        entry.notes ?? null,
        acquiredAt:   entry.acquiredAt ?? null,
        acquiredFrom: entry.acquiredFrom ?? null,
        pricePaid:    entry.pricePaid ?? null,
        updatedAt:    new Date().toISOString(),
      };

      if (existing) {
        db.update(userCoins).set(values).where(eq(userCoins.id, existing.id)).run();
      } else {
        db.insert(userCoins).values({ ...values, createdAt: new Date().toISOString() }).run();
      }
      imported++;
    }
  })();

  return NextResponse.json({ imported, skipped });
}

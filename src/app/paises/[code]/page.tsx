import { db } from "@/db";
import { countries, coins, userCoins, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CountryDetailClient } from "@/components/CountryDetailClient";

export default async function CountryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const country = db
    .select()
    .from(countries)
    .where(eq(countries.code, code.toUpperCase()))
    .all()[0];

  if (!country) notFound();

  const user = db.select().from(users).limit(1).all()[0];

  const allCoins = db.select().from(coins).where(eq(coins.countryId, country.id)).all();

  const ownedMap = new Set<number>();
  const wishlistMap = new Set<number>();

  if (user) {
    const userCoinRows = db
      .select()
      .from(userCoins)
      .where(and(eq(userCoins.userId, user.id)))
      .all();
    for (const uc of userCoinRows) {
      if (uc.status === "OWNED") ownedMap.add(uc.coinId);
      if (uc.status === "WISHLIST") wishlistMap.add(uc.coinId);
    }
  }

  const regularCoins = allCoins
    .filter(c => c.type === "REGULAR")
    .sort((a, b) => b.year - a.year || a.denomination - b.denomination)
    .map(c => ({ ...c, owned: ownedMap.has(c.id), wishlisted: wishlistMap.has(c.id) }));

  const commCoins = allCoins
    .filter(c => c.type === "COMMEMORATIVE")
    .sort((a, b) => b.year - a.year)
    .map(c => ({ ...c, owned: ownedMap.has(c.id), wishlisted: wishlistMap.has(c.id) }));

  return (
    <CountryDetailClient
      country={country}
      regularCoins={regularCoins}
      commCoins={commCoins}
    />
  );
}

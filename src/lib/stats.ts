import { db } from "@/db";
import { coins, userCoins, countries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type CountryStats = {
  id: number;
  code: string;
  name: string;
  flagEmoji: string;
  yearJoined: number;
  // Series anuales
  totalYears: number;
  completeYears: number;        // años con las 8 monedas
  partialYears: number;         // años con al menos 1 pero no todas
  yearsPct: number;
  // Conmemorativas
  totalComm: number;
  ownedComm: number;
  commPct: number;
};

export function getCountryStats(userId: number): CountryStats[] {
  const allCountries = db.select().from(countries).orderBy(countries.name).all();

  return allCountries.map(c => {
    const allCoins = db.select().from(coins).where(eq(coins.countryId, c.id)).all();

    const regularCoins = allCoins.filter(x => x.type === "REGULAR");
    const commCoins    = allCoins.filter(x => x.type === "COMMEMORATIVE");

    // Años únicos con monedas regulares
    const years = [...new Set(regularCoins.map(x => x.year))];

    // Monedas que tiene el usuario de este país
    const ownedIds = new Set(
      db.select({ coinId: userCoins.coinId })
        .from(userCoins)
        .where(and(eq(userCoins.userId, userId), eq(userCoins.status, "OWNED")))
        .all()
        .filter(uc => allCoins.some(c => c.id === uc.coinId))
        .map(uc => uc.coinId)
    );

    let completeYears = 0;
    let partialYears  = 0;

    for (const year of years) {
      const yearCoins = regularCoins.filter(x => x.year === year);
      const ownedCount = yearCoins.filter(x => ownedIds.has(x.id)).length;
      if (ownedCount === yearCoins.length && yearCoins.length > 0) completeYears++;
      else if (ownedCount > 0) partialYears++;
    }

    const ownedComm = commCoins.filter(x => ownedIds.has(x.id)).length;

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      flagEmoji: c.flagEmoji,
      yearJoined: c.yearJoined,
      totalYears: years.length,
      completeYears,
      partialYears,
      yearsPct: years.length > 0 ? Math.round((completeYears / years.length) * 100) : 0,
      totalComm: commCoins.length,
      ownedComm,
      commPct: commCoins.length > 0 ? Math.round((ownedComm / commCoins.length) * 100) : 0,
    };
  });
}

export function getGlobalStats(userId: number) {
  const countryStats = getCountryStats(userId);

  const totalYears    = countryStats.reduce((s, c) => s + c.totalYears, 0);
  const completeYears = countryStats.reduce((s, c) => s + c.completeYears, 0);
  const totalComm     = countryStats.reduce((s, c) => s + c.totalComm, 0);
  const ownedComm     = countryStats.reduce((s, c) => s + c.ownedComm, 0);

  const ownedRegular = db
    .select({ coinId: userCoins.coinId })
    .from(userCoins)
    .innerJoin(coins, eq(userCoins.coinId, coins.id))
    .where(and(
      eq(userCoins.userId, userId),
      eq(userCoins.status, "OWNED"),
      eq(coins.type, "REGULAR")
    ))
    .all().length;

  return {
    totalYears,
    completeYears,
    ownedRegular,
    yearsPct: totalYears > 0 ? Math.round((completeYears / totalYears) * 100) : 0,
    totalComm,
    ownedComm,
    commPct: totalComm > 0 ? Math.round((ownedComm / totalComm) * 100) : 0,
    countryStats,
  };
}

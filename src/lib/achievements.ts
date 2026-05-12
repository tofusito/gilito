import { db } from "@/db";
import { coins, userCoins, countries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type Achievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: "primeros_pasos" | "series" | "conmemorativas" | "paises" | "hitos" | "especiales";
  unlocked: boolean;
  progress?: number;   // 0–100 para mostrar barra parcial
  progressLabel?: string;
};

const FOUNDING_COUNTRIES = ["DE","AT","BE","ES","FI","FR","GR","IE","IT","LU","MC","NL","PT","SM","VA"];
const MICROSTATE_COUNTRIES = ["MC","SM","VA","AD"];
const COMMON_ISSUE_YEARS = [2007, 2009, 2012, 2015, 2022];

export function computeAchievements(userId: number): Achievement[] {
  const allCountries    = db.select().from(countries).all();
  const allCoins        = db.select().from(coins).all();
  const owned           = db.select().from(userCoins).where(and(eq(userCoins.userId, userId), eq(userCoins.status, "OWNED"))).all();
  const ownedIds        = new Set(owned.map(u => u.coinId));
  const ownedCount      = ownedIds.size;

  const regularCoins    = allCoins.filter(c => c.type === "REGULAR");
  const commCoins       = allCoins.filter(c => c.type === "COMMEMORATIVE");
  const ownedComm       = commCoins.filter(c => ownedIds.has(c.id)).length;
  const ownedRegular    = regularCoins.filter(c => ownedIds.has(c.id)).length;

  // Helper: años completos (8 monedas) de un país
  function completeYearsForCountry(countryId: number) {
    const rc = regularCoins.filter(c => c.countryId === countryId);
    const years = [...new Set(rc.map(c => c.year))];
    return years.filter(y => {
      const yearCoins = rc.filter(c => c.year === y);
      return yearCoins.length > 0 && yearCoins.every(c => ownedIds.has(c.id));
    });
  }

  function allCommForCountry(countryId: number) {
    const cc = commCoins.filter(c => c.countryId === countryId);
    return { total: cc.length, owned: cc.filter(c => ownedIds.has(c.id)).length };
  }

  function allYearsForCountry(countryId: number) {
    const rc = regularCoins.filter(c => c.countryId === countryId);
    return [...new Set(rc.map(c => c.year))];
  }

  const achs: Achievement[] = [];

  // ── PRIMEROS PASOS ───────────────────────────────────────────────────────
  achs.push({
    key: "first_coin",
    title: "Primera moneda",
    description: "Añade tu primera moneda a la colección",
    icon: "🪙",
    category: "primeros_pasos",
    unlocked: ownedCount >= 1,
  });

  achs.push({
    key: "first_commemorative",
    title: "Primera conmemorativa",
    description: "Consigue tu primera moneda conmemorativa de 2€",
    icon: "⭐",
    category: "primeros_pasos",
    unlocked: ownedComm >= 1,
  });

  const anyComplete = allCountries.some(c => completeYearsForCountry(c.id).length > 0);
  achs.push({
    key: "first_set",
    title: "Primer set completo",
    description: "Completa las 8 monedas de un mismo año y país",
    icon: "🎯",
    category: "primeros_pasos",
    unlocked: anyComplete,
  });

  // ── HITOS DE CANTIDAD ─────────────────────────────────────────────────────
  for (const [n, icon] of [[10,"🌱"],[50,"🌿"],[100,"🌳"],[250,"💎"],[500,"🏆"],[1000,"👑"],[2500,"🌟"]] as [number,string][]) {
    achs.push({
      key: `count_${n}`,
      title: `${n} monedas`,
      description: `Consigue ${n} monedas en tu colección`,
      icon,
      category: "hitos",
      unlocked: ownedCount >= n,
      progress: Math.min(100, Math.round((ownedCount / n) * 100)),
      progressLabel: `${ownedCount} / ${n}`,
    });
  }

  const totalCoins = allCoins.length;
  achs.push({
    key: "half_collection",
    title: "La mitad",
    description: "Completa el 50% de la colección total",
    icon: "⚡",
    category: "hitos",
    unlocked: ownedCount >= totalCoins / 2,
    progress: Math.min(100, Math.round((ownedCount / (totalCoins / 2)) * 100)),
    progressLabel: `${ownedCount} / ${Math.floor(totalCoins / 2)}`,
  });

  achs.push({
    key: "full_collection",
    title: "Colección completa",
    description: "¡Todas las monedas de la base de datos!",
    icon: "🌍",
    category: "hitos",
    unlocked: ownedCount >= totalCoins,
    progress: Math.round((ownedCount / totalCoins) * 100),
    progressLabel: `${ownedCount} / ${totalCoins}`,
  });

  // ── SERIES ANUALES ────────────────────────────────────────────────────────
  // Por cada país: todos sus años completos
  for (const country of allCountries) {
    const totalYears    = allYearsForCountry(country.id);
    const completedYrs  = completeYearsForCountry(country.id);
    if (totalYears.length === 0) continue;

    achs.push({
      key: `all_years_${country.code}`,
      title: `${country.flagEmoji} Años completos — ${country.name}`,
      description: `Completa las 8 monedas de todos los años de ${country.name}`,
      icon: country.flagEmoji,
      category: "series",
      unlocked: completedYrs.length >= totalYears.length,
      progress: Math.round((completedYrs.length / totalYears.length) * 100),
      progressLabel: `${completedYrs.length} / ${totalYears.length} años`,
    });
  }

  // ── CONMEMORATIVAS ────────────────────────────────────────────────────────
  // Por cada país: todas sus conmemorativas
  for (const country of allCountries) {
    const { total, owned } = allCommForCountry(country.id);
    if (total === 0) continue;

    achs.push({
      key: `all_comm_${country.code}`,
      title: `${country.flagEmoji} Conmem. — ${country.name}`,
      description: `Consigue todas las conmemorativas 2€ de ${country.name}`,
      icon: "⭐",
      category: "conmemorativas",
      unlocked: owned >= total,
      progress: Math.round((owned / total) * 100),
      progressLabel: `${owned} / ${total}`,
    });
  }

  // Emisiones comunes (misma conmemorativa en todos los países)
  for (const year of COMMON_ISSUE_YEARS) {
    const yearComm = commCoins.filter(c => c.year === year && (c.isCommonIssue as unknown as number) === 1);
    const ownedYear = yearComm.filter(c => ownedIds.has(c.id)).length;
    achs.push({
      key: `common_${year}`,
      title: `Emisión común ${year}`,
      description: `Todas las versiones de la emisión conmemorativa común de ${year}`,
      icon: "🇪🇺",
      category: "especiales",
      unlocked: ownedYear >= yearComm.length && yearComm.length > 0,
      progress: yearComm.length > 0 ? Math.round((ownedYear / yearComm.length) * 100) : 0,
      progressLabel: `${ownedYear} / ${yearComm.length}`,
    });
  }

  // ── ESPECIALES ────────────────────────────────────────────────────────────
  // Países fundadores 2002
  const foundingIds = allCountries.filter(c => FOUNDING_COUNTRIES.includes(c.code)).map(c => c.id);
  const foundingSets2002 = foundingIds.filter(id => {
    const yr = regularCoins.filter(c => c.countryId === id && c.year === 2002);
    return yr.length === 8 && yr.every(c => ownedIds.has(c.id));
  });
  achs.push({
    key: "founding_2002",
    title: "Año cero",
    description: "Completa los sets de 2002 de los 15 países fundadores del euro",
    icon: "🏛",
    category: "especiales",
    unlocked: foundingSets2002.length >= foundingIds.length,
    progress: Math.round((foundingSets2002.length / foundingIds.length) * 100),
    progressLabel: `${foundingSets2002.length} / ${foundingIds.length} países`,
  });

  // Microstados
  const microstateIds = allCountries.filter(c => MICROSTATE_COUNTRIES.includes(c.code)).map(c => c.id);
  const ownedMicro    = regularCoins.filter(c => microstateIds.includes(c.countryId) && ownedIds.has(c.id)).length;
  const totalMicro    = regularCoins.filter(c => microstateIds.includes(c.countryId)).length;
  achs.push({
    key: "microstates",
    title: "Coleccionista de microstados",
    description: "Consigue monedas de Mónaco, San Marino, Vaticano y Andorra",
    icon: "🏰",
    category: "especiales",
    unlocked: ownedMicro >= totalMicro && totalMicro > 0,
    progress: totalMicro > 0 ? Math.round((ownedMicro / totalMicro) * 100) : 0,
    progressLabel: `${ownedMicro} / ${totalMicro}`,
  });

  // País completo (regulares + conmemorativas)
  for (const country of allCountries) {
    const countryCoins  = allCoins.filter(c => c.countryId === country.id);
    const ownedForC     = countryCoins.filter(c => ownedIds.has(c.id)).length;
    if (countryCoins.length === 0) continue;
    achs.push({
      key: `country_complete_${country.code}`,
      title: `${country.flagEmoji} País completo — ${country.name}`,
      description: `¡Todas las monedas (anuales y conmemorativas) de ${country.name}!`,
      icon: "🏅",
      category: "paises",
      unlocked: ownedForC >= countryCoins.length,
      progress: Math.round((ownedForC / countryCoins.length) * 100),
      progressLabel: `${ownedForC} / ${countryCoins.length}`,
    });
  }

  // Todas las conmemorativas de un año concreto de un país — generar para años con >= 2 conmem.
  const commByCountryYear = new Map<string, typeof commCoins>();
  for (const cc of commCoins) {
    const k = `${cc.countryId}_${cc.year}`;
    if (!commByCountryYear.has(k)) commByCountryYear.set(k, []);
    commByCountryYear.get(k)!.push(cc);
  }
  for (const [key, ccs] of commByCountryYear) {
    if (ccs.length < 2) continue;
    const country = allCountries.find(c => c.id === ccs[0].countryId);
    if (!country) continue;
    const ownedCcs = ccs.filter(c => ownedIds.has(c.id)).length;
    achs.push({
      key: `comm_year_${key}`,
      title: `${country.flagEmoji} Conmem. ${country.name} ${ccs[0].year}`,
      description: `Las ${ccs.length} conmemorativas de ${country.name} en ${ccs[0].year}`,
      icon: "📅",
      category: "conmemorativas",
      unlocked: ownedCcs >= ccs.length,
      progress: Math.round((ownedCcs / ccs.length) * 100),
      progressLabel: `${ownedCcs} / ${ccs.length}`,
    });
  }

  return achs;
}

export const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  primeros_pasos: "Primeros pasos",
  hitos:          "Hitos de colección",
  series:         "Series anuales",
  conmemorativas: "Conmemorativas",
  paises:         "País completo",
  especiales:     "Especiales",
};

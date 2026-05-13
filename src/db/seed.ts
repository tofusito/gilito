import { db } from "./index";
import { runMigrations } from "./migrate";
import { users, countries, coins } from "./schema";
import { COUNTRIES, DENOMINATIONS } from "./seed-countries";
import { COMMEMORATIVE } from "./seed-commemorative";
import { count } from "drizzle-orm";

export async function initializeDatabase() {
  runMigrations();

  // Crear usuario por defecto si no existe
  const existingUsers = db.select({ count: count() }).from(users).all();
  if (existingUsers[0].count === 0) {
    db.insert(users).values({ name: "Mi Colección" }).run();
    console.log("✓ Usuario por defecto creado");
  }

  // Insertar países si no existen
  const existingCountries = db.select({ count: count() }).from(countries).all();
  if (existingCountries[0].count === 0) {
    for (const c of COUNTRIES) {
      db.insert(countries).values(c).run();
    }
    console.log(`✓ ${COUNTRIES.length} países insertados`);
  }

  // Insertar monedas regulares si no existen
  const existingCoins = db.select({ count: count() }).from(coins).all();
  if (existingCoins[0].count === 0) {
    const currentYear = new Date().getFullYear();
    const allCountries = db.select().from(countries).all();
    let regularCount = 0;

    for (const country of allCountries) {
      for (let year = country.yearJoined; year <= currentYear; year++) {
        for (const denom of DENOMINATIONS) {
          try {
            db.insert(coins).values({
              countryId: country.id,
              denomination: denom,
              year,
              type: "REGULAR",
            }).run();
            regularCount++;
          } catch {
            // ignorar duplicados
          }
        }
      }
    }
    console.log(`✓ ${regularCount} monedas regulares insertadas`);

    // Conmemorativas específicas
    const allComm = COMMEMORATIVE;

    let commCount = 0;
    for (const comm of allComm) {
      const country = allCountries.find(c => c.code === comm.countryCode);
      if (!country) continue;
      try {
        db.insert(coins).values({
          countryId: country.id,
          denomination: 2.00,
          year: comm.year,
          type: "COMMEMORATIVE",
          description: comm.description,
          seriesName: comm.seriesName ?? null,
          isCommonIssue: !!comm.isCommonIssue,
        }).run();
        commCount++;
      } catch {
        // ignorar duplicados
      }
    }
    console.log(`✓ ${commCount} monedas conmemorativas insertadas`);
  }
}

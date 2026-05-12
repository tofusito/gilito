export const dynamic = "force-dynamic";
import { db } from "@/db";
import { userCoins, users, coins, countries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { WishlistClient } from "@/components/WishlistClient";

export default async function DeseosPage() {
  const user = db.select().from(users).limit(1).all()[0];
  const wishlist = user
    ? db
        .select({
          ucId: userCoins.id,
          coinId: coins.id,
          denomination: coins.denomination,
          year: coins.year,
          type: coins.type,
          description: coins.description,
          countryName: countries.name,
          countryFlag: countries.flagEmoji,
          countryCode: countries.code,
        })
        .from(userCoins)
        .innerJoin(coins, eq(userCoins.coinId, coins.id))
        .innerJoin(countries, eq(coins.countryId, countries.id))
        .where(and(eq(userCoins.userId, user.id), eq(userCoins.status, "WISHLIST")))
        .all()
    : [];

  return <WishlistClient items={wishlist} />;
}

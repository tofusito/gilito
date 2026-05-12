export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCountryStats } from "@/lib/stats";
import { PaisesClient } from "@/components/PaisesClient";

export default async function PaisesPage() {
  const user  = db.select().from(users).limit(1).all()[0];
  const stats = user ? getCountryStats(user.id) : [];
  return <PaisesClient stats={stats} />;
}

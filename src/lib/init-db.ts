let initialized = false;

export async function initDb() {
  if (initialized) return;
  initialized = true;

  // Solo en el servidor
  if (typeof window !== "undefined") return;

  try {
    const { initializeDatabase } = await import("@/db/seed");
    await initializeDatabase();
  } catch (e) {
    console.error("Error inicializando DB:", e);
  }
}

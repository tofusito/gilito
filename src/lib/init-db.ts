let initialized = false;

export function initDb() {
  if (initialized) return;
  initialized = true;

  // Solo en el servidor
  if (typeof window !== "undefined") return;

  try {
    const { initializeDatabase } = require("@/db/seed");
    initializeDatabase();
  } catch (e) {
    console.error("Error inicializando DB:", e);
  }
}

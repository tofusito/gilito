import { getSqlite } from "./index";

export function runMigrations() {
  getSqlite().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Mi Colección',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      name_en TEXT NOT NULL,
      flag_emoji TEXT NOT NULL,
      year_joined INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_id INTEGER NOT NULL REFERENCES countries(id),
      denomination REAL NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'REGULAR',
      description TEXT,
      series_name TEXT,
      image_url TEXT,
      is_common_issue INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_coins_unique
      ON coins(country_id, denomination, year, type, COALESCE(description, ''));

    CREATE TABLE IF NOT EXISTS user_coins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      coin_id INTEGER NOT NULL REFERENCES coins(id),
      status TEXT NOT NULL,
      condition TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      photo_url TEXT,
      acquired_at TEXT,
      acquired_from TEXT,
      price_paid REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, coin_id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, key)
    );
  `);
}

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Mi Colección"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const countries = sqliteTable("countries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // "ES", "DE", etc.
  name: text("name").notNull(),          // "España"
  nameEn: text("name_en").notNull(),     // "Spain"
  flagEmoji: text("flag_emoji").notNull(),
  yearJoined: integer("year_joined").notNull(),
});

// Cada combinación única: país + denominación + año + tipo
export const coins = sqliteTable("coins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countryId: integer("country_id").notNull().references(() => countries.id),
  denomination: real("denomination").notNull(), // 0.01, 0.02, ... 1.00, 2.00
  year: integer("year").notNull(),
  type: text("type", { enum: ["REGULAR", "COMMEMORATIVE"] }).notNull().default("REGULAR"),
  description: text("description"),             // solo para conmemorativas
  seriesName: text("series_name"),              // ej: "Erasmus 35 aniversario"
  imageUrl: text("image_url"),
  isCommonIssue: integer("is_common_issue", { mode: "boolean" }).notNull().default(false),
});

// Lo que tiene el usuario
export const userCoins = sqliteTable("user_coins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  coinId: integer("coin_id").notNull().references(() => coins.id),
  status: text("status", { enum: ["OWNED", "WISHLIST", "DUPLICATE"] }).notNull(),
  condition: text("condition", { enum: ["CIRCULATED", "XF", "UNC", "BU", "PROOF"] }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  acquiredAt: text("acquired_at"),
  acquiredFrom: text("acquired_from"),
  pricePaid: real("price_paid"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  key: text("key").notNull(),
  unlockedAt: text("unlocked_at").notNull().default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type Coin = typeof coins.$inferSelect;
export type UserCoin = typeof userCoins.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;

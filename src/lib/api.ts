import { NextRequest, NextResponse } from "next/server";

export const STATUS_VALUES = ["OWNED", "WISHLIST", "DUPLICATE"] as const;
export const CONDITION_VALUES = ["CIRCULATED", "XF", "UNC", "BU", "PROOF"] as const;
export const COIN_TYPES = ["REGULAR", "COMMEMORATIVE"] as const;
export const DENOMINATIONS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2] as const;

export type CoinStatus = (typeof STATUS_VALUES)[number];
export type CoinCondition = (typeof CONDITION_VALUES)[number];
export type CoinType = (typeof COIN_TYPES)[number];

type JsonReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function getEnvInt(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function readJsonBody<T = unknown>(
  req: NextRequest,
  { maxBytes = 256 * 1024 }: { maxBytes?: number } = {}
): Promise<JsonReadResult<T>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: jsonError("Content-Type debe ser application/json", 415) };
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false, response: jsonError("Payload demasiado grande", 413) };
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return { ok: false, response: jsonError("JSON inválido", 400) };
  }

  try {
    if (Buffer.byteLength(JSON.stringify(data), "utf8") > maxBytes) {
      return { ok: false, response: jsonError("Payload demasiado grande", 413) };
    }
  } catch {
    return { ok: false, response: jsonError("JSON inválido", 400) };
  }

  return { ok: true, data: data as T };
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown, maxLength = 1000): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

export function optionalString(value: unknown, maxLength = 1000): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!isString(value, maxLength)) return undefined;
  return value;
}

export function isPositiveInt(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= max;
}

export function isYear(value: unknown): value is number {
  const nextYear = new Date().getFullYear() + 1;
  return Number.isInteger(value) && Number(value) >= 1999 && Number(value) <= nextYear;
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value);
}

export function isDenomination(value: unknown): value is number {
  return typeof value === "number" && DENOMINATIONS.some(d => Math.abs(d - value) < 0.001);
}

export function isCoinStatus(value: unknown): value is CoinStatus {
  return typeof value === "string" && STATUS_VALUES.includes(value as CoinStatus);
}

export function isCoinCondition(value: unknown): value is CoinCondition {
  return typeof value === "string" && CONDITION_VALUES.includes(value as CoinCondition);
}

export function isCoinType(value: unknown): value is CoinType {
  return typeof value === "string" && COIN_TYPES.includes(value as CoinType);
}

export function validateCoinIds(value: unknown, maxItems = 256): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) return null;

  const ids = new Set<number>();
  for (const item of value) {
    if (!isPositiveInt(item)) return null;
    ids.add(item);
  }

  return [...ids];
}

export function base64ByteLength(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

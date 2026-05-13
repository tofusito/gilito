export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coins, countries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  base64ByteLength,
  getEnvInt,
  isCountryCode,
  isObject,
  isString,
  isYear,
  jsonError,
  readJsonBody,
} from "@/lib/api";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const COUNTRY_CODES = [
  "AD","AT","BE","BG","CY","DE","EE","ES","FI","FR",
  "GR","HR","IE","IT","LT","LU","LV","MC","MT","NL",
  "PT","SI","SK","SM","VA",
];

const DENOM_MAP: Record<string, number> = {
  "1c": 0.01, "2c": 0.02, "5c": 0.05, "10c": 0.10,
  "20c": 0.20, "50c": 0.50, "1€": 1.00, "2€": 2.00,
};

async function callGemini(apiKey: string, model: string, content: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    try {
      data = await res.json();
    } catch {
      throw new Error("Respuesta inválida de Gemini");
    }

    if (!res.ok || data.error) throw new Error(data.error?.message ?? "Error llamando a Gemini");

    const contentText = data.choices?.[0]?.message?.content;
    if (!contentText) throw new Error("Gemini no devolvió contenido");
    return contentText.replace(/```json|```/g, "").trim();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Gemini tardó demasiado en responder");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function validateStep1(value: unknown): {
  error?: string;
  year: number;
  country: string;
  countryName: string;
  denomination: string;
  isCommemorative: boolean;
  description: string;
  confidence: number;
} | null {
  if (!isObject(value)) return null;
  if (typeof value.error === "string") {
    return {
      error: value.error,
      year: 2002,
      country: "ES",
      countryName: "",
      denomination: "1€",
      isCommemorative: false,
      description: "",
      confidence: 0,
    };
  }
  if (
    !isYear(value.year) ||
    !isCountryCode(value.country) ||
    !isString(value.countryName, 100) ||
    !isString(value.denomination, 10) ||
    typeof value.isCommemorative !== "boolean" ||
    !isString(value.description, 500) ||
    typeof value.confidence !== "number" ||
    value.confidence < 0 ||
    value.confidence > 100
  ) {
    return null;
  }

  return {
    year: value.year,
    country: value.country.toUpperCase(),
    countryName: value.countryName,
    denomination: value.denomination,
    isCommemorative: value.isCommemorative,
    description: value.description,
    confidence: value.confidence,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  const scanMaxBytes = getEnvInt("SCAN_MAX_BYTES", 6 * 1024 * 1024);
  const timeoutMs = getEnvInt("GEMINI_TIMEOUT_MS", 15000);
  const body = await readJsonBody(req, { maxBytes: Math.ceil(scanMaxBytes * 1.5) + 1024 });
  if (!body.ok) return body.response;
  if (!isObject(body.data)) return jsonError("Payload inválido");

  const { imageBase64, mimeType } = body.data;
  if (
    !isString(imageBase64, Math.ceil(scanMaxBytes * 1.5)) ||
    !/^[A-Za-z0-9+/=]+$/.test(imageBase64) ||
    !isString(mimeType, 40) ||
    !ALLOWED_IMAGE_TYPES.has(mimeType)
  ) {
    return jsonError("Imagen inválida");
  }
  if (base64ByteLength(imageBase64) > scanMaxBytes) {
    return jsonError("Imagen demasiado grande", 413);
  }

  const model    = process.env.AI_MODEL ?? "gemini-2.0-flash-lite";
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  // ── PASO 1: identificar la moneda ─────────────────────────────────────────
  const step1Prompt = `Identifica esta moneda de euro. Si no es una moneda de euro, responde: {"error": "No es una moneda de euro"}.

Países válidos (código ISO): ${COUNTRY_CODES.join(", ")}
Denominaciones válidas: 1c, 2c, 5c, 10c, 20c, 50c, 1€, 2€

Responde SOLO con JSON válido:
{
  "year": número — año grabado en la moneda,
  "country": "código ISO 2 letras",
  "countryName": "nombre del país en español",
  "denomination": "1c" | "2c" | "5c" | "10c" | "20c" | "50c" | "1€" | "2€",
  "isCommemorative": boolean — true solo si es una moneda de 2€ con diseño especial conmemorativo (no el diseño nacional habitual),
  "description": "Usa tu conocimiento para generar una descripción informativa en español. Menciona qué aparece en la moneda y añade contexto histórico o cultural real: cuándo fue construido el monumento, qué representa el personaje, por qué es relevante. Ej: 'Catedral de Burgos, joya del gótico español iniciada en 1221, declarada Patrimonio UNESCO en 1984.' Máx 180 chars.",
  "confidence": número 0-100
}`;

  let step1: NonNullable<ReturnType<typeof validateStep1>>;

  try {
    const raw1 = await callGemini(apiKey, model, [
      { type: "text", text: step1Prompt },
      { type: "image_url", image_url: { url: imageUrl } },
    ], timeoutMs);
    step1 = validateStep1(JSON.parse(raw1)) ?? (() => { throw new Error("Gemini devolvió datos inválidos"); })();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error identificando la moneda";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (step1.error) {
    return NextResponse.json({ error: step1.error }, { status: 422 });
  }

  const denomination = DENOM_MAP[step1.denomination] ?? null;
  if (!denomination) {
    return NextResponse.json({ error: "Denominación no reconocida" }, { status: 422 });
  }

  // ── Buscar país en la BD ──────────────────────────────────────────────────
  const country = db.select().from(countries)
    .where(eq(countries.code, step1.country.toUpperCase())).all()[0];

  let coinId: number | null = null;

  // ── Moneda regular: resolución directa ───────────────────────────────────
  if (!step1.isCommemorative) {
    if (country) {
      const coin = db.select().from(coins).where(and(
        eq(coins.countryId, country.id),
        eq(coins.year, step1.year),
        eq(coins.denomination, denomination),
        eq(coins.type, "REGULAR"),
      )).all()[0];
      if (coin) coinId = coin.id;
    }

    return NextResponse.json({
      year:            step1.year,
      country:         step1.countryName,
      countryCode:     step1.country,
      denomination,
      isCommemorative: false,
      description:     step1.description,
      confidence:      step1.confidence,
      coinId,
    });
  }

  // ── Moneda conmemorativa: PASO 2 ──────────────────────────────────────────
  const candidates = country ? db.select().from(coins).where(and(
    eq(coins.countryId, country.id),
    eq(coins.year, step1.year),
    eq(coins.type, "COMMEMORATIVE"),
  )).all() : [];

  if (candidates.length === 1) {
    coinId = candidates[0].id;
  } else if (candidates.length > 1) {
    const list = candidates
      .map(c => `(${c.id}, "${c.description}", ${c.year}, ${step1.country})`)
      .join(", ");

    const step2Prompt = `Esta moneda es conmemorativa de 2€. Mira la imagen y completa los campos. El coinId debe ser uno de esta lista:
[${list}]

Elige el coinId cuya descripción encaje mejor con lo que ves en la moneda.
Responde SOLO con JSON: {"coinId": <número>}`;

    try {
      const raw2  = await callGemini(apiKey, model, [
        { type: "text", text: step2Prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ], timeoutMs);
      const match = JSON.parse(raw2) as { coinId?: number | string };
      const found = candidates.find(c => c.id === Number(match.coinId));
      coinId = found?.id ?? candidates[0].id;
    } catch {
      coinId = candidates[0].id;
    }
  }

  return NextResponse.json({
    year:            step1.year,
    country:         step1.countryName,
    countryCode:     step1.country,
    denomination,
    isCommemorative: true,
    description:     step1.description,
    confidence:      step1.confidence,
    coinId,
  });
}

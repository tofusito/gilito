export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coins, countries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const COUNTRY_CODES = [
  "AD","AT","BE","BG","CY","DE","EE","ES","FI","FR",
  "GR","HR","IE","IT","LT","LU","LV","MC","MT","NL",
  "PT","SI","SK","SM","VA",
];

const DENOM_MAP: Record<string, number> = {
  "1c": 0.01, "2c": 0.02, "5c": 0.05, "10c": 0.10,
  "20c": 0.20, "50c": 0.50, "1€": 1.00, "2€": 2.00,
};

async function callGemini(apiKey: string, model: string, content: unknown) {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      max_tokens: 600,
    }),
  });
  const data = await res.json() as {
    choices?: Array<{ message: { content: string } }>;
    error?: { message: string };
  };
  if (data.error) throw new Error(data.error.message);
  return (data.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  const body     = await req.json() as { imageBase64: string; mimeType: string };
  const model    = process.env.AI_MODEL ?? "gemini-2.0-flash-lite";
  const imageUrl = `data:${body.mimeType};base64,${body.imageBase64}`;

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

  let step1: {
    error?: string;
    year: number; country: string; countryName: string;
    denomination: string; isCommemorative: boolean;
    description: string; confidence: number;
  };

  try {
    const raw1 = await callGemini(apiKey, model, [
      { type: "text", text: step1Prompt },
      { type: "image_url", image_url: { url: imageUrl } },
    ]);
    step1 = JSON.parse(raw1);
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
      ]);
      const match = JSON.parse(raw2) as { coinId: number | string };
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

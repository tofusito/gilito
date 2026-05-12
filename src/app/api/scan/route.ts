export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey   = process.env.AI_API_KEY;
  const endpoint = process.env.AI_ENDPOINT;

  if (!apiKey || !endpoint) {
    return NextResponse.json(
      { error: "AI_API_KEY o AI_ENDPOINT no configurados" },
      { status: 503 }
    );
  }

  const body = await req.json() as { imageBase64: string; mimeType: string };
  const model = process.env.AI_MODEL ?? "gemini-2.0-flash-lite";

  const prompt = `Analiza esta imagen de una moneda euro. Identifica:
1. País emisor
2. Denominación (1ct, 2ct, 5ct, 10ct, 20ct, 50ct, 1€ o 2€)
3. Año de acuñación
4. Si es conmemorativa: descripción breve del motivo
5. Confidence (0-100%)

Responde SOLO con JSON válido, sin markdown:
{
  "country": "nombre del país en español",
  "countryCode": "código ISO 2 letras",
  "denomination": número (ej: 0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00),
  "year": número,
  "isCommemorative": boolean,
  "description": "descripción si es conmemorativa o null",
  "confidence": número,
  "notes": "observaciones adicionales o null"
}`;

  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${body.mimeType};base64,${body.imageBase64}` } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    const data = await res.json() as {
      choices?: Array<{ message: { content: string } }>;
      error?: { message: string };
    };

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const text  = data.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Error procesando imagen" }, { status: 500 });
  }
}

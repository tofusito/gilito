#!/usr/bin/env python3
"""
Enriquece la base de datos de Gilito:
  1. Traduce series_name al español
  2. Enriquece descripciones cortas con contexto en español via Gemini
"""

import sqlite3
import json
import urllib.request
import os

GILITO_DB = os.path.join(os.path.dirname(__file__), "../data/gilito.db")
API_KEY   = os.environ.get("GEMINI_API_KEY", "REDACTED")
ENDPOINT  = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
MODEL     = "gemini-2.5-flash-lite"

# ── 1. Traducciones fijas de series ──────────────────────────────────────────
SERIES_TRANSLATIONS = {
    "10 years of EMU":                          "10 años de la UEM",
    "10 years of euro cash":                    "10 años de billetes y monedas euro",
    "30th anniversary of the EU flag":          "30 aniversario de la bandera de la UE",
    "35 years of Erasmus":                      "35 años del programa Erasmus",
    "50 years of Europe":                       "50 años de Europa",
    "Bundesländer":                             "Estados federados de Alemania",
    "Grand-ducal dynasty":                      "Dinastía Gran Ducal",
    "UNESCO World Heritage":                    "Patrimonio de la Humanidad UNESCO",
    "UNESCO's World Natural and Cultural Heritage Sites": "Patrimonio de la Humanidad UNESCO",
}

# ── 2. Función Gemini ─────────────────────────────────────────────────────────
def call_gemini(prompt: str) -> str:
    data = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 8192,
    }).encode()
    req = urllib.request.Request(
        ENDPOINT, data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        result = json.loads(r.read())
    return result["choices"][0]["message"]["content"].replace("```json","").replace("```","").strip()


def enrich_batch(rows: list[tuple]) -> dict[int, str]:
    """
    rows: list of (id, country_code, year, description, series_name)
    Devuelve dict {id: descripción_enriquecida}
    """
    items = {}
    for coin_id, country, year, desc, series in rows:
        items[str(coin_id)] = {
            "country": country,
            "year": year,
            "current_description": desc,
            "series": series,
        }

    prompt = f"""Eres un experto en numismática. Tengo monedas euro conmemorativas con descripciones demasiado cortas.
Para cada moneda, genera una descripción en español clara e informativa (máximo 80 caracteres) que explique qué representa la moneda.

Reglas:
- Incluye qué elemento visual o histórico aparece en la moneda
- Para monedas de estados federados alemanes (Bundesländer), menciona el monumento o paisaje icónico del estado
- Para monedas UNESCO, menciona que es Patrimonio de la Humanidad
- Para series conmemorativas de personajes, menciona quién es brevemente
- Responde SOLO con JSON: {{"<id>": "<descripción enriquecida>", ...}}

Monedas a enriquecer:
{json.dumps(items, ensure_ascii=False, indent=2)}"""

    raw = call_gemini(prompt)
    result = json.loads(raw)
    return {int(k): v for k, v in result.items()}


def main():
    db = sqlite3.connect(GILITO_DB)

    # ── Paso 1: traducir series_name ────────────────────────────────────────
    print("── Actualizando series_name…")
    updated_series = 0
    for en, es in SERIES_TRANSLATIONS.items():
        n = db.execute(
            "UPDATE coins SET series_name=? WHERE series_name=?", (es, en)
        ).rowcount
        if n:
            print(f"   {en!r} → {es!r} ({n} monedas)")
            updated_series += n
    db.commit()
    print(f"   Total: {updated_series} monedas actualizadas\n")

    # ── Paso 2: enriquecer descripciones cortas ─────────────────────────────
    rows = db.execute("""
        SELECT c.id, co.code, c.year, c.description, c.series_name
        FROM coins c JOIN countries co ON c.country_id = co.id
        WHERE c.type='COMMEMORATIVE' AND length(c.description) <= 30
        ORDER BY co.code, c.year
    """).fetchall()

    print(f"── Enriqueciendo {len(rows)} descripciones cortas con Gemini…")
    batch_size = 40
    batches = [rows[i:i+batch_size] for i in range(0, len(rows), batch_size)]
    total_enriched = 0

    for i, batch in enumerate(batches):
        print(f"   Lote {i+1}/{len(batches)} ({len(batch)} monedas)…", end=" ", flush=True)
        try:
            enriched = enrich_batch(batch)
            for coin_id, new_desc in enriched.items():
                db.execute("UPDATE coins SET description=? WHERE id=?", (new_desc, coin_id))
            db.commit()
            total_enriched += len(enriched)
            print("✓")
        except Exception as e:
            print(f"✗ {e}")

    db.close()
    print(f"\n── Resumen ──────────────────────────────────────────────────")
    print(f"   Series actualizadas:      {updated_series}")
    print(f"   Descripciones enriquecidas: {total_enriched}")
    print("── ¡Listo!")


if __name__ == "__main__":
    main()

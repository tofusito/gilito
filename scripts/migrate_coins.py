#!/usr/bin/env python3
"""
Migración de monedas euro a gilito.db.
Fuentes:
  - OpenNumismat std-commemorative-eu.db → conmemorativas 2004-2021
  - Hardcoded ECB data                   → conmemorativas 2022-2025
  - Gemini API                           → traducción EN→ES de descripciones
"""

import sqlite3
import json
import urllib.request
import urllib.error
import os
import sys

# ── Configuración ─────────────────────────────────────────────────────────────
GILITO_DB  = os.path.join(os.path.dirname(__file__), "../data/gilito.db")
COMEM_DB   = "/tmp/opennumismat/std-commemorative-eu.db"
API_KEY    = os.environ.get("GEMINI_API_KEY", "REDACTED")
ENDPOINT   = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
MODEL      = "gemini-2.5-flash-lite"

# ── Mapa país (nombre inglés → código ISO) ────────────────────────────────────
COUNTRY_MAP = {
    "Andorra": "AD", "Austria": "AT", "Belgium": "BE", "Bulgaria": "BG",
    "Croatia": "HR", "Cyprus": "CY", "Estonia": "EE", "Finland": "FI",
    "France": "FR", "Germany": "DE", "Greece": "GR", "Ireland": "IE",
    "Italy": "IT", "Latvia": "LV", "Lithuania": "LT", "Luxembourg": "LU",
    "Malta": "MT", "Monaco": "MC", "Netherlands": "NL", "Portugal": "PT",
    "San Marino": "SM", "Slovakia": "SK", "Slovenia": "SI", "Spain": "ES",
    "Vatican City": "VA", "Vatican": "VA",
}

# Países eurozona en 2022 que emitieron Erasmus (emisión común 2022)
EUROZONE_2022 = ["AD","AT","BE","CY","DE","EE","ES","FI","FR","GR","IE","IT",
                 "LT","LU","LV","MC","MT","NL","PT","SI","SK","SM","VA"]
# Croacia se unió en 2023
EUROZONE_2023_PLUS = EUROZONE_2022 + ["HR"]

# Series de emisión común
COMMON_SERIES = {
    "50 years of Europe",
    "10 years of EMU",
    "10 years of euro cash",
    "30th anniversary of the EU flag",
    "35 years of Erasmus",
}

# ── Datos 2022-2026 (fuente: ECB) ─────────────────────────────────────────────
# Formato: (country_iso, year, description_en, series, is_common)
ECB_2022_2026 = []

# Emisión común 2022: Erasmus (todos los países eurozona)
for iso in EUROZONE_2022:
    ECB_2022_2026.append((iso, 2022, "35th anniversary of the Erasmus programme", "35 years of Erasmus", 1))

# Monedas específicas 2022
ECB_2022_2026 += [
    ("AD", 2022, "Legend of Charlemagne founding Andorra in 805", None, 0),
    ("AD", 2022, "10th anniversary of monetary agreement with EU", None, 0),
    ("AT", 2022, "35 years of the Erasmus programme", "35 years of Erasmus", 0),  # ya incluida arriba como común, skip
    ("BE", 2022, "Healthcare sector workers in the COVID-19 pandemic", None, 0),
    ("DE", 2022, "Thuringia – Wartburg Castle", "Bundesländer", 0),
    ("EE", 2022, "150th anniversary of the Society of Estonian Literati", None, 0),
    ("EE", 2022, "Support for Ukraine", None, 0),
    ("ES", 2022, "500th anniversary of first circumnavigation of the Earth (Elcano)", None, 0),
    ("ES", 2022, "Garajonay National Park – UNESCO World Heritage", "UNESCO World Heritage", 0),
    ("FI", 2022, "Climate research – beard lichen", None, 0),
    ("FI", 2022, "100 years of Finland's National Ballet", None, 0),
    ("FR", 2022, "Paris 2024 Olympic Games – countdown", None, 0),
    ("FR", 2022, "90th anniversary of President Jacques Chirac's birth", None, 0),
    ("GR", 2022, "200th anniversary of the first Greek Constitution", None, 0),
    ("IT", 2022, "30th anniversary of the deaths of judges Falcone and Borsellino", None, 0),
    ("IT", 2022, "170th anniversary of the foundation of the Italian National Police", None, 0),
    ("LT", 2022, "Suvalkija ethnographic region", None, 0),
    ("LT", 2022, "100 years of basketball in Lithuania", None, 0),
    ("LU", 2022, "10th anniversary of the marriage of Hereditary Grand Duke Guillaume", None, 0),
    ("LU", 2022, "50th anniversary of legal protection of the Luxembourg flag", None, 0),
    ("LV", 2022, "Centenary of Latvijas Banka – financial literacy", None, 0),
    ("MC", 2022, "100th anniversary of the death of Prince Albert I", None, 0),
    ("MT", 2022, "Women, Peace and Security – UN Resolution 1325", None, 0),
    ("MT", 2022, "Ħal Saflieni Hypogeum – UNESCO World Heritage", "UNESCO World Heritage", 0),
    ("PT", 2022, "100th anniversary of the first air crossing of the South Atlantic (Coutinho & Cabral)", None, 0),
    ("SI", 2022, "150th anniversary of the birth of architect Jože Plečnik", None, 0),
    ("SK", 2022, "300th anniversary of Europe's first steam engine", None, 0),
    ("SM", 2022, "530th anniversary of the death of Piero della Francesca", None, 0),
    ("SM", 2022, "Bicentenary of Antonio Canova's death", None, 0),
    ("VA", 2022, "25th anniversary of the death of Mother Teresa of Calcutta", None, 0),
    ("VA", 2022, "125th anniversary of the birth of Pope Paul VI", None, 0),
]

# 2023
ECB_2022_2026 += [
    ("AD", 2023, "Summer solstice fire festivals in the Pyrenees – UNESCO", "UNESCO World Heritage", 0),
    ("AD", 2023, "30th anniversary of entry into the United Nations", None, 0),
    ("BE", 2023, "75th anniversary of women's suffrage in Belgium", None, 0),
    ("BE", 2023, "Year of Art Nouveau in Belgium", None, 0),
    ("CY", 2023, "60th anniversary of the Central Bank of Cyprus", None, 0),
    ("DE", 2023, "Hamburg – Elbphilharmonie", "Bundesländer", 0),
    ("EE", 2023, "Estonian national bird – barn swallow", None, 0),
    ("ES", 2023, "Spanish Presidency of the Council of the EU", None, 0),
    ("ES", 2023, "Cáceres – UNESCO World Heritage", "UNESCO World Heritage", 0),
    ("FI", 2023, "Finland's First Nature Conservation Act", None, 0),
    ("FI", 2023, "Social and health services", None, 0),
    ("FR", 2023, "Rugby World Cup France 2023", None, 0),
    ("FR", 2023, "Paris 2024 Olympic Games", None, 0),
    ("GR", 2023, "100 years since the birth of Maria Callas", None, 0),
    ("GR", 2023, "150 years since the birth of Constantin Carathéodory", None, 0),
    ("HR", 2023, "Introduction of the euro in Croatia", None, 0),
    ("IE", 2023, "50th anniversary of Ireland's EU membership", None, 0),
    ("IT", 2023, "100th anniversary of the Italian Air Force", None, 0),
    ("IT", 2023, "150th anniversary of the death of Alessandro Manzoni", None, 0),
    ("LT", 2023, "Together with Ukraine", None, 0),
    ("LU", 2023, "175th anniversary of the Luxembourg Parliament", None, 0),
    ("LU", 2023, "25th anniversary of Grand Duke Henri's IOC membership", None, 0),
    ("LV", 2023, "Ukraine – sunflower peace symbol", None, 0),
    ("MC", 2023, "100th anniversary of the birth of Prince Rainier III", None, 0),
    ("MT", 2023, "225th anniversary of the French arrival in Malta", None, 0),
    ("MT", 2023, "550th anniversary of the birth of Nicolaus Copernicus", None, 0),
    ("PT", 2023, "World Youth Day – Lisbon 2023", None, 0),
    ("PT", 2023, "Peace among nations", None, 0),
    ("SI", 2023, "150th anniversary of the birth of mathematician Josip Plemelj", None, 0),
    ("SK", 2023, "200th anniversary of horse-drawn express mail coach Vienna–Bratislava", None, 0),
    ("SK", 2023, "100th anniversary of first blood transfusion in Slovakia", None, 0),
    ("SM", 2023, "500th anniversary of the death of Luca Signorelli", None, 0),
    ("VA", 2023, "150th anniversary of the death of Alessandro Manzoni", None, 0),
    ("VA", 2023, "500th anniversary of the death of Pietro Perugino", None, 0),
]

# 2024
ECB_2022_2026 += [
    ("AD", 2024, "Centenary of skiing in Andorra", None, 0),
    ("AD", 2024, "UCI Mountain Bike World Championships 2024", None, 0),
    ("BE", 2024, "Fight against cancer", None, 0),
    ("BE", 2024, "Belgian Presidency of the Council of the EU", None, 0),
    ("CY", 2024, "20 years since Cyprus joined the European Union", None, 0),
    ("DE", 2024, "Mecklenburg-Vorpommern – Königsstuhl chalk cliffs", "Bundesländer", 0),
    ("DE", 2024, "175th anniversary of the Frankfurt Constitution", None, 0),
    ("EE", 2024, "Cornflower – Estonian national flower", None, 0),
    ("ES", 2024, "200 years of the National Police of Spain", None, 0),
    ("ES", 2024, "Cathedral, Alcázar and Archive of the Indies in Seville – UNESCO", "UNESCO World Heritage", 0),
    ("FI", 2024, "Finnish architecture – Gesellius, Lindgren and Saarinen", None, 0),
    ("FI", 2024, "Elections and democracy", None, 0),
    ("FR", 2024, "Paris 2024 Olympic Games – Eiffel Tower", None, 0),
    ("FR", 2024, "Paris 2024 Olympic Games – wrestling and Notre-Dame chimera", None, 0),
    ("GR", 2024, "50 years since the restoration of democracy in Greece", None, 0),
    ("GR", 2024, "150 years since the birth of Penelope Delta", None, 0),
    ("HR", 2024, "500th anniversary of Marko Marulić's literary legacy", None, 0),
    ("HR", 2024, "Varaždin's Old Town medieval fortress", None, 0),
    ("IT", 2024, "250th anniversary of the Guardia di Finanza", None, 0),
    ("IT", 2024, "Rita Levi-Montalcini – Nobel Prize scientist", None, 0),
    ("LT", 2024, "Lithuanian tradition of straw gardens – UNESCO", "UNESCO World Heritage", 0),
    ("LU", 2024, "175th anniversary of the death of Grand Duke Guillaume II", None, 0),
    ("LU", 2024, "100 years of the 'Feierstéppler' currency", None, 0),
    ("LV", 2024, "Himmeli – traditional Latvian Christmas decoration", None, 0),
    ("MC", 2024, "500 years since the Treaty with Charles V", None, 0),
    ("MT", 2024, "Maltese honey bee – endemic species", None, 0),
    ("MT", 2024, "The Citadel on Gozo island", None, 0),
    ("PT", 2024, "50th anniversary of the Carnation Revolution (April 25, 1974)", None, 0),
    ("PT", 2024, "Portugal at the Paris 2024 Olympic Games", None, 0),
    ("SI", 2024, "250 years of the National and University Library", None, 0),
    ("SK", 2024, "100th anniversary of the Košice Peace Marathon", None, 0),
    ("SM", 2024, "530th anniversary of the death of Ghirlandaio", None, 0),
    ("SM", 2024, "50th anniversary of the Declaration of Citizens' Rights", None, 0),
    ("VA", 2024, "750th anniversary of the death of St. Thomas Aquinas", None, 0),
    ("VA", 2024, "150th anniversary of the birth of Guglielmo Marconi", None, 0),
]

# 2025
ECB_2022_2026 += [
    ("AD", 2025, "Games of the Small States of Europe – Andorra 2025", None, 0),
    ("AD", 2025, "Bearded vulture – endangered wildlife protection", None, 0),
    ("BE", 2025, "National Lottery of Belgium", None, 0),
    ("BE", 2025, "Circuit of Spa-Francorchamps", None, 0),
    ("CR", 2025, "1100th anniversary of the Croatian Kingdom and King Tomislav", None, 0),
    ("HR", 2025, "1100th anniversary of the Croatian Kingdom and King Tomislav", None, 0),
    ("HR", 2025, "Pula's Roman amphitheatre – Croatian cities series", None, 0),
    ("DE", 2025, "Saarland – Saarschleife river bend", "Bundesländer", 0),
    ("EE", 2025, "500th anniversary of the first publication with Estonian words", None, 0),
    ("ES", 2025, "Salamanca – UNESCO World Heritage", "UNESCO World Heritage", 0),
    ("FI", 2025, "Finnish state visits and diplomacy", None, 0),
    ("FI", 2025, "Finland-Sweden Athletics International – centenary", None, 0),
    ("FR", 2025, "The Louvre museum", None, 0),
    ("GR", 2025, "200 years since the death of Laskarina Bouboulina", None, 0),
    ("GR", 2025, "100 years since the birth of Mikis Theodorakis", None, 0),
    ("IT", 2025, "Jubilee 2025 – Holy Door of Saint Peter's Basilica", None, 0),
    ("IT", 2025, "Amerigo Vespucci world tour 2023-2025", None, 0),
    ("LT", 2025, "Defence – Lithuania as a hedgehog", None, 0),
    ("LT", 2025, "Lithuanian ethnographic regions – Lithuanian Minor", None, 0),
    ("LU", 2025, "75th anniversary of the Schuman Declaration", None, 0),
    ("LU", 2025, "25th anniversary of Grand Duke Henri's accession to the throne", None, 0),
    ("MC", 2025, "Marquisat des Baux – historical fiefdom", None, 0),
    ("MC", 2025, "Comté de Carladès – Grimaldi family title", None, 0),
    ("MT", 2025, "City of Mdina – Maltese walled cities series", None, 0),
    ("MT", 2025, "Maltese ox – indigenous endangered breed", None, 0),
    ("PT", 2025, "Sustainable development – UN 2030 Agenda", None, 0),
    ("PT", 2025, "World Scouting – 16th World Scout Moot in Portugal", None, 0),
    ("SI", 2025, "100th anniversary of the birth of Miki Muster", None, 0),
    ("SK", 2025, "100th anniversary of the Ice Hockey European Championship (1925)", None, 0),
    ("SM", 2025, "Jubilee Year 2025 – Pilgrims of Hope", None, 0),
    ("VA", 2025, "550th anniversary of the birth of Michelangelo", None, 0),
    ("VA", 2025, "Jubilee 2025 – opening of the Holy Door", None, 0),
    ("VA", 2025, "Sede Vacante 2025", None, 0),
]

# 2026 (datos parciales confirmados)
ECB_2022_2026 += [
    ("DE", 2026, "Saxony-Anhalt – Bauhaus Dessau", "Bundesländer", 0),
    ("ES", 2026, "Monastery of Poblet – UNESCO World Heritage", "UNESCO World Heritage", 0),
    ("ES", 2026, "Art. 49 – Inclusion and disability rights", None, 0),
    ("IT", 2026, "Winter Olympics Milan-Cortina 2026", None, 0),
    ("LU", 2026, "50th anniversary of Prince Henri's marriage", None, 0),
]

# ── Funciones auxiliares ──────────────────────────────────────────────────────

def call_gemini(prompt: str) -> str:
    data = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 8192,
    }).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
    text = result["choices"][0]["message"]["content"]
    return text.replace("```json", "").replace("```", "").strip()


def translate_batch(texts: list[str]) -> dict[str, str]:
    """Traduce una lista de descripciones numismáticas EN→ES."""
    numbered = {str(i): t for i, t in enumerate(texts)}
    prompt = f"""Eres un experto en numismática. Traduce estas descripciones de monedas euro del inglés al español.
Reglas:
- Mantén nombres propios de personas tal como se conocen en español (ej: "Charlemagne" → "Carlomagno")
- Mantén nombres de lugares en español cuando tienen traducción oficial (ej: "Burgos Cathedral" → "Catedral de Burgos")
- Para series como "UNESCO World Heritage" usa "Patrimonio de la Humanidad de la UNESCO"
- Para "30th anniversary of the EU flag" usa "30 aniversario de la bandera de la Unión Europea"
- Sé preciso y conciso, estilo descripción de moneda oficial española
- Responde SOLO con un JSON object: {{"0": "traducción 0", "1": "traducción 1", ...}}

Textos a traducir:
{json.dumps(numbered, ensure_ascii=False)}"""

    raw = call_gemini(prompt)
    result = json.loads(raw)
    return {texts[int(k)]: v for k, v in result.items()}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("── Leyendo OpenNumismat commemorative DB…")
    src = sqlite3.connect(COMEM_DB)
    # DISTINCT para evitar duplicados por ceca (Alemania tiene 5 variantes)
    rows_onm = src.execute(
        "SELECT DISTINCT country, year, CAST(value AS REAL), subjectshort, series "
        "FROM coins ORDER BY country, year"
    ).fetchall()
    src.close()
    print(f"   {len(rows_onm)} monedas de OpenNumismat (antes de filtrar)")

    # Construir lista normalizada de conmemorativas
    # (iso, year, denomination, description_en, series, is_common)
    coins_to_add: list[tuple] = []

    for country_en, year, value, subject, series in rows_onm:
        iso = COUNTRY_MAP.get(country_en)
        if not iso:
            print(f"   ⚠ País desconocido: {country_en}")
            continue
        is_common = 1 if series in COMMON_SERIES else 0
        coins_to_add.append((iso, year, float(value), subject or "", series, is_common))

    # Añadir ECB 2022-2026
    seen_common: set[tuple] = set()
    for iso, year, desc_en, series, is_common in ECB_2022_2026:
        # Deduplicar emisiones comunes (ya añadidas como bucle arriba)
        if is_common:
            key = (year, desc_en, iso)
            if key in seen_common:
                continue
            seen_common.add(key)
        if not iso or iso == "CR":  # "CR" era un typo, ya está HR
            continue
        coins_to_add.append((iso, year, 2.0, desc_en, series, is_common))

    # Deduplicar lista completa por (iso, year, description_en)
    seen: set[tuple] = set()
    deduped = []
    for row in coins_to_add:
        key = (row[0], row[1], row[3])
        if key not in seen:
            seen.add(key)
            deduped.append(row)
    coins_to_add = deduped
    print(f"   {len(coins_to_add)} monedas totales tras deduplicar")

    # ── Recopilar descripciones únicas para traducir ──────────────────────────
    unique_descs = list(set(r[3] for r in coins_to_add if r[3]))
    print(f"\n── Traduciendo {len(unique_descs)} descripciones únicas con Gemini…")

    translations: dict[str, str] = {}
    batch_size = 80
    batches = [unique_descs[i:i+batch_size] for i in range(0, len(unique_descs), batch_size)]
    for i, batch in enumerate(batches):
        print(f"   Lote {i+1}/{len(batches)} ({len(batch)} textos)…", end=" ", flush=True)
        try:
            t = translate_batch(batch)
            translations.update(t)
            print("✓")
        except Exception as e:
            print(f"✗ Error: {e}")
            # Fallback: usar texto original
            for txt in batch:
                translations[txt] = txt

    # ── Cargar country_id map de gilito.db ────────────────────────────────────
    print("\n── Actualizando gilito.db…")
    dst = sqlite3.connect(GILITO_DB)
    country_ids = {row[1]: row[0] for row in dst.execute("SELECT id, code FROM countries").fetchall()}

    # Borrar todas las conmemorativas existentes
    deleted = dst.execute("DELETE FROM coins WHERE type='COMMEMORATIVE'").rowcount
    print(f"   Eliminadas {deleted} monedas conmemorativas antiguas")

    # Insertar nuevas
    inserted = 0
    skipped  = 0
    for iso, year, denom, desc_en, series, is_common in coins_to_add:
        country_id = country_ids.get(iso)
        if not country_id:
            print(f"   ⚠ country_id no encontrado para ISO: {iso}")
            skipped += 1
            continue
        desc_es = translations.get(desc_en, desc_en)
        dst.execute(
            """INSERT OR IGNORE INTO coins
               (country_id, denomination, year, type, description, series_name, is_common_issue)
               VALUES (?,?,?,?,?,?,?)""",
            (country_id, denom, year, "COMMEMORATIVE", desc_es, series, is_common)
        )
        inserted += 1

    dst.commit()

    # ── Limpieza: user_coins huérfanas ────────────────────────────────────────
    orphans = dst.execute(
        "DELETE FROM user_coins WHERE coin_id NOT IN (SELECT id FROM coins)"
    ).rowcount
    dst.commit()
    dst.close()

    print(f"\n── Resumen ──────────────────────────────────────────────────────")
    print(f"   Insertadas: {inserted}")
    print(f"   Omitidas:   {skipped}")
    if orphans:
        print(f"   user_coins huérfanas eliminadas: {orphans}")
    print(f"   Traducciones generadas: {len(translations)}")
    print("── ¡Migración completada!")


if __name__ == "__main__":
    main()

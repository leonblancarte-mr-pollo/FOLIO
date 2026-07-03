"""
Encuentra posibles libros duplicados en books_curated (p. ej. "100 Años de
Soledad" vs "Cien Años de Soledad") comparando título y autor normalizados
con fuzzy matching.

Solo lee de Supabase (no requiere service_role key, la publishable/anon
basta porque books_curated tiene SELECT abierto).

Uso:
    python scripts/find_duplicates.py

Salida:
    duplicates_report.csv — pares candidatos a duplicado, para revisión manual.
"""

import os
import re
import sys
import unicodedata

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import pandas as pd
from fuzzywuzzy import fuzz
from supabase import create_client

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or "https://dvegpxvfeynbzveglqxk.supabase.co"
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_KEY:
    # Fallback: leer de .env.local si no viene por entorno
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("VITE_SUPABASE_ANON_KEY="):
                SUPABASE_KEY = line.strip().split("=", 1)[1]

TITLE_THRESHOLD = 85
AUTHOR_THRESHOLD = 80


def normalize(text: str) -> str:
    text = (text or "").lower()
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    all_rows = []
    page = 0
    page_size = 1000
    while True:
        resp = (
            supabase.table("books_curated")
            .select("id, title, author")
            .range(page * page_size, page * page_size + page_size - 1)
            .execute()
        )
        if not resp.data:
            break
        all_rows.extend(resp.data)
        if len(resp.data) < page_size:
            break
        page += 1

    books_df = pd.DataFrame(all_rows)
    print(f"Libros leídos de books_curated: {len(books_df)}")

    books_df["title_norm"] = books_df["title"].apply(normalize)
    books_df["author_norm"] = books_df["author"].apply(normalize)

    duplicates = []
    n = len(books_df)
    for i in range(n):
        for j in range(i + 1, n):
            title_sim = fuzz.token_set_ratio(books_df.iloc[i]["title_norm"], books_df.iloc[j]["title_norm"])
            if title_sim <= TITLE_THRESHOLD:
                continue
            author_sim = fuzz.token_set_ratio(books_df.iloc[i]["author_norm"], books_df.iloc[j]["author_norm"])
            if author_sim <= AUTHOR_THRESHOLD:
                continue
            duplicates.append(
                {
                    "id_1": books_df.iloc[i]["id"],
                    "title_1": books_df.iloc[i]["title"],
                    "author_1": books_df.iloc[i]["author"],
                    "id_2": books_df.iloc[j]["id"],
                    "title_2": books_df.iloc[j]["title"],
                    "author_2": books_df.iloc[j]["author"],
                    "title_similarity": title_sim,
                    "author_similarity": author_sim,
                    "action": "",  # a llenar manualmente: MERGE o KEEP
                }
            )

    df_duplicates = pd.DataFrame(
        duplicates,
        columns=[
            "id_1", "title_1", "author_1",
            "id_2", "title_2", "author_2",
            "title_similarity", "author_similarity", "action",
        ],
    )
    df_duplicates = df_duplicates.sort_values("title_similarity", ascending=False)

    out_path = os.path.join(os.path.dirname(__file__), "..", "duplicates_report.csv")
    df_duplicates.to_csv(out_path, index=False, encoding="utf-8-sig")

    print(f"\n✅ Encontrados {len(duplicates)} potenciales duplicados de {n} libros")
    print(f"💾 Reporte: {out_path}\n")
    if len(duplicates):
        with pd.option_context("display.max_colwidth", 40, "display.width", 160):
            print(df_duplicates[["title_1", "author_1", "title_2", "author_2", "title_similarity", "author_similarity"]].to_string(index=False))


if __name__ == "__main__":
    main()

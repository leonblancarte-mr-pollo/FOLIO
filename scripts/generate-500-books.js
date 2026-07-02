/**
 * Genera el catálogo de 500 libros con portadas verificadas.
 *
 * Cascada de portadas (por libro):
 *   1. Google Books API (isbn / intitle+inauthor) — thumbnail con zoom mejorado
 *   2. OpenLibrary search.json (title+author) — cover_i → covers.openlibrary.org/b/id/{id}-L.jpg
 *   3. OpenLibrary covers por ISBN — covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false
 *
 * Cada URL final se verifica con una petición real (status 200, content-type imagen,
 * tamaño > 2KB para descartar el pixel 1x1 de OpenLibrary).
 *
 * Salidas:
 *   scripts/books-500.json  — dataset final con cover_url e isbn resueltos
 *   scripts/books-500.sql   — DELETE + INSERTs listos para el SQL Editor de Supabase
 *
 * Uso:
 *   node scripts/generate-500-books.js            # resolver portadas + generar SQL/JSON
 *   node scripts/generate-500-books.js --verify   # re-verificar una muestra de 20 covers del JSON
 *   node scripts/generate-500-books.js --upload   # subir a Supabase (requiere SUPABASE_SECRET_KEY)
 */

import { BOOKS } from "./books-data.js";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_OUT = join(__dirname, "books-500.json");
const SQL_OUT = join(__dirname, "books-500.sql");

const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Validación del dataset ────────────────────────────────────────────────
function validate() {
  const seen = new Map();
  const genreCounts = {};
  const problems = [];

  for (const b of BOOKS) {
    const key = `${b.title.toLowerCase()}__${b.author.toLowerCase()}`;
    if (seen.has(key)) problems.push(`DUPLICADO: ${b.title} — ${b.author}`);
    seen.set(key, true);

    const words = b.description.trim().split(/\s+/).length;
    if (words < 9 || words > 22) problems.push(`DESC ${words}w: ${b.title}`);
    if (b.rating < 4.0 || b.rating > 4.9) problems.push(`RATING ${b.rating}: ${b.title}`);
    if (!b.genres?.length || b.genres.length > 3) problems.push(`GENRES: ${b.title}`);

    const primary = b.genres[0];
    genreCounts[primary] = (genreCounts[primary] || 0) + 1;
  }

  console.log(`\n📚 Total libros: ${BOOKS.length}`);
  console.log("Distribución por género principal:");
  for (const [g, n] of Object.entries(genreCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g}: ${n}`);
  }
  if (problems.length) {
    console.log(`\n⚠️  ${problems.length} problemas:`);
    problems.slice(0, 30).forEach((p) => console.log("  " + p));
  }
  return problems.length === 0;
}

// ── Verificación de imagen ────────────────────────────────────────────────
async function verifyImage(url, { minBytes = 2000 } = {}) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return false;
    const buf = await res.arrayBuffer();
    return buf.byteLength >= minBytes;
  } catch {
    return false;
  }
}

// ── Fuente 1: Google Books ────────────────────────────────────────────────
let googleDead = false; // si la cuota está agotada, dejar de intentar
async function tryGoogleBooks(book) {
  if (googleDead) return null;
  const keyParam = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : "";
  const queries = [];
  if (book.isbn) queries.push(`isbn:${book.isbn}`);
  queries.push(`intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author.split(" y ")[0])}`);
  if (book.alt) queries.push(`intitle:${encodeURIComponent(book.alt)}+inauthor:${encodeURIComponent(book.author.split(" y ")[0])}`);

  for (const q of queries) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3${keyParam}`, { signal: AbortSignal.timeout(10000) });
      if (res.status === 429) { googleDead = true; return null; }
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.items || []) {
        const vi = item.volumeInfo || {};
        const thumb = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail;
        if (!thumb) continue;
        const isbn13 = (vi.industryIdentifiers || []).find((i) => i.type === "ISBN_13")?.identifier;
        // zoom=3 da mejor resolución; probar y degradar a zoom=1
        const hi = thumb.replace("http://", "https://").replace("zoom=1", "zoom=3").replace("&edge=curl", "");
        if (await verifyImage(hi)) return { cover: hi, isbn: isbn13, pages: vi.pageCount, source: "google" };
        const lo = thumb.replace("http://", "https://").replace("&edge=curl", "");
        if (await verifyImage(lo)) return { cover: lo, isbn: isbn13, pages: vi.pageCount, source: "google" };
      }
    } catch { /* siguiente query */ }
  }
  return null;
}

// ── Fuente 2: OpenLibrary search ──────────────────────────────────────────
async function tryOpenLibrarySearch(book) {
  const attempts = [
    { title: book.title, author: book.author.split(" y ")[0] },
    ...(book.alt ? [{ title: book.alt, author: book.author.split(" y ")[0] }] : []),
  ];
  for (const a of attempts) {
    try {
      const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(a.title)}&author=${encodeURIComponent(a.author)}&fields=cover_i,isbn,number_of_pages_median&limit=3`;
      const res = await fetch(url, { headers: { "User-Agent": "FolioApp/1.0 (folio-final.vercel.app)" }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const doc of data.docs || []) {
        if (!doc.cover_i) continue;
        const cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        if (await verifyImage(cover)) {
          const isbn13 = (doc.isbn || []).find((i) => i.length === 13 && (i.startsWith("978") || i.startsWith("979")));
          return { cover, isbn: isbn13, pages: doc.number_of_pages_median, source: "openlibrary-search" };
        }
      }
    } catch { /* siguiente intento */ }
  }
  return null;
}

// ── Fuente 3: OpenLibrary covers por ISBN ─────────────────────────────────
async function tryOpenLibraryIsbn(book) {
  if (!book.isbn) return null;
  const cover = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
  if (await verifyImage(cover)) {
    return { cover: `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`, isbn: book.isbn, source: "openlibrary-isbn" };
  }
  return null;
}

async function resolveBook(book) {
  const found =
    (await tryGoogleBooks(book)) ||
    (await tryOpenLibrarySearch(book)) ||
    (await tryOpenLibraryIsbn(book));

  return {
    title: book.title,
    author: book.author,
    description: book.description,
    genres: book.genres,
    subgenres: book.subgenres || [],
    cover_url: found?.cover || null,
    rating: book.rating,
    isbn: found?.isbn || book.isbn || null,
    language: book.language,
    pages: book.pages || found?.pages || null,
    _source: found?.source || "none",
  };
}

// ── Resolución con concurrencia limitada ──────────────────────────────────
async function resolveAll() {
  const results = new Array(BOOKS.length);
  let done = 0;
  const CONCURRENCY = 5;
  let cursor = 0;

  async function worker() {
    while (cursor < BOOKS.length) {
      const i = cursor++;
      results[i] = await resolveBook(BOOKS[i]);
      done++;
      if (done % 25 === 0) console.log(`  ...${done}/${BOOKS.length}`);
      await sleep(120);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

// ── SQL ───────────────────────────────────────────────────────────────────
const esc = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => (a?.length ? `ARRAY[${a.map(esc).join(",")}]` : "ARRAY[]::text[]");

function toSql(books) {
  const lines = [
    "-- Catálogo curado: 500 libros con portadas verificadas",
    `-- Generado: ${new Date().toISOString()}`,
    "BEGIN;",
    "DELETE FROM books_curated WHERE 1=1;",
    "",
  ];
  const CHUNK = 50;
  for (let i = 0; i < books.length; i += CHUNK) {
    const values = books.slice(i, i + CHUNK).map((b) =>
      `(${esc(b.title)}, ${esc(b.author)}, ${esc(b.description)}, ${arr(b.genres)}, ${arr(b.subgenres)}, ${esc(b.cover_url)}, ${b.rating}, ${esc(b.isbn)}, ${esc(b.language)}, ${b.pages ?? "NULL"})`
    );
    lines.push(
      "INSERT INTO books_curated (title, author, description, genres, subgenres, cover_url, rating, isbn, language, pages) VALUES\n" +
        values.join(",\n") +
        ";"
    );
    lines.push("");
  }
  lines.push("COMMIT;");
  lines.push("-- SELECT COUNT(*) FROM books_curated; -- debe ser " + books.length);
  return lines.join("\n");
}

// ── Upload directo (requiere key secreta) ─────────────────────────────────
async function upload(books) {
  const url = process.env.VITE_SUPABASE_URL || "https://dvegpxvfeynbzveglqxk.supabase.co";
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    console.error("Falta SUPABASE_SECRET_KEY (sb_secret_...). Obtenla en Dashboard → Settings → API keys.");
    process.exit(1);
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  console.log("Borrando books_curated...");
  const del = await fetch(`${url}/rest/v1/books_curated?id=not.is.null`, { method: "DELETE", headers });
  if (!del.ok) { console.error("DELETE falló:", del.status, await del.text()); process.exit(1); }

  console.log("Insertando", books.length, "libros...");
  const rows = books.map(({ _source, ...b }) => b);
  for (let i = 0; i < rows.length; i += 100) {
    const res = await fetch(`${url}/rest/v1/books_curated`, { method: "POST", headers, body: JSON.stringify(rows.slice(i, i + 100)) });
    if (!res.ok) { console.error(`INSERT lote ${i} falló:`, res.status, await res.text()); process.exit(1); }
    console.log(`  insertados ${Math.min(i + 100, rows.length)}/${rows.length}`);
  }

  const count = await fetch(`${url}/rest/v1/books_curated?select=id`, { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } });
  console.log("Count final:", count.headers.get("content-range"));
}

// ── Fix: reintentar los libros sin portada con estrategias extra ──────────
const deaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const stripSubtitle = (s) => s.split(":")[0].trim();

async function fixMissing() {
  const books = JSON.parse(readFileSync(JSON_OUT, "utf8"));
  const missing = books.filter((b) => !b.cover_url);
  console.log(`Reintentando ${missing.length} libros sin portada...\n`);

  for (const b of missing) {
    const seed = BOOKS.find((x) => x.title === b.title && x.author === b.author) || b;
    const mainAuthor = b.author.split(" y ")[0];
    const attempts = [];
    for (const t of [seed.alt, stripSubtitle(b.title), stripSubtitle(seed.alt || ""), b.title].filter(Boolean)) {
      for (const a of [mainAuthor, deaccent(mainAuthor), mainAuthor.split(" ").pop()]) {
        attempts.push(`title=${encodeURIComponent(t)}&author=${encodeURIComponent(a)}`);
      }
      attempts.push(`q=${encodeURIComponent(t + " " + deaccent(mainAuthor))}`);
    }

    let found = null;
    for (const qs of [...new Set(attempts)]) {
      try {
        const res = await fetch(`https://openlibrary.org/search.json?${qs}&fields=cover_i,isbn,title&limit=5`, {
          headers: { "User-Agent": "FolioApp/1.0 (folio-final.vercel.app)" },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        for (const doc of data.docs || []) {
          if (!doc.cover_i) continue;
          const cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          if (await verifyImage(cover)) {
            const isbn13 = (doc.isbn || []).find((i) => i.length === 13 && (i.startsWith("978") || i.startsWith("979")));
            found = { cover, isbn: isbn13 };
            break;
          }
        }
        if (found) break;
      } catch { /* siguiente */ }
      await sleep(150);
    }

    if (found) {
      b.cover_url = found.cover;
      if (!b.isbn && found.isbn) b.isbn = found.isbn;
      b._source = "openlibrary-fix";
      console.log(`  ✅ ${b.title}`);
    } else {
      console.log(`  ❌ ${b.title} — seguirá con fallback visual`);
    }
  }

  writeFileSync(JSON_OUT, JSON.stringify(books, null, 1));
  writeFileSync(SQL_OUT, toSql(books));
  const still = books.filter((x) => !x.cover_url).length;
  console.log(`\nSin portada tras fix: ${still}/${books.length}. JSON y SQL regenerados.`);
}

// ── Verificación de muestra ───────────────────────────────────────────────
async function verifySample() {
  const books = JSON.parse(readFileSync(JSON_OUT, "utf8"));
  const withCover = books.filter((b) => b.cover_url);
  const sample = [...withCover].sort(() => Math.random() - 0.5).slice(0, 20);
  let ok = 0;
  for (const b of sample) {
    const good = await verifyImage(b.cover_url);
    console.log(`  ${good ? "✅" : "❌"} ${b.title} → ${b.cover_url}`);
    if (good) ok++;
  }
  console.log(`\nMuestra: ${ok}/20 portadas OK`);
}

// ── Main ──────────────────────────────────────────────────────────────────
const mode = process.argv[2];

if (mode === "--verify") {
  await verifySample();
} else if (mode === "--fix") {
  await fixMissing();
} else if (mode === "--upload") {
  if (!existsSync(JSON_OUT)) { console.error("Corre primero sin flags para generar books-500.json"); process.exit(1); }
  await upload(JSON.parse(readFileSync(JSON_OUT, "utf8")));
} else {
  if (!validate()) console.log("\n(continuando pese a advertencias)\n");
  console.log("\n🔍 Resolviendo portadas (Google Books → OpenLibrary)...\n");
  const t0 = Date.now();
  const results = await resolveAll();

  const stats = {};
  for (const r of results) stats[r._source] = (stats[r._source] || 0) + 1;
  const withIsbn = results.filter((r) => r.isbn).length;

  console.log(`\n⏱️  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log("📊 Fuentes de portada:");
  for (const [s, n] of Object.entries(stats)) console.log(`  ${s}: ${n}`);
  console.log(`  Con ISBN: ${withIsbn}/${results.length}`);
  const missing = results.filter((r) => r._source === "none");
  if (missing.length) {
    console.log(`\n❌ Sin portada (${missing.length}):`);
    missing.forEach((m) => console.log(`  - ${m.title} — ${m.author}`));
  }

  writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
  writeFileSync(SQL_OUT, toSql(results));
  console.log(`\n💾 ${JSON_OUT}\n💾 ${SQL_OUT}`);
}

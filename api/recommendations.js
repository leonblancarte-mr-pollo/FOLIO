// GET /api/recommendations
// Requiere header Authorization: Bearer <access_token de la sesión Supabase>.
//
// Usa la key ANON (nunca la service_role) + el JWT del propio usuario, así
// que RLS en recommendation_scores (auth.uid() = user_id) filtra solo sus
// filas — no hay forma de pedir las recomendaciones de otro usuario.
//
// Este endpoint NUNCA ejecuta Python ni carga un modelo: solo lee la tabla
// recommendation_scores, que scripts/train_recommender.py llena vía un job
// aparte (GitHub Actions, cron diario). Ver .github/workflows/train-recommender.yml.

import { createClient } from "@supabase/supabase-js";
import { expandGenres } from "../src/data/genreMap.js";
import { normalizeGenre } from "../src/services/genreService.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const RESULT_SIZE = 20;
// Se trae casi todo el catálogo (~500) para poder priorizar por género en JS:
// books_curated.genres no usa siempre las mismas mayúsculas/acentos.
const FALLBACK_POOL_SIZE = 400;
const TOP_LIBRARY_GENRES = 5;
const MIN_RATINGS_FOR_PERSONALIZATION = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ownedKey(b) {
  return `${(b.title || "").toLowerCase().trim()}__${(b.author || "").toLowerCase().trim()}`;
}

// Clave de comparación de géneros: "Ciencia Ficción", "ciencia ficcion" y
// "Science Fiction" (vía normalizeGenre) cuentan igual.
function genreKey(g) {
  return (normalizeGenre(g) || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Géneros del usuario = los elegidos en el registro (preferred_genres,
// expandidos con GENRE_MAP) + los más frecuentes de su biblioteca. Antes no se
// usaba ninguno: el respaldo eran los mejor valorados del catálogo (filosofía
// clásica) aunque el usuario leyera fantasía y ciencia ficción.
async function loadUserContext(supabase, userId) {
  const [{ data: owned, error: ownedErr }, { data: profile, error: profileErr }] = await Promise.all([
    supabase.from("books").select("title, author, genre").eq("user_id", userId),
    supabase.from("users").select("preferred_genres").eq("id", userId).maybeSingle(),
  ]);
  if (ownedErr) console.error("[api/recommendations] no se pudo leer la biblioteca:", ownedErr.message);
  if (profileErr) console.error("[api/recommendations] no se pudieron leer los géneros del perfil:", profileErr.message);

  const ownedKeys = new Set((owned || []).map(ownedKey));
  const counts = {};
  (owned || []).forEach((b) => {
    const k = genreKey(b.genre);
    if (k) counts[k] = (counts[k] || 0) + 1;
  });
  const libraryGenres = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, TOP_LIBRARY_GENRES).map(([k]) => k);
  const preferred = expandGenres(profile?.preferred_genres || []).map(genreKey);
  return { ownedKeys, userGenres: new Set([...preferred, ...libraryGenres].filter(Boolean)) };
}

function genreMatches(genres, userGenres) {
  return (genres || []).reduce((n, g) => n + (userGenres.has(genreKey(g)) ? 1 : 0), 0);
}

// Libros del usuario fuera; primero los que coinciden con sus géneros (más
// coincidencias primero), después el resto. El orden de entrada desempata.
function rankForUser(items, { ownedKeys, userGenres }) {
  return items
    .filter((b) => !ownedKeys.has(ownedKey(b)))
    .map((b, i) => ({ b, i, m: genreMatches(b.genres, userGenres) }))
    .sort((x, y) => (y.m > 0) - (x.m > 0) || y.m - x.m || x.i - y.i)
    .map(({ b }) => b);
}

async function fallbackRecommendations(supabase, userId, ctx) {
  const { data: pool, error: poolErr } = await supabase
    .from("books_curated")
    .select("id, title, author, cover_url, genres, rating, description")
    .order("rating", { ascending: false })
    .limit(FALLBACK_POOL_SIZE);
  if (poolErr) throw poolErr;

  // Variedad dentro de cada grupo (los que coinciden y los que no), sin perder
  // la prioridad por género.
  const ranked = rankForUser(shuffle(pool || []), ctx);
  const matched = ranked.filter((b) => genreMatches(b.genres, ctx.userGenres) > 0);
  const reason = matched.length > 0 ? "Según tus géneros favoritos" : "Libros mejor valorados del catálogo";
  const items = ranked
    .slice(0, RESULT_SIZE)
    .map((b) => ({
      book_id: b.id,
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      genres: b.genres,
      predicted_rating: b.rating,
      reason,
    }));

  return { items, personalized: false, byGenre: matched.length > 0 };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Missing Authorization header" });

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }
  const userId = userData.user.id;

  try {
    const ctx = await loadUserContext(supabase, userId);
    const { count: ratingCount, error: countErr } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["read", "reading"]);
    if (countErr) throw countErr;

    if ((ratingCount ?? 0) >= MIN_RATINGS_FOR_PERSONALIZATION) {
      const { data: scored, error: scoredErr } = await supabase
        .from("recommendation_scores")
        .select("predicted_rating, reason, book_id, books_curated(id, title, author, cover_url, genres)")
        .order("predicted_rating", { ascending: false })
        .limit(RESULT_SIZE * 3);
      if (scoredErr) throw scoredErr;

      if ((scored || []).length > 0) {
        const candidates = scored
          .filter((r) => r.books_curated)
          .map((r) => ({
            book_id: r.book_id,
            title: r.books_curated.title,
            author: r.books_curated.author,
            cover_url: r.books_curated.cover_url,
            genres: r.books_curated.genres,
            predicted_rating: Number(r.predicted_rating),
            reason: r.reason,
          }));
        // Mismo criterio que el respaldo: sin libros propios y géneros del usuario primero.
        const items = rankForUser(candidates, ctx).slice(0, RESULT_SIZE);
        if (items.length > 0) {
          res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
          return res.status(200).json({ items, personalized: true });
        }
        // Todas las recomendaciones del modelo ya están en su biblioteca → respaldo.
      }
      // El job diario todavía no corrió para este usuario (recién llegó a
      // 3+ ratings) — cae al fallback en vez de fallar.
    }

    const result = await fallbackRecommendations(supabase, userId, ctx);
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    return res.status(200).json(result);
  } catch (err) {
    console.error("[api/recommendations] error:", err.message);
    return res.status(500).json({ error: "No se pudieron cargar las recomendaciones" });
  }
}

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const RESULT_SIZE = 20;
const FALLBACK_POOL_SIZE = 60;
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

async function fallbackRecommendations(supabase, userId) {
  const { data: owned } = await supabase.from("books").select("title, author").eq("user_id", userId);
  const ownedKeys = new Set((owned || []).map(ownedKey));

  const { data: pool, error: poolErr } = await supabase
    .from("books_curated")
    .select("id, title, author, cover_url, genres, rating, description")
    .order("rating", { ascending: false })
    .limit(FALLBACK_POOL_SIZE);
  if (poolErr) throw poolErr;

  const filtered = (pool || []).filter((b) => !ownedKeys.has(ownedKey(b)));
  const items = shuffle(filtered)
    .slice(0, RESULT_SIZE)
    .map((b) => ({
      book_id: b.id,
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      genres: b.genres,
      predicted_rating: b.rating,
      reason: "Libros mejor valorados del catálogo",
    }));

  return { items, personalized: false };
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
        .limit(RESULT_SIZE);
      if (scoredErr) throw scoredErr;

      if ((scored || []).length > 0) {
        const items = scored
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
        res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
        return res.status(200).json({ items, personalized: true });
      }
      // El job diario todavía no corrió para este usuario (recién llegó a
      // 3+ ratings) — cae al fallback en vez de fallar.
    }

    const result = await fallbackRecommendations(supabase, userId);
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    return res.status(200).json(result);
  } catch (err) {
    console.error("[api/recommendations] error:", err.message);
    return res.status(500).json({ error: "No se pudieron cargar las recomendaciones" });
  }
}

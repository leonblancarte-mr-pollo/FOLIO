import { supabase } from "../supabase.js";
import { localDateStr } from "./streakService.js";
import { devLog } from "./devLog.js";

const DAILY_LIMIT = 15;
const GEMS_PER_PACK = 5;
const SAVES_PER_PACK = 5;

// Maps onboarding IDs → genre labels used in books_curated.genres
// Onboarding saves: "ciencia-ficcion", "filosofia", etc.
// books_curated uses: "Ciencia Ficción", "Filosofía", etc.
const GENRE_MAP = {
  "novela":              ["Clásicos", "Drama", "Realismo Mágico", "Vanguardia", "Ficción", "Épica", "Novela Contemporánea"],
  "filosofia":           ["Filosofía", "Filosófico"],
  "historia":            ["Historia", "Biografía"],
  "ciencia":             ["Ciencia", "Hard SF", "Educación"],
  "terror":              ["Terror", "Horror", "Misterio", "Thriller"],
  "romance":             ["Romance"],
  "biografia":           ["Biografía", "Historia"],
  "desarrollo-personal": ["Ensayo", "Psicología", "Educación"],
  "poesia":              ["Poesía"],
  "ciencia-ficcion":     ["Ciencia Ficción", "Distopía", "Cyberpunk", "Hard SF"],
  "ensayo":              ["Ensayo", "Filosófico", "Política", "Educación"],
  "arte":                ["Arte", "Creatividad"],
};

// Fila de books_curated → libro del catálogo en camelCase.
function dbToCuratedBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    genres: row.genres || [],
    subgenres: row.subgenres || [],
    coverUrl: row.cover_url || null,
    rating: row.rating,
    isbn: row.isbn,
    language: row.language,
    pages: row.pages,
  };
}

function expandGenres(preferredGenres) {
  const expanded = new Set();
  for (const g of preferredGenres) {
    const mapped = GENRE_MAP[g];
    if (mapped) {
      mapped.forEach((m) => expanded.add(m));
    } else {
      // Already a label (e.g. "Ciencia Ficción") — pass through
      expanded.add(g);
    }
  }
  return [...expanded];
}

export async function getPreferredGenres(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("preferred_genres, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) console.warn("[recommendationService] getPreferredGenres error:", error.message);

  return {
    genres: data?.preferred_genres || [],
    onboardingCompleted: data?.onboarding_completed === true,
  };
}

export async function getRecommendations(userId, preferredGenres = [], limit = 20) {
  // Expand onboarding IDs to actual genre labels
  const expandedGenres = expandGenres(preferredGenres);

  devLog("[BookTinder] preferred_genres from DB:", preferredGenres);
  devLog("[BookTinder] expanded to curated labels:", expandedGenres);

  // Fetch books user already has (exclude by title+author)
  const { data: existing, error: existingErr } = await supabase
    .from("books")
    .select("title, author, isbn")
    .eq("user_id", userId);
  if (existingErr) console.error("[BookTinder] no se pudo leer la biblioteca para excluir libros:", existingErr.message);

  const existingKeys = new Set(
    (existing || []).map((b) => `${b.title?.toLowerCase()}__${b.author?.toLowerCase()}`)
  );
  const existingIsbns = new Set(
    (existing || []).map((b) => b.isbn).filter(Boolean)
  );

  // Try genre-matched query first
  let candidates = [];
  if (expandedGenres.length > 0) {
    const { data, error } = await supabase
      .from("books_curated")
      .select("*")
      .overlaps("genres", expandedGenres)
      .order("rating", { ascending: false })
      .limit(limit * 4);

    if (error) {
      console.warn("[BookTinder] genre query error:", error.message, "— falling back to all books");
    } else {
      candidates = data || [];
      devLog("[BookTinder] genre-matched results:", candidates.length);
    }
  }

  // Fallback: fetch all books if genre query returned nothing
  if (candidates.length === 0) {
    devLog("[BookTinder] No genre matches — loading all books as fallback");
    const { data: all, error } = await supabase
      .from("books_curated")
      .select("*")
      .order("rating", { ascending: false })
      .limit(limit * 4);

    if (error) throw error;
    candidates = all || [];
    devLog("[BookTinder] fallback results:", candidates.length);
  }

  // Filter already-owned books client-side
  const filtered = candidates.filter((book) => {
    if (book.isbn && existingIsbns.has(book.isbn)) return false;
    const key = `${book.title?.toLowerCase()}__${book.author?.toLowerCase()}`;
    return !existingKeys.has(key);
  });

  // Shuffle for variety
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const result = shuffled.slice(0, limit).map(dbToCuratedBook);
  devLog("[BookTinder] final recommendations:", result.length);
  return result;
}

// Estado del límite diario de guardados. Si la lectura falla, degrada a "0 usados"
// (no bloquea el swipe) pero deja el error en consola.
export async function checkDailyLimit(userId) {
  const today = localDateStr();
  const { data, error } = await supabase
    .from("daily_save_limits")
    .select("saves_used, gems_spent")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  if (error) console.error("[BookTinder] checkDailyLimit:", error.message);

  const savesUsed = data?.saves_used ?? 0;
  const gemsSpent = data?.gems_spent ?? 0;
  const effectiveLimit = DAILY_LIMIT + gemsSpent;

  return {
    savesUsed,
    gemsSpent,
    limit: DAILY_LIMIT,
    effectiveLimit,
    canSave: savesUsed < effectiveLimit,
    savesLeft: Math.max(0, effectiveLimit - savesUsed),
  };
}

export async function incrementSaveCounter(userId) {
  const today = localDateStr();

  const { data, error: readErr } = await supabase
    .from("daily_save_limits")
    .select("saves_used, gems_spent")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  if (readErr) throw readErr;

  const { error } = await supabase.from("daily_save_limits").upsert(
    {
      user_id: userId,
      date: today,
      saves_used: (data?.saves_used ?? 0) + 1,
      gems_spent: data?.gems_spent ?? 0,
    },
    { onConflict: "user_id,date" }
  );
  if (error) throw error;
}

export async function buyExtraSaves(userId) {
  const today = localDateStr();

  // El descuento lo hace el servidor (RPC SECURITY DEFINER spend_gems, supabase/spend_gems.sql):
  // valida saldo, descuenta atómicamente y deja una fila negativa en reward_ledger.
  // Devuelve { success, balance } o { success:false, error: código }.
  const { data: spent, error: rpcErr } = await supabase.rpc("spend_gems", {
    p_amount: GEMS_PER_PACK,
    p_reason: "buy_extra_saves",
  });

  if (rpcErr) {
    console.error("[BookTinder] buyExtraSaves: fallo la RPC spend_gems:", rpcErr.message);
    return { success: false, error: rpcErr.message };
  }
  if (!spent?.success) {
    console.error("[BookTinder] buyExtraSaves: spend_gems rechazó el cobro:", spent?.error);
    return { success: false, error: spent?.error || "UNKNOWN" };
  }

  const { data: limitRow } = await supabase
    .from("daily_save_limits")
    .select("saves_used, gems_spent")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const { error: limitErr } = await supabase.from("daily_save_limits").upsert(
    {
      user_id: userId,
      date: today,
      saves_used: limitRow?.saves_used ?? 0,
      gems_spent: (limitRow?.gems_spent ?? 0) + GEMS_PER_PACK,
    },
    { onConflict: "user_id,date" }
  );
  if (limitErr) console.error("[BookTinder] buyExtraSaves: no se pudo registrar el paquete:", limitErr.message);

  return {
    success: true,
    newBalance: spent.balance,
    extraSaves: SAVES_PER_PACK,
  };
}

// Recomendaciones colaborativas (SVD) servidas por /api/recommendations con el JWT
// del usuario. Devuelve { items: [{ bookId, title, author, coverUrl, genres,
// predictedRating, reason }], personalized } y lanza si la petición falla.
export async function fetchCollaborativeRecommendations() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { items: [], personalized: false };

  const res = await fetch("/api/recommendations", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  return {
    personalized: !!data.personalized,
    items: (data.items || []).map((it) => ({
      bookId: it.book_id,
      title: it.title,
      author: it.author,
      coverUrl: it.cover_url || null,
      genres: it.genres || [],
      predictedRating: it.predicted_rating,
      reason: it.reason,
    })),
  };
}

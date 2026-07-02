import { supabase } from "../supabase.js";

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

  console.log("[BookTinder] preferred_genres from DB:", preferredGenres);
  console.log("[BookTinder] expanded to curated labels:", expandedGenres);

  // Fetch books user already has (exclude by title+author)
  const { data: existing } = await supabase
    .from("books")
    .select("title, author, isbn")
    .eq("user_id", userId);

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
      console.log("[BookTinder] genre-matched results:", candidates.length);
    }
  }

  // Fallback: fetch all books if genre query returned nothing
  if (candidates.length === 0) {
    console.log("[BookTinder] No genre matches — loading all books as fallback");
    const { data: all, error } = await supabase
      .from("books_curated")
      .select("*")
      .order("rating", { ascending: false })
      .limit(limit * 4);

    if (error) throw error;
    candidates = all || [];
    console.log("[BookTinder] fallback results:", candidates.length);
  }

  // Filter already-owned books client-side
  const filtered = candidates.filter((book) => {
    if (book.isbn && existingIsbns.has(book.isbn)) return false;
    const key = `${book.title?.toLowerCase()}__${book.author?.toLowerCase()}`;
    return !existingKeys.has(key);
  });

  // Shuffle for variety
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const result = shuffled.slice(0, limit);
  console.log("[BookTinder] final recommendations:", result.length);
  return result;
}

export async function checkDailyLimit(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_save_limits")
    .select("saves_used, gems_spent")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const saves_used = data?.saves_used ?? 0;
  const gems_spent = data?.gems_spent ?? 0;
  const effective_limit = DAILY_LIMIT + gems_spent;

  return {
    saves_used,
    gems_spent,
    limit: DAILY_LIMIT,
    effective_limit,
    can_save: saves_used < effective_limit,
    saves_left: Math.max(0, effective_limit - saves_used),
  };
}

export async function incrementSaveCounter(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_save_limits")
    .select("saves_used, gems_spent")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  await supabase.from("daily_save_limits").upsert(
    {
      user_id: userId,
      date: today,
      saves_used: (data?.saves_used ?? 0) + 1,
      gems_spent: data?.gems_spent ?? 0,
    },
    { onConflict: "user_id,date" }
  );
}

export async function buyExtraSaves(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data: gemsRow, error: gemsErr } = await supabase
    .from("user_gems")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (gemsErr || !gemsRow) return { success: false, error: "gems_not_found" };
  if (gemsRow.balance < GEMS_PER_PACK) return { success: false, error: "not_enough_gems" };

  const { error: deductErr } = await supabase
    .from("user_gems")
    .update({ balance: gemsRow.balance - GEMS_PER_PACK })
    .eq("user_id", userId);

  if (deductErr) return { success: false, error: "deduct_error" };

  const { data: limitRow } = await supabase
    .from("daily_save_limits")
    .select("saves_used, gems_spent")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  await supabase.from("daily_save_limits").upsert(
    {
      user_id: userId,
      date: today,
      saves_used: limitRow?.saves_used ?? 0,
      gems_spent: (limitRow?.gems_spent ?? 0) + GEMS_PER_PACK,
    },
    { onConflict: "user_id,date" }
  );

  return {
    success: true,
    newBalance: gemsRow.balance - GEMS_PER_PACK,
    extraSaves: SAVES_PER_PACK,
  };
}

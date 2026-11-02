// Mapa de los IDs de género del registro (users.preferred_genres) a las
// etiquetas de books_curated.genres. Módulo puro (sin Supabase ni import.meta)
// para que lo usen el cliente (recommendationService/BookTinder) y la función
// serverless api/recommendations.js.
// Maps onboarding IDs → genre labels used in books_curated.genres
// Onboarding saves: "ciencia-ficcion", "filosofia", etc.
// books_curated uses: "Ciencia Ficción", "Filosofía", etc.
export const GENRE_MAP = {
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

export function expandGenres(preferredGenres) {
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

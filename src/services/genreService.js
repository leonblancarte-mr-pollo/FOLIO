// ============ GÉNEROS EN ESPAÑOL ============
// Google Books devuelve `categories` en inglés ("Fiction", "Juvenile Fiction",
// "Fiction / Fantasy / General"). Se guardaban tal cual y el perfil mostraba
// "Fiction" junto a "Fantasía", contando "Fiction" y "Ficción" como dos géneros.
// `normalizeGenre` traduce al español y unifica mayúsculas/acentos. Se aplica al
// guardar (booksService.bookToDb, googleBooksService) y al mostrar
// (booksService.dbToBook y libros de amigos), así que los libros ya guardados en
// inglés se ven en español sin migrar datos.

// Clave: minúsculas, sin acentos ni signos. Valor: etiqueta canónica en español.
const GENRE_ES = {
  fiction: "Ficción", ficcion: "Ficción", "general fiction": "Ficción",
  "juvenile fiction": "Ficción juvenil", "young adult fiction": "Ficción juvenil", "ficcion juvenil": "Ficción juvenil",
  "juvenile nonfiction": "No ficción juvenil", "young adult nonfiction": "No ficción juvenil",
  "science fiction": "Ciencia ficción", "sci fi": "Ciencia ficción", "scifi": "Ciencia ficción", "ciencia ficcion": "Ciencia ficción",
  fantasy: "Fantasía", fantasia: "Fantasía", "epic fantasy": "Fantasía",
  dystopian: "Distopía", dystopia: "Distopía", distopia: "Distopía", "distopico": "Distopía",
  romance: "Romance", "love stories": "Romance",
  mystery: "Misterio", misterio: "Misterio", "mystery detective": "Misterio", "detective and mystery stories": "Misterio",
  thriller: "Thriller", thrillers: "Thriller", suspense: "Thriller", "thrillers suspense": "Thriller",
  horror: "Terror", terror: "Terror",
  history: "Historia", historia: "Historia", historical: "Ficción histórica", "historical fiction": "Ficción histórica",
  biography: "Biografía", "biography autobiography": "Biografía", biografia: "Biografía", memoir: "Biografía", memorias: "Biografía",
  philosophy: "Filosofía", filosofia: "Filosofía",
  poetry: "Poesía", poesia: "Poesía",
  drama: "Teatro", theater: "Teatro", teatro: "Teatro",
  "self help": "Autoayuda", autoayuda: "Autoayuda",
  psychology: "Psicología", psicologia: "Psicología",
  "business economics": "Negocios", business: "Negocios", economics: "Economía", economia: "Economía",
  science: "Ciencia", ciencia: "Ciencia", nature: "Naturaleza",
  "political science": "Ciencias políticas", "social science": "Ciencias sociales",
  religion: "Religión", art: "Arte", arte: "Arte", music: "Música", "performing arts": "Artes escénicas",
  "comics graphic novels": "Novela gráfica", comics: "Novela gráfica", "graphic novels": "Novela gráfica",
  "literary criticism": "Crítica literaria", "literary collections": "Antologías",
  "literary fiction": "Ficción literaria",
  classics: "Clásicos", clasicos: "Clásicos", novel: "Novela", novela: "Novela",
  essays: "Ensayo", essay: "Ensayo", ensayo: "Ensayo",
  "true crime": "Crimen real", humor: "Humor",
  education: "Educación", "health fitness": "Salud", cooking: "Cocina", travel: "Viajes",
  computers: "Informática", "technology engineering": "Tecnología", mathematics: "Matemáticas",
  "family relationships": "Familia y relaciones", "body mind spirit": "Espiritualidad",
  "language arts disciplines": "Lingüística", "foreign language study": "Idiomas",
  "sports recreation": "Deportes",
};

const keyOf = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/&/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// "Fiction / Fantasy / General" → el segmento más específico que se conozca
// ("Fantasía"); si ninguno se conoce, el texto original capitalizado.
function normalizeGenre(genre) {
  if (!genre || typeof genre !== "string") return genre || "";
  const raw = genre.trim();
  if (!raw) return "";
  const whole = GENRE_ES[keyOf(raw)];
  if (whole) return whole;
  const segments = raw.split("/").map((p) => keyOf(p)).filter((p) => p && p !== "general");
  for (let i = segments.length - 1; i >= 0; i--) {
    if (GENRE_ES[segments[i]]) return GENRE_ES[segments[i]];
  }
  return capitalize(raw);
}

export { normalizeGenre };

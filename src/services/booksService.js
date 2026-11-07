import { track } from "../analytics.js";
import { supabase } from "../supabase.js";
import { devLog } from "./devLog.js";
import { searchGoogleBooks } from "./googleBooksService.js";
import { normalizeGenre } from "./genreService.js";

// Etiqueta legible de cada estado de lectura (la UI añade icono y color en App.jsx).
const STATUS_LABELS = {
  reading: "Leyendo",
  want_to_read: "Por leer",
  wish: "Quiero leer",
  read: "Leído",
};

// ============ STORAGE ============
function dbToBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status,
    genre: normalizeGenre(row.genre),
    summary: row.summary || "",
    rating: row.rating || 0,
    review: row.review || "",
    coverUrl: row.cover_url || null,
    moodTags: row.mood_tags || [],
    addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now(),
    finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : null,
    readDatePrecision: row.read_date_precision || "exact",
    isUamBook: row.is_uam_book || false,
    isbn: row.isbn || null,
    totalPages: row.total_pages || null,
  };
}

function bookToDb(book, userId) {
  return {
    user_id: userId,
    title: book.title,
    author: book.author,
    status: book.status,
    genre: book.genre ? normalizeGenre(book.genre) : null,
    summary: book.summary || null,
    rating: book.rating || 0,
    review: book.review || null,
    cover_url: book.coverUrl || null,
    mood_tags: book.moodTags || [],
    added_at: book.addedAt ? new Date(book.addedAt).toISOString() : new Date().toISOString(),
    finished_at: book.finishedAt ? new Date(book.finishedAt).toISOString() : null,
    read_date_precision: book.readDatePrecision || "exact",
    is_uam_book: book.isUamBook || false,
    isbn: book.isbn || null,
    total_pages: book.totalPages ?? book.pageCount ?? null,
  };
}

// Las columnas total_pages / read_date_precision pueden no existir aún (migración
// pendiente). Si Supabase se queja de columna desconocida, reintenta sin esos
// campos para no romper guardado.
function isUnknownColumnError(error) {
  return error && (error.code === "42703" || error.code === "PGRST204" ||
    /total_pages|read_date_precision/.test(error.message || ""));
}
function stripTotalPages(dbBook) {
  const { total_pages, read_date_precision, ...rest } = dbBook;
  return rest;
}

// Etiqueta legible de cuándo se leyó un libro, según la precisión elegida.
function readDateLabel(book) {
  if (book.status !== "read") return null;
  if (book.readDatePrecision === "before_folio") return "Leído antes de SEMA 📚";
  if (book.readDatePrecision === "unknown") return "Leído en otra vida ✨";
  if (!book.finishedAt) return null;
  const d = new Date(book.finishedAt);
  if (book.readDatePrecision === "year") return `Leído en ${d.getFullYear()}`;
  return `Terminado el ${d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`;
}

// ============ OFFLINE CACHE HELPERS ============
function cacheBooks(books) {
  try {
    localStorage.setItem("folio_books", JSON.stringify(books));
    devLog("[offline] Guardando books en caché:", books.length);
  } catch { /* localStorage lleno o bloqueado: la caché offline es best-effort */ }
}
function getCachedBooks() {
  try {
    const cached = JSON.parse(localStorage.getItem("folio_books"));
    devLog("[offline] Books desde caché:", cached ? cached.length : "vacío");
    return cached;
  } catch { return null; }
}
function cacheProfile(data) {
  try { localStorage.setItem("folio_profile", JSON.stringify(data)); } catch { /* localStorage lleno o bloqueado: la caché offline es best-effort */ }
}
function getCachedProfile() {
  try { return JSON.parse(localStorage.getItem("folio_profile")); } catch { return null; }
}
function cacheAchievements(data) {
  try { localStorage.setItem("folio_achievements", JSON.stringify(data)); } catch { /* localStorage lleno o bloqueado: la caché offline es best-effort */ }
}
function getCachedAchievements() {
  try { return JSON.parse(localStorage.getItem("folio_achievements")); } catch { return null; }
}
function getPendingLogs() {
  try { return JSON.parse(localStorage.getItem("folio_pending_logs") || "[]"); } catch { return []; }
}
function addPendingLog(log) {
  const logs = getPendingLogs();
  logs.push({ ...log, _id: Date.now() + Math.random() });
  try { localStorage.setItem("folio_pending_logs", JSON.stringify(logs)); } catch { /* localStorage lleno o bloqueado: la caché offline es best-effort */ }
}
function getPendingPosts() {
  try { return JSON.parse(localStorage.getItem("folio_pending_posts") || "[]"); } catch { return []; }
}
function addPendingPost(post) {
  const posts = getPendingPosts();
  posts.push({ ...post, _id: Date.now() + Math.random() });
  try { localStorage.setItem("folio_pending_posts", JSON.stringify(posts)); } catch { /* localStorage lleno o bloqueado: la caché offline es best-effort */ }
}

async function fetchBooks(userId) {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (error) {
    const cached = getCachedBooks();
    if (cached) return cached;
    throw error;
  }
  const result = (data || []).map(dbToBook);
  cacheBooks(result);
  return result;
}

async function insertBook(book, userId) {
  const id = book.id || crypto.randomUUID();
  const dbBook = { id, ...bookToDb(book, userId) };
  let { data, error } = await supabase.from("books").insert(dbBook).select("id").single();
  if (error && isUnknownColumnError(error)) {
    ({ data, error } = await supabase.from("books").insert(stripTotalPages(dbBook)).select("id").single());
  }
  if (error) throw error;
  track("book_added", { book_id: data?.id ?? id, title: book.title || null, genre: book.genre || null });
  return data?.id ?? id;
}

async function updateBookInDB(book, userId) {
  const dbBook = bookToDb(book, userId);
  const run = (payload) => supabase.from("books").update(payload).eq("id", book.id).eq("user_id", userId).select("id", { count: "exact", head: true });
  let { error, count } = await run(dbBook);
  if (error && isUnknownColumnError(error)) {
    ({ error, count } = await run(stripTotalPages(dbBook)));
  }
  if (error) throw error;
  if (count === 0) throw new Error("UPDATE afectó 0 filas — posible problema de RLS o id incorrecto");
}

async function deleteBookFromDB(id, userId) {
  const { data, error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select();
  if (error) throw error;
  // If data is empty, DELETE matched 0 rows — likely an RLS policy issue
  if (!data || data.length === 0) throw new Error("DELETE_NO_ROWS");
}

// ============ PÁGINAS FALTANTES (Google Books) ============
// Los libros agregados desde BookTinder, recomendaciones, la vista previa del
// feed o a mano llegaban sin total_pages y "Seguir leyendo" no podía mostrar
// porcentaje. Se completa desde Google Books (ISBN primero, si no título+autor)
// y se guarda en books.total_pages. Solo acepta un resultado cuyo título y
// apellido del autor coincidan: si no hay coincidencia clara, no inventa nada.
const _normPg = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const _pageFillTried = new Set();

async function lookupPageCount({ title, author, isbn }) {
  const t = _normPg(title);
  if (!t && !isbn) return null;
  const surname = _normPg((author || "").trim().split(/\s+/).pop());
  const results = await searchGoogleBooks(isbn ? `isbn:${isbn}` : `${title} ${author || ""}`);
  const match = results.find((r) => {
    if (!(r.pageCount > 0)) return false;
    if (isbn) return true;
    const rt = _normPg(r.title);
    const titleOk = rt.startsWith(t) || t.startsWith(rt);
    const authorOk = !surname || _normPg(r.author).includes(surname);
    return titleOk && authorOk;
  });
  return match?.pageCount || null;
}

// Devuelve el total de páginas (el que ya tenía o el encontrado) o null.
// Un intento por libro y por sesión, para no gastar cuota de Google Books.
async function fillMissingPageCount(book, userId) {
  if (book.totalPages) return book.totalPages;
  if (!book.id || _pageFillTried.has(book.id)) return null;
  _pageFillTried.add(book.id);
  let pages = null;
  try {
    pages = await lookupPageCount(book);
  } catch (err) {
    console.error("[books] no se pudo buscar el número de páginas en Google Books:", err?.message || err);
    return null;
  }
  if (!pages) return null;
  const { error } = await supabase.from("books").update({ total_pages: pages }).eq("id", book.id).eq("user_id", userId);
  if (error && !isUnknownColumnError(error)) console.error("[books] no se pudo guardar total_pages:", error.message);
  return pages;
}

export { STATUS_LABELS, dbToBook, bookToDb, isUnknownColumnError, stripTotalPages, readDateLabel, cacheBooks, getCachedBooks, cacheProfile, getCachedProfile, cacheAchievements, getCachedAchievements, getPendingLogs, addPendingLog, getPendingPosts, addPendingPost, fetchBooks, insertBook, updateBookInDB, deleteBookFromDB, lookupPageCount, fillMissingPageCount };

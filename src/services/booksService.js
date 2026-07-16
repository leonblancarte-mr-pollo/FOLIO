import { supabase } from "../supabase.js";

// ============ STORAGE ============
function dbToBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status,
    genre: row.genre || "",
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
    genre: book.genre ? (book.genre.trim().charAt(0).toUpperCase() + book.genre.trim().slice(1).toLowerCase()) : null,
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
  if (book.readDatePrecision === "before_folio") return "Leído antes de FOLIO 📚";
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
    console.log("[offline] Guardando books en caché:", books.length);
  } catch {}
}
function getCachedBooks() {
  try {
    const cached = JSON.parse(localStorage.getItem("folio_books"));
    console.log("[offline] Books desde caché:", cached ? cached.length : "vacío");
    return cached;
  } catch { return null; }
}
function cacheProfile(data) {
  try { localStorage.setItem("folio_profile", JSON.stringify(data)); } catch {}
}
function getCachedProfile() {
  try { return JSON.parse(localStorage.getItem("folio_profile")); } catch { return null; }
}
function cacheAchievements(data) {
  try { localStorage.setItem("folio_achievements", JSON.stringify(data)); } catch {}
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
  try { localStorage.setItem("folio_pending_logs", JSON.stringify(logs)); } catch {}
}
function getPendingPosts() {
  try { return JSON.parse(localStorage.getItem("folio_pending_posts") || "[]"); } catch { return []; }
}
function addPendingPost(post) {
  const posts = getPendingPosts();
  posts.push({ ...post, _id: Date.now() + Math.random() });
  try { localStorage.setItem("folio_pending_posts", JSON.stringify(posts)); } catch {}
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


export { dbToBook, bookToDb, isUnknownColumnError, stripTotalPages, readDateLabel, cacheBooks, getCachedBooks, cacheProfile, getCachedProfile, cacheAchievements, getCachedAchievements, getPendingLogs, addPendingLog, getPendingPosts, addPendingPost, fetchBooks, insertBook, updateBookInDB, deleteBookFromDB };

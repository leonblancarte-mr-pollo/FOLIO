import { supabase } from "../supabase.js";

// ============ CITAS (quotes) ============
// Todas las funciones devuelven citas en camelCase y lanzan si Supabase responde con error.
// Ojo: el JSON que se guarda en posts.content para compartir una cita en el feed conserva
// sus claves históricas ({ __folio_type, text, mood, page_number, bookTitle, bookAuthor }).

// Fila de quotes (+ join opcional a books) → cita de la app.
function dbToQuote(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id || null,
    text: row.text,
    pageNumber: row.page_number || null,
    mood: row.mood || null,
    tags: row.tags || [],
    isFavorite: !!row.is_favorite,
    isPublic: !!row.is_public,
    createdAt: row.created_at,
    bookTitle: row.books?.title || null,
    bookAuthor: row.books?.author || null,
    bookCoverUrl: row.books?.cover_url || null,
  };
}

async function fetchQuotes(userId) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, books(title, author, cover_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToQuote);
}

async function fetchQuotesForBook(userId, bookId) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToQuote);
}

async function insertQuote(q, userId) {
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: userId,
      book_id: q.bookId || null,
      text: q.text.trim(),
      page_number: q.pageNumber || null,
      mood: q.mood || null,
      tags: [],
      is_favorite: false,
      is_public: q.isPublic || false,
    })
    .select("*, books(title, author, cover_url)")
    .single();
  if (error) throw error;
  return dbToQuote(data);
}

// q en camelCase: { id, text, bookId, pageNumber, mood, isFavorite }
async function updateQuoteInDB(q, userId) {
  const { error } = await supabase
    .from("quotes")
    .update({
      text: q.text.trim(),
      book_id: q.bookId || null,
      page_number: q.pageNumber || null,
      mood: q.mood || null,
      is_favorite: q.isFavorite,
    })
    .eq("id", q.id)
    .eq("user_id", userId);
  if (error) throw error;
}

async function deleteQuoteFromDB(id, userId) {
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

async function toggleQuoteFavorite(id, userId, isFavorite) {
  const { error } = await supabase
    .from("quotes")
    .update({ is_favorite: isFavorite })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// Marca la cita como pública (se llama después de publicarla en el feed).
async function setQuotePublic(id, userId) {
  const { error } = await supabase
    .from("quotes")
    .update({ is_public: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}


export { fetchQuotes, fetchQuotesForBook, insertQuote, updateQuoteInDB, deleteQuoteFromDB, toggleQuoteFavorite, setQuotePublic };

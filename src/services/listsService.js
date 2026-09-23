import { supabase } from "../supabase.js";

// ============ LISTAS PERSONALIZADAS CRUD ============
// Fila de user_lists (+ join user_list_books) → objeto camelCase de la app.
function dbToList(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isPublic: !!row.is_public,
    createdAt: row.created_at,
    bookIds: (row.user_list_books || []).map((r) => r.book_id),
  };
}

async function fetchUserLists(userId) {
  const { data, error } = await supabase
    .from("user_lists")
    .select("*, user_list_books(book_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToList);
}

async function createUserList(userId, { name, description = "", isPublic = true }) {
  const { data, error } = await supabase
    .from("user_lists")
    .insert({ user_id: userId, name: name.trim().slice(0, 100), description: description.trim() || null, is_public: isPublic })
    .select()
    .single();
  if (error) throw error;
  return dbToList(data);
}

// patch en camelCase: { name?, description?, isPublic? }
async function updateUserList(listId, userId, { name, description, isPublic }) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (isPublic !== undefined) patch.is_public = isPublic;
  const { error } = await supabase
    .from("user_lists")
    .update(patch)
    .eq("id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function deleteUserList(listId, userId) {
  const { error } = await supabase
    .from("user_lists")
    .delete()
    .eq("id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function addBookToList(listId, bookId) {
  const { error } = await supabase
    .from("user_list_books")
    .insert({ list_id: listId, book_id: bookId });
  // 23505 = ya estaba en la lista; lo tratamos como éxito (idempotente)
  if (error && error.code !== "23505") throw error;
}

async function removeBookFromList(listId, bookId) {
  const { error } = await supabase
    .from("user_list_books")
    .delete()
    .eq("list_id", listId)
    .eq("book_id", bookId);
  if (error) throw error;
}


export { fetchUserLists, createUserList, updateUserList, deleteUserList, addBookToList, removeBookFromList };

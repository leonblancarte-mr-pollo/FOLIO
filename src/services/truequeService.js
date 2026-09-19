import { supabase } from "../supabase.js";
import { ZONES_CDMX } from "../config/zones.js";

// ============ TRUEQUE DE LIBROS ============
// Toda regla de negocio (límites free/Plus, cobro de gemas, matching, estados del
// match) vive en Postgres: supabase/trueque_schema.sql. Aquí solo se leen tablas
// con RLS y se llaman RPCs SECURITY DEFINER.

const CHAT_PAGE_SIZE = 50;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Errores de negocio que el SQL lanza con RAISE EXCEPTION 'TRUEQUE_*'.
const TRUEQUE_ERRORS = {
  TRUEQUE_LIMIT_OFFERED: "Llegaste al límite de libros que puedes ofrecer.",
  TRUEQUE_LIMIT_WANTED: "Llegaste al límite de libros que puedes buscar.",
  TRUEQUE_LIMIT_ZONES: "Llegaste al límite de zonas de tu plan.",
  TRUEQUE_MIN_ZONES: "Elige al menos 2 zonas.",
  TRUEQUE_NO_ZONES: "Primero elige tus zonas de intercambio.",
  TRUEQUE_NO_GEMS: "No tienes gemas suficientes.",
  TRUEQUE_RATE_LIMIT: "Llegaste al máximo de búsquedas de hoy. Vuelve mañana.",
  TRUEQUE_NO_CREDIT: "La búsqueda no se pudo cobrar. Intenta de nuevo.",
  TRUEQUE_NOT_PARTICIPANT: "No participas en este intercambio.",
  TRUEQUE_MATCH_CLOSED: "Este intercambio ya está cerrado.",
  TRUEQUE_MATCH_EXPIRED: "Este chat expiró (14 días).",
  TRUEQUE_BAD_MESSAGE: "El mensaje debe tener entre 1 y 1000 caracteres.",
  TRUEQUE_NOT_COMPLETED: "Solo puedes calificar un intercambio completado.",
  TRUEQUE_ALREADY_RATED: "Ya calificaste este intercambio.",
  TRUEQUE_BAD_RATING: "La calificación debe ser de 1 a 5 estrellas.",
  TRUEQUE_BOOK_IN_MATCH: "Este libro está en un intercambio activo.",
};

// Error con `code` estable para que la UI decida (p. ej. mostrar el modal de Plus).
class TruequeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function toTruequeError(error, fallback) {
  const raw = error?.message || "";
  const code = Object.keys(TRUEQUE_ERRORS).find((k) => raw.includes(k));
  if (code) return new TruequeError(code, TRUEQUE_ERRORS[code]);
  if (error?.code === "42P01" || error?.code === "PGRST202") {
    return new TruequeError("TRUEQUE_NOT_MIGRATED", "El Trueque aún no está disponible (falta correr supabase/trueque_schema.sql).");
  }
  return new TruequeError("TRUEQUE_UNKNOWN", fallback || raw || "Algo salió mal.");
}

async function currentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new TruequeError("TRUEQUE_NO_SESSION", "Tu sesión expiró. Vuelve a iniciar sesión.");
  return uid;
}

// ---------- Zonas ----------
function getZones() {
  return ZONES_CDMX;
}

async function getUserZones(userId) {
  try {
    const { data, error } = await supabase.from("user_exchange_zones").select("zone").eq("user_id", userId);
    if (error) throw error;
    return (data || []).map((r) => r.zone);
  } catch (e) {
    console.error("[TRUEQUE] getUserZones:", e?.message);
    throw toTruequeError(e, "No se pudieron cargar tus zonas.");
  }
}

// Reemplaza todas las zonas (RPC atómica; valida mínimo 2 y máximo del plan en el servidor).
async function setUserZones(zones) {
  try {
    const { error } = await supabase.rpc("set_exchange_zones", { p_zones: zones });
    if (error) throw error;
    return zones;
  } catch (e) {
    console.error("[TRUEQUE] setUserZones:", e?.message);
    throw toTruequeError(e, "No se pudieron guardar tus zonas.");
  }
}

// Plan y límites del usuario (is_premium no es legible directo en users).
async function getTruequeStatus() {
  try {
    const { data, error } = await supabase.rpc("trueque_status");
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[TRUEQUE] getTruequeStatus:", e?.message);
    throw toTruequeError(e, "No se pudo cargar el estado del Trueque.");
  }
}

// ---------- Ofrezco ----------
async function getMyOffers() {
  try {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("books_offered")
      .select("id, title, author, editor, condition, photo_url, created_at")
      .eq("user_id", uid)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("[TRUEQUE] getMyOffers:", e?.message);
    throw toTruequeError(e, "No se pudieron cargar tus libros.");
  }
}

async function uploadTruequePhoto(uid, file) {
  if (!PHOTO_TYPES.includes(file.type)) throw new TruequeError("TRUEQUE_PHOTO_TYPE", "La foto debe ser JPG, PNG o WebP.");
  if (file.size > PHOTO_MAX_BYTES) throw new TruequeError("TRUEQUE_PHOTO_SIZE", "La foto pesa más de 5 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("trueque").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new TruequeError("TRUEQUE_PHOTO_UPLOAD", `No se pudo subir la foto: ${error.message}`);
  return supabase.storage.from("trueque").getPublicUrl(path).data.publicUrl;
}

async function addBookOffered({ title, author, editor, condition, photoFile }) {
  try {
    const uid = await currentUserId();
    const photo_url = photoFile ? await uploadTruequePhoto(uid, photoFile) : null;
    const { data, error } = await supabase
      .from("books_offered")
      .insert({ user_id: uid, title: title.trim(), author: author.trim(), editor: editor?.trim() || null, condition, photo_url })
      .select("id, title, author, editor, condition, photo_url, created_at")
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[TRUEQUE] addBookOffered:", e?.message);
    throw e instanceof TruequeError ? e : toTruequeError(e, "No se pudo publicar el libro.");
  }
}

// Soft delete: un trigger cancela los matches vivos de este libro y avisa en su chat.
async function deleteBookOffered(id) {
  try {
    const { data, error } = await supabase.from("books_offered").update({ is_active: false }).eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new TruequeError("TRUEQUE_NOT_FOUND", "No se encontró el libro.");
    return true;
  } catch (e) {
    console.error("[TRUEQUE] deleteBookOffered:", e?.message);
    throw e instanceof TruequeError ? e : toTruequeError(e, "No se pudo quitar el libro.");
  }
}

// ---------- Busco ----------
async function getMyWants() {
  try {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("books_wanted")
      .select("id, title, author, editor, created_at")
      .eq("user_id", uid)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("[TRUEQUE] getMyWants:", e?.message);
    throw toTruequeError(e, "No se pudieron cargar los libros que buscas.");
  }
}

async function addBookWanted({ title, author, editor }) {
  try {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("books_wanted")
      .insert({ user_id: uid, title: title.trim(), author: author.trim(), editor: editor?.trim() || null })
      .select("id, title, author, editor, created_at")
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[TRUEQUE] addBookWanted:", e?.message);
    throw e instanceof TruequeError ? e : toTruequeError(e, "No se pudo guardar el libro.");
  }
}

async function deleteBookWanted(id) {
  try {
    const { data, error } = await supabase.from("books_wanted").update({ is_active: false }).eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new TruequeError("TRUEQUE_NOT_FOUND", "No se encontró el libro.");
    return true;
  } catch (e) {
    console.error("[TRUEQUE] deleteBookWanted:", e?.message);
    throw e instanceof TruequeError ? e : toTruequeError(e, "No se pudo quitar el libro.");
  }
}

// ---------- Matches ----------
// Cobra (gemas o cupo Plus) y luego busca. Si no alcanzan las gemas devuelve
// { paid: false } sin lanzar, para que la UI muestre el modal de límite.
async function searchMatches() {
  try {
    const uid = await currentUserId();
    const { data: paid, error: payErr } = await supabase.rpc("cost_search_matches", { p_user_id: uid });
    if (payErr) throw payErr;
    if (!paid) return { paid: false, matches: [] };
    const { data, error } = await supabase.rpc("find_book_matches", { p_user_id: uid });
    if (error) throw error;
    return { paid: true, matches: data || [] };
  } catch (e) {
    console.error("[TRUEQUE] searchMatches:", e?.message);
    throw toTruequeError(e, "No se pudo buscar matches.");
  }
}

// Lista los matches ya descubiertos (gratis; no descubre nuevos).
async function getMatches() {
  try {
    const { data, error } = await supabase.rpc("get_my_exchange_matches");
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("[TRUEQUE] getMatches:", e?.message);
    throw toTruequeError(e, "No se pudieron cargar tus matches.");
  }
}

// ---------- Chat ----------
// Página de mensajes más recientes; `before` (ISO) trae los anteriores a ese instante.
// Devuelve en orden cronológico + hasMore para el botón "cargar más".
async function getMatchChat(matchId, { before = null, limit = CHAT_PAGE_SIZE } = {}) {
  try {
    let q = supabase
      .from("exchange_chats")
      .select("id, match_id, sender_id, message, is_system, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    const hasMore = rows.length > limit;
    return { messages: rows.slice(0, limit).reverse(), hasMore };
  } catch (e) {
    console.error("[TRUEQUE] getMatchChat:", e?.message);
    throw toTruequeError(e, "No se pudo cargar el chat.");
  }
}

async function sendMessage(matchId, message) {
  try {
    const { data, error } = await supabase.rpc("send_exchange_message", { p_match_id: matchId, p_message: message });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[TRUEQUE] sendMessage:", e?.message);
    throw toTruequeError(e, "No se pudo enviar el mensaje.");
  }
}

async function completeExchange(matchId) {
  try {
    const { data, error } = await supabase.rpc("complete_exchange", { p_match_id: matchId });
    if (error) throw error;
    return !!data;
  } catch (e) {
    console.error("[TRUEQUE] completeExchange:", e?.message);
    throw toTruequeError(e, "No se pudo completar el intercambio.");
  }
}

async function rateExchange(matchId, rating, review) {
  try {
    const { data, error } = await supabase.rpc("rate_exchange", { p_match_id: matchId, p_rating: rating, p_review: review || null });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[TRUEQUE] rateExchange:", e?.message);
    throw toTruequeError(e, "No se pudo guardar tu calificación.");
  }
}

// ---------- Disclaimer (una vez por match) ----------
function isDisclaimerAccepted(matchId) {
  try { return localStorage.getItem(`disclaimer_accepted_${matchId}`) === "1"; } catch { return false; }
}

function acceptDisclaimer(matchId) {
  try { localStorage.setItem(`disclaimer_accepted_${matchId}`, "1"); } catch { /* storage bloqueado: se volverá a mostrar */ }
}

export {
  TruequeError, CHAT_PAGE_SIZE,
  getZones, getUserZones, setUserZones, getTruequeStatus,
  getMyOffers, addBookOffered, deleteBookOffered,
  getMyWants, addBookWanted, deleteBookWanted,
  searchMatches, getMatches,
  getMatchChat, sendMessage, completeExchange, rateExchange,
  isDisclaimerAccepted, acceptDisclaimer,
};

import { supabase } from "../supabase.js";

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
  // Trueque v2 (supabase/trueque_geo.sql)
  TRUEQUE_RULES_REQUIRED: "Primero acepta las reglas del Trueque.",
  TRUEQUE_STATE_REQUIRED: "Primero completa tu ubicación aproximada.",
};

// Códigos que devuelven en { success:false, error } las RPCs jsonb de trueque_geo.sql.
const GEO_RPC_ERRORS = {
  NOT_AUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  ADULT_REQUIRED: "Debes confirmar que eres mayor de 18 años.",
  RULES_REQUIRED: "Primero acepta las reglas del Trueque.",
  STATE_REQUIRED: "Primero completa tu ubicación aproximada.",
  STATE_INVALID: "Elige un estado válido.",
  RADIUS_INVALID: "Elige un radio de 3, 6, 12 o 25 km.",
  PINS_INVALID: "Revisa tus lugares: de 1 a 3 pines dentro de México y etiquetas de máximo 30 caracteres.",
  PINS_COOLDOWN: "Solo puedes cambiar tus lugares una vez cada 24 horas.",
  LOCATION_REQUIRED: "Marca al menos un lugar en el mapa para buscar matches.",
  SCOPE_INVALID: "Alcance de búsqueda no válido.",
  RATE_LIMIT: "Llegaste al máximo de búsquedas de hoy. Vuelve mañana.",
  GEMS_INSUFFICIENT: "No tienes gemas suficientes.",
  REPORT_INVALID: "Revisa el motivo del reporte.",
  NOT_PARTICIPANT: "No participas en este intercambio.",
  REPORT_LIMIT: "Llegaste al máximo de reportes de hoy. Escríbenos a soporte@sema.mx.",
};

const UPDATING_MESSAGE = "Trueque se está actualizando, intenta más tarde.";

// Error con `code` estable para que la UI decida (p. ej. mostrar el modal de Plus).
class TruequeError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

// La RPC/tabla no existe todavía en Supabase (migración sin correr o caché de PostgREST vieja).
function isMissingInDb(error) {
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(error?.code);
}

function logSupabaseError(tag, error) {
  console.error(`[TRUEQUE] ${tag}:`, { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
}

// Llama una RPC jsonb de trueque_geo.sql ({ success, error? }) y la convierte al contrato del
// servicio: devuelve el payload o lanza TruequeError. Si la RPC aún no existe → TRUEQUE_UPDATING.
async function callGeoRpc(tag, fn, params) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    logSupabaseError(tag, error);
    if (isMissingInDb(error)) throw new TruequeError("TRUEQUE_UPDATING", UPDATING_MESSAGE);
    throw toTruequeError(error);
  }
  if (!data?.success) {
    const code = data?.error || "TRUEQUE_UNKNOWN";
    console.error(`[TRUEQUE] ${tag}: la RPC respondió`, data);
    throw new TruequeError(code, GEO_RPC_ERRORS[code] || "Algo salió mal. Intenta de nuevo.", data || {});
  }
  return data;
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

// Trueque v3 (2026-10-03): las zonas fijas de CDMX ya no se leen ni se escriben desde el
// cliente. user_exchange_zones queda en la BD solo como historial.

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

// ---------- Matches por cercanía (Trueque v2) ----------
// Alcances de búsqueda: cada uno incluye a los anteriores (ver trueque_in_scope en el SQL).
const SEARCH_SCOPES = ["radius", "25km", "state", "country"];

// Rangos que devuelve el servidor (`proximity`). Nunca hay distancias exactas ni coordenadas.
const PROXIMITY_LABELS = {
  lt3: "menos de 3 km",
  "3_6": "3 a 6 km",
  "6_12": "6 a 12 km",
  "12_25": "12 a 25 km",
  far: "más lejos",
  same_state: "mismo estado",
  other_state: "otro estado",
};

// Busca en el alcance elegido. Cobra SOLO si hay resultados, en la misma transacción
// (RPC search_trueque_matches). Si no alcanzan las gemas devuelve { paid:false } sin lanzar.
async function searchMatchesNearby(scope = "radius") {
  try {
    const data = await callGeoRpc("searchMatchesNearby", "search_trueque_matches", { p_scope: scope });
    return { paid: true, scope: data.scope, resultCount: data.result_count || 0, charged: data.charged || 0, matches: data.matches || [] };
  } catch (e) {
    if (e.code === "GEMS_INSUFFICIENT") return { paid: false, cost: e.cost, matches: [] };
    throw e;
  }
}

// Mis matches con su rango de cercanía (gratis; no descubre nuevos).
async function getMatchesNearby() {
  const { data, error } = await supabase.rpc("get_my_trueque_matches");
  if (error) {
    logSupabaseError("getMatchesNearby", error);
    if (isMissingInDb(error)) throw new TruequeError("TRUEQUE_UPDATING", UPDATING_MESSAGE);
    throw toTruequeError(error, "No se pudieron cargar tus matches.");
  }
  return data || [];
}

// ---------- Seguridad ----------
// "Antes de empezar": reglas + confirmación de mayoría de edad (se guarda en el servidor).
async function acceptTruequeRules(isAdult) {
  await callGeoRpc("acceptTruequeRules", "accept_trueque_rules", { p_adult: !!isAdult });
  return true;
}

// Motivos de reporte. Las claves son idénticas al CHECK de trueque_reports (trueque_geo.sql).
const REPORT_REASONS = [
  { id: "acoso", label: "Acoso o lenguaje ofensivo" },
  { id: "estafa", label: "Engaño o no cumplió lo acordado" },
  { id: "datos_personales", label: "Pidió mis datos personales o mi domicilio" },
  { id: "inseguro", label: "Me hizo sentir inseguro/a" },
  { id: "otro", label: "Otro" },
];

async function reportTruequeUser({ reportedId, reason, details, matchId }) {
  await callGeoRpc("reportTruequeUser", "report_trueque_user", {
    p_reported_id: reportedId,
    p_reason: reason,
    p_details: details?.trim() || null,
    p_match_id: matchId || null,
  });
  return true;
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
  TruequeError, CHAT_PAGE_SIZE, UPDATING_MESSAGE, callGeoRpc,
  getTruequeStatus,
  getMyOffers, addBookOffered, deleteBookOffered,
  getMyWants, addBookWanted, deleteBookWanted,
  searchMatches, getMatches,
  SEARCH_SCOPES, PROXIMITY_LABELS, searchMatchesNearby, getMatchesNearby,
  acceptTruequeRules, REPORT_REASONS, reportTruequeUser,
  getMatchChat, sendMessage, completeExchange, rateExchange,
  isDisclaimerAccepted, acceptDisclaimer,
};

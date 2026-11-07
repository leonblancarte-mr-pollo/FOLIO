// ============ COLLAGES: INVENTARIO, PREMIOS, GUARDADO Y PUBLICACIÓN (2026-11-06) ============
// Reutiliza la infraestructura de SEMA:
//   · Supabase (tablas + RPCs SECURITY DEFINER de supabase/collages_mvp_2026-11-06.sql) como autoridad:
//     inventario, tirada de racha (collage_streak_roll), compra con gemas (buy_collage_set → user_gems +
//     reward_ledger), límite de collages (trigger) y Sema Plus (users.is_premium).
//   · posts + bucket post-images (socialService) para publicar en el feed: la imagen se sube como archivo
//     NUEVO cada vez (upsert:false), así lo publicado queda congelado aunque luego se edite el collage.
// «Modo local»: si las RPCs aún no existen (SQL sin correr: PGRST202 / 42P01 / 42883), todo se guarda en
// el navegador con la clave `sema_collages_v1:<userId>` (NO es una clave folio_*), la tirada usa el mismo
// motor puro de collageCatalog y la compra con gemas se desactiva. Al correr el SQL se pasa solo a servidor.
// Contrato de errores: lecturas degradan (estado vacío + console.error); escrituras lanzan CollageError.
import { supabase } from "../supabase.js";
import { createFeedPost } from "./socialService.js";
import { getSets, tirarPremio, candidatosRacha, LIMITES } from "./collageCatalog.js";

const RPC_AUSENTE = new Set(["PGRST202", "PGRST205", "42P01", "42883"]);
const esAusente = (err) => !!err && (RPC_AUSENTE.has(err.code) || /does not exist|could not find/i.test(err.message || ""));

class CollageError extends Error {
  constructor(code, message, extra = {}) {
    super(message || code);
    this.code = code;
    Object.assign(this, extra);
  }
}

// ---------------------------------------------------------------- bus (servicio → UI)
let _escuchas = [];
const collageBus = {
  emit: (evento) => _escuchas.forEach((fn) => fn(evento)),
  on: (fn) => { _escuchas.push(fn); return () => { _escuchas = _escuchas.filter((f) => f !== fn); }; },
};

// ---------------------------------------------------------------- modo local
let _modo = null; // null = sin saber, "servidor" | "local"
const claveLocal = (userId) => `sema_collages_v1:${userId}`;
function leerLocal(userId) {
  try {
    const v = JSON.parse(localStorage.getItem(claveLocal(userId)) || "null");
    if (v && typeof v === "object") return { sets: [], fallos: 0, eventos: [], collages: [], ...v };
  } catch { /* JSON roto o storage bloqueado */ }
  return { sets: [], fallos: 0, eventos: [], collages: [] };
}
function escribirLocal(userId, datos) {
  try { localStorage.setItem(claveLocal(userId), JSON.stringify(datos)); }
  catch (err) { throw new CollageError("LOCAL_FULL", "No hay espacio en este navegador para guardar.", { cause: err }); }
}
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nuevoId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function pasarALocal(origen, err) {
  if (_modo !== "local") console.warn(`[collage] ${origen}: el SQL de Collages no está en Supabase (${err?.code || "?"}). Modo local hasta correr supabase/collages_mvp_2026-11-06.sql`);
  _modo = "local";
}

// ---------------------------------------------------------------- estado / inventario
// Devuelve { modo, plus, sets:Set, fallosSeguidos, limite (null = sin tope), usados }.
async function getEstadoCollage(userId) {
  if (_modo !== "local") {
    const { data, error } = await supabase.rpc("collage_mi_estado");
    if (!error && data?.success) {
      _modo = "servidor";
      return {
        modo: "servidor",
        plus: !!data.plus,
        sets: new Set(data.sets || []),
        fallosSeguidos: data.fallos_seguidos || 0,
        limite: data.limite ?? null,
        usados: data.usados || 0,
      };
    }
    if (esAusente(error)) pasarALocal("collage_mi_estado", error);
    else {
      console.error("[collage] collage_mi_estado:", error?.code, error?.message, data?.error);
      return { modo: "error", plus: false, sets: new Set(), fallosSeguidos: 0, limite: LIMITES.collagesSinPlus, usados: 0 };
    }
  }
  const l = leerLocal(userId);
  return { modo: "local", plus: false, sets: new Set(l.sets), fallosSeguidos: l.fallos, limite: LIMITES.collagesSinPlus, usados: l.collages.length };
}

// Tirada al registrar la racha. La llama readingService justo después de update_streak().
// Nunca lanza (no debe romper el registro de lectura). Si hay premio emite { tipo: "premio", setId }.
async function tirarPremioRacha(userId) {
  try {
    if (_modo !== "local") {
      const { data, error } = await supabase.rpc("collage_streak_roll");
      if (!error && data?.success) {
        _modo = "servidor";
        if (data.resultado === "premio" && !data.duplicate) collageBus.emit({ tipo: "premio", setId: data.set_id, origen: "racha" });
        return data;
      }
      if (esAusente(error)) pasarALocal("collage_streak_roll", error);
      else { console.error("[collage] collage_streak_roll:", error?.code, error?.message, data?.error); return null; }
    }
    // Modo local: misma regla, una tirada por día.
    const l = leerLocal(userId);
    const hoy = hoyLocal();
    if (l.eventos.some((e) => e.origen === "racha" && e.ref === hoy)) return { duplicate: true };
    const r = tirarPremio({ fallosSeguidos: l.fallos, candidatos: candidatosRacha({ sets: new Set(l.sets) }) });
    l.eventos.push({ origen: "racha", ref: hoy, resultado: r.resultado, setId: r.setId || null, probabilidad: r.probabilidad, at: new Date().toISOString() });
    if (r.resultado !== "sin_candidatos") l.fallos = r.fallosSeguidos;
    if (r.resultado === "premio" && !l.sets.includes(r.setId)) l.sets.push(r.setId);
    escribirLocal(userId, l);
    if (r.resultado === "premio") collageBus.emit({ tipo: "premio", setId: r.setId, origen: "racha" });
    return r;
  } catch (err) {
    console.error("[collage] la tirada de racha falló:", err?.message || err);
    return null;
  }
}

// Compra con gemas. Lanza CollageError: GEMS_INSUFFICIENT (+precio), GEMS_NO_BALANCE, SET_NOT_FOR_SALE,
// COLLAGE_RPC_MISSING (modo local: la tienda espera al SQL). Devuelve { balance, duplicate }.
async function comprarSet(setId) {
  if (_modo === "local") throw new CollageError("COLLAGE_RPC_MISSING", "La tienda se está actualizando.");
  const { data, error } = await supabase.rpc("buy_collage_set", { p_set_id: setId });
  if (error) {
    if (esAusente(error)) { pasarALocal("buy_collage_set", error); throw new CollageError("COLLAGE_RPC_MISSING", "La tienda se está actualizando."); }
    console.error("[collage] buy_collage_set:", error.code, error.message, error.details, error.hint);
    throw new CollageError("NETWORK", error.message);
  }
  if (!data?.success) throw new CollageError(data?.error || "UNKNOWN", data?.error, { precio: data?.precio });
  if (!data.duplicate) collageBus.emit({ tipo: "premio", setId, origen: "gemas" });
  return { balance: data.balance, duplicate: !!data.duplicate };
}

// ---------------------------------------------------------------- collages (documentos)
const dbToCollage = (r) => ({ id: r.id, titulo: r.titulo || null, formato: r.formato, doc: r.doc, preview: r.preview || null, createdAt: r.created_at, updatedAt: r.updated_at });

async function listarCollages(userId) {
  if (_modo !== "local") {
    const { data, error } = await supabase.from("collages").select("id, titulo, formato, doc, preview, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false });
    if (!error) { _modo = "servidor"; return (data || []).map(dbToCollage); }
    if (esAusente(error)) pasarALocal("collages", error);
    else { console.error("[collage] listar:", error.code, error.message); throw new CollageError("NETWORK", error.message); }
  }
  return [...leerLocal(userId).collages].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

// Guarda (crea o actualiza). Lanza CollageError("COLLAGE_LIMIT", …, { limite }) al llegar al tope.
async function guardarCollage(userId, { id, formato, doc, preview, titulo = null, limite = LIMITES.collagesSinPlus }) {
  const ahora = new Date().toISOString();
  if (_modo !== "local") {
    if (id) {
      const { data, error } = await supabase.from("collages").update({ formato, doc, preview, titulo }).eq("id", id).eq("user_id", userId).select("id, titulo, formato, doc, preview, created_at, updated_at").maybeSingle();
      if (!error && data) return dbToCollage(data);
      if (!error && !data) { /* ya no existe (se borró en otro dispositivo): se crea uno nuevo abajo */ }
      else if (esAusente(error)) pasarALocal("collages", error);
      else { console.error("[collage] actualizar:", error.code, error.message); throw new CollageError("NETWORK", error.message); }
    }
    if (_modo !== "local") {
      const { data, error } = await supabase.from("collages").insert({ user_id: userId, formato, doc, preview, titulo }).select("id, titulo, formato, doc, preview, created_at, updated_at").single();
      if (!error) return dbToCollage(data);
      if (/COLLAGE_LIMIT/.test(error.message || "")) throw new CollageError("COLLAGE_LIMIT", "Tope de collages", { limite: Number(error.hint) || limite });
      if (esAusente(error)) pasarALocal("collages", error);
      else { console.error("[collage] crear:", error.code, error.message, error.details); throw new CollageError("NETWORK", error.message); }
    }
  }
  const l = leerLocal(userId);
  const i = id ? l.collages.findIndex((c) => c.id === id) : -1;
  if (i >= 0) {
    l.collages[i] = { ...l.collages[i], formato, doc, preview, titulo, updatedAt: ahora };
    escribirLocal(userId, l);
    return l.collages[i];
  }
  if (limite != null && l.collages.length >= limite) throw new CollageError("COLLAGE_LIMIT", "Tope de collages", { limite });
  const nuevo = { id: nuevoId(), formato, doc, preview, titulo, createdAt: ahora, updatedAt: ahora };
  l.collages.push(nuevo);
  escribirLocal(userId, l);
  return nuevo;
}

async function borrarCollage(userId, id) {
  if (_modo !== "local") {
    const { error } = await supabase.from("collages").delete().eq("id", id).eq("user_id", userId);
    if (!error) return;
    if (esAusente(error)) pasarALocal("collages", error);
    else { console.error("[collage] borrar:", error.code, error.message); throw new CollageError("NETWORK", error.message); }
  }
  const l = leerLocal(userId);
  l.collages = l.collages.filter((c) => c.id !== id);
  escribirLocal(userId, l);
}

// ---------------------------------------------------------------- publicar en el feed
// La imagen exportada (JPEG 1080 px de ancho) se sube como archivo nuevo a post-images y el post es de
// tipo "text" con JSON en content (mismo patrón que las frases: { __folio_type: "collage", … }), así no
// hace falta cambiar posts.type. `encima` = null | { tipo: "frase"|"resena", texto, libro, autor, calificacion }.
async function publicarCollage({ userId, blob, formato, collageId = null, encima = null }) {
  if (!navigator.onLine) throw new CollageError("OFFLINE", "Sin internet");
  const nombre = `${userId}_collage_${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage.from("post-images").upload(nombre, blob, { contentType: "image/jpeg", upsert: false });
  if (upErr) { console.error("[collage] subir imagen:", upErr.message); throw new CollageError("UPLOAD", upErr.message); }
  const { data: url } = supabase.storage.from("post-images").getPublicUrl(nombre);
  const content = JSON.stringify({ __folio_type: "collage", v: 1, formato, collageId, encima: encima || null });
  const postId = await createFeedPost({ userId, type: "text", content, imageUrl: url.publicUrl });
  return { postId, imageUrl: url.publicUrl };
}

// Lee el JSON de un post de collage (o null si no lo es). Lo usan fetchFeed y la hoja de notificaciones.
function parseCollagePost(content) {
  if (!content || content[0] !== "{") return null;
  try {
    const p = JSON.parse(content);
    return p?.__folio_type === "collage" ? p : null;
  } catch { return null; }
}

const getModoCollage = () => _modo;
const setsDeRacha = () => getSets().filter((s) => s.obtencion?.tipo === "racha");

export {
  collageBus, CollageError, getEstadoCollage, tirarPremioRacha, comprarSet,
  listarCollages, guardarCollage, borrarCollage, publicarCollage, parseCollagePost, getModoCollage, setsDeRacha,
};

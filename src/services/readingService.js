import { supabase } from "../supabase.js";
import { addPendingLog, getPendingLogs } from "./booksService.js";
import { localDateStr } from "./streakService.js";
import { addPetXP } from "./petService.js";
import { createFeedPost } from "./socialService.js";
import { esHitoRacha } from "../theme.js";

// ============ SESIONES DE LECTURA ============
function newClientUuid() {
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function logReadingSession({ userId, bookId, pagesRead, mood, sessionId }) {
  const sid = sessionId || newClientUuid();
  if (!navigator.onLine) {
    addPendingLog({ userId, bookId, pagesRead: pagesRead || null, mood, date: localDateStr(), sessionId: sid });
    // El post de la sesión se crea al sincronizar el log (no aquí).
    return { offline: true, postIdPromise: Promise.resolve(null) };
  }
  const today = localDateStr();

  const { error: logError } = await supabase.from("reading_logs").insert({
    user_id: userId,
    book_id: bookId,
    pages_read: pagesRead || null,
    mood,
    log_date: today,
    session_id: sid,
  });
  if (logError) {
    if (logError.code === "23505") {
      // Esta sesión ya se sincronizó antes (reintento offline duplicado): no
      // repetir el post/racha, ya se hicieron la primera vez.
      return { postIdPromise: Promise.resolve(null) };
    }
    throw logError;
  }

  // Único post de la sesión. Quien ofrezca «compartir» (ShareSessionModal)
  // recibe la promesa con su id y lo completa en vez de insertar otro.
  let postIdPromise = Promise.resolve(null);
  if (pagesRead > 0 && bookId) {
    postIdPromise = createFeedPost({ userId, type: 'reading_session', bookId, content: '', pagesRead, imageUrl: null })
      .catch((err) => { console.error("[reading] no se pudo publicar la sesión en el feed:", err); return null; });
  }

  // La racha ya no la escribe el cliente: el servidor la avanza (RPC
  // SECURITY DEFINER) validando que exista este reading_log real de hoy.
  const { data: streakRow, error: streakErr } = await supabase.rpc("update_streak");
  if (streakErr) console.error("[streak] update_streak falló:", streakErr.message);
  // Ronda 5: si la racha acaba de llegar a un hito, se publica el banner (una sola vez por hito).
  else publishStreakMilestone(userId, Array.isArray(streakRow) ? streakRow[0] : streakRow)
    .catch((err) => console.error("[streak] no se pudo publicar el hito de racha:", err?.message || err));

  // Pet XP por páginas leídas: +2 XP por cada 10 páginas
  const pagesXp = Math.floor((pagesRead || 0) / 10) * 2;
  if (pagesXp > 0) {
    addPetXP(userId, pagesXp).catch((err) => console.error("[PET] sync tras sesión de lectura falló:", err));
  }
  return { postIdPromise };
}

// ============ HITOS DE RACHA (ronda 5, 2026-11-03) ============
// Publica UNA vez el banner «racha» cuando current_streak cae en un hito (3, 7, 10, 14, 21, 30, 50, 60,
// 75, 90, 100, 150, 200 y cada 50 después). El momento exacto en que sube la racha es la respuesta de
// update_streak() justo después de un reading_log real de hoy (aquí mismo); no hay otro lugar que la mueva.
// CLAVE ÚNICA: usuario + hito + fecha de inicio de la racha. La fecha de inicio es el día calendario del
// primer día de esta racha: hoy menos (días − 1). Va dentro del contenido del post (JSON estable, mismo
// orden de llaves), así la misma tupla siempre produce el mismo texto y el índice único de
// supabase/racha_hitos_2026-11-03.sql la hace cumplir en la base aun con dos dispositivos a la vez.
// Antes de insertar se busca ese mismo contenido: registrar dos veces el mismo día (la racha no cambia)
// no repite el banner. NO se generan publicaciones retroactivas de rachas pasadas.
function streakMilestoneContent(dias, hoy = new Date()) {
  const ini = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
  return JSON.stringify({ dias, inicio: localDateStr(ini) });
}
async function publishStreakMilestone(userId, streakRow) {
  const dias = streakRow?.current_streak || 0;
  if (!userId || !esHitoRacha(dias)) return null;
  const content = streakMilestoneContent(dias);
  const { data: ya, error: readErr } = await supabase.from("posts").select("id").eq("user_id", userId).eq("type", "racha").eq("content", content).limit(1);
  if (readErr) throw readErr; // sin poder comprobar duplicados, mejor no publicar
  if (ya && ya.length) return null;
  try {
    return await createFeedPost({ userId, type: "racha", content });
  } catch (err) {
    if (err?.code === "23505") return null; // el índice único ya tenía este hito: no es un error
    throw err;
  }
}

// ============ SINCRONIZACIÓN OFFLINE (logs) ============
async function syncPendingLogs() {
  const logs = getPendingLogs();
  if (logs.length === 0) return 0;
  let synced = 0;
  const remaining = [];
  for (const log of logs) {
    try {
      await logReadingSession({ userId: log.userId, bookId: log.bookId, pagesRead: log.pagesRead, mood: log.mood, sessionId: log.sessionId });
      synced++;
    } catch (err) {
      console.error("[offline] log pendiente no sincronizado (se reintenta en la próxima reconexión):", err?.message || err);
      remaining.push(log);
    }
  }
  try { localStorage.setItem("folio_pending_logs", JSON.stringify(remaining)); } catch { /* localStorage lleno o bloqueado */ }
  if (remaining.length === 0) localStorage.removeItem("folio_pending_logs");
  return synced;
}


export { logReadingSession, syncPendingLogs };

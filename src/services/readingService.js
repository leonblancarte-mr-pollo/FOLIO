import { supabase } from "../supabase.js";
import { addPendingLog, getPendingLogs } from "./booksService.js";
import { localDateStr } from "./streakService.js";
import { addPetXP } from "./petService.js";
import { createFeedPost } from "./socialService.js";

// ============ SESIONES DE LECTURA ============
function newClientUuid() {
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function logReadingSession({ userId, bookId, pagesRead, mood, sessionId }) {
  const sid = sessionId || newClientUuid();
  if (!navigator.onLine) {
    addPendingLog({ userId, bookId, pagesRead: pagesRead || null, mood, date: localDateStr(), sessionId: sid });
    return;
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
      return;
    }
    throw logError;
  }

  if (pagesRead > 0 && bookId) {
    createFeedPost({ userId, type: 'reading_session', bookId, content: '', pagesRead, imageUrl: null })
      .catch((err) => console.error("[reading] no se pudo publicar la sesión en el feed:", err));
  }

  // La racha ya no la escribe el cliente: el servidor la avanza (RPC
  // SECURITY DEFINER) validando que exista este reading_log real de hoy.
  const { error: streakErr } = await supabase.rpc("update_streak");
  if (streakErr) console.error("[streak] update_streak falló:", streakErr.message);

  // Pet XP por páginas leídas: +2 XP por cada 10 páginas
  const pagesXp = Math.floor((pagesRead || 0) / 10) * 2;
  if (pagesXp > 0) {
    addPetXP(userId, pagesXp).catch((err) => console.error("[PET] sync tras sesión de lectura falló:", err));
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

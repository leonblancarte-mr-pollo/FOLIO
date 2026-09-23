import { supabase } from "../supabase.js";
import { addPetXP } from "./petService.js";

// ============ STREAK HELPERS ============
function localDateStr(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Racha + páginas de hoy. Lanza si falla alguna lectura (el caller decide el fallback).
// Nota: `streak` es la fila cruda de user_streaks (snake_case), igual que la que devuelven
// las RPC de racha; ver "Excepciones a la convención" en DOCUMENTACION_ARQUITECTURA.md §X.
async function fetchStreakData(userId) {
  const today = localDateStr();
  const [streakRes, logsRes] = await Promise.all([
    supabase.from("user_streaks").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("reading_logs").select("pages_read").eq("user_id", userId).eq("log_date", today),
  ]);
  if (streakRes.error) throw streakRes.error;
  if (logsRes.error) throw logsRes.error;
  const streakRow = streakRes.data;
  const todayLogs = logsRes.data;
  const hasLoggedToday = (todayLogs || []).length > 0;
  const pagesLoggedToday = (todayLogs || []).reduce((sum, r) => sum + (r.pages_read || 0), 0);
  return { streak: streakRow, hasLoggedToday, pagesLoggedToday };
}

function daysBetweenLocalDates(a, b) {
  // Parse YYYY-MM-DD strings as local noon to avoid any DST/UTC-boundary issues
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const dateA = new Date(ay, am - 1, ad, 12);
  const dateB = new Date(by, bm - 1, bd, 12);
  return Math.round((dateA - dateB) / (1000 * 60 * 60 * 24));
}

async function checkStreakOnLoad(userId) {
  const today = localDateStr();
  const { data: existing, error } = await supabase.from("user_streaks")
    .select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[streak] checkStreakOnLoad: no se pudo leer user_streaks:", error.message);
    return;
  }

  if (!existing || !existing.last_log_date || existing.current_streak === 0) {
    console.log("[streak] checkStreakOnLoad: sin racha activa, nada que hacer");
    return;
  }

  const diffDays = daysBetweenLocalDates(today, existing.last_log_date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const freezeProtected = diffDays === 2 && existing.streak_freeze_used_at === localDateStr(yesterday);

  console.log(`[streak] checkStreakOnLoad: hoy=${today}, última_lectura=${existing.last_log_date}, diff=${diffDays}d, freeze=${freezeProtected}, racha_actual=${existing.current_streak}`);

  if (diffDays > 1 && !freezeProtected) {
    // Racha en PAUSA, no reset: el contador se congela hasta que el usuario
    // vuelva a leer (filosofía anti-castigo: nunca se pierde lo construido).
    console.log(`[streak] Racha en PAUSA: ${existing.current_streak} días congelados (sin lectura por ${diffDays} días)`);
  } else {
    console.log(`[streak] Racha ACTIVA: diff=${diffDays}d, racha=${existing.current_streak}`);
    // Pet XP por mantener la racha: +3/día. Lo otorga el SERVIDOR (RPC
    // idempotente por día, funciona multi-dispositivo — antes el gate era
    // localStorage y se duplicaba); después se sincroniza la mascota.
    supabase.rpc("pet_daily_checkin")
      .then(({ error: rpcErr }) => {
        if (rpcErr) console.error("[streak] pet_daily_checkin falló:", rpcErr.message);
        return addPetXP(userId, 3);
      })
      .catch((err) => console.error("[streak] pet_daily_checkin falló:", err));
  }
}

// El protector de racha lo administra el SERVIDOR (user_streaks es solo-lectura para el
// cliente). Ambas RPC devuelven la fila actualizada de user_streaks (o null) y lanzan si fallan.
async function resetMonthlyFreeze() {
  const { data, error } = await supabase.rpc("reset_monthly_freeze");
  if (error) throw error;
  return data || null;
}

async function applyStreakFreeze() {
  const { data, error } = await supabase.rpc("use_streak_freeze");
  if (error) throw error;
  return data || null;
}


export { localDateStr, daysBetweenLocalDates, checkStreakOnLoad, fetchStreakData, resetMonthlyFreeze, applyStreakFreeze };

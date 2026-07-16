import { supabase } from "../supabase.js";

// ============ GEMS ============
let _gemsListeners = [];
const gemsEventBus = {
  emit: (amount) => _gemsListeners.forEach(fn => fn(amount)),
  on: (fn) => {
    _gemsListeners.push(fn);
    return () => { _gemsListeners = _gemsListeners.filter(f => f !== fn); };
  },
};
let _gemToastListeners = [];
const gemToastBus = {
  emit: (amount, label) => _gemToastListeners.forEach(fn => fn(amount, label)),
  on: (fn) => {
    _gemToastListeners.push(fn);
    return () => { _gemToastListeners = _gemToastListeners.filter(f => f !== fn); };
  },
};

async function initUserGems(_userId) {
  // Server-side: claim_daily_gems crea la fila con la bienvenida (+5) si no
  // existe. El cliente ya no puede insertar en user_gems (RLS lo bloquea).
  try {
    await supabase.rpc("claim_daily_gems");
  } catch (e) {
    console.warn("[GEMS] initUserGems rpc:", e?.message);
  }
}

async function loadGems(userId) {
  try {
    console.log('[GEMS] loadGems INICIO', { userId });
    const { data, error } = await supabase.from("user_gems").select("balance").eq("user_id", userId).maybeSingle();
    console.log('[GEMS] loadGems RESULT', { data, error });
    if (error) { console.error("[GEMS] loadGems ERROR:", error); return 0; }
    return data?.balance ?? 0;
  } catch (err) {
    console.error("[GEMS] loadGems EXCEPTION:", err);
    return 0;
  }
}

// Las gemas se otorgan SOLO en el servidor (triggers + RPCs de
// supabase/sprint1_server_authority.sql). El cliente únicamente lee.
async function claimDailyGems(_userId) {
  const { data, error } = await supabase.rpc("claim_daily_gems");
  if (error) {
    console.warn("[GEMS] claim_daily_gems rpc:", error.message);
    return 0;
  }
  return data ?? 0;
}


export { gemsEventBus, gemToastBus, initUserGems, loadGems, claimDailyGems };

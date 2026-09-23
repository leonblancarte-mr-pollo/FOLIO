import { supabase } from "../supabase.js";

// ============ PET (MASCOTA) ============
// Contrato de errores: degrada en vez de lanzar (loadPet → undefined, createPet → { __error },
// updatePetName / addPetXP → null) y siempre deja el motivo en consola con prefijo [PET].
// Devuelve la fila cruda de user_pets (pet_type, pet_name…): excepción documentada en §X.
const PET_MAX_LEVEL = 50;
const petXpForLevel = (level) => level * 100; // XP necesario para salir del nivel actual
const PET_TYPES = {
  gato: {
    img: "/pets/cat.png",
    title: "El Sensible",
    quote: "Leo para encontrarme, no para escapar.",
    label: "Gato",
  },
};
function petImageSrc(petType) {
  return (PET_TYPES[petType] || PET_TYPES.gato).img;
}

let _petListeners = [];
const petBus = {
  emit: (payload) => _petListeners.forEach(fn => fn(payload)),
  on: (fn) => {
    _petListeners.push(fn);
    return () => { _petListeners = _petListeners.filter(f => f !== fn); };
  },
};

// Devuelve el pet, o null si la tabla existe pero el usuario no tiene mascota,
// o undefined si la tabla no existe / hubo error (para no forzar onboarding roto).
async function loadPet(userId) {
  try {
    const { data, error } = await supabase.from("user_pets").select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      console.warn("[PET] loadPet error (¿existe la tabla user_pets? ¿corrieron auth_rls_migration.sql y sprint1_server_authority.sql?):", error.message);
      return undefined;
    }
    if (data) _lastKnownPetLevel = data.level; // semilla para detectar level-ups
    return data || null;
  } catch (e) {
    console.error("[PET] loadPet exception:", e);
    return undefined;
  }
}

async function createPet(userId, { petType = "gato", petName = "Mi compañero" } = {}) {
  console.log("[PET CREATION PRE] inserting:", { userId, petType, petName });
  try {
    // Insert SIN .select() para no depender de una política SELECT de RLS
    const { error } = await supabase.from("user_pets")
      .insert({ user_id: userId, pet_type: petType, pet_name: petName, xp: 0, level: 1 });
    console.log("[PET CREATION POST] insert error:", error ? { code: error.code, message: error.message, details: error.details } : null);

    if (error) {
      // Ya existe (unique violation) → recuperar la existente
      if (error.code === "23505") {
        const { data: existing } = await supabase.from("user_pets").select("*").eq("user_id", userId).maybeSingle();
        if (existing) { console.log("[PET CREATION] ya existía, recuperada:", existing); return existing; }
      }
      console.error("[PET] createPet ERROR:", error.code, error.message,
        error.code === "42501"
          ? "\n→ Permiso denegado: revisa las policies de user_pets (auth_rls_migration.sql). No desactives RLS: user_pets depende de guard_pet_columns."
          : error.code === "23503"
          ? "\n→ Foreign key: user_id no existe en la tabla users."
          : "");
      return { __error: error };
    }

    // Verificar que realmente persistió (si RLS bloquea SELECT, esto será null)
    const { data: verify, error: vErr } = await supabase.from("user_pets").select("*").eq("user_id", userId).maybeSingle();
    console.log("[PET CREATION VERIFY] re-fetched:", verify, "verifyError:", vErr ? vErr.message : null);
    if (verify) return verify;

    // Insert no dio error pero no se puede leer → probablemente RLS bloquea SELECT
    console.warn("[PET CREATION] insert OK pero no se pudo releer (¿RLS en SELECT?). Devuelvo objeto local.");
    return { __unverified: true, user_id: userId, pet_type: petType, pet_name: petName, xp: 0, level: 1 };
  } catch (e) {
    console.error("[PET] createPet exception:", e);
    return { __error: e };
  }
}

async function updatePetName(userId, petName) {
  const clean = (petName || "").trim().slice(0, 40) || "Mi compañero";
  const { error } = await supabase.from("user_pets")
    .update({ pet_name: clean, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) { console.error("[PET] updatePetName error:", error.message); return null; }
  return clean;
}

// El XP ahora lo otorga el SERVIDOR (triggers en books/reading_logs y RPC de
// racha en supabase/sprint1_server_authority.sql); un trigger de columnas
// impide que el cliente escriba xp/level. Esta función quedó como
// SINCRONIZADOR: re-lee la mascota y emite en petBus el mismo payload de
// siempre para que la UI (toast de nivel, confetti, estado) siga idéntica.
let _lastKnownPetLevel = null;
async function addPetXP(userId, amount) {
  if (!userId) return null;
  try {
    const { data: pet, error } = await supabase.from("user_pets").select("*").eq("user_id", userId).maybeSingle();
    if (error) { console.error("[PET] addPetXP sync: no se pudo leer user_pets:", error.message); return null; }
    if (!pet) return null;
    const leveledUp = _lastKnownPetLevel !== null && pet.level > _lastKnownPetLevel;
    _lastKnownPetLevel = pet.level;
    console.log(`[PET XP] sync: level ${pet.level}, xp ${pet.xp}, leveledUp: ${leveledUp}`);
    const result = { newLevel: pet.level, newXp: pet.xp, leveledUp, added: amount, petName: pet.pet_name, petType: pet.pet_type };
    petBus.emit(result);
    return result;
  } catch (e) {
    console.error("[PET] addPetXP sync exception:", e);
    return null;
  }
}


export { PET_MAX_LEVEL, petXpForLevel, PET_TYPES, petImageSrc, petBus, loadPet, createPet, updatePetName, addPetXP };

import { supabase } from "../supabase.js";

// ============ PET (MASCOTA) ============
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
      console.warn("[PET] loadPet error (¿existe la tabla user_pets?):", error.message,
        "\n→ Ejecuta el SQL en Supabase: CREATE TABLE user_pets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL, pet_type text NOT NULL DEFAULT 'gato', pet_name text DEFAULT 'Mi compañero', xp int DEFAULT 0, level int DEFAULT 1, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); ALTER TABLE user_pets DISABLE ROW LEVEL SECURITY;");
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
          ? "\n→ RLS está bloqueando. Ejecuta en Supabase: ALTER TABLE user_pets DISABLE ROW LEVEL SECURITY;"
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
    if (error || !pet) return null;
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

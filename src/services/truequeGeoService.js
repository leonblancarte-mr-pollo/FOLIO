import { callGeoRpc } from "./truequeService.js";

// ============ TRUEQUE v2: ESTADO Y PINES APROXIMADOS ============
// Perfil de Trueque (estado, radio, reglas) y pines del propio usuario.
// Reglas en Postgres (supabase/trueque_geo.sql): el servidor redondea, valida México,
// aplica el límite de 24 h y nadie puede leer los pines de otra persona.
// El cliente NUNCA recibe coordenadas de otros usuarios.

const MAX_PINS = 3;
const PIN_DECIMALS = 2;          // ~1 km; el servidor vuelve a redondear
const PIN_LABEL_MAX = 30;
const RADII_KM = [3, 6, 12, 25];
const DEFAULT_RADIUS_KM = 6;
const PIN_FUZZ_METERS = 1000;    // círculo que se dibuja alrededor del pin

// Mismo redondeo que el servidor, solo para que el pin "salte" al punto guardado.
function roundCoord(n) {
  const f = 10 ** PIN_DECIMALS;
  return Math.round(n * f) / f;
}

function dbToGeoProfile(d) {
  return {
    state: d.state || null,
    maxRadiusKm: d.max_radius_km || DEFAULT_RADIUS_KM,
    pinsUpdatedAt: d.pins_updated_at || null,
    nextEditAt: d.next_edit_at || null,
    rulesAcceptedAt: d.rules_accepted_at || null,
    adultConfirmedAt: d.adult_confirmed_at || null,
    maxPins: d.max_pins || MAX_PINS,
    radiiKm: Array.isArray(d.radii_km) ? d.radii_km : RADII_KM,
    pins: (d.pins || []).map((p) => ({ slot: p.slot, lat: Number(p.lat), lng: Number(p.lng), label: p.label || "" })),
  };
}

// Perfil de Trueque + mis pines. Lanza TruequeError TRUEQUE_UPDATING si la migración no corrió.
async function getGeoProfile() {
  const data = await callGeoRpc("getGeoProfile", "get_my_trueque_pins", {});
  return dbToGeoProfile(data);
}

// pins = null → solo guarda estado/radio (no consume el límite de 24 h).
// pins = [{ lat, lng, label }] (1..3) → reemplaza todos los pines.
// En PINS_COOLDOWN el error trae `retry_at` (ISO) con la hora en que se podrá editar.
async function saveGeo({ pins = null, state = null, maxRadiusKm = null }) {
  const payload = pins
    ? pins.map((p) => ({ lat: roundCoord(p.lat), lng: roundCoord(p.lng), label: p.label?.trim().slice(0, PIN_LABEL_MAX) || null }))
    : null;
  return callGeoRpc("saveGeo", "save_trueque_pins", { p_pins: payload, p_state: state, p_max_radius_km: maxRadiusKm });
}

export {
  MAX_PINS, PIN_DECIMALS, PIN_LABEL_MAX, RADII_KM, DEFAULT_RADIUS_KM, PIN_FUZZ_METERS,
  roundCoord, getGeoProfile, saveGeo,
};

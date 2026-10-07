// ============ BUSCADOR DE LUGARES (Trueque v3) ============
// Nominatim de OpenStreetMap (https://nominatim.openstreetmap.org), gratis y sin API key.
// Política de uso (https://operations.osmfoundation.org/policies/nominatim/):
//   · Máx. 1 solicitud por segundo → THROTTLE_MS + debounce en la UI + caché en memoria.
//   · Identificar la app: el navegador NO permite fijar el header User-Agent en fetch(); el
//     navegador manda solo el Referer (el dominio de SEMA), que la política acepta para apps web.
//   · Si el tráfico crece, cambiar NOMINATIM_URL a un proveedor con plan gratis
//     (MapTiler Geocoding, LocationIQ…) o a un Nominatim propio.
// Privacidad: el texto buscado va solo a Nominatim; NUNCA se guarda en la base de datos.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const THROTTLE_MS = 1100;   // un poco más de 1 s entre solicitudes
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 5;
const MIN_QUERY = 3;
const STATE_BIAS_DEG = 2.5; // caja alrededor del centro del estado para priorizar (no excluye)

const cache = new Map();    // "query|estado" → resultados
let lastRequestAt = 0;

class PlaceSearchError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;       // OFFLINE | TIMEOUT | FAILED
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

// Busca lugares en México. `center` = [lat, lng] del estado elegido (opcional): se usa como
// viewbox con bounded=0, así que prioriza resultados de ese estado sin excluir los demás.
// Devuelve [{ id, name, lat, lng }]. Lanza AbortError si se cancela (la UI lo ignora).
async function searchPlaces(query, { center = null, signal } = {}) {
  const q = query.trim();
  if (q.length < MIN_QUERY) return [];
  const key = `${q.toLowerCase()}|${center ? center.join(",") : ""}`;
  if (cache.has(key)) return cache.get(key);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new PlaceSearchError("OFFLINE", "Sin conexión. Toca el mapa para marcar el lugar.");
  }

  const wait = lastRequestAt + THROTTLE_MS - Date.now();
  if (wait > 0) await sleep(wait, signal);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q, format: "jsonv2", countrycodes: "mx", limit: String(MAX_RESULTS), "accept-language": "es",
  });
  if (center) {
    const [lat, lng] = center;
    params.set("viewbox", [lng - STATE_BIAS_DEG, lat + STATE_BIAS_DEG, lng + STATE_BIAS_DEG, lat - STATE_BIAS_DEG].join(","));
    params.set("bounded", "0");
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, { signal: timeout.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new PlaceSearchError("FAILED", `El buscador respondió ${res.status}.`);
    const rows = await res.json();
    const results = (Array.isArray(rows) ? rows : [])
      .map((r) => ({ id: String(r.place_id), name: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      .slice(0, MAX_RESULTS);
    cache.set(key, results);
    return results;
  } catch (e) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (e instanceof PlaceSearchError) { console.error("[PLACES] searchPlaces:", e.message); throw e; }
    if (e?.name === "AbortError") {
      console.error("[PLACES] searchPlaces: tiempo de espera agotado");
      throw new PlaceSearchError("TIMEOUT", "El buscador tardó demasiado. Intenta de nuevo o toca el mapa.");
    }
    console.error("[PLACES] searchPlaces:", e?.message);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new PlaceSearchError(offline ? "OFFLINE" : "FAILED",
      offline ? "Sin conexión. Toca el mapa para marcar el lugar." : "No se pudo buscar ahora. Intenta de nuevo o toca el mapa.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export { searchPlaces, PlaceSearchError, MIN_QUERY as PLACE_MIN_QUERY };

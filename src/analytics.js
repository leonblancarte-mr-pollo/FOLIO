// Analítica de producto con PostHog (2026-11-06). El resto de la app NO importa posthog-js: solo usa este archivo.
//   · Sin VITE_POSTHOG_KEY, todas las funciones son no-op: la app funciona igual.
//   · identify usa el id interno del usuario (users.id / auth uid). Nunca correo ni nombre como id.
//   · track no envía correo, nombre ni username aunque se los pasen por error (ver sanitizar).
//   · Grabación de sesiones con los campos de entrada enmascarados (maskAllInputs). Autocapture encendido.
//   · No toca claves localStorage folio_* ni el dominio.
import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const CAMPOS_PROHIBIDOS = new Set(["email", "correo", "nombre", "name", "username", "avatar_url", "password"]);

let activo = false;

function sanitizar(props) {
  if (!props || typeof props !== "object") return {};
  const limpio = {};
  for (const [k, v] of Object.entries(props)) {
    if (CAMPOS_PROHIBIDOS.has(k.toLowerCase())) continue;
    limpio[k] = v;
  }
  return limpio;
}

export function init() {
  if (activo || !KEY || typeof window === "undefined") return;
  try {
    posthog.init(KEY, {
      api_host: HOST,
      autocapture: true,
      capture_pageview: true,
      person_profiles: "identified_only",
      disable_session_recording: false,
      session_recording: { maskAllInputs: true },
    });
    activo = true;
  } catch (err) {
    console.warn("[analytics] no se pudo iniciar PostHog:", err?.message || err);
  }
}

export function identify(userId) {
  if (!activo || !userId) return;
  try { posthog.identify(String(userId)); } catch { /* analítica nunca rompe la app */ }
}

export function reset() {
  if (!activo) return;
  try { posthog.reset(); } catch { /* idem */ }
}

export function track(evento, props = {}) {
  if (!activo) return;
  try { posthog.capture(evento, sanitizar(props)); } catch { /* idem */ }
}

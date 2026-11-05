import { useEffect, useRef, useState } from "react";
import { petImageSrc, petBus } from "../services/petService.js";
import { esHitoRacha } from "../theme.js";
import { localDateStr, daysBetweenLocalDates } from "../services/streakService.js";

// Mascota animada (Lottie), 2026-11-05. Sustituye al PNG estático del gato (PetDisplay) en Inicio,
// Mascota (PetHub), onboarding, perfil de amigo, aviso de nivel, avatar de «Para ti» y estado vacío.
//
// · Los JSON viven en src/assets/mascotas/<mascota>/ (ver LEEME.md ahí) y se cargan con import()
//   dinámico, igual que lottie-react: no pesan en el bundle inicial y cada estado se baja una sola vez.
// · UN solo factor de escala para todos los estados: `tamaño` es el alto en px del gato en «leyendo»;
//   factor = tamaño / 540 (alto del lienzo de gato-leyendo). Cada estado se dibuja a su lienzo natural ×
//   factor, así la cabeza mide lo mismo en todos. La caja que ocupa en el layout es siempre la de
//   «leyendo»; los estados más grandes (celebrando, dormido) desbordan hacia arriba y a los lados, sin
//   mover lo que hay alrededor.
// · `pausa` o prefers-reduced-motion → animación detenida en su primer fotograma. «celebrando» pausado
//   llama a onFin a los 3 s para no quedarse atorado.
// · Si el JSON o la librería no cargan (sin red, chunk viejo en caché), se muestra el PNG de antes
//   (`respaldo`, por defecto petImageSrc(mascota)).
// · `canto` (color): filo de 2 px de ese color alrededor de la silueta, como sticker troquelado (el
//   mismo recurso que cat-recorte.png). Sirve donde el contorno lila del gato cae sobre lila (tarjeta de
//   racha en Inicio, recorte de Mascota). Son 4 drop-shadow sin desenfoque: no toca el JSON.
// · Los zorros están copiados en src/assets/mascotas/zorro/ pero todavía NO se conectan aquí.

const LIENZOS = {
  gato: {
    leyendo: { w: 399, h: 540, cargar: () => import("../assets/mascotas/gato/gato-leyendo.json") },
    dormido: { w: 490, h: 453, cargar: () => import("../assets/mascotas/gato/gato-dormido.json") },
    celebrando: { w: 466, h: 712, cargar: () => import("../assets/mascotas/gato/gato-celebrando.json") },
    cafe: { w: 337, h: 456, cargar: () => import("../assets/mascotas/gato/gato-cafe.json") },
  },
};
const ESTADOS = ["leyendo", "dormido", "celebrando", "cafe"];
const REF_ALTO = LIENZOS.gato.leyendo.h; // referencia del factor de escala

// Caché por módulo: cambiar de estado o volver a montar no vuelve a pedir el JSON.
const cache = new Map();
function cargar(clave, fn) {
  if (!cache.has(clave)) {
    cache.set(clave, fn().then((m) => m.default || m).catch((err) => { cache.delete(clave); throw err; }));
  }
  return cache.get(clave);
}
// lottie-react 3 no tiene export por defecto: se usa LottieLight (solo SVG, sin expresiones ni eval;
// los JSON de las mascotas no usan expresiones). La desestructuración deja que Rollup quite el resto.
const cargarLottie = () => cargar("lottie-react", () => import("lottie-react").then(({ LottieLight }) => ({ default: LottieLight })));

function useMovimientoReducido() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reducido, setReducido] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const fn = () => setReducido(mq.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);
  return reducido;
}

function Mascota({ mascota = "gato", estado = "leyendo", tamaño, tamano, onFin, pausa = false, alt, respaldo, canto, style }) {
  const tipo = LIENZOS[mascota] ? mascota : "gato";
  const est = LIENZOS[tipo][estado] ? estado : "leyendo";
  const alto = tamaño ?? tamano ?? 240;
  const factor = alto / REF_ALTO;
  const caja = { w: Math.round(LIENZOS[tipo].leyendo.w * factor), h: Math.round(alto) };
  const lienzo = LIENZOS[tipo][est];
  const unaVez = est === "celebrando";

  const reducido = useMovimientoReducido();
  const detenida = pausa || reducido;

  // `vista` es lo que se dibuja: se cambia solo cuando el estado nuevo ya cargó (sin parpadeo en blanco).
  const [vista, setVista] = useState(null); // { clave, est, data, Lottie }
  const [fallo, setFallo] = useState(false);
  const lottieRef = useRef(null);
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;

  useEffect(() => {
    let vivo = true;
    const clave = `${tipo}:${est}`;
    Promise.all([cargarLottie(), cargar(clave, lienzo.cargar)])
      .then(([Lottie, data]) => { if (vivo) { setVista({ clave, est, data, Lottie }); setFallo(false); } })
      .catch((err) => {
        console.warn(`[mascota] no se pudo cargar ${clave}; se muestra la imagen fija:`, err?.message || err);
        if (vivo) setFallo(true);
      });
    return () => { vivo = false; };
  }, [tipo, est]);

  // Pausa / reanuda (prefers-reduced-motion o prop `pausa`).
  useEffect(() => {
    const anim = lottieRef.current;
    if (!anim || !vista) return;
    if (detenida) { anim.pause(); anim.seek(0); }
    else anim.play();
  }, [detenida, vista]);

  // «celebrando» detenido no termina nunca: se da por terminado a los 3 s.
  useEffect(() => {
    if (!(unaVez && detenida && vista?.est === "celebrando")) return;
    const t = setTimeout(() => onFinRef.current?.(), 3000);
    return () => clearTimeout(t);
  }, [unaVez, detenida, vista]);

  const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
  const caja_style = { position: "relative", width: caja.w, height: caja.h, flex: "0 0 auto", ...style };

  if (fallo) {
    return (
      <span {...a11y} style={{ ...caja_style, display: "inline-block" }}>
        <img src={respaldo || petImageSrc(tipo)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none" }} />
      </span>
    );
  }

  const dibujo = vista ? LIENZOS[tipo][vista.est] : lienzo;
  const w = Math.round(dibujo.w * factor);
  const h = Math.round(dibujo.h * factor);
  const Lottie = vista?.Lottie;
  return (
    <span {...a11y} data-mascota={tipo} data-estado={vista?.est || "cargando"} style={{ ...caja_style, display: "inline-block" }}>
      {vista && (
        <span style={{ position: "absolute", left: "50%", bottom: 0, width: w, height: h, transform: "translateX(-50%)", pointerEvents: "none", filter: canto ? `drop-shadow(2px 0 0 ${canto}) drop-shadow(-2px 0 0 ${canto}) drop-shadow(0 2px 0 ${canto}) drop-shadow(0 -2px 0 ${canto})` : undefined }}>
          <Lottie
            key={vista.clave}
            lottieRef={lottieRef}
            src={vista.data}
            loop={vista.est !== "celebrando"}
            autoplay={!detenida}
            subscriptions={{
              complete: () => { if (vista.est === "celebrando") onFinRef.current?.(); },
              error: ({ error }) => { console.warn("[mascota] la animación falló; se muestra la imagen fija:", error?.message || error); setFallo(true); },
            }}
            rendererSettings={{ preserveAspectRatio: "xMidYMax meet" }}
            style={{ width: "100%", height: "100%" }}
          />
        </span>
      )}
    </span>
  );
}

// ─── Estado según el contexto ────────────────────────────────────────────────────────────────
// Prioridad: celebrando > dormido > café > leyendo.
//  · celebrando: la mascota sube de nivel (petBus) o la racha llega a un hito (esHitoRacha) durante
//    la sesión. Una sola vez; con onFin vuelve al estado de fondo.
//  · dormido: racha en pausa o de noche (desde las 20 h, igual que «Buenas noches» y la frase
//    «Ya es tarde…» de Inicio, hasta las 6). Es descanso, no reproche: no se acompaña de texto.
//  · café: primera visita del día (se guarda la fecha en localStorage `sema_mascota_dia`; el resto de
//    esa pestaña sigue en café con sessionStorage). No usa ni toca claves folio_*.
//  · leyendo: todo lo demás (Inicio, «Retomar lectura»).
// En desarrollo, `?mascota=leyendo|dormido|celebrando|cafe` fuerza un estado (capturas).
const CLAVE_DIA = "sema_mascota_dia";
function hoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
let _primeraDelDia = null;
function esPrimeraVisitaDelDia() {
  if (_primeraDelDia !== null) return _primeraDelDia;
  const hoy = hoyStr();
  try {
    if (sessionStorage.getItem(CLAVE_DIA) === hoy) return (_primeraDelDia = true);
    const ultima = localStorage.getItem(CLAVE_DIA);
    localStorage.setItem(CLAVE_DIA, hoy);
    if (ultima !== hoy) { sessionStorage.setItem(CLAVE_DIA, hoy); return (_primeraDelDia = true); }
  } catch { /* sin almacenamiento: no hay café */ }
  return (_primeraDelDia = false);
}

function estadoForzado() {
  if (!import.meta.env.DEV || typeof location === "undefined") return null;
  const e = new URLSearchParams(location.search).get("mascota");
  return ESTADOS.includes(e) ? e : null;
}

function useEstadoMascota({ rachaEnPausa = false, racha = null } = {}) {
  const [celebrando, setCelebrando] = useState(false);
  useEffect(() => petBus.on((r) => { if (r?.leveledUp) setCelebrando(true); }), []);

  // Hito de racha alcanzado mientras la pantalla está abierta (la racha sube y cae en un hito).
  const rachaPrev = useRef(racha);
  useEffect(() => {
    const prev = rachaPrev.current;
    rachaPrev.current = racha;
    if (prev != null && racha != null && racha > prev && esHitoRacha(racha)) setCelebrando(true);
  }, [racha]);

  const forzado = estadoForzado();
  const h = new Date().getHours();
  const noche = h >= 20 || h < 6;
  const fondo = rachaEnPausa || noche ? "dormido" : esPrimeraVisitaDelDia() ? "cafe" : "leyendo";
  const estado = forzado || (celebrando ? "celebrando" : fondo);
  const onFin = () => { if (!forzado) setCelebrando(false); };
  return { estado, onFin };
}

// Racha en pausa a partir de la fila de racha (para PetHub, que no la calcula). Mismo criterio que
// streakPaused de HomeView: más de un día sin leer y sin protector usado ayer. Solo lee.
function rachaEnPausaDe(streak) {
  const cur = streak?.current_streak || 0;
  if (cur === 0 || !streak?.last_log_date) return false;
  const diff = daysBetweenLocalDates(localDateStr(), streak.last_log_date);
  const y = new Date(); y.setDate(y.getDate() - 1);
  const freezeProtected = diff === 2 && streak.streak_freeze_used_at === localDateStr(y);
  return diff > 1 && !freezeProtected;
}

export { Mascota, useEstadoMascota, rachaEnPausaDe, LIENZOS as MASCOTA_LIENZOS };

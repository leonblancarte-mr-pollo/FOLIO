import { palette, PALETTE_LIGHT, PALETTE_DARK, applyPaletteCssVars, SEMA_EXTENDIDA, SEMA_LLAMA, RACHA_HITOS_BASE, display, label, body, quote as quoteFont, FONT_LINK, fraseHitoRacha, nivelLlama } from "../theme.js";

// Banner de hito de racha (ronda 5, 2026-11-03). Es la publicación «racha» del feed: un CARTEL de
// ancho completo, distinto a todas las demás (sin franja de tipo): fondo propio de la paleta extendida,
// número de días enorme en Unbounded, frase de SEMA y una llama ilustrada en SVG (no emoji).
//
// Colores de la llama: amarillo, naranja y rojo (SEMA_LLAMA en theme.js). Es una EXCEPCIÓN AUTORIZADA
// por León a la paleta, solo para esta ilustración; llevan contorno de tinta #483A58 para que se lean
// sobre cualquier fondo del cartel. Nunca se usan como fondo, texto ni borde de la interfaz.
// Intensidad por nivel (nivelLlama): 1 = 3–14 días (una llama), 2 = 21–100 (una llama grande con dos
// laterales), 3 = 150+ (tres laterales, brasas y halo). El fondo del cartel también sube de nivel:
// cielo → orquídea → chicle (texto #483A58: 5.40 / 5.03 / 4.88:1).
// Animación: parpadeo suave de cada capa de la llama (escala y leve inclinación, 2–3 s). Con
// prefers-reduced-motion queda la llama quieta (index.css, bloque «Ronda 5 · hito de racha»).
// El texto del cartel es siempre #483A58 (palette.onFirma) en claro y en oscuro: el fondo es el mismo.

const EXT = Object.fromEntries(SEMA_EXTENDIDA.map((c) => [c.key, c]));
const FONDO_POR_NIVEL = ["cielo", "orquidea", "chicle"];

// Una lengua de fuego completa (capa roja, naranja y amarilla) en un cuadro de 100 × 130.
function Lengua({ x = 0, y = 0, s = 1, retraso = 0, tinta }) {
  const anim = (n) => ({ animationDelay: `${(retraso + n).toFixed(2)}s` });
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="sema-llama__capa sema-llama__capa--ext" style={anim(0)} fill={SEMA_LLAMA.rojo} stroke={tinta} strokeWidth={3 / s} strokeLinejoin="round"
        d="M50 4 C58 24 82 38 82 72 C82 100 68 124 50 124 C32 124 18 100 18 72 C18 56 26 46 32 36 C34 46 40 50 44 50 C40 34 44 16 50 4 Z" />
      <path className="sema-llama__capa sema-llama__capa--med" style={anim(-0.7)} fill={SEMA_LLAMA.naranja}
        d="M50 54 C56 68 70 78 70 94 C70 110 61 120 50 120 C39 120 30 110 30 94 C30 80 40 74 44 62 C46 68 48 68 50 54 Z" />
      <path className="sema-llama__capa sema-llama__capa--nuc" style={anim(-1.3)} fill={SEMA_LLAMA.amarillo}
        d="M50 82 C54 90 60 95 60 104 C60 112 55 118 50 118 C45 118 40 112 40 104 C40 96 47 92 50 82 Z" />
    </g>
  );
}

// nivel 1 | 2 | 3. Ancho en px según nivel (la altura sale de la proporción 160 × 150).
export function LlamaRacha({ nivel = 1 }) {
  const tinta = palette.onFirma;
  const w = nivel >= 3 ? 188 : nivel === 2 ? 148 : 100;
  return (
    <svg aria-hidden className={`sema-llama sema-llama--n${nivel}`} width={w} height={Math.round(w * (150 / 160))} viewBox="0 0 160 150" fill="none" style={{ display: "block", overflow: "visible" }}>
      {nivel >= 3 && <circle cx="80" cy="84" r="70" fill={SEMA_LLAMA.brasa} opacity="0.55" />}
      {nivel >= 2 && <Lengua x={2} y={52} s={0.62} retraso={-0.4} tinta={tinta} />}
      {nivel >= 2 && <Lengua x={96} y={56} s={0.58} retraso={-1.1} tinta={tinta} />}
      {nivel >= 3 && <Lengua x={-22} y={78} s={0.42} retraso={-0.9} tinta={tinta} />}
      {nivel >= 3 && <Lengua x={118} y={80} s={0.4} retraso={-1.6} tinta={tinta} />}
      <Lengua x={30} y={0} s={nivel >= 2 ? 1 : 1} retraso={0} tinta={tinta} />
      {nivel >= 3 && (
        <g fill={SEMA_LLAMA.amarillo} stroke={tinta} strokeWidth="1.5">
          <circle className="sema-llama__brasa" cx="34" cy="26" r="3.2" />
          <circle className="sema-llama__brasa sema-llama__brasa--b" cx="130" cy="20" r="2.6" />
          <circle className="sema-llama__brasa sema-llama__brasa--c" cx="112" cy="6" r="2.2" />
        </g>
      )}
    </svg>
  );
}

export function RachaHitoCartel({ dias }) {
  const nivel = nivelLlama(dias);
  const fondo = EXT[FONDO_POR_NIVEL[nivel - 1]];
  const largo = String(dias).length;
  return (
    <div className={`sema-hito sema-carton sema-hito--n${nivel}`} data-largo={largo > 3 ? 4 : largo} style={{ "--hito-bg": fondo.hex, "--hito-ink": palette.onFirma }}>
      <div className="sema-hito__llama"><LlamaRacha nivel={nivel} /></div>
      <p className="sema-hito__num" style={display}>{dias}</p>
      <p className="sema-hito__label" style={label}>{dias === 1 ? "día" : "días"} de racha</p>
      <p className="sema-hito__frase" style={quoteFont}>{fraseHitoRacha(dias)}</p>
    </div>
  );
}

// Página de muestra: solo en desarrollo con «?hitos=1» (ver main.jsx). Muestra un cartel por cada nivel
// y varios hitos intermedios, en el modo guardado en folio_theme, para capturar sin esperar a llegar a un hito.
export default function RachaHitoDemo() {
  const isDark = typeof localStorage !== "undefined" && localStorage.getItem("folio_theme") === "dark";
  Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT);
  applyPaletteCssVars(isDark);
  const muestra = [3, 7, 14, 21, 100, 150, 250, 1000];
  return (
    <div style={{ ...body, minHeight: "100vh", backgroundColor: palette.bg, color: palette.ink, maxWidth: 480, margin: "0 auto", paddingBottom: "2rem" }}>
      <style>{FONT_LINK}</style>
      <h1 style={{ ...display, fontSize: 20, fontWeight: 800, padding: "1.25rem 1rem 0.25rem" }}>Banners de hito de racha</h1>
      <p style={{ ...body, fontSize: 14, color: palette.inkSoft, padding: "0 1rem 1rem" }}>
        Hitos: {RACHA_HITOS_BASE.join(", ")} y cada 50 días desde ahí. Nivel 1: 3–14 · nivel 2: 21–100 · nivel 3: 150+.
      </p>
      {muestra.map((d) => (
        <div key={d} style={{ marginBottom: 10, backgroundColor: palette.separadorFeed, paddingBottom: 10 }}>
          <div style={{ backgroundColor: palette.bg }}><RachaHitoCartel dias={d} /></div>
        </div>
      ))}
    </div>
  );
}

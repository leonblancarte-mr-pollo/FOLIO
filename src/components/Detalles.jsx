import { palette, PALETTE_DARK, SEMA_EXTENDIDA, SEMA_PAPEL, label, quote as quoteFont } from "../theme.js";

// Kit de detalles (ronda 4, 2026-11-03): cinta adhesiva, sello de tinta, boleto y nota a mano.
//
// REGLA DE LA RONDA: interfaz limpia, la actitud vive en los detalles. MÁXIMO DOS detalles de este
// kit por tarjeta o publicación y UN SOLO protagonista visual por pantalla. Nunca se sacrifica
// legibilidad por textura: la imperfección es visual (giro leve, papel, falta de tinta), no de
// consistencia (tamaños, paddings y alineaciones iguales en todos los usos).
//
// Colores: ningún hex aquí. Cada componente pone variables CSS (--kd-*) desde `palette`,
// `SEMA_EXTENDIDA` o `SEMA_PAPEL`, y las reglas viven en index.css (bloque «Ronda 4 · kit de
// detalles»), donde solo hay var(--…), currentColor y black/transparent de máscara.
// Tipografía: `label` (Space Mono) en boletos y sellos, nunca menos de 12 px; `quote`
// (Instrument Serif itálica) en la nota a mano. Nada se anima: con prefers-reduced-motion no hay
// nada que apagar y el giro estático se mantiene. Giros acotados a [−8°, 8°].
// REGLA DE GIRO (ronda 2 de correcciones): UNA SOLA pieza girada por tarjeta o publicación; las
// demás van con `angulo={0}`. Tres cosas torcidas en una tarjeta leen como descuido, no como collage.
//
//   import { CintaAdhesiva, SelloTinta, Boleto, NotaMano } from "./components/Detalles.jsx";

const EXT = Object.fromEntries(SEMA_EXTENDIDA.map((c) => [c.key, c]));
export const isDarkKit = () => palette.bg === PALETTE_DARK.bg;
const clampAngulo = (a) => Math.max(-8, Math.min(8, Number(a) || 0));

// Resuelve un nombre de color del kit a { bg, on }. Sirve para cinta y boleto.
//   "superficie" → superficieSuave (arena en claro, ciruela en oscuro) con texto ink.
//   "firma"      → lila con onFirma.      "papel" → SEMA_PAPEL (arena + tinta fijos, ambos modos).
//   clave de SEMA_EXTENDIDA ("mostaza", "cielo", …) → su hex con su `on`.
function colorKit(color) {
  if (color === "firma") return { bg: palette.firma, on: palette.onFirma };
  if (color === "papel") return { bg: SEMA_PAPEL.bg, on: SEMA_PAPEL.on };
  if (EXT[color]) return { bg: EXT[color].hex, on: EXT[color].on };
  return { bg: palette.superficieSuave, on: palette.ink };
}

// ── CintaAdhesiva ─────────────────────────────────────────────────────────────────────────────
// Cuándo: un «recorte pegado» encima de una tarjeta (la reseña de «Libro terminado», la etiqueta
//   de papel en Explorar). Va sobre el borde superior del padre, medio dentro y medio fuera.
// Cuándo no: sobre texto, sobre controles (tapa el toque) ni más de una por tarjeta. Es solo
//   decoración: aria-hidden siempre. El padre debe tener position: relative y no recortar (overflow).
export function CintaAdhesiva({ color = "superficie", angulo = -4, position = "top-left", width = 86, className = "", style }) {
  const c = colorKit(color);
  const pos = position === "top-center" ? { left: "50%", "--kd-x": "-50%" }
    : position === "top-right" ? { right: 14, "--kd-x": "0%" }
    : { left: 14, "--kd-x": "0%" };
  return (
    <span
      aria-hidden
      className={`sema-kd-cinta ${className}`.trim()}
      style={{ "--kd-bg": c.bg, "--kd-luz": palette.onColor, "--kd-angulo": `${clampAngulo(angulo)}deg`, width, ...pos, ...style }}
    />
  );
}

// ── SelloTinta ────────────────────────────────────────────────────────────────────────────────
// Cuándo: un momento que merece sello (récord de racha, «Libro terminado», «Nº 1 del mes»):
//   una o dos palabras en mayúsculas, una vez por pantalla.
// Cuándo no: como etiqueta de tipo (eso es Boleto), en listas repetidas ni con frases largas.
// Colores y dónde pasan contraste (sema-paleta §3): "tinta" (DEFAULT, filo y texto en ink: pasa en
//   claro y oscuro sobre bg y sobre superficieSuave); "firma" (lila: SOLO sobre negro o sobre la
//   ciruela oscura; sobre blanco da 1.99); "frio" (azul acero: SOLO en claro sobre bg; sobre negro
//   3.68 y sobre arena 4.05, no alcanza a 12–13 px); "exito" (verde: sobre bg en ambos modos; sobre
//   arena solo grande). Sobre un bloque de la extendida se usa "tinta" (texto encima siempre #483A58 vía token).
// CAÍDA AUTOMÁTICA A "tinta" (correcciones ronda 4): el componente lee el modo (`palette.bg`) y la prop
//   opcional `sobre` ("bg" default | "superficie" | "color") y, si el color pedido no pasa 4.5:1 ahí,
//   pinta en `ink`: "firma" en claro → tinta; "frio" en oscuro o fuera de bg → tinta; "exito" fuera de
//   bg → tinta; cualquier color sobre "color" (extendida, degradado) → tinta. Así nadie puede pedir un
//   sello ilegible por error. Quien lo ponga sobre arena/ciruela pasa `sobre="superficie"`.
// La falta de tinta va fuerte solo en los filos; en el texto el alfa nunca baja de 0.95 (index.css).
// El texto queda legible por lectores de pantalla; `aria-label` lo sustituye si hace falta (role="img").
export function SelloTinta({ color = "tinta", sobre = "bg", angulo = -8, size = "md", children, className = "", style, ...rest }) {
  const dark = isDarkKit();
  const pasa = sobre === "bg" && (color === "frio" ? !dark : color === "exito")
    || color === "firma" && dark && sobre !== "color";
  const tinta = !pasa ? palette.ink
    : color === "firma" ? palette.firma
    : color === "frio" ? palette.complementoFrio
    : palette.success;
  return (
    <span
      {...rest}
      className={`sema-kd-sello sema-kd-sello--${size === "sm" ? "sm" : "md"} ${className}`.trim()}
      style={{ ...label, "--kd-ink": tinta, "--kd-angulo": `${clampAngulo(angulo)}deg`, ...style }}
    >
      <span className="sema-kd-sello__texto">{children}</span>
    </span>
  );
}

// ── Boleto ────────────────────────────────────────────────────────────────────────────────────
// Cuándo: etiquetas de tipo o de momento con cuerpo corto en mayúsculas («CUENTO DEL DÍA», «RACHA»)
//   y, si ayuda, un talón con dato breve («03 NOV», «Nº 12», «12 DÍAS») separado por línea de corte.
// Cuándo no: para texto de lectura, para más de 3 palabras, ni dos boletos iguales seguidos. Sobre
//   bg blanco, "papel" y "superficie" se distinguen por el borde de 2 px, no por el relleno.
// Colores: "papel" (SEMA_PAPEL, arena + tinta fijos, para ir SOBRE un bloque de color), "firma",
//   "superficie" (arena/ciruela según modo) o clave de SEMA_EXTENDIDA. Texto y borde siempre en el `on`.
// perforado: "arriba-abajo" (muescas en la línea de corte; necesita `talon`), "lados" (dentado en los
//   lados cortos) o "ninguno". `talonAncho` (px, default 62) fija el ancho del talón: «03 NOV» a 13 px.
// Accesibilidad: el talón es DECORATIVO (aria-hidden) porque el dato suele estar ya en la tarjeta. Si no
//   lo está, quien use `talon` lo repite para lectores de pantalla: con `srText` (pinta un span
//   `sr-only` dentro del boleto, p. ej. srText="Cuento del día del 3 de noviembre") o con un
//   `aria-label` en el boleto. El cuerpo (`children`) sí es texto normal.
export function Boleto({ color = "papel", talon, perforado = "arriba-abajo", angulo = -2, papel = true, talonAncho = 62, size = "md", srText, children, className = "", style, ...rest }) {
  const c = colorKit(color);
  const conTalon = talon != null && talon !== "";
  const modo = perforado === "lados" ? "lados" : perforado === "arriba-abajo" && conTalon ? "corte" : "liso";
  return (
    <span
      {...rest}
      className={`sema-kd-boleto sema-kd-boleto--${modo} ${papel ? "sema-papel" : ""} ${className}`.trim()}
      style={{ ...label, fontSize: size === "sm" ? "12px" : "13px", "--kd-bg": c.bg, "--kd-ink": c.on, "--kd-corte": `${talonAncho}px`, "--kd-angulo": `${clampAngulo(angulo)}deg`, ...style }}
    >
      {srText && <span className="sr-only">{srText}</span>}
      {conTalon && <span aria-hidden className="sema-kd-boleto__talon">{talon}</span>}
      <span className="sema-kd-boleto__cuerpo">{children}</span>
    </span>
  );
}

// ── NotaMano ──────────────────────────────────────────────────────────────────────────────────
// Cuándo: una anotación corta junto a un dato real («Te faltan 783 páginas», «casi 2 h de metro»),
//   en Instrument Serif itálica sobre el fondo que haya, sin caja. La flecha ("arriba" | "izquierda")
//   apunta al dato que comenta.
// Cuándo no: como título, como texto principal ni sobre un degradado (ink no pasa en los dos extremos).
//   Siempre en `ink`: 10.39 sobre blanco, 21 sobre negro, 7.36 sobre arena, ≥ 4.77 sobre la extendida.
function FlechaNota({ dir }) {
  // Trazo a mano: el asta ondula y la punta no es simétrica (misma idea que FlechaMano de StickerButton).
  const up = dir === "arriba";
  return (
    <svg
      aria-hidden
      className={`sema-kd-nota__flecha sema-kd-nota__flecha--${dir}`}
      width={up ? 18 : 24}
      height={up ? 24 : 18}
      viewBox={up ? "0 0 18 24" : "0 0 24 18"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {up ? (
        <>
          <path d="M9 22 C 8.2 16, 9.8 11, 9 3" />
          <path d="M3.6 8.4 C 5.8 6.6, 7.6 4.6, 9 2.4 C 10.6 4.8, 12.6 6.6, 14.6 8" />
        </>
      ) : (
        <>
          <path d="M22 9 C 16 8.2, 11 9.8, 3 9" />
          <path d="M8.4 3.6 C 6.6 5.8, 4.6 7.6, 2.4 9 C 4.8 10.6, 6.6 12.6, 8 14.6" />
        </>
      )}
    </svg>
  );
}

export function NotaMano({ angulo = -2, flecha = "ninguna", children, className = "", style, ...rest }) {
  const dir = flecha === "arriba" || flecha === "izquierda" ? flecha : null;
  return (
    <span
      {...rest}
      className={`sema-kd-nota ${dir ? `sema-kd-nota--${dir}` : ""} ${className}`.trim()}
      style={{ ...quoteFont, "--kd-ink": palette.ink, "--kd-angulo": `${clampAngulo(angulo)}deg`, ...style }}
    >
      {dir && <FlechaNota dir={dir} />}
      <span className="sema-kd-nota__texto">
        {children}
        <svg aria-hidden className="sema-kd-nota__raya" viewBox="0 0 100 6" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 3.6 C 12 1.2, 22 5.2, 34 3 C 46 0.9, 56 5.4, 68 3.2 C 79 1.3, 89 4.8, 99 2.6" />
        </svg>
      </span>
    </span>
  );
}

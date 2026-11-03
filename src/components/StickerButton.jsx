import { palette, PALETTE_DARK, display } from "../theme.js";

// Botón «sticker» (neobrutalismo suave, ronda 2 del 2026-11-02; vida y reflejo en la ronda 3).
// Es la acción principal rellena de la pantalla (principio 1): durazno `accent` con texto
// `onAccent` #483A58 y sombra SÓLIDA desplazada sin desenfoque: tinta en claro y firma lila en
// oscuro (la tinta oscura es blanca y leía como marco doble). Al presionar se «hunde»: se traslada
// lo mismo que la sombra y la sombra baja a 0.
//
// Ronda 3 (2026-11-02, pedido de León: el relleno plano se veía «equis») y su ronda de correcciones:
//  · Relleno con degradado LEVE dentro del durazno: de `accent` aclarado con blanco hacia `accent`.
//    La mezcla va por `--sb-luz`: 22 % de blanco en claro y solo 10 % en oscuro (con 22 % el
//    durazno oscuro caía en el beige que la paleta descartó). Ningún punto es más oscuro que
//    `accent`, así `onAccent` da ≥ 5.04:1 en claro y ≥ 5.85:1 en oscuro en todo el recorrido.
//  · Reflejo de vinil FIJO (::after): banda corta de bordes duros en la esquina superior izquierda.
//    Barrido (::before) solo una vez al montar (1.2 s), al hover/foco y cada 24 s; con
//    prefers-reduced-motion queda solo el reflejo fijo. No es un shimmer continuo.
//  · Canto troquelado de sticker, el mismo de la racha de Inicio: filo de 3 px en `bg` entre el
//    durazno y una línea de `ink` (anillo de box-shadow; blanco en oscuro como el de la racha:
//    onAccent sobre negro da 2.02:1 y no se veía), como recortado de la misma hoja. En la
//    ronda 3 se probaron un giro de −1° y un filete punteado interior; los dos se descartaron
//    (escalonaba el borde / leía como cupón de plantilla).
//  · El disco con flecha Lucide se fue: la flecha es un SVG propio dibujado «a mano».
// Las reglas viven en index.css (.sema-sticker-btn); aquí solo se pasan los colores como variables.
// Ojo: anillo (1.5 px) y sombra (4 px + anillo) quedan fuera de la caja: quien lo use a ancho
// completo deja `width: calc(100% - 6px)`.
//
//   <StickerButton onClick={...}>Leer ahora</StickerButton>
//
// Props: arrow (flecha a mano al final, por defecto true), leadingIcon (Lucide al inicio),
// size "lg" (Inicio, 64 px) | "md" (tarjetas, 56 px), fullWidth (por defecto true).

// Flecha dibujada a mano: el asta ondula un poco y la punta no es simétrica, como trazo de plumón.
function FlechaMano({ size = 26 }) {
  return (
    <svg
      className="sema-sticker-btn__flecha"
      width={size}
      height={Math.round(size * 0.72)}
      viewBox="0 0 30 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 11.6 C 8 10.2, 14 12.4, 20.5 10.9 C 23 10.3, 25 10.6, 27 11.1" />
      <path d="M19.2 3.4 C 21.6 6.4, 24.3 9, 27.2 11 C 24.6 13.4, 22.2 16.2, 20.4 18.9" />
    </svg>
  );
}

function StickerButton({ children, arrow = true, leadingIcon: Lead, size = "md", fullWidth = true, className = "", style, ...rest }) {
  const isDark = palette.bg === PALETTE_DARK.bg;
  const lg = size === "lg";
  return (
    <button
      type="button"
      {...rest}
      className={`sema-sticker-btn sema-no-hover ${className}`.trim()}
      style={{
        "--sb-bg": palette.accent,
        "--sb-ink": palette.onAccent,
        "--sb-canto": palette.bg,
        "--sb-anillo": palette.ink,
        "--sb-luz": isDark ? "90%" : "78%",
        "--sb-shadow": isDark ? palette.firma : palette.ink,
        "--sb-focus": palette.ink,
        "--sb-brillo": palette.onColor,
        // Barrido: pico y bordes de la banda. Más tenue en oscuro para no deslavar el durazno.
        "--sb-barrido": isDark ? "30%" : "52%",
        "--sb-barrido-borde": isDark ? "18%" : "34%",
        width: fullWidth ? "100%" : "auto",
        minHeight: lg ? 64 : 56,
        padding: lg ? "0.9rem 1.25rem" : "0.75rem 1.1rem",
        ...display, fontWeight: 800, fontSize: lg ? "21px" : "19px", letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {Lead && <Lead size={lg ? 24 : 22} strokeWidth={2.3} aria-hidden style={{ flexShrink: 0, position: "relative", zIndex: 1 }} />}
      <span className="sema-sticker-btn__texto">{children}</span>
      {arrow && <FlechaMano size={lg ? 28 : 24} />}
    </button>
  );
}

export default StickerButton;

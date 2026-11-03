import { palette, PALETTE_DARK, display } from "../theme.js";

// Botón «sticker» (neobrutalismo suave, ronda 2 del 2026-11-02). Es la acción principal rellena
// de la pantalla (principio 1): durazno `accent` con texto `onAccent` #483A58 (5.04:1 en claro,
// 5.85:1 en oscuro), borde de 2 px en `onAccent` y sombra SÓLIDA desplazada sin desenfoque:
// tinta en claro y firma lila en oscuro (la tinta oscura es blanca y leía como marco doble).
// Al presionar se «hunde»: se traslada lo mismo que la sombra y la sombra baja a 0.
// Brillo sutil arriba con color-mix de `onColor` (sin hex fuera de theme.js).
// Las reglas viven en index.css (.sema-sticker-btn); aquí solo se pasan los colores como variables.
//
//   <StickerButton icon={ArrowRight} onClick={...}>Leer ahora</StickerButton>
//
// Props: icon (componente Lucide, va al final dentro de un disco), leadingIcon (al inicio),
// size "lg" (Inicio, 64 px) | "md" (tarjetas, 56 px), fullWidth (por defecto true).
function StickerButton({ children, icon: Icon, leadingIcon: Lead, size = "md", fullWidth = true, className = "", style, ...rest }) {
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
        "--sb-shine": palette.onColor,
        "--sb-shadow": isDark ? palette.firma : palette.ink,
        "--sb-focus": palette.ink,
        width: fullWidth ? "100%" : "auto",
        minHeight: lg ? 64 : 56,
        padding: lg ? "0.9rem 1.25rem" : "0.75rem 1.1rem",
        ...display, fontWeight: 800, fontSize: lg ? "21px" : "19px", letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {Lead && <Lead size={lg ? 24 : 22} strokeWidth={2.3} aria-hidden style={{ flexShrink: 0 }} />}
      <span>{children}</span>
      {Icon && (
        <span aria-hidden className="sema-sticker-btn__disc" style={{ width: lg ? 34 : 30, height: lg ? 34 : 30 }}>
          <Icon size={lg ? 20 : 18} strokeWidth={2.6} />
        </span>
      )}
    </button>
  );
}

export default StickerButton;

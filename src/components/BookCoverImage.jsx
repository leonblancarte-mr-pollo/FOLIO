import { useState, useEffect, useRef } from "react";
import { palette, SEMA_COVER_COMBOS, FONT_DISPLAY, FONT_UI } from "../theme.js";

/**
 * Portada de libro con tres estados:
 *  - cargando: skeleton con shimmer
 *  - cargada: la imagen real (fade-in)
 *  - fallback: portada genérica SEMA (GenericCover)
 *
 * Llena el contenedor padre (position:absolute inset:0), pensado para usarse
 * dentro de un wrapper con position:relative y overflow:hidden.
 *
 * Portada genérica (2026-11-02): composición de editorial independiente / flyer, sin emojis
 * ni degradados. Bloque de color plano arriba con el título (Bricolage) y el autor (Figtree),
 * franja plana abajo y un motivo geométrico SVG en la parte baja del bloque. Combinación y
 * motivo salen de un hash del título + autor: el mismo libro siempre se ve igual y dos
 * libros distintos casi nunca coinciden. Colores: SEMA_COVER_COMBOS (theme.js).
 */

// Alto de la franja inferior, en % de la portada. BookTinder pone su texto encima.
export const GENERIC_BAND_PCT = 38;

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Combinación de color de la portada genérica de un libro (determinista). */
export function genericCoverScheme(title = "", author = "") {
  const h = hashString(`${title}::${author}`);
  return { ...SEMA_COVER_COMBOS[h % SEMA_COVER_COMBOS.length], motif: Math.floor(h / 7) % 7 };
}

// Motivos en un lienzo de 100 × 140 (proporción de libro). El bloque superior termina en y≈87;
// los motivos viven entre y=54 y y=87 para no quedar debajo del título.
function Motif({ kind, color }) {
  switch (kind) {
    case 0: // sol que asoma sobre la franja
      return <circle cx="72" cy="87" r="24" fill={color} />;
    case 1: // franjas de flyer
      return <g fill={color}>{[0, 1, 2, 3].map((i) => <rect key={i} x="38" y={60 + i * 7} width="62" height="3.5" />)}</g>;
    case 2: // cuarto de círculo en la esquina
      return <path d="M100 87 V47 A40 40 0 0 0 60 87 Z" fill={color} />;
    case 3: // triángulo
      return <polygon points="46,87 70,57 94,87" fill={color} />;
    case 4: // retícula de puntos
      return (
        <g fill={color}>
          {[0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => (
            <circle key={`${r}-${c}`} cx={56 + c * 9} cy={64 + r * 9} r="2.4" />
          )))}
        </g>
      );
    case 5: // aro
      return <circle cx="76" cy="70" r="12" fill="none" stroke={color} strokeWidth="5" />;
    default: // dos bloques desplazados
      return (
        <g fill={color}>
          <rect x="58" y="60" width="30" height="27" />
          <rect x="50" y="54" width="14" height="14" />
        </g>
      );
  }
}

export function GenericCover({ title, author, compact = false, label = "" }) {
  const s = genericCoverScheme(title || "", author || "");
  return (
    // containerType: el texto se mide contra el ancho de LA PORTADA (cqw), no de la pantalla.
    <div {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })} style={{ position: "absolute", inset: 0, backgroundColor: s.field, overflow: "hidden", containerType: "inline-size" }}>
      <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
        <Motif kind={s.motif} color={s.mark} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${GENERIC_BAND_PCT}%`, backgroundColor: s.band }} />

      {!compact && (
        <div style={{ position: "absolute", top: "9cqw", left: "8cqw", right: "8cqw" }}>
          <div style={{ width: "10cqw", height: 3, backgroundColor: s.fieldInk, marginBottom: "4cqw" }} />
          <p style={{
            fontFamily: FONT_DISPLAY, fontWeight: 800, color: s.fieldInk,
            fontSize: "clamp(12px, 9cqw, 34px)", lineHeight: 1.05, letterSpacing: "-0.02em",
            margin: 0, overflowWrap: "normal", wordBreak: "normal",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {title}
          </p>
          {author && (
            <p style={{
              fontFamily: FONT_UI, fontWeight: 600, color: s.fieldInk,
              fontSize: "clamp(12px, 4.6cqw, 16px)", lineHeight: 1.3,
              margin: "3cqw 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {author}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Shimmer() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, backgroundColor: palette.border, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(100deg, transparent 30%, ${palette.bg} 50%, transparent 70%)`,
        opacity: 0.55,
        animation: "coverShimmer 1.4s ease-in-out infinite",
      }} />
      <style>{`@keyframes coverShimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
    </div>
  );
}

// `alt` opcional: por defecto el título; se pasa "" cuando el título ya está escrito al lado.
// `genres` se conserva en la API (antes elegía el emoji por género); la portada genérica ya no lo usa.
// eslint-disable-next-line no-unused-vars
export default function BookCoverImage({ coverUrl, title, author, genres = [], compact = false, timeoutMs = 3000, alt = title ?? "" }) {
  // idle → loading → loaded | failed
  const [status, setStatus] = useState(coverUrl ? "loading" : "failed");
  const timerRef = useRef(null);

  useEffect(() => {
    setStatus(coverUrl ? "loading" : "failed");
    if (!coverUrl) return;
    timerRef.current = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "failed" : s));
    }, timeoutMs);
    return () => clearTimeout(timerRef.current);
  }, [coverUrl, timeoutMs]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {status === "loading" && <Shimmer />}
      {status === "failed" && <GenericCover title={title} author={author} compact={compact} label={alt} />}
      {coverUrl && status !== "failed" && (
        <img
          src={coverUrl}
          alt={alt}
          draggable={false}
          onLoad={() => { clearTimeout(timerRef.current); setStatus("loaded"); }}
          onError={() => { clearTimeout(timerRef.current); setStatus("failed"); }}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", display: "block",
            opacity: status === "loaded" ? 1 : 0,
            transition: "opacity 320ms ease",
          }}
        />
      )}
    </div>
  );
}

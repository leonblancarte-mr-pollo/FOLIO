import { useState, useEffect, useRef } from "react";
import { palette, SEMA_COVER_COMBOS, FONT_DISPLAY, FONT_UI } from "../theme.js";

/**
 * Portada de libro con tres estados:
 *  - cargando: skeleton con shimmer (se puede apagar con `skeleton={false}`)
 *  - cargada: la imagen real (fade-in)
 *  - fallback: portada genérica SEMA (GenericCover)
 *
 * Llena el contenedor padre (position:absolute inset:0), pensado para usarse
 * dentro de un wrapper con position:relative y overflow:hidden.
 *
 * Portada genérica (2026-11-02, ronda 2): un solo recurso, como un boleto de cine o de tren pegado
 * en un zine. Campo plano (superficie, tinta o azul acero), título grande en Bricolage y, debajo,
 * un boleto troquelado con el autor y un número de serie. Todo va en flujo normal (sin posiciones
 * absolutas): el texto nunca queda encima de un motivo, sea cual sea la proporción de la portada.
 * La combinación, el giro del boleto y el número salen de un hash del título + autor: el mismo
 * libro siempre se ve igual. Colores: SEMA_COVER_COMBOS (theme.js).
 */

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Combinación de la portada genérica de un libro (determinista). */
export function genericCoverScheme(title = "", author = "") {
  const h = hashString(`${title}::${author}`);
  const tilts = [-2.5, -1.5, 1.5, 2.5];
  return {
    ...SEMA_COVER_COMBOS[h % SEMA_COVER_COMBOS.length],
    tilt: tilts[Math.floor(h / 7) % tilts.length],
    serial: String(Math.floor(h / 31) % 10000).padStart(4, "0"),
  };
}

// Inicial de la portada compacta: se saltan artículos y preposiciones del inicio («El extranjero» → «E»
// de extranjero, «Los días del abandono» → «D»).
const COVER_STOPWORDS = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "lo", "de", "del", "the", "a", "an", "y"]);
function coverInitial(title = "") {
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  const word = words.find((w) => !COVER_STOPWORDS.has(w.toLowerCase())) || words[0] || "";
  const ch = word.replace(/^[^\p{L}\p{N}]+/u, "").charAt(0);
  return ch ? ch.toLocaleUpperCase("es-MX") : "";
}

// Troquel: dos medias lunas recortadas en los costados (es una máscara de alfa, no un color).
const TICKET_MASK =
  "radial-gradient(circle at 0 50%, transparent 6px, black 6.5px) left / 51% 100% no-repeat, " +
  "radial-gradient(circle at 100% 50%, transparent 6px, black 6.5px) right / 51% 100% no-repeat";

function Ticket({ scheme, author, compact }) {
  return (
    <div style={{
      display: "flex", alignItems: "stretch", maxWidth: "100%",
      width: compact ? "80%" : "fit-content", height: compact ? 12 : undefined,
      backgroundColor: scheme.ticket, color: scheme.ticketInk,
      transform: `rotate(${scheme.tilt}deg)`, transformOrigin: "left center",
      WebkitMask: compact ? undefined : TICKET_MASK, mask: compact ? undefined : TICKET_MASK,
    }}>
      {!compact && (
        <>
          <span style={{
            fontFamily: FONT_UI, fontWeight: 600, fontSize: "clamp(12px, 4.4cqw, 16px)", lineHeight: 1.25,
            padding: "0.5em 0.9em 0.5em 1.1em", minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {author || "Autor desconocido"}
          </span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "12px", letterSpacing: "0.04em",
            padding: "0 1.1em 0 0.8em", borderLeft: `1.5px dashed ${scheme.ticketInk}`,
            display: "flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0,
          }}>
            Nº {scheme.serial}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Portada genérica. `label`: texto accesible (vacío = decorativa). `footer(scheme)`: contenido
 * opcional al pie, sobre el mismo campo plano y en su color de texto (BookTinder pone ahí
 * géneros, calificación y sinopsis).
 */
export function GenericCover({ title, author, compact = false, label = "", footer = null }) {
  const s = genericCoverScheme(title || "", author || "");
  const art = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    // containerType: el texto se mide contra el ancho de LA PORTADA (cqw), no de la pantalla.
    <div style={{ position: "absolute", inset: 0, backgroundColor: s.field, color: s.fieldInk, overflow: "hidden", containerType: "size" }}>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        padding: compact ? "20cqw 12cqw" : "9cqw 8cqw 8cqw",
      }}>
        <div {...art} style={{ flexShrink: 0 }}>
          {compact ? (
            // Compacta (2026-11-02, Para ti ronda 2): monograma con la inicial de la primera palabra con
            // peso del título, en Bricolage, para que no parezca un skeleton de rayas.
            <>
              <div style={{ width: "30%", height: 3, backgroundColor: s.fieldInk, marginBottom: "8cqw" }} />
              <p style={{
                fontFamily: FONT_DISPLAY, fontWeight: 800, color: s.fieldInk,
                fontSize: "clamp(20px, 52cqw, 64px)", lineHeight: 1, letterSpacing: "-0.03em",
                margin: "0 0 10cqw",
              }}>
                {coverInitial(title)}
              </p>
              <Ticket scheme={s} compact />
            </>
          ) : (
            <>
              <div style={{ width: "10cqw", height: 3, backgroundColor: s.fieldInk, marginBottom: "4cqw" }} />
              <p style={{
                fontFamily: FONT_DISPLAY, fontWeight: 800, color: s.fieldInk,
                fontSize: "clamp(12px, min(11.5cqw, 9.5cqh), 44px)", lineHeight: 1.08, letterSpacing: "-0.025em",
                margin: 0, paddingBottom: "0.08em", overflowWrap: "normal", wordBreak: "normal",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {title}
              </p>
              <div style={{ marginTop: "5cqw" }}>
                <Ticket scheme={s} author={author} />
              </div>
            </>
          )}
        </div>
        {footer && (
          // Ocupa TODO el espacio libre bajo el boleto (flex 1 1 0): su alto no depende del contenido,
          // así el pie puede medirlo y decidir cuántas líneas caben (BookTinder › FitFooter).
          <div style={{
            flex: "1 1 0", minHeight: 0, paddingTop: 12, overflow: "hidden", color: s.fieldInk,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            {footer(s)}
          </div>
        )}
      </div>
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

// `alt` opcional: por defecto el título (la genérica lee «título, de autor»); se pasa "" cuando el
// título ya está escrito al lado. `genres` se conserva en la API (antes elegía el emoji por género).
// `onStatus` (opcional) avisa "loading" | "loaded" | "failed"; `skeleton={false}` no pinta el shimmer.
// eslint-disable-next-line no-unused-vars
export default function BookCoverImage({ coverUrl, title, author, genres = [], compact = false, timeoutMs = 3000, alt, onStatus, skeleton = true }) {
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

  useEffect(() => { onStatus?.(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const imgAlt = alt ?? title ?? "";
  const genericLabel = alt ?? (title ? (author ? `${title}, de ${author}` : title) : "");

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {status === "loading" && skeleton && <Shimmer />}
      {status === "failed" && <GenericCover title={title} author={author} compact={compact} label={genericLabel} />}
      {coverUrl && status !== "failed" && (
        <img
          src={coverUrl}
          alt={imgAlt}
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

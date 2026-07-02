import { useState, useEffect, useRef } from "react";

/**
 * Portada de libro con tres estados:
 *  - cargando: skeleton con shimmer
 *  - cargada: la imagen real (fade-in)
 *  - fallback: composición editorial por género (gradiente + emoji + título serif)
 *
 * Llena el contenedor padre (position:absolute inset:0), pensado para usarse
 * dentro de un wrapper con position:relative y overflow:hidden.
 */

const serif = { fontFamily: "Fraunces, serif" };
const body = { fontFamily: "'EB Garamond', serif" };

// Gradiente + emoji por género principal. Tonos oscuros y cinemáticos
// para que el texto blanco de la card siempre contraste.
const GENRE_STYLES = [
  { match: /ciencia ficción|sci.?fi|cyberpunk|space/i, gradient: "linear-gradient(155deg, #06121F 0%, #0E3350 48%, #2E7EA6 100%)", emoji: "🚀", accent: "#7FD4F5" },
  { match: /fantas/i,                                  gradient: "linear-gradient(155deg, #170B2B 0%, #3A1D62 48%, #8A4BBF 100%)", emoji: "🐉", accent: "#D9B8F5" },
  { match: /horror|terror/i,                           gradient: "linear-gradient(155deg, #0A0505 0%, #300B0B 52%, #6B1414 100%)", emoji: "🕯️", accent: "#E8A9A9" },
  { match: /misterio/i,                                gradient: "linear-gradient(155deg, #10131A 0%, #2A3140 52%, #4E5A70 100%)", emoji: "🔍", accent: "#B9C4D6" },
  { match: /thriller/i,                                gradient: "linear-gradient(155deg, #14100A 0%, #33260F 50%, #705617 100%)", emoji: "🗝️", accent: "#E3C77C" },
  { match: /roman/i,                                   gradient: "linear-gradient(155deg, #26090F 0%, #571B2E 50%, #A6485F 100%)", emoji: "🌹", accent: "#F2B8C6" },
  { match: /filosof/i,                                 gradient: "linear-gradient(155deg, #0D1408 0%, #29391A 52%, #5C7A3D 100%)", emoji: "🧠", accent: "#CBDCA8" },
  { match: /historia/i,                                gradient: "linear-gradient(155deg, #140C05 0%, #3D2712 50%, #8A5A2B 100%)", emoji: "📜", accent: "#E5C79A" },
  { match: /biograf/i,                                 gradient: "linear-gradient(155deg, #0E0D0B 0%, #33302A 52%, #6E6753 100%)", emoji: "🖋️", accent: "#D8D0BC" },
  { match: /clásic/i,                                  gradient: "linear-gradient(155deg, #120E05 0%, #3B2F10 50%, #806822 100%)", emoji: "🏛️", accent: "#E8D9A0" },
  { match: /contemporánea|drama|ficción/i,             gradient: "linear-gradient(155deg, #0A1210 0%, #1F3833 52%, #47736A 100%)", emoji: "🌆", accent: "#AFD6CC" },
  { match: /aventura/i,                                gradient: "linear-gradient(155deg, #071408 0%, #1B3D1E 50%, #4F7D35 100%)", emoji: "🧭", accent: "#BFE0A3" },
  { match: /educaci|ciencia$|psicolog/i,               gradient: "linear-gradient(155deg, #081018 0%, #16324A 52%, #3A6E8F 100%)", emoji: "💡", accent: "#A9D4EC" },
  { match: /poesía/i,                                  gradient: "linear-gradient(155deg, #150F1F 0%, #3C2B52 50%, #7E6099 100%)", emoji: "🕊️", accent: "#D6C6E8" },
  { match: /realismo mágico/i,                         gradient: "linear-gradient(155deg, #1A0D06 0%, #4A2410 46%, #96541F 78%, #C98A3B 100%)", emoji: "🦋", accent: "#F2CC94" },
  { match: /distop/i,                                  gradient: "linear-gradient(155deg, #140B05 0%, #402612 50%, #8C4A17 100%)", emoji: "👁️", accent: "#E8B37E" },
];
const DEFAULT_STYLE = { gradient: "linear-gradient(155deg, #180A08 0%, #3D1510 50%, #7A2E2E 100%)", emoji: "📚", accent: "#E5B8B8" };

export function getGenreStyle(genres = []) {
  for (const g of genres) {
    const hit = GENRE_STYLES.find((s) => s.match.test(g || ""));
    if (hit) return hit;
  }
  return DEFAULT_STYLE;
}

function Shimmer() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(155deg, #E8DFD0 0%, #DDD2BE 100%)",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
        animation: "coverShimmer 1.4s ease-in-out infinite",
      }} />
      <span style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        fontSize: "2.2rem", opacity: 0.22,
      }}>📖</span>
      <style>{`@keyframes coverShimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
    </div>
  );
}

function Fallback({ title, author, genres, compact }) {
  const { gradient, emoji, accent } = getGenreStyle(genres);
  return (
    <div style={{ position: "absolute", inset: 0, background: gradient, overflow: "hidden" }}>
      {/* Detalle geométrico: doble marco editorial */}
      {!compact && (
        <>
          <div style={{
            position: "absolute", inset: 14,
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 6, pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", inset: 20,
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 3, pointerEvents: "none",
          }} />
        </>
      )}

      {/* Emoji grande semi-transparente */}
      <span style={{
        position: "absolute",
        top: compact ? "50%" : "26%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        fontSize: compact ? "1.6rem" : "clamp(4rem, 14vw, 6.5rem)",
        opacity: 0.85,
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.45))",
        lineHeight: 1,
      }}>
        {emoji}
      </span>

      {/* Inicial gigante de fondo */}
      {!compact && (
        <span aria-hidden style={{
          ...serif, position: "absolute", bottom: "8%", right: "6%",
          fontSize: "7rem", fontWeight: 700, fontStyle: "italic",
          color: "rgba(255,255,255,0.07)", lineHeight: 1, userSelect: "none",
        }}>
          {(title || "?").trim()[0]?.toUpperCase()}
        </span>
      )}

      {/* Título + autor */}
      {!compact && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: "44%",
          padding: "0 2rem", textAlign: "center",
        }}>
          <div style={{ width: 36, height: 1, backgroundColor: accent, opacity: 0.7, margin: "0 auto 0.9rem" }} />
          <h3 style={{
            ...serif, fontSize: "clamp(1.05rem, 4vw, 1.45rem)", fontWeight: 700, fontStyle: "italic",
            color: "#FDFAF3", lineHeight: 1.22, margin: 0,
            textShadow: "0 2px 12px rgba(0,0,0,0.45)",
            overflowWrap: "break-word",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {title}
          </h3>
          <p style={{
            ...body, fontSize: "0.95rem", color: "rgba(255,255,255,0.72)",
            margin: "0.55rem 0 0", letterSpacing: "0.04em",
          }}>
            {author}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: "0.9rem" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: accent, opacity: 0.55 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookCoverImage({ coverUrl, title, author, genres = [], compact = false, timeoutMs = 3000 }) {
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
      {status === "failed" && <Fallback title={title} author={author} genres={genres} compact={compact} />}
      {coverUrl && status !== "failed" && (
        <img
          src={coverUrl}
          alt={title}
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

import { useState, useEffect } from "react";
import { palette } from "../theme.js";

// Skeletons de carga (2026-10-10). El brillo (shimmer) y sus colores viven en index.css
// (.sema-skeleton + variables --sema-skel-*), así siguen al modo claro/oscuro y se apagan con
// prefers-reduced-motion.
//
// Anti-parpadeo: SkeletonGroup espera SKELETON_DELAY_MS antes de hacerse visible. Si los datos
// llegan antes, el usuario nunca ve el skeleton. Mientras espera ocupa su lugar (visibility:
// hidden) para que el contenido no salte.

const SKELETON_DELAY_MS = 200;

function useDelayedVisible(delay = SKELETON_DELAY_MS) {
  const [visible, setVisible] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return visible;
}

// Bloque base: una barra o un círculo con brillo.
function Skeleton({ width = "100%", height = 14, radius = 6, circle = false, style }) {
  return (
    <span
      aria-hidden="true"
      className="sema-skeleton"
      style={{ width: circle ? height : width, height, borderRadius: circle ? "50%" : radius, flexShrink: 0, ...style }}
    />
  );
}

// Contenedor de cualquier skeleton: retraso anti-parpadeo + aviso para lectores de pantalla.
function SkeletonGroup({ children, label = "Cargando", delay = SKELETON_DELAY_MS, style }) {
  const visible = useDelayedVisible(delay);
  return (
    <div role="status" aria-busy="true" aria-label={label} style={{ visibility: visible ? "visible" : "hidden", ...style }}>
      {children}
    </div>
  );
}

// Fila tipo tarjeta: avatar redondo, portada de libro o nada + 1-3 líneas de texto.
// lead: "avatar" | "cover" | null
function SkeletonRow({ lead = "avatar", lines = 2, card = true, trailing = false }) {
  const widths = ["55%", "35%", "70%"];
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        ...(card ? { backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 12, padding: "0.75rem" } : { padding: "0.5rem 0" }),
      }}
    >
      {lead === "avatar" && <Skeleton circle height={40} />}
      {lead === "cover" && <Skeleton width={46} height={64} radius={6} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={widths[i % widths.length]} height={i === 0 ? 14 : 11} />
        ))}
      </div>
      {trailing && <Skeleton width={64} height={28} radius={999} />}
    </div>
  );
}

// Lista de filas (amigos, notificaciones, chats, listas, resultados de búsqueda, libros del Trueque).
function SkeletonList({ count = 3, gap = "0.5rem", label, style, ...rowProps }) {
  return (
    <SkeletonGroup label={label} style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: count }, (_, i) => <SkeletonRow key={i} {...rowProps} />)}
    </SkeletonGroup>
  );
}

// Cuadrícula de tarjetas centradas (tarjetas de amigos, tarjetas de estadísticas).
function SkeletonCardGrid({ count = 4, columns = 2, avatar = true, height, label, style }) {
  return (
    <SkeletonGroup label={label} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "0.65rem", ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minHeight: height }}
        >
          {avatar ? <Skeleton circle height={48} /> : <Skeleton width={28} height={28} radius={8} />}
          <Skeleton width="60%" height={avatar ? 13 : 26} />
          <Skeleton width="40%" height={10} />
        </div>
      ))}
    </SkeletonGroup>
  );
}

// Burbujas de chat alternadas (chat de amigos y chat del Trueque).
function SkeletonBubbles({ count = 5, label = "Cargando mensajes" }) {
  const widths = ["58%", "42%", "66%", "36%", "50%", "62%"];
  return (
    <SkeletonGroup label={label} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.5rem 0" }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          width={widths[i % widths.length]}
          height={i % 3 === 0 ? 48 : 36}
          radius={16}
          style={{ alignSelf: i % 2 === 0 ? "flex-start" : "flex-end" }}
        />
      ))}
    </SkeletonGroup>
  );
}

export { Skeleton, SkeletonGroup, SkeletonRow, SkeletonList, SkeletonCardGrid, SkeletonBubbles, SKELETON_DELAY_MS };

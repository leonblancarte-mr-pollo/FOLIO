import { palette, display, body } from "../theme.js";

// Estado vacío reutilizable (2026-10-10): ícono de lucide-react en un círculo, título corto,
// descripción de una línea y botón de acción opcional.
//
//   <EmptyState icon={Library} title="Sin libros en la biblioteca"
//               description="Los libros agregados aparecen aquí."
//               action={{ label: "Agregar libro", icon: Plus, onClick: () => setTab("add") }} />
//
// compact: versión más baja para modales, sheets y secciones dentro de otra pantalla.
// La lista de textos vigentes está en DOCUMENTACION_ARQUITECTURA.md §VII (Estados de interfaz).
function EmptyState({ icon: Icon, title, description, action, compact = false, style }) {
  const ActionIcon = action?.icon;
  const circle = compact ? 48 : 64;
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        padding: compact ? "1.5rem 1rem" : "3rem 1.5rem",
        ...style,
      }}
    >
      {Icon && (
        <div
          aria-hidden="true"
          style={{
            width: circle, height: circle, borderRadius: "50%",
            backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: compact ? "0.75rem" : "1rem", flexShrink: 0,
          }}
        >
          <Icon size={compact ? 20 : 26} color={palette.inkSoft} strokeWidth={1.5} />
        </div>
      )}
      <p style={{ ...display, fontStyle: "italic", fontWeight: 600, fontSize: compact ? "1.02rem" : "1.2rem", color: palette.ink, margin: 0, lineHeight: 1.25 }}>
        {title}
      </p>
      {description && (
        <p style={{ ...body, fontSize: compact ? "0.86rem" : "0.95rem", color: palette.inkSoft, margin: "0.35rem 0 0", maxWidth: 340, lineHeight: 1.45 }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            ...display, fontSize: "0.92rem", fontWeight: 600,
            marginTop: compact ? "0.9rem" : "1.25rem",
            padding: "0.6rem 1.25rem", minHeight: 42, borderRadius: 999,
            border: "none", backgroundColor: palette.accent, color: palette.onAccent,
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
          }}
        >
          {ActionIcon && <ActionIcon size={16} />}
          {action.label}
        </button>
      )}
    </div>
  );
}

export { EmptyState };

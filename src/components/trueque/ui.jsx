import { X } from "lucide-react";
import { palette, body, display } from "../../theme.js";

// Piezas compartidas por los modales del Trueque (mismo patrón visual que ListFormModal).

const CONDITION_LABELS = { como_nuevo: "Como nuevo", usado: "Usado", rayoneado: "Rayoneado" };

function Sheet({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => onClose && e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem calc(2.25rem + env(safe-area-inset-bottom))", width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem", gap: "0.5rem" }}>
          <p style={{ ...display, fontSize: "1.15rem", fontWeight: 700, color: palette.ink, margin: 0 }}>{title}</p>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
              <X size={20} color={palette.inkSoft} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function fieldStyle() {
  return { width: "100%", padding: "0.7rem 0.9rem", borderRadius: 10, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, ...body, fontSize: "0.95rem", outline: "none", boxSizing: "border-box" };
}

function Label({ children }) {
  return <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>{children}</label>;
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", backgroundColor: disabled ? palette.border : palette.accent, color: disabled ? palette.inkFaint : "#fff", cursor: disabled ? "default" : "pointer", ...display, fontSize: "1rem", fontWeight: 600, ...style }}
    >
      {children}
    </button>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p style={{ ...body, fontSize: "0.82rem", color: "#c0392b", margin: 0 }}>{children}</p>;
}

export { CONDITION_LABELS, Sheet, fieldStyle, Label, PrimaryButton, ErrorText };

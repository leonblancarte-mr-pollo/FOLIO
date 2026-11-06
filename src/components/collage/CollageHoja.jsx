// Hoja inferior de Collages (2026-11-06): diálogo modal simple con velo, Escape y foco al abrir.
// Se usa para «Listo», el aviso de tope, cómo se obtiene un set bloqueado y publicar.
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { palette, display, body } from "../../theme.js";

export function CollageHoja({ titulo, onClose, children, etiqueta }) {
  const ref = useRef(null);
  const cerrarRef = useRef(onClose);
  cerrarRef.current = onClose;
  // Solo al montar: si dependiera de onClose (flecha nueva en cada render) el foco brincaría.
  useEffect(() => {
    const previo = document.activeElement;
    const t = setTimeout(() => {
      const auto = ref.current?.querySelector("[data-autofocus]");
      if (auto) auto.focus(); else ref.current?.focus();
    }, 30);
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); cerrarRef.current?.(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      // Trampa de foco: Tab y Shift+Tab dan la vuelta dentro de la hoja.
      const f = [...ref.current.querySelectorAll('button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')];
      if (!f.length) return;
      const [primero, ultimo] = [f[0], f[f.length - 1]];
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === ref.current)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      else if (!ref.current.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey, true); previo?.focus?.(); };
  }, []);
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10050, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "backdropIn 180ms ease-out" }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta || titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="sema-collage-hoja"
        style={{
          width: "100%", maxWidth: 520, maxHeight: "86dvh", overflowY: "auto",
          backgroundColor: palette.bg, color: palette.ink,
          borderRadius: "20px 20px 0 0", borderTop: `2px solid ${palette.ink}`,
          padding: "1rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom))",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "0.75rem" }}>
          <h2 style={{ ...display, fontSize: "18px", fontWeight: 800, lineHeight: 1.25, color: palette.ink, margin: 0 }}>{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 44, height: 44, flexShrink: 0, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginRight: -10 }}>
            <X size={22} color={palette.ink} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Botón de fila para las hojas (silencioso: texto + ícono, 52 px de alto).
export function FilaHoja({ icon: Icon, children, detalle, onClick, disabled, peligro, ...rest }) {
  const color = peligro ? palette.danger : palette.ink;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="sema-row"
      {...rest}
      style={{
        width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 14, textAlign: "left",
        background: "none", border: "none", borderBottom: `1px solid ${palette.borderSoft}`, padding: "0.5rem 0.25rem",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1, color,
      }}
    >
      {Icon && <Icon size={22} strokeWidth={1.9} color={color} aria-hidden />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...body, fontSize: "16px", fontWeight: 650, display: "block" }}>{children}</span>
        {detalle && <span style={{ ...body, fontSize: "14px", color: palette.inkSoft, display: "block", marginTop: 2 }}>{detalle}</span>}
      </span>
    </button>
  );
}

// Botón principal (durazno) y secundario (contorno de tinta) de las hojas.
export function BotonHoja({ children, secundario, style, ...rest }) {
  return (
    <button
      {...rest}
      style={{
        width: "100%", minHeight: 52, borderRadius: 14, cursor: rest.disabled ? "default" : "pointer",
        ...display, fontSize: "16px", fontWeight: 800, letterSpacing: "-0.01em",
        backgroundColor: secundario ? "transparent" : palette.accent,
        color: secundario ? palette.ink : palette.onAccent,
        border: secundario ? `2px solid ${palette.ink}` : "none",
        opacity: rest.disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

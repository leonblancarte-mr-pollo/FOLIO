import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../supabase.js";
import { palette, body, display } from "../theme.js";

// Modal de eliminación de cuenta en dos pasos: confirmación + escribir ELIMINAR.
function DeleteAccountModal({ onClose, onDeleted }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const canDelete = confirmText.trim().toUpperCase() === "ELIMINAR";

  async function handleDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setErr("");
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      console.error("[CUENTA] delete_my_account error:", error);
      setErr("No se pudo eliminar la cuenta. Intenta de nuevo o contacta soporte.");
      setDeleting(false);
      return;
    }
    try { localStorage.clear(); } catch {}
    onDeleted();
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: "rgba(42,31,26,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem" }}
      onClick={(e) => e.target === e.currentTarget && !deleting && onClose()}
    >
      <div style={{ backgroundColor: palette.bg, borderRadius: 18, padding: "1.5rem 1.25rem", width: "100%", maxWidth: 400, border: `1px solid ${palette.border}` }}>
        {step === 1 ? (
          <>
            <p style={{ ...display, fontSize: "1.15rem", fontWeight: 700, color: palette.ink, marginBottom: "0.6rem" }}>¿Eliminar tu cuenta?</p>
            <p style={{ ...body, fontSize: "0.92rem", color: palette.inkSoft, lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Se borrarán <strong>para siempre</strong> tus libros, frases, listas, rachas, mascota, mensajes y todo tu perfil. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button onClick={onClose} style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", backgroundColor: palette.accent, color: "#fff", cursor: "pointer", ...display, fontSize: "0.98rem", fontWeight: 600 }}>
                Conservar mi cuenta
              </button>
              <button onClick={() => setStep(2)} style={{ width: "100%", padding: "0.8rem", borderRadius: 12, border: `1.5px solid #c0392b55`, backgroundColor: "transparent", color: "#c0392b", cursor: "pointer", ...body, fontSize: "0.9rem", fontWeight: 600 }}>
                Sí, quiero eliminarla
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ ...display, fontSize: "1.15rem", fontWeight: 700, color: "#c0392b", marginBottom: "0.6rem" }}>Última confirmación</p>
            <p style={{ ...body, fontSize: "0.92rem", color: palette.inkSoft, lineHeight: 1.5, marginBottom: "1rem" }}>
              Escribe <strong>ELIMINAR</strong> para borrar tu cuenta definitivamente.
            </p>
            <input
              value={confirmText}
              autoFocus
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              style={{ width: "100%", padding: "0.75rem 0.9rem", borderRadius: 10, border: `1.5px solid ${canDelete ? "#c0392b" : palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, ...body, fontSize: "1rem", textAlign: "center", letterSpacing: "0.1em", outline: "none", boxSizing: "border-box", marginBottom: "0.75rem" }}
            />
            {err && <p style={{ ...body, fontSize: "0.82rem", color: "#c0392b", marginBottom: "0.6rem" }}>{err}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", backgroundColor: canDelete ? "#c0392b" : palette.border, color: canDelete ? "#fff" : palette.inkFaint, cursor: canDelete && !deleting ? "pointer" : "default", ...display, fontSize: "0.98rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                {deleting ? "Eliminando…" : "Eliminar mi cuenta"}
              </button>
              <button onClick={onClose} disabled={deleting} style={{ width: "100%", padding: "0.7rem", borderRadius: 12, border: "none", backgroundColor: "transparent", color: palette.inkSoft, cursor: "pointer", ...body, fontSize: "0.88rem" }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { DeleteAccountModal };

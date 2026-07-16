import { useState } from "react";
import { X, Lock } from "lucide-react";
import { palette, body, display } from "../theme.js";

// Modal para crear o editar una lista (nombre, descripción, pública/privada).
function ListFormModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [isPublic, setIsPublic] = useState(initial ? !!initial.is_public : true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setErr("");
    try {
      await onSave({ name: name.trim(), description: description.trim(), isPublic });
    } catch (e) {
      setErr(e.message || "No se pudo guardar la lista.");
      setSaving(false);
    }
  }

  const fieldStyle = { width: "100%", padding: "0.7rem 0.9rem", borderRadius: 10, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, ...body, fontSize: "0.95rem", outline: "none", boxSizing: "border-box" };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem 2.25rem", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
          <p style={{ ...display, fontSize: "1.15rem", fontWeight: 700, color: palette.ink }}>{initial ? "Editar lista" : "Nueva lista"}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <X size={20} color={palette.inkSoft} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>Nombre *</label>
            <input value={name} autoFocus maxLength={100} onChange={(e) => setName(e.target.value)} placeholder='Ej: "Favoritos", "No entendí nada"...' style={fieldStyle} />
          </div>
          <div>
            <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>Descripción (opcional)</label>
            <textarea value={description} maxLength={300} rows={2} onChange={(e) => setDescription(e.target.value)} placeholder="¿De qué va esta lista?" style={{ ...fieldStyle, resize: "none", lineHeight: 1.4 }} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[{ v: true, label: "Pública", desc: "Cualquiera puede verla" }, { v: false, label: "Privada", desc: "Solo tú la ves" }].map(({ v, label, desc }) => (
              <button key={String(v)} onClick={() => setIsPublic(v)} style={{
                flex: 1, padding: "0.6rem 0.5rem", borderRadius: 10, cursor: "pointer", textAlign: "center",
                border: `1.5px solid ${isPublic === v ? palette.accent : palette.border}`,
                backgroundColor: isPublic === v ? `${palette.accent}12` : palette.bgCard,
              }}>
                <p style={{ ...display, fontSize: "0.88rem", fontWeight: 600, color: isPublic === v ? palette.accent : palette.ink, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                  {!v && <Lock size={12} />}{label}
                </p>
                <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, margin: "0.1rem 0 0" }}>{desc}</p>
              </button>
            ))}
          </div>
          {err && <p style={{ ...body, fontSize: "0.82rem", color: "#c0392b", margin: 0 }}>{err}</p>}
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", backgroundColor: name.trim() ? palette.accent : palette.border, color: name.trim() ? "#fff" : palette.inkFaint, cursor: name.trim() && !saving ? "pointer" : "default", ...display, fontSize: "1rem", fontWeight: 600, marginTop: "0.25rem" }}
          >
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear lista"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ListFormModal };

import { useState } from "react";
import { palette, body } from "../../theme.js";
import { Sheet, fieldStyle, Label, PrimaryButton, ErrorText } from "./ui.jsx";

// Agregar un libro que busco.
function WantBookModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [editor, setEditor] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const valid = title.trim() && author.trim();

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setErr("");
    try {
      await onSubmit({ title, author, editor });
    } catch (e) {
      setErr(e.message || "No se pudo guardar el libro.");
      setSaving(false);
    }
  }

  const fs = fieldStyle();
  return (
    <Sheet title="Buscar un libro" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div>
          <Label>Título *</Label>
          <input value={title} autoFocus maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Rayuela" style={fs} />
        </div>
        <div>
          <Label>Autor *</Label>
          <input value={author} maxLength={200} onChange={(e) => setAuthor(e.target.value)} placeholder="Ej: Julio Cortázar" style={fs} />
        </div>
        <div>
          <Label>Editorial (opcional)</Label>
          <input value={editor} maxLength={200} onChange={(e) => setEditor(e.target.value)} style={fs} />
        </div>
        <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, margin: 0 }}>
          Los matches se hacen por título (sin importar mayúsculas, acentos ni puntuación).
        </p>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={save} disabled={!valid || saving}>{saving ? "Guardando…" : "Agregar"}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export { WantBookModal };

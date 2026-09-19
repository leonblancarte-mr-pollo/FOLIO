import { useState, useRef } from "react";
import { ImagePlus } from "lucide-react";
import { palette, body } from "../../theme.js";
import { Sheet, fieldStyle, Label, PrimaryButton, ErrorText, CONDITION_LABELS } from "./ui.jsx";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Publicar un libro que ofrezco (foto opcional al bucket 'trueque').
function OfferBookModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [editor, setEditor] = useState("");
  const [condition, setCondition] = useState("usado");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const valid = title.trim() && author.trim();

  function pickPhoto(file) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) { setErr("La foto debe ser JPG, PNG o WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { setErr("La foto pesa más de 5 MB."); return; }
    setErr("");
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setErr("");
    try {
      await onSubmit({ title, author, editor, condition, photoFile: photo });
    } catch (e) {
      setErr(e.message || "No se pudo publicar el libro.");
      setSaving(false);
    }
  }

  const fs = fieldStyle();
  return (
    <Sheet title="Ofrecer un libro" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div>
          <Label>Título *</Label>
          <input value={title} autoFocus maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Pedro Páramo" style={fs} />
        </div>
        <div>
          <Label>Autor *</Label>
          <input value={author} maxLength={200} onChange={(e) => setAuthor(e.target.value)} placeholder="Ej: Juan Rulfo" style={fs} />
        </div>
        <div>
          <Label>Editorial (opcional)</Label>
          <input value={editor} maxLength={200} onChange={(e) => setEditor(e.target.value)} placeholder="Ej: RM, Cátedra…" style={fs} />
        </div>
        <div>
          <Label>Estado del libro</Label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {Object.entries(CONDITION_LABELS).map(([v, label]) => (
              <button key={v} onClick={() => setCondition(v)} style={{
                flex: 1, padding: "0.55rem 0.3rem", borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${condition === v ? palette.accent : palette.border}`,
                backgroundColor: condition === v ? `${palette.accent}12` : palette.bgCard,
                color: condition === v ? palette.accent : palette.ink, ...body, fontSize: "0.85rem", fontWeight: 600,
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Foto (opcional, máx. 5 MB)</Label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: preview ? 0 : "0.9rem", borderRadius: 10, border: `1.5px dashed ${palette.border}`, backgroundColor: palette.bgCard, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", color: palette.inkSoft, ...body, overflow: "hidden" }}>
            {preview ? <img src={preview} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} /> : <><ImagePlus size={18} /> Agregar foto</>}
          </button>
        </div>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={save} disabled={!valid || saving}>{saving ? "Publicando…" : "Publicar"}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export { OfferBookModal };

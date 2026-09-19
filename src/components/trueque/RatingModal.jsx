import { useState } from "react";
import { Star } from "lucide-react";
import { palette, body } from "../../theme.js";
import { Sheet, fieldStyle, Label, PrimaryButton, ErrorText } from "./ui.jsx";

// Calificación post-intercambio: 1-5 estrellas + reseña opcional.
function RatingModal({ otherName, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!rating || saving) return;
    setSaving(true);
    setErr("");
    try {
      await onSubmit(rating, review.trim());
    } catch (e) {
      setErr(e.message || "No se pudo guardar tu calificación.");
      setSaving(false);
    }
  }

  return (
    <Sheet title="¿Cómo te fue?" onClose={onClose}>
      <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, margin: "0 0 1rem" }}>
        Califica tu intercambio con {otherName || "este lector"}. Ayuda a que la comunidad sea confiable.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginBottom: "1rem" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} estrellas`} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem" }}>
            <Star size={34} color={palette.amber} fill={n <= rating ? palette.amber : "none"} strokeWidth={1.6} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div>
          <Label>Reseña (opcional)</Label>
          <textarea value={review} maxLength={500} rows={3} onChange={(e) => setReview(e.target.value)} placeholder="¿Puntual? ¿El libro estaba como lo describió?" style={{ ...fieldStyle(), resize: "none", lineHeight: 1.4 }} />
        </div>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={save} disabled={!rating || saving}>{saving ? "Guardando…" : "Enviar calificación"}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export { RatingModal };

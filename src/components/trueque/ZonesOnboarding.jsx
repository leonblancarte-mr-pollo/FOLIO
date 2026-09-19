import { useState } from "react";
import { palette, body, display } from "../../theme.js";
import { ZonePicker, MIN_ZONES } from "./ZonesEditor.jsx";
import { Sheet, PrimaryButton, ErrorText } from "./ui.jsx";

// Primera vez en Trueque: elegir 2..máximo zonas. Sin botón de cerrar (es requisito);
// "Ahora no" regresa al Home.
function ZonesOnboarding({ maxZones, isPremium, onSave, onSkip }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (selected.length < MIN_ZONES || saving) return;
    setSaving(true);
    setErr("");
    try {
      await onSave(selected);
    } catch (e) {
      setErr(e.message || "No se pudieron guardar tus zonas.");
      setSaving(false);
    }
  }

  return (
    <Sheet title="🔄 Bienvenido al Trueque">
      <p style={{ ...body, fontSize: "0.98rem", color: palette.inkSoft, margin: "0 0 0.4rem", lineHeight: 1.45 }}>
        Intercambia libros físicos con lectores cerca de ti. Publica lo que ofreces, lo que buscas, y FOLIO te conecta.
      </p>
      <p style={{ ...display, fontSize: "0.95rem", fontWeight: 600, color: palette.ink, margin: "1rem 0 0.7rem" }}>
        ¿En qué zonas de CDMX puedes hacer intercambios?
      </p>
      <ZonePicker selected={selected} onChange={setSelected} maxZones={maxZones} isPremium={isPremium} />
      <div style={{ marginTop: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={save} disabled={selected.length < MIN_ZONES || saving}>
          {saving ? "Guardando…" : "Empezar"}
        </PrimaryButton>
        {onSkip && (
          <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.9rem", color: palette.inkFaint, padding: "0.3rem" }}>
            Ahora no
          </button>
        )}
      </div>
    </Sheet>
  );
}

export { ZonesOnboarding };

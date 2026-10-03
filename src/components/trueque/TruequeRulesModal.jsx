import { useState } from "react";
import { palette, body, display } from "../../theme.js";
import { Sheet, PrimaryButton, ErrorText } from "./ui.jsx";

// "Antes de empezar" (Trueque v2): primera vez en Trueque. Sin aceptar las reglas y
// confirmar +18 no se puede publicar, buscar ni abrir chat (también lo exige el servidor).
// La aceptación se guarda en Postgres con la RPC accept_trueque_rules.
const RULES = [
  "Reúnete en un lugar público y concurrido: café, librería, plaza o estación del metro.",
  "Hazlo de día.",
  "Avísale a alguien de confianza a dónde vas y con quién.",
  "No compartas tu domicilio ni otros datos personales.",
  "Cualquiera puede reportar a otro usuario desde el chat del intercambio.",
];

function TruequeRulesModal({ onAccept, onSkip }) {
  const [adult, setAdult] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function accept() {
    if (!adult || saving) return;
    setSaving(true);
    setErr("");
    try {
      await onAccept();
    } catch (e) {
      setErr(e.message || "No se pudo guardar. Intenta de nuevo.");
      setSaving(false);
    }
  }

  return (
    <Sheet title="🛡️ Antes de empezar">
      <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, margin: "0 0 0.8rem", lineHeight: 1.45 }}>
        El Trueque es para intercambiar libros en persona. Cuídate siguiendo estas reglas:
      </p>
      <ul style={{ ...body, fontSize: "0.92rem", color: palette.ink, lineHeight: 1.5, margin: "0 0 1rem", paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {RULES.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer", padding: "0.75rem", borderRadius: 10, backgroundColor: palette.bgCard, border: `1.5px solid ${adult ? palette.accent : palette.border}`, marginBottom: "0.9rem" }}>
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} style={{ width: 18, height: 18, accentColor: palette.accent }} />
        <span style={{ ...display, fontSize: "0.95rem", fontWeight: 600, color: palette.ink }}>Confirmo que soy mayor de 18 años</span>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={accept} disabled={!adult || saving}>{saving ? "Guardando…" : "Aceptar y continuar"}</PrimaryButton>
        {onSkip && (
          <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.9rem", color: palette.inkFaint, padding: "0.3rem" }}>
            Ahora no
          </button>
        )}
      </div>
    </Sheet>
  );
}

export { TruequeRulesModal };

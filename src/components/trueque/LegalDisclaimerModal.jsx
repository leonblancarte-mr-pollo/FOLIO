import { useState } from "react";
import { palette, body, display } from "../../theme.js";
import { Sheet, PrimaryButton } from "./ui.jsx";

// Texto legal EXACTO requerido antes del primer mensaje de cada match.
// La aceptación se guarda en localStorage (`disclaimer_accepted_${match_id}`) desde truequeService.
function LegalDisclaimerModal({ onAccept, onClose }) {
  const [checked, setChecked] = useState(false);
  const p = { ...body, fontSize: "0.92rem", color: palette.ink, lineHeight: 1.5, margin: 0 };

  return (
    <Sheet title="⚠️ ANTES DE INICIAR EL INTERCAMBIO" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        <p style={p}>
          FOLIO facilita el contacto entre usuarios, pero NO se hace responsable
          de intercambios realizados fuera de la plataforma. Al continuar, aceptas:
        </p>
        <ul style={{ ...p, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <li>Reunirte en lugar público, iluminado y transitado</li>
          <li>Verificar el estado del libro EN PERSONA antes del intercambio</li>
          <li>NO compartir datos personales (celular, dirección, cuentas bancarias) fuera del chat de FOLIO</li>
          <li>Reportar cualquier incidente al equipo FOLIO en soporte@folio.mx</li>
          <li>Calificar honestamente al otro usuario después del intercambio</li>
        </ul>
        <p style={p}>
          Recomendamos encontrarse en cafeterías o librerías conocidas. Próximamente
          tendremos "Embajadas FOLIO" (lugares aliados verificados).
        </p>
        <p style={{ ...p, ...display, fontWeight: 600 }}>
          FOLIO no arbitra disputas offline ni cubre pérdidas de libros.
        </p>
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer", padding: "0.7rem", borderRadius: 10, backgroundColor: palette.bgCard, border: `1.5px solid ${checked ? palette.accent : palette.border}` }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ width: 18, height: 18, accentColor: palette.accent }} />
          <span style={{ ...body, fontSize: "0.92rem", color: palette.ink }}>Confirmo que he leído y acepto</span>
        </label>
        <PrimaryButton onClick={onAccept} disabled={!checked}>Continuar al chat</PrimaryButton>
      </div>
    </Sheet>
  );
}

export { LegalDisclaimerModal };

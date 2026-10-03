import { useState } from "react";
import { MapPin } from "lucide-react";
import { palette, body } from "../../theme.js";
import { ESTADOS } from "../../data/estados.js";
import { Sheet, PrimaryButton, Label, fieldStyle } from "./ui.jsx";

// "Completa tu ubicación aproximada". Obligatorio para publicar, buscar y abrir el mapa;
// no bloquea el resto de la app ("Ahora no" vuelve al Home).
// Desde v3 (sin zonas de CDMX) todos los estados siguen el mismo camino: se abre el mapa
// para marcar al menos 1 lugar y el estado se guarda junto con los pines.
// Este componente NO importa Leaflet (el mapa se descarga solo al abrir "Mis lugares").
function LocationStep({ onPickState, onSkip }) {
  const [state, setState] = useState("");

  return (
    <Sheet title="📍 Completa tu ubicación aproximada">
      <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, margin: "0 0 1rem", lineHeight: 1.45 }}>
        Lo usamos para centrar el mapa y encontrar lectores cerca de ti. Nadie más ve tu ubicación.
      </p>
      <Label>Estado</Label>
      <select
        value={state}
        onChange={(e) => setState(e.target.value)}
        aria-label="Estado donde haces intercambios"
        style={{ ...fieldStyle(), appearance: "auto" }}
      >
        <option value="">Elige tu estado…</option>
        {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
      </select>
      {state && (
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft, margin: "0.7rem 0 0", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
          <MapPin size={15} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          En el siguiente paso marca en el mapa al menos un lugar público por donde te mueves.
        </p>
      )}
      <div style={{ marginTop: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <PrimaryButton onClick={() => state && onPickState(state)} disabled={!state}>Continuar al mapa</PrimaryButton>
        {onSkip && (
          <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.9rem", color: palette.inkFaint, padding: "0.3rem" }}>
            Ahora no
          </button>
        )}
      </div>
    </Sheet>
  );
}

export { LocationStep };

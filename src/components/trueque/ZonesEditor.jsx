import { useState } from "react";
import { MapPin } from "lucide-react";
import { palette, body } from "../../theme.js";
import { ZONES_CDMX } from "../../config/zones.js";
import { Sheet, PrimaryButton, ErrorText } from "./ui.jsx";

const MIN_ZONES = 2;

// Selector de zonas (chips). Lo reusan ZonesOnboarding y ZonesEditor.
function ZonePicker({ selected, onChange, maxZones, isPremium }) {
  const atMax = selected.length >= maxZones;
  function toggle(slug) {
    if (selected.includes(slug)) onChange(selected.filter((z) => z !== slug));
    else if (!atMax) onChange([...selected, slug]);
  }
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {ZONES_CDMX.map((z) => {
          const on = selected.includes(z.slug);
          const disabled = !on && atMax;
          return (
            <button
              key={z.slug}
              onClick={() => toggle(z.slug)}
              disabled={disabled}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: 999, cursor: disabled ? "default" : "pointer",
                border: `1.5px solid ${on ? palette.accent : palette.border}`,
                backgroundColor: on ? palette.accent : palette.bgCard,
                color: on ? "#fff" : disabled ? palette.inkFaint : palette.ink,
                ...body, fontSize: "0.85rem", opacity: disabled ? 0.55 : 1,
              }}
            >
              {z.label}
            </button>
          );
        })}
      </div>
      <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, margin: "0.7rem 0 0" }}>
        {selected.length}/{maxZones} zonas · mínimo {MIN_ZONES}
        {!isPremium && maxZones < 5 && " · Folio Plus permite hasta 5"}
      </p>
    </div>
  );
}

// Editar zonas después del onboarding.
function ZonesEditor({ initial, maxZones, isPremium, onSave, onClose }) {
  const [selected, setSelected] = useState(initial.slice(0, maxZones));
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
    <Sheet title="Tus zonas de intercambio" onClose={onClose}>
      <p style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft, margin: "0 0 1rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <MapPin size={15} color={palette.accent} /> Solo verás matches con quien comparta al menos una zona.
      </p>
      <ZonePicker selected={selected} onChange={setSelected} maxZones={maxZones} isPremium={isPremium} />
      <div style={{ marginTop: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={save} disabled={selected.length < MIN_ZONES || saving}>
          {saving ? "Guardando…" : "Guardar zonas"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

export { ZonePicker, ZonesEditor, MIN_ZONES };

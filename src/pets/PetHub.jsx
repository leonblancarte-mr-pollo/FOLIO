import { useState, useEffect } from "react";
import { User, X, Pencil } from "lucide-react";
import { palette, PALETTE_DARK, SEMA_GRADIENTS, body, display, FONT_LINK } from "../theme.js";
import { petXpForLevel, PET_MAX_LEVEL } from "../services/petService.js";
import { PetDisplay } from "./PetDisplay.jsx";
import { Boleto, SelloTinta } from "../components/Detalles.jsx";

// Panel de la mascota (ronda 5, 2026-11-03). Rediseño con la identidad nueva:
//  · Base blanca en claro y negro puro en oscuro (palette.bg). Fuera cielo, sol, nubes, pasto, vidrio,
//    emojis y sombras de texto.
//  · El gato, grande y centrado, apoyado en un recorte de papel lila (sticker) con borde de tinta y una
//    sombra suave en el piso. En oscuro usa /pets/cat-recorte.png (canto blanco horneado, el de Inicio).
//  · Nombre en Unbounded; «Nivel N» es un Boleto del kit; barra de XP con degradado de acento y borde de tinta.
//  · Tienda, Mis objetos y Ver galería: tarjetas de papel (mismo lenguaje que los boletos), sin íconos,
//    con sello «MUY PRONTO» mientras no funcionen. Su comportamiento no cambia (aviso corto).
// ESTRUCTURA LISTA PARA ANIMAR (la animación es otra ronda): .sema-pet-escena › .sema-pet-sticker,
// .sema-pet-gato (envuelve al PetDisplay, que ya tiene bob y respiración) y .sema-pet-piso (sombra).
// Cada capa es un elemento propio con su transform-origin, para animarlas por separado.
function PetHub({ pet, onClose, onGoToProfile, onRename }) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(pet?.pet_name || "Mi compañero");
  const [savingName, setSavingName] = useState(false);
  const [flash, setFlash] = useState(null);

  useEffect(() => { setNameDraft(pet?.pet_name || "Mi compañero"); }, [pet?.pet_name]);

  if (!pet) return null;
  const isDark = palette.bg === PALETTE_DARK.bg;
  const isCat = !pet.pet_type || pet.pet_type === "gato";

  const max = petXpForLevel(pet.level);
  const atMax = pet.level >= PET_MAX_LEVEL;
  const pct = atMax ? 100 : Math.min(100, Math.round((pet.xp / max) * 100));

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    const saved = await onRename(nameDraft);
    setSavingName(false);
    if (saved) { setEditing(false); setFlash("Nombre actualizado"); setTimeout(() => setFlash(null), 2200); }
  }

  function showFlash(msg) { setFlash(msg); setTimeout(() => setFlash(null), 2400); }

  // Pastilla limpia: fondo de la app, borde de tinta de 2 px, sin vidrio ni sombra.
  const pill = {
    minHeight: 44, minWidth: 44, borderRadius: 999, cursor: "pointer",
    backgroundColor: palette.bg, color: palette.ink, border: `2px solid ${palette.ink}`,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
  };

  const cartas = [
    { id: "tienda", titulo: "Tienda", aviso: "Tienda: muy pronto." },
    { id: "objetos", titulo: "Mis objetos", aviso: "Mis objetos: muy pronto." },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={`Panel de ${pet.pet_name || "tu mascota"}`} className="sema-pet-hub" style={{ position: "fixed", inset: 0, zIndex: 5500, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: palette.bg, animation: "fadeIn 220ms ease-out" }}>
      <style>{FONT_LINK}</style>

      {/* Barra superior */}
      <div style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top) + 0.85rem) 1rem 0.5rem" }}>
        <button onClick={onGoToProfile} className="btn-press sema-focus-ink" style={{ ...pill, padding: "0 1rem", ...body, fontWeight: 700, fontSize: "14px" }}>
          <User size={16} aria-hidden /> Mi perfil
        </button>
        <button onClick={onClose} aria-label="Cerrar" className="btn-press sema-focus-ink" style={pill}>
          <X size={22} aria-hidden />
        </button>
      </div>

      {/* Contenido central */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0.25rem 1.25rem", boxSizing: "border-box", overflowY: "auto" }}>
        {/* Escena: sticker lila + gato + sombra en el piso */}
        <div className="sema-pet-escena" style={{ "--pet-sticker": palette.firma, "--pet-ink": palette.ink, "--pet-piso": palette.ink }}>
          <div aria-hidden className="sema-pet-sticker sema-papel" />
          <div className="sema-pet-gato">
            <PetDisplay petType={pet.pet_type} petName={pet.pet_name} px={isDark && isCat ? 356 : 330} wPx={isDark && isCat ? 246 : 220} src={isDark && isCat ? "/pets/cat-recorte.png" : undefined} showShadow={false} />
          </div>
          <div aria-hidden className="sema-pet-piso" />
        </div>

        {/* Nombre editable */}
        <div style={{ marginTop: "1.25rem", minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          {editing ? (
            <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", maxWidth: 340, width: "100%" }}>
              <input
                value={nameDraft} autoFocus maxLength={40} aria-label="Nombre de la mascota"
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                style={{ flex: 1, minHeight: 44, padding: "0.5rem 0.85rem", borderRadius: 12, border: `2px solid ${palette.ink}`, backgroundColor: palette.bg, color: palette.ink, ...display, fontWeight: 700, fontSize: "18px", textAlign: "center", outline: "none", minWidth: 0 }}
              />
              <button onClick={saveName} disabled={savingName} className="btn-press sema-focus-ink" style={{ ...pill, flexShrink: 0, padding: "0 1rem", backgroundColor: palette.accent, color: palette.onAccent, ...display, fontWeight: 700, fontSize: "15px" }}>
                {savingName ? "…" : "OK"}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} aria-label={`Cambiar nombre: ${pet.pet_name || "Mi compañero"}`} className="sema-focus-ink" style={{ background: "none", border: "none", padding: "0.2rem 0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.55rem", minHeight: 44 }}>
              <span style={{ ...display, fontWeight: 800, fontSize: "28px", color: palette.ink, lineHeight: 1.05, letterSpacing: "-0.01em", overflowWrap: "anywhere" }}>{pet.pet_name || "Mi compañero"}</span>
              <Pencil size={18} color={palette.ink} aria-hidden />
            </button>
          )}
        </div>

        <div role="status" aria-live="polite" style={{ minHeight: 20, marginTop: "0.2rem" }}>
          {flash && <span style={{ ...body, fontSize: "14px", fontWeight: 600, color: palette.ink }}>{flash}</span>}
        </div>

        <div style={{ marginTop: "0.3rem" }}>
          <Boleto color="firma" perforado="lados" angulo={-2} size="md">Nivel {pet.level}</Boleto>
        </div>

        {/* Barra XP: pista con borde de tinta (el durazno no llega a 3:1 sobre blanco por sí solo) */}
        <div style={{ width: "100%", maxWidth: 360, marginTop: "1.1rem" }}>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Experiencia de la mascota" style={{ height: 18, borderRadius: 999, backgroundColor: palette.bg, border: `2px solid ${palette.ink}`, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(pct, 4)}%`, height: "100%", background: pct >= 100 ? palette.sage : SEMA_GRADIENTS.acento, borderRight: pct < 100 ? `2px solid ${palette.ink}` : "none", boxSizing: "border-box", animation: "petXpFill 600ms cubic-bezier(0.23,1,0.32,1)", transition: "width 500ms cubic-bezier(0.23,1,0.32,1)" }} />
          </div>
          <p style={{ ...body, fontSize: "14px", color: palette.ink, marginTop: "0.5rem", textAlign: "center", fontWeight: 600 }}>
            {atMax ? `Nivel máximo ${PET_MAX_LEVEL}` : `${pet.xp} / ${max} XP hasta nivel ${pet.level + 1}`}
          </p>
        </div>

        {/* Tienda + Mis objetos + Ver galería: tarjetas de papel, sin íconos, con sello «Muy pronto» (una pieza girada por tarjeta) */}
        <div style={{ width: "100%", maxWidth: 360, marginTop: "1.4rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
          {cartas.map((c) => (
            <button key={c.id} onClick={() => showFlash(c.aviso)} className="btn-press sema-pet-carta sema-papel sema-focus-ink">
              <span style={{ ...display, fontWeight: 800, fontSize: "16px", color: palette.ink, lineHeight: 1.15 }}>{c.titulo}</span>
              {c.id === cartas[0].id
                ? <SelloTinta size="sm" sobre="superficie" angulo={-6} className="sema-pet-carta__sello">Muy pronto</SelloTinta>
                : <span style={{ ...body, fontSize: "13px", fontWeight: 600, color: palette.inkSoft }}>Muy pronto</span>}
            </button>
          ))}
          <button onClick={() => showFlash("Galería: muy pronto.")} className="btn-press sema-pet-carta sema-pet-carta--ancha sema-papel sema-focus-ink">
            <span style={{ ...display, fontWeight: 800, fontSize: "16px", color: palette.ink, lineHeight: 1.15 }}>Ver galería</span>
            <span style={{ ...body, fontSize: "13px", fontWeight: 600, color: palette.inkSoft }}>Muy pronto</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export { PetHub };

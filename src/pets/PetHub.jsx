import { useState, useEffect } from "react";
import { User, X, Pencil } from "lucide-react";
import { palette, PALETTE_DARK, body, display, FONT_LINK } from "../theme.js";
import { petXpForLevel, PET_MAX_LEVEL } from "../services/petService.js";
import { PetScene } from "./PetScene.jsx";
import { PetDisplay } from "./PetDisplay.jsx";

// Pet Hub — pantalla completa tipo Tamagotchi
function PetHub({ user, pet, streak, onClose, onGoToProfile, onRename }) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(pet?.pet_name || "Mi compañero");
  const [savingName, setSavingName] = useState(false);
  const [flash, setFlash] = useState(null);

  useEffect(() => { setNameDraft(pet?.pet_name || "Mi compañero"); }, [pet?.pet_name]);

  if (!pet) return null;
  const isDark = palette.bg === PALETTE_DARK.bg;
  const onSceneText = "#FFFFFF";
  const textShadow = "0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)";

  const max = petXpForLevel(pet.level);
  const atMax = pet.level >= PET_MAX_LEVEL;
  const pct = atMax ? 100 : Math.min(100, Math.round((pet.xp / max) * 100));

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    const saved = await onRename(nameDraft);
    setSavingName(false);
    if (saved) { setEditing(false); setFlash("✓ Nombre actualizado"); setTimeout(() => setFlash(null), 2200); }
  }

  function showFlash(msg) { setFlash(msg); setTimeout(() => setFlash(null), 2400); }

  const topBtn = {
    width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer",
    backgroundColor: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5500, display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeIn 220ms ease-out" }}>
      <style>{FONT_LINK}</style>
      <PetScene isDark={isDark} />

      {/* Barra superior */}
      <div style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top) + 0.85rem) 1rem 0.5rem" }}>
        <button onClick={onGoToProfile} className="btn-press" style={{ ...topBtn, width: "auto", borderRadius: 999, padding: "0 0.95rem", gap: "0.4rem", fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "0.85rem" }}>
          <User size={16} /> Mi perfil
        </button>
        <button onClick={onClose} aria-label="Cerrar" className="btn-press" style={topBtn}>
          <X size={22} />
        </button>
      </div>

      {/* Contenido central */}
      <div style={{ position: "relative", zIndex: 3, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0.5rem 1.5rem", boxSizing: "border-box", overflowY: "auto" }}>
        <PetDisplay petType={pet.pet_type} petName={pet.pet_name} px={300} shadowColor="rgba(20,40,20,0.4)" />

        {/* Nombre editable */}
        <div style={{ marginTop: "1.5rem", minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          {editing ? (
            <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", maxWidth: 340, width: "100%" }}>
              <input
                value={nameDraft} autoFocus maxLength={40}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                style={{ flex: 1, padding: "0.65rem 0.85rem", borderRadius: 12, border: "none", backgroundColor: "rgba(255,255,255,0.94)", color: "#2A1F1A", fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.2rem", textAlign: "center", outline: "none", minWidth: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}
              />
              <button onClick={saveName} disabled={savingName} className="btn-press" style={{ flexShrink: 0, padding: "0.65rem 0.95rem", borderRadius: 12, border: "none", background: "#7A2E2E", color: "#fff", cursor: "pointer", ...display, fontWeight: 700, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
                {savingName ? "…" : "OK"}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", padding: "0.2rem 0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span style={{ fontFamily: "Fraunces, serif", fontWeight: 800, fontSize: "2.1rem", color: onSceneText, textShadow, lineHeight: 1.05 }}>{pet.pet_name || "Mi compañero"}</span>
              <Pencil size={19} color={onSceneText} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))", opacity: 0.9 }} />
            </button>
          )}
        </div>

        {flash && <span style={{ marginTop: "0.3rem", ...body, fontSize: "0.85rem", color: onSceneText, textShadow }}>{flash}</span>}

        <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.25rem", color: onSceneText, textShadow, marginTop: "0.45rem" }}>Nivel {pet.level}</p>

        {/* Barra XP grande */}
        <div style={{ width: "100%", maxWidth: 360, marginTop: "1.35rem" }}>
          <div style={{ height: 18, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.25)" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #C8924A 0%, #F4C77A 100%)", animation: "petXpFill 600ms cubic-bezier(0.23,1,0.32,1)", transition: "width 500ms cubic-bezier(0.23,1,0.32,1)", boxShadow: "0 0 12px rgba(244,199,122,0.8)" }} />
          </div>
          <p style={{ ...body, fontSize: "0.88rem", color: onSceneText, textShadow, marginTop: "0.55rem", textAlign: "center", fontWeight: 600 }}>
            {atMax ? `¡Nivel máximo ${PET_MAX_LEVEL}!` : `${pet.xp} / ${max} XP hasta nivel ${pet.level + 1}`}
          </p>
        </div>

        {/* Features de la mascota: Tienda + Mis objetos (próximamente) */}
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.6rem", width: "100%", maxWidth: 360 }}>
          <button onClick={() => showFlash("🛍️ Tienda: ¡muy pronto!")} className="btn-press" style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "0.9rem 0.4rem", textAlign: "center", cursor: "pointer" }}>
            <p style={{ fontSize: "1.4rem", lineHeight: 1 }}>🛍️</p>
            <p style={{ ...display, fontSize: "0.8rem", fontWeight: 700, color: onSceneText, textShadow, marginTop: "0.3rem" }}>Tienda</p>
          </button>
          <button onClick={() => showFlash("🎁 Mis objetos: ¡muy pronto!")} className="btn-press" style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "0.9rem 0.4rem", textAlign: "center", cursor: "pointer" }}>
            <p style={{ fontSize: "1.4rem", lineHeight: 1 }}>🎁</p>
            <p style={{ ...display, fontSize: "0.8rem", fontWeight: 700, color: onSceneText, textShadow, marginTop: "0.3rem" }}>Mis objetos</p>
          </button>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.5rem", width: "100%", maxWidth: 360, paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <button onClick={onGoToProfile} className="btn-press" style={{ flex: 1, padding: "0.85rem", borderRadius: 13, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", color: "#7A2E2E", fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "0.95rem", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
            Mi perfil
          </button>
          <button onClick={() => showFlash("🖼️ Galería: ¡muy pronto!")} className="btn-press" style={{ flex: 1, padding: "0.85rem", borderRadius: 13, border: "1.5px solid rgba(255,255,255,0.6)", cursor: "pointer", background: "rgba(255,255,255,0.12)", color: "#fff", fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "0.95rem", textShadow }}>
            Ver galería
          </button>
        </div>
      </div>
    </div>
  );
}

export { PetHub };

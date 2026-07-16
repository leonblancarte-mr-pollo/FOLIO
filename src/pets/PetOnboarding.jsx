import { useState } from "react";
import { Loader2 } from "lucide-react";
import { palette, body, display, FONT_LINK } from "../theme.js";
import { PET_TYPES, createPet } from "../services/petService.js";
import { PetDisplay } from "./PetDisplay.jsx";

function PetOnboarding({ user, onComplete }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("Mi compañero");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const info = PET_TYPES.gato;

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setErrMsg("");
    const finalName = name.trim() || "Mi compañero";
    const pet = await createPet(user.id, { petType: "gato", petName: finalName });
    setSaving(false);
    if (pet && pet.__error) {
      const code = pet.__error.code;
      setErrMsg(
        code === "42501" ? "No se pudo guardar: RLS está bloqueando. Desactiva RLS de user_pets en Supabase."
        : code === "23503" ? "No se pudo guardar: el usuario no existe en la base de datos."
        : `No se pudo guardar tu mascota (${code || "error"}). Intenta de nuevo.`
      );
      return;
    }
    // pet válido (verificado) o __unverified (insert ok pero RLS bloquea relectura) o fallback
    onComplete(pet && !pet.__error ? pet : { user_id: user.id, pet_type: "gato", pet_name: finalName, xp: 0, level: 1 });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 6000, backgroundColor: palette.bg,
      backgroundImage: "radial-gradient(at 15% 0%, rgba(122,46,46,0.06) 0px, transparent 45%), radial-gradient(at 85% 100%, rgba(200,146,74,0.08) 0px, transparent 45%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem 1.25rem calc(2rem + env(safe-area-inset-bottom))",
      paddingTop: "calc(2rem + env(safe-area-inset-top))", overflowY: "auto",
    }}>
      <style>{FONT_LINK}</style>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", animation: "obFadeUp 500ms cubic-bezier(0.23,1,0.32,1) both" }}>
        <h1 style={{ fontFamily: "Fraunces, serif", fontWeight: 800, fontSize: "1.75rem", color: palette.ink, lineHeight: 1.15, marginBottom: "0.5rem" }}>
          Escoge a tu compañero de lectura
        </h1>
        <p style={{ ...body, fontSize: "0.95rem", color: palette.inkFaint, marginBottom: "1.75rem" }}>
          Te acompañará en cada página que leas
        </p>

        <div style={{
          backgroundColor: palette.bgCard, border: `1.5px solid ${palette.accent}55`,
          borderRadius: 20, padding: "1.75rem 1.25rem 1.5rem", boxShadow: "0 10px 36px rgba(122,46,46,0.14)",
        }}>
          <PetDisplay petType="gato" petName={info.title} size="large" />
          <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.35rem", color: palette.ink, marginTop: "1rem", lineHeight: 1.1 }}>
            {info.title}
          </p>
          <p style={{ ...body, fontStyle: "italic", fontSize: "0.88rem", color: palette.inkFaint, marginTop: "0.4rem" }}>
            "{info.quote}"
          </p>
        </div>

        {!naming ? (
          <button
            onClick={() => setNaming(true)}
            className="btn-press"
            style={{
              marginTop: "1.75rem", width: "100%", padding: "1rem", borderRadius: 14, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)", color: "#fff",
              fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.05rem", boxShadow: "0 6px 20px rgba(122,46,46,0.3)",
            }}
          >
            ¡Este es mi compañero!
          </button>
        ) : (
          <div style={{ marginTop: "1.75rem", animation: "obFadeUp 320ms ease both" }}>
            <label style={{ ...display, fontSize: "0.9rem", fontWeight: 600, color: palette.ink, display: "block", marginBottom: "0.6rem" }}>
              ¿Cómo se llama tu compañero?
            </label>
            <input
              type="text"
              value={name}
              autoFocus
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
              placeholder="Mi compañero"
              style={{
                width: "100%", padding: "0.85rem 1rem", borderRadius: 12, border: `1.5px solid ${palette.border}`,
                backgroundColor: palette.bg, color: palette.ink, ...body, fontSize: "1rem", textAlign: "center", outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              onClick={confirm}
              disabled={saving}
              className="btn-press"
              style={{
                marginTop: "1rem", width: "100%", padding: "1rem", borderRadius: 14, border: "none", cursor: saving ? "default" : "pointer",
                background: "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)", color: "#fff",
                fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.05rem", boxShadow: "0 6px 20px rgba(122,46,46,0.3)",
                opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              {saving ? "Guardando…" : "Confirmar"}
            </button>
            {errMsg && (
              <p style={{ ...body, fontSize: "0.82rem", color: "#C0392B", marginTop: "0.75rem", textAlign: "center", lineHeight: 1.35 }}>{errMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { PetOnboarding };

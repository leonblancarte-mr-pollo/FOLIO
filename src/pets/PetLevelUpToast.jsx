import { useState, useEffect } from "react";
import { petImageSrc } from "../services/petService.js";

function PetLevelUpToast({ petName, level, petType, id, onDismiss }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setClosing(true); setTimeout(onDismiss, 240); }, 3600);
    return () => clearTimeout(t);
  }, [id]);
  return (
    <div style={{
      position: "fixed", bottom: 104, left: "50%", zIndex: 4100, pointerEvents: "none",
      animation: closing ? "petToastOut 240ms ease-in forwards" : "petToastIn 380ms cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 1.2rem 0.6rem 0.7rem",
        background: "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)", borderRadius: 999,
        boxShadow: "0 8px 28px rgba(122,46,46,0.5), 0 2px 6px rgba(0,0,0,0.2)", whiteSpace: "nowrap",
      }}>
        <img src={petImageSrc(petType)} alt="" style={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0 }} />
        <span style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.02rem", color: "#fff", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
          ¡{petName || "Tu compañero"} subió a nivel {level}! 🎉
        </span>
      </div>
    </div>
  );
}

export { PetLevelUpToast };

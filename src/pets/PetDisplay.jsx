import { petImageSrc } from "../services/petService.js";

const PET_SIZE_PX = { small: 32, medium: 150, large: 200, hero: 270 };
function PetDisplay({ petType = "gato", petName, size = "medium", px: pxOverride, levelUp = false, showShadow = true, shadowColor = "rgba(42,31,26,1)", style = {} }) {
  const px = pxOverride || PET_SIZE_PX[size] || 150;
  const fullAnim = size !== "small";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", ...style }}>
      {/* El wrapper hace el bob; la imagen hace la respiración (escala sutil) */}
      <div className={`pet-sprite-wrap${levelUp ? " pet-level-up" : ""}`} style={{ position: "relative", width: px, height: px, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <img
          src={petImageSrc(petType)}
          alt={petName || "Mascota"}
          draggable={false}
          className={fullAnim ? "pet-sprite-img" : ""}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none", WebkitUserDrag: "none" }}
        />
      </div>
      {showShadow && fullAnim && (
        <div className="pet-shadow" style={{ width: px * 0.42, height: Math.max(6, px * 0.06), borderRadius: "50%", background: shadowColor, marginTop: -Math.round(px * 0.02) }} />
      )}
    </div>
  );
}

export { PET_SIZE_PX, PetDisplay };

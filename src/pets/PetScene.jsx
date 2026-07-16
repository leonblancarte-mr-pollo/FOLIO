// Escena decorativa SVG detrás de la mascota (cielo, sol, nubes, árbol, pasto)
function PetScene({ isDark }) {
  const sky = isDark
    ? "linear-gradient(180deg, #131F38 0%, #1E3050 42%, #21402F 75%, #1B3326 100%)"
    : "linear-gradient(180deg, #7EC8F0 0%, #A9DEF6 38%, #D7F0E0 70%, #A6E0A0 100%)";
  const sun = isDark ? "#F4D77A" : "#FFE08A";
  const sunGlow = isDark ? "rgba(244,215,122,0.30)" : "rgba(255,224,138,0.65)";
  const cloud = isDark ? "rgba(220,230,245,0.18)" : "rgba(255,255,255,0.92)";
  const grassBack = isDark ? "#234A35" : "#8FD982";
  const grassFront = isDark ? "#1C3B2A" : "#6BBF5B";
  const trunk = isDark ? "#5A4030" : "#8A5A3B";
  const leaf = isDark ? "#2E5A3E" : "#4FA35A";
  const leaf2 = isDark ? "#356646" : "#62B86C";

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, background: sky, overflow: "hidden" }}>
      {/* Sol */}
      <div className="pet-sun" style={{ position: "absolute", top: "8%", right: "12%", width: 64, height: 64, borderRadius: "50%", background: sun, boxShadow: `0 0 50px 24px ${sunGlow}` }} />
      {/* Nubes */}
      <svg className="pet-cloud" style={{ position: "absolute", top: "14%", left: "8%" }} width="110" height="44" viewBox="0 0 110 44" fill="none">
        <ellipse cx="34" cy="28" rx="34" ry="16" fill={cloud} />
        <ellipse cx="64" cy="22" rx="26" ry="20" fill={cloud} />
        <ellipse cx="86" cy="30" rx="22" ry="13" fill={cloud} />
      </svg>
      <svg className="pet-cloud-2" style={{ position: "absolute", top: "30%", right: "6%" }} width="84" height="34" viewBox="0 0 110 44" fill="none">
        <ellipse cx="34" cy="28" rx="34" ry="16" fill={cloud} />
        <ellipse cx="64" cy="22" rx="26" ry="20" fill={cloud} />
        <ellipse cx="86" cy="30" rx="22" ry="13" fill={cloud} />
      </svg>
      {/* Pasto (colinas) */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%" }} height="160" viewBox="0 0 400 160" preserveAspectRatio="none" fill="none">
        <path d="M0 70 Q 100 30 200 60 T 400 55 L400 160 L0 160 Z" fill={grassBack} />
        <path d="M0 110 Q 120 75 230 100 T 400 95 L400 160 L0 160 Z" fill={grassFront} />
      </svg>
      {/* Árbol */}
      <svg className="pet-tree" style={{ position: "absolute", bottom: "13%", left: "9%" }} width="74" height="96" viewBox="0 0 74 96" fill="none">
        <rect x="32" y="52" width="10" height="40" rx="4" fill={trunk} />
        <circle cx="37" cy="34" r="26" fill={leaf} />
        <circle cx="20" cy="44" r="17" fill={leaf2} />
        <circle cx="54" cy="44" r="17" fill={leaf2} />
      </svg>
    </div>
  );
}

export { PetScene };

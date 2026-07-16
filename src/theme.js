// ============ STYLES ============
const FONT_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap');
`;

const PALETTE_LIGHT = {
  bg: "#F4EDE0", bgSoft: "#EBE3D2", bgCard: "#FBF6EB",
  ink: "#2A1F1A", inkSoft: "#5C4A3F", inkFaint: "#8B7B6E",
  accent: "#7A2E2E", accentSoft: "#A4493D",
  amber: "#C8924A", amberRich: "#E07B1A",
  mauve: "#A26B7A", slate: "#1B3A4B", sage: "#5C6B3D",
  border: "#D4C9B5", borderSoft: "#DDD5C5",
};
const PALETTE_DARK = {
  bg: "#1a1614", bgSoft: "#211d1a", bgCard: "#2a2420",
  ink: "#F5EDE0", inkSoft: "#B8A99A", inkFaint: "#7A6B60",
  accent: "#C84F4F", accentSoft: "#D06060",
  amber: "#D4A574", amberRich: "#E08B30",
  mauve: "#B87B8A", slate: "#4A7A9B", sage: "#7A9B5C",
  border: "#3D3530", borderSoft: "#332E2A",
};
let palette = { ...PALETTE_LIGHT };

const AVATAR_COLORS = [
  "#6B4C3B", "#5C6B3D", "#8B5E3C", "#4A6670",
  "#7B5B8D", "#C8842B", "#6B1E2A", "#3D6B5C",
];
function getAvatarColor(id) {
  const str = String(id || "");
  let hash = 0;
  for (let i = 0; i < Math.min(4, str.length); i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[hash % 8];
}

const display = { fontFamily: "Fraunces, serif" };
const body = { fontFamily: "'EB Garamond', serif" };

const ts = {
  h1: { fontFamily: "Fraunces, serif", fontSize: "28px", fontWeight: 700, fontStyle: "italic", lineHeight: 1.15 },
  h2: { fontFamily: "Fraunces, serif", fontSize: "20px", fontWeight: 600, lineHeight: 1.25 },
  h3: { fontFamily: "'EB Garamond', serif", fontSize: "17px", fontWeight: 600, lineHeight: 1.3 },
  body15: { fontFamily: "'EB Garamond', serif", fontSize: "15px", fontWeight: 400, lineHeight: 1.55 },
  caption: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 400, color: "#8A7B6E" },
  label: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 500, color: "#8A7B6E" },
};

function genrePillStyle(genre, isOpen) {
  const g = (genre || "").toLowerCase();
  let bg, color, border;
  if (/fant|magia|drag|mito/.test(g))           { bg = isOpen ? "#3B1F5E" : "#EDE5F5"; color = isOpen ? "#EDE5F5" : "#3B1F5E"; border = "#C4A8E0"; }
  else if (/ciencia|sci.fi|distop|futur/.test(g)) { bg = isOpen ? "#1B3A4B" : "#E5EFF5"; color = isOpen ? "#E5EFF5" : "#1B3A4B"; border = "#A8C4D4"; }
  else if (/terror|horror|misterio|thriller/.test(g)) { bg = isOpen ? "#2A1F1A" : "#F0ECEA"; color = isOpen ? "#F4EDE0" : "#2A1F1A"; border = "#C4B8B0"; }
  else if (/roman|amor|histor.*amor/.test(g))   { bg = isOpen ? "#7A2E2E" : "#F5EAEA"; color = isOpen ? "#F4EDE0" : "#7A2E2E"; border = "#E0BCBC"; }
  else if (/histor|biograf|memoir/.test(g))      { bg = isOpen ? "#5C4A3F" : "#F0EBE5"; color = isOpen ? "#F4EDE0" : "#5C4A3F"; border = "#C8B8A8"; }
  else if (/ensayo|filosof|polít|soci/.test(g))  { bg = isOpen ? "#5C6B3D" : "#EAF0E8"; color = isOpen ? "#F4EDE0" : "#5C6B3D"; border = "#A8C4A0"; }
  else                                             { bg = isOpen ? "#C8924A" : "#FBF0E5"; color = isOpen ? "#FBF6EB" : "#7A4A1A"; border = "#E0C498"; }
  return { backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: "20px", padding: "8px 14px", fontWeight: 500, fontSize: "0.85rem", cursor: "pointer", transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease" };
}


export { FONT_LINK, PALETTE_LIGHT, PALETTE_DARK, palette, getAvatarColor, display, body, ts, genrePillStyle };

// ============ STYLES ============
//
// SISTEMA DE COLOR DE FOLIO — fuente única de colores de la app.
//
// 1) `palette` (tokens que CAMBIAN con el tema). Objeto mutable: MainApp hace
//    Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT) en cada render,
//    así que los componentes deben leer `palette.x` en el render (no copiarlo a
//    una constante de módulo).
//    · Superficies ........ bg (fondo de app) · bgSoft (secciones, inputs apagados) · bgCard (tarjetas, sheets)
//    · Texto .............. ink (principal) · inkSoft (secundario) · inkFaint (captions, labels, placeholders)
//    · Marca / acento ..... accent (botón primario, links, estado activo) · accentSoft (hover, "Leyendo")
//    · Cálidos ............ amber (gemas, estrellas, highlights) · amberRich (estrellas llenas) · amberInk (números/texto ámbar sobre fondo claro)
//    · Secundarios ........ mauve (sugerencias IA) · slate (amigo en comparativas, "Por leer") · sage (Leídos, éxito suave)
//    · Bordes ............. border (inputs, tarjetas) · borderSoft (divisores)
//    · Sobre color ........ onAccent (texto/icono sobre accent o degradados) · onDark / onDarkSoft / onDarkFaint /
//                           onDarkMuted (texto sobre overlays casi negros: celebración, Wrapped, compartir)
//    · Estados ............ danger / dangerSoft / dangerBorder / dangerInk (errores y acciones destructivas)
//                           success (confirmaciones) · warnBg / warnBorder / warnInk (banner offline, avisos)
//    · Social ............. like (corazón) · badge (contador de no leídos) · unreadBg (notificación no leída)
//    · Gamificación ....... session / sessionInk (post de sesión de lectura) · freeze (protector de racha)
//
// 2) `BRAND` (colores FIJOS de identidad, iguales en claro y oscuro): degradado de marca,
//    confetti, tarjetas que se exportan como imagen (html2canvas) y overlays oscuros.
//
// 3) Datos de arte con nombre (no son tokens de UI, son ilustración): COVER_PALETTES
//    (portadas generativas), HEATMAP_COLORS, STREAK_PHASES, WRAPPED_SLIDE_GRADIENTS,
//    STATUS_COLORS, AVATAR_COLORS, SOCIAL_COLORS y genrePillStyle/genreColor.
//
// Fuera de este archivo quedan a propósito: BookCoverImage.jsx y pets/PetScene.jsx
// (ilustraciones con sus propias paletas de arte), main.jsx (pantallas de error que
// deben renderizar aunque falle el tema) y src/components/trueque/ (zona intocable).
//
// z-index: no hay escala todavía; el mapa real está en AUDIT_SPRINT_REPORT.md §C.

const FONT_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap');
`;

const PALETTE_LIGHT = {
  bg: "#F4EDE0", bgSoft: "#EBE3D2", bgCard: "#FBF6EB",
  ink: "#2A1F1A", inkSoft: "#5C4A3F", inkFaint: "#8B7B6E",
  accent: "#7A2E2E", accentSoft: "#A4493D",
  amber: "#C8924A", amberRich: "#E07B1A", amberInk: "#8A5A1A",
  mauve: "#A26B7A", slate: "#1B3A4B", sage: "#5C6B3D",
  border: "#D4C9B5", borderSoft: "#DDD5C5",
  onAccent: "#FFFFFF",
  onDark: "#F4EDE0", onDarkSoft: "#D8CCBC", onDarkFaint: "#9A8A7A", onDarkMuted: "#7A6A5A",
  danger: "#C0392B", dangerSoft: "#FEF2F2", dangerBorder: "#FCA5A5", dangerInk: "#991B1B",
  success: "#2D6A4F",
  warnBg: "#FDF3DC", warnBorder: "#E8C97A", warnInk: "#8A6A1A",
  like: "#E74C3C", badge: "#E53E3E", unreadBg: "#FDF8F3",
  session: "#4CAF50", sessionInk: "#2E7D32", freeze: "#3A8FD6",
};
const PALETTE_DARK = {
  bg: "#1a1614", bgSoft: "#211d1a", bgCard: "#2a2420",
  ink: "#F5EDE0", inkSoft: "#B8A99A", inkFaint: "#7A6B60",
  accent: "#C84F4F", accentSoft: "#D06060",
  amber: "#D4A574", amberRich: "#E08B30", amberInk: "#E0B06A",
  mauve: "#B87B8A", slate: "#4A7A9B", sage: "#7A9B5C",
  border: "#3D3530", borderSoft: "#332E2A",
  onAccent: "#FFFFFF",
  onDark: "#F4EDE0", onDarkSoft: "#D8CCBC", onDarkFaint: "#9A8A7A", onDarkMuted: "#7A6A5A",
  danger: "#E5675B", dangerSoft: "#3A1F1C", dangerBorder: "#7A3A34", dangerInk: "#F2A39B",
  success: "#6FBF8F",
  warnBg: "#3A301A", warnBorder: "#6B5A2A", warnInk: "#E8C97A",
  like: "#E74C3C", badge: "#E53E3E", unreadBg: "#2F2823",
  session: "#4CAF50", sessionInk: "#7BC47F", freeze: "#3A8FD6",
};
let palette = { ...PALETTE_LIGHT };

// Identidad fija (no cambia con el tema).
const BRAND = {
  wine: "#7A2E2E", wineDeep: "#6B1E2A", amber: "#C8924A", amberLight: "#D4A574", amberGlow: "#F4C77A",
  cream: "#F4EDE0", ink: "#2A1F1A", gold: "#FFD700", goldDeep: "#FFA500", goldLight: "#FFE066",
  gradient: "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)",
  gradientFab: "linear-gradient(135deg, #7A2E2E 0%, #A4493D 100%)",
  gradientWrappedCta: "linear-gradient(120deg, #6B1E2A 0%, #7A2E2E 40%, #C8924A 100%)",
  // Tarjetas que se exportan como imagen (frase / libro terminado): siempre en claro.
  gradientShareCard: "linear-gradient(155deg, #F5EFE3 0%, #C9976A 55%, #7A2E2E 100%)",
  confetti: ["#7A2E2E", "#C8924A", "#F4EDE0"],
};

// Fondo tipo póster de las frases en el feed (depende del tema, no de la paleta).
const QUOTE_POSTER_GRADIENTS = {
  light: "linear-gradient(155deg, #2A1F1A 0%, #4A2525 55%, #7A2E2E 100%)",
  dark: "linear-gradient(155deg, #2a1f1a 0%, #1a1210 50%, #3d1a1a 100%)",
};

// Colores de marcas de terceros (botones de compartir).
const SOCIAL_COLORS = { whatsapp: "#25D366", x: "#000000" };

// Color por estado de lectura (badges y selector de estado). Fijos en ambos temas.
const STATUS_COLORS = {
  reading: "#A4493D",
  want_to_read: "#B8720A",
  wish: "#8A4A6A",
  read: "#5C6B3D",
};

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

// Portadas generativas para libros sin cover (BookCoverPlaceholder).
const COVER_PALETTES = [
  { bg: "#7A2E2E", fg: "#F5EDE0", accent: "#E8A84A" },
  { bg: "#1B3A4B", fg: "#E8F2FA", accent: "#E8A84A" },
  { bg: "#5C6B3D", fg: "#EBF5E4", accent: "#E8C86A" },
  { bg: "#5C1A5C", fg: "#F5E8F5", accent: "#E8A84A" },
  { bg: "#3D5A6C", fg: "#E8F0F7", accent: "#F0C060" },
  { bg: "#8A3A1F", fg: "#F5EDE8", accent: "#F5E0B0" },
  { bg: "#544875", fg: "#EDE8F5", accent: "#E8B86D" },
  { bg: "#C8924A", fg: "#2A1F1A", accent: "#7A2E2E" },
  { bg: "#1F3933", fg: "#E4F0EC", accent: "#E8C86A" },
  { bg: "#6B2B3E", fg: "#F5E8EC", accent: "#E8C86A" },
  { bg: "#2A3D14", fg: "#EBF0E4", accent: "#F0C060" },
  { bg: "#0D3350", fg: "#E4EFF8", accent: "#E8A84A" },
];

// Heatmap de lectura: 4 intensidades (1-5, 6-15, 16-30, 31+ páginas).
const HEATMAP_COLORS = {
  light: ["#D4E6C3", "#9DC07F", "#5C8A3E", "#3D6B28"],
  dark: ["#1e3a12", "#2d5a1a", "#3d8f1f", "#5bc234"],
};

// Fases visuales del banner de racha diaria (0 = sin racha, 1 = 1-3 d, 2 = 4-7 d, 3 = 8+ d).
const STREAK_PHASES = [
  { g0: "#E8A82B", g1: "#F4C430", rgb: "232,168,43",  border: "#E8A82B" },
  { g0: "#E8A82B", g1: "#F4C430", rgb: "232,168,43",  border: "#E8A82B" },
  { g0: "#5CAE4A", g1: "#B8D44A", rgb: "92,174,74",   border: "#5CAE4A" },
  { g0: "#C84B8A", g1: "#7A2E5E", rgb: "200,75,138",  border: "#C84B8A" },
];

// Tarjetas de racha en el perfil de un amigo.
const FRIEND_STREAK_GRADIENT = "linear-gradient(90deg, #3D8B37 0%, #5CAE4A 100%)";

// Fondos de cada slide del Wrapped (historia a pantalla completa).
const WRAPPED_SLIDE_GRADIENTS = [
  "linear-gradient(160deg, #3D1A18 0%, #7A2E2E 60%, #2A1510 100%)",
  "linear-gradient(160deg, #1A1210 0%, #C8924A 60%, #8B5E20 100%)",
  "linear-gradient(160deg, #1a2a1a 0%, #3d6b28 60%, #1a1614 100%)",
  "linear-gradient(160deg, #1a1a2e 0%, #4A3A8B 60%, #1a1614 100%)",
  "linear-gradient(160deg, #1a1a1a 0%, #5C4A3F 55%, #2A1F1A 100%)",
  "linear-gradient(160deg, #2e1a2e 0%, #7A2E5E 60%, #1a1614 100%)",
  "linear-gradient(160deg, #1a2e2a 0%, #2e5E5A 60%, #1a1614 100%)",
  "linear-gradient(160deg, #2e2a1a 0%, #8B7020 60%, #3d2e10 100%)",
  "linear-gradient(160deg, #7A2E2E 0%, #C8924A 60%, #F4EDE0 100%)",
];

const display = { fontFamily: "Fraunces, serif" };
const body = { fontFamily: "'EB Garamond', serif" };

// Escala tipográfica. `caption` y `label` leen el color del tema en cada uso
// (getter), así siguen al modo oscuro aunque se usen con spread: { ...ts.caption }.
const ts = {
  h1: { fontFamily: "Fraunces, serif", fontSize: "28px", fontWeight: 700, fontStyle: "italic", lineHeight: 1.15 },
  h2: { fontFamily: "Fraunces, serif", fontSize: "20px", fontWeight: 600, lineHeight: 1.25 },
  h3: { fontFamily: "'EB Garamond', serif", fontSize: "17px", fontWeight: 600, lineHeight: 1.3 },
  body15: { fontFamily: "'EB Garamond', serif", fontSize: "15px", fontWeight: 400, lineHeight: 1.55 },
  caption: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 400, get color() { return palette.inkFaint; } },
  label: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 500, get color() { return palette.inkFaint; } },
};

// Pill de género (perfil propio y de amigos): tinte por familia de género.
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

// Chip de género pequeño (comparativa de amigos, preview de libro).
function genreColor(genre) {
  const g = (genre || "").toLowerCase();
  if (g.includes("novela") || g.includes("ficción") || g.includes("fiction") || g.includes("narrativa"))
    return { color: "#1B3A4B", backgroundColor: "#1B3A4B1A" };
  if (g.includes("filosofía") || g.includes("ensayo") || g.includes("philosophy"))
    return { color: "#5C6B3D", backgroundColor: "#5C6B3D1A" };
  if (g.includes("terror") || g.includes("horror") || g.includes("thriller") || g.includes("misterio"))
    return { color: "#7A2E2E", backgroundColor: "#7A2E2E1A" };
  if (g.includes("romance") || g.includes("amor") || g.includes("poesía") || g.includes("poetry"))
    return { color: "#7A3D4E", backgroundColor: "#A26B7A1A" };
  if (g.includes("historia") || g.includes("history") || g.includes("biografía") || g.includes("memoir"))
    return { color: "#8A5A1A", backgroundColor: "#C8924A1A" };
  if (g.includes("ciencia") || g.includes("sci-fi") || g.includes("tecnología") || g.includes("divulgación"))
    return { color: "#1F3933", backgroundColor: "#1F39331A" };
  if (g.includes("autoayuda") || g.includes("desarrollo") || g.includes("psicología") || g.includes("bienestar"))
    return { color: "#544875", backgroundColor: "#5448751A" };
  return { color: palette.inkFaint, backgroundColor: palette.bgSoft };
}


export {
  FONT_LINK, PALETTE_LIGHT, PALETTE_DARK, palette, BRAND, SOCIAL_COLORS, STATUS_COLORS,
  AVATAR_COLORS, getAvatarColor, COVER_PALETTES, HEATMAP_COLORS, STREAK_PHASES, FRIEND_STREAK_GRADIENT,
  WRAPPED_SLIDE_GRADIENTS, QUOTE_POSTER_GRADIENTS,
  display, body, ts, genrePillStyle, genreColor,
};

// ============ STYLES ============
//
// SISTEMA DE COLOR DE SEMA — fuente única de colores de la app.
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
// 4) Variables CSS (`applyPaletteCssVars`, 2026-10-10): los mismos tokens de `palette`
//    expuestos como --sema-* para index.css (estados hover/press/focus y skeleton).
//
// z-index: no hay escala todavía; el mapa real está en AUDIT_SPRINT_REPORT.md §C.

const FONT_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Figtree:ital,wght@0,300..900;1,300..900&family=Instrument+Serif:ital@0;1&display=swap');
`;

const PALETTE_LIGHT = {
  bg: "#F4EDE0", bgSoft: "#EBE3D2", bgCard: "#FBF6EB",
  ink: "#2A1F1A", inkSoft: "#5C4A3F", inkFaint: "#6E6054",
  accent: "#7A2E2E", accentSoft: "#96403B",
  amber: "#C8924A", amberRich: "#C8924A", amberInk: "#8A5A1A",
  mauve: "#96403B", slate: "#5C4A3F", sage: "#5C6B3D",
  border: "#D4C9B5", borderSoft: "#DDD5C5",
  onAccent: "#FFFFFF",
  onDark: "#F4EDE0", onDarkSoft: "#D8CCBC", onDarkFaint: "#9A8A7A", onDarkMuted: "#7A6A5A",
  danger: "#B03A2E", dangerSoft: "#FBEEEA", dangerBorder: "#E3A79F", dangerInk: "#8E2A20",
  success: "#5C6B3D",
  warnBg: "#F6EAD0", warnBorder: "#E0C48F", warnInk: "#8A5A1A",
  like: "#B03A2E", badge: "#B03A2E", unreadBg: "#FDF8F3",
  session: "#5C6B3D", sessionInk: "#46552C", freeze: "#5C4A3F",
};
const PALETTE_DARK = {
  bg: "#1a1614", bgSoft: "#211d1a", bgCard: "#2a2420",
  ink: "#F5EDE0", inkSoft: "#B8A99A", inkFaint: "#9A8B7F",
  accent: "#C84F4F", accentSoft: "#D06060",
  amber: "#D4A574", amberRich: "#D4A574", amberInk: "#E0B06A",
  mauve: "#D06060", slate: "#8C7565", sage: "#7A9B5C",
  border: "#3D3530", borderSoft: "#332E2A",
  onAccent: "#FFFFFF",
  onDark: "#F4EDE0", onDarkSoft: "#D8CCBC", onDarkFaint: "#9A8A7A", onDarkMuted: "#7A6A5A",
  danger: "#E5675B", dangerSoft: "#3A1F1C", dangerBorder: "#7A3A34", dangerInk: "#F2A39B",
  success: "#7A9B5C",
  warnBg: "#3A301A", warnBorder: "#6B5A2A", warnInk: "#E8C97A",
  like: "#E5675B", badge: "#C84F4F", unreadBg: "#2F2823",
  session: "#7A9B5C", sessionInk: "#9CBB7E", freeze: "#8C7565",
};
let palette = { ...PALETTE_LIGHT };

// Variables CSS del tema (2026-10-10): copia `palette` a :root como --sema-<token> (camelCase →
// kebab-case: bgSoft → --sema-bg-soft) para que index.css (hover, skeleton, focus) use los mismos
// colores sin hex propios. Además define tres variables derivadas que dependen del modo:
//   --sema-skel-base / --sema-skel-shine  (fondo y brillo del skeleton, de border/borderSoft)
//   --sema-hover-brightness / --sema-press-brightness (oscurece en claro, aclara en oscuro)
// MainApp la llama en cada render; solo escribe en el DOM cuando cambia el tema.
let appliedCssTheme = null;
function applyPaletteCssVars(isDark = false) {
  if (typeof document === "undefined") return;
  const key = isDark ? "dark" : "light";
  if (appliedCssTheme === key) return;
  appliedCssTheme = key;
  const src = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const root = document.documentElement.style;
  Object.entries(src).forEach(([k, v]) => {
    root.setProperty(`--sema-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`, v);
  });
  root.setProperty("--sema-skel-base", isDark ? src.borderSoft : src.border);
  root.setProperty("--sema-skel-shine", isDark ? src.border : src.borderSoft);
  root.setProperty("--sema-hover-brightness", isDark ? "1.12" : "0.96");
  root.setProperty("--sema-press-brightness", isDark ? "1.22" : "0.9");
}
// Valores iniciales (modo claro) para las pantallas que se pintan antes de MainApp (login, onboarding).
applyPaletteCssVars(false);

// Identidad fija (no cambia con el tema).
const BRAND = {
  wine: "#7A2E2E", wineDeep: "#6B1E2A", amber: "#C8924A", amberLight: "#D4A574", amberGlow: "#F4C77A",
  cream: "#F4EDE0", ink: "#2A1F1A", gold: "#D4A574", goldDeep: "#C8924A", goldLight: "#F4C77A",
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
  reading: "#96403B",
  want_to_read: "#8A5A1A",
  wish: "#5C4A3F",
  read: "#5C6B3D",
};

const AVATAR_COLORS = [
  "#7A2E2E", "#5C6B3D", "#8A5A1A", "#5C4A3F",
  "#96403B", "#B07A35", "#6B1E2A", "#46552C",
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
  light: ["#DDE3C9", "#B3BF8E", "#7E8F57", "#5C6B3D"],
  dark: ["#2A3320", "#3E4D2B", "#5C6B3D", "#7A9B5C"],
};

// Fases visuales del banner de racha diaria (0 = sin racha, 1 = 1-3 d, 2 = 4-7 d, 3 = 8+ d).
const STREAK_PHASES = [
  { g0: "#C8924A", g1: "#D4A574", rgb: "200,146,74",  border: "#C8924A" },
  { g0: "#C8924A", g1: "#D4A574", rgb: "200,146,74",  border: "#C8924A" },
  { g0: "#5C6B3D", g1: "#7A8B55", rgb: "92,107,61",   border: "#5C6B3D" },
  { g0: "#7A2E2E", g1: "#96403B", rgb: "122,46,46",   border: "#7A2E2E" },
];

// Tarjetas de racha en el perfil de un amigo.
const FRIEND_STREAK_GRADIENT = "linear-gradient(90deg, #46552C 0%, #5C6B3D 100%)";

// Fondos de cada slide del Wrapped (historia a pantalla completa).
const WRAPPED_SLIDE_GRADIENTS = [
  "linear-gradient(160deg, #3D1A18 0%, #7A2E2E 60%, #2A1510 100%)",
  "linear-gradient(160deg, #1A1210 0%, #C8924A 60%, #8B5E20 100%)",
  "linear-gradient(160deg, #1a2214 0%, #5C6B3D 60%, #1a1614 100%)",
  "linear-gradient(160deg, #2A1F1A 0%, #5C4A3F 60%, #1a1614 100%)",
  "linear-gradient(160deg, #1a1a1a 0%, #5C4A3F 55%, #2A1F1A 100%)",
  "linear-gradient(160deg, #2A1510 0%, #96403B 60%, #1a1614 100%)",
  "linear-gradient(160deg, #1a2214 0%, #46552C 60%, #1a1614 100%)",
  "linear-gradient(160deg, #2e2a1a 0%, #8B7020 60%, #3d2e10 100%)",
  "linear-gradient(160deg, #7A2E2E 0%, #C8924A 60%, #F4EDE0 100%)",
];

const FONT_DISPLAY = "'Bricolage Grotesque', system-ui, sans-serif";
const FONT_UI = "Figtree, system-ui, sans-serif";
const FONT_QUOTE = "'Instrument Serif', Georgia, serif";
const display = { fontFamily: FONT_DISPLAY };
const body = { fontFamily: FONT_UI };
const quote = { fontFamily: FONT_QUOTE };

// Espacio (principio 2: separar con espacio, no con cajas). Escala de 8 px.
const sp = { xs: "0.5rem", sm: "0.75rem", md: "1rem", lg: "1.5rem", xl: "2rem", xxl: "3rem" };

// Escala tipográfica. `caption` y `label` leen el color del tema en cada uso
// (getter), así siguen al modo oscuro aunque se usen con spread: { ...ts.caption }.
const ts = {
  h1: { fontFamily: FONT_DISPLAY, fontSize: "28px", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" },
  h2: { fontFamily: FONT_DISPLAY, fontSize: "20px", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" },
  h3: { fontFamily: FONT_UI, fontSize: "17px", fontWeight: 600, lineHeight: 1.3 },
  body15: { fontFamily: FONT_UI, fontSize: "15px", fontWeight: 400, lineHeight: 1.55 },
  quote: { fontFamily: FONT_QUOTE, fontSize: "20px", fontWeight: 400, fontStyle: "italic", lineHeight: 1.45 },
  caption: { fontFamily: FONT_UI, fontSize: "13px", fontWeight: 400, get color() { return palette.inkFaint; } },
  label: { fontFamily: FONT_UI, fontSize: "13px", fontWeight: 500, get color() { return palette.inkFaint; } },
};

// Pill de género (perfil propio y de amigos): tinte por familia de género.
function genrePillStyle(genre, isOpen) {
  const g = (genre || "").toLowerCase();
  let bg, color, border;
  if (/fant|magia|drag|mito|roman|amor|terror|horror|misterio|thriller/.test(g)) { bg = isOpen ? "#7A2E2E" : "#F5EAEA"; color = isOpen ? "#F4EDE0" : "#7A2E2E"; border = "#E0BCBC"; }
  else if (/ensayo|filosof|polít|soci|ciencia|sci.fi|distop|futur/.test(g))      { bg = isOpen ? "#5C6B3D" : "#EAF0E8"; color = isOpen ? "#F4EDE0" : "#5C6B3D"; border = "#B9C7A3"; }
  else if (/histor|biograf|memoir/.test(g))                                       { bg = isOpen ? "#2A1F1A" : "#F0ECEA"; color = isOpen ? "#F4EDE0" : "#2A1F1A"; border = "#C4B8B0"; }
  else                                                                             { bg = isOpen ? "#C8924A" : "#FBF0E5"; color = isOpen ? "#2A1F1A" : "#7A4A1A"; border = "#E0C498"; }
  return { backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: "20px", padding: "8px 14px", fontWeight: 500, fontSize: "0.85rem", cursor: "pointer", transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease" };
}

// Chip de género pequeño (comparativa de amigos, preview de libro).
function genreColor(genre) {
  const g = (genre || "").toLowerCase();
  if (/novela|ficci|fiction|narrativa|terror|horror|thriller|misterio|romance|amor|poes|poetry/.test(g))
    return { color: "#7A2E2E", backgroundColor: "#7A2E2E1A" };
  if (/filosof|ensayo|philosophy|ciencia|sci-fi|tecnolog|divulgaci|autoayuda|desarrollo|psicolog|bienestar/.test(g))
    return { color: "#5C6B3D", backgroundColor: "#5C6B3D1A" };
  if (/historia|history|biograf|memoir/.test(g))
    return { color: "#8A5A1A", backgroundColor: "#C8924A1A" };
  return { color: palette.inkFaint, backgroundColor: palette.bgSoft };
}


export {
  FONT_LINK, PALETTE_LIGHT, PALETTE_DARK, palette, applyPaletteCssVars, BRAND, SOCIAL_COLORS, STATUS_COLORS,
  AVATAR_COLORS, getAvatarColor, COVER_PALETTES, HEATMAP_COLORS, STREAK_PHASES, FRIEND_STREAK_GRADIENT,
  WRAPPED_SLIDE_GRADIENTS, QUOTE_POSTER_GRADIENTS,
  display, body, quote, sp, FONT_DISPLAY, FONT_UI, FONT_QUOTE, ts, genrePillStyle, genreColor,
};

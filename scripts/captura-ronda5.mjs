// scripts/captura-ronda5.mjs — capturas de la ronda 5 (2026-11-03; base: captura-ronda4.mjs). Copia la rutina de scripts/captura.js
// (skill sema-capturas) y agrega zonas y dos modos de prueba:
//   · --mock-feed   intercepta rest/v1/posts (y los books/users de esos posts) en el navegador de prueba
//                   y responde con publicaciones de ejemplo de TODOS los tipos (Leyó, Libro terminado,
//                   Frase, Nota, Reseña, Empezó a leer, Logro). No escribe nada en Supabase.
//   · --fonts=<set> inyecta un <link> de Google Fonts y sobrescribe las variables --sema-font-* en :root
//                   para comparar combinaciones tipográficas sin tocar el código (sets abajo).
// Salida: capturas/ronda4-2026-11-03/<zona>[-<fonts>][-<width>]-<fase>-<modo>.png
// Uso: node scripts/captura-ronda5.mjs <zona> <fase> [claro|oscuro|ambos] [--width=375] [--full] [--mock-feed] [--fonts=a]
// Zonas: home · social · explorar · perfil · perfil-ajustes · cuento · para-ti · mascota
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });
const argv = process.argv.slice(2);
const [zona, fase] = argv;
const modoArg = ["claro", "oscuro", "ambos"].includes(argv[2]) ? argv[2] : "ambos";
const rest = argv.slice(2);
const fullPage = rest.includes("--full");
const mockFeed = rest.includes("--mock-feed");
const widthArg = rest.find((r) => r.startsWith("--width="));
const width = widthArg ? Number(widthArg.split("=")[1]) : 390;
// Ronda 5: --boton=sticker|doble|boleto fuerza la variante del botón principal (solo desarrollo, window.__SEMA_BOTON__);
// --racha=<actual>,<mejor> responde user_streaks con esos valores (récord: 15,15); --post=<id> baja hasta ese post del feed;
// --hitos agrega a la muestra los carteles de hito de racha de los tres niveles.
const botonArg = rest.find((r) => r.startsWith("--boton="));
const botonKey = botonArg ? botonArg.split("=")[1] : null;
const rachaArg = rest.find((r) => r.startsWith("--racha="));
const rachaVals = rachaArg ? rachaArg.split("=")[1].split(",").map(Number) : null;
const postArg = rest.find((r) => r.startsWith("--post="));
const postId = postArg ? postArg.split("=")[1] : null;
const fontsArg = rest.find((r) => r.startsWith("--fonts="));
const fontsKey = fontsArg ? fontsArg.split("=")[1] : null;
const EMAIL = process.env.SEMA_TEST_EMAIL, PASSWORD = process.env.SEMA_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error("[captura] faltan SEMA_TEST_EMAIL / SEMA_TEST_PASSWORD en .env.local"); process.exit(1); }
if (!zona || !fase) { console.error("[captura] uso: node scripts/captura-ronda5.mjs <zona> <fase> [modo] [opciones]"); process.exit(1); }
const BASE = process.env.SEMA_BASE_URL || "http://localhost:5173";
const modos = modoArg === "ambos" ? ["claro", "oscuro"] : [modoArg];
const outDir = path.join(ROOT, "capturas", "ronda5-2026-11-03");
fs.mkdirSync(outDir, { recursive: true });

// Combinaciones tipográficas de prueba (punto 2 de la ronda 4). Cada set define títulos, etiquetas
// (boletos y sellos) y texto de lectura. La app lee --sema-font-display / --sema-font-label /
// --sema-font-ui / --sema-font-quote (src/theme.js, ronda 4).
const FONT_SETS = {
  actual: null,
  a: { // Carácter + condensada: Syne (titulares geométricos con actitud) + Barlow Condensed (boletos)
    link: "https://fonts.googleapis.com/css2?family=Syne:wght@500..800&family=Barlow+Condensed:wght@500;600;700;800&family=Figtree:ital,wght@0,300..900;1,300..900&family=Instrument+Serif:ital@0;1&display=swap&subset=latin",
    display: "'Syne', system-ui, sans-serif", label: "'Barlow Condensed', 'Arial Narrow', sans-serif", ui: "Figtree, system-ui, sans-serif", quote: "'Instrument Serif', Georgia, serif",
  },
  b: { // Zine: Unbounded (titulares anchos, de póster) + Space Mono (boletos y sellos tipo máquina)
    link: "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700;800&family=Space+Mono:wght@400;700&family=Figtree:ital,wght@0,300..900;1,300..900&family=Instrument+Serif:ital@0;1&display=swap&subset=latin",
    display: "'Unbounded', system-ui, sans-serif", label: "'Space Mono', ui-monospace, monospace", ui: "Figtree, system-ui, sans-serif", quote: "'Instrument Serif', Georgia, serif",
  },
  c: { // Flyer: Archivo (eje de ancho, titulares apretados) + Archivo Narrow (boletos) + Instrument Serif
    link: "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Archivo+Narrow:wght@500;600;700&family=Figtree:ital,wght@0,300..900;1,300..900&family=Instrument+Serif:ital@0;1&display=swap&subset=latin",
    display: "'Archivo', system-ui, sans-serif", label: "'Archivo Narrow', 'Arial Narrow', sans-serif", ui: "Figtree, system-ui, sans-serif", quote: "'Instrument Serif', Georgia, serif",
  },
};
if (fontsKey && !(fontsKey in FONT_SETS)) { console.error(`[captura] --fonts debe ser uno de: ${Object.keys(FONT_SETS).join(", ")}`); process.exit(1); }
const fontSet = fontsKey ? FONT_SETS[fontsKey] : null;

try { await fetch(BASE, { signal: AbortSignal.timeout(5000) }); }
catch { console.error(`[captura] No responde ${BASE}. Levanta la app con «npm run dev».`); process.exit(1); }

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
const page = await context.newPage();
if (botonKey) await page.addInitScript((b) => { window.__SEMA_BOTON__ = b; }, botonKey);
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// ── Feed de ejemplo (--mock-feed) ─────────────────────────────────────────────────────────────
const H = 3600 * 1000;
const now = Date.now();
const MOCK_BOOKS = {
  "mock-b1": { id: "mock-b1", title: "El extranjero", author: "Albert Camus", cover_url: null, rating: 5, review: "Lo leí en dos tardes y todavía no sé si Meursault me cae bien o me da miedo. Me quedo con la última página.", status: "read" },
  "mock-b2": { id: "mock-b2", title: "Temporada de huracanes", author: "Fernanda Melchor", cover_url: null, rating: 0, review: null, status: "reading" },
  "mock-b3": { id: "mock-b3", title: "Las batallas en el desierto", author: "José Emilio Pacheco", cover_url: null, rating: 4, review: "Corto, triste y con la Ciudad de México de fondo. Se lee en una tarde y se queda una semana.", status: "read" },
  "mock-b4": { id: "mock-b4", title: "Nuestra parte de noche", author: "Mariana Enriquez", cover_url: null, rating: 0, review: null, status: "reading" },
  "mock-b5": { id: "mock-b5", title: "Cien años de soledad", author: "Gabriel García Márquez", cover_url: null, rating: 0, review: null, status: "reading" },
};
const MOCK_AUTHORS = {
  "mock-u1": { id: "mock-u1", nombre: "Dani Ríos", username: "danirios", avatar_url: null, cover_url: null, bio: "" },
  "mock-u2": { id: "mock-u2", nombre: "Majo Castañeda", username: "majoc", avatar_url: null, cover_url: null, bio: "" },
  "mock-u3": { id: "mock-u3", nombre: "Emilio", username: "emilio", avatar_url: null, cover_url: null, bio: "" },
};
function mockPosts(ownId) {
  return [
    { id: "mock-p1", type: "reading_session", action: null, content: "Media hora en el metro y ya casi acabo la parte dos.", image_url: null, created_at: new Date(now - 0.5 * H).toISOString(), user_id: "mock-u1", book_id: "mock-b2", pages_read: 24, minutes_read: 30 },
    { id: "mock-p2", type: "book_update", action: "finished", content: "Lo leí en dos tardes y todavía no sé si Meursault me cae bien o me da miedo. Me quedo con la última página.", image_url: null, created_at: new Date(now - 3 * H).toISOString(), user_id: "mock-u2", book_id: "mock-b1", pages_read: null, minutes_read: null },
    { id: "mock-p3", type: "text", action: null, content: JSON.stringify({ __folio_type: "quote", text: "Hoy ha muerto mamá. O quizá ayer. No lo sé.", mood: "melancolico", page_number: 9, bookTitle: "El extranjero", bookAuthor: "Albert Camus" }), image_url: null, created_at: new Date(now - 5 * H).toISOString(), user_id: "mock-u2", book_id: null, pages_read: null, minutes_read: null },
    { id: "mock-p4", type: "text", action: null, content: "Alguien que haya leído a Melchor: ¿se entiende mejor en voz alta o es idea mía?", image_url: null, created_at: new Date(now - 7 * H).toISOString(), user_id: ownId, book_id: null, pages_read: null, minutes_read: null },
    { id: "mock-p5", type: "book_update", action: "reviewed", content: null, image_url: null, created_at: new Date(now - 26 * H).toISOString(), user_id: "mock-u3", book_id: "mock-b3", pages_read: null, minutes_read: null },
    { id: "mock-p6", type: "book_update", action: "started", content: "Empiezo con miedo, me dijeron que no se lee de noche.", image_url: null, created_at: new Date(now - 30 * H).toISOString(), user_id: "mock-u1", book_id: "mock-b4", pages_read: null, minutes_read: null },
    { id: "mock-p7", type: "achievement", action: null, content: '¡Logro desbloqueado! "Primer libro"', image_url: null, created_at: new Date(now - 50 * H).toISOString(), user_id: "mock-u3", book_id: null, pages_read: null, minutes_read: null },
    { id: "mock-p9", type: "book_update", action: "finished", content: null, image_url: null, created_at: new Date(now - 4 * H).toISOString(), user_id: "mock-u3", book_id: "mock-b3", pages_read: null, minutes_read: null },
    { id: "mock-p10", type: "racha", action: null, content: JSON.stringify({ dias: 3, inicio: "2026-11-01" }), image_url: null, created_at: new Date(now - 1 * H).toISOString(), user_id: "mock-u1", book_id: null, pages_read: null, minutes_read: null },
    { id: "mock-p11", type: "racha", action: null, content: JSON.stringify({ dias: 21, inicio: "2026-10-14" }), image_url: null, created_at: new Date(now - 2 * H).toISOString(), user_id: "mock-u2", book_id: null, pages_read: null, minutes_read: null },
    { id: "mock-p12", type: "racha", action: null, content: JSON.stringify({ dias: 150, inicio: "2026-06-08" }), image_url: null, created_at: new Date(now - 6 * H).toISOString(), user_id: ownId, book_id: null, pages_read: null, minutes_read: null },
    { id: "mock-p8", type: "reading_session", action: null, content: null, image_url: null, created_at: new Date(now - 70 * H).toISOString(), user_id: ownId, book_id: "mock-b5", pages_read: 12, minutes_read: null },
  ];
}
async function installMockFeed() {
  // El id del usuario de prueba sale de la sesión de Supabase en localStorage (solo el id; nunca el token).
  const ownId = await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      try { return JSON.parse(localStorage.getItem(k))?.user?.id || null; } catch { return null; }
    }
    return null;
  });
  const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  await page.route((u) => u.pathname.includes("/rest/v1/posts"), async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 403, contentType: "application/json", body: '{"message":"mock: escritura bloqueada"}' });
    const url = new URL(req.url());
    const sel = url.searchParams.get("select") || "";
    // Solo la lectura del feed; likes y comentarios se responden vacíos para que el ejemplo sea estable.
    if (sel.includes("pages_read")) return json(route, mockPosts(ownId));
    return json(route, []);
  });
  await page.route((u) => u.pathname.includes("/rest/v1/books") && /id=in\.\(.*mock-b/.test(decodeURIComponent(u.search)), (route) => {
    const ids = decodeURIComponent(new URL(route.request().url()).search).match(/id=in\.\(([^)]*)\)/)?.[1].split(",") || [];
    return json(route, ids.map((id) => MOCK_BOOKS[id]).filter(Boolean));
  });
  await page.route((u) => u.pathname.includes("/rest/v1/users") && /id=in\.\(.*mock-u/.test(decodeURIComponent(u.search)), async (route) => {
    const ids = decodeURIComponent(new URL(route.request().url()).search).match(/id=in\.\(([^)]*)\)/)?.[1].split(",") || [];
    const own = ids.filter((id) => !id.startsWith("mock-"));
    // El perfil real del usuario de prueba se pide aparte (sin los mock) y se junta con los de ejemplo.
    let real = [];
    if (own.length) {
      try {
        const u = new URL(route.request().url());
        u.search = u.search.replace(/id=in\.\([^)]*\)/, `id=in.(${own.join(",")})`);
        const r = await route.fetch({ url: u.toString() });
        real = await r.json();
        if (!Array.isArray(real)) real = [];
      } catch { real = own.map((id) => ({ id, nombre: "Yo", username: "yo", avatar_url: null, cover_url: null, bio: "" })); }
    }
    return json(route, [...real, ...ids.map((id) => MOCK_AUTHORS[id]).filter(Boolean)]);
  });
  await page.route((u) => /\/rest\/v1\/(post_likes|likes|comments|post_comments)/.test(u.pathname), (route) => route.request().method() === "GET" ? json(route, []) : route.fulfill({ status: 403, body: "{}" }));
}

async function settle() {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}
async function applyFonts() {
  if (!fontSet) return;
  await page.evaluate((f) => {
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = f.link; document.head.appendChild(link);
    const r = document.documentElement.style;
    r.setProperty("--sema-font-display", f.display); r.setProperty("--sema-font-label", f.label);
    r.setProperty("--sema-font-ui", f.ui); r.setProperty("--sema-font-quote", f.quote);
  }, fontSet);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}
async function login() {
  await page.goto(BASE); await settle();
  const nav = page.locator('[data-tutorial="nav-home"]');
  if (await nav.count()) return;
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await nav.waitFor({ timeout: 20000 });
  await settle();
}
async function goTo(screen) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(`[data-tutorial="nav-${screen}"]`).first().click();
  await settle();
}
async function scrollTo(selector, offset = 72) {
  const el = page.locator(selector).first();
  await el.waitFor({ timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  await page.evaluate(({ s, o }) => { const e = document.querySelector(s); window.scrollBy(0, e.getBoundingClientRect().top - o); }, { s: selector, o: offset });
  await page.waitForTimeout(900);
}
async function paraTi() {
  await goTo("explorar");
  await page.getByRole("button", { name: "Para ti" }).first().click().catch(() => {});
  await settle();
  for (let i = 0; i < 4; i++) {
    const row = page.locator(".reco-poll-row").first();
    await row.waitFor({ timeout: 20000 });
    await row.click();
    await page.waitForTimeout(900);
  }
  const extra = page.locator("#reco-extra");
  await extra.waitFor({ timeout: 8000 });
  await extra.fill("Algo mexicano, no muy largo");
  await page.getByRole("button", { name: "Ver ideas" }).click();
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 60000 }).catch(() => console.log("[red] timeout esperando respuesta"));
  await settle();
  await scrollTo('[aria-label="Recomendaciones del gato"]', 16).catch(() => {});
}

async function installMockRacha() {
  const hoy = new Date(); const ymd = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  await page.route((u) => u.pathname.includes("/rest/v1/user_streaks"), (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.continue();
    const row = { user_id: "mock", current_streak: rachaVals[0], longest_streak: rachaVals[1] ?? rachaVals[0], last_log_date: ymd, total_pages_read: 480, streak_freezes_remaining: 1, streak_freeze_used_at: null };
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(single ? row : [row]) });
  });
}
await login();
if (mockFeed) await installMockFeed();
if (rachaVals) await installMockRacha();
for (const modo of modos) {
  await page.evaluate((v) => localStorage.setItem("folio_theme", v), modo === "oscuro" ? "dark" : "light");
  await page.reload(); await settle();
  await applyFonts();
  if (zona === "home") await goTo("home");
  else if (zona === "social") { await goTo("social"); await page.locator('.feed-post-item, [data-tutorial="snacks-hero"]').first().waitFor({ timeout: 25000 }).catch(() => {}); await settle(); if (postId) await scrollTo(`#post-${postId}`, 56); }
  else if (zona === "cuento") { await goTo("social"); await scrollTo('[data-tutorial="snacks-hero"]'); }
  else if (zona === "para-ti") await paraTi();
  else if (zona === "explorar") await goTo("explorar");
  else if (zona === "mascota") await goTo("mascota");
  else if (zona === "hitos") { await page.goto(BASE + "/?hitos=1", { waitUntil: "domcontentloaded" }); await settle(); }
  else if (zona === "perfil") await goTo("perfil");
  else if (zona === "perfil-ajustes") { await goTo("perfil"); await page.getByRole("button", { name: "Editar perfil" }).first().click(); await settle(); }
  else { console.error(`[captura] zona desconocida: ${zona}`); process.exit(1); }
  const file = path.join(outDir, `${zona}${mockFeed ? "-mock" : ""}${fontsKey ? "-" + fontsKey : ""}${botonKey ? "-boton-" + botonKey : ""}${rachaVals ? "-racha" + rachaVals.join("-") : ""}${postId ? "-" + postId : ""}${width !== 390 ? "-" + width : ""}-${fase}-${modo}.png`);
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`[ancho] ${zona} ${width}px ${modo}: desborde horizontal = ${desborde}px`);
  await page.screenshot({ path: file, fullPage: fullPage || zona === "hitos" });
  console.log(`[captura] ${file}`);
}
await page.evaluate(() => localStorage.setItem("folio_theme", "light"));
if (consoleErrors.length) { console.log(`[captura] Errores de consola (${consoleErrors.length}):`); for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log("  - " + e.slice(0, 260)); }
await browser.close();

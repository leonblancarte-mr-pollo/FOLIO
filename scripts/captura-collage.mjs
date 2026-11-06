// scripts/captura-collage.mjs — capturas y prueba de gestos de Collages (2026-11-06).
// Uso (con `npm run dev` corriendo): node scripts/captura-collage.mjs [claro|oscuro|ambos]
// Variables: SEMA_TEST_EMAIL / SEMA_TEST_PASSWORD (.env.local), SEMA_BASE_URL (por defecto http://localhost:5173).
// Seguridad: el Supabase de desarrollo es el de producción. Este script BLOQUEA toda escritura a collages,
// posts, quotes y Storage (responde 403 en el navegador de prueba) y simula «Mis frases» con frases de ejemplo.
// Si el SQL de Collages no se ha corrido, la app usa el modo local (localStorage del navegador de prueba).
// Salida: capturas/collage/<fecha>-<paso>-<modo>.png  (capturas/ no entra a git)
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
const modoArg = process.argv[2] || "ambos";
const BASE = process.env.SEMA_BASE_URL || "http://localhost:5173";
const EMAIL = process.env.SEMA_TEST_EMAIL, PASSWORD = process.env.SEMA_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error("[captura-collage] faltan SEMA_TEST_EMAIL / SEMA_TEST_PASSWORD"); process.exit(1); }
const d = new Date();
const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const outDir = path.join("capturas", "collage");
fs.mkdirSync(outDir, { recursive: true });

const FRASES = [
  { id: "mock-q1", user_id: "x", book_id: "b1", text: "Hoy ha muerto mamá. O quizá ayer. No lo sé.", page_number: 9, mood: null, tags: [], is_favorite: false, is_public: false, created_at: new Date().toISOString(), books: { title: "El extranjero", author: "Albert Camus", cover_url: null } },
  { id: "mock-q2", user_id: "x", book_id: "b2", text: "Uno no se muere cuando debe, sino cuando puede.", page_number: 120, mood: null, tags: [], is_favorite: false, is_public: false, created_at: new Date().toISOString(), books: { title: "Cien años de soledad", author: "Gabriel García Márquez", cover_url: null } },
];

const resultados = [];
const ok = (nombre, cond, extra = "") => { resultados.push(`${cond ? "OK " : "FALLA"} ${nombre}${extra ? ` (${extra})` : ""}`); };

const browser = await chromium.launch();
for (const modo of modoArg === "ambos" ? ["claro", "oscuro"] : [modoArg]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  const page = await context.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/api\/books|GB API|404/.test(m.text())) errores.push(m.text()); });

  // Bloqueo de escrituras + frases de ejemplo.
  await page.route((u) => /\/rest\/v1\/(collages|posts|quotes)/.test(u.pathname) || /\/storage\/v1\/object/.test(u.pathname), (route) => {
    const r = route.request();
    if (r.method() !== "GET") return route.fulfill({ status: 403, contentType: "application/json", body: '{"message":"captura: escritura bloqueada"}' });
    if (/\/rest\/v1\/quotes/.test(r.url())) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FRASES) });
    return route.continue();
  });
  await page.addInitScript((tema) => { try { localStorage.setItem("folio_theme", tema); } catch { /* */ } }, modo === "oscuro" ? "dark" : "light");

  const settle = async (ms = 900) => { await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {}); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(ms); };
  const shot = async (paso) => { const f = path.join(outDir, `${fecha}-${paso}-${modo}.png`); await page.screenshot({ path: f }); console.log("  ", f); };

  await page.goto(BASE); await settle();
  if (!(await page.locator('[data-tutorial="nav-home"]').count())) {
    await page.locator('input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.locator('[data-tutorial="nav-home"]').waitFor({ timeout: 20000 });
    await settle(1500);
  }
  // Empezar limpio en modo local.
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sema_collages_v1:")).forEach((k) => localStorage.removeItem(k)));

  await page.locator('[data-tutorial="nav-collage"]').click(); await settle();
  await shot("01-mis-collages-vacio");

  await page.getByRole("button", { name: "Nuevo collage" }).click(); await settle(1200);
  await shot("02-editor-bandeja-stickers");

  // Tres stickers + fondo de papel.
  const tab = (n) => page.getByRole("tab", { name: n });
  for (const nombre of ["Peonía", "Luna", "Margaritas"]) {
    if (!(await page.locator("#collage-bandeja").count())) await tab("Stickers").click();
    await page.locator("#collage-bandeja").getByRole("button", { name: nombre, exact: true }).click();
    await page.waitForTimeout(500);
  }
  ok("agregar 3 stickers", (await page.locator("[data-capa]").count()) === 3);
  await tab("Papeles y fondos").click(); await page.waitForTimeout(400);
  await shot("03-bandeja-papeles");
  await page.getByRole("button", { name: "Fondo Kraft" }).click(); await page.waitForTimeout(300);
  await page.locator("#collage-bandeja").getByRole("button", { name: "Hoja de cuaderno rasgada" }).click(); await page.waitForTimeout(500);
  await tab("Mis frases").click(); await settle(600);
  await shot("04-bandeja-frases");
  await page.locator("#collage-bandeja").getByRole("button").first().click(); await page.waitForTimeout(1200);
  ok("agregar frase", (await page.locator("[data-capa]").count()) === 5);

  // ---- Gestos con toques reales (CDP) sobre la última pieza (la frase).
  const cdp = await context.newCDPSession(page);
  const caja = async (sel) => page.locator(sel).last().boundingBox();
  const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  const transformDe = async () => page.locator("[data-capa]").last().evaluate((el) => el.style.transform);
  let b = await caja("[data-capa]");
  const c0 = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  // Arrastre
  await toque("touchStart", [c0]);
  for (let i = 1; i <= 6; i++) { await toque("touchMove", [{ x: c0.x - i * 8, y: c0.y + i * 6 }]); await page.waitForTimeout(16); }
  await toque("touchEnd", []);
  const b2 = await caja("[data-capa]");
  ok("arrastrar mueve la pieza", Math.abs(b2.x - b.x) > 20, `${Math.round(b2.x - b.x)} px`);
  // Pellizco + giro
  const t0 = await transformDe();
  b = await caja("[data-capa]");
  const cc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await toque("touchStart", [{ x: cc.x - 30, y: cc.y }]);
  await toque("touchStart", [{ x: cc.x - 30, y: cc.y }, { x: cc.x + 30, y: cc.y }]);
  for (let i = 1; i <= 8; i++) { const r = 30 + i * 6, a = (i * 4 * Math.PI) / 180; await toque("touchMove", [{ x: cc.x - r * Math.cos(a), y: cc.y - r * Math.sin(a) }, { x: cc.x + r * Math.cos(a), y: cc.y + r * Math.sin(a) }]); await page.waitForTimeout(16); }
  await toque("touchEnd", []);
  const t1 = await transformDe();
  const sc = (t) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1] || 0), ro = (t) => Number(/rotate\((-?[\d.]+)deg\)/.exec(t)?.[1] || 0);
  ok("pellizcar escala", sc(t1) > sc(t0) * 1.5, `${sc(t0).toFixed(2)} → ${sc(t1).toFixed(2)}`);
  ok("dos dedos giran", Math.abs(ro(t1) - ro(t0)) > 20, `${ro(t0).toFixed(0)}° → ${ro(t1).toFixed(0)}°`);
  // Modo capas: mantener presionada la pieza que queda bajo el dedo (la de arriba) y deslizar hacia abajo la manda atrás.
  const bp = await page.locator(".sema-collage-lienzo").boundingBox();
  const pp = { x: bp.x + bp.width / 2, y: bp.y + bp.height * 0.45 };
  const idPrimera = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-capa]")?.dataset.capa, pp);
  const zAntes = await page.locator(`[data-capa="${idPrimera}"]`).evaluate((el) => Number(el.style.zIndex));
  await toque("touchStart", [pp]);
  await page.waitForTimeout(600);
  ok("mantener presionado activa modo capas", (await page.locator(".sema-collage-capa--capas").count()) === 1);
  await shot("05-modo-capas");
  for (let i = 1; i <= 6; i++) { await toque("touchMove", [{ x: pp.x, y: pp.y + i * 15 }]); await page.waitForTimeout(16); }
  await toque("touchEnd", []);
  const zSube = await page.locator(`[data-capa="${idPrimera}"]`).evaluate((el) => Number(el.style.zIndex));
  ok("deslizar abajo baja de capa", zSube === zAntes - 2, `z ${zAntes} → ${zSube}`);
  // Deshacer / rehacer
  await page.getByRole("button", { name: "Deshacer" }).click(); await page.waitForTimeout(200);
  const zDeshecho = await page.locator(`[data-capa="${idPrimera}"]`).evaluate((el) => Number(el.style.zIndex));
  ok("deshacer", zDeshecho === zAntes, `z ${zDeshecho}`);
  await page.getByRole("button", { name: "Rehacer" }).click(); await page.waitForTimeout(200);
  // Seleccionada con barra de pieza
  b = await caja(`[data-capa="${idPrimera}"]`);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300);
  ok("barra de pieza visible", (await page.getByRole("toolbar", { name: "Pieza elegida" }).count()) === 1);
  await shot("06-editor-pieza-elegida");
  // Arrastrar al bote borra
  const n0 = await page.locator("[data-capa]").count();
  b = await caja(`[data-capa="${idPrimera}"]`);
  const pb = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await toque("touchStart", [pb]);
  await toque("touchMove", [{ x: pb.x + 12, y: pb.y + 12 }]);
  await page.waitForTimeout(80);
  const bote = await page.evaluate(() => { const el = document.querySelector("[data-bote]"); const r = el?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
  ok("el bote aparece al arrastrar", !!bote);
  if (bote) { for (let i = 1; i <= 12; i++) { await toque("touchMove", [{ x: pb.x, y: pb.y + (bote.y - pb.y) * i / 12 }]); await page.waitForTimeout(30); } }
  await shot("07-arrastrar-al-bote");
  await toque("touchEnd", []);
  await page.waitForTimeout(200);
  ok("soltar en el bote borra", (await page.locator("[data-capa]").count()) === n0 - 1);
  await page.getByRole("button", { name: "Deshacer" }).click(); await page.waitForTimeout(300);

  // Sets bloqueados
  await tab("Stickers").click(); await page.waitForTimeout(400);
  await page.locator("#collage-bandeja").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(300);
  await shot("08-bandeja-bloqueados");
  await page.getByRole("button", { name: /Psicodélico, bloqueado/ }).click(); await page.waitForTimeout(400);
  await shot("09-hoja-set-racha");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Sellos de planta, bloqueado/ }).click(); await page.waitForTimeout(400);
  await shot("10-hoja-set-gemas");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);

  // 1:1
  await page.getByRole("radio", { name: "Cuadrado 1:1" }).click(); await page.waitForTimeout(400);
  await shot("11-editor-cuadrado");
  await page.getByRole("radio", { name: "Historia 9:16" }).click(); await page.waitForTimeout(400);

  // Listo → Guardar (modo local)
  await page.getByRole("button", { name: "Listo" }).click(); await page.waitForTimeout(400);
  await shot("12-hoja-listo");
  await page.getByRole("button", { name: /^Guardar/ }).click(); await settle(800);
  await page.getByRole("button", { name: "Cerrar" }).first().click(); await settle(800);
  ok("guardado aparece en Mis collages", (await page.getByRole("button", { name: /Editar collage 1/ }).count()) === 1);
  await shot("13-mis-collages");

  // Celebración (solo dev)
  await page.goto(`${BASE}/?collage=premio`); await settle(2600);
  await shot("14-celebracion-set");

  if (errores.length) console.log("   errores de consola:", [...new Set(errores)].slice(0, 8));
  await context.close();
}
await browser.close();
console.log(resultados.join("\n"));

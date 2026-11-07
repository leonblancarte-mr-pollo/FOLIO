// scripts/captura-collage-sets-nuevos.mjs — Collages: verifica Subrayado, Sin señal, Floritas y Vieja escuela (2026-11-07).
// 1) Sin inventario: Subrayado (inicial) sale abierto; Sin señal, Floritas y Vieja escuela, bloqueados con su muestra.
// 2) Con los tres desbloqueados SOLO en el navegador de prueba (se simula collage_mi_estado y, en modo local, el
//    localStorage sema_collages_v1:<user>): cuenta las piezas por set y agrega un sticker de cada uno al lienzo.
//    No escribe en Supabase (bloquea escrituras). Uso (con «npm run dev»):  node scripts/captura-collage-sets-nuevos.mjs
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
dotenv.config({ path: ".env.local", quiet: true });
const BASE = process.env.SEMA_BASE_URL || "http://localhost:5173";
const OUT = "capturas/collage";
fs.mkdirSync(OUT, { recursive: true });
const NUEVOS = [["Subrayado", 6, "Libro con ojo"], ["Sin señal", 8, "Monitor con ojo"], ["Floritas", 6, "Amarilla"], ["Vieja escuela", 14, "Golondrina"]];
const DESBLOQ = ["cables", "flores", "tatuaje"];
const b = await chromium.launch();
const res = [];
for (const modo of ["claro", "oscuro"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => { if (r.url().includes("/collage/") && r.status() >= 400) errores.push(`${r.status()} ${r.url()}`); });
  await page.route((u) => /\/rest\/v1\/(collages|posts|quotes)/.test(u.pathname) || /\/storage\/v1\/object/.test(u.pathname), (r) => r.request().method() !== "GET" ? r.fulfill({ status: 403, body: "{}" }) : r.continue());
  let simular = false;
  await page.route((u) => u.pathname.endsWith("/rpc/collage_mi_estado"), async (r) => {
    if (!simular) return r.continue();
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, plus: false, sets: DESBLOQ, fallos_seguidos: 0, limite: 5, usados: 0 }) });
  });
  await page.addInitScript((t) => localStorage.setItem("folio_theme", t), modo === "oscuro" ? "dark" : "light");
  await page.goto(BASE); await page.waitForTimeout(2500);
  if (!(await page.locator('[data-tutorial="nav-home"]').count())) {
    await page.locator('input[type="email"]').first().fill(process.env.SEMA_TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(process.env.SEMA_TEST_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.locator('[data-tutorial="nav-home"]').waitFor({ timeout: 20000 });
  }
  const uid = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); return JSON.parse(localStorage.getItem(k)).user.id; });
  const abrir = async () => {
    await page.locator('[data-tutorial="nav-collage"]').click(); await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Nuevo collage" }).click(); await page.waitForTimeout(1500);
  };
  const bandeja = page.locator("#collage-bandeja");
  const ir = async (nombre) => {
    if (!(await bandeja.count())) { await page.getByRole("tab", { name: "Stickers" }).click().catch(() => {}); await page.waitForTimeout(400); }
    const y = await bandeja.evaluate((el, n) => { const h = [...el.querySelectorAll("h3")].find((x) => x.textContent === n); return h ? h.offsetTop - 8 : -1; }, nombre);
    if (y >= 0) await bandeja.evaluate((el, yy) => { el.scrollTop = yy; }, y);
    await page.waitForTimeout(500);
    return y >= 0;
  };

  // 1) Sin inventario.
  await page.evaluate((u) => localStorage.removeItem(`sema_collages_v1:${u}`), uid);
  await abrir();
  for (const [n] of NUEVOS) {
    const bloq = await page.getByRole("button", { name: new RegExp(`^${n}, bloqueado`) }).count();
    res.push(`${modo} sin inventario ${n}: ${n === "Subrayado" ? `en la bandeja: ${await ir(n)}` : `bloqueado: ${bloq}`}`);
  }
  await ir("Subrayado");
  await page.screenshot({ path: `${OUT}/2026-11-07-01-bandeja-subrayado-${modo}.png` });
  await bandeja.evaluate((el) => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/2026-11-07-02-bandeja-bloqueados-fin-${modo}.png` });
  await page.getByRole("button", { name: "Cerrar" }).first().click(); await page.waitForTimeout(500);

  // 2) Con los tres desbloqueados (solo en este navegador).
  simular = true;
  await page.evaluate(([u, s]) => localStorage.setItem(`sema_collages_v1:${u}`, JSON.stringify({ sets: s, fallos: 0, eventos: [], collages: [] })), [uid, DESBLOQ]);
  await page.reload(); await page.waitForTimeout(2500);
  await abrir();
  let i = 3;
  for (const [n, esperadas, pieza] of NUEVOS) {
    const hay = await ir(n);
    res.push(`${modo} piezas ${n}: ${hay ? await bandeja.evaluate((el, nn) => { const h = [...el.querySelectorAll("h3")].find((x) => x.textContent === nn); return h.parentElement.nextElementSibling.querySelectorAll("button").length; }, n) : "no está"} (esperadas ${esperadas})`);
    await page.screenshot({ path: `${OUT}/2026-11-07-0${i++}-bandeja-${n.toLowerCase().replace(/[^a-z]+/g, "-")}-${modo}.png` });
    if (!(await bandeja.count())) await page.getByRole("tab", { name: "Stickers" }).click();
    const btn = bandeja.getByRole("button", { name: pieza, exact: true }).first();
    await btn.scrollIntoViewIfNeeded(); await btn.click(); await page.waitForTimeout(700);
  }
  res.push(`${modo} capas en el lienzo: ${await page.locator("[data-capa]").count()} (esperadas 4)`);
  await page.locator(".sema-collage-lienzo").click({ position: { x: 5, y: 5 } }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/2026-11-07-07-lienzo-sets-nuevos-${modo}.png` });
  await page.evaluate((u) => localStorage.removeItem(`sema_collages_v1:${u}`), uid);
  res.push(`${modo} errores: ${JSON.stringify([...new Set(errores)])}`);
  await ctx.close();
}
await b.close();
console.log(res.join("\n"));

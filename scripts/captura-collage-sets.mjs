// scripts/captura-collage-sets.mjs — Collages: verifica los sets de stickers en la bandeja (2026-11-06).
// 1) Sin inventario: los sets bloqueados salen con su muestra opaca y candado; captura la hoja de Arcanos.
// 2) Con sets desbloqueados SOLO en el navegador de prueba (modo local, localStorage sema_collages_v1:<user>):
//    cuenta las piezas visibles por set y agrega stickers al lienzo. No escribe en Supabase (bloquea escrituras).
// Uso (con «npm run dev»):  node scripts/captura-collage-sets.mjs      (SEMA_BASE_URL opcional)
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
dotenv.config({ path: ".env.local", quiet: true });
const BASE = process.env.SEMA_BASE_URL || "http://localhost:5173";
const OUT = "capturas/collage";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const res = [];
for (const modo of ["claro", "oscuro"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => { if (r.url().includes("/collage/") && r.status() >= 400) errores.push(`${r.status()} ${r.url()}`); });
  await page.route((u) => /\/rest\/v1\/(collages|posts|quotes)/.test(u.pathname) || /\/storage\/v1\/object/.test(u.pathname), (r) => r.request().method() !== "GET" ? r.fulfill({ status: 403, body: "{}" }) : r.continue());
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
  // 1) Inventario vacío: los sets nuevos salen bloqueados con su muestra.
  await page.evaluate((u) => localStorage.removeItem(`sema_collages_v1:${u}`), uid);
  await abrir();
  for (const n of ["Nevermore", "Arcanos", "Lado B"]) res.push(`${modo} bloqueado ${n}: ${await page.getByRole("button", { name: new RegExp(`^${n}, bloqueado`) }).count()}`);
  await bandeja.evaluate((el) => { el.scrollTop = el.scrollHeight - el.clientHeight - 520; }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/2026-11-06-16-bandeja-sets-nuevos-bloqueados-${modo}.png` });
  await bandeja.evaluate((el) => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/2026-11-06-17-bandeja-sets-nuevos-bloqueados-fin-${modo}.png` });
  await page.getByRole("button", { name: /^Arcanos, bloqueado/ }).click(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/2026-11-06-18-hoja-arcanos-${modo}.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Cerrar" }).first().click(); await page.waitForTimeout(500);

  // 2) Con los sets desbloqueados (solo en este navegador, modo local): aparecen completos y se agregan.
  await page.evaluate((u) => localStorage.setItem(`sema_collages_v1:${u}`, JSON.stringify({ sets: ["poe", "tarot", "musica", "trance"], fallos: 0, eventos: [], collages: [] })), uid);
  await page.reload(); await page.waitForTimeout(2500);
  await abrir();
  const y = await bandeja.evaluate((el) => { const h = [...el.querySelectorAll("h3")].find((x) => x.textContent === "Nevermore"); return h ? h.offsetTop - 8 : 0; });
  await bandeja.evaluate((el, yy) => { el.scrollTop = yy; }, y); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/2026-11-06-19-bandeja-nevermore-${modo}.png` });
  for (const n of ["Nevermore", "Arcanos", "Lado B"]) res.push(`${modo} piezas ${n}: ${await bandeja.evaluate((el, nn) => { const h = [...el.querySelectorAll("h3")].find((x) => x.textContent === nn); return h ? h.parentElement.nextElementSibling.querySelectorAll("button").length : -1; }, n)}`);
  for (const [n, pieza] of [["Nevermore", "Cuervo"], ["Arcanos", "La Luna"], ["Lado B", "Casete"], ["Lado B", "Vinil"]]) {
    if (!(await bandeja.count())) await page.getByRole("tab", { name: "Stickers" }).click();
    await page.waitForTimeout(300);
    await bandeja.getByRole("button", { name: pieza, exact: true }).first().scrollIntoViewIfNeeded();
    await bandeja.getByRole("button", { name: pieza, exact: true }).first().click();
    await page.waitForTimeout(700);
  }
  res.push(`${modo} capas en el lienzo: ${await page.locator("[data-capa]").count()}`);
  await page.locator(".sema-collage-lienzo").click({ position: { x: 5, y: 5 } }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/2026-11-06-20-lienzo-sets-nuevos-${modo}.png` });
  await page.getByRole("tab", { name: "Stickers" }).click(); await page.waitForTimeout(300);
  const y2 = await bandeja.evaluate((el) => { const h = [...el.querySelectorAll("h3")].find((x) => x.textContent === "Arcanos"); return h ? h.offsetTop - 8 : 0; });
  await bandeja.evaluate((el, yy) => { el.scrollTop = yy; }, y2); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/2026-11-06-21-bandeja-arcanos-ladob-${modo}.png` });
  await page.evaluate((u) => localStorage.removeItem(`sema_collages_v1:${u}`), uid);
  res.push(`${modo} errores: ${JSON.stringify([...new Set(errores)])}`);
  await ctx.close();
}
await b.close();
console.log(res.join("\n"));

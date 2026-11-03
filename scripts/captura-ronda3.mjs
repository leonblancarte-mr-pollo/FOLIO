// scripts/captura-ronda3.mjs — capturas de la ronda 3 (2026-11-02). Copia la rutina de scripts/captura.js (skill sema-capturas) y
// agrega zonas: home, cuento (Social arriba), para-ti (Explorar → Para ti, contesta las 5 preguntas
// y espera la respuesta de /api/anthropic). Salida: capturas/ronda3-2026-11-02/<zona>-<fase>-<modo>.png
// Uso: node scripts/captura-ronda3.mjs <zona> <fase> [claro|oscuro|ambos] [--width=375] [--full]
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/leons/OneDrive/Escritorio/FOLIO FINAL";
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });
const [zona, fase, modoArg = "ambos", ...rest] = process.argv.slice(2);
const fullPage = rest.includes("--full");
const widthArg = rest.find((r) => r.startsWith("--width="));
const width = widthArg ? Number(widthArg.split("=")[1]) : 390;
const EMAIL = process.env.SEMA_TEST_EMAIL, PASSWORD = process.env.SEMA_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error("faltan credenciales"); process.exit(1); }
const BASE = process.env.SEMA_BASE_URL || "http://localhost:5173";
const modos = modoArg === "ambos" ? ["claro", "oscuro"] : [modoArg];
const outDir = path.join(ROOT, "capturas", "ronda3-2026-11-02");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));
// Red: registra lo que responde /api/anthropic (sin cuerpos de petición, nunca credenciales).
page.on("response", async (r) => {
  if (r.url().includes("/api/anthropic")) {
    let body = ""; try { body = (await r.text()).slice(0, 300); } catch {}
    console.log(`[red] ${r.request().method()} ${r.url()} -> ${r.status()} | ${body.replace(/\s+/g, " ")}`);
  }
});

async function settle() {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
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
async function paraTi() {
  await goTo("explorar");
  await page.getByRole("button", { name: "Para ti" }).first().click().catch(() => {});
  await settle();
  // Contesta las 4 encuestas (primera opción) y la 5.ª con texto.
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
  // Espera a que termine de pensar (hasta 60 s).
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 60000 }).catch(() => console.log("[red] timeout esperando respuesta"));
  await settle();
}

await login();
for (const modo of modos) {
  await page.evaluate((v) => localStorage.setItem("folio_theme", v), modo === "oscuro" ? "dark" : "light");
  await page.reload(); await settle();
  if (zona === "home") await goTo("home");
  else if (zona === "cuento") { await goTo("social"); await page.locator('[data-tutorial="snacks-hero"]').scrollIntoViewIfNeeded(); await page.evaluate(() => { const el = document.querySelector('[data-tutorial="snacks-hero"]'); window.scrollBy(0, el.getBoundingClientRect().top - 72); }); await page.waitForTimeout(900); }
  else if (zona === "para-ti") await paraTi();
  else if (zona === "explorar") await goTo("explorar");
  const file = path.join(outDir, `${zona}${width !== 390 ? "-" + width : ""}-${fase}-${modo}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`[captura] ${file}`);
}
await page.evaluate(() => localStorage.setItem("folio_theme", "light"));
if (consoleErrors.length) { console.log(`[captura] Errores de consola (${consoleErrors.length}):`); for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log("  - " + e.slice(0, 260)); }
await browser.close();

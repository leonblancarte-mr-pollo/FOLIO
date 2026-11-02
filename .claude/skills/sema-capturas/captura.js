// scripts/captura.js — capturas de revisión visual de SEMA (skill sema-capturas).
// Plantilla: .claude/skills/sema-capturas/captura.js. Si scripts/captura.js no existe, se copia tal cual.
//
// Uso (con `npm run dev` corriendo en otra terminal):
//   node scripts/captura.js <pantalla> <antes|despues> [claro|oscuro|ambos] [--full]
//   node scripts/captura.js home antes            → capturas/home/2026-11-02-antes-claro.png y -oscuro.png
//   node scripts/captura.js perfil despues oscuro --full
//
// Pantallas: home · explorar · social · perfil · mascota
// Variables (.env.local): SEMA_TEST_EMAIL, SEMA_TEST_PASSWORD (obligatorias), SEMA_BASE_URL (opcional,
// por defecto http://localhost:5173). Las credenciales NUNCA se imprimen.
//
// Tema: la app lo lee de localStorage `folio_theme` (light/dark). El script solo escribe ese valor en el
// navegador de prueba de Playwright; no cambia la clave ni el código de la app.

import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });

const SCREENS = ["home", "explorar", "social", "perfil", "mascota"];
const [pantalla, fase, modoArg = "ambos", ...rest] = process.argv.slice(2);
const fullPage = rest.includes("--full");

function fail(msg) { console.error(`[captura] ${msg}`); process.exit(1); }

if (!SCREENS.includes(pantalla)) fail(`Pantalla inválida. Usa una de: ${SCREENS.join(", ")}`);
if (!["antes", "despues"].includes(fase)) fail("La fase debe ser «antes» o «despues».");
if (!["claro", "oscuro", "ambos"].includes(modoArg)) fail("El modo debe ser «claro», «oscuro» o «ambos».");

const EMAIL = process.env.SEMA_TEST_EMAIL;
const PASSWORD = process.env.SEMA_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) fail("Faltan SEMA_TEST_EMAIL / SEMA_TEST_PASSWORD en .env.local (ver skill sema-capturas).");

const BASE = process.env.SEMA_BASE_URL || "http://localhost:5173";
const modos = modoArg === "ambos" ? ["claro", "oscuro"] : [modoArg];

const d = new Date();
const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const outDir = path.join("capturas", pantalla);
fs.mkdirSync(outDir, { recursive: true });

try { await fetch(BASE, { signal: AbortSignal.timeout(5000) }); }
catch { fail(`No responde ${BASE}. Levanta la app con «npm run dev» y vuelve a correr el script.`); }

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-MX",
  timezoneId: "America/Mexico_City",
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

async function settle() {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // skeletons (200 ms) + animaciones de entrada
}

async function login() {
  await page.goto(BASE);
  await settle();
  const nav = page.locator('[data-tutorial="nav-home"]');
  if (await nav.count()) return; // sesión ya abierta
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await nav.waitFor({ timeout: 20000 }).catch(() =>
    fail("El login no llegó a la app (credenciales, onboarding sin terminar o error). Revisa a mano con el usuario de prueba."));
  await settle();
}

async function goTo(screen) {
  await page.keyboard.press("Escape").catch(() => {}); // cierra tutorial/hojas abiertas
  await page.locator(`[data-tutorial="nav-${screen}"]`).first().click();
  await settle();
}

await login();

for (const modo of modos) {
  await page.evaluate((v) => localStorage.setItem("folio_theme", v), modo === "oscuro" ? "dark" : "light");
  await page.reload();
  await settle();
  await goTo(pantalla);
  const file = path.join(outDir, `${fecha}-${fase}-${modo}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`[captura] ${file}`);
}

// Deja el navegador de prueba en claro (no afecta al navegador de León).
await page.evaluate(() => localStorage.setItem("folio_theme", "light"));

if (consoleErrors.length) {
  console.log(`[captura] Errores de consola (${consoleErrors.length}):`);
  for (const e of [...new Set(consoleErrors)].slice(0, 20)) console.log("  - " + e.slice(0, 300));
} else {
  console.log("[captura] Consola sin errores.");
}

await browser.close();

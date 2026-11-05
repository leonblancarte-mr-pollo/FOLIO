// Capturas de la mascota Lottie. Uso (desde la raíz del proyecto):
//   node scripts/captura-mascota.mjs <baseURL> <outDir> [tag] [--estados] [--sinlogin]
// Inicio y Mascota en claro y oscuro (390×844) + los cuatro estados (?mascota=, solo en dev).
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
const [BASE, OUT, TAG = "", ...flags] = process.argv.slice(2);
const conEstados = flags.includes("--estados");
fs.mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.SEMA_TEST_EMAIL, PASSWORD = process.env.SEMA_TEST_PASSWORD;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: "es-MX", timezoneId: "America/Mexico_City", serviceWorkers: "block", // sin SW: sus peticiones no pasan por page.route
});
const page = await context.newPage();
// Preview protegida de Vercel: con `vc env run -- node scripts/captura-mascota.mjs …` se añade la cabecera
// de Trusted Sources SOLO a las peticiones del origen del despliegue (nunca a Supabase). El token no se imprime.
if (process.env.VERCEL_OIDC_TOKEN && !BASE.includes("localhost")) {
  const origen = new URL(BASE).origin;
  await page.route((url) => url.origin === origen, (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } }));
}
const errores = [];
const mascotaReq = [];
page.on("console", (m) => { if (m.type() === "error" || /\[mascota\]/.test(m.text())) errores.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errores.push("pageerror: " + String(e)));
page.on("requestfinished", (r) => { if (/gato-|lottie|index-.*\.js/.test(r.url())) mascotaReq.push(r.url().split("/").pop()); });

async function settle(ms = 2500) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}
async function login(url) {
  await page.goto(url);
  await settle();
  const nav = page.locator('[data-tutorial="nav-home"]');
  if (await nav.count()) return;
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await nav.waitFor({ timeout: 30000 });
  await settle();
}
async function info() {
  return page.evaluate(() => [...document.querySelectorAll("[data-mascota]")].map((e) => {
    const r = e.getBoundingClientRect();
    return `${e.dataset.estado} ${Math.round(r.width)}x${Math.round(r.height)} svg=${!!e.querySelector("svg")}`;
  }));
}
async function shot(nombre) {
  const f = path.join(OUT, `${nombre}.png`);
  await page.screenshot({ path: f });
  console.log(f, JSON.stringify(await info()));
}

const q = (extra) => `${BASE}/${extra ? "?" + extra : ""}`;
await login(q(""));
for (const modo of ["claro", "oscuro"]) {
  await page.evaluate((v) => localStorage.setItem("folio_theme", v), modo === "oscuro" ? "dark" : "light");
  await page.goto(q(""));
  await settle(3500);
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator('[data-tutorial="nav-home"]').first().click();
  await settle(3000);
  await shot(`${TAG}inicio-${modo}`);
  await page.locator('button[aria-label^="Ver a"]').first().click();
  await settle(3000);
  await shot(`${TAG}mascota-${modo}`);
  await page.keyboard.press("Escape").catch(() => {});
}
if (conEstados) {
  await page.evaluate(() => localStorage.setItem("folio_theme", "light"));
  for (const est of ["leyendo", "dormido", "celebrando", "cafe"]) {
    await page.goto(q(`mascota=${est}`));
    await settle(est === "celebrando" ? 1800 : 3000);
    await page.locator('[data-tutorial="nav-home"]').first().click().catch(() => {});
    await page.waitForTimeout(est === "celebrando" ? 600 : 1500);
    await shot(`${TAG}estado-${est}`);
  }
}
await page.evaluate(() => localStorage.setItem("folio_theme", "light"));
console.log("Peticiones de mascota:", [...new Set(mascotaReq)].filter((u) => /gato|lottie/.test(u)).join(", ") || "(ninguna con ese nombre)");
console.log(errores.length ? "Consola:\n  " + [...new Set(errores)].slice(0, 25).join("\n  ") : "Consola sin errores.");
await browser.close();

// ============ COLLAGES: DOCUMENTO Y RENDER (2026-11-06) ============
// Un collage es un documento JSON (se guarda tal cual en collages.doc):
//   {
//     v: 1,
//     formato: "historia" | "cuadrado",               // 1080×1920 o 1080×1080 (unidades lógicas)
//     fondo: { tipo: "color", id, hex } | { tipo: "textura", ref, src },
//     capas: [                                          // orden = capa (la última va al frente)
//       { id, tipo: "objeto", ref, src, x, y, w, h, s, r },
//       { id, tipo: "frase",  frase: { texto, libro, autor, quoteId }, estilo, x, y, w, h, s, r },
//     ]
//   }
// x, y = centro en unidades lógicas (0..1080 × 0..alto); w, h = tamaño base; s = escala; r = giro en grados.
// Cada capa guarda `src` además de `ref`: si el catálogo cambia, el collage sigue viéndose igual.
// Tipos pensados para después (fuera del MVP): "foto" (subida propia), "texto" (texto libre) y `recorte`
// (polígono de recorte por capa). El render ignora tipos que no conoce en vez de romperse.
//
// TODO se dibuja con imágenes: los stickers y papeles son WebP; las frases se dibujan una vez a un canvas
// (recorte de revista) y se usan como imagen. Así el editor (DOM) y la exportación (canvas) coinciden.
import { SEMA_FONTS, stableHash } from "../../theme.js";
import { getEstiloFrase, altoFormato, LIENZO } from "../../services/collageCatalog.js";

const ANCHO = LIENZO.ancho;
const FUENTE = { quote: SEMA_FONTS.quote, label: SEMA_FONTS.label, display: SEMA_FONTS.display, ui: SEMA_FONTS.ui };

// ---------------------------------------------------------------- imágenes
const _imgs = new Map();
function cargarImagen(src) {
  if (!src) return Promise.reject(new Error("sin src"));
  if (_imgs.has(src)) return _imgs.get(src);
  const p = new Promise((res, rej) => {
    const img = new Image();
    img.decoding = "async";
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => { _imgs.delete(src); rej(new Error(`no cargó ${src}`)); };
    img.src = src;
  });
  _imgs.set(src, p);
  return p;
}

// ---------------------------------------------------------------- frases (recorte de revista)
let _fuentesListas = null;
function fuentesListas() {
  if (_fuentesListas) return _fuentesListas;
  if (typeof document === "undefined" || !document.fonts?.load) return (_fuentesListas = Promise.resolve());
  _fuentesListas = Promise.all([
    document.fonts.load(`italic 64px ${FUENTE.quote}`), document.fonts.load(`64px ${FUENTE.quote}`),
    document.fonts.load(`700 40px ${FUENTE.label}`), document.fonts.load(`40px ${FUENTE.label}`),
    document.fonts.load(`800 46px ${FUENTE.display}`), document.fonts.load(`600 28px ${FUENTE.ui}`),
  ]).catch(() => {});
  return _fuentesListas;
}

function rngDe(semilla) {
  let h = stableHash(String(semilla)) || 1;
  return () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0; return (h >>> 0) / 4294967296; };
}

function partirLineas(ctx, texto, maxW) {
  const palabras = texto.replace(/\s+/g, " ").trim().split(" ");
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= maxW || !actual) actual = prueba;
    else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function caminoRasgado(ctx, x, y, w, h, rng, amp) {
  const paso = 14;
  const punto = (px, py) => ctx.lineTo(px, py);
  ctx.beginPath();
  ctx.moveTo(x, y + rng() * amp);
  for (let i = paso; i < w; i += paso) punto(x + i, y + rng() * amp);
  for (let j = 0; j < h; j += paso) punto(x + w - rng() * amp, y + j);
  for (let i = w; i > 0; i -= paso) punto(x + i, y + h - rng() * amp);
  for (let j = h; j > 0; j -= paso) punto(x + rng() * amp, y + j);
  ctx.closePath();
}

const _frases = new Map();
// Dibuja la frase como recorte. Devuelve { canvas, w, h } en unidades lógicas (1 px = 1 unidad).
async function renderFrase(frase, estiloId) {
  const estilo = getEstiloFrase(estiloId);
  const clave = `${estilo.id}|${frase.texto}|${frase.libro || ""}|${frase.autor || ""}`;
  if (_frases.has(clave)) return _frases.get(clave);
  await fuentesListas();
  const largo = (frase.texto || "").length;
  // Tamaño según lo largo de la frase: las cortas se leen como titular, las largas como párrafo.
  const tam = Math.round(estilo.tamano * (largo > 260 ? 0.62 : largo > 160 ? 0.74 : largo > 90 ? 0.86 : 1));
  const maxW = 700, pad = 44, amp = estilo.borde === "rasgado" ? 12 : 0, sombra = 18;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const fam = FUENTE[estilo.fuente] || FUENTE.quote;
  const fontTexto = estilo.fuente === "display" ? `800 ${tam}px ${fam}` : estilo.fuente === "label" ? `700 ${tam}px ${fam}` : `${tam}px ${fam}`;
  ctx.font = fontTexto;
  const texto = estilo.fuente === "display" ? (frase.texto || "").toUpperCase() : frase.texto || "";
  const lineas = partirLineas(ctx, texto, maxW);
  const altoLinea = Math.round(tam * (estilo.fuente === "display" ? 1.12 : 1.2));
  const credito = [frase.libro, frase.autor].filter(Boolean).join(" · ");
  const tamCred = 24;
  const fontCred = estilo.credito === "label" ? `700 ${tamCred}px ${FUENTE.label}` : `600 ${tamCred + 2}px ${FUENTE.ui}`;
  let anchoTexto = Math.max(...lineas.map((l) => ctx.measureText(l).width), 120);
  let lineasCred = [];
  if (credito) {
    ctx.font = fontCred;
    lineasCred = partirLineas(ctx, estilo.credito === "label" ? `— ${credito}`.toUpperCase() : `— ${credito}`, maxW);
    anchoTexto = Math.max(anchoTexto, ...lineasCred.map((l) => ctx.measureText(l).width));
  }
  const w = Math.ceil(Math.min(maxW, anchoTexto) + pad * 2 + amp * 2);
  const hTexto = lineas.length * altoLinea;
  const hCred = lineasCred.length ? 22 + lineasCred.length * (tamCred + 10) : 0;
  const h = Math.ceil(hTexto + hCred + pad * 2 + amp * 2);
  c.width = w + sombra * 2;
  c.height = h + sombra * 2;
  const rng = rngDe(clave);
  ctx.save();
  ctx.translate(sombra, sombra);
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = estilo.fondo;
  if (amp) caminoRasgado(ctx, 0, 0, w, h, rng, amp);
  else { ctx.beginPath(); ctx.rect(0, 0, w, h); }
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(sombra + pad + amp, sombra + pad + amp);
  ctx.fillStyle = estilo.tinta;
  ctx.textBaseline = "top";
  ctx.font = fontTexto;
  lineas.forEach((l, i) => ctx.fillText(l, 0, i * altoLinea + (altoLinea - tam) / 2));
  if (lineasCred.length) {
    ctx.font = fontCred;
    ctx.globalAlpha = 0.85;
    lineasCred.forEach((l, i) => ctx.fillText(l, 0, hTexto + 22 + i * (tamCred + 10)));
  }
  ctx.restore();
  const out = { canvas: c, w: c.width, h: c.height, url: null };
  _frases.set(clave, out);
  return out;
}
async function urlFrase(frase, estiloId) {
  const r = await renderFrase(frase, estiloId);
  if (!r.url) r.url = r.canvas.toDataURL("image/png");
  return r.url;
}

// ---------------------------------------------------------------- dibujo completo
function dibujarCubriendo(ctx, img, W, H) {
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k, h = img.height * k;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

// Dibuja el documento en un canvas de W px de ancho (la altura sale del formato).
// Marca chica «Sema» en la esquina inferior derecha de lo exportado. En 9:16 queda arriba de la franja que
// tapa la caja de respuesta de Instagram (~340 px de 1920). Papel blanco + tinta para leerse sobre cualquier fondo.
function dibujarMarca(ctx, W, H, formato) {
  const k = W / ANCHO;
  const tam = Math.round(30 * k);
  ctx.save();
  ctx.font = `800 ${tam}px ${FUENTE.display}`;
  const w = ctx.measureText("Sema").width + 28 * k, h = tam + 22 * k;
  const x = W - w - 40 * k, y = (formato === "historia" ? H - 360 * k : H - 40 * k) - h;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.fillStyle = "#483A58";
  ctx.textBaseline = "middle";
  ctx.fillText("Sema", x + 14 * k, y + h / 2 + 1);
  ctx.restore();
}

async function dibujarDoc(doc, W = ANCHO, { fondoOpaco = true, marca = false } = {}) {
  const H = Math.round(W * altoFormato(doc.formato) / ANCHO);
  const k = W / ANCHO;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const f = doc.fondo || {};
  if (fondoOpaco || f.tipo) {
    ctx.fillStyle = f.tipo === "color" && f.hex ? f.hex : "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
  }
  if (f.tipo === "textura" && f.src) {
    try { dibujarCubriendo(ctx, await cargarImagen(f.src), W, H); } catch (err) { console.warn("[collage] fondo:", err.message); }
  }
  for (const capa of doc.capas || []) {
    let img = null;
    try {
      if (capa.tipo === "objeto") img = await cargarImagen(capa.src);
      else if (capa.tipo === "frase") img = (await renderFrase(capa.frase, capa.estilo)).canvas;
      else continue; // tipo futuro: se ignora
    } catch (err) { console.warn("[collage] capa sin imagen:", capa.id, err.message); continue; }
    ctx.save();
    ctx.translate(capa.x * k, capa.y * k);
    ctx.rotate(((capa.r || 0) * Math.PI) / 180);
    const s = (capa.s || 1) * k;
    ctx.drawImage(img, (-capa.w / 2) * s, (-capa.h / 2) * s, capa.w * s, capa.h * s);
    ctx.restore();
  }
  if (marca) { await fuentesListas(); dibujarMarca(ctx, W, H, doc.formato); }
  return c;
}

const aBlob = (canvas, tipo, calidad) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob falló"))), tipo, calidad));

// PNG a 1080×1920 (historia) o 1080×1080 (feed).
async function exportarPNG(doc) { return aBlob(await dibujarDoc(doc, ANCHO, { marca: true }), "image/png"); }
// JPEG a 1080 de ancho para publicar (más ligero que PNG; el fondo siempre es opaco).
async function exportarJPEG(doc, calidad = 0.88) { return aBlob(await dibujarDoc(doc, ANCHO, { marca: true }), "image/jpeg", calidad); }
// Vista previa para la cuadrícula de «Mis collages» (data URL chica, se guarda con el collage).
async function vistaPrevia(doc, ancho = 270) { return (await dibujarDoc(doc, ancho)).toDataURL("image/jpeg", 0.72); }

// Documento vacío.
function docNuevo(formato = LIENZO.formatoInicial) {
  return { v: 1, formato, fondo: { tipo: "color", id: "blanco", hex: "#FFFFFF" }, capas: [] };
}

// Ajusta las capas al cambiar de formato: conserva la posición relativa al centro vertical.
function cambiarFormato(doc, formato) {
  if (doc.formato === formato) return doc;
  const h0 = altoFormato(doc.formato), h1 = altoFormato(formato);
  return { ...doc, formato, capas: doc.capas.map((c) => ({ ...c, y: h1 / 2 + (c.y - h0 / 2) * (h1 / h0 < 1 ? 0.62 : 1) })) };
}

export { ANCHO, cargarImagen, renderFrase, urlFrase, dibujarDoc, exportarPNG, exportarJPEG, vistaPrevia, docNuevo, cambiarFormato, fuentesListas };

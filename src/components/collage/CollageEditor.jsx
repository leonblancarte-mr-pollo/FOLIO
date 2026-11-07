// Editor de Collages (2026-11-06). Pantalla completa encima de la app.
// Lienzo propio (DOM + Pointer Events; la exportación se dibuja en canvas con collageRender), sin librerías:
//   · 1 dedo sobre una pieza: arrastrar. Si se suelta encima del bote, se borra.
//   · 2 dedos: pellizcar para escalar y girar (el segundo dedo puede caer fuera de la pieza).
//   · Mantener presionada una pieza (~0.4 s sin moverla): «modo capas» (vibra y se resalta); deslizar hacia
//     arriba la sube de capa y hacia abajo la baja, un paso cada 40 px.
//   · Teclado (escritorio): flechas mueven, Supr borra, Ctrl+Z / Ctrl+Y deshacen y rehacen; rueda = escala.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { X, Undo2, Redo2, Trash2, BringToFront, SendToBack, Palette as PaletteIcon, Lock, Gem, Save, Send, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { palette, display, body } from "../../theme.js";
import { haptic } from "../../haptics.js";
import { getObjeto, siguienteEstiloFrase, altoFormato, LIENZO, LIMITES, ESTILOS_FRASE, COLORES_FONDO } from "../../services/collageCatalog.js";
import { guardarCollage, comprarSet, CollageError } from "../../services/collageService.js";
import { fetchQuotes } from "../../services/quotesService.js";
import { ANCHO, renderFrase, urlFrase, exportarPNG, vistaPrevia, docNuevo, cambiarFormato } from "./collageRender.js";
import { compartirArchivo } from "./collageCompartir.js";
import { CollageTray } from "./CollageTray.jsx";
import { CollageHoja, FilaHoja, BotonHoja } from "./CollageHoja.jsx";
import { CollagePublicar } from "./CollagePublicar.jsx";

const HIST_MAX = 60;
const PASO_CAPAS = 40;
const ESPERA_CAPAS = 420;
const nuevoIdCapa = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function CollageEditor({ user, collage, estado, gemBalance, onGemsChanged, onEstadoChanged, books, onClose, onSaved, onVerCollages }) {
  const [doc, setDocState] = useState(() => collage?.doc || docNuevo());
  const [collageId, setCollageId] = useState(collage?.id || null);
  const docRef = useRef(doc);
  const setDoc = useCallback((d) => { docRef.current = typeof d === "function" ? d(docRef.current) : d; setDocState(docRef.current); }, []);
  const pasado = useRef([]);
  const futuro = useRef([]);
  const [, forzar] = useState(0);
  const [sucio, setSucio] = useState(false);

  const [sel, setSel] = useState(null);
  const [modoCapas, setModoCapas] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [sobreBote, setSobreBote] = useState(false);
  const [bandeja, setBandeja] = useState({ abierta: true, tab: "stickers" });
  const [hoja, setHoja] = useState(null); // null | "listo" | "tope" | { bloqueado: set } | "publicar"
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // Formato elegido en la hoja «Compartir» (null = el del lienzo). Solo cambia lo exportado, no el lienzo.
  const [formatoCompartir, setFormatoCompartir] = useState(null);
  const [frases, setFrases] = useState(null);
  const [frasesCargando, setFrasesCargando] = useState(false);
  const [urls, setUrls] = useState({}); // clave de frase → data URL

  // Los avisos se cierran solos (no tapan el lienzo ni reciben toques).
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3500); return () => clearTimeout(t); }, [aviso]);
  // El editor es un diálogo: el foco entra a «Cerrar» y vuelve a donde estaba al salir.
  const cerrarRef = useRef(null);
  useEffect(() => { const previo = document.activeElement; cerrarRef.current?.focus(); return () => previo?.focus?.(); }, []);

  const areaRef = useRef(null);
  const stageRef = useRef(null);
  const boteRef = useRef(null);
  const [area, setArea] = useState({ w: 360, h: 560 });

  // ------------------------------------------------------------ historial
  const confirmar = useCallback((antes) => {
    pasado.current.push(antes);
    if (pasado.current.length > HIST_MAX) pasado.current.shift();
    futuro.current = [];
    setSucio(true);
    forzar((n) => n + 1);
  }, []);
  const cambiar = useCallback((fn) => { const antes = docRef.current; setDoc(fn(antes)); confirmar(antes); }, [setDoc, confirmar]);
  const deshacer = useCallback(() => {
    if (!pasado.current.length) return;
    futuro.current.push(docRef.current);
    setDoc(pasado.current.pop());
    setSucio(true); forzar((n) => n + 1);
  }, [setDoc]);
  const rehacer = useCallback(() => {
    if (!futuro.current.length) return;
    pasado.current.push(docRef.current);
    setDoc(futuro.current.pop());
    setSucio(true); forzar((n) => n + 1);
  }, [setDoc]);

  // ------------------------------------------------------------ medidas del lienzo
  const H = altoFormato(doc.formato);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stageW = Math.max(120, Math.min(area.w - 24, (area.h - 24) * (ANCHO / H)));
  const stageH = stageW * (H / ANCHO);
  const k = stageW / ANCHO;
  const kRef = useRef(k);
  kRef.current = k;

  // ------------------------------------------------------------ frases: imágenes de los recortes
  const claveFrase = (c) => `${c.estilo}|${c.frase.texto}|${c.frase.libro || ""}|${c.frase.autor || ""}`;
  useEffect(() => {
    let vivo = true;
    doc.capas.filter((c) => c.tipo === "frase" && !urls[claveFrase(c)]).forEach((c) => {
      urlFrase(c.frase, c.estilo).then((u) => { if (vivo) setUrls((m) => ({ ...m, [claveFrase(c)]: u })); }).catch((e) => console.warn("[collage] frase:", e.message));
    });
    return () => { vivo = false; };
  }, [doc.capas, urls]);

  useEffect(() => {
    if (bandeja.tab !== "frases" || frases || frasesCargando) return;
    setFrasesCargando(true);
    fetchQuotes(user.id)
      .then((q) => setFrases(q))
      .catch((err) => { console.error("[collage] frases:", err?.message || err); setFrases([]); setAviso("No cargaron las frases. Otro intento en un rato."); })
      .finally(() => setFrasesCargando(false));
  }, [bandeja.tab, frases, frasesCargando, user.id]);

  // ------------------------------------------------------------ agregar
  // Cerca del centro, con un poco de juego para que dos piezas seguidas no queden exactamente encimadas.
  const centro = () => ({ x: ANCHO / 2 + (Math.random() - 0.5) * 260, y: altoFormato(docRef.current.formato) / 2 + (Math.random() - 0.5) * 300 });
  const agregarObjeto = (o) => {
    const img = new Image();
    img.onload = () => {
      const base = o.categoria === "textura" ? 620 : 420;
      const kk = base / Math.max(img.naturalWidth, img.naturalHeight);
      const capa = { id: nuevoIdCapa(), tipo: "objeto", ref: o.id, src: o.archivo, ...centro(), w: Math.round(img.naturalWidth * kk), h: Math.round(img.naturalHeight * kk), s: 1, r: Math.round((Math.random() - 0.5) * 12) };
      cambiar((d) => ({ ...d, capas: [...d.capas, capa] }));
      setSel(capa.id);
      setBandeja((b) => ({ ...b, abierta: false }));
      haptic(12);
    };
    img.onerror = () => setAviso("Esa pieza no cargó. Otro intento.");
    img.src = o.archivo;
  };
  const agregarFrase = async (q) => {
    const frase = { texto: q.text, libro: q.bookTitle || null, autor: q.bookAuthor || null, quoteId: q.id };
    // Rota el estilo para que dos frases seguidas no salgan iguales.
    const usados = docRef.current.capas.filter((c) => c.tipo === "frase").length;
    const estilo = ESTILOS_FRASE[usados % ESTILOS_FRASE.length].id;
    const r = await renderFrase(frase, estilo);
    const s = Math.min(1, 900 / r.w);
    const capa = { id: nuevoIdCapa(), tipo: "frase", frase, estilo, ...centro(), w: r.w, h: r.h, s, r: Math.round((Math.random() - 0.5) * 6) };
    cambiar((d) => ({ ...d, capas: [...d.capas, capa] }));
    setSel(capa.id);
    setBandeja((b) => ({ ...b, abierta: false }));
    haptic(12);
  };
  const ponerFondo = (fondo) => cambiar((d) => ({ ...d, fondo }));
  const estiloSiguiente = async (id) => {
    const capa = docRef.current.capas.find((c) => c.id === id);
    if (!capa || capa.tipo !== "frase") return;
    const est = siguienteEstiloFrase(capa.estilo).id;
    const r = await renderFrase(capa.frase, est);
    cambiar((d) => ({ ...d, capas: d.capas.map((c) => (c.id === id ? { ...c, estilo: est, w: r.w, h: r.h, s: c.s * (c.w / r.w) } : c)) }));
  };

  // ------------------------------------------------------------ capas
  const mover = (d, id, paso) => {
    const i = d.capas.findIndex((c) => c.id === id);
    if (i < 0) return d;
    const j = paso === "frente" ? d.capas.length - 1 : paso === "fondo" ? 0 : clamp(i + paso, 0, d.capas.length - 1);
    if (i === j) return d;
    const capas = [...d.capas];
    const [c] = capas.splice(i, 1);
    capas.splice(j, 0, c);
    return { ...d, capas };
  };
  // Alternativas de un solo toque (y de teclado) al pellizco y al giro con dos dedos.
  const escalar = (id, f) => cambiar((d) => ({ ...d, capas: d.capas.map((c) => (c.id === id ? { ...c, s: clamp(c.s * f, 0.12, 8) } : c)) }));
  const girar = (id, gr) => cambiar((d) => ({ ...d, capas: d.capas.map((c) => (c.id === id ? { ...c, r: c.r + gr } : c)) }));
  const borrar = (id) => { cambiar((d) => ({ ...d, capas: d.capas.filter((c) => c.id !== id) })); setSel(null); haptic(20); };

  // ------------------------------------------------------------ gestos
  const g = useRef({ ptrs: new Map(), modo: null });
  const capaDe = (id) => docRef.current.capas.find((c) => c.id === id);
  const actualizarCapa = (id, patch) => setDoc((d) => ({ ...d, capas: d.capas.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const iniciarPinza = () => {
    const [a, b] = [...g.current.ptrs.values()];
    const st = g.current;
    st.modo = "pinza";
    st.base = { ...capaDe(st.id) };
    st.d0 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    st.a0 = Math.atan2(b.y - a.y, b.x - a.x);
    st.m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const enBote = (x, y) => {
    const r = boteRef.current?.getBoundingClientRect();
    return !!r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
  };
  const onPointerDown = (e) => {
    const st = g.current;
    stageRef.current?.setPointerCapture?.(e.pointerId);
    st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.ptrs.size === 1) {
      const el = e.target.closest?.("[data-capa]");
      if (!el) { setSel(null); st.modo = null; st.id = null; return; }
      const id = el.dataset.capa;
      setSel(id);
      st.modo = "pendiente"; st.id = id; st.base = { ...capaDe(id) }; st.ini = { x: e.clientX, y: e.clientY };
      st.antes = docRef.current; st.pasos = 0;
      clearTimeout(st.timer);
      st.timer = setTimeout(() => {
        if (st.modo !== "pendiente") return;
        st.modo = "capas"; setModoCapas(true); haptic([18, 30, 18]);
      }, ESPERA_CAPAS);
    } else if (st.ptrs.size === 2 && st.id && capaDe(st.id)) {
      clearTimeout(st.timer);
      setModoCapas(false); setArrastrando(false); setSobreBote(false);
      if (!st.antes) st.antes = docRef.current;
      iniciarPinza();
    }
  };
  const onPointerMove = (e) => {
    const st = g.current;
    if (!st.ptrs.has(e.pointerId)) return;
    st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const kk = kRef.current;
    if (st.modo === "pendiente" || st.modo === "arrastre") {
      const dx = e.clientX - st.ini.x, dy = e.clientY - st.ini.y;
      if (st.modo === "pendiente") {
        if (Math.hypot(dx, dy) < 8) return;
        clearTimeout(st.timer);
        st.modo = "arrastre"; setArrastrando(true);
      }
      actualizarCapa(st.id, { x: st.base.x + dx / kk, y: st.base.y + dy / kk });
      const over = enBote(e.clientX, e.clientY);
      setSobreBote((v) => { if (v !== over && over) haptic(10); return over; });
    } else if (st.modo === "capas") {
      const pasos = Math.trunc((st.ini.y - e.clientY) / PASO_CAPAS);
      if (pasos !== st.pasos) {
        const delta = pasos - st.pasos;
        st.pasos = pasos;
        setDoc((d) => mover(d, st.id, delta));
        haptic(8);
      }
    } else if (st.modo === "pinza" && st.ptrs.size >= 2) {
      const [a, b] = [...st.ptrs.values()];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      actualizarCapa(st.id, {
        s: clamp(st.base.s * (d / st.d0), 0.12, 8),
        r: st.base.r + ((ang - st.a0) * 180) / Math.PI,
        x: st.base.x + (m.x - st.m0.x) / kk,
        y: st.base.y + (m.y - st.m0.y) / kk,
      });
    }
  };
  const onPointerUp = (e) => {
    const st = g.current;
    st.ptrs.delete(e.pointerId);
    if (st.modo === "pinza" && st.ptrs.size === 1) {
      // Queda un dedo: sigue como arrastre desde donde está.
      const [p] = [...st.ptrs.values()];
      st.modo = "arrastre"; st.base = { ...capaDe(st.id) }; st.ini = { ...p };
      return;
    }
    if (st.ptrs.size > 0) return;
    clearTimeout(st.timer);
    const borrarlo = st.modo === "arrastre" && enBote(e.clientX, e.clientY);
    if (borrarlo && st.antes) {
      const id = st.id;
      setDoc((d) => ({ ...d, capas: d.capas.filter((c) => c.id !== id) }));
      confirmar(st.antes);
      setSel(null); haptic(25);
    } else if (st.antes && st.antes !== docRef.current) {
      confirmar(st.antes);
    }
    st.modo = null; st.antes = null;
    setModoCapas(false); setArrastrando(false); setSobreBote(false);
  };
  const onWheel = (e) => {
    if (!sel) return;
    const c = capaDe(sel);
    if (!c) return;
    const antes = docRef.current;
    if (e.shiftKey) actualizarCapa(sel, { r: c.r + (e.deltaY > 0 ? 5 : -5) });
    else actualizarCapa(sel, { s: clamp(c.s * (e.deltaY > 0 ? 0.94 : 1.06), 0.12, 8) });
    clearTimeout(g.current.rueda);
    g.current.rueda = setTimeout(() => confirmar(antes), 300);
  };

  // Teclado (escritorio y accesibilidad).
  useEffect(() => {
    const onKey = (e) => {
      if (hoja) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? rehacer() : deshacer(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); rehacer(); return; }
      if (!sel || !stageRef.current?.contains(e.target)) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); borrar(sel); return; }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); escalar(sel, 1.12); return; }
      if (e.key === "-") { e.preventDefault(); escalar(sel, 1 / 1.12); return; }
      if (e.key === "]" || e.key === "[") { e.preventDefault(); girar(sel, e.key === "]" ? 15 : -15); return; }
      const paso = e.shiftKey ? 40 : 10;
      const dir = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
      if (dir) { e.preventDefault(); const c = capaDe(sel); if (c) cambiar((d) => ({ ...d, capas: d.capas.map((x) => (x.id === sel ? { ...x, x: x.x + dir[0], y: x.y + dir[1] } : x)) })); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ------------------------------------------------------------ guardar / exportar
  const guardar = async () => {
    if (ocupado) return null;
    setOcupado(true); setAviso("");
    try {
      const preview = await vistaPrevia(docRef.current);
      const limite = estado?.plus ? null : estado?.limite ?? LIMITES.collagesSinPlus;
      const res = await guardarCollage(user.id, { id: collageId, formato: docRef.current.formato, doc: docRef.current, preview, limite });
      setCollageId(res.id);
      setSucio(false);
      onSaved?.(res);
      setAviso("Guardado.");
      return res;
    } catch (err) {
      if (err instanceof CollageError && err.code === "COLLAGE_LIMIT") { setHoja("tope"); return null; }
      console.error("[collage] guardar:", err);
      setAviso(err?.code === "LOCAL_FULL" ? "Ya no cabe en este navegador. Borra un collage viejo." : "No se guardó. Puede ser el internet; otro intento y listo.");
      return null;
    } finally {
      setOcupado(false);
    }
  };
  const compartirImagen = async () => {
    if (ocupado) return;
    setOcupado(true); setAviso("");
    try {
      // Se exporta en el formato elegido: si es distinto al del lienzo, se usa una copia (el lienzo no cambia).
      const f = formatoCompartir || docRef.current.formato;
      const docExp = f === docRef.current.formato ? docRef.current : cambiarFormato(docRef.current, f);
      const blob = await exportarPNG(docExp);
      const nombre = `sema-collage-${f === "cuadrado" ? "1080x1080" : "1080x1920"}.png`;
      const r = await compartirArchivo(blob, nombre, "Mi collage");
      if (r === "descargado") setAviso("Imagen descargada.");
    } catch (err) {
      console.error("[collage] exportar:", err);
      setAviso("No se pudo armar la imagen. Otro intento.");
    } finally {
      setOcupado(false);
    }
  };
  const cerrar = () => {
    if (sucio && docRef.current.capas.length) { setHoja("salir"); return; }
    onClose?.();
  };

  // ------------------------------------------------------------ compra de un set
  const comprar = async (set) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await comprarSet(set.id);
      onGemsChanged?.();
      await onEstadoChanged?.();
      setHoja(null);
    } catch (err) {
      const msg = {
        GEMS_INSUFFICIENT: "Todavía no alcanzan las gemas. Cada sesión de lectura suma.",
        GEMS_NO_BALANCE: "No pudimos leer tus gemas. Otro intento en un rato.",
        COLLAGE_RPC_MISSING: "La tienda se está actualizando. Vuelve en un rato.",
        SET_NOT_FOR_SALE: "Este set no está a la venta.",
      }[err?.code] || "No se pudo comprar. Puede ser el internet.";
      setAviso(msg);
    } finally {
      setOcupado(false);
    }
  };

  // ------------------------------------------------------------ render
  const capaSel = sel ? doc.capas.find((c) => c.id === sel) : null;
  // El fondo del collage es contenido (como una foto): sus colores vienen del catálogo, no del tema.
  const BLANCO = COLORES_FONDO[0]?.hex;
  const fondoCss = doc.fondo?.tipo === "textura" && doc.fondo.src
    ? { backgroundColor: BLANCO, backgroundImage: `url(${doc.fondo.src})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: doc.fondo?.hex || BLANCO };
  const fondoOscuro = doc.fondo?.tipo === "color" && ["negro", "tinta"].includes(doc.fondo.id);
  const nombreCapa = (c) => (c.tipo === "frase" ? `Frase: ${(c.frase?.texto || "").slice(0, 40)}` : getObjeto(c.ref)?.nombre || "Pieza");
  const puedeDeshacer = pasado.current.length > 0;
  const puedeRehacer = futuro.current.length > 0;

  return (
    <div className="sema-collage-editor" role="dialog" aria-modal="true" aria-label="Editor de collage" style={{ position: "fixed", inset: 0, zIndex: 10000, backgroundColor: palette.bg, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)" }}>
      {/* Barra superior */}
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", gap: 2, padding: "0 6px", borderBottom: `1px solid ${palette.borderSoft}` }}>
        <BotonIcono etiqueta="Cerrar" onClick={cerrar} refBoton={cerrarRef}><X size={24} /></BotonIcono>
        <div role="radiogroup" aria-label="Formato" style={{ display: "flex", border: `2px solid ${palette.ink}`, borderRadius: 999, marginLeft: 4 }}>
          {Object.entries(LIENZO.formatos).map(([id, f]) => {
            const activo = doc.formato === id;
            return (
              <button key={id} role="radio" aria-checked={activo} aria-label={id === "historia" ? "Historia 9:16" : "Cuadrado 1:1"}
                onClick={() => { if (!activo) { setFormatoCompartir(null); cambiar((d) => cambiarFormato(d, id)); } }}
                className="sema-collage-formato" style={{ minWidth: 52, minHeight: 44, borderRadius: 999, border: "none", cursor: "pointer", ...body, fontSize: "14px", fontWeight: 800, backgroundColor: activo ? palette.ink : "transparent", color: activo ? palette.bg : palette.ink }}>
                {f.etiqueta}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <BotonIcono etiqueta="Deshacer" onClick={deshacer} disabled={!puedeDeshacer}><Undo2 size={22} /></BotonIcono>
        <BotonIcono etiqueta="Rehacer" onClick={rehacer} disabled={!puedeRehacer}><Redo2 size={22} /></BotonIcono>
        <button onClick={() => { setSel(null); setHoja("listo"); }}
          style={{ marginLeft: 4, minHeight: 44, padding: "0 18px", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: palette.accent, color: palette.onAccent, ...display, fontSize: "15px", fontWeight: 800 }}>
          Listo
        </button>
      </div>

      {/* Área del lienzo */}
      <div ref={areaRef} style={{ flex: 1, minHeight: 0, position: "relative", backgroundColor: palette.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div
          ref={stageRef}
          className="sema-collage-lienzo"
          role="application"
          aria-label={`Lienzo del collage, ${doc.capas.length} ${doc.capas.length === 1 ? "pieza" : "piezas"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          style={{ position: "relative", width: stageW, height: stageH, overflow: "hidden", isolation: "isolate", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", boxShadow: `0 0 0 1.5px ${palette.ink}`, ...fondoCss }}
        >
          {doc.capas.map((c, i) => {
            const src = c.tipo === "objeto" ? c.src : urls[claveFrase(c)];
            const esSel = c.id === sel;
            return (
              <div key={c.id} data-capa={c.id} tabIndex={0} role="button" aria-pressed={esSel} aria-label={`${nombreCapa(c)}, capa ${i + 1} de ${doc.capas.length}`}
                onFocus={() => setSel(c.id)} className="sema-collage-capa"
                style={{ position: "absolute", opacity: esSel && sobreBote ? 0.45 : 1, left: c.x * k, top: c.y * k, width: c.w * k, height: c.h * k, transform: `translate(-50%, -50%) rotate(${c.r}deg) scale(${c.s * (esSel && sobreBote ? 0.7 : 1)})`, zIndex: i + 1, cursor: "grab", transition: "opacity 120ms ease" }}>
                <div className={esSel && modoCapas ? "sema-collage-capa--capas" : undefined}
                  style={{ width: "100%", height: "100%", outline: esSel ? `${2 / c.s}px dashed ${palette.ink}` : "none", outlineOffset: 4 / c.s, borderRadius: 4 / c.s, filter: esSel && modoCapas ? `drop-shadow(0 0 ${10 / c.s}px ${palette.firma})` : "none" }}>
                  {src ? <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }} /> : null}
                </div>
              </div>
            );
          })}
          {arrastrando && doc.formato === "historia" && (
            <>
              <div aria-hidden className="sema-collage-guia" style={{ top: (250 / H) * stageH }} />
              <div aria-hidden className="sema-collage-guia" style={{ top: ((H - 340) / H) * stageH }} />
            </>
          )}
          {doc.capas.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: 24, textAlign: "center" }}>
              <p style={{ ...body, fontSize: "15px", fontWeight: 600, color: fondoOscuro ? palette.onColor : palette.onFirma, margin: 0 }}>Toca un sticker de abajo para empezar.</p>
            </div>
          )}
        </div>

        {modoCapas && (
          <p role="status" style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", margin: 0, padding: "6px 12px", borderRadius: 999, backgroundColor: palette.ink, color: palette.bg, ...body, fontSize: "14px", fontWeight: 700, pointerEvents: "none", whiteSpace: "nowrap" }}>
            Arriba: al frente · Abajo: atrás
          </p>
        )}
        {aviso && !arrastrando && (
          <p role="status" style={{ position: "absolute", pointerEvents: "none", zIndex: 6, top: 10, left: 12, right: 12, margin: "0 auto", maxWidth: 360, padding: "8px 12px", borderRadius: 12, backgroundColor: palette.ink, color: palette.bg, ...body, fontSize: "14px", fontWeight: 600, textAlign: "center" }}>
            {aviso}
          </p>
        )}
      </div>

      {/* Barra de la pieza elegida. Su alto queda reservado aunque no haya pieza elegida, para que el
          lienzo no brinque (ni cambie de escala) al tocar, soltar o arrastrar. */}
      <div style={{ flexShrink: 0, height: 60, borderTop: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bg, position: "relative" }}>
        {/* Bote: aparece en esta franja mientras se arrastra (fuera de la zona donde se compone). */}
        {arrastrando && (
          <div ref={boteRef} data-bote aria-hidden style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none" }}>
            <span style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: sobreBote ? palette.danger : palette.ink, transform: `scale(${sobreBote ? 1.15 : 1})`, transition: "transform 120ms ease, background-color 120ms ease" }}>
              <Trash2 size={22} color={palette.bg} />
            </span>
            <span style={{ ...body, fontSize: "14px", fontWeight: 700, color: sobreBote ? palette.danger : palette.ink }}>{sobreBote ? "Suelta para borrar" : "Arrastra aquí para borrar"}</span>
          </div>
        )}
        {capaSel && !arrastrando && (
          <div role="toolbar" aria-label="Pieza elegida" className="scrollbar-hide" style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 2, padding: "0 6px", overflowX: "auto" }}>
            <BotonTexto icon={BringToFront} onClick={() => cambiar((d) => mover(d, sel, "frente"))}>Al frente</BotonTexto>
            <BotonTexto icon={SendToBack} onClick={() => cambiar((d) => mover(d, sel, "fondo"))}>Atrás</BotonTexto>
            {capaSel.tipo === "frase" && <BotonTexto icon={PaletteIcon} onClick={() => estiloSiguiente(sel)}>Estilo</BotonTexto>}
            <BotonIcono etiqueta="Agrandar" onClick={() => escalar(sel, 1.15)}><ZoomIn size={21} /></BotonIcono>
            <BotonIcono etiqueta="Achicar" onClick={() => escalar(sel, 1 / 1.15)}><ZoomOut size={21} /></BotonIcono>
            <BotonIcono etiqueta="Girar" onClick={() => girar(sel, 15)}><RotateCw size={21} /></BotonIcono>
            <BotonTexto icon={Trash2} onClick={() => borrar(sel)} peligro>Borrar</BotonTexto>
          </div>
        )}
        {!capaSel && doc.capas.length > 0 && !arrastrando && (
          <p style={{ ...body, fontSize: "13px", color: palette.inkSoft, margin: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", textAlign: "center" }}>
            Dos dedos: girar y agrandar · Mantener presionado: capas
          </p>
        )}
      </div>

      <CollageTray
        tab={bandeja.tab}
        abierta={bandeja.abierta}
        onTab={(t) => setBandeja((b) => ({ tab: t, abierta: b.tab === t ? !b.abierta : true }))}
        estado={estado}
        fondoActual={doc.fondo}
        onAddObjeto={agregarObjeto}
        onFondo={ponerFondo}
        onAddFrase={agregarFrase}
        onBloqueado={(set) => setHoja({ bloqueado: set })}
        frases={frases}
        frasesCargando={frasesCargando}
      />

      {hoja === "listo" && (
        <CollageHoja titulo="¿Qué hacemos con el collage?" onClose={() => setHoja(null)}>
          {/* Formato antes de exportar: feed (1080×1080) o historia (1080×1920). Por defecto, el del lienzo. */}
          <div role="radiogroup" aria-label="Formato para compartir" style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["cuadrado", "Feed 1080×1080"], ["historia", "Historia 1080×1920"]].map(([id, etiqueta]) => {
              const activo = (formatoCompartir || doc.formato) === id;
              return (
                <button key={id} role="radio" aria-checked={activo} onClick={() => setFormatoCompartir(id)}
                  style={{ flex: 1, minHeight: 44, borderRadius: 999, cursor: "pointer", ...body, fontSize: "14px", fontWeight: 800, border: `2px solid ${palette.ink}`, backgroundColor: activo ? palette.ink : "transparent", color: activo ? palette.bg : palette.ink }}>
                  {etiqueta}
                </button>
              );
            })}
          </div>
          <BotonHoja data-autofocus onClick={compartirImagen} disabled={ocupado} style={{ marginBottom: 6 }}>
            {(formatoCompartir || doc.formato) === "cuadrado" ? "Compartir imagen" : "Compartir en historia"}
          </BotonHoja>
          <p style={{ ...body, fontSize: "14px", color: palette.inkSoft, textAlign: "center", margin: "0 0 8px" }}>
            {(formatoCompartir || doc.formato) === "cuadrado" ? "Imagen cuadrada, para el feed o para guardar." : "Imagen vertical, lista para historias."}
          </p>
          <FilaHoja icon={Save} onClick={async () => { const r = await guardar(); if (r) setHoja(null); }} disabled={ocupado}
            detalle={estado?.plus || estado?.limite == null ? "Se queda en Mis collages para seguir editándolo." : `Se queda en Mis collages. Van ${estado?.usados ?? 0} de ${estado.limite}.`}>
            {collageId ? "Guardar cambios" : "Guardar"}
          </FilaHoja>
          <FilaHoja icon={Send} onClick={() => setHoja("publicar")} disabled={ocupado || doc.capas.length === 0} detalle="Sale en Social. Lo que se publica ya no cambia.">
            Publicar en Social
          </FilaHoja>
        </CollageHoja>
      )}

      {hoja === "publicar" && (
        <CollagePublicar user={user} doc={doc} collageId={collageId} books={books} frases={frases} onPedirFrases={() => { if (!frases && !frasesCargando) setBandeja((b) => ({ ...b, tab: "frases" })); }}
          onClose={() => setHoja(null)} onPublicado={() => { setHoja(null); setAviso("Publicado en Social."); }} />
      )}

      {hoja === "tope" && (
        <CollageHoja titulo={`Ya hay ${estado?.limite ?? 5} collages guardados`} onClose={() => setHoja(null)}>
          <p style={{ ...body, fontSize: "16px", lineHeight: 1.5, color: palette.ink, margin: "0 0 6px" }}>Borra uno de tus collages para guardar este.</p>
          <p style={{ ...body, fontSize: "15px", lineHeight: 1.5, color: palette.inkSoft, margin: "0 0 18px" }}>Collages ilimitados en Sema Plus (próximamente).</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BotonHoja data-autofocus onClick={() => { setHoja(null); onVerCollages?.(); }}>Ver mis collages</BotonHoja>
            <BotonHoja secundario onClick={() => setHoja(null)}>Seguir editando</BotonHoja>
          </div>
        </CollageHoja>
      )}

      {hoja === "salir" && (
        <CollageHoja titulo="¿Salir sin guardar?" onClose={() => setHoja(null)}>
          <p style={{ ...body, fontSize: "16px", lineHeight: 1.5, color: palette.ink, margin: "0 0 18px" }}>Los cambios sin guardar se pierden.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BotonHoja data-autofocus onClick={async () => { const r = await guardar(); if (r) onClose?.(); }} disabled={ocupado}>Guardar y salir</BotonHoja>
            <BotonHoja secundario onClick={() => onClose?.()}>Salir sin guardar</BotonHoja>
          </div>
        </CollageHoja>
      )}

      {hoja?.bloqueado && <HojaBloqueado set={hoja.bloqueado} gemBalance={gemBalance} ocupado={ocupado} aviso={aviso} onComprar={comprar} onClose={() => { setHoja(null); setAviso(""); }} />}
    </div>
  );
}

function HojaBloqueado({ set, gemBalance, ocupado, aviso, onComprar, onClose }) {
  const muestra = getObjeto(set.muestra);
  const tipo = set.obtencion?.tipo;
  const precio = set.obtencion?.precio;
  const alcanza = (gemBalance ?? 0) >= (precio || 0);
  return (
    <CollageHoja titulo={set.nombre} onClose={onClose}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        {muestra && <img src={muestra.miniatura} alt="" style={{ width: 88, height: 88, objectFit: "contain", flexShrink: 0 }} />}
        <div>
          <p style={{ ...body, fontSize: "15px", color: palette.inkSoft, margin: "0 0 6px" }}>{set.descripcion}</p>
          <p style={{ ...body, fontSize: "16px", fontWeight: 700, color: palette.ink, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={16} aria-hidden />
            {tipo === "racha" && "Sale de sorpresa al registrar la racha."}
            {tipo === "gemas" && `Cuesta ${precio} gemas.`}
            {tipo === "plus" && "Viene con Sema Plus."}
          </p>
        </div>
      </div>
      {tipo === "racha" && <p style={{ ...body, fontSize: "15px", lineHeight: 1.5, color: palette.ink, margin: "0 0 4px" }}>Cada día con racha hay chance. Si se hace del rogar, al sexto día sale seguro.</p>}
      {tipo === "plus" && <p style={{ ...body, fontSize: "15px", lineHeight: 1.5, color: palette.ink, margin: 0 }}>Es de Sema Plus, que todavía no sale.</p>}
      {tipo === "gemas" && (
        <>
          <p style={{ ...body, fontSize: "15px", color: palette.inkSoft, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <Gem size={16} aria-hidden /> {gemBalance ?? 0} {gemBalance === 1 ? "gema" : "gemas"} ahorita
          </p>
          <BotonHoja data-autofocus onClick={() => onComprar(set)} disabled={ocupado || !alcanza}>
            {alcanza ? `Comprar por ${precio} gemas` : `Faltan ${precio - (gemBalance ?? 0)} gemas`}
          </BotonHoja>
          {!alcanza && <p style={{ ...body, fontSize: "14px", color: palette.inkSoft, margin: "10px 0 0" }}>Cada sesión de lectura suma 5. Un libro terminado, 50.</p>}
        </>
      )}
      {aviso && <p role="status" style={{ ...body, fontSize: "14px", fontWeight: 600, color: palette.danger, margin: "12px 0 0" }}>{aviso}</p>}
    </CollageHoja>
  );
}

function BotonIcono({ etiqueta, children, disabled, onClick, refBoton }) {
  return (
    <button ref={refBoton} aria-label={etiqueta} title={etiqueta} onClick={onClick} disabled={disabled}
      style={{ width: 44, height: 44, flexShrink: 0, background: "none", border: "none", cursor: disabled ? "default" : "pointer", color: palette.ink, opacity: disabled ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}

function BotonTexto({ icon: Icon, children, onClick, peligro }) {
  const color = peligro ? palette.danger : palette.ink;
  return (
    <button onClick={onClick}
      style={{ minHeight: 48, minWidth: 56, flexShrink: 0, padding: "2px 6px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color, ...body, fontSize: "13px", fontWeight: 700 }}>
      <Icon size={20} strokeWidth={2} aria-hidden />
      {children}
    </button>
  );
}

import { useState, useEffect, useRef } from "react";
import { Trash2, Loader2, MapPin, Lock, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { palette, body, display } from "../../theme.js";
import { ESTADOS, estadoCentro } from "../../data/estados.js";
import {
  MAX_PINS, PIN_LABEL_MAX, RADII_KM, PIN_FUZZ_METERS, roundCoord, saveGeo,
} from "../../services/truequeGeoService.js";
import { searchPlaces, PLACE_MIN_QUERY } from "../../services/placeSearchService.js";
import { Sheet, PrimaryButton, ErrorText, Label, fieldStyle } from "./ui.jsx";

// ============ TRUEQUE v2/v3: MIS LUGARES ============
// v3: buscador de lugares (Nominatim, ver placeSearchService.js) arriba del mapa. El texto buscado
// no se guarda en ningún lado: solo las coordenadas redondeadas del pin, igual que al tocar el mapa.
// Este módulo se carga con import() dinámico desde TruequeMain: Leaflet y su CSS solo se
// descargan al abrir "Mis lugares". Está excluido del precache del service worker (vite.config.js).
//
// Tiles de OpenStreetMap (tile.openstreetmap.org): uso gratuito sujeto a su política de uso justo.
// Si el tráfico crece, cambiar TILE_URL a un proveedor de tiles con plan gratis (MapTiler,
// Stadia, Thunderforest…) y actualizar la atribución. NO se cachean en el service worker.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const MEXICO_BOUNDS = [[12, -122], [35, -84]];   // límite de paneo (el servidor valida 14..33 / -119..-86)
const IN_MEXICO = (lat, lng) => lat >= 14 && lat <= 33 && lng >= -119 && lng <= -86;
const PRIVACY_TEXT = "Marca lugares públicos cerca de donde te mueves (metro, plaza, café). No marques tu casa, escuela ni trabajo. La ubicación se guarda aproximada y nadie ve tus pines.";

const SEARCH_DEBOUNCE_MS = 450;

// Buscador de lugares. Espera ~450 ms sin teclear antes de pedir a Nominatim (y el servicio
// además respeta 1 solicitud/segundo y cachea). Fallas de red o timeout no rompen la pantalla.
function PlaceSearch({ stateClave, disabled, onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");   // idle | loading | ok | empty | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const query = q.trim();
    if (query.length < PLACE_MIN_QUERY) { setResults([]); setStatus("idle"); return undefined; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const found = await searchPlaces(query, { center: stateClave ? estadoCentro(stateClave) : null, signal: ctrl.signal });
        setResults(found);
        setStatus(found.length ? "ok" : "empty");
      } catch (e) {
        if (e?.name === "AbortError") return;
        setResults([]);
        setMsg(e?.message || "No se pudo buscar ahora. Intenta de nuevo o toca el mapa.");
        setStatus("error");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, stateClave]);

  function pick(place) {
    onPick(place);
    setQ("");
    setResults([]);
    setStatus("idle");
  }

  const hint = { ...body, fontSize: "0.82rem", color: palette.inkSoft, margin: "0.35rem 0 0" };
  return (
    <div style={{ marginBottom: "0.6rem" }}>
      <div style={{ position: "relative" }}>
        <Search size={16} color={palette.inkFaint} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
          placeholder="Busca un lugar: estación de metro, plaza, café…"
          aria-label="Buscar un lugar en el mapa"
          autoComplete="off"
          style={{ ...fieldStyle(), paddingLeft: "2.2rem", opacity: disabled ? 0.6 : 1 }}
        />
        {status === "loading" && (
          <Loader2 size={16} className="animate-spin" color={palette.inkFaint} style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }} />
        )}
      </div>
      {status === "ok" && (
        <ul aria-label="Sugerencias de lugares" style={{ listStyle: "none", margin: "0.35rem 0 0", padding: 0, borderRadius: 10, border: `1px solid ${palette.border}`, backgroundColor: palette.bgCard, overflow: "hidden" }}>
          {results.map((r, i) => (
            <li key={r.id} style={{ borderTop: i ? `1px solid ${palette.borderSoft}` : "none" }}>
              <button
                onClick={() => pick(r)}
                aria-label={`Marcar ${r.name}`}
                style={{ width: "100%", textAlign: "left", display: "flex", gap: "0.45rem", alignItems: "flex-start", padding: "0.55rem 0.7rem", background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.84rem", color: palette.ink, lineHeight: 1.35 }}
              >
                <MapPin size={14} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 }} /> {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status === "empty" && <p role="status" style={hint}>No encontramos ese lugar, intenta con otro nombre o toca el mapa.</p>}
      {status === "error" && <p role="status" style={{ ...hint, color: palette.warnInk }}>{msg}</p>}
    </div>
  );
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

const sameCoords = (a, b) =>
  a.length === b.length &&
  [...a].map((p) => `${p.lat},${p.lng}`).sort().join("|") === [...b].map((p) => `${p.lat},${p.lng}`).sort().join("|");

// Ícono del pin con divIcon (evita el bug del ícono por defecto de Leaflet con Vite).
function pinIcon(n, selected) {
  const bg = selected ? palette.amber : palette.accent;
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${bg};color:${palette.onAccent};border:2px solid ${palette.onAccent};font:700 13px/1 system-ui,sans-serif;box-shadow:0 1px 4px ${palette.ink}55">${n}</span>`,
  });
}

// profile: de getGeoProfile(). initialState: estado elegido en LocationStep (onboarding).
function MyPlaces({ profile, initialState = null, onSaved, onClose }) {
  const [state, setState] = useState(initialState || profile.state || "");
  const [pins, setPins] = useState(profile.pins.map((p) => ({ lat: p.lat, lng: p.lng, label: p.label || "" })));
  const [selected, setSelected] = useState(0);
  const [radius, setRadius] = useState(profile.maxRadiusKm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [retryAt, setRetryAt] = useState(profile.nextEditAt);
  const [tiles, setTiles] = useState("loading");   // loading | ok | error

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const tileRef = useRef(null);
  // El handler de clic de Leaflet se registra una vez: lee el estado vigente por refs.
  const live = useRef({});

  const locked = !!retryAt && new Date(retryAt).getTime() > Date.now();
  live.current = { pins, selected, locked };

  // Crear el mapa (una vez)
  useEffect(() => {
    const center = pins.length ? [pins[0].lat, pins[0].lng] : estadoCentro(state);
    const map = L.map(mapEl.current, { center, zoom: 12, minZoom: 4, maxBounds: MEXICO_BOUNDS, maxBoundsViscosity: 1 });
    const tileLayer = L.tileLayer(TILE_URL, { maxZoom: 18, attribution: ATTRIBUTION });
    let loaded = 0;
    let failed = 0;
    tileLayer.on("tileload", () => { loaded++; setTiles("ok"); });
    tileLayer.on("tileerror", () => { failed++; if (loaded === 0 && failed >= 3) setTiles("error"); });
    tileLayer.addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (ev) => {
      const { pins: cur, selected: sel, locked: isLocked } = live.current;
      if (isLocked) return;
      const lat = roundCoord(ev.latlng.lat);
      const lng = roundCoord(ev.latlng.lng);
      if (!IN_MEXICO(lat, lng)) { setErr("Ese punto está fuera de México."); return; }
      setErr("");
      if (cur.length < MAX_PINS) {
        setPins([...cur, { lat, lng, label: "" }]);
        setSelected(cur.length);
      } else {
        setPins(cur.map((p, i) => (i === sel ? { ...p, lat, lng } : p)));
      }
    });
    if (pins.length > 1) map.fitBounds(pins.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 13 });
    mapRef.current = map;
    tileRef.current = tileLayer;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el mapa se crea una sola vez
  }, []);

  // Si cambia el estado y aún no hay pines, recentrar
  useEffect(() => {
    if (mapRef.current && pins.length === 0 && state) mapRef.current.setView(estadoCentro(state), 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Dibujar pines: punto redondeado + círculo de ~1 km para que se vea que es aproximado
  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();
    pins.forEach((p, i) => {
      const isSel = i === selected;
      L.circle([p.lat, p.lng], { radius: PIN_FUZZ_METERS, color: isSel ? palette.amber : palette.accent, weight: 1, fillOpacity: 0.12, interactive: false }).addTo(group);
      L.marker([p.lat, p.lng], { icon: pinIcon(i + 1, isSel), keyboard: false, title: `Lugar ${i + 1}` })
        .on("click", () => setSelected(i))
        .addTo(group);
    });
  }, [pins, selected]);

  // Sugerencia del buscador: mismo redondeo (~1 km) y círculo que al tocar el mapa, pero siempre
  // agrega el siguiente pin libre (con 3 pines pide borrar uno primero). Recentra con animación.
  function addFromSearch(place) {
    if (locked) { setErr("Todavía no puedes mover tus lugares."); return; }
    if (pins.length >= MAX_PINS) { setErr(`Ya tienes ${MAX_PINS} lugares. Borra uno para agregar otro.`); return; }
    const lat = roundCoord(place.lat);
    const lng = roundCoord(place.lng);
    if (!IN_MEXICO(lat, lng)) { setErr("Ese lugar está fuera de México."); return; }
    setErr("");
    setPins([...pins, { lat, lng, label: "" }]);
    setSelected(pins.length);
    mapRef.current?.flyTo([lat, lng], 14, { duration: 0.8 });
  }

  function removePin(i) {
    setPins((prev) => prev.filter((_, j) => j !== i));
    setSelected(0);
  }

  function setLabel(i, label) {
    setPins((prev) => prev.map((p, j) => (j === i ? { ...p, label: label.slice(0, PIN_LABEL_MAX) } : p)));
  }

  function retryTiles() {
    setTiles("loading");
    tileRef.current?.redraw();
  }

  async function save() {
    if (saving) return;
    if (!state) { setErr("Elige tu estado."); return; }
    if (pins.length === 0) { setErr("Marca al menos 1 lugar: busca uno o toca el mapa."); return; }
    if (locked && !sameCoords(pins, profile.pins)) { setErr("Todavía no puedes mover tus lugares."); return; }
    setSaving(true);
    setErr("");
    try {
      await saveGeo({ pins: pins.length ? pins : null, state, maxRadiusKm: radius });
      await onSaved();
    } catch (e) {
      if (e.code === "PINS_COOLDOWN" && e.retry_at) setRetryAt(e.retry_at);
      setErr(e.message || "No se pudieron guardar tus lugares.");
      setSaving(false);
    }
  }

  const chip = (on) => ({
    padding: "0.4rem 0.8rem", borderRadius: 999, cursor: "pointer",
    border: `1.5px solid ${on ? palette.accent : palette.border}`,
    backgroundColor: on ? palette.accent : palette.bgCard,
    color: on ? palette.onAccent : palette.ink, ...body, fontSize: "0.85rem",
  });

  return (
    <Sheet title="📍 Mis lugares" onClose={onClose} maxWidth={560}>
      <p style={{ ...body, fontSize: "0.86rem", color: palette.inkSoft, margin: "0 0 0.8rem", lineHeight: 1.45, padding: "0.6rem 0.75rem", borderRadius: 10, backgroundColor: palette.warnBg, border: `1px solid ${palette.warnBorder}` }}>
        {PRIVACY_TEXT}
      </p>

      <Label>Estado</Label>
      <select value={state} onChange={(e) => setState(e.target.value)} aria-label="Estado" style={{ ...fieldStyle(), appearance: "auto", marginBottom: "0.8rem" }}>
        <option value="">Elige tu estado…</option>
        {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
      </select>

      {locked && (
        <p role="status" style={{ ...body, fontSize: "0.85rem", color: palette.warnInk, margin: "0 0 0.6rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
          <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          Ya cambiaste tus lugares hoy. Podrás moverlos de nuevo el {fmtDateTime(retryAt)}. Las etiquetas y el radio sí se pueden cambiar.
        </p>
      )}

      <PlaceSearch stateClave={state} disabled={locked} onPick={addFromSearch} />

      <div style={{ position: "relative", isolation: "isolate", borderRadius: 14, overflow: "hidden", border: `1px solid ${palette.border}` }}>
        <div ref={mapEl} role="application" aria-label="Mapa: toca para colocar o mover un lugar" style={{ height: 300, width: "100%", backgroundColor: palette.bgSoft, cursor: locked ? "default" : "crosshair" }} />
        {tiles === "loading" && (
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 1000, padding: "0.3rem 0.7rem", borderRadius: 999, backgroundColor: palette.bgCard, display: "flex", gap: "0.35rem", alignItems: "center", ...body, fontSize: "0.8rem", color: palette.inkSoft, pointerEvents: "none" }}>
            <Loader2 size={14} className="animate-spin" /> Cargando mapa…
          </div>
        )}
        {tiles === "error" && (
          <div style={{ position: "absolute", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.6rem", padding: "1rem", backgroundColor: palette.bgSoft, textAlign: "center" }}>
            <p style={{ ...body, fontSize: "0.92rem", color: palette.ink, margin: 0 }}>No se pudo cargar el mapa. Revisa tu conexión.</p>
            <button onClick={retryTiles} style={chip(true)}>Reintentar</button>
          </div>
        )}
      </div>
      <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, margin: "0.3rem 0 0.8rem", textAlign: "right" }}>
        Mapa: © OpenStreetMap contributors
      </p>

      {pins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "0.6rem 0.5rem 1rem" }}>
          <MapPin size={22} color={palette.accent} />
          <p style={{ ...display, fontSize: "0.98rem", fontWeight: 600, color: palette.ink, margin: "0.3rem 0 0.2rem" }}>Aún no marcas lugares</p>
          <p style={{ ...body, fontSize: "0.86rem", color: palette.inkSoft, margin: 0 }}>
            Busca un lugar o toca el mapa para agregar hasta {MAX_PINS} lugares.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.9rem" }}>
          <p style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint, margin: 0 }}>
            {pins.length}/{MAX_PINS} lugares · {locked ? "solo lectura" : pins.length < MAX_PINS ? "toca el mapa para agregar otro" : "toca un lugar y luego el mapa para moverlo"}
          </p>
          {pins.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.45rem", borderRadius: 12, border: `1.5px solid ${i === selected ? palette.amber : palette.borderSoft}`, backgroundColor: palette.bgCard }}>
              <button
                onClick={() => setSelected(i)}
                aria-label={`Seleccionar lugar ${i + 1} para moverlo`}
                aria-pressed={i === selected}
                style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: i === selected ? palette.amber : palette.accent, color: palette.onAccent, ...display, fontWeight: 700 }}
              >
                {i + 1}
              </button>
              <input
                value={p.label}
                onChange={(e) => setLabel(i, e.target.value)}
                maxLength={PIN_LABEL_MAX}
                placeholder="Etiqueta (solo tú la ves)"
                aria-label={`Etiqueta del lugar ${i + 1}`}
                style={{ ...fieldStyle(), padding: "0.5rem 0.7rem", fontSize: "0.88rem", minWidth: 0, flex: 1 }}
              />
              {!locked && (
                <button onClick={() => removePin(i)} aria-label={`Borrar lugar ${i + 1}`} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.35rem", display: "flex", flexShrink: 0 }}>
                  <Trash2 size={18} color={palette.danger} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Label>Radio máximo para buscar matches</Label>
      <div role="radiogroup" aria-label="Radio máximo" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {RADII_KM.map((r) => (
          <button key={r} role="radio" aria-checked={radius === r} onClick={() => setRadius(r)} style={chip(radius === r)}>{r} km</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={save} disabled={saving || !state}>{saving ? "Guardando…" : "Guardar"}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export default MyPlaces;

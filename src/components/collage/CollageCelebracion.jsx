// Celebración de desbloqueo de un set de Collages (2026-11-06). Escucha collageBus («premio») y muestra
// el sticker de muestra entrando con un salto y un giro, sobre un disco lila (marco de celebración de
// sema-identidad). Sin emojis. Con prefers-reduced-motion aparece quieto y sin confeti.
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { palette, display, body, label as labelFont, SEMA_EXTENDIDA } from "../../theme.js";
import { SelloTinta } from "../Detalles.jsx";
import { haptic, HAPTIC } from "../../haptics.js";
import { collageBus } from "../../services/collageService.js";
import { getSet, getSets, getObjeto, objetosDeSet } from "../../services/collageCatalog.js";
import { CollageHoja, BotonHoja } from "./CollageHoja.jsx";

const ORIGEN = { racha: "Premio de la racha de hoy", gemas: "Comprado con gemas", plus: "De Sema Plus" };

export function CollageCelebracion({ onUsar }) {
  const [premio, setPremio] = useState(null);
  useEffect(() => collageBus.on((ev) => {
    if (ev?.tipo !== "premio" || !getSet(ev.setId)) return;
    setPremio(ev);
    haptic(HAPTIC.ACHIEVEMENT);
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!quieto) setTimeout(() => confetti({ particleCount: 70, spread: 70, origin: { y: 0.45 }, colors: [palette.firma, palette.acentoCalido, ...SEMA_EXTENDIDA.filter((c) => ["mostaza", "menta"].includes(c.key)).map((c) => c.hex)], disableForReducedMotion: true }), 380);
  }), []);
  // Solo en desarrollo: ?collage=premio muestra la celebración con el primer set de racha (capturas y pruebas).
  useEffect(() => {
    if (!import.meta.env.DEV || new URLSearchParams(window.location.search).get("collage") !== "premio") return;
    const t = setTimeout(() => collageBus.emit({ tipo: "premio", setId: getSets().find((s) => s.obtencion?.tipo === "racha")?.id, origen: "racha" }), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!premio) return null;
  const set = getSet(premio.setId);
  const muestra = getObjeto(set.muestra);
  const n = objetosDeSet(set.id).length;
  // Abanico: la muestra al centro (la única girada) y dos piezas más del set a los lados.
  const otras = objetosDeSet(set.id).filter((o) => o.id !== set.muestra).slice(0, 2);
  const cerrar = () => setPremio(null);
  return (
    <CollageHoja titulo="Set nuevo para tus collages" etiqueta={`Set nuevo: ${set.nombre}`} onClose={cerrar}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "6px 0 4px" }}>
        <div aria-hidden style={{ position: "relative", width: 300, height: 190, marginBottom: 10 }}>
          {otras.map((o, i) => (
            <img key={o.id} className="sema-collage-premio-lado" src={o.miniatura} alt=""
              style={{ position: "absolute", top: 46, [i ? "right" : "left"]: 0, width: 104, height: 104, objectFit: "contain", animationDelay: `${420 + i * 90}ms` }} />
          ))}
          {muestra && <img className="sema-collage-premio-sticker" src={muestra.archivo} alt="" style={{ position: "absolute", left: 65, top: 0, width: 170, height: 170, objectFit: "contain", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))" }} />}
          <SelloTinta color="tinta" angulo={-8} size="sm" style={{ position: "absolute", right: 6, top: 0 }}>Set nuevo</SelloTinta>
        </div>
        <p style={{ ...labelFont, fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.inkSoft, margin: "0 0 4px" }}>{ORIGEN[premio.origen] || ""}</p>
        <p style={{ ...display, fontSize: "26px", fontWeight: 800, lineHeight: 1.15, color: palette.ink, margin: "0 0 6px" }}>{set.nombre}</p>
        <p style={{ ...body, fontSize: "16px", color: palette.ink, margin: "0 0 18px" }}>{n} {n === 1 ? "pieza" : "piezas"} nuevas. Son tuyas y no se gastan.</p>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <BotonHoja data-autofocus onClick={() => { cerrar(); onUsar?.(set); }}>Armar un collage</BotonHoja>
          <BotonHoja secundario onClick={cerrar}>Luego</BotonHoja>
        </div>
      </div>
    </CollageHoja>
  );
}

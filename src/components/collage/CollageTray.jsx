// Bandeja inferior del editor de Collages (2026-11-06). Tres pestañas: Stickers, Papeles y fondos, Mis frases.
// Tocar algo lo agrega al centro del lienzo (o cambia el fondo). Un set bloqueado muestra UNA pieza de
// muestra, opaca y con candado; al tocarla, el editor abre la hoja con cómo se obtiene.
import { useState } from "react";
import { Lock, Check } from "lucide-react";
import { palette, display, body, label as labelFont, quote as quoteFont } from "../../theme.js";
import { getSets, getObjeto, objetosDeSet, setDesbloqueado, COLORES_FONDO } from "../../services/collageCatalog.js";
import { SkeletonList } from "../Skeleton.jsx";

const PESTANAS = [
  { id: "stickers", label: "Stickers" },
  { id: "papeles", label: "Papeles y fondos" },
  { id: "frases", label: "Mis frases" },
];

const COMO_SE_OBTIENE = { racha: "Sale con la racha", gemas: "Con gemas", plus: "Sema Plus" };

export function CollageTray({ tab, onTab, abierta, estado, fondoActual, onAddObjeto, onFondo, onAddFrase, onBloqueado, frases, frasesCargando }) {
  return (
    // La bandeja abre ENCIMA de la parte baja del lienzo (como en Shuffles): el lienzo no cambia de tamaño.
    <div style={{ flexShrink: 0, position: "relative", zIndex: 20, backgroundColor: palette.bg, borderTop: `1px solid ${palette.borderSoft}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div role="tablist" aria-label="Bandeja" style={{ display: "flex", gap: 4, padding: "0 8px" }}>
        {PESTANAS.map((p) => {
          const activa = tab === p.id;
          const marcada = abierta && activa;
          return (
            <button
              key={p.id}
              role="tab"
              id={`collage-tab-${p.id}`}
              aria-selected={activa}
              aria-expanded={marcada}
              aria-controls={marcada ? "collage-bandeja" : undefined}
              onClick={() => onTab(p.id)}
              className={marcada ? undefined : "sema-tab"}
              style={{
                flex: 1, minHeight: 48, background: "none", border: "none", cursor: "pointer",
                ...body, fontSize: "15px", fontWeight: marcada ? 800 : 600, color: palette.ink,
                borderBottom: `3px solid ${marcada ? palette.ink : "transparent"}`, whiteSpace: "nowrap",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {abierta && (
        <div id="collage-bandeja" role="tabpanel" aria-labelledby={`collage-tab-${tab}`} className="scrollbar-hide"
          style={{ position: "absolute", left: 0, right: 0, bottom: "100%", height: "min(36dvh, 310px)", overflowY: "auto", padding: "10px 12px 14px", backgroundColor: palette.bg, borderTop: `2px solid ${palette.ink}`, borderRadius: "16px 16px 0 0" }}>
          {tab === "stickers" && <PanelStickers estado={estado} onAdd={onAddObjeto} onBloqueado={onBloqueado} />}
          {tab === "papeles" && <PanelPapeles estado={estado} fondoActual={fondoActual} onAdd={onAddObjeto} onFondo={onFondo} onBloqueado={onBloqueado} />}
          {tab === "frases" && <PanelFrases frases={frases} cargando={frasesCargando} onAdd={onAddFrase} />}
        </div>
      )}
    </div>
  );
}

function Titulo({ children, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, margin: "6px 2px 8px" }}>
      <h3 style={{ ...body, fontSize: "14px", fontWeight: 800, color: palette.ink, margin: 0 }}>{children}</h3>
      {extra}
    </div>
  );
}

function Pieza({ objeto, onClick, bloqueado, etiqueta }) {
  // Si el archivo todavía no existe (p. ej. un set dado de alta en el catálogo antes de convertir sus PNG), la
  // pieza no aparece en vez de verse rota.
  const [falta, setFalta] = useState(false);
  if (falta) return null;
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta || objeto.nombre}
      className="sema-collage-pieza"
      style={{ position: "relative", aspectRatio: "1", minHeight: 44, background: "none", border: "none", borderRadius: 12, padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <img src={objeto.miniatura} alt="" loading="lazy" draggable={false} onError={() => setFalta(true)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", opacity: bloqueado ? 0.45 : 1, filter: bloqueado ? "grayscale(0.5)" : "none", pointerEvents: "none" }} />
      {bloqueado && (
        <span aria-hidden style={{ position: "absolute", right: 2, bottom: 2, width: 26, height: 26, borderRadius: "50%", backgroundColor: palette.ink, boxShadow: `0 0 0 2px ${palette.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock size={14} color={palette.bg} strokeWidth={2.6} />
        </span>
      )}
    </button>
  );
}

const rejilla = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: 6 };

function SetBloqueado({ set, onBloqueado }) {
  const muestra = getObjeto(set.muestra);
  if (!muestra) return null;
  const como = set.obtencion?.tipo === "gemas" ? `${set.obtencion.precio} gemas` : COMO_SE_OBTIENE[set.obtencion?.tipo] || "";
  return (
    <div style={{ marginBottom: 12 }}>
      <Titulo extra={<span style={{ ...labelFont, fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: palette.inkSoft }}>{como}</span>}>{set.nombre}</Titulo>
      <div style={rejilla}>
        <Pieza objeto={muestra} bloqueado onClick={() => onBloqueado(set)} etiqueta={`${set.nombre}, bloqueado. Ver cómo se obtiene`} />
        <button onClick={() => onBloqueado(set)} style={{ gridColumn: "span 3", minHeight: 44, textAlign: "left", background: "none", border: "none", cursor: "pointer", ...body, fontSize: "14px", color: palette.inkSoft, padding: "0 4px" }}>
          {set.descripcion} <span style={{ color: palette.ink, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>Cómo se obtiene</span>
        </button>
      </div>
    </div>
  );
}

function PanelStickers({ estado, onAdd, onBloqueado }) {
  const sets = getSets().filter((s) => objetosDeSet(s.id, "sticker").length > 0);
  // Desbloqueados primero (en el orden del catálogo), bloqueados al final.
  const abiertos = sets.filter((s) => setDesbloqueado(s, estado));
  const cerrados = sets.filter((s) => !setDesbloqueado(s, estado));
  return (
    <>
      {abiertos.map((s) => (
        <div key={s.id} style={{ marginBottom: 12 }}>
          <Titulo>{s.nombre}</Titulo>
          <div style={rejilla}>
            {objetosDeSet(s.id, "sticker").map((o) => <Pieza key={o.id} objeto={o} onClick={() => onAdd(o)} />)}
          </div>
        </div>
      ))}
      {cerrados.map((s) => <SetBloqueado key={s.id} set={s} onBloqueado={onBloqueado} />)}
    </>
  );
}

function PanelPapeles({ estado, fondoActual, onAdd, onFondo, onBloqueado }) {
  const sets = getSets();
  const fondos = sets.flatMap((s) => objetosDeSet(s.id, "fondo").map((o) => ({ o, s })));
  const piezas = sets.flatMap((s) => objetosDeSet(s.id, "textura").map((o) => ({ o, s })));
  const cerrados = sets.filter((s) => !setDesbloqueado(s, estado) && (objetosDeSet(s.id, "fondo").length || objetosDeSet(s.id, "textura").length));
  const activo = (f) => fondoActual && ((f.tipo === "color" && fondoActual.tipo === "color" && fondoActual.hex === f.hex) || (f.tipo === "textura" && fondoActual.ref === f.ref));
  return (
    <>
      <Titulo>Fondo</Titulo>
      <div style={{ ...rejilla, gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", marginBottom: 14 }}>
        {COLORES_FONDO.map((c) => {
          const sel = activo({ tipo: "color", hex: c.hex });
          return (
            <button key={c.id} onClick={() => onFondo({ tipo: "color", id: c.id, hex: c.hex })} aria-label={`Fondo ${c.nombre}`} aria-pressed={sel}
              style={{ aspectRatio: "1", minHeight: 44, borderRadius: 12, cursor: "pointer", backgroundColor: c.hex, border: `2px solid ${palette.ink}`, boxShadow: sel ? `0 0 0 3px ${palette.bg}, 0 0 0 5px ${palette.ink}` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {sel && <Check size={20} strokeWidth={3} color={c.id === "negro" || c.id === "tinta" ? palette.onColor : palette.onFirma} aria-hidden />}
            </button>
          );
        })}
        {fondos.filter(({ s }) => setDesbloqueado(s, estado)).map(({ o }) => {
          const sel = activo({ tipo: "textura", ref: o.id });
          return (
            <button key={o.id} onClick={() => onFondo({ tipo: "textura", ref: o.id, src: o.archivo })} aria-label={`Fondo ${o.nombre}`} aria-pressed={sel}
              style={{ aspectRatio: "1", minHeight: 44, borderRadius: 12, cursor: "pointer", backgroundImage: `url(${o.miniatura})`, backgroundSize: "cover", backgroundPosition: "center", border: `2px solid ${palette.ink}`, boxShadow: sel ? `0 0 0 3px ${palette.bg}, 0 0 0 5px ${palette.ink}` : "none" }} />
          );
        })}
      </div>
      <Titulo>Piezas de papel</Titulo>
      <div style={rejilla}>
        {piezas.filter(({ s }) => setDesbloqueado(s, estado)).map(({ o }) => <Pieza key={o.id} objeto={o} onClick={() => onAdd(o)} />)}
      </div>
      {cerrados.map((s) => <SetBloqueado key={s.id} set={s} onBloqueado={onBloqueado} />)}
    </>
  );
}

function PanelFrases({ frases, cargando, onAdd }) {
  if (cargando) return <SkeletonList count={3} lines={2} label="Cargando frases" />;
  if (!frases?.length) {
    return (
      <div style={{ padding: "1.5rem 0.5rem", textAlign: "center" }}>
        <p style={{ ...display, fontSize: "16px", fontWeight: 800, color: palette.ink, margin: "0 0 6px" }}>Sin frases guardadas</p>
        <p style={{ ...body, fontSize: "15px", color: palette.inkSoft, margin: 0 }}>Las frases guardadas de cada libro aparecen aquí y se pegan como recorte.</p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {frases.map((q) => (
        <button key={q.id} onClick={() => onAdd(q)} className="sema-row"
          style={{ textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${palette.borderSoft}`, padding: "12px 4px", cursor: "pointer", minHeight: 52 }}>
          <span style={{ ...quoteFont, fontSize: "19px", lineHeight: 1.3, color: palette.ink, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{q.text}</span>
          {(q.bookTitle || q.bookAuthor) && (
            <span style={{ ...body, fontSize: "14px", color: palette.inkSoft, display: "block", marginTop: 4 }}>— {[q.bookTitle, q.bookAuthor].filter(Boolean).join(" · ")}</span>
          )}
        </button>
      ))}
    </div>
  );
}

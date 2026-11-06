// Publicar un collage en el feed (2026-11-06). Opcional: usarlo de fondo para una frase o una reseña,
// con una tarjeta de papel encima que garantiza que el texto se lea. La imagen se exporta y se sube como
// archivo nuevo: lo publicado queda congelado aunque luego se edite el collage o cambie el catálogo.
import { useEffect, useState } from "react";
import { palette, body } from "../../theme.js";
import { fetchQuotes } from "../../services/quotesService.js";
import { publicarCollage } from "../../services/collageService.js";
import { exportarJPEG, vistaPrevia } from "./collageRender.js";
import { CollageHoja, BotonHoja } from "./CollageHoja.jsx";
import { CollageTarjetaEncima } from "./CollagePostBody.jsx";

const MODOS = [
  { id: "solo", label: "Solo el collage" },
  { id: "frase", label: "Con una frase" },
  { id: "resena", label: "Con una reseña" },
];

export function CollagePublicar({ user, doc, collageId, books, frases: frasesIni, onClose, onPublicado }) {
  const [modo, setModo] = useState("solo");
  const [preview, setPreview] = useState(null);
  const [frases, setFrases] = useState(frasesIni);
  const [elegida, setElegida] = useState(null); // { tipo, texto, libro, autor, calificacion }
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { let vivo = true; vistaPrevia(doc, 360).then((u) => vivo && setPreview(u)); return () => { vivo = false; }; }, [doc]);
  useEffect(() => {
    if (modo !== "frase" || frases) return;
    fetchQuotes(user.id).then(setFrases).catch((e) => { console.error("[collage] frases:", e?.message || e); setFrases([]); });
  }, [modo, frases, user.id]);
  useEffect(() => { setElegida(null); }, [modo]);

  const resenas = (books || []).filter((b) => (b.review || "").trim().length > 0);
  const encima = modo === "solo" ? null : elegida;
  const listo = modo === "solo" || !!elegida;

  const publicar = async () => {
    if (!listo || ocupado) return;
    setOcupado(true); setError("");
    try {
      const blob = await exportarJPEG(doc);
      await publicarCollage({ userId: user.id, blob, formato: doc.formato, collageId, encima });
      onPublicado?.();
    } catch (err) {
      console.error("[collage] publicar:", err);
      setError(err?.code === "OFFLINE" ? "Se fue el internet. Cuando vuelva, otro intento." : "No se publicó. Otro intento y listo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <CollageHoja titulo="Publicar en Social" onClose={onClose}>
      <div role="radiogroup" aria-label="Qué va encima" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {MODOS.map((m) => {
          const activo = modo === m.id;
          return (
            <button key={m.id} role="radio" aria-checked={activo} onClick={() => setModo(m.id)} {...(m.id === "solo" ? { "data-autofocus": true } : {})}
              style={{ minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", ...body, fontSize: "15px", fontWeight: 700, border: `2px solid ${palette.ink}`, backgroundColor: activo ? palette.ink : "transparent", color: activo ? palette.bg : palette.ink }}>
              {m.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: doc.formato === "cuadrado" ? 220 : 170, aspectRatio: doc.formato === "cuadrado" ? "1" : "9 / 16", backgroundColor: palette.separadorFeed, boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
          {preview && <img src={preview} alt="Vista previa del collage" style={{ width: "100%", height: "100%", display: "block" }} />}
          {encima && <CollageTarjetaEncima encima={encima} mini />}
        </div>
      </div>

      {modo === "frase" && (
        <Lista etiqueta="Frase para poner encima" vacio="Sin frases guardadas todavía." cargando={!frases}>
          {(frases || []).map((q) => {
            const v = { tipo: "frase", texto: q.text, libro: q.bookTitle || null, autor: q.bookAuthor || null };
            const sel = elegida?.texto === q.text;
            return <Opcion key={q.id} sel={sel} onClick={() => setElegida(v)} titulo={q.text} detalle={[q.bookTitle, q.bookAuthor].filter(Boolean).join(" · ")} />;
          })}
        </Lista>
      )}
      {modo === "resena" && (
        <Lista etiqueta="Reseña para poner encima" vacio="Ninguna reseña escrita todavía. Se escriben en el detalle de cada libro." cargando={false}>
          {resenas.map((b) => {
            const v = { tipo: "resena", texto: b.review.trim(), libro: b.title, autor: b.author || null, calificacion: b.rating || 0 };
            const sel = elegida?.libro === b.title && elegida?.texto === v.texto;
            return <Opcion key={b.id} sel={sel} onClick={() => setElegida(v)} titulo={b.title} detalle={b.review.trim()} />;
          })}
        </Lista>
      )}

      {error && <p role="alert" style={{ ...body, fontSize: "14px", fontWeight: 600, color: palette.danger, margin: "0 0 10px" }}>{error}</p>}
      <BotonHoja onClick={publicar} disabled={!listo || ocupado}>{ocupado ? "Publicando…" : "Publicar"}</BotonHoja>
      <p style={{ ...body, fontSize: "14px", color: palette.inkSoft, margin: "10px 0 0", textAlign: "center" }}>Lo publicado ya no cambia aunque después edites el collage.</p>
    </CollageHoja>
  );
}

function Lista({ children, vacio, cargando, etiqueta }) {
  const vacia = !cargando && (!children || (Array.isArray(children) && children.length === 0));
  return (
    <div role="radiogroup" aria-label={etiqueta} style={{ maxHeight: "28dvh", overflowY: "auto", marginBottom: 14, borderTop: `1px solid ${palette.borderSoft}` }}>
      {cargando && <p style={{ ...body, fontSize: "15px", color: palette.inkSoft, padding: "12px 4px", margin: 0 }}>Cargando…</p>}
      {vacia && <p style={{ ...body, fontSize: "15px", color: palette.inkSoft, padding: "12px 4px", margin: 0 }}>{vacio}</p>}
      {children}
    </div>
  );
}

function Opcion({ sel, onClick, titulo, detalle }) {
  return (
    <button role="radio" aria-checked={sel} onClick={onClick} className="sema-row"
      style={{ width: "100%", textAlign: "left", minHeight: 52, padding: "10px 8px", background: sel ? palette.superficieSuave : "none", border: "none", borderBottom: `1px solid ${palette.borderSoft}`, cursor: "pointer", color: palette.ink, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span aria-hidden style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0, borderRadius: "50%", border: `2px solid ${palette.ink}`, boxShadow: sel ? `inset 0 0 0 4px ${sel ? palette.superficieSuave : palette.bg}` : "none", backgroundColor: sel ? palette.ink : "transparent" }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ ...body, fontSize: "15px", fontWeight: 700, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{titulo}</span>
        {detalle && <span style={{ ...body, fontSize: "14px", color: palette.inkSoft, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginTop: 2 }}>{detalle}</span>}
      </span>
    </button>
  );
}

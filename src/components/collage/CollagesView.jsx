// Pestaña «Collage» (2026-11-06): mis collages en cuadrícula + crear uno nuevo. Abre el editor encima.
import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { palette, display, body } from "../../theme.js";
import StickerButton from "../StickerButton.jsx";
import { Skeleton, SkeletonGroup } from "../Skeleton.jsx";
import { getEstadoCollage, listarCollages, borrarCollage } from "../../services/collageService.js";
import { getObjeto, LIMITES } from "../../services/collageCatalog.js";
import { Mascota } from "../../pets/Mascota.jsx";
import CollageEditor from "./CollageEditor.jsx";
import { CollageHoja, FilaHoja, BotonHoja } from "./CollageHoja.jsx";

const DECO = ["pieza-kraft", "botanico-margaritas"];

export default function CollagesView({ user, books, gemBalance, onGemsChanged, abrirNuevo, onAbrirNuevoHecho }) {
  const [estado, setEstado] = useState(null);
  const [collages, setCollages] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // null | { collage }
  const [menu, setMenu] = useState(null); // collage con su hoja de opciones
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [tope, setTope] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    const [e, l] = await Promise.all([
      getEstadoCollage(user.id),
      listarCollages(user.id).catch((err) => { setError("No cargaron tus collages. Puede ser el internet."); console.error(err); return []; }),
    ]);
    setEstado({ ...e, usados: l.length });
    setCollages(l);
  }, [user.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const limite = estado?.plus ? null : estado?.limite ?? LIMITES.collagesSinPlus;
  const lleno = limite != null && (collages?.length || 0) >= limite;
  const nuevo = () => { if (lleno) setTope(true); else setEditor({ collage: null }); };

  // Desde la celebración de un set nuevo: abrir el editor directo.
  useEffect(() => {
    if (!abrirNuevo || !collages) return;
    onAbrirNuevoHecho?.();
    nuevo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirNuevo, collages]);

  const borrar = async (c) => {
    try {
      await borrarCollage(user.id, c.id);
      setMenu(null); setConfirmarBorrar(false);
      await cargar();
    } catch (err) {
      console.error(err);
      setError("No se borró. Otro intento.");
    }
  };

  return (
    <div className="px-4 sm:px-6 pt-4 max-w-xl mx-auto">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: "1rem" }}>
        <div>
          <h1 style={{ ...display, fontSize: "26px", fontWeight: 800, lineHeight: 1.1, color: palette.ink, margin: 0 }}>Collages</h1>
          {collages && (
            <p style={{ ...body, fontSize: "15px", color: palette.inkSoft, margin: "6px 0 0" }}>
              {limite == null ? `${collages.length} ${collages.length === 1 ? "guardado" : "guardados"}` : `${collages.length} de ${limite} guardados`}
            </p>
          )}
        </div>
      </div>

      <StickerButton onClick={nuevo} leadingIcon={Plus} arrow={false}>Nuevo collage</StickerButton>

      {error && <p role="alert" style={{ ...body, fontSize: "15px", color: palette.danger, margin: "14px 0 0" }}>{error}</p>}
      {import.meta.env.DEV && estado?.modo === "local" && (
        <p style={{ ...body, fontSize: "14px", color: palette.inkSoft, margin: "12px 0 0" }}>Modo local (solo desarrollo): falta correr supabase/collages_mvp_2026-11-06.sql, así que todo se guarda en este navegador.</p>
      )}

      {!collages ? (
        <SkeletonGroup label="Cargando collages" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={0} radius={6} style={{ aspectRatio: "9 / 16", height: "auto" }} />)}
        </SkeletonGroup>
      ) : collages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.25rem 0.5rem 1rem" }}>
          {/* La mascota habla en los vacíos (principio 6): el gato chico con un recorte de kraft y unas margaritas detrás. */}
          <div aria-hidden style={{ position: "relative", height: 150, width: 220, margin: "0 auto 14px" }}>
            {DECO.map((id, i) => {
              const o = getObjeto(id);
              return o ? <img key={id} src={o.miniatura} alt="" style={{ position: "absolute", width: i ? 84 : 150, height: i ? 84 : 60, objectFit: "contain", left: i ? 150 : 10, top: i ? 40 : 70, transform: i ? "none" : "rotate(-6deg)" }} /> : null;
            })}
            <span style={{ position: "absolute", left: 62, bottom: 0 }}><Mascota tamaño={118} pausa canto={palette.bg} /></span>
          </div>
          <p style={{ ...display, fontSize: "18px", fontWeight: 800, color: palette.ink, margin: "0 0 6px" }}>Todavía sin collages</p>
          <p style={{ ...body, fontSize: "15px", lineHeight: 1.5, color: palette.inkSoft, margin: 0 }}>Stickers, papeles y frases de tus libros.<br />Se arma en un minuto.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {collages.map((c, i) => (
            <li key={c.id} style={{ position: "relative" }}>
              <button onClick={() => setEditor({ collage: c })} aria-label={`Editar collage ${i + 1}`} className="sema-card"
                style={{ display: "block", width: "100%", padding: 0, border: `1px solid ${palette.borderSoft}`, background: palette.separadorFeed, cursor: "pointer", aspectRatio: "9 / 16", overflow: "hidden", borderRadius: 6 }}>
                {c.preview
                  ? <img src={c.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  : <span style={{ ...body, fontSize: "14px", color: palette.inkSoft }}>Sin vista previa</span>}
              </button>
              <button onClick={() => { setMenu(c); setConfirmarBorrar(false); }} aria-label={`Opciones del collage ${i + 1}`}
                style={{ position: "absolute", top: 6, right: 6, width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 1.5px ${palette.ink}` }}>
                <MoreHorizontal size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {menu && (
        <CollageHoja titulo={confirmarBorrar ? "¿Borrar este collage?" : "Collage"} onClose={() => setMenu(null)}>
          {!confirmarBorrar ? (
            <>
              <FilaHoja icon={Pencil} data-autofocus onClick={() => { setEditor({ collage: menu }); setMenu(null); }}>Editar</FilaHoja>
              <FilaHoja icon={Trash2} peligro onClick={() => setConfirmarBorrar(true)} detalle="Lo que ya publicaste en Social se queda.">Borrar</FilaHoja>
            </>
          ) : (
            <>
              <p style={{ ...body, fontSize: "16px", color: palette.ink, margin: "0 0 16px" }}>Se va de Mis collages para siempre. Lo publicado en Social se queda.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <BotonHoja data-autofocus onClick={() => borrar(menu)} style={{ backgroundColor: palette.badge, color: palette.onColor }}>Sí, borrar</BotonHoja>
                <BotonHoja secundario onClick={() => setConfirmarBorrar(false)}>Mejor no</BotonHoja>
              </div>
            </>
          )}
        </CollageHoja>
      )}

      {tope && (
        <CollageHoja titulo={`Ya hay ${limite} collages guardados`} onClose={() => setTope(false)}>
          <p style={{ ...body, fontSize: "16px", lineHeight: 1.5, color: palette.ink, margin: "0 0 6px" }}>Borra uno de tus collages para crear otro. Se borra desde los tres puntos.</p>
          <p style={{ ...body, fontSize: "15px", lineHeight: 1.5, color: palette.inkSoft, margin: "0 0 18px" }}>Collages ilimitados en Sema Plus (próximamente).</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <BotonHoja data-autofocus onClick={() => setTope(false)}>Entendido</BotonHoja>
            <BotonHoja secundario onClick={() => { setTope(false); setEditor({ collage: null }); }}>Armar uno sin guardarlo</BotonHoja>
          </div>
        </CollageHoja>
      )}

      {editor && (
        <CollageEditor
          user={user}
          collage={editor.collage}
          estado={estado}
          gemBalance={gemBalance}
          onGemsChanged={onGemsChanged}
          onEstadoChanged={cargar}
          books={books}
          onSaved={() => cargar()}
          onClose={() => { setEditor(null); cargar(); }}
          onVerCollages={() => { setEditor(null); cargar(); }}
        />
      )}
    </div>
  );
}

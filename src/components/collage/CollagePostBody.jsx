// Publicación «collage» del feed (2026-11-06). La imagen es la exportación congelada (post.image_url).
// Si se publicó con una frase o una reseña encima, se pinta una tarjeta de papel blanco con texto en tinta
// sobre la parte baja de la imagen: el texto se lee siempre, sin importar los colores del collage
// (blanco #FFFFFF + tinta #483A58 = 10.39:1; fijos en claro y oscuro porque van sobre la imagen).
import { Star } from "lucide-react";
import { palette, display, body, quote as quoteFont } from "../../theme.js";

const PAPEL = "#FFFFFF";
const TINTA = "#483A58";

export function CollageTarjetaEncima({ encima, mini = false }) {
  if (!encima?.texto) return null;
  const esResena = encima.tipo === "resena";
  const largo = encima.texto.length;
  const tam = mini ? 12 : largo > 220 ? 17 : largo > 120 ? 19 : 22;
  const credito = [encima.libro, encima.autor].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        position: "absolute", left: mini ? 8 : "6%", right: mini ? 8 : "6%", bottom: mini ? 10 : "7%",
        backgroundColor: PAPEL, color: TINTA, padding: mini ? "8px 9px" : "16px 18px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.28)", transform: "rotate(-1deg)",
        maxHeight: mini ? "60%" : "62%", overflow: "hidden",
      }}
    >
      {esResena && (
        <p style={{ ...display, fontSize: mini ? "12px" : "16px", fontWeight: 800, lineHeight: 1.2, margin: "0 0 6px", color: TINTA }}>
          {encima.libro}
          {encima.calificacion > 0 && (
            <span role="img" aria-label={`${encima.calificacion} de 5 estrellas`} style={{ display: "inline-flex", gap: 1, marginLeft: 8, verticalAlign: "middle" }}>
              {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={mini ? 9 : 14} color={TINTA} fill={n <= encima.calificacion ? TINTA : "none"} strokeWidth={2} aria-hidden />)}
            </span>
          )}
        </p>
      )}
      <p style={{ ...(esResena ? body : quoteFont), fontSize: `${tam}px`, lineHeight: esResena ? 1.45 : 1.3, margin: 0, color: TINTA, display: "-webkit-box", WebkitLineClamp: mini ? 4 : 8, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {encima.texto}
      </p>
      {!esResena && credito && !mini && (
        <p style={{ ...body, fontSize: "14px", fontWeight: 600, margin: "8px 0 0", color: TINTA }}>— {credito}</p>
      )}
    </div>
  );
}

export function CollagePostBody({ post }) {
  const c = post.collage || {};
  const cuadrado = c.formato === "cuadrado";
  // El texto de la frase o reseña ya se lee en la tarjeta: el alt no lo repite.
  const alt = c.encima?.tipo === "frase" ? "Collage con una frase" : c.encima?.tipo === "resena" ? "Collage con una reseña" : "Collage";
  if (!post.image_url) return null;
  return (
    <div style={{ position: "relative", width: cuadrado ? "100%" : "min(100%, calc(min(78dvh, 720px) * 9 / 16))", aspectRatio: cuadrado ? "1" : "9 / 16", margin: "10px auto 0", overflow: "hidden", backgroundColor: palette.superficieSuave }}>
      <img src={post.image_url} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <CollageTarjetaEncima encima={c.encima} />
    </div>
  );
}

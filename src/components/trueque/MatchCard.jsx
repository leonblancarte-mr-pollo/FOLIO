import { MessageCircle, Star, MapPin, ArrowLeftRight, BookOpen } from "lucide-react";
import { palette, body, display } from "../../theme.js";
import { zoneLabel } from "../../config/zones.js";
import { CONDITION_LABELS } from "./ui.jsx";

function daysLeft(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function BookLine({ label, title, author, extra }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      {title ? (
        <>
          <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink, margin: "0.1rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          <p style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, margin: 0 }}>{author}{extra ? ` · ${extra}` : ""}</p>
        </>
      ) : (
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, margin: "0.1rem 0 0", fontStyle: "italic" }}>Por acordar en el chat</p>
      )}
    </div>
  );
}

// Tarjeta de un match (fila de get_my_exchange_matches / find_book_matches).
function MatchCard({ match, onMessage, onRate }) {
  const perfect = match.match_type === "perfecto";
  const closed = match.status === "completed";
  const days = daysLeft(match.expires_at);

  return (
    <div style={{ padding: "0.9rem", borderRadius: 16, backgroundColor: palette.bgCard, border: `1.5px solid ${perfect ? palette.sage + "88" : palette.amber + "66"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.7rem" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", backgroundColor: palette.bgSoft, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: palette.accent }}>
          {match.other_avatar_url ? <img src={match.other_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (match.other_name || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...display, fontSize: "0.98rem", fontWeight: 600, color: palette.ink, margin: 0 }}>
            {match.other_name || "Lector"} {match.other_username && <span style={{ ...body, fontWeight: 400, fontSize: "0.82rem", color: palette.inkFaint }}>@{match.other_username}</span>}
          </p>
          <p style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft, margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Star size={12} color={palette.amber} fill={match.other_rating_count ? palette.amber : "none"} />
            {match.other_rating_count ? `${match.other_rating_avg} (${match.other_rating_count})` : "Sin calificaciones"}
          </p>
        </div>
        <span style={{ flexShrink: 0, padding: "0.2rem 0.55rem", borderRadius: 999, ...body, fontSize: "0.75rem", fontWeight: 600, backgroundColor: perfect ? `${palette.sage}22` : `${palette.amber}22`, color: perfect ? palette.sage : "#9A6A1F" }}>
          {perfect ? "🟢 Perfecto" : "🟡 Parcial"}
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", padding: "0.6rem", borderRadius: 12, backgroundColor: palette.bg }}>
        <div style={{ width: 40, height: 56, borderRadius: 5, overflow: "hidden", backgroundColor: palette.bgSoft, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {match.their_book_photo_url ? <img src={match.their_book_photo_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={16} color={palette.inkFaint} />}
        </div>
        <BookLine label="Recibes" title={match.their_book_title} author={match.their_book_author} extra={CONDITION_LABELS[match.their_book_condition]} />
        <ArrowLeftRight size={16} color={palette.inkFaint} style={{ flexShrink: 0 }} />
        <BookLine label="Das" title={match.my_book_title} author={match.my_book_author} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", margin: "0.6rem 0 0.1rem", alignItems: "center" }}>
        <MapPin size={13} color={palette.inkFaint} />
        {(match.shared_zones || []).map((z) => (
          <span key={z} style={{ padding: "0.1rem 0.5rem", borderRadius: 999, backgroundColor: palette.bgSoft, ...body, fontSize: "0.75rem", color: palette.inkSoft }}>{zoneLabel(z)}</span>
        ))}
        {match.via_reading_list && (
          <span style={{ padding: "0.1rem 0.5rem", borderRadius: 999, backgroundColor: `${palette.mauve}22`, ...body, fontSize: "0.75rem", color: palette.mauve }}>📚 De tu lista "Por leer"</span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.7rem" }}>
        <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, margin: 0, flex: 1 }}>
          {closed ? "✅ Intercambio completado" : `${match.status === "chatting" ? "💬 En conversación · " : ""}Expira en ${days} día${days === 1 ? "" : "s"}`}
        </p>
        {closed && !match.i_rated && (
          <button onClick={() => onRate(match)} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: `1.5px solid ${palette.accent}`, backgroundColor: "transparent", color: palette.accent, cursor: "pointer", ...display, fontSize: "0.85rem", fontWeight: 600 }}>
            Calificar
          </button>
        )}
        <button onClick={() => onMessage(match)} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: "none", backgroundColor: palette.accent, color: "#fff", cursor: "pointer", ...display, fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <MessageCircle size={15} /> {closed ? "Ver chat" : match.status === "chatting" ? "Abrir chat" : "Enviar mensaje"}
        </button>
      </div>
    </div>
  );
}

export { MatchCard };

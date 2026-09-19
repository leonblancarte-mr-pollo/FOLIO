import { useState } from "react";
import { Trash2, BookOpen } from "lucide-react";
import { palette, body, display } from "../../theme.js";
import { CONDITION_LABELS } from "./ui.jsx";

// Tarjeta de libro del Trueque (ofrecido o buscado). Borrado en dos toques.
function BookCard({ book, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 3000); return; }
    setBusy(true);
    try { await onDelete(book.id); } finally { setBusy(false); setConfirming(false); }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.75rem", borderRadius: 14, backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}` }}>
      <div style={{ width: 46, height: 64, borderRadius: 6, flexShrink: 0, overflow: "hidden", backgroundColor: palette.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {book.photo_url
          ? <img src={book.photo_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <BookOpen size={20} color={palette.inkFaint} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...display, fontSize: "0.98rem", fontWeight: 600, color: palette.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft, margin: "0.1rem 0 0" }}>
          {book.author}{book.editor ? ` · ${book.editor}` : ""}
        </p>
        {book.condition && (
          <span style={{ display: "inline-block", marginTop: "0.3rem", padding: "0.1rem 0.5rem", borderRadius: 999, backgroundColor: `${palette.amber}22`, color: palette.inkSoft, ...body, fontSize: "0.72rem" }}>
            {CONDITION_LABELS[book.condition] || book.condition}
          </span>
        )}
      </div>
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={busy}
          aria-label="Quitar"
          style={{ flexShrink: 0, background: confirming ? "#c0392b" : "none", border: "none", borderRadius: 8, cursor: "pointer", padding: confirming ? "0.35rem 0.6rem" : "0.35rem", color: confirming ? "#fff" : palette.inkFaint, ...body, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
        >
          <Trash2 size={16} />{confirming && "¿Quitar?"}
        </button>
      )}
    </div>
  );
}

export { BookCard };

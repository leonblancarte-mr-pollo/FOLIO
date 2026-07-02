import { useState, useEffect } from "react";
import { Bookmark, BookOpen, Eye, CheckCircle } from "lucide-react";
import BookCoverImage from "./BookCoverImage.jsx";

const P = {
  bg: "#F4EDE0", ink: "#2A1F1A", inkSoft: "#5C4A3F", inkFaint: "#8B7B6E",
  accent: "#7A2E2E", border: "#D4C9B5",
};
const serif = { fontFamily: "Fraunces, serif" };
const body  = { fontFamily: "'EB Garamond', serif" };

const STATUS_OPTIONS = [
  { id: "want_to_read", label: "Por leer",     icon: Bookmark,    desc: "Lo añado a mi lista de lectura",  color: "#7A2E2E", bg: "#F5EAEA", border: "#E0BCBC" },
  { id: "reading",      label: "Leyendo",       icon: BookOpen,    desc: "Lo estoy leyendo ahora mismo",    color: "#3D7A5C", bg: "#EAF5EF", border: "#A8D4BC" },
  { id: "wish",         label: "Quiero leer",   icon: Eye,         desc: "En mi lista de deseos",           color: "#1B3A4B", bg: "#E5EFF5", border: "#A8C4D4" },
  { id: "read",         label: "Leído",         icon: CheckCircle, desc: "Ya lo terminé",                   color: "#5C4A3F", bg: "#F0EBE5", border: "#C8B8A8" },
];

export default function ReadingStatusModal({ book, onConfirm, onClose }) {
  const [selected, setSelected] = useState("want_to_read");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function handleConfirm() {
    const opt = STATUS_OPTIONS.find((o) => o.id === selected);
    setVisible(false);
    setTimeout(() => onConfirm(selected, opt.label), 300);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: visible ? "rgba(42,31,26,0.62)" : "rgba(42,31,26,0)",
          backdropFilter: visible ? "blur(4px)" : "none",
          transition: "background-color 300ms ease, backdrop-filter 300ms ease",
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 480, margin: "0 auto",
          backgroundColor: P.bg,
          borderRadius: "24px 24px 0 0",
          padding: "0 1.25rem 2.5rem",
          boxShadow: "0 -8px 40px rgba(42,31,26,0.18)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, margin: "14px auto 1.25rem" }} />

        {/* Book mini preview */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.4rem" }}>
          <div style={{
            position: "relative", width: 44, height: 60, borderRadius: 7, flexShrink: 0,
            overflow: "hidden", boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
          }}>
            <BookCoverImage
              coverUrl={book.cover_url}
              title={book.title}
              author={book.author}
              genres={book.genres}
              compact
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...serif, fontSize: "1rem", fontWeight: 700, fontStyle: "italic", color: P.ink, lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book.title}
            </p>
            <p style={{ ...body, fontSize: "0.88rem", color: P.inkSoft, margin: "2px 0 0" }}>{book.author}</p>
          </div>
        </div>

        <p style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: P.ink, marginBottom: "0.9rem" }}>
          ¿Cómo quieres guardarlo?
        </p>

        {/* Status options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1.25rem" }}>
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                style={{
                  width: "100%", padding: "0.8rem 1rem",
                  borderRadius: 14,
                  border: `2px solid ${active ? opt.color : P.border}`,
                  backgroundColor: active ? opt.bg : "transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.85rem",
                  transition: "border-color 140ms ease, background-color 140ms ease",
                  textAlign: "left",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  backgroundColor: active ? opt.color : "#E8E0D6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background-color 140ms ease",
                }}>
                  <Icon size={17} color={active ? "#fff" : P.inkFaint} strokeWidth={active ? 2.2 : 1.6} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...serif, fontSize: "0.97rem", fontWeight: 600, color: active ? opt.color : P.ink, margin: 0 }}>
                    {opt.label}
                  </p>
                  <p style={{ ...body, fontSize: "0.82rem", color: P.inkFaint, margin: 0 }}>{opt.desc}</p>
                </div>
                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: opt.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          style={{
            width: "100%", padding: "1rem",
            borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #7A2E2E 0%, #A4493D 100%)",
            color: "#fff", cursor: "pointer",
            ...serif, fontSize: "1.05rem", fontWeight: 600,
            boxShadow: "0 4px 18px rgba(122,46,46,0.35)",
          }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

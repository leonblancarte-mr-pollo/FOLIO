import { useState, useEffect } from "react";
import { Bookmark, BookOpen, Eye, CheckCircle } from "lucide-react";
import BookCoverImage from "./BookCoverImage.jsx";
import { palette } from "../theme.js";
const serif = { fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" };
const body  = { fontFamily: "Figtree, system-ui, sans-serif" };

// 2026-11-02: sin colores por estado (STATUS_COLORS sigue intacto para el resto de la app). La fila
// activa se marca con contorno de tinta y palomita; el texto siempre es ink / inkSoft.
const STATUS_OPTIONS = [
  { id: "want_to_read", label: "Por leer",     icon: Bookmark,    desc: "Lo añado a mi lista de lectura" },
  { id: "reading",      label: "Leyendo",       icon: BookOpen,    desc: "Lo estoy leyendo ahora mismo" },
  { id: "wish",         label: "Quiero leer",   icon: Eye,         desc: "En mi lista de deseos" },
  { id: "read",         label: "Leído",         icon: CheckCircle, desc: "Ya lo terminé" },
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
          backgroundColor: visible ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
          transition: "background-color 300ms ease",
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 480, margin: "0 auto",
          backgroundColor: palette.bg,
          borderRadius: "24px 24px 0 0",
          padding: "0 1.25rem 2.5rem",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: palette.border, borderRadius: 2, margin: "14px auto 1.25rem" }} />

        {/* Book mini preview */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.4rem" }}>
          <div style={{
            position: "relative", width: 44, height: 60, borderRadius: 7, flexShrink: 0,
            overflow: "hidden",
          }}>
            <BookCoverImage
              coverUrl={book.coverUrl}
              title={book.title}
              author={book.author}
              genres={book.genres}
              alt=""
              compact
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...serif, fontSize: "1rem", fontWeight: 700, color: palette.ink, lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book.title}
            </p>
            <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, margin: "2px 0 0" }}>{book.author}</p>
          </div>
        </div>

        <p style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: palette.ink, marginBottom: "0.9rem" }}>
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
                aria-pressed={active}
                style={{
                  width: "100%", padding: "0.8rem 1rem",
                  borderRadius: 14,
                  border: active ? `2px solid ${palette.ink}` : `1.5px solid ${palette.border}`,
                  backgroundColor: "transparent",
                  minHeight: 56,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.85rem",
                  transition: "border-color 140ms ease, background-color 140ms ease",
                  textAlign: "left",
                }}
              >
                <Icon size={20} color={active ? palette.ink : palette.inkSoft} strokeWidth={active ? 2.2 : 1.7} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...serif, fontSize: "0.97rem", fontWeight: 600, color: palette.ink, margin: 0 }}>
                    {opt.label}
                  </p>
                  <p style={{ ...body, fontSize: "13px", color: palette.inkSoft, margin: 0 }}>{opt.desc}</p>
                </div>
                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: palette.ink,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                      <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke={palette.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            // 2026-11-02: durazno plano (acción principal). Antes BRAND.gradientFab (vino) con
            // texto #483A58 encima daba 1.12:1.
            backgroundColor: palette.accent,
            color: palette.onAccent, cursor: "pointer",
            ...serif, fontSize: "1.05rem", fontWeight: 600,
          }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

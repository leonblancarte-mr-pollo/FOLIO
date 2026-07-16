import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { palette, body, display } from "../theme.js";

// Al marcar un libro como leído, el usuario elige cuándo lo leyó:
// fecha exacta, solo el año, "antes de FOLIO" o "en otra vida".
function ReadDateModal({ book, onConfirm, onClose }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [option, setOption] = useState("exact");
  const [dateStr, setDateStr] = useState(todayStr);
  const [year, setYear] = useState(today.getFullYear());
  const years = [];
  for (let y = today.getFullYear(); y >= 1950; y--) years.push(y);

  const OPTIONS = [
    { id: "exact", emoji: "📅", label: "Fecha exacta", desc: "Sé exactamente cuándo lo terminé" },
    { id: "year", emoji: "📆", label: "Solo el año", desc: "Recuerdo el año, más o menos" },
    { id: "before_folio", emoji: "📚", label: "Antes de FOLIO", desc: "Lo leí antes de usar la app" },
    { id: "unknown", emoji: "✨", label: "En otra vida", desc: "Ni idea, pero lo leí" },
  ];

  function confirm() {
    let finishedAt = null;
    if (option === "exact") {
      const [y, m, d] = dateStr.split("-").map(Number);
      finishedAt = new Date(y, m - 1, d, 12).getTime();
    } else if (option === "year") {
      // Mitad del año para que cuente bien en stats anuales (o hoy si es el año actual)
      finishedAt = year === today.getFullYear() ? Date.now() : new Date(year, 5, 15, 12).getTime();
    }
    onConfirm({ finishedAt, precision: option });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 7000, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.25rem 1.25rem 2rem", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, backgroundColor: palette.border, borderRadius: 2, margin: "0 auto 1rem" }} />
        <p style={{ ...display, fontSize: "1.1rem", fontWeight: 700, color: palette.ink, marginBottom: "0.25rem" }}>¿Cuándo leíste este libro?</p>
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, fontStyle: "italic", marginBottom: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1rem" }}>
          {OPTIONS.map((opt) => {
            const active = option === opt.id;
            return (
              <div key={opt.id}>
                <button
                  onClick={() => setOption(opt.id)}
                  style={{
                    width: "100%", padding: "0.7rem 0.9rem", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: `1.5px solid ${active ? palette.accent : palette.border}`,
                    backgroundColor: active ? `${palette.accent}12` : palette.bgCard,
                    display: "flex", alignItems: "center", gap: "0.7rem",
                  }}
                >
                  <span style={{ fontSize: "1.15rem", flexShrink: 0 }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: active ? palette.accent : palette.ink, margin: 0 }}>{opt.label}</p>
                    <p style={{ ...body, fontSize: "0.76rem", color: palette.inkFaint, margin: 0 }}>{opt.desc}</p>
                  </div>
                  {active && <CheckCircle2 size={17} color={palette.accent} style={{ flexShrink: 0 }} />}
                </button>
                {active && opt.id === "exact" && (
                  <input
                    type="date"
                    value={dateStr}
                    max={todayStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    style={{ width: "100%", marginTop: "0.4rem", padding: "0.6rem 0.85rem", borderRadius: 10, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, ...body, fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                  />
                )}
                {active && opt.id === "year" && (
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    style={{ width: "100%", marginTop: "0.4rem", padding: "0.6rem 0.85rem", borderRadius: 10, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, ...body, fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                  >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={confirm}
          disabled={option === "exact" && !dateStr}
          style={{ width: "100%", padding: "0.9rem", borderRadius: 12, border: "none", backgroundColor: palette.accent, color: "#fff", cursor: "pointer", ...display, fontSize: "1rem", fontWeight: 600 }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

export { ReadDateModal };

import { useState } from "react";
import { palette, body } from "../../theme.js";
import { REPORT_REASONS, reportTruequeUser } from "../../services/truequeService.js";
import { Sheet, PrimaryButton, ErrorText, Label, fieldStyle } from "./ui.jsx";

const DETAILS_MAX = 500;

// Reportar al otro participante desde el chat (RPC report_trueque_user).
// No hay pantalla de moderación: León revisa public.trueque_reports en Supabase.
function ReportModal({ match, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!reason || sending) return;
    setSending(true);
    setErr("");
    try {
      await reportTruequeUser({ reportedId: match.other_user_id, reason, details, matchId: match.match_id });
      onDone();
    } catch (e) {
      setErr(e.message || "No se pudo enviar el reporte.");
      setSending(false);
    }
  }

  return (
    <Sheet title={`Reportar a ${match.other_name || "este usuario"}`} onClose={onClose}>
      <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, margin: "0 0 0.8rem", lineHeight: 1.45 }}>
        Tu reporte es confidencial. Si estás en peligro, llama al 911.
      </p>
      <div role="radiogroup" aria-label="Motivo del reporte" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.9rem" }}>
        {REPORT_REASONS.map((r) => (
          <label key={r.id} style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer", padding: "0.6rem 0.7rem", borderRadius: 10, backgroundColor: palette.bgCard, border: `1.5px solid ${reason === r.id ? palette.accent : palette.border}` }}>
            <input type="radio" name="report-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} style={{ accentColor: palette.accent }} />
            <span style={{ ...body, fontSize: "0.92rem", color: palette.ink }}>{r.label}</span>
          </label>
        ))}
      </div>
      <Label>Cuéntanos qué pasó (opcional)</Label>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX))}
        rows={3}
        maxLength={DETAILS_MAX}
        aria-label="Detalles del reporte"
        style={{ ...fieldStyle(), resize: "vertical" }}
      />
      <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <ErrorText>{err}</ErrorText>
        <PrimaryButton onClick={send} disabled={!reason || sending}>{sending ? "Enviando…" : "Enviar reporte"}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export { ReportModal };

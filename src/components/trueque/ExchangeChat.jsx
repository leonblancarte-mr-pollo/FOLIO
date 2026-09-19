import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Send, Loader2, CheckCircle2 } from "lucide-react";
import { palette, body, display } from "../../theme.js";
import { getMatchChat, sendMessage, completeExchange } from "../../services/truequeService.js";

const POLL_MS = 8000;

function hhmm(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function mergeById(prev, incoming) {
  const map = new Map(prev.map((m) => [m.id, m]));
  incoming.forEach((m) => map.set(m.id, m));
  return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Chat 1:1 del match. Pagina de 50 en 50 ("cargar anteriores") y hace polling
// mientras está abierto (sin realtime en el MVP).
function ExchangeChat({ match, userId, onClose, onCompleted, onChanged }) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(match.status);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [err, setErr] = useState("");
  const bottomRef = useRef(null);

  const expired = new Date(match.expires_at).getTime() <= Date.now();
  const canWrite = (status === "pending" || status === "chatting") && !expired;

  const refresh = useCallback(async () => {
    const { messages: latest } = await getMatchChat(match.match_id);
    setMessages((prev) => mergeById(prev, latest));
  }, [match.match_id]);

  useEffect(() => {
    let alive = true;
    getMatchChat(match.match_id)
      .then(({ messages: m, hasMore: more }) => { if (alive) { setMessages(m); setHasMore(more); } })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    const t = setInterval(() => { refresh().catch(() => {}); }, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [match.match_id, refresh]);

  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loadingMore]);

  async function loadOlder() {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const { messages: older, hasMore: more } = await getMatchChat(match.match_id, { before: messages[0].created_at });
      setMessages((prev) => mergeById(prev, older));
      setHasMore(more);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function send() {
    const msg = text.trim();
    if (!msg || sending || !canWrite) return;
    setSending(true);
    setErr("");
    try {
      await sendMessage(match.match_id, msg);
      setText("");
      if (status === "pending") { setStatus("chatting"); onChanged?.(); }
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  async function complete() {
    if (!confirmComplete) { setConfirmComplete(true); return; }
    setErr("");
    try {
      await completeExchange(match.match_id);
      setStatus("completed");
      onCompleted?.(match);
    } catch (e) {
      setErr(e.message);
    } finally {
      setConfirmComplete(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, backgroundColor: palette.bg, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: `1px solid ${palette.border}`, backgroundColor: palette.bgCard }}>
        <button onClick={onClose} aria-label="Volver" style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
          <ChevronLeft size={22} color={palette.ink} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...display, fontSize: "1rem", fontWeight: 700, color: palette.ink, margin: 0 }}>{match.other_name || "Lector"}</p>
          <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {match.their_book_title || "—"} ⇄ {match.my_book_title || "—"}
          </p>
        </div>
        {status === "chatting" && !expired && (
          <button onClick={complete} style={{ flexShrink: 0, padding: "0.4rem 0.7rem", borderRadius: 10, border: `1.5px solid ${palette.sage}`, backgroundColor: confirmComplete ? palette.sage : "transparent", color: confirmComplete ? "#fff" : palette.sage, cursor: "pointer", ...body, fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <CheckCircle2 size={14} /> {confirmComplete ? "¿Confirmar?" : "Completado"}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {loading && <Loader2 size={22} className="animate-spin" style={{ margin: "2rem auto", color: palette.inkFaint }} />}
        {hasMore && (
          <button onClick={loadOlder} disabled={loadingMore} style={{ alignSelf: "center", background: "none", border: `1px solid ${palette.border}`, borderRadius: 999, padding: "0.3rem 0.9rem", cursor: "pointer", ...body, fontSize: "0.8rem", color: palette.inkSoft }}>
            {loadingMore ? "Cargando…" : "Cargar mensajes anteriores"}
          </button>
        )}
        {!loading && messages.length === 0 && (
          <p style={{ ...body, textAlign: "center", color: palette.inkFaint, fontSize: "0.9rem", margin: "2rem 0" }}>
            Rompe el hielo: propón un lugar público y un horario. 📚
          </p>
        )}
        {messages.map((m) => {
          if (m.is_system) {
            return <p key={m.id} style={{ alignSelf: "center", ...body, fontSize: "0.8rem", color: palette.inkSoft, backgroundColor: palette.bgSoft, padding: "0.35rem 0.8rem", borderRadius: 10, textAlign: "center", margin: "0.3rem 0" }}>{m.message}</p>;
          }
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <div style={{ padding: "0.55rem 0.8rem", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", backgroundColor: mine ? palette.accent : palette.bgCard, color: mine ? "#fff" : palette.ink, border: mine ? "none" : `1px solid ${palette.borderSoft}`, ...body, fontSize: "0.95rem", lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.message}
              </div>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, margin: "0.15rem 0.3rem 0", textAlign: mine ? "right" : "left" }}>{hhmm(m.created_at)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {err && <p style={{ ...body, fontSize: "0.82rem", color: "#c0392b", margin: 0, padding: "0 1rem 0.4rem" }}>{err}</p>}
      <div style={{ display: "flex", gap: "0.5rem", padding: "0.7rem 1rem calc(0.7rem + env(safe-area-inset-bottom))", borderTop: `1px solid ${palette.border}`, backgroundColor: palette.bgCard }}>
        {canWrite ? (
          <>
            <input
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escribe un mensaje…"
              style={{ flex: 1, padding: "0.7rem 0.9rem", borderRadius: 999, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bg, color: palette.ink, ...body, fontSize: "0.95rem", outline: "none", minWidth: 0 }}
            />
            <button onClick={send} disabled={!text.trim() || sending} aria-label="Enviar" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", backgroundColor: text.trim() ? palette.accent : palette.border, cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {sending ? <Loader2 size={18} color="#fff" className="animate-spin" /> : <Send size={18} color="#fff" />}
            </button>
          </>
        ) : (
          <p style={{ ...body, fontSize: "0.88rem", color: palette.inkFaint, margin: "0.4rem auto" }}>
            {status === "completed" ? "Intercambio completado. El chat quedó cerrado." : expired || status === "expired" ? "Este chat expiró (14 días)." : "Este intercambio fue cancelado."}
          </p>
        )}
      </div>
    </div>
  );
}

export { ExchangeChat };

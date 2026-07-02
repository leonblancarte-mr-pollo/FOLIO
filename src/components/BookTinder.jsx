import { useState, useEffect, useRef, useCallback } from "react";
import { X, Heart, Loader2, Gem, RefreshCw, BookOpen, Info } from "lucide-react";
import { supabase } from "../supabase.js";
import {
  getPreferredGenres,
  getRecommendations,
  checkDailyLimit,
  incrementSaveCounter,
  buyExtraSaves,
} from "../services/recommendationService.js";
import ReadingStatusModal from "./ReadingStatusModal.jsx";
import BookCoverImage from "./BookCoverImage.jsx";

const P = {
  bg: "#F4EDE0", bgSoft: "#EBE3D2", bgCard: "#FBF6EB",
  ink: "#2A1F1A", inkSoft: "#5C4A3F", inkFaint: "#8B7B6E",
  accent: "#7A2E2E", accentSoft: "#A4493D",
  amber: "#C8924A",
  border: "#D4C9B5", borderSoft: "#DDD5C5",
  green: "#4A9D6A",
  red: "#C74A4A",
};

const serif = { fontFamily: "Fraunces, serif" };
const body  = { fontFamily: "'EB Garamond', serif" };

const SWIPE_THRESHOLD = 100;   // px para confirmar el swipe
const MAX_ROTATION = 16;       // grados

function haptic(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* no soportado */ }
}

// Genre pill — variante clara para overlay oscuro
function GenrePill({ label }) {
  return (
    <span style={{
      backgroundColor: "rgba(255,255,255,0.16)",
      color: "rgba(255,255,255,0.92)",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: 20, padding: "3px 10px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "0.75rem", fontWeight: 500,
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
    }}>
      {label}
    </span>
  );
}

function Toast({ msg, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2800);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      backgroundColor: P.ink, color: P.bg,
      borderRadius: 12, padding: "10px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.9rem", fontWeight: 500,
      zIndex: 300, whiteSpace: "nowrap",
      boxShadow: "0 4px 20px rgba(42,31,26,0.28)",
      animation: "tinderToastIn 220ms ease-out",
    }}>
      {msg}
    </div>
  );
}

function LimitModal({ onClose, onUseGems, gemBalance, buying }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 150,
        backgroundColor: "rgba(42,31,26,0.65)",
        backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "backdropIn 180ms ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480, backgroundColor: P.bg,
          borderRadius: "20px 20px 0 0", padding: "1.5rem 1.5rem 2.5rem",
          boxShadow: "0 -8px 32px rgba(42,31,26,0.15)",
          animation: "sheetUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "2.25rem", lineHeight: 1 }}>📚</span>
          <h2 style={{ ...serif, fontSize: "1.2rem", fontWeight: 700, color: P.ink, marginTop: "0.6rem" }}>
            Límite diario alcanzado
          </h2>
          <p style={{ ...body, fontSize: "0.97rem", color: P.inkSoft, marginTop: "0.4rem", lineHeight: 1.5 }}>
            Has guardado 15 libros hoy. Vuelve mañana o<br />
            gasta 5 gemas para desbloquear 5 más.
          </p>
        </div>
        <div style={{
          backgroundColor: P.bgCard, borderRadius: 12, padding: "0.9rem 1.1rem",
          border: `1px solid ${P.borderSoft}`, marginBottom: "1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ ...body, fontSize: "0.95rem", color: P.inkSoft }}>Tu balance</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, ...serif, fontWeight: 700, fontSize: "1.05rem", color: P.amber }}>
            <Gem size={16} /> {gemBalance} gemas
          </span>
        </div>
        <button
          onClick={onUseGems}
          disabled={gemBalance < 5 || buying}
          style={{
            width: "100%", padding: "0.95rem", borderRadius: 12, border: "none",
            cursor: gemBalance < 5 ? "not-allowed" : "pointer",
            background: gemBalance < 5
              ? P.border
              : `linear-gradient(135deg, ${P.accent} 0%, ${P.amber} 100%)`,
            color: gemBalance < 5 ? P.inkFaint : "#fff",
            ...serif, fontSize: "1rem", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: buying ? 0.7 : 1,
          }}
        >
          {buying ? <Loader2 size={18} className="animate-spin" /> : <Gem size={18} />}
          {buying ? "Procesando…" : gemBalance < 5 ? "Gemas insuficientes" : "Gastar 5 gemas · +5 guardados"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "0.75rem",
            backgroundColor: "transparent", border: "none", cursor: "pointer",
            ...body, fontSize: "0.95rem", color: P.inkFaint, marginTop: "0.5rem",
          }}
        >
          Volver mañana
        </button>
      </div>
    </div>
  );
}

// ─── Contenido visual de una card (portada + info) ──────────────────────────
function CardFace({ book, showInfo, onToggleInfo }) {
  const ratingStr = book.rating ? `${Number(book.rating).toFixed(1)} ⭐` : "";
  return (
    <>
      <BookCoverImage
        coverUrl={book.cover_url}
        title={book.title}
        author={book.author}
        genres={book.genres}
      />

      {/* Gradiente inferior + info */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "62%",
        background: "linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.72) 35%, rgba(0,0,0,0.28) 65%, transparent 100%)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "1.4rem 1.25rem 1.35rem",
        pointerEvents: "none",
      }}>
        {book.genres?.length > 0 && (
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
            {book.genres.slice(0, 3).map((g) => <GenrePill key={g} label={g} />)}
          </div>
        )}

        <h2 style={{
          ...serif, fontSize: "clamp(1.45rem, 5.5vw, 1.75rem)", fontWeight: 700, fontStyle: "italic",
          color: "#fff", lineHeight: 1.15, margin: "0 0 0.28rem",
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        }}>
          {book.title}
        </h2>

        <p style={{ ...body, fontSize: "1rem", color: "rgba(255,255,255,0.78)", margin: "0 0 0.5rem" }}>
          {book.author}
        </p>

        {book.description && (
          <p style={{
            ...body, fontSize: "0.92rem", color: "rgba(255,255,255,0.62)",
            lineHeight: 1.5, margin: 0,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {book.description}
          </p>
        )}
      </div>

      {/* Rating */}
      {ratingStr && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          backgroundColor: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          borderRadius: 10, padding: "5px 11px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "0.82rem", fontWeight: 600, color: "#fff",
          letterSpacing: "0.01em",
          pointerEvents: "none",
        }}>
          {ratingStr}
        </div>
      )}

      {/* Panel de info expandida */}
      {showInfo && (
        <div
          onClick={onToggleInfo}
          style={{
            position: "absolute", inset: 0,
            backgroundColor: "rgba(12,8,6,0.88)",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            padding: "1.75rem 1.5rem",
            display: "flex", flexDirection: "column", justifyContent: "center",
            animation: "backdropIn 200ms ease-out",
            cursor: "pointer",
          }}
        >
          <h3 style={{ ...serif, fontSize: "1.4rem", fontWeight: 700, fontStyle: "italic", color: "#fff", margin: "0 0 0.3rem" }}>
            {book.title}
          </h3>
          <p style={{ ...body, fontSize: "0.97rem", color: "rgba(255,255,255,0.72)", margin: "0 0 1rem" }}>
            {book.author}
          </p>
          {book.description && (
            <p style={{ ...body, fontSize: "1rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
              {book.description}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontFamily: "system-ui, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
            {book.pages   && <span>📄 {book.pages} páginas</span>}
            {book.rating  && <span>⭐ {Number(book.rating).toFixed(1)} de calificación</span>}
            {book.isbn    && <span>🔖 ISBN {book.isbn}</span>}
            {book.subgenres?.length > 0 && <span>🏷️ {book.subgenres.join(" · ")}</span>}
          </div>
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "1.5rem", textAlign: "center" }}>
            Toca para cerrar
          </p>
        </div>
      )}
    </>
  );
}

// ─── Skeleton de carga con la estructura de la card ─────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: "0.5rem 1rem 1.5rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ height: 26, width: 180, margin: "0 auto 0.6rem", borderRadius: 8, backgroundColor: P.bgSoft, animation: "skeletonPulse 1.3s ease-in-out infinite" }} />
      <div style={{ height: 5, borderRadius: 5, backgroundColor: P.bgSoft, marginBottom: "1.1rem", animation: "skeletonPulse 1.3s ease-in-out infinite" }} />
      <div style={{
        position: "relative", borderRadius: 22, overflow: "hidden",
        height: "clamp(420px, 64vh, 620px)",
        backgroundColor: P.bgSoft,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
          animation: "coverShimmer 1.4s ease-in-out infinite",
        }} />
        <div style={{ position: "absolute", bottom: "1.4rem", left: "1.25rem", right: "1.25rem" }}>
          <div style={{ height: 22, width: "35%", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.35)", marginBottom: 12 }} />
          <div style={{ height: 28, width: "75%", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.45)", marginBottom: 10 }} />
          <div style={{ height: 16, width: "45%", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.3)" }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginTop: "1.2rem" }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", backgroundColor: P.bgSoft, animation: "skeletonPulse 1.3s ease-in-out infinite" }} />
        <div style={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: P.bgSoft, animation: "skeletonPulse 1.3s ease-in-out infinite" }} />
        <div style={{ width: 62, height: 62, borderRadius: "50%", backgroundColor: P.bgSoft, animation: "skeletonPulse 1.3s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// demoBooks: catálogo inyectado para pruebas/demos sin auth ni Supabase
export default function BookTinder({ user, onAdd, demoBooks = null }) {
  const [books, setBooks]               = useState([]);
  const [index, setIndex]               = useState(0);
  const [limitStatus, setLimitStatus]   = useState({
    saves_used: 0, gems_spent: 0, limit: 15, effective_limit: 15, can_save: true, saves_left: 15,
  });
  const [gemBalance, setGemBalance]     = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [noGenres, setNoGenres]         = useState(false);
  const [toast, setToast]               = useState(null);
  const [showLimitModal, setShowLimitModal]   = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [buyingGems, setBuyingGems]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [showInfo, setShowInfo]         = useState(false);
  const toastIdRef = useRef(0);

  // Refs para animar sin re-render durante el drag
  const cardRef  = useRef(null);
  const likeRef  = useRef(null);
  const nopeRef  = useRef(null);
  const nextRef  = useRef(null);
  const dragRef  = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });
  const exitingRef = useRef(false); // card volando fuera / esperando modal

  const currentBook = books[index];
  const nextBook    = books[index + 1];
  const isLast      = !loading && books.length > 0 && index >= books.length;

  // ── Carga inicial ─────────────────────────────────────────────
  useEffect(() => {
    if (demoBooks) { setBooks(demoBooks); setIndex(0); setLoading(false); return; }
    if (!user?.id) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [{ genres }, limit, { data: gemsRow }] = await Promise.all([
          getPreferredGenres(user.id),
          checkDailyLimit(user.id),
          supabase.from("user_gems").select("balance").eq("user_id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;

        if (genres.length === 0) { setNoGenres(true); setLoading(false); return; }

        setLimitStatus(limit);
        setGemBalance(gemsRow?.balance ?? 0);

        const recs = await getRecommendations(user.id, genres, 20);
        if (!cancelled) { setBooks(recs); setIndex(0); setLoading(false); }
      } catch (err) {
        console.error("[BookTinder] init error:", err);
        if (!cancelled) { setError("No se pudieron cargar las recomendaciones."); setLoading(false); }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Cargar más cuando quedan pocas ────────────────────────────
  useEffect(() => {
    if (demoBooks || books.length === 0 || loading) return;
    if (index >= books.length - 3) {
      getPreferredGenres(user.id)
        .then(({ genres }) => getRecommendations(user.id, genres, 20))
        .then((more) => {
          if (more.length === 0) return;
          setBooks((prev) => {
            const seen = new Set(prev.map((b) => `${b.title}__${b.author}`));
            return [...prev, ...more.filter((b) => !seen.has(`${b.title}__${b.author}`))];
          });
        })
        .catch(() => {});
    }
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((msg) => {
    const id = ++toastIdRef.current;
    setToast({ msg, id });
  }, []);

  // ── Helpers de animación (mutación directa, 60fps) ────────────
  function setCardTransform(dx, dy, { transition = null, rotation = null } = {}) {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = transition || "none";
    const rot = rotation ?? Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, dx * 0.07));
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
  }

  function setOverlays(dx, { fade = false } = {}) {
    const like = likeRef.current, nope = nopeRef.current;
    const t = fade ? "opacity 200ms ease" : "none";
    if (like) { like.style.transition = t; like.style.opacity = Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD)); }
    if (nope) { nope.style.transition = t; nope.style.opacity = Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD)); }
  }

  function setNextScale(dx) {
    const el = nextRef.current;
    if (!el) return;
    const p = Math.min(1, Math.abs(dx) / (SWIPE_THRESHOLD * 1.6));
    el.style.transition = "none";
    el.style.transform = `scale(${0.95 + 0.05 * p}) translateY(${8 - 8 * p}px)`;
  }

  function springBack() {
    setCardTransform(0, 0, { transition: "transform 420ms cubic-bezier(0.175, 0.885, 0.32, 1.18)", rotation: 0 });
    setOverlays(0, { fade: true });
    const next = nextRef.current;
    if (next) { next.style.transition = "transform 300ms ease"; next.style.transform = "scale(0.95) translateY(8px)"; }
  }

  function flyOut(dir) {
    const w = typeof window !== "undefined" ? window.innerWidth : 480;
    const dy = dragRef.current.dy * 0.4 + 40;
    setCardTransform(dir === "right" ? w * 1.15 : -w * 1.15, dy, {
      transition: "transform 380ms cubic-bezier(0.25, 0.6, 0.35, 1)",
      rotation: dir === "right" ? 20 : -20,
    });
    if (dir === "right" && likeRef.current) likeRef.current.style.opacity = 1;
    if (dir === "left"  && nopeRef.current) nopeRef.current.style.opacity = 1;
    const next = nextRef.current;
    if (next) { next.style.transition = "transform 320ms cubic-bezier(0.23, 1, 0.32, 1)"; next.style.transform = "scale(1) translateY(0)"; }
  }

  function advance() {
    exitingRef.current = false;
    dragRef.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    setShowInfo(false);
    setIndex((i) => i + 1);
  }

  // ── Acciones ──────────────────────────────────────────────────
  function commitSkip() {
    if (!currentBook || saving || exitingRef.current) return;
    exitingRef.current = true;
    haptic(10);
    flyOut("left");
    setTimeout(advance, 300);
  }

  function attemptSave() {
    if (!currentBook || saving || exitingRef.current) return;
    if (!limitStatus.can_save) {
      springBack();
      setShowLimitModal(true);
      return;
    }
    exitingRef.current = true;
    haptic(15);
    flyOut("right");
    setShowStatusModal(true);
  }

  // ── Gestos (pointer events: mouse + touch) ────────────────────
  function onPointerDown(e) {
    if (saving || exitingRef.current || showStatusModal || showLimitModal || showInfo) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d.active) return;
    d.dx = e.clientX - d.startX;
    d.dy = e.clientY - d.startY;
    setCardTransform(d.dx, d.dy * 0.55);
    setOverlays(d.dx);
    setNextScale(d.dx);
  }

  function onPointerUp() {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (d.dx >= SWIPE_THRESHOLD)       attemptSave();
    else if (d.dx <= -SWIPE_THRESHOLD) commitSkip();
    else                               springBack();
  }

  // ── Confirmación de estado de lectura ─────────────────────────
  async function handleStatusConfirm(status, statusLabel) {
    setShowStatusModal(false);
    setSaving(true);

    setLimitStatus((prev) => ({
      ...prev,
      saves_used: prev.saves_used + 1,
      can_save: prev.saves_used + 1 < prev.effective_limit,
      saves_left: Math.max(0, prev.saves_left - 1),
    }));

    const book = currentBook;
    onAdd({
      title:    book.title,
      author:   book.author,
      status,
      genre:    book.genres?.[0] || null,
      summary:  book.description || null,
      coverUrl: book.cover_url || null,
      isbn:     book.isbn || null,
      moodTags: [],
      rating:   0,
    });

    incrementSaveCounter(user.id).catch(console.error);
    showToast(`✅ Guardado como "${statusLabel}"`);
    haptic([15, 30, 15]);
    advance();
    setSaving(false);
  }

  // Cancelar el modal: la card vuelve del vuelo
  function handleStatusCancel() {
    setShowStatusModal(false);
    exitingRef.current = false;
    springBack();
  }

  // ── Compra de gemas ───────────────────────────────────────────
  async function handleUseGems() {
    if (buyingGems) return;
    setBuyingGems(true);
    const result = await buyExtraSaves(user.id);
    setBuyingGems(false);

    if (!result.success) {
      showToast(result.error === "not_enough_gems" ? "💎 No tienes suficientes gemas" : "Error al procesar. Intenta de nuevo.");
      return;
    }

    setGemBalance(result.newBalance);
    setLimitStatus((prev) => ({
      ...prev,
      gems_spent:      prev.gems_spent + 5,
      effective_limit: prev.effective_limit + result.extraSaves,
      can_save:        true,
      saves_left:      result.extraSaves,
    }));
    setShowLimitModal(false);
    showToast(`+${result.extraSaves} guardados desbloqueados 🎉`);
  }

  // ── Estados especiales ────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <p style={{ ...body, fontSize: "0.97rem", color: P.inkSoft, marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ ...serif, fontSize: "0.9rem", color: P.accent, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  if (noGenres) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <BookOpen size={40} color={P.inkFaint} strokeWidth={1.2} style={{ marginBottom: "1rem" }} />
        <h3 style={{ ...serif, fontSize: "1.1rem", fontWeight: 600, color: P.ink, marginBottom: "0.5rem" }}>
          Configura tus géneros primero
        </h3>
        <p style={{ ...body, fontSize: "0.95rem", color: P.inkSoft, lineHeight: 1.55 }}>
          Configura tus géneros favoritos en tu perfil para empezar a descubrir libros.
        </p>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <BookOpen size={40} color={P.inkFaint} strokeWidth={1.2} style={{ marginBottom: "1rem" }} />
        <h3 style={{ ...serif, fontSize: "1.1rem", fontWeight: 600, color: P.ink, marginBottom: "0.5rem" }}>
          No hay libros disponibles
        </h3>
        <p style={{ ...body, fontSize: "0.95rem", color: P.inkSoft, lineHeight: 1.55, marginBottom: "1.25rem" }}>
          Vuelve en un rato: estamos rellenando la estantería.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ ...serif, fontSize: "0.9rem", color: P.accent, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  if (isLast) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <span style={{ fontSize: "2.5rem" }}>📚</span>
        <h3 style={{ ...serif, fontSize: "1.15rem", fontWeight: 600, color: P.ink, margin: "0.75rem 0 0.5rem" }}>
          ¡Guau, viste todos los libros disponibles!
        </h3>
        <p style={{ ...body, fontSize: "0.95rem", color: P.inkSoft, lineHeight: 1.55 }}>
          Vuelve mañana para más recomendaciones.
        </p>
      </div>
    );
  }

  const savesLeft = limitStatus.saves_left;
  const progress  = Math.min(100, (limitStatus.saves_used / limitStatus.effective_limit) * 100);
  const disabled  = saving;

  return (
    <>
      <style>{`
        @keyframes tinderToastIn { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes backdropIn    { from { opacity:0; } to { opacity:1; } }
        @keyframes sheetUp       { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes skeletonPulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
        @keyframes coverShimmer  { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
        @keyframes tinderTopIn   { from { transform:scale(0.955) translateY(8px); } to { transform:scale(1) translateY(0); } }

        .tinder-fab {
          display:flex; align-items:center; justify-content:center;
          border-radius:50%; cursor:pointer;
          transition: transform 130ms cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 130ms ease, opacity 150ms;
          -webkit-tap-highlight-color: transparent;
        }
        .tinder-fab:hover:not(:disabled)  { transform: scale(1.07); }
        .tinder-fab:active:not(:disabled) { transform: scale(0.88); }
        .tinder-fab:disabled { cursor: default; opacity: 0.45; }
      `}</style>

      <div style={{ padding: "0.5rem 1rem 1.5rem", maxWidth: 480, margin: "0 auto" }}>

        {/* ── Header: contador + progreso ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: "0.55rem" }}>
          <span aria-hidden style={{ fontSize: "1.05rem" }}>📖</span>
          <span style={{
            ...serif, fontSize: "1.45rem", fontWeight: 700, fontStyle: "italic",
            color: savesLeft > 0 ? P.ink : P.accent,
          }}>
            {savesLeft > 0 ? `${savesLeft} restantes hoy` : "Límite alcanzado"}
          </span>
        </div>

        <div style={{ height: 5, backgroundColor: P.border, borderRadius: 5, overflow: "hidden", marginBottom: "1.1rem" }}>
          <div style={{
            height: "100%", borderRadius: 5,
            width: `${progress}%`,
            background: savesLeft > 5
              ? `linear-gradient(90deg, ${P.amber}, ${P.accent})`
              : `linear-gradient(90deg, ${P.accent}, #E53E3E)`,
            transition: "width 450ms ease",
          }} />
        </div>

        {/* ── Stack de cards ── */}
        <div style={{ position: "relative", height: "clamp(420px, 64vh, 620px)" }}>

          {/* Card siguiente (detrás) */}
          {nextBook && (
            <div
              key={`next-${index + 1}`}
              ref={nextRef}
              aria-hidden
              style={{
                position: "absolute", inset: 0,
                borderRadius: 22, overflow: "hidden",
                transform: "scale(0.95) translateY(8px)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
                pointerEvents: "none",
              }}
            >
              <CardFace book={nextBook} showInfo={false} onToggleInfo={() => {}} />
            </div>
          )}

          {/* Card superior (draggable) */}
          {currentBook && (
            <div
              key={`top-${index}`}
              ref={cardRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                position: "absolute", inset: 0,
                borderRadius: 22, overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.14)",
                userSelect: "none", WebkitUserSelect: "none",
                touchAction: "none",
                cursor: "grab",
                animation: "tinderTopIn 260ms cubic-bezier(0.23, 1, 0.32, 1)",
                willChange: "transform",
              }}
            >
              <CardFace book={currentBook} showInfo={showInfo} onToggleInfo={() => setShowInfo(false)} />

              {/* Overlay GUARDAR (drag derecha) */}
              <div
                ref={likeRef}
                aria-hidden
                style={{
                  position: "absolute", top: 26, left: 20,
                  transform: "rotate(-14deg)",
                  border: `3.5px solid ${P.green}`,
                  color: P.green,
                  borderRadius: 10, padding: "4px 14px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "1.6rem", fontWeight: 800, letterSpacing: "0.08em",
                  backgroundColor: "rgba(0,0,0,0.18)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                  opacity: 0, pointerEvents: "none",
                }}
              >
                GUARDAR
              </div>

              {/* Overlay NOPE (drag izquierda) */}
              <div
                ref={nopeRef}
                aria-hidden
                style={{
                  position: "absolute", top: 26, right: 20,
                  transform: "rotate(14deg)",
                  border: `3.5px solid ${P.red}`,
                  color: P.red,
                  borderRadius: 10, padding: "4px 14px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "1.6rem", fontWeight: 800, letterSpacing: "0.08em",
                  backgroundColor: "rgba(0,0,0,0.18)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                  opacity: 0, pointerEvents: "none",
                }}
              >
                NOPE
              </div>
            </div>
          )}
        </div>

        {/* ── Botones de acción ── */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginTop: "1.2rem" }}>
          <button
            onClick={commitSkip}
            disabled={disabled}
            className="tinder-fab"
            aria-label="No me interesa"
            style={{
              width: 62, height: 62,
              border: `2px solid ${P.red}`,
              backgroundColor: P.bgCard,
              color: P.red,
              boxShadow: "0 4px 14px rgba(199,74,74,0.22)",
            }}
          >
            <X size={27} strokeWidth={2.4} />
          </button>

          <button
            onClick={() => setShowInfo((v) => !v)}
            disabled={disabled}
            className="tinder-fab"
            aria-label="Más información"
            style={{
              width: 46, height: 46,
              border: `1.5px solid ${P.border}`,
              backgroundColor: P.bgCard,
              color: P.inkSoft,
              boxShadow: "0 3px 10px rgba(42,31,26,0.12)",
            }}
          >
            <Info size={19} strokeWidth={2} />
          </button>

          <button
            onClick={attemptSave}
            disabled={disabled}
            className="tinder-fab"
            aria-label="Guardar libro"
            style={{
              width: 62, height: 62,
              border: "none",
              background: limitStatus.can_save
                ? `linear-gradient(135deg, ${P.accent} 0%, ${P.accentSoft} 100%)`
                : P.border,
              color: limitStatus.can_save ? "#fff" : P.inkFaint,
              boxShadow: limitStatus.can_save ? "0 6px 20px rgba(122,46,46,0.42)" : "none",
            }}
          >
            <Heart size={26} strokeWidth={2.2} fill="currentColor" />
          </button>
        </div>

        {/* ── Posición en el catálogo ── */}
        <p style={{
          textAlign: "center", marginTop: "0.85rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "0.77rem", color: P.inkFaint, letterSpacing: "0.02em",
        }}>
          {index + 1} de {books.length} libros
        </p>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast key={toast.id} msg={toast.msg} onDismiss={() => setToast(null)} />
      )}

      {/* ── Limit modal ── */}
      {showLimitModal && (
        <LimitModal
          onClose={() => setShowLimitModal(false)}
          onUseGems={handleUseGems}
          gemBalance={gemBalance}
          buying={buyingGems}
        />
      )}

      {/* ── Reading status modal ── */}
      {showStatusModal && currentBook && (
        <ReadingStatusModal
          book={currentBook}
          onConfirm={handleStatusConfirm}
          onClose={handleStatusCancel}
        />
      )}
    </>
  );
}

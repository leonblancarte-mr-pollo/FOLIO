import { useState, useEffect, useRef, useCallback } from "react";
import { X, Heart, Loader2, Gem, RefreshCw, BookOpen, Info } from "lucide-react";
import { loadGems } from "../services/gemsService.js";
import {
  getPreferredGenres,
  getRecommendations,
  checkDailyLimit,
  incrementSaveCounter,
  buyExtraSaves,
  DAILY_LIMIT,
} from "../services/recommendationService.js";
import ReadingStatusModal from "./ReadingStatusModal.jsx";
import BookCoverImage, { genericCoverScheme, GENERIC_BAND_PCT } from "./BookCoverImage.jsx";
import { haptic } from "../haptics.js";
import { palette, ts } from "../theme.js";

const serif = { fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" };
const body  = { fontFamily: "Figtree, system-ui, sans-serif" };

const SWIPE_THRESHOLD = 100;   // px para confirmar el swipe
const MAX_ROTATION = 16;       // grados

// Estrella de calificación (SVG propio, sema-identidad §6: nada de emoji). Relleno cálido y
// contorno del color del texto que la acompaña, para que se lea sobre foto, franja o fondo.
function Star({ size = 15, stroke }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0, display: "block" }}>
      <path
        d="M12 2.8l2.75 5.75 6.3.8-4.6 4.4 1.18 6.25L12 16.9 6.37 20l1.18-6.25-4.6-4.4 6.3-.8z"
        fill={palette.amberRich} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  );
}

// Línea de géneros + calificación, en texto plano (sin píldoras: principio 2).
function MetaLine({ genres, rating, color }) {
  if (genres.length === 0 && !rating) return null;
  return (
    <p style={{
      ...body, fontSize: "14px", fontWeight: 600, color, lineHeight: 1.3,
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "0 0 0.45rem",
    }}>
      {genres.length > 0 && <span>{genres.join(" · ")}</span>}
      {rating && (
        <span aria-label={`Calificación ${rating} de 5`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          {genres.length > 0 && <span aria-hidden>·</span>}
          <Star stroke={color} />
          <span aria-hidden>{rating}</span>
        </span>
      )}
    </p>
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
      backgroundColor: palette.ink, color: palette.bg,
      borderRadius: 12, padding: "10px 20px",
      ...body, fontSize: "15px", fontWeight: 500,
      zIndex: 300, whiteSpace: "nowrap",
      boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
      animation: "tinderToastIn 220ms ease-out",
    }}>
      {msg}
    </div>
  );
}

function LimitModal({ onClose, onUseGems, gemBalance, buying, savesUsed }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 150,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "backdropIn 180ms ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480, backgroundColor: palette.bg,
          borderRadius: "20px 20px 0 0", padding: "1.5rem 1.5rem 2.5rem",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
          animation: "sheetUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ ...serif, fontSize: "1.2rem", fontWeight: 700, color: palette.ink }}>
            Límite de hoy alcanzado
          </h2>
          <p style={{ ...body, fontSize: "0.97rem", color: palette.inkSoft, marginTop: "0.4rem", lineHeight: 1.5 }}>
            Has guardado {savesUsed} libros hoy. Vuelve mañana o<br />
            gasta 5 gemas para desbloquear 5 más.
          </p>
        </div>
        {/* Saldo como fila de texto, sin caja dentro de la hoja (principio 2) */}
        <div style={{
          padding: "0.25rem 0", marginBottom: "1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft }}>Tu saldo</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, ...serif, fontWeight: 700, fontSize: "1.05rem", color: palette.ink }}>
            <Gem size={16} /> {gemBalance} gemas
          </span>
        </div>
        <button
          onClick={onUseGems}
          disabled={gemBalance < 5 || buying}
          style={{
            width: "100%", padding: "0.95rem", borderRadius: 12, border: "none",
            cursor: gemBalance < 5 ? "not-allowed" : "pointer",
            backgroundColor: gemBalance < 5 ? palette.border : palette.accent,
            color: gemBalance < 5 ? palette.inkFaint : palette.onAccent,
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
            width: "100%", padding: "0.75rem", minHeight: 44,
            backgroundColor: "transparent", border: "none", cursor: "pointer",
            ...body, fontSize: "0.95rem", color: palette.inkFaint, marginTop: "0.5rem",
          }}
        >
          Volver mañana
        </button>
      </div>
    </div>
  );
}

// ─── Contenido visual de una card (portada + info) ──────────────────────────
// Con portada: foto + velo negro abajo, texto en onDark / onDarkSoft.
// Sin portada: la portada genérica ya lleva título y autor; el resto de la info va sobre su
// franja plana inferior, en el color de texto de esa franja (sin velo, sin repetir el título).
function CardFace({ book, showInfo, onToggleInfo }) {
  const rating = book.rating ? Number(book.rating).toFixed(1) : null;
  const genres = (book.genres || []).slice(0, 3);
  const scheme = book.coverUrl ? null : genericCoverScheme(book.title || "", book.author || "");
  return (
    <>
      <BookCoverImage
        coverUrl={book.coverUrl}
        title={book.title}
        author={book.author}
        genres={book.genres}
      />

      {scheme ? (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: `${GENERIC_BAND_PCT}%`,
          padding: "1rem 1.25rem",
          display: "flex", flexDirection: "column", justifyContent: "flex-start",
          overflow: "hidden", pointerEvents: "none",
        }}>
          <MetaLine genres={genres} rating={rating} color={scheme.bandInk} />
          {book.description && (
            <p style={{
              ...body, fontSize: "15px", color: scheme.bandInk, lineHeight: 1.45, margin: 0,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {book.description}
            </p>
          )}
        </div>
      ) : (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "66%",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "1.4rem 1.25rem 1.25rem",
          pointerEvents: "none",
        }}>
          <MetaLine genres={genres} rating={rating} color={palette.onDarkSoft} />
          <h2 style={{
            ...serif, fontSize: "clamp(1.45rem, 5.5vw, 1.75rem)", fontWeight: 700,
            color: palette.onDark, lineHeight: 1.15, margin: "0 0 0.28rem",
          }}>
            {book.title}
          </h2>
          <p style={{ ...body, fontSize: "16px", color: palette.onDarkSoft, margin: "0 0 0.5rem" }}>
            {book.author}
          </p>
          {book.description && (
            <p style={{
              ...body, fontSize: "15px", color: palette.onDarkSoft,
              lineHeight: 1.45, margin: 0,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {book.description}
            </p>
          )}
        </div>
      )}

      {/* Panel de info expandida */}
      {showInfo && (
        <div
          onClick={onToggleInfo}
          style={{
            position: "absolute", inset: 0,
            backgroundColor: "rgba(0,0,0,1)",
            padding: "1.75rem 1.5rem",
            display: "flex", flexDirection: "column", justifyContent: "center",
            animation: "backdropIn 200ms ease-out",
            cursor: "pointer",
          }}
        >
          <h3 style={{ ...serif, fontSize: "1.4rem", fontWeight: 700, color: palette.onDark, margin: "0 0 0.3rem" }}>
            {book.title}
          </h3>
          <p style={{ ...body, fontSize: "16px", color: palette.onDarkSoft, margin: "0 0 1rem" }}>
            {book.author}
          </p>
          {book.description && (
            <p style={{ ...body, fontSize: "16px", color: palette.onDark, lineHeight: 1.6, margin: "0 0 1.25rem" }}>
              {book.description}
            </p>
          )}
          <div style={{ ...body, display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "14px", color: palette.onDarkSoft }}>
            {book.pages   && <span>{book.pages} páginas</span>}
            {rating       && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Star stroke={palette.onDarkSoft} /> {rating} de calificación</span>}
            {book.isbn    && <span>ISBN {book.isbn}</span>}
            {book.subgenres?.length > 0 && <span>{book.subgenres.join(" · ")}</span>}
          </div>
          <p style={{ ...body, fontSize: "13px", color: palette.onDarkSoft, marginTop: "1.5rem", textAlign: "center" }}>
            Toca para cerrar
          </p>
        </div>
      )}
    </>
  );
}

// ─── Skeleton de carga con la estructura de la card ─────────────────────────
function LoadingSkeleton() {
  const pulse = { backgroundColor: palette.border, animation: "skeletonPulse 1.3s ease-in-out infinite" };
  return (
    <div style={{ padding: "0.75rem 1rem 1rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ ...pulse, height: 20, width: 140, borderRadius: 8 }} />
        <div style={{ ...pulse, height: 16, width: 56, borderRadius: 8 }} />
      </div>
      <div style={{ ...pulse, height: 8, borderRadius: 999, marginBottom: "1rem" }} />
      <div style={{ ...pulse, borderRadius: 22, height: CARD_HEIGHT }} />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.25rem", marginTop: "1rem" }}>
        <div style={{ ...pulse, width: 56, height: 56, borderRadius: "50%" }} />
        <div style={{ ...pulse, width: 44, height: 44, borderRadius: "50%" }} />
        <div style={{ ...pulse, width: 64, height: 64, borderRadius: "50%" }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// demoBooks: catálogo inyectado para pruebas/demos sin auth ni Supabase
// Alto de la tarjeta: la pantalla menos lo que ocupa todo lo demás (cabecera, pestañas,
// fila «N restantes · N de M», barra, botones y la barra inferior con su borde rasgado).
// 2026-11-02: «N de M» sube a la fila del contador y el alto se recalcula para que los
// botones queden por encima del borde rasgado (antes «1 de 20 libros» quedaba debajo).
const CARD_HEIGHT = "clamp(320px, calc(100dvh - 372px), 620px)";

export default function BookTinder({ user, onAdd, demoBooks = null }) {
  const [books, setBooks]               = useState([]);
  const [index, setIndex]               = useState(0);
  const [limitStatus, setLimitStatus]   = useState({
    savesUsed: 0, gemsSpent: 0, limit: DAILY_LIMIT, effectiveLimit: DAILY_LIMIT, canSave: true, savesLeft: DAILY_LIMIT,
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
        const [{ genres }, limit, balance] = await Promise.all([
          getPreferredGenres(user.id),
          checkDailyLimit(user.id),
          loadGems(user.id),
        ]);
        if (cancelled) return;

        if (genres.length === 0) { setNoGenres(true); setLoading(false); return; }

        setLimitStatus(limit);
        setGemBalance(balance);

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
        .catch((err) => console.error("[BookTinder] no se pudieron cargar más libros:", err));
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
    if (!limitStatus.canSave) {
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
      savesUsed: prev.savesUsed + 1,
      canSave: prev.savesUsed + 1 < prev.effectiveLimit,
      savesLeft: Math.max(0, prev.savesLeft - 1),
    }));

    const book = currentBook;
    onAdd({
      title:    book.title,
      author:   book.author,
      status,
      genre:    book.genres?.[0] || null,
      summary:  book.description || null,
      coverUrl: book.coverUrl || null,
      isbn:     book.isbn || null,
      pageCount: book.pages || null,
      moodTags: [],
      rating:   0,
    });

    incrementSaveCounter(user.id).catch(console.error);
    showToast(`Guardado en «${statusLabel}»`);
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
      if (result.error === "GEMS_INSUFFICIENT") showToast("No alcanzan las gemas");
      else if (result.error === "GEMS_NO_BALANCE") showToast("Error al leer saldo");
      else if (result.error === "GEMS_RPC_MISSING") showToast("La tienda de gemas no está disponible. Intenta más tarde.");
      else showToast(`Error al gastar gemas: ${result.error}`);
      return; // el modal se queda abierto
    }

    setGemBalance(result.newBalance);
    setLimitStatus((prev) => ({
      ...prev,
      gemsSpent:      prev.gemsSpent + 5,
      effectiveLimit: prev.effectiveLimit + result.extraSaves,
      canSave:        true,
      savesLeft:      result.extraSaves,
    }));
    setShowLimitModal(false);
    showToast(`+${result.extraSaves} guardados. Quedan ${result.newBalance} gemas`);
  }

  // ── Estados especiales ────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <p style={{ ...body, fontSize: "0.97rem", color: palette.inkSoft, marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ ...body, fontSize: "15px", fontWeight: 600, color: palette.ink, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 0.75rem", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  if (noGenres) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <BookOpen size={40} color={palette.inkFaint} strokeWidth={1.2} style={{ margin: "0 auto 1rem" }} />
        <h3 style={{ ...serif, fontSize: "1.1rem", fontWeight: 600, color: palette.ink, marginBottom: "0.5rem" }}>
          Configura tus géneros primero
        </h3>
        <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, lineHeight: 1.55 }}>
          Configura tus géneros favoritos en tu perfil para empezar a descubrir libros.
        </p>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <BookOpen size={40} color={palette.inkFaint} strokeWidth={1.2} style={{ margin: "0 auto 1rem" }} />
        <h3 style={{ ...serif, fontSize: "1.1rem", fontWeight: 600, color: palette.ink, marginBottom: "0.5rem" }}>
          No hay libros disponibles
        </h3>
        <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, lineHeight: 1.55, marginBottom: "1.25rem" }}>
          Vuelve en un rato: estamos rellenando la estantería.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ ...body, fontSize: "15px", fontWeight: 600, color: palette.ink, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 0.75rem", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  if (isLast) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <BookOpen size={40} color={palette.inkFaint} strokeWidth={1.2} style={{ margin: "0 auto 1rem" }} />
        <h3 style={{ ...serif, fontSize: "1.15rem", fontWeight: 600, color: palette.ink, margin: "0 0 0.5rem" }}>
          Ya pasaron todos los de hoy.
        </h3>
        <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, lineHeight: 1.55 }}>
          Mañana llegan más.
        </p>
      </div>
    );
  }

  const savesLeft = limitStatus.savesLeft;
  const progress  = Math.min(100, (limitStatus.savesUsed / limitStatus.effectiveLimit) * 100);
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

      <div style={{ padding: "0.75rem 1rem 1rem", maxWidth: 480, margin: "0 auto" }}>

        {/* ── Contador + posición en una fila, y barra de avance (principio 4) ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: "0.5rem" }}>
          <span style={{ ...ts.h3, color: palette.ink }}>
            {savesLeft > 0 ? `${savesLeft} restantes hoy` : "Límite de hoy alcanzado"}
          </span>
          <span style={{ ...ts.caption, color: palette.inkSoft }}>
            {index + 1} de {books.length}
          </span>
        </div>

        {/* Pista con borde de tinta: el durazno no llega a 3:1 sobre blanco (sema-paleta §5) */}
        <div style={{ height: 8, borderRadius: 999, backgroundColor: palette.bg, border: `1.5px solid ${palette.ink}`, overflow: "hidden", marginBottom: "1rem" }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: palette.accent,
            borderRight: progress > 0 && progress < 100 ? `1.5px solid ${palette.ink}` : "none",
            boxSizing: "border-box",
            transition: "width 450ms ease",
          }} />
        </div>

        {/* ── Stack de cards ── */}
        <div style={{ position: "relative", height: CARD_HEIGHT }}>

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
                boxShadow: "0 8px 22px rgba(0,0,0,0.12)",
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
                boxShadow: "0 14px 34px rgba(0,0,0,0.2)",
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
                  border: `3.5px solid ${palette.session}`,
                  color: palette.session,
                  borderRadius: 10, padding: "4px 14px",
                  ...serif,
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
                  border: `3.5px solid ${palette.danger}`,
                  color: palette.danger,
                  borderRadius: 10, padding: "4px 14px",
                  ...serif,
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

        {/* ── Botones: un solo relleno (corazón durazno, principio 1); X e info silenciosos ── */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.25rem", marginTop: "1rem" }}>
          <button
            onClick={commitSkip}
            disabled={disabled}
            className="tinder-fab"
            aria-label="No me interesa"
            style={{
              width: 56, height: 56,
              border: `1.5px solid ${palette.inkSoft}`,
              backgroundColor: palette.bg,
              color: palette.ink,
            }}
          >
            <X size={24} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => setShowInfo((v) => !v)}
            disabled={disabled}
            className="tinder-fab"
            aria-label="Más información"
            aria-pressed={showInfo}
            style={{
              width: 44, height: 44,
              border: "none",
              backgroundColor: "transparent",
              color: palette.inkSoft,
            }}
          >
            <Info size={22} strokeWidth={2} />
          </button>

          <button
            onClick={attemptSave}
            disabled={disabled}
            className="tinder-fab"
            aria-label="Guardar libro"
            style={{
              width: 64, height: 64,
              border: "none",
              backgroundColor: limitStatus.canSave ? palette.accent : palette.border,
              color: limitStatus.canSave ? palette.onAccent : palette.inkFaint,
            }}
          >
            <Heart size={26} strokeWidth={2.2} fill="currentColor" />
          </button>
        </div>
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
          savesUsed={limitStatus.savesUsed}
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

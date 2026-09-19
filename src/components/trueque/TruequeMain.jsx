import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, MapPin, Pencil } from "lucide-react";
import { palette, body, display } from "../../theme.js";
import { zoneLabel } from "../../config/zones.js";
import {
  getTruequeStatus, getUserZones, setUserZones,
  getMyOffers, addBookOffered, deleteBookOffered,
  getMyWants, addBookWanted, deleteBookWanted,
  searchMatches, getMatches, rateExchange,
  isDisclaimerAccepted, acceptDisclaimer,
} from "../../services/truequeService.js";
import { ZonesOnboarding } from "./ZonesOnboarding.jsx";
import { ZonesEditor } from "./ZonesEditor.jsx";
import { OfferBookModal } from "./OfferBookModal.jsx";
import { WantBookModal } from "./WantBookModal.jsx";
import { BookCard } from "./BookCard.jsx";
import { MatchesList } from "./MatchesList.jsx";
import { LegalDisclaimerModal } from "./LegalDisclaimerModal.jsx";
import { ExchangeChat } from "./ExchangeChat.jsx";
import { RatingModal } from "./RatingModal.jsx";
import { PlusUpsellModal } from "./PlusUpsellModal.jsx";

const TABS = [
  { id: "ofrezco", label: "Ofrezco" },
  { id: "busco", label: "Busco" },
  { id: "matches", label: "Matches" },
];

const isLimitError = (e) => typeof e?.code === "string" && e.code.startsWith("TRUEQUE_LIMIT");

// Pantalla principal del Trueque de libros (tab "trueque" de MainApp).
function TruequeMain({ user, gemBalance, onGemsChanged, onExit }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [status, setStatus] = useState(null);
  const [zones, setZones] = useState([]);
  const [offers, setOffers] = useState([]);
  const [wants, setWants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState("ofrezco");
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");

  const [zonesEditorOpen, setZonesEditorOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [wantOpen, setWantOpen] = useState(false);
  const [upsell, setUpsell] = useState(null);          // { reason }
  const [disclaimerFor, setDisclaimerFor] = useState(null);
  const [chatMatch, setChatMatch] = useState(null);
  const [ratingMatch, setRatingMatch] = useState(null);

  const refreshStatus = useCallback(() => getTruequeStatus().then(setStatus).catch(() => {}), []);
  const refreshMatches = useCallback(() => getMatches().then(setMatches).catch(() => {}), []);

  useEffect(() => {
    let alive = true;
    Promise.all([getTruequeStatus(), getUserZones(user.id), getMyOffers(), getMyWants(), getMatches()])
      .then(([st, z, o, w, m]) => {
        if (!alive) return;
        setStatus(st); setZones(z); setOffers(o); setWants(w); setMatches(m);
      })
      .catch((e) => alive && setFatal(e.message || "No se pudo cargar el Trueque."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user.id]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  async function saveZones(next) {
    await setUserZones(next);
    setZones(next);
    setZonesEditorOpen(false);
    refreshStatus();
  }

  function openOffer() {
    if (status && !status.is_premium && status.offered_count >= status.max_offered) {
      setUpsell({ reason: `El plan gratuito permite ${status.max_offered} libros ofrecidos a la vez.` });
      return;
    }
    setOfferOpen(true);
  }

  function openWant() {
    if (status && !status.is_premium && status.wanted_count >= status.max_wanted) {
      setUpsell({ reason: `El plan gratuito permite ${status.max_wanted} libros buscados a la vez.` });
      return;
    }
    setWantOpen(true);
  }

  async function submitOffer(book) {
    try {
      const created = await addBookOffered(book);
      setOffers((prev) => [created, ...prev]);
      setOfferOpen(false);
      refreshStatus();
    } catch (e) {
      if (isLimitError(e)) { setOfferOpen(false); setUpsell({ reason: e.message }); return; }
      throw e;
    }
  }

  async function submitWant(book) {
    try {
      const created = await addBookWanted(book);
      setWants((prev) => [created, ...prev]);
      setWantOpen(false);
      refreshStatus();
    } catch (e) {
      if (isLimitError(e)) { setWantOpen(false); setUpsell({ reason: e.message }); return; }
      throw e;
    }
  }

  async function removeOffer(id) {
    try {
      await deleteBookOffered(id);
      setOffers((prev) => prev.filter((b) => b.id !== id));
      refreshStatus();
      refreshMatches(); // sus matches vivos quedan cancelados por trigger
    } catch (e) { flash(e.message); }
  }

  async function removeWant(id) {
    try {
      await deleteBookWanted(id);
      setWants((prev) => prev.filter((b) => b.id !== id));
      refreshStatus();
    } catch (e) { flash(e.message); }
  }

  async function runSearch() {
    if (searching || !status) return;
    if (!status.is_premium && gemBalance < status.search_cost) {
      setUpsell({ reason: `Buscar matches cuesta ${status.search_cost} 💎 y tienes ${gemBalance}.` });
      return;
    }
    setSearching(true);
    try {
      const { paid, matches: found } = await searchMatches();
      if (!paid) {
        setUpsell({ reason: `Buscar matches cuesta ${status.search_cost} 💎.` });
        return;
      }
      setMatches(found);
      setTab("matches");
      onGemsChanged?.();
      refreshStatus();
      const live = found.filter((m) => m.status !== "completed");
      flash(live.length ? `Encontramos ${live.length} match${live.length === 1 ? "" : "es"} 📚` : "Sin matches por ahora. Agrega más libros o zonas.");
    } catch (e) {
      flash(e.message);
    } finally {
      setSearching(false);
    }
  }

  function openMatch(match) {
    if (isDisclaimerAccepted(match.match_id)) setChatMatch(match);
    else setDisclaimerFor(match);
  }

  async function submitRating(rating, review) {
    await rateExchange(ratingMatch.match_id, rating, review);
    setRatingMatch(null);
    refreshMatches();
    flash("¡Gracias por calificar! ⭐");
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}><Loader2 size={26} className="animate-spin" color={palette.inkFaint} /></div>;
  }
  if (fatal) {
    return <p style={{ ...body, textAlign: "center", color: palette.inkSoft, padding: "3rem 1rem" }}>{fatal}</p>;
  }

  const needsZones = zones.length === 0;
  const searchLabel = status?.is_premium
    ? `🔍 Buscar matches · gratis (${Math.max(0, status.plus_daily_searches - status.searches_today)} hoy)`
    : `🔍 Buscar matches · ${status?.search_cost ?? 20} 💎`;

  return (
    <div style={{ padding: "1rem 1rem 6rem", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
        <h1 style={{ ...display, fontSize: "1.7rem", fontWeight: 700, fontStyle: "italic", color: palette.ink, margin: 0 }}>Trueque</h1>
        {status?.is_premium && <span style={{ ...body, fontSize: "0.8rem", color: palette.amber, fontWeight: 600 }}>✨ Folio Plus</span>}
      </div>
      <p style={{ ...body, fontSize: "0.92rem", color: palette.inkSoft, margin: "0.2rem 0 0.9rem" }}>Intercambia libros físicos con lectores de tu zona.</p>

      {!needsZones && (
        <button onClick={() => setZonesEditorOpen(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", padding: "0.6rem 0.75rem", borderRadius: 12, border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgCard, cursor: "pointer", marginBottom: "0.9rem", textAlign: "left" }}>
          <MapPin size={15} color={palette.accent} />
          {zones.map((z) => <span key={z} style={{ padding: "0.1rem 0.55rem", borderRadius: 999, backgroundColor: palette.bgSoft, ...body, fontSize: "0.8rem", color: palette.inkSoft }}>{zoneLabel(z)}</span>)}
          <Pencil size={13} color={palette.inkFaint} style={{ marginLeft: "auto" }} />
        </button>
      )}

      <button
        onClick={runSearch}
        disabled={searching || needsZones}
        style={{ width: "100%", padding: "1rem", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #7A2E2E 0%, #A4493D 100%)", color: "#fff", cursor: searching ? "default" : "pointer", ...display, fontSize: "1.05rem", fontWeight: 700, boxShadow: "0 4px 14px rgba(122, 46, 46, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: needsZones ? 0.6 : 1 }}
      >
        {searching ? <><Loader2 size={18} className="animate-spin" /> Buscando…</> : searchLabel}
      </button>
      {notice && <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, textAlign: "center", margin: "0.6rem 0 0" }}>{notice}</p>}

      <div style={{ display: "flex", gap: "0.35rem", margin: "1.1rem 0 0.9rem", padding: "0.25rem", borderRadius: 999, backgroundColor: palette.bgSoft }}>
        {TABS.map((t) => {
          const count = t.id === "ofrezco" ? offers.length : t.id === "busco" ? wants.length : matches.filter((m) => m.status !== "completed").length;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "0.5rem", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: active ? palette.bgCard : "transparent", color: active ? palette.accent : palette.inkSoft, ...display, fontSize: "0.9rem", fontWeight: active ? 700 : 500, boxShadow: active ? "0 1px 4px rgba(42,31,26,0.1)" : "none" }}>
              {t.label} {count > 0 && <span style={{ ...body, fontWeight: 400, fontSize: "0.8rem" }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {tab === "ofrezco" && (
        <BookList
          books={offers}
          onAdd={openOffer}
          addLabel="Ofrecer un libro"
          limit={status && !status.is_premium ? status.max_offered : null}
          empty="Publica libros físicos que ya no necesites y quieras intercambiar."
          onDelete={removeOffer}
        />
      )}
      {tab === "busco" && (
        <BookList
          books={wants}
          onAdd={openWant}
          addLabel="Buscar un libro"
          limit={status && !status.is_premium ? status.max_wanted : null}
          empty='Agrega los libros que quieres conseguir. Tu lista "Por leer" también cuenta para los matches.'
          onDelete={removeWant}
        />
      )}
      {tab === "matches" && <MatchesList matches={matches} onMessage={openMatch} onRate={setRatingMatch} />}

      {needsZones && (
        <ZonesOnboarding maxZones={status?.max_zones ?? 3} isPremium={!!status?.is_premium} onSave={saveZones} onSkip={onExit} />
      )}
      {zonesEditorOpen && (
        <ZonesEditor initial={zones} maxZones={status?.max_zones ?? 3} isPremium={!!status?.is_premium} onSave={saveZones} onClose={() => setZonesEditorOpen(false)} />
      )}
      {offerOpen && <OfferBookModal onSubmit={submitOffer} onClose={() => setOfferOpen(false)} />}
      {wantOpen && <WantBookModal onSubmit={submitWant} onClose={() => setWantOpen(false)} />}
      {upsell && <PlusUpsellModal reason={upsell.reason} onClose={() => setUpsell(null)} />}
      {disclaimerFor && (
        <LegalDisclaimerModal
          onClose={() => setDisclaimerFor(null)}
          onAccept={() => { acceptDisclaimer(disclaimerFor.match_id); setChatMatch(disclaimerFor); setDisclaimerFor(null); }}
        />
      )}
      {chatMatch && (
        <ExchangeChat
          match={chatMatch}
          userId={user.id}
          onClose={() => { setChatMatch(null); refreshMatches(); }}
          onChanged={refreshMatches}
          onCompleted={(m) => { refreshMatches(); refreshStatus(); setOffers((prev) => prev.filter((b) => b.id !== m.my_book_id)); setRatingMatch(m); }}
        />
      )}
      {ratingMatch && <RatingModal otherName={ratingMatch.other_name} onSubmit={submitRating} onClose={() => setRatingMatch(null)} />}
    </div>
  );
}

function BookList({ books, onAdd, addLabel, limit, empty, onDelete }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <button onClick={onAdd} style={{ width: "100%", padding: "0.8rem", borderRadius: 14, border: `1.5px dashed ${palette.accent}66`, backgroundColor: "transparent", color: palette.accent, cursor: "pointer", ...display, fontSize: "0.95rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
        <Plus size={17} /> {addLabel}
        {limit != null && <span style={{ ...body, fontWeight: 400, fontSize: "0.8rem", color: palette.inkFaint }}>({books.length}/{limit})</span>}
      </button>
      {books.length === 0
        ? <p style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint, textAlign: "center", padding: "1.5rem 0.5rem", margin: 0 }}>{empty}</p>
        : books.map((b) => <BookCard key={b.id} book={b} onDelete={onDelete} />)}
    </div>
  );
}

export { TruequeMain };

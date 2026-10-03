import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Plus, Loader2, MapPin, Pencil } from "lucide-react";
import { palette, body, display, BRAND } from "../../theme.js";
import { estadoNombre } from "../../data/estados.js";
import {
  getTruequeStatus,
  getMyOffers, addBookOffered, deleteBookOffered,
  getMyWants, addBookWanted, deleteBookWanted,
  rateExchange, isDisclaimerAccepted, acceptDisclaimer,
  SEARCH_SCOPES, searchMatchesNearby, getMatchesNearby, acceptTruequeRules, UPDATING_MESSAGE,
} from "../../services/truequeService.js";
import { getGeoProfile } from "../../services/truequeGeoService.js";
import { OfferBookModal } from "./OfferBookModal.jsx";
import { WantBookModal } from "./WantBookModal.jsx";
import { BookCard } from "./BookCard.jsx";
import { MatchesList } from "./MatchesList.jsx";
import { LegalDisclaimerModal } from "./LegalDisclaimerModal.jsx";
import { ExchangeChat } from "./ExchangeChat.jsx";
import { RatingModal } from "./RatingModal.jsx";
import { PlusUpsellModal } from "./PlusUpsellModal.jsx";
import { TruequeRulesModal } from "./TruequeRulesModal.jsx";
import { LocationStep } from "./LocationStep.jsx";
import { Sheet } from "./ui.jsx";

const TABS = [
  { id: "ofrezco", label: "Ofrezco" },
  { id: "busco", label: "Busco" },
  { id: "matches", label: "Matches" },
];

const isLimitError = (e) => typeof e?.code === "string" && e.code.startsWith("TRUEQUE_LIMIT");

// "Mis lugares" (Leaflet) se descarga solo al abrirlo. Si la descarga falla (sin red) se
// muestra un aviso; "Reintentar" crea un lazy nuevo (React cachea el import fallido).
function loadMyPlaces() {
  return lazy(() => import("./MyPlaces.jsx").catch((e) => {
    console.error("[TRUEQUE] No se pudo descargar el mapa:", e?.message);
    return { default: MapLoadError };
  }));
}

function MapLoadError({ onClose, onRetry }) {
  return (
    <Sheet title="📍 Mis lugares" onClose={onClose}>
      <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, margin: "0 0 1rem" }}>No se pudo cargar el mapa. Revisa tu conexión.</p>
      <button onClick={onRetry} style={{ padding: "0.6rem 1rem", borderRadius: 10, border: `1.5px solid ${palette.accent}`, backgroundColor: "transparent", color: palette.accent, cursor: "pointer", ...display, fontWeight: 600 }}>
        Reintentar
      </button>
    </Sheet>
  );
}

function scopeLabel(scope, radiusKm) {
  if (scope === "radius") return `Mi radio (${radiusKm} km)`;
  if (scope === "25km") return "25 km";
  if (scope === "state") return "Mi estado";
  return "Todo el país";
}

// Pantalla principal del Trueque de libros (tab "trueque" de MainApp).
function TruequeMain({ user, gemBalance, onGemsChanged, onExit }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [status, setStatus] = useState(null);
  const [offers, setOffers] = useState([]);
  const [wants, setWants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState("ofrezco");
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");

  const [offerOpen, setOfferOpen] = useState(false);
  const [wantOpen, setWantOpen] = useState(false);
  const [upsell, setUpsell] = useState(null);          // { reason }
  const [disclaimerFor, setDisclaimerFor] = useState(null);
  const [chatMatch, setChatMatch] = useState(null);
  const [ratingMatch, setRatingMatch] = useState(null);

  // Trueque v2: perfil geográfico, "Mis lugares" y alcance de búsqueda
  const [geo, setGeo] = useState(null);                 // getGeoProfile()
  const [placesOpen, setPlacesOpen] = useState(null);   // null | { initialState }
  const [MyPlaces, setMyPlaces] = useState(() => loadMyPlaces());
  const [scope, setScope] = useState("radius");
  const [lastSearch, setLastSearch] = useState(null);   // { scope, resultCount, charged }

  const refreshStatus = useCallback(() => getTruequeStatus().then(setStatus).catch(() => {}), []);
  const refreshMatches = useCallback(() => getMatchesNearby().then(setMatches).catch(() => {}), []);
  const refreshGeo = useCallback(() => getGeoProfile().then(setGeo), []);

  useEffect(() => {
    let alive = true;
    Promise.all([getTruequeStatus(), getMyOffers(), getMyWants(), getMatchesNearby(), getGeoProfile()])
      .then(([st, o, w, m, g]) => {
        if (!alive) return;
        setStatus(st); setOffers(o); setWants(w); setMatches(m); setGeo(g);
        // Sin pines (p. ej. cuenta vieja que solo tenía zonas de CDMX): pedirlos de entrada,
        // igual que a un usuario nuevo tras elegir su estado.
        if (g.rulesAcceptedAt && g.adultConfirmedAt && g.state && g.pins.length === 0) setPlacesOpen({});
      })
      // TRUEQUE_UPDATING = falta correr supabase/trueque_geo.sql (el servicio ya registró code/message/details/hint)
      .catch((e) => alive && setFatal(e.code === "TRUEQUE_UPDATING" ? UPDATING_MESSAGE : e.message || "No se pudo cargar el Trueque."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user.id]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  async function acceptRules() {
    await acceptTruequeRules(true);
    await refreshGeo();
  }

  async function onPlacesSaved() {
    await refreshGeo();
    setPlacesOpen(null);
    flash("Tus lugares quedaron guardados 📍");
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

  // Cobra SOLO si hay resultados (el servidor lo decide en la misma transacción).
  async function runSearch(nextScope = scope) {
    if (searching || !status) return;
    if (!status.is_premium && gemBalance < status.search_cost) {
      setUpsell({ reason: `Buscar matches cuesta ${status.search_cost} 💎 y tienes ${gemBalance}. Si no hay resultados no se cobra.` });
      return;
    }
    setSearching(true);
    try {
      const res = await searchMatchesNearby(nextScope);
      if (!res.paid) {
        setUpsell({ reason: `Buscar matches cuesta ${res.cost ?? status.search_cost} 💎. Si no hay resultados no se cobra.` });
        return;
      }
      setMatches(res.matches);
      setLastSearch({ scope: nextScope, resultCount: res.resultCount, charged: res.charged });
      setTab("matches");
      if (res.charged) onGemsChanged?.();
      refreshStatus();
      flash(res.resultCount
        ? `Encontramos ${res.resultCount} match${res.resultCount === 1 ? "" : "es"} 📚${res.charged ? ` · −${res.charged} 💎` : ""}`
        : "Sin resultados en este alcance. No se cobraron gemas.");
    } catch (e) {
      flash(e.message);
      if (e.code === "LOCATION_REQUIRED") setPlacesOpen({});
    } finally {
      setSearching(false);
    }
  }

  function widenSearch() {
    const next = SEARCH_SCOPES[SEARCH_SCOPES.indexOf(lastSearch?.scope ?? scope) + 1];
    if (!next) return;
    setScope(next);
    runSearch(next);
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

  // Requisitos en orden: reglas (+18) → estado → al menos 1 pin. Desde v3 las zonas viejas de
  // CDMX no cuentan: quien solo tiene zonas se trata igual que alguien sin pines.
  const needsRules = !geo?.rulesAcceptedAt || !geo?.adultConfirmedAt;
  const needsState = !needsRules && !geo?.state;
  const hasPins = (geo?.pins.length || 0) > 0;
  const needsPins = !needsRules && !needsState && !hasPins;
  const blocked = needsRules || needsState || needsPins;

  const searchLabel = status?.is_premium
    ? `🔍 Buscar matches · gratis (${Math.max(0, status.plus_daily_searches - status.searches_today)} hoy)`
    : `🔍 Buscar matches · ${status?.search_cost ?? 20} 💎`;
  const nextScope = lastSearch ? SEARCH_SCOPES[SEARCH_SCOPES.indexOf(lastSearch.scope) + 1] : null;

  return (
    <div style={{ padding: "1rem 1rem 6rem", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
        <h1 style={{ ...display, fontSize: "1.7rem", fontWeight: 700, fontStyle: "italic", color: palette.ink, margin: 0 }}>Trueque</h1>
        {status?.is_premium && <span style={{ ...body, fontSize: "0.8rem", color: palette.amber, fontWeight: 600 }}>✨ Folio Plus</span>}
      </div>
      <p style={{ ...body, fontSize: "0.92rem", color: palette.inkSoft, margin: "0.2rem 0 0.9rem" }}>Intercambia libros físicos con lectores cerca de ti.</p>

      {!needsRules && !needsState && (
        <button
          onClick={() => setPlacesOpen({})}
          aria-label="Editar mis lugares, estado y radio"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 0.75rem", borderRadius: 12, border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgCard, cursor: "pointer", marginBottom: "0.5rem", textAlign: "left" }}
        >
          <MapPin size={15} color={palette.accent} />
          <span style={{ ...body, fontSize: "0.86rem", color: palette.ink }}>
            {estadoNombre(geo.state)} · {hasPins ? `${geo.pins.length} lugar${geo.pins.length === 1 ? "" : "es"}` : "Mis lugares"} · radio {geo.maxRadiusKm} km
          </span>
          <Pencil size={13} color={palette.inkFaint} style={{ marginLeft: "auto" }} />
        </button>
      )}
      {needsPins && (
        <button onClick={() => setPlacesOpen({})} style={{ width: "100%", padding: "0.75rem", borderRadius: 12, border: `1.5px dashed ${palette.accent}`, backgroundColor: "transparent", color: palette.accent, cursor: "pointer", ...body, fontSize: "0.9rem", marginBottom: "0.9rem" }}>
          📍 Marca al menos un lugar en el mapa para buscar matches
        </button>
      )}

      <button
        onClick={() => runSearch()}
        disabled={searching || blocked}
        style={{ width: "100%", padding: "1rem", borderRadius: 16, border: "none", background: BRAND.gradientFab, color: palette.onAccent, cursor: searching ? "default" : "pointer", ...display, fontSize: "1.05rem", fontWeight: 700, boxShadow: `0 4px 14px ${BRAND.wine}4D`, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: blocked ? 0.6 : 1, marginTop: "0.4rem" }}
      >
        {searching ? <><Loader2 size={18} className="animate-spin" /> Buscando…</> : searchLabel}
      </button>
      {!status?.is_premium && (
        <p style={{ ...body, fontSize: "0.76rem", color: palette.inkFaint, textAlign: "center", margin: "0.35rem 0 0" }}>Solo se cobra si encontramos matches.</p>
      )}
      <div role="radiogroup" aria-label="Alcance de la búsqueda" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "center", margin: "0.6rem 0 0" }}>
        {SEARCH_SCOPES.map((s) => {
          const on = scope === s;
          return (
            <button key={s} role="radio" aria-checked={on} onClick={() => setScope(s)} disabled={blocked} style={{ padding: "0.3rem 0.7rem", borderRadius: 999, cursor: blocked ? "default" : "pointer", border: `1.5px solid ${on ? palette.accent : palette.border}`, backgroundColor: on ? palette.accentSoft : palette.bgCard, color: on ? palette.onAccent : palette.inkSoft, ...body, fontSize: "0.8rem" }}>
              {scopeLabel(s, geo?.maxRadiusKm ?? 6)}
            </button>
          );
        })}
      </div>
      {notice && <p role="status" style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, textAlign: "center", margin: "0.6rem 0 0" }}>{notice}</p>}

      <div style={{ display: "flex", gap: "0.35rem", margin: "1.1rem 0 0.9rem", padding: "0.25rem", borderRadius: 999, backgroundColor: palette.bgSoft }}>
        {TABS.map((t) => {
          const count = t.id === "ofrezco" ? offers.length : t.id === "busco" ? wants.length : matches.filter((m) => m.status !== "completed").length;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "0.5rem", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: active ? palette.bgCard : "transparent", color: active ? palette.accent : palette.inkSoft, ...display, fontSize: "0.9rem", fontWeight: active ? 700 : 500, boxShadow: active ? `0 1px 4px ${palette.ink}1A` : "none" }}>
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
      {tab === "matches" && lastSearch && lastSearch.resultCount === 0 && (
        <div role="status" style={{ padding: "0.9rem", borderRadius: 14, backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, marginBottom: "1rem", textAlign: "center" }}>
          <p style={{ ...display, fontSize: "0.98rem", fontWeight: 600, color: palette.ink, margin: "0 0 0.2rem" }}>
            No encontramos matches en «{scopeLabel(lastSearch.scope, geo?.maxRadiusKm ?? 6)}»
          </p>
          <p style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft, margin: nextScope ? "0 0 0.7rem" : 0 }}>No se cobraron gemas.</p>
          {nextScope && (
            <button onClick={widenSearch} disabled={searching} style={{ padding: "0.55rem 1rem", borderRadius: 10, border: "none", backgroundColor: palette.accent, color: palette.onAccent, cursor: "pointer", ...display, fontSize: "0.88rem", fontWeight: 600 }}>
              Ampliar a «{scopeLabel(nextScope, geo?.maxRadiusKm ?? 6)}»
            </button>
          )}
        </div>
      )}
      {tab === "matches" && <MatchesList matches={matches} onMessage={openMatch} onRate={setRatingMatch} />}

      {needsRules && <TruequeRulesModal onAccept={acceptRules} onSkip={onExit} />}
      {needsState && !placesOpen && (
        <LocationStep onPickState={(st) => setPlacesOpen({ initialState: st })} onSkip={onExit} />
      )}
      {placesOpen && (
        <Suspense fallback={<Sheet title="📍 Mis lugares"><div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}><Loader2 size={24} className="animate-spin" color={palette.inkFaint} /></div></Sheet>}>
          <MyPlaces
            profile={geo}
            initialState={placesOpen.initialState}
            onSaved={onPlacesSaved}
            onClose={() => setPlacesOpen(null)}
            onRetry={() => setMyPlaces(() => loadMyPlaces())}
          />
        </Suspense>
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

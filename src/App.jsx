import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  BookmarkCheck,
  Bookmark,
  Sparkles,
  Plus,
  Star,
  X,
  Loader2,
  Library,
  Wand2,
  ChevronLeft,
  Trash2,
  Pencil,
  Check,
  Search,
  Share2,
  BarChart3,
  TrendingUp,
  Award,
  Copy,
  Heart,
  PlusCircle,
  LogOut,
  Barcode,
} from "lucide-react";
import { supabase } from "./supabase.js";
import { Html5Qrcode } from "html5-qrcode";

// ============ STYLES ============
const FONT_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap');
`;

const palette = {
  bg: "#F4EDE0",
  bgSoft: "#EFE6D4",
  bgCard: "#FBF6EB",
  ink: "#2A1F1A",
  inkSoft: "#5C4A3F",
  inkFaint: "#8B7B6E",
  accent: "#7A2E2E",
  accentSoft: "#A4493D",
  amber: "#C8924A",
  mauve: "#A26B7A",
  border: "#D8C9B0",
  borderSoft: "#E8DFD0",
};

const display = { fontFamily: "Fraunces, serif" };
const body = { fontFamily: "'EB Garamond', serif" };

// ============ AUTH ============
// JWT stores the session client-side (localStorage). Supabase holds the real data.
const TOKEN_KEY = "folio:token";
const JWT_SECRET = "folio-local-jwt-2024";

function b64uEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64uDecode(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function signJWT(payload) {
  const header = b64uEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64uEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64uEncode(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(b64uDecode(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(b64uDecode(body));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${password}::folio-pepper`)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function registerUser(name, email, password) {
  const emailLower = email.toLowerCase().trim();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();
  if (existing) throw new Error("Ya existe una cuenta con ese email.");
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase
    .from("users")
    .insert({ nombre: name.trim(), email: emailLower, password_hash: passwordHash })
    .select("id, nombre, email")
    .single();
  if (error) throw new Error("Error al crear la cuenta. Intenta de nuevo.");
  return { id: data.id, name: data.nombre, email: data.email };
}

async function loginUser(email, password) {
  const emailLower = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from("users")
    .select("id, nombre, email, password_hash")
    .eq("email", emailLower)
    .maybeSingle();
  if (error || !data) throw new Error("Email o contraseña incorrectos.");
  const hash = await hashPassword(password);
  if (hash !== data.password_hash) throw new Error("Email o contraseña incorrectos.");
  return { id: data.id, name: data.nombre, email: data.email };
}

async function mintToken(user) {
  const token = await signJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  });
  localStorage.setItem(TOKEN_KEY, token);
}

async function getStoredUser() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const payload = await verifyJWT(token);
    // Reject old tokens that pre-date the Supabase migration (no id field)
    if (!payload || !payload.id) return null;
    return { id: payload.id, name: payload.name, email: payload.email };
  } catch { return null; }
}

// ============ STORAGE ============
function dbToBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status,
    genre: row.genre || "",
    summary: row.summary || "",
    rating: row.rating || 0,
    review: row.review || "",
    coverUrl: row.cover_url || null,
    moodTags: row.mood_tags || [],
    addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now(),
    finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : null,
  };
}

function bookToDb(book, userId) {
  return {
    id: book.id,
    user_id: userId,
    title: book.title,
    author: book.author,
    status: book.status,
    genre: book.genre || null,
    summary: book.summary || null,
    rating: book.rating || 0,
    review: book.review || null,
    cover_url: book.coverUrl || null,
    mood_tags: book.moodTags || [],
    added_at: book.addedAt ? new Date(book.addedAt).toISOString() : new Date().toISOString(),
    finished_at: book.finishedAt ? new Date(book.finishedAt).toISOString() : null,
  };
}

async function fetchBooks(userId) {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToBook);
}

async function insertBook(book, userId) {
  const { error } = await supabase.from("books").insert(bookToDb(book, userId));
  if (error) throw error;
}

async function updateBookInDB(book, userId) {
  const { error } = await supabase
    .from("books")
    .update(bookToDb(book, userId))
    .eq("id", book.id)
    .eq("user_id", userId);
  if (error) throw error;
}

async function deleteBookFromDB(id, userId) {
  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ============ AI HELPERS ============
async function enrichBook(title, author) {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Para el libro "${title}" de ${author}, responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "genre": "género principal en español, en una palabra o dos máximo (ej: terror, filosofía, novela, ensayo, ficción, ciencia ficción, romance, biografía, desarrollo personal, poesía, historia, autoayuda, fantasía, etc.)",
  "summary": "resumen breve de 2-3 oraciones en español, sin spoilers grandes",
  "moodTags": ["3-5 etiquetas de mood en español, ej: contemplativo, intenso, ligero, melancólico"]
}

Si no conoces el libro con seguridad, haz tu mejor estimación basada en el título y autor.`,
        },
      ],
    }),
  });
  const data = await response.json();
  const text = data.content.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function getRecommendations(books, moodAnswers) {
  const readBooks = books.filter((b) => b.status === "read");
  const availableBooks = books.filter((b) => b.status !== "read");

  const tasteSection =
    readBooks.length > 0
      ? "LIBROS QUE EL USUARIO YA LEYÓ (úsalos para entender sus gustos, NO los recomiendes):\n" +
        readBooks
          .map(
            (b) =>
              `- "${b.title}" por ${b.author}${b.rating ? ` — calificación: ${b.rating}/5` : ""}${
                b.genre ? ` [${b.genre}]` : ""
              }${b.review ? ` — Reseña: "${b.review.slice(0, 200)}"` : ""}`
          )
          .join("\n")
      : "(Aún no ha marcado libros como leídos. Basa las recomendaciones en su mood y en lo que tiene en su biblioteca.)";

  const availableSection =
    availableBooks.length > 0
      ? "LIBROS DISPONIBLES PARA RECOMENDAR DE SU BIBLIOTECA:\n" +
        availableBooks
          .map(
            (b) =>
              `- "${b.title}" por ${b.author} [${STATUS_META[b.status].label}]${
                b.rating ? ` (calif. tentativa: ${b.rating}/5)` : ""
              }${b.genre ? ` [${b.genre}]` : ""}${b.summary ? ` — ${b.summary}` : ""}`
          )
          .join("\n")
      : "(El usuario no tiene libros pendientes en su biblioteca.)";

  const prompt = `Eres un recomendador de libros perspicaz y cálido. Conoces literatura clásica, contemporánea, en español y otros idiomas, ficción y no ficción.

${tasteSection}

${availableSection}

EL MOOD ACTUAL DEL USUARIO:
- Cómo se siente: ${moodAnswers.mood}
- Tipo de sesión deseada: ${moodAnswers.time}
- Nivel de desafío: ${moodAnswers.challenge}
${moodAnswers.extra ? `- Algo adicional: ${moodAnswers.extra}` : ""}

Tu trabajo es recomendar dos grupos de libros:

1. **fromLibrary**: 2-3 libros de su biblioteca disponible (de la lista DISPONIBLES). NUNCA recomiendes libros que ya leyó (los listados en LEÍDOS). Si no hay libros disponibles, deja el array vacío.

2. **newSuggestions**: 2-3 libros NUEVOS que NO están en su biblioteca y que NO ha leído. Estos deben ser sugerencias inteligentes basadas en sus gustos demostrados (libros leídos y calificaciones) y su mood actual. Diversifica: no sugieras solo del mismo autor o género.

Para cada recomendación explica en 2-3 oraciones por qué encaja, conectando con su mood o con sus lecturas previas. Habla de tú al usuario, en tono cálido y literario, sin clichés.

Responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "fromLibrary": [
    { "title": "título exacto del libro", "author": "autor", "reason": "por qué encaja" }
  ],
  "newSuggestions": [
    { "title": "título", "author": "autor", "genre": "género en una palabra", "summary": "resumen breve de 1-2 oraciones", "reason": "por qué encaja según sus gustos y mood" }
  ]
}`;

  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const text = data.content.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ============ HELPERS ============
const STATUS_META = {
  reading: { label: "Leyendo", icon: BookOpen, color: palette.accent },
  want_to_read: { label: "Por leer", icon: Bookmark, color: palette.amber },
  wish: { label: "Quiero leer", icon: Heart, color: palette.mauve },
  read: { label: "Leído", icon: BookmarkCheck, color: palette.inkSoft },
};

// ============ OPEN LIBRARY ============
async function lookupISBN(isbn) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data[`ISBN:${isbn}`];
  if (!entry) return null;

  const details = entry.details || {};
  const title = details.title || "";
  if (!title) return null;

  const author = (details.authors || [])
    .map((a) => a.name)
    .filter(Boolean)
    .join(", ");

  const subjects = (details.subjects || [])
    .map((s) => (typeof s === "string" ? s : s.name || ""))
    .filter(Boolean);

  const descRaw = details.description;
  const summary = descRaw
    ? (typeof descRaw === "string" ? descRaw : descRaw.value || "")
    : "";

  // Verify the cover image exists (Open Library returns a 1×1 gif for missing covers)
  const rawCover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  const hasCover = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 1);
    img.onerror = () => resolve(false);
    img.src = rawCover;
  });

  return {
    title,
    author,
    genre: subjects[0] || "",
    summary: summary.slice(0, 500),
    coverUrl: hasCover ? rawCover : null,
  };
}

// ============ COMPONENTS ============

const COVER_PALETTES = [
  { bg: "#7A2E2E", fg: "#F4EDE0", accent: "#C8924A" },
  { bg: "#2A1F1A", fg: "#F4EDE0", accent: "#C8924A" },
  { bg: "#5C4A3F", fg: "#F4EDE0", accent: "#A26B7A" },
  { bg: "#A26B7A", fg: "#FBF6EB", accent: "#FBF6EB" },
  { bg: "#3D5A6C", fg: "#F4EDE0", accent: "#C8924A" },
  { bg: "#6B8A5E", fg: "#FBF6EB", accent: "#FBF6EB" },
  { bg: "#8A4A2F", fg: "#F4EDE0", accent: "#FBF6EB" },
  { bg: "#544875", fg: "#F4EDE0", accent: "#C8924A" },
  { bg: "#C8924A", fg: "#2A1F1A", accent: "#7A2E2E" },
  { bg: "#1F3933", fg: "#F4EDE0", accent: "#C8924A" },
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function BookCoverPlaceholder({ title = "", author = "", width = 56, height = 80, style = {} }) {
  const p = COVER_PALETTES[hashString(title + author) % COVER_PALETTES.length];
  const isLarge = width >= 90;
  const isMedium = width >= 60 && width < 90;
  const titleSize = isLarge ? "0.95rem" : isMedium ? "0.62rem" : "0.55rem";
  const authorSize = isLarge ? "0.7rem" : isMedium ? "0.46rem" : "0.42rem";
  const padding = isLarge ? "0.7rem 0.55rem" : "0.35rem 0.3rem";

  return (
    <div
      className="flex-shrink-0"
      style={{
        width,
        height,
        backgroundColor: p.bg,
        color: p.fg,
        fontFamily: "Fraunces, serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding,
        borderRadius: "2px",
        boxShadow: "0 2px 8px rgba(42,31,26,0.18), inset 1px 0 0 rgba(255,255,255,0.08)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            width: isLarge ? 24 : 12,
            height: 1,
            backgroundColor: p.accent,
            opacity: 0.7,
          }}
        />
      </div>
      <div
        style={{
          fontSize: titleSize,
          fontWeight: 600,
          fontStyle: "italic",
          lineHeight: 1.1,
          textAlign: "left",
          letterSpacing: "-0.01em",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: isLarge ? 4 : 3,
          WebkitBoxOrient: "vertical",
        }}
      >
        {title}
      </div>
      <div>
        <div
          style={{
            width: isLarge ? 30 : 14,
            height: 1,
            backgroundColor: p.accent,
            opacity: 0.7,
            marginBottom: isLarge ? "0.4rem" : "0.2rem",
          }}
        />
        <div
          style={{
            fontSize: authorSize,
            opacity: 0.85,
            lineHeight: 1.1,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {author}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        backgroundColor: meta.color + "22",
        color: meta.color,
        ...display,
        fontWeight: 500,
        letterSpacing: "0.04em",
      }}
    >
      <Icon size={11} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

function StarRating({ value, onChange, size = 16, readOnly = false }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={readOnly}
          onClick={() => onChange && onChange(n === value ? 0 : n)}
          className={readOnly ? "" : "hover:scale-110 transition-transform"}
          style={{ cursor: readOnly ? "default" : "pointer" }}
        >
          <Star
            size={size}
            fill={n <= value ? palette.amber : "transparent"}
            color={n <= value ? palette.amber : palette.border}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function Header({ tab, setTab, count, user, onLogout }) {
  const tabs = [
    { id: "library", label: "Biblioteca", icon: Library },
    { id: "add", label: "Agregar", icon: Plus },
    { id: "recommend", label: "Recomiéndame", icon: Sparkles },
    { id: "stats", label: "Resumen", icon: BarChart3 },
  ];
  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur-sm"
      style={{ backgroundColor: palette.bg + "EE", borderColor: palette.border }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1
                style={{
                  ...display,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: palette.ink,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
                className="text-3xl sm:text-4xl"
              >
                Folio
              </h1>
              <span
                style={{
                  color: palette.amber,
                  fontSize: "1.2rem",
                  letterSpacing: "0.2em",
                  marginLeft: "0.2rem",
                }}
              >
                ·
              </span>
            </div>
            <p
              style={{
                ...body,
                color: palette.inkFaint,
                fontStyle: "italic",
                marginTop: "0.25rem",
              }}
              className="text-xs sm:text-base hidden sm:block"
            >
              tu biblioteca, tus humores, tus lecturas
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {count > 0 && (
              <span
                style={{
                  ...display,
                  color: palette.inkSoft,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
                className="text-xs sm:text-sm hidden sm:inline"
              >
                {count} {count === 1 ? "libro" : "libros"}
              </span>
            )}
            <div
              className="flex items-center gap-2"
              style={{
                borderLeft: `1px solid ${palette.border}`,
                paddingLeft: "0.75rem",
              }}
            >
              <span
                style={{ ...display, fontSize: "0.85rem", color: palette.inkSoft }}
                className="hidden sm:inline"
              >
                {user.name.split(" ")[0]}
              </span>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:opacity-70 transition-opacity"
                style={{
                  ...display,
                  fontSize: "0.8rem",
                  color: palette.inkSoft,
                  border: `1px solid ${palette.border}`,
                  minHeight: 32,
                }}
              >
                <LogOut size={13} strokeWidth={2} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-1 scrollbar-hide">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  ...display,
                  fontWeight: active ? 600 : 400,
                  fontSize: "0.9rem",
                  backgroundColor: active ? palette.ink : "transparent",
                  color: active ? palette.bg : palette.inkSoft,
                  border: `1px solid ${active ? palette.ink : palette.border}`,
                  minHeight: 38,
                }}
              >
                <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function BookCard({ book, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left transition-all hover:-translate-y-0.5 group"
      style={{
        backgroundColor: palette.bgCard,
        border: `1px solid ${palette.borderSoft}`,
        borderRadius: "6px",
        padding: "1rem",
        boxShadow: "0 1px 0 rgba(42,31,26,0.04)",
      }}
    >
      <div className="flex gap-3">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="object-cover rounded-sm flex-shrink-0"
            style={{ width: 60, height: 86, boxShadow: "0 2px 8px rgba(42,31,26,0.18)" }}
          />
        ) : (
          <BookCoverPlaceholder title={book.title} author={book.author} width={60} height={86} />
        )}
        <div className="flex-1 min-w-0">
          <h3
            style={{
              ...display,
              fontWeight: 600,
              fontSize: "1.05rem",
              color: palette.ink,
              lineHeight: 1.2,
              marginBottom: "0.15rem",
            }}
            className="line-clamp-2"
          >
            {book.title}
          </h3>
          <p
            style={{
              ...body,
              fontStyle: "italic",
              color: palette.inkSoft,
              fontSize: "0.9rem",
              marginBottom: "0.4rem",
            }}
            className="truncate"
          >
            {book.author}
          </p>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <StatusBadge status={book.status} />
            {book.genre && (
              <span
                style={{
                  ...display,
                  fontSize: "0.7rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: palette.inkFaint,
                  backgroundColor: palette.bgSoft,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  fontWeight: 500,
                }}
              >
                {book.genre}
              </span>
            )}
            {book.rating > 0 && <StarRating value={book.rating} size={11} readOnly />}
          </div>
          {book.summary && (
            <p
              style={{
                ...body,
                fontSize: "0.82rem",
                color: palette.inkFaint,
                lineHeight: 1.4,
                fontStyle: "italic",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {book.summary}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function LibraryView({ books, onSelectBook, setTab }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filters = [
    { id: "all", label: "Todos" },
    { id: "reading", label: "Leyendo" },
    { id: "want_to_read", label: "Por leer" },
    { id: "wish", label: "Quiero leer" },
    { id: "read", label: "Leídos" },
  ];

  let filtered = filter === "all" ? books : books.filter((b) => b.status === filter);
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.genre && b.genre.toLowerCase().includes(q))
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div
          className="inline-flex items-center justify-center mb-6 rounded-full"
          style={{
            width: 72,
            height: 72,
            backgroundColor: palette.bgSoft,
            border: `1px solid ${palette.border}`,
          }}
        >
          <Library size={28} color={palette.inkSoft} strokeWidth={1.5} />
        </div>
        <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.5rem", color: palette.ink, marginBottom: "0.5rem" }}>
          Tu biblioteca espera
        </h2>
        <p style={{ ...body, color: palette.inkSoft, fontSize: "1.05rem", maxWidth: 400, margin: "0 auto 1.5rem" }}>
          Empieza agregando un libro. Escanea el código de barras o escríbelo a mano.
        </p>
        <button
          onClick={() => setTab("add")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full transition-all hover:scale-105"
          style={{
            ...display,
            fontWeight: 500,
            backgroundColor: palette.ink,
            color: palette.bg,
          }}
        >
          <Plus size={16} />
          Agregar primer libro
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-5 sm:py-6">
      <div className="relative mb-4">
        <Search
          size={16}
          color={palette.inkFaint}
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, autor o género..."
          style={{
            ...body,
            width: "100%",
            padding: "0.65rem 2.5rem 0.65rem 2.4rem",
            backgroundColor: palette.bgCard,
            border: `1px solid ${palette.border}`,
            borderRadius: "999px",
            fontSize: "1rem",
            color: palette.ink,
            outline: "none",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
            className="p-1 rounded-full hover:opacity-70"
          >
            <X size={14} color={palette.inkFaint} />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
        {filters.map((f) => {
          const active = filter === f.id;
          const count = f.id === "all" ? books.length : books.filter((b) => b.status === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-full transition-all whitespace-nowrap flex-shrink-0"
              style={{
                ...display,
                fontSize: "0.85rem",
                fontWeight: active ? 600 : 400,
                backgroundColor: active ? palette.ink : "transparent",
                color: active ? palette.bg : palette.inkSoft,
                border: `1px solid ${active ? palette.ink : palette.border}`,
                minHeight: 34,
              }}
            >
              {f.label} <span style={{ opacity: 0.6 }}>· {count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft }}>
            {search ? `No encontré libros que coincidan con "${search}"` : "No hay libros en este estado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} onClick={() => onSelectBook(book)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BarcodeScanner({ onDetect, onCameraError }) {
  const divId = "folio-isbn-scanner";

  useEffect(() => {
    let stopped = false;
    const scanner = new Html5Qrcode(divId);

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => ({
            width: Math.min(Math.round(w * 0.8), 300),
            height: Math.min(Math.round(h * 0.35), 110),
          }),
        },
        async (decodedText) => {
          if (stopped) return;
          stopped = true;
          await scanner.stop().catch(() => {});
          onDetect(decodedText.replace(/[^0-9X]/gi, ""));
        },
        () => {}
      )
      .catch((err) => {
        console.error("Barcode scanner:", err);
        onCameraError();
      });

    return () => {
      stopped = true;
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div>
      <div
        id={divId}
        style={{
          width: "100%",
          borderRadius: "8px",
          overflow: "hidden",
          border: `1px solid ${palette.border}`,
          backgroundColor: palette.ink,
          minHeight: 220,
        }}
      />
      <p
        style={{
          ...body,
          color: palette.inkFaint,
          fontStyle: "italic",
          textAlign: "center",
          marginTop: "0.9rem",
          fontSize: "0.9rem",
        }}
      >
        Apunta al código de barras del libro
      </p>
    </div>
  );
}

function AddBookView({ onAdd, setTab }) {
  const [mode, setMode] = useState(null);
  const [isbnStage, setIsbnStage] = useState("scanning"); // scanning | loading | confirm | notfound
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    status: "want_to_read",
    genre: "",
    summary: "",
    moodTags: [],
    coverUrl: null,
    rating: 0,
  });

  function handleSave() {
    if (!form.title.trim() || !form.author.trim()) {
      setError("El título y autor son necesarios.");
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      ...form,
      title: form.title.trim(),
      author: form.author.trim(),
      rating: form.rating || 0,
      review: "",
      addedAt: Date.now(),
    });
    setMode(null);
    setIsbnStage("scanning");
    setForm({
      title: "",
      author: "",
      status: "want_to_read",
      genre: "",
      summary: "",
      moodTags: [],
      coverUrl: null,
      rating: 0,
    });
    setError("");
    setTab("library");
  }

  if (mode === null) {
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
        <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.6rem", color: palette.ink, marginBottom: "0.4rem" }}>
          ¿Cómo quieres agregarlo?
        </h2>
        <p style={{ ...body, color: palette.inkSoft, marginBottom: "1.5rem" }}>
          Escanea el código de barras o escríbelo a mano.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => { setIsbnStage("scanning"); setMode("isbn"); }}
            className="text-left p-5 rounded-md transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}
          >
            <Barcode size={24} color={palette.amber} strokeWidth={1.8} />
            <h3 style={{ ...display, fontSize: "1.05rem", fontWeight: 600, color: palette.ink, marginTop: "0.6rem" }}>
              Código de barras
            </h3>
            <p style={{ ...body, color: palette.inkSoft, fontSize: "0.88rem", marginTop: "0.25rem" }}>
              Escanea el ISBN · sin IA
            </p>
          </button>
          <button
            onClick={() => setMode("manual")}
            className="text-left p-5 rounded-md transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}
          >
            <Pencil size={24} color={palette.inkSoft} strokeWidth={1.8} />
            <h3 style={{ ...display, fontSize: "1.05rem", fontWeight: 600, color: palette.ink, marginTop: "0.6rem" }}>
              Manual
            </h3>
            <p style={{ ...body, color: palette.inkSoft, fontSize: "0.88rem", marginTop: "0.25rem" }}>
              Escribe título y autor
            </p>
          </button>
        </div>
      </div>
    );
  }

  // isbn mode
  if (mode === "isbn") {
    function goBack() {
      setMode(null);
      setIsbnStage("scanning");
      setError("");
    }

    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
        <button
          onClick={goBack}
          className="flex items-center gap-1 mb-4"
          style={{ ...display, color: palette.inkSoft, fontSize: "0.9rem" }}
        >
          <ChevronLeft size={16} /> Atrás
        </button>

        {isbnStage === "scanning" && (
          <div>
            <h2
              style={{
                ...display,
                fontStyle: "italic",
                fontSize: "1.5rem",
                color: palette.ink,
                marginBottom: "0.4rem",
              }}
            >
              Escanea el código de barras
            </h2>
            <p style={{ ...body, color: palette.inkSoft, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Apunta la cámara al ISBN en la contracubierta o lomo del libro.
            </p>
            <BarcodeScanner
              onDetect={async (isbn) => {
                setIsbnStage("loading");
                setError("");
                try {
                  const bookData = await lookupISBN(isbn);
                  if (bookData && bookData.title) {
                    setForm({
                      title: bookData.title,
                      author: bookData.author,
                      status: "want_to_read",
                      genre: bookData.genre,
                      summary: bookData.summary,
                      moodTags: [],
                      coverUrl: bookData.coverUrl,
                      rating: 0,
                    });
                    setIsbnStage("confirm");
                  } else {
                    setIsbnStage("notfound");
                  }
                } catch (e) {
                  console.error(e);
                  setIsbnStage("notfound");
                }
              }}
              onCameraError={() => {
                setError("No se pudo acceder a la cámara. Verifica los permisos.");
              }}
            />
            {error && (
              <p
                style={{
                  ...body,
                  color: palette.accent,
                  fontSize: "0.9rem",
                  marginTop: "0.75rem",
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
            {/* Fallback visible at all times — especially useful on desktop */}
            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "1.25rem",
                borderTop: `1px solid ${palette.borderSoft}`,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  ...body,
                  color: palette.inkFaint,
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                  marginBottom: "0.65rem",
                }}
              >
                ¿La cámara no lee el código?
              </p>
              <button
                onClick={() => { setMode("manual"); setIsbnStage("scanning"); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full transition-all hover:opacity-80"
                style={{
                  ...display,
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  color: palette.inkSoft,
                  border: `1px solid ${palette.border}`,
                  backgroundColor: palette.bgCard,
                }}
              >
                <Pencil size={13} strokeWidth={2} />
                Agregar manualmente
              </button>
            </div>
          </div>
        )}

        {isbnStage === "loading" && (
          <div className="text-center py-16">
            <Loader2 size={28} className="mx-auto animate-spin mb-3" color={palette.accent} />
            <p style={{ ...display, fontStyle: "italic", color: palette.ink, fontSize: "1.1rem" }}>
              Buscando en Open Library...
            </p>
            <p style={{ ...body, color: palette.inkFaint, marginTop: "0.25rem", fontSize: "0.9rem" }}>
              Sin gastar tokens de IA
            </p>
          </div>
        )}

        {isbnStage === "confirm" && (
          <div>
            <div className="flex gap-4 mb-5">
              {form.coverUrl ? (
                <img
                  src={form.coverUrl}
                  alt={form.title}
                  className="rounded-sm flex-shrink-0"
                  style={{
                    width: 90,
                    height: 130,
                    objectFit: "cover",
                    boxShadow: "0 4px 14px rgba(42,31,26,0.15)",
                  }}
                />
              ) : (
                <BookCoverPlaceholder title={form.title} author={form.author} width={90} height={130} />
              )}
              <div>
                <p
                  style={{
                    ...display,
                    fontSize: "0.75rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: palette.amber,
                    marginBottom: "0.4rem",
                    fontWeight: 600,
                  }}
                >
                  📚 Encontrado en Open Library
                </p>
                <h2
                  style={{
                    ...display,
                    fontWeight: 600,
                    fontSize: "1.4rem",
                    color: palette.ink,
                    lineHeight: 1.15,
                  }}
                >
                  {form.title}
                </h2>
                <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "1.05rem" }}>
                  {form.author}
                </p>
              </div>
            </div>
            <BookForm form={form} setForm={setForm} />
            {error && (
              <p style={{ ...body, color: palette.accent, fontSize: "0.9rem", marginTop: "0.5rem" }}>
                {error}
              </p>
            )}
            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 rounded-full transition-all hover:scale-[1.01]"
              style={{ ...display, fontWeight: 500, backgroundColor: palette.ink, color: palette.bg }}
            >
              Guardar libro
            </button>
          </div>
        )}

        {isbnStage === "notfound" && (
          <div className="text-center py-10">
            <div
              className="inline-flex items-center justify-center mb-4 rounded-full"
              style={{ width: 56, height: 56, backgroundColor: palette.bgSoft, border: `1px solid ${palette.border}` }}
            >
              <Barcode size={22} color={palette.inkFaint} strokeWidth={1.5} />
            </div>
            <p
              style={{
                ...display,
                fontStyle: "italic",
                fontSize: "1.2rem",
                color: palette.ink,
                marginBottom: "0.5rem",
              }}
            >
              ISBN no encontrado
            </p>
            <p style={{ ...body, color: palette.inkSoft, fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Open Library no tiene este libro. Intenta escanear de nuevo o agrégalo manualmente.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setIsbnStage("scanning")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full"
                style={{
                  ...display,
                  fontSize: "0.9rem",
                  color: palette.inkSoft,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <Barcode size={14} /> Escanear de nuevo
              </button>
              <button
                onClick={() => {
                  setMode("manual");
                  setIsbnStage("scanning");
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full"
                style={{
                  ...display,
                  fontSize: "0.9rem",
                  backgroundColor: palette.ink,
                  color: palette.bg,
                }}
              >
                <Pencil size={14} /> Agregar manualmente
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // manual mode
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
      <button
        onClick={() => setMode(null)}
        className="flex items-center gap-1 mb-4"
        style={{ ...display, color: palette.inkSoft, fontSize: "0.9rem" }}
      >
        <ChevronLeft size={16} /> Atrás
      </button>
      <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.5rem", color: palette.ink, marginBottom: "1rem" }}>
        Agregar manualmente
      </h2>
      <BookForm form={form} setForm={setForm} />
      {error && <p style={{ ...body, color: palette.accent, fontSize: "0.9rem", marginTop: "0.5rem" }}>{error}</p>}
      <button
        onClick={handleSave}
        className="w-full mt-4 py-3 rounded-full transition-all hover:scale-[1.01]"
        style={{ ...display, fontWeight: 500, backgroundColor: palette.ink, color: palette.bg }}
      >
        Guardar libro
      </button>
    </div>
  );
}

function BookForm({ form, setForm }) {
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState("");

  const inputStyle = {
    ...body,
    width: "100%",
    padding: "0.65rem 0.85rem",
    backgroundColor: palette.bgCard,
    border: `1px solid ${palette.border}`,
    borderRadius: "4px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
  };
  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.inkSoft,
    fontWeight: 500,
    marginBottom: "0.3rem",
    display: "block",
  };

  async function handleEnrich() {
    if (!form.title.trim() || !form.author.trim()) {
      setEnrichError("Escribe título y autor primero.");
      setTimeout(() => setEnrichError(""), 3000);
      return;
    }
    setEnriching(true);
    setEnrichError("");
    try {
      const result = await enrichBook(form.title.trim(), form.author.trim());
      setForm({
        ...form,
        genre: result.genre || form.genre,
        summary: result.summary || form.summary,
        moodTags: result.moodTags || form.moodTags,
      });
    } catch (e) {
      console.error(e);
      setEnrichError("No pude buscar la info. Intenta de nuevo.");
    } finally {
      setEnriching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label style={labelStyle}>Título</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Cien años de soledad"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Autor</label>
        <input
          type="text"
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
          placeholder="Gabriel García Márquez"
          style={inputStyle}
        />
      </div>

      <button
        onClick={handleEnrich}
        disabled={enriching}
        type="button"
        className="w-full flex items-center justify-center gap-2 py-2 rounded-full transition-all"
        style={{
          ...display,
          fontSize: "0.88rem",
          fontWeight: 500,
          backgroundColor: enriching ? palette.bgSoft : palette.bgCard,
          color: palette.accent,
          border: `1px dashed ${palette.accent}88`,
          opacity: enriching ? 0.7 : 1,
        }}
      >
        {enriching ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Buscando info...
          </>
        ) : (
          <>
            <Sparkles size={14} /> Buscar info del libro con IA
          </>
        )}
      </button>
      {enrichError && (
        <p style={{ ...body, color: palette.accent, fontSize: "0.85rem", fontStyle: "italic" }}>{enrichError}</p>
      )}

      <div>
        <label style={labelStyle}>Estado</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_META).map(([id, meta]) => {
            const active = form.status === id;
            const Icon = meta.icon;
            return (
              <button
                key={id}
                onClick={() => setForm({ ...form, status: id })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                style={{
                  ...display,
                  fontSize: "0.88rem",
                  fontWeight: active ? 600 : 400,
                  backgroundColor: active ? meta.color : "transparent",
                  color: active ? "#fff" : palette.inkSoft,
                  border: `1px solid ${active ? meta.color : palette.border}`,
                }}
              >
                <Icon size={13} strokeWidth={2.2} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
      {form.status === "reading" && (
        <div
          className="p-3 rounded"
          style={{
            backgroundColor: palette.accent + "0F",
            border: `1px solid ${palette.accent}33`,
          }}
        >
          <label style={{ ...labelStyle, color: palette.accent, marginBottom: "0.2rem" }}>
            ¿Qué tal te va? <span style={{ textTransform: "none", letterSpacing: 0, fontStyle: "italic", fontWeight: 400 }}>(opcional)</span>
          </label>
          <p style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft, fontStyle: "italic", marginBottom: "0.5rem" }}>
            Una calificación tentativa ayuda a que las recomendaciones entiendan mejor tus gustos.
          </p>
          <StarRating
            value={form.rating || 0}
            size={22}
            onChange={(r) => setForm({ ...form, rating: r })}
          />
        </div>
      )}
      <div>
        <label style={labelStyle}>Género</label>
        <input
          type="text"
          value={form.genre || ""}
          onChange={(e) => setForm({ ...form, genre: e.target.value })}
          placeholder="Ficción, terror, filosofía..."
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Resumen</label>
        <textarea
          value={form.summary || ""}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="De qué trata el libro..."
          rows={3}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
      </div>
    </div>
  );
}

function BookDetailModal({ book, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(book);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => setDraft(book), [book]);

  if (!book) return null;

  function save() {
    onUpdate({ ...draft, title: draft.title.trim(), author: draft.author.trim() });
    setEditing(false);
  }

  async function handleShare() {
    const stars = book.rating > 0 ? "★".repeat(book.rating) + "☆".repeat(5 - book.rating) : "";
    const lines = [
      `📖 ${book.title}`,
      `de ${book.author}`,
    ];
    if (stars) lines.push("", stars + ` (${book.rating}/5)`);
    if (book.review?.trim()) lines.push("", `"${book.review.trim()}"`);
    lines.push("", "— compartido desde Folio");
    const text = lines.join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: book.title, text });
        setShareMsg("¡Compartido!");
      } else {
        await navigator.clipboard.writeText(text);
        setShareMsg("Copiado al portapapeles");
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(text);
          setShareMsg("Copiado al portapapeles");
        } catch {
          setShareMsg("No se pudo compartir");
        }
      }
    }
    setTimeout(() => setShareMsg(""), 2500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: "rgba(42,31,26,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-md"
        style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex justify-between items-center px-4 sm:px-5 py-3 border-b"
          style={{ backgroundColor: palette.bg, borderColor: palette.borderSoft }}
        >
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:opacity-70">
            <X size={20} color={palette.inkSoft} />
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full"
              style={{
                ...display,
                fontSize: "0.85rem",
                color: palette.inkSoft,
                border: `1px solid ${palette.border}`,
                minHeight: 36,
              }}
            >
              <Share2 size={13} /> Compartir
            </button>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                style={{
                  ...display,
                  fontSize: "0.85rem",
                  color: palette.inkSoft,
                  border: `1px solid ${palette.border}`,
                  minHeight: 36,
                }}
              >
                <Pencil size={13} /> Editar
              </button>
            ) : (
              <button
                onClick={save}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                style={{
                  ...display,
                  fontSize: "0.85rem",
                  backgroundColor: palette.ink,
                  color: palette.bg,
                  minHeight: 36,
                }}
              >
                <Check size={13} /> Guardar
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${book.title}"?`)) onDelete(book.id);
              }}
              className="p-2 rounded-full hover:opacity-70"
              style={{ color: palette.accent }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {shareMsg && (
          <div
            className="px-4 sm:px-5 py-2 text-center"
            style={{
              ...body,
              backgroundColor: palette.amber + "22",
              color: palette.ink,
              fontSize: "0.9rem",
              fontStyle: "italic",
            }}
          >
            {shareMsg}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <div className="flex gap-4 mb-5">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="rounded-sm flex-shrink-0"
                style={{ width: 100, height: 145, objectFit: "cover", boxShadow: "0 4px 14px rgba(42,31,26,0.15)" }}
              />
            ) : (
              <BookCoverPlaceholder title={book.title} author={book.author} width={100} height={145} />
            )}
            <div className="flex-1 min-w-0">
              {!editing ? (
                <>
                  <h2
                    style={{
                      ...display,
                      fontWeight: 600,
                      fontSize: "1.4rem",
                      color: palette.ink,
                      lineHeight: 1.15,
                    }}
                  >
                    {book.title}
                  </h2>
                  <p
                    style={{
                      ...body,
                      fontStyle: "italic",
                      color: palette.inkSoft,
                      fontSize: "1.05rem",
                      marginTop: "0.15rem",
                    }}
                  >
                    {book.author}
                  </p>
                  <div className="mt-2 mb-1 flex flex-wrap gap-1.5 items-center">
                    <StatusBadge status={book.status} />
                    {book.genre && (
                      <span
                        style={{
                          ...display,
                          fontSize: "0.7rem",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: palette.inkFaint,
                          backgroundColor: palette.bgSoft,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          fontWeight: 500,
                        }}
                      >
                        {book.genre}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <BookForm form={draft} setForm={setDraft} />
              )}
            </div>
          </div>

          {!editing && book.summary && (
            <div className="mb-5">
              <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft, lineHeight: 1.5 }}>{book.summary}</p>
            </div>
          )}

          {!editing && (
            <>
              <div className="mb-4">
                <label
                  style={{
                    ...display,
                    fontSize: "0.78rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: palette.inkSoft,
                    fontWeight: 500,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Tu calificación
                </label>
                <StarRating
                  value={draft.rating || 0}
                  onChange={(r) => {
                    const updated = { ...draft, rating: r };
                    setDraft(updated);
                    onUpdate(updated);
                  }}
                  size={26}
                />
              </div>
              <div>
                <label
                  style={{
                    ...display,
                    fontSize: "0.78rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: palette.inkSoft,
                    fontWeight: 500,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Tus notas / reseña
                </label>
                <textarea
                  value={draft.review || ""}
                  onChange={(e) => setDraft({ ...draft, review: e.target.value })}
                  onBlur={() => onUpdate(draft)}
                  rows={5}
                  placeholder="¿Qué te pareció? ¿Qué te dejó? Cualquier nota personal..."
                  style={{
                    ...body,
                    width: "100%",
                    padding: "0.7rem 0.85rem",
                    backgroundColor: palette.bgCard,
                    border: `1px solid ${palette.border}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    color: palette.ink,
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendFlow({ books, onSelectBook, onAdd }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ mood: "", time: "", challenge: "", extra: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [addedTitles, setAddedTitles] = useState(new Set());

  if (books.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <Sparkles size={32} color={palette.amber} className="mx-auto mb-4" />
        <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.4rem", color: palette.ink, marginBottom: "0.5rem" }}>
          Necesito conocerte un poco
        </h2>
        <p style={{ ...body, color: palette.inkSoft, maxWidth: 400, margin: "0 auto" }}>
          Agrega al menos un libro a tu biblioteca para que pueda darte recomendaciones personalizadas.
        </p>
      </div>
    );
  }

  const questions = [
    {
      key: "mood",
      title: "¿Cómo te sientes ahora?",
      options: [
        "Contemplativo, reflexivo",
        "Aventurero, con ganas de acción",
        "Melancólico, introspectivo",
        "Curioso, con ganas de aprender",
        "Ligero, divertido",
        "Intenso, profundo",
      ],
    },
    {
      key: "time",
      title: "¿Qué tipo de sesiones tendrás?",
      options: [
        "Ratos cortos, 5-15 min",
        "Sesiones medianas, 30-60 min",
        "Sesiones largas, más de una hora",
        "Variado, depende del día",
      ],
    },
    {
      key: "challenge",
      title: "¿Qué tan desafiante lo quieres?",
      options: [
        "Ligero y fluido, déjate llevar",
        "Equilibrado, ni muy fácil ni muy denso",
        "Desafiante, denso, que me haga pensar",
      ],
    },
  ];

  async function fetchRecs() {
    setLoading(true);
    setError("");
    try {
      const res = await getRecommendations(books, answers);
      setResults(res);
    } catch (e) {
      console.error(e);
      setError("Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({ mood: "", time: "", challenge: "", extra: "" });
    setResults(null);
    setError("");
    setAddedTitles(new Set());
  }

  function handleAddSuggestion(suggestion) {
    onAdd({
      id: crypto.randomUUID(),
      title: suggestion.title,
      author: suggestion.author,
      status: "wish",
      genre: suggestion.genre || "",
      summary: suggestion.summary || "",
      moodTags: [],
      coverUrl: null,
      rating: 0,
      review: "",
      addedAt: Date.now(),
    });
    setAddedTitles(new Set([...addedTitles, suggestion.title.toLowerCase().trim()]));
  }

  if (results) {
    const readTitlesLower = new Set(
      books.filter((b) => b.status === "read").map((b) => b.title.toLowerCase().trim())
    );

    const fromLibraryMatched = (results.fromLibrary || [])
      .map((r) => {
        const book = books.find(
          (b) =>
            b.title.toLowerCase().trim() === r.title.toLowerCase().trim() &&
            b.status !== "read"
        );
        return book ? { ...r, book } : null;
      })
      .filter(Boolean);

    const allTitlesLower = new Set(books.map((b) => b.title.toLowerCase().trim()));
    const newSuggestions = (results.newSuggestions || []).filter(
      (s) => !readTitlesLower.has(s.title.toLowerCase().trim())
    );

    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
        <div className="mb-5">
          <p
            style={{
              ...display,
              fontSize: "0.78rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: palette.amber,
              fontWeight: 600,
            }}
          >
            ✦ Para tu mood actual
          </p>
          <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.6rem", color: palette.ink }}>
            Mis sugerencias
          </h2>
        </div>

        {fromLibraryMatched.length > 0 && (
          <div className="mb-7">
            <h3
              style={{
                ...display,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: palette.inkSoft,
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              De tu biblioteca
            </h3>
            <div className="space-y-3">
              {fromLibraryMatched.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onSelectBook(r.book)}
                  className="w-full text-left p-4 rounded-md transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: palette.bgCard,
                    border: `1px solid ${palette.borderSoft}`,
                  }}
                >
                  <div className="flex gap-3">
                    {r.book.coverUrl ? (
                      <img
                        src={r.book.coverUrl}
                        alt={r.book.title}
                        className="rounded-sm flex-shrink-0"
                        style={{ width: 60, height: 86, objectFit: "cover", boxShadow: "0 2px 8px rgba(42,31,26,0.15)" }}
                      />
                    ) : (
                      <BookCoverPlaceholder title={r.book.title} author={r.book.author} width={60} height={86} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          style={{
                            ...display,
                            fontWeight: 600,
                            fontSize: "1.05rem",
                            color: palette.ink,
                            lineHeight: 1.2,
                          }}
                        >
                          {r.book.title}
                        </h3>
                        <StatusBadge status={r.book.status} />
                      </div>
                      <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "0.9rem" }}>
                        {r.book.author}
                      </p>
                      <p
                        style={{
                          ...body,
                          color: palette.ink,
                          fontSize: "0.92rem",
                          marginTop: "0.5rem",
                          lineHeight: 1.45,
                        }}
                      >
                        {r.reason}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {newSuggestions.length > 0 && (
          <div>
            <h3
              style={{
                ...display,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: palette.mauve,
                fontWeight: 600,
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Sparkles size={13} /> Para descubrir
            </h3>
            <div className="space-y-3">
              {newSuggestions.map((s, i) => {
                const isAdded =
                  addedTitles.has(s.title.toLowerCase().trim()) ||
                  allTitlesLower.has(s.title.toLowerCase().trim());
                return (
                  <div
                    key={i}
                    className="p-4 rounded-md"
                    style={{
                      backgroundColor: palette.bgCard,
                      border: `1px solid ${palette.borderSoft}`,
                    }}
                  >
                    <h3
                      style={{
                        ...display,
                        fontWeight: 600,
                        fontSize: "1.05rem",
                        color: palette.ink,
                        lineHeight: 1.2,
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "0.9rem" }}
                    >
                      {s.author}
                      {s.genre && (
                        <span style={{ color: palette.inkFaint, fontStyle: "normal" }}> · {s.genre}</span>
                      )}
                    </p>
                    {s.summary && (
                      <p
                        style={{
                          ...body,
                          color: palette.inkSoft,
                          fontSize: "0.88rem",
                          marginTop: "0.4rem",
                          fontStyle: "italic",
                          lineHeight: 1.4,
                        }}
                      >
                        {s.summary}
                      </p>
                    )}
                    <p
                      style={{
                        ...body,
                        color: palette.ink,
                        fontSize: "0.92rem",
                        marginTop: "0.5rem",
                        lineHeight: 1.45,
                      }}
                    >
                      {s.reason}
                    </p>
                    <button
                      onClick={() => handleAddSuggestion(s)}
                      disabled={isAdded}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                      style={{
                        ...display,
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        backgroundColor: isAdded ? "transparent" : palette.mauve,
                        color: isAdded ? palette.mauve : "#fff",
                        border: `1px solid ${palette.mauve}`,
                        opacity: isAdded ? 0.7 : 1,
                        cursor: isAdded ? "default" : "pointer",
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check size={13} /> Agregado a Quiero leer
                        </>
                      ) : (
                        <>
                          <Heart size={13} /> Agregar a Quiero leer
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fromLibraryMatched.length === 0 && newSuggestions.length === 0 && (
          <p style={{ ...body, color: palette.inkSoft, fontStyle: "italic" }}>
            No encontré buenas coincidencias esta vez. Intenta con otro mood.
          </p>
        )}
        <button
          onClick={reset}
          className="mt-7 w-full py-3 rounded-full"
          style={{
            ...display,
            backgroundColor: "transparent",
            color: palette.inkSoft,
            border: `1px solid ${palette.border}`,
          }}
        >
          Empezar de nuevo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 size={32} className="mx-auto animate-spin mb-3" color={palette.accent} />
        <p style={{ ...display, fontStyle: "italic", color: palette.ink, fontSize: "1.1rem" }}>
          Pensando en lo que te encajaría...
        </p>
      </div>
    );
  }

  if (step < questions.length) {
    const q = questions[step];
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
        <p
          style={{
            ...display,
            fontSize: "0.78rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: palette.inkFaint,
            fontWeight: 500,
            marginBottom: "0.5rem",
          }}
        >
          Paso {step + 1} de {questions.length + 1}
        </p>
        <h2
          style={{
            ...display,
            fontStyle: "italic",
            fontSize: "1.7rem",
            color: palette.ink,
            marginBottom: "1.25rem",
            lineHeight: 1.2,
          }}
        >
          {q.title}
        </h2>
        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setAnswers({ ...answers, [q.key]: opt });
                setStep(step + 1);
              }}
              className="w-full text-left px-4 py-3 rounded-md transition-all hover:-translate-x-0.5"
              style={{
                ...body,
                backgroundColor: palette.bgCard,
                border: `1px solid ${palette.border}`,
                color: palette.ink,
                fontSize: "1.02rem",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-4 flex items-center gap-1"
            style={{ ...display, color: palette.inkSoft, fontSize: "0.9rem" }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
      <p
        style={{
          ...display,
          fontSize: "0.78rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: palette.inkFaint,
          fontWeight: 500,
          marginBottom: "0.5rem",
        }}
      >
        Última cosa (opcional)
      </p>
      <h2
        style={{
          ...display,
          fontStyle: "italic",
          fontSize: "1.7rem",
          color: palette.ink,
          marginBottom: "1.25rem",
          lineHeight: 1.2,
        }}
      >
        ¿Algo específico que evitar o que sí quieres?
      </h2>
      <textarea
        value={answers.extra}
        onChange={(e) => setAnswers({ ...answers, extra: e.target.value })}
        rows={3}
        placeholder="Ej: nada de violencia, prefiero ficción, quiero algo que me distraiga del trabajo..."
        style={{
          ...body,
          width: "100%",
          padding: "0.8rem",
          backgroundColor: palette.bgCard,
          border: `1px solid ${palette.border}`,
          borderRadius: "4px",
          fontSize: "1rem",
          color: palette.ink,
          outline: "none",
          resize: "vertical",
          lineHeight: 1.5,
        }}
      />
      {error && (
        <p style={{ ...body, color: palette.accent, fontSize: "0.9rem", marginTop: "0.5rem", fontStyle: "italic" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 px-4 py-3 rounded-full"
          style={{ ...display, color: palette.inkSoft, border: `1px solid ${palette.border}` }}
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <button
          onClick={fetchRecs}
          className="flex-1 py-3 rounded-full transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
          style={{ ...display, fontWeight: 500, backgroundColor: palette.ink, color: palette.bg }}
        >
          <Wand2 size={16} />
          Recomendarme libros
        </button>
      </div>
    </div>
  );
}


// ============ STATS VIEW ============
function StatsView({ books, onSelectBook, setTab }) {
  if (books.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <BarChart3 size={32} color={palette.inkSoft} className="mx-auto mb-4" strokeWidth={1.5} />
        <h2
          style={{
            ...display,
            fontStyle: "italic",
            fontSize: "1.4rem",
            color: palette.ink,
            marginBottom: "0.5rem",
          }}
        >
          Aún no hay datos
        </h2>
        <p style={{ ...body, color: palette.inkSoft, maxWidth: 380, margin: "0 auto 1.5rem" }}>
          Agrega libros y registra tus lecturas para ver tu resumen.
        </p>
        <button
          onClick={() => setTab("add")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
          style={{ ...display, fontWeight: 500, backgroundColor: palette.ink, color: palette.bg }}
        >
          <Plus size={16} />
          Agregar libro
        </button>
      </div>
    );
  }

  const total = books.length;
  const reading = books.filter((b) => b.status === "reading").length;
  const wantToRead = books.filter((b) => b.status === "want_to_read").length;
  const wish = books.filter((b) => b.status === "wish").length;
  const read = books.filter((b) => b.status === "read").length;

  const rated = books.filter((b) => b.rating > 0);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;

  const genreCounts = {};
  books.forEach((b) => {
    if (b.genre?.trim()) {
      const g = b.genre.trim().toLowerCase();
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topRated = [...books]
    .filter((b) => b.rating > 0)
    .sort((a, b) => b.rating - a.rating || (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 3);

  const readByYear = {};
  books
    .filter((b) => b.status === "read" && b.finishedAt)
    .forEach((b) => {
      const y = new Date(b.finishedAt).getFullYear();
      readByYear[y] = (readByYear[y] || 0) + 1;
    });
  const yearEntries = Object.entries(readByYear).sort((a, b) => a[0] - b[0]);
  const maxYear = Math.max(1, ...Object.values(readByYear));

  const statCardStyle = {
    backgroundColor: palette.bgCard,
    border: `1px solid ${palette.borderSoft}`,
    borderRadius: "8px",
    padding: "1.1rem",
  };

  return (
    <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
      <div style={statCardStyle} className="text-center py-6">
        <p
          style={{
            ...display,
            fontSize: "0.78rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: palette.inkFaint,
            fontWeight: 500,
            marginBottom: "0.4rem",
          }}
        >
          Tu biblioteca
        </p>
        <div
          style={{
            ...display,
            fontSize: "3.5rem",
            fontWeight: 600,
            color: palette.ink,
            lineHeight: 1,
            fontStyle: "italic",
          }}
        >
          {total}
        </div>
        <p style={{ ...body, color: palette.inkSoft, marginTop: "0.3rem", fontStyle: "italic" }}>
          {total === 1 ? "libro" : "libros"} en total
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Leyendo", value: reading, icon: BookOpen, color: palette.accent },
          { label: "Por leer", value: wantToRead, icon: Bookmark, color: palette.amber },
          { label: "Quiero leer", value: wish, icon: Heart, color: palette.mauve },
          { label: "Leídos", value: read, icon: BookmarkCheck, color: palette.inkSoft },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={statCardStyle} className="text-center">
              <Icon size={18} color={s.color} className="mx-auto mb-1.5" strokeWidth={2} />
              <div
                style={{
                  ...display,
                  fontSize: "1.6rem",
                  fontWeight: 600,
                  color: palette.ink,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <p
                style={{
                  ...display,
                  fontSize: "0.72rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: palette.inkFaint,
                  marginTop: "0.35rem",
                }}
              >
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {rated.length > 0 && (
        <div style={statCardStyle}>
          <p
            style={{
              ...display,
              fontSize: "0.78rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: palette.inkFaint,
              fontWeight: 500,
              marginBottom: "0.5rem",
            }}
          >
            Tu calificación promedio
          </p>
          <div className="flex items-center gap-3">
            <div
              style={{
                ...display,
                fontSize: "2.4rem",
                fontWeight: 600,
                color: palette.ink,
                lineHeight: 1,
                fontStyle: "italic",
              }}
            >
              {avgRating.toFixed(1)}
            </div>
            <div>
              <StarRating value={Math.round(avgRating)} size={18} readOnly />
              <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, marginTop: "0.2rem" }}>
                de {rated.length} {rated.length === 1 ? "libro calificado" : "libros calificados"}
              </p>
            </div>
          </div>
        </div>
      )}

      {yearEntries.length > 0 && (
        <div style={statCardStyle}>
          <p
            style={{
              ...display,
              fontSize: "0.78rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: palette.inkFaint,
              fontWeight: 500,
              marginBottom: "0.85rem",
            }}
          >
            Libros leídos por año
          </p>
          <div className="space-y-2">
            {yearEntries.map(([year, count]) => (
              <div key={year} className="flex items-center gap-3">
                <span
                  style={{
                    ...display,
                    fontSize: "0.85rem",
                    color: palette.inkSoft,
                    width: 40,
                    flexShrink: 0,
                  }}
                >
                  {year}
                </span>
                <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: palette.bgSoft }}>
                  <div
                    className="h-full transition-all flex items-center justify-end px-2"
                    style={{
                      width: `${(count / maxYear) * 100}%`,
                      backgroundColor: palette.accent,
                      minWidth: 28,
                    }}
                  >
                    <span style={{ ...display, fontSize: "0.78rem", color: "#fff", fontWeight: 600 }}>
                      {count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topGenres.length > 0 && (
        <div style={statCardStyle}>
          <p
            style={{
              ...display,
              fontSize: "0.78rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: palette.inkFaint,
              fontWeight: 500,
              marginBottom: "0.7rem",
            }}
          >
            Tus géneros favoritos
          </p>
          <div className="space-y-1.5">
            {topGenres.map(([genre, count], i) => (
              <div key={genre} className="flex justify-between items-baseline">
                <span
                  style={{
                    ...display,
                    fontSize: "1.05rem",
                    color: palette.ink,
                    fontStyle: "italic",
                    textTransform: "capitalize",
                  }}
                >
                  {i + 1}. {genre}
                </span>
                <span style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint }}>
                  {count} {count === 1 ? "libro" : "libros"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topRated.length > 0 && (
        <div style={statCardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} color={palette.amber} strokeWidth={2} />
            <p
              style={{
                ...display,
                fontSize: "0.78rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: palette.inkFaint,
                fontWeight: 500,
              }}
            >
              Tus mejor calificados
            </p>
          </div>
          <div className="space-y-2">
            {topRated.map((b) => (
              <button
                key={b.id}
                onClick={() => onSelectBook(b)}
                className="w-full text-left flex items-center gap-3 p-2 rounded transition-all hover:bg-black/[0.03]"
              >
                {b.coverUrl ? (
                  <img
                    src={b.coverUrl}
                    alt={b.title}
                    className="rounded-sm flex-shrink-0"
                    style={{ width: 36, height: 52, objectFit: "cover" }}
                  />
                ) : (
                  <BookCoverPlaceholder title={b.title} author={b.author} width={36} height={52} />
                )}
                <div className="flex-1 min-w-0">
                  <h4
                    style={{
                      ...display,
                      fontWeight: 600,
                      fontSize: "0.98rem",
                      color: palette.ink,
                      lineHeight: 1.2,
                    }}
                    className="truncate"
                  >
                    {b.title}
                  </h4>
                  <p
                    style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "0.85rem" }}
                    className="truncate"
                  >
                    {b.author}
                  </p>
                </div>
                <StarRating value={b.rating} size={12} readOnly />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ AUTH VIEW ============
function AuthView({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(m) {
    setMode(m);
    setForm({ name: "", email: "", password: "", confirm: "" });
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (mode === "login") {
      if (!form.email.trim() || !form.password) {
        setError("Email y contraseña son requeridos.");
        return;
      }
      setLoading(true);
      try {
        const user = await loginUser(form.email, form.password);
        await mintToken(user);
        onLogin(user);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!form.name.trim()) { setError("El nombre es requerido."); return; }
      if (!form.email.trim()) { setError("El email es requerido."); return; }
      if (form.password.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }
      if (form.password !== form.confirm) { setError("Las contraseñas no coinciden."); return; }
      setLoading(true);
      try {
        const user = await registerUser(form.name, form.email, form.password);
        await mintToken(user);
        onLogin(user);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
  }

  const inputStyle = {
    ...body,
    width: "100%",
    padding: "0.72rem 0.9rem",
    backgroundColor: palette.bgSoft,
    border: `1px solid ${palette.border}`,
    borderRadius: "6px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
  };

  const labelStyle = {
    ...display,
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.inkSoft,
    fontWeight: 500,
    marginBottom: "0.3rem",
    display: "block",
  };

  return (
    <div
      style={{
        backgroundColor: palette.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        ...body,
        backgroundImage: `
          radial-gradient(at 20% 10%, rgba(122, 46, 46, 0.05) 0px, transparent 50%),
          radial-gradient(at 80% 90%, rgba(200, 146, 74, 0.06) 0px, transparent 50%)
        `,
      }}
    >
      <style>{FONT_LINK}</style>
      <style>{`
        input:focus { border-color: ${palette.accent} !important; outline: none; }
        ::selection { background: ${palette.amber}55; color: ${palette.ink}; }
        body { background-color: ${palette.bg}; }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div className="flex items-center justify-center gap-1">
          <h1
            style={{
              ...display,
              fontWeight: 600,
              fontStyle: "italic",
              color: palette.ink,
              fontSize: "3.2rem",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Folio
          </h1>
          <span style={{ color: palette.amber, fontSize: "1.5rem", marginLeft: "0.2rem" }}>·</span>
        </div>
        <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic", marginTop: "0.4rem", fontSize: "1rem" }}>
          tu biblioteca, tus humores, tus lecturas
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: palette.bgCard,
          border: `1px solid ${palette.border}`,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(42,31,26,0.1), 0 2px 8px rgba(42,31,26,0.06)",
        }}
      >
        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: `1px solid ${palette.border}` }}>
          {[
            { id: "login", label: "Iniciar sesión" },
            { id: "register", label: "Registrarse" },
          ].map((t) => {
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchMode(t.id)}
                style={{
                  flex: 1,
                  padding: "0.95rem 1rem",
                  ...display,
                  fontSize: "0.9rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? palette.ink : palette.inkFaint,
                  backgroundColor: active ? palette.bgCard : palette.bgSoft,
                  borderBottom: `2px solid ${active ? palette.accent : "transparent"}`,
                  transition: "all 0.15s",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div style={{ padding: "1.6rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre"
                  style={inputStyle}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
                style={inputStyle}
                autoComplete="email"
                autoFocus={mode === "login"}
              />
            </div>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={mode === "register" ? "Mínimo 4 caracteres" : "Tu contraseña"}
                style={inputStyle}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") handleSubmit(); }}
              />
            </div>
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Repite tu contraseña"
                  style={inputStyle}
                  autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
              </div>
            )}
          </div>

          {error && (
            <p
              style={{
                ...body,
                color: palette.accent,
                fontSize: "0.9rem",
                fontStyle: "italic",
                marginTop: "0.8rem",
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...display,
              width: "100%",
              marginTop: "1.3rem",
              padding: "0.9rem",
              backgroundColor: loading ? palette.inkSoft : palette.ink,
              color: palette.bg,
              borderRadius: "999px",
              fontWeight: 500,
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "opacity 0.15s",
              border: "none",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {mode === "login" ? "Entrando..." : "Creando cuenta..."}
              </>
            ) : mode === "login" ? (
              "Entrar"
            ) : (
              "Crear cuenta"
            )}
          </button>
        </div>
      </div>

      <p
        style={{
          ...body,
          color: palette.inkFaint,
          fontSize: "0.85rem",
          fontStyle: "italic",
          marginTop: "1.5rem",
          textAlign: "center",
        }}
      >
        {mode === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => switchMode("register")}
              style={{ color: palette.accent, background: "none", border: "none", cursor: "pointer", fontStyle: "italic", fontFamily: "inherit", fontSize: "inherit" }}
            >
              Regístrate
            </button>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <button
              onClick={() => switchMode("login")}
              style={{ color: palette.accent, background: "none", border: "none", cursor: "pointer", fontStyle: "italic", fontFamily: "inherit", fontSize: "inherit" }}
            >
              Inicia sesión
            </button>
          </>
        )}
      </p>
    </div>
  );
}

// ============ MAIN APP ============
function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("library");
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchBooks(user.id)
      .then((b) => {
        setBooks(b);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Error cargando libros:", err);
        setLoaded(true);
      });
  }, [user.id]);

  async function addBook(book) {
    const withFinished =
      book.status === "read" && !book.finishedAt ? { ...book, finishedAt: Date.now() } : book;
    setBooks((prev) => [withFinished, ...prev]);
    try {
      await insertBook(withFinished, user.id);
    } catch (err) {
      console.error("Error guardando libro:", err);
      setBooks((prev) => prev.filter((b) => b.id !== withFinished.id));
    }
  }

  async function updateBook(updated) {
    const prev = books.find((b) => b.id === updated.id);
    let final = updated;
    if (updated.status === "read" && (!prev || prev.status !== "read") && !updated.finishedAt) {
      final = { ...updated, finishedAt: Date.now() };
    }
    setBooks((prev) => prev.map((b) => (b.id === final.id ? final : b)));
    setSelectedBook(final);
    try {
      await updateBookInDB(final, user.id);
    } catch (err) {
      console.error("Error actualizando libro:", err);
    }
  }

  async function deleteBook(id) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBook(null);
    try {
      await deleteBookFromDB(id, user.id);
    } catch (err) {
      console.error("Error eliminando libro:", err);
    }
  }

  return (
    <div
      style={{
        backgroundColor: palette.bg,
        minHeight: "100vh",
        color: palette.ink,
        ...body,
        backgroundImage: `
          radial-gradient(at 15% 0%, rgba(122, 46, 46, 0.04) 0px, transparent 45%),
          radial-gradient(at 85% 100%, rgba(200, 146, 74, 0.05) 0px, transparent 45%),
          radial-gradient(at 50% 50%, rgba(42, 31, 26, 0.012) 0px, transparent 70%)
        `,
        backgroundAttachment: "fixed",
      }}
    >
      <style>{FONT_LINK}</style>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        input:focus, textarea:focus { border-color: ${palette.accent} !important; }
        ::selection { background: ${palette.amber}55; color: ${palette.ink}; }
        body { background-color: ${palette.bg}; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease-out; }
      `}</style>
      <Header tab={tab} setTab={setTab} count={books.length} user={user} onLogout={onLogout} />
      <main className="max-w-4xl mx-auto pb-20 fade-in">
        {loaded && tab === "library" && (
          <LibraryView books={books} onSelectBook={setSelectedBook} setTab={setTab} />
        )}
        {loaded && tab === "add" && <AddBookView onAdd={addBook} setTab={setTab} />}
        {loaded && tab === "recommend" && (
          <RecommendFlow books={books} onSelectBook={setSelectedBook} onAdd={addBook} />
        )}
        {loaded && tab === "stats" && (
          <StatsView books={books} onSelectBook={setSelectedBook} setTab={setTab} />
        )}
      </main>
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdate={updateBook}
          onDelete={deleteBook}
        />
      )}
    </div>
  );
}

// ============ ROOT ============
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    getStoredUser().then((u) => {
      setUser(u);
      setAuthLoaded(true);
    });
  }, []);

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  if (!authLoaded) {
    return (
      <div
        style={{
          backgroundColor: palette.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <style>{FONT_LINK}</style>
        <Loader2 size={24} className="animate-spin" color={palette.inkFaint} />
      </div>
    );
  }

  if (!user) return <AuthView onLogin={setUser} />;
  return <MainApp user={user} onLogout={handleLogout} />;
}

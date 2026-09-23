import { useState, useEffect, useRef, Component } from "react";
import { createPortal } from "react-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
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
  ChevronRight,
  Trash2,
  Pencil,
  Check,
  Search,
  Share2,
  TrendingUp,
  Award,
  Heart,
  PlusCircle,
  User,
  Users,
  MessageCircle,
  Send,
  Home,
  PawPrint,
  GraduationCap,
  Compass,
  Camera,
  Flame,
  Brain,
  Landmark,
  FlaskConical,
  Moon,
  Feather,
  Zap,
  FileText,
  Palette as PaletteIcon,
  PenLine,
  CheckCircle2,
  Lock,
  ChevronDown,
  BookCheck,
  Clock,
  ImagePlus,
  Bell,
  Timer,
  UserPlus,
  Link as LinkIcon,
  WifiOff,
  Download,
  Snowflake,
  ExternalLink,
  Repeat,
} from "lucide-react";
import { supabase } from "./supabase.js";
import { loginWithSupabase, registerWithSupabase, logout, getSessionUser, updateDisplayName, watchAuthProfile, ensureUserProfile } from "./services/authService.js";
import confetti from "canvas-confetti";
import { CUENTOS } from "./data/cuentos.js";
import { playBookFinished, playReadingSession } from "./sounds.js";
import { haptic, HAPTIC } from "./haptics.js";
import BookTinder from "./components/BookTinder.jsx";
import BookCoverImage from "./components/BookCoverImage.jsx";
import { PetDisplay } from "./pets/PetDisplay.jsx";
import { PetOnboarding } from "./pets/PetOnboarding.jsx";
import { PetLevelUpToast } from "./pets/PetLevelUpToast.jsx";
import { PetHub } from "./pets/PetHub.jsx";
import { AddToListSheet } from "./components/AddToListSheet.jsx";
import { ListsSection } from "./components/ListsSection.jsx";
import { ReadDateModal } from "./components/ReadDateModal.jsx";
import { DeleteAccountModal } from "./components/DeleteAccountModal.jsx";
import { TruequeMain } from "./components/trueque/TruequeMain.jsx";
import { FONT_LINK, PALETTE_LIGHT, PALETTE_DARK, palette, BRAND, SOCIAL_COLORS, STATUS_COLORS, getAvatarColor, COVER_PALETTES, HEATMAP_COLORS, STREAK_PHASES, FRIEND_STREAK_GRADIENT, WRAPPED_SLIDE_GRADIENTS, QUOTE_POSTER_GRADIENTS, display, body, ts, genrePillStyle, genreColor } from "./theme.js";
import { STATUS_LABELS, readDateLabel, cacheBooks, getCachedBooks, cacheProfile, getCachedProfile, cacheAchievements, getCachedAchievements, getPendingLogs, getPendingPosts, fetchBooks, insertBook, updateBookInDB, deleteBookFromDB } from "./services/booksService.js";
import { gemsEventBus, gemToastBus, initUserGems, loadGems, claimDailyGems } from "./services/gemsService.js";
import { petImageSrc, petBus, loadPet, updatePetName, addPetXP } from "./services/petService.js";
import { localDateStr, checkStreakOnLoad, fetchStreakData, resetMonthlyFreeze, applyStreakFreeze } from "./services/streakService.js";
import { fetchQuotes, fetchQuotesForBook, insertQuote, updateQuoteInDB, deleteQuoteFromDB, toggleQuoteFavorite, setQuotePublic } from "./services/quotesService.js";
import { getOrCreateConversation, markConversationRead, getUnreadMessagesCount, fetchFeed, fetchComments, compressAndUploadPostImage, createFeedPost, createComment, createReply, deleteFeedPost, syncPendingPosts } from "./services/socialService.js";
import { logReadingSession, syncPendingLogs } from "./services/readingService.js";
import { ACHIEVEMENT_DEFS, achievementBus, checkAchievements } from "./services/achievementsService.js";
import { enrichBook, getMoodRecommendations } from "./services/aiService.js";
import { searchGoogleBooks } from "./services/googleBooksService.js";
import { fetchCollaborativeRecommendations } from "./services/recommendationService.js";
import { MONTHS_ES, generateMonthWrap, generateAnnualWrap } from "./services/wrapsService.js";
import { devLog } from "./services/devLog.js";

// Texto seguro para interpolar en un filtro PostgREST `.or(...)`: comas, paréntesis y
// comodines escritos por el usuario romperían (o alterarían) el filtro.
function sanitizeSearchTerm(value) {
  return (value || "").replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
}

// ============ AFFILIATE ============
const BUSCALIBRE_AFFILIATE_ID = import.meta.env.VITE_BUSCALIBRE_AFFILIATE_ID || "ac4c19281310afaacacd";

const ACHIEVEMENT_ICON_MAP = {
  first_book_added: BookOpen,    first_book_read: BookmarkCheck, first_review: PenLine,
  rated_5_books: Star,           marathon_reader: TrendingUp,    speed_reader: Zap,
  explorer: Compass,             genre_master: GraduationCap,    collector_10: Library,
  collector_50: Landmark,        first_log: FileText,            sessions_30: Brain,
  pages_100: FileText,           pages_1000: Award,              pages_10000: Award,
  big_session: BookOpen,         night_owl: Moon,                streak_7: Flame,
  streak_30: Flame,              streak_90: Award,               first_comment: MessageCircle,
  comments_10: MessageCircle,    first_friend: Users,            friends_5: Users,
  first_message: Send,           top_reader: Award,              uam_book: GraduationCap,
};

const ACHIEVEMENT_CONDITION_MAP = {
  first_book_added:  "Agrega tu primer libro a la biblioteca",
  first_book_read:   "Termina tu primer libro",
  first_review:      "Escribe una reseña de al menos 10 caracteres",
  rated_5_books:     "Califica 5 libros con estrellas",
  marathon_reader:   "Lee 3 libros en un mismo mes",
  speed_reader:      "Lee 5 libros en un mismo mes",
  explorer:          "Lee libros de 3 géneros distintos",
  genre_master:      "Lee libros de 5 géneros distintos",
  collector_10:      "Agrega 10 libros a tu biblioteca",
  collector_50:      "Agrega 50 libros a tu biblioteca",
  first_log:         "Registra tu primera sesión de lectura",
  sessions_30:       "Registra 30 sesiones de lectura",
  pages_100:         "Registra 100 páginas leídas en total",
  pages_1000:        "Registra 1,000 páginas leídas en total",
  pages_10000:       "Registra 10,000 páginas leídas en total",
  big_session:       "Lee más de 100 páginas en una sola sesión",
  night_owl:         "Registra 5 sesiones después de las 10pm",
  streak_7:          "Mantén una racha de 7 días consecutivos",
  streak_30:         "Mantén una racha de 30 días consecutivos",
  streak_90:         "Mantén una racha de 90 días consecutivos",
  first_comment:     "Comenta en la publicación de un amigo",
  comments_10:       "Haz 10 comentarios en total",
  first_friend:      "Agrega tu primer amigo en Folio",
  friends_5:         "Ten 5 amigos en Folio",
  first_message:     "Envía tu primer mensaje de chat",
  top_reader:        "Lee más que todos tus amigos en un mes",
  uam_book:          "Agrega un libro de la Biblioteca UAM",
};

function isLastDayOfMonth() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return tomorrow.getMonth() !== now.getMonth();
}

// ============ CONTENT DATA ============
const BOOK_QUOTES = [
  { text: "Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.", book: "Cien años de soledad", author: "Gabriel García Márquez" },
  { text: "Todas las familias felices se parecen unas a otras; pero cada familia infeliz lo es a su manera.", book: "Ana Karenina", author: "León Tolstói" },
  { text: "Un hombre puede ser destruido pero no derrotado.", book: "El viejo y el mar", author: "Ernest Hemingway" },
  { text: "El tiempo bifurca perpetuamente hacia innumerables futuros.", book: "Ficciones", author: "Jorge Luis Borges" },
  { text: "Es una verdad universalmente reconocida que un hombre soltero, en posesión de una buena fortuna, debe estar necesitado de esposa.", book: "Orgullo y prejuicio", author: "Jane Austen" },
  { text: "Ser o no ser, esa es la cuestión.", book: "Hamlet", author: "William Shakespeare" },
  { text: "Un lector vive mil vidas antes de morir. El que nunca lee, solo vive una.", book: "Danza de dragones", author: "George R.R. Martin" },
  { text: "Los libros son espejos: solo ves en ellos lo que ya llevas dentro.", book: "La sombra del viento", author: "Carlos Ruiz Zafón" },
  { text: "El único modo de librarse de una tentación es caer en ella.", book: "El retrato de Dorian Gray", author: "Oscar Wilde" },
  { text: "Era inevitable: el olor de las almendras amargas le recordaba siempre el destino de los amores contrariados.", book: "El amor en los tiempos del cólera", author: "Gabriel García Márquez" },
  { text: "Hay que imaginar a Sísifo dichoso.", book: "El mito de Sísifo", author: "Albert Camus" },
  { text: "Clásico es un libro que todo el mundo ha leído sin haberlo leído.", book: "Por qué leer a los clásicos", author: "Italo Calvino" },
  { text: "El que lee mucho y anda mucho, ve mucho y sabe mucho.", book: "Don Quijote de la Mancha", author: "Miguel de Cervantes" },
  { text: "Si quieres ser escritor, primero que nada lee, lee, lee.", book: "Mientras escribo", author: "Stephen King" },
  { text: "Al final, solo somos los libros que hemos leído.", book: "La insoportable levedad del ser", author: "Milan Kundera" },
  { text: "Hay crímenes de pasión y crímenes de lógica. La frontera entre los dos no siempre está clara.", book: "El extranjero", author: "Albert Camus" },
  { text: "La imaginación es la única arma en la guerra contra la realidad.", book: "Alicia en el País de las Maravillas", author: "Lewis Carroll" },
  { text: "No importa lo que hagas, la clave es disfrutar de lo que haces.", book: "El alquimista", author: "Paulo Coelho" },
  { text: "La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.", book: "Don Quijote de la Mancha", author: "Miguel de Cervantes" },
  { text: "No hay peor sordo que el que no quiere leer.", book: "El nombre de la rosa", author: "Umberto Eco" },
];

const BOOK_TRIVIA = [
  "J.K. Rowling fue rechazada por 12 editoriales antes de que Bloomsbury publicara Harry Potter en 1997.",
  "Gabriel García Márquez escribió Cien años de soledad en solo 18 meses, entre 1965 y 1966.",
  "Agatha Christie es la novelista más vendida de todos los tiempos, con más de 2.000 millones de copias vendidas.",
  "Mary Shelley escribió Frankenstein a los 18 años como parte de una competencia de historias de terror con Lord Byron.",
  "El libro más largo considerado una novela es 'En busca del tiempo perdido' de Proust, con más de 1,5 millones de palabras.",
  "Victor Hugo escribió 'Los miserables' tras 17 años de trabajo, resultando en 1.900 páginas.",
  "Lewis Carroll escribió 'Alicia en el País de las Maravillas' para una niña real: Alice Liddell, hija de su colega.",
  "Dostoyevski escribió 'El jugador' en solo 26 días para saldar sus deudas de juego con el dinero del anticipo.",
  "Isabel Allende comenzó 'La casa de los espíritus' como una carta para su abuelo que estaba agonizando.",
  "Shakespeare inventó más de 1.700 palabras en inglés, incluyendo 'lonely', 'generous' y 'bedroom'.",
  "Voltaire escribía hasta 18 horas al día y consumía entre 40 y 50 tazas de café mezclado con chocolate.",
  "El primer libro impreso con tipos móviles en Europa fue la Biblia de Gutenberg, alrededor de 1455.",
  "Tolkien tardó 12 años en escribir 'El Señor de los Anillos', de 1937 a 1949.",
  "Cervantes y Shakespeare murieron el mismo día: el 23 de abril de 1616 (aunque en calendarios distintos).",
  "El original mecanografiado de 'Lo que el viento se llevó' llegó al editor en una maleta con 422 páginas.",
  "El libro más robado de las bibliotecas del mundo es 'El pequeño príncipe' de Antoine de Saint-Exupéry.",
  "Agatha Christie es la autora de ficción más vendida de todos los tiempos con más de 2,000 millones de copias.",
  "La palabra 'bibliophile' viene del griego: biblion (libro) y philos (amante). Un bibliófilo es literalmente un amante de los libros.",
  "El Guinness World Record al libro más largo del mundo lo tiene 'En busca del tiempo perdido' de Marcel Proust con más de 1.5 millones de palabras.",
  "En Japón existe el concepto 'Tsundoku': comprar libros y dejarlos sin leer, acumulándolos. Muchos lo consideran una forma de optimismo.",
  "La biblioteca más antigua del mundo sigue en funcionamiento en Fez, Marruecos. Fue fundada en el año 859 d.C.",
  "Ray Bradbury escribió 'Fahrenheit 451', una novela sobre la quema de libros, en la biblioteca pública de UCLA usando una máquina de escribir de alquiler.",
  "El libro más caro jamás vendido fue el 'Codex Leicester' de Leonardo da Vinci, comprado por Bill Gates en 1994 por 30.8 millones de dólares.",
  "En Islandia existe la tradición 'Jólabókaflóð' (inundación navideña de libros): regalar libros la noche del 24 de diciembre y leerlos esa misma noche.",
  "Stephen King escribe 2,000 palabras diarias, todos los días del año, incluyendo su cumpleaños y días festivos.",
];

const UAM_CATALOG = [
  // Ingeniería
  { id: "uam-1",  title: "Introducción a los algoritmos",                    author: "Thomas H. Cormen",        area: "Ingeniería",  edition: "3ª ed.", year: 2009 },
  { id: "uam-2",  title: "Redes de computadoras",                            author: "Andrew S. Tanenbaum",     area: "Ingeniería",  edition: "5ª ed.", year: 2012 },
  { id: "uam-3",  title: "Sistemas operativos modernos",                     author: "Andrew S. Tanenbaum",     area: "Ingeniería",  edition: "4ª ed.", year: 2015 },
  { id: "uam-4",  title: "Cálculo: trascendentes tempranas",                 author: "James Stewart",            area: "Ingeniería",  edition: "8ª ed.", year: 2016 },
  { id: "uam-5",  title: "Álgebra lineal y sus aplicaciones",                author: "Gilbert Strang",           area: "Ingeniería",  edition: "4ª ed.", year: 2009 },
  { id: "uam-6",  title: "Fundamentos de sistemas digitales",                author: "Thomas L. Floyd",          area: "Ingeniería",  edition: "9ª ed.", year: 2006 },
  { id: "uam-7",  title: "Probabilidad y estadística para ingeniería",       author: "Jay L. Devore",            area: "Ingeniería",  edition: "9ª ed.", year: 2016 },
  // Ciencias
  { id: "uam-8",  title: "El origen de las especies",                        author: "Charles Darwin",           area: "Ciencias",    edition: "Clásicos", year: 1859 },
  { id: "uam-9",  title: "Una breve historia del tiempo",                    author: "Stephen Hawking",          area: "Ciencias",    edition: "Ed. actualizada", year: 1998 },
  { id: "uam-10", title: "Química orgánica",                                 author: "Paula Y. Bruice",          area: "Ciencias",    edition: "7ª ed.", year: 2014 },
  { id: "uam-11", title: "Biología celular y molecular",                     author: "Harvey Lodish",            area: "Ciencias",    edition: "8ª ed.", year: 2016 },
  { id: "uam-12", title: "Física universitaria Vol. I",                      author: "Young & Freedman",         area: "Ciencias",    edition: "14ª ed.", year: 2018 },
  { id: "uam-13", title: "El gen: una historia íntima",                      author: "Siddhartha Mukherjee",    area: "Ciencias",    edition: "1ª ed.", year: 2016 },
  { id: "uam-14", title: "La vida tal como es: la biología desde dentro",    author: "Francis Crick",            area: "Ciencias",    edition: "Ed. Salvat", year: 1982 },
  // Literatura
  { id: "uam-15", title: "Cien años de soledad",                             author: "Gabriel García Márquez",  area: "Literatura",  edition: "Ed. conmemorativa", year: 2007 },
  { id: "uam-16", title: "El proceso",                                       author: "Franz Kafka",              area: "Literatura",  edition: "Ed. revisada", year: 1925 },
  { id: "uam-17", title: "Crimen y castigo",                                 author: "Fiódor Dostoievski",      area: "Literatura",  edition: "Ed. Cátedra", year: 1866 },
  { id: "uam-18", title: "Pedro Páramo",                                     author: "Juan Rulfo",               area: "Literatura",  edition: "Ed. aniversario", year: 1955 },
  { id: "uam-19", title: "Matar un ruiseñor",                                author: "Harper Lee",               area: "Literatura",  edition: "Ed. revisada", year: 1960 },
  { id: "uam-20", title: "El señor de los anillos",                          author: "J.R.R. Tolkien",          area: "Literatura",  edition: "Ed. ilustrada", year: 1954 },
  { id: "uam-21", title: "La hojarasca",                                     author: "Gabriel García Márquez",  area: "Literatura",  edition: "1ª ed.", year: 1955 },
  // Filosofía
  { id: "uam-22", title: "La república",                                     author: "Platón",                   area: "Filosofía",   edition: "Ed. Gredos", year: -380 },
  { id: "uam-23", title: "Crítica de la razón pura",                         author: "Immanuel Kant",            area: "Filosofía",   edition: "Ed. revisada", year: 1781 },
  { id: "uam-24", title: "El ser y la nada",                                 author: "Jean-Paul Sartre",         area: "Filosofía",   edition: "Ed. Losada", year: 1943 },
  { id: "uam-25", title: "Meditaciones",                                     author: "Marco Aurelio",            area: "Filosofía",   edition: "Ed. Gredos", year: 180 },
  { id: "uam-26", title: "El nacimiento de la tragedia",                     author: "Friedrich Nietzsche",      area: "Filosofía",   edition: "Ed. revisada", year: 1872 },
  { id: "uam-27", title: "Así habló Zaratustra",                             author: "Friedrich Nietzsche",      area: "Filosofía",   edition: "Ed. Alianza", year: 1883 },
  // Historia
  { id: "uam-28", title: "Sapiens: de animales a dioses",                    author: "Yuval Noah Harari",       area: "Historia",    edition: "1ª ed.", year: 2011 },
  { id: "uam-29", title: "El otoño de la Edad Media",                        author: "Johan Huizinga",           area: "Historia",    edition: "Ed. Alianza", year: 1919 },
  { id: "uam-30", title: "Los orígenes del totalitarismo",                   author: "Hannah Arendt",            area: "Historia",    edition: "Ed. Alianza", year: 1951 },
  { id: "uam-31", title: "Breve historia de México",                         author: "Enrique Krauze",           area: "Historia",    edition: "Ed. actualizada", year: 1994 },
  { id: "uam-32", title: "La conquista de México",                           author: "Hugh Thomas",              area: "Historia",    edition: "Ed. Planeta", year: 1993 },
  // Arte
  { id: "uam-33", title: "La historia del arte",                             author: "Ernst H. Gombrich",       area: "Arte",        edition: "Ed. de bolsillo", year: 1950 },
  { id: "uam-34", title: "Modos de ver",                                     author: "John Berger",              area: "Arte",        edition: "1ª ed.", year: 1972 },
  { id: "uam-35", title: "El pensamiento lateral",                           author: "Edward de Bono",           area: "Arte",        edition: "Ed. revisada", year: 1970 },
  { id: "uam-36", title: "Historia del arte moderno",                        author: "Herbert Read",             area: "Arte",        edition: "Ed. Destino", year: 1994 },
];

function LoadingEntertainment({ label = "Cargando…" }) {
  const [mode] = useState(() => Math.random() < 0.5 ? "quotes" : "trivia");
  const items = mode === "quotes" ? BOOK_QUOTES : BOOK_TRIVIA;
  const [index, setIndex] = useState(() => Math.floor(Math.random() * items.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % items.length);
        setVisible(true);
      }, 300);
    }, 6000);
    return () => clearInterval(iv);
  }, [items.length]);

  const item = items[index];

  return (
    <div className="text-center py-14 px-4">
      <Loader2 size={28} className="mx-auto animate-spin mb-5" color={palette.accent} />
      <p style={{ ...display, color: palette.inkFaint, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "1.5rem" }}>
        {label}
      </p>
      <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.28s ease", maxWidth: 380, margin: "0 auto" }}>
        {mode === "quotes" ? (
          <div>
            <p style={{ ...display, fontStyle: "italic", fontSize: "1.05rem", color: palette.ink, lineHeight: 1.55, marginBottom: "0.8rem" }}>
              "{item.text}"
            </p>
            <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft }}>
              — {item.author}
            </p>
            <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, fontStyle: "italic" }}>
              {item.book}
            </p>
          </div>
        ) : (
          <div style={{ padding: "1rem 1.1rem", borderRadius: "10px", backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, textAlign: "left" }}>
            <p style={{ ...display, fontSize: "0.75rem", fontWeight: 600, color: palette.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>¿Sabías que…?</p>
            <p style={{ ...body, color: palette.ink, fontSize: "0.95rem", lineHeight: 1.55 }}>{item}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ AUTH ============
// La autenticación vive en src/services/authService.js (Supabase Auth).
// La sesión la maneja Supabase; public.users es la tabla de PERFIL (id = auth.uid()).

// ============ ONLINE STATUS HOOK ============
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return isOnline;
}

function canShowInviteCard() {
  const last = localStorage.getItem("folio_invite_peak_date");
  return last !== new Date().toISOString().slice(0, 10);
}
function markInviteCardShown() {
  localStorage.setItem("folio_invite_peak_date", new Date().toISOString().slice(0, 10));
}

// ============ HELPERS ============
const STATUS_META = {
  reading: { label: STATUS_LABELS.reading, icon: BookOpen, color: STATUS_COLORS.reading },
  want_to_read: { label: STATUS_LABELS.want_to_read, icon: Bookmark, color: STATUS_COLORS.want_to_read },
  wish: { label: STATUS_LABELS.wish, icon: Heart, color: STATUS_COLORS.wish },
  read: { label: STATUS_LABELS.read, icon: BookmarkCheck, color: STATUS_COLORS.read },
};

// ============ COMPONENTS ============

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
        backgroundColor: meta.color + "1E",
        color: meta.color,
        border: `1px solid ${meta.color}35`,
        ...display,
        fontWeight: 600,
        letterSpacing: "0.03em",
      }}
    >
      <Icon size={10} strokeWidth={2.5} />
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
            fill={n <= value ? palette.amberRich : "transparent"}
            color={n <= value ? palette.amberRich : palette.border}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function QuickRatingModal({ currentRating, onSave, onSkip }) {
  const [rating, setRating] = useState(currentRating || 0);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(42,31,26,0.5)" }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-6 text-center"
        style={{
          backgroundColor: palette.bgCard,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 12px 40px rgba(42,31,26,0.22)",
        }}
      >
        <p
          style={{
            ...display,
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: palette.amber,
            fontWeight: 600,
            marginBottom: "0.4rem",
          }}
        >
          ¡Libro terminado!
        </p>
        <h3
          style={{
            ...display,
            fontStyle: "italic",
            fontSize: "1.25rem",
            color: palette.ink,
            marginBottom: "1.25rem",
            lineHeight: 1.2,
          }}
        >
          ¿Cómo lo calificarías?
        </h3>
        <div className="flex justify-center mb-5">
          <StarRating value={rating} onChange={setRating} size={34} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-full transition-all hover:opacity-70"
            style={{
              ...display,
              fontSize: "0.9rem",
              color: palette.inkSoft,
              border: `1px solid ${palette.border}`,
            }}
          >
            Saltar
          </button>
          <button
            onClick={() => onSave(rating)}
            className="flex-1 py-2.5 rounded-full transition-all hover:scale-[1.02]"
            style={{
              ...display,
              fontSize: "0.9rem",
              fontWeight: 500,
              backgroundColor: palette.ink,
              color: palette.bg,
            }}
          >
            {rating > 0 ? "Guardar" : "Sin calificación"}
          </button>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "explorar", label: "Explorar", icon: Compass },
  { id: "mascota", label: "Mascota", icon: PawPrint },
  { id: "social", label: "Social", icon: MessageCircle },
  { id: "trueque", label: "Trueque", icon: Repeat },
  { id: "perfil", label: "Perfil", icon: User },
];

const MOOD_OPTIONS = [
  { key: "inspirador", label: "🔥 Inspirador" },
  { key: "dolor_bonito", label: "💔 Dolor bonito" },
  { key: "mente_expandida", label: "🧠 Mente expandida" },
  { key: "gracioso", label: "😂 Gracioso" },
  { key: "poetico", label: "🌅 Poético" },
  { key: "motivador", label: "💪 Motivador" },
];

function SubTabBar({ tabs, active, onChange }) {
  return (
    <div
      className="flex scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
      style={{ borderBottom: `1px solid ${palette.border}`, marginBottom: "1.25rem", overflowX: "auto" }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            ...display,
            padding: "0.6rem 1.1rem",
            fontSize: "0.88rem",
            fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? palette.accent : palette.inkSoft,
            backgroundColor: "transparent",
            border: "none",
            borderBottom: `2px solid ${active === t.id ? palette.accent : "transparent"}`,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginBottom: "-1px",
            transition: "color 150ms ease, border-color 150ms ease",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function AppHeader({ tab, setTab, pendingCount, unreadMessages, unreadNotifs, onOpenNotifs, gemBalance, onOpenPet }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-sm" style={{ backgroundColor: palette.bg + "F0", borderBottom: `1px solid ${palette.border}`, paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6" style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          aria-label="Folio"
          style={{
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: "2rem",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: palette.bg === PALETTE_DARK.bg ? palette.ink : palette.accentSoft,
            userSelect: "none",
          }}
        >f</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "3px 10px 3px 8px", fontFamily: "system-ui, sans-serif", fontSize: "0.82rem", fontWeight: 600, color: palette.amber }}>
            💎 {gemBalance ?? 0}
          </span>
          <button
            onClick={onOpenNotifs}
            aria-label="Notificaciones"
            className="bell-btn"
            style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Bell size={22} color={palette.inkSoft} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, backgroundColor: palette.badge, color: palette.onAccent, borderRadius: "999px", fontSize: "0.55rem", fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", fontFamily: "system-ui, sans-serif" }}>
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>
      {/* Desktop nav */}
      <div className="hidden sm:block" style={{ borderTop: `1px solid ${palette.borderSoft}` }}>
        <div className="max-w-4xl mx-auto" style={{ display: "flex", gap: "0.4rem", padding: "0.35rem 1.5rem" }}>
          {NAV_ITEMS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const isAdd = t.id === "add";
            const badge = t.id === "social" ? pendingCount + unreadMessages : 0;
            return (
              <button
                key={t.id}
                onClick={() => { if (t.id === "mascota" && onOpenPet) { onOpenPet(); } else { setTab(t.id); } }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.4rem 1rem", borderRadius: "999px",
                  border: `1px solid ${active ? (isAdd ? palette.accent + "55" : palette.accent + "55") : "transparent"}`,
                  backgroundColor: active ? (isAdd ? palette.accent : palette.accent) : "transparent",
                  color: active ? palette.onAccent : palette.inkSoft,
                  cursor: "pointer", ...display, fontSize: "0.85rem", fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && (
                    <span style={{ position: "absolute", top: -5, right: -7, backgroundColor: palette.badge, color: palette.onAccent, borderRadius: "999px", fontSize: "0.5rem", fontWeight: 700, minWidth: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px", fontFamily: "system-ui, sans-serif" }}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(to right, ${BRAND.wine}, ${BRAND.amber}55, transparent)` }} />
    </header>
  );
}

function BottomNav({ tab, setTab, pendingCount, unreadMessages, pet, onOpenPet }) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center"
      style={{
        backgroundColor: palette.bgCard + "F5",
        borderTop: `1px solid ${palette.border}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {NAV_ITEMS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        const isCenter = t.id === "mascota";
        const badge = t.id === "social" ? pendingCount + unreadMessages : 0;
        return (
          <button
            key={t.id}
            data-tutorial={`nav-${t.id}`}
            onClick={() => { haptic(HAPTIC.NAV); if (isCenter && onOpenPet) { onOpenPet(); } else { setTab(t.id); } }}
            className={`flex-1 flex flex-col items-center justify-center py-1.5${isCenter ? " nav-add-btn" : ""}`}
            style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", minHeight: 54 }}
          >
            {isCenter ? (
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: BRAND.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(122, 46, 46, 0.4)",
                marginBottom: 1, overflow: "hidden",
              }}>
                {pet ? (
                  <img src={petImageSrc(pet.pet_type)} alt="" className="pet-sprite-img" style={{ width: 42, height: 42, objectFit: "contain", display: "block" }} />
                ) : (
                  <PawPrint size={24} color={palette.onAccent} strokeWidth={2.5} />
                )}
              </div>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "5px 8px",
                borderRadius: "999px",
                backgroundColor: active ? `${palette.accent}18` : "transparent",
                transition: "background-color 200ms ease",
              }}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} color={active ? palette.accent : palette.inkFaint} style={{ transition: "color 200ms ease" }} />
                  {badge > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -6, backgroundColor: palette.badge, color: palette.onAccent, borderRadius: "999px", fontSize: "0.5rem", fontWeight: 700, minWidth: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px", fontFamily: "system-ui, sans-serif" }}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "Fraunces, serif", fontSize: "11px", fontWeight: active ? 700 : 500, lineHeight: 1, color: active ? palette.accent : palette.inkFaint, transition: "color 200ms ease" }}>{t.label}</span>
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function BookCard({ book, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left book-list-card"
      style={{
        backgroundColor: palette.bgCard,
        border: `1px solid ${palette.borderSoft}`,
        borderRadius: "8px",
        padding: "1rem",
        boxShadow: "0 1px 3px rgba(42,31,26,0.06)",
      }}
    >
      <div className="flex gap-4">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="object-cover rounded-sm flex-shrink-0"
            style={{ width: 60, height: 86, boxShadow: "0 2px 10px rgba(42,31,26,0.22)" }}
          />
        ) : (
          <BookCoverPlaceholder title={book.title} author={book.author} width={60} height={86} />
        )}
        <div className="flex-1 min-w-0">
          <h3
            style={{
              ...ts.h3,
              color: palette.ink,
              marginBottom: "0.3rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {book.title}
          </h3>
          <p
            style={{ ...ts.caption, marginBottom: "0.6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {book.author}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <StatusBadge status={book.status} />
            {book.genre && (
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "12px", fontWeight: 400, color: palette.inkSoft, padding: "0.1rem 0.5rem", borderRadius: "999px", border: `1px solid ${palette.border}`, backgroundColor: "transparent" }}>
                {book.genre}
              </span>
            )}
            {book.rating > 0 && <StarRating value={book.rating} size={12} readOnly />}
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

function LibraryView({ books, onSelectBook, setTab, isOnline = true }) {
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
    if (!isOnline) {
      return (
        <div className="text-center py-20 px-6">
          <WifiOff size={36} color={palette.border} style={{ margin: "0 auto 1rem", display: "block" }} />
          <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.3rem", color: palette.ink, marginBottom: "0.5rem" }}>
            Sin conexión
          </h2>
          <p style={{ ...body, color: palette.inkSoft, fontSize: "0.95rem", maxWidth: 340, margin: "0 auto" }}>
            Necesitas conexión la primera vez para cargar tus libros. Una vez cargados, estarán disponibles sin internet.
          </p>
        </div>
      );
    }
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
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "14px",
                fontWeight: active ? 600 : 400,
                backgroundColor: active ? palette.accent : palette.bgSoft,
                color: active ? palette.onAccent : palette.inkSoft,
                border: `1px solid ${active ? palette.accent : palette.borderSoft}`,
                minHeight: 34,
                cursor: "pointer",
              }}
            >
              {f.label} <span style={{ opacity: active ? 0.75 : 0.55 }}>· {count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14">
          {!search && (
            <div style={{
              fontFamily: "Fraunces, serif", fontSize: "6rem", fontStyle: "italic", fontWeight: 700, lineHeight: 1,
              color: palette.accent + "22", marginBottom: "0.5rem", userSelect: "none",
            }}>
              {filter === "reading" ? "L" : filter === "read" ? "✓" : filter === "want_to_read" ? "☆" : "?"}
            </div>
          )}
          <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft }}>
            {search ? `No encontré libros que coincidan con "${search}"` : "No hay libros en este estado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} onClick={() => onSelectBook(book)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ SEARCH BOOK MODAL ============

function SearchBookModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [pickedStatus, setPickedStatus] = useState("want_to_read");
  const [buscalibreMap, setBuscalibreMap] = useState({});
  const inputRef = useRef(null);
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ol_recent_searches") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (isOpen) {
      setQuery(""); setResults([]); setError(""); setSelectedBook(null); setPickedStatus("want_to_read"); setBuscalibreMap({});
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); setLoading(false); return; }
    devLog('[SearchBookModal] buscando:', query.trim());
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const res = await searchGoogleBooks(query.trim());
        devLog('[SearchBookModal] resultados:', res?.length, res);
        setResults(res);
      } catch (err) {
        console.error('[SearchBookModal] error:', err);
        setError("No se puede conectar a la búsqueda. Intenta de nuevo.");
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!results.length) { setBuscalibreMap({}); return; }
    const isbns = results.map(r => r.isbn).filter(Boolean);
    if (!isbns.length) return;
    let cancelled = false;
    Promise.all(
      isbns.map(isbn =>
        fetch(`/api/buscalibre-check?isbn=${encodeURIComponent(isbn)}`)
          .then(r => r.json())
          .then(d => ({ isbn, available: d.available === true }))
          .catch(() => ({ isbn, available: false }))
      )
    ).then(checks => {
      if (cancelled) return;
      const map = {};
      checks.forEach(({ isbn, available }) => { map[isbn] = available; });
      setBuscalibreMap(map);
    });
    return () => { cancelled = true; };
  }, [results]);

  function saveRecent(q) {
    const next = [q, ...recents.filter(r => r !== q)].slice(0, 5);
    setRecents(next);
    localStorage.setItem("ol_recent_searches", JSON.stringify(next));
  }

  function handleSave() {
    if (!selectedBook) return;
    if (query.trim()) saveRecent(query.trim());
    onSelect({ ...selectedBook, status: pickedStatus });
  }

  if (!isOpen) return null;

  // Phase 2 — Status picker (portal to body)
  if (selectedBook) {
    return createPortal(
      <div
        style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={(e) => e.target === e.currentTarget && setSelectedBook(null)}
      >
        <div className="scrollbar-hide" style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem 2.5rem", width: "100%", maxWidth: 480 }}>
          <div style={{ display: "flex", gap: "0.85rem", marginBottom: "1.5rem", alignItems: "center" }}>
            {selectedBook.coverUrl ? (
              <img src={selectedBook.coverUrl} alt="" style={{ width: 50, height: 75, objectFit: "cover", borderRadius: 4, flexShrink: 0, backgroundColor: palette.bgSoft }} />
            ) : (
              <BookCoverPlaceholder title={selectedBook.title} author={selectedBook.author} width={50} height={75} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...ts.h3, color: palette.ink, marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedBook.title}</p>
              <p style={{ ...ts.caption }}>{selectedBook.author}{selectedBook.year ? ` · ${selectedBook.year}` : ""}</p>
            </div>
          </div>
          <p style={{ ...ts.caption, marginBottom: "0.65rem" }}>¿En qué estado?</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {[
              { id: "reading",      label: "Leyendo" },
              { id: "want_to_read", label: "Por leer" },
              { id: "wish",         label: "Quiero leer" },
              { id: "read",         label: "Leído" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setPickedStatus(id)} style={{ padding: "0.5rem 1.1rem", borderRadius: "999px", border: `1.5px solid ${pickedStatus === id ? palette.accent : palette.border}`, backgroundColor: pickedStatus === id ? palette.accent : palette.bgCard, color: pickedStatus === id ? palette.onAccent : palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", fontWeight: pickedStatus === id ? 600 : 400, cursor: "pointer", transition: "all 0.12s" }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={handleSave} style={{ width: "100%", padding: "0.85rem", borderRadius: "999px", backgroundColor: palette.ink, color: palette.bg, border: "none", fontFamily: "Fraunces, serif", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
            Guardar libro
          </button>
          <button onClick={() => setSelectedBook(null)} style={{ width: "100%", marginTop: "0.65rem", padding: "0.6rem", background: "none", border: "none", color: palette.inkFaint, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", cursor: "pointer" }}>
            Volver a resultados
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Phase 1 — Search (portal to body, escaping all stacking contexts)
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: palette.bg, display: "flex", flexDirection: "column", paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      {/* Search header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.65rem", padding: "12px 16px", borderBottom: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bg }}>
        <button onClick={() => onClose()} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>
          <X size={20} color={palette.inkSoft} />
        </button>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={15} color={palette.inkFaint} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por título, autor o ISBN..."
            style={{ width: "100%", padding: "0.65rem 2.2rem 0.65rem 2.2rem", backgroundColor: palette.bgSoft, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", fontFamily: "'EB Garamond', serif", fontSize: "16px", color: palette.ink, outline: "none", boxSizing: "border-box" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "0.1rem", display: "flex" }}>
              <X size={13} color={palette.inkFaint} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scrollbar-hide" style={{ flex: 1, overflowY: "auto", paddingBottom: "100px" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "2.5rem 0" }}>
            <Loader2 size={20} className="animate-spin" color={palette.inkFaint} />
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
            <p style={{ ...ts.body15, color: palette.accent, marginBottom: "0.75rem" }}>{error}</p>
            <button onClick={() => { setError(""); const q = query; setQuery(""); setTimeout(() => setQuery(q), 50); }} style={{ ...ts.caption, color: palette.inkSoft, background: "none", border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "0.4rem 1rem", cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && !query.trim() && recents.length > 0 && (
          <div>
            <p style={{ ...ts.caption, padding: "0.85rem 1rem 0.4rem" }}>Recientes</p>
            {recents.map((r) => (
              <button key={r} onClick={() => setQuery(r)} style={{ display: "flex", alignItems: "center", gap: "0.65rem", width: "100%", padding: "0.7rem 1rem", background: "none", border: "none", borderBottom: `1px solid ${palette.borderSoft}`, cursor: "pointer", textAlign: "left" }}>
                <Clock size={14} color={palette.inkFaint} />
                <span style={{ ...ts.body15, color: palette.inkSoft }}>{r}</span>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div>
            {[...results]
              .sort((a, b) => {
                const aOk = a.isbn && buscalibreMap[a.isbn];
                const bOk = b.isbn && buscalibreMap[b.isbn];
                return (aOk ? 0 : 1) - (bOk ? 0 : 1);
              })
              .map((book, i) => {
                const inBuscalibre = book.isbn && buscalibreMap[book.isbn];
                return (
                  <button
                    key={book.olKey || i}
                    onClick={() => setSelectedBook(book)}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", padding: "0.75rem 1rem", background: "none", border: "none", borderBottom: `1px solid ${palette.borderSoft}`, cursor: "pointer", textAlign: "left", transition: "background-color 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = palette.bgSoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" style={{ width: 50, height: 75, objectFit: "cover", borderRadius: 4, flexShrink: 0, backgroundColor: palette.bgSoft }} loading="lazy" />
                    ) : (
                      <BookCoverPlaceholder title={book.title} author={book.author} width={50} height={75} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "15px", fontWeight: 600, color: palette.ink, marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
                      <p style={{ ...ts.caption, marginBottom: book.year ? "0.15rem" : 0 }}>{book.author}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                        {book.year && <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "11px", color: palette.inkFaint }}>{book.year}</span>}
                        {inBuscalibre && (
                          <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "10px", fontWeight: 600, color: palette.success, backgroundColor: palette.bgSoft, borderRadius: "4px", padding: "1px 5px", lineHeight: 1.4 }}>
                            ✓ Buscalibre
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={15} color={palette.inkFaint} style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
          </div>
        )}

        {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <p style={{ ...ts.h2, color: palette.inkSoft, fontStyle: "italic", marginBottom: "0.5rem" }}>Sin resultados</p>
            <p style={{ ...ts.body15, color: palette.inkFaint }}>Prueba con otro título o autor</p>
          </div>
        )}

        {!loading && (results.length > 0 || (query.trim().length >= 2 && !error)) && (
          <div style={{ padding: "1.5rem 1rem 1rem", textAlign: "center", borderTop: results.length > 0 ? `1px solid ${palette.borderSoft}` : "none" }}>
            <p style={{ ...ts.caption, marginBottom: "0.4rem" }}>¿No encuentras el libro?</p>
            <button
              onClick={() => onClose("manual")}
              style={{ ...ts.caption, color: palette.accent, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
            >
              Agregar manualmente →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function AddBookView({ onAdd, setTab }) {
  const [mode, setMode] = useState("search");
  const [error, setError] = useState("");
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
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
    setMode("search");
    setForm({ title: "", author: "", status: "want_to_read", genre: "", summary: "", moodTags: [], coverUrl: null, rating: 0 });
    setError("");
    setTab("perfil");
  }

  function handleSearchSelect(book) {
    onAdd({
      id: crypto.randomUUID(),
      title: book.title,
      author: book.author,
      status: book.status,
      genre: book.genre || "",
      summary: book.summary || "",
      moodTags: [],
      coverUrl: book.coverUrl || null,
      rating: 0,
      review: "",
      addedAt: Date.now(),
      year: book.year || null,
      isbn: book.isbn || null,
    });
    setMode("search");
    setTab("perfil");
  }

  // Search modal (primary mode — fullscreen overlay above header)
  if (mode === "search") {
    return (
      <SearchBookModal
        isOpen={true}
        onClose={(fallback) => fallback === "manual" ? setMode("manual") : setMode(null)}
        onSelect={handleSearchSelect}
      />
    );
  }

  // Fallback landing (mode=null — reached by closing search modal)
  if (mode === null) {
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
        <button onClick={() => setMode("search")} className="flex items-center gap-1 mb-5" style={{ ...ts.caption, color: palette.inkSoft }}>
          <ChevronLeft size={15} /> Volver a búsqueda
        </button>
        <h2 style={{ ...ts.h1, color: palette.ink, marginBottom: "1.25rem" }}>Otras opciones</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button onClick={() => setMode("manual")} className="text-left p-5 rounded-xl transition-all hover:-translate-y-0.5" style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}>
            <Pencil size={22} color={palette.inkSoft} strokeWidth={1.8} />
            <h3 style={{ ...ts.h3, color: palette.ink, marginTop: "0.55rem" }}>Manual</h3>
            <p style={{ ...ts.caption, marginTop: "0.2rem" }}>Escribe título y autor a mano</p>
          </button>
        </div>
      </div>
    );
  }

  // manual mode
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto">
      <button
        onClick={() => setMode("search")}
        className="flex items-center gap-1 mb-4"
        style={{ ...display, color: palette.inkSoft, fontSize: "0.9rem" }}
      >
        <ChevronLeft size={16} /> Atrás
      </button>
      <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.5rem", color: palette.ink, marginBottom: "1rem" }}>
        Agregar manualmente
      </h2>
      <BookForm form={form} setForm={setForm} onReadSelected={() => setShowRatingPrompt(true)} />
      {error && <p style={{ ...body, color: palette.accent, fontSize: "0.9rem", marginTop: "0.5rem" }}>{error}</p>}
      <button
        onClick={handleSave}
        className="w-full mt-4 py-3 rounded-full transition-all hover:scale-[1.01]"
        style={{ ...display, fontWeight: 500, backgroundColor: palette.ink, color: palette.bg }}
      >
        Guardar libro
      </button>
      {showRatingPrompt && (
        <QuickRatingModal
          currentRating={form.rating}
          onSave={(r) => { setForm((prev) => ({ ...prev, rating: r })); setShowRatingPrompt(false); }}
          onSkip={() => setShowRatingPrompt(false)}
        />
      )}
    </div>
  );
}

function BookForm({ form, setForm, onReadSelected }) {
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState("");

  const inputStyle = {
    ...body,
    width: "100%",
    padding: "12px 16px",
    backgroundColor: palette.bgCard,
    border: `1.5px solid ${palette.border}`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    color: palette.inkFaint,
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
      setEnrichError(e.message || "No pude buscar la info. Intenta de nuevo.");
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
                onClick={() => {
                  setForm({ ...form, status: id });
                  if (id === "read" && form.status !== "read" && onReadSelected) onReadSelected();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                style={{
                  ...display,
                  fontSize: "0.88rem",
                  fontWeight: active ? 600 : 400,
                  backgroundColor: active ? meta.color : "transparent",
                  color: active ? palette.onAccent : palette.inkSoft,
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

function BookDetailModal({ book, onClose, onUpdate, onDelete, userId, onSaveQuote }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(book);
  const [shareMsg, setShareMsg] = useState("");
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [isAvailableInBuscalibre, setIsAvailableInBuscalibre] = useState(false);
  const [buscalibreIsbn, setBuscalibreIsbn] = useState(null);
  const [bookQuotes, setBookQuotes] = useState([]);
  const [showAddToList, setShowAddToList] = useState(false);

  useEffect(() => setDraft(book), [book]);

  useEffect(() => {
    if (!userId || !book?.id) return;
    fetchQuotesForBook(userId, book.id).then(setBookQuotes).catch((err) => console.error("[quotes] no se pudieron cargar las frases del libro:", err));
  }, [userId, book?.id]);

  useEffect(() => {
    if (!book?.id) return;
    let cancelled = false;
    setIsAvailableInBuscalibre(false);
    setBuscalibreIsbn(null);

    async function check() {
      devLog('[Buscalibre] check() START — book.id:', book?.id, 'book.isbn:', book?.isbn);

      // Build candidate ISBNs: book.isbn first, then from Google Books (skipping nulls)
      const candidates = [];
      if (book.isbn) candidates.push(book.isbn);

      try {
        const hits = await searchGoogleBooks(`${book.title} ${book.author}`);
        devLog('[Buscalibre] Google Books hits:', hits.length, '— ISBNs:', hits.map(h => h.isbn));
        hits.forEach(h => { if (h.isbn && !candidates.includes(h.isbn)) candidates.push(h.isbn); });
      } catch (e) {
        console.warn('[Buscalibre] Google Books fallback failed:', e);
      }

      devLog('[Buscalibre] candidates:', candidates);

      if (!candidates.length || cancelled) {
        devLog('[Buscalibre] No ISBN candidates found, aborting.');
        return;
      }

      for (const isbn of candidates.slice(0, 4)) {
        if (cancelled) return;
        try {
          devLog('[Buscalibre] Checking ISBN:', isbn);
          const r = await fetch(`/api/buscalibre-check?isbn=${encodeURIComponent(isbn)}`);
          const d = await r.json();
          devLog('[Buscalibre] Response for', isbn, ':', d);
          if (d.available === true) {
            if (!cancelled) {
              devLog('[Buscalibre] AVAILABLE — setting state, isbn:', isbn);
              setIsAvailableInBuscalibre(true);
              setBuscalibreIsbn(isbn);
            }
            return;
          }
        } catch (e) {
          console.warn('[Buscalibre] fetch error for isbn', isbn, ':', e);
        }
      }

      devLog('[Buscalibre] No available ISBN found after checking all candidates.');
      if (!cancelled) setIsAvailableInBuscalibre(false);
    }

    check();
    return () => { cancelled = true; };
  }, [book?.id]);

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
      style={{ backgroundColor: "rgba(42,31,26,0.5)", animation: "backdropIn 200ms ease-out" }}
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
                    {readDateLabel(book) && (
                      <span style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, fontStyle: "italic" }}>
                        {readDateLabel(book)}
                      </span>
                    )}
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
                <BookForm form={draft} setForm={setDraft} onReadSelected={() => setShowRatingPrompt(true)} />
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
                    color: palette.inkFaint,
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
                    color: palette.inkFaint,
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
              {isAvailableInBuscalibre && buscalibreIsbn && (
                <div style={{ marginTop: "1rem" }}>
                  <a
                    href={`https://www.buscalibre.com.mx/libros/isbn/${buscalibreIsbn}?afiliado=${BUSCALIBRE_AFFILIATE_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      width: "100%",
                      padding: "0.65rem 1rem",
                      borderRadius: "8px",
                      border: `1px solid ${palette.border}`,
                      backgroundColor: palette.bgCard,
                      color: palette.inkSoft,
                      textDecoration: "none",
                      ...body,
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      boxSizing: "border-box",
                    }}
                  >
                    <ExternalLink size={14} />
                    Comprar en Buscalibre
                  </a>
                </div>
              )}

              {userId && (
                <div style={{ marginTop: "1rem" }}>
                  <button
                    onClick={() => setShowAddToList(true)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                      width: "100%", padding: "0.65rem 1rem", borderRadius: "8px",
                      border: `1px solid ${palette.border}`, backgroundColor: palette.bgCard,
                      color: palette.inkSoft, cursor: "pointer",
                      ...body, fontSize: "0.88rem", fontWeight: 500, boxSizing: "border-box",
                    }}
                  >
                    <Bookmark size={14} />
                    Agregar a lista
                  </button>
                </div>
              )}

              {userId && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.1rem", borderTop: `1px solid ${palette.borderSoft}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <h3 style={{ ...display, fontSize: "0.9rem", fontWeight: 600, color: palette.ink }}>Frases guardadas</h3>
                    {onSaveQuote && (
                      <button
                        onClick={onSaveQuote}
                        style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: palette.accent, backgroundColor: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem", padding: "2px 0" }}
                      >
                        <Plus size={12} /> Añadir
                      </button>
                    )}
                  </div>
                  {bookQuotes.length === 0 ? (
                    <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, fontStyle: "italic" }}>
                      No has guardado frases de este libro todavía
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {bookQuotes.slice(0, 3).map(q => (
                        <div key={q.id} style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "8px", padding: "0.65rem 0.85rem 0.65rem 1.1rem", position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", top: 2, left: 6, fontFamily: "Georgia, serif", fontSize: "1.8rem", lineHeight: 1, color: palette.accent + "20", userSelect: "none" }}>"</div>
                          <p style={{ ...body, fontSize: "0.9rem", fontStyle: "italic", color: palette.ink, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {q.text}
                          </p>
                        </div>
                      ))}
                      {bookQuotes.length > 3 && (
                        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.75rem", color: palette.inkFaint, textAlign: "center", marginTop: "0.1rem" }}>
                          +{bookQuotes.length - 3} más en Mis Frases
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showRatingPrompt && (
        <QuickRatingModal
          currentRating={draft.rating}
          onSave={(r) => {
            const updated = { ...draft, rating: r };
            setDraft(updated);
            onUpdate(updated);
            setShowRatingPrompt(false);
          }}
          onSkip={() => setShowRatingPrompt(false)}
        />
      )}
      {showAddToList && userId && (
        <AddToListSheet userId={userId} bookId={book.id} onClose={() => setShowAddToList(false)} />
      )}
    </div>
  );
}

// Recomendaciones colaborativas (Matrix Factorization / SVD híbrido).
// Vive por separado de RecommendFlow (el quiz por mood, más abajo) para no
// tocar su lógica: se monta arriba, en el tab "Para ti", y si falla o no
// hay datos suficientes simplemente no renderiza nada — el quiz sigue
// funcionando exactamente igual debajo.
function CollaborativeRecommendations({ user, onAdd }) {
  const [items, setItems] = useState(null); // null = cargando, [] = sin resultado
  const [personalized, setPersonalized] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    if (!user?.id) { setItems([]); return; }
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchCollaborativeRecommendations();
        if (cancelled) return;
        setItems(data.items);
        setPersonalized(data.personalized);
      } catch (err) {
        console.warn("[CollaborativeRecommendations] fallback silencioso:", err.message);
        if (!cancelled) setItems([]);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  function handleAdd(item) {
    onAdd({
      id: crypto.randomUUID(),
      title: item.title,
      author: item.author,
      status: "wish",
      genre: item.genres?.[0] || "",
      summary: "",
      moodTags: [],
      coverUrl: item.coverUrl || null,
      rating: 0,
      review: "",
      addedAt: Date.now(),
    });
    setAddedIds((prev) => new Set([...prev, item.bookId]));
  }

  if (items === null) {
    return (
      <div className="px-4 sm:px-6 pt-2" style={{ display: "flex", gap: "0.8rem", overflowX: "auto" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 130, flexShrink: 0 }}>
            <div style={{ width: 130, height: 180, borderRadius: 10, backgroundColor: palette.bgSoft, animation: "skeletonPulse 1.3s ease-in-out infinite" }} />
          </div>
        ))}
        <style>{`@keyframes skeletonPulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } }`}</style>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 pt-2 pb-1 max-w-4xl mx-auto">
      <p style={{ ...display, fontStyle: "italic", fontSize: "1.15rem", color: palette.ink, marginBottom: "0.7rem" }}>
        {personalized ? "Recomendado para ti" : "Los mejor valorados"}
      </p>
      <div style={{ display: "flex", gap: "0.9rem", overflowX: "auto", paddingBottom: "0.4rem" }}>
        {items.map((item) => {
          const added = addedIds.has(item.bookId);
          return (
            <div key={item.bookId} style={{ width: 130, flexShrink: 0 }}>
              <div style={{ position: "relative", width: 130, height: 180, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.14)" }}>
                <BookCoverImage coverUrl={item.coverUrl} title={item.title} author={item.author} genres={item.genres} compact={false} />
              </div>
              <p style={{ ...display, fontSize: "0.85rem", fontWeight: 700, color: palette.ink, marginTop: "0.4rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {item.title}
              </p>
              <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, margin: "2px 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.author}
              </p>
              <button
                onClick={() => handleAdd(item)}
                disabled={added}
                className="btn-press"
                style={{
                  width: "100%", padding: "0.4rem", borderRadius: 8,
                  border: `1px solid ${added ? palette.borderSoft : palette.accent}`,
                  backgroundColor: added ? palette.bgSoft : "transparent",
                  color: added ? palette.inkFaint : palette.accent,
                  cursor: added ? "default" : "pointer",
                  ...body, fontSize: "0.78rem", fontWeight: 600,
                }}
              >
                {added ? "Guardado ✓" : "+ Guardar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendFlow({ books, onSelectBook, onAdd }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ mood: "", time: "", challenge: "", openness: "", extra: "" });
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


  async function fetchRecs(answersOverride) {
    setLoading(true);
    setError("");
    try {
      const ans = answersOverride ?? answers;
      const res = await getMoodRecommendations(books, ans);
      setResults(res);
    } catch (e) {
      console.error(e);
      setError(e.message || "Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({ mood: "", time: "", challenge: "", openness: "", extra: "" });
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <h2 style={{ ...display, fontStyle: "italic", fontSize: "1.6rem", color: palette.ink }}>
              Mis sugerencias
            </h2>
            <button
              onClick={() => fetchRecs(answers)}
              disabled={loading}
              className="btn-press"
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.9rem", borderRadius: 999, border: `1.5px solid ${palette.accent}`, backgroundColor: "transparent", color: palette.accent, cursor: loading ? "default" : "pointer", ...display, fontSize: "0.82rem", fontWeight: 600, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "🎲"} Sorpréndeme
            </button>
          </div>
        </div>

        {fromLibraryMatched.length > 0 && (
          <div className="mb-7">
            <h3
              style={{
                ...display,
                fontSize: "0.85rem",
                color: palette.inkFaint,
                fontWeight: 500,
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
                color: palette.mauve,
                fontWeight: 500,
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
                        color: isAdded ? palette.mauve : palette.onAccent,
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
    return <LoadingEntertainment label="Pensando en lo que te encajaría…" />;
  }

  const QUIZ_STEPS = [
    {
      key: "mood",
      title: "¿Cómo te sientes ahora?",
      options: ["Contemplativo, reflexivo", "Aventurero, con ganas de acción", "Melancólico, introspectivo", "Curioso, con ganas de aprender", "Ligero, divertido", "Intenso, profundo"],
    },
    {
      key: "time",
      title: "¿Cuánto tiempo tienes para leer?",
      options: ["Ratitos cortos (5-15 min por sesión)", "Sesiones medianas (15-40 min)", "Sesiones largas (40 min a 1 hora+)"],
    },
    {
      key: "challenge",
      title: "¿Qué tipo de lectura buscas?",
      options: ["Fácil de leer, que fluya solo", "Ni fácil ni difícil, equilibrado", "Retadora, que me haga pensar"],
    },
    {
      key: "openness",
      title: "¿Quieres explorar o profundizar?",
      options: ["Algo similar a lo que ya me gustó", "Salir de mi zona de confort", "Sorpréndeme, lo que sea"],
    },
  ];

  const pillStyle = (selected) => ({
    padding: "12px 24px",
    borderRadius: "24px",
    minWidth: "160px",
    border: selected ? "none" : `1px solid ${palette.border}`,
    backgroundColor: selected ? BRAND.wineDeep : palette.bgSoft,
    color: selected ? palette.onAccent : palette.ink,
    fontFamily: "'EB Garamond', serif",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    transform: "scale(1)",
  });

  const ProgressBar = () => (
    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.75rem" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, backgroundColor: i <= step ? palette.accent : palette.borderSoft, transition: "background-color 0.25s" }} />
      ))}
    </div>
  );

  const NavRow = ({ onBack, nextLabel, onNext, nextDisabled }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.75rem" }}>
      {onBack ? (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={15} /> Volver
        </button>
      ) : <div />}
      {!nextDisabled && (
        <button onClick={onNext} style={{ padding: "0.7rem 1.5rem", borderRadius: "999px", backgroundColor: palette.ink, color: palette.bg, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer" }}>
          {nextLabel || "Siguiente →"}
        </button>
      )}
    </div>
  );

  // Steps 0–3: single-select pills
  if (step < 4) {
    const { key, title, options } = QUIZ_STEPS[step];
    const selected = answers[key];
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto fade-in">
        <ProgressBar />
        <p style={{ ...ts.caption, marginBottom: "0.4rem", fontWeight: 500 }}>Paso {step + 1} de 5</p>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: "24px", fontWeight: 700, fontStyle: "italic", color: palette.ink, lineHeight: 1.2, marginBottom: "1.5rem" }}>
          {title}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setAnswers({ ...answers, [key]: opt === selected ? "" : opt })}
              className="quiz-pill-press"
              style={pillStyle(opt === selected)}
            >
              {opt}
            </button>
          ))}
        </div>
        {error && <p style={{ ...ts.caption, color: palette.accent, fontStyle: "italic", marginTop: "0.75rem" }}>{error}</p>}
        <NavRow
          onBack={step > 0 ? () => setStep(step - 1) : null}
          nextDisabled={!selected}
          onNext={() => setStep(step + 1)}
        />
      </div>
    );
  }

  // Step 5: free text
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-xl mx-auto fade-in">
      <ProgressBar />
      <p style={{ ...ts.caption, marginBottom: "0.4rem", fontWeight: 500 }}>Paso 5 de 5</p>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: "24px", fontWeight: 700, fontStyle: "italic", color: palette.ink, lineHeight: 1.2, marginBottom: "1.5rem" }}>
        ¿Algo más que deba saber?
      </h2>
      <textarea
        value={answers.extra}
        onChange={(e) => setAnswers({ ...answers, extra: e.target.value.slice(0, 200) })}
        maxLength={200}
        rows={3}
        placeholder="Ej: No quiero nada muy largo, me gustan los finales abiertos, quiero algo mexicano..."
        style={{ width: "100%", padding: "0.85rem", backgroundColor: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: "10px", fontFamily: "'EB Garamond', serif", fontSize: "15px", color: palette.ink, lineHeight: 1.5, outline: "none", resize: "none", boxSizing: "border-box" }}
      />
      <p style={{ ...ts.caption, textAlign: "right", marginTop: "0.2rem", marginBottom: "1rem" }}>{answers.extra.length}/200</p>
      {error && <p style={{ ...ts.caption, color: palette.accent, fontStyle: "italic", marginBottom: "0.75rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
        <button onClick={() => setStep(3)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          <ChevronLeft size={15} /> Volver
        </button>
        <button onClick={() => fetchRecs({ ...answers, extra: "" })} style={{ padding: "0.7rem 1.1rem", borderRadius: "999px", backgroundColor: "transparent", color: palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", border: `1px solid ${palette.border}`, cursor: "pointer", flexShrink: 0 }}>
          Saltar
        </button>
        <button onClick={() => fetchRecs()} style={{ flex: 1, padding: "0.7rem 1rem", borderRadius: "999px", backgroundColor: palette.ink, color: palette.bg, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          <Wand2 size={15} /> Ver recomendaciones
        </button>
      </div>
    </div>
  );
}



// ============ AUTH VIEW ============
function AuthView({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(m) {
    setMode(m);
    setForm({ name: "", username: "", email: "", password: "", confirm: "" });
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
        const result = await loginWithSupabase(form.email, form.password);
        if (!result.ok) { setError(result.error); return; }
        onLogin(result.user);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!form.name.trim()) { setError("El nombre es requerido."); return; }
      const username = form.username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().trim();
      if (!username) { setError("El nombre de usuario es requerido."); return; }
      if (!form.email.trim()) { setError("El email es requerido."); return; }
      if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
      if (form.password !== form.confirm) { setError("Las contraseñas no coinciden."); return; }
      setLoading(true);
      try {
        const result = await registerWithSupabase({ name: form.name, username, email: form.email, password: form.password });
        if (!result.ok) { setError(result.error); return; }
        await initUserGems(result.user.id);
        localStorage.setItem("folio_gems_welcome", "1");
        onLogin(result.user, true);
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
    padding: "12px 16px",
    backgroundColor: palette.bgSoft,
    border: `1.5px solid ${palette.border}`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    color: palette.inkFaint,
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

      {/* Referral banner */}
      {(() => {
        const ref = localStorage.getItem("folio_ref");
        if (!ref) return null;
        return (
          <div style={{ width: "100%", maxWidth: 420, marginBottom: "1rem", padding: "0.7rem 1rem", backgroundColor: `${BRAND.amber}14`, border: `1px solid ${BRAND.amber}40`, borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.1rem" }}>👋</span>
            <p style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft, margin: 0 }}>
              <strong style={{ color: palette.ink }}>@{ref}</strong> te invitó a Folio
            </p>
          </div>
        );
      })()}

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
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Nombre de usuario</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "0.9rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: palette.inkFaint,
                      ...body,
                      fontSize: "1rem",
                      pointerEvents: "none",
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30) })
                    }
                    placeholder="tuusuario"
                    style={{ ...inputStyle, paddingLeft: "1.8rem" }}
                    autoComplete="username"
                  />
                </div>
                <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, marginTop: "0.25rem" }}>
                  Solo letras, números y _. Máx. 30 caracteres.
                </p>
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
                placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
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
              minHeight: "48px",
              padding: "0.9rem",
              backgroundColor: loading ? palette.inkSoft : palette.accent,
              color: palette.onAccent,
              borderRadius: "12px",
              fontWeight: 600,
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

// ============ ACHIEVEMENT COMPONENTS ============

function AchievementCelebration({ achievementKey, onClose, userName, userUsername, userId }) {
  const def = ACHIEVEMENT_DEFS.find((a) => a.key === achievementKey);
  const [achInviteOpen, setAchInviteOpen] = useState(false);
  const [friendCount, setFriendCount] = useState(-1);
  const [showPeakInvite, setShowPeakInvite] = useState(true);

  const isStreakAch = ["streak_7", "streak_30", "streak_90"].includes(achievementKey);
  const streakDays = achievementKey === "streak_7" ? 7 : achievementKey === "streak_30" ? 30 : 90;
  const ref = userUsername || userName || "folio";
  const refUrl = `https://folio-final.vercel.app?ref=${encodeURIComponent(ref)}`;
  const peakMsg = isStreakAch
    ? `Llevo ${streakDays} días leyendo seguido en Folio 🔥 ¿Puedes superarme? https://folio-final.vercel.app`
    : `Acabo de desbloquear '${def?.name}' en Folio 🏆 ¿Te animas a leer conmigo? https://folio-final.vercel.app`;

  useEffect(() => {
    if (!def) return;
    const end = Date.now() + 2000;
    const colors = [...BRAND.confetti.slice(0, 2), PALETTE_LIGHT.mauve, PALETTE_LIGHT.slate, PALETTE_LIGHT.sage];
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    if (userId) {
      supabase.from("friendships")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq("status", "accepted")
        .then(({ count: fc }) => setFriendCount(fc ?? 0));
    }
  }, [achievementKey]);

  async function handleAchievementShare() {
    const msg = `Acabo de desbloquear '${def.name}' en Folio. ¿Te animas a leer más este año? Únete aquí 👇`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Folio — Tu biblioteca personal", text: msg, url: refUrl });
      } else {
        setAchInviteOpen(true);
      }
    } catch (e) {
      if (e.name !== "AbortError") setAchInviteOpen(true);
    }
  }

  async function handlePeakInvite() {
    markInviteCardShown();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Folio — Tu biblioteca personal", text: peakMsg, url: refUrl });
      } else {
        setAchInviteOpen(true);
      }
    } catch (e) {
      if (e.name !== "AbortError") setAchInviteOpen(true);
    }
    setShowPeakInvite(false);
  }

  if (!def) return null;
  return (
    <>
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(42,31,26,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: palette.bgCard, borderRadius: "24px",
          padding: "2.5rem 2rem 2rem", textAlign: "center", maxWidth: 340, width: "100%",
          boxShadow: "0 20px 60px rgba(42,31,26,0.4)",
          animation: "achievementPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <p style={{ ...body, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: palette.inkFaint, marginBottom: "0.75rem" }}>
          ¡Logro desbloqueado!
        </p>
        <div style={{ fontSize: "4rem", lineHeight: 1, marginBottom: "0.85rem", animation: "achievementBounce 0.6s ease-out 0.15s both", display: "inline-block" }}>
          {def.emoji}
        </div>
        <p style={{ ...display, fontSize: "1.5rem", fontWeight: 700, fontStyle: "italic", color: palette.amber, marginBottom: "0.4rem", lineHeight: 1.2 }}>
          {def.name}
        </p>
        <p style={{ ...body, fontSize: "0.92rem", color: palette.inkSoft, marginBottom: "1.75rem", lineHeight: 1.5 }}>
          {def.desc}
        </p>
        <button
          onClick={onClose}
          style={{
            ...display, fontWeight: 600, fontSize: "0.95rem",
            background: BRAND.gradient,
            color: palette.onAccent, border: "none", borderRadius: "999px",
            padding: "0.75rem 2rem", cursor: "pointer", width: "100%",
            boxShadow: "0 4px 16px rgba(122,46,46,0.35)",
            marginBottom: "0.65rem",
          }}
        >
          ¡A seguir leyendo!
        </button>
        {showPeakInvite && friendCount >= 0 && friendCount < 5 && canShowInviteCard() ? (
          <div style={{ textAlign: "center", borderTop: `1px solid ${palette.border}`, paddingTop: "1rem" }}>
            <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, marginBottom: "0.7rem" }}>
              {isStreakAch ? "Reta a un amigo a mantener tu racha" : "Comparte este momento con alguien"}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: palette.accent, display: "flex", alignItems: "center", justifyContent: "center",
                color: palette.onAccent, ...display, fontSize: "0.9rem", fontWeight: 700, flexShrink: 0,
              }}>
                {(userName || "?")[0].toUpperCase()}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: `2px dashed ${palette.border}`, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Plus size={16} strokeWidth={2} color={palette.inkFaint} />
              </div>
            </div>
            <button
              onClick={handlePeakInvite}
              style={{
                ...display, fontWeight: 600, fontSize: "0.9rem",
                backgroundColor: palette.accent, color: palette.onAccent,
                border: "none", borderRadius: "999px",
                padding: "0.65rem 0", width: "100%",
                cursor: "pointer", marginBottom: "0.4rem",
                boxShadow: "0 4px 14px rgba(122,46,46,0.3)",
              }}
            >
              Invitar amigo
            </button>
            <button
              onClick={() => setShowPeakInvite(false)}
              style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.8rem", color: palette.inkFaint }}
            >
              Ahora no
            </button>
          </div>
        ) : (
          <button
            onClick={handleAchievementShare}
            style={{
              ...display, fontWeight: 500, fontSize: "0.86rem",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              backgroundColor: "transparent", color: palette.inkSoft,
              border: `1px solid ${palette.border}`, borderRadius: "999px",
              padding: "0.6rem 1.5rem", cursor: "pointer", width: "100%",
            }}
          >
            <Share2 size={14} strokeWidth={2} />
            Comparte tu logro e invita a un amigo
          </button>
        )}
      </div>
    </div>
    {achInviteOpen && (
      <InviteShareModal message={peakMsg} url={refUrl} onClose={() => setAchInviteOpen(false)} />
    )}
    </>
  );
}

function AchievementDetailModal({ def, unlockedAt, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const IconComp = ACHIEVEMENT_ICON_MAP[def.key] || Award;
  const isUnlocked = !!unlockedAt;
  const dateStr = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 85, backgroundColor: "rgba(42,31,26,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, backgroundColor: palette.bg, borderRadius: "1.25rem 1.25rem 0 0", padding: "1.75rem 1.5rem 2rem", boxShadow: "0 -4px 40px rgba(42,31,26,0.2)", animation: isClosing ? "slideDown 250ms cubic-bezier(0.4, 0, 1, 1) forwards" : "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.85rem" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: isUnlocked ? BRAND.gradient : palette.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isUnlocked ? "0 6px 24px rgba(122,46,46,0.3)" : "none" }}>
            <IconComp size={34} color={isUnlocked ? palette.onAccent : palette.inkFaint} strokeWidth={1.5} />
          </div>
          <div>
            <p style={{ ...display, fontSize: "1.2rem", fontWeight: 700, color: palette.ink, lineHeight: 1.2 }}>{def.name}</p>
            <p style={{ ...body, fontSize: "0.84rem", marginTop: "0.3rem", color: isUnlocked ? palette.amber : palette.inkFaint, fontWeight: isUnlocked ? 500 : 400 }}>
              {isUnlocked ? `Desbloqueado el ${dateStr}` : "Aún no desbloqueado"}
            </p>
          </div>
          <div style={{ backgroundColor: isUnlocked ? `${BRAND.amber}10` : palette.bgSoft, border: `1px solid ${isUnlocked ? "${BRAND.amber}30" : palette.borderSoft}`, borderRadius: 12, padding: "0.85rem 1.1rem", width: "100%", textAlign: "left" }}>
            <p style={{ ...display, fontSize: "0.75rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.3rem" }}>
              {isUnlocked ? "Lo conseguiste así" : "Qué necesitas"}
            </p>
            <p style={{ ...body, fontSize: "0.9rem", color: palette.ink, lineHeight: 1.5 }}>
              {isUnlocked ? def.desc : (ACHIEVEMENT_CONDITION_MAP[def.key] || def.desc)}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          style={{ display: "block", width: "100%", marginTop: "1.25rem", ...body, fontSize: "0.9rem", color: palette.inkSoft, border: `1px solid ${palette.borderSoft}`, borderRadius: "999px", padding: "0.65rem", cursor: "pointer", backgroundColor: "transparent" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function AchievementGrid({ unlockedAchievements, friendOnly = false }) {
  const [selectedAch, setSelectedAch] = useState(null);
  const unlockedMap = {};
  (unlockedAchievements || []).forEach((a) => { unlockedMap[a.achievement_key] = a.unlocked_at; });
  const toShow = friendOnly
    ? ACHIEVEMENT_DEFS.filter((d) => unlockedMap[d.key])
    : ACHIEVEMENT_DEFS;
  const unlockedCount = ACHIEVEMENT_DEFS.filter((d) => unlockedMap[d.key]).length;
  const total = ACHIEVEMENT_DEFS.length;
  const pct = Math.round((unlockedCount / total) * 100);

  const cats = [...new Set(toShow.map((d) => d.cat))];

  if (friendOnly && toShow.length === 0) {
    return (
      <p style={{ ...body, fontSize: "0.88rem", color: palette.inkFaint, fontStyle: "italic", textAlign: "center", padding: "0.5rem 0" }}>
        Aún no tiene logros desbloqueados.
      </p>
    );
  }

  return (
    <div>
      {selectedAch && (
        <AchievementDetailModal def={selectedAch.def} unlockedAt={selectedAch.unlockedAt} onClose={() => setSelectedAch(null)} />
      )}
      {!friendOnly && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft }}>{unlockedCount} / {total} logros desbloqueados</span>
            <span style={{ ...display, fontSize: "0.85rem", fontWeight: 600, color: palette.amber }}>{pct}%</span>
          </div>
          <div style={{ height: 7, backgroundColor: palette.bgSoft, borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${BRAND.wine}, ${BRAND.amber})`, borderRadius: "999px", transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}
      {cats.map((cat) => {
        const defs = toShow.filter((d) => d.cat === cat);
        return (
          <div key={cat} style={{ marginBottom: "1.1rem" }}>
            <p style={{ ...display, fontSize: "0.75rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.5rem" }}>{cat}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              {defs.map((def) => {
                const isUnlocked = !!unlockedMap[def.key];
                const IconComp = ACHIEVEMENT_ICON_MAP[def.key] || Award;
                const date = unlockedMap[def.key] ? new Date(unlockedMap[def.key]).toLocaleDateString("es", { day: "numeric", month: "short" }) : null;
                return (
                  <button
                    key={def.key}
                    onClick={() => setSelectedAch({ def, unlockedAt: unlockedMap[def.key] || null })}
                    style={{
                      backgroundColor: isUnlocked ? palette.bgCard : palette.bgSoft,
                      border: isUnlocked ? "1px solid rgba(200,146,74,0.35)" : "none",
                      borderRadius: "10px", padding: "0.6rem 0.35rem", textAlign: "center",
                      cursor: "pointer", position: "relative",
                      opacity: isUnlocked ? 1 : 0.6,
                      boxShadow: isUnlocked ? "0 2px 6px rgba(200,146,74,0.15)" : "none",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { if (isUnlocked) { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(200,146,74,0.25)"; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = isUnlocked ? "0 2px 6px rgba(200,146,74,0.15)" : "none"; }}
                  >
                    {!isUnlocked && (
                      <Lock size={10} color={palette.border} style={{ position: "absolute", top: 5, right: 5 }} />
                    )}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "0.25rem", height: "1.6rem" }}>
                      <IconComp size={28} color={isUnlocked ? palette.amber : palette.border} strokeWidth={1.5} />
                    </div>
                    <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.6rem", color: isUnlocked ? palette.ink : palette.inkFaint, fontWeight: isUnlocked ? 600 : 400, lineHeight: 1.2, marginBottom: "0.1rem" }}>
                      {def.name}
                    </p>
                    {isUnlocked && date && (
                      <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.55rem", color: palette.inkFaint }}>{date}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ READING HEATMAP ============
const DAY_HEADERS_ES = ["D", "L", "M", "Mi", "J", "V", "S"];

function getCalColor(pages) {
  if (!pages || pages === 0) return null;
  const cols = palette.bg === PALETTE_DARK.bg ? HEATMAP_COLORS.dark : HEATMAP_COLORS.light;
  if (pages <= 5)  return cols[0];
  if (pages <= 15) return cols[1];
  if (pages <= 30) return cols[2];
  return cols[3];
}

function ReadingHeatmap({ userId }) {
  const [logMap, setLogMap] = useState({});
  const [loading, setLoading] = useState(true);
  const todayNow = new Date();
  todayNow.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(todayNow.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayNow.getMonth());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchLogs() {
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      let rows = [];
      const { data, error } = await supabase
        .from("reading_logs")
        .select("pages_read, logged_at, books(title)")
        .eq("user_id", userId)
        .gte("logged_at", start.toISOString());
      if (!error && data) {
        rows = data;
      } else {
        const { data: d2 } = await supabase
          .from("reading_logs")
          .select("pages_read, logged_at")
          .eq("user_id", userId)
          .gte("logged_at", start.toISOString());
        rows = d2 || [];
      }
      if (cancelled) return;
      const map = {};
      rows.forEach(log => {
        if (!log.logged_at) return;
        const day = localDateStr(new Date(log.logged_at));
        const pages = log.pages_read || 1;
        if (!map[day]) map[day] = { pages: 0, books: [] };
        map[day].pages += pages;
        const title = log.books?.title;
        if (title && !map[day].books.includes(title)) map[day].books.push(title);
      });
      setLogMap(map);
      setLoading(false);
    }
    fetchLogs();
    return () => { cancelled = true; };
  }, [userId]);

  const minDate = new Date(todayNow.getFullYear(), todayNow.getMonth() - 6, 1);
  const maxDate = new Date(todayNow.getFullYear(), todayNow.getMonth(), 1);
  const viewDate = new Date(viewYear, viewMonth, 1);
  const canGoPrev = viewDate > minDate;
  const canGoNext = viewDate < maxDate;

  function prevMonth() {
    if (!canGoPrev) return;
    let m = viewMonth - 1, y = viewYear;
    if (m < 0) { m = 11; y--; }
    setViewMonth(m); setViewYear(y);
  }
  function nextMonth() {
    if (!canGoNext) return;
    let m = viewMonth + 1, y = viewYear;
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = localDateStr(todayNow);

  const activeDaysThisMonth = Object.keys(logMap).filter(k => {
    const d = new Date(k + "T12:00:00");
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ padding: "0 1.25rem 1.25rem" }}>
      {/* Month nav header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          style={{ background: "none", border: "none", cursor: canGoPrev ? "pointer" : "default", opacity: canGoPrev ? 1 : 0.3, padding: "0.25rem 0.5rem", color: palette.inkSoft, fontSize: "1.1rem", lineHeight: 1 }}
        >
          ←
        </button>
        <p style={{ ...display, fontSize: "1.1rem", fontWeight: 700, color: palette.ink, margin: 0 }}>
          {MONTHS_ES[viewMonth]} {viewYear}
        </p>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          style={{ background: "none", border: "none", cursor: canGoNext ? "pointer" : "default", opacity: canGoNext ? 1 : 0.3, padding: "0.25rem 0.5rem", color: palette.inkSoft, fontSize: "1.1rem", lineHeight: 1 }}
        >
          →
        </button>
      </div>

      {loading ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={18} color={palette.inkFaint} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAY_HEADERS_ES.map(h => (
              <div key={h} style={{ textAlign: "center", ...body, fontSize: "0.68rem", color: palette.inkFaint }}>
                {h}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const dateStr = `${viewYear}-${mm}-${dd}`;
              const data = logMap[dateStr];
              const pages = data?.pages || 0;
              const bg = getCalColor(pages);
              const isToday = dateStr === todayStr;
              const isFuture = new Date(dateStr + "T12:00:00") > todayNow;
              const darkBg = pages > 15;
              return (
                <div
                  key={dateStr}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    backgroundColor: bg || "transparent",
                    border: isToday
                      ? `1.5px dashed ${bg ? "rgba(255,255,255,0.55)" : palette.inkFaint}`
                      : "1px solid transparent",
                  }}
                >
                  <span style={{
                    ...body,
                    fontSize: "0.78rem",
                    fontWeight: isToday ? 700 : 400,
                    color: bg
                      ? (darkBg ? palette.onAccent : palette.ink)
                      : (isFuture ? palette.border : palette.inkFaint),
                    lineHeight: 1,
                    userSelect: "none",
                  }}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer: active days + legend */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem", gap: "0.5rem" }}>
            <span style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint }}>
              {activeDaysThisMonth} {activeDaysThisMonth === 1 ? "día activo" : "días activos"} este mes
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {(palette.bg === PALETTE_DARK.bg ? HEATMAP_COLORS.dark : HEATMAP_COLORS.light).map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c, flexShrink: 0 }} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ PROFILE VIEW ============

function ProfileView({ user, onUserUpdate, books, onSelectBook, onLogout, theme = 'system', setTheme }) {
  const [profile, setProfile] = useState({ username: "", bio: "", avatarUrl: null, coverUrl: null });
  const [displayName, setDisplayName] = useState(user.name || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [streak, setStreak] = useState(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [expandedGenre, setExpandedGenre] = useState(null);
  const [wraps, setWraps] = useState([]);
  const [generatingWrap, setGeneratingWrap] = useState(false);
  const [activeWrap, setActiveWrap] = useState(null);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const fileInput = useRef(null);
  const coverFileInput = useRef(null);

  useEffect(() => {
    // Load profile — fallback to cache if offline
    const cachedP = getCachedProfile();
    if (cachedP) {
      setProfile(cachedP);
      setLoading(false);
    }
    supabase
      .from("users")
      .select("username, bio, avatar_url, cover_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = { username: data.username || "", bio: data.bio || "", avatarUrl: data.avatar_url || null, coverUrl: data.cover_url || null };
          setProfile(p);
          cacheProfile(p);
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
    checkStreakOnLoad(user.id).then(() => {
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data) setStreak(data); });
    });

    // Privacidad — query aparte y tolerante: si la columna aún no existe
    // (migración pendiente) no rompe la carga del resto del perfil.
    supabase.from("users").select("is_public").eq("id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setIsPublicProfile(data.is_public !== false);
      });

    const refreshAchievements = () =>
      supabase.from("achievements").select("achievement_key, unlocked_at").eq("user_id", user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            setUnlockedAchievements(data);
            cacheAchievements(data);
          }
        });

    // Seed from cache immediately
    const cachedA = getCachedAchievements();
    if (cachedA) setUnlockedAchievements(cachedA);

    refreshAchievements();
    checkAchievements(user.id, user.name).then(refreshAchievements);
    const unsub = achievementBus.on(refreshAchievements);

    // Load wraps
    supabase.from("monthly_wraps").select("*").eq("user_id", user.id)
      .order("year", { ascending: false }).order("month", { ascending: false, nullsFirst: true })
      .limit(8)
      .then(({ data }) => setWraps(data || []));

    return unsub;
  }, [user.id]);

  async function handleGenerateWrap(month, year, type = "monthly") {
    setGeneratingWrap(true);
    try {
      const wrap = type === "annual"
        ? await generateAnnualWrap(user.id, year)
        : await generateMonthWrap(user.id, month, year);
      setWraps(prev => {
        const filtered = prev.filter(w => !(w.month === wrap.month && w.year === wrap.year && w.wrap_type === wrap.wrap_type));
        return [wrap, ...filtered];
      });
      setActiveWrap(wrap);
    } catch (err) { console.error("Error generando wrap:", err); }
    setGeneratingWrap(false);
  }

  async function handleAvatarUpload(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}.${ext}`;
      const { data: uploadData, error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw new Error(`Storage error: ${upErr.message}`);
      const publicUrl = supabase.storage.from("avatars").getPublicUrl(uploadData.path).data.publicUrl;
      if (!publicUrl) throw new Error("No se pudo obtener la URL pública del avatar.");
      const { data: dbData, error: dbErr } = await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id).select("avatar_url, cover_url, username, bio");
      if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
      if (!dbData || dbData.length === 0) throw new Error("No se pudo guardar el avatar (posible bloqueo de permisos).");
      setProfile((p) => {
        const next = { ...p, avatarUrl: publicUrl + `?t=${Date.now()}` };
        cacheProfile(next);
        return next;
      });
    } catch (e) {
      setError(e.message || "Error al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverUpload(file) {
    if (!file) return;
    setUploadingCover(true);
    setError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}.${ext}`;
      const { data: uploadData, error: upErr } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
      if (upErr) throw new Error(`Storage error: ${upErr.message}`);
      const publicUrl = supabase.storage.from("covers").getPublicUrl(uploadData.path).data.publicUrl;
      if (!publicUrl) throw new Error("No se pudo obtener la URL pública de la portada.");
      const { data: dbData, error: dbErr } = await supabase.from("users").update({ cover_url: publicUrl }).eq("id", user.id).select("avatar_url, cover_url, username, bio");
      if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
      if (!dbData || dbData.length === 0) throw new Error("No se pudo guardar la portada (posible bloqueo de permisos).");
      setProfile((p) => {
        const next = { ...p, coverUrl: publicUrl + `?t=${Date.now()}` };
        cacheProfile(next);
        return next;
      });
    } catch (e) {
      setError(e.message || "Error al subir la portada.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Nombre de display (separado del username, que no cambia de reglas)
      const cleanName = displayName.trim();
      if (!cleanName) throw new Error("El nombre no puede quedar vacío.");
      if (cleanName !== user.name) {
        const saved = await updateDisplayName(user.id, cleanName);
        if (!saved) throw new Error("No se pudo actualizar el nombre.");
        onUserUpdate?.({ name: saved });
      }
      const username = profile.username.toLowerCase().trim();
      if (username) {
        const { data: taken } = await supabase
          .from("users")
          .select("id")
          .eq("username", username)
          .neq("id", user.id)
          .maybeSingle();
        if (taken) throw new Error("Ese nombre de usuario ya está en uso.");
      }
      const { error: updateErr } = await supabase
        .from("users")
        .update({ username: username || null, bio: profile.bio.trim() || null, avatar_url: profile.avatarUrl || null, cover_url: profile.coverUrl || null })
        .eq("id", user.id);
      if (updateErr) throw updateErr;
      cacheProfile({ ...profile, username: username || "" });
      setSuccess("Perfil actualizado.");
      setTimeout(() => setSuccess(""), 3000);
      return true;
    } catch (e) {
      setError(e.message || "Error al guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    ...body,
    width: "100%",
    padding: "12px 16px",
    backgroundColor: palette.bgCard,
    border: `1.5px solid ${palette.border}`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    color: palette.inkFaint,
    fontWeight: 500,
    marginBottom: "0.3rem",
    display: "block",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin" color={palette.inkFaint} />
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const readBooks = books.filter((b) => b.status === "read");
  const readingBooks = books.filter((b) => b.status === "reading");
  const wantBooks = books.filter((b) => b.status === "want_to_read" || b.status === "wish");
  const ratedBooks = readBooks.filter((b) => b.rating > 0);
  const avgRating =
    ratedBooks.length > 0
      ? (ratedBooks.reduce((s, b) => s + b.rating, 0) / ratedBooks.length).toFixed(1)
      : null;
  const genreCounts = {};
  books.forEach((b) => {
    if (b.genre) {
      const g = b.genre.trim();
      const normalized = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
      genreCounts[normalized] = (genreCounts[normalized] || 0) + 1;
    }
  });
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topRated = [...readBooks]
    .filter((b) => b.rating > 0)
    .sort((a, b) => b.rating - a.rating || (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 5);

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", paddingBottom: "2rem" }}>

      {/* ── Cover banner ── */}
      <div style={{ position: "relative", height: 180, background: profile.coverUrl ? "none" : BRAND.gradient }}>
        {profile.coverUrl && (
          <img src={profile.coverUrl} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}

        {/* Avatar overlapping bottom-left */}
        <div
          style={{ position: "absolute", bottom: -46, left: 20, cursor: uploading ? "default" : "pointer" }}
          onClick={() => !uploading && fileInput.current?.click()}
          className="group"
        >
          <div style={{ padding: 3, borderRadius: "50%", background: BRAND.gradient, boxShadow: "0 4px 18px rgba(122,46,46,0.45)", border: `4px solid ${palette.bg}` }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 92, height: 92, borderRadius: "50%", backgroundColor: getAvatarColor(user.id || user.name), color: palette.onAccent, fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(42,31,26,0.45)" }}>
              {uploading ? <Loader2 size={20} color={palette.onAccent} className="animate-spin" /> : <Camera size={18} color={palette.onAccent} />}
            </div>
          </div>
        </div>

        {/* Change cover button */}
        <button
          onClick={() => coverFileInput.current?.click()}
          disabled={uploadingCover}
          style={{ position: "absolute", bottom: 10, right: 12, display: "flex", alignItems: "center", gap: "0.3rem", backgroundColor: "rgba(42,31,26,0.55)", backdropFilter: "blur(6px)", color: palette.onAccent, border: "1px solid rgba(255,255,255,0.25)", borderRadius: "999px", padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.78rem", ...display, fontWeight: 500 }}
        >
          {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          {uploadingCover ? "Subiendo…" : "Cambiar portada"}
        </button>

        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => handleAvatarUpload(e.target.files?.[0])} />
        <input ref={coverFileInput} type="file" accept="image/*" hidden onChange={(e) => handleCoverUpload(e.target.files?.[0])} />
      </div>

      {/* Space for avatar overflow + name */}
      <div style={{ paddingTop: 56, paddingLeft: 20, paddingRight: 20, paddingBottom: "0.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <p style={{ ...display, fontWeight: 700, fontSize: "1.25rem", color: palette.ink, lineHeight: 1.2 }}>{user.name}</p>
          {profile.username && <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint }}>@{profile.username}</p>}
        </div>
      </div>

      {/* ── Sección de racha ── */}
      <div style={{ padding: "0 1.25rem 0.5rem" }}>
        {streak && streak.current_streak > 0 ? (
          <div className="streak-banner-active" style={{
            borderRadius: "14px", padding: "1rem 1.25rem",
            background: BRAND.gradient,
            display: "flex", alignItems: "center", gap: "1rem",
          }}>
            <Flame
              size={36}
              color={BRAND.cream}
              className={streak.current_streak > 7 ? "fire-pulse" : ""}
              style={{ flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ ...display, fontWeight: 800, fontSize: "1.6rem", color: BRAND.cream, lineHeight: 1, marginBottom: "0.15rem" }}>
                {streak.current_streak} {streak.current_streak === 1 ? "día" : "días"} de racha
              </p>
              <p style={{ ...body, fontSize: "0.82rem", color: "rgba(244,237,224,0.75)" }}>
                Mejor racha: {streak.longest_streak} {streak.longest_streak === 1 ? "día" : "días"}
              </p>
            </div>
            {streak.total_pages_read > 0 && (
              <div style={{ textAlign: "center", flexShrink: 0, backgroundColor: "rgba(244,237,224,0.15)", borderRadius: "10px", padding: "0.5rem 0.8rem" }}>
                <p style={{ ...display, fontWeight: 800, fontSize: "1.2rem", color: BRAND.cream, lineHeight: 1 }}>
                  {streak.total_pages_read.toLocaleString("es")}
                </p>
                <p style={{ ...body, fontSize: "0.65rem", color: "rgba(244,237,224,0.7)", marginTop: "0.1rem" }}>páginas</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            borderRadius: "14px", padding: "1rem 1.25rem",
            backgroundColor: palette.bgCard, border: `1px dashed ${palette.border}`,
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <BookOpen size={28} color={palette.inkFaint} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ ...display, fontWeight: 700, fontSize: "0.95rem", color: palette.inkSoft }}>
                Comienza tu racha hoy
              </p>
              <p style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint }}>
                Registra una sesión en el Feed para empezar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Profile Modal ── */}
      {editModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setEditModalOpen(false)}
        >
          <div className="scrollbar-hide" style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem 2.5rem", width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <p style={{ ...ts.h2, color: palette.ink }}>Editar perfil</p>
              <button onClick={() => setEditModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
                <X size={20} color={palette.inkSoft} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Nombre</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
                  placeholder="Tu nombre"
                  style={inputStyle}
                />
                <p style={{ ...ts.caption, marginTop: "0.25rem" }}>Es el nombre que ven los demás. Tu @usuario no cambia.</p>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <p style={{ ...ts.body15, color: palette.inkFaint }}>{user.email}</p>
              </div>
              <div>
                <label style={labelStyle}>Nombre de usuario</label>
                <div className="relative">
                  <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: palette.inkFaint, ...body, fontSize: "1rem" }}>@</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30) }))}
                    placeholder="tuusuario"
                    style={{ ...inputStyle, paddingLeft: "1.8rem" }}
                  />
                </div>
                <p style={{ ...ts.caption, marginTop: "0.25rem" }}>Solo letras, números y _. Máximo 30 caracteres.</p>
              </div>
              <div>
                <label style={labelStyle}>Bio <span style={{ fontWeight: 400, fontStyle: "italic" }}>(máx. 160 caracteres)</span></label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value.slice(0, 160) }))}
                  placeholder="Lectora empedernida, fan de la ciencia ficción..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
                />
                <p style={{ ...ts.caption, textAlign: "right", marginTop: "0.2rem" }}>{profile.bio.length}/160</p>
              </div>
            </div>
            {error && <p style={{ ...ts.body15, color: palette.accent, fontStyle: "italic", marginTop: "0.75rem" }}>{error}</p>}
            {success && <p style={{ ...ts.body15, color: palette.success, fontStyle: "italic", marginTop: "0.75rem" }}>{success}</p>}
            <button
              onClick={async () => { const ok = await handleSave(); if (ok) setTimeout(() => setEditModalOpen(false), 800); }}
              disabled={saving}
              style={{ width: "100%", marginTop: "1.25rem", padding: "0.85rem", backgroundColor: saving ? palette.bgSoft : palette.accent, color: saving ? palette.inkFaint : palette.onAccent, border: "none", borderRadius: "12px", fontSize: "1rem", fontFamily: "Fraunces, serif", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-5" style={{ backgroundColor: palette.bg, paddingTop: "1.25rem", paddingBottom: "1.5rem" }}>
      <div className="md:flex md:items-start md:gap-12">
      <div className="md:w-72 md:flex-shrink-0">

      {/* Bio + Edit button */}
      {profile.bio ? (
        <p style={{ ...ts.body15, color: palette.inkSoft, marginBottom: "1rem", lineHeight: 1.6 }}>{profile.bio}</p>
      ) : (
        <p style={{ ...ts.body15, color: palette.inkFaint, fontStyle: "italic", marginBottom: "1rem" }}>Sin bio aún.</p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={() => { setError(""); setSuccess(""); setDisplayName(user.name || ""); setEditModalOpen(true); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", borderRadius: "999px", border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
        >
          <PenLine size={14} strokeWidth={2} />
          Editar perfil
        </button>
        <button
          onClick={async () => {
            const username = profile.username || user.name || "Alguien";
            const refUrl = `https://folio-final.vercel.app?ref=${encodeURIComponent(username)}`;
            const msg = `Llevo ${books.length} libros en mi biblioteca de Folio. Únete y veamos qué tenemos en común 📚`;
            try {
              if (navigator.share) {
                await navigator.share({ title: "Folio — Tu biblioteca personal", text: msg, url: refUrl });
              } else {
                setInviteModalOpen(true);
              }
            } catch (e) {
              if (e.name !== "AbortError") setInviteModalOpen(true);
            }
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0", backgroundColor: "transparent", border: "none", color: palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
        >
          <Share2 size={14} strokeWidth={2} />
          Invita a un amigo
        </button>
      </div>
      {inviteModalOpen && (() => {
        const username = profile.username || user.name || "Alguien";
        const refUrl = `https://folio-final.vercel.app?ref=${encodeURIComponent(username)}`;
        const msg = `Llevo ${books.length} libros en mi biblioteca de Folio. Únete y veamos qué tenemos en común 📚`;
        return <InviteShareModal message={msg} url={refUrl} onClose={() => setInviteModalOpen(false)} />;
      })()}

      </div>{/* end left column */}

      {/* Stats — right column on desktop, below on mobile */}
      {books.length > 0 && (
        <div className="mt-10 pt-8 border-t md:mt-0 md:pt-0 md:border-0 md:flex-1 md:min-w-0" style={{ borderColor: palette.border }}>
          <h3 style={{ ...ts.h2, color: palette.ink, marginBottom: "1.25rem" }}>
            Tu biblioteca
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            {[
              { label: "Leídos",   value: readBooks.length,    numColor: palette.sage, bg: `${palette.sage}0D` },
              { label: "Leyendo",  value: readingBooks.length, numColor: palette.accentSoft, bg: `${BRAND.amber}0D` },
              { label: "Por leer", value: wantBooks.length,    numColor: palette.slate, bg: `${palette.slate}0D` },
              { label: "En total", value: books.length,        numColor: palette.ink, bg: palette.bgCard },
            ].map(({ label, value, numColor, bg }) => (
              <div
                key={label}
                style={{
                  backgroundColor: bg,
                  borderRadius: "14px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  minHeight: "88px",
                }}
              >
                <div style={{ fontFamily: "Fraunces, serif", fontSize: "28px", fontWeight: 700, color: numColor, lineHeight: 1, marginBottom: "0.4rem" }}>{value}</div>
                <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 500, color: palette.inkFaint }}>{label}</div>
              </div>
            ))}
          </div>
          {streak && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Racha actual", value: `${streak.current_streak || 0}`, unit: "días", numColor: BRAND.wine, bg: `${BRAND.amber}0D` },
                { label: "Mejor racha",  value: `${streak.longest_streak  || 0}`, unit: "días", numColor: palette.amberInk, bg: palette.bgCard },
              ].map(({ label, value, unit, numColor, bg }) => (
                <div key={label} style={{ backgroundColor: bg, borderRadius: "14px", padding: "1rem", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: "88px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "0.4rem" }}>
                    <span style={{ fontFamily: "Fraunces, serif", fontSize: "28px", fontWeight: 700, color: numColor, lineHeight: 1 }}>{value}</span>
                    <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "12px", color: numColor, opacity: 0.7 }}>{unit}</span>
                  </div>
                  <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 500, color: palette.inkFaint }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <ReadingHeatmap userId={user.id} />

          {avgRating && (
            <div
              style={{
                backgroundColor: `${BRAND.amber}14`,
                border: `1px solid ${BRAND.amber}28`,
                borderRadius: "12px",
                padding: "0.9rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              <Star size={20} color={palette.amberRich} fill={palette.amberRich} />
              <div>
                <span style={{ ...display, fontSize: "1.5rem", fontWeight: 800, color: palette.amberInk }}>{avgRating}</span>
                <span style={{ ...body, fontSize: "0.84rem", color: palette.inkSoft, marginLeft: "0.4rem" }}>
                  promedio · {ratedBooks.length} {ratedBooks.length === 1 ? "calificación" : "calificaciones"}
                </span>
              </div>
            </div>
          )}


          {topGenres.length > 0 && (
            <div style={{ marginBottom: "1.75rem" }}>
              <p style={{ ...ts.h2, color: palette.ink, marginBottom: "0.75rem" }}>
                Géneros favoritos
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: expandedGenre ? "0.75rem" : 0 }}>
                {topGenres.map(([genre, count]) => {
                  const isOpen = expandedGenre === genre;
                  return (
                    <button
                      key={genre}
                      onClick={() => setExpandedGenre(isOpen ? null : genre)}
                      style={{ ...body, ...genrePillStyle(genre, isOpen) }}
                    >
                      {genre} <span style={{ opacity: 0.7, fontSize: "0.78rem" }}>({count})</span>
                    </button>
                  );
                })}
              </div>
              {expandedGenre && (
                <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {books.filter((b) => b.genre === expandedGenre).map((book) => {
                    const statusLabel = { reading: "Leyendo", want_to_read: "Por leer", wish: "Por leer", read: "Leído" }[book.status];
                    return (
                      <button
                        key={book.id}
                        onClick={() => onSelectBook(book)}
                        style={{ display: "flex", alignItems: "center", gap: "0.65rem", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0.35rem 0.25rem", borderRadius: 8 }}
                      >
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="" style={{ width: 40, height: 58, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                        ) : (
                          <BookCoverPlaceholder title={book.title} author={book.author} width={40} height={58} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ ...display, fontSize: "0.88rem", color: palette.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
                          <p style={{ ...body, fontSize: "0.76rem", color: palette.inkFaint }}>{book.author}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                            {statusLabel && <span style={{ ...body, fontSize: "0.68rem", color: palette.inkSoft }}>{statusLabel}</span>}
                            {book.rating > 0 && <span style={{ fontSize: "0.7rem", color: palette.amber }}>{"★".repeat(book.rating)}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {topRated.length > 0 && (
            <div>
              <p style={{ ...ts.h2, color: palette.ink, marginBottom: "0.75rem" }}>
                Mejor valorados
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {topRated.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => onSelectBook(book)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      backgroundColor: palette.bgCard,
                      border: `1px solid ${palette.borderSoft}`,
                      borderRadius: "8px",
                      padding: "0.6rem 0.85rem",
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", gap: "2px" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={11} color={palette.amber} fill={s <= book.rating ? palette.amber : "none"} />
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...display, fontSize: "0.9rem", color: palette.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {book.title}
                      </p>
                      <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>{book.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>{/* end grid */}

      {/* ── Mis logros (colapsado por default) ── */}
      <div style={{ padding: "1.75rem 1.25rem 2rem", backgroundColor: palette.bgCard }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <p style={{ ...ts.h2, color: palette.ink }}>Mis logros{unlockedAchievements.length > 0 ? ` (${unlockedAchievements.length})` : ""}</p>
          {unlockedAchievements.length > 0 && (
            <button onClick={() => setAchievementsExpanded((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.82rem", color: palette.accent, fontWeight: 600 }}>
              {achievementsExpanded ? "Ver menos" : "Ver todos"}
            </button>
          )}
        </div>
        <div style={{ position: "relative", maxHeight: achievementsExpanded ? "none" : 132, overflow: "hidden" }}>
          <AchievementGrid unlockedAchievements={unlockedAchievements} />
          {!achievementsExpanded && unlockedAchievements.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 50, background: `linear-gradient(to bottom, transparent, ${palette.bgCard})`, pointerEvents: "none" }} />
          )}
        </div>
      </div>

      {/* ── Wrapped anual (solo en temporada nov–ene) ── */}
      {(() => {
        const now = new Date();
        const m = now.getMonth(); // 0=ene … 11=dic
        const inSeason = m === 10 || m === 11 || m === 0; // nov, dic, ene
        if (!inSeason) return null;
        const year = now.getFullYear();
        const annualWrap = wraps.find(w => w.wrap_type === "annual" && w.year === year);
        return (
          <div style={{ padding: "1.75rem 1.25rem 2.5rem", backgroundColor: palette.bgSoft }}>
            <p style={{ ...ts.h2, color: palette.ink, marginBottom: "1rem" }}>Tu Wrapped {year}</p>
            <button
              onClick={() => annualWrap ? setActiveWrap(annualWrap) : handleGenerateWrap(null, year, "annual")}
              disabled={generatingWrap}
              style={{
                width: "100%", minHeight: "80px", padding: "1.1rem 1.25rem",
                background: BRAND.gradientWrappedCta,
                borderRadius: 14, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: "0 4px 20px rgba(107,30,42,0.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <span className="sparkle-anim"><Sparkles size={20} color={BRAND.cream} /></span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "11px", fontWeight: 500, color: "rgba(244,237,224,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{year}</div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: "1.1rem", fontWeight: 700, fontStyle: "italic", color: BRAND.cream }}>Wrapped</div>
                </div>
              </div>
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", fontWeight: 700, color: BRAND.cream }}>
                {generatingWrap ? "Generando…" : annualWrap ? "Ver mi Wrapped →" : "Generar →"}
              </span>
            </button>
          </div>
        );
      })()}

      {activeWrap && (
        <WrappedStoryExperience wrap={activeWrap} onClose={() => setActiveWrap(null)} />
      )}

      {/* Mis listas */}
      <ListsSection user={user} books={books} onSelectBook={onSelectBook} />

      {/* Privacidad */}
      <div style={{ padding: "0 1.25rem 1.25rem" }}>
        <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Privacidad</p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[{ v: true, label: "Perfil público" }, { v: false, label: "Perfil privado" }].map(({ v, label }) => (
            <button
              key={String(v)}
              disabled={savingPrivacy}
              onClick={async () => {
                if (isPublicProfile === v || savingPrivacy) return;
                setSavingPrivacy(true);
                const prev = isPublicProfile;
                setIsPublicProfile(v);
                const { error: privErr } = await supabase.from("users").update({ is_public: v }).eq("id", user.id);
                if (privErr) {
                  console.error("[PRIVACIDAD] error:", privErr.message);
                  setIsPublicProfile(prev);
                }
                setSavingPrivacy(false);
              }}
              style={{
                flex: 1, padding: "0.55rem 0.25rem", borderRadius: 10,
                border: `1.5px solid ${isPublicProfile === v ? palette.accent : palette.border}`,
                backgroundColor: isPublicProfile === v ? `${palette.accent}18` : "transparent",
                color: isPublicProfile === v ? palette.accent : palette.inkSoft,
                cursor: "pointer", ...body, fontSize: "0.82rem",
                fontWeight: isPublicProfile === v ? 600 : 400,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                transition: "all 150ms ease",
              }}
            >
              {!v && <Lock size={12} />}
              {label}
            </button>
          ))}
        </div>
        <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, marginTop: "0.4rem", lineHeight: 1.4 }}>
          Con el perfil privado, solo tus amigos ven tus libros, stats, racha y mascota. Tu nombre y foto siguen visibles para que puedan enviarte solicitudes.
        </p>
      </div>

      {/* Apariencia */}
      <div style={{ padding: "0 1.25rem 1.25rem" }}>
        <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Apariencia</p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[{ id: "system", label: "Sistema" }, { id: "light", label: "Claro" }, { id: "dark", label: "Oscuro" }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTheme?.(id)}
              style={{
                flex: 1, padding: "0.55rem 0.25rem", borderRadius: 10,
                border: `1.5px solid ${theme === id ? palette.accent : palette.border}`,
                backgroundColor: theme === id ? `${palette.accent}18` : "transparent",
                color: theme === id ? palette.accent : palette.inkSoft,
                cursor: "pointer", ...body, fontSize: "0.82rem",
                fontWeight: theme === id ? 600 : 400,
                transition: "all 150ms ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cerrar sesión / Eliminar cuenta */}
      <div style={{ padding: "0 1.25rem 2.5rem", textAlign: "center", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.9rem", alignItems: "center" }}>
        <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.82rem", color: palette.inkFaint }}>
          Cerrar sesión
        </button>
        <button onClick={() => setDeleteModalOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.78rem", color: palette.danger, opacity: 0.75 }}>
          Eliminar cuenta
        </button>
      </div>

      {deleteModalOpen && (
        <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} onDeleted={onLogout} />
      )}

      </div>{/* end px wrapper */}
    </div>
  );
}

const EMOJI_GROUPS = [
  { label: "😊", emojis: ["😊","😄","😂","🤣","😍","🥰","😘","😎","🤔","😅","😭","😱","😤","🥺","😴","🤗","😇","🙃","😏","🥳","😬","🤩","😌","😒","🫡"] },
  { label: "👋", emojis: ["👋","🤝","👍","👎","🙌","👏","🤞","✌️","🤙","💪","🙏","☝️","👌","🫶","🤌","🤏","👀","🫂","💅","🖐️"] },
  { label: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🫀","♥️"] },
  { label: "✨", emojis: ["🎉","🎊","🎁","✨","🌟","⭐","🔥","💡","🌈","☕","📚","📖","✏️","🎵","🎶","🌙","☀️","⚡","🌺","🍵","🎸","🏆","🎯","🪄","🌸"] },
];

// ============ CHAT VIEW ============
function ChatView({ user, friend, onBack, onMessagesRead }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [emojiTab, setEmojiTab] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let channelRef = null;
    let cancelled = false;
    async function init() {
      setLoading(true);
      const id = await getOrCreateConversation(user.id, friend.id);
      if (cancelled) return;
      setConvId(id);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) console.error("[chat] no se pudieron cargar los mensajes:", error.message);
      if (cancelled) return;
      setMessages(data || []);
      await markConversationRead(id, user.id);
      if (cancelled) return;
      onMessagesRead?.();
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);

      channelRef = supabase
        .channel(`conv:${id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        }, async (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender_id !== user.id) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", payload.new.id);
            onMessagesRead?.();
          }
        })
        .subscribe();
    }
    init().catch((err) => console.error("[chat] init falló:", err));
    return () => {
      cancelled = true;
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [friend.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 20 ? "auto" : "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending || !convId) return;
    const content = text.trim();
    setText("");
    setShowEmojis(false);
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: convId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      // TODO(audit): checkAchievements corre antes de que exista el mensaje, así que
      // "first_message" se evalúa con datos viejos (se otorga en el siguiente envío).
      checkAchievements(user.id, user.name);
      const { data: saved, error: sendErr } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: user.id, content })
        .select()
        .single();
      if (sendErr) throw sendErr;
      if (saved) setMessages((prev) => prev.map((m) => m.id === tempId ? saved : m));
      const { error: convErr } = await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
      if (convErr) console.error("[chat] no se pudo actualizar last_message_at:", convErr.message);
    } catch (err) {
      console.error("[chat] no se pudo enviar el mensaje:", err?.message || err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function insertEmoji(emoji) {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  function dateSeparatorLabel(ts) {
    const d = new Date(ts);
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Hoy";
    if (d.toDateString() === yesterday.toDateString()) return "Ayer";
    return d.toLocaleDateString("es", { day: "numeric", month: "short" });
  }

  const friendName = friend.name || friend.nombre || "";
  const friendInitials = friendName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 105px)" }}>
      {/* Chat header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          borderBottom: `1px solid ${palette.border}`,
          backgroundColor: palette.bgCard,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          style={{ width: 32, height: 32 }}
        >
          <ChevronLeft size={20} color={palette.inkSoft} />
        </button>
        {friend.avatar_url ? (
          <img
            src={friend.avatar_url}
            alt=""
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: palette.accent,
              color: palette.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Fraunces, serif",
              fontSize: "1rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {friendInitials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...display, fontSize: "1.05rem", fontWeight: 600, color: palette.ink }}>{friendName}</p>
          {friend.username && (
            <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint }}>@{friend.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="scrollbar-hide"
        style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem", backgroundColor: palette.bg }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "3rem" }}>
            <Loader2 size={20} className="animate-spin" color={palette.inkFaint} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "4rem" }}>
            <MessageCircle size={32} color={palette.border} style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic" }}>Aún no hay mensajes. ¡Di hola!</p>
          </div>
        ) : (
          (() => {
            const rendered = [];
            let lastDateLabel = null;
            messages.forEach((msg) => {
              const label = dateSeparatorLabel(msg.created_at);
              if (label !== lastDateLabel) {
                lastDateLabel = label;
                rendered.push(
                  <div key={`sep-${msg.id}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.75rem 0" }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: palette.borderSoft }} />
                    <span style={{ ...body, fontSize: "0.7rem", color: palette.inkFaint, letterSpacing: "0.05em" }}>{label}</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: palette.borderSoft }} />
                  </div>
                );
              }
              const mine = msg.sender_id === user.id;
              rendered.push(
                <div key={msg.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: "0.05rem" }}>
                  <div style={{ maxWidth: "72%" }}>
                    <div
                      style={{
                        padding: "0.5rem 0.85rem",
                        borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        backgroundColor: mine ? palette.accent : palette.bgCard,
                        border: mine ? "none" : `1px solid ${palette.borderSoft}`,
                        color: mine ? BRAND.cream : palette.ink,
                        ...body,
                        fontSize: "0.95rem",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                        boxShadow: mine ? "0 1px 4px rgba(122,46,46,0.18)" : "0 1px 4px rgba(42,31,26,0.08)",
                      }}
                    >
                      {msg.content}
                    </div>
                    <p
                      style={{
                        ...body,
                        fontSize: "0.65rem",
                        color: palette.inkFaint,
                        marginTop: "0.2rem",
                        textAlign: mine ? "right" : "left",
                        paddingLeft: mine ? 0 : "0.2rem",
                        paddingRight: mine ? "0.2rem" : 0,
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            });
            return rendered;
          })()
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: `1px solid ${palette.border}`, backgroundColor: palette.bg, flexShrink: 0, position: "relative" }}>
        {/* Emoji picker */}
        {showEmojis && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              backgroundColor: palette.bgCard,
              borderTop: `1px solid ${palette.border}`,
              boxShadow: "0 -4px 20px rgba(42,31,26,0.12)",
              zIndex: 10,
            }}
          >
            {/* Category tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${palette.borderSoft}`, padding: "0 0.5rem" }}>
              {EMOJI_GROUPS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setEmojiTab(i)}
                  style={{
                    padding: "0.45rem 0.7rem",
                    fontSize: "1.1rem",
                    borderBottom: `2px solid ${emojiTab === i ? palette.accent : "transparent"}`,
                    opacity: emojiTab === i ? 1 : 0.5,
                    transition: "all 0.15s",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {/* Emoji grid */}
            <div style={{ display: "flex", flexWrap: "wrap", padding: "0.5rem", gap: "0.1rem", maxHeight: 140, overflowY: "auto" }}>
              {EMOJI_GROUPS[emojiTab].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  style={{ fontSize: "1.4rem", padding: "0.25rem", borderRadius: 6, lineHeight: 1, transition: "background 0.1s" }}
                  className="hover:opacity-80"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Input row */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.65rem 1rem" }}>
          <button
            onClick={() => setShowEmojis((v) => !v)}
            style={{
              fontSize: "1.25rem",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: showEmojis ? palette.bgSoft : "transparent",
              border: `1px solid ${showEmojis ? palette.border : "transparent"}`,
              flexShrink: 0,
              transition: "all 0.15s",
              lineHeight: 1,
            }}
          >
            😊
          </button>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={(e) => { setShowEmojis(false); e.currentTarget.style.borderColor = palette.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = palette.border; }}
            placeholder="Escribe un mensaje..."
            style={{
              ...body,
              flex: 1,
              padding: "0.6rem 1rem",
              backgroundColor: palette.bgCard,
              border: `1.5px solid ${palette.border}`,
              borderRadius: "999px",
              fontSize: "0.95rem",
              color: palette.ink,
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: text.trim() ? palette.accent : palette.bgSoft,
              color: text.trim() ? BRAND.cream : palette.inkFaint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: text.trim() ? "pointer" : "default",
              transition: "background-color 0.15s",
              flexShrink: 0,
              border: "none",
            }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>{/* end input row */}
      </div>{/* end input area */}
    </div>
  );
}

// ============ FRIEND PROFILE MODAL ============

// Helper: get finished date from either format
function bookFinishedDate(b) {
  if (b.finishedAt) return new Date(b.finishedAt);
  if (b.finished_at) return new Date(b.finished_at);
  return null;
}

function monthKey(b) {
  const d = bookFinishedDate(b);
  if (!d || isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function booksPerMonth(books, numMonths = 6) {
  const now = new Date();
  return Array.from({ length: numMonths }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (numMonths - 1 - i), 1);
    const y = d.getFullYear(), mo = d.getMonth() + 1;
    const key = `${y}-${String(mo).padStart(2, "0")}`;
    return {
      label: MONTH_ABBR[d.getMonth()],
      count: books.filter((b) => b.status === "read" && monthKey(b) === key).length,
    };
  });
}

// ── CompareProfilesView ──────────────────────────────────────────────────────
function CompareProfilesView({ user, friend, friendBooks, onClose }) {
  const [userBooks, setUserBooks] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [uStreakRow, setUStreakRow] = useState(null);
  const [fStreakRow, setFStreakRow] = useState(null);
  const [uAvgPages, setUAvgPages] = useState(0);
  const [fAvgPages, setFAvgPages] = useState(0);

  useEffect(() => {
    fetchBooks(user.id).then((b) => { setUserBooks(b); setLoadingUser(false); }).catch(() => setLoadingUser(false));
    supabase.from("user_streaks").select("current_streak, total_pages_read").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setUStreakRow(data));
    supabase.from("user_streaks").select("current_streak, total_pages_read").eq("user_id", friend.id).maybeSingle()
      .then(({ data }) => setFStreakRow(data));
    supabase.from("reading_logs").select("pages_read").eq("user_id", user.id).not("pages_read", "is", null)
      .then(({ data }) => { if (data?.length) setUAvgPages(Math.round(data.reduce((s, l) => s + (l.pages_read || 0), 0) / data.length)); });
    supabase.from("reading_logs").select("pages_read").eq("user_id", friend.id).not("pages_read", "is", null)
      .then(({ data }) => { if (data?.length) setFAvgPages(Math.round(data.reduce((s, l) => s + (l.pages_read || 0), 0) / data.length)); });
  }, [user.id]);

  if (loadingUser) return (
    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <Loader2 size={22} className="animate-spin mx-auto" color={palette.inkFaint} />
    </div>
  );

  const uRead    = userBooks.filter((b) => b.status === "read");
  const fRead    = friendBooks.filter((b) => b.status === "read");
  const uReading = userBooks.filter((b) => b.status === "reading");
  const fReading = friendBooks.filter((b) => b.status === "reading");
  const uRated   = uRead.filter((b) => b.rating > 0);
  const fRated   = fRead.filter((b) => b.rating > 0);
  const uAvg     = uRated.length ? uRated.reduce((s, b) => s + b.rating, 0) / uRated.length : 0;
  const fAvg     = fRated.length ? fRated.reduce((s, b) => s + b.rating, 0) / fRated.length : 0;
  const uGenres  = new Set([...uRead, ...uReading].filter((b) => b.genre).map((b) => b.genre));
  const fGenres  = new Set([...fRead, ...fReading].filter((b) => b.genre).map((b) => b.genre));

  const uMonths  = booksPerMonth(userBooks);
  const fMonths  = booksPerMonth(friendBooks);
  const maxBar   = Math.max(1, ...uMonths.map((m) => m.count), ...fMonths.map((m) => m.count));

  // Common books (matched by title, both read)
  const uReadTitleMap = {};
  uRead.forEach((b) => { uReadTitleMap[b.title.toLowerCase().trim()] = b; });
  const commonBooks = fRead.filter((b) => uReadTitleMap[b.title.toLowerCase().trim()]);

  const commonGenres = [...uGenres].filter((g) => fGenres.has(g));

  const uTop3 = [...uRated].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const fTop3 = [...fRated].sort((a, b) => b.rating - a.rating).slice(0, 3);

  const friendName = (friend.name || friend.nombre || "Amigo").split(" ")[0];
  const userName   = (user.name || "Tú").split(" ")[0];

  const U_COLOR = BRAND.wine;
  const F_COLOR = palette.slate;

  function ColHeader({ name, avatarUrl, initials, color }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `3px solid ${color}` }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: color, color: palette.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1rem" }}>{initials}</div>
        )}
        <span style={{ ...display, fontSize: "0.82rem", fontWeight: 600, color: palette.ink }}>{name}</span>
      </div>
    );
  }

  function MetricRow({ label, uVal, fVal, maxVal, fmt = (v) => v }) {
    const uPct = maxVal > 0 ? Math.round((uVal / maxVal) * 100) : 0;
    const fPct = maxVal > 0 ? Math.round((fVal / maxVal) * 100) : 0;
    return (
      <div style={{ marginBottom: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.28rem", alignItems: "center" }}>
          <span style={{ ...display, fontSize: "0.92rem", fontWeight: 700, color: U_COLOR, minWidth: 32 }}>{fmt(uVal)}</span>
          <span style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, textAlign: "center", flex: 1 }}>{label}</span>
          <span style={{ ...display, fontSize: "0.92rem", fontWeight: 700, color: F_COLOR, minWidth: 32, textAlign: "right" }}>{fmt(fVal)}</span>
        </div>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <div style={{ flex: 1, height: 7, backgroundColor: palette.bgSoft, borderRadius: "999px 0 0 999px", overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: `${uPct}%`, backgroundColor: U_COLOR, borderRadius: "999px", height: "100%", transition: "width 0.4s ease" }} />
          </div>
          <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: palette.border, flexShrink: 0 }} />
          <div style={{ flex: 1, height: 7, backgroundColor: palette.bgSoft, borderRadius: "0 999px 999px 0", overflow: "hidden" }}>
            <div style={{ width: `${fPct}%`, backgroundColor: F_COLOR, borderRadius: "999px", height: "100%", transition: "width 0.4s ease" }} />
          </div>
        </div>
      </div>
    );
  }

  const secLabel = { ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.65rem" };

  const uInitials = (user.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const fInitials = (friend.name || friend.nombre || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ padding: "0 1.25rem 2rem" }}>
      {/* Back */}
      <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: "0.4rem 0" }}>
        <ChevronLeft size={15} /> Volver al perfil
      </button>

      {/* Column headers */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <ColHeader name={userName} avatarUrl={user.avatar_url} initials={uInitials} color={U_COLOR} />
        <span style={{ ...display, fontStyle: "italic", fontSize: "0.78rem", color: palette.inkFaint }}>vs</span>
        <ColHeader name={friendName} avatarUrl={friend.avatar_url} initials={fInitials} color={F_COLOR} />
      </div>

      {/* Metrics */}
      <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
        <p style={secLabel}>Métricas</p>
        <MetricRow label="Racha actual (días)" uVal={uStreakRow?.current_streak || 0} fVal={fStreakRow?.current_streak || 0} maxVal={Math.max(1, uStreakRow?.current_streak || 0, fStreakRow?.current_streak || 0)} />
        <MetricRow label="Leídos" uVal={uRead.length} fVal={fRead.length} maxVal={Math.max(1, uRead.length, fRead.length)} />
        <MetricRow label="Leyendo ahora" uVal={uReading.length} fVal={fReading.length} maxVal={Math.max(1, uReading.length, fReading.length)} />
        <MetricRow label="Géneros (leídos + leyendo)" uVal={uGenres.size} fVal={fGenres.size} maxVal={Math.max(1, uGenres.size, fGenres.size)} />
        <MetricRow label="Calificación promedio" uVal={uAvg} fVal={fAvg} maxVal={5} fmt={(v) => v > 0 ? `${v.toFixed(1)}★` : "—"} />
        <MetricRow label="Páginas leídas" uVal={uStreakRow?.total_pages_read || 0} fVal={fStreakRow?.total_pages_read || 0} maxVal={Math.max(1, uStreakRow?.total_pages_read || 0, fStreakRow?.total_pages_read || 0)} fmt={(v) => v > 0 ? v.toLocaleString("es") : "0"} />
        <MetricRow label="Páginas / sesión (prom.)" uVal={uAvgPages} fVal={fAvgPages} maxVal={Math.max(1, uAvgPages, fAvgPages)} fmt={(v) => v > 0 ? `${v}p` : "—"} />
      </div>

      {/* Spider / Radar chart */}
      {(() => {
        const uPages = uStreakRow?.total_pages_read || 0;
        const fPages = fStreakRow?.total_pages_read || 0;
        const uCurStreak = uStreakRow?.current_streak || 0;
        const fCurStreak = fStreakRow?.current_streak || 0;

        const axes = [
          { name: "Leídos",      uRaw: uRead.length,  fRaw: fRead.length,  uDisp: uRead.length,          fDisp: fRead.length          },
          { name: "Páginas",     uRaw: uPages,         fRaw: fPages,         uDisp: uPages.toLocaleString("es"), fDisp: fPages.toLocaleString("es") },
          { name: "Racha",       uRaw: uCurStreak,     fRaw: fCurStreak,     uDisp: `${uCurStreak}d`,      fDisp: `${fCurStreak}d`      },
          { name: "Rating",      uRaw: uAvg * 20,      fRaw: fAvg * 20,      uDisp: uAvg > 0 ? uAvg.toFixed(1) : "—", fDisp: fAvg > 0 ? fAvg.toFixed(1) : "—" },
          { name: "Géneros",     uRaw: uGenres.size,   fRaw: fGenres.size,   uDisp: uGenres.size,          fDisp: fGenres.size          },
          { name: "Vel. pág",    uRaw: uAvgPages,      fRaw: fAvgPages,      uDisp: uAvgPages > 0 ? `${uAvgPages}p` : "—", fDisp: fAvgPages > 0 ? `${fAvgPages}p` : "—" },
        ];
        const n = axes.length;
        const size = 310;
        const cx = size / 2, cy = size / 2, r = size * 0.31;
        const levels = [0.25, 0.5, 0.75, 1];

        function pt(axIdx, pct) {
          const angle = (Math.PI * 2 * axIdx) / n - Math.PI / 2;
          return { x: cx + r * pct * Math.cos(angle), y: cy + r * pct * Math.sin(angle) };
        }

        // Each axis normalized independently; if both 0 → 0.5 so polygon doesn't collapse
        const normalized = axes.map(({ uRaw, fRaw }) => {
          const mx = Math.max(uRaw, fRaw);
          if (mx === 0) return { u: 0.5, f: 0.5 };
          return { u: uRaw / mx, f: fRaw / mx };
        });

        const uPts = normalized.map((v, i) => pt(i, v.u));
        const fPts = normalized.map((v, i) => pt(i, v.f));
        const poly = (pts) => pts.map((p) => `${p.x},${p.y}`).join(" ");

        return (
          <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
            <p style={secLabel}>Perfil lector</p>
            <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
              {/* Grid rings */}
              {levels.map((lvl) => (
                <polygon key={lvl}
                  points={poly(axes.map((_, i) => pt(i, lvl)))}
                  fill="none" stroke={palette.border} strokeWidth="1" opacity="0.9"
                />
              ))}
              {/* Axis lines */}
              {axes.map((_, i) => {
                const end = pt(i, 1);
                return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={palette.border} strokeWidth="0.8" opacity="0.75" />;
              })}
              {/* User polygon */}
              <polygon points={poly(uPts)} fill={`${U_COLOR}33`} stroke={U_COLOR} strokeWidth="2" strokeLinejoin="round" />
              {/* Friend polygon */}
              <polygon points={poly(fPts)} fill={`${F_COLOR}33`} stroke={F_COLOR} strokeWidth="2" strokeLinejoin="round" />
              {/* Axis labels — two-line: name + (u vs f) */}
              {axes.map(({ name, uDisp, fDisp }, i) => {
                const p = pt(i, 1.42);
                return (
                  <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={p.x} dy="-6" fontSize="9" fill={palette.inkSoft} fontFamily="EB Garamond, serif">{name}</tspan>
                    <tspan x={p.x} dy="12" fontSize="7.5" fill={palette.amber} fontFamily="EB Garamond, serif">({uDisp} vs {fDisp})</tspan>
                  </text>
                );
              })}
              {/* Dots — larger for visibility */}
              {uPts.map((p, i) => <circle key={`u${i}`} cx={p.x} cy={p.y} r="5" fill={U_COLOR} />)}
              {fPts.map((p, i) => <circle key={`f${i}`} cx={p.x} cy={p.y} r="5" fill={F_COLOR} />)}
            </svg>
            <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginTop: "0.5rem" }}>
              {[{ color: U_COLOR, name: userName }, { color: F_COLOR, name: friendName }].map(({ color, name }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
                  <span style={{ ...body, fontSize: "0.72rem", color: palette.inkSoft }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Monthly chart */}
      <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
        <p style={secLabel}>Libros por mes</p>
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "flex-end", height: 80, marginBottom: "0.4rem" }}>
          {uMonths.map((um, i) => {
            const fm = fMonths[i];
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 64 }}>
                  <div style={{ width: "45%", height: `${Math.max(2, (um.count / maxBar) * 64)}px`, backgroundColor: U_COLOR, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
                  <div style={{ width: "45%", height: `${Math.max(2, (fm.count / maxBar) * 64)}px`, backgroundColor: F_COLOR, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
                </div>
                <span style={{ ...body, fontSize: "0.6rem", color: palette.inkFaint }}>{um.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: U_COLOR }} />
            <span style={{ ...body, fontSize: "0.72rem", color: palette.inkSoft }}>{userName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: F_COLOR }} />
            <span style={{ ...body, fontSize: "0.72rem", color: palette.inkSoft }}>{friendName}</span>
          </div>
        </div>
      </div>

      {/* Common books */}
      <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
        <p style={secLabel}>Libros en común ({commonBooks.length})</p>
        {commonBooks.length === 0 ? (
          <p style={{ ...body, fontSize: "0.88rem", color: palette.inkFaint, fontStyle: "italic" }}>Aún no han leído los mismos libros.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {commonBooks.slice(0, 8).map((fb, i) => {
              const ub = uReadTitleMap[fb.title.toLowerCase().trim()];
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < commonBooks.length - 1 ? `1px solid ${palette.borderSoft}` : "none", paddingBottom: "0.5rem" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: "0.5rem" }}>
                    <p style={{ ...display, fontSize: "0.88rem", color: palette.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fb.title}</p>
                    <p style={{ ...body, fontSize: "0.74rem", color: palette.inkFaint }}>{fb.author}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", color: U_COLOR, ...display, fontWeight: 600 }}>{userName}</div>
                      <div style={{ fontSize: "0.75rem", color: palette.amber }}>{ub?.rating > 0 ? "★".repeat(ub.rating) : "—"}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", color: F_COLOR, ...display, fontWeight: 600 }}>{friendName}</div>
                      <div style={{ fontSize: "0.75rem", color: palette.amber }}>{fb.rating > 0 ? "★".repeat(fb.rating) : "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {commonGenres.length > 0 && (
          <div style={{ marginTop: "0.85rem" }}>
            <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, marginBottom: "0.4rem" }}>Géneros en común</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {commonGenres.map((g) => (
                <span key={g} style={{ ...genreColor(g), ...body, fontSize: "0.75rem", padding: "0.15rem 0.55rem", borderRadius: "999px" }}>{g}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top 3 rated */}
      <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
        <p style={secLabel}>Mejor valorados</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[{ title: `Top de ${userName}`, books: uTop3, color: U_COLOR }, { title: `Top de ${friendName}`, books: fTop3, color: F_COLOR }].map(({ title, books: topBooks, color }) => (
            <div key={title}>
              <p style={{ ...display, fontSize: "0.75rem", color, fontWeight: 600, marginBottom: "0.5rem" }}>{title}</p>
              {topBooks.length === 0 ? (
                <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, fontStyle: "italic" }}>Sin calificaciones aún.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {topBooks.map((b, i) => (
                    <div key={i} style={{ backgroundColor: palette.bg, border: `1px solid ${palette.borderSoft}`, borderRadius: 8, padding: "0.5rem 0.6rem" }}>
                      <p style={{ ...display, fontSize: "0.8rem", color: palette.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</p>
                      <p style={{ fontSize: "0.7rem", color: palette.amber }}>{"★".repeat(b.rating)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Expanded stat drawer ─────────────────────────────────────────────────────
function StatExpandedView({ stat, friendBooks, friendName, onClose }) {
  const secLabel = { ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.65rem" };

  let books = [];
  let title = "";

  if (stat === "all") {
    books = [...friendBooks].sort((a, b) => {
      const order = { reading: 0, want_to_read: 1, wish: 1, read: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
    title = `Biblioteca de ${friendName}`;
  } else if (stat === "read") {
    books = [...friendBooks.filter((b) => b.status === "read")]
      .sort((a, b) => (b.finished_at ? new Date(b.finished_at) : 0) - (a.finished_at ? new Date(a.finished_at) : 0));
    title = `Leídos por ${friendName}`;
  } else if (stat === "reading") {
    books = friendBooks.filter((b) => b.status === "reading");
    title = `${friendName} está leyendo`;
  } else if (stat === "want") {
    books = friendBooks.filter((b) => b.status === "want_to_read" || b.status === "wish");
    title = `Por leer de ${friendName}`;
  } else if (stat === "rating") {
    books = [...friendBooks.filter((b) => b.rating > 0)].sort((a, b) => b.rating - a.rating);
    title = `Calificaciones de ${friendName}`;
  } else if (stat === "genres") {
    const gc = {};
    friendBooks.forEach((b) => { if (b.genre) gc[b.genre] = (gc[b.genre] || 0) + 1; });
    const entries = Object.entries(gc).sort((a, b) => b[1] - a[1]);
    const total = friendBooks.length || 1;
    return (
      <div style={{ padding: "0 1.25rem 2rem" }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: "0.4rem 0" }}>
          <ChevronLeft size={15} /> Volver
        </button>
        <p style={secLabel}>{`Géneros de ${friendName}`}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {entries.map(([genre, count]) => (
            <div key={genre}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                <span style={{ ...display, fontSize: "0.88rem", color: palette.ink }}>{genre}</span>
                <span style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>{count} libro{count !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ height: 7, backgroundColor: palette.bgSoft, borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ width: `${(count / total) * 100}%`, height: "100%", ...genreColor(genre), backgroundColor: genreColor(genre).color, borderRadius: "999px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 1.25rem 2rem" }}>
      <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: "0.4rem 0" }}>
        <ChevronLeft size={15} /> Volver
      </button>
      <p style={secLabel}>{title} ({books.length})</p>
      {books.length === 0 ? (
        <p style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint, fontStyle: "italic" }}>Sin libros aquí aún.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {books.map((book, i) => {
            const statusLabel = { reading: "Leyendo", want_to_read: "Por leer", wish: "Por leer", read: "Leído" }[book.status];
            const statusColor = { reading: palette.accent, want_to_read: palette.slate, wish: palette.slate, read: palette.sage }[book.status] || palette.inkFaint;
            return (
              <div key={i} style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 8, padding: "0.7rem 0.85rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...display, fontSize: "0.9rem", color: palette.ink, fontWeight: 600 }}>{book.title}</p>
                    <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, fontStyle: "italic" }}>{book.author}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem", flexShrink: 0 }}>
                    {stat === "all" && statusLabel && (
                      <span style={{ ...body, fontSize: "0.65rem", color: statusColor, border: `1px solid ${statusColor}44`, borderRadius: "999px", padding: "0.08rem 0.45rem" }}>{statusLabel}</span>
                    )}
                    {book.rating > 0 && (
                      <div style={{ display: "flex", gap: "1px" }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} color={palette.amber} fill={s <= book.rating ? palette.amber : "none"} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {book.review && (
                  <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, marginTop: "0.4rem", lineHeight: 1.5, fontStyle: "italic", borderTop: `1px solid ${palette.borderSoft}`, paddingTop: "0.4rem" }}>
                    "{book.review}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── LiteraryCompatibility ────────────────────────────────────────────────────
function LiteraryCompatibility({ userBooks, friendBooks, userStreak, friendStreak, friendName }) {
  const norm = (s) => (s || "").toLowerCase().trim();

  const userRead = userBooks;
  const friendRead = (friendBooks || []).filter((b) => b.status === "read");

  const uGenreCounts = {};
  userRead.forEach((b) => { if (b.genre) uGenreCounts[b.genre] = (uGenreCounts[b.genre] || 0) + 1; });
  const fGenreCounts = {};
  friendRead.forEach((b) => { if (b.genre) fGenreCounts[b.genre] = (fGenreCounts[b.genre] || 0) + 1; });
  const uGenres = new Set(Object.keys(uGenreCounts));
  const fGenres = new Set(Object.keys(fGenreCounts));
  const commonGenres = [...uGenres].filter((g) => fGenres.has(g));
  const totalUniqueGenres = new Set([...uGenres, ...fGenres]).size;

  const genreScore = totalUniqueGenres > 0 ? (commonGenres.length / totalUniqueGenres) * 40 : 0;

  const uBookKeys = new Set(userRead.map((b) => `${norm(b.title)}::${norm(b.author)}`));
  const fBookMap = {};
  friendRead.forEach((b) => { fBookMap[`${norm(b.title)}::${norm(b.author)}`] = b; });
  const commonBooksRaw = userRead.filter((b) => fBookMap[`${norm(b.title)}::${norm(b.author)}`]);
  const totalUnion = new Set([...uBookKeys, ...friendRead.map((b) => `${norm(b.title)}::${norm(b.author)}`)]).size;
  const bookScore = totalUnion > 0 ? (commonBooksRaw.length / totalUnion) * 30 : 0;

  const uRated = userRead.filter((b) => b.rating > 0);
  const fRated = friendRead.filter((b) => b.rating > 0);
  const uAvg = uRated.length > 0 ? uRated.reduce((s, b) => s + b.rating, 0) / uRated.length : null;
  const fAvg = fRated.length > 0 ? fRated.reduce((s, b) => s + b.rating, 0) / fRated.length : null;
  const ratingScore = uAvg && fAvg ? (1 - Math.abs(uAvg - fAvg) / 5) * 20 : 10;

  const uStrk = userStreak?.current_streak || 0;
  const fStrk = friendStreak?.current_streak || 0;
  const habitScore = (uStrk >= 3 && fStrk >= 3) ? 10 : (uStrk > 0 || fStrk > 0) ? 5 : 0;

  const score = Math.min(100, Math.round(genreScore + bookScore + ratingScore + habitScore));

  const label = score >= 90 ? "Almas gemelas literarias"
    : score >= 70 ? "Lectores muy compatibles"
    : score >= 50 ? "Buenos compañeros de lectura"
    : score >= 30 ? "Mundos distintos, misma pasión"
    : "Se complementan perfectamente";

  const onlyU = [...uGenres].filter((g) => !fGenres.has(g)).sort((a, b) => (uGenreCounts[b] || 0) - (uGenreCounts[a] || 0));
  const onlyF = [...fGenres].filter((g) => !uGenres.has(g)).sort((a, b) => (fGenreCounts[b] || 0) - (fGenreCounts[a] || 0));
  const topCommon = [...commonGenres].sort((a, b) => ((uGenreCounts[b] || 0) + (fGenreCounts[b] || 0)) - ((uGenreCounts[a] || 0) + (fGenreCounts[a] || 0)));

  const commonBooksDisplay = commonBooksRaw.slice(0, 4).map((b) => ({
    ...b,
    friendRating: fBookMap[`${norm(b.title)}::${norm(b.author)}`]?.rating,
  }));

  if (userRead.length === 0 && friendRead.length === 0) return null;

  return (
    <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Score header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <p style={{ ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.25rem" }}>Compatibilidad literaria</p>
          <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, lineHeight: 1.3 }}>{label}</p>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: "2.6rem", fontWeight: 800, color: palette.accent, lineHeight: 1 }}>{score}%</p>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height: 6, backgroundColor: palette.bgSoft, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: `linear-gradient(90deg, ${BRAND.wine}, ${BRAND.amber})`, borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>

      {/* Venn diagram */}
      {(uGenres.size > 0 || fGenres.size > 0) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingLeft: 4, paddingRight: 4 }}>
            <p style={{ ...body, fontSize: "0.72rem", color: BRAND.wine, fontWeight: 600 }}>Tú</p>
            <p style={{ ...body, fontSize: "0.72rem", color: palette.slate, fontWeight: 600, textAlign: "right" }}>{friendName}</p>
          </div>
          <svg viewBox="0 0 320 110" width="100%" style={{ maxWidth: 320, overflow: "visible" }}>
            <defs>
              <clipPath id="lc-left"><circle cx="120" cy="55" r="62" /></clipPath>
              <clipPath id="lc-right"><circle cx="200" cy="55" r="62" /></clipPath>
            </defs>
            <circle cx="120" cy="55" r="62" fill={BRAND.wine} fillOpacity="0.15" stroke={BRAND.wine} strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx="200" cy="55" r="62" fill={palette.slate} fillOpacity="0.15" stroke={palette.slate} strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx="200" cy="55" r="62" fill={BRAND.amber} fillOpacity="0.28" clipPath="url(#lc-left)" />
            {onlyU.slice(0, 2).map((g, i) => (
              <text key={g} x="75" y={42 + i * 16} textAnchor="middle" fontSize="9" fill={BRAND.wine} fontFamily="EB Garamond, serif" fontWeight="600">{g.length > 9 ? g.slice(0, 9) + "…" : g}</text>
            ))}
            {topCommon.slice(0, 2).map((g, i) => (
              <text key={g} x="160" y={42 + i * 16} textAnchor="middle" fontSize="9" fill={palette.amberInk} fontFamily="EB Garamond, serif" fontWeight="600">{g.length > 9 ? g.slice(0, 9) + "…" : g}</text>
            ))}
            {onlyF.slice(0, 2).map((g, i) => (
              <text key={g} x="245" y={42 + i * 16} textAnchor="middle" fontSize="9" fill={palette.slate} fontFamily="EB Garamond, serif" fontWeight="600">{g.length > 9 ? g.slice(0, 9) + "…" : g}</text>
            ))}
            {onlyU.length === 0 && uGenres.size === 0 && (
              <text x="75" y="57" textAnchor="middle" fontSize="8" fill={`${BRAND.wine}99`} fontFamily="EB Garamond, serif" fontStyle="italic">sin géneros</text>
            )}
            {topCommon.length === 0 && (
              <text x="160" y="57" textAnchor="middle" fontSize="8" fill={`${palette.amberInk}99`} fontFamily="EB Garamond, serif" fontStyle="italic">ninguno</text>
            )}
            {onlyF.length === 0 && fGenres.size === 0 && (
              <text x="245" y="57" textAnchor="middle" fontSize="8" fill={`${palette.slate}99`} fontFamily="EB Garamond, serif" fontStyle="italic">sin géneros</text>
            )}
          </svg>

          {/* Genre pills below diagram */}
          {onlyU.length > 0 && (
            <div style={{ width: "100%" }}>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginBottom: "0.3rem" }}>Solo tú:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {onlyU.map((g) => (
                  <span key={g} style={{ ...body, fontSize: "0.75rem", backgroundColor: `${palette.accent}14`, color: palette.accent, border: `1px solid ${palette.accent}40`, borderRadius: "20px", padding: "3px 10px" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
          {topCommon.length > 0 && (
            <div style={{ width: "100%" }}>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginBottom: "0.3rem" }}>En común:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {topCommon.map((g) => (
                  <span key={g} style={{ ...body, fontSize: "0.75rem", backgroundColor: `${palette.amber}1A`, color: palette.amberInk, border: `1px solid ${palette.amber}55`, borderRadius: "20px", padding: "3px 10px" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
          {onlyF.length > 0 && (
            <div style={{ width: "100%" }}>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginBottom: "0.3rem" }}>Solo {friendName}:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {onlyF.map((g) => (
                  <span key={g} style={{ ...body, fontSize: "0.75rem", backgroundColor: `${palette.slate}14`, color: palette.slate, border: `1px solid ${palette.slate}40`, borderRadius: "20px", padding: "3px 10px" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Books in common */}
      {commonBooksDisplay.length > 0 && (
        <div>
          <p style={{ ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.6rem" }}>
            Libros en común ({commonBooksRaw.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {commonBooksDisplay.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.65rem", backgroundColor: palette.bg, borderRadius: 10, padding: "0.5rem 0.65rem", border: `1px solid ${palette.borderSoft}` }}>
                {b.cover_url ? (
                  <img src={b.cover_url} alt="" style={{ width: 32, height: 44, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 44, borderRadius: 4, backgroundColor: palette.bgSoft, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={14} color={palette.inkFaint} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...display, fontSize: "0.82rem", fontWeight: 600, color: palette.ink, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</p>
                  <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, marginTop: "0.1rem" }}>{b.author}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {b.rating > 0 && <p style={{ ...body, fontSize: "0.75rem", color: palette.amber }}>{"★".repeat(b.rating)}</p>}
                  {b.friendRating > 0 && <p style={{ ...body, fontSize: "0.7rem", color: palette.inkFaint }}>{"★".repeat(b.friendRating)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FriendProfileModal ───────────────────────────────────────────────────────
function FriendProfileModal({ friend, user, onClose }) {
  const [friendBooks, setFriendBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [expandedStat, setExpandedStat] = useState(null);
  const [friendsOfFriend, setFriendsOfFriend] = useState([]);
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [userFriendIds, setUserFriendIds] = useState(new Set());
  const [userPendingIds, setUserPendingIds] = useState(new Set());
  const [sentToFriendOfFriend, setSentToFriendOfFriend] = useState(new Set());
  const [friendAchievements, setFriendAchievements] = useState([]);
  const [friendStreak, setFriendStreak] = useState(null);
  const [expandedGenreF, setExpandedGenreF] = useState(null);
  const [userReadBooks, setUserReadBooks] = useState([]);
  const [userStreak, setUserStreak] = useState(null);
  const [mainRequestSent, setMainRequestSent] = useState(false);
  const [mutualsExpanded, setMutualsExpanded] = useState(false);
  const [friendPublicQuotes, setFriendPublicQuotes] = useState([]);
  const [friendPet, setFriendPet] = useState(null);
  const [friendIsPublic, setFriendIsPublic] = useState(true);

  useEffect(() => {
    (async () => {
      // Books
      const { data: booksData } = await supabase
        .from("books")
        .select("title, author, status, rating, genre, review, finished_at")
        .eq("user_id", friend.id);
      setFriendBooks(booksData || []);
      setLoading(false);

      // Public quotes
      const { data: qData } = await supabase
        .from("quotes")
        .select("id, text, mood, page_number, created_at, book_id, books(title, author)")
        .eq("user_id", friend.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10);
      setFriendPublicQuotes((qData || []).map(q => ({
        ...q,
        bookTitle: q.books?.title || null,
        bookAuthor: q.books?.author || null,
      })));

      // Achievements
      const { data: achData } = await supabase
        .from("achievements").select("achievement_key, unlocked_at").eq("user_id", friend.id);
      setFriendAchievements(achData || []);

      // Streak
      const { data: streakData } = await supabase
        .from("user_streaks").select("current_streak, longest_streak").eq("user_id", friend.id).maybeSingle();
      setFriendStreak(streakData);

      // Pet (mascota) del amigo
      const { data: petData } = await supabase
        .from("user_pets").select("pet_type, pet_name, level").eq("user_id", friend.id).maybeSingle();
      if (petData) setFriendPet(petData);

      // Privacidad del amigo (tolerante si la columna aún no existe)
      const { data: privData, error: privErr } = await supabase
        .from("users").select("is_public").eq("id", friend.id).maybeSingle();
      if (!privErr && privData) setFriendIsPublic(privData.is_public !== false);

      // Friends of friend
      const { data: fs } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${friend.id},friend_id.eq.${friend.id}`);
      const fofIds = (fs || [])
        .map((f) => (f.user_id === friend.id ? f.friend_id : f.user_id))
        .filter((id) => id !== user?.id && id !== friend.id);
      if (fofIds.length > 0) {
        const { data: profiles } = await supabase
          .from("users")
          .select("id, nombre, username, avatar_url")
          .in("id", fofIds);
        setFriendsOfFriend(profiles || []);
      }

      // User's read books + streak for compatibility
      if (user) {
        const { data: uBooks } = await supabase
          .from("books")
          .select("title, author, status, rating, genre, cover_url")
          .eq("user_id", user.id);
        setUserReadBooks((uBooks || []).filter((b) => b.status === "read"));
        const { data: uStreakData } = await supabase
          .from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle();
        setUserStreak(uStreakData);
      }

      // Current user's friendships (to show "Ya son amigos" or pending state)
      if (user) {
        const { data: ufs } = await supabase
          .from("friendships")
          .select("user_id, friend_id, status")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        const acceptedIds = new Set();
        const pendingIds = new Set();
        (ufs || []).forEach((f) => {
          const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
          if (f.status === "accepted") acceptedIds.add(otherId);
          else if (f.status === "pending" && f.user_id === user.id) pendingIds.add(otherId);
        });
        setUserFriendIds(acceptedIds);
        setUserPendingIds(pendingIds);
      }
    })();
  }, [friend.id]);

  const readBooks    = friendBooks.filter((b) => b.status === "read");
  const readingBooks = friendBooks.filter((b) => b.status === "reading");
  const wantBooks    = friendBooks.filter((b) => b.status === "want_to_read" || b.status === "wish");
  const ratedF       = readBooks.filter((b) => b.rating > 0);
  const avgF         = ratedF.length > 0 ? (ratedF.reduce((s, b) => s + b.rating, 0) / ratedF.length).toFixed(1) : null;
  const genreCountsF = {};
  friendBooks.forEach((b) => { if (b.genre) genreCountsF[b.genre] = (genreCountsF[b.genre] || 0) + 1; });
  const topGenresF = Object.entries(genreCountsF).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedRead = [...readBooks].sort(
    (a, b) => (b.finished_at ? new Date(b.finished_at) : 0) - (a.finished_at ? new Date(a.finished_at) : 0)
  );
  const friendName = friend.name || friend.nombre || "Amigo";
  const initials = friendName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // Perfil privado: solo amigos aceptados (o el propio usuario) ven la actividad.
  const isPrivateLocked = friendIsPublic === false
    && friend.id !== user?.id
    && !userFriendIds.has(friend.id);

  const secLabel = { ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.5rem" };

  async function sendRequestToFriendOfFriend(toId) {
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: toId, status: "pending" });
    if (error && error.code !== "23505") { console.error("[amigos] no se pudo enviar la solicitud:", error.message); return; }
    setSentToFriendOfFriend((prev) => new Set([...prev, toId]));
  }

  async function handleAddMainFriend() {
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: friend.id, status: "pending" });
    if (error && error.code !== "23505") { console.error("[amigos] no se pudo enviar la solicitud:", error.message); return; }
    setMainRequestSent(true);
  }

  function StatCard({ label, value, statKey, color = palette.ink }) {
    const bgMap = {
      read: palette.bgCard, all: palette.bgCard, rating: palette.bgCard, reading: palette.bgCard, want: palette.bgCard,
    };
    const borderMap = {
      read: palette.border, all: palette.border, rating: palette.border, reading: palette.border, want: palette.border,
    };
    return (
      <button
        onClick={() => setExpandedStat(statKey)}
        style={{
          flex: 1, backgroundColor: bgMap[statKey] || palette.bgCard,
          border: `1px solid ${borderMap[statKey] || palette.borderSoft}`,
          borderRadius: "12px", padding: "0.75rem 0.5rem", textAlign: "center",
          cursor: "pointer", transition: "box-shadow 0.15s",
          minHeight: "72px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.15rem",
          boxShadow: "0 2px 6px rgba(42,31,26,0.05)",
        }}
        className="hover-shadow-stat"
      >
        <div style={{ ...display, fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginTop: "0.1rem" }}>{label}</div>
        <ChevronDown size={10} color={palette.inkFaint} style={{ marginTop: "0.1rem" }} />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(42,31,26,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-y-auto scrollbar-hide"
        style={{ backgroundColor: palette.bg, maxHeight: "92vh", boxShadow: "0 -4px 40px rgba(42,31,26,0.18)" }}
      >
        {/* Cover banner */}
        <div style={{ position: "relative", height: 140, background: friend.cover_url ? "none" : BRAND.gradient, borderRadius: "1.25rem 1.25rem 0 0", overflow: "visible", flexShrink: 0 }}>
          {friend.cover_url && (
            <img src={friend.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "1.25rem 1.25rem 0 0", display: "block" }} />
          )}
          <div style={{ position: "absolute", bottom: -38, left: 20, padding: 3, borderRadius: "50%", background: BRAND.gradient, boxShadow: "0 4px 16px rgba(122,46,46,0.4)", border: `4px solid ${palette.bg}` }}>
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: getAvatarColor(friend.id || friendName), color: palette.onAccent, fontFamily: "Fraunces, serif", fontSize: "1.5rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initials}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 12, backgroundColor: "rgba(42,31,26,0.5)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
            <X size={16} color={palette.onAccent} />
          </button>
        </div>

        {/* Name + Comparar button */}
        <div style={{ paddingTop: 48, paddingLeft: 20, paddingRight: 20, paddingBottom: "0.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
          <div>
            <p style={{ ...display, fontWeight: 700, fontSize: "1.15rem", color: palette.ink, lineHeight: 1.2 }}>{friendName}</p>
            {friend.username && <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint }}>@{friend.username}</p>}
            {friend.bio && <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, marginTop: "0.3rem", lineHeight: 1.45 }}>{friend.bio}</p>}
          </div>
          {user && !isPrivateLocked && (
            <button
              onClick={() => { setShowCompare(true); setExpandedStat(null); }}
              style={{ ...display, fontSize: "0.8rem", fontWeight: 600, color: palette.accent, border: `1.5px solid ${palette.accent}55`, borderRadius: "999px", padding: "0.4rem 0.9rem", cursor: "pointer", backgroundColor: palette.accent + "10", flexShrink: 0, marginTop: "0.1rem" }}
            >
              ⚡ Comparar
            </button>
          )}
        </div>

        {/* Add friend CTA — prominent, full-width, shown when not yet friends */}
        {user && !loading && friend.id !== user.id && !userFriendIds.has(friend.id) && (
          <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: "0.75rem" }}>
            {(userPendingIds.has(friend.id) || mainRequestSent) ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", padding: "0.65rem 1rem" }}>
                <Check size={14} color={palette.success} />
                <span style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft }}>Solicitud enviada</span>
              </div>
            ) : (
              <button
                onClick={handleAddMainFriend}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", backgroundColor: palette.accent, color: palette.onAccent, border: "none", borderRadius: "12px", padding: "0.75rem 1rem", cursor: "pointer", ...display, fontSize: "0.95rem", fontWeight: 600 }}
              >
                <UserPlus size={16} />
                Agregar como amigo
              </button>
            )}
          </div>
        )}

        {/* Sub-views */}
        {showCompare ? (
          <CompareProfilesView user={user} friend={friend} friendBooks={friendBooks} onClose={() => setShowCompare(false)} />
        ) : expandedStat ? (
          <StatExpandedView stat={expandedStat} friendBooks={friendBooks} friendName={friendName} onClose={() => setExpandedStat(null)} />
        ) : (
          <div className="px-5 py-4" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin" color={palette.inkFaint} />
              </div>
            ) : isPrivateLocked ? (
              <div style={{ textAlign: "center", padding: "1.5rem 1rem 2.5rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.85rem" }}>
                  <Lock size={22} color={palette.inkFaint} />
                </div>
                <p style={{ ...display, fontSize: "1.05rem", fontWeight: 700, color: palette.ink, marginBottom: "0.35rem" }}>Este perfil es privado</p>
                <p style={{ ...body, fontSize: "0.88rem", color: palette.inkFaint, lineHeight: 1.5, maxWidth: 300, margin: "0 auto" }}>
                  Solo sus amigos pueden ver sus libros, stats y actividad. Envíale una solicitud para conocer su biblioteca.
                </p>
              </div>
            ) : (
              <>
                {/* Stat cards (clickable) */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <StatCard label="leídos" value={readBooks.length} statKey="read" color={palette.accent} />
                  <StatCard label="en total" value={friendBooks.length} statKey="all" color={palette.ink} />
                  {avgF && <StatCard label="promedio ★" value={avgF} statKey="rating" color={BRAND.amber} />}
                  {readingBooks.length > 0 && <StatCard label="leyendo" value={readingBooks.length} statKey="reading" color={palette.slate} />}
                  {wantBooks.length > 0 && <StatCard label="por leer" value={wantBooks.length} statKey="want" color={palette.sage} />}
                </div>
                <RatingDistribution books={friendBooks} />

                {/* Streak mini cards */}
                {friendStreak && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[
                      { label: "Racha actual", value: friendStreak.current_streak || 0 },
                      { label: "Mejor racha",  value: friendStreak.longest_streak  || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        flex: 1, position: "relative", overflow: "hidden",
                        background: FRIEND_STREAK_GRADIENT,
                        borderRadius: 12, padding: "0.75rem 0.75rem",
                        boxShadow: "0 4px 14px rgba(61,139,55,0.22)",
                      }}>
                        <div style={{ position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ ...display, fontSize: "2rem", fontWeight: 800, color: palette.onAccent, lineHeight: 1 }}>{value}</div>
                            <div style={{ ...body, fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", marginTop: "0.1rem" }}>días</div>
                          </div>
                          <Flame size={20} color="rgba(255,255,255,0.7)" />
                        </div>
                        <div style={{ ...body, fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", marginTop: "0.35rem" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Su compañero (mascota) — sin XP exacto */}
                {friendPet && (
                  <div>
                    <p style={secLabel}>Su compañero</p>
                    <div style={{ borderRadius: 14, padding: "1rem 1.25rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ flexShrink: 0 }}>
                        <PetDisplay petType={friendPet.pet_type} petName={friendPet.pet_name} size="medium" />
                      </div>
                      <div>
                        <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.15rem", color: palette.ink, lineHeight: 1.1 }}>
                          {friendPet.pet_name || "Su compañero"}
                        </p>
                        <p style={{ ...display, fontSize: "0.88rem", fontWeight: 600, color: palette.accent, marginTop: "0.25rem" }}>
                          Nivel {friendPet.level}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <ReadingHeatmap userId={friend.id} />

                <LiteraryCompatibility
                  userBooks={userReadBooks}
                  friendBooks={friendBooks}
                  userStreak={userStreak}
                  friendStreak={friendStreak}
                  friendName={friendName}
                />

                {/* Genres (expandable) */}
                {topGenresF.length > 0 && (
                  <div>
                    <p style={secLabel}>Géneros favoritos</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: expandedGenreF ? "0.65rem" : 0 }}>
                      {topGenresF.map(([genre, count]) => {
                        const isOpen = expandedGenreF === genre;
                        return (
                          <button
                            key={genre}
                            onClick={() => setExpandedGenreF(isOpen ? null : genre)}
                            style={{ ...body, ...genrePillStyle(genre, isOpen) }}
                          >
                            {genre} <span style={{ opacity: 0.7, fontSize: "0.75rem" }}>({count})</span>
                          </button>
                        );
                      })}
                    </div>
                    {expandedGenreF && (
                      <div style={{ backgroundColor: palette.bg, border: `1px solid ${palette.borderSoft}`, borderRadius: "10px", padding: "0.65rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        {friendBooks.filter((b) => b.genre === expandedGenreF).map((book, i) => {
                          const statusLabel = { reading: "Leyendo", want_to_read: "Por leer", wish: "Por leer", read: "Leído" }[book.status];
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <BookCoverPlaceholder title={book.title} author={book.author} width={36} height={52} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ ...display, fontSize: "0.85rem", color: palette.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
                                <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint }}>{book.author}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                                  {statusLabel && <span style={{ ...body, fontSize: "0.65rem", color: palette.inkSoft }}>{statusLabel}</span>}
                                  {book.rating > 0 && <span style={{ fontSize: "0.68rem", color: palette.amber }}>{"★".repeat(book.rating)}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Amigos en común */}
                {(() => {
                  const mutuals = friendsOfFriend.filter(fof => userFriendIds.has(fof.id));
                  if (mutuals.length === 0) return null;
                  return (
                    <div>
                      <p style={secLabel}>Amigos en común ({mutuals.length})</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ display: "flex" }}>
                          {mutuals.slice(0, 3).map((m, i) => (
                            <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, position: "relative", zIndex: 3 - i, border: `2px solid ${palette.bg}`, borderRadius: "50%", display: "inline-block" }}>
                              <Avatar author={m} size={28} />
                            </div>
                          ))}
                        </div>
                        {mutuals.length > 3 && (
                          <span style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft }}>+{mutuals.length - 3} más</span>
                        )}
                        <button
                          onClick={() => setMutualsExpanded(!mutualsExpanded)}
                          style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          {mutualsExpanded ? "ocultar ▲" : "ver todos ▼"}
                        </button>
                      </div>
                      {mutualsExpanded && (
                        <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {mutuals.map(m => (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                              <Avatar author={m} size={30} />
                              <div>
                                <p style={{ ...display, fontSize: "0.85rem", color: palette.ink, fontWeight: 600 }}>{m.nombre}</p>
                                {m.username && <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint }}>@{m.username}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sus amigos — 2-column grid */}
                {friendsOfFriend.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <p style={{ ...secLabel, marginBottom: 0 }}>Sus amigos ({friendsOfFriend.length})</p>
                      {friendsOfFriend.length > 6 && (
                        <button
                          onClick={() => setFriendsExpanded(!friendsExpanded)}
                          style={{ ...body, fontSize: "0.78rem", color: palette.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          {friendsExpanded ? "Ver menos ▲" : "Ver todos →"}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
                      {(friendsExpanded ? friendsOfFriend : friendsOfFriend.slice(0, 6)).map((fof) => {
                        const isMyFriend = userFriendIds.has(fof.id);
                        const isPending = userPendingIds.has(fof.id) || sentToFriendOfFriend.has(fof.id);
                        return (
                          <div key={fof.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 10, padding: "0.6rem 0.65rem" }}>
                            <Avatar author={fof} size={34} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ ...display, fontSize: "0.82rem", color: palette.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fof.nombre}</p>
                              {fof.username && <p style={{ ...body, fontSize: "0.7rem", color: palette.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{fof.username}</p>}
                              {isMyFriend ? (
                                <span style={{ ...body, fontSize: "0.68rem", color: palette.success }}>✓ Amigos</span>
                              ) : isPending ? (
                                <span style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint }}>Enviado</span>
                              ) : (
                                <button
                                  onClick={() => sendRequestToFriendOfFriend(fof.id)}
                                  style={{ ...display, fontSize: "0.7rem", fontWeight: 600, color: palette.bg, backgroundColor: palette.accent, border: "none", borderRadius: "999px", padding: "0.2rem 0.55rem", cursor: "pointer", marginTop: "0.15rem" }}
                                >
                                  Agregar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Currently reading */}
                {readingBooks.length > 0 && (
                  <div>
                    <p style={secLabel}>Leyendo ahora</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {readingBooks.map((book, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 8, padding: "0.6rem 0.75rem" }}>
                          <BookOpen size={14} color={palette.accent} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ ...display, fontSize: "0.9rem", color: palette.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
                            <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>{book.author}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Read books */}
                <div>
                  <p style={secLabel}>Libros leídos ({readBooks.length})</p>
                  {sortedRead.length === 0 ? (
                    <p style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint, fontStyle: "italic" }}>Aún no ha marcado libros como leídos.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {sortedRead.map((book, i) => (
                        <div key={i} style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 8, padding: "0.7rem 0.85rem" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ ...display, fontSize: "0.9rem", color: palette.ink, fontWeight: 600 }}>{book.title}</p>
                              <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, fontStyle: "italic" }}>{book.author}</p>
                            </div>
                            {book.rating > 0 && (
                              <div style={{ display: "flex", gap: "1px", flexShrink: 0, marginTop: "0.1rem" }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={10} color={palette.amber} fill={s <= book.rating ? palette.amber : "none"} />
                                ))}
                              </div>
                            )}
                          </div>
                          {book.review && (
                            <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, marginTop: "0.4rem", lineHeight: 1.5, fontStyle: "italic", borderTop: `1px solid ${palette.borderSoft}`, paddingTop: "0.4rem" }}>
                              "{book.review}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Friend achievements */}
                <div>
                  <p style={secLabel}>Logros</p>
                  <AchievementGrid unlockedAchievements={friendAchievements} friendOnly={true} />
                </div>

                {/* Public quotes */}
                {friendPublicQuotes.length > 0 && (
                  <div>
                    <p style={secLabel}>Frases guardadas ({friendPublicQuotes.length})</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {friendPublicQuotes.map(q => {
                        const moodLabel = MOOD_OPTIONS.find(m => m.key === q.mood)?.label;
                        return (
                          <div key={q.id} style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "10px", padding: "1rem 0.9rem 0.85rem", position: "relative", overflow: "hidden" }}>
                            <div style={{ position: "absolute", top: 4, left: 7, fontFamily: "Georgia, serif", fontSize: "2.8rem", lineHeight: 1, color: palette.accent + "18", userSelect: "none", pointerEvents: "none" }}>"</div>
                            <p style={{ ...body, fontSize: "0.95rem", fontStyle: "italic", color: palette.ink, lineHeight: 1.6, paddingLeft: "0.6rem", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {q.text}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.6rem", paddingLeft: "0.6rem", flexWrap: "wrap" }}>
                              {q.bookTitle && (
                                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.72rem", color: palette.inkSoft, fontWeight: 500 }}>
                                  {q.bookTitle}
                                </span>
                              )}
                              {moodLabel && (
                                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.68rem", color: palette.accent, backgroundColor: palette.accent + "15", borderRadius: "999px", padding: "0.1rem 0.45rem" }}>
                                  {moodLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ INVITE SHARE MODAL ============
function InviteShareModal({ message, url, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("[invite] no se pudo copiar el link:", err);
    }
  }

  const encoded = encodeURIComponent(`${message}\n${url}`);
  const waUrl = `https://wa.me/?text=${encoded}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encoded}`;

  return (
    <div
      onClick={handleClose}
      style={{ position: "fixed", inset: 0, zIndex: 210, backgroundColor: "rgba(42,31,26,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, backgroundColor: palette.bgCard, borderRadius: "1.5rem 1.5rem 0 0", padding: "1.75rem 1.5rem 2.25rem", boxShadow: "0 -4px 40px rgba(42,31,26,0.2)", animation: isClosing ? "slideDown 250ms cubic-bezier(0.4, 0, 1, 1) forwards" : "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div style={{ width: 36, height: 4, backgroundColor: palette.border, borderRadius: 999, margin: "0 auto 1.25rem" }} />
        <p style={{ ...display, fontSize: "1.1rem", fontWeight: 700, color: palette.ink, marginBottom: "0.35rem" }}>Invita a un amigo</p>
        <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, marginBottom: "1.25rem", lineHeight: 1.5 }}>
          {message}
        </p>

        {/* Copiable link */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: palette.bgSoft, border: `1px solid ${palette.border}`, borderRadius: "10px", padding: "0.65rem 0.85rem", marginBottom: "1rem" }}>
          <LinkIcon size={14} color={palette.inkFaint} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url.replace("https://", "")}
          </span>
          <button
            onClick={copyLink}
            style={{ ...display, fontSize: "0.78rem", fontWeight: 600, padding: "0.3rem 0.75rem", backgroundColor: copied ? palette.sage : palette.accent, color: palette.onAccent, border: "none", borderRadius: "999px", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}
          >
            {copied ? "¡Copiado! ✓" : "Copiar"}
          </button>
        </div>

        {/* Social buttons */}
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", padding: "0.7rem", backgroundColor: SOCIAL_COLORS.whatsapp, color: palette.onAccent, borderRadius: "12px", textDecoration: "none", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.85rem", fontWeight: 600 }}
          >
            WhatsApp
          </a>
          <a
            href={twUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", padding: "0.7rem", backgroundColor: SOCIAL_COLORS.x, color: palette.onAccent, borderRadius: "12px", textDecoration: "none", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.85rem", fontWeight: 600 }}
          >
            Twitter / X
          </a>
        </div>
      </div>
    </div>
  );
}

function ReaderView({ cuento, user, onClose, onAddToLibrary }) {
  const containerRef = useRef(null);
  const [scrollPct, setScrollPct] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(null);
  const [addedToLibrary, setAddedToLibrary] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const pct = el.scrollHeight <= el.clientHeight
      ? 1
      : el.scrollTop / (el.scrollHeight - el.clientHeight);
    setScrollPct(pct);
    if (pct >= 0.95 && !finished) {
      setFinished(true);
      setTimeout(() => setShowModal(true), 400);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 }, colors: [BRAND.wine, BRAND.amber, BRAND.cream] });
      logReadingSession({ userId: user.id, bookId: null, pagesRead: 1, mood: null }).catch((err) => console.error("[reading] no se pudo registrar la lectura del cuento:", err));
    }
  }

  async function handleShare() {
    const msg = `Acabo de leer "${cuento.titulo}" de ${cuento.autor} en Folio 📚`;
    const url = "https://folio-final.vercel.app";
    try {
      if (navigator.share) {
        await navigator.share({ title: cuento.titulo, text: msg, url });
      } else {
        await navigator.clipboard.writeText(`${msg}\n${url}`);
        setShareStatus("¡Copiado! ✓");
        setTimeout(() => setShareStatus(""), 2500);
      }
    } catch { /* share cancelado o portapapeles no disponible */ }
  }

  function handleAddToLibrary() {
    if (addedToLibrary) return;
    onAddToLibrary?.({
      id: crypto.randomUUID(),
      title: cuento.titulo,
      author: cuento.autor,
      status: "read",
      genre: cuento.generos?.[0] || "",
      summary: cuento.desc || "",
      rating: 0,
      review: "",
      coverUrl: null,
      moodTags: [],
      addedAt: Date.now(),
      finishedAt: Date.now(),
    });
    setAddedToLibrary(true);
  }

  const pct = Math.min(100, Math.round(scrollPct * 100));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, backgroundColor: palette.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.65rem 1rem",
        backgroundColor: palette.bg,
        borderBottom: `1px solid ${palette.border}`,
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.4rem", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <ChevronLeft size={22} color={palette.ink} />
        </button>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <p style={{ ...display, fontSize: "0.88rem", color: palette.ink, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cuento.titulo}
          </p>
          <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, margin: 0 }}>{cuento.autor}</p>
        </div>
        <span style={{ ...body, fontSize: "0.75rem", color: pct >= 95 ? palette.sage : palette.inkFaint, fontWeight: pct >= 95 ? 700 : 400, flexShrink: 0, transition: "color 0.3s" }}>
          {pct >= 95 ? "✓ Leído" : `${pct}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, backgroundColor: palette.borderSoft, flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: pct >= 95 ? palette.sage : palette.accent, transition: "width 0.2s, background-color 0.4s" }} />
      </div>

      {/* Story content */}
      <div ref={containerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "2rem 1.5rem 5rem", WebkitOverflowScrolling: "touch" }}>
        <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: "1.7rem", fontStyle: "italic", color: palette.ink, marginBottom: "0.3rem", lineHeight: 1.25 }}>
          {cuento.titulo}
        </h1>
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.9rem", color: palette.inkFaint, marginBottom: "2.5rem" }}>
          {cuento.autor} · {cuento.duracion}
        </p>

        {cuento.texto.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
          <p key={i} style={{ fontFamily: "'EB Garamond', serif", fontSize: "18px", lineHeight: 1.85, color: palette.ink, marginBottom: "1.3rem", textAlign: "justify" }}>
            {para.trim()}
          </p>
        ))}

        {finished && (
          <p style={{ ...display, fontSize: "1.1rem", fontStyle: "italic", color: palette.inkFaint, textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
            Fin.
          </p>
        )}
      </div>

      {/* Completion sheet */}
      {showModal && (
        <div
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(42,31,26,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "backdropIn 200ms ease-out", zIndex: 10 }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, backgroundColor: palette.bgCard, borderRadius: "1.5rem 1.5rem 0 0", padding: "1.75rem 1.5rem 2.25rem", boxShadow: "0 -4px 40px rgba(42,31,26,0.18)", animation: "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)" }}
          >
            <div style={{ width: 36, height: 4, backgroundColor: "rgba(42,31,26,0.18)", borderRadius: 999, margin: "0 auto 1.5rem" }} />
            <p style={{ ...display, fontSize: "1.3rem", fontStyle: "italic", color: palette.ink, textAlign: "center", marginBottom: "0.25rem" }}>¿Qué te pareció?</p>
            <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, textAlign: "center", marginBottom: "1.25rem" }}>{cuento.titulo} · {cuento.autor}</p>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {[
                { key: "loved", label: "Me encantó", emoji: "🤩" },
                { key: "ok", label: "Estuvo bien", emoji: "👍" },
                { key: "meh", label: "No era para mí", emoji: "😐" },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setRating(opt.key)}
                  style={{
                    flex: 1, padding: "0.65rem 0.25rem", borderRadius: "10px",
                    border: `1.5px solid ${rating === opt.key ? palette.accent : palette.border}`,
                    backgroundColor: rating === opt.key ? "rgba(122,46,46,0.08)" : "transparent",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{opt.emoji}</span>
                  <span style={{ ...body, fontSize: "0.7rem", color: rating === opt.key ? palette.accent : palette.inkSoft, fontWeight: rating === opt.key ? 600 : 400 }}>{opt.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleAddToLibrary}
              disabled={addedToLibrary}
              style={{
                width: "100%", padding: "0.82rem", borderRadius: "10px",
                backgroundColor: addedToLibrary ? "transparent" : palette.ink,
                color: addedToLibrary ? palette.inkFaint : palette.onAccent,
                border: addedToLibrary ? `1px solid ${palette.border}` : "none",
                ...body, fontSize: "0.92rem", fontWeight: 600, cursor: addedToLibrary ? "default" : "pointer",
                marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              {addedToLibrary ? "✓ Agregado a tu biblioteca" : "+ Agregar a mi biblioteca"}
            </button>

            <button
              onClick={handleShare}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "10px", backgroundColor: "transparent",
                border: `1px solid ${palette.border}`, color: palette.inkSoft,
                ...body, fontSize: "0.88rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              <Share2 size={15} />
              {shareStatus || "Compartir que lo leí"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeakInviteCard({ message, url, userInitial, onClose, dark = false }) {
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleInvite() {
    markInviteCardShown();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Folio — Tu biblioteca personal", text: message, url });
        onClose();
      } else {
        setInviteOpen(true);
      }
    } catch (e) {
      if (e.name !== "AbortError") setInviteOpen(true);
      else onClose();
    }
  }

  const ink = dark ? BRAND.cream : palette.ink;
  const inkFaint = dark ? "rgba(244,237,224,0.4)" : palette.inkFaint;
  const bg = dark ? "rgba(244,237,224,0.06)" : palette.bgCard;
  const borderColor = dark ? "rgba(122,46,46,0.5)" : "rgba(122,46,46,0.22)";

  return (
    <>
      <div style={{
        backgroundColor: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: "18px",
        padding: "1.35rem 1.25rem 1rem",
        marginTop: "0.75rem",
        animation: "slideUp 380ms cubic-bezier(0.32, 0.72, 0, 1)",
        textAlign: "center",
      }}>
        <p style={{ ...display, fontSize: "1.1rem", fontStyle: "italic", color: ink, lineHeight: 1.3, marginBottom: "1rem" }}>
          Folio es mejor<br />con alguien más
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            backgroundColor: palette.accent, display: "flex", alignItems: "center", justifyContent: "center",
            color: palette.onAccent, ...display, fontSize: "1.1rem", fontWeight: 700, flexShrink: 0,
          }}>
            {(userInitial || "?").toString().toUpperCase()}
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            border: `2px dashed ${inkFaint}`, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Plus size={18} strokeWidth={2} color={inkFaint} />
          </div>
        </div>
        <button
          onClick={handleInvite}
          style={{
            ...display, fontSize: "0.95rem", fontWeight: 600,
            backgroundColor: palette.accent, color: palette.onAccent,
            border: "none", borderRadius: "999px",
            padding: "0.7rem 0", width: "100%",
            cursor: "pointer", marginBottom: "0.45rem",
            boxShadow: "0 4px 14px rgba(122,46,46,0.3)",
          }}
        >
          Invitar amigo
        </button>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            ...body, fontSize: "0.82rem", color: inkFaint,
            padding: "0.35rem",
          }}
        >
          Ahora no
        </button>
      </div>
      {inviteOpen && <InviteShareModal message={message} url={url} onClose={() => { setInviteOpen(false); onClose(); }} />}
    </>
  );
}

// ============ FRIENDS VIEW ============
function FriendsView({ user, onPendingChange, onMessagesRead, isOnline = true }) {
  const [subtab, setSubtab] = useState("amigos");
  const [query, setQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState([]);
  const [sentPending, setSentPending] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendStreaks, setFriendStreaks] = useState({});
  const [friendLastBooks, setFriendLastBooks] = useState({});
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatFriend, setChatFriend] = useState(null);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());
  const [friendIds, setFriendIds] = useState(new Set());
  const [incomingPendingIds, setIncomingPendingIds] = useState(new Set());
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  async function handleFriendsInvite() {
    const username = user.username || user.name || "Alguien";
    const refUrl = `https://folio-final.vercel.app?ref=${encodeURIComponent(username)}`;
    const msg = `${user.name || username} te invita a Folio. Lleva tu biblioteca, comparte lo que lees y descubre nuevos libros con tus amigos.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Folio — Tu biblioteca personal", text: msg, url: refUrl });
      } else {
        setInviteModalOpen(true);
      }
    } catch (e) {
      if (e.name !== "AbortError") setInviteModalOpen(true);
    }
  }

  useEffect(() => {
    loadFriends();
  }, [user.id]);

  async function loadFriends() {
    setLoadingFriends(true);
    const { data: rows } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (!rows || rows.length === 0) {
      setPending([]); setSentPending([]); setFriends([]);
      setFriendIds(new Set()); setSentRequestIds(new Set()); setIncomingPendingIds(new Set());
      setLoadingFriends(false);
      onPendingChange?.(0);
      return;
    }

    const accepted = rows.filter((r) => r.status === "accepted");
    const incomingPending = rows.filter((r) => r.status === "pending" && r.friend_id === user.id);
    const outgoingPending = rows.filter((r) => r.status === "pending" && r.user_id === user.id);

    const acceptedIds = new Set(accepted.map((r) => (r.user_id === user.id ? r.friend_id : r.user_id)));
    const sentIds = new Set(outgoingPending.map((r) => r.friend_id));
    const incomingIds = new Set(incomingPending.map((r) => r.user_id));
    setFriendIds(acceptedIds);
    setSentRequestIds(sentIds);
    setIncomingPendingIds(incomingIds);

    const allIds = [...new Set([...acceptedIds, ...incomingIds, ...sentIds])];
    const { data: profiles } = allIds.length > 0
      ? await supabase.from("users").select("id, nombre, username, bio, avatar_url, cover_url").in("id", allIds)
      : { data: [] };

    const profileMap = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });

    const pendingRows = incomingPending.map((r) => ({
      ...r,
      profile: profileMap[r.user_id] || { id: r.user_id, nombre: "Usuario", username: null, avatar_url: null },
    }));
    setPending(pendingRows);
    onPendingChange?.(pendingRows.length);

    const sentRows = outgoingPending.map((r) => ({
      ...r,
      profile: profileMap[r.friend_id] || { id: r.friend_id, nombre: "Usuario", username: null, avatar_url: null },
    }));
    setSentPending(sentRows);

    // Conversations for chats subtab
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, last_message_at, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const convActivityMap = {};
    const convsWithProfile = [];
    (convs || []).forEach((c) => {
      const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
      convActivityMap[otherId] = c.last_message_at || c.created_at || "1970-01-01";
      if (profileMap[otherId]) {
        convsWithProfile.push({ ...c, otherProfile: profileMap[otherId], otherId });
      }
    });
    setConversations(convsWithProfile);

    // Fetch last message preview + unread counts per conversation
    if (convsWithProfile.length > 0) {
      const convIds = convsWithProfile.map((c) => c.id);
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("conversation_id, content, sender_id, created_at, read_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMsgMap = {};
      const unreadMap = {};
      (lastMsgs || []).forEach((m) => {
        if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
        if (m.sender_id !== user.id && !m.read_at) {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        }
      });
      setConversations((prev) => prev.map((c) => ({ ...c, lastMsg: lastMsgMap[c.id] || null })));
      setUnreadCounts(unreadMap);
    }

    const acceptedFriends = accepted.map((r) => {
      const fId = r.user_id === user.id ? r.friend_id : r.user_id;
      return { ...r, profile: profileMap[fId] || { id: fId, nombre: "Usuario", username: null, avatar_url: null, cover_url: null }, friendId: fId };
    }).sort((a, b) => {
      const aTime = convActivityMap[a.friendId] || "1970-01-01";
      const bTime = convActivityMap[b.friendId] || "1970-01-01";
      return bTime.localeCompare(aTime);
    });
    setFriends(acceptedFriends);
    setLoadingFriends(false);

    // Load streaks + last books for friend cards
    if (acceptedFriends.length > 0) {
      const fIds = acceptedFriends.map((r) => r.friendId);
      const [{ data: streaks }, { data: lastBooks }] = await Promise.all([
        supabase.from("user_streaks").select("user_id, current_streak").in("user_id", fIds),
        supabase.from("books").select("user_id, title, author").in("user_id", fIds).eq("status", "read")
          .order("finished_at", { ascending: false }),
      ]);
      const streakMap = {};
      (streaks || []).forEach((s) => { streakMap[s.user_id] = s.current_streak; });
      setFriendStreaks(streakMap);
      const lastBookMap = {};
      (lastBooks || []).forEach((b) => { if (!lastBookMap[b.user_id]) lastBookMap[b.user_id] = b; });
      setFriendLastBooks(lastBookMap);
    }
  }

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const term = sanitizeSearchTerm(val);
      if (!term) { setSearchResults([]); return; }
      setSearching(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, nombre, username, bio, avatar_url, cover_url")
        .or(`username.ilike.%${term}%,nombre.ilike.%${term}%`)
        .neq("id", user.id)
        .limit(10);
      if (error) console.error("[amigos] búsqueda de usuarios falló:", error.message);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
  }

  async function sendRequest(toId) {
    setActionLoading((p) => ({ ...p, [toId]: true }));
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: toId, status: "pending" });
    if (error && error.code !== "23505") {
      console.error("[amigos] no se pudo enviar la solicitud:", error.message);
      setActionLoading((p) => ({ ...p, [toId]: false }));
      return;
    }
    const { error: notifErr } = await supabase.from("notifications").insert({ user_id: toId, actor_id: user.id, type: "friend_request", related_id: user.id, read: false });
    if (notifErr) console.error("[notif] friend_request no se pudo crear:", notifErr.message);
    setSentRequestIds((prev) => new Set([...prev, toId]));
    setActionLoading((p) => ({ ...p, [toId]: false }));
    checkAchievements(user.id, user.name);
  }

  async function acceptRequest(row) {
    setActionLoading((p) => ({ ...p, [row.id]: true }));
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", row.id);
    if (error) console.error("[amigos] no se pudo aceptar la solicitud:", error.message);
    setActionLoading((p) => ({ ...p, [row.id]: false }));
    await loadFriends();
    if (!error) checkAchievements(user.id, user.name);
  }

  async function rejectRequest(row) {
    setActionLoading((p) => ({ ...p, [row.id]: true }));
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    if (error) console.error("[amigos] no se pudo rechazar la solicitud:", error.message);
    setActionLoading((p) => ({ ...p, [row.id]: false }));
    await loadFriends();
  }

  function getInitials(name) {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }

  function FriendAvatar({ profile, size = 40 }) {
    return profile.avatar_url ? (
      <img
        src={profile.avatar_url}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: getAvatarColor(profile.id || profile.nombre),
          color: palette.onAccent,
          fontFamily: "Fraunces, serif",
          fontSize: size * 0.35,
          fontWeight: 600,
        }}
      >
        {getInitials(profile.nombre)}
      </div>
    );
  }

  const inputStyle = {
    ...body,
    flex: 1,
    padding: "12px 16px",
    backgroundColor: palette.bgCard,
    border: `1.5px solid ${palette.border}`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
  };

  if (!isOnline) {
    return (
      <div className="px-4 sm:px-6 py-5 max-w-lg mx-auto" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <WifiOff size={32} color={palette.border} style={{ margin: "0 auto 1rem", display: "block" }} />
        <p style={{ ...display, fontSize: "1.2rem", fontStyle: "italic", color: palette.inkSoft, marginBottom: "0.5rem" }}>Sin conexión</p>
        <p style={{ ...body, color: palette.inkFaint, fontSize: "0.9rem", lineHeight: 1.5 }}>
          El chat y la sección de amigos requieren conexión a internet.
        </p>
      </div>
    );
  }

  if (chatFriend) {
    return (
      <div className="max-w-2xl mx-auto">
        <ChatView
          user={user}
          friend={chatFriend}
          onBack={() => setChatFriend(null)}
          onMessagesRead={onMessagesRead}
        />
      </div>
    );
  }

  const totalUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
  const subtabs = [
    { id: "amigos", label: "Mis amigos" },
    { id: "solicitudes", label: `Solicitudes${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { id: "chats", label: `Chats${totalUnread > 0 ? ` · ${totalUnread}` : ""}` },
  ];

  return (
    <div className="px-4 sm:px-6 py-5 max-w-lg mx-auto">
      {/* Header */}
      <h2 style={{ ...ts.h1, color: palette.ink, marginBottom: "1rem" }}>
        Amigos
      </h2>

      {/* Invite button */}
      <button
        onClick={handleFriendsInvite}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "0.875rem 1rem", marginBottom: "1rem", border: `1.5px solid ${palette.accent}`, borderRadius: "14px", backgroundColor: "transparent", color: palette.accent, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
      >
        <UserPlus size={18} strokeWidth={2} />
        Invitar amigos a Folio
      </button>

      {/* Search — always visible */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <Search size={15} color={palette.inkFaint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Buscar por nombre o @usuario…"
          style={{ ...inputStyle, paddingLeft: "2.4rem", paddingRight: searching ? "2.4rem" : "1rem", borderRadius: "999px" }}
        />
        {searching && <Loader2 size={15} className="animate-spin" color={palette.inkFaint} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }} />}
      </div>

      {/* Search results overlay */}
      {(searchResults.length > 0 || (query && !searching)) && (
        <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "14px", padding: "0.75rem", marginBottom: "1rem", boxShadow: "0 4px 20px rgba(42,31,26,0.1)" }}>
          {searchResults.length === 0 ? (
            <p style={{ ...body, fontSize: "0.88rem", color: palette.inkFaint, fontStyle: "italic", textAlign: "center", padding: "0.5rem 0" }}>No se encontraron usuarios.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {searchResults.map((u) => {
                const isFriend = friendIds.has(u.id);
                const hasSent = sentRequestIds.has(u.id);
                const hasIncoming = incomingPendingIds.has(u.id);
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.25rem" }}>
                    <FriendAvatar profile={u} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink }}>{u.nombre}</p>
                      {u.username && <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>@{u.username}</p>}
                    </div>
                    {isFriend ? (
                      <span style={{ ...body, fontSize: "0.76rem", color: palette.sage, flexShrink: 0 }}>Ya son amigos</span>
                    ) : hasSent ? (
                      <span style={{ ...body, fontSize: "0.76rem", color: palette.inkFaint, flexShrink: 0 }}>Enviada ✓</span>
                    ) : hasIncoming ? (
                      <button onClick={() => { const row = pending.find((r) => r.user_id === u.id); if (row) acceptRequest(row); }}
                        style={{ ...display, fontSize: "0.76rem", padding: "0.3rem 0.7rem", backgroundColor: palette.sage, color: palette.onAccent, borderRadius: "20px", fontWeight: 500, flexShrink: 0, border: "none", cursor: "pointer" }}>
                        Aceptar
                      </button>
                    ) : (
                      <button onClick={() => sendRequest(u.id)} disabled={!!actionLoading[u.id]}
                        style={{ ...display, fontSize: "0.76rem", padding: "0.3rem 0.75rem", backgroundColor: palette.accent, color: palette.onAccent, borderRadius: "20px", fontWeight: 500, opacity: actionLoading[u.id] ? 0.6 : 1, flexShrink: 0, border: "none", cursor: "pointer" }}>
                        {actionLoading[u.id] ? "…" : "Agregar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Subtabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", backgroundColor: palette.bgSoft, borderRadius: "12px", padding: "3px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {subtabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubtab(t.id)}
            style={{
              flexShrink: 0, ...body, fontSize: "0.76rem", fontWeight: subtab === t.id ? 600 : 400,
              backgroundColor: subtab === t.id ? palette.bgCard : "transparent",
              color: subtab === t.id ? palette.ink : palette.inkFaint,
              border: "none", borderRadius: "10px", padding: "0.45rem 0.6rem",
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              boxShadow: subtab === t.id ? "0 1px 4px rgba(42,31,26,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MIS AMIGOS ── */}
      {subtab === "amigos" && (
        loadingFriends ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" color={palette.inkFaint} /></div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Users size={32} color={palette.border} style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic" }}>Aún no tienes amigos. Búscalos arriba.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            {friends.map((row) => {
              const fp = { ...row.profile, name: row.profile.nombre };
              const streak = friendStreaks[row.friendId];
              const lastBook = friendLastBooks[row.friendId];
              return (
                <div
                  key={row.id}
                  style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "14px", padding: "0.85rem", position: "relative", boxShadow: "0 2px 8px rgba(42,31,26,0.05)" }}
                >
                  {/* Chat icon top-right */}
                  <button
                    onClick={() => setChatFriend(fp)}
                    style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: palette.inkFaint, padding: "2px" }}
                    title="Enviar mensaje"
                  >
                    <MessageCircle size={15} strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => setSelectedFriend(fp)}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                  >
                    <FriendAvatar profile={row.profile} size={48} />
                    <p style={{ ...display, fontSize: "0.9rem", fontWeight: 700, color: palette.ink, marginTop: "0.5rem", lineHeight: 1.2 }}>{row.profile.nombre}</p>
                    {row.profile.username && (
                      <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint }}>@{row.profile.username}</p>
                    )}
                    {streak > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginTop: "0.35rem" }}>
                        <Flame size={11} color={palette.amber} />
                        <span style={{ ...body, fontSize: "0.72rem", color: palette.inkSoft }}>{streak} días</span>
                      </div>
                    )}
                    {lastBook && (
                      <p style={{ ...body, fontStyle: "italic", fontSize: "0.7rem", color: palette.inkFaint, marginTop: "0.2rem", lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {lastBook.title}
                      </p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── SOLICITUDES ── */}
      {subtab === "solicitudes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {pending.length === 0 && sentPending.length === 0 ? (
            <p style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint, fontStyle: "italic", textAlign: "center", padding: "2rem 0" }}>
              No tienes solicitudes pendientes.
            </p>
          ) : (
            <>
              {pending.length > 0 && (
                <div>
                  <p style={{ ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.6rem" }}>Recibidas</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {pending.map((row) => (
                      <div key={row.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", padding: "0.75rem" }}>
                        <FriendAvatar profile={row.profile} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink }}>{row.profile.nombre}</p>
                          {row.profile.username && <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>@{row.profile.username}</p>}
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => acceptRequest(row)} disabled={!!actionLoading[row.id]}
                            style={{ ...display, fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.75rem", backgroundColor: palette.sage, color: palette.onAccent, borderRadius: "20px", border: "none", cursor: "pointer", opacity: actionLoading[row.id] ? 0.6 : 1 }}>
                            Aceptar
                          </button>
                          <button onClick={() => rejectRequest(row)} disabled={!!actionLoading[row.id]}
                            style={{ ...display, fontSize: "0.78rem", fontWeight: 500, padding: "0.35rem 0.75rem", backgroundColor: "transparent", color: palette.danger, borderRadius: "20px", border: `1.5px solid ${palette.danger}`, cursor: "pointer", opacity: actionLoading[row.id] ? 0.6 : 1 }}>
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sentPending.length > 0 && (
                <div>
                  <p style={{ ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 500, marginBottom: "0.6rem" }}>Enviadas</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {sentPending.map((row) => (
                      <div key={row.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", padding: "0.75rem" }}>
                        <FriendAvatar profile={row.profile} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink }}>{row.profile.nombre}</p>
                          {row.profile.username && <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>@{row.profile.username}</p>}
                        </div>
                        <span style={{ ...body, fontSize: "0.75rem", color: palette.amberInk, backgroundColor: `${palette.amber}1A`, border: `1px solid ${palette.amber}55`, borderRadius: "20px", padding: "3px 10px", flexShrink: 0 }}>Pendiente</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CHATS ── */}
      {subtab === "chats" && (
        conversations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <MessageCircle size={32} color={palette.border} style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic" }}>Aún no tienes conversaciones.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {conversations.map((conv) => {
              const fp = { ...conv.otherProfile, name: conv.otherProfile.nombre };
              const unread = unreadCounts[conv.id] || 0;
              const lastMsg = conv.lastMsg;
              const tsLabel = lastMsg ? timeAgo(lastMsg.created_at) : "";
              return (
                <button
                  key={conv.id}
                  onClick={() => setChatFriend(fp)}
                  className="hover-bg-soft"
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", padding: "0.75rem", textAlign: "left", cursor: "pointer", width: "100%" }}
                >
                  <FriendAvatar profile={conv.otherProfile} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink }}>{conv.otherProfile.nombre}</p>
                    {lastMsg && (
                      <p style={{ ...body, fontSize: "0.78rem", color: unread > 0 ? palette.ink : palette.inkFaint, fontWeight: unread > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lastMsg.sender_id === user.id ? "Tú: " : ""}{lastMsg.content}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
                    {tsLabel && <span style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint }}>{tsLabel}</span>}
                    {unread > 0 && (
                      <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: palette.slate, color: palette.onAccent, fontSize: "0.65rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {selectedFriend && (
        <FriendProfileModal friend={selectedFriend} user={user} onClose={() => setSelectedFriend(null)} />
      )}
      {inviteModalOpen && (() => {
        const username = user.username || user.name || "Alguien";
        const refUrl = `https://folio-final.vercel.app?ref=${encodeURIComponent(username)}`;
        const msg = `${user.name || username} te invita a Folio. Lleva tu biblioteca, comparte lo que lees y descubre nuevos libros con tus amigos.`;
        return <InviteShareModal message={msg} url={refUrl} onClose={() => setInviteModalOpen(false)} />;
      })()}
    </div>
  );
}

// Drawer de amigos (lista + búsqueda + solicitudes + chats) — abre desde Social
function AmigosSheet({ user, onClose, onPendingChange, onMessagesRead }) {
  return (
    <div className="fixed inset-0 z-[60]" style={{ backgroundColor: "rgba(42,31,26,0.5)", animation: "backdropIn 200ms ease-out" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(440px, 100%)", backgroundColor: palette.bg, overflowY: "auto", boxShadow: "-8px 0 30px rgba(0,0,0,0.25)", animation: "slideInRight 280ms cubic-bezier(0.32,0.72,0,1)", paddingTop: "env(safe-area-inset-top)" }}
      >
        <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1rem", borderBottom: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bg + "F5", backdropFilter: "blur(8px)" }}>
          <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.2rem", color: palette.ink }}>Amigos</h2>
          <button onClick={onClose} aria-label="Cerrar" className="btn-press" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}>
            <X size={22} color={palette.inkSoft} />
          </button>
        </div>
        <FriendsView
          user={user}
          onPendingChange={onPendingChange}
          onMessagesRead={onMessagesRead}
          isOnline={true}
        />
      </div>
    </div>
  );
}

// Social — feed de amigos con acceso a amigos y notificaciones
function SocialView({ user, onAdd, setTab, books, isOnline, pendingNavigation, onNavigationDone, onOpenAmigos, onOpenNotifs, unreadNotifs = 0, pendingCount = 0 }) {
  return (
    <div>
      <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "1rem 1rem 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "Fraunces, serif", fontWeight: 800, fontSize: "1.4rem", color: palette.ink }}>Social</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={onOpenAmigos} aria-label="Amigos" className="btn-press" style={{ position: "relative", background: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 999, cursor: "pointer", padding: "0.5rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Users size={18} color={palette.inkSoft} />
            <span style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, fontWeight: 600 }}>Amigos</span>
            {pendingCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, backgroundColor: palette.badge, color: palette.onAccent, borderRadius: 999, fontSize: "0.55rem", fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{pendingCount > 9 ? "9+" : pendingCount}</span>
            )}
          </button>
          <button onClick={onOpenNotifs} aria-label="Notificaciones" className="btn-press" style={{ position: "relative", background: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 999, cursor: "pointer", padding: "0.5rem", display: "flex" }}>
            <Bell size={18} color={palette.inkSoft} />
            {unreadNotifs > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, backgroundColor: palette.badge, color: palette.onAccent, borderRadius: 999, fontSize: "0.55rem", fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{unreadNotifs > 9 ? "9+" : unreadNotifs}</span>
            )}
          </button>
        </div>
      </div>
      <FeedView user={user} onAdd={onAdd} setTab={setTab} books={books} isOnline={isOnline} pendingNavigation={pendingNavigation} onNavigationDone={onNavigationDone} />
    </div>
  );
}

// ============ NOTIFICATIONS SHEET ============
function NotificationsSheet({ user, onClose, onNotifsRead, onNavigate }) {
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifs();
  }, [user?.id]);

  async function fetchNotifs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          read,
          created_at,
          post_id,
          comment_id,
          actor:actor_id (
            id,
            nombre,
            avatar_url,
            username
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Catch error notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = (type) => {
    if (type === "like_post") return "le dio like a tu publicación";
    if (type === "like_comment") return "le dio like a tu comentario";
    if (type === "comment") return "comentó en tu publicación";
    return "interactuó con tu contenido";
  };

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000, animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "65vh", backgroundColor: palette.bgCard, borderRadius: "20px 20px 0 0", zIndex: 1001, display: "flex", flexDirection: "column", animation: isClosing ? "slideDown 250ms cubic-bezier(0.4, 0, 1, 1) forwards" : "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 40, height: 4, backgroundColor: palette.border, borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px", flexShrink: 0 }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: palette.ink }}>Notificaciones</span>
          {notifications.length > 0 && (
            <button
              onClick={async () => {
                await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                onNotifsRead?.();
              }}
              style={{ background: "none", border: "none", color: palette.accent, fontSize: 13, cursor: "pointer" }}
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: palette.inkFaint }}>Cargando...</div>
          ) : notifications.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 12 }}>
              <Bell size={32} color={palette.border} strokeWidth={1.5} />
              <span style={{ fontSize: 14, color: palette.inkFaint }}>Sin notificaciones por ahora</span>
            </div>
          ) : (
            notifications.map((notif) => {
              if (!notif) return null;
              const actor = notif.actor || {};
              const actorName = actor.nombre || actor.username || "Alguien";
              const initials = actorName.slice(0, 2).toUpperCase();
              return (
                <div
                  key={notif.id}
                  onClick={async () => {
                    await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                    onNotifsRead?.();
                    onClose();
                    if (notif.post_id) {
                      onNavigate?.(notif.post_id, notif.type === "like_comment");
                    }
                  }}
                  style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 8px", backgroundColor: notif.read ? "transparent" : palette.unreadBg, borderRadius: 10, marginBottom: 4, cursor: "pointer" }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: getAvatarColor(actor.id || actorName), display: "flex", alignItems: "center", justifyContent: "center", color: palette.onAccent, fontSize: 13, fontWeight: 600, flexShrink: 0, overflow: "hidden" }}>
                    {actor.avatar_url ? (
                      <img src={actor.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} alt="" />
                    ) : initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: palette.ink }}>
                      <strong>{actorName}</strong>{" "}{typeLabel(notif.type)}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: palette.inkFaint }}>
                      {notif.created_at ? new Date(notif.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  {!notif.read && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: palette.accent, flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ============ UAM LIBRARY ============
const UAM_AREAS = ["Todas", "Ingeniería", "Ciencias", "Literatura", "Filosofía", "Historia", "Arte"];
const UAM_STATUS_LABELS = { want_to_read: "Quiero leer", reading: "Leyendo", read: "Leído" };

function UAMLibraryView({ books, onAdd }) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("Todas");
  const [addingId, setAddingId] = useState(null);
  const [addStatus, setAddStatus] = useState("want_to_read");

  const filtered = UAM_CATALOG.filter((b) => {
    const q = search.toLowerCase();
    return (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      && (area === "Todas" || b.area === area);
  });

  function getLibraryMatch(uamBook) {
    return books.find((b) => b.title.toLowerCase() === uamBook.title.toLowerCase());
  }

  // Deterministic availability: ~66% available, stable per book
  function isAvailable(uamBook) {
    return hashString(uamBook.id) % 3 !== 0;
  }

  async function handleAdd(uamBook) {
    await onAdd({
      id: crypto.randomUUID(),
      title: uamBook.title,
      author: uamBook.author,
      status: addStatus,
      genre: uamBook.area,
      summary: "",
      moodTags: [],
      coverUrl: null,
      rating: 0,
      review: "",
      addedAt: Date.now(),
      isUamBook: true,
    });
    setAddingId(null);
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      {/* Banner */}
      <div style={{ backgroundColor: `${palette.accent}12`, border: `1px solid ${palette.accent}38`, borderRadius: "10px", padding: "0.7rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <GraduationCap size={17} color={palette.accent} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft, lineHeight: 1.4 }}>
          <span style={{ ...display, fontWeight: 600, color: palette.accent }}>Próximamente:</span>{" "}
          catálogo completo de la Biblioteca UAM-I con disponibilidad en tiempo real.
        </p>
      </div>

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: "0.9rem" }}>
        <Search size={14} color={palette.inkFaint} strokeWidth={2} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o autor…"
          style={{ ...body, width: "100%", padding: "0.65rem 0.9rem 0.65rem 2.4rem", borderRadius: "8px", border: `1px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, fontSize: "0.95rem", boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {/* Filtros de área */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ marginBottom: "1.25rem" }}>
        {UAM_AREAS.map((a) => {
          const active = area === a;
          return (
            <button
              key={a}
              onClick={() => setArea(a)}
              className="whitespace-nowrap flex-shrink-0 transition-all hover:opacity-80"
              style={{ ...display, fontSize: "0.8rem", fontWeight: active ? 600 : 400, padding: "0.3rem 0.85rem", borderRadius: "999px", backgroundColor: active ? palette.ink : "transparent", color: active ? palette.bg : palette.inkSoft, border: `1px solid ${active ? palette.ink : palette.border}`, cursor: "pointer" }}
            >
              {a}
            </button>
          );
        })}
      </div>

      {/* Contador */}
      <p style={{ ...body, fontSize: "0.77rem", color: palette.inkFaint, marginBottom: "0.9rem" }}>
        {filtered.length} {filtered.length === 1 ? "libro" : "libros"}
      </p>

      {/* Catálogo */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ ...display, fontSize: "1.1rem", fontStyle: "italic", color: palette.inkSoft }}>Sin resultados</p>
          <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, marginTop: "0.3rem" }}>Intenta con otro término o área</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {filtered.map((uamBook) => {
            const libMatch = getLibraryMatch(uamBook);
            const available = isAvailable(uamBook);
            const isAdding = addingId === uamBook.id;

            return (
              <div
                key={uamBook.id}
                style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", gap: "0.85rem", alignItems: "flex-start" }}
              >
                <BookCoverPlaceholder title={uamBook.title} author={uamBook.author} width={50} height={72} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Título */}
                  <p style={{ ...display, fontWeight: 600, fontStyle: "italic", fontSize: "0.92rem", color: palette.ink, lineHeight: 1.2, marginBottom: "0.15rem" }}>
                    {uamBook.title}
                  </p>
                  {/* Autor + edición */}
                  <p style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, marginBottom: "0.35rem" }}>
                    {uamBook.author}
                    <span style={{ color: palette.inkFaint }}>{" · "}{uamBook.edition}</span>
                  </p>
                  {/* Chips: área + disponibilidad */}
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.55rem" }}>
                    <span style={{ ...display, fontSize: "0.68rem", color: palette.inkFaint, backgroundColor: palette.bg, border: `1px solid ${palette.borderSoft}`, padding: "0.1rem 0.5rem", borderRadius: "999px" }}>
                      {uamBook.area}
                    </span>
                    <span style={{ ...display, fontSize: "0.68rem", fontWeight: 700, color: available ? palette.success : palette.danger, letterSpacing: "0.02em" }}>
                      {available ? "● Disponible" : "● Prestado"}
                    </span>
                  </div>

                  {/* Estado: ya en biblioteca / agregar / selector de estado */}
                  {libMatch ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", backgroundColor: `${palette.accent}12`, border: `1px solid ${palette.accent}32`, borderRadius: "6px", padding: "0.22rem 0.6rem" }}>
                      <Check size={11} color={palette.accent} strokeWidth={2.5} />
                      <span style={{ ...display, fontSize: "0.73rem", color: palette.accent, fontWeight: 600 }}>
                        Ya en tu biblioteca · {UAM_STATUS_LABELS[libMatch.status] || libMatch.status}
                      </span>
                    </div>
                  ) : isAdding ? (
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                      {Object.entries(UAM_STATUS_LABELS).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setAddStatus(val)}
                          style={{ ...body, fontSize: "0.76rem", padding: "0.22rem 0.6rem", borderRadius: "999px", border: `1px solid ${addStatus === val ? palette.accent : palette.border}`, backgroundColor: addStatus === val ? `${palette.accent}15` : "transparent", color: addStatus === val ? palette.accent : palette.inkSoft, cursor: "pointer" }}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => handleAdd(uamBook)}
                        style={{ ...display, fontSize: "0.76rem", fontWeight: 600, color: palette.bg, backgroundColor: palette.accent, border: "none", padding: "0.22rem 0.75rem", borderRadius: "999px", cursor: "pointer" }}
                      >
                        Agregar
                      </button>
                      <button
                        onClick={() => setAddingId(null)}
                        style={{ color: palette.inkFaint, backgroundColor: "transparent", border: "none", cursor: "pointer", padding: "0.22rem 0.3rem", display: "flex", alignItems: "center" }}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingId(uamBook.id); setAddStatus("want_to_read"); }}
                      className="inline-flex items-center gap-1 transition-all hover:opacity-80"
                      style={{ ...display, fontSize: "0.76rem", fontWeight: 500, color: palette.inkSoft, backgroundColor: "transparent", border: `1px solid ${palette.border}`, padding: "0.22rem 0.7rem", borderRadius: "999px", cursor: "pointer" }}
                    >
                      <PlusCircle size={11} strokeWidth={2} /> Agregar a mi biblioteca
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ FEED COMPONENTS ============
function Avatar({ author, size = 36 }) {
  const letter = (author?.nombre || author?.name || "U")[0].toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        backgroundColor: getAvatarColor(author?.id || author?.nombre || author?.name || ""),
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden",
        fontSize: size * 0.38, fontWeight: 700, color: palette.onAccent,
        ...display,
      }}
    >
      {author?.avatar_url
        ? <img src={author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : letter}
    </div>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function PostDraftModal({ pendingPost, user, onPublish, onSkip }) {
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const book = pendingPost.book;
  const actionLabel = pendingPost.action === "started" ? "empezaste a leer" : "terminaste";

  async function handlePublish() {
    setPublishing(true);
    setPublishError("");
    try { await onPublish(content.trim() || null); }
    catch (err) { setPublishError(err?.message || "Error al publicar. Revisa la consola."); }
    finally { setPublishing(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ backgroundColor: palette.bgCard, borderRadius: "14px", padding: "1.5rem", maxWidth: 440, width: "100%", border: `1px solid ${palette.border}`, boxShadow: "0 8px 32px rgba(42,31,26,0.2)" }}>
        <p style={{ ...display, fontSize: "1.05rem", fontWeight: 600, color: palette.ink, marginBottom: "0.2rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            {pendingPost.action === "started" ? <BookOpen size={16} strokeWidth={1.8} /> : <BookmarkCheck size={16} strokeWidth={1.8} />}
            Compartir con amigos
          </span>
        </p>
        <p style={{ ...body, color: palette.inkSoft, fontSize: "0.9rem", marginBottom: "1rem", lineHeight: 1.5 }}>
          {user.name.split(" ")[0]} {actionLabel}{" "}
          <em style={{ color: palette.ink }}>{book?.title || "un libro"}</em>
          {pendingPost.action === "finished" && book?.rating > 0 && (
            <span style={{ color: palette.amber }}>{" · "}{"★".repeat(book.rating)}</span>
          )}
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Añade un comentario… (opcional)"
          rows={3}
          style={{ ...body, width: "100%", padding: "0.65rem 0.9rem", borderRadius: "8px", border: `1px solid ${palette.border}`, backgroundColor: palette.bg, color: palette.ink, fontSize: "0.95rem", resize: "none", marginBottom: "0.75rem", boxSizing: "border-box", outline: "none" }}
        />
        {publishError && (
          <p style={{ ...body, fontSize: "0.82rem", color: palette.danger, marginBottom: "0.75rem" }}>⚠️ {publishError}</p>
        )}
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onSkip} style={{ ...display, fontSize: "0.88rem", color: palette.inkSoft, backgroundColor: "transparent", border: `1px solid ${palette.border}`, padding: "0.5rem 1rem", borderRadius: "999px", cursor: "pointer" }}>
            No publicar
          </button>
          <button onClick={handlePublish} disabled={publishing} style={{ ...display, fontSize: "0.88rem", fontWeight: 600, color: palette.bg, backgroundColor: palette.accent, border: "none", padding: "0.5rem 1.25rem", borderRadius: "999px", cursor: publishing ? "default" : "pointer", opacity: publishing ? 0.7 : 1 }}>
            {publishing ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LikeButton({ postId, count, liked, onToggle, size = 18 }) {
  const [animating, setAnimating] = useState(false);
  function handleClick(e) {
    e.stopPropagation();
    haptic(HAPTIC.LIKE);
    if (!liked) { setAnimating(true); setTimeout(() => setAnimating(false), 320); }
    onToggle(postId);
  }
  return (
    <button onClick={handleClick} style={{ display: "flex", alignItems: "center", gap: "0.28rem", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
      <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
        <Heart
          size={size}
          color={palette.inkFaint}
          fill="none"
          strokeWidth={1.8}
          style={{ position: "absolute", opacity: liked ? 0 : 1, transition: "opacity 120ms ease" }}
        />
        <Heart
          size={size}
          color={palette.like}
          fill={palette.like}
          strokeWidth={0}
          className={animating ? "like-bounce" : ""}
          style={{ position: "absolute", opacity: liked ? 1 : 0, transition: "opacity 120ms ease" }}
        />
      </span>
      {count > 0 && <span style={{ fontSize: size <= 14 ? "0.72rem" : "0.82rem", color: palette.inkFaint, fontFamily: "'EB Garamond', serif", lineHeight: 1 }}>{count}</span>}
    </button>
  );
}

function PostComments({ postId, user, onCountChange, postOwnerId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [commentLikeCounts, setCommentLikeCounts] = useState({});
  const [commentLiked, setCommentLiked] = useState({});

  async function loadComments() {
    const c = await fetchComments(postId);
    setComments(c);
    setLoading(false);
    onCountChange?.(postId, c.length);
    if (c.length > 0) {
      const ids = c.map(x => x.id);
      try {
        const [{ data: allL }, { data: myL }] = await Promise.all([
          supabase.from("comment_likes").select("comment_id").in("comment_id", ids),
          supabase.from("comment_likes").select("comment_id").in("comment_id", ids).eq("user_id", user.id),
        ]);
        const lc = {};
        (allL || []).forEach(l => { lc[l.comment_id] = (lc[l.comment_id] || 0) + 1; });
        setCommentLikeCounts(lc);
        const liked = {};
        (myL || []).forEach(l => { liked[l.comment_id] = true; });
        setCommentLiked(liked);
      } catch (err) {
        console.error("[likes] no se pudieron cargar los likes de comentarios:", err);
      }
    }
  }

  async function toggleCommentLike(commentId) {
    const alreadyLiked = !!commentLiked[commentId];
    setCommentLiked(prev => ({ ...prev, [commentId]: !alreadyLiked }));
    setCommentLikeCounts(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) + (alreadyLiked ? -1 : 1)) }));
    const revert = ({ error }) => {
      if (!error || error.code === "23505") return;
      console.error("[likes] like de comentario no se guardó:", error.message);
      setCommentLiked(prev => ({ ...prev, [commentId]: alreadyLiked }));
      setCommentLikeCounts(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) + (alreadyLiked ? 1 : -1)) }));
    };
    if (alreadyLiked) {
      supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id).then(revert);
    } else {
      supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id }).then(revert);
      const comment = comments.find(c => c.id === commentId);
      if (!comment) { console.warn("[notif] like_comment: comment not found in state for id", commentId); }
      else if (comment.user_id !== user.id) {
        const notifPayload = { user_id: comment.user_id, actor_id: user.id, type: "like_comment", comment_id: commentId, read: false };
        devLog("[like-insert-pre] Inserting into notifications:", notifPayload);
        supabase.from("notifications").insert(notifPayload)
          .then(({ error }) => { if (error) console.error("[notif] no se pudo crear la notificación:", error.message); });
      }
    }
  }

  useEffect(() => {
    loadComments();
    const commentCh = supabase
      .channel(`comments:${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => loadComments())
      .subscribe();
    // TODO(audit): este canal escucha TODAS las respuestas de la app (comment_replies no tiene
    // post_id para filtrar), así que cada hilo abierto se recarga con respuestas de otros posts.
    // Requiere columna/vista nueva en el esquema.
    const replyCh = supabase
      .channel(`replies:${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comment_replies" },
        () => loadComments())
      .subscribe();
    return () => { supabase.removeChannel(commentCh); supabase.removeChannel(replyCh); };
  }, [postId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await createComment({ postId, userId: user.id, content: text.trim() });
      if (postOwnerId && postOwnerId !== user.id) {
        const notifPayload = { user_id: postOwnerId, actor_id: user.id, type: "comment", post_id: postId, read: false };
        devLog("[like-insert-pre] Inserting into notifications:", notifPayload);
        supabase.from("notifications").insert(notifPayload)
          .then(({ error }) => { if (error) console.error("[notif] no se pudo crear la notificación:", error.message); });
      }
      setText("");
      await loadComments();
      checkAchievements(user.id, user.name);
    } catch (err) { console.error("Error añadiendo comentario:", err); }
    finally { setSending(false); }
  }

  async function handleSendReply(commentId) {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await createReply({ commentId, userId: user.id, content: replyText.trim() });
      setReplyText("");
      setReplyingTo(null);
      await loadComments();
    } catch (err) { console.error("Error añadiendo respuesta:", err); }
    finally { setSendingReply(false); }
  }

  return (
    <div style={{ marginTop: "0.75rem", borderTop: `1px solid ${palette.borderSoft}`, paddingTop: "0.75rem" }}>
      {loading ? (
        <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint }}>Cargando…</p>
      ) : comments.length === 0 ? (
        <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginBottom: "0.6rem" }}>Sin comentarios aún.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.75rem" }}>
          {comments.map((c) => (
            <div key={c.id}>
              {/* Comment row */}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <Avatar author={c.author} size={26} />
                <div style={{ flex: 1 }}>
                  <div style={{ backgroundColor: palette.bg, borderRadius: "10px", padding: "0.4rem 0.7rem" }}>
                    <span style={{ ...display, fontWeight: 600, fontSize: "0.8rem", color: palette.ink }}>{c.author?.nombre || 'Usuario'} </span>
                    <span style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft }}>{c.content}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.05rem" }}>
                    <button
                      onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(""); }}
                      style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0.4rem 0 0.2rem" }}
                    >
                      Responder
                    </button>
                    <LikeButton postId={c.id} count={commentLikeCounts[c.id] || 0} liked={!!commentLiked[c.id]} onToggle={toggleCommentLike} size={13} />
                  </div>
                </div>
              </div>

              {/* Existing replies */}
              {c.replies && c.replies.length > 0 && (
                <div style={{ marginLeft: "2rem", marginTop: "0.35rem", borderLeft: `2px solid ${palette.borderSoft}`, paddingLeft: "0.65rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {c.replies.map((r) => (
                    <div key={r.id} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                      <Avatar author={r.author} size={22} />
                      <div style={{ backgroundColor: palette.bg, borderRadius: "8px", padding: "0.32rem 0.6rem", flex: 1 }}>
                        <span style={{ ...display, fontWeight: 600, fontSize: "0.76rem", color: palette.ink }}>{r.author?.nombre || 'Usuario'} </span>
                        <span style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft }}>{r.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === c.id && (
                <div style={{ marginLeft: "2rem", marginTop: "0.35rem", borderLeft: `2px solid ${palette.borderSoft}`, paddingLeft: "0.65rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <Avatar author={{ nombre: user.name }} size={22} />
                  <input
                    autoFocus
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(c.id); if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); } }}
                    placeholder="Escribe una respuesta…"
                    style={{ ...body, flex: 1, padding: "0.3rem 0.6rem", borderRadius: "999px", border: `1px solid ${palette.border}`, backgroundColor: palette.bg, color: palette.ink, fontSize: "0.82rem", outline: "none" }}
                  />
                  <button
                    onClick={() => handleSendReply(c.id)}
                    disabled={!replyText.trim() || sendingReply}
                    style={{ color: replyText.trim() && !sendingReply ? palette.accent : palette.inkFaint, backgroundColor: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                  >
                    <Send size={14} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Avatar author={{ nombre: user.name }} size={26} />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Escribe un comentario…"
          style={{ ...body, flex: 1, padding: "0.35rem 0.7rem", borderRadius: "999px", border: `1px solid ${palette.border}`, backgroundColor: palette.bg, color: palette.ink, fontSize: "0.85rem", outline: "none" }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{ color: text.trim() && !sending ? palette.accent : palette.inkFaint, backgroundColor: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
          <Send size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function BookPreviewModal({ post, onClose, onAdd }) {
  const book = post?.book;
  // Los hooks van antes del return condicional (reglas de hooks: mismo orden en cada render).
  const [isClosing, setIsClosing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  if (!book) return null;
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }

  async function handleAdd() {
    if (!onAdd || adding || added) return;
    setAdding(true);
    try {
      await onAdd({
        title: book.title,
        author: book.author,
        genre: book.genre || "",
        coverUrl: book.cover_url || "",
        status: "want_to_read",
        rating: 0,
        review: "",
        startDate: null,
        endDate: null,
      });
      setAdded(true);
    } catch (e) { console.error(e); }
    finally { setAdding(false); }
  }

  return (
    <div
      onClick={handleClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: palette.bgCard,
          borderRadius: "20px 20px 0 0",
          padding: "1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom))",
          width: "100%",
          maxWidth: 480,
          maxHeight: "70vh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(42,31,26,0.18)",
          animation: isClosing ? "slideDown 250ms cubic-bezier(0.4, 0, 1, 1) forwards" : "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border, margin: "0 auto 1.25rem" }} />
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} style={{ width: 72, height: 104, objectFit: "cover", borderRadius: "6px", flexShrink: 0, boxShadow: "0 4px 16px rgba(42,31,26,0.22)" }} />
          ) : (
            <BookCoverPlaceholder title={book.title} author={book.author} width={72} height={104} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...display, fontStyle: "italic", fontWeight: 700, fontSize: "1.2rem", color: palette.ink, marginBottom: "0.25rem", lineHeight: 1.2 }}>{book.title}</p>
            <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "0.9rem", marginBottom: "0.5rem" }}>{book.author}</p>
            {book.genre && (
              <span style={{ ...display, fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "999px", ...genreColor(book.genre) }}>{book.genre}</span>
            )}
          </div>
        </div>
        {book.review && (
          <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "0.9rem", borderLeft: `3px solid ${palette.accent}55`, paddingLeft: "0.85rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            "{book.review}"
          </p>
        )}
        <button
          onClick={added ? undefined : handleAdd}
          disabled={adding || added}
          style={{
            ...display, width: "100%", padding: "0.75rem", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 600,
            backgroundColor: added ? palette.sage : palette.accent, color: palette.bg, border: "none", cursor: added ? "default" : "pointer",
            opacity: adding ? 0.7 : 1, transition: "background-color 0.2s",
          }}
        >
          {added ? "✓ Añadido a tu biblioteca" : adding ? "Añadiendo…" : "Agregar a mi biblioteca"}
        </button>
        <button
          onClick={handleClose}
          style={{ ...display, width: "100%", padding: "0.6rem", borderRadius: "10px", fontSize: "0.88rem", color: palette.inkSoft, backgroundColor: "transparent", border: "none", cursor: "pointer", marginTop: "0.5rem" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function DailyReadingBanner({ streak, hasLoggedToday, pagesLoggedToday, onLog, onFreeze }) {
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const days = streak?.current_streak || 0;
  const hasStreak = days > 0;
  const freezesRemaining = streak?.streak_freezes_remaining ?? 1;
  const canFreeze = hasStreak && !hasLoggedToday && freezesRemaining > 0 && streak?.streak_freeze_used_at !== localDateStr();

  // Phase: 0=sin racha, 1=1-3d, 2=4-7d, 3=8+d
  const phase = days >= 8 ? 3 : days >= 4 ? 2 : days >= 1 ? 1 : 0;

  const cfg = STREAK_PHASES[phase];

  // Danger: racha activa, sin leer hoy, hora nocturna
  const hour = new Date().getHours();
  const isDanger = hasStreak && !hasLoggedToday && hour >= 20;

  // Glow
  const glowOpacity = hasLoggedToday ? "0.65" : "0.38";
  const glowSize   = hasLoggedToday ? "30px" : "20px";
  const bannerShadow = `0 0 ${glowSize} rgba(${cfg.rgb},${glowOpacity}), 0 6px 24px rgba(0,0,0,0.18)`;

  // Progress bar — meta diaria: 20 páginas
  const DAILY_GOAL = 20;
  const pct = pagesLoggedToday > 0 ? Math.min(100, Math.round((pagesLoggedToday / DAILY_GOAL) * 100)) : 0;
  const goalReached = pagesLoggedToday >= DAILY_GOAL;

  // Confeti al alcanzar meta (solo en la transición, nunca al montar)
  const prevGoalRef = useRef(goalReached);
  useEffect(() => {
    if (goalReached && !prevGoalRef.current && typeof confetti === "function") {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.35 }, colors: [BRAND.gold, BRAND.goldDeep, palette.onAccent, cfg.g0] });
      setTimeout(() => confetti({ particleCount: 35, spread: 55, origin: { y: 0.28 } }), 650);
    }
    prevGoalRef.current = goalReached;
  }, [goalReached]);

  // Fire size por fase
  const FIRE_SIZES = [22, 28, 36, 44];
  const fireSize = FIRE_SIZES[phase];

  return (
    <>
    <div
      onClick={hasLoggedToday ? undefined : onLog}
      className={`streak-banner-enter${isDanger ? " streak-danger" : ""}`}
      style={{
        position: "relative", overflow: "hidden",
        borderRadius: "20px",
        border: `2px solid ${cfg.border}99`,
        background: `linear-gradient(135deg, ${cfg.g0} 0%, ${cfg.g1} 100%)`,
        boxShadow: isDanger ? undefined : bannerShadow,
        marginBottom: "1.25rem",
        cursor: hasLoggedToday ? "default" : "pointer",
        transition: "box-shadow 500ms ease-out",
      }}
    >
      {/* Glassmorphism sheen */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)", pointerEvents: "none", borderRadius: "18px" }} />

      {/* Decorative orbs */}
      <div style={{ position: "absolute", top: -50, right: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -25, left: -15, width: 90, height: 90, borderRadius: "50%", background: "rgba(0,0,0,0.07)", pointerEvents: "none" }} />

      {/* Freeze button */}
      {canFreeze && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowFreezeModal(true); }}
          style={{
            position: "absolute", top: "10px", right: "12px", zIndex: 5,
            background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "50%", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
          title="Congelar racha"
        >
          <Snowflake size={14} color="rgba(255,255,255,0.9)" strokeWidth={2} />
        </button>
      )}

      {/* Main content */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "18px 20px 14px" }}>

        {/* Left: fuego + número + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>

          {/* Fuego (evoluciona por fase) */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Flame
              size={fireSize}
              color={palette.onAccent}
              strokeWidth={phase >= 2 ? 1.5 : 2}
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.28))", display: "block" }}
            />
            {phase === 3 && (
              <>
                <span className="sparkle-orbit" style={{ position: "absolute", top: -10, right: -8, fontSize: 13, color: BRAND.gold, lineHeight: 1 }}>✦</span>
                <span className="sparkle-orbit" style={{ position: "absolute", bottom: -4, left: -10, fontSize: 10, color: BRAND.gold, lineHeight: 1 }}>✦</span>
                <span className="sparkle-orbit" style={{ position: "absolute", top: 2, left: -12, fontSize: 9, color: BRAND.goldLight, lineHeight: 1, opacity: 0.8 }}>✦</span>
              </>
            )}
            {phase === 2 && (
              <span style={{ position: "absolute", top: -6, right: -6, fontSize: 10, color: "rgba(255,255,255,0.8)", lineHeight: 1 }}>✦</span>
            )}
          </div>

          {/* Texto */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "7px", flexWrap: "wrap" }}>
              {hasStreak && (
                <span style={{
                  fontFamily: "Fraunces, serif", fontWeight: 800,
                  fontSize: "clamp(32px, 8vw, 44px)",
                  color: palette.onAccent, lineHeight: 0.9,
                  textShadow: "0 2px 10px rgba(0,0,0,0.22)",
                  letterSpacing: "-1.5px",
                }}>
                  {days}
                </span>
              )}
              <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "16px", color: "rgba(255,255,255,0.92)", lineHeight: 1.2, fontStyle: hasStreak ? "normal" : "italic" }}>
                {hasStreak ? "días de racha" : hasLoggedToday ? "¡Leíste hoy!" : "¿Leíste hoy?"}
              </span>
            </div>
            {pagesLoggedToday > 0 && (
              <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "13px", color: "rgba(255,255,255,0.72)", margin: "3px 0 0", lineHeight: 1 }}>
                {pagesLoggedToday} {pagesLoggedToday === 1 ? "página" : "páginas"} hoy
              </p>
            )}
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={(e) => { e.stopPropagation(); onLog(); }}
          className="btn-press"
          style={{
            backgroundColor: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            color: palette.onAccent,
            border: "1.5px solid rgba(255,255,255,0.7)",
            borderRadius: "22px",
            padding: "10px 18px",
            fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "14px",
            flexShrink: 0, whiteSpace: "nowrap", cursor: "pointer",
          }}
        >
          + Páginas
        </button>
      </div>

      {/* Barra de progreso diario */}
      <div style={{ height: "3px", background: "rgba(0,0,0,0.18)", margin: "0 2px" }}>
        {pct > 0 && (
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: goalReached ? BRAND.gold : "rgba(255,255,255,0.62)",
            boxShadow: goalReached ? "0 0 8px rgba(255,215,0,0.75)" : "none",
            transition: "width 600ms ease-out, background 400ms ease, box-shadow 400ms ease",
          }} />
        )}
      </div>
    </div>

    {/* Freeze modal */}
    {showFreezeModal && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={() => setShowFreezeModal(false)}
      >
        <div
          style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem 2.5rem", width: "100%", maxWidth: 480 }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ ...display, fontSize: "1.2rem", fontWeight: 700, color: palette.ink, marginBottom: "0.5rem" }}>
            ¿Congelar tu racha hoy?
          </p>
          <p style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft, marginBottom: "1.5rem", lineHeight: 1.55 }}>
            Tienes 1 congelador este mes. Tu racha de <strong style={{ color: palette.ink }}>{days} {days === 1 ? "día" : "días"}</strong> estará protegida aunque no leas hoy.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => setShowFreezeModal(false)}
              style={{ ...body, flex: 1, fontSize: "0.9rem", backgroundColor: palette.bgSoft, color: palette.inkSoft, border: "none", borderRadius: "10px", padding: "0.75rem", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { onFreeze?.(); setShowFreezeModal(false); }}
              style={{ ...body, flex: 1, fontSize: "0.9rem", fontWeight: 700, backgroundColor: palette.freeze, color: palette.onAccent, border: "none", borderRadius: "10px", padding: "0.75rem", cursor: "pointer" }}
            >
              <Snowflake size={14} style={{ marginRight: "0.35rem" }} /> Congelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function ReadingLogModal({ user, onClose, onSuccess, onGoToAdd, pagesLoggedToday = 0, initialBook = null }) {
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const [step, setStep] = useState(initialBook ? 2 : 1);
  const [readingBooks, setReadingBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState(initialBook || null);
  const [pages, setPages] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    supabase.from("books").select("id, title, author, cover_url")
      .eq("user_id", user.id).eq("status", "reading")
      .then(({ data }) => { setReadingBooks(data || []); setLoadingBooks(false); });
  }, [user.id]);

  function motivational(p) {
    const n = parseInt(p) || 0;
    if (n <= 0) return "";
    if (n <= 10) return "¡Cada página cuenta!";
    if (n <= 50) return "¡Buen ritmo!";
    if (n <= 100) return "¡Estás en llamas!";
    return "¡Eres una máquina lectora!";
  }

  async function handleMoodSelect(mood) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await logReadingSession({
        userId: user.id,
        bookId: selectedBook.id,
        pagesRead: parseInt(pages) || null,
        mood,
      });
      playReadingSession();
      checkAchievements(user.id, user.name);
      // Las +5 gemas de la sesión las otorga el trigger del servidor al
      // insertar el reading_log; aquí solo se refleja en la UI.
      gemsEventBus.emit(5);
      gemToastBus.emit(5, "+5 gemas");
      onSuccess?.({ book: selectedBook, pages: parseInt(pages) || 0 });
    } catch (err) {
      console.error("[reading] Error registrando sesión:", err);
      setSaveError("No se pudo registrar la sesión. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", backgroundColor: palette.bg, zIndex: 9999, display: "flex", flexDirection: "column", overflowY: "auto", animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }}
    >
      <div
        style={{
          backgroundColor: palette.bg,
          padding: "1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom))",
          paddingTop: "calc(1.25rem + env(safe-area-inset-top))",
          width: "100%", maxWidth: 480, margin: "0 auto", flex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <X size={20} color={palette.inkSoft} />
          </button>
        </div>

        {/* Paso 1: ¿Qué libro? */}
        {step === 1 && (
          <>
            <p style={{ ...display, fontStyle: "italic", fontSize: "1.15rem", color: palette.ink, marginBottom: "0.15rem" }}>¿Qué libro leíste hoy?</p>
            <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginBottom: "1.25rem" }}>Paso 1 de 3</p>
            {loadingBooks ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                <Loader2 size={20} className="animate-spin" color={palette.inkFaint} />
              </div>
            ) : readingBooks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <BookOpen size={32} color={palette.border} strokeWidth={1.5} style={{ margin: "0 auto 0.5rem", display: "block" }} />
                <p style={{ ...body, color: palette.inkSoft, marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  Primero agrega un libro como "Leyendo"
                </p>
                <button
                  onClick={() => { onClose(); onGoToAdd?.(); }}
                  style={{ ...display, color: palette.onAccent, backgroundColor: palette.accent, border: "none", borderRadius: "12px", padding: "0.75rem 1.5rem", minHeight: "48px", cursor: "pointer", fontWeight: 600 }}
                >
                  Ir a Agregar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {readingBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => { setSelectedBook(book); setStep(2); }}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: palette.bg, border: `1px solid ${palette.border}`, borderRadius: "10px", padding: "0.75rem", textAlign: "left", cursor: "pointer", width: "100%", transition: "background 0.12s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = palette.bgSoft}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = palette.bg}
                  >
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" style={{ width: 40, height: 58, objectFit: "cover", borderRadius: "4px", flexShrink: 0, boxShadow: "0 2px 8px rgba(42,31,26,0.15)" }} />
                    ) : (
                      <BookCoverPlaceholder title={book.title} author={book.author} width={40} height={58} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...display, fontSize: "0.95rem", color: palette.ink, fontWeight: 600, marginBottom: "0.1rem" }}>{book.title}</p>
                      <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, fontStyle: "italic" }}>{book.author}</p>
                    </div>
                    <ChevronRight size={16} color={palette.inkFaint} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Paso 2: ¿Cuántas páginas? */}
        {step === 2 && (
          <>
            <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: palette.inkFaint, cursor: "pointer", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem", ...body, fontSize: "0.85rem", padding: 0 }}>
              ← Volver
            </button>
            <p style={{ ...display, fontStyle: "italic", fontSize: "1.15rem", color: palette.ink, marginBottom: "0.15rem" }}>¿Cuántas páginas leíste?</p>
            <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginBottom: pagesLoggedToday > 0 ? "0.65rem" : "1.5rem" }}>
              Paso 2 de 3 · <em style={{ color: palette.inkSoft }}>{selectedBook?.title}</em>
            </p>
            {pagesLoggedToday > 0 && (
              <div style={{ backgroundColor: `${BRAND.amber}14`, border: `1px solid ${BRAND.amber}30`, borderRadius: 10, padding: "0.55rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Flame size={15} color={palette.amber} strokeWidth={2} />
                <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft }}>
                  Ya llevas <strong style={{ color: palette.amber }}>{pagesLoggedToday} páginas</strong> hoy — ¿cuántas más leíste?
                </p>
              </div>
            )}
            <input
              autoFocus
              type="number"
              value={pages}
              onChange={(e) => setPages(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              min="0"
              style={{ ...display, width: "100%", fontSize: "3rem", fontWeight: 800, color: palette.ink, textAlign: "center", border: "none", borderBottom: `3px solid ${palette.border}`, backgroundColor: "transparent", outline: "none", paddingBottom: "0.5rem", marginBottom: "1rem", boxSizing: "border-box" }}
            />
            <div style={{ textAlign: "center", marginBottom: "1.5rem", minHeight: "1.5rem" }}>
              {pages && parseInt(pages) > 0 ? (
                <p style={{ ...body, fontSize: "1rem", color: palette.inkSoft }}>{motivational(pages)}</p>
              ) : (
                <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint }}>Opcional — puedes omitirlo</p>
              )}
            </div>
            <button
              onClick={() => setStep(3)}
              style={{ ...display, width: "100%", padding: "0.85rem", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 600, backgroundColor: palette.accent, color: palette.bg, border: "none", cursor: "pointer", marginTop: "20px" }}
            >
              Continuar →
            </button>
          </>
        )}

        {/* Paso 3: ¿Cómo te fue? */}
        {step === 3 && (
          <>
            <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: palette.inkFaint, cursor: "pointer", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem", ...body, fontSize: "0.85rem", padding: 0 }}>
              ← Volver
            </button>
            <p style={{ ...display, fontStyle: "italic", fontSize: "1.15rem", color: palette.ink, marginBottom: "0.15rem" }}>¿Cómo te fue?</p>
            <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginBottom: "1.5rem" }}>
              Paso 3 de 3 · <em style={{ color: palette.inkSoft }}>{selectedBook?.title}</em>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "20px" }}>
              {[
                { mood: "easy", emoji: "😤", label: "Costó trabajo" },
                { mood: "good", emoji: "😊", label: "Bien" },
                { mood: "fire", emoji: "🔥", label: "¡En llamas!" },
              ].map(({ mood: m, emoji, label }) => (
                <button
                  key={m}
                  onClick={() => handleMoodSelect(m)}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "1.1rem 1.25rem", borderRadius: "14px",
                    border: `1.5px solid ${palette.border}`,
                    backgroundColor: palette.bg, cursor: saving ? "default" : "pointer",
                    textAlign: "left", opacity: saving ? 0.7 : 1, transition: "background 0.15s, transform 0.12s",
                  }}
                  onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.backgroundColor = palette.bgSoft; e.currentTarget.style.transform = "scale(1.01)"; }}}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = palette.bg; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <span style={{ fontSize: "2.2rem", lineHeight: 1 }}>{emoji}</span>
                  <span style={{ ...display, fontSize: "1.1rem", color: palette.ink, fontWeight: 600 }}>{label}</span>
                  {saving && <Loader2 size={16} className="animate-spin" color={palette.inkFaint} style={{ marginLeft: "auto" }} />}
                </button>
              ))}
            </div>
            {saveError && (
              <p style={{ ...body, fontSize: "0.85rem", color: palette.danger, marginTop: "1rem", textAlign: "center" }}>{saveError}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FiveMinutesModal({ books, onClose, onGoToLog }) {
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 200); }
  const [selectedBook, setSelectedBook] = useState(books.length === 1 ? books[0] : null);
  const [minutes, setMinutes] = useState(5);
  const [phase, setPhase] = useState(books.length === 1 ? "setup" : "choose");
  const [secondsLeft, setSecondsLeft] = useState(300);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (navigator.vibrate) navigator.vibrate(200);
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  function startTimer() {
    setSecondsLeft(minutes * 60);
    setPhase("running");
  }

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const coverStyle = { width: 120, height: 180, borderRadius: 8, objectFit: "cover", boxShadow: "0 8px 24px rgba(42,31,26,0.28)", display: "block" };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", backgroundColor: palette.bg, zIndex: 9999, display: "flex", flexDirection: "column", overflowY: "auto", animation: isClosing ? "fadeOut 200ms ease-out forwards" : undefined }}>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
        <div style={{ width: "100%", maxWidth: 420, padding: "0 1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Phase: choose book */}
          {phase === "choose" && (
            <>
              <p style={{ ...display, fontStyle: "italic", fontWeight: 700, fontSize: "1.25rem", color: palette.ink, textAlign: "center", marginBottom: "1.5rem" }}>¿Cuál abrimos?</p>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {books.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBook(b); setPhase("setup"); }}
                    className="timer-book-hover"
                    style={{ display: "flex", alignItems: "center", gap: "0.85rem", backgroundColor: palette.bgCard, border: `1.5px solid ${palette.borderSoft}`, borderRadius: 12, padding: "0.75rem", textAlign: "left", cursor: "pointer", width: "100%" }}
                  >
                    {b.coverUrl ? (
                      <img src={b.coverUrl} alt="" style={{ width: 48, height: 70, objectFit: "cover", borderRadius: 4, flexShrink: 0, boxShadow: "0 2px 8px rgba(42,31,26,0.18)" }} />
                    ) : (
                      <div style={{ width: 48, height: 70, borderRadius: 4, backgroundColor: palette.accent, display: "flex", alignItems: "center", justifyContent: "center", color: palette.onAccent, fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                        {(b.title || "?")[0]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...display, fontSize: "0.94rem", fontWeight: 700, color: palette.ink, marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</p>
                      <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft }}>{b.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Book cover + info — shown in setup/running/done */}
          {phase !== "choose" && selectedBook && (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                {selectedBook.coverUrl ? (
                  <img src={selectedBook.coverUrl} alt="" style={coverStyle} />
                ) : (
                  <div style={{ ...coverStyle, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: palette.accent, color: palette.onAccent, fontFamily: "Fraunces, serif", fontSize: 36, fontWeight: 700 }}>
                    {(selectedBook.title || "?")[0]}
                  </div>
                )}
              </div>
              <p style={{ ...display, fontStyle: "italic", fontWeight: 700, fontSize: "1.25rem", color: palette.ink, textAlign: "center", marginBottom: "0.35rem", lineHeight: 1.25 }}>{selectedBook.title}</p>
              <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, textAlign: "center", marginBottom: "1.5rem" }}>{selectedBook.author}</p>
            </>
          )}

          {/* Phase: setup — time picker */}
          {phase === "setup" && (
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {[5, 10, 15].map(m => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  style={{ borderRadius: 20, padding: "0.6rem 1.25rem", border: `1.5px solid ${minutes === m ? palette.accent : palette.border}`, backgroundColor: minutes === m ? palette.accent : "transparent", color: minutes === m ? palette.onAccent : palette.inkSoft, ...display, fontSize: "0.92rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}

          {/* Phase: running */}
          {phase === "running" && (
            <>
              <p style={{ ...display, fontWeight: 700, fontSize: "3.5rem", color: palette.accent, lineHeight: 1, marginBottom: "0.75rem" }}>
                {fmt(secondsLeft)}
              </p>
              <p style={{ ...body, fontStyle: "italic", fontSize: "0.9rem", color: palette.inkSoft }}>Sigue leyendo...</p>
            </>
          )}

          {/* Phase: done */}
          {phase === "done" && (
            <>
              <p style={{ ...display, fontStyle: "italic", fontWeight: 700, fontSize: "1.5rem", color: palette.ink, marginBottom: "0.5rem", textAlign: "center" }}>¡Tiempo!</p>
              <p style={{ ...body, fontSize: "1rem", color: palette.inkSoft, textAlign: "center" }}>¿Cuántas páginas leíste?</p>
            </>
          )}
        </div>
      </div>

      {/* Buttons always visible at bottom */}
      <div style={{ flexShrink: 0, width: "100%", maxWidth: 420, alignSelf: "center", padding: "12px 24px", paddingBottom: "calc(32px + env(safe-area-inset-bottom))", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {phase === "choose" && (
          <button onClick={handleClose} style={{ background: "none", border: "none", ...body, fontSize: "0.8rem", color: palette.inkFaint, cursor: "pointer", padding: "0.5rem", textAlign: "center" }}>
            Cerrar
          </button>
        )}
        {phase === "setup" && (
          <>
            <button
              onClick={startTimer}
              style={{ width: "100%", borderRadius: 14, padding: "1rem", backgroundColor: palette.accent, color: palette.onAccent, border: "none", ...display, fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}
            >
              Empezar a leer →
            </button>
            <button onClick={handleClose} style={{ background: "none", border: "none", ...body, fontSize: "0.8rem", color: palette.inkFaint, cursor: "pointer", padding: "0.5rem", textAlign: "center" }}>
              Cerrar
            </button>
          </>
        )}
        {phase === "running" && (
          <>
            <button
              onClick={() => { clearInterval(timerRef.current); onGoToLog(minutes); }}
              style={{ background: "none", border: "none", ...body, fontSize: "1rem", color: palette.accent, cursor: "pointer", fontWeight: 600, textAlign: "center" }}
            >
              Ya terminé — registrar páginas
            </button>
            <button onClick={() => { clearInterval(timerRef.current); onClose(); }} style={{ background: "none", border: "none", ...body, fontSize: "0.78rem", color: palette.inkFaint, cursor: "pointer", textAlign: "center" }}>
              Cerrar
            </button>
          </>
        )}
        {phase === "done" && (
          <button
            onClick={() => onGoToLog(minutes)}
            style={{ width: "100%", borderRadius: 14, padding: "1rem", backgroundColor: palette.accent, color: palette.onAccent, border: "none", ...display, fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}
          >
            Registrar páginas
          </button>
        )}
      </div>
    </div>
  );
}

function ShareSessionModal({ user, session, onClose, onShared }) {
  const { book, pages, minutes } = session;
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const [comment, setComment] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shared, setShared] = useState(false);

  async function handleShare() {
    if (sharing || shared) return;
    setShareError("");
    setSharing(true);
    devLog("Intentando crear post:", {
      tipo: "reading_session",
      bookId: book.id,
      pagesRead: pages,
      minutesRead: minutes || null,
      comentario: comment.trim() || "",
      userId: user?.id,
    });
    try {
      await createFeedPost({
        userId: user.id,
        type: "reading_session",
        bookId: book.id,
        content: comment.trim() || "",
        pagesRead: pages,
        minutesRead: minutes || null,
        imageUrl: null,
      });
      setShared(true);
      onShared?.();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error("Error al crear post:", err);
      setShareError(err?.message || "Error desconocido. Revisa la consola.");
      setSharing(false);
    }
  }

  const coverSrc = book.cover_url || book.coverUrl || null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{ position: "fixed", inset: 0, zIndex: 80, backgroundColor: "rgba(42,31,26,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: palette.bgCard, borderRadius: "20px 20px 0 0", padding: "1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom))", width: "100%", maxWidth: 480, maxHeight: "70vh", overflowY: "auto", animation: isClosing ? "slideDown 250ms cubic-bezier(0.4, 0, 1, 1) forwards" : "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border, margin: "0 auto 1.5rem" }} />

        <p style={{ ...display, fontStyle: "italic", fontSize: "1.25rem", color: palette.ink, marginBottom: "0.25rem", textAlign: "center" }}>¿Compartir tu sesión?</p>
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, textAlign: "center", marginBottom: "1.5rem" }}>Aparecerá en el feed de tus amigos</p>

        {/* Preview card */}
        <div style={{ backgroundColor: palette.bg, border: `1px solid ${palette.session}40`, borderLeft: `4px solid ${palette.session}`, borderRadius: 12, padding: "14px 14px 12px", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {coverSrc ? (
              <img src={coverSrc} alt="" style={{ width: 44, height: 64, objectFit: "cover", borderRadius: 5, flexShrink: 0, boxShadow: "0 2px 8px rgba(42,31,26,0.15)" }} />
            ) : (
              <BookCoverPlaceholder title={book.title} author={book.author} width={44} height={64} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...body, fontSize: "0.72rem", color: palette.session, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Sesión de lectura</p>
              <p style={{ ...display, fontSize: "0.95rem", fontWeight: 700, color: palette.ink, marginBottom: "0.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, fontStyle: "italic", marginBottom: "0.65rem" }}>{book.author}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ backgroundColor: `${palette.session}18`, border: `1px solid ${palette.session}35`, borderRadius: 20, padding: "2px 10px", ...body, fontSize: "0.78rem", color: palette.sessionInk, fontWeight: 600 }}>
                  {pages} {pages === 1 ? "página" : "páginas"}
                </span>
                {minutes && (
                  <span style={{ backgroundColor: `${palette.slate}18`, border: `1px solid ${palette.slate}30`, borderRadius: 20, padding: "2px 10px", ...body, fontSize: "0.78rem", color: palette.slate, fontWeight: 600 }}>
                    {minutes} min
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Optional comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Añade un comentario... (opcional)"
          maxLength={280}
          rows={2}
          style={{ ...body, width: "100%", boxSizing: "border-box", padding: "0.75rem", border: `1px solid ${palette.border}`, borderRadius: 10, backgroundColor: palette.bg, color: palette.ink, fontSize: "0.9rem", resize: "none", outline: "none", marginBottom: "1.25rem", lineHeight: 1.5 }}
        />

        <button
          onClick={handleShare}
          disabled={sharing || shared}
          style={{ ...display, width: "100%", padding: "0.9rem", borderRadius: 14, fontSize: "1rem", fontWeight: 700, backgroundColor: shared ? palette.sessionInk : palette.session, color: palette.onAccent, border: "none", cursor: (sharing || shared) ? "default" : "pointer", opacity: sharing ? 0.7 : 1, marginBottom: "0.6rem", transition: "background 0.2s" }}
        >
          {shared ? "¡Publicado! ✓" : sharing ? "Compartiendo…" : "Compartir en mi feed"}
        </button>
        {shareError && (
          <p style={{ ...body, fontSize: "0.82rem", color: palette.danger, backgroundColor: palette.dangerSoft, border: `1px solid ${palette.dangerBorder}`, borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: "0.6rem", lineHeight: 1.4 }}>
            ⚠️ {shareError}
          </p>
        )}
        <button
          onClick={handleClose}
          style={{ ...body, width: "100%", padding: "0.65rem", background: "none", border: "none", color: palette.inkFaint, fontSize: "0.9rem", cursor: "pointer" }}
        >
          {shared ? "Cerrar" : "Ahora no"}
        </button>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  const shimmer = {
    background: `linear-gradient(90deg, ${palette.border} 25%, ${palette.borderSoft} 50%, ${palette.border} 75%)`,
    backgroundSize: "400px 100%",
    animation: "shimmer 1.5s infinite",
  };
  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ backgroundColor: palette.bgSoft, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, ...shimmer }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ height: 14, width: "40%", borderRadius: 6, ...shimmer }} />
              <div style={{ height: 11, width: "25%", borderRadius: 6, ...shimmer }} />
            </div>
          </div>
          <div style={{ height: 60, borderRadius: 8, ...shimmer }} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }`}</style>
    </div>
  );
}

// Cuento del día — el primero no leído a partir del índice del día.
function getCuentoDelDia() {
  if (!CUENTOS || CUENTOS.length === 0) return null;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const base = Math.abs(dayOfYear) % CUENTOS.length;
  let readIds;
  try { readIds = new Set(JSON.parse(localStorage.getItem("folio_read_cuentos") || "[]")); } catch { readIds = new Set(); }
  for (let i = 0; i < CUENTOS.length; i++) {
    const c = CUENTOS[(base + i) % CUENTOS.length];
    if (!readIds.has(c.id)) return c;
  }
  return CUENTOS[base];
}

// ── Cuento del día hero ────────────────────────────────────────────────────
function SnacksHero({ onRead }) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const heroBase = Math.abs(dayOfYear) % CUENTOS.length;
  const readIds = (() => { try { return new Set(JSON.parse(localStorage.getItem('folio_read_cuentos') || '[]')); } catch { return new Set(); } })();
  let cuento = null;
  for (let i = 0; i < CUENTOS.length; i++) {
    const c = CUENTOS[(heroBase + i) % CUENTOS.length];
    if (!readIds.has(c.id)) { cuento = c; break; }
  }
  if (!cuento) cuento = CUENTOS[heroBase];
  const isDark = palette.bg === PALETTE_DARK.bg;

  if (!cuento) return null;

  return (
    <div data-tutorial="snacks-hero" style={{
      background: isDark
        ? `linear-gradient(135deg, ${palette.bgCard} 0%, rgba(200,79,79,0.08) 100%)`
        : "linear-gradient(135deg, rgba(164,75,63,0.07) 0%, rgba(200,146,74,0.06) 100%)",
      border: `1px solid ${isDark ? palette.border : "rgba(164,75,63,0.2)"}`,
      borderRadius: 18,
      padding: "1.35rem 1.25rem 1.1rem",
      marginBottom: "1.5rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative accent line */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: palette.accent, borderRadius: "18px 0 0 18px" }} />
      <div style={{ paddingLeft: "0.75rem" }}>
        <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.65rem", fontWeight: 600, color: palette.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
          cuento del día
        </p>
        <p style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: "1.3rem", fontWeight: 700, color: palette.ink, lineHeight: 1.2, marginBottom: "0.3rem" }}>
          {cuento.titulo}
        </p>
        <p style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "0.9rem", color: palette.inkSoft, marginBottom: "0.65rem" }}>
          {cuento.autor}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.72rem", color: palette.inkFaint, fontWeight: 500 }}>
            {cuento.duracion || `${cuento.duracion_minutos} min`} de lectura
          </span>
          {cuento.generos?.[0] && (
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.68rem", color: palette.amber, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {cuento.generos[0]}
            </span>
          )}
        </div>
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.88rem", color: palette.inkSoft, lineHeight: 1.5, marginBottom: "1rem", fontStyle: "italic" }}>
          {cuento.desc}
        </p>
        <button
          onClick={() => {
            haptic(HAPTIC.NAV);
            try {
              const ids = new Set(JSON.parse(localStorage.getItem('folio_read_cuentos') || '[]'));
              ids.add(cuento.id);
              localStorage.setItem('folio_read_cuentos', JSON.stringify([...ids]));
            } catch { /* localStorage no disponible: no marcar como leído no rompe nada */ }
            onRead(cuento);
          }}
          style={{
            fontFamily: "Fraunces, serif", fontSize: "0.92rem", fontWeight: 700,
            backgroundColor: palette.accent, color: BRAND.cream,
            border: "none", borderRadius: 12, padding: "0.75rem 1.5rem",
            cursor: "pointer", width: "100%",
            transition: "transform 150ms cubic-bezier(0.23,1,0.32,1)",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Leer ahora →
        </button>
      </div>
    </div>
  );
}

// ── Snacks Carousel horizontal ──────────────────────────────────────────────
function SnacksCarousel({ onRead }) {
  // Show the remaining cuentos (skip today's = index 0 by day)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const heroIdx = Math.abs(dayOfYear) % CUENTOS.length;
  const rest = [...CUENTOS.slice(heroIdx + 1), ...CUENTOS.slice(0, heroIdx)].slice(0, 6);

  if (rest.length === 0) return null;

  return (
    <div style={{ marginTop: "1.75rem", marginBottom: "0.5rem" }}>
      <p style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "1rem", color: palette.ink, marginBottom: "0.75rem" }}>
        Más cuentos
      </p>
      <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {rest.map(c => (
          <button
            key={c.id}
            onClick={() => onRead(c)}
            style={{
              flexShrink: 0, width: 160,
              backgroundColor: palette.bgCard,
              border: `1px solid ${palette.border}`,
              borderRadius: 12,
              padding: "0.9rem 0.85rem",
              textAlign: "left",
              cursor: "pointer",
              display: "flex", flexDirection: "column", gap: "0.25rem",
              transition: "transform 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 18px rgba(42,31,26,0.12)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <p style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: "0.88rem", fontWeight: 700, color: palette.ink, lineHeight: 1.2, margin: 0 }}>
              {c.titulo}
            </p>
            <p style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "0.75rem", color: palette.inkSoft, margin: 0 }}>
              {c.autor}
            </p>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.65rem", color: palette.inkFaint, marginTop: "0.25rem" }}>
              {c.duracion || `${c.duracion_minutos} min`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ QUOTE POST CARD (feed) ============
function QuotePostCard({ post, userId, liked, likeCount, commentCount, commentsOpen, doubleTapId, onLike, onToggleComments, onAuthorClick, children }) {
  const quote = post.quote;
  const [expanded, setExpanded] = useState(false);
  const text = quote?.text || "";
  const isLong = text.length > 280;
  const displayText = !expanded && isLong ? text.slice(0, 280) + "…" : text;
  const moodLabel = MOOD_OPTIONS.find(m => m.key === quote?.mood)?.label;
  const isDark = palette.bg === PALETTE_DARK.bg;

  const cardBg = isDark ? QUOTE_POSTER_GRADIENTS.dark : QUOTE_POSTER_GRADIENTS.light;

  return (
    <div
      id={`post-${post.id}`}
      className="feed-post-item"
      onClick={() => onLike && onLike(post.id, true)}
      style={{ position: "relative", overflow: "hidden", borderRadius: "16px", boxShadow: "0 6px 24px rgba(42,31,26,0.22), 0 2px 6px rgba(42,31,26,0.1)", cursor: "default" }}
    >
      {/* Poster background */}
      <div style={{ background: cardBg, padding: "1.4rem 1.3rem 1.1rem" }}>
        {/* Header: user + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {post.user_id !== userId && onAuthorClick ? (
            <button onClick={() => onAuthorClick(post.author)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
              <Avatar author={post.author} size={30} />
            </button>
          ) : <Avatar author={post.author} size={30} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", flexWrap: "wrap" }}>
              {post.user_id !== userId && onAuthorClick ? (
                <button onClick={() => onAuthorClick(post.author)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  <span style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "13px", color: "rgba(244,237,224,0.95)" }}>
                    {post.author?.nombre || "Usuario"}
                  </span>
                </button>
              ) : (
              <span style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "13px", color: "rgba(244,237,224,0.95)" }}>
                {post.author?.nombre || "Usuario"}
              </span>
              )}
              <span style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.8rem", color: "rgba(244,237,224,0.55)", fontStyle: "italic" }}>
                guardó una frase
              </span>
            </div>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.68rem", color: "rgba(244,237,224,0.4)" }}>
              {timeAgo(post.created_at)}
            </span>
          </div>
        </div>

        {/* Decorative opening quote */}
        <div style={{ fontFamily: "Georgia, serif", fontSize: "4.5rem", lineHeight: 0.85, color: "rgba(200,146,74,0.35)", marginBottom: "0.1rem", marginLeft: "-0.15rem", userSelect: "none" }}>"</div>

        {/* Quote text */}
        <p style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "clamp(1.1rem, 4.5vw, 1.3rem)", lineHeight: 1.65, color: "rgba(244,237,224,0.95)", marginBottom: isLong && !expanded ? "0.5rem" : "1.4rem", letterSpacing: "0.01em" }}>
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'EB Garamond', serif", fontSize: "0.85rem", color: "rgba(200,146,74,0.8)", padding: "0 0 1.2rem", display: "block" }}
          >
            {expanded ? "Leer menos ↑" : "Leer más ↓"}
          </button>
        )}

        {/* Book info */}
        {quote?.bookTitle && (
          <div style={{ borderTop: "1px solid rgba(244,237,224,0.12)", paddingTop: "0.75rem", marginBottom: moodLabel ? "0.65rem" : 0 }}>
            <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.85rem", color: "rgba(244,237,224,0.6)", fontStyle: "italic" }}>
              — {quote.bookTitle}{quote.bookAuthor ? ` · ${quote.bookAuthor}` : ""}
            </p>
          </div>
        )}

        {/* Mood pill */}
        {moodLabel && (
          <div style={{ marginTop: quote?.bookTitle ? 0 : "0.65rem" }}>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.72rem", color: "rgba(200,146,74,0.9)", backgroundColor: "rgba(200,146,74,0.15)", borderRadius: "999px", padding: "0.2rem 0.6rem", border: "1px solid rgba(200,146,74,0.25)" }}>
              {moodLabel}
            </span>
          </div>
        )}

        {/* Double-tap heart overlay */}
        {doubleTapId === post.id && (
          <div className="heart-pop-anim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
            <Heart size={60} color={palette.like} fill={palette.like} strokeWidth={0} />
          </div>
        )}
      </div>

      {/* Footer: likes + comments */}
      <div style={{ backgroundColor: palette.bgCard, borderTop: "1px solid rgba(122,46,46,0.2)", padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <LikeButton postId={post.id} count={likeCount || 0} liked={liked} onToggle={(id) => onLike && onLike(id)} size={15} />
        <button
          onClick={e => { e.stopPropagation(); onToggleComments(post.id); }}
          style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <MessageCircle size={14} strokeWidth={2} />
          {commentsOpen ? "Ocultar" : commentCount ? `Comentarios (${commentCount})` : "Comentarios"}
        </button>
      </div>

      {/* Comments section (injected from parent) */}
      {commentsOpen && children}
    </div>
  );
}

// ============ HOME (dashboard personalizado) ============
// Barra de progreso reutilizable por libro (% leído, color rojo→verde)
function ProgressBarBook({ current = 0, total = 0, height = 9 }) {
  const has = total > 0;
  const pct = has ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const hue = Math.round(pct * 1.2); // 0=rojo, 120=verde
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height, borderRadius: 999, backgroundColor: palette.border, overflow: "hidden" }}>
        {has && (
          <div style={{
            width: `${Math.max(pct, 3)}%`, height: "100%", borderRadius: 999,
            background: `linear-gradient(90deg, hsl(${hue},70%,42%), hsl(${hue},62%,52%))`,
            transition: "width 500ms cubic-bezier(0.23,1,0.32,1)",
          }} />
        )}
      </div>
      <p style={{ ...body, fontSize: "0.76rem", color: palette.inkFaint, marginTop: "0.35rem" }}>
        {has ? `Vas en ${pct}% · ${current} de ${total} páginas` : `${current} páginas leídas`}
      </p>
    </div>
  );
}

// Modal motivacional de racha
function RachaModal({ streak, onClose }) {
  const cur = streak?.current_streak || 0;
  const best = streak?.longest_streak || 0;
  const msg = cur === 0
    ? "Lee aunque sea 5 minutos hoy y empieza tu racha. El primer día es el más importante."
    : cur < 3 ? "¡Vas empezando! Los primeros días construyen el hábito."
    : cur < 7 ? "Buen ritmo. Una semana está a la vuelta de la esquina."
    : cur < 30 ? "Eres constante. Esto ya es parte de quién eres."
    : "Lector de élite. Tu disciplina es tu superpoder.";
  return (
    <div className="fixed inset-0 z-[57] flex items-end sm:items-center justify-center sm:p-4" style={{ backgroundColor: "rgba(42,31,26,0.6)", animation: "backdropIn 180ms ease-out" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl" style={{ background: BRAND.gradient, padding: "2rem 1.5rem", textAlign: "center", animation: "slideUp 300ms cubic-bezier(0.32,0.72,0,1)" }} onClick={(e) => e.stopPropagation()}>
        <Flame size={48} color={BRAND.cream} style={{ margin: "0 auto" }} className={cur > 7 ? "fire-pulse" : ""} />
        <p style={{ fontFamily: "Fraunces, serif", fontWeight: 800, fontSize: "3rem", color: palette.onAccent, lineHeight: 1, marginTop: "0.5rem" }}>{cur}</p>
        <p style={{ ...display, fontSize: "1rem", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{cur === 1 ? "día de racha" : "días de racha"}</p>
        <p style={{ ...body, fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", marginTop: "0.3rem" }}>Mejor racha: {best} {best === 1 ? "día" : "días"}</p>
        <p style={{ ...body, fontSize: "0.92rem", color: palette.onAccent, lineHeight: 1.4, marginTop: "1.25rem" }}>{msg}</p>
        <button onClick={onClose} className="btn-press" style={{ marginTop: "1.5rem", width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.95)", color: BRAND.wine, fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "0.95rem" }}>
          ¡A leer!
        </button>
      </div>
    </div>
  );
}

// Modal "Leer ahora" — una sola decisión: continuar libro o cuento del día
function LeerAhoraModal({ booksReading = [], cuento, onRead, onCuento, onClose }) {
  const primary = booksReading[0] || null;
  const rest = booksReading.slice(1);
  return (
    <div className="fixed inset-0 z-[57] flex items-end sm:items-center justify-center sm:p-4" style={{ backgroundColor: "rgba(42,31,26,0.6)", animation: "backdropIn 180ms ease-out" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}`, padding: "1.5rem 1.25rem 2rem", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 300ms cubic-bezier(0.32,0.72,0,1)" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.2rem", color: palette.ink, marginBottom: "1.1rem", textAlign: "center" }}>¿Qué quieres leer?</h2>
        {primary && (
          <button onClick={() => onRead(primary)} className="btn-press" style={{ width: "100%", textAlign: "left", marginBottom: "0.7rem", padding: "1rem", borderRadius: 14, cursor: "pointer", border: `1.5px solid ${palette.accent}`, backgroundColor: `${palette.accent}10`, display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ width: 44, height: 64, borderRadius: 6, overflow: "hidden", flexShrink: 0, backgroundColor: palette.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {primary.coverUrl ? <img src={primary.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={20} color={palette.inkFaint} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...body, fontSize: "0.72rem", color: palette.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Continuar</p>
              <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1rem", color: palette.ink, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primary.title}</p>
              <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>{primary.author}</p>
            </div>
          </button>
        )}
        {cuento && (
          <button onClick={onCuento} className="btn-press" style={{ width: "100%", textAlign: "left", padding: "1rem", borderRadius: 14, cursor: "pointer", border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: BRAND.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} color={palette.onAccent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...body, fontSize: "0.72rem", color: palette.amber, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cuento del día · 5 min</p>
              <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1rem", color: palette.ink, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cuento.titulo}</p>
              <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>{cuento.autor}</p>
            </div>
          </button>
        )}
        {rest.length > 0 && (
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ ...display, fontSize: "0.78rem", color: palette.inkFaint, fontWeight: 600, marginBottom: "0.6rem" }}>También estás leyendo</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
              {rest.map((b) => (
                <button key={b.id} onClick={() => onRead(b)} className="btn-press" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 8, overflow: "hidden", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {b.coverUrl ? <img src={b.coverUrl} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={18} color={palette.inkFaint} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeView({ user, books = [], pet, streak, setTab, onOpenPet, onSelectBook, onAdd, isOnline = true }) {
  const [activeReader, setActiveReader] = useState(null);
  const [bookProgress, setBookProgress] = useState({});
  const [rachaOpen, setRachaOpen] = useState(false);
  const [leerOpen, setLeerOpen] = useState(false);
  const [logBook, setLogBook] = useState(null);
  const [progressNonce, setProgressNonce] = useState(0);

  const firstName = (user.name || "").trim().split(" ")[0] || "lector";
  const h = new Date().getHours();
  const timeOfDay = (h >= 6 && h < 12) ? { text: "Buenos días", emoji: "☀️" }
    : (h >= 12 && h < 18) ? { text: "Buenas tardes", emoji: "🌤️" }
    : { text: "Buenas noches", emoji: "🌙" };
  const readingBooks = books.filter((b) => b.status === "reading");
  const wantBooks = books.filter((b) => b.status === "want_to_read" || b.status === "wish").slice(0, 4);
  const cuento = getCuentoDelDia();
  const cur = streak?.current_streak || 0;
  const best = streak?.longest_streak || 0;

  useEffect(() => {
    if (!isOnline) return;
    const ids = books.filter((b) => b.status === "reading").map((b) => b.id);
    if (ids.length === 0) { setBookProgress({}); return; }
    supabase.from("reading_logs").select("book_id, pages_read").eq("user_id", user.id).in("book_id", ids)
      .then(({ data, error }) => {
        if (error) { console.error("[home] no se pudo calcular el progreso:", error.message); return; }
        const m = {};
        (data || []).forEach((r) => { if (r.book_id) m[r.book_id] = (m[r.book_id] || 0) + (r.pages_read || 0); });
        setBookProgress(m);
      });
  }, [user.id, isOnline, books.map((b) => b.id).join(","), progressNonce]);

  const sectionTitle = { ...display, fontSize: "1.05rem", fontWeight: 700, color: palette.ink, marginBottom: "0.7rem" };

  function openRead(book) {
    if (!book) return;
    setLeerOpen(false);
    setLogBook(book);
  }

  function openCuento() {
    setLeerOpen(false);
    if (cuento) {
      try {
        const ids = new Set(JSON.parse(localStorage.getItem("folio_read_cuentos") || "[]"));
        ids.add(cuento.id);
        localStorage.setItem("folio_read_cuentos", JSON.stringify([...ids]));
      } catch { /* localStorage no disponible: no marcar como leído no rompe nada */ }
      setActiveReader(cuento);
    }
  }

  return (
    <div style={{ padding: "1.25rem 1rem 2.5rem", maxWidth: "42rem", margin: "0 auto" }}>
      {/* 1. Saludo + hora */}
      <p style={{ ...body, fontSize: "0.92rem", color: palette.inkSoft, marginBottom: "1.1rem" }}>
        {timeOfDay.text}, {firstName} {timeOfDay.emoji}
      </p>

      {/* 2. Racha prominente */}
      <button
        onClick={() => setRachaOpen(true)}
        className="btn-press"
        style={{ width: "100%", textAlign: "left", marginBottom: "1.25rem", padding: "1.25rem 1.4rem", borderRadius: 20, cursor: "pointer", border: "none", background: cur > 0 ? BRAND.gradient : palette.bgCard, boxShadow: cur > 0 ? "0 8px 28px rgba(122,46,46,0.3)" : "none", display: "flex", alignItems: "center", gap: "1.1rem", ...(cur > 0 ? {} : { borderWidth: 1, borderStyle: "dashed", borderColor: palette.border }) }}
      >
        <Flame size={44} color={cur > 0 ? BRAND.cream : palette.inkFaint} className={cur > 7 ? "fire-pulse" : ""} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          {cur > 0 ? (
            <>
              <p style={{ fontFamily: "Fraunces, serif", fontWeight: 800, fontSize: "2.6rem", color: BRAND.cream, lineHeight: 1 }}>{cur}</p>
              <p style={{ ...display, fontSize: "0.95rem", color: BRAND.cream, fontWeight: 600 }}>{cur === 1 ? "día de racha" : "días de racha"}</p>
              <p style={{ ...body, fontSize: "0.78rem", color: "rgba(244,237,224,0.75)", marginTop: "0.15rem" }}>Mejor: {best} {best === 1 ? "día" : "días"}</p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "Fraunces, serif", fontWeight: 800, fontSize: "1.3rem", color: palette.ink, lineHeight: 1.1 }}>Empieza tu racha hoy</p>
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginTop: "0.2rem" }}>Lee aunque sea 5 minutos</p>
            </>
          )}
        </div>
      </button>

      {/* 3. CTA principal */}
      <button
        onClick={() => setLeerOpen(true)}
        className="btn-press"
        style={{ width: "100%", marginBottom: "1.5rem", padding: "1.15rem", borderRadius: 16, border: "none", cursor: "pointer", background: palette.accent, color: palette.onAccent, fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.15rem", boxShadow: "0 6px 20px rgba(122,46,46,0.3)" }}
      >
        Leer ahora →
      </button>

      {/* 4. Seguir leyendo (con progreso) */}
      {readingBooks.length > 0 && (
        <div style={{ marginBottom: "1.75rem" }}>
          <p style={sectionTitle}>Seguir leyendo</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {readingBooks.slice(0, 3).map((b) => (
              <button key={b.id} onClick={() => openRead(b)} className="btn-press" style={{ width: "100%", textAlign: "left", padding: "0.85rem 1rem", borderRadius: 14, cursor: "pointer", border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgCard, display: "flex", gap: "0.85rem", alignItems: "center" }}>
                <div style={{ width: 48, height: 70, borderRadius: 6, overflow: "hidden", flexShrink: 0, backgroundColor: palette.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {b.coverUrl ? <img src={b.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={22} color={palette.inkFaint} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "0.98rem", color: palette.ink, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</p>
                  <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, marginBottom: "0.5rem" }}>{b.author}</p>
                  <ProgressBarBook current={bookProgress[b.id] || 0} total={b.totalPages || 0} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Mascota teaser */}
      {pet && (
        <button onClick={onOpenPet} className="btn-press" style={{ width: "100%", textAlign: "left", marginBottom: "1.75rem", padding: "0.85rem 1rem", borderRadius: 16, cursor: "pointer", border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgCard, display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ flexShrink: 0 }}>
            <PetDisplay petType={pet.pet_type} petName={pet.pet_name} px={56} showShadow={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1rem", color: palette.ink, lineHeight: 1.15 }}>{pet.pet_name}</p>
            <p style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, marginTop: "0.15rem" }}>Nivel {pet.level} · ver mascota</p>
          </div>
          <ChevronRight size={20} color={palette.inkFaint} style={{ flexShrink: 0 }} />
        </button>
      )}

      {/* 6. Descubre tu siguiente */}
      {wantBooks.length > 0 ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
            <p style={{ ...display, fontSize: "1.05rem", fontWeight: 700, color: palette.ink }}>Descubre tu siguiente</p>
            <button onClick={() => setTab("explorar")} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.82rem", color: palette.accent, fontWeight: 600 }}>Ver más</button>
          </div>
          <div className="scrollbar-hide" style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
            {wantBooks.map((b) => (
              <button key={b.id} onClick={() => onSelectBook(b)} className="btn-press" style={{ flexShrink: 0, width: 92, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <div style={{ width: 92, height: 138, borderRadius: 10, overflow: "hidden", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {b.coverUrl ? <img src={b.coverUrl} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={24} color={palette.inkFaint} />}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setTab("explorar")} className="btn-press" style={{ width: "100%", padding: "1.1rem", borderRadius: 16, cursor: "pointer", border: `1px dashed ${palette.border}`, backgroundColor: palette.bgCard, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Compass size={26} color={palette.accent} style={{ flexShrink: 0 }} />
          <div style={{ textAlign: "left" }}>
            <p style={{ ...display, fontWeight: 700, fontSize: "0.95rem", color: palette.ink }}>Descubre tu próxima lectura</p>
            <p style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint }}>Recomendaciones para ti</p>
          </div>
        </button>
      )}

      {rachaOpen && <RachaModal streak={streak} onClose={() => setRachaOpen(false)} />}
      {leerOpen && (
        <LeerAhoraModal
          booksReading={readingBooks}
          cuento={cuento}
          onRead={openRead}
          onCuento={openCuento}
          onClose={() => setLeerOpen(false)}
        />
      )}
      {logBook && (
        <ReadingLogModal
          user={user}
          initialBook={{ id: logBook.id, title: logBook.title, author: logBook.author, cover_url: logBook.coverUrl }}
          onClose={() => setLogBook(null)}
          onGoToAdd={() => { setLogBook(null); setTab("add"); }}
          onSuccess={() => { setLogBook(null); setProgressNonce((n) => n + 1); }}
        />
      )}
      {activeReader && (
        <ReaderView
          cuento={activeReader}
          user={user}
          onClose={() => setActiveReader(null)}
          onAddToLibrary={(bookData) => { onAdd(bookData); }}
        />
      )}
    </div>
  );
}

function FeedView({ user, onAdd, setTab, books = [], isOnline = true, pendingNavigation, onNavigationDone }) {
  const [posts, setPosts] = useState([]);
  const [feedError, setFeedError] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [openComments, setOpenComments] = useState(new Set());
  const [highlightedPost, setHighlightedPost] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [previewPost, setPreviewPost] = useState(null);
  const [profileModalAuthor, setProfileModalAuthor] = useState(null);
  const [streak, setStreak] = useState(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [pagesLoggedToday, setPagesLoggedToday] = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [activeReader, setActiveReader] = useState(null);
  const imageInputRef = useRef(null);
  const [likeCounts, setLikeCounts] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [doubleTapPost, setDoubleTapPost] = useState(null);
  const lastTapRef = useRef({});
  const runIdRef = useRef(0);
  const [loggedYesterday, setLoggedYesterday] = useState(true);
  const [friendsReading, setFriendsReading] = useState([]);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [openPopover, setOpenPopover] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(null);
  const [shareSession, setShareSession] = useState(null);
  const [feedState, setFeedState] = useState('loading');
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 13 ? "Buenos días" : greetingHour < 20 ? "Buenas tardes" : "Buenas noches";

  useEffect(() => {
    if (!isOnline) {
      setFeedState('offline');
      loadStreakInfo();
      return;
    }
    loadFeed();
    loadFriendsReading();
    loadStreakInfo();
  }, [isOnline]);

  useEffect(() => {
    // Deep link: ?action=log opens the reading log modal
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'log') {
      window.history.replaceState({}, '', '/');
      setShowLogModal(true);
    }
  }, []);

  useEffect(() => {
    if (feedState !== 'ready' && feedState !== 'empty') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { scheduleNotifSW(); return; }
    if (Notification.permission !== 'default' || localStorage.getItem('folio_notif_asked')) return;
    const t = setTimeout(() => setShowNotifPrompt(true), 2500);
    return () => clearTimeout(t);
  }, [feedState]);

  useEffect(() => {
    if (!pendingNavigation) return;
    const { postId, openComments: shouldOpenComments } = pendingNavigation;
    const t = setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedPost(postId);
        if (shouldOpenComments) {
          setOpenComments(prev => new Set([...prev, postId]));
        }
        setTimeout(() => setHighlightedPost(null), 1500);
      }
      onNavigationDone?.();
    }, 300);
    return () => clearTimeout(t);
  }, [pendingNavigation]);

  // Libera el blob del preview de imagen al cambiarlo, cancelarlo o salir del feed.
  useEffect(() => () => { if (postImagePreview) URL.revokeObjectURL(postImagePreview); }, [postImagePreview]);

  async function loadStreakInfo() {
    let s = null, logged = false, pages = 0;
    try {
      ({ streak: s, hasLoggedToday: logged, pagesLoggedToday: pages } = await fetchStreakData(user.id));
    } catch (err) {
      console.error("[streak] fetchStreakData falló, usando valores default:", err);
    }
    // Monthly freeze reset (RPC server-side: user_streaks es solo-lectura para el cliente)
    if (s) {
      try {
        const currentMonth = new Date().getMonth() + 1;
        const needsReset = s.last_freeze_reset_month !== currentMonth && (s.streak_freezes_remaining ?? 1) < 1;
        if (needsReset) {
          const updated = await resetMonthlyFreeze();
          if (updated) s = updated;
        }
      } catch (err) {
        console.error("[streak] freeze reset falló:", err);
      }
    }
    setStreak(s);
    setHasLoggedToday(logged);
    setPagesLoggedToday(pages);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = localDateStr(yesterday);
    try {
      const { count } = await supabase.from("reading_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("log_date", yStr);
      setLoggedYesterday((count || 0) > 0);
    } catch (err) {
      console.error("[streak] no se pudo revisar la lectura de ayer:", err);
    }
  }

  async function applyFreeze() {
    try {
      const updated = await applyStreakFreeze();
      if (updated) setStreak(updated);
    } catch (err) {
      console.error("[streak] use_streak_freeze falló:", err?.message || err);
    }
  }

  function scheduleNotifSW() {
    const bookTitle = books.find(b => b.status === 'reading')?.title || null;
    navigator.serviceWorker?.ready.then(reg =>
      reg.active?.postMessage({
        type: 'FOLIO_SCHEDULE_NOTIF',
        streak: streak?.current_streak || 0,
        bookTitle,
      })
    );
  }

  async function requestNotifPermission() {
    localStorage.setItem('folio_notif_asked', '1');
    setShowNotifPrompt(false);
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') scheduleNotifSW();
    } catch (e) { console.error("Notification permission:", e); }
  }

  function dismissNotifPrompt() {
    localStorage.setItem('folio_notif_asked', '1');
    setShowNotifPrompt(false);
  }

  async function loadFriendsReading() {
    try {
      const { data: fs, error: fsErr } = await supabase.from("friendships").select("user_id, friend_id").eq("status", "accepted").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      if (fsErr) throw fsErr;
      if (!fs || fs.length === 0) { devLog("[friendsReading] no friendships"); return; }
      const friendIds = [...new Set(fs.map(f => f.user_id === user.id ? f.friend_id : f.user_id))];
      devLog("[friendsReading] friendIds:", friendIds);
      const [{ data: rbooks, error: bErr }, { data: profiles }] = await Promise.all([
        supabase.from("books").select("id, title, author, cover_url, user_id").in("user_id", friendIds).eq("status", "reading").limit(8),
        supabase.from("users").select("id, nombre, avatar_url").in("id", friendIds),
      ]);
      if (bErr) console.error("[friendsReading] books error:", bErr);
      devLog("[friendsReading] rbooks:", rbooks?.length, "profiles:", profiles?.length);
      const pm = {};
      (profiles || []).forEach(p => { pm[p.id] = p; });
      const items = (rbooks || []).filter(b => pm[b.user_id]).map(b => ({ book: b, friend: pm[b.user_id] }));
      devLog("[friendsReading] items:", items.length);
      setFriendsReading(items);
    } catch (e) { console.error("[friendsReading] error:", e); }
  }

  async function loadFeed() {
    const thisRun = ++runIdRef.current;
    setFeedState('loading');
    try {
      const feedPosts = await Promise.race([
        fetchFeed(user.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (thisRun !== runIdRef.current) return;
      setPosts(feedPosts);
      if (feedPosts.length > 0) {
        const postIds = feedPosts.map((p) => p.id);
        const [{ data: countData }, likeResults] = await Promise.all([
          supabase.from("comments").select("post_id").in("post_id", postIds),
          Promise.all([
            supabase.from("post_likes").select("post_id").in("post_id", postIds),
            supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id),
          ]).catch(() => [{ data: null }, { data: null }]),
        ]);
        if (thisRun !== runIdRef.current) return;
        const cm = {};
        (countData || []).forEach((c) => { cm[c.post_id] = (cm[c.post_id] || 0) + 1; });
        setCommentCounts(cm);
        const [{ data: allLikes }, { data: myLikes }] = likeResults;
        const lc = {};
        (allLikes || []).forEach(l => { lc[l.post_id] = (lc[l.post_id] || 0) + 1; });
        setLikeCounts(lc);
        setLikedPosts(new Set((myLikes || []).map(l => l.post_id)));
      }
      setFeedState(feedPosts.length > 0 ? 'ready' : 'empty');
    } catch (err) {
      if (thisRun !== runIdRef.current) return;
      console.error('Feed error:', err);
      setFeedError(err?.message === 'timeout' ? 'La carga tardó demasiado. ¿Tienes buena conexión?' : err?.message || 'No se pudo cargar el feed.');
      setFeedState('error');
    }
  }

  async function handleCreateTextPost() {
    if (!newPostText.trim() && !postImageFile) return;
    setPosting(true);
    setPostError("");
    try {
      let imageUrl = null;
      if (postImageFile) {
        try {
          imageUrl = await compressAndUploadPostImage(postImageFile, user.id);
        } catch (imgErr) {
          console.error("Error subiendo imagen:", imgErr);
          setPostError("No se pudo subir la imagen. Revisa el bucket 'post-images' en Supabase.");
          setPosting(false);
          return;
        }
      }
      await createFeedPost({ userId: user.id, type: "text", content: newPostText.trim() || null, imageUrl });
      setNewPostText(""); setShowNewPost(false); setPostImageFile(null); setPostImagePreview(null);
      await loadFeed();
    } catch (err) {
      console.error("Error creando post:", err);
      setPostError(err?.message || "Error al publicar. Revisa la consola.");
    }
    finally { setPosting(false); }
  }

  function toggleLike(postId) {
    const alreadyLiked = likedPosts.has(postId);
    setLikedPosts(prev => { const next = new Set(prev); alreadyLiked ? next.delete(postId) : next.add(postId); return next; });
    setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (alreadyLiked ? -1 : 1)) }));
    const revert = ({ error }) => {
      if (!error || error.code === "23505") return;
      console.error("[likes] like de post no se guardó:", error.message);
      setLikedPosts(prev => { const next = new Set(prev); alreadyLiked ? next.add(postId) : next.delete(postId); return next; });
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (alreadyLiked ? 1 : -1)) }));
    };
    if (alreadyLiked) {
      supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id).then(revert);
    } else {
      supabase.from("post_likes").insert({ post_id: postId, user_id: user.id }).then(revert);
      const post = posts.find(p => p.id === postId);
      if (!post) { console.warn("[notif] like_post: post not found in state for id", postId); }
      else if (post.user_id !== user.id) {
        const notifPayload = { user_id: post.user_id, actor_id: user.id, type: "like_post", post_id: postId, read: false };
        devLog("[like-insert-pre] Inserting into notifications:", notifPayload);
        supabase.from("notifications").insert(notifPayload)
          .then(({ error }) => { if (error) console.error("[notif] no se pudo crear la notificación:", error.message); });
      }
    }
  }

  function handleDoubleTap(postId) {
    const now = Date.now();
    const last = lastTapRef.current[postId] || 0;
    if (now - last < 350) {
      haptic(HAPTIC.DOUBLE_LIKE);
      setDoubleTapPost(postId);
      setTimeout(() => setDoubleTapPost(null), 700);
      if (!likedPosts.has(postId)) toggleLike(postId);
    }
    lastTapRef.current[postId] = now;
  }

  function toggleComments(postId) {
    setOpenComments((prev) => {
      const n = new Set(prev);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
  }

  async function handleDeletePost(postId) {
    setDeleting(true);
    try {
      await deleteFeedPost(postId, user.id);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPostToDelete(null);
    } catch (err) {
      console.error("Error eliminando post:", err);
    } finally {
      setDeleting(false);
    }
  }

  function handleCommentCountChange(postId, count) {
    setCommentCounts((prev) => ({ ...prev, [postId]: count }));
  }

  async function handleInvite() {
    const username = user.username || user.name || "Alguien";
    const refUrl = `https://folio-final.vercel.app?ref=${encodeURIComponent(username)}`;
    const msg = `${user.name || username} te invita a Folio. Lleva tu biblioteca, comparte lo que lees y descubre nuevos libros con tus amigos.`;
    try {
      if (navigator.share) await navigator.share({ title: "Folio — Tu biblioteca personal", text: msg, url: refUrl });
    } catch (e) { /* user cancelled */ }
  }

  if (feedState === 'loading') return <FeedSkeleton />;

  // ── Motivational phrase ──
  const readingBooks = books.filter(b => b.status === "reading");
  const recentlyFinished = books
    .filter(b => b.status === "read" && b.finishedAt && Date.now() - b.finishedAt < 5 * 24 * 3600 * 1000)
    .sort((a, b) => b.finishedAt - a.finishedAt)[0];
  const wantToReadCount = books.filter(b => b.status === "want_to_read").length;
  let motivationalPhrase = "";
  const s = streak?.current_streak || 0;
  if (s >= 7) {
    motivationalPhrase = `Llevas ${s} días seguidos. Eso ya es un hábito.`;
  } else if (s >= 3) {
    motivationalPhrase = `Llevas ${s} días seguidos. No pares ahora.`;
  } else if (!loggedYesterday) {
    motivationalPhrase = "Ayer te tomaste el día. Hoy es buen día para volver.";
  } else if (recentlyFinished) {
    const daysAgo = Math.round((Date.now() - recentlyFinished.finishedAt) / (24 * 3600 * 1000));
    const daysStr = daysAgo <= 0 ? "hoy" : daysAgo === 1 ? "ayer" : `hace ${daysAgo} días`;
    motivationalPhrase = `Terminaste "${recentlyFinished.title}" ${daysStr}. ¿Ya sabes cuál sigue?`;
  } else if (readingBooks.length > 0) {
    motivationalPhrase = `Hoy es buen día para avanzar en "${readingBooks[0].title}".`;
  } else if (wantToReadCount > 20) {
    motivationalPhrase = `Tienes ${wantToReadCount} libros esperándote. Uno a la vez.`;
  } else {
    motivationalPhrase = "Un buen libro te está esperando hoy.";
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto">
      {/* Notification opt-in prompt */}
      {showNotifPrompt && (
        <div style={{
          backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`,
          borderRadius: "14px", padding: "1rem 1.1rem", marginBottom: "1.25rem",
          animation: "feedFadeIn 300ms ease-out",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
            <div style={{ flex: 1 }}>
              <p style={{ ...display, fontSize: "0.95rem", fontWeight: 700, color: palette.ink, marginBottom: "0.2rem" }}>
                ¿Quieres recordatorios de lectura?
              </p>
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginBottom: "0.85rem" }}>
                Una notificación motivacional cada día a las 8pm. Sin spam.
              </p>
            </div>
            <button onClick={dismissNotifPrompt} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.1rem", color: palette.inkFaint, flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={dismissNotifPrompt}
              style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, background: "none", border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.45rem 0.9rem", cursor: "pointer" }}
            >
              Ahora no
            </button>
            <button
              onClick={requestNotifPermission}
              style={{ ...body, fontSize: "0.82rem", fontWeight: 700, backgroundColor: palette.ink, color: palette.onAccent, border: "none", borderRadius: "8px", padding: "0.45rem 1rem", cursor: "pointer" }}
            >
              Activar notificaciones
            </button>
          </div>
        </div>
      )}

      {/* Greeting banner */}
      <div style={{ marginBottom: "1.75rem" }}>
        <p style={{ ...ts.caption, marginBottom: "0.15rem" }}>{greeting},</p>
        <p style={{ ...ts.h1, color: palette.ink }}>
          {user.name?.split(" ")[0] || "lector"}
        </p>
        <p style={{ ...body, fontStyle: "italic", fontSize: "0.94rem", color: palette.inkSoft, marginTop: "0.35rem", lineHeight: 1.45 }}>
          {motivationalPhrase}
        </p>
      </div>

      {/* Banner de racha diaria */}
      <DailyReadingBanner
        streak={streak}
        hasLoggedToday={hasLoggedToday}
        pagesLoggedToday={pagesLoggedToday}
        onLog={() => setShowLogModal(true)}
        onFreeze={applyFreeze}
      />

      {/* Snacks Hero — cuento del día */}
      <SnacksHero onRead={setActiveReader} />

      {/* Strip: Leyendo ahora */}
      {friendsReading.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ ...body, fontSize: "13px", fontWeight: 500, color: palette.inkSoft, marginBottom: "8px" }}>
            Leyendo ahora
          </p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "4px 0 10px", WebkitOverflowScrolling: "touch", borderBottom: `1px solid ${palette.borderSoft}` }}>
            {friendsReading.map(({ book, friend }) => {
              const firstName = (friend.nombre || "").split(" ")[0];
              const displayName = firstName.length > 6 ? firstName.slice(0, 6) + "…" : firstName;
              const isOpen = openPopover?.id === book.id;
              return (
                <button
                  key={book.id}
                  onClick={(e) => {
                    if (isOpen) { setOpenPopover(null); return; }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setOpenPopover({ id: book.id, rect, book, friend });
                  }}
                  className="friend-strip-btn"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 64, flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <div style={{ position: "relative" }}>
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", display: "block" }} alt="" />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: getAvatarColor(friend.id), color: palette.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>
                        {(friend.nombre || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                    <div className="pulse-dot" style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, borderRadius: "50%", backgroundColor: palette.session, border: `2px solid ${palette.bgCard}` }} />
                  </div>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, fontWeight: 600, color: palette.ink, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0 }}>
                    {displayName}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Popover para strip de amigos */}
      {openPopover && (() => {
        const { rect, book } = openPopover;
        const popW = 200;
        const left = Math.max(8, Math.min(rect.left + rect.width / 2 - popW / 2, window.innerWidth - popW - 8));
        const bottom = window.innerHeight - rect.top + 12;
        return (
          <>
            <div onClick={() => setOpenPopover(null)} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
            <div
              className="popover-anim"
              style={{
                position: "fixed", bottom, left, width: popW, zIndex: 901,
                backgroundColor: palette.bgCard,
                border: `1px solid ${palette.borderSoft}`,
                borderRadius: 12,
                padding: "10px",
                boxShadow: "0 4px 20px rgba(42,31,26,0.18)",
              }}
            >
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                {book.cover_url ? (
                  <img src={book.cover_url} style={{ width: 40, height: 60, borderRadius: 4, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 8px rgba(42,31,26,0.15)" }} alt="" />
                ) : (
                  <div style={{ width: 40, height: 60, borderRadius: 4, backgroundColor: palette.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: "4px", border: `1px solid ${palette.borderSoft}` }}>
                    <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 8, color: palette.inkSoft, textAlign: "center", lineHeight: 1.3, margin: 0, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {book.title}
                    </p>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 11, fontStyle: "italic", color: palette.inkSoft, marginBottom: "0.2rem", margin: "0 0 3px" }}>está leyendo</p>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, fontWeight: 700, color: palette.ink, lineHeight: 1.3, marginBottom: "0.2rem", margin: "0 0 3px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {book.title}
                  </p>
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 11, color: palette.inkSoft, margin: 0 }}>
                    {book.author}
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Botón Tengo 5 minutos */}
      {readingBooks.length > 0 && (
        <button
          onClick={() => setShowTimerModal(true)}
          className="btn-press"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", marginBottom: "1.5rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Timer size={18} color={palette.amber} strokeWidth={1.8} />
            <span style={{ ...body, fontSize: "0.94rem", fontWeight: 600, color: palette.ink }}>Tengo 5 minutos</span>
          </div>
          <ChevronRight size={16} color={palette.inkFaint} />
        </button>
      )}

      {/* Crear post */}
      <div style={{ marginBottom: "2rem" }}>
        {!showNewPost ? (
          <button
            onClick={() => setShowNewPost(true)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, textAlign: "left" }}
          >
            <PenLine size={15} color={palette.inkFaint} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span style={{ ...ts.body15, color: palette.inkFaint }}>¿Qué estás leyendo?</span>
          </button>
        ) : (
          <div className="post-compose-enter" style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "12px", padding: "1rem" }}>
            <textarea
              autoFocus
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="¿Qué estás leyendo o pensando sobre libros?"
              rows={3}
              style={{ ...body, width: "100%", padding: "0.5rem 0", border: "none", backgroundColor: "transparent", color: palette.ink, fontSize: "1rem", resize: "none", outline: "none", boxSizing: "border-box" }}
            />
            {/* Image preview */}
            {postImagePreview && (
              <div style={{ position: "relative", display: "inline-block", marginBottom: "0.75rem" }}>
                <img src={postImagePreview} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, display: "block" }} />
                <button
                  onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", backgroundColor: palette.ink, color: palette.onAccent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            )}
            {postError && (
              <p style={{ ...body, fontSize: "0.82rem", color: palette.danger, marginBottom: "0.5rem" }}>⚠️ {postError}</p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", borderTop: `1px solid ${palette.borderSoft}`, paddingTop: "0.75rem" }}>
              {/* Image picker */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setPostImageFile(f);
                  setPostImagePreview(URL.createObjectURL(f));
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                title="Agregar imagen"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem", display: "flex", alignItems: "center", color: palette.inkFaint }}
              >
                <ImagePlus size={20} />
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setShowNewPost(false); setNewPostText(""); setPostError(""); setPostImageFile(null); setPostImagePreview(null); }} style={{ ...display, fontSize: "0.85rem", color: palette.inkSoft, backgroundColor: "transparent", border: `1px solid ${palette.border}`, padding: "0.4rem 0.9rem", borderRadius: "999px", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleCreateTextPost} disabled={posting || (!newPostText.trim() && !postImageFile)} style={{ ...display, fontSize: "0.85rem", fontWeight: 600, color: palette.bg, backgroundColor: palette.accent, border: "none", padding: "0.4rem 1rem", borderRadius: "999px", cursor: "pointer", opacity: (posting || (!newPostText.trim() && !postImageFile)) ? 0.6 : 1 }}>
                {posting ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de posts */}
      {feedState === 'error' ? (
        <div style={{ backgroundColor: palette.dangerSoft, border: `1px solid ${palette.dangerBorder}`, borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1rem", color: palette.dangerInk, ...body, fontSize: "0.88rem" }}>
          <p style={{ marginBottom: "0.75rem" }}>⚠️ {feedError || "No se pudo cargar el feed."}</p>
          <button
            onClick={() => { setFeedState('loading'); loadFeed(); }}
            style={{ backgroundColor: palette.dangerInk, color: palette.onAccent, border: "none", borderRadius: "8px", padding: "0.5rem 1.25rem", ...body, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      ) : feedState === 'offline' ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <WifiOff size={28} color={palette.border} style={{ margin: "0 auto 0.75rem", display: "block" }} />
          <p style={{ ...display, fontSize: "1.15rem", fontStyle: "italic", color: palette.inkSoft, marginBottom: "0.4rem" }}>Sin conexión</p>
          <p style={{ ...body, color: palette.inkFaint, fontSize: "0.9rem" }}>Necesitas conexión para ver el feed de tus amigos.</p>
        </div>
      ) : feedState === 'empty' ? (
        null
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem", animation: "feedFadeIn 200ms ease-out" }}>
          {posts.map((post) => {
            const commentsOpen = openComments.has(post.id);
            const isFinished = post.type === "book_update" && post.action === "finished";
            const isStarted = post.type === "book_update" && post.action === "started";
            // Detect achievement posts: new type OR legacy text with emoji pattern (exclude quote posts)
            const isAchievement = post.type === "achievement" || (post.type === "text" && !post.quote && post.content?.includes("¡Logro desbloqueado!"));
            const achDef = isAchievement ? ACHIEVEMENT_DEFS.find(a => post.content?.includes(`"${a.name}"`)) : null;
            const AchIcon = achDef ? (ACHIEVEMENT_ICON_MAP[achDef.key] || Award) : Award;

            if (isAchievement) {
              return (
                <div key={post.id} id={`post-${post.id}`} className="feed-post-item" style={{
                  position: "relative", overflow: "hidden",
                  backgroundColor: palette.bgCard,
                  border: `1px solid ${palette.amber}40`,
                  borderRadius: "14px",
                  padding: "18px 16px 14px",
                  boxShadow: highlightedPost === post.id ? `0 2px 10px rgba(200,146,74,0.13), 0 0 0 2px ${BRAND.wine}` : "0 2px 10px rgba(200,146,74,0.13)",
                  transition: "box-shadow 200ms ease",
                }}>
                  {/* Sparkles decorativos */}
                  <span style={{ position: "absolute", top: 10, right: 18, fontSize: 11, opacity: 0.3, color: BRAND.amber, pointerEvents: "none" }}>✦</span>
                  <span style={{ position: "absolute", top: 22, right: 36, fontSize: 8, opacity: 0.25, color: BRAND.amber, pointerEvents: "none" }}>✦</span>
                  <span style={{ position: "absolute", bottom: 14, right: 22, fontSize: 9, opacity: 0.2, color: BRAND.amber, pointerEvents: "none" }}>✦</span>

                  {/* Header: autor + "desbloqueó un logro" */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                    {post.user_id !== user.id ? (
                      <button onClick={() => setProfileModalAuthor({ ...(post.author || {}), name: post.author?.nombre || 'Usuario' })} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
                        <Avatar author={post.author} size={36} />
                      </button>
                    ) : <Avatar author={post.author} size={36} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", flexWrap: "wrap" }}>
                        <span style={{ ...display, fontWeight: 700, fontSize: "14px", color: palette.ink }}>{post.author?.nombre || 'Usuario'}</span>
                        <span style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, fontStyle: "italic" }}>desbloqueó un logro</span>
                      </div>
                      <span style={{ ...ts.caption, color: palette.inkFaint }}>{timeAgo(post.created_at)}</span>
                    </div>
                    {post.user_id === user.id && (
                      <button onClick={(e) => { e.stopPropagation(); setPostToDelete(post.id); }} style={{ color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0 0.2rem", display: "flex", alignItems: "center" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Ícono central grande */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0.25rem 0 0.75rem" }}>
                    <div className="achieve-icon-enter" style={{ position: "relative", marginBottom: "0.75rem" }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: BRAND.amber, opacity: 0.15, position: "absolute", inset: 0 }} />
                      <div style={{ width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <AchIcon size={34} color={BRAND.amber} strokeWidth={1.8} />
                      </div>
                    </div>
                    {achDef ? (
                      <>
                        <p style={{ ...display, fontSize: "1.2rem", fontWeight: 700, color: palette.ink, marginBottom: "0.2rem" }}>{achDef.name}</p>
                        <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft }}>{achDef.desc}</p>
                      </>
                    ) : (
                      <p style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft, fontStyle: "italic" }}>{post.content}</p>
                    )}
                  </div>

                  {/* Doble tap overlay */}
                  {doubleTapPost === post.id && (
                    <div className="heart-pop-anim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                      <Heart size={60} color={palette.like} fill={palette.like} strokeWidth={0} />
                    </div>
                  )}

                  {/* Footer: likes + comentarios */}
                  <div style={{ borderTop: `1px solid ${palette.amber}40`, paddingTop: "0.65rem", marginTop: "0.1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <LikeButton postId={post.id} count={likeCounts[post.id] || 0} liked={likedPosts.has(post.id)} onToggle={toggleLike} size={16} />
                    <button onClick={() => toggleComments(post.id)} style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <MessageCircle size={14} strokeWidth={2} />
                      {commentsOpen ? "Ocultar comentarios" : commentCounts[post.id] ? `Comentarios (${commentCounts[post.id]})` : "Comentarios"}
                    </button>
                  </div>
                  {commentsOpen && <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} postOwnerId={post.user_id} /></div>}
                </div>
              );
            }

            if (post.type === "quote") {
              return (
                <QuotePostCard
                  key={post.id}
                  post={post}
                  userId={user.id}
                  liked={likedPosts.has(post.id)}
                  likeCount={likeCounts[post.id] || 0}
                  commentCount={commentCounts[post.id] || 0}
                  commentsOpen={openComments.has(post.id)}
                  doubleTapId={doubleTapPost}
                  onLike={(id, isDoubleTap) => { if (isDoubleTap) { handleDoubleTap(id); } else { toggleLike(id); } }}
                  onToggleComments={toggleComments}
                  onAuthorClick={(author) => setProfileModalAuthor({ ...(author || {}), name: author?.nombre || 'Usuario' })}
                >
                  <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} postOwnerId={post.user_id} /></div>
                </QuotePostCard>
              );
            }

            const isReadingSession = post.type === "reading_session";
            if (isReadingSession) {
              const sesPages = post.pages_read || post.pagesRead || 0;
              const sesMinutes = post.minutes_read || post.minutesRead || null;
              devLog('Post reading_session:', { id: post.id, pages_read: post.pages_read, minutes_read: post.minutes_read });
              return (
                <div key={post.id} id={`post-${post.id}`}
                  className="feed-post-item"
                  onClick={() => handleDoubleTap(post.id)}
                  style={{ position: "relative", overflow: "hidden", backgroundColor: palette.bgCard, border: `1px solid ${palette.session}30`, borderLeft: `4px solid ${palette.session}`, borderRadius: "14px", padding: "18px", boxShadow: highlightedPost === post.id ? `0 2px 8px rgba(76,175,80,0.10), 0 0 0 2px ${BRAND.wine}` : "0 2px 8px rgba(76,175,80,0.10)", cursor: "default", transition: "box-shadow 200ms ease" }}
                >
                  {doubleTapPost === post.id && (
                    <div className="heart-pop-anim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                      <Heart size={60} color={palette.like} fill={palette.like} strokeWidth={0} />
                    </div>
                  )}
                  {/* Header */}
                  <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    {post.user_id !== user.id ? (
                      <button onClick={() => setProfileModalAuthor({ ...(post.author || {}), name: post.author?.nombre || 'Usuario' })} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
                        <Avatar author={post.author} size={42} />
                      </button>
                    ) : <Avatar author={post.author} size={42} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", flexWrap: "wrap" }}>
                        {post.user_id !== user.id ? (
                          <button onClick={() => setProfileModalAuthor({ ...(post.author || {}), name: post.author?.nombre || 'Usuario' })} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                            <span style={{ ...display, fontWeight: 700, fontSize: "15px", color: palette.ink }}>{post.author?.nombre || 'Usuario'}</span>
                          </button>
                        ) : <span style={{ ...display, fontWeight: 700, fontSize: "15px", color: palette.ink }}>{post.author?.nombre || 'Usuario'}</span>}
                        <span style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft, fontStyle: "italic" }}>leyó hoy</span>
                      </div>
                      <span style={{ ...ts.caption, color: palette.inkFaint }}>{timeAgo(post.created_at)}</span>
                    </div>
                    {post.user_id === user.id && (
                      <button onClick={(e) => { e.stopPropagation(); setPostToDelete(post.id); }} style={{ color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0 0.2rem", display: "flex", alignItems: "center" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {/* Book info */}
                  {post.book && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", backgroundColor: palette.bg, border: `1px solid ${palette.borderSoft}`, borderRadius: 10, padding: "10px 12px", marginBottom: "0.75rem" }}>
                      {post.book.cover_url ? (
                        <img src={post.book.cover_url} alt="" style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                      ) : (
                        <BookCoverPlaceholder title={post.book.title} author={post.book.author} width={36} height={52} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...display, fontSize: "0.9rem", fontWeight: 700, color: palette.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.book.title}</p>
                        <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, fontStyle: "italic" }}>{post.book.author}</p>
                      </div>
                    </div>
                  )}
                  {/* Stats pills */}
                  {(sesPages > 0 || sesMinutes > 0) && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                      {sesPages > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: palette.bgSoft, color: palette.sessionInk, borderRadius: "12px", padding: "6px 12px", fontSize: "13px", fontWeight: 500 }}>
                          📖 {sesPages} {sesPages === 1 ? "página" : "páginas"}
                        </span>
                      )}
                      {sesMinutes > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: palette.warnBg, color: palette.warnInk, borderRadius: "12px", padding: "6px 12px", fontSize: "13px", fontWeight: 500 }}>
                          ⏱ {sesMinutes} min
                        </span>
                      )}
                    </div>
                  )}
                  {post.content && (
                    <p style={{ ...body, fontSize: "0.92rem", color: palette.ink, lineHeight: 1.55, marginBottom: "0.9rem" }}>{post.content}</p>
                  )}
                  {/* Footer */}
                  <div style={{ borderTop: `1px solid ${palette.borderSoft}`, marginTop: "8px", paddingTop: "0.65rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <LikeButton postId={post.id} count={likeCounts[post.id] || 0} liked={likedPosts.has(post.id)} onToggle={toggleLike} size={16} />
                    <button onClick={() => toggleComments(post.id)} style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <MessageCircle size={14} strokeWidth={2} />
                      {commentsOpen ? "Ocultar comentarios" : commentCounts[post.id] ? `Comentarios (${commentCounts[post.id]})` : "Comentarios"}
                    </button>
                  </div>
                  {commentsOpen && <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} postOwnerId={post.user_id} /></div>}
                </div>
              );
            }

            const accentBorder = isFinished ? BRAND.wine : isStarted ? BRAND.amber : palette.slate;
            const shadowColor = isFinished ? "rgba(122,46,46,0.13)" : isStarted ? "rgba(200,146,74,0.15)" : "rgba(27,58,75,0.12)";
            return (
              <div key={post.id} id={`post-${post.id}`}
                className="feed-post-item"
                onClick={() => handleDoubleTap(post.id)}
                style={{
                  position: "relative", overflow: "hidden",
                  backgroundColor: palette.bgCard,
                  border: `1px solid ${palette.border}`,
                  borderLeft: `4px solid ${accentBorder}`,
                  borderRadius: "14px",
                  padding: "18px",
                  boxShadow: highlightedPost === post.id ? `0 2px 8px ${shadowColor}, 0 0 0 2px ${BRAND.wine}` : `0 2px 8px ${shadowColor}`,
                  cursor: "default",
                  transition: "box-shadow 200ms ease",
                }}>
                {/* Doble tap overlay */}
                {doubleTapPost === post.id && (
                  <div className="heart-pop-anim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                    <Heart size={60} color={palette.like} fill={palette.like} strokeWidth={0} />
                  </div>
                )}
                {/* Celebración para libros terminados */}
                {isFinished && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                    <BookmarkCheck size={12} color={palette.accent} strokeWidth={2} />
                    <span style={{ ...display, fontSize: "0.7rem", fontWeight: 700, color: palette.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>libro terminado</span>
                  </div>
                )}

                {/* Cabecera del post */}
                <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  {post.user_id !== user.id ? (
                    <button
                      onClick={() => setProfileModalAuthor({ ...(post.author || {}), name: post.author?.nombre || 'Usuario' })}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
                    >
                      <Avatar author={post.author} size={42} />
                    </button>
                  ) : (
                    <Avatar author={post.author} size={42} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                      {post.user_id !== user.id ? (
                        <button
                          onClick={() => setProfileModalAuthor({ ...(post.author || {}), name: post.author?.nombre || 'Usuario' })}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        >
                          <span style={{ ...display, fontWeight: 700, fontSize: "15px", color: palette.ink }}>{post.author?.nombre || 'Usuario'}</span>
                        </button>
                      ) : (
                        <span style={{ ...display, fontWeight: 700, fontSize: "15px", color: palette.ink }}>{post.author?.nombre || 'Usuario'}</span>
                      )}
                      {post.type === "book_update" && (
                        <span style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, fontStyle: "italic" }}>
                          {isStarted ? "empezó a leer" : "terminó de leer"}
                        </span>
                      )}
                    </div>
                    <span style={{ ...ts.caption, color: palette.inkFaint }}>{timeAgo(post.created_at)}</span>
                  </div>
                  {post.user_id === user.id && (
                    <button onClick={(e) => { e.stopPropagation(); setPostToDelete(post.id); }} title="Eliminar" style={{ color: palette.inkFaint, backgroundColor: "transparent", border: "none", cursor: "pointer", padding: "0 0.2rem", display: "flex", alignItems: "center" }}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>

                {/* Info del libro — clicable para abrir modal */}
                {post.type === "book_update" && post.book && (
                  <button
                    onClick={() => setPreviewPost(post)}
                    className="book-card-hover"
                    style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start", backgroundColor: palette.bg, borderRadius: "10px", padding: "0.7rem 0.85rem", marginBottom: "0.75rem", border: `1px solid ${palette.borderSoft}`, width: "100%", textAlign: "left", cursor: "pointer" }}
                  >
                    {post.book.cover_url ? (
                      <img src={post.book.cover_url} alt={post.book.title} style={{ width: 44, height: 64, objectFit: "cover", borderRadius: "4px", flexShrink: 0, boxShadow: "0 2px 8px rgba(42,31,26,0.2)" }} />
                    ) : (
                      <BookCoverPlaceholder title={post.book.title} author={post.book.author} width={44} height={64} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...display, fontWeight: 700, fontStyle: "italic", fontSize: "1.05rem", color: palette.ink, marginBottom: "0.15rem", lineHeight: 1.25 }}>{post.book.title}</p>
                      <p style={{ ...body, fontStyle: "italic", fontSize: "0.84rem", color: palette.inkSoft, marginBottom: "0.3rem" }}>{post.book.author}</p>
                      {isFinished && post.book.rating > 0 && (
                        <p style={{ fontSize: "0.85rem", color: palette.amberRich, letterSpacing: "0.05em" }}>
                          {"★".repeat(post.book.rating)}{"☆".repeat(5 - post.book.rating)}
                        </p>
                      )}
                      <p style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, marginTop: "0.3rem" }}>Toca para ver detalles →</p>
                    </div>
                  </button>
                )}

                {/* Reseña si terminó */}
                {isFinished && post.book?.review && (
                  <p style={{ ...body, fontStyle: "italic", color: palette.inkSoft, fontSize: "0.9rem", borderLeft: `3px solid ${palette.accent}55`, paddingLeft: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    "{post.book.review}"
                  </p>
                )}

                {/* Texto del post */}
                {post.content && (
                  <p style={{ ...ts.body15, color: palette.ink, lineHeight: 1.65, marginBottom: "0.75rem" }}>{post.content}</p>
                )}

                {/* Imagen del post */}
                {post.image_url && (
                  <button
                    onClick={() => setLightboxImage(post.image_url)}
                    style={{ display: "block", width: "100%", border: "none", padding: 0, cursor: "pointer", marginBottom: "0.75rem", borderRadius: 12, overflow: "hidden" }}
                  >
                    <img src={post.image_url} alt="" style={{ width: "100%", display: "block", borderRadius: 12 }} />
                  </button>
                )}

                {/* Footer: likes + comentarios */}
                <div style={{ borderTop: `1px solid ${palette.borderSoft}`, paddingTop: "0.75rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <LikeButton postId={post.id} count={likeCounts[post.id] || 0} liked={likedPosts.has(post.id)} onToggle={toggleLike} />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleComments(post.id); }}
                    style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, backgroundColor: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}
                  >
                    <MessageCircle size={14} strokeWidth={2} />
                    {commentsOpen
                      ? "Ocultar comentarios"
                      : commentCounts[post.id]
                        ? `Comentarios (${commentCounts[post.id]})`
                        : "Comentarios"}
                  </button>
                </div>
                {commentsOpen && <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} postOwnerId={post.user_id} /></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Snacks carousel + invitar amigo — al final del feed */}
      {(feedState === 'ready' || feedState === 'empty') && (
        <div style={{ paddingTop: "1rem", borderTop: `1px solid ${palette.borderSoft}` }}>
          <SnacksCarousel onRead={setActiveReader} />
          {/* Invitar amigo */}
          <div style={{ marginTop: "1.5rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "1.1rem 1.25rem" }}>
            <p style={{ ...display, fontSize: "1rem", color: palette.ink, margin: "0 0 0.2rem" }}>Invita a un amigo y lean juntos</p>
            <p style={{ ...body, fontSize: "0.83rem", color: palette.inkFaint, margin: "0 0 0.85rem" }}>Comparte tu link personal de Folio</p>
            <button onClick={handleInvite} style={{ ...body, fontSize: "0.85rem", fontWeight: 700, backgroundColor: palette.bg, color: palette.ink, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.55rem 1.25rem", cursor: "pointer" }}>
              Invitar amigo
            </button>
          </div>
        </div>
      )}

      {previewPost && (
        <BookPreviewModal post={previewPost} onClose={() => setPreviewPost(null)} onAdd={onAdd} />
      )}

      {profileModalAuthor && (
        <FriendProfileModal friend={profileModalAuthor} user={user} onClose={() => setProfileModalAuthor(null)} />
      )}

      {showLogModal && (
        <ReadingLogModal
          user={user}
          pagesLoggedToday={pagesLoggedToday}
          onClose={() => setShowLogModal(false)}
          onGoToAdd={() => setTab?.("add")}
          onSuccess={(result) => {
            setShowLogModal(false);
            loadStreakInfo();
            if (result?.pages > 0) {
              setShareSession({ book: result.book, pages: result.pages, minutes: timerMinutes });
              setTimerMinutes(null);
            }
          }}
        />
      )}

      {showTimerModal && readingBooks.length > 0 && (
        <FiveMinutesModal
          books={readingBooks}
          onClose={() => setShowTimerModal(false)}
          onGoToLog={(mins) => { setTimerMinutes(mins || null); setShowTimerModal(false); setShowLogModal(true); }}
        />
      )}

      {shareSession && (
        <ShareSessionModal
          user={user}
          session={shareSession}
          onClose={() => setShareSession(null)}
          onShared={() => { loadFeed(); loadStreakInfo(); }}
        />
      )}

      {/* Lightbox para imágenes de posts */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: palette.onAccent }}
          >
            <X size={18} />
          </button>
          <img
            src={lightboxImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }}
          />
        </div>
      )}

      {/* Lector interno de cuentos */}
      {activeReader && (
        <ReaderView
          cuento={activeReader}
          user={user}
          onClose={() => setActiveReader(null)}
          onAddToLibrary={(bookData) => { onAdd(bookData); }}
        />
      )}

      {/* ── Confirmación de borrar post ── */}
      {postToDelete && (
        <>
          <div
            onClick={() => !deleting && setPostToDelete(null)}
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(42,31,26,0.55)", zIndex: 300, animation: "backdropIn 200ms ease-out" }}
          />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301,
            backgroundColor: palette.bgCard,
            borderRadius: "20px 20px 0 0",
            padding: "1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom))",
            maxWidth: 480, margin: "0 auto",
            boxShadow: "0 -4px 32px rgba(42,31,26,0.18)",
            animation: "slideUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}>
            <div style={{ width: 36, height: 4, backgroundColor: palette.border, borderRadius: 999, margin: "0 auto 1.25rem" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.65rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: palette.dangerSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trash2 size={18} color={palette.danger} strokeWidth={2} />
              </div>
              <div>
                <p style={{ ...display, fontWeight: 700, fontSize: "1rem", color: palette.ink }}>¿Borrar este post?</p>
                <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginTop: "0.1rem" }}>Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.1rem" }}>
              <button
                onClick={() => handleDeletePost(postToDelete)}
                disabled={deleting}
                style={{
                  width: "100%", padding: "0.85rem", borderRadius: 12,
                  backgroundColor: palette.danger, color: palette.onAccent,
                  border: "none", cursor: deleting ? "default" : "pointer",
                  ...display, fontSize: "0.97rem", fontWeight: 600,
                  opacity: deleting ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                }}
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                {deleting ? "Borrando…" : "Sí, borrar post"}
              </button>
              <button
                onClick={() => setPostToDelete(null)}
                disabled={deleting}
                style={{
                  width: "100%", padding: "0.85rem", borderRadius: 12,
                  backgroundColor: "transparent", color: palette.inkSoft,
                  border: `1px solid ${palette.border}`, cursor: "pointer",
                  ...body, fontSize: "0.95rem",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RatingDistribution({ books }) {
  const rated = (books || []).filter(b => b.rating >= 1 && b.rating <= 5);
  if (rated.length === 0) return null;

  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  rated.forEach(b => { counts[Math.round(b.rating)]++; });
  const max = Math.max(...Object.values(counts), 1);
  const avg = (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1);

  return (
    <div style={{ marginTop: "1.5rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "14px", padding: "1rem 1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: "0.82rem", fontWeight: 600, color: palette.inkSoft }}>Calificaciones</span>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.78rem", fontWeight: 700, color: palette.amber }}>{avg} ★ promedio</span>
      </div>
      {[5, 4, 3, 2, 1].map(star => (
        <div key={star} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: star > 1 ? "0.38rem" : 0 }}>
          <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.68rem", color: palette.inkFaint, width: 26, textAlign: "right", flexShrink: 0, letterSpacing: "-0.01em" }}>{star} ★</span>
          <div style={{ flex: 1, height: 8, borderRadius: "999px", backgroundColor: palette.bgSoft, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "999px",
              width: `${(counts[star] / max) * 100}%`,
              backgroundColor: counts[star] === max ? palette.amber : palette.amber + "80",
              transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
          <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.68rem", color: counts[star] > 0 ? palette.inkSoft : palette.inkFaint, width: 18, flexShrink: 0, fontWeight: counts[star] === max ? 700 : 400 }}>
            {counts[star]}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReadingStatsView({ books }) {
  const read = books.filter((b) => b.status === "read");
  const reading = books.filter((b) => b.status === "reading");
  const want = books.filter((b) => b.status === "want_to_read");
  const rated = read.filter((b) => b.rating > 0);
  const avgRating = rated.length > 0 ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : null;
  const fiveStars = read.filter((b) => b.rating === 5).length;

  const stats = [
    { label: "Leídos",          value: read.length,                          Icon: BookCheck,  iconColor: palette.sage, bg: `${palette.sage}08`, accent: palette.sage, border: `${palette.sage}22` },
    { label: "Leyendo",         value: reading.length,                       Icon: BookOpen,   iconColor: palette.amber, bg: `${palette.amber}08`, accent: BRAND.wine, border: `${palette.amber}22` },
    { label: "Por leer",        value: want.length,                          Icon: Bookmark,   iconColor: palette.slate, bg: `${palette.slate}08`, accent: palette.slate, border: `${palette.slate}22` },
    { label: "Total",           value: books.length,                         Icon: Library,    iconColor: BRAND.wineDeep, bg: `${BRAND.wineDeep}08`, accent: BRAND.ink, border: `${BRAND.wineDeep}22` },
    { label: "Valoración media",value: avgRating ? `${avgRating} ★` : "—",  Icon: Star,       iconColor: palette.amber, bg: `${palette.amber}08`, accent: palette.amberInk, border: `${palette.amber}22` },
    { label: "Cinco estrellas", value: fiveStars,                            Icon: Award,      iconColor: palette.amber, bg: `${palette.amber}08`, accent: BRAND.wineDeep, border: `${palette.amber}22` },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto">
      <h2 style={{ ...display, fontSize: "1.3rem", fontStyle: "italic", fontWeight: 700, color: palette.ink, marginBottom: "1.5rem" }}>Tu resumen lector</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: "14px", padding: "1.2rem 1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <s.Icon size={24} strokeWidth={1.5} color={s.iconColor} style={{ marginBottom: "0.5rem" }} />
            <div style={{ ...display, fontSize: "2rem", fontWeight: 800, color: s.accent, lineHeight: 1, marginBottom: "0.25rem" }}>{s.value}</div>
            <div style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <RatingDistribution books={books} />
    </div>
  );
}

function ExplorarView({ user, books, onSelectBook, onAdd }) {
  const [sub, setSub] = useState("para_ti");
  const [searchOpen, setSearchOpen] = useState(false);
  const isUAM = (user?.university || "").toUpperCase() === "UAM";
  const TABS = [
    { id: "para_ti", label: "Para ti" },
    { id: "descubrir", label: "Descubrir" },
    ...(isUAM ? [{ id: "uam", label: "Bib. UAM" }] : []),
  ];
  return (
    <div>
      <div className="px-4 sm:px-6 pt-5 max-w-4xl mx-auto">
        {/* Buscar — solo visible fuera de Descubrir */}
        {sub !== "descubrir" && (
          <button
            onClick={() => setSearchOpen(true)}
            className="btn-press"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1rem", marginBottom: "1rem", borderRadius: 12, border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgCard, cursor: "pointer" }}
          >
            <Search size={18} color={palette.inkFaint} />
            <span style={{ ...body, fontSize: "0.92rem", color: palette.inkFaint }}>Busca por título, autor o ISBN…</span>
          </button>
        )}
        <SubTabBar tabs={TABS} active={sub} onChange={setSub} />
      </div>
      {sub === "para_ti" && (
        <>
          <CollaborativeRecommendations user={user} onAdd={onAdd} />
          <RecommendFlow books={books} onSelectBook={onSelectBook} onAdd={onAdd} />
        </>
      )}
      {sub === "descubrir" && <BookTinder user={user} onAdd={onAdd} />}
      {sub === "uam" && isUAM && <UAMLibraryView books={books} onAdd={onAdd} />}
      {searchOpen && (
        <SearchBookModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={(b) => { onAdd(b); setSearchOpen(false); }}
        />
      )}
    </div>
  );
}

// ============ QUOTES COMPONENTS ============

function SaveQuoteModal({ books, userId, onClose, onSaved, defaultBookId }) {
  const [text, setText] = useState("");
  const [bookId, setBookId] = useState(() => {
    if (defaultBookId) return defaultBookId;
    const reading = (books || []).find(b => b.status === "reading");
    return reading?.id || "";
  });
  const [pageNumber, setPageNumber] = useState("");
  const [shareToFeed, setShareToFeed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const q = await insertQuote({
        bookId: bookId || null,
        text,
        pageNumber: pageNumber ? parseInt(pageNumber) : null,
        mood: null,
        isPublic: shareToFeed,
        sharedToFeed: shareToFeed,
      }, userId);
      if (shareToFeed) {
        const quoteContent = JSON.stringify({
          __folio_type: "quote",
          text: q.text,
          mood: q.mood || null,
          page_number: q.pageNumber || null,
          bookTitle: q.bookTitle || null,
          bookAuthor: q.bookAuthor || null,
        });
        // Use type "text" to avoid any CHECK constraint on the posts table
        await createFeedPost({ userId, type: "text", bookId: bookId || null, content: quoteContent }).catch(e => console.error("[SaveQuoteModal] feed post:", e));
      }
      onSaved(q);
    } catch (e) {
      console.error("[SaveQuoteModal]", e);
    } finally {
      setSaving(false);
    }
  }

  const readingBooks = (books || []).filter(b => b.status === "reading");
  const otherBooks = (books || []).filter(b => b.status !== "reading");

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: "rgba(42,31,26,0.65)", animation: "backdropIn 200ms ease-out" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-xl"
        style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}`, maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: `1px solid ${palette.borderSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ ...display, fontSize: "1.1rem", fontWeight: 600, color: palette.ink }}>Guardar frase</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: palette.inkFaint, display: "flex", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: "1rem" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe la frase que te voló la cabeza..."
            autoFocus
            rows={5}
            style={{
              width: "100%", boxSizing: "border-box",
              ...body, fontSize: "1.05rem", color: palette.ink,
              backgroundColor: palette.bgCard,
              border: `1.5px solid ${text.trim() ? palette.accent + "60" : palette.border}`,
              borderRadius: "10px", padding: "0.85rem",
              resize: "none", outline: "none", lineHeight: 1.55,
              marginBottom: "0.85rem", transition: "border-color 150ms ease",
            }}
          />

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ ...ts.label, display: "block", marginBottom: "0.3rem" }}>Libro</label>
            <select
              value={bookId}
              onChange={e => setBookId(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", ...body, fontSize: "0.95rem", color: palette.ink, backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.55rem 0.75rem", outline: "none", cursor: "pointer" }}
            >
              <option value="">Sin libro específico</option>
              {readingBooks.map(b => <option key={b.id} value={b.id}>📖 {b.title} — {b.author}</option>)}
              {otherBooks.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "0.85rem" }}>
            <label style={{ ...ts.label, display: "block", marginBottom: "0.3rem" }}>Página (opcional)</label>
            <input
              type="number"
              value={pageNumber}
              onChange={e => setPageNumber(e.target.value)}
              placeholder="ej. 142"
              min="1"
              style={{ width: "100%", boxSizing: "border-box", ...body, fontSize: "0.95rem", color: palette.ink, backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.55rem 0.75rem", outline: "none" }}
            />
          </div>


          {/* Share to feed toggle */}
          <button
            onClick={() => setShareToFeed(v => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: shareToFeed ? palette.accent + "12" : palette.bgCard, border: `1.5px solid ${shareToFeed ? palette.accent + "60" : palette.border}`, borderRadius: "10px", padding: "0.75rem 1rem", cursor: "pointer", marginBottom: "0.85rem", transition: "all 150ms ease" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Feather size={15} color={shareToFeed ? palette.accent : palette.inkFaint} strokeWidth={2} />
              <div style={{ textAlign: "left" }}>
                <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: shareToFeed ? palette.accent : palette.ink, margin: 0 }}>Compartir en mi feed</p>
                <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.72rem", color: palette.inkFaint, margin: "0.1rem 0 0" }}>Tus amigos podrán verla</p>
              </div>
            </div>
            <div style={{ width: 38, height: 22, borderRadius: "999px", backgroundColor: shareToFeed ? palette.accent : palette.border, position: "relative", transition: "background-color 200ms ease", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: shareToFeed ? 19 : 3, width: 16, height: 16, borderRadius: "50%", backgroundColor: palette.onAccent, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 200ms ease" }} />
            </div>
          </button>

          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            style={{ width: "100%", ...display, fontSize: "1rem", fontWeight: 600, color: palette.onAccent, backgroundColor: (!text.trim() || saving) ? palette.border : palette.accent, border: "none", borderRadius: "10px", padding: "0.85rem", cursor: (!text.trim() || saving) ? "not-allowed" : "pointer", transition: "background-color 150ms ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {saving ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={16} />}
            {saving ? "Guardando..." : shareToFeed ? "Guardar y compartir" : "Guardar frase"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ quote, onPress, onToggleFavorite, onShareToFeed }) {
  const moodLabel = MOOD_OPTIONS.find(m => m.key === quote.mood)?.label;
  return (
    <div
      style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(42,31,26,0.05)" }}
    >
      <button
        onClick={onPress}
        className="text-left"
        style={{ width: "100%", padding: "1.25rem 1.1rem 1rem", position: "relative", overflow: "hidden", cursor: "pointer", background: "none", border: "none" }}
      >
        <div style={{ position: "absolute", top: 6, left: 10, fontFamily: "Georgia, serif", fontSize: "4.5rem", lineHeight: 1, color: palette.accent + "12", pointerEvents: "none", userSelect: "none" }}>"</div>
        <div style={{ paddingLeft: "0.4rem", paddingTop: "0.35rem" }}>
          <p style={{ ...body, fontSize: "1.05rem", fontStyle: "italic", color: palette.ink, lineHeight: 1.62, marginBottom: "0.8rem", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {quote.text}
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
            <div style={{ minWidth: 0 }}>
              {quote.bookTitle && (
                <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.74rem", color: palette.inkSoft, fontWeight: 500, marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {quote.bookTitle}{quote.bookAuthor ? ` · ${quote.bookAuthor}` : ""}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                {quote.pageNumber && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.68rem", color: palette.inkFaint }}>Pág. {quote.pageNumber}</span>}
                {moodLabel && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.68rem", color: palette.accent, backgroundColor: palette.accent + "15", borderRadius: "999px", padding: "0.12rem 0.45rem" }}>{moodLabel}</span>}
                {quote.isPublic && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.65rem", color: palette.inkFaint, display: "flex", alignItems: "center", gap: "0.2rem" }}>✓ En feed</span>}
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
            >
              <Heart size={18} fill={quote.isFavorite ? palette.like : "none"} strokeWidth={1.8} color={quote.isFavorite ? palette.like : palette.inkFaint} />
            </button>
          </div>
        </div>
      </button>

      {/* Share to feed strip */}
      {!quote.isPublic && onShareToFeed && (
        <button
          onClick={onShareToFeed}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.5rem", borderTop: `1px solid ${palette.borderSoft}`, background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: palette.inkFaint, transition: "color 150ms ease" }}
        >
          <Feather size={12} strokeWidth={2} />
          Compartir en feed
        </button>
      )}
    </div>
  );
}

function QuoteShareCard({ quote, cardRef }) {
  return (
    <div ref={cardRef} style={{ width: "320px", background: BRAND.gradientShareCard, borderRadius: "20px", padding: "2.5rem 2rem 1.75rem", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: "1rem", minHeight: "380px" }}>
      <div style={{ position: "absolute", top: -60, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -40, left: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />
      <p style={{ fontFamily: "Fraunces, serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.35em", color: "rgba(42,31,26,0.5)", textTransform: "uppercase", margin: 0 }}>FOLIO</p>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "4rem", lineHeight: 0.9, color: "rgba(42,31,26,0.18)", margin: 0 }}>"</div>
      <p style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "1.15rem", lineHeight: 1.62, color: BRAND.ink, margin: 0, flex: 1 }}>
        {(quote.text || "").length > 220 ? (quote.text || "").slice(0, 220) + "…" : quote.text}
      </p>
      {quote.bookTitle && (
        <div style={{ borderTop: "1px solid rgba(42,31,26,0.15)", paddingTop: "0.75rem" }}>
          <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.85rem", color: "rgba(42,31,26,0.6)", margin: 0 }}>
            — {quote.bookTitle}{quote.bookAuthor ? ` · ${quote.bookAuthor}` : ""}
          </p>
        </div>
      )}
      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.65rem", color: "rgba(42,31,26,0.4)", letterSpacing: "0.06em", margin: 0 }}>
        folio-final.vercel.app
      </p>
    </div>
  );
}

function QuoteShareModal({ quote, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [shared, setShared] = useState(false);

  async function handleShare() {
    if (generating) return;
    setGenerating(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, { scale: 2.5, useCORS: true, backgroundColor: null, logging: false });
      canvas.toBlob(async blob => {
        const file = new File([blob], "frase-folio.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "Frase guardada en Folio" });
          setShared(true);
        } else {
          const url = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url; a.download = "frase-folio.png"; a.click();
          setShared(true);
        }
      }, "image/png");
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.78)" }} onClick={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }} onClick={e => e.stopPropagation()}>
        <QuoteShareCard quote={quote} cardRef={cardRef} />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleShare}
            disabled={generating}
            style={{ ...display, fontSize: "0.95rem", fontWeight: 600, backgroundColor: palette.accent, color: palette.onAccent, border: "none", borderRadius: "10px", padding: "0.75rem 1.5rem", cursor: generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {generating ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Share2 size={16} />}
            {shared ? "¡Listo!" : generating ? "Generando..." : "Compartir imagen"}
          </button>
          <button onClick={onClose} style={{ fontSize: "0.95rem", fontWeight: 500, backgroundColor: "rgba(255,255,255,0.14)", color: palette.onAccent, border: "1px solid rgba(255,255,255,0.28)", borderRadius: "10px", padding: "0.75rem 1.25rem", cursor: "pointer", fontFamily: "Fraunces, serif" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteDetailModal({ quote: initialQuote, books, userId, onClose, onUpdate, onDelete, onToggleFavorite }) {
  const [quote, setQuote] = useState(initialQuote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialQuote);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const moodLabel = MOOD_OPTIONS.find(m => m.key === quote.mood)?.label;
  const formattedDate = new Date(quote.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  async function handleSave() {
    if (!draft.text?.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateQuoteInDB(draft, userId);
      const book = (books || []).find(b => b.id === draft.bookId);
      const updated = { ...draft, bookTitle: book?.title || quote.bookTitle, bookAuthor: book?.author || quote.bookAuthor };
      setQuote(updated);
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      console.error("[quotes] no se pudo guardar la frase:", err);
      setSaveError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    const newVal = !quote.isFavorite;
    setQuote(q => ({ ...q, isFavorite: newVal }));
    try {
      await toggleQuoteFavorite(quote.id, userId, newVal);
      onToggleFavorite({ ...quote, isFavorite: newVal });
    } catch (err) {
      console.error("[quotes] no se pudo cambiar favorita:", err);
      setQuote(q => ({ ...q, isFavorite: !newVal }));
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center sm:p-4" style={{ backgroundColor: "rgba(42,31,26,0.62)", animation: "backdropIn 200ms ease-out" }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0" style={{ backgroundColor: palette.bg, borderBottom: `1px solid ${palette.borderSoft}`, padding: "0.875rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {!editing ? (
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button onClick={() => { setEditing(true); setDraft(quote); }} style={{ background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, padding: "4px", display: "flex" }} title="Editar"><Pencil size={18} strokeWidth={1.8} /></button>
              <button onClick={() => setShowDeleteConfirm(true)} style={{ background: "none", border: "none", cursor: "pointer", color: palette.inkFaint, padding: "4px", display: "flex" }} title="Eliminar"><Trash2 size={18} strokeWidth={1.8} /></button>
              <button onClick={() => setShowShare(true)} style={{ background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, padding: "4px", display: "flex" }} title="Compartir"><Share2 size={18} strokeWidth={1.8} /></button>
            </div>
          ) : (
            <span style={{ ...display, fontSize: "0.95rem", fontWeight: 600, color: palette.ink }}>Editar frase</span>
          )}
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {editing && (
              <button onClick={handleSave} disabled={saving} style={{ ...display, fontSize: "0.82rem", fontWeight: 600, backgroundColor: palette.accent, color: palette.onAccent, border: "none", borderRadius: "8px", padding: "0.32rem 0.8rem", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "..." : "Guardar"}
              </button>
            )}
            <button onClick={editing ? () => { setEditing(false); setDraft(quote); } : onClose} style={{ background: "none", border: "none", cursor: "pointer", color: palette.inkFaint, padding: "4px", display: "flex" }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: "1.5rem 1.25rem" }}>
          {editing ? (
            <div>
              <textarea
                value={draft.text}
                onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
                rows={6}
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", ...body, fontSize: "1.05rem", fontStyle: "italic", color: palette.ink, backgroundColor: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: "10px", padding: "0.85rem", resize: "none", outline: "none", lineHeight: 1.55, marginBottom: "1rem" }}
              />
              {saveError && <p style={{ ...body, fontSize: "0.85rem", color: palette.danger, marginTop: "-0.5rem", marginBottom: "0.75rem" }}>{saveError}</p>}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ ...ts.label, display: "block", marginBottom: "0.25rem" }}>Libro</label>
                <select value={draft.bookId || ""} onChange={e => setDraft(d => ({ ...d, bookId: e.target.value || null }))} style={{ width: "100%", ...body, fontSize: "0.9rem", color: palette.ink, backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.5rem 0.65rem", outline: "none" }}>
                  <option value="">Sin libro</option>
                  {(books || []).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ ...ts.label, display: "block", marginBottom: "0.25rem" }}>Página (opcional)</label>
                <input type="number" value={draft.pageNumber || ""} onChange={e => setDraft(d => ({ ...d, pageNumber: e.target.value ? parseInt(e.target.value) : null }))} style={{ width: "100%", boxSizing: "border-box", ...body, fontSize: "0.9rem", color: palette.ink, backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.5rem 0.65rem", outline: "none" }} />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ position: "relative", marginBottom: "1.5rem", padding: "0.75rem 0.5rem" }}>
                <div style={{ position: "absolute", top: -4, left: -2, fontFamily: "Georgia, serif", fontSize: "5rem", lineHeight: 0.85, color: palette.accent + "22", userSelect: "none", pointerEvents: "none" }}>"</div>
                <p style={{ ...body, fontSize: "1.18rem", fontStyle: "italic", lineHeight: 1.68, color: palette.ink, paddingLeft: "1.25rem", paddingRight: "0.5rem" }}>
                  {quote.text}
                </p>
                <div style={{ position: "absolute", bottom: -8, right: -2, fontFamily: "Georgia, serif", fontSize: "5rem", lineHeight: 0.85, color: palette.accent + "22", userSelect: "none", pointerEvents: "none" }}>"</div>
              </div>

              {quote.bookTitle && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem", paddingBottom: "0.75rem", borderBottom: `1px solid ${palette.borderSoft}` }}>
                  <BookOpen size={13} color={palette.inkFaint} strokeWidth={1.8} />
                  <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.82rem", color: palette.inkSoft }}>
                    {quote.bookTitle}{quote.bookAuthor && <span style={{ fontStyle: "italic" }}> · {quote.bookAuthor}</span>}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", marginBottom: "1.25rem" }}>
                {quote.pageNumber && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.78rem", color: palette.inkFaint }}>Página {quote.pageNumber}</span>}
                {moodLabel && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.78rem", color: palette.accent, backgroundColor: palette.accent + "15", borderRadius: "999px", padding: "0.15rem 0.55rem" }}>{moodLabel}</span>}
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.78rem", color: palette.inkFaint }}>{formattedDate}</span>
              </div>

              <button
                onClick={handleToggle}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", ...body, fontSize: "0.9rem", color: quote.isFavorite ? palette.like : palette.inkSoft, background: "none", border: `1px solid ${quote.isFavorite ? "${palette.like}40" : palette.border}`, borderRadius: "8px", padding: "0.6rem 1rem", cursor: "pointer", transition: "all 150ms ease", width: "100%", justifyContent: "center" }}
              >
                <Heart size={16} fill={quote.isFavorite ? palette.like : "none"} strokeWidth={1.8} color={quote.isFavorite ? palette.like : palette.inkSoft} />
                {quote.isFavorite ? "Quitar de favoritas" : "Marcar como favorita"}
              </button>
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <div style={{ padding: "0 1.25rem 1.25rem" }}>
            <div style={{ backgroundColor: palette.dangerSoft, border: `1px solid ${palette.dangerBorder}`, borderRadius: "10px", padding: "1rem" }}>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.88rem", color: palette.dangerInk, marginBottom: "0.75rem" }}>
                ¿Eliminar esta frase? No se puede deshacer.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, ...body, fontSize: "0.88rem", backgroundColor: palette.bgCard, color: palette.inkSoft, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.5rem", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={onDelete} style={{ flex: 1, ...body, fontSize: "0.88rem", fontWeight: 600, backgroundColor: palette.danger, color: palette.onAccent, border: "none", borderRadius: "8px", padding: "0.5rem", cursor: "pointer" }}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showShare && <QuoteShareModal quote={quote} onClose={() => setShowShare(false)} />}
    </div>
  );
}

function QuotesView({ user, books }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFav, setFilterFav] = useState(false);
  const [filterBook, setFilterBook] = useState("");
  const [filterMood, setFilterMood] = useState("");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchQuotes(user.id)
      .then(setQuotes)
      .catch(e => console.error("[QuotesView]", e))
      .finally(() => setLoading(false));
  }, [user.id]);

  function showToast(msg) {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 3500);
  }

  async function handleToggleFavorite(quote) {
    const newVal = !quote.isFavorite;
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isFavorite: newVal } : q));
    try {
      await toggleQuoteFavorite(quote.id, user.id, newVal);
    } catch (err) {
      console.error("[quotes] no se pudo cambiar favorita:", err);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isFavorite: !newVal } : q));
    }
  }

  async function handleDelete(quoteId) {
    try {
      await deleteQuoteFromDB(quoteId, user.id);
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setSelectedQuote(null);
      showToast("Frase eliminada");
    } catch (err) {
      console.error("[quotes] no se pudo eliminar la frase:", err);
      showToast("No se pudo eliminar la frase. Intenta de nuevo.");
    }
  }

  async function handleShareToFeed(quote) {
    try {
      // Create post FIRST — only mark is_public if post creation succeeds
      const quoteContent = JSON.stringify({
        __folio_type: "quote",
        text: quote.text,
        mood: quote.mood || null,
        page_number: quote.pageNumber || null,
        bookTitle: quote.bookTitle || null,
        bookAuthor: quote.bookAuthor || null,
      });
      // Use type "text" to avoid any CHECK constraint on the posts table
      await createFeedPost({ userId: user.id, type: "text", bookId: quote.bookId || null, content: quoteContent });

      // Post created successfully → now mark quote as public
      await setQuotePublic(quote.id, user.id);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isPublic: true } : q));
      showToast("¡Frase compartida en tu feed! 🔥");
    } catch (e) {
      console.error("[QuotesView] handleShareToFeed:", e.message, e);
      showToast("No se pudo compartir en tu feed");
    }
  }

  function handleUpdate(updated) {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
    setSelectedQuote(updated);
  }

  function handleSaved(newQuote) {
    const book = (books || []).find(b => b.id === newQuote.bookId);
    const enriched = { ...newQuote, bookTitle: newQuote.bookTitle || book?.title || null, bookAuthor: newQuote.bookAuthor || book?.author || null };
    setQuotes(prev => [enriched, ...prev]);
    setShowSaveModal(false);
    showToast("Frase guardada ✨");
  }

  const filtered = quotes.filter(q => {
    if (filterFav && !q.isFavorite) return false;
    if (filterBook && q.bookId !== filterBook) return false;
    if (filterMood && q.mood !== filterMood) return false;
    return true;
  });

  const booksWithQuotes = (books || []).filter(b => quotes.some(q => q.bookId === b.id));
  const activeFilter = filterFav || filterBook || filterMood;

  return (
    <div className="px-4 sm:px-6 py-5 max-w-4xl mx-auto">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ ...ts.h1, color: palette.ink, marginBottom: "0.15rem" }}>Mis Frases</h1>
          {quotes.length > 0 && (
            <p style={{ ...body, color: palette.inkFaint, fontSize: "0.85rem" }}>
              {quotes.length} frase{quotes.length !== 1 ? "s" : ""} guardada{quotes.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{ ...display, fontSize: "0.88rem", fontWeight: 600, backgroundColor: palette.accent, color: palette.onAccent, border: "none", borderRadius: "10px", padding: "0.55rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}
        >
          <Plus size={15} /> Guardar
        </button>
      </div>

      {quotes.length > 1 && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <button onClick={() => { setFilterFav(false); setFilterBook(""); setFilterMood(""); }}
            style={{ ...body, fontSize: "0.8rem", padding: "0.28rem 0.75rem", borderRadius: "999px", border: `1px solid ${!activeFilter ? palette.accent : palette.border}`, backgroundColor: !activeFilter ? palette.accent + "18" : palette.bgCard, color: !activeFilter ? palette.accent : palette.inkSoft, cursor: "pointer" }}>
            Todas
          </button>
          <button onClick={() => { setFilterFav(f => !f); setFilterBook(""); setFilterMood(""); }}
            style={{ ...body, fontSize: "0.8rem", padding: "0.28rem 0.75rem", borderRadius: "999px", border: `1px solid ${filterFav ? palette.accent : palette.border}`, backgroundColor: filterFav ? palette.accent + "18" : palette.bgCard, color: filterFav ? palette.accent : palette.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Heart size={11} fill={filterFav ? palette.accent : "none"} color={filterFav ? palette.accent : palette.inkSoft} strokeWidth={2} />
            Favoritas
          </button>
          {booksWithQuotes.length > 0 && (
            <select value={filterBook} onChange={e => { setFilterBook(e.target.value); setFilterFav(false); setFilterMood(""); }}
              style={{ ...body, fontSize: "0.8rem", padding: "0.28rem 0.75rem", borderRadius: "999px", border: `1px solid ${filterBook ? palette.accent : palette.border}`, backgroundColor: filterBook ? palette.accent + "18" : palette.bgCard, color: filterBook ? palette.accent : palette.inkSoft, cursor: "pointer", outline: "none" }}>
              <option value="">Por libro</option>
              {booksWithQuotes.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <Loader2 size={26} color={palette.border} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 0.5rem" }} />
          <p style={{ ...body, color: palette.inkFaint, fontSize: "0.9rem" }}>Cargando frases...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.85rem" }}>📖</div>
          <p style={{ ...display, fontStyle: "italic", fontSize: "1.25rem", color: palette.ink, marginBottom: "0.45rem" }}>
            Aún no guardas frases
          </p>
          <p style={{ ...body, color: palette.inkSoft, fontSize: "0.9rem", maxWidth: 300, margin: "0 auto 1.75rem" }}>
            Cuando leas algo que te vuele la cabeza, guárdalo aquí
          </p>
          <button
            onClick={() => setShowSaveModal(true)}
            style={{ ...display, fontSize: "0.95rem", fontWeight: 600, backgroundColor: palette.accent, color: palette.onAccent, border: "none", borderRadius: "10px", padding: "0.7rem 1.5rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
          >
            <Plus size={16} /> Guardar primera frase
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic" }}>No hay frases con este filtro</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {filtered.map(q => (
            <QuoteCard
              key={q.id}
              quote={q}
              onPress={() => setSelectedQuote(q)}
              onToggleFavorite={() => handleToggleFavorite(q)}
              onShareToFeed={() => handleShareToFeed(q)}
            />
          ))}
        </div>
      )}

      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          books={books}
          userId={user.id}
          onClose={() => setSelectedQuote(null)}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selectedQuote.id)}
          onToggleFavorite={updated => setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q))}
        />
      )}

      {showSaveModal && (
        <SaveQuoteModal
          books={books}
          userId={user.id}
          onClose={() => setShowSaveModal(false)}
          onSaved={handleSaved}
        />
      )}

      {localToast && (
        <div style={{ position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", backgroundColor: palette.ink, color: palette.bg, padding: "0.75rem 1.25rem", borderRadius: "14px", boxShadow: "0 4px 24px rgba(0,0,0,0.35)", zIndex: 4000, maxWidth: "88vw", textAlign: "center", ...body, fontSize: "0.88rem", lineHeight: 1.4, animation: "slideUp 350ms cubic-bezier(0.32, 0.72, 0, 1)", border: "1px solid rgba(200,146,74,0.3)" }}>
          {localToast}
        </div>
      )}
    </div>
  );
}

function PerfilWrapper({ user, onUserUpdate, books, onSelectBook, setTab, onLogout, isOnline = true, theme, setTheme }) {
  const [sub, setSub] = useState("perfil");
  const TABS = [
    { id: "perfil", label: "Mi perfil" },
    { id: "libros", label: "Mis libros" },
    { id: "frases", label: "Mis Frases" },
    { id: "resumen", label: "Resumen" },
  ];
  return (
    <div>
      <div className="px-4 sm:px-6 pt-5 max-w-4xl mx-auto">
        <SubTabBar tabs={TABS} active={sub} onChange={setSub} />
        {!isOnline && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.6rem", marginBottom: "0.25rem" }}>
            <WifiOff size={12} color={palette.amber} strokeWidth={2} />
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "12px", color: palette.amber }}>
              Modo sin conexión — mostrando datos guardados
            </span>
          </div>
        )}
      </div>
      {sub === "libros" && <LibraryView books={books} onSelectBook={onSelectBook} setTab={setTab} isOnline={isOnline} />}
      {sub === "perfil" && <ProfileView user={user} onUserUpdate={onUserUpdate} books={books} onSelectBook={onSelectBook} onLogout={onLogout} theme={theme} setTheme={setTheme} />}
      {sub === "frases" && <QuotesView user={user} books={books} />}
      {sub === "resumen" && <ReadingStatsView books={books} />}
    </div>
  );
}

// ============ TOAST ============
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)",
      backgroundColor: palette.ink, color: palette.bg,
      padding: "0.75rem 1.25rem", borderRadius: "14px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      zIndex: 3000, maxWidth: "88vw", textAlign: "center",
      ...body, fontSize: "0.88rem", lineHeight: 1.4,
      animation: "slideUp 350ms cubic-bezier(0.32, 0.72, 0, 1)",
      border: `1px solid rgba(200,146,74,0.3)`,
    }}>
      {message}
    </div>
  );
}

function GemToast({ amount, label, id, onDismiss }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setClosing(true);
      setTimeout(onDismiss, 220);
    }, 3000);
    return () => clearTimeout(t);
  }, [id]);
  return (
    <div style={{
      position: "fixed",
      bottom: 96,
      left: "50%",
      zIndex: 4000,
      pointerEvents: "none",
      animation: closing
        ? "gemToastOut 220ms ease-in forwards"
        : "gemToastIn 300ms cubic-bezier(0.34,1.56,0.64,1) both",
      transformOrigin: "center bottom",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.45rem",
        padding: "0.6rem 1.1rem 0.6rem 0.8rem",
        background: `linear-gradient(135deg, ${PALETTE_LIGHT.amber} 0%, ${PALETTE_LIGHT.amberRich} 100%)`,
        borderRadius: 999,
        boxShadow: "0 6px 24px rgba(200,146,74,0.5), 0 2px 6px rgba(0,0,0,0.2)",
        whiteSpace: "nowrap",
      }}>
        <img src="/gema.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
        <span style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1.05rem", color: palette.onAccent, lineHeight: 1, letterSpacing: "-0.01em" }}>
          {label || `+${amount} gemas`} ✨
        </span>
      </div>
    </div>
  );
}

// ============ WRAPPED STORY EXPERIENCE ============
function WrappedStoryExperience({ wrap, onClose }) {
  const { data, month, year, wrap_type } = wrap;
  const isAnnual = wrap_type === "annual";
  const monthName = isAnnual ? null : MONTHS_ES[(month || 1) - 1];
  const periodLabel = isAnnual ? `${year}` : `${monthName} ${year}`;

  // Derived stats
  const books = data.booksRead || [];
  const booksCount = books.length;
  const totalPages = data.totalPages || 0;
  const topGenre = data.topGenre || null;
  const favBook = data.favoriteBook || null;
  const uniqueGenres = [...new Set(books.map(b => b.genre).filter(Boolean))].length;

  // Personality
  const personality = (() => {
    if (uniqueGenres >= 3) return { label: "Exploradora curiosa", sub: "los géneros no te dan miedo — los coleccionas" };
    if (booksCount >= 4) return { label: "Devoradora rápida", sub: "terminas libros como episodios de serie" };
    if (totalPages > 800) return { label: "Pensadora profunda", sub: "prefieres calidad sobre cantidad" };
    if (topGenre?.toLowerCase().includes("roman")) return { label: "Romántica nocturna", sub: "las historias de amor te tienen" };
    return { label: "Lectora constante", sub: "un libro a la vez, hasta el final" };
  })();

  // Pages comparison
  const stPages = totalPages > 0 ? Math.round(totalPages / 187) : 0;
  const pagesComparison = stPages > 0 ? `eso es ~${stPages} episodios de una serie` : "páginas que valen un mundo";

  // Top author
  const authorCount = {};
  books.forEach(b => { if (b.author) authorCount[b.author] = (authorCount[b.author] || 0) + 1; });
  const topAuthor = Object.keys(authorCount).sort((a, b) => authorCount[b] - authorCount[a])[0] || null;
  const topAuthorCount = topAuthor ? authorCount[topAuthor] : 0;

  // Hours reading (avg 25 pages/hour)
  const hoursReading = totalPages > 0 ? Math.round(totalPages / 25) : 0;
  const stEps = hoursReading > 0 ? Math.round(hoursReading / 0.75) : 0;
  const hoursComparison = stEps >= 2
    ? `como ver ${stEps} episodios de una serie`
    : hoursReading === 1 ? "una tarde bien aprovechada" : "cada minuto que leíste vale";

  const slides = [
    { type: "intro" },
    { type: "books" },
    { type: "pages" },
    ...(topAuthor ? [{ type: "topauthor" }] : []),
    ...(topGenre ? [{ type: "genre" }] : []),
    ...(favBook ? [{ type: "favbook" }] : []),
    ...(hoursReading > 0 ? [{ type: "speed" }] : []),
    { type: "personality" },
    { type: "share" },
  ];

  const [idx, setIdx] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [entering, setEntering] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const touchStartRef = useRef(null);
  const slideRef = useRef(null);
  const DURATION = 5000;

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setIdx(i => {
        if (i >= slides.length - 1) { onClose(); return i; }
        return i + 1;
      });
    }, DURATION);
    return () => clearInterval(timerRef.current);
  }, [idx, paused, slides.length]);

  // Entry animation
  useEffect(() => {
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 320);
    return () => clearTimeout(t);
  }, [idx]);

  // Books counter animation on slide 1
  useEffect(() => {
    if (slides[idx]?.type !== "books") return;
    setDisplayCount(0);
    if (booksCount === 0) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(booksCount / 20));
    const t = setInterval(() => {
      n = Math.min(n + step, booksCount);
      setDisplayCount(n);
      if (n >= booksCount) clearInterval(t);
    }, 60);
    return () => clearInterval(t);
  }, [idx]);

  function goNext() {
    if (idx < slides.length - 1) setIdx(i => i + 1);
    else onClose();
  }
  function goPrev() {
    if (idx > 0) setIdx(i => i - 1);
  }

  function handleTap(e) {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.35) goPrev(); else goNext();
  }

  function handleTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e) {
    if (!touchStartRef.current) return;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dx = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);
    if (dy > 90 && dx < 60) { onClose(); return; }
    if (dx > 50) {
      const dir = e.changedTouches[0].clientX - touchStartRef.current.x;
      if (dir < 0) goNext(); else goPrev();
    }
    touchStartRef.current = null;
  }

  const slide = slides[idx];
  const bg = WRAPPED_SLIDE_GRADIENTS[idx % WRAPPED_SLIDE_GRADIENTS.length];

  function SlideContent() {
    const textShadow = "0 2px 12px rgba(0,0,0,0.4)";
    const big = { fontFamily: "Fraunces, serif", fontStyle: "italic", fontWeight: 900, color: BRAND.cream, textShadow, lineHeight: 1 };
    const sub = { fontFamily: "'EB Garamond', serif", color: "rgba(245,237,224,0.75)", lineHeight: 1.45 };

    if (slide.type === "intro") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "0.72rem", fontWeight: 600, color: "rgba(245,237,224,0.5)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1rem" }}>folio</p>
        <p style={{ ...big, fontSize: "clamp(2.4rem, 10vw, 3.2rem)", marginBottom: "0.5rem" }}>tu {isAnnual ? "año" : "mes"}</p>
        <p style={{ ...big, fontSize: "clamp(2rem, 8vw, 2.8rem)", color: BRAND.amberLight }}>{periodLabel}</p>
        <p style={{ ...sub, fontSize: "1rem", marginTop: "1.5rem" }}>en libros</p>
      </div>
    );

    if (slide.type === "books") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1.1rem", marginBottom: "1rem" }}>leíste</p>
        <p style={{ ...big, fontSize: "clamp(5rem, 22vw, 7rem)" }}>{displayCount}</p>
        <p style={{ ...big, fontSize: "clamp(1.8rem, 7vw, 2.4rem)", color: BRAND.amberLight, marginTop: "0.35rem" }}>
          {booksCount === 1 ? "libro" : "libros"}
        </p>
        {data.prevMonthBooks > 0 && booksCount > data.prevMonthBooks && (
          <p style={{ ...sub, fontSize: "0.88rem", marginTop: "1.25rem" }}>
            {booksCount - data.prevMonthBooks} más que el {isAnnual ? "año" : "mes"} anterior
          </p>
        )}
        {booksCount === 0 && <p style={{ ...sub, fontSize: "0.88rem", marginTop: "0.75rem" }}>el próximo {isAnnual ? "año" : "mes"} empieza la racha</p>}
      </div>
    );

    if (slide.type === "pages") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1.1rem", marginBottom: "1rem" }}>recorriste</p>
        <p style={{ ...big, fontSize: "clamp(4rem, 18vw, 6rem)" }}>{totalPages.toLocaleString("es")}</p>
        <p style={{ ...big, fontSize: "clamp(1.6rem, 6vw, 2.2rem)", color: HEATMAP_COLORS.dark[3], marginTop: "0.35rem" }}>páginas</p>
        <p style={{ ...sub, fontSize: "0.85rem", marginTop: "1.5rem", maxWidth: 240, margin: "1.5rem auto 0" }}>{pagesComparison}</p>
      </div>
    );

    if (slide.type === "genre") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1rem", marginBottom: "1.25rem" }}>tu género del {isAnnual ? "año" : "mes"}</p>
        <p style={{ ...big, fontSize: "clamp(2.2rem, 9vw, 3rem)", color: BRAND.amberLight }}>{topGenre}</p>
        <p style={{ ...sub, fontSize: "0.88rem", marginTop: "1.25rem" }}>
          {uniqueGenres > 1 ? `también exploraste ${uniqueGenres - 1} género${uniqueGenres > 2 ? "s" : ""} más` : "tu gusto es profundo"}
        </p>
      </div>
    );

    if (slide.type === "favbook") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1rem", marginBottom: "1.25rem" }}>el libro que te marcó</p>
        <p style={{ ...big, fontSize: "clamp(1.5rem, 6vw, 2rem)", maxWidth: 260, margin: "0 auto 0.5rem" }}>{favBook.title}</p>
        <p style={{ ...sub, fontStyle: "italic", fontSize: "0.95rem", marginBottom: "0.75rem" }}>{favBook.author}</p>
        {favBook.rating > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: "0.5rem" }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ fontSize: "1.4rem", opacity: s <= favBook.rating ? 1 : 0.25 }}>★</span>
            ))}
          </div>
        )}
      </div>
    );

    if (slide.type === "topauthor") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1rem", marginBottom: "1.25rem" }}>tu autor del {isAnnual ? "año" : "mes"}</p>
        <p style={{ ...big, fontSize: "clamp(1.5rem, 6vw, 2.2rem)", color: BRAND.amberLight, maxWidth: 280, margin: "0 auto 0.5rem", lineHeight: 1.2 }}>{topAuthor}</p>
        {topAuthorCount > 1 && (
          <p style={{ ...sub, fontSize: "0.88rem", marginTop: "1rem" }}>
            {topAuthorCount} {topAuthorCount === 1 ? "libro suyo" : "libros suyos"} este {isAnnual ? "año" : "mes"}
          </p>
        )}
        <p style={{ ...sub, fontStyle: "italic", fontSize: "0.78rem", marginTop: "1.25rem", color: "rgba(245,237,224,0.45)" }}>
          sin pedirle permiso, claro
        </p>
      </div>
    );

    if (slide.type === "speed") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1rem", marginBottom: "1rem" }}>tiempo leyendo</p>
        <p style={{ ...big, fontSize: "clamp(4rem, 18vw, 6rem)" }}>{hoursReading}</p>
        <p style={{ ...big, fontSize: "clamp(1.5rem, 6vw, 2rem)", color: BRAND.amberLight, marginTop: "0.35rem" }}>
          {hoursReading === 1 ? "hora" : "horas"}
        </p>
        <p style={{ ...sub, fontSize: "0.85rem", marginTop: "1.5rem", maxWidth: 240, margin: "1.5rem auto 0" }}>{hoursComparison}</p>
      </div>
    );

    if (slide.type === "personality") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...sub, fontSize: "1rem", marginBottom: "1.5rem" }}>tu personalidad lectora</p>
        <p style={{ ...big, fontSize: "clamp(1.8rem, 7vw, 2.6rem)" }}>{personality.label}</p>
        <p style={{ ...sub, fontSize: "0.9rem", maxWidth: 240, margin: "1rem auto 0", lineHeight: 1.6, fontStyle: "italic" }}>{personality.sub}</p>
      </div>
    );

    if (slide.type === "share") return (
      <div style={{ textAlign: "center" }}>
        <p style={{ ...big, fontSize: "clamp(1.8rem, 7vw, 2.4rem)", marginBottom: "0.75rem" }}>comparte</p>
        <p style={{ ...sub, fontSize: "0.9rem", marginBottom: "2rem", maxWidth: 220, margin: "0.75rem auto 2rem" }}>
          cuéntale a tu gente cómo fue tu {isAnnual ? "año" : "mes"} lector
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxWidth: 260, margin: "0 auto" }}>
          <ShareButton wrap={wrap} setPaused={setPaused} slideRef={slideRef} />
          <button onClick={onClose} style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.9rem", color: "rgba(245,237,224,0.6)", background: "none", border: "1px solid rgba(245,237,224,0.25)", borderRadius: 10, padding: "0.65rem", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    );

    return null;
  }

  // TODO(audit): SlideContent y ShareButton se definen dentro del render de WrappedStoryExperience,
  // así que se remontan en cada render del padre (p. ej. al pausar para descargar se pierde el
  // estado `sharing`). Sacarlos a nivel de módulo cuando se rediseñe el Wrapped.
  function ShareButton({ wrap: w, setPaused: sp, slideRef: sr }) {
    const [sharing, setSharing] = useState(false);
    const [shared, setShared] = useState(false);

    async function handleShare() {
      const { data: d, month: m, year: y, wrap_type: wt } = w;
      const isA = wt === "annual";
      const mn = isA ? null : MONTHS_ES[(m || 1) - 1];
      const label = isA ? `${y}` : `${mn} ${y}`;
      const text = `mi wrapped de ${label} en folio: ${d.booksRead?.length || 0} libros, ${d.totalPages || 0} páginas${d.topGenre ? `, mi género favorito fue ${d.topGenre}` : ""}. #folio #lectura`;
      if (navigator.share) {
        try { await navigator.share({ title: "Mi Folio Wrapped", text }); setShared(true); } catch { /* share cancelado */ }
      } else {
        try { await navigator.clipboard.writeText(text); setShared(true); setTimeout(() => setShared(false), 2500); } catch (err) { console.warn("[wrapped] no se pudo copiar:", err); }
      }
    }

    async function handleDownload() {
      sp(true);
      setSharing(true);
      try {
        const { default: html2canvas } = await import("html2canvas");
        const el = sr?.current;
        if (el) {
          const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
          const link = document.createElement("a");
          link.download = `folio-wrapped.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
      } catch (err) { console.error(err); }
      setSharing(false);
      sp(false);
    }

    return (
      <>
        <button onClick={handleShare} style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1rem", backgroundColor: BRAND.cream, color: BRAND.wine, border: "none", borderRadius: 12, padding: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}>
          <Share2 size={17} />{shared ? "¡compartido!" : "compartir wrapped"}
        </button>
        <button onClick={handleDownload} disabled={sharing} style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.9rem", backgroundColor: "rgba(245,237,224,0.12)", color: BRAND.cream, border: "1px solid rgba(245,237,224,0.25)", borderRadius: 10, padding: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          {sharing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
          guardar imagen
        </button>
      </>
    );
  }

  const shouldReduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      ref={slideRef}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: bg, display: "flex", flexDirection: "column", cursor: "pointer", userSelect: "none", transition: shouldReduceMotion ? "none" : "background 400ms ease" }}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div style={{ display: "flex", gap: 4, padding: "env(safe-area-inset-top, 12px) 14px 10px", flexShrink: 0 }}>
        {slides.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, backgroundColor: "rgba(245,237,224,0.25)", overflow: "hidden" }}>
            {i < idx && <div style={{ width: "100%", height: "100%", backgroundColor: BRAND.cream }} />}
            {i === idx && !paused && !shouldReduceMotion && (
              <div style={{ height: "100%", backgroundColor: BRAND.cream, animation: `progressFill ${DURATION}ms linear forwards` }} />
            )}
            {i === idx && (paused || shouldReduceMotion) && (
              <div style={{ height: "100%", width: "50%", backgroundColor: BRAND.cream }} />
            )}
          </div>
        ))}
      </div>

      {/* Close button */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 12px) + 18px)", right: 16, zIndex: 10 }}>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: "rgba(0,0,0,0.35)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} color={BRAND.cream} />
        </button>
      </div>

      {/* Slide content */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1.5rem 2rem 3rem",
          animation: entering && !shouldReduceMotion ? "wrapSlideIn 300ms cubic-bezier(0.23,1,0.32,1)" : "none",
        }}
      >
        <SlideContent />
      </div>

      {/* Tap zones hint (mobile) */}
      {idx === 0 && (
        <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)", left: 0, right: 0, textAlign: "center" }}>
          <p style={{ fontFamily: "system-ui", fontSize: "0.68rem", color: "rgba(245,237,224,0.4)", letterSpacing: "0.06em" }}>toca para avanzar · desliza abajo para cerrar</p>
        </div>
      )}
    </div>
  );
}

// ============ BOOK SHARE CARD ============
function BookShareCard({ book, rating, review, streak, booksThisYear, cardRef }) {
  const year = new Date().getFullYear();
  const reviewSnippet = review ? review.slice(0, 90) + (review.length > 90 ? "…" : "") : null;

  return (
    <div ref={cardRef} style={{
      width: "320px",
      background: BRAND.gradientShareCard,
      borderRadius: "20px",
      padding: "1.75rem 1.5rem 1.25rem",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "0.7rem",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative orb */}
      <div style={{ position: "absolute", top: -70, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -40, left: -40, width: 130, height: 130, borderRadius: "50%", background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />

      {/* Logo */}
      <p style={{ fontFamily: "Fraunces, serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.35em", color: "rgba(42,31,26,0.55)", textTransform: "uppercase", alignSelf: "flex-start", margin: 0 }}>FOLIO</p>

      {/* Book cover */}
      <div style={{ position: "relative", marginTop: "0.25rem", marginBottom: "0.25rem" }}>
        {book.coverUrl
          ? <img src={book.coverUrl} crossOrigin="anonymous" alt="" style={{ width: 140, height: 196, objectFit: "cover", borderRadius: "8px", boxShadow: "0 10px 32px rgba(42,31,26,0.45)", display: "block" }} />
          : <div style={{ width: 140, height: 196, borderRadius: "8px", background: "rgba(122,46,46,0.7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 32px rgba(42,31,26,0.45)" }}>
              <BookOpen size={48} color="rgba(244,237,224,0.8)" />
            </div>
        }
      </div>

      {/* Caption */}
      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.72rem", color: "rgba(42,31,26,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Terminé de leer</p>

      {/* Title */}
      <p style={{ fontFamily: "Fraunces, serif", fontSize: "1.3rem", fontWeight: 800, color: BRAND.ink, textAlign: "center", lineHeight: 1.2, margin: 0, maxWidth: "90%" }}>
        {book.title}
      </p>

      {/* Author */}
      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.88rem", color: "rgba(42,31,26,0.65)", margin: 0 }}>
        de {book.author}
      </p>

      {/* Rating */}
      {rating > 0 && (
        <div style={{ display: "flex", gap: "3px", margin: "0.05rem 0" }}>
          {Array.from({ length: rating }, (_, i) => (
            <Star key={i} size={15} fill={BRAND.amber} color={BRAND.amber} strokeWidth={0} />
          ))}
        </div>
      )}

      {/* Review snippet */}
      {reviewSnippet && (
        <p style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "0.84rem", color: "rgba(42,31,26,0.6)", textAlign: "center", lineHeight: 1.5, maxWidth: "88%", margin: "0.1rem 0" }}>
          "{reviewSnippet}"
        </p>
      )}

      {/* Stats */}
      <div style={{ width: "100%", borderTop: "1px solid rgba(42,31,26,0.15)", paddingTop: "0.75rem", marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <BookOpen size={13} color={BRAND.ink} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.83rem", color: BRAND.ink, margin: 0 }}>
            Libro #{booksThisYear} de {year}
          </p>
        </div>
        {streak?.current_streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Flame size={13} color={BRAND.ink} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.83rem", color: BRAND.ink, margin: 0 }}>
              {streak.current_streak} {streak.current_streak === 1 ? "día" : "días"} de racha
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.67rem", color: "rgba(42,31,26,0.42)", letterSpacing: "0.06em", marginTop: "0.15rem" }}>
        folio-final.vercel.app
      </p>
    </div>
  );
}

function BookShareModal({ book, rating, review, streak, booksThisYear, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [shared, setShared] = useState(false);

  async function getCanvas() {
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(cardRef.current, { scale: 2.5, useCORS: true, backgroundColor: null, logging: false });
  }

  async function handleShare() {
    if (generating) return;
    setGenerating(true);
    try {
      const canvas = await getCanvas();
      await new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          try {
            const file = new File([blob], "folio-logro.png", { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title: `Terminé "${book.title}" en Folio` });
              setShared(true);
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "folio-logro.png"; a.click();
              URL.revokeObjectURL(url);
            }
          } catch (e) { /* cancelled */ }
          resolve();
        }, "image/png");
      });
    } catch (err) { console.error("Share error:", err); }
    setGenerating(false);
  }

  async function handleDownload() {
    if (generating) return;
    setGenerating(true);
    try {
      const canvas = await getCanvas();
      const link = document.createElement("a");
      link.download = `folio-${book.title.slice(0, 30).replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) { console.error("Download error:", err); }
    setGenerating(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      backgroundColor: "rgba(8,4,0,0.97)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start",
      padding: "1.5rem 1rem 2rem",
      overflowY: "auto",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ ...display, fontSize: "1.1rem", color: palette.onDark, fontStyle: "italic" }}>¡Comparte tu logro!</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: palette.onDarkFaint, padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>

        <div className="share-card-enter" style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <BookShareCard book={book} rating={rating} review={review} streak={streak} booksThisYear={booksThisYear} cardRef={cardRef} />
        </div>

        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={handleShare}
            disabled={generating}
            style={{
              flex: 1, padding: "0.85rem", borderRadius: 12,
              backgroundColor: palette.accent, color: palette.onDark,
              border: "none", cursor: "pointer",
              ...display, fontSize: "0.95rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            {generating ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Share2 size={15} />}
            {shared ? "¡Compartido!" : "Compartir"}
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            style={{
              flex: 1, padding: "0.85rem", borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.08)", color: palette.onDarkSoft,
              border: "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer",
              ...body, fontSize: "0.9rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <Download size={15} />
            Guardar imagen
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ BOOK FINISHED CELEBRATION ============
function BookFinishedCelebration({ book, user, allBooks, onClose, onGoToExplorer, onSaveRating }) {
  const [step, setStep] = useState(1);
  const [bookPhase, setBookPhase] = useState("open");
  const [rating, setRating] = useState(book.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState(book.review || "");
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const [booksThisMonth, setBooksThisMonth] = useState(0);
  const [showShareCard, setShowShareCard] = useState(false);
  const [friendCount, setFriendCount] = useState(-1);
  const [showPeakInvite, setShowPeakInvite] = useState(true);
  const postCreatedRef = useRef(false);

  async function createFinishedPost() {
    if (postCreatedRef.current) return;
    postCreatedRef.current = true;
    try {
      await createFeedPost({
        userId: user.id,
        type: "book_update",
        bookId: book.id,
        action: "finished",
        content: review?.trim() || null,
      });
    } catch (err) {
      console.error("[BookFinishedCelebration] Error creando post:", err);
    }
  }

  const wantCount = allBooks.filter(b => b.status === "want_to_read" || b.status === "wish").length;
  const currentYear = new Date().getFullYear();
  const booksThisYear = allBooks.filter(b => b.status === "read" && b.finishedAt && new Date(b.finishedAt).getFullYear() === currentYear).length;

  const ratingTexts = {
    1: "No fue para ti... y está bien",
    2: "Podría haber sido mejor",
    3: "Cumplió su cometido",
    4: "¡Muy buena elección!",
    5: "¡Obra maestra!",
  };

  useEffect(() => {
    if (step !== 1) return;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: [BRAND.wine, BRAND.amber, BRAND.cream, BRAND.ink] });
    const timers = [
      setTimeout(() => confetti({ particleCount: 60, spread: 110, angle: 60, origin: { x: 0, y: 0.5 }, colors: BRAND.confetti }), 250),
      setTimeout(() => confetti({ particleCount: 60, spread: 110, angle: 120, origin: { x: 1, y: 0.5 }, colors: BRAND.confetti }), 450),
      setTimeout(() => setBookPhase("closing"), 900),
      setTimeout(() => setBookPhase("closed"), 1600),
      setTimeout(() => setStep(2), 2700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  async function fetchSummaryData() {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthStr = monthStart.toISOString();
    const [{ data: streakData }, { count: monthCount }, achievedKeys, { count: fc }] = await Promise.all([
      supabase.from("user_streaks").select("current_streak,longest_streak").eq("user_id", user.id).maybeSingle(),
      supabase.from("books").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "read").gte("finished_at", monthStr),
      checkAchievements(user.id, user.name, { silent: true }),
      supabase.from("friendships").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq("status", "accepted"),
    ]);
    setStreak(streakData);
    setBooksThisMonth(monthCount || 0);
    setNewAchievements((achievedKeys || []).map(k => ACHIEVEMENT_DEFS.find(a => a.key === k)).filter(Boolean));
    setFriendCount(fc ?? 0);
  }

  async function handleSaveRating() {
    setSaving(true);
    try {
      await onSaveRating(book.id, rating, review);
      await createFinishedPost();
      await fetchSummaryData();
    } catch (err) {
      console.error("[BookFinishedCelebration] error guardando calificación / resumen:", err);
    } finally {
      setSaving(false);
      setStep(3);
    }
  }

  async function handleSkipRating() {
    try {
      await createFinishedPost();
      await fetchSummaryData();
    } catch (err) {
      console.error("[BookFinishedCelebration] error cargando el resumen:", err);
    } finally {
      setStep(3);
    }
  }

  const displayRating = hoveredRating || rating;

  const bookAnimStyle = {
    open: { animation: "bookAppear 0.5s cubic-bezier(0.22,1,0.36,1) forwards" },
    closing: { animation: "bookClosing 0.7s cubic-bezier(0.4,0,0.2,1) forwards" },
    closed: { animation: "bookClosed 0.4s ease-out forwards" },
  }[bookPhase];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      backgroundColor: "rgba(8,4,0,0.96)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
      overflowY: "auto",
    }}>

      {/* STEP 1 — Celebration */}
      {step === 1 && (
        <div style={{ textAlign: "center", animation: "celebCardIn 0.4s ease-out" }}>
          <div style={{ width: 88, height: 108, margin: "0 auto 2rem", position: "relative", ...bookAnimStyle }}>
            <div style={{
              width: "100%", height: "100%",
              backgroundColor: palette.accent,
              borderRadius: "4px 14px 14px 4px",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "6px 6px 24px rgba(122,46,46,0.5), -3px 2px 10px rgba(0,0,0,0.35)",
            }}>
              {bookPhase === "closed"
                ? <BookmarkCheck size={38} color={palette.onDark} />
                : <BookOpen size={38} color={palette.onDark} />}
            </div>
          </div>
          <h1 style={{ ...display, fontSize: "clamp(2rem,7vw,3rem)", color: palette.onDark, fontStyle: "italic", marginBottom: "0.5rem" }}>
            ¡Libro terminado!
          </h1>
          <p style={{ ...body, fontSize: "1.15rem", color: palette.onDarkSoft, marginBottom: "0.25rem" }}>{book.title}</p>
          <p style={{ ...body, fontSize: "0.9rem", color: palette.onDarkFaint }}>{book.author}</p>
        </div>
      )}

      {/* STEP 2 — Rating */}
      {step === 2 && (
        <div style={{ width: "100%", maxWidth: 400, animation: "celebCardIn 0.45s ease-out" }}>
          <h2 style={{ ...display, fontSize: "1.9rem", color: palette.onDark, fontStyle: "italic", textAlign: "center", marginBottom: "0.2rem" }}>
            ¿Qué te pareció?
          </h2>
          <p style={{ ...body, fontSize: "0.9rem", color: palette.onDarkFaint, textAlign: "center", marginBottom: "1.75rem" }}>
            {book.title}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.35rem", marginBottom: "0.65rem" }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n}
                onMouseEnter={() => setHoveredRating(n)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(n)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem" }}
              >
                <Star
                  size={46}
                  fill={n <= displayRating ? BRAND.amber : "none"}
                  color={n <= displayRating ? BRAND.amber : palette.onDarkMuted}
                  style={{ transition: "all 0.12s" }}
                />
              </button>
            ))}
          </div>

          <p style={{ ...body, textAlign: "center", color: BRAND.amber, fontSize: "1rem", minHeight: "1.5rem", marginBottom: "1.5rem", transition: "opacity 0.2s" }}>
            {displayRating > 0 ? ratingTexts[displayRating] : ""}
          </p>

          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="¿Qué te dejó este libro? (opcional)"
            rows={3}
            style={{
              width: "100%", borderRadius: "12px", padding: "0.85rem",
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              color: palette.onDark, ...body, fontSize: "0.95rem",
              resize: "none", outline: "none",
              marginBottom: "1.25rem",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={handleSaveRating}
            disabled={saving || rating === 0}
            style={{
              width: "100%", padding: "0.9rem", borderRadius: "12px",
              backgroundColor: rating > 0 ? palette.accent : BRAND.ink,
              color: rating > 0 ? palette.onDark : palette.onDarkMuted,
              border: "none", cursor: rating > 0 ? "pointer" : "default",
              ...display, fontSize: "1.05rem",
              marginBottom: "0.65rem",
              transition: "background-color 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {saving && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            Guardar calificación
          </button>
          <button
            onClick={handleSkipRating}
            style={{
              width: "100%", padding: "0.6rem", background: "none", border: "none",
              color: palette.onDarkMuted, ...body, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Saltar por ahora
          </button>
        </div>
      )}

      {/* STEP 3 — Summary */}
      {step === 3 && (
        <div style={{ width: "100%", maxWidth: 420, animation: "celebCardIn 0.45s ease-out" }}>
          <h2 style={{ ...display, fontSize: "1.9rem", color: palette.onDark, fontStyle: "italic", textAlign: "center", marginBottom: "1.5rem" }}>
            Tu resumen
          </h2>

          {streak && (
            <div style={{
              backgroundColor: "rgba(122,46,46,0.18)", border: "1.5px solid rgba(122,46,46,0.35)",
              borderRadius: "14px", padding: "1rem 1.25rem",
              display: "flex", alignItems: "center", gap: "1rem",
              marginBottom: "0.75rem",
            }}>
              <Flame size={28} color={BRAND.amber} />
              <div>
                <div style={{ ...display, fontSize: "1.5rem", color: palette.onDark }}>
                  {streak.current_streak || 0} <span style={{ fontSize: "0.8rem", ...body, color: BRAND.amber }}>días de racha</span>
                </div>
                <div style={{ ...body, fontSize: "0.82rem", color: palette.onDarkFaint }}>
                  {streak.longest_streak > (streak.current_streak || 0)
                    ? `Mejor racha: ${streak.longest_streak} días`
                    : "¡Nueva mejor racha!"}
                </div>
              </div>
            </div>
          )}

          <div style={{
            backgroundColor: "rgba(200,146,74,0.1)", border: "1.5px solid rgba(200,146,74,0.22)",
            borderRadius: "14px", padding: "1rem 1.25rem",
            display: "flex", alignItems: "center", gap: "1rem",
            marginBottom: "0.75rem",
          }}>
            <BookOpen size={24} color={BRAND.amber} />
            <div style={{ ...body, color: palette.onDarkSoft, fontSize: "0.95rem" }}>
              Has leído{" "}
              <strong style={{ ...display, color: palette.onDark, fontSize: "1.1rem" }}>{booksThisMonth}</strong>{" "}
              {booksThisMonth === 1 ? "libro" : "libros"} este mes
            </div>
          </div>

          {newAchievements.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ ...body, fontSize: "0.8rem", color: palette.onDarkFaint, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "center" }}>
                <Award size={13} />Logros desbloqueados
              </p>
              {newAchievements.map((a, i) => (
                <div key={a.key} style={{
                  backgroundColor: "rgba(200,146,74,0.14)", border: "1.5px solid rgba(200,146,74,0.32)",
                  borderRadius: "12px", padding: "0.75rem 1rem",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  marginBottom: "0.45rem",
                  animation: `achievementBounce 0.5s ${i * 0.12}s ease-out both`,
                }}>
                  <span style={{ fontSize: "1.5rem" }}>{a.emoji}</span>
                  <div>
                    <div style={{ ...display, color: BRAND.amber, fontSize: "0.95rem" }}>{a.name}</div>
                    <div style={{ ...body, color: palette.onDarkFaint, fontSize: "0.78rem" }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowShareCard(true)}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(122,46,46,0.18) 0%, rgba(200,146,74,0.18) 100%)",
              border: "1.5px solid rgba(200,146,74,0.35)",
              color: BRAND.amber, cursor: "pointer",
              ...display, fontSize: "1rem",
              marginTop: "0.5rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            <Camera size={17} />
            Compartir en stories
          </button>

          <button
            onClick={() => setStep(4)}
            style={{
              width: "100%", padding: "0.9rem", borderRadius: "12px",
              backgroundColor: palette.accent, color: palette.onDark,
              border: "none", cursor: "pointer",
              ...display, fontSize: "1.05rem",
              marginTop: "0.65rem",
            }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* STEP 4 — What's next */}
      {step === 4 && (
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center", animation: "celebCardIn 0.45s ease-out" }}>
          <Sparkles size={42} color={BRAND.amber} style={{ marginBottom: "1rem" }} />
          <h2 style={{ ...display, fontSize: "1.9rem", color: palette.onDark, fontStyle: "italic", marginBottom: "0.5rem" }}>
            ¿Listo para el siguiente?
          </h2>
          <p style={{ ...body, color: palette.onDarkFaint, fontSize: "0.9rem", marginBottom: "2rem" }}>
            {wantCount > 0
              ? `Tienes ${wantCount} ${wantCount === 1 ? "libro" : "libros"} esperándote en tu biblioteca`
              : "Folio tiene miles de libros esperándote"}
          </p>

          <button
            onClick={onGoToExplorer}
            style={{
              width: "100%", padding: "0.9rem", borderRadius: "12px",
              backgroundColor: palette.accent, color: palette.onDark,
              border: "none", cursor: "pointer",
              ...display, fontSize: "1.05rem",
              marginBottom: "0.75rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            <Compass size={18} />
            Ver mis recomendaciones
          </button>

          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "0.8rem", borderRadius: "12px",
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              color: palette.onDarkSoft, ...body, fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Volver a mi biblioteca
          </button>

          {showPeakInvite && friendCount >= 0 && friendCount < 5 && canShowInviteCard() && (
            <PeakInviteCard
              message={`Acabo de terminar "${book.title}" en Folio 📚 Es una app para llevar tu biblioteca personal y ver qué leen tus amigos. Únete: https://folio-final.vercel.app`}
              url="https://folio-final.vercel.app"
              userInitial={(user.name || "?")[0]}
              onClose={() => setShowPeakInvite(false)}
              dark
            />
          )}
        </div>
      )}

      {showShareCard && (
        <BookShareModal
          book={book}
          rating={rating}
          review={review}
          streak={streak}
          booksThisYear={booksThisYear}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}

// ============ PWA UPDATE BANNER ============
function PWAUpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 60 seconds while the app is open
      if (r) setInterval(() => r.update(), 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div style={{
      position: "fixed", bottom: "calc(64px + env(safe-area-inset-bottom))", left: "50%",
      transform: "translateX(-50%)", zIndex: 9999,
      backgroundColor: palette.ink, color: palette.bg,
      borderRadius: "14px", padding: "0.75rem 1.1rem",
      display: "flex", alignItems: "center", gap: "0.85rem",
      boxShadow: "0 4px 24px rgba(42,31,26,0.35)",
      maxWidth: "calc(100vw - 2rem)", width: "max-content",
      animation: "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)",
    }}>
      <Sparkles size={16} color={palette.amber} style={{ flexShrink: 0 }} />
      <span style={{ ...body, fontSize: "0.88rem", color: palette.bg }}>Nueva versión disponible</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          ...display, fontSize: "0.82rem", fontWeight: 600,
          backgroundColor: palette.accent, color: palette.onAccent,
          border: "none", borderRadius: "999px", padding: "0.35rem 0.85rem",
          cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
        }}
      >
        Actualizar ahora
      </button>
      <button
        onClick={() => updateServiceWorker(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(244,237,224,0.55)", padding: "2px", flexShrink: 0 }}
        title="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============ MAIN APP ============
function resolveTheme(pref) {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function MainApp({ user, onLogout, onUserUpdate, initialRefUser, onRefUserConsumed, showTutorial }) {
  const [tab, setTab] = useState("home");
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [notifsSheetOpen, setNotifsSheetOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [pendingPost, setPendingPost] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [celebrationBook, setCelebrationBook] = useState(null);
  const [readDateBook, setReadDateBook] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [gemBalance, setGemBalance] = useState(0);
  const [gemToastQueue, setGemToastQueue] = useState([]);
  const [pet, setPet] = useState(null);
  const [showPetOnboarding, setShowPetOnboarding] = useState(false);
  const [petHubOpen, setPetHubOpen] = useState(false);
  const [amigosSheetOpen, setAmigosSheetOpen] = useState(false);
  const [petToastQueue, setPetToastQueue] = useState([]);
  const [petStreak, setPetStreak] = useState(null);
  const [tutorialActive, setTutorialActive] = useState(() => showTutorial && !localStorage.getItem('folio_firstLoginTutorial'));
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSaveQuote, setShowSaveQuote] = useState(false);
  const [defaultQuoteBookId, setDefaultQuoteBookId] = useState(null);

  function openSaveQuote(bookId) {
    setDefaultQuoteBookId(bookId || null);
    setShowSaveQuote(true);
  }

  // Gemas: se otorgan en el SERVIDOR (triggers/RPCs), pero la moneda visible
  // es SOLO el XP de la mascota.
  // showGemToast queda como no-op para no mostrar gemas en la UI.
  function showGemToast(_amount, _label) {}
  const [activeWrap, setActiveWrap] = useState(null);
  const [mainUsername, setMainUsername] = useState(null);
  const [refModalUser, setRefModalUser] = useState(initialRefUser || null);
  const isOnline = useOnlineStatus();

  const [themePref, setThemePref] = useState(() => localStorage.getItem('folio_theme') || 'light');
  const [, forceThemeUpdate] = useState(0);

  // Sync palette synchronously on every render
  const isDark = resolveTheme(themePref) === 'dark';
  Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT);

  // Listen for OS-level preference changes when using "system"
  useEffect(() => {
    if (themePref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => forceThemeUpdate(n => n + 1);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themePref]);

  function setTheme(pref) {
    localStorage.setItem('folio_theme', pref);
    setThemePref(pref);
  }

  useEffect(() => {
    supabase.from("users").select("username").eq("id", user.id).single()
      .then(({ data }) => { if (data?.username) setMainUsername(data.username); });
  }, [user.id]);

  useEffect(() => {
    if (initialRefUser && initialRefUser.id !== user.id) {
      setRefModalUser(initialRefUser);
    }
  }, [initialRefUser]);

  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      // just came back online — sync queued data
      const run = async () => {
        const logs = getPendingLogs().length;
        const posts = getPendingPosts().length;
        const total = logs + posts;
        if (total === 0) return;
        setToastMessage(`Sincronizando ${total} registro${total > 1 ? "s" : ""} pendiente${total > 1 ? "s" : ""}…`);
        const [syncedLogs, syncedPosts] = await Promise.all([syncPendingLogs(), syncPendingPosts()]);
        const done = syncedLogs + syncedPosts;
        if (done > 0) {
          setToastMessage(`¡Sincronizado! ${done} registro${done > 1 ? "s" : ""} guardado${done > 1 ? "s" : ""} ✓`);
          setTimeout(() => setToastMessage(null), 3000);
          // Refresh books after sync
          fetchBooks(user.id).then(b => setBooks(b)).catch((err) => console.error("[books] refresco tras sincronizar falló:", err));
        } else {
          setToastMessage(null);
        }
      };
      run();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!navigator.onLine) {
      // Offline al arrancar: usar caché inmediatamente, sin esperar Supabase
      const cached = getCachedBooks();
      console.log("[offline] Arrancando sin conexión, books en caché:", cached ? cached.length : 0);
      setBooks(cached || []);
      setLoaded(true);
    } else {
      fetchBooks(user.id)
        .then((b) => { setBooks(b); setLoaded(true); })
        .catch((err) => {
          console.error("Error cargando libros:", err);
          const cached = getCachedBooks();
          setBooks(cached || []);
          setLoaded(true);
        });
    }
    refreshPendingCount();
    refreshUnreadMessages();
    refreshUnreadNotifs();
    if (import.meta.env.DEV) debugNotifications();   // volcado de depuración: solo en dev (evita un SELECT * en producción)
    checkStreakOnLoad(user.id);

    // Retroactive achievements — run once per user via localStorage flag
    const retroFlag = `retroactive_check_done_${user.id}`;
    if (!localStorage.getItem(retroFlag)) {
      checkAchievements(user.id, user.name, { silent: true }).then(newKeys => {
        localStorage.setItem(retroFlag, "1");
        if (newKeys && newKeys.length > 0) {
          setToastMessage(`¡Desbloqueaste ${newKeys.length} ${newKeys.length === 1 ? "logro" : "logros"} basados en tu actividad anterior! 🏆`);
        }
      });
    }

    // Auto-generate monthly wrap on last day of month
    if (isLastDayOfMonth()) {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      supabase.from("monthly_wraps").select("id").eq("user_id", user.id).eq("month", m).eq("year", y).eq("wrap_type", "monthly").maybeSingle()
        .then(({ data: existing }) => {
          if (!existing) {
            generateMonthWrap(user.id, m, y)
              .then(wrap => { if (wrap) setActiveWrap(wrap); })
              .catch(err => console.error("[wrapped] generación automática mensual falló:", err));
          }
        });
    }

    // Auto-generate annual wrap on Dec 31
    const todayCheck = new Date();
    if (todayCheck.getMonth() === 11 && todayCheck.getDate() === 31) {
      const y = todayCheck.getFullYear();
      supabase.from("monthly_wraps").select("id").eq("user_id", user.id).eq("wrap_type", "annual").eq("year", y).maybeSingle()
        .then(({ data: existing }) => {
          if (!existing) generateAnnualWrap(user.id, y)
            .then(wrap => { if (wrap) setActiveWrap(wrap); })
            .catch(err => console.error("[wrapped] generación automática anual falló:", err));
        });
    }
  }, [user.id]);

  async function refreshPendingCount() {
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("friend_id", user.id)
      .eq("status", "pending");
    setPendingCount(count || 0);
  }

  async function refreshUnreadMessages() {
    const count = await getUnreadMessagesCount(user.id);
    setUnreadMessages(count);
  }

  async function refreshUnreadNotifs() {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) { console.error("[notif] refreshUnreadNotifs SELECT error:", error.message, error); return; }
      devLog(`[notif] refreshUnreadNotifs → count sin leer: ${count}`);
      setUnreadNotifs(count || 0);
    } catch (e) { console.error("[notif] refreshUnreadNotifs catch:", e); }
  }

  async function debugNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    devLog("[NOTIF DEBUG] Todos los registros en notifications:", JSON.stringify(data, null, 2));
    devLog("[NOTIF DEBUG] Error en debug SELECT:", error);
    devLog("[NOTIF DEBUG] user.id del usuario actual:", user.id);
  }

  async function saveBookRating(bookId, rating, review) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const updated = { ...book, rating, review };
    setBooks(prev => prev.map(b => b.id === bookId ? updated : b));
    try { await updateBookInDB(updated, user.id); } catch (err) { console.error("Error guardando calificación:", err); }
  }

  useEffect(() => {
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        if (payload.new.sender_id !== user.id) {
          const count = await getUnreadMessagesCount(user.id);
          setUnreadMessages(count);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifs:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        devLog("[notif] Realtime INSERT received → refreshing badge");
        refreshUnreadNotifs();
      })
      .subscribe((status, err) => {
        devLog("[notif] Realtime subscription status:", status, err || "");
      });
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  useEffect(() => {
    const interval = setInterval(refreshUnreadNotifs, 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refreshUnreadNotifs(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user.id]);

  useEffect(() => {
    const unsub = achievementBus.on((keys) => {
      setAchievementQueue((prev) => [...prev, ...keys]);
      if (keys.length > 0) {
        const gemsEarned = keys.length * 10;
        // Server-side: +10 por logro, UNA vez por logro (la RPC valida que el
        // logro exista en la tabla y es idempotente). Devuelve el balance real.
        supabase.rpc("claim_achievement_gems", { p_keys: keys }).then(({ data, error }) => {
          if (error) console.error("[GEMS] claim_achievement_gems falló:", error.message);
          if (data !== null && data !== undefined) setGemBalance(data);
          showGemToast(gemsEarned, `+${gemsEarned} gemas`);
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = gemsEventBus.on((amount) => {
      setGemBalance(prev => prev + amount);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = gemToastBus.on((amount, label) => showGemToast(amount, label));
    return unsub;
  }, []);

  // Cargar mascota; si no tiene, mostrar selección inicial
  useEffect(() => {
    let cancelled = false;
    loadPet(user.id).then((p) => {
      if (cancelled) return;
      if (p) {
        setPet(p);
      } else if (p === null) {
        // La tabla existe pero el usuario aún no tiene mascota → selección inicial
        setShowPetOnboarding(true);
      }
      // p === undefined → tabla ausente/error: no mostrar mascota ni onboarding
    });
    supabase.from("user_streaks").select("current_streak, total_pages_read").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setPetStreak(data); });
    return () => { cancelled = true; };
  }, [user.id]);

  // Reaccionar a cambios de XP/nivel de la mascota
  useEffect(() => {
    const unsub = petBus.on((result) => {
      setPet((prev) => prev ? { ...prev, level: result.newLevel, xp: result.newXp, pet_name: result.petName ?? prev.pet_name, pet_type: result.petType ?? prev.pet_type } : prev);
      if (result.leveledUp) {
        haptic(HAPTIC.BOOK_DONE);
        if (typeof confetti === "function") {
          const colors = [BRAND.wine, BRAND.amber, BRAND.cream];
          confetti({ particleCount: 80, spread: 75, origin: { y: 0.4 }, colors });
          setTimeout(() => confetti({ particleCount: 40, spread: 100, angle: 60, origin: { x: 0, y: 0.5 }, colors }), 200);
          setTimeout(() => confetti({ particleCount: 40, spread: 100, angle: 120, origin: { x: 1, y: 0.5 }, colors }), 350);
        }
        setPetToastQueue((q) => [...q, { id: Date.now() + Math.random(), petName: result.petName, level: result.newLevel, petType: result.petType }]);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadGems(user.id).then(bal => setGemBalance(bal));
    claimDailyGems(user.id).then(earned => {
      if (earned > 0) {
        setGemBalance(prev => prev + earned);
        setTimeout(() => showGemToast(earned, `+${earned} gemas`), 800);
      }
    });
    if (localStorage.getItem("folio_gems_welcome")) {
      localStorage.removeItem("folio_gems_welcome");
      setTimeout(() => showGemToast(5, "+5 gemas"), 1800);
    }
  }, [user.id]);

  async function addBook(book) {
    const withFinished =
      book.status === "read" && !book.finishedAt ? { ...book, finishedAt: Date.now() } : book;
    setBooks((prev) => [withFinished, ...prev]);
    try {
      const dbId = await insertBook(withFinished, user.id);
      if (dbId && dbId !== withFinished.id) {
        setBooks((prev) => prev.map((b) => b.id === withFinished.id ? { ...b, id: dbId } : b));
      }
      if (book.status === "reading") {
        checkAchievements(user.id, user.name);
        setPendingPost({ type: "book_update", action: "started", book: withFinished });
      } else if (book.status === "read") {
        playBookFinished();
        haptic(HAPTIC.BOOK_DONE);
        setReadDateBook(dbId && dbId !== withFinished.id ? { ...withFinished, id: dbId } : withFinished);
        setCelebrationBook(withFinished);
        // Las +50 gemas y +50 XP los otorgó el trigger del servidor en el
        // INSERT; aquí solo se refresca el estado visible.
        loadGems(user.id).then(bal => setGemBalance(bal));
        showGemToast(50, "+50 gemas");
        addPetXP(user.id, 50).catch((err) => console.error("[PET] sync tras libro terminado falló:", err));
      } else {
        checkAchievements(user.id, user.name);
      }
    } catch (err) {
      console.error("Error guardando libro:", err);
      setBooks((prev) => prev.filter((b) => b.id !== withFinished.id));
      setToastMessage(`No se pudo guardar el libro: ${err?.message || "error desconocido"}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  }

  async function updateBook(updated) {
    const prevBook = books.find((b) => b.id === updated.id);
    let final = updated;
    if (updated.status === "read" && (!prevBook || prevBook.status !== "read") && !updated.finishedAt) {
      final = { ...updated, finishedAt: Date.now() };
    }
    setBooks((prev) => prev.map((b) => (b.id === final.id ? final : b)));

    const isFinishing = updated.status === "read" && prevBook && prevBook.status !== "read";

    if (prevBook) {
      if (updated.status === "reading" && prevBook.status !== "reading") {
        setSelectedBook(null);
        setPendingPost({ type: "book_update", action: "started", book: final });
      } else if (isFinishing) {
        setSelectedBook(null);
        playBookFinished();
        haptic(HAPTIC.BOOK_DONE);
        setReadDateBook(final);
        setCelebrationBook(final);
        showGemToast(50, "+50 gemas");
      } else {
        setSelectedBook(final);
      }
    } else {
      setSelectedBook(final);
    }

    try {
      await updateBookInDB(final, user.id);
      if (isFinishing) {
        // Recién aquí el trigger del servidor ya otorgó las +50 gemas y +50 XP
        // (el UPDATE de status acaba de persistir): sincronizar estado real.
        loadGems(user.id).then(bal => setGemBalance(bal));
        addPetXP(user.id, 50).catch((err) => console.error("[PET] sync tras libro terminado falló:", err));
      }
      if (!isFinishing) checkAchievements(user.id, user.name);
      fetchBooks(user.id).then((b) => setBooks(b)).catch((err) => console.error("[books] refresco tras actualizar falló:", err));
    } catch (err) {
      console.error("Error actualizando libro:", err);
      if (prevBook) setBooks((prev) => prev.map((b) => (b.id === prevBook.id ? prevBook : b)));
      setToastMessage("No se pudo guardar el cambio. Intenta de nuevo.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  }

  async function deleteBook(id) {
    const index = books.findIndex((b) => b.id === id);
    const removed = books[index];
    const updated = books.filter((b) => b.id !== id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBook(null);
    try {
      await deleteBookFromDB(id, user.id);
      cacheBooks(updated);
      setToastMessage("Libro eliminado ✓");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("[deleteBook] error:", err?.message);
      if (removed) {
        setBooks((prev) => prev.some((b) => b.id === id)
          ? prev
          : [...prev.slice(0, index), removed, ...prev.slice(index)]);
      }
      const msg = err?.message === "DELETE_NO_ROWS"
        ? "No se pudo eliminar (sin permisos en DB). Verifica RLS en Supabase."
        : "No se pudo eliminar el libro. Intenta de nuevo.";
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 5000);
    }
  }

  if (showPetOnboarding) {
    return (
      <PetOnboarding
        user={user}
        onComplete={(newPet) => {
          setPet(newPet);
          setShowPetOnboarding(false);
          setToastMessage(`¡Bienvenido, ${newPet?.pet_name || "compañero"}! 🐱`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />
    );
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
        input:focus, textarea:focus { border-color: ${palette.accent} !important; box-shadow: 0 0 0 3px ${palette.accent}22; transition: box-shadow 150ms ease, border-color 150ms ease; outline: none; }
        ::selection { background: ${palette.amber}55; color: ${palette.ink}; }
        body {
          background-color: ${palette.bg};
          color: ${palette.ink};
          transition: background-color 300ms ease, color 300ms ease;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        /* ── Base ── */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes gradientShift {
          0% { background-position: 0% center; }
          50% { background-position: 200% center; }
          100% { background-position: 0% center; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Modal system (fixes previously undefined keyframes) ── */
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes backdropOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }

        /* ── Tab screen transitions ── */
        @keyframes tabViewEnter {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .tab-view-enter {
          animation: tabViewEnter 220ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        /* ── Feed load — fade + slight rise ── */
        @keyframes feedFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* ── Feed post stagger entrance ── */
        @keyframes feedPostEnter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .feed-post-item { animation: feedPostEnter 360ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        .feed-post-item:nth-child(1) { animation-delay: 0ms;   }
        .feed-post-item:nth-child(2) { animation-delay: 55ms;  }
        .feed-post-item:nth-child(3) { animation-delay: 110ms; }
        .feed-post-item:nth-child(4) { animation-delay: 155ms; }
        .feed-post-item:nth-child(5) { animation-delay: 190ms; }
        .feed-post-item:nth-child(n+6) { animation-delay: 215ms; }

        /* ── Book list cards — hover lift + active press ── */
        .book-list-card {
          transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
                      box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          .book-list-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(42,31,26,0.13);
          }
        }
        .book-list-card:active {
          transform: scale(0.98) !important;
          transition: transform 100ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        /* ── Book card in feed ── */
        .book-card-hover {
          transition: background-color 150ms ease,
                      transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          .book-card-hover:hover {
            transform: translateY(-1px);
          }
        }
        .book-card-hover:active { transform: scale(0.99); }

        /* ── Nav add button press ── */
        .nav-add-btn > div {
          transition: transform 130ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .nav-add-btn:active > div { transform: scale(0.88) !important; }

        /* ── Streak banner glow ── */
        .streak-banner-active {
          animation: streakGlow 4s ease-in-out infinite;
        }
        @keyframes streakGlow {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(122,46,46,0.35), 0 2px 6px rgba(200,146,74,0.18);
          }
          50% {
            box-shadow: 0 6px 36px rgba(122,46,46,0.6), 0 3px 18px rgba(200,146,74,0.38),
                        inset 0 0 0 1px rgba(244,237,224,0.12);
          }
        }

        /* ── Achievement icon pop (scale from 0.82, not 0) ── */
        .achieve-icon-enter {
          animation: achieveIconPop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes achieveIconPop {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1);    }
        }

        /* ── Achievement row items (improved from scale(0.5) → scale(0.82)) ── */
        @keyframes achievementBounce {
          0%   { transform: scale(0.82) rotate(-6deg); opacity: 0; }
          55%  { transform: scale(1.09) rotate(3deg);  opacity: 1; }
          100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
        }

        /* ── Heart double-tap pop ── */
        .heart-pop-anim {
          animation: heartPop 650ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes heartPop {
          0%   { opacity: 0; transform: scale(0.5);  }
          35%  { opacity: 1; transform: scale(1.35); }
          65%  {             transform: scale(0.9);  }
          85%  {             transform: scale(1.05); opacity: 1; }
          100% { opacity: 0; transform: scale(1.1);  }
        }

        /* ── Comments section expand ── */
        .comments-enter {
          animation: commentsReveal 220ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        @keyframes commentsReveal {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* ── Share card slide-up + scale entrance ── */
        @keyframes shareCardEnter {
          from { opacity: 0; transform: translateY(28px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .share-card-enter {
          animation: shareCardEnter 400ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        /* ── Celebration card ── */
        @keyframes celebCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* ── Book animations ── */
        @keyframes achievementPop {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes bookAppear {
          from { opacity: 0; transform: scale(0.72) rotate(-8deg); }
          to   { opacity: 1; transform: scale(1)    rotate(0deg);  }
        }
        @keyframes bookClosing {
          0%   { transform: scale(1)   rotate(0deg);                  }
          40%  { transform: scale(1.1) rotate(-6deg);                 }
          100% { transform: scale(0.8) rotate(-20deg) translateY(-10px); opacity: 0.7; }
        }
        @keyframes bookClosed {
          from { transform: scale(0.8)  rotate(-20deg) translateY(-10px); opacity: 0.7; }
          to   { transform: scale(0.75) rotate(-18deg) translateY(-8px);  opacity: 0;   }
        }

        /* ── Fire flame pulse ── */
        @keyframes fire-pulse-anim {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 4px rgba(200,146,74,0.5));  }
          50%      { transform: scale(1.18); filter: drop-shadow(0 0 12px rgba(200,146,74,0.9)); }
        }
        .fire-pulse { display: inline-block; animation: fire-pulse-anim 2s ease-in-out infinite; }

        /* ── Sparkle ── */
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 1; transform: scale(1)    rotate(0deg);  }
          40%      { opacity: 0.6; transform: scale(1.25) rotate(12deg); }
          70%      { opacity: 0.9; transform: scale(0.9)  rotate(-8deg); }
        }
        .sparkle-anim { animation: sparkle-pulse 2.2s ease-in-out 2; display: inline-block; }

        /* ── Wrapped Story ── */
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes wrapSlideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Gem toast ── */
        @keyframes gemToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.85); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
        }
        @keyframes gemToastOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.94); }
        }
        @keyframes gemBalancePop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.28); }
          100% { transform: scale(1); }
        }

        /* ── Reduced motion — accessibility ── */
        @media (prefers-reduced-motion: reduce) {
          .tab-view-enter,
          .feed-post-item,
          .streak-banner-active,
          .share-card-enter,
          .achieve-icon-enter,
          .comments-enter,
          .heart-pop-anim,
          .fire-pulse {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
          .book-list-card,
          .book-list-card:hover,
          .book-card-hover:hover {
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <PWAUpdateBanner />
      {!isOnline && (
        <div style={{ backgroundColor: palette.warnBg, borderBottom: `1px solid ${palette.warnBorder}`, height: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
          <WifiOff size={14} color={palette.amber} strokeWidth={2} />
          <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "12px", color: palette.warnInk, fontWeight: 500 }}>
            Sin conexión — algunos datos pueden no estar actualizados
          </span>
        </div>
      )}
      <AppHeader tab={tab} setTab={setTab} pendingCount={pendingCount} unreadMessages={unreadMessages} unreadNotifs={unreadNotifs} onOpenNotifs={() => setNotifsSheetOpen(true)} gemBalance={gemBalance} onOpenPet={() => setPetHubOpen(true)} />
      <main className="max-w-4xl mx-auto pb-24 sm:pb-10 fade-in" style={{ backgroundColor: palette.bgSoft, minHeight: "calc(100vh - 56px)", overflowX: "hidden" }}>
        {loaded && tab === "home" && <div className="tab-view-enter"><HomeView user={user} books={books} pet={pet} streak={petStreak} setTab={setTab} onOpenPet={() => setPetHubOpen(true)} onSelectBook={setSelectedBook} onAdd={addBook} isOnline={isOnline} /></div>}
        {loaded && tab === "social" && <div className="tab-view-enter"><SocialView user={user} onAdd={addBook} setTab={setTab} books={books} isOnline={isOnline} pendingNavigation={pendingNavigation} onNavigationDone={() => setPendingNavigation(null)} onOpenAmigos={() => setAmigosSheetOpen(true)} onOpenNotifs={() => setNotifsSheetOpen(true)} unreadNotifs={unreadNotifs} pendingCount={pendingCount} /></div>}
        {loaded && tab === "explorar" && <div className="tab-view-enter"><ExplorarView user={user} books={books} onSelectBook={setSelectedBook} onAdd={addBook} /></div>}
        {loaded && tab === "trueque" && <div className="tab-view-enter"><TruequeMain user={user} gemBalance={gemBalance} onGemsChanged={() => loadGems(user.id).then(setGemBalance)} onExit={() => setTab("home")} /></div>}
        {loaded && tab === "add" && <div className="tab-view-enter"><AddBookView onAdd={addBook} setTab={setTab} /></div>}
        {loaded && tab === "perfil" && <div className="tab-view-enter"><PerfilWrapper user={user} onUserUpdate={onUserUpdate} books={books} onSelectBook={setSelectedBook} setTab={setTab} onLogout={onLogout} isOnline={isOnline} theme={themePref} setTheme={setTheme} /></div>}
      </main>
      <BottomNav tab={tab} setTab={setTab} pendingCount={pendingCount} unreadMessages={unreadMessages} pet={pet} onOpenPet={() => setPetHubOpen(true)} />
      {/* FAB flotante para agregar (el centro de la nav ahora es Mascota) */}
      {!petHubOpen && (
        <button
          onClick={() => setShowFabMenu(true)}
          aria-label="Agregar"
          className="btn-press"
          style={{
            position: "fixed", right: 18, zIndex: 35,
            bottom: "calc(env(safe-area-inset-bottom) + 80px)",
            width: 58, height: 58, borderRadius: "50%", border: "none", cursor: "pointer",
            background: BRAND.gradientFab,
            boxShadow: "0 6px 20px rgba(122,46,46,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Plus size={26} color={palette.onAccent} strokeWidth={2.6} />
        </button>
      )}
      {notifsSheetOpen && (
        <NotificationsSheet
          user={user}
          onClose={() => setNotifsSheetOpen(false)}
          onNotifsRead={refreshUnreadNotifs}
          onNavigate={(postId, shouldOpenComments) => {
            setTab("social");
            setPendingNavigation({ postId, openComments: shouldOpenComments });
          }}
        />
      )}
      {amigosSheetOpen && (
        <AmigosSheet
          user={user}
          onClose={() => setAmigosSheetOpen(false)}
          onPendingChange={setPendingCount}
          onMessagesRead={refreshUnreadMessages}
        />
      )}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdate={updateBook}
          onDelete={deleteBook}
          userId={user.id}
          onSaveQuote={() => openSaveQuote(selectedBook?.id)}
        />
      )}
      {pendingPost && (
        <PostDraftModal
          pendingPost={pendingPost}
          user={user}
          onPublish={async (content) => {
            await createFeedPost({
              userId: user.id,
              type: pendingPost.type,
              bookId: pendingPost.book?.id,
              action: pendingPost.action,
              content,
            });
            setPendingPost(null);
          }}
          onSkip={() => setPendingPost(null)}
        />
      )}
      {achievementQueue.length > 0 && !celebrationBook && (
        <AchievementCelebration
          achievementKey={achievementQueue[0]}
          onClose={() => setAchievementQueue((prev) => prev.slice(1))}
          userName={user.name}
          userUsername={mainUsername}
          userId={user.id}
        />
      )}
      {celebrationBook && (
        <BookFinishedCelebration
          book={celebrationBook}
          user={user}
          allBooks={books}
          onSaveRating={saveBookRating}
          onClose={() => setCelebrationBook(null)}
          onGoToExplorer={() => { setCelebrationBook(null); setTab("explorar"); }}
        />
      )}
      {readDateBook && (
        <ReadDateModal
          book={readDateBook}
          onConfirm={async ({ finishedAt, precision }) => {
            const updated = { ...readDateBook, finishedAt, readDatePrecision: precision };
            setReadDateBook(null);
            setBooks((prev) => prev.map((b) => (b.id === updated.id ? { ...b, finishedAt, readDatePrecision: precision } : b)));
            try {
              await updateBookInDB(updated, user.id);
            } catch (e) {
              console.error("Error guardando fecha de lectura:", e);
            }
          }}
          onClose={() => setReadDateBook(null)}
        />
      )}
      {activeWrap && (
        <WrappedStoryExperience
          wrap={activeWrap}
          onClose={() => setActiveWrap(null)}
        />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
      {gemToastQueue.length > 0 && (
        <GemToast
          key={gemToastQueue[0].id}
          amount={gemToastQueue[0].amount}
          label={gemToastQueue[0].label}
          id={gemToastQueue[0].id}
          onDismiss={() => setGemToastQueue(prev => prev.slice(1))}
        />
      )}
      {petHubOpen && pet && (
        <PetHub
          pet={pet}
          onClose={() => setPetHubOpen(false)}
          onGoToProfile={() => { setPetHubOpen(false); setTab("perfil"); }}
          onRename={async (name) => { const saved = await updatePetName(user.id, name); if (saved) setPet((p) => p ? { ...p, pet_name: saved } : p); return saved; }}
        />
      )}
      {petToastQueue.length > 0 && (
        <PetLevelUpToast
          key={petToastQueue[0].id}
          id={petToastQueue[0].id}
          petName={petToastQueue[0].petName}
          level={petToastQueue[0].level}
          petType={petToastQueue[0].petType}
          onDismiss={() => setPetToastQueue(prev => prev.slice(1))}
        />
      )}
      {refModalUser && (
        <FriendProfileModal
          friend={{ ...refModalUser, name: refModalUser.nombre }}
          user={user}
          onClose={() => { setRefModalUser(null); localStorage.removeItem("folio_ref"); onRefUserConsumed?.(); }}
        />
      )}
      {tutorialActive && <TutorialOverlay onDone={() => setTutorialActive(false)} />}

      {showFabMenu && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:hidden"
          style={{ backgroundColor: "rgba(42,31,26,0.5)" }}
          onClick={() => setShowFabMenu(false)}
        >
          <div
            className="w-full"
            style={{ backgroundColor: palette.bg, borderTop: `1px solid ${palette.border}`, borderRadius: "20px 20px 0 0", padding: "1.1rem 1rem calc(1.75rem + env(safe-area-inset-bottom))" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 3, borderRadius: "2px", backgroundColor: palette.border, margin: "0 auto 1.1rem" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                onClick={() => { setShowFabMenu(false); setTab("add"); }}
                style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.9rem 1rem", borderRadius: "12px", border: "none", backgroundColor: palette.bgCard, cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <div style={{ width: 42, height: 42, borderRadius: "10px", backgroundColor: palette.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BookOpen size={20} color={palette.accent} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ ...display, fontSize: "1rem", fontWeight: 600, color: palette.ink, margin: 0 }}>Agregar libro</p>
                  <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.76rem", color: palette.inkFaint, margin: "0.1rem 0 0" }}>Añade un libro a tu biblioteca</p>
                </div>
              </button>
              <button
                onClick={() => { setShowFabMenu(false); openSaveQuote(null); }}
                style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.9rem 1rem", borderRadius: "12px", border: "none", backgroundColor: palette.bgCard, cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <div style={{ width: 42, height: 42, borderRadius: "10px", backgroundColor: palette.amber + "28", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Feather size={20} color={palette.amber} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ ...display, fontSize: "1rem", fontWeight: 600, color: palette.ink, margin: 0 }}>Guardar frase</p>
                  <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.76rem", color: palette.inkFaint, margin: "0.1rem 0 0" }}>Guarda una cita que te impactó</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveQuote && (
        <SaveQuoteModal
          books={books}
          userId={user.id}
          defaultBookId={defaultQuoteBookId}
          onClose={() => setShowSaveQuote(false)}
          onSaved={() => {
            setShowSaveQuote(false);
            setToastMessage("Frase guardada ✨");
            setTimeout(() => setToastMessage(null), 3500);
            addPetXP(user.id, 5).catch((err) => console.error("[PET] sync tras guardar frase falló:", err));
          }}
        />
      )}
    </div>
  );
}

// ============ FIRST-LOGIN TUTORIAL ============
function TutorialOverlay({ onDone }) {
  const STEPS = [
    { key: 'nav-home',    text: 'Tu inicio: cuento del día y tus lecturas',    dir: 'above' },
    { key: 'nav-mascota', text: 'Tu compañero de lectura. ¡Sube de nivel!',    dir: 'above' },
    { key: 'snacks-hero', text: 'Lee un cuento en 5 min. ¡Empieza tu racha!', dir: 'below' },
    { key: 'gems',        text: 'Gana gemas leyendo. Cada acción cuenta',      dir: 'below' },
    { key: 'nav-perfil',  text: 'Tu biblioteca, logros y estadísticas',        dir: 'above' },
  ];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const PAD = 10;
  const TW = 240;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    const el = document.querySelector(`[data-tutorial="${current.key}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else if (!isLast) {
      setStep(s => s + 1);
    } else {
      done();
    }
  }, [step]);

  function done() {
    localStorage.setItem('folio_firstLoginTutorial', '1');
    onDone();
  }

  function advance() {
    if (isLast) { done(); return; }
    let next = step + 1;
    const nextEl = document.querySelector(`[data-tutorial="${STEPS[next].key}"]`);
    if (!nextEl && next < STEPS.length - 1) next++;
    setStep(next);
  }

  if (!rect) return null;

  const hl = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
  const tipLeft = Math.max(12, Math.min(window.innerWidth - TW - 12, rect.left + rect.width / 2 - TW / 2));
  const isAbove = current.dir === 'above';
  const arrowLeft = Math.max(8, Math.min(TW - 20, rect.left + rect.width / 2 - tipLeft - 6));

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1998 }} />
      <div key={`ring-${step}`} style={{
        position: 'fixed', top: hl.top, left: hl.left, width: hl.width, height: hl.height,
        borderRadius: 16, zIndex: 1999, pointerEvents: 'none',
        boxShadow: '0 0 0 9999px rgba(42,31,26,0.75), 0 0 0 2.5px rgba(200,146,74,0.75)',
        animation: 'tutRingIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
      }} />
      <div key={`tip-${step}`} style={{
        position: 'fixed', zIndex: 2000, width: TW, left: tipLeft,
        ...(isAbove
          ? { bottom: window.innerHeight - hl.top + 12 }
          : { top: hl.top + hl.height + 12 }),
        backgroundColor: BRAND.wine, color: BRAND.cream, borderRadius: 14,
        padding: '0.9rem 1rem 0.85rem',
        boxShadow: '0 8px 32px rgba(42,31,26,0.5)',
        animation: isAbove
          ? 'tutTipAbove 0.28s cubic-bezier(0.22,1,0.36,1) both'
          : 'tutTipBelow 0.28s cubic-bezier(0.22,1,0.36,1) both',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ position: 'absolute', width: 10, height: 10, backgroundColor: BRAND.wine, left: arrowLeft, transform: 'rotate(45deg)', ...(isAbove ? { bottom: -5 } : { top: -5 }) }} />
        <div style={{ display: 'flex', gap: 4, marginBottom: '0.65rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ height: 3, flex: 1, borderRadius: 999, backgroundColor: i <= step ? 'rgba(245,237,224,0.9)' : 'rgba(245,237,224,0.22)', transition: 'background-color 0.25s' }} />
          ))}
        </div>
        <p style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.45, margin: '0 0 0.85rem', color: BRAND.cream }}>{current.text}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={done} style={{ fontSize: '0.75rem', color: 'rgba(245,237,224,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Saltar
          </button>
          <button onClick={advance} style={{ fontSize: '0.8rem', fontWeight: 600, backgroundColor: BRAND.cream, color: BRAND.wine, border: 'none', borderRadius: 999, padding: '0.38rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isLast ? '¡Entendido!' : 'Siguiente →'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes tutRingIn { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }
        @keyframes tutTipAbove { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes tutTipBelow { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </>
  );
}

// ============ NEW USER ONBOARDING ============
const ONBOARDING_GENRES = [
  { id: "novela",              label: "Novela",           Icon: BookOpen     },
  { id: "filosofia",           label: "Filosofía",        Icon: Brain        },
  { id: "historia",            label: "Historia",         Icon: Landmark     },
  { id: "ciencia",             label: "Ciencia",          Icon: FlaskConical },
  { id: "terror",              label: "Terror",           Icon: Moon         },
  { id: "romance",             label: "Romance",          Icon: Heart        },
  { id: "biografia",           label: "Biografía",        Icon: User         },
  { id: "desarrollo-personal", label: "Desa. personal",   Icon: TrendingUp   },
  { id: "poesia",              label: "Poesía",           Icon: Feather      },
  { id: "ciencia-ficcion",     label: "Ciencia ficción",  Icon: Zap          },
  { id: "ensayo",              label: "Ensayo",           Icon: FileText     },
  { id: "arte",                label: "Arte",             Icon: PaletteIcon  },
];

function OnboardingStep1({ selectedGenres, setSelectedGenres, onNext }) {
  function toggle(id) {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }
  return (
    <div style={{ padding: "0 1.25rem 2.5rem", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <h1 style={{ ...display, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontStyle: "italic", color: palette.ink, marginBottom: "0.4rem", lineHeight: 1.15 }}>
        Bienvenido a Folio
      </h1>
      <p style={{ ...body, fontSize: "1rem", color: palette.inkSoft, marginBottom: "1.75rem", lineHeight: 1.55 }}>
        Cuéntanos tus gustos para personalizar tu experiencia
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.55rem", marginBottom: "1.75rem" }}>
        {ONBOARDING_GENRES.map(({ id, label, Icon }) => {
          const on = selectedGenres.includes(id);
          return (
            <button key={id} onClick={() => toggle(id)} style={{
              padding: "0.8rem 0.35rem 0.7rem", borderRadius: 12,
              backgroundColor: on ? `${palette.accent}12` : palette.bgCard,
              border: `1.5px solid ${on ? palette.accent : palette.border}`,
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
              transition: "all 0.18s ease",
            }}>
              <Icon size={20} color={on ? palette.accent : palette.inkSoft} />
              <span style={{ ...body, fontSize: "0.73rem", color: on ? palette.accent : palette.ink, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={onNext} disabled={selectedGenres.length === 0} style={{
        width: "100%", padding: "0.9rem", borderRadius: 12,
        backgroundColor: selectedGenres.length > 0 ? palette.accent : palette.border,
        color: selectedGenres.length > 0 ? palette.bg : palette.inkFaint,
        border: "none", cursor: selectedGenres.length > 0 ? "pointer" : "default",
        ...display, fontSize: "1.05rem", transition: "all 0.2s",
      }}>
        Continuar
      </button>
      {selectedGenres.length > 0 && (
        <p style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft, textAlign: "center", marginTop: "0.65rem" }}>
          {selectedGenres.length} género{selectedGenres.length !== 1 ? "s" : ""} seleccionado{selectedGenres.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function OnboardingStep2({ user, onNext, onBack, onSkip }) {
  const [mode, setMode] = useState("search"); // "search" | "manual"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null); // selected book from search
  const [pickedStatus, setPickedStatus] = useState("reading");
  const [form, setForm] = useState({ title: "", author: "", status: "reading" });
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 180);
  }, [mode]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchGoogleBooks(query.trim());
        setResults(res);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function saveBook(bookData) {
    setAdding(true);
    setAddErr("");
    try {
      const enriched = bookData.coverUrl ? null : await enrichBook(bookData.title, bookData.author).catch(() => null);
      const book = {
        id: crypto.randomUUID(),
        title: bookData.title,
        author: bookData.author,
        status: bookData.status || "reading",
        coverUrl: bookData.coverUrl || "",
        genre: enriched?.genre || bookData.genre || "",
        summary: enriched?.summary || bookData.summary || "",
        moodTags: enriched?.moodTags || [],
        rating: 0, review: "",
        addedAt: Date.now(),
        finishedAt: bookData.status === "read" ? Date.now() : null,
      };
      await insertBook(book, user.id);
      onNext();
    } catch (err) {
      console.error("Error adding book in onboarding:", err);
      setAddErr(err?.message || "No se pudo guardar. Intenta de nuevo.");
      setAdding(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "0.75rem", borderRadius: 10,
    border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard,
    ...body, fontSize: "0.95rem", color: palette.ink,
    outline: "none", boxSizing: "border-box",
  };

  const statusBtns = [
    { val: "reading", label: "Lo estoy leyendo" },
    { val: "want_to_read", label: "Lo quiero leer" },
  ];

  // ── Manual entry mode ──
  if (mode === "manual") {
    return (
      <div style={{ padding: "0 1.25rem 2.5rem", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <button onClick={() => { setMode("search"); setAddErr(""); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: 0 }}>
          <ChevronLeft size={16} />Volver al buscador
        </button>
        <h2 style={{ ...display, fontSize: "1.6rem", fontStyle: "italic", color: palette.ink, marginBottom: "1.25rem" }}>Agregar manualmente</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>Título *</label>
            <input ref={inputRef} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="El nombre del viento..." style={inputStyle} />
          </div>
          <div>
            <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>Autor *</label>
            <input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} placeholder="Patrick Rothfuss..." style={inputStyle} />
          </div>
          <div>
            <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.5rem" }}>¿Cómo lo agregas?</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {statusBtns.map(({ val, label }) => (
                <button key={val} onClick={() => setForm(p => ({ ...p, status: val }))} style={{
                  flex: 1, padding: "0.65rem 0.5rem", borderRadius: 10,
                  border: `1.5px solid ${form.status === val ? palette.accent : palette.border}`,
                  backgroundColor: form.status === val ? `${palette.accent}12` : palette.bgCard,
                  cursor: "pointer", ...body, fontSize: "0.82rem",
                  color: form.status === val ? palette.accent : palette.ink,
                }}>{label}</button>
              ))}
            </div>
          </div>
          {addErr && <p style={{ ...body, fontSize: "0.82rem", color: palette.danger, margin: 0 }}>{addErr}</p>}
          <button
            onClick={() => saveBook(form)}
            disabled={!form.title.trim() || !form.author.trim() || adding}
            style={{
              width: "100%", padding: "0.9rem", borderRadius: 12, border: "none",
              backgroundColor: form.title.trim() && form.author.trim() ? palette.accent : palette.border,
              color: form.title.trim() && form.author.trim() ? palette.bg : palette.inkFaint,
              cursor: form.title.trim() && form.author.trim() && !adding ? "pointer" : "default",
              ...display, fontSize: "1.05rem", marginTop: "0.25rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {adding && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {adding ? "Guardando..." : "Agregar libro"}
          </button>
        </div>
      </div>
    );
  }

  // ── Search mode (default) ──
  return (
    <div style={{ padding: "0 1.25rem 2.5rem", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: 0 }}>
        <ChevronLeft size={16} />Atrás
      </button>
      <h1 style={{ ...display, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontStyle: "italic", color: palette.ink, marginBottom: "0.3rem", lineHeight: 1.15 }}>
        Tu primer libro
      </h1>
      <p style={{ ...body, fontSize: "0.95rem", color: palette.inkSoft, marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Busca el libro que estás leyendo
      </p>

      {/* Search input */}
      <div style={{ position: "relative", marginBottom: "0.85rem" }}>
        <Search size={16} color={palette.inkSoft} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setPicked(null); }}
          placeholder="Busca por título o autor…"
          style={{ ...inputStyle, paddingLeft: "2.4rem" }}
        />
        {searching && <Loader2 size={15} color={palette.inkFaint} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", animation: "spin 1s linear infinite" }} />}
      </div>

      {/* Results */}
      {results.length > 0 && !picked && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", maxHeight: "52vh", overflowY: "auto" }}>
          {results.map((book, i) => (
            <button key={i} onClick={() => { setPicked(book); setPickedStatus("reading"); }} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.65rem 0.75rem", borderRadius: 12,
              backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`,
              cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
            }}>
              {book.coverUrl
                ? <img src={book.coverUrl} alt="" style={{ width: 38, height: 56, objectFit: "cover", borderRadius: 4, flexShrink: 0, backgroundColor: palette.bgSoft }} />
                : <div style={{ width: 38, height: 56, borderRadius: 4, backgroundColor: `${palette.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BookOpen size={16} color={palette.accent} /></div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...display, fontSize: "0.88rem", fontWeight: 600, color: palette.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.15rem" }}>{book.title}</p>
                <p style={{ ...body, fontSize: "0.76rem", color: palette.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.author}{book.year ? ` · ${book.year}` : ""}</p>
              </div>
              <ChevronRight size={15} color={palette.inkFaint} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!searching && query.trim().length >= 2 && results.length === 0 && !picked && (
        <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, textAlign: "center", fontStyle: "italic", marginBottom: "1rem" }}>
          No encontramos "{query}". Prueba con otro título.
        </p>
      )}

      {/* Status picker after selecting a search result */}
      {picked && (
        <div style={{ backgroundColor: palette.bgCard, border: `1.5px solid ${palette.accent}44`, borderRadius: 14, padding: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.85rem" }}>
            {picked.coverUrl
              ? <img src={picked.coverUrl} alt="" style={{ width: 42, height: 62, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
              : <div style={{ width: 42, height: 62, borderRadius: 5, backgroundColor: `${palette.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BookOpen size={18} color={palette.accent} /></div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...display, fontSize: "0.9rem", fontWeight: 700, color: palette.ink, lineHeight: 1.25, marginBottom: "0.2rem" }}>{picked.title}</p>
              <p style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft }}>{picked.author}</p>
            </div>
            <button onClick={() => setPicked(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: palette.inkFaint }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, marginBottom: "0.5rem" }}>¿Cómo lo agregas?</p>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
            {statusBtns.map(({ val, label }) => (
              <button key={val} onClick={() => setPickedStatus(val)} style={{
                flex: 1, padding: "0.6rem 0.4rem", borderRadius: 10,
                border: `1.5px solid ${pickedStatus === val ? palette.accent : palette.border}`,
                backgroundColor: pickedStatus === val ? `${palette.accent}12` : palette.bg,
                cursor: "pointer", ...body, fontSize: "0.82rem",
                color: pickedStatus === val ? palette.accent : palette.ink,
              }}>{label}</button>
            ))}
          </div>
          {addErr && <p style={{ ...body, fontSize: "0.82rem", color: palette.danger, marginBottom: "0.5rem" }}>{addErr}</p>}
          <button
            onClick={() => saveBook({ ...picked, status: pickedStatus })}
            disabled={adding}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: 10, border: "none",
              backgroundColor: palette.accent, color: palette.bg,
              cursor: adding ? "default" : "pointer",
              ...display, fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            {adding && <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />}
            {adding ? "Guardando..." : "Agregar a mi biblioteca"}
          </button>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginTop: picked ? 0 : "0.5rem" }}>
        <button onClick={() => setMode("manual")} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.84rem", color: palette.inkSoft, textDecoration: "underline" }}>
          Agregar manualmente
        </button>
        <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.83rem", color: palette.inkFaint }}>
          Omitir por ahora
        </button>
      </div>
    </div>
  );
}

const PRESET_AVATARS = Array.from({ length: 10 }, (_, i) => `/avatars/avatar-${i + 1}.png`);

function OnboardingStep3Avatar({ selectedAvatar, setSelectedAvatar, onBack, onNext, onSkip }) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, 200, 200);
      setSelectedAvatar(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  return (
    <div style={{ padding: "0 1.25rem 2.5rem", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: 0 }}>
        <ChevronLeft size={16} />Atrás
      </button>
      <h1 style={{ ...display, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontStyle: "italic", color: palette.ink, marginBottom: "0.4rem", lineHeight: 1.15 }}>
        Elige tu avatar
      </h1>
      <p style={{ ...body, fontSize: "1rem", color: palette.inkSoft, marginBottom: "1.5rem", lineHeight: 1.55 }}>
        Así te verán tus amigos lectores
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {PRESET_AVATARS.map((src, i) => {
          const selected = selectedAvatar === src;
          return (
            <button
              key={i}
              onClick={() => setSelectedAvatar(src)}
              style={{
                padding: 0, background: "none", border: `2.5px solid ${selected ? palette.accent : "transparent"}`,
                borderRadius: "50%", cursor: "pointer", aspectRatio: "1",
                overflow: "hidden", transition: "border-color 0.18s",
                boxShadow: selected ? `0 0 0 2px ${palette.bg}, 0 0 0 4.5px ${palette.accent}` : "none",
              }}
            >
              <img src={src} alt={`Avatar ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "50%" }} />
            </button>
          );
        })}
      </div>

      {selectedAvatar && !PRESET_AVATARS.includes(selectedAvatar) && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <img src={selectedAvatar} alt="Tu foto" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${palette.accent}` }} />
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: "100%", padding: "0.8rem", borderRadius: 12, marginBottom: "0.65rem",
          border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard,
          cursor: "pointer", ...display, fontSize: "0.95rem", color: palette.inkSoft,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        }}
      >
        <Camera size={18} color={palette.inkSoft} />Subir mi foto
      </button>

      <button
        onClick={onNext}
        style={{
          width: "100%", padding: "0.9rem", borderRadius: 12, border: "none",
          backgroundColor: selectedAvatar ? palette.accent : palette.border,
          color: selectedAvatar ? palette.bg : palette.inkFaint,
          cursor: "pointer", ...display, fontSize: "1.05rem", marginBottom: "0.6rem",
          transition: "all 0.2s",
        }}
      >
        Continuar
      </button>

      <div style={{ textAlign: "center" }}>
        <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.85rem", color: palette.inkFaint }}>
          Lo haré más tarde
        </button>
      </div>
    </div>
  );
}

function OnboardingStep4({ user, addedFriend, setAddedFriend, onBack, onComplete, completing }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState({});
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function handleSearch(val) {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const term = sanitizeSearchTerm(val);
      if (!term) { setResults([]); setSearching(false); return; }
      const { data, error } = await supabase
        .from("users")
        .select("id, nombre, username, avatar_url")
        .or(`username.ilike.%${term}%,nombre.ilike.%${term}%`)
        .neq("id", user.id)
        .limit(10);
      if (error) console.error("[onboarding] búsqueda de usuarios falló:", error.message);
      setResults(data || []);
      setSearching(false);
    }, 300);
  }

  async function sendRequest(toId) {
    setActionLoading(p => ({ ...p, [toId]: true }));
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: toId, status: "pending" });
    setActionLoading(p => ({ ...p, [toId]: false }));
    if (error && error.code !== "23505") { console.error("[onboarding] no se pudo enviar la solicitud:", error.message); return; }
    setSentIds(prev => new Set([...prev, toId]));
    setAddedFriend(true);
  }

  return (
    <div style={{ padding: "0 1.25rem 2.5rem", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: 0 }}>
        <ChevronLeft size={16} />Atrás
      </button>
      <h1 style={{ ...display, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontStyle: "italic", color: palette.ink, marginBottom: "0.4rem", lineHeight: 1.15 }}>
        Encuentra a tus amigos
      </h1>
      <p style={{ ...body, fontSize: "1rem", color: palette.inkSoft, marginBottom: "1.5rem", lineHeight: 1.55 }}>
        La lectura es mejor cuando la compartes
      </p>

      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <Search size={16} color={palette.inkSoft} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Busca por @usuario o nombre..."
          style={{ width: "100%", padding: "0.75rem 0.75rem 0.75rem 2.4rem", borderRadius: 10, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, ...body, fontSize: "0.95rem", color: palette.ink, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {searching && (
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <Loader2 size={20} color={palette.inkFaint} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {!searching && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {results.map(u => {
            const sent = sentIds.has(u.id);
            const initials = (u.nombre || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: palette.bgCard, borderRadius: 12, border: `1px solid ${palette.borderSoft}` }}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: getAvatarColor(u.id || u.nombre), display: "flex", alignItems: "center", justifyContent: "center", ...display, fontSize: "1rem", color: palette.onAccent, flexShrink: 0 }}>{initials}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...display, fontSize: "0.9rem", color: palette.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nombre}</p>
                  {u.username && <p style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft }}>@{u.username}</p>}
                </div>
                <button
                  onClick={() => !sent && sendRequest(u.id)}
                  disabled={sent || actionLoading[u.id]}
                  style={{
                    padding: "0.5rem 0.9rem", borderRadius: 8, border: "none", flexShrink: 0,
                    backgroundColor: sent ? `${palette.accent}18` : palette.accent,
                    color: sent ? palette.accent : palette.bg,
                    cursor: sent ? "default" : "pointer",
                    ...display, fontSize: "0.82rem",
                    display: "flex", alignItems: "center", gap: "0.3rem",
                  }}
                >
                  {actionLoading[u.id] ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : sent ? <Check size={14} /> : <Plus size={14} />}
                  {sent ? "Enviado" : "Agregar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!searching && query.trim() && results.length === 0 && (
        <p style={{ ...body, fontSize: "0.88rem", color: palette.inkFaint, textAlign: "center", fontStyle: "italic", marginBottom: "1.5rem" }}>
          No encontramos a "{query}" en Folio aún.
        </p>
      )}

      {addedFriend && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.85rem", backgroundColor: `${palette.success}18`, border: `1.5px solid ${palette.success}44`, borderRadius: 10, marginBottom: "1rem" }}>
          <CheckCircle2 size={16} color={palette.success} />
          <span style={{ ...body, fontSize: "0.85rem", color: palette.success }}>¡Solicitud enviada! Tu amigo la verá pronto.</span>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={completing}
        style={{
          width: "100%", padding: "0.9rem", borderRadius: 12, border: "none",
          backgroundColor: addedFriend ? palette.success : palette.accent,
          color: palette.bg, cursor: completing ? "default" : "pointer",
          ...display, fontSize: "1.05rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          transition: "background-color 0.3s",
        }}
      >
        {completing && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {addedFriend ? "¡Listo, empezar!" : "Empezar solo"}
      </button>
    </div>
  );
}

function NewUserOnboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [addedFriend, setAddedFriend] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [stepKey, setStepKey] = useState(0);

  function goStep(n) {
    setStepKey(k => k + 1);
    setStep(n);
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const updates = { preferred_genres: selectedGenres, onboarding_completed: true };
      if (selectedAvatar) updates.avatar_url = selectedAvatar;
      const { error } = await supabase.from("users").update(updates).eq("id", user.id);
      if (error) console.error("[onboarding] no se pudieron guardar las preferencias:", error.message);
    } catch (err) { console.error("[onboarding] Error completing onboarding:", err); }
    onComplete();
  }

  return (
    <div style={{ backgroundColor: palette.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{FONT_LINK}</style>
      <style>{`
        @keyframes obStep {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ob-step { animation: obStep 0.38s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: "1.1rem 1.5rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ ...display, fontSize: "1.05rem", fontStyle: "italic", color: palette.accent }}>Folio</span>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              height: 8, borderRadius: 999,
              width: n === step ? 28 : 8,
              backgroundColor: n <= step ? palette.accent : palette.border,
              transition: "all 0.35s ease",
            }} />
          ))}
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* Referral banner */}
      {(() => {
        const ref = localStorage.getItem("folio_ref");
        if (!ref) return null;
        return (
          <div style={{ margin: "0.85rem 1.5rem 0", padding: "0.65rem 1rem", backgroundColor: `${BRAND.amber}14`, border: `1px solid ${BRAND.amber}30`, borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>👋</span>
            <p style={{ ...body, fontSize: "0.84rem", color: palette.inkSoft, margin: 0 }}>
              <strong style={{ color: palette.ink }}>{ref}</strong> te invitó a Folio
            </p>
          </div>
        );
      })()}

      {/* Step */}
      <div key={stepKey} className="ob-step" style={{ flex: 1, overflowY: "auto", paddingTop: "1.5rem" }}>
        {step === 1 && (
          <OnboardingStep1
            selectedGenres={selectedGenres}
            setSelectedGenres={setSelectedGenres}
            onNext={() => goStep(2)}
          />
        )}
        {step === 2 && (
          <OnboardingStep2
            user={user}
            onNext={() => goStep(3)}
            onBack={() => goStep(1)}
            onSkip={() => goStep(3)}
          />
        )}
        {step === 3 && (
          <OnboardingStep3Avatar
            selectedAvatar={selectedAvatar}
            setSelectedAvatar={setSelectedAvatar}
            onBack={() => goStep(2)}
            onNext={() => goStep(4)}
            onSkip={() => goStep(4)}
          />
        )}
        {step === 4 && (
          <OnboardingStep4
            user={user}
            addedFriend={addedFriend}
            setAddedFriend={setAddedFriend}
            onBack={() => goStep(3)}
            onComplete={handleComplete}
            completing={completing}
          />
        )}
      </div>
    </div>
  );
}

// ============ ROOT ============
async function checkOnboardingNeeded(userId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const { data } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", userId)
      .abortSignal(controller.signal)
      .maybeSingle();
    return data?.onboarding_completed !== true;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveRefProfile(username) {
  if (!username) return null;
  const { data } = await supabase
    .from("users")
    .select("id, nombre, username, avatar_url, cover_url, bio")
    .eq("username", username)
    .maybeSingle();
  return data || null;
}

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('App crashed:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      // Igual que RootErrorBoundary (main.jsx): el detalle técnico solo en desarrollo.
      return (
        <div style={{ padding: 20, textAlign: 'center', fontFamily: 'sans-serif', color: palette.ink }}>
          <h2 style={{ marginBottom: 12 }}>Algo se rompió</h2>
          {import.meta.env.DEV ? (
            <>
              <p style={{ color: palette.dangerInk, marginBottom: 12, fontSize: 14 }}>{this.state.error?.message}</p>
              <pre style={{ fontSize: 11, textAlign: 'left', overflow: 'auto', maxHeight: '40vh', background: palette.dangerSoft, padding: 12, borderRadius: 4, marginBottom: 16 }}>
                {this.state.error?.stack}
              </pre>
            </>
          ) : (
            <p style={{ marginBottom: 16, fontSize: 14, color: palette.inkSoft }}>Intenta recargar la página. Si el problema continúa, vuelve a intentarlo en unos minutos.</p>
          )}
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', backgroundColor: BRAND.wine, color: palette.onAccent, cursor: 'pointer', fontSize: 15 }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refUser, setRefUser] = useState(null);
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Capture referral param from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && !localStorage.getItem("folio_ref")) {
      localStorage.setItem("folio_ref", ref);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
      });
    }
    (async () => {
      try {
        // Fallback defensivo (diagnóstico 2026-09-19): si hay sesión guardada, garantizar el perfil ANTES de
        // cualquier otra query a public.users (getSessionUser/buildAppUser lo vuelve a comprobar).
        devLog("[auth-debug] Defensive check on App mount");
        const { data: { session: mountSession } } = await supabase.auth.getSession();
        devLog("[auth-debug] Defensive check: session", { hasSession: !!mountSession, userId: mountSession?.user?.id });
        if (mountSession?.user) await ensureUserProfile(mountSession.user);
        const u = await getSessionUser();
        if (u) {
          setUser(u);
          const needed = await checkOnboardingNeeded(u.id);
          setShowOnboarding(needed);
          const savedRef = localStorage.getItem("folio_ref");
          if (savedRef) {
            resolveRefProfile(savedRef).then((p) => {
              if (p && p.id !== u.id) setRefUser(p);
            });
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setAuthLoaded(true);
      }
    })();
    // Auto-repara el perfil faltante (cuenta huérfana) en SIGNED_IN / INITIAL_SESSION.
    const stopWatchingProfile = watchAuthProfile();
    return () => stopWatchingProfile();
  }, []);

  async function handleLogin(u, isNew = false) {
    setUser(u);
    if (isNew) {
      setShowOnboarding(true);
    } else {
      try {
        const needed = await checkOnboardingNeeded(u.id);
        setShowOnboarding(needed);
      } catch (err) {
        // Timeout (5 s) o red: se entra a la app; el onboarding se vuelve a revisar en el próximo arranque.
        console.error("[onboarding] no se pudo verificar el onboarding:", err?.message || err);
      }
    }
    // After login, resolve any pending ref
    const savedRef = localStorage.getItem("folio_ref");
    if (savedRef) {
      resolveRefProfile(savedRef).then((p) => {
        if (p && p.id !== u.id) setRefUser(p);
      });
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setShowOnboarding(false);
    setRefUser(null);
  }

  if (!authLoaded) {
    return (
      <div style={{ backgroundColor: palette.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{FONT_LINK}</style>
        <Loader2 size={24} className="animate-spin" color={palette.inkFaint} />
      </div>
    );
  }

  if (!user) return <AuthView onLogin={handleLogin} />;
  if (showOnboarding) return <NewUserOnboarding user={user} onComplete={() => { setShowOnboarding(false); setJustCompletedOnboarding(true); }} />;
  return <ErrorBoundary><MainApp user={user} onLogout={handleLogout} onUserUpdate={(patch) => setUser((u) => (u ? { ...u, ...patch } : u))} initialRefUser={refUser} onRefUserConsumed={() => setRefUser(null)} showTutorial={justCompletedOnboarding} /></ErrorBoundary>;
}

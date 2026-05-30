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
  BarChart3,
  TrendingUp,
  Award,
  Copy,
  Heart,
  PlusCircle,
  LogOut,
  Barcode,
  User,
  Users,
  MessageCircle,
  Send,
  Home,
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
  RotateCcw,
  Clock,
  ImagePlus,
  Bell,
  Timer,
  UserPlus,
  Link as LinkIcon,
  WifiOff,
  Download,
  Snowflake,
} from "lucide-react";
import { supabase } from "./supabase.js";
import { BrowserMultiFormatReader } from "@zxing/browser";
let _zxingReader = null;
function getZxingReader() {
  if (!_zxingReader) _zxingReader = new BrowserMultiFormatReader();
  return _zxingReader;
}
import confetti from "canvas-confetti";
import { CUENTOS, CUENTOS_MAP } from "./data/cuentos.js";

// ============ STYLES ============
const FONT_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap');
`;

const palette = {
  bg: "#F4EDE0",
  bgSoft: "#EBE3D2",
  bgCard: "#FBF6EB",
  ink: "#2A1F1A",
  inkSoft: "#5C4A3F",
  inkFaint: "#8B7B6E",
  accent: "#7A2E2E",
  accentSoft: "#A4493D",
  amber: "#C8924A",
  amberRich: "#E07B1A",
  mauve: "#A26B7A",
  slate: "#1B3A4B",
  sage: "#5C6B3D",
  border: "#D4C9B5",
  borderSoft: "#DDD5C5",
};

const AVATAR_COLORS = [
  "#6B4C3B", "#5C6B3D", "#8B5E3C", "#4A6670",
  "#7B5B8D", "#C8842B", "#6B1E2A", "#3D6B5C",
];
function getAvatarColor(id) {
  const str = String(id || "");
  let hash = 0;
  for (let i = 0; i < Math.min(4, str.length); i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[hash % 8];
}

const display = { fontFamily: "Fraunces, serif" };
const body = { fontFamily: "'EB Garamond', serif" };

const ts = {
  h1: { fontFamily: "Fraunces, serif", fontSize: "28px", fontWeight: 700, fontStyle: "italic", lineHeight: 1.15 },
  h2: { fontFamily: "Fraunces, serif", fontSize: "20px", fontWeight: 600, lineHeight: 1.25 },
  h3: { fontFamily: "'EB Garamond', serif", fontSize: "17px", fontWeight: 600, lineHeight: 1.3 },
  body15: { fontFamily: "'EB Garamond', serif", fontSize: "15px", fontWeight: 400, lineHeight: 1.55 },
  caption: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 400, color: "#8A7B6E" },
  label: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", fontWeight: 500, color: "#8A7B6E" },
};

function genrePillStyle(genre, isOpen) {
  const g = (genre || "").toLowerCase();
  let bg, color, border;
  if (/fant|magia|drag|mito/.test(g))           { bg = isOpen ? "#3B1F5E" : "#EDE5F5"; color = isOpen ? "#EDE5F5" : "#3B1F5E"; border = "#C4A8E0"; }
  else if (/ciencia|sci.fi|distop|futur/.test(g)) { bg = isOpen ? "#1B3A4B" : "#E5EFF5"; color = isOpen ? "#E5EFF5" : "#1B3A4B"; border = "#A8C4D4"; }
  else if (/terror|horror|misterio|thriller/.test(g)) { bg = isOpen ? "#2A1F1A" : "#F0ECEA"; color = isOpen ? "#F4EDE0" : "#2A1F1A"; border = "#C4B8B0"; }
  else if (/roman|amor|histor.*amor/.test(g))   { bg = isOpen ? "#7A2E2E" : "#F5EAEA"; color = isOpen ? "#F4EDE0" : "#7A2E2E"; border = "#E0BCBC"; }
  else if (/histor|biograf|memoir/.test(g))      { bg = isOpen ? "#5C4A3F" : "#F0EBE5"; color = isOpen ? "#F4EDE0" : "#5C4A3F"; border = "#C8B8A8"; }
  else if (/ensayo|filosof|polít|soci/.test(g))  { bg = isOpen ? "#5C6B3D" : "#EAF0E8"; color = isOpen ? "#F4EDE0" : "#5C6B3D"; border = "#A8C4A0"; }
  else                                             { bg = isOpen ? "#C8924A" : "#FBF0E5"; color = isOpen ? "#FBF6EB" : "#7A4A1A"; border = "#E0C498"; }
  return { backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: "20px", padding: "8px 14px", fontWeight: 500, fontSize: "0.85rem", cursor: "pointer", transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease" };
}

// ============ ACHIEVEMENT DEFINITIONS ============
const ACHIEVEMENT_DEFS = [
  // Lectura
  { key: "first_book_added",  name: "Primera página",      desc: "Agregaste tu primer libro",                        emoji: "📖", cat: "Lectura"  },
  { key: "first_book_read",   name: "Lector nato",          desc: "Terminaste tu primer libro",                       emoji: "✅", cat: "Lectura"  },
  { key: "first_review",      name: "Crítico",              desc: "Escribiste tu primera reseña",                     emoji: "✍️", cat: "Lectura"  },
  { key: "rated_5_books",     name: "Bibliófilo",           desc: "Calificaste 5 libros",                             emoji: "⭐", cat: "Lectura"  },
  { key: "marathon_reader",   name: "Maratón",              desc: "Leíste 3 libros en un mes",                        emoji: "🏃", cat: "Lectura"  },
  { key: "speed_reader",      name: "Velocista",            desc: "Leíste 5 libros en un mes",                        emoji: "⚡", cat: "Lectura"  },
  { key: "explorer",          name: "Explorador",           desc: "Leíste libros de 3 géneros distintos",             emoji: "🧭", cat: "Lectura"  },
  { key: "genre_master",      name: "Maestro",              desc: "Leíste libros de 5 géneros distintos",             emoji: "🎭", cat: "Lectura"  },
  { key: "collector_10",      name: "Coleccionista",        desc: "10 libros en tu biblioteca",                       emoji: "📚", cat: "Lectura"  },
  { key: "collector_50",      name: "Biblioteca",           desc: "50 libros en tu biblioteca",                       emoji: "🏛️", cat: "Lectura"  },
  // Sesiones
  { key: "first_log",         name: "Primer día",           desc: "Registraste tu primera sesión",                    emoji: "📅", cat: "Sesiones" },
  { key: "sessions_30",       name: "Café y letras",        desc: "30 sesiones registradas",                          emoji: "☕", cat: "Sesiones" },
  { key: "pages_100",         name: "Centurión",            desc: "100 páginas leídas",                               emoji: "💯", cat: "Sesiones" },
  { key: "pages_1000",        name: "Mil páginas",          desc: "1,000 páginas leídas",                             emoji: "🌟", cat: "Sesiones" },
  { key: "pages_10000",       name: "Leyenda",              desc: "10,000 páginas leídas",                            emoji: "👑", cat: "Sesiones" },
  { key: "big_session",       name: "Sin parar",            desc: "100+ páginas en una sola sesión",                  emoji: "📖", cat: "Sesiones" },
  { key: "night_owl",         name: "Búho",                 desc: "5 sesiones registradas después de las 10pm",       emoji: "🦉", cat: "Sesiones" },
  // Rachas
  { key: "streak_7",          name: "Racha de fuego",       desc: "7 días consecutivos leyendo",                      emoji: "🔥", cat: "Rachas"   },
  { key: "streak_30",         name: "Imparable",            desc: "30 días consecutivos leyendo",                     emoji: "💎", cat: "Rachas"   },
  { key: "streak_90",         name: "Trimestre lector",     desc: "90 días consecutivos",                             emoji: "🏅", cat: "Rachas"   },
  // Red social
  { key: "first_comment",     name: "Social",               desc: "Hiciste tu primer comentario",                     emoji: "💬", cat: "Social"   },
  { key: "comments_10",       name: "Conversador",          desc: "10 comentarios en total",                          emoji: "🗣️", cat: "Social"   },
  { key: "first_friend",      name: "Conector",             desc: "Agregaste tu primer amigo",                        emoji: "🤝", cat: "Social"   },
  { key: "friends_5",         name: "Popular",              desc: "Tienes 5 amigos en Folio",                         emoji: "👥", cat: "Social"   },
  { key: "first_message",     name: "Mensajero",            desc: "Enviaste tu primer mensaje de chat",               emoji: "💌", cat: "Social"   },
  // Especiales
  { key: "top_reader",        name: "Top lector",           desc: "Leíste más que todos tus amigos este mes",         emoji: "🏆", cat: "Especial" },
  { key: "uam_book",          name: "Universitario lector", desc: "Agregaste un libro de la Biblioteca UAM",          emoji: "🎓", cat: "Especial" },
];

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

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

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

async function registerUser(name, username, email, password) {
  const emailLower = email.toLowerCase().trim();
  const usernameLower = username.toLowerCase().trim();
  const { data: existingEmail } = await supabase
    .from("users")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();
  if (existingEmail) throw new Error("Ya existe una cuenta con ese email.");
  const { data: existingUsername } = await supabase
    .from("users")
    .select("id")
    .eq("username", usernameLower)
    .maybeSingle();
  if (existingUsername) throw new Error("Ese nombre de usuario ya está en uso.");
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase
    .from("users")
    .insert({ nombre: name.trim(), username: usernameLower, email: emailLower, password_hash: passwordHash })
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
    isUamBook: row.is_uam_book || false,
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
    is_uam_book: book.isUamBook || false,
  };
}

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

// ============ OFFLINE CACHE HELPERS ============
function cacheBooks(books) {
  try {
    localStorage.setItem("folio_books", JSON.stringify(books));
    console.log("[offline] Guardando books en caché:", books.length);
  } catch {}
}
function getCachedBooks() {
  try {
    const cached = JSON.parse(localStorage.getItem("folio_books"));
    console.log("[offline] Books desde caché:", cached ? cached.length : "vacío");
    return cached;
  } catch { return null; }
}
function cacheProfile(data) {
  try { localStorage.setItem("folio_profile", JSON.stringify(data)); } catch {}
}
function getCachedProfile() {
  try { return JSON.parse(localStorage.getItem("folio_profile")); } catch { return null; }
}
function cacheAchievements(data) {
  try { localStorage.setItem("folio_achievements", JSON.stringify(data)); } catch {}
}
function getCachedAchievements() {
  try { return JSON.parse(localStorage.getItem("folio_achievements")); } catch { return null; }
}
function getPendingLogs() {
  try { return JSON.parse(localStorage.getItem("folio_pending_logs") || "[]"); } catch { return []; }
}
function addPendingLog(log) {
  const logs = getPendingLogs();
  logs.push({ ...log, _id: Date.now() + Math.random() });
  try { localStorage.setItem("folio_pending_logs", JSON.stringify(logs)); } catch {}
}
function getPendingPosts() {
  try { return JSON.parse(localStorage.getItem("folio_pending_posts") || "[]"); } catch { return []; }
}
function addPendingPost(post) {
  const posts = getPendingPosts();
  posts.push({ ...post, _id: Date.now() + Math.random() });
  try { localStorage.setItem("folio_pending_posts", JSON.stringify(posts)); } catch {}
}

async function fetchBooks(userId) {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (error) {
    const cached = getCachedBooks();
    if (cached) return cached;
    throw error;
  }
  const result = (data || []).map(dbToBook);
  cacheBooks(result);
  return result;
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

// ============ MESSAGING HELPERS ============
async function getOrCreateConversation(userId, friendId) {
  const { data: c1 } = await supabase
    .from("conversations").select("id")
    .eq("user1_id", userId).eq("user2_id", friendId).maybeSingle();
  if (c1) return c1.id;
  const { data: c2 } = await supabase
    .from("conversations").select("id")
    .eq("user1_id", friendId).eq("user2_id", userId).maybeSingle();
  if (c2) return c2.id;
  const [a, b] = [userId, friendId].sort();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user1_id: a, user2_id: b })
    .select("id").single();
  if (error) {
    const { data: r } = await supabase
      .from("conversations").select("id")
      .eq("user1_id", a).eq("user2_id", b).maybeSingle();
    return r?.id;
  }
  return data.id;
}

async function markConversationRead(conversationId, userId) {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

async function getUnreadMessagesCount(userId) {
  const { data: convs } = await supabase
    .from("conversations").select("id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  if (!convs || convs.length === 0) return 0;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convs.map((c) => c.id))
    .neq("sender_id", userId)
    .is("read_at", null);
  return count || 0;
}

// ============ FEED HELPERS ============
async function fetchFeed(userId) {
  const { data: fs } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  const friendIds = (fs || []).map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
  const allIds = [userId, ...friendIds];
  console.log("[fetchFeed] userId:", userId, "allIds:", allIds);

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, type, action, content, image_url, created_at, user_id, book_id, pages_read, minutes_read")
    .in("user_id", allIds)
    .order("created_at", { ascending: false })
    .limit(60);

  if (postsError) {
    console.error("[fetchFeed] Error al leer posts:", postsError);
    throw postsError;
  }
  console.log("[fetchFeed] posts recibidos:", posts?.length ?? 0);
  if (!posts || posts.length === 0) return [];

  const bookIds = [...new Set(posts.filter((p) => p.book_id).map((p) => p.book_id))];
  let bookMap = {};
  if (bookIds.length > 0) {
    const { data: bks } = await supabase
      .from("books")
      .select("id, title, author, cover_url, rating, review, status")
      .in("id", bookIds);
    (bks || []).forEach((b) => { bookMap[b.id] = b; });
  }

  const authorIds = [...new Set(posts.map((p) => p.user_id))];
  const { data: authors } = await supabase.from("users").select("id, nombre, username, avatar_url, cover_url, bio").in("id", authorIds);

  const authorMap = {};
  (authors || []).forEach((a) => { authorMap[a.id] = { ...a }; });

  return posts.map((p) => ({
    ...p,
    book: p.book_id ? bookMap[p.book_id] : null,
    author: authorMap[p.user_id] || { nombre: "Usuario", username: "" },
  }));
}

async function fetchComments(postId) {
  const { data: comments } = await supabase
    .from("comments")
    .select("id, post_id, user_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: authors } = await supabase.from("users").select("id, nombre, username, avatar_url").in("id", authorIds);
  const authorMap = {};
  (authors || []).forEach((a) => { authorMap[a.id] = { ...a }; });

  const commentIds = comments.map((c) => c.id);
  const { data: allReplies } = await supabase
    .from("comment_replies")
    .select("id, comment_id, user_id, content, created_at")
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true });

  let replyAuthorMap = {};
  if (allReplies && allReplies.length > 0) {
    const replyAuthorIds = [...new Set(allReplies.map((r) => r.user_id))];
    const { data: replyAuthors } = await supabase.from("users").select("id, nombre, username, avatar_url").in("id", replyAuthorIds);
    (replyAuthors || []).forEach((a) => { replyAuthorMap[a.id] = a; });
  }

  const repliesByComment = {};
  (allReplies || []).forEach((r) => {
    if (!repliesByComment[r.comment_id]) repliesByComment[r.comment_id] = [];
    repliesByComment[r.comment_id].push({ ...r, author: replyAuthorMap[r.user_id] || { nombre: "Usuario" } });
  });

  return comments.map((c) => ({
    ...c,
    author: authorMap[c.user_id] || { nombre: "Usuario" },
    replies: repliesByComment[c.id] || [],
  }));
}

async function compressAndUploadPostImage(file, userId) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objUrl);
      const MAX_W = 1200;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(async (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        const filename = `${userId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("post-images").upload(filename, blob, { contentType: "image/jpeg", upsert: false });
        if (error) return reject(error);
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filename);
        resolve(urlData.publicUrl);
      }, "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}

async function createFeedPost({ userId, type, bookId, action, content, imageUrl, pagesRead, minutesRead }) {
  if (!navigator.onLine) {
    addPendingPost({ userId, type, bookId, action, content, imageUrl, pagesRead, minutesRead });
    return;
  }
  const payload = {
    user_id: userId,
    type,
    book_id: bookId || null,
    content: content || null,
    image_url: imageUrl || null,
  };
  if (action !== undefined) payload.action = action || null;
  if (pagesRead !== undefined) payload.pages_read = pagesRead || null;
  if (minutesRead !== undefined) payload.minutes_read = minutesRead || null;
  console.log("[createFeedPost] insertando:", payload);
  console.log("[createFeedPost] User ID:", userId);
  const { error } = await supabase.from("posts").insert(payload);
  if (error) {
    console.error("[createFeedPost] error:", error);
    console.error("[createFeedPost] message:", error?.message, "| code:", error?.code, "| details:", error?.details);
    throw error;
  }
  console.log("[createFeedPost] OK");
}

async function createComment({ postId, userId, content }) {
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, content });
  if (error) throw error;
}

async function createReply({ commentId, userId, content }) {
  const { error } = await supabase.from("comment_replies").insert({ comment_id: commentId, user_id: userId, content });
  if (error) throw error;
}

async function deleteFeedPost(postId, userId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
  if (error) throw error;
}

// ============ STREAK HELPERS ============
function localDateStr(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function fetchStreakData(userId) {
  const today = localDateStr();
  const [{ data: streakRow }, { data: todayLogs }] = await Promise.all([
    supabase.from("user_streaks").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("reading_logs").select("pages_read").eq("user_id", userId).eq("log_date", today),
  ]);
  const hasLoggedToday = (todayLogs || []).length > 0;
  const pagesLoggedToday = (todayLogs || []).reduce((sum, r) => sum + (r.pages_read || 0), 0);
  return { streak: streakRow, hasLoggedToday, pagesLoggedToday };
}

function daysBetweenLocalDates(a, b) {
  // Parse YYYY-MM-DD strings as local noon to avoid any DST/UTC-boundary issues
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const dateA = new Date(ay, am - 1, ad, 12);
  const dateB = new Date(by, bm - 1, bd, 12);
  return Math.round((dateA - dateB) / (1000 * 60 * 60 * 24));
}

async function logReadingSession({ userId, bookId, pagesRead, mood }) {
  if (!navigator.onLine) {
    addPendingLog({ userId, bookId, pagesRead: pagesRead || null, mood, date: localDateStr() });
    return;
  }
  const today = localDateStr();

  const { error: logError } = await supabase.from("reading_logs").insert({
    user_id: userId,
    book_id: bookId,
    pages_read: pagesRead || null,
    mood,
    log_date: today,
  });
  if (logError) throw logError;

  const { data: existing } = await supabase.from("user_streaks")
    .select("*").eq("user_id", userId).maybeSingle();

  if (!existing) {
    await supabase.from("user_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_log_date: today,
      total_pages_read: pagesRead || 0,
      updated_at: new Date().toISOString(),
    });
  } else {
    const diffDays = existing.last_log_date
      ? daysBetweenLocalDates(today, existing.last_log_date)
      : 999;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const freezeProtected = diffDays === 2 && existing.streak_freeze_used_at === localDateStr(yesterday);
    const newStreak = (diffDays === 1 || freezeProtected)
      ? existing.current_streak + 1
      : diffDays === 0 ? existing.current_streak : 1;
    const newLongest = Math.max(existing.longest_streak, newStreak);
    await supabase.from("user_streaks").update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_log_date: today,
      total_pages_read: (existing.total_pages_read || 0) + (pagesRead || 0),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
  }
}

// ============ OFFLINE SYNC ============
async function syncPendingLogs() {
  const logs = getPendingLogs();
  if (logs.length === 0) return 0;
  let synced = 0;
  const remaining = [];
  for (const log of logs) {
    try {
      await logReadingSession({ userId: log.userId, bookId: log.bookId, pagesRead: log.pagesRead, mood: log.mood });
      synced++;
    } catch {
      remaining.push(log);
    }
  }
  try { localStorage.setItem("folio_pending_logs", JSON.stringify(remaining)); } catch {}
  if (remaining.length === 0) localStorage.removeItem("folio_pending_logs");
  return synced;
}

async function syncPendingPosts() {
  const posts = getPendingPosts();
  if (posts.length === 0) return 0;
  let synced = 0;
  const remaining = [];
  for (const post of posts) {
    const { _id, ...payload } = post;
    try {
      await createFeedPost(payload);
      synced++;
    } catch {
      remaining.push(post);
    }
  }
  try { localStorage.setItem("folio_pending_posts", JSON.stringify(remaining)); } catch {}
  if (remaining.length === 0) localStorage.removeItem("folio_pending_posts");
  return synced;
}

// ============ ACHIEVEMENT ENGINE ============
let _achievementListeners = [];
const achievementBus = {
  emit: (keys) => { if (keys.length > 0) _achievementListeners.forEach(fn => fn(keys)); },
  on: (fn) => {
    _achievementListeners.push(fn);
    return () => { _achievementListeners = _achievementListeners.filter(f => f !== fn); };
  },
};

function canShowInviteCard() {
  const last = localStorage.getItem("folio_invite_peak_date");
  return last !== new Date().toISOString().slice(0, 10);
}
function markInviteCardShown() {
  localStorage.setItem("folio_invite_peak_date", new Date().toISOString().slice(0, 10));
}

const FEED_WORTHY_ACHIEVEMENTS = new Set([
  "streak_7", "streak_30", "streak_90", "speed_reader",
  "top_reader", "pages_1000", "pages_10000", "friends_5",
]);

async function checkAchievements(userId, userName, { silent = false } = {}) {
  try {
    // Early exit if achievements table doesn't exist yet
    const { data: alreadyUnlocked, error: achTableErr } = await supabase
      .from("achievements").select("achievement_key").eq("user_id", userId);
    if (achTableErr) {
      console.warn("[checkAchievements] achievements table not ready:", achTableErr.message,
        "\n→ Ejecuta el SQL en Supabase: CREATE TABLE achievements (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE CASCADE, achievement_key text NOT NULL, unlocked_at timestamptz DEFAULT now(), UNIQUE(user_id, achievement_key)); ALTER TABLE achievements ENABLE ROW LEVEL SECURITY; CREATE POLICY \"ach_open\" ON achievements FOR ALL USING (true) WITH CHECK (true);");
      return [];
    }
    const unlockedSet = new Set((alreadyUnlocked || []).map(a => a.achievement_key));

    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthStr = monthStart.toISOString();

    // Books query without is_uam_book to avoid column-not-exists errors
    const [
      { data: books },
      { data: streak },
      { data: logs },
      { data: comments },
      { data: friendships },
      { data: messages },
    ] = await Promise.all([
      supabase.from("books").select("id,status,rating,review,genre,finished_at").eq("user_id", userId),
      supabase.from("user_streaks").select("current_streak,total_pages_read").eq("user_id", userId).maybeSingle(),
      supabase.from("reading_logs").select("id,pages_read,logged_at").eq("user_id", userId),
      supabase.from("comments").select("id").eq("user_id", userId),
      supabase.from("friendships").select("id").or(`user_id.eq.${userId},friend_id.eq.${userId}`).eq("status", "accepted"),
      supabase.from("messages").select("id").eq("sender_id", userId).limit(1),
    ]);

    const allBooks    = books || [];
    const allLogs     = logs  || [];
    const readBooks   = allBooks.filter(b => b.status === "read");
    const thisMonth   = readBooks.filter(b => b.finished_at && b.finished_at >= monthStr);
    const totalPages  = streak?.total_pages_read || 0;
    const curStreak   = streak?.current_streak   || 0;
    const genresRead  = new Set(readBooks.filter(b => b.genre).map(b => b.genre));

    // is_uam_book check — separate query so column-missing doesn't break everything
    let hasUamBook = false;
    const { count: uamCount, error: uamErr } = await supabase
      .from("books").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("is_uam_book", true);
    if (!uamErr) hasUamBook = (uamCount || 0) > 0;

    const checks = {
      first_book_added: allBooks.length >= 1,
      first_book_read:  readBooks.length >= 1,
      first_review:     allBooks.some(b => b.review && b.review.length > 10),
      rated_5_books:    allBooks.filter(b => b.rating > 0).length >= 5,
      marathon_reader:  thisMonth.length >= 3,
      speed_reader:     thisMonth.length >= 5,
      explorer:         genresRead.size >= 3,
      genre_master:     genresRead.size >= 5,
      collector_10:     allBooks.length >= 10,
      collector_50:     allBooks.length >= 50,
      first_log:        allLogs.length >= 1,
      sessions_30:      allLogs.length >= 30,
      pages_100:        totalPages >= 100,
      pages_1000:       totalPages >= 1000,
      pages_10000:      totalPages >= 10000,
      big_session:      allLogs.some(l => (l.pages_read || 0) >= 100),
      night_owl:        allLogs.filter(l => new Date(l.logged_at).getHours() >= 22).length >= 5,
      streak_7:         curStreak >= 7,
      streak_30:        curStreak >= 30,
      streak_90:        curStreak >= 90,
      first_comment:    (comments || []).length >= 1,
      comments_10:      (comments || []).length >= 10,
      first_friend:     (friendships || []).length >= 1,
      friends_5:        (friendships || []).length >= 5,
      first_message:    (messages || []).length >= 1,
      uam_book:         hasUamBook,
      top_reader:       unlockedSet.has("top_reader"),
    };

    // top_reader: expensive per-friend query
    if (!unlockedSet.has("top_reader") && thisMonth.length > 0) {
      const { data: fs } = await supabase.from("friendships")
        .select("user_id,friend_id").eq("status","accepted")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      const fids = (fs || []).map(f => f.user_id === userId ? f.friend_id : f.user_id);
      if (fids.length > 0) {
        let isTop = true;
        for (const fid of fids) {
          const { count } = await supabase.from("books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", fid).eq("status","read").gte("finished_at", monthStr);
          if ((count || 0) >= thisMonth.length) { isTop = false; break; }
        }
        checks.top_reader = isTop;
      }
    }

    const newKeys = Object.entries(checks)
      .filter(([k, v]) => v && !unlockedSet.has(k))
      .map(([k]) => k);

    if (newKeys.length === 0) return [];

    // Use upsert with onConflict to avoid duplicate errors
    const { error: insertErr } = await supabase.from("achievements").upsert(
      newKeys.map(k => ({ user_id: userId, achievement_key: k })),
      { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
    );
    if (insertErr) { console.error("[checkAchievements] insert error:", insertErr.message); return []; }

    // Auto feed post for notable achievements
    for (const key of newKeys) {
      if (FEED_WORTHY_ACHIEVEMENTS.has(key)) {
        const def = ACHIEVEMENT_DEFS.find(a => a.key === key);
        if (def) {
          await supabase.from("posts").insert({
            user_id: userId, type: "achievement",
            content: `${def.emoji} "${def.name}" — ${def.desc}`,
          });
        }
      }
    }

    console.log(`[checkAchievements] ✓ ${newKeys.length} nuevo(s): ${newKeys.join(", ")}`);
    if (!silent) achievementBus.emit(newKeys);
    return newKeys;
  } catch (err) {
    console.error("[checkAchievements] unexpected error:", err);
    return [];
  }
}

// ============ AI HELPERS ============
async function enrichBook(title, author) {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
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
- Zona de confort: ${moodAnswers.openness}
${moodAnswers.extra ? `- Algo adicional: ${moodAnswers.extra}` : ""}

Tu trabajo es recomendar dos grupos de libros:

1. **fromLibrary**: 2-3 libros de su biblioteca disponible (de la lista DISPONIBLES). NUNCA recomiendes libros que ya leyó (los listados en LEÍDOS). Si no hay libros disponibles, deja el array vacío.

2. **newSuggestions**: 2-3 libros NUEVOS que NO están en su biblioteca y que NO ha leído. Basa las sugerencias en sus gustos demostrados y su mood actual. TEN MUY EN CUENTA la zona de confort: si quiere algo parecido a lo que le ha gustado, quédate dentro de sus géneros y estilos habituales; si quiere salir de su zona, propón algo genuinamente diferente o inesperado para él.

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
      model: "claude-sonnet-4-6",
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
  reading: { label: "Leyendo", icon: BookOpen, color: "#A4493D" },
  want_to_read: { label: "Por leer", icon: Bookmark, color: "#B8720A" },
  wish: { label: "Quiero leer", icon: Heart, color: "#8A4A6A" },
  read: { label: "Leído", icon: BookmarkCheck, color: "#5C6B3D" },
};

// ============ GOOGLE BOOKS ============
const _gbSearchCache = new Map();
const GB_CACHE_TTL = 60_000;

function normTitle(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

function mapGBItem(item) {
  const vi = item.volumeInfo || {};
  return {
    gbId: item.id || '',
    title: vi.title || 'Sin título',
    author: (vi.authors || [])[0] || 'Autor desconocido',
    year: vi.publishedDate?.substring(0, 4) || null,
    coverUrl: vi.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    isbn: (vi.industryIdentifiers?.find(i => i.type === 'ISBN_13') || vi.industryIdentifiers?.[0])?.identifier || null,
    pageCount: vi.pageCount || null,
    description: vi.description || '',
    genre: vi.categories?.[0] || null,
    publisher: vi.publisher || null,
    language: vi.language || null,
  };
}

async function gbFetch(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('GB API error');
  return r.json();
}

async function searchGoogleBooks(query) {
  if (!query.trim()) return [];
  const key = query.trim().toLowerCase();
  const cached = _gbSearchCache.get(key);
  if (cached && Date.now() - cached.ts < GB_CACHE_TTL) { console.log('[books] cache hit', key, cached.results.length); return cached.results; }

  const q = encodeURIComponent(query.trim());
  console.log('[books] fetch /api/books?q=', q);
  const d = await gbFetch(`/api/books?q=${q}`);
  console.log('[books] raw response:', JSON.stringify(d).slice(0, 300));
  const items = d.items || [];

  const processed = items.map(mapGBItem);

  // Deduplicate: same normalized title+author -> keep the one with a cover
  const seen = new Map();
  const deduped = [];
  for (const book of processed) {
    const dk = normTitle(book.title) + '|' + normTitle(book.author);
    const prev = seen.get(dk);
    if (!prev) {
      seen.set(dk, book);
      deduped.push(book);
    } else if (!prev.coverUrl && book.coverUrl) {
      const idx = deduped.indexOf(prev);
      if (idx !== -1) deduped[idx] = book;
      seen.set(dk, book);
    }
  }

  const results = deduped.slice(0, 12);
  _gbSearchCache.set(key, { ts: Date.now(), results });
  return results;
}

async function lookupISBN(isbn) {
  try {
    const d = await gbFetch(`/api/books?q=isbn:${encodeURIComponent(isbn)}`);
    const item = d.items?.[0];
    if (item) {
      const mapped = mapGBItem(item);
      return {
        title: mapped.title,
        author: mapped.author,
        genre: mapped.genre || '',
        summary: mapped.description?.slice(0, 500) || '',
        coverUrl: mapped.coverUrl,
        year: mapped.year,
        pageCount: mapped.pageCount,
      };
    }
  } catch {}
  return null;
}

// ============ COMPONENTS ============

const COVER_PALETTES = [
  { bg: "#7A2E2E", fg: "#F5EDE0", accent: "#E8A84A" },
  { bg: "#1B3A4B", fg: "#E8F2FA", accent: "#E8A84A" },
  { bg: "#5C6B3D", fg: "#EBF5E4", accent: "#E8C86A" },
  { bg: "#5C1A5C", fg: "#F5E8F5", accent: "#E8A84A" },
  { bg: "#3D5A6C", fg: "#E8F0F7", accent: "#F0C060" },
  { bg: "#8A3A1F", fg: "#F5EDE8", accent: "#F5E0B0" },
  { bg: "#544875", fg: "#EDE8F5", accent: "#E8B86D" },
  { bg: "#C8924A", fg: "#2A1F1A", accent: "#7A2E2E" },
  { bg: "#1F3933", fg: "#E4F0EC", accent: "#E8C86A" },
  { bg: "#6B2B3E", fg: "#F5E8EC", accent: "#E8C86A" },
  { bg: "#2A3D14", fg: "#EBF0E4", accent: "#F0C060" },
  { bg: "#0D3350", fg: "#E4EFF8", accent: "#E8A84A" },
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function genreColor(genre) {
  const g = (genre || "").toLowerCase();
  if (g.includes("novela") || g.includes("ficción") || g.includes("fiction") || g.includes("narrativa"))
    return { color: "#1B3A4B", backgroundColor: "#1B3A4B1A" };
  if (g.includes("filosofía") || g.includes("ensayo") || g.includes("philosophy"))
    return { color: "#5C6B3D", backgroundColor: "#5C6B3D1A" };
  if (g.includes("terror") || g.includes("horror") || g.includes("thriller") || g.includes("misterio"))
    return { color: "#7A2E2E", backgroundColor: "#7A2E2E1A" };
  if (g.includes("romance") || g.includes("amor") || g.includes("poesía") || g.includes("poetry"))
    return { color: "#7A3D4E", backgroundColor: "#A26B7A1A" };
  if (g.includes("historia") || g.includes("history") || g.includes("biografía") || g.includes("memoir"))
    return { color: "#8A5A1A", backgroundColor: "#C8924A1A" };
  if (g.includes("ciencia") || g.includes("sci-fi") || g.includes("tecnología") || g.includes("divulgación"))
    return { color: "#1F3933", backgroundColor: "#1F39331A" };
  if (g.includes("autoayuda") || g.includes("desarrollo") || g.includes("psicología") || g.includes("bienestar"))
    return { color: "#544875", backgroundColor: "#5448751A" };
  return { color: palette.inkFaint, backgroundColor: palette.bgSoft };
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
            fill={n <= value ? "#E07B1A" : "transparent"}
            color={n <= value ? "#E07B1A" : palette.border}
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
  { id: "feed", label: "Feed", icon: Home },
  { id: "explorar", label: "Explorar", icon: Compass },
  { id: "add", label: "Agregar", icon: Plus },
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "perfil", label: "Perfil", icon: User },
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

function AppHeader({ tab, setTab, user, onLogout, pendingCount, unreadMessages, unreadNotifs, onOpenNotifs }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-sm" style={{ backgroundColor: palette.bg + "F0", borderBottom: `1px solid ${palette.border}` }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6" style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/logo.png" alt="Folio" style={{ height: 32, width: "auto", display: "block" }} />
        <button
          onClick={onOpenNotifs}
          aria-label="Notificaciones"
          className="bell-btn"
          style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Bell size={22} color={palette.inkSoft} strokeWidth={1.8} />
          {unreadNotifs > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, backgroundColor: "#e53e3e", color: "#fff", borderRadius: "999px", fontSize: "0.55rem", fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", fontFamily: "system-ui, sans-serif" }}>
              {unreadNotifs > 9 ? "9+" : unreadNotifs}
            </span>
          )}
        </button>
      </div>
      {/* Desktop nav */}
      <div className="hidden sm:block" style={{ borderTop: `1px solid ${palette.borderSoft}` }}>
        <div className="max-w-4xl mx-auto" style={{ display: "flex", gap: "0.4rem", padding: "0.35rem 1.5rem" }}>
          {NAV_ITEMS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const isAdd = t.id === "add";
            const badge = t.id === "amigos" ? pendingCount + unreadMessages : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.4rem 1rem", borderRadius: "999px",
                  border: `1px solid ${active ? (isAdd ? palette.accent + "55" : palette.accent + "55") : "transparent"}`,
                  backgroundColor: active ? (isAdd ? palette.accent : palette.accent) : "transparent",
                  color: active ? "#fff" : palette.inkSoft,
                  cursor: "pointer", ...display, fontSize: "0.85rem", fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && (
                    <span style={{ position: "absolute", top: -5, right: -7, backgroundColor: "#e53e3e", color: "#fff", borderRadius: "999px", fontSize: "0.5rem", fontWeight: 700, minWidth: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px", fontFamily: "system-ui, sans-serif" }}>
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
      <div style={{ height: 2, background: "linear-gradient(to right, #7A2E2E, #C8924A55, transparent)" }} />
    </header>
  );
}

function BottomNav({ tab, setTab, pendingCount, unreadMessages, unreadNotifs }) {
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
        const isAdd = t.id === "add";
        const badge = t.id === "amigos" ? pendingCount + unreadMessages : 0;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1.5${isAdd ? " nav-add-btn" : ""}`}
            style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", minHeight: 54 }}
          >
            {isAdd ? (
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                backgroundColor: palette.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(107, 30, 42, 0.3)",
                marginBottom: 1,
              }}>
                <Plus size={24} color="#fff" strokeWidth={2.5} />
              </div>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "5px 14px",
                borderRadius: "999px",
                backgroundColor: active ? `${palette.accent}18` : "transparent",
                transition: "background-color 200ms ease",
              }}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} color={active ? palette.accent : "#8A7B6E"} style={{ transition: "color 200ms ease" }} />
                  {badge > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -6, backgroundColor: "#e53e3e", color: "#fff", borderRadius: "999px", fontSize: "0.5rem", fontWeight: 700, minWidth: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px", fontFamily: "system-ui, sans-serif" }}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "Fraunces, serif", fontSize: "11px", fontWeight: active ? 700 : 500, lineHeight: 1, color: active ? palette.accent : "#8A7B6E", transition: "color 200ms ease" }}>{t.label}</span>
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
                color: active ? "#FFFFFF" : palette.inkSoft,
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

function BarcodeScanner({ onDetect, onManual }) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [attemptNum, setAttemptNum] = useState(0);
  const [failedImage, setFailedImage] = useState(null);
  const [decodeError, setDecodeError] = useState(false);

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1280;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(blobUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        const fr = new FileReader();
        fr.onload = (ev) => resolve(ev.target.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      };
      img.src = blobUrl;
    });
  }

  // Grayscale + contrast boost + sharpen kernel via Canvas API
  function applyFilters(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Pass 1: grayscale + contrast
        const raw = ctx.getImageData(0, 0, w, h);
        const gc = ctx.createImageData(w, h);
        for (let i = 0; i < raw.data.length; i += 4) {
          const gray = 0.299 * raw.data[i] + 0.587 * raw.data[i + 1] + 0.114 * raw.data[i + 2];
          const c = Math.max(0, Math.min(255, (gray - 128) * 1.7 + 128));
          gc.data[i] = gc.data[i + 1] = gc.data[i + 2] = c;
          gc.data[i + 3] = 255;
        }
        ctx.putImageData(gc, 0, 0);

        // Pass 2: sharpen with 3x3 Laplacian kernel [0,-1,0,-1,5,-1,0,-1,0]
        const src = ctx.getImageData(0, 0, w, h);
        const dst = ctx.createImageData(w, h);
        const s = src.data;
        const d = dst.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
              d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
            } else {
              const v = Math.max(0, Math.min(255,
                5 * s[i]
                - s[((y - 1) * w + x) * 4]
                - s[((y + 1) * w + x) * 4]
                - s[(y * w + (x - 1)) * 4]
                - s[(y * w + (x + 1)) * 4]
              ));
              d[i] = d[i + 1] = d[i + 2] = v;
              d[i + 3] = 255;
            }
          }
        }
        ctx.putImageData(dst, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = dataUrl;
    });
  }

  function rotateDataUrl(dataUrl, deg) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const rad = (deg * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const w = Math.round(img.width * cos + img.height * sin);
        const h = Math.round(img.width * sin + img.height * cos);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.src = dataUrl;
    });
  }

  function tryDecode(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        getZxingReader().decodeFromCanvas(canvas)
          .then((result) => resolve(result.getText()))
          .catch(() => resolve(null));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setDecodeError(false);
    setFailedImage(null);
    try {
      const rawUrl = await fileToDataUrl(file);
      const processed = await applyFilters(rawUrl);

      // Attempt 1: preprocessed image, normal orientation
      setAttemptNum(1);
      let isbn = await tryDecode(processed);

      // Attempt 2: rotated 90° (handles landscape barcodes on portrait photos)
      if (!isbn) {
        setAttemptNum(2);
        const rot90 = await rotateDataUrl(processed, 90);
        isbn = await tryDecode(rot90);
      }

      // Attempt 3: rotated 180° (handles upside-down captures)
      if (!isbn) {
        setAttemptNum(3);
        const rot180 = await rotateDataUrl(processed, 180);
        isbn = await tryDecode(rot180);
      }

      if (isbn) {
        onDetect(isbn.replace(/[^0-9X]/gi, ""));
      } else {
        setFailedImage(rawUrl);
        setDecodeError(true);
      }
    } catch {
      setDecodeError(true);
    } finally {
      setProcessing(false);
      setAttemptNum(0);
      e.target.value = "";
    }
  }

  function retryCapture() {
    setDecodeError(false);
    setFailedImage(null);
    inputRef.current?.click();
  }

  const attemptLabels = ["", "Analizando imagen…", "Probando otra orientación…", "Último intento…"];

  return (
    <div style={{ textAlign: "center" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {/* Visual guide shown before first error */}
      {!decodeError && (
        <div
          style={{
            marginBottom: "1.1rem",
            padding: "1rem",
            borderRadius: "10px",
            backgroundColor: `${palette.amber}18`,
            border: `1px solid ${palette.amber}50`,
          }}
        >
          {/* Barcode illustration */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.65rem" }}>
            <div
              style={{
                border: `2.5px solid ${palette.amber}`,
                borderRadius: 8,
                padding: "7px 10px",
                backgroundColor: "white",
                display: "flex",
                alignItems: "stretch",
                gap: 2,
                height: 70,
                width: 150,
                boxSizing: "border-box",
              }}
            >
              {[2,1,3,1,2,1,3,2,1,3,1,2,1,3,1,2,3,1,2,1].map((w, i) => (
                <div key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? "#1a1a1a" : "transparent" }} />
              ))}
            </div>
          </div>
          <p style={{ ...display, fontSize: "0.84rem", fontWeight: 700, color: palette.amber, textAlign: "center", marginBottom: "0.2rem" }}>
            Acerca el celular hasta que el código llene la pantalla
          </p>
          <p style={{ ...body, fontSize: "0.77rem", color: palette.inkSoft, textAlign: "center", lineHeight: 1.4 }}>
            Buena iluminación · sin sombras ni reflejos
          </p>
        </div>
      )}

      <button
        onClick={retryCapture}
        disabled={processing}
        className="inline-flex items-center justify-center gap-2 w-full py-5 rounded-lg transition-all hover:opacity-80 active:scale-95"
        style={{
          ...display,
          fontSize: "1rem",
          fontWeight: 600,
          color: processing ? palette.inkFaint : palette.bg,
          backgroundColor: processing ? palette.borderSoft : palette.amber,
          border: "none",
          cursor: processing ? "default" : "pointer",
        }}
      >
        {processing ? <Loader2 size={20} className="animate-spin" /> : <Barcode size={20} strokeWidth={1.8} />}
        {processing ? (attemptLabels[attemptNum] || "Procesando…") : "Tomar foto del código"}
      </button>

      {processing && attemptNum > 0 && (
        <p style={{ ...body, fontSize: "0.77rem", color: palette.inkFaint, marginTop: "0.35rem" }}>
          Intento {attemptNum} de 3
        </p>
      )}

      {decodeError && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.9rem 1rem",
            borderRadius: "8px",
            backgroundColor: palette.bgCard,
            border: `1px solid ${palette.border}`,
            textAlign: "left",
          }}
        >
          {/* Show captured photo with guide overlay so user sees the problem */}
          {failedImage && (
            <div style={{ position: "relative", marginBottom: "0.75rem" }}>
              <img
                src={failedImage}
                alt="Foto capturada"
                style={{ width: "100%", borderRadius: "6px", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "25%",
                  left: "8%",
                  right: "8%",
                  bottom: "25%",
                  border: "3px dashed #ef4444",
                  borderRadius: "6px",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}
          <p style={{ ...body, color: palette.inkSoft, fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            {failedImage
              ? "El código debe llenar el recuadro rojo. Acércate más para que el ISBN ocupe toda la pantalla."
              : "No se detectó el código. Intenta acercarte más con buena iluminación."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={retryCapture}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{ ...display, fontSize: "0.85rem", fontWeight: 500, color: palette.bg, backgroundColor: palette.accent, border: "none" }}
            >
              Tomar otra foto
            </button>
            <button
              onClick={onManual}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{ ...display, fontSize: "0.85rem", fontWeight: 500, color: palette.inkSoft, border: `1px solid ${palette.border}`, backgroundColor: "transparent" }}
            >
              <Pencil size={12} strokeWidth={2} /> Agregar manualmente
            </button>
          </div>
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
  const inputRef = useRef(null);
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ol_recent_searches") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (isOpen) {
      setQuery(""); setResults([]); setError(""); setSelectedBook(null); setPickedStatus("want_to_read");
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); setLoading(false); return; }
    console.log('[SearchBookModal] buscando:', query.trim());
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const res = await searchGoogleBooks(query.trim());
        console.log('[SearchBookModal] resultados:', res?.length, res);
        setResults(res);
      } catch (err) {
        console.error('[SearchBookModal] error:', err);
        setError("No se puede conectar a la búsqueda. Intenta de nuevo.");
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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

  console.log('[SearchBookModal] render: query=', query, 'loading=', loading, 'results=', results.length);

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
              <button key={id} onClick={() => setPickedStatus(id)} style={{ padding: "0.5rem 1.1rem", borderRadius: "999px", border: `1.5px solid ${pickedStatus === id ? palette.accent : palette.border}`, backgroundColor: pickedStatus === id ? palette.accent : palette.bgCard, color: pickedStatus === id ? "#FFFFFF" : palette.inkSoft, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", fontWeight: pickedStatus === id ? 600 : 400, cursor: "pointer", transition: "all 0.12s" }}>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "#F5EFE3", display: "flex", flexDirection: "column", paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      {/* Search header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.65rem", padding: "12px 16px", borderBottom: `1px solid ${palette.borderSoft}`, backgroundColor: "#F5EFE3" }}>
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
            onChange={(e) => { console.log('[input] onChange:', e.target.value); setQuery(e.target.value); }}
            onInput={(e) => console.log('[input] onInput:', e.currentTarget.value)}
            placeholder="Busca por título, autor o ISBN..."
            style={{ width: "100%", padding: "0.65rem 2.2rem 0.65rem 2.2rem", backgroundColor: "#EDE7D9", border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", fontFamily: "'EB Garamond', serif", fontSize: "16px", color: palette.ink, outline: "none", boxSizing: "border-box" }}
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
            {results.map((book, i) => (
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
                  {book.year && <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "11px", color: palette.inkFaint }}>{book.year}</p>}
                </div>
                <ChevronRight size={15} color={palette.inkFaint} style={{ flexShrink: 0 }} />
              </button>
            ))}
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
              onClick={() => onClose("isbn")}
              style={{ ...ts.caption, color: palette.accent, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
            >
              Escanea el código de barras →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function AddBookView({ onAdd, setTab, isOnline = true }) {
  const [mode, setMode] = useState("search");
  const [isbnStage, setIsbnStage] = useState("scanning"); // scanning | loading | confirm | notfound
  const [detectedIsbn, setDetectedIsbn] = useState("");
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
    setIsbnStage("scanning");
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
    });
    setMode("search");
    setTab("perfil");
  }

  // Search modal (primary mode — fullscreen overlay above header)
  if (mode === "search") {
    return (
      <SearchBookModal
        isOpen={true}
        onClose={(fallback) => fallback === "isbn" ? (setIsbnStage("scanning"), setMode("isbn")) : setMode(null)}
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
          <button onClick={() => { setIsbnStage("scanning"); setMode("isbn"); }} className="text-left p-5 rounded-xl transition-all hover:-translate-y-0.5" style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}>
            <Barcode size={22} color={palette.amber} strokeWidth={1.8} />
            <h3 style={{ ...ts.h3, color: palette.ink, marginTop: "0.55rem" }}>Código de barras</h3>
            <p style={{ ...ts.caption, marginTop: "0.2rem" }}>Fotografía el ISBN · rellena automáticamente</p>
          </button>
          <button onClick={() => setMode("manual")} className="text-left p-5 rounded-xl transition-all hover:-translate-y-0.5" style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}>
            <Pencil size={22} color={palette.inkSoft} strokeWidth={1.8} />
            <h3 style={{ ...ts.h3, color: palette.ink, marginTop: "0.55rem" }}>Manual</h3>
            <p style={{ ...ts.caption, marginTop: "0.2rem" }}>Escribe título y autor a mano</p>
          </button>
        </div>
      </div>
    );
  }

  // isbn mode
  if (mode === "isbn") {
    function goBack() {
      setMode("search");
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
              Fotografía el código de barras
            </h2>
            <p style={{ ...body, color: palette.inkSoft, fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Toma una foto del ISBN en la contracubierta. Sin video, funciona en iOS.
            </p>
            <BarcodeScanner
              onDetect={async (isbn) => {
                setDetectedIsbn(isbn);
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
              onManual={() => { setMode("manual"); setIsbnStage("scanning"); }}
            />
            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: `1px solid ${palette.borderSoft}`,
                textAlign: "center",
              }}
            >
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
          <LoadingEntertainment label="Buscando tu libro…" />
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
                  Encontrado en Open Library
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
            <BookForm form={form} setForm={setForm} onReadSelected={() => setShowRatingPrompt(true)} />
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
            {showRatingPrompt && (
              <QuickRatingModal
                currentRating={form.rating}
                onSave={(r) => { setForm((prev) => ({ ...prev, rating: r })); setShowRatingPrompt(false); }}
                onSkip={() => setShowRatingPrompt(false)}
              />
            )}
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
            {detectedIsbn && (
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, marginBottom: "0.4rem" }}>
                ISBN detectado: <strong style={{ color: palette.inkSoft, fontFamily: "monospace" }}>{detectedIsbn}</strong>
              </p>
            )}
            <p style={{ ...body, color: palette.inkSoft, fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              No encontramos este libro. Intenta escanear de nuevo o agrégalo manualmente.
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
    border: `1.5px solid #D4C8BC`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    color: "#8A7B6E",
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
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);

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
                    color: "#8A7B6E",
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
                    color: "#8A7B6E",
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
      const res = await getRecommendations(books, ans);
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
                color: "#8A7B6E",
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
    border: selected ? "none" : `1px solid #D4C9B5`,
    backgroundColor: selected ? "#6B1E2A" : "#EBE3D2",
    color: selected ? "#FFFFFF" : palette.ink,
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
      const username = form.username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().trim();
      if (!username) { setError("El nombre de usuario es requerido."); return; }
      if (!form.email.trim()) { setError("El email es requerido."); return; }
      if (form.password.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }
      if (form.password !== form.confirm) { setError("Las contraseñas no coinciden."); return; }
      setLoading(true);
      try {
        const user = await registerUser(form.name, username, form.email, form.password);
        await mintToken(user);
        onLogin(user, true);
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
    border: `1.5px solid #D4C8BC`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    color: "#8A7B6E",
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
          <div style={{ width: "100%", maxWidth: 420, marginBottom: "1rem", padding: "0.7rem 1rem", backgroundColor: "#C8924A14", border: "1px solid #C8924A40", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
              minHeight: "48px",
              padding: "0.9rem",
              backgroundColor: loading ? palette.inkSoft : palette.accent,
              color: "#FFFFFF",
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
    const colors = ["#7A2E2E", "#C8924A", "#A26B7A", "#1B3A4B", "#5C6B3D"];
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
            background: "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)",
            color: "#fff", border: "none", borderRadius: "999px",
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
                color: "#fff", ...display, fontSize: "0.9rem", fontWeight: 700, flexShrink: 0,
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
                backgroundColor: palette.accent, color: "#fff",
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
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: isUnlocked ? "linear-gradient(135deg, #7A2E2E, #C8924A)" : palette.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isUnlocked ? "0 6px 24px rgba(122,46,46,0.3)" : "none" }}>
            <IconComp size={34} color={isUnlocked ? "#fff" : palette.inkFaint} strokeWidth={1.5} />
          </div>
          <div>
            <p style={{ ...display, fontSize: "1.2rem", fontWeight: 700, color: palette.ink, lineHeight: 1.2 }}>{def.name}</p>
            <p style={{ ...body, fontSize: "0.84rem", marginTop: "0.3rem", color: isUnlocked ? palette.amber : palette.inkFaint, fontWeight: isUnlocked ? 500 : 400 }}>
              {isUnlocked ? `Desbloqueado el ${dateStr}` : "Aún no desbloqueado"}
            </p>
          </div>
          <div style={{ backgroundColor: isUnlocked ? "#C8924A10" : palette.bgSoft, border: `1px solid ${isUnlocked ? "#C8924A30" : palette.borderSoft}`, borderRadius: 12, padding: "0.85rem 1.1rem", width: "100%", textAlign: "left" }}>
            <p style={{ ...display, fontSize: "0.75rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.3rem" }}>
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
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #7A2E2E, #C8924A)", borderRadius: "999px", transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}
      {cats.map((cat) => {
        const defs = toShow.filter((d) => d.cat === cat);
        return (
          <div key={cat} style={{ marginBottom: "1.1rem" }}>
            <p style={{ ...display, fontSize: "0.75rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.5rem" }}>{cat}</p>
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
                      backgroundColor: isUnlocked ? "#FBF6EB" : "#F0EDE8",
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
                      <Lock size={10} color="#C5B9A8" style={{ position: "absolute", top: 5, right: 5 }} />
                    )}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "0.25rem", height: "1.6rem" }}>
                      <IconComp size={28} color={isUnlocked ? "#C8842B" : "#C5B9A8"} strokeWidth={1.5} />
                    </div>
                    <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.6rem", color: isUnlocked ? palette.ink : "#B0A898", fontWeight: isUnlocked ? 600 : 400, lineHeight: 1.2, marginBottom: "0.1rem" }}>
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
const CAL_COLORS = [null, "#D4E6C3", "#9DC07F", "#5C8A3E", "#3D6B28"];
const DAY_HEADERS_ES = ["D", "L", "M", "Mi", "J", "V", "S"];

function getCalColor(pages) {
  if (!pages || pages === 0) return null;
  if (pages <= 5)  return CAL_COLORS[1];
  if (pages <= 15) return CAL_COLORS[2];
  if (pages <= 30) return CAL_COLORS[3];
  return CAL_COLORS[4];
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
                      ? (darkBg ? "#fff" : palette.ink)
                      : (isFuture ? "#D4C9B5" : palette.inkFaint),
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
              {CAL_COLORS.slice(1).map(c => (
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
function ProfileView({ user, books, onSelectBook, setTab, onLogout }) {
  const [profile, setProfile] = useState({ username: "", bio: "", avatarUrl: null, coverUrl: null });
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
    supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setStreak(data); });

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
        ? await generateAnnualWrap(user.id, user.name, year)
        : await generateMonthWrap(user.id, user.name, month, year);
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
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setProfile((p) => ({ ...p, avatarUrl: data.publicUrl + `?t=${Date.now()}` }));
    } catch (e) {
      setError("Error al subir la imagen. Verifica que el bucket 'avatars' existe y es público.");
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
      const { error: upErr } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`;
      setProfile((p) => ({ ...p, coverUrl: url }));
      await supabase.from("users").update({ cover_url: url }).eq("id", user.id);
    } catch (e) {
      setError("Error al subir la portada. Verifica que el bucket 'covers' existe y es público.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
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
    border: `1.5px solid #D4C8BC`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    ...display,
    fontSize: "0.78rem",
    color: "#8A7B6E",
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
  const byYear = {};
  readBooks.forEach((b) => {
    if (b.finishedAt) {
      const yr = new Date(b.finishedAt).getFullYear();
      byYear[yr] = (byYear[yr] || 0) + 1;
    }
  });
  const yearEntries = Object.entries(byYear).sort((a, b) => Number(a[0]) - Number(b[0]));
  const maxYearCount = yearEntries.length > 0 ? Math.max(...yearEntries.map(([, v]) => v)) : 0;
  const genreCounts = {};
  books.forEach((b) => {
    if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topRated = [...readBooks]
    .filter((b) => b.rating > 0)
    .sort((a, b) => b.rating - a.rating || (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 5);

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", paddingBottom: "2rem" }}>

      {/* ── Cover banner ── */}
      <div style={{ position: "relative", height: 180, background: profile.coverUrl ? "none" : "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)" }}>
        {profile.coverUrl && (
          <img src={profile.coverUrl} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}

        {/* Avatar overlapping bottom-left */}
        <div
          style={{ position: "absolute", bottom: -46, left: 20, cursor: uploading ? "default" : "pointer" }}
          onClick={() => !uploading && fileInput.current?.click()}
          className="group"
        >
          <div style={{ padding: 3, borderRadius: "50%", background: "linear-gradient(135deg, #7A2E2E, #C8924A)", boxShadow: "0 4px 18px rgba(122,46,46,0.45)", border: `4px solid ${palette.bg}` }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 92, height: 92, borderRadius: "50%", backgroundColor: getAvatarColor(user.id || user.name), color: "#FFFFFF", fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(42,31,26,0.45)" }}>
              {uploading ? <Loader2 size={20} color="#fff" className="animate-spin" /> : <Camera size={18} color="#fff" />}
            </div>
          </div>
        </div>

        {/* Change cover button */}
        <button
          onClick={() => coverFileInput.current?.click()}
          disabled={uploadingCover}
          style={{ position: "absolute", bottom: 10, right: 12, display: "flex", alignItems: "center", gap: "0.3rem", backgroundColor: "rgba(42,31,26,0.55)", backdropFilter: "blur(6px)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "999px", padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.78rem", ...display, fontWeight: 500 }}
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
          <div style={{
            borderRadius: "14px", padding: "1rem 1.25rem",
            background: "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)",
            boxShadow: "0 4px 20px rgba(122,46,46,0.3)",
            display: "flex", alignItems: "center", gap: "1rem",
          }}>
            <Flame
              size={36}
              color="#F4EDE0"
              className={streak.current_streak > 7 ? "fire-pulse" : ""}
              style={{ flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ ...display, fontWeight: 800, fontSize: "1.6rem", color: "#F4EDE0", lineHeight: 1, marginBottom: "0.15rem" }}>
                {streak.current_streak} {streak.current_streak === 1 ? "día" : "días"} de racha
              </p>
              <p style={{ ...body, fontSize: "0.82rem", color: "rgba(244,237,224,0.75)" }}>
                Mejor racha: {streak.longest_streak} {streak.longest_streak === 1 ? "día" : "días"}
              </p>
            </div>
            {streak.total_pages_read > 0 && (
              <div style={{ textAlign: "center", flexShrink: 0, backgroundColor: "rgba(244,237,224,0.15)", borderRadius: "10px", padding: "0.5rem 0.8rem" }}>
                <p style={{ ...display, fontWeight: 800, fontSize: "1.2rem", color: "#F4EDE0", lineHeight: 1 }}>
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
                <label style={labelStyle}>Nombre completo</label>
                <p style={{ ...ts.body15, color: palette.inkFaint }}>{user.name}</p>
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
            {success && <p style={{ ...ts.body15, color: "#5a7a5a", fontStyle: "italic", marginTop: "0.75rem" }}>{success}</p>}
            <button
              onClick={async () => { const ok = await handleSave(); if (ok) setTimeout(() => setEditModalOpen(false), 800); }}
              disabled={saving}
              style={{ width: "100%", marginTop: "1.25rem", padding: "0.85rem", backgroundColor: saving ? palette.bgSoft : palette.accent, color: saving ? palette.inkFaint : "#FFFFFF", border: "none", borderRadius: "12px", fontSize: "1rem", fontFamily: "Fraunces, serif", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
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
          onClick={() => { setError(""); setSuccess(""); setEditModalOpen(true); }}
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
              { label: "Leídos",   value: readBooks.length,    numColor: "#5C6B3D", bg: "#5C6B3D0D" },
              { label: "Leyendo",  value: readingBooks.length, numColor: "#A4493D", bg: "#C8924A0D" },
              { label: "Por leer", value: wantBooks.length,    numColor: "#1B3A4B", bg: "#1B3A4B0D" },
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
                { label: "Racha actual", value: `${streak.current_streak || 0}`, unit: "días", numColor: "#7A2E2E", bg: "#C8924A0D" },
                { label: "Mejor racha",  value: `${streak.longest_streak  || 0}`, unit: "días", numColor: "#8A5A1A", bg: palette.bgCard },
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
                backgroundColor: "#C8924A14",
                border: "1px solid #C8924A28",
                borderRadius: "12px",
                padding: "0.9rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              <Star size={20} color="#E07B1A" fill="#E07B1A" />
              <div>
                <span style={{ ...display, fontSize: "1.5rem", fontWeight: 800, color: "#8A5A1A" }}>{avgRating}</span>
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

      {/* ── Mis logros ── */}
      <div style={{ padding: "1.75rem 1.25rem 2rem", backgroundColor: palette.bgCard }}>
        <p style={{ ...ts.h2, color: palette.ink, marginBottom: "1.25rem" }}>
          Mis logros
        </p>
        <AchievementGrid unlockedAchievements={unlockedAchievements} />
      </div>

      {/* ── Mis Wrappeds ── */}
      <div style={{ padding: "1.75rem 1.25rem 2.5rem", backgroundColor: palette.bgSoft }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ ...ts.h2, color: palette.ink }}>
            Mis Wrappeds
          </p>
          <button
            onClick={() => {
              const now = new Date();
              handleGenerateWrap(now.getMonth() + 1, now.getFullYear(), "monthly");
            }}
            disabled={generatingWrap}
            style={{ background: "none", border: `1px solid ${palette.border}`, borderRadius: 8, padding: "0.3rem 0.65rem", cursor: "pointer", ...body, fontSize: "0.78rem", color: palette.inkSoft, display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            {generatingWrap ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />}
            {generatingWrap ? "Generando..." : `Ver ${MONTHS_ES[new Date().getMonth()]}`}
          </button>
        </div>

        {/* Annual wrap shortcut */}
        {(() => {
          const now = new Date();
          const year = now.getFullYear();
          const annualWrap = wraps.find(w => w.wrap_type === "annual" && w.year === year);
          return (
            <button
              onClick={() => annualWrap ? setActiveWrap(annualWrap) : handleGenerateWrap(null, year, "annual")}
              disabled={generatingWrap}
              style={{
                width: "100%", minHeight: "80px", padding: "1.1rem 1.25rem", marginBottom: "0.85rem",
                background: "linear-gradient(120deg, #6B1E2A 0%, #7A2E2E 40%, #C8924A 100%)",
                borderRadius: 14, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: "0 4px 20px rgba(107,30,42,0.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <span className="sparkle-anim">
                  <Sparkles size={20} color="#F4EDE0" />
                </span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "11px", fontWeight: 500, color: "rgba(244,237,224,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{year}</div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: "1.1rem", fontWeight: 700, fontStyle: "italic", color: "#F4EDE0" }}>Wrapped</div>
                </div>
              </div>
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", fontWeight: 700, color: "#F4EDE0" }}>
                {annualWrap ? "Ver mi Wrapped →" : "Generar →"}
              </span>
            </button>
          );
        })()}

        {/* Monthly wrap grid */}
        {wraps.filter(w => w.wrap_type === "monthly").length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem" }}>
            {wraps.filter(w => w.wrap_type === "monthly").slice(0, 6).map(w => {
              const mName = MONTHS_ES[(w.month || 1) - 1];
              const bCount = w.data?.booksRead?.length || 0;
              return (
                <button key={`${w.month}-${w.year}`} onClick={() => setActiveWrap(w)} style={{
                  backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`,
                  borderRadius: 10, padding: "0.65rem 0.5rem", cursor: "pointer",
                  textAlign: "center", transition: "box-shadow 0.15s",
                }}>
                  <div style={{ ...display, fontSize: "1.3rem", fontWeight: 900, fontStyle: "italic", color: palette.accent }}>{bCount}</div>
                  <div style={{ ...body, fontSize: "0.7rem", color: palette.inkSoft }}>{bCount === 1 ? "libro" : "libros"}</div>
                  <div style={{ ...display, fontSize: "0.72rem", color: palette.inkFaint, marginTop: "0.2rem" }}>{mName} {w.year}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ ...body, fontSize: "0.85rem", color: palette.inkFaint, fontStyle: "italic", textAlign: "center" }}>
            Genera tu primer Wrapped del mes para verlo aquí.
          </p>
        )}
      </div>

      {activeWrap && (
        <WrappedModal wrap={activeWrap} userName={user.name} onClose={() => setActiveWrap(null)} />
      )}

      {/* Cerrar sesión */}
      <div style={{ padding: "0 1.25rem 2.5rem", textAlign: "center", marginTop: "0.5rem" }}>
        <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.82rem", color: palette.inkFaint }}>
          Cerrar sesión
        </button>
      </div>

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
    async function init() {
      setLoading(true);
      const id = await getOrCreateConversation(user.id, friend.id);
      setConvId(id);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      await markConversationRead(id, user.id);
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
    init();
    return () => { if (channelRef) supabase.removeChannel(channelRef); };
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
      checkAchievements(user.id, user.name);
      const { data: saved } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: user.id, content })
        .select()
        .single();
      if (saved) setMessages((prev) => prev.map((m) => m.id === tempId ? saved : m));
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
    } catch {
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
                        backgroundColor: mine ? palette.accent : "#FFFFFF",
                        border: mine ? "none" : `1px solid ${palette.borderSoft}`,
                        color: mine ? "#F4EDE0" : palette.ink,
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
              color: text.trim() ? "#F4EDE0" : palette.inkFaint,
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

function readingStreak(books) {
  const readB = books.filter((b) => b.status === "read");
  const months = new Set(readB.map(monthKey).filter(Boolean));
  let count = 0;
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth() + 1;
  for (let i = 0; i < 120; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (!months.has(key)) break;
    count++;
    m--; if (m === 0) { m = 12; y--; }
  }
  return count;
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
  const [uFriendCount, setUFriendCount] = useState(0);
  const [fFriendCount, setFFriendCount] = useState(0);

  useEffect(() => {
    fetchBooks(user.id).then((b) => { setUserBooks(b); setLoadingUser(false); }).catch(() => setLoadingUser(false));
    supabase.from("user_streaks").select("current_streak, total_pages_read").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setUStreakRow(data));
    supabase.from("user_streaks").select("current_streak, total_pages_read").eq("user_id", friend.id).maybeSingle()
      .then(({ data }) => setFStreakRow(data));
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).then(({ count }) => setUFriendCount(count || 0));
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted")
      .or(`user_id.eq.${friend.id},friend_id.eq.${friend.id}`).then(({ count }) => setFFriendCount(count || 0));
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
  const uGenres  = new Set(userBooks.filter((b) => b.genre).map((b) => b.genre));
  const fGenres  = new Set(friendBooks.filter((b) => b.genre).map((b) => b.genre));
  const uStreak  = readingStreak(userBooks);
  const fStreak  = readingStreak(friendBooks);

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

  const U_COLOR = "#7A2E2E";
  const F_COLOR = "#1B3A4B";

  function ColHeader({ name, avatarUrl, initials, color }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `3px solid ${color}` }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "1rem" }}>{initials}</div>
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

  const secLabel = { ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.65rem" };

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
        <MetricRow label="Libros en total" uVal={userBooks.length} fVal={friendBooks.length} maxVal={Math.max(1, userBooks.length, friendBooks.length)} />
        <MetricRow label="Leídos" uVal={uRead.length} fVal={fRead.length} maxVal={Math.max(1, uRead.length, fRead.length)} />
        <MetricRow label="Leyendo ahora" uVal={uReading.length} fVal={fReading.length} maxVal={Math.max(1, uReading.length, fReading.length)} />
        <MetricRow label="Calificación promedio" uVal={uAvg} fVal={fAvg} maxVal={5} fmt={(v) => v > 0 ? `${v.toFixed(1)}★` : "—"} />
        <MetricRow label="Géneros únicos" uVal={uGenres.size} fVal={fGenres.size} maxVal={Math.max(1, uGenres.size, fGenres.size)} />
        <MetricRow label="Racha de lectura (meses)" uVal={uStreak} fVal={fStreak} maxVal={Math.max(1, uStreak, fStreak)} />
      </div>

      {/* Spider / Radar chart */}
      {(() => {
        const uPages = uStreakRow?.total_pages_read || 0;
        const fPages = fStreakRow?.total_pages_read || 0;
        const uCurStreak = uStreakRow?.current_streak || 0;
        const fCurStreak = fStreakRow?.current_streak || 0;

        const axes = [
          { name: "Leídos",      uRaw: uRead.length,  fRaw: fRead.length,  uDisp: uRead.length,          fDisp: fRead.length          },
          { name: "Páginas",     uRaw: uPages,         fRaw: fPages,         uDisp: uPages,                fDisp: fPages                },
          { name: "Racha",       uRaw: uCurStreak,     fRaw: fCurStreak,     uDisp: uCurStreak,            fDisp: fCurStreak            },
          { name: "Rating",      uRaw: uAvg * 20,      fRaw: fAvg * 20,      uDisp: uAvg.toFixed(1),       fDisp: fAvg.toFixed(1)       },
          { name: "Géneros",     uRaw: uGenres.size,   fRaw: fGenres.size,   uDisp: uGenres.size,          fDisp: fGenres.size          },
          { name: "Amigos",      uRaw: uFriendCount,   fRaw: fFriendCount,   uDisp: uFriendCount,          fDisp: fFriendCount          },
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
  const secLabel = { ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.65rem" };

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

  const trunc = (s, n = 11) => s && s.length > n ? s.slice(0, n) + "…" : s;

  if (userRead.length === 0 && friendRead.length === 0) return null;

  return (
    <div style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 14, padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Score header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <p style={{ ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.25rem" }}>Compatibilidad literaria</p>
          <p style={{ ...body, fontSize: "0.82rem", color: palette.inkSoft, lineHeight: 1.3 }}>{label}</p>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: "2.6rem", fontWeight: 800, color: palette.accent, lineHeight: 1 }}>{score}%</p>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height: 6, backgroundColor: palette.bgSoft, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: "linear-gradient(90deg, #7A2E2E, #C8924A)", borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>

      {/* Venn diagram */}
      {(uGenres.size > 0 || fGenres.size > 0) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingLeft: 4, paddingRight: 4 }}>
            <p style={{ ...body, fontSize: "0.72rem", color: "#7A2E2E", fontWeight: 600 }}>Tú</p>
            <p style={{ ...body, fontSize: "0.72rem", color: "#1B3A4B", fontWeight: 600, textAlign: "right" }}>{friendName}</p>
          </div>
          <svg viewBox="0 0 320 110" width="100%" style={{ maxWidth: 320, overflow: "visible" }}>
            <defs>
              <clipPath id="lc-left"><circle cx="120" cy="55" r="62" /></clipPath>
              <clipPath id="lc-right"><circle cx="200" cy="55" r="62" /></clipPath>
            </defs>
            <circle cx="120" cy="55" r="62" fill="#7A2E2E" fillOpacity="0.15" stroke="#7A2E2E" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx="200" cy="55" r="62" fill="#1B3A4B" fillOpacity="0.15" stroke="#1B3A4B" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx="200" cy="55" r="62" fill="#C8924A" fillOpacity="0.28" clipPath="url(#lc-left)" />
            {onlyU.slice(0, 2).map((g, i) => (
              <text key={g} x="75" y={42 + i * 16} textAnchor="middle" fontSize="9" fill="#7A2E2E" fontFamily="EB Garamond, serif" fontWeight="600">{g.length > 9 ? g.slice(0, 9) + "…" : g}</text>
            ))}
            {topCommon.slice(0, 2).map((g, i) => (
              <text key={g} x="160" y={42 + i * 16} textAnchor="middle" fontSize="9" fill="#8A5A1A" fontFamily="EB Garamond, serif" fontWeight="600">{g.length > 9 ? g.slice(0, 9) + "…" : g}</text>
            ))}
            {onlyF.slice(0, 2).map((g, i) => (
              <text key={g} x="245" y={42 + i * 16} textAnchor="middle" fontSize="9" fill="#1B3A4B" fontFamily="EB Garamond, serif" fontWeight="600">{g.length > 9 ? g.slice(0, 9) + "…" : g}</text>
            ))}
            {onlyU.length === 0 && uGenres.size === 0 && (
              <text x="75" y="57" textAnchor="middle" fontSize="8" fill="#7A2E2E99" fontFamily="EB Garamond, serif" fontStyle="italic">sin géneros</text>
            )}
            {topCommon.length === 0 && (
              <text x="160" y="57" textAnchor="middle" fontSize="8" fill="#8A5A1A99" fontFamily="EB Garamond, serif" fontStyle="italic">ninguno</text>
            )}
            {onlyF.length === 0 && fGenres.size === 0 && (
              <text x="245" y="57" textAnchor="middle" fontSize="8" fill="#1B3A4B99" fontFamily="EB Garamond, serif" fontStyle="italic">sin géneros</text>
            )}
          </svg>

          {/* Genre pills below diagram */}
          {onlyU.length > 0 && (
            <div style={{ width: "100%" }}>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginBottom: "0.3rem" }}>Solo tú:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {onlyU.map((g) => (
                  <span key={g} style={{ ...body, fontSize: "0.75rem", backgroundColor: "#F5EAEA", color: "#7A2E2E", border: "1px solid #E8C8C8", borderRadius: "20px", padding: "3px 10px" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
          {topCommon.length > 0 && (
            <div style={{ width: "100%" }}>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginBottom: "0.3rem" }}>En común:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {topCommon.map((g) => (
                  <span key={g} style={{ ...body, fontSize: "0.75rem", backgroundColor: "#FBF0E5", color: "#7A4A1A", border: "1px solid #E0C498", borderRadius: "20px", padding: "3px 10px" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
          {onlyF.length > 0 && (
            <div style={{ width: "100%" }}>
              <p style={{ ...body, fontSize: "0.68rem", color: palette.inkFaint, marginBottom: "0.3rem" }}>Solo {friendName}:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {onlyF.map((g) => (
                  <span key={g} style={{ ...body, fontSize: "0.75rem", backgroundColor: "#E5EEF3", color: "#1B3A4B", border: "1px solid #A8C4D4", borderRadius: "20px", padding: "3px 10px" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Books in common */}
      {commonBooksDisplay.length > 0 && (
        <div>
          <p style={{ ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.6rem" }}>
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

  useEffect(() => {
    (async () => {
      // Books
      const { data: booksData } = await supabase
        .from("books")
        .select("title, author, status, rating, genre, review, finished_at")
        .eq("user_id", friend.id);
      setFriendBooks(booksData || []);
      setLoading(false);

      // Achievements
      const { data: achData } = await supabase
        .from("achievements").select("achievement_key, unlocked_at").eq("user_id", friend.id);
      setFriendAchievements(achData || []);

      // Streak
      const { data: streakData } = await supabase
        .from("user_streaks").select("current_streak, longest_streak").eq("user_id", friend.id).maybeSingle();
      setFriendStreak(streakData);

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

  const secLabel = { ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.5rem" };

  async function sendRequestToFriendOfFriend(toId) {
    await supabase.from("friendships").insert({ user_id: user.id, friend_id: toId, status: "pending" });
    setSentToFriendOfFriend((prev) => new Set([...prev, toId]));
  }

  async function handleAddMainFriend() {
    await supabase.from("friendships").insert({ user_id: user.id, friend_id: friend.id, status: "pending" });
    setMainRequestSent(true);
  }

  function StatCard({ label, value, statKey, color = palette.ink }) {
    const bgMap = {
      read: "#F0F7F0", all: "#FBF6EB", rating: "#FBF0E5", reading: "#FDF5F0", want: "#F0F4F9",
    };
    const borderMap = {
      read: "#C8E0C0", all: "#DDD0BC", rating: "#E0C498", reading: "#E8D0C8", want: "#C0D0DC",
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
        <div style={{ position: "relative", height: 140, background: friend.cover_url ? "none" : "linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)", borderRadius: "1.25rem 1.25rem 0 0", overflow: "visible", flexShrink: 0 }}>
          {friend.cover_url && (
            <img src={friend.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "1.25rem 1.25rem 0 0", display: "block" }} />
          )}
          <div style={{ position: "absolute", bottom: -38, left: 20, padding: 3, borderRadius: "50%", background: "linear-gradient(135deg, #7A2E2E, #C8924A)", boxShadow: "0 4px 16px rgba(122,46,46,0.4)", border: `4px solid ${palette.bg}` }}>
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: getAvatarColor(friend.id || friendName), color: "#FFFFFF", fontFamily: "Fraunces, serif", fontSize: "1.5rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initials}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 12, backgroundColor: "rgba(42,31,26,0.5)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Name + Comparar button */}
        <div style={{ paddingTop: 48, paddingLeft: 20, paddingRight: 20, paddingBottom: "0.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
          <div>
            <p style={{ ...display, fontWeight: 700, fontSize: "1.15rem", color: palette.ink, lineHeight: 1.2 }}>{friendName}</p>
            {friend.username && <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint }}>@{friend.username}</p>}
            {friend.bio && <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, marginTop: "0.3rem", lineHeight: 1.45 }}>{friend.bio}</p>}
          </div>
          {user && (
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
                <Check size={14} color="#5C8A4A" />
                <span style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft }}>Solicitud enviada</span>
              </div>
            ) : (
              <button
                onClick={handleAddMainFriend}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", backgroundColor: palette.accent, color: "#fff", border: "none", borderRadius: "12px", padding: "0.75rem 1rem", cursor: "pointer", ...display, fontSize: "0.95rem", fontWeight: 600 }}
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
            ) : (
              <>
                {/* Stat cards (clickable) */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <StatCard label="leídos" value={readBooks.length} statKey="read" color={palette.accent} />
                  <StatCard label="en total" value={friendBooks.length} statKey="all" color={palette.ink} />
                  {avgF && <StatCard label="promedio ★" value={avgF} statKey="rating" color="#C8924A" />}
                  {readingBooks.length > 0 && <StatCard label="leyendo" value={readingBooks.length} statKey="reading" color="#1B3A4B" />}
                  {wantBooks.length > 0 && <StatCard label="por leer" value={wantBooks.length} statKey="want" color="#5C6B3D" />}
                </div>
                {/* Streak mini cards */}
                {friendStreak && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[
                      { label: "Racha actual", value: friendStreak.current_streak || 0 },
                      { label: "Mejor racha",  value: friendStreak.longest_streak  || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        flex: 1, position: "relative", overflow: "hidden",
                        background: "linear-gradient(90deg, #3D8B37 0%, #5CAE4A 100%)",
                        borderRadius: 12, padding: "0.75rem 0.75rem",
                        boxShadow: "0 4px 14px rgba(61,139,55,0.22)",
                      }}>
                        <div style={{ position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ ...display, fontSize: "2rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</div>
                            <div style={{ ...body, fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", marginTop: "0.1rem" }}>días</div>
                          </div>
                          <Flame size={20} color="rgba(255,255,255,0.7)" />
                        </div>
                        <div style={{ ...body, fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", marginTop: "0.35rem" }}>{label}</div>
                      </div>
                    ))}
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
                                <span style={{ ...body, fontSize: "0.68rem", color: "#5C8A4A" }}>✓ Amigos</span>
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
    } catch {}
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
            style={{ ...display, fontSize: "0.78rem", fontWeight: 600, padding: "0.3rem 0.75rem", backgroundColor: copied ? palette.sage : palette.accent, color: "#fff", border: "none", borderRadius: "999px", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}
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
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", padding: "0.7rem", backgroundColor: "#25D366", color: "#fff", borderRadius: "12px", textDecoration: "none", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.85rem", fontWeight: 600 }}
          >
            WhatsApp
          </a>
          <a
            href={twUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", padding: "0.7rem", backgroundColor: "#000", color: "#fff", borderRadius: "12px", textDecoration: "none", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "0.85rem", fontWeight: 600 }}
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
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 }, colors: ["#7A2E2E", "#C8924A", "#F4EDE0"] });
      logReadingSession({ userId: user.id, bookId: null, pagesRead: 1, mood: null }).catch(() => {});
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
    } catch {}
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, backgroundColor: "#F5EFE3", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.65rem 1rem",
        backgroundColor: "#F5EFE3",
        borderBottom: "1px solid rgba(42,31,26,0.1)",
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
        <span style={{ ...body, fontSize: "0.75rem", color: pct >= 95 ? "#5C6B3D" : palette.inkFaint, fontWeight: pct >= 95 ? 700 : 400, flexShrink: 0, transition: "color 0.3s" }}>
          {pct >= 95 ? "✓ Leído" : `${pct}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, backgroundColor: "rgba(42,31,26,0.08)", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: pct >= 95 ? "#5C6B3D" : palette.accent, transition: "width 0.2s, background-color 0.4s" }} />
      </div>

      {/* Story content */}
      <div ref={containerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "2rem 1.5rem 5rem", WebkitOverflowScrolling: "touch" }}>
        <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: "1.7rem", fontStyle: "italic", color: "#2A1F1A", marginBottom: "0.3rem", lineHeight: 1.25 }}>
          {cuento.titulo}
        </h1>
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.9rem", color: "#7A6A5A", marginBottom: "2.5rem" }}>
          {cuento.autor} · {cuento.duracion}
        </p>

        {cuento.texto.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
          <p key={i} style={{ fontFamily: "'EB Garamond', serif", fontSize: "18px", lineHeight: 1.85, color: "#2A1F1A", marginBottom: "1.3rem", textAlign: "justify" }}>
            {para.trim()}
          </p>
        ))}

        {finished && (
          <p style={{ ...display, fontSize: "1.1rem", fontStyle: "italic", color: "#9A8A7A", textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
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
            style={{ width: "100%", maxWidth: 480, backgroundColor: "#F5EFE3", borderRadius: "1.5rem 1.5rem 0 0", padding: "1.75rem 1.5rem 2.25rem", boxShadow: "0 -4px 40px rgba(42,31,26,0.18)", animation: "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)" }}
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
                color: addedToLibrary ? palette.inkFaint : "#fff",
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

  const ink = dark ? "#F4EDE0" : palette.ink;
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
            color: "#fff", ...display, fontSize: "1.1rem", fontWeight: 700, flexShrink: 0,
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
            backgroundColor: palette.accent, color: "#fff",
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
function FriendsView({ user, onPendingChange, onMessagesRead, unreadNotifs, onNotifsRead, isOnline = true }) {
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
  const [activityFeed, setActivityFeed] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const debounceRef = useRef(null);

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

  async function loadActivity() {
    if (friends.length === 0) return;
    setLoadingActivity(true);
    const fIds = friends.map((r) => r.friendId);

    const [{ data: posts }, { data: achs }] = await Promise.all([
      supabase.from("posts").select("id, user_id, type, action, content, created_at, book_id, pages_read, minutes_read")
        .in("user_id", fIds).order("created_at", { ascending: false }).limit(50),
      supabase.from("achievements").select("user_id, achievement_key, unlocked_at")
        .in("user_id", fIds).order("unlocked_at", { ascending: false }).limit(30),
    ]);

    // Fetch book titles for posts that have book_id
    const bookIds = [...new Set((posts || []).filter((p) => p.book_id).map((p) => p.book_id))];
    const bookMap = {};
    if (bookIds.length > 0) {
      const { data: booksData } = await supabase.from("books").select("id, title, author, rating, status").in("id", bookIds);
      (booksData || []).forEach((b) => { bookMap[b.id] = b; });
    }

    const profileMap = {};
    friends.forEach((r) => { profileMap[r.friendId] = r.profile; });

    const events = [];

    (posts || []).forEach((p) => {
      const profile = profileMap[p.user_id];
      if (!profile) return;
      const book = bookMap[p.book_id];
      let action = "", icon = "plus";
      if (p.type === "book_update" && p.action === "started") { action = `empezó a leer${book ? ` "${book.title}"` : ""}`; icon = "open"; }
      else if (p.type === "book_update" && p.action === "finished") {
        const stars = book?.rating > 0 ? " " + "★".repeat(book.rating) : "";
        action = `terminó${book ? ` "${book.title}"` : ""}${stars}`; icon = "check";
      } else if (p.type === "text") { action = "publicó en el feed"; icon = "plus"; }
      else return;
      events.push({ id: `post-${p.id}`, ts: p.created_at, profile, action, icon, profileId: p.user_id });
    });

    const achDefMap = {};
    ACHIEVEMENT_DEFS.forEach((d) => { achDefMap[d.key] = d; });
    (achs || []).forEach((a) => {
      const profile = profileMap[a.user_id];
      const def = achDefMap[a.achievement_key];
      if (!profile || !def) return;
      events.push({ id: `ach-${a.user_id}-${a.achievement_key}`, ts: a.unlocked_at, profile, action: `desbloqueó "${def.name}"`, icon: "award", profileId: a.user_id });
    });

    events.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
    setActivityFeed(events.slice(0, 50));
    setLoadingActivity(false);
  }

  useEffect(() => {
    if (subtab === "actividad" && friends.length > 0 && activityFeed.length === 0) {
      loadActivity();
    }
  }, [subtab, friends.length]);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("users")
        .select("id, nombre, username, bio, avatar_url, cover_url")
        .or(`username.ilike.%${val.trim()}%,nombre.ilike.%${val.trim()}%`)
        .neq("id", user.id)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
  }

  async function sendRequest(toId) {
    setActionLoading((p) => ({ ...p, [toId]: true }));
    await supabase.from("friendships").insert({ user_id: user.id, friend_id: toId, status: "pending" });
    setSentRequestIds((prev) => new Set([...prev, toId]));
    setActionLoading((p) => ({ ...p, [toId]: false }));
    checkAchievements(user.id, user.name);
  }

  async function acceptRequest(row) {
    setActionLoading((p) => ({ ...p, [row.id]: true }));
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", row.id);
    setActionLoading((p) => ({ ...p, [row.id]: false }));
    await loadFriends();
    checkAchievements(user.id, user.name);
  }

  async function rejectRequest(row) {
    setActionLoading((p) => ({ ...p, [row.id]: true }));
    await supabase.from("friendships").delete().eq("id", row.id);
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
          color: "#FFFFFF",
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
    border: `1.5px solid #D4C8BC`,
    borderRadius: "10px",
    fontSize: "1rem",
    color: palette.ink,
    outline: "none",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: palette.bgCard,
    border: `1px solid ${palette.borderSoft}`,
    borderRadius: 8,
    padding: "0.65rem 0.85rem",
  };

  const sectionLabel = {
    ...display,
    fontSize: "0.78rem",
    color: "#8A7B6E",
    fontWeight: 500,
    marginBottom: "0.6rem",
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
    { id: "actividad", label: "Actividad" },
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
                        style={{ ...display, fontSize: "0.76rem", padding: "0.3rem 0.7rem", backgroundColor: palette.sage, color: "#fff", borderRadius: "20px", fontWeight: 500, flexShrink: 0, border: "none", cursor: "pointer" }}>
                        Aceptar
                      </button>
                    ) : (
                      <button onClick={() => sendRequest(u.id)} disabled={!!actionLoading[u.id]}
                        style={{ ...display, fontSize: "0.76rem", padding: "0.3rem 0.75rem", backgroundColor: palette.accent, color: "#fff", borderRadius: "20px", fontWeight: 500, opacity: actionLoading[u.id] ? 0.6 : 1, flexShrink: 0, border: "none", cursor: "pointer" }}>
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
                  <p style={{ ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.6rem" }}>Recibidas</p>
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
                            style={{ ...display, fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.75rem", backgroundColor: "#5C6B3D", color: "#fff", borderRadius: "20px", border: "none", cursor: "pointer", opacity: actionLoading[row.id] ? 0.6 : 1 }}>
                            Aceptar
                          </button>
                          <button onClick={() => rejectRequest(row)} disabled={!!actionLoading[row.id]}
                            style={{ ...display, fontSize: "0.78rem", fontWeight: 500, padding: "0.35rem 0.75rem", backgroundColor: "transparent", color: "#9B2C2C", borderRadius: "20px", border: "1.5px solid #9B2C2C", cursor: "pointer", opacity: actionLoading[row.id] ? 0.6 : 1 }}>
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
                  <p style={{ ...display, fontSize: "0.78rem", color: "#8A7B6E", fontWeight: 500, marginBottom: "0.6rem" }}>Enviadas</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {sentPending.map((row) => (
                      <div key={row.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "12px", padding: "0.75rem" }}>
                        <FriendAvatar profile={row.profile} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink }}>{row.profile.nombre}</p>
                          {row.profile.username && <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint }}>@{row.profile.username}</p>}
                        </div>
                        <span style={{ ...body, fontSize: "0.75rem", color: "#8A5A1A", backgroundColor: "#FBF0E5", border: "1px solid #E0C498", borderRadius: "20px", padding: "3px 10px", flexShrink: 0 }}>Pendiente</span>
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
                      <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#1B3A4B", color: "#fff", fontSize: "0.65rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ── ACTIVIDAD ── */}
      {subtab === "actividad" && (
        loadingActivity ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" color={palette.inkFaint} /></div>
        ) : activityFeed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <BarChart3 size={32} color={palette.border} style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic" }}>
              {friends.length === 0 ? "Agrega amigos para ver su actividad." : "Aún no hay actividad reciente."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {activityFeed.map((ev) => {
              const IconComp = ev.icon === "open" ? BookOpen : ev.icon === "check" ? BookCheck : ev.icon === "award" ? Award : Plus;
              const iconColor = ev.icon === "open" ? palette.amber : ev.icon === "check" ? palette.sage : ev.icon === "award" ? "#8A5A1A" : palette.slate;
              const fp = { ...ev.profile, name: ev.profile.nombre };
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedFriend(fp)}
                  className="hover-bg-soft"
                  style={{ display: "flex", alignItems: "center", gap: "0.65rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: "10px", padding: "0.65rem 0.75rem", textAlign: "left", cursor: "pointer", width: "100%" }}
                >
                  <FriendAvatar profile={ev.profile} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...body, fontSize: "0.85rem", color: palette.ink, lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 600 }}>{ev.profile.nombre}</span>{" "}
                      <span style={{ color: palette.inkSoft }}>{ev.action}</span>
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem", flexShrink: 0 }}>
                    <IconComp size={14} color={iconColor} />
                    <span style={{ ...body, fontSize: "0.65rem", color: palette.inkFaint }}>{timeAgo(ev.ts)}</span>
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

function NotificationsPanel({ user, onNotifsRead }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  async function loadNotifs() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, read, created_at, post_id, comment_id, actor_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!data || data.length === 0) { setNotifs([]); setLoading(false); return; }
      const actorIds = [...new Set(data.map(n => n.actor_id))];
      const { data: actors } = await supabase.from("users").select("id, nombre, avatar_url").in("id", actorIds);
      const actorMap = {};
      (actors || []).forEach(a => { actorMap[a.id] = a; });
      const postIds = data.filter(n => n.post_id).map(n => n.post_id);
      const commentIds = data.filter(n => n.comment_id).map(n => n.comment_id);
      const [postsRes, commentsRes] = await Promise.all([
        postIds.length > 0 ? supabase.from("posts").select("id, content, type").in("id", postIds) : { data: [] },
        commentIds.length > 0 ? supabase.from("comments").select("id, content").in("id", commentIds) : { data: [] },
      ]);
      const postMap = {};
      (postsRes.data || []).forEach(p => { postMap[p.id] = p; });
      const commentMap = {};
      (commentsRes.data || []).forEach(c => { commentMap[c.id] = c; });
      setNotifs(data.map(n => ({ ...n, actor: actorMap[n.actor_id] || { nombre: "Usuario", avatar_url: null }, post: n.post_id ? postMap[n.post_id] : null, comment: n.comment_id ? commentMap[n.comment_id] : null })));
    } catch {}
    setLoading(false);
  }

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onNotifsRead?.();
  }

  async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    onNotifsRead?.();
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" color={palette.inkFaint} /></div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <p style={{ ...display, fontWeight: 700, fontSize: "1.05rem", color: palette.ink }}>
          Notificaciones{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </p>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, background: "none", border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "0.25rem 0.75rem", cursor: "pointer" }}>
            Marcar todo leído
          </button>
        )}
      </div>
      {notifs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <Bell size={32} color={palette.border} style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ ...body, color: palette.inkFaint, fontStyle: "italic" }}>No tienes notificaciones aún.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {notifs.map((n) => {
            const preview = n.type === "like_comment"
              ? n.comment?.content
              : (n.post?.type === "achievement" ? "una publicación de logro" : n.post?.content);
            const previewText = (preview || "").slice(0, 60) + ((preview || "").length > 60 ? "…" : "");
            const label = n.type === "like_post" ? "le dio like a tu publicación" : "le dio like a tu comentario";
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "0.65rem",
                  backgroundColor: n.read ? "transparent" : `${palette.amber}18`,
                  borderTop: "none", borderLeft: "none", borderRight: "none",
                  borderBottom: `1px solid ${palette.borderSoft}`,
                  padding: "0.75rem 0.25rem",
                  textAlign: "left", cursor: "pointer", width: "100%",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = palette.bgSoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = e.currentTarget.dataset.read === "1" ? "transparent" : `${palette.amber}18`; }}
                data-read={n.read ? "1" : "0"}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <FriendAvatar profile={{ ...n.actor, nombre: n.actor?.nombre || 'Usuario' }} size={34} />
                  <span style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: "#E74C3C", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Heart size={8} color="#fff" fill="#fff" />
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...body, fontSize: "0.85rem", color: palette.ink, lineHeight: 1.4, marginBottom: "0.15rem" }}>
                    <span style={{ fontWeight: 700 }}>{n.actor?.nombre || 'Usuario'}</span>{" "}
                    <span style={{ color: palette.inkSoft }}>{label}</span>
                  </p>
                  {previewText && (
                    <p style={{ ...body, fontSize: "0.77rem", color: palette.inkFaint, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      "{previewText}"
                    </p>
                  )}
                </div>
                <span style={{ ...body, fontSize: "0.72rem", color: palette.inkFaint, flexShrink: 0, paddingTop: "0.15rem" }}>{timeAgo(n.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}
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
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "65vh", backgroundColor: "#F5EFE3", borderRadius: "20px 20px 0 0", zIndex: 1001, display: "flex", flexDirection: "column", animation: isClosing ? "slideDown 250ms cubic-bezier(0.4, 0, 1, 1) forwards" : "slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 40, height: 4, backgroundColor: "#D4C9B5", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />
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
                  style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 8px", backgroundColor: notif.read ? "transparent" : "#FDF8F3", borderRadius: 10, marginBottom: 4, cursor: "pointer" }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#6B4C3B", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 600, flexShrink: 0, overflow: "hidden" }}>
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
                    <span style={{ ...display, fontSize: "0.68rem", fontWeight: 700, color: available ? "#2d7a4f" : "#b83232", letterSpacing: "0.02em" }}>
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
        fontSize: size * 0.38, fontWeight: 700, color: "white",
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
          <p style={{ ...body, fontSize: "0.82rem", color: "#dc2626", marginBottom: "0.75rem" }}>⚠️ {publishError}</p>
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
    if (!liked) { setAnimating(true); setTimeout(() => setAnimating(false), 320); }
    onToggle(postId);
  }
  return (
    <button onClick={handleClick} style={{ display: "flex", alignItems: "center", gap: "0.28rem", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
      <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
        <Heart
          size={size}
          color="#8A7B6E"
          fill="none"
          strokeWidth={1.8}
          style={{ position: "absolute", opacity: liked ? 0 : 1, transition: "opacity 120ms ease" }}
        />
        <Heart
          size={size}
          color="#E74C3C"
          fill="#E74C3C"
          strokeWidth={0}
          className={animating ? "like-bounce" : ""}
          style={{ position: "absolute", opacity: liked ? 1 : 0, transition: "opacity 120ms ease" }}
        />
      </span>
      {count > 0 && <span style={{ fontSize: size <= 14 ? "0.72rem" : "0.82rem", color: "#8A7B6E", fontFamily: "'EB Garamond', serif", lineHeight: 1 }}>{count}</span>}
    </button>
  );
}

function PostComments({ postId, user, onCountChange }) {
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
      } catch {}
    }
  }

  async function toggleCommentLike(commentId) {
    const alreadyLiked = !!commentLiked[commentId];
    setCommentLiked(prev => ({ ...prev, [commentId]: !alreadyLiked }));
    setCommentLikeCounts(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) + (alreadyLiked ? -1 : 1)) }));
    if (alreadyLiked) {
      supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id).then();
    } else {
      supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id }).then();
      const comment = comments.find(c => c.id === commentId);
      if (comment && comment.user_id !== user.id) {
        supabase.from("notifications").insert({ user_id: comment.user_id, actor_id: user.id, type: "like_comment", comment_id: commentId }).then();
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
  if (!book) return null;
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

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

  const PHASES = [
    { g0: "#E8A82B", g1: "#F4C430", rgb: "232,168,43",  border: "#E8A82B" },
    { g0: "#E8A82B", g1: "#F4C430", rgb: "232,168,43",  border: "#E8A82B" },
    { g0: "#5CAE4A", g1: "#B8D44A", rgb: "92,174,74",   border: "#5CAE4A" },
    { g0: "#C84B8A", g1: "#7A2E5E", rgb: "200,75,138",  border: "#C84B8A" },
  ];
  const cfg = PHASES[phase];

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

  // Confeti al alcanzar meta (una sola vez)
  const prevGoalRef = useRef(false);
  useEffect(() => {
    if (goalReached && !prevGoalRef.current && typeof confetti === "function") {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.35 }, colors: ["#FFD700", "#FFA500", "#fff", cfg.g0] });
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
              color="#fff"
              strokeWidth={phase >= 2 ? 1.5 : 2}
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.28))", display: "block" }}
            />
            {phase === 3 && (
              <>
                <span className="sparkle-orbit" style={{ position: "absolute", top: -10, right: -8, fontSize: 13, color: "#FFD700", lineHeight: 1 }}>✦</span>
                <span className="sparkle-orbit" style={{ position: "absolute", bottom: -4, left: -10, fontSize: 10, color: "#FFD700", lineHeight: 1 }}>✦</span>
                <span className="sparkle-orbit" style={{ position: "absolute", top: 2, left: -12, fontSize: 9, color: "#FFE066", lineHeight: 1, opacity: 0.8 }}>✦</span>
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
                  color: "#fff", lineHeight: 0.9,
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
            color: "#fff",
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
            background: goalReached ? "#FFD700" : "rgba(255,255,255,0.62)",
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
              style={{ ...body, flex: 1, fontSize: "0.9rem", fontWeight: 700, backgroundColor: "#3A8FD6", color: "#fff", border: "none", borderRadius: "10px", padding: "0.75rem", cursor: "pointer" }}
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

function ReadingLogModal({ user, onClose, onSuccess, onGoToAdd, pagesLoggedToday = 0 }) {
  const [isClosing, setIsClosing] = useState(false);
  function handleClose() { if (isClosing) return; setIsClosing(true); setTimeout(() => onClose(), 250); }
  const [step, setStep] = useState(1);
  const [readingBooks, setReadingBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [pages, setPages] = useState("");
  const [saving, setSaving] = useState(false);

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
    try {
      await logReadingSession({
        userId: user.id,
        bookId: selectedBook.id,
        pagesRead: parseInt(pages) || null,
        mood,
      });
      checkAchievements(user.id, user.name);
      onSuccess?.({ book: selectedBook, pages: parseInt(pages) || 0 });
    } catch (err) { console.error("Error registrando sesión:", err); }
    finally { setSaving(false); }
  }

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", backgroundColor: "#F5EFE3", zIndex: 9999, display: "flex", flexDirection: "column", overflowY: "auto", animation: isClosing ? "backdropOut 250ms ease-out forwards" : "backdropIn 200ms ease-out" }}
    >
      <div
        style={{
          backgroundColor: "#F5EFE3",
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
                  style={{ ...display, color: "#FFFFFF", backgroundColor: palette.accent, border: "none", borderRadius: "12px", padding: "0.75rem 1.5rem", minHeight: "48px", cursor: "pointer", fontWeight: 600 }}
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
              <div style={{ backgroundColor: "#C8924A14", border: "1px solid #C8924A30", borderRadius: 10, padding: "0.55rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
          </>
        )}
      </div>
    </div>
  );
}

function FiveMinutesModal({ books, user, pagesLoggedToday, onClose, onGoToLog }) {
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
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100vh", backgroundColor: "#F5EFE3", zIndex: 9999, display: "flex", flexDirection: "column", overflowY: "auto", animation: isClosing ? "fadeOut 200ms ease-out forwards" : undefined }}>

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
                      <div style={{ width: 48, height: 70, borderRadius: 4, backgroundColor: palette.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
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
                  <div style={{ ...coverStyle, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: palette.accent, color: "#fff", fontFamily: "Fraunces, serif", fontSize: 36, fontWeight: 700 }}>
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
                  style={{ borderRadius: 20, padding: "0.6rem 1.25rem", border: `1.5px solid ${minutes === m ? palette.accent : palette.border}`, backgroundColor: minutes === m ? palette.accent : "transparent", color: minutes === m ? "#fff" : palette.inkSoft, ...display, fontSize: "0.92rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
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
              style={{ width: "100%", borderRadius: 14, padding: "1rem", backgroundColor: palette.accent, color: "#fff", border: "none", ...display, fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}
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
            style={{ width: "100%", borderRadius: 14, padding: "1rem", backgroundColor: palette.accent, color: "#fff", border: "none", ...display, fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}
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
    console.log("Intentando crear post:", {
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
        <div style={{ backgroundColor: palette.bg, border: `1px solid #4CAF5040`, borderLeft: `4px solid #4CAF50`, borderRadius: 12, padding: "14px 14px 12px", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {coverSrc ? (
              <img src={coverSrc} alt="" style={{ width: 44, height: 64, objectFit: "cover", borderRadius: 5, flexShrink: 0, boxShadow: "0 2px 8px rgba(42,31,26,0.15)" }} />
            ) : (
              <BookCoverPlaceholder title={book.title} author={book.author} width={44} height={64} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...body, fontSize: "0.72rem", color: "#4CAF50", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>Sesión de lectura</p>
              <p style={{ ...display, fontSize: "0.95rem", fontWeight: 700, color: palette.ink, marginBottom: "0.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, fontStyle: "italic", marginBottom: "0.65rem" }}>{book.author}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ backgroundColor: "#4CAF5018", border: "1px solid #4CAF5035", borderRadius: 20, padding: "2px 10px", ...body, fontSize: "0.78rem", color: "#2E7D32", fontWeight: 600 }}>
                  {pages} {pages === 1 ? "página" : "páginas"}
                </span>
                {minutes && (
                  <span style={{ backgroundColor: "#1B3A4B18", border: "1px solid #1B3A4B30", borderRadius: 20, padding: "2px 10px", ...body, fontSize: "0.78rem", color: "#1B3A4B", fontWeight: 600 }}>
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
          style={{ ...display, width: "100%", padding: "0.9rem", borderRadius: 14, fontSize: "1rem", fontWeight: 700, backgroundColor: shared ? "#2E7D32" : "#4CAF50", color: "#fff", border: "none", cursor: (sharing || shared) ? "default" : "pointer", opacity: sharing ? 0.7 : 1, marginBottom: "0.6rem", transition: "background 0.2s" }}
        >
          {shared ? "¡Publicado! ✓" : sharing ? "Compartiendo…" : "Compartir en mi feed"}
        </button>
        {shareError && (
          <p style={{ ...body, fontSize: "0.82rem", color: "#C62828", backgroundColor: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: "0.6rem", lineHeight: 1.4 }}>
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
    background: "linear-gradient(90deg, #E8E0D5 25%, #DDD5C8 50%, #E8E0D5 75%)",
    backgroundSize: "400px 100%",
    animation: "shimmer 1.5s infinite",
  };
  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ backgroundColor: "#F0EBE3", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
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

const GENRE_CATEGORIES = [
  { key: "ciencia-ficcion", label: "Ciencia Ficción", emoji: "🚀", keywords: ["ciencia ficcion", "ciencia ficción", "distopia", "distopía", "sci-fi", "ficción científica", "ciencia-ficción"] },
  { key: "terror", label: "Terror", emoji: "👁️", keywords: ["terror", "horror", "suspenso", "thriller psicologico", "thriller psicológico"] },
  { key: "romance", label: "Romance", emoji: "💙", keywords: ["romance", "romantico", "romántico", "drama"] },
  { key: "filosofia", label: "Filosofía", emoji: "🌀", keywords: ["filosofia", "filosofía", "reflexion", "reflexión", "ensayo"] },
  { key: "aventura", label: "Aventura", emoji: "⚔️", keywords: ["aventura", "accion", "acción", "thriller"] },
  { key: "negocios", label: "Negocios", emoji: "💡", keywords: ["negocios", "desarrollo personal", "autoayuda", "emprendimiento", "finanzas"] },
];

const EDITORIAL_STORIES = {
  "ciencia-ficcion": [
    { id: "sc1", title: "La pata de mono", author: "W.W. Jacobs", url: "https://ciudadseva.com/texto/la-pata-de-mono/", minutes: 12, genre: "Distopía", desc: "Cuidado con lo que deseas." },
    { id: "sc2", title: "El ruido del trueno", author: "Ray Bradbury", url: "https://ciudadseva.com/texto/un-sonido-de-trueno/", minutes: 10, genre: "Ciencia Ficción", desc: "Un viaje en el tiempo y una decisión que lo cambia todo." },
    { id: "sc3", title: "El hombre ilustrado (prólogo)", author: "Ray Bradbury", url: "https://ciudadseva.com/texto/el-hombre-ilustrado/", minutes: 8, genre: "Ciencia Ficción", desc: "Tatuajes que cobran vida cuando anochece." },
  ],
  "terror": [
    { id: "te1", title: "No tengo boca y debo gritar", author: "Harlan Ellison", url: "https://ciudadseva.com/texto/no-tengo-boca-y-debo-gritar/", minutes: 20, genre: "Terror", desc: "El cuento de ciencia ficción más perturbador jamás escrito." },
    { id: "te2", title: "El almohadón de plumas", author: "Horacio Quiroga", url: "https://ciudadseva.com/texto/el-almohadon-de-plumas/", minutes: 8, genre: "Terror", desc: "Una historia de amor con un secreto perturbador." },
    { id: "te3", title: "La señal", author: "Amparo Dávila", url: "https://ciudadseva.com/texto/la-senal/", minutes: 10, genre: "Terror", desc: "La autora mexicana del terror que deberías conocer." },
  ],
  "romance": [
    { id: "ro1", title: "La noche de los feos", author: "Mario Benedetti", url: "https://ciudadseva.com/texto/la-noche-de-los-feos/", minutes: 5, genre: "Romance", desc: "El cuento de amor más honesto que vas a leer." },
    { id: "ro2", title: "Continuidad de los parques", author: "Julio Cortázar", url: "https://ciudadseva.com/texto/continuidad-de-los-parques/", minutes: 3, genre: "Drama", desc: "El lector que no sabe que es el personaje." },
    { id: "ro3", title: "El otro círculo", author: "Mario Benedetti", url: "https://ciudadseva.com/texto/el-otro-circulo/", minutes: 8, genre: "Drama", desc: "Algunas decisiones no tienen vuelta atrás." },
  ],
  "filosofia": [
    { id: "fi1", title: "La noche boca arriba", author: "Julio Cortázar", url: "https://ciudadseva.com/texto/la-noche-boca-arriba/", minutes: 15, genre: "Filosofía", desc: "¿Cuál de las dos realidades es el sueño?" },
    { id: "fi2", title: "Las babas del diablo", author: "Julio Cortázar", url: "https://ciudadseva.com/texto/las-babas-del-diablo/", minutes: 15, genre: "Filosofía", desc: "Una foto que esconde algo que nadie debería ver." },
    { id: "fi3", title: "El guardagujas", author: "Juan José Arreola", url: "https://ciudadseva.com/texto/el-guardagujas/", minutes: 10, genre: "Reflexión", desc: "El mexicano que reinventó el cuento latinoamericano." },
  ],
  "aventura": [
    { id: "av1", title: "Los asesinos", author: "Ernest Hemingway", url: "https://ciudadseva.com/texto/los-asesinos/", minutes: 10, genre: "Aventura", desc: "Puro diálogo. Pura tensión. Como una película." },
    { id: "av2", title: "En el bosque", author: "Ryūnosuke Akutagawa", url: "https://ciudadseva.com/texto/en-el-bosque/", minutes: 12, genre: "Aventura", desc: "La misma historia contada por 7 personas distintas." },
    { id: "av3", title: "El Sur", author: "Jorge Luis Borges", url: "https://ciudadseva.com/texto/el-sur/", minutes: 15, genre: "Aventura", desc: "Un hombre que viaja al pasado sin saberlo." },
  ],
  "negocios": [
    { id: "ne1", title: "Hábitos Atómicos (cap. 1)", author: "James Clear", url: "https://www.amazon.com.mx/Habitos-atomicos/dp/6075694536", minutes: 10, genre: "Negocios", desc: "El libro de no-ficción más vendido de los últimos años." },
    { id: "ne2", title: "El hombre más rico de Babilonia (cap. 1)", author: "George Clason", url: "https://ciudadseva.com/texto/el-hombre-mas-rico-de-babilonia/", minutes: 12, genre: "Negocios", desc: "Finanzas personales contadas como fábula." },
    { id: "ne3", title: "El monje que vendió su Ferrari (cap. 1)", author: "Robin Sharma", url: "https://www.amazon.com.mx/monje-vendio-su-Ferrari/dp/8401379", minutes: 10, genre: "Negocios", desc: "El libro que cambió la vida de millones." },
  ],
};

function getEditorialStories(books) {
  const userGenres = [...new Set(books.map(b => (b.genre || "").toLowerCase()).filter(Boolean))];
  const matchedKeys = new Set();
  for (const cat of GENRE_CATEGORIES) {
    if (userGenres.some(g => cat.keywords.some(k => g.includes(k) || k.includes(g)))) {
      matchedKeys.add(cat.key);
    }
  }
  const defaultKeys = ["ciencia-ficcion", "romance", "filosofia"];
  const keys = matchedKeys.size > 0 ? [...matchedKeys] : defaultKeys;
  return keys.flatMap(k => {
    const cat = GENRE_CATEGORIES.find(c => c.key === k);
    return (EDITORIAL_STORIES[k] || []).map(s => ({ ...s, catEmoji: cat?.emoji || "📖" }));
  });
}

const CUENTO_TITLE_MAP = Object.fromEntries(
  CUENTOS.map(c => [c.titulo.toLowerCase(), c])
);

function FeedEditorialContent({ books, onAdd, onInvite, onRead }) {
  const [addedIds, setAddedIds] = useState(new Set());
  const stories = getEditorialStories(books);

  function isInLibrary(story) {
    return addedIds.has(story.id) || books.some(b => b.title.toLowerCase() === story.title.toLowerCase());
  }

  function getCuento(story) {
    return CUENTO_TITLE_MAP[story.title.toLowerCase()] || null;
  }

  function handleAdd(story) {
    if (isInLibrary(story)) return;
    setAddedIds(prev => new Set([...prev, story.id]));
    onAdd({
      id: crypto.randomUUID(),
      title: story.title,
      author: story.author,
      status: "reading",
      genre: story.genre,
      summary: "",
      rating: 0,
      review: "",
      coverUrl: null,
      moodTags: [],
      addedAt: Date.now(),
      finishedAt: null,
    });
  }

  const timeLabel = (s) => s.time ? s.time : `~${s.minutes} min`;

  return (
    <div>
      <p style={{ ...display, fontSize: "1.05rem", color: palette.ink, marginBottom: "0.9rem", fontWeight: 600 }}>
        Para empezar a leer hoy
      </p>
      <div style={{ display: "flex", gap: "0.85rem", overflowX: "auto", paddingBottom: "0.75rem", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {stories.map((story) => {
          const added = isInLibrary(story);
          return (
            <div key={story.id} style={{
              flexShrink: 0, width: "280px",
              backgroundColor: palette.bgCard,
              border: `1px solid ${palette.border}`,
              borderRadius: "14px",
              padding: "1.1rem",
              display: "flex", flexDirection: "column", gap: "0.4rem",
            }}>
              <span style={{ fontSize: "1.6rem", lineHeight: 1, marginBottom: "0.1rem" }}>{story.catEmoji}</span>
              <p style={{ ...display, fontSize: "1rem", color: palette.ink, fontWeight: 700, lineHeight: 1.25, margin: 0 }}>
                {story.title}
              </p>
              <p style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: "0.85rem", color: palette.inkSoft, margin: 0 }}>
                {story.author}
              </p>
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, margin: 0, lineHeight: 1.4 }}>
                {story.desc}
              </p>
              <span style={{
                ...body, fontSize: "0.72rem", fontWeight: 600,
                backgroundColor: palette.bgSoft, color: palette.inkSoft,
                borderRadius: "20px", padding: "0.2rem 0.6rem",
                alignSelf: "flex-start", marginTop: "0.15rem",
              }}>
                {timeLabel(story)}
              </span>
              <div style={{ display: "flex", gap: "0.45rem", marginTop: "auto", paddingTop: "0.65rem" }}>
                <button
                  onClick={() => {
                    const cuento = getCuento(story);
                    if (cuento && onRead) {
                      onRead(cuento);
                    } else {
                      window.open(story.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={{ ...body, flex: 1, fontSize: "0.8rem", fontWeight: 700, backgroundColor: palette.ink, color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                >
                  {getCuento(story) ? "Leer en Folio →" : "Leer ahora →"}
                </button>
                <button
                  onClick={() => handleAdd(story)}
                  disabled={added}
                  style={{ ...body, flex: 1, fontSize: "0.78rem", fontWeight: 600, backgroundColor: "transparent", color: added ? palette.inkFaint : palette.ink, border: `1px solid ${added ? palette.border : palette.ink}`, borderRadius: "8px", padding: "0.5rem 0", cursor: added ? "default" : "pointer", transition: "color 150ms, border-color 150ms" }}
                >
                  {added ? "✓ Agregado" : "+ Biblioteca"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: "1.1rem",
        backgroundColor: palette.bgCard,
        border: `1px solid ${palette.border}`,
        borderRadius: "14px",
        padding: "1.1rem 1.25rem",
      }}>
        <p style={{ ...display, fontSize: "1rem", color: palette.ink, margin: "0 0 0.2rem" }}>
          Invita a un amigo y lean juntos
        </p>
        <p style={{ ...body, fontSize: "0.83rem", color: palette.inkFaint, margin: "0 0 0.85rem" }}>
          Comparte tu link personal de Folio
        </p>
        <button
          onClick={onInvite}
          style={{ ...body, fontSize: "0.85rem", fontWeight: 700, backgroundColor: palette.ink, color: "#fff", border: "none", borderRadius: "8px", padding: "0.55rem 1.25rem", cursor: "pointer" }}
        >
          Invitar amigo
        </button>
      </div>
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
  const [hasFriends, setHasFriends] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

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
    console.log('feedState:', feedState);
  }, [feedState]);

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
    setTimeout(() => {
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
  }, [pendingNavigation]);

  async function loadStreakInfo() {
    const { streak: s, hasLoggedToday: logged, pagesLoggedToday: pages } = await fetchStreakData(user.id);
    // Monthly freeze reset
    if (s) {
      const currentMonth = new Date().getMonth() + 1;
      const needsReset = s.last_freeze_reset_month !== currentMonth && (s.streak_freezes_remaining ?? 1) < 1;
      if (needsReset) {
        await supabase.from("user_streaks").update({ streak_freezes_remaining: 1, last_freeze_reset_month: currentMonth }).eq("user_id", user.id);
        s.streak_freezes_remaining = 1;
        s.last_freeze_reset_month = currentMonth;
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
    } catch {}
  }

  async function applyFreeze() {
    const today = localDateStr();
    const currentMonth = new Date().getMonth() + 1;
    await supabase.from("user_streaks").update({
      streak_freeze_used_at: today,
      streak_freezes_remaining: 0,
      last_freeze_reset_month: currentMonth,
    }).eq("user_id", user.id);
    setStreak(prev => prev ? { ...prev, streak_freeze_used_at: today, streak_freezes_remaining: 0, last_freeze_reset_month: currentMonth } : prev);
  }

  function scheduleNotifSW() {
    navigator.serviceWorker?.ready.then(reg => reg.active?.postMessage({ type: 'FOLIO_SCHEDULE_NOTIF' }));
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
      if (!fs || fs.length === 0) { console.log("[friendsReading] no friendships"); setHasFriends(false); return; }
      setHasFriends(true);
      const friendIds = [...new Set(fs.map(f => f.user_id === user.id ? f.friend_id : f.user_id))];
      console.log("[friendsReading] friendIds:", friendIds);
      const [{ data: rbooks, error: bErr }, { data: profiles }] = await Promise.all([
        supabase.from("books").select("id, title, author, cover_url, user_id").in("user_id", friendIds).eq("status", "reading").limit(8),
        supabase.from("users").select("id, nombre, avatar_url").in("id", friendIds),
      ]);
      if (bErr) console.error("[friendsReading] books error:", bErr);
      console.log("[friendsReading] rbooks:", rbooks?.length, "profiles:", profiles?.length);
      const pm = {};
      (profiles || []).forEach(p => { pm[p.id] = p; });
      const items = (rbooks || []).filter(b => pm[b.user_id]).map(b => ({ book: b, friend: pm[b.user_id] }));
      console.log("[friendsReading] items:", items.length);
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
    if (alreadyLiked) {
      supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id).then();
    } else {
      supabase.from("post_likes").insert({ post_id: postId, user_id: user.id }).then();
      const post = posts.find(p => p.id === postId);
      if (post && post.user_id !== user.id) {
        supabase.from("notifications").insert({ user_id: post.user_id, actor_id: user.id, type: "like_post", post_id: postId }).then();
      }
    }
  }

  function handleDoubleTap(postId) {
    const now = Date.now();
    const last = lastTapRef.current[postId] || 0;
    if (now - last < 350) {
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
    try {
      await deleteFeedPost(postId, user.id);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) { console.error("Error eliminando post:", err); }
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
  const s = streak || 0;
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
              style={{ ...body, fontSize: "0.82rem", fontWeight: 700, backgroundColor: palette.ink, color: "#fff", border: "none", borderRadius: "8px", padding: "0.45rem 1rem", cursor: "pointer" }}
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
                      <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: getAvatarColor(friend.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>
                        {(friend.nombre || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                    <div className="pulse-dot" style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4CAF50", border: "2px solid white" }} />
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
        const { rect, book, friend } = openPopover;
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
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", backgroundColor: palette.ink, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            )}
            {postError && (
              <p style={{ ...body, fontSize: "0.82rem", color: "#dc2626", marginBottom: "0.5rem" }}>⚠️ {postError}</p>
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
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1rem", color: "#991b1b", ...body, fontSize: "0.88rem" }}>
          <p style={{ marginBottom: "0.75rem" }}>⚠️ {feedError || "No se pudo cargar el feed."}</p>
          <button
            onClick={() => { setFeedState('loading'); loadFeed(); }}
            style={{ backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 1.25rem", ...body, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
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
          {posts.forEach(p => { if (p.type === 'reading_session') { console.log('READING SESSION POST COMPLETO:', JSON.stringify(p)); } }) || null}
          {posts.map((post) => {
            const commentsOpen = openComments.has(post.id);
            const isFinished = post.type === "book_update" && post.action === "finished";
            const isStarted = post.type === "book_update" && post.action === "started";
            // Detect achievement posts: new type OR legacy text with emoji pattern
            const isAchievement = post.type === "achievement" || (post.type === "text" && post.content?.includes("¡Logro desbloqueado!"));
            const achDef = isAchievement ? ACHIEVEMENT_DEFS.find(a => post.content?.includes(`"${a.name}"`)) : null;
            const AchIcon = achDef ? (ACHIEVEMENT_ICON_MAP[achDef.key] || Award) : Award;

            if (isAchievement) {
              return (
                <div key={post.id} id={`post-${post.id}`} style={{
                  position: "relative", overflow: "hidden",
                  background: "linear-gradient(135deg, #F5EFE3 0%, #FDF6E8 100%)",
                  border: "1px solid #E8D5A8",
                  borderRadius: "14px",
                  padding: "18px 16px 14px",
                  boxShadow: highlightedPost === post.id ? "0 2px 10px rgba(200,146,74,0.13), 0 0 0 2px #7A2E2E" : "0 2px 10px rgba(200,146,74,0.13)",
                  transition: "box-shadow 200ms ease",
                }}>
                  {/* Sparkles decorativos */}
                  <span style={{ position: "absolute", top: 10, right: 18, fontSize: 11, opacity: 0.3, color: "#C8924A", pointerEvents: "none" }}>✦</span>
                  <span style={{ position: "absolute", top: 22, right: 36, fontSize: 8, opacity: 0.25, color: "#C8924A", pointerEvents: "none" }}>✦</span>
                  <span style={{ position: "absolute", bottom: 14, right: 22, fontSize: 9, opacity: 0.2, color: "#C8924A", pointerEvents: "none" }}>✦</span>

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
                      <button onClick={() => handleDeletePost(post.id)} style={{ color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0 0.2rem", display: "flex", alignItems: "center" }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Ícono central grande */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0.25rem 0 0.75rem" }}>
                    <div className="achieve-icon-enter" style={{ position: "relative", marginBottom: "0.75rem" }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#C8924A", opacity: 0.15, position: "absolute", inset: 0 }} />
                      <div style={{ width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <AchIcon size={34} color="#C8924A" strokeWidth={1.8} />
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
                      <Heart size={60} color="#E74C3C" fill="#E74C3C" strokeWidth={0} />
                    </div>
                  )}

                  {/* Footer: likes + comentarios */}
                  <div style={{ borderTop: "1px solid #E8D5A8", paddingTop: "0.65rem", marginTop: "0.1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <LikeButton postId={post.id} count={likeCounts[post.id] || 0} liked={likedPosts.has(post.id)} onToggle={toggleLike} size={16} />
                    <button onClick={() => toggleComments(post.id)} style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <MessageCircle size={14} strokeWidth={2} />
                      {commentsOpen ? "Ocultar comentarios" : commentCounts[post.id] ? `Comentarios (${commentCounts[post.id]})` : "Comentarios"}
                    </button>
                  </div>
                  {commentsOpen && <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} /></div>}
                </div>
              );
            }

            const isReadingSession = post.type === "reading_session";
            if (isReadingSession) {
              const sesPages = post.pages_read || post.pagesRead || 0;
              const sesMinutes = post.minutes_read || post.minutesRead || null;
              console.log('Post reading_session:', { id: post.id, pages_read: post.pages_read, minutes_read: post.minutes_read });
              return (
                <div key={post.id} id={`post-${post.id}`}
                  onClick={() => handleDoubleTap(post.id)}
                  style={{ position: "relative", overflow: "hidden", backgroundColor: palette.bgCard, border: `1px solid #4CAF5030`, borderLeft: `4px solid #4CAF50`, borderRadius: "14px", padding: "18px", boxShadow: highlightedPost === post.id ? "0 2px 8px rgba(76,175,80,0.10), 0 0 0 2px #7A2E2E" : "0 2px 8px rgba(76,175,80,0.10)", cursor: "default", transition: "box-shadow 200ms ease" }}
                >
                  {doubleTapPost === post.id && (
                    <div className="heart-pop-anim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                      <Heart size={60} color="#E74C3C" fill="#E74C3C" strokeWidth={0} />
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
                      <button onClick={() => handleDeletePost(post.id)} style={{ color: palette.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0 0.2rem", display: "flex", alignItems: "center" }}>
                        <X size={14} />
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
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "#E8F0E3", color: "#3D6B28", borderRadius: "12px", padding: "6px 12px", fontSize: "13px", fontWeight: 500 }}>
                          📖 {sesPages} {sesPages === 1 ? "página" : "páginas"}
                        </span>
                      )}
                      {sesMinutes > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "#FDF3DC", color: "#8B6200", borderRadius: "12px", padding: "6px 12px", fontSize: "13px", fontWeight: 500 }}>
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
                  {commentsOpen && <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} /></div>}
                </div>
              );
            }

            const accentBorder = isFinished ? "#7A2E2E" : isStarted ? "#C8924A" : "#1B3A4B";
            const shadowColor = isFinished ? "rgba(122,46,46,0.13)" : isStarted ? "rgba(200,146,74,0.15)" : "rgba(27,58,75,0.12)";
            return (
              <div key={post.id} id={`post-${post.id}`}
                onClick={() => handleDoubleTap(post.id)}
                style={{
                  position: "relative", overflow: "hidden",
                  backgroundColor: palette.bgCard,
                  border: `1px solid ${palette.border}`,
                  borderLeft: `4px solid ${accentBorder}`,
                  borderRadius: "14px",
                  padding: "18px",
                  boxShadow: highlightedPost === post.id ? `0 2px 8px ${shadowColor}, 0 0 0 2px #7A2E2E` : `0 2px 8px ${shadowColor}`,
                  cursor: "default",
                  transition: "box-shadow 200ms ease",
                }}>
                {/* Doble tap overlay */}
                {doubleTapPost === post.id && (
                  <div className="heart-pop-anim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                    <Heart size={60} color="#E74C3C" fill="#E74C3C" strokeWidth={0} />
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
                    <button onClick={() => handleDeletePost(post.id)} title="Eliminar" style={{ color: palette.inkFaint, backgroundColor: "transparent", border: "none", cursor: "pointer", padding: "0 0.2rem", display: "flex", alignItems: "center" }}>
                      <X size={14} strokeWidth={2} />
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
                        <p style={{ fontSize: "0.85rem", color: "#E07B1A", letterSpacing: "0.05em" }}>
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
                {commentsOpen && <div className="comments-enter"><PostComments postId={post.id} user={user} onCountChange={handleCommentCountChange} /></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Cuentos curados — siempre al final del feed */}
      {(feedState === 'ready' || feedState === 'empty') && (
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: `1px solid ${palette.borderSoft}` }}>
          <FeedEditorialContent books={books} onAdd={onAdd} onInvite={handleInvite} onRead={setActiveReader} />
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
          user={user}
          pagesLoggedToday={pagesLoggedToday}
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
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
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
    </div>
  );
}

function SorprendeView({ books }) {
  const wishlist = books.filter((b) => b.status === "want_to_read");
  const [pick, setPick] = useState(() => wishlist.length > 0 ? wishlist[Math.floor(Math.random() * wishlist.length)] : null);

  const readBooks = books.filter((b) => b.status === "read" && b.rating > 0);
  const topRatedBook = readBooks.sort((a, b) => b.rating - a.rating)[0];
  const genreCount = {};
  readBooks.forEach((b) => { if (b.genre) genreCount[b.genre] = (genreCount[b.genre] || 0) + 1; });
  const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  function reshuffle() {
    if (wishlist.length === 0) return;
    let idx;
    do { idx = Math.floor(Math.random() * wishlist.length); } while (wishlist.length > 1 && wishlist[idx]?.id === pick?.id);
    setPick(wishlist[idx]);
  }

  if (wishlist.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <Sparkles size={32} color={palette.inkFaint} style={{ margin: "0 auto 1rem" }} />
        <p style={{ ...display, fontSize: "1.1rem", fontStyle: "italic", color: palette.inkSoft }}>Añade libros a "Quiero leer" para que pueda sorprenderte.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: "0 1rem", textAlign: "center" }}>
      <p style={{ ...ts.caption, marginBottom: "1.5rem" }}>Tu próxima lectura podría ser…</p>
      {pick && (
        <div style={{ backgroundColor: palette.bgCard, borderRadius: "16px", padding: "2rem 1.5rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <BookCoverPlaceholder title={pick.title} author={pick.author} width={100} height={145} />
          </div>
          <p style={{ ...ts.h2, fontStyle: "italic", color: palette.ink, marginBottom: "0.3rem" }}>{pick.title}</p>
          <p style={{ ...ts.body15, color: palette.inkSoft, marginBottom: topRatedBook ? "0.75rem" : 0 }}>{pick.author}</p>
          {topRatedBook && (
            <p style={{ ...ts.caption, fontStyle: "italic" }}>
              Porque disfrutaste <em>{topRatedBook.title}</em>
              {topGenre ? ` y te gusta ${topGenre}` : ""}
            </p>
          )}
        </div>
      )}
      <button
        onClick={reshuffle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          color: palette.accent,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "14px",
          fontWeight: 500,
          padding: "0.5rem 0",
          marginTop: "0.25rem",
        }}
      >
        <RotateCcw size={14} strokeWidth={2} />
        Otra sugerencia
      </button>
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
    { label: "Leídos",          value: read.length,                          Icon: BookCheck,  iconColor: "#5C6B3D", bg: "#5C6B3D08", accent: "#5C6B3D", border: "#5C6B3D22" },
    { label: "Leyendo",         value: reading.length,                       Icon: BookOpen,   iconColor: "#C8842B", bg: "#C8842B08", accent: "#7A2E2E", border: "#C8842B22" },
    { label: "Por leer",        value: want.length,                          Icon: Bookmark,   iconColor: "#64748B", bg: "#64748B08", accent: "#1B3A4B", border: "#64748B22" },
    { label: "Total",           value: books.length,                         Icon: Library,    iconColor: "#6B1E2A", bg: "#6B1E2A08", accent: "#2A1F1A", border: "#6B1E2A22" },
    { label: "Valoración media",value: avgRating ? `${avgRating} ★` : "—",  Icon: Star,       iconColor: "#C8842B", bg: "#C8842B08", accent: "#8A5A1A", border: "#C8842B22" },
    { label: "Cinco estrellas", value: fiveStars,                            Icon: Award,      iconColor: "#C8842B", bg: "#C8842B08", accent: "#6B2B3E", border: "#C8842B22" },
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
    </div>
  );
}

function ExplorarView({ books, onSelectBook, onAdd }) {
  const [sub, setSub] = useState("para_ti");
  const TABS = [
    { id: "para_ti", label: "Para ti" },
    { id: "uam", label: "Bib. UAM" },
    { id: "sorprendeme", label: "Sorpréndeme" },
  ];
  return (
    <div>
      <div className="px-4 sm:px-6 pt-5 max-w-4xl mx-auto">
        <SubTabBar tabs={TABS} active={sub} onChange={setSub} />
      </div>
      {sub === "para_ti" && <RecommendFlow books={books} onSelectBook={onSelectBook} onAdd={onAdd} />}
      {sub === "uam" && <UAMLibraryView books={books} onAdd={onAdd} />}
      {sub === "sorprendeme" && <SorprendeView books={books} />}
    </div>
  );
}

function PerfilWrapper({ user, books, onSelectBook, setTab, onLogout, isOnline = true }) {
  const [sub, setSub] = useState("perfil");
  const TABS = [
    { id: "perfil", label: "Mi perfil" },
    { id: "libros", label: "Mis libros" },
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
      {sub === "perfil" && <ProfileView user={user} books={books} onSelectBook={onSelectBook} setTab={setTab} onLogout={onLogout} />}
      {sub === "resumen" && <ReadingStatsView books={books} />}
    </div>
  );
}

// ============ WRAP GENERATION ============
function pickWrapPhrase(bookCount, currentStreak, isBestPeriod, isAnnual) {
  const period = isAnnual ? "año" : "mes";
  let base;
  if (bookCount === 0)       base = `El próximo ${period} es tuyo. Un libro a la vez.`;
  else if (bookCount <= 2)   base = "Cada página cuenta. Vas construyendo el hábito.";
  else if (bookCount <= 5)   base = `¡Buen ${period}! Estás encontrando tu ritmo.`;
  else if (bookCount <= 10)  base = `${isAnnual ? "Año" : "Mes"} sólido. Eres un lector constante.`;
  else                       base = `¡${isAnnual ? "Año" : "Mes"} extraordinario! Eres una máquina lectora.`;
  const extras = [];
  if (currentStreak > 7) extras.push(`Tu racha de ${currentStreak} días habla de tu disciplina.`);
  if (isBestPeriod)      extras.push(`¡Tu mejor ${period} hasta ahora!`);
  return [base, ...extras].join(" ");
}

async function generateMonthWrap(userId, userName, month, year) {
  const startISO = new Date(year, month - 1, 1).toISOString();
  const endISO   = new Date(year, month, 1).toISOString();
  const prevM    = month === 1 ? 12 : month - 1;
  const prevY    = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevY, prevM - 1, 1).toISOString();
  const prevEnd   = new Date(prevY, prevM, 1).toISOString();

  const [
    { data: booksData },
    { data: logsData },
    { data: achData },
    { count: prevCount },
  ] = await Promise.all([
    supabase.from("books").select("id,title,author,cover_url,rating,genre,finished_at")
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", startISO).lt("finished_at", endISO),
    supabase.from("reading_logs").select("pages_read,logged_at")
      .eq("user_id", userId).gte("logged_at", startISO).lt("logged_at", endISO),
    supabase.from("achievements").select("achievement_key,unlocked_at")
      .eq("user_id", userId).gte("unlocked_at", startISO).lt("unlocked_at", endISO),
    supabase.from("books").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", prevStart).lt("finished_at", prevEnd),
  ]);

  const books = booksData || [];
  const logs  = logsData  || [];
  const totalPages = logs.reduce((s, l) => s + (l.pages_read || 0), 0);

  const genreCount = {};
  books.forEach(b => { if (b.genre) genreCount[b.genre] = (genreCount[b.genre] || 0) + 1; });
  const topGenre = Object.keys(genreCount).sort((a, b) => genreCount[b] - genreCount[a])[0] || null;
  const favoriteBook = [...books].filter(b => b.rating > 0).sort((a, b) => b.rating - a.rating)[0] || null;

  // Best month check: compare to best previous month
  const { data: allPrevBooks } = await supabase.from("books").select("finished_at")
    .eq("user_id", userId).eq("status", "read").not("finished_at", "is", null).lt("finished_at", startISO);
  const prevMonthCounts = {};
  (allPrevBooks || []).forEach(b => { const k = b.finished_at.slice(0, 7); prevMonthCounts[k] = (prevMonthCounts[k] || 0) + 1; });
  const bestPrevMonth = Math.max(0, ...Object.values(prevMonthCounts).concat(0));
  const isBestMonth = books.length > 0 && books.length > bestPrevMonth;

  const { data: streakRowM } = await supabase.from("user_streaks").select("current_streak").eq("user_id", userId).maybeSingle();
  const aiPhrase = pickWrapPhrase(books.length, streakRowM?.current_streak || 0, isBestMonth, false);

  const data = {
    booksRead: books.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.cover_url, rating: b.rating, genre: b.genre })),
    totalPages, topGenre,
    favoriteBook: favoriteBook ? { title: favoriteBook.title, author: favoriteBook.author, coverUrl: favoriteBook.cover_url, rating: favoriteBook.rating } : null,
    prevMonthBooks: prevCount || 0,
    unlockedAchievements: (achData || []).map(a => a.achievement_key),
    aiPhrase,
  };

  const { data: saved } = await supabase.from("monthly_wraps").upsert(
    { user_id: userId, month, year, wrap_type: "monthly", data },
    { onConflict: "user_id,month,year,wrap_type" }
  ).select().single();
  return saved || { user_id: userId, month, year, wrap_type: "monthly", data };
}

async function generateAnnualWrap(userId, userName, year) {
  const startISO = new Date(year, 0, 1).toISOString();
  const endISO   = new Date(year + 1, 0, 1).toISOString();
  const prevStart = new Date(year - 1, 0, 1).toISOString();
  const prevEnd   = new Date(year, 0, 1).toISOString();

  const [{ data: booksData }, { data: logsData }, { count: prevCount }] = await Promise.all([
    supabase.from("books").select("id,title,author,cover_url,rating,genre,finished_at")
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", startISO).lt("finished_at", endISO),
    supabase.from("reading_logs").select("pages_read,logged_at")
      .eq("user_id", userId).gte("logged_at", startISO).lt("logged_at", endISO),
    supabase.from("books").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", prevStart).lt("finished_at", prevEnd),
  ]);

  const books = booksData || [];
  const logs  = logsData  || [];
  const totalPages = logs.reduce((s, l) => s + (l.pages_read || 0), 0);

  const genreCount = {};
  books.forEach(b => { if (b.genre) genreCount[b.genre] = (genreCount[b.genre] || 0) + 1; });
  const topGenre = Object.keys(genreCount).sort((a, b) => genreCount[b] - genreCount[a])[0] || null;
  const top3 = [...books].filter(b => b.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 3);

  // Most active month: count books per month
  const monthCounts = Array(12).fill(0);
  books.forEach(b => {
    if (b.finished_at) {
      const m = new Date(b.finished_at).getMonth();
      if (m >= 0 && m < 12) monthCounts[m]++;
    }
  });
  const mostActiveMonthIdx = monthCounts.indexOf(Math.max(...monthCounts));
  const mostActiveMonth = MONTHS_ES[mostActiveMonthIdx] || "";

  const { data: streakRow } = await supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle();

  // Best year check
  const { data: allPrevYearBooks } = await supabase.from("books").select("finished_at")
    .eq("user_id", userId).eq("status", "read").not("finished_at", "is", null).lt("finished_at", startISO);
  const prevYearCounts = {};
  (allPrevYearBooks || []).forEach(b => { const k = b.finished_at.slice(0, 4); prevYearCounts[k] = (prevYearCounts[k] || 0) + 1; });
  const bestPrevYear = Math.max(0, ...Object.values(prevYearCounts).concat(0));
  const isBestYear = books.length > 0 && books.length > bestPrevYear;

  const aiPhrase = pickWrapPhrase(books.length, streakRow?.current_streak || 0, isBestYear, true);

  const data = {
    booksRead: books.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.cover_url, rating: b.rating, genre: b.genre })),
    totalPages, topGenre,
    top3Books: top3.map(b => ({ title: b.title, author: b.author, coverUrl: b.cover_url, rating: b.rating })),
    mostActiveMonth, longestStreak: streakRow?.longest_streak || 0,
    prevYearBooks: prevCount || 0, aiPhrase,
  };

  const { data: saved } = await supabase.from("monthly_wraps").upsert(
    { user_id: userId, month: null, year, wrap_type: "annual", data },
    { onConflict: "user_id,month,year,wrap_type" }
  ).select().single();
  return saved || { user_id: userId, month: null, year, wrap_type: "annual", data };
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
      backgroundColor: "#2A1F1A", color: palette.bg,
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

// ============ WRAPPED CARD + MODAL ============
function WrappedCard({ wrap, userName, cardRef }) {
  const { data, month, year, wrap_type } = wrap;
  const isAnnual = wrap_type === "annual";
  const monthName = isAnnual ? null : MONTHS_ES[(month || 1) - 1];
  const title = isAnnual ? `Tu ${year} en libros` : `Tu ${monthName} en libros`;
  const booksCount = data.booksRead?.length || 0;
  const diff = booksCount - (data.prevMonthBooks || data.prevYearBooks || 0);

  return (
    <div ref={cardRef} style={{
      width: 320, minHeight: 540,
      background: "linear-gradient(165deg, #5A1A1A 0%, #7A2E2E 25%, #C8924A 65%, #F4EDE0 100%)",
      borderRadius: 20, padding: "2rem 1.6rem 1.75rem",
      color: "#F4EDE0", position: "relative", overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ ...display, fontSize: "0.85rem", fontWeight: 300, fontStyle: "italic", opacity: 0.75, marginBottom: "1.75rem", letterSpacing: "0.08em" }}>Folio</div>

      {/* Title */}
      <div style={{ ...body, fontSize: "0.9rem", opacity: 0.8, marginBottom: "0.2rem" }}>{title}</div>

      {/* Big number */}
      <div style={{ ...display, fontSize: "5rem", fontWeight: 900, fontStyle: "italic", lineHeight: 1, color: "#FFF", marginBottom: "0.15rem" }}>{booksCount}</div>
      <div style={{ ...body, fontSize: "1rem", opacity: 0.85, marginBottom: "1.5rem" }}>
        {booksCount === 1 ? "libro leído" : "libros leídos"}
        {diff !== 0 && <span style={{ fontSize: "0.78rem", marginLeft: "0.5rem", opacity: 0.7 }}>({diff > 0 ? "+" : ""}{diff} vs anterior)</span>}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {data.totalPages > 0 && (
          <div style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.6rem 0.75rem" }}>
            <div style={{ ...display, fontSize: "1.3rem", fontWeight: 700 }}>{data.totalPages.toLocaleString()}</div>
            <div style={{ ...body, fontSize: "0.72rem", opacity: 0.75 }}>páginas</div>
          </div>
        )}
        {data.topGenre && (
          <div style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.6rem 0.75rem" }}>
            <div style={{ ...display, fontSize: "1rem", fontWeight: 700, fontStyle: "italic" }}>{data.topGenre}</div>
            <div style={{ ...body, fontSize: "0.72rem", opacity: 0.75 }}>género favorito</div>
          </div>
        )}
        {isAnnual && data.mostActiveMonth && (
          <div style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.6rem 0.75rem" }}>
            <div style={{ ...display, fontSize: "1rem", fontWeight: 700, fontStyle: "italic" }}>{data.mostActiveMonth}</div>
            <div style={{ ...body, fontSize: "0.72rem", opacity: 0.75 }}>mes más activo</div>
          </div>
        )}
        {isAnnual && data.longestStreak > 0 && (
          <div style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.6rem 0.75rem" }}>
            <div style={{ ...display, fontSize: "1.3rem", fontWeight: 700 }}>{data.longestStreak}</div>
            <div style={{ ...body, fontSize: "0.72rem", opacity: 0.75 }}>días mejor racha</div>
          </div>
        )}
      </div>

      {/* Favorite / top books */}
      {!isAnnual && data.favoriteBook && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ ...body, fontSize: "0.72rem", opacity: 0.65, marginBottom: "0.2rem" }}>Tu favorito del mes</div>
          <div style={{ ...display, fontSize: "0.95rem", fontStyle: "italic" }}>{data.favoriteBook.title}</div>
        </div>
      )}
      {isAnnual && data.top3Books?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ ...body, fontSize: "0.72rem", opacity: 0.65, marginBottom: "0.35rem" }}>Top libros del año</div>
          {data.top3Books.map((b, i) => (
            <div key={i} style={{ ...display, fontSize: "0.88rem", fontStyle: "italic", opacity: 0.9, marginBottom: "0.15rem" }}>
              {i + 1}. {b.title}
            </div>
          ))}
        </div>
      )}

      {/* AI Phrase */}
      {data.aiPhrase && (
        <div style={{ backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "0.65rem 0.85rem", ...body, fontSize: "0.83rem", fontStyle: "italic", lineHeight: 1.5, opacity: 0.9 }}>
          "{data.aiPhrase}"
        </div>
      )}
    </div>
  );
}

function WrappedModal({ wrap, userName, onClose, onRegenerate }) {
  const cardRef = useRef(null);
  const { data, month, year, wrap_type } = wrap;
  const isAnnual = wrap_type === "annual";
  const monthName = isAnnual ? null : MONTHS_ES[(month || 1) - 1];
  const title = isAnnual ? `Wrapped ${year}` : `Wrapped ${monthName} ${year}`;
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  const booksCount = data.booksRead?.length || 0;

  async function handleShare() {
    const text = `${title}: leí ${booksCount} ${booksCount === 1 ? "libro" : "libros"}${data.totalPages > 0 ? `, ${data.totalPages} páginas` : ""}${data.topGenre ? `, mi género favorito fue ${data.topGenre}` : ""}. #Folio #Lectura`;
    if (navigator.share) {
      try { await navigator.share({ title: `Folio — ${title}`, text }); setShared(true); } catch {}
    } else {
      try { await navigator.clipboard.writeText(text); setShared(true); setTimeout(() => setShared(false), 2500); } catch {}
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `folio-${isAnnual ? `wrapped-${year}` : `${monthName}-${year}`}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) { console.error("html2canvas error:", err); }
    setDownloading(false);
  }

  const unlockedDefs = (data.unlockedAchievements || [])
    .map(k => ACHIEVEMENT_DEFS.find(a => a.key === k)).filter(Boolean);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      backgroundColor: "rgba(10,5,0,0.92)",
      display: "flex", flexDirection: "column", alignItems: "center",
      overflowY: "auto", padding: "1.5rem 1rem 2rem",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ ...display, fontSize: "1.1rem", color: palette.bg, fontStyle: "italic" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A8A7A", padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Card */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <WrappedCard wrap={wrap} userName={userName} cardRef={cardRef} />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.25rem" }}>
          <button onClick={handleShare} style={{
            flex: 1, padding: "0.8rem", borderRadius: 12,
            backgroundColor: palette.accent, color: palette.bg,
            border: "none", cursor: "pointer", ...display, fontSize: "0.95rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}>
            <Share2 size={16} />{shared ? "¡Copiado!" : "Compartir"}
          </button>
          <button onClick={handleDownload} disabled={downloading} style={{
            flex: 1, padding: "0.8rem", borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.08)", color: "#D8CCBC",
            border: "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", ...body, fontSize: "0.9rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}>
            {downloading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Copy size={15} />}
            Descargar
          </button>
        </div>

        {/* Detail section */}
        {booksCount > 0 && (
          <div style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "0.75rem" }}>
            <p style={{ ...display, fontSize: "0.75rem", color: "#9A8A7A", fontWeight: 500, marginBottom: "0.75rem" }}>
              {isAnnual ? "Libros del año" : "Libros del mes"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(data.booksRead || []).slice(0, 8).map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {b.coverUrl
                    ? <img src={b.coverUrl} alt="" style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 46, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><BookOpen size={14} color="#9A8A7A" /></div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...display, fontSize: "0.85rem", color: "#F4EDE0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    <div style={{ ...body, fontSize: "0.74rem", color: "#9A8A7A" }}>{b.author}</div>
                  </div>
                  {b.rating > 0 && <div style={{ ...body, fontSize: "0.75rem", color: palette.amber, flexShrink: 0 }}>{"★".repeat(b.rating)}</div>}
                </div>
              ))}
              {(data.booksRead || []).length > 8 && (
                <div style={{ ...body, fontSize: "0.8rem", color: "#9A8A7A", textAlign: "center" }}>+{data.booksRead.length - 8} más</div>
              )}
            </div>
          </div>
        )}

        {/* Achievements unlocked */}
        {unlockedDefs.length > 0 && (
          <div style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <p style={{ ...display, fontSize: "0.75rem", color: "#9A8A7A", fontWeight: 500, marginBottom: "0.65rem" }}>Logros desbloqueados</p>
            {unlockedDefs.map(a => (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{a.emoji}</span>
                <div>
                  <div style={{ ...display, color: "#C8924A", fontSize: "0.88rem" }}>{a.name}</div>
                  <div style={{ ...body, color: "#9A8A7A", fontSize: "0.76rem" }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
      background: "linear-gradient(160deg, #F5EFE3 0%, #C9976A 52%, #7A2E2E 100%)",
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
      <p style={{ fontFamily: "Fraunces, serif", fontSize: "1.3rem", fontWeight: 800, color: "#2A1F1A", textAlign: "center", lineHeight: 1.2, margin: 0, maxWidth: "90%" }}>
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
            <Star key={i} size={15} fill="#C8924A" color="#C8924A" strokeWidth={0} />
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
          <BookOpen size={13} color="#2A1F1A" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.83rem", color: "#2A1F1A", margin: 0 }}>
            Libro #{booksThisYear} de {year}
          </p>
        </div>
        {streak?.current_streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Flame size={13} color="#2A1F1A" strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <p style={{ fontFamily: "'EB Garamond', serif", fontSize: "0.83rem", color: "#2A1F1A", margin: 0 }}>
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
          <h2 style={{ ...display, fontSize: "1.1rem", color: palette.bg, fontStyle: "italic" }}>¡Comparte tu logro!</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A8A7A", padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <BookShareCard book={book} rating={rating} review={review} streak={streak} booksThisYear={booksThisYear} cardRef={cardRef} />
        </div>

        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={handleShare}
            disabled={generating}
            style={{
              flex: 1, padding: "0.85rem", borderRadius: 12,
              backgroundColor: palette.accent, color: palette.bg,
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
              backgroundColor: "rgba(255,255,255,0.08)", color: "#D8CCBC",
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
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ["#7A2E2E", "#C8924A", "#F4EDE0", "#2A1F1A"] });
    setTimeout(() => confetti({ particleCount: 60, spread: 110, angle: 60, origin: { x: 0, y: 0.5 }, colors: ["#7A2E2E", "#C8924A", "#F4EDE0"] }), 250);
    setTimeout(() => confetti({ particleCount: 60, spread: 110, angle: 120, origin: { x: 1, y: 0.5 }, colors: ["#7A2E2E", "#C8924A", "#F4EDE0"] }), 450);
    setTimeout(() => setBookPhase("closing"), 900);
    setTimeout(() => setBookPhase("closed"), 1600);
    setTimeout(() => setStep(2), 2700);
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
    await onSaveRating(book.id, rating, review);
    await fetchSummaryData();
    setSaving(false);
    setStep(3);
  }

  async function handleSkipRating() {
    await fetchSummaryData();
    setStep(3);
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
                ? <BookmarkCheck size={38} color={palette.bg} />
                : <BookOpen size={38} color={palette.bg} />}
            </div>
          </div>
          <h1 style={{ ...display, fontSize: "clamp(2rem,7vw,3rem)", color: palette.bg, fontStyle: "italic", marginBottom: "0.5rem" }}>
            ¡Libro terminado!
          </h1>
          <p style={{ ...body, fontSize: "1.15rem", color: "#D8CCBC", marginBottom: "0.25rem" }}>{book.title}</p>
          <p style={{ ...body, fontSize: "0.9rem", color: "#9A8A7A" }}>{book.author}</p>
        </div>
      )}

      {/* STEP 2 — Rating */}
      {step === 2 && (
        <div style={{ width: "100%", maxWidth: 400, animation: "celebCardIn 0.45s ease-out" }}>
          <h2 style={{ ...display, fontSize: "1.9rem", color: palette.bg, fontStyle: "italic", textAlign: "center", marginBottom: "0.2rem" }}>
            ¿Qué te pareció?
          </h2>
          <p style={{ ...body, fontSize: "0.9rem", color: "#9A8A7A", textAlign: "center", marginBottom: "1.75rem" }}>
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
                  fill={n <= displayRating ? "#C8924A" : "none"}
                  color={n <= displayRating ? "#C8924A" : "#5A4A3A"}
                  style={{ transition: "all 0.12s" }}
                />
              </button>
            ))}
          </div>

          <p style={{ ...body, textAlign: "center", color: "#C8924A", fontSize: "1rem", minHeight: "1.5rem", marginBottom: "1.5rem", transition: "opacity 0.2s" }}>
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
              color: palette.bg, ...body, fontSize: "0.95rem",
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
              backgroundColor: rating > 0 ? palette.accent : "#3A2A1A",
              color: rating > 0 ? palette.bg : "#6A5A4A",
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
              color: "#7A6A5A", ...body, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Saltar por ahora
          </button>
        </div>
      )}

      {/* STEP 3 — Summary */}
      {step === 3 && (
        <div style={{ width: "100%", maxWidth: 420, animation: "celebCardIn 0.45s ease-out" }}>
          <h2 style={{ ...display, fontSize: "1.9rem", color: palette.bg, fontStyle: "italic", textAlign: "center", marginBottom: "1.5rem" }}>
            Tu resumen
          </h2>

          {streak && (
            <div style={{
              backgroundColor: "rgba(122,46,46,0.18)", border: "1.5px solid rgba(122,46,46,0.35)",
              borderRadius: "14px", padding: "1rem 1.25rem",
              display: "flex", alignItems: "center", gap: "1rem",
              marginBottom: "0.75rem",
            }}>
              <Flame size={28} color="#C8924A" />
              <div>
                <div style={{ ...display, fontSize: "1.5rem", color: palette.bg }}>
                  {streak.current_streak || 0} <span style={{ fontSize: "0.8rem", ...body, color: "#C8924A" }}>días de racha</span>
                </div>
                <div style={{ ...body, fontSize: "0.82rem", color: "#9A8A7A" }}>
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
            <BookOpen size={24} color="#C8924A" />
            <div style={{ ...body, color: "#D8CCBC", fontSize: "0.95rem" }}>
              Has leído{" "}
              <strong style={{ ...display, color: palette.bg, fontSize: "1.1rem" }}>{booksThisMonth}</strong>{" "}
              {booksThisMonth === 1 ? "libro" : "libros"} este mes
            </div>
          </div>

          {newAchievements.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ ...body, fontSize: "0.8rem", color: "#9A8A7A", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "center" }}>
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
                    <div style={{ ...display, color: "#C8924A", fontSize: "0.95rem" }}>{a.name}</div>
                    <div style={{ ...body, color: "#9A8A7A", fontSize: "0.78rem" }}>{a.desc}</div>
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
              color: "#C8924A", cursor: "pointer",
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
              backgroundColor: palette.accent, color: palette.bg,
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
          <Sparkles size={42} color="#C8924A" style={{ marginBottom: "1rem" }} />
          <h2 style={{ ...display, fontSize: "1.9rem", color: palette.bg, fontStyle: "italic", marginBottom: "0.5rem" }}>
            ¿Listo para el siguiente?
          </h2>
          <p style={{ ...body, color: "#9A8A7A", fontSize: "0.9rem", marginBottom: "2rem" }}>
            {wantCount > 0
              ? `Tienes ${wantCount} ${wantCount === 1 ? "libro" : "libros"} esperándote en tu biblioteca`
              : "Folio tiene miles de libros esperándote"}
          </p>

          <button
            onClick={onGoToExplorer}
            style={{
              width: "100%", padding: "0.9rem", borderRadius: "12px",
              backgroundColor: palette.accent, color: palette.bg,
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
              color: "#D8CCBC", ...body, fontSize: "0.95rem",
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
          backgroundColor: palette.accent, color: "#fff",
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
function MainApp({ user, onLogout, initialRefUser, onRefUserConsumed }) {
  const [tab, setTab] = useState("feed");
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
  const [toastMessage, setToastMessage] = useState(null);
  const [activeWrap, setActiveWrap] = useState(null);
  const [mainUsername, setMainUsername] = useState(null);
  const [refModalUser, setRefModalUser] = useState(initialRefUser || null);
  const isOnline = useOnlineStatus();

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
          fetchBooks(user.id).then(b => setBooks(b)).catch(() => {});
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
            generateMonthWrap(user.id, user.name, m, y).then(wrap => { if (wrap) setActiveWrap(wrap); });
          }
        });
    }

    // Auto-generate annual wrap on Dec 31
    const todayCheck = new Date();
    if (todayCheck.getMonth() === 11 && todayCheck.getDate() === 31) {
      const y = todayCheck.getFullYear();
      supabase.from("monthly_wraps").select("id").eq("user_id", user.id).eq("wrap_type", "annual").eq("year", y).maybeSingle()
        .then(({ data: existing }) => {
          if (!existing) generateAnnualWrap(user.id, user.name, y).then(wrap => { if (wrap) setActiveWrap(wrap); });
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
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadNotifs(count || 0);
    } catch {}
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
        refreshUnreadNotifs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  useEffect(() => {
    const interval = setInterval(refreshUnreadNotifs, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    const unsub = achievementBus.on((keys) => {
      setAchievementQueue((prev) => [...prev, ...keys]);
    });
    return unsub;
  }, []);

  async function addBook(book) {
    const withFinished =
      book.status === "read" && !book.finishedAt ? { ...book, finishedAt: Date.now() } : book;
    setBooks((prev) => [withFinished, ...prev]);
    try {
      await insertBook(withFinished, user.id);
      if (book.status === "reading") {
        checkAchievements(user.id, user.name);
        setPendingPost({ type: "book_update", action: "started", book: withFinished });
      } else if (book.status === "read") {
        setCelebrationBook(withFinished);
      } else {
        checkAchievements(user.id, user.name);
      }
    } catch (err) {
      console.error("Error guardando libro:", err);
      setBooks((prev) => prev.filter((b) => b.id !== withFinished.id));
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
        setCelebrationBook(final);
      } else {
        setSelectedBook(final);
      }
    } else {
      setSelectedBook(final);
    }

    try {
      await updateBookInDB(final, user.id);
      if (!isFinishing) checkAchievements(user.id, user.name);
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
        input:focus, textarea:focus { border-color: ${palette.accent} !important; box-shadow: 0 0 0 3px ${palette.accent}22; transition: box-shadow 150ms ease, border-color 150ms ease; outline: none; }
        ::selection { background: ${palette.amber}55; color: ${palette.ink}; }
        body { background-color: ${palette.bg}; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
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
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(122,46,46,0.5), 0 0 0 0 rgba(122,46,46,0.3); }
          50% { box-shadow: 0 4px 28px rgba(122,46,46,0.7), 0 0 0 6px rgba(122,46,46,0); }
        }
        @keyframes fire-pulse-anim {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(200,146,74,0.5)); }
          50% { transform: scale(1.18); filter: drop-shadow(0 0 12px rgba(200,146,74,0.9)); }
        }
        .fire-pulse { display: inline-block; }
        @keyframes achievementPop {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes achievementBounce {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes bookAppear {
          from { opacity: 0; transform: scale(0.55) rotate(-10deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes bookClosing {
          0% { transform: scale(1) rotate(0deg); }
          40% { transform: scale(1.1) rotate(-6deg); }
          100% { transform: scale(0.8) rotate(-20deg) translateY(-10px); opacity: 0.7; }
        }
        @keyframes bookClosed {
          from { transform: scale(0.8) rotate(-20deg) translateY(-10px); opacity: 0.7; }
          to { transform: scale(0.75) rotate(-18deg) translateY(-8px); opacity: 0; }
        }
        @keyframes celebCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          40% { opacity: 0.6; transform: scale(1.25) rotate(12deg); }
          70% { opacity: 0.9; transform: scale(0.9) rotate(-8deg); }
        }
        .sparkle-anim { animation: sparkle-pulse 2.2s ease-in-out 2; display: inline-block; }
      `}</style>
      <PWAUpdateBanner />
      {!isOnline && (
        <div style={{ backgroundColor: "#FDF3DC", borderBottom: "1px solid #E8C97A", height: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
          <WifiOff size={14} color={palette.amber} strokeWidth={2} />
          <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "12px", color: "#8A6A1A", fontWeight: 500 }}>
            Sin conexión — algunos datos pueden no estar actualizados
          </span>
        </div>
      )}
      <AppHeader tab={tab} setTab={setTab} user={user} onLogout={onLogout} pendingCount={pendingCount} unreadMessages={unreadMessages} unreadNotifs={unreadNotifs} onOpenNotifs={() => setNotifsSheetOpen(true)} />
      <main className="max-w-4xl mx-auto pb-24 sm:pb-10 fade-in" style={{ backgroundColor: palette.bgSoft, minHeight: "calc(100vh - 56px)" }}>
        {loaded && tab === "feed" && <div className="tab-view-enter"><FeedView user={user} onAdd={addBook} setTab={setTab} books={books} isOnline={isOnline} pendingNavigation={pendingNavigation} onNavigationDone={() => setPendingNavigation(null)} /></div>}
        {loaded && tab === "explorar" && <div className="tab-view-enter"><ExplorarView books={books} onSelectBook={setSelectedBook} onAdd={addBook} isOnline={isOnline} /></div>}
        {loaded && tab === "add" && <div className="tab-view-enter"><AddBookView onAdd={addBook} setTab={setTab} isOnline={isOnline} /></div>}
        {loaded && tab === "amigos" && <div className="tab-view-enter"><FriendsView user={user} onPendingChange={setPendingCount} onMessagesRead={refreshUnreadMessages} unreadNotifs={unreadNotifs} onNotifsRead={refreshUnreadNotifs} isOnline={isOnline} /></div>}
        {loaded && tab === "perfil" && <div className="tab-view-enter"><PerfilWrapper user={user} books={books} onSelectBook={setSelectedBook} setTab={setTab} onLogout={onLogout} isOnline={isOnline} /></div>}
      </main>
      <BottomNav tab={tab} setTab={setTab} pendingCount={pendingCount} unreadMessages={unreadMessages} unreadNotifs={unreadNotifs} />
      {notifsSheetOpen && (
        <NotificationsSheet
          user={user}
          onClose={() => setNotifsSheetOpen(false)}
          onNotifsRead={refreshUnreadNotifs}
          onNavigate={(postId, shouldOpenComments) => {
            setTab("feed");
            setPendingNavigation({ postId, openComments: shouldOpenComments });
          }}
        />
      )}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdate={updateBook}
          onDelete={deleteBook}
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
      {activeWrap && (
        <WrappedModal
          wrap={activeWrap}
          userName={user.name}
          onClose={() => setActiveWrap(null)}
        />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
      {refModalUser && (
        <FriendProfileModal
          friend={{ ...refModalUser, name: refModalUser.nombre }}
          user={user}
          onClose={() => { setRefModalUser(null); localStorage.removeItem("folio_ref"); onRefUserConsumed?.(); }}
        />
      )}
    </div>
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
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ title: "", author: "", status: "reading" });
  const [adding, setAdding] = useState(false);
  const [isbnStage, setIsbnStage] = useState("scanning");
  const [scannedBook, setScannedBook] = useState(null);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    if (mode !== "scan" || isbnStage !== "scanning") return;
    let active = true;
    const el = scannerRef.current;
    if (!el) return;

    Quagga.init({
      inputStream: { type: "LiveStream", target: el, constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
      decoder: { readers: ["ean_reader"] },
      locate: true,
    }, (err) => {
      if (err || !active) { setScanError("No se pudo acceder a la cámara"); return; }
      Quagga.start();
    });

    async function onDetected({ codeResult }) {
      if (!active) return;
      active = false;
      Quagga.stop();
      const isbn = codeResult.code;
      setIsbnStage("loading");
      try {
        const bookData = await lookupISBN(isbn);
        if (bookData && bookData.title) {
          setScannedBook({ title: bookData.title, author: bookData.author, coverUrl: bookData.coverUrl || "", status: "reading" });
          setIsbnStage("confirm");
        } else {
          setIsbnStage("notfound");
        }
      } catch { setIsbnStage("notfound"); }
    }
    Quagga.onDetected(onDetected);
    return () => {
      active = false;
      try { Quagga.stop(); } catch {}
    };
  }, [mode, isbnStage]);

  async function handleAdd(bookData) {
    setAdding(true);
    try {
      const enriched = await enrichBook(bookData.title, bookData.author).catch(() => null);
      const book = {
        id: crypto.randomUUID(),
        title: bookData.title, author: bookData.author,
        status: bookData.status || "reading",
        coverUrl: bookData.coverUrl || "",
        genre: enriched?.genre || "",
        summary: enriched?.summary || "",
        moodTags: enriched?.moodTags || [],
        rating: 0, review: "",
        finishedAt: bookData.status === "read" ? Date.now() : null,
      };
      await insertBook(book, user.id);
      onNext();
    } catch (err) {
      console.error("Error adding book in onboarding:", err);
      setAdding(false);
    }
  }

  const cardBtn = {
    width: "100%", padding: "1rem", borderRadius: 12,
    border: `1.5px solid ${palette.border}`, cursor: "pointer",
    backgroundColor: palette.bgCard,
    display: "flex", alignItems: "center", gap: "0.85rem",
    transition: "border-color 0.18s",
    textAlign: "left",
  };

  const inputStyle = {
    width: "100%", padding: "0.75rem", borderRadius: 10,
    border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard,
    ...body, fontSize: "0.95rem", color: palette.ink,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "0 1.25rem 2.5rem", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {/* Back button */}
      <button
        onClick={mode !== null ? () => { setMode(null); setIsbnStage("scanning"); setScanError(""); setScannedBook(null); } : onBack}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: palette.inkSoft, ...body, fontSize: "0.85rem", marginBottom: "1rem", padding: 0 }}
      >
        <ChevronLeft size={16} />{mode !== null ? "Cambiar método" : "Atrás"}
      </button>

      {mode === null && (
        <>
          <h1 style={{ ...display, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontStyle: "italic", color: palette.ink, marginBottom: "0.4rem", lineHeight: 1.15 }}>
            Tu primer libro
          </h1>
          <p style={{ ...body, fontSize: "1rem", color: palette.inkSoft, marginBottom: "1.75rem", lineHeight: 1.55 }}>
            Agrega el libro que estás leyendo o que quieres leer
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
            <button style={cardBtn} onClick={() => setMode("scan")}>
              <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${palette.accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Camera size={22} color={palette.accent} />
              </div>
              <div>
                <div style={{ ...display, fontSize: "0.97rem", fontWeight: 600, color: palette.ink }}>Fotografiar código de barras</div>
                <div style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft }}>Escanea el ISBN del libro</div>
              </div>
            </button>
            <button style={cardBtn} onClick={() => setMode("manual")}>
              <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${palette.accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PenLine size={22} color={palette.accent} />
              </div>
              <div>
                <div style={{ ...display, fontSize: "0.97rem", fontWeight: 600, color: palette.ink }}>Escribir título y autor</div>
                <div style={{ ...body, fontSize: "0.78rem", color: palette.inkSoft }}>Busca por nombre del libro</div>
              </div>
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.85rem", color: palette.inkFaint }}>
              Omitir por ahora
            </button>
          </div>
        </>
      )}

      {mode === "manual" && (
        <div>
          <h2 style={{ ...display, fontSize: "1.6rem", fontStyle: "italic", color: palette.ink, marginBottom: "1.25rem" }}>Agregar libro</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>Título *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="El nombre del viento..." style={inputStyle} />
            </div>
            <div>
              <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.3rem" }}>Autor *</label>
              <input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} placeholder="Patrick Rothfuss..." style={inputStyle} />
            </div>
            <div>
              <label style={{ ...body, fontSize: "0.8rem", color: palette.inkSoft, display: "block", marginBottom: "0.5rem" }}>¿Cómo lo agregas?</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[{ val: "reading", label: "Lo estoy leyendo" }, { val: "want_to_read", label: "Lo quiero leer" }].map(({ val, label }) => (
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
            <button
              onClick={() => handleAdd(form)}
              disabled={!form.title.trim() || !form.author.trim() || adding}
              style={{
                width: "100%", padding: "0.9rem", borderRadius: 12, border: "none",
                backgroundColor: form.title.trim() && form.author.trim() ? palette.accent : palette.border,
                color: form.title.trim() && form.author.trim() ? palette.bg : palette.inkFaint,
                cursor: form.title.trim() && form.author.trim() ? "pointer" : "default",
                ...display, fontSize: "1.05rem", marginTop: "0.25rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              {adding && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
              {adding ? "Guardando..." : "Agregar libro"}
            </button>
          </div>
        </div>
      )}

      {mode === "scan" && (
        <div>
          <h2 style={{ ...display, fontSize: "1.6rem", fontStyle: "italic", color: palette.ink, marginBottom: "1rem" }}>Escanear código</h2>
          {isbnStage === "scanning" && (
            <>
              <div ref={scannerRef} style={{ width: "100%", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", backgroundColor: "#111", position: "relative", marginBottom: "0.75rem" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, pointerEvents: "none" }}>
                  <div style={{ width: "65%", height: 2, backgroundColor: `${palette.accent}CC`, boxShadow: `0 0 14px ${palette.accent}` }} />
                </div>
              </div>
              {scanError && <p style={{ ...body, fontSize: "0.85rem", color: "#C0392B", textAlign: "center", marginBottom: "0.5rem" }}>{scanError}</p>}
              <p style={{ ...body, fontSize: "0.82rem", color: palette.inkFaint, textAlign: "center" }}>Apunta la cámara al código de barras del libro</p>
            </>
          )}
          {isbnStage === "loading" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <Loader2 size={32} color={palette.accent} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 0.75rem" }} />
              <p style={{ ...body, color: palette.inkSoft }}>Buscando libro...</p>
            </div>
          )}
          {isbnStage === "confirm" && scannedBook && (
            <div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", padding: "1rem", backgroundColor: palette.bgCard, borderRadius: 12, border: `1px solid ${palette.border}` }}>
                {scannedBook.coverUrl
                  ? <img src={scannedBook.coverUrl} alt="" style={{ width: 64, height: 92, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                  : <div style={{ width: 64, height: 92, borderRadius: 6, backgroundColor: `${palette.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BookOpen size={24} color={palette.accent} /></div>
                }
                <div>
                  <p style={{ ...display, fontSize: "1rem", color: palette.ink, marginBottom: "0.25rem" }}>{scannedBook.title}</p>
                  <p style={{ ...body, fontSize: "0.85rem", color: palette.inkSoft }}>{scannedBook.author}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {[{ val: "reading", label: "Lo estoy leyendo" }, { val: "want_to_read", label: "Lo quiero leer" }].map(({ val, label }) => (
                  <button key={val} onClick={() => setScannedBook(p => ({ ...p, status: val }))} style={{
                    flex: 1, padding: "0.65rem 0.5rem", borderRadius: 10,
                    border: `1.5px solid ${scannedBook.status === val ? palette.accent : palette.border}`,
                    backgroundColor: scannedBook.status === val ? `${palette.accent}12` : palette.bgCard,
                    cursor: "pointer", ...body, fontSize: "0.82rem",
                    color: scannedBook.status === val ? palette.accent : palette.ink,
                  }}>{label}</button>
                ))}
              </div>
              <button onClick={() => handleAdd(scannedBook)} disabled={adding} style={{
                width: "100%", padding: "0.9rem", borderRadius: 12, border: "none",
                backgroundColor: palette.accent, color: palette.bg, cursor: "pointer",
                ...display, fontSize: "1.05rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}>
                {adding && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
                Agregar este libro
              </button>
            </div>
          )}
          {isbnStage === "notfound" && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <p style={{ ...body, color: palette.inkSoft, marginBottom: "1rem" }}>No encontramos ese ISBN. ¿Ingresarlo manualmente?</p>
              <button onClick={() => setMode("manual")} style={{
                padding: "0.75rem 1.5rem", borderRadius: 10, border: `1.5px solid ${palette.accent}`,
                backgroundColor: "transparent", cursor: "pointer", ...display, fontSize: "0.95rem", color: palette.accent,
              }}>Ingresar manualmente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OnboardingStep3({ user, addedFriend, setAddedFriend, onBack, onComplete, completing }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState({});
  const debounceRef = useRef(null);

  function handleSearch(val) {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("id, nombre, username, avatar_url")
        .or(`username.ilike.%${val.trim()}%,nombre.ilike.%${val.trim()}%`)
        .neq("id", user.id)
        .limit(10);
      setResults(data || []);
      setSearching(false);
    }, 300);
  }

  async function sendRequest(toId) {
    setActionLoading(p => ({ ...p, [toId]: true }));
    await supabase.from("friendships").insert({ user_id: user.id, friend_id: toId, status: "pending" });
    setSentIds(prev => new Set([...prev, toId]));
    setAddedFriend(true);
    setActionLoading(p => ({ ...p, [toId]: false }));
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
                  : <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: getAvatarColor(u.id || u.nombre), display: "flex", alignItems: "center", justifyContent: "center", ...display, fontSize: "1rem", color: "#FFFFFF", flexShrink: 0 }}>{initials}</div>
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.85rem", backgroundColor: "#2D6A4F18", border: "1.5px solid #2D6A4F44", borderRadius: 10, marginBottom: "1rem" }}>
          <CheckCircle2 size={16} color="#2D6A4F" />
          <span style={{ ...body, fontSize: "0.85rem", color: "#2D6A4F" }}>¡Solicitud enviada! Tu amigo la verá pronto.</span>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={completing}
        style={{
          width: "100%", padding: "0.9rem", borderRadius: 12, border: "none",
          backgroundColor: addedFriend ? "#2D6A4F" : palette.accent,
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
      await supabase.from("users").update({
        preferred_genres: selectedGenres,
        onboarding_completed: true,
      }).eq("id", user.id);
    } catch (err) { console.error("Error completing onboarding:", err); }
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
          {[1, 2, 3].map(n => (
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
          <div style={{ margin: "0.85rem 1.5rem 0", padding: "0.65rem 1rem", backgroundColor: "#C8924A14", border: "1px solid #C8924A30", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
          <OnboardingStep3
            user={user}
            addedFriend={addedFriend}
            setAddedFriend={setAddedFriend}
            onBack={() => goStep(2)}
            onComplete={handleComplete}
            completing={completing}
          />
        )}
      </div>
    </div>
  );
}

// ============ ONBOARDING ============
function OnboardingScreen({ user, onDone }) {
  const features = [
    {
      icon: "📚",
      title: "Cataloga tus libros",
      desc: "Escanea el código de barras o busca por título. Tu biblioteca siempre contigo.",
    },
    {
      icon: "✨",
      title: "Recibe recomendaciones por mood",
      desc: "Dile cómo te sientes y la IA te sugiere tu próxima lectura perfecta.",
    },
    {
      icon: "👥",
      title: "Conecta con lectores",
      desc: "Sigue a amigos, comparte lecturas y descubre libros a través de tu red.",
    },
  ];

  return (
    <div style={{ backgroundColor: palette.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", overflowY: "auto" }}>
      <style>{`
        ${FONT_LINK}
        @keyframes obFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes obFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ob-fade-up-1 { animation: obFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .ob-fade-up-2 { animation: obFadeUp 0.65s 0.15s cubic-bezier(0.22,1,0.36,1) both; }
        .ob-fade-up-3 { animation: obFadeUp 0.65s 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .ob-fade-up-4 { animation: obFadeUp 0.65s 0.42s cubic-bezier(0.22,1,0.36,1) both; }
        .ob-fade-up-5 { animation: obFadeUp 0.65s 0.58s cubic-bezier(0.22,1,0.36,1) both; }
        .ob-fade-up-6 { animation: obFadeUp 0.65s 0.72s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>

        {/* Logo */}
        <div className="ob-fade-up-1" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "22px", margin: "0 auto 1.1rem",
            background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.amber} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 32px ${palette.accent}44`,
          }}>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: "2.6rem", fontStyle: "italic", fontWeight: 700, color: palette.bg, lineHeight: 1 }}>F</span>
          </div>
          <h1 style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: "2.6rem", fontWeight: 700, color: palette.ink, margin: 0, lineHeight: 1 }}>
            Folio
          </h1>
        </div>

        {/* Tagline */}
        <div className="ob-fade-up-2" style={{ textAlign: "center", marginBottom: "2.25rem" }}>
          <p style={{ ...body, fontSize: "1.05rem", color: palette.inkSoft, lineHeight: 1.55, maxWidth: 300 }}>
            Tu biblioteca personal,<br />potenciada por <span style={{ color: palette.accent, fontWeight: 600 }}>IA</span>
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.25rem" }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`ob-fade-up-${i + 3}`}
              style={{
                backgroundColor: palette.bgCard,
                border: `1px solid ${palette.border}`,
                borderRadius: "14px",
                padding: "1rem 1.1rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
                boxShadow: "0 2px 10px rgba(42,31,26,0.06)",
              }}
            >
              <span style={{ fontSize: "1.6rem", lineHeight: 1, flexShrink: 0, marginTop: "0.1rem" }}>{f.icon}</span>
              <div>
                <p style={{ ...display, fontWeight: 700, fontSize: "0.95rem", color: palette.ink, marginBottom: "0.2rem" }}>{f.title}</p>
                <p style={{ ...body, fontSize: "0.83rem", color: palette.inkSoft, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="ob-fade-up-6" style={{ width: "100%" }}>
          <button
            onClick={onDone}
            style={{
              ...display,
              width: "100%",
              padding: "0.9rem 1.5rem",
              borderRadius: "12px",
              fontSize: "1.05rem",
              fontWeight: 700,
              background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.amber} 100%)`,
              color: palette.bg,
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 20px ${palette.accent}44`,
              letterSpacing: "0.01em",
            }}
          >
            Empezar mi biblioteca
          </button>
          <p className="ob-fade-up-6" style={{ ...body, textAlign: "center", fontSize: "0.78rem", color: palette.inkFaint, marginTop: "0.85rem" }}>
            Bienvenido/a, <span style={{ color: palette.inkSoft }}>{user?.name?.split(" ")[0] || "lector"}</span>
          </p>
        </div>

      </div>
    </div>
  );
}

// ============ ROOT ============
async function checkOnboardingNeeded(userId) {
  const { data } = await supabase.from("users").select("onboarding_completed").eq("id", userId).maybeSingle();
  return data?.onboarding_completed !== true;
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
      return (
        <div style={{ padding: 20, textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ marginBottom: 12 }}>Algo se rompió</h2>
          <p style={{ color: '#991b1b', marginBottom: 12, fontSize: 14 }}>{this.state.error?.message}</p>
          <pre style={{ fontSize: 11, textAlign: 'left', overflow: 'auto', maxHeight: '40vh', background: '#fee2e2', padding: 12, borderRadius: 4, marginBottom: 16 }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', backgroundColor: '#7A2E2E', color: '#fff', cursor: 'pointer', fontSize: 15 }}>
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
    getStoredUser().then(async (u) => {
      if (u) {
        setUser(u);
        const needed = await checkOnboardingNeeded(u.id);
        setShowOnboarding(needed);
        // If there's a ref and the user is already logged in, resolve the profile
        const savedRef = localStorage.getItem("folio_ref");
        if (savedRef) {
          resolveRefProfile(savedRef).then((p) => {
            if (p && p.id !== u.id) setRefUser(p);
          });
        }
      }
      setAuthLoaded(true);
    });
  }, []);

  async function handleLogin(u, isNew = false) {
    setUser(u);
    if (isNew) {
      setShowOnboarding(true);
    } else {
      const needed = await checkOnboardingNeeded(u.id);
      setShowOnboarding(needed);
    }
    // After login, resolve any pending ref
    const savedRef = localStorage.getItem("folio_ref");
    if (savedRef) {
      resolveRefProfile(savedRef).then((p) => {
        if (p && p.id !== u.id) setRefUser(p);
      });
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
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
  if (showOnboarding) return <NewUserOnboarding user={user} onComplete={() => setShowOnboarding(false)} />;
  return <ErrorBoundary><MainApp user={user} onLogout={handleLogout} initialRefUser={refUser} onRefUserConsumed={() => setRefUser(null)} /></ErrorBoundary>;
}

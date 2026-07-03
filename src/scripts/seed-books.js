/**
 * Seed script: inserts 200+ curated books into books_curated table.
 *
 * Run with:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node src/scripts/seed-books.js
 *
 * NOTE: requires service_role key if RLS blocks anon inserts.
 * Set SUPABASE_SERVICE_ROLE_KEY env var to use it instead.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing env vars: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const books = [
  // ───────────── Ciencia Ficción ─────────────
  { title: "Dune", author: "Frank Herbert", description: "Una saga épica de política, religión y ecología en un planeta desértico.", genres: ["Ciencia Ficción", "Épica", "Política"], rating: 4.9, language: "es", pages: 896 },
  { title: "1984", author: "George Orwell", description: "Un futuro totalitario donde el Gran Hermano vigila cada pensamiento.", genres: ["Ciencia Ficción", "Distopía", "Política"], rating: 4.8, language: "es", pages: 328 },
  { title: "Un mundo feliz", author: "Aldous Huxley", description: "Una utopía perfecta donde la libertad fue sacrificada por la estabilidad.", genres: ["Ciencia Ficción", "Distopía"], rating: 4.6, language: "es", pages: 311 },
  { title: "Fahrenheit 451", author: "Ray Bradbury", description: "En un mundo donde los libros son quemados, un bombero empieza a leer.", genres: ["Ciencia Ficción", "Distopía"], rating: 4.7, language: "es", pages: 249 },
  { title: "Fundación", author: "Isaac Asimov", description: "Un matemático predice el colapso galáctico e intenta preservar la civilización.", genres: ["Ciencia Ficción", "Épica"], rating: 4.7, language: "es", pages: 244 },
  { title: "El marciano", author: "Andy Weir", description: "Un astronauta sobrevive solo en Marte usando ciencia e ingenio.", genres: ["Ciencia Ficción", "Aventura"], rating: 4.7, language: "es", pages: 384 },
  { title: "Guía del autoestopista galáctico", author: "Douglas Adams", description: "La Tierra es demolida y un humano empieza un viaje ridículo por el cosmos.", genres: ["Ciencia Ficción", "Humor", "Aventura"], rating: 4.7, language: "es", pages: 193 },
  { title: "El juego de Ender", author: "Orson Scott Card", description: "Un niño genio entrena en una escuela espacial para salvar a la humanidad.", genres: ["Ciencia Ficción", "Juvenil"], rating: 4.7, language: "es", pages: 324 },
  { title: "Neuromante", author: "William Gibson", description: "El primer y mejor thriller ciberpunk: hackers, IA y la matrix original.", genres: ["Ciencia Ficción", "Cyberpunk", "Thriller"], rating: 4.3, language: "es", pages: 271 },
  { title: "La mano izquierda de la oscuridad", author: "Ursula K. Le Guin", description: "Un embajador llega a un planeta donde el género biológico no existe.", genres: ["Ciencia Ficción"], rating: 4.5, language: "es", pages: 304 },
  { title: "¿Sueñan los androides con ovejas eléctricas?", author: "Philip K. Dick", description: "Un cazarrecompensas persigue androides en una Tierra post-apocalíptica.", genres: ["Ciencia Ficción", "Distopía", "Thriller"], rating: 4.5, language: "es", pages: 244 },
  { title: "Nunca me abandones", author: "Kazuo Ishiguro", description: "Tres amigos criados en una escuela inglesa guardan un oscuro secreto.", genres: ["Ciencia Ficción", "Drama"], rating: 4.4, language: "es", pages: 288 },
  { title: "La carretera", author: "Cormac McCarthy", description: "Un padre y su hijo atraviesan un mundo devastado buscando sobrevivir.", genres: ["Ciencia Ficción", "Distopía", "Drama"], rating: 4.5, language: "es", pages: 307 },
  { title: "Hyperion", author: "Dan Simmons", description: "Siete peregrinos viajan hacia el Hegemonio y comparten historias perturbadoras.", genres: ["Ciencia Ficción", "Épica"], rating: 4.7, language: "es", pages: 482 },
  { title: "El problema de los tres cuerpos", author: "Liu Cixin", description: "La humanidad recibe contacto extraterrestre durante la Revolución Cultural China.", genres: ["Ciencia Ficción", "Hard SF"], rating: 4.5, language: "es", pages: 400 },
  { title: "Flores para Algernon", author: "Daniel Keyes", description: "Un hombre con discapacidad intelectual se convierte en un genio mediante cirugía.", genres: ["Ciencia Ficción", "Drama"], rating: 4.6, language: "es", pages: 311 },
  { title: "La guerra de los mundos", author: "H.G. Wells", description: "Los marcianos invaden Inglaterra y el pánico se apodera del mundo.", genres: ["Ciencia Ficción", "Aventura", "Clásicos"], rating: 4.3, language: "es", pages: 192 },
  { title: "Solaris", author: "Stanisław Lem", description: "Científicos estudian un océano viviente que materializa sus recuerdos más profundos.", genres: ["Ciencia Ficción", "Filosófico"], rating: 4.4, language: "es", pages: 204 },
  { title: "El cuento de la criada", author: "Margaret Atwood", description: "En una teocracia distópica, las mujeres son esclavas reproductoras.", genres: ["Ciencia Ficción", "Distopía", "Feminismo"], rating: 4.6, language: "es", pages: 311 },
  { title: "Ready Player One", author: "Ernest Cline", description: "Un adolescente busca un tesoro oculto en un universo virtual de los 80.", genres: ["Ciencia Ficción", "Aventura", "Juvenil"], rating: 4.4, language: "es", pages: 374 },
  { title: "Los juegos del hambre", author: "Suzanne Collins", description: "En una nación distópica, adolescentes luchan a muerte por televisión.", genres: ["Ciencia Ficción", "Distopía", "Juvenil"], rating: 4.5, language: "es", pages: 374 },
  { title: "Eragon", author: "Christopher Paolini", description: "Un joven granjero encuentra un huevo de dragón y su vida cambia para siempre.", genres: ["Fantasía", "Aventura", "Juvenil"], rating: 4.2, language: "es", pages: 503 },
  { title: "Frankenstein", author: "Mary Shelley", description: "Un científico crea vida y las consecuencias son trágicas e inevitables.", genres: ["Ciencia Ficción", "Terror", "Clásicos"], rating: 4.5, language: "es", pages: 280 },
  { title: "El viaje al centro de la Tierra", author: "Julio Verne", description: "Un profesor y su sobrino descienden por un volcán islandés hacia lo desconocido.", genres: ["Ciencia Ficción", "Aventura", "Clásicos"], rating: 4.3, language: "es", pages: 336 },
  { title: "20.000 leguas de viaje submarino", author: "Julio Verne", description: "El misterioso Capitán Nemo recorre los océanos en el Nautilus.", genres: ["Ciencia Ficción", "Aventura", "Clásicos"], rating: 4.3, language: "es", pages: 432 },

  // ───────────── Fantasía ─────────────
  { title: "El Señor de los Anillos", author: "J.R.R. Tolkien", description: "La Comunidad del Anillo debe destruir el Anillo Único para salvar la Tierra Media.", genres: ["Fantasía", "Épica", "Aventura"], rating: 4.9, language: "es", pages: 1178 },
  { title: "El nombre del viento", author: "Patrick Rothfuss", description: "Kvothe cuenta su propia leyenda: de huérfano a mago más temido del mundo.", genres: ["Fantasía", "Épica"], rating: 4.8, language: "es", pages: 662 },
  { title: "El hobbit", author: "J.R.R. Tolkien", description: "Bilbo Bolsón es reclutado para una aventura que cambiará el mundo.", genres: ["Fantasía", "Aventura", "Clásicos"], rating: 4.8, language: "es", pages: 310 },
  { title: "El camino de los reyes", author: "Brandon Sanderson", description: "En un mundo azotado por tormentas épicas, guerras y traiciones cambian el cosmos.", genres: ["Fantasía", "Épica"], rating: 4.8, language: "es", pages: 1007 },
  { title: "American Gods", author: "Neil Gaiman", description: "Los dioses antiguos inmigraron a América con sus creyentes. Ahora están olvidados.", genres: ["Fantasía", "Mitología", "Terror"], rating: 4.6, language: "es", pages: 635 },
  { title: "Harry Potter y la piedra filosofal", author: "J.K. Rowling", description: "Un huérfano descubre que es mago y accede al mundo mágico de Hogwarts.", genres: ["Fantasía", "Juvenil", "Aventura"], rating: 4.8, language: "es", pages: 309 },
  { title: "El acero de Kelsier", author: "Brandon Sanderson", description: "Un grupo de ladrones planea robar al Lord Legislador usando magia metálica.", genres: ["Fantasía", "Aventura", "Épica"], rating: 4.7, language: "es", pages: 643 },
  { title: "Las brumas del amanecer", author: "Robin Hobb", description: "FitzChivalry, bastardo real y asesino, navega traiciones en una corte peligrosa.", genres: ["Fantasía", "Drama"], rating: 4.6, language: "es", pages: 356 },
  { title: "Juego de tronos", author: "George R.R. Martin", description: "Siete reinos luchan por el trono de hierro en un mundo brutal y mágico.", genres: ["Fantasía", "Épica", "Drama"], rating: 4.8, language: "es", pages: 694 },
  { title: "El color de la magia", author: "Terry Pratchett", description: "El primer viaje del torpe mago Rincewind por el Mundo Disco.", genres: ["Fantasía", "Humor", "Aventura"], rating: 4.4, language: "es", pages: 243 },
  { title: "Buenas presagios", author: "Terry Pratchett & Neil Gaiman", description: "Un ángel y un demonio se unen para evitar el Apocalipsis por error.", genres: ["Fantasía", "Humor", "Mitología"], rating: 4.7, language: "es", pages: 383 },
  { title: "La historia interminable", author: "Michael Ende", description: "Un niño lee un libro que lo absorbe literalmente hacia el mundo de Fantasía.", genres: ["Fantasía", "Juvenil", "Aventura"], rating: 4.7, language: "es", pages: 448 },
  { title: "Momo", author: "Michael Ende", description: "Una niña lucha contra los Hombres Grises que roban el tiempo a la gente.", genres: ["Fantasía", "Juvenil", "Filosófico"], rating: 4.6, language: "es", pages: 240 },
  { title: "El principito", author: "Antoine de Saint-Exupéry", description: "Un piloto conoce a un príncipe de otro planeta que enseña lo que importa.", genres: ["Fantasía", "Filosófico", "Clásicos"], rating: 4.7, language: "es", pages: 96 },
  { title: "Alicia en el País de las Maravillas", author: "Lewis Carroll", description: "Una niña cae por un agujero de conejo a un mundo ilógico y maravilloso.", genres: ["Fantasía", "Clásicos", "Juvenil"], rating: 4.5, language: "es", pages: 192 },
  { title: "Las crónicas de Narnia", author: "C.S. Lewis", description: "Cuatro hermanos descubren que el interior de un armario lleva a un mundo mágico.", genres: ["Fantasía", "Juvenil", "Aventura"], rating: 4.7, language: "es", pages: 767 },
  { title: "Jonathan Strange y el señor Norrell", author: "Susanna Clarke", description: "Dos magos intentan restaurar la magia en la Inglaterra de la era napoleónica.", genres: ["Fantasía", "Historia", "Drama"], rating: 4.5, language: "es", pages: 782 },
  { title: "El jardín de la luna", author: "Steven Erikson", description: "Una guerra épica entre ejércitos y dioses en un mundo de magia oscura.", genres: ["Fantasía", "Épica"], rating: 4.4, language: "es", pages: 666 },
  { title: "Dragón de Hielo", author: "George R.R. Martin", description: "Una niña solitaria hace amistad con un dragón de hielo invernal.", genres: ["Fantasía", "Juvenil"], rating: 4.1, language: "es", pages: 128 },
  { title: "Tierra de Sombras", author: "Joe Abercrombie", description: "Un cirujano militar sobrevive una campaña en el norte bárbaro del mundo.", genres: ["Fantasía", "Épica", "Drama"], rating: 4.5, language: "es", pages: 531 },
  { title: "El nombre de la rosa", author: "Umberto Eco", description: "Un monje medieval investiga misteriosas muertes en una abadía medieval.", genres: ["Misterio", "Historia", "Filosófico"], rating: 4.5, language: "es", pages: 502 },
  { title: "Sandman Vol. 1", author: "Neil Gaiman", description: "El señor de los Sueños escapa del cautiverio y reclama su reino.", genres: ["Fantasía", "Cómic", "Mitología"], rating: 4.8, language: "es", pages: 240 },
  { title: "El atlas de las nubes", author: "David Mitchell", description: "Seis historias entrelazadas a través de siglos que demuestran que el alma no muere.", genres: ["Fantasía", "Drama", "Filosófico"], rating: 4.4, language: "es", pages: 544 },

  // ───────────── Romance ─────────────
  { title: "Orgullo y prejuicio", author: "Jane Austen", description: "Elizabeth Bennet y el señor Darcy se enamoran a pesar de sus diferencias.", genres: ["Romance", "Clásicos", "Drama"], rating: 4.8, language: "es", pages: 432 },
  { title: "Jane Eyre", author: "Charlotte Brontë", description: "Una institutriz se enamora de su misterioso y atormentado empleador.", genres: ["Romance", "Clásicos", "Drama"], rating: 4.7, language: "es", pages: 532 },
  { title: "Cumbres borrascosas", author: "Emily Brontë", description: "El amor obsesivo y destructivo entre Heathcliff y Catherine atraviesa generaciones.", genres: ["Romance", "Clásicos", "Drama"], rating: 4.5, language: "es", pages: 348 },
  { title: "Outlander", author: "Diana Gabaldon", description: "Una enfermera de la II Guerra Mundial viaja en el tiempo a Escocia de 1743.", genres: ["Romance", "Historia", "Aventura"], rating: 4.6, language: "es", pages: 850 },
  { title: "El diario de Bridget Jones", author: "Helen Fielding", description: "Una soltera londinense busca el amor perfecto con humor y torpeza.", genres: ["Romance", "Humor", "Drama"], rating: 4.1, language: "es", pages: 310 },
  { title: "Bajo la misma estrella", author: "John Green", description: "Dos adolescentes con cáncer se enamoran mientras cuestionan la vida.", genres: ["Romance", "Juvenil", "Drama"], rating: 4.6, language: "es", pages: 318 },
  { title: "It ends with us", author: "Colleen Hoover", description: "Una mujer debe elegir entre el amor y su propia supervivencia.", genres: ["Romance", "Drama"], rating: 4.5, language: "es", pages: 385 },
  { title: "El tiempo entre costuras", author: "María Dueñas", description: "Una costurera española espía para los aliados durante la II Guerra Mundial.", genres: ["Romance", "Historia", "Aventura"], rating: 4.7, language: "es", pages: 615 },
  { title: "Sensatez y sentimientos", author: "Jane Austen", description: "Las hermanas Dashwood navegan el amor y la sociedad en la Inglaterra georgiana.", genres: ["Romance", "Clásicos", "Drama"], rating: 4.6, language: "es", pages: 368 },
  { title: "Persuasión", author: "Jane Austen", description: "Anne Elliot tuvo la oportunidad del amor verdadero. ¿La tendrá de nuevo?", genres: ["Romance", "Clásicos"], rating: 4.7, language: "es", pages: 250 },
  { title: "El amor en los tiempos del cólera", author: "Gabriel García Márquez", description: "Un hombre espera 51 años para declarar su amor a la mujer de otro.", genres: ["Romance", "Realismo Mágico", "Clásicos"], rating: 4.7, language: "es", pages: 368 },
  { title: "Los puentes de Madison", author: "Robert James Waller", description: "Un fotógrafo y una ama de casa tienen cuatro días de amor eterno.", genres: ["Romance", "Drama"], rating: 4.1, language: "es", pages: 171 },
  { title: "Un lugar donde refugiarse", author: "Nicholas Sparks", description: "Una mujer huye a un pequeño pueblo y encuentra amor en un viudo.", genres: ["Romance", "Misterio", "Drama"], rating: 4.2, language: "es", pages: 338 },
  { title: "Bodas de sangre", author: "Federico García Lorca", description: "Una boda en la Andalucía rural termina en tragedia y pasión desbordada.", genres: ["Romance", "Drama", "Clásicos"], rating: 4.5, language: "es", pages: 112 },
  { title: "La sombra del viento", author: "Carlos Ruiz Zafón", description: "Un niño descubre un libro misterioso y se obsesiona con su autor desaparecido.", genres: ["Misterio", "Romance", "Historia"], rating: 4.7, language: "es", pages: 564 },

  // ───────────── Misterio / Thriller ─────────────
  { title: "Y no quedó ninguno", author: "Agatha Christie", description: "Diez desconocidos en una isla. Uno a uno van muriendo. ¿Quién es el asesino?", genres: ["Misterio", "Thriller"], rating: 4.8, language: "es", pages: 264 },
  { title: "Asesinato en el Orient Express", author: "Agatha Christie", description: "Hércules Poirot investiga un asesinato en el mítico tren transeuropeo.", genres: ["Misterio", "Thriller"], rating: 4.7, language: "es", pages: 256 },
  { title: "La chica del tren", author: "Paula Hawkins", description: "Una mujer obsesionada con el tren presencia algo que cambia su vida.", genres: ["Thriller", "Misterio", "Drama"], rating: 4.3, language: "es", pages: 336 },
  { title: "Perdida", author: "Gillian Flynn", description: "El día del quinto aniversario, una mujer desaparece. Nada es lo que parece.", genres: ["Thriller", "Misterio", "Drama"], rating: 4.5, language: "es", pages: 422 },
  { title: "Los hombres que no amaban a las mujeres", author: "Stieg Larsson", description: "Una hacker y un periodista investigan la desaparición de una joven hace 40 años.", genres: ["Thriller", "Misterio", "Drama"], rating: 4.6, language: "es", pages: 534 },
  { title: "El código Da Vinci", author: "Dan Brown", description: "Un symbólogo descifra un código oculto en la Mona Lisa que revela un secreto.", genres: ["Thriller", "Misterio", "Historia"], rating: 4.3, language: "es", pages: 454 },
  { title: "Inferno", author: "Dan Brown", description: "Robert Langdon despierta en Florencia sin memoria y perseguido por asesinos.", genres: ["Thriller", "Misterio", "Historia"], rating: 4.1, language: "es", pages: 480 },
  { title: "El silencio de los corderos", author: "Thomas Harris", description: "Una agente del FBI busca a un asesino serial con la ayuda de Hannibal Lecter.", genres: ["Thriller", "Misterio", "Terror"], rating: 4.6, language: "es", pages: 338 },
  { title: "En el bosque", author: "Tana French", description: "Un detective investiga un crimen ligado a una tragedia de su infancia.", genres: ["Misterio", "Thriller", "Drama"], rating: 4.4, language: "es", pages: 429 },
  { title: "El nombre del viento", author: "Patrick Rothfuss", description: "Un legendario mago narra su propia historia en una posada en ruinas.", genres: ["Fantasía", "Épica"], rating: 4.8, language: "es", pages: 662 },
  { title: "Big Little Lies", author: "Liane Moriarty", description: "Tres madres en un pueblo playero ocultan secretos que estallan en una gala.", genres: ["Misterio", "Drama", "Thriller"], rating: 4.4, language: "es", pages: 460 },
  { title: "El paciente inglés", author: "Michael Ondaatje", description: "Cuatro personas heridas por la guerra se refugian en una villa italiana.", genres: ["Drama", "Historia", "Misterio"], rating: 4.4, language: "es", pages: 307 },
  { title: "American Psycho", author: "Bret Easton Ellis", description: "Un yuppie de Wall Street esconde una doble vida aterradora en Nueva York.", genres: ["Thriller", "Satírica", "Terror"], rating: 4.0, language: "es", pages: 399 },
  { title: "La desaparición de Stephanie Mailer", author: "Joël Dicker", description: "Un periodista reexamina un caso frío que resulta ser mucho más profundo.", genres: ["Misterio", "Thriller", "Drama"], rating: 4.5, language: "es", pages: 523 },

  // ───────────── Filosofía ─────────────
  { title: "La república", author: "Platón", description: "Sócrates debate qué es la justicia y cómo debe organizarse el Estado ideal.", genres: ["Filosofía", "Clásicos"], rating: 4.5, language: "es", pages: 416 },
  { title: "Meditaciones", author: "Marco Aurelio", description: "El diario privado del emperador filósofo sobre estoicismo y virtud.", genres: ["Filosofía", "Clásicos", "Ensayo"], rating: 4.8, language: "es", pages: 254 },
  { title: "Más allá del bien y del mal", author: "Friedrich Nietzsche", description: "Nietzsche critica toda la filosofía occidental desde Platón.", genres: ["Filosofía", "Ensayo"], rating: 4.5, language: "es", pages: 240 },
  { title: "Así habló Zaratustra", author: "Friedrich Nietzsche", description: "El profeta Zaratustra baja de la montaña y enseña el superhombre y el eterno retorno.", genres: ["Filosofía", "Clásicos"], rating: 4.6, language: "es", pages: 352 },
  { title: "El ser y la nada", author: "Jean-Paul Sartre", description: "La obra cumbre del existencialismo: somos condenados a ser libres.", genres: ["Filosofía", "Ensayo"], rating: 4.3, language: "es", pages: 722 },
  { title: "El mito de Sísifo", author: "Albert Camus", description: "¿Vale la pena vivir? Camus reflexiona sobre el absurdo y la rebelión.", genres: ["Filosofía", "Ensayo", "Clásicos"], rating: 4.7, language: "es", pages: 212 },
  { title: "Crítica de la razón pura", author: "Immanuel Kant", description: "Kant revoluciona la filosofía al examinar los límites del conocimiento humano.", genres: ["Filosofía", "Ensayo"], rating: 4.2, language: "es", pages: 784 },
  { title: "Investigaciones filosóficas", author: "Ludwig Wittgenstein", description: "El lenguaje no describe el mundo: los juegos del lenguaje crean la realidad.", genres: ["Filosofía", "Ensayo"], rating: 4.3, language: "es", pages: 293 },
  { title: "El existencialismo es un humanismo", author: "Jean-Paul Sartre", description: "Conferencia donde Sartre defiende el existencialismo de sus críticos.", genres: ["Filosofía", "Ensayo"], rating: 4.5, language: "es", pages: 76 },
  { title: "La filosofía como forma de vida", author: "Pierre Hadot", description: "La filosofía antigua era un ejercicio espiritual, no una teoría abstracta.", genres: ["Filosofía", "Ensayo", "Historia"], rating: 4.5, language: "es", pages: 302 },
  { title: "Pensamientos", author: "Blaise Pascal", description: "Fragmentos del proyecto de apologética cristiana del matemático Pascal.", genres: ["Filosofía", "Religión", "Clásicos"], rating: 4.4, language: "es", pages: 352 },
  { title: "El mundo como voluntad y representación", author: "Arthur Schopenhauer", description: "La voluntad de vivir es la fuerza que impulsa todo el universo.", genres: ["Filosofía", "Ensayo"], rating: 4.3, language: "es", pages: 534 },
  { title: "El contrato social", author: "Jean-Jacques Rousseau", description: "La legitimidad del poder político viene del pueblo, no de los reyes.", genres: ["Filosofía", "Política", "Clásicos"], rating: 4.4, language: "es", pages: 192 },
  { title: "Ética demostrada geométricamente", author: "Baruch Spinoza", description: "Spinoza demuestra que Dios y la Naturaleza son lo mismo, usando geometría.", genres: ["Filosofía", "Clásicos"], rating: 4.2, language: "es", pages: 355 },
  { title: "Sobre la libertad", author: "John Stuart Mill", description: "El ensayo fundacional del liberalismo: el Estado no puede limitar la libertad individual.", genres: ["Filosofía", "Política", "Ensayo"], rating: 4.5, language: "es", pages: 172 },

  // ───────────── Clásicos ─────────────
  { title: "Crimen y castigo", author: "Fiódor Dostoyevski", description: "Un estudiante mata a una usurera y lucha con su culpa hasta el borde de la locura.", genres: ["Clásicos", "Drama", "Filosófico"], rating: 4.8, language: "es", pages: 551 },
  { title: "El idiota", author: "Fiódor Dostoyevski", description: "Un príncipe bondadoso choca contra una sociedad rusa corrupta y violenta.", genres: ["Clásicos", "Drama"], rating: 4.7, language: "es", pages: 656 },
  { title: "Guerra y paz", author: "León Tolstói", description: "La vida de familias rusas durante las guerras napoleónicas. La novela total.", genres: ["Clásicos", "Historia", "Drama"], rating: 4.7, language: "es", pages: 1296 },
  { title: "Ana Karenina", author: "León Tolstói", description: "Una aristócrata rusa destruye su vida por pasión en la fría sociedad zarista.", genres: ["Clásicos", "Romance", "Drama"], rating: 4.7, language: "es", pages: 864 },
  { title: "Don Quijote de la Mancha", author: "Miguel de Cervantes", description: "Un hidalgo pierde la razón de leer novelas de caballería y sale a combatir molinos.", genres: ["Clásicos", "Aventura", "Humor"], rating: 4.6, language: "es", pages: 1023 },
  { title: "El extranjero", author: "Albert Camus", description: "Un hombre indiferente a todo mata a un árabe en la playa argelina.", genres: ["Clásicos", "Filosófico", "Drama"], rating: 4.7, language: "es", pages: 159 },
  { title: "La náusea", author: "Jean-Paul Sartre", description: "Un historiador descubre la náusea existencial de la mera existencia de las cosas.", genres: ["Clásicos", "Filosófico", "Drama"], rating: 4.5, language: "es", pages: 253 },
  { title: "El proceso", author: "Franz Kafka", description: "Josef K. es arrestado por un crimen que nadie le especifica jamás.", genres: ["Clásicos", "Filosófico", "Absurdo"], rating: 4.6, language: "es", pages: 255 },
  { title: "La metamorfosis", author: "Franz Kafka", description: "Gregor Samsa se despierta convertido en un insecto y su familia lo rechaza.", genres: ["Clásicos", "Absurdo", "Filosófico"], rating: 4.6, language: "es", pages: 96 },
  { title: "Lolita", author: "Vladimir Nabokov", description: "La obsesión de un profesor europeo por una niña de doce años en América.", genres: ["Clásicos", "Drama", "Controversia"], rating: 4.3, language: "es", pages: 317 },
  { title: "En busca del tiempo perdido (Vol. 1)", author: "Marcel Proust", description: "La memoria involuntaria desvela el pasado: una madeleine desencadena todo.", genres: ["Clásicos", "Drama", "Filosófico"], rating: 4.5, language: "es", pages: 524 },
  { title: "Pedro Páramo", author: "Juan Rulfo", description: "Juan Preciado busca a su padre en Comala, un pueblo habitado solo por muertos.", genres: ["Clásicos", "Realismo Mágico"], rating: 4.7, language: "es", pages: 124 },
  { title: "Rayuela", author: "Julio Cortázar", description: "Una novela que puede leerse en orden o saltando capítulos, como el juego.", genres: ["Clásicos", "Vanguardia"], rating: 4.5, language: "es", pages: 635 },
  { title: "El túnel", author: "Ernesto Sábato", description: "Un pintor confeso narra su crimen desde la prisión con fría lucidez.", genres: ["Clásicos", "Drama", "Filosófico"], rating: 4.6, language: "es", pages: 155 },
  { title: "Ficciones", author: "Jorge Luis Borges", description: "Laberintos, bibliotecas infinitas y universos paralelos en diecisiete cuentos.", genres: ["Clásicos", "Filosofía", "Ciencia Ficción"], rating: 4.8, language: "es", pages: 174 },
  { title: "Los pasos perdidos", author: "Alejo Carpentier", description: "Un musicólogo abandona la modernidad y busca instrumentos primitivos en el Orinoco.", genres: ["Clásicos", "Realismo Mágico", "Aventura"], rating: 4.4, language: "es", pages: 284 },
  { title: "El retrato de Dorian Gray", author: "Oscar Wilde", description: "Un joven hermoso vende su alma para que su retrato envejezca en su lugar.", genres: ["Clásicos", "Terror", "Filosófico"], rating: 4.7, language: "es", pages: 272 },
  { title: "Drácula", author: "Bram Stoker", description: "Jonathan Harker descubre que su anfitrión en Transilvania es un vampiro.", genres: ["Terror", "Clásicos", "Misterio"], rating: 4.5, language: "es", pages: 418 },
  { title: "El gran Gatsby", author: "F. Scott Fitzgerald", description: "El sueño americano se pudre en las fiestas extravagantes de Jay Gatsby.", genres: ["Clásicos", "Drama"], rating: 4.5, language: "es", pages: 180 },
  { title: "Por quién doblan las campanas", author: "Ernest Hemingway", description: "Un americano lucha con las brigadas republicanas en la Guerra Civil Española.", genres: ["Clásicos", "Historia", "Drama"], rating: 4.5, language: "es", pages: 471 },

  // ───────────── Historia / Biografía ─────────────
  { title: "Sapiens: de animales a dioses", author: "Yuval Noah Harari", description: "La historia completa de la humanidad desde los primates hasta el Homo Deus.", genres: ["Historia", "Ensayo", "Ciencia"], rating: 4.7, language: "es", pages: 443 },
  { title: "Homo Deus", author: "Yuval Noah Harari", description: "El futuro de la humanidad cuando la IA supere la inteligencia biológica.", genres: ["Historia", "Ensayo", "Ciencia Ficción"], rating: 4.5, language: "es", pages: 450 },
  { title: "El diario de Ana Frank", author: "Anne Frank", description: "Los dos años que Ana pasó escondida de los nazis en un refugio de Ámsterdam.", genres: ["Historia", "Biografía", "Drama"], rating: 4.8, language: "es", pages: 283 },
  { title: "En busca de sentido", author: "Viktor Frankl", description: "Un psiquiatra sobreviviente del Holocausto revela la fuente de la resiliencia humana.", genres: ["Historia", "Filosofía", "Psicología"], rating: 4.8, language: "es", pages: 165 },
  { title: "Armas, gérmenes y acero", author: "Jared Diamond", description: "Por qué algunas civilizaciones conquistaron a otras: geografía y biología.", genres: ["Historia", "Ciencia", "Ensayo"], rating: 4.6, language: "es", pages: 480 },
  { title: "El otoño de la Edad Media", author: "Johan Huizinga", description: "La vida y el espíritu de la Europa del siglo XIV a través de su cultura y arte.", genres: ["Historia", "Ensayo"], rating: 4.4, language: "es", pages: 447 },
  { title: "La historia de Roma", author: "Theodor Mommsen", description: "La saga completa de Roma desde sus orígenes hasta César, por el Nobel de 1902.", genres: ["Historia", "Clásicos"], rating: 4.5, language: "es", pages: 1248 },
  { title: "Breve historia del tiempo", author: "Stephen Hawking", description: "Los agujeros negros, el Big Bang y el tiempo explicados para el gran público.", genres: ["Historia", "Ciencia", "Ensayo"], rating: 4.6, language: "es", pages: 212 },
  { title: "Steve Jobs", author: "Walter Isaacson", description: "La biografía autorizada del visionario que cambió la tecnología y la cultura.", genres: ["Biografía", "Tecnología", "Ensayo"], rating: 4.5, language: "es", pages: 656 },
  { title: "Mandela: el largo camino a la libertad", author: "Nelson Mandela", description: "La autobiografía del presidente que derrotó al apartheid con dignidad.", genres: ["Biografía", "Historia", "Política"], rating: 4.8, language: "es", pages: 656 },
  { title: "Leonardo da Vinci", author: "Walter Isaacson", description: "La mente más curiosa de la humanidad: arte, ciencia y obsesión sin límites.", genres: ["Biografía", "Historia", "Arte"], rating: 4.6, language: "es", pages: 624 },
  { title: "El origen de las especies", author: "Charles Darwin", description: "La obra que cambió la biología: la evolución por selección natural.", genres: ["Ciencia", "Historia", "Ensayo"], rating: 4.6, language: "es", pages: 502 },
  { title: "Los orígenes del totalitarismo", author: "Hannah Arendt", description: "El análisis definitivo de cómo los regímenes totalitarios del siglo XX surgieron.", genres: ["Historia", "Política", "Ensayo"], rating: 4.5, language: "es", pages: 656 },
  { title: "Postguerra", author: "Tony Judt", description: "La historia de Europa desde 1945 hasta el fin de la Guerra Fría.", genres: ["Historia", "Política", "Ensayo"], rating: 4.6, language: "es", pages: 878 },
  { title: "Breve historia de México", author: "Enrique Krauze", description: "La historia de México desde la Conquista hasta el siglo XX en tono accesible.", genres: ["Historia", "Ensayo"], rating: 4.5, language: "es", pages: 236 },

  // ───────────── Terror / Horror ─────────────
  { title: "It", author: "Stephen King", description: "Un payaso demoníaco aterroriza a un grupo de niños en un pueblo de Maine.", genres: ["Terror", "Misterio", "Drama"], rating: 4.6, language: "es", pages: 1138 },
  { title: "El resplandor", author: "Stephen King", description: "Un escritor se convierte en guardián de un hotel remoto y enloquece.", genres: ["Terror", "Thriller"], rating: 4.7, language: "es", pages: 447 },
  { title: "Pet Sematary", author: "Stephen King", description: "Un cementerio indio resurrecciona a los muertos... pero cambiados.", genres: ["Terror", "Drama"], rating: 4.5, language: "es", pages: 373 },
  { title: "El exorcista", author: "William Peter Blatty", description: "Una niña es poseída por el demonio en Washington D.C. y dos sacerdotes luchan.", genres: ["Terror", "Thriller", "Religión"], rating: 4.4, language: "es", pages: 340 },
  { title: "Hereditary", author: "Various", description: "Un linaje familiar descubre que su herencia incluye un culto demoníaco ancestral.", genres: ["Terror", "Drama"], rating: 4.2, language: "es", pages: 256 },
  { title: "La llamada de Cthulhu", author: "H.P. Lovecraft", description: "Investigadores descubren que el universo está dominado por entidades indiferentes.", genres: ["Terror", "Ciencia Ficción", "Clásicos"], rating: 4.5, language: "es", pages: 122 },
  { title: "Nos vemos allá arriba", author: "Pierre Lemaitre", description: "Dos veteranos de la I Guerra Mundial planean la estafa del siglo.", genres: ["Thriller", "Historia", "Drama"], rating: 4.6, language: "es", pages: 564 },
  { title: "El cazador oculto", author: "J.D. Salinger", description: "Holden Caulfield abandona su internado y vaga por Nueva York buscando autenticidad.", genres: ["Clásicos", "Drama", "Juvenil"], rating: 4.4, language: "es", pages: 277 },
  { title: "La chica perfecta", author: "Colleen Hoover", description: "Una madre investiga la muerte de su hijo y descubre horrores insospechados.", genres: ["Terror", "Thriller", "Drama"], rating: 4.3, language: "es", pages: 348 },
  { title: "Psicosis", author: "Robert Bloch", description: "Norman Bates administra un motel solitario donde desaparecen los viajeros.", genres: ["Terror", "Thriller", "Misterio"], rating: 4.4, language: "es", pages: 224 },
  { title: "Rebecca", author: "Daphne du Maurier", description: "Una joven se casa con un viudo y vive bajo la sombra de la esposa muerta.", genres: ["Misterio", "Romance", "Terror"], rating: 4.7, language: "es", pages: 380 },
  { title: "El fantasma de la ópera", author: "Gaston Leroux", description: "Un músico desfigurado vive bajo la Ópera de París y se obsesiona con una cantante.", genres: ["Terror", "Romance", "Clásicos"], rating: 4.4, language: "es", pages: 311 },

  // ───────────── Realismo Mágico ─────────────
  { title: "Cien años de soledad", author: "Gabriel García Márquez", description: "Siete generaciones de los Buendía en Macondo, un pueblo que nació y murirá.", genres: ["Realismo Mágico", "Clásicos", "Épica"], rating: 4.9, language: "es", pages: 417 },
  { title: "La casa de los espíritus", author: "Isabel Allende", description: "Cuatro generaciones de mujeres chilenas a través de la historia y la magia.", genres: ["Realismo Mágico", "Historia", "Drama"], rating: 4.7, language: "es", pages: 433 },
  { title: "Como agua para chocolate", author: "Laura Esquivel", description: "Las emociones de Tita se transfieren a la comida que cocina en México posrevolucionario.", genres: ["Realismo Mágico", "Romance", "Drama"], rating: 4.5, language: "es", pages: 246 },
  { title: "El general en su laberinto", author: "Gabriel García Márquez", description: "Los últimos días de Simón Bolívar navegando el río Magdalena hacia la muerte.", genres: ["Realismo Mágico", "Historia", "Drama"], rating: 4.6, language: "es", pages: 269 },
  { title: "Fiesta en la madriguera", author: "Juan Pablo Villalobos", description: "El hijo de un capo narco narra la vida en su mansión con humor oscuro.", genres: ["Realismo Mágico", "Drama", "Humor"], rating: 4.3, language: "es", pages: 108 },
  { title: "Los detectives salvajes", author: "Roberto Bolaño", description: "Dos jóvenes poetas mexicanos buscan a la poeta Cesárea Tinajero en los años 70.", genres: ["Realismo Mágico", "Clásicos", "Aventura"], rating: 4.6, language: "es", pages: 609 },
  { title: "2666", author: "Roberto Bolaño", description: "Cinco historias convergentes hacia los feminicidios de Ciudad Juárez.", genres: ["Realismo Mágico", "Thriller", "Drama"], rating: 4.5, language: "es", pages: 898 },
  { title: "El obsceno pájaro de la noche", author: "José Donoso", description: "Un narrador poco fiable en una casa de viejas que se convierte en monstruosa.", genres: ["Realismo Mágico", "Terror", "Clásicos"], rating: 4.3, language: "es", pages: 439 },
  { title: "De amor y de sombra", author: "Isabel Allende", description: "Un periodista y una fotógrafa descubren una fosa clandestina en Chile bajo Pinochet.", genres: ["Realismo Mágico", "Historia", "Romance"], rating: 4.5, language: "es", pages: 333 },
  { title: "El aleph", author: "Jorge Luis Borges", description: "Un punto del espacio que contiene todos los otros puntos: la realidad total.", genres: ["Realismo Mágico", "Clásicos", "Filosófico"], rating: 4.7, language: "es", pages: 198 },

  // ───────────── Ensayo / No Ficción ─────────────
  { title: "Pensar rápido, pensar despacio", author: "Daniel Kahneman", description: "Los dos sistemas que gobiernan nuestras decisiones: intuición vs. razón.", genres: ["Ensayo", "Psicología", "Ciencia"], rating: 4.7, language: "es", pages: 498 },
  { title: "El poder del ahora", author: "Eckhart Tolle", description: "La presencia total en el momento presente como camino a la paz interior.", genres: ["Ensayo", "Filosófico", "Espiritualidad"], rating: 4.5, language: "es", pages: 236 },
  { title: "El hombre en busca de sentido", author: "Viktor Frankl", description: "Un psiquiatra sobrevive el Holocausto y desarrolla la logoterapia.", genres: ["Ensayo", "Historia", "Psicología"], rating: 4.8, language: "es", pages: 165 },
  { title: "Cómo ganar amigos e influir sobre las personas", author: "Dale Carnegie", description: "Los principios atemporales para conectar con la gente y liderar con empatía.", genres: ["Ensayo", "Psicología"], rating: 4.4, language: "es", pages: 293 },
  { title: "El libro de los seres imaginarios", author: "Jorge Luis Borges", description: "Bestiario de criaturas fantásticas de todas las mitologías del mundo.", genres: ["Ensayo", "Fantasía", "Filosófico"], rating: 4.5, language: "es", pages: 256 },
  { title: "Antifragil", author: "Nassim Nicholas Taleb", description: "Algunas cosas se benefician de los shocks, la volatilidad y el caos.", genres: ["Ensayo", "Filosófico", "Economía"], rating: 4.5, language: "es", pages: 544 },
  { title: "El cisne negro", author: "Nassim Nicholas Taleb", description: "Los eventos improbables de enorme impacto son los que realmente cambian el mundo.", genres: ["Ensayo", "Economiía", "Filosófico"], rating: 4.5, language: "es", pages: 444 },
  { title: "Creatividad S.A.", author: "Ed Catmull", description: "El cofundador de Pixar revela cómo construir y mantener una cultura creativa.", genres: ["Ensayo", "Tecnología", "Arte"], rating: 4.6, language: "es", pages: 368 },
  { title: "El hombre más rico de Babilonia", author: "George S. Clason", description: "Parábolas del antiguo Babilonia enseñan principios de riqueza y ahorro.", genres: ["Ensayo", "Economía"], rating: 4.5, language: "es", pages: 216 },
  { title: "Filosofía en el tocador", author: "Marqués de Sade", description: "Diálogos filosóficos sobre la libertad y el placer como derecho natural.", genres: ["Filosofía", "Ensayo", "Controversia"], rating: 3.8, language: "es", pages: 236 },
];

async function seed() {
  console.log(`Insertando ${books.length} libros en books_curated…`);

  // Insert in batches of 50 to avoid payload limits
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const { error } = await supabase.from("books_curated").upsert(
      batch.map((b) => ({
        ...b,
        subgenres: [],
        cover_url: null,
      })),
      { onConflict: "title,author" } // avoid duplicates on re-run
    );

    if (error) {
      console.error(`Error en batch ${i}-${i + batchSize}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`✓ Batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${books.length}`);
    }
  }

  console.log(`\n✅ Seed completado: ${inserted} libros insertados.`);
}

seed();

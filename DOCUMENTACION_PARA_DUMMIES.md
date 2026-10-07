# SEMA — Guía para cofundadores, sin tecnicismos

> Preparado el 28 de septiembre de 2026 para la reunión con BIDIUAM del martes 29 de septiembre de 2026. Ampliado el 28 de septiembre de 2026 con las secciones 11 a 16.
> Cómo leer este documento: no hace falta leerlo de corrido. Cada sección responde una pregunta concreta. Cuando aparece una palabra rara, se explica en la misma línea — no tienes que buscar nada aparte.

---

## 1. ¿Qué es SEMA en una sola oración?

SEMA es una app para llevar tu biblioteca personal, mantener el hábito de leer con una racha diaria y una mascota que crece contigo, platicar de libros con tus amigos, y hasta intercambiar libros físicos con otros lectores — pensada para gente joven en México a la que le cuesta trabajo agarrarle el ritmo a la lectura.

---

## 2. ¿Cómo funciona la app por dentro? (La cocina)

Imagina que SEMA es un restaurante. El cliente —la persona que usa la app en su celular— nunca entra a la cocina: solo ve el menú, pide lo que quiere, y el mesero le trae el platillo. Esa parte que el cliente sí ve y toca —los botones, las pantallas, los colores— es lo que en software se llama el "frontend". Es literalmente lo único que corre dentro del teléfono de la persona.

Detrás del menú está la cocina, donde de verdad se preparan las cosas: ahí se checa si hay ingredientes, se cobra la cuenta, se decide si el platillo se puede hacer o no. Esa cocina, en una app, se llama "servidor" (o "backend"): un programa que corre en una computadora rentada en algún centro de datos, no en el celular del usuario. La cocina es la que manda: decide qué es válido y qué no.

Y toda cocina necesita una bodega donde se guardan los ingredientes: la harina, el aceite, la carne. En una app esa bodega es la "base de datos": un lugar donde se guarda cada dato —cada libro, cada usuario, cada mensaje— de forma ordenada, para poder encontrarlo después.

¿Y en SEMA, específicamente? El menú (el frontend) es el código que se descarga al navegador o celular del usuario cuando abre la app; incluso se puede "instalar" como si fuera una app nativa, aunque por dentro sigue siendo una página web. La cocina y la bodega casi no las construimos nosotros desde cero: rentamos ambas, ya armadas y con seguridad incluida, a un proveedor llamado Supabase. Solo un par de tareas puntuales —como pedirle a una Inteligencia Artificial que resuma un libro, o buscar un título en Google— corren en cocinas propias muy pequeñas, rentadas a otro proveedor llamado Vercel.

¿Por qué así? Porque somos un equipo chico, sin experiencia previa en programación, y construir y mantener nuestra propia cocina grande —con toda la seguridad que eso implica— nos hubiera tomado meses. Rentar servicios ya armados y confiables nos dejó enfocarnos en la app en sí.

---

## 3. ¿Qué información guarda la app y dónde?

**Datos de usuarios.** Nombre, nombre de usuario (como el "arroba" de redes sociales), correo (lo guardamos pero nadie más lo puede ver), foto de perfil y de portada, una breve biografía, qué géneros le gustan, y si su perfil es público o privado. Lo guardamos porque sin esto no podríamos ni iniciarle sesión ni personalizarle lo que le mostramos. Vive en Supabase, nuestra bodega en la nube.

**Datos de libros.** Cada libro que un usuario agrega a su biblioteca: título, autor, género, portada, en qué estado va (lo está leyendo, ya lo leyó, lo quiere leer), su calificación y su reseña. Ojo: cada usuario tiene su propia lista; no existe "un libro" compartido entre todos, cada quien guarda su propia copia de la información. Aparte tenemos un catálogo de unos 500 libros que armamos nosotros a mano, que solo sirve para las recomendaciones tipo "desliza si te gusta". Todo vive en la misma bodega.

**Datos de actividad.** Las reseñas y citas que guarda cada quien, las listas personalizadas que arma ("Libros para el verano"), cuántos días seguidos ha leído (la racha), cuántas páginas leyó y de qué humor estaba en cada sesión, qué logros ha desbloqueado, y todo lo social: publicaciones, comentarios, "me gusta", mensajes de chat con amigos, y los intercambios de libros físicos con otros usuarios (lo llamamos "Trueque"). Esto es, literalmente, el contenido de la app: sin esto no hay nada que contar. Vive en la misma bodega, con candados para que cada quien solo pueda ver y tocar lo suyo, o lo que sus amigos decidieron compartirle.

**Datos de la mascota y la gamificación.** Qué mascota eligió, cómo se llama, su nivel y su experiencia (los puntos que sube al leer), sus "gemas" (la moneda del juego que se gasta dentro de la app), y un registro contable de cada premio que se le ha dado, para que nadie pueda hacer trampa y regalarse puntos. Por diseño, el celular del usuario NO puede cambiar estos números directamente: solo la cocina (el servidor) tiene permiso de sumarlos. Vive también en Supabase.

---

## 4. ¿De dónde saca la app la información de los libros?

**1. Google Books.** Es la base de libros de Google. Cuando el usuario busca un título, SEMA le pregunta a Google Books por título, autor, portada e ISBN (el "número de serie" único de cada edición de un libro). Pedimos primero resultados en español; si hay menos de 3, buscamos en todos los idiomas y mezclamos. Lo que nos falta: muchas ediciones en español, sobre todo de editoriales mexicanas o libros de texto universitarios, están mal documentadas — a veces no traen portada, o el resumen viene incompleto o solo en inglés.

**2. Open Library.** Otro catálogo de libros, gratuito y abierto, que usamos únicamente como plan B para conseguir una portada cuando Google Books no tiene una.

**3. Claude (la Inteligencia Artificial que usamos, de la empresa Anthropic).** Una vez que el libro ya está en la biblioteca del usuario, le pedimos a la IA que "enriquezca" ese libro — en palabras simples: que rellene los huecos. Le mandamos el título y el autor, y ella nos regresa el género, un resumen corto, y unas etiquetas de "para qué estado de ánimo sirve este libro" (por ejemplo, "reconfortante" o "para pensar"). Esto es lo que le da a SEMA ese toque de personalización que Google Books solo no podría dar.

**4. Nuestra propia base de datos.** Todo lo anterior —lo que capturó el usuario a mano, lo que vino de Google Books, lo que generó la IA— se guarda finalmente en nuestra bodega (Supabase), que es de donde la app de verdad lee cuando le muestra a alguien su biblioteca.

¿Por qué no siempre son perfectos? Google Books y Open Library son catálogos hechos principalmente pensando en el mercado de habla inglesa. El español —y sobre todo las ediciones específicas que usan las universidades mexicanas— está sub-representado: peor documentado, con menos portadas y menos resúmenes. Es justo el problema que una biblioteca universitaria como la de la UAM no tiene: ellos sí saben exactamente qué edición está en las manos de sus estudiantes.

---

## 5. ¿Qué es BIDIUAM y por qué nos interesa?

BIDIUAM es la Biblioteca Digital de la Universidad Autónoma Metropolitana. A diferencia de Google Books, que es un catálogo genérico para todo el mundo, BIDIUAM tiene exactamente los libros, ediciones y copias que la UAM compró y que sus estudiantes de verdad pueden pedir prestados o leer en digital. Para un estudiante de la UAM, esa información es mucho más exacta que lo que le puede dar Google.

Por dentro, BIDIUAM —como casi cualquier biblioteca grande del mundo— usa un sistema llamado Ex Libris Alma para administrar TODO su catálogo: qué libros tienen, cuántas copias, en qué piso están, cuáles están prestados ahora mismo, cuáles son digitales y con qué licencia. En palabras simples: Alma es el inventario completo del almacén de una tienda — ahí vive la verdad de qué hay y qué no.

Encima de Alma corre otro sistema llamado Primo, que es la cara visible: el buscador donde el estudiante escribe "cálculo diferencial" y le sale si está disponible, en qué acervo, o el enlace para leerlo en digital. Siguiendo la analogía: si Alma es el almacén de la tienda, Primo es la página web de esa tienda, donde el cliente de verdad busca y compra.

Vale la pena distinguir dos cosas que suenan parecido pero no son lo mismo: el catálogo físico son los libros de papel, en anaqueles, con una ubicación exacta dentro del edificio; la biblioteca digital son los libros y artículos en PDF o formato electrónico, a los que normalmente solo se accede iniciando sesión con la cuenta de la universidad. BIDIUAM maneja las dos cosas, y a nosotros nos interesan ambas: préstamo físico y acceso digital.

---

## 6. ¿Cómo podría funcionar la integración con BIDIUAM?

**Opción A — Conexión en tiempo real.** En palabras simples: nuestra app le pregunta directamente a Alma "¿tienen este libro disponible ahorita?", y Alma responde al instante cada vez que alguien busca. Ventaja: la información siempre está actualizada al segundo. Desventaja: es la opción más compleja técnicamente, y necesitamos que BIDIUAM nos autorice y nos dé acceso a esa conexión (lo que en tecnología se llama una "API": una puerta por la que un programa le puede preguntar cosas a otro programa). Sin su autorización, esta opción ni siquiera es posible.

**Opción B — Exportación periódica del catálogo.** BIDIUAM nos manda, cada semana o cada mes, un archivo con la lista completa (o una parte) de su catálogo, y nosotros lo metemos a nuestra propia bodega. Los formatos más comunes en los que las bibliotecas exportan esta información son: MARC21 (un formato clásico y muy detallado, hecho específicamente para describir libros de biblioteca — como una ficha bibliográfica súper completa), CSV (una simple hoja de cálculo, como un Excel guardado en texto plano) o JSON (un formato ordenado que usan casi todos los programas modernos para intercambiar información entre sí). Ventaja: mucho más simple de construir que la Opción A. Desventaja: la información no es instantánea — si alguien presta un libro a las 10 de la mañana, nuestra copia no se entera hasta el siguiente envío.

**Opción C — Solo mostrar enlace a Primo.** La más sencilla de las tres. Cuando alguien busca un libro en SEMA, le ponemos un botón que dice "Ver en Biblioteca UAM", y ese botón simplemente abre Primo con la búsqueda de ese libro ya hecha. No hay ninguna conexión técnica real entre las dos apps — es nada más un enlace inteligente que le ahorra al estudiante el paso de ir a buscar por su cuenta.

---

## 7. ¿Qué le damos nosotros a BIDIUAM a cambio?

**Datos anónimos de tendencias de lectura.** Qué libros buscan y leen más los estudiantes de la UAM dentro de SEMA. Es información que a ellos, como biblioteca, les puede servir para decidir qué comprar o qué promover, y que nosotros les podemos dar sin revelar quién es quién.

**Visibilidad ante un público joven.** Muchos estudiantes quizás ni saben todo lo que ya tiene su propia biblioteca digital; si SEMA se los muestra dentro de una app que ya usan para leer, les da alcance sin que ellos tengan que hacer marketing.

**Un posible tablero de tendencias.** Hecho a la medida, que puedan usar en sus reportes internos — algo que hoy probablemente no tienen tan fácil de armar.

---

## 8. ¿Qué necesitamos preguntarles el martes?

**1. ¿Tienen Primo activo, o solo usan Alma "puro" por dentro?** Nos dice si ya existe una cara pública moderna y buscable (Primo) a la que simplemente podríamos enlazar (Opción C), o si tendríamos que trabajar directo contra su sistema interno.

**2. ¿Las APIs de Alma están habilitadas?** Si esa puerta ya está abierta de su lado, la Opción A (tiempo real) es viable; si no, hay que empezar por pedir que la habiliten, y eso puede tardar y depender de su equipo de sistemas.

**3. ¿Pueden exportarnos el catálogo en JSON o CSV?** Nos dice si la Opción B (exportación periódica) es realista, y qué tan fácil sería para su equipo generar ese archivo sin tener que aprender algo nuevo.

**4. ¿Los libros digitales de BIDIUAM son de acceso abierto, o piden iniciar sesión con cuenta UAM?** Importa mucho: si un estudiante puede leer el PDF directo desde SEMA sin volver a loguearse, la experiencia es mucho mejor; si necesita su cuenta institucional, hay que diseñar ese paso extra desde ahora.

**5. ¿Qué datos les gustaría recibir de nuestra parte a cambio?** Antes de prometerles un tablero o unos datos específicos, conviene preguntar qué es lo que de verdad les sirve a ellos, para no construir algo que no van a usar.

---

## 9. Glosario: palabras raras que van a escuchar

**API:** una puerta por la que un programa le puede preguntar o pedir cosas a otro programa, sin que un humano lo haga a mano. Como pedir algo por teléfono en vez de ir tú mismo a la tienda.

**Base de datos:** la bodega donde se guarda ordenadamente toda la información de una app, para poder encontrarla después.

**Servidor:** la computadora rentada, en la nube, donde vive la "cocina" de la app: el programa que decide qué es válido y qué no, sin que el usuario lo vea.

**Frontend / Backend:** frontend es el menú, lo que el usuario ve y toca en su pantalla. Backend es la cocina detrás, donde se procesa y se decide todo.

**Supabase:** el proveedor que le renta a SEMA, ya armados, la cocina (servidor) y la bodega (base de datos), con seguridad incluida.

**PWA (Progressive Web App):** una página web que se puede "instalar" en el celular como si fuera una app normal, aunque por dentro siga siendo una página.

**Ex Libris Alma:** el sistema donde una biblioteca (como BIDIUAM) guarda el inventario completo de todo su catálogo, físico y digital.

**Primo:** el buscador público que corre encima de Alma; es lo que el estudiante ve y usa para buscar libros.

**MARC21:** un formato muy detallado, usado desde hace décadas por las bibliotecas del mundo, para describir cada libro con una ficha completa de datos.

**Catálogo digital vs. biblioteca digital:** el catálogo digital es solo la lista/ficha de qué libros existen (aunque sean de papel); la biblioteca digital son los libros que de verdad se pueden leer en pantalla.

**Metadata:** información que describe a un dato. El género, el resumen o el año de un libro son "metadata" del libro, no el libro en sí.

**Integración:** cuando dos sistemas de software distintos (por ejemplo, SEMA y Alma) se conectan entre sí para compartir información automáticamente, sin que alguien tenga que copiar y pegar a mano.

---

## 10. ¿Cuál es el estado actual de la app?

**Lo que funciona hoy, de verdad, en producción:** llevar tu biblioteca personal (agregar, calificar, reseñar libros); la racha diaria de lectura con una mascota que sube de nivel; las gemas como moneda del juego; los logros; el feed social con amigos y chat 1 a 1; tres formas distintas de recibir recomendaciones de libros (deslizando tarjetas, por estado de ánimo con ayuda de IA, y una automática que aprende de lo que leen todos los usuarios); guardar citas favoritas; cuentos cortos para leer dentro de la app sin necesitar internet; un resumen mensual estilo "Wrapped"; y el sistema de Trueque para intercambiar libros físicos con otros lectores de tu zona en la Ciudad de México. Todos los puntos y premios están controlados por la cocina (el servidor), no por el celular del usuario, precisamente para que nadie pueda hacer trampa.

**En construcción o con problemas conocidos:** subir la foto de portada del perfil todavía falla en producción y no hemos encontrado la causa exacta; publicar cambios nuevos de la app requiere que León lo haga a mano cada vez (no está conectado en automático a donde vive el código); y no hay ninguna prueba automática que detecte errores antes de publicar — hoy se prueba a mano, abriendo la app.

**Lo más importante para la reunión del martes:** la pestaña "Biblioteca UAM" que ya existe hoy dentro de SEMA es, en realidad, una lista fija de unos 40 libros que capturamos nosotros a mano, y la "disponibilidad" que se muestra (si un libro está prestado o no) está inventada — es un resultado calculado con una fórmula interna, no información real de la biblioteca. La propia app ya le avisa al usuario "Próximamente: catálogo completo de la Biblioteca UAM-I con disponibilidad en tiempo real" — es justo la promesa que una integración de verdad con BIDIUAM nos permitiría cumplir.

Falta también: el pago real de la versión paga de SEMA (hoy se activa a mano, sin cobrar), y pruebas automatizadas que hoy no existen. Nada de esto es un secreto — es simplemente en qué etapa está el proyecto, y está bien que sea así para el tamaño del equipo que lo construyó.

---

## 11. ¿Qué puede hacer el usuario dentro de la app? (La lista completa de features)

### Biblioteca personal

**Agregar libros.** El usuario puede buscar un título (le preguntamos a Google Books, como se explicó en la sección 4) o capturarlo a mano si no lo encuentra.

**Cambiar el estado del libro.** Cada libro vive en uno de tres estados: "quiero leer", "leyendo" o "terminado". El usuario lo va moviendo conforme avanza.

**Calificar y reseñar.** Una vez que termina un libro (o incluso antes), puede ponerle una calificación con estrellas y escribir una reseña con sus propias palabras.

**Registrar una sesión de lectura.** Cada vez que el usuario lee, puede anotar cuántas páginas avanzó y con qué estado de ánimo se quedó (por ejemplo, "inspirado" o "triste"). Esto es lo que alimenta la racha diaria.

**Guardar citas favoritas.** Si una frase de un libro le gusta, la puede guardar ligada a ese libro, y después compartirla o verla en su colección de citas.

**Organizar libros en listas personalizadas.** Puede crear listas propias, como "Libros para el verano" o "Pendientes de la escuela", y meter ahí los libros que quiera agrupar.

### Hábito y gamificación

**Racha diaria.** Cada día que el usuario registra una sesión de lectura, su racha sube un número. Aquí viene lo interesante: si un día se le olvida leer, la racha NO se resetea a cero — se queda "en pausa" con el número que traía, y en cuanto vuelve a leer, sigue avanzando desde ahí, no desde el principio. Es una decisión a propósito: la idea es no castigar a alguien por un mal día. Aparte, una vez al mes el usuario tiene un "protector de racha" (freeze): si sabe que va a fallar un día, lo puede usar para que ese día cuente como si sí hubiera leído.

**Mascota virtual.** El usuario elige una mascota (hoy solo hay un gato, apodado "El Sensible") y la pone un nombre. Cada vez que lee, la mascota gana experiencia (los cofundadores la conocen como "XP": son puntos que se acumulan). Al juntar suficiente experiencia, la mascota sube de nivel, y eso se celebra con una animación en pantalla. Importante: el nivel y la experiencia los calcula y los suma el servidor, nunca el celular del usuario — así nadie puede hacer trampa y subir de nivel sin leer de verdad.

**Gemas.** Son la moneda del juego dentro de SEMA. Se ganan automáticamente al terminar un libro, al registrar sesiones de lectura, y por reclamar un premio diario. Se gastan, por ejemplo, para comprar más intentos en el juego de recomendaciones (BookTinder, ver sección 12) o para buscar intercambios de libros en el Trueque. Igual que con la mascota, el servidor es el único que puede sumar o restar gemas — el celular solo las muestra.

**Logros.** Son medallas que el usuario desbloquea al cumplir ciertas metas. Algunos ejemplos reales dentro de la app: "Primera página" (agregaste tu primer libro), "Lector nato" (terminaste tu primer libro), "Racha de fuego" (7 días seguidos leyendo), "Imparable" (30 días seguidos), "Maratón" (leíste 3 libros en un mes), y "Universitario lector" (agregaste un libro de la Biblioteca UAM). Cada logro también da unas gemas de premio.

**Wrapped mensual.** Es un resumen bonito, parecido al "Spotify Wrapped" que ya conocen, con cuántos libros leyó el usuario ese mes, cuántas páginas, y cómo le fue con su racha. Aparece solo, automáticamente, el último día de cada mes (y hay una versión anual que aparece el 31 de diciembre), y se puede guardar como imagen para compartir.

### Social

**Feed.** Es lo primero que el usuario ve al entrar: una especie de muro con lo que están leyendo sus amigos, libros que terminaron, citas que compartieron, y logros que desbloquearon.

**Amigos.** Se agregan buscando por nombre de usuario y mandando una solicitud, que la otra persona tiene que aceptar. Una vez que son amigos, cada quien puede ver la biblioteca, la racha y la actividad del otro (si su perfil lo permite).

**Chat 1 a 1.** Cada amigo puede mandarle mensajes directos a otro, como cualquier chat normal.

**Compatibilidad lectora.** Es un porcentaje que la app calcula entre dos amigos, para saber qué tan parecidos son como lectores. Se calcula comparando cuántos géneros tienen en común, cuántos libros han leído los dos, qué tan parecidas son sus calificaciones promedio, y si ambos tienen el hábito activo de leer seguido. Entre más cosas en común, más alto el porcentaje.

**Publicar reseñas y citas en el feed.** El usuario puede compartir, si quiere, una reseña que escribió o una cita que guardó, para que sus amigos la vean.

### Descubrimiento de libros

**BookTinder.** Es un juego de tarjetas, muy parecido a Tinder: la app le muestra al usuario un libro a la vez, de un catálogo de unos 500 títulos elegidos a mano, y el usuario desliza para decir "me interesa" o "paso". Esto ayuda a la app a entender sus gustos y también a llenar su lista de "quiero leer" de forma divertida. Hay un límite de tarjetas que se pueden guardar por día, ampliable gastando gemas.

**Recomendación por estado de ánimo (con Inteligencia Artificial).** El usuario le dice a la app cómo se siente o qué está buscando ("quiero algo ligero", "necesito motivarme", "algo que me haga llorar"). Ese texto se le manda a Claude (la IA que usamos), y ella responde con varias recomendaciones, explicando por qué cada una encaja con lo que el usuario pidió.

**Recomendación automática aprendida.** Esta es la más "mágica" de las tres, y se explica a fondo en la sección 12: en resumen, la app aprende qué te gusta viendo qué leen todos los usuarios juntos, sin que nadie tenga que pedírselo.

### Extras

**Snacks literarios.** Son cuentos cortos, de dominio público (es decir, ya no tienen derechos de autor vigentes), que se pueden leer completos dentro de la misma app, sin necesitar conexión a internet.

**Biblioteca UAM.** Hoy es una sección con una lista fija de libros universitarios, capturada a mano por nosotros, con una señal de "disponible / prestado" que en realidad es inventada (no viene de ningún sistema real, como se explica en la sección 10). Lo que vendría con la integración de BIDIUAM es que esta sección muestre el catálogo real, actualizado, con disponibilidad de verdad.

### Trueque de libros

**En una oración:** el Trueque es la sección donde dos personas que usan SEMA pueden intercambiar libros físicos entre ellas, si viven cerca.

**Cómo funciona, paso a paso:** primero, el usuario elige entre 2 y 5 zonas de la Ciudad de México donde le queda bien recibir o entregar libros. Después, anota qué libros ofrece (los que ya no quiere) y qué libros busca (los que quiere conseguir). Cuando quiere ver si hay alguien compatible, aprieta el botón de "Buscar matches" (match = una pareja de personas cuyos libros combinan: lo que uno busca, el otro lo tiene, o viceversa). Si encuentra a alguien, se abre un chat dentro de la misma app para ponerse de acuerdo en dónde y cuándo entregar los libros — eso ya lo coordinan ellos mismos, cara a cara. Cuando el intercambio ya sucedió de verdad, cualquiera de los dos lo marca como "completado", y ambos se califican del uno al otro con estrellas.

**¿Por qué existen las 25 zonas de la Ciudad de México?** Porque un intercambio de libros físicos solo tiene sentido si las dos personas pueden verse en persona sin batallar. Dividir la ciudad en zonas es la forma más simple de asegurar que solo te empareje con gente que de verdad te queda cerca, en vez de con alguien del otro lado de la ciudad.

**¿Cuántas gemas cuesta buscar matches, y por qué?** Buscar cuesta 20 gemas (gratis, con un límite diario, para los usuarios de la versión de paga). Cobrar por buscar no es un capricho: es la forma de evitar que alguien esté buscando cientos de veces por minuto solo para saturar el sistema (lo que en tecnología se conoce como "spam", o abuso por exceso de uso).

**¿Qué pasa cuando el intercambio se completa?** Los libros de esa pareja se dan de baja de "ofrezco" y "busco" (ya no se los va a topar nadie más buscando lo mismo), y cada participante califica al otro del 1 al 5, con una reseña opcional — esa calificación es la que luego ven otros usuarios antes de intercambiar con esa persona.

---

## 12. ¿Cómo decide la app qué libros recomendarte? (Los 3 motores de recomendación)

**Motor 1 — BookTinder (desliza si te gusta).** La app tiene un catálogo de unos 500 libros seleccionados a mano por nosotros. El usuario los ve de uno en uno y desliza: "me interesa" o "no". Cada vez que desliza, la app guarda esa decisión, para ir entendiendo mejor sus gustos con el tiempo.

**Motor 2 — Por estado de ánimo (con Inteligencia Artificial).** El usuario le cuenta a la app cómo se siente o qué anda buscando: "quiero algo ligero", "necesito motivarme", "algo que me haga llorar". Ese texto se le manda a Claude, la Inteligencia Artificial que usamos, y ella responde con 3 a 5 recomendaciones, explicando en cada una por qué encaja con ese estado de ánimo.

**Motor 3 — El que aprende solo (recomendador colaborativo).** Este es el más difícil de explicar, así que va con una analogía: imagina que la app se da cuenta de que tú y otras 500 personas leyeron los mismos 10 libros. Después nota que esas 500 personas también leyeron otros 3 libros que tú no has leído. Entonces la app asume que probablemente esos 3 libros también te gustarían a ti, aunque nadie te los haya recomendado directamente — nada más por el patrón de lo que lee gente parecida a ti. Esto no lo decide una persona a mano: lo calcula un programa matemático que corre solo, automáticamente, todas las noches, y que va actualizando las recomendaciones de todos los usuarios de la app con la información más reciente.

---

## 13. ¿Por qué nadie puede hacer trampa con los puntos? (El sistema anti-trampa explicado)

El problema es el siguiente: en cualquier app con puntos, niveles o monedas, alguien con suficiente conocimiento técnico podría intentar editar su propio celular para darse puntos gratis, sin haber hecho nada para merecerlos.

La solución que usamos: el celular del usuario NUNCA puede escribir directamente sus propios puntos. Lo único que puede hacer es avisarle al servidor "terminé este libro" o "hoy sí leí". Es el servidor —la cocina, no el cliente— el que decide cuántos puntos corresponden de verdad, y el que los suma. El celular solo puede leer el resultado después, nunca escribirlo él mismo.

Una analogía que ayuda: es como en un casino. El jugador no puede tocar las fichas del juego hasta que el crupier las pone sobre la mesa. Por más que el jugador quiera, no tiene forma de agarrar fichas que el crupier no le haya entregado.

Los puntos que funcionan exactamente así en SEMA son: la experiencia y el nivel de la mascota, las gemas, los logros, y la racha diaria. Ninguno de los cuatro se puede falsificar desde el celular.

---

## 14. ¿Por qué no está en la App Store ni en Google Play? (PWA vs. app nativa)

Una app nativa es la que se descarga desde la App Store (iPhone) o Google Play (Android), y que se construye específicamente, por separado, para cada uno de esos dos sistemas. Instagram, WhatsApp y Spotify son ejemplos de apps nativas.

Una PWA (se pronuncia como se escribe, viene de "Progressive Web App") es, en cambio, una página web que se comporta como si fuera una app: se puede "instalar" desde el navegador del celular, y después aparece en la pantalla de inicio con su propio ícono, como si fuera una app normal — aunque por dentro sigue siendo, técnicamente, una página web.

Elegimos empezar con una PWA por varias razones prácticas: construir dos apps nativas por separado (una para iPhone y otra para Android) nos hubiera tomado el triple de tiempo; una PWA funciona en cualquier celular con un solo código, sin duplicar trabajo; se puede actualizar y publicar sin esperar la aprobación de Apple o de Google (que puede tardar días); y para un equipo de dos personas sin experiencia previa en programación, era, de lejos, la opción más realista para empezar a probar la idea.

Hay que ser honestos con las desventajas también: al no estar en las tiendas de apps, SEMA no aparece cuando alguien busca "apps de lectura" en la App Store o en Google Play; las notificaciones en iPhone funcionan distinto y de forma más limitada en una PWA que en una app nativa; y algunos usuarios, sobre todo los menos acostumbrados a la tecnología, no saben que pueden "instalar" una página web y se quedan usándola solo desde el navegador.

¿Cuándo pasaríamos a una app nativa de verdad? Cuando tengamos ya una base de usuarios que lo justifique, existen herramientas que toman el código que ya tenemos hecho y lo empaquetan como app nativa para las tiendas, sin tener que reescribir todo desde cero. Es un paso que se puede dar más adelante, no algo que haya que resolver hoy.

---

## 15. ¿Cómo sabemos si un usuario es alumno activo de la UAM? (El problema de verificación de identidad universitaria)

**El problema, en simple:** hoy, cualquier persona se puede registrar en SEMA con cualquier correo —Gmail, Hotmail, lo que sea—. Eso significa que, tal como está la app ahorita, alguien que no es alumno de la UAM podría entrar a la sección de la Biblioteca UAM y, eventualmente, al catálogo real de BIDIUAM, algo que la propia UAM nos pidió que no pase.

**Lo que sabemos hoy:** los alumnos activos de la UAM Unidad Xochimilco tienen un correo institucional con este formato: matrícula@alumnos.xoc.uam.mx. Ese correo funciona casi como un "carnet digital" del alumno: si alguien tiene acceso a esa cuenta, es muy probable que sea (o haya sido) alumno de la UAM.

**Lo que no sabemos todavía:** tener ese correo no garantiza que el alumno siga activo hoy. Alguien que ya egresó, o que fue dado de baja, podría seguir teniendo acceso a su correo institucional durante un tiempo. Por eso, solo confirmar que el correo existe no es, por sí solo, suficiente para asegurar que la persona sigue siendo alumno vigente.

**Opción A — Verificación por correo institucional (la más simple).** Al registrarse, la app exige que el usuario use un correo con el formato @alumnos.xoc.uam.mx, y le manda un correo de confirmación a esa dirección. Si la persona puede abrir ese correo, confirmamos que de verdad tiene acceso a esa cuenta institucional. Límite: esto no distingue entre un alumno activo y uno que ya egresó, si su correo sigue funcionando. Lo que necesitamos saber: si esos correos se desactivan en automático cuando el alumno sale de la UAM.

**Opción B — Lista blanca de matrículas (nivel medio).** La UAM nos comparte, cada semestre, una lista de matrículas de alumnos activos. Cuando alguien se registra, la app revisa que su matrícula esté en esa lista. Ventaja: esto sí garantiza que el alumno está activo de verdad. Límite: depende de que la UAM esté dispuesta a compartirnos esa información, lo cual puede tener sus propias implicaciones de privacidad de su lado. Lo que necesitamos saber: si la UAM puede, y quiere, compartir esa lista con nosotros.

**Opción C — Iniciar sesión con la cuenta de la UAM (la más confiable).** La app usa el propio sistema de inicio de sesión de la UAM, parecido a cuando un sitio te deja entrar con tu cuenta de Google. Si el alumno puede iniciar sesión con su cuenta institucional, sabemos que sigue activo; si ya no lo está, esa cuenta ya no le va a funcionar y no va a poder entrar. Ventaja: es la verificación más confiable de las tres, y se mantiene actualizada sola, sin que nosotros tengamos que hacer nada. Límite: depende de que la UAM tenga ese sistema disponible para conectarse con apps externas como la nuestra, y de que su equipo de sistemas colabore en la conexión.

**Lo que debemos preguntar el martes:**
1. ¿Los correos @alumnos.xoc.uam.mx se desactivan cuando el alumno egresa o es dado de baja?
2. ¿La UAM tiene un sistema de inicio de sesión propio que podamos conectar con nuestra app?
3. ¿La UAM podría compartirnos una lista de matrículas activas cada semestre?
4. ¿Qué nivel de verificación le parece suficiente a BIDIUAM para autorizarnos a mostrar su catálogo?

**Nota honesta:** este es uno de los puntos más importantes que hay que resolver antes de lanzar la sección FOLIO UAM de verdad. Sin una respuesta clara aquí, no le podemos garantizar a BIDIUAM que solo sus alumnos activos van a poder acceder a su contenido. Cuál de las tres opciones (o combinación de ellas) es la correcta depende directamente de lo que nos diga la UAM en la reunión.

---

## 16. Limitaciones honestas que debemos conocer (estado actual: septiembre de 2026)

**Lo que aún no funciona o es manual:**

- Publicar una versión nueva de la app requiere que León ejecute el proceso a mano cada vez; no pasa solo cuando se sube el código.
- No existe ninguna prueba automática: cada versión nueva se revisa abriendo la app a mano, no hay un sistema que detecte errores antes de publicar.
- SEMA Plus (la versión de paga) ya existe como concepto dentro del código, pero hoy se activa manualmente para cada usuario; no hay ningún cobro real todavía integrado.
- Subir la foto de **portada** del perfil sigue fallando en producción. Este es un bug que ya estaba documentado antes de esta actualización y que revisamos de nuevo ahora: el código de subir la portada es prácticamente idéntico al de subir la foto de perfil (que sí funciona), así que la causa exacta sigue sin identificarse.

**Escala:** la app no se ha probado todavía con miles de usuarios usándola al mismo tiempo. El proveedor que rentamos (Supabase) sí está preparado para eso, pero nosotros no hemos verificado que todo en SEMA se comporte igual de bien a esa escala.

**La Biblioteca UAM dentro de la app, hoy:** la pestaña muestra una lista fija de unos 40 libros capturados a mano por nosotros. La "disponibilidad" que se muestra (si un libro está prestado o no) es ficticia: se calcula con una fórmula interna, no refleja ningún dato real de la biblioteca. Esto es, exactamente, lo que buscaría resolver una integración real con BIDIUAM.

**Lo que sí funciona bien hoy:** la seguridad de los puntos y las recompensas (nadie puede hacer trampa, como se explicó en la sección 13); el Trueque de libros de principio a fin; el registro e inicio de sesión de usuarios; las tres formas de recomendación de libros; el feed social y el chat; la racha y la mascota; y subir la foto de **perfil** (no la de portada, que es la que sigue fallando, como se aclaró arriba).

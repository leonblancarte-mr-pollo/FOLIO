# AUDITORÍA FOLIO — REPORTE FINAL (FASE 1)

> **Nota de método.** No tengo credenciales para correr SQL contra tu Supabase, así que
> el schema de abajo está **reconstruido desde el código** (las llamadas `.from(...)` en
> `src/App.jsx`). Es muy fiable para *columnas y relaciones que el código usa*, pero **no
> puede confirmar el estado real de RLS, los índices, ni los constraints declarados en la
> BD**. Donde digo "no verificable desde código", necesitas pegar la salida de las 3
> queries de introspección para cerrarlo. Aun así, el código deja rastros muy claros del
> estado de RLS (ver §RLS).
>
> **Importante:** corregí varias conclusiones del template que el código **desmiente**.
> Están marcadas con ⚠️ **CORRECCIÓN**.

---

## 0. Hallazgo que reordena todo el reporte

Folio **no usa Supabase Auth**. Cero referencias a `supabase.auth`, `auth.uid()`,
`signInWith*` o sesiones en todo `src/`. La autenticación es casera:

- `users` tiene `password_hash`.
- Login: `POST /api/login` (`api/login.js`) compara un `sha256(password + "::folio-pepper")`.
- La sesión es un **JWT propio** firmado en cliente (`mintToken` / `signJWT`), guardado en `localStorage`.
- **Todas** las queries (cliente *y* el endpoint de login) usan la **anon key**.

Esto tiene tres consecuencias que dominan el resto de la auditoría:

1. **RLS basada en `auth.uid()` es imposible aquí.** Como nunca hay sesión de Supabase,
   `auth.uid()` siempre es `NULL`, así que cualquier política realista bloquearía *todo*.
   Por eso el código pide explícitamente `DISABLE ROW LEVEL SECURITY` (lo veremos abajo).
   No es un descuido "inconsistente": es la única forma de que la arquitectura actual funcione.

2. **La anon key está en el bundle del cliente** y, con RLS desactivada, da
   **lectura/escritura total a todas las tablas**. Los filtros `.eq("user_id", userId)`
   son *cosméticos*: viven en el cliente y cualquiera con la anon key los ignora.

3. **`password_hash` es leíble con la anon key.** `api/login.js` lo lee con la anon key,
   lo que implica que la tabla `users` expone `password_hash` a cualquiera. Combinado con
   que el hash es **SHA-256 sin sal por usuario** (solo un "pepper" estático y público en
   el código), los hashes son crackeables con GPU/rainbow tables casi triviales.

Esto **no significa que "Folio esté roto"** — funciona. Significa que su seguridad real
hoy es ≈ la de una base de datos pública. Para una sola persona probando, da igual. Para
"escalar a UAM" (multiusuario real, datos de terceros), es el problema #1.

---

## I. ANÁLISIS BD (reconstruido desde código)

### Tablas detectadas (20)
`users`, `books`, `quotes`, `conversations`, `messages`, `friendships`, `posts`,
`comments`, `comment_replies`, `comment_likes`, `post_likes`, `user_streaks`,
`reading_logs`, `user_gems`, `user_pets`, `achievements`, `monthly_wraps`,
`avatars`, `covers`, `notifications`.

### Schema

**users**
- Campos usados: `id` (uuid), `nombre`, `username`, `email`, `password_hash`,
  `avatar_url`, `cover_url`, `bio`.
- **Falta `university`/`carrera`/`generacion`** ❌ — correcto, no existe. Para la subtab
  UAM hoy se usa un booleano `is_uam_book` **en `books`**, no un atributo de universidad
  en el usuario. Si UAM va a ser un eje de producto (perfiles por carrera/generación,
  filtros, ranking), falta modelarlo.
- Constraints: el código *asume* `email` y `username` únicos (checa duplicados a mano
  antes de insertar). **No verificable desde código** si existe un UNIQUE real en BD — y
  ese chequeo "a mano" tiene carrera de concurrencia si no hay UNIQUE en la columna.

**books**
- Campos: `id`, `user_id`, `title`, `author`, `status`, `genre`, `summary`, `rating`,
  `review`, `cover_url`, `mood_tags` (array), `added_at`, `finished_at`, `is_uam_book`,
  `isbn`, `total_pages`.
- ⚠️ **CORRECCIÓN al template:** **`total_pages` SÍ existe** (`dbToBook`/`bookToDb`, líneas
  ~505/526) y **`isbn` también**. El template los daba por faltantes. De hecho hay código
  defensivo (`isUnknownColumnError` / `stripTotalPages`) para sobrevivir si la *migración*
  de `total_pages` todavía no se aplicó en algún entorno. Mismo patrón defensivo para
  `is_uam_book` (líneas ~1344/1369).
- Normalización: `genre` y `mood_tags` viven como texto/array en la fila (no hay tablas
  `genres`/`tags`). Para esta escala está **bien** — normalizar sería sobre-ingeniería hoy.

**user_pets** ✅ presente y completo
- Columnas (del SQL embebido en `loadPet`, línea ~1225): `id` (uuid PK), `user_id`
  (uuid, FK→`users(id)` **ON DELETE CASCADE**, **UNIQUE**, NOT NULL), `pet_type`,
  `pet_name`, `xp`, `level`, `created_at`, `updated_at`.
- FK y cascade: **bien definidos** (en el DDL que el propio código documenta).
- ⚠️ **CORRECCIÓN:** el template dice "la mascota no se guarda → silent failure". El código
  de `createPet`/`addPetXP` es **lo contrario de un silent failure**: hace insert,
  re-lee para verificar, distingue códigos `42501` (RLS), `23505` (unique), `23503` (FK),
  y hasta imprime el SQL de arreglo. Si una mascota no se guarda, es porque **RLS está
  activa** en esa tabla y la bloquea — el síntoma es de RLS, no de manejo de errores.

**reading_logs** ✅ presente
- Columnas: `user_id`, `book_id`, `pages_read`, `mood`, `log_date`.
- FK a `books`/`users`: usadas por el código pero **no verificables desde código**
  (necesito el query de foreign keys).
- Índices: **no verificables desde código.** Pero el patrón de acceso es claro y exige
  índices (ver §Índices).

**user_streaks**
- Columnas: `user_id`, `current_streak`, `longest_streak`, `last_log_date`,
  `total_pages_read`, `streak_freeze_used_at`, `updated_at`.
- Es 1:1 con el usuario (`maybeSingle()` por `user_id`); debería tener UNIQUE en `user_id`.

**quotes**
- Columnas: `id`, `user_id`, `book_id`, `text`, `page_number`, `mood`, `tags` (array),
  `is_favorite`, `is_public`, `created_at`.
- ⚠️ **`mood` SÍ sigue en BD** aunque la UI ya no lo capture — correcto. Es deuda menor
  (columna huérfana), sin riesgo.
- Join real a `books(title, author, cover_url)` → la FK `quotes.book_id → books.id`
  se está usando de verdad.

### RLS policies

**No verificable al 100% desde código**, pero el código deja huellas inequívocas:

- `user_pets`: el propio código documenta `ALTER TABLE user_pets DISABLE ROW LEVEL SECURITY`
  y trata el error `42501` como "RLS está bloqueando, desactívala". → **El diseño asume RLS
  DESACTIVADA.**
- El resto de tablas: como **no hay sesión de Supabase**, cualquier política con `auth.uid()`
  rompería la app entera. Dado que la app funciona, lo abrumadoramente probable es que
  **RLS esté desactivada (o con policy `USING (true)`) en prácticamente todas las tablas.**

| Tabla | Estado probable | Riesgo real |
|-------|-----------------|-------------|
| user_pets | DISABLED (documentado en código) | DB abierta vía anon key |
| users | DISABLED / permisiva (login lee `password_hash` con anon key) | **Crítico**: hashes y PII expuestos |
| notifications | DISABLED probable | Cualquiera lee/crea notificaciones de otros |
| post_likes / comment_likes | DISABLED probable | Likes falsificables |
| friendships | DISABLED probable | Grafo social manipulable |
| messages / conversations | DISABLED probable | **Crítico**: DMs leíbles por terceros |
| books / quotes / reading_logs | DISABLED probable | Datos de lectura de cualquiera leíbles |

**Conclusión RLS:** no es "inconsistente" — es **sistémicamente inutilizable bajo la
arquitectura de auth actual**. El fix real no es "hacer las policies consistentes"; es
**decidir el modelo de identidad** (ver §III).

### Índices

**No verificables desde código.** Pero los patrones de query gritan qué necesitas:

- `reading_logs`: se filtra por `(user_id, log_date)` en cada carga y por `user_id` en
  agregados → **índice compuesto `(user_id, log_date)`** casi seguro hace falta.
- `books`: `.eq("user_id").order("added_at")` → índice `(user_id, added_at desc)`.
- `quotes`: `.eq("user_id")` y `.eq("user_id", ...).eq("book_id", ...)` → `(user_id, book_id)`.
- `messages`: `.eq("conversation_id")` (+ `read_at`, `sender_id`) → `(conversation_id)`.
- `users`: lookups por `email` y `username` (login y registro) → UNIQUE/índice en ambos.
- `friendships`, `notifications`, `post_likes`: todos filtran por `user_id`/par de ids.

Impacto hoy: **bajo** (pocos datos). A escala UAM: **medio-alto** en `reading_logs` y
`messages`, que crecen sin techo.

### Relaciones / huérfanos

- FKs que el código *usa*: `books.user_id→users`, `quotes.book_id→books`,
  `quotes.user_id→users`, `user_pets.user_id→users (CASCADE)`, `reading_logs.{user_id,book_id}`,
  `messages.conversation_id→conversations`, `conversations.user{1,2}_id→users`,
  `comments`/`replies`/`likes`→`posts`/`users`.
- **Huérfanos posibles:** si las FKs *no* están declaradas en BD (solo asumidas por el
  código), borrar un libro deja `quotes`/`reading_logs` colgando. **No verificable desde
  código** si los `ON DELETE` existen salvo en `user_pets` (ahí sí, CASCADE documentado).

---

## II. PROBLEMAS IDENTIFICADOS

### CRÍTICOS (actúa YA)

1. **Modelo de identidad sin Supabase Auth → BD efectivamente pública**
   - Síntoma: anon key en el bundle + RLS desactivada = lectura/escritura total de toda la BD.
   - Causa raíz: auth casera (password_hash + JWT propio) en vez de Supabase Auth.
   - Fix: migrar a Supabase Auth (o emitir un JWT que Supabase reconozca vía `setSession`),
     y *recién entonces* activar RLS con `auth.uid()`. Es la base de todo lo demás.
   - Tiempo: 12–20 h (migración de usuarios + reescritura de login + policies).

2. **`password_hash` débil y expuesto**
   - Síntoma: SHA-256 sin sal por usuario (solo pepper estático público), leíble con anon key.
   - Fix: bcrypt/argon2 con sal por usuario; mover login a función server con service key;
     nunca exponer `password_hash` vía PostgREST. (Idealmente desaparece al pasar a Supabase Auth.)
   - Tiempo: 3–5 h (o se subsume en el #1).

3. **Monolito de un solo archivo: `src/App.jsx` = 15,435 líneas**
   - Síntoma: TODO está aquí — auth, capa de datos, lógica de negocio (rachas, XP de mascota,
     gemas), y UI. `supabase.js` son 6 líneas; **no hay capa de servicios**.
   - Causa: nunca se extrajo. `checkStreakOnLoad`, `addPetXP`, `logReadingSession`, etc. son
     funciones de negocio sueltas en el archivo de la app.
   - Fix: extraer `services/` (books, quotes, streak, pet, social) y `hooks/`. Es el mayor
     bloqueador de testabilidad y de trabajar en equipo.
   - Tiempo: 15–25 h (incremental, sin romper).

### ⚠️ Lo que el template marcaba como crítico y **no lo es**

- **"Silent failures sin error propagation"** → **Falso en la capa de datos.** Casi todo el
  CRUD hace `if (error) throw error`. Hay manejo *bueno*: `updateBookInDB` detecta
  `count===0` y lanza "posible problema de RLS"; `deleteBookFromDB` lanza `DELETE_NO_ROWS`;
  `createPet` diagnostica RLS/FK/unique. El error handling de datos es de los puntos
  **fuertes**, no débiles. (Sí hay `console`/`catch` vacíos en cosas no críticas como caché
  offline — eso es correcto ahí.)
- **"Falta total_pages / isbn"** → **Falso**, ambos existen.
- **"RLS inconsistente, hacerla consistente (2-3h)"** → mal diagnóstico. No es un parche de
  3h; es la decisión de identidad del #1.

### ALTA PRIORIDAD (próximos 2 sprints)
1. Declarar FKs y `ON DELETE` reales en BD (no solo asumidas en código) → evita huérfanos.
2. Índices en `reading_logs(user_id, log_date)`, `books(user_id, added_at)`, `messages(conversation_id)`.
3. UNIQUE en `users.email`, `users.username`, `user_streaks.user_id`, `user_pets.user_id`.
4. Modelar UAM de verdad si es eje de producto (`university`/`carrera`/`generacion` en `users`).
5. Empezar a romper `App.jsx` por dominios (aunque sea mover la capa de datos a `services/`).

### MEDIA PRIORIDAD (roadmap)
1. Estado global (Context o store) para cortar props drilling.
2. Optimistic updates donde ya hay caché offline (ya existe la base: `folio_pending_*`).
3. Limpiar columnas huérfanas (`quotes.mood`).
4. Tests en flujos críticos (rachas, XP, login) — posible recién tras extraer services.

---

## III. RECOMENDACIONES

### Decisión raíz (antes de cualquier refactor)
Elige **una**:
- **(A) Supabase Auth** → reescribes login/registro sobre `supabase.auth`, migras hashes,
  y activas RLS con `auth.uid()`. Es el camino "correcto" y desbloquea seguridad real.
- **(B) Seguir con auth casera** → entonces *toda* autorización debe vivir en un backend
  con service key (no en el cliente), y el cliente nunca habla directo con PostgREST para
  datos sensibles. Más código propio, menos plataforma.

Recomendación: **(A)**. Es menos código a largo plazo y es lo que hace que RLS, Storage y
Realtime de Supabase sean seguros sin que tú mantengas la lógica.

### Arquitectura de código objetivo
```
src/
├─ App.jsx            (routing + auth + estado global vía Context)
├─ pages/             (Home, Explorar, PetHub, Social, Perfil)
├─ components/        (tontos: modals, cards, buttons)
├─ hooks/            (useAuth, usePet, useFeed, useStreak)
├─ services/          (booksService, quoteService, streakService, petService, feedService)
│                     ← aquí va lo que hoy vive suelto en App.jsx
└─ supabase.js        (cliente — ya existe)
```

### Patrón de error (mantén lo bueno que ya tienes)
Tu capa de datos ya lanza errores; el hueco es que la **UI** a veces no los muestra.
Estandariza el retorno y haz que la UI siempre reaccione:
```javascript
// Ya haces esto bien en services. Falta que la UI lo consuma siempre:
try {
  await booksService.insert(book, userId); // hace `if (error) throw error`
  toast.ok("Libro agregado");
} catch (err) {
  toast.error(err.message); // <- el eslabón que a veces falta
}
```

---

## IV. SCORES (recalibrados con evidencia)

| Área | Score | Comentario |
|------|-------|-----------|
| Arquitectura código | **3/10** | Monolito de 15.4k líneas, sin capa de servicios, props drilling |
| Base de datos (modelo) | **6/10** | Schema razonable y suficiente; faltan UNIQUE/índices/FKs declaradas |
| **Seguridad / Auth** | **2/10** | Sin Supabase Auth, anon key abre la BD, hash débil y expuesto |
| Integración código↔BD | **6/10** | Mejor de lo esperado: detección de RLS, count-check, fallback offline |
| Error handling (datos) | **7/10** | Sólido en la capa de datos; el hueco está en propagar a la UI |
| Testabilidad | **2/10** | Lógica de negocio acoplada dentro de App.jsx |
| **GENERAL** | **~4/10** | Funciona y tiene buen detalle, pero seguridad y monolito lo frenan para escalar |

> Subí "error handling" e "integración" respecto al template (la evidencia los respalda) y
> **bajé seguridad**, que el template subestimaba: el riesgo real no es RLS inconsistente,
> es que **no hay identidad confiable y la BD está abierta**.

## V. TIMELINE ESTIMADO

- Auditoría: ✅ HECHO
- **Confirmar BD** (correr las 3 queries de introspección): 15 min ← *pendiente tuyo*
- Decisión de identidad (A vs B) + plan: 2 h
- Fase 1 (Supabase Auth + RLS + hash): 15–25 h
- Fase 2 (extraer services / romper App.jsx): 15–25 h
- Índices + FKs + UNIQUE en BD: 3–5 h
- Tests de flujos críticos: 10–15 h
- **TOTAL: ~50–75 h (2–3 sprints)**

## VI. RECOMENDACIÓN FINAL

**Folio funciona y, en el detalle, está mejor construido de lo que el plan inicial asumía**
(buen manejo de errores en datos, caché offline, lógica de rachas/mascota cuidada). Pero
descansa sobre dos cosas que no escalan a multiusuario real:

1. **No hay identidad confiable** (sin Supabase Auth) → la BD es, de hecho, pública vía la
   anon key. Este es el riesgo #1 para UAM, por encima de todo lo demás.
2. **Todo vive en un archivo de 15.4k líneas** → frena tests, equipo y velocidad futura.

**Decisión a tomar:** ¿inviertes 1 sprint en resolver identidad + RLS **antes** de meter
features de UAM (recomendado), o sigues construyendo sobre una BD abierta y pagas el costo
10× después? Mi recomendación es lo primero — y empezar por la **decisión A/B de §III**,
porque define todo lo que viene.

---

### Pendiente para cerrar la Fase 1 con datos reales
Corre las 3 queries de introspección (schema / foreign keys / índices) en el SQL Editor y
pégame la salida. Con eso confirmo (o corrijo): estado real de RLS por tabla, qué FKs y
`ON DELETE` existen de verdad, y qué índices ya hay. Hoy esos 3 puntos son inferencia
fuerte desde código, no verdad de BD.

Fin de auditoría FASE 1. Siguiente: FASE 2 (plan detallado de refactoring).

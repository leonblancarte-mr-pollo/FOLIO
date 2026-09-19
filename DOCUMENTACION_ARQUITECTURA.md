# FOLIO — DOCUMENTACIÓN DE ARQUITECTURA TÉCNICA COMPLETA

> Última actualización: 2026-09-18 · Incluye el fix de signup (`fix_signup_permissions.sql`). Versión Word extendida: `DOCUMENTACION_ARQUITECTURA_COMPLETA.docx` (`python scripts/generate_docs.py`).
> Audiencia: developer que NO conoce FOLIO y necesita continuar el proyecto sin preguntar.

## CHANGELOG

- 2026-09-13 — Doc inicial de arquitectura (Fable 5)
- 2026-09-17 — Sprint fixes críticos: bugs UI, seguridad economía, privacidad, higiene técnica
- 2026-09-18 — Audit + sincronización con estado actual del código
- 2026-09-18 — Fixes urgentes: portada, ErrorBoundary, env.example
- 2026-09-18 — Sprint Trueque MVP: DB, RPCs, UI completa, matching, chat, rating
- 2026-09-18 — Fix bug signup (permission denied users); doc extendido en Word

---

## I. VISIÓN GENERAL

**FOLIO** es una PWA de biblioteca personal + red social de lectura en español (es-MX), gamificada al estilo Duolingo: rachas diarias, mascota virtual que sube de nivel con XP, gemas, logros, feed social con amigos, chat 1:1, recomendaciones con IA (Claude) y un recomendador colaborativo (Matrix Factorization) entrenado offline.

**Elevator pitch técnico:** SPA de React 18 servida por Vite como PWA instalable, con **Supabase como backend completo** (Auth, Postgres con RLS, triggers SECURITY DEFINER como "servidor de autoridad") y **funciones serverless de Vercel** solo para proxies (Anthropic, Google Books) y lectura de recomendaciones. No hay backend propio persistente.

### Stack y por qué

| Tech | Rol | Por qué |
|---|---|---|
| React 18 + Vite 5 | SPA | Sin SSR; la app es post-login, SEO irrelevante |
| vite-plugin-pwa (Workbox) | PWA instalable, offline | Público mobile-first; `registerType: autoUpdate`, `skipWaiting` |
| Supabase (`@supabase/supabase-js` v2) | Auth + DB + RLS + RPCs | Backend completo sin servidor propio |
| Vercel serverless (`api/`) | Proxies + endpoint de recomendaciones | Ocultar API keys, evitar CORS |
| Anthropic Claude (`claude-sonnet-4-6`) | Enriquecer libros, recomendaciones por mood | Vía proxy que exige JWT de Supabase, nunca desde el browser |
| Google Books API | Buscar libros/portadas/ISBN | Vía `api/books.js` con fallback ES→global |
| Python (scikit-surprise, SVD) | Recomendador colaborativo | Corre en GitHub Actions (cron diario), materializa a Postgres |
| Tailwind 3 (parcial) + estilos inline | UI | La mayor parte del estilo es inline con objeto `palette` de `theme.js` |
| lucide-react, canvas-confetti, howler, html2canvas | Iconos, celebraciones, sonidos, share-cards | |
| Express (`server.js`) | SOLO desarrollo local | Réplica local del proxy Anthropic (puerto 3001) |

---

## II. ARQUITECTURA DE CARPETAS

```
FOLIO FINAL/
├── api/                      # Funciones serverless de Vercel (Node)
│   ├── anthropic.js          # Proxy a api.anthropic.com: exige JWT de Supabase (o x-admin-key) + rate limit 10/min por IP
│   ├── books.js              # Proxy a Google Books (ES primero, global si <3 resultados)
│   ├── recommendations.js    # GET recomendaciones: valida el JWT y lee recommendation_scores con ese JWT (RLS)
│   └── buscalibre-check.js   # Verificación de link de afiliado Buscalibre
├── server.js                 # Express local: mismo proxy Anthropic (con la misma validación de JWT) para `npm run dev`
├── src/
│   ├── main.jsx              # Entry: ErrorBoundary raíz + listeners globales de error (overlay rojo SOLO en DEV)
│   ├── App.jsx               # ⚠️ MONOLITO (~14.900 líneas): casi TODAS las vistas y helpers
│   ├── supabase.js           # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── theme.js              # PALETTE_LIGHT/DARK + objeto mutable `palette` + resolveTheme
│   ├── haptics.js / sounds.js# Vibración y efectos de sonido (howler)
│   ├── index.css             # Tailwind base + estilos globales
│   ├── services/             # Capa de datos (extraída del monolito, commit 3b3adfd) — 8 servicios, ver §VI
│   ├── config/zones.js       # ZONES_CDMX: las 25 zonas fijas del Trueque (slugs = enum exchange_zone)
│   ├── components/           # AddToListSheet, BookCoverImage, BookTinder, DeleteAccountModal, ListDetailModal,
│   │                         # ListFormModal, ListsSection, ReadDateModal, ReadingStatusModal
│   │   └── trueque/          # Trueque de libros: TruequeMain + 10 modales/tarjetas + ui.jsx (ver §VII)
│   ├── pets/                 # PetDisplay, PetHub, PetLevelUpToast, PetOnboarding, PetScene
│   ├── data/                 # cuentos.js + cuentos/*.txt: ~23 cuentos de dominio público para "Snacks"
│   │                         # (los `_raw_*.txt` son material fuente sin procesar)
│   └── scripts/seed-books.js # Script suelto de seed (no forma parte del bundle)
│   (no existe `src/pages/`: no hay router, las "páginas" son vistas dentro de App.jsx)
├── public/                   # Iconos PWA, `logo.png`, `gema.png`, `avatars/avatar-1..10.png`, `pets/` (cat.png, cat-blink.png,
│                             # cat-video.mp4), `sw-notifications.js` (notificaciones programadas, importado por el SW de Workbox)
├── supabase/                 # Migraciones SQL (correr a mano en el SQL Editor, EN ESTE ORDEN)
│   ├── auth_rls_migration.sql            # 1. RLS de TODAS las tablas core (+ policies de Storage)
│   ├── features_migration.sql            # 2. user_lists + delete_my_account()
│   ├── recommendation_scores.sql         # 3. Tabla que llena el job de Python
│   ├── sprint1_server_authority.sql      # 4. reward_ledger + folio_award + triggers anti-cheat
│   ├── security_patch_reading_logs.sql   # 5. session_id único + rate limit de recompensas de lectura
│   ├── security_patch_achievements.sql   # 6. Cierra INSERT libre de logros → RPC award_achievement
│   ├── security_patch_streaks.sql        # 7. Cierra UPDATE libre de user_streaks → RPCs update_streak/freeze
│   ├── privacy_hardening.sql             # 8. RLS de lectura respeta is_public/amistad; email fuera del SELECT
│   ├── timezone_fix.sql                  # 9. "Hoy" server-side = America/Mexico_City
│   ├── trueque_schema.sql                # 10. Trueque de libros: 7 tablas + RLS + RPCs + bucket + pg_cron
│   ├── fix_signup_permissions.sql        # 11. Fix signup: policies INSERT/UPDATE de users + GRANT INSERT/UPDATE por columna
│   └── cleanup_orphan_auth_users.sql     # (opcional) lista/repara/borra cuentas huérfanas de auth.users
├── DOCUMENTACION_ARQUITECTURA_COMPLETA.docx  # Versión Word extendida (se genera con scripts/generate_docs.py; el .md es la fuente de verdad)
├── scripts/
│   ├── generate_docs.py      # Lee este .md y genera el .docx extendido (pip install python-docx)
│   ├── train_recommender.py  # SVD → top-20 por usuario → upsert a recommendation_scores
│   ├── books-500.json/sql    # Seed del catálogo books_curated
│   ├── books-data.js, generate-500-books.js, find_duplicates.py  # Generación/limpieza del catálogo
├── .github/workflows/train-recommender.yml  # Cron 3:00 UTC diario + manual
├── requirements.txt          # Deps de Python del job de entrenamiento
├── vite.config.js            # PWA manifest + estrategias de caché Workbox
├── vercel.json               # Cache-Control no-store para index.html/sw.js (¡crítico para PWA!)
├── generate-icons.mjs        # Genera iconos PWA desde SVG (usa @resvg/resvg-js)
├── AUDITORIA_FASE1_REPORTE.md / SISTEMA_MASCOTAS_EVOLUTIVAS.md  # Reporte de auditoría de esquema y diseño futuro de mascotas
└── .env / .env.example       # Ver "Variables de entorno" en §III (⚠️ .env.example está desactualizado)
```

**Convenciones:** servicios en `src/services/*Service.js` con named exports; componentes PascalCase; código y comentarios en español; columnas DB en snake_case mapeadas a camelCase en la capa de servicios (`dbToBook`/`bookToDb`).

---

## III. STACK TÉCNICO DETALLADO

### Frontend
- **Sin router**: la navegación es un estado `tab` en `MainApp` (`home | social | library | add | profile`...) + sub-tabs con `SubTabBar`. Deep-links se resuelven leyendo `window.location.search` (ej. `?action=log` abre el modal de registro, `?ref=usuario` abre perfil referido).
- **Sin state manager**: `useState`/`useEffect` + prop drilling desde `MainApp`, más **event buses** caseros (patrón pub/sub con arrays de listeners): `gemsEventBus`, `gemToastBus`, `petBus`, `achievementBus`. Sirven para que servicios sin acceso a React notifiquen a la UI (toasts de gemas, level-up de mascota, logros desbloqueados).
- **Tema**: `theme.js` exporta un objeto **mutable** `palette`; `MainApp` hace `Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT)` en cada render. Los componentes leen `palette.xxx` en estilos inline. Preferencia en `localStorage('folio_theme')`: light/dark/system.
- **Errores**: `main.jsx` tiene `RootErrorBoundary` + listeners globales `error`/`unhandledrejection`. El **overlay rojo de debug** (div en `document.body`) ahora solo se pinta con `import.meta.env.DEV`; en producción solo hace `console.error`. `RootErrorBoundary` también condiciona su fallback: en DEV muestra el stack trace rojo; en producción una pantalla amigable "Algo salió mal" con botón Recargar.

### Backend (Supabase)
- **Auth**: email+password, "Confirm email" OFF (sesión inmediata al registrarse). Sesión persistida en localStorage por supabase-js.
- **Autoridad server-side (anti-cheat)**: XP, nivel y gemas NO se pueden escribir desde el cliente. `sprint1_server_authority.sql` implementa:
  - `reward_ledger`: libro mayor idempotente (UNIQUE `user+reason+ref` parcial).
  - `folio_award(user, xp, gems, reason, ref)`: única puerta de otorgamiento, `SECURITY DEFINER`, con `REVOKE` a anon/authenticated (solo triggers/RPCs la llaman).
  - Triggers: libro terminado → **+50 XP +50 gemas** (idempotente por book id); sesión de lectura → **+2 XP por cada 10 páginas, +5 gemas**.
  - RPCs para lo iniciado por el cliente: `pet_daily_checkin()` (+3 XP, idempotente por día), `claim_daily_gems()` (+5 + bonus consecutivos, gate 20 h, crea fila con bienvenida), `claim_achievement_gems(keys[])` (+10 por logro).
  - `guard_pet_columns()`: trigger que impide al cliente tocar `xp`/`level` de `user_pets` (solo puede renombrar).
- **Hardening del sprint 2026-09-17** (5 migraciones posteriores, ver §VIII):
  - `security_patch_reading_logs.sql`: `reading_logs.session_id` (UUID único generado por el cliente, reutilizado en reintentos offline) es el `ref` idempotente del premio; rate limit server-side (máx. 12 logs premiados/día y 4/hora — pasado el tope el log se guarda pero no paga).
  - `security_patch_achievements.sql`: el cliente ya NO puede insertar en `achievements`; solo la RPC `award_achievement(key)` (revalida la condición real de cada logro en SQL).
  - `security_patch_streaks.sql`: el cliente ya NO puede escribir `user_streaks`; solo RPCs `update_streak()` (exige un `reading_log` real de hoy y recalcula `total_pages_read` como SUMA real), `reset_monthly_freeze()` y `use_streak_freeze()`.
  - `privacy_hardening.sql`: `is_public` ahora se hace cumplir en RLS (users/books/user_streaks/achievements: SELECT solo propio, público o amigo aceptado) y `users.email` se excluye del SELECT a nivel de columna.
  - `timezone_fix.sql`: "hoy" server-side = `(now() AT TIME ZONE 'America/Mexico_City')::date` en `pet_daily_checkin`, `claim_daily_gems`, `update_streak`, freeze; el cliente sigue usando su fecha local (`localDateStr`).

### APIs externas
- **Google Books** (`api/books.js`): busca con `langRestrict=es`, si hay <3 resultados repite global y mezcla. `s-maxage=300` en CDN. El cliente (`searchGoogleBooks` en App.jsx) deduplica por título+autor normalizados y cachea 60 s en memoria.
- **Open Library**: solo portadas (`covers.openlibrary.org`) como fallback, cacheadas por el service worker.
- **Anthropic**: dos usos — `enrichBook(title, author)` (género/resumen/moodTags en JSON) y `getRecommendations(books, moodAnswers)` (flow "Recomiéndame" por mood). Modelo `claude-sonnet-4-6`, respuesta parseada con `JSON.parse` tras limpiar fences. El cliente manda `Authorization: Bearer <access_token>` (helper en App.jsx ~línea 917) y ambas funciones validan el payload del proxy: un 429 o una respuesta sin `content` muestran un mensaje amigable en vez de romper la UI.
- **Supabase Storage** (buckets creados a mano en el dashboard; sus policies están en `auth_rls_migration.sql`): `avatars` y `covers` (foto/portada de perfil, path `<user_id>.<ext>`, `upsert`) y `post-images` (imagen adjunta a posts).

### IA/ML colaborativo
Pipeline en 3 piezas desacopladas (no hay Python en producción):
1. `scripts/train_recommender.py` — SVD (scikit-surprise) sobre interacciones usuario-libro; empareja `books` contra `books_curated` por (title, author) normalizados (los libros se guardan **por valor**, no por FK). Modos `--mock`, `--dry-run`, `--write-db`.
2. GitHub Actions (cron 3 AM UTC) lo ejecuta con `SUPABASE_SERVICE_ROLE_KEY` y materializa top-20 por usuario en `recommendation_scores`.
3. `api/recommendations.js` — GET con `Authorization: Bearer <jwt>`; usa la key **anon** + JWT del usuario para que RLS filtre solo sus filas. Si el usuario tiene <3 ratings → fallback: mejor valorados de `books_curated` no poseídos, mezclados.

### Deployment
- **Vercel**: proyecto `folio-final` (team `leonblancarte-9639s-projects`). ⚠️ **El repo GitHub NO está conectado a Vercel** (pendiente de vincular Login Connection GitHub↔Vercel): los deploys son manuales con `vercel --prod`. Un `git push` NO deploya.
- `vercel.json`: `Cache-Control: no-store` para `/`, `index.html`, `sw.js`, `workbox-*` — imprescindible para que la PWA se actualice; los assets con hash sí se cachean agresivamente.

### Variables de entorno
| Variable | Dónde | Uso |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | cliente + funciones `api/` + `server.js` + GitHub Actions | Expuestas al cliente (correcto); las funciones las usan para validar el JWT del usuario |
| `VITE_BUSCALIBRE_AFFILIATE_ID` | cliente (opcional) | ID de afiliado Buscalibre; App.jsx tiene un valor por defecto |
| `ANTHROPIC_API_KEY` | solo server (`api/anthropic.js`, `server.js`) | Proxy Anthropic |
| `GOOGLE_BOOKS_API_KEY` | solo server (`api/books.js`) | Opcional; sube la cuota de Google Books |
| `ADMIN_KEY` | solo server | Bypass del proxy Anthropic vía header `x-admin-key` (sin JWT ni rate limit) |
| `SUPABASE_SERVICE_ROLE_KEY` | SOLO GitHub Actions (secret) | Job de entrenamiento; jamás en Vercel ni en el cliente |
| `SUPABASE_SECRET_KEY` | solo `scripts/generate-500-books.js` | Escritura del catálogo curado |
| `PORT` | `server.js` | Puerto del proxy local (default 3001) |

`.env.example` está sincronizado con estas variables (con un comentario por cada una). Ojo: el job de Python también acepta `SUPABASE_URL`/`SUPABASE_ANON_KEY` como alternativa a las `VITE_*`.

### Dependencias (package.json)
- **runtime**: `react`/`react-dom` 18, `@supabase/supabase-js` ^2.105, `lucide-react`, `canvas-confetti`, `howler`, `html2canvas`; `express`, `dotenv` y `concurrently` (solo para `npm run dev`, están en `dependencies` pero no van al bundle).
- **dev**: `vite` 5, `@vitejs/plugin-react`, `vite-plugin-pwa`, `tailwindcss` 3 + `postcss` + `autoprefixer`, `@resvg/resvg-js` (`generate-icons.mjs`), `pg` (sin uso detectado en el repo).
- **Python** (`requirements.txt`, solo el job de GitHub Actions): `supabase`, `pandas`, `numpy`, `scipy`, `scikit-surprise`, `fuzzywuzzy`, `python-Levenshtein`.
- No hay dependencia de email transaccional (Resend/SMTP/etc.): el código no envía emails propios, solo los de Supabase Auth.

---

## IV. CORE FEATURES UNA POR UNA

### 1. Biblioteca (books)
- UI: `LibraryView` (grid de `BookCard`), `BookDetailModal` (editar, calificar, reseñar, borrar), `AddBookView` + `SearchBookModal` (busca en Google Books) + `BookForm` (manual).
- Servicios: `booksService.fetchBooks/insertBook/updateBookInDB/deleteBookFromDB`. Estados: `reading | want_to_read | wish | read` (`STATUS_META`).
- Al agregar, `enrichBook()` (Claude) puede completar género/resumen/moodTags.
- DB: tabla `books` (por usuario, sin FK a catálogo). RLS: SELECT solo propio, de cuentas públicas (`users.is_public` ≠ false) o de amigos aceptados (`privacy_hardening.sql`); escritura solo propia.
- Al marcar `read`: trigger `trg_book_finished` otorga +50 XP/+50 gemas (una sola vez por libro), y la UI dispara `BookFinishedCelebration` (confetti, rating rápido, share card).

### 2. Racha (streak)
- UI: `DailyReadingBanner` (Home/Feed), `RachaModal`, `ReadingLogModal` (registrar páginas + mood), `FiveMinutesModal` (timer de lectura).
- Servicio: `streakService.fetchStreakData(userId)` → `{ streak, hasLoggedToday, pagesLoggedToday }` (lee `user_streaks` + `reading_logs` de hoy). `checkStreakOnLoad` decide si la racha está activa o **en PAUSA** (filosofía anti-castigo: nunca se resetea, se congela).
- **Freeze**: 1 protector/mes (`streak_freezes_remaining`, reset mensual vía RPC `reset_monthly_freeze` desde `loadStreakInfo`); si faltó 1 día y el freeze se usó ayer, la racha sobrevive.
- Fechas **locales en el cliente** (`localDateStr`, `daysBetweenLocalDates` parsea a mediodía local para evitar bugs de DST/UTC); el servidor usa fecha de `America/Mexico_City` para los premios y la racha (ver §VIII).
- **La racha ya no la escribe el cliente**: `logReadingSession` (App.jsx) inserta en `reading_logs` con un `session_id` (`crypto.randomUUID()`) y luego llama a la RPC `update_streak()`, que avanza la racha solo si existe un log real de hoy. El freeze se consume/reasigna con las RPCs `use_streak_freeze()` / `reset_monthly_freeze()` (llamadas desde `loadStreakInfo` en App.jsx, no desde `streakService`).
- DB: `user_streaks` (current_streak, longest_streak, last_log_date, total_pages_read — solo SELECT para el cliente), `reading_logs` (pages_read, mood, log_date, `session_id` único). El check-in diario de XP es server-side (`pet_daily_checkin`, idempotente por día, fecha México).

### 3. Mascota (pet)
- UI: `PetOnboarding` (elegir/nombrar), `PetDisplay` (header), `PetHub` (panel), `PetLevelUpToast`. Un solo tipo actual: gato ("El Sensible"); diseño futuro en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- Servicio: `petService`. Nivel: `xpForLevel = level * 100`, tope 50. **El servidor calcula XP/nivel** (`folio_award` hace el loop de level-up); `addPetXP` del cliente quedó como *sincronizador*: re-lee la fila, detecta level-up comparando con `_lastKnownPetLevel` y emite en `petBus` para que la UI celebre.
- DB: `user_pets` protegida por `guard_pet_columns` (cliente solo renombra).

### 4. Gemas
- Solo se **leen** en el cliente (`loadGems`); toda escritura vía RPCs/triggers. La UI actualmente **no muestra gemas como moneda** (`showGemToast` es no-op; la moneda visible es el XP de la mascota). Se gastan en BookTinder: +5 saves por 5 gemas (`buyExtraSaves` — ⚠️ este único flujo aún descuenta con UPDATE directo del cliente, ver §XII).
- DB: `user_gems` (SELECT propio; sin INSERT/UPDATE de cliente), `reward_ledger` como auditoría. El premio por sesión de lectura ya no es farmeable: paga una vez por `session_id` y con tope de 12/día y 4/hora.

### 5. Feed social
- UI: `FeedView` (posts + `FeedEditorialContent` + `SnacksCarousel`), `PostDraftModal` (borrador al terminar sesión), `PostComments` (+ replies + likes), `QuotePostCard`, `BookPreviewModal` (agregar libro desde post de otro).
- Tipos de post: sesión de lectura compartida, logro desbloqueado (solo los de `FEED_WORTHY_ACHIEVEMENTS`), cita compartida, libro terminado.
- DB: `posts`, `comments`, `comment_replies`, `post_likes`, `comment_likes`, `notifications` (el actor inserta la notificación; RLS `notif_insert_actor`).
- Realtime: suscripciones de Supabase para mensajes/notifs no leídos.

### 6. Amigos + Chat
- UI: `FriendsView` (buscar por username, solicitudes, lista; ⚠️ desde `privacy_hardening.sql` las cuentas con `is_public=false` NO aparecen en la búsqueda para quien aún no es su amigo), `ChatView` (1:1), `FriendProfileModal` + `CompareProfilesView` + `LiteraryCompatibility` (% de compatibilidad lectora).
- DB: `friendships` (user_id, friend_id, status pending/accepted), `conversations` (user1/user2), `messages`. RLS restringe conversaciones/mensajes a las partes.

### 7. Recomendaciones (3 motores distintos)
1. **BookTinder** (`components/BookTinder.jsx` + `recommendationService`): swipe sobre `books_curated` filtrado por `preferred_genres` del onboarding (mapa `GENRE_MAP` id→labels), excluye ya poseídos, límite **15 saves/día** (`daily_save_limits`) ampliable con gemas.
2. **Mood-based con Claude** (`RecommendFlow` en App.jsx): cuestionario de mood → prompt con biblioteca del usuario → `fromLibrary` + `newSuggestions`.
3. **Colaborativo SVD** (`CollaborativeRecommendations` → `api/recommendations.js` → `recommendation_scores`): personalizado si ≥3 ratings, si no fallback a mejor valorados.

### 8. Logros (achievements)
- Motor client-side `checkAchievements(userId)`: 27 defs en `ACHIEVEMENT_DEFS` (lectura, sesiones, rachas, social, especiales). Consulta 6 tablas en paralelo y compara contra `checks{}` para obtener *candidatos*; **el otorgamiento es server-side**: por cada candidato llama a la RPC `award_achievement(key)`, que revalida la condición real en SQL (mismas 27 keys; key desconocida → nunca se otorga) e inserta la fila. Los que devuelve `true` emiten `achievementBus` → `AchievementCelebration` (modal + confetti + compartir). Gemas del logro las paga el server (`claim_achievement_gems`). ⚠️ La lógica de cada logro vive duplicada (JS en `checkAchievements` + SQL en `award_achievement`): si se añade o cambia un logro hay que tocar ambos.

### 9. Citas (quotes)
- `SaveQuoteModal`, `QuotesView`, `QuoteDetailModal`, `QuoteShareCard` (html2canvas para exportar imagen), compartir al feed. Tabla `quotes` con `is_public`.

### 10. Snacks literarios (cuentos)
- ~23 cuentos de dominio público embebidos en `src/data/cuentos/*.txt` (importados vía `cuentos.js`). `ReaderView` es un lector in-app con progreso. Cero dependencia de red — funciona offline.

### 11. Wrapped mensual
- `WrappedStoryExperience` / `WrappedCard`: resumen tipo Spotify Wrapped del mes (libros, páginas, racha), generado client-side, guardado en `monthly_wraps`, exportable como imagen.

### 12. Onboarding + Tutorial
- `NewUserOnboarding` (4 pasos: géneros → primer libro → avatar → primer amigo) guarda `preferred_genres`/`onboarding_completed` en `users`. `TutorialOverlay` en primer login.

### 13. Biblioteca UAM + Afiliados
- `UAMLibraryView`: catálogo universitario curado; agregar uno desbloquea logro `uam_book`. Links de compra a Buscalibre con `BUSCALIBRE_AFFILIATE_ID`.

---

### 14. Trueque de libros (MVP, 2026-09-18)
Intercambio de libros **físicos** entre usuarios de la misma zona de CDMX. Tab `trueque` en `NAV_ITEMS` (icono `Repeat`), renderiza `TruequeMain`.

**Flujo:**
```
Tab Trueque → TruequeMain carga en paralelo: trueque_status() · user_exchange_zones · books_offered · books_wanted · get_my_exchange_matches()
  ├─ sin zonas → ZonesOnboarding (2..3 zonas free / 2..5 Plus) → RPC set_exchange_zones   ("Ahora no" → Home)
  ├─ Ofrezco: OfferBookModal → INSERT books_offered (+ foto opcional en bucket 'trueque', ruta <uid>/<uuid>.<ext>)
  ├─ Busco:   WantBookModal  → INSERT books_wanted
  │     (límites free: 3 ofrecidos / 5 buscados; al llegar → PlusUpsellModal, placeholder sin pago)
  ├─ "🔍 Buscar matches" → RPC cost_search_matches (−20 gemas, o gratis Plus con tope 10/día) → emite 1 crédito
  │                      → RPC find_book_matches (consume el crédito, genera matches, devuelve la lista)
  ├─ MatchCard "Enviar mensaje" → LegalDisclaimerModal (1 vez por match, localStorage `disclaimer_accepted_${match_id}`)
  │                             → ExchangeChat (RPC send_exchange_message; pending→chatting; polling 8 s; páginas de 50)
  └─ "Completado" (cualquiera de los dos) → RPC complete_exchange → los libros del match se desactivan
                                          → RatingModal → RPC rate_exchange (1-5 ★ + reseña opcional)
```

**Tipos de match** (uno por pareja de usuarios; requiere ≥1 zona compartida):
- 🟢 **perfecto**: un libro mío está en su "Busco" **y** un libro suyo está en mi "Busco" (o en mi lista "Por leer").
- 🟡 **parcial**: solo una de las dos direcciones. El libro que falta se muestra como "Por acordar en el chat".
- **Lista "Por leer"**: los `books` con `status='want_to_read'` cuentan como "Busco"; el match lleva `via_reading_list = true` (no es un tipo aparte).

**Estados del match:** `pending` → (primer mensaje) `chatting` → `completed`. Laterales: `cancelled` (el dueño quitó el libro, o una búsqueda nueva lo reemplazó por otro mientras seguía `pending`) y `expired` (`expires_at` = creación + 14 días).

**Monetización (freemium):** `users.is_premium` = Folio Plus. **No hay pago real**; se activa a mano (`UPDATE users SET is_premium = true WHERE id = '<uuid>'`). Los límites viven en la tabla `trueque_gems_cost`, editable sin redeploy.

**Supuestos tomados en el MVP (ambigüedades del spec → opción más simple):**
- **Una fila por pareja:** `user_a_id < user_b_id` (orden canónico) y **un solo match vivo por pareja**, con el primer libro que empata de cada lado. Si hay varios libros en común, se negocia en el chat.
- **Solo título:** el matching compara el título normalizado; el autor se muestra pero no se compara ("Rayuela" de dos ediciones empata).
- **Cobro de la búsqueda fuera de `folio_award`:** `folio_award` ignora los deltas ≤ 0, así que el cobro de 20 gemas lo hace `cost_search_matches` directo en `user_gems` + una fila negativa en `reward_ledger` (`reason='trueque_search'`).
- **Crédito de búsqueda:** `find_book_matches` exige un crédito emitido por `cost_search_matches` (tabla interna `trueque_search_credits`, vigencia 10 min). Así no se pueden buscar matches gratis llamando la RPC directo.
- **Cierre:** cualquiera de los dos participantes puede marcar el intercambio como completado. El "ciclo" queda cerrado cuando existen las 2 calificaciones; `completed` ya es un estado terminal, así que no hay un estado extra.
- **Colores:** la UI usa `palette` de `theme.js` (accent `#7A2E2E`, bg `#F4EDE0`, Fraunces/EB Garamond) en vez de los hex del spec (`#A02A2A`/`#F5EBD8`), para mantener consistencia con el resto de la app y el modo oscuro.
- **Chat sin realtime:** el chat del trueque usa polling cada 8 s mientras está abierto; no usa realtime ni notificaciones.
- **Límites Plus extra:** se añadieron a la config 3 claves que el spec no listaba: `plus_max_wanted` (999), `plus_max_zones` (5) y `plus_daily_searches` (10).

## V. FLUJOS DE DATOS CRÍTICOS

### Registro
```
AuthView → registerWithSupabase()
  1. supabase.auth.signUp (Confirm email OFF → sesión inmediata, auth.uid() ya existe)
     · "already registered" → recoverOrphanAccount(): signInWithPassword; si la contraseña coincide y NO hay
       fila en public.users (cuenta huérfana) crea el perfil y entra; si el perfil ya existe → "Ya existe una cuenta"
  2. INSERT plano en public.users { id: auth.uid(), email, nombre, username }  ← pasa la policy INSERT (auth.uid() = id)
     · 23505 por username → "username en uso"; 23505 por PK → ya existía (ok, idempotente)
     · si falla → signOut() (queda una huérfana en auth.users que el próximo login/registro repara)
  3. App muestra NewUserOnboarding → PetOnboarding → MainApp

Login / arranque: buildAppUser(authUser) lee public.users; si NO hay fila (cuenta huérfana) la auto-crea con
user_metadata (nombre, username; sufijo si el username ya está tomado) y deja un console.info "[auth] perfil auto-creado".
```

### Terminar un libro (el flujo más rico)
```
BookDetailModal "Marcar leído" → updateBookInDB(status='read')
  ├─ [DB trigger] trg_book_finished → folio_award(+50 XP, +50 gemas, ref=book.id)  ← idempotente
  ├─ [UI] BookFinishedCelebration (confetti + rating + share)
  ├─ addPetXP() re-lee user_pets → petBus.emit → PetLevelUpToast si subió
  ├─ checkAchievements() → candidatos → RPC award_achievement(key) valida en SQL → achievementBus → AchievementCelebration
  │    └─ si es FEED_WORTHY → post automático al feed
  └─ feed: opción de compartir → posts → amigos lo ven → BookPreviewModal → "+ Agregar"
```

### Registrar sesión de lectura
```
ReadingLogModal → logReadingSession() genera session_id (crypto.randomUUID)
  ├─ INSERT reading_logs { ..., log_date (local), session_id }   ← 23505 = sesión ya sincronizada → se corta sin duplicar
  │    └─ [DB trigger] trg_reading_logged → +2 XP/10 págs, +5 gemas (ref = session_id; máx 12/día y 4/hora, luego guarda sin pagar)
  ├─ RPC update_streak() → el servidor avanza racha y total_pages_read (exige log real de hoy, fecha México)
  ├─ PostDraftModal ofrece compartir la sesión al feed
  └─ offline → addPendingLog({..., sessionId}) a localStorage → al volver online, syncPendingLogs() reusa el MISMO session_id
       (un reintento ya sincronizado choca con el UNIQUE y no paga dos veces)
```

### Recomendación colaborativa
```
[nightly] GitHub Actions → train_recommender.py (service_role) → SVD → upsert recommendation_scores
[runtime] CollaborativeRecommendations → GET /api/recommendations (Bearer JWT)
          → lee recommendation_scores con RLS (auth.uid() = user_id) → UI
```

### Arranque de la app
```
main.jsx → App → getSessionUser() (supabase.auth.getSession + perfil, fallback caché local)
  → MainApp: fetchBooks (o caché offline) + loadPet + loadGems + claim_daily_gems
  + checkStreakOnLoad + pet_daily_checkin + reset_monthly_freeze + realtime subs (mensajes/notifs)
```

---

## VI. SERVICIOS (src/services/)

| Servicio | Exports clave | Llama a | Notas |
|---|---|---|---|
| `authService` | `loginWithSupabase`, `registerWithSupabase`, `getSessionUser`, `updateDisplayName`, `logout` | Supabase Auth + `users` | Mapea `nombre`→`name`; caché `folio_auth_user` para offline. **Cuentas huérfanas (2026-09-18):** `buildAppUser` auto-crea el perfil si hay sesión pero no fila en `users` (`autoCreateProfile`, con metadata y sufijo de username si hay colisión); `registerWithSupabase` usa INSERT plano (`insertProfileRow`, ya NO upsert) y, ante "ya registrado", intenta `recoverOrphanAccount` |
| `booksService` | `fetchBooks`, `insertBook`, `updateBookInDB`, `deleteBookFromDB`, `dbToBook`/`bookToDb`, `isUnknownColumnError`, `stripTotalPages`, `readDateLabel`; caché offline: `cacheBooks`/`getCachedBooks`, `cacheProfile`/`getCachedProfile`, `cacheAchievements`/`getCachedAchievements`; colas: `getPendingLogs`/`addPendingLog`, `getPendingPosts`/`addPendingPost` | `books` | Reintenta sin `total_pages/read_date_precision` si la migración no corrió (`isUnknownColumnError`); UPDATE/DELETE verifican filas afectadas para detectar RLS. Los pending logs guardan `sessionId` |
| `streakService` | `fetchStreakData`, `checkStreakOnLoad`, `localDateStr`, `daysBetweenLocalDates` | `user_streaks`, `reading_logs`, RPC `pet_daily_checkin` | Racha se PAUSA, nunca se resetea. Solo lee; las escrituras de racha/freeze van por RPCs `update_streak`/`use_streak_freeze`/`reset_monthly_freeze` (llamadas desde App.jsx) |
| `gemsService` | `loadGems`, `claimDailyGems`, `initUserGems`, `gemsEventBus`, `gemToastBus` | `user_gems`, RPC `claim_daily_gems` | Cliente solo lee |
| `petService` | `loadPet`, `createPet`, `updatePetName`, `addPetXP` (sync), `petBus`, `PET_TYPES`, `PET_MAX_LEVEL`, `petXpForLevel`, `petImageSrc` | `user_pets` | `loadPet` distingue null (sin mascota) de undefined (error) para no romper onboarding |
| `listsService` | `fetchUserLists`, `createUserList`, `updateUserList`, `deleteUserList`, `addBookToList`, `removeBookFromList` | `user_lists`, `user_list_books` | 23505 tratado como éxito idempotente |
| `recommendationService` | `getRecommendations`, `getPreferredGenres`, `checkDailyLimit`, `incrementSaveCounter`, `buyExtraSaves` (⚠️ client-side, ver §XII) | `books_curated`, `daily_save_limits`, `user_gems` | Límite 15/día (`localDateStr` para la fecha); expansión de géneros del onboarding vía `GENRE_MAP` (interno, no exportado) |
| `truequeService` | `getZones`, `getUserZones`, `setUserZones`, `getTruequeStatus`, `getMyOffers`, `addBookOffered`, `deleteBookOffered`, `getMyWants`, `addBookWanted`, `deleteBookWanted`, `searchMatches`, `getMatches`, `getMatchChat`, `sendMessage`, `completeExchange`, `rateExchange`, `isDisclaimerAccepted`, `acceptDisclaimer`, `TruequeError`, `CHAT_PAGE_SIZE` | `user_exchange_zones`, `books_offered`, `books_wanted`, `exchange_chats`, bucket `trueque`, RPCs del Trueque | Traduce `RAISE EXCEPTION 'TRUEQUE_*'` a `TruequeError { code, message }` en español (la UI usa `code` para abrir el modal de Plus). Borrar = soft delete (`is_active=false`). `searchMatches()` devuelve `{ paid:false }` sin lanzar si no alcanzan las gemas. `getMatchChat(matchId, { before })` pagina de 50 en 50 |

Helpers que **siguen en App.jsx** (no en services): `logReadingSession`, `syncPendingLogs`, `checkAchievements`, `enrichBook`, `getRecommendations` (versión Claude/mood, distinta a la de `recommendationService`), `searchGoogleBooks`, `createFeedPost`; `loadStreakInfo` es una función interna de un componente de App.jsx (~línea 9873).

Ejemplo de uso típico:
```js
const { streak, hasLoggedToday, pagesLoggedToday } = await fetchStreakData(user.id);
const books = await fetchBooks(user.id);          // devuelve camelCase, cachea offline
await insertBook({ title, author, status: "want_to_read" }, user.id);
```

---

## VII. COMPONENTES PRINCIPALES

Todo vive en `App.jsx` salvo lo extraído a `src/components/` (AddToListSheet, BookCoverImage, BookTinder, DeleteAccountModal, ListDetailModal, ListFormModal, ListsSection, ReadDateModal, ReadingStatusModal) y `src/pets/` (PetDisplay, PetHub, PetLevelUpToast, PetOnboarding, PetScene), más `src/components/trueque/` (ver abajo). No existe `src/pages/`. Jerarquía:

```
main.jsx → RootErrorBoundary → App
  ├─ AuthView (login/registro)
  ├─ NewUserOnboarding (4 pasos) / PetOnboarding / TutorialOverlay
  └─ MainApp (≈40 estados; dueño de: tab, books, pet, gemas, colas de toasts, tema)
      ├─ AppHeader / BottomNav (tabs + badges de pendientes/no-leídos)
      ├─ HomeView (dashboard: saludo, racha, leyendo ahora, accesos)
      ├─ SocialView → FeedView (posts, DailyReadingBanner, snacks) / FriendsView / ChatView
      ├─ LibraryView → BookCard → BookDetailModal · ListsSection → ListDetailModal
      ├─ AddBookView → SearchBookModal / BookForm · BookTinder · RecommendFlow
      │                · CollaborativeRecommendations · UAMLibraryView
      ├─ TruequeMain (tab "trueque") → ver árbol del Trueque abajo
      ├─ PerfilWrapper → ProfileView (stats, ReadingHeatmap, AchievementGrid, QuotesView,
      │                  ReadingStatsView, Wrapped, configuración, DeleteAccountModal)
      └─ Overlays globales: PetHub, NotificationsSheet, AmigosSheet, ReadingLogModal,
         SaveQuoteModal, AchievementCelebration, BookFinishedCelebration, Gem/Pet toasts,
         PWAUpdateBanner
```

Patrón general: cada vista recibe `user`, `books`, `setTab` y callbacks (`onAdd`, `onSelectBook`) por props desde `MainApp`; los modales son estado local + render condicional (no hay portal manager).

**`src/components/trueque/`** (props desde `MainApp`: `user`, `gemBalance`, `onGemsChanged` → `loadGems`, `onExit` → Home):

| Componente | Qué renderiza |
|---|---|
| `TruequeMain` | Contenedor: zonas (chips editables), botón "Buscar matches" (costo en 💎 o cupo Plus), sub-tabs Ofrezco/Busco/Matches, y dueño de todos los modales |
| `ZonesOnboarding` | Modal de primera vez (sin cerrar): elegir 2..máx zonas; "Ahora no" vuelve a Home |
| `ZonesEditor` | Modal para editar zonas; exporta también `ZonePicker` (chips) y `MIN_ZONES` |
| `OfferBookModal` | Form de libro ofrecido: título, autor, editorial, estado (como nuevo/usado/rayoneado), foto JPG/PNG/WebP ≤ 5 MB |
| `WantBookModal` | Form de libro buscado: título, autor, editorial |
| `BookCard` | Tarjeta de libro (foto o placeholder, estado) con borrado en dos toques |
| `MatchesList` | Agrupa 🟢 perfectos / 🟡 parciales / ✅ completados; estado vacío |
| `MatchCard` | Otro usuario (avatar, ★ promedio), "Recibes ⇄ Das", zonas compartidas, badge "De tu lista Por leer", días para expirar, botones Enviar mensaje / Calificar |
| `LegalDisclaimerModal` | Texto legal exacto + checkbox obligatorio "Confirmo que he leído y acepto" |
| `ExchangeChat` | Chat a pantalla completa: burbujas, mensajes de sistema, "Cargar mensajes anteriores", polling 8 s, botón "Completado" (confirma en 2 toques) |
| `RatingModal` | 1-5 estrellas + reseña opcional (≤ 500) |
| `PlusUpsellModal` | CTA placeholder de Folio Plus (botón "Próximamente", sin pago) |
| `ui.jsx` | Helpers compartidos: `Sheet`, `fieldStyle`, `Label`, `PrimaryButton`, `ErrorText`, `CONDITION_LABELS` |

**Navegación:** `NAV_ITEMS` pasó de 5 a 6 entradas (Trueque entre Social y Perfil). El padding lateral de cada ítem del `BottomNav` bajó de 14 px a 8 px para que las 6 quepan en ~360 px. El botón de Mascota deja de estar exactamente al centro.

---

## VIII. BASE DE DATOS (Supabase)

### Tablas
`users` (perfil; id = auth.uid; `nombre`, `username`, `preferred_genres[]`, `onboarding_completed`, `avatar_url`, `cover_url`, `bio`, `is_public`; `email` sin SELECT para clientes) · `books` · `quotes` · `reading_logs` · `user_streaks` · `user_gems` · `user_pets` · `achievements` · `monthly_wraps` · `notifications` · `friendships` · `conversations` · `messages` · `posts` · `comments` · `comment_replies` · `post_likes` · `comment_likes` · `user_lists` · `user_list_books` · `books_curated` (catálogo ~500, seed en scripts/) · `daily_save_limits` · `recommendation_scores` · `reward_ledger` · **Trueque:** `user_exchange_zones` · `books_offered` · `books_wanted` · `exchange_matches` · `exchange_chats` · `exchange_ratings` · `trueque_gems_cost` (+ interna `trueque_search_credits`).

**Vistas:** `users_public` (`security_invoker`, columnas `id, nombre, username, avatar_url, cover_url, bio, is_public`, sin email; creada por `privacy_hardening.sql`, el código actual todavía no la usa). **Columnas añadidas por los parches:** `reading_logs.session_id` (uuid NOT NULL DEFAULT gen_random_uuid(), UNIQUE). **Storage:** buckets `avatars`, `covers`, `post-images` (ver §III).

### RLS — modelo general (`auth_rls_migration.sql` + parches posteriores)
- **Lectura con privacidad real** (`privacy_hardening.sql`, reemplaza las antiguas `*_select_auth` abiertas): `users` (`users_select_scoped`), `books` (`books_select_scoped`), `user_streaks` (`streaks_select_scoped`) y `achievements` (`ach_select_scoped`) permiten SELECT solo si eres el dueño, el dueño tiene `is_public` ≠ false (default histórico "público", `COALESCE(is_public,true)`) o hay `friendships.status='accepted'` entre ambos. `users.email` además está revocado a nivel de **columna** (GRANT SELECT explícito sobre todas las demás columnas, calculado al correr la migración: ⚠️ una columna añadida después a `users` NO queda legible hasta re-otorgar el GRANT).
- **Policies de escritura de `users`** (`fix_signup_permissions.sql`, reemplazan a `users_insert_self`/`users_update_own`): INSERT `"Users can create their own profile"` (`WITH CHECK auth.uid() = id`) y UPDATE `"Users can update their own profile"` (`USING`/`WITH CHECK auth.uid() = id`). Además `GRANT INSERT (...)` y `GRANT UPDATE (...)` por columna a `authenticated` sobre todas las columnas de `users` salvo `is_premium` (calculadas dinámicamente). **Lección:** `permission denied for table users` es un error de GRANT, no de RLS (RLS dice "violates row-level security policy"); con GRANTs por columna, un UPSERT (`ON CONFLICT DO UPDATE`) necesita más privilegios que un INSERT plano.
- **Lectura social abierta** a `authenticated` que se mantiene: pets, wraps, posts, comments, likes, friendships. Privadas: quotes (`is_public` o propias), reading_logs, gems, notifications (solo destinatario), messages/conversations (solo las partes), recommendation_scores y reward_ledger (solo propias).
- **Escritura**: `auth.uid() = user_id` (o partes de la conversación), EXCEPTO: `user_gems`, `reward_ledger`, **`achievements`** (`ach_write_own` eliminada) y **`user_streaks`** (`streaks_write_own` eliminada), que quedan sin política de escritura → solo SECURITY DEFINER (triggers/RPCs).

### Funciones y triggers (`sprint1_server_authority.sql` + parches de seguridad)
| Objeto | Qué hace |
|---|---|
| `folio_award(user, xp, gems, reason, ref)` | Única puerta de recompensas; idempotente vía reward_ledger; level-up loop (nivel*100, cap 50); REVOKE a clientes |
| `trg_book_finished` (INSERT/UPDATE books) | status→'read': +50 XP +50 gemas, ref=book id |
| `trg_reading_logged` (INSERT reading_logs) | +2 XP por cada 10 páginas, +5 gemas; `ref = session_id` (idempotente); rate limit: >12 logs en el día o >4 en la última hora → el log se guarda pero no paga (`security_patch_reading_logs.sql`) |
| `pet_daily_checkin()` RPC | +3 XP si racha activa; idempotente por día (día = fecha `America/Mexico_City`) |
| `claim_daily_gems()` RPC | +5 + bonus consecutivos; gate 20 h; crea fila con bienvenida; fecha México (`timezone_fix.sql`) |
| `claim_achievement_gems(keys[])` RPC | +10 gemas por logro, idempotente por key |
| `award_achievement(key)` RPC (`security_patch_achievements.sql`) | Revalida en SQL la condición real de cada uno de los 27 logros contra las tablas del `auth.uid()`; inserta en `achievements`; devuelve `true` si lo otorgó, `false` si ya estaba o no cumple (key desconocida nunca se otorga) |
| `update_streak()` RPC (`security_patch_streaks.sql`) | Exige un `reading_log` real de hoy (fecha México); avanza `current_streak`/`longest_streak`/`last_log_date`; `total_pages_read` = SUMA real de `reading_logs` |
| `reset_monthly_freeze()` RPC | Reasigna 1 protector si cambió el mes (México) y quedaban 0 |
| `use_streak_freeze()` RPC | Consume el protector (`streak_freezes_remaining`=0, `streak_freeze_used_at`=hoy); lanza excepción si no hay disponible |
| `guard_pet_columns` trigger | Cliente no puede tocar xp/level de user_pets |
| `delete_my_account()` (features_migration) | Borrado en cascada de la cuenta del usuario autenticado |

### Trueque de libros (`trueque_schema.sql`)

**Enums:** `exchange_zone` (25 slugs, idénticos a `src/config/zones.js`), `exchange_condition` (`como_nuevo`, `usado`, `rayoneado`), `exchange_match_type` (`perfecto`, `parcial`), `exchange_status` (`pending`, `chatting`, `completed`, `cancelled`, `expired`). **Columna nueva:** `users.is_premium boolean NOT NULL DEFAULT false`, protegida por el trigger `guard_users_premium` (SECURITY INVOKER a propósito: si el rol es `authenticated`/`anon`, revierte cualquier cambio; sin GRANT de SELECT para clientes, se lee vía `trueque_status()`).

| Tabla | Columnas | RLS |
|---|---|---|
| `user_exchange_zones` | `user_id` FK users CASCADE, `zone exchange_zone`; PK (user_id, zone) | SELECT dueño + contrapartes de un match `pending/chatting/completed`; INSERT/UPDATE/DELETE solo dueño. Trigger: máx. del plan (free 3, Plus 5, tope duro 5) |
| `books_offered` | `id`, `user_id` FK CASCADE, `title`/`author` (1-200, NOT NULL), `editor`, `condition`, `photo_url`, `is_active`, `created_at`, `title_norm` (GENERATED = `trueque_norm(title)`) | SELECT autenticados si `is_active` (o dueño); escritura solo dueño. Triggers: límite free/Plus en INSERT y en reactivación; costo de publicar si config > 0; cancelar matches vivos al desactivar; bloquear cambio de título/autor en match vivo |
| `books_wanted` | `id`, `user_id` FK CASCADE, `title`/`author`, `editor`, `is_active`, `created_at`, `title_norm` | Igual que `books_offered` (límite free 5) |
| `exchange_matches` | `id`, `user_a_id < user_b_id` (FK CASCADE), `match_type`, `book_a_offers`/`book_b_offers` (FK books_offered CASCADE, uno puede ser NULL en parcial), `shared_zones text[]`, `via_reading_list`, `status`, `created_at`, `expires_at` (+14 días) | SELECT solo participantes; sin INSERT/UPDATE/DELETE para clientes (REVOKE + sin policy) → solo RPCs. UNIQUE parcial `exchange_matches_live_unique` (pareja + libros con COALESCE, solo estados vivos/completados) |
| `exchange_chats` | `id`, `match_id` FK CASCADE, `sender_id`, `message` (1-1000), `is_system`, `created_at` | SELECT solo participantes del match; escritura solo RPC / trigger |
| `exchange_ratings` | `id`, `match_id`, `rated_by`, `rated_user`, `rating` 1-5 (CHECK), `review` (≤ 500), `created_at`; UNIQUE (match_id, rated_by) | SELECT solo participantes; escritura solo RPC |
| `trueque_gems_cost` | `key` PK, `value int` — `search_matches_cost` 20, `publish_book_cost` 0, `free_tier_max_offered` 3, `free_tier_max_wanted` 5, `free_tier_max_zones` 3, `plus_max_offered` 999, `plus_max_wanted` 999, `plus_max_zones` 5, `plus_daily_searches` 10 | SELECT autenticados; escritura solo SQL Editor |
| `trueque_search_credits` (interna) | `id`, `user_id`, `created_at`, `used_at` | Sin policies ni GRANT: solo SECURITY DEFINER |

| RPC (SECURITY DEFINER, `authenticated`) | Qué hace |
|---|---|
| `trueque_status()` → jsonb | Plan, límites efectivos, costo de búsqueda, búsquedas de hoy, conteos activos |
| `set_exchange_zones(text[])` | Reemplazo atómico de zonas; dedup; valida 2..máx del plan y el enum |
| `cost_search_matches(p_user_id)` → bool | Exige `p_user_id = auth.uid()` y zonas. Plus: gratis con tope diario (`TRUEQUE_RATE_LIMIT`). Free: descuenta 20 gemas atómicamente (`balance >= costo`) + ledger negativo. `false` si no alcanza. Emite un crédito |
| `find_book_matches(p_user_id)` → TABLE | Consume un crédito (`TRUEQUE_NO_CREDIT` si no hay), expira los vencidos del usuario, genera/actualiza matches y devuelve la lista con los datos del otro usuario (nombre, avatar, ★ promedio), los libros de cada lado y `i_rated` |
| `get_my_exchange_matches()` → TABLE | Lo mismo pero solo lectura (no descubre ni cobra); oculta vencidos |
| `send_exchange_message(match, text)` → uuid | Participante + match vivo + no vencido; pending→chatting |
| `complete_exchange(match)` → bool | Participante; requiere `chatting`; desactiva los libros del match (sus otros matches vivos se cancelan por trigger) |
| `rate_exchange(match, rating, review)` → uuid | Requiere `completed`; 1 por participante (`TRUEQUE_ALREADY_RATED`) |
| `cleanup_expired_matches()` → int | NO expuesta a clientes. pg_cron `trueque-cleanup-expired-matches`, `0 9 * * *` UTC = 3:00 AM hora de México |

Internas (REVOKE a clientes): `trueque_norm`, `trueque_cfg`, `trueque_generate_matches`, `trueque_matches_for`. **Storage:** bucket `trueque` (público, 5 MB, jpeg/png/webp). Lectura pública; INSERT/UPDATE/DELETE solo en objetos cuyo nombre empieza con `<auth.uid()>/`. Todos los errores de negocio son `RAISE EXCEPTION 'TRUEQUE_*'`, y `truequeService` los traduce.

**Borrado de cuenta:** todas las FKs del Trueque son `ON DELETE CASCADE` a `users`, así que `delete_my_account()` (que borra `public.users`) arrastra zonas, libros, matches, chats y ratings sin tocar esa función. Las fotos del bucket `trueque` **no** se borran (ver §XII).

### Índices relevantes
`reward_ledger_once` (UNIQUE parcial user+reason+ref WHERE ref IS NOT NULL), `reading_logs_session_id_key` (UNIQUE `session_id`), `recommendation_scores_user_idx`, PKs/uniques (user_pets.user_id UNIQUE, achievements UNIQUE(user_id, key), daily_save_limits onConflict user_id+date).

---

## IX. INTEGRACIONES EXTERNAS

| Integración | Entrada | Detalles |
|---|---|---|
| Google Books | `GET /api/books?q=` | Server añade `GOOGLE_BOOKS_API_KEY` si existe; ES-first; CDN cache 5 min; cliente deduplica y cachea 60 s |
| Open Library | directo desde el cliente | Solo covers; SW cachea 200 imágenes 30 días |
| Anthropic | `POST /api/anthropic` | Passthrough del body a `/v1/messages`. **Exige `Authorization: Bearer <JWT Supabase>`** (validado con `supabase.auth.getUser`; 401 si falta o es inválido) o el header `x-admin-key` (bypass total, sin JWT ni rate limit). Rate limit 10 req/min/IP, solo para usuarios no-admin (Map en memoria — se resetea por cold start). `server.js` (dev) valida el JWT igual pero sin rate limit |
| Supabase Auth | supabase-js | Token en localStorage; realtime channels para chat/notifs. El JWT también autentica `/api/anthropic` y `/api/recommendations` |
| Supabase Storage | supabase-js | Buckets `avatars`, `covers`, `post-images` (URLs públicas; avatar/portada se sobrescriben con `upsert` en `<user_id>.<ext>`) |
| Email transaccional (Resend, etc.) | — | **No integrado.** No hay código ni dependencia; solo los emails propios de Supabase Auth |
| Vercel | `vercel --prod` manual | ⚠️ sin integración Git aún; `vercel.json` controla el caching. Sus `rewrites` mencionan `/api/login`, que no existe en `api/` (rewrite muerto, inofensivo) |
| GitHub Actions | cron diario | Entrena recomendador; secrets: SUPABASE_SERVICE_ROLE_KEY (SOLO aquí, jamás en Vercel/cliente) |
| PWA/Workbox | vite.config.js | autoUpdate + skipWaiting; NetworkFirst para navegación (timeout 3 s → caché offline); `sw-notifications.js` para notifs programadas |

---

## X. PATRONES Y CONVENCIONES

1. **Servicios = funciones async con named exports** que devuelven datos o lanzan; el componente decide la UI de error.
2. **Event buses pub/sub** para cruzar la frontera servicio→UI sin contexto React (`petBus`, `gemsEventBus`, `achievementBus`). Patrón: `bus.on(fn)` devuelve unsubscribe; usar dentro de `useEffect`.
3. **Offline-first pragmático**: lecturas caen a caché localStorage (`folio_books`, `folio_profile`, `folio_auth_user`); escrituras van a colas (`folio_pending_logs/posts`) y se sincronizan al reconectar (`useOnlineStatus` + `syncPending*`). Los logs pendientes conservan su `sessionId`, así que el reintento es idempotente en el servidor.
4. **Degradación por migraciones pendientes**: los servicios toleran columnas/tablas inexistentes (reintento sin columnas nuevas, warnings con el SQL a correr). Permite deployar frontend antes que la migración.
5. **Idempotencia en todas las recompensas** (reward_ledger) y en inserts sociales (23505 = éxito).
6. **Server authority**: cualquier valor "ganable" (XP/gemas/nivel, logros, racha) se decide en Postgres vía RPC/trigger SECURITY DEFINER; las tablas `user_gems`, `reward_ledger`, `achievements` y `user_streaks` no tienen política de escritura para el cliente. El cliente solo lee, calcula *candidatos* (p. ej. `checkAchievements`) y sincroniza.
7. **Fechas**: el cliente usa hora local, nunca UTC (`localDateStr`), y parseo a mediodía para aritmética de días; el servidor calcula "hoy" en `America/Mexico_City` (`timezone_fix.sql`). ⚠️ Un usuario fuera de la zona horaria de México puede ver desfases de unas horas entre su `log_date` y el "hoy" del servidor.
8. **IA con contrato JSON estricto**: prompts piden "SOLO JSON válido", se limpian fences y se parsea; sin streaming.
9. **Naming**: DB snake_case ↔ app camelCase, mapeado únicamente en servicios; español para dominio y UI. (Excepción: el Trueque devuelve filas snake_case tal cual desde sus RPCs.)
10. **Matching del Trueque** (`trueque_generate_matches`):
    - **Normalización:** `trueque_norm(t)` = `lower` → quitar acentos (`translate`, ñ→n) → todo lo que no sea `[a-z0-9]` se vuelve espacio → colapsar espacios → `trim`. Se guarda como columna GENERATED `title_norm`, indexada, así que el match es una igualdad exacta sobre el índice. Por ejemplo, `"¡Cien Años de Soledad!"` y `"cien anos de soledad"` empatan.
    - **Algoritmo** (un solo SQL con CTEs, no un loop por usuario):
      - (a) Candidatos = usuarios con ≥1 zona en común (JOIN sobre `user_exchange_zones`).
      - (b) `mine` = el primer libro mío activo cuyo `title_norm` está en su "Busco".
      - (c) `theirs` = el primer libro suyo activo cuyo `title_norm` está en mi "Busco" ∪ mi "Por leer" (se prefiere "Busco").
      - (d) Ambos → perfecto; solo uno → parcial.
      - (e) Upsert por pareja: si ya hay un `chatting`, no se toca; un `pending` idéntico se deja igual; un `pending` distinto se cancela y se crea el nuevo.
    - Los usuarios sin zonas nunca son candidatos, y quien busca debe tener zonas (`TRUEQUE_NO_ZONES`).
11. **Cobro en dos pasos con crédito**: cuando una acción de pago se divide en "cobrar" y "entregar" (dos RPCs llamadas desde el cliente), la primera emite un crédito de un solo uso y la segunda lo consume. Así la segunda no se puede llamar gratis.
12. **Manejo de cuentas huérfanas en signup**: crear cuenta son dos pasos no atómicos (Auth y luego `public.users`), así que un fallo en el segundo deja una fila en `auth.users` sin perfil. Reglas: (a) el perfil se crea con INSERT plano e idempotente (PK duplicada = éxito), nunca con upsert; (b) `buildAppUser` auto-crea el perfil faltante en cualquier login/arranque; (c) si el registro choca con "ya registrado", se intenta `recoverOrphanAccount` (solo si la contraseña coincide y no hay perfil); (d) `supabase/cleanup_orphan_auth_users.sql` lista/repara/borra las que queden. Cualquier flujo futuro de dos pasos debe seguir el mismo criterio: reintentable y auto-reparable.

---

## XI. PUNTOS DE EXTENSIÓN

- **Nueva feature de lectura** (ej. metas semanales): tabla nueva con RLS `auth.uid() = user_id` (copiar patrón de auth_rls_migration) → servicio nuevo en `src/services/` → vista/modal montada desde `MainApp` o `HomeView`. Si otorga XP/gemas: NO desde el cliente — añadir trigger o RPC que llame `folio_award` con `ref` idempotente.
- **Nueva feature social**: seguir patrón posts/comments (tabla + RLS lectura abierta/escritura propia + notificación insertada por el actor + realtime opcional). Renderizar en `FeedView` con un nuevo `type` de post.
- **Monetización**: las gemas ya tienen ledger; un "catálogo de compras" sería tabla `purchases` + RPC SECURITY DEFINER que valide balance y descuente (usar `buyExtraSaves` como referencia de QUÉ NO hacer client-side, ver §XII).
- **Otro algoritmo de recomendación**: solo tiene que escribir filas en `recommendation_scores` (user_id, book_id, predicted_rating, reason) — `api/recommendations.js` y la UI no cambian. Sustituir/añadir script en `scripts/` y workflow.
- **Más mascotas**: añadir entradas a `PET_TYPES` en petService (img, title, quote, label) + assets en `public/pets/`; el diseño evolutivo completo está especificado en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- **Trueque**: cambiar costos o límites = `UPDATE trueque_gems_cost SET value = … WHERE key = …` (sin deploy). Agregar una zona = `ALTER TYPE exchange_zone ADD VALUE 'slug'` + entrada en `src/config/zones.js`. Dar Plus = `UPDATE users SET is_premium = true`.
- **Extraer vistas del monolito**: mover una vista de App.jsx a `src/components/` siguiendo el patrón del commit `3b3adfd` (imports de servicios + props explícitas).

## XII. LIMITACIONES CONOCIDAS Y DEUDA TÉCNICA

### Pendiente

1. **App.jsx monolítico (~14.900 líneas)**: la extracción a services/components está a medias. Riesgo de merge conflicts y de recrear bugs tipo `fetchStreakData` (función definida pero no exportada tras mover código). **Regla: al mover código, verificar exports/imports con grep.**
2. **⚠️ Foto de portada de perfil sigue fallando en producción** (`handleCoverUpload` en App.jsx ~línea 4306: sube al bucket `covers` y hace `UPDATE users SET cover_url`). El commit `d9d0a03` (invalidar caché `folio_profile`) no lo resolvió. **Hipótesis de permisos por columna DESCARTADA** (2026-09-18): `privacy_hardening.sql` otorga SELECT sobre *todas* las columnas salvo `email` (dinámico), la vista `users_public` que crea en la misma migración ya referencia `cover_url` (si no existiera habría fallado), y `handleAvatarUpload` hace exactamente el mismo `UPDATE ... .select("avatar_url, cover_url, ...")` que la portada. Los 3 buckets (`avatars`, `covers`, `post-images`) existen y son públicos. Sospechosos restantes, todos en la config manual de Storage (no versionada): policies INSERT/UPDATE del bucket `covers` (el `upsert:true` exige ambas), límite de tamaño o `allowed_mime_types` del bucket (las portadas son fotos grandes), o caché de CDN del mismo path tras el `upsert`. Falta el mensaje exacto que muestra la UI (`Storage error:` vs `DB error:` vs "posible bloqueo de permisos").
3. **Vercel sin integración Git**: deploys manuales (`vercel --prod`). El push a GitHub NO deploya. Pendiente: vincular GitHub en vercel.com/account/login-connections y `vercel git connect`.
4. **`buyExtraSaves` descuenta gemas client-side** (UPDATE directo a `user_gems`) — inconsistente con el lockdown server-authority; hoy probablemente FALLA silenciosamente por RLS (sin política UPDATE para clientes). Migrar a RPC SECURITY DEFINER. **SIGUE PENDIENTE.**
5. **`daily_save_limits` e `incrementSaveCounter` son client-side** — burlables; mover a RPC si importa. (`timezone_fix.sql` solo documenta que el cliente escribe `date` en fecha local.)
6. **Sin tests** de ningún tipo. Los "tests" son manuales (build + smoke test en navegador).
7. **Rate limit del proxy Anthropic en memoria** — se resetea con cada cold start de la función; suficiente contra abuso casual, no contra abuso real. (Ahora el proxy exige JWT, así que solo usuarios autenticados gastan cuota, pero cualquiera con cuenta puede hacer hasta 10 req/min por IP.)
8. **Bundle de 1.2 MB** (warning de Vite): sin code-splitting; candidatos obvios: html2canvas ya se separa, faltaría lazy-load de vistas pesadas (Wrapped, BookTinder).
9. **Higiene residual del repo**: siguen versionados `test_avatar.png`, `test_avatar2.png`, `topleche_dashboard.html` y `crop_avatars.py` en la raíz, y los directorios `.claude/` y `.agents/` (~585 archivos de skills/config de herramientas) — candidatos a limpieza/`.gitignore`. `vercel.json` con rewrite a `/api/login` inexistente. `pg` en devDependencies sin uso detectado.
10. **Lógica de logros duplicada** (JS en `checkAchievements` + SQL en `award_achievement`): riesgo de divergencia al añadir/cambiar logros. Además, `checkAchievements` corre en momentos clave del cliente, no ante cualquier cambio server-side.
11. **Cuentas privadas no encontrables**: efecto secundario de `privacy_hardening.sql`; si se quiere búsqueda por username de cuentas privadas habría que usar la vista `users_public` (ya creada, sin uso todavía) con una política/función dedicada.
12. **Columnas nuevas en `users`** requieren `GRANT SELECT (col) ON public.users TO authenticated` explícito (el REVOKE/GRANT por columna de `privacy_hardening.sql` se calculó una sola vez).
13. **Trueque — TODOs de Sprint 2:**
    - Migrar zonas fijas a Google Places API (geolocalización real en vez de 25 zonas).
    - Implementar "Embajadas FOLIO" (lugares aliados verificados; el disclaimer ya las anuncia).
    - Pago real de Folio Plus: hoy `is_premium` se activa a mano y el CTA es placeholder con precio `$XX`.
    - Push notifications para matches y mensajes nuevos (hoy el usuario tiene que entrar a la tab; el chat hace polling solo mientras está abierto).
14. **Trueque — limitaciones conocidas del MVP:**
    - **Un match vivo por pareja**, con un libro por lado.
    - **Match solo por título** (no por autor ni ISBN).
    - **Búsquedas O(usuarios con zona común):** suficiente para el MVP; con miles de usuarios por zona habría que materializar o paginar.
    - **Fotos huérfanas en Storage:** se quedan en el bucket `trueque` al quitar un libro o borrar la cuenta (no hay limpieza).
    - **Disclaimer por dispositivo:** la aceptación vive en `localStorage`, así que en otro dispositivo se vuelve a pedir.
    - **Sin moderación:** no hay botón de reportar usuario ni bloqueo; el reporte es por email a soporte@folio.mx.
    - **Mensaje de sistema a nombre del dueño:** cuando se cancela un match, el mensaje de sistema del chat usa `sender_id` = dueño del libro (con `is_system = true`).
    - **pg_cron puede faltar:** si la extensión no está habilitada, el SQL solo emite un NOTICE. La app igual oculta y expira los vencidos al listar y al buscar.

### Resuelto (sprint 2026-09-17 — commits `280e7b8`, `d9d0a03`, `8eac60a` — y fixes 2026-09-18)

| Item | Estado | Cómo se resolvió |
|---|---|---|
| Bug `fetchStreakData` undefined tras la extracción a services | ✅ RESUELTO 2026-09-17 | Exportado en `streakService` + try/catch con fallback (`280e7b8`) |
| Overlay rojo de debug en producción | ✅ RESUELTO 2026-09-17 | `showFatalError` en `main.jsx` condicionado a `import.meta.env.DEV`; `enrichBook`/`getRecommendations` validan 429/payload sin `content` |
| Farmeo infinito de XP/gemas vía `reading_logs` | ✅ RESUELTO 2026-09-17 | `session_id` único como ref idempotente + rate limit 12/día y 4/hora (`security_patch_reading_logs.sql`) |
| Logros falsificables (INSERT libre en `achievements`) | ✅ RESUELTO 2026-09-17 | Política de escritura eliminada + RPC `award_achievement` (`security_patch_achievements.sql`) |
| Racha con autoridad del cliente (UPDATE libre en `user_streaks`) | ✅ RESUELTO 2026-09-17 | Política de escritura eliminada + RPCs `update_streak`/`reset_monthly_freeze`/`use_streak_freeze` (`security_patch_streaks.sql`) |
| Privacidad decorativa (`is_public` sin efecto en la DB) | ✅ RESUELTO 2026-09-17 | RLS `*_select_scoped` por dueño/público/amigo (`privacy_hardening.sql`) |
| `users` legible por cualquier autenticado, con emails expuestos | ✅ RESUELTO 2026-09-17 | RLS scoped + REVOKE de `users.email` a nivel de columna + vista `users_public` |
| Zonas horarias mezcladas (UTC servidor vs local cliente) | ✅ RESUELTO 2026-09-17 | "Hoy" server-side = `America/Mexico_City` (`timezone_fix.sql`) |
| Doble recompensa en sync offline | ✅ RESUELTO 2026-09-17 | El mismo `session_id` viaja en la cola offline; el reintento choca con el UNIQUE |
| Archivos basura en la raíz (`temp_*.txt`, `pg*_raw.txt`, `folio.jsx`, `gema.png.png`, `avatars-grid.png`, `.env.vercel.tmp`) | ✅ RESUELTO 2026-09-17 | Eliminados/desatados (secreto de `.env.vercel.tmp` ya expirado; ver residuo en Pendiente #9) |
| `RootErrorBoundary` mostraba pantalla roja con stack trace en producción | ✅ RESUELTO 2026-09-18 | Fallback condicionado a `import.meta.env.DEV`; en prod muestra UI amigable "Algo salió mal" + Recargar |
| `.env.example` desactualizado (`VITE_ANTHROPIC_API_KEY`, sin `ADMIN_KEY`/`GOOGLE_BOOKS_API_KEY`) | ✅ RESUELTO 2026-09-18 | Reescrito con todas las variables reales y un comentario por cada una |
| Intercambio de libros entre usuarios | ✅ IMPLEMENTADO 2026-09-18 | Trueque MVP: `trueque_schema.sql` + `truequeService` + `src/components/trueque/` (ver §IV.14) |
| Cuentas huérfanas en el registro (`permission denied for table users`; cuenta en `auth.users` sin fila en `users`, y el reintento decía "Ya existe una cuenta") | ✅ RESUELTO 2026-09-18 (código) — ⚠️ falta correr `fix_signup_permissions.sql` en Supabase | `supabase/fix_signup_permissions.sql` (policies + GRANT por columna), INSERT plano en vez de upsert, auto-creación de perfil en `buildAppUser` y `recoverOrphanAccount`; limpieza de las ya existentes con `cleanup_orphan_auth_users.sql`. La causa exacta en la BD viva se infirió por análisis estático (no se reprodujo contra Supabase) |
| Proxy Anthropic sin autenticación | ✅ RESUELTO 2026-09-17 | `api/anthropic.js` y `server.js` exigen JWT de Supabase válido (o `x-admin-key`) |

## XIII. CHECKLIST PARA NUEVO DEVELOPER

**Leer primero (en orden):**
1. Este documento.
2. `supabase/sprint1_server_authority.sql` — el contrato anti-cheat lo explica todo sobre recompensas — y luego los 5 parches (`security_patch_*`, `privacy_hardening`, `timezone_fix`) y `trueque_schema.sql`.
3. `src/services/` completo (~800 líneas en total, se lee en una sentada) + `logReadingSession`/`checkAchievements` en App.jsx (~líneas 660-900), que orquestan las RPCs.
4. `MainApp` en App.jsx (línea ~12982) — el hub de estado.

**Entender antes de tocar código:**
- XP/gemas/nivel JAMÁS se escriben desde el cliente. Si tu feature premia algo → SQL (trigger/RPC + `folio_award`).
- Las migraciones SQL se corren A MANO en el SQL Editor de Supabase (no hay CLI configurada), en el orden numerado de §II. Los parches de seguridad asumen que `sprint1_server_authority.sql` ya corrió (y el de rachas además `security_patch_reading_logs.sql`).
- Deploy = `vercel --prod` manual (hasta conectar Git).
- El monolito App.jsx: busca con grep antes de asumir dónde está algo; los `// ============ SECCIÓN ============` son el índice.

**Setup local:**
```bash
npm install
cp .env.example .env   # llenar VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY (y opcionales, ver §III)
npm run dev            # levanta proxy Anthropic (3001) + Vite (5173) con concurrently
```

**Flujo de pruebas manual (no hay suite):**
1. `npm run build` debe compilar limpio.
2. Smoke test: login → Home sin overlay rojo → registrar sesión → verificar racha/XP → feed → perfil.
3. Consola sin errores rojos (los `[streak]`, `[GEMS]`, `[PET]` logs informativos son normales).
4. Si tocaste recompensas: verificar en Supabase que `reward_ledger` registró la fila UNA sola vez.

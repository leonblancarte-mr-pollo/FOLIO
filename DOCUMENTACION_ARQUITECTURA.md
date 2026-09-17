# FOLIO — DOCUMENTACIÓN DE ARQUITECTURA TÉCNICA COMPLETA

> Última actualización: 2026-09-13 · Generada tras auditoría completa del código.
> Audiencia: developer que NO conoce FOLIO y necesita continuar el proyecto sin preguntar.

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
| Anthropic Claude (`claude-sonnet-4-6`) | Enriquecer libros, recomendaciones por mood | Vía proxy, nunca desde el browser |
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
│   ├── anthropic.js          # Proxy a api.anthropic.com + rate limit (10/min por IP)
│   ├── books.js              # Proxy a Google Books (ES primero, global si <3 resultados)
│   ├── recommendations.js    # GET recomendaciones: lee recommendation_scores con el JWT del usuario
│   └── buscalibre-check.js   # Verificación de link de afiliado Buscalibre
├── server.js                 # Express local: mismo proxy Anthropic para `npm run dev`
├── src/
│   ├── main.jsx              # Entry: ErrorBoundary raíz + listeners globales de error (overlay rojo)
│   ├── App.jsx               # ⚠️ MONOLITO (~14.900 líneas): casi TODAS las vistas y helpers
│   ├── supabase.js           # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── theme.js              # PALETTE_LIGHT/DARK + objeto mutable `palette` + resolveTheme
│   ├── haptics.js / sounds.js# Vibración y efectos de sonido (howler)
│   ├── services/             # Capa de datos (extraída del monolito, commit 3b3adfd)
│   │   ├── authService.js    # login/registro/sesión (Supabase Auth) + caché offline de perfil
│   │   ├── booksService.js   # CRUD books + mapeo dbToBook/bookToDb + caché/cola offline
│   │   ├── streakService.js  # fetchStreakData, checkStreakOnLoad, fechas locales
│   │   ├── gemsService.js    # Solo LECTURA de gemas + RPC claim_daily_gems + event buses
│   │   ├── petService.js     # Mascota: load/create/rename; XP es solo SYNC (server la otorga)
│   │   ├── listsService.js   # CRUD listas personalizadas (user_lists / user_list_books)
│   │   └── recommendationService.js # BookTinder: books_curated por género + límite diario de saves
│   ├── components/           # Componentes extraídos (modales de libro, listas, BookTinder)
│   ├── pets/                 # PetDisplay, PetHub, PetOnboarding, PetScene, PetLevelUpToast
│   └── data/cuentos*         # ~20 cuentos clásicos embebidos (dominio público) para "Snacks"
├── supabase/                 # Migraciones SQL (correr a mano en el SQL Editor)
│   ├── auth_rls_migration.sql        # RLS de TODAS las tablas core
│   ├── sprint1_server_authority.sql  # reward_ledger + folio_award + triggers anti-cheat
│   ├── features_migration.sql        # user_lists + delete_my_account()
│   └── recommendation_scores.sql     # Tabla que llena el job de Python
├── scripts/
│   ├── train_recommender.py  # SVD → top-20 por usuario → upsert a recommendation_scores
│   └── books-500.json/sql    # Seed del catálogo books_curated
├── .github/workflows/train-recommender.yml  # Cron 3:00 UTC diario + manual
├── vite.config.js            # PWA manifest + estrategias de caché Workbox
├── vercel.json               # Cache-Control no-store para index.html/sw.js (¡crítico para PWA!)
└── .env / .env.example       # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

**Convenciones:** servicios en `src/services/*Service.js` con named exports; componentes PascalCase; código y comentarios en español; columnas DB en snake_case mapeadas a camelCase en la capa de servicios (`dbToBook`/`bookToDb`).

---

## III. STACK TÉCNICO DETALLADO

### Frontend
- **Sin router**: la navegación es un estado `tab` en `MainApp` (`home | social | library | add | profile`...) + sub-tabs con `SubTabBar`. Deep-links se resuelven leyendo `window.location.search` (ej. `?action=log` abre el modal de registro, `?ref=usuario` abre perfil referido).
- **Sin state manager**: `useState`/`useEffect` + prop drilling desde `MainApp`, más **event buses** caseros (patrón pub/sub con arrays de listeners): `gemsEventBus`, `gemToastBus`, `petBus`, `achievementBus`. Sirven para que servicios sin acceso a React notifiquen a la UI (toasts de gemas, level-up de mascota, logros desbloqueados).
- **Tema**: `theme.js` exporta un objeto **mutable** `palette`; `MainApp` hace `Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT)` en cada render. Los componentes leen `palette.xxx` en estilos inline. Preferencia en `localStorage('folio_theme')`: light/dark/system.
- **Errores**: `main.jsx` tiene `RootErrorBoundary` + listeners globales `error`/`unhandledrejection` que pintan un **overlay rojo de debug** directo en `document.body` (⚠️ activo en producción, ver §XII).

### Backend (Supabase)
- **Auth**: email+password, "Confirm email" OFF (sesión inmediata al registrarse). Sesión persistida en localStorage por supabase-js.
- **Autoridad server-side (anti-cheat)**: XP, nivel y gemas NO se pueden escribir desde el cliente. `sprint1_server_authority.sql` implementa:
  - `reward_ledger`: libro mayor idempotente (UNIQUE `user+reason+ref` parcial).
  - `folio_award(user, xp, gems, reason, ref)`: única puerta de otorgamiento, `SECURITY DEFINER`, con `REVOKE` a anon/authenticated (solo triggers/RPCs la llaman).
  - Triggers: libro terminado → **+50 XP +50 gemas** (idempotente por book id); sesión de lectura → **+2 XP por cada 10 páginas, +5 gemas**.
  - RPCs para lo iniciado por el cliente: `pet_daily_checkin()` (+3 XP, idempotente por día), `claim_daily_gems()` (+5 + bonus consecutivos, gate 20 h, crea fila con bienvenida), `claim_achievement_gems(keys[])` (+10 por logro).
  - `guard_pet_columns()`: trigger que impide al cliente tocar `xp`/`level` de `user_pets` (solo puede renombrar).

### APIs externas
- **Google Books** (`api/books.js`): busca con `langRestrict=es`, si hay <3 resultados repite global y mezcla. `s-maxage=300` en CDN. El cliente (`searchGoogleBooks` en App.jsx) deduplica por título+autor normalizados y cachea 60 s en memoria.
- **Open Library**: solo portadas (`covers.openlibrary.org`) como fallback, cacheadas por el service worker.
- **Anthropic**: dos usos — `enrichBook(title, author)` (género/resumen/moodTags en JSON) y `getRecommendations(books, moodAnswers)` (flow "Recomiéndame" por mood). Modelo `claude-sonnet-4-6`, respuesta parseada con `JSON.parse` tras limpiar fences.

### IA/ML colaborativo
Pipeline en 3 piezas desacopladas (no hay Python en producción):
1. `scripts/train_recommender.py` — SVD (scikit-surprise) sobre interacciones usuario-libro; empareja `books` contra `books_curated` por (title, author) normalizados (los libros se guardan **por valor**, no por FK). Modos `--mock`, `--dry-run`, `--write-db`.
2. GitHub Actions (cron 3 AM UTC) lo ejecuta con `SUPABASE_SERVICE_ROLE_KEY` y materializa top-20 por usuario en `recommendation_scores`.
3. `api/recommendations.js` — GET con `Authorization: Bearer <jwt>`; usa la key **anon** + JWT del usuario para que RLS filtre solo sus filas. Si el usuario tiene <3 ratings → fallback: mejor valorados de `books_curated` no poseídos, mezclados.

### Deployment
- **Vercel**: proyecto `folio-final` (team `leonblancarte-9639s-projects`). ⚠️ **El repo GitHub NO está conectado a Vercel** (pendiente de vincular Login Connection GitHub↔Vercel): los deploys son manuales con `vercel --prod`. Un `git push` NO deploya.
- `vercel.json`: `Cache-Control: no-store` para `/`, `index.html`, `sw.js`, `workbox-*` — imprescindible para que la PWA se actualice; los assets con hash sí se cachean agresivamente.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (expuestas al cliente, correcto), `ANTHROPIC_API_KEY`, `GOOGLE_BOOKS_API_KEY`, `ADMIN_KEY` (solo server).

---

## IV. CORE FEATURES UNA POR UNA

### 1. Biblioteca (books)
- UI: `LibraryView` (grid de `BookCard`), `BookDetailModal` (editar, calificar, reseñar, borrar), `AddBookView` + `SearchBookModal` (busca en Google Books) + `BookForm` (manual).
- Servicios: `booksService.fetchBooks/insertBook/updateBookInDB/deleteBookFromDB`. Estados: `reading | want_to_read | wish | read` (`STATUS_META`).
- Al agregar, `enrichBook()` (Claude) puede completar género/resumen/moodTags.
- DB: tabla `books` (por usuario, sin FK a catálogo). RLS: SELECT abierto a autenticados (necesario para perfiles de amigos), escritura solo propia.
- Al marcar `read`: trigger `trg_book_finished` otorga +50 XP/+50 gemas (una sola vez por libro), y la UI dispara `BookFinishedCelebration` (confetti, rating rápido, share card).

### 2. Racha (streak)
- UI: `DailyReadingBanner` (Home/Feed), `RachaModal`, `ReadingLogModal` (registrar páginas + mood), `FiveMinutesModal` (timer de lectura).
- Servicio: `streakService.fetchStreakData(userId)` → `{ streak, hasLoggedToday, pagesLoggedToday }` (lee `user_streaks` + `reading_logs` de hoy). `checkStreakOnLoad` decide si la racha está activa o **en PAUSA** (filosofía anti-castigo: nunca se resetea, se congela).
- **Freeze**: 1 protector/mes (`streak_freezes_remaining`, reset mensual en `loadStreakInfo`); si faltó 1 día y el freeze se usó ayer, la racha sobrevive.
- Fechas **siempre locales** (`localDateStr`, `daysBetweenLocalDates` parsea a mediodía local para evitar bugs de DST/UTC).
- DB: `user_streaks` (current_streak, longest_streak, last_log_date, total_pages_read), `reading_logs` (pages_read, mood, log_date). El check-in diario de XP es server-side (`pet_daily_checkin`, idempotente por día).

### 3. Mascota (pet)
- UI: `PetOnboarding` (elegir/nombrar), `PetDisplay` (header), `PetHub` (panel), `PetLevelUpToast`. Un solo tipo actual: gato ("El Sensible"); diseño futuro en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- Servicio: `petService`. Nivel: `xpForLevel = level * 100`, tope 50. **El servidor calcula XP/nivel** (`folio_award` hace el loop de level-up); `addPetXP` del cliente quedó como *sincronizador*: re-lee la fila, detecta level-up comparando con `_lastKnownPetLevel` y emite en `petBus` para que la UI celebre.
- DB: `user_pets` protegida por `guard_pet_columns` (cliente solo renombra).

### 4. Gemas
- Solo se **leen** en el cliente (`loadGems`); toda escritura vía RPCs/triggers. La UI actualmente **no muestra gemas como moneda** (`showGemToast` es no-op; la moneda visible es el XP de la mascota). Se gastan en BookTinder: +5 saves por 5 gemas (`buyExtraSaves` — ⚠️ este único flujo aún descuenta con UPDATE directo del cliente, ver §XII).
- DB: `user_gems` (SELECT propio; sin INSERT/UPDATE de cliente), `reward_ledger` como auditoría.

### 5. Feed social
- UI: `FeedView` (posts + `FeedEditorialContent` + `SnacksCarousel`), `PostDraftModal` (borrador al terminar sesión), `PostComments` (+ replies + likes), `QuotePostCard`, `BookPreviewModal` (agregar libro desde post de otro).
- Tipos de post: sesión de lectura compartida, logro desbloqueado (solo los de `FEED_WORTHY_ACHIEVEMENTS`), cita compartida, libro terminado.
- DB: `posts`, `comments`, `comment_replies`, `post_likes`, `comment_likes`, `notifications` (el actor inserta la notificación; RLS `notif_insert_actor`).
- Realtime: suscripciones de Supabase para mensajes/notifs no leídos.

### 6. Amigos + Chat
- UI: `FriendsView` (buscar por username, solicitudes, lista), `ChatView` (1:1), `FriendProfileModal` + `CompareProfilesView` + `LiteraryCompatibility` (% de compatibilidad lectora).
- DB: `friendships` (user_id, friend_id, status pending/accepted), `conversations` (user1/user2), `messages`. RLS restringe conversaciones/mensajes a las partes.

### 7. Recomendaciones (3 motores distintos)
1. **BookTinder** (`components/BookTinder.jsx` + `recommendationService`): swipe sobre `books_curated` filtrado por `preferred_genres` del onboarding (mapa `GENRE_MAP` id→labels), excluye ya poseídos, límite **15 saves/día** (`daily_save_limits`) ampliable con gemas.
2. **Mood-based con Claude** (`RecommendFlow` en App.jsx): cuestionario de mood → prompt con biblioteca del usuario → `fromLibrary` + `newSuggestions`.
3. **Colaborativo SVD** (`CollaborativeRecommendations` → `api/recommendations.js` → `recommendation_scores`): personalizado si ≥3 ratings, si no fallback a mejor valorados.

### 8. Logros (achievements)
- Motor client-side `checkAchievements(userId)`: 27 defs en `ACHIEVEMENT_DEFS` (lectura, sesiones, rachas, social, especiales). Consulta 6 tablas en paralelo, compara contra `checks{}`, inserta los nuevos y emite `achievementBus` → `AchievementCelebration` (modal + confetti + compartir). Gemas del logro las paga el server (`claim_achievement_gems`).

### 9. Citas (quotes)
- `SaveQuoteModal`, `QuotesView`, `QuoteDetailModal`, `QuoteShareCard` (html2canvas para exportar imagen), compartir al feed. Tabla `quotes` con `is_public`.

### 10. Snacks literarios (cuentos)
- ~20 cuentos de dominio público embebidos en `src/data/cuentos/*.txt` (importados vía `cuentos.js`). `ReaderView` es un lector in-app con progreso. Cero dependencia de red — funciona offline.

### 11. Wrapped mensual
- `WrappedStoryExperience` / `WrappedCard`: resumen tipo Spotify Wrapped del mes (libros, páginas, racha), generado client-side, guardado en `monthly_wraps`, exportable como imagen.

### 12. Onboarding + Tutorial
- `NewUserOnboarding` (4 pasos: géneros → primer libro → avatar → primer amigo) guarda `preferred_genres`/`onboarding_completed` en `users`. `TutorialOverlay` en primer login.

### 13. Biblioteca UAM + Afiliados
- `UAMLibraryView`: catálogo universitario curado; agregar uno desbloquea logro `uam_book`. Links de compra a Buscalibre con `BUSCALIBRE_AFFILIATE_ID`.

---

## V. FLUJOS DE DATOS CRÍTICOS

### Registro
```
AuthView → registerWithSupabase()
  1. supabase.auth.signUp (Confirm email OFF → sesión inmediata, auth.uid() ya existe)
  2. upsert public.users { id: auth.uid(), email, nombre, username }  ← pasa RLS users_insert_self
     · error 23505 → "username en uso" · si falla → signOut() para no dejar estado a medias
  3. App muestra NewUserOnboarding → PetOnboarding → MainApp
```

### Terminar un libro (el flujo más rico)
```
BookDetailModal "Marcar leído" → updateBookInDB(status='read')
  ├─ [DB trigger] trg_book_finished → folio_award(+50 XP, +50 gemas, ref=book.id)  ← idempotente
  ├─ [UI] BookFinishedCelebration (confetti + rating + share)
  ├─ addPetXP() re-lee user_pets → petBus.emit → PetLevelUpToast si subió
  ├─ checkAchievements() → nuevos logros → achievementBus → AchievementCelebration
  │    └─ si es FEED_WORTHY → post automático al feed
  └─ feed: opción de compartir → posts → amigos lo ven → BookPreviewModal → "+ Agregar"
```

### Registrar sesión de lectura
```
ReadingLogModal → INSERT reading_logs + UPDATE user_streaks (racha, páginas)
  ├─ [DB trigger] trg_reading_logged → +2 XP/10 págs, +5 gemas
  ├─ PostDraftModal ofrece compartir la sesión al feed
  └─ offline → addPendingLog() a localStorage → al volver online, syncPendingLogs()
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
  + checkStreakOnLoad + pet_daily_checkin + realtime subs (mensajes/notifs)
```

---

## VI. SERVICIOS (src/services/)

| Servicio | Exports clave | Llama a | Notas |
|---|---|---|---|
| `authService` | `loginWithSupabase`, `registerWithSupabase`, `getSessionUser`, `updateDisplayName`, `logout` | Supabase Auth + `users` | Mapea `nombre`→`name`; caché `folio_auth_user` para offline |
| `booksService` | `fetchBooks`, `insertBook`, `updateBookInDB`, `deleteBookFromDB`, `dbToBook/bookToDb`, caché/colas offline | `books` | Reintenta sin `total_pages/read_date_precision` si la migración no corrió (`isUnknownColumnError`); UPDATE/DELETE verifican filas afectadas para detectar RLS |
| `streakService` | `fetchStreakData`, `checkStreakOnLoad`, `localDateStr`, `daysBetweenLocalDates` | `user_streaks`, `reading_logs`, RPC `pet_daily_checkin` | Racha se PAUSA, nunca se resetea |
| `gemsService` | `loadGems`, `claimDailyGems`, `initUserGems`, `gemsEventBus`, `gemToastBus` | `user_gems`, RPC `claim_daily_gems` | Cliente solo lee |
| `petService` | `loadPet`, `createPet`, `updatePetName`, `addPetXP` (sync), `petBus`, `PET_TYPES` | `user_pets` | `loadPet` distingue null (sin mascota) de undefined (error) para no romper onboarding |
| `listsService` | CRUD `user_lists` + `addBookToList`/`removeBookFromList` | `user_lists`, `user_list_books` | 23505 tratado como éxito idempotente |
| `recommendationService` | `getRecommendations`, `getPreferredGenres`, `checkDailyLimit`, `incrementSaveCounter`, `buyExtraSaves`, `GENRE_MAP` | `books_curated`, `daily_save_limits`, `user_gems` | Límite 15/día; expansión de géneros del onboarding |

Ejemplo de uso típico:
```js
const { streak, hasLoggedToday, pagesLoggedToday } = await fetchStreakData(user.id);
const books = await fetchBooks(user.id);          // devuelve camelCase, cachea offline
await insertBook({ title, author, status: "want_to_read" }, user.id);
```

---

## VII. COMPONENTES PRINCIPALES

Todo vive en `App.jsx` salvo lo extraído a `src/components/` y `src/pets/`. Jerarquía:

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
      ├─ PerfilWrapper → ProfileView (stats, ReadingHeatmap, AchievementGrid, QuotesView,
      │                  ReadingStatsView, Wrapped, configuración, DeleteAccountModal)
      └─ Overlays globales: PetHub, NotificationsSheet, AmigosSheet, ReadingLogModal,
         SaveQuoteModal, AchievementCelebration, BookFinishedCelebration, Gem/Pet toasts,
         PWAUpdateBanner
```

Patrón general: cada vista recibe `user`, `books`, `setTab` y callbacks (`onAdd`, `onSelectBook`) por props desde `MainApp`; los modales son estado local + render condicional (no hay portal manager).

---

## VIII. BASE DE DATOS (Supabase)

### Tablas
`users` (perfil; id = auth.uid; `nombre`, `username`, `preferred_genres[]`, `onboarding_completed`, `avatar`, `is_public`) · `books` · `quotes` · `reading_logs` · `user_streaks` · `user_gems` · `user_pets` · `achievements` · `monthly_wraps` · `notifications` · `friendships` · `conversations` · `messages` · `posts` · `comments` · `comment_replies` · `post_likes` · `comment_likes` · `user_lists` · `user_list_books` · `books_curated` (catálogo ~500, seed en scripts/) · `daily_save_limits` · `recommendation_scores` · `reward_ledger`.

### RLS (auth_rls_migration.sql) — modelo general
- **Lectura social abierta** a `authenticated`: users, books, streaks, pets, achievements, wraps, posts, comments, likes, friendships (necesario para perfiles de amigos y feed). Privadas: quotes (`is_public` o propias), reading_logs, gems, notifications (solo destinatario), messages/conversations (solo las partes), recommendation_scores y reward_ledger (solo propias).
- **Escritura**: siempre `auth.uid() = user_id` (o partes de la conversación). `user_gems` y `reward_ledger` sin política de escritura → solo SECURITY DEFINER.

### Funciones y triggers (sprint1_server_authority.sql)
| Objeto | Qué hace |
|---|---|
| `folio_award(user, xp, gems, reason, ref)` | Única puerta de recompensas; idempotente vía reward_ledger; level-up loop (nivel*100, cap 50); REVOKE a clientes |
| `trg_book_finished` (INSERT/UPDATE books) | status→'read': +50 XP +50 gemas, ref=book id |
| `trg_reading_logged` (INSERT reading_logs) | +2 XP por cada 10 páginas, +5 gemas |
| `pet_daily_checkin()` RPC | +3 XP si racha activa; idempotente por día |
| `claim_daily_gems()` RPC | +5 + bonus consecutivos; gate 20 h; crea fila con bienvenida |
| `claim_achievement_gems(keys[])` RPC | +10 gemas por logro, idempotente por key |
| `guard_pet_columns` trigger | Cliente no puede tocar xp/level de user_pets |
| `delete_my_account()` (features_migration) | Borrado en cascada de la cuenta del usuario autenticado |

### Índices relevantes
`reward_ledger_once` (UNIQUE parcial user+reason+ref WHERE ref IS NOT NULL), `recommendation_scores_user_idx`, PKs/uniques (user_pets.user_id UNIQUE, achievements UNIQUE(user_id, key), daily_save_limits onConflict user_id+date).

---

## IX. INTEGRACIONES EXTERNAS

| Integración | Entrada | Detalles |
|---|---|---|
| Google Books | `GET /api/books?q=` | Server añade `GOOGLE_BOOKS_API_KEY` si existe; ES-first; CDN cache 5 min; cliente deduplica y cachea 60 s |
| Open Library | directo desde el cliente | Solo covers; SW cachea 200 imágenes 30 días |
| Anthropic | `POST /api/anthropic` | Passthrough del body a `/v1/messages`; rate limit 10 req/min/IP (Map en memoria — se resetea por cold start); bypass con header `x-admin-key` |
| Supabase Auth | supabase-js | Token en localStorage; realtime channels para chat/notifs |
| Vercel | `vercel --prod` manual | ⚠️ sin integración Git aún; `vercel.json` controla el caching |
| GitHub Actions | cron diario | Entrena recomendador; secrets: SUPABASE_SERVICE_ROLE_KEY (SOLO aquí, jamás en Vercel/cliente) |
| PWA/Workbox | vite.config.js | autoUpdate + skipWaiting; NetworkFirst para navegación (timeout 3 s → caché offline); `sw-notifications.js` para notifs programadas |

---

## X. PATRONES Y CONVENCIONES

1. **Servicios = funciones async con named exports** que devuelven datos o lanzan; el componente decide la UI de error.
2. **Event buses pub/sub** para cruzar la frontera servicio→UI sin contexto React (`petBus`, `gemsEventBus`, `achievementBus`). Patrón: `bus.on(fn)` devuelve unsubscribe; usar dentro de `useEffect`.
3. **Offline-first pragmático**: lecturas caen a caché localStorage (`folio_books`, `folio_profile`, `folio_auth_user`); escrituras van a colas (`folio_pending_logs/posts`) y se sincronizan al reconectar (`useOnlineStatus` + `syncPending*`).
4. **Degradación por migraciones pendientes**: los servicios toleran columnas/tablas inexistentes (reintento sin columnas nuevas, warnings con el SQL a correr). Permite deployar frontend antes que la migración.
5. **Idempotencia en todas las recompensas** (reward_ledger) y en inserts sociales (23505 = éxito).
6. **Server authority**: cualquier valor "ganable" (XP/gemas/nivel) se decide en Postgres. El cliente solo lee y sincroniza.
7. **Fechas de racha en hora local**, nunca UTC (`localDateStr`), y parseo a mediodía para aritmética de días.
8. **IA con contrato JSON estricto**: prompts piden "SOLO JSON válido", se limpian fences y se parsea; sin streaming.
9. **Naming**: DB snake_case ↔ app camelCase, mapeado únicamente en servicios; español para dominio y UI.

---

## XI. PUNTOS DE EXTENSIÓN

- **Nueva feature de lectura** (ej. metas semanales): tabla nueva con RLS `auth.uid() = user_id` (copiar patrón de auth_rls_migration) → servicio nuevo en `src/services/` → vista/modal montada desde `MainApp` o `HomeView`. Si otorga XP/gemas: NO desde el cliente — añadir trigger o RPC que llame `folio_award` con `ref` idempotente.
- **Nueva feature social**: seguir patrón posts/comments (tabla + RLS lectura abierta/escritura propia + notificación insertada por el actor + realtime opcional). Renderizar en `FeedView` con un nuevo `type` de post.
- **Monetización**: las gemas ya tienen ledger; un "catálogo de compras" sería tabla `purchases` + RPC SECURITY DEFINER que valide balance y descuente (usar `buyExtraSaves` como referencia de QUÉ NO hacer client-side, ver §XII).
- **Otro algoritmo de recomendación**: solo tiene que escribir filas en `recommendation_scores` (user_id, book_id, predicted_rating, reason) — `api/recommendations.js` y la UI no cambian. Sustituir/añadir script en `scripts/` y workflow.
- **Más mascotas**: añadir entradas a `PET_TYPES` en petService (img, title, quote, label) + assets en `public/pets/`; el diseño evolutivo completo está especificado en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- **Extraer vistas del monolito**: mover una vista de App.jsx a `src/components/` siguiendo el patrón del commit `3b3adfd` (imports de servicios + props explícitas).

## XII. LIMITACIONES CONOCIDAS Y DEUDA TÉCNICA

1. **App.jsx monolítico (~14.900 líneas)**: la extracción a services/components está a medias. Riesgo de merge conflicts y de recrear bugs tipo `fetchStreakData` (función definida pero no exportada tras mover código). **Regla: al mover código, verificar exports/imports con grep.**
2. **Overlay rojo de debug en producción** (`main.jsx` líneas 16-29): cualquier `error`/`unhandledrejection` pinta un div rojo persistente fuera de React. Debería condicionarse a `import.meta.env.DEV`.
3. **Vercel sin integración Git**: deploys manuales (`vercel --prod`). El push a GitHub NO deploya. Pendiente: vincular GitHub en vercel.com/account/login-connections y `vercel git connect`.
4. **`buyExtraSaves` descuenta gemas client-side** (UPDATE directo a `user_gems`) — inconsistente con el lockdown server-authority; hoy probablemente FALLA silenciosamente por RLS (sin política UPDATE para clientes). Migrar a RPC.
5. **`daily_save_limits` e `incrementSaveCounter` son client-side** — burlables; mover a RPC si importa.
6. **Sin tests** de ningún tipo. Los "tests" son manuales (build + smoke test en navegador).
7. **Rate limit del proxy Anthropic en memoria** — se resetea con cada cold start de la función; suficiente contra abuso casual, no contra abuso real.
8. **Bundle de 1.2 MB** (warning de Vite): sin code-splitting; candidatos obvios: html2canvas ya se separa, faltaría lazy-load de vistas pesadas (Wrapped, BookTinder).
9. **Datos basura en la raíz del repo**: `temp_*.txt`, `pg*_raw.txt`, `folio.jsx` (versión vieja del monolito), `gema.png.png`, `avatars-grid.png` — candidatos a limpieza/.gitignore.
10. **Realtime y logros dependen de polling/eventos del cliente**: `checkAchievements` corre en momentos clave, no ante cualquier cambio server-side.
11. **`users` legible por cualquier autenticado** (SELECT true): necesario para social, pero expone emails si se seleccionan — revisar columnas expuestas o vista pública.

## XIII. CHECKLIST PARA NUEVO DEVELOPER

**Leer primero (en orden):**
1. Este documento.
2. `supabase/sprint1_server_authority.sql` — el contrato anti-cheat lo explica todo sobre recompensas.
3. `src/services/` completo (~800 líneas en total, se lee en una sentada).
4. `MainApp` en App.jsx (línea ~12968) — el hub de estado.

**Entender antes de tocar código:**
- XP/gemas/nivel JAMÁS se escriben desde el cliente. Si tu feature premia algo → SQL (trigger/RPC + `folio_award`).
- Las migraciones SQL se corren A MANO en el SQL Editor de Supabase (no hay CLI configurada).
- Deploy = `vercel --prod` manual (hasta conectar Git).
- El monolito App.jsx: busca con grep antes de asumir dónde está algo; los `// ============ SECCIÓN ============` son el índice.

**Setup local:**
```bash
npm install
cp .env.example .env   # llenar VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
npm run dev            # levanta proxy Anthropic (3001) + Vite (5173) con concurrently
```

**Flujo de pruebas manual (no hay suite):**
1. `npm run build` debe compilar limpio.
2. Smoke test: login → Home sin overlay rojo → registrar sesión → verificar racha/XP → feed → perfil.
3. Consola sin errores rojos (los `[streak]`, `[GEMS]`, `[PET]` logs informativos son normales).
4. Si tocaste recompensas: verificar en Supabase que `reward_ledger` registró la fila UNA sola vez.

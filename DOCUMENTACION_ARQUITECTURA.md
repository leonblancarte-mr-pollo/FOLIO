# FOLIO — DOCUMENTACIÓN DE ARQUITECTURA TÉCNICA COMPLETA

> Última actualización: 2026-10-03 (Trueque v2: estado obligatorio, pines aproximados, matches por cercanía, reglas +18 y reportes — `supabase/trueque_geo.sql`; antes, 2026-09-23 RPC `spend_gems` y sprint de auditoría 2026-09-22, reporte en `AUDIT_SPRINT_REPORT.md`) · Incluye el fix de signup (`fix_signup_permissions.sql`) y la auto-reparación de perfiles huérfanos en login/sesión (`repair_all_orphan_profiles.sql`). Versión Word extendida: `DOCUMENTACION_ARQUITECTURA_COMPLETA.docx` (`python scripts/generate_docs.py`).
> Audiencia: developer que NO conoce FOLIO y necesita continuar el proyecto sin preguntar.

## CHANGELOG

- 2026-09-13 — Doc inicial de arquitectura (Fable 5)
- 2026-09-17 — Sprint fixes críticos: bugs UI, seguridad economía, privacidad, higiene técnica
- 2026-09-18 — Audit + sincronización con estado actual del código
- 2026-09-18 — Fixes urgentes: portada, ErrorBoundary, env.example
- 2026-09-18 — Sprint Trueque MVP: DB, RPCs, UI completa, matching, chat, rating
- 2026-09-18 — Fix bug signup (permission denied users); doc extendido en Word
- 2026-09-19 — Fix real de cuentas huérfanas: auto-reparación en login + onAuthStateChange + script de reparación masiva
- 2026-09-19 — Debug logs verbosos en ensureUserProfile + llamadas explícitas + fallback defensivo en App.jsx
- 2026-09-19 — Sprint de higiene: debug logs apagados, limpieza de repo, vercel.json, modelo Claude a env var
- 2026-09-22 — Sprint de auditoría y limpieza: ~1,000 líneas de código muerto fuera de App.jsx; helpers de datos movidos a 8 servicios nuevos (quotes, social, reading, achievements, ai, googleBooks, wraps, devLog); sistema de color centralizado en `theme.js` (palette semántica + `BRAND` + datos de arte, 0 hex sueltos en App.jsx); camelCase en lists/quotes/recommendations; 5 bugs 🔴 corregidos (hooks condicionales, fuga de canal realtime en el chat, mensajes "enviados" que fallaban, frases de racha que nunca salían, textos ilegibles en modo oscuro) + ~20 🟡 de manejo de errores; ErrorBoundary interno ya no muestra el stack en producción. Ver `AUDIT_SPRINT_REPORT.md`
- 2026-09-23 — `buyExtraSaves` migró de UPDATE directo a la RPC SECURITY DEFINER `spend_gems` (`supabase/spend_gems.sql`): saldo validado en servidor, precio fijado por `reason` y ledger negativo; cierra la deuda #4
- 2026-09-23 — BookTinder: límite diario 15→3 saves (`DAILY_LIMIT` exportado de `recommendationService`); `spend_gems` con diagnóstico de `PGRST202` (función ausente en la caché de PostgREST) y `NOTIFY pgrst, 'reload schema'` al final del SQL
- 2026-10-03 — Trueque v2: estado obligatorio (32 estados, `src/data/estados.js`), hasta 3 pines aproximados (~1 km) en mapa Leaflet + OpenStreetMap con carga perezosa, matches por cercanía calculada en Postgres (el cliente solo ve rangos), alcance de búsqueda (mi radio / 25 km / mi estado / todo el país), búsqueda sin cobro si devuelve 0 resultados (RPC `search_trueque_matches`, una sola transacción), pantalla «Antes de empezar» con confirmación +18, aviso de seguridad y botón «Reportar» en el chat, vista `trueque_funnel_summary`. Migración `supabase/trueque_geo.sql` (#14)

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
| Anthropic Claude (`claude-sonnet-4-6` por defecto; configurable con `ANTHROPIC_MODEL`) | Enriquecer libros, recomendaciones por mood | Vía proxy que exige JWT de Supabase, nunca desde el browser |
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
│   ├── App.jsx               # ⚠️ MONOLITO de vistas (~13.300 líneas): casi todas las vistas; los helpers de datos ya viven en services/
│   ├── supabase.js           # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── theme.js              # PALETTE_LIGHT/DARK + objeto mutable `palette` + resolveTheme
│   ├── haptics.js / sounds.js# Vibración y efectos de sonido (howler)
│   ├── index.css             # Tailwind base + estilos globales
│   ├── services/             # Capa de datos — 17 módulos (8 originales + 8 extraídos el 2026-09-22 + truequeGeoService 2026-10-03), ver §VI
│   ├── config/zones.js       # ZONES_CDMX: las 25 zonas fijas del Trueque (slugs = enum exchange_zone)
│   ├── components/           # AddToListSheet, BookCoverImage, BookTinder, DeleteAccountModal, ListDetailModal,
│   │                         # ListFormModal, ListsSection, ReadDateModal, ReadingStatusModal
│   │   └── trueque/          # Trueque de libros: TruequeMain + 15 modales/tarjetas (5 de v2) + ui.jsx (ver §VII)
│   ├── pets/                 # PetDisplay, PetHub, PetLevelUpToast, PetOnboarding, PetScene
│   ├── data/                 # cuentos.js + cuentos/*.txt: ~23 cuentos de dominio público para "Snacks"
│   │                         # (los `_raw_*.txt` son material fuente sin procesar)
│   │                         # estados.js: los 32 estados (clave ISO, nombre, centro aproximado) del Trueque v2
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
│   ├── cleanup_orphan_auth_users.sql     # (opcional) lista/repara/borra cuentas huérfanas de auth.users
│   ├── repair_all_orphan_profiles.sql    # 12. Repara en bloque TODAS las cuentas huérfanas (idempotente; usernames duplicados con sufijo)
│   ├── spend_gems.sql                    # 13. RPC spend_gems: única puerta para GASTAR gemas (cierra buyExtraSaves). Correr a mano antes de desplegar el cliente
│   └── trueque_geo.sql                   # 14. Trueque v2: perfil de Trueque, pines, cercanía, reglas +18, reportes, embudo. Requiere 10 y 13. Correr ANTES de desplegar el cliente
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
- **Tema**: `theme.js` exporta un objeto **mutable** `palette`; `MainApp` hace `Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT)` en cada render. Los componentes leen `palette.xxx` en estilos inline (siempre en el render, nunca copiado a una constante de módulo). Preferencia en `localStorage('folio_theme')`: light/dark/system.
- **Sistema de color (2026-09-22)** — `theme.js` es la única fuente de colores y documenta cada token en su encabezado:
  - `palette` (cambia con el tema): superficies `bg/bgSoft/bgCard`, texto `ink/inkSoft/inkFaint`, `accent/accentSoft`, `amber/amberRich/amberInk`, `mauve/slate/sage`, `border/borderSoft` y los **tokens semánticos nuevos**: `onAccent` (texto sobre color), `onDark/onDarkSoft/onDarkFaint/onDarkMuted` (texto sobre overlays casi negros), `danger/dangerSoft/dangerBorder/dangerInk`, `success`, `warnBg/warnBorder/warnInk`, `like`, `badge`, `unreadBg`, `session/sessionInk`, `freeze`.
  - `BRAND` (fijo en ambos temas): `wine`, `wineDeep`, `amber`, `amberLight`, `amberGlow`, `cream`, `ink`, `gold*`, degradados `gradient`/`gradientFab`/`gradientWrappedCta`/`gradientShareCard` y `confetti`. Se usa para identidad, confetti y tarjetas que se exportan como imagen.
  - Datos de arte con nombre: `COVER_PALETTES`, `HEATMAP_COLORS`, `STREAK_PHASES`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS`, `QUOTE_POSTER_GRADIENTS`, `STATUS_COLORS`, `AVATAR_COLORS`, `SOCIAL_COLORS`, `genrePillStyle`, `genreColor`.
  - `ts.caption`/`ts.label` leen `palette.inkFaint` con un getter (antes tenían el hex claro fijo y no seguían al modo oscuro).
  - Quedan hex fuera de `theme.js` solo en `BookCoverImage.jsx` y `pets/PetScene.jsx` (ilustraciones), `main.jsx` (pantallas de error independientes del tema) y en algunos componentes del MVP del Trueque (`ui.jsx`, `MatchCard`, `ExchangeChat`, `ZonesEditor`). Los componentes del Trueque v2 (2026-10-03: `MyPlaces`, `TruequeRulesModal`, `LocationStep`, `ReportModal`) y las líneas tocadas de `TruequeMain` usan solo tokens (`BRAND.gradientFab`, `palette.onAccent`…); el mapa pinta pines y círculos con `palette.accent`/`palette.amber`.
  - **z-index**: todavía no hay escala; el mapa real (de 10 a 99999) y los conflictos conocidos están en `AUDIT_SPRINT_REPORT.md` §C.
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
- **Google Books** (`api/books.js`): busca con `langRestrict=es`, si hay <3 resultados repite global y mezcla. `s-maxage=300` en CDN. El cliente (`searchGoogleBooks` en `googleBooksService`) deduplica por título+autor normalizados y cachea 60 s en memoria.
- **Open Library**: solo portadas (`covers.openlibrary.org`) como fallback, cacheadas por el service worker.
- **Anthropic**: dos usos — `enrichBook(title, author)` (género/resumen/moodTags en JSON) y `getMoodRecommendations(books, moodAnswers)` (flow "Recomiéndame" por mood; ambas en `aiService`). Modelo: lo decide el **servidor** con la env var `ANTHROPIC_MODEL` (fallback `claude-sonnet-4-6`); el cliente ya no envía `model` (2026-09-19), respuesta parseada con `JSON.parse` tras limpiar fences. El cliente manda `Authorization: Bearer <access_token>` (helper `authHeaders` en `aiService`) y ambas funciones validan el payload del proxy: un 429 o una respuesta sin `content` muestran un mensaje amigable en vez de romper la UI.
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
| `ANTHROPIC_MODEL` | solo server (`api/anthropic.js`, `server.js`) | Modelo de Claude que usa el proxy. Opcional; por defecto `claude-sonnet-4-6`. Cambiarlo no requiere tocar código (sí un redeploy). El cliente no puede elegirlo; solo quien manda `x-admin-key` puede pasar `model` en el body |
| `ADMIN_KEY` | solo server | Bypass del proxy Anthropic vía header `x-admin-key` (sin JWT ni rate limit) |
| `SUPABASE_SERVICE_ROLE_KEY` | SOLO GitHub Actions (secret) | Job de entrenamiento; jamás en Vercel ni en el cliente |
| `SUPABASE_SECRET_KEY` | solo `scripts/generate-500-books.js` | Escritura del catálogo curado |
| `PORT` | `server.js` | Puerto del proxy local (default 3001) |

`.env.example` está sincronizado con estas variables (con un comentario por cada una). Ojo: el job de Python también acepta `SUPABASE_URL`/`SUPABASE_ANON_KEY` como alternativa a las `VITE_*`.

### Dependencias (package.json)
- **runtime**: `react`/`react-dom` 18, `@supabase/supabase-js` ^2.105, `lucide-react`, `canvas-confetti`, `howler`, `html2canvas`, `leaflet` 1.9 (mapa del Trueque v2; se usa directo, sin react-leaflet, y va en un chunk aparte que solo se descarga al abrir "Mis lugares"); `express`, `dotenv` y `concurrently` (solo para `npm run dev`, están en `dependencies` pero no van al bundle).
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
- **Freeze**: 1 protector/mes (`streak_freezes_remaining`, reset mensual vía `streakService.resetMonthlyFreeze()` (RPC `reset_monthly_freeze`) desde `loadStreakInfo`); si faltó 1 día y el freeze se usó ayer, la racha sobrevive.
- Fechas **locales en el cliente** (`localDateStr`, `daysBetweenLocalDates` parsea a mediodía local para evitar bugs de DST/UTC); el servidor usa fecha de `America/Mexico_City` para los premios y la racha (ver §VIII).
- **La racha ya no la escribe el cliente**: `logReadingSession` (`readingService`) inserta en `reading_logs` con un `session_id` (`crypto.randomUUID()`) y luego llama a la RPC `update_streak()`, que avanza la racha solo si existe un log real de hoy. El freeze se consume/reasigna con las RPCs `use_streak_freeze()` / `reset_monthly_freeze()`, envueltas en `streakService.applyStreakFreeze()` / `resetMonthlyFreeze()` (las invoca `FeedView`; `loadStreakInfo` sigue en el componente porque maneja estado de React).
- DB: `user_streaks` (current_streak, longest_streak, last_log_date, total_pages_read — solo SELECT para el cliente), `reading_logs` (pages_read, mood, log_date, `session_id` único). El check-in diario de XP es server-side (`pet_daily_checkin`, idempotente por día, fecha México).

### 3. Mascota (pet)
- UI: `PetOnboarding` (elegir/nombrar), `PetDisplay` (header), `PetHub` (panel), `PetLevelUpToast`. Un solo tipo actual: gato ("El Sensible"); diseño futuro en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- Servicio: `petService`. Nivel: `xpForLevel = level * 100`, tope 50. **El servidor calcula XP/nivel** (`folio_award` hace el loop de level-up); `addPetXP` del cliente quedó como *sincronizador*: re-lee la fila, detecta level-up comparando con `_lastKnownPetLevel` y emite en `petBus` para que la UI celebre.
- DB: `user_pets` protegida por `guard_pet_columns` (cliente solo renombra).

### 4. Gemas
- Solo se **leen** en el cliente (`loadGems`); toda escritura vía RPCs/triggers. La UI actualmente **no muestra gemas como moneda** (`showGemToast` es no-op; la moneda visible es el XP de la mascota). Se gastan en BookTinder: +5 saves por 5 gemas (`buyExtraSaves` → RPC `spend_gems`, 2026-09-23; el cliente ya no escribe `user_gems`). Errores que devuelve la RPC y su toast: `GEMS_INSUFFICIENT` → «No tienes gemas suficientes», `GEMS_NO_BALANCE` → «Error al leer saldo», `GEMS_RPC_MISSING` (PostgREST `PGRST202`: la función no existe o su caché no se recargó) → «La tienda de gemas no está disponible», otro → «Error al gastar gemas: …»; en error el modal de límite queda abierto.
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
1. **BookTinder** (`components/BookTinder.jsx` + `recommendationService`): swipe sobre `books_curated` filtrado por `preferred_genres` del onboarding (mapa `GENRE_MAP` id→labels), excluye ya poseídos, límite **3 saves/día** (`DAILY_LIMIT` en `recommendationService`, antes 15; tabla `daily_save_limits`) ampliable con gemas (+5 por 5 gemas). El día es la fecha local del cliente (`localDateStr`), que para usuarios en México coincide con la medianoche de México.
2. **Mood-based con Claude** (`RecommendFlow` en App.jsx): cuestionario de mood → prompt con biblioteca del usuario → `fromLibrary` + `newSuggestions`.
3. **Colaborativo SVD** (`CollaborativeRecommendations` → `api/recommendations.js` → `recommendation_scores`): personalizado si el usuario tiene ≥3 libros en `read`/`reading` (el código cuenta libros en esos estados, no calificaciones), si no fallback a mejor valorados. La llamada vive en `recommendationService.fetchCollaborativeRecommendations()` (devuelve camelCase).

### 8. Logros (achievements)
- Motor client-side `checkAchievements(userId)` (en `achievementsService`, junto con `ACHIEVEMENT_DEFS` y `achievementBus`): 27 defs en `ACHIEVEMENT_DEFS` (lectura, sesiones, rachas, social, especiales). Consulta 6 tablas en paralelo y compara contra `checks{}` para obtener *candidatos*; **el otorgamiento es server-side**: por cada candidato llama a la RPC `award_achievement(key)`, que revalida la condición real en SQL (mismas 27 keys; key desconocida → nunca se otorga) e inserta la fila. Los que devuelve `true` emiten `achievementBus` → `AchievementCelebration` (modal + confetti + compartir). Gemas del logro las paga el server (`claim_achievement_gems`). ⚠️ La lógica de cada logro vive duplicada (JS en `checkAchievements` + SQL en `award_achievement`): si se añade o cambia un logro hay que tocar ambos.

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
Intercambio de libros **físicos** entre usuarios cercanos: misma zona de CDMX (MVP) o, desde el Trueque v2 (2026-10-03, ver abajo), pines aproximados en cualquier estado de México. Tab `trueque` en `NAV_ITEMS` (icono `Repeat`), renderiza `TruequeMain`. El flujo de abajo es el del MVP; el v2 le antepone reglas y estado y cambia la búsqueda.

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

#### Trueque v2 (2026-10-03): estado, pines aproximados y cercanía
Extiende el MVP sin reescribirlo: las zonas de CDMX, los límites del plan gratis, el chat, el cierre y la calificación siguen igual. Todo lo nuevo vive en `supabase/trueque_geo.sql`, `src/services/truequeGeoService.js`, nuevas funciones de `truequeService` y 5 componentes nuevos.

**Flujo al entrar a la tab:**
```
TruequeMain carga en paralelo: trueque_status() · user_exchange_zones · books_offered · books_wanted
                               · get_my_trueque_matches() · get_my_trueque_pins()
  ├─ RPC nueva inexistente (PGRST202) → "Trueque se está actualizando, intenta más tarde" (+ console.error code/message/details/hint)
  ├─ sin reglas aceptadas → TruequeRulesModal "Antes de empezar" (+ casilla "Confirmo que soy mayor de 18 años")
  │                          → RPC accept_trueque_rules   ("Ahora no" → Home)
  ├─ sin estado → LocationStep "Completa tu ubicación aproximada" (los usuarios existentes también la ven 1 vez)
  │     ├─ Ciudad de México → save_trueque_pins(null, 'CMX', …) y siguen las zonas (ZonesOnboarding si no tiene)
  │     └─ otro estado → MyPlaces (mapa) → hay que marcar ≥1 pin; estado y pines se guardan juntos
  ├─ "📍 <Estado> · N lugares · radio X km" → MyPlaces (import() dinámico de Leaflet)
  ├─ "🔍 Buscar matches" + alcance [Mi radio | 25 km | Mi estado | Todo el país]
  │     → RPC search_trueque_matches(scope): valida → bloquea gemas → genera → cobra SOLO si hubo resultados
  │     → 0 resultados: "No se cobraron gemas" + botón "Ampliar a <siguiente alcance>"
  └─ ExchangeChat: aviso fijo de seguridad + botón "Reportar" → ReportModal → RPC report_trueque_user
```

**Reglas:**
- **Estado obligatorio** para publicar, buscar y abrir el mapa (lo exige la UI y, para publicar, también un trigger). **No bloquea matches**: solo centra el mapa, habilita el alcance "Mi estado" y alimenta métricas. CDMX conserva las zonas; fuera de CDMX no hay zonas y se exige ≥1 pin.
- **Pines:** 1 a 3 por usuario (igual para free y Plus). El servidor redondea a 2 decimales (~1 km), valida la caja de México (lat 14–33, lng −119 a −86) y permite **cambiar coordenadas una vez cada 24 h** (la primera vez es libre). Cambiar solo etiquetas, estado o radio no consume ese límite. Etiqueta opcional ≤ 30 caracteres, privada. No se usa la geolocalización del navegador.
- **Radio máximo:** 3, 6 (default), 12 o 25 km.
- **Distancia** = mínima entre cualquiera de los pines de ambos (hasta 3×3), haversine en SQL. El cliente **nunca** recibe coordenadas ajenas ni distancias exactas: solo `proximity` ∈ `lt3` ("menos de 3 km"), `3_6`, `6_12`, `12_25`, `same_zone` ("misma zona", cuando alguno no tiene pines y comparten zona), `same_state`, `other_state`, `far` ("más lejos", sin estado conocido).
- **Alcances** (cada uno incluye al anterior): `radius` = dentro de MI radio o, sin pines, zona compartida · `25km` · `state` = + mismo estado · `country` = todos. Con pines de ambos lados manda la distancia (aunque compartan zona).
- **Orden de resultados:** perfecto antes que parcial → más cerca → mejor calificación → más reciente (`sort_order` lo calcula el servidor).
- **Cobro (cambio pedido en §3.4):** `search_trueque_matches` no cobra si la búsqueda devuelve 0 parejas en el alcance. Todo ocurre en una transacción: para usuarios free se hace `SELECT … FOR UPDATE` de su fila de `user_gems` antes de generar; si hubo resultados descuenta 20 + fila negativa en `reward_ledger` (`reason='trueque_search'`); si el descuento fallara, `RAISE` revierte también los matches generados. "Resultado" = pareja con libros cruzados dentro del alcance (incluye parejas que ya tenían un match vivo). Se sigue exigiendo saldo ≥ 20 antes de buscar. No cambió cómo se ganan ni cuánto cuestan las gemas.
- **Reglas +18:** sin `rules_accepted_at` y `adult_confirmed_at` no se puede publicar ni chatear (trigger `trg_trueque_require_ready` en `books_offered`/`books_wanted`/`exchange_chats`, excepto mensajes de sistema) ni buscar (RPC). El `LegalDisclaimerModal` por match se conserva.
- **Reportes:** motivos `acoso`, `estafa`, `datos_personales`, `inseguro`, `otro` + texto opcional (≤ 500). Máx. 10 por día por usuario. No hay pantalla de moderación: León revisa `public.trueque_reports` en el SQL Editor. No hay bloqueo de usuarios.
- **Compatibilidad:** `cost_search_matches`, `find_book_matches` y `get_my_exchange_matches` siguen existiendo sin cambios (un cliente viejo en caché sigue funcionando con zonas y cobro previo). El cliente nuevo ya no las llama.
- **Supuestos (opción más simple):** el estado no restringe dónde pueden caer los pines; un usuario de CDMX no puede quedarse con 0 pines una vez que guardó alguno (el servidor exige 1–3); las búsquedas con 0 resultados de usuarios free no tienen tope propio (sí cuentan para el tope diario de Plus y para métricas).

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

Login / arranque / sesión guardada (auto-reparación de perfiles huérfanos, 2026-09-19):
  login:            signInWithPassword ─► buildAppUser ─► ensureUserProfile ─► ¿fila en users?
  sesión guardada:  getSessionUser     ─► buildAppUser ─► ensureUserProfile ─┤   sí ─► sigue normal
  evento de sesión: onAuthStateChange(SIGNED_IN | INITIAL_SESSION)          ─┤   no ─► INSERT {id, email, nombre, username,
                    ─► ensureUserProfile (diferido con setTimeout)               is_public:true, onboarding_completed:false}
  · username: user_metadata.username → parte del email; si choca (23505) → sufijo aleatorio, hasta 3 reintentos
  · nombre:   user_metadata.nombre → full_name → name → parte del email
  · logs: console.info "[auth] Auto-creando perfil faltante para user: <email>" y "[auth] Perfil auto-creado exitosamente";
          si el INSERT falla, console.error con el motivo (RLS / GRANT → correr fix_signup_permissions.sql / otro)
  · si no se pudo crear el perfil el login NO se bloquea (modo degradado, usuario con `profileMissing: true`) pero queda el error en consola
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
| `authService` | `loginWithSupabase`, `registerWithSupabase`, `getSessionUser`, `updateDisplayName`, `logout`, `ensureUserProfile`, `watchAuthProfile` | Supabase Auth + `users` | Mapea `nombre`→`name`; caché `folio_auth_user` para offline. **Auto-reparación de perfiles (2026-09-19):** exporta también `ensureUserProfile` y `watchAuthProfile`; `buildAppUser` (login y sesión guardada) y el listener `onAuthStateChange` crean el perfil faltante de una cuenta huérfana (detalle abajo). `registerWithSupabase` usa INSERT plano (`insertProfileRow`, ya NO upsert) y, ante "ya registrado", intenta `recoverOrphanAccount` |
| `booksService` | `STATUS_LABELS`, `fetchBooks`, `insertBook`, `updateBookInDB`, `deleteBookFromDB`, `dbToBook`/`bookToDb`, `isUnknownColumnError`, `stripTotalPages`, `readDateLabel`; caché offline: `cacheBooks`/`getCachedBooks`, `cacheProfile`/`getCachedProfile`, `cacheAchievements`/`getCachedAchievements`; colas: `getPendingLogs`/`addPendingLog`, `getPendingPosts`/`addPendingPost` | `books` | Reintenta sin `total_pages/read_date_precision` si la migración no corrió (`isUnknownColumnError`); UPDATE/DELETE verifican filas afectadas para detectar RLS. Los pending logs guardan `sessionId` |
| `streakService` | `fetchStreakData`, `checkStreakOnLoad`, `resetMonthlyFreeze`, `applyStreakFreeze`, `localDateStr`, `daysBetweenLocalDates` | `user_streaks`, `reading_logs`, RPCs `pet_daily_checkin`/`reset_monthly_freeze`/`use_streak_freeze` | Racha se PAUSA, nunca se resetea. `fetchStreakData` lanza si falla la lectura (antes perdía el error); los wrappers de freeze devuelven la fila actualizada y lanzan. `update_streak` lo llama `readingService` |
| `gemsService` | `loadGems`, `claimDailyGems`, `initUserGems`, `gemsEventBus`, `gemToastBus` | `user_gems`, RPC `claim_daily_gems` | Cliente solo lee |
| `petService` | `loadPet`, `createPet`, `updatePetName`, `addPetXP` (sync), `petBus`, `PET_TYPES`, `PET_MAX_LEVEL`, `petXpForLevel`, `petImageSrc` | `user_pets` | `loadPet` distingue null (sin mascota) de undefined (error) para no romper onboarding |
| `listsService` | `fetchUserLists`, `createUserList`, `updateUserList`, `deleteUserList`, `addBookToList`, `removeBookFromList` | `user_lists`, `user_list_books` | 23505 tratado como éxito idempotente. **camelCase desde 2026-09-22** (`dbToList`: `isPublic`, `createdAt`, `bookIds`); `updateUserList` recibe `{ name, description, isPublic }` |
| `recommendationService` | `getRecommendations`, `getPreferredGenres`, `checkDailyLimit`, `incrementSaveCounter`, `buyExtraSaves` (RPC `spend_gems`, ver §VIII), `fetchCollaborativeRecommendations` | `books_curated`, `daily_save_limits`, RPC `spend_gems`, `/api/recommendations` | Límite 3/día (`DAILY_LIMIT`, exportado; `localDateStr` para la fecha); expansión de géneros del onboarding vía `GENRE_MAP` (interno). **camelCase desde 2026-09-22**: libros del catálogo (`coverUrl`, `genres`, `pages`…) y límite (`savesUsed`, `canSave`, `effectiveLimit`…). `incrementSaveCounter` ahora lanza si falla |
| `quotesService` *(2026-09-22)* | `fetchQuotes`, `fetchQuotesForBook`, `insertQuote`, `updateQuoteInDB`, `deleteQuoteFromDB`, `toggleQuoteFavorite`, `setQuotePublic` | `quotes` (+ join `books`) | camelCase (`dbToQuote`: `bookId`, `pageNumber`, `isFavorite`, `isPublic`, `createdAt`, `bookTitle`…). Lanza. El JSON que se publica en `posts.content` conserva sus claves históricas (`page_number`, `bookTitle`) |
| `socialService` *(2026-09-22)* | `fetchFeed`, `fetchComments`, `createFeedPost`, `createComment`, `createReply`, `deleteFeedPost`, `compressAndUploadPostImage`, `getOrCreateConversation`, `markConversationRead`, `getUnreadMessagesCount`, `syncPendingPosts` | `posts`, `comments`, `comment_replies`, `messages`, `conversations`, bucket `post-images` | **Excepción a camelCase**: filas crudas (las consume la UI del feed/chat en ~100 lugares). Offline: `createFeedPost` encola |
| `readingService` *(2026-09-22)* | `logReadingSession`, `syncPendingLogs` | `reading_logs`, RPC `update_streak` | `session_id` idempotente; offline encola |
| `achievementsService` *(2026-09-22)* | `ACHIEVEMENT_DEFS`, `FEED_WORTHY_ACHIEVEMENTS`, `achievementBus`, `checkAchievements` | 6 tablas + RPC `award_achievement` | Iconos y textos de condición (UI) siguen en App.jsx. Reproduce sonido/haptic al otorgar (comportamiento previo) |
| `aiService` *(2026-09-22)* | `enrichBook`, `getMoodRecommendations` | `/api/anthropic` | Renombrado desde `getRecommendations` para no chocar con `recommendationService` |
| `googleBooksService` *(2026-09-22)* | `searchGoogleBooks` | `/api/books` | Dedup + caché 60 s en memoria |
| `wrapsService` *(2026-09-22)* | `generateMonthWrap`, `generateAnnualWrap`, `MONTHS_ES` | `books`, `reading_logs`, `achievements`, `user_streaks`, `monthly_wraps` | Si falla la lectura de libros del periodo **lanza y no guarda** (antes persistía un Wrapped vacío) |
| `devLog` *(2026-09-22)* | `devLog` | — | `console.log` solo en `import.meta.env.DEV` (compartido por App.jsx y servicios) |
| `truequeService` | `getZones`, `getUserZones`, `setUserZones`, `getTruequeStatus`, `getMyOffers`, `addBookOffered`, `deleteBookOffered`, `getMyWants`, `addBookWanted`, `deleteBookWanted`, `searchMatches`, `getMatches`, `getMatchChat`, `sendMessage`, `completeExchange`, `rateExchange`, `isDisclaimerAccepted`, `acceptDisclaimer`, `TruequeError`, `CHAT_PAGE_SIZE` | `user_exchange_zones`, `books_offered`, `books_wanted`, `exchange_chats`, bucket `trueque`, RPCs del Trueque | Traduce `RAISE EXCEPTION 'TRUEQUE_*'` a `TruequeError { code, message }` en español (la UI usa `code` para abrir el modal de Plus). Borrar = soft delete (`is_active=false`). `searchMatches()` devuelve `{ paid:false }` sin lanzar si no alcanzan las gemas. `getMatchChat(matchId, { before })` pagina de 50 en 50. **Trueque v2 (2026-10-03):** `searchMatchesNearby(scope)` (RPC `search_trueque_matches`; `{ paid, resultCount, charged, matches }`, `{ paid:false }` si faltan gemas), `getMatchesNearby()` (RPC `get_my_trueque_matches`), `acceptTruequeRules(isAdult)`, `reportTruequeUser({ reportedId, reason, details, matchId })`, constantes `SEARCH_SCOPES`, `PROXIMITY_LABELS`, `REPORT_REASONS`, y el helper `callGeoRpc` (convierte el `{ success:false, error }` de las RPCs jsonb en `TruequeError { code }`; `PGRST202`/`PGRST205`/`42P01`/`42883` → `TRUEQUE_UPDATING` con `console.error` de code/message/details/hint). `searchMatches`/`getMatches` (MVP) se conservan pero la UI ya no las usa |
| `truequeGeoService` *(2026-10-03)* | `getGeoProfile`, `saveGeo({ pins, state, maxRadiusKm })`, `roundCoord`, `MAX_PINS`, `PIN_DECIMALS`, `PIN_LABEL_MAX`, `RADII_KM`, `DEFAULT_RADIUS_KM`, `PIN_FUZZ_METERS` | RPCs `get_my_trueque_pins`, `save_trueque_pins` | Perfil de Trueque + pines del propio usuario, en camelCase (`maxRadiusKm`, `nextEditAt`, `rulesAcceptedAt`…). `saveGeo({ pins: null })` solo cambia estado/radio. En `PINS_COOLDOWN` el error trae `retry_at`. Lanza `TruequeError` |

Desde el 2026-09-22 **no quedan helpers de datos sueltos en App.jsx**: se movieron a `quotesService`, `socialService`, `readingService`, `achievementsService`, `aiService`, `googleBooksService` y `wrapsService`. Siguen en App.jsx, a propósito, `loadStreakInfo` (función interna de `FeedView`, ~línea 8680, porque escribe estado de React) y las lecturas directas de Supabase de algunas vistas (perfil de amigo, amigos, notificaciones), permitidas en App.jsx por convención.

**`authService` — flujos de auto-reparación de perfiles (2026-09-19).** Una cuenta huérfana es un usuario de `auth.users` sin fila en `public.users` (los FKs de gemas, mascota, etc. apuntan a `users`, así que sin perfil fallan `claim_daily_gems` y el onboarding de mascota). Piezas:

- `ensureUserProfile(authUser)` (exportada): hace `SELECT` de `users` por id y, si no hay fila, la crea con `insertProfileRow` (INSERT plano de `id, email, nombre, username` + `is_public: true, onboarding_completed: false`; `is_premium` y `created_at` los pone la BD por default, y `is_premium` además lo fuerza a `false` el trigger `guard_users_premium`). Si la BD rechaza las columnas extra (columna inexistente o sin GRANT) reintenta solo con las 4 obligatorias. Llamadas concurrentes para el mismo usuario comparten una sola promesa (`ensureInFlight`).
- **Login** (`loginWithSupabase` → `buildAppUser` → `ensureUserProfile`) y **sesión guardada** (`getSessionUser` → `buildAppUser`): la reparación ocurre siempre antes de devolver el usuario a la app.
- **`watchAuthProfile()`** (exportada; la monta `App` en su `useEffect` inicial y la cancela al desmontar): suscribe `supabase.auth.onAuthStateChange` y en `SIGNED_IN` / `INITIAL_SESSION` ejecuta `ensureUserProfile`, diferido con `setTimeout(0)` (supabase-js desaconseja llamar a Supabase dentro del callback). Se ignora mientras corre `registerWithSupabase` (`registrationInFlight`) para no adelantarse al signup.
- **Username duplicado (23505 por username):** se reintenta con sufijo aleatorio de 4 caracteres, hasta 3 reintentos. 23505 por PK = el perfil ya existía (creado en paralelo) → éxito.
- **Errores, nunca en silencio:** `console.error` distingue RLS (`42501` + "row-level security"), falta de GRANT (`42501` "permission denied" → indica correr `fix_signup_permissions.sql`) y cualquier otro error con `code/message/details/hint`. Si el `SELECT` inicial falla (red/permisos) no se intenta crear nada y se cae al caché `folio_auth_user`.
- **Signup:** sin cambios de comportamiento (INSERT plano + `recoverOrphanAccount`); solo se envuelve con `registrationInFlight`.
- **Reparación de las ya existentes:** `supabase/repair_all_orphan_profiles.sql` (idempotente) crea el perfil de todas las huérfanas de golpe.

**Instrumentación de diagnóstico `[auth-debug]` (2026-09-19, TEMPORAL).** Tras reportarse en producción que `ensureUserProfile` no dejaba ningún log y el perfil seguía sin crearse (errores FK `user_pets_user_id_fkey` / `books_user_id_fkey`), se añadió trazabilidad completa; desde el sprint de higiene (2026-09-19) están **apagados** (`AUTH_DEBUG = false` en `authService.js`; `main.jsx` y `App.jsx` los emiten solo con `import.meta.env.DEV`); para volver a depurar en producción basta poner `AUTH_DEBUG = true` y reintroducir el log de build. Traza completa cuando están activos:

- `ensureUserProfile`: `called {userId,email}` → `Checking profile existence...` → `Profile check result {data,error,status}` → `Profile exists` **o** `Profile missing, will create` → `INSERT payload` → `INSERT result {data,error,status}` → `Profile created successfully` **o** `console.error INSERT failed {code,message,hint,details,status}` → `ensureUserProfile completed`. Una excepción inesperada se registra como `ensureUserProfile THREW` (nunca se traga).
- `watchAuthProfile`: `Auth watcher registered` y, por **cada** evento, `Auth event received {event,hasSession,userId}`; también avisa si ignora un evento (registro en curso / sin usuario).
- **Llamadas explícitas:** `loginWithSupabase` llama a `ensureUserProfile(data.user)` justo tras `signInWithPassword` y pasa el resultado a `buildAppUser(authUser, preEnsured)` (evita un segundo INSERT si el primero falló); `buildAppUser` la llama por sí mismo cuando no recibe resultado (sesión guardada); `registerWithSupabase` la llama tras crear el perfil como verificación (no altera el resultado del alta); el listener la llama en `SIGNED_IN`/`INITIAL_SESSION`.
- **Fallback defensivo en `App.jsx`:** al montarse, antes de `getSessionUser`, lee la sesión y, si existe, llama `ensureUserProfile` (log `Defensive check on App mount`).
- **Versión del build en consola (`main.jsx`):** `[auth-debug] Build version: { build, tag: 'auth-debug-1', loadedAt, swControlled }`. `build` es la hora REAL de compilación (`__APP_BUILD__`, inyectada con `define` en `vite.config.js`); `loadedAt` es solo la hora de carga; `swControlled` indica si un service worker sirve la página. Si no aparece `tag: 'auth-debug-1'`, el navegador está ejecutando un bundle viejo.
- **Verificación del perfil (SELECT):** `406`/`PGRST116` se trata como «no existe» (no es error); `401`/`403`/`42501` → error específico «SELECT DENEGADO» y NO se intenta crear; `5xx` → error de servidor; ninguno lanza excepción para no romper el login (el usuario ve «No se pudo cargar el perfil» si no hay caché).

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
| `TruequeRulesModal` *(v2)* | "Antes de empezar": 5 reglas de seguridad + casilla obligatoria "Confirmo que soy mayor de 18 años" (sin cerrar; "Ahora no" → Home) |
| `LocationStep` *(v2)* | "Completa tu ubicación aproximada": selector de los 32 estados. CDMX guarda directo; otro estado abre `MyPlaces`. No importa Leaflet |
| `MyPlaces` *(v2, carga perezosa)* | Mapa Leaflet + tiles OSM: tocar coloca/mueve el siguiente pin (máx. 3), salta al punto redondeado con círculo de ~1 km, etiqueta privada ≤ 30, borrar, selector de estado y de radio (3/6/12/25), texto fijo de privacidad, atribución OSM. Estados: cargando, error de red del mapa (con Reintentar), sin pines, límite de 24 h activo (con la fecha/hora en que se podrá editar). Pines con `L.divIcon` (sin el bug del ícono por defecto con Vite). Export **default** para `lazy()` |
| `ReportModal` *(v2)* | Reportar al otro participante: motivo de lista corta + texto opcional (≤ 500) |
| `ExchangeChat` *(v2)* | + aviso fijo de seguridad bajo el encabezado y botón "Reportar" |
| `MatchCard` *(v2)* | + chip de rango de cercanía (`proximity`) |
| `ZonesOnboarding` *(v2)* | + enlace opcional "Prefiero marcar lugares en el mapa" |

**Navegación:** `NAV_ITEMS` pasó de 5 a 6 entradas (Trueque entre Social y Perfil). El padding lateral de cada ítem del `BottomNav` bajó de 14 px a 8 px para que las 6 quepan en ~360 px. El botón de Mascota deja de estar exactamente al centro.

---

## VIII. BASE DE DATOS (Supabase)

### Tablas
`users` (perfil; id = auth.uid; `nombre`, `username`, `preferred_genres[]`, `onboarding_completed`, `avatar_url`, `cover_url`, `bio`, `is_public`; `email` sin SELECT para clientes) · `books` · `quotes` · `reading_logs` · `user_streaks` · `user_gems` · `user_pets` · `achievements` · `monthly_wraps` · `notifications` · `friendships` · `conversations` · `messages` · `posts` · `comments` · `comment_replies` · `post_likes` · `comment_likes` · `user_lists` · `user_list_books` · `books_curated` (catálogo ~500, seed en scripts/) · `daily_save_limits` · `recommendation_scores` · `reward_ledger` · **Trueque:** `user_exchange_zones` · `books_offered` · `books_wanted` · `exchange_matches` · `exchange_chats` · `exchange_ratings` · `trueque_gems_cost` (+ interna `trueque_search_credits`) · **Trueque v2:** `trueque_profiles` · `trueque_pins` · `trueque_reports`.

**Vistas:** `users_public` (`security_invoker`, columnas `id, nombre, username, avatar_url, cover_url, bio, is_public`, sin email; creada por `privacy_hardening.sql`, el código actual todavía no la usa) · `trueque_funnel_summary` (embudo del Trueque, solo SQL Editor; ver abajo). **Columnas añadidas por los parches:** `reading_logs.session_id` (uuid NOT NULL DEFAULT gen_random_uuid(), UNIQUE). **Storage:** buckets `avatars`, `covers`, `post-images` (ver §III).

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
| `spend_gems(p_amount, p_reason, p_ref?)` RPC (`spend_gems.sql`) | Única puerta para **gastar** gemas. Devuelve `jsonb` (no lanza): `{success:true, balance, duplicate}` o `{success:false, error}` con `GEMS_INSUFFICIENT` / `GEMS_NO_BALANCE` / `GEMS_INVALID_REASON` / `GEMS_INVALID_AMOUNT` / `NOT_AUTHENTICATED` / SQLERRM. Descuento atómico (`UPDATE … WHERE balance >= precio`) + fila negativa en `reward_ledger`. **El precio lo fija el servidor por `p_reason`** (lista blanca; hoy solo `buy_extra_saves` = 5 y un `p_amount` distinto se rechaza). `p_ref` opcional = idempotencia por `reward_ledger_once`. Ejemplo: `const { data } = await supabase.rpc('spend_gems', { p_amount: 5, p_reason: 'buy_extra_saves' })` |
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

### Trueque v2 (`trueque_geo.sql`, 2026-10-03)

**Constantes** arriba del archivo en `trueque_geo_cfg()` (jsonb): `max_pins` 3, `pin_cooldown_hours` 24, `pin_decimals` 2, caja de México, `radii_km` [3,6,12,25], `default_radius_km` 6, `wide_radius_km` 25, `label_max` 30, `report_daily_max` 10. Se cambian editando el archivo y re-corriéndolo (los CHECK de `slot` y de redondeo tienen el 3 y el 2 literales: cambiarlos a la par). Estados válidos en `trueque_valid_state()` (= `src/data/estados.js`).

| Tabla | Columnas | RLS / privilegios |
|---|---|---|
| `trueque_profiles` | `user_id` PK FK users CASCADE, `state` (clave ISO del estado), `max_radius_km` (default 6), `pins_updated_at`, `adult_confirmed_at`, `rules_accepted_at`, `created_at`, `updated_at` | SELECT solo el dueño. Sin INSERT/UPDATE/DELETE para clientes (REVOKE): escribe solo `accept_trueque_rules`/`save_trueque_pins`. REVOKE ALL a anon |
| `trueque_pins` | `user_id` FK CASCADE, `slot` 1..3, `lat`, `lng` (CHECK: ya redondeadas a 2 decimales), `label` (≤ 30), `updated_at`; PK (user_id, slot) | SELECT solo el dueño; **ninguna** política muestra pines ajenos. Escritura solo por RPC. REVOKE ALL a anon |
| `trueque_reports` | `id`, `reporter_id`, `reported_id` (FK CASCADE), `match_id` (FK SET NULL), `reason` (lista corta), `details` (≤ 500), `created_at`; CHECK reporter ≠ reported | Solo INSERT del propio reportante (`reporter_id = auth.uid()`); sin SELECT/UPDATE/DELETE para clientes. La UI usa la RPC |

**Por qué una tabla nueva y no columnas en `users`:** `users` es legible por otros (perfiles públicos y amigos) y su GRANT por columna se calculó una sola vez (§XII #12); una tabla aparte queda privada y bloqueada a escritura sin tocar Auth.

| RPC (SECURITY DEFINER, `authenticated`) | Qué hace |
|---|---|
| `accept_trueque_rules(p_adult)` → jsonb | Crea/actualiza el perfil con `rules_accepted_at` y `adult_confirmed_at`. `ADULT_REQUIRED` si `p_adult` no es true |
| `save_trueque_pins(p_pins, p_state, p_max_radius_km)` → jsonb | Ver reglas en §IV.14. Errores: `PINS_INVALID`, `PINS_COOLDOWN` (+`retry_at`), `STATE_INVALID`, `RADIUS_INVALID`, `RULES_REQUIRED`, `NOT_AUTHENTICATED` |
| `get_my_trueque_pins()` → jsonb | Perfil + pines propios + `next_edit_at` |
| `search_trueque_matches(p_scope)` → jsonb | Búsqueda por alcance con cobro condicionado a resultados, en una transacción. Errores: `SCOPE_INVALID`, `RULES_REQUIRED`, `STATE_REQUIRED`, `LOCATION_REQUIRED`, `RATE_LIMIT`, `GEMS_INSUFFICIENT` (+`cost`). Registra cada búsqueda en `trueque_search_credits` ya consumida (cupo Plus y métricas) |
| `get_my_trueque_matches()` → TABLE | Columnas de `get_my_exchange_matches` + `proximity` + `sort_order` |
| `report_trueque_user(p_reported_id, p_reason, p_details, p_match_id)` → jsonb | Valida motivo, que ambos participen del match y el tope diario. Errores: `REPORT_INVALID`, `NOT_PARTICIPANT`, `REPORT_LIMIT` |

Estas RPCs devuelven `jsonb {success, error?}` sin lanzar (estilo de `spend_gems`, como pidió el spec); las del MVP lanzan `TRUEQUE_*`. `truequeService.callGeoRpc` unifica ambas en `TruequeError`.

Internas (REVOKE a clientes): `trueque_geo_cfg`, `trueque_geo_int`, `trueque_valid_state`, `trueque_valid_report_reason`, `trueque_haversine_km`, `trueque_pair_geo` (⚠️ recibe dos user_id arbitrarios y devuelve su distancia: jamás exponerla), `trueque_proximity_band`, `trueque_band_rank`, `trueque_in_scope`, `trueque_generate_matches_geo` (mismo emparejamiento por título y mismo upsert por pareja que `trueque_generate_matches`, pero cruza libros primero y filtra por alcance después), `trueque_matches_geo_for`, `trg_trueque_require_ready`.

**Vista `trueque_funnel_summary`** (`security_invoker`, REVOKE a PUBLIC/anon/authenticated → solo SQL Editor): `usuarios_con_estado`, `usuarios_con_pines`, `busquedas` (filas de `trueque_search_credits`, incluye las del flujo viejo), `chats_iniciados` (matches con ≥1 mensaje no de sistema), `intercambios_completados`. Sin datos personales.

### Datos personales: ubicación aproximada (Trueque v2)
- **Qué se guarda:** el estado (clave de 3 letras) y hasta 3 puntos redondeados a 2 decimales (~1.1 km de precisión) con una etiqueta opcional escrita por el usuario. Nunca la ubicación del dispositivo (no se usa `navigator.geolocation`).
- **Quién lo ve:** solo el dueño (RLS + REVOKE). Ninguna RPC devuelve coordenadas de otra persona; a los demás solo les llega un rango de distancia. El cálculo se hace dentro de Postgres.
- **Mitigación de triangulación:** coordenadas ya redondeadas, rangos anchos y 1 cambio de coordenadas cada 24 h.
- **UI:** texto fijo pidiendo marcar lugares públicos (metro, plaza, café) y no casa, escuela ni trabajo.
- **Terceros:** los tiles se piden a `tile.openstreetmap.org` (el proveedor ve la IP y la zona del mapa que se mira, como cualquier mapa web). No se envían pines a ningún tercero.
- **Borrado:** `trueque_profiles`, `trueque_pins` y `trueque_reports` son `ON DELETE CASCADE` a `users`; `delete_my_account()` los arrastra sin cambios.
- **Mayoría de edad:** solo una autodeclaración (`adult_confirmed_at`), no hay verificación.

### Índices relevantes
`reward_ledger_once` (UNIQUE parcial user+reason+ref WHERE ref IS NOT NULL), `reading_logs_session_id_key` (UNIQUE `session_id`), `recommendation_scores_user_idx`, PKs/uniques (user_pets.user_id UNIQUE, achievements UNIQUE(user_id, key), daily_save_limits onConflict user_id+date).

---

## IX. INTEGRACIONES EXTERNAS

| Integración | Entrada | Detalles |
|---|---|---|
| Google Books | `GET /api/books?q=` | Server añade `GOOGLE_BOOKS_API_KEY` si existe; ES-first; CDN cache 5 min; cliente deduplica y cachea 60 s |
| Open Library | directo desde el cliente | Solo covers; SW cachea 200 imágenes 30 días |
| Anthropic | `POST /api/anthropic` | Passthrough del body a `/v1/messages`, **salvo `model`**: lo fija el servidor (`ANTHROPIC_MODEL` o `claude-sonnet-4-6`). **Exige `Authorization: Bearer <JWT Supabase>`** (validado con `supabase.auth.getUser`; 401 si falta o es inválido) o el header `x-admin-key` (bypass total, sin JWT ni rate limit). Rate limit 10 req/min/IP, solo para usuarios no-admin (Map en memoria — se resetea por cold start). `server.js` (dev) valida el JWT igual pero sin rate limit |
| Supabase Auth | supabase-js | Token en localStorage; realtime channels para chat/notifs. El JWT también autentica `/api/anthropic` y `/api/recommendations` |
| Supabase Storage | supabase-js | Buckets `avatars`, `covers`, `post-images` (URLs públicas; avatar/portada se sobrescriben con `upsert` en `<user_id>.<ext>`) |
| Email transaccional (Resend, etc.) | — | **No integrado.** No hay código ni dependencia; solo los emails propios de Supabase Auth |
| Vercel | `vercel --prod` manual | ⚠️ sin integración Git aún; `vercel.json` controla el caching. Sus `rewrites` conservan `/api/anthropic` y `/api/buscalibre-check` (existen en `api/`); el rewrite muerto a `/api/login` se eliminó el 2026-09-19 |
| GitHub Actions | cron diario | Entrena recomendador; secrets: SUPABASE_SERVICE_ROLE_KEY (SOLO aquí, jamás en Vercel/cliente) |
| PWA/Workbox | vite.config.js | autoUpdate + skipWaiting; NetworkFirst para navegación (timeout 3 s → caché offline); `sw-notifications.js` para notifs programadas. Desde 2026-10-03: `globIgnores` saca del precache el chunk del mapa (`assets/MyPlaces-*`) y los tiles de OSM tienen una regla `NetworkOnly` explícita (nunca se cachean) |
| OpenStreetMap (tiles) | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` desde `MyPlaces.jsx` | Mapa del Trueque v2 con Leaflet. Gratis bajo la política de uso justo de OSM; atribución "© OpenStreetMap contributors" visible. **Si el tráfico crece:** cambiar `TILE_URL` a un proveedor con plan gratis (MapTiler, Stadia, Thunderforest) y su atribución. No hay CSP en `vercel.json`; si se agrega una, permitir `img-src https://tile.openstreetmap.org` |

---

## X. PATRONES Y CONVENCIONES

1. **Servicios = funciones async con named exports** que devuelven datos o lanzan; el componente decide la UI de error. Dos contratos de error permitidos (2026-09-22): **CRUD** (`books`, `lists`, `quotes`, `social`, `reading`, `wraps`, `ai`) **lanza**; **lecturas de gamificación** (`gems`, `pet`, `checkDailyLimit`, `checkStreakOnLoad`) **degradan** (0 / null / undefined) pero siempre dejan `console.error`/`warn` con prefijo. Ningún error de Supabase se ignora: supabase-js **no rechaza**, devuelve `{ error }`, así que hay que revisarlo explícitamente.
2. **Event buses pub/sub** para cruzar la frontera servicio→UI sin contexto React (`petBus`, `gemsEventBus`, `achievementBus`). Patrón: `bus.on(fn)` devuelve unsubscribe; usar dentro de `useEffect`.
3. **Offline-first pragmático**: lecturas caen a caché localStorage (`folio_books`, `folio_profile`, `folio_auth_user`); escrituras van a colas (`folio_pending_logs/posts`) y se sincronizan al reconectar (`useOnlineStatus` + `syncPending*`). Los logs pendientes conservan su `sessionId`, así que el reintento es idempotente en el servidor.
4. **Degradación por migraciones pendientes**: los servicios toleran columnas/tablas inexistentes (reintento sin columnas nuevas, warnings con el SQL a correr). Permite deployar frontend antes que la migración.
5. **Idempotencia en todas las recompensas** (reward_ledger) y en inserts sociales (23505 = éxito). Los **gastos** (`spend_gems`) son idempotentes solo si el cliente manda `p_ref`; sin él, cada llamada es una compra nueva (ref aleatorio) y el cliente evita el doble clic con `buyingGems`.
6. **Server authority**: cualquier valor "ganable" (XP/gemas/nivel, logros, racha) se decide en Postgres vía RPC/trigger SECURITY DEFINER; las tablas `user_gems`, `reward_ledger`, `achievements` y `user_streaks` no tienen política de escritura para el cliente. El cliente solo lee, calcula *candidatos* (p. ej. `checkAchievements`) y sincroniza. Aplica también al **gasto**: `spend_gems` valida saldo y fija el precio en el servidor (el cliente no elige cuánto paga).
7. **Fechas**: el cliente usa hora local, nunca UTC (`localDateStr`), y parseo a mediodía para aritmética de días; el servidor calcula "hoy" en `America/Mexico_City` (`timezone_fix.sql`). ⚠️ Un usuario fuera de la zona horaria de México puede ver desfases de unas horas entre su `log_date` y el "hoy" del servidor.
8. **IA con contrato JSON estricto**: prompts piden "SOLO JSON válido", se limpian fences y se parsea; sin streaming.
9. **Naming**: DB snake_case ↔ app camelCase, mapeado únicamente en servicios; español para dominio y UI. Excepciones documentadas (devuelven filas snake_case tal cual): el Trueque (RPCs), `socialService` (feed/chat), `petService` (`user_pets`), `streakService.fetchStreakData` (fila de `user_streaks`, misma forma que devuelven las RPC de racha) y `wrapsService` (`monthly_wraps`). Mapearlas exige tocar decenas de lecturas en App.jsx a la vez: hacerlo junto con la extracción de esas vistas.
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
12. **Manejo de cuentas huérfanas en signup**: crear cuenta son dos pasos no atómicos (Auth y luego `public.users`), así que un fallo en el segundo deja una fila en `auth.users` sin perfil. Reglas: (a) el perfil se crea con INSERT plano e idempotente (PK duplicada = éxito), nunca con upsert; (b) si el registro choca con "ya registrado", se intenta `recoverOrphanAccount` (solo si la contraseña coincide y no hay perfil); (c) `supabase/cleanup_orphan_auth_users.sql` lista/repara/borra las que queden.
13. **Auto-reparación de perfiles huérfanos** (patrón reutilizable, 2026-09-19): cuando una entidad depende de dos pasos no atómicos, no basta con arreglarla en el flujo de alta; hay que **verificar y reparar en cada punto de entrada**. Receta: (a) una función idempotente `ensureX(...)` que comprueba y crea lo que falte (`ensureUserProfile`); (b) se invoca en **todos** los caminos que dejan sesión: login, sesión guardada y el evento `onAuthStateChange` (`SIGNED_IN`/`INITIAL_SESSION`); (c) deduplicar llamadas concurrentes con una promesa en vuelo; (d) reintentar colisiones de unicidad con sufijo aleatorio (máx. 3) y tratar la PK duplicada como éxito; (e) **nunca fallar en silencio**: `console.error` que distinga RLS, GRANT y otros errores, y degradar (dejar entrar marcado) en vez de bloquear; (f) acompañarla de un script SQL de reparación masiva e idempotente (`repair_all_orphan_profiles.sql`) para el histórico. Dentro de callbacks de `onAuthStateChange` no se llama a Supabase de forma síncrona: diferir con `setTimeout(0)`.
14. **Colores**: nunca hex en componentes; usar `palette.*` (sigue al tema) o `BRAND.*` (identidad fija). Si falta un color, se agrega a `theme.js` con nombre semántico (ver §III).
15. **Hooks y efectos**: todos los `useState`/`useEffect` antes de cualquier `return` condicional; todo efecto que cree timers, canales realtime o listeners devuelve cleanup; si hay `await` antes de suscribirse, usar una bandera `cancelled` (patrón de `ChatView`).
16. **Filtros PostgREST con texto del usuario**: pasar por `sanitizeSearchTerm()` (App.jsx) antes de interpolar en `.or(...)`.
17. **Ubicación de usuarios (Trueque v2)**: se guarda ya degradada (redondeo en el servidor), en una tabla que solo su dueño lee, y se escribe solo por RPC con límite de cambios. Cualquier comparación entre dos usuarios (distancia, cercanía) se calcula dentro de una función SECURITY DEFINER **interna** y sale al cliente como un rango, nunca como número ni coordenada. Las funciones que reciben dos `user_id` arbitrarios jamás se exponen.
18. **Cobro condicionado al resultado**: si una acción de pago solo debe cobrarse cuando entrega algo, va en UNA RPC: bloquear el saldo (`SELECT … FOR UPDATE`), ejecutar, y descontar al final solo si hubo resultado; un fallo en el descuento hace `RAISE` y revierte todo (`search_trueque_matches`). Sustituye al patrón de dos RPCs con crédito (§X.11) cuando el precio depende del resultado.
19. **RPCs nuevas y migraciones pendientes**: si la RPC no existe (`PGRST202`), el servicio registra `code/message/details/hint` y la UI muestra un mensaje de "se está actualizando" en vez de romperse (`callGeoRpc`).

---

## XI. PUNTOS DE EXTENSIÓN

- **Nueva feature de lectura** (ej. metas semanales): tabla nueva con RLS `auth.uid() = user_id` (copiar patrón de auth_rls_migration) → servicio nuevo en `src/services/` → vista/modal montada desde `MainApp` o `HomeView`. Si otorga XP/gemas: NO desde el cliente — añadir trigger o RPC que llame `folio_award` con `ref` idempotente.
- **Nueva feature social**: seguir patrón posts/comments (tabla + RLS lectura abierta/escritura propia + notificación insertada por el actor + realtime opcional). Renderizar en `FeedView` con un nuevo `type` de post.
- **Monetización**: las gemas ya tienen ledger; un "catálogo de compras" sería tabla `purchases` + RPC SECURITY DEFINER que valide balance y descuente (usar `spend_gems` como puerta de gasto: añadir el producto a su lista blanca `reason → precio`).
- **Otro algoritmo de recomendación**: solo tiene que escribir filas en `recommendation_scores` (user_id, book_id, predicted_rating, reason) — `api/recommendations.js` y la UI no cambian. Sustituir/añadir script en `scripts/` y workflow.
- **Más mascotas**: añadir entradas a `PET_TYPES` en petService (img, title, quote, label) + assets en `public/pets/`; el diseño evolutivo completo está especificado en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- **Trueque**: cambiar costos o límites = `UPDATE trueque_gems_cost SET value = … WHERE key = …` (sin deploy). Agregar una zona = `ALTER TYPE exchange_zone ADD VALUE 'slug'` + entrada en `src/config/zones.js`. Dar Plus = `UPDATE users SET is_premium = true`. **v2:** número de pines, horas entre cambios, radios, caja de México y topes de reportes = editar `trueque_geo_cfg()` al inicio de `trueque_geo.sql` y re-correrlo (más las constantes espejo en `truequeGeoService.js`); reiniciar el límite de 24 h de una cuenta = `UPDATE trueque_profiles SET pins_updated_at = NULL WHERE user_id = …`; ver el embudo = `SELECT * FROM trueque_funnel_summary`; revisar reportes = `SELECT * FROM trueque_reports ORDER BY created_at DESC`.
- **Extraer vistas del monolito**: mover una vista de App.jsx a `src/components/` siguiendo el patrón del commit `3b3adfd` (imports de servicios + props explícitas).

## XII. LIMITACIONES CONOCIDAS Y DEUDA TÉCNICA

### Pendiente

1. **App.jsx monolítico (~13.300 líneas)**: la capa de datos ya está en `services/` (2026-09-22); falta extraer las vistas a `components/`. Riesgo de merge conflicts y de recrear bugs tipo `fetchStreakData` (función definida pero no exportada tras mover código). **Regla: al mover código, verificar exports/imports con grep.**
2. **⚠️ Foto de portada de perfil sigue fallando en producción** (`handleCoverUpload` en App.jsx ~línea 3473: sube al bucket `covers` y hace `UPDATE users SET cover_url`). El commit `d9d0a03` (invalidar caché `folio_profile`) no lo resolvió. **Hipótesis de permisos por columna DESCARTADA** (2026-09-18): `privacy_hardening.sql` otorga SELECT sobre *todas* las columnas salvo `email` (dinámico), la vista `users_public` que crea en la misma migración ya referencia `cover_url` (si no existiera habría fallado), y `handleAvatarUpload` hace exactamente el mismo `UPDATE ... .select("avatar_url, cover_url, ...")` que la portada. Los 3 buckets (`avatars`, `covers`, `post-images`) existen y son públicos. Sospechosos restantes, todos en la config manual de Storage (no versionada): policies INSERT/UPDATE del bucket `covers` (el `upsert:true` exige ambas), límite de tamaño o `allowed_mime_types` del bucket (las portadas son fotos grandes), o caché de CDN del mismo path tras el `upsert`. Falta el mensaje exacto que muestra la UI (`Storage error:` vs `DB error:` vs "posible bloqueo de permisos").
3. **Vercel sin integración Git**: deploys manuales (`vercel --prod`). El push a GitHub NO deploya. Pendiente: vincular GitHub en vercel.com/account/login-connections y `vercel git connect`.
4. ~~`buyExtraSaves` descuenta gemas client-side~~ — **RESUELTO 2026-09-23** con la RPC `spend_gems` (ver tabla de resueltos).
5. **`daily_save_limits` e `incrementSaveCounter` son client-side** — burlables; mover a RPC si importa. (`timezone_fix.sql` solo documenta que el cliente escribe `date` en fecha local.)
6. **Sin tests** de ningún tipo. Los "tests" son manuales (build + smoke test en navegador).
7. **Rate limit del proxy Anthropic en memoria** — se resetea con cada cold start de la función; suficiente contra abuso casual, no contra abuso real. (Ahora el proxy exige JWT, así que solo usuarios autenticados gastan cuota, pero cualquiera con cuenta puede hacer hasta 10 req/min por IP.)
8. **Bundle de 1.2 MB** (warning de Vite): sin code-splitting; candidatos obvios: html2canvas ya se separa, faltaría lazy-load de vistas pesadas (Wrapped, BookTinder).
9. **Higiene residual del repo** *(parcialmente resuelto 2026-09-19, ver tabla de resueltos)*: queda `pg` en devDependencies sin uso detectado. Pendiente que **León** decida si limpia el historial de git (`git filter-repo`) para purgar los archivos/`.claude`/`.agents` ya versionados; no se hizo por ser destructivo.
10. **Lógica de logros duplicada** (JS en `checkAchievements` + SQL en `award_achievement`): riesgo de divergencia al añadir/cambiar logros. Además, `checkAchievements` corre en momentos clave del cliente, no ante cualquier cambio server-side.
11. **Cuentas privadas no encontrables**: efecto secundario de `privacy_hardening.sql`; si se quiere búsqueda por username de cuentas privadas habría que usar la vista `users_public` (ya creada, sin uso todavía) con una política/función dedicada.
12. **Columnas nuevas en `users`** requieren `GRANT SELECT (col) ON public.users TO authenticated` explícito (el REVOKE/GRANT por columna de `privacy_hardening.sql` se calculó una sola vez).
13. **Trueque — TODOs de Sprint 2:**
    - ~~Migrar zonas fijas a Google Places API~~ — **sustituido 2026-10-03** por pines aproximados con Leaflet + OSM (Trueque v2); las zonas quedan como respaldo en CDMX.
    - Implementar "Embajadas FOLIO" (lugares aliados verificados; el disclaimer ya las anuncia).
    - Pago real de Folio Plus: hoy `is_premium` se activa a mano y el CTA es placeholder con precio `$XX`.
    - Push notifications para matches y mensajes nuevos (hoy el usuario tiene que entrar a la tab; el chat hace polling solo mientras está abierto).
14. **Trueque — limitaciones conocidas del MVP:**
    - **Un match vivo por pareja**, con un libro por lado.
    - **Match solo por título** (no por autor ni ISBN).
    - **Búsquedas O(usuarios con zona común):** suficiente para el MVP; con miles de usuarios por zona habría que materializar o paginar.
    - **Fotos huérfanas en Storage:** se quedan en el bucket `trueque` al quitar un libro o borrar la cuenta (no hay limpieza).
    - **Disclaimer por dispositivo:** la aceptación vive en `localStorage`, así que en otro dispositivo se vuelve a pedir.
    - **Moderación mínima (v2):** ya hay botón "Reportar" en el chat (`trueque_reports`), pero **no** hay bloqueo de usuarios ni pantalla de moderación: León revisa la tabla a mano. El `LegalDisclaimerModal` todavía menciona soporte@folio.mx.
    - **Mensaje de sistema a nombre del dueño:** cuando se cancela un match, el mensaje de sistema del chat usa `sender_id` = dueño del libro (con `is_system = true`).
    - **pg_cron puede faltar:** si la extensión no está habilitada, el SQL solo emite un NOTICE. La app igual oculta y expira los vencidos al listar y al buscar.

15. **Bug `ensureUserProfile` no se ejecutaba (o no dejaba rastro) en producción — logs añadidos para diagnóstico 2026-09-19. ABIERTO.** *(Los logs `[auth-debug]` se apagaron en el sprint de higiene del mismo día; reactivar con `AUTH_DEBUG = true` si hay que seguir diagnosticando.)* Síntoma reportado: tras `vercel --prod` + hard refresh + login, ningún log `[auth]` y errores FK al crear mascota/agregar libro (perfil ausente en `public.users`; hubo que crearlo a mano con SQL). Revisión estática del código: **descartadas** la hipótesis del 406 (con 0 filas `maybeSingle()` devuelve `data:null` sin error en postgrest-js 2.105; el 406 solo aparece con >1 filas), condiciones de entorno (`import.meta.env.DEV`; el bundle no elimina `console.*`: `vite.config.js` no usa `drop_console`/`pure`), y el «catch silencioso» (todas las ramas de error hacen `console.error`). El bundle de `dist/` sí contiene la lógica nueva. Quedan sin descartar: bundle viejo servido por el service worker (Workbox `precache` + `navigateFallback`/`CacheFirst` de `/assets/`) o filtro de consola; por eso se añadió el log de versión de build. **Cómo cerrarlo:** abrir la app en incógnito con DevTools, buscar `[auth-debug] Build version` (debe traer `tag: 'auth-debug-1'`), y compartir la traza `[auth-debug]` de un registro nuevo y de un login de `leon.blancarte@gmail.com`. Al cerrar el diagnóstico: `AUTH_DEBUG = false` y quitar el bloque del fallback defensivo si resulta redundante.
16. **Deuda detectada en la auditoría 2026-09-22 que queda abierta** (detalle en `AUDIT_SPRINT_REPORT.md`; los puntos marcados en el código llevan `// TODO(audit)`):
    - **Sin escala de z-index**: valores de 10 a 99999; conflictos conocidos: el banner offline (`sticky`, z 50) tapa 32 px del header al hacer scroll, y al terminar un libro `ReadDateModal` (z 7000) se abre encima de la animación de `BookFinishedCelebration` (z 1100), que corre sin verse.
    - **Estilos inline repetidos** (`labelStyle`/`inputStyle` ×4, `secLabel` ×5, badge rojo ×5) y tamaños de letra mezclados (rem/px/clamp): pendiente para el rediseño.
    - **Componentes definidos dentro del render** (`SlideContent`/`ShareButton` del Wrapped, `FriendAvatar`, `StatCard`, `ProgressBar`/`NavRow` del quiz): se remontan en cada render.
    - **Canal `replies:${postId}` sin filtro** (`comment_replies` no tiene `post_id`): requiere cambio de esquema.
    - **`checkAchievements` antes del INSERT del mensaje** en el chat (`first_message` se evalúa con datos viejos).
    - **28 avisos `react-hooks/exhaustive-deps`**: casi todos efectos de montaje intencionales; revisar al extraer vistas.
    - **`DeleteAccountModal`** llama `supabase.rpc("delete_my_account")` directo (única llamada a Supabase en `components/` fuera del Trueque).
    - **Excepciones a camelCase** (ver §X.9): social, pet, streak y wraps.
17. **Trueque v2 — pendientes y lo que quedó fuera (2026-10-03):**
    - **Orden de despliegue:** correr `supabase/trueque_geo.sql` ANTES de `vercel --prod`. Sin la migración, la tab Trueque muestra "Trueque se está actualizando" (el resto de la app no se afecta). Tras la migración, un cliente viejo en caché no puede publicar ni chatear hasta recargar (los triggers exigen reglas aceptadas).
    - **SQL validado solo sintácticamente** (parser oficial de Postgres, incluidos los cuerpos PL/pgSQL); no se ejecutó contra una base real. Probar con el guion de 4 cuentas antes de anunciarlo.
    - **Ruta vieja de cobro abierta:** `cost_search_matches` + `find_book_matches` siguen concedidas a `authenticated` por compatibilidad y **sí cobran** búsquedas con 0 resultados. Cuando todos los clientes estén actualizados, revocarlas (`REVOKE EXECUTE … FROM authenticated`).
    - **Búsquedas gratis ilimitadas con 0 resultados** para usuarios free (cuestan CPU, no gemas). Si se abusa, agregar tope diario en `search_trueque_matches`.
    - **Constantes duplicadas** en SQL (`trueque_geo_cfg`, CHECKs) y JS (`truequeGeoService`, `estados.js`, `REPORT_REASONS`): cambiarlas a la par.
    - **Rendimiento:** `trueque_pair_geo` se evalúa por pareja con títulos cruzados; suficiente para el volumen actual. Con muchos usuarios, precalcular o indexar por celda.
    - **PostHog:** no existe en el código, así que no se agregaron eventos (`trueque_pins_saved`, `trueque_search`, `trueque_chat_started`, `trueque_exchange_completed`); la medición vive en la vista `trueque_funnel_summary`.
    - **Fuera de alcance (a propósito):** bloqueo de usuarios, pantalla de moderación, condición del libro en el match, puntos de encuentro sugeridos, alertas de "alguien cerca", cadenas de 3 intercambios, geolocalización del navegador.

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
| Cuentas huérfanas en el registro (`permission denied for table users`; cuenta en `auth.users` sin fila en `users`, y el reintento decía "Ya existe una cuenta") | ✅ COMPLETAMENTE RESUELTO 2026-09-19 (código y scripts; ⚠️ pendiente de verificar en producción: correr `fix_signup_permissions.sql` y `repair_all_orphan_profiles.sql` en Supabase y desplegar con `vercel --prod`) | **Fix 2026-09-18:** `supabase/fix_signup_permissions.sql` (policies + GRANT por columna), INSERT plano en vez de upsert, `recoverOrphanAccount` en el registro. **Fix 2026-09-19:** `ensureUserProfile` en login, sesión guardada y `onAuthStateChange` (`watchAuthProfile`), con reintento de username, logs de error explícitos y `supabase/repair_all_orphan_profiles.sql` para reparar en bloque. **Nota:** el fix del 09-18 solo cubría de forma efectiva el signup: su chequeo en `buildAppUser` fallaba sin ruido cuando el INSERT era rechazado, no se ejecutaba en el evento de sesión y no había reparación masiva del histórico; el del 09-19 cubre login e initial session y no falla en silencio. La causa exacta en la BD viva se infirió por análisis estático; la lógica se validó con tests contra un Supabase simulado, no contra la BD real |
| Debug logs de auth y logs ruidosos en producción (`[auth-debug]`, `[fetchFeed]`, `[like-insert-*]`, `[NOTIF DEBUG]`…) | ✅ RESUELTO 2026-09-19 | `AUTH_DEBUG = false`; en `main.jsx`/`App.jsx` los logs de depuración pasan por `devLog` (solo `import.meta.env.DEV`) y `debugNotifications()` (un `SELECT *` que solo volcaba a consola) corre solo en dev. Se conservan `[notif]`, `[offline]` y `[checkAchievements]`. **Aún imprimen en producción** los logs de `[GEMS]`, `[streak]`, `[PET]`, `[BookTinder]` de sus servicios (no se tocaron por el alcance del sprint) |
| Archivos sueltos y config de herramientas versionados (`test_avatar*.png`, `topleche_dashboard.html`, `crop_avatars.py`, `.claude/`, `.agents/`) | ✅ RESUELTO 2026-09-19 | `git rm` de los 4 archivos; `.claude/` y `.agents/` salen del repo con `git rm --cached` (siguen en el disco local) y todo queda en `.gitignore`. `.env.vercel.tmp` ya estaba ignorado. **No** se reescribió el historial (`git filter-repo` queda para León) |
| `vercel.json` con rewrite muerto a `/api/login` | ✅ RESUELTO 2026-09-19 | Rewrite eliminado; los dos restantes apuntan a funciones existentes |
| Modelo de Claude hardcodeado en el cliente (`App.jsx`, 2 llamadas) | ✅ RESUELTO 2026-09-19 | Env var `ANTHROPIC_MODEL` (fallback `claude-sonnet-4-6`) aplicada en `api/anthropic.js` y `server.js`; el cliente ya no envía `model` |
| Proxy Anthropic sin autenticación | ✅ RESUELTO 2026-09-17 | `api/anthropic.js` y `server.js` exigen JWT de Supabase válido (o `x-admin-key`) |

### Resuelto (sprint de auditoría y limpieza 2026-09-22 — `AUDIT_SPRINT_REPORT.md`)

| Item | Estado | Cómo se resolvió |
|---|---|---|
| `spend_gems`: error «public.spend_gems(p_amount => integer, p_reason => te…» en el modal de BookTinder | ✅ RESUELTO 2026-09-23 | No era un mapeo de parámetros (el cliente ya enviaba `p_amount`/`p_reason`): es el `PGRST202` de PostgREST, «Could not find the function … in the schema cache», porque la función no estaba creada o la caché no se recargó. `spend_gems.sql` termina con `NOTIFY pgrst, 'reload schema'`; el servicio registra `code/message/details/hint` y traduce `PGRST202` a un toast amigable |
| `daily_save_limits`: límite diario de BookTinder | ✅ CAMBIADO 2026-09-23 | De 15 a 3 saves/día. `DAILY_LIMIT` se exporta desde `recommendationService` y lo usan el estado inicial de `BookTinder` y el conteo; el modal muestra los guardados reales del día («Has guardado 3 libros hoy…») en vez de un 15 fijo |
| `buyExtraSaves` hacía UPDATE directo a `user_gems` (sin policy → fallaba siempre con «Error al procesar») | ✅ RESUELTO 2026-09-23 (⚠️ requiere correr `supabase/spend_gems.sql` en el SQL Editor **antes** de desplegar el cliente; sin la RPC el botón «Gastar 5 gemas» muestra «Error al gastar gemas») | `buyExtraSaves` migró de UPDATE directo a la RPC SECURITY DEFINER `spend_gems` con validación de saldo, precio fijado por servidor y ledger negativo. `BookTinder` mapea los errores a toasts y no cierra el modal si falla. Sigue client-side `daily_save_limits` (Pendiente #5): el saldo ya es inviolable, el límite diario no |
| Helpers de datos en App.jsx (antes Pendiente #1 / §VI) | ✅ RESUELTO 2026-09-22 | 7 servicios nuevos (`quotes`, `social`, `reading`, `achievements`, `ai`, `googleBooks`, `wraps`) + `devLog`; App.jsx 14,908 → ~13,300 líneas |
| Código muerto | ✅ RESUELTO 2026-09-22 | Eliminados `NotificationsPanel` (además rompía: usaba `FriendAvatar` fuera de alcance), `FeedEditorialContent` + datos editoriales, `WrappedModal`/`WrappedCard`, `OnboardingScreen`, feed de actividad inalcanzable, 23 imports, ~10 variables y ~20 props sin uso |
| Logs ruidosos en producción (`[notif]` cada 15 s, `[offline]` en cada fetch, `[BookTinder]`) | ✅ RESUELTO 2026-09-22 | Pasan por `devLog` (solo DEV). Se conservan `[streak]`, `[GEMS]`, `[PET]`, `[auth]` y todos los `console.error` |
| Colores hardcodeados (565 hex en App.jsx) y paletas duplicadas en `BookTinder`/`ReadingStatusModal` | ✅ RESUELTO 2026-09-22 | Todo pasa por `palette` / `BRAND` / datos de arte de `theme.js`; BookTinder y el selector de estado ya siguen el modo oscuro |
| Textos ilegibles en modo oscuro (burbuja del chat, notificación no leída, toasts, celebración de libro terminado) | ✅ RESUELTO 2026-09-22 | Tokens `bgCard`, `unreadBg`, toast invertido `ink/bg` y `onDark` para overlays |
| `ts.caption`/`ts.label` con color claro fijo | ✅ RESUELTO 2026-09-22 | Getter a `palette.inkFaint` |
| ErrorBoundary interno mostraba mensaje + stack en producción | ✅ RESUELTO 2026-09-22 | Detalle técnico solo en DEV, igual que `RootErrorBoundary` |
| `BookPreviewModal` con `useState` después de un `return` condicional | ✅ RESUELTO 2026-09-22 | Hooks antes del return |
| Chat: mensaje "enviado" aunque el INSERT fallara; canal realtime que quedaba vivo al salir rápido | ✅ RESUELTO 2026-09-22 | Se revisa `error` y se revierte; bandera `cancelled` + cleanup |
| Frases motivacionales de racha que nunca aparecían en el feed | ✅ RESUELTO 2026-09-22 | Se comparaba la fila de `user_streaks` con un número; ahora `streak.current_streak` |
| Errores de Supabase ignorados (solicitudes de amistad, likes, onboarding, logros, wraps, límite diario, racha) | ✅ RESUELTO 2026-09-22 | Se revisa `{ error }`: se revierte el estado optimista o no se marca éxito, y siempre `console.error` |
| Registro de sesión que "parecía" exitoso al fallar; borrar frase/libro con rollback incorrecto | ✅ RESUELTO 2026-09-22 | `ReadingLogModal` muestra el error; `deleteBook` reinserta sin closure viejo; `QuotesView` solo confirma si borró |
| Consejos peligrosos en logs/UI (`DISABLE ROW LEVEL SECURITY` en `user_pets`, policy `FOR ALL USING (true)` en `achievements`) | ✅ RESUELTO 2026-09-22 | Mensajes reescritos: apuntan a las migraciones y advierten no abrir RLS |
| Filtro `.or(...)` con texto crudo del usuario en la búsqueda de amigos | ✅ RESUELTO 2026-09-22 | `sanitizeSearchTerm()` |
| Timers sin cleanup (celebración, debounces, deep-link del feed) y blob del preview de imagen sin liberar | ✅ RESUELTO 2026-09-22 | Cleanup en los efectos y `URL.revokeObjectURL` |
| Placeholder "Mínimo 4 caracteres" con validación de 6 | ✅ RESUELTO 2026-09-22 | Texto corregido |

### Resuelto (Trueque v2, 2026-10-03 — `supabase/trueque_geo.sql`)

| Item | Estado | Cómo se resolvió |
|---|---|---|
| Trueque limitado a 25 zonas de CDMX | ✅ RESUELTO 2026-10-03 (⚠️ requiere correr `trueque_geo.sql`) | Estado obligatorio (32 estados) + hasta 3 pines aproximados; matching por cercanía en Postgres; zonas como respaldo en CDMX |
| La búsqueda de matches cobraba 20 gemas aunque no encontrara nada | ✅ RESUELTO 2026-10-03 | RPC única `search_trueque_matches`: bloquea saldo, genera y cobra solo si hay resultados, en la misma transacción |
| Sin forma de reportar usuarios del Trueque | ✅ RESUELTO 2026-10-03 (parcial: sin bloqueo ni moderación en app) | Botón "Reportar" en el chat + `trueque_reports` + RPC `report_trueque_user` |
| Sin reglas de seguridad ni confirmación de mayoría de edad | ✅ RESUELTO 2026-10-03 | "Antes de empezar" + `accept_trueque_rules`; triggers impiden publicar/chatear sin aceptarlas; aviso fijo en el chat |
| Sin medición del Trueque | ✅ RESUELTO 2026-10-03 | Vista `trueque_funnel_summary` (solo SQL Editor) |

## XIII. CHECKLIST PARA NUEVO DEVELOPER

**Leer primero (en orden):**
1. Este documento.
2. `supabase/sprint1_server_authority.sql` — el contrato anti-cheat lo explica todo sobre recompensas — y luego los 5 parches (`security_patch_*`, `privacy_hardening`, `timezone_fix`) y `trueque_schema.sql`.
3. `src/services/` completo (~2,400 líneas; empezar por `booksService`, `readingService` y `achievementsService`, que orquestan las RPCs).
4. `MainApp` en App.jsx (línea ~11458) — el hub de estado.
5. `src/theme.js` — el sistema de color y sus reglas.

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

# SEMA — Reporte de auditoría (Sprint de limpieza 2026-09-22)

> Alcance: `src/` completo (App.jsx de 14,908 líneas leído entero, `services/`, `components/`, `pets/`, `main.jsx`), `api/`, `server.js`.
> **Zonas intocables** (solo se reportan, no se modifican): Trueque (`trueque_schema.sql`, `src/components/trueque/`, `truequeService.js`), Auth (`authService.js`, `fix_signup_permissions.sql`, `repair_all_orphan_profiles.sql`) y el esquema/migraciones de Supabase.
>
> Método: lectura completa + ESLint 9 (`no-unused-vars`, `react-hooks/*`, `no-empty`, `no-undef`) instalado en un scratchpad **fuera** del repo (no se añadieron dependencias al proyecto) + greps dirigidos. Línea base: `npm run build` ✅ compila (bundle principal 1,255 kB).
>
> Severidad: 🔴 rompe algo (crash, dato perdido, UI ilegible) · 🟡 deuda técnica real / bug latente · 🟢 cosmético.
> Columna **Estado**: se llenó al terminar la Fase 2 (✅ corregido · 📝 marcado con `// TODO(audit)` · ⏭️ no se toca (con motivo)).

---

## Resumen

| Categoría | 🔴 | 🟡 | 🟢 | Total |
|---|---|---|---|---|
| A. Inconsistencias de patrón | 0 | 9 | 3 | 12 |
| B. Código muerto / redundante | 0 | 3 | 9 | 12 |
| C. UI/UX (colores, z-index, estilos) | 5 | 6 | 4 | 15 |
| D. Bugs silenciosos | 5 | 18 | 3 | 26 |

Hallazgos de ESLint sobre el código de la app (antes del sprint): **117** (58 `no-unused-vars`, 30 `react-hooks/exhaustive-deps`, 26 `no-empty`, **3 `rules-of-hooks`**).

---

## A) Inconsistencias de patrón

| ID | Sev | Archivo:línea | Qué pasa | Fix propuesto | Estado |
|---|---|---|---|---|---|
| A1 | 🟡 | `App.jsx:357-439` | CRUD de citas (`fetchQuotes`, `insertQuote`, `updateQuoteInDB`, `deleteQuoteFromDB`, `toggleQuoteFavorite`, `fetchQuotesForBook`) vive en App.jsx | Mover a `services/quotesService.js` | ✅ `quotesService.js` (+ camelCase) |
| A2 | 🟡 | `App.jsx:443-664` | Helpers sociales (`getOrCreateConversation`, `markConversationRead`, `getUnreadMessagesCount`, `fetchFeed`, `fetchComments`, `compressAndUploadPostImage`, `createFeedPost`, `createComment`, `createReply`, `deleteFeedPost`) en App.jsx | Mover a `services/socialService.js` | ✅ `socialService.js` |
| A3 | 🟡 | `App.jsx:668-749` | `logReadingSession`, `syncPendingLogs`, `syncPendingPosts`, `newClientUuid` en App.jsx | Mover a `services/readingService.js` | ✅ `readingService.js` |
| A4 | 🟡 | `App.jsx:100-176, 751-917` | Motor de logros (`ACHIEVEMENT_DEFS`, `achievementBus`, `FEED_WORTHY_ACHIEVEMENTS`, `checkAchievements`) en App.jsx; el bus es un patrón de servicio | Mover a `services/achievementsService.js` (iconos y textos de UI se quedan en App.jsx) | ✅ `achievementsService.js` |
| A5 | 🟡 | `App.jsx:919-1039` | `authHeaders`, `enrichBook`, `getRecommendations` (mood/Claude) en App.jsx; además `getRecommendations` **choca de nombre** con `recommendationService.getRecommendations` | Mover a `services/aiService.js`, renombrar a `getMoodRecommendations` | ✅ `aiService.js` (`getMoodRecommendations`) |
| A6 | 🟡 | `App.jsx:1049-1113` | Búsqueda Google Books (`searchGoogleBooks`, caché, `mapGBItem`, `gbFetch`, `normTitle`) en App.jsx | Mover a `services/googleBooksService.js` | ✅ `googleBooksService.js` |
| A7 | 🟡 | `App.jsx:9884-9913` | Las RPC de racha `reset_monthly_freeze` / `use_streak_freeze` se llaman directo desde `FeedView` (el doc lo reconoce como excepción) | Envolverlas en `streakService` (`resetMonthlyFreeze`, `applyStreakFreeze`); `loadStreakInfo` se queda en el componente porque maneja estado de React | ✅ `resetMonthlyFreeze` / `applyStreakFreeze` |
| A8 | 🟡 | `services/listsService.js:11-25` | Devuelve filas **snake_case** (`is_public`, `created_at`, `user_id`) + `bookIds`: rompe la convención §X.9 | Mapear a camelCase (`isPublic`, `createdAt`…) y actualizar sus 3 consumidores | ✅ `dbToList` + 4 componentes |
| A9 | 🟡 | `services/recommendationService.js:121-142, 55-119` | `checkDailyLimit` devuelve `saves_used`, `can_save`, `effective_limit`…; `getRecommendations` devuelve filas crudas de `books_curated` (`cover_url`) | Mapear a camelCase y ajustar `BookTinder` / `ReadingStatusModal` | ✅ `dbToCuratedBook` + límite camelCase; también `fetchCollaborativeRecommendations` |
| A10 | 🟢 | `services/petService.js`, `services/streakService.js` | `loadPet` y `fetchStreakData` devuelven filas crudas (`pet_type`, `current_streak`…). Pero **la misma forma snake llega por ~60 queries directas y RPCs** en App.jsx (perfil de amigo, comparador, `reset_monthly_freeze` devuelve la fila…) | Mapear solo el servicio crearía dos formas del mismo objeto → peor. Dejar documentado como excepción y migrar junto con la extracción de vistas | ⏭️ documentado como excepción (§X.9) |
| A11 | 🟢 | `services/gemsService.js`, `petService.js`, `streakService.js` vs `booksService`/`listsService` | Dos estilos de error: CRUD **lanza**; lecturas de gamificación **degradan** (devuelven 0/null/undefined). Dentro de cada servicio hay además errores que se pierden sin log (ver D) | Documentar los dos contratos permitidos en §X; que ningún error se pierda sin `console.error` | ✅ documentado (§X.1) + ningún error sin log |
| A12 | 🟢 | `components/BookTinder.jsx:327` | `supabase.from("user_gems")` directo en un componente (ya existe `gemsService.loadGems`) | Usar `loadGems` | ✅ `loadGems` |

**Suscripciones y efectos:** los 4 event buses (`gemsEventBus`, `gemToastBus`, `petBus`, `achievementBus`) se consumen siempre con `const unsub = bus.on(...); return unsub;` → **sin fugas**. Los canales realtime de `MainApp`, `PostComments` y los `setInterval` de `MainApp`/`FiveMinutesModal`/`WrappedStory` sí se limpian. Las excepciones están en D.

---

## B) Código muerto o redundante

| ID | Sev | Archivo:línea | Qué pasa | Fix propuesto | Estado |
|---|---|---|---|---|---|
| B1 | 🟡 | `App.jsx:7522-7642` | `NotificationsPanel` no se usa **y además** referencia `FriendAvatar`, que solo existe dentro de `FriendsView` → reventaría si alguien la montara | Eliminar | ✅ eliminado |
| B2 | 🟡 | `App.jsx:9069-9129, 9275-9391` | `FeedEditorialContent` no se usa; arrastra `GENRE_CATEGORIES`, `EDITORIAL_STORIES` (con links a Amazon), `getEditorialStories`, `CUENTO_TITLE_MAP` | Eliminar todo el bloque | ✅ eliminado |
| B3 | 🟡 | `App.jsx:7015-7072, 6878-6879` | `loadActivity` / `activityFeed` / `loadingActivity`: se disparan con `subtab === "actividad"`, pero esa sub-pestaña **no existe** en `subtabs` → código inalcanzable que además hace 2-3 queries | Eliminar | ✅ eliminado |
| B4 | 🟢 | `App.jsx:12250-12373` | `WrappedModal` no se usa (lo reemplazó `WrappedStoryExperience`); `WrappedCard` solo lo usaba él | Eliminar ambos | ✅ eliminado |
| B5 | 🟢 | `App.jsx:14649-14767` | `OnboardingScreen` no se usa (lo reemplazó `NewUserOnboarding`) | Eliminar | ✅ eliminado |
| B6 | 🟢 | `App.jsx:4-90` | 23 imports sin uso: iconos `BarChart3`, `LogOut`, `RotateCcw`; `CUENTOS_MAP`, `PET_SIZE_PX`, `PetScene`, `ListFormModal`, `ListDetailModal`, `dbToBook`, `bookToDb`, `isUnknownColumnError`, `stripTotalPages`, 6 funciones de `listsService`, `PET_MAX_LEVEL`, `petXpForLevel`, `PET_TYPES`, `createPet`, `daysBetweenLocalDates` | Eliminar | ✅ eliminados (+ `Copy`) |
| B7 | 🟢 | `App.jsx` (varios) | Variables asignadas y nunca leídas: `maxYearCount` (4424), `uStreak`/`fStreak` (5418), `trunc` (5841), `rowStyle`/`sectionLabel` (7159/7169), `hasFriends` (9823), `moodsWithQuotes` (11458), `petLoaded` (13004), `friend` destructurado (10225) | Eliminar | ✅ eliminadas (+ `readingStreak`, `byYear`) |
| B8 | 🟢 | `App.jsx` (varios) | Props que se pasan y el hijo ignora: `AppHeader{user,onLogout,pet}`, `BottomNav{unreadNotifs,onAddPress}`, `ProfileView{setTab,pet,onRenamePet}`, `FriendsView{unreadNotifs,onNotifsRead}`, `FiveMinutesModal{user,pagesLoggedToday}`, `QuotesView{onSaveQuote}`, `PetHub{user,streak}`, parámetro `quoteId` de `createFeedPost`, `userName` de `generateMonthWrap/AnnualWrap`, `ExplorarView{isOnline}` | Quitar del hijo y del padre | ✅ quitadas (+ `AddBookView.isOnline`, `WrappedStory.userName`) |
| B9 | 🟢 | `App.jsx:10374` | `posts.forEach(p => devLog(...)) \|\| null` metido **dentro del JSX** del feed: log de depuración que corre en cada render | Eliminar | ✅ eliminado |
| B10 | 🟢 | `App.jsx:98, 337, 355, 441, 666, 761, 763, 2765, 4180, 11800`; `ListDetailModal.jsx:116` | Comentarios lápida `// (movido a …)` y un encabezado huérfano `FECHA DE LECTURA FLEXIBLE` | Eliminar | ✅ eliminados |
| B11 | 🟢 | `components/BookTinder.jsx:30` | `haptic()` local duplica `src/haptics.js` (y el local ignora `prefers-reduced-motion`) | Usar `haptics.js` | ✅ usa `haptics.js` |
| B12 | 🟢 | `index.css` vs `<style>` de `MainApp` | `@keyframes heartPop` y `feedFadeIn` definidos dos veces con curvas distintas; gana el inline de App.jsx | Reportar para el rediseño (no se toca CSS global en este sprint) | ⏭️ para el rediseño (CSS global) |

**Logs:** `AUTH_DEBUG` ya está en `false` ✔. Logs de depuración fuera del sistema intencional que sí imprimen en producción: `[notif]` cada 15 s (`App.jsx:13167`) + estado del canal realtime (13208/13212), `[offline]` en **cada** `fetchBooks` (`booksService.js:73,79`), 6 logs `[BookTinder]` (`recommendationService.js`). Se conservan (por instrucción) `[streak]`, `[GEMS]`, `[PET]`, `[auth]`, y los `console.error` de `[notif]`/`[checkAchievements]`.

---

## C) Inconsistencias de UI/UX

### Colores
- **810 hex sueltos** fuera de Trueque: `App.jsx` 565, `theme.js` 75 (la paleta en sí), `BookCoverImage` 72 (portadas generativas por género — dato de diseño), `ReadingStatusModal` 24, `PetScene` 20 (ilustración), `BookTinder` 19, resto < 10.
- Los más repetidos en App.jsx: `#fff`/`#FFFFFF` ×80, `#7A2E2E` ×49 (= `accent` claro), `#C8924A` ×45 (= `amber` claro), `#F4EDE0`/`#F5EDE0` ×35 (crema), `#8A7B6E` ×20 (≈ `inkFaint`), `#E74C3C` ×16 (corazón/like), `#1B3A4B` ×15 (= `slate`), `#9A8A7A` ×14 (texto sobre overlay oscuro).

| ID | Sev | Archivo:línea | Qué pasa | Fix propuesto | Estado |
|---|---|---|---|---|---|
| C1 | 🔴 | `App.jsx:5184` (ChatView) | Burbuja del otro: `backgroundColor: "#FFFFFF"` + `color: palette.ink`. En **modo oscuro** `ink` es crema → texto crema sobre blanco, ilegible | `palette.bgCard` | ✅ `palette.bgCard` |
| C2 | 🔴 | `App.jsx:7745` (NotificationsSheet) | Notificación no leída: fondo `#FDF8F3` (solo claro) + texto `palette.ink` → ilegible en oscuro | Token semántico que cambia con el tema | ✅ `palette.unreadBg` |
| C3 | 🔴 | `App.jsx:11749` (Toast), `11562` (toast de Frases) | Fondo fijo `#2A1F1A` + texto `palette.bg`. En oscuro `bg` = `#1a1614` → casi negro sobre casi negro | Fondo `palette.ink`, texto `palette.bg` (invertido, como `PWAUpdateBanner`) | ✅ `palette.ink` / `palette.bg` |
| C4 | 🔴 | `App.jsx:12685-12870` (BookFinishedCelebration), `12522` (BookShareModal), `12296` (WrappedModal) | Pantallas con overlay casi negro (`rgba(8,4,0,.96)`) usan **`palette.bg` como color de texto**. En oscuro los títulos ("¡Libro terminado!", "Tu resumen"…) quedan negro sobre negro | Token fijo `onDark` (crema) para texto sobre overlays oscuros | ✅ `palette.onDark` (14 usos) |
| C5 | 🔴 | `App.jsx:14796-14817` | El `ErrorBoundary` que envuelve `MainApp` muestra **`error.message` + stack trace en producción** (el doc marca como resuelto solo el `RootErrorBoundary` de `main.jsx`) | Condicionar a `import.meta.env.DEV`, fallback amigable en prod | ✅ detalle solo en DEV |
| C6 | 🟡 | `theme.js:43-44` | `ts.caption` y `ts.label` tienen `color: "#8A7B6E"` **estático** → nunca siguen al tema oscuro (se usan en ~40 lugares) | Getter que lea `palette.inkFaint` | ✅ getter |
| C7 | 🟡 | `App.jsx` ×20 | `color: "#8A7B6E"` en labels/section-labels (`BookForm`, `AuthView`, `ProfileView`, `FriendsView`, `CompareProfilesView`…) → no sigue el tema | `palette.inkFaint` | ✅ `palette.inkFaint` |
| C8 | 🟡 | `App.jsx:9046-9053` (FeedSkeleton) | Skeleton con hex claros fijos → bloques beige brillantes en modo oscuro | `palette.bgSoft/border/bgCard` | ✅ `bgSoft/border/borderSoft` |
| C9 | 🟡 | `components/BookTinder.jsx:14-22`, `ReadingStatusModal.jsx:5-8` | Cada uno trae **su propia copia** de la paleta clara (`const P = {...}`) → Descubrir queda en modo claro dentro de la app oscura | Usar `palette` de `theme.js` (+ tokens `success`/`danger`) | ✅ usan `palette` + `STATUS_COLORS` |
| C10 | 🟡 | `App.jsx` (~15 lugares) | Rojo de badge `#e53e3e`, rojo de corazón `#E74C3C`, rojos de error (`#dc2626`, `#c0392b`, `#C62828`, `#991b1b`), verdes de éxito (`#2D6A4F`, `#5C8A4A`, `#4CAF50`, `#5a7a5a`) sin token | Tokens semánticos `danger`, `like`, `success`, `badge` en `theme.js` | ✅ `danger*`, `like`, `badge`, `success` |
| C11 | 🟡 | `App.jsx:3570` | Placeholder "Mínimo 4 caracteres" pero la validación exige 6 | Corregir el texto | ✅ texto corregido |
| C12 | 🟢 | `App.jsx` (≥8 lugares) | Degradado de marca `linear-gradient(135deg, #7A2E2E 0%, #C8924A 100%)` repetido a mano | Token `brandGradient` | ✅ `BRAND.gradient` (+ variantes) |
| C13 | 🟢 | `App.jsx` (≥8 lugares) | `"https://folio-final.vercel.app"` hardcodeado | Constante `APP_URL` | ⏭️ cosmético, para el rediseño |
| C14 | 🟢 | App.jsx | Estilos inline repetidos 3+ veces: `labelStyle`/`inputStyle` (definidos 4 veces idénticos en `BookForm`, `AuthView`, `ProfileView`, `FriendsView`), `secLabel` (×5), badge rojo (×5), fila "handle" de bottom-sheet (×6) | Extraer a `theme.js` cuando se rediseñe; en este sprint se unifican los colores | ⏭️ colores unificados; extracción para el rediseño |
| C15 | 🟢 | Tipografía | `fontSize` en tres sistemas mezclados: `rem` (mayoría), `px` (`"13px"`, `11`, `20`) y `clamp()`; `ts.*` existe pero lo usa ~30 % del código | Reportar para el diseñador (no se cambia sin diseño) | ⏭️ requiere decisiones de diseño |

### z-index — mapa real (sin escala definida)
`10` header · `20` bottom-nav · `35` FAB · `40` menú FAB · `50` BookDetail / banner offline / ListDetail · `55` SaveQuote / QuoteDetail · `57` Racha / LeerAhora · `60` QuickRating / AmigosSheet / BookPreview · `65` QuoteShare · `70` FriendProfile / PostDraft · `80` ShareSession · `85` AchievementDetail · `150` LimitModal (Tinder) · `200` AchievementCelebration / ReadingStatusModal · `210` InviteShare · `300` AddToListSheet / borrar post / toast Tinder · `900` popover / ExchangeChat · `1000` EditProfile / NotificationsSheet / Freeze / ListForm / Sheet del Trueque · `1100` BookFinished · `1200` ReaderView / BookShare · `1300` WrappedStory · `2000` DeleteAccount / Tutorial · `3000` Toast · `4000` GemToast / toast de Frases · `4100` PetLevelUp · `5500` PetHub · `6000` PetOnboarding · `7000` ReadDateModal · `9999` ReadingLog / FiveMinutes / Lightbox / PWA banner · `99999` SearchBookModal.

Conflictos concretos:
- 🟡 Banner offline (`sticky top:0; z 50`) y `AppHeader` (`sticky top:0; z 10`) se pegan en el mismo punto → offline, al hacer scroll el banner tapa los primeros 32 px del header. Fix: `top` del header = alto del banner cuando está offline (requiere pasar `isOnline` al header). **Se reporta** (cambio de layout, para el rediseño).
- 🟡 Al terminar un libro se abren **a la vez** `ReadDateModal` (7000) y `BookFinishedCelebration` (1100): la animación del paso 1 (confetti + auto-avance a los 2.7 s) corre debajo del modal de fecha y el usuario no la ve. Es de flujo → **se reporta**.
- 🟢 `PWAUpdateBanner` (9999) empata con `ReadingLogModal` (9999); `Toast` (3000) queda oculto bajo modales de 9999.
- Propuesta para el rediseño: escala `Z = { base, sticky: 10, nav: 20, fab: 30, sheet: 100, modal: 200, fullscreen: 1000, celebration: 1100, toast: 3000, system: 9000 }` en `theme.js`.

---

## D) Bugs silenciosos

| ID | Sev | Archivo:línea | Qué pasa | Fix propuesto | Estado |
|---|---|---|---|---|---|
| D1 | 🔴 | `App.jsx:8259-8265` (BookPreviewModal) | `if (!book) return null;` **antes** de tres `useState` → viola las reglas de hooks; si `post.book` cambia entre renders React lanza "Rendered more hooks…" y tumba la vista | Declarar los hooks primero | ✅ |
| D2 | 🔴 | `App.jsx:5054-5059` (ChatView.handleSend) | El `insert` de supabase-js **no rechaza**: devuelve `{error}`. El código solo mira `data`, así que si el INSERT falla (RLS, red) el mensaje optimista **se queda en pantalla como enviado** y nunca se guarda | Revisar `error` y lanzar para que el `catch` existente revierta | ✅ |
| D3 | 🔴 | `App.jsx:4988-5030` (ChatView) | El canal realtime se crea **después** de varios `await`. Si el usuario sale del chat antes, el cleanup ve `channelRef = null` y el canal queda suscrito para siempre (fuga + eventos duplicados al reabrir) | Bandera `cancelled`; si ya se desmontó, no suscribir / remover | ✅ |
| D4 | 🔴 | `App.jsx:10100-10104` (FeedView) | `const s = streak \|\| 0; if (s >= 7)` — `streak` es la **fila** de `user_streaks` (objeto) → la comparación siempre es `false` y las frases motivacionales de racha nunca se muestran | `streak?.current_streak \|\| 0` | ✅ |
| D5 | 🔴 | `components/BookTinder.jsx` + `recommendationService.buyExtraSaves` | "Gastar 5 gemas" hace UPDATE directo a `user_gems`, que no tiene policy de escritura → siempre falla ("Error al procesar") | Requiere RPC `SECURITY DEFINER` (SQL) → **fuera de alcance** (ver Pendientes) | ✅ resuelto 2026-09-23 con la RPC `spend_gems` (`supabase/spend_gems.sql`) |
| D6 | 🟡 | `App.jsx:8582-8603` (ReadingLogModal) | `onSuccess()` está en el `finally`: si el INSERT falla, la UI sigue como si se hubiera registrado (cierra, ofrece compartir) y solo queda un `console.error` | Llamar `onSuccess` solo en éxito y mostrar el error en el modal | ✅ error visible en el modal |
| D7 | 🟡 | `App.jsx:13386-13398` (MainApp.deleteBook) | Rollback con `setBooks(books)` — **closure viejo**: si entre tanto se agregó/editó otro libro, el rollback lo borra | Reinsertar el libro eliminado con actualización funcional | ✅ |
| D8 | 🟡 | `App.jsx:11248-11268` (QuoteDetailModal) | `handleSave` con `try/finally` sin `catch` y `handleToggle` sin try → rechazos no manejados y sin feedback | `catch` con `console.error` + mensaje | ✅ |
| D9 | 🟡 | `App.jsx:11406-11411` (QuotesView.handleDelete) | Si el DELETE falla, igual quita la frase de la lista y muestra "Frase eliminada" | Solo quitar en éxito; toast de error | ✅ |
| D10 | 🟡 | `App.jsx:12637-12650` (BookFinishedCelebration) | `handleSaveRating`/`handleSkipRating` sin try: si algo lanza, el botón queda en "guardando" y hay rechazo sin manejar; los 5 `setTimeout` del paso 1 no se limpian al desmontar | `try/finally` + limpiar timers | ✅ |
| D11 | 🟡 | `App.jsx:7092-7114`, `6100-6108`, `14439-14445` | `sendRequest` / `acceptRequest` / `rejectRequest` / `handleAddMainFriend` / `sendRequestToFriendOfFriend` / onboarding: ignoran `{error}` → la UI dice "Enviada ✓" aunque falle | Revisar `error`, no marcar éxito, `console.error` | ✅ (23505 = ya enviada, se trata como éxito) |
| D12 | 🟡 | `App.jsx:10026-10043`, `8105-8122` | Likes de posts/comentarios: `insert/delete(...).then()` sin mirar `error` → el contador optimista diverge del real sin aviso | Revertir el optimista si hay error + log | ✅ |
| D13 | 🟡 | `App.jsx:14556-14564` (NewUserOnboarding) | El UPDATE de `preferred_genres`/`onboarding_completed` ignora `{error}` (el `try/catch` no lo ve) → preferencias perdidas en silencio | Revisar `error` y loggear | ✅ |
| D14 | 🟡 | `App.jsx:13228-13239` | `claim_achievement_gems` ignora `error` | Log | ✅ |
| D15 | 🟡 | `App.jsx:11614-11738` | `generateMonthWrap/AnnualWrap` ignoran todos los `error` (incluido el `upsert`) | Log de `error` del upsert y de las lecturas | ✅ lanza sin guardar si falla la lectura principal |
| D16 | 🟡 | `App.jsx:895-899` (checkAchievements) | El post automático de logro "feed-worthy" ignora `{error}` | Log | ✅ |
| D17 | 🟡 | `services/streakService.js:12-18, 32-33, 56-58` | `fetchStreakData` y `checkStreakOnLoad` descartan los `error` de sus queries; `pet_daily_checkin` con `.catch(() => {})`. El caller (`loadStreakInfo`) espera un throw ("usando valores default") que nunca llega | Lanzar en `fetchStreakData`, loggear en `checkStreakOnLoad` | ✅ |
| D18 | 🟡 | `services/recommendationService.js:123-163` | `checkDailyLimit` e `incrementSaveCounter` ignoran errores (el upsert del contador puede fallar sin rastro) | Log / lanzar (el caller ya hace `.catch(console.error)`) | ✅ |
| D19 | 🟡 | `App.jsx` ×17 | `.catch(() => {})` que se tragan errores reales: `createFeedPost` en `logReadingSession`, `fetchQuotesForBook`, `logReadingSession` en `ReaderView`, progreso en `HomeView`, `toggleQuoteFavorite`, refrescos de `fetchBooks`, carga extra de `BookTinder`… | `console.error` mínimo con prefijo | ✅ 0 `.catch(() => {})` restantes |
| D20 | 🟡 | `App.jsx:714-749` | `syncPendingLogs/Posts`: el `catch` que re-encola no loggea el motivo | `console.error("[offline] …")` | ✅ |
| D21 | 🟡 | `App.jsx:12059` (WrappedStory → `ShareButton`, `SlideContent`) | Componentes definidos **dentro** del render: se remontan en cada render del padre; al pausar para descargar, el spinner de `ShareButton` se pierde | Sacarlos a nivel de módulo → cambio estructural: se marca `TODO(audit)` | 📝 `TODO(audit)` |
| D22 | 🟡 | `App.jsx:7079-7089`, `14427-14436` | Búsqueda de usuarios mete el texto crudo en un filtro PostgREST `.or(...)`: una coma o paréntesis rompe la consulta | Sanear `,()` antes de interpolar | ✅ `sanitizeSearchTerm()` |
| D23 | 🟢 | `App.jsx:5053` | `checkAchievements` se llama **antes** del INSERT del mensaje → `first_message` se evalúa con datos viejos | Es orden de lógica de negocio → `TODO(audit)` | 📝 `TODO(audit)` |
| D24 | 🟢 | `App.jsx:10330` | `URL.createObjectURL` del preview de imagen del post nunca se revoca | Revocar al cambiar/cancelar | ✅ |
| D25 | 🟢 | `App.jsx:8133` (PostComments) | Canal `replies:${postId}` sin filtro: cualquier respuesta en toda la app recarga cada hilo abierto | `comment_replies` no tiene `post_id` → requiere cambio de esquema; `TODO(audit)` | 📝 `TODO(audit)` |
| D26 | 🟡 | `services/petService.js:34,62`, `pets/PetOnboarding.jsx:24` | Ante errores, el log y el mensaje al usuario recomiendan `ALTER TABLE user_pets DISABLE ROW LEVEL SECURITY` — contradice el modelo de server-authority y es un consejo peligroso | Reescribir los mensajes | ✅ (+ el mismo consejo en `checkAchievements`) |

Menores sin acción (🟢): los `catch {}` alrededor de `localStorage` y de `navigator.share` (cancelación del usuario) son intencionales; los de `authService` están en zona intocable. `PWAUpdateBanner` crea un `setInterval` que vive lo que la app (aceptable).

---

## Hallazgos que NO se pueden arreglar sin tocar zonas intocables / esquema

1. **D5 — `buyExtraSaves` siempre falla** (🔴 funcional): necesita una RPC `SECURITY DEFINER` que valide balance y descuente gemas + ledger (patrón de `cost_search_matches`). Es SQL nuevo → requiere migración aprobada.
2. **D25 — canal de respuestas sin filtro**: `comment_replies` no tiene `post_id`; filtrar por post requiere columna o vista nueva.
3. **`ErrorBoundary` de auth / fallback defensivo en `App` (`ensureUserProfile` en el mount)**: el doc pide retirarlo cuando se cierre el diagnóstico; es flujo de Auth → no se toca.
4. **`authService.js`**: 6 `catch {}` vacíos (todos alrededor de `signOut`/`localStorage`, intencionales). No se tocan.

---

## Resultado del sprint (2026-09-22)

- **`npm run build`**: ✅ verde después de cada tarea y al final (bundle 1,255 → 1,259 kB; ver nota sobre code-splitting en el doc §XII.8).
- **ESLint** (fuera del repo): 117 → **34** hallazgos. Los restantes son 28 `exhaustive-deps` (efectos de montaje intencionales) y 6 `no-empty` en `authService.js` (zona intocable). **0** `rules-of-hooks`, **0** variables sin uso, **0** referencias indefinidas.
- **Hex sueltos**: App.jsx 565 → **0**; fuera de `theme.js` solo quedan ilustraciones (`BookCoverImage`, `PetScene`), `main.jsx` y el Trueque.
- **App.jsx**: 14,908 → 13,283 líneas.
- **Smoke test**: `vite preview` del build de producción, pantalla de login carga sin errores de consola. No se probaron flujos con sesión (requieren credenciales).
- **Incidente de entorno**: OneDrive.exe tenía una fuga de ~38.8 GB que tumbaba node/esbuild; se reinició con autorización del usuario.

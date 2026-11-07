# SEMA — DOCUMENTACIÓN DE ARQUITECTURA TÉCNICA COMPLETA

> Última actualización: 2026-11-06 (Collages MVP en la rama `collages-mvp`: editor de collages con stickers, papeles y frases; catálogo en datos, inventario permanente, premios por racha con red de seguridad, compra con gemas, guardado, exportación y publicación en el feed; ver §IV.15). Anterior: 2026-11-02 (ronda 3 de ajustes en la rama `rediseno-ronda2-2026-11-02`: causa raíz del «Se me trabó algo» de «Para ti» en local, Inicio en dos columnas con el gato grande y suelto, botón «Leer ahora» con canto de sticker, degradado y reflejo, boletos del Cuento del día; antes, ronda 2: una sola publicación por sesión de lectura, paleta extendida de 9 colores, barra inferior de una pieza).
> Audiencia: developer que NO conoce SEMA y necesita continuar el proyecto sin preguntar.

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
- 2026-10-03 — Trueque v3: se quitan las 25 zonas fijas de CDMX de la interfaz (barra de zonas, onboarding/editor de zonas, chips en la tarjeta de match, aviso de Plus) y del matching (cercanía, alcance y requisito de ubicación usan SOLO `trueque_pins` + `max_radius_km`; el estado se queda). `user_exchange_zones` NO se borra (historial). Las cuentas que solo tenían zonas ven el mapa al entrar, igual que una nueva. Buscador de lugares con Nominatim (OpenStreetMap) arriba del mapa de "Mis lugares" (`placeSearchService`). Se re-corre `supabase/trueque_geo.sql`. Se borran `ZonesOnboarding.jsx`, `ZonesEditor.jsx` y `src/config/zones.js`
- 2026-10-07 — Rebrand FOLIO → SEMA: texto visible de la app (títulos, manifest PWA, notificaciones, mensajes de compartir, tarjetas exportables, nombres de archivos descargados, disclaimers del Trueque) y documentación pasan a «SEMA»; íconos PWA y `logo.png` reemplazados por `SEMA LOGO PROVISIONAL.png` (`generate-icons.mjs` ahora lo reescala). Se conservan a propósito identificadores internos: claves `localStorage` `folio_*`, `__folio_type` en posts, mensaje `FOLIO_SCHEDULE_NOTIF` del service worker, función SQL `folio_award`, valor `before_folio`, dominio `folio-final.vercel.app`, proyecto Vercel `folio-final` y el nombre de carpeta `FOLIO FINAL/`
- 2026-10-07 — Email de soporte actualizado a sema.mx, DOCUMENTACION_PARA_DUMMIES.docx regenerado
- 2026-10-10 — Estados de interfaz (solo UI, sin tocar servicios, Supabase ni RPCs): componentes reutilizables `EmptyState` y `Skeleton` (`src/components/`); 21 estados vacíos nuevos o reescritos (Biblioteca, buscador, listas, feed, amigos, solicitudes, chats, notificaciones, Citas, Recomiéndame, UAM, Trueque, Estadísticas) con textos sin segunda persona pendientes de revisión de León; skeletons con brillo en lugar de spinners/«Cargando…» (arranque de la app —antes en blanco—, perfil, calendario de lectura, amigos, chats, notificaciones, comentarios, frases, listas, buscador, Trueque y su chat), con retraso anti-parpadeo de 200 ms y sin animación con `prefers-reduced-motion`; hover solo en dispositivos con mouse (`@media (hover: hover)`, también para los `hover:` de Tailwind vía `hoverOnlyWhenSupported`), estado presionado `:active` para touch, `focus-visible` y `cursor: pointer` globales; los 6 hover hechos con JavaScript pasan a CSS. `theme.js` exporta `applyPaletteCssVars` (tokens de `palette` como variables `--sema-*`); `.hover-bg-soft` y `.timer-book-hover` dejan sus hex fijos de modo claro
- 2026-10-10 — León aprueba tal cual los textos de los 21 estados vacíos (tabla en §VII «Estados de interfaz»). El logo fuente `SEMA LOGO PROVISIONAL.png` se renombra a `Sema Logo.png` (mismo archivo, mismo contenido) y `generate-icons.mjs` lo lee con el nombre nuevo
- 2026-10-11 — Design system SEMA (solo UI; sin tocar servicios, Supabase ni RPCs): paleta limpia a 5 colores (Crema, Tinta, Vino, Ámbar, Salvia) en `theme.js` —los tokens conservan nombre y los extras (`mauve`, `slate`, `freeze`, `amberRich`, `session`, `like`, `badge`) apuntan a los 5—; `inkFaint` oscurecido para contraste 4.5:1; paletas de género, estados, avatares, racha, heatmap y Wrapped reducidas a esos colores; tipografía nueva (Bricolage Grotesque títulos, Figtree interfaz, Instrument Serif citas) reemplaza a Fraunces/EB Garamond en App.jsx, componentes y mascotas; cursiva sintética eliminada de los títulos; nuevos exports `quote`, `sp`, `FONT_*` y `ts.quote`; HomeView rediseñado (una sola acción principal «Leer ahora», racha como texto sin caja, mascota que habla, «Descubre tu siguiente» solo con 3+ libros); header (logo «sema», gemas con ícono Lucide, sin barra degradada), BookCard sin caja, chips de biblioteca sin borde, citas en Instrument Serif sin comillas decorativas, barra de progreso en vino/salvia (antes arcoíris). App.jsx 13,299 → ~13,222 líneas. Documento del sistema: `design-system/sema/MASTER.md`

- 2026-11-01 — Fix posts de libro sin libro en el feed: `addBook` (App.jsx) asigna `crypto.randomUUID()` cuando el llamador no manda `id` (BookTinder y `BookPreviewModal` no lo mandaban, así que la celebración de «terminado» y el borrador de «empezó» publicaban con `book_id` null); `createFeedPost` no crea (ni encola) posts `book_update`/`reading_session` sin `bookId`; `fetchFeed` registra en consola el error de la consulta de `books`; la tarjeta del feed muestra «Libro no disponible» con espacio de portada si el libro no llega. Los posts viejos con `book_id` null NO se tocaron
- 2026-11-01 — Guion de recuperación `supabase/recovery_posts_book_id.sql` (NO es migración; se corre a mano): conteo por usuario, candidatos por post (mismo `user_id`; `finished_at` / `added_at` ± 24 h; sesiones por día México + páginas, porque `reading_logs.log_date` no trae hora), clasificación seguro/dudoso/sin_candidato, respaldo `posts_backup_20261101` y un único UPDATE solo de las parejas seguras. Escrito y sin ejecutar
- 2026-11-01 — Recuperación de posts (2ª fase): 6 de 28 posts ya vinculados por León con UPDATE; respaldo `posts_backup_20261101` (111 filas, no modificar). Para los 22 restantes, `supabase/recovery_posts_candidates.sql` (una consulta de solo lectura) lista candidatos con señales más precisas: `reward_ledger` `reason='book_finished'` (`ref` = id del libro, hora exacta del cambio a leído), `books.added_at` y `reading_logs.logged_at` (columna con hora; existe aunque no está en las migraciones versionadas). El archivo final con VALUES explícitos se escribe cuando León comparta ese resultado. Feed: la tarjeta «leyó hoy» sin libro ya no muestra «Libro no disponible» (solo páginas/minutos); `book_update` sin libro conserva el respaldo
- 2026-11-01 — Recuperación de posts (3ª fase): el emparejamiento se hace dentro de Supabase, sin IDs a mano. `supabase/recovery_preview.sql` (solo SELECT) y `supabase/recovery_final.sql` (un único `WITH … UPDATE posts … FROM` + verificación) comparten la lógica: candidato = libro del mismo `user_id` con señal a ≤ 60 min (`reward_ledger` 'book_finished' para terminados, `books.added_at` para empezados, `reading_logs.logged_at` con mismas páginas para sesiones); «seguro» = 1 libro candidato y diferencia ≤ 15 min. Los demás quedan con `book_id` NULL. `recovery_posts_book_id.sql` y `recovery_posts_candidates.sql` quedan marcados como obsoletos
- 2026-11-01 — Feed: se retira por completo el recuadro «Libro no disponible». Un post `book_update` o `reading_session` sin libro (book_id NULL o libro borrado/no legible) muestra solo autor + acción («terminó de leer» / «empezó a leer» / «leyó hoy»), comentario y páginas/minutos si existen. Con libro, la tarjeta no cambia
- 2026-11-01 — Diagnóstico «posts con book_id que no muestran libro» (d586ff3f…, c4c140a9…): producción (`folio-final.vercel.app`, bundle `index-CwqNkajo.js`) NO tiene ninguno de los arreglos del día (no hubo `vercel --prod`); su lógica de tarjeta es la misma, así que el libro falta porque la consulta de `books` de `fetchFeed` no lo devuelve y ese error se ignoraba en silencio. `fetchFeed` ahora registra el error (`[fetchFeed]` con code/message/details/hint), reintenta con `id, title, author, cover_url` y avisa con `console.warn` qué `book_id` no llegaron (borrado o RLS `books_select_scoped`). Google Books: `api/books.js` convertía errores de Google (cuota 429, clave 400/403) en `200` con lista vacía («Sin resultados»); ahora responde 429/502 con el mensaje, lo registra en el log de Vercel, y `googleBooksService` lo muestra en consola como `[books]`. `handleSearchSelect` guarda también `pageCount` (→ `total_pages`)
- 2026-11-01 — Cierre del bug de posts sin libro: León confirmó en el feed que los posts vinculados muestran su libro («Hooked», «El túnel», «Terapia para Llevar» y un post nuevo de hoy con «¿Por qué hacemos lo que hacemos?»). Quedan 8 publicaciones viejas sin libro por no tener un candidato seguro: NO se emparejan y se muestran sin recuadro (solo acción, comentario y páginas). No se encontró un paso de la app que perdiera el libro en la lectura

- 2026-11-01 — Lote UI (rama `lote-ui-2026-11-01`, commits `fd57771` → `3e25ae8`): **racha** con una sola lectura normalizada (`streakService.fetchStreakRow` / `normalizeStreak`: mejor ≥ actual) para Home, Social, Perfil, RachaModal y celebración (Home pedía solo `current_streak` y mostraba «Tu mejor: 0»); calendario de Perfil y Wrapped cuentan por `reading_logs.log_date` (antes `logged_at`, que puede ser NULL). **Seguir leyendo**: `booksService.fillMissingPageCount` completa `total_pages` desde Google Books (ISBN o título+apellido) al guardar y al mostrar; BookTinder manda `pageCount`; sin total se lee «N páginas leídas · total desconocido». **Banner de racha**: el copo comparte fila con «+ Páginas». **Espacio inferior** `.main-fab-clearance` (156 px + safe area) en `<main>`. **Likes**: `notifyLike` crea la notificación solo si el like se guardó y una vez por sesión; la hoja de notificaciones muestra a qué publicación/comentario fue (`attachNotifTargets`); limpieza e índice único en `supabase/lote_ui_2026-11-01.sql` (sin ejecutar). **Géneros**: `genreService.normalizeGenre` (Google Books → español, unificado) en guardado y lectura. **Carruseles**: `.scrollbar-hide` definido en `index.css` (el plugin de Tailwind nunca se instaló) y aplicado a todos. **Leyendo ahora**: nombre de pila completo. **Navegación**: Trueque fuera de `NAV_ITEMS` (decisión 16 oct; código intacto), Social sin campana propia, PetHub con un solo «Mi perfil». **Recomendaciones** (`api/recommendations.js`): géneros del usuario (`preferred_genres` + top de su biblioteca) primero y sin libros propios, en ruta personalizada y respaldo; `GENRE_MAP`/`expandGenres` pasan a `src/data/genreMap.js`. Revisión visual: `BookCoverImage` mide el texto contra la portada (`cqw`) y la tarjeta de BookTinder usa `calc(100dvh - 390px)`

- 2026-11-02 — `.gitignore`: se quita la regla que ignoraba `.claude/` (ahora entra a git); quedan ignorados `.claude/settings.local.json` y una regla por cada una de las 60 carpetas de skills de terceros de `.claude/skills/` (las que no empiezan con `sema-`, que sí entran); se agrega `capturas/`. `.env.local` sigue ignorado (`.env.local` y `.env.*.local`). Sin cambios de código de la app. Ver §XII #21
- 2026-11-02 — Sistema de agentes de diseño (sin tocar código de la app): 5 skills (`.claude/skills/sema-identidad`, `sema-paleta`, `sema-voz`, `sema-capturas` con la plantilla `captura.js`, `sema-prompts`), 6 agentes (`.claude/agents/`: `disenador`, `critico`, `lectora`, `accesibilidad`, `copy`, `qa`) y 3 comandos (`.claude/commands/`: `/paleta`, `/revisa`, `/redisena`) para rediseñar SEMA una pantalla a la vez con la paleta nueva (blanco/negro puro, tinta `#483A58`, acción `#F45B69`, firma lila `#BBADFF`). Ver §III «Sistema de agentes de diseño». ⚠️ `.claude/` está en `.gitignore`: estos archivos viven solo en el disco local
- 2026-11-02 — Paleta SEMA 2026-11 (rama `paleta-2026-11-02`, solo `theme.js`, sin tocar componentes): commit `ffdf223` cambia `PALETTE_LIGHT`/`PALETTE_DARK` según `sema-paleta` (claro primario con fondo `#FFFFFF`, tinta `#483A58`, acción `#F45B69`; oscuro con negro puro `#000000` y tinta `#FFFFFF`), conserva todos los nombres de token y agrega `firma`, `onFirma`, `acentoCalido`, `superficieSuave` y `complementoFrio` (`applyPaletteCssVars` los expone solos como `--sema-firma`, etc.); commit `d4172e8` corrige el brillo del skeleton (`--sema-skel-shine` pasa a `bg`, porque `border` y `borderSoft` ahora valen lo mismo). `BRAND` y los datos de arte siguen con la paleta anterior; pendientes en §XII #22
- 2026-11-02 — Primario durazno (rama `rediseno-tanda-2026-11-02`, commit `8004538`). León comparó 4 candidatos en Inicio (lila, cereza, durazno y azul acero; `capturas/home/comparacion-primario-2026-11-02.png`) y eligió durazno. `accent` `#F79F79` en claro y `#F9B294` en oscuro (11.82:1 sobre negro; se descartó `#F0B9A0`, 12.15:1, porque se ve deslavado y beige). `accentSoft` `#FBD4C3`. `onAccent` pasa a `#483A58` en los dos modos (5.04 / 5.85 sobre durazno). Token nuevo `onColor` `#FFFFFF` para texto e íconos sobre colores oscuros o saturados; unas 50 líneas pasan de `onAccent` a `onColor` (App.jsx, `BookTinder`, `DeleteAccountModal`, `PetHub`, `PetLevelUpToast`, `PetOnboarding`; se dejan en `onAccent` las que sí van sobre durazno). `badge` oscuro pasa a `#B03A2E` (blanco encima 6.02; `#E5675B` daba 3.27). `SubTabBar` y las pestañas inactivas van en `ink`. Se actualizaron `.claude/skills/sema-paleta/SKILL.md` y `design-system/sema/MASTER.md`.
- 2026-11-02 — `/redisena home` (rama `rediseno-tanda-2026-11-02`, commits `8004538`, `d91b77a` ronda 1, `527cf26` ronda 2 y `c027af4` corrección puntual), dos rondas con crítico, lectora, accesibilidad y copy, más una corrección de QA. Inicio: header con logo «sema» en tinta, avatar con inicial (44 px, abre Perfil) y campana de 44 px con badge `onColor` de 12 px; saludo en Bricolage 32 px que corta en `@ . +` el nombre que llega como correo; racha como sticker lila (`firma`/`onFirma`) con textura de papel, canto (filo `bg` + anillo `ink`) y estado «en pausa» derivado del mismo criterio que `checkStreakOnLoad`; la mascota habla pegada al sticker con la voz del gato (Instrument Serif), sin nivel ni chevron, con halo `firma` en oscuro; «Leer ahora» única acción en durazno con `onAccent`; libro actual con `BookCoverImage` o, sin portada, el título como lomo sobre `superficieSuave`; `ProgressBarBook` sin total muestra el número grande («99 págs. leídas · no sabemos de cuántas») y con total una barra de 10 px con borde `ink`; barra inferior con borde superior rasgado lila, etiquetas de 12 px, píldora activa con `onAccent`, círculo central plano `firma` con `aria-label="Mascota"` y «Home» → «Inicio»; FAB silencioso (fondo `bg`, borde e ícono `ink`, sin sombra); foco global (`:focus-visible`) en `ink`; `RachaModal` y `LeerAhoraModal` planos (sin `BRAND.gradient`), copy nuevo de racha («Récord», «Listo», pausa coherente con el sticker). CSS nuevo en `index.css`: `.sema-nav-rasgado`, `.sema-papel`, `.sema-sticker`; `.main-fab-clearance` sube a 166 px. QA: la tarjeta del cuento en Social usa `onAccent` sobre `accent` y «Leyendo» en «Tu biblioteca» va en `ink`. Capturas en `capturas/home/2026-11-02-despues-{claro,oscuro}.png`.

- 2026-11-02 — `/redisena explorar` (Descubrir, rama `rediseno-tanda-2026-11-02`, commits `cf7dd8e` ronda 1, `f067ea0` ronda 2 y `4032a60` corrección puntual). Portada genérica nueva en `BookCoverImage` (campo neutro de superficie, tinta o acero, título en Bricolage y un boleto troquelado lila/superficie/tinta con el autor y «Nº XXXX»; combinaciones fijas en `SEMA_COVER_COMBOS` de `theme.js`), que se ve también mientras la foto carga o si falla; estrella SVG y cero emojis (contador, avisos, panel de info, `LimitModal`, vacíos). Tarjetas sin sombra con contorno `inkSoft`, velo que crece con el texto sobre la foto, sellos sticker «GUARDAR» (lila) y «PASO» (ciruela), corazón durazno como única acción rellena. Arriba, «Quedan N guardados hoy» + «Libro 1 de 20» y una barra que muestra los guardados que quedan. `CARD_HEIGHT` con `dvh`: los botones quedan ~39 px por encima del borde rasgado en 390×844 y en 375×667; el panel de info tiene scroll y la sinopsis se corta por líneas completas. Vacíos con el gato sobre un disco lila («Sin géneros favoritos no se arma la pila.»). `LimitModal` con `role="dialog"` y Escape; aviso con `role="status"`. `ReadingStatusModal` sin los colores de estado viejos. `SubTabBar` (compartida con Perfil) de 44 px, línea activa `ink` y roles de pestaña. Ver §III «Descubrir (2026-11-02)»
- 2026-11-02 — `/redisena explorar` (Para ti, rama `rediseno-tanda-2026-11-02`, commits `a428572` ronda 1, `f1fcb50` ronda 2, `6508229` corrección puntual y `728a835` corrección de QA). `RecommendFlow` pasa de formulario a conversación con el gato: globos del gato en `superficieSuave`, respuestas del usuario en `firma` que se pueden tocar para cambiarlas (lápiz solo en la última), opciones como burbujas de 44 px con etiquetas neutras (`{value, label}`: el valor que va a la IA no cambia), «Pregunta N de 5» bajo la pregunta, «escribiendo…» con `.reco-typing-dot` (quieto con `prefers-reduced-motion`), paso 5 con caja de texto y contador sin «opcional», sin abrir el teclado solo (el foco va al globo). «Ver ideas» es la única acción durazno. Resultados en lista sin tarjetas; al llegar, la plática se colapsa en una línea con un solo botón «Ver/Ocultar la plática» (`aria-expanded`/`aria-controls`); `role="log"` y foco gestionado. `BookCoverImage` en modo `compact` muestra un monograma (inicial de la primera palabra con peso, con la raya debajo para que la N no parezca Ñ). Ver §III «Para ti (2026-11-02)»
- 2026-11-02 — `/redisena social` (rama `rediseno-tanda-2026-11-02`, commits `b11723e` ronda 1, `7cafb18` ronda 2, `eacc3de` corrección puntual y `b0b06bb` corrección de QA). Sin título «Social»; orden saludo → Leyendo ahora → racha → «Tengo 5 minutos» → composer → feed, con el cuento del día después de la segunda publicación. Sticker de racha lila compacto con la meta del día («5 de 20 páginas hoy», durazno mientras avanza y éxito al cumplir; «Una página ya cuenta. La meta del día es 20.») y confeti solo cuando la meta se cumple de verdad. **Mapa de color por tipo de publicación** (tabla en §III «Social»); libro terminado con `degradadoAcento` y la portada al frente, idea que estaba en §XII #24. `AVATAR_COLORS` solo ciruela, acero y éxito, con `avatarEdge()` (filo `inkSoft` en oscuro) en los 7 sitios que usan `getAvatarColor`. Helpers `shortFirstName`/`displayAuthorName` (nombre propio sin correo). `BottomNav` con papel, filo `ink`, píldora activa con contorno y `aria-current` (afecta a todas las pestañas). Foco visible sobre lila, ciruela y degradado (`.sema-focus-*`). Copy en voz Sema en `PostDraftModal` («terminó»/«empezó»), `ReadingLogModal`, errores y logros. Ver §III «Social (2026-11-02)»
- 2026-11-02 — `/redisena perfil` («Mi perfil», rama `rediseno-tanda-2026-11-02`, commits `5427dee` ronda 1, `0732e0a` ronda 2, `d8df119` corrección puntual y `39a59a9` corrección de QA final: velos negros en el detalle de logro, Invitar y Eliminar cuenta; WhatsApp con `onAccent` (5.24:1); «Copiado» en `success` + `onColor` en claro (5.79) y `ink` + `bg` en oscuro (21.00), 14 px y 44 px de alto; Twitter / X con borde 1.5 px `inkSoft` en oscuro; detalle de logro como diálogo con `aria-modal`, foco en «Cerrar» y Escape). Sin hueco sobre la portada; sin foto de portada no hay franja ni filete: el avatar va justo bajo las pestañas y «Poner portada» es un botón silencioso junto a «Invita a un amigo». Sticker de racha lila como en Inicio. Calendario de lectura con 4 niveles de tokens (tabla en §III «Perfil»), filo `ink` en todo día con lectura, leyenda «Páginas al día: 1–5 · 6–15 · 16–30 · 31+» y `aria-label` por día. Contadores, Wrapped (`degradadoAcento` sin sombra, `.sema-focus-wrapped`) y géneros sin cajas; la lista de un género usa `BookCoverImage` compacta. `AchievementGrid` (compartido con el perfil de amigo) con prop `onlyUnlocked`: la vista corta muestra solo los logros ganados como stickers lila; los bloqueados van sin contorno. Privacidad y Apariencia como `radiogroup`, sin durazno como texto. Copy nuevo («Mi biblioteca», «Mejor calificados», «Todavía ninguno. El primero sale leyendo.», errores amables). Ver §III «Perfil (2026-11-02)»

- 2026-11-02 — Ronda 2 de rediseño (rama `rediseno-ronda2-2026-11-02` desde `rediseno-tanda-2026-11-02`; commits `3a5bdf8` duplicados, `2d8d385` paleta extendida, `bcba8df` primera pasada, `390a014` correcciones de crítico, accesibilidad y copy; sin push ni fusión). **Duplicados del feed:** `logReadingSession` publicaba la sesión y `ShareSessionModal` («¿Compartir tu sesión?», tras registrar desde Social) insertaba otra fila `reading_session` igual; ahora `createFeedPost` devuelve el id, `logReadingSession` devuelve `{ postIdPromise }` y el modal completa ese post con `updateSessionPost`. `fetchFeed` colapsa los pares ya guardados (`collapseDuplicateSessions`: mismo autor, libro y páginas en < 10 min) y la hoja de notificaciones junta los likes gemelos (`collapseTwinNotifs`). Limpieza propuesta sin ejecutar: `supabase/limpieza_posts_duplicados_2026-11-02.sql`. Reseña de «Libro terminado» una sola vez (`sameReview`). **Paleta extendida** `SEMA_EXTENDIDA` (9 colores, texto `#483A58`) y `SEMA_GRADIENTES_TERMINADO` con `stableHash`/`pickByHash`/`assignSequenceColors` en `theme.js` y sema-paleta §7. Detalle de pantallas en §III «Ronda 2 de rediseño (2026-11-02)».
- 2026-11-02 — Ronda 3 de ajustes (rama `rediseno-ronda2-2026-11-02`; commits `bbf5d02` causa raíz y errores de «Para ti», `609ddb9` correcciones de «Para ti», `da9f685` boletos del Cuento (lleva también la cola nueva de `index.css` de las tres zonas), `8b0c21a` botón, `1099368` Inicio; sin push ni fusión; capturas en `capturas/ronda3-2026-11-02/`, no versionadas). **«Para ti» no recomendaba** (bug prioritario): la causa era del entorno local, no del cuestionario en chat ni del parseo. `server.js` solo cargaba `.env` (que trae una `VITE_ANTHROPIC_API_KEY` vieja) y nunca `.env.local`, donde vive `ANTHROPIC_API_KEY`, así que el proxy contestaba 500 «not set»; además las dos claves guardadas en la máquina responden 401 «invalid x-api-key» en Anthropic. Producción (`folio-final.vercel.app`) responde 200 con `claude-sonnet-4-6`. Arreglos: `server.js` carga `.env` y luego `.env.local` y avisa al arrancar si falta la clave; `vite.config.js` acepta `SEMA_API_TARGET=https://folio-final.vercel.app` para apuntar `/api` al despliegue y probar en local sin clave; `aiService.js` tipa los errores (`AiError.kind`: network, timeout, session, rate, config, upstream, parse; timeout de 60 s; un solo `callAnthropic`); `RecommendFlow` dice una línea del gato por causa (`RECO_ERROR_LINES`), «Intentar otra vez» manda las mismas respuestas (con sesión caída no se ofrece), la causa técnica se ve bajo el globo solo en desarrollo y el prompt pide razones de 1–2 oraciones en voz de compa (sin «mood», «resonar», tono de coach). **Inicio:** cabecera de `HomeView` en dos columnas (saludo + sticker de racha; gato de 300 px suelto, sin sticker lila detrás, con los bigotes asomando por el borde derecho), globo de cómic con cola SVG bajo las patas, racha `minWidth` 150, «Día uno. Cuenta igual.» con 1 día, `petLine` nocturna desde las 20 h; en oscuro el gato carga `public/pets/cat-recorte.png` (canto blanco horneado, sin halo en los bigotes); `PetDisplay` gana `wPx` y `src`. **`StickerButton`:** degradado leve (`color-mix` del durazno con 22 % de blanco en claro y 10 % en oscuro, luz arriba-izquierda, texto ≥ 5.04:1), reflejo fijo de vinil en la esquina + barrido de 1.1 s al montar, al hover/foco y cada 24 s (solo reflejo fijo con `prefers-reduced-motion`), canto de sticker como la racha (filo `bg` + anillo `ink`) con la sombra sólida de siempre, flecha a mano en SVG; se quitaron el disco Lucide (prop `icon`) y la variante con filete punteado. **Cuento del día:** las etiquetas son boletos sin iconos: «02 NOV ¦ CUENTO DEL DÍA» (papel fijo `SEMA_PAPEL` arena/tinta en ambos modos, muescas, perforado, talón con la fecha `aria-hidden`) y «8 MIN DE LECTURA» (estampilla troquelada mostaza o limón por `pickByHash`), Bricolage 800 13 px mayúsculas, giradas −3° / +2°; la duración sigue saliendo solo de `cuentoDuracion`. Detalle en §III «Ronda 3 de ajustes (2026-11-02)»; pendientes en §XII.27.
- 2026-11-03 — Ronda 4 de rediseño: feed a todo el ancho, sistema de detalles y tipografía (rama `rediseno-ronda4-2026-11-03` desde `rediseno-ronda2-2026-11-02`; commits `f7b231b` tipografía por variables + kit, `71b880a` App.jsx sin familias a mano + CSS del kit, `92280bc` Explorar y botón «+», `5007135` Social, `1d12ffb` Inicio, `964d033` correcciones de crítico/accesibilidad/copy, `a49aaf9` skills; sin push ni fusión; capturas en `capturas/ronda4-2026-11-03/`, no versionadas). **Tipografía:** las familias viven en `SEMA_FONTS` de `theme.js` y se exponen como `--sema-font-display/-label/-ui/-quote`; `FONT_*`, `display`, `label`, `body`, `quote` y `ts.boleto` leen esas variables, y ya no hay ninguna familia escrita a mano fuera de `theme.js`. Se compararon tres combinaciones (A Syne + Barlow Condensed, B Unbounded + Space Mono, C Archivo + Archivo Narrow) en Inicio, Social y el boleto del Cuento (`scripts/captura-ronda4.mjs --fonts=a|b|c`) y quedó **B**: Unbounded en titulares, nombres y cifras (≥ 15 px), Space Mono solo en boletos y sellos, Figtree e Instrument Serif siguen; `display=swap`, subconjunto latino por `unicode-range`. **Kit de detalles** `src/components/Detalles.jsx` (`CintaAdhesiva`, `SelloTinta`, `Boleto`, `NotaMano`; CSS `.sema-kd-*`; demo `?detalles=1` solo en dev vía `DetallesDemo.jsx` y `main.jsx`). **Social:** publicaciones de borde a borde sin tarjeta, borde ni radio, separadas por línea de 1 px `borderSoft`; cinta de tipo a todo el ancho (color por publicación, 13 px 700, 5 px de padding); encabezado con menú de tres puntos (`MoreHorizontal`, «Ver libro» / «Borrar publicación», foco devuelto al cerrar, flechas, Home/End, cierre al salir con Tab) en lugar del bote de basura; contenido y acciones sin cajas; Libro terminado con la reseña como recorte de papel con `CintaAdhesiva` y sello fechador («03 NOV», `aria-hidden`) en el recorte, una sola vez; compositores «Tengo 5 minutos» y «¿Qué estás leyendo?» a todo el ancho (`.sema-composer-fab` queda sin uso); racha de Social como boleto recto con dentado lateral y talón «RACHA» (`.sema-post-racha`); Cuento del día sin la estampilla de minutos («· 15 min» en la línea del autor). **Inicio:** racha como boleto lila dentado con talón «RACHA» (`.sema-r4-racha`), sello «Récord personal» solo con `cur > 1 && cur >= best && !streakPaused`; nota a mano «Te faltan N páginas» (`NotaMano`, recta) con datos reales bajo «11% · 99 páginas leídas»; botón principal contextual «Retomar lectura» (un libro → `ReadingLogModal` directo; varios → modal «¿Cuál retomamos?») o «Empezar a leer» (modal «¿Por dónde empezamos?»: Cuento del día o «Buscar un libro» → Explorar); antes siempre «Leer ahora» → «¿Qué leemos?»; h1 26 px; lomo sin portada con `hyphens`. **Explorar:** boletos de papel con la razón real (estado del libro «Ya empezado» / «En Quiero leer», `s.genre` o el ánimo elegido mapeado a «Para pensar»…; en el carrusel, la razón del backend acortada, un solo boleto por sección cuando se repite, texto completo en `sr-only`); portadas del carrusel con sombra sólida. **Botón «+»:** se esconde al bajar y vuelve al subir o al tope/fondo (sin transición con `prefers-reduced-motion`, `blur()` al ocultarse), y no aparece en Perfil › Mi perfil ni en «Editar perfil» (`PerfilWrapper` avisa la subpestaña con `onSubChange`). **Efectos de Unbounded corregidos:** pestañas (`SubTabBar`), etiquetas del formulario de perfil y «Wrapped 2026» en Figtree o con tamaño ajustado. **Contraste:** `#483A58` pasa AA sobre los nueve colores de la paleta extendida (4.77–7.88) y sobre papel, lila, superficie clara y durazno; sobre negro y superficie oscura el texto es blanco; la cinta adhesiva semitransparente es solo decorativa. Detalle en §III «Ronda 4 (2026-11-03)»; pendientes en §XII.28.
- 2026-11-04 — Ronda 5 de rediseño: Mascota, separador de feed, cartón, globo del gato, botón contextual, Libro terminado y banners de hito de racha (rama `rediseno-ronda5-2026-11-03`; 4 commits de trabajo + 1 de correcciones tras crítico, accesibilidad y QA; SQL de hitos propuesto, sin ejecutar; detalle en §III «Ronda 5» y pendientes #29)
- 2026-11-05 — Gato animado en Lottie (rama `mascota-gato-animado` desde `main`). Componente nuevo `src/pets/Mascota.jsx` (props `mascota`, `estado`, `tamaño`, `onFin`, `pausa`, `alt`, `respaldo`, `canto`) con `lottie-react` 3 (`LottieLight`: solo SVG, sin `eval`; librería y JSON por `import()` dinámico). Un solo factor de escala (`tamaño` = alto de «leyendo», lienzo 399 × 540); la caja del layout es la de «leyendo» y los demás estados desbordan sin mover nada. `prefers-reduced-motion` o `pausa` → primer fotograma; si el JSON no carga se ve el PNG de antes (`public/pets/cat.png` / `cat-recorte.png`, por eso se conservan). `useEstadoMascota`: celebrando (sube de nivel por `petBus` o la racha cae en un hito) > dormido (racha en pausa o desde las 20 h hasta las 6) > café (primera visita del día, `localStorage` `sema_mascota_dia`) > leyendo; en desarrollo `?mascota=leyendo|dormido|celebrando|cafe` fuerza el estado. `canto` = filo de 2 px del color de fondo (4 `drop-shadow`) donde el contorno lila cae sobre lila (tarjeta de racha en Inicio, recorte de Mascota, discos de «Para ti», BookTinder y perfil de amigo). Sustituye a `PetDisplay.jsx` (borrado) en Inicio, PetHub, onboarding, perfil de amigo, aviso de nivel, avatar de «Para ti» y estado vacío de BookTinder. Assets en `src/assets/mascotas/gato/` y `zorro/` (los zorros copiados, sin conectar). Capturas: `scripts/captura-mascota.mjs` → `capturas/mascota-gato/`.
- 2026-11-06 — Collages MVP (rama `collages-mvp` desde `mascota-gato-animado`; sin push ni fusión; SQL escrito y sin ejecutar). Lienzo creativo tipo Pinterest Shuffles. **Navegación:** pestaña propia «Collage» en la barra inferior, entre Mascota y Social; la barra queda en 5 porque Trueque ya estaba fuera. Lleva «Mis collages» en cuadrícula y «Nuevo collage». **Editor** a pantalla completa:
  - lienzo 9:16 o 1:1 que no cambia de tamaño, con la bandeja abriendo encima (Stickers / Papeles y fondos / Mis frases);
  - arrastrar, pellizcar y girar con dos dedos, más botones Agrandar, Achicar y Girar;
  - modo capas al mantener presionado (vibra y se resalta; arriba = al frente, abajo = atrás), más «Al frente» y «Atrás»;
  - bote en la franja inferior al arrastrar, guías de zona segura de historia, deshacer y rehacer (60 pasos), cambio de fondo;
  - frases como recortes de revista en 5 estilos, con libro y autor.

  **Lienzo propio sin dependencias:** DOM + Pointer Events, y canvas 2D para exportar (ver §IV.15 «Por qué sin librería»).
  **Catálogo en datos:** `src/data/collage-catalog.json` (sets, objetos, obtención inicial/racha/gemas/plus, precios, probabilidades, límites, fondos y estilos de frase), leído por `src/services/collageCatalog.js`.
  **Assets:** 81 stickers convertidos a WebP (720 px + miniatura de 200 px) y un set propio de texturas (papel, cartón arrugado, kraft, cuaderno; fondos de 1080×1920 y piezas rasgadas). Los genera `scripts/collage-assets.py` en `public/collage/` (3.7 MB, fuera del precache; se cachean al usarse en `collage-v1`). `assets-fuentes/` (144 MB) pasa a `.gitignore`.
  **Servidor:** `supabase/collages_mvp_2026-11-06.sql` crea:
  - tablas `collage_sets`, `collage_config`, `user_collage_inventory`, `collage_unlock_events`, `collage_reward_state` y `collages`;
  - RPCs `collage_mi_estado`, `collage_streak_roll` y `buy_collage_set`;
  - trigger del tope de 5 collages sin Plus.

  La tirada de premio va justo después de `update_streak()` en `readingService`: idempotente por día, 30 %, y nunca más de 5 registros seguidos sin premio. La compra con gemas va contra `user_gems` + `reward_ledger` (reason `collage_set`). Sema Plus = `users.is_premium` (bandera `plus`, falsa por defecto). Mientras el SQL no se corra, `collageService` trabaja en **modo local** (`localStorage` `sema_collages_v1:<user>`, compra deshabilitada).
  **Publicación:** la imagen se exporta como JPEG de 1080 px y se sube como archivo nuevo a `post-images`, así queda congelada. El post es `text` con JSON `{ __folio_type: "collage", formato, collageId, encima }` (mismo patrón que las frases, sin tocar `posts.type`). En el feed lleva la franja «Collage»; si se publicó con una frase o una reseña, encima va una tarjeta de papel blanco con tinta para que se lea.
  **Compartir:** acción principal de «Listo». PNG de 1080×1920 o 1080×1080 con la hoja nativa (o descarga), con una marca chica «Sema».
  **Celebración** de set nuevo (`collageBus`): abanico de tres piezas con sello «Set nuevo» y confeti, sin emojis.
  **Revisión:** crítico, accesibilidad y copy (una ronda; sus pendientes en §XII.30).
  **Capturas y prueba de gestos con toques reales (24/24):** `scripts/captura-collage.mjs` → `capturas/collage/`.

- 2026-11-06 — Ajustes al catálogo de Collages (rama `collages-mvp`). **Kit inicial:** Tinta + Papeles. Set nuevo `tinta` (5 stickers: hongo, luna, ojo, escarabajo, espiral) dado de alta en el catálogo y en el SQL; sus PNG se copiaron a `assets-fuentes/stickers/tinta/` el 2026-11-06 y ya están convertidos a WebP + miniatura (ver la entrada siguiente). **Racha:** `psico` se parte en 4 sets de 6 por afinidad visual: Trance (espirales y op-art), Tercer ojo (ojos, serpiente, hongo, estrella), Olimpo (busto, columna, Saturno, estrellas, arcoíris) y Bodegón (cerezas, teléfono, caracol, lirio, rama, mariposa). Los IDs y archivos de los stickers no cambian (`psico-*`); solo su `set`. **Gemas:** Botánico pasa de inicial a gemas; Botánico y Sellos de planta cuestan 100. **Aviso de tope:** «Borra uno de tus collages para crear otro.» / «Collages ilimitados en Sema Plus (próximamente).» (en el editor: «…para guardar este.»). **SQL revisado:** solo crea objetos nuevos; se agregó un `UPDATE` que desactiva (no borra) sets que salgan del catálogo, únicamente en `collage_sets`, la tabla nueva del mismo archivo.

- 2026-11-06 — Sets nuevos de Collages y fuentes por carpeta (rama `collages-mvp`). Fuentes en `assets-fuentes/stickers/<set>/`, una carpeta por set (botanico, psico, sello, tinta, poe, tarot, musica). `scripts/collage-assets.py` recorre cada carpeta: un set nuevo solo requiere su carpeta. Nunca entra lo que esté en una subcarpeta `revisar-marcas/` (marcas registradas; hoy 4 de música). La lista `EXCLUIR` deja fuera tarot-la-estrella, tarot-los-enamorados y tarot-el-mundo (desnudos) y borra su WebP si existiera. Nuevo modo `python scripts/collage-assets.py stickers` (solo stickers, sin regenerar texturas). Sets nuevos en catálogo y SQL: **Nevermore** (`poe`, 12, racha), **Arcanos** (`tarot`, 11, 100 gemas) y **Lado B** (`musica`, 14, 100 gemas). Tinta sigue en el kit inicial, pero `stickers-tinta.zip` no llegó: su carpeta está vacía. 76 stickers en WebP, `public/collage/` pesa 6.8 MB. Verificación: `scripts/captura-collage-sets.mjs` (bloqueados con muestra y candado; desbloqueados en local, 12/11/14 piezas; 4 piezas agregadas al lienzo; claro y oscuro, sin errores).
- 2026-11-06 — Tinta en Collages con sus stickers reales (rama `collages-mvp`). Se copiaron los 5 PNG de `stickers-tinta.zip` (hongo, luna, ojo, escarabajo, espiral) a `assets-fuentes/stickers/tinta/` (carpeta fuera de git) y se borró el zip de la raíz. `python scripts/collage-assets.py stickers` los convirtió a `public/collage/stickers/tinta-*.webp` y `min/` (los 76 WebP anteriores salieron idénticos; el script es determinista). Total: 81 stickers en WebP. Verificación en vista celular 390×844 (claro): Tinta aparece al inicio de la bandeja con sus 5 piezas y una pieza se agregó al lienzo; sin errores de consola ni de red. Capturas: `capturas/collage/2026-11-06-22-bandeja-tinta-celular.png` y `…-23-lienzo-tinta-celular.png`.
- 2026-11-06 — Corrección: el feed no muestra el JSON de los collages (rama `collages-mvp`, `src/App.jsx`). Se reprodujo el síntoma en el código anterior: si un collage llegaba sin clasificar (JSON roto o `type` «text»), la rama genérica de `renderPost` imprimía `{"__folio_type":"collage",…}` arriba de la imagen. Cambios: (1) `normalizarCollage(post)` reconoce el collage por su contenido al entrar a `renderPost` y lo pinta con la tarjeta de collage (imagen exportada + tarjeta de frase o reseña si la hay); (2) `textoVisible(content)` impide que cualquier JSON con `__folio_type` (o un JSON roto que lo contenga) se muestre como texto, en publicaciones de lectura, libros terminados y la rama genérica; (3) `describePostTarget` (notificaciones) no cita JSON interno cuando no hay texto visible. Perfil y hoja de notificaciones revisados: no mostraban el JSON. Verificación en celular 390×844 con datos inyectados por intercepción (solo lectura): caso antes/después con JSON roto (`capturas/collage/2026-11-06-feed-collage-antes-roto.png` y `…-despues-roto.png`), frase, reseña y collage sin encima (`…-despues-frase.png`, `…-despues-resena.png`, `…-despues-solo.png`), perfil y notificaciones; ningún caso muestra JSON. Nota: un collage con JSON roto se etiqueta «Nota» (no «Collage») porque ya no se reconoce; caso raro, sin cambio de datos. `vite build` compila sin errores. No hay ESLint configurado en el repo.
- 2026-11-06 — Compartir imagen de collages (rama `collages-mvp`, sin datos nuevos en Supabase). **Editor:** en la hoja «¿Qué hacemos con el collage?», el botón «Compartir imagen» exporta siempre 1080×1080 y abre la hoja nativa del celular con `navigator.share({ files })`; si el navegador no la tiene, descarga el PNG. Sin selector de formato. **Guardar** no cambió. **Feed:** el menú ⋯ de cada publicación de collage tiene «Compartir imagen», que comparte o descarga la imagen ya publicada (la congelada en `post-images`; no vuelve a dibujar el lienzo). Lógica compartida en `src/components/collage/collageCompartir.js` (`compartirArchivo`). Verificación en escritorio headless (390×844, claro y oscuro): botón en el editor, acción en el menú del feed y descarga de ambas (`sema-collage-1080x1080.png` y `sema-collage-<id>.jpg`). Pendiente: probar la hoja nativa en un celular real (el headless no la tiene). Capturas en `capturas/collage/2026-11-06-share-*.png`.
- 2026-11-06 — Analítica de producto con PostHog (rama `analitica-posthog`, desde `collages-mvp`; sin push ni fusión). Nuevo `src/analytics.js` (`init`, `identify`, `reset`, `track`), único módulo que importa `posthog-js`. Sin `VITE_POSTHOG_KEY` todo es no-op y la app funciona igual. `identify` con el id interno (`users.id`) al iniciar sesión, al registrarse y al abrir con sesión guardada; `reset` al cerrar sesión; las llamadas viven en `App.jsx` (`authService` no se tocó). Autocapture y pageviews encendidos; grabación de sesiones con `maskAllInputs`. 12 eventos en inglés snake_case (ver §III «Analítica de producto»). Verificado en ejecución: peticiones a `us.i.posthog.com`, `distinct_id` igual al uid interno, `reset` pasa a un id anónimo al salir, sin correo en las peticiones y sin tocar claves `folio_*`.

---

## I. VISIÓN GENERAL

**SEMA** es una PWA de biblioteca personal + red social de lectura en español (es-MX), gamificada al estilo Duolingo: rachas diarias, mascota virtual que sube de nivel con XP, gemas, logros, feed social con amigos, chat 1:1, recomendaciones con IA (Claude) y un recomendador colaborativo (Matrix Factorization) entrenado offline.

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
| Tailwind 3 (parcial) + estilos inline | UI (fuentes: Bricolage Grotesque / Figtree / Instrument Serif) | La mayor parte del estilo es inline con objeto `palette` de `theme.js` |
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
│   ├── App.jsx               # ⚠️ MONOLITO de vistas (~13.220 líneas; tope 13.283): casi todas las vistas; los helpers de datos ya viven en services/
│   ├── supabase.js           # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── theme.js              # PALETTE_LIGHT/DARK (5 colores) + objeto mutable `palette` + tipografías (`display`/`body`/`quote`) + escala `ts` y espacio `sp`
│   ├── haptics.js / sounds.js# Vibración y efectos de sonido (howler)
│   ├── index.css             # Tailwind base + estilos globales (+ skeleton, hover/press/focus con variables --sema-*)
│   ├── services/             # Capa de datos — 19 módulos (genreService 2026-11-01) (8 originales + 8 extraídos el 2026-09-22 + truequeGeoService y placeSearchService 2026-10-03), ver §VI
│   │                         # (src/config/zones.js se eliminó en Trueque v3: las 25 zonas solo quedan en el enum exchange_zone de la BD)
│   ├── components/           # AddToListSheet, BookCoverImage, BookTinder, DeleteAccountModal, EmptyState, ListDetailModal,
│   │                         # ListFormModal, ListsSection, ReadDateModal, ReadingStatusModal, Skeleton
│   │                         # (EmptyState y Skeleton: estados de interfaz reutilizables, 2026-10-10, ver §VII)
│   │   ├── collage/          # Collages (2026-11-06): CollagesView, CollageEditor, CollageTray, CollageHoja, CollagePublicar,
│   │   │                     # CollagePostBody, CollageCelebracion, collageRender.js (documento, recortes de frase, exportación)
│   │   └── trueque/          # Trueque de libros: TruequeMain + 13 modales/tarjetas (5 de v2; v3 quitó los 2 de zonas) + ui.jsx (ver §VII)
│   ├── pets/                 # Mascota (Lottie), PetHub, PetLevelUpToast, PetOnboarding, PetScene
│   ├── data/                 # cuentos.js + cuentos/*.txt: ~23 cuentos de dominio público para "Snacks"
│   │                         # (los `_raw_*.txt` son material fuente sin procesar)
│   │                         # estados.js: los 32 estados (clave ISO, nombre, centro aproximado) del Trueque v2
│   │                         # collage-catalog.json: catálogo de Collages (sets, objetos, obtención, precios, premios, límites) — DATOS
│   │                         # genreMap.js: GENRE_MAP + expandGenres (IDs de registro → géneros del catálogo); puro, lo usan cliente y api/
│   └── scripts/seed-books.js # Script suelto de seed (no forma parte del bundle)
│   (no existe `src/pages/`: no hay router, las "páginas" son vistas dentro de App.jsx)
├── public/collage/           # Collages: stickers/*.webp (720 px) + stickers/min/ (200 px), texturas/fondo-*.webp (1080×1920),
│                             # texturas/pieza-*.webp (rasgadas) + texturas/min/. Se regeneran con scripts/collage-assets.py
├── assets-fuentes/           # (fuera de git, .gitignore) PNG originales de stickers en alta: stickers/<set>/ (una carpeta por set;
│                             # `revisar-marcas/` nunca entra a la app)
├── public/                   # Iconos PWA, `logo.png`, `gema.png`, `avatars/avatar-1..10.png`, `pets/` (cat.png, cat-blink.png,
│                             # cat-video.mp4), `sw-notifications.js` (notificaciones programadas, importado por el SW de Workbox)
├── design-system/sema/MASTER.md  # Design system de SEMA: paleta, tipografía, espacio y los 8 principios (2026-10-11)
├── .claude/                  # Config de Claude Code para el proyecto. Versionada desde 2026-11-02 (solo `settings.local.json` queda ignorado). Sistema de agentes de diseño:
│   ├── skills/sema-*/SKILL.md  # sema-identidad, sema-paleta, sema-voz, sema-capturas (+ captura.js), sema-prompts
│   ├── agents/*.md             # disenador, critico, lectora, accesibilidad, copy, qa
│   └── commands/*.md           # /paleta, /revisa, /redisena
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
│   ├── recovery_preview.sql              # (manual, solo lectura) vista previa del emparejamiento de posts con book_id NULL
│   ├── recovery_final.sql                # (manual) UPDATE único de las parejas «seguro» + verificación. Correr tras la preview
│   ├── recovery_posts_candidates.sql     # (manual, solo lectura) candidatos por post huérfano con señales de ledger/added_at/logged_at
│   ├── recovery_posts_book_id.sql        # (manual, NO migración) recupera posts con book_id NULL: SELECTs de revisión + respaldo + UPDATE de parejas seguras
│   ├── lote_ui_2026-11-01.sql            # (manual) notificaciones de like duplicadas: diagnóstico, limpieza e índice único notifications_like_once
│   ├── collages_mvp_2026-11-06.sql       # 15. Collages: catálogo del servidor, inventario, historial, tiradas, compras, collages + tope. Correr completo ANTES de desplegar el cliente (sin él, modo local)
│   └── trueque_geo.sql                   # 14. Trueque v2/v3: perfil de Trueque, pines, cercanía SOLO por pines (v3), reglas +18, reportes, embudo. Requiere 10 y 13. Re-correr completo tras cada cambio; ANTES de desplegar el cliente
├── DOCUMENTACION_ARQUITECTURA_COMPLETA.docx  # Versión Word extendida (se genera con scripts/generate_docs.py; el .md es la fuente de verdad)
├── scripts/
│   ├── collage-assets.py     # Collages: PNG de assets-fuentes → WebP de public/collage/ + texturas propias (Pillow + numpy; `python scripts/collage-assets.py [papel|carton|kraft|cuaderno]`)
│   ├── captura-collage.mjs   # Collages: capturas 390×844 claro/oscuro + prueba de gestos con toques reales (bloquea escrituras)
│   ├── generate_docs.py      # Lee este .md y genera el .docx extendido (pip install python-docx)
│   ├── train_recommender.py  # SVD → top-20 por usuario → upsert a recommendation_scores
│   ├── books-500.json/sql    # Seed del catálogo books_curated
│   ├── books-data.js, generate-500-books.js, find_duplicates.py  # Generación/limpieza del catálogo
├── .github/workflows/train-recommender.yml  # Cron 3:00 UTC diario + manual
├── requirements.txt          # Deps de Python del job de entrenamiento
├── vite.config.js            # PWA manifest + estrategias de caché Workbox
├── vercel.json               # Cache-Control no-store para index.html/sw.js (¡crítico para PWA!)
├── generate-icons.mjs        # Genera iconos PWA reescalando `Sema Logo.png` (antes `SEMA LOGO PROVISIONAL.png`; usa @resvg/resvg-js)
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
- **Ronda 2 de rediseño (2026-11-02)** — rama `rediseno-ronda2-2026-11-02`, capturas antes/después en `capturas/ronda2-2026-11-02/` (no versionadas).
  - **Paleta extendida** (sema-paleta §7, `SEMA_EXTENDIDA`): chicle `#FF8FB8`, coral `#FF9478`, mostaza `#F5C451`, limón `#F2E27A`, menta `#9DE3C3`, turquesa `#4FC9B4`, cielo `#7CC3F0`, pervinca `#9AABFF`, orquídea `#E59BE6`. Texto encima siempre `#483A58` (4.77–7.88:1); blanco prohibido; nunca como texto sobre blanco. Asignación determinista por id (`stableHash`, FNV-1a); `assignSequenceColors` evita repetir el color del vecino.
  - **Barra inferior** (`BottomNav`, `index.css .sema-nav-rasgado`): una sola pieza con `clip-path` rasgado de 13 px, mismo color y textura (arena `#E7D7C1` en claro, ciruela `#483A58` en oscuro), sin filete lila. Activo sin durazno: ícono y etiqueta en tinta con más peso y trazo + cinta lila 24×6 girada −3° (con contorno de tinta en claro); inactivas `inkSoft` 600. Pestaña central «Mascota» con `PawPrint` como las demás. El «+» no tapa contenido (`main-fab-clearance`, verificado al final del scroll).
  - **Inicio** (`HomeView`): gato de 132 px sobre sticker de papel lila girado +4° junto al sticker de racha, en la misma fila; la frase del gato debajo.
  - **`StickerButton`** (`src/components/StickerButton.jsx`, `.sema-sticker-btn`): botón principal tipo sticker neobrutalista suave para «Leer ahora» (Inicio y Cuento del día): durazno plano con texto `#483A58`, borde 2 px tinta, sombra sólida desplazada 4 px (tinta en claro, lila en oscuro), se hunde al presionar, foco grueso desplazado, ≥ 52 px, respeta `prefers-reduced-motion`.
  - **Cuento del día** (`SnacksHero`, en Social tras las 2 primeras publicaciones): tarjeta con borde de tinta, franja con degradado frío de `SEMA_GRADIENTES_TERMINADO` elegido por cuento, stickers «Cuento del día» / «N min de lectura» y portada de papel con capitular. Duración con una sola fuente (`cuentoMinutos`/`cuentoDuracion`) en tarjeta, modal, carrusel y lector. Modal «¿Qué leemos?» con el mismo borde en las dos opciones; lector con «Volver» de 44 px.
  - **Feed** (`renderPost` en FeedView): todas las publicaciones con el mismo formato (tarjeta neutra + franja superior con ícono y etiqueta: «Leyó · N páginas», «Empezó a leer», «Libro terminado», «Reseña», «Frase», «Logro», «Nota»); el color de la franja es por publicación (`assignSequenceColors` sobre los ids visibles). «Libro terminado» con degradado por publicación (`pickByHash`); la franja nunca comparte tono con sus extremos; reseña una sola vez con filete de tinta. La frase pasa a la tarjeta común (`FeedQuoteBody`, serif en tinta). El perfil del autor se abre desde el avatar de 44 px. sema-paleta §6 reescrita.
  - **Perfil de amigo** (`FriendProfileModal`, `StatExpandedView`, `LiteraryCompatibility`): sin verdes, mostaza vieja, cafés ni vino. Portada con un color de la extendida; estadísticas sin caja (cifra 28 px tinta + cinta de color distinta debajo); racha como el sticker lila de Inicio con la mascota al lado; frases con `FeedQuoteBody`; copy neutro en género («Mandar solicitud», «Su mascota»).
  - **Para ti** (`RecommendFlow` + `RecoPoll`): encuesta estilo WhatsApp dentro de un solo globo del gato (pregunta en Bricolage 17 px, «Pregunta N de 5 · elige una», filas de 48 px con círculo); al tocar se envía como globo lila del usuario a la derecha, «escribiendo…» 650 ms (`role="status"`) y llega la siguiente. Las contestadas se colapsan a pregunta + respuesta.
- **Ronda 3 de ajustes (2026-11-02)** — misma rama `rediseno-ronda2-2026-11-02`, capturas antes/después en `capturas/ronda3-2026-11-02/` (no versionadas; `home-*` a 390/375/360, `boton-variante-*`, `boton-final-*`, `cuento-*`, `para-ti-*`, `qa-*`).
  - **«Para ti» (`RecommendFlow`, `aiService.js`):** `callAnthropic(body, mensaje)` centraliza la llamada a `/api/anthropic` con `AbortSignal.timeout(60000)` y lanza `AiError` con `kind` (`network`, `timeout`, `session`, `rate`, `config`, `upstream`, `parse`), `status` y `detail`. `RECO_ERROR_LINES` (App.jsx) da la línea del gato por `kind`; con `session` solo se ofrece «Empezar de nuevo» (reintentar no sirve); con el resto «Intentar otra vez» repite `fetchRecs(answers)` con las mismas respuestas. En desarrollo (`import.meta.env.DEV`) aparece «Solo en desarrollo: kind · status · detalle» FUERA del globo, como nota del sistema. Los botones llevan `aria-describedby` al globo de error (`#reco-error-globo`). El prompt de `getMoodRecommendations` pide `reason` de 1–2 oraciones (≤ 40 palabras) en voz de compa de 23 años, sin «mood», «resonar», «estado de ánimo», «perfecto», «viaje», «sumergirte».
  - **Probar la IA en local:** `server.js` carga `.env` y después `.env.local` (manda) y avisa en consola si falta `ANTHROPIC_API_KEY` o no empieza con `sk-ant-`. Sin clave válida en la máquina: `SEMA_API_TARGET=https://folio-final.vercel.app npm run dev` (o una segunda instancia `SEMA_API_TARGET=… node node_modules/vite/bin/vite.js --port 5176 --strictPort`) hace que el proxy `/api` de Vite use el backend desplegado con el JWT del usuario de prueba; sirve también `/api/books` y `/api/recommendations`, que en local no existen. Verificado el 2026-11-02: las dos claves guardadas en la máquina responden 401; producción 200.
  - **Inicio (`HomeView`):** fila `flex` alineada abajo; columna izquierda (`flex 1 1 auto`, `minWidth 0`) con el h1 en tres líneas («Buenas / noches, / Leon», 32 px) y el sticker de racha (`minWidth` 150, ancho de la columna, `zIndex 1`); columna derecha el gato en un botón («Ver a {nombre}») con márgenes negativos que solo comen el flanco transparente del PNG (`<main>` recorta en X; sin scroll horizontal a 390/375/360). Claro: `cat.png` 300 × 200. Oscuro: `cat-recorte.png` 323.5 × 223.5 (el PNG mide 456 × 660: `cat.png` + 24 px de margen y un canto blanco de ~8 px que sigue la silueta firme, alfa > 150, generado con PIL; los bigotes semitransparentes quedan fuera del canto). `PetDisplay` acepta `wPx` (ancho del wrapper, antes siempre cuadrado) y `src` (imagen alternativa). Globo de la mascota: `recoCatBubbleStyle` + cola SVG de 18 × 11 px (`polygon` en `bg` + filo `ink`) bajo las patas, `marginTop -sp.lg`, `zIndex 1`, con `sr-only` «{nombre} dice:». Racha con 1 día: «Día uno. Cuenta igual.»; desde 2 «Esto ya es récord.» cuando `cur >= best`. `petLine` nocturna desde `h >= 20` (igual que «Buenas noches»). `index.css` «Inicio · gato»: bajo `prefers-reduced-motion` se detienen bob y respiración solo del gato de Inicio.
  - **`StickerButton` (`src/components/StickerButton.jsx`, `.sema-sticker-btn` + bloque «Botón sticker (ronda 3)»):** variables `--sb-bg` (accent), `--sb-ink` (onAccent), `--sb-canto` (bg), `--sb-anillo` (ink), `--sb-shadow` (ink claro / firma oscuro), `--sb-brillo` (onColor) y `--sb-luz` (78 % en claro, 90 % en oscuro). Relleno `linear-gradient(160deg, color-mix(in srgb, var(--sb-bg) var(--sb-luz), white) 0%, var(--sb-bg) 70%)`: nunca más oscuro que `accent`, texto `#483A58` ≥ 5.04 (claro) / 5.85 (oscuro) en todo el recorrido. Canto de sticker: `border: 3px solid var(--sb-canto)` + `box-shadow: 0 0 0 1.5px var(--sb-anillo), 4px 4px 0 1.5px var(--sb-shadow)` (hover 5 px; al presionar se traslada 4 px y la sombra baja a solo el anillo). `::after` = reflejo fijo (banda de 7 px, 20 % del ancho, `skewX(-24deg)`, blanco al 30 %, esquina superior izquierda); `::before` = barrido de 1.1 s una vez al montar (1.2 s), al hover con puntero fino, al `:focus-visible` y cada 24 s; ambos detrás del texto (`z-index`); con `prefers-reduced-motion` el barrido es `display: none`. Flecha a mano `FlechaMano` (SVG propio, `currentColor`), prop `arrow` (por defecto `true`); la prop `icon` desapareció (solo la usaban Inicio y Cuento). Descartados tras captura: giro de −1° (escalona el borde) y filete punteado interior (cupón de plantilla; tres marcos dentro del Cuento). Las dos llamadas usan `width: calc(100% - 6px)` para que anillo y sombra quepan en el margen.
  - **Cuento del día (`SnacksHero`, bloque «Cuento del día · boletos» en `index.css`):** sin iconos. Boleto «02 NOV ¦ CUENTO DEL DÍA»: `SEMA_PAPEL` (`theme.js`: `{ bg: "#E7D7C1", on: "#483A58" }`, papel fijo igual en claro y oscuro porque va sobre la franja de color, no sobre el fondo; 7.36:1), borde 2 px, `--corte` 62 px (54 en ≤ 379 px), muescas semicirculares en la línea de corte (`mask-image` de dos `radial-gradient` con 1 px de traslape), perforado `border-left: 2px dashed` entre talón y cuerpo, giro −3°; el talón lleva la fecha (día con `padStart` + mes corto sin signos, mayúsculas) y es `aria-hidden`. Estampilla «8 MIN DE LECTURA»: mostaza o limón de `SEMA_EXTENDIDA` por `pickByHash(cuento.id)` (nunca los fríos del degradado ni coral, que se funde con el botón), texto y borde 2 px en su `on`, troquel dentado en ambos lados (tres capas de máscara), giro +2°, `marginLeft 18`. Bricolage 800 13 px mayúsculas, tracking 0.1em (0.04em en ≤ 379 px; a 14 px el boleto tocaría la portada de papel a 390 y 360). El eje `wdth` de Bricolage no está cargado (`theme.js:49`), así que no hay condensada ni mono.
- **Ronda 4 (2026-11-03)** — rama `rediseno-ronda4-2026-11-03`, capturas antes/después en `capturas/ronda4-2026-11-03/` (no versionadas; `<zona>[-mock][-a|b|c][-360]-<antes|despues>-<claro|oscuro>.png`, `kit-*`, `home-record-*`, `home-empezar-*`, `home-retomar-*`, `explorar-carrusel-*`, `social-scroll-*`, `social-fin-*`, `qa-*`). Script `scripts/captura-ronda4.mjs` con `--mock-feed` (intercepta `rest/v1/posts`, `books` y `users` en el navegador de prueba con publicaciones de ejemplo de los siete tipos; bloquea escrituras) y `--fonts=<set>` (inyecta Google Fonts y sobrescribe `--sema-font-*`).
  - **Tipografía por variables (`src/theme.js`):** `SEMA_FONTS = { display, label, ui, quote }` se escribe en `:root` como `--sema-font-*` al cargar el módulo; `FONT_DISPLAY/LABEL/UI/QUOTE` = `var(--sema-font-x, fallback)`; estilos `display`, `label`, `body`, `quote`; `ts.boleto` (Space Mono 12 px 700 mayúsculas, tracking 0.08em); `ts.h1` 26 px / −0.01em y `ts.h2` 19 px porque Unbounded es ancha. `FONT_LINK` carga Unbounded 500–800, Space Mono 400/700 (+ itálica 400), Figtree e Instrument Serif con `display=swap`. Regla: `display` solo en textos ≥ 15 px; etiquetas, chips, pestañas y formularios en `body`; Space Mono solo en boletos y sellos (si se escapa, la pareja se ve de plantilla). `BookTinder`, `ReadingStatusModal`, `PetHub`, `PetOnboarding` y `PetLevelUpToast` importan los tokens en vez de escribir la familia.
  - **Kit de detalles (`src/components/Detalles.jsx`, CSS `.sema-kd-*` en `index.css`):** colores por variables `--kd-*` desde `palette`, `SEMA_EXTENDIDA` y `SEMA_PAPEL`, sin hex; giros acotados a [−8°, 8°]; sin animaciones (nada que apagar con `prefers-reduced-motion`). Regla: máximo dos detalles decorativos por tarjeta o publicación, un protagonista por pantalla, una sola pieza girada por tarjeta. `CintaAdhesiva` (`color` superficie|firma|papel|clave extendida, `angulo`, `position`, `width`; absoluta sobre el borde superior del padre, opacidad 0.78, dientes por `clip-path`, `aria-hidden`). `SelloTinta` (`color` tinta|firma|frio|exito, `sobre` bg|superficie|color, `angulo`, `size` md 13 / sm 12 px; doble filo en `::before`/`::after` con máscara fuerte de feTurbulence, texto con máscara suave de alfa ≥ 0.95; cae a tinta cuando el color no pasa 4.5:1 en el modo actual). `Boleto` (`color` papel|firma|superficie|extendida, `talon`, `talonAncho` 62, `perforado` arriba-abajo|lados|ninguno, `angulo`, `papel`, `size`, `srText`; el talón es `aria-hidden`, el dato se repite en `srText` o en el `aria-label` del padre). `NotaMano` (`angulo`, `flecha` ninguna|arriba|izquierda; Instrument Serif itálica 18 px en `ink`, subrayado y flecha SVG en `currentColor`, sin caja). Demo `src/components/DetallesDemo.jsx` montada por `main.jsx` solo con `import.meta.env.DEV && ?detalles=1`.
  - **Social (`FeedView`):** lista `.sema-feed-lista` con margen negativo para salir del padding del contenedor; cada publicación `.sema-post` (sin borde ni radio, línea inferior de 1 px `borderSoft`, `:last-child` sin línea), padding lateral por `.sema-post__pad` (16 px, 24 px en ≥ 640); resaltado desde notificación = filete izquierdo de 3 px en `ink` 1.5 s; `band` como cinta de borde a borde; `postHeader` con `postMenuButton` (44×44, `aria-haspopup="menu"`, `aria-expanded`), menú `.sema-post-menu` (`role="menu"`, velo fijo, `autoFocus`, `onKeyDown` flechas/Home/End/Escape, `onBlur` cierra al salir, `closePostMenu()` devuelve el foco al botón; ítem «Borrar» `.sema-post-menu__item--peligro`: `danger` en reposo e `ink` sobre `superficieSuave` al resaltar); el botón no se muestra si no hay libro ni es propia. Libro terminado: degradado protagonista a todo el ancho; debajo `.sema-post__recorte` (giro determinista −1…1° por `stableHash`) con `CintaAdhesiva color="firma"` y bloque `.sema-papel` en `superficieSuave` con «Reseña» + estrellas, la cita y el sello fechador `.sema-post__sello-fecha` (`fechaSello(post.created_at)` → «03 NOV»); si no hay reseña ni calificación no hay recorte ni sello. Imagen a sangre `.sema-post__img`. `DailyReadingBanner`: boleto recto `.sema-post-racha` (misma máscara dentada que Inicio, sin giro, talón «RACHA» vertical), número 30 px en una línea y «día(s) de racha» 15 px debajo, grupo copo + «+ Páginas» con `nowrap` que baja entero si no cabe. `SnacksHero`: sin estampilla de minutos. `SnacksCarousel`: títulos 15 px.
  - **Inicio (`HomeView`, `ProgressBarBook`, `LeerAhoraModal`):** racha `<button class="sema-r4-racha sema-papel">` (variables `--r4-bg`/`--r4-ink`, máscara dentada lateral, giro −2°, talón `--r4-corte` 26 px → 22 px a ≤ 379 px, `__num` 2.4rem → 2rem, `__dias` 15 → 14 px, foco con `outline-offset: -4px` dentro de la máscara); `isRecord` → `SelloTinta size="sm"` con `--kd-ink: onFirma` en lugar de la línea «Esto ya es récord.»; `aria-label` con racha, pausa y récord. `notaFaltan(current, total)` → `NotaMano angulo={0} flecha="arriba"` («Te faltan N páginas», «Te falta 1 página. Hoy se acaba.» si ≤ 20, «No falta nada. Eso ya es terminar.» si 0; sin total no hay nota). `ProgressBarBook`: «{pct}% · {current} página(s) leída(s)». `primaryText/primaryAria/onPrimary`: «Retomar lectura» (un libro → `openRead`) o «Empezar a leer» (`LeerAhoraModal modo="empezar"` con fila «Buscar un libro» → `setTab("explorar")`). Lomo sin portada: `body` 800 12 px, `lang="es"`, `overflowWrap: anywhere`, `hyphens: auto`.
  - **Explorar (`RecommendFlow`, `CollaborativeRecommendations`):** `etiquetaEstado` («Ya empezado» / «En Quiero leer»), `etiquetaSugerencia` (`Género · X` si cabe en 28 caracteres; si no hay género, `RECO_ANIMO_ETIQUETA[answers.mood]`: «Para pensar», «Para la acción», «Para días bajitos», «Para curiosear», «Algo ligero», «Algo intenso»; sin dato real no se pinta) y `boletoRow` (`Boleto color="papel" perforado="ninguno" angulo={-2}`). Carrusel: `recoReasonCorta` («Según tus géneros favoritos» → «Tus géneros», «Libros mejor valorados del catálogo» → «Mejor valorado»), un solo boleto junto al título cuando todas las razones coinciden (`.sema-r4-boleto-seccion`), por tarjeta solo si cambia y cabe en 14 caracteres, razón completa en `sr-only`; portadas con `boxShadow: 3px 3px 0 ink`.
  - **Botón «+» (`MainApp`):** estados `fabVisible` / `perfilSub`; `fabShown = fabVisible && !(tab === "perfil" && perfilSub === "perfil")`; listener de `scroll` con `requestAnimationFrame` y umbral de 8 px: oculta al bajar, muestra al subir, al tope (`y <= 0`) o al fondo; clase `.sema-r4-fab--oculto` (translateY 28 px + opacity 0, `pointer-events: none`, transición 180 ms salvo `prefers-reduced-motion`), `aria-hidden` + `tabIndex -1` y `blur()` si tenía el foco; `PerfilWrapper` recibe `onSubChange`. `.main-fab-clearance` sigue en 166 px.
  - **Perfil (efectos de Unbounded):** `SubTabBar` en `body` 0.92rem (700 activa / 500 inactiva); `labelStyle` de «Editar perfil» en `body` 13 px 600; «Wrapped {year}» 22 px `nowrap`.
- **Ronda 5 (2026-11-03/04)** — rama `rediseno-ronda5-2026-11-03` (desde `rediseno-ronda4-2026-11-03`), capturas en `capturas/ronda5-2026-11-03/`, referencia de actitud `referencias/chatgpt-ronda5.webp`, script `scripts/captura-ronda5.mjs` (`--mock-feed`, `--racha=a,b`, `--boton=sticker|doble|boleto`, `--hitos`).
  - **Mascota (`PetHub.jsx`):** fondo `palette.bg`, gato grande en sticker lila (`.sema-pet-escena › .sema-pet-sticker / .sema-pet-gato / .sema-pet-piso`, listo para animar), nombre en Unbounded, «Nivel N» como boleto, XP con `degradadoAcento`; Tienda, Mis objetos y Ver galería como tarjetas de papel (solo Tienda con sello «Muy pronto»).
  - **Cartón (`.sema-carton`):** una sola textura multiplicada para boleto, globo, barra, papel arrancado y cartel; opacidad por uso (ver sema-paleta §8).
  - **Feed:** banda de 10 px a todo el ancho con el token `separadorFeed` (`--sema-separador-feed`; `#F1EFF3` / `#141414`), solo fondo.
  - **Inicio:** frase del gato arriba en un globo de papel (`tornBoxClip`, colita al gato), boleto de racha con cinta en el borde superior, «Seguir leyendo» en una línea («84% · Te faltan 27 páginas»), `StickerButton` con `variant` (`sticker` | `doble` aplicada | `boleto`); barra inferior con cuadrito lila (`.sema-nav-sel`, `--nav-sel`).
  - **Libro terminado:** papel arrancado (`tornClipPath` determinista por post), portada girada, reseña como recorte con cinta (NotaMano si ≤ 100 letras; si no, cita) y sello «Ya se fue».
  - **Hitos de racha:** `esHitoRacha`, `RACHA_FRASES`, `nivelLlama` y `SEMA_LLAMA` en `theme.js`; `publishStreakMilestone` (`readingService.js`) publica `type = 'racha'` con contenido JSON `{dias, inicio}` una sola vez por usuario, hito y racha (consulta previa + error `23505` tratado como «ya existe»; sin publicaciones retroactivas); `socialService.js` no reintenta un `23505` de la cola offline. Hitos: 3, 7, 10, 14, 21, 30, 50, 60, 75, 90, 100, 150, 200 y cada 50.
- **Sistema visual (2026-11-02)** — `.claude/skills/sema-paleta/SKILL.md` es la fuente de verdad de los colores; `theme.js` la implementa (commits `ffdf223` y `d4172e8`). Reemplaza la paleta de 5 colores del 2026-10-11 (crema, vino, ámbar, salvia), que se conserva abajo como historia. La tipografía, el espacio y los 8 principios no cambian.
  - **Modo claro (primario):** fondo blanco `#FFFFFF`, tinta `#483A58`, secundario `#5E5768`, acción durazno `#F79F79` (desde el 2026-11-02; antes cereza `#F45B69`), firma lila `#BBADFF`, acento cálido `#F79F79`, superficie suave `#E7D7C1`, complemento frío `#456990`, éxito `#5C6B3D` y error `#B03A2E`.
  - **Modo oscuro:** negro puro `#000000` (nunca café ni azul tinta), tinta `#FFFFFF`, secundario `#E7D7C1`, superficie suave `#483A58`, éxito `#7A9B5C` y error `#E5675B`. Acción durazno aclarada `#F9B294`; firma, cálido y frío no cambian.
  - **Contraste (obligatorio):**
    - `accent` (durazno `#F79F79`) **no va como texto sobre blanco** (2.06:1), ni siquiera grande. Sirve como relleno de botón o píldora; como barra de progreso necesita borde o un elemento al lado. Los links usan `complementoFrio` y los títulos y el logo, `ink`. **El texto sobre `accent` y `accentSoft` es siempre `#483A58` (`onAccent`)**: 5.04:1 en claro y 5.85:1 en oscuro. Blanco sobre durazno está prohibido (2.06 / 1.78). En oscuro `#F9B294` sí sirve como texto sobre negro (11.82:1).
    - Sobre colores oscuros o saturados (`BRAND`, `badge`, `sage`, `danger`, avatares, redes, velos negros) el texto es `onColor` `#FFFFFF`; `#483A58` ahí da 1.12 (vino) o 1.73 (`#B03A2E`).
    - **Firma `#BBADFF`, cálido `#F79F79` y superficie `#E7D7C1` nunca son texto sobre blanco** (1.99, 2.06 y 1.41:1). Encima de firma y cálido el texto es siempre `onFirma` (`#483A58`), también en oscuro.
    - `#483A58` nunca es texto sobre negro (2.02:1). En oscuro, `complementoFrio` solo va en elementos grandes (3.68:1).
  - **Tabla de tokens (`palette`):**

    | Token | Claro | Oscuro | Uso |
    |---|---|---|---|
    | `bg` | `#FFFFFF` | `#000000` | Fondo de la app |
    | `bgSoft` | `#FFFFFF` | `#000000` | Secciones e inputs apagados: se separan con espacio, no con fondo |
    | `bgCard` | `#FFFFFF` | `#000000` | Tarjetas y sheets; si deben separarse, `superficieSuave` |
    | `ink` | `#483A58` | `#FFFFFF` | Texto principal, íconos, logo |
    | `inkSoft` | `#5E5768` | `#E7D7C1` | Texto secundario |
    | `inkFaint` | `#5E5768` | `#E7D7C1` | Captions, labels, placeholders |
    | `accent` | `#F79F79` | `#F9B294` | Acción principal (durazno): botón «Leer ahora», progreso, píldora activa. No es texto sobre blanco (2.06:1) |
    | `accentSoft` | `#FBD4C3` | `#FBD4C3` | Estado «Leyendo», hover de acción. Solo fondo, con `onAccent` encima |
    | `amber` | `#F79F79` | `#F79F79` | Gemas, estrellas, celebración (= acento cálido) |
    | `amberRich` | `#F79F79` | `#F79F79` | Estrellas llenas |
    | `amberInk` | `#483A58` | `#F79F79` | Texto que antes iba en ámbar |
    | `mauve` | `#BBADFF` | `#BBADFF` | Sugerencias IA (= firma); no es texto sobre blanco |
    | `slate` | `#5E5768` | `#E7D7C1` | Amigo en comparativas, «Por leer» |
    | `sage` | `#5C6B3D` | `#7A9B5C` | «Leídos», éxito suave |
    | `border` | `#E7D7C1` | `#483A58` | Bordes de inputs y tarjetas |
    | `borderSoft` | `#E7D7C1` | `#483A58` | Divisores |
    | `onAccent` | `#483A58` | `#483A58` | Texto e íconos sobre `accent` y `accentSoft`, en ambos modos |
    | **`onColor`** (nuevo 2026-11-02) | `#FFFFFF` | `#FFFFFF` | Texto e íconos sobre colores oscuros o saturados (`BRAND`, `badge`, `sage`, `danger`, avatares, redes, velos) |
    | `onDark` | `#FFFFFF` | `#FFFFFF` | Texto sobre overlays negros |
    | `onDarkSoft` / `onDarkFaint` / `onDarkMuted` | `#E7D7C1` | `#E7D7C1` | Texto secundario sobre overlays negros |
    | `danger` | `#B03A2E` | `#E5675B` | Error, acción destructiva |
    | `dangerSoft` / `dangerBorder` / `dangerInk` | `#FBEEEA` / `#E3A79F` / `#8E2A20` | `#3A1F1C` / `#7A3A34` / `#F2A39B` | Estados del sistema (sin cambio) |
    | `success` | `#5C6B3D` | `#7A9B5C` | Éxito, «Leído» |
    | `warnBg` / `warnBorder` / `warnInk` | `#F6EAD0` / `#E0C48F` / `#8A5A1A` | `#3A301A` / `#6B5A2A` / `#E8C97A` | Banner offline y avisos (sin cambio) |
    | `like` | `#B03A2E` | `#E5675B` | Corazón (= danger) |
    | `badge` | `#B03A2E` | `#B03A2E` | Contador de no leídos. En oscuro era `#E5675B` y con blanco daba 3.27; desde el 2026-11-02 es `#B03A2E` (6.02) |
    | `unreadBg` | `#E7D7C1` | `#483A58` | Notificación no leída (= superficie suave) |
    | `session` | `#5C6B3D` | `#7A9B5C` | Post de sesión de lectura |
    | `sessionInk` | `#5C6B3D` | `#7A9B5C` | Texto del post de sesión |
    | `freeze` | `#456990` | `#E7D7C1` | Protector de racha |
    | **`firma`** (nuevo) | `#BBADFF` | `#BBADFF` | Racha, stickers, resaltados, borde rasgado de la barra inferior |
    | **`onFirma`** (nuevo) | `#483A58` | `#483A58` | Texto sobre `firma` y `acentoCalido`, en ambos modos |
    | **`acentoCalido`** (nuevo) | `#F79F79` | `#F79F79` | Celebraciones, gemas, segundo sticker |
    | **`superficieSuave`** (nuevo) | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del fondo; texto encima: `ink` |
    | **`complementoFrio`** (nuevo) | `#456990` | `#456990` | Enlaces, estados informativos, íconos secundarios (en oscuro solo grande) |

  - **Variables CSS:** `applyPaletteCssVars` expone los tokens nuevos sin cambios en la función (`--sema-firma`, `--sema-on-firma`, `--sema-acento-calido`, `--sema-superficie-suave`, `--sema-complemento-frio`). El skeleton usa `--sema-skel-base` = `border` y `--sema-skel-shine` = `bg` en los dos modos (claro `#E7D7C1` → `#FFFFFF`; oscuro `#483A58` → `#000000`).
  - **Fuera de `palette`:** `BRAND` y los datos de arte siguen con la paleta anterior hasta que cada `/redisena` toque su pantalla (lista en §XII #22).
  - **Inicio (2026-11-02, `/redisena home`):** primera pantalla rediseñada con la paleta 2026-11.
    - **Header (`AppHeader`, compartido):** logo «sema» en `ink` en los dos modos; gemas; campana de 44×44 con badge `onColor` de 12 px; avatar de 36 px (inicial sobre `superficieSuave`, botón de 44 px que abre Perfil). Recibe `userName` desde `MainApp`.
    - **Saludo:** Bricolage 32 px/800, nombre en su propia línea. Si `user.name` llega como correo o handle se corta en `@ . +`; sin nombre queda solo «Buenas tardes.».
    - **Racha:** sticker `firma` con texto `onFirma`, número de 48 px, giro de -1.5°, canto (borde 3 px `bg` + anillo 1.5 px `ink`) y textura de papel. «Récord: N días» o, en pausa, «En pausa, no rota. Cualquier día sirve para volver.». La pausa se calcula en la vista con `daysBetweenLocalDates` sobre la fila de racha que ya llega (mismo criterio que `checkStreakOnLoad`); `RachaModal` recibe `paused`.
    - **Mascota:** 48 px, pegada al sticker, habla en Instrument Serif cursiva con la voz del gato; halo `firma` de 1 px solo en oscuro.
    - **Acción principal:** «Leer ahora» en `accent` con `onAccent`, alto mínimo 56 px.
    - **Libro actual:** portada de 60×90 (`BookCoverImage` si hay URL; si no, el título como lomo en Bricolage 12 px sobre `superficieSuave`, cortado por palabras). `ProgressBarBook`: sin total, número grande; con total, barra de 10 px con borde `ink` y porcentaje en `ink` de 13 px.
    - **Barra inferior (`BottomNav`, compartida):** borde superior rasgado lila, etiquetas de 12 px, píldora activa `accent` + `onAccent`, círculo central plano `firma` (sin degradado ni sombra) con `aria-label="Mascota"`, pestaña «Inicio».
    - **FAB «+» (compartido):** fondo `bg`, borde 2 px `ink`, ícono `ink`, sin sombra.
    - **Clases CSS nuevas (`src/index.css`):**
      - `.sema-nav-rasgado::before`: tira de 13 px en `var(--sema-firma)` con canto irregular por `clip-path`, 10 px por encima de la barra.
      - `.sema-papel`: textura de papel arrugado con SVG inline (`feTurbulence` + `feDiffuseLighting`, sin colores propios) en `::after`, `multiply` al 0.55. Solo en stickers y tarjetas, nunca de fondo.
      - `.sema-sticker`: `rotate(-1.5deg)`.
      - `.main-fab-clearance` sube de 156 a 166 px por el borde rasgado.
      - `:focus-visible` usa `var(--sema-ink)` (antes `accent`, 2.06 sobre blanco).
  - **Tanda de rediseño (2026-11-02, rama `rediseno-tanda-2026-11-02`):** Descubrir, Para ti, Social y Perfil, cada una con dos rondas de revisores (crítico, lectora, accesibilidad, copy), corrección puntual y QA. Galería antes/después de las cinco pantallas en claro y oscuro: `capturas/tanda-2026-11-02/galeria.png` (fuera de git).
  - **Componentes y clases compartidos que cambiaron en la tanda:**
    - **`BookCoverImage` (`src/components/BookCoverImage.jsx`):** reescrito. Sin foto, mientras la foto carga o si falla, dibuja la **portada genérica**: campo neutro, título en Bricolage medido contra la portada (`containerType: size`, `clamp` con `cqw`/`cqh`) y un boleto troquelado con muescas (máscara `TICKET_MASK`), autor, perforación y «Nº XXXX», con un giro leve. Ya no hay degradado oscuro ni emoji por género (la prop `genres` se conserva en la API). En modo **`compact`** (portadas chicas del feed, Para ti, la lista de un género y el respaldo de Inicio) muestra un **monograma**: la inicial de la primera palabra con peso (salta artículos) en Bricolage 800, con una raya debajo. Props nuevas: `onStatus` (avisa si la imagen cargó, falló o tardó) y `skeleton`. `alt` genérico «Título, de Autor».
    - **`SEMA_COVER_COMBOS` (`theme.js`):** 6 combinaciones fijas campo/boleto, iguales en claro y oscuro. Campo solo `#E7D7C1`, `#483A58` o `#456990` (nunca un vivo); boleto lila, superficie o tinta. Sin durazno, que queda para la acción. Contrastes: `#483A58` sobre superficie 7.36 y sobre lila 5.21; blanco sobre ciruela 10.39 y sobre acero 5.71.
    - **`AVATAR_COLORS` (`theme.js`):** 8 entradas que alternan ciruela `#483A58`, acero `#456990` y éxito `#5C6B3D`, todas con la inicial en `onColor` (10.39 / 5.71 / 5.79). Se quitó el rojo de error `#B03A2E` porque junto a la basura y el corazón se leía como aviso. **`avatarEdge()`** (App.jsx, antes de `Avatar`) agrega un filo de 1.5 px `inkSoft` solo en oscuro (la ciruela sobre negro da 2.02); se usa en los 7 sitios que pintan `getAvatarColor` (Avatar del feed, perfil propio, perfil de amigo, notificaciones, Leyendo ahora, amigos y búsqueda de usuarios).
    - **`shortFirstName` / `displayAuthorName` (App.jsx):** el primero corta en `@ . +` y capitaliza (saludos, «Leon terminó…»); el segundo solo recorta si el nombre parece correo o handle, y deja tal cual los nombres reales.
    - **`SubTabBar` (Explorar y Perfil):** `role="tablist"`/`tab`, `aria-selected`, 44 px de alto, línea activa `ink`, padding lateral 0.7rem para que quepan las cuatro pestañas de Perfil.
    - **`BottomNav` y `.sema-nav-rasgado`:** la barra es `superficieSuave` con textura de papel al 45 % (`::after`, `multiply`); la tira lila tiene papel más claro; un filo de 1.5 px `ink` sigue el canto rasgado (blanco en oscuro). La píldora activa lleva contorno `ink` de 1.5 px en claro y `aria-current="page"`.
    - **`.sema-composer-fab`:** el composer y «Tengo 5 minutos» de Social dejan libre la columna del «+» flotante (`calc(100% - 68px)` en móvil).
    - **Foco sobre color (`index.css`):** `.sema-focus-onfirma`, `.sema-focus-oncolor` y `.sema-focus-onaccent` cambian el color y el desfase del anillo de `:focus-visible` según el fondo (lila, ciruela o degradado); `.sema-focus-wrapped` pone el foco `ink` por fuera de la tarjeta del Wrapped. `.sema-compose:focus-within` marca el composer con borde `ink`.
    - **`.reco-typing-dot` y `.reco-extra`:** puntos de «escribiendo…» de Para ti (sin animación con `prefers-reduced-motion`) y caja del paso 5 (placeholder `inkFaint`, foco con borde `ink` + anillo de 1 px).
    - **`AchievementGrid` y `AchievementDetailModal`** (compartidos con el perfil de amigo): prop `onlyUnlocked` para la vista corta; mosaicos con `aria-label`; texto Figtree ≥ 13 px.
    - **`ReadingStatusModal`:** sin los colores de estado viejos (`STATUS_COLORS` sigue igual para el resto); fila activa con borde 2 px `ink` y palomita `ink`, filas de ≥ 56 px, `aria-pressed`, velo negro al 60 %, «Guardar» en `accent`.
  - **Descubrir (2026-11-02, `/redisena explorar`, `BookTinder.jsx`):**
    - **Tarjeta:** sin sombra, contorno 1.5 px `inkSoft`; la de atrás asoma 20 px. Con foto, el bloque de texto lleva su propio velo negro (≥ 86 %) que crece con el contenido; la foto tiene `alt=""` porque el título ya está escrito. Sin foto, o mientras carga o falla, la portada genérica de `BookCoverImage` con géneros y sinopsis al pie. `MetaLine` en una línea con elipsis y estrella SVG.
    - **Alto:** `CARD_HEIGHT = clamp(260px, calc(100dvh - 392px), 620px)`. Los botones quedan ~39 px por encima del borde rasgado de la barra en 390×844 y en 375×667. El panel de info tiene scroll propio y `FitFooter` corta la sinopsis por líneas completas (2 líneas si el alto es menor a 760 px; sin sinopsis en la genérica por debajo de 700 px).
    - **Acciones:** X silenciosa, info y corazón durazno (la única acción rellena), con 1.5rem entre botones. Sellos sticker al deslizar: «GUARDAR» en lila con `onFirma` (5.21) y «PASO» en ciruela con blanco (10.39).
    - **Contador:** «Quedan N guardados hoy» / «Queda 1 guardado hoy» / «Ya no quedan guardados hoy» y «Libro 1 de 20»; barra de 10 px que muestra los guardados que quedan.
    - **Vacíos y errores:** el gato de 80 px sobre un disco lila («Sin géneros favoritos no se arma la pila.»; «Al volver a entrar se arma otra. Empezar de nuevo también es un plan.»); errores en voz SEMA con el detalle técnico solo en `console.error`. Aviso con `role="status"` y `aria-live`, sin `nowrap`. `LimitModal` con `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape y copy nuevo.
  - **Para ti (2026-11-02, `/redisena explorar`, `RecommendFlow` en App.jsx):**
    - **Conversación con el gato:** globos del gato en `superficieSuave` + `ink` con colita recta (una esquina sin radio) y el gato en un disco `firma` solo en el último globo seguido; respuestas del usuario en `firma` + `onFirma`, tocables para cambiarlas (`aria-label` «Tú: X. Cambiar respuesta»; lápiz de 14 px solo en la última). Lector de pantalla: «El gato:» / «Tú:»; el hilo es `role="log"` con `aria-live="polite"`.
    - **Preguntas:** `RECO_QUIZ_STEPS` con `{ value, label }`: `value` es el texto anterior y es lo que va a `getMoodRecommendations`; `label` es la etiqueta neutra en voz de usuario. Opciones como burbujas con borde `inkSoft` y 44 px. «Pregunta N de 5» bajo la pregunta (no es sticky porque la cabecera ya lo es). Paso 5 con caja de texto y contador sin «opcional»; el foco va al globo para no abrir el teclado solo. «Ver ideas» es la única acción durazno.
    - **Resultados:** lista sin tarjetas (portada compacta, título, autor y razón; sin sinopsis ni estado); «Quiero leer» como botón de texto de 44 px («En Quiero leer» en éxito); «Otras ideas» con `RefreshCw`. Al llegar, el hilo se colapsa en una línea con un solo botón «Ver/Ocultar la plática» (`aria-expanded`, `aria-controls`) y el foco pasa a la región de resultados. Error del gato con `role="alert"` («Se me trabó algo. Cosas del absurdo. Lo intentamos otra vez.»). Padding inferior de 6.5rem por el «+». `CollaborativeRecommendations` usa «Quiero leer» con `Bookmark`.
  - **Social (2026-11-02, `/redisena social`, `FeedView` y su familia en App.jsx):**
    - **Orden:** sin título «Social» («Amigos» va junto al saludo); saludo → Leyendo ahora (punto lila) → racha → «Tengo 5 minutos» → composer → feed. El cuento del día aparece después de las dos primeras publicaciones.
    - **Racha (`DailyReadingBanner`):** sticker lila compacto con papel, número de 30 px y la meta del día en una barra durazno con borde `ink` mientras avanza y en éxito al llegar a 20 («5 de 20 páginas hoy» / «99 páginas hoy · meta del día cumplida»; vacía: «Una página ya cuenta. La meta del día es 20.»). El confeti sale solo cuando la meta pasa a cumplida después de cargar, no al abrir la pantalla. Ya no usa `STREAK_PHASES`.
    - **Mapa de color por tipo de publicación** (también en `sema-paleta` §6). Las publicaciones con color van en tarjeta neutra (`bg` + borde `border`, sin sombras) y el color vive solo en su zona; las que no tienen color no llevan tarjeta y se separan con un filete.

      | Tipo | Zona de color | Fondo | Texto encima | Contraste (claro / oscuro) |
      |---|---|---|---|---|
      | Leyó (`reading_session` con libro) | Franja superior «Leyó · N páginas · M min» (sin «hoy») | `firma` `#BBADFF` | `onFirma` `#483A58`, 14 px negritas | 5.21 / 5.21 |
      | Sesión sin libro | Sin tarjeta; las páginas en grande | `bg` | `ink` 24 px e `inkSoft` | 10.39 / 21.00 |
      | Empezó a leer (`book_update` started) | Franja superior «Empezó a leer»; en oscuro sin relleno y con filete | Claro `superficieSuave` `#E7D7C1`; oscuro `bg` | `ink` | 7.36 / 21.00 |
      | Libro terminado (`book_update` finished) | Zona central con la portada grande al frente (real o genérica compacta) | `SEMA_GRADIENTS.acento` (cereza → durazno) | Título `onAccent` 22 px 800 (texto grande); sticker «Libro terminado», autor y reseña sobre `bg` | Título 3.24 – 5.04; resto 10.39 / 21.00 |
      | Reseña dentro de «terminado» | Solo el filete izquierdo de 3 px | `complementoFrio` `#456990` (filete) | «Reseña» + estrellas Lucide y el texto en `ink` sobre `bg` | Filete 5.71 / 3.68 (objeto ≥ 3:1); texto 10.39 / 21.00 |
      | Reseña suelta | Franja superior «Reseña» + estrellas | `complementoFrio` | `onColor` `#FFFFFF` | 5.71 / 5.71 |
      | Frase (`quote`) | Toda la tarjeta salvo el pie | `#483A58` (`ink` en claro / `superficieSuave` en oscuro) | `onColor` en Instrument Serif; secundario `onDarkSoft` `#E7D7C1`; ánimo como sticker `firma` + `onFirma` | 10.39 · 7.36 · 5.21 |
      | Texto | Sin tarjeta | `bg` | `ink` | 10.39 / 21.00 |
      | Logro | Sticker rectangular con papel, canto `bg`, filo `ink`, giro y el nombre del logro (sin descripción) | `firma` | Ícono y nombre en `onFirma` 20 px 800 | 5.21 |

    - **Publicaciones:** portadas con `BookCoverImage` compacta (antes `BookCoverPlaceholder`); «Borrar publicación» con confirmación en `badge`; quitar imagen y lightbox de 44×44 con `aria-label`; «Leer más» de la frase con `aria-expanded`. Nombre propio sin correo (`displayAuthorName`).
    - **Modales:** `PostDraftModal` con «terminó»/«empezó» (gramática del borrador), «Publicar» en `accent` + `onAccent` de 44 px y error sin `err.message`; `ReadingLogModal` y el modal de congelar racha con copy nuevo.
  - **Perfil (2026-11-02, `/redisena perfil`, «Mi perfil» en App.jsx):**
    - **Portada y avatar:** con foto, portada de 180 px con el avatar encima del borde y «Cambiar portada» sobre la foto. Sin foto, no se dibuja franja ni filete: el avatar va justo bajo las pestañas y «Poner portada» es un botón silencioso junto a «Invita a un amigo». Avatar como botón «Cambiar foto de perfil» con canto `bg` + línea `ink`; nombre con `displayAuthorName` en 26 px 800.
    - **Racha:** sticker lila con papel como en Inicio, cifra de 48 px; «Esto ya es récord» / «Récord: N días» + «N páginas en total»; sin racha, «Con 5 minutos arranca».
    - **Calendario de lectura (`ReadingHeatmap`, `getCalLevel`/`getCalScale`; compartido con el perfil de amigo):** 4 niveles solo con tokens. Todo día con lectura lleva filo de 1.5 px `ink` (10.39 / 21.00), así la cuadrícula no depende del relleno; el nivel 4 suma un canto interior `bg`. Días sin lectura sin relleno con el número en `inkSoft`; días por venir al 85 %. Leyenda «Páginas al día: 1–5 · 6–15 · 16–30 · 31+»; cada día con lectura es `role="img"` con `aria-label` («2 de noviembre: 99 páginas»); flechas de mes de 44 px.

      | Nivel (páginas) | Claro: fondo → texto | Contraste | Oscuro: fondo → texto | Contraste |
      |---|---|---|---|---|
      | 1 (1–5) | `superficieSuave` `#E7D7C1` → `ink` `#483A58` | 7.36 | `superficieSuave` `#483A58` → `onColor` `#FFFFFF` (se lee por el filo blanco) | 10.39 |
      | 2 (6–15) | `firma` `#BBADFF` → `onFirma` `#483A58` | 5.21 | `complementoFrio` `#456990` → `onColor` | 5.71 |
      | 3 (16–30) | `complementoFrio` `#456990` → `onColor` | 5.71 | `firma` `#BBADFF` → `onFirma` | 5.21 |
      | 4 (31+) | `ink` `#483A58` → `onColor` + canto `bg` | 10.39 | `ink` `#FFFFFF` → `onFirma` `#483A58` + canto `bg` | 10.39 |

    - **Contadores y secciones:** 4 columnas (Leídos, Leyendo, Por leer, En total) con cifras de 34 px y filetes, sin cajas; «Días de lectura»; promedio sin caja ámbar; géneros como chips `superficieSuave` + `ink` de 44 px y lista desplegada sin caja, con `BookCoverImage` compacta; «Mejor calificados» con filetes. Wrapped en `SEMA_GRADIENTS.acento` sin sombra ni `Sparkles`, foco con `.sema-focus-wrapped`.
    - **Logros:** vista corta (`AchievementGrid onlyUnlocked`) solo con los desbloqueados, como stickers lila con papel (vacío: «Todavía ninguno. El primero sale leyendo.»). Vista completa en 3 columnas: desbloqueado `firma`/`onFirma` con canto `bg` + filo `ink`; bloqueado sin opacidad ni contorno, candado e ícono `inkSoft`; «2 de 27 logros». `AchievementDetailModal` con «Cómo se desbloquea» y «Cerrar» de 44 px.
    - **Ajustes:** Privacidad y Apariencia como `role="radiogroup"`/`radio` con `aria-checked`; activo en `superficieSuave` + borde `ink` (ya no hay durazno como texto en «Perfil público» ni «Claro»). «Nueva» de `ListsSection` en `ink` de 44 px. Aviso sin conexión en `inkSoft` 13 px con `role="status"` («Sin conexión. Se ve lo último guardado.»).
- **Sistema visual (2026-10-11, paleta reemplazada el 2026-11-02)** — `design-system/sema/MASTER.md` es la guía; `theme.js` la implementa.
  - **Paleta de 5 colores:** Crema `#F4EDE0` (fondo; oscuro `#1A1614`), Tinta `#2A1F1A` (texto; oscuro `#F5EDE0`), Vino `#7A2E2E` (acción y marca; oscuro `#C84F4F`), Ámbar `#C8924A` (celebración, gemas; oscuro `#D4A574`; texto `amberInk` `#8A5A1A`) y Salvia `#5C6B3D` (éxito, «Leído», progreso completo; oscuro `#7A9B5C`). Superficies y bordes (`bgSoft`, `bgCard`, `border*`) son tintes de la crema; `inkSoft` `#5C4A3F` e `inkFaint` `#6E6054` son tintes de la tinta. Fuera de los 5 queda solo `danger` `#B03A2E` (errores/destructivo/corazón) más sus fondos suaves y los `warn*`.
  - **Alias compatibles:** `accentSoft` (vino claro `#96403B`), `mauve` = `accentSoft`, `slate` y `freeze` = `inkSoft`, `amberRich` = `amber`, `session`/`success` = salvia, `like`/`badge` = `danger`. Los nombres de token no cambian, así que ningún componente (ni el Trueque) tuvo que tocarse.
  - **Tipografía:** Bricolage Grotesque (títulos; `display`, `ts.h1/h2`; no tiene cursiva), Figtree (interfaz; `body`, `ts.h3/body15/caption/label`) e Instrument Serif (citas; `quote`, `ts.quote`, citas del feed, tarjetas compartibles y lector de cuentos). En App.jsx `quote` se importa como `quoteFont` porque `quote` es nombre de variable local. `FONT_LINK` carga las tres fuentes desde Google Fonts.
  - **Espacio:** `sp` (xs 0.5 · sm 0.75 · md 1 · lg 1.5 · xl 2 · xxl 3 rem) para separar con aire en vez de con cajas.
  - **Aplicado a:** `HomeView`, `AppHeader`, `BookCard`/`LibraryView`, `StatusBadge`, `ProgressBarBook`, tarjetas y detalle de cita, lector de cuentos. Falta revisar pantalla por pantalla Perfil, Social, Chat, Explorar y modales. Los textos de tamaño muy chico que estaban en EB Garamond (8–11 px) pueden verse más anchos en Figtree.
- **Sistema de color (2026-09-22)** — `theme.js` es la única fuente de colores y documenta cada token en su encabezado:
  - `palette` (cambia con el tema): superficies `bg/bgSoft/bgCard`, texto `ink/inkSoft/inkFaint`, `accent/accentSoft`, `amber/amberRich/amberInk`, `mauve/slate/sage`, `border/borderSoft` y los **tokens semánticos nuevos**: `onAccent` (texto sobre color), `onDark/onDarkSoft/onDarkFaint/onDarkMuted` (texto sobre overlays casi negros), `danger/dangerSoft/dangerBorder/dangerInk`, `success`, `warnBg/warnBorder/warnInk`, `like`, `badge`, `unreadBg`, `session/sessionInk`, `freeze`.
  - `BRAND` (fijo en ambos temas): `wine`, `wineDeep`, `amber`, `amberLight`, `amberGlow`, `cream`, `ink`, `gold*`, degradados `gradient`/`gradientFab`/`gradientWrappedCta`/`gradientShareCard` y `confetti`. Se usa para identidad, confetti y tarjetas que se exportan como imagen.
  - Datos de arte con nombre: `COVER_PALETTES`, `HEATMAP_COLORS`, `STREAK_PHASES`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS`, `QUOTE_POSTER_GRADIENTS`, `STATUS_COLORS`, `AVATAR_COLORS`, `SOCIAL_COLORS`, `genrePillStyle`, `genreColor`.
  - `ts.caption`/`ts.label` leen `palette.inkFaint` con un getter (antes tenían el hex claro fijo y no seguían al modo oscuro).
  - Quedan hex fuera de `theme.js` solo en `BookCoverImage.jsx` y `pets/PetScene.jsx` (ilustraciones), `main.jsx` (pantallas de error independientes del tema) y en algunos componentes del MVP del Trueque (`ui.jsx`, `MatchCard`, `ExchangeChat`, `ZonesEditor`). Los componentes del Trueque v2 (2026-10-03: `MyPlaces`, `TruequeRulesModal`, `LocationStep`, `ReportModal`) y las líneas tocadas de `TruequeMain` usan solo tokens (`BRAND.gradientFab`, `palette.onAccent`…); el mapa pinta pines y círculos con `palette.accent`/`palette.amber`.
  - **Variables CSS (2026-10-10)**: `applyPaletteCssVars(isDark)` (en `theme.js`, la llama `MainApp` justo después del `Object.assign` del tema y una vez al cargar el módulo en modo claro) copia cada token de `palette` a `:root` como `--sema-<token-en-kebab>` (`bgSoft` → `--sema-bg-soft`) y añade `--sema-skel-base`/`--sema-skel-shine` (desde 2026-11-02: `border` y `bg`; antes `border`/`borderSoft`, invertidos en oscuro) y `--sema-hover-brightness`/`--sema-press-brightness`. Solo escribe en el DOM cuando cambia el tema. Así `index.css` usa colores del tema sin hex propios.
  - **z-index**: todavía no hay escala; el mapa real (de 10 a 99999) y los conflictos conocidos están en `AUDIT_SPRINT_REPORT.md` §C.
- **Estados de interfaz (2026-10-10)**: vacíos con `EmptyState`, cargas con `Skeleton*` y hover/press/focus con clases CSS; detalle, textos y reglas en §VII «Estados de interfaz» y §X.20.
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
| `ANTHROPIC_API_KEY` | solo server (`api/anthropic.js`, `server.js`) | Proxy Anthropic. Desde la ronda 3 (2026-11-02) `server.js` la lee de `.env` y después de `.env.local` (manda) y avisa al arrancar si falta |
| `GOOGLE_BOOKS_API_KEY` | solo server (`api/books.js`) | Opcional; sube la cuota de Google Books |
| `ANTHROPIC_MODEL` | solo server (`api/anthropic.js`, `server.js`) | Modelo de Claude que usa el proxy. Opcional; por defecto `claude-sonnet-4-6`. Cambiarlo no requiere tocar código (sí un redeploy). El cliente no puede elegirlo; solo quien manda `x-admin-key` puede pasar `model` en el body |
| `ADMIN_KEY` | solo server | Bypass del proxy Anthropic vía header `x-admin-key` (sin JWT ni rate limit) |
| `SUPABASE_SERVICE_ROLE_KEY` | SOLO GitHub Actions (secret) | Job de entrenamiento; jamás en Vercel ni en el cliente |
| `SUPABASE_SECRET_KEY` | solo `scripts/generate-500-books.js` | Escritura del catálogo curado |
| `PORT` | `server.js` | Puerto del proxy local (default 3001) |
| `SEMA_API_TARGET` | `vite.config.js` (solo desarrollo) | Destino del proxy `/api` de Vite. Por defecto `http://localhost:3001` (server.js); con `https://folio-final.vercel.app` se prueba «Para ti», `/api/books` y `/api/recommendations` contra el despliegue sin clave local (ronda 3, 2026-11-02) |
| `VITE_POSTHOG_KEY` | cliente (opcional) | Llave pública del proyecto PostHog (`phc_…`). Sin ella la analítica queda apagada (no-op). Es de build: tras cambiarla en Vercel hay que redesplegar |
| `VITE_POSTHOG_HOST` | cliente (opcional) | Host de ingesta de PostHog. El proyecto es de la región US: `https://us.i.posthog.com` (valor por defecto en `src/analytics.js`) |

`.env.example` está sincronizado con estas variables (con un comentario por cada una). Ojo: el job de Python también acepta `SUPABASE_URL`/`SUPABASE_ANON_KEY` como alternativa a las `VITE_*`.

### Analítica de producto (PostHog, 2026-11-06)
- **Archivo:** `src/analytics.js` con `init`, `identify`, `reset` y `track`. Ningún componente importa `posthog-js` directo. `main.jsx` llama `init()` antes de montar React.
- **Sin llave:** si falta `VITE_POSTHOG_KEY`, las cuatro funciones no hacen nada.
- **Configuración:** `api_host` = `VITE_POSTHOG_HOST` (por defecto `https://us.i.posthog.com`), `autocapture: true`, `capture_pageview: true`, `person_profiles: "identified_only"`, grabación de sesiones con `session_recording.maskAllInputs: true` (todo campo de entrada enmascarado). La grabación además debe estar activada en el proyecto de PostHog (Settings → Session replay).
- **Identidad:** `identify(user.id)` en `handleLogin` (login y registro) y al restaurar la sesión al abrir la app; `resetAnalytics()` en `handleLogout` antes de `logout()`. Nunca correo ni nombre como id. `track` borra de las propiedades `email`, `correo`, `nombre`, `name`, `username`, `avatar_url` y `password` aunque se pasen por error.
- **Almacenamiento:** PostHog usa su propia clave `ph_<llave>_posthog` (localStorage y cookie). No toca claves `folio_*` ni el dominio.
- **Autocapture:** registra clics y el texto visible del elemento tocado (por ejemplo, títulos de libros). Los campos de entrada no se registran.

| Evento | Dónde se dispara | Propiedades |
|---|---|---|
| `signup_completed` | `App.jsx` `handleLogin(u, isNew = true)` | `method` |
| `book_added` | `booksService.insertBook` (todas las altas, incluidas Bib. UAM y recomendaciones) | `book_id`, `title`, `genre` |
| `pages_logged` | `readingService.logReadingSession` (reading_log insertado, con páginas) | `book_id`, `pages_read` |
| `book_finished` | `App.jsx`, al guardar un libro que pasa a «Leído» (`isFinishing`) | `book_id`, `title`, `genre` |
| `recommendation_shown` | `CollaborativeRecommendations` (Descubrir) al cargar la lista | `origin` (`para_ti` o `mejores_valorados`), `count` |
| `recommendation_clicked` | Descubrir: «Agregar» en colaborativas; tarjeta del quiz de ánimo | `origin` (`para_ti`, `mejores_valorados` o `descubrir_quiz`), `book_id` (quiz), `title`, `genre` |
| `mood_quiz_completed` | `RecommendFlow.fetchRecs` (resultados recibidos) | `answers` (respuestas de opción fija del quiz) |
| `streak_registered` | `readingService`, tras `update_streak()` sin error | `current_streak` |
| `phrase_saved` | `quotesService.insertQuote` | `book_id`, `has_mood` |
| `post_created` | `socialService.createFeedPost` | `type` |
| `pet_opened` | `App.jsx` `abrirMascota` (cabecera, Inicio y barra inferior) | — |
| `collage_saved` | `CollageEditor` `guardar()` (local o servidor) | `formato` |

- **No instrumentado (todavía):** origen «Bib. UAM» como recomendación (la vista UAM es un catálogo, no muestra recomendaciones; sus altas sí cuentan como `book_added`), `recommendation_shown` de los resultados del quiz de ánimo, y el título del libro en `pages_logged` (el servicio solo recibe el id).
- **Desarrollo:** con la llave en `.env.local`, los eventos de `npm run dev` llegan al mismo proyecto que producción.

### Dependencias (package.json)
- **runtime**: `react`/`react-dom` 18, `@supabase/supabase-js` ^2.105, `lucide-react`, `canvas-confetti`, `howler`, `html2canvas`, `leaflet` 1.9 (mapa del Trueque v2; se usa directo, sin react-leaflet, y va en un chunk aparte que solo se descarga al abrir "Mis lugares"); `express`, `dotenv` y `concurrently` (solo para `npm run dev`, están en `dependencies` pero no van al bundle).
- **dev**: `vite` 5, `@vitejs/plugin-react`, `vite-plugin-pwa`, `tailwindcss` 3 + `postcss` + `autoprefixer`, `@resvg/resvg-js` (`generate-icons.mjs`), `pg` (sin uso detectado en el repo).
- **Python** (`requirements.txt`, solo el job de GitHub Actions): `supabase`, `pandas`, `numpy`, `scipy`, `scikit-surprise`, `fuzzywuzzy`, `python-Levenshtein`.
- No hay dependencia de email transaccional (Resend/SMTP/etc.): el código no envía emails propios, solo los de Supabase Auth.
- **Analítica (2026-11-06):** `posthog-js` 1.x, solo a través de `src/analytics.js`.

### Sistema de agentes de diseño (2026-11-02)

Sistema de skills, agentes y comandos de Claude Code para rediseñar SEMA **una pantalla a la vez**.
- **Reglas comunes:** todos los agentes leen las mismas skills antes de actuar, así nadie inventa colores, tono ni reglas.
- **Proceso:** nada se fusiona a `main` sin aprobación de León con captura, y ningún comando despliega.
- **Dónde viven:** `.claude/`, la carpeta que Claude Code lee para el proyecto. Desde el 2026-11-02 `.claude/` entra a git: se quitó la regla que la ignoraba, y las 60 carpetas de skills de terceros se ignoran una por una en `.gitignore` (quedan en disco). Ignorados: `.claude/settings.local.json` y esas 60 carpetas. Ver §XII #21.

**Skills** (`.claude/skills/<nombre>/SKILL.md`):

| Skill | Qué contiene |
|---|---|
| `sema-identidad` | Base neutra: blanco `#FFFFFF`; modo oscuro en negro puro `#000000`. Los colores vivos solo como acento. Interfaz limpia, con la actitud en los detalles y los momentos. Referencias (zine, stickers, boletos, Soko). Aprobado: borde rasgado lila de la barra inferior, stickers y boletos, gato pequeño en Inicio, papel arrugado sutil en CSS/SVG. Rechazado: pasteles, degradados, app de bienestar, look de IA, biblioteca seria. Tipografía, sin textos de 8–11 px. Los 8 principios de `MASTER.md` copiados tal cual, con la equivalencia vino → acción principal y salvia → éxito. Regla de una pantalla a la vez |
| `sema-paleta` | Valores exactos en claro y oscuro: tinta `#483A58`, secundario `#5E5768`, acción durazno `#F79F79` (`#F9B294` en oscuro, texto encima `#483A58`; hasta el 2026-11-02 era cereza `#F45B69`, que queda solo como extremo de `degradadoAcento`), firma `#BBADFF`, acento cálido `#F79F79`, superficie suave `#E7D7C1` (`#483A58` en oscuro), complemento frío `#456990`, éxito (`success` actual) y error `#B03A2E` (`#E5675B` en oscuro). Reglas y tabla de contrastes medidos, los dos degradados permitidos y el mapa de color por tipo de publicación del feed. Tabla «token → claro → oscuro → uso» para `theme.js`: conserva todos los tokens y agrega `firma`, `onFirma`, `acentoCalido`, `superficieSuave`, `complementoFrio` y `onColor` |
| `sema-voz` | Compa de 23 años, regla cero culpa. Mascotas con personalidad: gato existencialista, cuervo de terror cósmico, zorro detective, mapache de novela y fantasía. Formato corto. 10 textos buenos y 5 malos de referencia |
| `sema-capturas` | Rutina única: `npm run dev`, login con `SEMA_TEST_EMAIL`/`SEMA_TEST_PASSWORD` (`.env.local`), Playwright a 390×844 en claro y oscuro, archivos en `capturas/<pantalla>/<fecha>-<antes\|despues>-<claro\|oscuro>.png`. Plantilla `captura.js`, que se copia a `scripts/captura.js` en el primer uso. Uso: `node scripts/captura.js home antes [claro\|oscuro\|ambos] [--full]` |
| `sema-prompts` | Reglas de todo trabajo de código: actualizar `.md` y `.docx` al terminar; alcance chico; lista NO TOCAR (`folio_*`, dominio de Vercel, `authService`); sin fusionar, desplegar, ejecutar SQL ni instalar dependencias sin aprobación; reporte en tres partes |

**Agentes** (`.claude/agents/<nombre>.md`). Todos leen primero `sema-identidad`, `sema-paleta`, `sema-voz` y `sema-prompts`:

| Agente | Escribe código | Qué hace y entrega |
|---|---|---|
| `disenador` | Sí, solo la pantalla pedida (y `theme.js` si falta un token de sema-paleta, o dentro de `/paleta`) | Captura el antes, implementa y captura el después en claro y oscuro. Entrega cambios con archivo:línea, decisiones propias pendientes de León y el build. Al final de `/redisena` actualiza la documentación |
| `critico` | No | Tres listas con archivo:línea: qué rompe los 8 principios, qué se ve «hecho con IA» o de app de bienestar, qué no se vería bien en una historia de Instagram |
| `lectora` | No | Usuaria de 22 años, en primera persona: ¿abriría la app?, ¿qué no entiende?, ¿dónde se iría?, ¿qué compartiría? |
| `accesibilidad` | No | Tabla de elementos con archivo:línea, contraste medido, si pasa y qué cambiar. Revisa contraste, texto de 12 px o más y áreas de toque de al menos 44 px |
| `copy` | No (propone) | Tabla «texto actual → texto propuesto → razón» según sema-voz |
| `qa` | No | Build, avisos nuevos de ESLint (o el comando para instalarlo), capturas de regresión de Explorar, Perfil y Social, y lista de lo roto |

**Comandos** (`.claude/commands/`) y orden de uso:
1. **`/paleta`** (sin argumentos, primero):
   - En la rama `paleta-<fecha>`, aplica sema-paleta en `PALETTE_LIGHT`/`PALETTE_DARK` de `theme.js`. No cambia `BRAND`, los datos de arte ni los componentes; solo lista los usos de `accent` como texto que ya no pasan contraste.
   - `qa` verifica y se capturan Inicio, Explorar y Perfil en claro y oscuro, antes y después.
   - No fusiona.
2. **`/revisa <pantalla>`** (opcional): diagnóstico sin cambiar código. Captura la pantalla y la revisan `critico`, `lectora`, `accesibilidad` y `copy` en paralelo.
3. **`/redisena <pantalla>`**, empezando por `/redisena home`, en la rama `redisena-<pantalla>-<fecha>`:
   1. `disenador` captura el antes, propone e implementa.
   2. Los 4 revisores revisan en paralelo.
   3. `disenador` corrige.
   4. Segunda revisión de los 4.
   5. `qa` verifica.
   6. `disenador` actualiza esta documentación.
   7. El agente principal entrega a León las capturas antes y después, los cambios, lo que dijo cada revisor y lo que quedó sin resolver.

   Máximo dos rondas, sin fusionar ni desplegar.

Pantallas que entiende el script de capturas: `home`, `explorar`, `social`, `perfil`, `mascota`.

**Requisitos para correrlos** (al 2026-11-02 no se cumple ninguno):
- Playwright en `devDependencies`: `npm install -D playwright` y `npx playwright install chromium`.
- `SEMA_TEST_EMAIL` y `SEMA_TEST_PASSWORD` en `.env.local`, de un usuario de prueba con racha, libro en «Leyendo», mascota y onboarding terminado.
- `capturas/` agregado a `.gitignore` (2026-11-02).
- ESLint es opcional: `qa` reporta si no está.

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
- DB: `user_streaks` (current_streak, longest_streak, last_log_date, total_pages_read — solo SELECT para el cliente), `reading_logs` (pages_read, mood, log_date, `logged_at` con hora, `session_id` único). El check-in diario de XP es server-side (`pet_daily_checkin`, idempotente por día, fecha México).

### 3. Mascota (pet)
- UI: `PetOnboarding` (elegir/nombrar), `Mascota` (Lottie, desde 2026-11-05; antes `PetDisplay`), `PetHub` (panel), `PetLevelUpToast`. Un solo tipo actual: gato ("El Sensible"); diseño futuro en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
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
Intercambio de libros **físicos** entre usuarios cercanos. MVP: misma zona de CDMX. v2 (2026-10-03): pines aproximados en cualquier estado, con las zonas como respaldo. **v3 (2026-10-03, vigente): solo pines** (las zonas ya no se leen ni se muestran). Tab `trueque` en `NAV_ITEMS` (icono `Repeat`), renderiza `TruequeMain`. El flujo y el matching de abajo son **históricos (MVP)**; lo vigente está en las subsecciones v2 y v3.

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

**Monetización (freemium):** `users.is_premium` = SEMA Plus. **No hay pago real**; se activa a mano (`UPDATE users SET is_premium = true WHERE id = '<uuid>'`). Los límites viven en la tabla `trueque_gems_cost`, editable sin redeploy.

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
Extiende el MVP sin reescribirlo (⚠️ lo relativo a zonas de esta subsección quedó reemplazado por v3, más abajo): las zonas de CDMX, los límites del plan gratis, el chat, el cierre y la calificación siguen igual. Todo lo nuevo vive en `supabase/trueque_geo.sql`, `src/services/truequeGeoService.js`, nuevas funciones de `truequeService` y 5 componentes nuevos.

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
- **Estado obligatorio** para publicar, buscar y abrir el mapa (lo exige la UI y, para publicar, también un trigger). **No bloquea matches**: solo centra el mapa, habilita el alcance "Mi estado" y alimenta métricas. ~~CDMX conserva las zonas~~ (v3: todos, CDMX incluida, necesitan ≥1 pin).
- **Pines:** 1 a 3 por usuario (igual para free y Plus). El servidor redondea a 2 decimales (~1 km), valida la caja de México (lat 14–33, lng −119 a −86) y permite **cambiar coordenadas una vez cada 24 h** (la primera vez es libre). Cambiar solo etiquetas, estado o radio no consume ese límite. Etiqueta opcional ≤ 30 caracteres, privada. No se usa la geolocalización del navegador.
- **Radio máximo:** 3, 6 (default), 12 o 25 km.
- **Distancia** = mínima entre cualquiera de los pines de ambos (hasta 3×3), haversine en SQL. El cliente **nunca** recibe coordenadas ajenas ni distancias exactas: solo `proximity` ∈ `lt3` ("menos de 3 km"), `3_6`, `6_12`, `12_25`, ~~`same_zone`~~ (retirado en v3), `same_state`, `other_state`, `far` ("más lejos", sin estado conocido).
- **Alcances** (cada uno incluye al anterior): `radius` = dentro de MI radio (v2 tenía respaldo por zona; retirado en v3) · `25km` · `state` = + mismo estado · `country` = todos. Con pines de ambos lados manda la distancia (aunque compartan zona).
- **Orden de resultados:** perfecto antes que parcial → más cerca → mejor calificación → más reciente (`sort_order` lo calcula el servidor).
- **Cobro (cambio pedido en §3.4):** `search_trueque_matches` no cobra si la búsqueda devuelve 0 parejas en el alcance. Todo ocurre en una transacción: para usuarios free se hace `SELECT … FOR UPDATE` de su fila de `user_gems` antes de generar; si hubo resultados descuenta 20 + fila negativa en `reward_ledger` (`reason='trueque_search'`); si el descuento fallara, `RAISE` revierte también los matches generados. "Resultado" = pareja con libros cruzados dentro del alcance (incluye parejas que ya tenían un match vivo). Se sigue exigiendo saldo ≥ 20 antes de buscar. No cambió cómo se ganan ni cuánto cuestan las gemas.
- **Reglas +18:** sin `rules_accepted_at` y `adult_confirmed_at` no se puede publicar ni chatear (trigger `trg_trueque_require_ready` en `books_offered`/`books_wanted`/`exchange_chats`, excepto mensajes de sistema) ni buscar (RPC). El `LegalDisclaimerModal` por match se conserva.
- **Reportes:** motivos `acoso`, `estafa`, `datos_personales`, `inseguro`, `otro` + texto opcional (≤ 500). Máx. 10 por día por usuario. No hay pantalla de moderación: León revisa `public.trueque_reports` en el SQL Editor. No hay bloqueo de usuarios.
- **Compatibilidad:** `cost_search_matches`, `find_book_matches` y `get_my_exchange_matches` siguen existiendo sin cambios (un cliente viejo en caché sigue funcionando con zonas y cobro previo). El cliente nuevo ya no las llama.
- **Supuestos (opción más simple):** el estado no restringe dónde pueden caer los pines; un usuario de CDMX no puede quedarse con 0 pines una vez que guardó alguno (el servidor exige 1–3); las búsquedas con 0 resultados de usuarios free no tienen tope propio (sí cuentan para el tope diario de Plus y para métricas).

#### Trueque v3 (2026-10-03): sin zonas fijas + buscador de lugares
**Zonas retiradas.** Ahora todos usan pines, sin excepción:
- **Matching:** `trueque_pair_geo` ya no lee `user_exchange_zones` (devuelve solo `dist_km` y `same_state`); `trueque_proximity_band` ya no produce `same_zone`; `trueque_in_scope` ya no tiene respaldo por zona (sin pines de ambos, la pareja solo entra en "Mi estado" o "Todo el país"); `search_trueque_matches` exige ≥1 pin (`LOCATION_REQUIRED`) también en CDMX; `save_trueque_pins(null, …)` exige pines guardados para cualquier estado. Los matches nuevos guardan `shared_zones = '{}'`. Las firmas v2 de esas funciones se borran con `DROP FUNCTION IF EXISTS` al re-correr el archivo.
- **Datos:** `user_exchange_zones` y `exchange_matches.shared_zones` **no se borran** (historial). Ninguna función de `trueque_geo.sql` ni el cliente las leen. Siguen existiendo en `trueque_schema.sql` las RPCs viejas que sí las usan (`set_exchange_zones`, `cost_search_matches`, `trueque_generate_matches`, `trueque_status.max_zones/zones_count`) para clientes viejos en caché; el cliente nuevo no las llama.
- **UI:** fuera la barra "Zonas:" de `TruequeMain`, `ZonesOnboarding`, `ZonesEditor`, los chips de zona de `MatchCard` (la fila de chips desaparece si no hay rango ni "Por leer") y la línea "Hasta 5 zonas" del aviso de Plus. `LocationStep` lleva a todos los estados al mapa. Si al entrar alguien ya aceptó reglas y tiene estado pero 0 pines (p. ej. cuenta v2 de CDMX que solo tenía zonas), se abre "Mis lugares" automáticamente, igual que a un usuario nuevo. El alcance "radius" se llama siempre "Mi radio (X km)".
- **Estado:** sin cambios respecto a v2 (obligatorio, centra el mapa, alcance "Mi estado").

**Buscador de lugares** (`src/services/placeSearchService.js` + `PlaceSearch` dentro de `MyPlaces.jsx`):
```
"Busca un lugar: estación de metro, plaza, café…"
  └─ (≥3 letras, 450 ms sin teclear) → searchPlaces(q, { center: centro del estado })
       └─ GET https://nominatim.openstreetmap.org/search?q=…&format=jsonv2&countrycodes=mx&limit=5
              &accept-language=es&viewbox=<centro del estado ± 2.5°>&bounded=0
  └─ 3–5 sugerencias con el nombre completo (display_name)
  └─ tocar una → siguiente pin libre en ese punto, redondeado a ~1 km + círculo de ~1 km, flyTo animado
                 (con 3 pines: "Ya tienes 3 lugares. Borra uno para agregar otro.")
```
- **Política de uso de Nominatim:** 1 solicitud/segundo como máximo (`THROTTLE_MS` 1.1 s entre solicitudes + debounce + caché en memoria por consulta y estado + `AbortController` que cancela búsquedas viejas). El navegador **no permite** fijar el header `User-Agent` en `fetch()`; la app se identifica por el `Referer` que manda el navegador (la política lo acepta para apps web).
- **Prioridad del estado:** `viewbox` alrededor del centro del estado con `bounded=0` (prioriza, no excluye otros estados).
- **Estados:** buscando (spinner), sin resultados ("No encontramos ese lugar, intenta con otro nombre o toca el mapa."), sin conexión, error o timeout de 8 s (mensaje, la pantalla sigue usable). Deshabilitado mientras corre el límite de 24 h.
- **Privacidad:** el texto buscado va solo a Nominatim y nunca se guarda; a la BD solo llegan las coordenadas redondeadas, igual que al tocar el mapa. Tocar el mapa sigue funcionando igual.
- **Service worker:** regla `NetworkOnly` para `nominatim.openstreetmap.org` (no se cachean respuestas).

### 15. Collages (MVP, 2026-11-06, rama `collages-mvp`)

Lienzo creativo tipo Pinterest Shuffles dentro del universo de lectura: stickers, papeles y las frases guardadas del usuario. Pestaña propia «Collage» en la barra inferior.

**Dónde vive cada cosa**

| Pieza | Archivo |
|---|---|
| Catálogo (DATOS) | `src/data/collage-catalog.json` |
| Lectura del catálogo + motor puro de premios | `src/services/collageCatalog.js` |
| Inventario, tiradas, compras, guardado, publicación, modo local, `collageBus` | `src/services/collageService.js` |
| Tirada al registrar la racha | `src/services/readingService.js` (después de `update_streak()`) |
| Pestaña «Mis collages» (carga perezosa, chunk propio ~14 KB gzip) | `src/components/collage/CollagesView.jsx` |
| Editor y gestos | `src/components/collage/CollageEditor.jsx` |
| Bandeja (Stickers / Papeles y fondos / Mis frases, sets bloqueados) | `src/components/collage/CollageTray.jsx` |
| Hojas inferiores (diálogo, fila, botón) | `src/components/collage/CollageHoja.jsx` |
| Publicar (solo collage / con frase / con reseña) | `src/components/collage/CollagePublicar.jsx` |
| Publicación en el feed (+ tarjeta legible encima) | `src/components/collage/CollagePostBody.jsx` |
| Celebración de set nuevo (montada en `MainApp`) | `src/components/collage/CollageCelebracion.jsx` |
| Documento, recortes de frase, exportación | `src/components/collage/collageRender.js` |
| CSS (modo capas, premio) | `src/index.css`, bloque «Collages (2026-11-06)» |
| Assets | `public/collage/stickers/` (+`min/`), `public/collage/texturas/` (+`min/`) |
| Generador de assets | `scripts/collage-assets.py` (fuentes en `assets-fuentes/stickers/<set>/`, una carpeta por set, fuera de git) |
| Servidor | `supabase/collages_mvp_2026-11-06.sql` (escrito, **sin correr**) |
| Capturas y prueba de gestos | `scripts/captura-collage.mjs` → `capturas/collage/` |
| Verificación de sets en la bandeja (bloqueados / desbloqueados en local / agregar al lienzo) | `scripts/captura-collage-sets.mjs` → `capturas/collage/` |
| Integración en `App.jsx` | `NAV_ITEMS` (Collage), render de la pestaña con `Suspense`, `<CollageCelebracion>`, rama `post.type === "collage"` de `renderPost`, `describePostTarget` («tu collage»), el «+» oculto en Collage |

**Por qué sin librería de canvas (decisión del paso 0).** Se compararon react-konva, Fabric.js y una solución propia:
- *Stack:* React 18 + Vite, estilos inline con `palette`. Instalar dependencias requiere aprobación de León (sema-prompts). La solución propia no agrega ninguna.
- *Rendimiento en celular:* cada pieza es un `<div>` con `transform` (compositor de GPU); el lienzo se dibuja en canvas solo al exportar o hacer la vista previa. Konva redibuja un canvas entero por gesto y Fabric pesa ~300 KB min.
- *Gestos táctiles:* ni Konva ni Fabric traen pellizco + giro con dos dedos listos para usar; con Pointer Events son ~120 líneas (`onPointerDown/Move/Up` de `CollageEditor`) y se prueban con toques reales (`captura-collage.mjs` usa `Input.dispatchTouchEvent` de CDP).
- *Mantenimiento:* todo es código de la app, en español, sin APIs de terceros que migrar. El costo: si algún día se necesitan filtros, máscaras complejas o texto editable sobre el lienzo, Konva vuelve a ser candidato (el documento JSON no cambia).

**Catálogo y su formato** (`collage-catalog.json`):
```json
{
  "recompensas": { "probabilidadInicial": 0.30, "incrementoPorFallo": 0, "maxSinPremio": 5 },
  "limites": { "collagesSinPlus": 5, "collagesPlus": null },
  "lienzo": { "ancho": 1080, "formatos": { "historia": { "alto": 1920 }, "cuadrado": { "alto": 1080 } }, "formatoInicial": "historia" },
  "sets": [ { "id": "tercer-ojo", "nombre": "Tercer ojo", "descripcion": "…", "obtencion": { "tipo": "racha" }, "muestra": "psico-ojo-radiante" } ],
  "objetos": [ { "id": "psico-ojo", "nombre": "Ojo", "set": "tercer-ojo", "categoria": "sticker", "estilo": "psicodélico setentero",
                 "archivo": "/collage/stickers/psico-ojo.webp", "miniatura": "/collage/stickers/min/psico-ojo.webp" } ],
  "coloresFondo": [ { "id": "lila", "nombre": "Lila", "hex": "#BBADFF" } ],
  "estilosFrase": [ { "id": "revista", "fondo": "#FFFFFF", "tinta": "#111111", "fuente": "quote", "tamano": 64, "borde": "rasgado", "credito": "label" } ]
}
```
- `categoria`: `sticker`, `textura` (pieza suelta) o `fondo`.
- `obtencion.tipo`: `inicial` (de todos), `racha` (premio variable), `gemas` (con `precio`) o `plus` (Sema Plus). **Cada objeto hereda la obtención de su set**; si un objeto declara su propia `obtencion`, manda la suya. `collageCatalog.js` la resuelve al cargar.
- Sets actuales (2026-11-06):
  - **Inicial:** `papeles` (texturas propias) y `tinta` (5; PNG pendientes).
  - **Racha:** `trance`, `tercer-ojo`, `olimpo`, `bodegon` (6 cada uno, los 24 `psico-*` agrupados por afinidad visual) y `poe` = Nevermore (12).
  - **Gemas, 100 cada uno:** `botanico` (10), `sello` (5), `tarot` = Arcanos (11) y `musica` = Lado B (14).
- **Fuentes de los stickers:** `assets-fuentes/stickers/<set>/*.png`, fuera de git. El nombre de la carpeta es el set de origen; el `set` del catálogo puede subdividirlo, como `psico/` → 4 sets. Las subcarpetas `revisar-marcas/` nunca se convierten, y `EXCLUIR` en el script deja fuera stickers concretos.
- **Alta de un set nuevo:**
  1. Crear su carpeta con los PNG.
  2. Correr `python scripts/collage-assets.py stickers`.
  3. Agregar sus objetos y su set al JSON.
  4. Agregar su fila al bloque CATÁLOGO del SQL y a la lista del `UPDATE … activo = false`. Para mover un set: cambiar su `obtencion` en el JSON **y** su fila en el bloque CATÁLOGO del SQL (el servidor valida con `collage_sets`).
- Los colores de `coloresFondo` y `estilosFrase` son **contenido** del collage (como una foto): no siguen al tema claro/oscuro. Fondos lisos solo blanco, negro, arena y tinta (sin pasteles de pantalla completa, sema-identidad §6); los vivos quedan en recortes de frase y piezas.

**Inventario.** Permanente por usuario: un set desbloqueado se usa sin límite y nunca se consume. En servidor, `user_collage_inventory (user_id, set_id, origen, unlocked_at)`; los sets `inicial` no se guardan (son de todos) y los `plus` se abren con `users.is_premium`. La UI recibe `estado = { modo, plus, sets: Set, fallosSeguidos, limite, usados }` de `getEstadoCollage`.

**Motor de desbloqueos (recompensa variable).**
- Cuándo: cada vez que `update_streak()` responde sin error (registro real de lectura), `readingService` llama a `tirarPremioRacha` → RPC `collage_streak_roll()`.
- Regla (SQL y espejo JS `tirarPremio`): candidatos = sets activos de `racha` que no tiene; sin candidatos no se tira. `p = min(1, probabilidadInicial + incrementoPorFallo × fallosSeguidos)`. Si `fallosSeguidos ≥ maxSinPremio` gana seguro (nunca más de 5 registros seguidos sin premio). Simulación de 200 000 tiradas: 33.9 % de premios, máximo 5 sin premio.
- Idempotencia: una tirada por día (fecha México) por `UNIQUE (user_id, origen, ref)` con `ref = fecha`; la red de seguridad vive en `collage_reward_state` con `SELECT … FOR UPDATE`. Exige un `reading_log` de hoy, igual que `update_streak`.
- Historial: `collage_unlock_events` guarda cada tirada (`premio` / `sin_premio` / `sin_candidatos`, con la probabilidad usada) y cada compra (`compra`).
- Celebración: si sale premio, `collageBus.emit({ tipo: "premio", setId, origen })` → `CollageCelebracion` (sticker de muestra que entra con salto y giro sobre disco lila, confeti con la paleta, vibración; quieto con `prefers-reduced-motion`). En desarrollo, `?collage=premio` la muestra.
- **Compra con gemas:** desde la hoja del set bloqueado. RPC `buy_collage_set(p_set_id)`: el precio sale de `collage_sets` (el cliente solo manda el id), descuento atómico en `user_gems` (`balance >= precio`), fila negativa en `reward_ledger` (`reason = 'collage_set'`, `ref = set`), inventario e historial en la misma transacción; comprar un set que ya se tiene no cobra. Después, `MainApp` recarga el saldo (`loadGems`).
- **Sema Plus:** bandera `plus` = `users.is_premium` (falsa por defecto; el trigger `guard_users_premium` impide que el cliente la cambie). Abre los sets `plus` y quita el tope de collages.

**Modelo de datos del collage** (documento editable, `collages.doc` jsonb, ≤ 200 KB):
```js
{ v: 1, formato: "historia" | "cuadrado",
  fondo: { tipo: "color", id, hex } | { tipo: "textura", ref, src },
  capas: [ // orden = capa (la última va al frente)
    { id, tipo: "objeto", ref, src, x, y, w, h, s, r },
    { id, tipo: "frase", frase: { texto, libro, autor, quoteId }, estilo, x, y, w, h, s, r } ] }
```
Unidades lógicas de 1080 de ancho; `x, y` = centro, `w, h` = tamaño base, `s` = escala, `r` = grados. Cada capa guarda `src` además de `ref` y la frase guarda su texto: si el catálogo cambia o se borra la frase, el collage se sigue viendo igual. Tabla `collages (id, user_id, titulo, formato, doc, preview, created_at, updated_at)`: privada (RLS todo propio), `preview` = JPEG chico en data URL (~270 px) para la cuadrícula (la «imagen exportada» del collage guardado; no hace falta bucket nuevo). Tope: trigger `collages_limit` (5 sin Plus, `collage_config.limite_sin_plus`) que lanza `COLLAGE_LIMIT`; la UI muestra «Ya hay 5 collages guardados», «Borra uno de tus collages para crear otro.» y «Collages ilimitados en Sema Plus (próximamente).», con «Ver mis collages» / «Armar uno sin guardarlo».

**Editor.**
- Lienzo 9:16 por defecto y 1:1 (selector arriba; al cambiar se conservan las posiciones respecto al centro).
- Bandeja: abre **encima** de la parte baja del lienzo (el lienzo no cambia de tamaño ni de escala). Tocar agrega al centro (con un poco de juego) y la bandeja se cierra; tocar la pestaña la vuelve a abrir. Sets bloqueados: una pieza de muestra opaca con candado y «Cómo se obtiene» → hoja con la forma de obtención (racha: chance diaria y red de seguridad; gemas: saldo y botón «Comprar por N gemas» o «Faltan N gemas»; plus).
- Gestos: un dedo arrastra; dos dedos pellizcan y giran (el segundo puede caer fuera de la pieza); mantener presionado 0.42 s sin mover = modo capas (vibra con `.sema-collage-capa--capas`, halo lila, aviso «Arriba: al frente · Abajo: atrás»), cada 40 px sube o baja una capa. Al arrastrar, la franja de abajo se vuelve el bote («Arrastra aquí para borrar» / «Suelta para borrar»; la pieza se encoge y se aclara encima) y en 9:16 aparecen dos guías punteadas de zona segura de historia (250 px arriba, 340 px abajo; no salen en la imagen). Barra de la pieza (misma franja, alto reservado): Al frente, Atrás, Estilo (solo frases), Agrandar, Achicar, Girar y Borrar: alternativas de un toque al pellizco y al giro.
- Deshacer/rehacer: 60 pasos; un gesto completo es un paso. Accesibilidad: el editor es un `role="dialog"` (foco a «Cerrar» al abrir), cada pieza es enfocable (`role="button"`, nombre y capa); con el foco en el lienzo: flechas (Shift = 40), + / −, [ / ], Supr; Ctrl+Z / Ctrl+Y en cualquier lugar; rueda = escala, Shift + rueda = giro. Las hojas atrapan el foco (Tab da la vuelta), lo devuelven al cerrar y cierran con Escape.
- Frases: `fetchQuotes` («Mis frases»); se dibujan una vez en canvas como recorte de revista (5 estilos del catálogo, borde rasgado o recto, sombra, libro y autor en Space Mono o Figtree) y se usan como imagen, así editor y exportación coinciden. Las fuentes se esperan con `document.fonts.load` antes de dibujar.
- Salir con cambios sin guardar pregunta «¿Salir sin guardar?».

**Guardado y publicación.**
- «Listo» → hoja «¿Qué hacemos con el collage?»: «Compartir imagen» exporta siempre 1080×1080 (PNG; si el lienzo está en 9:16, se exporta una copia en 1:1 y el lienzo no cambia) y usa `navigator.share({ files })` o descarga el PNG si no hay hoja nativa; luego Guardar (documento + vista previa) y Publicar en Social. Lo exportado y lo publicado lleva una marca chica «Sema» (papel blanco + tinta) abajo a la derecha; en 9:16 queda arriba de la franja que tapa la caja de respuesta de las historias. La vista previa y el editor no la llevan.
- Publicar: «Solo el collage», «Con una frase» o «Con una reseña» (libros con `review`). Se exporta un JPEG de 1080 de ancho y se sube a `post-images` como `<user>_collage_<timestamp>.jpg` con `upsert:false` (**congelado**: editar el collage o cambiar el catálogo no lo toca). El post es `type: "text"` con `content = { __folio_type: "collage", v, formato, collageId, encima }` (mismo patrón que las frases: no hay que tocar el CHECK de `posts.type`). `fetchFeed` lo convierte en `type: "collage"`; `renderPost` pinta franja «Collage» (o «Collage con frase/reseña»), cabecera, `CollagePostBody` y pie con likes y comentarios. La tarjeta encima es papel blanco `#FFFFFF` con tinta `#483A58` (11.05:1), fija en los dos modos porque va sobre la imagen.

**Modo local (antes de correr el SQL).** Si `collage_mi_estado` / `collages` no existen, `collageService` guarda todo en `localStorage` `sema_collages_v1:<userId>` (nunca una clave `folio_*`), la tirada usa el motor JS con una tirada por día local, y la compra responde «La tienda se está actualizando». En desarrollo, «Mis collages» lo avisa en una línea. Al correr el SQL se pasa solo a servidor (lo guardado en local no se migra).

**Lo que la arquitectura ya permite (fuera del MVP, no construido):** fotos propias (`tipo: "foto"` con `src` a un bucket propio), texto libre (`tipo: "texto"`, se dibujaría como las frases), recortar imágenes (polígono `recorte` por capa, aplicado con `clip` en canvas y `clip-path` en el DOM), ver y dar like a collages de otros (ya son posts; una galería = consulta a `posts` con `__folio_type = collage`). `collageRender` ignora tipos de capa que no conoce en vez de romperse.

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
ReadingLogModal → logReadingSession() genera session_id (crypto.randomUUID) y devuelve { postIdPromise }
  ├─ INSERT reading_logs { ..., log_date (local), session_id }   ← 23505 = sesión ya sincronizada → se corta sin duplicar
  │    └─ [DB trigger] trg_reading_logged → +2 XP/10 págs, +5 gemas (ref = session_id; máx 12/día y 4/hora, luego guarda sin pagar)
  ├─ RPC update_streak() → el servidor avanza racha y total_pages_read (exige log real de hoy, fecha México)
  │    └─ (Collages, 2026-11-06) RPC collage_streak_roll() → una tirada por día; si sale premio, collageBus → CollageCelebracion
  ├─ publica UN post reading_session (createFeedPost devuelve su id)
  ├─ desde Social: ShareSessionModal completa ESE post (updateSessionPost), no inserta otro
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
| `streakService` | `fetchStreakData`, `fetchStreakRow`, `normalizeStreak` (única fuente de la racha en la UI, 2026-11-01), `checkStreakOnLoad`, `resetMonthlyFreeze`, `applyStreakFreeze`, `localDateStr`, `daysBetweenLocalDates` | `user_streaks`, `reading_logs`, RPCs `pet_daily_checkin`/`reset_monthly_freeze`/`use_streak_freeze` | Racha se PAUSA, nunca se resetea. `fetchStreakData` lanza si falla la lectura (antes perdía el error); los wrappers de freeze devuelven la fila actualizada y lanzan. `update_streak` lo llama `readingService` |
| `gemsService` | `loadGems`, `claimDailyGems`, `initUserGems`, `gemsEventBus`, `gemToastBus` | `user_gems`, RPC `claim_daily_gems` | Cliente solo lee |
| `petService` | `loadPet`, `createPet`, `updatePetName`, `addPetXP` (sync), `petBus`, `PET_TYPES`, `PET_MAX_LEVEL`, `petXpForLevel`, `petImageSrc` | `user_pets` | `loadPet` distingue null (sin mascota) de undefined (error) para no romper onboarding |
| `listsService` | `fetchUserLists`, `createUserList`, `updateUserList`, `deleteUserList`, `addBookToList`, `removeBookFromList` | `user_lists`, `user_list_books` | 23505 tratado como éxito idempotente. **camelCase desde 2026-09-22** (`dbToList`: `isPublic`, `createdAt`, `bookIds`); `updateUserList` recibe `{ name, description, isPublic }` |
| `recommendationService` | `getRecommendations`, `getPreferredGenres`, `checkDailyLimit`, `incrementSaveCounter`, `buyExtraSaves` (RPC `spend_gems`, ver §VIII), `fetchCollaborativeRecommendations` | `books_curated`, `daily_save_limits`, RPC `spend_gems`, `/api/recommendations` | Límite 3/día (`DAILY_LIMIT`, exportado; `localDateStr` para la fecha); expansión de géneros del onboarding vía `GENRE_MAP` (interno). **camelCase desde 2026-09-22**: libros del catálogo (`coverUrl`, `genres`, `pages`…) y límite (`savesUsed`, `canSave`, `effectiveLimit`…). `incrementSaveCounter` ahora lanza si falla |
| `quotesService` *(2026-09-22)* | `fetchQuotes`, `fetchQuotesForBook`, `insertQuote`, `updateQuoteInDB`, `deleteQuoteFromDB`, `toggleQuoteFavorite`, `setQuotePublic` | `quotes` (+ join `books`) | camelCase (`dbToQuote`: `bookId`, `pageNumber`, `isFavorite`, `isPublic`, `createdAt`, `bookTitle`…). Lanza. El JSON que se publica en `posts.content` conserva sus claves históricas (`page_number`, `bookTitle`) |
| `socialService` *(2026-09-22)* | (2026-11-06: `fetchFeed` también reconoce `__folio_type: "collage"` → `type: "collage"` y `post.collage`) `fetchFeed`, `fetchComments`, `createFeedPost`, `createComment`, `createReply`, `deleteFeedPost`, `compressAndUploadPostImage`, `getOrCreateConversation`, `markConversationRead`, `getUnreadMessagesCount`, `syncPendingPosts` | `posts`, `comments`, `comment_replies`, `messages`, `conversations`, bucket `post-images` | **Excepción a camelCase**: filas crudas (las consume la UI del feed/chat en ~100 lugares). Offline: `createFeedPost` encola |
| `readingService` *(2026-09-22)* | `logReadingSession`, `syncPendingLogs` | `reading_logs`, RPC `update_streak`, `tirarPremioRacha` (Collages) | `session_id` idempotente; offline encola. Desde 2026-11-06, tras un `update_streak` sin error llama a `tirarPremioRacha` (sin `await`) |
| `achievementsService` *(2026-09-22)* | `ACHIEVEMENT_DEFS`, `FEED_WORTHY_ACHIEVEMENTS`, `achievementBus`, `checkAchievements` | 6 tablas + RPC `award_achievement` | Iconos y textos de condición (UI) siguen en App.jsx. Reproduce sonido/haptic al otorgar (comportamiento previo) |
| `aiService` *(2026-09-22)* | `enrichBook`, `getMoodRecommendations` | `/api/anthropic` | Renombrado desde `getRecommendations` para no chocar con `recommendationService` |
| `googleBooksService` *(2026-09-22)* | `searchGoogleBooks` | `/api/books` | Dedup + caché 60 s en memoria |
| `wrapsService` *(2026-09-22)* | `generateMonthWrap`, `generateAnnualWrap`, `MONTHS_ES` | `books`, `reading_logs`, `achievements`, `user_streaks`, `monthly_wraps` | Si falla la lectura de libros del periodo **lanza y no guarda** (antes persistía un Wrapped vacío) |
| `genreService` *(2026-11-01)* | `normalizeGenre` | — | Traduce categorías de Google Books al español y unifica mayúsculas/acentos («Fiction / Fantasy» → «Fantasía»). Lo usan `bookToDb`, `dbToBook`, `googleBooksService` y los libros de amigos |
| `collageCatalog` *(2026-11-06)* | `getSets`, `getSet`, `getObjeto`, `objetosDeSet`, `objetosPorCategoria`, `getEstiloFrase`, `siguienteEstiloFrase`, `altoFormato`, `objetoDesbloqueado`, `setDesbloqueado`, `probabilidadPremio`, `tirarPremio`, `candidatosRacha`, `ESTILOS_FRASE`, `COLORES_FONDO`, `RECOMPENSAS`, `LIMITES`, `LIENZO` | `src/data/collage-catalog.json` | Solo lee y resuelve el catálogo (herencia de obtención set → objeto) y el motor puro de premios, espejo de `collage_streak_roll`. En desarrollo avisa en consola si el catálogo trae una obtención inválida, un set de gemas sin precio o una muestra inexistente |
| `collageService` *(2026-11-06)* | `getEstadoCollage`, `tirarPremioRacha`, `comprarSet`, `listarCollages`, `guardarCollage`, `borrarCollage`, `publicarCollage`, `parseCollagePost`, `collageBus`, `CollageError` (`code`: `COLLAGE_LIMIT` (+`limite`), `GEMS_INSUFFICIENT` (+`precio`), `GEMS_NO_BALANCE`, `SET_NOT_FOR_SALE`, `COLLAGE_RPC_MISSING`, `NETWORK`, `UPLOAD`, `OFFLINE`, `LOCAL_FULL`) | RPCs `collage_mi_estado`, `collage_streak_roll`, `buy_collage_set`; tabla `collages`; bucket `post-images`; `createFeedPost` | camelCase. Lecturas degradan, escrituras lanzan `CollageError`. **Modo local** automático si las RPCs/tablas no existen (`PGRST202`/`PGRST205`/`42P01`/`42883`): `localStorage` `sema_collages_v1:<userId>` con `{ sets, fallos, eventos, collages }`. `tirarPremioRacha` nunca lanza (no debe romper el registro de lectura) |
| `devLog` *(2026-09-22)* | `devLog` | — | `console.log` solo en `import.meta.env.DEV` (compartido por App.jsx y servicios) |
| `truequeService` | `getZones`, `getUserZones`, `setUserZones`, `getTruequeStatus`, `getMyOffers`, `addBookOffered`, `deleteBookOffered`, `getMyWants`, `addBookWanted`, `deleteBookWanted`, `searchMatches`, `getMatches`, `getMatchChat`, `sendMessage`, `completeExchange`, `rateExchange`, `isDisclaimerAccepted`, `acceptDisclaimer`, `TruequeError`, `CHAT_PAGE_SIZE` | `user_exchange_zones`, `books_offered`, `books_wanted`, `exchange_chats`, bucket `trueque`, RPCs del Trueque | Traduce `RAISE EXCEPTION 'TRUEQUE_*'` a `TruequeError { code, message }` en español (la UI usa `code` para abrir el modal de Plus). Borrar = soft delete (`is_active=false`). `searchMatches()` devuelve `{ paid:false }` sin lanzar si no alcanzan las gemas. `getMatchChat(matchId, { before })` pagina de 50 en 50. **Trueque v2 (2026-10-03):** `searchMatchesNearby(scope)` (RPC `search_trueque_matches`; `{ paid, resultCount, charged, matches }`, `{ paid:false }` si faltan gemas), `getMatchesNearby()` (RPC `get_my_trueque_matches`), `acceptTruequeRules(isAdult)`, `reportTruequeUser({ reportedId, reason, details, matchId })`, (v3: se eliminaron `getZones`, `getUserZones` y `setUserZones`), constantes `SEARCH_SCOPES`, `PROXIMITY_LABELS`, `REPORT_REASONS`, y el helper `callGeoRpc` (convierte el `{ success:false, error }` de las RPCs jsonb en `TruequeError { code }`; `PGRST202`/`PGRST205`/`42P01`/`42883` → `TRUEQUE_UPDATING` con `console.error` de code/message/details/hint). `searchMatches`/`getMatches` (MVP) se conservan pero la UI ya no las usa |
| `placeSearchService` *(2026-10-03, v3)* | `searchPlaces(query, { center, signal })`, `PlaceSearchError` (`code`: `OFFLINE`/`TIMEOUT`/`FAILED`), `PLACE_MIN_QUERY` | Nominatim (`nominatim.openstreetmap.org/search`) | Buscador de lugares del mapa. Throttle 1 solicitud/1.1 s, caché en memoria, timeout 8 s, `countrycodes=mx` y `viewbox` del estado. Devuelve `[{ id, name, lat, lng }]` sin redondear (redondea `MyPlaces`). Cancelación = `AbortError` (la UI lo ignora). No guarda nada |
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

Todo vive en `App.jsx` salvo lo extraído a `src/components/` (AddToListSheet, BookCoverImage, BookTinder, DeleteAccountModal, EmptyState, ListDetailModal, ListFormModal, ListsSection, ReadDateModal, ReadingStatusModal, Skeleton) y `src/pets/` (Mascota, PetHub, PetLevelUpToast, PetOnboarding, PetScene), más `src/components/trueque/` (ver abajo). No existe `src/pages/`. Jerarquía:

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
| `TruequeMain` | Contenedor: barra "<Estado> · N lugares · radio X km" (v3: ya no hay chips de zonas), botón "Buscar matches" (costo en 💎 o cupo Plus), sub-tabs Ofrezco/Busco/Matches, y dueño de todos los modales |
| ~~`ZonesOnboarding`~~ / ~~`ZonesEditor`~~ | **Eliminados en v3** (elegir/editar zonas de CDMX) |
| `OfferBookModal` | Form de libro ofrecido: título, autor, editorial, estado (como nuevo/usado/rayoneado), foto JPG/PNG/WebP ≤ 5 MB |
| `WantBookModal` | Form de libro buscado: título, autor, editorial |
| `BookCard` | Tarjeta de libro (foto o placeholder, estado) con borrado en dos toques |
| `MatchesList` | Agrupa 🟢 perfectos / 🟡 parciales / ✅ completados; estado vacío |
| `MatchCard` | Otro usuario (avatar, ★ promedio), "Recibes ⇄ Das", rango de cercanía (v3: sin zonas), badge "De tu lista Por leer", días para expirar, botones Enviar mensaje / Calificar |
| `LegalDisclaimerModal` | Texto legal exacto + checkbox obligatorio "Confirmo que he leído y acepto" |
| `ExchangeChat` | Chat a pantalla completa: burbujas, mensajes de sistema, "Cargar mensajes anteriores", polling 8 s, botón "Completado" (confirma en 2 toques) |
| `RatingModal` | 1-5 estrellas + reseña opcional (≤ 500) |
| `PlusUpsellModal` | CTA placeholder de SEMA Plus (botón "Próximamente", sin pago) |
| `ui.jsx` | Helpers compartidos: `Sheet`, `fieldStyle`, `Label`, `PrimaryButton`, `ErrorText`, `CONDITION_LABELS` |
| `TruequeRulesModal` *(v2)* | "Antes de empezar": 5 reglas de seguridad + casilla obligatoria "Confirmo que soy mayor de 18 años" (sin cerrar; "Ahora no" → Home) |
| `LocationStep` *(v2)* | "Completa tu ubicación aproximada": selector de los 32 estados. CDMX guarda directo; otro estado abre `MyPlaces`. No importa Leaflet |
| `MyPlaces` *(v2, carga perezosa)* | Mapa Leaflet + tiles OSM: tocar coloca/mueve el siguiente pin (máx. 3), salta al punto redondeado con círculo de ~1 km, etiqueta privada ≤ 30, borrar, selector de estado y de radio (3/6/12/25), texto fijo de privacidad, atribución OSM. Estados: cargando, error de red del mapa (con Reintentar), sin pines, límite de 24 h activo (con la fecha/hora en que se podrá editar). Pines con `L.divIcon` (sin el bug del ícono por defecto con Vite). Export **default** para `lazy()` |
| `ReportModal` *(v2)* | Reportar al otro participante: motivo de lista corta + texto opcional (≤ 500) |
| `ExchangeChat` *(v2)* | + aviso fijo de seguridad bajo el encabezado y botón "Reportar" |
| `MatchCard` *(v2)* | + chip de rango de cercanía (`proximity`) |
| `MyPlaces` *(v3)* | + buscador de lugares (`PlaceSearch`, Nominatim) arriba del mapa; sin menciones a zonas |
| `LocationStep` *(v3)* | Todos los estados van al mapa (ya no hay atajo "solo estado" para CDMX) |

| `Detalles.jsx` *(ronda 4)* | Kit de detalles: `CintaAdhesiva`, `SelloTinta`, `Boleto`, `NotaMano` (cuándo usar cada uno en §III «Ronda 4» y en sema-identidad §5). `DetallesDemo.jsx` solo en dev (`?detalles=1`) |
| `collage/*` *(2026-11-06)* | `CollagesView` (pestaña: cuadrícula + nuevo, tope, borrar; carga perezosa), `CollageEditor` (lienzo y gestos), `CollageTray` (bandeja con sets bloqueados), `CollageHoja` (`CollageHoja`, `FilaHoja`, `BotonHoja`), `CollagePublicar`, `CollagePostBody` (+ `CollageTarjetaEncima`), `CollageCelebracion` (montada en `MainApp`), `collageRender.js`. Detalle en §IV.15 |
| `RachaHito.jsx` *(ronda 5)* | `RachaHitoCartel` (cartel de la publicación «racha»), `LlamaRacha` (SVG en tres niveles, sin emoji, `prefers-reduced-motion` la deja quieta) y demo `?hitos=1` solo en dev |

### Estados de interfaz (2026-10-10)

Tres piezas para que la app no muestre pantallas en blanco, spinners sueltos ni botones "muertos". **Solo UI:** no cambió ningún servicio, consulta de Supabase ni RPC (los únicos props nuevos son de navegación: `setTab` a `ExplorarView`/`RecommendFlow`, `onOpenAmigos` a `FeedView`, `onAddBook` a `ReadingStatsView`).

**1. `EmptyState`** (`src/components/EmptyState.jsx`) — `<EmptyState icon={Icono} title="…" description="…" action={{ label, icon?, onClick }} compact? style? />`. Ícono de lucide-react (solo los que ya usa la app) en un círculo `bgCard`, título en Fraunces itálica, una línea en `inkSoft` y botón opcional `accent`. `compact` para modales, sheets y secciones internas.

**2. `Skeleton`** (`src/components/Skeleton.jsx`):

| Export | Uso |
|---|---|
| `Skeleton({ width, height, radius, circle })` | Bloque base (barra o círculo) |
| `SkeletonGroup({ label, delay, style })` | Contenedor: `role="status"` + `aria-busy` + `aria-label`; espera `SKELETON_DELAY_MS` (200 ms) antes de verse y mientras tanto ocupa su lugar con `visibility: hidden` (si los datos llegan antes, no hay parpadeo ni salto) |
| `SkeletonRow` / `SkeletonList({ count, lead: "avatar" / "cover" / null, lines, card, trailing })` | Filas: amigos, solicitudes, chats, notificaciones, comentarios, listas, resultados de búsqueda, libros del Trueque |
| `SkeletonCardGrid({ count, columns, avatar })` | Tarjetas centradas: amigos, comparativa de perfiles |
| `SkeletonBubbles({ count })` | Burbujas alternadas: chat de amigos y chat del Trueque |

El brillo vive en `index.css` (`.sema-skeleton`, keyframe `semaShimmer`, colores `--sema-skel-*`); con `prefers-reduced-motion: reduce` queda un bloque fijo sin animación. Formas armadas a mano con `Skeleton`: arranque de la app (`AppLoadingSkeleton`, forma de Inicio; antes el área principal quedaba **en blanco** mientras cargaban los libros), perfil propio, perfil de amigo, calendario de lectura (7×5), frases, Trueque y la carga del mapa de «Mis lugares».

**3. Hover / press / focus** (`index.css`, bloque «Estados de interfaz»):
- Todo hover va dentro de `@media (hover: hover) and (pointer: fine)` → en celular no se queda "pegado". Los `hover:` de Tailwind también, con `future.hoverOnlyWhenSupported` en `tailwind.config.js`.
- **Todos los `<button>`**: cambio leve de tono al pasar el mouse (`filter: brightness(--sema-hover-brightness)`: 0.96 en claro, 1.12 en oscuro) y estado presionado `:active` para touch (0.9 / 1.22), transición de 150 ms. Opt-out: clase `sema-no-hover` (filas que ya cambian de fondo).
- Clases: `sema-card` (tarjeta clickeable: sube 2 px + sombra suave de `--sema-ink`; tarjetas de Inicio, amigos, frases, carrusel de Snacks, logros desbloqueados), `sema-row` (div clickeable: notificaciones, libros de una lista), `sema-chip` (chips inactivos: filtros de Biblioteca, áreas UAM, alcance del Trueque), `sema-tab` (pestañas inactivas: `SubTabBar`, sub-pestañas de Amigos y del Trueque), `sema-pill` (nav de escritorio), `sema-nav-item` + `sema-nav-pill` (íconos de la barra inferior). `hover-bg-soft` y `timer-book-hover` ya existían: ahora usan variables y `!important` (el fondo inline les ganaba y el hover nunca se veía).
- **Foco con teclado**: `:focus-visible` global con contorno de 2 px `--sema-accent` en botones, links, selects y roles interactivos. **`cursor: pointer`** global en todo lo clickeable no deshabilitado.
- Los 6 hover hechos con `onMouseEnter/onMouseLeave` (resultados del buscador, logros, libros y estados de ánimo de `ReadingLogModal`, botón y tarjetas de Snacks) pasaron a clases CSS. Se conserva el de `QuickRatingModal` (vista previa de estrellas, es lógica, no estilo).

**Textos de los estados vacíos** (aprobados por León el 2026-10-10). Reglas: título factual + descripción directa, sin segunda persona («tú», «tu», «puedes»), sin «No es X, es Y» y sin frases de marketing.

| Pantalla | Título | Descripción | Botón |
|---|---|---|---|
| Biblioteca (sin libros) | Sin libros en la biblioteca | Los libros agregados aparecen aquí. | Agregar libro → pestaña Agregar |
| Biblioteca (filtro de estado vacío) | Sin libros en «Leyendo» (cambia con el filtro) | Los libros con este estado aparecen aquí. | Ver todos → filtro Todos |
| Biblioteca (búsqueda) | Sin resultados | Ningún libro coincide con «texto buscado». | Limpiar búsqueda |
| Buscador de libros | Sin resultados | Ningún libro coincide con ese título o autor. | — (debajo sigue «Agregar manualmente →») |
| Hoja «Agregar a lista» | Sin listas | Las listas creadas aparecen aquí. | — (debajo sigue «Nueva lista») |
| Detalle de lista | Lista sin libros | Los libros se agregan desde el detalle de cada libro. | — |
| Social · Feed | Sin publicaciones en el feed | Las lecturas, frases y logros de las amistades aparecen aquí. | Buscar amigos → hoja Amigos |
| Social · Amigos | Sin amigos agregados | Las amistades aceptadas aparecen aquí. | Invitar amigo → compartir link |
| Social · Solicitudes | Sin solicitudes pendientes | Las solicitudes recibidas y enviadas aparecen aquí. | — |
| Social · Chats | Sin conversaciones | Los chats con amistades aparecen aquí. | Ver amigos (solo si hay amigos) |
| Social · Chat 1:1 | Sin mensajes | Los mensajes de esta conversación aparecen aquí. | — |
| Notificaciones | Sin notificaciones | Los likes, comentarios y solicitudes de amistad aparecen aquí. | — |
| Citas (Mis frases) | Sin frases guardadas | Las frases guardadas de cada libro aparecen aquí. | Guardar frase → modal |
| Citas (filtro) | Sin frases con este filtro | Las frases que coinciden con el filtro aparecen aquí. | Ver todas |
| Recomiéndame | Sin libros para recomendar | Las recomendaciones se basan en los libros de la biblioteca. | Agregar libro → pestaña Agregar |
| Biblioteca UAM | Sin resultados | Ningún libro del catálogo UAM coincide con la búsqueda o el área. | Limpiar filtros |
| Trueque · Ofrezco | Sin libros ofrecidos | Los libros físicos publicados para intercambio aparecen aquí. | — (arriba sigue «Ofrecer un libro») |
| Trueque · Busco | Sin libros buscados | Los libros buscados y la lista «Por leer» se usan para encontrar matches. | — (arriba sigue «Buscar un libro») |
| Trueque · Matches | Sin matches | Los matches aparecen después de buscar con libros en «Ofrezco» y «Busco». | — (arriba sigue «Buscar matches») |
| Trueque · chat | Sin mensajes | Los mensajes de este intercambio aparecen aquí. | — |
| Estadísticas (Perfil › Resumen) | Sin estadísticas | Las estadísticas se calculan con los libros de la biblioteca. | Agregar libro → pestaña Agregar |

**Se quedaron igual a propósito** (ya tenían un estado decente): Inicio (secciones que se ocultan + tarjeta «Descubre tu próxima lectura»), `FeedSkeleton`, skeleton y vacíos de `BookTinder`, skeleton de `CollaborativeRecommendations`, `LoadingEntertainment` de Recomiéndame (frases y datos curiosos mientras piensa la IA), tarjeta «Crea tu primera lista» de `ListsSection`, vacío de `ReadingLogModal` con botón, mensajes en tercera persona del perfil de amigo y de la comparativa, «Sin comentarios aún.», Wrapped (historia con diseño propio), logros (siempre muestran la cuadrícula completa), Snacks (contenido embebido, nunca vacío), los estados «Sin conexión», el spinner de arranque de sesión (`App`, antes de saber si hay login), el «Cargando mapa…» interno de `MyPlaces` y todos los spinners **dentro de botones** (guardando, enviando, subiendo: indican una acción, no una carga de datos).

**Navegación (2026-11-06):** `NAV_ITEMS` = Inicio, Explorar, Mascota, **Collage** (`Scissors`), Social: 5 pestañas. Trueque sigue comentado. El «+» no aparece en la pestaña Collage.

**Navegación (histórico):** `NAV_ITEMS` pasó de 5 a 6 entradas (Trueque entre Social y Perfil) y, desde el lote UI del 2026-11-01, vuelve a 5: Trueque está comentado (fuera del lanzamiento, decisión del 16 oct 2026; para reactivarlo, importar `Repeat` y descomentar la línea). El padding lateral de cada ítem del `BottomNav` bajó de 14 px a 8 px para que las 6 quepan en ~360 px. El botón de Mascota deja de estar exactamente al centro.

---

## VIII. BASE DE DATOS (Supabase)

### Tablas
`users` (perfil; id = auth.uid; `nombre`, `username`, `preferred_genres[]`, `onboarding_completed`, `avatar_url`, `cover_url`, `bio`, `is_public`; `email` sin SELECT para clientes) · `books` · `quotes` · `reading_logs` · `user_streaks` · `user_gems` · `user_pets` · `achievements` · `monthly_wraps` · `notifications` · `friendships` · `conversations` · `messages` · `posts` · `comments` · `comment_replies` · `post_likes` · `comment_likes` · `user_lists` · `user_list_books` · `books_curated` (catálogo ~500, seed en scripts/) · `daily_save_limits` · `recommendation_scores` · `reward_ledger` · **Trueque:** `user_exchange_zones` · `books_offered` · `books_wanted` · `exchange_matches` · `exchange_chats` · `exchange_ratings` · `trueque_gems_cost` (+ interna `trueque_search_credits`) · **Trueque v2:** `trueque_profiles` · `trueque_pins` · `trueque_reports` · **Collages (2026-11-06, `collages_mvp_2026-11-06.sql`, sin correr):** `collage_sets` · `collage_config` · `user_collage_inventory` · `collage_unlock_events` · `collage_reward_state` · `collages` (detalle en §IV.15).

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
| `user_exchange_zones` (⚠️ solo historial desde v3) | `user_id` FK users CASCADE, `zone exchange_zone`; PK (user_id, zone) | SELECT dueño + contrapartes de un match `pending/chatting/completed`; INSERT/UPDATE/DELETE solo dueño. Trigger: máx. del plan (free 3, Plus 5, tope duro 5) |
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

**v3:** `trueque_pair_geo(uid, other)` → `(dist_km, same_state)`, `trueque_proximity_band(dist, same_state)` y `trueque_in_scope(scope, dist, same_state, radius)` cambiaron de firma (sin zonas). Ninguna función de `trueque_geo.sql` lee `user_exchange_zones`.

Internas (REVOKE a clientes): `trueque_geo_cfg`, `trueque_geo_int`, `trueque_valid_state`, `trueque_valid_report_reason`, `trueque_haversine_km`, `trueque_pair_geo` (⚠️ recibe dos user_id arbitrarios y devuelve su distancia: jamás exponerla), `trueque_proximity_band`, `trueque_band_rank`, `trueque_in_scope`, `trueque_generate_matches_geo` (mismo emparejamiento por título y mismo upsert por pareja que `trueque_generate_matches`, pero cruza libros primero y filtra por alcance después), `trueque_matches_geo_for`, `trg_trueque_require_ready`.

**Vista `trueque_funnel_summary`** (`security_invoker`, REVOKE a PUBLIC/anon/authenticated → solo SQL Editor): `usuarios_con_estado`, `usuarios_con_pines`, `busquedas` (filas de `trueque_search_credits`, incluye las del flujo viejo), `chats_iniciados` (matches con ≥1 mensaje no de sistema), `intercambios_completados`. Sin datos personales.

### Datos personales: ubicación aproximada (Trueque v2)
- **Qué se guarda:** el estado (clave de 3 letras) y hasta 3 puntos redondeados a 2 decimales (~1.1 km de precisión) con una etiqueta opcional escrita por el usuario. Nunca la ubicación del dispositivo (no se usa `navigator.geolocation`).
- **Quién lo ve:** solo el dueño (RLS + REVOKE). Ninguna RPC devuelve coordenadas de otra persona; a los demás solo les llega un rango de distancia. El cálculo se hace dentro de Postgres.
- **Mitigación de triangulación:** coordenadas ya redondeadas, rangos anchos y 1 cambio de coordenadas cada 24 h.
- **UI:** texto fijo pidiendo marcar lugares públicos (metro, plaza, café) y no casa, escuela ni trabajo.
- **Terceros:** los tiles se piden a `tile.openstreetmap.org` (el proveedor ve la IP y la zona del mapa que se mira, como cualquier mapa web). Desde v3, el texto que el usuario escribe en el buscador va a `nominatim.openstreetmap.org` (con su IP); SEMA no lo guarda. No se envían pines a ningún tercero.
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
| Nominatim (OSM, v3) | `GET https://nominatim.openstreetmap.org/search` desde `placeSearchService.js` | Buscador de lugares del mapa. Gratis y sin API key; máx. 1 solicitud/segundo (throttle + debounce + caché). Sin User-Agent propio (el navegador no lo permite): se identifica por `Referer`. **Si el tráfico crece:** cambiar `NOMINATIM_URL` a un geocodificador con plan gratis (MapTiler, LocationIQ) o a un Nominatim propio. Si se agrega CSP: `connect-src https://nominatim.openstreetmap.org` |
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
10. **Matching del Trueque — MVP** (`trueque_generate_matches`; histórico: el cliente actual usa `trueque_generate_matches_geo`, solo pines, ver §IV.14 v3):
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
20. **Estados de interfaz (2026-10-10)**: (a) cualquier lista o pantalla que pueda quedar vacía usa `EmptyState` con título factual, una línea de descripción sin segunda persona y, si existe, un botón a la acción lógica; (b) toda carga de datos usa un skeleton con la forma del contenido real (`SkeletonList`/`SkeletonCardGrid`/`SkeletonBubbles` o bloques `Skeleton` dentro de `SkeletonGroup`), nunca un spinner suelto ni «Cargando…»; los spinners se reservan para acciones dentro de botones; (c) hover solo en CSS y dentro de `@media (hover: hover) and (pointer: fine)` —nunca `onMouseEnter` para estilos— más `:active` para touch; (d) colores en CSS solo con variables `--sema-*` (salen de `palette` vía `applyPaletteCssVars`).

---

## XI. PUNTOS DE EXTENSIÓN

- **Nueva feature de lectura** (ej. metas semanales): tabla nueva con RLS `auth.uid() = user_id` (copiar patrón de auth_rls_migration) → servicio nuevo en `src/services/` → vista/modal montada desde `MainApp` o `HomeView`. Si otorga XP/gemas: NO desde el cliente — añadir trigger o RPC que llame `folio_award` con `ref` idempotente.
- **Nueva feature social**: seguir patrón posts/comments (tabla + RLS lectura abierta/escritura propia + notificación insertada por el actor + realtime opcional). Renderizar en `FeedView` con un nuevo `type` de post.
- **Monetización**: las gemas ya tienen ledger; un "catálogo de compras" sería tabla `purchases` + RPC SECURITY DEFINER que valide balance y descuente (usar `spend_gems` como puerta de gasto: añadir el producto a su lista blanca `reason → precio`).
- **Otro algoritmo de recomendación**: solo tiene que escribir filas en `recommendation_scores` (user_id, book_id, predicted_rating, reason) — `api/recommendations.js` y la UI no cambian. Sustituir/añadir script en `scripts/` y workflow.
- **Más mascotas**: añadir entradas a `PET_TYPES` en petService (img, title, quote, label) + assets en `public/pets/`; el diseño evolutivo completo está especificado en `SISTEMA_MASCOTAS_EVOLUTIVAS.md`.
- **Trueque**: cambiar costos o límites = `UPDATE trueque_gems_cost SET value = … WHERE key = …` (sin deploy). ~~Agregar una zona~~ (v3: las zonas ya no se usan). Dar Plus = `UPDATE users SET is_premium = true`. **v2:** número de pines, horas entre cambios, radios, caja de México y topes de reportes = editar `trueque_geo_cfg()` al inicio de `trueque_geo.sql` y re-correrlo (más las constantes espejo en `truequeGeoService.js`); reiniciar el límite de 24 h de una cuenta = `UPDATE trueque_profiles SET pins_updated_at = NULL WHERE user_id = …`; ver el embudo = `SELECT * FROM trueque_funnel_summary`; revisar reportes = `SELECT * FROM trueque_reports ORDER BY created_at DESC`.
- **Collages:**
  - **Set nuevo:** WebP en `public/collage/…`, entradas en `objetos` y `sets` de `collage-catalog.json` y, si no es «inicial», una fila en el bloque CATÁLOGO de `collages_mvp_2026-11-06.sql`.
  - **Cambiar probabilidad, red de seguridad o tope:** editar `recompensas`/`limites` del JSON **y** `collage_config` (manda el servidor).
  - **Fotos propias, texto libre y recorte:** nuevos `tipo` de capa en el documento (ver §IV.15 «Lo que la arquitectura ya permite»).
  - **Ver y dar like a collages de otros:** ya son posts del feed; una galería pública sería una vista sobre `posts` con `__folio_type = collage`.
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
    - ~~Migrar zonas fijas a Google Places API~~ — **sustituido 2026-10-03** por pines aproximados con Leaflet + OSM (Trueque v2); desde v3 ya no hay zonas: solo pines.
    - Implementar "Embajadas SEMA" (lugares aliados verificados; el disclaimer ya las anuncia).
    - Pago real de SEMA Plus: hoy `is_premium` se activa a mano y el CTA es placeholder con precio `$XX`.
    - Push notifications para matches y mensajes nuevos (hoy el usuario tiene que entrar a la tab; el chat hace polling solo mientras está abierto).
14. **Trueque — limitaciones conocidas del MVP:**
    - **Un match vivo por pareja**, con un libro por lado.
    - **Match solo por título** (no por autor ni ISBN).
    - **Búsquedas O(usuarios con zona común):** suficiente para el MVP; con miles de usuarios por zona habría que materializar o paginar.
    - **Fotos huérfanas en Storage:** se quedan en el bucket `trueque` al quitar un libro o borrar la cuenta (no hay limpieza).
    - **Disclaimer por dispositivo:** la aceptación vive en `localStorage`, así que en otro dispositivo se vuelve a pedir.
    - **Moderación mínima (v2):** ya hay botón "Reportar" en el chat (`trueque_reports`), pero **no** hay bloqueo de usuarios ni pantalla de moderación: León revisa la tabla a mano. El `LegalDisclaimerModal` todavía menciona soporte@sema.mx.
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
    - **v3 (2026-10-03):** re-correr `trueque_geo.sql` antes de desplegar (si el cliente v3 sale antes, la búsqueda sigue aceptando zonas en el servidor hasta re-correrlo). Pendiente decidir si se eliminan del todo `user_exchange_zones`, el enum `exchange_zone`, `set_exchange_zones` y las claves `*_max_zones` de `trueque_gems_cost` (hoy se conservan como historial y por compatibilidad). Nominatim: uso justo de 1 solicitud/segundo **por app** en la práctica (no hay cuota por usuario); si crece el tráfico, mover a un proveedor con plan. La calidad de Nominatim varía (p. ej. "Metro Insurgentes" puede devolver primero "Metro Insurgentes Sur"): siempre se puede tocar el mapa.
    - **Fuera de alcance (a propósito):** bloqueo de usuarios, pantalla de moderación, condición del libro en el match, puntos de encuentro sugeridos, alertas de "alguien cerca", cadenas de 3 intercambios, geolocalización del navegador.
18. **Estados de interfaz — pendientes (2026-10-10):**
    - ~~Textos de los estados vacíos sin aprobar~~ — **aprobados 2026-10-10** tal como están en §VII. Sigue pendiente: varios vacíos que se dejaron igual siguen en segunda persona («Crea tu primera lista», «Primero agrega un libro como "Leyendo"», «Configura tus géneros primero» de BookTinder).
    - **Skeletons previos con estilo propio:** `FeedSkeleton` (App.jsx), `BookTinder` y `CollaborativeRecommendations` tienen su propio shimmer/pulso y keyframes; se pueden migrar a `Skeleton` para unificar (sin cambio visible grande).
    - **Hover global en `<button>`:** el `filter: brightness()` crea un *containing block* para hijos `position: fixed`; hoy ningún botón tiene hijos así, pero un modal o tooltip fijo puesto dentro de un `<button>` quedaría mal posicionado al pasar el mouse (usar `sema-no-hover` o sacarlo del botón).
    - **Sin prueba visual con sesión iniciada:** se verificó con `vite build`; las pantallas con login no se revisaron en navegador en esta sesión.

19. **Posts de libro con `book_id` null (2026-11-01):** corregido el origen (ver CHANGELOG); los posts anteriores que sigan sin libro se muestran solo con la acción, el comentario y las páginas (sin recuadro de libro). Su recuperación está redactada en `supabase/recovery_posts_book_id.sql` y pendiente de que León revise los SELECT y corra respaldo + UPDATE. Los posts `reading_session` con `book_id` null (14 y 30 de oct) no se explican por `addBook`; si reaparecen, revisar si la FK `posts.book_id` es `ON DELETE SET NULL` (el esquema de `posts` no está versionado). Regla: todo llamador de `addBook` puede omitir `id`, pero `addBook` es quien lo garantiza.

20. **Lote UI 2026-11-01 — pendientes:**
    - **SQL sin ejecutar:** `supabase/lote_ui_2026-11-01.sql` (pasos 1–2 solo lectura, 3 borra duplicados de likes, 4 crea el índice único `notifications_like_once`, 5 verifica). Hasta correrlo, los duplicados viejos siguen en la base.
    - **Sin verificación con cuenta real:** no existen `SEMA_TEST_EMAIL`/`SEMA_TEST_PASSWORD` en `.env.local`. Las capturas ANTES/DESPUÉS (`capturas_lote_ui/`, ignorada por git) se tomaron con Playwright a 390×844 y **Supabase simulado** (arnés fuera del repo); `api/recommendations.js` solo se verificó cargando el módulo, no contra la base.
    - **El «+» flotante** sigue tapando lo que pasa por debajo a media página (inherente a un botón flotante); el margen inferior garantiza que todo se pueda subir por encima. Alternativa si molesta: ocultarlo al hacer scroll hacia abajo.
    - **ESLint** no está instalado ni configurado: no hay conteo de avisos que comparar.
    - **Registro sin «Fantasía»:** `ONBOARDING_GENRES` no la ofrece; las recomendaciones la toman de la biblioteca del usuario.
    - **`fillMissingPageCount`** solo acepta coincidencia de título y apellido; libros sin coincidencia en Google Books se quedan con «total desconocido».

21. **Sistema de agentes de diseño — pendientes (2026-11-02):**
    - **`.claude/` entra a git (2026-11-02):** la regla `.claude/` se quitó de `.gitignore`. Las 60 carpetas de skills de terceros que ya estaban en disco (herramientas de seguridad `sast-*`, `dast-*`, `webapp-*`, `pentest-*`, etc., más `supabase-audit-*`, `supabase-extract-*`, `ui-ux-pro-max`, `skill-name`, entre otras) se ignoran una por una, sin moverlas ni borrarlas, así que siguen funcionando en la computadora de León. Quedan sin ignorar y visibles para git: los 5 skills `sema-*`, los 6 agentes, los 3 comandos y `.claude/settings.json`. Esto revierte la decisión del 2026-09-19, que sacó `.claude/` del repo por higiene. **Pendiente de León:** revisar `.claude/settings.json` antes del commit, y decidir si las carpetas de terceros deben quedar fuera del repo para siempre o solo mientras se decide.
    - **Faltan requisitos para correr los comandos:** `playwright` ya está en `devDependencies` y en `node_modules` (lo agregó León fuera de esta tarea; aparece en `package.json` y `package-lock.json` sin commit). Falta `SEMA_TEST_EMAIL`/`SEMA_TEST_PASSWORD` en `.env.local`, y no se verificó que el navegador Chromium esté descargado (`npx playwright install chromium`). (`capturas/` ya está en `.gitignore` desde el 2026-11-02.)
    - **Contraste de la acción principal:** blanco sobre `#F45B69` da 3.21:1, solo apto para texto grande. `sema-paleta` fija el mínimo en **19 px en negritas** (León pidió 18; WCAG cuenta negritas como texto grande desde 18.66 px). `#F45B69` no sirve como color de texto normal sobre blanco, así que los links pasan a `complementoFrio`.
    - **`MASTER.md` sigue describiendo la paleta anterior** (crema, vino, ámbar, salvia). `sema-paleta` manda; `MASTER.md` se actualiza cuando `/paleta` se apruebe.

22. **Paleta SEMA 2026-11 — pendientes (2026-11-02, commits `ffdf223` y `d4172e8`):**
    - **Siguen con la paleta anterior** (vino, ámbar, salvia, crema): `BRAND` (degradados `gradient*` y `confetti`), `SOCIAL_COLORS`, `STATUS_COLORS`, ~~`AVATAR_COLORS`~~ (**resuelto 2026-11-02** en Social: ciruela, acero y éxito), `COVER_PALETTES` (sigue en Perfil › Mis libros, App.jsx ~347), `HEATMAP_COLORS`, `STREAK_PHASES`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS`, `QUOTE_POSTER_GRADIENTS`, `genrePillStyle` y `genreColor`. También hay rgba vino/café escritos a mano fuera de `theme.js`, que vio QA: el borde y el degradado de la tarjeta del cuento en Social, y el backdrop del modal en `App.jsx:2847` (`rgba(42,31,26,0.72)`). Cada `/redisena` los cambia al tocar su pantalla; los degradados pasan a color plano.
    - **`accent`/`amber`/`mauve` como texto chico sobre blanco** (no pasan contraste: desde el 2026-11-02 `accent` es durazno y da **2.06:1**, igual que amber; mauve 1.99). Las líneas de abajo se midieron con la cereza; con durazno fallan todas, incluidas las que antes pasaban como texto grande. Entre ellas «Perfil público», «Claro», «+ Nueva» y «CUENTO DEL DÍA» en Perfil. Son 69 líneas con `color: palette.(accent|accentSoft|mauve|amber|amberRich)`; se corrigen en cada `/redisena` (links → `complementoFrio`; texto ámbar → `amberInk`):
      - `src/App.jsx` (55):
        - accent que falla: 1060, 1129, 1245, 1346, 1362, 1403, 1618, 1829, 2087, 2381, 2408, 2698, 2760, 2770, 3695, 3928, 4991, 5266, 5375, 5484, 5596, 6253, 6675, 6787, 6872, 7895, 8102, 8364, 8532, 9402, 9953, 10166 y 13113 (logo «SEMA» a 1.05rem).
        - accent que pasa como texto grande: 4941 y 7854.
        - amber/amberRich: 293, 493, 2073, 2540, 2864, 3025, 3869, 4726, 4730, 4764, 5040, 5423, 6981, 7673, 8116, 8376, 9461, 9678 y 10423 (varias son estrellas ★).
        - mauve: 2172.
      - `src/components/AddToListSheet.jsx` (1): 116.
      - `src/components/BookTinder.jsx` (3): 98 (amber), 540 y 574.
      - `src/components/ListDetailModal.jsx` (1): 51.
      - `src/components/ListsSection.jsx` (1): 28.
      - `src/components/trueque/MatchCard.jsx` (4, zona intocable): 36, 67, 72 (mauve) y 82.
      - `src/components/trueque/TruequeMain.jsx` (4, zona intocable): 48, 263 (amber), 281 y 396.
      - Esta lista no cubre las props `color={palette.accent}` de los íconos de lucide.
    - **Skeletons inline con `palette.bgSoft`** (`App.jsx:1931`, `BookTinder.jsx:244-265`): ahora `bgSoft` es igual al fondo y no se ven. Las clases `.sema-skeleton` sí tienen brillo desde `d4172e8`.
    - **Tarjetas de «Tu biblioteca»** (`App.jsx:3765-3768`): con `bgCard` igual al fondo se funden con él. Deben separarse con espacio o con `superficieSuave`.
    - ~~**Texto blanco sobre la fase ámbar de `STREAK_PHASES`:** se lee mal. Sobre cálido el texto debe ser `onFirma`.~~ — **resuelto 2026-11-02** en `/redisena social` (`b11723e`): `DailyReadingBanner`, su único usuario, pasó al sticker lila con `onFirma`. `STREAK_PHASES` queda exportado en `theme.js` sin uso.
    - ~~**Gato negro sobre negro puro** en Inicio, modo oscuro~~: resuelto en `/redisena home` con un halo `firma` solo en oscuro.
    - **ESLint no está configurado:** no hay `eslint.config.*`, `.eslintrc*` ni script `lint` en `package.json`. La única verificación automática es `npm run build`.
23. **Rediseño de Inicio — pendientes (2026-11-02, rama `rediseno-tanda-2026-11-02`):**
    - **`LeerAhoraModal`:** cajas dentro de cajas (App.jsx 8377, 8389); `Sparkles` en un cuadro; tarjeta «Continuar» con tinte `${accent}10` y borde durazno; respaldo `BookOpen` cuando no hay portada; velo café `rgba(42,31,26,0.6)` (8353, 8373; también en `RachaModal`).
    - **Copy:** «Descubre tu siguiente» → «Lo que sigue» lo decide León (texto ya revisado, MASTER P8).
    - **Nombre y avatar:** «Leon» sale sin acento porque el nombre se obtiene cortando `user.name` (que hoy es el correo). Falta un nombre visible en el perfil. El avatar con foto requiere agregar `avatar_url` al `select` de `MainApp` (~11548) y pasarlo a `AppHeader`; hoy muestra la inicial.
    - **Lomo sin portada:** si una palabra es más ancha que el lomo (~7 caracteres a 12 px) se corta en el borde.
    - **Compartir la racha:** falta el botón y la tarjeta 9:16 (principio 7).
    - **Dos accesos a perfil:** el avatar del header y la pestaña «Perfil». El avatar fue dirección de León; queda para que él decida.
    - **El «+» no tiene etiqueta visible** (solo `aria-label="Agregar"`).
    - ~~**`BookCoverImage`:** si una URL de portada falla, su respaldo es un degradado oscuro con emoji (componente compartido, fuera de `palette`).~~ — **resuelto 2026-11-02** en Descubrir (`cf7dd8e`, `f067ea0`): portada genérica con boleto y `SEMA_COVER_COMBOS`; en modo `compact`, monograma (Para ti, `f1fcb50`).
    - **Sticker de racha:** el texto pasa justo con la textura (mínimo 4.68:1). No subir la opacidad ni el `surfaceScale` de `.sema-papel`.
    - **Voz de la mascota:** las líneas solo existen para el gato; cuervo, zorro y mapache necesitan las suyas si llegan.
    - ~~**Borde rasgado en Descubrir:** sigue tapando «1 de 20 libros», porque `BookTinder` no usa `.main-fab-clearance`.~~ — **resuelto 2026-11-02** en Descubrir (`4032a60`): el contador va arriba («Libro 1 de 20») y `CARD_HEIGHT` con `dvh` deja ~39 px entre los botones y el borde rasgado en 390×844 y 375×667.
    - **`onAccent` que todavía no van sobre `accent`:** 2729 (cargando sobre `inkSoft`), 9965 (deshabilitado sobre `border`, invisible en oscuro) y 7380 (confetti oscuro).
    - **Texto blanco sobre `palette.ink` en oscuro** (5859, 9002, 9163): `ink` es blanco en oscuro y el texto `onColor` también. Ya pasaba antes de la paleta 2026-11; el arreglo es `palette.bg`.
    - **Perilla del toggle** (9958): blanca sobre durazno da 2.06 en claro y 1.78 en oscuro.
    - **Contador sobre `slate`** (6498): mide 10.4 px; con `onColor` pasa en claro (6.91) y no en oscuro (1.41).
    - ~~**Durazno como texto sobre blanco en Perfil:** «Perfil público», «Claro», «+ Nueva» y «CUENTO DEL DÍA» (ver #22).~~ — **resuelto 2026-11-02**: «Perfil público», «Claro» y «Nueva» pasan a `ink` en `/redisena perfil` (`5427dee`); «Cuento del día» ya estaba en `ink` desde la corrección de QA de Inicio.
    - ~~**Texto blanco sobre el ámbar de `STREAK_PHASES`** (ver #22).~~ — **resuelto 2026-11-02** en Social: ya no se usa.
    - **Trueque no tocado** (`onAccent` sin revisar): `MyPlaces.jsx` 120, 246 y 307; `TruequeMain.jsx` 289, 300 y 347.
24. **Ideas para después (solo documentadas, no implementadas):** chocan con el rechazo de degradados de `sema-identidad` y requieren la decisión de León antes de diseñarse.
    - ~~Publicaciones con degradado tipo Fable, de rosa a naranja.~~ — **implementado 2026-11-02 solo para «libro terminado»**, por pedido de León (`/redisena social`, `b11723e`): zona con `SEMA_GRADIENTS.acento` (cereza → durazno, permitido como acento en `sema-identidad` §2) y la portada al frente; el texto chico va sobre `bg`. Las demás publicaciones no llevan degradado.
    - Reseñas con color propio según la calificación o el tono.
25. **Tanda de rediseño 2026-11-02 — pendientes** (rama `rediseno-tanda-2026-11-02`, commits `cf7dd8e` → `39a59a9`; nada fusionado a `main` ni desplegado). Las decisiones propias de los agentes quedan para que León las apruebe con captura.
    - **Descubrir:**
      - El «Nº XXXX» del boleto es inventado y la lectora no lo entiende (el crítico sugiere «Admite 1»); también el giro del boleto.
      - Los géneros favoritos no se pueden editar desde Perfil, así que el vacío «Sin géneros favoritos no se arma la pila.» no tiene salida.
      - «Por leer» frente a «Quiero leer»: hay que elegir uno para toda la app.
      - El «+» flotante queda a ~9 px del corazón y no tiene etiqueta visible (es global, fuera de alcance).
      - La pared de pago tras 3 guardados es decisión de producto.
      - La tarjeta con foto no lleva marca SEMA; el panel de info es un bloque negro grande en modo claro (lo vio QA).
      - Decisiones propias: genérica visible mientras carga la foto (con fundido), sin sinopsis en la genérica por debajo de 700 px, contorno `inkSoft` en lugar de sombra, sellos «GUARDAR»/«PASO», línea del gato al vaciar la pila.
      - `COVER_PALETTES` (App.jsx ~347) sigue con vino y dorado en Perfil › Mis libros.
      - `LimitModal`: el foco no entra al abrirlo. `ReadingStatusModal` todavía no tiene `role="dialog"`.
      - Los vacíos con el gato no se verificaron en captura.
    - **Para ti:**
      - Falta la tarjeta 9:16 «el gato me recomendó» (principio 7).
      - Decisiones propias: gato en `superficieSuave` (y no con contorno), contador no sticky, hilo colapsado por defecto al llegar los resultados, filas sin sinopsis ni estado, monograma también en Inicio.
      - El lila se ve deslavado en oscuro (`firma`/`onFirma` es el único par que pasa, 5.21).
      - Las razones de la IA vienen en segunda persona (el prompt vive en `services/`, fuera de alcance); «Recomendado para ti» también.
      - `LoadingEntertainment` no se usa (App.jsx ~253).
      - El borde del buscador da 1.41:1.
      - El «+» tapa la razón de un resultado al hacer scroll (aceptado).
      - Al cambiar de pestaña el scroll no vuelve a 0 (Social y Perfil abren a media página tras Para ti; preexistente).
      - Verificar en Android que el paso 5 no abra el teclado solo.
    - **Social:**
      - «Compartir» en libro terminado y en frase: los modales de compartir (`BookShareModal`, `QuoteShareModal`) usan `BRAND.gradientShareCard` vino/café, no son 9:16 y piden datos que el feed no tiene.
      - El cuento del día a mitad del feed: la lectora dice que parece anuncio, y el crítico nota que el primer pantallazo no tiene acción durazno.
      - Queda un hueco a la derecha del composer y de «Tengo 5 minutos» por el «+».
      - El gato del centro de la barra no tiene etiqueta visible (`NAV_ITEMS`, fuera de alcance).
      - `achievementsService`: descripciones en segunda persona y nombres con género (servicios, fuera de alcance).
      - Invitaciones con copy viejo en App.jsx ~6069 y ~6587; `UAMLibraryView` (~6971) y ~5591 con blanco sobre durazno.
      - El texto de 13 px del sticker de racha queda en 4.68:1 con la textura: no subir el papel.
      - La barra inferior con papel y filo también cambió en Inicio: confirmar que gusta ahí.
      - Decisiones propias: orden nuevo, racha compacta, reseña sin rótulo azul dentro de «terminado», «Empezó a leer» sin relleno en oscuro, neutras sin tarjeta, logro como sticker, monograma en «terminado», filo blanco de la barra en oscuro.
    - **Perfil:**
      - Decisiones propias: sin franja cuando no hay foto de portada, nivel 1 oscuro del calendario en `superficieSuave` con filo, días por venir al 85 %, vista corta de logros solo con los desbloqueados, rejilla de 3 columnas, leyenda con rangos, «2 de 27 logros», texto del aviso sin conexión.
      - «Sema» en el texto de invitación: confirmar.
      - Los errores al subir foto solo se ven dentro del modal (lógica, no se tocó).
      - Fuera de alcance: velo del avatar y fondos de modales en `rgba(42,31,26,…)`; botón de copiar de `InviteShareModal` en durazno chico; celebración «¡Logro desbloqueado!» con emoji y degradado vino; «¡Copiado! ✓» (~5851).
      - `HEATMAP_COLORS` sigue con la paleta vieja en la historia del Wrapped (~10757) y `genrePillStyle` en el perfil de amigo.

26. **Ronda 2 de rediseño 2026-11-02 — pendientes** (rama `rediseno-ronda2-2026-11-02`; nada fusionado ni desplegado).
    - **Datos duplicados ya guardados:** las filas `reading_session` duplicadas siguen en la base; el feed las oculta. Para borrarlas: `supabase/limpieza_posts_duplicados_2026-11-02.sql` (pasos 1-2 leen, 3 borra; sin ejecutar). Likes duplicados: `supabase/lote_ui_2026-11-01.sql` (sin ejecutar). El SQL compara par contra par en la ventana de 10 min (no por hora) y se queda con el de más peso (texto > comentarios > likes > más viejo); usa una vista temporal, así que los pasos 2 y 3 van en la misma sesión del SQL Editor. Al ocultar un gemelo, sus likes y comentarios no se suman al que se muestra; al borrar la tarjeta se borran también sus gemelos (`duplicateIds`). Notificaciones: se juntan solo las de la misma persona, tipo y destino en 2 min (dos likes a sesiones distintas del mismo libro en menos de 2 min se verían como uno). ESLint no está configurado en el repo (QA no pudo correrlo).
    - **Offline:** si se registra sin conexión y se comparte con comentario, el comentario no se guarda (el post se crea al sincronizar el log, sin texto).
    - **Decisiones propias para León:** ciruela como barra en oscuro; barra sin sombra (en claro se separa del blanco solo por color); cinta lila del activo; gato sobre sticker lila; degradado frío del cuento por día; portada con capitular (no ilustración por cuento); franja de color también en «Libro terminado» (el crítico la prefería neutra); frase del feed sin ciruela; etiqueta «Nota»; sesión sin libro con tarjeta; portada y cintas de color en el perfil de amigo; promedio dentro de «Calificaciones»; géneros neutros; encuestas colapsadas, 650 ms de «escribiendo…», ancho 320 px y cierre «Si yo fuera tú, que no lo soy, hoy leería esto».
    - **Fuera de alcance (anotado por revisores):** panel de Mascota con emojis y fondo pastel; «+» visible en Ajustes de Perfil; «Más cuentos» con tarjetas arena idénticas; puntos lila de «Leyendo ahora»; mascota del amigo sobre disco lila redondo en oscuro; `CompareProfilesView` con colores viejos; `QuotePostCard` sin uso; caracteres «✓» en textos de estado (Buscalibre, «¡Copiado! ✓», «Enviada ✓», «¡Publicado! ✓», «✓ En feed», toasts).

27. **Ronda 3 de ajustes 2026-11-02 — pendientes y decisiones para León** (rama `rediseno-ronda2-2026-11-02`; nada fusionado ni desplegado).
    - **Claves de Anthropic en la máquina:** `ANTHROPIC_API_KEY` de `.env.local` y la vieja `VITE_ANTHROPIC_API_KEY` de `.env` responden 401 en Anthropic. Para probar la IA en local con clave propia hay que poner una válida en `.env.local`; mientras tanto, `SEMA_API_TARGET`. Conviene borrar `VITE_ANTHROPIC_API_KEY` de `.env` (no se usa en el código y el prefijo `VITE_` la expondría al cliente si alguien la leyera).
    - **Decisiones propias (ronda 3):** gato de 300 px (supera «el gato pequeño» de sema-identidad §5; actualizar la skill si se aprueba); contorno del gato solo en oscuro, con PNG horneado `cat-recorte.png`; globo con cola bajo las patas (opción b); saludo en tres líneas a 32 px; barrido del botón cada 24 s (León pidió «rara vez», el crítico pedía quitarlo); anillo del botón en `ink` (en oscuro `onAccent` sobre negro no se veía); reflejo fijo al 30 %; `SEMA_PAPEL` como color fijo fuera de `palette` (precedente: `SEMA_EXTENDIDA`); fecha «02 NOV» en el talón en vez de «Nº 306»; estampilla mostaza/limón por `pickByHash`; «8 MIN DE LECTURA» se queda (copy sugiere «8 MIN» para igualar «Más cuentos»); 13 px en los boletos (14 px toca la portada); `petLine` nocturna desde las 20 h; la línea de sesión caída («Se cerró la sesión. Entra de nuevo a la cuenta y aquí sigo.») sin botón de reintento; prompt de recomendaciones en voz de compa.
    - **Sugerencias no aplicadas:** «Intentar otra vez» como `StickerButton` (hoy píldora durazno como el resto del chat); anillo de foco del gato recortado 16 px por `<main>` (`outline-offset` negativo si molesta); con racha «en pausa» a 360 px la fila crece dos líneas y el gato baja con ella (si se quiere fijo: `alignItems: flex-start`); nombres de más de ~11 letras pueden partirse a 360 px; `aria-label` con la frase completa en los boletos si algún lector deletrea «MIN»; eje `wdth` de Bricolage o una mono si se quiere condensada de verdad.
    - **Bug reproducible solo con datos:** el estado `session` de «Para ti» no se capturó (haría falta invalidar el token del usuario de prueba).

28. **Ronda 4 (2026-11-03) — pendientes y decisiones para León** (rama `rediseno-ronda4-2026-11-03`; nada fusionado ni desplegado).
    - **Tipografía:** la combinación Unbounded + Space Mono se eligió sin León (comparativa en `capturas/ronda4-2026-11-03/{home,social-mock,cuento}-{a,b,c}-antes-*.png`); sema-identidad §7 ya la documenta como pendiente de su aprobación. Si prefiere otra, basta cambiar `SEMA_FONTS` y `FONT_LINK` en `theme.js`. Los otros dos `labelStyle` en Unbounded (`App.jsx` ~1309 y ~2716, fuera de Perfil) no se tocaron.
    - **Decisiones propias:** la cinta de tipo se conserva a todo el ancho (pedido de León) aunque el crítico la ve como «escalera arcoíris» con ocho publicaciones seguidas (se bajó a 27 px); el sello de Libro terminado es un fechador con la fecha real del post y vive en el recorte de la reseña (sin reseña no hay sello); el Cuento del día perdió la estampilla «N MIN DE LECTURA» por la regla de dos detalles (los boletos los pidió León en la ronda 3); la racha de Social es un boleto recto igual al de Inicio (la de Perfil sigue siendo el sticker girado de rondas anteriores); el «+» ya no vuelve por inactividad, solo al subir o al tope/fondo; `SelloTinta` cae a tinta por defecto; la demo del kit solo existe en desarrollo; «12 días seguidos» en vez de «días de racha» (copy, opcional) no se aplicó; la nota a mano se queda aunque repita en parte el porcentaje.
    - **Sugerencias no aplicadas:** «Más cuentos» como boletos del kit; mover el «+» a la cabecera junto a la campana; el menú de tres puntos como hoja inferior (hoy es anclado y podría recortarse en una publicación propia muy corta con libro); `HEATMAP_COLORS`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS` y `genrePillStyle` siguen con la paleta vieja; `.sema-composer-fab` quedó sin uso en `index.css`.
    - **QA (2026-11-03):** build OK, ESLint sin configurar, sin errores de consola nuevos, sin scroll horizontal a 360/390, sin hex ni familias a mano fuera de `theme.js`, sin emojis nuevos (el de «Galería» en `PetHub` es anterior). Único hallazgo: en Social, con el feed a todo el ancho, el «+» en reposo tapa el final de la última línea de texto de la publicación que queda a su altura (a media página es inherente a un botón flotante; antes la tarjeta tenía margen derecho). Decisión para León: dejarlo así (se esconde al bajar), mover el «+» a la cabecera junto a la campana, o reservar aire a la derecha de la última línea de cada publicación. Capturas `qa-*` en `capturas/ronda4-2026-11-03/`.
    - **No verificado:** el modal «¿Cuál retomamos?» (requiere 2+ libros en curso; el lomo lleva la misma corrección que Inicio); el boleto por ánimo en «Para descubrir» (la IA devolvió género en todas las pruebas); el estado `session` caído de «Para ti».
29. **Ronda 5 (2026-11-04) — pendientes y decisiones para León** (rama `rediseno-ronda5-2026-11-03`; nada fusionado ni desplegado).
    - **SQL sin ejecutar:** `supabase/racha_hitos_2026-11-03.sql` (CHECK de `posts.type` con `'racha'` + índice único parcial user_id/content). Sin él el hito falla en silencio con un aviso en consola y, si dos dispositivos registran a la vez, el único freno es la consulta previa.
    - **Autorizaciones de paleta que siguen pidiendo tu ojo:** `separadorFeed` en oscuro (`#141414` sobre `#000` mide ≈ 1.1:1 y casi no se ve; sugerencia del crítico `#1E1E1E`) y los colores de la llama (excepción solo para la ilustración).
    - **Decisiones propias:** botón «doble» se queda con reflejo y degradado (lo que mostraba la referencia) aunque el crítico lo ve como «de juego»; sticker del gato en Mascota se queda del tamaño actual (el crítico propone −35 % y sombra sólida); cartel de hito se queda de ≈ 860 px de alto; llama se queda de tres lenguas (solo se quitó el halo del nivel 3); «Esto ya es récord.» + sello se quedan juntos (pedido explícito); Libro terminado conserva portada, recorte y sello girados.
    - **Correcciones aplicadas tras crítico, accesibilidad y QA:** textura de cartón más tenue donde hay texto chico (boleto/globo 0.50, barra 0.35, hito 0.34/0.28, Libro terminado 0.40) y `stitchTiles` contra la costura; etiquetas de la barra en Figtree (no Unbounded a 12 px); cuadrito lila de la barra al 75 % en claro; cinta del boleto movida al borde superior (tapaba el saludo); un solo sello «Muy pronto» en PetHub; bordes del cartel de hito a 2 px.
    - **Sugerencias no aplicadas:** autor bajo el título en Libro terminado; saludo de Inicio a 22–24 px (hoy en tres líneas); gato de Inicio con −24 px de margen (los bigotes quedan a ≈ 8 px del borde); guion en la portada genérica «El nom-bre del Viento»; el «+» sigue tapando texto del feed (pendiente desde la ronda 4); `.sema-carton > *` fuerza `position: relative` a sus hijos directos (hoy ninguno es absoluto).
    - **QA (2026-11-04):** build OK, ESLint sin configurar (no hay `eslint.config.*`), sin desborde horizontal a 360/390, un solo 404 de `/api/books` (normal en dev). Capturas en `capturas/ronda5-2026-11-03/` (`*-qa-*` para regresión; `hitos-*` para el catálogo de carteles).

30. **Collages MVP (2026-11-06) — pendientes y decisiones para León** (rama `collages-mvp`; nada fusionado ni desplegado).
    - **Correr `supabase/collages_mvp_2026-11-06.sql`** en el SQL Editor antes de desplegar el cliente. Hasta entonces todo funciona en modo local (por navegador) y la compra con gemas está apagada. Lo guardado en modo local no se migra al servidor.
    - **PNG del set `tinta` pendientes** (`tinta-hongo`, `-luna`, `-ojo`, `-escarabajo`, `-espiral`): `stickers-tinta.zip` no llegó a la raíz. Pasos cuando lleguen:
      1. Descomprimir en `assets-fuentes/stickers/tinta/`.
      2. Correr `python scripts/collage-assets.py stickers`.
      3. Hacer commit de `public/collage/stickers/tinta-*.webp` y `min/`. Sin ellos, el kit inicial solo trae Papeles y la bandeja muestra el título «Tinta» sin piezas.
    - ~~Un solo set de racha~~ → resuelto: 4 sets de 6 (Trance, Tercer ojo, Olimpo, Bodegón). Con 30 % y red de seguridad, los 4 salen en ~13 registros en promedio. Las agrupaciones y nombres son decisión propia: revisar en la bandeja.
    - ~~Precio de `sello`~~ → 100 gemas, igual que Botánico (decisión de León, 2026-11-06).
    - ~~Mención de Sema Plus en el tope~~ → texto de León: «Collages ilimitados en Sema Plus (próximamente).»
    - **Capturas a revisar** en `capturas/collage/2026-11-06-*` (editor, bandeja, modo capas, bote, sets bloqueados, hoja Listo, celebración, feed).
    - **Sin probar en un celular real:** gestos probados con toques simulados por CDP en Chromium (24 de 24 pasan, claro y oscuro); falta iPhone/Safari (vibración no existe en iOS; el modo capas se ve por el temblor y el halo).
    - **Publicar y compartir no se probaron contra producción** (el script bloquea escrituras para no ensuciar la base): la subida a `post-images` usa el mismo nombre plano `<user>_…` que `compressAndUploadPostImage`; si las policies del bucket (no versionadas) piden otro formato, ajustar `publicarCollage`.
    - **Vista previa como data URL en `collages.preview`** (≤ 400 KB por CHECK): suficiente para 5 collages; si se quita el tope (Plus), mover a un bucket privado.
    - **Racha offline:** las sesiones que se sincronizan después (`syncPendingLogs`) también tiran, pero solo si el día del servidor sigue siendo el del registro.
    - **Celebración en desarrollo:** `?collage=premio` (solo con `import.meta.env.DEV`; muestra el primer set de racha del catálogo).
    - **Sets nuevos (Nevermore, Arcanos, Lado B):** nombres, descripciones y nombres de piezas son decisión propia. «Amontillado» para el barril y «Corazón delator» son guiños a los cuentos de Poe.
    - **`musica/revisar-marcas/`** (púa de Nirvana, walkman, póster de Radiohead, boleto de The Cure): fuera de la app hasta revisar marcas.
    - **El SQL es seguro para producción** (revisado 2026-11-06): solo crea tablas, funciones, triggers y permisos nuevos; ningún ALTER/UPDATE/DELETE/DROP sobre lo existente.
    - **De la revisión (crítico, accesibilidad, copy) quedó sin hacer:** el set Botánico se ve «boho / Etsy» según el crítico (mandala, nudos, luna y sol con cara) y propone abrir con piezas urbanas (boletos, cinta, sellos): decisión de León sobre los stickers; flechas con tabindex itinerante en pestañas y grupos de opciones (hoy funcionan con Tab); borde del lienzo 1.5 px `ink` en lugar de sombra (hecho) pero el contraste del filo sobre fondo negro en oscuro es el de la tinta blanca; mover una pieza a un punto con un toque (solo arrastre o flechas).
    - **Marca «Sema» en lo exportado:** decisión propia para que las historias digan de dónde salen. Confirmar si se queda.
    - **Fondos lisos vivos quitados** (lila, durazno, mostaza, menta, cielo): decisión propia por sema-identidad §6. Si León los quiere, se regresan en `coloresFondo` del JSON.

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
| Trueque limitado a 25 zonas de CDMX | ✅ RESUELTO 2026-10-03 (⚠️ requiere correr `trueque_geo.sql`) | Estado obligatorio (32 estados) + hasta 3 pines aproximados; matching por cercanía en Postgres; v3 retiró las zonas por completo |
| La búsqueda de matches cobraba 20 gemas aunque no encontrara nada | ✅ RESUELTO 2026-10-03 | RPC única `search_trueque_matches`: bloquea saldo, genera y cobra solo si hay resultados, en la misma transacción |
| Sin forma de reportar usuarios del Trueque | ✅ RESUELTO 2026-10-03 (parcial: sin bloqueo ni moderación en app) | Botón "Reportar" en el chat + `trueque_reports` + RPC `report_trueque_user` |
| Sin reglas de seguridad ni confirmación de mayoría de edad | ✅ RESUELTO 2026-10-03 | "Antes de empezar" + `accept_trueque_rules`; triggers impiden publicar/chatear sin aceptarlas; aviso fijo en el chat |
| Sin medición del Trueque | ✅ RESUELTO 2026-10-03 | Vista `trueque_funnel_summary` (solo SQL Editor) |
| Dos sistemas de ubicación conviviendo (zonas de CDMX + pines) | ✅ RESUELTO 2026-10-03 (v3; ⚠️ re-correr `trueque_geo.sql`) | Solo pines en UI y matching; zonas como historial en la BD |
| Marcar lugares solo tocando el mapa (difícil encontrar un punto) | ✅ RESUELTO 2026-10-03 (v3) | Buscador de lugares con Nominatim arriba del mapa |

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
cp .env.example .env.local   # llenar VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY (y opcionales, ver §III); server.js lee .env y luego .env.local
npm run dev            # levanta proxy Anthropic (3001) + Vite (5173) con concurrently
# Sin clave de Anthropic válida: SEMA_API_TARGET=https://folio-final.vercel.app npm run dev  (el /api de Vite usa el backend desplegado)
```

**Flujo de pruebas manual (no hay suite):**
1. `npm run build` debe compilar limpio.
2. Smoke test: login → Home sin overlay rojo → registrar sesión → verificar racha/XP → feed → perfil.
3. Consola sin errores rojos (los `[streak]`, `[GEMS]`, `[PET]` logs informativos son normales).
4. Si tocaste recompensas: verificar en Supabase que `reward_ledger` registró la fila UNA sola vez.

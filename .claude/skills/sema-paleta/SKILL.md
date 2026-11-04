---
name: sema-paleta
description: Paleta exacta de SEMA (modo claro y oscuro), reglas de contraste y la tabla token → valor claro → valor oscuro → uso para src/theme.js. Leer SIEMPRE antes de elegir, revisar o aplicar un color en SEMA. Nadie inventa otros colores.
---

# SEMA — Paleta

Valores exactos. **Nadie inventa otros colores.** Si una pantalla necesita un color que no está aquí, se detiene el trabajo y se pregunta a León en el reporte.

> **2026-11-02:** León eligió el **durazno** como primario (`accent` `#F79F79` en claro, `#F9B294` en oscuro, texto encima `#483A58`) después de comparar lila, cereza, durazno y azul acero en Inicio (`capturas/home/comparacion-primario-2026-11-02.png`). La cereza `#F45B69` deja de ser la acción principal.

## 1. Modo claro (principal)

| Rol | Valor | Texto encima | Uso |
|---|---|---|---|
| Fondo | `#FFFFFF` | Tinta | Fondo de toda la app |
| Tinta | `#483A58` | — | Texto principal, íconos, logo |
| Texto secundario | `#5E5768` | — | Texto secundario y placeholders |
| Acción principal (durazno) | `#F79F79` | siempre `#483A58` (`onAccent`) | Botón «Leer ahora», progreso, píldora activa de filtros. Ya no marca la pestaña activa de la barra inferior (ronda 2, 2026-11-02). Nunca texto sobre blanco |
| Firma de marca | `#BBADFF` | siempre `#483A58` | Racha, stickers, resaltados, cinta de la pestaña activa de la barra inferior (en claro con contorno `#483A58`: lila sobre arena da 1.41), marcos de celebración. La barra en sí es `superficieSuave` con el canto rasgado del mismo papel, sin lila |
| Acento cálido | `#F79F79` | `#483A58` | Celebraciones, gemas, segundo sticker. Desde el 2026-11-02 es el mismo valor que la acción principal: en una pantalla, el durazno relleno es la acción y el cálido solo aparece en detalles chicos |
| Superficie suave | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del blanco |
| Complemento frío | `#456990` | `#FFFFFF` (`onColor`) cuando es fondo; sirve como texto sobre blanco | Enlaces, estados informativos, íconos secundarios, filete de las reseñas del feed |
| Cereza (solo en degradado) | `#F45B69` | ver §5 | **Ya no es acción principal.** Solo existe como extremo del `degradadoAcento`; nunca sola como relleno ni como texto |
| Éxito («Leído») | `#5C6B3D` | — | Token actual `success` de `theme.js` |
| Error | `#B03A2E` | — | Errores y acciones destructivas |

## 2. Modo oscuro (secundario)

| Rol | Valor | Uso / nota |
|---|---|---|
| Fondo | `#000000` | Negro puro. Nunca café ni azul tinta |
| Tinta | `#FFFFFF` | Texto principal |
| Texto secundario | `#E7D7C1` | Texto secundario y placeholders |
| Acción principal | `#F9B294` | Durazno aclarado para negro. Texto encima `#483A58` (5.85:1). Sobre negro también sirve como texto (11.82:1). Se descartó `#F0B9A0` (12.15:1) porque se ve deslavado y beige |
| Firma | `#BBADFF` | Sobre negro **sí** puede ser texto |
| Acento cálido | `#F79F79` | |
| Superficie suave | `#483A58` | Con texto `#FFFFFF` |
| Complemento frío | `#456990` | **Solo en elementos grandes** |
| Éxito | `#7A9B5C` | Token actual `success` oscuro de `theme.js` |
| Error | `#E5675B` | Token actual `danger` oscuro de `theme.js` (`#B03A2E` sobre negro da 3.49:1 y no alcanza) |

## 3. Reglas de contraste

- **Tres colores nunca son texto sobre blanco:** `#BBADFF`, `#F79F79` y `#E7D7C1`.
- **`#483A58` nunca es texto sobre negro.**
- **Mínimos:** 4.5:1 en texto normal y 3:1 en texto grande. WCAG llama texto grande a ≥ 24 px normal o ≥ 18.66 px en negritas. **Si una combinación no llega, se cambia.**

Contraste medido (fórmula WCAG 2.x, 2026-11-02):

| Texto | Fondo | Contraste | Resultado |
|---|---|---|---|
| `#483A58` tinta | `#FFFFFF` | 10.39 | Pasa todo |
| `#5E5768` secundario | `#FFFFFF` | 6.91 | Pasa todo |
| `#483A58` | `#F79F79` acción (claro) | 5.04 | Pasa todo: es el texto del botón principal |
| `#483A58` | `#F9B294` acción (oscuro) | 5.85 | Pasa todo |
| `#F79F79` acción como texto | `#FFFFFF` | **2.06** | **Prohibido como texto.** Como relleno de botón o píldora va con texto `#483A58`; como barra de progreso o ícono no llega a 3:1 sobre blanco, así que necesita borde o un elemento grande al lado |
| `#FBD4C3` acción suave | `#FFFFFF` | **1.37** | **Prohibido como texto.** Solo fondo (hover, «Leyendo») con texto `#483A58` encima (7.57:1) |
| `#FFFFFF` | `#F79F79` / `#F9B294` | 2.06 / 1.78 | **Prohibido**: sobre durazno el texto es siempre `#483A58` |
| `#483A58` | `#7A2E2E` vino de BRAND / `#B03A2E` badge | **1.12 / 1.73** | **Prohibido**: sobre colores oscuros o saturados el texto es `onColor` `#FFFFFF` |
| `#483A58` | `#BBADFF` firma | 5.21 | Pasa todo |
| `#483A58` | `#F79F79` cálido | 5.04 | Pasa todo |
| `#483A58` | `#E7D7C1` superficie | 7.36 | Pasa todo |
| `#456990` frío | `#FFFFFF` | 5.71 | Pasa todo |
| `#5C6B3D` éxito | `#FFFFFF` | 5.79 | Pasa todo |
| `#B03A2E` error | `#FFFFFF` | 6.02 | Pasa todo |
| `#5E5768` secundario | `#E7D7C1` superficie | 4.90 | Pasa todo |
| `#456990` frío | `#E7D7C1` superficie | 4.05 | **Solo texto grande** |
| `#5C6B3D` éxito | `#E7D7C1` superficie | 4.11 | **Solo texto grande** |
| `#FFFFFF` | `#000000` | 21.00 | Pasa todo |
| `#E7D7C1` secundario oscuro | `#000000` | 14.89 | Pasa todo |
| `#BBADFF` firma | `#000000` | 10.53 | Pasa todo |
| `#F79F79` cálido | `#000000` | 10.19 | Pasa todo |
| `#F9B294` acción oscura | `#000000` | 11.82 | Pasa todo (en oscuro sí sirve como texto) |
| `#FFFFFF` | `#483A58` superficie oscura | 10.39 | Pasa todo |
| `#456990` frío | `#000000` | **3.68** | **Solo elementos grandes** (como pide la regla) |
| `#7A9B5C` éxito oscuro | `#000000` | 6.67 | Pasa todo |
| `#E5675B` error oscuro | `#000000` | 6.42 | Pasa todo |
| `#483A58` | `#000000` | **2.02** | **Prohibido** |
| `#BBADFF` | `#FFFFFF` | **1.99** | **Prohibido** |
| `#F79F79` | `#FFFFFF` | **2.06** | **Prohibido** |
| `#E7D7C1` | `#FFFFFF` | **1.41** | **Prohibido como texto.** Como línea divisoria es decorativa |
| `#FFFFFF` | `#BBADFF` / `#F79F79` | 1.99 / 2.06 | **Prohibido**: sobre firma y cálido el texto es siempre `#483A58`, también en modo oscuro |

## 5. Degradados permitidos (2026-11-02)

Dos base, definidos en `theme.js` como `SEMA_GRADIENTS` (más las variantes de «Libro terminado» de §7, ronda 2), y solo como **acento** en tarjetas destacadas y barras de progreso. Nunca como fondo de pantalla completa ni debajo de texto largo (sema-identidad §2).

| Nombre | Valor | Dónde | Texto encima |
|---|---|---|---|
| `degradadoAcento` | `linear-gradient(135deg, #F45B69 0%, #F79F79 100%)` (cereza → durazno) | Tarjeta «libro terminado» del feed, barra de progreso de «Seguir leyendo», tarjetas destacadas | `#483A58` **solo en texto grande** (≥ 19 px en negritas o ≥ 24 px): sobre la cereza da 3.24:1 y sobre el durazno 5.04:1. El texto chico (13–15 px) **no va sobre el degradado**: va sobre `bg` o sobre `superficieSuave` dentro de la misma tarjeta. Blanco está prohibido (3.21 / 2.06) |
| `degradadoFrio` | `linear-gradient(135deg, #BBADFF 0%, #456990 100%)` (lila → azul acero) | Barras de progreso y marcos; nunca de fondo de texto | **Ninguno.** No hay un color que pase en los dos extremos (`#483A58` falla sobre el azul, blanco falla sobre el lila) |

Las barras de progreso con degradado llevan borde de 1.5 px en `ink` (como la pista actual de `ProgressBarBook`), porque el durazno y el lila no llegan a 3:1 sobre blanco por sí solos.

## 6. Color de las publicaciones del feed (2026-11-02, ronda 2: el tipo ya no define el color)

**Sistema actual (punto 7 de León, ronda 2).** Todas las publicaciones tienen el **mismo formato**: tarjeta neutra (`bg` + borde `border`, radio 16, sin sombras de color) → **franja superior** con ícono Lucide + etiqueta → cabecera (avatar, nombre, hora; sin verbo, el qué lo dice la franja) → cuerpo → pie (me gusta, comentarios).

- **El color de la franja se asigna por publicación**, no por autor ni por tipo: `assignSequenceColors(ids)` de `theme.js` sobre la lista ordenada de publicaciones visibles (`useMemo` en `FeedView`). Es determinista (no cambia al recargar) y dos publicaciones seguidas no repiten color. Sale de la paleta extendida (§7).
- **Texto e ícono de la franja: siempre `#483A58`** (el `on` del color), 14 px negritas: 4.77–7.88:1 en los nueve colores, en claro y en oscuro.
- **El tipo se distingue por ícono + etiqueta**, no por color:

| Tipo | Ícono | Etiqueta de la franja | Cuerpo |
|---|---|---|---|
| Sesión (`reading_session`) | `BookOpen` | «Leyó · N páginas · M min» | Libro en línea (si hay) y texto |
| Empezó a leer (`book_update` started) | `BookOpen` | «Empezó a leer» | Libro en línea y texto |
| Libro terminado (`book_update` finished) | `BookmarkCheck` | «Libro terminado» | Zona con degradado de `SEMA_GRADIENTES_TERMINADO` (uno por publicación, `pickByHash(…, post.id)`), portada al frente y título en `#483A58` 22 px 800; debajo, sobre `bg`: autor, «Reseña» + estrellas y la reseña como cita **una sola vez** |
| Reseña suelta (`book_update` con reseña o calificación) | `MessageCircle` | «Reseña» + estrellas en `#483A58` | Libro en línea y la reseña como cita (filete `complementoFrio`) |
| Frase (`quote`) | `Feather` | «Frase» | La frase en Instrument Serif itálica grande, en `ink` sobre `bg`; libro en `inkSoft`; ánimo como sticker `firma` + `onFirma`. **Ya no es tarjeta ciruela** |
| Logro | `Award` | «Logro» | Sticker `firma` con papel, canto `bg`, filo `ink` y giro, con el nombre del logro (`onFirma` 20 px 800, 5.21:1) |
| Texto | `PenLine` | «Nota» (el código dice «Nota» desde la ronda 2; la skill decía «Publicó» y se corrige en la ronda 4) | Texto e imagen |

- **Ronda 4 (2026-11-03): ya no hay tarjeta.** La franja es una cinta de borde a borde (padding 5 px, 13 px 700), la publicación no lleva borde ni radio y se separa de la siguiente con una línea de 1 px en `borderSoft`. El resto del mapa sigue igual.
- En «Libro terminado», si el color asignado a la franja es un extremo de su degradado (o el de la publicación vecina), se avanza al siguiente color de la lista para que franja y degradado no se fundan.
- Los acentos de siempre no cambian dentro del cuerpo: filete azul acero de la reseña, sticker lila del ánimo y del logro.

Contraste de lo nuevo: franja `#483A58` sobre chicle 4.88, coral 4.83, mostaza 6.38, limón 7.88, menta 7.03, turquesa 5.12, cielo 5.40, pervinca 4.77, orquídea 5.03. Frase en `ink` sobre `bg`: 10.39 (claro) / 21.00 (oscuro); libro en `inkSoft`: 6.91 / 14.89. Título del terminado sobre su degradado: ≥ 4.5 en todos los extremos salvo la cereza del original (3.24, texto grande).

> Sustituye al mapa por tipo de la ronda 1 (lila = leyó, azul acero = reseña, ciruela = frase, superficie suave = empezó, sin tarjeta = texto y sesión sin libro).

## 7. Paleta extendida (apoyo, 2026-11-02, ronda 2)

Colores de **apoyo** para dar variedad donde muchas piezas iguales seguidas se volverían monótonas: franja superior de cada publicación del feed, degradados de «Libro terminado», banners del perfil de un amigo. **No reemplazan a los tokens**: la acción principal sigue siendo durazno con texto `#483A58`, la firma sigue siendo lila. Están en `src/theme.js` como `SEMA_EXTENDIDA` y son iguales en claro y oscuro.

| Clave | Nombre | Hex | Texto encima (`on`) | Contraste |
|---|---|---|---|---|
| `chicle` | Rosa chicle | `#FF8FB8` | `#483A58` | 4.88:1 |
| `coral` | Coral | `#FF9478` | `#483A58` | 4.83:1 |
| `mostaza` | Mostaza | `#F5C451` | `#483A58` | 6.38:1 |
| `limon` | Limón | `#F2E27A` | `#483A58` | 7.88:1 |
| `menta` | Menta | `#9DE3C3` | `#483A58` | 7.03:1 |
| `turquesa` | Turquesa | `#4FC9B4` | `#483A58` | 5.12:1 |
| `cielo` | Cielo | `#7CC3F0` | `#483A58` | 5.40:1 |
| `pervinca` | Pervinca | `#9AABFF` | `#483A58` | 4.77:1 |
| `orquidea` | Orquídea | `#E59BE6` | `#483A58` | 5.03:1 |

Reglas:
- **Texto encima siempre `#483A58`.** Blanco encima está prohibido (≤ 2.2:1 en todos).
- Sobre el fondo blanco ninguno llega a 3:1: se usan como **bloque de color con texto en tinta encima**, nunca como color de texto, de ícono suelto ni como único borde de un control. En oscuro (negro) todos pasan > 9:1.
- **Descartados** por apagados o fangosos: verde pantano, oliva, mostaza oscura, café. El verde `#5C6B3D` que queda en `theme.js` (`sage`, `success`, `session`) no se usa para variedad.
- **Asignación determinista**: `stableHash(id)` (FNV-1a) → índice. Nunca `Math.random()` en render. Para listas, `assignSequenceColors(ids)` evita que dos piezas seguidas repitan color.
- **Degradados de «Libro terminado»** (`SEMA_GRADIENTES_TERMINADO`, 135°): cereza → durazno (el original), chicle → mostaza, turquesa → cielo, orquídea → chicle, coral → limón, cielo → pervinca, menta → turquesa, pervinca → orquídea. Texto encima `#483A58` grande (≥ 19 px negritas); todos los extremos ≥ 4.5:1 salvo la cereza del original (3.24, solo grande). Uno por publicación con `pickByHash(SEMA_GRADIENTES_TERMINADO, post.id)`. Sigue valiendo §5: acento de una tarjeta, nunca fondo de pantalla.

## 4. Regla de implementación

- **Dónde viven los colores.** Solo en `src/theme.js`, como tokens semánticos (`PALETTE_LIGHT` / `PALETTE_DARK`).
- **Nombres de token.** Se conservan los existentes. Se agregan los que faltan: `firma`, `acentoCalido`, `superficieSuave` y `complementoFrio`. Se agrega también `onFirma`, porque sin él no hay forma correcta de poner texto sobre firma o cálido en modo oscuro (la tinta oscura es blanca y no alcanza contraste).
- **Tailwind no define colores.** No se agregan colores a `tailwind.config.js` ni se usan clases de color de Tailwind con hex.
- **Prohibido escribir hex fuera de `theme.js`.** Cada componente lee `palette.x` en el render (§X.14 de la documentación). `applyPaletteCssVars` expone automáticamente los tokens nuevos como `--sema-firma`, `--sema-acento-calido`, etc.

### Tabla token → valor claro → valor oscuro → uso

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#000000` | Fondo de la app |
| `bgSoft` | `#FFFFFF` | `#000000` | Secciones e inputs apagados: se separan con espacio, no con fondo |
| `bgCard` | `#FFFFFF` | `#000000` | Tarjetas y sheets sin separación de color; si deben separarse, usar `superficieSuave` |
| `ink` | `#483A58` | `#FFFFFF` | Texto principal, íconos, logo |
| `inkSoft` | `#5E5768` | `#E7D7C1` | Texto secundario |
| `inkFaint` | `#5E5768` | `#E7D7C1` | Captions, labels, placeholders |
| `accent` | `#F79F79` | `#F9B294` | Acción principal (durazno): botón, progreso, píldora activa. **No es texto sobre blanco** (2.06:1; links → `complementoFrio`, títulos y logo → `ink`) |
| `accentSoft` | `#FBD4C3` | `#FBD4C3` | Estado «Leyendo», hover de acción. Solo fondo, con `onAccent` encima |
| `amber` | `#F79F79` | `#F79F79` | Gemas, estrellas, celebración (= acento cálido) |
| `amberRich` | `#F79F79` | `#F79F79` | Estrellas llenas |
| `amberInk` | `#483A58` | `#F79F79` | Texto que antes iba en ámbar: tinta en claro, cálido en oscuro |
| `mauve` | `#BBADFF` | `#BBADFF` | Sugerencias IA (= firma). Como texto sobre blanco no se usa |
| `slate` | `#5E5768` | `#E7D7C1` | Amigo en comparativas, «Por leer» |
| `sage` | `#5C6B3D` | `#7A9B5C` | «Leídos», éxito suave (= éxito) |
| `border` | `#E7D7C1` | `#483A58` | Bordes de inputs y tarjetas. Si un input necesita 3:1 para identificarse, usar `inkSoft` |
| `borderSoft` | `#E7D7C1` | `#483A58` | Divisores |
| `onAccent` | `#483A58` | `#483A58` | Texto e íconos sobre `accent` y `accentSoft`, en ambos modos |
| **`onColor`** *(nuevo 2026-11-02)* | `#FFFFFF` | `#FFFFFF` | Texto e íconos blancos sobre colores oscuros o saturados (degradados de `BRAND`, `badge`, `sage`, avatares, botones de redes). Antes esos usos leían `onAccent`; se migran pantalla por pantalla |
| `onDark` | `#FFFFFF` | `#FFFFFF` | Texto sobre overlays negros |
| `onDarkSoft` / `onDarkFaint` / `onDarkMuted` | `#E7D7C1` | `#E7D7C1` | Texto secundario sobre overlays negros |
| `danger` | `#B03A2E` | `#E5675B` | Error, acción destructiva |
| `dangerSoft` / `dangerBorder` / `dangerInk` | sin cambio | sin cambio | Estados del sistema: conservan su valor actual |
| `success` | `#5C6B3D` | `#7A9B5C` | Éxito, «Leído» (valor actual) |
| `warnBg` / `warnBorder` / `warnInk` | sin cambio | sin cambio | Banner offline y avisos: conservan su valor actual |
| `like` | `#B03A2E` | `#E5675B` | Corazón (= danger) |
| `badge` | `#B03A2E` | `#B03A2E` | Contador de no leídos. En oscuro NO es `danger` (`#E5675B` con blanco encima da 3.27 y falla a 12 px); `#B03A2E` da 6.02 con blanco y 3.49 sobre negro como objeto |
| `unreadBg` | `#E7D7C1` | `#483A58` | Notificación no leída (= superficie suave) |
| `session` | `#5C6B3D` | `#7A9B5C` | Post de sesión de lectura (= éxito) |
| `sessionInk` | `#5C6B3D` | `#7A9B5C` | Texto del post de sesión |
| `freeze` | `#456990` | `#E7D7C1` | Protector de racha (frío en claro; en oscuro el frío no alcanza en íconos chicos) |
| **`firma`** *(nuevo)* | `#BBADFF` | `#BBADFF` | Racha, stickers, resaltados, cinta de la pestaña activa de la barra inferior |
| **`onFirma`** *(nuevo)* | `#483A58` | `#483A58` | Texto sobre `firma` y sobre `acentoCalido`, en ambos modos |
| **`acentoCalido`** *(nuevo)* | `#F79F79` | `#F79F79` | Celebraciones, gemas, segundo sticker |
| **`superficieSuave`** *(nuevo)* | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del fondo, barra inferior (con su canto rasgado). Texto encima: `ink` (activa) e `inkSoft` (inactivas: 4.90 en claro, 7.36 en oscuro) |
| **`complementoFrio`** *(nuevo)* | `#456990` | `#456990` | Enlaces, estados informativos, íconos secundarios, reseñas (en oscuro solo en elementos grandes) |
| **`SEMA_GRADIENTS.acento`** *(2026-11-02, fuera de `palette`)* | cereza → durazno | igual | Tarjetas destacadas y barras de progreso (§5) |
| **`SEMA_GRADIENTS.frio`** *(2026-11-02, fuera de `palette`)* | lila → azul acero | igual | Barras y marcos, sin texto encima (§5) |

### Fuera de `palette` (pendiente pantalla por pantalla)

`BRAND` (degradados `gradient*`, `confetti`), `QUOTE_POSTER_GRADIENTS`, `STATUS_COLORS`, `AVATAR_COLORS`, `COVER_PALETTES`, `HEATMAP_COLORS`, `STREAK_PHASES`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS`, `genrePillStyle` y `genreColor` todavía usan la paleta anterior (vino, ámbar, salvia, crema).

- **`/paleta` no los rediseña.** Solo los lista en su reporte.
- **Cada `/redisena` los cambia** cuando toca la pantalla que los usa, con valores de esta skill.
- **Los degradados viejos (vino → ámbar, etc.) se reemplazan** por color plano o por uno de los dos de §5. No se inventan degradados nuevos.

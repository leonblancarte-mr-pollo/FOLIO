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
| Acción principal (durazno) | `#F79F79` | siempre `#483A58` (`onAccent`) | Botón «Leer ahora», progreso, píldora de la pestaña activa. Nunca texto sobre blanco |
| Firma de marca | `#BBADFF` | siempre `#483A58` | Racha, stickers, resaltados, borde rasgado de la barra inferior, marcos de celebración, publicación «leyó hoy» |
| Acento cálido | `#F79F79` | `#483A58` | Celebraciones, gemas, segundo sticker. Desde el 2026-11-02 es el mismo valor que la acción principal: en una pantalla, el durazno relleno es la acción y el cálido solo aparece en detalles chicos |
| Superficie suave | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del blanco |
| Complemento frío | `#456990` | `#FFFFFF` (`onColor`) cuando es fondo; sirve como texto sobre blanco | Enlaces, estados informativos, íconos secundarios, reseñas (publicación «reseña» del feed) |
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

Solo dos, definidos en `theme.js` como `SEMA_GRADIENTS`, y solo como **acento** en tarjetas destacadas y barras de progreso. Nunca como fondo de pantalla completa ni debajo de texto largo (sema-identidad §2).

| Nombre | Valor | Dónde | Texto encima |
|---|---|---|---|
| `degradadoAcento` | `linear-gradient(135deg, #F45B69 0%, #F79F79 100%)` (cereza → durazno) | Tarjeta «libro terminado» del feed, barra de progreso de «Seguir leyendo», tarjetas destacadas | `#483A58` **solo en texto grande** (≥ 19 px en negritas o ≥ 24 px): sobre la cereza da 3.24:1 y sobre el durazno 5.04:1. El texto chico (13–15 px) **no va sobre el degradado**: va sobre `bg` o sobre `superficieSuave` dentro de la misma tarjeta. Blanco está prohibido (3.21 / 2.06) |
| `degradadoFrio` | `linear-gradient(135deg, #BBADFF 0%, #456990 100%)` (lila → azul acero) | Barras de progreso y marcos; nunca de fondo de texto | **Ninguno.** No hay un color que pase en los dos extremos (`#483A58` falla sobre el azul, blanco falla sobre el lila) |

Las barras de progreso con degradado llevan borde de 1.5 px en `ink` (como la pista actual de `ProgressBarBook`), porque el durazno y el lila no llegan a 3:1 sobre blanco por sí solos.

## 6. Mapa de color por tipo de publicación (feed, 2026-11-02)

| Tipo | Color | Texto |
|---|---|---|
| Leyó hoy (`reading_session` con libro) | `firma` lila como fondo de tarjeta o franja | `onFirma` `#483A58` |
| Libro terminado (`book_update` → leído) | `degradadoAcento` con la portada en primer plano | Título grande en `#483A58`; texto chico sobre `bg` |
| Reseña (`book_update` con reseña o calificación) | `complementoFrio` azul acero como franja o marco | `onColor` `#FFFFFF` sobre el azul; `ink` sobre `bg` |
| Frase guardada (`quote`) | Ciruela oscuro `#483A58` (`superficieSuave` oscuro / `ink` claro) de fondo, tipografía Instrument Serif itálica | `onColor` `#FFFFFF` (10.39:1) y `#E7D7C1` para secundario (7.36:1) |
| Sesión sin libro | Neutro: `bg` con texto `ink` y `inkSoft`, sin color | `ink` |
| Logro | `firma` (sticker) | `onFirma` |

**Implementación en Social (2026-11-02, ronda 2, pendiente de León).** Las publicaciones con color van en tarjeta neutra (`bg` + borde `border`, sin sombras de color) y el color vive solo en su franja o zona. Las que no tienen color (texto, sesión sin libro) no llevan tarjeta: van sobre el fondo, separadas con un filete abajo.

| Tipo | Zona de color | Fondo | Texto encima | Contraste (claro / oscuro) |
|---|---|---|---|---|
| Leyó (`reading_session` con libro) | Franja superior «Leyó · N páginas · M min» (sin «hoy»: la hora va en la cabecera) | `firma` `#BBADFF` | `onFirma` `#483A58`, 14 px negritas | 5.21 / 5.21 |
| Sesión sin libro | Sin tarjeta; el número de páginas en grande | `bg` | `ink` (24 px) y `inkSoft` | 10.39 / 21.00 |
| Empezó a leer (`book_update` started) | Franja superior «Empezó a leer». En oscuro, sin relleno y con filete abajo (la superficie `#483A58` era igual a la frase) | Claro `superficieSuave` `#E7D7C1`; oscuro `bg` | `ink` (`#483A58` / `#FFFFFF`) | 7.36 / 21.00 |
| Libro terminado (`book_update` finished) | Zona central con la portada grande al frente (real o genérica compacta) | `SEMA_GRADIENTS.acento` | Título en `onAccent` `#483A58` 22 px 800 (grande); único sticker «Libro terminado» sobre `bg`; autor y reseña debajo, sobre `bg` | Título 3.24 (cereza) – 5.04 (durazno); sticker 10.39 / 21.00 |
| Reseña dentro de «terminado» | Solo el filete izquierdo de 3 px del texto de la reseña | `complementoFrio` `#456990` (filete) | «Reseña» + estrellas Lucide en `ink`; la reseña en `ink` sobre `bg` | Filete 5.71 / 3.68 (objeto ≥ 3:1); texto 10.39 / 21.00 |
| Reseña suelta (`book_update` sin started/finished con reseña o calificación) | Franja superior «Reseña» + estrellas | `complementoFrio` | `onColor` `#FFFFFF` | 5.71 / 5.71 |
| Frase (`quote`) | Toda la tarjeta salvo el pie | `#483A58` (`ink` en claro / `superficieSuave` en oscuro) | `onColor` en Instrument Serif; secundario `onDarkSoft` `#E7D7C1`; ánimo como sticker `firma` + `onFirma` (sin el emoji de la etiqueta) | 10.39 · 7.36 · 5.21 |
| Texto | Sin tarjeta | `bg` | `ink` | 10.39 / 21.00 |
| Logro | Sticker rectangular con papel, canto `bg`, filo `ink` y giro, con el nombre del logro | `firma` | Ícono y nombre en `onFirma` (20 px 800) | 5.21 |

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
| **`firma`** *(nuevo)* | `#BBADFF` | `#BBADFF` | Racha, stickers, resaltados, borde rasgado de la barra inferior |
| **`onFirma`** *(nuevo)* | `#483A58` | `#483A58` | Texto sobre `firma` y sobre `acentoCalido`, en ambos modos |
| **`acentoCalido`** *(nuevo)* | `#F79F79` | `#F79F79` | Celebraciones, gemas, segundo sticker |
| **`superficieSuave`** *(nuevo)* | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del fondo. Texto encima: `ink` |
| **`complementoFrio`** *(nuevo)* | `#456990` | `#456990` | Enlaces, estados informativos, íconos secundarios, reseñas (en oscuro solo en elementos grandes) |
| **`SEMA_GRADIENTS.acento`** *(2026-11-02, fuera de `palette`)* | cereza → durazno | igual | Tarjetas destacadas y barras de progreso (§5) |
| **`SEMA_GRADIENTS.frio`** *(2026-11-02, fuera de `palette`)* | lila → azul acero | igual | Barras y marcos, sin texto encima (§5) |

### Fuera de `palette` (pendiente pantalla por pantalla)

`BRAND` (degradados `gradient*`, `confetti`), `QUOTE_POSTER_GRADIENTS`, `STATUS_COLORS`, `AVATAR_COLORS`, `COVER_PALETTES`, `HEATMAP_COLORS`, `STREAK_PHASES`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS`, `genrePillStyle` y `genreColor` todavía usan la paleta anterior (vino, ámbar, salvia, crema).

- **`/paleta` no los rediseña.** Solo los lista en su reporte.
- **Cada `/redisena` los cambia** cuando toca la pantalla que los usa, con valores de esta skill.
- **Los degradados viejos (vino → ámbar, etc.) se reemplazan** por color plano o por uno de los dos de §5. No se inventan degradados nuevos.

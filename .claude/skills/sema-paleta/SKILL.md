---
name: sema-paleta
description: Paleta exacta de SEMA (modo claro y oscuro), reglas de contraste y la tabla token → valor claro → valor oscuro → uso para src/theme.js. Leer SIEMPRE antes de elegir, revisar o aplicar un color en SEMA. Nadie inventa otros colores.
---

# SEMA — Paleta

Valores exactos. **Nadie inventa otros colores.** Si una pantalla necesita un color que no está aquí, se detiene el trabajo y se pregunta a León en el reporte.

## 1. Modo claro (principal)

| Rol | Valor | Texto encima | Uso |
|---|---|---|---|
| Fondo | `#FFFFFF` | Tinta | Fondo de toda la app |
| Tinta | `#483A58` | — | Texto principal, íconos, logo |
| Texto secundario | `#5E5768` | — | Texto secundario y placeholders |
| Acción principal | `#F45B69` | `#FFFFFF` en negritas, **mínimo 19 px** (ver §3) | Botón «Leer ahora», progreso, marca |
| Firma de marca | `#BBADFF` | siempre `#483A58` | Racha, stickers, resaltados, borde rasgado de la barra inferior |
| Acento cálido | `#F79F79` | `#483A58` | Celebraciones, gemas, segundo sticker |
| Superficie suave | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del blanco |
| Complemento frío | `#456990` | — (sirve como texto sobre blanco) | Enlaces, estados informativos, íconos secundarios |
| Éxito («Leído») | `#5C6B3D` | — | Token actual `success` de `theme.js` |
| Error | `#B03A2E` | — | Errores y acciones destructivas |

## 2. Modo oscuro (secundario)

| Rol | Valor | Uso / nota |
|---|---|---|
| Fondo | `#000000` | Negro puro. Nunca café ni azul tinta |
| Tinta | `#FFFFFF` | Texto principal |
| Texto secundario | `#E7D7C1` | Texto secundario y placeholders |
| Acción principal | `#F45B69` | Con texto `#FFFFFF` |
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
| `#FFFFFF` | `#F45B69` acción | **3.21** | **Solo texto grande.** León pidió 18 px en negritas, pero WCAG cuenta texto grande en negritas desde 18.66 px, así que el mínimo es **19 px en negritas** (o 24 px normal). Nunca texto chico blanco sobre coral |
| `#F45B69` acción como texto | `#FFFFFF` | **3.21** | **No se usa como texto normal sobre blanco.** Sí como relleno de botón, barra de progreso o ícono grande (3:1 de componente) |
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
| `#F45B69` acción | `#000000` | 6.55 | Pasa todo (en oscuro sí sirve como texto) |
| `#FFFFFF` | `#483A58` superficie oscura | 10.39 | Pasa todo |
| `#456990` frío | `#000000` | **3.68** | **Solo elementos grandes** (como pide la regla) |
| `#7A9B5C` éxito oscuro | `#000000` | 6.67 | Pasa todo |
| `#E5675B` error oscuro | `#000000` | 6.42 | Pasa todo |
| `#483A58` | `#000000` | **2.02** | **Prohibido** |
| `#BBADFF` | `#FFFFFF` | **1.99** | **Prohibido** |
| `#F79F79` | `#FFFFFF` | **2.06** | **Prohibido** |
| `#E7D7C1` | `#FFFFFF` | **1.41** | **Prohibido como texto.** Como línea divisoria es decorativa |
| `#FFFFFF` | `#BBADFF` / `#F79F79` | 1.99 / 2.06 | **Prohibido**: sobre firma y cálido el texto es siempre `#483A58`, también en modo oscuro |

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
| `accent` | `#F45B69` | `#F45B69` | Acción principal: botón, progreso, marca. **No es color de links** (en claro no alcanza como texto: usar `complementoFrio`) |
| `accentSoft` | `#F45B69` | `#F45B69` | Estado «Leyendo», hover de acción |
| `amber` | `#F79F79` | `#F79F79` | Gemas, estrellas, celebración (= acento cálido) |
| `amberRich` | `#F79F79` | `#F79F79` | Estrellas llenas |
| `amberInk` | `#483A58` | `#F79F79` | Texto que antes iba en ámbar: tinta en claro, cálido en oscuro |
| `mauve` | `#BBADFF` | `#BBADFF` | Sugerencias IA (= firma). Como texto sobre blanco no se usa |
| `slate` | `#5E5768` | `#E7D7C1` | Amigo en comparativas, «Por leer» |
| `sage` | `#5C6B3D` | `#7A9B5C` | «Leídos», éxito suave (= éxito) |
| `border` | `#E7D7C1` | `#483A58` | Bordes de inputs y tarjetas. Si un input necesita 3:1 para identificarse, usar `inkSoft` |
| `borderSoft` | `#E7D7C1` | `#483A58` | Divisores |
| `onAccent` | `#FFFFFF` | `#FFFFFF` | Texto sobre `accent` (negritas, ≥ 19 px) |
| `onDark` | `#FFFFFF` | `#FFFFFF` | Texto sobre overlays negros |
| `onDarkSoft` / `onDarkFaint` / `onDarkMuted` | `#E7D7C1` | `#E7D7C1` | Texto secundario sobre overlays negros |
| `danger` | `#B03A2E` | `#E5675B` | Error, acción destructiva |
| `dangerSoft` / `dangerBorder` / `dangerInk` | sin cambio | sin cambio | Estados del sistema: conservan su valor actual |
| `success` | `#5C6B3D` | `#7A9B5C` | Éxito, «Leído» (valor actual) |
| `warnBg` / `warnBorder` / `warnInk` | sin cambio | sin cambio | Banner offline y avisos: conservan su valor actual |
| `like` | `#B03A2E` | `#E5675B` | Corazón (= danger) |
| `badge` | `#B03A2E` | `#E5675B` | Contador de no leídos (= danger) |
| `unreadBg` | `#E7D7C1` | `#483A58` | Notificación no leída (= superficie suave) |
| `session` | `#5C6B3D` | `#7A9B5C` | Post de sesión de lectura (= éxito) |
| `sessionInk` | `#5C6B3D` | `#7A9B5C` | Texto del post de sesión |
| `freeze` | `#456990` | `#E7D7C1` | Protector de racha (frío en claro; en oscuro el frío no alcanza en íconos chicos) |
| **`firma`** *(nuevo)* | `#BBADFF` | `#BBADFF` | Racha, stickers, resaltados, borde rasgado de la barra inferior |
| **`onFirma`** *(nuevo)* | `#483A58` | `#483A58` | Texto sobre `firma` y sobre `acentoCalido`, en ambos modos |
| **`acentoCalido`** *(nuevo)* | `#F79F79` | `#F79F79` | Celebraciones, gemas, segundo sticker |
| **`superficieSuave`** *(nuevo)* | `#E7D7C1` | `#483A58` | Boletos, tarjetas que deban separarse del fondo. Texto encima: `ink` |
| **`complementoFrio`** *(nuevo)* | `#456990` | `#456990` | Enlaces, estados informativos, íconos secundarios (en oscuro solo en elementos grandes) |

### Fuera de `palette` (pendiente pantalla por pantalla)

`BRAND` (degradados `gradient*`, `confetti`), `QUOTE_POSTER_GRADIENTS`, `STATUS_COLORS`, `AVATAR_COLORS`, `COVER_PALETTES`, `HEATMAP_COLORS`, `STREAK_PHASES`, `FRIEND_STREAK_GRADIENT`, `WRAPPED_SLIDE_GRADIENTS`, `genrePillStyle` y `genreColor` todavía usan la paleta anterior (vino, ámbar, salvia, crema).

- **`/paleta` no los rediseña.** Solo los lista en su reporte.
- **Cada `/redisena` los cambia** cuando toca la pantalla que los usa, con valores de esta skill.
- **Los degradados son un rechazo de identidad:** se reemplazan por color plano y no se reinventan como degradados nuevos.

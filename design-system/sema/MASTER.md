# SEMA — Design System (MASTER)

> Fuente de verdad visual. Los valores viven en `src/theme.js`; este archivo explica el porqué.
> Generado con ui-ux-pro-max y ajustado a mano: la sugerencia automática (naranja/azul, Fredoka) se descartó porque no encaja con la marca.
> Última actualización: 2026-11-02 (paleta SEMA 2026-11 con durazno como acción principal).

**Producto:** app de lectura social para Gen Z (18–26 años), es-MX.
**Tono:** compa de 23 años: bromista con cariño, honesto. Frases cortas, sin segunda persona forzada ni sermones.
**Lema:** *slow motion > no motion*.

## Paleta (2026-11-02)

Los valores exactos y la tabla completa de tokens viven en `.claude/skills/sema-paleta/SKILL.md` (fuente de verdad) y se implementan en `src/theme.js`. Base neutra: los colores vivos solo como acento, nunca como fondo grande ni degradado.

| Rol | Claro | Oscuro | Token | Uso |
|---|---|---|---|---|
| **Fondo** | `#FFFFFF` | `#000000` | `bg` | Toda la app. Oscuro en negro puro, nunca café |
| **Tinta** | `#483A58` | `#FFFFFF` | `ink` | Texto principal, íconos, logo «sema» |
| **Secundario** | `#5E5768` | `#E7D7C1` | `inkSoft` / `inkFaint` | Texto secundario, captions |
| **Acción principal: durazno** | `#F79F79` | `#F9B294` | `accent` | El único botón relleno («Leer ahora»), progreso, píldora de la pestaña activa. Texto encima `#483A58` (`onAccent`) |
| **Durazno suave** | `#FBD4C3` | `#FBD4C3` | `accentSoft` | Hover y estado «Leyendo». Solo fondo |
| **Firma: lila** | `#BBADFF` | `#BBADFF` | `firma` | Racha (sticker), stickers, resaltados, borde rasgado de la barra inferior. Texto encima `#483A58` (`onFirma`) |
| **Superficie suave** | `#E7D7C1` | `#483A58` | `superficieSuave` | Boletos y tarjetas que deban separarse del fondo |
| **Complemento frío** | `#456990` | `#456990` | `complementoFrio` | Enlaces, estados informativos (en oscuro solo grande) |
| **Éxito** | `#5C6B3D` | `#7A9B5C` | `success` / `sage` | «Leído», progreso completado |
| **Error** | `#B03A2E` | `#E5675B` | `danger` | Errores, destructivo, corazón, badge |

Tokens de texto sobre color: `onAccent` `#483A58` (sobre durazno), `onFirma` `#483A58` (sobre lila y cálido), `onColor` `#FFFFFF` (sobre colores oscuros o saturados: badge, salvia, avatares, `BRAND`).

**Contraste:** durazno, durazno suave, lila y superficie **nunca son texto sobre blanco** (2.06 · 1.37 · 1.99 · 1.41:1). `#483A58` nunca es texto sobre negro (2.02:1). Texto mínimo 4.5:1; texto grande (≥ 24 px, o ≥ 18.66 px en negritas) 3:1.

Historia: del 2026-10-11 al 2026-11-02 la paleta fue de 5 colores (Crema `#F4EDE0`, Tinta `#2A1F1A`, Vino `#7A2E2E`, Ámbar `#C8924A`, Salvia `#5C6B3D`). `BRAND` y los datos de arte de `theme.js` todavía la usan hasta que cada `/redisena` toque su pantalla.

## Tipografía

| Uso | Fuente | Dónde |
|---|---|---|
| Títulos | **Bricolage Grotesque** (300–800) | `display`, `ts.h1`, `ts.h2`, números grandes, botones principales. No tiene cursiva: no usar `italic` |
| Interfaz | **Figtree** (300–900) | `body`, `ts.h3`, `ts.body15`, `ts.caption`, `ts.label`, inputs |
| Citas | **Instrument Serif** (regular + cursiva) | `quote` / `ts.quote`, citas del feed, tarjetas compartibles, lector de cuentos |

Escala: h1 28 · h2 20 · h3 17 · cuerpo 15 · caption/label 13 · cita 20+ (Instrument Serif se ve más chica que su tamaño nominal).

## Espacio

Escala de 8 px exportada como `sp` en `theme.js`: `xs` 0.5rem · `sm` 0.75 · `md` 1 · `lg` 1.5 · `xl` 2 · `xxl` 3. Entre bloques, `xl`; entre elementos de lista, `lg`; padding de pantalla 1.25rem.

## Los 8 principios de interfaz

1. **Una acción principal por pantalla.** Un solo botón relleno en durazno (`accent`) con texto `#483A58`; todo lo demás es texto o botón silencioso.
2. **Cero cajas dentro de cajas.** Se separa con espacio y tamaño de letra. Una tarjeta solo si es el contenedor de una acción (p. ej. portada), nunca borde + fondo + sombra sobre algo que ya está en una tarjeta.
3. **Emojis con intención.** Íconos de la interfaz: solo `lucide-react`. Emoji solo en contenido del usuario o momentos de celebración.
4. **Progreso siempre visible.** Racha y avance del libro a la vista: durazno mientras avanza, salvia (éxito) al completar; la racha va en lila (firma).
5. **Pedir en pequeño, celebrar en grande.** Pedir 5 minutos / una página; celebrar con confetti, mascota y tarjeta compartible.
6. **La mascota guía los avisos y los empty states.** Es quien habla cuando hay algo que decir (`EmptyState`, home).
7. **Todo lo compartible nace en 9:16.** Tarjetas de frase, libro terminado y Wrapped se diseñan primero en vertical.
8. **Revelar funciones de a poco.** Los primeros días solo lo mínimo (p. ej. “Descubre tu siguiente” aparece con 3+ libros).

## Estados y movimiento

Hover solo con mouse (`@media (hover: hover)`), `:active` para touch, `focus-visible` con `accent`, `prefers-reduced-motion` respetado. Duraciones 120–300 ms; la mascota respira, no vuela.

## Anti-patrones

Arcoíris para progreso · colores nuevos por pantalla · cursiva sintética sobre Bricolage · comillas decorativas gigantes · bordes en chips que ya tienen fondo · dos CTAs rellenos en la misma pantalla.

## Estado de aplicación (2026-10-11)

Aplicado: `theme.js` (paleta, tipografías, escala, `sp`), `HomeView`, `AppHeader`, `BookCard`/`LibraryView`, tarjetas de cita, lector de cuentos, barra de progreso. Pendiente de aplicar pantalla por pantalla: Perfil, Social, Chat, Explorar, modales y el Trueque (su carpeta no se tocó; hereda la paleta por tokens).

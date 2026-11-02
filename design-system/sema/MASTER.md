# SEMA — Design System (MASTER)

> Fuente de verdad visual. Los valores viven en `src/theme.js`; este archivo explica el porqué.
> Generado con ui-ux-pro-max y ajustado a mano: la sugerencia automática (naranja/azul, Fredoka) se descartó porque no encaja con la marca.
> Última actualización: 2026-10-11.

**Producto:** app de lectura social para Gen Z (18–26 años), es-MX.
**Tono:** compa de 23 años: bromista con cariño, honesto. Frases cortas, sin segunda persona forzada ni sermones.
**Lema:** *slow motion > no motion*.

## Paleta (5 colores principales)

| # | Nombre | Claro | Oscuro | Rol |
|---|---|---|---|---|
| 1 | **Crema** | `#F4EDE0` | `#1A1614` | Fondo de la app. Sus tintes (`bgSoft`, `bgCard`, `border`) son superficies, no colores nuevos |
| 2 | **Tinta** | `#2A1F1A` | `#F5EDE0` | Texto. `inkSoft` (`#5C4A3F`) y `inkFaint` (`#6E6054`) son sus tintes |
| 3 | **Vino** | `#7A2E2E` | `#C84F4F` | Acción principal, marca, estado activo, progreso en curso |
| 4 | **Ámbar** | `#C8924A` | `#D4A574` | Celebración: gemas, estrellas, resaltados. Texto sobre claro: `amberInk` `#8A5A1A` |
| 5 | **Salvia** | `#5C6B3D` | `#7A9B5C` | Éxito, “Leído”, progreso completado, sesión de lectura |

Fuera de los 5 (solo estados del sistema): `danger` `#B03A2E` (errores, destructivo, corazón) y los fondos suaves `warn*`/`danger*` derivados.
Alias que se conservan por compatibilidad pero apuntan a los 5: `accentSoft` = vino claro; `mauve` = `accentSoft`; `slate`/`freeze` = `inkSoft`; `amberRich` = `amber`; `session`/`success` = salvia; `like`/`badge` = `danger`.
Contraste mínimo 4.5:1 en texto (verificado para `inkFaint` sobre `bg`, `bgSoft` y `bgCard`).

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

1. **Una acción principal por pantalla.** Un solo botón relleno en vino; todo lo demás es texto o botón silencioso.
2. **Cero cajas dentro de cajas.** Se separa con espacio y tamaño de letra. Una tarjeta solo si es el contenedor de una acción (p. ej. portada), nunca borde + fondo + sombra sobre algo que ya está en una tarjeta.
3. **Emojis con intención.** Íconos de la interfaz: solo `lucide-react`. Emoji solo en contenido del usuario o momentos de celebración.
4. **Progreso siempre visible.** Racha y avance del libro a la vista: vino mientras avanza, salvia al completar.
5. **Pedir en pequeño, celebrar en grande.** Pedir 5 minutos / una página; celebrar con confetti, mascota y tarjeta compartible.
6. **La mascota guía los avisos y los empty states.** Es quien habla cuando hay algo que decir (`EmptyState`, home).
7. **Todo lo compartible nace en 9:16.** Tarjetas de frase, libro terminado y Wrapped se diseñan primero en vertical.
8. **Revelar funciones de a poco.** Los primeros días solo lo mínimo (p. ej. “Descubre tu siguiente” aparece con 3+ libros).

## Estados y movimiento

Hover solo con mouse (`@media (hover: hover)`), `:active` para touch, `focus-visible` con vino, `prefers-reduced-motion` respetado. Duraciones 120–300 ms; la mascota respira, no vuela.

## Anti-patrones

Arcoíris para progreso · colores nuevos por pantalla · cursiva sintética sobre Bricolage · comillas decorativas gigantes · bordes en chips que ya tienen fondo · dos CTAs rellenos en la misma pantalla.

## Estado de aplicación (2026-10-11)

Aplicado: `theme.js` (paleta, tipografías, escala, `sp`), `HomeView`, `AppHeader`, `BookCard`/`LibraryView`, tarjetas de cita, lector de cuentos, barra de progreso. Pendiente de aplicar pantalla por pantalla: Perfil, Social, Chat, Explorar, modales y el Trueque (su carpeta no se tocó; hereda la paleta por tokens).

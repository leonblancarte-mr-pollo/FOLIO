---
name: sema-identidad
description: Identidad visual y principios de interfaz de SEMA (base neutra blanca, acentos vivos, actitud en los detalles, tipografía, los 8 principios, lo aprobado y lo rechazado). Leer SIEMPRE antes de diseñar, revisar o criticar cualquier pantalla de SEMA.
---

# SEMA — Identidad

Esta skill es la regla. Si algo no está aquí, en `sema-paleta` o en `sema-voz`, no se inventa: se pregunta a León en el reporte final.

## 1. Base

- **Base neutra.** Blanco `#FFFFFF` como fondo principal.
- **El modo claro es el primario.** Se diseña primero en claro.
- **Modo oscuro con negro puro `#000000`.** Nunca café ni azul tinta.

## 2. Color vivo solo como acento

Los colores vivos van **solo como acento**: botones, celebraciones, stickers y racha.

Nunca se usan como fondo grande ni como degradado.

## 3. Principio rector

**Interfaz limpia; la actitud vive en los detalles y en los momentos.**

- **Dónde va la actitud:** la celebración al terminar un libro, los stickers, la tarjeta 9:16 para historias, el Wrapped, los estados vacíos y la mascota.
- **Qué se mantiene limpio:** el feed, el estante y la lectura.

## 4. Referencias

- **Actitud.** Urbana, alternativa: flyer, zine, collage, stickers, boletos de tren, cómic, cine, pop art. Organizada, nunca saturada.
- **App de referencia: Soko.** Lo que se toma de ella:
  - fondo claro casi neutro;
  - un solo acento;
  - tipografía con carácter;
  - detalles como los bordes dentados.

## 5. Aprobado por León

- **Barra inferior** con borde superior **rasgado tipo revista**, en lila (firma `#BBADFF`).
- **Stickers y boletos** como complementos.
- **El gato en Inicio:** pequeño, nunca ocupando la pantalla.
- **Textura de papel arrugado:**
  - Dónde se permite: solo en stickers y tarjetas.
  - Cómo: sutil, hecha con CSS o SVG inline.
  - Nunca como fondo de pantalla completa ni con imágenes pesadas.

## 6. Rechazado

- Pasteles como fondo.
- Degradados suaves.
- Estética de app de bienestar.
- Look «generado por IA».
- Morado saturado sobre azul tinta.
- Cualquier cosa que parezca biblioteca seria.

## 7. Tipografía

| Uso | Fuente |
|---|---|
| Títulos | **Bricolage Grotesque** |
| Interfaz | **Figtree** |
| Citas | **Instrument Serif** |

**Nada de textos de 8 a 11 px.**

## 8. Los 8 principios de interfaz

Copiados tal cual de `design-system/sema/MASTER.md`:

1. **Una acción principal por pantalla.** Un solo botón relleno en vino; todo lo demás es texto o botón silencioso.
2. **Cero cajas dentro de cajas.** Se separa con espacio y tamaño de letra. Una tarjeta solo si es el contenedor de una acción (p. ej. portada), nunca borde + fondo + sombra sobre algo que ya está en una tarjeta.
3. **Emojis con intención.** Íconos de la interfaz: solo `lucide-react`. Emoji solo en contenido del usuario o momentos de celebración.
4. **Progreso siempre visible.** Racha y avance del libro a la vista: vino mientras avanza, salvia al completar.
5. **Pedir en pequeño, celebrar en grande.** Pedir 5 minutos / una página; celebrar con confetti, mascota y tarjeta compartible.
6. **La mascota guía los avisos y los empty states.** Es quien habla cuando hay algo que decir (`EmptyState`, home).
7. **Todo lo compartible nace en 9:16.** Tarjetas de frase, libro terminado y Wrapped se diseñan primero en vertical.
8. **Revelar funciones de a poco.** Los primeros días solo lo mínimo (p. ej. “Descubre tu siguiente” aparece con 3+ libros).

> **Nota de lectura.** MASTER.md se escribió con la paleta anterior. Al aplicar estos principios:
> - «vino» = **acción principal** de `sema-paleta`;
> - «salvia» = **éxito**.
>
> Los principios no cambian; solo cambian los colores.

## 9. Regla de proceso

- **Una pantalla a la vez.**
- **Nada se fusiona a `main` sin la aprobación de León con captura.**

La paleta exacta está en la skill sema-paleta; la voz en sema-voz.

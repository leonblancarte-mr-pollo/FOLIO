# FOLIO — Sistema de Mascotas Evolutivas
## Documento maestro de diseño, arquitectura e implementación

> Versión 1.0 — 15 de julio de 2026
> Basado en auditoría real del código (`src/App.jsx`, `src/index.css`, `public/pets/`, esquema Supabase vivo)

---

# 0. RESUMEN EJECUTIVO

FOLIO ya tiene un sistema de mascota funcional pero embrionario: un solo gato, niveles 1–50 por XP, sin evoluciones visuales, sin tienda, sin mensajes contextuales, con un sistema de gemas **ya implementado pero deliberadamente oculto en la UI**. Este documento especifica cómo convertir ese embrión en el loop de retención central de FOLIO.

**Las 5 decisiones más importantes de este documento (y donde contradigo el brief):**

1. **El gato NO debe convertirse en siamés.** El gato actual es un gato negro que sostiene un libro con la cola. Esa silueta ES su identidad. Cambiar especie y color rompe el reconocimiento que el propio brief exige ("debe verse claramente mejor pero reconocible"). Propongo: mantener gato negro + libro en la cola como firma, elevar la calidad y despegarlo del parecido con Jiji de *Kiki's Delivery Service* (riesgo de IP real, detallado en §2.2).
2. **Lanzar con 4 mascotas, no 6.** Gato, Búho, Zorro y Luciérnaga cubren los 4 arquetipos emocionales. Serpiente y Mariposa se lanzan como "drops" post-MVP (contenido nuevo = re-engagement gratis, §2.1).
3. **No reemplazar el sistema de niveles 1–50: montarle encima las etapas de evolución.** Los usuarios actuales ya tienen niveles ganados. La evolución visual (4 etapas) se mapea sobre bandas de nivel + hitos de libros, con lógica OR, no AND (§2.3).
4. **La economía no puede vivir en el cliente.** Hoy XP y gemas se escriben desde el navegador con RLS deshabilitado: cualquiera con la anon key puede darse 1M de gemas. Antes de abrir la tienda, la autoridad pasa a Postgres (RPC `SECURITY DEFINER` + triggers, §8). Esto es bloqueante, no opcional.
5. **La felicidad no es una barra que baja: es un estado narrativo.** "Happiness -10" es castigo disfrazado. Se reformula como estados visuales (despierto / soñoliento / te extraña) sin números rojos visibles (§2.5).

---

# 1. AUDITORÍA DEL CÓDIGO EXISTENTE

## 1.1 Dónde vive todo hoy

| Pieza | Ubicación | Estado |
|---|---|---|
| Lógica pet (load/create/rename/XP) | `src/App.jsx:1084-1203` | Funcional |
| `PET_TYPES` (solo `gato`) | `src/App.jsx:1087-1094` | 1 tipo, PNG |
| Event bus (`petBus`) | `src/App.jsx:1099-1106` | Funcional |
| `PetDisplay` (sprite + sombra) | `src/App.jsx:12078-12098` | Funcional |
| `PetOnboarding` (naming, 1 solo gato) | `src/App.jsx:12100-12209` | Sin selección |
| `PetLevelUpToast` | `src/App.jsx:12211-12234` | Funcional |
| `PetScene` (escena SVG día/noche) | `src/App.jsx:12236-12279` | Funcional, bonita |
| `PetHub` (pantalla Tamagotchi) | `src/App.jsx:12282-12394` | Tienda/objetos = "¡muy pronto!" |
| Animaciones CSS | `src/index.css:244-316` | bob + respiración + levelUp |
| Sistema de gemas (`user_gems`) | `src/App.jsx:1008-1082` | **Implementado pero UI oculta** (`showGemToast` es no-op en `App.jsx:13615`) |
| Otorgamiento XP | `App.jsx:896` (+3 racha/día), `:956` (+2 por 10 págs), `:13917/13952` (+50 libro terminado) | Cliente-side |
| Assets | `public/pets/cat.png`, `cat-blink.png` (SIN USAR), `cat-video.mp4` (SIN USAR) | Raster PNG |

## 1.2 Esquema real de `user_pets` (difiere del brief)

```sql
-- Lo que existe HOY en producción (según el código):
user_pets (
  id uuid PK, user_id uuid UNIQUE REFERENCES users(id),
  pet_type text DEFAULT 'gato', pet_name text DEFAULT 'Mi compañero',
  xp int DEFAULT 0, level int DEFAULT 1,
  created_at timestamptz, updated_at timestamptz
)
-- ⚠️ RLS DESHABILITADO (el propio código lo instruye en App.jsx:1115 y :1141)
```

Nota importante: el FK apunta a la tabla propia `users`, **no** a `auth.users` como propone el brief. Los triggers de §8 respetan esto.

## 1.3 Hallazgos críticos

1. **El "parpadeo" del brief no existe.** `cat-blink.png` está en `public/pets/` pero ningún código lo referencia. El idle real es `petIdle` (bob ±2px, 3.5s) + `petBreath` (scale 1.018, 4s). Buena noticia: el asset del frame de parpadeo ya existe y cablearlo es trivial (§5.2).
2. **La racha SE RESETEA** (`checkStreakOnLoad`, `App.jsx:884-889`): `current_streak → 0` tras >1 día sin leer (hay 1 día de freeze). El brief exige "se PAUSA, no se resetea". Hay que cambiar esta función y el copy (§2.4).
3. **Gemas: economía fantasma.** `user_gems` ya acumula balance (+5 bienvenida, daily claim con `consecutive_days`, +50 por libro, +10 por logro) pero el comentario en `App.jsx:13613` dice: *"la moneda visible es SOLO el XP de la mascota"*. La tienda del MVP simplemente reactiva lo que ya existe.
4. **XP duplicable multi-dispositivo:** el gate del +3 diario de racha es `localStorage` (`App.jsx:893`), así que dos dispositivos = doble XP. Se corrige al mover la autoridad a SQL (§8).
5. **Riesgo de propiedad intelectual:** `cat.png` es visualmente casi idéntico a Jiji (*Kiki's Delivery Service*, Studio Ghibli): gato negro, ojos enormes crema, orejas con interior morado. Para una app con ambición comercial esto es una demanda esperando fecha. El rediseño es también una necesidad legal, no solo estética.
6. **`App.jsx` tiene 14,469 líneas.** Multiplicar el sistema de mascotas ×6 dentro del monolito es insostenible. Sprint 1 incluye extracción a módulo `src/pets/` (§13).
7. Ya existen piezas aprovechables: sonidos (`howler`), hápticos (`src/haptics.js`), confetti (`canvas-confetti`), toasts, `PetScene` con modo día/noche, perfil de amigo que muestra su mascota (`App.jsx:6320-6323`), y teaser de mascota en Home (`App.jsx:9997-10005`).

---

# 2. DONDE RETO AL BRIEF (respuestas a tus 5 preguntas + lo que falta)

## 2.1 ¿6 mascotas o menos? → **4 al lanzamiento**

**Matemática de assets:** MVP = 3 etapas visuales por mascota. Cada etapa necesita: base + frame parpadeo + pose de reacción al tap + variante feliz. ≈ 4 estados × 3 etapas = **12 assets por mascota**. Con 6 mascotas son 72 ilustraciones consistentes entre sí; con 4 son 48. Con un solo ilustrador (o pipeline IA + limpieza manual), 72 assets consistentes en 4 semanas es fantasía; 48 es apretado pero posible.

**Psicología:** la paradoja de la elección (Schwartz) aplica en onboarding: 6 opciones con personalidades matizadas aumenta el tiempo de decisión y el arrepentimiento post-elección. 4 arquetipos limpios (sofisticado / nerd entusiasta / aventurero / calmado) cubren el espectro emocional sin solapamiento. Serpiente (introspectiva) solapa con Gato (crítico-reflexivo); Mariposa (transformadora) solapa con Luciérnaga (esperanza suave).

**El beneficio oculto:** lanzar Serpiente y Mariposa en el mes 2-3 como eventos ("llegó alguien nuevo a FOLIO…") es un beat de contenido que reactiva usuarios dormidos gratis. Un roadmap de mascotas > todas las mascotas el día 1.

**Decisión propuesta:** MVP = Gato (rediseño), Búho, Zorro, Luciérnaga. Post-MVP = Serpiente (mes 2), Mariposa (mes 3).

## 2.2 ¿El rediseño del gato es riesgo para early users? → **Sí, si cambias su identidad. El brief se contradice a sí mismo.**

El brief pide "gato siamés elegante" Y "debe verse claramente mejor pero reconocible". **Un siamés crema con máscara oscura NO es reconocible como el gato negro actual.** Attachment theory (que el propio brief invoca) dice que el vínculo es con ESE individuo: su color, su silueta, su gesto. Los usuarios le pusieron nombre a un gato negro.

**Propuesta que resuelve ambas cosas:**
- **Se mantiene:** gato negro, ojos grandes crema, el libro sostenido con la cola (esta es su firma única — ninguna otra app la tiene), proporciones cabezonas.
- **Cambia:** estilo de render (de "anime AI-gen" a vector suave del sistema §4), interior de orejas pasa de morado-Jiji a **terracota FOLIO** (`#C8924A`), ojos rediseñados con forma propia (almendrados con brillo doble, no los círculos Jiji), collar con dije de pluma (nuevo elemento distintivo), y postura ligeramente más erguida y "crítica".
- La personalidad "sofisticado, crítico, cita a Borges" funciona idéntica en un gato negro — de hecho mejor (gato negro = misterio literario).

Esto elimina el riesgo IP (§1.3.5), mantiene el vínculo, y da el upgrade visual. La animación de migración "tu gato ha crecido" (§9) hace el resto.

## 2.3 ¿Los umbrales de evolución están bien calibrados? → **No. Tres problemas.**

**Problema 1 — Condiciones AND castigan al lector casual.** "3 libros + 7 días de racha" para la primera evolución: un Gen Z casual lee 1 libro al mes. Su primera evolución llegaría en el mes 3 — muerto mucho antes. La primera recompensa visible debe llegar en la **primera semana** (Hooked: la inversión temprana necesita retorno temprano).

**Problema 2 — El brief ignora el sistema vivo.** Ya hay usuarios con nivel 10, 20+ en el sistema 1–50. Imponer la tabla del brief los "degradaría" a etapa 1-2. Regla de oro: **nadie pierde nada nunca**.

**Problema 3 — 5 etapas para 4 diseños.** El brief lista 4 evoluciones visuales por mascota pero la tabla tiene 5 niveles. Simplifico a 4 etapas visuales.

**Calibración propuesta (lógica OR, montada sobre niveles existentes):**

| Etapa visual | Se alcanza con (cualquiera) | Usuario casual llega en | Usuario activo |
|---|---|---|---|
| 1 · Cría | Creación | Día 0 | Día 0 |
| 2 · Joven | Nivel 3 **o** 1 libro terminado **o** racha 7 días | Semana 1-2 | Día 3-5 |
| 3 · Sabio/a | Nivel 10 **o** 5 libros **o** racha 21 días acumulados | Mes 2-3 | Semana 3-4 |
| 4 · Místico/a | Nivel 25 **o** 20 libros **o** (10 libros + 4 géneros) | Mes 6-12 | Mes 2-3 |

- El nivel 1–50 sigue existiendo como sub-progresión (la barra XP diaria que ya funciona). La etapa es `GREATEST(etapa_por_nivel, etapa_por_libros)` — calculada en SQL (§8.3).
- Usuarios existentes se mapean el día del deploy: la mayoría verá a su gato **subir** de etapa inmediatamente = la migración se siente como regalo.
- El momento exacto de evolución sigue siendo semi-impredecible para el usuario (no mostramos "te faltan 2 libros para evolucionar" — solo pistas vagas de la propia mascota: *"me siento… diferente últimamente"*). Eso preserva la variable reward.

## 2.4 ¿La economía de gemas se sostiene sin premium? → **Sí, con dos condiciones.**

Simulación completa en §11. Resumen: un usuario activo gana ~500-700 gemas/mes con las fuentes del MVP. Con 30 accesorios entre 150 y 1,500 gemas, eso compra 1-2 items/mes — cadencia sana (deseo constante, frustración nula). Las condiciones:

1. **Autoridad server-side primero.** Con RLS deshabilitado y `addGemsDB` en el cliente, la primera persona que abra DevTools se regala 99,999 gemas y la economía muere de credibilidad. §8 lo resuelve.
2. **Los sinks deben escalar con la antigüedad.** Si en el mes 2 el usuario ya compró todo lo que le gusta, las gemas dejan de motivar. El catálogo necesita 2-3 items nuevos/mes (barato de producir: son accesorios 2D) y 1 item "aspiracional" de 1,500+ que tome 2 meses ahorrar.

**Lo que NO haría en MVP:** el ratio dinámico 3:1 → 1.5:1 del brief. Cambiar el valor de la moneda a los 30 días es exactamente el tipo de "letra chica" que Gen Z huele y castiga en redes. Un solo ratio, transparente. Ajustes de economía se hacen por el lado de PRECIOS de items nuevos, nunca devaluando lo ganado.

## 2.5 ¿Qué crítico falta al brief? → Siete cosas.

1. **Seguridad/anti-cheat (bloqueante).** Ya explicado. Sin esto no hay economía, hay un juguete roto.
2. **"Happiness -10" contradice el anti-castigo.** Una barra que baja ES castigo, la vea o no el usuario como número. Reformulación: `happiness` existe en DB como driver interno, pero la UI solo muestra **estados**: ≥80 radiante · 50-79 contento · 20-49 soñoliento/nostálgico ("te estuve guardando un lugar") · piso duro en 20. Nunca barra roja, nunca cara de sufrimiento, nunca "está triste POR TU CULPA". La mascota dormida es tierna, no culpígena.
3. **La racha actual resetea (código) y el brief exige pausa.** Cambio concreto: `checkStreakOnLoad` deja de poner `current_streak = 0`; en su lugar marca `paused_at`. Al volver, la racha continúa donde quedó, y la mascota dice "¡seguimos donde lo dejamos!". El `longest_streak` y los récords jamás se tocan. (Nota de diseño honesta: una racha que nunca muere pierde algo de urgencia; lo compensamos con el bonus de racha *continua* de 7 días — la pausa conserva el contador pero interrumpe el multiplicador semanal.)
4. **No hay sistema de analytics.** Todo el pitch es "retención", pero la app no trackea eventos. Sin `pet_opened`, `pet_tapped`, `evolution_seen`, `shop_viewed`, `item_purchased` no se puede validar ni una sola hipótesis de §14. Sprint 1 incluye una tabla `analytics_events` mínima.
5. **Triggers SQL del brief asumen cron y tablas que no existen.** El trigger "3+ días sin leer" necesita un job programado; Supabase tiene `pg_cron` pero el MVP no debería depender de él: la decadencia de felicidad se computa **lazy** al abrir la app (una función SQL idempotente, §8.4). Mismo resultado, cero infraestructura.
6. **El monolito.** 14.5k líneas en un archivo + 6 mascotas × mensajes × tienda = deuda que congela el desarrollo en el sprint 3. La extracción a `src/pets/` es trabajo del sprint 1, no "algún día".
7. **Presupuesto de arte y pipeline no definidos.** El brief pide "ilustración vectorial suave" pero el pipeline actual es PNG generado por IA + limpieza. Decisión pragmática (§5.1): **PNG por capas** (cuerpo / ojos abiertos / ojos cerrados / accesorio) animado con CSS — mantiene el pipeline actual, permite parpadeo real, y no requiere aprender Lottie ni riggear SVG a mano. Lottie queda para post-MVP si entra un motion designer.

---

# 3. ARQUITECTURA

## 3.1 Estructura de módulos (post-extracción, Sprint 1)

```
src/
├── App.jsx                    (adelgazado: solo orquestación)
├── pets/
│   ├── petTypes.js            → catálogo: 6 tipos, etapas, assets, paletas, personalidad
│   ├── petService.js          → loadPet, createPet, renamePet, RPC calls (ya NO escribe xp directo)
│   ├── petMessages.js         → motor de mensajes contextuales (§10) + los 300+ textos
│   ├── petBus.js              → event bus existente, movido
│   ├── usePet.js              → hook: estado del pet + suscripción a petBus + realtime
│   ├── components/
│   │   ├── PetDisplay.jsx     → sprite por capas + parpadeo + reacción al tap
│   │   ├── PetScene.jsx       → escenas por hábitat/etapa (extiende la actual)
│   │   ├── PetHub.jsx         → pantalla principal (rediseñada §6.1)
│   │   ├── PetOnboarding.jsx  → selección estilo Pokémon (§6.4)
│   │   ├── PetShop.jsx        → tienda (§6.2)
│   │   ├── PetHistory.jsx     → feed de memorias (§6.3)
│   │   ├── PetEvolutionModal.jsx → ceremonia de evolución
│   │   ├── PetMigrationModal.jsx → "tu gato ha crecido" (§9)
│   │   └── PetLevelUpToast.jsx
│   └── assets → public/pets/{tipo}/{etapa}/{capa}.png
```

## 3.2 Flujo de datos (quién es la autoridad)

```
ANTES (hoy):  React ──escribe xp/gemas──▶ Supabase (RLS OFF)   ❌ hackeable
DESPUÉS:      React ──"terminé libro"──▶ books UPDATE
                                          └─▶ TRIGGER SQL ──▶ user_pets.xp, user_gems,
                                                              pet_interactions, evolution check
              React ◀──realtime/refetch── resultado (nivel, etapa, mensaje)
```

Reglas:
- El cliente **nunca** escribe `xp`, `level`, `happiness`, `balance`. Solo escribe hechos (libro terminado, sesión de lectura, compra solicitada vía RPC).
- Los triggers derivan recompensas de los hechos. Un hecho = una recompensa (idempotencia por constraint).
- La compra es un RPC `purchase_item(item_id)` `SECURITY DEFINER` que valida saldo y descuenta atómicamente.
- `petBus` sigue existiendo para la UX inmediata (optimistic UI), pero el estado real siempre se re-lee de DB.

## 3.3 Diagrama entidad-relación

```
users ──1:1── user_pets ──1:N── pet_evolution_log
                 │├──────1:N── pet_interactions        (mensajes mostrados / memorias)
                 │├──────1:N── pet_shop_purchases ──N:1── pet_shop_inventory
                 │└──────N:M── pet_social_interactions (post-MVP)
users ──1:1── user_gems ──1:N── gem_ledger             (NUEVA: auditoría de cada gema)
books ─────(trigger al pasar a 'read')────▶ recompensas
reading_logs ──(trigger insert)──▶ xp por páginas + racha
```

`gem_ledger` no está en el brief pero es esencial: sin un libro mayor de movimientos, depurar "me faltan gemas" es imposible y el fraude es invisible.

---

# 4. SISTEMA DE DISEÑO VISUAL

## 4.1 Fundamentos compartidos (las 6 mascotas)

- **Paleta madre (ya es la de FOLIO):** crema `#F4EDE0`, tinta `#2A1F1A`, vino `#7A2E2E`, terracota `#C8924A`, verde bosque `#2E5A3E`, azul noche `#131F38`. Cada mascota toma 2 colores propios + los neutros.
- **Proporciones:** cabeza = 40-45% de la altura total (cría) bajando a 33% en etapa 4 (madurar = estilizarse). Ojos enormes SIEMPRE (es el rasgo de familia que unifica el universo).
- **Trazo:** contorno orgánico de grosor variable, color tinta cálida (`#2A1F1A`), nunca negro puro. Esquinas redondeadas, cero ángulos agresivos.
- **Regla del accesorio literario:** cada mascota interactúa con un objeto de lectura a su manera (el gato: libro en la cola; el búho: lentes y pergamino; el zorro: mapa/brújula; la luciérnaga: ilumina la página). Esto ancla todas al tema de FOLIO.
- **Evolución visual por capas:** E1 formas planas → E2 + textura/patrón → E3 + accesorio simbólico → E4 + aura/glow (CSS, no en el asset: el glow se hace con `filter: drop-shadow` animado, así un solo asset sirve para modo claro y oscuro).

## 4.2 Rediseño del Gato Literario (spec de cambios exactos)

**Se conserva (identidad):** gato negro, ojos crema grandes, libro sostenido por la cola, proporción cabezona, postura sentada.

**Cambios concretos:**

| Elemento | Hoy (`cat.png`) | Rediseño |
|---|---|---|
| Render | Anime AI-gen, sombreado duro | Vector suave, sombreado en 2 tonos planos |
| Ojos | Círculos crema estilo Jiji | Almendrados, iris ámbar `#C8924A`, doble brillo |
| Orejas (interior) | Morado (Jiji) | Terracota `#C8924A` |
| Nariz/gesto | Neutro | Cejas expresivas (el rasgo "crítico") |
| Cuello | Nada | Collar tinta con dije de pluma dorada |
| Libro en cola | Morado genérico | Encuadernado vino `#7A2E2E` con lomo dorado |
| Pelaje | Negro plano | Negro azulado `#1E1B24` con brillo de luna en el lomo (E2+) |

**Sus 4 etapas:** E1 Gatito (sin collar, libro pequeño) → E2 Gato (collar + textura de brillo) → E3 Gato Sabio (lentes de media luna dorados, el libro ahora abierto) → E4 Gato Místico (aura índigo tenue, motas de polvo de estrella, ojos con destello constante).

**Cambios en código:** `PET_TYPES.gato.img` pasa de string a objeto de etapas por capas (§5.3); `cat.png` se conserva en disco solo para la animación de migración (§9).

## 4.3 Las otras mascotas (proporciones, paleta, gestos)

**BÚHO NOCTÁMBULO** — colores: azul noche `#1E3050` + crema; panza con patrón de plumas en "U". Ojos = 50% de la cara (el más ojón de todos). Gesto firma: inclina la cabeza 15° cuando "pregunta". E1 Polluelo (bolita de plumón) → E2 Búho Joven (lentes redondos ENORMES) → E3 Búho Sabio (bufanda de pergamino con runas) → E4 Búho Cósmico (interior de alas = gradiente galaxia, único gradiente permitido en el sistema). Reacción al tap: gira la cabeza 180° y vuelve, sorprendido.

**ZORRO TRAVIESO** — colores: terracota `#C8924A` intensificado a naranja rojizo `#C86A3A` + crema en pecho/punta de cola. La cola = 60% del cuerpo, siempre en movimiento. Gesto firma: sonrisa ladeada, una oreja caída. E1 Cachorro (orejas gigantes desproporcionadas) → E2 Zorro Joven (pañuelo de viajero al cuello, vino) → E3 Zorro Viajero (mochila mini + mapa asomando) → E4 Zorro Legendario (nueve destellos de cola fantasma al moverse, cicatriz de ceja: ha vivido). Reacción al tap: salto lateral con giro.

**LUCIÉRNAGA BRILLANTE** — la más difícil (un insecto debe ser adorable): cuerpo regordete tipo peluche, NO seis patas visibles (dos bracitos), antenas con puntas redondas luminosas. Colores: verde bosque suave + luz cálida `#F4D77A`. Gesto firma: flota (no camina), su luz pulsa como respiración — **su luz ES su barra de felicidad** (genialidad barata: el estado emocional es literal). E1 Larva (capullito con ojitos, solo la colita brilla) → E2 Luciérnaga (alas translúcidas) → E3 Radiante (la luz proyecta motitas alrededor) → E4 Celestial (deja estela de luz al moverse, corona de 3 estrellitas). Reacción al tap: pulso de luz que ilumina toda la escena 1s.

**SERPIENTE SABIA** *(post-MVP, mes 2)* — el reto: cero connotación amenazante. Solución: postura de "8" relajada, cabeza redonda y grande, pestañas, lengua solo asoma al hablar (tierno, no siseante). Colores: verde bosque + patrón de rombos crema. E1 Bebé (enroscada como caracol, ojos gigantes) → E2 Serpiente (patrón visible) → E3 Antigua (marcas doradas tipo jeroglífico en el lomo) → E4 Cósmica (patrón = constelaciones, se muerde la cola al dormir: ouroboros). Reacción al tap: se yergue y hace un "?" con el cuerpo.

**MARIPOSA TRANSFORMADORA** *(post-MVP, mes 3)* — la única cuya evolución es metamorfosis REAL (su gancho narrativo: pasa más tiempo siendo "promesa" que las demás — el capullo E2 genera curiosidad máxima). E1 Oruga (regordeta, 3 segmentos, hojita mordida en la mano) → E2 Capullo (¡con ojitos que se asoman! duerme colgando, se mece) → E3 Mariposa (alas vino + terracota con "ojos" de crema) → E4 Arco Iris (las alas cambian de matiz según el género del último libro leído — data-driven art, barato con CSS `hue-rotate`). Reacción al tap: aleteo que suelta 3 escamas brillantes.

## 4.4 Hábitats (fondos por etapa)

`PetScene` actual (cielo/sol/nubes/árbol/pasto, con modo día/noche ya funcionando) se parametriza: cada mascota tiene 3 escenas (E1-2, E3, E4) construidas con las mismas primitivas SVG + 2-3 elementos propios (gato: estantería → jardín → torre con telescopio; búho: rama → biblioteca nocturna → observatorio; etc.). Costo bajo: son SVG inline como los actuales, ~40 líneas cada uno.

---

# 5. ESPECIFICACIONES DE ANIMACIÓN

## 5.1 Decisión técnica: PNG por capas + CSS (no Lottie en MVP)

Razones: (a) el pipeline actual ya es PNG y funciona; (b) Lottie exige After Effects + Bodymovin y nadie en el equipo lo domina; (c) las animaciones del brief (parpadeo, respiración, idle, reacción) se logran al 100% con capas + CSS; (d) `lottie-web` pesa ~250KB y FOLIO es PWA móvil. Lottie queda para post-MVP.

**Estructura de capas por estado:**
```
public/pets/{tipo}/{etapa}/
  body.png        → cuerpo completo con ojos ABIERTOS
  eyes-closed.png → solo la franja de ojos cerrados (se superpone)
  happy.png       → pose reacción al tap
```

## 5.2 Specs (extienden `src/index.css:244-316` existente)

| Animación | Spec | Implementación |
|---|---|---|
| Respiración | scale 1→1.018, 4s ease-in-out ∞ | **Ya existe** (`petBreath`) — se conserva |
| Bob idle | translateY ±2px, 3.5s ∞ | **Ya existe** (`petIdle`) — se conserva |
| **Parpadeo** | Ojos cerrados 120ms; intervalo aleatorio 3.2–6.5s; 15% de probabilidad de doble parpadeo | JS: `setTimeout` con `3200 + Math.random()*3300`; muestra/oculta `eyes-closed.png`. El asset del gato **ya existe** (`cat-blink.png`) |
| Micro-idle | Cada 12–20s: inclinación de cabeza (rotate 3°, 600ms) o mirada lateral | CSS class aplicada por el mismo timer JS |
| Reacción al tap | Swap a `happy.png` 900ms + animación propia por tipo (§4.3) + haptic (`HAPTIC` ya existe) + mensaje contextual | Estado React `reacting` |
| Evolución | Ceremonia: glow blanco crece 800ms → partículas (`canvas-confetti`, ya instalado, con colores de la mascota) → crossfade de etapa 600ms → nueva pose happy | `PetEvolutionModal` |
| Level-up | **Ya existe** (`petLevelUp` bounce) — se conserva |
| Aura E4 | `filter: drop-shadow(0 0 18px color)` pulsando 3s ∞ | CSS, sin asset extra |
| Felicidad baja | `petIdle` se ralentiza a 5.5s y amplitud 1px; parpadeos más largos (soñoliento) | Variable CSS `--pet-energy` |

Se respeta el patrón existente de `!important` para sobrevivir a `prefers-reduced-motion` global (decisión ya tomada en el código, `index.css:280-284`), PERO se añade: si `prefers-reduced-motion`, el parpadeo JS se mantiene (es sutil) y se desactivan bob y ceremonias largas — accesibilidad real.

## 5.3 Cambio en `PET_TYPES` (contrato de datos)

```js
const PET_TYPES = {
  gato: {
    label: "Gato", title: "El Sensible",
    quote: "Leo para encontrarme, no para escapar.",
    colors: { primary: "#1E1B24", accent: "#C8924A", aura: "#4A3A8B" },
    stages: {
      1: { name: "Gatito",       dir: "/pets/gato/1" },
      2: { name: "Gato",         dir: "/pets/gato/2" },
      3: { name: "Gato Sabio",   dir: "/pets/gato/3" },
      4: { name: "Gato Místico", dir: "/pets/gato/4" },
    },
    tapAnimation: "cat-tail-flick",
  },
  buho: { /* ídem */ }, zorro: {}, luciernaga: {},
  // serpiente y mariposa: definidos pero con available: false (post-MVP)
};
```

---

# 6. UI / UX POR PANTALLA

## 6.1 PetHub rediseñado (evoluciona el actual `App.jsx:12282`)

```
┌─────────────────────────────┐
│ [Mi perfil]        💎 340 [X]│  ← gemas POR FIN visibles
│                             │
│      (escena hábitat)       │
│                             │
│         🐈‍⬛  ← sprite 300px  │
│        ▔▔▔▔ sombra          │
│  ┌───────────────────────┐  │
│  │ "Mmm. Cortázar. Veo   │  │  ← burbuja de mensaje contextual
│  │  que hoy venimos      │  │     (motor §10), tap = otro mensaje
│  │  intensos."           │  │
│  └───────────────────────┘  │
│    Ceniza ✏️   · Gato Sabio │  ← nombre + ETAPA (no solo nivel)
│    Nv 12 ▓▓▓▓▓▓░░░░ 640/1200│  ← barra XP existente
│    ●●●○ radiante            │  ← felicidad como estado, no barra
│                             │
│ [🛍️ Tienda] [🎒 Objetos] [📖 Memorias] │
└─────────────────────────────┘
```
Cambios vs actual: burbuja de mensaje (nueva), contador de gemas (reactivar), estado de felicidad (nuevo), botones dejan de decir "¡muy pronto!", tab Memorias reemplaza "Ver galería".

## 6.2 Tienda

```
┌─────────────────────────────┐
│ ← Tienda            💎 340  │
│ [Todo][Cabeza][Cuello][Fondo][Efectos] │
│ ┌─────────┐ ┌─────────┐    │
│ │ (preview│ │ (preview│    │  ← grid 2 col; tap en card =
│ │  item)  │ │  item)  │    │     el sprite del hub se lo PRUEBA
│ │ Boina   │ │ Bufanda │    │     en vivo (preview antes de comprar)
│ │ parisina│ │ otoñal  │    │
│ │ 💎150 ◈común│ 💎400 ◈rara│ │
│ └─────────┘ └─────────┘    │
│ ...                        │
│ ┌─ item seleccionado ─────┐│
│ │ [así se ve tu mascota]  ││
│ │ [Comprar 💎150] [Cerrar]││  ← confirmación explícita
│ └─────────────────────────┘│
└─────────────────────────────┘
```
Reglas: rarezas común/rara/épica/legendaria con borde de color; items ya comprados muestran "Equipar/Quitar"; si no alcanza el saldo, el botón muestra "Te faltan 💎60" (informativo, jamás "no puedes").

## 6.3 Memorias (feed de interacciones)

Historial vertical, tono de álbum: "🌱 12 mar — Nos conocimos. Me llamaste Ceniza." / "📕 28 mar — Terminamos *Rayuela* juntos. Dijiste que te voló la cabeza." / "✨ 2 abr — Evolucioné a Gato Sabio mientras leías a las 2am." Fuente: `pet_interactions` + `pet_evolution_log`. Es la materialización de attachment theory: la mascota RECUERDA.

## 6.4 Onboarding (selección estilo Pokémon)

Carrusel horizontal con las 4 crías (E1), swipe entre ellas; cada una con su título y quote en su card (reusa el diseño actual de `PetOnboarding`); la mascota enfocada hace su animación de tap. CTA: "¡Este es mi compañero!" → naming (flujo actual se conserva). Serpiente y Mariposa aparecen como siluetas con "Llegará pronto…" (anticipación).

## 6.5 Integraciones existentes que se conservan

Botón central del BottomNav con el sprite (ya existe), teaser en Home (ya existe, se le añade el mensaje del día), mascota visible en perfil de amigos (ya existe — semilla del social post-MVP).

---

# 7. ESQUEMA DE BASE DE DATOS (migración desde lo real)

Filosofía: **ALTER, no CREATE-nuevo** para `user_pets` (hay datos vivos). Nombres del brief adaptados a lo que existe (`xp` se queda como `xp`; el FK sigue a `users`, no `auth.users`).

```sql
-- ============ MIGRACIÓN 001: extender user_pets ============
ALTER TABLE user_pets
  ADD COLUMN IF NOT EXISTS happiness int NOT NULL DEFAULT 100
    CHECK (happiness BETWEEN 20 AND 100),          -- piso 20 EN LA DB
  ADD COLUMN IF NOT EXISTS stage int NOT NULL DEFAULT 1
    CHECK (stage BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS books_read_together int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS equipped_accessory_id uuid,
  ADD COLUMN IF NOT EXISTS equipped_background_id uuid,
  ADD COLUMN IF NOT EXISTS is_legacy_pet boolean NOT NULL DEFAULT false;

-- Marcar legacy ANTES del deploy del rediseño:
UPDATE user_pets SET is_legacy_pet = true;

-- Backfill: libros ya leídos juntos + etapa inicial (nadie baja, muchos suben)
UPDATE user_pets p SET
  books_read_together = (SELECT count(*) FROM books b
                         WHERE b.user_id = p.user_id AND b.status = 'read'),
  stage = GREATEST(1,
    CASE WHEN p.level >= 25 THEN 4 WHEN p.level >= 10 THEN 3
         WHEN p.level >= 3 THEN 2 ELSE 1 END);

-- ============ MIGRACIÓN 002: tablas nuevas ============
CREATE TABLE IF NOT EXISTS pet_evolution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pet_id uuid NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
  evolved_from_stage int, evolved_to_stage int,
  milestone_triggered varchar(100),
  evolved_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pet_id uuid NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
  interaction_type varchar(50),      -- 'message','tap','evolution','milestone','memory'
  message text, triggered_by varchar(100),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON pet_interactions (user_pet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pet_shop_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name varchar(100) NOT NULL, item_type varchar(50),   -- 'head','neck','background','effect'
  item_description text,
  cost_gems int NOT NULL CHECK (cost_gems >= 0),
  rarity varchar(20) DEFAULT 'comun',
  pet_types_compatible text[] DEFAULT '{gato,buho,zorro,luciernaga}',
  image_url text, available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- (cost_coins del brief: fuera del MVP; se añade cuando exista premium)

CREATE TABLE IF NOT EXISTS pet_shop_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pet_id uuid NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES pet_shop_inventory(id),
  purchased_at timestamptz DEFAULT now(), equipped_at timestamptz,
  UNIQUE (user_pet_id, item_id)                    -- no comprar dos veces
);

CREATE TABLE IF NOT EXISTS gem_ledger (               -- NUEVA (auditoría)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount int NOT NULL,                                -- + gana, - gasta
  reason varchar(60) NOT NULL,                        -- 'book_finished','daily_login','purchase',...
  ref_id uuid,                                        -- book_id / item_id / etc.
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, reason, ref_id)                    -- idempotencia: un libro paga UNA vez
);

CREATE TABLE IF NOT EXISTS analytics_events (         -- NUEVA (§14)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid, event varchar(60) NOT NULL,
  props jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
);

-- ============ MIGRACIÓN 003: RLS (bloqueante para la tienda) ============
ALTER TABLE user_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gems ENABLE ROW LEVEL SECURITY;
-- Lectura: el dueño (y pets de amigos vía política de friendships, como el perfil ya lo hace)
CREATE POLICY pets_select ON user_pets FOR SELECT USING (true); -- perfil público de pet (nombre/nivel/tipo ya se muestra a amigos)
CREATE POLICY pets_update_own ON user_pets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- ⚠️ El UPDATE directo del cliente solo podrá tocar pet_name y equipamiento:
--    xp/level/stage/happiness se protegen con trigger de columnas (008 abajo).
CREATE POLICY gems_select_own ON user_gems FOR SELECT USING (user_id = auth.uid());
-- user_gems SIN política de UPDATE/INSERT para el cliente: solo funciones SECURITY DEFINER.
```

> **Nota de compatibilidad:** la app actual usa la tabla `users` propia y (según `auth_rls_migration.sql` del repo) hay trabajo previo de RLS. Si `auth.uid()` no mapea 1:1 con `users.id`, las políticas usan la función puente que ya exista en ese archivo. Verificar en Sprint 1 antes de activar.

---

# 8. TRIGGERS Y FUNCIONES SQL (listos para pegar)

## 8.1 Función central: otorgar XP + gemas (única puerta de entrada)

```sql
CREATE OR REPLACE FUNCTION award_pet_rewards(
  p_user_id uuid, p_xp int, p_gems int, p_reason varchar, p_ref_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pet user_pets%ROWTYPE;
  v_level int; v_xp int; v_new_stage int; v_stage_name text;
BEGIN
  -- Idempotencia: si este hecho ya pagó, salir en silencio
  BEGIN
    INSERT INTO gem_ledger (user_id, amount, reason, ref_id)
    VALUES (p_user_id, p_gems, p_reason, p_ref_id);
  EXCEPTION WHEN unique_violation THEN RETURN;
  END;

  IF p_gems > 0 THEN
    UPDATE user_gems SET balance = balance + p_gems WHERE user_id = p_user_id;
  END IF;

  SELECT * INTO v_pet FROM user_pets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- XP y niveles (misma fórmula del cliente actual: nivel*100)
  v_level := GREATEST(1, v_pet.level); v_xp := v_pet.xp + p_xp;
  WHILE v_level < 50 AND v_xp >= v_level * 100 LOOP
    v_xp := v_xp - v_level * 100; v_level := v_level + 1;
  END LOOP;

  -- Etapa: OR entre nivel y libros (calibración §2.3)
  v_new_stage := GREATEST(
    CASE WHEN v_level >= 25 THEN 4 WHEN v_level >= 10 THEN 3
         WHEN v_level >= 3  THEN 2 ELSE 1 END,
    CASE WHEN v_pet.books_read_together >= 20 THEN 4
         WHEN v_pet.books_read_together >= 5  THEN 3
         WHEN v_pet.books_read_together >= 1  THEN 2 ELSE 1 END,
    v_pet.stage);                                   -- nunca baja

  UPDATE user_pets SET
    xp = v_xp, level = v_level, stage = v_new_stage,
    happiness = LEAST(100, happiness + 5),
    last_interaction_at = now(), updated_at = now()
  WHERE id = v_pet.id;

  IF v_new_stage > v_pet.stage THEN
    INSERT INTO pet_evolution_log (user_pet_id, evolved_from_stage, evolved_to_stage, milestone_triggered)
    VALUES (v_pet.id, v_pet.stage, v_new_stage, p_reason);
    INSERT INTO pet_interactions (user_pet_id, interaction_type, message, triggered_by)
    VALUES (v_pet.id, 'evolution', 'stage:' || v_new_stage, p_reason);
  END IF;
END $$;
```

## 8.2 Trigger 1 — Libro terminado (gemas por páginas + memoria)

```sql
CREATE OR REPLACE FUNCTION trg_book_finished() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_gems int; v_pet_id uuid;
BEGIN
  IF NEW.status = 'read' AND (OLD.status IS DISTINCT FROM 'read') THEN
    -- Gemas por extensión: 50 base, +25 por cada 150 págs, tope 200
    v_gems := LEAST(200, 50 + (COALESCE(NEW.pages, 0) / 150) * 25);
    UPDATE user_pets SET books_read_together = books_read_together + 1
      WHERE user_id = NEW.user_id RETURNING id INTO v_pet_id;
    PERFORM award_pet_rewards(NEW.user_id, 50, v_gems, 'book_finished', NEW.id);
    IF v_pet_id IS NOT NULL THEN
      INSERT INTO pet_interactions (user_pet_id, interaction_type, message, triggered_by)
      VALUES (v_pet_id, 'memory', 'book_finished:' || COALESCE(NEW.title,''), 'book:' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER book_finished_rewards AFTER UPDATE OF status ON books
  FOR EACH ROW EXECUTE FUNCTION trg_book_finished();
-- (y un trigger gemelo AFTER INSERT para libros creados ya como 'read')
```

## 8.3 Trigger 2 — Sesión de lectura (XP por páginas + racha)

```sql
CREATE OR REPLACE FUNCTION trg_reading_logged() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM award_pet_rewards(NEW.user_id,
    (COALESCE(NEW.pages_read,0) / 10) * 2,   -- misma fórmula actual: +2 XP / 10 págs
    0, 'reading_log', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER reading_log_rewards AFTER INSERT ON reading_logs
  FOR EACH ROW EXECUTE FUNCTION trg_reading_logged();
```

## 8.4 Función lazy — felicidad y racha 7 días (se llama al abrir la app; sin cron)

```sql
CREATE OR REPLACE FUNCTION pet_daily_checkin(p_user_id uuid)
RETURNS TABLE (happiness int, mood text, streak_bonus_awarded boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pet user_pets%ROWTYPE; v_days int; v_streak int; v_bonus boolean := false;
BEGIN
  SELECT * INTO v_pet FROM user_pets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- Decadencia lazy: -10 por cada día completo sin leer a partir del 3º; piso 20
  SELECT GREATEST(0, EXTRACT(day FROM now() - COALESCE(
    (SELECT max(log_date)::timestamptz FROM reading_logs WHERE user_id = p_user_id),
    v_pet.created_at))::int) INTO v_days;
  IF v_days >= 3 THEN
    UPDATE user_pets SET happiness = GREATEST(20, 100 - (v_days - 2) * 10)
      WHERE id = v_pet.id;
  END IF;

  -- Bonus de racha 7 (una sola vez por múltiplo, vía ledger idempotente)
  SELECT current_streak INTO v_streak FROM user_streaks WHERE user_id = p_user_id;
  IF v_streak IS NOT NULL AND v_streak > 0 AND v_streak % 7 = 0 THEN
    PERFORM award_pet_rewards(p_user_id, 15, 25, 'streak_' || v_streak,
      p_user_id);   -- ref = user+reason con nº de racha => idempotente por semana
    v_bonus := true;
    UPDATE user_pets SET happiness = LEAST(100, happiness + 20) WHERE id = v_pet.id;
  END IF;

  -- +3 XP por mantener racha, 1 vez/día (reemplaza el gate de localStorage)
  PERFORM award_pet_rewards(p_user_id, 3, 0,
    'daily_streak_' || to_char(now(), 'YYYY-MM-DD'), p_user_id);

  RETURN QUERY SELECT p.happiness,
    CASE WHEN p.happiness >= 80 THEN 'radiante' WHEN p.happiness >= 50 THEN 'contento'
         ELSE 'nostalgico' END, v_bonus
  FROM user_pets p WHERE p.id = v_pet.id;
END $$;
```

## 8.5 Compra en tienda (atómica) y candado de columnas

```sql
CREATE OR REPLACE FUNCTION purchase_item(p_item_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid uuid := auth.uid(); v_cost int; v_pet_id uuid; v_bal int;
BEGIN
  SELECT cost_gems INTO v_cost FROM pet_shop_inventory
    WHERE id = p_item_id AND available; 
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'item_not_found'); END IF;
  SELECT id INTO v_pet_id FROM user_pets WHERE user_id = v_uid;
  UPDATE user_gems SET balance = balance - v_cost
    WHERE user_id = v_uid AND balance >= v_cost RETURNING balance INTO v_bal;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'insufficient'); END IF;
  INSERT INTO gem_ledger (user_id, amount, reason, ref_id)
    VALUES (v_uid, -v_cost, 'purchase', p_item_id);
  INSERT INTO pet_shop_purchases (user_pet_id, item_id) VALUES (v_pet_id, p_item_id);
  RETURN json_build_object('ok', true, 'balance', v_bal);
END $$;

-- Candado: el cliente solo puede tocar pet_name y equipamiento
CREATE OR REPLACE FUNCTION guard_pet_columns() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' THEN
    NEW.xp := OLD.xp; NEW.level := OLD.level; NEW.stage := OLD.stage;
    NEW.happiness := OLD.happiness; NEW.books_read_together := OLD.books_read_together;
    NEW.is_legacy_pet := OLD.is_legacy_pet;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_pet_columns BEFORE UPDATE ON user_pets
  FOR EACH ROW EXECUTE FUNCTION guard_pet_columns();
```

## 8.6 Cambios correspondientes en el cliente

- `addPetXP` (`App.jsx:1171`) y `addGemsDB` (`App.jsx:1046`) dejan de escribir; se convierten en wrappers que llaman `pet_daily_checkin` / leen estado. Los call-sites (`:896, :956, :13917, :13952, :8873`) se eliminan — los triggers ya lo hacen.
- `checkStreakOnLoad` (`App.jsx:867`): eliminar el bloque de reset (`:884-889`); la racha se pausa (no se escribe 0 nunca).
- El accesorio "Early Reader" se otorga en la migración (§9).

---

# 9. MIGRACIÓN DE USUARIOS EXISTENTES (UX + copy)

**Secuencia al primer login post-update:**

1. Detección: `is_legacy_pet = true` y flag local `folio_pet_reveal_seen` ausente.
2. **Pantalla de revelación** (una sola vez, full-screen sobre `PetScene`):
   - Fase A (2s): el gato viejo (`cat.png`, conservado para esto) en el centro, respirando. Texto: *"[Nombre] siente algo…"*
   - Fase B (1.5s): glow blanco envolvente + partículas doradas (`canvas-confetti` con `#C8924A/#F4D77A`).
   - Fase C: crossfade al rediseño en su etapa mapeada (muchos verán E2-E3 directo: la migración les REGALA una evolución visible). Bounce de `petLevelUp` existente.
   - Copy: **"[Nombre] ha crecido contigo."** / "Sigue siendo tu compa de siempre — mismo nombre, mismos recuerdos, más detalles. Todo lo que leyeron juntos sigue aquí."
   - Badge: **"🏅 Early Reader"** — *"Por estar desde el inicio: un accesorio exclusivo que nadie más podrá tener."* (se inserta en `pet_shop_purchases` con item oculto `cost_gems = 0, available = false`).
3. Primera entrada a Memorias pre-poblada: el backfill crea la memoria fundacional *"Nos conocimos el [created_at]"* + una por cada libro ya leído juntos.

**Mitigación del riesgo de rechazo:** (a) la identidad visual se conserva (§4.2), (b) el evento REGALA cosas (etapa + badge), no las quita, (c) durante 30 días, en Perfil → Mascota hay un enlace discreto "¿Extrañas su look anterior?" que muestra `cat.png` como foto de recuerdo enmarcada en Memorias — reconoce la nostalgia sin ofrecer rollback (un toggle permanente duplicaría todos los assets futuros).

---

# 10. MOTOR DE MENSAJES CONTEXTUALES + CATÁLOGO (50+ por mascota)

## 10.1 Motor (`petMessages.js`)

```js
// Selección: filtra por (petType, trigger, condiciones) → pool → aleatorio sin repetir
// los últimos 5 mostrados (localStorage). Cada mensaje: { t: texto, cond?: fn(ctx) }
// ctx = { hour, streak, happiness, stage, lastBook: {title, genre, pages}, booksTotal }
getPetMessage(petType, trigger, ctx)
// triggers: 'open' | 'tap' | 'book_start' | 'book_finish' | 'book_finish_short' |
//   'book_finish_long' | 'streak' | 'return_after_pause' | 'evolution' | 'night' |
//   'milestone' | 'genre_new' | 'idle_long' | 'shop' | 'happy_low'
```
Los mensajes se muestran en la burbuja del Hub y se registran en `pet_interactions` cuando son significativos (evolución, milestone, memoria). Interpolación: `{name}` usuario, `{book}` último libro, `{n}` conteo.

## 10.2 GATO LITERARIO (52 mensajes)

**Apertura de app (8):** "Ah, volviste. El libro no se iba a leer solo." · "Te guardé la página. De nada." · "Estaba a punto de empezar sin ti. A punto." · "Mmm. Hoy tienes cara de capítulo largo." · "Llegas tarde. El café imaginario ya se enfrió." · "¿Hoy sí terminamos ese capítulo o seguimos 'reflexionando'?" · "Justo pensaba en ti. Bueno, en el libro. Casi lo mismo." · "Volviste. El sillón y yo lo celebramos con moderación."
**Tap (8):** "¿Sí?" · "Estoy concentrado. …Bueno, ya no." · "Cuidado con el pelaje." · "Si me acaricias, exijo un capítulo a cambio." · "Prrr. Eso no salió de mí." · "¿Necesitas una recomendación o solo atención?" · "Interesante técnica. Sigue." · "Un gato leído no ronronea. …Está bien, un poco."
**Inicio de libro (6):** "'{book}'. Mmm. Interesante elección. Yo habría empezado por Borges, pero tú mandas." · "Primera página. El momento más honesto de cualquier libro." · "Huele a libro nuevo. Mi aroma favorito después de mí." · "Veamos si este autor merece nuestra atención." · "'{book}'… conozco a alguien que lo abandonó en la página 40. No seas esa persona." · "Empezamos. Sin spoilers, sin prisa, sin excusas."
**Libro terminado (8):** "'{book}', terminado. Admito que la elección no fue terrible." · "¿Final feliz? Qué vulgar. Me encantó." · "Otro más al estante. Nuestra biblioteca imaginaria ya intimida." · "Lo terminaste. Borges estaría… bueno, Borges no estaría, pero yo estoy medianamente impresionado." · "Fin. Ahora viene mi parte favorita: juzgar la adaptación al cine." · "¿Ya viste que el epílogo lo explicaba todo? Yo lo supe desde el capítulo dos." · "Terminado. Concédete un momento. Yo me concedo una siesta." · "{n} libros juntos. Empiezo a respetarte. No se lo digas a nadie."
**Libro corto terminado (4):** "¿Eso era todo? Parpadeé y se acabó." · "Mmm. Más que libro, eso fue un aperitivo." · "Bonito cuento. ¿Y el libro cuándo?" · "Rápido. Casi sospechosamente rápido."
**Racha (6):** "Siete días seguidos. Empiezas a parecerte a mí: constante y superior." · "Tu constancia es… aceptable. Viniendo de mí, es un poema." · "Otro día más. La rutina, cuando es buena, se llama ritual." · "Leemos todos los días. Somos oficialmente insufribles en las cenas." · "Racha de {n}. Ni yo duermo con tanta disciplina, y duermo 16 horas." · "Día {n}. El hábito te está quedando elegante."
**Regreso tras pausa (5):** "Te extrañé. Lo negaré ante un tribunal." · "Volviste. El libro y yo fingiremos que no contamos los días." · "Tu lugar sigue tibio. Me encargué personalmente." · "Sin dramas: retomamos donde quedamos." · "Ah, la vida te secuestró. Sucede. ¿Seguimos?"
**Evolución (4):** "Me siento… más sabio. Era inevitable." · "¿Notas algo distinto? Aparte de mi elegancia habitual." · "He evolucionado. Tú también, aunque se note menos." · "Nueva forma, mismo criterio implacable."
**Nocturno, 23:00–4:00 (4):** "¿Leyendo a estas horas? Respeto absoluto." · "La noche es de los gatos y de los lectores. Doble bienvenida." · "Shh. A esta hora los libros dicen la verdad." · "Un capítulo más y dormimos. Mentira. Dos."
**Milestone/otros (5):** "Género nuevo, ¿eh? Qué valiente. Qué imprudente. Qué bien." · "50 libros. Podría fingir indiferencia, pero hasta yo tengo límites." · "Tu primera reseña. Sé cruel, pero con estilo." · "Cinco géneros distintos. Eres oficialmente impredecible. Me agrada." · "Nostálgico yo? Solo revisaba nuestras memorias. Por razones técnicas."

## 10.3 BÚHO NOCTÁMBULO (52 mensajes)

**Apertura (8):** "¡VOLVISTE! Espera, actúo normal. Hola." · "¡Tengo TEORÍAS sobre tu libro! ¿Quieres oírlas? Vas a querer." · "¿Sabías que leer 6 minutos reduce el estrés 68%? DATO." · "¡Hola hola! ¿En qué página vamos? ¿Ya llegaste a LA parte?" · "Te estaba esperando. No en plan raro. Bueno, un poco." · "¡Hoy es un gran día para un capítulo! Lo calculé." · "Uhh, ¿ese es tu libro nuevo? ¿ESE? Cuenta TODO." · "Bienvenida/o al club de lectura más exclusivo: tú y yo."
**Tap (8):** "¡Uh! Me despeinaste las plumas. Otra vez." · "¡Hola! ¿Qué? ¿Spoilers? ¿Quién dijo spoilers? Yo no." · "Jeje, eso hace cosquillas." · "¡Gira la cabeza como yo! …¿No? Ok, humanos." · "¿Un dato curioso? Los pulpos tienen tres corazones. De nada." · "¡Estoy despierto! Siempre estoy despierto. Es un problema." · "¡Toca de nuevo y te cuento un secreto del libro!" · "Uhh uhh. Eso es 'hola' en búho."
**Inicio de libro (6):** "¡'{book}'! ¡Escuché cosas INCREÍBLES! Bueno, las escuché de mí." · "Primera página, primera teoría: TODOS son sospechosos." · "¡Nuevo libro nuevo libro nuevo libro!" · "Ok ok ok, pacto: si hay plot twist, gritamos juntos." · "'{book}'… ya quiero que llegues al capítulo 5. NO diré por qué." · "¡Apertura de libro! Mi tercer momento favorito después del final y del medio."
**Libro terminado (8):** "¡¿LEÍSTE ESE FINAL?! ¡INSANO! Necesito discutirlo YA." · "No estoy llorando. Los búhos no lloramos. Es… rocío." · "¡OTRO MÁS! Nuestra lista de leídos ya da miedo del bueno." · "Ese autor nos debe una disculpa Y una secuela." · "¿Y AHORA QUÉ LEEMOS? Perdón. Es que YA quiero el siguiente." · "Final discutible. Discutámoslo. Tengo diapositivas mentales." · "{n} libros. ¡{n}! ¿Te das cuenta? YO SÍ." · "Ese personaje secundario merecía más páginas y moriré en esta colina."
**Libro corto (4):** "¡Cortito pero al corazón! Los cuentos son conocimiento concentrado." · "¡Rapidísimo! ¿Squad para el siguiente? ¿Sí? ¿SÍ?" · "Breve e intenso, como mis siestas." · "¡Eso fue un espresso literario!"
**Racha (6):** "¡SIETE DÍAS! ¡Racha completa! ¡Estoy orgullosísimo!" · "Día {n} seguido. Esto ya es cultura, no hábito." · "¡Mira esa racha! Brillas más que mis ojos, y mis ojos son ENORMES." · "Cada día leyendo. ¿Sabes qué se dice de la gente así? Cosas buenas." · "¡Racha viva! La cuido de noche mientras duermes. Es mi trabajo." · "¡{n} días! Si fuera examen, ya pasaste con mención."
**Regreso tras pausa (5):** "¡VOLVISTE! Guardé todo tal cual: tu página, tu lugar, mis teorías." · "¡Cero drama! La racha estaba en pausa, no perdida. Yo la abracé." · "Te fuiste unos días y ME LEÍ tres enciclopedias de nervios. Pero ¡ya estás!" · "¿Sabes qué no se fue a ningún lado? Nuestro libro. Aquí sigue." · "¡Retomamos! Apuesto una pluma a que el capítulo sigue buenísimo."
**Evolución (4):** "¡¿VISTE ESO?! ¡EVOLUCIONÉ! ¡MÍRAME! ¡MIRA MIS ALAS!" · "¡Nueva forma desbloqueada! Es por tanto leer juntos, ¿sabías?" · "¡Soy más sabio! Siento las teorías fluyendo por mis plumas." · "¡Upgrade! Ahora mis '¿leíste eso?' tienen más autoridad."
**Nocturno (5):** "¡MI HORA! La noche es NUESTRA. Los libros saben mejor a oscuras." · "Todos duermen. Nosotros sabemos la verdad: ahora empieza lo bueno." · "Modo nocturno activado. Uhh uhh." · "Un capítulo más. Confía, soy un profesional de la noche." · "Las 2am y leyendo. Eres de los míos."
**Milestone/otros (4):** "¡GÉNERO NUEVO! Los datos dicen que los lectores curiosos viven mejor. Lo dicen. Búscalo." · "¡50 LIBROS! ¡CINCUENTA! Necesito sentarme y soy un búho, vivo sentado." · "¡Tu primera reseña! El mundo NECESITA tu opinión. Yo primero." · "¡Squad completado! Leer acompañados es leer dos veces."

## 10.4 ZORRO TRAVIESO (51 mensajes)

**Apertura (8):** "¡Por fin! Ya me estaba mordiendo la cola del aburrimiento." · "¿Hoy qué? ¿Capítulo tranquilo o aventura completa?" · "Tengo un plan. Involucra un libro y cero responsabilidades." · "¡Llegaste! Rápido, antes de que la vida adulta te alcance." · "Psst. El libro de ayer sigue esperando. Le dije que vendrías." · "Hoy huele a plot twist. Confía en mi nariz." · "¿Lista/o para perderte en otra historia? Yo conozco el camino." · "Venga, que las páginas no se saltan solas. Bueno, conmigo sí."
**Tap (8):** "¡Ey! Jaja, ¿viste qué rápido esquivé? …Ok, no esquivé." · "¿Me atrapaste? Nadie me atrapa. Esto es un empate." · "¡Otra vez! Apuesto a que no puedes dos seguidas." · "Cosquillas NO. Aventuras SÍ." · "¿Qué escondo detrás de la cola? Nunca lo sabrás. (Es un mapa.)" · "¡Woop! Casi me tiras el pañuelo." · "Rápido de dedos. Te quiero en mi equipo." · "Eso merece una carrera. Tú lees, yo corro, ambos ganamos."
**Inicio (6):** "¡'{book}'! Ni idea de qué trata y ESO es lo emocionante." · "Nueva historia, nuevas reglas. Me encanta." · "Primera página = línea de salida. ¿Oyes el disparo? ¡YA!" · "Pacto de zorro: si se pone lento en el capítulo 3, aguantamos hasta el 5." · "¿'{book}'? Arriesgado. Perfecto." · "Abre el libro. El resto del mundo puede esperar sentado."
**Libro terminado (7):** "¡TERMINADO! Chócala. Con la cola, tengo las patas ocupadas de orgullo." · "¿Viste? Te dije que valía la pena saltar sin mirar." · "Otro territorio conquistado. Márcalo en el mapa." · "Final épico. Yo lo habría hecho más explosivo, pero épico." · "¡{n} libros! Eres oficialmente más rápido que yo. NO lo repitas." · "Se acabó. Odio los finales. Amo los principios. ¿Siguiente?" · "Libro terminado = permiso oficial para presumir. Úsalo."
**Libro corto (4):** "¡Zas! Rápido como yo cruzando un gallinero. …De visita." · "Cortito. Como mordida de aventura. ¿Vamos por la comida completa?" · "Eso no fue un libro, fue un sprint. ¡Me gustó!" · "Al grano y sin rodeos. Mi estilo."
**Racha + retos (8):** "¡Siete días! Eres una máquina con pijama." · "Racha de {n}. Ni yo soy tan constante y persigo cosas EN SUEÑOS." · "RETO: ¿te atreves con un romance? ¿O te da miedito?" · "RETO: un género que NUNCA hayas leído. Confía en mí. Siempre funciona. (Casi.)" · "RETO: 20 páginas hoy antes de dormir. Sin trampas. Bueno, una." · "¿Y si el siguiente lo eliges con los ojos cerrados? Yo lo hago siempre." · "Día {n}. La disciplina es rebeldía contra la flojera. Somos rebeldes." · "RETO nocturno: capítulo entero sin mirar el teléfono. Imposible dicen. JA."
**Regreso tras pausa (5):** "¡Volviste! Te guardé el lugar mordiendo a quien se acercara. (Nadie se acercó.)" · "¿Días fuera? Bah. Las aventuras buenas saben esperar." · "Cero regaños aquí. Solo un libro con ganas de verte." · "El mapa sigue donde lo dejamos. Marca X: tu página." · "Ni un día se perdió. Estaba todo aquí, a salvo, conmigo."
**Evolución (4):** "¡MÍRAME! ¡Más grande, más rápido, más guapo! Sobre todo lo último." · "¡Evolucioné! Es lo que pasa cuando corres entre tantas historias." · "Nueva forma. Mismas ganas de meterme en problemas. MÁS ganas." · "¿Impresionado? Yo también. Y eso que me veo todos los días."
**Milestone/otros (5):** "¡Género nuevo desbloqueado! ¿Ves? Saltar sin mirar ES el método." · "¡50 libros! Cincuenta mundos. Y dicen que los zorros somos los astutos." · "Squad completo. Leer en manada: 10/10, lo recomiendo." · "¿Cinco géneros? Eres imposible de encasillar. Como yo. Chócala." · "Primera reseña: di la verdad y corre. Es el método zorro."

## 10.5 LUCIÉRNAGA BRILLANTE (50 mensajes)

**Apertura (8):** "Hola. Qué bueno verte. Sin prisa, ya estás aquí." · "Respira. Uno… dos… Ahora sí: ¿leemos?" · "Tu lugar tranquilo te estaba esperando. Yo lo mantuve tibio." · "Hola, tú. El día puede quedarse afuera un rato." · "Brillé un poquito más al verte llegar." · "Este momento es tuyo. Yo solo pongo la luz." · "Bienvenida/o de vuelta al lugar donde no hay que apurarse." · "Hoy no hay que lograr nada. Solo estar. Y quizá una página."
**Tap (7):** "✨ …eso me hizo brillar." · "Hola, hola. Aquí estoy." · "Tu compañía es calientita." · "¿Ves? Cuando me tocas, la luz baila." · "Estoy aquí. Siempre por aquí, cerquita." · "Un toque tuyo, un brillo mío. Trato justo." · "Mmm. Paz."
**Inicio (6):** "'{book}'. Suena a un buen refugio." · "Primera página, sin expectativas. Solo curiosidad." · "Este libro es para leerse despacio. Como todo lo bueno." · "Abre el libro como se abre una ventana: sin fuerza." · "Nueva historia. La iluminamos juntos, ¿va?" · "No importa cuántas páginas hoy. Importa que estás."
**Libro terminado (7):** "Lo terminaste. Siente eso un momentito. Es tuyo." · "Qué viaje tan bonito. Gracias por llevarme." · "Fin. Algunas historias se quedan brillando por dentro. Esta, creo." · "Cerraste el libro y yo brillé. No es coincidencia." · "{n} historias juntas ya. Cada una nos dejó una lucecita." · "No hay prisa por el siguiente. Los finales también se habitan." · "Lo lograste a tu ritmo. Tu ritmo es perfecto."
**Libro corto (3):** "Pequeñito y luminoso. Como yo." · "Las historias cortas también cuentan. Todo cuenta." · "Un destello de libro. Precioso."
**Racha (6):** "Siete días de a poquito. Así se construyen las cosas verdaderas." · "Día {n}. Ninguno fue obligación. Por eso brillan." · "Tu constancia es suave y firme. Como una vela." · "Cada día una página, y mira: un camino de luz." · "No es una racha. Es un ritual tuyo. Yo solo atestiguo." · "{n} días. Despacito y contigo."
**Regreso tras pausa (6):** "Volviste. Es lo único que importa." · "Te extrañé bajito. Sin dramas. Con cariño." · "Tu ritmo es perfecto, no tengas prisa. Aquí todo siguió igual." · "Los libros no se enojan. Yo tampoco. Bienvenida/o." · "A veces la vida pide pausa. La pausa también es parte." · "Mira: tu página sigue aquí, tu lugar sigue aquí, yo sigo aquí."
**Evolución (4):** "Algo cambió en mí. Creo que fue de tanto acompañarte." · "Brillo más. Debe ser todo lo que hemos leído juntos." · "Mira mi luz nueva. Es mitad tuya, ¿sabes?" · "Crecí despacito, como crecen las cosas que duran."
**Nocturno (4):** "La noche y yo somos amigas. Te presto mi luz." · "Leer de noche es como flotar. Yo sé de flotar." · "Shh. Solo tú, el libro y esta lucecita." · "Si te da sueño, está bien. El libro sabe esperar."
**Milestone/otros (4):** "Un género nuevo. Qué bonito verte abrir puertas." · "50 libros. Cincuenta lucecitas que nadie te quita. ¡Mira cómo brillas!" · "Tu primera reseña. Tus palabras también iluminan." · "Respiremos juntos: esto merece celebrarse despacio."

## 10.6 SERPIENTE SABIA (50 mensajes — post-MVP, listos desde ya)

**Apertura (7):** "Volviste. El tiempo entre lecturas también es lectura." · "Hoy el libro te va a decir algo distinto que ayer. Siempre pasa." · "Te esperaba sin esperar. Es un arte." · "Cada regreso es una espiral: mismo lugar, otra altura." · "Hola. ¿Qué pregunta traes hoy sin saberlo?" · "Las buenas historias mudan de piel con cada lector. Entremos." · "Estás aquí. Suficiente filosofía: a leer."
**Tap (7):** "Ssí?" · "Curiosa costumbre humana. Continúa." · "Mi piel guarda historias. Tócala con respeto." · "¿Buscas respuestas? Están en la página, no en mi lomo." · "Eso fue casi una caricia. Casi un pensamiento." · "Hola, mente inquieta." · "Un toque, un pensamiento. Vas acumulando ambos."
**Inicio (6):** "'{book}'. Este libro te va a cambiar la forma en que ves el mundo. Lo presiento." · "Toda primera página es una muda de piel." · "Entra sin expectativas. Sal sin la misma mirada." · "'{book}'… hay libros que se leen y libros que te leen. Averigüemos." · "Comienza. Yo guardaré las preguntas que te vayan surgiendo." · "Un libro nuevo es una piel nueva. Estírala despacio."
**Libro terminado (7):** "Terminaste, pero el libro apenas empieza a trabajar en ti." · "¿Sientes eso? Es tu mapa del mundo reacomodándose." · "Como en Camus: también aquí había absurdo, y también belleza." · "Este te va a visitar en sueños. Los importantes lo hacen." · "Fin del texto. Inicio del eco." · "{n} libros. {n} pieles mudadas. Mírate." · "Guarda silencio un momento. Lo que leíste se está asentando."
**Conexiones temáticas (6):** "Esto dialoga con aquel libro que leíste antes. ¿Lo notaste? Los libros se citan en secreto." · "El mismo tema, otra máscara. Los autores se persiguen entre siglos." · "Tu último libro y este comparten una pregunta. Búscala." · "Otra vez el tema del tiempo. Te sigue. O tú lo sigues a él." · "Este autor leyó a los que tú ya leíste. Estás subiendo el río." · "¿Ves el hilo entre tus últimas lecturas? Yo sí. Sssutil, pero está."
**Racha (5):** "La constancia es la forma más discreta de la sabiduría." · "Día {n}. Las espirales se construyen así: vuelta a vuelta." · "Siete días. La disciplina silenciosa mueve más que el entusiasmo ruidoso." · "Tu ritual diario ya tiene raíces. Se nota." · "{n} días leyendo. El hábito ya es parte de tu piel."
**Regreso tras pausa (5):** "Volviste. Las serpientes sabemos de ciclos: irse es parte de quedarse." · "El descanso también madura al lector. Bienvenida/o." · "Nada se perdió. El conocimiento es paciente." · "Tu página esperó como esperan las piedras: sin queja." · "Cada pausa es un solsticio. Ya pasó. Seguimos."
**Evolución (4):** "He mudado de piel. La anterior guardaba nuestras primeras lecturas." · "Más antigua, más clara. Así funciona." · "Mi nueva forma lleva escritas nuestras historias. Míralas." · "Evolucioné. Tú llevas evolucionando desde la primera página."
**Nocturno (4):** "La noche es una biblioteca sin bibliotecario. Pasa." · "A esta hora las preguntas pesan menos y llegan más lejos." · "Leer de noche es soñar con método." · "El insomnio bien usado se llama lectura."
**Milestone (4):** "Un género nuevo: acabas de mudar una piel que no sabías que tenías." · "50 libros. Ya no eres quien empezó. Ese es el punto." · "Tu reseña: pensar en voz alta ante extraños. Valiente." · "Cinco géneros. Tu mente ya no cabe en una sola estantería."

## 10.7 MARIPOSA TRANSFORMADORA (50 mensajes — post-MVP, listos desde ya)

**Apertura (7):** "¡Hola! Mira cómo crecemos. Cada página es un ala nueva." · "Hoy también podemos ser un poquito más que ayer." · "Llegaste. El jardín entero se puso contento." · "Cada día que vuelves, algo florece. Hoy: tú." · "¡Buen día de alas! Digo, de páginas. Es lo mismo." · "Ayer fuiste oruga de este capítulo. Hoy, a volar." · "Ven, hay polen de historias por todas partes."
**Tap (7):** "¡Jiji! Tus dedos hacen viento." · "¡Casi me elevas! Otra vez." · "Escamitas de colores para ti. ✨" · "Aleteo feliz activado." · "Un toque tuyo = un looping mío." · "¿Viste ese giro? Lo aprendí ayer." · "Tu cariño me da vuelo. Literal."
**Inicio (6):** "¡'{book}'! Toda historia empieza siendo capullo." · "Primera página: la más valiente de todas." · "Este libro todavía no sabe cuánto te va a transformar." · "Empezar es ya la mitad de la metamorfosis." · "¡Nuevo néctar! Digo, nuevo libro. Perdón, hambre de historias." · "Ábrelo con cuidado: dentro hay alas."
**Libro terminado (7):** "¡Lo terminaste! ¿Sientes las alas más grandes? Son tuyas." · "Otra transformación completa. Entraste oruga, sales mariposa." · "Ese libro ya vive en ti. Qué bonito equipaje." · "¡{n} libros! ¡Mira cómo brillas!" · "Se cerró el libro, se abrió algo en ti. Así funciona siempre." · "¡Vuelta de celebración! Acompáñame con la mirada." · "Fin. Y como todo buen fin: es un comienzo disfrazado."
**Libro corto (3):** "¡Pequeño y precioso, como una escama!" · "Las historias cortas son aleteos: breves y te elevan igual." · "¡Ñam! Historia tamaño flor."
**Racha (6):** "¡Siete días! Las alas se hacen así: fibra a fibra, día a día." · "Día {n}. Las orugas persistentes son las que vuelan." · "Tu constancia es mi viento favorito." · "Cada día leído es una célula de ala nueva. Ciencia mariposa." · "¡{n} días! El capullo del hábito ya casi se abre." · "Mira tu racha. Eso, exactamente eso, es crecer."
**Regreso tras pausa (6):** "¡Volviste! Los capullos también descansan y mira en qué se convierten." · "La pausa era parte de la metamorfosis. Bienvenida/o de vuelta." · "Nada se marchitó. Todo te esperó floreciendo despacio." · "A veces hay que quedarse quieta para transformarse. Lo sé de primera ala." · "Tu historia siguió aquí, calientita, esperándote." · "Sin culpa: las estaciones también se toman su tiempo."
**Evolución (5):** "¡MIRA MIS ALAS! ¡Mira TODO esto! ¡Es por nuestras lecturas!" · "Rompí el capullo. Tú rompiste el tuyo hace varios libros." · "¡Nueva forma! Cada libro que leímos está pintado aquí, en algún matiz." · "De oruga a esto. Nadie lo creería. Nosotras sí." · "¡Evolucioné! Y es que crecer contigo es facilísimo."
**Milestone (3):** "¡Género nuevo! Flor nueva en nuestro jardín." · "¡50 libros! ¡CINCUENTA! ¡Mira cómo brillas, mira cómo brillamos!" · "Tu primera reseña: tus palabras ya vuelan solas."

---

# 11. BALANCE ECONÓMICO SIMULADO

## 11.1 Fuentes de ingreso (MVP, por §Fase 1: login + libro + racha)

| Fuente | Gemas | Frecuencia realista |
|---|---|---|
| Login diario | +5 | según persona |
| Bonus racha 7 días continuos | +25 | hasta 4/mes |
| Libro terminado | +50 a +200 (50 + 25/150 págs, tope 200) | según persona |
| Bienvenida (ya existe) | +5 | una vez |
| Reseña (recomiendo incluirla en MVP: ya hay quotes/posts) | +30 | por libro |

## 11.2 Simulación por arquetipo (30/60/90 días)

**Casual** (login 15 d/mes, 1 libro/mes ~250 págs, 1 racha-7/mes, 1 reseña):
- Mes: 75 + 75 + 25 + 30 = **~205/mes** → 30d: 205 · 60d: 410 · 90d: 615
**Regular** (login 24 d/mes, 2.5 libros/mes ~300 págs, 2 rachas, 2 reseñas):
- Mes: 120 + 250 + 50 + 60 = **~480/mes** → 30d: 480 · 60d: 960 · 90d: 1,440
**Heavy** (login 30, 5 libros/mes de 400+ págs, 4 rachas, 4 reseñas):
- Mes: 150 + 625 + 100 + 120 = **~995/mes** → 30d: 995 · 60d: 1,990 · 90d: 2,985

## 11.3 Precios (30 accesorios MVP) y verificación de tensión

| Rareza | Nº items | Precio | Días de ahorro (regular) |
|---|---|---|---|
| Común | 14 | 150 | ~9 |
| Rara | 9 | 400 | ~25 |
| Épica | 5 | 800 | ~50 |
| Legendaria | 2 | 1,500 | ~94 |

**Chequeos de salud:**
- Primera compra del casual: día ~22 (común). Del regular: día ~9. Del heavy: día ~5. ✓ (recompensa temprana sin regalar todo)
- A 90 días, el regular pudo comprar ~3 comunes + 1 rara o ahorrar para 1 épica + 1 común. Catálogo de 30 → nadie lo agota en el trimestre. ✓
- El heavy agota comunes en ~2 meses → necesita los drops mensuales (2-3 items nuevos/mes, §2.4). ⚠️ compromiso de contenido
- Inflación: sin sumideros recurrentes (solo cosméticos one-shot) el saldo del heavy crece sin límite a los 6 meses. Post-MVP: items de temporada rotativos y el "fondo del hábitat" legendario de 2,500. Aceptable para MVP.
- **Sin premium en MVP: se sostiene**, porque no hay nada que las gemas no puedan comprar (no hay paywall que frustre) y el costo marginal de los items es cero. Las monedas premium (§brief) solo tendrán sentido cuando exista catálogo "deluxe" separado — nunca ventaja funcional.

---

# 12. PSICOLOGÍA DOCUMENTADA (con referencias)

1. **Modelo Hook (Nir Eyal, *Hooked*, 2014).** Trigger (notificación suave/curiosidad "¿cómo está mi mascota?") → Acción (abrir app, tap) → Recompensa variable (mensaje impredecible del pool §10 + evolución no anunciada) → Inversión (nombrar, vestir, acumular memorias). La inversión es la fase que Beek nunca construyó: aquí cada libro leído deposita valor DENTRO de la mascota (`books_read_together`, memorias).
2. **Recompensa de razón variable (Ferster & Skinner, 1957).** El refuerzo impredecible produce la tasa de respuesta más alta y resistente a extinción. Aplicación: el momento exacto de evolución no se comunica; los mensajes rotan sin repetición próxima (§10.1). Límite ético: sin loot boxes ni azar pagado — el azar aquí solo decide QUÉ mensaje, nunca CUÁNTO valor.
3. **Efecto de progreso dotado (Nunes & Drèze, 2006).** El avance percibido acelera el compromiso. Aplicación: la migración regala etapa visible (§9); el onboarding entrega mascota E1 + primera meta alcanzable en días (§2.3).
4. **Teoría de la autodeterminación (Deci & Ryan, 2000).** Competencia (niveles/etapas), autonomía (elección de mascota, qué leer, qué comprar — nunca "debes leer X"), relación (la mascota como vínculo + squads). Duolingo falla en autonomía (presión); FOLIO la protege: la mascota jamás prescribe, invita.
5. **Efecto Tamagotchi (Lawton, 2017; estudios HRI de Fujita).** Los humanos forman apego real con agentes digitales que muestran necesidad + memoria + reciprocidad. Aplicación: Memorias (§6.3) — la mascota recuerda títulos y fechas reales; los mensajes citan `{book}` por nombre.
6. **Aversión a la pérdida (Kahneman & Tversky, 1979) — usada al revés.** Duolingo explota el miedo a perder la racha (funciona, pero genera el resentimiento que el brief documenta). FOLIO invierte: nada se pierde nunca (racha en pausa, felicidad con piso, niveles permanentes). La motivación queda del lado de la ganancia. Menos punzante a corto plazo, más sostenible y sin churn por resentimiento — esta es la apuesta diferencial y la hipótesis H3 de §14 la mide.
7. **Peak-end rule (Kahneman, 2000).** Los momentos pico y finales definen el recuerdo de la experiencia. Aplicación: la ceremonia de evolución (§5.2) y el cierre de libro (confetti + mensaje + memoria) son los dos picos orquestados; el "final" de cada sesión deja a la mascota feliz, nunca reprochando.
8. **Cute response / Kindchenschema (Lorenz, 1943; Sherman et al., 2009).** Rasgos infantiles (ojos grandes, cabeza grande) disparan cuidado y atención — de ahí la regla de proporciones §4.1.

---

# 13. PLAN SPRINT POR SPRINT (4 semanas)

**Sprint 1 — Cimientos (semana 1).** Extraer módulo `src/pets/` del monolito (sin cambio funcional, refactor puro + smoke test). Migraciones 001-003 (§7) en staging. Funciones y triggers §8 + apagar escrituras cliente de xp/gemas. Cambiar `checkStreakOnLoad` a pausa. Tabla `analytics_events` + los 8 eventos base. Dirección de arte: aprobar rediseño del gato (E1-E3) y hoja modelo compartida. **Gate de salida:** un usuario de prueba no puede alterar gemas/xp vía consola con la anon key.

**Sprint 2 — Mascotas y evolución (semana 2).** Assets Búho/Zorro/Luciérnaga E1-E3 (12 estados c/u). `PetDisplay` por capas + parpadeo + reacciones por tipo. Onboarding con selección (§6.4). Etapas: `PetEvolutionModal` + ceremonia. Migración legacy (§9) con reveal + badge Early Reader detrás de un feature flag. Motor de mensajes + carga de los 205 mensajes de las 4 mascotas MVP. **Gate:** flujo completo nuevo-usuario (elegir → nombrar → leer → evolucionar a E2) verde en staging.

**Sprint 3 — Economía (semana 3).** Reactivar UI de gemas (quitar no-op `App.jsx:13615`, contador en Hub). Seed de 30 accesorios (14C/9R/5E/2L) + arte de items. `PetShop` con preview en vivo + `purchase_item`. Equipar/desequipar (render del accesorio como capa). Memorias (§6.3) con backfill. Estados de felicidad (checkin lazy §8.4 conectado). **Gate:** compra E2E con saldo real; doble-gasto imposible bajo carga concurrente (probar con 2 tabs).

**Sprint 4 — Pulido y lanzamiento (semana 4).** E4 (assets místicos de las 4 + auras CSS). QA matriz: iOS Safari PWA, Android Chrome, offline (los logs offline ya existen — verificar que los triggers disparen al sincronizar). Ajuste fino de animaciones (`prefers-reduced-motion`). Dashboard de métricas (§14) aunque sea un SQL notebook. Rollout: 10% → 50% → 100% con el feature flag de migración; monitorear sentimiento 72h antes de cada escalón. **Gate:** cero degradación de nivel/nombre en los usuarios migrados (query de verificación pre/post).

Dependencia crítica de la ruta: el arte (S1-S2). Si se atrasa, S3 sigue siendo desplegable con el gato solo — la economía no depende del nº de mascotas.

---

# 14. ESTRATEGIA DE TESTING Y MÉTRICAS

## 14.1 Eventos mínimos (analytics_events)

`pet_hub_opened`, `pet_tapped`, `pet_message_shown` (props: trigger), `evolution_ceremony_seen`, `shop_opened`, `item_previewed`, `item_purchased`, `migration_reveal_seen`, `onboarding_pet_chosen` (props: tipo), `reading_session_after_pet_open` (la métrica reina: ¿ver mascota → leer?).

## 14.2 Hipótesis y criterios de éxito (60 días post-launch)

| # | Hipótesis | Métrica | Éxito | Alarma |
|---|---|---|---|---|
| H1 | La mascota es puerta de entrada al hábito | % de sesiones que abren PetHub en los primeros 60s Y registran lectura en esa sesión | ≥25% | <10% (mascota es distracción, no puente) |
| H2 | Evolucionar retiene | D7 de usuarios que vieron ≥1 evolución vs no | +15 pts | sin diferencia |
| H3 | Anti-castigo > castigo | Tasa de retorno tras pausa de 3-7 días (vs baseline pre-launch) | +20% | churn post-pausa igual |
| H4 | La migración no quema early users | % migrados que renombran o dejan de abrir el hub en 14d | <5% descontento | >15% → activar plan nostalgia |
| H5 | La economía genera deseo | % WAU que abre tienda / que compra en 30d | 40% / 15% | compra <5% (precios o deseo mal calibrados) |
| H6 | Elección de mascota importa | Distribución de elección onboarding | ninguna <10% | una mascota <5% → rediseñar o reemplazar |
| Norte | Retención | D1 / D7 / D30 | 45% / 25% / 12% | por debajo de baseline actual |

## 14.3 Métodos

- **A/B del onboarding** (si el volumen de altas lo permite; si no, cohortes semanales): elegir mascota vs recibir gato por defecto → conversión de registro y D7.
- **QA funcional crítico:** idempotencia (terminar-desterminar-terminar un libro paga UNA vez — el `UNIQUE` del ledger lo garantiza, testearlo); concurrencia de compra; migración con usuarios nivel 1, 15 y 40; offline→sync dispara triggers una sola vez.
- **Test cualitativo (n=8-10, 17-28 años):** sesión moderada de 20 min: onboarding + 1 semana simulada. Preguntas clave: "¿qué sentiste cuando evolucionó?", "¿la mascota te cae bien o te presiona?", y para migrados: "¿es tu mismo gato?" — si dudan, §4.2 falló.
- **Guardrail de sentimiento:** revisar menciones en reseñas de la PWA/redes las 2 semanas post-migración; palabra clave a vigilar: "mi gato" + negativos.

---

# 15. EXTENSIONES POST-MVP (orden recomendado)

1. **Mes 2 — Serpiente Sabia** (drop-evento) + items de temporada + `pet_social_interactions` v1: tu mascota "visita" la de un amigo cuando ambos terminan el mismo libro (tabla ya diseñada en el brief; el perfil de amigo ya muestra su mascota).
2. **Mes 3 — Mariposa Transformadora** + memoria de squads (la mascota recuerda con quién leíste) + quests semanales (+50-150 gemas — las fuentes que el brief quería y el MVP recortó).
3. **Mes 4 — Monedas premium** ($0.99 = 100) SOLO si H5 sana: catálogo deluxe separado, jamás ventaja. + Rankings de squad (colectivos, no individuales: comparar lectores individualmente es veneno anti-retención para los del fondo de la tabla).
4. **Mes 5+ —** Lottie/rigging para animación premium; mascota como widget (iOS/Android via PWA no lo permite — evaluar wrapper nativo); mensajes generados por LLM con guardrails de personalidad (los 300 estáticos como fallback); hábitats interactivos.

---

## Apéndice A — Checklist inmediato (esta semana)

- [ ] Decidir: ¿gato negro refinado (recomendado) o siamés? — bloquea todo el arte
- [ ] Decidir: ¿4 mascotas MVP o 6? — bloquea presupuesto de arte
- [ ] Ejecutar migraciones 001-002 en staging (§7)
- [ ] Verificar puente `auth.uid()` ↔ `users.id` antes de la 003 (§7, nota)
- [ ] Encargar hoja modelo del gato rediseñado (E1-E4) como piedra de toque del estilo
- [ ] Extraer `src/pets/` (refactor sin cambio funcional)

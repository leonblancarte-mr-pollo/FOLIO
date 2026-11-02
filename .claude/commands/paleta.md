---
description: Aplica la paleta de sema-paleta en src/theme.js (claro y oscuro), con QA y capturas de Inicio, Explorar y Perfil. Primer comando del rediseño; rama propia, sin fusionar.
---

# /paleta

Aplica la paleta nueva de SEMA en `src/theme.js`. **Es el primer comando del rediseño, antes de cualquier `/redisena`.** Sin argumentos.

## 0. Preparación (tú)

1. **Lee las skills** con Read:
   - `.claude/skills/sema-identidad/SKILL.md`
   - `.claude/skills/sema-paleta/SKILL.md`
   - `.claude/skills/sema-voz/SKILL.md`
   - `.claude/skills/sema-prompts/SKILL.md`
   - `.claude/skills/sema-capturas/SKILL.md`
2. **Verifica los requisitos:**
   - Playwright;
   - `SEMA_TEST_EMAIL` y `SEMA_TEST_PASSWORD`, sin imprimir sus valores;
   - `scripts/captura.js`: si no existe, créalo desde la plantilla.
   - **Si faltan credenciales o Playwright**, sigue con el cambio y el build, pero di al inicio del reporte que no hay capturas.
3. **Árbol de trabajo limpio** (`git status`). Se ignoran los archivos sin seguimiento dentro de `capturas/`. Crea la rama `paleta-<AAAA-MM-DD>` desde `main`. Si creaste `scripts/captura.js`, entra en el primer commit.
4. **Levanta `npm run dev`** en segundo plano.

## 1. Antes

Captura el ANTES de `home`, `explorar` y `perfil`, en claro y oscuro:

```bash
node scripts/captura.js home antes
node scripts/captura.js explorar antes
node scripts/captura.js perfil antes
```

## 2. Aplicar la paleta: `disenador`

Lanza el agente `disenador` con este encargo exacto.

**Qué cambia:**
- En `src/theme.js`, cambia **solo** `PALETTE_LIGHT` y `PALETTE_DARK` según la tabla «token → valor claro → valor oscuro → uso» de sema-paleta.
- Conserva todos los nombres de token existentes.
- Agrega `firma`, `onFirma`, `acentoCalido`, `superficieSuave` y `complementoFrio`.
- Actualiza el comentario de encabezado de `theme.js` con los tokens nuevos.

**Qué no cambia:**
- `BRAND`, degradados y datos de arte (`COVER_PALETTES`, `STREAK_PHASES`, `WRAPPED_SLIDE_GRADIENTS`, etc.). Lista cuáles quedan con la paleta anterior.
- Componentes. Los usos de `palette.accent` (o de `mauve`/`amber`) como **color de texto normal sobre fondo claro**, que con la paleta nueva no pasan contraste (3.21:1 o menos), solo se **listan con archivo:línea**: se corrigen en cada `/redisena`.
- Tailwind.
- Las capturas ANTES ya están hechas: no las repite.

Al terminar: `npm run build` y commit `feat(theme): paleta SEMA 2026-11 en theme.js`.

## 3. QA

Lanza `qa` con:
- build;
- ESLint;
- capturas DESPUÉS de `home`, `explorar`, `perfil` y `social`, en claro y oscuro.

El agente compara contra las capturas ANTES y lista:
- texto ilegible;
- elementos que desaparecen;
- modo oscuro con restos café;
- colores fuera de la paleta.

## 4. Correcciones (máx. una)

Si QA encuentra algo roto **por el cambio de tokens**, el `disenador` lo corrige ajustando el mapeo de tokens en `theme.js`, sin colores nuevos y sin tocar componentes. Luego QA verifica de nuevo solo eso. Commit `fix(theme): …`.

## 5. Documentación

El `disenador` actualiza `DOCUMENTACION_ARQUITECTURA.md` y regenera el `.docx`:
- en §III, el «Sistema visual» con la paleta nueva y la tabla de tokens;
- el CHANGELOG;
- en §XII, lo que quedó con la paleta anterior.

Commit `docs: paleta SEMA 2026-11`.

Apaga `npm run dev`.

## 6. Reporte a León (tú)

1. **Capturas antes/después** de `home`, `explorar` y `perfil`, en claro y oscuro (rutas).
2. **Tokens cambiados y nuevos.**
3. **Lo que quedó con la paleta anterior** (BRAND, datos de arte) y los usos de `accent` como texto que hay que corregir pantalla por pantalla.
4. **Resultado de QA.**
5. **Qué revisar en el navegador**, en orden.
6. **Rama y commits.**

**Prohibido:** fusionar a `main`, desplegar, ejecutar SQL, instalar dependencias y tocar la lista NO TOCAR.

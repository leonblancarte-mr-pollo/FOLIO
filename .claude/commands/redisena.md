---
description: Rediseña UNA pantalla de SEMA con diseñador + 4 revisores + QA (máx. 2 rondas), en rama propia, sin fusionar ni desplegar.
argument-hint: <pantalla> (home | explorar | social | perfil | mascota)
---

# /redisena $ARGUMENTS

Rediseña la pantalla **$ARGUMENTS** de SEMA con el sistema de agentes. Eres el agente principal: coordinas, no diseñas.

## 0. Preparación (tú)

1. **Lee las skills** con Read:
   - `.claude/skills/sema-identidad/SKILL.md`
   - `.claude/skills/sema-paleta/SKILL.md`
   - `.claude/skills/sema-voz/SKILL.md`
   - `.claude/skills/sema-prompts/SKILL.md`
   - `.claude/skills/sema-capturas/SKILL.md`
2. **Revisa los argumentos.** Si `$ARGUMENTS` está vacío o no es una pantalla válida, detente y di cuáles son válidas.
3. **Verifica los requisitos.** Si algo falta, detente y reporta qué falta y cómo resolverlo, según sema-capturas:
   - Playwright en `devDependencies`;
   - `SEMA_TEST_EMAIL` y `SEMA_TEST_PASSWORD` en `.env.local` (comprueba que existan sin imprimir sus valores);
   - `scripts/captura.js`: si no existe, créalo copiando `.claude/skills/sema-capturas/captura.js`.
4. **Verifica que `/paleta` ya corrió:** `src/theme.js` debe tener los tokens `firma`, `acentoCalido`, `superficieSuave` y `complementoFrio`. Si no los tiene, avisa que primero va `/paleta` y detente.
5. **Árbol de trabajo:** debe estar limpio (`git status`), sin contar los archivos sin seguimiento dentro de `capturas/`. Si no lo está, detente y reporta. **Nunca hagas commit de `capturas/`.**
6. **Crea la rama** `redisena-$ARGUMENTS-<AAAA-MM-DD>` desde la rama de la paleta si no está fusionada, o desde `main` si ya lo está. Di cuál usaste.
7. **Levanta `npm run dev`** en segundo plano, una sola vez para todo el flujo.

## 1. Antes y propuesta: `disenador`, ronda 1

Lanza el agente `disenador` con este encargo:
- pantalla `$ARGUMENTS`;
- capturar el ANTES en claro y oscuro;
- proponer e implementar el rediseño siguiendo las skills;
- capturar el DESPUÉS;
- entregar en su formato.

Al terminar, haz un commit en la rama: `feat(ui): $ARGUMENTS ronda 1`.

## 2. Revisión 1: cuatro revisores en paralelo

Lanza **en un solo mensaje** los agentes `critico`, `lectora`, `accesibilidad` y `copy`. A cada uno le das:
- la pantalla;
- las rutas exactas de las capturas antes/después (claro y oscuro);
- a `critico`, `accesibilidad` y `copy`, también la lista de archivos y líneas que tocó el diseñador.

No les pases tu opinión: que lleguen a la suya.

## 3. Correcciones: `disenador`, ronda 2

Pasa al `disenador` las cuatro respuestas completas. Que:
- corrija lo que corresponda;
- vuelva a capturar el DESPUÉS en claro y oscuro;
- responda punto por punto qué atendió y qué no, y por qué.

Commit: `fix(ui): $ARGUMENTS ronda 2 (revisión)`.

## 4. Revisión 2: los mismos cuatro, en paralelo

Igual que el paso 2, con las capturas nuevas y la respuesta del diseñador. **Es la última ronda: no hay tercera.**

- **Si la revisión 2 trae problemas graves** (contraste que no pasa, un principio roto, texto ilegible), el `disenador` puede hacer **una corrección puntual** de esos puntos, sin abrir otra ronda de revisión.
- **El resto** queda en «sin resolver».

## 5. QA

Lanza `qa` sobre la rama:
- build;
- ESLint;
- capturas de regresión de `explorar`, `perfil` y `social` más `$ARGUMENTS`.

Si QA encuentra algo roto por este cambio, el `disenador` lo corrige una vez y QA vuelve a verificar solo eso.

## 6. Documentación

El `disenador` actualiza `DOCUMENTACION_ARQUITECTURA.md` y regenera `DOCUMENTACION_ARQUITECTURA_COMPLETA.docx` (`python scripts/generate_docs.py`):
- entrada en el CHANGELOG;
- §III «Sistema visual» con lo aplicado a la pantalla;
- pendientes en §XII.

Commit: `docs: rediseño de $ARGUMENTS`.

Apaga `npm run dev`.

## 7. Reporte a León (tú)

1. **Capturas.** Rutas de las cuatro finales:
   - antes claro, antes oscuro;
   - después claro, después oscuro.
2. **Qué cambió.** Archivo:línea y el principio o la regla que resuelve cada cambio.
3. **Qué dijo cada revisor.** Un resumen por agente y por ronda: crítico, lectora, accesibilidad (tabla final) y copy (textos aplicados y no aplicados).
4. **QA.** Build, ESLint y lo que se rompió o no.
5. **Sin resolver.** Puntos de los revisores no atendidos, con la razón, y las decisiones propias del diseñador pendientes de León.
6. **Qué revisar en el navegador**, en orden.
7. **Rama y commits.**

**Prohibido en este comando:** fusionar a `main`, desplegar, ejecutar SQL, instalar dependencias y tocar la lista NO TOCAR de sema-prompts. Máximo dos rondas de revisión.

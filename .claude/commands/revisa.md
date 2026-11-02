---
description: Diagnostica UNA pantalla de SEMA (capturas + crítico, lectora, accesibilidad y copy) sin cambiar código.
argument-hint: <pantalla> (home | explorar | social | perfil | mascota)
---

# /revisa $ARGUMENTS

Diagnóstico de la pantalla **$ARGUMENTS**, para decidir si se rediseña. **No se cambia ningún archivo de la app.**

## 1. Preparación (tú)

1. **Lee las skills** con Read:
   - `.claude/skills/sema-identidad/SKILL.md`
   - `.claude/skills/sema-paleta/SKILL.md`
   - `.claude/skills/sema-voz/SKILL.md`
   - `.claude/skills/sema-prompts/SKILL.md`
   - `.claude/skills/sema-capturas/SKILL.md`
2. **Revisa los argumentos.** Si `$ARGUMENTS` está vacío o no es válido, detente y di qué pantallas son válidas.
3. **Verifica los requisitos de sema-capturas:**
   - Playwright instalado;
   - `SEMA_TEST_EMAIL` y `SEMA_TEST_PASSWORD` presentes (sin imprimir sus valores);
   - `scripts/captura.js`: si no existe, créalo desde la plantilla de la skill. Es el único archivo que este comando puede crear fuera de `capturas/`.
   - **Si faltan las credenciales o Playwright:** dilo al inicio del reporte y sigue solo con los revisores que trabajan sobre código (`critico`, `accesibilidad`, `copy`). La `lectora` necesita capturas, así que se omite.

## 2. Capturas (tú)

1. Levanta `npm run dev` en segundo plano.
2. Corre:
   - `node scripts/captura.js $ARGUMENTS antes`, que genera claro y oscuro;
   - si la pantalla tiene scroll, también `node scripts/captura.js $ARGUMENTS antes --full`.
3. Mira las capturas con Read.
4. Apaga `npm run dev`.

## 3. Revisión: cuatro en paralelo

Lanza **en un solo mensaje** los agentes `critico`, `lectora`, `accesibilidad` y `copy`, con:
- la pantalla;
- las rutas de las capturas.

Diles que es un diagnóstico de la pantalla actual: ronda 0, sin cambios.

## 4. Reporte a León (tú)

1. **Capturas:** las rutas.
2. **Resumen por revisor:** su entrega completa o, si es muy larga, sus puntos principales sin suavizarlos.
3. **Diagnóstico en 5 líneas.** ¿Vale la pena `/redisena $ARGUMENTS`? ¿Qué sería lo más urgente?
4. **Alcance sugerido** para el rediseño: criterios de éxito concretos.

**Prohibido:** editar código, `theme.js` o la documentación; crear ramas; hacer commits.

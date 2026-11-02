---
name: sema-capturas
description: Rutina única de capturas de SEMA con Playwright (390×844, modo claro y oscuro, usuario de prueba real) y el script scripts/captura.js. Usarla cada vez que un agente necesite ver una pantalla de SEMA antes o después de un cambio.
---

# SEMA — Capturas

Es la única rutina de revisión visual. Todos los agentes la usan igual, así las capturas se pueden comparar entre rondas.

## Requisitos (una sola vez)

1. **Playwright como dependencia de desarrollo.** Si `package.json` no lo tiene en `devDependencies`, **no se instala por cuenta propia**: se reporta a León con estos dos comandos.
   ```bash
   npm install -D playwright
   npx playwright install chromium
   ```
2. **Usuario de prueba en `.env.local`:**
   ```
   SEMA_TEST_EMAIL=...
   SEMA_TEST_PASSWORD=...
   ```
   - Ese usuario debe tener: **racha activa**, **un libro en «Leyendo»**, **mascota** y el **onboarding terminado**.
   - Si faltan las variables o el login falla, se dice al inicio del reporte y se sigue con lo que se pueda revisar sin capturas.
3. **El script.** Si `scripts/captura.js` no existe, se crea copiando tal cual `.claude/skills/sema-capturas/captura.js`.

## Reglas

- **Nunca imprimir las credenciales** en consola, archivos, commits ni reportes. El script solo las lee.
- **Formato fijo:** viewport **390×844** (`deviceScaleFactor` 2, móvil, es-MX, hora de México).
- **Siempre los dos modos.** Claro y oscuro, salvo que la tarea diga otra cosa.
- **El tema se cambia en el navegador de prueba**, escribiendo `folio_theme` = `light`/`dark` en el `localStorage` de Playwright. Esto no cambia la clave ni el código de la app.
- **Nombre y ubicación:** `capturas/<pantalla>/<AAAA-MM-DD>-<antes|despues>-<claro|oscuro>.png`. Si se repite el mismo día, se sobrescribe; la ronda 2 de `/redisena` usa `despues` otra vez.
- **Revisar cada captura.** Después de tomarla, se abre con la herramienta Read (se ve la imagen) antes de opinar sobre ella. Nunca se describe una captura sin haberla visto.
- **Errores de consola.** El script los imprime al final y van al reporte.

## Paso a paso

1. **Levantar la app.** Primero se revisa si ya responde http://localhost:5173: dentro de `/redisena`, `/revisa` y `/paleta` la levanta el agente principal una sola vez y los subagentes la reutilizan. Si no responde, se levanta en una terminal aparte (Bash con `run_in_background: true`):
   ```bash
   npm run dev
   ```
   Levanta el proxy en el puerto 3001 y Vite en http://localhost:5173. Antes de seguir, hay que esperar a que Vite diga «ready».
2. **Capturar:**
   ```bash
   node scripts/captura.js home antes              # claro y oscuro
   node scripts/captura.js home despues            # después del cambio
   node scripts/captura.js perfil despues oscuro   # solo un modo
   node scripts/captura.js perfil antes --full     # página completa (scroll)
   ```
   - Pantallas válidas: `home`, `explorar`, `social`, `perfil`, `mascota`.
   - Para otra pantalla (un modal, una subpestaña), se copia la función `goTo` del script en un script temporal del scratchpad y se agregan los clics necesarios. El nombre de archivo sigue el mismo formato.
3. **Ver las capturas** con Read y anotar lo que se ve.
4. **Apagar `npm run dev`** al terminar (TaskStop del proceso en segundo plano), pero solo si lo levantó quien lo apaga.

## Qué hace el script

1. Revisa que la app responda en `SEMA_BASE_URL` (por defecto `http://localhost:5173`). Si no responde, pide correr `npm run dev`.
2. Abre Chromium sin ventana a 390×844 e inicia sesión con el usuario de prueba: correo, contraseña y «Entrar».
3. Cambia el tema por cada modo, recarga y navega con la barra inferior (`[data-tutorial="nav-<pantalla>"]`).
4. Antes de capturar espera a que la red quede quieta, a que carguen las fuentes y a que terminen los skeletons y animaciones (1.2 s).
5. Guarda las capturas, imprime sus rutas y lista los errores de consola.

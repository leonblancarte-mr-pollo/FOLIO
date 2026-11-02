---
name: sema-prompts
description: Reglas obligatorias de todo trabajo de código en SEMA (actualizar .md y .docx, alcance chico, lista NO TOCAR, formato del reporte final). Leer SIEMPRE antes de tocar código o de entregar un reporte en SEMA.
---

# SEMA — Reglas de trabajo

## Antes de tocar código

- **Buscar con grep antes de asumir.** `App.jsx` es un monolito de unas 13,300 líneas.

## Alcance

- **Chico y con criterios de éxito claros.** Ejemplo: «Inicio: una sola acción principal, racha visible, gato pequeño, sin cajas dentro de cajas».
- **Nunca «rehacer toda la app».**
- **Solo se tocan los archivos de la tarea.** Si se encuentra algo roto fuera del alcance, se anota en el reporte y no se arregla.

## NO TOCAR

- Claves `folio_*` de `localStorage` (nombres y formato).
- El dominio de Vercel (`folio-final.vercel.app`) y la configuración del proyecto en Vercel.
- `src/services/authService.js`.

## Prohibido sin aprobación explícita de León en el chat

- Fusionar a `main`.
- Desplegar (`vercel --prod` o cualquier deploy).
- Ejecutar SQL contra Supabase o escribir en producción.
- Borrar datos.
- Instalar dependencias. Se dice el comando exacto y lo corre León.

Si una corrección necesita la base de datos, el SQL se escribe en `supabase/` como sentencias simples sin BEGIN/COMMIT, y no se ejecuta.

## Al terminar cualquier cambio de código

1. **Correr `npm run build`.** Debe compilar sin errores.
2. **Actualizar `DOCUMENTACION_ARQUITECTURA.md`:**
   - una entrada en el CHANGELOG;
   - las secciones afectadas;
   - los pendientes en §XII.
3. **Regenerar `DOCUMENTACION_ARQUITECTURA_COMPLETA.docx`** con `python scripts/generate_docs.py`.
4. **Un commit por fase**, en la rama de la tarea, con un mensaje claro en español.
   - Se agregan los archivos por nombre, nunca con `git add -A` o `.`.
   - Nunca se hace commit de `capturas/`, `.env*` ni de nada con credenciales.

## Reporte final (siempre en tres partes)

1. **Qué se hizo.** Archivos y líneas, con capturas si las hay.
2. **Qué no se hizo y por qué.**
3. **Qué debe revisar León en el navegador.** En orden, con la pantalla y lo que tiene que ver.

-- ============================================================================
-- SEMA · Banners de hito de racha en el feed (PROPUESTA, SIN EJECUTAR)
-- 2026-11-03 · rama rediseno-ronda5-2026-11-03
--
-- Qué hace la app (ya en el código): cuando update_streak() deja la racha en un hito
-- (3, 7, 10, 14, 21, 30, 50, 60, 75, 90, 100, 150, 200 y cada 50 después) se inserta UNA publicación
-- con type = 'racha' y content = {"dias":N,"inicio":"AAAA-MM-DD"} (JSON con las llaves en ese orden).
--   · "inicio" es el primer día de la racha: la fecha local de hoy menos (dias - 1).
--   · La clave única es usuario + hito + fecha de inicio de la racha: eso es exactamente
--     (user_id, content) para las filas type = 'racha'. Así no se repite el bug de duplicados de la ronda 2.
--   · NO se crean publicaciones retroactivas de rachas pasadas. Este archivo tampoco las crea.
--
-- Qué hace falta en la base de datos (esto NO se corrió; se corre A MANO en el SQL Editor de Supabase,
-- por pasos, y los pasos 1 y 4 solo leen):
--   1) Ver si posts.type tiene una restricción CHECK que deje fuera 'racha'.
--   2) Si la tiene, agregar 'racha' a la lista permitida.
--   3) Índice único parcial para que la misma racha/hito no se publique dos veces
--      (también cubre dos dispositivos a la vez y los reintentos de la cola offline).
--   4) Comprobación.
--
-- Mientras no se corran los pasos 2 y 3, la app sigue funcionando: si la restricción rechaza el tipo,
-- el insert falla, se registra en consola ("no se pudo publicar el hito de racha") y no pasa nada más.
-- Sin el paso 3 la app igual evita duplicados con una consulta previa; el índice cierra la carrera.
-- ============================================================================

-- 1) Diagnóstico (solo lee): restricciones CHECK de public.posts que mencionan la columna type.
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.posts'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%type%';
-- Si no devuelve filas, posts.type no tiene CHECK: salta al paso 3.
-- Si ya aparece 'racha' en la definición, salta al paso 3.

-- 2) Agregar 'racha' a la lista permitida. Solo actúa si la restricción tiene la forma habitual
--    CHECK (type = ANY (ARRAY['text'::text, ...])) y todavía no incluye 'racha'; en cualquier otro
--    caso avisa y no toca nada (entonces hay que editar la restricción a mano con lo que mostró el paso 1).
DO $$
DECLARE
  c record;
  nueva text;
BEGIN
  FOR c IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    IF c.def ILIKE '%''racha''%' THEN
      RAISE NOTICE '% ya incluye racha: no se toca', c.conname;
    ELSIF c.def LIKE '%ARRAY[%' THEN
      nueva := replace(c.def, 'ARRAY[', 'ARRAY[''racha''::text, ');
      EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT %I', c.conname);
      EXECUTE format('ALTER TABLE public.posts ADD CONSTRAINT %I %s', c.conname, nueva);
      RAISE NOTICE '% ampliada con racha', c.conname;
    ELSE
      RAISE NOTICE '% tiene una forma distinta: editarla a mano para permitir racha (definición: %)', c.conname, c.def;
    END IF;
  END LOOP;
END $$;

-- 3) Clave única: usuario + hito + fecha de inicio de la racha = (user_id, content) para type = 'racha'.
--    Parcial: no afecta a ninguna otra publicación. Si ya hubiera filas 'racha' repetidas, el CREATE falla
--    y hay que depurarlas antes (no debería haberlas: el tipo es nuevo).
CREATE UNIQUE INDEX IF NOT EXISTS posts_racha_hito_unico
  ON public.posts (user_id, content)
  WHERE type = 'racha';

-- 4) Comprobación (solo lee): hitos publicados por usuario; no debe haber filas con n > 1.
SELECT user_id, content, count(*) AS n
FROM public.posts
WHERE type = 'racha'
GROUP BY user_id, content
HAVING count(*) > 1;

-- Deshacer (si hiciera falta):
--   DROP INDEX IF EXISTS public.posts_racha_hito_unico;
--   DELETE FROM public.posts WHERE type = 'racha';   -- ojo: borra también sus likes y comentarios en cascada
--   (y volver a poner la restricción original de posts.type con lo que mostró el paso 1)

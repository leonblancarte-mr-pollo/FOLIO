-- ⚠️ OBSOLETO (2026-11-01): usar supabase/recovery_preview.sql y supabase/recovery_final.sql. No correr este archivo.
-- =============================================================================
-- Recuperación de posts con book_id NULL (2026-11-01)
-- NO es una migración: se corre a mano, paso por paso, en el SQL Editor.
-- Los pasos 0 a 3 SOLO LEEN. El paso 4 crea una tabla de respaldo. El paso 5 es
-- el único UPDATE: revisar antes de correrlo.
--
-- Origen del problema: `addBook` (App.jsx) no daba id a los libros agregados
-- desde BookTinder y desde la vista previa del feed, así que el post de
-- "empezó"/"terminó" se publicaba con book_id NULL. Ya está corregido en el
-- código; esto repara el histórico.
--
-- Columnas usadas (de src/services/booksService.js y socialService.js):
--   users.id, users.nombre, users.username
--   posts.id, user_id, type, action, book_id, pages_read, created_at
--   books.id, user_id, title, status, added_at, finished_at
--   reading_logs.user_id, book_id, pages_read, log_date (DATE; sin hora)
-- ⚠️ reading_logs NO tiene una columna de hora verificada en el repo: por eso
-- las sesiones de lectura se emparejan por DÍA y páginas, no por minutos.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. (Solo lectura) Confirmar que las columnas existen con esos nombres.
-- -----------------------------------------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('posts', 'books', 'reading_logs', 'users')
  AND column_name IN ('id','user_id','nombre','username','type','action','book_id',
                      'pages_read','created_at','title','status','added_at',
                      'finished_at','log_date','read_date_precision')
ORDER BY table_name, column_name;


-- -----------------------------------------------------------------------------
-- 1. (Solo lectura) Posts con book_id NULL por usuario + totales.
-- -----------------------------------------------------------------------------
SELECT
  u.id                                                        AS user_id,
  u.nombre                                                    AS nombre_completo,
  count(*)                                                    AS posts_sin_libro,
  count(*) FILTER (WHERE p.type = 'book_update' AND p.action = 'finished') AS terminados,
  count(*) FILTER (WHERE p.type = 'book_update' AND p.action = 'started')  AS empezados,
  count(*) FILTER (WHERE p.type = 'reading_session')          AS sesiones,
  min(p.created_at)                                           AS primer_post,
  max(p.created_at)                                           AS ultimo_post
FROM public.posts p
JOIN public.users u ON u.id = p.user_id
WHERE p.book_id IS NULL
  AND p.type IN ('book_update', 'reading_session')
GROUP BY u.id, u.nombre
ORDER BY posts_sin_libro DESC, u.nombre;

-- Total general (usuarios afectados y posts afectados)
SELECT count(DISTINCT p.user_id) AS usuarios_afectados,
       count(*)                  AS posts_afectados
FROM public.posts p
WHERE p.book_id IS NULL
  AND p.type IN ('book_update', 'reading_session');


-- -----------------------------------------------------------------------------
-- 2. (Solo lectura) Cada post huérfano con su libro candidato (SIEMPRE del
--    mismo usuario). Una fila por post-candidato; un post sin candidato sale
--    una vez con libro NULL.
--
--  Reglas de emparejamiento:
--   · finished : books.finished_at ± 24 h del post (el libro se marca leído y el
--                post se publica al terminar la celebración, minutos después).
--   · started  : books.added_at ± 24 h del post (BookTinder/vista previa crean el
--                libro y el post sale al publicar el borrador).
--   · reading_session: reading_logs del MISMO día (hora de México) y MISMAS
--                páginas, unidos a un libro del mismo usuario. Sin diferencia en
--                minutos (log_date es solo fecha).
--   · "cercano" = diferencia ≤ 60 min (o sesión del mismo día).
--
--  Clasificación:
--   · seguro   : exactamente 1 candidato cercano Y (diferencia ≤ 15 min, o es
--                sesión con un solo libro ese día) Y, en book_update, ningún otro
--                post huérfano del mismo tipo apunta al mismo libro.
--   · dudoso   : hay candidatos pero no cumple lo anterior (varios cercanos,
--                lejos en el tiempo, dos posts para el mismo libro…).
--   · sin_candidato : ningún libro del usuario encaja (p. ej. fue borrado).
-- -----------------------------------------------------------------------------
WITH huerfanos AS (
  SELECT p.id AS post_id, p.user_id, p.type, p.action, p.created_at, p.pages_read
  FROM public.posts p
  WHERE p.book_id IS NULL
    AND p.type IN ('book_update', 'reading_session')
),
cand AS (
  -- terminados
  SELECT h.post_id, b.id AS book_id, b.title, b.finished_at AS fecha_libro,
         'books.finished_at'::text AS fuente,
         abs(extract(epoch FROM (h.created_at - b.finished_at))) / 60 AS diff_min
  FROM huerfanos h
  JOIN public.books b ON b.user_id = h.user_id
  WHERE h.type = 'book_update' AND h.action = 'finished'
    AND b.finished_at IS NOT NULL
    AND abs(extract(epoch FROM (h.created_at - b.finished_at))) <= 86400
  UNION ALL
  -- empezados
  SELECT h.post_id, b.id, b.title, b.added_at,
         'books.added_at',
         abs(extract(epoch FROM (h.created_at - b.added_at))) / 60
  FROM huerfanos h
  JOIN public.books b ON b.user_id = h.user_id
  WHERE h.type = 'book_update' AND h.action = 'started'
    AND b.added_at IS NOT NULL
    AND abs(extract(epoch FROM (h.created_at - b.added_at))) <= 86400
  UNION ALL
  -- sesiones de lectura (mismo día en hora de México y mismas páginas)
  SELECT DISTINCT h.post_id, b.id, b.title, rl.log_date::timestamptz,
         'reading_logs.log_date',
         NULL::numeric
  FROM huerfanos h
  JOIN public.reading_logs rl
    ON rl.user_id = h.user_id
   AND rl.log_date = (h.created_at AT TIME ZONE 'America/Mexico_City')::date
   AND rl.pages_read IS NOT DISTINCT FROM h.pages_read
  JOIN public.books b ON b.id = rl.book_id AND b.user_id = h.user_id
  WHERE h.type = 'reading_session'
),
evaluado AS (
  SELECT
    h.post_id, h.user_id, h.type, h.action, h.created_at AS post_creado_utc,
    c.book_id, c.title, c.fecha_libro, c.fuente, round(c.diff_min::numeric, 1) AS diff_min,
    count(c.book_id) FILTER (WHERE c.diff_min IS NULL OR c.diff_min <= 60)
      OVER (PARTITION BY h.post_id)                              AS n_candidatos_cercanos,
    count(*) OVER (PARTITION BY h.user_id, h.type, h.action, c.book_id)
                                                                 AS posts_huerfanos_mismo_libro
  FROM huerfanos h
  LEFT JOIN cand c ON c.post_id = h.post_id
)
SELECT
  u.id      AS user_id,
  u.nombre  AS nombre_completo,
  e.post_id, e.type, e.action, e.post_creado_utc,
  e.book_id, e.title AS titulo_libro, e.fuente, e.fecha_libro, e.diff_min,
  e.n_candidatos_cercanos,
  (e.n_candidatos_cercanos > 1)                                  AS mas_de_un_candidato,
  CASE
    WHEN e.book_id IS NULL THEN 'sin_candidato'
    WHEN e.n_candidatos_cercanos = 1
     AND (e.diff_min IS NULL OR e.diff_min <= 15)
     AND (e.type = 'reading_session' OR e.posts_huerfanos_mismo_libro = 1)
      THEN 'seguro'
    ELSE 'dudoso'
  END AS clasificacion
FROM evaluado e
JOIN public.users u ON u.id = e.user_id
ORDER BY u.nombre, e.post_creado_utc DESC, e.diff_min NULLS LAST;


-- -----------------------------------------------------------------------------
-- 3. (Solo lectura) Resumen: cuántos posts caen en cada clasificación.
--    Es el paso 2 agrupado: pegar aquí el mismo WITH ... evaluado y cambiar el
--    SELECT final por el de abajo. (Cada post cuenta una vez: se toma la
--    clasificación 'seguro' si existe, si no 'dudoso', si no 'sin_candidato'.)
--
--   SELECT clasificacion, count(DISTINCT post_id) AS posts
--   FROM ( <SELECT final del paso 2 sin ORDER BY> ) t
--   GROUP BY clasificacion;
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 4. RESPALDO (crea una tabla nueva; no modifica posts). Correr ANTES del 5.
--    Verificar después que ambos conteos coinciden.
-- -----------------------------------------------------------------------------
CREATE TABLE posts_backup_20261101 AS SELECT * FROM posts;

SELECT (SELECT count(*) FROM posts)                 AS filas_posts,
       (SELECT count(*) FROM posts_backup_20261101) AS filas_respaldo;


-- -----------------------------------------------------------------------------
-- 5. UPDATE SOLO de las parejas 'seguro'. NO correr sin revisar el paso 2.
--    · filtra por id de post y exige book_id IS NULL (no pisa nada ya vinculado)
--    · exige que el libro pertenezca al mismo user_id que el post
--    · RETURNING muestra exactamente qué se cambió
--    Para poder deshacer sin soltar nada: correr el bloque completo con
--    BEGIN; … revisar el RETURNING … COMMIT;  (o ROLLBACK; si algo no cuadra).
-- -----------------------------------------------------------------------------
BEGIN;

WITH huerfanos AS (
  SELECT p.id AS post_id, p.user_id, p.type, p.action, p.created_at, p.pages_read
  FROM public.posts p
  WHERE p.book_id IS NULL
    AND p.type IN ('book_update', 'reading_session')
),
cand AS (
  SELECT h.post_id, b.id AS book_id,
         abs(extract(epoch FROM (h.created_at - b.finished_at))) / 60 AS diff_min
  FROM huerfanos h
  JOIN public.books b ON b.user_id = h.user_id
  WHERE h.type = 'book_update' AND h.action = 'finished'
    AND b.finished_at IS NOT NULL
    AND abs(extract(epoch FROM (h.created_at - b.finished_at))) <= 86400
  UNION ALL
  SELECT h.post_id, b.id,
         abs(extract(epoch FROM (h.created_at - b.added_at))) / 60
  FROM huerfanos h
  JOIN public.books b ON b.user_id = h.user_id
  WHERE h.type = 'book_update' AND h.action = 'started'
    AND b.added_at IS NOT NULL
    AND abs(extract(epoch FROM (h.created_at - b.added_at))) <= 86400
  UNION ALL
  SELECT DISTINCT h.post_id, b.id, NULL::numeric
  FROM huerfanos h
  JOIN public.reading_logs rl
    ON rl.user_id = h.user_id
   AND rl.log_date = (h.created_at AT TIME ZONE 'America/Mexico_City')::date
   AND rl.pages_read IS NOT DISTINCT FROM h.pages_read
  JOIN public.books b ON b.id = rl.book_id AND b.user_id = h.user_id
  WHERE h.type = 'reading_session'
),
evaluado AS (
  SELECT h.post_id, h.user_id, h.type, h.action, c.book_id, c.diff_min,
         count(c.book_id) FILTER (WHERE c.diff_min IS NULL OR c.diff_min <= 60)
           OVER (PARTITION BY h.post_id) AS n_cercanos,
         count(*) OVER (PARTITION BY h.user_id, h.type, h.action, c.book_id) AS mismos
  FROM huerfanos h
  JOIN cand c ON c.post_id = h.post_id
),
seguros AS (
  SELECT post_id, book_id
  FROM evaluado
  WHERE n_cercanos = 1
    AND (diff_min IS NULL OR diff_min <= 15)
    AND (type = 'reading_session' OR mismos = 1)
    AND (diff_min IS NULL OR diff_min <= 60)
)
UPDATE public.posts p
SET book_id = s.book_id
FROM seguros s
WHERE p.id = s.post_id
  AND p.book_id IS NULL
  AND EXISTS (SELECT 1 FROM public.books b
              WHERE b.id = s.book_id AND b.user_id = p.user_id)
RETURNING p.id AS post_id, p.user_id, p.type, p.action, p.book_id;

-- Revisar el RETURNING. Si es lo esperado:  COMMIT;   Si no:  ROLLBACK;

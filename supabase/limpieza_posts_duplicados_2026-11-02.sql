-- ============================================================================
-- Limpieza de publicaciones de sesión duplicadas (PROPUESTA, SIN EJECUTAR)
-- 2026-11-02 · rama rediseno-ronda2-2026-11-02
--
-- Causa (ya corregida en el código): al registrar páginas desde Social,
-- logReadingSession() publicaba la sesión y luego «¿Compartir tu sesión?»
-- (ShareSessionModal) insertaba OTRA fila reading_session con el mismo libro,
-- páginas y hora. Ahora el modal completa el post existente (updateSessionPost)
-- y el feed colapsa los pares viejos al mostrarlos (collapseDuplicateSessions),
-- pero las filas duplicadas SIGUEN en la base hasta correr esto.
--
-- Se corre A MANO en el SQL Editor de Supabase, por pasos. Los pasos 1 y 2
-- solo leen. El paso 3 borra: revisar antes el resultado del paso 2.
-- Al borrar un post se van en cascada (si las FK son ON DELETE CASCADE) sus
-- likes, comentarios y notificaciones: por eso se conserva la copia que tenga
-- comentario, comentarios o más likes.
-- ============================================================================

-- 1) Diagnóstico: pares de sesión del mismo autor, libro y páginas con menos
--    de 10 minutos de diferencia.
SELECT a.user_id, a.book_id, a.pages_read,
       a.id AS post_a, a.created_at AS hora_a, coalesce(a.content, '') AS texto_a,
       b.id AS post_b, b.created_at AS hora_b, coalesce(b.content, '') AS texto_b
FROM public.posts a
JOIN public.posts b
  ON a.user_id = b.user_id
 AND a.book_id = b.book_id
 AND coalesce(a.pages_read, 0) = coalesce(b.pages_read, 0)
 AND a.id <> b.id
 AND a.created_at <= b.created_at
 AND b.created_at - a.created_at < interval '10 minutes'
WHERE a.type = 'reading_session' AND b.type = 'reading_session'
ORDER BY a.created_at DESC;

-- 2) Cuál se borraría: en cada grupo se conserva la de más «peso»
--    (texto > comentarios > likes > la más vieja).
WITH pares AS (
  SELECT p.*,
         (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id)   AS n_comentarios,
         (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id) AS n_likes,
         min(p.created_at) OVER (PARTITION BY p.user_id, p.book_id, coalesce(p.pages_read, 0),
                                 date_trunc('hour', p.created_at)) AS grupo_hora
  FROM public.posts p
  WHERE p.type = 'reading_session'
),
rank AS (
  SELECT *, row_number() OVER (
           PARTITION BY user_id, book_id, coalesce(pages_read, 0), grupo_hora
           ORDER BY (coalesce(content, '') <> '') DESC, n_comentarios DESC, n_likes DESC, created_at ASC
         ) AS orden,
         count(*) OVER (PARTITION BY user_id, book_id, coalesce(pages_read, 0), grupo_hora) AS en_grupo
  FROM pares
)
SELECT id, user_id, book_id, pages_read, created_at, content, n_comentarios, n_likes,
       CASE WHEN orden = 1 THEN 'se queda' ELSE 'se borra' END AS decision
FROM rank
WHERE en_grupo > 1
ORDER BY user_id, created_at;

-- 3) Borrado (descomentar SOLO después de revisar el paso 2).
-- BEGIN;
-- WITH pares AS (
--   SELECT p.*,
--          (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id)   AS n_comentarios,
--          (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id) AS n_likes,
--          min(p.created_at) OVER (PARTITION BY p.user_id, p.book_id, coalesce(p.pages_read, 0),
--                                  date_trunc('hour', p.created_at)) AS grupo_hora
--   FROM public.posts p WHERE p.type = 'reading_session'
-- ), rank AS (
--   SELECT id, row_number() OVER (
--            PARTITION BY user_id, book_id, coalesce(pages_read, 0), grupo_hora
--            ORDER BY (coalesce(content, '') <> '') DESC, n_comentarios DESC, n_likes DESC, created_at ASC
--          ) AS orden
--   FROM pares
-- )
-- DELETE FROM public.posts WHERE id IN (SELECT id FROM rank WHERE orden > 1);
-- -- Revisar el número de filas; si cuadra con el paso 2: COMMIT; si no: ROLLBACK;
-- COMMIT;

-- 4) Notificaciones de like duplicadas: ya cubiertas por
--    supabase/lote_ui_2026-11-01.sql (pasos 3 y 4, índice notifications_like_once),
--    que tampoco se ha ejecutado.

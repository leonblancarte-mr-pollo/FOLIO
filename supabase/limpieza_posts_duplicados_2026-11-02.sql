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

-- 2) Cuál se borraría. Se compara PAR CONTRA PAR (misma ventana de 10 min que
--    el paso 1, no por hora del reloj): un post se borra solo si tiene un
--    gemelo (mismo autor, libro y páginas, < 10 min) con más «peso»:
--    texto > comentarios > likes > más viejo > id menor (desempate).
CREATE TEMP VIEW sesiones_peso AS
SELECT p.id, p.user_id, p.book_id, coalesce(p.pages_read, 0) AS pages, p.created_at, p.content,
       (coalesce(p.content, '') <> '')::int                                  AS con_texto,
       (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id)       AS n_comentarios,
       (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id)     AS n_likes
FROM public.posts p
WHERE p.type = 'reading_session';

SELECT x.id, x.user_id, x.book_id, x.pages, x.created_at, x.content, x.n_comentarios, x.n_likes,
       'se borra' AS decision, y.id AS se_queda
FROM sesiones_peso x
JOIN sesiones_peso y
  ON x.user_id = y.user_id AND x.book_id = y.book_id AND x.pages = y.pages AND x.id <> y.id
 AND abs(extract(epoch FROM (x.created_at - y.created_at))) < 600
 AND (y.con_texto, y.n_comentarios, y.n_likes, -extract(epoch FROM y.created_at), y.id::text)
   > (x.con_texto, x.n_comentarios, x.n_likes, -extract(epoch FROM x.created_at), x.id::text)
ORDER BY x.user_id, x.created_at;

-- 3) Borrado. Descomentar SOLO después de revisar el paso 2, en la misma
--    sesión del SQL Editor (usa la vista temporal del paso 2). Correr el
--    DELETE, comparar el número de filas con el paso 2 y entonces COMMIT;
--    si no cuadra, ROLLBACK.
-- BEGIN;
-- DELETE FROM public.posts
-- WHERE id IN (
--   SELECT x.id
--   FROM sesiones_peso x
--   JOIN sesiones_peso y
--     ON x.user_id = y.user_id AND x.book_id = y.book_id AND x.pages = y.pages AND x.id <> y.id
--    AND abs(extract(epoch FROM (x.created_at - y.created_at))) < 600
--    AND (y.con_texto, y.n_comentarios, y.n_likes, -extract(epoch FROM y.created_at), y.id::text)
--      > (x.con_texto, x.n_comentarios, x.n_likes, -extract(epoch FROM x.created_at), x.id::text)
-- );
-- -- ¿Cuadra con el paso 2? Entonces: COMMIT;   Si no: ROLLBACK;

-- 4) Notificaciones de like duplicadas: ya cubiertas por
--    supabase/lote_ui_2026-11-01.sql (pasos 3 y 4, índice notifications_like_once),
--    que tampoco se ha ejecutado.

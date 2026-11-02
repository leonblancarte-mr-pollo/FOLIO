-- =============================================================================
-- recovery_final.sql — UPDATE de posts con book_id NULL (2026-11-01)
-- Correr DESPUÉS de revisar recovery_preview.sql. Una sola sentencia UPDATE
-- (sin BEGIN/COMMIT) + una consulta de verificación al final.
-- Respaldo previo: posts_backup_20261101 (111 filas). Este archivo no lo toca.
-- Para deshacer un post: UPDATE posts SET book_id = NULL WHERE id = '<post_id>';
--
-- Misma lógica que recovery_preview.sql. Solo se actualizan los 'seguro':
-- 1 libro candidato del mismo user_id a ≤ 60 min y diferencia ≤ 15 min.
--
-- QUEDAN FUERA (siguen con book_id NULL; no se fuerzan):
--   · sin candidato: el libro fue borrado; o es un "terminó" de un libro que ya
--     había sido premiado antes (reward_ledger es idempotente por libro, así que
--     no hay fila nueva); o un "empezó" de un libro que ya estaba en la
--     biblioteca (added_at viejo); o una sesión cuyo log no tiene logged_at.
--   · varios libros candidatos: p. ej. dos libros terminados con pocos minutos
--     de diferencia (los posts c4c140a9… y d586ff3f… de León están a 1.5 min).
--   · diferencia > 15 min: la señal existe pero está lejos del post.
-- La lista exacta de posts fuera es la de recovery_preview.sql con
-- clasificacion distinta de 'seguro'.
-- =============================================================================
WITH pendientes AS (
  SELECT p.id AS post_id, p.user_id, p.type, p.action, p.pages_read, p.created_at
  FROM public.posts p
  WHERE p.book_id IS NULL
    AND p.type IN ('book_update', 'reading_session')
),
senales AS (
  SELECT pe.post_id, b.id AS book_id,
         abs(extract(epoch FROM (pe.created_at - rl.created_at))) / 60 AS diff_min
  FROM pendientes pe
  JOIN public.reward_ledger rl ON rl.user_id = pe.user_id AND rl.reason = 'book_finished'
  JOIN public.books b ON b.id::text = rl.ref AND b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'finished'
  UNION ALL
  SELECT pe.post_id, b.id,
         abs(extract(epoch FROM (pe.created_at - b.added_at))) / 60
  FROM pendientes pe
  JOIN public.books b ON b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'started'
    AND b.added_at IS NOT NULL
  UNION ALL
  SELECT pe.post_id, b.id,
         abs(extract(epoch FROM (pe.created_at - lg.logged_at))) / 60
  FROM pendientes pe
  JOIN public.reading_logs lg ON lg.user_id = pe.user_id
  JOIN public.books b ON b.id = lg.book_id AND b.user_id = pe.user_id
  WHERE pe.type = 'reading_session'
    AND lg.logged_at IS NOT NULL
    AND (pe.pages_read IS NULL OR lg.pages_read = pe.pages_read)
),
por_libro AS (
  SELECT post_id, book_id, min(diff_min) AS diff_min
  FROM senales
  WHERE diff_min <= 60
  GROUP BY post_id, book_id
),
seguros AS (
  SELECT post_id, book_id
  FROM (
    SELECT post_id, book_id, diff_min,
           count(*) OVER (PARTITION BY post_id) AS n_candidatos
    FROM por_libro
  ) t
  WHERE n_candidatos = 1
    AND diff_min <= 15
)
UPDATE public.posts p
SET book_id = s.book_id
FROM seguros s
WHERE p.id = s.post_id
  AND p.book_id IS NULL
  AND EXISTS (SELECT 1 FROM public.books b
              WHERE b.id = s.book_id AND b.user_id = p.user_id)
RETURNING p.id AS post_id, p.user_id, p.type, p.action, p.book_id;


-- Verificación (correr después del UPDATE)
SELECT
  count(*) FILTER (WHERE book_id IS NOT NULL) AS posts_con_libro,
  count(*) FILTER (WHERE book_id IS NULL)     AS aun_sin_libro
FROM public.posts
WHERE type IN ('book_update', 'reading_session');

-- =============================================================================
-- recovery_preview.sql — SOLO LECTURA (2026-11-01)
-- Vista previa del emparejamiento de posts con book_id NULL. No cambia nada.
-- Correr ANTES de recovery_final.sql: lo que salga aquí como 'seguro' es
-- exactamente lo que recovery_final.sql va a actualizar (misma lógica).
--
-- Columnas (confirmadas en el repo):
--   posts         id, user_id, type, action, book_id, created_at          socialService.fetchFeed / createFeedPost
--   books         id, user_id, title, added_at                            booksService.bookToDb
--   reading_logs  user_id, book_id, pages_read, logged_at                 App.jsx:3104, wrapsService.js:41
--   reward_ledger user_id, reason, ref, created_at                        sprint1_server_authority.sql:25
--                 (trg_book_finished: reason='book_finished', ref=books.id::text)
--   users         id, nombre
--
-- Regla por tipo (candidato = libro del MISMO user_id con su señal a ≤ 60 min
-- del post; los candidatos se cuentan como libros DISTINTOS):
--   finished        → reward_ledger.created_at de 'book_finished'
--   started         → books.added_at
--   reading_session → reading_logs.logged_at (si el post trae pages_read,
--                     solo logs con las mismas páginas)
-- 'seguro' = exactamente 1 libro candidato Y diferencia ≤ 15 min.
-- =============================================================================
WITH pendientes AS (
  SELECT p.id AS post_id, p.user_id, p.type, p.action, p.pages_read, p.created_at
  FROM public.posts p
  WHERE p.book_id IS NULL
    AND p.type IN ('book_update', 'reading_session')
),
senales AS (
  SELECT pe.post_id, b.id AS book_id, 'reward_ledger'::text AS metodo,
         abs(extract(epoch FROM (pe.created_at - rl.created_at))) / 60 AS diff_min
  FROM pendientes pe
  JOIN public.reward_ledger rl ON rl.user_id = pe.user_id AND rl.reason = 'book_finished'
  JOIN public.books b ON b.id::text = rl.ref AND b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'finished'
  UNION ALL
  SELECT pe.post_id, b.id, 'added_at',
         abs(extract(epoch FROM (pe.created_at - b.added_at))) / 60
  FROM pendientes pe
  JOIN public.books b ON b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'started'
    AND b.added_at IS NOT NULL
  UNION ALL
  SELECT pe.post_id, b.id, 'logged_at',
         abs(extract(epoch FROM (pe.created_at - lg.logged_at))) / 60
  FROM pendientes pe
  JOIN public.reading_logs lg ON lg.user_id = pe.user_id
  JOIN public.books b ON b.id = lg.book_id AND b.user_id = pe.user_id
  WHERE pe.type = 'reading_session'
    AND lg.logged_at IS NOT NULL
    AND (pe.pages_read IS NULL OR lg.pages_read = pe.pages_read)
),
por_libro AS (           -- mejor señal de cada libro candidato
  SELECT post_id, book_id, min(metodo) AS metodo, min(diff_min) AS diff_min
  FROM senales
  WHERE diff_min <= 60
  GROUP BY post_id, book_id
),
elegido AS (
  SELECT post_id, book_id, metodo, diff_min,
         count(*)     OVER (PARTITION BY post_id) AS n_candidatos,
         row_number() OVER (PARTITION BY post_id ORDER BY diff_min) AS rk
  FROM por_libro
)
SELECT
  u.nombre                           AS nombre_completo,
  pe.post_id,
  pe.user_id,
  pe.type,
  pe.action,
  pe.created_at                      AS post_creado_utc,
  e.book_id                          AS libro_candidato,
  b.title                            AS titulo,
  e.metodo,
  round(e.diff_min::numeric, 1)      AS diff_min,
  COALESCE(e.n_candidatos, 0)        AS n_candidatos,
  CASE
    WHEN e.book_id IS NULL     THEN 'fuera: sin candidato a ≤ 60 min'
    WHEN e.n_candidatos > 1    THEN 'fuera: varios libros candidatos'
    WHEN e.diff_min > 15       THEN 'fuera: diferencia > 15 min'
    ELSE 'seguro'
  END                                AS clasificacion
FROM pendientes pe
JOIN public.users u ON u.id = pe.user_id
LEFT JOIN elegido e ON e.post_id = pe.post_id AND e.rk = 1
LEFT JOIN public.books b ON b.id = e.book_id AND b.user_id = pe.user_id
ORDER BY u.nombre, pe.created_at;

-- ⚠️ OBSOLETO (2026-11-01): usar supabase/recovery_preview.sql y supabase/recovery_final.sql. No correr este archivo.
-- =============================================================================
-- Candidatos para los posts que siguen con book_id NULL (2026-11-01)
-- UNA sola consulta, SOLO LECTURA. Exportar el resultado (CSV o copiar la
-- tabla) y pasárselo a Claude para escribir recovery_posts_book_id_final.sql
-- con VALUES (post_id, book_id) explícitos.
--
-- Columnas confirmadas en el repo:
--   posts: id, user_id, type, action, book_id, pages_read, created_at   (socialService.fetchFeed)
--   books: id, user_id, title, author, status, added_at, finished_at     (booksService.bookToDb)
--   reading_logs: user_id, book_id, pages_read, log_date, logged_at,     (readingService, App.jsx:3104,
--                 session_id; FK book_id → books (embed books(title))     security_patch_reading_logs.sql)
--   reward_ledger: user_id, reason, ref, created_at; el trigger
--                 trg_book_finished escribe reason='book_finished', ref=books.id::text
--                 en el instante exacto en que el libro pasó a 'read'  (sprint1_server_authority.sql)
--   users: id, nombre
--
-- Señales por tipo de post (todas del MISMO user_id que el post):
--   finished        → reward_ledger 'book_finished' (hora exacta del cambio a leído)
--                     y books.finished_at (puede estar editado por "fecha de lectura")
--   started         → books.added_at (libro agregado como "Leyendo")
--   reading_session → reading_logs.logged_at (+ si coinciden las páginas)
-- Ventana: ±3 días alrededor del post; hasta 6 candidatos por post, ordenados
-- por cercanía.
-- =============================================================================
WITH pendientes AS (
  SELECT p.id AS post_id, p.user_id, p.type, p.action, p.pages_read, p.created_at
  FROM public.posts p
  WHERE p.book_id IS NULL
    AND p.type IN ('book_update', 'reading_session')
),
cand AS (
  -- terminados: momento en que el servidor premió el libro terminado
  SELECT pe.post_id, b.id AS book_id, b.title, b.author, b.status,
         'ledger.book_finished'::text AS senal, rl.created_at AS momento,
         NULL::int AS paginas_log
  FROM pendientes pe
  JOIN public.reward_ledger rl
    ON rl.user_id = pe.user_id AND rl.reason = 'book_finished'
  JOIN public.books b
    ON b.id::text = rl.ref AND b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'finished'
  UNION ALL
  SELECT pe.post_id, b.id, b.title, b.author, b.status,
         'books.finished_at', b.finished_at, NULL
  FROM pendientes pe
  JOIN public.books b ON b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'finished'
    AND b.finished_at IS NOT NULL
  UNION ALL
  -- empezados
  SELECT pe.post_id, b.id, b.title, b.author, b.status,
         'books.added_at', b.added_at, NULL
  FROM pendientes pe
  JOIN public.books b ON b.user_id = pe.user_id
  WHERE pe.type = 'book_update' AND pe.action = 'started'
    AND b.added_at IS NOT NULL
  UNION ALL
  -- sesiones de lectura
  SELECT pe.post_id, b.id, b.title, b.author, b.status,
         'reading_logs.logged_at', COALESCE(lg.logged_at, lg.log_date::timestamptz), lg.pages_read
  FROM pendientes pe
  JOIN public.reading_logs lg ON lg.user_id = pe.user_id
  JOIN public.books b ON b.id = lg.book_id AND b.user_id = pe.user_id
  WHERE pe.type = 'reading_session'
),
rankeado AS (
  SELECT c.*,
         round((extract(epoch FROM (pe.created_at - c.momento)) / 60)::numeric, 1) AS min_post_menos_senal,
         row_number() OVER (PARTITION BY c.post_id
                            ORDER BY abs(extract(epoch FROM (pe.created_at - c.momento)))) AS n
  FROM cand c
  JOIN pendientes pe ON pe.post_id = c.post_id
  WHERE abs(extract(epoch FROM (pe.created_at - c.momento))) <= 3 * 86400
)
SELECT
  u.nombre                       AS nombre_completo,
  pe.user_id,
  pe.post_id,
  pe.type,
  pe.action,
  pe.created_at                  AS post_creado_utc,
  pe.pages_read                  AS paginas_post,
  r.n                            AS rango,
  r.book_id,
  r.title                        AS titulo,
  r.author                       AS autor,
  r.status                       AS estado_libro,
  r.senal,
  r.momento                      AS momento_senal_utc,
  r.min_post_menos_senal,
  r.paginas_log
FROM pendientes pe
JOIN public.users u ON u.id = pe.user_id
LEFT JOIN rankeado r ON r.post_id = pe.post_id AND r.n <= 6
ORDER BY u.nombre, pe.created_at, pe.post_id, r.n NULLS LAST;

-- =============================================================================
-- lote_ui_2026-11-01.sql — Notificaciones de like duplicadas
-- Correr A MANO en el SQL Editor de Supabase, EN ORDEN, una sentencia a la vez.
-- Sentencias simples, sin BEGIN/COMMIT. Nada aquí toca posts ni posts_backup_20261101.
--
-- Contexto: el cliente insertaba la notificación de like en paralelo al like,
-- también cuando el like ya existía (23505), y no la quitaba al deshacer el like.
-- Like → quitar → like dejaba dos notificaciones con la misma hora. El cliente ya
-- está corregido (App.jsx: notifyLike). Esto limpia el histórico y lo impide en la
-- base.
--
-- Columnas usadas (de App.jsx, NotificationsSheet y notifyLike):
--   notifications.id, user_id (destinatario), actor_id, type, post_id,
--   comment_id, read, created_at
-- =============================================================================


-- 1. (SOLO LECTURA) ¿Son duplicadas de verdad?
--    Una fila por grupo repetido: mismo destinatario, mismo actor, mismo tipo y
--    la MISMA publicación o comentario. Si los "pares" de Sarah Rosas
--    (c1a22d22-0a78-4d6b-b1ee-21ec0d2d94fb) aparecen aquí, son duplicados; si no
--    aparecen, eran likes a publicaciones distintas (ahora la hoja lo dice).
SELECT n.user_id AS destinatario,
       u.nombre  AS destinatario_nombre,
       n.actor_id,
       a.nombre  AS actor_nombre,
       n.type, n.post_id, n.comment_id,
       count(*)          AS copias,
       min(n.created_at) AS primera,
       max(n.created_at) AS ultima
FROM public.notifications n
LEFT JOIN public.users u ON u.id = n.user_id
LEFT JOIN public.users a ON a.id = n.actor_id
WHERE n.type IN ('like_post', 'like_comment')
GROUP BY n.user_id, u.nombre, n.actor_id, a.nombre, n.type, n.post_id, n.comment_id
HAVING count(*) > 1
ORDER BY copias DESC, ultima DESC;


-- 2. (SOLO LECTURA) Cuántas filas borraría el paso 3.
SELECT count(*) AS filas_a_borrar
FROM public.notifications n
WHERE n.type IN ('like_post', 'like_comment')
  AND EXISTS (
    SELECT 1 FROM public.notifications m
    WHERE m.type = n.type
      AND m.user_id = n.user_id
      AND m.actor_id = n.actor_id
      AND m.post_id IS NOT DISTINCT FROM n.post_id
      AND m.comment_id IS NOT DISTINCT FROM n.comment_id
      AND (m.created_at, m.id::text) < (n.created_at, n.id::text)
  );


-- 3. LIMPIEZA (BORRA FILAS; correr solo si el paso 2 da lo esperado).
--    Conserva la notificación MÁS ANTIGUA de cada grupo repetido y borra las
--    demás. Solo likes; comentarios y solicitudes de amistad no se tocan.
--    Esperado: "DELETE n" con n = filas_a_borrar del paso 2.
DELETE FROM public.notifications n
WHERE n.type IN ('like_post', 'like_comment')
  AND EXISTS (
    SELECT 1 FROM public.notifications m
    WHERE m.type = n.type
      AND m.user_id = n.user_id
      AND m.actor_id = n.actor_id
      AND m.post_id IS NOT DISTINCT FROM n.post_id
      AND m.comment_id IS NOT DISTINCT FROM n.comment_id
      AND (m.created_at, m.id::text) < (n.created_at, n.id::text)
  );


-- 4. PREVENCIÓN: una sola notificación de like por (destinatario, actor, tipo,
--    publicación/comentario). Correr DESPUÉS del paso 3 (si quedan duplicados,
--    falla con "could not create unique index" y no cambia nada: repetir 2 y 3).
--    El cliente trata el 23505 resultante como "ya existía" y no muestra error.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_like_once
  ON public.notifications (user_id, actor_id, type, COALESCE(post_id::text, comment_id::text))
  WHERE type IN ('like_post', 'like_comment');


-- 5. (SOLO LECTURA) Verificación: debe devolver 0.
SELECT count(*) AS grupos_duplicados
FROM (
  SELECT 1 FROM public.notifications
  WHERE type IN ('like_post', 'like_comment')
  GROUP BY user_id, actor_id, type, post_id, comment_id
  HAVING count(*) > 1
) t;

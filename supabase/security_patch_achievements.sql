-- ============================================================================
-- FOLIO — Security patch: logros falsificables
-- Correr en Supabase → SQL Editor, DESPUÉS de sprint1_server_authority.sql.
--
-- Problema: la política ach_write_own (auth_rls_migration.sql) es FOR ALL,
-- así que cualquier cliente autenticado podía hacer:
--   supabase.from('achievements').insert({ user_id: <yo>, achievement_key: 'top_reader' })
-- y desbloquear CUALQUIER logro sin cumplir su condición real — incluidos
-- los que pagan gemas vía claim_achievement_gems() o postean automáticamente
-- al feed (FEED_WORTHY_ACHIEVEMENTS).
--
-- Fix:
--   1. Se elimina la política de escritura del cliente: INSERT/UPDATE/DELETE
--      en achievements quedan bloqueados para authenticated/anon. La lectura
--      social (ach_select_auth, ya existente) se mantiene intacta.
--   2. RPC award_achievement(key) SECURITY DEFINER: recalcula la condición
--      real del logro — la misma lógica de checkAchievements() en App.jsx,
--      trasladada a SQL — contra las tablas del usuario AUTENTICADO
--      (auth.uid(), nunca un id que mande el cliente) y solo entonces
--      inserta la fila. Devuelve true si se otorgó, false si no cumple la
--      condición o si ya estaba desbloqueado (idempotente).
-- ============================================================================

-- 1. Lockdown: el cliente pierde INSERT/UPDATE/DELETE directo.
DROP POLICY IF EXISTS ach_write_own ON public.achievements;
-- Sin política de escritura para authenticated: toda escritura pasa por award_achievement().

-- 2. RPC de validación + otorgamiento
CREATE OR REPLACE FUNCTION public.award_achievement(p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  month_start timestamptz := date_trunc('month', now());
  ok boolean := false;
  total_pages int;
  cur_streak int;
  this_month_count int;
BEGIN
  IF uid IS NULL OR p_key IS NULL THEN RETURN false; END IF;

  -- Idempotente: si ya estaba desbloqueado, no vuelve a evaluar ni a insertar.
  IF EXISTS (SELECT 1 FROM achievements WHERE user_id = uid AND achievement_key = p_key) THEN
    RETURN false;
  END IF;

  SELECT total_pages_read, current_streak INTO total_pages, cur_streak
    FROM user_streaks WHERE user_id = uid;
  total_pages := COALESCE(total_pages, 0);
  cur_streak  := COALESCE(cur_streak, 0);

  SELECT count(*) INTO this_month_count FROM books
    WHERE user_id = uid AND status = 'read' AND finished_at >= month_start;

  CASE p_key
    WHEN 'first_book_added' THEN
      ok := EXISTS (SELECT 1 FROM books WHERE user_id = uid);
    WHEN 'first_book_read' THEN
      ok := EXISTS (SELECT 1 FROM books WHERE user_id = uid AND status = 'read');
    WHEN 'first_review' THEN
      ok := EXISTS (SELECT 1 FROM books WHERE user_id = uid AND length(coalesce(review,'')) > 10);
    WHEN 'rated_5_books' THEN
      ok := (SELECT count(*) FROM books WHERE user_id = uid AND rating > 0) >= 5;
    WHEN 'marathon_reader' THEN
      ok := this_month_count >= 3;
    WHEN 'speed_reader' THEN
      ok := this_month_count >= 5;
    WHEN 'explorer' THEN
      ok := (SELECT count(DISTINCT genre) FROM books WHERE user_id = uid AND status = 'read' AND genre IS NOT NULL) >= 3;
    WHEN 'genre_master' THEN
      ok := (SELECT count(DISTINCT genre) FROM books WHERE user_id = uid AND status = 'read' AND genre IS NOT NULL) >= 5;
    WHEN 'collector_10' THEN
      ok := (SELECT count(*) FROM books WHERE user_id = uid) >= 10;
    WHEN 'collector_50' THEN
      ok := (SELECT count(*) FROM books WHERE user_id = uid) >= 50;
    WHEN 'first_log' THEN
      ok := EXISTS (SELECT 1 FROM reading_logs WHERE user_id = uid);
    WHEN 'sessions_30' THEN
      ok := (SELECT count(*) FROM reading_logs WHERE user_id = uid) >= 30;
    WHEN 'pages_100' THEN
      ok := total_pages >= 100;
    WHEN 'pages_1000' THEN
      ok := total_pages >= 1000;
    WHEN 'pages_10000' THEN
      ok := total_pages >= 10000;
    WHEN 'big_session' THEN
      ok := EXISTS (SELECT 1 FROM reading_logs WHERE user_id = uid AND pages_read >= 100);
    WHEN 'night_owl' THEN
      ok := (SELECT count(*) FROM reading_logs WHERE user_id = uid AND logged_at IS NOT NULL AND EXTRACT(HOUR FROM logged_at) >= 22) >= 5;
    WHEN 'streak_7' THEN
      ok := cur_streak >= 7;
    WHEN 'streak_30' THEN
      ok := cur_streak >= 30;
    WHEN 'streak_90' THEN
      ok := cur_streak >= 90;
    WHEN 'first_comment' THEN
      ok := EXISTS (SELECT 1 FROM comments WHERE user_id = uid);
    WHEN 'comments_10' THEN
      ok := (SELECT count(*) FROM comments WHERE user_id = uid) >= 10;
    WHEN 'first_friend' THEN
      ok := EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted' AND (user_id = uid OR friend_id = uid));
    WHEN 'friends_5' THEN
      ok := (SELECT count(*) FROM friendships WHERE status = 'accepted' AND (user_id = uid OR friend_id = uid)) >= 5;
    WHEN 'first_message' THEN
      ok := EXISTS (SELECT 1 FROM messages WHERE sender_id = uid);
    WHEN 'uam_book' THEN
      ok := EXISTS (SELECT 1 FROM books WHERE user_id = uid AND is_uam_book = true);
    WHEN 'top_reader' THEN
      -- Leyó al menos 1 libro este mes y ningún amigo aceptado leyó >= que él/ella.
      ok := this_month_count > 0 AND NOT EXISTS (
        SELECT 1 FROM friendships f
        JOIN books b ON b.user_id = (CASE WHEN f.user_id = uid THEN f.friend_id ELSE f.user_id END)
        WHERE f.status = 'accepted' AND (f.user_id = uid OR f.friend_id = uid)
          AND b.status = 'read' AND b.finished_at >= month_start
        GROUP BY b.user_id
        HAVING count(*) >= this_month_count
      );
    ELSE
      ok := false; -- key desconocida: nunca se otorga
  END CASE;

  IF ok THEN
    INSERT INTO achievements (user_id, achievement_key)
      VALUES (uid, p_key)
      ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  RETURN ok;
END $$;

GRANT EXECUTE ON FUNCTION public.award_achievement(text) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN:
--   supabase.from('achievements').insert({ user_id: <mi id>, achievement_key: 'top_reader' })
--     → 0 filas (sin política de INSERT, RLS lo bloquea)
--   supabase.rpc('award_achievement', { p_key: 'top_reader' })
--     → devuelve false si no cumples la condición real; true + fila insertada si sí.
-- ============================================================================

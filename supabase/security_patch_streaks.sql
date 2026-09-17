-- ============================================================================
-- FOLIO — Security patch: racha (user_streaks) client-authority
-- Correr en Supabase → SQL Editor, DESPUÉS de sprint1_server_authority.sql
-- y security_patch_reading_logs.sql (usa reading_logs.log_date real).
--
-- Problema: streaks_write_own (auth_rls_migration.sql) es FOR ALL, así que
-- cualquier cliente autenticado podía hacer:
--   supabase.from('user_streaks').update({ current_streak: 99999, longest_streak: 99999 })
-- sin haber leído nada. current_streak alimenta logros (streak_7/30/90) y
-- el check-in diario de XP de la mascota (pet_daily_checkin).
--
-- Fix:
--   1. Se elimina la política de escritura del cliente. Solo queda SELECT
--      (streaks_select_auth, ya existente — lectura social abierta).
--   2. RPC update_streak() SECURITY DEFINER: exige que exista un
--      reading_log REAL de hoy (fecha local México, unificada con §4.1) del
--      usuario autenticado antes de avanzar la racha; recalcula
--      total_pages_read como SUMA real de reading_logs (nunca confía en un
--      número que mande el cliente).
--   3. RPCs reset_monthly_freeze() y use_streak_freeze() SECURITY DEFINER
--      para lo que antes escribía directo el cliente (asignación mensual del
--      protector de racha y su consumo).
-- ============================================================================

-- 1. Lockdown: el cliente pierde INSERT/UPDATE/DELETE directo.
DROP POLICY IF EXISTS streaks_write_own ON public.user_streaks;
-- streaks_select_auth se mantiene: lectura social abierta (perfiles de amigos).

-- 2. RPC principal: avanzar la racha a partir de un reading_log real de hoy.
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS public.user_streaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  v_existing public.user_streaks%ROWTYPE;
  v_has_log boolean;
  v_total_pages int;
  v_new_streak int;
  v_result public.user_streaks%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;

  SELECT EXISTS(SELECT 1 FROM reading_logs WHERE user_id = uid AND log_date = today)
    INTO v_has_log;
  IF NOT v_has_log THEN
    RAISE EXCEPTION 'update_streak: no hay reading_logs de hoy (%) para este usuario', today;
  END IF;

  SELECT COALESCE(SUM(pages_read), 0) INTO v_total_pages
    FROM reading_logs WHERE user_id = uid;

  SELECT * INTO v_existing FROM user_streaks WHERE user_id = uid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_log_date, total_pages_read, updated_at)
    VALUES (uid, 1, 1, today, v_total_pages, now())
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;

  -- Racha con PAUSA (nunca se resetea): mismo día no suma; cualquier otro
  -- día con lectura real suma 1 y retoma donde quedó, sin importar el hueco.
  IF v_existing.last_log_date = today THEN
    v_new_streak := v_existing.current_streak;
  ELSE
    v_new_streak := COALESCE(v_existing.current_streak, 0) + 1;
  END IF;

  UPDATE user_streaks SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
    last_log_date = today,
    total_pages_read = v_total_pages,
    updated_at = now()
  WHERE user_id = uid
  RETURNING * INTO v_result;

  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION public.update_streak() TO authenticated;

-- 3. RPCs del freeze (protector de racha)
CREATE OR REPLACE FUNCTION public.reset_monthly_freeze()
RETURNS public.user_streaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_month int := EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Mexico_City'))::int;
  v_result public.user_streaks%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  UPDATE user_streaks SET streak_freezes_remaining = 1, last_freeze_reset_month = v_month
    WHERE user_id = uid
      AND last_freeze_reset_month IS DISTINCT FROM v_month
      AND COALESCE(streak_freezes_remaining, 1) < 1
    RETURNING * INTO v_result;
  IF NOT FOUND THEN
    SELECT * INTO v_result FROM user_streaks WHERE user_id = uid;
  END IF;
  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_freeze() TO authenticated;

CREATE OR REPLACE FUNCTION public.use_streak_freeze()
RETURNS public.user_streaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  v_month int := EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Mexico_City'))::int;
  v_result public.user_streaks%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  UPDATE user_streaks SET
    streak_freeze_used_at = today,
    streak_freezes_remaining = 0,
    last_freeze_reset_month = v_month
  WHERE user_id = uid AND COALESCE(streak_freezes_remaining, 0) > 0
  RETURNING * INTO v_result;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'use_streak_freeze: no hay protector disponible';
  END IF;
  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION public.use_streak_freeze() TO authenticated;

-- ============================================================================
-- VERIFICACIÓN:
--   supabase.from('user_streaks').update({ current_streak: 99999 }).eq('user_id', <mi id>)
--     → 0 filas (sin política de UPDATE)
--   supabase.rpc('update_streak') sin haber registrado lectura hoy
--     → error "no hay reading_logs de hoy para este usuario"
--   Registrar una sesión de lectura y luego llamar update_streak()
--     → current_streak avanza según reading_logs reales.
-- ============================================================================

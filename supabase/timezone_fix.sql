-- ============================================================================
-- FOLIO — Fix de zonas horarias: unificar a fecha local México server-side
-- Correr en Supabase → SQL Editor, DESPUÉS de sprint1_server_authority.sql.
--
-- Problema: pet_daily_checkin() y claim_daily_gems() usan `current_date`,
-- que en Postgres/Supabase corre en UTC — mientras que el cliente calcula
-- `log_date`/fechas de racha en su hora LOCAL (México, UTC-6). Para un
-- usuario que lee entre ~18:00 y 23:59 hora de México, `current_date` (UTC)
-- ya es el día siguiente aunque para el usuario siga siendo "hoy": el
-- check-in diario de racha podía no pagar (o el gate de "leyó ayer" fallar)
-- justo en esa ventana.
--
-- Fix: todo el cálculo de "hoy" server-side pasa a
-- (now() AT TIME ZONE 'America/Mexico_City')::date, consistente con la fecha
-- local que ya usa el cliente para reading_logs.log_date/user_streaks.
-- (reading_logs y user_streaks no se tocan aquí: ya reciben `log_date` en
-- hora local del cliente vía el flujo existente; ver
-- security_patch_reading_logs.sql y security_patch_streaks.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pet_daily_checkin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  v_streak public.user_streaks%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = uid;
  IF FOUND AND COALESCE(v_streak.current_streak, 0) > 0
     AND v_streak.last_log_date IS NOT NULL
     AND v_streak.last_log_date::date >= today - 1 THEN
    PERFORM folio_award(uid, 3, 0, 'daily_streak', to_char(today, 'YYYY-MM-DD'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_gems()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  g public.user_gems%ROWTYPE;
  v_consecutive int; v_earned int;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;

  SELECT * INTO g FROM user_gems WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN
    -- Bienvenida (equivalente al initUserGems del cliente)
    INSERT INTO user_gems (user_id, balance) VALUES (uid, 5);
    INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
      VALUES (uid, 0, 5, 'welcome', uid::text)
      ON CONFLICT DO NOTHING;
    SELECT * INTO g FROM user_gems WHERE user_id = uid FOR UPDATE;
  END IF;

  IF g.last_daily_reward IS NOT NULL
     AND EXTRACT(EPOCH FROM (now() - g.last_daily_reward)) / 3600 < 20 THEN
    RETURN 0;
  END IF;

  v_consecutive := COALESCE(g.consecutive_days, 0) + 1;
  v_earned := 5 + (v_consecutive / 7);

  UPDATE user_gems SET
    balance = COALESCE(balance, 0) + v_earned,
    last_daily_reward = now(),
    consecutive_days = v_consecutive
  WHERE user_id = uid;

  INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
    VALUES (uid, 0, v_earned, 'daily_login', to_char(today, 'YYYY-MM-DD'))
    ON CONFLICT DO NOTHING;

  RETURN v_earned;
END $$;

-- daily_save_limits: el cliente ya fue corregido para escribir `date` con la
-- fecha LOCAL del dispositivo (localDateStr(), igual que reading_logs) en
-- vez de new Date().toISOString() (UTC) — ver src/services/recommendationService.js.
-- No requiere cambio de esquema ni de RLS, solo se documenta aquí para que
-- quede junto con el resto de la unificación de zona horaria.

-- ============================================================================
-- VERIFICACIÓN: con el reloj del servidor en UTC, simular un check-in a las
-- 23:30 hora de México (05:30 UTC del día siguiente) → pet_daily_checkin y
-- claim_daily_gems deben usar el día de México (23:30 de hoy), no el de UTC
-- (00:30 de "mañana").
-- ============================================================================

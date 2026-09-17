-- ============================================================================
-- FOLIO — Security patch: farmeo infinito de XP/gemas vía reading_logs
-- Correr en Supabase → SQL Editor, DESPUÉS de sprint1_server_authority.sql.
--
-- Problema: trg_reading_logged premiaba con ref=NULL (sin idempotencia) en
-- CADA INSERT a reading_logs. La política reading_logs_own es FOR ALL, así
-- que cualquier cliente autenticado podía insertar filas fabricadas
-- (pages_read inventado) sin límite y farmear XP/gemas infinitamente.
--
-- Fix:
--   1. Columna session_id (uuid, UNIQUE, default gen_random_uuid()) —
--      identifica una sesión de lectura real. El cliente la genera una vez
--      (crypto.randomUUID()) y la reutiliza en reintentos offline: un
--      reintento que ya se sincronizó choca con la UNIQUE constraint
--      (error 23505) en vez de duplicar la fila y la recompensa.
--   2. trg_reading_logged usa session_id como ref en folio_award → cada
--      sesión paga UNA sola vez aunque la fila se duplicara por algún motivo.
--   3. Rate limit server-side: máximo 12 logs recompensados por día y 4 por
--      hora por usuario. Pasado el límite, el log se guarda (no rompe la
--      UX ni la racha) pero folio_award no se llama, así que no paga.
-- ============================================================================

ALTER TABLE public.reading_logs
  ADD COLUMN IF NOT EXISTS session_id uuid NOT NULL DEFAULT gen_random_uuid();

-- UNIQUE global: un mismo session_id nunca puede insertarse dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS reading_logs_session_id_key
  ON public.reading_logs (session_id);

CREATE OR REPLACE FUNCTION public.trg_reading_logged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count_today int;
  v_count_hour  int;
BEGIN
  SELECT count(*) INTO v_count_today
    FROM reading_logs
    WHERE user_id = NEW.user_id AND log_date = NEW.log_date;

  SELECT count(*) INTO v_count_hour
    FROM reading_logs
    WHERE user_id = NEW.user_id
      AND logged_at IS NOT NULL
      AND logged_at > now() - interval '1 hour';

  -- Rate limit: pasado el límite, el registro queda guardado pero sin recompensa.
  IF v_count_today > 12 OR v_count_hour > 4 THEN
    RETURN NEW;
  END IF;

  PERFORM folio_award(
    NEW.user_id,
    (COALESCE(NEW.pages_read, 0) / 10) * 2,
    5,
    'reading_session',
    NEW.session_id::text
  );
  RETURN NEW;
END $$;

-- ============================================================================
-- VERIFICACIÓN:
--   1. Insertar el mismo session_id dos veces desde el cliente (simular un
--      reintento offline) → la segunda inserción falla con
--      "duplicate key value violates unique constraint reading_logs_session_id_key".
--   2. Insertar 20 reading_logs seguidos del mismo usuario en el mismo día →
--      a partir del #13 el registro se guarda pero reward_ledger deja de crecer.
--   3. Insertar 6 reading_logs en menos de una hora → a partir del #5 no paga
--      (aunque el día no haya llegado al tope de 12).
-- ============================================================================

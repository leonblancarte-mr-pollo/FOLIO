-- ============================================================================
-- FOLIO — Sprint 1: XP y gemas con autoridad SERVER-SIDE
-- Correr en Supabase → SQL Editor (después de auth_rls_migration.sql).
--
-- Objetivo: que el navegador NO pueda manipular xp/level/gemas directamente.
-- Implementado con RPCs + triggers SECURITY DEFINER (no Edge Functions):
-- misma garantía — los montos se deciden en Postgres y RLS bloquea la
-- escritura directa — pero se despliega pegando este SQL, sin CLI ni deploy.
--
-- Diseño:
--   · reward_ledger  → libro mayor: cada recompensa queda registrada y las
--     recompensas por-hecho son idempotentes (UNIQUE user+reason+ref).
--   · folio_award()  → única puerta de entrada interna (NO ejecutable por
--     clientes) que suma gemas y XP/nivel con la misma fórmula del cliente.
--   · Triggers en books y reading_logs → recompensas derivadas de HECHOS.
--   · RPCs acotadas para lo que el cliente inicia (login diario, check-in
--     de racha, gemas de logros): montos fijos server-side + idempotencia.
--   · Lockdown RLS: user_gems solo-lectura para clientes; user_pets protege
--     xp/level con trigger de columnas (el cliente solo puede renombrar).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Libro mayor de recompensas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  xp int NOT NULL DEFAULT 0,
  gems int NOT NULL DEFAULT 0,
  reason text NOT NULL,
  ref text,                       -- id del hecho (libro, fecha, logro); NULL = sin idempotencia
  created_at timestamptz DEFAULT now()
);
-- Idempotencia solo cuando hay ref (los NULL no chocan entre sí en UNIQUE,
-- por eso se usa un índice parcial explícito):
CREATE UNIQUE INDEX IF NOT EXISTS reward_ledger_once
  ON public.reward_ledger (user_id, reason, ref) WHERE ref IS NOT NULL;

ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ledger_select_own ON public.reward_ledger;
CREATE POLICY ledger_select_own ON public.reward_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Sin políticas de escritura: solo funciones SECURITY DEFINER insertan.

-- ----------------------------------------------------------------------------
-- 2. Función interna de otorgamiento (NO ejecutable por clientes)
--    Misma fórmula de nivel que el cliente actual: xp necesario = nivel * 100,
--    tope nivel 50.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.folio_award(
  p_user uuid, p_xp int, p_gems int, p_reason text, p_ref text
) RETURNS boolean            -- true = otorgado, false = ya estaba otorgado
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pet public.user_pets%ROWTYPE;
  v_level int; v_xp int;
BEGIN
  IF p_user IS NULL OR (COALESCE(p_xp,0) <= 0 AND COALESCE(p_gems,0) <= 0) THEN
    RETURN false;
  END IF;

  -- Idempotencia por hecho (si ref viene NULL, siempre otorga)
  BEGIN
    INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
    VALUES (p_user, COALESCE(p_xp,0), COALESCE(p_gems,0), p_reason, p_ref);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  -- Gemas (crea la fila si no existe)
  IF COALESCE(p_gems,0) > 0 THEN
    UPDATE user_gems SET balance = COALESCE(balance,0) + p_gems WHERE user_id = p_user;
    IF NOT FOUND THEN
      INSERT INTO user_gems (user_id, balance) VALUES (p_user, p_gems);
    END IF;
  END IF;

  -- XP y nivel de la mascota
  IF COALESCE(p_xp,0) > 0 THEN
    SELECT * INTO v_pet FROM user_pets WHERE user_id = p_user FOR UPDATE;
    IF FOUND THEN
      v_level := GREATEST(1, COALESCE(v_pet.level, 1));
      v_xp := COALESCE(v_pet.xp, 0) + p_xp;
      WHILE v_level < 50 AND v_xp >= v_level * 100 LOOP
        v_xp := v_xp - v_level * 100;
        v_level := v_level + 1;
      END LOOP;
      IF v_level >= 50 THEN
        v_level := 50;
        v_xp := LEAST(v_xp, 50 * 100);
      END IF;
      UPDATE user_pets SET xp = v_xp, level = v_level, updated_at = now()
        WHERE id = v_pet.id;
    END IF;
  END IF;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.folio_award(uuid,int,int,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.folio_award(uuid,int,int,text,text) FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Trigger: libro terminado → +50 XP, +50 gemas (montos actuales del cliente)
--    Idempotente por libro: terminar→desterminar→terminar paga UNA sola vez.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_book_finished()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'read' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'read') THEN
    PERFORM folio_award(NEW.user_id, 50, 50, 'book_finished', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS book_finished_rewards_upd ON public.books;
CREATE TRIGGER book_finished_rewards_upd
  AFTER UPDATE OF status ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.trg_book_finished();

DROP TRIGGER IF EXISTS book_finished_rewards_ins ON public.books;
CREATE TRIGGER book_finished_rewards_ins
  AFTER INSERT ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.trg_book_finished();

-- ----------------------------------------------------------------------------
-- 4. Trigger: sesión de lectura → +2 XP por cada 10 páginas, +5 gemas
--    (montos actuales del cliente; una recompensa por cada log real)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_reading_logged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM folio_award(
    NEW.user_id,
    (COALESCE(NEW.pages_read, 0) / 10) * 2,
    5,
    'reading_session',
    NULL                          -- cada sesión registrada recompensa (como hoy)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reading_log_rewards ON public.reading_logs;
CREATE TRIGGER reading_log_rewards
  AFTER INSERT ON public.reading_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_reading_logged();

-- ----------------------------------------------------------------------------
-- 5. RPC: check-in diario de racha → +3 XP (reemplaza el gate de localStorage;
--    idempotente por día y por usuario, multi-dispositivo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pet_daily_checkin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_streak public.user_streaks%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = uid;
  -- Igual que el cliente: solo si hay racha activa (leyó hoy o ayer)
  IF FOUND AND COALESCE(v_streak.current_streak, 0) > 0
     AND v_streak.last_log_date IS NOT NULL
     AND v_streak.last_log_date::date >= current_date - 1 THEN
    PERFORM folio_award(uid, 3, 0, 'daily_streak', to_char(current_date, 'YYYY-MM-DD'));
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.pet_daily_checkin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC: gemas diarias de login (misma lógica del cliente: +5 +bonus de
--    consecutivos, gate de 20 h). Crea la fila con bienvenida (+5) si no existe.
--    Devuelve las gemas otorgadas en esta llamada.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_gems()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
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
    VALUES (uid, 0, v_earned, 'daily_login', to_char(current_date, 'YYYY-MM-DD'))
    ON CONFLICT DO NOTHING;

  RETURN v_earned;
END $$;

GRANT EXECUTE ON FUNCTION public.claim_daily_gems() TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC: gemas por logros → +10 por logro, UNA vez por logro, y solo si el
--    logro realmente existe en la tabla achievements de ese usuario.
--    Devuelve el balance resultante.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_achievement_gems(p_keys text[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  k text;
BEGIN
  IF uid IS NULL OR p_keys IS NULL THEN RETURN NULL; END IF;
  FOREACH k IN ARRAY p_keys LOOP
    IF EXISTS (SELECT 1 FROM achievements WHERE user_id = uid AND achievement_key = k) THEN
      PERFORM folio_award(uid, 0, 10, 'achievement', k);
    END IF;
  END LOOP;
  RETURN (SELECT balance FROM user_gems WHERE user_id = uid);
END $$;

GRANT EXECUTE ON FUNCTION public.claim_achievement_gems(text[]) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. LOCKDOWN — el navegador ya no puede escribir gemas ni XP
-- ----------------------------------------------------------------------------

-- user_gems: SOLO lectura para el dueño; toda escritura pasa por las funciones.
DROP POLICY IF EXISTS user_gems_own ON public.user_gems;
DROP POLICY IF EXISTS user_gems_select_own ON public.user_gems;
CREATE POLICY user_gems_select_own ON public.user_gems
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_pets: el cliente puede crear su mascota (limpia: nivel 1, 0 xp) y
-- editarla, pero un trigger protege xp/level de escrituras directas.
DROP POLICY IF EXISTS pets_write_own ON public.user_pets;
DROP POLICY IF EXISTS pets_insert_self ON public.user_pets;
DROP POLICY IF EXISTS pets_update_own ON public.user_pets;
DROP POLICY IF EXISTS pets_delete_own ON public.user_pets;
CREATE POLICY pets_insert_self ON public.user_pets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND COALESCE(level,1) = 1 AND COALESCE(xp,0) = 0);
CREATE POLICY pets_update_own ON public.user_pets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY pets_delete_own ON public.user_pets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Candado de columnas: si quien escribe es un rol de cliente (authenticated/anon),
-- xp y level se conservan tal cual estaban. Las funciones SECURITY DEFINER
-- (dueño postgres) pasan sin restricción.
CREATE OR REPLACE FUNCTION public.guard_pet_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_pet_columns ON public.user_pets;
CREATE TRIGGER protect_pet_columns
  BEFORE UPDATE ON public.user_pets
  FOR EACH ROW EXECUTE FUNCTION public.guard_pet_columns();

-- ============================================================================
-- VERIFICACIÓN RÁPIDA (correr como usuario autenticado desde la app/console):
--   supabase.from('user_gems').update({ balance: 99999 }).eq('user_id', <mi id>)
--     → 0 filas afectadas (sin política de UPDATE)
--   supabase.from('user_pets').update({ xp: 99999, level: 50 }).eq('user_id', <mi id>)
--     → la fila se actualiza pero xp/level NO cambian (trigger de candado)
-- ============================================================================

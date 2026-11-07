-- ============================================================================
-- COLLAGES (MVP, 2026-11-06) — rama collages-mvp
-- ----------------------------------------------------------------------------
-- Qué crea:
--   · collage_sets            catálogo del servidor (espejo de src/data/collage-catalog.json):
--                             forma de obtención y precio. El servidor valida contra ESTA tabla.
--   · collage_config          probabilidad del premio por racha, red de seguridad y límite de collages.
--   · user_collage_inventory  inventario permanente por usuario (set desbloqueado = para siempre).
--   · collage_unlock_events   historial de tiradas, premios y compras (idempotente).
--   · collage_reward_state    fallos seguidos por usuario (red de seguridad).
--   · collages                documentos editables (JSON de capas) + vista previa.
--   · RPCs: collage_mi_estado(), collage_streak_roll(), buy_collage_set(text).
--
-- Seguridad (revisado 2026-11-06): solo CREA objetos nuevos (6 tablas, 7 funciones, 2 triggers sobre la tabla
-- nueva `collages`, políticas y permisos de esas tablas). No hace ALTER, UPDATE, DELETE ni DROP sobre tablas,
-- columnas, funciones o datos existentes. Las únicas escrituras a tablas que ya existen (user_gems, reward_ledger)
-- ocurren DENTRO de buy_collage_set cuando un usuario compra un set, igual que spend_gems.
--
-- Cómo se corre: a mano en el SQL Editor de Supabase, completo, de arriba abajo. Es idempotente
-- (se puede volver a correr). Sin BEGIN/COMMIT. Requiere sprint1_server_authority.sql (reward_ledger,
-- user_gems), timezone_fix.sql (fecha México) y trueque_schema.sql (users.is_premium = Sema Plus).
--
-- Mientras NO se corra, la app funciona en «modo local» (collageService): los collages y el inventario
-- se guardan en el navegador (clave sema_collages_v1:<user>), la tirada de racha se hace en el cliente
-- con la misma regla, y la compra con gemas queda deshabilitada («La tienda se está actualizando»).
--
-- Si cambias el catálogo (precio, set de racha/gemas/plus, set nuevo): actualiza también el bloque
-- «CATÁLOGO» de abajo y vuelve a correr SOLO ese bloque.
-- ============================================================================

-- --------------------------------------------------------------------------- tablas
CREATE TABLE IF NOT EXISTS public.collage_sets (
  id         text PRIMARY KEY,
  nombre     text NOT NULL,
  obtencion  text NOT NULL CHECK (obtencion IN ('inicial', 'racha', 'gemas', 'plus')),
  precio     int  CHECK (precio IS NULL OR precio > 0),
  activo     boolean NOT NULL DEFAULT true,
  CHECK (obtencion <> 'gemas' OR precio IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.collage_config (
  key   text PRIMARY KEY,
  value numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_collage_inventory (
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  set_id      text NOT NULL REFERENCES public.collage_sets(id) ON UPDATE CASCADE,
  origen      text NOT NULL CHECK (origen IN ('inicial', 'racha', 'gemas', 'plus', 'regalo')),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, set_id)
);

CREATE TABLE IF NOT EXISTS public.collage_unlock_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  origen     text NOT NULL CHECK (origen IN ('racha', 'gemas', 'plus', 'regalo')),
  ref        text NOT NULL,              -- racha: fecha México del registro; gemas: id del set
  resultado  text NOT NULL CHECK (resultado IN ('premio', 'sin_premio', 'sin_candidatos', 'compra')),
  set_id     text REFERENCES public.collage_sets(id) ON UPDATE CASCADE,
  probabilidad numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, origen, ref)          -- idempotencia: una tirada por día, una compra por set
);

CREATE TABLE IF NOT EXISTS public.collage_reward_state (
  user_id         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  fallos_seguidos int  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  titulo     text CHECK (titulo IS NULL OR char_length(titulo) <= 80),
  formato    text NOT NULL DEFAULT 'historia' CHECK (formato IN ('historia', 'cuadrado')),
  doc        jsonb NOT NULL,
  preview    text CHECK (preview IS NULL OR char_length(preview) <= 400000),  -- data URL JPEG chica
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pg_column_size(doc) <= 200000)
);
CREATE INDEX IF NOT EXISTS collages_user_idx ON public.collages (user_id, updated_at DESC);

-- --------------------------------------------------------------------------- CATÁLOGO (espejo del JSON)
INSERT INTO public.collage_sets (id, nombre, obtencion, precio, activo) VALUES
  ('papeles',    'Papeles',          'inicial', NULL, true),
  ('tinta',      'Tinta',            'inicial', NULL, true),
  ('trance',     'Trance',           'racha',   NULL, true),
  ('tercer-ojo', 'Tercer ojo',       'racha',   NULL, true),
  ('olimpo',     'Olimpo',           'racha',   NULL, true),
  ('bodegon',    'Bodegón',          'racha',   NULL, true),
  ('poe',        'Nevermore',        'racha',   NULL, true),
  ('botanico',   'Botánico',         'gemas',   100,  true),
  ('sello',      'Sellos de planta', 'gemas',   100,  true),
  ('tarot',      'Arcanos',          'gemas',   100,  true),
  ('musica',     'Lado B',           'gemas',   100,  true),
  ('marcador',   'Subrayado',        'inicial', NULL, true),
  ('cables',     'Sin señal',        'racha',   NULL, true),
  ('flores',     'Floritas',         'gemas',   100,  true),
  ('tatuaje',    'Vieja escuela',    'gemas',   100,  true)
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre, obtencion = EXCLUDED.obtencion, precio = EXCLUDED.precio, activo = EXCLUDED.activo;
-- Un set que se quita del catálogo NO se borra (alguien puede tenerlo en su inventario): solo deja de salir en
-- tiradas y de venderse. Solo toca collage_sets, la tabla que crea este mismo archivo.
UPDATE public.collage_sets SET activo = false
 WHERE activo AND id NOT IN ('papeles', 'tinta', 'trance', 'tercer-ojo', 'olimpo', 'bodegon', 'poe', 'botanico', 'sello', 'tarot', 'musica', 'marcador', 'cables', 'flores', 'tatuaje');

INSERT INTO public.collage_config (key, value) VALUES
  ('probabilidad_inicial', 0.30),   -- recompensas.probabilidadInicial
  ('incremento_por_fallo', 0),      -- recompensas.incrementoPorFallo
  ('max_sin_premio',       5),      -- recompensas.maxSinPremio: nunca más de 5 registros seguidos sin premio
  ('limite_sin_plus',      5)       -- limites.collagesSinPlus
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- --------------------------------------------------------------------------- RLS
ALTER TABLE public.collage_sets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collage_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collage_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collage_unlock_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collage_reward_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collages               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collage_sets_read ON public.collage_sets;
CREATE POLICY collage_sets_read ON public.collage_sets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS collage_config_read ON public.collage_config;
CREATE POLICY collage_config_read ON public.collage_config FOR SELECT TO authenticated USING (true);

-- Inventario, historial y estado: solo lectura propia. Sin políticas de escritura → solo las RPCs.
DROP POLICY IF EXISTS collage_inv_read_own ON public.user_collage_inventory;
CREATE POLICY collage_inv_read_own ON public.user_collage_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS collage_events_read_own ON public.collage_unlock_events;
CREATE POLICY collage_events_read_own ON public.collage_unlock_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS collage_state_read_own ON public.collage_reward_state;
CREATE POLICY collage_state_read_own ON public.collage_reward_state FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Collages: privados, todo propio. (Ver collages de otros queda fuera del MVP: se publica una imagen congelada en posts.)
DROP POLICY IF EXISTS collages_select_own ON public.collages;
CREATE POLICY collages_select_own ON public.collages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS collages_insert_own ON public.collages;
CREATE POLICY collages_insert_own ON public.collages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS collages_update_own ON public.collages;
CREATE POLICY collages_update_own ON public.collages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS collages_delete_own ON public.collages;
CREATE POLICY collages_delete_own ON public.collages FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.collage_sets, public.collage_config, public.user_collage_inventory,
              public.collage_unlock_events, public.collage_reward_state, public.collages FROM anon;
GRANT SELECT ON public.collage_sets, public.collage_config, public.user_collage_inventory,
                public.collage_unlock_events, public.collage_reward_state TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.collage_sets, public.collage_config, public.user_collage_inventory,
                                 public.collage_unlock_events, public.collage_reward_state FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collages TO authenticated;

-- --------------------------------------------------------------------------- helpers internos
CREATE OR REPLACE FUNCTION public.collage_cfg(p_key text, p_default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT value FROM collage_config WHERE key = p_key), p_default)
$$;
REVOKE ALL ON FUNCTION public.collage_cfg(text, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.collage_is_plus(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT is_premium FROM users WHERE id = p_uid), false)
$$;
REVOKE ALL ON FUNCTION public.collage_is_plus(uuid) FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------------- límite de collages (servidor)
CREATE OR REPLACE FUNCTION public.trg_collages_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lim int := public.collage_cfg('limite_sin_plus', 5)::int;
BEGIN
  IF public.collage_is_plus(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  -- Bloquea las filas del usuario para que dos guardados a la vez no pasen el tope.
  PERFORM 1 FROM collages WHERE user_id = NEW.user_id FOR UPDATE;
  IF (SELECT count(*) FROM collages WHERE user_id = NEW.user_id) >= v_lim THEN
    RAISE EXCEPTION 'COLLAGE_LIMIT' USING HINT = v_lim::text;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS collages_limit ON public.collages;
CREATE TRIGGER collages_limit BEFORE INSERT ON public.collages
  FOR EACH ROW EXECUTE FUNCTION public.trg_collages_limit();

CREATE OR REPLACE FUNCTION public.trg_collages_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.user_id := OLD.user_id;     -- un collage no cambia de dueño
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS collages_touch ON public.collages;
CREATE TRIGGER collages_touch BEFORE UPDATE ON public.collages
  FOR EACH ROW EXECUTE FUNCTION public.trg_collages_touch();

-- --------------------------------------------------------------------------- RPC: estado del usuario
-- Devuelve { success, plus, sets: [ids desbloqueados por inventario], fallos_seguidos, limite, usados }.
-- Los sets «inicial» no se guardan: son de todos. Los «plus» se abren con users.is_premium.
CREATE OR REPLACE FUNCTION public.collage_mi_estado()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'plus', public.collage_is_plus(uid),
    'sets', coalesce((SELECT jsonb_agg(set_id ORDER BY unlocked_at) FROM user_collage_inventory WHERE user_id = uid), '[]'::jsonb),
    'fallos_seguidos', coalesce((SELECT fallos_seguidos FROM collage_reward_state WHERE user_id = uid), 0),
    'limite', CASE WHEN public.collage_is_plus(uid) THEN NULL ELSE public.collage_cfg('limite_sin_plus', 5)::int END,
    'usados', (SELECT count(*) FROM collages WHERE user_id = uid)
  );
END $$;
REVOKE ALL ON FUNCTION public.collage_mi_estado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collage_mi_estado() TO authenticated;

-- --------------------------------------------------------------------------- RPC: tirada al registrar la racha
-- Se llama justo después de update_streak() (readingService). Reglas:
--   · Exige un reading_log real de HOY (fecha México), igual que update_streak.
--   · Una sola tirada por día y usuario (UNIQUE user+origen+ref con ref = fecha): idempotente.
--   · Candidatos = sets activos con obtencion 'racha' que el usuario aún no tiene. Sin candidatos no se tira.
--   · p = min(1, probabilidad_inicial + incremento_por_fallo × fallos_seguidos).
--   · Red de seguridad: si ya lleva max_sin_premio fallos seguidos, esta tirada gana sí o sí.
-- Devuelve { success, duplicate, resultado: premio|sin_premio|sin_candidatos, set_id?, fallos_seguidos }.
CREATE OR REPLACE FUNCTION public.collage_streak_roll()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid      uuid := auth.uid();
  v_hoy    date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  v_fallos int;
  v_max    int := public.collage_cfg('max_sin_premio', 5)::int;
  v_p      numeric;
  v_set    text;
  v_prev   collage_unlock_events%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reading_logs WHERE user_id = uid AND log_date = v_hoy) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_LOG_TODAY');
  END IF;

  INSERT INTO collage_reward_state (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT fallos_seguidos INTO v_fallos FROM collage_reward_state WHERE user_id = uid FOR UPDATE;

  SELECT * INTO v_prev FROM collage_unlock_events WHERE user_id = uid AND origen = 'racha' AND ref = v_hoy::text;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'resultado', v_prev.resultado,
                              'set_id', v_prev.set_id, 'fallos_seguidos', v_fallos);
  END IF;

  SELECT s.id INTO v_set
    FROM collage_sets s
   WHERE s.activo AND s.obtencion = 'racha'
     AND NOT EXISTS (SELECT 1 FROM user_collage_inventory i WHERE i.user_id = uid AND i.set_id = s.id)
   ORDER BY random()
   LIMIT 1;

  IF v_set IS NULL THEN
    INSERT INTO collage_unlock_events (user_id, origen, ref, resultado) VALUES (uid, 'racha', v_hoy::text, 'sin_candidatos');
    RETURN jsonb_build_object('success', true, 'duplicate', false, 'resultado', 'sin_candidatos', 'fallos_seguidos', v_fallos);
  END IF;

  v_p := least(1, public.collage_cfg('probabilidad_inicial', 0.30) + public.collage_cfg('incremento_por_fallo', 0) * v_fallos);

  IF v_fallos >= v_max OR random() < v_p THEN
    INSERT INTO user_collage_inventory (user_id, set_id, origen) VALUES (uid, v_set, 'racha') ON CONFLICT DO NOTHING;
    INSERT INTO collage_unlock_events (user_id, origen, ref, resultado, set_id, probabilidad)
      VALUES (uid, 'racha', v_hoy::text, 'premio', v_set, v_p);
    UPDATE collage_reward_state SET fallos_seguidos = 0, updated_at = now() WHERE user_id = uid;
    RETURN jsonb_build_object('success', true, 'duplicate', false, 'resultado', 'premio', 'set_id', v_set, 'fallos_seguidos', 0);
  END IF;

  INSERT INTO collage_unlock_events (user_id, origen, ref, resultado, probabilidad)
    VALUES (uid, 'racha', v_hoy::text, 'sin_premio', v_p);
  UPDATE collage_reward_state SET fallos_seguidos = v_fallos + 1, updated_at = now() WHERE user_id = uid;
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'resultado', 'sin_premio', 'fallos_seguidos', v_fallos + 1);

EXCEPTION
  WHEN unique_violation THEN
    -- Otra llamada del mismo día ganó la carrera: esta no cuenta.
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'resultado', 'sin_premio');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;
REVOKE ALL ON FUNCTION public.collage_streak_roll() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collage_streak_roll() TO authenticated;

-- --------------------------------------------------------------------------- RPC: compra con gemas
-- El precio lo fija collage_sets (el cliente solo manda el id). Descuento atómico + fila negativa en
-- reward_ledger (reason 'collage_set', ref = set) + inventario + historial, todo en una transacción.
-- Comprar un set que ya se tiene no cobra (duplicate: true).
CREATE OR REPLACE FUNCTION public.buy_collage_set(p_set_id text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid     uuid := auth.uid();
  v_set   collage_sets%ROWTYPE;
  v_bal   int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_set FROM collage_sets WHERE id = p_set_id AND activo;
  IF NOT FOUND OR v_set.obtencion <> 'gemas' OR v_set.precio IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SET_NOT_FOR_SALE');
  END IF;

  IF EXISTS (SELECT 1 FROM user_collage_inventory WHERE user_id = uid AND set_id = p_set_id) THEN
    SELECT balance INTO v_bal FROM user_gems WHERE user_id = uid;
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'balance', coalesce(v_bal, 0), 'set_id', p_set_id);
  END IF;

  UPDATE user_gems SET balance = balance - v_set.precio
   WHERE user_id = uid AND balance >= v_set.precio
  RETURNING balance INTO v_bal;
  IF NOT FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM user_gems WHERE user_id = uid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'GEMS_NO_BALANCE');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'GEMS_INSUFFICIENT', 'precio', v_set.precio);
  END IF;

  INSERT INTO reward_ledger (user_id, xp, gems, reason, ref) VALUES (uid, 0, -v_set.precio, 'collage_set', p_set_id);
  INSERT INTO user_collage_inventory (user_id, set_id, origen) VALUES (uid, p_set_id, 'gemas');
  INSERT INTO collage_unlock_events (user_id, origen, ref, resultado, set_id) VALUES (uid, 'gemas', p_set_id, 'compra', p_set_id);

  RETURN jsonb_build_object('success', true, 'duplicate', false, 'balance', v_bal, 'set_id', p_set_id);

EXCEPTION
  WHEN unique_violation THEN
    -- Doble toque: la otra llamada ya cobró y entregó; el bloque deshace el descuento de esta.
    SELECT balance INTO v_bal FROM user_gems WHERE user_id = uid;
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'balance', coalesce(v_bal, 0), 'set_id', p_set_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;
REVOKE ALL ON FUNCTION public.buy_collage_set(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_collage_set(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- --------------------------------------------------------------------------- verificación (solo lee)
-- SELECT * FROM collage_sets;
-- SELECT * FROM collage_config;
-- SELECT public.collage_mi_estado();            -- desde la app (con sesión), no desde el SQL Editor
-- SELECT * FROM collage_unlock_events ORDER BY created_at DESC LIMIT 20;

-- ============================================================================
-- FOLIO — Trueque de Libros (MVP)
-- Correr en Supabase → SQL Editor, DESPUÉS de sprint1_server_authority.sql,
-- privacy_hardening.sql y timezone_fix.sql. Es idempotente (se puede re-correr).
--
-- Contenido:
--   0. Helpers (normalización de títulos, lectura de config)
--   1. users.is_premium (con guard: el cliente NO puede auto-otorgárselo)
--   2. Tablas + enums + índices
--   3. Config editable (trueque_gems_cost)
--   4. Triggers (límites free/Plus, cancelación al quitar un libro)
--   5. RLS
--   6. RPCs (SECURITY DEFINER)
--   7. Storage (bucket 'trueque')
--   8. Expiración automática (cleanup_expired_matches + pg_cron)
--
-- Supuestos y desviaciones del diseño original (ver también DOCUMENTACION_ARQUITECTURA.md):
--   · Un match es UNA fila por pareja de usuarios; user_a_id < user_b_id (canónico), así
--     no se duplica si buscan A o B. Un match "parcial" tiene un solo libro (el otro NULL).
--   · El match por lista "Por leer" (books.status='want_to_read') NO es otro tipo: se
--     trata como extensión de "Busco" y se marca con via_reading_list = true.
--   · El UNIQUE de matches es un índice único PARCIAL (solo estados vivos) con COALESCE
--     para tratar NULL como valor; así un match expirado/cancelado no bloquea uno nuevo.
--   · folio_award() no acepta deltas negativos (ignora gemas <= 0), así que el cobro de la
--     búsqueda se hace dentro de cost_search_matches() con una fila negativa en reward_ledger.
--   · find_book_matches() exige un "crédito de búsqueda" emitido por cost_search_matches()
--     (tabla trueque_search_credits); sin él, llamar la RPC directo no funciona (anti-bypass).
--   · Matching por TÍTULO normalizado (el autor se muestra pero no se compara).
--   · Cualquiera de los dos participantes puede marcar el intercambio como completado.
--   · Al completar, los libros del match se desactivan (is_active=false).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helpers
-- ----------------------------------------------------------------------------

-- lowercase + sin acentos (ñ→n, ç→c) + sin puntuación + espacios colapsados.
CREATE OR REPLACE FUNCTION public.trueque_norm(t text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             translate(lower(coalesce(t, '')),
                       'áàäâãéèëêíìïîóòöôõúùüûñç',
                       'aaaaaeeeeiiiiooooouuuunc'),
             '[^a-z0-9]+', ' ', 'g'),
           '\s+', ' ', 'g'));
$$;

-- ----------------------------------------------------------------------------
-- 1. users.is_premium (Folio Plus) + guard
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Sin este guard, users_update_self permitiría a cualquiera hacerse Plus con un UPDATE.
-- Solo roles NO-cliente (SQL Editor, service_role, funciones SECURITY DEFINER) pueden cambiarlo.
-- SECURITY INVOKER a propósito: con DEFINER, current_user sería el owner y el guard no bloquearía nada.
CREATE OR REPLACE FUNCTION public.guard_users_premium()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_premium := false;
    ELSIF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
      NEW.is_premium := OLD.is_premium;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_users_premium ON public.users;
CREATE TRIGGER trg_guard_users_premium
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_premium();
-- Nota: is_premium NO se otorga por GRANT de columna a clientes (privacy_hardening.sql dejó
-- el SELECT por columna). El cliente lo consulta vía RPC trueque_status().
-- Para dar Plus manualmente:  UPDATE public.users SET is_premium = true WHERE id = '<uuid>';

-- ----------------------------------------------------------------------------
-- 2. Enums + tablas
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.exchange_zone AS ENUM (
    'roma','condesa','del_valle','narvarte','polanco','anzures','san_rafael','escandon','juarez',
    'centro','coyoacan','cu_copilco','coapa','xochimilco','santa_fe','alvaro_obregon','tlalpan',
    'interlomas','napoles','portales','doctores','iztapalapa','azcapotzalco','tacubaya','mixcoac'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exchange_condition AS ENUM ('como_nuevo', 'usado', 'rayoneado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exchange_match_type AS ENUM ('perfecto', 'parcial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exchange_status AS ENUM ('pending', 'chatting', 'completed', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2.1 Config editable (sin redeploy) — antes que los triggers que la leen
CREATE TABLE IF NOT EXISTS public.trueque_gems_cost (
  key   text PRIMARY KEY,
  value int  NOT NULL
);
INSERT INTO public.trueque_gems_cost (key, value) VALUES
  ('search_matches_cost',   20),
  ('publish_book_cost',      0),
  ('free_tier_max_offered',  3),
  ('free_tier_max_wanted',   5),
  ('free_tier_max_zones',    3),
  ('plus_max_offered',     999),
  ('plus_max_wanted',      999),   -- extra sobre el spec: tope Plus de "Busco"
  ('plus_max_zones',         5),   -- extra: tope Plus de zonas
  ('plus_daily_searches',   10)    -- extra: rate limit de búsquedas Plus por día
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.trueque_cfg(p_key text, p_default int)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT value FROM trueque_gems_cost WHERE key = p_key), p_default);
$$;

-- 2.2 Zonas del usuario
CREATE TABLE IF NOT EXISTS public.user_exchange_zones (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  zone    public.exchange_zone NOT NULL,
  PRIMARY KEY (user_id, zone)
);
CREATE INDEX IF NOT EXISTS user_exchange_zones_zone_idx ON public.user_exchange_zones (zone);

-- 2.3 Libros que ofrezco
CREATE TABLE IF NOT EXISTS public.books_offered (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (length(btrim(title))  BETWEEN 1 AND 200),
  author      text NOT NULL CHECK (length(btrim(author)) BETWEEN 1 AND 200),
  editor      text CHECK (editor IS NULL OR length(editor) <= 200),
  condition   public.exchange_condition NOT NULL DEFAULT 'usado',
  photo_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  title_norm  text GENERATED ALWAYS AS (public.trueque_norm(title)) STORED
);
CREATE INDEX IF NOT EXISTS books_offered_user_idx  ON public.books_offered (user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS books_offered_title_idx ON public.books_offered (title_norm) WHERE is_active;

-- 2.4 Libros que busco
CREATE TABLE IF NOT EXISTS public.books_wanted (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (length(btrim(title))  BETWEEN 1 AND 200),
  author      text NOT NULL CHECK (length(btrim(author)) BETWEEN 1 AND 200),
  editor      text CHECK (editor IS NULL OR length(editor) <= 200),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  title_norm  text GENERATED ALWAYS AS (public.trueque_norm(title)) STORED
);
CREATE INDEX IF NOT EXISTS books_wanted_user_idx  ON public.books_wanted (user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS books_wanted_title_idx ON public.books_wanted (title_norm) WHERE is_active;

-- 2.5 Matches (una fila por pareja + combinación de libros; user_a_id < user_b_id)
CREATE TABLE IF NOT EXISTS public.exchange_matches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_type        public.exchange_match_type NOT NULL,
  book_a_offers     uuid REFERENCES public.books_offered(id) ON DELETE CASCADE, -- lo que A ofrece
  book_b_offers     uuid REFERENCES public.books_offered(id) ON DELETE CASCADE, -- lo que B ofrece
  shared_zones      text[] NOT NULL DEFAULT '{}',
  via_reading_list  boolean NOT NULL DEFAULT false, -- el libro que YO busco venía de mi lista "Por leer"
  status            public.exchange_status NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  CHECK (user_a_id < user_b_id),
  CHECK (book_a_offers IS NOT NULL OR book_b_offers IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS exchange_matches_live_unique
  ON public.exchange_matches (
    user_a_id, user_b_id,
    COALESCE(book_a_offers, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(book_b_offers, '00000000-0000-0000-0000-000000000000'::uuid)
  ) WHERE status IN ('pending', 'chatting', 'completed');
CREATE INDEX IF NOT EXISTS exchange_matches_a_idx ON public.exchange_matches (user_a_id);
CREATE INDEX IF NOT EXISTS exchange_matches_b_idx ON public.exchange_matches (user_b_id);

-- 2.6 Chat del match
CREATE TABLE IF NOT EXISTS public.exchange_chats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES public.exchange_matches(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message     text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 1000),
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exchange_chats_match_idx ON public.exchange_chats (match_id, created_at DESC);

-- 2.7 Calificaciones
CREATE TABLE IF NOT EXISTS public.exchange_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES public.exchange_matches(id) ON DELETE CASCADE,
  rated_by    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rated_user  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating      int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      text CHECK (review IS NULL OR length(review) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, rated_by)
);
CREATE INDEX IF NOT EXISTS exchange_ratings_rated_user_idx ON public.exchange_ratings (rated_user);

-- 2.8 Créditos de búsqueda (interno: cost_search_matches emite, find_book_matches consume)
CREATE TABLE IF NOT EXISTS public.trueque_search_credits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  used_at     timestamptz
);
CREATE INDEX IF NOT EXISTS trueque_search_credits_user_idx ON public.trueque_search_credits (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Triggers
-- ----------------------------------------------------------------------------

-- 4.1 Máximo de zonas por usuario (duro 5; free según config)
CREATE OR REPLACE FUNCTION public.trg_zones_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prem boolean := coalesce((SELECT is_premium FROM users WHERE id = NEW.user_id), false);
  v_lim  int := LEAST(5, CASE WHEN v_prem THEN trueque_cfg('plus_max_zones', 5)
                              ELSE trueque_cfg('free_tier_max_zones', 3) END);
BEGIN
  IF (SELECT count(*) FROM user_exchange_zones WHERE user_id = NEW.user_id) >= v_lim THEN
    RAISE EXCEPTION 'TRUEQUE_LIMIT_ZONES';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_zones_limit ON public.user_exchange_zones;
CREATE TRIGGER trg_zones_limit BEFORE INSERT ON public.user_exchange_zones
  FOR EACH ROW EXECUTE FUNCTION public.trg_zones_limit();

-- 4.2 Límite free/Plus de libros ofrecidos (+ costo de publicar si config > 0)
CREATE OR REPLACE FUNCTION public.trg_offered_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prem boolean := coalesce((SELECT is_premium FROM users WHERE id = NEW.user_id), false);
  v_lim  int := CASE WHEN v_prem THEN trueque_cfg('plus_max_offered', 999)
                     ELSE trueque_cfg('free_tier_max_offered', 3) END;
  v_cost int := trueque_cfg('publish_book_cost', 0);
BEGIN
  IF NEW.is_active AND (SELECT count(*) FROM books_offered WHERE user_id = NEW.user_id AND is_active) >= v_lim THEN
    RAISE EXCEPTION 'TRUEQUE_LIMIT_OFFERED';
  END IF;
  IF TG_OP = 'INSERT' AND v_cost > 0 AND NOT v_prem THEN
    UPDATE user_gems SET balance = balance - v_cost WHERE user_id = NEW.user_id AND balance >= v_cost;
    IF NOT FOUND THEN RAISE EXCEPTION 'TRUEQUE_NO_GEMS'; END IF;
    INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
      VALUES (NEW.user_id, 0, -v_cost, 'trueque_publish', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_offered_limit ON public.books_offered;
CREATE TRIGGER trg_offered_limit BEFORE INSERT ON public.books_offered
  FOR EACH ROW EXECUTE FUNCTION public.trg_offered_limit();
-- Reactivar un libro (is_active false→true) también cuenta contra el límite.
DROP TRIGGER IF EXISTS trg_offered_limit_reactivate ON public.books_offered;
CREATE TRIGGER trg_offered_limit_reactivate BEFORE UPDATE OF is_active ON public.books_offered
  FOR EACH ROW WHEN (NEW.is_active AND NOT OLD.is_active)
  EXECUTE FUNCTION public.trg_offered_limit();

-- 4.3 Límite free/Plus de libros buscados
CREATE OR REPLACE FUNCTION public.trg_wanted_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prem boolean := coalesce((SELECT is_premium FROM users WHERE id = NEW.user_id), false);
  v_lim  int := CASE WHEN v_prem THEN trueque_cfg('plus_max_wanted', 999)
                     ELSE trueque_cfg('free_tier_max_wanted', 5) END;
BEGIN
  IF NEW.is_active AND (SELECT count(*) FROM books_wanted WHERE user_id = NEW.user_id AND is_active) >= v_lim THEN
    RAISE EXCEPTION 'TRUEQUE_LIMIT_WANTED';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_wanted_limit ON public.books_wanted;
CREATE TRIGGER trg_wanted_limit BEFORE INSERT ON public.books_wanted
  FOR EACH ROW EXECUTE FUNCTION public.trg_wanted_limit();
DROP TRIGGER IF EXISTS trg_wanted_limit_reactivate ON public.books_wanted;
CREATE TRIGGER trg_wanted_limit_reactivate BEFORE UPDATE OF is_active ON public.books_wanted
  FOR EACH ROW WHEN (NEW.is_active AND NOT OLD.is_active)
  EXECUTE FUNCTION public.trg_wanted_limit();

-- 4.4 Si un libro ofrecido se desactiva: cancelar sus matches vivos y avisar en el chat
CREATE OR REPLACE FUNCTION public.trg_offered_deactivated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m record;
BEGIN
  FOR m IN
    SELECT id, status FROM exchange_matches
    WHERE status IN ('pending', 'chatting')
      AND (book_a_offers = NEW.id OR book_b_offers = NEW.id)
  LOOP
    UPDATE exchange_matches SET status = 'cancelled' WHERE id = m.id;
    IF m.status = 'chatting' THEN
      INSERT INTO exchange_chats (match_id, sender_id, message, is_system)
      VALUES (m.id, NEW.user_id,
              'El libro "' || NEW.title || '" ya no está disponible. Este intercambio fue cancelado.', true);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_offered_deactivated ON public.books_offered;
CREATE TRIGGER trg_offered_deactivated
  AFTER UPDATE OF is_active ON public.books_offered
  FOR EACH ROW WHEN (OLD.is_active AND NOT NEW.is_active)
  EXECUTE FUNCTION public.trg_offered_deactivated();

-- 4.5 No editar título/autor de un libro que está en un match vivo (evita "cambiar el libro" tras el match)
CREATE OR REPLACE FUNCTION public.trg_offered_lock_title()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.title IS DISTINCT FROM OLD.title OR NEW.author IS DISTINCT FROM OLD.author)
     AND EXISTS (SELECT 1 FROM exchange_matches
                 WHERE status IN ('pending', 'chatting') AND (book_a_offers = OLD.id OR book_b_offers = OLD.id)) THEN
    RAISE EXCEPTION 'TRUEQUE_BOOK_IN_MATCH';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_offered_lock_title ON public.books_offered;
CREATE TRIGGER trg_offered_lock_title BEFORE UPDATE OF title, author ON public.books_offered
  FOR EACH ROW EXECUTE FUNCTION public.trg_offered_lock_title();

-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_exchange_zones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_offered          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_wanted           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trueque_gems_cost      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trueque_search_credits ENABLE ROW LEVEL SECURITY; -- sin policies: solo SECURITY DEFINER

-- user_exchange_zones: SELECT dueño + parejas de match; escritura solo dueño
DROP POLICY IF EXISTS uez_select ON public.user_exchange_zones;
CREATE POLICY uez_select ON public.user_exchange_zones FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.exchange_matches m
    WHERE m.status IN ('pending', 'chatting', 'completed')
      AND ((m.user_a_id = auth.uid() AND m.user_b_id = user_exchange_zones.user_id)
        OR (m.user_b_id = auth.uid() AND m.user_a_id = user_exchange_zones.user_id))
  )
);
DROP POLICY IF EXISTS uez_insert ON public.user_exchange_zones;
CREATE POLICY uez_insert ON public.user_exchange_zones FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS uez_update ON public.user_exchange_zones;
CREATE POLICY uez_update ON public.user_exchange_zones FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS uez_delete ON public.user_exchange_zones;
CREATE POLICY uez_delete ON public.user_exchange_zones FOR DELETE TO authenticated USING (user_id = auth.uid());

-- books_offered
DROP POLICY IF EXISTS bo_select ON public.books_offered;
CREATE POLICY bo_select ON public.books_offered FOR SELECT TO authenticated USING (is_active OR user_id = auth.uid());
DROP POLICY IF EXISTS bo_insert ON public.books_offered;
CREATE POLICY bo_insert ON public.books_offered FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS bo_update ON public.books_offered;
CREATE POLICY bo_update ON public.books_offered FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS bo_delete ON public.books_offered;
CREATE POLICY bo_delete ON public.books_offered FOR DELETE TO authenticated USING (user_id = auth.uid());

-- books_wanted
DROP POLICY IF EXISTS bw_select ON public.books_wanted;
CREATE POLICY bw_select ON public.books_wanted FOR SELECT TO authenticated USING (is_active OR user_id = auth.uid());
DROP POLICY IF EXISTS bw_insert ON public.books_wanted;
CREATE POLICY bw_insert ON public.books_wanted FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS bw_update ON public.books_wanted;
CREATE POLICY bw_update ON public.books_wanted FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS bw_delete ON public.books_wanted;
CREATE POLICY bw_delete ON public.books_wanted FOR DELETE TO authenticated USING (user_id = auth.uid());

-- exchange_matches / chats / ratings: SELECT solo participantes; escritura SOLO vía RPC
DROP POLICY IF EXISTS em_select ON public.exchange_matches;
CREATE POLICY em_select ON public.exchange_matches FOR SELECT TO authenticated
  USING (auth.uid() IN (user_a_id, user_b_id));

DROP POLICY IF EXISTS ec_select ON public.exchange_chats;
CREATE POLICY ec_select ON public.exchange_chats FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exchange_matches m
          WHERE m.id = exchange_chats.match_id AND auth.uid() IN (m.user_a_id, m.user_b_id))
);

DROP POLICY IF EXISTS er_select ON public.exchange_ratings;
CREATE POLICY er_select ON public.exchange_ratings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exchange_matches m
          WHERE m.id = exchange_ratings.match_id AND auth.uid() IN (m.user_a_id, m.user_b_id))
);

-- config: lectura para todos los autenticados, nadie escribe desde el cliente
DROP POLICY IF EXISTS tgc_select ON public.trueque_gems_cost;
CREATE POLICY tgc_select ON public.trueque_gems_cost FOR SELECT TO authenticated USING (true);

-- Defensa en profundidad: privilegios de tabla
REVOKE ALL ON public.user_exchange_zones, public.books_offered, public.books_wanted,
              public.exchange_matches, public.exchange_chats, public.exchange_ratings,
              public.trueque_gems_cost, public.trueque_search_credits FROM anon;
REVOKE ALL ON public.trueque_search_credits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.exchange_matches, public.exchange_chats,
              public.exchange_ratings, public.trueque_gems_cost FROM authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPCs
-- ----------------------------------------------------------------------------

-- 6.1 Estado/límites del usuario para la UI (evita exponer users.is_premium por GRANT de columna)
CREATE OR REPLACE FUNCTION public.trueque_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_prem boolean;
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  v_prem := coalesce((SELECT is_premium FROM users WHERE id = uid), false);
  RETURN jsonb_build_object(
    'is_premium',        v_prem,
    'max_offered',       CASE WHEN v_prem THEN trueque_cfg('plus_max_offered', 999) ELSE trueque_cfg('free_tier_max_offered', 3) END,
    'max_wanted',        CASE WHEN v_prem THEN trueque_cfg('plus_max_wanted', 999)  ELSE trueque_cfg('free_tier_max_wanted', 5) END,
    'max_zones',         LEAST(5, CASE WHEN v_prem THEN trueque_cfg('plus_max_zones', 5) ELSE trueque_cfg('free_tier_max_zones', 3) END),
    'search_cost',       CASE WHEN v_prem THEN 0 ELSE trueque_cfg('search_matches_cost', 20) END,
    'plus_daily_searches', trueque_cfg('plus_daily_searches', 10),
    'searches_today',    (SELECT count(*) FROM trueque_search_credits
                           WHERE user_id = uid AND (created_at AT TIME ZONE 'America/Mexico_City')::date = today),
    'offered_count',     (SELECT count(*) FROM books_offered WHERE user_id = uid AND is_active),
    'wanted_count',      (SELECT count(*) FROM books_wanted  WHERE user_id = uid AND is_active),
    'zones_count',       (SELECT count(*) FROM user_exchange_zones WHERE user_id = uid)
  );
END $$;

-- 6.2 Reemplazo atómico de zonas (2..máximo del plan)
CREATE OR REPLACE FUNCTION public.set_exchange_zones(p_zones text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_zones public.exchange_zone[];
  v_prem boolean;
  v_lim int;
  z public.exchange_zone;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT coalesce(array_agg(DISTINCT x::public.exchange_zone), '{}') INTO v_zones FROM unnest(p_zones) AS x;
  v_prem := coalesce((SELECT is_premium FROM users WHERE id = uid), false);
  v_lim := LEAST(5, CASE WHEN v_prem THEN trueque_cfg('plus_max_zones', 5) ELSE trueque_cfg('free_tier_max_zones', 3) END);
  IF coalesce(array_length(v_zones, 1), 0) < 2 THEN RAISE EXCEPTION 'TRUEQUE_MIN_ZONES'; END IF;
  IF array_length(v_zones, 1) > v_lim THEN RAISE EXCEPTION 'TRUEQUE_LIMIT_ZONES'; END IF;

  DELETE FROM user_exchange_zones WHERE user_id = uid;
  FOREACH z IN ARRAY v_zones LOOP
    INSERT INTO user_exchange_zones (user_id, zone) VALUES (uid, z);
  END LOOP;
END $$;

-- 6.3 Cobro de una búsqueda → emite un crédito de búsqueda
--     true = pagó (o Plus) · false = gemas insuficientes · excepción = sin zonas / rate limit Plus
CREATE OR REPLACE FUNCTION public.cost_search_matches(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_prem boolean;
  v_cost int := trueque_cfg('search_matches_cost', 20);
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
  IF uid IS NULL OR p_user_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_exchange_zones WHERE user_id = uid) THEN
    RAISE EXCEPTION 'TRUEQUE_NO_ZONES';
  END IF;

  v_prem := coalesce((SELECT is_premium FROM users WHERE id = uid), false);
  IF v_prem THEN
    IF (SELECT count(*) FROM trueque_search_credits
         WHERE user_id = uid AND (created_at AT TIME ZONE 'America/Mexico_City')::date = today)
       >= trueque_cfg('plus_daily_searches', 10) THEN
      RAISE EXCEPTION 'TRUEQUE_RATE_LIMIT';
    END IF;
  ELSE
    UPDATE user_gems SET balance = balance - v_cost WHERE user_id = uid AND balance >= v_cost;
    IF NOT FOUND THEN RETURN false; END IF;
    INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
      VALUES (uid, 0, -v_cost, 'trueque_search', gen_random_uuid()::text);
  END IF;

  INSERT INTO trueque_search_credits (user_id) VALUES (uid);
  RETURN true;
END $$;

-- 6.4 Generador de matches (interno; no expuesto a clientes)
CREATE OR REPLACE FUNCTION public.trueque_generate_matches(p_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  ex public.exchange_matches%ROWTYPE;
  a uuid; b uuid; ba uuid; bb uuid;
BEGIN
  -- Los vivos ya vencidos de este usuario pasan a 'expired' (por si el cron no ha corrido)
  UPDATE exchange_matches SET status = 'expired'
   WHERE (user_a_id = p_uid OR user_b_id = p_uid)
     AND status IN ('pending', 'chatting') AND expires_at <= now();

  FOR r IN
    WITH me_zones AS (
      SELECT zone FROM user_exchange_zones WHERE user_id = p_uid
    ),
    cand AS (                                   -- otros usuarios con al menos una zona en común
      SELECT z.user_id AS xid, array_agg(z.zone::text ORDER BY z.zone::text) AS shared
      FROM user_exchange_zones z JOIN me_zones m ON m.zone = z.zone
      WHERE z.user_id <> p_uid
      GROUP BY z.user_id
    ),
    my_want AS (                                -- "Busco" + mi lista "Por leer"
      SELECT title_norm, false AS from_list FROM books_wanted WHERE user_id = p_uid AND is_active
      UNION ALL
      SELECT trueque_norm(title), true FROM books WHERE user_id = p_uid AND status = 'want_to_read'
    ),
    mine AS (                                   -- un libro mío que X busca
      SELECT DISTINCT ON (c.xid) c.xid, bo.id AS book_id
      FROM cand c
      JOIN books_offered bo ON bo.user_id = p_uid AND bo.is_active
      JOIN books_wanted  xw ON xw.user_id = c.xid AND xw.is_active AND xw.title_norm = bo.title_norm
      ORDER BY c.xid, bo.created_at, bo.id
    ),
    theirs AS (                                 -- un libro de X que yo busco (prefiere "Busco" sobre lista)
      SELECT DISTINCT ON (c.xid) c.xid, xo.id AS book_id, mw.from_list
      FROM cand c
      JOIN books_offered xo ON xo.user_id = c.xid AND xo.is_active
      JOIN my_want mw ON mw.title_norm = xo.title_norm
      ORDER BY c.xid, mw.from_list, xo.created_at, xo.id
    )
    SELECT c.xid, c.shared, m.book_id AS my_book, t.book_id AS their_book,
           coalesce(t.from_list, false) AS via_list
    FROM cand c
    LEFT JOIN mine   m ON m.xid = c.xid
    LEFT JOIN theirs t ON t.xid = c.xid
    WHERE m.book_id IS NOT NULL OR t.book_id IS NOT NULL
  LOOP
    IF p_uid < r.xid THEN
      a := p_uid; b := r.xid; ba := r.my_book; bb := r.their_book;
    ELSE
      a := r.xid; b := p_uid; ba := r.their_book; bb := r.my_book;
    END IF;

    SELECT * INTO ex FROM exchange_matches
     WHERE user_a_id = a AND user_b_id = b AND status IN ('pending', 'chatting')
     ORDER BY (status = 'chatting') DESC LIMIT 1;
    IF FOUND THEN
      IF ex.status = 'chatting' THEN CONTINUE; END IF;                       -- no tocar una conversación viva
      IF ex.book_a_offers IS NOT DISTINCT FROM ba AND ex.book_b_offers IS NOT DISTINCT FROM bb THEN
        CONTINUE;                                                             -- mismo match, ya existe
      END IF;
      UPDATE exchange_matches SET status = 'cancelled' WHERE id = ex.id;      -- lo reemplaza uno mejor/distinto
    END IF;

    INSERT INTO exchange_matches (user_a_id, user_b_id, match_type, book_a_offers, book_b_offers,
                                  shared_zones, via_reading_list)
    VALUES (a, b,
            CASE WHEN r.my_book IS NOT NULL AND r.their_book IS NOT NULL
                 THEN 'perfecto'::exchange_match_type ELSE 'parcial'::exchange_match_type END,
            ba, bb, r.shared, r.via_list)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 6.5 Lectura de matches de un usuario (interno; lo llaman find_book_matches y get_my_exchange_matches)
CREATE OR REPLACE FUNCTION public.trueque_matches_for(p_uid uuid)
RETURNS TABLE (
  match_id uuid, match_type text, status text, created_at timestamptz, expires_at timestamptz,
  shared_zones text[], via_reading_list boolean,
  other_user_id uuid, other_name text, other_username text, other_avatar_url text,
  other_rating_avg numeric, other_rating_count int,
  my_book_id uuid, my_book_title text, my_book_author text,
  their_book_id uuid, their_book_title text, their_book_author text,
  their_book_condition text, their_book_photo_url text,
  i_rated boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.match_type::text, m.status::text, m.created_at, m.expires_at,
         m.shared_zones, m.via_reading_list,
         u.id, u.nombre, u.username, u.avatar_url,
         (SELECT round(avg(r.rating)::numeric, 1) FROM exchange_ratings r WHERE r.rated_user = u.id),
         (SELECT count(*)::int FROM exchange_ratings r WHERE r.rated_user = u.id),
         mb.id, mb.title, mb.author,
         tb.id, tb.title, tb.author, tb.condition::text, tb.photo_url,
         EXISTS (SELECT 1 FROM exchange_ratings r WHERE r.match_id = m.id AND r.rated_by = p_uid)
  FROM exchange_matches m
  JOIN users u ON u.id = CASE WHEN m.user_a_id = p_uid THEN m.user_b_id ELSE m.user_a_id END
  LEFT JOIN books_offered mb ON mb.id = CASE WHEN m.user_a_id = p_uid THEN m.book_a_offers ELSE m.book_b_offers END
  LEFT JOIN books_offered tb ON tb.id = CASE WHEN m.user_a_id = p_uid THEN m.book_b_offers ELSE m.book_a_offers END
  WHERE (m.user_a_id = p_uid OR m.user_b_id = p_uid)
    AND m.status IN ('pending', 'chatting', 'completed')
    AND NOT (m.status IN ('pending', 'chatting') AND m.expires_at <= now())
  ORDER BY (m.match_type = 'perfecto') DESC, m.created_at DESC;
$$;

-- 6.6 Buscar matches (consume un crédito emitido por cost_search_matches)
CREATE OR REPLACE FUNCTION public.find_book_matches(p_user_id uuid)
RETURNS TABLE (
  match_id uuid, match_type text, status text, created_at timestamptz, expires_at timestamptz,
  shared_zones text[], via_reading_list boolean,
  other_user_id uuid, other_name text, other_username text, other_avatar_url text,
  other_rating_avg numeric, other_rating_count int,
  my_book_id uuid, my_book_title text, my_book_author text,
  their_book_id uuid, their_book_title text, their_book_author text,
  their_book_condition text, their_book_photo_url text,
  i_rated boolean
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  v_credit uuid;
BEGIN
  IF uid IS NULL OR p_user_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'No autorizado'; END IF;

  UPDATE trueque_search_credits c SET used_at = now()
   WHERE c.id = (SELECT c2.id FROM trueque_search_credits c2
                  WHERE c2.user_id = uid AND c2.used_at IS NULL
                    AND c2.created_at > now() - interval '10 minutes'
                  ORDER BY c2.created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
  RETURNING c.id INTO v_credit;
  IF v_credit IS NULL THEN RAISE EXCEPTION 'TRUEQUE_NO_CREDIT'; END IF;

  PERFORM trueque_generate_matches(uid);
  RETURN QUERY SELECT * FROM trueque_matches_for(uid);
END $$;

-- 6.7 Listar mis matches (gratis; no descubre nuevos)
CREATE OR REPLACE FUNCTION public.get_my_exchange_matches()
RETURNS TABLE (
  match_id uuid, match_type text, status text, created_at timestamptz, expires_at timestamptz,
  shared_zones text[], via_reading_list boolean,
  other_user_id uuid, other_name text, other_username text, other_avatar_url text,
  other_rating_avg numeric, other_rating_count int,
  my_book_id uuid, my_book_title text, my_book_author text,
  their_book_id uuid, their_book_title text, their_book_author text,
  their_book_condition text, their_book_photo_url text,
  i_rated boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  RETURN QUERY SELECT * FROM trueque_matches_for(auth.uid());
END $$;

-- 6.8 Enviar mensaje
CREATE OR REPLACE FUNCTION public.send_exchange_message(p_match_id uuid, p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  m public.exchange_matches%ROWTYPE;
  v_id uuid;
  v_msg text := btrim(coalesce(p_message, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF length(v_msg) < 1 OR length(v_msg) > 1000 THEN RAISE EXCEPTION 'TRUEQUE_BAD_MESSAGE'; END IF;

  SELECT * INTO m FROM exchange_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR uid NOT IN (m.user_a_id, m.user_b_id) THEN RAISE EXCEPTION 'TRUEQUE_NOT_PARTICIPANT'; END IF;
  IF m.status NOT IN ('pending', 'chatting') THEN RAISE EXCEPTION 'TRUEQUE_MATCH_CLOSED'; END IF;
  IF m.expires_at <= now() THEN RAISE EXCEPTION 'TRUEQUE_MATCH_EXPIRED'; END IF;

  IF m.status = 'pending' THEN
    UPDATE exchange_matches SET status = 'chatting' WHERE id = m.id;
  END IF;
  INSERT INTO exchange_chats (match_id, sender_id, message) VALUES (m.id, uid, v_msg) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 6.9 Marcar completado (cualquiera de los dos; desactiva los libros del intercambio)
CREATE OR REPLACE FUNCTION public.complete_exchange(p_match_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  m public.exchange_matches%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO m FROM exchange_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR uid NOT IN (m.user_a_id, m.user_b_id) THEN RAISE EXCEPTION 'TRUEQUE_NOT_PARTICIPANT'; END IF;
  IF m.status = 'completed' THEN RETURN true; END IF;
  IF m.status <> 'chatting' THEN RAISE EXCEPTION 'TRUEQUE_MATCH_CLOSED'; END IF;

  UPDATE exchange_matches SET status = 'completed' WHERE id = m.id;
  -- El match ya es 'completed', así que el trigger de desactivación no lo cancela.
  UPDATE books_offered SET is_active = false
   WHERE id IN (m.book_a_offers, m.book_b_offers) AND is_active;
  RETURN true;
END $$;

-- 6.10 Calificar al otro participante
CREATE OR REPLACE FUNCTION public.rate_exchange(p_match_id uuid, p_rating int, p_review text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  m public.exchange_matches%ROWTYPE;
  v_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'TRUEQUE_BAD_RATING'; END IF;
  SELECT * INTO m FROM exchange_matches WHERE id = p_match_id;
  IF NOT FOUND OR uid NOT IN (m.user_a_id, m.user_b_id) THEN RAISE EXCEPTION 'TRUEQUE_NOT_PARTICIPANT'; END IF;
  IF m.status <> 'completed' THEN RAISE EXCEPTION 'TRUEQUE_NOT_COMPLETED'; END IF;

  BEGIN
    INSERT INTO exchange_ratings (match_id, rated_by, rated_user, rating, review)
    VALUES (m.id, uid, CASE WHEN uid = m.user_a_id THEN m.user_b_id ELSE m.user_a_id END,
            p_rating, nullif(btrim(left(coalesce(p_review, ''), 500)), ''))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'TRUEQUE_ALREADY_RATED';
  END;
  -- El "ciclo" queda cerrado cuando existen las 2 calificaciones (COUNT = 2); 'completed' es terminal.
  RETURN v_id;
END $$;

-- Permisos de funciones: cerrar a PUBLIC y abrir solo lo que usa el cliente
REVOKE ALL ON FUNCTION public.trueque_cfg(text, int)                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_generate_matches(uuid)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_matches_for(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_users_premium()                       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_zones_limit()                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_offered_limit()                         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_wanted_limit()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_offered_deactivated()                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_offered_lock_title()                    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.trueque_status()                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_exchange_zones(text[])                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cost_search_matches(uuid)                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_book_matches(uuid)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_exchange_matches()                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_exchange_message(uuid, text)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_exchange(uuid)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rate_exchange(uuid, int, text)              FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trueque_status()                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_exchange_zones(text[])               TO authenticated;
GRANT EXECUTE ON FUNCTION public.cost_search_matches(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_book_matches(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_exchange_matches()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_exchange_message(uuid, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_exchange(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rate_exchange(uuid, int, text)           TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Storage: bucket 'trueque' (fotos de libros; ruta <user_id>/<archivo>)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trueque', 'trueque', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS trueque_objects_select ON storage.objects;
CREATE POLICY trueque_objects_select ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'trueque');

DROP POLICY IF EXISTS trueque_objects_insert ON storage.objects;
CREATE POLICY trueque_objects_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trueque' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS trueque_objects_update ON storage.objects;
CREATE POLICY trueque_objects_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'trueque' AND name LIKE auth.uid()::text || '/%')
  WITH CHECK (bucket_id = 'trueque' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS trueque_objects_delete ON storage.objects;
CREATE POLICY trueque_objects_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trueque' AND name LIKE auth.uid()::text || '/%');

-- ----------------------------------------------------------------------------
-- 8. Expiración automática
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_matches()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH u AS (
    UPDATE exchange_matches SET status = 'expired'
     WHERE expires_at < now() AND status IN ('pending', 'chatting')
    RETURNING 1
  ) SELECT count(*) INTO n FROM u;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_matches() FROM PUBLIC, anon, authenticated;

-- pg_cron: diario 3:00 AM hora de México (UTC-6, sin horario de verano) = 09:00 UTC.
-- Si pg_cron no está habilitado (Database → Extensions → pg_cron), esto solo avisa: la app igual
-- oculta/expira los vencidos al listar y al buscar, así que el cron es solo limpieza de estado.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  PERFORM cron.schedule('trueque-cleanup-expired-matches', '0 9 * * *',
                        'select public.cleanup_expired_matches()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible (%). Habilítalo en Database → Extensions y re-corre este bloque.', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICACIÓN rápida (SQL Editor, como postgres):
--   select public.trueque_norm('  ¡Cien Años de Soledad! ');        -- 'cien anos de soledad'
--   select * from public.trueque_gems_cost;                          -- 9 filas de config
--   select cron.schedule ... / select * from cron.job;               -- job 'trueque-cleanup-expired-matches'
--   update public.users set is_premium = true where id = '<uuid>';   -- dar Folio Plus a mano
-- ============================================================================

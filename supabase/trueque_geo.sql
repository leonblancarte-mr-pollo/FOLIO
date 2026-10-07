-- ============================================================================
-- SEMA — Trueque v2: estado obligatorio, pines aproximados y matches por cercanía
-- Correr en Supabase → SQL Editor, DESPUÉS de trueque_schema.sql y spend_gems.sql.
-- Es idempotente (se puede re-correr). No crea extensiones.
--
-- Contenido:
--   0. Constantes configurables (editar aquí y re-correr el archivo)
--   1. Tablas: trueque_profiles, trueque_pins, trueque_reports
--   2. RLS y privilegios (escritura SOLO por RPC)
--   3. Helpers internos (haversine, cercanía, alcance)
--   4. Requisitos server-side (reglas aceptadas + estado) para publicar y chatear
--   5. RPCs: accept_trueque_rules, save_trueque_pins, get_my_trueque_pins
--   6. Matching por cercanía: search_trueque_matches, get_my_trueque_matches
--   7. Reportes: report_trueque_user
--   8. Medición: vista trueque_funnel_summary (solo SQL Editor)
--
-- Decisiones (ver DOCUMENTACION_ARQUITECTURA.md §IV.14 y §VIII):
--   · "Perfil de Trueque" = tabla NUEVA trueque_profiles (no columnas en users): users es
--     legible por otros usuarios (perfiles públicos/amigos) y tiene GRANTs por columna
--     calculados una sola vez; una tabla aparte queda privada y bloqueada sin tocar Auth.
--   · Los pines se guardan YA redondeados (2 decimales ≈ 1 km) y nadie más que su dueño
--     los puede leer. La distancia se calcula aquí; el cliente solo recibe un rango.
--   · v3 (2026-10-03): las 25 zonas de CDMX YA NO cuentan. Cercanía, alcance y requisito de
--     ubicación usan solo trueque_pins + max_radius_km (+ estado para "mi estado"). La tabla
--     user_exchange_zones NO se borra (historial), pero ninguna función de este archivo la lee.
--     Re-correr este archivo completo aplica el cambio (borra las firmas v2 que usaban zonas).
--   · cost_search_matches / find_book_matches quedan intactas (clientes viejos en caché
--     siguen funcionando). El cliente nuevo usa search_trueque_matches, que cobra en la
--     MISMA transacción y solo si la búsqueda devuelve resultados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. CONSTANTES CONFIGURABLES
--    Si cambias pin_decimals, cambia también el CHECK de trueque_pins (sección 1).
--    Si cambias max_pins, cambia también el CHECK de slot (sección 1).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trueque_geo_cfg()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'max_pins',            3,      -- pines por usuario (igual para free y Plus)
    'pin_cooldown_hours', 24,      -- horas entre ediciones de coordenadas (la primera es libre)
    'pin_decimals',        2,      -- redondeo de lat/lng (~1 km)
    'lat_min',            14,      -- caja de México
    'lat_max',            33,
    'lng_min',          -119,
    'lng_max',           -86,
    'radii_km',          jsonb_build_array(3, 6, 12, 25),
    'default_radius_km',   6,
    'wide_radius_km',     25,      -- alcance "25 km"
    'label_max',          30,      -- etiqueta privada del pin
    'report_daily_max',   10,      -- reportes por usuario por día (anti-spam)
    'report_details_max', 500
  );
$$;

CREATE OR REPLACE FUNCTION public.trueque_geo_int(p_key text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT (public.trueque_geo_cfg() ->> p_key)::int;
$$;

-- Claves de los 32 estados (ISO 3166-2:MX sin el prefijo "MX-"). Igual que src/data/estados.js.
CREATE OR REPLACE FUNCTION public.trueque_valid_state(p_state text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_state = ANY (ARRAY[
    'AGU','BCN','BCS','CAM','CHP','CHH','CMX','COA','COL','DUR','GUA','GRO','HID','JAL','MEX','MIC',
    'MOR','NAY','NLE','OAX','PUE','QUE','ROO','SLP','SIN','SON','TAB','TAM','TLA','VER','YUC','ZAC'
  ]);
$$;

-- Motivos de reporte (lista corta). Igual que REPORT_REASONS en truequeService.js.
CREATE OR REPLACE FUNCTION public.trueque_valid_report_reason(p_reason text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_reason = ANY (ARRAY['acoso', 'estafa', 'datos_personales', 'inseguro', 'otro']);
$$;

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------

-- 1.1 Perfil de Trueque (una fila por usuario; se crea al aceptar las reglas)
CREATE TABLE IF NOT EXISTS public.trueque_profiles (
  user_id     uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trueque_profiles ADD COLUMN IF NOT EXISTS state              text;
ALTER TABLE public.trueque_profiles ADD COLUMN IF NOT EXISTS max_radius_km      int NOT NULL DEFAULT 6;
ALTER TABLE public.trueque_profiles ADD COLUMN IF NOT EXISTS pins_updated_at    timestamptz;
ALTER TABLE public.trueque_profiles ADD COLUMN IF NOT EXISTS adult_confirmed_at timestamptz;
ALTER TABLE public.trueque_profiles ADD COLUMN IF NOT EXISTS rules_accepted_at  timestamptz;
ALTER TABLE public.trueque_profiles ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS trueque_profiles_state_idx ON public.trueque_profiles (state);

-- 1.2 Pines (hasta 3 por usuario). SOLO coordenadas redondeadas a 2 decimales.
CREATE TABLE IF NOT EXISTS public.trueque_pins (
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot        smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  lat         numeric NOT NULL,
  lng         numeric NOT NULL,
  label       text CHECK (label IS NULL OR length(label) <= 30),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot),
  CONSTRAINT trueque_pins_rounded CHECK (lat = round(lat, 2) AND lng = round(lng, 2))
);

-- 1.3 Reportes de usuarios (León los revisa en Supabase; no hay pantalla de moderación)
CREATE TABLE IF NOT EXISTS public.trueque_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id     uuid REFERENCES public.exchange_matches(id) ON DELETE SET NULL,
  -- Misma lista que trueque_valid_report_reason() (literal aquí: el cliente no tiene EXECUTE sobre ella)
  reason       text NOT NULL CHECK (reason IN ('acoso', 'estafa', 'datos_personales', 'inseguro', 'otro')),
  details      text CHECK (details IS NULL OR length(details) <= 500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id)
);
CREATE INDEX IF NOT EXISTS trueque_reports_reported_idx ON public.trueque_reports (reported_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trueque_reports_reporter_idx ON public.trueque_reports (reporter_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. RLS y privilegios
--    Supabase da por defecto ALL a anon/authenticated en tablas nuevas de public,
--    así que los REVOKE explícitos son obligatorios.
-- ----------------------------------------------------------------------------
ALTER TABLE public.trueque_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trueque_pins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trueque_reports  ENABLE ROW LEVEL SECURITY;

-- Perfil y pines: el dueño solo LEE lo suyo. Ninguna política muestra datos de otros.
DROP POLICY IF EXISTS tprof_select_own ON public.trueque_profiles;
CREATE POLICY tprof_select_own ON public.trueque_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS tpins_select_own ON public.trueque_pins;
CREATE POLICY tpins_select_own ON public.trueque_pins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Reportes: solo INSERT del propio reportante; el cliente no lee nada.
DROP POLICY IF EXISTS treports_insert_own ON public.trueque_reports;
CREATE POLICY treports_insert_own ON public.trueque_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND reported_id <> auth.uid());

REVOKE ALL ON public.trueque_profiles, public.trueque_pins, public.trueque_reports FROM anon;
-- Escritura SOLO por RPC (si no, el cliente se saltaría el redondeo y el límite de 24 h).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.trueque_profiles, public.trueque_pins FROM authenticated;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE ON public.trueque_reports FROM authenticated;
GRANT SELECT ON public.trueque_profiles, public.trueque_pins TO authenticated;
GRANT INSERT ON public.trueque_reports TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Helpers internos (REVOKE a clientes al final)
-- ----------------------------------------------------------------------------

-- Distancia en km sobre la esfera (fórmula haversine), sin extensiones.
CREATE OR REPLACE FUNCTION public.trueque_haversine_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS double precision LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT 2 * 6371 * asin(least(1, sqrt(
           power(sin(radians((lat2 - lat1)::float8) / 2), 2)
         + cos(radians(lat1::float8)) * cos(radians(lat2::float8))
         * power(sin(radians((lng2 - lng1)::float8) / 2), 2)
         )));
$$;

-- v3: las firmas v2 recibían/devolvían zonas compartidas. Se borran para recrearlas sin zonas
-- (cambia el tipo de retorno, así que CREATE OR REPLACE no basta). Re-ejecutable.
DROP FUNCTION IF EXISTS public.trueque_pair_geo(uuid, uuid);
DROP FUNCTION IF EXISTS public.trueque_proximity_band(double precision, text[], boolean);
DROP FUNCTION IF EXISTS public.trueque_in_scope(text, double precision, text[], boolean, int);

-- Geografía de una pareja: distancia mínima entre cualquiera de sus pines (hasta 3×3; NULL si
-- alguno no tiene pines) y si comparten estado (NULL = alguno no tiene estado). Sin zonas (v3).
-- ⚠️ Recibe dos user_id arbitrarios: NUNCA exponerla a clientes.
CREATE OR REPLACE FUNCTION public.trueque_pair_geo(p_uid uuid, p_other uuid)
RETURNS TABLE (dist_km double precision, same_state boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT min(trueque_haversine_km(a.lat, a.lng, b.lat, b.lng))
       FROM trueque_pins a JOIN trueque_pins b ON b.user_id = p_other
      WHERE a.user_id = p_uid),
    (SELECT pa.state = pb.state
       FROM trueque_profiles pa, trueque_profiles pb
      WHERE pa.user_id = p_uid AND pb.user_id = p_other
        AND pa.state IS NOT NULL AND pb.state IS NOT NULL);
$$;

-- Rango de cercanía (lo único que ve el cliente). Con pines de ambos manda la distancia;
-- si no, solo se sabe si comparten estado.
CREATE OR REPLACE FUNCTION public.trueque_proximity_band(p_dist double precision, p_same_state boolean)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_dist IS NOT NULL AND p_dist <= 3  THEN 'lt3'
    WHEN p_dist IS NOT NULL AND p_dist <= 6  THEN '3_6'
    WHEN p_dist IS NOT NULL AND p_dist <= 12 THEN '6_12'
    WHEN p_dist IS NOT NULL AND p_dist <= 25 THEN '12_25'
    WHEN p_same_state IS TRUE  THEN 'same_state'
    WHEN p_same_state IS FALSE THEN 'other_state'
    ELSE 'far'
  END;
$$;

-- Orden de cercanía (menor = más cerca).
CREATE OR REPLACE FUNCTION public.trueque_band_rank(p_band text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_band
    WHEN 'lt3' THEN 1 WHEN '3_6' THEN 2 WHEN '6_12' THEN 3 WHEN '12_25' THEN 4
    WHEN 'same_state' THEN 5 WHEN 'far' THEN 6 WHEN 'other_state' THEN 7
    ELSE 8 END;
$$;

-- ¿Entra la pareja en el alcance elegido? Cada alcance incluye a los anteriores.
--   radius  = dentro de MI radio (max_radius_km)
--   25km    = dentro de 25 km
--   state   = lo anterior + mismo estado
--   country = todo el país
-- Sin pines de alguno de los dos (dist NULL) solo entra por "mi estado" o "todo el país".
CREATE OR REPLACE FUNCTION public.trueque_in_scope(p_scope text, p_dist double precision,
                                                  p_same_state boolean, p_radius int)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_scope
    WHEN 'radius'  THEN coalesce(p_dist <= p_radius, false)
    WHEN '25km'    THEN coalesce(p_dist <= public.trueque_geo_int('wide_radius_km'), false)
    WHEN 'state'   THEN coalesce(p_dist <= public.trueque_geo_int('wide_radius_km'), false)
                        OR coalesce(p_same_state, false)
    WHEN 'country' THEN true
    ELSE false
  END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Requisitos server-side: sin reglas aceptadas (y +18) no se publica ni se chatea;
--    sin estado no se publica. Triggers NUEVOS: no se modifican los de trueque_schema.sql.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_trueque_require_ready()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p public.trueque_profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;                          -- SQL Editor / service_role
  IF TG_TABLE_NAME = 'exchange_chats' AND NEW.is_system THEN RETURN NEW; END IF;
  SELECT * INTO p FROM trueque_profiles WHERE user_id = uid;
  IF NOT FOUND OR p.rules_accepted_at IS NULL OR p.adult_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'TRUEQUE_RULES_REQUIRED';
  END IF;
  IF TG_TABLE_NAME <> 'exchange_chats' AND p.state IS NULL THEN
    RAISE EXCEPTION 'TRUEQUE_STATE_REQUIRED';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_trueque_ready_offered ON public.books_offered;
CREATE TRIGGER trg_trueque_ready_offered BEFORE INSERT ON public.books_offered
  FOR EACH ROW EXECUTE FUNCTION public.trg_trueque_require_ready();
DROP TRIGGER IF EXISTS trg_trueque_ready_wanted ON public.books_wanted;
CREATE TRIGGER trg_trueque_ready_wanted BEFORE INSERT ON public.books_wanted
  FOR EACH ROW EXECUTE FUNCTION public.trg_trueque_require_ready();
DROP TRIGGER IF EXISTS trg_trueque_ready_chat ON public.exchange_chats;
CREATE TRIGGER trg_trueque_ready_chat BEFORE INSERT ON public.exchange_chats
  FOR EACH ROW EXECUTE FUNCTION public.trg_trueque_require_ready();

-- ----------------------------------------------------------------------------
-- 5. RPCs de perfil y pines. Devuelven jsonb {success, error?} (no lanzan), como spend_gems.
--    Códigos estables: NOT_AUTHENTICATED, ADULT_REQUIRED, RULES_REQUIRED, STATE_INVALID,
--    RADIUS_INVALID, PINS_INVALID, PINS_COOLDOWN (+ retry_at).
-- ----------------------------------------------------------------------------

-- 5.1 "Antes de empezar": reglas + confirmación de mayoría de edad
CREATE OR REPLACE FUNCTION public.accept_trueque_rules(p_adult boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED'); END IF;
  IF p_adult IS NOT TRUE THEN RETURN jsonb_build_object('success', false, 'error', 'ADULT_REQUIRED'); END IF;

  INSERT INTO trueque_profiles (user_id, rules_accepted_at, adult_confirmed_at, max_radius_km)
  VALUES (uid, now(), now(), trueque_geo_int('default_radius_km'))
  ON CONFLICT (user_id) DO UPDATE
    SET rules_accepted_at  = coalesce(trueque_profiles.rules_accepted_at, now()),
        adult_confirmed_at = coalesce(trueque_profiles.adult_confirmed_at, now()),
        updated_at = now();
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;

-- 5.2 Guardar pines + estado + radio.
--   p_pins = NULL → solo cambia estado/radio (no toca pines ni consume el límite de 24 h).
--   p_pins = [{lat, lng, label?}, …] (1..3) → reemplaza todos los pines. Redondeo AQUÍ.
--   El límite de 24 h aplica solo si cambian las coordenadas (editar etiquetas es libre).
CREATE OR REPLACE FUNCTION public.save_trueque_pins(p_pins jsonb, p_state text, p_max_radius_km int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid      uuid := auth.uid();
  v_prof   public.trueque_profiles%ROWTYPE;
  v_state  text;
  v_radius int;
  v_dec    int := trueque_geo_int('pin_decimals');
  v_cool   interval := make_interval(hours => trueque_geo_int('pin_cooldown_hours'));
  v_n      int;
  e        jsonb;
  v_lat    numeric;
  v_lng    numeric;
  v_label  text;
  v_lats   numeric[] := '{}';
  v_lngs   numeric[] := '{}';
  v_labels text[] := '{}';
  v_changed boolean;
  v_now    timestamptz := now();
  v_pins_at timestamptz;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED'); END IF;

  SELECT * INTO v_prof FROM trueque_profiles WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND OR v_prof.rules_accepted_at IS NULL OR v_prof.adult_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'RULES_REQUIRED');
  END IF;

  v_state := coalesce(nullif(upper(btrim(coalesce(p_state, ''))), ''), v_prof.state);
  IF v_state IS NULL OR NOT trueque_valid_state(v_state) THEN
    RETURN jsonb_build_object('success', false, 'error', 'STATE_INVALID');
  END IF;

  v_radius := coalesce(p_max_radius_km, v_prof.max_radius_km);
  IF v_radius IS NULL OR v_radius NOT IN (
       SELECT r.value::int FROM jsonb_array_elements_text(trueque_geo_cfg() -> 'radii_km') AS r(value)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'RADIUS_INVALID');
  END IF;

  -- Solo estado/radio
  IF p_pins IS NULL OR jsonb_typeof(p_pins) = 'null' THEN
    -- v3: sin zonas, todos (CDMX incluida) necesitan al menos 1 pin ya guardado.
    IF NOT EXISTS (SELECT 1 FROM trueque_pins WHERE user_id = uid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'PINS_INVALID');
    END IF;
    UPDATE trueque_profiles SET state = v_state, max_radius_km = v_radius, updated_at = v_now
     WHERE user_id = uid;
    RETURN jsonb_build_object('success', true, 'pins_updated_at', v_prof.pins_updated_at);
  END IF;

  -- Validación de pines
  IF jsonb_typeof(p_pins) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PINS_INVALID');
  END IF;
  v_n := jsonb_array_length(p_pins);
  IF v_n < 1 OR v_n > trueque_geo_int('max_pins') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PINS_INVALID');
  END IF;

  FOR e IN SELECT value FROM jsonb_array_elements(p_pins) LOOP
    IF jsonb_typeof(e) <> 'object'
       OR jsonb_typeof(e -> 'lat') IS DISTINCT FROM 'number'
       OR jsonb_typeof(e -> 'lng') IS DISTINCT FROM 'number'
       OR coalesce(jsonb_typeof(e -> 'label'), 'null') NOT IN ('string', 'null') THEN
      RETURN jsonb_build_object('success', false, 'error', 'PINS_INVALID');
    END IF;
    v_lat := round((e ->> 'lat')::numeric, v_dec);   -- redondeo EN EL SERVIDOR
    v_lng := round((e ->> 'lng')::numeric, v_dec);
    IF v_lat < trueque_geo_int('lat_min') OR v_lat > trueque_geo_int('lat_max')
       OR v_lng < trueque_geo_int('lng_min') OR v_lng > trueque_geo_int('lng_max') THEN
      RETURN jsonb_build_object('success', false, 'error', 'PINS_INVALID');
    END IF;
    v_label := nullif(btrim(coalesce(e ->> 'label', '')), '');
    IF v_label IS NOT NULL AND length(v_label) > trueque_geo_int('label_max') THEN
      RETURN jsonb_build_object('success', false, 'error', 'PINS_INVALID');
    END IF;
    v_lats := array_append(v_lats, v_lat);
    v_lngs := array_append(v_lngs, v_lng);
    v_labels := array_append(v_labels, v_label);
  END LOOP;

  -- ¿Cambiaron las coordenadas? (como conjunto; el orden no importa)
  SELECT (SELECT coalesce(array_agg(k ORDER BY k), '{}')
            FROM (SELECT lat::text || ',' || lng::text AS k FROM trueque_pins WHERE user_id = uid) s)
         IS DISTINCT FROM
         (SELECT array_agg(k ORDER BY k)
            FROM (SELECT la::text || ',' || lo::text AS k FROM unnest(v_lats, v_lngs) AS u(la, lo)) s)
    INTO v_changed;

  IF v_changed AND v_prof.pins_updated_at IS NOT NULL AND v_prof.pins_updated_at + v_cool > v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'PINS_COOLDOWN',
                              'retry_at', v_prof.pins_updated_at + v_cool);
  END IF;

  DELETE FROM trueque_pins WHERE user_id = uid;
  INSERT INTO trueque_pins (user_id, slot, lat, lng, label, updated_at)
  SELECT uid, g.i, v_lats[g.i], v_lngs[g.i], v_labels[g.i], v_now
    FROM generate_subscripts(v_lats, 1) AS g(i);

  v_pins_at := CASE WHEN v_changed THEN v_now ELSE v_prof.pins_updated_at END;
  UPDATE trueque_profiles
     SET state = v_state, max_radius_km = v_radius, pins_updated_at = v_pins_at, updated_at = v_now
   WHERE user_id = uid;

  RETURN jsonb_build_object('success', true, 'pins_updated_at', v_pins_at,
                            'next_edit_at', v_pins_at + v_cool);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;

-- 5.3 Mi perfil de Trueque + mis pines (solo los propios, ya redondeados)
CREATE OR REPLACE FUNCTION public.get_my_trueque_pins()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_prof public.trueque_profiles%ROWTYPE;
  v_cool interval := make_interval(hours => trueque_geo_int('pin_cooldown_hours'));
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED'); END IF;
  SELECT * INTO v_prof FROM trueque_profiles WHERE user_id = uid;
  RETURN jsonb_build_object(
    'success',            true,
    'state',              v_prof.state,
    'max_radius_km',      coalesce(v_prof.max_radius_km, trueque_geo_int('default_radius_km')),
    'pins_updated_at',    v_prof.pins_updated_at,
    'next_edit_at',       CASE WHEN v_prof.pins_updated_at IS NOT NULL
                                    AND v_prof.pins_updated_at + v_cool > now()
                               THEN v_prof.pins_updated_at + v_cool END,
    'rules_accepted_at',  v_prof.rules_accepted_at,
    'adult_confirmed_at', v_prof.adult_confirmed_at,
    'max_pins',           trueque_geo_int('max_pins'),
    'radii_km',           trueque_geo_cfg() -> 'radii_km',
    'pins', coalesce((SELECT jsonb_agg(jsonb_build_object('slot', slot, 'lat', lat, 'lng', lng, 'label', label)
                                       ORDER BY slot)
                        FROM trueque_pins WHERE user_id = uid), '[]'::jsonb)
  );
END $$;

-- ----------------------------------------------------------------------------
-- 6. Matching por cercanía
-- ----------------------------------------------------------------------------

-- 6.1 Generador (interno). Mismo emparejamiento por título y mismo upsert por pareja
--     que trueque_generate_matches(), pero los candidatos salen del alcance (pines/estado;
--     desde v3 sin zonas) en vez de exigir zona compartida; shared_zones se guarda vacío.
--     Primero se cruzan libros y luego se filtra por geografía, así el costo depende de cuántos títulos coinciden, no de cuántos
--     usuarios hay. Devuelve cuántas parejas entraron en el alcance (= resultados).
CREATE OR REPLACE FUNCTION public.trueque_generate_matches_geo(p_uid uuid, p_scope text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r  record;
  ex public.exchange_matches%ROWTYPE;
  a uuid; b uuid; ba uuid; bb uuid;
  v_radius int := coalesce((SELECT max_radius_km FROM trueque_profiles WHERE user_id = p_uid),
                           trueque_geo_int('default_radius_km'));
  n int := 0;
BEGIN
  UPDATE exchange_matches SET status = 'expired'
   WHERE (user_a_id = p_uid OR user_b_id = p_uid)
     AND status IN ('pending', 'chatting') AND expires_at <= now();

  FOR r IN
    WITH my_want AS (                           -- "Busco" + mi lista "Por leer"
      SELECT title_norm, false AS from_list FROM books_wanted WHERE user_id = p_uid AND is_active
      UNION ALL
      SELECT trueque_norm(title), true FROM books WHERE user_id = p_uid AND status = 'want_to_read'
    ),
    mine AS (                                   -- un libro mío que X busca
      SELECT DISTINCT ON (xw.user_id) xw.user_id AS xid, bo.id AS book_id
      FROM books_offered bo
      JOIN books_wanted xw ON xw.title_norm = bo.title_norm AND xw.is_active AND xw.user_id <> p_uid
      WHERE bo.user_id = p_uid AND bo.is_active
      ORDER BY xw.user_id, bo.created_at, bo.id
    ),
    theirs AS (                                 -- un libro de X que yo busco (prefiere "Busco")
      SELECT DISTINCT ON (xo.user_id) xo.user_id AS xid, xo.id AS book_id, mw.from_list
      FROM books_offered xo
      JOIN my_want mw ON mw.title_norm = xo.title_norm
      WHERE xo.user_id <> p_uid AND xo.is_active
      ORDER BY xo.user_id, mw.from_list, xo.created_at, xo.id
    ),
    pairs AS (
      SELECT coalesce(m.xid, t.xid) AS xid, m.book_id AS my_book, t.book_id AS their_book,
             coalesce(t.from_list, false) AS via_list
      FROM mine m FULL JOIN theirs t ON t.xid = m.xid
    )
    SELECT p.xid, p.my_book, p.their_book, p.via_list
    FROM pairs p
    CROSS JOIN LATERAL trueque_pair_geo(p_uid, p.xid) g
    WHERE trueque_in_scope(p_scope, g.dist_km, g.same_state, v_radius)
  LOOP
    n := n + 1;
    IF p_uid < r.xid THEN
      a := p_uid; b := r.xid; ba := r.my_book; bb := r.their_book;
    ELSE
      a := r.xid; b := p_uid; ba := r.their_book; bb := r.my_book;
    END IF;

    SELECT * INTO ex FROM exchange_matches
     WHERE user_a_id = a AND user_b_id = b AND status IN ('pending', 'chatting')
     ORDER BY (status = 'chatting') DESC LIMIT 1;
    IF FOUND THEN
      IF ex.status = 'chatting' THEN CONTINUE; END IF;
      IF ex.book_a_offers IS NOT DISTINCT FROM ba AND ex.book_b_offers IS NOT DISTINCT FROM bb THEN
        CONTINUE;
      END IF;
      UPDATE exchange_matches SET status = 'cancelled' WHERE id = ex.id;
    END IF;

    INSERT INTO exchange_matches (user_a_id, user_b_id, match_type, book_a_offers, book_b_offers,
                                  shared_zones, via_reading_list)
    VALUES (a, b,
            CASE WHEN r.my_book IS NOT NULL AND r.their_book IS NOT NULL
                 THEN 'perfecto'::exchange_match_type ELSE 'parcial'::exchange_match_type END,
            ba, bb, '{}'::text[], r.via_list)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN n;
END $$;

-- 6.2 Lectura (interna): las mismas columnas de trueque_matches_for() + rango de cercanía.
--     Orden: perfecto antes que parcial → más cerca → mejor calificación → más reciente.
--     NUNCA devuelve coordenadas ni distancias exactas.
CREATE OR REPLACE FUNCTION public.trueque_matches_geo_for(p_uid uuid)
RETURNS TABLE (
  match_id uuid, match_type text, status text, created_at timestamptz, expires_at timestamptz,
  shared_zones text[], via_reading_list boolean,
  other_user_id uuid, other_name text, other_username text, other_avatar_url text,
  other_rating_avg numeric, other_rating_count int,
  my_book_id uuid, my_book_title text, my_book_author text,
  their_book_id uuid, their_book_title text, their_book_author text,
  their_book_condition text, their_book_photo_url text,
  i_rated boolean,
  proximity text, sort_order int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.*, x.band,
         (row_number() OVER (ORDER BY (f.match_type = 'perfecto') DESC, trueque_band_rank(x.band),
                                      f.other_rating_avg DESC NULLS LAST, f.created_at DESC))::int
  FROM trueque_matches_for(p_uid) f
  CROSS JOIN LATERAL trueque_pair_geo(p_uid, f.other_user_id) g
  CROSS JOIN LATERAL (SELECT trueque_proximity_band(g.dist_km, g.same_state) AS band) x
  ORDER BY 24;
$$;

-- 6.3 Mis matches con rango de cercanía (gratis; no descubre nuevos)
CREATE OR REPLACE FUNCTION public.get_my_trueque_matches()
RETURNS TABLE (
  match_id uuid, match_type text, status text, created_at timestamptz, expires_at timestamptz,
  shared_zones text[], via_reading_list boolean,
  other_user_id uuid, other_name text, other_username text, other_avatar_url text,
  other_rating_avg numeric, other_rating_count int,
  my_book_id uuid, my_book_title text, my_book_author text,
  their_book_id uuid, their_book_title text, their_book_author text,
  their_book_condition text, their_book_photo_url text,
  i_rated boolean,
  proximity text, sort_order int
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  RETURN QUERY SELECT * FROM trueque_matches_geo_for(auth.uid());
END $$;

-- 6.4 Buscar matches por alcance. TODO en una transacción:
--     valida → (free) bloquea su fila de gemas → genera → si hubo resultados cobra.
--     0 resultados = no se cobra. Si el cobro fallara, la excepción revierte también
--     los matches generados (no se entrega sin cobrar ni se cobra sin entregar).
--     Devuelve jsonb: {success, scope, result_count, charged, matches[]} o {success:false, error}.
--     Errores: NOT_AUTHENTICATED, SCOPE_INVALID, RULES_REQUIRED, STATE_REQUIRED,
--              LOCATION_REQUIRED, RATE_LIMIT, GEMS_INSUFFICIENT (+ cost).
CREATE OR REPLACE FUNCTION public.search_trueque_matches(p_scope text DEFAULT 'radius')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid       uuid := auth.uid();
  v_prof    public.trueque_profiles%ROWTYPE;
  v_prem    boolean;
  v_cost    int := trueque_cfg('search_matches_cost', 20);
  v_balance int;
  v_found   int;
  v_charged int := 0;
  today     date := (now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED'); END IF;
  IF p_scope IS NULL OR p_scope NOT IN ('radius', '25km', 'state', 'country') THEN
    RETURN jsonb_build_object('success', false, 'error', 'SCOPE_INVALID');
  END IF;

  SELECT * INTO v_prof FROM trueque_profiles WHERE user_id = uid;
  IF NOT FOUND OR v_prof.rules_accepted_at IS NULL OR v_prof.adult_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'RULES_REQUIRED');
  END IF;
  IF v_prof.state IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'STATE_REQUIRED');
  END IF;
  -- v3: se busca solo con pines (las zonas de CDMX ya no cuentan, aunque sigan guardadas).
  IF NOT EXISTS (SELECT 1 FROM trueque_pins WHERE user_id = uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCATION_REQUIRED');
  END IF;

  v_prem := coalesce((SELECT is_premium FROM users WHERE id = uid), false);
  IF v_prem THEN
    IF (SELECT count(*) FROM trueque_search_credits
         WHERE user_id = uid AND (created_at AT TIME ZONE 'America/Mexico_City')::date = today)
       >= trueque_cfg('plus_daily_searches', 10) THEN
      RETURN jsonb_build_object('success', false, 'error', 'RATE_LIMIT');
    END IF;
  ELSIF v_cost > 0 THEN
    -- Bloquea la fila: nadie puede gastar estas gemas mientras dura la búsqueda.
    SELECT balance INTO v_balance FROM user_gems WHERE user_id = uid FOR UPDATE;
    IF coalesce(v_balance, 0) < v_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'GEMS_INSUFFICIENT', 'cost', v_cost);
    END IF;
  END IF;

  v_found := trueque_generate_matches_geo(uid, p_scope);

  IF v_found > 0 AND NOT v_prem AND v_cost > 0 THEN
    UPDATE user_gems SET balance = balance - v_cost WHERE user_id = uid AND balance >= v_cost;
    IF NOT FOUND THEN RAISE EXCEPTION 'TRUEQUE_NO_GEMS'; END IF;    -- revierte TODO (incluidos los matches)
    INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
      VALUES (uid, 0, -v_cost, 'trueque_search', gen_random_uuid()::text);
    v_charged := v_cost;
  END IF;

  -- Registro de la búsqueda (cupo diario Plus, trueque_status.searches_today y métricas).
  -- Se inserta ya consumido: no sirve como crédito para find_book_matches.
  INSERT INTO trueque_search_credits (user_id, used_at) VALUES (uid, now());

  RETURN jsonb_build_object(
    'success', true, 'scope', p_scope, 'result_count', v_found, 'charged', v_charged,
    'matches', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.sort_order), '[]'::jsonb)
                  FROM trueque_matches_geo_for(uid) x)
  );
END $$;

-- ----------------------------------------------------------------------------
-- 7. Reportar a un usuario (desde el chat del intercambio)
--    Errores: NOT_AUTHENTICATED, REPORT_INVALID, NOT_PARTICIPANT, REPORT_LIMIT.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_trueque_user(p_reported_id uuid, p_reason text,
                                                     p_details text DEFAULT NULL, p_match_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  m public.exchange_matches%ROWTYPE;
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED'); END IF;
  IF p_reported_id IS NULL OR p_reported_id = uid OR NOT trueque_valid_report_reason(p_reason)
     OR (v_details IS NOT NULL AND length(v_details) > trueque_geo_int('report_details_max'))
     OR NOT EXISTS (SELECT 1 FROM users WHERE id = p_reported_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'REPORT_INVALID');
  END IF;
  IF p_match_id IS NOT NULL THEN
    SELECT * INTO m FROM exchange_matches WHERE id = p_match_id;
    IF NOT FOUND OR uid NOT IN (m.user_a_id, m.user_b_id) OR p_reported_id NOT IN (m.user_a_id, m.user_b_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
    END IF;
  END IF;
  IF (SELECT count(*) FROM trueque_reports
       WHERE reporter_id = uid AND created_at > now() - interval '1 day')
     >= trueque_geo_int('report_daily_max') THEN
    RETURN jsonb_build_object('success', false, 'error', 'REPORT_LIMIT');
  END IF;

  INSERT INTO trueque_reports (reporter_id, reported_id, match_id, reason, details)
  VALUES (uid, p_reported_id, p_match_id, p_reason, v_details)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;

-- ----------------------------------------------------------------------------
-- 8. Medición: embudo del Trueque (conteos, sin datos personales).
--    Solo para León desde el SQL Editor: sin acceso para anon ni authenticated.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.trueque_funnel_summary WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.trueque_profiles WHERE state IS NOT NULL)          AS usuarios_con_estado,
  (SELECT count(DISTINCT user_id) FROM public.trueque_pins)                       AS usuarios_con_pines,
  (SELECT count(*) FROM public.trueque_search_credits)                            AS busquedas,
  (SELECT count(DISTINCT match_id) FROM public.exchange_chats WHERE NOT is_system) AS chats_iniciados,
  (SELECT count(*) FROM public.exchange_matches WHERE status = 'completed')       AS intercambios_completados;
REVOKE ALL ON public.trueque_funnel_summary FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Permisos de funciones: cerrar a PUBLIC y abrir solo lo que usa el cliente
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.trueque_geo_cfg()                                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_geo_int(text)                                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_valid_state(text)                            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_valid_report_reason(text)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_haversine_km(numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_pair_geo(uuid, uuid)                         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_proximity_band(double precision, boolean)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_band_rank(text)                              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_in_scope(text, double precision, boolean, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_trueque_require_ready()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_generate_matches_geo(uuid, text)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trueque_matches_geo_for(uuid)                        FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.accept_trueque_rules(boolean)                        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_trueque_pins(jsonb, text, int)                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_trueque_pins()                                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_trueque_matches()                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_trueque_matches(text)                         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_trueque_user(uuid, text, text, uuid)          FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trueque_rules(boolean)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_trueque_pins(jsonb, text, int)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_trueque_pins()                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_trueque_matches()                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_trueque_matches(text)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_trueque_user(uuid, text, text, uuid)       TO authenticated;

-- Recargar la caché de PostgREST (si no, el cliente recibe PGRST202 "function not found")
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- CONSULTAS DE PRUEBA (SQL Editor, como postgres)
--   select public.trueque_haversine_km(19.42, -99.16, 19.43, -99.13);   -- ≈ 3.3 km (Roma → Centro)
--   select public.trueque_proximity_band(4.2, true);                     -- '3_6'
--   select public.trueque_proximity_band(null, true);                    -- 'same_state' (alguno sin pines)
--   -- v3: ninguna función de cercanía debe mencionar user_exchange_zones (debe dar 0 filas):
--   select proname from pg_proc where pronamespace = 'public'::regnamespace
--     and proname like 'trueque%' and prosrc ilike '%user_exchange_zones%'
--     and proname not in ('trueque_generate_matches', 'trueque_status');
--   select * from public.trueque_funnel_summary;                         -- embudo
--   select p.user_id, u.username, p.state, p.max_radius_km, p.pins_updated_at, p.rules_accepted_at
--     from public.trueque_profiles p join public.users u on u.id = p.user_id;
--   select u.username, t.slot, t.lat, t.lng from public.trueque_pins t join public.users u on u.id = t.user_id;
--   select * from public.trueque_reports order by created_at desc;        -- reportes por revisar
--   select * from public.reward_ledger where reason = 'trueque_search' order by created_at desc limit 20;
--   -- Distancia mínima entre dos cuentas de prueba (solo aquí; el cliente nunca la ve):
--   select * from public.trueque_pair_geo('<uuid A>', '<uuid B>');
--
-- REINICIAR EL LÍMITE DE 24 h DE PINES (cuentas de prueba)
--   update public.trueque_profiles set pins_updated_at = null
--    where user_id = (select id from public.users where username = '<usuario>');
--
-- VOLVER A PEDIR "ANTES DE EMPEZAR" / "COMPLETA TU UBICACIÓN" (cuenta de prueba)
--   update public.trueque_profiles set rules_accepted_at = null, adult_confirmed_at = null
--    where user_id = (select id from public.users where username = '<usuario>');
--   update public.trueque_profiles set state = null
--    where user_id = (select id from public.users where username = '<usuario>');
-- ============================================================================

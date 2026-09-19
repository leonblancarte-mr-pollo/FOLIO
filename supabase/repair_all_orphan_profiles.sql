-- ============================================================================
-- FOLIO — Reparación masiva de cuentas huérfanas
-- (existen en auth.users pero NO tienen fila en public.users)
--
-- Correr en Supabase → SQL Editor (rol postgres: no le afecta RLS).
-- Es IDEMPOTENTE: solo toca cuentas sin perfil, así que correrlo dos veces no rompe
-- nada (la segunda vez repara 0). No borra ni modifica perfiles existentes.
--
-- Para cada huérfana crea el perfil con raw_user_meta_data de auth.users:
--   username = metadata.username, o la parte del email antes de la @ (solo [a-z0-9_]);
--              si ya lo usa otro perfil se le añade un sufijo aleatorio de 4 caracteres
--              (hasta 8 intentos, también contra huérfanas reparadas en esta misma corrida)
--   nombre   = metadata.nombre → metadata.full_name → parte del email antes de la @
--   is_public = true · is_premium = false · onboarding_completed = false
--   created_at = auth.users.created_at (solo si `users` tiene esa columna)
--
-- El resultado (último SELECT) lista las reparadas, las que SIGAN huérfanas y un resumen.
-- Para revisar antes de correr, mira solo la lista: cleanup_orphan_auth_users.sql (paso 1).
-- ============================================================================

DROP TABLE IF EXISTS pg_temp._orphan_repair_log;
CREATE TEMP TABLE _orphan_repair_log (id uuid, email text, username text, nota text);

DO $$
DECLARE
  r            record;
  base_user    text;
  cand         text;
  nombre_v     text;
  attempts     int;
  done         boolean;
  repaired     int := 0;
  skipped      int := 0;
  has_created  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at'
  ) INTO has_created;

  FOR r IN
    SELECT au.id, au.email, au.created_at, au.raw_user_meta_data AS meta
      FROM auth.users au
      LEFT JOIN public.users pu ON pu.id = au.id
     WHERE pu.id IS NULL
     ORDER BY au.created_at
  LOOP
    base_user := lower(regexp_replace(
                   COALESCE(NULLIF(r.meta->>'username', ''), split_part(COALESCE(r.email, ''), '@', 1)),
                   '[^a-zA-Z0-9_]', '', 'g'));
    IF base_user IS NULL OR base_user = '' THEN
      base_user := 'usuario';
    END IF;

    nombre_v := COALESCE(NULLIF(r.meta->>'nombre', ''),
                         NULLIF(r.meta->>'full_name', ''),
                         NULLIF(split_part(COALESCE(r.email, ''), '@', 1), ''),
                         'Lector');

    cand := base_user;
    attempts := 0;
    done := false;

    WHILE NOT done AND attempts <= 8 LOOP
      -- Si el username ya está tomado (por otro perfil o por una reparada hace un instante) → sufijo.
      IF attempts > 0 OR EXISTS (SELECT 1 FROM public.users u WHERE lower(u.username) = cand) THEN
        cand := base_user || substr(md5(random()::text || r.id::text || attempts::text), 1, 4);
      END IF;

      BEGIN
        IF has_created THEN
          INSERT INTO public.users (id, email, username, nombre, is_public, is_premium, onboarding_completed, created_at)
          VALUES (r.id, lower(r.email), cand, nombre_v, true, false, false, r.created_at);
        ELSE
          INSERT INTO public.users (id, email, username, nombre, is_public, is_premium, onboarding_completed)
          VALUES (r.id, lower(r.email), cand, nombre_v, true, false, false);
        END IF;
        done := true;
        repaired := repaired + 1;
        INSERT INTO _orphan_repair_log VALUES (r.id, r.email, cand,
          CASE WHEN cand = base_user THEN 'username original' ELSE 'username con sufijo (el original estaba tomado)' END);
      EXCEPTION WHEN unique_violation THEN
        -- Colisión de username → siguiente intento con otro sufijo. Si el conflicto es por la PK
        -- (perfil creado en paralelo por la app) o por email, el siguiente intento fallará igual y
        -- se agotan los intentos: queda como "omitida".
        attempts := attempts + 1;
      END;
    END LOOP;

    IF NOT done THEN
      skipped := skipped + 1;
      INSERT INTO _orphan_repair_log VALUES (r.id, r.email, NULL, 'OMITIDA: conflicto de unicidad (revisar a mano)');
    END IF;
  END LOOP;

  RAISE NOTICE 'Cuentas huérfanas reparadas: %  |  omitidas: %', repaired, skipped;
END $$;

-- Resultado: reparadas + las que sigan huérfanas + resumen
SELECT 'reparada' AS estado, id, email, username, nota FROM _orphan_repair_log WHERE username IS NOT NULL
UNION ALL
SELECT 'SIGUE HUÉRFANA', au.id, au.email, NULL, 'sin perfil: revisar'
  FROM auth.users au LEFT JOIN public.users pu ON pu.id = au.id
 WHERE pu.id IS NULL
UNION ALL
SELECT 'RESUMEN', NULL, NULL, NULL,
       (SELECT count(*) FROM _orphan_repair_log WHERE username IS NOT NULL) || ' reparada(s), '
       || (SELECT count(*) FROM auth.users au LEFT JOIN public.users pu ON pu.id = au.id WHERE pu.id IS NULL)
       || ' huérfana(s) restante(s)'
ORDER BY 1, 3;

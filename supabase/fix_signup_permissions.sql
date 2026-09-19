-- ============================================================================
-- FOLIO — Fix signup: "No se pudo crear el perfil: permission denied for table users"
-- Correr en Supabase → SQL Editor, DESPUÉS de privacy_hardening.sql y trueque_schema.sql.
-- Es idempotente: se puede correr más de una vez.
--
-- DIAGNÓSTICO (2026-09-19, análisis estático del repo):
--   * `permission denied for table users` es un error de PRIVILEGIOS (GRANT), no de RLS
--     (un fallo de RLS diría "new row violates row-level security policy").
--   * Las policies INSERT/UPDATE ya existían (users_insert_self / users_update_own en
--     auth_rls_migration.sql), así que NO era una policy faltante.
--   * privacy_hardening.sql hizo `REVOKE SELECT ON users FROM authenticated` y re-otorgó
--     SELECT solo por columna (sin `email`). El signup usaba un UPSERT
--     (INSERT ... ON CONFLICT DO UPDATE), que a diferencia de un INSERT plano
--     necesita además privilegios de lectura/UPDATE sobre columnas: justo lo que
--     quedó recortado. El frontend ahora usa INSERT plano (authService.js).
--   * Este archivo blinda el lado SQL: policies con nombre explícito + GRANT de
--     INSERT/UPDATE por columna (todas las de `users` salvo `is_premium`, que solo
--     escribe el servidor / SQL Editor).
--
-- DIAGNÓSTICO OPCIONAL (correr ANTES para confirmar; solo lectura):
--   -- Privilegios por columna de `authenticated` sobre users:
--   SELECT column_name, privilege_type
--     FROM information_schema.column_privileges
--    WHERE table_schema='public' AND table_name='users' AND grantee='authenticated'
--    ORDER BY column_name, privilege_type;
--   -- Privilegios a nivel tabla:
--   SELECT privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema='public' AND table_name='users' AND grantee='authenticated';
--   -- Policies y triggers vigentes sobre users (busca algo creado a mano en el dashboard):
--   SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
--    WHERE schemaname='public' AND tablename='users';
--   SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
--    WHERE tgrelid='public.users'::regclass AND NOT tgisinternal;
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Policy INSERT: el usuario recién autenticado crea SU propia fila (id = auth.uid()).
--    Reemplaza a users_insert_self (mismo efecto, nombre explícito).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_insert_self ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Policy UPDATE: el usuario edita solo su perfil (avatar_url, cover_url, username, bio...).
--    Reemplaza a users_update_own.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. GRANTs por columna. Se calculan dinámicamente desde el esquema real (mismo enfoque que
--    privacy_hardening.sql) para no depender de listar a mano las columnas de `users`.
--    - INSERT y UPDATE sobre TODAS las columnas excepto `is_premium` (Folio Plus: además
--      lo protege el trigger guard_users_premium).
--    - SELECT NO se toca: `email` sigue sin SELECT para clientes (privacy_hardening.sql).
--    - Nunca se otorga nada a `anon`.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users'
     AND column_name <> 'is_premium';

  IF cols IS NOT NULL THEN
    EXECUTE format('GRANT INSERT (%s) ON public.users TO authenticated', cols);
    EXECUTE format('GRANT UPDATE (%s) ON public.users TO authenticated', cols);
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (después de correr esto):
--   1. Crear una cuenta nueva desde la app → sin error, y aparece en public.users:
--        SELECT id, nombre, username FROM public.users
--         WHERE id IN (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 3);
--   2. Logout / login → funciona.
--   3. Trueque: publicar un libro en "Ofrezco" → funciona (no se tocó su RLS).
--   4. `select email from users` desde el cliente SIGUE fallando (email protegido).
-- Para reparar cuentas huérfanas ya existentes: cleanup_orphan_auth_users.sql
-- (o simplemente inician sesión: authService.js les auto-crea el perfil).
-- ============================================================================

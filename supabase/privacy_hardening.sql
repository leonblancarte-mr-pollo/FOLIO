-- ============================================================================
-- FOLIO — Privacidad real (el toggle is_public deja de ser decorativo)
-- Correr en Supabase → SQL Editor, DESPUÉS de auth_rls_migration.sql.
--
-- Problema: auth_rls_migration.sql da lectura ABIERTA a cualquier
-- `authenticated` en users/books/user_streaks/achievements (necesario en su
-- momento para que el feed y los perfiles de amigos funcionaran), así que el
-- toggle "cuenta privada" (is_public) de ProfileView no bloqueaba nada a
-- nivel de base de datos — cualquier usuario logueado podía leer el perfil,
-- biblioteca, racha y logros de cualquier otro con cualquier cliente REST.
--
-- Fix: SELECT solo se permite si...
--   (a) eres el dueño de la fila, o
--   (b) el dueño tiene is_public = true (o nunca lo tocó: default histórico
--       "público" — mismo criterio que ya usa el cliente, `!== false`), o
--   (c) eres su amigo aceptado (friendships.status = 'accepted').
--
-- ⚠️ Efecto secundario esperado: la búsqueda de amigos por username/nombre en
-- FriendsView usa SELECT sobre `users`, así que una vez aplicado este patch
-- una cuenta con is_public=false YA NO aparecerá en esa búsqueda para quien
-- todavía no es su amigo (antes sí, aunque su perfil se viera "vacío" en la
-- UI). Es la consecuencia correcta de una privacidad real; si se quiere que
-- las cuentas privadas sigan siendo *encontrables* por username (solo
-- encontrables, no legibles), habría que exponer una vista aparte con
-- columnas mínimas (id, username, nombre) sin RLS de privacidad — no se
-- incluye aquí porque no se pidió explícitamente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. users
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_select_auth ON public.users;
CREATE POLICY users_select_scoped ON public.users FOR SELECT TO authenticated USING (
  auth.uid() = id
  OR COALESCE(is_public, true) = true
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = users.id)
        OR (f.friend_id = auth.uid() AND f.user_id = users.id))
  )
);

-- Excluir email del SELECT público: revocar el privilegio a nivel de
-- COLUMNA (no solo RLS de fila) y re-otorgar sobre todas las columnas
-- EXCEPTO email. Dinámico vía information_schema para no depender de listar
-- a mano el esquema completo de users (y no romper si se agregan columnas).
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name <> 'email';

  IF cols IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT ON public.users FROM authenticated, anon';
    EXECUTE format('GRANT SELECT (%s) ON public.users TO authenticated', cols);
  END IF;
END $$;
-- Nota: ningún código del cliente selecciona users.email hoy (el email de la
-- sesión propia viene de supabase.auth, no de public.users), así que esto no
-- rompe nada existente.

-- Vista pública opcional sin email, por si se quiere usar en el futuro en vez
-- de seleccionar la tabla directo (no requerida por el código actual):
CREATE OR REPLACE VIEW public.users_public
WITH (security_invoker = true) AS
SELECT id, nombre, username, avatar_url, cover_url, bio, is_public
FROM public.users;

GRANT SELECT ON public.users_public TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. books
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS books_select_auth ON public.books;
CREATE POLICY books_select_scoped ON public.books FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = books.user_id AND COALESCE(u.is_public, true) = true)
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = books.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = books.user_id))
  )
);

-- ----------------------------------------------------------------------------
-- 3. user_streaks
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS streaks_select_auth ON public.user_streaks;
CREATE POLICY streaks_select_scoped ON public.user_streaks FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_streaks.user_id AND COALESCE(u.is_public, true) = true)
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = user_streaks.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = user_streaks.user_id))
  )
);

-- ----------------------------------------------------------------------------
-- 4. achievements
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS ach_select_auth ON public.achievements;
CREATE POLICY ach_select_scoped ON public.achievements FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = achievements.user_id AND COALESCE(u.is_public, true) = true)
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = achievements.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = achievements.user_id))
  )
);

-- ============================================================================
-- VERIFICACIÓN:
--   Usuario A pone is_public=false. Usuario B (no amigo) intenta:
--     supabase.from('users').select('*').eq('id', A) → 0 filas
--     supabase.from('books').select('*').eq('user_id', A) → 0 filas
--     supabase.from('user_streaks').select('*').eq('user_id', A) → 0 filas
--     supabase.from('achievements').select('*').eq('user_id', A) → 0 filas
--   Usuario C, amigo aceptado de A → SÍ ve las 4 consultas.
--   Cualquiera: supabase.from('users').select('email') → error de permisos
--     (column "email" ... permission denied), incluso sobre el propio id.
-- ============================================================================

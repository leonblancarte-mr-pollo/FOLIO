-- ============================================================================
-- FOLIO — Cuentas huérfanas: existen en auth.users pero NO en public.users
-- (signups que fallaron con "permission denied for table users").
-- Correr en Supabase → SQL Editor. Los pasos 2 y 3 están comentados a propósito:
-- REVISA la lista del paso 1 antes de ejecutar cualquiera.
-- ============================================================================

-- 1. LISTAR huérfanas (solo lectura)
SELECT au.id, au.email, au.created_at, au.email_confirmed_at, au.last_sign_in_at,
       au.raw_user_meta_data->>'nombre'   AS nombre_meta,
       au.raw_user_meta_data->>'username' AS username_meta
  FROM auth.users au
  LEFT JOIN public.users pu ON pu.id = au.id
 WHERE pu.id IS NULL
 ORDER BY au.created_at DESC;

-- 2. OPCIÓN A (recomendada): REPARAR — crear el perfil faltante desde el metadata del signup.
--    El usuario conserva su cuenta y contraseña. Si el username del metadata ya lo usa otra
--    cuenta, ese registro falla por UNIQUE: quítalo de la lista o bórralo con la opción B.
-- INSERT INTO public.users (id, email, nombre, username)
-- SELECT au.id, lower(au.email),
--        COALESCE(NULLIF(au.raw_user_meta_data->>'nombre', ''), split_part(au.email, '@', 1)),
--        COALESCE(NULLIF(au.raw_user_meta_data->>'username', ''), split_part(au.email, '@', 1))
--   FROM auth.users au
--   LEFT JOIN public.users pu ON pu.id = au.id
--  WHERE pu.id IS NULL;

-- 3. OPCIÓN B: BORRAR las huérfanas (irreversible; el email queda libre para registrarse de nuevo).
-- IMPORTANTE: Revisar la lista antes de borrar
-- DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM public.users);

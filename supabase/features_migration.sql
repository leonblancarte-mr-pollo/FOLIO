-- ============================================================================
-- FOLIO — Migración de features (jul 2026)
-- Correr en Supabase → SQL Editor. Cada bloque es independiente e idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FEATURE 1 — Listas personalizadas
-- Nota: book_id referencia public.books (la biblioteca del usuario), NO
-- books_curated (ese es solo el catálogo del Tinder). El usuario agrega a sus
-- listas libros que ya están en su biblioteca.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_list_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.user_lists(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE (list_id, book_id)
);

ALTER TABLE public.user_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_list_books ENABLE ROW LEVEL SECURITY;

-- Listas: el dueño ve/edita las suyas; las públicas las ve cualquier logueado.
DROP POLICY IF EXISTS lists_select     ON public.user_lists;
DROP POLICY IF EXISTS lists_write_own  ON public.user_lists;
CREATE POLICY lists_select    ON public.user_lists FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY lists_write_own ON public.user_lists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Libros de lista: visibles si la lista es visible; escritura solo del dueño de la lista.
DROP POLICY IF EXISTS list_books_select    ON public.user_list_books;
DROP POLICY IF EXISTS list_books_write_own ON public.user_list_books;
CREATE POLICY list_books_select ON public.user_list_books FOR SELECT TO authenticated
  USING (list_id IN (SELECT id FROM public.user_lists WHERE user_id = auth.uid() OR is_public = true));
CREATE POLICY list_books_write_own ON public.user_list_books FOR ALL TO authenticated
  USING      (list_id IN (SELECT id FROM public.user_lists WHERE user_id = auth.uid()))
  WITH CHECK (list_id IN (SELECT id FROM public.user_lists WHERE user_id = auth.uid()));


-- ----------------------------------------------------------------------------
-- FEATURE 3 — Eliminar cuenta
-- RPC SECURITY DEFINER: borra explícitamente todos los datos del usuario
-- (no dependemos de que cada FK tenga ON DELETE CASCADE) y al final la cuenta
-- de auth.users. Solo puede borrar la cuenta propia (usa auth.uid()).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Social: likes/respuestas/comentarios míos o colgados de mis posts
  DELETE FROM comment_likes WHERE user_id = uid
    OR comment_id IN (SELECT id FROM comments WHERE user_id = uid
                      OR post_id IN (SELECT id FROM posts WHERE user_id = uid));
  DELETE FROM comment_replies WHERE user_id = uid
    OR comment_id IN (SELECT id FROM comments WHERE user_id = uid
                      OR post_id IN (SELECT id FROM posts WHERE user_id = uid));
  DELETE FROM comments WHERE user_id = uid
    OR post_id IN (SELECT id FROM posts WHERE user_id = uid);
  DELETE FROM post_likes WHERE user_id = uid
    OR post_id IN (SELECT id FROM posts WHERE user_id = uid);
  DELETE FROM posts WHERE user_id = uid;

  -- Mensajería
  DELETE FROM messages WHERE sender_id = uid
    OR conversation_id IN (SELECT id FROM conversations WHERE uid IN (user1_id, user2_id));
  DELETE FROM conversations WHERE uid IN (user1_id, user2_id);

  -- Notificaciones y amistades (en ambas direcciones)
  DELETE FROM notifications WHERE user_id = uid OR actor_id = uid;
  DELETE FROM friendships WHERE uid IN (user_id, friend_id);

  -- Listas (también entradas de otras listas que apunten a mis libros)
  DELETE FROM user_list_books WHERE list_id IN (SELECT id FROM user_lists WHERE user_id = uid)
    OR book_id IN (SELECT id FROM books WHERE user_id = uid);
  DELETE FROM user_lists WHERE user_id = uid;

  -- Lectura y gamificación (hijos antes que books)
  DELETE FROM quotes WHERE user_id = uid;
  DELETE FROM reading_logs WHERE user_id = uid;
  DELETE FROM books WHERE user_id = uid;
  DELETE FROM user_streaks WHERE user_id = uid;
  DELETE FROM user_gems WHERE user_id = uid;
  DELETE FROM user_pets WHERE user_id = uid;
  DELETE FROM achievements WHERE user_id = uid;
  DELETE FROM monthly_wraps WHERE user_id = uid;

  -- Perfil y cuenta de autenticación
  DELETE FROM public.users WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- ----------------------------------------------------------------------------
-- FEATURE 4 — Fecha de lectura flexible
-- Precisión de la fecha de terminado de un libro:
--   'exact'        → finished_at es la fecha real elegida
--   'year'         → solo se sabe el año (finished_at apunta a mitad de ese año)
--   'before_folio' → lo leyó antes de usar la app (finished_at NULL)
--   'unknown'      → "en otra vida", no recuerda (finished_at NULL)
-- ----------------------------------------------------------------------------
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS read_date_precision text DEFAULT 'exact';

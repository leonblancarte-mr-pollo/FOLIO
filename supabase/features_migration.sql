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

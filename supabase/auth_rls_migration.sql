-- ============================================================================
-- FOLIO — Migración a Supabase Auth + RLS  (Plan A, wipe limpio)
-- Correr en Supabase → SQL Editor, en ESTE orden, por bloques.
--
-- Filosofía RLS: el agujero real es el acceso ANÓNIMO con la anon key del bundle.
-- Cerramos eso exigiendo `authenticated` en todo. Las LECTURAS se mantienen amplias
-- (para no romper feed/perfiles/amigos), pero las ESCRITURAS se acotan al dueño/actor.
-- Tablas verdaderamente privadas (reading_logs, user_gems, notifications) solo las lee
-- su dueño.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- BLOQUE 0 — WIPE (DESTRUCTIVO). Borra TODOS los datos. Ejecutar solo si estás seguro.
-- Los usuarios de auth.users se borran aparte desde Authentication → Users.
-- ----------------------------------------------------------------------------
TRUNCATE TABLE
  public.user_pets, public.user_streaks, public.user_gems, public.reading_logs,
  public.quotes, public.books, public.posts, public.comments, public.comment_replies,
  public.comment_likes, public.post_likes, public.friendships, public.notifications,
  public.messages, public.conversations, public.achievements, public.monthly_wraps,
  public.users
RESTART IDENTITY CASCADE;


-- ----------------------------------------------------------------------------
-- BLOQUE 1 — Limpieza de seguridad: eliminar el hash casero.
-- (Las columnas legacy de Supabase Auth en public.users — encrypted_password,
--  confirmation_token, etc. — NO se tocan aquí: hay que verificar antes si
--  realmente existen en public.users o si el audit las confundió con auth.users.)
-- ----------------------------------------------------------------------------
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;


-- ----------------------------------------------------------------------------
-- BLOQUE 2 — (Sin trigger.) El perfil en public.users lo inserta el CLIENTE
-- (registerWithSupabase) justo después del signUp. Por eso users necesita una
-- política de INSERT (ver users_insert_self en el Bloque 4): el insert corre como
-- el usuario recién autenticado, con id = auth.uid().
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- BLOQUE 3 — Habilitar RLS en todas las tablas públicas.
-- ----------------------------------------------------------------------------
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gems      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_wraps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes  ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- BLOQUE 4 — Políticas.
-- ----------------------------------------------------------------------------

-- users: perfiles legibles por cualquier usuario logueado; cada quien crea/edita el suyo.
CREATE POLICY users_select_auth   ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_insert_self   ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY users_update_own    ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY users_delete_own    ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- books: lectura para logueados (el feed muestra libros de otros); escritura solo dueño.
CREATE POLICY books_select_auth   ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY books_write_own     ON public.books FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- quotes: solo el dueño, o las marcadas is_public.
CREATE POLICY quotes_select       ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY quotes_write_own    ON public.quotes FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reading_logs: privado, solo el dueño.
CREATE POLICY reading_logs_own    ON public.reading_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_gems: privado, solo el dueño.
CREATE POLICY user_gems_own       ON public.user_gems FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_streaks / user_pets / achievements / monthly_wraps:
-- legibles por logueados (se ven en perfiles de amigos); escritura solo dueño.
CREATE POLICY streaks_select_auth ON public.user_streaks FOR SELECT TO authenticated USING (true);
CREATE POLICY streaks_write_own   ON public.user_streaks FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY pets_select_auth    ON public.user_pets FOR SELECT TO authenticated USING (true);
CREATE POLICY pets_write_own      ON public.user_pets FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY ach_select_auth     ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY ach_write_own       ON public.achievements FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY wraps_select_auth   ON public.monthly_wraps FOR SELECT TO authenticated USING (true);
CREATE POLICY wraps_write_own     ON public.monthly_wraps FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notifications: cada quien LEE/edita las suyas, pero cualquiera puede CREAR una
-- notificación para otro (es el actor, no el destinatario).
CREATE POLICY notif_select_own    ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notif_insert_actor  ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
CREATE POLICY notif_update_own    ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notif_delete_own    ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- friendships: lectura amplia (sugerencias "amigos de amigos", conteos);
-- el solicitante crea (user_id = yo); cualquiera de los dos acepta/borra.
CREATE POLICY friend_select_auth  ON public.friendships FOR SELECT TO authenticated USING (true);
CREATE POLICY friend_insert_self  ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY friend_update_party ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() IN (user_id, friend_id));
CREATE POLICY friend_delete_party ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (user_id, friend_id));

-- conversations: solo los dos participantes.
CREATE POLICY conv_select_party   ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (user1_id, user2_id));
CREATE POLICY conv_insert_party   ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (user1_id, user2_id));

-- messages: legibles/editables si la conversación es tuya; al enviar, sender = yo.
CREATE POLICY msg_select_party    ON public.messages FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE auth.uid() IN (user1_id, user2_id)));
CREATE POLICY msg_insert_sender   ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id
              AND conversation_id IN (SELECT id FROM public.conversations WHERE auth.uid() IN (user1_id, user2_id)));
CREATE POLICY msg_update_party    ON public.messages FOR UPDATE TO authenticated
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE auth.uid() IN (user1_id, user2_id)));

-- posts / comments / comment_replies: feed legible por logueados; escritura solo dueño.
CREATE POLICY posts_select_auth   ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY posts_write_own     ON public.posts FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY comments_select_auth ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_write_own   ON public.comments FOR ALL   TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY replies_select_auth ON public.comment_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY replies_write_own   ON public.comment_replies FOR ALL   TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- likes: conteos/estado legibles por logueados; cada quien crea/borra los suyos.
CREATE POLICY plikes_select_auth  ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY plikes_write_own    ON public.post_likes FOR ALL   TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY clikes_select_auth  ON public.comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY clikes_write_own    ON public.comment_likes FOR ALL   TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- NOTA sobre storage: `avatars` y `covers` se usan como buckets de Storage
-- (supabase.storage.from(...)), no como tablas. Sus permisos se configuran en
-- Storage → Policies, no aquí.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- ROLLBACK DE EMERGENCIA (si algo se rompe, desactiva RLS y diagnostica):
--   ALTER TABLE public.<tabla> DISABLE ROW LEVEL SECURITY;
-- Para ver políticas activas:
--   SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public' ORDER BY tablename;
-- ============================================================================

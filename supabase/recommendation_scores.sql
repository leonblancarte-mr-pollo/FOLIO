-- Tabla para materializar las recomendaciones colaborativas (Matrix
-- Factorization / SVD híbrido) que calcula scripts/train_recommender.py.
--
-- El endpoint api/recommendations.js SOLO lee esta tabla (nunca ejecuta
-- Python ni carga un modelo) — el job de entrenamiento (GitHub Actions,
-- cron diario) la reescribe con upsert usando la service_role key.
--
-- Correr una sola vez en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS public.recommendation_scores (
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id          uuid        NOT NULL REFERENCES public.books_curated(id) ON DELETE CASCADE,
  predicted_rating numeric(3,2) NOT NULL,
  reason           text,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS recommendation_scores_user_idx
  ON public.recommendation_scores (user_id, predicted_rating DESC);

ALTER TABLE public.recommendation_scores ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede leer sus propias recomendaciones. La escritura
-- (upsert desde el job de entrenamiento) usa la service_role key, que
-- ignora RLS por diseño — no hace falta una política de INSERT/UPDATE
-- para "authenticated".
CREATE POLICY recscores_select_own ON public.recommendation_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Verificación rápida después de la primera corrida del job:
-- SELECT user_id, COUNT(*) FROM recommendation_scores GROUP BY user_id;

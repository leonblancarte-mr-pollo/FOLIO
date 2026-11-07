-- Collages: 4 sets nuevos (2026-11-07). LO CORRE LEÓN en el SQL Editor de Supabase; no se ejecuta desde la app.
-- Para quien YA corrió supabase/collages_mvp_2026-11-06.sql: da de alta solo los sets nuevos en collage_sets
-- (el servidor valida la compra con gemas y la tirada de racha contra esa tabla; sin estas filas, «Floritas» y
-- «Vieja escuela» no se pueden comprar y «Sin señal» no sale en las tiradas). «Subrayado» es inicial: la app
-- ya lo muestra sin SQL, pero se agrega para que el servidor lo conozca.
-- Es seguro y se puede correr más de una vez (ON CONFLICT). Solo toca collage_sets; no borra ni cambia lo existente.
-- (Si corres el archivo grande completo otra vez, ya incluye estos sets: no hace falta este.)

INSERT INTO public.collage_sets (id, nombre, obtencion, precio, activo) VALUES
  ('marcador', 'Subrayado',     'inicial', NULL, true),
  ('cables',   'Sin señal',     'racha',   NULL, true),
  ('flores',   'Floritas',      'gemas',   100,  true),
  ('tatuaje',  'Vieja escuela', 'gemas',   100,  true)
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre, obtencion = EXCLUDED.obtencion, precio = EXCLUDED.precio, activo = EXCLUDED.activo;

-- Comprobación (debe listar 15 filas, las 4 nuevas activas):
-- SELECT id, nombre, obtencion, precio, activo FROM public.collage_sets ORDER BY obtencion, id;

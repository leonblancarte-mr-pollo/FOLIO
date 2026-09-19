// Zonas fijas de CDMX para el Trueque de libros. Los slugs son idénticos al enum
// public.exchange_zone de supabase/trueque_schema.sql: si agregas una zona aquí,
// agrégala también al enum (ALTER TYPE public.exchange_zone ADD VALUE '...').
const ZONES_CDMX = [
  { slug: "roma", label: "Roma" },
  { slug: "condesa", label: "Condesa" },
  { slug: "del_valle", label: "Del Valle" },
  { slug: "narvarte", label: "Narvarte" },
  { slug: "polanco", label: "Polanco" },
  { slug: "anzures", label: "Anzures" },
  { slug: "san_rafael", label: "San Rafael" },
  { slug: "escandon", label: "Escandón" },
  { slug: "juarez", label: "Juárez" },
  { slug: "centro", label: "Centro" },
  { slug: "coyoacan", label: "Coyoacán" },
  { slug: "cu_copilco", label: "CU/Copilco" },
  { slug: "coapa", label: "Coapa" },
  { slug: "xochimilco", label: "Xochimilco" },
  { slug: "santa_fe", label: "Santa Fe" },
  { slug: "alvaro_obregon", label: "Álvaro Obregón" },
  { slug: "tlalpan", label: "Tlalpan" },
  { slug: "interlomas", label: "Interlomas" },
  { slug: "napoles", label: "Nápoles" },
  { slug: "portales", label: "Portales" },
  { slug: "doctores", label: "Doctores" },
  { slug: "iztapalapa", label: "Iztapalapa" },
  { slug: "azcapotzalco", label: "Azcapotzalco" },
  { slug: "tacubaya", label: "Tacubaya" },
  { slug: "mixcoac", label: "Mixcoac" },
];

const ZONE_LABELS = Object.fromEntries(ZONES_CDMX.map((z) => [z.slug, z.label]));

function zoneLabel(slug) {
  return ZONE_LABELS[slug] || slug;
}

export { ZONES_CDMX, ZONE_LABELS, zoneLabel };

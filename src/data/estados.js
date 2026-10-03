// Los 32 estados de México para el Trueque (estado obligatorio, Trueque v2).
// `clave` = ISO 3166-2:MX sin el prefijo "MX-". Las claves son idénticas a la lista de
// public.trueque_valid_state() en supabase/trueque_geo.sql: si cambias una, cambia la otra.
// `lat`/`lng` = centro aproximado (la capital) para centrar el mapa; no se guarda en ningún lado.
const ESTADOS = [
  { clave: "AGU", nombre: "Aguascalientes", lat: 21.88, lng: -102.29 },
  { clave: "BCN", nombre: "Baja California", lat: 32.62, lng: -115.45 },
  { clave: "BCS", nombre: "Baja California Sur", lat: 24.14, lng: -110.31 },
  { clave: "CAM", nombre: "Campeche", lat: 19.85, lng: -90.53 },
  { clave: "CHP", nombre: "Chiapas", lat: 16.75, lng: -93.12 },
  { clave: "CHH", nombre: "Chihuahua", lat: 28.63, lng: -106.07 },
  { clave: "CMX", nombre: "Ciudad de México", lat: 19.43, lng: -99.13 },
  { clave: "COA", nombre: "Coahuila", lat: 25.42, lng: -101.0 },
  { clave: "COL", nombre: "Colima", lat: 19.24, lng: -103.72 },
  { clave: "DUR", nombre: "Durango", lat: 24.02, lng: -104.66 },
  { clave: "GUA", nombre: "Guanajuato", lat: 21.02, lng: -101.26 },
  { clave: "GRO", nombre: "Guerrero", lat: 17.55, lng: -99.5 },
  { clave: "HID", nombre: "Hidalgo", lat: 20.1, lng: -98.76 },
  { clave: "JAL", nombre: "Jalisco", lat: 20.67, lng: -103.35 },
  { clave: "MEX", nombre: "Estado de México", lat: 19.29, lng: -99.66 },
  { clave: "MIC", nombre: "Michoacán", lat: 19.7, lng: -101.19 },
  { clave: "MOR", nombre: "Morelos", lat: 18.92, lng: -99.23 },
  { clave: "NAY", nombre: "Nayarit", lat: 21.5, lng: -104.89 },
  { clave: "NLE", nombre: "Nuevo León", lat: 25.69, lng: -100.32 },
  { clave: "OAX", nombre: "Oaxaca", lat: 17.07, lng: -96.72 },
  { clave: "PUE", nombre: "Puebla", lat: 19.04, lng: -98.21 },
  { clave: "QUE", nombre: "Querétaro", lat: 20.59, lng: -100.39 },
  { clave: "ROO", nombre: "Quintana Roo", lat: 18.5, lng: -88.3 },
  { clave: "SLP", nombre: "San Luis Potosí", lat: 22.15, lng: -100.98 },
  { clave: "SIN", nombre: "Sinaloa", lat: 24.8, lng: -107.39 },
  { clave: "SON", nombre: "Sonora", lat: 29.07, lng: -110.96 },
  { clave: "TAB", nombre: "Tabasco", lat: 17.99, lng: -92.93 },
  { clave: "TAM", nombre: "Tamaulipas", lat: 23.74, lng: -99.15 },
  { clave: "TLA", nombre: "Tlaxcala", lat: 19.32, lng: -98.24 },
  { clave: "VER", nombre: "Veracruz", lat: 19.54, lng: -96.91 },
  { clave: "YUC", nombre: "Yucatán", lat: 20.97, lng: -89.62 },
  { clave: "ZAC", nombre: "Zacatecas", lat: 22.77, lng: -102.58 },
];

// Clave de Ciudad de México (centro por defecto del mapa). Desde Trueque v3 ya no hay zonas fijas.
const CDMX = "CMX";

const ESTADOS_BY_CLAVE = Object.fromEntries(ESTADOS.map((e) => [e.clave, e]));

function estadoNombre(clave) {
  return ESTADOS_BY_CLAVE[clave]?.nombre || clave || "";
}

// Centro para el mapa; CDMX si no hay estado.
function estadoCentro(clave) {
  const e = ESTADOS_BY_CLAVE[clave] || ESTADOS_BY_CLAVE[CDMX];
  return [e.lat, e.lng];
}

export { ESTADOS, CDMX, estadoNombre, estadoCentro };

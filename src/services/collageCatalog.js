// ============ COLLAGES: CATÁLOGO Y MOTOR DE PREMIOS (2026-11-06) ============
// El catálogo es DATOS (src/data/collage-catalog.json). Este módulo solo lo lee y lo resuelve:
// cada objeto hereda la forma de obtención de su set salvo que declare la suya.
// El motor de premios (`tirarPremio`) es puro y es el ESPEJO de la RPC collage_streak_roll
// (supabase/collages_mvp_2026-11-06.sql): el servidor manda; el cliente solo lo usa en «modo local»
// (antes de correr el SQL) y para explicar las reglas en la interfaz.
import catalogo from "../data/collage-catalog.json";

const OBTENCIONES = ["inicial", "racha", "gemas", "plus"];

const SETS = catalogo.sets.map((s) => ({ ...s, obtencion: { ...s.obtencion } }));
const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));

const OBJETOS = catalogo.objetos.map((o) => ({
  ...o,
  obtencion: o.obtencion ? { ...o.obtencion } : { ...(SET_BY_ID[o.set]?.obtencion || { tipo: "inicial" }) },
}));
const OBJETO_BY_ID = Object.fromEntries(OBJETOS.map((o) => [o.id, o]));

const ESTILOS_FRASE = catalogo.estilosFrase;
const COLORES_FONDO = catalogo.coloresFondo;
const RECOMPENSAS = catalogo.recompensas;
const LIMITES = catalogo.limites;
const LIENZO = catalogo.lienzo;

// Validación ligera al cargar (solo avisa en consola: un catálogo mal escrito no debe tumbar la app).
if (import.meta.env?.DEV) {
  SETS.forEach((s) => {
    if (!OBTENCIONES.includes(s.obtencion?.tipo)) console.warn(`[collage] set «${s.id}» con obtención inválida`, s.obtencion);
    if (s.obtencion?.tipo === "gemas" && !(s.obtencion.precio > 0)) console.warn(`[collage] set «${s.id}» de gemas sin precio`);
    if (!OBJETO_BY_ID[s.muestra]) console.warn(`[collage] set «${s.id}»: la muestra «${s.muestra}» no existe`);
  });
  OBJETOS.forEach((o) => { if (!SET_BY_ID[o.set]) console.warn(`[collage] objeto «${o.id}» apunta a un set inexistente «${o.set}»`); });
}

const getSets = () => SETS;
const getSet = (id) => SET_BY_ID[id] || null;
const getObjeto = (id) => OBJETO_BY_ID[id] || null;
const objetosDeSet = (setId, categoria) => OBJETOS.filter((o) => o.set === setId && (!categoria || o.categoria === categoria));
const objetosPorCategoria = (categoria) => OBJETOS.filter((o) => o.categoria === categoria);
const getEstiloFrase = (id) => ESTILOS_FRASE.find((e) => e.id === id) || ESTILOS_FRASE[0];
const siguienteEstiloFrase = (id) => {
  const i = ESTILOS_FRASE.findIndex((e) => e.id === id);
  return ESTILOS_FRASE[(i + 1) % ESTILOS_FRASE.length];
};
const altoFormato = (formato) => (LIENZO.formatos[formato] || LIENZO.formatos[LIENZO.formatoInicial]).alto;

// ¿Puede usar este objeto? estado = { sets: Set<string> (inventario), plus: boolean }.
// El inventario es permanente: un set desbloqueado no se consume nunca.
function objetoDesbloqueado(objeto, estado) {
  if (!objeto) return false;
  const tipo = objeto.obtencion?.tipo;
  if (tipo === "inicial") return true;
  if (tipo === "plus") return !!estado?.plus;
  // racha y gemas: los da el inventario; un objeto con obtención propia se desbloquea con su set.
  return !!estado?.sets?.has(objeto.set);
}
function setDesbloqueado(set, estado) {
  if (!set) return false;
  const tipo = set.obtencion?.tipo;
  if (tipo === "inicial") return true;
  if (tipo === "plus") return !!estado?.plus;
  return !!estado?.sets?.has(set.id);
}

// Probabilidad de la próxima tirada según los fallos seguidos (espejo del SQL).
function probabilidadPremio(fallosSeguidos, cfg = RECOMPENSAS) {
  return Math.min(1, cfg.probabilidadInicial + (cfg.incrementoPorFallo || 0) * (fallosSeguidos || 0));
}

// Motor puro. candidatos = ids de sets de racha que aún no tiene. rng() ∈ [0, 1).
// Devuelve { resultado: 'premio'|'sin_premio'|'sin_candidatos', setId?, fallosSeguidos, probabilidad }.
function tirarPremio({ fallosSeguidos = 0, candidatos = [], rng = Math.random, cfg = RECOMPENSAS }) {
  if (!candidatos.length) return { resultado: "sin_candidatos", fallosSeguidos, probabilidad: 0 };
  const p = probabilidadPremio(fallosSeguidos, cfg);
  const gana = fallosSeguidos >= cfg.maxSinPremio || rng() < p;
  if (gana) {
    const setId = candidatos[Math.floor(rng() * candidatos.length) % candidatos.length];
    return { resultado: "premio", setId, fallosSeguidos: 0, probabilidad: p };
  }
  return { resultado: "sin_premio", fallosSeguidos: fallosSeguidos + 1, probabilidad: p };
}

// Sets que se pueden ganar con la racha y que el usuario todavía no tiene.
function candidatosRacha(estado) {
  return SETS.filter((s) => s.obtencion?.tipo === "racha" && !estado?.sets?.has(s.id)).map((s) => s.id);
}

export {
  getSets, getSet, getObjeto, objetosDeSet, objetosPorCategoria, getEstiloFrase, siguienteEstiloFrase, altoFormato,
  objetoDesbloqueado, setDesbloqueado, probabilidadPremio, tirarPremio, candidatosRacha,
  ESTILOS_FRASE, COLORES_FONDO, RECOMPENSAS, LIMITES, LIENZO, OBTENCIONES,
};

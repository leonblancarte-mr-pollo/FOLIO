import textoAlmohadon from "./cuentos/el-almohadon-de-plumas.txt?raw";
import textoCorazon from "./cuentos/el-corazon-delator.txt?raw";
import textoGato from "./cuentos/el-gato-negro.txt?raw";
import textoCollar from "./cuentos/el-collar.txt?raw";
import textoHoguera from "./cuentos/encender-una-hoguera.txt?raw";
import textoAsesinos from "./cuentos/los-asesinos.txt?raw";
import textoPerrito from "./cuentos/la-dama-del-perrito.txt?raw";

export const CUENTOS = [
  {
    id: "almohadon-de-plumas",
    titulo: "El almohadón de plumas",
    autor: "Horacio Quiroga",
    generos: ["terror", "romance"],
    duracion: "8 min",
    duracion_minutos: 8,
    desc: "Una historia de amor con un secreto perturbador.",
    palabras: 800,
    texto: textoAlmohadon,
  },
  {
    id: "el-corazon-delator",
    titulo: "El corazón delator",
    autor: "Edgar Allan Poe",
    generos: ["terror", "misterio"],
    duracion: "12 min",
    duracion_minutos: 12,
    desc: "Un asesino que oye lo que no puede escuchar.",
    palabras: 1800,
    texto: textoCorazon,
  },
  {
    id: "el-gato-negro",
    titulo: "El gato negro",
    autor: "Edgar Allan Poe",
    generos: ["terror", "misterio"],
    duracion: "18 min",
    duracion_minutos: 18,
    desc: "El horror que vive dentro de uno mismo.",
    palabras: 3200,
    texto: textoGato,
  },
  {
    id: "el-collar",
    titulo: "El collar",
    autor: "Guy de Maupassant",
    generos: ["romance", "drama"],
    duracion: "15 min",
    duracion_minutos: 15,
    desc: "Una noche de baile. Una joya perdida. Una vida entera.",
    palabras: 2400,
    texto: textoCollar,
  },
  {
    id: "encender-una-hoguera",
    titulo: "Encender una hoguera",
    autor: "Jack London",
    generos: ["aventura", "naturaleza"],
    duracion: "35 min",
    duracion_minutos: 35,
    desc: "Un hombre solo contra el invierno del Yukón.",
    palabras: 6500,
    texto: textoHoguera,
  },
  {
    id: "los-asesinos",
    titulo: "Los asesinos",
    autor: "Ernest Hemingway",
    generos: ["aventura", "drama"],
    duracion: "12 min",
    duracion_minutos: 12,
    desc: "Puro diálogo. Pura tensión. Como una película.",
    palabras: 2000,
    texto: textoAsesinos,
  },
  {
    id: "la-dama-del-perrito",
    titulo: "La dama del perrito",
    autor: "Antón Chéjov",
    generos: ["romance", "filosofia"],
    duracion: "30 min",
    duracion_minutos: 30,
    desc: "El amor que aparece cuando ya no lo esperabas.",
    palabras: 5800,
    texto: textoPerrito,
  },
];

export const CUENTOS_MAP = Object.fromEntries(CUENTOS.map(c => [c.id, c]));

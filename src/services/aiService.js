import { supabase } from "../supabase.js";
import { STATUS_LABELS } from "./booksService.js";

// ============ IA (proxy /api/anthropic) ============
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Debes iniciar sesión de nuevo para usar esta función.");
  return { Authorization: `Bearer ${token}` };
}

async function enrichBook(title, author) {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Para el libro "${title}" de ${author}, responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "genre": "género principal en español, en una palabra o dos máximo (ej: terror, filosofía, novela, ensayo, ficción, ciencia ficción, romance, biografía, desarrollo personal, poesía, historia, autoayuda, fantasía, etc.)",
  "summary": "resumen breve de 2-3 oraciones en español, sin spoilers grandes",
  "moodTags": ["3-5 etiquetas de mood en español, ej: contemplativo, intenso, ligero, melancólico"]
}

Si no conoces el libro con seguridad, haz tu mejor estimación basada en el título y autor.`,
        },
      ],
    }),
  });
  if (response.status === 429) {
    throw new Error("Estamos recibiendo muchas solicitudes ahora mismo. Intenta de nuevo en un minuto.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.content)) {
    throw new Error("No se pudo obtener la información del libro. Intenta de nuevo.");
  }
  const text = data.content.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function getMoodRecommendations(books, moodAnswers) {
  const readBooks = books.filter((b) => b.status === "read");
  const availableBooks = books.filter((b) => b.status !== "read");

  const tasteSection =
    readBooks.length > 0
      ? "LIBROS QUE EL USUARIO YA LEYÓ (úsalos para entender sus gustos, NO los recomiendes):\n" +
        readBooks
          .map(
            (b) =>
              `- "${b.title}" por ${b.author}${b.rating ? ` — calificación: ${b.rating}/5` : ""}${
                b.genre ? ` [${b.genre}]` : ""
              }${b.review ? ` — Reseña: "${b.review.slice(0, 200)}"` : ""}`
          )
          .join("\n")
      : "(Aún no ha marcado libros como leídos. Basa las recomendaciones en su mood y en lo que tiene en su biblioteca.)";

  const availableSection =
    availableBooks.length > 0
      ? "LIBROS DISPONIBLES PARA RECOMENDAR DE SU BIBLIOTECA:\n" +
        availableBooks
          .map(
            (b) =>
              `- "${b.title}" por ${b.author} [${STATUS_LABELS[b.status]}]${
                b.rating ? ` (calif. tentativa: ${b.rating}/5)` : ""
              }${b.genre ? ` [${b.genre}]` : ""}${b.summary ? ` — ${b.summary}` : ""}`
          )
          .join("\n")
      : "(El usuario no tiene libros pendientes en su biblioteca.)";

  const prompt = `Eres un recomendador de libros perspicaz y cálido. Conoces literatura clásica, contemporánea, en español y otros idiomas, ficción y no ficción.

${tasteSection}

${availableSection}

EL MOOD ACTUAL DEL USUARIO:
- Cómo se siente: ${moodAnswers.mood}
- Tipo de sesión deseada: ${moodAnswers.time}
- Nivel de desafío: ${moodAnswers.challenge}
- Zona de confort: ${moodAnswers.openness}
${moodAnswers.extra ? `- Algo adicional: ${moodAnswers.extra}` : ""}

Tu trabajo es recomendar dos grupos de libros:

1. **fromLibrary**: 2-3 libros de su biblioteca disponible (de la lista DISPONIBLES). NUNCA recomiendes libros que ya leyó (los listados en LEÍDOS). Si no hay libros disponibles, deja el array vacío.

2. **newSuggestions**: 2-3 libros NUEVOS que NO están en su biblioteca y que NO ha leído. Basa las sugerencias en sus gustos demostrados y su mood actual. TEN MUY EN CUENTA la zona de confort: si quiere algo parecido a lo que le ha gustado, quédate dentro de sus géneros y estilos habituales; si quiere salir de su zona, propón algo genuinamente diferente o inesperado para él.

Para cada recomendación explica en 2-3 oraciones por qué encaja, conectando con su mood o con sus lecturas previas. Habla de tú al usuario, en tono cálido y literario, sin clichés.

Responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "fromLibrary": [
    { "title": "título exacto del libro", "author": "autor", "reason": "por qué encaja" }
  ],
  "newSuggestions": [
    { "title": "título", "author": "autor", "genre": "género en una palabra", "summary": "resumen breve de 1-2 oraciones", "reason": "por qué encaja según sus gustos y mood" }
  ]
}`;

  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (response.status === 429) {
    throw new Error("Estamos recibiendo muchas solicitudes ahora mismo. Intenta de nuevo en un minuto.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.content)) {
    throw new Error("No se pudieron generar recomendaciones. Intenta de nuevo.");
  }
  const text = data.content.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}


export { enrichBook, getMoodRecommendations };

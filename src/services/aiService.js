import { supabase } from "../supabase.js";
import { STATUS_LABELS } from "./booksService.js";

// ============ IA (proxy /api/anthropic) ============

// Error con «tipo» para que la interfaz (el gato de «Para ti») diga algo útil y distinto según
// la causa, en vez de un «se me trabó algo» para todo (ronda 3, 2026-11-02).
//   kind: "network" (sin red / proxy caído) · "timeout" · "session" (el proxy no aceptó la sesión)
//         · "rate" (429) · "config" (el servidor no tiene clave válida de Anthropic)
//         · "upstream" (otro error del proxy o de Anthropic) · "parse" (la respuesta no era JSON)
class AiError extends Error {
  constructor(message, kind, status = 0) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
    this.status = status;
  }
}
const AI_TIMEOUT_MS = 60000;

async function callAnthropic(body, fallbackMessage) {
  let response;
  try {
    response = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new AiError("La IA tardó demasiado en responder. Intenta de nuevo.", "timeout");
    }
    throw new AiError("Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.", "network");
  }
  const data = await response.json().catch(() => null);
  if (response.status === 429) {
    throw new AiError("Estamos recibiendo muchas solicitudes ahora mismo. Intenta de nuevo en un minuto.", "rate", 429);
  }
  if (!response.ok || !Array.isArray(data?.content)) {
    // El proxy contesta { error: "texto" }; Anthropic contesta { type: "error", error: { type, message } }.
    const proxyMsg = typeof data?.error === "string" ? data.error : "";
    const upstreamType = typeof data?.error === "object" ? data?.error?.type : "";
    const upstreamMsg = typeof data?.error === "object" ? data?.error?.message : "";
    let kind = "upstream";
    if (/ANTHROPIC_API_KEY/i.test(proxyMsg) || upstreamType === "authentication_error" || upstreamType === "permission_error") kind = "config";
    else if (response.status === 401) kind = "session";
    const err = new AiError(fallbackMessage, kind, response.status);
    err.detail = proxyMsg || (upstreamType ? `${upstreamType}: ${upstreamMsg}` : "") || `HTTP ${response.status}`;
    throw err;
  }
  const text = data.content.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const err = new AiError("La IA respondió algo que no se pudo leer. Intenta de nuevo.", "parse", response.status);
    err.detail = clean.slice(0, 120);
    throw err;
  }
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new AiError("Debes iniciar sesión de nuevo para usar esta función.", "session", 401);
  return { Authorization: `Bearer ${token}` };
}

async function enrichBook(title, author) {
  return callAnthropic(
    {
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
    },
    "No se pudo obtener la información del libro. Intenta de nuevo."
  );
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

Para cada recomendación, "reason" son 1 o 2 oraciones cortas (máximo 40 palabras) que digan por qué encaja, conectando con lo que pidió o con lo que ya leyó. Escribe como un compa de 23 años que recomienda un libro a un amigo: directo, palabras de diario, de tú. Prohibido: tono de coach, palabras rimbombantes y las palabras "mood", "resonar", "estado de ánimo", "perfecto", "viaje", "sumergirte".

Responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "fromLibrary": [
    { "title": "título exacto del libro", "author": "autor", "reason": "por qué encaja" }
  ],
  "newSuggestions": [
    { "title": "título", "author": "autor", "genre": "género en una palabra", "summary": "resumen breve de 1-2 oraciones", "reason": "por qué encaja según sus gustos y mood" }
  ]
}`;

  return callAnthropic(
    { max_tokens: 2000, messages: [{ role: "user", content: prompt }] },
    "No se pudieron generar recomendaciones. Intenta de nuevo."
  );
}


export { enrichBook, getMoodRecommendations, AiError };

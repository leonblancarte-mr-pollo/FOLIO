import { supabase } from "../supabase.js";

// Nombres de mes en español (también los usa la UI: heatmap y Wrapped).
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ============ WRAPPED (mensual / anual) ============
// Si falla la lectura principal (libros del periodo) se lanza y NO se guarda nada: antes un
// fallo de red generaba y persistía un Wrapped vacío. Las lecturas secundarias degradan a 0
// con console.error. Devuelven la fila de monthly_wraps (snake_case: month, year, wrap_type).
function checkWrapQueries(label, [booksRes, ...rest]) {
  if (booksRes.error) throw booksRes.error;
  rest.forEach((r) => { if (r.error) console.error(`[wrapped] ${label}:`, r.error.message); });
}

function pickWrapPhrase(bookCount, currentStreak, isBestPeriod, isAnnual) {
  const period = isAnnual ? "año" : "mes";
  let base;
  if (bookCount === 0)       base = `El próximo ${period} es tuyo. Un libro a la vez.`;
  else if (bookCount <= 2)   base = "Cada página cuenta. Vas construyendo el hábito.";
  else if (bookCount <= 5)   base = `¡Buen ${period}! Estás encontrando tu ritmo.`;
  else if (bookCount <= 10)  base = `${isAnnual ? "Año" : "Mes"} sólido. Eres un lector constante.`;
  else                       base = `¡${isAnnual ? "Año" : "Mes"} extraordinario! Eres una máquina lectora.`;
  const extras = [];
  if (currentStreak > 7) extras.push(`Tu racha de ${currentStreak} días habla de tu disciplina.`);
  if (isBestPeriod)      extras.push(`¡Tu mejor ${period} hasta ahora!`);
  return [base, ...extras].join(" ");
}

async function generateMonthWrap(userId, month, year) {
  const startISO = new Date(year, month - 1, 1).toISOString();
  const endISO   = new Date(year, month, 1).toISOString();
  const prevM    = month === 1 ? 12 : month - 1;
  const prevY    = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevY, prevM - 1, 1).toISOString();
  const prevEnd   = new Date(prevY, prevM, 1).toISOString();

  const monthResults = await Promise.all([
    supabase.from("books").select("id,title,author,cover_url,rating,genre,finished_at")
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", startISO).lt("finished_at", endISO),
    supabase.from("reading_logs").select("pages_read,logged_at")
      .eq("user_id", userId).gte("logged_at", startISO).lt("logged_at", endISO),
    supabase.from("achievements").select("achievement_key,unlocked_at")
      .eq("user_id", userId).gte("unlocked_at", startISO).lt("unlocked_at", endISO),
    supabase.from("books").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", prevStart).lt("finished_at", prevEnd),
  ]);
  checkWrapQueries("mensual", monthResults);
  const [{ data: booksData }, { data: logsData }, { data: achData }, { count: prevCount }] = monthResults;

  const books = booksData || [];
  const logs  = logsData  || [];
  const totalPages = logs.reduce((s, l) => s + (l.pages_read || 0), 0);

  const genreCount = {};
  books.forEach(b => { if (b.genre) genreCount[b.genre] = (genreCount[b.genre] || 0) + 1; });
  const topGenre = Object.keys(genreCount).sort((a, b) => genreCount[b] - genreCount[a])[0] || null;
  const favoriteBook = [...books].filter(b => b.rating > 0).sort((a, b) => b.rating - a.rating)[0] || null;

  // Best month check: compare to best previous month
  const { data: allPrevBooks } = await supabase.from("books").select("finished_at")
    .eq("user_id", userId).eq("status", "read").not("finished_at", "is", null).lt("finished_at", startISO);
  const prevMonthCounts = {};
  (allPrevBooks || []).forEach(b => { const k = b.finished_at.slice(0, 7); prevMonthCounts[k] = (prevMonthCounts[k] || 0) + 1; });
  const bestPrevMonth = Math.max(0, ...Object.values(prevMonthCounts).concat(0));
  const isBestMonth = books.length > 0 && books.length > bestPrevMonth;

  const { data: streakRowM } = await supabase.from("user_streaks").select("current_streak").eq("user_id", userId).maybeSingle();
  const aiPhrase = pickWrapPhrase(books.length, streakRowM?.current_streak || 0, isBestMonth, false);

  const data = {
    booksRead: books.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.cover_url, rating: b.rating, genre: b.genre })),
    totalPages, topGenre,
    favoriteBook: favoriteBook ? { title: favoriteBook.title, author: favoriteBook.author, coverUrl: favoriteBook.cover_url, rating: favoriteBook.rating } : null,
    prevMonthBooks: prevCount || 0,
    unlockedAchievements: (achData || []).map(a => a.achievement_key),
    aiPhrase,
  };

  const { data: saved, error: saveErr } = await supabase.from("monthly_wraps").upsert(
    { user_id: userId, month, year, wrap_type: "monthly", data },
    { onConflict: "user_id,month,year,wrap_type" }
  ).select().single();
  if (saveErr) console.error("[wrapped] no se pudo guardar el Wrapped mensual:", saveErr.message);
  return saved || { user_id: userId, month, year, wrap_type: "monthly", data };
}

async function generateAnnualWrap(userId, year) {
  const startISO = new Date(year, 0, 1).toISOString();
  const endISO   = new Date(year + 1, 0, 1).toISOString();
  const prevStart = new Date(year - 1, 0, 1).toISOString();
  const prevEnd   = new Date(year, 0, 1).toISOString();

  const yearResults = await Promise.all([
    supabase.from("books").select("id,title,author,cover_url,rating,genre,finished_at")
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", startISO).lt("finished_at", endISO),
    supabase.from("reading_logs").select("pages_read,logged_at")
      .eq("user_id", userId).gte("logged_at", startISO).lt("logged_at", endISO),
    supabase.from("books").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "read")
      .gte("finished_at", prevStart).lt("finished_at", prevEnd),
  ]);
  checkWrapQueries("anual", yearResults);
  const [{ data: booksData }, { data: logsData }, { count: prevCount }] = yearResults;

  const books = booksData || [];
  const logs  = logsData  || [];
  const totalPages = logs.reduce((s, l) => s + (l.pages_read || 0), 0);

  const genreCount = {};
  books.forEach(b => { if (b.genre) genreCount[b.genre] = (genreCount[b.genre] || 0) + 1; });
  const topGenre = Object.keys(genreCount).sort((a, b) => genreCount[b] - genreCount[a])[0] || null;
  const top3 = [...books].filter(b => b.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 3);

  // Most active month: count books per month
  const monthCounts = Array(12).fill(0);
  books.forEach(b => {
    if (b.finished_at) {
      const m = new Date(b.finished_at).getMonth();
      if (m >= 0 && m < 12) monthCounts[m]++;
    }
  });
  const mostActiveMonthIdx = monthCounts.indexOf(Math.max(...monthCounts));
  const mostActiveMonth = MONTHS_ES[mostActiveMonthIdx] || "";

  const { data: streakRow } = await supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle();

  // Best year check
  const { data: allPrevYearBooks } = await supabase.from("books").select("finished_at")
    .eq("user_id", userId).eq("status", "read").not("finished_at", "is", null).lt("finished_at", startISO);
  const prevYearCounts = {};
  (allPrevYearBooks || []).forEach(b => { const k = b.finished_at.slice(0, 4); prevYearCounts[k] = (prevYearCounts[k] || 0) + 1; });
  const bestPrevYear = Math.max(0, ...Object.values(prevYearCounts).concat(0));
  const isBestYear = books.length > 0 && books.length > bestPrevYear;

  const aiPhrase = pickWrapPhrase(books.length, streakRow?.current_streak || 0, isBestYear, true);

  const data = {
    booksRead: books.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.cover_url, rating: b.rating, genre: b.genre })),
    totalPages, topGenre,
    top3Books: top3.map(b => ({ title: b.title, author: b.author, coverUrl: b.cover_url, rating: b.rating })),
    mostActiveMonth, longestStreak: streakRow?.longest_streak || 0,
    prevYearBooks: prevCount || 0, aiPhrase,
  };

  const { data: saved, error: saveErr } = await supabase.from("monthly_wraps").upsert(
    { user_id: userId, month: null, year, wrap_type: "annual", data },
    { onConflict: "user_id,month,year,wrap_type" }
  ).select().single();
  if (saveErr) console.error("[wrapped] no se pudo guardar el Wrapped anual:", saveErr.message);
  return saved || { user_id: userId, month: null, year, wrap_type: "annual", data };
}


export { MONTHS_ES, generateMonthWrap, generateAnnualWrap };

import { supabase } from "../supabase.js";
import { playAchievementSound } from "../sounds.js";
import { haptic, HAPTIC } from "../haptics.js";

// ============ DEFINICIONES (espejo de award_achievement en SQL) ============
// ⚠️ La condición real de cada logro vive duplicada: aquí (candidatos) y en la
// RPC award_achievement (security_patch_achievements.sql). Cambiar ambos a la vez.
const ACHIEVEMENT_DEFS = [
  // Lectura
  { key: "first_book_added",  name: "Primera página",      desc: "Agregaste tu primer libro",                        emoji: "📖", cat: "Lectura"  },
  { key: "first_book_read",   name: "Lector nato",          desc: "Terminaste tu primer libro",                       emoji: "✅", cat: "Lectura"  },
  { key: "first_review",      name: "Crítico",              desc: "Escribiste tu primera reseña",                     emoji: "✍️", cat: "Lectura"  },
  { key: "rated_5_books",     name: "Bibliófilo",           desc: "Calificaste 5 libros",                             emoji: "⭐", cat: "Lectura"  },
  { key: "marathon_reader",   name: "Maratón",              desc: "Leíste 3 libros en un mes",                        emoji: "🏃", cat: "Lectura"  },
  { key: "speed_reader",      name: "Velocista",            desc: "Leíste 5 libros en un mes",                        emoji: "⚡", cat: "Lectura"  },
  { key: "explorer",          name: "Explorador",           desc: "Leíste libros de 3 géneros distintos",             emoji: "🧭", cat: "Lectura"  },
  { key: "genre_master",      name: "Maestro",              desc: "Leíste libros de 5 géneros distintos",             emoji: "🎭", cat: "Lectura"  },
  { key: "collector_10",      name: "Coleccionista",        desc: "10 libros en tu biblioteca",                       emoji: "📚", cat: "Lectura"  },
  { key: "collector_50",      name: "Biblioteca",           desc: "50 libros en tu biblioteca",                       emoji: "🏛️", cat: "Lectura"  },
  // Sesiones
  { key: "first_log",         name: "Primer día",           desc: "Registraste tu primera sesión",                    emoji: "📅", cat: "Sesiones" },
  { key: "sessions_30",       name: "Café y letras",        desc: "30 sesiones registradas",                          emoji: "☕", cat: "Sesiones" },
  { key: "pages_100",         name: "Centurión",            desc: "100 páginas leídas",                               emoji: "💯", cat: "Sesiones" },
  { key: "pages_1000",        name: "Mil páginas",          desc: "1,000 páginas leídas",                             emoji: "🌟", cat: "Sesiones" },
  { key: "pages_10000",       name: "Leyenda",              desc: "10,000 páginas leídas",                            emoji: "👑", cat: "Sesiones" },
  { key: "big_session",       name: "Sin parar",            desc: "100+ páginas en una sola sesión",                  emoji: "📖", cat: "Sesiones" },
  { key: "night_owl",         name: "Búho",                 desc: "5 sesiones registradas después de las 10pm",       emoji: "🦉", cat: "Sesiones" },
  // Rachas
  { key: "streak_7",          name: "Racha de fuego",       desc: "7 días consecutivos leyendo",                      emoji: "🔥", cat: "Rachas"   },
  { key: "streak_30",         name: "Imparable",            desc: "30 días consecutivos leyendo",                     emoji: "💎", cat: "Rachas"   },
  { key: "streak_90",         name: "Trimestre lector",     desc: "90 días consecutivos",                             emoji: "🏅", cat: "Rachas"   },
  // Red social
  { key: "first_comment",     name: "Social",               desc: "Hiciste tu primer comentario",                     emoji: "💬", cat: "Social"   },
  { key: "comments_10",       name: "Conversador",          desc: "10 comentarios en total",                          emoji: "🗣️", cat: "Social"   },
  { key: "first_friend",      name: "Conector",             desc: "Agregaste tu primer amigo",                        emoji: "🤝", cat: "Social"   },
  { key: "friends_5",         name: "Popular",              desc: "Tienes 5 amigos en SEMA",                         emoji: "👥", cat: "Social"   },
  { key: "first_message",     name: "Mensajero",            desc: "Enviaste tu primer mensaje de chat",               emoji: "💌", cat: "Social"   },
  // Especiales
  { key: "top_reader",        name: "Top lector",           desc: "Leíste más que todos tus amigos este mes",         emoji: "🏆", cat: "Especial" },
  { key: "uam_book",          name: "Universitario lector", desc: "Agregaste un libro de la Biblioteca UAM",          emoji: "🎓", cat: "Especial" },
];

// ============ BUS + MOTOR ============
let _achievementListeners = [];
const achievementBus = {
  emit: (keys) => { if (keys.length > 0) _achievementListeners.forEach(fn => fn(keys)); },
  on: (fn) => {
    _achievementListeners.push(fn);
    return () => { _achievementListeners = _achievementListeners.filter(f => f !== fn); };
  },
};

const FEED_WORTHY_ACHIEVEMENTS = new Set([
  "streak_7", "streak_30", "streak_90", "speed_reader",
  "top_reader", "pages_1000", "pages_10000", "friends_5",
]);

async function checkAchievements(userId, userName, { silent = false } = {}) {
  try {
    // Early exit if achievements table doesn't exist yet
    const { data: alreadyUnlocked, error: achTableErr } = await supabase
      .from("achievements").select("achievement_key").eq("user_id", userId);
    if (achTableErr) {
      console.warn("[checkAchievements] no se pudo leer achievements:", achTableErr.message,
        "\n→ Verifica que corrieron auth_rls_migration.sql y security_patch_achievements.sql. No abras la escritura de achievements: solo la RPC award_achievement puede otorgar logros.");
      return [];
    }
    const unlockedSet = new Set((alreadyUnlocked || []).map(a => a.achievement_key));

    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthStr = monthStart.toISOString();

    // Books query without is_uam_book to avoid column-not-exists errors
    const [
      { data: books },
      { data: streak },
      { data: logs },
      { data: comments },
      { data: friendships },
      { data: messages },
    ] = await Promise.all([
      supabase.from("books").select("id,status,rating,review,genre,finished_at").eq("user_id", userId),
      supabase.from("user_streaks").select("current_streak,total_pages_read").eq("user_id", userId).maybeSingle(),
      supabase.from("reading_logs").select("id,pages_read,logged_at").eq("user_id", userId),
      supabase.from("comments").select("id").eq("user_id", userId),
      supabase.from("friendships").select("id").or(`user_id.eq.${userId},friend_id.eq.${userId}`).eq("status", "accepted"),
      supabase.from("messages").select("id").eq("sender_id", userId).limit(1),
    ]);

    const allBooks    = books || [];
    const allLogs     = logs  || [];
    const readBooks   = allBooks.filter(b => b.status === "read");
    const thisMonth   = readBooks.filter(b => b.finished_at && b.finished_at >= monthStr);
    const totalPages  = streak?.total_pages_read || 0;
    const curStreak   = streak?.current_streak   || 0;
    const genresRead  = new Set(readBooks.filter(b => b.genre).map(b => b.genre));

    // is_uam_book check — separate query so column-missing doesn't break everything
    let hasUamBook = false;
    const { count: uamCount, error: uamErr } = await supabase
      .from("books").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("is_uam_book", true);
    if (!uamErr) hasUamBook = (uamCount || 0) > 0;

    const checks = {
      first_book_added: allBooks.length >= 1,
      first_book_read:  readBooks.length >= 1,
      first_review:     allBooks.some(b => b.review && b.review.length > 10),
      rated_5_books:    allBooks.filter(b => b.rating > 0).length >= 5,
      marathon_reader:  thisMonth.length >= 3,
      speed_reader:     thisMonth.length >= 5,
      explorer:         genresRead.size >= 3,
      genre_master:     genresRead.size >= 5,
      collector_10:     allBooks.length >= 10,
      collector_50:     allBooks.length >= 50,
      first_log:        allLogs.length >= 1,
      sessions_30:      allLogs.length >= 30,
      pages_100:        totalPages >= 100,
      pages_1000:       totalPages >= 1000,
      pages_10000:      totalPages >= 10000,
      big_session:      allLogs.some(l => (l.pages_read || 0) >= 100),
      night_owl:        allLogs.filter(l => new Date(l.logged_at).getHours() >= 22).length >= 5,
      streak_7:         curStreak >= 7,
      streak_30:        curStreak >= 30,
      streak_90:        curStreak >= 90,
      first_comment:    (comments || []).length >= 1,
      comments_10:      (comments || []).length >= 10,
      first_friend:     (friendships || []).length >= 1,
      friends_5:        (friendships || []).length >= 5,
      first_message:    (messages || []).length >= 1,
      uam_book:         hasUamBook,
      top_reader:       unlockedSet.has("top_reader"),
    };

    // top_reader: expensive per-friend query
    if (!unlockedSet.has("top_reader") && thisMonth.length > 0) {
      const { data: fs } = await supabase.from("friendships")
        .select("user_id,friend_id").eq("status","accepted")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      const fids = (fs || []).map(f => f.user_id === userId ? f.friend_id : f.user_id);
      if (fids.length > 0) {
        let isTop = true;
        for (const fid of fids) {
          const { count } = await supabase.from("books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", fid).eq("status","read").gte("finished_at", monthStr);
          if ((count || 0) >= thisMonth.length) { isTop = false; break; }
        }
        checks.top_reader = isTop;
      }
    }

    const candidateKeys = Object.entries(checks)
      .filter(([k, v]) => v && !unlockedSet.has(k))
      .map(([k]) => k);

    if (candidateKeys.length === 0) return [];

    // El servidor revalida cada condición real antes de otorgar (RPC
    // SECURITY DEFINER); el cliente ya no puede insertar logros directo.
    const grantedKeys = [];
    for (const key of candidateKeys) {
      const { data: granted, error: rpcErr } = await supabase.rpc("award_achievement", { p_key: key });
      if (rpcErr) { console.error("[checkAchievements] award_achievement error:", key, rpcErr.message); continue; }
      if (granted) grantedKeys.push(key);
    }
    if (grantedKeys.length === 0) return [];

    // Auto feed post for notable achievements
    for (const key of grantedKeys) {
      if (FEED_WORTHY_ACHIEVEMENTS.has(key)) {
        const def = ACHIEVEMENT_DEFS.find(a => a.key === key);
        if (def) {
          const { error: postErr } = await supabase.from("posts").insert({
            user_id: userId, type: "achievement",
            content: `${def.emoji} "${def.name}" — ${def.desc}`,
          });
          if (postErr) console.error("[checkAchievements] no se pudo publicar el logro en el feed:", key, postErr.message);
        }
      }
    }

    console.log(`[checkAchievements] ✓ ${grantedKeys.length} nuevo(s): ${grantedKeys.join(", ")}`);
    if (!silent) {
      achievementBus.emit(grantedKeys);
      playAchievementSound(grantedKeys);
      if (grantedKeys.length > 0) {
        const isStreak = grantedKeys.some(k => ['streak_7','streak_30','streak_90'].includes(k));
        haptic(isStreak ? HAPTIC.STREAK_MILESTONE : HAPTIC.ACHIEVEMENT);
      }
    }
    return grantedKeys;
  } catch (err) {
    console.error("[checkAchievements] unexpected error:", err);
    return [];
  }
}


export { ACHIEVEMENT_DEFS, FEED_WORTHY_ACHIEVEMENTS, achievementBus, checkAchievements };

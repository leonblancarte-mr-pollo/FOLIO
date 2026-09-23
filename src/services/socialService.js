import { supabase } from "../supabase.js";
import { addPendingPost, getPendingPosts } from "./booksService.js";
import { devLog } from "./devLog.js";

// ============ MENSAJES / FEED / COMENTARIOS ============
// Excepción documentada a la convención camelCase (DOCUMENTACION_ARQUITECTURA.md §X):
// posts, comentarios y mensajes se devuelven como filas crudas de Supabase (snake_case)
// porque FeedView/ChatView/FriendsView las consumen tal cual en ~100 lugares.
// Las escrituras lanzan; las lecturas del feed lanzan si falla la query principal.
async function getOrCreateConversation(userId, friendId) {
  const { data: c1 } = await supabase
    .from("conversations").select("id")
    .eq("user1_id", userId).eq("user2_id", friendId).maybeSingle();
  if (c1) return c1.id;
  const { data: c2 } = await supabase
    .from("conversations").select("id")
    .eq("user1_id", friendId).eq("user2_id", userId).maybeSingle();
  if (c2) return c2.id;
  const [a, b] = [userId, friendId].sort();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user1_id: a, user2_id: b })
    .select("id").single();
  if (error) {
    const { data: r } = await supabase
      .from("conversations").select("id")
      .eq("user1_id", a).eq("user2_id", b).maybeSingle();
    return r?.id;
  }
  return data.id;
}

async function markConversationRead(conversationId, userId) {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

async function getUnreadMessagesCount(userId) {
  const { data: convs } = await supabase
    .from("conversations").select("id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  if (!convs || convs.length === 0) return 0;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convs.map((c) => c.id))
    .neq("sender_id", userId)
    .is("read_at", null);
  return count || 0;
}

// ============ FEED HELPERS ============
async function fetchFeed(userId) {
  const { data: fs } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  const friendIds = (fs || []).map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
  const allIds = [userId, ...friendIds];
  devLog("[fetchFeed] userId:", userId, "allIds:", allIds);

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, type, action, content, image_url, created_at, user_id, book_id, pages_read, minutes_read")
    .in("user_id", allIds)
    .order("created_at", { ascending: false })
    .limit(60);

  if (postsError) {
    console.error("[fetchFeed] Error al leer posts:", postsError);
    throw postsError;
  }
  devLog("[fetchFeed] posts recibidos:", posts?.length ?? 0);
  if (!posts || posts.length === 0) return [];

  const bookIds = [...new Set(posts.filter((p) => p.book_id).map((p) => p.book_id))];
  let bookMap = {};
  if (bookIds.length > 0) {
    const { data: bks } = await supabase
      .from("books")
      .select("id, title, author, cover_url, rating, review, status")
      .in("id", bookIds);
    (bks || []).forEach((b) => { bookMap[b.id] = b; });
  }

  const authorIds = [...new Set(posts.map((p) => p.user_id))];
  const { data: authors } = await supabase.from("users").select("id, nombre, username, avatar_url, cover_url, bio").in("id", authorIds);

  const authorMap = {};
  (authors || []).forEach((a) => { authorMap[a.id] = { ...a }; });

  return posts.map((p) => {
    let type = p.type;
    let quote = null;

    // Detect quote posts embedded in "text" type (avoids DB type constraints)
    if (p.content) {
      try {
        const parsed = JSON.parse(p.content);
        if (parsed.__folio_type === "quote") {
          type = "quote";
          quote = parsed;
        }
      } catch { /* not JSON, regular text post */ }
    }

    return {
      ...p,
      type,
      book: p.book_id ? bookMap[p.book_id] : null,
      author: authorMap[p.user_id] || { nombre: "Usuario", username: "" },
      quote,
    };
  });
}

async function fetchComments(postId) {
  const { data: comments } = await supabase
    .from("comments")
    .select("id, post_id, user_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: authors } = await supabase.from("users").select("id, nombre, username, avatar_url").in("id", authorIds);
  const authorMap = {};
  (authors || []).forEach((a) => { authorMap[a.id] = { ...a }; });

  const commentIds = comments.map((c) => c.id);
  const { data: allReplies } = await supabase
    .from("comment_replies")
    .select("id, comment_id, user_id, content, created_at")
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true });

  let replyAuthorMap = {};
  if (allReplies && allReplies.length > 0) {
    const replyAuthorIds = [...new Set(allReplies.map((r) => r.user_id))];
    const { data: replyAuthors } = await supabase.from("users").select("id, nombre, username, avatar_url").in("id", replyAuthorIds);
    (replyAuthors || []).forEach((a) => { replyAuthorMap[a.id] = a; });
  }

  const repliesByComment = {};
  (allReplies || []).forEach((r) => {
    if (!repliesByComment[r.comment_id]) repliesByComment[r.comment_id] = [];
    repliesByComment[r.comment_id].push({ ...r, author: replyAuthorMap[r.user_id] || { nombre: "Usuario" } });
  });

  return comments.map((c) => ({
    ...c,
    author: authorMap[c.user_id] || { nombre: "Usuario" },
    replies: repliesByComment[c.id] || [],
  }));
}

async function compressAndUploadPostImage(file, userId) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objUrl);
      const MAX_W = 1200;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(async (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        const filename = `${userId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("post-images").upload(filename, blob, { contentType: "image/jpeg", upsert: false });
        if (error) return reject(error);
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filename);
        resolve(urlData.publicUrl);
      }, "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}

async function createFeedPost({ userId, type, bookId, action, content, imageUrl, pagesRead, minutesRead }) {
  if (!navigator.onLine) {
    addPendingPost({ userId, type, bookId, action, content, imageUrl, pagesRead, minutesRead });
    return;
  }
  const payload = {
    user_id: userId,
    type,
    book_id: bookId || null,
    content: content || null,
    image_url: imageUrl || null,
  };
  if (action !== undefined) payload.action = action || null;
  if (pagesRead !== undefined) payload.pages_read = pagesRead || null;
  if (minutesRead !== undefined) payload.minutes_read = minutesRead || null;
  // quote_id stored in content as JSON — no schema column required
  devLog("[createFeedPost] insertando:", payload);
  devLog("[createFeedPost] User ID:", userId);
  const { error } = await supabase.from("posts").insert(payload);
  if (error) {
    console.error("[createFeedPost] error:", error);
    console.error("[createFeedPost] message:", error?.message, "| code:", error?.code, "| details:", error?.details);
    throw error;
  }
  devLog("[createFeedPost] OK");
}

async function createComment({ postId, userId, content }) {
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, content });
  if (error) throw error;
}

async function createReply({ commentId, userId, content }) {
  const { error } = await supabase.from("comment_replies").insert({ comment_id: commentId, user_id: userId, content });
  if (error) throw error;
}

async function deleteFeedPost(postId, userId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
  if (error) throw error;
}

// ============ SINCRONIZACIÓN OFFLINE (posts) ============
async function syncPendingPosts() {
  const posts = getPendingPosts();
  if (posts.length === 0) return 0;
  let synced = 0;
  const remaining = [];
  for (const post of posts) {
    const { _id, ...payload } = post;
    try {
      await createFeedPost(payload);
      synced++;
    } catch (err) {
      console.error("[offline] post pendiente no sincronizado (se reintenta en la próxima reconexión):", err?.message || err);
      remaining.push(post);
    }
  }
  try { localStorage.setItem("folio_pending_posts", JSON.stringify(remaining)); } catch { /* localStorage lleno o bloqueado */ }
  if (remaining.length === 0) localStorage.removeItem("folio_pending_posts");
  return synced;
}


export { getOrCreateConversation, markConversationRead, getUnreadMessagesCount, fetchFeed, fetchComments, compressAndUploadPostImage, createFeedPost, createComment, createReply, deleteFeedPost, syncPendingPosts };

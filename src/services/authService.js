import { supabase } from "../supabase.js";

// ============ AUTH SERVICE (Supabase Auth) ============
// Reemplaza la auth casera (SHA-256 + JWT propio). La sesión la maneja Supabase
// (persistida en localStorage). public.users es la tabla de PERFIL, con id = auth.uid().

// Cache del perfil mínimo para fallback offline (la app soporta uso sin red).
const AUTH_USER_KEY = "folio_auth_user";
function cacheAuthUser(u) {
  try { localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u)); } catch {}
}
function getCachedAuthUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; }
}

// Devuelve SIEMPRE la forma { id, name, email } que espera el resto de la app.
// (public.users guarda `nombre`; aquí lo mapeamos a `name`.)
async function buildAppUser(authUser) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("nombre, username")
    .eq("id", authUser.id)
    .maybeSingle();

  // Sin perfil o error de red → intenta caché si el id coincide.
  if (error || !profile) {
    const cached = getCachedAuthUser();
    if (cached && cached.id === authUser.id) return cached;
    if (error) return null; // error real (red), no "perfil inexistente"
  }

  const appUser = {
    id: authUser.id,
    email: authUser.email,
    name: profile?.nombre || authUser.email, // mapeo nombre → name
  };
  cacheAuthUser(appUser);
  return appUser;
}

export async function loginWithSupabase(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: "Email o contraseña incorrectos." };
  const user = await buildAppUser(data.user);
  if (!user) return { ok: false, error: "No se pudo cargar el perfil." };
  return { ok: true, user };
}

export async function registerWithSupabase({ name, username, email, password }) {
  const emailLower = email.toLowerCase().trim();
  const usernameLower = username.toLowerCase().trim();

  // 1) Crear la cuenta en Supabase Auth. Con "Confirm email" OFF deja sesión inmediata,
  //    así auth.uid() ya existe para que el INSERT pase la política RLS de public.users.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: emailLower,
    password,
    options: { data: { nombre: name.trim(), username: usernameLower } },
  });
  if (authError) {
    const msg = /already registered|already been registered/i.test(authError.message)
      ? "Ya existe una cuenta con ese email."
      : authError.message;
    return { ok: false, error: msg };
  }
  if (!authData.user) return { ok: false, error: "No se pudo crear la cuenta." };

  // 2) Crear el perfil en public.users con el MISMO id de Auth (requisito para RLS).
  //    Usamos upsert con onConflict en la PRIMARY KEY `id` (única garantizada):
  //    - evita el 42P10 "no unique or exclusion constraint matching the ON CONFLICT"
  //      que aparece cuando el target del conflicto no es una columna única,
  //    - es idempotente: si ya existe una fila para ese id (reintento, fila parcial),
  //      la actualiza en vez de reventar con duplicado.
  const { error: profileError } = await supabase.from("users").upsert({
    id: authData.user.id,
    email: emailLower,
    nombre: name.trim(),
    username: usernameLower,
  }, { onConflict: "id" });
  if (profileError) {
    // Dejar limpio: cerrar la sesión recién creada para no quedar en estado a medias.
    try { await supabase.auth.signOut(); } catch {}
    const msg = profileError.code === "23505"
      ? "Ese nombre de usuario ya está en uso."
      : `No se pudo crear el perfil: ${profileError.message}`;
    return { ok: false, error: msg };
  }

  const user = { id: authData.user.id, email: emailLower, name: name.trim() };
  cacheAuthUser(user);
  return { ok: true, user };
}

// Actualiza el nombre visible (users.nombre) y el caché local.
// El username NO se toca aquí: ese se edita aparte y este campo es independiente.
export async function updateDisplayName(userId, name) {
  const clean = (name || "").trim().slice(0, 60);
  if (!clean) return null;
  const { error } = await supabase.from("users").update({ nombre: clean }).eq("id", userId);
  if (error) return null;
  const cached = getCachedAuthUser();
  if (cached && cached.id === userId) cacheAuthUser({ ...cached, name: clean });
  return clean;
}

export async function logout() {
  try { await supabase.auth.signOut(); } catch {}
  try { localStorage.removeItem(AUTH_USER_KEY); } catch {}
}

// Carga la sesión actual al abrir la app. Devuelve { id, name, email } o null.
export async function getSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return await buildAppUser(session.user);
}

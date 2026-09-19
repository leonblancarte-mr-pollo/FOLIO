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

// INSERT plano del perfil en public.users (NO upsert: ON CONFLICT DO UPDATE exige más
// privilegios que un INSERT y public.users tiene GRANTs por columna desde privacy_hardening.sql).
// Devuelve { ok, existed?, usernameTaken?, error? }. Idempotente: si la fila ya existe (PK) es ok.
async function insertProfileRow({ id, email, nombre, username }) {
  const { error } = await supabase.from("users").insert({ id, email, nombre, username });
  if (!error) return { ok: true };
  if (error.code === "23505") {
    const info = `${error.message || ""} ${error.details || ""}`;
    if (/username/i.test(info)) return { ok: false, usernameTaken: true, error };
    if (/pkey|\(id\)/i.test(info)) return { ok: true, existed: true };
  }
  return { ok: false, error };
}

// Cuenta huérfana: existe en auth.users pero no en public.users (signup que falló a medias).
// Requiere sesión activa (auth.uid() = id) para pasar la RLS users_insert_self.
// Crea el perfil con lo que haya en user_metadata; si el username está tomado, añade sufijo.
async function autoCreateProfile(authUser) {
  const meta = authUser.user_metadata || {};
  const local = (authUser.email || "usuario").split("@")[0];
  const nombre = (meta.nombre || meta.name || local).toString().trim().slice(0, 60) || local;
  const base = ((meta.username || local).toString().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()) || "usuario";
  const candidates = [base, `${base}_${authUser.id.replace(/-/g, "").slice(0, 4)}`, `${base}_${authUser.id.replace(/-/g, "").slice(0, 8)}`];

  for (const username of candidates) {
    const res = await insertProfileRow({ id: authUser.id, email: (authUser.email || "").toLowerCase(), nombre, username });
    if (res.ok) {
      console.info("[auth] perfil auto-creado para cuenta huérfana:", authUser.id, username);
      return { nombre, username };
    }
    if (!res.usernameTaken) {
      console.warn("[auth] no se pudo auto-crear el perfil:", res.error?.message);
      return null;
    }
  }
  return null;
}

// Devuelve SIEMPRE la forma { id, name, email } que espera el resto de la app.
// (public.users guarda `nombre`; aquí lo mapeamos a `name`.)
async function buildAppUser(authUser) {
  let { data: profile, error } = await supabase
    .from("users")
    .select("nombre, username")
    .eq("id", authUser.id)
    .maybeSingle();

  // Error real (red/permisos) → caché si el id coincide; si no, no hay usuario.
  if (error) {
    const cached = getCachedAuthUser();
    return cached && cached.id === authUser.id ? cached : null;
  }

  // Sin error y sin fila → cuenta huérfana: auto-crear el perfil.
  if (!profile) {
    profile = await autoCreateProfile(authUser);
    if (!profile) {
      const cached = getCachedAuthUser();
      if (cached && cached.id === authUser.id) return cached;
    }
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

// Ruta de recuperación para "Ya existe una cuenta con ese email" cuando la cuenta es huérfana.
// Devuelve { ok:true, user } si reparó la cuenta, o null si no aplica (contraseña distinta,
// perfil ya existente, username tomado o error) — en ese caso el llamador muestra el error normal.
async function recoverOrphanAccount({ emailLower, password, name, usernameLower }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailLower, password });
  if (error || !data?.user) return null;

  const { data: existing, error: selErr } = await supabase
    .from("users").select("id").eq("id", data.user.id).maybeSingle();
  if (selErr || existing) {
    // Cuenta real y completa (o no se pudo verificar): no iniciar sesión desde el formulario de registro.
    try { await supabase.auth.signOut(); } catch {}
    return null;
  }

  const res = await insertProfileRow({ id: data.user.id, email: emailLower, nombre: name, username: usernameLower });
  if (!res.ok) {
    try { await supabase.auth.signOut(); } catch {}
    return null;
  }
  console.info("[auth] cuenta huérfana recuperada en el registro:", data.user.id);
  const user = { id: data.user.id, email: emailLower, name };
  cacheAuthUser(user);
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
    if (/already registered|already been registered/i.test(authError.message)) {
      // Posible cuenta huérfana (signup anterior falló al crear el perfil): si la contraseña
      // coincide y NO hay fila en public.users, terminamos de crear el perfil en vez de
      // dejar al usuario atrapado en "ya existe una cuenta".
      const recovered = await recoverOrphanAccount({ emailLower, password, name: name.trim(), usernameLower });
      if (recovered) return recovered;
      return { ok: false, error: "Ya existe una cuenta con ese email." };
    }
    return { ok: false, error: authError.message };
  }
  if (!authData.user) return { ok: false, error: "No se pudo crear la cuenta." };

  // 2) Crear el perfil en public.users con el MISMO id de Auth (requisito para RLS).
  //    INSERT plano (no upsert): idempotente vía insertProfileRow (PK duplicada = ok) y
  //    solo requiere INSERT sobre las columnas enviadas (ver fix_signup_permissions.sql).
  const res = await insertProfileRow({
    id: authData.user.id,
    email: emailLower,
    nombre: name.trim(),
    username: usernameLower,
  });
  if (!res.ok) {
    // Dejar limpio: cerrar la sesión recién creada para no quedar en estado a medias.
    // La cuenta queda huérfana en auth.users, pero el login/registro posterior la repara.
    try { await supabase.auth.signOut(); } catch {}
    const msg = res.usernameTaken
      ? "Ese nombre de usuario ya está en uso."
      : `No se pudo crear el perfil: ${res.error?.message}`;
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

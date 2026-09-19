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

// true mientras corre registerWithSupabase: el listener de sesión no debe adelantarse al signup.
let registrationInFlight = false;

// INSERT plano del perfil en public.users (NO upsert: ON CONFLICT DO UPDATE exige más
// privilegios que un INSERT y public.users tiene GRANTs por columna desde privacy_hardening.sql).
// `extras` son columnas opcionales (defaults del perfil): si la BD las rechaza (columna
// inexistente o sin GRANT) se reintenta solo con las 4 obligatorias.
// Devuelve { ok, existed?, usernameTaken?, error? }. Idempotente: si la fila ya existe (PK) es ok.
async function insertProfileRow({ id, email, nombre, username }, extras = null) {
  const base = { id, email, nombre, username };
  let { error } = await supabase.from("users").insert(extras ? { ...base, ...extras } : base);
  const rls = error?.code === "42501" && /row-level security/i.test(error.message || "");
  if (error && extras && !rls && ["42703", "PGRST204", "42501"].includes(error.code)) {
    console.warn("[auth] INSERT con columnas extra rechazado; reintentando solo con las obligatorias:", error.code, error.message);
    ({ error } = await supabase.from("users").insert(base));
  }
  if (!error) return { ok: true };
  if (error.code === "23505") {
    const info = `${error.message || ""} ${error.details || ""}`;
    if (/username/i.test(info)) return { ok: false, usernameTaken: true, error };
    if (/pkey|\(id\)/i.test(info)) return { ok: true, existed: true };
  }
  return { ok: false, error };
}

function errorInfo(err) {
  return { code: err?.code, message: err?.message, details: err?.details, hint: err?.hint };
}

// Nunca falla en silencio: distingue RLS, GRANT y "otro motivo" (con el error completo).
function logProfileInsertError(err, email) {
  const info = errorInfo(err);
  if (err?.code === "42501" && /row-level security/i.test(err.message || "")) {
    console.error(`[auth] INSERT del perfil de ${email} BLOQUEADO POR RLS (policy INSERT de users: auth.uid() = id). ¿La sesión está activa?`, info);
  } else if (err?.code === "42501") {
    console.error(`[auth] INSERT del perfil de ${email} SIN PRIVILEGIOS (GRANT de tabla/columna). Corre supabase/fix_signup_permissions.sql en Supabase.`, info);
  } else {
    console.error(`[auth] Error al crear el perfil de ${email}:`, info);
  }
}

const randSuffix = () => Math.random().toString(36).slice(2, 6).padEnd(4, "0");

// Perfil que se crea a una cuenta huérfana, con los datos disponibles del usuario de Auth.
function orphanProfileDraft(authUser) {
  const meta = authUser.user_metadata || {};
  const local = (authUser.email || "usuario").split("@")[0];
  const nombre = String(meta.nombre || meta.full_name || meta.name || local).trim().slice(0, 60) || local;
  const username = String(meta.username || local).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "usuario";
  return { nombre, username };
}

// Cuenta huérfana = existe en auth.users pero no en public.users. Comprueba y, si falta, crea el perfil.
// Requiere sesión activa (auth.uid() = id) para pasar la RLS de INSERT.
// Devuelve { ok, created, profile:{nombre,username}, checked, error? }:
//   - checked:false → no se pudo ni verificar (red/permisos de SELECT); no se intentó crear nada.
//   - ok:false con checked:true → el perfil falta y NO se pudo crear (ya se logueó el motivo).
async function runEnsureProfile(authUser) {
  const { data: profile, error } = await supabase
    .from("users").select("nombre, username").eq("id", authUser.id).maybeSingle();
  if (error) {
    console.error(`[auth] No se pudo verificar si existe el perfil de ${authUser.email}:`, errorInfo(error));
    return { ok: false, checked: false, created: false, error };
  }
  if (profile) return { ok: true, checked: true, created: false, profile };

  console.info("[auth] Auto-creando perfil faltante para user:", authUser.email);
  const { nombre, username: base } = orphanProfileDraft(authUser);
  const email = (authUser.email || "").toLowerCase();
  const MAX_RETRIES = 3;
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const username = attempt === 0 ? base : `${base}${randSuffix()}`;
    const res = await insertProfileRow(
      { id: authUser.id, email, nombre, username },
      { is_public: true, onboarding_completed: false },   // is_premium y created_at: default de la BD
    );
    if (res.ok) {
      console.info("[auth] Perfil auto-creado exitosamente", res.existed ? "(ya existía: creado en paralelo)" : `(username: ${username})`);
      return { ok: true, checked: true, created: !res.existed, profile: { nombre, username } };
    }
    lastError = res.error;
    if (!res.usernameTaken) break;   // otro error: reintentar con otro username no ayuda
    console.warn(`[auth] username '${username}' ya está en uso; reintento ${attempt + 1}/${MAX_RETRIES} con sufijo aleatorio`);
  }
  logProfileInsertError(lastError, authUser.email);
  return { ok: false, checked: true, created: false, error: lastError };
}

// Evita comprobaciones/INSERTs duplicados cuando getSessionUser y onAuthStateChange
// disparan casi a la vez para el mismo usuario.
const ensureInFlight = new Map();
export function ensureUserProfile(authUser) {
  if (!authUser?.id) return Promise.resolve({ ok: false, checked: false, created: false, error: new Error("sin usuario") });
  if (!ensureInFlight.has(authUser.id)) {
    const p = runEnsureProfile(authUser).finally(() => ensureInFlight.delete(authUser.id));
    ensureInFlight.set(authUser.id, p);
  }
  return ensureInFlight.get(authUser.id);
}

// Devuelve SIEMPRE la forma { id, name, email } que espera el resto de la app.
// (public.users guarda `nombre`; aquí lo mapeamos a `name`.)
// Auto-repara el perfil faltante (cuenta huérfana) en CADA llamada: login, sesión guardada, etc.
async function buildAppUser(authUser) {
  const ensured = await ensureUserProfile(authUser);

  // No se pudo ni verificar (red/permisos) → caché si el id coincide; si no, no hay usuario.
  if (!ensured.checked) {
    const cached = getCachedAuthUser();
    return cached && cached.id === authUser.id ? cached : null;
  }

  const profile = ensured.profile || null;
  const appUser = {
    id: authUser.id,
    email: authUser.email,
    name: profile?.nombre || authUser.email, // mapeo nombre → name
  };
  cacheAuthUser(appUser);
  // El perfil falta y no se pudo crear: se deja entrar (modo degradado) pero marcado, y ya hay console.error.
  return profile ? appUser : { ...appUser, profileMissing: true };
}

// Suscripción a cambios de sesión: cubre SIGNED_IN / INITIAL_SESSION (p. ej. sesión guardada que
// abre la app) ejecutando el mismo check de perfil faltante. Devuelve la función para cancelar.
// - Se difiere con setTimeout: supabase-js desaconseja hacer llamadas a Supabase dentro del callback.
// - Se ignora durante el registro: ahí el perfil lo crea registerWithSupabase (no se cambia el signup).
export function watchAuthProfile() {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
    if (registrationInFlight || !session?.user) return;
    setTimeout(() => {
      ensureUserProfile(session.user).catch((e) => console.error("[auth] fallo inesperado en el check de perfil:", e));
    }, 0);
  });
  return () => data?.subscription?.unsubscribe();
}

export async function loginWithSupabase(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: "Email o contraseña incorrectos." };
  // buildAppUser → ensureUserProfile: si la cuenta es huérfana (sin fila en users), crea el perfil aquí mismo.
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

export async function registerWithSupabase(args) {
  registrationInFlight = true;
  try {
    return await registerImpl(args);
  } finally {
    registrationInFlight = false;
  }
}

async function registerImpl({ name, username, email, password }) {
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

/**
 * js/core/auth.js
 * ─────────────────────────────────────────────────────────────────────────
 * Envoltorio fino sobre `supabase.auth` -- ningún otro módulo llama al SDK
 * de autenticación directamente. Nunca lanza: cada función async siempre
 * RESUELVE (nunca rechaza) con `{ ..., error }`, incluso si Supabase no
 * está configurado todavía (getSupabaseClient() === null) -- en ese caso
 * `error.message === "not_configured"`, para que render-auth.js pueda
 * distinguir "credenciales mal" de "las cuentas no existen todavía en
 * este sitio" y mostrar el estado correcto (ver requisito de UI "estado
 * offline/no disponible").
 *
 * Deliberadamente NO decide qué hacer con los datos locales al iniciar/
 * cerrar sesión -- eso es responsabilidad de js/core/migration.js
 * (runReconciliation/onSignOut), orquestado desde js/ui/render-auth.js al
 * reaccionar a los eventos de onAuthStateChange. Mantiene este archivo
 * sobre UNA sola responsabilidad (hablar con Supabase Auth), igual que
 * pricing.js es agnóstico de dishes.js.
 *
 * Depende de:
 *   js/core/supabase-client.js (getSupabaseClient)
 *
 * Expone (globales):
 *   isAuthAvailable()                 → boolean
 *   getCurrentUser()                  → user | null (último conocido, síncrono)
 *   onAuthStateChange(listener)       → función para darse de baja
 *   signUpWithEmail(email, password)  → Promise<{user, error}>
 *   signInWithEmail(email, password)  → Promise<{user, error}>
 *   signInWithGoogle()                → Promise<{error}> (redirige la página)
 *   signOut()                         → Promise<{error}>
 *   authErrorMessage(error)           → string en español, seguro de mostrar
 * ─────────────────────────────────────────────────────────────────────────
 */

var _authListeners = [];
var _authCurrentUser = null;
var _authSubscribed = false;

/**
 * Reenvía un evento de Supabase a todos los listeners registrados,
 * aislando el fallo de uno de ellos del resto (mismo principio que
 * safeInit() en app.js).
 * @param {string} event
 * @param {object|null} session
 */
function _notifyAuthListeners(event, session) {
  _authCurrentUser = (session && session.user) ? session.user : null;
  _authListeners.forEach(function (fn) {
    try {
      fn(event, _authCurrentUser);
    } catch (err) {
      console.error("[auth] listener falló de forma aislada:", err);
    }
  });
}

/**
 * Se suscribe UNA sola vez al SDK, sin importar cuántos listeners propios
 * se registren después -- Supabase emite `INITIAL_SESSION` nada más
 * suscribirse, que es lo que rellena _authCurrentUser la primera vez.
 */
function _ensureSubscribed() {
  if (_authSubscribed) return;
  var client = getSupabaseClient();
  if (!client) return;
  _authSubscribed = true;
  client.auth.onAuthStateChange(function (event, session) {
    _notifyAuthListeners(event, session);
  });
}

function isAuthAvailable() {
  return getSupabaseClient() !== null;
}

/**
 * @returns {object|null} - el usuario del último evento de auth conocido.
 *   null antes de que llegue el primer evento (breve, ver INITIAL_SESSION
 *   arriba) o si nunca hubo sesión / Supabase no está configurado.
 */
function getCurrentUser() {
  return _authCurrentUser;
}

/**
 * @param {function(string, object|null)} listener - (event, user)
 * @returns {function} - llamar para darse de baja
 */
function onAuthStateChange(listener) {
  if (typeof listener !== "function") return function () {};
  _ensureSubscribed();
  _authListeners.push(listener);
  return function unsubscribe() {
    var idx = _authListeners.indexOf(listener);
    if (idx !== -1) _authListeners.splice(idx, 1);
  };
}

function _notConfiguredResult(extra) {
  var result = { error: { message: "not_configured" } };
  return extra ? Object.assign(result, extra) : result;
}

function signUpWithEmail(email, password) {
  var client = getSupabaseClient();
  if (!client) return Promise.resolve(_notConfiguredResult({ user: null }));

  return client.auth.signUp({ email: email, password: password })
    .then(function (result) {
      return { user: (result.data && result.data.user) || null, error: result.error || null };
    })
    .catch(function (err) {
      return { user: null, error: err };
    });
}

function signInWithEmail(email, password) {
  var client = getSupabaseClient();
  if (!client) return Promise.resolve(_notConfiguredResult({ user: null }));

  return client.auth.signInWithPassword({ email: email, password: password })
    .then(function (result) {
      return { user: (result.data && result.data.user) || null, error: result.error || null };
    })
    .catch(function (err) {
      return { user: null, error: err };
    });
}

/**
 * Redirige la página entera a Google y vuelve con la sesión ya activa
 * (Supabase gestiona todo el intercambio del callback) -- por eso esta
 * función normalmente no llega a resolver antes de que la navegación
 * ocurra; el resultado solo importa si Supabase rechaza la llamada antes
 * de redirigir (config OAuth incompleta, red caída).
 * @returns {Promise<{error: object|null}>}
 */
function signInWithGoogle() {
  var client = getSupabaseClient();
  if (!client) return Promise.resolve(_notConfiguredResult());

  return client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: (typeof window !== "undefined" && window.location) ? window.location.origin : undefined }
  })
    .then(function (result) {
      return { error: result.error || null };
    })
    .catch(function (err) {
      return { error: err };
    });
}

function signOut() {
  var client = getSupabaseClient();
  if (!client) return Promise.resolve({ error: null });

  return client.auth.signOut()
    .then(function (result) {
      return { error: result.error || null };
    })
    .catch(function (err) {
      return { error: err };
    });
}

/**
 * Traduce un error de Supabase Auth a un mensaje en español, seguro de
 * mostrar tal cual en la UI -- nunca expone el mensaje crudo del SDK
 * (puede filtrar detalles internos o venir en inglés sin contexto).
 * @param {{message?:string, error_description?:string}|Error|null} error
 * @returns {string}
 */
function authErrorMessage(error) {
  if (!error) return "";

  if (error.message === "not_configured") {
    return "Las cuentas todavía no están disponibles en este sitio -- puedes seguir usándolo como invitado.";
  }

  var msg = String(error.message || error.error_description || error).toLowerCase();

  if (msg.indexOf("invalid login credentials") !== -1) {
    return "Email o contraseña incorrectos.";
  }
  if (msg.indexOf("email not confirmed") !== -1) {
    return "Confirma tu email antes de iniciar sesión -- revisa tu bandeja de entrada.";
  }
  if (msg.indexOf("already registered") !== -1 || msg.indexOf("user already registered") !== -1) {
    return "Ya existe una cuenta con ese email -- prueba a iniciar sesión.";
  }
  if (msg.indexOf("rate limit") !== -1 || msg.indexOf("too many requests") !== -1) {
    return "Demasiados intentos -- espera un momento y vuelve a intentarlo.";
  }
  if (msg.indexOf("password") !== -1 && (msg.indexOf("6 characters") !== -1 || msg.indexOf("at least") !== -1)) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if ((typeof TypeError !== "undefined" && error instanceof TypeError) ||
      msg.indexOf("failed to fetch") !== -1 || msg.indexOf("network") !== -1) {
    return "No se pudo conectar -- revisa tu conexión a internet e inténtalo de nuevo.";
  }

  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

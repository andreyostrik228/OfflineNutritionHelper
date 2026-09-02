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
 *   isAuthAvailable()
 *   isAuthSessionResolved()                 → boolean
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
var _authResolved = false;
var _authSubscribed = false;

/**
 * Reenvía un evento de Supabase a todos los listeners registrados,
 * aislando el fallo de uno de ellos del resto (mismo principio que
 * safeInit() en app.js).
 * @param {string} event
 * @param {object|null} session
 */
function _notifyAuthListeners(event, session) {
  // TRAZA TEMPORAL: apunta el evento CRUDO de Supabase antes de tocarlo.
  // Es el único dato que nunca he tenido -- todo lo demás lo he estado
  // simulando, inventándome qué manda Supabase y cuándo. Se quita en
  // cuanto se sepa la causa. Ver _obTraza en js/ui/onboarding-ui.js.
  try {
    if (typeof window !== "undefined" && typeof window.__traza === "function") {
      window.__traza("SUPABASE " + event, (session && session.user) ? "con usuario" : "SIN usuario");
    }
  } catch (err) { /* la traza jamás puede romper la sesión */ }

  _authCurrentUser = (session && session.user) ? session.user : null;
  // A partir del primer evento ya se SABE si hay sesión o no. Antes, la
  // ausencia de usuario solo significaba "todavía no ha contestado
  // Supabase" -- y confundir las dos cosas hacía que a un usuario con la
  // sesión iniciada se le pidiera iniciar sesión en cada recarga.
  _authResolved = true;
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

/**
 * ¿Se sabe ya si hay sesión?
 *
 * `getCurrentUser()` devuelve null en dos situaciones que no se parecen
 * en nada: "no hay sesión" y "Supabase todavía no ha contestado". Quien
 * tenga que decidir algo importante con eso -- por ejemplo si enseñar la
 * pantalla de bienvenida -- necesita poder distinguirlas.
 *
 * @returns {boolean} false hasta que llega el primer evento de auth.
 */
function isAuthSessionResolved() {
  // Sin cuentas configuradas no hay nada que esperar: la respuesta
  // definitiva es "no hay sesión", y se sabe desde el principio.
  if (!isAuthAvailable()) return true;
  return _authResolved;
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
 * Borra la cuenta del usuario y todos sus datos en la nube, y cierra la
 * sesión. Irreversible.
 *
 * ── Por qué pasa por una función de Postgres ────────────────────────────
 * El cliente puede borrar su fila de `public.user_data` (hay política
 * DELETE), pero NO puede tocar `auth.users`: ese esquema no se expone al
 * cliente y la API de administración exige la service_role key, que nunca
 * puede vivir en un frontend público. `delete_own_account()` es una
 * función `security definer` que borra exclusivamente la fila de
 * `auth.uid()` -- no acepta parámetros, así que no hay forma de pedirle
 * que borre la cuenta de otro. Ver supabase/delete-account.sql.
 *
 * ── Si la función todavía no está instalada ─────────────────────────────
 * El SQL hay que ejecutarlo a mano una vez en el proyecto Supabase. Si no
 * se ha hecho, Postgres responde que la función no existe: eso se traduce
 * a `not_installed` para que la interfaz pueda decir la verdad ("esto
 * todavía no está disponible") en lugar de un "error inesperado" que
 * dejaría al usuario sin saber si sus datos se han borrado o no.
 *
 * @returns {Promise<{error: object|null}>}
 */
function deleteOwnAccount() {
  var client = getSupabaseClient();
  if (!client) return Promise.resolve(_notConfiguredResult());

  return client.rpc("delete_own_account")
    .then(function (result) {
      if (result && result.error) {
        var raw = String(result.error.message || "").toLowerCase();
        // 42883 = undefined_function. También se comprueba el texto porque
        // el código no siempre viaja en el error del SDK.
        if (result.error.code === "42883" ||
            raw.indexOf("could not find the function") !== -1 ||
            raw.indexOf("does not exist") !== -1) {
          return { error: { message: "not_installed" } };
        }
        return { error: result.error };
      }
      // La cuenta ya no existe; la sesión local sobreviviría hasta que
      // caducase el token, así que se cierra explícitamente. Si esto
      // fallara, la cuenta YA está borrada -- se informa de éxito igual,
      // porque decir "no se pudo borrar" sería mentir.
      return signOut().then(function () {
        return { error: null };
      }, function () {
        return { error: null };
      });
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
  if (error.message === "not_installed") {
    return "Borrar la cuenta todavía no está activado en este servidor. Tus datos siguen intactos.";
  }
  if (error.message === "not_authenticated") {
    return "Tu sesión ha caducado -- vuelve a iniciarla e inténtalo otra vez.";
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

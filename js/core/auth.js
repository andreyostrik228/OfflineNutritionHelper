/**
 * js/core/auth.js
 * ─────────────────────────────────────────────────────────────────────────
 * Envoltorio fino sobre Firebase Authentication -- ningún otro módulo llama
 * al SDK de autenticación directamente. Nunca lanza: cada función async
 * siempre RESUELVE (nunca rechaza) con `{ ..., error }`, incluso si
 * Firebase no está configurado todavía (getFirebaseAuth() === null) -- en
 * ese caso `error.message === "not_configured"`, para que render-auth.js
 * pueda distinguir "credenciales mal" de "las cuentas no existen todavía
 * en este sitio".
 *
 * ── La forma que ve el resto de la app NO es la de Firebase ─────────────
 * Hasta 2026-09-25 esto hablaba con Supabase, y render-auth.js,
 * migration.js y onboarding-ui.js se escribieron contra SU forma: el
 * usuario trae `id` (no `uid`) y `user_metadata.full_name`, y los eventos
 * se llaman INITIAL_SESSION / SIGNED_IN / SIGNED_OUT. Este módulo traduce
 * a esa forma en un solo sitio (_normalizarUsuario, _alCambiarUsuario), y
 * así el cambio de proveedor no ha tocado a nadie más. Si algún día se
 * cambia otra vez, el contrato a respetar es ese, no el del SDK nuevo.
 *
 * Deliberadamente NO decide qué hacer con los datos locales al iniciar/
 * cerrar sesión -- eso es de js/core/migration.js, orquestado desde
 * js/ui/render-auth.js al reaccionar a los eventos.
 *
 * Depende de:
 *   js/core/firebase-client.js (getFirebaseAuth)
 *   js/core/cloud-sync.js      (deleteCloudUserData, pushAllToCloud) -- solo en deleteOwnAccount()
 *
 * Expone (globales):
 *   isAuthAvailable()
 *   isAuthSessionResolved()           → boolean
 *   getCurrentUser()                  → {id, email, user_metadata} | null (último conocido, síncrono)
 *   getAuthIdToken()                  → Promise<string|null> -- para la API REST de Firestore
 *   onAuthStateChange(listener)       → función para darse de baja
 *   signUpWithEmail(email, password)  → Promise<{user, error}>
 *   signInWithEmail(email, password)  → Promise<{user, error}>
 *   signInWithGoogle()                → Promise<{error, cancelled?}> (ventana emergente)
 *   sendPasswordReset(email)          → Promise<{error}>
 *   signOut()                         → Promise<{error}>
 *   deleteOwnAccount()                → Promise<{error}>
 *   authErrorMessage(error)           → string en español, seguro de mostrar
 * ─────────────────────────────────────────────────────────────────────────
 */

var _authListeners = [];
var _authCurrentUser = null;
var _authResolved = false;
var _authSubscribed = false;

/**
 * La forma de usuario que el resto de la app espera (ver cabecera).
 * @param {object|null} fbUser - firebase.User
 * @returns {{id:string, email:string|null, user_metadata:{full_name:string|null}}|null}
 */
function _normalizarUsuario(fbUser) {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    email: fbUser.email || null,
    user_metadata: { full_name: fbUser.displayName || null }
  };
}

/**
 * Reenvía un evento a todos los listeners registrados, aislando el fallo
 * de uno de ellos del resto (mismo principio que safeInit() en app.js).
 * @param {string} event
 * @param {object|null} user - ya normalizado
 */
function _notifyAuthListeners(event, user) {
  _authCurrentUser = user;
  // A partir del primer evento ya se SABE si hay sesión o no. Antes, la
  // ausencia de usuario solo significaba "todavía no ha contestado" -- y
  // confundir las dos cosas hacía que a un usuario con la sesión iniciada
  // se le pidiera iniciar sesión en cada recarga.
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
 * Firebase avisa con un solo callback, `onAuthStateChanged(user)`, sin
 * decir QUÉ ha pasado. El nombre del evento se deduce comparando con el
 * usuario anterior:
 *
 *   primera llamada           → INITIAL_SESSION (con usuario o sin él)
 *   nadie → alguien           → SIGNED_IN
 *   alguien → nadie           → SIGNED_OUT
 *   alguien → otra persona    → SIGNED_IN
 *   la misma persona otra vez → USER_UPDATED (nadie lo escucha: no pasa nada)
 *
 * La primera llamada llega SIEMPRE, también sin sesión, porque Firebase
 * tiene que mirar lo guardado antes de contestar -- es el equivalente
 * exacto del INITIAL_SESSION de Supabase.
 * @param {object|null} fbUser
 */
function _alCambiarUsuario(fbUser) {
  var nuevo = _normalizarUsuario(fbUser);
  var evento;
  if (!_authResolved) evento = "INITIAL_SESSION";
  else if (!_authCurrentUser && nuevo) evento = "SIGNED_IN";
  else if (_authCurrentUser && !nuevo) evento = "SIGNED_OUT";
  else if (_authCurrentUser && nuevo && _authCurrentUser.id !== nuevo.id) evento = "SIGNED_IN";
  else evento = "USER_UPDATED";
  _notifyAuthListeners(evento, nuevo);
}

/**
 * Se suscribe UNA sola vez al SDK, sin importar cuántos listeners propios
 * se registren después.
 */
function _ensureSubscribed() {
  if (_authSubscribed) return;
  var auth = getFirebaseAuth();
  if (!auth) return;
  _authSubscribed = true;
  auth.onAuthStateChanged(_alCambiarUsuario);
}

/**
 * ¿Se sabe ya si hay sesión?
 *
 * `getCurrentUser()` devuelve null en dos situaciones que no se parecen
 * en nada: "no hay sesión" y "Firebase todavía no ha contestado". Quien
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
  return getFirebaseAuth() !== null;
}

/**
 * @returns {object|null} - el usuario del último evento de auth conocido,
 *   en la forma de _normalizarUsuario().
 */
function getCurrentUser() {
  return _authCurrentUser;
}

/**
 * Token de identidad del usuario con sesión, para mandarlo como
 * `Authorization: Bearer` a la API REST de Firestore. El SDK lo renueva
 * solo cuando caduca (dura una hora). null si no hay sesión o si falla.
 * @returns {Promise<string|null>}
 */
function getAuthIdToken() {
  var auth = getFirebaseAuth();
  var fbUser = auth ? auth.currentUser : null;
  if (!fbUser || typeof fbUser.getIdToken !== "function") return Promise.resolve(null);
  try {
    return Promise.resolve(fbUser.getIdToken()).then(function (token) {
      return token || null;
    }, function (err) {
      console.error("[auth] no se pudo obtener el token:", err);
      return null;
    });
  } catch (err) {
    return Promise.resolve(null);
  }
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

/**
 * Llama al SDK sin que nada pueda escapar: ni un rechazo ni un `throw`
 * síncrono (el SDK lanza en el acto con argumentos inválidos).
 * @param {function(): Promise} llamada
 * @returns {Promise<{user:object|null, error:object|null}>}
 */
function _conCredencial(llamada) {
  try {
    return Promise.resolve(llamada()).then(function (cred) {
      return { user: _normalizarUsuario(cred && cred.user), error: null };
    }, function (err) {
      return { user: null, error: err };
    });
  } catch (err) {
    return Promise.resolve({ user: null, error: err });
  }
}

/**
 * Firebase NO pide confirmar el email para entrar: al crear la cuenta la
 * sesión ya está iniciada, y onAuthStateChanged emite SIGNED_IN. (Supabase
 * sí lo pedía por defecto; por eso render-auth.js tenía un aviso de "revisa
 * tu correo" que ya no hace falta.)
 */
function signUpWithEmail(email, password) {
  var auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(_notConfiguredResult({ user: null }));
  return _conCredencial(function () { return auth.createUserWithEmailAndPassword(email, password); });
}

function signInWithEmail(email, password) {
  var auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(_notConfiguredResult({ user: null }));
  return _conCredencial(function () { return auth.signInWithEmailAndPassword(email, password); });
}

/**
 * Abre la ventana de Google y vuelve con la sesión hecha, SIN recargar la
 * página (onAuthStateChanged emite SIGNED_IN aquí mismo).
 *
 * ── Por qué ventana emergente y no redirección ──────────────────────────
 * La redirección de Firebase pasa por su propio dominio
 * (weekplate-146b0.firebaseapp.com), y los navegadores actuales bloquean
 * el almacenamiento de terceros que necesita para volver con la sesión:
 * se vuelve a la app SIN haber entrado y sin ningún error. La ventana
 * emergente no tiene ese problema. Lo que puede pasarle es que el
 * navegador la bloquee -- eso sí se dice (auth/popup-blocked).
 *
 * Cerrar la ventana sin elegir cuenta no es un error: es cambiar de idea.
 * Se resuelve sin error y con `cancelled: true`.
 * @returns {Promise<{error: object|null, cancelled?: boolean}>}
 */
function signInWithGoogle() {
  var auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(_notConfiguredResult());

  try {
    var provider = new firebase.auth.GoogleAuthProvider();
    return Promise.resolve(auth.signInWithPopup(provider)).then(function () {
      return { error: null };
    }, function (err) {
      var code = err && err.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return { error: null, cancelled: true };
      }
      return { error: err };
    });
  } catch (err) {
    return Promise.resolve({ error: err });
  }
}

/**
 * Pide a Firebase que mande el correo de "he olvidado la contraseña".
 *
 * ── Nunca dice si ese email tiene cuenta o no ───────────────────────────
 * Con la "protección contra la enumeración de correos" del proyecto
 * activada (lo está, Authentication → Configuración → Acciones del
 * usuario), Firebase responde igual exista o no la cuenta, y la interfaz
 * también: "si esa dirección tiene cuenta, te llega un correo".
 *
 * ── Dónde se pone la contraseña nueva ───────────────────────────────────
 * En la página de Firebase (weekplate-146b0.firebaseapp.com/__/auth/
 * action), no en esta aplicación. Se intentó que el enlace del correo
 * apuntara aquí ("URL de acción personalizada") y la consola lo rechazó
 * dos veces con un 400 sin explicación (2026-09-25). La página de Firebase
 * funciona sin configurar nada; `url` es a dónde lleva su botón
 * "Continuar" al terminar, y `languageCode` hace que el correo y esa
 * página salgan en el idioma de la app.
 *
 * @param {string} email
 * @returns {Promise<{error: object|null}>}
 */
function sendPasswordReset(email) {
  var auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(_notConfiguredResult());

  try {
    // Los diez idiomas de la app (js/core/i18n.js, LANGS) los tiene
    // también Firebase para este correo y para su página.
    auth.languageCode = (typeof getLang === "function" && getLang()) || "es";
    var ajustes = (typeof window !== "undefined" && window.location && /^https?:$/.test(window.location.protocol))
      ? { url: window.location.origin + "/" }
      : undefined;
    return Promise.resolve(auth.sendPasswordResetEmail(email, ajustes)).then(function () {
      return { error: null };
    }, function (err) {
      return { error: err };
    });
  } catch (err) {
    return Promise.resolve({ error: err });
  }
}

function signOut() {
  var auth = getFirebaseAuth();
  if (!auth) return Promise.resolve({ error: null });

  try {
    return Promise.resolve(auth.signOut()).then(function () {
      return { error: null };
    }, function (err) {
      return { error: err };
    });
  } catch (err) {
    return Promise.resolve({ error: err });
  }
}

/**
 * Borra la cuenta del usuario y todos sus datos en la nube, y cierra la
 * sesión. Irreversible.
 *
 * ── El orden importa, y por qué ─────────────────────────────────────────
 * Son DOS borrados que no pueden ir juntos (con Supabase los hacía una
 * función de Postgres de una vez; en el plan gratuito de Firebase no hay
 * código de servidor que haga lo mismo):
 *
 *   1. el documento user_data/{uid}  -- las reglas lo permiten SOLO con
 *                                       la sesión de su dueño
 *   2. la cuenta                     -- currentUser.delete()
 *
 * Al revés (cuenta primero) saldría mal sin arreglo posible: sin cuenta ya
 * no hay sesión, las reglas ya no dejan tocar el documento, y los datos se
 * quedarían en la nube para siempre sin nadie que pueda borrarlos.
 *
 * Así que primero los datos. Y como Firebase exige haber entrado HACE
 * POCO para borrar una cuenta (auth/requires-recent-login), si el paso 2
 * falla, el documento ya está borrado: se vuelve a subir desde este
 * dispositivo -- que sigue teniendo la copia local, todavía no se ha
 * vaciado nada -- y se pide al usuario que vuelva a entrar. La cuenta
 * queda como estaba, con sus datos.
 *
 * @returns {Promise<{error: object|null}>}
 */
function deleteOwnAccount() {
  var auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(_notConfiguredResult());
  var fbUser = auth.currentUser;
  if (!fbUser) return Promise.resolve({ error: { message: "not_authenticated" } });

  var borrarDatos = (typeof deleteCloudUserData === "function")
    ? deleteCloudUserData()
    : Promise.resolve({ error: null });

  return Promise.resolve(borrarDatos).then(function (datos) {
    if (datos && datos.error) {
      // Ni siquiera se han podido borrar los datos: no se toca la cuenta.
      return { error: datos.error };
    }
    return Promise.resolve().then(function () { return fbUser["delete"](); }).then(function () {
      // La cuenta ya no existe. onAuthStateChanged emite SIGNED_OUT por su
      // cuenta; signOut() es solo por si acaso, y si fallara la cuenta YA
      // está borrada -- se informa de éxito igual, porque decir "no se pudo
      // borrar" sería mentir.
      return signOut().then(function () { return { error: null }; }, function () { return { error: null }; });
    }, function (err) {
      var restaurar = (typeof pushAllToCloud === "function") ? pushAllToCloud() : Promise.resolve(null);
      return Promise.resolve(restaurar).then(function () {
        if (err && err.code === "auth/requires-recent-login") return { error: { message: "not_authenticated" } };
        return { error: err };
      }, function () {
        return { error: err };
      });
    });
  }).then(null, function (err) {
    return { error: err };
  });
}

/**
 * Traduce un error de Firebase Auth a un mensaje en español, seguro de
 * mostrar tal cual en la UI -- nunca expone el mensaje crudo del SDK
 * (viene en inglés y con el código entre paréntesis).
 * @param {{code?:string, message?:string}|Error|null} error
 * @returns {string}
 */
function authErrorMessage(error) {
  if (!error) return "";

  // Cada mensaje se pide a las tablas (ui.auth_*) y lleva su español aquí al
  // lado: este módulo se carga -- y se prueba -- sin i18n.js, y un mensaje de
  // error que saliera como "ui.auth_x" sería peor que uno en castellano.
  // tests/auth.test.js comprueba que los dos españoles dicen lo mismo.
  var msgSinRed = _authTexto("ui.auth_sin_red",
    "No se pudo conectar -- revisa tu conexión a internet e inténtalo de nuevo.");

  if (error.message === "not_configured") {
    // "not_configured" tiene DOS causas que se parecen desde aqui y no se
    // parecen en nada para quien lo lee: que el sitio no tenga cuentas, o
    // que el SDK no haya podido descargarse por falta de red. Decir lo
    // primero cuando pasa lo segundo es mentir sobre el producto -- las
    // cuentas existen, lo que falta es internet.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return _authTexto("ui.auth_sin_conexion",
        "Sin conexión: las cuentas necesitan internet. Puedes seguir usando la aplicación como invitado -- todo se guarda en este dispositivo.");
    }
    return _authTexto("ui.auth_cuentas_no_disponibles",
      "Las cuentas todavía no están disponibles en este sitio -- puedes seguir usándolo como invitado.");
  }
  if (error.message === "not_authenticated") {
    return _authTexto("ui.auth_sesion_caducada", "Tu sesión ha caducado -- vuelve a iniciarla e inténtalo otra vez.");
  }

  switch (error.code) {
    // Con la protección contra la enumeración de correos activada, Firebase
    // ya no distingue "no existe" de "contraseña mala": los dos llegan como
    // invalid-credential. Los otros dos se dejan por si algún día se
    // desactiva.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return _authTexto("ui.auth_credenciales_incorrectas", "Email o contraseña incorrectos.");
    case "auth/email-already-in-use":
      return _authTexto("ui.auth_email_en_uso", "Ya existe una cuenta con ese email -- prueba a iniciar sesión.");
    case "auth/invalid-email":
      return _authTexto("ui.auth_email_invalido", "Ese email no parece válido -- revísalo.");
    case "auth/weak-password":
      return _authTexto("ui.auth_contrasena_debil", "La contraseña debe tener al menos 6 caracteres.");
    case "auth/too-many-requests":
      return _authTexto("ui.auth_demasiados_intentos", "Demasiados intentos -- espera un momento y vuelve a intentarlo.");
    case "auth/popup-blocked":
      return _authTexto("ui.auth_popup_bloqueado",
        "El navegador ha bloqueado la ventana de Google -- permite las ventanas emergentes para este sitio e inténtalo otra vez.");
    case "auth/requires-recent-login":
      return _authTexto("ui.auth_sesion_caducada", "Tu sesión ha caducado -- vuelve a iniciarla e inténtalo otra vez.");
    case "auth/network-request-failed":
      return msgSinRed;
  }

  var msg = String(error.message || error).toLowerCase();
  if ((typeof TypeError !== "undefined" && error instanceof TypeError) ||
      msg.indexOf("failed to fetch") !== -1 || msg.indexOf("network") !== -1) {
    return msgSinRed;
  }

  return _authTexto("ui.auth_error_generico", "No se pudo completar la operación. Inténtalo de nuevo.");
}

/**
 * Una cadena de la interfaz en el idioma de la pantalla, o el castellano que
 * se le pasa cuando no hay i18n.js (los tests cargan auth.js suelto). Mismo
 * patrón que `_txt` en utils.js, que auth.js no puede usar: se carga antes.
 */
function _authTexto(clave, castellano) {
  return (typeof tOr === "function") ? tOr(clave, castellano) : castellano;
}

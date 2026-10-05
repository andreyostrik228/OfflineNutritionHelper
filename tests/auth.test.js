/**
 * tests/auth.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/auth.js -- delegación en Firebase Auth, la traducción de
 * su forma (uid, un solo callback sin nombre de evento) a la que espera el
 * resto de la app (id, INITIAL_SESSION/SIGNED_IN/SIGNED_OUT), el fan-out de
 * onAuthStateChange a varios listeners propios, el orden de borrado de
 * deleteOwnAccount() y authErrorMessage(). Carga el código de PRODUCCIÓN
 * real (vm, sin copiar) e inyecta una instancia de auth simulada (mismo
 * patrón de inyección post-carga que createFakeLocalStorage() en
 * pantry.test.js).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshAuthSandbox() {
  var s = loadBrowserGlobals([projPath("js/core/auth.js")]);
  s.console = { error: function () {}, log: function () {} };
  // Lo mínimo del global `firebase` que usa auth.js: el constructor del
  // proveedor de Google para la ventana emergente.
  s.firebase = { auth: { GoogleAuthProvider: function () { this.providerId = "google.com"; } } };
  return s;
}

/**
 * Instancia de firebase.auth() simulada -- solo lo que auth.js usa, todo
 * devolviendo promesas igual que el SDK real. `emit(fbUser)` dispara
 * onAuthStateChanged como si el SDK hubiera cambiado de usuario.
 * Las respuestas se pasan como FUNCIONES (`impl.*`), no como promesas ya
 * creadas: una promesa rechazada creada de antemano y no usada en un test
 * dispara un aviso de rechazo no gestionado.
 */
function createFakeAuth(impl) {
  impl = impl || {};
  var calls = { create: [], signIn: [], popup: [], reset: [], signOut: 0, subscribeCount: 0 };
  var listeners = [];
  var auth = {
    currentUser: impl.currentUser || null,
    languageCode: null,
    onAuthStateChanged: function (cb) {
      calls.subscribeCount++;
      listeners.push(cb);
      return function () {};
    },
    createUserWithEmailAndPassword: function (email, password) {
      calls.create.push({ email: email, password: password });
      return impl.create ? impl.create(email, password) : Promise.resolve({ user: { uid: "u1", email: email } });
    },
    signInWithEmailAndPassword: function (email, password) {
      calls.signIn.push({ email: email, password: password });
      return impl.signIn ? impl.signIn(email, password) : Promise.resolve({ user: { uid: "u1", email: email } });
    },
    signInWithPopup: function (provider) {
      calls.popup.push(provider);
      return impl.popup ? impl.popup(provider) : Promise.resolve({ user: { uid: "u1" } });
    },
    sendPasswordResetEmail: function (email, settings) {
      calls.reset.push({ email: email, settings: settings, lang: auth.languageCode });
      return impl.reset ? impl.reset(email, settings) : Promise.resolve();
    },
    signOut: function () {
      calls.signOut++;
      return impl.signOut ? impl.signOut() : Promise.resolve();
    }
  };
  return {
    auth: auth,
    calls: calls,
    emit: function (fbUser) { listeners.forEach(function (fn) { fn(fbUser); }); }
  };
}

/** Un firebase.User mínimo, con delete() y getIdToken() espiables. */
function createFakeFbUser(impl) {
  impl = impl || {};
  var u = {
    uid: impl.uid || "u1",
    email: impl.email || "a@b.c",
    displayName: impl.displayName || null,
    deleteCalls: 0,
    "delete": function () {
      u.deleteCalls++;
      if (impl.log) impl.log.push("cuenta");
      return impl.del ? impl.del() : Promise.resolve();
    },
    getIdToken: function () {
      return impl.token ? impl.token() : Promise.resolve("tok-123");
    }
  };
  return u;
}

function run(t) {

  // ── Delegación en el SDK ──────────────────────────────────────────────

  t.test("signUpWithEmail() delega en createUserWithEmailAndPassword() y devuelve el usuario con `id`, no `uid`", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signUpWithEmail("a@b.c", "secret123").then(function (result) {
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fake.calls.create)), [{ email: "a@b.c", password: "secret123" }]);
      assert.strictEqual(result.error, null);
      assert.strictEqual(result.user.id, "u1");
      assert.strictEqual(result.user.email, "a@b.c");
    });
  });

  t.test("signInWithEmail() delega en signInWithEmailAndPassword()", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signInWithEmail("a@b.c", "pw").then(function (result) {
      assert.strictEqual(fake.calls.signIn.length, 1);
      assert.strictEqual(fake.calls.signIn[0].email, "a@b.c");
      assert.strictEqual(result.user.id, "u1");
    });
  });

  t.test("un error del SDK vuelve como {user:null, error}, nunca como rechazo", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth({
      signIn: function () { return Promise.reject({ code: "auth/invalid-credential" }); }
    });
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signInWithEmail("a@b.c", "mala").then(function (result) {
      assert.strictEqual(result.user, null);
      assert.strictEqual(result.error.code, "auth/invalid-credential");
    });
  });

  t.test("un SDK que LANZA síncronamente (argumentos inválidos) tampoco escapa", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth({ create: function () { throw { code: "auth/invalid-email" }; } });
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signUpWithEmail("", "x").then(function (result) {
      assert.strictEqual(result.error.code, "auth/invalid-email");
    });
  });

  t.test("signInWithGoogle() abre la ventana emergente con el proveedor de Google", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signInWithGoogle().then(function (result) {
      assert.strictEqual(fake.calls.popup.length, 1);
      assert.strictEqual(fake.calls.popup[0].providerId, "google.com");
      assert.strictEqual(result.error, null);
    });
  });

  t.test("signInWithGoogle(): cerrar la ventana sin elegir cuenta NO es un error", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth({ popup: function () { return Promise.reject({ code: "auth/popup-closed-by-user" }); } });
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signInWithGoogle().then(function (result) {
      assert.strictEqual(result.error, null);
      assert.strictEqual(result.cancelled, true);
    });
  });

  t.test("signInWithGoogle(): una ventana BLOQUEADA sí es un error, y con mensaje propio", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth({ popup: function () { return Promise.reject({ code: "auth/popup-blocked" }); } });
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signInWithGoogle().then(function (result) {
      assert.strictEqual(result.error.code, "auth/popup-blocked");
      assert.ok(s.authErrorMessage(result.error).indexOf("ventanas emergentes") !== -1);
    });
  });

  t.test("sendPasswordReset() manda el correo en el idioma de la app", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.getLang = function () { return "ru"; };

    return s.sendPasswordReset("a@b.c").then(function (result) {
      assert.strictEqual(result.error, null);
      assert.strictEqual(fake.calls.reset.length, 1);
      assert.strictEqual(fake.calls.reset[0].email, "a@b.c");
      assert.strictEqual(fake.calls.reset[0].lang, "ru");
    });
  });

  t.test("sendPasswordReset(): sin i18n cargado, el idioma cae a español", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.sendPasswordReset("a@b.c").then(function () {
      assert.strictEqual(fake.calls.reset[0].lang, "es");
    });
  });

  t.test("sendPasswordReset(): el botón 'Continuar' de Firebase vuelve al origen de la app", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.window = { location: { protocol: "https:", origin: "https://offline-nutrition-helper.pages.dev" } };

    return s.sendPasswordReset("a@b.c").then(function () {
      assert.strictEqual(fake.calls.reset[0].settings.url, "https://offline-nutrition-helper.pages.dev/");
    });
  });

  t.test("signOut() delega en auth.signOut() -- y NUNCA toca despensa/settings (responsabilidad de migration.onAuthSignOut, no de auth.js)", function () {
    var s = freshAuthSandbox();
    // A propósito: no se inyecta getPantryState/savePantryState/getSettings/
    // etc. en este sandbox -- si signOut() los llamara, esto lanzaría un
    // ReferenceError y el test fallaría. Que no falle ES la prueba del
    // límite de responsabilidad.
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.signOut().then(function (result) {
      assert.strictEqual(fake.calls.signOut, 1);
      assert.strictEqual(result.error, null);
    });
  });

  // ── Sin Firebase configurado: nunca lanza, nunca rechaza ─────────────

  t.test("todas las funciones resuelven con error 'not_configured' (nunca lanzan) cuando no hay Firebase", function () {
    var s = freshAuthSandbox();
    s.getFirebaseAuth = function () { return null; };

    return Promise.all([
      s.signUpWithEmail("a@b.c", "x"),
      s.signInWithEmail("a@b.c", "x"),
      s.signInWithGoogle(),
      s.sendPasswordReset("a@b.c"),
      s.deleteOwnAccount()
    ]).then(function (results) {
      results.forEach(function (r) {
        assert.strictEqual(r.error.message, "not_configured");
      });
      return s.signOut();
    }).then(function (r) {
      // Cerrar sesión sin cuentas no es un error: no había nada que cerrar.
      assert.strictEqual(r.error, null);
    });
  });

  t.test("isAuthAvailable() refleja si hay Firebase configurado", function () {
    var s = freshAuthSandbox();
    s.getFirebaseAuth = function () { return null; };
    assert.strictEqual(s.isAuthAvailable(), false);
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    assert.strictEqual(s.isAuthAvailable(), true);
  });

  // ── onAuthStateChange: de un callback sin nombre a eventos con nombre ─

  t.test("onAuthStateChange(): varios listeners propios se suscriben, pero al SDK solo UNA vez", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    var a = [], b = [];
    s.onAuthStateChange(function (ev) { a.push(ev); });
    s.onAuthStateChange(function (ev) { b.push(ev); });
    fake.emit(null);

    assert.strictEqual(fake.calls.subscribeCount, 1);
    assert.deepStrictEqual(a, ["INITIAL_SESSION"]);
    assert.deepStrictEqual(b, ["INITIAL_SESSION"]);
  });

  t.test("la PRIMERA llamada es INITIAL_SESSION, haya sesión o no", function () {
    [null, { uid: "u1", email: "a@b.c" }].forEach(function (fbUser) {
      var s = freshAuthSandbox();
      var fake = createFakeAuth();
      s.getFirebaseAuth = function () { return fake.auth; };
      var eventos = [];
      s.onAuthStateChange(function (ev) { eventos.push(ev); });
      fake.emit(fbUser);
      assert.deepStrictEqual(eventos, ["INITIAL_SESSION"]);
    });
  });

  t.test("nadie → alguien es SIGNED_IN; alguien → nadie es SIGNED_OUT", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    var eventos = [];
    s.onAuthStateChange(function (ev, user) { eventos.push(ev + ":" + (user ? user.id : "-")); });

    fake.emit(null);
    fake.emit({ uid: "u1" });
    fake.emit(null);

    assert.deepStrictEqual(eventos, ["INITIAL_SESSION:-", "SIGNED_IN:u1", "SIGNED_OUT:-"]);
    assert.strictEqual(s.getCurrentUser(), null);
  });

  t.test("de una persona a OTRA es SIGNED_IN (render-auth reconcilia con la nueva); la misma otra vez no es un inicio de sesión", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    var eventos = [];
    s.onAuthStateChange(function (ev, user) { eventos.push(ev + ":" + (user ? user.id : "-")); });

    fake.emit({ uid: "u1" });
    fake.emit({ uid: "u1" });
    fake.emit({ uid: "u2" });

    assert.deepStrictEqual(eventos, ["INITIAL_SESSION:u1", "USER_UPDATED:u1", "SIGNED_IN:u2"]);
  });

  t.test("el usuario que ve la app tiene la forma de siempre: id, email, user_metadata.full_name", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.onAuthStateChange(function () {});
    fake.emit({ uid: "abc", email: "x@y.z", displayName: "Andrey" });

    var u = s.getCurrentUser();
    assert.strictEqual(u.id, "abc");
    assert.strictEqual(u.email, "x@y.z");
    assert.strictEqual(u.user_metadata.full_name, "Andrey");
    assert.strictEqual(u.uid, undefined, "nadie fuera de auth.js debe poder depender de `uid`");
  });

  t.test("onAuthStateChange(): un listener que lanza no impide que los demás reciban el evento", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    var llegó = false;
    s.onAuthStateChange(function () { throw new Error("roto"); });
    s.onAuthStateChange(function () { llegó = true; });
    fake.emit(null);
    assert.strictEqual(llegó, true);
  });

  t.test("onAuthStateChange(): la función de baja deja de recibir eventos", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    var n = 0;
    var baja = s.onAuthStateChange(function () { n++; });
    fake.emit(null);
    baja();
    fake.emit({ uid: "u1" });
    assert.strictEqual(n, 1);
  });

  t.test("isAuthSessionResolved() es false hasta que llega el primer evento", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.onAuthStateChange(function () {});

    assert.strictEqual(s.isAuthSessionResolved(), false);
    fake.emit(null);
    assert.strictEqual(s.isAuthSessionResolved(), true);
  });

  t.test("isAuthSessionResolved() distingue sesión ausente de sesión presente", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.onAuthStateChange(function () {});
    fake.emit({ uid: "u1" });

    assert.strictEqual(s.isAuthSessionResolved(), true);
    assert.strictEqual(s.getCurrentUser().id, "u1");
  });

  t.test("sin cuentas configuradas, la sesión se considera resuelta al instante", function () {
    var s = freshAuthSandbox();
    s.getFirebaseAuth = function () { return null; };
    assert.strictEqual(s.isAuthSessionResolved(), true);
  });

  // ── Token para la API REST ────────────────────────────────────────────

  t.test("getAuthIdToken(): el token del usuario con sesión; null sin sesión", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.getAuthIdToken().then(function (sinSesion) {
      assert.strictEqual(sinSesion, null);
      fake.auth.currentUser = createFakeFbUser();
      return s.getAuthIdToken();
    }).then(function (tok) {
      assert.strictEqual(tok, "tok-123");
    });
  });

  t.test("getAuthIdToken(): si renovar el token falla (sin red), null -- nunca rechaza", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    fake.auth.currentUser = createFakeFbUser({ token: function () { return Promise.reject(new Error("offline")); } });
    s.getFirebaseAuth = function () { return fake.auth; };

    return s.getAuthIdToken().then(function (tok) {
      assert.strictEqual(tok, null);
    });
  });

  // ── deleteOwnAccount: el ORDEN es la parte importante ─────────────────

  t.test("deleteOwnAccount() borra los datos de la nube ANTES que la cuenta", function () {
    var s = freshAuthSandbox();
    var log = [];
    var fake = createFakeAuth();
    fake.auth.currentUser = createFakeFbUser({ log: log });
    s.getFirebaseAuth = function () { return fake.auth; };
    s.deleteCloudUserData = function () { log.push("datos"); return Promise.resolve({ error: null }); };

    return s.deleteOwnAccount().then(function (result) {
      assert.strictEqual(result.error, null);
      assert.deepStrictEqual(log, ["datos", "cuenta"],
        "al revés, sin sesión las reglas ya no dejarían borrar los datos: se quedarían huérfanos");
    });
  });

  t.test("deleteOwnAccount() cierra la sesión después de borrar", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    fake.auth.currentUser = createFakeFbUser();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.deleteCloudUserData = function () { return Promise.resolve({ error: null }); };

    return s.deleteOwnAccount().then(function () {
      assert.strictEqual(fake.calls.signOut, 1);
    });
  });

  t.test("si NO se pueden borrar los datos, la cuenta no se toca", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    var fbUser = createFakeFbUser();
    fake.auth.currentUser = fbUser;
    s.getFirebaseAuth = function () { return fake.auth; };
    s.deleteCloudUserData = function () { return Promise.resolve({ error: { status: 503, message: "HTTP 503" } }); };

    return s.deleteOwnAccount().then(function (result) {
      assert.strictEqual(result.error.status, 503);
      assert.strictEqual(fbUser.deleteCalls, 0);
    });
  });

  t.test("si Firebase pide volver a entrar, los datos se SUBEN otra vez y se pide iniciar sesión", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    fake.auth.currentUser = createFakeFbUser({
      del: function () { return Promise.reject({ code: "auth/requires-recent-login" }); }
    });
    s.getFirebaseAuth = function () { return fake.auth; };
    var subidas = 0;
    s.deleteCloudUserData = function () { return Promise.resolve({ error: null }); };
    s.pushAllToCloud = function () { subidas++; return Promise.resolve({ error: null, skipped: false }); };

    return s.deleteOwnAccount().then(function (result) {
      assert.strictEqual(subidas, 1, "la cuenta sigue viva: sus datos tienen que volver a la nube");
      assert.strictEqual(result.error.message, "not_authenticated");
      assert.ok(s.authErrorMessage(result.error).indexOf("vuelve a iniciarla") !== -1);
      assert.strictEqual(fake.calls.signOut, 0, "no se cierra la sesión de una cuenta que no se ha borrado");
    });
  });

  t.test("deleteOwnAccount() propaga un fallo real del servidor sin fingir éxito", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    fake.auth.currentUser = createFakeFbUser({
      del: function () { return Promise.reject({ code: "auth/internal-error" }); }
    });
    s.getFirebaseAuth = function () { return fake.auth; };
    s.deleteCloudUserData = function () { return Promise.resolve({ error: null }); };
    s.pushAllToCloud = function () { return Promise.resolve({ error: null }); };

    return s.deleteOwnAccount().then(function (result) {
      assert.strictEqual(result.error.code, "auth/internal-error");
    });
  });

  t.test("si la cuenta se borra pero falla el cierre de sesión, se informa de ÉXITO", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth({ signOut: function () { return Promise.reject(new Error("x")); } });
    fake.auth.currentUser = createFakeFbUser();
    s.getFirebaseAuth = function () { return fake.auth; };
    s.deleteCloudUserData = function () { return Promise.resolve({ error: null }); };

    return s.deleteOwnAccount().then(function (result) {
      assert.strictEqual(result.error, null, "la cuenta YA no existe: decir que falló sería mentir");
    });
  });

  t.test("deleteOwnAccount() sin sesión devuelve not_authenticated, sin tocar nada", function () {
    var s = freshAuthSandbox();
    var fake = createFakeAuth();
    s.getFirebaseAuth = function () { return fake.auth; };
    var tocado = false;
    s.deleteCloudUserData = function () { tocado = true; return Promise.resolve({ error: null }); };

    return s.deleteOwnAccount().then(function (result) {
      assert.strictEqual(result.error.message, "not_authenticated");
      assert.strictEqual(tocado, false);
    });
  });

  // ── authErrorMessage ─────────────────────────────────────────────────

  t.test("authErrorMessage(null) es una cadena vacía", function () {
    var s = freshAuthSandbox();
    assert.strictEqual(s.authErrorMessage(null), "");
  });

  t.test("authErrorMessage(): credenciales inválidas, en sus cuatro códigos", function () {
    var s = freshAuthSandbox();
    ["auth/invalid-credential", "auth/invalid-login-credentials", "auth/wrong-password", "auth/user-not-found"]
      .forEach(function (code) {
        assert.strictEqual(s.authErrorMessage({ code: code }), "Email o contraseña incorrectos.", code);
      });
  });

  t.test("authErrorMessage(): cuenta ya registrada, email inválido, contraseña débil, demasiados intentos", function () {
    var s = freshAuthSandbox();
    assert.ok(s.authErrorMessage({ code: "auth/email-already-in-use" }).indexOf("Ya existe una cuenta") !== -1);
    assert.ok(s.authErrorMessage({ code: "auth/invalid-email" }).indexOf("no parece válido") !== -1);
    assert.ok(s.authErrorMessage({ code: "auth/weak-password" }).indexOf("6 caracteres") !== -1);
    assert.ok(s.authErrorMessage({ code: "auth/too-many-requests" }).indexOf("Demasiados intentos") !== -1);
  });

  t.test("authErrorMessage(): sin red, un mensaje de conexión", function () {
    var s = freshAuthSandbox();
    assert.ok(s.authErrorMessage({ code: "auth/network-request-failed" }).indexOf("conexión") !== -1);
    assert.ok(s.authErrorMessage(new TypeError("Failed to fetch")).indexOf("conexión") !== -1);
  });

  t.test("authErrorMessage(): not_configured tiene su propio mensaje sobre cuentas no disponibles", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "not_configured" });
    assert.ok(msg.indexOf("todavía no están disponibles") !== -1);
  });

  t.test("authErrorMessage(): not_configured SIN red dice que falta internet, no que no hay cuentas", function () {
    var s = freshAuthSandbox();
    s.navigator = { onLine: false };
    var msg = s.authErrorMessage({ message: "not_configured" });
    assert.ok(msg.indexOf("Sin conexión") !== -1);
  });

  t.test("authErrorMessage(): un error desconocido cae en un mensaje genérico, nunca expone el mensaje crudo del SDK", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ code: "auth/something-new", message: "Firebase: Error (auth/something-new)." });
    assert.strictEqual(msg.indexOf("Firebase"), -1);
    assert.strictEqual(msg.indexOf("something-new"), -1);
    assert.ok(msg.length > 0);
  });

  // ── Los mensajes de error, en el idioma de la pantalla ─────────────────
  //
  // authErrorMessage() devolvía siempre castellano: en ruso, "Email o
  // contraseña incorrectos." aparecía en rojo bajo un formulario en ruso.

  var ERRORES_DE_ACCESO = [
    { code: "auth/invalid-credential" }, { code: "auth/wrong-password" },
    { code: "auth/email-already-in-use" }, { code: "auth/invalid-email" },
    { code: "auth/weak-password" }, { code: "auth/too-many-requests" },
    { code: "auth/popup-blocked" }, { code: "auth/requires-recent-login" },
    { code: "auth/network-request-failed" },
    { message: "not_configured" }, { message: "not_authenticated" },
    { code: "auth/algo-nuevo", message: "Failed to fetch" },     // red sin código
    { code: "auth/algo-nuevo", message: "Firebase: Error (auth/algo-nuevo)." }   // genérico
  ];

  function authConTablas() {
    var s = loadBrowserGlobals([
      projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/i18n/en.js"),
      projPath("js/i18n/ru.js"), projPath("js/core/auth.js")
    ]);
    s.console = { error: function () {}, log: function () {} };
    return s;
  }

  t.test("authErrorMessage(): en español dice EXACTAMENTE lo mismo con las tablas cargadas que sin ellas", function () {
    // El castellano vive dos veces (en auth.js, que se carga y se prueba suelto,
    // y en es.js). Este test es lo que impide que se separen.
    var sin = freshAuthSandbox();
    var con = authConTablas();
    con.saveLang("es");
    [true, false].forEach(function (enLinea) {
      sin.navigator = { onLine: enLinea };
      con.navigator = { onLine: enLinea };
      ERRORES_DE_ACCESO.forEach(function (e) {
        assert.strictEqual(con.authErrorMessage(e), sin.authErrorMessage(e), JSON.stringify(e) + " en línea=" + enLinea);
      });
    });
  });

  t.test("authErrorMessage(): en ruso y en inglés cada error sale traducido, sin español ni claves", function () {
    var detector = require("../scripts/i18n/detector");
    var s = authConTablas();
    var vistos = {};
    ["ru", "en"].forEach(function (lang) {
      s.saveLang(lang);
      [true, false].forEach(function (enLinea) {
        s.navigator = { onLine: enLinea };
        ERRORES_DE_ACCESO.forEach(function (e) {
          var msg = s.authErrorMessage(e);
          assert.ok(msg && msg.length > 10, lang + " " + JSON.stringify(e));
          assert.strictEqual(/\bui\.[a-z_]+/.test(msg), false, lang + ": se ve una clave en «" + msg + "»");
          var motivos = detector.analizarTexto(msg, lang);
          assert.deepStrictEqual(motivos, [], lang + " " + JSON.stringify(e) + ": " + motivos.join("; ") + "  <-  " + msg);
          vistos[lang + "|" + msg] = true;
        });
      });
    });
    // Y son mensajes distintos entre sí (no todos el genérico).
    assert.ok(Object.keys(vistos).length >= 20, "pocos mensajes distintos: " + Object.keys(vistos).length);
  });
}

module.exports = { run: run };

/**
 * tests/auth.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/auth.js -- delegación en `supabase.auth`, el fan-out de
 * onAuthStateChange a varios listeners propios, y authErrorMessage(). Carga
 * el código de PRODUCCIÓN real (vm, sin copiar) e inyecta un cliente
 * Supabase simulado (mismo patrón de inyección post-carga que
 * createFakeLocalStorage() en pantry.test.js).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshAuthSandbox() {
  return loadBrowserGlobals([projPath("js/core/auth.js")]);
}

/**
 * Cliente Supabase simulado -- expone solo `auth.{signUp,signInWithPassword,
 * signInWithOAuth,signOut,onAuthStateChange}`, todas devolviendo promesas
 * igual que el SDK real. `triggerAuthEvent()` deja que un test dispare un
 * evento como si el SDK real lo hubiera emitido.
 */
function createFakeSupabaseAuthClient(opts) {
  opts = opts || {};
  var calls = { signUp: [], signInWithPassword: [], signInWithOAuth: [], signOut: [], subscribeCount: 0 };
  var listeners = [];

  return {
    calls: calls,
    triggerAuthEvent: function (event, session) {
      listeners.forEach(function (fn) { fn(event, session); });
    },
    client: {
      auth: {
        signUp: function (creds) {
          calls.signUp.push(creds);
          return Promise.resolve(opts.signUpResult || { data: { user: { id: "u1", email: creds.email } }, error: null });
        },
        signInWithPassword: function (creds) {
          calls.signInWithPassword.push(creds);
          return Promise.resolve(opts.signInResult || { data: { user: { id: "u1", email: creds.email } }, error: null });
        },
        signInWithOAuth: function (params) {
          calls.signInWithOAuth.push(params);
          return Promise.resolve(opts.oauthResult || { data: {}, error: null });
        },
        signOut: function () {
          calls.signOut.push(true);
          return Promise.resolve(opts.signOutResult || { error: null });
        },
        onAuthStateChange: function (cb) {
          calls.subscribeCount++;
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: function () {} } } };
        }
      }
    }
  };
}

function run(t) {

  // ── Delegación en el SDK ──────────────────────────────────────────────

  t.test("signUpWithEmail() delega en supabase.auth.signUp() con email+password", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    return s.signUpWithEmail("nueva@example.com", "secreto123").then(function (result) {
      assert.strictEqual(fake.calls.signUp.length, 1);
      assert.strictEqual(fake.calls.signUp[0].email, "nueva@example.com");
      assert.strictEqual(fake.calls.signUp[0].password, "secreto123");
      assert.strictEqual(result.user.id, "u1");
      assert.strictEqual(result.error, null);
    });
  });

  t.test("signInWithEmail() delega en supabase.auth.signInWithPassword()", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    return s.signInWithEmail("existente@example.com", "secreto123").then(function (result) {
      assert.strictEqual(fake.calls.signInWithPassword.length, 1);
      assert.strictEqual(fake.calls.signInWithPassword[0].email, "existente@example.com");
      assert.strictEqual(result.user.email, "existente@example.com");
    });
  });

  t.test("signInWithGoogle() delega en supabase.auth.signInWithOAuth() con provider:'google'", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    return s.signInWithGoogle().then(function (result) {
      assert.strictEqual(fake.calls.signInWithOAuth.length, 1);
      assert.strictEqual(fake.calls.signInWithOAuth[0].provider, "google");
      assert.strictEqual(result.error, null);
    });
  });

  t.test("signOut() delega en supabase.auth.signOut() -- y NUNCA toca despensa/settings (responsabilidad de migration.onAuthSignOut, no de auth.js)", function () {
    var s = freshAuthSandbox();
    // A propósito: no se inyecta getPantryState/savePantryState/getSettings/
    // etc. en este sandbox -- si signOut() los llamara, esto lanzaría un
    // ReferenceError y el test fallaría. Que no falle ES la prueba del
    // límite de responsabilidad.
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    return s.signOut().then(function (result) {
      assert.strictEqual(fake.calls.signOut.length, 1);
      assert.strictEqual(result.error, null);
    });
  });

  // ── Sin Supabase configurado: nunca lanza, nunca rechaza ─────────────

  t.test("todas las funciones resuelven con error 'not_configured' (nunca lanzan) cuando no hay cliente", function () {
    var s = freshAuthSandbox();
    s.getSupabaseClient = function () { return null; };

    return Promise.all([
      s.signUpWithEmail("a@b.com", "12345678").then(function (r) {
        assert.strictEqual(r.user, null);
        assert.strictEqual(r.error.message, "not_configured");
      }),
      s.signInWithEmail("a@b.com", "12345678").then(function (r) {
        assert.strictEqual(r.error.message, "not_configured");
      }),
      s.signInWithGoogle().then(function (r) {
        assert.strictEqual(r.error.message, "not_configured");
      }),
      s.signOut().then(function (r) {
        // Cerrar sesión sin cliente/sesión es un no-op trivialmente exitoso,
        // no un error -- no hay nada que "fallara".
        assert.strictEqual(r.error, null);
      })
    ]);
  });

  t.test("isAuthAvailable() refleja si hay cliente Supabase configurado", function () {
    var s = freshAuthSandbox();
    s.getSupabaseClient = function () { return null; };
    assert.strictEqual(s.isAuthAvailable(), false);

    s.getSupabaseClient = function () { return createFakeSupabaseAuthClient().client; };
    assert.strictEqual(s.isAuthAvailable(), true);
  });

  // ── onAuthStateChange(): fan-out a varios listeners, una sola suscripción ─

  t.test("onAuthStateChange(): varios listeners propios se suscriben, pero al SDK real solo UNA vez", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    var eventsL1 = [];
    var eventsL2 = [];
    s.onAuthStateChange(function (event, user) { eventsL1.push([event, user]); });
    s.onAuthStateChange(function (event, user) { eventsL2.push([event, user]); });

    assert.strictEqual(fake.calls.subscribeCount, 1, "solo debe suscribirse una vez al SDK, sin importar cuántos listeners propios haya");

    fake.triggerAuthEvent("SIGNED_IN", { user: { id: "u1", email: "a@b.com" } });

    assert.strictEqual(eventsL1.length, 1);
    assert.strictEqual(eventsL2.length, 1);
    assert.strictEqual(eventsL1[0][0], "SIGNED_IN");
    assert.strictEqual(eventsL1[0][1].id, "u1");
    assert.strictEqual(s.getCurrentUser().id, "u1");
  });

  t.test("onAuthStateChange(): SIGNED_OUT (session null) deja getCurrentUser() en null", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    s.onAuthStateChange(function () {});
    fake.triggerAuthEvent("SIGNED_IN", { user: { id: "u1" } });
    assert.strictEqual(s.getCurrentUser().id, "u1");

    fake.triggerAuthEvent("SIGNED_OUT", null);
    assert.strictEqual(s.getCurrentUser(), null);
  });

  t.test("onAuthStateChange(): un listener que lanza no impide que los demás reciban el evento", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    var goodCalled = false;
    s.onAuthStateChange(function () { throw new Error("listener roto"); });
    s.onAuthStateChange(function () { goodCalled = true; });

    fake.triggerAuthEvent("SIGNED_IN", { user: { id: "u1" } });
    assert.strictEqual(goodCalled, true);
  });

  t.test("onAuthStateChange(): la función de baja deja de recibir eventos", function () {
    var s = freshAuthSandbox();
    var fake = createFakeSupabaseAuthClient();
    s.getSupabaseClient = function () { return fake.client; };

    var count = 0;
    var unsubscribe = s.onAuthStateChange(function () { count++; });
    fake.triggerAuthEvent("SIGNED_IN", { user: { id: "u1" } });
    assert.strictEqual(count, 1);

    unsubscribe();
    fake.triggerAuthEvent("SIGNED_IN", { user: { id: "u1" } });
    assert.strictEqual(count, 1, "no debe recibir el segundo evento tras darse de baja");
  });

  // ── authErrorMessage() -- traducción pura a español ──────────────────

  t.test("authErrorMessage(null) es una cadena vacía", function () {
    var s = freshAuthSandbox();
    assert.strictEqual(s.authErrorMessage(null), "");
  });

  t.test("authErrorMessage(): credenciales inválidas", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "Invalid login credentials" });
    assert.ok(msg.indexOf("incorrectos") !== -1);
  });

  t.test("authErrorMessage(): email sin confirmar", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "Email not confirmed" });
    assert.ok(msg.indexOf("Confirma tu email") !== -1);
  });

  t.test("authErrorMessage(): cuenta ya registrada", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "User already registered" });
    assert.ok(msg.indexOf("Ya existe una cuenta") !== -1);
  });

  t.test("authErrorMessage(): rate limit", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "Email rate limit exceeded" });
    assert.ok(msg.indexOf("Demasiados intentos") !== -1);
  });

  t.test("authErrorMessage(): not_configured tiene su propio mensaje sobre cuentas no disponibles", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "not_configured" });
    assert.ok(msg.indexOf("todavía no están disponibles") !== -1);
  });

  t.test("authErrorMessage(): un error desconocido cae en un mensaje genérico, nunca expone el mensaje crudo del SDK", function () {
    var s = freshAuthSandbox();
    var msg = s.authErrorMessage({ message: "some_internal_supabase_code_xyz" });
    assert.ok(msg.length > 0);
    assert.strictEqual(msg.indexOf("some_internal_supabase_code_xyz"), -1);
  });

}

module.exports = { run: run };

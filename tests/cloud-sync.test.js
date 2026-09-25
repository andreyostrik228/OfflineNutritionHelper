/**
 * tests/cloud-sync.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/cloud-sync.js -- el único módulo que habla con el
 * documento `user_data/{uid}` de Firestore, por su API REST. Carga el
 * código de PRODUCCIÓN real (vm, sin copiar) e inyecta un `fetch` simulado
 * que se comporta como Firestore para UN documento: PATCH con updateMask
 * escribe solo esos campos (y crea el documento si no existía), GET
 * devuelve 404 si no existe, DELETE lo borra. El sandbox de Node no tiene
 * red, así que esta es la única forma de testear la sincronización de
 * forma determinista.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

var DOC_URL = "https://firestore.googleapis.com/v1/projects/proyecto-test/databases/(default)/documents/user_data/user-1";

/**
 * Sandbox con firebase-client.js real (para que la URL la construya el
 * código de verdad) y una config válida puesta DESPUÉS de cargar -- las
 * funciones leen FIREBASE_CONFIG al llamarse, no al cargarse.
 */
function freshCloudSyncSandbox() {
  var s = loadBrowserGlobals([
    projPath("js/data/firebase-config.js"),
    projPath("js/core/firebase-client.js"),
    projPath("js/core/cloud-sync.js")
  ]);
  s.console = { error: function () {}, log: function () {} };
  s.FIREBASE_CONFIG = { apiKey: "k", authDomain: "d", projectId: "proyecto-test", appId: "a" };
  s.getCurrentUser = function () { return { id: "user-1" }; };
  s.getAuthIdToken = function () { return Promise.resolve("tok-123"); };
  return s;
}

/**
 * `fetch` que imita a Firestore para un documento.
 * @param {{falloHasta?:number, estado?:number, lanza?:boolean, rechaza?:boolean}} [opts]
 *   falloHasta: las N primeras peticiones responden 500
 *   estado:     fuerza este código en TODAS las respuestas
 */
function createFakeFirestore(opts) {
  opts = opts || {};
  var doc = null; // {fields:{...}} o null si no existe
  var calls = [];

  function responder(status, body) {
    return Promise.resolve({
      status: status,
      text: function () { return Promise.resolve(body === undefined ? "" : JSON.stringify(body)); }
    });
  }

  var fetch = function (url, init) {
    if (opts.lanza) throw new TypeError("fetch roto");
    var body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ url: url, method: init.method, headers: init.headers, body: body });
    if (opts.rechaza) return Promise.reject(new TypeError("Failed to fetch"));
    if (opts.falloHasta && calls.length <= opts.falloHasta) return responder(500, { error: { message: "boom" } });
    if (opts.estado) return responder(opts.estado, { error: { message: "forzado" } });

    var base = url.split("?")[0];
    if (base !== DOC_URL) return responder(404, { error: { message: "otra ruta: " + base } });

    if (init.method === "GET") {
      return doc ? responder(200, { name: "x", fields: doc.fields }) : responder(404, { error: { message: "NOT_FOUND" } });
    }
    if (init.method === "PATCH") {
      var mascara = (url.split("?")[1] || "").split("&")
        .filter(function (p) { return p.indexOf("updateMask.fieldPaths=") === 0; })
        .map(function (p) { return decodeURIComponent(p.split("=")[1]); });
      doc = doc || { fields: {} };
      mascara.forEach(function (campo) { doc.fields[campo] = body.fields[campo]; });
      return responder(200, { name: "x", fields: doc.fields });
    }
    if (init.method === "DELETE") {
      doc = null;
      return responder(200, {});
    }
    return responder(400, {});
  };

  return {
    fetch: fetch,
    calls: calls,
    doc: function () { return doc; },
    setDoc: function (d) { doc = d; }
  };
}

function run(t) {

  // ── skipped: sin Firebase / sin sesión, nunca intenta la red ─────────

  t.test("pushPantryToCloud(): sin Firebase configurado -> {skipped:true}, sin red", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.FIREBASE_CONFIG = { apiKey: "YOUR_FIREBASE_API_KEY", authDomain: "d", projectId: "p", appId: "YOUR_FIREBASE_APP_ID" };
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.error, null);
      assert.strictEqual(fs.calls.length, 0);
    });
  });

  t.test("pushPantryToCloud(): invitado (sin usuario) -> {skipped:true}, sin red", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getCurrentUser = function () { return null; };
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(fs.calls.length, 0);
    });
  });

  t.test("con usuario pero SIN token (no se pudo renovar) es un error, no 'invitado'", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getAuthIdToken = function () { return Promise.resolve(null); };
    s.getSettings = function () { return {}; };

    return s.pushSettingsToCloud().then(function (result) {
      assert.strictEqual(result.skipped, false);
      assert.strictEqual(result.error.message, "sin_token");
      assert.strictEqual(fs.calls.length, 0);
    });
  });

  // ── Lo que viaja ──────────────────────────────────────────────────────

  t.test("pushPantryToCloud(): PATCH al documento del usuario, con su token y SOLO pantry_state + pantry_history", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getPantryState = function () { return { arroz: { grams: 100 } }; };
    s.getPantryHistory = function () { return [{ id: "h1" }]; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.error, null);
      var c = fs.calls[0];
      assert.strictEqual(c.method, "PATCH");
      assert.strictEqual(c.url.split("?")[0], DOC_URL);
      assert.strictEqual(c.headers.Authorization, "Bearer tok-123");
      assert.deepStrictEqual(Object.keys(c.body.fields).sort(), ["pantry_history", "pantry_state"]);
      assert.ok(c.url.indexOf("updateMask.fieldPaths=pantry_state") !== -1);
      assert.ok(c.url.indexOf("updateMask.fieldPaths=pantry_history") !== -1);
      assert.ok(c.url.indexOf("settings") === -1, "sin máscara de settings no se pisan los ajustes");
    });
  });

  t.test("pushSettingsToCloud(): envía exactamente settings, nada más", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getSettings = function () { return { weight: 80 }; };

    return s.pushSettingsToCloud().then(function () {
      assert.deepStrictEqual(Object.keys(fs.calls[0].body.fields), ["settings"]);
    });
  });

  t.test("pushAllToCloud({setMigratedAt:true}): incluye migrated_at, como fecha tal cual (no JSON entrecomillado)", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };
    s.getSettings = function () { return {}; };

    return s.pushAllToCloud({ setMigratedAt: true }).then(function () {
      var f = fs.calls[0].body.fields;
      assert.deepStrictEqual(Object.keys(f).sort(), ["migrated_at", "pantry_history", "pantry_state", "settings"]);
      assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(f.migrated_at.stringValue), f.migrated_at.stringValue);
    });
  });

  t.test("pushAllToCloud() sin setMigratedAt no incluye migrated_at", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };
    s.getSettings = function () { return {}; };

    return s.pushAllToCloud().then(function () {
      assert.strictEqual(fs.calls[0].body.fields.migrated_at, undefined);
    });
  });

  t.test("todo va como TEXTO: ningún campo lleva otro tipo que stringValue (lo exigen las reglas)", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getPantryState = function () { return { a: { grams: 1 } }; };
    s.getPantryHistory = function () { return [{ id: "h" }]; };
    s.getSettings = function () { return { x: [1, [2, 3]] }; };

    return s.pushAllToCloud({ setMigratedAt: true }).then(function () {
      var f = fs.calls[0].body.fields;
      Object.keys(f).forEach(function (k) {
        assert.deepStrictEqual(Object.keys(f[k]), ["stringValue"], k);
        assert.strictEqual(typeof f[k].stringValue, "string", k);
      });
    });
  });

  // ── Ida y vuelta ──────────────────────────────────────────────────────

  t.test("lo que se sube es EXACTAMENTE lo que se baja -- arrays anidados y acentos incluidos", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    var estado = { "calabacín": { grams: 250, expiresAt: "2026-10-01" } };
    // Arrays dentro de arrays: el SDK de Firestore los rechaza. Por eso se
    // guarda el JSON como texto -- este caso es la razón de hacerlo así.
    var historial = [{ id: "h1", meals: [{ key: "comida", items: [["a", 1], ["b", 2]] }] }];
    var ajustes = { weight: 80.5, dislikes: ["atún"], updatedAt: "2026-09-25T10:00:00.000Z" };
    s.getPantryState = function () { return estado; };
    s.getPantryHistory = function () { return historial; };
    s.getSettings = function () { return ajustes; };

    return s.pushAllToCloud({ setMigratedAt: true }).then(function () {
      return s.pullCloudUserData();
    }).then(function (fila) {
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fila.pantry_state)), estado);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fila.pantry_history)), historial);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fila.settings)), ajustes);
      assert.ok(/^\d{4}-/.test(fila.migrated_at));
    });
  });

  t.test("un PATCH de la despensa NO borra los ajustes que ya había en la nube", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getSettings = function () { return { weight: 70 }; };
    s.getPantryState = function () { return { arroz: { grams: 5 } }; };
    s.getPantryHistory = function () { return []; };

    return s.pushSettingsToCloud().then(function () {
      return s.pushPantryToCloud();
    }).then(function () {
      return s.pullCloudUserData();
    }).then(function (fila) {
      assert.strictEqual(fila.settings.weight, 70);
      assert.strictEqual(fila.pantry_state.arroz.grams, 5);
    });
  });

  // ── "No existe" contra "no se pudo leer" ──────────────────────────────

  t.test("pullCloudUserData(): documento inexistente (404) -> fila VACÍA, no null", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;

    return s.pullCloudUserData().then(function (fila) {
      assert.ok(fila !== null, "404 es 'nube vacía', no 'no se pudo leer'");
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fila)),
        { pantry_state: {}, pantry_history: [], settings: {}, migrated_at: null });
    });
  });

  t.test("pullCloudUserData(): error del servidor -> null (NO una fila vacía)", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore({ estado: 500 });
    s.fetch = fs.fetch;

    return s.pullCloudUserData().then(function (fila) {
      assert.strictEqual(fila, null);
    });
  });

  t.test("pullCloudUserData(): sin red -> null, nunca rechaza", function () {
    var s = freshCloudSyncSandbox();
    s.fetch = createFakeFirestore({ rechaza: true }).fetch;

    return s.pullCloudUserData().then(function (fila) {
      assert.strictEqual(fila, null);
    });
  });

  t.test("pullCloudUserData(): permiso denegado (403, reglas) -> null", function () {
    var s = freshCloudSyncSandbox();
    s.fetch = createFakeFirestore({ estado: 403 }).fetch;

    return s.pullCloudUserData().then(function (fila) {
      assert.strictEqual(fila, null);
    });
  });

  t.test("pullCloudUserData(): un campo con JSON roto -> null, no se trata como vacío", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    fs.setDoc({ fields: { settings: { stringValue: "{roto" }, pantry_state: { stringValue: "{}" } } });

    return s.pullCloudUserData().then(function (fila) {
      assert.strictEqual(fila, null);
    });
  });

  t.test("pullCloudUserData(): un campo que falta vale lo mismo que en una fila vacía", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    fs.setDoc({ fields: { settings: { stringValue: "{\"weight\":60}" } } });

    return s.pullCloudUserData().then(function (fila) {
      assert.strictEqual(fila.settings.weight, 60);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fila.pantry_history)), []);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(fila.pantry_state)), {});
      assert.strictEqual(fila.migrated_at, null);
    });
  });

  t.test("pullCloudUserData(): sin usuario -> null, sin red", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getCurrentUser = function () { return null; };

    return s.pullCloudUserData().then(function (fila) {
      assert.strictEqual(fila, null);
      assert.strictEqual(fs.calls.length, 0);
    });
  });

  // ── Reintento y "nunca lanza" ─────────────────────────────────────────

  t.test("un push que falla UNA vez se reintenta automáticamente y acaba en éxito", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore({ falloHasta: 1 });
    s.fetch = fs.fetch;
    s.getSettings = function () { return {}; };

    return s.pushSettingsToCloud().then(function (result) {
      assert.strictEqual(fs.calls.length, 2);
      assert.strictEqual(result.error, null);
    });
  });

  t.test("un push que falla SIEMPRE se rinde tras el reintento -- nunca lanza ni rechaza", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore({ estado: 503 });
    s.fetch = fs.fetch;
    s.getSettings = function () { return {}; };

    return s.pushSettingsToCloud().then(function (result) {
      assert.strictEqual(fs.calls.length, 2, "un reintento, no más");
      assert.strictEqual(result.error.status, 503);
      assert.strictEqual(result.skipped, false);
    });
  });

  t.test("un fetch que LANZA síncronamente nunca se propaga", function () {
    var s = freshCloudSyncSandbox();
    s.fetch = createFakeFirestore({ lanza: true }).fetch;
    s.getSettings = function () { return {}; };

    return s.pushSettingsToCloud().then(function (result) {
      assert.ok(result.error);
      return s.pullCloudUserData();
    }).then(function (fila) {
      assert.strictEqual(fila, null);
    });
  });

  // ── Borrado ───────────────────────────────────────────────────────────

  t.test("deleteCloudUserData(): DELETE del documento del usuario; después, la nube está vacía", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getSettings = function () { return { weight: 1 }; };

    return s.pushSettingsToCloud().then(function () {
      return s.deleteCloudUserData();
    }).then(function (result) {
      assert.strictEqual(result.error, null);
      var del = fs.calls.filter(function (c) { return c.method === "DELETE"; });
      assert.strictEqual(del.length, 1);
      assert.strictEqual(del[0].url, DOC_URL);
      assert.strictEqual(fs.doc(), null);
    });
  });

  t.test("deleteCloudUserData(): si el servidor lo rechaza, es un error -- no un éxito", function () {
    var s = freshCloudSyncSandbox();
    s.fetch = createFakeFirestore({ estado: 403 }).fetch;

    return s.deleteCloudUserData().then(function (result) {
      assert.strictEqual(result.error.status, 403);
    });
  });

  t.test("deleteCloudUserData(): sin sesión -> not_authenticated, sin red", function () {
    var s = freshCloudSyncSandbox();
    var fs = createFakeFirestore();
    s.fetch = fs.fetch;
    s.getCurrentUser = function () { return null; };

    return s.deleteCloudUserData().then(function (result) {
      assert.strictEqual(result.error.message, "not_authenticated");
      assert.strictEqual(fs.calls.length, 0);
    });
  });

  // ── La URL ────────────────────────────────────────────────────────────

  t.test("firestoreUserDocUrl(): un id con '/' no puede salirse de su documento", function () {
    var s = freshCloudSyncSandbox();
    var url = s.firestoreUserDocUrl("a/../../otro");
    assert.ok(url.indexOf("user_data/a%2F..%2F..%2Fotro") !== -1, url);
  });

  t.test("firestoreUserDocUrl(): con la config de plantilla no hay URL", function () {
    var s = freshCloudSyncSandbox();
    s.FIREBASE_CONFIG = { apiKey: "YOUR_FIREBASE_API_KEY", authDomain: "d", projectId: "p", appId: "a" };
    assert.strictEqual(s.firestoreUserDocUrl("u"), null);
  });
}

module.exports = { run: run };

/**
 * tests/cloud-sync.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/cloud-sync.js -- el único módulo que habla con la
 * tabla `user_data`. Carga el código de PRODUCCIÓN real (vm, sin copiar)
 * e inyecta un cliente Supabase simulado (mismo patrón de inyección
 * post-carga que createFakeLocalStorage() en pantry.test.js) -- el
 * sandbox de Node no tiene red real, así que esta es la única forma de
 * testear la lógica de sincronización de forma determinista.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshCloudSyncSandbox() {
  return loadBrowserGlobals([projPath("js/core/cloud-sync.js")]);
}

/**
 * Cliente Supabase simulado -- expone solo la forma que cloud-sync.js
 * realmente usa (`from(table).update(cols).eq(col,val)` y
 * `from(table).select(cols).eq(col,val).single()`), ambos devolviendo
 * promesas, igual que el SDK real.
 * @param {{updateShouldFailUntilAttempt?:number, selectResult?:object}} [opts]
 */
function createFakeSupabaseClient(opts) {
  opts = opts || {};
  var updateCalls = [];

  return {
    updateCalls: updateCalls,
    client: {
      from: function (table) {
        return {
          update: function (columns) {
            updateCalls.push({ table: table, columns: columns });
            var attempt = updateCalls.length;
            return {
              eq: function () {
                var shouldFail = opts.updateShouldFailUntilAttempt && attempt <= opts.updateShouldFailUntilAttempt;
                return Promise.resolve(shouldFail ? { error: { message: "network error" } } : { error: null });
              }
            };
          },
          select: function () {
            return {
              eq: function () {
                return {
                  single: function () {
                    return Promise.resolve(opts.selectResult || { data: null, error: null });
                  }
                };
              }
            };
          }
        };
      }
    }
  };
}

function run(t) {

  // ── skipped: sin cliente / sin sesión, nunca intenta la red ──────────

  t.test("pushPantryToCloud(): sin cliente Supabase -> {skipped:true}, no lanza", function () {
    var s = freshCloudSyncSandbox();
    s.getSupabaseClient = function () { return null; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return { arroz: { grams: 100 } }; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.error, null);
    });
  });

  t.test("pushPantryToCloud(): con cliente pero sin usuario (invitado) -> {skipped:true}, no lanza", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient();
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return null; };
    s.getPantryState = function () { return { arroz: { grams: 100 } }; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(fake.updateCalls.length, 0, "modo invitado nunca debe llegar a llamar a la red");
    });
  });

  // ── push: forma exacta del payload ────────────────────────────────────

  t.test("pushPantryToCloud(): envía exactamente pantry_state + pantry_history, nada más", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient();
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return { arroz: { grams: 100 } }; };
    s.getPantryHistory = function () { return [{ id: "h1" }]; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.error, null);
      assert.strictEqual(fake.updateCalls.length, 1);
      var columns = fake.updateCalls[0].columns;
      assert.deepStrictEqual(Object.keys(columns).sort(), ["pantry_history", "pantry_state"]);
      assert.deepStrictEqual(columns.pantry_state, { arroz: { grams: 100 } });
      assert.deepStrictEqual(columns.pantry_history, [{ id: "h1" }]);
    });
  });

  t.test("pushSettingsToCloud(): envía exactamente settings, nada más", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient();
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getSettings = function () { return { age: 30, updatedAt: "2026-01-01T00:00:00.000Z" }; };

    return s.pushSettingsToCloud().then(function () {
      assert.strictEqual(fake.updateCalls.length, 1);
      assert.deepStrictEqual(Object.keys(fake.updateCalls[0].columns), ["settings"]);
    });
  });

  t.test("pushAllToCloud({setMigratedAt:true}): incluye migrated_at además de los tres bloques", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient();
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };
    s.getSettings = function () { return {}; };

    return s.pushAllToCloud({ setMigratedAt: true }).then(function () {
      var columns = fake.updateCalls[0].columns;
      assert.ok(columns.migrated_at, "migrated_at debe fijarse cuando setMigratedAt es true");
    });
  });

  t.test("pushAllToCloud() sin setMigratedAt no incluye migrated_at en el payload", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient();
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };
    s.getSettings = function () { return {}; };

    return s.pushAllToCloud().then(function () {
      assert.strictEqual("migrated_at" in fake.updateCalls[0].columns, false);
    });
  });

  // ── reintento: un fallo se reintenta una vez, dos fallos se rinden ───

  t.test("un push que falla UNA vez se reintenta automáticamente y acaba en éxito", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient({ updateShouldFailUntilAttempt: 1 });
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return {}; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.strictEqual(result.error, null);
      assert.strictEqual(fake.updateCalls.length, 2, "debe haber exactamente un reintento");
    });
  });

  t.test("un push que falla SIEMPRE se rinde en silencio tras el reintento -- nunca lanza ni rechaza", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient({ updateShouldFailUntilAttempt: 99 });
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return { arroz: { grams: 100 } }; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.ok(result.error, "el resultado debe reflejar el error...");
      assert.strictEqual(fake.updateCalls.length, 2, "...pero solo tras un único reintento, no un bucle infinito");
      // Y la propia llamada local (getPantryState) no se vio afectada --
      // el fallo de red nunca debe corromper nada local.
      assert.deepStrictEqual(s.getPantryState(), { arroz: { grams: 100 } });
    });
  });

  // ── un cliente roto que lanza de forma SÍNCRONA nunca escapa ─────────

  t.test("pushPantryToCloud(): un cliente que lanza síncronamente en from() nunca se propaga, resuelve con error", function () {
    var s = freshCloudSyncSandbox();
    s.getSupabaseClient = function () {
      return { from: function () { throw new Error("cliente roto"); } };
    };
    s.getCurrentUser = function () { return { id: "user-1" }; };
    s.getPantryState = function () { return { arroz: { grams: 100 } }; };
    s.getPantryHistory = function () { return []; };

    return s.pushPantryToCloud().then(function (result) {
      assert.ok(result.error);
      // Y el estado local sigue intacto -- el fallo nunca corrompe nada.
      assert.deepStrictEqual(s.getPantryState(), { arroz: { grams: 100 } });
    });
  });

  t.test("pullCloudUserData(): un cliente que lanza síncronamente en from() nunca se propaga, resuelve null", function () {
    var s = freshCloudSyncSandbox();
    s.getSupabaseClient = function () {
      return { from: function () { throw new Error("cliente roto"); } };
    };
    s.getCurrentUser = function () { return { id: "user-1" }; };

    return s.pullCloudUserData().then(function (result) {
      assert.strictEqual(result, null);
    });
  });

  // ── pull ──────────────────────────────────────────────────────────────

  t.test("pullCloudUserData(): sin cliente/usuario -> null, no lanza", function () {
    var s = freshCloudSyncSandbox();
    s.getSupabaseClient = function () { return null; };
    s.getCurrentUser = function () { return null; };

    return s.pullCloudUserData().then(function (row) {
      assert.strictEqual(row, null);
    });
  });

  t.test("pullCloudUserData(): devuelve la fila tal cual cuando la consulta tiene éxito", function () {
    var s = freshCloudSyncSandbox();
    var row = { pantry_state: { arroz: { grams: 100 } }, pantry_history: [], settings: {}, migrated_at: null };
    var fake = createFakeSupabaseClient({ selectResult: { data: row, error: null } });
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };

    return s.pullCloudUserData().then(function (result) {
      assert.deepStrictEqual(result, row);
    });
  });

  t.test("pullCloudUserData(): un error de la consulta se traduce en null, nunca lanza", function () {
    var s = freshCloudSyncSandbox();
    var fake = createFakeSupabaseClient({ selectResult: { data: null, error: { message: "boom" } } });
    s.getSupabaseClient = function () { return fake.client; };
    s.getCurrentUser = function () { return { id: "user-1" }; };

    return s.pullCloudUserData().then(function (result) {
      assert.strictEqual(result, null);
    });
  });

}

module.exports = { run: run };

/**
 * tests/migration.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/migration.js -- la máquina de estados pura
 * (classifySyncState/merge*) y la orquestación (runReconciliation/
 * resolveConflict.../onAuthSignOut), esta última con un cliente Supabase
 * simulado (getCurrentUser/pullCloudUserData/pushAllToCloud inyectados en
 * el sandbox tras cargar el código real -- mismo patrón de inyección
 * post-carga que createFakeLocalStorage() en pantry.test.js). Carga el
 * código de PRODUCCIÓN real (vm, sin copiar).
 *
 * Casos especialmente importantes (ver cabecera de migration.js):
 *   - un navegador compartido nunca filtra la caché de un usuario hacia
 *     la cuenta de otro ('clear_cross_user');
 *   - 'already_synced' nunca vuelve a preguntar, aunque los datos hayan
 *     divergido desde la última reconciliación;
 *   - reconciliar dos veces seguidas sin mutar nada entre medias es un
 *     no-op real la segunda vez (la idempotencia pedida explícitamente).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshMigrationSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/pantry.js"),
    projPath("js/core/settings.js"),
    projPath("js/core/migration.js")
  ]);
}

function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

/**
 * Instala un "cliente Supabase" mínimo en el sandbox: un objeto `cloud`
 * mutable que representa la fila `user_data` del usuario, más
 * getCurrentUser/pullCloudUserData/pushAllToCloud con la misma forma que
 * js/core/auth.js / js/core/cloud-sync.js exponen de verdad.
 * @returns {{cloud:object, pushCalls:number}}
 */
function installFakeCloud(s, userId, initialCloudRow) {
  var state = {
    cloud: initialCloudRow || { pantry_state: {}, pantry_history: [], settings: {}, migrated_at: null },
    pushCalls: 0
  };

  s.getCurrentUser = function () { return userId ? { id: userId } : null; };
  s.pullCloudUserData = function () { return Promise.resolve(state.cloud); };
  s.pushAllToCloud = function (options) {
    state.pushCalls++;
    state.cloud = {
      pantry_state: s.getPantryState(),
      pantry_history: s.getPantryHistory(),
      settings: s.getSettings(),
      migrated_at: (options && options.setMigratedAt) ? new Date().toISOString() : state.cloud.migrated_at
    };
    return Promise.resolve({ error: null, skipped: false });
  };

  return state;
}

function run(t) {

  // ── hasSnapshotContent() ─────────────────────────────────────────────

  t.test("hasSnapshotContent(null) es false", function () {
    var s = freshMigrationSandbox();
    assert.strictEqual(s.hasSnapshotContent(null), false);
  });

  t.test("hasSnapshotContent() con settings SOLO {updatedAt} no cuenta como contenido real", function () {
    var s = freshMigrationSandbox();
    var has = s.hasSnapshotContent({ pantry_state: {}, pantry_history: [], settings: { updatedAt: "2026-01-01T00:00:00.000Z" } });
    assert.strictEqual(has, false);
  });

  t.test("hasSnapshotContent() con un ingrediente en pantry_state es true", function () {
    var s = freshMigrationSandbox();
    var has = s.hasSnapshotContent({ pantry_state: { arroz: { grams: 100 } }, pantry_history: [], settings: {} });
    assert.strictEqual(has, true);
  });

  t.test("hasSnapshotContent() con historial no vacío es true aunque el resto esté vacío", function () {
    var s = freshMigrationSandbox();
    var has = s.hasSnapshotContent({ pantry_state: {}, pantry_history: [{ id: "h1" }], settings: {} });
    assert.strictEqual(has, true);
  });

  // ── classifySyncState() -- máquina de estados pura ───────────────────

  t.test("classifySyncState: navegador nuevo, nube vacía, local con datos -> 'push'", function () {
    var s = freshMigrationSandbox();
    var state = s.classifySyncState(
      { pantry_state: { arroz: { grams: 100 } }, pantry_history: [], settings: {} },
      { pantry_state: {}, pantry_history: [], settings: {} },
      null, "user-1"
    );
    assert.strictEqual(state, "push");
  });

  t.test("classifySyncState: navegador nuevo, nube con datos, local vacío -> 'pull'", function () {
    var s = freshMigrationSandbox();
    var state = s.classifySyncState(
      { pantry_state: {}, pantry_history: [], settings: {} },
      { pantry_state: { arroz: { grams: 100 } }, pantry_history: [], settings: {} },
      null, "user-1"
    );
    assert.strictEqual(state, "pull");
  });

  t.test("classifySyncState: ambos con datos, navegador nuevo -> 'conflict'", function () {
    var s = freshMigrationSandbox();
    var state = s.classifySyncState(
      { pantry_state: { arroz: { grams: 100 } }, pantry_history: [], settings: {} },
      { pantry_state: { pollo: { grams: 200 } }, pantry_history: [], settings: {} },
      null, "user-1"
    );
    assert.strictEqual(state, "conflict");
  });

  t.test("classifySyncState: nada en ningún sitio -> 'pull' (no-op seguro)", function () {
    var s = freshMigrationSandbox();
    var state = s.classifySyncState(
      { pantry_state: {}, pantry_history: [], settings: {} },
      { pantry_state: {}, pantry_history: [], settings: {} },
      null, "user-1"
    );
    assert.strictEqual(state, "pull");
  });

  t.test("classifySyncState: marcador de OTRO usuario en este navegador -> 'clear_cross_user'", function () {
    var s = freshMigrationSandbox();
    var state = s.classifySyncState(
      { pantry_state: { arroz: { grams: 100 } }, pantry_history: [], settings: {} },
      { pantry_state: {}, pantry_history: [], settings: {} },
      "user-0", "user-1"
    );
    assert.strictEqual(state, "clear_cross_user");
  });

  t.test("classifySyncState: marcador del MISMO usuario -> 'already_synced', incluso si local y nube divergen", function () {
    var s = freshMigrationSandbox();
    var state = s.classifySyncState(
      { pantry_state: { arroz: { grams: 999 } }, pantry_history: [], settings: {} },
      { pantry_state: { pollo: { grams: 1 } }, pantry_history: [], settings: {} },
      "user-1", "user-1"
    );
    assert.strictEqual(state, "already_synced");
  });

  // ── mergePantryStateBlobs() -- suma por ingrediente ──────────────────

  t.test("mergePantryStateBlobs() suma gramos del mismo ingrediente en ambos lados", function () {
    var s = freshMigrationSandbox();
    var merged = s.mergePantryStateBlobs(
      { arroz: { grams: 100, displayName: "Arroz" } },
      { arroz: { grams: 50, displayName: "Arroz" } }
    );
    assert.strictEqual(merged.arroz.grams, 150);
  });

  t.test("mergePantryStateBlobs() conserva ingredientes que solo están en un lado", function () {
    var s = freshMigrationSandbox();
    var merged = s.mergePantryStateBlobs(
      { arroz: { grams: 100, displayName: "Arroz" } },
      { pollo: { grams: 200, displayName: "Pollo" } }
    );
    assert.strictEqual(merged.arroz.grams, 100);
    assert.strictEqual(merged.pollo.grams, 200);
  });

  // ── mergePantryHistoryBlobs() -- concat + dedupe + cap ───────────────

  t.test("mergePantryHistoryBlobs() deduplica por id (misma entrada en ambos lados no se duplica)", function () {
    var s = freshMigrationSandbox();
    var entry = { id: "h1", createdAt: "2026-01-01T00:00:00.000Z" };
    var merged = s.mergePantryHistoryBlobs([entry], [entry]);
    assert.strictEqual(merged.length, 1);
  });

  t.test("mergePantryHistoryBlobs() ordena por createdAt descendente y recorta a PANTRY_HISTORY_MAX_ENTRIES", function () {
    var s = freshMigrationSandbox();
    var local = [];
    var cloud = [];
    for (var i = 0; i < 20; i++) {
      local.push({ id: "local-" + i, createdAt: new Date(2026, 0, i + 1).toISOString() });
      cloud.push({ id: "cloud-" + i, createdAt: new Date(2026, 1, i + 1).toISOString() });
    }
    var merged = s.mergePantryHistoryBlobs(local, cloud);
    assert.strictEqual(merged.length, s.PANTRY_HISTORY_MAX_ENTRIES);
    // Todas las de febrero (cloud) son más recientes que todas las de enero
    // (local) -- las primeras 20 del resultado deben ser las de cloud.
    assert.ok(merged.slice(0, 20).every(function (e) { return e.id.indexOf("cloud-") === 0; }));
  });

  // ── mergeSettingsBlobs() -- gana el updatedAt más reciente, entero ────

  t.test("mergeSettingsBlobs() elige el lado con updatedAt más reciente completo (sin fusión campo a campo)", function () {
    var s = freshMigrationSandbox();
    var older = { age: 25, goal: "cut", updatedAt: "2026-01-01T00:00:00.000Z" };
    var newer = { age: 30, goal: "bulk", updatedAt: "2026-02-01T00:00:00.000Z" };
    var merged = s.mergeSettingsBlobs(older, newer);
    assert.strictEqual(merged.age, 30);
    assert.strictEqual(merged.goal, "bulk");
  });

  // ── runReconciliation() -- orquestación async ────────────────────────

  t.test("runReconciliation(): sin usuario autenticado -> {status:'no_user'}, no toca nada", function () {
    var s = freshMigrationSandbox();
    installFakeCloud(s, null);
    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "no_user");
    });
  });

  t.test("runReconciliation(): primer login, datos locales, nube vacía -> 'pushed', nube queda con la copia local", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 150);
    var fake = installFakeCloud(s, "user-1");

    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "pushed");
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
      assert.strictEqual(fake.cloud.pantry_state[s.normalizeIngredientKey("Arroz blanco cocido")].grams, 150);
      assert.ok(fake.cloud.migrated_at, "migrated_at debería sellarse en el primer push");
    });
  });

  t.test("runReconciliation(): primer login, nube con datos, local vacío -> 'pulled', local queda con la copia de la nube", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    var cloudRow = {
      pantry_state: { pollo: { grams: 200, displayName: "Pollo" } },
      pantry_history: [],
      settings: { age: 33, updatedAt: "2026-01-01T00:00:00.000Z" },
      migrated_at: "2026-01-01T00:00:00.000Z"
    };
    installFakeCloud(s, "user-1", cloudRow);

    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "pulled");
      assert.strictEqual(s.getStock("pollo"), 200);
      assert.strictEqual(s.getSettings().age, 33);
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
    });
  });

  t.test("runReconciliation(): datos en ambos lados, navegador nuevo -> 'conflict', NO fija el marcador todavía", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 100);
    var cloudRow = { pantry_state: { pollo: { grams: 200, displayName: "Pollo" } }, pantry_history: [], settings: {}, migrated_at: "2026-01-01T00:00:00.000Z" };
    installFakeCloud(s, "user-1", cloudRow);

    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "conflict");
      assert.ok(result.cloudRow);
      assert.ok(result.localSnapshot);
      assert.strictEqual(s.getCloudSyncedUserId(), null, "el marcador no debe fijarse hasta que el usuario decida");
    });
  });

  t.test("runReconciliation(): reconciliar dos veces seguidas sin mutar nada es un no-op real la segunda vez", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 150);
    var fake = installFakeCloud(s, "user-1");

    return s.runReconciliation().then(function (first) {
      assert.strictEqual(first.status, "pushed");
      var pushCallsAfterFirst = fake.pushCalls;

      return s.runReconciliation().then(function (second) {
        assert.strictEqual(second.status, "already_synced");
        assert.strictEqual(fake.pushCalls, pushCallsAfterFirst, "la segunda reconciliación no debe volver a empujar nada");
        // Tampoco debe haber duplicado el stock (bug real que un guardián
        // basado solo en migrated_at no detectaría).
        assert.strictEqual(s.getStock("arroz blanco cocido"), 150);
      });
    });
  });

  t.test("runReconciliation(): navegador con caché de OTRO usuario se vacía antes de adoptar los datos del usuario actual", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    // Simula la caché que dejó un usuario anterior en este navegador.
    s.setStock("Arroz blanco cocido", 999);
    s.setCloudSyncedUserId("user-0");

    var cloudRow = { pantry_state: { pollo: { grams: 50, displayName: "Pollo" } }, pantry_history: [], settings: {}, migrated_at: "2026-01-01T00:00:00.000Z" };
    installFakeCloud(s, "user-1", cloudRow);

    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "pulled");
      assert.strictEqual(s.getStock("arroz blanco cocido"), 0, "el arroz del usuario anterior no debe sobrevivir");
      assert.strictEqual(s.getStock("pollo"), 50, "los datos del usuario actual sí deben adoptarse");
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
    });
  });

  // ── resolveConflict*() ────────────────────────────────────────────────

  t.test("resolveConflictKeepCloud(): descarta lo local, adopta la nube, fija el marcador", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 100);
    var cloudRow = { pantry_state: { pollo: { grams: 200, displayName: "Pollo" } }, pantry_history: [], settings: {}, migrated_at: null };
    installFakeCloud(s, "user-1", cloudRow);

    return s.resolveConflictKeepCloud().then(function () {
      assert.strictEqual(s.getStock("arroz blanco cocido"), 0);
      assert.strictEqual(s.getStock("pollo"), 200);
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
    });
  });

  t.test("resolveConflictKeepLocal(): sobrescribe la nube con lo local, fija el marcador", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 100);
    var cloudRow = { pantry_state: { pollo: { grams: 200, displayName: "Pollo" } }, pantry_history: [], settings: {}, migrated_at: null };
    var fake = installFakeCloud(s, "user-1", cloudRow);

    return s.resolveConflictKeepLocal().then(function () {
      assert.strictEqual(fake.cloud.pantry_state.pollo, undefined);
      assert.strictEqual(fake.cloud.pantry_state[s.normalizeIngredientKey("Arroz blanco cocido")].grams, 100);
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
    });
  });

  t.test("resolveConflictMerge(): combina despensa (suma) y guarda local Y nube por igual", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 100);
    var cloudRow = {
      pantry_state: { [s.normalizeIngredientKey("Arroz blanco cocido")]: { grams: 50, displayName: "Arroz blanco cocido" } },
      pantry_history: [], settings: {}, migrated_at: null
    };
    var fake = installFakeCloud(s, "user-1", cloudRow);

    return s.resolveConflictMerge(cloudRow).then(function () {
      assert.strictEqual(s.getStock("arroz blanco cocido"), 150);
      assert.strictEqual(fake.cloud.pantry_state[s.normalizeIngredientKey("Arroz blanco cocido")].grams, 150);
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
    });
  });

  // ── onAuthSignOut() ───────────────────────────────────────────────────

  t.test("onAuthSignOut(): vacía despensa/historial/settings y el marcador de este navegador", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 100);
    s.saveSettings({ age: 30 });
    s.setCloudSyncedUserId("user-1");

    s.onAuthSignOut();

    assert.strictEqual(Object.keys(s.getPantryState()).length, 0);
    assert.strictEqual(s.getPantryHistory().length, 0);
    assert.strictEqual(Object.keys(s.getSettings()).length, 0);
    assert.strictEqual(s.getCloudSyncedUserId(), null);
  });

}

module.exports = { run: run };

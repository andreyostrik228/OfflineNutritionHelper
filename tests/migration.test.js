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

  // ── La nube ILEGIBLE no es la nube VACÍA (bug real, 2026-09-25) ───────
  // pullCloudUserData() devuelve null cuando NO PUDO LEER (sin red, token
  // caducado, servidor caído). Antes eso se trataba como "nube vacía": un
  // usuario con sesión que abría la app sin cobertura pasaba por
  // 'already_synced', se hidrataba desde null y se quedaba con la
  // despensa, el historial y los ajustes en blanco.

  t.test("runReconciliation(): sesión ya sincronizada y nube ILEGIBLE -> 'cloud_unavailable', lo local INTACTO", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 150);
    installFakeCloud(s, "user-1");
    s.setCloudSyncedUserId("user-1");
    s.pullCloudUserData = function () { return Promise.resolve(null); };

    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "cloud_unavailable");
      assert.strictEqual(s.getPantryState()[s.normalizeIngredientKey("Arroz blanco cocido")].grams, 150,
        "la despensa no puede vaciarse por no haber podido leer la nube");
      assert.strictEqual(s.getCloudSyncedUserId(), "user-1");
    });
  });

  t.test("runReconciliation(): navegador nuevo con datos y nube ILEGIBLE -> no se empuja nada a ciegas ni se fija el marcador", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 150);
    var fake = installFakeCloud(s, "user-1");
    s.pullCloudUserData = function () { return Promise.resolve(null); };

    return s.runReconciliation().then(function (result) {
      assert.strictEqual(result.status, "cloud_unavailable");
      assert.strictEqual(fake.pushCalls, 0, "sin saber qué hay en la nube, pisarla con lo local podría borrar datos de otro dispositivo");
      assert.strictEqual(s.getCloudSyncedUserId(), null);
    });
  });

  t.test("resolveConflictKeepCloud(): con la nube ILEGIBLE no sustituye lo local por nada", function () {
    var s = freshMigrationSandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Arroz blanco cocido", 150);
    installFakeCloud(s, "user-1");
    s.pullCloudUserData = function () { return Promise.resolve(null); };

    return s.resolveConflictKeepCloud().then(function () {
      assert.strictEqual(s.getPantryState()[s.normalizeIngredientKey("Arroz blanco cocido")].grams, 150);
      assert.strictEqual(s.getCloudSyncedUserId(), null, "el conflicto sigue abierto");
    });
  });

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


  // ── Preferencias de la CUENTA: aspecto y marcas del alta ──────────────
  // Reportado el 2026-10-07: «одно и то же оформление на всех аккаунтах даже
  // если я его только что создал» y «не могу посмотреть тур». El aspecto y las
  // marcas «cuestionario hecho» / «recorrido visto» vivían solo en el
  // dispositivo: una cuenta nueva heredaba las de la anterior. Ahora viajan en
  // la cuenta (js/core/account-prefs.js) y se vacían al cerrar sesión.
  function freshPrefsSandbox(userId, filaNube) {
    var s = loadBrowserGlobals([
      projPath("js/core/look.js"),
      projPath("js/core/settings.js"),
      projPath("js/core/onboarding.js"),
      projPath("js/core/account-prefs.js"),
      projPath("js/core/migration.js")
    ]);
    s.localStorage = createFakeLocalStorage();
    var estado = {
      cloud: filaNube || { pantry_state: {}, pantry_history: [], settings: {}, migrated_at: null },
      pushes: 0,
      ultimosAjustes: null
    };
    s.getCurrentUser = function () { return userId ? { id: userId } : null; };
    s.pullCloudUserData = function () { return Promise.resolve(estado.cloud); };
    s.pushSettingsToCloud = function () {
      estado.pushes++;
      estado.ultimosAjustes = JSON.parse(JSON.stringify(s.settingsWithAccountPrefs(s.getSettings())));
      return Promise.resolve({ error: null, skipped: false });
    };
    s.pushAllToCloud = function () { return s.pushSettingsToCloud(); };
    return { s: s, estado: estado };
  }

  t.test("hasSnapshotContent: unas preferencias de cuenta solas NO son datos del usuario", function () {
    var s = freshMigrationSandbox();
    assert.strictEqual(s.hasSnapshotContent({ pantry_state: {}, pantry_history: [], settings: { _prefs: { look: "noche" } } }), false);
    assert.strictEqual(s.hasSnapshotContent({ pantry_state: {}, pantry_history: [], settings: { age: 30, _prefs: { look: "noche" } } }), true);
  });

  t.test("cerrar sesión devuelve el dispositivo a los valores de fábrica: aspecto por defecto, cuestionario y recorrido sin hacer", function () {
    var e = freshPrefsSandbox("user-A");
    var s = e.s;
    s.saveLook("noche");
    s.acceptTerms("1.0");
    s.completeIntake();
    s.completeTour();
    assert.strictEqual(s.getLook(), "noche");
    s.onAuthSignOut();
    assert.strictEqual(s.getLook(), s.DEFAULT_LOOK, "el aspecto de la cuenta anterior no se queda en el dispositivo");
    var estado = JSON.parse(JSON.stringify(s.getOnboardingState()));
    assert.strictEqual(estado.intakeDoneAt, undefined, "el cuestionario era de la cuenta anterior");
    assert.strictEqual(estado.tourDoneAt, undefined, "el recorrido era de la cuenta anterior");
    assert.strictEqual(estado.termsVersion, "1.0", "las condiciones aceptadas SÍ son del dispositivo");
  });

  t.test("una cuenta NUEVA no hereda el aspecto ni el recorrido de otra: arranca de fábrica y sube sus preferencias", function () {
    var e = freshPrefsSandbox("user-B");
    var s = e.s;
    return s.runReconciliation().then(function (r) {
      assert.strictEqual(r.status, "pulled");
      assert.strictEqual(s.getLook(), s.DEFAULT_LOOK);
      assert.strictEqual(JSON.parse(JSON.stringify(s.getOnboardingState())).tourDoneAt, undefined, "a una cuenta nueva hay que ofrecerle el recorrido");
      assert.strictEqual(e.estado.pushes, 1, "la cuenta recibe sus preferencias");
      assert.strictEqual(e.estado.ultimosAjustes._prefs.look, s.DEFAULT_LOOK);
    });
  });

  t.test("las preferencias de la cuenta MANDAN sobre las del dispositivo (y lo que falta cuenta como sin hacer)", function () {
    var fila = {
      pantry_state: {}, pantry_history: [], migrated_at: null,
      settings: { _prefs: { look: "kitty", intakeDoneAt: "2026-10-01T00:00:00.000Z" } }
    };
    var e = freshPrefsSandbox("user-C", fila);
    var s = e.s;
    s.saveLook("noche");              // lo que eligió quien usaba el dispositivo
    s.completeTour();
    return s.runReconciliation().then(function () {
      assert.strictEqual(s.getLook(), "kitty");
      var estado = JSON.parse(JSON.stringify(s.getOnboardingState()));
      assert.strictEqual(estado.intakeDoneAt, "2026-10-01T00:00:00.000Z");
      assert.strictEqual(estado.tourDoneAt, undefined, "esta cuenta todavía no ha visto el recorrido");
      assert.strictEqual(e.estado.pushes, 0, "la cuenta ya tenía preferencias: no se pisan");
    });
  });

  t.test("misma cuenta en otro dispositivo (already_synced): lo que cambió en el primero llega al segundo", function () {
    var fila = { pantry_state: {}, pantry_history: [], migrated_at: null, settings: { _prefs: { look: "avena" } } };
    var e = freshPrefsSandbox("user-C", fila);
    var s = e.s;
    s.setCloudSyncedUserId("user-C");
    s.saveLook("hojas");
    return s.runReconciliation().then(function (r) {
      assert.strictEqual(r.status, "already_synced");
      assert.strictEqual(s.getLook(), "avena");
    });
  });

  t.test("otra cuenta en el mismo dispositivo (clear_cross_user) no hereda el aspecto ni las marcas de la anterior", function () {
    var e = freshPrefsSandbox("user-B");
    var s = e.s;
    s.setCloudSyncedUserId("user-A");      // la caché de este dispositivo es de A
    s.saveLook("noche");
    s.completeIntake();
    s.completeTour();
    return s.runReconciliation().then(function () {
      assert.strictEqual(s.getLook(), s.DEFAULT_LOOK, "B no puede ver el aspecto de A");
      var estado = JSON.parse(JSON.stringify(s.getOnboardingState()));
      assert.strictEqual(estado.intakeDoneAt, undefined);
      assert.strictEqual(estado.tourDoneAt, undefined);
    });
  });

  t.test("un aspecto inventado en la nube se ignora: nunca llega al DOM ni a una ruta", function () {
    var fila = { pantry_state: {}, pantry_history: [], migrated_at: null, settings: { _prefs: { look: "<script>alert(1)</script>" } } };
    var e = freshPrefsSandbox("user-E", fila);
    var s = e.s;
    s.saveLook("noche");
    return s.runReconciliation().then(function () {
      assert.strictEqual(s.getLook(), "noche", "se queda el aspecto que había");
    });
  });

  t.test("no se suben preferencias sin sesión, ni antes de que termine la reconciliación de esa cuenta", function () {
    var e = freshPrefsSandbox("user-D");
    var s = e.s;
    return s.pushAccountPrefsToCloud().then(function (r) {
      assert.strictEqual(r.skipped, true);
      assert.strictEqual(e.estado.pushes, 0, "subir antes de reconciliar podía pisar el perfil de la cuenta con un bloque casi vacío");
      s.setCloudSyncedUserId("user-D");
      return s.pushAccountPrefsToCloud();
    }).then(function () {
      assert.strictEqual(e.estado.pushes, 1);
      var e2 = freshPrefsSandbox(null);
      return e2.s.pushAccountPrefsToCloud().then(function (r2) {
        assert.strictEqual(r2.skipped, true);
        assert.strictEqual(e2.estado.pushes, 0, "un invitado no sube nada");
      });
    });
  });

  t.test("completar el recorrido o el cuestionario con la cuenta al día sube la marca a la cuenta", function () {
    var e = freshPrefsSandbox("user-F");
    var s = e.s;
    s.setCloudSyncedUserId("user-F");
    s.completeTour();
    return Promise.resolve().then(function () {
      assert.strictEqual(e.estado.pushes, 1);
      assert.ok(e.estado.ultimosAjustes._prefs.tourDoneAt, "la marca del recorrido viaja en _prefs");
      s.completeIntake();
      assert.strictEqual(e.estado.pushes, 2);
      assert.ok(e.estado.ultimosAjustes._prefs.intakeDoneAt);
    });
  });

  t.test("conflicto, «usar los de la nube»: las preferencias de la cuenta también se adoptan", function () {
    var fila = { pantry_state: {}, pantry_history: [], migrated_at: null, settings: { age: 40, updatedAt: "2026-10-01T00:00:00.000Z", _prefs: { look: "revista" } } };
    var e = freshPrefsSandbox("user-G", fila);
    var s = e.s;
    s.saveLook("noche");
    return s.resolveConflictKeepCloud().then(function () {
      assert.strictEqual(s.getLook(), "revista");
      assert.strictEqual(s.getCloudSyncedUserId(), "user-G");
    });
  });
}

module.exports = { run: run };

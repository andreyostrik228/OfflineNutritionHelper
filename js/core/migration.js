/**
 * js/core/migration.js
 * ─────────────────────────────────────────────────────────────────────────
 * Reconcilia los datos de ESTE navegador (localStorage, vía pantry.js/
 * settings.js) con la cuenta que acaba de iniciar sesión. Idempotente por
 * diseño y a salvo de un peligro real que un guardián ingenuo ("¿esta
 * cuenta ya migró alguna vez?", solo mirando `migrated_at` en la nube) NO
 * cubre: un ordenador compartido. Si el usuario A sincronizó y cerró
 * sesión sin que nadie borrase localStorage, y el usuario B inicia sesión
 * después en el MISMO navegador, `migrated_at` de la cuenta de B seguiría
 * siendo null -- un guardián basado solo en eso trataría la caché local
 * de A (que sigue ahí) como si fueran "los datos de invitado de B" y
 * podría filtrar los datos de A hacia la cuenta de B, o mezclarlos.
 *
 * Por eso la guarda real de idempotencia/propiedad es un marcador POR
 * NAVEGADOR (`nutritionPlanner.cloudSyncedUserId.v1`, ver
 * getCloudSyncedUserId/setCloudSyncedUserId más abajo) que registra a
 * QUÉ usuario pertenece la caché local actual -- `migrated_at` en la
 * tabla `user_data` (ver supabase/schema.sql) es solo un dato de
 * auditoría ("¿cuándo dejó de estar vacía esta cuenta?"), nunca la
 * condición que decide nada aquí.
 *
 * classifySyncState() es una función PURA (nada de DOM/red/localStorage
 * dentro de ella) para poder testear cada rama de la máquina de estados
 * sin un cliente Supabase real -- ver tests/migration.test.js. La
 * orquestación (runReconciliation, resolveConflict*) sí toca
 * pantry.js/settings.js/cloud-sync.js, pero delega toda decisión "qué
 * hacer" a classifySyncState().
 *
 * Depende de:
 *   js/core/pantry.js      (getPantryState, savePantryState, getPantryHistory,
 *                            savePantryHistory, PANTRY_HISTORY_MAX_ENTRIES)
 *   js/core/settings.js    (getSettings, saveSettings, clearSettings)
 *   js/core/cloud-sync.js  (pullCloudUserData, pushAllToCloud)
 *   js/core/auth.js        (getCurrentUser)
 *
 * Expone (globales):
 *   getCloudSyncedUserId() / setCloudSyncedUserId(id) / clearCloudSyncedUserId()
 *   hasSnapshotContent(snapshot)                          -- pura
 *   classifySyncState(local, cloud, syncedUserId, userId) -- pura
 *   mergePantryStateBlobs(local, cloud)                    -- pura
 *   mergePantryHistoryBlobs(local, cloud)                  -- pura
 *   mergeSettingsBlobs(local, cloud)                        -- pura
 *   runReconciliation()                    → Promise<{status, cloudRow?}>
 *     status: 'no_user'|'clear_cross_user'|'already_synced'|'pulled'|'pushed'|'conflict'
 *     status==='conflict' → incluye {localSnapshot, cloudRow} para que
 *     render-auth.js pinte el diálogo de elección.
 *   resolveConflictKeepCloud()  → Promise
 *   resolveConflictKeepLocal()  → Promise
 *   resolveConflictMerge(cloudRow) → Promise
 *   onAuthSignOut()             → limpia la caché local de este navegador
 * ─────────────────────────────────────────────────────────────────────────
 */

var CLOUD_SYNCED_USER_KEY = "nutritionPlanner.cloudSyncedUserId.v1";
var _cloudSyncedUserMemory = null;

// ── Marcador por navegador (la guarda real de idempotencia) ─────────────

function getCloudSyncedUserId() {
  if (typeof localStorage === "undefined") return _cloudSyncedUserMemory;
  try {
    return localStorage.getItem(CLOUD_SYNCED_USER_KEY);
  } catch (err) {
    return null;
  }
}

function setCloudSyncedUserId(userId) {
  if (typeof localStorage === "undefined") {
    _cloudSyncedUserMemory = userId;
    return true;
  }
  try {
    localStorage.setItem(CLOUD_SYNCED_USER_KEY, userId);
    return true;
  } catch (err) {
    return false;
  }
}

function clearCloudSyncedUserId() {
  if (typeof localStorage === "undefined") {
    _cloudSyncedUserMemory = null;
    return true;
  }
  try {
    localStorage.removeItem(CLOUD_SYNCED_USER_KEY);
    return true;
  } catch (err) {
    return false;
  }
}

// ── Lógica pura ───────────────────────────────────────────────────────

/**
 * ¿Este bloque {pantry_state, pantry_history, settings} tiene algo real
 * que merezca no perderse? `settings` con SOLO `updatedAt` (el sello que
 * saveSettings() añade siempre) no cuenta -- eso no es una decisión del
 * usuario, es un timestamp interno.
 * @param {{pantry_state?:object, pantry_history?:array, settings?:object}|null} snapshot
 * @returns {boolean}
 */
function hasSnapshotContent(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;

  var pantryState = snapshot.pantry_state;
  if (pantryState && typeof pantryState === "object" && Object.keys(pantryState).length > 0) return true;

  var pantryHistory = snapshot.pantry_history;
  if (Array.isArray(pantryHistory) && pantryHistory.length > 0) return true;

  var settings = snapshot.settings;
  if (settings && typeof settings === "object") {
    var realKeys = Object.keys(settings).filter(function (k) { return k !== "updatedAt"; });
    if (realKeys.length > 0) return true;
  }

  return false;
}

/**
 * Máquina de estados de reconciliación -- pura, sin efectos secundarios.
 * @param {object} localSnapshot - {pantry_state, pantry_history, settings}
 * @param {object|null} cloudRow - lo que devuelve pullCloudUserData(), o null
 * @param {string|null} syncedUserId - getCloudSyncedUserId()
 * @param {string} currentUserId - getCurrentUser().id
 * @returns {'clear_cross_user'|'already_synced'|'conflict'|'push'|'pull'}
 */
function classifySyncState(localSnapshot, cloudRow, syncedUserId, currentUserId) {
  if (syncedUserId && syncedUserId !== currentUserId) return "clear_cross_user";
  if (syncedUserId && syncedUserId === currentUserId) return "already_synced";

  var localHas = hasSnapshotContent(localSnapshot);
  var cloudHas = hasSnapshotContent(cloudRow);

  if (localHas && cloudHas) return "conflict";
  if (localHas && !cloudHas) return "push";
  return "pull";
}

/**
 * Suma gramos por ingrediente -- la despensa es aditiva por naturaleza
 * (dos dispositivos con sobras reales de "arroz" tienen, entre los dos,
 * la suma de ambas cantidades). Nunca deja una entrada en <=0.
 * @param {object} localState
 * @param {object} cloudState
 * @returns {object}
 */
function mergePantryStateBlobs(localState, cloudState) {
  var local = localState || {};
  var cloud = cloudState || {};
  var keys = {};
  Object.keys(local).forEach(function (k) { keys[k] = true; });
  Object.keys(cloud).forEach(function (k) { keys[k] = true; });

  var nowISO = new Date().toISOString();
  var merged = {};
  Object.keys(keys).forEach(function (key) {
    var l = local[key];
    var c = cloud[key];
    var grams = (l && typeof l.grams === "number" ? l.grams : 0) + (c && typeof c.grams === "number" ? c.grams : 0);
    if (grams <= 0) return;
    merged[key] = {
      grams: grams,
      displayName: (l && l.displayName) || (c && c.displayName) || key,
      updatedAt: nowISO
    };
  });
  return merged;
}

/**
 * Concatena + deduplica por id (dos entradas nunca deberían compartir id
 * -- generateHistoryId() en pantry.js combina timestamp+random -- pero
 * deduplicar igualmente es gratis y evita una entrada fantasma si alguna
 * vez colisionara) + recorta al mismo límite que appendPantryHistory()
 * ya aplica (PANTRY_HISTORY_MAX_ENTRIES, si pantry.js está cargado).
 * @param {array} localHistory
 * @param {array} cloudHistory
 * @returns {array}
 */
function mergePantryHistoryBlobs(localHistory, cloudHistory) {
  var combined = [].concat(
    Array.isArray(localHistory) ? localHistory : [],
    Array.isArray(cloudHistory) ? cloudHistory : []
  );

  var seen = {};
  var deduped = [];
  combined.forEach(function (entry) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") return;
    if (seen[entry.id]) return;
    seen[entry.id] = true;
    deduped.push(entry);
  });

  deduped.sort(function (a, b) {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  var cap = (typeof PANTRY_HISTORY_MAX_ENTRIES === "number") ? PANTRY_HISTORY_MAX_ENTRIES : 30;
  return deduped.slice(0, cap);
}

/**
 * Los settings no son aditivos (es una foto del formulario, no un
 * inventario) -- gana el lado con `updatedAt` más reciente, entero, sin
 * fusión campo a campo (una fusión parcial mezclaría un perfil físico de
 * un momento con un objetivo/presupuesto de otro, algo que el propio
 * usuario nunca guardó junto).
 * @param {object} localSettings
 * @param {object} cloudSettings
 * @returns {object}
 */
function mergeSettingsBlobs(localSettings, cloudSettings) {
  var local = localSettings || {};
  var cloud = cloudSettings || {};
  var localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  var cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
  return (cloudTime > localTime) ? cloud : local;
}

// ── Orquestación (toca pantry.js/settings.js/cloud-sync.js) ──────────────

function _readLocalSnapshot() {
  return {
    pantry_state: (typeof getPantryState === "function") ? getPantryState() : {},
    pantry_history: (typeof getPantryHistory === "function") ? getPantryHistory() : [],
    settings: (typeof getSettings === "function") ? getSettings() : {}
  };
}

function _hydrateLocalFrom(cloudRow) {
  var row = cloudRow || {};
  if (typeof savePantryState === "function") savePantryState(row.pantry_state || {});
  if (typeof savePantryHistory === "function") savePantryHistory(row.pantry_history || []);
  if (typeof saveSettings === "function") saveSettings(row.settings || {});
}

function _wipeLocal() {
  if (typeof savePantryState === "function") savePantryState({});
  if (typeof savePantryHistory === "function") savePantryHistory([]);
  if (typeof clearSettings === "function") clearSettings();
}

/**
 * Punto de entrada único, llamado tras cada inicio de sesión (incluida
 * la restauración de sesión al recargar la página). Nunca lanza.
 * @returns {Promise<{status:string, localSnapshot?:object, cloudRow?:object}>}
 */
function runReconciliation() {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (!user) return Promise.resolve({ status: "no_user" });

  return Promise.resolve((typeof pullCloudUserData === "function") ? pullCloudUserData() : null)
    .then(function (cloudRow) {
      var syncedUserId = getCloudSyncedUserId();
      var localSnapshot = _readLocalSnapshot();
      var state = classifySyncState(localSnapshot, cloudRow, syncedUserId, user.id);

      if (state === "clear_cross_user") {
        _wipeLocal();
        // Tras vaciar, la situación real es siempre push/pull (nunca
        // conflict, porque ya no hay nada local) -- reclasificar en vez
        // de asumir cuál de las dos es.
        var freshLocal = _readLocalSnapshot();
        var nextState = classifySyncState(freshLocal, cloudRow, null, user.id);
        return _applyNonConflict(nextState, freshLocal, cloudRow, user.id);
      }

      if (state === "already_synced" || state === "pull" || state === "push") {
        return _applyNonConflict(state, localSnapshot, cloudRow, user.id);
      }

      // 'conflict' -- no se resuelve solo. render-auth.js debe mostrar el
      // diálogo y llamar a resolveConflictKeepCloud/KeepLocal/Merge.
      return { status: "conflict", localSnapshot: localSnapshot, cloudRow: cloudRow };
    });
}

function _applyNonConflict(state, localSnapshot, cloudRow, userId) {
  if (state === "already_synced" || state === "pull") {
    _hydrateLocalFrom(cloudRow);
    setCloudSyncedUserId(userId);
    return { status: state === "already_synced" ? "already_synced" : "pulled" };
  }
  if (state === "push") {
    return Promise.resolve((typeof pushAllToCloud === "function") ? pushAllToCloud({ setMigratedAt: true }) : null)
      .then(function () {
        setCloudSyncedUserId(userId);
        return { status: "pushed" };
      });
  }
  // No debería alcanzarse (clear_cross_user ya se resolvió antes de llamar
  // aquí), pero por si acaso: no dejar el marcador sin fijar.
  setCloudSyncedUserId(userId);
  return { status: state };
}

/**
 * El usuario eligió "usar los datos de la nube" -- descarta lo local sin
 * empujar nada, y adopta la copia de la nube.
 * @returns {Promise}
 */
function resolveConflictKeepCloud() {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (!user) return Promise.resolve();

  return Promise.resolve((typeof pullCloudUserData === "function") ? pullCloudUserData() : null)
    .then(function (cloudRow) {
      _hydrateLocalFrom(cloudRow);
      setCloudSyncedUserId(user.id);
    });
}

/**
 * El usuario eligió "usar los datos de este dispositivo" -- sobrescribe
 * la nube con lo local (elección explícita, por eso SÍ se permite
 * sobrescribir, a diferencia de cualquier rama automática).
 * @returns {Promise}
 */
function resolveConflictKeepLocal() {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (!user) return Promise.resolve();

  return Promise.resolve((typeof pushAllToCloud === "function") ? pushAllToCloud({ setMigratedAt: true }) : null)
    .then(function () {
      setCloudSyncedUserId(user.id);
    });
}

/**
 * El usuario eligió "combinar" -- ver mergePantryStateBlobs/
 * mergePantryHistoryBlobs/mergeSettingsBlobs para la política exacta de
 * cada bloque. El resultado se guarda local Y se empuja a la nube, para
 * que ambos lados queden idénticos.
 * @param {object} cloudRow - el mismo que runReconciliation() devolvió en el estado 'conflict'
 * @returns {Promise}
 */
function resolveConflictMerge(cloudRow) {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (!user) return Promise.resolve();

  var local = _readLocalSnapshot();
  var cloud = cloudRow || {};

  var mergedPantryState = mergePantryStateBlobs(local.pantry_state, cloud.pantry_state);
  var mergedPantryHistory = mergePantryHistoryBlobs(local.pantry_history, cloud.pantry_history);
  var mergedSettings = mergeSettingsBlobs(local.settings, cloud.settings);

  if (typeof savePantryState === "function") savePantryState(mergedPantryState);
  if (typeof savePantryHistory === "function") savePantryHistory(mergedPantryHistory);
  if (typeof saveSettings === "function") saveSettings(mergedSettings);

  return Promise.resolve((typeof pushAllToCloud === "function") ? pushAllToCloud({ setMigratedAt: true }) : null)
    .then(function () {
      setCloudSyncedUserId(user.id);
    });
}

/**
 * Al cerrar sesión: vacía la caché local de ESTE navegador. No se pierde
 * nada real (la nube ya tiene la última copia sincronizada) y cierra por
 * construcción el riesgo de "ordenador compartido" -- el siguiente inicio
 * de sesión en este navegador siempre arranca desde cero, así que
 * `clear_cross_user` en classifySyncState() es una segunda capa de
 * defensa, no el único mecanismo (ver cabecera del archivo).
 */
function onAuthSignOut() {
  _wipeLocal();
  clearCloudSyncedUserId();
}

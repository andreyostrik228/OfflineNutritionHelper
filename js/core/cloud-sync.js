/**
 * js/core/cloud-sync.js
 * ─────────────────────────────────────────────────────────────────────────
 * ÚNICO módulo que lee/escribe la tabla `user_data` de Supabase (ver
 * supabase/schema.sql) -- ni migration.js ni render-auth.js hablan con
 * Postgres directamente, siempre pasan por aquí. Cada fila es de UN
 * usuario (`user_id = auth.uid()`, forzado también por RLS en el
 * servidor -- ver cabecera de supabase/schema.sql), así que un simple
 * `UPDATE ... WHERE user_id = X` basta: la fila SIEMPRE existe ya (un
 * trigger la crea vacía en el signup, ver schema), nunca hace falta
 * upsert ni comprobar si existe.
 *
 * Modelo "local-first / optimista": estas funciones nunca son la fuente
 * de verdad síncrona de la app (esa sigue siendo localStorage, vía
 * pantry.js/settings.js, sin cambios) -- son un empuje/tirón en segundo
 * plano. push*() nunca lanza ni rechaza: un fallo de red no debe alterar
 * ni bloquear nada que el usuario ya ve en pantalla (el guardado local ya
 * ocurrió antes de llamar a estas funciones). Un solo reintento
 * inmediato, y si vuelve a fallar se rinde en silencio (log de consola +
 * la UI puede mostrar un aviso no bloqueante, ver render-auth.js) -- sin
 * cola offline ni service worker, deliberadamente: para el volumen de
 * datos de esta app (una despensa, un historial de máx. 30 planes, un
 * formulario) no compensa esa complejidad.
 *
 * Depende de:
 *   js/core/supabase-client.js (getSupabaseClient)
 *   js/core/auth.js            (getCurrentUser)
 *   js/core/pantry.js          (getPantryState, getPantryHistory) -- solo LEE, nunca escribe aquí
 *   js/core/settings.js        (getSettings)                       -- solo LEE, nunca escribe aquí
 *
 * Expone (globales):
 *   pushPantryToCloud()               → Promise<{error, skipped}>
 *   pushSettingsToCloud()             → Promise<{error, skipped}>
 *   pushAllToCloud(options?)          → Promise<{error, skipped}> -- options.setMigratedAt:boolean
 *   pullCloudUserData()               → Promise<{pantry_state, pantry_history, settings, migrated_at}|null>
 * ─────────────────────────────────────────────────────────────────────────
 */

function _cloudSyncCurrentUserId() {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  return user ? user.id : null;
}

/**
 * Un único intento de `UPDATE user_data SET <columns> WHERE user_id = ...`.
 * `skipped:true` significa "no había nada que hacer" (sin cliente o sin
 * sesión) -- distinto de un error real, para que el llamador no confunda
 * "modo invitado" con "falló la sincronización".
 * @param {object} columns
 * @returns {Promise<{error:object|null, skipped:boolean}>}
 */
function _updateUserDataOnce(columns) {
  var client = getSupabaseClient();
  var userId = _cloudSyncCurrentUserId();
  if (!client || !userId) return Promise.resolve({ error: null, skipped: true });

  // try/catch envuelve incluso la construcción de la llamada, no solo su
  // resultado -- un cliente roto que lanzara de forma SÍNCRONA (en vez de
  // devolver una promesa rechazada) no debe poder escapar de la garantía
  // "nunca lanza" de este módulo.
  try {
    return client.from("user_data").update(columns).eq("user_id", userId)
      .then(function (result) {
        return { error: (result && result.error) || null, skipped: false };
      })
      .catch(function (err) {
        return { error: err, skipped: false };
      });
  } catch (err) {
    return Promise.resolve({ error: err, skipped: false });
  }
}

/**
 * `_updateUserDataOnce` + un reintento inmediato si el primero falló por
 * un error real (nunca reintenta un `skipped:true`). Siempre RESUELVE,
 * nunca rechaza -- ver cabecera del archivo.
 * @param {object} columns
 * @returns {Promise<{error:object|null, skipped:boolean}>}
 */
function _updateUserData(columns) {
  return _updateUserDataOnce(columns).then(function (result) {
    if (!result.error || result.skipped) return result;
    return _updateUserDataOnce(columns);
  }).then(function (result) {
    if (result.error && !result.skipped) {
      console.error("[cloud-sync] no se pudo guardar en la nube tras reintentar -- los cambios siguen a salvo en este dispositivo:", result.error);
    }
    return result;
  });
}

function pushPantryToCloud() {
  if (typeof getPantryState !== "function" || typeof getPantryHistory !== "function") {
    return Promise.resolve({ error: null, skipped: true });
  }
  return _updateUserData({
    pantry_state: getPantryState(),
    pantry_history: getPantryHistory()
  });
}

function pushSettingsToCloud() {
  if (typeof getSettings !== "function") return Promise.resolve({ error: null, skipped: true });
  return _updateUserData({ settings: getSettings() });
}

/**
 * Empuja los tres bloques a la vez -- usado por migration.js en la rama
 * 'push' (primer login con datos locales y nube vacía). `setMigratedAt`
 * sella `migrated_at` -- ese campo es solo auditoría (cuándo pasó a haber
 * datos reales por primera vez), NUNCA la guarda de idempotencia real
 * (esa es `cloudSyncedUserId` en localStorage, ver migration.js).
 * @param {{setMigratedAt?:boolean}} [options]
 * @returns {Promise<{error, skipped}>}
 */
function pushAllToCloud(options) {
  var opts = options || {};
  if (typeof getPantryState !== "function" || typeof getPantryHistory !== "function" || typeof getSettings !== "function") {
    return Promise.resolve({ error: null, skipped: true });
  }
  var columns = {
    pantry_state: getPantryState(),
    pantry_history: getPantryHistory(),
    settings: getSettings()
  };
  if (opts.setMigratedAt) columns.migrated_at = new Date().toISOString();
  return _updateUserData(columns);
}

/**
 * Lee la fila `user_data` del usuario autenticado actual. `null` en
 * cualquier caso "no hay nada que leer todavía" (sin cliente, sin
 * sesión, error de red) -- el llamador (migration.js) siempre debe
 * tratar `null` como "nube vacía", nunca como excepción.
 * @returns {Promise<{pantry_state:object, pantry_history:array, settings:object, migrated_at:string|null}|null>}
 */
function pullCloudUserData() {
  var client = getSupabaseClient();
  var userId = _cloudSyncCurrentUserId();
  if (!client || !userId) return Promise.resolve(null);

  try {
    return client.from("user_data")
      .select("pantry_state, pantry_history, settings, migrated_at")
      .eq("user_id", userId)
      .single()
      .then(function (result) {
        if (result.error) {
          console.error("[cloud-sync] no se pudo leer los datos de la nube:", result.error);
          return null;
        }
        return result.data || null;
      })
      .catch(function (err) {
        console.error("[cloud-sync] no se pudo leer los datos de la nube:", err);
        return null;
      });
  } catch (err) {
    console.error("[cloud-sync] no se pudo leer los datos de la nube:", err);
    return Promise.resolve(null);
  }
}

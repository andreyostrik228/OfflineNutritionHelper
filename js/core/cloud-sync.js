/**
 * js/core/cloud-sync.js
 * ─────────────────────────────────────────────────────────────────────────
 * ÚNICO módulo que lee/escribe los datos del usuario en la nube -- ni
 * migration.js ni render-auth.js hablan con Firestore directamente,
 * siempre pasan por aquí. Cada usuario tiene UN documento,
 * `user_data/{uid}`, y las reglas (firebase/firestore.rules) solo dejan
 * tocarlo a su dueño.
 *
 * ── Por qué REST y no el SDK de Firestore ───────────────────────────────
 * El SDK pesa 548 KB y aquí se lee y se escribe UN documento. Con `fetch`
 * y el token del usuario (getAuthIdToken, js/core/auth.js) la API REST
 * aplica exactamente las mismas reglas de seguridad. Ver cabecera de
 * js/core/firebase-client.js.
 *
 * ── Los campos se guardan como TEXTO JSON ───────────────────────────────
 * Firestore no admite arrays anidados ni `undefined`, tiene tipos propios
 * que no casan del todo con JSON, y la API REST exige envolver cada valor
 * en su tipo (`{"stringValue": ...}`). Guardando el JSON como texto, lo que
 * se lee es exactamente lo que se escribió, sin traducir nada campo a
 * campo. Medido 2026-09-25: 30 planes en el historial son 67 KB; el límite
 * de un documento es 1 MiB, quince veces más.
 *
 * ── "No hay documento" y "no se pudo leer" son cosas DISTINTAS ──────────
 * pullCloudUserData() devuelve una fila VACÍA si el documento todavía no
 * existe (Firestore contesta 404: nube vacía, usuario nuevo) y `null` SOLO
 * si la lectura falló (sin red, sin token, error del servidor). Hasta
 * 2026-09-25 las dos cosas devolvían null, y migration.js las trataba
 * igual: un usuario con sesión que abría la app sin cobertura se quedaba
 * con la despensa, el historial y los ajustes VACÍOS -- se "sincronizaba"
 * con una nube que no había podido leer. Ver runReconciliation().
 *
 * Modelo "local-first / optimista": nada de esto es la fuente de verdad
 * síncrona de la app (esa sigue siendo localStorage, vía pantry.js/
 * settings.js) -- es un empuje/tirón en segundo plano. push*() nunca lanza
 * ni rechaza: un fallo de red no debe alterar ni bloquear nada que el
 * usuario ya ve en pantalla. Un solo reintento inmediato, y si vuelve a
 * fallar se rinde en silencio (log de consola) -- sin cola offline,
 * deliberadamente: para el volumen de datos de esta app no compensa.
 *
 * Depende de:
 *   js/core/firebase-client.js (firestoreUserDocUrl)
 *   js/core/auth.js            (getCurrentUser, getAuthIdToken)
 *   js/core/pantry.js          (getPantryState, getPantryHistory) -- solo LEE
 *   js/core/settings.js        (getSettings)                       -- solo LEE
 *   fetch (del navegador)
 *
 * Expone (globales):
 *   pushPantryToCloud()               → Promise<{error, skipped}>
 *   pushSettingsToCloud()             → Promise<{error, skipped}>
 *   pushAllToCloud(options?)          → Promise<{error, skipped}> -- options.setMigratedAt:boolean
 *   pullCloudUserData()               → Promise<{pantry_state, pantry_history, settings, migrated_at}|null>
 *   deleteCloudUserData()             → Promise<{error}>
 * ─────────────────────────────────────────────────────────────────────────
 */

function _cloudSyncCurrentUserId() {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  return user ? user.id : null;
}

/** La fila de un usuario que todavía no ha guardado nada. */
function _filaVacia() {
  return { pantry_state: {}, pantry_history: [], settings: {}, migrated_at: null };
}

/**
 * `migrated_at` ya es texto (una fecha ISO) y va tal cual; los otros tres
 * son objetos y van como JSON. Ver cabecera.
 * @param {object} columns
 * @returns {object} - `fields` en el formato de la API REST
 */
function _aCamposFirestore(columns) {
  var fields = {};
  Object.keys(columns).forEach(function (nombre) {
    var valor = columns[nombre];
    fields[nombre] = { stringValue: nombre === "migrated_at" ? String(valor) : JSON.stringify(valor) };
  });
  return fields;
}

/**
 * Lo contrario de _aCamposFirestore. Un campo ausente vale lo mismo que en
 * una fila vacía. LANZA si un campo trae JSON roto: quien llama lo trata
 * como lectura fallida, nunca como "nube vacía".
 * @param {{fields?:object}} doc
 * @returns {object}
 */
function _deCamposFirestore(doc) {
  var fields = (doc && doc.fields) || {};
  var fila = _filaVacia();
  ["pantry_state", "pantry_history", "settings"].forEach(function (nombre) {
    var campo = fields[nombre];
    if (campo && typeof campo.stringValue === "string") fila[nombre] = JSON.parse(campo.stringValue);
  });
  if (fields.migrated_at && typeof fields.migrated_at.stringValue === "string") {
    fila.migrated_at = fields.migrated_at.stringValue;
  }
  return fila;
}

/**
 * Una petición a la API REST sobre el documento del usuario actual.
 * Resuelve SIEMPRE, nunca rechaza:
 *   {skipped:true}                 sin sesión o sin Firebase: nada que hacer
 *   {status, body}                 el servidor contestó (cualquier código)
 *   {error}                        ni siquiera se pudo preguntar (sin red, sin token)
 * @param {string} method
 * @param {string} [query] - lo que va tras la `?`, ya codificado
 * @param {object} [cuerpo]
 * @returns {Promise<object>}
 */
function _peticionDocumento(method, query, cuerpo) {
  var userId = _cloudSyncCurrentUserId();
  var url = (userId && typeof firestoreUserDocUrl === "function") ? firestoreUserDocUrl(userId) : null;
  if (!url) return Promise.resolve({ skipped: true });
  if (typeof fetch !== "function" || typeof getAuthIdToken !== "function") {
    return Promise.resolve({ error: { message: "sin_fetch" } });
  }

  try {
    return Promise.resolve(getAuthIdToken()).then(function (token) {
      // Hay usuario pero no token: la sesión existe y no se ha podido
      // renovar (casi siempre, falta de red). Es un fallo, no "invitado".
      if (!token) return { error: { message: "sin_token" } };
      var opciones = {
        method: method,
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
      };
      if (cuerpo) opciones.body = JSON.stringify(cuerpo);
      return fetch(url + (query ? "?" + query : ""), opciones).then(function (res) {
        return res.text().then(function (texto) {
          var body = null;
          try { body = texto ? JSON.parse(texto) : null; } catch (e) { body = null; }
          return { status: res.status, body: body };
        });
      });
    }).then(null, function (err) {
      return { error: err };
    });
  } catch (err) {
    return Promise.resolve({ error: err });
  }
}

/** Un error legible a partir de una respuesta HTTP que no fue 2xx. */
function _errorHttp(respuesta) {
  var detalle = respuesta.body && respuesta.body.error && respuesta.body.error.message;
  return { status: respuesta.status, message: detalle || ("HTTP " + respuesta.status) };
}

/**
 * Un único intento de escribir `columns` en el documento. PATCH con
 * `updateMask` toca solo esos campos, y crea el documento si no existía
 * (con Supabase la fila la creaba un trigger al registrarse; aquí no hace
 * falta).
 * `skipped:true` = "no había nada que hacer" (sin Firebase o sin sesión),
 * distinto de un error real, para que el llamador no confunda "modo
 * invitado" con "falló la sincronización".
 * @param {object} columns
 * @returns {Promise<{error:object|null, skipped:boolean}>}
 */
function _updateUserDataOnce(columns) {
  var query = Object.keys(columns).map(function (nombre) {
    return "updateMask.fieldPaths=" + encodeURIComponent(nombre);
  }).join("&");

  return _peticionDocumento("PATCH", query, { fields: _aCamposFirestore(columns) }).then(function (r) {
    if (r.skipped) return { error: null, skipped: true };
    if (r.error) return { error: r.error, skipped: false };
    if (r.status >= 200 && r.status < 300) return { error: null, skipped: false };
    return { error: _errorHttp(r), skipped: false };
  });
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
 * 'push' (primer login con datos locales y nube vacía), y por
 * deleteOwnAccount() para devolver los datos a la nube si la cuenta al
 * final no se pudo borrar. `setMigratedAt` sella `migrated_at` -- ese
 * campo es solo auditoría, NUNCA la guarda de idempotencia real (esa es
 * `cloudSyncedUserId` en localStorage, ver migration.js).
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
 * Lee el documento del usuario con sesión.
 *
 *   fila con datos   → el documento existe
 *   fila VACÍA       → el documento no existe todavía (404): nube vacía
 *   null             → NO SE PUDO LEER. No es "nube vacía" -- ver cabecera
 *
 * @returns {Promise<{pantry_state:object, pantry_history:array, settings:object, migrated_at:string|null}|null>}
 */
function pullCloudUserData() {
  return _peticionDocumento("GET").then(function (r) {
    if (r.skipped) return null;
    if (r.error) {
      console.error("[cloud-sync] no se pudo leer los datos de la nube:", r.error);
      return null;
    }
    if (r.status === 404) return _filaVacia();
    if (r.status < 200 || r.status >= 300) {
      console.error("[cloud-sync] no se pudo leer los datos de la nube:", _errorHttp(r));
      return null;
    }
    try {
      return _deCamposFirestore(r.body);
    } catch (err) {
      console.error("[cloud-sync] los datos de la nube están dañados, no se usan:", err);
      return null;
    }
  });
}

/**
 * Borra el documento del usuario con sesión. Solo lo usa
 * deleteOwnAccount() (js/core/auth.js), que explica por qué va ANTES que
 * borrar la cuenta. Borrar un documento que no existe no es error en
 * Firestore.
 * @returns {Promise<{error:object|null}>}
 */
function deleteCloudUserData() {
  return _peticionDocumento("DELETE").then(function (r) {
    if (r.skipped) return { error: { message: "not_authenticated" } };
    if (r.error) return { error: r.error };
    if (r.status >= 200 && r.status < 300) return { error: null };
    return { error: _errorHttp(r) };
  });
}

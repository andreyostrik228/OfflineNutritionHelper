/**
 * js/core/data-backup.js
 * ─────────────────────────────────────────────────────────────────────────
 * COPIA DE LOS DATOS (2026-10-18): lo que guarda «Descargar mis datos» y lo
 * que vuelve a poner «Cargar una copia». Solo datos, sin DOM: quien descarga
 * el fichero, lo lee y pregunta es js/app.js.
 *
 * Entra todo lo que la aplicación guarda en este navegador: las claves que
 * empiezan por `nutritionPlanner.` y por `weekplate-` (perfil, despensa,
 * planes, diario de entrenamiento, cuestionario, registro de peso…). Hasta
 * hoy la copia solo miraba el primer prefijo y se dejaba fuera el registro de
 * peso, las respuestas del cuestionario y el plan guardado; y no había forma
 * de volver a cargarla.
 *
 * NO entran las marcas de sesión de ESTE dispositivo (COPIA_SOLO_DISPOSITIVO):
 * restaurar `cloudSyncedUserId` en otro navegador le haría creer que ya está
 * sincronizado con una cuenta, y la nube pisaría la copia recién cargada.
 *
 * Formato (versión 2):
 *   { app: "weekplate", version: 2, exportadoEl: ISO, claves: { clave: valor } }
 *   valor = el JSON ya leído (objeto, lista, número), para que se pueda leer a
 *   mano; o el texto tal cual si lo guardado no era JSON o era un texto JSON.
 *   Así la vuelta es exacta: al cargar, un texto se escribe sin tocar.
 * La versión 1 (la de antes, sin `app`) también se acepta.
 *
 * Lo que se carga NO se fía de nada: solo claves con esos prefijos y nombre
 * corto y limpio, como mucho COPIA_MAX_CLAVES y COPIA_MAX_BYTES. Cada módulo
 * vuelve a validar su clave al leerla (sanitizeSettings, entrenoLogLimpiar,
 * pesosLimpiar…), como hace con lo que ya había en el navegador.
 *
 * Expone (globales):
 *   COPIA_PREFIJOS, COPIA_SOLO_DISPOSITIVO, COPIA_MAX_BYTES
 *   copiaClavePermitida(clave)        → boolean
 *   copiaCrear(storage, ahoraIso)     → objeto de la copia
 *   copiaAnalizar(texto)              → {ok:true, claves, n, fecha} | {ok:false, error}
 *   copiaRestaurar(storage, claves)   → claves escritas, o -1 (y nada cambia)
 * ─────────────────────────────────────────────────────────────────────────
 */

var COPIA_PREFIJOS = ["nutritionPlanner.", "weekplate-"];
var COPIA_SOLO_DISPOSITIVO = ["nutritionPlanner.cloudSyncedUserId.v1", "nutritionPlanner.pidiendoEntrar"];
var COPIA_MAX_BYTES = 8 * 1024 * 1024;
var COPIA_MAX_CLAVES = 200;
var _COPIA_NOMBRE = /^[A-Za-z0-9._-]{1,100}$/;

function copiaClavePermitida(clave) {
  if (typeof clave !== "string" || !_COPIA_NOMBRE.test(clave)) return false;
  if (COPIA_SOLO_DISPOSITIVO.indexOf(clave) !== -1) return false;
  return COPIA_PREFIJOS.some(function (p) { return clave.indexOf(p) === 0; });
}

/** Las claves de la aplicación que hay ahora en el almacenamiento, ordenadas. */
function _copiaClavesDe(storage) {
  var claves = [];
  try {
    for (var i = 0; i < storage.length; i++) {
      var k = storage.key(i);
      if (copiaClavePermitida(k)) claves.push(k);
    }
  } catch (e) { /* sin almacenamiento: no hay nada */ }
  return claves.sort();
}

/** El valor tal como va en la copia: el JSON leído, o el texto si no era JSON o era un texto. */
function _copiaValor(texto) {
  try {
    var v = JSON.parse(texto);
    return typeof v === "string" ? texto : v;
  } catch (e) {
    return texto;
  }
}

/**
 * La copia de lo que hay en el almacenamiento.
 * @param {Storage|null} storage
 * @param {string} [ahoraIso]
 */
function copiaCrear(storage, ahoraIso) {
  var copia = { app: "weekplate", version: 2, exportadoEl: ahoraIso || new Date().toISOString(), claves: {} };
  if (!storage) return copia;
  _copiaClavesDe(storage).forEach(function (k) {
    try {
      var texto = storage.getItem(k);
      if (typeof texto === "string") copia.claves[k] = _copiaValor(texto);
    } catch (e) { /* esa clave no se pudo leer: la copia sigue sin ella */ }
  });
  return copia;
}

/**
 * Lee el texto de un fichero de copia y deja solo lo que se puede cargar.
 *   error: "vacia" (nada que cargar), "grande", "json" (no es JSON), "formato" (no es una copia)
 * @param {string} texto
 * @returns {{ok:true, claves:object, n:number, fecha:(string|null)}|{ok:false, error:string}}
 */
function copiaAnalizar(texto) {
  if (typeof texto !== "string" || !texto.trim()) return { ok: false, error: "vacia" };
  if (COPIA_MAX_BYTES < texto.length) return { ok: false, error: "grande" };
  var datos;
  try { datos = JSON.parse(texto); } catch (e) { return { ok: false, error: "json" }; }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return { ok: false, error: "formato" };
  if (datos.app !== undefined && datos.app !== "weekplate") return { ok: false, error: "formato" };
  var crudas = datos.claves;
  if (!crudas || typeof crudas !== "object" || Array.isArray(crudas)) return { ok: false, error: "formato" };

  var claves = {};
  var n = 0;
  Object.keys(crudas).forEach(function (k) {
    if (COPIA_MAX_CLAVES <= n || !copiaClavePermitida(k)) return;
    var v = crudas[k];
    if (v === null || v === undefined) return;
    claves[k] = typeof v === "string" ? v : JSON.stringify(v);
    n++;
  });
  if (!n) return { ok: false, error: "vacia" };
  var fecha = (typeof datos.exportadoEl === "string" && !isNaN(Date.parse(datos.exportadoEl))) ? datos.exportadoEl : null;
  return { ok: true, claves: claves, n: n, fecha: fecha };
}

/**
 * Sustituye los datos de la aplicación por los de la copia: borra las claves
 * de la aplicación que haya y escribe las de la copia. Si algo falla a mitad
 * (almacenamiento lleno), vuelve a dejar lo que había.
 * @param {Storage|null} storage
 * @param {object} claves  - las de copiaAnalizar (clave → texto)
 * @returns {number} claves escritas, o -1 si no se pudo (y no cambió nada)
 */
function copiaRestaurar(storage, claves) {
  if (!storage || !claves || typeof claves !== "object") return -1;
  var antes = {};
  var actuales = _copiaClavesDe(storage);
  try {
    actuales.forEach(function (k) { antes[k] = storage.getItem(k); });
  } catch (e) {
    return -1;
  }
  try {
    actuales.forEach(function (k) { storage.removeItem(k); });
    var n = 0;
    Object.keys(claves).forEach(function (k) {
      if (!copiaClavePermitida(k) || typeof claves[k] !== "string") return;
      storage.setItem(k, claves[k]);
      n++;
    });
    return n;
  } catch (e) {
    try {
      _copiaClavesDe(storage).forEach(function (k) { storage.removeItem(k); });
      Object.keys(antes).forEach(function (k) { if (typeof antes[k] === "string") storage.setItem(k, antes[k]); });
    } catch (e2) { /* sin almacenamiento: no hay más que hacer */ }
    return -1;
  }
}

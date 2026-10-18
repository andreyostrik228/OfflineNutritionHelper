/**
 * js/core/workout-sync.js
 * ─────────────────────────────────────────────────────────────────────────
 * EL DIARIO DE ENTRENAMIENTO Y EL CUESTIONARIO EN LA CUENTA (2026-10-18).
 * Hasta hoy vivían solo en este navegador: cambiar de móvil o borrar los
 * datos del sitio se llevaba todas las sesiones.
 *
 * Viajan DENTRO del campo `settings` del documento de la cuenta, bajo la clave
 * reservada `_entrenos` (el mismo camino que `_pesos` y `_prefs`): las reglas
 * de Firestore solo admiten cuatro campos y publicar reglas nuevas es cosa de
 * la consola de Firebase. `sanitizeSettings` no conoce `_entrenos`, así que
 * nunca se queda en los ajustes locales: se calcula al subir y se aplica al
 * bajar.
 *
 * ── Forma compacta ──────────────────────────────────────────────────────
 * Un documento de Firestore admite como mucho 1 MiB y el diario guarda hasta
 * 400 sesiones, así que en la nube va compacto:
 *   { v: 1, s: [Sesion…], b: [[id, t]…], p: respuestas | null, pt: ms }
 *   Sesion    = [id, clave, semana, inicio, fin, pausas, editado, [Ejercicio…]]
 *   Ejercicio = [id, reps, descanso, [[kg, reps, tipo]…], extra]
 *     tipo: 0 normal, 1 calentamiento, 2 drop set, 3 al fallo
 *     extra: { n, m, c } (nombre, músculo, compuesto) solo si el catálogo no
 *            conoce el ejercicio; g (superserie) y o (nota) si los hay
 * Si aun así pesa más de ENTRENO_NUBE_MAX_BYTES, suben las sesiones más
 * recientes; las viejas siguen en el dispositivo. Medido el 2026-10-18 (test):
 * 400 sesiones de 6 ejercicios con 4 series caben de sobra.
 *
 * ── Fusión (dispositivo + nube) ─────────────────────────────────────────
 * Unión por id. Si un id está en los dos lados gana el de `editado` más
 * reciente (empate: el del dispositivo). Las borradas de cualquiera de los dos
 * lados se quitan, y la lista de borradas también se une: si no, el otro
 * dispositivo devolvería una sesión borrada. La sesión EN CURSO nunca viaja.
 * Las respuestas del cuestionario: gana la de `t` más reciente.
 *
 * Al cerrar sesión se borran del dispositivo, como el registro de peso: son
 * de la cuenta (y el siguiente que entre en este navegador no debe verlas).
 *
 * Expone (globales):
 *   ENTRENO_NUBE_CAMPO, ENTRENO_NUBE_MAX_BYTES
 *   entrenoNubeBloque(log, prefs, maxBytes)  → bloque compacto
 *   entrenoNubeLeerBloque(bloque)            → { log, prefs, prefsT } (ya limpio) o null
 *   entrenoNubeFusionar(local, remoto)       → diario fusionado (logs ya limpios)
 *   settingsWithWorkouts(settings)           → copia de los ajustes con `_entrenos`
 *   mergeWorkoutsFromCloud(bloque)           → boolean (¿quedó guardado?)
 *   pushWorkoutsIfPending()                  → sube si al fusionar quedó algo que la nube no tiene
 *   pushWorkoutsToCloud()                    → sube (agrupa las llamadas seguidas)
 *   entrenoNubeBorrarDispositivo()           → al cerrar sesión
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_NUBE_CAMPO = "_entrenos";
var ENTRENO_NUBE_MAX_BYTES = 300000;
var ENTRENO_NUBE_ESPERA_MS = 1500;
var _NUBE_TIPOS = { "": 0, c: 1, d: 2, f: 3 };
var _NUBE_TIPOS_DE = ["", "c", "d", "f"];

var _entrenosPorSubir = false;
var _entrenosTemporizador = null;

function _nubeCatalogo(id) {
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  for (var i = 0; i < catalogo.length; i++) if (catalogo[i].id === id) return catalogo[i];
  return null;
}

function _nubeEjercicio(e) {
  var series = e.series.map(function (s) {
    return [s.kg, s.reps, _NUBE_TIPOS[s.tipo || ""] || 0];
  });
  var extra = {};
  var cat = _nubeCatalogo(e.id);
  if (!cat) { extra.n = e.name; extra.m = e.muscle; extra.c = e.compound ? 1 : 0; }
  if (e.grupo) extra.g = e.grupo;
  if (e.nota) extra.o = e.nota;
  var fila = [e.id, e.reps, e.descanso, series];
  if (Object.keys(extra).length) fila.push(extra);
  return fila;
}

function _nubeSesion(s) {
  return [s.id, s.clave, s.semana, s.inicio, s.fin, s.pausas || 0, s.editado || 0, s.ejercicios.map(_nubeEjercicio)];
}

/**
 * El bloque que sube a la cuenta. Las sesiones más recientes primero hasta el
 * tope de tamaño; en el bloque van de la más antigua a la más reciente.
 * @param {object} log      diario limpio (entrenoLogLimpiar)
 * @param {object|null} prefs  respuestas del cuestionario (con su `t`)
 * @param {number} [maxBytes]
 */
function entrenoNubeBloque(log, prefs, maxBytes) {
  var tope = maxBytes || ENTRENO_NUBE_MAX_BYTES;
  var sesiones = [];
  var usado = 0;
  for (var i = log.sesiones.length - 1; 0 <= i; i--) {
    var fila = _nubeSesion(log.sesiones[i]);
    var largo = JSON.stringify(fila).length + 1;
    if (tope < usado + largo) break;
    usado += largo;
    sesiones.push(fila);
  }
  sesiones.reverse();
  var bloque = {
    v: 1,
    s: sesiones,
    b: (log.borradas || []).map(function (b) { return [b.id, b.t]; }),
    p: prefs && typeof prefs === "object" ? prefs : null,
    pt: (prefs && typeof prefs.t === "number") ? prefs.t : 0
  };
  return bloque;
}

/** Del bloque de la nube a un diario normal (pasado por entrenoLogLimpiar). null si no sirve. */
function entrenoNubeLeerBloque(bloque) {
  if (!bloque || typeof bloque !== "object" || Array.isArray(bloque) || !Array.isArray(bloque.s)) return null;
  var sesiones = bloque.s.map(function (f) {
    if (!Array.isArray(f) || !Array.isArray(f[7])) return null;
    var clave = typeof f[1] === "string" ? f[1] : "";
    var plantilla = (typeof WORKOUT_SESIONES !== "undefined" && clave && Object.prototype.hasOwnProperty.call(WORKOUT_SESIONES, clave))
      ? WORKOUT_SESIONES[clave] : null;
    return {
      id: f[0], clave: clave, nombre: plantilla ? plantilla.name : "", semana: f[2],
      inicio: f[3], fin: f[4], pausas: f[5], editado: f[6],
      ejercicios: f[7].map(function (x) {
        if (!Array.isArray(x) || !Array.isArray(x[3])) return null;
        var extra = (x[4] && typeof x[4] === "object") ? x[4] : {};
        var cat = typeof x[0] === "string" ? _nubeCatalogo(x[0]) : null;
        return {
          id: x[0], reps: x[1], descanso: x[2],
          name: cat ? cat.name : extra.n, muscle: cat ? cat.muscle : extra.m,
          compound: cat ? cat.compound === true : extra.c === 1,
          grupo: extra.g, nota: extra.o,
          series: x[3].map(function (s) {
            if (!Array.isArray(s)) return null;
            return { kg: s[0], reps: s[1], hecha: true, tipo: _NUBE_TIPOS_DE[s[2]] || undefined };
          })
        };
      })
    };
  });
  var borradas = Array.isArray(bloque.b) ? bloque.b.map(function (b) {
    return Array.isArray(b) ? { id: b[0], t: b[1] } : null;
  }) : [];
  var log = entrenoLogLimpiar({ v: 1, sesiones: sesiones, enCurso: null, borradas: borradas });
  var prefs = (bloque.p && typeof bloque.p === "object" && !Array.isArray(bloque.p)) ? bloque.p : null;
  var prefsT = typeof bloque.pt === "number" && isFinite(bloque.pt) ? bloque.pt : 0;
  return { log: log, prefs: prefs, prefsT: prefsT };
}

/**
 * Une dos diarios limpios. La sesión en curso es la del dispositivo (local).
 * @returns {object} diario nuevo, limpio
 */
function entrenoNubeFusionar(local, remoto) {
  var porId = {};
  local.sesiones.forEach(function (s) { porId[s.id] = s; });
  remoto.sesiones.forEach(function (s) {
    var mia = porId[s.id];
    if (!mia || (mia.editado || 0) < (s.editado || 0)) porId[s.id] = s;
  });
  var crudo = {
    v: 1,
    sesiones: Object.keys(porId).map(function (k) { return porId[k]; }),
    enCurso: local.enCurso,
    borradas: (local.borradas || []).concat(remoto.borradas || [])
  };
  // entrenoLogLimpiar quita las borradas, ordena y recorta.
  return entrenoLogLimpiar(JSON.parse(JSON.stringify(crudo)));
}

function _nubePrefsLocales() {
  return (typeof entrenoLeerPrefs === "function") ? entrenoLeerPrefs() : null;
}

/** Copia de unos ajustes con el diario y el cuestionario dentro (`_entrenos`). No toca el original. */
function settingsWithWorkouts(settings) {
  var copia = {};
  var origen = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  Object.keys(origen).forEach(function (k) { copia[k] = origen[k]; });
  if (typeof entrenoLogLeer !== "function") return copia;
  copia[ENTRENO_NUBE_CAMPO] = entrenoNubeBloque(entrenoLogLeer(), _nubePrefsLocales());
  return copia;
}

/**
 * Mezcla en este dispositivo lo que bajó de la cuenta. Si después de mezclar
 * el dispositivo tiene algo que la nube no (sesiones de antes de entrar,
 * respuestas más nuevas), lo apunta para subirlo en cuanto la cuenta quede
 * sincronizada (pushWorkoutsIfPending). Nunca lanza.
 * @returns {boolean} true si quedó guardado
 */
function mergeWorkoutsFromCloud(bloque) {
  try {
    if (typeof entrenoLogLeer !== "function") return false;
    var remoto = entrenoNubeLeerBloque(bloque);
    var local = entrenoLogLeer();
    var fusionado = remoto ? entrenoNubeFusionar(local, remoto.log) : local;
    var guardado = remoto ? entrenoLogGuardar(fusionado) : true;

    var prefs = _nubePrefsLocales();
    var tLocal = (prefs && typeof prefs.t === "number") ? prefs.t : 0;
    if (remoto && remoto.prefs && tLocal < remoto.prefsT && typeof entrenoGuardarPrefs === "function" &&
        typeof entrenoPrefsLimpiar === "function") {
      prefs = entrenoPrefsLimpiar(remoto.prefs);
      prefs.t = remoto.prefsT;
      entrenoGuardarPrefs(prefs, true);
    }
    var nuevo = JSON.stringify(entrenoNubeBloque(fusionado, prefs));
    _entrenosPorSubir = !bloque || nuevo !== JSON.stringify(bloque);
    // Un plan que ya está pintado (panel abierto) se entera de lo que bajó.
    if (typeof renderEntrenoSiVisible === "function") renderEntrenoSiVisible();
    return guardado;
  } catch (err) {
    return false;
  }
}

function _nubeCuentaLista() {
  var usuario = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (!usuario) return false;
  if (typeof getCloudSyncedUserId === "function" && getCloudSyncedUserId() !== usuario.id) return false;
  return typeof pushSettingsToCloud === "function";
}

/** Tras la reconciliación: sube lo que el dispositivo tenía y la nube no. */
function pushWorkoutsIfPending() {
  if (!_entrenosPorSubir) return;
  _entrenosPorSubir = false;
  pushWorkoutsToCloud();
}

/**
 * Sube el diario y el cuestionario si hay sesión y la cuenta ya está
 * sincronizada (como pushWeightLogToCloud). Varias llamadas seguidas (cambiar
 * de semana tres veces) se juntan en una subida. Nunca lanza.
 */
function pushWorkoutsToCloud() {
  try {
    if (!_nubeCuentaLista()) return;
    if (_entrenosTemporizador !== null) clearTimeout(_entrenosTemporizador);
    _entrenosTemporizador = setTimeout(function () {
      _entrenosTemporizador = null;
      if (_nubeCuentaLista()) pushSettingsToCloud();
    }, ENTRENO_NUBE_ESPERA_MS);
  } catch (err) { /* sin nube: lo del dispositivo sigue a salvo */ }
}

/** Al cerrar sesión: el diario y el cuestionario son de la cuenta, no del dispositivo. */
function entrenoNubeBorrarDispositivo() {
  try {
    if (typeof ENTRENO_LOG_CLAVE !== "undefined") localStorage.removeItem(ENTRENO_LOG_CLAVE);
    if (typeof ENTRENO_CLAVE_PREFS !== "undefined") localStorage.removeItem(ENTRENO_CLAVE_PREFS);
  } catch (e) { /* sin almacenamiento no hay nada que borrar */ }
  _entrenosPorSubir = false;
}

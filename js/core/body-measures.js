/**
 * js/core/body-measures.js
 * ─────────────────────────────────────────────────────────────────────────
 * Registro de MEDIDAS: los perímetros del cuerpo en centímetros (2026-10-23).
 * La hoja de ruta del dueño, etapa 1, «Peso corporal y medidas»: el peso ya
 * estaba (js/core/weight-log.js); faltaban las medidas. Se ven en «Progreso»,
 * pestaña «Cuerpo» (js/ui/entreno-medidas.js).
 *
 * Funciona como el registro de peso: una entrada por fecha, en su propia
 * clave de localStorage, y con cuenta viaja DENTRO de `settings`, bajo la clave
 * reservada `_medidas` (el mismo camino que `_pesos`; las reglas de Firestore
 * no cambian). Al cerrar sesión se borra del dispositivo, como el peso.
 *
 * Entrada: { fecha: "YYYY-MM-DD", t: ms en que se guardó, m: { parte: cm } }
 *   partes: MEDIDAS_PARTES; cada una opcional, entre MEDIDA_MIN_CM y
 *   MEDIDA_MAX_CM, con una cifra decimal como mucho. Una entrada sin ninguna
 *   parte válida no se guarda.
 *
 * Reglas:
 *   - Guardar hoy MEZCLA con lo de hoy: lo que se escribe pisa esa parte y lo
 *     que se deja vacío conserva lo de antes (medirse la cintura por la mañana
 *     y el brazo por la tarde no borra la cintura).
 *   - Al fusionar con la nube, para la misma fecha gana la de mayor `t`; si
 *     empatan, la del dispositivo.
 *   - Se conservan las últimas MEDIDAS_MAX_ENTRADAS fechas.
 *   - Sin almacenamiento nada lanza.
 *
 * Expone (globales):
 *   MEDIDAS_PARTES, MEDIDAS_CLAVE, MEDIDAS_CAMPO_NUBE
 *   medidaAnalizar(texto)                    → {ok, cm} | {ok:false, error: "formato"|"rango"|"paso"} | {ok:true, cm:null} (vacío)
 *   medidasLimpiar(lista)                    → lista válida, una por fecha, ordenada
 *   medidasFusionar(local, remota)           → lista
 *   medidasGuardarHoy(lista, valores, ms, fecha) → lista
 *   medidasAlmacen() / medidasLeer(storage) / medidasEscribir(storage, lista) / medidasBorrarAlmacen(storage)
 *   medidasSerie(lista, parte)               → [{fecha, cm}] de las entradas que la tienen
 *   settingsWithMeasures(ajustes, lista)
 *   mergeMeasuresFromCloud(remota)           → boolean
 *   pushMeasuresToCloud()                    → Promise (sube los ajustes, con `_medidas` dentro)
 * ─────────────────────────────────────────────────────────────────────────
 */

var MEDIDAS_PARTES = ["cintura", "pecho", "cadera", "brazo", "muslo"];
var MEDIDAS_CLAVE = "weekplate-medidas-v1";
var MEDIDAS_CAMPO_NUBE = "_medidas";
var MEDIDAS_MAX_ENTRADAS = 365;
var MEDIDA_MIN_CM = 10;
var MEDIDA_MAX_CM = 250;

var _MEDIDAS_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Una medida escrita a mano: coma o punto, una cifra decimal, 10–250 cm. Vacío es «no se midió». */
function medidaAnalizar(texto) {
  var limpio = String(texto == null ? "" : texto).trim();
  if (!limpio) return { ok: true, cm: null };
  if (!/^\d+([.,]\d+)?$/.test(limpio)) return { ok: false, error: "formato" };
  var cm = Number(limpio.replace(",", "."));
  if (!isFinite(cm)) return { ok: false, error: "formato" };
  if (cm < MEDIDA_MIN_CM || cm > MEDIDA_MAX_CM) return { ok: false, error: "rango" };
  if (Math.abs(cm * 10 - Math.round(cm * 10)) > 1e-9) return { ok: false, error: "paso" };
  return { ok: true, cm: Math.round(cm * 10) / 10 };
}

function _medidasFechaValida(fecha) {
  if (typeof fecha !== "string" || !_MEDIDAS_FECHA.test(fecha)) return false;
  var p = fecha.split("-");
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return d.getFullYear() === Number(p[0]) && d.getMonth() === Number(p[1]) - 1 && d.getDate() === Number(p[2]);
}

/** Las partes válidas de un objeto que llega de fuera, o null si no queda ninguna. */
function _medidasPartes(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  var limpio = {};
  var alguna = false;
  MEDIDAS_PARTES.forEach(function (p) {
    var v = m[p];
    if (typeof v !== "number" || !isFinite(v) || v < MEDIDA_MIN_CM || v > MEDIDA_MAX_CM) return;
    limpio[p] = Math.round(v * 10) / 10;
    alguna = true;
  });
  return alguna ? limpio : null;
}

/** Deja solo entradas válidas, una por fecha (gana la de mayor `t`), ordenadas y con las últimas MEDIDAS_MAX_ENTRADAS. */
function medidasLimpiar(lista) {
  var porFecha = {};
  (Array.isArray(lista) ? lista : []).forEach(function (e) {
    if (!e || typeof e !== "object" || !_medidasFechaValida(e.fecha)) return;
    if (typeof e.t !== "number" || !isFinite(e.t) || e.t < 0) return;
    var m = _medidasPartes(e.m);
    if (!m) return;
    var previa = porFecha[e.fecha];
    if (!previa || e.t > previa.t) porFecha[e.fecha] = { fecha: e.fecha, t: e.t, m: m };
  });
  var fechas = Object.keys(porFecha).sort();
  return fechas.slice(Math.max(0, fechas.length - MEDIDAS_MAX_ENTRADAS)).map(function (f) { return porFecha[f]; });
}

/** Une el registro del dispositivo con el de la nube. Con la misma `t`, gana el del dispositivo (va primero). */
function medidasFusionar(local, remota) {
  return medidasLimpiar((Array.isArray(local) ? local : []).concat(Array.isArray(remota) ? remota : []));
}

/**
 * Guarda las medidas de hoy, mezcladas con las que ya hubiera de hoy.
 * @param {object} valores  { parte: cm | null } (null o ausente: no se tocó)
 */
function medidasGuardarHoy(lista, valores, ahoraMs, fechaDeHoy) {
  var limpia = medidasLimpiar(lista);
  var hoy = limpia.filter(function (e) { return e.fecha === fechaDeHoy; })[0];
  var m = {};
  if (hoy) Object.keys(hoy.m).forEach(function (p) { m[p] = hoy.m[p]; });
  MEDIDAS_PARTES.forEach(function (p) {
    if (valores && typeof valores[p] === "number") m[p] = valores[p];
  });
  var nueva = { fecha: fechaDeHoy, t: ahoraMs, m: m };
  if (!_medidasPartes(m) || !_medidasFechaValida(fechaDeHoy)) return limpia;
  return medidasLimpiar(limpia.filter(function (e) { return e.fecha !== fechaDeHoy; }).concat([nueva]));
}

/** localStorage del navegador, o null si no se puede tocar (nunca lanza). */
function medidasAlmacen() {
  try {
    return (typeof window !== "undefined" && window.localStorage) || null;
  } catch (e) {
    return null;
  }
}

function medidasLeer(storage) {
  if (!storage) return [];
  try {
    var texto = storage.getItem(MEDIDAS_CLAVE);
    return texto ? medidasLimpiar(JSON.parse(texto)) : [];
  } catch (e) {
    return [];
  }
}

function medidasEscribir(storage, lista) {
  if (!storage) return false;
  try {
    storage.setItem(MEDIDAS_CLAVE, JSON.stringify(medidasLimpiar(lista)));
    return true;
  } catch (e) {
    return false;
  }
}

function medidasBorrarAlmacen(storage) {
  if (!storage) return;
  try { storage.removeItem(MEDIDAS_CLAVE); } catch (e) { /* nada que hacer */ }
}

/** Los valores de una parte, en orden de fecha: [{ fecha, cm }]. */
function medidasSerie(lista, parte) {
  return medidasLimpiar(lista).filter(function (e) { return typeof e.m[parte] === "number"; })
    .map(function (e) { return { fecha: e.fecha, cm: e.m[parte] }; });
}

/** Copia de unos ajustes con el registro dentro (`_medidas`), lista para subirse. No toca el original. */
function settingsWithMeasures(settings, lista) {
  var copia = {};
  var origen = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  Object.keys(origen).forEach(function (k) { copia[k] = origen[k]; });
  copia[MEDIDAS_CAMPO_NUBE] = medidasLimpiar(lista);
  return copia;
}

/** Mezcla en este dispositivo el registro que bajó de la nube. Nunca lanza. */
function mergeMeasuresFromCloud(remota) {
  var storage = medidasAlmacen();
  if (!storage || !Array.isArray(remota)) return false;
  return medidasEscribir(storage, medidasFusionar(medidasLeer(storage), remota));
}

/**
 * Sube el registro a la cuenta. Va con los ajustes, como el peso: es la misma
 * subida (pushWeightLogToCloud mira la sesión y que la reconciliación haya
 * terminado). Nunca lanza ni rechaza.
 */
function pushMeasuresToCloud() {
  if (typeof pushWeightLogToCloud !== "function") return Promise.resolve({ error: null, skipped: true });
  return pushWeightLogToCloud();
}

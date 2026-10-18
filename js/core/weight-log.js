/**
 * js/core/weight-log.js
 * ─────────────────────────────────────────────────────────────────────────
 * Registro de peso: una entrada por día (fecha YYYY-MM-DD y kilos). Vive en
 * este dispositivo, en su propia clave de localStorage, y con cuenta viaja a
 * la nube DENTRO del documento `settings`, bajo la clave reservada `_pesos`
 * (el mismo camino que `_prefs`, ver js/core/account-prefs.js). Las reglas de
 * Firestore no cambian.
 *
 * El campo «Peso (kg)» del formulario NO depende de esto y el registro no
 * entra en ningún cálculo: sirve para ver la evolución.
 *
 * Reglas:
 *   - Una entrada por fecha. Guardar hoy reemplaza la de hoy.
 *   - Al fusionar con la nube, para la misma fecha gana la de mayor `t`
 *     (momento en que se guardó). Si empatan, gana la del dispositivo.
 *   - Se conservan las últimas WEIGHT_MAX_ENTRIES fechas.
 *   - Sin almacenamiento nada lanza: se devuelve [], false o null.
 *
 * Expone (globales):
 *   WEIGHT_STORAGE_KEY, WEIGHT_CLOUD_FIELD, WEIGHT_MAX_ENTRIES
 *   pesoAnalizar(texto)                 -> {ok, kg} | {ok:false, error}
 *   fechaHoy(date)                      -> "YYYY-MM-DD"
 *   pesoEntradaValida(entrada)          -> boolean
 *   pesosLimpiar(lista)                 -> lista válida, una por fecha, ordenada
 *   pesosFusionar(local, remota)        -> lista
 *   pesosGuardarHoy(lista, kg, ms, hoy) -> lista
 *   pesosAlmacen()                      -> localStorage o null
 *   pesosLeer(storage) / pesosEscribir(storage, lista) / pesosBorrarAlmacen(storage)
 *   pesosParaGrafico(lista)             -> últimas 30 entradas (o todas)
 *   pesosGrafico(puntos, ancho, alto)   -> geometría SVG o null (menos de 2)
 *   settingsWithWeightLog(ajustes, lista)
 *   mergeWeightLogFromCloud(remota)     -> boolean
 *   pushWeightLogToCloud()              -> Promise
 * ─────────────────────────────────────────────────────────────────────────
 */

var WEIGHT_STORAGE_KEY = "weekplate-pesos-v1";
var WEIGHT_CLOUD_FIELD = "_pesos";
var WEIGHT_MAX_ENTRIES = 365;
var WEIGHT_MIN_KG = 30;
var WEIGHT_MAX_KG = 300;
var WEIGHT_CHART_POINTS = 30;

var _WEIGHT_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lee un peso escrito a mano: coma o punto, una sola cifra decimal y rango
 * 30–300.
 * @param {string} texto
 * @returns {{ok:true, kg:number}|{ok:false, error:string}}
 */
function pesoAnalizar(texto) {
  var limpio = String(texto == null ? "" : texto).trim();
  if (!limpio) return { ok: false, error: "vacio" };
  if (!/^\d+([.,]\d+)?$/.test(limpio)) return { ok: false, error: "formato" };
  var kg = Number(limpio.replace(",", "."));
  if (!isFinite(kg)) return { ok: false, error: "formato" };
  if (kg < WEIGHT_MIN_KG || kg > WEIGHT_MAX_KG) return { ok: false, error: "rango" };
  if (Math.abs(kg * 10 - Math.round(kg * 10)) > 1e-9) return { ok: false, error: "paso" };
  return { ok: true, kg: Math.round(kg * 10) / 10 };
}

/** Fecha local de un Date como YYYY-MM-DD. */
function fechaHoy(fecha) {
  // Se comprueba la forma y no `instanceof`: una fecha de otro contexto (p. ej. el de los tests) no lo cumple.
  var d = (fecha && typeof fecha.getFullYear === "function") ? fecha : new Date();
  var mes = String(d.getMonth() + 1);
  if (mes.length < 2) mes = "0" + mes;
  var dia = String(d.getDate());
  if (dia.length < 2) dia = "0" + dia;
  return d.getFullYear() + "-" + mes + "-" + dia;
}

/** ¿Es una entrada del registro bien formada? (Lo que llega de fuera se valida.) */
function pesoEntradaValida(e) {
  if (!e || typeof e !== "object") return false;
  if (typeof e.fecha !== "string" || !_WEIGHT_FECHA.test(e.fecha)) return false;
  if (isNaN(Date.parse(e.fecha + "T00:00:00"))) return false;
  if (typeof e.kg !== "number" || !isFinite(e.kg)) return false;
  if (e.kg < WEIGHT_MIN_KG || e.kg > WEIGHT_MAX_KG) return false;
  return typeof e.t === "number" && isFinite(e.t) && e.t >= 0;
}

/**
 * Deja solo entradas válidas, una por fecha (gana la de mayor `t`), ordenadas
 * por fecha y con las últimas WEIGHT_MAX_ENTRIES.
 * @param {object[]} lista
 * @returns {{fecha:string, kg:number, t:number}[]}
 */
function pesosLimpiar(lista) {
  var porFecha = {};
  (Array.isArray(lista) ? lista : []).forEach(function (e) {
    if (!pesoEntradaValida(e)) return;
    var previa = porFecha[e.fecha];
    if (!previa || e.t > previa.t) porFecha[e.fecha] = { fecha: e.fecha, kg: e.kg, t: e.t };
  });
  var fechas = Object.keys(porFecha).sort();
  var desde = Math.max(0, fechas.length - WEIGHT_MAX_ENTRIES);
  return fechas.slice(desde).map(function (f) { return porFecha[f]; });
}

/** Fusiona el registro del dispositivo con el de la nube. */
function pesosFusionar(local, remota) {
  return pesosLimpiar((Array.isArray(local) ? local : []).concat(Array.isArray(remota) ? remota : []));
}

/**
 * Guarda el peso de hoy, reemplazando la entrada de hoy si existía. Si el
 * peso no es válido, devuelve el registro tal cual, sin tocar nada.
 */
function pesosGuardarHoy(lista, kg, ahoraMs, fechaDeHoy) {
  var nueva = { fecha: fechaDeHoy, kg: kg, t: ahoraMs };
  if (!pesoEntradaValida(nueva)) return pesosLimpiar(lista);
  var sinHoy = pesosLimpiar(lista).filter(function (e) { return e.fecha !== fechaDeHoy; });
  sinHoy.push(nueva);
  return pesosLimpiar(sinHoy);
}

/** localStorage del navegador, o null si no se puede tocar (nunca lanza). */
function pesosAlmacen() {
  try {
    return (typeof window !== "undefined" && window.localStorage) || null;
  } catch (e) {
    return null;
  }
}

/** @returns {object[]} el registro guardado, o [] si no hay o no se puede leer */
function pesosLeer(storage) {
  if (!storage) return [];
  try {
    var texto = storage.getItem(WEIGHT_STORAGE_KEY);
    if (!texto) return [];
    return pesosLimpiar(JSON.parse(texto));
  } catch (e) {
    return [];
  }
}

/** @returns {boolean} true si quedó guardado */
function pesosEscribir(storage, lista) {
  if (!storage) return false;
  try {
    storage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(pesosLimpiar(lista)));
    return true;
  } catch (e) {
    return false;
  }
}

/** @param {object|null} storage */
function pesosBorrarAlmacen(storage) {
  if (!storage) return;
  try {
    storage.removeItem(WEIGHT_STORAGE_KEY);
  } catch (e) {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** Los puntos del gráfico: las últimas 30 entradas, o todas si hay menos. */
function pesosParaGrafico(lista) {
  var limpia = pesosLimpiar(lista);
  return limpia.slice(Math.max(0, limpia.length - WEIGHT_CHART_POINTS));
}

/**
 * Geometría de la línea SVG (solo números, ningún texto de usuario). Con
 * menos de dos puntos no hay línea: devuelve null.
 * @returns {{path:string, min:number, max:number, primera:string, ultima:string}|null}
 */
function pesosGrafico(puntos, ancho, alto) {
  var lista = (Array.isArray(puntos) ? puntos : []).filter(pesoEntradaValida);
  if (lista.length < 2) return null;
  var w = ancho || 320;
  var h = alto || 120;
  var margen = 8;
  var min = Infinity;
  var max = -Infinity;
  lista.forEach(function (p) {
    if (p.kg < min) min = p.kg;
    if (p.kg > max) max = p.kg;
  });
  var rango = (max - min) || 1;
  var pasoX = (w - 2 * margen) / (lista.length - 1);
  var path = lista.map(function (p, i) {
    var x = margen + pasoX * i;
    var y = margen + (h - 2 * margen) * (1 - (p.kg - min) / rango);
    return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ");
  return {
    path: path,
    min: min,
    max: max,
    primera: lista[0].fecha,
    ultima: lista[lista.length - 1].fecha
  };
}

/**
 * Copia de unos ajustes con el registro dentro (`_pesos`), lista para subirse.
 * No toca el objeto original.
 */
function settingsWithWeightLog(settings, lista) {
  var copia = {};
  var origen = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  Object.keys(origen).forEach(function (k) { copia[k] = origen[k]; });
  copia[WEIGHT_CLOUD_FIELD] = pesosLimpiar(lista);
  return copia;
}

/**
 * Mezcla en este dispositivo el registro que bajó de la nube (`_pesos` de los
 * ajustes de la cuenta). Nunca lanza.
 * @returns {boolean} true si quedó guardado
 */
function mergeWeightLogFromCloud(remota) {
  var storage = pesosAlmacen();
  if (!storage || !Array.isArray(remota)) return false;
  return pesosEscribir(storage, pesosFusionar(pesosLeer(storage), remota));
}

/**
 * Sube el registro a la cuenta, si hay sesión y la reconciliación de esa
 * cuenta ya terminó (igual que account-prefs). Nunca lanza ni rechaza.
 * @returns {Promise<{error:object|null, skipped:boolean}>}
 */
function pushWeightLogToCloud() {
  var vacio = Promise.resolve({ error: null, skipped: true });
  try {
    var usuario = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
    if (!usuario) return vacio;
    if (typeof getCloudSyncedUserId === "function" && getCloudSyncedUserId() !== usuario.id) return vacio;
    if (typeof pushSettingsToCloud !== "function") return vacio;
    return pushSettingsToCloud();
  } catch (err) {
    return vacio;
  }
}

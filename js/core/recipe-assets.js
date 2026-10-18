/**
 * js/core/recipe-assets.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga perezosa de los PASOS de receta. No se descarga nada al arrancar:
 * el plan pinta cada desplegable "Cómo se hace" cerrado, y los pasos se piden
 * la primera vez que alguien lo abre (ver rellenarPasosReceta en render.js).
 *
 * Qué se carga, y cuándo:
 *   - js/data/dish-steps.js        los pasos en español (DISH_STEPS).
 *   - js/i18n/steps-<idioma>.js    su traducción, solo para en, ru y uk.
 *     El español no necesita tabla: el paso ya está en español.
 *
 * Por qué no con el resto de tablas de i18n: esas se cargan todas al arrancar
 * para que la interfaz no parpadee al cambiar de idioma. Los pasos viven dentro
 * de un desplegable cerrado; si tardan un instante en aparecer, no hay nada que
 * parpadee.
 *
 * La URL lleva el mismo sello ?v= que esta página. Así el service worker la
 * guarda la primera vez que se pide y la sirve sin red después (sw.js, "recurso
 * con sello"). Por eso una receta abierta una vez funciona sin cobertura.
 *
 * Depende de (solo al llamar, no al cargar): js/core/i18n.js (STEP_TABLES,
 * LANGS, DEFAULT_LANG) y, en el navegador, el propio documento.
 *
 * Expone (globales):
 *   recetaPasos(nombre)              -> string[] | null (null mientras no esté cargado)
 *   recetaCargar(idioma, inyectar?)  -> Promise<void>; inyectar(url) -> Promise
 *   recetaCargadaPara(idioma)        -> boolean
 * ─────────────────────────────────────────────────────────────────────────
 */

var RECETA_PASOS_RUTA = "js/data/dish-steps.js";

// Idiomas que tienen tabla de pasos (js/i18n/steps-*.js). Cualquier otro se
// muestra en español: pedir un fichero que no existe daría un error en la red.
var RECETA_IDIOMAS_CON_TABLA = ["en", "ru", "uk"];

// Promesas de carga, para no pedir dos veces el mismo fichero. Si una falla,
// se borra y la siguiente vez que se abra la receta se vuelve a intentar.
var _recetaCarga = { pasos: null, idiomas: {} };

// El sello de la página: el mismo ?v= con el que se cargó este fichero.
var _recetaSello = (function () {
  try {
    var src = (document.currentScript && document.currentScript.src) || "";
    var m = /[?&]v=([0-9a-z]+)/.exec(src);
    return m ? m[1] : "";
  } catch (err) {
    return "";
  }
})();

function recetaUrl(ruta) {
  return _recetaSello ? ruta + "?v=" + _recetaSello : ruta;
}

/** Inserta un <script> y resuelve cuando el fichero se ha ejecutado. */
function recetaInyectarScript(url) {
  return new Promise(function (resolve, reject) {
    var el = document.createElement("script");
    el.src = url;
    el.async = true;
    el.onload = function () { resolve(); };
    el.onerror = function () { reject(new Error("no se pudo cargar " + url)); };
    document.head.appendChild(el);
  });
}

/** Idioma válido para la tabla de pasos, o español si no tiene tabla. */
function recetaIdiomaConTabla(idioma) {
  var defecto = (typeof DEFAULT_LANG !== "undefined") ? DEFAULT_LANG : "es";
  if (RECETA_IDIOMAS_CON_TABLA.indexOf(idioma) === -1) return defecto;
  return idioma;
}

/**
 * Los pasos en español de un plato, o null si todavía no se han cargado o el
 * plato no tiene pasos. Si el dato aún está en el formato antiguo (pasos
 * dentro de DISH_INSTRUCTIONS), también se devuelven.
 * @param {string} nombre
 * @returns {string[]|null}
 */
function recetaPasos(nombre) {
  if (!nombre) return null;
  if (typeof DISH_STEPS !== "undefined" && DISH_STEPS &&
      Object.prototype.hasOwnProperty.call(DISH_STEPS, nombre)) {
    return DISH_STEPS[nombre];
  }
  if (typeof DISH_INSTRUCTIONS !== "undefined" && DISH_INSTRUCTIONS &&
      Object.prototype.hasOwnProperty.call(DISH_INSTRUCTIONS, nombre) &&
      Array.isArray(DISH_INSTRUCTIONS[nombre].steps)) {
    return DISH_INSTRUCTIONS[nombre].steps;
  }
  return null;
}

/**
 * ¿Están ya cargados los pasos que hacen falta para este idioma?
 * @param {string} idioma
 * @returns {boolean}
 */
function recetaCargadaPara(idioma) {
  if (typeof DISH_STEPS === "undefined" || !DISH_STEPS) return false;
  var lang = recetaIdiomaConTabla(idioma);
  if (lang === ((typeof DEFAULT_LANG !== "undefined") ? DEFAULT_LANG : "es")) return true;
  return !!(typeof STEP_TABLES !== "undefined" && STEP_TABLES[lang]);
}

/**
 * Carga lo que haga falta para mostrar los pasos en ese idioma. Pide cada
 * fichero una sola vez; llamarla otra vez con todo cargado no descarga nada.
 * @param {string} idioma
 * @param {function(string): Promise} [inyectar] - por defecto inserta un <script>;
 *   los tests pasan uno que ejecuta el fichero en su sandbox.
 * @returns {Promise<void>}
 */
function recetaCargar(idioma, inyectar) {
  var inyector = inyectar || recetaInyectarScript;
  var esperas = [];

  if (typeof DISH_STEPS === "undefined" || !DISH_STEPS) {
    if (!_recetaCarga.pasos) {
      _recetaCarga.pasos = inyector(recetaUrl(RECETA_PASOS_RUTA)).then(null, function (err) {
        _recetaCarga.pasos = null;
        throw err;
      });
    }
    esperas.push(_recetaCarga.pasos);
  }

  var lang = recetaIdiomaConTabla(idioma);
  var defecto = (typeof DEFAULT_LANG !== "undefined") ? DEFAULT_LANG : "es";
  if (lang !== defecto && !(typeof STEP_TABLES !== "undefined" && STEP_TABLES[lang])) {
    if (!_recetaCarga.idiomas[lang]) {
      _recetaCarga.idiomas[lang] = inyector(recetaUrl("js/i18n/steps-" + lang + ".js")).then(null, function (err) {
        _recetaCarga.idiomas[lang] = null;
        throw err;
      });
    }
    esperas.push(_recetaCarga.idiomas[lang]);
  }

  return Promise.all(esperas).then(function () {});
}

/**
 * js/core/productos-idioma.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga perezosa de la traducción de los nombres de producto del modo "sin
 * cocinar" (js/i18n/productos-<idioma>.js, ver tProduct en js/core/i18n.js).
 * Solo la del idioma en uso: cada una pesa ~100 KB y las tres juntas en cada
 * arranque no las necesita nadie.
 *
 * Se pide al arrancar, sin esperar a nada. Lo que se pinte antes de que
 * llegue sale con el nombre de la etiqueta (que ya se enseña de todos modos)
 * y js/app.js vuelve a pintar el plan "sin cocinar" cuando llega.
 *
 * La URL lleva el sello ?v= de la página (recetaUrl, recipe-assets.js): el
 * service worker la guarda la primera vez y la sirve sin red después.
 *
 * Depende de (solo al llamar): js/core/i18n.js (PRODUCT_TABLES, DEFAULT_LANG)
 * y js/core/recipe-assets.js (recetaUrl, recetaInyectarScript).
 *
 * Expone (globales):
 *   productosCargar(idioma, inyectar?)  -> Promise<boolean>: true si ha llegado una tabla nueva
 *   productosCargadosPara(idioma)       -> boolean
 * ─────────────────────────────────────────────────────────────────────────
 */

var PRODUCTOS_IDIOMAS_CON_TABLA = ["en", "ru", "uk"];

// Una promesa por idioma, para no pedir dos veces el mismo fichero. Si falla
// se borra: la próxima carga de la página lo vuelve a intentar.
var _productosCarga = {};

/**
 * ¿Hace falta algo más para enseñar los productos en ese idioma? El español
 * y los idiomas sin tabla no necesitan nada: se ven con su nombre de siempre.
 * @param {string} idioma
 * @returns {boolean}
 */
function productosCargadosPara(idioma) {
  if (PRODUCTOS_IDIOMAS_CON_TABLA.indexOf(idioma) === -1) return true;
  return !!(typeof PRODUCT_TABLES !== "undefined" && PRODUCT_TABLES[idioma]);
}

/**
 * @param {string} idioma
 * @param {function(string): Promise} [inyectar] - por defecto inserta un <script>;
 *   los tests pasan uno que ejecuta el fichero en su sandbox.
 * @returns {Promise<boolean>}
 */
function productosCargar(idioma, inyectar) {
  if (productosCargadosPara(idioma)) return Promise.resolve(false);
  var inyector = inyectar || (typeof recetaInyectarScript === "function" ? recetaInyectarScript : null);
  if (!inyector) return Promise.resolve(false);
  if (!_productosCarga[idioma]) {
    var ruta = "js/i18n/productos-" + idioma + ".js";
    var url = (typeof recetaUrl === "function") ? recetaUrl(ruta) : ruta;
    _productosCarga[idioma] = inyector(url).then(function () {
      return productosCargadosPara(idioma);
    }, function (err) {
      _productosCarga[idioma] = null;
      throw err;
    });
  }
  return _productosCarga[idioma];
}

/**
 * js/core/shopping-checks.js
 * ─────────────────────────────────────────────────────────────────────────
 * Qué productos de la lista de la compra ya están en el carrito.
 *
 * Por qué existe (2026-09-28): la lista pintaba una casilla junto a cada
 * producto que NO hacía nada (`aria-hidden`, sin manejador). Parecía que se
 * podía marcar y no se podía. Ahora sí, y la marca se guarda en este
 * dispositivo para que sobreviva a una recarga en mitad del súper.
 *
 * La clave de cada marca es el INGREDIENTE y CUÁNTOS ENVASES hay que
 * comprar, no la lista entera. Así, cambiar una toma que no toca ese
 * producto no borra lo ya marcado; pero si el cambio hace falta comprar
 * más (de 1 a 2 botes), la marca vieja ya no vale y se pierde, que es lo
 * correcto: lo que llevas en el carrito ya no basta.
 *
 * No toca el DOM: se prueba sin navegador (tests/shopping-checks.test.js).
 * Lo pinta js/ui/render-shopping-list.js.
 *
 * Expone (globales):
 *   SHOPPING_CHECKS_KEY
 *   claveDeArticulo(entry)            -> "Nombre|envases"
 *   leerMarcasCompra()                -> { clave: true, ... }
 *   guardarMarcasCompra(marcas, claves) -> marcas podadas a `claves`
 *   alternarMarcaCompra(clave, claves)  -> nuevo estado (boolean)
 *   ordenarPorMarca(items, marcas)    -> sin marcar primero, orden estable
 * ─────────────────────────────────────────────────────────────────────────
 */

var SHOPPING_CHECKS_KEY = "nutritionPlanner.shoppingChecks.v1";

// Mismo patrón que settings.js: solo se usa si no hay localStorage (tests,
// ventana privada que lo bloquea).
var _marcasEnMemoria = {};

/**
 * @param {{name:string, purchase:{packagesToBuy:(number|null)}}} entry
 * @returns {string}
 */
function claveDeArticulo(entry) {
  if (!entry || typeof entry.name !== "string") return "";
  var p = entry.purchase || {};
  var envases = typeof p.packagesToBuy === "number" ? p.packagesToBuy : "peso";
  return entry.name + "|" + envases;
}

function _sanearMarcas(raw) {
  var limpio = {};
  if (!raw || typeof raw !== "object") return limpio;
  Object.keys(raw).forEach(function (k) {
    if (raw[k] === true && typeof k === "string" && k.length > 0 && k.length <= 200) {
      limpio[k] = true;
    }
  });
  return limpio;
}

/** @returns {Object<string, boolean>} */
function leerMarcasCompra() {
  if (typeof localStorage === "undefined") return _sanearMarcas(_marcasEnMemoria);
  try {
    var raw = localStorage.getItem(SHOPPING_CHECKS_KEY);
    return raw ? _sanearMarcas(JSON.parse(raw)) : {};
  } catch (err) {
    return _sanearMarcas(_marcasEnMemoria);
  }
}

/**
 * Guarda las marcas, quedándose SOLO con las de los productos que están
 * hoy en la lista (`claves`): si no, cada plan nuevo dejaría basura.
 * @param {Object<string, boolean>} marcas
 * @param {string[]} [claves]
 * @returns {Object<string, boolean>} lo que quedó guardado
 */
function guardarMarcasCompra(marcas, claves) {
  var limpio = _sanearMarcas(marcas);
  if (Array.isArray(claves)) {
    var vigentes = {};
    claves.forEach(function (c) { vigentes[c] = true; });
    Object.keys(limpio).forEach(function (k) { if (!vigentes[k]) delete limpio[k]; });
  }
  _marcasEnMemoria = limpio;
  if (typeof localStorage !== "undefined") {
    try { localStorage.setItem(SHOPPING_CHECKS_KEY, JSON.stringify(limpio)); } catch (err) { /* memoria */ }
  }
  return limpio;
}

/**
 * Marca o desmarca un producto.
 * @param {string} clave
 * @param {string[]} [claves] - las de la lista actual, para podar
 * @returns {boolean} true si queda MARCADO
 */
function alternarMarcaCompra(clave, claves) {
  var marcas = leerMarcasCompra();
  if (marcas[clave]) delete marcas[clave];
  else marcas[clave] = true;
  var guardadas = guardarMarcasCompra(marcas, claves);
  return guardadas[clave] === true;
}

/**
 * Lo que falta por coger arriba; lo que ya está en el carrito, abajo. El
 * orden dentro de cada grupo es el de entrada (la lista ya viene ordenada
 * por precio): `sort` no es estable en todos los motores, así que se
 * reparte a mano.
 * @param {object[]} items
 * @param {Object<string, boolean>} marcas
 * @returns {object[]}
 */
function ordenarPorMarca(items, marcas) {
  var pendientes = [];
  var cogidos = [];
  (items || []).forEach(function (it) {
    (marcas && marcas[claveDeArticulo(it)] ? cogidos : pendientes).push(it);
  });
  return pendientes.concat(cogidos);
}

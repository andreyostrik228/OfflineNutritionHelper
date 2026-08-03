/**
 * poc/core/load-real-products.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga js/data/real-products.js TAL CUAL (sin copiarlo ni modificarlo) en
 * un contexto Node aislado, para poder usar el REAL_PRODUCTS real desde
 * scripts/tests de este proof-of-concept. El archivo original declara
 * `var REAL_PRODUCTS = [...]` como global de navegador, sin `module.exports`
 * -- este loader lo ejecuta en un sandbox de `vm` y extrae esa variable,
 * sin tocar el archivo fuente.
 * ─────────────────────────────────────────────────────────────────────────
 */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

function loadRealProducts() {
  var filePath = path.join(__dirname, "..", "..", "js", "data", "real-products.js");
  var code = fs.readFileSync(filePath, "utf8");
  var sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  if (!Array.isArray(sandbox.REAL_PRODUCTS)) {
    throw new Error("No se pudo cargar REAL_PRODUCTS desde " + filePath);
  }
  return sandbox.REAL_PRODUCTS;
}

module.exports = { loadRealProducts: loadRealProducts };

/**
 * tests/lib/load-browser-globals.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga un conjunto de archivos JS de navegador (globals `var`/`function`,
 * sin módulos) EN ORDEN, dentro de un único contexto `vm` compartido, para
 * poder testear el código de producción real desde Node sin copiarlo ni
 * envolverlo en module.exports. Mismo patrón que ya usa
 * poc/core/load-real-products.js / load-dishes.js para el mismo problema.
 *
 * @param {string[]} absolutePaths - rutas absolutas, en el mismo orden que
 *                                   index.html las carga por <script>
 * @returns {object} el sandbox (contiene todos los globals declarados)
 */
var fs = require("fs");
var vm = require("vm");

function loadBrowserGlobals(absolutePaths) {
  var sandbox = {};
  vm.createContext(sandbox);
  absolutePaths.forEach(function (filePath) {
    var code = fs.readFileSync(filePath, "utf8");
    vm.runInContext(code, sandbox, { filename: filePath });
  });
  return sandbox;
}

module.exports = { loadBrowserGlobals: loadBrowserGlobals };

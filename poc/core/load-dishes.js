/**
 * poc/core/load-dishes.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga js/data/dishes.js TAL CUAL (sin copiarlo ni modificarlo) en un
 * contexto Node aislado, igual que load-real-products.js. Se usa para
 * extraer programáticamente la lista real de ingredient roles usados por
 * DISH_DB -- nunca a mano, para que la auditoría de cobertura no dependa
 * de una transcripción manual (y quede desactualizada si dishes.js cambia).
 * ─────────────────────────────────────────────────────────────────────────
 */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

function loadDishes() {
  var filePath = path.join(__dirname, "..", "..", "js", "data", "dishes.js");
  var code = fs.readFileSync(filePath, "utf8");
  var sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  if (!Array.isArray(sandbox.DISH_DB)) {
    throw new Error("No se pudo cargar DISH_DB desde " + filePath);
  }
  return sandbox.DISH_DB;
}

/**
 * Devuelve la lista de ingredient roles únicos usados en DISH_DB, con el
 * número de platos donde aparece cada uno, ordenada alfabéticamente.
 * @param {object[]} [dishes] - por defecto, carga DISH_DB real
 * @returns {{ name: string, count: number }[]}
 */
function extractUniqueIngredientRoles(dishes) {
  var list = dishes || loadDishes();
  var counts = {};
  list.forEach(function (dish) {
    dish.items.forEach(function (item) {
      counts[item.name] = (counts[item.name] || 0) + 1;
    });
  });
  return Object.keys(counts).sort().map(function (name) {
    return { name: name, count: counts[name] };
  });
}

module.exports = { loadDishes: loadDishes, extractUniqueIngredientRoles: extractUniqueIngredientRoles };

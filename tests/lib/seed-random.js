/**
 * tests/lib/seed-random.js
 * ─────────────────────────────────────────────────────────────────────────
 * Sustituye Math.random() DENTRO de un sandbox `vm` concreto por un PRNG
 * determinista (mulberry32), para poder escribir tests golden-master sobre
 * código de producción que usa Math.random() internamente (dish-selector.js:
 * diversityScore/pickWeightedByScore/pickWeightedFromTop).
 *
 * Por qué hace falta hacerlo DENTRO del sandbox y no fuera: cada vm.context
 * tiene su propio objeto global y, por tanto, su propio Math -- sobrescribir
 * el Math.random del proceso Node (fuera del sandbox) NO afecta al código
 * cargado con loadBrowserGlobals(), porque ese código referencia el Math
 * DEL SANDBOX, no el de Node.
 *
 * mulberry32 se eligió por ser un PRNG determinista de una sola palabra de
 * estado, sin dependencias externas, con buena dispersión -- no por ninguna
 * propiedad criptográfica (no hace falta ninguna aquí).
 *
 * Uso:
 *   var sandbox = loadBrowserGlobals([...]);
 *   seedRandomInContext(sandbox, 42); // A PARTIR de aquí, Math.random()
 *                                     // dentro del sandbox es determinista
 *   var result = sandbox.generateDietPlan(profile, data);
 *   // La misma semilla siempre produce el mismo resultado.
 * ─────────────────────────────────────────────────────────────────────────
 */
var vm = require("vm");

/**
 * @param {object} sandbox - contexto vm ya creado (ver loadBrowserGlobals)
 * @param {number} seed
 */
function seedRandomInContext(sandbox, seed) {
  var code =
    "(function (seed) {\n" +
    "  Math.random = function () {\n" +
    "    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;\n" +
    "    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);\n" +
    "    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;\n" +
    "    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n" +
    "  };\n" +
    "})(" + Number(seed) + ");";
  vm.runInContext(code, sandbox, { filename: "seed-random.js" });
}

module.exports = { seedRandomInContext: seedRandomInContext };

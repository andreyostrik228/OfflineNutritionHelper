"use strict";
/**
 * A/B de un cambio en el MOTOR (no en el catalogo).
 *
 * medir_perfiles.js compara dos catalogos con el mismo motor. Esto hace lo
 * contrario: mismo catalogo, y el motor del arbol de trabajo contra el de un
 * commit. Sin esto, tocar dish-selector.js y medir con el otro banco compara
 * el cambio consigo mismo y siempre sale "sin diferencia".
 *
 *   node scripts/generar-platos/probar_motor.js            (contra HEAD)
 *   node scripts/generar-platos/probar_motor.js HEAD~1 400
 *
 * Igual que el otro banco: `~1`, nunca `^` -- en Windows cmd.exe se come el
 * caret y git devuelve otro commit sin avisar.
 */
var path = require("path"), fs = require("fs"), vm = require("vm"), cp = require("child_process");
var REPO = path.resolve(__dirname, "..", "..");
var seedRandomInContext = require(path.join(REPO, "tests/lib/seed-random")).seedRandomInContext;
var M = require(path.join(__dirname, "medir_perfiles.js"));

// Ficheros del motor que se toman de una version u otra. El resto (datos)
// sale siempre del arbol, para que lo unico que cambie sea el motor.
var MOTOR = ["js/core/pricing.js", "js/core/nutrition.js", "js/core/budget.js",
  "js/core/calculator.js", "js/core/meal-helpers.js",
  "js/engine/dish-selector.js", "js/engine/plan-generator.js"];
var DATOS = ["js/data/dishes.js", "js/data/real-products.js", "js/data/packaging.js",
  "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js",
  "js/data/no-cook-classifier.js", "js/data/prices/mercadona.js",
  "js/data/budget-presets.js", "js/core/utils.js", "js/core/pantry.js"];

var ref = process.argv[2] || "HEAD";
var SEMILLAS = Number(process.argv[3] || 200);
if (ref.indexOf("^") !== -1) {
  console.error("ERROR: usa `~1`, no `^`: cmd.exe se lo come y git devuelve otro commit.");
  process.exit(1);
}

function fuente(rel, desdeRef) {
  if (!desdeRef) return fs.readFileSync(path.join(REPO, rel), "utf8");
  return cp.execSync("git show " + ref + ":" + rel, { cwd: REPO, maxBuffer: 1 << 26 }).toString("utf8");
}

function sandbox(motorDesdeRef) {
  var c = {}; c.window = c; c.globalThis = c; c.console = console;
  vm.createContext(c);
  // El orden importa: datos y utilidades antes que el motor.
  DATOS.forEach(function (f) { vm.runInContext(fuente(f, false), c, { filename: f }); });
  MOTOR.forEach(function (f) { vm.runInContext(fuente(f, motorDesdeRef), c, { filename: f }); });
  return c;
}

function medir(c, perfil) {
  var profile = c.calculateProfile(perfil.raw);
  var data = {
    budget: c.resolveBudget({ budgetMode: perfil.modo, budgetCustom: NaN }),
    cookTime: perfil.cookTime, taste: perfil.taste, store: "mercadona"
  };
  var n = 0, kcal = 0, prot = 0, compra = 0, dias = 0, perf = 0, tipos = {};
  for (var i = 1; i <= SEMILLAS; i++) {
    seedRandomInContext(c, i);
    var r = c.generateDietPlan(profile, data);
    if (!r || !r.total || !r.report) continue;
    n++; kcal += r.total.kcal; prot += r.total.protein; compra += r.total.purchaseCost;
    if ((r.report.violations || []).length) dias++;
    if (r.report.status === "perfect") perf++;
    (r.report.violations || []).forEach(function (v) { tipos[v.type] = (tipos[v.type] || 0) + 1; });
  }
  return { objKcal: profile.calories, objProt: profile.protein, kcal: kcal / n, prot: prot / n,
    compra: compra / n, dias: dias / n * 100, perf: perf / n * 100, tipos: tipos };
}

console.log("Motor de " + ref + " (ANTES) contra el del arbol (AHORA). " + SEMILLAS + " semillas.");
console.log("Ruido tipico de un porcentaje: " + (100 / (2 * Math.sqrt(SEMILLAS))).toFixed(1) + " puntos.");
console.log("");

var antes = sandbox(true), ahora = sandbox(false);
M.PERFILES.forEach(function (p) {
  var a = medir(antes, p), b = medir(ahora, p);
  console.log("=== " + p.id + "  (objetivo " + a.objKcal + " kcal / " + a.objProt + " g prot) ===");
  function fila(et, x) {
    console.log("  " + et.padEnd(6)
      + " kcal " + x.kcal.toFixed(0).padStart(5) + " (" + ((x.kcal / x.objKcal - 1) * 100).toFixed(1).padStart(5) + "%)"
      + "   prot " + x.prot.toFixed(1).padStart(5) + " (" + ((x.prot / x.objProt - 1) * 100).toFixed(1).padStart(6) + "%)"
      + "   compra " + x.compra.toFixed(2).padStart(5)
      + "   violan " + x.dias.toFixed(1).padStart(5) + "%"
      + "   perfect " + x.perf.toFixed(1).padStart(5) + "%");
    var t = Object.keys(x.tipos);
    if (t.length) console.log("         " + t.map(function (k) { return k + " x" + x.tipos[k]; }).join("  "));
  }
  fila("ANTES", a); fila("AHORA", b);
  console.log("");
});

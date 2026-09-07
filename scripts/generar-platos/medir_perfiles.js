"use strict";
/**
 * Mide los tres perfiles representativos contra el catalogo que hay AHORA
 * en el arbol de trabajo, y opcionalmente contra un commit anterior.
 *
 * ── POR QUE EXISTE ──────────────────────────────────────────────────────
 * El lote 1 se midio, luego se REGENERO (un cambio en la clave de grupo
 * cambio los 60 platos), y se publico el lote nuevo con los numeros del
 * viejo. Resultado: se anuncio que el perfil de corte mejoraba (49% de dias
 * con violacion) cuando en realidad empeoraba (67%, frente al 53% de
 * partida). El error no fue de calculo: fue no volver a medir despues de
 * cambiar el artefacto, porque medir costaba montar un banco a mano cada
 * vez. Este fichero elimina esa excusa.
 *
 * REGLA: se mide lo que se PUBLICA. Si regeneras el lote, vuelves a medir.
 *
 * ── USO ─────────────────────────────────────────────────────────────────
 *   node scripts/generar-platos/medir_perfiles.js                 (solo ahora)
 *   node scripts/generar-platos/medir_perfiles.js a501d1c~1       (antes/despues)
 *   node scripts/generar-platos/medir_perfiles.js a501d1c~1 400   (mas semillas)
 *
 * Con 200 semillas el error tipico de un porcentaje ronda los 3,5 puntos:
 * una diferencia menor que eso NO es una senal, es ruido. Sube a 400 si
 * necesitas distinguir algo pequeno.
 */
var path = require("path"), fs = require("fs"), vm = require("vm"), cp = require("child_process");
var REPO = path.resolve(__dirname, "..", "..");
var seedRandomInContext = require(path.join(REPO, "tests/lib/seed-random")).seedRandomInContext;

// Mismo juego de ficheros que freshEngineSandbox() en
// tests/plan-generator.characterization.test.js. Si ese cambia, este tambien.
var FICHEROS = [
  "js/data/real-products.js", "js/data/packaging.js",
  "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js",
  "js/data/no-cook-classifier.js", "js/data/prices/mercadona.js",
  "js/data/budget-presets.js", "js/core/utils.js", "js/core/pricing.js",
  "js/core/nutrition.js", "js/core/pantry.js", "js/core/budget.js",
  "js/core/calculator.js", "js/core/meal-helpers.js",
  "js/engine/dish-selector.js", "js/engine/plan-generator.js"
];

// Los tres primeros PROFILES del test de caracterizacion, tal cual.
var PERFILES = [
  { id: "corte", raw: { age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" },
    modo: "small", cookTime: 20, taste: "mixed" },
  { id: "recomp", raw: { age: 27, sex: "male", weight: 78, height: 178, activity: 1.55, workouts: 4, goal: "recomp" },
    modo: "medium", cookTime: 30, taste: "mixed" },
  { id: "volumen", raw: { age: 24, sex: "male", weight: 90, height: 188, activity: 1.725, workouts: 6, goal: "bulk" },
    modo: "high", cookTime: 35, taste: "savory" }
];

function sandboxCon(fuenteDishes) {
  var c = {};
  c.window = c; c.globalThis = c; c.console = console;
  vm.createContext(c);
  vm.runInContext(fuenteDishes, c, { filename: "dishes.js" });
  FICHEROS.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(REPO, f), "utf8"), c, { filename: f });
  });
  return c;
}

/**
 * TRAMPA REAL, medida el 2026-09-07: en Windows, child_process usa cmd.exe,
 * donde `^` es el caracter de escape. `git show HEAD^:fichero` llega a git
 * como `git show HEAD:fichero` -- sin error, con el commit EQUIVOCADO, que
 * es lo peor que puede pasar en una medicion. Se rechaza el `^` y se pide
 * `~1`, que cmd no toca.
 */
function fuenteDeRef(ref) {
  if (ref.indexOf("^") !== -1) {
    console.error("ERROR: usa `~1` en vez de `^`. En Windows cmd.exe se come el `^`");
    console.error("       y `git show " + ref + ":...` te devuelve OTRO commit sin avisar.");
    process.exit(1);
  }
  return cp.execSync("git show " + ref + ":js/data/dishes.js",
    { cwd: REPO, maxBuffer: 1 << 26 }).toString("utf8");
}

function medir(fuente, perfil, semillas) {
  var s = sandboxCon(fuente);
  var profile = s.calculateProfile(perfil.raw);
  var data = {
    budget: s.resolveBudget({ budgetMode: perfil.modo, budgetCustom: NaN }),
    cookTime: perfil.cookTime, taste: perfil.taste, store: "mercadona"
  };
  var n = 0, kcal = 0, prot = 0, compra = 0, dias = 0, perfectos = 0, tipos = {};
  for (var i = 1; i <= semillas; i++) {
    seedRandomInContext(s, i);
    var r = s.generateDietPlan(profile, data);
    if (!r || !r.total || !r.report) continue;
    n++;
    kcal += r.total.kcal; prot += r.total.protein; compra += r.total.purchaseCost;
    if ((r.report.violations || []).length) dias++;
    if (r.report.status === "perfect") perfectos++;
    (r.report.violations || []).forEach(function (v) { tipos[v.type] = (tipos[v.type] || 0) + 1; });
  }
  return {
    platos: s.DISH_DB.length, objetivoKcal: profile.calories, objetivoProt: profile.protein,
    tope: data.budget, kcal: kcal / n, prot: prot / n, compra: compra / n,
    dias: dias / n * 100, perfectos: perfectos / n * 100, tipos: tipos
  };
}

// Reutilizable desde otros scripts (probar_lote.js lo usa para medir un
// lote CANDIDATO sin haberlo metido todavia en el repo).
module.exports = { medir: medir, PERFILES: PERFILES, fuenteDeRef: fuenteDeRef, REPO: REPO };
if (require.main !== module) return;

var refBase = process.argv[2] || null;
var SEMILLAS = Number(process.argv[3] || 200);
var ahora = fs.readFileSync(path.join(REPO, "js/data/dishes.js"), "utf8");
var base = refBase ? fuenteDeRef(refBase) : null;

console.log("Semillas por perfil: " + SEMILLAS + "   (error tipico de un % ~ "
  + (100 / (2 * Math.sqrt(SEMILLAS))).toFixed(1) + " puntos)");
console.log("");

function linea(etiqueta, x) {
  console.log("  " + etiqueta.padEnd(9)
    + String(x.platos).padStart(4) + " platos"
    + "   kcal " + x.kcal.toFixed(0).padStart(5) + " (" + ((x.kcal / x.objetivoKcal - 1) * 100).toFixed(1).padStart(5) + "%)"
    + "   prot " + x.prot.toFixed(1).padStart(5) + " g"
    + "   compra " + x.compra.toFixed(2).padStart(5)
    + "   violan " + x.dias.toFixed(1).padStart(5) + "%"
    + "   perfect " + x.perfectos.toFixed(1).padStart(5) + "%");
  var t = Object.keys(x.tipos);
  if (t.length) console.log("            tipos: " + t.map(function (k) { return k + " x" + x.tipos[k]; }).join("  "));
}

PERFILES.forEach(function (p) {
  var b = medir(ahora, p, SEMILLAS);
  console.log("=== " + p.id + "  (objetivo " + b.objetivoKcal + " kcal / "
    + b.objetivoProt + " g prot / tope " + b.tope + " EUR) ===");
  if (base) linea("ANTES", medir(base, p, SEMILLAS));
  linea(base ? "AHORA" : "actual", b);
  console.log("");
});

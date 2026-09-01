/**
 * tests/run-tests.js
 * Runner casero mínimo (no hay framework de test en este proyecto, ver
 * STATE.md). Mismo patrón que poc/tests/run-tests.js.
 *
 * Soporte async (añadido junto con la capa de cuentas, 2026-08-13f): si
 * `fn()` devuelve una promesa (auth.js/cloud-sync.js/migration.js hablan
 * con un cliente Supabase simulado, siempre async), el resultado se
 * encola en `pending` en vez de darse por bueno de inmediato. Cada
 * archivo se ejecuta y se espera (`await drain()`) antes de pasar al
 * siguiente, así que el orden de la consola sigue reflejando qué test
 * pertenece a qué archivo aunque mezcle tests síncronos y async. Un test
 * síncrono normal (la inmensa mayoría) nunca devuelve un thenable, así
 * que este cambio es 100% compatible con todos los tests existentes.
 * Uso: node tests/run-tests.js
 */

var passed = 0;
var failed = 0;
var pending = [];

function test(name, fn) {
  var result;
  try {
    result = fn();
  } catch (err) {
    failed++;
    console.log("  FAIL " + name);
    console.log("        " + err.message);
    return;
  }

  if (result && typeof result.then === "function") {
    pending.push(result.then(
      function () {
        passed++;
        console.log("  OK   " + name);
      },
      function (err) {
        failed++;
        console.log("  FAIL " + name);
        console.log("        " + (err && err.message ? err.message : err));
      }
    ));
    return;
  }

  passed++;
  console.log("  OK   " + name);
}

/** Espera los tests async encolados por el archivo que se acaba de ejecutar. */
function drain() {
  var toWait = pending;
  pending = [];
  return Promise.all(toWait);
}

var suites = [
  "shopping-cost.test",
  "budget-mode.test",
  "plan-generator.characterization.test",
  "ingredient-packaging-coverage.test",
  "pantry.test",
  "expiry.test",
  "preferences.test",
  "pricing.test",
  "no-cook-classifier.test",
  "no-cook-generator.test",
  "no-cook-meals.test",
  "allergens.test",
  "meal-schedule.test",
  "budget-purchase.test",
  "purchase-economics.test",
  "ingredient-nutrition.test",
  "per-meal-editing.test",
  "settings.test",
  "migration.test",
  "cloud-sync.test",
  "auth.test"
];

(async function () {
  for (var i = 0; i < suites.length; i++) {
    console.log((i === 0 ? "" : "\n") + suites[i] + ".js");
    require("./" + suites[i]).run({ test: test });
    await drain();
  }

  console.log("\n" + passed + " passed, " + failed + " failed");
  if (failed > 0) process.exit(1);
})();

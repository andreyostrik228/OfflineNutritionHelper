/**
 * tests/run-tests.js
 * Runner casero mínimo (no hay framework de test en este proyecto, ver
 * STATE.md). Mismo patrón que poc/tests/run-tests.js.
 * Uso: node tests/run-tests.js
 */

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  OK   " + name);
  } catch (err) {
    failed++;
    console.log("  FAIL " + name);
    console.log("        " + err.message);
  }
}

console.log("shopping-cost.test.js");
require("./shopping-cost.test").run({ test: test });

console.log("\nbudget-mode.test.js");
require("./budget-mode.test").run({ test: test });

console.log("\nplan-generator.characterization.test.js");
require("./plan-generator.characterization.test").run({ test: test });

console.log("\ningredient-packaging-coverage.test.js");
require("./ingredient-packaging-coverage.test").run({ test: test });

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);

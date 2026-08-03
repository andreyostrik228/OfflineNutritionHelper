/**
 * poc/tests/run-tests.js
 * Runner casero mínimo (no hay framework de test en este proyecto, ver
 * STATE.md). Uso: node poc/tests/run-tests.js
 */

var passed = 0;
var failed = 0;
var failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  OK   " + name);
  } catch (err) {
    failed++;
    failures.push({ name: name, error: err });
    console.log("  FAIL " + name);
    console.log("        " + err.message);
  }
}

console.log("ingredient-resolver.test.js");
require("./ingredient-resolver.test").run({ test: test });

console.log("\nshopping-list-builder.test.js");
require("./shopping-list-builder.test").run({ test: test });

console.log("\ningredient-coverage.test.js");
require("./ingredient-coverage.test").run({ test: test });

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);

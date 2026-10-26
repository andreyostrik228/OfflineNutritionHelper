/**
 * tests/dias-plan.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Días de plan de 1 a 7 (2026-10-26). Pedido del dueño: «можно было выбирать
 * сколько дней нужно, но максимум 7». Antes solo 1, 3 o 7. El motor ya
 * aceptaba cualquier número (budgetForPlanDays interpola); lo que cambia es
 * el formulario y quién lee la elección. La generación y el carrusel de N
 * días se prueban con Chrome sin interfaz (scratchpad).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }
function leer(rel) { return fs.readFileSync(projPath(rel), "utf8"); }

function run(t) {
  t.test("el formulario trae siete botones, de 1 a 7, con 3 elegido de entrada", function () {
    var html = leer("index.html");
    var bloque = /<div class="plan-days" id="planDays"[\s\S]*?<\/div>/.exec(html)[0];
    var dias = [];
    bloque.replace(/data-days="(\d+)"/g, function (_, n) { dias.push(Number(n)); });
    assert.deepStrictEqual(dias, [1, 2, 3, 4, 5, 6, 7]);
    var activos = bloque.match(/class="plan-days__btn is-active"/g) || [];
    assert.strictEqual(activos.length, 1);
    assert.ok(/is-active" data-days="3"/.test(bloque), "3 días de entrada, como antes");
    assert.ok(/grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/.test(leer("assets/css/style.css")), "en una fila");
  });

  t.test("cada botón dice su número de días entero al lector, en los cuatro idiomas", function () {
    var html = leer("index.html");
    var claves = [];
    html.replace(/class="plan-days__btn[^"]*" data-days="\d+"[^>]*data-i18n-aria-label="([^"]+)"/g, function (_, k) { claves.push(k); });
    assert.strictEqual(claves.length, 7);
    var esperado = { ru: ["1 день", "2 дня", "3 дня", "4 дня", "5 дней", "6 дней", "7 дней"], uk: ["1 день", "2 дні", "3 дні", "4 дні", "5 днів", "6 днів", "7 днів"] };
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var txt = leer("js/i18n/" + lang + ".js");
      claves.forEach(function (k, i) {
        var m = new RegExp('"' + k.replace(/\./g, "\\.") + '": "([^"]+)"').exec(txt);
        assert.ok(m, lang + " " + k);
        if (esperado[lang]) assert.strictEqual(m[1], esperado[lang][i], lang + " " + k);
      });
    });
  });

  t.test("app.js admite cualquier entero de 1 a 7, y el resumen lee el texto entero", function () {
    var app = leer("js/app.js");
    assert.ok(/var PLAN_DIAS_MAX = 7;/.test(app));
    assert.ok(/dias === Math\.floor\(dias\) && dias >= 1 && dias <= PLAN_DIAS_MAX/.test(app));
    assert.ok(/getAttribute\("aria-label"\)/.test(leer("js/ui/pestanas.js")), "«Menú» dice «5 дней», no «5»");
  });

  t.test("el presupuesto por día crece sin saltos de 1 a 7 días y no pasa de lo medido", function () {
    var s = loadBrowserGlobals([projPath("js/core/utils.js"), projPath("js/engine/plan-generator.js")]);
    var antes = 0;
    for (var d = 1; d <= 7; d++) {
      var b = s.budgetForPlanDays(10, d);
      assert.ok(b >= antes, d + " días: " + b);
      assert.ok(b >= 10 && b <= 10 * s.PLAN_DAYS_BUDGET_7 + 1e-9, d + " días: " + b);
      antes = b;
    }
  });
}

module.exports = { run: run };

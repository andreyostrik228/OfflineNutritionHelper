/**
 * tests/recetas-carga.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga perezosa de los pasos de receta (js/core/recipe-assets.js).
 *
 * Lo que se protege:
 *   - El arranque NO descarga pasos: ni steps-*.js ni dish-steps.js van en el HTML.
 *   - dish-instructions.js conserva solo equipo, dificultad y makeAhead (lo que
 *     usa el generador), y dish-steps.js trae los pasos de las mismas recetas.
 *   - Abrir una receta pide solo lo que hace falta para su idioma.
 *   - Si una descarga falla, la siguiente vez se vuelve a intentar.
 *   - Pintar el plan no mete ningún paso en el HTML: el desplegable sale vacío.
 *
 * La carga real de los <script> se hace en el navegador; aquí el inyector es
 * un fake que ejecuta el fichero en el sandbox, para poder contar las peticiones.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

/**
 * Sandbox con el cargador de recetas y lo mínimo de i18n que necesita.
 * Un inyector de prueba ejecuta cada fichero pedido y registra su URL.
 */
function sandboxConInyector(opciones) {
  var s = loadBrowserGlobals([
    projPath("js/core/i18n.js"),
    projPath("js/core/recipe-assets.js")
  ]);
  s.pedidos = [];
  s.inyectar = function (url) {
    s.pedidos.push(url);
    var ruta = projPath(url.split("?")[0]);
    if (opciones && opciones.falla && s.pedidos.length === 1) {
      return Promise.reject(new Error("red caída (simulada)"));
    }
    try {
      require("vm").runInContext(fs.readFileSync(ruta, "utf8"), s, { filename: ruta });
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  };
  return s;
}

function run(t) {

  t.test("el HTML de arranque no trae ningún paso de receta", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(!/<script src="js\/i18n\/steps-/.test(html), "hay un <script> de steps-*.js en el arranque");
    assert.ok(!/<script src="js\/data\/dish-steps/.test(html), "hay un <script> de dish-steps.js en el arranque");
    assert.ok(/<script src="js\/core\/recipe-assets\.js/.test(html), "falta el cargador recipe-assets.js");
  });

  t.test("dish-instructions.js conserva solo equipo, dificultad y makeAhead", function () {
    var s = loadBrowserGlobals([projPath("js/data/dish-instructions.js")]);
    var permitidas = ["difficulty", "equipment", "makeAhead"];
    Object.keys(s.DISH_INSTRUCTIONS).forEach(function (k) {
      var e = s.DISH_INSTRUCTIONS[k];
      assert.ok(!("steps" in e), k + ": quedan pasos en el fichero de arranque");
      Object.keys(e).forEach(function (c) {
        assert.ok(permitidas.indexOf(c) !== -1, k + ": propiedad inesperada '" + c + "'");
      });
    });
  });

  t.test("dish-steps.js trae los pasos de exactamente las recetas de dish-instructions.js", function () {
    var s = loadBrowserGlobals([projPath("js/data/dish-instructions.js"), projPath("js/data/dish-steps.js")]);
    assert.deepStrictEqual(Object.keys(s.DISH_STEPS), Object.keys(s.DISH_INSTRUCTIONS));
    Object.keys(s.DISH_STEPS).forEach(function (k) {
      assert.ok(Array.isArray(s.DISH_STEPS[k]) && s.DISH_STEPS[k].length >= 1, k + ": sin pasos");
    });
  });

  t.test("antes de abrir ninguna receta no hay pasos ni idioma cargado", function () {
    var s = sandboxConInyector();
    assert.strictEqual(s.recetaPasos("Almendras y manzana"), null);
    assert.strictEqual(s.recetaCargadaPara("ru"), false);
    assert.deepStrictEqual(s.pedidos, [], "cargar el cargador no pide nada");
  });

  t.test("abrir una receta en español pide solo dish-steps.js (el español no tiene tabla)", function () {
    var s = sandboxConInyector();
    return s.recetaCargar("es", s.inyectar).then(function () {
      assert.deepStrictEqual(s.pedidos, ["js/data/dish-steps.js"]);
      assert.ok(s.recetaPasos("Almendras y manzana").length >= 1);
      assert.strictEqual(s.recetaCargadaPara("es"), true);
    });
  });

  t.test("ruso y ucraniano piden dish-steps.js y su tabla; un idioma sin tabla no pide ninguna", function () {
    var s = sandboxConInyector();
    return s.recetaCargar("ru", s.inyectar).then(function () {
      assert.deepStrictEqual(s.pedidos, ["js/data/dish-steps.js", "js/i18n/steps-ru.js"]);
      assert.strictEqual(s.recetaCargadaPara("ru"), true);
      return s.recetaCargar("de", s.inyectar);
    }).then(function () {
      // "de" no tiene js/i18n/steps-de.js: no se pide, y se muestra en español.
      assert.deepStrictEqual(s.pedidos, ["js/data/dish-steps.js", "js/i18n/steps-ru.js"]);
    });
  });

  t.test("cargar otra vez lo que ya está cargado no vuelve a pedir nada", function () {
    var s = sandboxConInyector();
    return s.recetaCargar("uk", s.inyectar).then(function () {
      var antes = s.pedidos.length;
      return s.recetaCargar("uk", s.inyectar).then(function () {
        assert.strictEqual(s.pedidos.length, antes, "la segunda carga no debe pedir ficheros");
      });
    });
  });

  t.test("si la descarga falla, la siguiente vez se vuelve a intentar", function () {
    var s = sandboxConInyector({ falla: true });
    return s.recetaCargar("en", s.inyectar).then(function () {
      assert.fail("la primera carga tenía que fallar");
    }, function (err) {
      assert.ok(/red caída/.test(err.message));
      return s.recetaCargar("en", s.inyectar);
    }).then(function () {
      assert.strictEqual(s.recetaCargadaPara("en"), true, "tras el reintento, el idioma queda cargado");
      assert.ok(s.recetaPasos("Almendras y manzana"));
    });
  });

  t.test("pintar el plan no mete ningún paso: el desplegable sale cerrado y vacío", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/utils.js"),
      projPath("js/core/i18n.js"),
      projPath("js/i18n/es.js"),
      projPath("js/data/dish-instructions.js"),
      projPath("js/ui/render.js")
    ]);
    var html = s.renderCookingSteps({ dishName: "Almendras y manzana" });
    assert.ok(/<details class="meal-steps" data-receta="Almendras y manzana">/.test(html), "falta el desplegable");
    assert.ok(/<ol class="meal-steps__list" data-estado="pendiente"><\/ol>/.test(html), "la lista de pasos debe ir vacía");
    assert.ok(!/<li>/.test(html), "no puede haber ningún paso en el HTML del plan");
  });
}

module.exports = { run: run };

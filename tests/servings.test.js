/**
 * tests/servings.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las RACIONES de casa: que "568 g de yogur" salga como "4 yogures" y que
 * los 568 g dejen de existir de verdad, no solo en pantalla.
 *
 * Todo lo que hay aquí vigila un fallo que YA se cometió mientras se
 * construía esto, no un riesgo imaginado:
 *
 *   1. La unidad tiene que ser del tamaño de una RACIÓN, no del envase. El
 *      primer intento usó la caja de avena (800 g) como unidad, así que la
 *      ración mínima pasó a 200 g -- 760 kcal de desayuno -- y el día se
 *      iba a +9,3% de kcal, con la avena sola aportando el 46% del exceso.
 *   2. Dos tablas con las mismas claves se desincronizan. `SERVING_CATALOGS` y
 *      `PACKAGING_CATALOGS` viven en ficheros distintos a propósito, y esa
 *      decisión solo es defendible si un test las ata.
 *   3. Una etiqueta sin traducir sale en español dentro de la interfaz
 *      inglesa, sin aviso y con los tests en verde (scripts/i18n/LEEME.md).
 *   4. Un fichero que no está en la lista del sandbox no se carga, y el
 *      motor lo trata como "esta función no existe" -- degradando en
 *      silencio a gramos justo en lo que este cambio venía a arreglar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;
var seedRandomInContext = require("./lib/seed-random").seedRandomInContext;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

/** Solo los datos y la lógica de raciones. */
function freshSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/servings.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/servings.js")
  ]);
}

/** El motor entero, misma lista que el test de caracterización. */
function freshEngineSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/servings.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/ingredient-nutrition.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/data/budget-presets.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/servings.js"),
    projPath("js/core/nutrition.js"),
    projPath("js/core/pantry.js"),
    projPath("js/core/budget.js"),
    projPath("js/core/calculator.js"),
    projPath("js/core/meal-helpers.js"),
    projPath("js/engine/dish-selector.js"),
    projPath("js/engine/plan-generator.js")
  ]);
}

/** La fracción más pequeña que se puede servir de cada forma de partir. */
var SUELO = { entera: 1, media: 0.5, cuarto: 0.25 };

function run(t) {
  var s = freshSandbox();

  // Raciones curadas a mano en dishes.js, por ingrediente: la referencia
  // de "cuánto se pone de esto normalmente".
  var porciones = {};
  s.DISH_DB.forEach(function (d) {
    (d.items || []).forEach(function (it) {
      var k = s.normalizeIngredientKey(it.name);
      (porciones[k] = porciones[k] || []).push(it.g);
    });
  });
  function medianaDe(k) {
    var a = (porciones[k] || []).slice().sort(function (x, y) { return x - y; });
    return a.length ? a[Math.floor(a.length / 2)] : null;
  }

  // ── 1. La unidad es una ración, no un envase ──────────────────────────

  t.test("la ración MÍNIMA servible no puede ser mucho mayor que una ración normal", function () {
    var malos = [];
    Object.keys(s.SERVING_CATALOGS.mercadona.units).forEach(function (k) {
      var u = s.SERVING_CATALOGS.mercadona.units[k];
      var mediana = medianaDe(k);
      if (!mediana) return;
      var minimo = u.g * SUELO[u.split];
      var ratio = minimo / mediana;
      if (ratio > 3) malos.push(k + ": mínimo " + Math.round(minimo) + " g contra ración de " + mediana + " g (" + ratio.toFixed(1) + "x)");
    });
    assert.deepStrictEqual(malos, [],
      "una unidad demasiado grande obliga a servir de más y desplaza las kcal del día: " +
      "la avena con la caja de 800 g daba 3,3x y se llevaba el día entero a +9,3%");
  });

  t.test("todo ingrediente con ración aparece de verdad en algún plato", function () {
    var huerfanos = Object.keys(s.SERVING_CATALOGS.mercadona.units).filter(function (k) { return !medianaDe(k); });
    assert.deepStrictEqual(huerfanos, [],
      "una ración para un ingrediente que ningún plato usa es peso muerto que nadie va a revisar");
  });

  // ── 2. Las dos tablas no se pueden desincronizar ──────────────────────

  t.test("cada clave de SERVING_CATALOGS existe también en PACKAGING_CATALOGS", function () {
    var sueltas = Object.keys(s.SERVING_CATALOGS.mercadona.units).filter(function (k) { return !s.PACKAGING_CATALOGS.mercadona.packages[k]; });
    assert.deepStrictEqual(sueltas, [],
      "servings.js y packaging.js están separados a propósito; separarlos solo vale si esto los ata");
  });

  t.test("cada clave está normalizada, o no casaría nunca", function () {
    var raras = Object.keys(s.SERVING_CATALOGS.mercadona.units).filter(function (k) {
      return s.normalizeIngredientKey(k) !== k;
    });
    assert.deepStrictEqual(raras, [],
      "la búsqueda pasa por normalizeIngredientKey: una clave con acento o mayúscula no casa y no da error");
  });

  t.test("split solo puede ser una de las tres formas conocidas", function () {
    var malas = Object.keys(s.SERVING_CATALOGS.mercadona.units).filter(function (k) {
      return !SUELO.hasOwnProperty(s.SERVING_CATALOGS.mercadona.units[k].split);
    });
    assert.deepStrictEqual(malas, [],
      "un split desconocido cae al caso por defecto (mitades) sin avisar");
  });

  t.test("los gramos de cada ración son un número positivo", function () {
    var malos = Object.keys(s.SERVING_CATALOGS.mercadona.units).filter(function (k) {
      var g = s.SERVING_CATALOGS.mercadona.units[k].g;
      return !(typeof g === "number" && isFinite(g) && g > 0);
    });
    assert.deepStrictEqual(malos, []);
  });

  // ── 3. Ninguna etiqueta se queda sin inglés ───────────────────────────

  t.test("cada etiqueta de ración tiene traducción al inglés", function () {
    var tablas = loadBrowserGlobals([
      projPath("js/core/i18n.js"),
      projPath("js/i18n/es.js"),
      projPath("js/i18n/packages-en.js")
    ]);
    var sinTraducir = [];
    Object.keys(s.SERVING_CATALOGS.mercadona.units).forEach(function (k) {
      var label = s.SERVING_CATALOGS.mercadona.units[k].label;
      if (sinTraducir.indexOf(label) !== -1) return;
      // El idioma va explícito: `tPackageLabel` devuelve null cuando el
      // idioma activo YA es el español, que es lo que ve un test.
      if (!tablas.tPackageLabel(label, 1, "en") || !tablas.tPackageLabel(label, 2, "en")) sinTraducir.push(label);
    });
    assert.deepStrictEqual(sinTraducir, [],
      "sin par [singular, plural] en packages-en.js la etiqueta sale en español dentro del inglés, en silencio");
  });

  t.test("el plural español irregular está escrito, no deducido", function () {
    assert.strictEqual(s.pluralizeServingLabel("calabacín", 2), "calabacines");
    assert.strictEqual(s.pluralizeServingLabel("calabacín", 1), "calabacín");
    assert.strictEqual(s.pluralizeServingLabel("yogur", 2), "yogures",
      "lo acabado en consonante pide -es en español; la regla automática daba \"yogurs\"");
    assert.strictEqual(s.pluralizeServingLabel("lata", 2), "latas",
      "lo que sí sigue la regla por defecto no hace falta escribirlo en SERVING_PLURALS");
  });

  // ── 4. La cuenta ──────────────────────────────────────────────────────

  t.test("una unidad que no se parte se redondea a enteros", function () {
    assert.strictEqual(s.quantizeServingCount(3.4, "entera"), 3);
    assert.strictEqual(s.quantizeServingCount(3.6, "entera"), 4);
  });

  t.test("nunca se sirve CERO de un ingrediente que la receta pide", function () {
    assert.strictEqual(s.quantizeServingCount(0.1, "entera"), 1);
    assert.strictEqual(s.quantizeServingCount(0.1, "media"), 0.5);
    assert.strictEqual(s.quantizeServingCount(0.01, "cuarto"), 0.25);
  });

  t.test("cuarto admite tercios, y se queda con el más cercano", function () {
    assert.strictEqual(s.quantizeServingCount(0.33, "cuarto").toFixed(2), (1 / 3).toFixed(2));
    assert.strictEqual(s.quantizeServingCount(0.26, "cuarto"), 0.25);
  });

  t.test("568 g de yogur son 4 yogures, que es de lo que iba todo esto", function () {
    var u = s.resolveServingUnit("Yogur griego ligero");
    assert.strictEqual(u.g, 125);
    assert.strictEqual(s.servingCountFor(568, u), 5,
      "568/125 = 4,54 y redondea a 5; lo que importa es que sea un número entero de tarrinas");
    assert.strictEqual(s.servingCountFor(500, u), 4);
    assert.strictEqual(Math.round(s.quantizeGramsToServing(568, "Yogur griego ligero")), 625);
  });

  // ── El PAPEL del ingrediente dentro de la receta ──────────────────────
  // El pan tiene dos papeles: guarnición al lado de la sopa (una rebanada)
  // o el plato entero (un bocadillo, medio pan). Lo declara el plato en su
  // item, NO se deduce de los gramos -- había nueve recetas en 80 g justo
  // debajo del umbral tentador, y una edición de 80 a 90 habría dado la
  // vuelta a la unidad en silencio.

  t.test("sin papel declarado, el pan es una rebanada", function () {
    var u = s.resolveServingUnit("Pan integral", "mercadona");
    assert.strictEqual(u.label, "rebanada");
    assert.strictEqual(u.g, 30);
  });

  t.test('con papel "plato", el mismo pan pasa a cuartos de barra', function () {
    var u = s.resolveServingUnit("Pan integral", "mercadona", "plato");
    assert.strictEqual(u.label, "barra");
    assert.strictEqual(u.g, 350);
    assert.strictEqual(u.split, "cuarto");
  });

  t.test("un papel que la comida no declara NO cambia nada", function () {
    // El yogur no tiene `comoPlato`: pedirlo no puede inventar una unidad.
    var normal = s.resolveServingUnit("Yogur griego ligero", "mercadona");
    var comoPlato = s.resolveServingUnit("Yogur griego ligero", "mercadona", "plato");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(comoPlato)), JSON.parse(JSON.stringify(normal)));
  });

  t.test("los platos que declaran papel son los que se decidieron, ni uno más", function () {
    var conPapel = [];
    s.DISH_DB.forEach(function (d) {
      (d.items || []).forEach(function (i) {
        if (i.papel) conPapel.push(d.name + " :: " + i.name + " = " + i.papel);
      });
    });
    conPapel.sort();
    assert.deepStrictEqual(conPapel, [
      "Bocadillo de pavo con queso y verduras :: Pan integral = plato",
      "Bocadillo integral de atún y tomate :: Pan integral = plato"
    ], "marcar un plato de más cambia su gramaje: que sea una decisión, no un descuido");
  });

  t.test("el papel llega hasta el plato generado, no se pierde por el camino", function () {
    // `buildMealFromDish` copia el item; si olvidara `papel`, el motor
    // redondearía el bocadillo a rebanadas y nadie se enteraría.
    var e = freshEngineSandbox();
    var dish = e.DISH_DB.filter(function (d) { return d.name === "Bocadillo integral de atún y tomate"; })[0];
    var target = { kcal: dish.kcal, protein: dish.protein, carbs: dish.carbs, fat: dish.fat };
    var meal = e.buildMealFromDish(dish, "comida", "Comida", target, "mercadona", 1);
    var pan = meal.items.filter(function (i) { return i.name === "Pan integral"; })[0];
    assert.strictEqual(pan.papel, "plato", "el item del plan perdió el papel que declara la receta");
  });

  t.test("lo que no tiene ración honesta se queda en gramos", function () {
    // Carne y pescado frescos: se compran y se cortan al peso.
    ["Lomo de cerdo", "Pechuga de pollo", "Salmón", "Coliflor"].forEach(function (n) {
      assert.strictEqual(s.resolveServingUnit(n), null, n + " debería seguir en gramos");
      assert.strictEqual(s.quantizeGramsToServing(237, n), 237);
    });
  });

  t.test("perUnit y spoonable se DERIVAN de packaging.js, no se copian", function () {
    var huevo = s.resolveServingUnit("Huevos enteros");
    assert.strictEqual(huevo.g, s.PACKAGING_CATALOGS.mercadona.packages["huevos enteros"].gramsPerUnit,
      "copiar el gramaje del huevo en dos ficheros es cómo empiezan las desincronizaciones");
    var aceite = s.resolveServingUnit("Aceite de oliva");
    assert.strictEqual(aceite.g, s.PACKAGING_CATALOGS.mercadona.packages["aceite de oliva"].teaspoonG);
  });

  // ── 5. El motor de verdad, de punta a punta ───────────────────────────

  t.test("js/core/servings.js está CARGADO en el sandbox del motor", function () {
    var e = freshEngineSandbox();
    assert.strictEqual(typeof e.resolveServingUnit, "function",
      "plan-generator comprueba `typeof` antes de llamar: si el fichero falta, el plan sale en gramos y NADA falla");
    assert.strictEqual(typeof e.applyServingQuantization, "function");
  });

  t.test("cada fila de un plan generado cae en una ración servible", function () {
    var e = freshEngineSandbox();
    var profile = e.calculateProfile({ age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" });
    var data = { budget: 12, cookTime: 20, taste: "mixed", store: "mercadona" };

    var revisadas = 0, malas = [];
    for (var semilla = 1; semilla <= 15; semilla++) {
      seedRandomInContext(e, semilla);
      var plan = e.generateDietPlan(profile, data);
      (plan.meals || []).forEach(function (meal) {
        (meal.items || []).forEach(function (item) {
          var u = e.resolveServingUnit(item.name, "mercadona", item.papel);
          if (!u || !(item.grams > 0)) return;
          revisadas++;
          // Idempotencia: volver a cuantizar algo ya cuantizado no puede
          // moverlo. Es la comprobación correcta y no "múltiplo del paso
          // mínimo", que fue el primer intento y daba falsos positivos --
          // el modo "cuarto" admite TERCIOS, así que 2/3 de un bote de 400 g
          // son 267 g, que no es múltiplo de 100 y es perfectamente legal.
          // Se admite 1 g de holgura porque los gramos se guardan enteros.
          // El PAPEL viaja con el item: el mismo pan es rebanada de
          // guarnicion o cuarto de barra cuando ES el bocadillo. Sin
          // pasarlo aqui, este test compararia contra la rejilla
          // equivocada justo en los platos que declaran papel.
          var otraVez = e.quantizeGramsToServing(item.grams, item.name, "mercadona", item.papel);
          if (Math.abs(otraVez - item.grams) > 1.001) {
            malas.push(item.name + " " + item.grams + " g -> " + Math.round(otraVez) + " g");
          }
        });
      });
    }
    assert.ok(revisadas > 100, "el barrido tiene que mirar filas de verdad, ha mirado " + revisadas);
    assert.deepStrictEqual(malas.slice(0, 5), [],
      "una fila fuera del múltiplo significa que algo reescala DESPUÉS de cuantizar");
  });

  t.test("redondear no deja el plan por encima de su presupuesto", function () {
    var e = freshEngineSandbox();
    var profile = e.calculateProfile({ age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" });
    var data = { budget: 12, cookTime: 20, taste: "mixed", store: "mercadona" };

    var pasados = 0, n = 0;
    for (var semilla = 1; semilla <= 25; semilla++) {
      seedRandomInContext(e, semilla);
      var plan = e.generateDietPlan(profile, data);
      if (!plan || !plan.total) continue;
      n++;
      if (plan.total.purchaseCost > data.budget + 0.001) pasados++;
    }
    // No es cero por diseño: el motor puede declarar honestamente que un día
    // no cabe (`violations: budget`). Lo que vigila esto es que redondear no
    // lo convierta en algo habitual -- medido antes de `enforceBudgetInServings`
    // se pasaban 26 de 565 planes, y con él, 4 de 200.
    assert.ok(pasados <= n * 0.12,
      pasados + " de " + n + " planes se pasan del presupuesto; el tope de compra se hace cumplir ANTES de redondear, " +
      "así que subir una ración puede abrir un paquete y nadie lo volvería a mirar");
  });

  // ── El stock no se dice como una ración ──────────────────────────────
  //
  // El dueño lo vio en la despensa: "нужно писать упаковками или граммами,
  // или штуками, как будет логичнее". Lo que había era la ración, y para
  // lo que se mide a cuchara daba frases que nadie dice.

  t.test("SERVING_MEASURES solo nombra etiquetas que alguien devuelve de verdad", function () {
    // Una errata aquí no rompe nada: la etiqueta sigue contándose como
    // pieza y el fallo es justo el que se venía a arreglar.
    //
    // Se comprueba contra lo que RESUELVE `resolveServingUnit`, no contra
    // la tabla de raciones: "cucharadita" no está en esa tabla, sale del
    // `teaspoonG` de packaging.js. Mirar solo una de las dos fuentes daba
    // este test por roto estando el dato bien.
    var s = freshSandbox();
    var salen = {};
    [s.SERVING_CATALOGS.mercadona.units,
     s.PACKAGING_CATALOGS.mercadona.packages].forEach(function (tabla) {
      Object.keys(tabla).forEach(function (k) {
        var u = s.resolveServingUnit(k);
        if (u && u.label) salen[u.label] = true;
      });
    });
    var fantasma = s.SERVING_MEASURES.filter(function (l) { return !salen[l]; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(fantasma)), [],
      "estas medidas no las devuelve resolveServingUnit para ningún ingrediente: " + fantasma.join(", "));
  });

  t.test("mide lo que se mide y cuenta lo que se cuenta", function () {
    var s = freshSandbox();
    ["cucharada", "cucharadita", "vaso", "puñado"].forEach(function (l) {
      assert.strictEqual(s.isServingMeasure(l), true, l + " mide, no cuenta");
    });
    ["lata", "yogur", "barra", "plátano", "loncha"].forEach(function (l) {
      assert.strictEqual(s.isServingMeasure(l), false, l + " se cuenta, no se mide");
    });
  });

  t.test("el aceite deja de tener 43 cucharaditas y pasa a gramos", function () {
    // El caso que lo destapó, con su cifra: 200 g de aceite salían como
    // "43 y 1/2 cucharaditas" porque la ración es la cucharadita.
    var s = freshEngineSandbox();
    var unidad = s.resolveServingUnit("Aceite de oliva");
    assert.ok(unidad && s.isServingMeasure(unidad.label),
      "el aceite se mide a cucharaditas; si deja de ser así, este test ya no prueba nada");
    assert.strictEqual(s.stockAmountFor(200, "Aceite de oliva"), null,
      "sin envase redondo, el stock se queda en gramos");
  });

  t.test("un litro de leche es 1 brick, no 5 vasos", function () {
    var s = freshEngineSandbox();
    var r = s.stockAmountFor(1000, "Leche semidesnatada");
    assert.ok(r, "1 kg de leche es exactamente un brick y tiene que decirse así");
    assert.strictEqual(r.kind, "packages");
    assert.strictEqual(r.n, 1);
  });

  t.test("medio envase NO se redondea a uno entero", function () {
    // "1 botella" con 200 g dentro sería mentira, y la despensa es donde
    // esa mentira estropea la lista de la compra.
    var s = freshEngineSandbox();
    assert.strictEqual(s.stockAmountFor(500, "Leche semidesnatada"), null,
      "medio brick no es un brick");
  });

  t.test("lo que se cuenta por piezas sigue contándose igual", function () {
    var s = freshSandbox();
    var r = s.stockAmountFor(500, "Yogur griego ligero");
    assert.ok(r && r.kind === "pieces", "los yogures se cuentan");
    assert.strictEqual(r.n, 4);
    assert.strictEqual(r.label, "yogur");
  });
}

module.exports = { run: run };

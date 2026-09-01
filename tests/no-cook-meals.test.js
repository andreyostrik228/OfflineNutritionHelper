/**
 * tests/no-cook-meals.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Raciones, plantillas y coherencia del modo "sin cocinar" (reescrito el
 * 2026-09-01). Estos tests existen porque el usuario reportó DOS fallos
 * concretos, y ambos tienen aquí su anti-regresión:
 *
 *   1. "una cena de ensalada y tortillas de trigo" — comidas que no eran
 *      comidas, solo productos elegibles al azar.
 *   2. "1 ración de pizza" — envases que solo están buenos recién hechos
 *      partidos en raciones sueltas, con el resto a la despensa.
 *
 * Y una tercera cosa que él no vio pero era peor: los macros en pantalla
 * eran los de 100 g, así que TODAS las cifras del plan estaban mal.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function servingSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/serving-sizes.js"),
    projPath("js/data/no-cook-templates.js")
  ]);
}

function fullSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/dishes.js"),
    projPath("js/data/dish-instructions.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/serving-sizes.js"),
    projPath("js/data/no-cook-templates.js"),
    projPath("js/core/pricing.js"),
    projPath("js/data/dislike-groups.js"),
    projPath("js/core/preferences.js"),
    projPath("js/engine/no-cook-generator.js")
  ]);
}

// Productos reales del catálogo, por id, para fijar los casos que el
// usuario citó textualmente.
var PIZZA = "Pizza pollo Hacendado";
var TORTILLAS = "Tortillas de trigo Hacendado";

function findProduct(s, name) {
  return s.REAL_PRODUCTS.filter(function (p) { return p.name === name; })[0];
}

function run(t) {

  // ── 1. Raciones y macros reales ──────────────────────────────────────

  t.test("macrosForGrams(): convierte desde POR 100 G, que es como viene el catálogo", function () {
    var s = servingSandbox();
    var p = { kcal: 200, protein: 10, carbs: 20, fat: 5 };
    var m = s.macrosForGrams(p, 250);
    assert.strictEqual(Math.round(m.kcal), 500);
    assert.strictEqual(Math.round(m.protein), 25);
    var half = s.macrosForGrams(p, 50);
    assert.strictEqual(Math.round(half.kcal), 100);
  });

  t.test("resolveServing(): un envase nunca da MENOS de una ración -- la ración es el envase", function () {
    var s = servingSandbox();
    // yogur suelto de 125 g cuando la familia dice ración de 125 g
    var sv = s.resolveServing({ leafCategory: "Yogures naturales", size: 0.1, sizeUnit: "kg" });
    assert.strictEqual(sv.servingG, 100, "la ración se recorta al envase");
    assert.strictEqual(sv.servingsPerPackage, 1);
  });

  t.test("resolveServing(): raciones por envase con FLOOR, nunca prometiendo más de lo que hay", function () {
    var s = servingSandbox();
    // 130 g de tomate con ración de 80 g = UNA ración, no dos (2x80=160>130)
    var sv = s.resolveServing({ leafCategory: "Tomate", size: 0.13, sizeUnit: "kg" });
    assert.strictEqual(sv.servingsPerPackage, 1);
    assert.ok(sv.servingG * sv.servingsPerPackage <= sv.packageG + 0.001,
      "las raciones nunca pueden sumar más que el envase");
  });

  t.test("resolveServing(): sin regla conocida cae en el defecto SIN rol (no entra en plantillas)", function () {
    var s = servingSandbox();
    var sv = s.resolveServing({ leafCategory: "Categoria Inventada", category: "Otra", size: 1, sizeUnit: "kg" });
    assert.strictEqual(sv.role, null);
    assert.strictEqual(sv.policy, "keeps");
  });

  t.test("las bebidas NO tienen rol -- una Comida no puede ser un refresco y un Aquarius", function () {
    var s = servingSandbox();
    ["Cola clásica", "Isotónico", "Energético", "Naranja"].forEach(function (leaf) {
      var sv = s.resolveServing({ leafCategory: leaf, category: "Agua y refrescos", size: 0.33, sizeUnit: "l" });
      assert.strictEqual(sv.role, null, leaf + " no debería poder rellenar ningún hueco de comida");
    });
  });

  // ── 2. Guardas de datos ──────────────────────────────────────────────

  t.test("isPlausibleForRole(): el 'Banana' de 528 kcal/100 g (chips) se descarta como fruta", function () {
    var s = servingSandbox();
    assert.strictEqual(s.isPlausibleForRole({ kcal: 528, protein: 2, carbs: 56, fat: 32 }, "fruta"), false);
    assert.strictEqual(s.isPlausibleForRole({ kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, "fruta"), true);
  });

  t.test("hasConsistentMacros(): caza el registro que se contradice ('Pomelo' 15 kcal con P10/C20/F10)", function () {
    var s = servingSandbox();
    assert.strictEqual(s.hasConsistentMacros({ kcal: 15, protein: 10, carbs: 20, fat: 10 }), false);
    assert.strictEqual(s.hasConsistentMacros({ kcal: 100, protein: 2, carbs: 10, fat: 5 }), true);
  });

  t.test("un techo por HOJA manda sobre el del rol (fruta fresca vs desecada)", function () {
    var s = servingSandbox();
    var moras = { kcal: 352, protein: 4, carbs: 84, fat: 0 };   // "Moras", en realidad desecadas/mermelada
    // El techo del rol `fruta` (400) las deja pasar, y Atwater también:
    assert.strictEqual(s.isPlausibleForRole(moras, "fruta"), true);
    assert.strictEqual(s.hasConsistentMacros(moras), true);
    // pero la hoja "Otras frutas" (fruta FRESCA) las corta:
    var sv = s.resolveServing({ leafCategory: "Otras frutas", size: 0.15, sizeUnit: "kg" });
    assert.strictEqual(sv.maxKcal, 200);
    assert.strictEqual(s.isPlausibleForRole(moras, sv.role, sv.maxKcal), false);
    // y la fruta desecada de verdad sigue entrando (dátiles ~298)
    var seca = s.resolveServing({ leafCategory: "Fruta desecada", size: 0.25, sizeUnit: "kg" });
    assert.strictEqual(seca.maxKcal, null);
    assert.strictEqual(s.isPlausibleForRole({ kcal: 298 }, seca.role, seca.maxKcal), true);
  });

  t.test("REGRESIÓN: los cuatro registros imposibles de fruta no llegan al pool", function () {
    var s = fullSandbox();
    var pool = s.getNoCookEligiblePool("mercadona");
    ["Moras", "Banana", "Mango", "Frambuesas"].forEach(function (name) {
      var present = pool.some(function (e) { return e.product.name === name; });
      assert.strictEqual(present, false, name + " tiene nutrición imposible y no debe ser elegible");
    });
    // y la fruta desecada legítima sigue disponible
    var seca = pool.some(function (e) { return /Dátiles|Pasas/.test(e.product.name); });
    assert.ok(seca, "la fruta desecada real no debería haberse perdido en el filtro");
  });

  t.test("los dos controles son COMPLEMENTARIOS: Atwater no ve los chips de plátano", function () {
    var s = servingSandbox();
    var chips = { kcal: 528, protein: 2, carbs: 56, fat: 32 };
    // 4*2 + 4*56 + 9*32 = 520 ~ 528: internamente coherente
    assert.strictEqual(s.hasConsistentMacros(chips), true, "Atwater lo da por bueno");
    assert.strictEqual(s.isPlausibleForRole(chips, "fruta"), false, "el techo por papel es quien lo caza");
  });

  // ── 3. Plantillas ────────────────────────────────────────────────────

  t.test("toda plantilla exige al menos un componente required (nada de bases sin relleno)", function () {
    var s = servingSandbox();
    s.NO_COOK_TEMPLATES.forEach(function (tpl) {
      var req = tpl.components.filter(function (c) { return c.required; });
      assert.ok(req.length >= 1, tpl.key + " no exige nada, podría servir un plato vacío");
    });
  });

  t.test("wrap y bocadillo exigen SIEMPRE proteína -- el fallo que reportó el usuario", function () {
    var s = servingSandbox();
    ["wrap", "bocadillo"].forEach(function (key) {
      var tpl = s.NO_COOK_TEMPLATES.filter(function (x) { return x.key === key; })[0];
      var prot = tpl.components.filter(function (c) { return c.role === "protein" && c.required; });
      assert.strictEqual(prot.length, 1, key + " debe exigir proteína: una tortilla sola no es una cena");
    });
  });

  t.test("toda plantilla trae instrucciones de montaje sin cocina de verdad", function () {
    var s = servingSandbox();
    var forbidden = /sart[eé]n|horno|fuego|hervir|cocer|freír|freir|tabla|cuchillo/i;
    s.NO_COOK_TEMPLATES.forEach(function (tpl) {
      assert.ok(tpl.assembly && tpl.assembly.length > 10, tpl.key + " sin texto de montaje");
      assert.ok(!forbidden.test(tpl.assembly), tpl.key + " pide cocinar de verdad: " + tpl.assembly);
    });
  });

  t.test("cada toma del día tiene al menos una plantilla que la puede montar", function () {
    var s = servingSandbox();
    ["breakfast", "lunch", "dinner", "snack", "snack2"].forEach(function (k) {
      assert.ok(s.templatesForSlot(k).length > 0, "sin plantillas para " + k);
    });
  });

  // ── 4. El caso concreto del usuario ──────────────────────────────────

  t.test("la pizza real del catálogo: 2 raciones por envase y policy 'fresh'", function () {
    var s = fullSandbox();
    var pizza = findProduct(s, PIZZA);
    assert.ok(pizza, "el catálogo debería seguir trayendo " + PIZZA);
    var sv = s.resolveServing(pizza);
    assert.strictEqual(sv.policy, "fresh", "una pizza no se guarda para mañana");
    assert.strictEqual(sv.servingsPerPackage, 2);
    // Y sus kcal reales, no las de 100 g que se pintaban antes
    var whole = s.macrosForGrams(pizza, sv.packageG);
    assert.ok(whole.kcal > 900 && whole.kcal < 1200,
      "la pizza entera son ~1.054 kcal, no las 245 que decía la pantalla: " + Math.round(whole.kcal));
  });

  t.test("las tortillas de trigo son BASE (carrier), nunca una cena por sí solas", function () {
    var s = fullSandbox();
    var tortillas = findProduct(s, TORTILLAS);
    assert.ok(tortillas);
    assert.strictEqual(s.resolveServing(tortillas).role, "carrier");
  });

  // ── 5. Invariantes del plan generado ─────────────────────────────────
  // Se generan varios planes porque el generador es aleatorio: un solo
  // plan no prueba nada sobre un sorteo.

  t.test("REGRESIÓN: ninguna toma es solo base/verdura sin nada de sustancia", function () {
    var s = fullSandbox();
    var SUSTANCIA = ["protein", "principal", "queso", "lacteo", "untable", "cereal", "dulce", "salado", "fruta", "sopa"];
    for (var i = 0; i < 25; i++) {
      var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 14 });
      plan.slots.forEach(function (slot) {
        assert.ok(slot.items.length > 0, "toma vacía: " + slot.key);
        var roles = slot.items.map(function (it) { return it.role; });
        var ok = roles.some(function (r) { return SUSTANCIA.indexOf(r) !== -1; });
        assert.ok(ok, "toma sin sustancia (" + slot.key + "): " + roles.join("+"));
      });
    }
  });

  t.test("REGRESIÓN: comida y cena SIEMPRE llevan proteína o un plato completo", function () {
    var s = fullSandbox();
    for (var i = 0; i < 25; i++) {
      var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 14 });
      plan.slots.forEach(function (slot) {
        if (slot.key !== "lunch" && slot.key !== "dinner") return;
        var roles = slot.items.map(function (it) { return it.role; });
        assert.ok(roles.indexOf("protein") !== -1 || roles.indexOf("principal") !== -1,
          slot.key + " sin proteína ni plato: " + roles.join("+"));
      });
    }
  });

  t.test("REGRESIÓN (pizza): un envase 'fresh' se consume ENTERO el mismo día", function () {
    var s = fullSandbox();
    for (var i = 0; i < 30; i++) {
      var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 14 });
      var fresh = {};
      plan.slots.forEach(function (slot) {
        slot.items.forEach(function (it) {
          if (it.policy !== "fresh") return;
          fresh[it.id] = fresh[it.id] || { used: 0, per: it.servingsPerPackage, name: it.name };
          fresh[it.id].used += it.servings;
        });
      });
      Object.keys(fresh).forEach(function (id) {
        var f = fresh[id];
        assert.strictEqual(f.used % f.per, 0,
          "queda medio envase de '" + f.name + "' sin comer (" + f.used + " de " + f.per + " raciones)");
      });
    }
  });

  t.test("los macros de cada ítem son los de SUS gramos, no los de 100 g", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 14 });
    var checked = 0;
    plan.slots.forEach(function (slot) {
      slot.items.forEach(function (it) {
        var src = s.REAL_PRODUCTS.filter(function (p) { return p.id === it.id; })[0];
        if (!src) return;
        var expected = src.kcal * it.grams / 100;
        assert.ok(Math.abs(it.kcal - expected) < 1,
          it.name + ": " + Math.round(it.kcal) + " kcal para " + it.grams + " g, esperado " + Math.round(expected));
        checked++;
      });
    });
    assert.ok(checked > 5, "debería haber comprobado varios ítems, comprobó " + checked);
  });

  t.test("el total del plan es la suma de sus tomas, y cada toma la de sus ítems", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 14 });
    var sum = 0;
    plan.slots.forEach(function (slot) {
      var slotSum = slot.items.reduce(function (a, it) { return a + it.kcal; }, 0);
      assert.ok(Math.abs(slotSum - slot.total.kcal) < 1, "la toma " + slot.key + " no cuadra con sus ítems");
      sum += slot.total.kcal;
    });
    assert.ok(Math.abs(sum - plan.total.kcal) < 1, "el total del día no cuadra con sus tomas");
  });

  t.test("el coste CONSUMIDO respeta el presupuesto en la gran mayoría de planes", function () {
    var s = fullSandbox();
    var within = 0, N = 30;
    for (var i = 0; i < N; i++) {
      var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 14 });
      if (plan.consumedCost <= 14) within++;
      // y el ticket nunca se dispara (ver NO_COOK_TICKET_MULTIPLIER)
      assert.ok(plan.shoppingCost <= 14 * 3 + 15,
        "ticket desbocado: " + plan.shoppingCost + " EUR con presupuesto 14");
    }
    assert.ok(within >= N * 0.8, "solo " + within + "/" + N + " planes dentro del presupuesto consumido");
  });

  t.test("sin opciones sigue generando un plan completo (el botón no exige formulario)", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona");
    assert.strictEqual(plan.slots.length, 5);
    assert.ok(plan.total.kcal > 800, "un plan por defecto debería traer comida de verdad");
    plan.slots.forEach(function (slot) { assert.ok(slot.items.length > 0, "toma vacía: " + slot.key); });
  });

  t.test("cada ítem conserva `quantity` como alias de `servings` (la despensa lo lee así)", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona", { calories: 2200 });
    plan.slots.forEach(function (slot) {
      slot.items.forEach(function (it) {
        assert.strictEqual(it.quantity, it.servings, it.name + ": quantity debe seguir a servings");
      });
    });
  });
}

module.exports = { run: run };

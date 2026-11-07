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

  t.test("varios días (2026-10-21): uno por día, distintos, y lo «de la noche antes» nunca el día 1", function () {
    var s = fullSandbox();
    require("./lib/seed-random").seedRandomInContext(s, 5);
    var opciones = { calories: 2200, protein: 110, budget: 14 };
    var semana = s.generateNoCookPlanDays("mercadona", opciones, 7);
    assert.strictEqual(semana.length, 7);
    var firmas = semana.map(function (pl) {
      return pl.slots.map(function (sl) { return sl.items.map(function (i) { return i.id; }).sort().join("+"); }).join("|");
    });
    firmas.forEach(function (f, i) { assert.strictEqual(firmas.indexOf(f), i, "el día " + (i + 1) + " repite otro día entero"); });
    assert.strictEqual(s.generateNoCookPlanDays("mercadona", opciones, 1).length, 1);
    assert.strictEqual(s.generateNoCookPlanDays("mercadona", opciones, "x").length, 1, "lo que no es un número cuenta como 1");
    assert.strictEqual(s.generateNoCookPlanDays("mercadona", opciones, 9).length, 7, "como mucho 7");

    var enElDia1 = 0, despues = 0, deUnDia = 0;
    for (var p = 0; p < 25; p++) {
      s.generateNoCookPlanDays("mercadona", opciones, 7).forEach(function (pl, d) {
        pl.slots.forEach(function (sl) { if (sl.makeAhead) { if (d === 0) enElDia1++; else despues++; } });
      });
      s.generateNoCookPlanDays("mercadona", opciones, 1)[0].slots.forEach(function (sl) { if (sl.makeAhead) deUnDia++; });
    }
    assert.strictEqual(enElDia1, 0, "el día 1 no se pudo dejar hecho la víspera");
    assert.strictEqual(deUnDia, 0, "un plan de 1 día tampoco");
    assert.ok(despues > 0, "del día 2 en adelante sí puede salir (antes la opción no llegaba a ninguna toma)");
  });

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

  // ── "De la noche antes" (avena remojada), 2026-09-02 ─────────────────
  // Misma regla que los platos makeAhead del modo cocinado: nunca en un
  // plan de 1 día ni en el día 1 de uno de varios. El modo sin cocinar hoy
  // es de 1 día, así que estas plantillas quedan SIEMPRE fuera.

  t.test("templatesForSlot: la plantilla makeAhead NO sale sin allowMakeAhead, SÍ con él", function () {
    var s = servingSandbox();
    var withoutFlag = s.templatesForSlot("breakfast").map(function (t) { return t.key; });
    var withFlag = s.templatesForSlot("breakfast", true).map(function (t) { return t.key; });
    assert.strictEqual(withoutFlag.indexOf("desayuno_remojado"), -1,
      "avena remojada no debería ofrecerse por defecto");
    assert.ok(withFlag.indexOf("desayuno_remojado") !== -1,
      "con allowMakeAhead=true sí debería estar");
    assert.strictEqual(withFlag.length - withoutFlag.length, 1,
      "exactamente una plantilla de diferencia");
  });

  t.test("existe exactamente una plantilla makeAhead y es un desayuno", function () {
    var s = servingSandbox();
    var ma = s.NO_COOK_TEMPLATES.filter(function (t) { return t.makeAhead === true; });
    assert.strictEqual(ma.length, 1);
    // slots viene del realm del vm -> comparar por valor, no por referencia.
    assert.strictEqual(JSON.stringify(ma[0].slots), JSON.stringify(["breakfast"]));
    assert.ok(/noche antes/i.test(ma[0].assembly), "el montaje debe decir 'la noche antes'");
  });

  t.test("generateNoCookPlan (1 día, sin allowMakeAhead): ninguna toma es makeAhead", function () {
    var s = fullSandbox();
    for (var i = 0; i < 60; i++) {
      var plan = s.generateNoCookPlan(undefined, { calories: 2200, protein: 130, budget: 16 });
      plan.slots.forEach(function (slot) {
        assert.notStrictEqual(slot.templateKey, "desayuno_remojado",
          "avena remojada salió en un plan de 1 día");
        assert.notStrictEqual(slot.makeAhead, true);
      });
    }
  });

  t.test("regenerateNoCookSlot: un re-roll tampoco trae la plantilla makeAhead", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan(undefined, { calories: 2200, protein: 130, budget: 16 });
    for (var i = 0; i < 25; i++) {
      var res = s.regenerateNoCookSlot(plan, "breakfast", undefined, { calories: 2200, protein: 130, budget: 16 });
      if (res && res.slot) {
        assert.notStrictEqual(res.slot.templateKey, "desayuno_remojado");
        assert.notStrictEqual(res.slot.makeAhead, true);
        plan.slots[0] = res.slot;
      }
    }
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

  // ── 6. Presupuesto, prioridad y disponibilidad (2026-09-01) ──────────
  // El usuario: "cuando digo que tengo 5 euros no se pasa de ahi", igual
  // que ya hacia el motor de platos.

  t.test("el presupuesto es un TECHO del TICKET, no del coste consumido", function () {
    var s = fullSandbox();
    var within = 0, N = 40;
    for (var i = 0; i < N; i++) {
      var plan = s.generateNoCookPlan("mercadona", { calories: 2600, protein: 160, budget: 20, priority: "balanced" });
      if (plan.shoppingCost <= 20) within++;
      assert.strictEqual(typeof plan.budgetOverrun, "number");
      if (plan.shoppingCost > 20) {
        assert.ok(plan.budgetOverrun > 0, "pasarse del techo debe reportarse en budgetOverrun");
      }
    }
    assert.ok(within >= N * 0.85, "solo " + within + "/" + N + " planes dentro del ticket de 20 EUR");
  });

  t.test("presupuesto bajo -> 3 tomas sin snacks, con las kcal repartidas entre ellas", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 5, priority: "cheap" });
    assert.strictEqual(plan.slots.length, 3, "con 5 EUR el dia debe ser de 3 tomas");
    assert.strictEqual(plan.threeMealDay, true);
    var keys = plan.slots.map(function (x) { return x.key; }).sort().join(",");
    assert.strictEqual(keys, "breakfast,dinner,lunch");
    plan.slots.forEach(function (sl) { assert.ok(sl.items.length > 0, "toma vacia: " + sl.key); });
  });

  t.test("presupuesto holgado -> 5 tomas", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 20 });
    assert.strictEqual(plan.slots.length, 5);
    assert.strictEqual(plan.threeMealDay, false);
  });

  t.test("prioridad 'barato' sale MAS BARATA que 'proteina', y con menos proteina", function () {
    var s = fullSandbox();
    var cheapT = 0, protT = 0, cheapP = 0, protP = 0, N = 25;
    for (var i = 0; i < N; i++) {
      var a = s.generateNoCookPlan("mercadona", { calories: 2600, protein: 160, budget: 25, priority: "cheap" });
      var b = s.generateNoCookPlan("mercadona", { calories: 2600, protein: 160, budget: 25, priority: "protein" });
      cheapT += a.shoppingCost; protT += b.shoppingCost;
      cheapP += a.total.protein;  protP += b.total.protein;
    }
    assert.ok(cheapT < protT, "el ticket de 'barato' (" + (cheapT / N).toFixed(2) + ") debe ser menor que el de 'proteina' (" + (protT / N).toFixed(2) + ")");
    assert.ok(cheapP < protP, "'proteina' debe dar mas proteina: " + (cheapP / N).toFixed(0) + " vs " + (protP / N).toFixed(0));
  });

  t.test("REGRESION: el producto sin tamano de envase (1084 EUR) no es elegible, su gemelo bueno si", function () {
    var s = fullSandbox();
    var pool = s.getNoCookEligiblePool("mercadona");
    // El catalogo trae DOS "Langostino cocido": el id 83490 con
    // price 1084,05 y size null (el precio por kilo mal capturado) y el id
    // 87292, correcto, 6,60 EUR / 600 g. Se filtra por FALTA DE TAMANO, no
    // por nombre -- filtrar por nombre se llevaria tambien el bueno.
    assert.strictEqual(pool.some(function (e) { return e.product.id === "83490"; }), false,
      "el registro sin size no puede ser elegible: no hay racion ni coste fiables");
    assert.ok(pool.some(function (e) { return e.product.id === "87292"; }),
      "el mismo producto bien capturado SI debe seguir disponible");
    // y ningun elegible se queda sin tamano de envase
    pool.forEach(function (e) {
      assert.ok(e.serving && e.serving.packageG != null, e.product.name + " sin packageG");
    });
  });

  t.test("se prefieren productos de marca propia (estan en cualquier Mercadona)", function () {
    var s = fullSandbox();
    var own = 0, all = 0;
    for (var i = 0; i < 15; i++) {
      var plan = s.generateNoCookPlan("mercadona", { calories: 2400, protein: 140, budget: 20 });
      plan.slots.forEach(function (sl) {
        sl.items.forEach(function (it) {
          all++;
          if (/hacendado/i.test(it.brand || "") || /hacendado/i.test(it.name || "")) own++;
        });
      });
    }
    assert.ok(own / all > 0.7, "solo " + Math.round(own / all * 100) + "% de marca propia; el sesgo de disponibilidad no funciona");
  });

  t.test("regenerateNoCookSlot(): cambia SOLO esa toma y ofrece productos DISTINTOS", function () {
    var s = fullSandbox();
    var opts = { calories: 2600, protein: 160, budget: 20, priority: "balanced" };
    var plan = s.generateNoCookPlan("mercadona", opts);
    var before = plan.slots.map(function (sl) {
      return sl.items.map(function (i) { return i.id; }).join(",");
    });
    var oldDinner = plan.slots.filter(function (x) { return x.key === "dinner"; })[0];
    var oldIds = oldDinner.items.map(function (i) { return i.id; });

    var res = s.regenerateNoCookSlot(plan, "dinner", "mercadona", opts);
    assert.strictEqual(res.error, undefined, "no deberia fallar: " + res.error);
    assert.ok(res.slot.items.length > 0);
    assert.strictEqual(res.slot.key, "dinner");

    // El objetivo del boton es esquivar un producto que tu tienda no tiene:
    // tiene que traer algo distinto, no barajar los mismos.
    var newIds = res.slot.items.map(function (i) { return i.id; });
    var shared = newIds.filter(function (id) { return oldIds.indexOf(id) !== -1; });
    assert.ok(shared.length < newIds.length,
      "el reroll devolvio exactamente los mismos productos: " + newIds.join(","));

    // Las demas tomas no se tocan (regenerateNoCookSlot no muta el plan).
    var after = plan.slots.map(function (sl) {
      return sl.items.map(function (i) { return i.id; }).join(",");
    });
    assert.deepStrictEqual(after, before, "regenerateNoCookSlot no debe mutar el plan");
  });

  t.test("regenerateNoCookSlot(): clave desconocida -> error, nunca lanza", function () {
    var s = fullSandbox();
    var plan = s.generateNoCookPlan("mercadona", { calories: 2400 });
    assert.strictEqual(s.regenerateNoCookSlot(plan, "no-such", "mercadona", {}).error, "unknown_slot_key");
    assert.strictEqual(s.regenerateNoCookSlot(null, "dinner", "mercadona", {}).error, "no_plan");
  });

  // ── El catálogo es de COMIDA (2026-09-03) ────────────────────────────
  //
  // El usuario encontró un CEPILLO DE DIENTES buscando en el panel de
  // productos. Estaba en "Cuidado facial y corporal", que nunca se excluyó
  // del export. Se fue esa categoría entera y dos más, más la puericultura
  // de "Bebé" y las velas de cumpleaños de repostería: 755 productos, de
  // los cuales UNO tenía kcal. Ver scripts/export_mercadona_products.py.

  t.test("el catálogo no trae categorías que no son comida", function () {
    var s = fullSandbox();
    var prohibidas = [
      "Limpieza y hogar", "Maquillaje", "Mascotas",
      "Cuidado facial y corporal", "Cuidado del cabello",
      "Fitoterapia y parafarmacia"
    ];
    var coladas = s.REAL_PRODUCTS.filter(function (p) {
      return prohibidas.indexOf(p.category) !== -1;
    });
    assert.strictEqual(coladas.length, 0,
      "no-comida en el catálogo: " + coladas.slice(0, 5).map(function (p) {
        return p.name + " (" + p.category + ")";
      }).join(" | "));
  });

  t.test("ni objetos no comestibles escondidos en categorías de comida", function () {
    var s = fullSandbox();
    // Comprobación por NOMBRE a propósito, independiente de la taxonomía:
    // si Mercadona reorganiza sus categorías, el corte por categoría puede
    // dejar de tapar el agujero y esto seguiría avisando. Es exactamente
    // como se coló el cepillo de dientes.
    var noComestible = /\b(cepillo|pa[ñn]al|champ[uú]|desodorante|preservativo|toallita|chupete|biber[oó]n|colonia|maquillaje|vela de|velas de)\b/i;
    var coladas = s.REAL_PRODUCTS.filter(function (p) {
      return noComestible.test(p.name || "");
    });
    assert.strictEqual(coladas.length, 0,
      "objetos no comestibles en el catálogo: " + coladas.slice(0, 5).map(function (p) {
        return p.name + " (" + p.category + " / " + p.leafCategory + ")";
      }).join(" | "));
  });

  t.test("pero la comida de bebé SÍ se queda", function () {
    var s = fullSandbox();
    // El corte de "Bebé" es por HOJA, no por categoría, justamente para no
    // tirar los tarritos con los pañales. Si alguien lo simplifica a
    // excluir la categoría entera, esto salta.
    var beb = s.REAL_PRODUCTS.filter(function (p) { return p.category === "Bebé"; });
    assert.ok(beb.length >= 20,
      "quedan " + beb.length + " productos de Bebé; se esperaba la comida (tarritos, papillas, leches)");
    assert.ok(beb.every(function (p) { return (p.leafCategory || "").indexOf("Pañal") === -1; }),
      "se han colado pañales");
  });

  // ── Congelados: en el catálogo, pero NUNCA en este modo (2026-09-02) ──
  //
  // Los congelados entraron en real-products.js para poder buscarlos en el
  // panel de productos. Este modo debe seguir sin verlos: casi todo
  // congelado exige cocinar de verdad. Ver NO_COOK_EXCLUDED_CATEGORIES en
  // no-cook-classifier.js para la medición completa.

  t.test("el catálogo TIENE congelados (si no, los dos tests de abajo no prueban nada)", function () {
    var s = fullSandbox();
    var cong = s.REAL_PRODUCTS.filter(function (p) { return p.category === "Congelados"; });
    // Sin esta comprobación, quitar los congelados del exportador apagaría
    // los tests siguientes en silencio en vez de hacerlos fallar -- el
    // mismo modo de fallo que ya tuvo el invariante de instrucciones.
    assert.ok(cong.length > 100,
      "se esperaban congelados en el catálogo y hay " + cong.length);
  });

  t.test("ningún congelado llega al pool de 'sin cocinar'", function () {
    var s = fullSandbox();
    var pool = s.getNoCookEligiblePool("mercadona");
    var colados = pool.filter(function (e) { return e.product.category === "Congelados"; });
    assert.strictEqual(colados.length, 0,
      "congelados colados en el pool: "
      + colados.map(function (e) { return e.product.name; }).join(" | "));
  });

  // ── Nutrición aproximada: se advierte, y no decide nada (2026-09-03) ──
  //
  // Tras la primera corrida del enricher, el 6,5% de los items de un plan y
  // el 46% de los planes llevan macros emparejados por NOMBRE y sin revisar.
  // El panel de productos ya lo advertía; las tarjetas de comida no.

  t.test("buildNoCookItem() arrastra la procedencia de la nutrición", function () {
    var s = fullSandbox();
    var pool = s.getNoCookEligiblePool("mercadona");
    var conRevision = pool.filter(function (e) { return e.product.needsReview; });
    // Si el catálogo dejara de traer productos marcados, este test se
    // volvería vacío en silencio en vez de fallar.
    assert.ok(conRevision.length > 0, "el catálogo ya no trae productos needsReview");

    var item = s.buildNoCookItem(conRevision[0], 1, false);
    assert.strictEqual(item.needsReview, true);
    assert.strictEqual(item.nutritionSource, conRevision[0].product.nutritionSource);
    assert.strictEqual(item.nutritionConfidence, conRevision[0].product.nutritionConfidence);
  });

  t.test("renderNutritionTrustBadge(): advierte de lo aproximado y calla del resto", function () {
    var s = loadBrowserGlobals([projPath("js/core/utils.js"), projPath("js/core/i18n.js"),
      projPath("js/i18n/es.js"), projPath("js/ui/render.js")]);

    var aprox = s.renderNutritionTrustBadge({
      needsReview: true, nutritionConfidence: "very_low", kcal: 31
    });
    assert.ok(aprox.indexOf("sin verificar") !== -1, "debería advertir: " + aprox);
    // El nivel se le enseña al usuario en español, no como identificador.
    assert.ok(aprox.indexOf("muy baja") !== -1, "el nivel debe ir en español: " + aprox);
    assert.strictEqual(aprox.indexOf("very_low"), -1, "no debe filtrarse el identificador inglés");

    // Emparejado por EAN: el código de barras identifica el producto exacto.
    assert.strictEqual(s.renderNutritionTrustBadge({
      needsReview: false, nutritionSource: "openfoodfacts_ean", kcal: 120
    }), "");
    // Legacy sin procedencia: no consta que sea conjetura, así que no se
    // afirma que lo sea. El silencio nunca significa "verificado".
    assert.strictEqual(s.renderNutritionTrustBadge({ kcal: 120 }), "");
    // Sin cifra que mostrar no hay nada de lo que desconfiar.
    assert.strictEqual(s.renderNutritionTrustBadge({ needsReview: true, kcal: null }), "");
    assert.strictEqual(s.renderNutritionTrustBadge(null), "");
  });

  t.test("la procedencia NO participa en generar el plan", function () {
    // Mismo contrato que los alérgenos: es información, no un filtro. Si
    // algún día se usara para elegir, un producto marcado dejaría de salir
    // y la advertencia se volvería inútil por no tener a quién advertir.
    var src = require("fs").readFileSync(projPath("js/engine/no-cook-generator.js"), "utf8");
    var lineas = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")
      .filter(function (l) { return !/^\s*\/\//.test(l); });

    ["needsReview", "nutritionConfidence", "nutritionSource"].forEach(function (campo) {
      var citas = lineas.filter(function (l) { return l.indexOf(campo) !== -1; });
      assert.strictEqual(citas.length, 1,
        campo + " se menciona en " + citas.length + " líneas del generador; se espera 1");
      // Y esa única línea debe ser una COPIA (`campo: ...p.campo...`), no
      // una comparación ni una condición.
      assert.ok(new RegExp("^\\s*" + campo + ":").test(citas[0]),
        campo + " no se está solo copiando: " + citas[0].trim());
    });
  });

  t.test("pescado y marisco CRUDOS congelados no se anuncian como 'abrir y comer'", function () {
    var s = fullSandbox();
    // Estos dos nombres son reales y son la razón de la regla: sin la
    // exclusión por categoría caen en classifyByNameFallback(), que casa
    // por SUBCADENA -- "Colas de gambón" con "cola" (el refresco) y
    // "emPERAdor" con "pera" (la fruta) -- y los dos salían con nivel 0,
    // es decir, marisco y pescado crudos presentados como listos para comer.
    ["Colas de gambón crudo Hacendado congelado",
     "Rodaja de emperador Hacendado ultracongelado"].forEach(function (name) {
      var res = s.classifyNoCookProduct({
        name: name, category: "Congelados", leafCategory: "Pescado"
      });
      assert.strictEqual(res, null, "no debería ser elegible sin cocinar: " + name);
    });
  });

  // ── 7. Lo que sobra de un día sirve a los demás (2026-10-27) ──────────
  // Queja del dueño con 3 días a 4.000 kcal: «4000 из 4000, потом 2600 из
  // 4000…» y en la despensa productos usados una sola vez el día 1. Ver la
  // cabecera de no-cook-generator.js («Lo que sobra de un día…»).

  function motorSandbox() {
    return loadBrowserGlobals([
      projPath("js/core/utils.js"),
      projPath("js/data/serving-sizes.js"),
      projPath("js/data/no-cook-templates.js"),
      projPath("js/engine/no-cook-generator.js")
    ]);
  }

  /** Un día de mentira con lo que lee noCookCuentas: [id, raciones, por envase, precio, política]. */
  function diaCon(filas) {
    return { slots: [{ key: "lunch", items: filas.map(function (f) {
      return { id: f[0], servings: f[1], servingsPerPackage: f[2], price: f[3], policy: f[4] || "keeps", role: "protein" };
    }) }] };
  }

  /** Comparación entre «reinos» de vm: por JSON (ver tests/run-tests.js). */
  function igual(a, b, msg) { assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg); }

  t.test("noCookCuentas(): lo que sobra de un envase se come otro día gratis; cada día solo paga lo nuevo", function () {
    var s = motorSandbox();
    // A: pack de 6 a 3 €; 2 el día 1 y 3 el día 2, que no paga nada.
    // B: pack de 2 a 1 €; 1 el día 1 y 3 el día 3: usa el que sobra y compra otro.
    var c = s.noCookCuentas([
      diaCon([["A", 2, 6, 3], ["B", 1, 2, 1]]),
      diaCon([["A", 3, 6, 3]]),
      diaCon([["B", 3, 2, 1]])
    ]);
    igual(c.dias.map(function (d) { return d.ticket; }), [4, 0, 1]);
    igual(c.dias.map(function (d) { return d.comprados; }), [2, 0, 1]);
    igual(c.dias[1].heredado, { A: { servings: 4, desde: 0 }, B: { servings: 1, desde: 0 } });
    igual(c.envases, { A: 1, B: 2 });
    igual(c.siguiente, { A: { servings: 1, desde: 0 } });
    igual(c.lotes.map(function (l) { return [l.id, l.desde, l.hasta, l.sobra]; }), [["A", 0, 2, 1]],
      "solo queda la ración de A, comible del día 1 al 3");
  });

  t.test("noCookCuentas(): un envase abierto vale los días que dice la tienda; lo «fresh» no pasa de día", function () {
    var s = motorSandbox();
    // C aguanta 1 día abierto (como resolveExpiry: abierto el día A, vale hasta el A+1).
    s.getStoreDaysAfterOpening = function (id) { return id === "C" ? 1 : null; };
    var c = s.noCookCuentas([diaCon([["C", 1, 4, 2]]), diaCon([["C", 1, 4, 2]]), diaCon([["C", 1, 4, 2]])]);
    igual(c.dias.map(function (d) { return d.ticket; }), [2, 0, 2], "el día 3 ya no puede usar el del día 1");
    igual(c.envases, { C: 2 });
    igual(c.lotes.map(function (l) { return [l.id, l.desde, l.hasta, l.sobra]; }), [["C", 0, 1, 2], ["C", 2, 2, 3]]);

    var f = s.noCookCuentas([diaCon([["F", 1, 2, 5, "fresh"]]), diaCon([])]);
    igual(f.dias[1].heredado, {}, "media pizza no se guarda para mañana");
    igual(f.lotes.map(function (l) { return [l.id, l.desde, l.hasta]; }), [["F", 0, 0]]);
  });

  t.test("varios días: el día 2+ aprovecha lo que sobra de antes y la compra cuadra con los tickets", function () {
    var s = fullSandbox();
    var bajos = 0, dias = 0, conHerencia = 0, deSobras = 0;
    for (var semilla = 1; semilla <= 8; semilla++) {
      require("./lib/seed-random").seedRandomInContext(s, semilla);
      var plan = s.generateNoCookPlanDays("mercadona", { calories: 4000, protein: 160, budget: 15 }, 3);
      var c = s.noCookCuentas(plan);
      var reutiliza = false;
      plan.forEach(function (p, d) {
        var kcal = p.slots.reduce(function (a, sl) { return a + sl.total.kcal; }, 0);
        dias++;
        if (kcal < 4000 * 0.85) bajos++;
        assert.strictEqual(p.shoppingCost, c.dias[d].ticket, "el ticket del día sale de noCookCuentas");
        p.slots.forEach(function (sl) {
          sl.items.forEach(function (it) {
            deSobras += it.deSobras || 0;
            if (d && c.dias[d].heredado[it.id]) reutiliza = true;
            assert.strictEqual(it.quantity, it.servings, "la despensa lee `quantity`");
          });
        });
      });
      if (reutiliza) conHerencia++;
    }
    // Medido el 2026-10-27 con estas semillas: 8 de 8 planes reutilizan y 2
    // de 24 días quedan por debajo del 85% (antes del cambio, con 15 €, el
    // 40% de los días).
    assert.strictEqual(conHerencia, 8, "algún día 2 o 3 tendría que comer lo que sobró antes");
    assert.ok(bajos <= 4, bajos + " de " + dias + " días por debajo del 85%");
    assert.ok(deSobras > 0, "algún día corto se rellena con lo que sobra");
  });

  /** Una entrada de pool de mentira, con lo que usa buildNoCookItem. */
  function entrada(id, rol, kcal100) {
    return {
      product: { id: id, name: "Producto " + id, kcal: kcal100, protein: 8, carbs: 40, fat: 5, price: 2, size: 300, sizeUnit: "g" },
      serving: { servingG: 30, servingsPerPackage: 10, role: rol, policy: "keeps", packageG: 300 },
      unit: "porción", level: 0
    };
  }

  t.test("_rellenarConSobras(): un día corto se rellena con lo que sobra, sin pagar nada más", function () {
    var s = motorSandbox();
    var pan = entrada("P", "carrier", 250);
    var crema = entrada("U", "untable", 300);
    function dia(filas) {
      var d = { slots: [{ key: "breakfast", items: filas }, { key: "snack", items: [] }] };
      d.slots.forEach(function (sl) { sl.total = s._totalDeToma(sl); });
      return d;
    }
    // Día 1: pan con crema. Día 2: pan solo. Los dos muy por debajo de 2.100 kcal.
    var d1 = dia([s.buildNoCookItem(pan, 2, true), s.buildNoCookItem(crema, 1, true)]);
    var d2 = dia([s.buildNoCookItem(pan, 1, false)]);
    var antes = s.noCookCuentas([d1, d2]).dias.map(function (d) { return d.ticket; });

    var puestas = s._rellenarConSobras([d1, d2], [pan, crema], { calories: 2100, protein: 0 });
    var tope = s.NO_COOK_EXTRA_RACIONES;   // a 2.100 kcal el factor de raciones es 1
    assert.strictEqual(d1.slots[0].items[0].servings, 2 + tope, "más raciones en SU fila, hasta el tope");
    assert.strictEqual(d1.slots[0].items[0].deSobras, tope);
    assert.strictEqual(d1.slots[0].items[0].quantity, 2 + tope, "la despensa lee `quantity`");
    assert.strictEqual(d1.slots[0].items[1].deSobras, tope, "donde ya se unta, se unta más");
    assert.strictEqual(d2.slots[0].items.length, 1, "la crema no se come sola: el día 2 no unta nada");
    assert.strictEqual(d2.slots[1].items.length, 0);
    assert.strictEqual(d2.slots[0].items[0].deSobras, tope);
    assert.strictEqual(puestas, 3 * tope);
    igual(s.noCookCuentas([d1, d2]).dias.map(function (d) { return d.ticket; }), antes, "lo que se pone ya estaba pagado");
    assert.ok(Math.abs(s._totalDelDia(d1).kcal - (s._totalDeToma(d1.slots[0]).kcal + s._totalDeToma(d1.slots[1]).kcal)) < 1e-9,
      "los totales del día se rehacen");

    // Un día que ya está en su objetivo no se toca, aunque sobre.
    var lleno = dia([s.buildNoCookItem(pan, 8, true)]);
    assert.strictEqual(s._rellenarConSobras([lleno], [pan], { calories: 640 }), 0);
  });

  t.test("_rellenarConSobras(): un día corto puede comer del envase que el menú abre otro día, sin mover tickets, si aguanta abierto", function () {
    var s = motorSandbox();
    var galletas = entrada("G", "dulce", 400);   // 120 kcal la ración, 10 por envase, 2 €
    function dia(filas) {
      var d = { budget: 10, slots: [{ key: "breakfast", items: filas }, { key: "snack", items: [] }] };
      d.slots.forEach(function (sl) { sl.total = s._totalDeToma(sl); });
      return d;
    }
    function tickets(planes) { return s.noCookCuentas(planes).dias.map(function (d) { return d.ticket; }); }
    // El menú abre las galletas el día 2 y deja 9 raciones sin comer. La compra
    // es una sola: el día 1, corto, puede empezarlas.
    var planes = [dia([]), dia([s.buildNoCookItem(galletas, 1, true)])];
    igual(tickets(planes), [0, 2]);
    s._rellenarConSobras(planes, [galletas], { calories: 2100 });
    var puestas = planes[0].slots[1].items;
    assert.strictEqual(puestas.length, 1, "en el snack del día 1");
    assert.strictEqual(puestas[0].deSobras, s.NO_COOK_EXTRA_RACIONES);
    igual(tickets(planes), [0, 2], "lo paga el envase que el menú ya compraba el día 2");
    igual(s.noCookCuentas(planes).envases, { G: 1 }, "y la compra es la misma");
    var lote = s.noCookCuentas(planes).lotes[0];
    igual([lote.desde, lote.sobra], [0, 9 - 2 * s.NO_COOK_EXTRA_RACIONES], "se abre el día 1 y queda lo que queda");

    // Si «Cambiar» quita las galletas del día 2, lo comido el día 1 lo compra el día 1.
    planes[1].slots[0].items = [];
    igual(tickets(planes), [2, 0]);

    // Y si abiertas aguantan un día y el menú las come el día 3, el día 1 no las toma.
    s.getStoreDaysAfterOpening = function () { return 1; };
    var tres = [dia([]), dia([]), dia([s.buildNoCookItem(galletas, 1, true)])];
    s._rellenarConSobras(tres, [galletas], { calories: 2100 });
    assert.strictEqual(tres[0].slots[1].items.length, 0, "abiertas el día 1 no llegarían buenas al día 3");
    assert.strictEqual(tres[1].slots[1].items.length, 1, "el día 2 sí");
    igual(tickets(tres), [0, 0, 2]);
  });

  // ── Calidad de las tomas (2026-11-04) ───────────────────────────────────
  // El dueño: «на обед у меня было две банки горошка и пол пачки колбасы…
  // давай сделаем огромный упор на качество». Medido antes: el 43,6% de 1.800
  // tomas tenía algo sin sentido (una «ensalada» de guisantes de lata, Nocilla
  // con chorizo, huevos crudos, raciones de más). Ver noCookTipo.

  function tipoDe(s, nombre) {
    var pr = findProduct(s, nombre);
    assert.ok(pr, "no está en el catálogo: " + nombre);
    var rol = s.noCookRolAjustado(pr, s.resolveServing(pr).role);
    return { rol: rol, tipo: s.noCookTipo(pr, rol) };
  }

  t.test("noCookTipo: lo que hay que cocinar o no es comida queda fuera; cada producto, en su sitio", function () {
    var s = fullSandbox();
    assert.strictEqual(tipoDe(s, "Huevos grandes L").tipo, null, "huevos crudos");
    assert.strictEqual(tipoDe(s, "Huevos cocidos").tipo, "huevo");
    assert.strictEqual(tipoDe(s, "Bacón Hacendado cintas").tipo, null, "bacón crudo");
    assert.strictEqual(tipoDe(s, "Tomate triturado Hacendado").tipo, null, "tomate para guisar");
    assert.strictEqual(tipoDe(s, "Crema de leche para café Campina").tipo, null);
    assert.strictEqual(tipoDe(s, "Placas para lasaña precocidas El Pavo").tipo, null);
    assert.strictEqual(tipoDe(s, "Guisantes extra Hacendado").tipo, "conserva_caliente");
    assert.strictEqual(tipoDe(s, "Lechuga Iceberg").tipo, "hoja");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(tipoDe(s, "Garbanzo cocido Hacendado"))), { rol: "legumbre", tipo: "legumbre" });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(tipoDe(s, "Arroz cocido basmati Sabroz"))), { rol: "base", tipo: "base" });
    assert.strictEqual(tipoDe(s, "Mermelada de albaricoque Hacendado").tipo, "dulce");
    assert.strictEqual(tipoDe(s, "Paté de cerdo sabor suave Hacendado").tipo, "pate");
    assert.strictEqual(tipoDe(s, "Chorizo Pamplona extra Hacendado lonchas").tipo, "embutido");
    assert.strictEqual(tipoDe(s, "Pechuga de pavo Hacendado finas lonchas").tipo, "fiambre");
    assert.strictEqual(tipoDe(s, TORTILLAS).tipo, "tortilla");
  });

  t.test("las tomas tienen sentido: 600 tomas sin productos fuera de sitio ni raciones de más", function () {
    var s = fullSandbox();
    var seed = require("./lib/seed-random").seedRandomInContext;
    var porId = {};
    s.REAL_PRODUCTS.forEach(function (pr) { porId[pr.id] = pr; });
    var mal = [];
    var tomas = 0;
    [2100, 3100, 4000].forEach(function (cal) {
      [10, 20].forEach(function (bud) {
        for (var sd = 1; sd <= 10; sd++) {
          seed(s, sd * 101 + cal + bud);
          var plan = s.generateNoCookPlan("mercadona", { calories: cal, protein: Math.round(cal * 0.06), budget: bud, priority: sd % 2 ? "balanced" : "cheap" });
          var factor = s.noCookFactorRaciones(cal);
          plan.slots.forEach(function (slot) {
            tomas++;
            var t = slot.items.map(function (it) {
              var pr = porId[it.id];
              var rol = s.noCookRolAjustado(pr, s.resolveServing(pr).role);
              return { it: it, rol: rol, tipo: s.noCookTipo(pr, rol) };
            });
            function quejarse(por) { mal.push(cal + "/" + bud + " " + slot.key + " [" + slot.templateKey + "] " + por); }
            t.forEach(function (x) {
              if (x.tipo === null) quejarse("fuera del modo: " + x.it.name);
              var cap = s.NO_COOK_MAX_G_POR_TIPO[x.tipo];
              if (cap && s.TIPOS_QUE_CRECEN.indexOf(x.tipo) !== -1) cap *= factor;
              var unaRacion = x.it.servingG || 0;
              if (cap && x.rol !== "principal" && x.it.grams > Math.max(cap, unaRacion) + 1) quejarse(x.it.grams + " g de " + x.it.name);
            });
            var salado = t.some(function (x) { return x.rol === "protein" || x.rol === "queso"; });
            if (salado && t.some(function (x) { return x.tipo === "dulce"; })) quejarse("dulce con salado");
            if (slot.templateKey === "ensalada_completa" && !t.some(function (x) { return ["hoja", "ensalada_lista", "crudo"].indexOf(x.tipo) !== -1; })) quejarse("ensalada sin ensalada");
            if (slot.templateKey === "wrap" && !t.some(function (x) { return x.tipo === "tortilla"; })) quejarse("wrap sin tortilla");
            if ((slot.key === "lunch" || slot.key === "dinner") && !t.some(function (x) { return ["carrier", "principal", "base", "legumbre"].indexOf(x.rol) !== -1; })) quejarse("sin hidratos");
          });
          var lu = plan.slots.filter(function (x) { return x.key === "lunch"; })[0];
          var di = plan.slots.filter(function (x) { return x.key === "dinner"; })[0];
          if (lu.templateKey === di.templateKey && lu.templateKey !== "principal") mal.push(cal + "/" + bud + " comida y cena con la misma plantilla: " + lu.templateKey);
        }
      });
    });
    assert.ok(tomas > 250, "tomas: " + tomas);
    assert.deepStrictEqual(mal.slice(0, 5), [], mal.length + " con problemas");
  });

  // ── Variedad dentro del día y entre días (2026-11-06) ───────────────────
  // Queja del dueño: «каждый день я ем по сути одно и то же утром днём и
  // вечером, на следующий день также». Medido con este mismo caso (2.600
  // kcal, 18 €, 20 planes de 3 días) antes del cambio: un producto en 3 tomas
  // o más en 51 de 60 días, los dos snacks idénticos en 10, la misma
  // plantilla que ayer en la misma toma 40 veces de 200, la misma proteína
  // en comida y cena en 18 días. Después: 5, 0, 0 y 3. Con el presupuesto del
  // plan entero (2026-11-06), 1, 0, 0 y 3, y ningún plan por encima de 3 x 18 €
  // (el día 1 compra ahora 15-27 €).
  t.test("variedad: un producto no sale en cada toma, ni los snacks se repiten, ni la toma de ayer", function () {
    var s = fullSandbox();
    var seed = require("./lib/seed-random").seedRandomInContext;
    var dias = 0, tres = 0, snacksIguales = 0, comoAyer = 0, pares = 0, mismaProteina = 0, sobre = 0;
    function ids(sl) { return sl.items.map(function (it) { return it.id; }).sort().join("+"); }
    function principal(sl) { return sl.items.slice().sort(function (a, b) { return b.protein - a.protein; })[0].id; }
    for (var q = 1; q <= 20; q++) {
      seed(s, 100 + q);
      var plan = s.generateNoCookPlanDays("mercadona", { calories: 2600, protein: 150, budget: 18, priority: "balanced" }, 3);
      var compra = plan.reduce(function (a, d) { return a + d.shoppingCost; }, 0);
      if (compra > 3 * 18 + 0.01) sobre++;
      plan.forEach(function (d, i) {
        dias++;
        var veces = {};
        d.slots.forEach(function (sl) {
          var aqui = {};
          sl.items.forEach(function (it) { if (!aqui[it.id]) { aqui[it.id] = true; veces[it.id] = (veces[it.id] || 0) + 1; } });
        });
        if (Object.keys(veces).some(function (id) { return veces[id] >= 3; })) tres++;
        var by = {};
        d.slots.forEach(function (sl) { by[sl.key] = sl; });
        if (by.snack && by.snack2 && ids(by.snack) === ids(by.snack2)) snacksIguales++;
        if (by.lunch && by.dinner && by.lunch.items.length && by.dinner.items.length && principal(by.lunch) === principal(by.dinner)) mismaProteina++;
        if (i === 0) return;
        var ayer = {};
        plan[i - 1].slots.forEach(function (sl) { ayer[sl.key] = sl.templateKey; });
        d.slots.forEach(function (sl) {
          if (!ayer[sl.key] || !sl.templateKey) return;
          pares++;
          if (ayer[sl.key] === sl.templateKey) comoAyer++;
        });
      });
    }
    assert.ok(tres / dias <= 0.2, "un producto en 3+ tomas en " + tres + " de " + dias + " días (antes, 51 de 60)");
    assert.strictEqual(snacksIguales, 0, "días con los dos snacks iguales");
    assert.ok(comoAyer / pares <= 0.03, "la misma plantilla que ayer en " + comoAyer + " de " + pares + " (antes, 40 de 200)");
    assert.ok(mismaProteina / dias <= 0.15, "comida y cena con la misma proteína en " + mismaProteina + " de " + dias + " días (antes, 18 de 60)");
    assert.ok(sobre <= 1, "planes por encima de 3 x 18 €: " + sobre + " de 20");
  });

  // ── Un presupuesto para todo el plan (2026-11-06) ───────────────────────
  // El dueño: «главное чтобы в день выходило столько сколько сказали, а то что
  // первый день может быть 20€ а третий 5€ вообще пофиг».
  t.test("presupuesto del plan: el día 1 puede comprar más, el plan no pasa de N x presupuesto y las tomas siguen al de cada día", function () {
    var s = fullSandbox();
    var seed = require("./lib/seed-random").seedRandomInContext;
    var sobre = 0, dia1MasCaro = 0;
    for (var q = 1; q <= 10; q++) {
      seed(s, 300 + q);
      var plan = s.generateNoCookPlanDays("mercadona", { calories: 2600, protein: 140, budget: 12, priority: "balanced" }, 3);
      var compra = plan.reduce(function (a, d) { return a + d.shoppingCost; }, 0);
      var exceso = Math.max(0, compra - 36);
      if (exceso > 0.005) sobre++;
      if (plan[0].shoppingCost > 12.01) dia1MasCaro++;
      plan.forEach(function (d) {
        assert.strictEqual(d.budget, 12, "cada día guarda el presupuesto por día");
        assert.ok(Math.abs(d.budgetOverrun - (exceso > 0.005 ? Math.round(exceso * 100) / 100 : 0)) < 0.011,
          "budgetOverrun es lo que se pasa el plan entero, igual en cada día");
      });
    }
    // Medido: 0 de 10 por encima, y el día 1 por encima de 12 € en los 10
    // (17-24 €; los días 3, 1,60-8,95 €).
    assert.ok(sobre <= 1, "planes por encima de 36 €: " + sobre);
    assert.ok(dia1MasCaro >= 5, "el día 1 compra más que su presupuesto en " + dia1MasCaro + " de 10");

    // Con menos de NO_COOK_MIN_BUDGET_FOR_SNACKS por día, 3 tomas TODOS los
    // días, aunque el techo del día 1 sea mucho más alto.
    seed(s, 7);
    s.generateNoCookPlanDays("mercadona", { calories: 2200, protein: 110, budget: 6, priority: "cheap" }, 3).forEach(function (d, i) {
      assert.strictEqual(d.slots.length, 3, "día " + (i + 1) + ": " + d.slots.length + " tomas");
    });
  });

  t.test("noCookCompraDelPlan, noCookTechoDelDia y noCookTechoParaCambiar: las cuentas del presupuesto del plan", function () {
    var s = motorSandbox();
    function dia(ticket, presupuesto) { return { shoppingCost: ticket, budget: presupuesto, slots: [] }; }
    assert.strictEqual(s.noCookCompraDelPlan([dia(20, 12)]), null, "un día suelto no es un plan");
    assert.strictEqual(s.noCookCompraDelPlan([dia(20, null), dia(5, null)]), null, "sin presupuesto, tampoco");
    igual(s.noCookCompraDelPlan([dia(20.4, 12), dia(9.1, 12), dia(4.2, 12)]), { dias: 3, compra: 33.7, presupuesto: 36 });
    // Día 1 de 3 a 12 €: 36 menos lo apartado para los dos que faltan.
    assert.strictEqual(s.noCookTechoDelDia(12, 3, 0, [], 0.5), 24);
    // Día 3: lo que no compraron los días 1 y 2.
    assert.strictEqual(s.noCookTechoDelDia(12, 3, 2, [{ ticket: 20 }, { ticket: 9 }], 0.5), 7);
    // «Cambiar» en el día 2: lo que dejan los otros dos tal como están.
    assert.strictEqual(s.noCookTechoParaCambiar([dia(20, 12), dia(9, 12), dia(4, 12)], 1), 12);
    assert.strictEqual(s.noCookTechoParaCambiar([dia(20, 12)], 0), undefined, "con un día manda su presupuesto");
    assert.strictEqual(s._techoDelDia(12, undefined), 12);
    assert.strictEqual(s._techoDelDia(12, -3), 0.01, "sin nada que gastar, no «sin presupuesto»");
    assert.strictEqual(s._techoDelDia(Infinity, 20), Infinity);
  });

  t.test("_notaDelPlan(): resta lo que falta de proteína y de kcal, lo que sale en 3+ tomas y la misma proteína en comida y cena", function () {
    var s = motorSandbox();
    function fila(id, prot) { return { id: id, protein: prot, kcal: 100 }; }
    function dia(kcal, prot, tomas) {
      return { total: { kcal: kcal, protein: prot }, slots: tomas.map(function (t) { return { key: t[0], items: t[1] }; }) };
    }
    var opts = { calories: 2000, protein: 100 };
    var bien = dia(2000, 100, [["breakfast", [fila("a", 5)]], ["lunch", [fila("b", 30)]], ["dinner", [fila("c", 30)]]]);
    assert.strictEqual(s._notaDelPlan([bien], opts), 0, "todo en su sitio");
    var corto = dia(2000, 80, [["breakfast", [fila("a", 5)]], ["lunch", [fila("b", 30)]], ["dinner", [fila("c", 30)]]]);
    assert.ok(Math.abs(s._notaDelPlan([corto], opts) + s.NO_COOK_NOTA.proteina * 0.2) < 1e-9, "un 20% corto de proteína");
    var repe = dia(2000, 100, [["breakfast", [fila("a", 5)]], ["lunch", [fila("a", 5), fila("b", 30)]], ["dinner", [fila("a", 5), fila("b", 30)]]]);
    assert.ok(Math.abs(s._notaDelPlan([repe], opts) + s.NO_COOK_NOTA.tresTomas + s.NO_COOK_NOTA.mismaProteina) < 1e-9,
      "«a» en tres tomas y «b», la proteína de la comida y de la cena");
    assert.ok(s._notaDelPlan([bien, corto], opts) > s._notaDelPlan([corto, corto], opts), "se compara por día, de media");
  });

  t.test("_repetirLoPagado(): lo menos repetido primero, el pan dos veces, y sin tope solo si se pide", function () {
    var s = fullSandbox();
    function r(id, rol) { return { entry: { product: { id: id }, serving: { role: rol } } }; }
    var day = { vecesHoy: { a: 1, b: 2, c: 3 } };
    var lista = [r("c"), r("b"), r("a")];
    assert.strictEqual(s._repetirLoPagado(lista, "protein", day, false).entry.product.id, "a", "la que sale menos");
    assert.strictEqual(s._repetirLoPagado([r("b"), r("c")], "protein", day, false), null, "dos veces ya es el tope sin pedir más");
    assert.strictEqual(s._repetirLoPagado([r("b"), r("c")], "protein", day, true).entry.product.id, "b", "sin tope, la que menos");
    assert.strictEqual(s._repetirLoPagado([r("b")], "carrier", day, false).entry.product.id, "b", "el pan cabe una vez más");
    assert.strictEqual(s._vecesAlDia("carrier"), 2);
    assert.strictEqual(s._vecesAlDia("fruta"), 1);
  });

  t.test("una ración que no es la lata entera se dice en gramos, no «2 latas» (2026-11-04)", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/utils.js"), projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/ui/render.js"),
      projPath("js/ui/render-no-cook.js")
    ]);
    var html = s.renderNoCookItem({ id: "g", name: "Guisantes extra Hacendado", unit: "lata", servings: 2, quantity: 2,
      servingG: 80, grams: 160, servingsPerPackage: 4, kcal: 94, protein: 6, carbs: 12, fat: 1 });
    assert.ok(html.indexOf("160") !== -1, html);
    assert.strictEqual(/2 lata/.test(html), false, "no dice «2 latas»: " + html);
  });
}

module.exports = { run: run };
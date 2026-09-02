/**
 * tests/ingredient-packaging-coverage.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * FASE 0 — test DIAGNÓSTICO de cobertura entre los ingredient roles reales
 * de js/data/dishes.js (DISH_DB) y el sistema de resolución de envase/
 * paquete que usa la lista de la compra (js/core/pricing.js:
 * resolvePackageInfo, con su cascada real-ingredient-matches.js →
 * packaging.js → "sin envase fijo conocido").
 *
 * Por qué existe: durante la revisión arquitectónica de esta sesión se
 * detectó que packaging.js declara en su propia cabecera cubrir "los 65
 * ingredientes de DISH_DB" -- una cifra desactualizada desde que el
 * dataset creció a 334 platos / 81 ingredient roles (ver STATE.md). Cruzar
 * programáticamente los 81 roles reales contra resolvePackageInfo() real
 * (no reimplementada) encontró 18 roles sin packageSizeG conocido que NO
 * están en la lista de "carne/pescado fresco" que packaging.js documenta
 * como excepción intencional -- es decir, un agujero de cobertura no
 * detectado hasta ahora, no una decisión de diseño.
 *
 * Este test NO corrige packaging.js (fuera del alcance de Fase 0, ver
 * ROADMAP.md — además, en la arquitectura B ya decidida, cada ingrediente
 * que se resuelva contra un producto real en Fase 1 hará irrelevante su
 * entrada aquí, así que parchear packaging.js ahora sería trabajo
 * desechable). Es puramente diagnóstico: fija la lista EXACTA de hoy como
 * línea base, para que:
 *
 *   a) si el agujero CRECE (se añade un plato nuevo con un ingrediente sin
 *      cobertura de envase), el test falla inmediatamente -- exactamente
 *      el fallo que pasó desapercibido la sesión en la que el dataset
 *      creció de 204 a 334 platos;
 *
 *   b) si el agujero SE REDUCE (Fase 1 resuelve alguno de estos 18 contra
 *      un producto real, o alguien completa packaging.js a mano), el test
 *      también falla -- obligando a actualizar la línea base de forma
 *      consciente y visible, nunca en silencio.
 *
 * NO modifica packaging.js / real-ingredient-matches.js / pricing.js /
 * dishes.js -- solo LEE y EJECUTA ese código real vía loadBrowserGlobals().
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js")
  ]);
}

/**
 * Extrae los nombres de ingrediente ÚNICOS realmente usados en DISH_DB,
 * tal como aparecen (sin normalizar) -- mismo criterio que
 * poc/core/load-dishes.js: extractUniqueIngredientRoles(), reimplementado
 * aquí en vez de importado de poc/ para no acoplar los tests de producción
 * a los internos del PoC (ver regla "no tocar poc/**" de esta fase).
 *
 * @param {object[]} dishDb
 * @returns {string[]} nombres únicos, orden de primera aparición
 */
function extractUniqueIngredientNames(dishDb) {
  var seen = [];
  dishDb.forEach(function (dish) {
    (dish.items || []).forEach(function (ingredient) {
      if (seen.indexOf(ingredient.name) === -1) seen.push(ingredient.name);
    });
  });
  return seen;
}

// Línea base auditada en esta sesión (Fase 0, 2026-08-03) EJECUTANDO
// resolvePackageInfo() real (no una reimplementación) sobre los 81 roles:
// ingredientes cuyo packageSizeG resuelve a null (ni real-ingredient-
// matches.js con sizeG, ni packaging.js con packageG/gramsPerUnit) -- lo
// que hoy hace que la lista de la compra los muestre como "se compra al
// peso, sin envase fijo".
//
// De estos 25, un subconjunto es carne/pescado fresco que packaging.js
// documenta explícitamente en su propio comentario final como excepción
// intencional (se compra al peso real, sin envase fijo) -- verificado que
// SÍ caen aquí: Bacalao, Lomo de cerdo, Lubina, Merluza, Muslo de pollo
// deshuesado, Pechuga de pavo, Rape, Salmón, Solomillo de ternera, Ternera
// magra, Conejo (10-11 casos, coherentes con el diseño). El resto --
// Calabacín, Carne picada 5% grasa, Champiñones, Coliflor, Fresas, Gamba
// cocida, Jamón serrano, Kiwi, Langostino cocido, Pan de
// centeno, Pavo picado, Pimiento, Trigo sarraceno cocido -- son fruta que
// se compra por unidad (como plátano/manzana, que SÍ tienen entrada
// perUnit), productos empaquetados (pan, cereales cocidos) o congelados en
// bolsa, con alta probabilidad un hueco de cobertura real, no una decisión
// -- consistente con lo detectado en la revisión arquitectónica de esta
// sesión. Este test NO distingue programáticamente ambos grupos (packaging.js
// no lo modela como dato) -- fija el conjunto completo como línea base;
// la clasificación de arriba es para quien lea este archivo, no una
// aserción del test.
// Línea base ACTUALIZADA 2026-08-20d (known issue #7): 13 de los 14 huecos
// reales de la auditoría original (Fase 0, 2026-08-03) se cubrieron con
// entradas nuevas en packaging.js (ver su cabecera, sección "Añadidos
// 2026-08-20d") -- Calabacín/Kiwi/Pimiento (perUnit) y Carne picada 5%
// grasa/Champiñones/Coliflor/Fresas/Gamba cocida/Jamón serrano/Langostino
// cocido/Pan de centeno/Pavo picado/Trigo sarraceno cocido (fixedPackage).
// Quedan sin cubrir, a propósito: solo los de carne/pescado fresco, que se
// compran al peso real (clasificación 4 en la cabecera de packaging.js).
// 2026-09-02: "Lechuga: Pepino" YA NO ESTÁ. Era un nombre de ingrediente
// CORRUPTO en dishes.js (dos alimentos concatenados con ":", known issue
// desde 2026-08-03). Se corrigió en origen -- el plato usa "Lechuga", que
// sí tiene envase (bolsa de 250 g) y nutrición propia -- en vez de darle
// una entrada de envase a la clave corrupta, que habría tapado el síntoma
// equivocado.
// 2026-09-02: entra "Pechuga de pollo". Su tamaño de envase venía de
// REAL_INGREDIENT_MATCHES, que ya no decide el precio (ver la cascada en
// pricing.js: el catálogo reconstruido contra la API manda). Sin ese
// tamaño cae donde caen las otras once carnes y pescados frescos: se
// compra al peso. Es lo COHERENTE -- era la única carne fresca con un
// envase fijo, y encima heredado de un dato de agosto.
var EXPECTED_NO_FIXED_PACKAGE = [
  "Bacalao",
  "Conejo",
  "Lomo de cerdo",
  "Lubina",
  "Merluza",
  "Muslo de pollo deshuesado",
  "Pechuga de pavo",
  "Pechuga de pollo",
  "Rape",
  "Salmón",
  "Solomillo de ternera",
  "Ternera magra"
].sort();

// Línea base del tamaño del dataset -- si esto cambia, la lista de arriba
// necesita re-auditarse (este test lo detectará solo si el CONTEO de roles
// cambia; si el conteo se mantiene pero cambian los NOMBRES, lo detecta el
// test de abajo igualmente vía la comparación exacta de conjuntos).
// 2026-08-31: 81 -> 84. Los 14 platos españoles nuevos (T4) usan por
// primera vez cebolla, ajo y aceite de oliva como roles de ingrediente.
// Los tres resuelven CON envase en packaging.js (cebolla 150 g/unidad, ajo
// 5 g/diente, aceite 916 g/botella).
// 2026-09-02: 84 -> 83. Salen "Lechuga: Pepino" (nombre corrupto) y "Wrap
// proteico" (producto que Mercadona no vende: los 3 platos pasan a
// "Tortillas de trigo"); entra "Lechuga", con envase propio.
// 2026-09-02 (2): 83 -> 85. Entran "Salchichas" y "Pan blanco" con los 10
// platos baratos -- dos de los alimentos con más calorías por euro de
// Mercadona, y el catálogo no tenía ninguno de los dos. Los dos resuelven
// CON envase (paquete de 400 g y barra de 250 g), así que
// EXPECTED_NO_FIXED_PACKAGE no cambia.
var EXPECTED_TOTAL_INGREDIENT_ROLES = 85;

function run(t) {
  var sandbox = freshSandbox();
  var ingredientNames = extractUniqueIngredientNames(sandbox.DISH_DB);

  t.test("línea base: DISH_DB tiene " + EXPECTED_TOTAL_INGREDIENT_ROLES + " ingredient roles únicos (si cambia, re-auditar cobertura de packaging.js)", function () {
    assert.strictEqual(
      ingredientNames.length, EXPECTED_TOTAL_INGREDIENT_ROLES,
      "DISH_DB tiene ahora " + ingredientNames.length + " roles únicos, no " + EXPECTED_TOTAL_INGREDIENT_ROLES +
      " -- el dataset cambió; la lista EXPECTED_NO_FIXED_PACKAGE de este archivo puede haber quedado desactualizada, revisar antes de fiarse del resto de tests"
    );
  });

  t.test("diagnóstico: la clasificación real de resolvePackageInfo() para los " + EXPECTED_TOTAL_INGREDIENT_ROLES + " roles coincide EXACTAMENTE con la línea base auditada en Fase 0", function () {
    var noFixedPackage = [];
    var withFixedPackage = [];

    ingredientNames.forEach(function (name) {
      var pkg = sandbox.resolvePackageInfo(name, "mercadona");
      if (pkg.packageSizeG === null) {
        noFixedPackage.push(name);
      } else {
        withFixedPackage.push(name);
      }
    });

    noFixedPackage.sort();

    // Log de diagnóstico visible al ejecutar la suite -- el propósito de
    // este test es informar, no solo pasar/fallar en silencio.
    console.log(
      "        [diagnóstico] " + withFixedPackage.length + "/" + ingredientNames.length +
      " roles con envase/paquete conocido, " + noFixedPackage.length + " sin envase fijo (al peso o hueco de cobertura)"
    );

    assert.deepStrictEqual(
      noFixedPackage, EXPECTED_NO_FIXED_PACKAGE,
      "La lista de roles sin envase fijo cambió respecto a la línea base de Fase 0.\n" +
      "        Antes (línea base, " + EXPECTED_NO_FIXED_PACKAGE.length + "): " + EXPECTED_NO_FIXED_PACKAGE.join(", ") + "\n" +
      "        Ahora (" + noFixedPackage.length + "): " + noFixedPackage.join(", ") + "\n" +
      "        Si CRECIÓ: un plato/ingrediente nuevo no tiene cobertura de packaging.js (mismo patrón que causó el hueco original).\n" +
      "        Si SE REDUJO: alguien resolvió/cubrió alguno de estos -- actualizar EXPECTED_NO_FIXED_PACKAGE a propósito."
    );
  });

  // ── El envase tiene que costar lo que cuesta en la tienda ────────────
  // Añadido 2026-09-02 por un fallo que reportó el usuario: "me dice que
  // compre 650 g de arroz y que gastaré 0,42 €, y el paquete vale 1,20".
  // El precio del rol va por gramo COCIDO y el tamaño de envase estaba en
  // gramos CRUDOS, así que el plan se inventaba paquetes de medio kilo de
  // arroz ya cocido, que no existen.
  //
  // La comprobación es que precio/100 g × tamaño del envase dé el precio
  // REAL del producto en la estantería. Si alguien vuelve a mezclar
  // unidades, este número deja de cuadrar inmediatamente.
  t.test("el precio del envase que calcula la app coincide con el precio real del producto en Mercadona", function () {
    var s = freshSandbox();
    // rol -> lo que cuesta de verdad ese paquete en la tienda (Granada,
    // 2026-09-02), verificado uno a uno contra la API.
    var REAL_SHELF_PRICE = {
      "Arroz blanco cocido":    1.20,  // Arroz largo Hacendado, 1 kg
      "Arroz integral cocido":  1.65,  // Arroz integral largo Hacendado, 1 kg
      "Pasta cocida":           1.15,  // Macarrón Hacendado, 1 kg
      "Cuscús cocido":          1.95,  // Cous cous mediano Hacendado, 1 kg
      "Quinoa cocida":          2.65,  // Quinoa Hacendado, 500 g
      "Lentejas cocidas":       0.90,  // Lenteja cocida Hacendado, bote
      "Alubias cocidas":        0.75,  // Alubia cocida blanca Hacendado, bote
      "Garbanzos cocidos":      0.80,  // Garbanzo cocido Hacendado, bote
      "Salchichas":             1.90,  // Salchichas cocidas bocata Hacendado, 400 g
      "Pan blanco":             0.50,  // Barra de pan, 250 g
      "Tortillas de trigo":     1.15,  // Tortillas de trigo Hacendado, 360 g
      "Huevos enteros":         3.05   // Huevos grandes L, docena
    };
    var off = [];
    Object.keys(REAL_SHELF_PRICE).forEach(function (name) {
      var pkg = s.resolvePackageInfo(name, "mercadona");
      if (!pkg || !pkg.packageSizeG) { off.push(name + ": sin envase"); return; }
      var diff = Math.abs(pkg.packagePrice - REAL_SHELF_PRICE[name]);
      if (diff > 0.03) {
        off.push(name + ": la app cobra " + pkg.packagePrice + " EUR por el envase (" +
          Math.round(pkg.packageSizeG) + " g) y en la tienda vale " + REAL_SHELF_PRICE[name]);
      }
    });
    assert.deepStrictEqual(off, [], off.join(" | "));
  });
}

module.exports = { run: run };

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
// cocida, Jamón serrano, Kiwi, Langostino cocido, "Lechuga: Pepino", Pan de
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
// Quedan sin cubrir, a propósito: los 11 de carne/pescado fresco (comprado
// al peso real, ver clasificación 4 en la cabecera de packaging.js) y
// "Lechuga: Pepino" -- NO es un hueco de packaging.js, es un nombre de
// ingrediente CORRUPTO en dishes.js (dos ingredientes concatenados con
// ":", known issue documentado desde 2026-08-03, sin corregir todavía) --
// darle una entrada de envase a esa clave tal cual sería tapar el síntoma
// equivocado.
var EXPECTED_NO_FIXED_PACKAGE = [
  "Bacalao",
  "Conejo",
  "Lechuga: Pepino",
  "Lomo de cerdo",
  "Lubina",
  "Merluza",
  "Muslo de pollo deshuesado",
  "Pechuga de pavo",
  "Rape",
  "Salmón",
  "Solomillo de ternera",
  "Ternera magra"
].sort();

// Línea base del tamaño del dataset -- si esto cambia, la lista de arriba
// necesita re-auditarse (este test lo detectará solo si el CONTEO de roles
// cambia; si el conteo se mantiene pero cambian los NOMBRES, lo detecta el
// test de abajo igualmente vía la comparación exacta de conjuntos).
var EXPECTED_TOTAL_INGREDIENT_ROLES = 81;

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
}

module.exports = { run: run };

/**
 * js/data/packaging.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cómo se compra y se mide REALMENTE cada ingrediente en un supermercado,
 * en vez de mostrar solo gramos abstractos (ej. "miel 23g" — nadie compra
 * ni mide así la miel). Basado en tamaños de envase habituales de
 * Mercadona/Hacendado y conversiones estándar de cocina (cucharada/
 * cucharadita en gramos).
 *
 * Claves normalizadas con normalizeIngredientKey() (js/core/pricing.js) —
 * deben coincidir exactamente con esa normalización, igual que las claves
 * de js/data/prices/mercadona.js.
 *
 * Solo cubre los 65 ingredientes que aparecen en DISH_DB. Clasificación:
 *
 *   1. spoonable  — condimentos que se miden a cucharadas, no a gramos
 *      (miel, mermelada, mantequilla de cacahuete). Son los únicos 3 de
 *      los 65 donde "gramos" no es cómo nadie los usa en la práctica.
 *
 *   2. perUnit    — se compran y cuentan por unidad (huevos, fruta entera).
 *      gramsPerUnit es una media razonable, no un valor exacto.
 *
 *   3. fixedPackage — se venden en un formato de envase fijo (bote, bolsa,
 *      lata, paquete...) — no puedes comprar "345g de pasta", compras un
 *      paquete de 500g y usas parte. packageG es el tamaño más común en
 *      Mercadona/Hacendado.
 *
 *   4. (sin entrada aquí) — carne y pescado frescos: se compran al peso
 *      real en el mostrador o en bandejas de peso variable, así que
 *      mostrar gramos SÍ es realista para estos — no necesitan traducción.
 *
 * Consumido por: js/ui/render.js (renderFoodRow)
 * ─────────────────────────────────────────────────────────────────────────
 */

var PACKAGING_INFO = {

  // ── 1. Ingredientes "de cucharada" ──────────────────────────────────────
  "miel":                      { type: "spoonable", tablespoonG: 21, teaspoonG: 7,  packageG: 350, packageLabel: "bote" },
  "mermelada light":           { type: "spoonable", tablespoonG: 20, teaspoonG: 7,  packageG: 340, packageLabel: "bote" },
  "mantequilla de cacahuete":  { type: "spoonable", tablespoonG: 16, teaspoonG: 5,  packageG: 350, packageLabel: "bote" },

  // ── 2. Se cuentan por unidad ─────────────────────────────────────────────
  "huevos enteros": { type: "perUnit", gramsPerUnit: 63,  unitLabel: "huevo" },
  "platano":         { type: "perUnit", gramsPerUnit: 120, unitLabel: "plátano" },
  "manzana":         { type: "perUnit", gramsPerUnit: 160, unitLabel: "manzana" },
  "naranja":         { type: "perUnit", gramsPerUnit: 200, unitLabel: "naranja" },
  "aguacate":        { type: "perUnit", gramsPerUnit: 180, unitLabel: "aguacate" },
  "pepino":          { type: "perUnit", gramsPerUnit: 300, unitLabel: "pepino" },
  "tomate":          { type: "perUnit", gramsPerUnit: 120, unitLabel: "tomate" },

  // ── 3. Envase fijo — compra el paquete, usa una parte ───────────────────
  "almendras":                    { type: "fixedPackage", packageG: 200,  packageLabel: "bolsa" },
  "nueces":                       { type: "fixedPackage", packageG: 200,  packageLabel: "bolsa" },
  "cacahuetes":                   { type: "fixedPackage", packageG: 250,  packageLabel: "bolsa" },
  "queso light":                  { type: "fixedPackage", packageG: 200,  packageLabel: "paquete" },
  "tortitas de arroz":            { type: "fixedPackage", packageG: 130,  packageLabel: "paquete" },
  "copos de maiz":                { type: "fixedPackage", packageG: 500,  packageLabel: "caja" },
  "granola":                      { type: "fixedPackage", packageG: 400,  packageLabel: "bolsa" },
  "avena":                        { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa" },
  "maiz dulce":                   { type: "fixedPackage", packageG: 285,  packageLabel: "lata" },
  "jamon cocido extra":           { type: "fixedPackage", packageG: 250,  packageLabel: "paquete" },
  "pan integral":                 { type: "fixedPackage", packageG: 460,  packageLabel: "barra" },
  "tortillas de trigo":           { type: "fixedPackage", packageG: 400,  packageLabel: "paquete" },
  "pan de molde integral":        { type: "fixedPackage", packageG: 460,  packageLabel: "paquete" },
  "frutos rojos congelados":      { type: "fixedPackage", packageG: 400,  packageLabel: "bolsa" },
  "mozzarella light":             { type: "fixedPackage", packageG: 200,  packageLabel: "paquete" },
  "pavo loncheado":               { type: "fixedPackage", packageG: 200,  packageLabel: "paquete" },
  "espinacas":                    { type: "fixedPackage", packageG: 200,  packageLabel: "bolsa" },
  "wrap proteico":                { type: "fixedPackage", packageG: 320,  packageLabel: "paquete" },
  "zanahoria":                    { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa" },
  "hummus":                       { type: "fixedPackage", packageG: 200,  packageLabel: "tarrina" },
  "pina":                         { type: "fixedPackage", packageG: 220,  packageLabel: "lata" },
  "verduras congeladas salteado": { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa" },
  "edamame":                      { type: "fixedPackage", packageG: 400,  packageLabel: "bolsa" },
  "queso fresco batido 0%":       { type: "fixedPackage", packageG: 400,  packageLabel: "tarrina" },
  "atun al natural":              { type: "fixedPackage", packageG: 52,   packageLabel: "lata (pack de 3)" },
  "brocoli":                      { type: "fixedPackage", packageG: 500,  packageLabel: "bolsa (congelado)" },
  "requeson":                     { type: "fixedPackage", packageG: 250,  packageLabel: "tarrina" },
  "sardinas en lata":             { type: "fixedPackage", packageG: 120,  packageLabel: "lata" },
  "caballa en lata":              { type: "fixedPackage", packageG: 125,  packageLabel: "lata" },
  "tempeh":                       { type: "fixedPackage", packageG: 200,  packageLabel: "paquete" },
  "arroz blanco cocido":          { type: "fixedPackage", packageG: 500,  packageLabel: "paquete (en crudo)" },
  "arroz integral cocido":        { type: "fixedPackage", packageG: 500,  packageLabel: "paquete (en crudo)" },
  "pasta cocida":                 { type: "fixedPackage", packageG: 500,  packageLabel: "paquete (en crudo)" },
  "cuscus cocido":                { type: "fixedPackage", packageG: 500,  packageLabel: "paquete (en crudo)" },
  "quinoa cocida":                { type: "fixedPackage", packageG: 500,  packageLabel: "paquete (en crudo)" },
  "garbanzos cocidos":            { type: "fixedPackage", packageG: 400,  packageLabel: "tarrina (cocido)" },
  "lentejas cocidas":             { type: "fixedPackage", packageG: 400,  packageLabel: "tarrina (cocido)" },
  "alubias cocidas":              { type: "fixedPackage", packageG: 400,  packageLabel: "tarrina (cocido)" },
  "tofu firme":                   { type: "fixedPackage", packageG: 250,  packageLabel: "paquete" },
  "skyr natural":                 { type: "fixedPackage", packageG: 450,  packageLabel: "tarrina" },
  "yogur griego ligero":          { type: "fixedPackage", packageG: 400,  packageLabel: "pack (4 x 100g)" },
  "leche semidesnatada":          { type: "fixedPackage", packageG: 1000, packageLabel: "brick" },
  "claras de huevo":              { type: "fixedPackage", packageG: 500,  packageLabel: "brick" },
  "patata cocida":                { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa (cocida al vacío)" },
  "batata":                       { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa" }

  // El resto (pechuga de pollo, muslo de pollo deshuesado, pechuga de
  // pavo, carne picada, ternera magra, lomo de cerdo, salmón, merluza,
  // bacalao) se compra al peso real — mostrar gramos ahí ya es correcto,
  // por eso no tienen entrada.
};

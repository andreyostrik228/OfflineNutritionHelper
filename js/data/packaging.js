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
 * NO cubre necesariamente los 81 ingredient roles de DISH_DB (la cifra "65"
 * que este comentario tenía hasta 2026-08-20d estaba desactualizada desde
 * que el dataset creció a 334 platos — no confiar en un número fijo aquí,
 * ver tests/ingredient-packaging-coverage.test.js para la línea base real,
 * auditada ejecutando resolvePackageInfo() de verdad). Clasificación:
 *
 *   1. spoonable  — condimentos que se miden a cucharadas, no a gramos
 *      (miel, mermelada, mantequilla de cacahuete).
 *
 *   2. perUnit    — se compran y cuentan por unidad (huevos, fruta entera).
 *      gramsPerUnit es una media razonable, no un valor exacto.
 *
 *   3. fixedPackage — se venden en un formato de envase fijo (bote, bolsa,
 *      lata, paquete...) — no puedes comprar "345g de pasta", compras un
 *      paquete de 500g y usas parte. packageG es el tamaño más común en
 *      Mercadona/Hacendado, no un dato exacto de SKU.
 *
 *   4. (sin entrada aquí) — carne/pescado fresco (se compra al peso real,
 *      mostrar gramos ya es realista) y algún ingrediente resuelto por
 *      otra vía (`js/data/real-ingredient-matches.js`, ver
 *      `resolvePackageInfo()` en pricing.js para la cascada completa).
 *
 * Consumido por: js/ui/render.js (renderFoodRow)
 * ─────────────────────────────────────────────────────────────────────────
 */

var PACKAGING_INFO = {

  // ── 1. Ingredientes "de cucharada" ──────────────────────────────────────
  // Aceite de oliva (2026-08-26): se mide a chorro y a cucharadas, nunca
  // pesado. Gramos por cucharada = volumen x densidad (0,916 g/ml): una
  // cucharada de 15 ml son 13,7 g y una cucharadita de 5 ml, 4,6 g. La
  // botella de litro pesa 916 g, no 1000 -- misma conversión que en
  // ingredient-nutrition.js y prices/mercadona.js.
  "aceite de oliva":           { type: "spoonable", tablespoonG: 13.7, teaspoonG: 4.6, packageG: 916, packageLabel: "botella" },
  "miel":                      { type: "spoonable", tablespoonG: 21, teaspoonG: 7,  packageG: 350, packageLabel: "bote" },
  "mermelada light":           { type: "spoonable", tablespoonG: 20, teaspoonG: 7,  packageG: 340, packageLabel: "bote" },
  "mantequilla de cacahuete":  { type: "spoonable", tablespoonG: 16, teaspoonG: 5,  packageG: 350, packageLabel: "bote" },

  // ── 2. Se cuentan por unidad ─────────────────────────────────────────────
  // Los huevos NO se venden sueltos en Mercadona: el formato más pequeño es
  // la media docena y el habitual la docena. "packUnits" fuerza a redondear
  // a cartones enteros -- sin esto la lista de la compra decía "comprar 7
  // huevos" (imposible) y cobraba 7 x el precio de un huevo en vez del
  // cartón. Ver resolvePackageInfo() en pricing.js, rama perUnit.
  "huevos enteros": { type: "perUnit", gramsPerUnit: 63,  unitLabel: "huevo", packUnits: 12, packLabel: "docena (12 huevos)" },
  "platano":         { type: "perUnit", gramsPerUnit: 120, unitLabel: "plátano" },
  "manzana":         { type: "perUnit", gramsPerUnit: 160, unitLabel: "manzana" },
  "naranja":         { type: "perUnit", gramsPerUnit: 200, unitLabel: "naranja" },
  "aguacate":        { type: "perUnit", gramsPerUnit: 180, unitLabel: "aguacate" },
  "pepino":          { type: "perUnit", gramsPerUnit: 300, unitLabel: "pepino" },
  "tomate":          { type: "perUnit", gramsPerUnit: 120, unitLabel: "tomate" },
  // Cebolla y ajo (2026-08-26): se compran por piezas, no pesados. Medias
  // razonables como el resto de este bloque, no valores exactos.
  "cebolla":         { type: "perUnit", gramsPerUnit: 150, unitLabel: "cebolla" },
  "ajo":             { type: "perUnit", gramsPerUnit: 5,   unitLabel: "diente" },
  // Añadidos 2026-08-20d (known issue #7, ver tests/ingredient-packaging-
  // coverage.test.js) — mismo criterio y nivel de precisión (medias
  // razonables, no valores exactos) que el resto de este bloque.
  "calabacin":       { type: "perUnit", gramsPerUnit: 200, unitLabel: "calabacín" },
  "kiwi":            { type: "perUnit", gramsPerUnit: 80,  unitLabel: "kiwi" },
  "pimiento":        { type: "perUnit", gramsPerUnit: 150, unitLabel: "pimiento" },

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
  "batata":                       { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa" },

  // Añadidos 2026-08-20d (known issue #7) -- mismo criterio: tamaño más
  // común en Mercadona/Hacendado, no un dato exacto de SKU.
  "carne picada 5% grasa":        { type: "fixedPackage", packageG: 400,  packageLabel: "bandeja" },
  "pavo picado":                  { type: "fixedPackage", packageG: 400,  packageLabel: "bandeja" },
  "champinones":                  { type: "fixedPackage", packageG: 250,  packageLabel: "bandeja" },
  "coliflor":                     { type: "fixedPackage", packageG: 500,  packageLabel: "bolsa (congelada)" },
  "fresas":                       { type: "fixedPackage", packageG: 400,  packageLabel: "tarrina" },
  "gamba cocida":                 { type: "fixedPackage", packageG: 200,  packageLabel: "bolsa (congelada)" },
  "langostino cocido":            { type: "fixedPackage", packageG: 400,  packageLabel: "bolsa (congelada)" },
  "jamon serrano":                { type: "fixedPackage", packageG: 100,  packageLabel: "paquete (loncheado)" },
  "pan de centeno":               { type: "fixedPackage", packageG: 460,  packageLabel: "barra" },
  "trigo sarraceno cocido":       { type: "fixedPackage", packageG: 500,  packageLabel: "paquete (en crudo)" }

  // El resto -- carne/pescado fresco que se compra al peso real (Bacalao,
  // Conejo, Lomo de cerdo, Lubina, Merluza, Muslo de pollo deshuesado,
  // Pechuga de pavo, Rape, Salmón, Solomillo de ternera, Ternera magra) --
  // mostrar gramos ahí ya es correcto, por eso no tienen entrada aquí (ver
  // clasificación 4 de la cabecera). "Pechuga de pollo" NO está en esta
  // lista pese a ser también carne fresca -- resuelve por otra vía
  // (real-ingredient-matches.js, sizeG:500), confirmado con
  // resolvePackageInfo() real, no por asunción. "Lechuga: Pepino" también
  // queda sin envase -- pero es un nombre de ingrediente CORRUPTO en
  // dishes.js (dos ingredientes concatenados con ":", known issue
  // documentado desde 2026-08-03, sin corregir), no un hueco de
  // packaging.js -- no tiene sentido darle una entrada de envase a una
  // clave que ni siquiera debería existir tal cual. Línea base exacta,
  // auditada ejecutando resolvePackageInfo() real (no una suposición):
  // tests/ingredient-packaging-coverage.test.js.
};

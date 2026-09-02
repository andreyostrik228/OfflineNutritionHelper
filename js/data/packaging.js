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
 *   4. (sin entrada aquí) — lo que se vende A GRANEL (bacalao, rape y
 *      salmón congelados: la API deja `unit_size` a null, se coge lo que
 *      se quiera) y algún ingrediente resuelto por otra vía
 *      (`js/data/real-ingredient-matches.js`, ver `resolvePackageInfo()`
 *      en pricing.js para la cascada completa).
 *
 *      Hasta el 2026-09-02 esta clase se llamaba "carne/pescado fresco" y
 *      se los llevaba a TODOS, con el argumento de que "se compra al peso
 *      real". Solo vale para lo de granel: el lomo de cerdo viene en
 *      bandeja cerrada y no puedes comprar 150 g. Los que sí tienen
 *      unidad de venta pasaron a la clase 3 (ver el bloque 4b abajo).
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
  "miel":                      { type: "fixedPackage", packageG: 1000, packageLabel: "tarro" },  // Tarro 1 kg | 5,00 EUR/kg
  "mermelada light":           { type: "fixedPackage", packageG: 380, packageLabel: "tarro" },  // Tarro 380 g | 4,211 EUR/kg
  "mantequilla de cacahuete":  { type: "fixedPackage", packageG: 500, packageLabel: "tarro" },  // Tarro 500 g | 5,30 EUR/kg
  // Los huevos NO se venden sueltos en Mercadona: el formato más pequeño es
  // la media docena y el habitual la docena. "packUnits" fuerza a redondear
  // a cartones enteros -- sin esto la lista de la compra decía "comprar 7
  // huevos" (imposible) y cobraba 7 x el precio de un huevo en vez del
  // cartón. Ver resolvePackageInfo() en pricing.js, rama perUnit.
  "huevos enteros": { type: "perUnit", gramsPerUnit: 63,  unitLabel: "huevo", packUnits: 12, packLabel: "docena (12 huevos)" },
  "platano":         { type: "fixedPackage", packageG: 154, packageLabel: "plátano" },  // Pieza 154 g aprox.
  "manzana":         { type: "fixedPackage", packageG: 190, packageLabel: "manzana" },  // Pieza 190 g aprox.
  "naranja":         { type: "fixedPackage", packageG: 285, packageLabel: "naranja" },  // Pieza 285 g aprox.
  "aguacate":        { type: "fixedPackage", packageG: 200, packageLabel: "aguacate" },  // Pieza 200 g aprox.
  "pepino":          { type: "fixedPackage", packageG: 204, packageLabel: "pepino" },  // Pieza 204 g aprox.
  "tomate":          { type: "fixedPackage", packageG: 125, packageLabel: "tomate" },  // Pieza 125 g aprox.
  // razonables como el resto de este bloque, no valores exactos.
  "cebolla":         { type: "perUnit", gramsPerUnit: 150, unitLabel: "cebolla" },
  "ajo":             { type: "fixedPackage", packageG: 250, packageLabel: "malla" },  // Malla 250 g | 7,40 EUR/kg -- se compra la malla, no el diente
  // coverage.test.js) — mismo criterio y nivel de precisión (medias
  // razonables, no valores exactos) que el resto de este bloque.
  "calabacin":       { type: "fixedPackage", packageG: 403, packageLabel: "calabacín" },  // Pieza 403 g aprox.
  "kiwi":            { type: "fixedPackage", packageG: 109, packageLabel: "kiwi" },  // Pieza 109 g aprox.
  "pimiento":        { type: "fixedPackage", packageG: 200, packageLabel: "pimiento" },  // Pieza 200 g aprox.
  "almendras":                    { type: "fixedPackage", packageG: 200, packageLabel: "paquete" },  // Paquete 200 g | 11,50 EUR/kg
  "nueces":                       { type: "fixedPackage", packageG: 200, packageLabel: "paquete" },  // Paquete 200 g | 12,50 EUR/kg
  "cacahuetes":                   { type: "fixedPackage", packageG: 400, packageLabel: "paquete" },  // Paquete 400 g | 4,125 EUR/kg
  "queso light":                  { type: "fixedPackage", packageG: 300, packageLabel: "paquete de 12 lonchas" },  // Paquete 12 lonchas (300 g)
  "tortitas de arroz":            { type: "fixedPackage", packageG: 124, packageLabel: "paquete" },  // Paquete 4 packs (124 g) | 8,871 EUR/kg
  "copos de maiz":                { type: "fixedPackage", packageG: 500,  packageLabel: "caja" },
  "granola":                      { type: "fixedPackage", packageG: 400,  packageLabel: "bolsa" },
  "avena":                        { type: "fixedPackage", packageG: 800, packageLabel: "caja" },  // Caja 800 g | 1,625 EUR/kg
  "maiz dulce":                   { type: "fixedPackage", packageG: 420, packageLabel: "pack de 3 (escurrido)" },  // 3 latas x 150 g (140 g escurrido cada una)
  "jamon cocido extra":           { type: "fixedPackage", packageG: 250,  packageLabel: "paquete" },
  "pan integral":                 { type: "fixedPackage", packageG: 350, packageLabel: "barra" },  // Barra 350 g
  "pan blanco":                   { type: "fixedPackage", packageG: 250,  packageLabel: "barra" },
  "salchichas":                   { type: "fixedPackage", packageG: 400, packageLabel: "pack de 2" },  // 2 paquetes x 200 g | 4,75 EUR/kg
  "tortillas de trigo":           { type: "fixedPackage", packageG: 360,  packageLabel: "paquete" },
  "pan de molde integral":        { type: "fixedPackage", packageG: 460,  packageLabel: "paquete" },
  "frutos rojos congelados":      { type: "fixedPackage", packageG: 300, packageLabel: "bolsa" },  // Paquete 300 g | 6,334 EUR/kg
  "mozzarella light":             { type: "fixedPackage", packageG: 125, packageLabel: "bola (peso escurrido)" },  // Paquete 250 g (125 g escurrido)
  "pavo loncheado":               { type: "fixedPackage", packageG: 400, packageLabel: "paquete" },  // Paquete 400 g | 7,625 EUR/kg
  "espinacas":                    { type: "fixedPackage", packageG: 500, packageLabel: "paquete" },  // Paquete 500 g | 2,60 EUR/kg
  "lechuga":                      { type: "fixedPackage", packageG: 250, packageLabel: "bolsa" },  // Paquete 250 g | 3,80 EUR/kg
  "zanahoria":                    { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa" },
  "hummus":                       { type: "fixedPackage", packageG: 240, packageLabel: "tarrina" },  // Tarrina 240 g | 4,375 EUR/kg
  "pina":                         { type: "fixedPackage", packageG: 1830, packageLabel: "piña" },  // Pieza 1,83 kg aprox.
  "verduras congeladas salteado": { type: "fixedPackage", packageG: 600, packageLabel: "bolsa" },  // Salteado de verduras Hacendado ultracongelado, 600 g
  "edamame":                      { type: "fixedPackage", packageG: 500, packageLabel: "bolsa" },  // Paquete 500 g | 3,50 EUR/kg
  "queso fresco batido 0%":       { type: "fixedPackage", packageG: 500, packageLabel: "tarrina" },  // Tarrina 500 g
  "atun al natural":              { type: "fixedPackage", packageG: 360, packageLabel: "pack de 6 (escurrido)" },  // 6 latas x 80 g (60 g escurrido cada una)
  "brocoli":                      { type: "fixedPackage", packageG: 420, packageLabel: "brócoli" },  // Pieza 420 g aprox.
  "requeson":                     { type: "fixedPackage", packageG: 200, packageLabel: "tarrina" },  // Tarrina 200 g | 5,00 EUR/kg
  "sardinas en lata":             { type: "fixedPackage", packageG: 168, packageLabel: "pack de 2 (escurrido)" },  // 2 latas x 117 g (84 g escurrido cada una)
  "caballa en lata":              { type: "fixedPackage", packageG: 164, packageLabel: "pack de 2 (escurrido)" },  // 2 latas x 120 g (82 g escurrido cada una)
  // ⚠️ EL TAMAÑO VA EN GRAMOS **COCIDOS**, igual que el precio (2026-09-02)
  //
  // Estos roles se miden COCIDOS en dishes.js y su precio en
  // prices/mercadona.js es €/100 g COCIDO (paquete seco ÷ factor de
  // cocción). El tamaño de envase tenía que estar en la MISMA unidad y no
  // lo estaba: decía 500 g con la etiqueta "paquete (en crudo)" -- o sea,
  // gramos CRUDOS -- pero resolvePurchaseCost lo compara contra gramos
  // COCIDOS. Resultado que reportó el usuario: "comprar 650 g de arroz,
  // gastarás 0,42 €", cuando 650 g cocidos son 232 g de arroz seco y en la
  // tienda eso es UN paquete de 1 kg a 1,20 €. El plan inventaba paquetes
  // de medio kilo de arroz ya cocido, que no existen.
  //
  // Es la misma clase de error que el aceite guardado por 100 ml y usado
  // como por 100 g (ver ingredient-nutrition.js): dos archivos correctos
  // por separado, midiendo en unidades distintas.
  //
  // Comprobación: precio/100 g × estos gramos = el precio REAL del paquete
  // en la tienda, al céntimo. Arroz 0,0429×2800/100 = 1,20 €; pasta
  // 0,05×2300/100 = 1,15 €; quinoa 0,1963×1350/100 = 2,65 €. Si algún día
  // no cuadra, es que el precio o el factor están mal.
  "arroz blanco cocido":          { type: "fixedPackage", packageG: 2800, packageLabel: "paquete de 1 kg (rinde 2,8 kg cocido)" },
  "arroz integral cocido":        { type: "fixedPackage", packageG: 2800, packageLabel: "paquete de 1 kg (rinde 2,8 kg cocido)" },
  "pasta cocida":                 { type: "fixedPackage", packageG: 2300, packageLabel: "paquete de 1 kg (rinde 2,3 kg cocido)" },
  "cuscus cocido":                { type: "fixedPackage", packageG: 2800, packageLabel: "paquete de 1 kg (rinde 2,8 kg cocido)" },
  "quinoa cocida":                { type: "fixedPackage", packageG: 1350, packageLabel: "paquete de 500 g (rinde 1,35 kg cocido)" },
  // Las legumbres NO siguen esa regla: las recetas dicen literalmente "de
  // bote" ("enjuaga los garbanzos de bote hasta que el agua salga clara"),
  // así que se compran YA COCIDAS y el envase son los 400 g ESCURRIDOS que
  // declara Mercadona -- su reference_price de estos botes va por peso
  // escurrido, comprobado: 0,80 €/0,400 kg = 2,00 €/kg, el mismo número que
  // publica la ficha.
  "garbanzos cocidos":            { type: "fixedPackage", packageG: 400,  packageLabel: "bote (peso escurrido)" },
  "lentejas cocidas":             { type: "fixedPackage", packageG: 400,  packageLabel: "bote (peso escurrido)" },
  "alubias cocidas":              { type: "fixedPackage", packageG: 400,  packageLabel: "bote (peso escurrido)" },
  "tofu firme":                   { type: "fixedPackage", packageG: 275, packageLabel: "paquete (escurrido)" },  // Paquete 400 g (275 g escurrido)
  "skyr natural":                 { type: "fixedPackage", packageG: 450,  packageLabel: "tarrina" },
  "yogur griego ligero":          { type: "fixedPackage", packageG: 750, packageLabel: "pack de 6" },  // 6 ud. x 125 g | 1,934 EUR/kg
  "leche semidesnatada":          { type: "fixedPackage", packageG: 1000, packageLabel: "brick" },
  "claras de huevo":              { type: "fixedPackage", packageG: 1000, packageLabel: "botella" },  // Botella 1 L | 2,85 EUR/L
  "patata cocida":                { type: "fixedPackage", packageG: 1000, packageLabel: "bolsa (cocida al vacío)" },
  "batata":                       { type: "fixedPackage", packageG: 424, packageLabel: "batata" },  // Pieza 424 g aprox.
  // común en Mercadona/Hacendado, no un dato exacto de SKU.
  "carne picada mixta":           { type: "fixedPackage", packageG: 1000, packageLabel: "bandeja" },  // Bandeja 1 kg | 8,00 EUR/kg
  "carne picada 5% grasa":        { type: "fixedPackage", packageG: 1000, packageLabel: "bandeja" },  // Bandeja 1 kg | 10,80 EUR/kg
  "champinones":                  { type: "fixedPackage", packageG: 300, packageLabel: "bandeja" },  // Bandeja 300 g
  "coliflor":                     { type: "fixedPackage", packageG: 1040, packageLabel: "coliflor" },  // Pieza 1,04 kg aprox.
  "fresas":                       { type: "fixedPackage", packageG: 470, packageLabel: "bandeja" },  // Bandeja 470 g aprox.
  "gamba cocida":                 { type: "fixedPackage", packageG: 300, packageLabel: "bandeja" },  // Bandeja 300 g | 27,667 EUR/kg
  "langostino cocido":            { type: "fixedPackage", packageG: 600, packageLabel: "bandeja" },  // Bandeja 600 g aprox. | 10,75 EUR/kg
  "jamon serrano":                { type: "fixedPackage", packageG: 190, packageLabel: "paquete" },  // Paquete 190 g aprox.
  "pan de centeno":               { type: "fixedPackage", packageG: 500, packageLabel: "hogaza" },  // 1 ud. (500 g) | 3,40 EUR/kg

  // El resto -- carne/pescado fresco que se compra al peso real (Bacalao,
  // Conejo, Lomo de cerdo, Lubina, Merluza, Muslo de pollo deshuesado,
  // Pechuga de pavo, Rape, Salmón, Solomillo de ternera, Ternera magra) --
  // mostrar gramos ahí ya es correcto, por eso no tienen entrada aquí (ver
  // clasificación 4 de la cabecera). "Pechuga de pollo" NO está en esta
  // lista pese a ser también carne fresca -- resuelve por otra vía
  // (real-ingredient-matches.js, sizeG:500), confirmado con
  // resolvePackageInfo() real, no por asunción.
  //
  // OBSOLETO desde el 2026-09-02: de esa lista solo siguen sin envase
  // bacalao, rape y salmón, que son los tres que Mercadona vende a granel.
  // Los demás tienen bandeja y están en el bloque 4b de más abajo. El
  // párrafo se deja porque explica de dónde venía la decisión anterior. "Lechuga: Pepino" también
  // queda sin envase -- pero es un nombre de ingrediente CORRUPTO en
  // dishes.js (dos ingredientes concatenados con ":", known issue
  // documentado desde 2026-08-03, sin corregir), no un hueco de
  // packaging.js -- no tiene sentido darle una entrada de envase a una
  // clave que ni siquiera debería existir tal cual. Línea base exacta,
  // auditada ejecutando resolvePackageInfo() real (no una suposición):
  // tests/ingredient-packaging-coverage.test.js.
  // ── 4b. Carne y pescado EN BANDEJA (2026-09-02) ──────────────────────
  // Hasta hoy toda la carne y el pescado fresco caian en la clase 4 (sin
  // entrada), con el argumento de que "se compra al peso real". Eso solo
  // es cierto de lo que se vende A GRANEL. El lomo de cerdo viene en una
  // bandeja cerrada de ~638 g: nadie compra 150 g, compra la bandeja y le
  // sobra. Sin envase el planificador cobraba solo la parte usada y el
  // usuario se encontraba otro precio en la tienda.
  //
  // El criterio no es una opinion: si la API de Mercadona declara
  // unit_size, hay una unidad de venta y por tanto envase; si lo deja a
  // null (bacalao, rape y salmon congelados) se vende a granel y se queda
  // sin entrada, que es lo correcto.
  //
  // packageG es la MEDIA de los cortes que promedia el precio, para que
  // peso y precio hablen del mismo conjunto de productos. Los miembros de
  // cada media estan escritos en el comentario de prices/mercadona.js.
  "conejo":                      { type: "fixedPackage", packageG: 980, packageLabel: "bandeja (media de 2 cortes)" },  // media de 2 cortes reales, 9 EUR/kg
  "lomo de cerdo":               { type: "fixedPackage", packageG: 638, packageLabel: "bandeja (media de 5 cortes)" },  // media de 5 cortes reales, 6,86 EUR/kg
  "lubina":                      { type: "fixedPackage", packageG: 440, packageLabel: "bandeja (media de 5 cortes)" },  // media de 5 cortes reales, 9,95 EUR/kg
  "merluza":                     { type: "fixedPackage", packageG: 994, packageLabel: "bandeja (media de 6 cortes)" },  // media de 6 cortes reales, 11,5 EUR/kg
  "muslo de pollo deshuesado":   { type: "fixedPackage", packageG: 568, packageLabel: "bandeja (media de 4 cortes)" },  // media de 4 cortes reales, 7,263 EUR/kg
  "pechuga de pavo":             { type: "fixedPackage", packageG: 590, packageLabel: "bandeja" },  // Filetes pechuga de pavo, 8,75 EUR/kg
  "pechuga de pollo":            { type: "fixedPackage", packageG: 558, packageLabel: "bandeja (media de 4 cortes)" },  // media de 4 cortes reales, 7,975 EUR/kg
  "solomillo de ternera":        { type: "fixedPackage", packageG: 300, packageLabel: "bandeja" },  // Solomillo de vacuno añojo para plancha, 40,7 EUR/kg
  "ternera magra":               { type: "fixedPackage", packageG: 533, packageLabel: "bandeja (media de 3 cortes)" },  // media de 3 cortes reales, 17,467 EUR/kg
};

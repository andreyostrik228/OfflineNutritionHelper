/**
 * js/data/ingredient-nutrition.js
 * ─────────────────────────────────────────────────────────────────────────
 * KBJU (kcal/protein/carbs/fat) REAL por 100g, uno por cada uno de los 81
 * ingredient roles que aparecen en js/data/dishes.js — la fuente de verdad
 * que reemplaza el reparto del total del plato por cuota de gramos (ver
 * "Corrección de macros por ingrediente" en STATE.md, 2026-08-13d, y el
 * bug real que la motivó: "Plátano" mostrando proteína/grasa del
 * cacahuete de su mismo plato).
 *
 * ── Procedencia — NO es una resolución nueva, es una PROMOCIÓN a producción ──
 * Cada entrada `resolved:true` viene EXACTAMENTE de `poc/data/
 * ingredient-rules-full.js` (auditoría ya hecha, verificada uno a uno a
 * mano contra `js/data/real-products.js`, con test de consistencia propio
 * — `poc/tests/ingredient-coverage.test.js`, 9 aserciones, sigue pasando).
 * Este archivo transcribe esos mismos 50 roles resueltos + 31 sin
 * resolver, solo cambia la clave (normalizada, vía normalizeIngredientKey
 * de pricing.js, para poder buscar igual que pricing.js/packaging.js/
 * pantry.js) — nunca se re-derivó ni se re-emparejó nada por similitud de
 * texto aquí. Deliberado, pedido explícitamente: "no подставляй похожие
 * продукты автоматически" — cero coincidencias nuevas, solo las ya
 * verificadas a mano.
 *
 * ── resolved:false — NUNCA se inventa un valor ──────────────────────────
 * Los 31 roles sin match fiable (fruta/verdura fresca sin nutrición
 * verificada en el catálogo, producto que no existe, medido en un estado
 * distinto al que pide dishes.js —seco vs. cocido—, subespecie distinta
 * —plátano macho vs. de mesa—...) quedan `resolved:false` con `reason`/
 * `detail` — el código que consuma esto NUNCA debe sustituir por un
 * número aproximado. Ver resolveIngredientNutrition() en
 * js/core/nutrition.js para cómo se usa esto en la práctica (reparto del
 * remanente entre los ingredientes sin resolver de un mismo plato, nunca
 * un valor inventado por ingrediente suelto).
 *
 * Consumido por: js/core/nutrition.js (resolveIngredientNutrition)
 * ─────────────────────────────────────────────────────────────────────────
 */

var INGREDIENT_NUTRITION = {

  // ── Cebolla y ajo ───────────────────────────────────────────────────
  // Añadidos 2026-08-26 como roles con `resolved:false` (el catálogo de
  // Mercadona no trae nutrición de cebolla/ajo crudos; "Cebollas rojas"
  // declaraba 93 kcal contra 18 por Atwater, dato roto). RESUELTOS
  // 2026-08-31 desde USDA FoodData Central (SR Legacy), como el resto de
  // esta tanda. Precio y envase reales en prices/mercadona.js y packaging.js.
  "cebolla": { resolved: true, kcal: 40, protein: 1.1, carbs: 9.34, fat: 0.1, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 170000, fdcDescription: "Onions, raw", displayName: "Cebolla" },

  "ajo": { resolved: true, kcal: 149, protein: 6.36, carbs: 33.1, fat: 0.5, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169230, fdcDescription: "Garlic, raw", note: "Atwater sobreestima ~13 kcal por los fructanos del ajo; valor USDA correcto.", displayName: "Ajo" },

  // ── Aceite de oliva (añadido 2026-08-26) ─────────────────────────────
  // Añadido porque la cocina española no existe sin él: sin este role no
  // se puede escribir una tortilla de patatas, un pollo al ajillo ni un
  // gazpacho con datos reales.
  //
  // ⚠️ CONVERTIDO DE POR 100 ML A POR 100 G. El registro de Mercadona
  // ("Aceite de oliva virgen extra Hacendado", EAN 8402001001185) declara
  // 822 kcal y 91 g de grasa, pero POR 100 ML -- como manda la etiqueta
  // europea para líquidos. Este archivo es POR 100 G. Guardar 822 tal cual
  // habría infravalorado el aceite un 9% en todos los platos.
  //
  // Conversión con la densidad del aceite de oliva, 0,916 g/ml:
  //     kcal   822 / 0,916 = 897
  //     grasa   91 / 0,916 = 99,3 g
  //
  // POR QUÉ SE SABE QUE HABÍA QUE CONVERTIR: el aceite es grasa
  // prácticamente pura, así que su contenido graso por 100 g TIENE que
  // rondar los 99-100 g. 91 g por 100 g dejaría un 9% de la botella siendo
  // algo que no es grasa, y en un aceite no hay nada más: ni agua, ni
  // proteína, ni azúcar. Es imposible. Leído como POR 100 ML sí cuadra,
  // porque 100 ml de aceite pesan 91,6 g. Esa imposibilidad química es el
  // argumento entero, y se basta solo.
  //
  // ⚠️ NO INTENTES CONFIRMAR ESTO CON ATWATER, no puede. Atwater es una
  // relación LINEAL entre kcal y macros, así que dividir kcal y grasa por
  // la misma densidad la deja intacta: el ajuste es 0,36% antes de
  // convertir y 0,36% después, idéntico hasta el epsilon de la máquina, y
  // sale igual dividiendo por 2, por 10 o por 1000. Atwater es invariante
  // de escala y por tanto CIEGO a los errores de unidad: "pasa" siempre,
  // con el dato bien y con el dato mal. Quien use este archivo como
  // ejemplo y aplique la prueba de Atwater a otro líquido -- leche, un
  // batido, una salsa -- la verá pasar y podrá acabar convirtiendo algo
  // que no había que convertir. El criterio válido es el de composición
  // (¿de qué está hecho esto?), nunca el de coherencia interna.
  //
  // (Es la otra cara de una limitación que ya nos mordió: Atwater tampoco
  // ve el ETANOL, y por eso el control puso en cuarentena cervezas y vinos
  // que estaban bien -- sus kcal vienen del alcohol, 7 kcal/g, que la
  // fórmula proteína/carbos/grasa no mira. Misma ceguera, síntoma opuesto.)
  //
  // Es una DERIVACIÓN documentada, no un valor inventado: el registro de
  // origen queda abajo entero para poder rehacerla o rechazarla.
  "aceite de oliva": {
    resolved: true,
    kcal: 897,
    protein: 0,
    carbs: 0,
    fat: 99.3,
    productName: "Aceite de oliva virgen extra Hacendado",
    ean: "8402001001185",
    matchMethod: "name+conversion_densidad",
    sourcePer100ml: { kcal: 822, protein: 0, carbs: 0, fat: 91 },
    densityGPerMl: 0.916,
    displayName: "Aceite de oliva"
  },
  "aguacate": { resolved: true, kcal: 160, protein: 2, carbs: 8.53, fat: 14.7, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 171705, fdcDescription: "Avocados, raw, all commercial varieties", displayName: "Aguacate" },
  "almendras": { resolved: true, kcal: 628, protein: 23.3, carbs: 3, fat: 57, productName: "Almendra tostada Hacendado 0% sal añadida con piel", ean: "8480000340146", matchMethod: "exact_ean", displayName: "Almendras" },
  "alubias cocidas": { resolved: true, kcal: 83, protein: 5.8, carbs: 10.7, fat: 0.4, productName: "Alubia cocida blanca Hacendado", ean: "8480000260192", matchMethod: "exact_ean", displayName: "Alubias cocidas" },
  // 2026-09-02: era la etiqueta de "Arroz cocido redondo Sabroz" (bolsa de
  // microondas, 148 kcal y 2,3 g de grasa porque LLEVA ACEITE AÑADIDO). El
  // dato era correcto para ESE producto, pero el precio de este rol sale de
  // arroz SECO a granel (0,043 EUR/100 g cocido) y esa bolsa cuesta 0,42 --
  // diez veces más. Los dos archivos describían comidas distintas: se
  // cobraba arroz hervido en casa y se contaban las calorías de un
  // preparado con aceite. Ahora los dos dicen lo mismo: arroz blanco que
  // cueces tú.
  "arroz blanco cocido": { resolved: true, kcal: 130, protein: 2.69, carbs: 28.17, fat: 0.28, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169757, fdcDescription: "Rice, white, long-grain, regular, unenriched, cooked without salt", note: "Por 100 g COCIDO, como mide dishes.js. Sin enriquecer: en España el arroz no se fortifica.", displayName: "Arroz blanco cocido" },
  "arroz integral cocido": { resolved: true, kcal: 123, protein: 2.74, carbs: 25.6, fat: 0.97, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169704, fdcDescription: "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)", note: "Valor por 100 g COCIDO, como mide dishes.js.", displayName: "Arroz integral cocido" },
  "atun al natural": { resolved: true, kcal: 98.75, protein: 21, carbs: 0.9, fat: 1.2, productName: "Atún claro al natural Hacendado", ean: "8480000180186", matchMethod: "exact_ean", displayName: "Atún al natural" },
  "avena": { resolved: true, kcal: 379, protein: 13.2, carbs: 67.7, fat: 6.52, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 173904, fdcDescription: "Cereals, oats, regular and quick, not fortified, dry", note: "Avena seca. La busqueda ingenua devuelve 'Oil, oat' (884 kcal); este es el registro de copos secos sin fortificar.", displayName: "Avena" },
  "bacalao": { resolved: true, kcal: 82, protein: 17.8, carbs: 0, fat: 0.67, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 171955, fdcDescription: "Fish, cod, Atlantic, raw", displayName: "Bacalao" },
  // 2026-09-02: era "Batatas para microondas" (60 kcal, heredado sin EAN
  // verificable), mientras el precio ya es de batata FRESCA a peso. Batata
  // cruda son 86 kcal. OJO al resolver esto: buscar "Sweet potato, raw" en
  // USDA devuelve PRIMERO "Sweet Potato puffs, frozen" -- otro alimento
  // distinto. El registro correcto se eligió a mano.
  "batata": { resolved: true, kcal: 86, protein: 1.57, carbs: 20.12, fat: 0.05, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168482, fdcDescription: "Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)", note: "Cruda: dishes.js pesa la batata antes de asarla, igual que el resto de verdura.", displayName: "Batata" },
  "brocoli": { resolved: true, kcal: 34, protein: 2.82, carbs: 6.64, fat: 0.37, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 170379, fdcDescription: "Broccoli, raw", displayName: "Brócoli" },
  "caballa en lata": { resolved: true, kcal: 156, protein: 23.2, carbs: 0, fat: 6.3, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 175121, fdcDescription: "Fish, mackerel, jack, canned, drained solids", displayName: "Caballa en lata" },
  "cacahuetes": { resolved: true, kcal: 618, protein: 24, carbs: 13, fat: 50.4, productName: "Cacahuete tostado Hacendado 0% sal añadida", ean: "8480000340313", matchMethod: "exact_ean", displayName: "Cacahuetes" },
  "calabacin": { resolved: true, kcal: 17, protein: 1.21, carbs: 3.11, fat: 0.32, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169291, fdcDescription: "Squash, summer, zucchini, includes skin, raw", displayName: "Calabacín" },
  "carne picada 5% grasa": { resolved: true, kcal: 137, protein: 21.4, carbs: 0, fat: 5, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 171790, fdcDescription: "Beef, ground, 95% lean meat / 5% fat, raw", displayName: "Carne picada 5% grasa" },
  "champinones": { resolved: true, kcal: 21, protein: 1.56, carbs: 0.83, fat: 0.06, productName: "Champiñones laminados Hacendado", ean: "8480000166180", matchMethod: "name", displayName: "Champiñones" },
  "claras de huevo": { resolved: true, kcal: 50, protein: 11, carbs: 0.5, fat: 0.1, productName: "Claras de huevo líquidas pasteurizadas", ean: "8411384009855", matchMethod: "name", displayName: "Claras de huevo" },
  "coliflor": { resolved: true, kcal: 19, protein: 1.6, carbs: 2.1, fat: 0, productName: "Coliflor", ean: "2105480692207", matchMethod: "name", displayName: "Coliflor" },
  "conejo": { resolved: true, kcal: 136, protein: 20, carbs: 0, fat: 5.55, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 172521, fdcDescription: "Game meat, rabbit, domesticated, composite of cuts, raw", displayName: "Conejo" },
  "copos de maiz": { resolved: true, kcal: 384, protein: 5.9, carbs: 88, fat: 0.91, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 174648, fdcDescription: "Cereals ready-to-eat, RALSTON Corn Flakes", note: "SR Legacy no tiene copos de maíz de marca blanca; rango típico 357-384 kcal.", displayName: "Copos de maíz" },
  "cuscus cocido": { resolved: true, kcal: 112, protein: 3.79, carbs: 23.2, fat: 0.16, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169700, fdcDescription: "Couscous, cooked", note: "Valor por 100 g COCIDO.", displayName: "Cuscús cocido" },
  "edamame": { resolved: true, kcal: 121, protein: 11.9, carbs: 8.91, fat: 5.2, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168411, fdcDescription: "Edamame, frozen, prepared", displayName: "Edamame" },
  "espinacas": { resolved: true, kcal: 28, protein: 3.4, carbs: 0.9, fat: 0.6, productName: "Espinacas baby lavadas", ean: "8425779044451", matchMethod: "legacy", displayName: "Espinacas" },
  "fresas": { resolved: true, kcal: 32, protein: 0.67, carbs: 7.68, fat: 0.3, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 167762, fdcDescription: "Strawberries, raw", displayName: "Fresas" },
  "frutos rojos congelados": { resolved: true, kcal: 56, protein: 1.15, carbs: 12.6, fat: 0.81, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168209, fdcDescription: "Raspberries, frozen, red, unsweetened", note: "No hay registro de 'frutos rojos variados'; frambuesa como representante (fresa congelada ~35, mora ~64).", displayName: "Frutos rojos congelados" },
  "gamba cocida": { resolved: true, kcal: 101, protein: 22, carbs: 0, fat: 2, productName: "Gamba cocida", ean: "8402001049279", matchMethod: "name", displayName: "Gamba cocida" },
  "garbanzos cocidos": { resolved: true, kcal: 90, protein: 5.5, carbs: 9.5, fat: 2.2, productName: "Garbanzo cocido Hacendado", ean: "8480000260291", matchMethod: "exact_ean", displayName: "Garbanzos cocidos" },
  "granola": { resolved: true, kcal: 489, protein: 13.7, carbs: 53.9, fat: 24.3, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 171646, fdcDescription: "Cereals ready-to-eat, granola, homemade", note: "La receta de granola varía mucho; la de supermercado ronda 430-490 kcal.", displayName: "Granola" },
  "huevos enteros": { resolved: true, kcal: 150, protein: 12.5, carbs: 0.5, fat: 11.1, productName: "Huevos de gallinas camperas", ean: "8410603125215", matchMethod: "name", displayName: "Huevos enteros" },
  "hummus": { resolved: true, kcal: 237, protein: 7.78, carbs: 15, fat: 17.8, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 174289, fdcDescription: "Hummus, commercial", displayName: "Hummus" },
  "jamon cocido extra": { resolved: true, kcal: 126, protein: 18, carbs: 1.4, fat: 5.4, productName: "Jamón cocido extra Noel lonchas", ean: "8410783320813", matchMethod: "exact_ean", displayName: "Jamón cocido extra" },
  "jamon serrano": { resolved: true, kcal: 247.8, protein: 33.5, carbs: 1, fat: 12.2, productName: "Jamón serrano lonchas Incarlopsa", ean: "8421384009724", matchMethod: "exact_ean", displayName: "Jamón serrano" },
  "kiwi": { resolved: true, kcal: 61, protein: 1.14, carbs: 14.7, fat: 0.52, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168153, fdcDescription: "Kiwifruit, green, raw", displayName: "Kiwi" },
  "langostino cocido": { resolved: true, kcal: 98, protein: 22, carbs: 0, fat: 1.1, productName: "Langostino cocido", ean: "8402001025433", matchMethod: "name", displayName: "Langostino cocido" },
  "leche semidesnatada": { resolved: true, kcal: 49, protein: 3.2, carbs: 4.7, fat: 1.6, productName: "Leche semidesnatada Hacendado", ean: "8402001002106", matchMethod: "legacy", displayName: "Leche semidesnatada" },
  // 2026-09-02: el rol corrupto "lechuga pepino" ya no existe. Venía de un
  // BUG en dishes.js -- el `name` del ingrediente era literalmente
  // "Lechuga: Pepino", dos alimentos pegados con ":", así que ningún
  // producto podía casar y el ingrediente vivía del remanente. La auditoría
  // de 2026-08-31 lo dejó documentado pero sin tocar porque arreglarlo
  // exigía editar dishes.js. Arreglado ahora: en "Wrap de pollo con lechuga
  // y tomate" pasa a ser "Lechuga" (el nombre del plato manda; no menciona
  // pepino), y este rol nuevo lo resuelve.
  "lechuga": { resolved: true, kcal: 14, protein: 0.9, carbs: 2.97, fat: 0.14, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169248, fdcDescription: "Lettuce, iceberg (includes crisphead types), raw", displayName: "Lechuga" },
  "lentejas cocidas": { resolved: true, kcal: 89, protein: 8.2, carbs: 10.7, fat: 0.4, productName: "Lenteja cocida Hacendado", ean: "8480000053329", matchMethod: "exact_ean", displayName: "Lentejas cocidas" },
  "lomo de cerdo": { resolved: true, kcal: 152, protein: 18, carbs: 0, fat: 8.9, productName: "Lomo de cerdo trozo", ean: "2105100045901", matchMethod: "name", displayName: "Lomo de cerdo" },
  "lubina": { resolved: true, kcal: 97, protein: 18.4, carbs: 0, fat: 2, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 175142, fdcDescription: "Fish, sea bass, mixed species, raw", note: "Lubina europea aproximada al registro USDA de 'sea bass, mixed species'.", displayName: "Lubina" },
  "mantequilla de cacahuete": { resolved: true, kcal: 608, protein: 30, carbs: 12, fat: 47, productName: "Crema de cacahuete 100% Hacendado", ean: "8480000168832", matchMethod: "name", displayName: "Mantequilla de cacahuete" },
  "manzana": { resolved: true, kcal: 51.8, protein: 0.5, carbs: 11.2, fat: 0.5, productName: "Manzanas Golden", ean: "2105400032694", matchMethod: "name", displayName: "Manzana" },
  "maiz dulce": { resolved: true, kcal: 75, protein: 2.6, carbs: 9.3, fat: 2.3, productName: "Maíz dulce Hacendado", ean: "8480000167125", matchMethod: "name", displayName: "Maíz dulce" },
  "merluza": { resolved: true, kcal: 77, protein: 17, carbs: 0, fat: 0.2, productName: "Merluza a rodajas", ean: "8480000826107", matchMethod: "name", displayName: "Merluza" },
  "mermelada light": { resolved: true, kcal: 151, protein: 0, carbs: 37.6, fat: 0.1, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 167706, fdcDescription: "Jams, preserves, marmalade, reduced sugar", note: "La mermelada reducida en azúcar varía según marca y edulcorante.", displayName: "Mermelada light" },
  "miel": { resolved: true, kcal: 333, protein: 0.4, carbs: 83, fat: 0, productName: "Miel de naranjo Hacendado", ean: "8480000154484", matchMethod: "legacy", displayName: "Miel" },
  "mozzarella light": { resolved: true, kcal: 152.8, protein: 17, carbs: 1, fat: 9, productName: "Mozzarella fresca light de vaca Hacendado", ean: "8480000512307", matchMethod: "exact_ean", displayName: "Mozzarella light" },
  // 2026-09-02: declaraba 88 kcal y 1,8 g de grasa para MUSLO CON PIEL.
  // Imposible: la piel sola ya aporta más grasa que eso (muslo con piel son
  // ~221 kcal y ~16,6 g). Pasaba Atwater (18x4 + 0,5x4 + 1,8x9 = 90 ≈ 88),
  // que es justo el motivo por el que Atwater no basta: mide coherencia
  // interna, no si el número describe el alimento. Su EAN no existe en
  // OpenFoodFacts (404) y Mercadona no publica tabla nutricional para carne
  // fresca, así que el valor no tenía ninguna fuente comprobable. Sustituido
  // por el registro genérico de USDA.
  "muslo de pollo deshuesado": { resolved: true, kcal: 221, protein: 16.52, carbs: 0.25, fat: 16.61, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 172385, fdcDescription: "Chicken, broilers or fryers, thigh, meat and skin, raw", note: "CON piel, que es como lo vende Mercadona ('Muslos de pollo deshuesados con piel').", displayName: "Muslo de pollo deshuesado" },
  "naranja": { resolved: true, kcal: 45.5, protein: 0.75, carbs: 8.03, fat: 0.5, productName: "Naranja de mesa", ean: "2105456032358", matchMethod: "name", displayName: "Naranja" },
  "nueces": { resolved: true, kcal: 579, protein: 21, carbs: 10, fat: 50, productName: "Nuez natural Hacendado pelada", ean: "8402001001345", matchMethod: "name", displayName: "Nueces" },
  "pan de centeno": { resolved: true, kcal: 254, protein: 9.8, carbs: 39, fat: 5.3, productName: "Pan de molde con 55% centeno Hacendado", ean: "8402001037870", matchMethod: "exact_ean", displayName: "Pan de centeno" },
  "pan de molde integral": { resolved: true, kcal: 248.28, protein: 8.62, carbs: 41.38, fat: 3.79, productName: "Pan de molde 100% integral Hacendado", ean: "8402001024184", matchMethod: "legacy", displayName: "Pan de molde integral" },
  "pan integral": { resolved: true, kcal: 244, protein: 10.7, carbs: 42.7, fat: 1.6, productName: "Pan integral trigo 100%", ean: "8402001030161", matchMethod: "name", displayName: "Pan integral" },
  "pasta cocida": { resolved: true, kcal: 158, protein: 5.8, carbs: 30.9, fat: 0.93, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168928, fdcDescription: "Pasta, cooked, unenriched, without added salt", note: "Valor por 100 g COCIDA.", displayName: "Pasta cocida" },
  // 2026-09-02: 53 kcal salía de "Patatas cocidas Hacendado" (envasadas al
  // vacío), pero el precio de este rol es de patata FRESCA a 1,90 EUR/kg,
  // es decir: la cueces tú. Patata hervida son 86 kcal. Mismo caso que el
  // arroz: cada archivo describía un producto distinto.
  "patata cocida": { resolved: true, kcal: 86, protein: 1.71, carbs: 20.01, fat: 0.1, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 170440, fdcDescription: "Potatoes, boiled, cooked without skin, flesh, without salt", note: "Por 100 g YA COCIDA, como mide dishes.js.", displayName: "Patata cocida" },
  "pavo loncheado": { resolved: true, kcal: 53.3, protein: 12.8, carbs: 6.8, fat: 0.5, productName: "Maxi pavo Hacendado finas lonchas", ean: "8480000224309", matchMethod: "legacy", displayName: "Pavo loncheado" },
  "pavo picado": { resolved: true, kcal: 148, protein: 19.7, carbs: 0, fat: 7.66, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 171505, fdcDescription: "Turkey, ground, raw", displayName: "Pavo picado" },
  "pechuga de pavo": { resolved: true, kcal: 113, protein: 23.8, carbs: 0, fat: 2, productName: "Filetes pechuga de pavo", ean: "2105100027945", matchMethod: "name", displayName: "Pechuga de pavo" },
  "pechuga de pollo": { resolved: true, kcal: 108, protein: 22, carbs: 0.5, fat: 1.8, productName: "Pechugas enteras de pollo", ean: "2105100037241", matchMethod: "exact_ean", displayName: "Pechuga de pollo" },
  "pepino": { resolved: true, kcal: 15, protein: 0.65, carbs: 3.63, fat: 0.11, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168409, fdcDescription: "Cucumber, with peel, raw", displayName: "Pepino" },
  "pimiento": { resolved: true, kcal: 32, protein: 1.2, carbs: 5.4, fat: 0.6, productName: "Pimiento rojo", ean: "2105470693108", matchMethod: "name", displayName: "Pimiento" },
  // 2026-09-02: salía de "Piña natural a rodajas" (envasada, 0,655 EUR/100 g)
  // y el precio es de piña FRESCA entera (0,20). Poca diferencia nutricional
  // (58 vs 50 kcal), pero no hay motivo para que los dos archivos nombren
  // productos distintos.
  "pina": { resolved: true, kcal: 50, protein: 0.54, carbs: 13.12, fat: 0.12, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 169124, fdcDescription: "Pineapple, raw, all varieties", displayName: "Piña" },
  "platano": { resolved: true, kcal: 89, protein: 1.09, carbs: 22.8, fat: 0.33, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 173944, fdcDescription: "Bananas, raw", note: "Plátano de mesa, NO plátano macho (plantain, ~122 kcal).", displayName: "Plátano" },
  "queso fresco batido 0%": { resolved: true, kcal: 46, protein: 8, carbs: 3.5, fat: 0.5, productName: "Queso fresco batido desnatado 0% MG Hacendado", ean: "8480000510716", matchMethod: "exact_ean", displayName: "Queso fresco batido 0%" },
  // 2026-09-02: estaba emparejado con "Queso fresco Burgos desnatado 0% MG"
  // (67 kcal, 0,4 g de grasa). El dato era correcto para ESE producto, pero
  // el rol no es queso fresco: los platos que lo usan son "Tostadas con pavo
  // y queso LONCHAS" y "Wrap de pavo con queso y lechuga" -- queso de
  // lonchas. Poner queso de Burgos ahí infravaloraba el plato a la mitad.
  // Ahora apunta al producto que se compra de verdad, y el precio del rol
  // (prices/mercadona.js) es el de ese mismo producto.
  "queso light": { resolved: true, kcal: 267, protein: 27, carbs: 1.6, fat: 17, productName: "Queso lonchas cremoso light de vaca Hacendado", ean: "8480000505460", matchMethod: "exact_ean", note: "Etiqueta verificada por EAN en OpenFoodFacts (aparece como 'Havarti light'). Atwater 267,4 vs 267 declaradas.", displayName: "Queso light" },
  // 2026-09-02: venía de la bolsa cocida Sabroz (0,58 EUR/100 g) mientras
  // el precio es de quinoa SECA a granel (0,196 cocida). Mismo desajuste que
  // arroz y patata.
  "quinoa cocida": { resolved: true, kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.92, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 168917, fdcDescription: "Quinoa, cooked", note: "Por 100 g COCIDA, como mide dishes.js.", displayName: "Quinoa cocida" },
  "rape": { resolved: true, kcal: 76, protein: 14.5, carbs: 0, fat: 1.52, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 173676, fdcDescription: "Fish, monkfish, raw", displayName: "Rape" },
  "requeson": { resolved: true, kcal: 160, protein: 8.7, carbs: 5.4, fat: 11.6, productName: "Requesón mezcla Hacendado", ean: "8413556010324", matchMethod: "name", displayName: "Requesón" },
  "salmon": { resolved: true, kcal: 208, protein: 20.4, carbs: 0, fat: 13.4, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 175167, fdcDescription: "Fish, salmon, Atlantic, farmed, raw", displayName: "Salmón" },
  "sardinas en lata": { resolved: true, kcal: 322, protein: 19, carbs: 0.6, fat: 27, productName: "Sardinillas reducidas en sal en aceite de oliva Hacendado", ean: "8480000182142", matchMethod: "exact_ean", displayName: "Sardinas en lata" },
  "skyr natural": { resolved: true, kcal: 59, protein: 10.2, carbs: 3.6, fat: 0.39, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 170894, fdcDescription: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)", note: "USDA no tiene skyr; el skyr real ronda 63 kcal / 11 g proteína. Griego desnatado es el registro real más cercano.", displayName: "Skyr natural" },
  "solomillo de ternera": { resolved: true, kcal: 116, protein: 21, carbs: 0.5, fat: 3.3, productName: "Solomillo de vacuno", ean: "8436569263419", matchMethod: "name", displayName: "Solomillo de ternera" },
  "tempeh": { resolved: true, kcal: 192, protein: 20.3, carbs: 7.64, fat: 10.8, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 174272, fdcDescription: "Tempeh", displayName: "Tempeh" },
  "ternera magra": { resolved: true, kcal: 122, protein: 23, carbs: 0.5, fat: 3.5, productName: "Filetes de vacuno añojo para plancha", ean: "8436569263464", matchMethod: "name", displayName: "Ternera magra" },
  "tofu firme": { resolved: true, kcal: 110, protein: 11.1, carbs: 0.9, fat: 6.9, productName: "Tofu firme Hacendado", ean: "8410789140118", matchMethod: "name", displayName: "Tofu firme" },
  "tomate": { resolved: true, kcal: 19.3, protein: 0.86, carbs: 2.49, fat: 0.26, productName: "Tomates", ean: "5600084699715", matchMethod: "name", displayName: "Tomate" },
  "tortillas de trigo": { resolved: true, kcal: 294.44, protein: 8.4, carbs: 50, fat: 5.8, productName: "Tortillas de trigo Hacendado", ean: "8480000808592", matchMethod: "exact_ean", displayName: "Tortillas de trigo" },
  "tortitas de arroz": { resolved: true, kcal: 363, protein: 8.5, carbs: 75, fat: 2.8, productName: "Tortitas de arroz Hacendado", ean: "8480000140135", matchMethod: "name", displayName: "Tortitas de arroz" },
  "trigo sarraceno cocido": { resolved: true, kcal: 92, protein: 3.38, carbs: 19.9, fat: 0.62, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 170686, fdcDescription: "Buckwheat groats, roasted, cooked", note: "Valor por 100 g COCIDO.", displayName: "Trigo sarraceno cocido" },
  "verduras congeladas salteado": { resolved: true, kcal: 65, protein: 2.86, carbs: 13.1, fat: 0.15, source: "usda_fdc", tier: "generic_reference", needsReview: true, fdcId: 170472, fdcDescription: "Vegetables, mixed, frozen, cooked, boiled, drained, without salt", note: "Mezcla de verdura congelada hervida; el aceite del salteado va aparte en la receta.", displayName: "Verduras congeladas salteado" },
  // 2026-09-02: el rol "wrap proteico" ya no existe. La auditor\u00eda anterior
  // lo dej\u00f3 sin resolver porque NINGUNA fuente (cat\u00e1logo, OFF, USDA) tiene
  // un wrap alto en prote\u00edna -- y con raz\u00f3n: Mercadona no lo vende. Pero
  // dejarlo en 3 platos significaba mandar al usuario a comprar algo que no
  // existe en su tienda, que es justo la queja que ya hizo con otros
  // productos. Los 3 platos usan ahora "Tortillas de trigo", que s\u00ed se
  // compra y ya estaba resuelto por EAN.
  "yogur griego ligero": { resolved: true, kcal: 60, protein: 5.8, carbs: 4.7, fat: 2, productName: "Yogur griego natural ligero Hacendado 2% MG", ean: "8480000213587", matchMethod: "exact_ean", displayName: "Yogur griego ligero" },
  "zanahoria": { resolved: true, kcal: 37.8, protein: 1.3, carbs: 7.7, fat: 0.2, productName: "Zanahoria en tiras Hacendado", ean: "8402001034718", matchMethod: "name", displayName: "Zanahoria" }
};

/**
 * js/data/serving-sizes.js
 * ─────────────────────────────────────────────────────────────────────────
 * CUÁNTO es "una ración" de cada producto real, y qué se puede hacer con
 * el resto del envase.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────
 * Hasta 2026-09-01 el modo "sin cocinar" no tenía ninguna noción de
 * ración: cada producto se mostraba como "1 ración / 1 porción / 1 unidad"
 * (una ETIQUETA de texto, no una cantidad) y los macros que se pintaban
 * eran los de `real-products.js`, que son POR 100 g. Resultado medido: una
 * pizza de 430 g se anunciaba como "245 kcal" cuando son ~1.050, y un
 * queso curado como "900 kcal" por "1 porción". Todos los números de esa
 * pantalla eran falsos. Sin gramos por ración no se puede calcular un
 * macro real, ni apuntar a un objetivo, ni decidir si un envase se acaba.
 *
 * ── Las dos cosas que decide cada regla ─────────────────────────────────
 *   g       gramos de UNA ración de ese producto (persona adulta, comida
 *           normal). Aproximación honesta por familia de producto, NO un
 *           dato de fabricante: no existe en el catálogo.
 *   policy  qué pasa con lo que sobra del envase:
 *             "keeps" — se guarda (queso, jamón, pan, conservas). Se coge
 *                       una ración y el resto va a la despensa.
 *             "fresh" — solo está bueno recién hecho y NO se guarda de un
 *                       día para otro (pizza, rosca, plato preparado
 *                       caliente). El envase ENTERO se consume el mismo
 *                       día: en una toma, o repartido en dos.
 *   role    qué papel juega en una comida (ver js/data/no-cook-templates.js).
 *           `null` = no es un componente de comida (bebidas, café...) y
 *           por tanto NUNCA entra en una plantilla. Esto por sí solo mata
 *           el bug de "la Comida es un refresco de naranja y un Aquarius".
 *
 * Las claves son `leafCategory` de real-products.js; si un producto no
 * tiene regla de leaf se prueba su `category`, y si tampoco, se cae en
 * DEFAULT_SERVING (100 g, keeps, sin rol → no entra en plantillas).
 *
 * Consumido por: js/engine/no-cook-generator.js, js/ui/render-no-cook.js
 * ─────────────────────────────────────────────────────────────────────────
 */

// Roles que las plantillas de comida saben combinar.
var SERVING_ROLES = [
  "carrier",   // la base sobre la que se monta: pan, wrap, tostada
  "protein",   // fiambre, conserva de pescado, huevo, ahumado
  "queso",
  "veg",       // verdura/ensalada lista para comer
  "untable",   // se unta: paté, hummus, crema, mermelada
  "principal", // plato completo por sí solo: pizza, lasaña, plato de cuchara
  "sopa",      // crema/gazpacho/caldo listo, acompaña o abre una comida
  "fruta",
  "lacteo",    // yogur, leche, postre lácteo
  "cereal",    // muesli, cereales, galletas de desayuno
  "dulce",     // chocolate, bollería (solo snacks)
  "salado",    // frutos secos, patatas, encurtidos (solo snacks)
  // Desde el 2026-11-04 (noCookRolAjustado): un bote de legumbre cocida o un
  // vaso de arroz cocido no son un plato preparado, son la BASE de uno.
  "legumbre",  // garbanzos, alubias, lentejas cocidas: base de una ensalada
  "base",      // arroz cocido, patata cocida: base de un bol
];

var DEFAULT_SERVING = { g: 100, policy: "keeps", role: null };

/**
 * Techo de kcal/100 g plausible por papel. Un producto que lo supera NO es
 * lo que su nombre dice y se descarta del modo "sin cocinar".
 *
 * ── Por qué hace falta, y por qué Atwater no vale aquí ──────────────────
 * Buena parte del catálogo tiene la nutrición emparejada por NOMBRE contra
 * OpenFoodFacts (`nutritionSource: "openfoodfacts_name"`), no por EAN. Ese
 * emparejamiento acierta casi siempre y falla de forma espectacular a
 * veces: el producto "Banana" (fruta fresca, 180 g) trae 528 kcal/100 g y
 * 32 g de grasa — son CHIPS de plátano. Salió en un plan generado como
 * "1 plátano = 634 kcal".
 *
 * Atwater NO lo detecta: 4x2 + 4x56 + 9x32 = 520 frente a 528 declaradas,
 * concordancia del 1,5%. Es coherente porque los macros son TAMBIÉN los de
 * los chips. Es el mismo caso que "Oil, oat" en ingredient-nutrition.js:
 * la coherencia interna no defiende de nada, solo defiende comprobar qué
 * ES la cosa. Aquí lo comprobable sin una persona delante es el orden de
 * magnitud: ninguna fruta fresca pasa de 400 kcal/100 g (los dátiles, lo
 * más denso del catálogo, están en 297), y ningún queso real llega a 900.
 *
 * Los techos son GENEROSOS a propósito: buscan lo imposible, no lo raro.
 */
var ROLE_KCAL_CEILING = {
  fruta:   400,   // dátiles ~297; por encima es fruta frita o desecada azucarada
  veg:     200,
  lacteo:  400,
  queso:   500,   // el curado más graso ronda 420
  protein: 600,
  carrier: 500,
  principal: 400,
  sopa:    200,
};

/**
 * ¿Los valores de este producto son plausibles para el papel que se le ha
 * asignado? Solo mira el orden de magnitud (ver ROLE_KCAL_CEILING).
 * @param {object} product
 * @param {string|null} role
 * @returns {boolean}
 */
function isPlausibleForRole(product, role, maxKcal) {
  if (!product) return true;
  // Un techo por hoja (maxKcal en SERVING_BY_LEAF) manda sobre el del rol:
  // "fruta" agrupa dátiles de 297 kcal y naranjas de 47, y un solo número
  // no puede servir para las dos.
  var ceiling = (typeof maxKcal === "number") ? maxKcal : (role ? ROLE_KCAL_CEILING[role] : null);
  if (!ceiling) return true;
  return !(typeof product.kcal === "number" && product.kcal > ceiling);
}

/**
 * ¿Las kcal declaradas concuerdan con sus propios macros? (Atwater:
 * 4P + 4C + 9F). Es un control DISTINTO y complementario al de arriba:
 *
 *   - ROLE_KCAL_CEILING caza el registro que es OTRO producto (chips de
 *     plátano fichados como "Banana"). Ahí kcal y macros son coherentes
 *     entre sí, así que Atwater no lo ve.
 *   - Esto caza el registro cuyos números se contradicen: "Pomelo" con
 *     15 kcal pero P10/C20/F10 (210 kcal de macros, ratio 14x), o un café
 *     de 6 kcal con 13 g de grasa. Ahí el techo por papel no ve nada raro.
 *
 * Banda ANCHA a propósito (0,6-1,5): busca la contradicción grosera, no el
 * redondeo. Medido sobre el pool: descarta ~2% de los productos, todos
 * ellos con números imposibles. Nota histórica: Atwater da falsos
 * positivos con el alcohol (etanol, 7 kcal/g, invisible a la fórmula),
 * pero la categoría "Bodega" ya está excluida del modo sin cocinar.
 *
 * @param {object} product
 * @returns {boolean}
 */
function hasConsistentMacros(product) {
  if (!product || typeof product.kcal !== "number" || product.kcal <= 0) return false;
  var atwater = (product.protein || 0) * 4 + (product.carbs || 0) * 4 + (product.fat || 0) * 9;
  if (atwater <= 0) return true;         // sin macros declarados: nada que contradecir
  var ratio = atwater / product.kcal;
  return ratio >= 0.6 && ratio <= 1.5;
}

// ── Reglas por leafCategory ──────────────────────────────────────────────
// [gramos por ración, policy, rol]. policy se omite cuando es "keeps".
var SERVING_BY_LEAF = {
  // ── Panadería: la BASE de casi toda comida montada ────────────────────
  "Pan de molde":              { g: 60, role: "carrier" },   // 2 rebanadas
  "Pan rebanado":              { g: 60, role: "carrier" },
  "Pan de hamburguesa y wrap": { g: 70, role: "carrier", unit: "unidad" },  // wrap/pan, no "rebanada"
  "Pan de bocadillo":          { g: 90, role: "carrier", unit: "unidad" },
  "Barra de pan":              { g: 80, role: "carrier", unit: "trozo" },
  "Otros panes":               { g: 70, role: "carrier" },
  "Pan tostado":               { g: 30, role: "carrier" },
  "Picos":                     { g: 25, role: "carrier", unit: "puñado" },
  "Rosquilletas":              { g: 25, role: "carrier", unit: "puñado" },
  "Crakers y tartaletas":      { g: 25, role: "carrier" },
  "Picatostes":                { g: 15, role: "salado" },
  "Tortitas":                  { g: 25, role: "cereal" },
  "Pan rallado":               { g: 20, role: null },        // ingrediente
  "Bollería envasada":         { g: 60, role: "dulce" },
  "Bollería dulce":            { g: 60, role: "dulce" },
  "Bollería salada":           { g: 60, role: "dulce" },
  "Pastelitos surtidos":       { g: 50, role: "dulce" },

  // ── Charcutería: la proteína fácil ────────────────────────────────────
  "Jamón cocido":   { g: 50, role: "protein" },
  "Pavo y otros":   { g: 50, role: "protein" },
  "Jamón serrano":  { g: 40, role: "protein" },
  "Lomo y otros":   { g: 40, role: "protein" },
  "Chopped":        { g: 50, role: "protein" },
  "Mortadela":      { g: 50, role: "protein" },
  "Salchichón":     { g: 30, role: "protein" },
  "Chorizo":        { g: 30, role: "protein" },
  "Bacón":          { g: 40, role: "protein" },
  "Salchichas":     { g: 80, role: "protein" },
  "Paté":           { g: 25, role: "untable" },
  "Sobrasada":      { g: 25, role: "untable" },

  // ── Quesos ────────────────────────────────────────────────────────────
  "Queso lonchas":        { g: 30, role: "queso" },
  "Queso untable":        { g: 30, role: "untable" },
  "Queso fresco":         { g: 80, role: "queso" },
  "Queso curado":         { g: 30, role: "queso" },
  "Queso semicurado":     { g: 30, role: "queso" },
  "Queso tierno":         { g: 30, role: "queso" },
  "Queso especialidades": { g: 40, role: "queso" },
  "Queso en porciones":   { g: 20, role: "queso" },
  "Queso rallado":        { g: 20, role: "queso" },

  // ── Pescado y conservas listos ────────────────────────────────────────
  "Atún":                      { g: 60, role: "protein" },
  "Bonito":                    { g: 60, role: "protein" },
  "Caballa y melva":           { g: 60, role: "protein" },
  "Sardinas":                  { g: 60, role: "protein" },
  "Otras conservas de pescado":{ g: 60, role: "protein" },
  "Berberechos y almejas":     { g: 55, role: "protein" },
  "Mejillones":                { g: 55, role: "protein" },
  "Mejillones y otros":        { g: 55, role: "protein" },
  "Ahumados":                  { g: 50, role: "protein" },
  "Salazones":                 { g: 30, role: "protein" },
  "Surimi y otros":            { g: 60, role: "protein" },
  "Marisco":                   { g: 100, role: "protein" },
  "Sepia, pulpo y calamar":    { g: 80, role: "protein" },
  "Huevos":                    { g: 60, role: "protein" },  // 1 huevo

  // ── Verdura lista para comer ──────────────────────────────────────────
  "Lechuga":            { g: 60, role: "veg" },
  "Ensalada preparada": { g: 80, role: "veg" },
  "Pepino y zanahoria": { g: 100, role: "veg" },
  "Verduras al vapor":  { g: 150, role: "veg" },
  "Conservas verdura":  { g: 80, role: "veg" },
  "Tomate":             { g: 80, role: "veg" },
  "Aceitunas verdes":   { g: 30, role: "salado" },
  "Aceitunas negras":   { g: 30, role: "salado" },
  "Pepinillos y otros encurtidos": { g: 30, role: "salado" },
  "Cocktails":          { g: 30, role: "salado" },
  "Cóctel y banderillas": { g: 30, role: "salado" },
  "Hierbas aromáticas": { g: 5, role: null },

  // ── Platos preparados: completos por sí solos ─────────────────────────
  // policy "fresh": solo están buenos recién calentados. El envase entero
  // se come el MISMO día -- en una toma o repartido en dos, nunca queda
  // media pizza esperando a mañana en la despensa.
  "Pizzas refrigeradas":       { g: 210, policy: "fresh", role: "principal" },
  "Pizzas congeladas":         { g: 210, policy: "fresh", role: "principal" },
  "Roscas, quiche y baguettes":{ g: 225, policy: "fresh", role: "principal" },
  "Sándwich":                  { g: 185, policy: "fresh", role: "principal" },
  "Platos calientes":          { g: 200, policy: "fresh", role: "principal" },
  "Platos de cuchara":         { g: 210, policy: "fresh", role: "principal" },
  "Pasta":                     { g: 175, policy: "fresh", role: "principal" },
  "Carne":                     { g: 190, policy: "fresh", role: "principal" },
  "Arroz":                     { g: 140, policy: "fresh", role: "principal" },
  "Fideos orientales":         { g: 65,  policy: "fresh", role: "principal" },
  "Otros":                     { g: 185, policy: "fresh", role: "principal" },
  "Empanados y elaborados":    { g: 185, policy: "fresh", role: "principal" },
  "Lasaña y canelones":        { g: 200, policy: "fresh", role: "principal" },
  // Estos aguantan en nevera, así que NO son "fresh":
  "Ensaladilla":   { g: 125, role: "principal" },
  "Platos fríos":  { g: 175, role: "principal" },
  "Tortilla":      { g: 200, role: "principal" },
  "Hummus y otros":{ g: 50,  role: "untable" },
  "Alubias":       { g: 200, role: "principal" },
  "Garbanzos":     { g: 200, role: "principal" },
  "Lentejas y otros": { g: 200, role: "principal" },

  // ── Sopas y cremas listas ─────────────────────────────────────────────
  "Cremas y puré":        { g: 250, role: "sopa" },
  "Caldo líquido":        { g: 250, role: "sopa" },
  "Gazpacho y salmorejo": { g: 250, role: "sopa" },
  "Sopa":                 { g: 25,  role: "sopa" },   // sobre seco

  // ── Fruta ─────────────────────────────────────────────────────────────
  // maxKcal ajustado por hoja: la fruta FRESCA del catálogo real llega
  // como mucho a 69 kcal/100 g, y luego hay un salto enorme a cuatro
  // registros imposibles -- Frambuesas 210, Mango 326, Moras 352 y Banana
  // 528 (todos emparejados por nombre contra OpenFoodFacts, todos son en
  // realidad su versión desecada, frita o en mermelada). El techo del rol
  // `fruta` (400) los dejaba pasar porque está pensado para los dátiles.
  // 200 corta los cuatro; se lleva por delante un aguacate de 205 kcal
  // que sí era plausible, y es un precio honesto por quitar cuatro
  // imposibles de un pool de 18.
  "Cítricos":        { g: 150, role: "fruta", maxKcal: 200 },
  "Manzana y pera":  { g: 170, role: "fruta", maxKcal: 200 },
  "Plátano y uva":   { g: 120, role: "fruta", maxKcal: 200 },
  "Fruta tropical":  { g: 150, role: "fruta", maxKcal: 200 },
  "Otras frutas":    { g: 150, role: "fruta", maxKcal: 200 },
  "Fruta de temporada": { g: 150, role: "fruta", maxKcal: 200 },
  "Conservas fruta": { g: 120, role: "fruta", maxKcal: 200 },
  "Fruta desecada":  { g: 40,  role: "fruta" },   // desecada SÍ llega a ~340

  // ── Lácteos y postres ─────────────────────────────────────────────────
  "Yogures naturales":  { g: 125, role: "lacteo" },
  "Yogures desnatados": { g: 125, role: "lacteo" },
  "Yogures de sabores": { g: 125, role: "lacteo" },
  "Yogures griegos":    { g: 125, role: "lacteo" },
  "Bífidus naturales":  { g: 125, role: "lacteo" },
  "Bífidus de sabores": { g: 125, role: "lacteo" },
  "Yogures líquidos":   { g: 100, role: "lacteo" },
  "L-Casei":            { g: 100, role: "lacteo" },
  "Flan":               { g: 100, role: "lacteo" },
  "Natillas":           { g: 100, role: "lacteo" },
  "Otros postres":      { g: 100, role: "lacteo" },
  "Postres de soja":    { g: 100, role: "lacteo" },
  "Colesterol y otros": { g: 100, role: "lacteo" },
  "Leche entera":       { g: 250, role: "lacteo" },
  "Leche semidesnatada":{ g: 250, role: "lacteo" },
  "Leche desnatada":    { g: 250, role: "lacteo" },
  "Bebidas vegetales":  { g: 250, role: "lacteo" },
  "Batidos":            { g: 200, role: "lacteo" },
  "Nata":               { g: 30,  role: null },
  "Mantequilla":        { g: 15,  role: "untable" },
  "Margarina":          { g: 15,  role: "untable" },
  "Leche condensada y otros": { g: 20, role: "untable" },

  // ── Cereales y galletas ───────────────────────────────────────────────
  "Cereales":                       { g: 50, role: "cereal" },
  "Cereales integrales y muesli":   { g: 50, role: "cereal" },
  "Galletas desayuno":              { g: 40, role: "cereal" },
  "Galletas integrales y digestive":{ g: 40, role: "cereal" },
  "Galletas surtidas":              { g: 40, role: "cereal" },
  "Con chocolate y rellenas":       { g: 40, role: "dulce" },
  "Barritas de cereales":           { g: 25, role: "cereal" },
  "Barras de helado y barquillos":  { g: 60, role: "dulce" },

  // ── Untables dulces ───────────────────────────────────────────────────
  "Mermelada":       { g: 25, role: "untable" },
  "Miel":            { g: 20, role: "untable" },
  "Cremas de untar": { g: 25, role: "untable" },

  // ── Snacks ────────────────────────────────────────────────────────────
  "Frutos secos":         { g: 30, role: "salado" },
  "Patatas fritas":       { g: 30, role: "salado" },
  "Snacks":               { g: 30, role: "salado" },
  "Chocolate negro":      { g: 25, role: "dulce" },
  "Chocolate con leche":  { g: 25, role: "dulce" },
  "Chocolate blanco":     { g: 25, role: "dulce" },
  "Chocolatinas":         { g: 30, role: "dulce" },

  // ── Sin rol a propósito: nunca son "una comida" ───────────────────────
  // Aquí está el arreglo del bug real: la Comida podía salir siendo un
  // refresco de naranja y un Aquarius, porque cualquier producto elegible
  // valía para cualquier toma. Con role:null no entran en ninguna
  // plantilla; siguen en el catálogo, pero no montan una comida.
  "Azúcar":              { g: 5,   role: null },
  "Edulcorante y otros": { g: 1,   role: null },
  "Café soluble":        { g: 2,   role: null },
  "Cacao soluble":       { g: 15,  role: null },
  "Infusiones":          { g: 2,   role: null },
  "Té":                  { g: 2,   role: null },
  "Chocolate a la taza": { g: 200, role: null },
  "Monodosis":           { g: 8,   role: null },
  "Bebidas frías":       { g: 250, role: null },
  "Cápsulas compatibles Dolce gusto": { g: 8, role: null },
  "Cápsulas compatibles Nespresso":   { g: 6, role: null },
};

// ── Reglas por category (solo si no hubo regla de leaf) ──────────────────
var SERVING_BY_CATEGORY = {
  "Agua y refrescos":  { g: 330, role: null },   // nunca componen una comida
  "Zumos":             { g: 200, role: null },
  "Cacao, café e infusiones": { g: 200, role: null },
  "Azúcar, caramelos y chocolate": { g: 25, role: "dulce" },
  "Aperitivos":        { g: 30,  role: "salado" },
  "Postres y yogures": { g: 125, role: "lacteo" },
  "Cereales y galletas": { g: 40, role: "cereal" },
  "Panadería y pastelería": { g: 60, role: "carrier" },
  "Charcutería y quesos": { g: 40, role: "protein" },
  "Fruta y verdura":   { g: 120, role: "fruta" },
  "Conservas, caldos y cremas": { g: 80, role: "veg" },
  "Huevos, leche y mantequilla": { g: 200, role: "lacteo" },
  "Marisco y pescado": { g: 60,  role: "protein" },
  "Pizzas y platos preparados": { g: 200, policy: "fresh", role: "principal" },
  "Carne":             { g: 150, policy: "fresh", role: "principal" },
  "Arroz, legumbres y pasta": { g: 200, role: "principal" },
};

/**
 * Gramos del envase completo. `size` viene en kg / l / ud (las tres únicas
 * unidades del catálogo). Litros se tratan como kilos: para leche, zumo o
 * gazpacho el error de densidad es <4% y no cambia ninguna decisión. "ud"
 * es un CONTADOR (12 huevos), así que el envase son `size` raciones.
 *
 * @param {object} product
 * @param {number} servingG
 * @returns {number|null} gramos, o null si el producto no declara tamaño
 */
function packageGrams(product, servingG) {
  if (!product || product.size == null || !isFinite(product.size)) return null;
  var u = product.sizeUnit;
  if (u === "kg" || u === "l") return product.size * 1000;
  // El catálogo real solo trae kg/l/ud, pero aceptar g/ml cuesta una línea
  // y evita que otro origen de datos (u otra tienda) caiga en "sin tamaño".
  if (u === "g" || u === "ml") return product.size;
  if (u === "ud") return product.size * servingG;
  return null;
}

/**
 * Cuánto es una ración de este producto y qué se hace con el resto.
 *
 * @param {object} product - entrada de REAL_PRODUCTS
 * @returns {{servingG:number, servingsPerPackage:number, packageG:number|null,
 *            policy:string, role:string|null}}
 */
function resolveServing(product) {
  var rule = null;
  if (product) {
    if (Object.prototype.hasOwnProperty.call(SERVING_BY_LEAF, product.leafCategory)) {
      rule = SERVING_BY_LEAF[product.leafCategory];
    } else if (Object.prototype.hasOwnProperty.call(SERVING_BY_CATEGORY, product.category)) {
      rule = SERVING_BY_CATEGORY[product.category];
    }
  }
  if (!rule) rule = DEFAULT_SERVING;

  var servingG = rule.g;
  var packG = packageGrams(product, servingG);

  // Un envase nunca puede ser menos de UNA ración: si el formato es más
  // pequeño que la ración de su familia (un yogur suelto, una lata
  // pequeña), la ración ES el envase entero -- así los macros salen de lo
  // que realmente se come y no de una ración teórica que no cabe.
  if (packG != null && packG < servingG) servingG = packG;

  // FLOOR, no round: un envase de 130 g con ración de 80 g da UNA ración,
  // no dos. Redondeando hacia arriba se servían 160 g de un envase de 130
  // y el plan prometía comida que no está dentro del paquete.
  var servings = (packG != null && servingG > 0)
    ? Math.max(1, Math.floor(packG / servingG))
    : 1;

  return {
    servingG: servingG,
    servingsPerPackage: servings,
    packageG: packG,
    policy: rule.policy || "keeps",
    role: rule.role || null,
    // Etiqueta de consumo cuando la del clasificador no encaja: llamar
    // "rebanada" a una tortilla de trigo es confuso. null = usar la suya.
    unit: rule.unit || null,
    maxKcal: (typeof rule.maxKcal === "number") ? rule.maxKcal : null,
  };
}

/**
 * Macros REALES de N raciones de un producto. `kcal/protein/carbs/fat` en
 * real-products.js son POR 100 g -- este es el único sitio donde se hace
 * esa conversión, para que no vuelva a pintarse un valor por 100 g como si
 * fuese lo que te comes.
 *
 * @param {object} product
 * @param {number} grams
 * @returns {{kcal:number, protein:number, carbs:number, fat:number}}
 */
function macrosForGrams(product, grams) {
  var f = (grams || 0) / 100;
  var num = function (v) { return (typeof v === "number" && isFinite(v)) ? v * f : 0; };
  return {
    kcal:    num(product && product.kcal),
    protein: num(product && product.protein),
    carbs:   num(product && product.carbs),
    fat:     num(product && product.fat),
  };
}

// ── El TIPO de cada producto (2026-11-04) ────────────────────────────────
// El dueño: «на обед у меня было две банки горошка и пол пачки колбасы…
// давай сделаем огромный упор на качество». El papel (`role`) dice para qué
// hueco de una plantilla vale un producto, pero es demasiado grueso: en «veg»
// caían la lechuga y la lata de guisantes, en «protein» el pavo y los huevos
// CRUDOS, en «untable» la mermelada y el paté, y en «principal» las placas de
// lasaña sin cocer o la crema de leche para el café. Cada plantilla montaba lo
// primero que le tocaba del papel, y así salía una «ensalada» de guisantes de
// lata con salchichas, o tostadas de Nocilla con atún.
//
// El TIPO afina el papel. Lo deciden la hoja del catálogo y, dentro de una
// hoja mezclada, el nombre. Las plantillas (no-cook-templates.js) dicen qué
// tipos admite cada hueco, y el generador no pone una ración más de lo que un
// tipo admite en una toma (NO_COOK_MAX_G_POR_TIPO). Un producto cuyo tipo es
// null no entra en el modo sin cocinar: hay que cocinarlo (huevos crudos,
// bacón, empanados, tomate para guisar) o no es comida para una toma.

/** Quita acentos y pasa a minúsculas, para comparar nombres. */
function _sinAcentos(texto) {
  return String(texto || "").toLowerCase()
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");
}

/**
 * El tipo de un producto del modo sin cocinar, o null si no entra.
 * @param {object} product - entrada de REAL_PRODUCTS
 * @param {string|null} role - el papel que le dio resolveServing
 * @returns {string|null}
 */
function noCookTipo(product, role) {
  if (!product || !role) return null;
  var hoja = product.leafCategory || product.category || "";
  var n = _sinAcentos(product.name);

  switch (role) {
    case "protein":
      if (hoja === "Huevos") return /cocid/.test(n) ? "huevo" : null;          // crudos: hay que cocerlos
      if (hoja === "Bacón") return null;                                         // bacón y panceta: crudos
      if (hoja === "Jamón cocido") return "fiambre";
      if (hoja === "Pavo y otros") {
        return /salchichon|longaniza|cabeza de cerdo|chorizo/.test(n) ? "embutido" : "fiambre";
      }
      if (hoja === "Jamón serrano" || hoja === "Lomo y otros") {
        // Las piezas enteras (un jamón de 150 €) no son la compra de un día.
        return (typeof product.price === "number" && 25 < product.price) ? null : "curado";
      }
      if (hoja === "Chorizo" || hoja === "Salchichón") return "embutido";
      if (hoja === "Mortadela" || hoja === "Chopped") return "fiambre_graso";
      if (hoja === "Salchichas") return "salchicha";
      if (hoja === "Atún" || hoja === "Bonito" || hoja === "Caballa y melva" || hoja === "Sardinas") return "pescado";
      if (hoja === "Otras conservas de pescado") return /salmon/.test(n) ? "pescado" : "marisco";
      if (hoja === "Berberechos y almejas" || hoja === "Mejillones" || hoja === "Mejillones y otros") return "marisco";
      if (hoja === "Ahumados") return "ahumado";
      if (hoja === "Salazones") return /anchoa|boqueron/.test(n) ? "anchoa" : null;  // sucedáneo de caviar, huevas…
      if (hoja === "Surimi y otros") return "surimi";
      if (hoja === "Marisco" || hoja === "Sepia, pulpo y calamar") return "marisco_cocido";
      return "fiambre";

    case "veg":
      if (hoja === "Lechuga") return "hoja";
      if (hoja === "Ensalada preparada") {
        if (/de la casa/.test(n)) return "hoja";
        return /wrap/.test(n) ? null : "ensalada_lista";
      }
      if (hoja === "Pepino y zanahoria") return "crudo";
      if (hoja === "Tomate") {
        if (/tamizad|triturad|troceado|entero pelado|concentrad/.test(n)) return null;  // tomate para guisar
        if (/untar|rallad/.test(n)) return null;                                  // va como untable
        if (/pisto|fritada/.test(n)) return "cocida";
        if (/seco/.test(n)) return "conserva";
        return "crudo";
      }
      if (hoja === "Verduras al vapor") return /patata|batata/.test(n) ? null : "cocida";
      if (hoja === "Conservas verdura") {
        if (/patata/.test(n)) return null;   // es la base de un bol, no verdura (ver role "base")
        if (/asad/.test(n)) return "cocida";
        // Guisantes, judías verdes, acelgas, champiñón, macedonia: se calientan
        // y van de guarnición de un plato o de un bol, no dentro de un wrap.
        if (/guisante|judia|acelga|champinon|macedonia/.test(n)) return "conserva_caliente";
        return "conserva";
      }
      return "conserva";

    case "untable":
      if (hoja === "Mermelada" || hoja === "Miel" || hoja === "Cremas de untar") return "dulce";
      if (hoja === "Leche condensada y otros") return null;
      if (hoja === "Mantequilla" || hoja === "Margarina") return "grasa";
      if (hoja === "Queso untable") return "queso_untable";
      if (hoja === "Paté" || hoja === "Sobrasada") return "pate";
      if (hoja === "Hummus y otros") return /hummus|tsatsiki|pastel/.test(n) ? "hummus" : null;  // tofu, tabulé
      if (hoja === "Tomate") return "tomate";
      return "pate";

    case "queso":
      if (hoja === "Queso fresco") return "queso_fresco";
      if (hoja === "Queso rallado") return "queso_rallado";
      if (hoja === "Queso especialidades") return "queso_fuerte";   // azul, cabra, brie: no en un wrap ni en el desayuno
      return "queso";

    case "fruta":
      // De postre, fruta fresca o en su jugo; los dátiles y las pasas, de picoteo.
      if (hoja === "Fruta desecada") return "fruta_desecada";
      if (hoja === "Conservas fruta") return "fruta_conserva";
      return "fruta";

    case "salado":
      // La fruta va con frutos secos, no con patatas fritas ni aceitunas.
      return hoja === "Frutos secos" ? "frutos_secos" : "aperitivo";

    case "carrier":
      // Un wrap se hace con tortilla, no con picos ni rosquilletas.
      // El pan de hamburguesa o de perrito, para un bocadillo, no para tostadas.
      if (hoja === "Pan de hamburguesa y wrap") return /tortilla|wrap|fajita|burrito/.test(n) ? "tortilla" : "pan_bollo";
      if (hoja === "Pan tostado" || hoja === "Crakers y tartaletas") return "tostado";
      if (hoja === "Picos" || hoja === "Rosquilletas") return "picos";
      return "pan";

    case "principal":
      if (hoja === "Alubias" || hoja === "Garbanzos" || hoja === "Lentejas y otros") return null;  // legumbre sola: role "legumbre"
      if (hoja === "Arroz" && /arroz cocido/.test(n)) return null;          // arroz solo: role "base"
      if (/placas|crema de leche|soluble|burger|empanad|rebozad|ultracongelad|oreja/.test(n)) return null;
      if (hoja === "Pollo" || hoja === "Empanados y rebozados congelados") return null;   // al horno o a la sartén
      if (hoja === "Cerdo") return null;                                   // fiambre adobado: va como proteína
      return "plato";

    default:
      // El chocolate y la bollería de los snacks no son la mermelada del pan.
      return role === "dulce" ? "dulce_snack" : role;
  }
}

/**
 * Papel que el tipo le cambia a un producto: la legumbre cocida y el arroz
 * cocido solos dejan de ser «plato preparado» (un bote de garbanzos no es una
 * comida) y pasan a ser la base de una ensalada o de un bol; el tomate para
 * untar, un untable; el fiambre adobado, una proteína.
 * @param {object} product
 * @param {string|null} role
 * @returns {string|null}
 */
function noCookRolAjustado(product, role) {
  if (!product) return role;
  var hoja = product.leafCategory || product.category || "";
  var n = _sinAcentos(product.name);
  if (role === "principal" && (hoja === "Alubias" || hoja === "Garbanzos" || hoja === "Lentejas y otros")) return "legumbre";
  if (role === "principal" && hoja === "Arroz" && /arroz cocido/.test(n)) return "base";
  if (role === "principal" && hoja === "Cerdo") return "protein";
  if (role === "veg" && hoja === "Conservas verdura" && /patata/.test(n)) return "base";
  // El queso fresco batido se come a cucharadas, como un yogur.
  if (role === "queso" && /batido/.test(n)) return "lacteo";
  if (role === "veg" && hoja === "Verduras al vapor" && /patata|batata/.test(n)) return "base";
  if (role === "veg" && hoja === "Tomate" && /untar|rallad/.test(n)) return "untable";
  if (role === "untable" && hoja === "Hummus y otros" && /tofu/.test(n)) return null;
  return role;
}

/**
 * Lo más que se come de un tipo en UNA toma, en gramos. Es lo que impide que
 * escalar hacia las calorías acabe en «dos latas de guisantes»: una persona
 * no se come eso por mucho que le falten kcal, así que lo que falte lo pone
 * otro componente (el pan, el plato, la legumbre) u otra toma.
 */
var NO_COOK_MAX_G_POR_TIPO = {
  hoja: 150, crudo: 250, conserva: 160, conserva_caliente: 160, cocida: 300, ensalada_lista: 320,
  fiambre: 150, fiambre_graso: 100, curado: 90, embutido: 60, salchicha: 160, pescado: 160,
  marisco: 120, ahumado: 100, anchoa: 30, huevo: 180, surimi: 150, marisco_cocido: 200,
  dulce: 40, grasa: 20, queso_untable: 60, pate: 60, hummus: 100, tomate: 80,
  queso: 80, queso_fresco: 200, queso_rallado: 40, queso_fuerte: 60,
  pan: 180, pan_bollo: 210, tortilla: 210, tostado: 90, picos: 50,
  legumbre: 400, base: 300,
  fruta: 340, fruta_conserva: 240, fruta_desecada: 60, lacteo: 500, cereal: 100, frutos_secos: 40, aperitivo: 60, dulce_snack: 80, sopa: 500
};

/**
 * Precio de la parte del envase que se consume. El envase se COMPRA
 * entero (eso es lo que se paga y lo que va a la lista de la compra); esto
 * es solo el coste imputable a lo que se come, para poder repartir el
 * presupuesto entre tomas.
 * @param {object} product
 * @param {number} grams
 * @returns {number}
 */
function costForGrams(product, grams) {
  if (!product || typeof product.price !== "number") return 0;
  var packG = packageGrams(product, grams || 100);
  if (!packG || packG <= 0) return product.price;
  return product.price * Math.min(1, (grams || 0) / packG);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SERVING_ROLES: SERVING_ROLES,
    SERVING_BY_LEAF: SERVING_BY_LEAF,
    SERVING_BY_CATEGORY: SERVING_BY_CATEGORY,
    ROLE_KCAL_CEILING: ROLE_KCAL_CEILING,
    isPlausibleForRole: isPlausibleForRole,
    hasConsistentMacros: hasConsistentMacros,
    resolveServing: resolveServing,
    packageGrams: packageGrams,
    macrosForGrams: macrosForGrams,
    costForGrams: costForGrams,
    noCookTipo: noCookTipo,
    noCookRolAjustado: noCookRolAjustado,
    NO_COOK_MAX_G_POR_TIPO: NO_COOK_MAX_G_POR_TIPO,
  };
}

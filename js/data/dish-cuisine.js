/**
 * js/data/dish-cuisine.js
 * ─────────────────────────────────────────────────────────────────────────
 * A qué cocina pertenece cada plato, para el sesgo "me gusta más la comida
 * española" (feedback del usuario: "mixto, pero comida española más").
 *
 * ── Por qué un archivo APARTE de dish-instructions.js ────────────────────
 * Al principio `cuisine` vivía dentro de dish-instructions.js, y eso ataba
 * la etiqueta a la autoría de recetas: un plato solo podía tener cocina
 * cuando alguien le hubiera escrito los pasos. Son dos trabajos de coste
 * muy distinto -- poner "espanola" en una paella lleva segundos, escribir
 * sus pasos para alguien que no ha cocinado nunca lleva un rato largo. Con
 * los dos juntos el sesgo se quedaba muerto (medido: el 90,8 por ciento de
 * los platos que el generador elegía no tenían cocina) hasta terminar 314
 * recetas. Separados, la etiqueta cubre el catálogo entero HOY y la
 * autoría avanza a su ritmo.
 *
 * Mismo patrón aditivo que product-storage.js y dish-instructions.js: si
 * este archivo falta, todo se comporta exactamente como antes.
 *
 * ── La regla de clasificación: IDENTIDAD, no ingredientes ────────────────
 * Un plato es de una cocina por lo que ES, o por una técnica que arrastra
 * origen -- nunca por llevar un ingrediente de allí. Skyr, tofu, granola,
 * quinoa, gambas y cuscús son productos de súper, no nacionalidades:
 * "Skyr con kiwi" no es un plato islandés y "Gambas con quinoa" no es un
 * plato español. Aplicada en serio, la regla deja la mayoría del catálogo
 * en `neutra`, y ese es el resultado honesto: son combinaciones de
 * "proteína + cereal + verdura" sin identidad de cocina.
 *
 * ── AVISO A QUIEN AJUSTE EL SESGO ───────────────────────────────────────
 * Solo 25 platos de 334 (7 por ciento) son españoles, y 9 de
 * ellos son "Jamón serrano con algo", que son snacks. Preferir lo español
 * no puede dar mucho de sí con esta base: el techo lo pone el CATÁLOGO, no
 * el peso del sesgo. Si se quiere que la app se sienta española, el camino
 * es escribir platos españoles, no subir el peso.
 *
 * Lo que NO está aquí es la lista de `neutra`: enumerar 274 nombres
 * para decir "ninguna cocina" sería ruido. Ausente = neutra, y `neutra`
 * significa "el sesgo no la toca", nunca "penalizada".
 *
 * Expone (globales):
 *   CUISINE_TOKENS[]
 *   DISH_CUISINE_ESPANOLA[]
 *   DISH_CUISINE_INTERNACIONAL[]
 *   getDishCuisine(dishName) -> "espanola" | "internacional" | "neutra"
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Vocabulario CERRADO de cocina, para el sesgo "me gusta más la comida
 * española" (feedback del usuario: "mixto, pero comida española más").
 *
 * TRES valores, no dos. `neutra` no es una categoría de relleno ni una
 * excusa para no decidir: es la respuesta correcta para platos que no
 * pertenecen a ninguna cocina. Una manzana con almendras, un yogur con
 * fruta o unas claras revueltas no son "internacionales" -- no son NADA,
 * son comida. Con un vocabulario binario habría que marcarlos
 * `internacional`, y entonces preferir lo español penalizaría a una
 * manzana por no ser española, que es absurdo. Marcados `neutra`, el
 * sesgo sencillamente no los toca.
 *
 * Esto es una PREFERENCIA, nunca un filtro: quien prefiere comida
 * española sigue viendo pasta. Ver la nota de sesgo-vs-filtro en
 * js/core/preferences.js.
 */
var CUISINE_TOKENS = ["espanola", "internacional", "neutra"];

/**
 * Platos con identidad española: nombre propio ("Tortilla española"),
 * técnica con origen ("a la plancha", "al ajillo", "al pil-pil"), formato
 * ("bocadillo") o producto con denominación ("jamón serrano").
 */
var DISH_CUISINE_ESPANOLA = [
  "Tortilla francesa con tostadas integrales",
  "Huevos al plato con jamón y tomate",
  "Pollo a la plancha con arroz y brócoli",
  "Lentejas estofadas con muslos de pollo",
  "Bacalao al pil-pil con patatas",
  "Pechuga de pollo a la plancha con ensalada",
  "Salmón a la plancha con espinacas y limón",
  "Merluza a la plancha con arroz y limón",
  "Sardinas al horno con ensalada",
  "Tortilla española con ensalada",
  "Huevos al plato con espinacas y tomate",
  "Tofu a la plancha con verduras y arroz",
  "Bocadillo integral de atún y tomate",
  "Bocadillo de pavo con queso y verduras",
  "Merluza al ajillo con verduras",
  "Cerdo a la plancha con arroz y brócoli",
  "Jamón serrano con pan de centeno y verduras salteadas",
  "Jamón serrano con pan integral y champiñones",
  "Jamón serrano con cuscús y champiñones",
  "Jamón serrano con patatas y zanahoria",
  "Jamón serrano con pasta y espinacas",
  "Jamón serrano con quinoa y pimientos",
  "Jamón serrano con cacahuetes",
  "Jamón serrano con manzana",
  "Jamón serrano con kiwi",
  // Platos españoles nuevos (2026-08-31), tras resolver cebolla/ajo/aceite.
  "Tortilla de patatas",
  "Pollo al ajillo con patatas",
  "Pollo al ajillo con arroz",
  "Pisto con huevo",
  "Lentejas guisadas con verduras",
  "Garbanzos con espinacas",
  "Bacalao con tomate",
  "Merluza a la plancha con ensalada",
  "Merluza en salsa verde con espinacas",
  "Huevos a la flamenca",
  "Sopa de ajo castellana",
  "Ensaladilla de atún",
  "Champiñones al ajillo",
  "Gazpacho con picatostes",

  // Baratos y de toda la vida (2026-09-02). "Pan con tomate" es el pa amb
  // tomàquet de siempre; el resto son platos de olla y sartén de cocina
  // española corriente. Los que llevan salchicha se dejan fuera: son
  // baratos, pero no son cocina española.
  "Pan con tomate y aceite",
  "Pan con tomate y queso",
  "Pan con huevo duro y tomate",
  "Arroz con huevo y tomate",
];

/**
 * Platos con identidad de fuera: el nombre dice de dónde vienen
 * (teriyaki, tikka, curry, poke bowl, shakshuka, boloñesa, porridge,
 * french toast, caprese, hummus...) o el formato es de fuera (wrap,
 * sandwich, bagel, hamburguesa).
 */
var DISH_CUISINE_INTERNACIONAL = [
  "Porridge de avena con plátano y miel",
  "Porridge de avena con frutos rojos y skyr",
  "Porridge de avena con mantequilla de cacahuete",
  "Overnight oats con yogur y manzana",
  "Queso fresco con muesli y naranja",
  "Wrap de desayuno con huevo y pavo",
  "Bagel integral con queso y salmón ahumado",
  "Crepes de avena con requesón y fruta",
  "Muesli con leche y fruta",
  "French toast proteico con yogur",
  "Smoothie bowl de skyr con frutos rojos",
  "Pollo al curry con arroz basmati",
  "Bowl de arroz con pollo teriyaki y edamame",
  "Wrap de pollo con lechuga y tomate",
  "Burrito de pollo con arroz integral",
  "Poke bowl de pollo con arroz y aguacate",
  "Wrap de pavo con queso y lechuga",
  "Ensalada mediterránea con pavo y garbanzos",
  "Spaghetti boloñesa ligera",
  "Poke bowl de salmón con arroz y aguacate",
  "Ensalada mediterránea con garbanzos",
  "Wrap de hummus con verduras",
  "Pollo tikka masala con arroz integral",
  "Hamburguesa de pavo con ensalada",
  "Shakshuka ligera con tostadas",
  "Sandwich integral de pavo y queso",
  "Ensalada caprese con jamón",
  "Hummus con zanahoria y pepino",
  "Wrap de desayuno con claras y aguacate",
  "Pan tostado con hummus y tomate",
  "Porridge de avena con nueces y canela",
  "Salmón teriyaki con arroz integral",
  "Poke bowl de tempeh con arroz y aguacate",
  "Wrap de salmón con aguacate y espinacas",
  "Garbanzos al curry con espinacas",
];

/**
 * Cocina de un plato. Lo no listado es `neutra` -- que es la mayoría del
 * catálogo (274 de 334) y es la respuesta correcta, no un hueco
 * pendiente de rellenar.
 *
 * @param {string} dishName - nombre tal cual aparece en dishes.js
 * @returns {"espanola"|"internacional"|"neutra"}
 */
function getDishCuisine(dishName) {
  if (!dishName) return "neutra";
  if (DISH_CUISINE_ESPANOLA.indexOf(dishName) !== -1) return "espanola";
  if (DISH_CUISINE_INTERNACIONAL.indexOf(dishName) !== -1) return "internacional";
  return "neutra";
}

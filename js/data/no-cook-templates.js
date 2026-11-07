/**
 * js/data/no-cook-templates.js
 * ─────────────────────────────────────────────────────────────────────────
 * FORMAS de comida para el modo "sin cocinar". Una comida deja de ser "N
 * productos elegibles al azar" y pasa a ser una PLANTILLA con papeles que
 * hay que rellenar: base + proteína + queso + verdura, o un plato completo,
 * o cereal + lácteo + fruta.
 *
 * ── El problema que esto arregla ────────────────────────────────────────
 * El generador anterior cogía 2-3 productos al azar de una lista laxa de
 * categorías permitidas. Planes reales que produjo (medidos, no
 * hipotéticos): una Comida que era un refresco de naranja y un Aquarius;
 * una Cena de pimientos asados + queso con trufa + jamón ibérico de 22 €;
 * una Cena de ensalada y tortillas de trigo, sin nada que poner dentro.
 * Ninguno de esos es una comida. Con plantillas, "tortillas de trigo" solo
 * puede salir como BASE de un wrap, y un wrap exige proteína.
 *
 * ── Reglas de las plantillas ────────────────────────────────────────────
 *   slots       en qué tomas puede aparecer.
 *   components  papeles a rellenar, en orden de importancia. `required`
 *               significa que sin ese papel la plantilla NO se monta: es
 *               justamente lo que impide "una base y nada más".
 *   assembly    cómo se hace, en una línea. Regla dura de este modo: solo
 *               abrir, untar, apilar, enrollar o microondas. Nada que
 *               necesite tabla, cuchillo de cocina, fuego ni sartén.
 *   maxServings tope de raciones por componente en una toma, para que
 *               escalar hacia el objetivo de calorías no acabe en "4
 *               raciones de chorizo".
 *   makeAhead   (opcional) hay que dejarlo hecho la NOCHE ANTES — no se
 *               monta y se come al momento (avena remojada). Misma regla que
 *               los platos makeAhead del modo cocinado: nunca en un plan de
 *               1 día, nunca en el día 1 de uno de varios, y con aviso
 *               cuando sale. Desde el 2026-10-21 el modo sin cocinar admite
 *               planes de varios días (generateNoCookPlanDays), así que
 *               estas plantillas pueden salir del día 2 en adelante.
 *
 * Los papeles (`role`) los asigna js/data/serving-sizes.js. Un producto sin
 * rol (bebidas, café, azúcar) no puede rellenar ningún hueco y por tanto
 * nunca monta una comida.
 *
 * Consumido por: js/engine/no-cook-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 */

var NO_COOK_TEMPLATES = [

  // ── Tomas principales: comida y cena ─────────────────────────────────
  // Desde el 2026-11-04 cada hueco dice qué TIPOS admite (`tipos`, ver
  // noCookTipo en serving-sizes.js): «ensalada» exige algo de ensalada, la
  // tostada de la comida no se unta de mermelada y el wrap lleva tortilla.
  // `postre`: una pieza de fruta al final, si cabe en el día.

  {
    key: "principal",
    label: "Plato preparado",
    slots: ["lunch", "dinner"],
    weight: 3,
    components: [
      { role: "principal", required: true, maxServings: 2, tipos: ["plato"] },
      { role: "veg", required: false, maxServings: 2, tipos: ["hoja", "crudo", "cocida", "ensalada_lista", "conserva_caliente"] },
      // Pan para el guiso o la tortilla; con una pizza que ya llega, lo quita scaleToTarget.
      { role: "carrier", required: false, maxServings: 2, tipos: ["pan"] },
    ],
    assembly: "Calienta el plato en el microondas siguiendo su envase y sirve la verdura al lado, tal cual.",
  },

  {
    key: "wrap",
    label: "Wrap",
    slots: ["lunch", "dinner"],
    weight: 3,
    components: [
      { role: "carrier", required: true, maxServings: 3, tipos: ["tortilla"] },
      { role: "protein", required: true, maxServings: 3, tipos: ["fiambre", "fiambre_graso", "curado", "pescado", "ahumado", "huevo", "surimi", "marisco_cocido"] },
      { role: "queso", required: false, maxServings: 2, tipos: ["queso", "queso_fresco", "queso_rallado"] },
      { role: "veg", required: false, maxServings: 2, tipos: ["hoja", "crudo", "conserva"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Extiende la tortilla, reparte el queso, pon encima el fiambre y la verdura, y enrolla.",
  },

  {
    key: "bocadillo",
    label: "Bocadillo",
    slots: ["lunch", "dinner"],
    weight: 3,
    components: [
      { role: "carrier", required: true, maxServings: 3, tipos: ["pan", "pan_bollo"] },
      { role: "protein", required: true, maxServings: 3, tipos: ["fiambre", "fiambre_graso", "curado", "embutido", "salchicha", "pescado", "ahumado", "anchoa", "huevo"] },
      { role: "queso", required: false, maxServings: 2, tipos: ["queso", "queso_fresco", "queso_fuerte"] },
      { role: "veg", required: false, maxServings: 2, tipos: ["hoja", "crudo", "conserva", "cocida"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Abre el pan, pon el fiambre y el queso dentro, añade la verdura y ciérralo.",
  },

  {
    key: "ensalada_completa",
    label: "Ensalada completa",
    slots: ["lunch", "dinner"],
    weight: 2,
    components: [
      // La base es de ensalada de verdad: ni guisantes de lata ni macedonia.
      { role: "veg", required: true, maxServings: 2, tipos: ["hoja", "ensalada_lista", "crudo"] },
      // Nada de chorizo ni salchichas en una ensalada.
      { role: "protein", required: true, maxServings: 3, tipos: ["pescado", "huevo", "fiambre", "ahumado", "surimi", "marisco_cocido", "anchoa"] },
      { role: "queso", required: false, maxServings: 2, tipos: ["queso", "queso_fresco", "queso_rallado", "queso_fuerte"] },
      // Con pan: una ensalada sola no es una comida.
      { role: "carrier", required: true, maxServings: 3, tipos: ["pan", "tostado", "picos"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Vuelca la bolsa de ensalada en un bol, añade la proteína y el queso por encima, mezcla y acompáñala con el pan.",
  },

  {
    // 2026-11-04: un bote de garbanzos o de lentejas cocidas es la base de
    // una ensalada fría, no un «plato preparado» que se come solo.
    key: "ensalada_legumbre",
    label: "Ensalada de legumbres",
    slots: ["lunch", "dinner"],
    weight: 2,
    components: [
      { role: "legumbre", required: true, maxServings: 2 },
      // Con su pescado o su huevo: la legumbre sola no hace la comida completa.
      { role: "protein", required: true, maxServings: 2, tipos: ["pescado", "huevo", "ahumado", "anchoa"] },
      { role: "veg", required: false, maxServings: 2, tipos: ["crudo", "conserva", "hoja"] },
      { role: "carrier", required: false, maxServings: 2, tipos: ["pan", "tostado", "picos"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Escurre y enjuaga la legumbre, échala en un bol con el pescado o el huevo y la verdura, y mezcla.",
  },

  {
    // 2026-11-04: el arroz cocido de microondas y la patata cocida de bote,
    // con proteína y verdura por encima.
    key: "bol",
    label: "Bol de arroz o patata",
    slots: ["lunch", "dinner"],
    weight: 2,
    components: [
      { role: "base", required: true, maxServings: 3 },
      { role: "protein", required: true, maxServings: 3, tipos: ["pescado", "huevo", "fiambre", "marisco_cocido", "surimi", "ahumado"] },
      { role: "veg", required: false, maxServings: 2, tipos: ["conserva", "conserva_caliente", "crudo", "cocida"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Calienta el arroz en el microondas (o escurre las patatas cocidas), ponlo en un bol y añade encima la proteína y la verdura.",
  },

  {
    key: "sopa_y_bocado",
    label: "Crema con pan",
    slots: ["lunch", "dinner"],
    weight: 1,
    components: [
      { role: "sopa", required: true, maxServings: 2 },
      { role: "carrier", required: true, maxServings: 3, tipos: ["pan", "tostado", "picos"] },
      // La proteína es OBLIGATORIA: "crema y pan" es la misma clase de
      // no-comida que "ensalada y tortillas". Una crema con pan y fiambre
      // sí es una cena.
      { role: "protein", required: true, maxServings: 2, tipos: ["fiambre", "fiambre_graso", "curado", "embutido", "huevo", "pescado", "ahumado"] },
      { role: "queso", required: false, maxServings: 2, tipos: ["queso", "queso_fresco", "queso_fuerte"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Calienta la crema en el microondas (fría si es gazpacho) y acompáñala con el pan, el fiambre y el queso.",
  },

  {
    key: "tostada_completa",
    label: "Tostadas",
    slots: ["lunch", "dinner"],
    weight: 1,
    components: [
      { role: "carrier", required: true, maxServings: 3, tipos: ["pan", "tostado"] },
      // Lo dulce (mermelada, crema de cacao) es del desayuno, no de unas
      // tostadas con atún o chorizo.
      { role: "untable", required: true, maxServings: 2, tipos: ["tomate", "grasa", "queso_untable", "pate", "hummus"] },
      { role: "protein", required: true, maxServings: 3, tipos: ["fiambre", "fiambre_graso", "curado", "embutido", "pescado", "ahumado", "anchoa", "huevo"] },
      { role: "veg", required: false, maxServings: 2, tipos: ["crudo", "hoja", "conserva", "cocida"] },
      { role: "fruta", required: false, maxServings: 1, postre: true, tipos: ["fruta", "fruta_conserva"] },
    ],
    assembly: "Unta el pan, reparte la proteína por encima y añade la verdura sin más.",
  },

  // ── Desayuno ─────────────────────────────────────────────────────────

  {
    key: "desayuno_cereal",
    label: "Cereales con lácteo",
    slots: ["breakfast"],
    weight: 3,
    components: [
      { role: "cereal", required: true, maxServings: 3 },
      { role: "lacteo", required: true, maxServings: 3 },
      { role: "fruta", required: false, maxServings: 2 },
    ],
    assembly: "Echa los cereales en un bol, cúbrelos con el lácteo y añade la fruta.",
  },

  {
    key: "desayuno_tostada",
    label: "Tostadas de desayuno",
    slots: ["breakfast"],
    weight: 3,
    components: [
      { role: "carrier", required: true, maxServings: 3, tipos: ["pan", "tostado"] },
      { role: "untable", required: true, maxServings: 2, tipos: ["dulce", "grasa", "tomate", "queso_untable"] },
      { role: "lacteo", required: false, maxServings: 1 },
      { role: "fruta", required: false, maxServings: 2 },
    ],
    assembly: "Unta el pan, y acompáñalo con el lácteo y la fruta.",
  },

  {
    key: "desayuno_salado",
    label: "Desayuno salado",
    slots: ["breakfast"],
    weight: 2,
    components: [
      { role: "carrier", required: true, maxServings: 3, tipos: ["pan", "tostado"] },
      // Ni sardinas ni salchichas para desayunar.
      { role: "protein", required: true, maxServings: 2, tipos: ["fiambre", "curado", "huevo", "ahumado"] },
      { role: "queso", required: false, maxServings: 2, tipos: ["queso", "queso_fresco"] },
      { role: "fruta", required: false, maxServings: 2 },
    ],
    assembly: "Pon el fiambre y el queso sobre el pan y come la fruta aparte.",
  },

  {
    key: "desayuno_yogur",
    label: "Yogur con fruta",
    slots: ["breakfast"],
    weight: 2,
    components: [
      { role: "lacteo", required: true, maxServings: 3 },
      { role: "fruta", required: true, maxServings: 2 },
      // Con cereales: un yogur con fruta no es un desayuno (2026-11-04).
      { role: "cereal", required: true, maxServings: 2 },
    ],
    assembly: "Abre el yogur, añade la fruta y espolvorea los cereales por encima.",
  },

  {
    // Avena remojada: los copos crudos en lácteo frío quedan arenosos, hay
    // que dejarlos ablandar. makeAhead -> nunca en el día 1, aviso cuando
    // sale (ver la nota de `makeAhead` en la cabecera). Solo en el día 2+ de
    // un plan sin cocinar de varios días.
    key: "desayuno_remojado",
    label: "Avena remojada",
    slots: ["breakfast"],
    weight: 2,
    makeAhead: true,
    components: [
      { role: "cereal", required: true, maxServings: 3 },
      { role: "lacteo", required: true, maxServings: 3 },
      { role: "fruta", required: false, maxServings: 2 },
    ],
    assembly: "LA NOCHE ANTES: mezcla los copos de avena con el yogur o la leche en un bote y déjalo en la nevera. Por la mañana remueve y añade la fruta.",
  },

  // ── Snacks ───────────────────────────────────────────────────────────

  {
    key: "snack_fruta",
    label: "Fruta y frutos secos",
    slots: ["snack", "snack2"],
    weight: 3,
    components: [
      { role: "fruta", required: true, maxServings: 2 },
      { role: "salado", required: true, maxServings: 2, tipos: ["frutos_secos"] },
    ],
    assembly: "Come la fruta con un puñado de frutos secos.",
  },

  {
    key: "snack_lacteo",
    label: "Lácteo",
    slots: ["snack", "snack2"],
    weight: 3,
    components: [
      { role: "lacteo", required: true, maxServings: 3 },
      { role: "fruta", required: false, maxServings: 2 },
      { role: "cereal", required: false, maxServings: 1 },
    ],
    assembly: "Abre el lácteo y tómatelo, con la fruta si la lleva.",
  },

  {
    key: "snack_queso",
    label: "Queso con pan",
    slots: ["snack", "snack2"],
    weight: 2,
    components: [
      { role: "queso", required: true, maxServings: 2, tipos: ["queso", "queso_fresco", "queso_fuerte"] },
      { role: "carrier", required: true, maxServings: 2, tipos: ["pan", "tostado", "picos"] },
    ],
    assembly: "Pon el queso sobre el pan o los picos.",
  },

  {
    key: "snack_dulce",
    label: "Algo dulce",
    slots: ["snack", "snack2"],
    weight: 1,
    components: [
      { role: "dulce", required: true, maxServings: 2 },
      { role: "lacteo", required: false, maxServings: 1 },
    ],
    assembly: "Directo del envase.",
  },

  {
    key: "snack_salado",
    label: "Picoteo salado",
    slots: ["snack", "snack2"],
    weight: 1,
    components: [
      { role: "salado", required: true, maxServings: 2 },
      { role: "queso", required: false, maxServings: 2 },
    ],
    assembly: "Directo del envase.",
  },
];

/**
 * Plantillas que pueden montar una toma concreta.
 *
 * @param {string} slotKey - "breakfast"|"lunch"|"dinner"|"snack"|"snack2"
 * @param {boolean} [allowMakeAhead] - si NO es true, se descartan las
 *   plantillas `makeAhead` (avena remojada): no se pueden dejar hechas la
 *   noche antes del día 1. El generador lo pone a true solo en el día 2+ de
 *   un plan de varios días (generateNoCookPlanDays).
 * @returns {object[]}
 */
function templatesForSlot(slotKey, allowMakeAhead) {
  return NO_COOK_TEMPLATES.filter(function (tpl) {
    if (tpl.slots.indexOf(slotKey) === -1) return false;
    if (tpl.makeAhead === true && allowMakeAhead !== true) return false;
    return true;
  });
}

/**
 * Todos los papeles que alguna plantilla puede pedir. Un producto cuyo rol
 * no esté aquí jamás entrará en una comida.
 * @returns {string[]}
 */
function templateRoles() {
  var seen = {};
  NO_COOK_TEMPLATES.forEach(function (tpl) {
    tpl.components.forEach(function (c) { seen[c.role] = true; });
  });
  return Object.keys(seen);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NO_COOK_TEMPLATES: NO_COOK_TEMPLATES,
    templatesForSlot: templatesForSlot,
    templateRoles: templateRoles,
  };
}

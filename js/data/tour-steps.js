/**
 * js/data/tour-steps.js
 * ─────────────────────────────────────────────────────────────────────────
 * El recorrido guiado: qué se señala, en qué orden y qué se dice.
 *
 * ── Por qué se enseña DESPUÉS del primer plan ───────────────────────────
 * Casi todo lo que hay que explicar (la lista de la compra, el horario,
 * "usar hoy") no existe en la página hasta que hay un plan generado.
 * Enseñar el recorrido antes obligaría a describir cosas invisibles, que
 * es exactamente lo que hace inútiles la mayoría de los tutoriales.
 *
 * ── Y por qué son seis y no doce ────────────────────────────────────────
 * Un recorrido que no se termina no ha enseñado nada. Aquí solo están las
 * funciones que un recién llegado no descubriría solo: las que viven
 * detrás de un botón que no dice lo que hace (la despensa), o que ni
 * siquiera parecen existir (el modo sin cocinar, los planes de varios
 * días). Lo que se explica por sí mismo -- las tarjetas de comida, los
 * macros de arriba -- no ocupa un paso.
 *
 * ── El texto ────────────────────────────────────────────────────────────
 * Cada paso dice qué es y PARA QUÉ SIRVE, en segunda persona y sin
 * vocabulario de programador. "Aquí se resuelve el estado de la despensa"
 * no le sirve a nadie; "dile lo que ya tienes en casa y no te lo hará
 * comprar otra vez" sí.
 *
 * Depende de: nada.
 *
 * Expone (globales):
 *   TOUR_STEPS → array de { id, target, title, body, optional? }
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Forma de un paso:
 *   id       string   identificador estable
 *   target   string   selector CSS del elemento REAL que se ilumina
 *   title    string   titular corto
 *   body     string   una o dos frases; qué es y para qué sirve
 *   optional boolean  si el elemento no está en pantalla, se salta sin
 *                     ruido en vez de romper el recorrido. Se usa en lo
 *                     que depende de que haya un plan generado.
 */
var TOUR_STEPS = [
  {
    id: "plan",
    target: "#mealsContainer",
    title: "Tu día de comidas",
    body: "Cinco tomas que suman las calorías y proteínas que has pedido. " +
          "Cada tarjeta trae los ingredientes con su peso y los pasos para cocinarla."
  },
  {
    id: "shopping",
    target: "#shoppingPanel",
    title: "La lista de la compra",
    body: "Todo lo del plan, agrupado y con lo que cuesta de verdad: " +
          "si una receta usa 150 g de un paquete de 600 g, aquí verás el paquete entero. " +
          "El botón de la foto abre la ficha exacta del producto en Mercadona.",
    optional: true
  },
  {
    id: "pantry",
    target: "#despensaBtn",
    title: "Lo que ya tienes en casa",
    body: "Apunta aquí el arroz que te queda o los huevos de la nevera. " +
          "Deja de aparecer en la lista de la compra y el plan se abarata, " +
          "porque solo se te cobra lo que hay que ir a comprar."
  },
  {
    id: "nocook",
    target: "#noCookBtn",
    title: "Días sin cocinar",
    body: "Para cuando no tienes cocina o no te apetece encenderla: " +
          "un día entero con cosas que se comen tal cual, sin fuego ni sartén."
  },
  {
    id: "days",
    target: "#planDays",
    title: "Comprar para varios días",
    body: "Sube esto a 3 o 7 y tendrás días distintos con una sola compra. " +
          "Suele salir más barato: los paquetes empezados rinden en varios días " +
          "en vez de sobrar en uno."
  },
  {
    id: "today",
    target: "#usePlanTodayBtn",
    title: "Fijar el plan de hoy",
    body: "Guarda este plan como el de hoy. Al volver mañana lo tendrás " +
          "esperando, con el horario de cada comida.",
    optional: true
  }
];

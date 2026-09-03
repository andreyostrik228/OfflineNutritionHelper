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
 * ── Qué entra y qué no ──────────────────────────────────────────────────
 * Un recorrido que no se termina no ha enseñado nada, así que no está todo:
 * solo lo que un recién llegado NO descubriría solo. Entra lo que vive
 * detrás de un botón que no dice lo que hace (la despensa), detrás de un
 * desplegable cerrado (las recetas, el catálogo), o lo que ni siquiera
 * parece existir (el modo sin cocinar, los planes de varios días).
 *
 * Sigue fuera lo que se explica solo: los macros de arriba, "Resetear", el
 * botón de la foto (ya se cuenta en el paso de la compra), las flechas del
 * carrusel -- se ven y se entienden -- y las notas del plan, que son un
 * recuadro con título y texto corriente.
 *
 * ── Por qué pasó de seis a once (2026-09-03) ────────────────────────────
 * El usuario avisó de que "не у всех функций есть туториал". Repasando la
 * página función por función, faltaban cinco cosas y las cinco cumplían el
 * criterio de arriba, no eran relleno:
 *
 *   - las RECETAS viven dentro de un <details> CERRADO en cada tarjeta, y
 *     son la razón de ser de media aplicación (su hermana no supo cocinar
 *     nada: los platos eran cortos, lo que faltaba eran las instrucciones);
 *   - "↻ Cambiar" mide 81x22 px y nadie adivina que re-tira UNA sola toma;
 *   - las horas del horario parecen decoración, y se pueden PULSAR;
 *   - el catálogo de productos es otro <details> cerrado, con 2.994
 *     productos y sus precios dentro;
 *   - "Mis planes" guarda los días confirmados y deja marcar lo comido.
 *
 * Once pasos es mucho para un recorrido. Si algún día se ve que la gente lo
 * abandona a la mitad, lo primero que sobra es el horario, y después "Mis
 * planes": son los dos menos escondidos de los cinco.
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
 *   dynamic  boolean  el objetivo lo pinta el JavaScript, así que NO está
 *                     en index.html y no puede llevar un id (hay uno por
 *                     tarjeta de comida). Estos apuntan a `[data-tour="..."]`,
 *                     un ancla puesta a propósito para el recorrido en
 *                     js/ui/render.js: apuntar a la clase CSS ataría el
 *                     tutorial a la maquetación y al renombrarla el paso
 *                     iluminaría un hueco sin que nada avisara. Un paso
 *                     `dynamic` tiene que ser además `optional`, porque su
 *                     elemento no existe hasta que hay un plan.
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
    id: "recipe",
    // Un <details> CERRADO dentro de cada tarjeta: sin este paso hay quien
    // no llega a abrirlo nunca y cree que la aplicación solo dice QUÉ comer.
    target: "[data-tour=\"recipe\"]",
    dynamic: true,
    title: "Cómo se cocina cada plato",
    body: "Ábrelo y tienes los pasos en orden, con cantidades y tiempos. " +
          "Están escritos para quien no ha cocinado nunca, y avisan de lo que " +
          "suele salir mal antes de que salga mal.",
    optional: true
  },
  {
    id: "swap",
    target: "[data-tour=\"swap\"]",
    dynamic: true,
    title: "Cambiar solo una comida",
    body: "Si un plato no te apetece o tu Mercadona no lo tiene, re-tira esa " +
          "toma sola y el resto del día se queda como está.",
    optional: true
  },
  {
    id: "schedule",
    target: "#scheduleTimeline",
    title: "A qué hora toca cada comida",
    body: "Las horas salen de cuándo te levantas y cuándo te acuestas. " +
          "Además se pueden pulsar: cada una te lleva a su tarjeta.",
    optional: true
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
    id: "catalog",
    // Otro <details> cerrado. Dentro está TODO el catálogo con precios, que
    // es lo que se consulta cuando quieres saber cuánto cuesta algo suelto.
    target: "#verifiedPanel",
    title: "Buscar un producto suelto",
    body: "El catálogo entero de Mercadona con su precio. Busca por nombre o " +
          "marca cuando quieras comprobar cuánto cuesta algo, y el botón de la " +
          "foto te abre su ficha en la tienda.",
    optional: true
  },
  {
    id: "saved",
    target: "#todayPlansPanel",
    title: "Los días que ya has guardado",
    body: "Aquí se quedan los planes que confirmas. Puedes volver a abrirlos, " +
          "ir marcando lo que te has comido y cambiar una comida suelta.",
    optional: true
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

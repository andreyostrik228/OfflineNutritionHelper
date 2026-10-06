/**
 * js/data/tour-steps.js
 * ────────────────────────────────────────────────────────────────────────
 * El recorrido guiado: qué se señala, en qué orden y qué se dice.
 *
 * ── Por qué se enseña DESPUÉS del primer plan ───────────────────────────
 * Casi todo lo que hay que explicar (la lista de la compra, el horario,
 * "confirmar plan de hoy") no existe en la página hasta que hay un plan
 * generado. Enseñar el recorrido antes obligaría a describir cosas
 * invisibles, que es exactamente lo que hace inútiles la mayoría de los
 * tutoriales. Y no arranca solo: al terminar el cuestionario se le PREGUNTA
 * (offerTour, js/ui/tour.js) y quien dice que no no vuelve a verlo; para
 * repetirlo está «Ver la explicación otra vez».
 *
 * ── Qué entra (2026-10-06: de 11 a 18 pasos) ────────────────────────────
 * Hasta el 2026-10-05 el recorrido dejaba fuera "lo que se explica solo".
 * El dueño pidió lo contrario: que se explique TODO botón que se vaya a usar
 * a menudo -- cambiar una comida, el botón de la cámara que abre el producto
 * en Mercadona, las casillas de la compra, los días del plan, "Mis datos",
 * el menú de idioma y aspecto --, no solo lo que no se descubriría solo.
 *
 * Quedan fuera, a petición suya: "Compartir" e "Imprimir" la lista. El
 * catálogo sale en UN paso, para decir que existe y nada más.
 *
 * ── El orden: por pantalla, para que la página no salte ─────────────────
 * En el móvil cada pestaña es una pantalla distinta y el recorrido abre la
 * suya en cada paso (`tab`), así que el orden agrupa los pasos por pestaña:
 * el plan (menu), cómo cambiarlo (datos), la compra (compra), lo guardado
 * (planes) y el menú ☰. Dentro de cada pestaña los pasos van en el orden en
 * que están EN LA PANTALLA, de arriba abajo: la página solo baja, nunca da
 * saltos hacia arriba y hacia abajo. En el ordenador es una sola página y el
 * recorrido solo desplaza lo imprescindible.
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
 *   TOUR_STEPS → array de { id, target, title, body, tab?, ctx?, ... }
 * ────────────────────────────────────────────────────────────────────────
 */

/**
 * Forma de un paso:
 *   id       string   identificador estable (sin guiones: da la clave de
 *                     traducción `tour.<id>_titulo` y `tour.<id>_cuerpo`)
 *   target   string   `#id` del HTML o ancla `[data-tour="x"]` puesta a
 *                     propósito. Nunca una clase CSS: ataría el tutorial a
 *                     la maquetación (lo vigila tests/onboarding.test.js).
 *   title    string   titular corto
 *   body     string   una o dos frases; qué es y para qué sirve
 *   tab      string?  pestaña del móvil donde vive el elemento (menu,
 *                     compra, planes o datos). El recorrido la abre solo.
 *   ctx      string?  selector (se busca con `closest`) de la tarjeta o el
 *                     panel donde vive un botón pequeño. Si cabe en pantalla
 *                     se enmarca ESO y el botón se marca dentro: así se ve
 *                     DÓNDE está, no solo que existe.
 *   mobile   boolean  solo se enseña si la pantalla tiene pestañas.
 *   optional boolean  si el elemento no está en pantalla, se salta sin
 *                     ruido en vez de romper el recorrido. Se usa en lo
 *                     que depende de que haya un plan generado.
 *   dynamic  boolean  el objetivo lo pinta el JavaScript, así que NO está
 *                     en index.html y no puede llevar un id (hay uno por
 *                     tarjeta de comida). Estos apuntan a `[data-tour="..."]`,
 *                     un ancla puesta a propósito para el recorrido: apuntar
 *                     a la clase CSS ataría el tutorial a la maquetación y al
 *                     renombrarla el paso iluminaría un hueco sin que nada
 *                     avisara. Un paso `dynamic` tiene que ser además
 *                     `optional`, porque su elemento no existe hasta que hay
 *                     un plan.
 */
var TOUR_STEPS = [
  // ── El plan (pestaña Menú), de arriba abajo en la pantalla ─────────────
  {
    id: "editdata",
    tab: "menu",
    mobile: true,
    target: "[data-tour=\"editdata\"]",
    ctx: ".resumen-datos",
    dynamic: true,
    optional: true,
    title: "Cambiar tus datos",
    body: "Aquí ves con qué datos se hizo el plan. «Cambiar mis datos» te lleva " +
          "al formulario para ajustar edad, peso, objetivo o presupuesto."
  },
  {
    id: "macros",
    tab: "menu",
    target: "#summaryGrid",
    title: "Calorías y macros",
    body: "Arriba, lo que necesitas; debajo, lo que suma de verdad el plan " +
          "que se ha generado. Si los dos números se parecen, el plan cuadra."
  },
  {
    id: "schedule",
    tab: "menu",
    target: "#scheduleTimeline",
    optional: true,
    title: "A qué hora toca cada comida",
    body: "Las horas salen de cuándo te levantas y cuándo te acuestas. " +
          "Pulsa una hora y te lleva a su tarjeta."
  },
  {
    id: "carousel",
    tab: "menu",
    target: "#daysCarouselBar",
    optional: true,
    title: "Cambiar de día",
    body: "Si el plan es de varios días, desliza la pantalla hacia los lados, " +
          "toca los puntos o usa las flechas (en el ordenador) para ver cada día."
  },
  {
    id: "plan",
    tab: "menu",
    target: "[data-tour=\"meal\"]",
    dynamic: true,
    optional: true,
    title: "Tu día de comidas",
    body: "Cada tarjeta es una comida del día, con su hora, los ingredientes " +
          "con su peso y lo que cuesta. Juntas suman las calorías y la " +
          "proteína que has pedido."
  },
  {
    id: "swap",
    tab: "menu",
    target: "[data-tour=\"swap\"]",
    ctx: ".meal-head",
    dynamic: true,
    optional: true,
    title: "Cambiar solo una comida",
    body: "Pulsa «Cambiar» si un plato no te apetece o tu Mercadona no lo " +
          "tiene: se cambia esa comida sola y el resto del día se queda como está."
  },
  {
    id: "recipe",
    tab: "menu",
    // Un <details> CERRADO dentro de cada tarjeta: sin este paso hay quien
    // no llega a abrirlo nunca y cree que la aplicación solo dice QUÉ comer.
    target: "[data-tour=\"recipe\"]",
    ctx: ".meal-steps",
    dynamic: true,
    optional: true,
    title: "Cómo se cocina cada plato",
    body: "Pulsa «Cómo se hace» y tendrás los pasos en orden, con cantidades " +
          "y tiempos. Están escritos para quien no ha cocinado nunca y avisan " +
          "de lo que suele salir mal antes de que salga mal."
  },

  // ── Cómo cambiar el plan (pestaña Mis datos), de arriba abajo ──────────
  {
    id: "days",
    tab: "datos",
    target: "#planDays",
    title: "Comprar para varios días",
    body: "Elige 1, 3 o 7 días. Con más días la compra sale más barata por día: " +
          "los paquetes empezados rinden en varios días en vez de sobrar en uno."
  },
  {
    id: "generate",
    tab: "datos",
    target: "#generatePlanBtn",
    title: "Generar un plan nuevo",
    body: "Cuando cambies algo de tus datos, pulsa «Generar plan» y se calcula " +
          "otro menú con lo nuevo."
  },
  {
    id: "nocook",
    tab: "datos",
    target: "#noCookBtn",
    ctx: ".actions-secondary",
    title: "Días sin cocinar",
    body: "Para cuando no tienes cocina o no te apetece encenderla: un día " +
          "entero con cosas que se comen tal cual, sin fuego ni sartén."
  },
  {
    id: "pantry",
    tab: "datos",
    target: "#despensaBtn",
    ctx: ".actions-secondary",
    title: "Lo que ya tienes en casa",
    body: "Apunta aquí el arroz que te queda o los huevos de la nevera. " +
          "Dejan de aparecer en la lista de la compra y el plan se abarata, " +
          "porque solo se te cobra lo que hay que ir a comprar."
  },

  // ── La compra (pestaña Compra) ──────────────────────────────────────────
  {
    id: "shopping",
    tab: "compra",
    target: "#shoppingPanel",
    optional: true,
    title: "La lista de la compra",
    body: "Todo lo del plan, agrupado y con lo que cuesta de verdad: si una " +
          "receta usa 150 g de un paquete de 600 g, aquí verás el paquete entero."
  },
  {
    id: "check",
    tab: "compra",
    target: "[data-tour=\"check\"]",
    ctx: ".shopping-item",
    dynamic: true,
    optional: true,
    title: "Marca lo que vas cogiendo",
    body: "Toca una fila cuando la metas en el carro: se tacha y baja al final. " +
          "Arriba ves cuánto te falta, y lo marcado se queda guardado."
  },
  {
    id: "photo",
    tab: "compra",
    target: "[data-tour=\"photo\"]",
    ctx: ".shopping-item",
    dynamic: true,
    optional: true,
    title: "Ver el producto en Mercadona",
    body: "El botón de la cámara abre la ficha exacta de ese producto en " +
          "Mercadona, con su foto, para que lo reconozcas en la estantería."
  },
  {
    id: "today",
    tab: "compra",
    target: "#usePlanTodayBtn",
    ctx: ".shopping-panel__actions",
    optional: true,
    title: "Confirmar el plan de hoy",
    body: "Guarda este plan como el de hoy. Al volver mañana lo tendrás " +
          "esperando, con el horario de cada comida."
  },
  {
    id: "catalog",
    tab: "compra",
    // Otro <details> cerrado. El dueño pidió solo decir que existe.
    target: "#verifiedPanel",
    optional: true,
    title: "El catálogo de Mercadona",
    body: "Debajo está el catálogo entero con sus precios, por si quieres " +
          "mirar cuánto cuesta algo suelto. Se abre y se busca por nombre o marca."
  },

  // ── Lo guardado (pestaña Mis planes) ────────────────────────────────────
  {
    id: "saved",
    tab: "planes",
    target: "#todayPlansPanel",
    optional: true,
    title: "Los días que ya has guardado",
    body: "Aquí se quedan los planes que confirmas. Puedes volver a abrirlos, " +
          "ir marcando lo que te has comido y cambiar una comida suelta."
  },

  // ── El menú (visible en todas las pestañas) ─────────────────────────────
  {
    id: "settings",
    target: "#ajustesBtn",
    ctx: ".topbar",
    title: "Idioma, aspecto y más",
    body: "En el menú ☰ cambias el idioma y el aspecto de la aplicación, y " +
          "puedes volver a ver este recorrido cuando quieras."
  }
];

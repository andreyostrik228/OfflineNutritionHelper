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
 * ── Qué entra (2026-10-07: de 18 a 10 pasos) ────────────────────────────
 * El 2026-10-06 el dueño pidió que se explicara TODO botón de uso frecuente y
 * el recorrido pasó de 11 a 18 pasos. El 2026-10-07 pidió lo contrario: "más
 * corto y más chulo". Se quedó en 10 uniendo lo que va junto, sin dejar de
 * nombrar ningún botón: el carrusel de días y el horario se explican en la
 * tarjeta de la comida; las casillas de la compra y el catálogo, en la lista
 * de la compra; los días del plan y "Cambiar mis datos", en "Generar plan";
 * la despensa, junto a "Sin cocinar"; y Mis planes, en "Confirmar plan de
 * hoy". Siguen fuera "Compartir" e "Imprimir".
 *
 * Los pasos con botón llevan `tap: true` (el recorrido le pone un dedo
 * pulsando encima). Sin emojis: el dueño los descartó el 2026-10-07 ("иишные
 * смайлики"); la insignia de la tarjeta lleva el número del paso.
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
 *   tap      boolean  el objetivo es un botón: se le pone un dedo pulsando
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
  // ── El plan (pestaña Menú) ─────────────────────────────────────────────
  {
    id: "macros",
    tab: "menu",
    target: "#summaryGrid",
    title: "Tus calorías y macros",
    body: "Arriba, lo que necesita tu cuerpo; debajo, lo que suma el plan. Si los dos números se parecen, el plan cuadra."
  },
  {
    id: "plan",
    tab: "menu",
    target: "[data-tour=\"meal\"]",
    dynamic: true,
    optional: true,
    title: "Tu día, comida a comida",
    body: "Cada tarjeta trae su hora, los ingredientes con su peso y lo que cuesta. ¿Plan de varios días? Desliza hacia los lados."
  },
  {
    id: "swap",
    tab: "menu",
    tap: true,
    target: "[data-tour=\"swap\"]",
    ctx: ".meal-head",
    dynamic: true,
    optional: true,
    title: "¿No te apetece? Cámbiala",
    body: "«Cambiar» sustituye solo esa comida; el resto del día se queda como está."
  },
  {
    id: "recipe",
    tab: "menu",
    tap: true,
    target: "[data-tour=\"recipe\"]",
    ctx: ".meal-steps",
    dynamic: true,
    optional: true,
    title: "Cómo se cocina",
    body: "«Cómo se hace» abre los pasos con cantidades y tiempos, pensados para quien nunca ha cocinado."
  },

  // ── La compra (pestaña Compra) ─────────────────────────────────────────
  {
    id: "shopping",
    tab: "compra",
    target: "#shoppingPanel",
    optional: true,
    title: "La compra, lista",
    body: "Todo el plan agrupado y con su precio real. Toca una fila al meterla en el carro y se tacha. Más abajo, el catálogo de Mercadona."
  },
  {
    id: "photo",
    tab: "compra",
    tap: true,
    target: "[data-tour=\"photo\"]",
    ctx: ".shopping-item",
    dynamic: true,
    optional: true,
    title: "Míralo antes de ir",
    body: "La cámara abre ese producto en Mercadona, con su foto, para que lo reconozcas en el estante."
  },
  {
    id: "today",
    tab: "compra",
    tap: true,
    target: "#usePlanTodayBtn",
    ctx: ".shopping-panel__actions",
    optional: true,
    title: "Guárdalo como el de hoy",
    body: "«Confirmar plan de hoy» lo guarda en Mis planes con el horario de cada comida. Mañana lo tienes esperando."
  },

  // ── Cambiar el plan (pestaña Mis datos) ────────────────────────────────
  {
    id: "generate",
    tab: "datos",
    tap: true,
    target: "#generatePlanBtn",
    title: "Cambia y genera otro",
    body: "En Mis datos ajustas peso, objetivo, presupuesto y días (1, 3 o 7). Pulsa «Generar plan» y sale un menú nuevo."
  },
  {
    id: "nocook",
    tab: "datos",
    tap: true,
    target: "#noCookBtn",
    ctx: ".actions-secondary",
    title: "Dos atajos",
    body: "«Sin cocinar» arma un día sin fuego. «Despensa» apunta lo que ya tienes: no lo compras otra vez y el plan sale más barato."
  },

  // ── El menú (visible en todas las pestañas) ────────────────────────────
  {
    id: "settings",
    tap: true,
    target: "#ajustesBtn",
    ctx: ".topbar",
    title: "Idioma, aspecto y más",
    body: "En el menú ☰ cambias el idioma y el aspecto, y repites este recorrido cuando quieras."
  }
];

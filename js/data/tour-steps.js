/**
 * js/data/tour-steps.js
 * ────────────────────────────────────────────────────────────────────────
 * El recorrido guiado: qué escenas hay, en qué orden y qué dice cada una.
 *
 * ── Qué es (2026-10-08: rehecho desde cero) ─────────────────────────────
 * Hasta el 2026-10-07 el recorrido SEÑALABA la página de verdad: oscurecía
 * todo, abría un hueco sobre el botón, desplazaba la página hasta él y, en el
 * móvil, cambiaba de pestaña. Eso era lo que «daba tirones»: cada paso movía
 * la página, un botón «pegado» a la pantalla (position: sticky) no se dejaba
 * llevar, y encima pedía un plan ya pintado -- sin él, «Ver la explicación otra
 * vez» te echaba a la bienvenida.
 *
 * Ahora es una hoja a pantalla completa con ESCENAS animadas (js/ui/tour-
 * scenes.js): una maqueta de cada pantalla, hecha con los mismos colores y
 * tipografías de la aplicación, en la que un dedo pulsa los botones. No toca
 * la página ni depende de que haya un plan, y se ve igual en los diez
 * aspectos.
 *
 * ── Qué entra ───────────────────────────────────────────────────────────
 * Cada botón que se usa a menudo sale en alguna escena: el plan y sus macros,
 * los planes de 1 a 7 días (y lo que sobra de un día, que aprovechan los
 * siguientes), «Cambiar», «Cómo se hace» y «No me gusta», las casillas de la
 * compra, la cámara de Mercadona, «Confirmar plan de hoy», los datos y
 * «Generar plan», «Para quién es el menú», «Sin cocinar» y la despensa,
 * «Entrenamientos» y el menú del idioma y el aspecto. Siguen fuera
 * «Compartir» e «Imprimir» (pedido del dueño).
 *
 * 2026-10-28: puesto al día con lo que se añadió después del 2026-10-08
 * (días de 1 a 7, sobras entre días, «No me gusta», la familia, el plan sin
 * cocinar entero, la despensa por sitios y entrenamientos). Once escenas: el
 * tope de los tests es doce, y un recorrido que no se termina no enseña nada.
 *
 * ── El texto ────────────────────────────────────────────────────────────
 * Cada escena dice qué es y PARA QUÉ SIRVE, en segunda persona, corto y sin
 * vocabulario de programador. Las traducciones viven en js/i18n/<idioma>.js:
 * `tour.<id>_titulo` y `tour.<id>_cuerpo` para el titular y el texto, y
 * `tour.m_<clave>` para cada palabra de las maquetas (TOUR_MOCK). Una clave
 * que falta cae al español de aquí.
 *
 * Depende de: nada.
 *
 * Expone (globales):
 *   TOUR_STEPS → array de { id, title, body }; `id` es UNA palabra y da la
 *                clave de la escena en TOUR_SCENES (js/ui/tour-scenes.js)
 *   TOUR_MOCK  → { clave: texto español de las maquetas }
 * ────────────────────────────────────────────────────────────────────────
 */

var TOUR_STEPS = [
  {
    id: "plan",
    title: "Tu plan, medido",
    body: "Arriba, las calorías y macros que necesitas; debajo, cada comida del " +
          "día con su hora, sus ingredientes y su precio."
  },
  {
    id: "dias",
    title: "Planes de 1 a 7 días",
    body: "Desliza para ver cada día. Con más días, cada uno sale más barato: " +
          "lo que sobra de un envase lo aprovechan los días siguientes."
  },
  {
    id: "cambiar",
    title: "Cámbialo o aprende a cocinarlo",
    body: "«Cambiar» sustituye solo esa comida. «Cómo se hace» abre los pasos. " +
          "«No me gusta» quita ese producto de tus planes."
  },
  {
    id: "compra",
    title: "La compra, lista y con precio",
    body: "Todo el plan agrupado, con lo que cuesta de verdad. Toca un producto " +
          "al meterlo en el carro y se tacha: lo marcado se guarda."
  },
  {
    id: "mercadona",
    title: "Míralo antes de ir",
    body: "La cámara abre ese producto en Mercadona, con su foto, para que lo " +
          "reconozcas en el estante."
  },
  {
    id: "hoy",
    title: "Guarda tu día",
    body: "«Confirmar plan de hoy» lo guarda en Mis planes con el horario de cada " +
          "comida. Mañana lo tienes esperando."
  },
  {
    id: "generar",
    title: "Cambia tus datos y genera otro",
    body: "En Mis datos ajustas peso, objetivo, presupuesto y días. Pulsa " +
          "«Generar plan» y sale un menú nuevo."
  },
  {
    id: "casa",
    title: "Un menú para toda la casa",
    body: "En «Para quién es el menú» añades a tu familia o a invitados: un menú " +
          "para todos o cada uno el suyo, y una sola compra para la casa."
  },
  {
    id: "atajos",
    title: "Dos atajos que ahorran",
    body: "«Sin cocinar» arma un plan entero sin fuego. «Despensa» apunta lo que ya " +
          "tienes en la nevera, el congelador o el armario: no lo compras otra vez."
  },
  {
    id: "entrenos",
    title: "También para entrenar",
    body: "Arriba, «Entrenamientos» abre tu plan de ejercicio: lo que toca hoy, las " +
          "series que anotas y tu progreso. Tiene su propia explicación."
  },
  {
    id: "menu",
    title: "Idioma, aspecto y más",
    body: "En el menú ☰ cambias el idioma y el aspecto, y puedes repetir este " +
          "recorrido cuando quieras."
  }
];

/** El español de las palabras que salen DENTRO de las maquetas. */
var TOUR_MOCK = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
  plato1: "Bol de avena con plátano",
  plato1_meta: "650 kcal · 1,20 €",
  plato2: "Tortitas con crema de cacahuete",
  plato2_meta: "710 kcal · 1,45 €",
  crema: "Crema de cacahuete",
  hambre: "Si te quedas con hambre",
  persona: "Ana",
  paso1: "Pon la avena con la leche",
  paso2: "Calienta dos minutos",
  paso3: "Añade el plátano en rodajas",
  total: "Compra",
  faltan: "Faltan",
  avena: "Avena",
  platanos: "Plátanos",
  leche: "Leche",
  huevos: "Huevos",
  sardinas: "Sardinas en lata",
  guardado: "Guardado",
  tab_menu: "Menú",
  tab_compra: "Compra",
  tab_planes: "Mis planes",
  tab_datos: "Mis datos",
  peso: "Peso",
  objetivo: "Objetivo",
  gana: "Ganar músculo",
  presupuesto: "Presupuesto",
  por_dia: "al día",
  dias_plan: "Días de plan",
  sin_cocinar: "Sin cocinar",
  despensa: "Despensa",
  sin_fuego: "Sin fuego",
  arroz: "Arroz",
  repetir: "Ver la explicación otra vez"
};

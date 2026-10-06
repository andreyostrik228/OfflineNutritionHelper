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
 * los planes de varios días, «Cambiar» y «Cómo se hace», las casillas de la
 * compra, la cámara de Mercadona, «Confirmar plan de hoy», los datos y
 * «Generar plan», «Sin cocinar» y la despensa, y el menú del idioma y el
 * aspecto. Siguen fuera «Compartir» e «Imprimir» (pedido del dueño).
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
    title: "Planes de 1, 3 o 7 días",
    body: "Desliza hacia los lados para ver cada día. Cuantos más días, más " +
          "barata sale la compra por día."
  },
  {
    id: "cambiar",
    title: "Cámbialo o aprende a cocinarlo",
    body: "«Cambiar» sustituye solo esa comida y el resto del día se queda igual. " +
          "«Cómo se hace» abre los pasos, con cantidades y tiempos."
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
    id: "atajos",
    title: "Dos atajos que ahorran",
    body: "«Sin cocinar» arma un día sin fuego. «Despensa» apunta lo que ya tienes " +
          "en casa: no lo compras otra vez y el plan sale más barato."
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

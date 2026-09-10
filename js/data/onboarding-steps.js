/**
 * js/data/onboarding-steps.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las preguntas de la primera visita, una por pantalla.
 *
 * ── La decisión de fondo: esto es una FACHADA, no un formulario nuevo ────
 * Cada paso apunta con `field` a un control que YA EXISTE en index.html.
 * El asistente no guarda nada por su cuenta: escribe en ese control y
 * dispara su evento `change`, exactamente como si el usuario lo hubiera
 * rellenado a mano. A partir de ahí, todo el resto de la aplicación
 * (calculator.js, settings.js, el generador) funciona sin enterarse de que
 * existe un alta guiada.
 *
 * La alternativa -- que el asistente tuviera su propio estado y luego lo
 * "volcara" al formulario -- es la que se pudre: dos sitios donde vive el
 * mismo dato, dos listas de opciones que hay que acordarse de cambiar a la
 * vez, y un día el asistente ofrece "Ganar músculo" mientras el motor ya
 * solo entiende "bulk". Por eso hay un test que comprueba, contra el HTML
 * de verdad, que cada `field` existe y que cada `value` es una opción
 * real: si alguien toca el formulario y se olvida de esto, salta.
 *
 * ── Por qué ahora son 15 y no 7 (2026-09-03) ────────────────────────────
 * Eran 7: las que el cálculo necesita para no equivocarse con las
 * calorías. El resto se dejó fuera a propósito, con el argumento de que
 * tienen un valor por defecto razonable y que preguntarlo todo por
 * adelantado era el muro que había que quitar.
 *
 * El usuario avisó de que "не все вопросы спрашивает". Y el argumento
 * viejo tenía un agujero: un valor por defecto razonable NO es lo mismo
 * que una respuesta. El plan que salía del alta usaba 35 minutos de
 * cocina, sin nada excluido y con el horario de otra persona, y eso no se
 * ve hasta que ya estás mirando un plan que no te sirve. Las ocho
 * añadidas cambian lo que sale de verdad:
 *
 *   workouts   entra en el cálculo de calorías junto con la actividad;
 *   cookTime   es un filtro DURO -- con 10 minutos desaparece medio
 *              catálogo, y era lo que más silenciosamente descuadraba;
 *   priority   cambia con qué se llenan esas calorías, en los dos motores;
 *   taste      inclina desayuno y snacks;
 *   cuisine    sesga (no filtra) hacia española o internacional;
 *   wake/sleep reparten las horas de cada toma;
 *   dislikes   descarta lo que no te vas a comer -- la única que puede
 *              dejarse VACÍA, porque "me vale todo" es una respuesta.
 *
 * Sigue sin preguntarse lo que no cambia el plan de hoy (los días del
 * plan, que se eligen al generarlo) ni lo que no es una pregunta de
 * perfil. Si algún día se ve que la gente abandona el alta, lo primero
 * que sobra es `cuisine`, que solo sesga.
 *
 * Depende de: nada.
 *
 * Expone (globales):
 *   ONBOARDING_STEPS  → array de pasos (ver la forma más abajo)
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Forma de un paso:
 *   id       string   identificador estable (para tests y analítica futura)
 *   field    string   id del control de index.html donde se escribe
 *   kind     "choice" | "number" | "time" | "text"
 *   title    string   la pregunta, en segunda persona
 *   hint     string?  una línea de ayuda; se omite si la pregunta se basta
 *   options  array?   solo en "choice": { value, label, note? }
 *   placeholder string? solo en "text": ejemplo dentro del campo
 *   min/max  number?  solo en "number": mismos límites que el <input>
 *   unit     string?  solo en "number": lo que se pinta junto al campo
 */
var ONBOARDING_STEPS = [
  {
    // PRIMERA, antes que ninguna pregunta de perfil, porque de ella depende
    // el idioma de todo lo que viene detrás: las otras doce preguntas y el
    // recorrido guiado que arranca al terminar. Preguntarla al final, o
    // dejarla solo en el menú de ajustes, obliga a leer el alta entera en
    // un idioma que a lo mejor no se entiende.
    //
    // No escribe en el formulario (`field: null`): el idioma no es un dato
    // del perfil, se guarda con saveLang(). Y las opciones no están escritas
    // aquí -- se piden a availableLangs() al pintar, para que añadir una
    // traducción la haga aparecer sola en vez de tener que acordarse de
    // tocar también este fichero.
    id: "lang",
    field: null,
    kind: "choice",
    optionsFrom: "langs",
    title: "¿En qué idioma?",
    titleKey: "ui.en_que_idioma",
    hint: "Puedes cambiarlo luego en el menú.",
    hintKey: "ui.puedes_cambiarlo_luego_en_el_menu",
    options: []
  },
  {
    id: "sex",
    field: "sex",
    kind: "choice",
    title: "¿Cuál es tu sexo?", titleKey: "ui.ob_sexo_titulo",
    hint: "Cambia la fórmula del gasto energético; no cambia nada más.", hintKey: "ui.ob_sexo_pista",
    options: [
      { value: "male", label: "Hombre", labelKey: "ui.hombre" },
      { value: "female", label: "Mujer", labelKey: "ui.mujer" }
    ]
  },
  {
    id: "age",
    field: "age",
    kind: "number",
    title: "¿Cuántos años tienes?", titleKey: "ui.ob_edad_titulo",
    min: 14,
    max: 90,
    unit: "años"
  },
  {
    id: "weight",
    field: "weight",
    kind: "number",
    title: "¿Cuánto pesas?", titleKey: "ui.ob_peso_titulo",
    hint: "Aproximado vale. Podrás cambiarlo cuando quieras.", hintKey: "ui.ob_peso_pista",
    min: 35,
    max: 250,
    step: 0.1,
    unit: "kg"
  },
  {
    id: "height",
    field: "height",
    kind: "number",
    title: "¿Cuánto mides?", titleKey: "ui.ob_altura_titulo",
    min: 130,
    max: 230,
    unit: "cm"
  },
  {
    id: "activity",
    field: "activity",
    kind: "choice",
    title: "¿Cuánto te mueves en un día normal?", titleKey: "ui.ob_actividad_titulo",
    hint: "Cuenta tu día entero, no solo el gimnasio.", hintKey: "ui.ob_actividad_pista",
    options: [
      { value: "1.2",   label: "Sedentario", labelKey: "ui.sedentario", note: "Escritorio, poco andar", noteKey: "ui.nota_actividad_sedentario" },
      { value: "1.375", label: "Ligero", labelKey: "ui.ligero",     note: "Algo de paseo diario", noteKey: "ui.nota_actividad_ligero" },
      { value: "1.55",  label: "Moderado", labelKey: "ui.moderado",   note: "En pie a ratos, o deporte 3-4 días", noteKey: "ui.nota_actividad_moderado" },
      { value: "1.725", label: "Alto", labelKey: "ui.alto",       note: "Trabajo físico, o deporte casi diario", noteKey: "ui.nota_actividad_alto" },
      { value: "1.9",   label: "Muy alto", labelKey: "ui.muy_alto",   note: "Trabajo duro más entrenamiento", noteKey: "ui.nota_actividad_muy_alto" }
    ]
  },
  {
    id: "workouts",
    field: "workouts",
    kind: "number",
    title: "¿Cuántos días entrenas a la semana?", titleKey: "ui.ob_entrenos_titulo",
    hint: "Cuenta solo el entrenamiento de verdad. Si no entrenas, pon 0.", hintKey: "ui.ob_entrenos_pista",
    min: 0,
    max: 14,
    unit: "días"
  },
  {
    id: "goal",
    field: "goal",
    kind: "choice",
    title: "¿Qué quieres conseguir?", titleKey: "ui.ob_objetivo_titulo",
    options: [
      { value: "bulk",     label: "Ganar músculo", labelKey: "ui.ganar_musculo" },
      { value: "cut",      label: "Perder grasa", labelKey: "ui.perder_grasa" },
      { value: "recomp",   label: "Recomposición", labelKey: "ui.recomposicion",  note: "Las dos cosas a la vez, más despacio", noteKey: "ui.nota_objetivo_recomp" },
      { value: "maintain", label: "Solo comer bien", labelKey: "ui.solo_comer_bien", note: "Sin objetivo de peso", noteKey: "ui.nota_objetivo_sin_objetivo" }
    ]
  },
  {
    id: "budget",
    field: "budgetMode",
    kind: "choice",
    title: "¿Cuánto quieres gastarte al día en comida?", titleKey: "ui.ob_presupuesto_titulo",
    hint: "Es el tope de la compra, no lo que te vas a comer. Se puede cambiar en cualquier momento.", hintKey: "ui.ob_presupuesto_pista",
    options: [
      { value: "minimal", label: "Muy ajustado", labelKey: "ui.muy_ajustado" },
      { value: "small",   label: "Ajustado", labelKey: "ui.ajustado" },
      { value: "medium",  label: "Equilibrado", labelKey: "ui.equilibrado" },
      { value: "high",    label: "Amplio", labelKey: "ui.amplio" }
    ]
  },
  {
    id: "cookTime",
    field: "cookTime",
    kind: "choice",
    title: "¿Cuánto tiempo tienes para cocinar?", titleKey: "ui.ob_tiempo_titulo",
    hint: "Es un filtro DURO: no saldrá ningún plato que pase de ese tiempo.", hintKey: "ui.ob_tiempo_pista",
    options: [
      { value: "10", label: "Muy poco", labelKey: "ui.muy_poco", note: "10 minutos o menos", noteKey: "ui.diez_minutos_o_menos" },
      { value: "20", label: "Poco",     labelKey: "ui.poco", note: "Hasta 20 minutos", noteKey: "ui.hasta_20_minutos" },
      { value: "35", label: "Normal",   labelKey: "ui.normal", note: "Hasta 35 minutos", noteKey: "ui.hasta_35_minutos" },
      { value: "60", label: "Amplio",   labelKey: "ui.amplio", note: "Hasta una hora", noteKey: "ui.hasta_una_hora" }
    ]
  },
  {
    id: "priority",
    field: "priority",
    kind: "choice",
    title: "¿Qué buscas al comer?", titleKey: "ui.ob_prioridad_titulo",
    hint: "Distinto del objetivo: aquel fija cuántas calorías, este con qué se llenan.", hintKey: "ui.ob_prioridad_pista",
    options: [
      { value: "balanced", label: "Equilibrado", labelKey: "ui.equilibrado" },
      { value: "satiety",  label: "Llenarme", labelKey: "ui.llenarme", note: "Más comida por euro", noteKey: "ui.mas_comida_por_euro" },
      { value: "protein",  label: "Máxima proteína", labelKey: "ui.maxima_proteina" }
    ]
  },
  {
    id: "taste",
    field: "taste",
    kind: "choice",
    title: "¿Dulce o salado?", titleKey: "ui.ob_sabor_titulo",
    hint: "Solo inclina el desayuno y los snacks; no descarta nada.", hintKey: "ui.ob_sabor_pista",
    options: [
      { value: "mixed",  label: "Mixto", labelKey: "ui.mixto", note: "Un poco de todo", noteKey: "ui.un_poco_de_todo" },
      { value: "sweet",  label: "Dulce", labelKey: "ui.dulce" },
      { value: "savory", label: "Salado", labelKey: "ui.salado" }
    ]
  },
  {
    id: "cuisine",
    field: "cuisine",
    kind: "choice",
    title: "¿Algún estilo de cocina?", titleKey: "ui.ob_cocina_titulo",
    hint: "Es una preferencia, no un filtro: sale más a menudo, pero el resto sigue apareciendo.", hintKey: "ui.ob_cocina_pista",
    options: [
      { value: "mixta",         label: "Sin preferencia", labelKey: "ui.sin_preferencia" },
      { value: "espanola",      label: "Más española", labelKey: "ui.mas_espanola" },
      { value: "internacional", label: "Más internacional", labelKey: "ui.mas_internacional" }
    ]
  },
  {
    id: "wakeTime",
    field: "wakeTime",
    kind: "time",
    title: "¿A qué hora te levantas?", titleKey: "ui.ob_despertar_titulo",
    hint: "Con esto se reparten las horas de cada comida.", hintKey: "ui.ob_despertar_pista"
  },
  {
    id: "sleepTime",
    field: "sleepTime",
    kind: "time",
    title: "¿Y a qué hora te acuestas?", titleKey: "ui.ob_dormir_titulo"
  },
  {
    id: "dislikes",
    field: "dislikes",
    kind: "text",
    title: "¿Hay algo que no te guste?", titleKey: "ui.ob_dislikes_titulo",
    hint: "Sepáralo con comas. Puedes dejarlo vacío y añadirlo después. No sirve para alergias: es una preferencia, no una comprobación de seguridad.", hintKey: "ui.ob_dislikes_pista",
    placeholder: "cebolla, queso azul, salmón"
  }
];

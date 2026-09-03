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
    id: "sex",
    field: "sex",
    kind: "choice",
    title: "¿Cuál es tu sexo?",
    hint: "Cambia la fórmula del gasto energético; no cambia nada más.",
    options: [
      { value: "male", label: "Hombre" },
      { value: "female", label: "Mujer" }
    ]
  },
  {
    id: "age",
    field: "age",
    kind: "number",
    title: "¿Cuántos años tienes?",
    min: 14,
    max: 90,
    unit: "años"
  },
  {
    id: "weight",
    field: "weight",
    kind: "number",
    title: "¿Cuánto pesas?",
    hint: "Aproximado vale. Podrás cambiarlo cuando quieras.",
    min: 35,
    max: 250,
    step: 0.1,
    unit: "kg"
  },
  {
    id: "height",
    field: "height",
    kind: "number",
    title: "¿Cuánto mides?",
    min: 130,
    max: 230,
    unit: "cm"
  },
  {
    id: "activity",
    field: "activity",
    kind: "choice",
    title: "¿Cuánto te mueves en un día normal?",
    hint: "Cuenta tu día entero, no solo el gimnasio.",
    options: [
      { value: "1.2",   label: "Sedentario", note: "Escritorio, poco andar" },
      { value: "1.375", label: "Ligero",     note: "Algo de paseo diario" },
      { value: "1.55",  label: "Moderado",   note: "En pie a ratos, o deporte 3-4 días" },
      { value: "1.725", label: "Alto",       note: "Trabajo físico, o deporte casi diario" },
      { value: "1.9",   label: "Muy alto",   note: "Trabajo duro más entrenamiento" }
    ]
  },
  {
    id: "workouts",
    field: "workouts",
    kind: "number",
    title: "¿Cuántos días entrenas a la semana?",
    hint: "Cuenta solo el entrenamiento de verdad. Si no entrenas, pon 0.",
    min: 0,
    max: 14,
    unit: "días"
  },
  {
    id: "goal",
    field: "goal",
    kind: "choice",
    title: "¿Qué quieres conseguir?",
    options: [
      { value: "bulk",     label: "Ganar músculo" },
      { value: "cut",      label: "Perder grasa" },
      { value: "recomp",   label: "Recomposición",  note: "Las dos cosas a la vez, más despacio" },
      { value: "maintain", label: "Solo comer bien", note: "Sin objetivo de peso" }
    ]
  },
  {
    id: "budget",
    field: "budgetMode",
    kind: "choice",
    title: "¿Cuánto quieres gastarte al día en comida?",
    hint: "Es el tope de la compra, no lo que te vas a comer. Se puede cambiar en cualquier momento.",
    options: [
      { value: "minimal", label: "Muy ajustado" },
      { value: "small",   label: "Ajustado" },
      { value: "medium",  label: "Equilibrado" },
      { value: "high",    label: "Amplio" }
    ]
  },
  {
    id: "cookTime",
    field: "cookTime",
    kind: "choice",
    title: "¿Cuánto tiempo tienes para cocinar?",
    hint: "Es un filtro DURO: no saldrá ningún plato que pase de ese tiempo.",
    options: [
      { value: "10", label: "Muy poco", note: "10 minutos o menos" },
      { value: "20", label: "Poco",     note: "Hasta 20 minutos" },
      { value: "35", label: "Normal",   note: "Hasta 35 minutos" },
      { value: "60", label: "Amplio",   note: "Hasta una hora" }
    ]
  },
  {
    id: "priority",
    field: "priority",
    kind: "choice",
    title: "¿Qué buscas al comer?",
    hint: "Distinto del objetivo: aquel fija cuántas calorías, este con qué se llenan.",
    options: [
      { value: "balanced", label: "Equilibrado" },
      { value: "satiety",  label: "Llenarme",         note: "Más comida por euro" },
      { value: "protein",  label: "Máxima proteína" }
    ]
  },
  {
    id: "taste",
    field: "taste",
    kind: "choice",
    title: "¿Dulce o salado?",
    hint: "Solo inclina el desayuno y los snacks; no descarta nada.",
    options: [
      { value: "mixed",  label: "Mixto", note: "Un poco de todo" },
      { value: "sweet",  label: "Dulce" },
      { value: "savory", label: "Salado" }
    ]
  },
  {
    id: "cuisine",
    field: "cuisine",
    kind: "choice",
    title: "¿Algún estilo de cocina?",
    hint: "Es una preferencia, no un filtro: sale más a menudo, pero el resto sigue apareciendo.",
    options: [
      { value: "mixta",         label: "Sin preferencia" },
      { value: "espanola",      label: "Más española" },
      { value: "internacional", label: "Más internacional" }
    ]
  },
  {
    id: "wakeTime",
    field: "wakeTime",
    kind: "time",
    title: "¿A qué hora te levantas?",
    hint: "Con esto se reparten las horas de cada comida."
  },
  {
    id: "sleepTime",
    field: "sleepTime",
    kind: "time",
    title: "¿Y a qué hora te acuestas?"
  },
  {
    id: "dislikes",
    field: "dislikes",
    kind: "text",
    title: "¿Hay algo que no te guste?",
    hint: "Sepáralo con comas. Puedes dejarlo vacío y añadirlo después. No sirve para alergias: es una preferencia, no una comprobación de seguridad.",
    placeholder: "cebolla, queso azul, salmón"
  }
];

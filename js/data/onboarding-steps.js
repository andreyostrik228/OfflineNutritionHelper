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
 * ── Por qué solo 7 preguntas de las 26 ──────────────────────────────────
 * Son las que el cálculo necesita para dar un plan correcto. Las otras 19
 * (horario, sabor, cocina, tiempo de preparación, alimentos que no
 * gustan...) tienen un valor por defecto razonable y se pueden ajustar
 * después con la aplicación ya delante. Preguntarlo todo por adelantado es
 * justo el muro que hizo falta quitar.
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
 *   kind     "choice" | "number"
 *   title    string   la pregunta, en segunda persona
 *   hint     string?  una línea de ayuda; se omite si la pregunta se basta
 *   options  array?   solo en "choice": { value, label, note? }
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
  }
];

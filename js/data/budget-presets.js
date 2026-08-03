/**
 * js/data/budget-presets.js
 * ─────────────────────────────────────────────────────────────────────────
 * Presets de presupuesto diario (Ajustado/Equilibrado/Amplio) para no
 * obligar al usuario a introducir una cifra exacta si no la tiene. NO son
 * tres números elegidos a ojo: se calibraron ejecutando priceDishAtStore()
 * (js/core/pricing.js, la misma función que ya usa dish-selector.js) sobre
 * cada plato real de DISH_DB, a ración nativa sin escalar, y combinando
 * percentiles de coste entre las 5 tomas del día (desayuno+comida+cena+
 * snack+snack2):
 *
 *   percentil combinado   coste/día   preset
 *   P10  (barato)          €4.50   -> Ajustado  (redondeado a 5, con margen)
 *   P50  (mediana)         €6.93   -> Equilibrado (redondeado a 8)
 *   P85  (generoso)        €9.85   -> Amplio    (redondeado a 12)
 *
 * El margen añadido sobre cada percentil no es arbitrario: en tiempo de
 * generación los platos se ESCALAN hasta 1.5x para acercarse al objetivo
 * calórico (MAX_PORTION_SCALE, dish-selector.js), así que el coste real de
 * un plan generado casi siempre supera el coste nativo de catálogo.
 *
 * Verificado generando planes reales con estos 3 valores sobre perfiles de
 * corte/mantenimiento/volumen (2000/2600/3400 kcal): Ajustado fuerza
 * relajación de restricciones (report.status "adjusted"/"minimal", nunca
 * "unavailable"), Equilibrado es mayormente "adjusted"/"perfect", Amplio
 * salió "perfect" (0 violaciones) en los tres perfiles probados.
 *
 * ── IMPORTANTE: son importes de USO, no de COMPRA ──────────────────────
 * `amount` alimenta `data.budget`, exactamente el mismo campo que ya
 * consumían plan-generator.js/dish-selector.js antes de que existieran
 * estos presets — es decir, sigue siendo un tope de coste de INGREDIENTES
 * REALMENTE CONSUMIDOS (usageCost), no el coste de comprar los envases
 * enteros necesarios (purchaseCost, ver js/core/pricing.js y
 * js/ui/render-shopping-list.js). Elegir "Amplio" no cambia lo que se paga
 * en caja por packaging — solo amplía qué platos puede elegir el
 * generador. Ver la cabecera de js/core/pricing.js para la distinción
 * completa.
 *
 * ── Preparado para más periodos, no solo "día" ─────────────────────────
 * BUDGET_PRESETS está indexado por periodo de planificación aunque hoy
 * solo exista "day" (el generador solo produce un día). Añadir "week" o
 * "threeDay" en el futuro es solo añadir una clave nueva aquí + un
 * selector de periodo en el UI — no requiere rediseñar el mecanismo de
 * presets/validación (js/core/calculator.js: resolveBudget()).
 *
 * Consumido por: js/core/calculator.js (resolveBudget), js/app.js (rellena
 * las etiquetas de importe en el formulario).
 * ─────────────────────────────────────────────────────────────────────────
 */

var DEFAULT_BUDGET_PERIOD = "day";

var BUDGET_PRESETS = {
  day: {
    small: {
      label: "Ajustado",
      amount: 5,
      hint: "Cubre lo esencial; el generador prioriza proteína por euro."
    },
    medium: {
      label: "Equilibrado",
      amount: 8,
      hint: "Variedad razonable la mayoría de los días."
    },
    high: {
      label: "Amplio",
      amount: 12,
      hint: "Casi cualquier plato del catálogo, sin ajustes."
    }
  }
};

/**
 * js/data/budget-presets.js
 * ─────────────────────────────────────────────────────────────────────────
 * Presets de presupuesto diario (Ajustado/Equilibrado/Amplio) para no
 * obligar al usuario a introducir una cifra exacta si no la tiene.
 *
 * ── Recalibrados 2026-08-07: son importes de COMPRA, no de uso ─────────
 * `amount` alimenta `data.budget`, que desde el rediseño del presupuesto
 * (ver js/engine/plan-generator.js, "Presupuesto: coste de compra, no de
 * uso") significa cuánto está dispuesto a pagar el usuario HOY en caja
 * (purchaseCost: paquetes reales enteros, descontando despensa) — YA NO
 * es un tope de coste de ingredientes técnicamente consumidos (usageCost).
 * Los valores anteriores (5/8/12, calibrados en 2026-08-03 contra
 * usageCost de catálogo sin escalar) se quedaron pequeños de la noche a
 * la mañana con el cambio de semántica: un plan que "cabía" en 8€ de
 * usageCost podía necesitar comprar 19€ reales en paquetes — exactamente
 * el bug que motivó el rediseño (ver STATE.md). Recalibrados aquí contra
 * el purchaseCost REAL de planes generados de verdad, no contra un precio
 * de catálogo sin escalar como antes:
 *
 *   Metodología: generateDietPlan() ejecutado 120 veces (6 perfiles
 *   corte/recomp/volumen × 20 combinaciones de tiempo de cocina/sabor),
 *   presupuesto deliberadamente generoso (50€, para que el generador NUNCA
 *   recorte por presupuesto y el purchaseCost medido sea el de un plan
 *   "natural" sin restricción) y despensa VACÍA (peor caso, usuario nuevo)
 *   — percentiles del purchaseCost real resultante:
 *
 *   percentil combinado   purchaseCost/día   preset
 *   P10  (barato)              €14.65     -> Ajustado    (15)
 *   P50  (mediana)              €20.41    -> Equilibrado (20)
 *   P85  (generoso)             €27.06    -> Amplio      (28)
 *
 * A diferencia de la calibración anterior (percentiles de coste de
 * catálogo SIN escalar, con un margen añadido a mano para compensar el
 * escalado 1.5x de las raciones), esta mide directamente el purchaseCost
 * YA con el escalado y la agregación de paquetes aplicados — no hace
 * falta añadir margen aparte, el número ya es el real.
 *
 * Verificado generando planes reales con estos 3 valores (6 perfiles × 8
 * combinaciones de tiempo de cocina = 48 corridas por preset): Ajustado
 * 25 perfect / 19 adjusted / 4 minimal (nunca "unavailable", 0 violaciones
 * de presupuesto), Equilibrado 29/15/4, Amplio 31/16/1 — mismo patrón que
 * la calibración original (Ajustado fuerza más ajuste, Amplio casi
 * siempre "perfect"), solo que ahora garantizando que "caber en el
 * preset" signifique de verdad "esto es lo que se paga en caja".
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
      amount: 15,
      hint: "Cubre lo esencial; el generador prioriza proteína por euro y puede recortar ración para no pasarse en caja."
    },
    medium: {
      label: "Equilibrado",
      amount: 20,
      hint: "Variedad razonable la mayoría de los días, sin sorpresas al pagar."
    },
    high: {
      label: "Amplio",
      amount: 28,
      hint: "Casi cualquier plato del catálogo, sin ajustes de presupuesto."
    }
  }
};

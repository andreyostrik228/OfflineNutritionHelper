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
 * ── OJO: esos importes YA NO son los de abajo (recalibrado 2026-09-01) ─
 * La tabla de arriba es de la calibración del 2026-08-07 y se conserva
 * porque explica la METODOLOGÍA (purchaseCost real, no catálogo sin
 * escalar). Los importes vigentes son 8/12/16/20 y salen del suelo real
 * del catálogo, que se documenta en el propio tramo "Muy ajustado".
 * Quien lea solo esta cabecera se irá con tres cifras que no existen.
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
    // ── Tramo "Muy ajustado" (2026-09-01) ───────────────────────────────
    // Calibrado contra el SUELO REAL del catálogo, no a ojo: se buscó por
    // beam search el día de 2.800 kcal más barato posible con la despensa
    // VACÍA y sale 7,04 € (greedy y beam coinciden, así que es el suelo de
    // verdad). Por debajo de eso no hay plan completo posible: no es el
    // precio de la comida, es el precio de ABRIR el primer paquete de cada
    // cosa -- los mismos ingredientes, ya en la despensa, cuestan 4,73 €.
    //
    // El suelo baja con el objetivo calórico: 5,14 € a 1.500 kcal,
    // 5,93 € a 2.000, 7,04 € a 2.800, 7,87 € a 3.200.
    //
    // 8 € deja un margen mínimo por encima del suelo y está MEDIDO: entrega
    // el 94% de las calorías objetivo gastando 7,70 € de mediana (40 planes,
    // perfil 80 kg/2.800 kcal). Con 5 € el generador solo alcanza el 45%.
    minimal: {
      label: "Muy ajustado",
      amount: 8,
      // "Lo más barato que da un día completo" decía antes, y era falso.
      // Medido el 2026-09-09 (120 semillas por celda, despensa vacía): con
      // 8 € ningún perfil consigue un solo día sin recortes -- 0% en los
      // tres. Y no es cosa de afinar la cifra: 9, 10 y 11 € siguen dando
      // 0% en recomposición y volumen. El salto está en 12 €, que es
      // justo el preset siguiente.
      //
      // Aun así el tramo se queda, porque quien tiene 8 € los tiene: lo
      // que cambia es lo que se le promete. El texto ahora dice qué se
      // sacrifica y dónde está la palanca de verdad, que es la despensa:
      // el gasto real de ingredientes de ese mismo día son 5,52 €, y los
      // 8 € se van en abrir paquetes enteros.
      hintKey: "ui.hint_presupuesto_muy_ajustado",
      hint: "Para cuando el tope es el tope. No llega a cubrir el día entero: repite ingredientes, quita los snacks y suele quedarse corto de proteína. Si ya tienes cosas en casa, márcalas en la despensa — ahí es donde baja el precio de verdad."
    },
    small: {
      label: "Ajustado",
      amount: 12,
      hintKey: "ui.hint_presupuesto_ajustado",
      hint: "Cubre lo esencial; el generador prioriza proteína por euro y puede recortar ración para no pasarse en caja."
    },
    medium: {
      label: "Equilibrado",
      amount: 16,
      hintKey: "ui.hint_presupuesto_equilibrado",
      hint: "Variedad razonable la mayoría de los días, sin sorpresas al pagar."
    },
    high: {
      label: "Amplio",
      amount: 20,
      hintKey: "ui.hint_presupuesto_amplio",
      hint: "Casi cualquier plato del catálogo, sin ajustes de presupuesto. Para más, usa «Cantidad exacta»."
    }
  }
};

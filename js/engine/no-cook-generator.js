/**
 * js/engine/no-cook-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 * Generador del modo "Sin cocinar": un día de comidas hecho ENTERAMENTE de
 * productos reales del catálogo, sin cocinar nada. Solo abrir, untar,
 * apilar, enrollar o microondas — nunca tabla, cuchillo de cocina ni fuego.
 *
 * ── Reescrito el 2026-09-01. Qué hacía antes y por qué no servía ────────
 * La versión anterior cogía 2-3 productos AL AZAR de una lista laxa de
 * categorías permitidas por toma. No tenía ni raciones, ni objetivo de
 * calorías, ni presupuesto, ni idea de qué combina con qué. Planes reales
 * que generó (medidos, no hipotéticos):
 *   - una "Comida" que era un refresco de naranja y un Aquarius;
 *   - una "Cena" de ensalada y tortillas de trigo, sin nada dentro;
 *   - una "Cena" de pimientos + queso con trufa + jamón ibérico de 22 €,
 *     con un coste de día de 47,39 €;
 *   - y todos los macros en pantalla eran los de por 100 g, así que una
 *     pizza de 430 g se anunciaba como "245 kcal" cuando son 1.054.
 *
 * ── Cómo funciona ahora ─────────────────────────────────────────────────
 *   1. Cada producto trae RACIÓN y PAPEL (js/data/serving-sizes.js).
 *   2. Cada toma se monta con una PLANTILLA (js/data/no-cook-templates.js):
 *      base + proteína + queso + verdura, o un plato completo, etc. Un
 *      papel `required` que no se puede rellenar descarta la plantilla, así
 *      que no salen bases sin relleno.
 *   3. Se ESCALAN raciones hacia las kcal objetivo de la toma (subir y
 *      bajar, ver scaleToTarget) en vez de servir siempre una ración.
 *   4. Se REUTILIZAN los productos ya comprados ese día antes que abrir uno
 *      nuevo: el mismo pan y el mismo queso valen para varias tomas.
 *   5. Los productos "fresh" (pizza, rosca, plato caliente) se consumen
 *      ENTEROS el mismo día: en una toma si las kcal encajan, o repartidos
 *      entre comida y cena. Nunca queda media pizza para mañana.
 *
 * Depende de:
 *   js/core/pricing.js              (getRealProductsForStore, DEFAULT_STORE_ID)
 *   js/data/no-cook-classifier.js   (classifyNoCookProduct)
 *   js/data/serving-sizes.js        (resolveServing, macrosForGrams, isPlausibleForRole)
 *   js/data/no-cook-templates.js    (templatesForSlot)
 *   js/core/preferences.js          (filterDislikedProducts, getDislikes) — opcional
 *
 * Expone (global):
 *   generateNoCookPlan(storeId, options) → { slots, poolSize, total, target,
 *                                            shoppingCost, consumedCost, productCount }
 *   generateNoCookPlanDays(storeId, options, dias) → un plan como el de arriba por día
 *   regenerateNoCookSlot(plan, slotKey, storeId, options) → { slot } | { error }
 *   noCookCuentas(dias) → { dias:[{ticket, comprados, heredado}], siguiente, lotes, envases }
 *   noCookLoteSirve(lote, dia) → si lo que sobra de ese envase se puede comer ese día
 *   noCookAplicarCuentas(dias) → los mismos días, con el ticket de cada uno
 *   noCookCompraDelPlan(dias) → { dias, compra, presupuesto } de un plan de varios días, o null
 *   noCookTechoParaCambiar(dias, d) → lo que puede comprar el día d al «Cambiar» una toma
 *
 * Se mantiene en UN archivo a propósito, aunque pase de 500 líneas: partirlo
 * en "generador del día" + "montador de una toma" se probó y salía peor --
 * el montador necesita 10 símbolos del generador y el generador llama al
 * montador, así que la separación era circular y solo funcionaba por el
 * orden de los <script>. En un proyecto sin módulos eso es una trampa, no
 * una frontera. Referencia de tamaño en este mismo repo: plan-generator.js
 * tiene 1.351 líneas y pantry.js 1.467.
 * ─────────────────────────────────────────────────────────────────────────
 */

// Reparto de calorías por toma — mismos ratios que el motor de platos
// (MEAL_DEFS en plan-generator.js), para que los dos modos repartan el día
// igual y quien alterne entre ambos no vea dos lógicas distintas.
var NO_COOK_SLOT_DEFS = [
  { key: "breakfast", label: "Desayuno", ratio: 0.24 },
  { key: "lunch",     label: "Comida",   ratio: 0.30 },
  { key: "snack",     label: "Snack 1",  ratio: 0.12 },
  { key: "dinner",    label: "Cena",     ratio: 0.23 },
  { key: "snack2",    label: "Snack 2",  ratio: 0.11 },
];

// Objetivo por defecto cuando se llama sin perfil (el botón "Sin cocinar"
// no exige rellenar el formulario). No es una recomendación nutricional:
// es un punto de partida para que las raciones salgan de tamaño humano.
var NO_COOK_DEFAULT_CALORIES = 2100;

// Margen aceptado alrededor del objetivo de una toma antes de dejar de
// escalar. Se para en raciones ENTERAS: no existe "1,4 lonchas de pavo".
var NO_COOK_KCAL_LOW = 0.92;
var NO_COOK_KCAL_HIGH = 1.10;

// ── El presupuesto es un TECHO DURO sobre el TICKET (2026-09-01) ────────
// Antes se medía contra el coste CONSUMIDO (el valor de las raciones que
// te comes hoy) y el ticket solo tenía un tope laxo de 3x. El resultado
// era honesto pero inútil: el usuario decía 14 € y en caja pagaba 25.
//
// Ahora se comporta como el motor de platos, donde `mealCap`/
// `remainingBudget` es "el ÚNICO techo real" sobre purchaseCost: si dices
// 5 €, el ticket no pasa de 5 €. Lo que sobra de cada envase sigue yendo a
// la despensa y abarata los días siguientes, pero eso ya no es una excusa
// para pasarse hoy.
//
// La reutilización es la palanca que lo hace posible: volver a usar un
// producto ya comprado cuesta 0 €, así que con presupuesto ajustado el
// plan converge solo hacia pocos productos bien aprovechados.

// Por debajo de este presupuesto diario se generan 3 tomas (desayuno,
// comida, cena) en vez de 5: con poco dinero, gastarlo en dos snacks deja
// las comidas principales flojas. Petición explícita del usuario.
var NO_COOK_MIN_BUDGET_FOR_SNACKS = 8;

// A partir de estos productos distintos en el día, los componentes
// OPCIONALES de una plantilla dejan de abrir productos nuevos: se rellenan
// solo si se puede reutilizar algo ya comprado. Los `required` NUNCA se
// saltan, así que una comida no se queda coja por este tope -- solo pierde
// el extra. Es lo que pidió el usuario: "no necesitamos un millón de
// productos al día, hay que organizar lo que tenemos".
var NO_COOK_SOFT_PRODUCT_CAP = 8;

// Raciones por componente con objetivos altos (2026-10-26). Pedido del dueño:
// «нужен план на 4000 калорий». Los `maxServings` de las plantillas están
// pensados para un día de unas 2.600 kcal. Medido ese día, con 40 días por
// caso y 20-40 €: a 4.160 kcal el 90% de los componentes acababa en su tope y
// el día se quedaba en el 82% (3.400 kcal); a 4.800, en el 71-74%. Por encima
// de esta referencia el tope crece en proporción: quien necesita 4.000 kcal
// come raciones más grandes. Por debajo no cambia nada: el tope sigue
// impidiendo «4 raciones de chorizo» en un día normal.
var NO_COOK_REF_KCAL = 2600;

/** Cuánto crece el tope de raciones para un objetivo del día (1 hasta NO_COOK_REF_KCAL). */
function noCookFactorRaciones(targetKcal) {
  return Math.max(1, (Number(targetKcal) || 0) / NO_COOK_REF_KCAL);
}

// Papeles que se reutilizan de una toma a otra. Los "fresh" nunca: un
// plato preparado se acaba, no se reparte por todo el día.
var REUSABLE_ROLES = ["carrier", "queso", "protein", "veg", "untable", "cereal", "lacteo", "fruta", "salado", "dulce", "sopa"];

// ── Variedad dentro del día y entre días (2026-11-06) ───────────────────
// Queja del dueño: «каждый день я ем по сути одно и то же утром днём и
// вечером, на следующий день также». Medido en 108 planes de 3 días: en el
// 68% de los días un mismo producto salía en 3 tomas o más (el mismo
// melocotón en almíbar en desayuno, comida, snack y cena), comida y cena
// compartían algo en el 77% y los dos snacks eran idénticos en el 20%. La
// causa era la regla 1 de pickForRole: lo ya comprado hoy se reutilizaba
// SIEMPRE antes que nada, así que el día giraba alrededor de 5-6 productos.
//
// Ahora un producto sale como mucho en NO_COOK_VECES_AL_DIA tomas del día (el
// pan, en dos: tostada por la mañana y bocadillo por la noche es normal), y
// no vuelve a la misma toma que ayer (ni a la comida lo de la cena de ayer:
// son dos tomas seguidas). Antes de repetir se usa lo que sobra de otros días
// y hoy aún no ha salido, y después algo nuevo que quepa en el presupuesto;
// solo si no queda otra se repite (_repetirLoPagado). El presupuesto sigue
// siendo el techo: antes repetir que pasarse.
var NO_COOK_VECES_AL_DIA = { carrier: 2 };

// Lo nuevo que se compra SOLO por variedad sale de la parte del presupuesto de
// su toma (pickForRole, `reservaExtra`); una proteína distinta para la cena,
// además, de esta fracción de lo apartado para las tomas que faltan. Barrido
// con 648 días (12, 15 y 20 €): con 1 (nada de lo apartado), 107 días con la
// misma proteína en comida y cena y 88 por encima del presupuesto; con 0,5,
// 86 y 92; con 0 (todo), 77 y 97. Antes del cambio: 159 y 89.
var NO_COOK_VARIEDAD_PROTEINA = 0.5;

/** En cuántas tomas del día puede salir un producto de ese papel sin que se note. */
function _vecesAlDia(role) {
  return NO_COOK_VECES_AL_DIA[role] || 1;
}

/** En cuántas tomas de hoy sale ya ese producto. */
function _vecesHoy(day, id) {
  return (day && day.vecesHoy && day.vecesHoy[id]) || 0;
}

/** Los productos que ayer salieron en la toma que se está montando: { id: true }. */
function _deAyerEnEstaToma(day) {
  var t = day && day.ayer && day.toma ? day.ayer[day.toma] : null;
  return (t && t.ids) || {};
}

/**
 * Lo que cada toma de hoy no debe repetir de esa misma toma el día anterior
 * del plan: { toma: { ids: {id: true}, plantillas: [clave] } }. Sin día
 * anterior, vacío.
 *
 * Solo la misma toma, no también la cena de ayer para la comida (como en el
 * plan con platos): aquí lo que sobra de la cena se come al día siguiente, y
 * apartándolo de la comida la comida del día 2 lo compraba todo nuevo. Medido
 * con 648 días: 107 días por encima del presupuesto con la regla, 88 sin ella
 * (antes del cambio, 89).
 * @param {object} [plan] - el día anterior (generateNoCookPlan)
 * @returns {Object}
 */
function _ayerPorToma(plan) {
  var out = {};
  ((plan && plan.slots) || []).forEach(function (s) {
    var ids = {};
    (s.items || []).forEach(function (it) { ids[it.id] = true; });
    out[s.key] = { ids: ids, plantillas: s.templateKey ? [s.templateKey] : [] };
  });
  return out;
}

/**
 * Lo que cuesta como poco una plantilla sin reutilizar nada: el envase más
 * barato de cada papel obligatorio (Infinity si alguno no tiene ninguno). Con
 * esto buildSlot ordena las plantillas en la pasada que se puede pasar del
 * presupuesto. Memo por pool: el mismo pool se consulta en cada toma del día.
 * @param {object} tpl
 * @param {object[]} pool
 * @param {boolean} principal - comida o cena (pueden llevar lo «fresh»)
 * @returns {number}
 */
function _costeMinimoDePlantilla(tpl, pool, principal) {
  var memo = pool._costeMinimoPlantilla || (pool._costeMinimoPlantilla = {});
  var clave = tpl.key + (principal ? "|p" : "|s");
  if (clave in memo) return memo[clave];
  var suma = 0;
  for (var i = 0; i < tpl.components.length && isFinite(suma); i++) {
    var c = tpl.components[i];
    if (!c.required) continue;
    var min = Infinity;
    for (var j = 0; j < pool.length; j++) {
      var e = pool[j];
      if (!e.serving || e.serving.role !== c.role || typeof e.product.price !== "number") continue;
      if (!principal && e.serving.policy === "fresh") continue;
      if (c.tipos && c.tipos.length && c.tipos.indexOf(e.tipo) === -1) continue;
      if (e.product.price < min) min = e.product.price;
    }
    suma += min;
  }
  memo[clave] = suma;
  return suma;
}

/**
 * Lo ya pagado que se repite cuando no queda otra, lo menos repetido primero:
 * lo que hoy aún cabe (solo salió ayer en esta toma), luego una vez más de lo
 * normal y, si `sinTope`, cualquiera. Sin nada de eso, null.
 * @param {object[]} lista - candidatos {entry} que pickForRole ya filtró
 * @param {string} role
 * @param {object} day
 * @param {boolean} sinTope
 * @returns {{entry:object, reused:boolean}|null}
 */
function _repetirLoPagado(lista, role, day, sinTope) {
  if (!lista || !lista.length) return null;
  var tope = _vecesAlDia(role);
  var veces = function (r) { return _vecesHoy(day, r.entry.product.id); };
  var pasos = [
    lista.filter(function (r) { return veces(r) < tope; }),
    lista.filter(function (r) { return veces(r) < tope + 1; }),
    sinTope ? lista : []
  ];
  for (var i = 0; i < pasos.length; i++) {
    var paso = pasos[i];
    if (!paso.length) continue;
    var menos = Math.min.apply(null, paso.map(veces));
    var de = paso.filter(function (r) { return veces(r) === menos; });
    return { entry: de[Math.floor(Math.random() * de.length)].entry, reused: true };
  }
  return null;
}

// ── Lo que sobra de un día sirve a los demás (2026-10-27) ───────────────
// Queja del dueño con un plan de 3 días a 4.000 kcal: «4000 из 4000, потом
// 2600 из 4000, потом 4000 из 4000», y en la despensa productos que salieron
// una vez el día 1 y ya no. Cada día se montaba como si la casa estuviera
// vacía: lo que sobraba de un envase abierto el día 1 no existía para el día
// 2, que volvía a comprar con su presupuesto y se quedaba corto.
//
// Medido antes del cambio (40 planes de 3 días a 4.000 kcal, 15 €/día): 55 de
// 120 días por debajo del 85% de las kcal, ~5.600 kcal (12,58 €) sin comer al
// acabar el plan y ~15 envases abiertos un solo día.
//
// Ahora, tres cosas:
//   1. El día N recibe lo que queda de los envases ya pagados
//      (`options.heredado`, lo calcula noCookCuentas) y lo reutiliza GRATIS
//      antes de abrir nada nuevo (pickForRole), igual que ya reutilizaba lo
//      comprado ese mismo día.
//   2. Si aun así un día se queda corto de calorías, se rellena con lo que
//      sobra y nadie más va a comer (_rellenarConSobras). Cada fila añadida
//      lleva `deSobras` (las raciones puestas) para que se vea de dónde sale.
//   3. Lo que sigue sobrando lo enseña la pantalla («si no te llenas…»,
//      js/ui/render-no-cook.js) a partir de los mismos `lotes`.
//
// Un envase abierto solo sirve los días que la TIENDA dice que aguanta
// abierto (`daysAfterOpening`, js/data/product-storage.js, vía expiry.js):
// el mismo dato y la misma regla que la caducidad de la despensa
// (resolveExpiry: abierto el día A con N días, vale hasta el A+N). Sin el
// dato, todo el plan. Lo «fresh» nunca pasa al día siguiente.

// Raciones de un mismo producto que se pueden AÑADIR a un día al rellenarlo
// con lo que sobra (con objetivos altos crece con noCookFactorRaciones). Es
// el mismo freno que `maxServings` en las plantillas: sin él, un día corto
// podía acabar con cinco raciones de chorizo porque era lo que quedaba.
var NO_COOK_EXTRA_RACIONES = 2;

// Lo que se pone de lo que sobra va a un snack; sin snacks, lo de desayunar
// al desayuno y lo demás a la toma principal más ligera.
var ROLES_DE_DESAYUNO = ["lacteo", "cereal", "fruta", "dulce", "untable"];

// Lo que se unta (paté, hummus, mermelada, margarina) no se come solo: solo
// se pone de más donde ese día ya se unta, nunca como fila suelta.
var ROLES_SOLO_CON_ALGO = ["untable"];

// Lo que sí se come suelto, en una fila nueva de un snack (2026-11-04): el
// resto solo se pone de más donde ese día ya sale.
var ROLES_SUELTOS = ["fruta", "lacteo", "salado", "dulce"];

// ── Un presupuesto para todo el plan (2026-11-06) ───────────────────────
// El dueño: «главное чтобы в день выходило столько сколько сказали, а то что
// первый день может быть 20€ а третий 5€ вообще пофиг». En un plan de N días
// lo que se cumple es la compra del plan entero, N x presupuesto, no la de cada
// día. Antes cada día tenía su propio techo, y el día 1, que no hereda nada,
// tenía que comprarlo todo con el suyo: con 12-16 € el mismo pan y el mismo
// queso salían en tres tomas, y los días 2 y 3 se quedaban por debajo de su
// presupuesto porque comían de lo que sobraba.
//
// Ahora cada día puede comprar lo que queda del plan menos lo que se aparta
// para los días que faltan, una fracción de un presupuesto por día: comen en
// parte de lo que sobra (generateNoCookPlanDays). Cuántas tomas tiene un día
// sigue saliendo del presupuesto por día, no de su techo.
//
// Con una sola fracción, medido con 270 planes de 3 días (8-20 €, 2.100-3.100
// kcal, las 3 prioridades):
//                  días con un producto  planes que pasan
//                  en 3+ tomas (día 1)   de 3 x presupuesto
//   antes (techo por día)   219 (110)           79
//   0,3                      82 (18)            61
//   0,5                     120 (48)            63
//   0,7                     152 (72)            48
//   1                       209 (110)           43
// Pero con poca reserva los días 2 y 3 se quedaban con poco dinero y comían
// menos proteína (de 0,85 a 0,82 del objetivo, de media). Por eso se hace un
// plan con cada fracción y se queda el mejor de los que caben en el
// presupuesto del plan (_notaDelPlan); si no cabe ninguno, el que menos se
// pasa. Medido con otros 270 planes, frente a antes:
//   planes que pasan de 3 x presupuesto   77 -> 13
//   días con un producto en 3+ tomas     221 -> 97
//   proteína, de media                  0,85 -> 0,92 del objetivo
//   kcal, de media                     0,963 -> 0,971 del objetivo
// Con 7 días, 0,3 dejaba al día 1 comprar hasta 4,4 presupuestos y es el que
// más planes pasaba; entre las cuatro, se elige.
var NO_COOK_RESERVAS_DIAS = [0.3, 0.5, 0.7, 1];

// Lo que pesa cada cosa al elegir entre esos planes (_notaDelPlan), por día:
// lo que falta de proteína (fracción del objetivo), lo que se aparta de las
// kcal, cada producto en 3 tomas o más y la misma proteína en comida y cena.
var NO_COOK_NOTA = { proteina: 4, kcal: 2, tresTomas: 0.5, mismaProteina: 0.25 };

/** La primera fila del día con ese producto, o null. */
function _filaDelDia(plan, id) {
  var slots = (plan && plan.slots) || [];
  for (var i = 0; i < slots.length; i++) {
    var items = slots[i].items || [];
    for (var j = 0; j < items.length; j++) if (items[j].id === id) return items[j];
  }
  return null;
}

/** ¿Sale ya este producto en alguna toma del día? */
function _saleEnElDia(plan, id) {
  return ((plan && plan.slots) || []).some(function (s) {
    return (s.items || []).some(function (it) { return it.id === id; });
  });
}

/**
 * Días que aguanta abierto un producto según la tienda, o null si no lo dice
 * (o si expiry.js no está cargado).
 * @param {string|number} id
 * @returns {number|null}
 */
function _noCookDiasAbierto(id) {
  if (typeof getStoreDaysAfterOpening !== "function") return null;
  var n = getStoreDaysAfterOpening(String(id));
  return (typeof n === "number" && isFinite(n) && n >= 0) ? n : null;
}

/**
 * Envases que hay que PAGAR para servir `usadas` raciones de un producto del
 * que ya hay `gratis` raciones pagadas otro día. Sin nada heredado es la
 * cuenta de siempre: al menos un envase.
 * @param {number} usadas
 * @param {number} gratis
 * @param {number} porEnvase
 * @returns {number}
 */
function _envasesPagados(usadas, gratis, porEnvase) {
  if (gratis > 0) return gratis < usadas ? Math.ceil((usadas - gratis) / porEnvase) : 0;
  return Math.max(1, Math.ceil(usadas / porEnvase));
}

/**
 * La cuenta de un plan sin cocinar de VARIOS días, día a día, como pasa en
 * casa: lo que sobra de un envase pagado se come otro día gratis mientras
 * aguante abierto, y cuando se acaba (o caduca) se compra otro. Es la ÚNICA
 * cuenta del ticket de cada día y de los envases de la compra: la usan el
 * generador, «Cambiar», la lista de la compra y lo que se pinta, para que no
 * haya dos cifras que puedan discrepar. Sin DOM.
 *
 * Con un solo día da lo de siempre: cada producto, sus envases enteros.
 *
 * Lo puesto de más con lo que sobra (`deSobras`, _rellenarConSobras) no
 * compra nada: sale de lo que ya hay abierto o, si el menú abre ese envase
 * otro día después, se le debe a ese envase, que lo paga ESE día y da para
 * ello. Así rellenar un día corto no mueve el ticket de ningún día.
 *
 * @param {object[]} dias - planes de generateNoCookPlan, en orden
 * @returns {{
 *   dias: {ticket:number, comprados:number, heredado:Object}[],
 *   siguiente: Object,
 *   lotes: {id:string, desde:number, hasta:number, sobra:number, item:object}[],
 *   envases: Object
 * }}
 *   `heredado`: id -> {servings, desde}, lo que hay pagado al EMPEZAR ese
 *   día; `siguiente`, lo mismo para el día de después del último.
 *   `lotes`: cada envase abierto que acaba con raciones sin comer, con los
 *   días del plan en que todavía se pueden comer (desde..hasta), el último
 *   día que se come de él (`ultimo`), los días que aguanta abierto (`n`, o
 *   null) y si es el primero de ese producto en el plan (`primero`). Si un
 *   lote sirve para comer un día lo dice noCookLoteSirve.
 *   `envases`: id -> envases que se compran en todo el plan.
 */
function noCookCuentas(dias) {
  var lista = Array.isArray(dias) ? dias : [];
  var ultimo = lista.length - 1;
  var abiertos = {};
  var vistos = {};
  var lotes = [];
  var envases = {};
  var cuentas = [];

  function cerrar(id, hasta) {
    var a = abiertos[id];
    delete abiertos[id];
    if (a && a.sobra > 1e-9) {
      lotes.push({ id: id, desde: a.desde, hasta: hasta, sobra: a.sobra, item: a.item,
        ultimo: a.ultimo, n: a.n, primero: a.primero });
    }
  }
  function caducar(d) {
    Object.keys(abiertos).forEach(function (id) {
      if (abiertos[id].vence < d) cerrar(id, abiertos[id].vence);
    });
  }
  function foto() {
    var f = {};
    Object.keys(abiertos).forEach(function (id) {
      if (abiertos[id].sobra > 1e-9) f[id] = { servings: abiertos[id].sobra, desde: abiertos[id].desde };
    });
    return f;
  }

  function abrir(id, item, desde, sobra, ultimoUso) {
    var n = _noCookDiasAbierto(id);
    abiertos[id] = {
      desde: desde, sobra: sobra, vence: n === null ? Infinity : desde + n, n: n,
      ultimo: ultimoUso, primero: !vistos[id], fresh: item.policy === "fresh", item: item
    };
  }

  // Raciones puestas de más ANTES de que el menú compre su envase: id ->
  // {servings, dia (el primero), ultimo, item}. Las paga el envase del menú.
  var deuda = {};

  lista.forEach(function (plan, d) {
    caducar(d);
    var heredado = foto();
    var uso = {};
    var orden = [];
    ((plan && plan.slots) || []).forEach(function (slot) {
      ((slot && slot.items) || []).forEach(function (it) {
        if (!it || it.id == null) return;
        if (!uso[it.id]) { uso[it.id] = { item: it, servings: 0, extras: 0 }; orden.push(it.id); }
        var s = (typeof it.servings === "number") ? it.servings : (it.quantity || 1);
        uso[it.id].servings += s;
        uso[it.id].extras += Math.min(s, it.deSobras || 0);
      });
    });

    var ticket = 0;
    var comprados = 0;
    orden.forEach(function (id) {
      var u = uso[id];
      var porEnvase = u.item.servingsPerPackage || 1;
      var a = abiertos[id];
      var gratis = a ? a.sobra : 0;

      var deLoAbierto = Math.min(u.extras, gratis);
      gratis -= deLoAbierto;
      if (a && deLoAbierto > 0) { a.sobra = gratis; a.ultimo = d; }
      if (deLoAbierto < u.extras) {
        if (!deuda[id]) deuda[id] = { servings: 0, dia: d, item: u.item };
        deuda[id].servings += u.extras - deLoAbierto;
        deuda[id].ultimo = d;
      }

      var menu = u.servings - u.extras;
      if (!(menu > 0)) return;
      var debe = deuda[id] ? deuda[id].servings : 0;
      var hoy = _envasesPagados(menu + debe, gratis, porEnvase);
      if (hoy > 0) {
        comprados++;
        envases[id] = (envases[id] || 0) + hoy;
        if (typeof u.item.price === "number") ticket += u.item.price * hoy;
        // Lo que quedaba del envase anterior se come primero: el que se abre
        // hoy es el que se queda con lo que sobre. Si ya se comió de él antes
        // (lo puesto de más), se abrió aquel día.
        abrir(id, u.item, deuda[id] ? deuda[id].dia : d, gratis + hoy * porEnvase - menu - debe, d);
      } else {
        abiertos[id].sobra = gratis - menu - debe;
        abiertos[id].ultimo = d;
      }
      delete deuda[id];
      vistos[id] = true;
    });
    // Lo «fresh» se acaba el mismo día (ver la cabecera): no pasa a mañana.
    Object.keys(abiertos).forEach(function (id) { if (abiertos[id].fresh) cerrar(id, d); });

    cuentas.push({ ticket: Math.round(ticket * 100) / 100, comprados: comprados, heredado: heredado });
  });

  // Lo debido a un envase que el menú ya no abre (p. ej. tras «Cambiar» esa
  // toma) se compra el día en que se empezó a comer.
  Object.keys(deuda).forEach(function (id) {
    var dd = deuda[id];
    var porEnvase = dd.item.servingsPerPackage || 1;
    var packs = Math.max(1, Math.ceil(dd.servings / porEnvase));
    envases[id] = (envases[id] || 0) + packs;
    var c = cuentas[dd.dia];
    c.comprados++;
    if (typeof dd.item.price === "number") c.ticket = Math.round((c.ticket + dd.item.price * packs) * 100) / 100;
    if (abiertos[id]) abiertos[id].sobra += packs * porEnvase - dd.servings;
    else abrir(id, dd.item, dd.dia, packs * porEnvase - dd.servings, dd.ultimo);
  });

  caducar(lista.length);
  var siguiente = foto();
  Object.keys(abiertos).forEach(function (id) { cerrar(id, Math.min(abiertos[id].vence, ultimo)); });

  return { dias: cuentas, siguiente: siguiente, lotes: lotes, envases: envases };
}

/**
 * ¿Se puede comer el día `d` algo de lo que sobra de este envase (un `lote`
 * de noCookCuentas)? Sí mientras está abierto y bueno (desde..hasta). Y
 * también ANTES de que el menú lo abra, si es el primer envase de ese
 * producto en el plan (la compra es una sola, al principio) y abrirlo ese
 * día no deja malo lo que el menú come de él después (`ultimo`).
 * @param {object} lote
 * @param {number} d - día del plan, desde 0
 * @returns {boolean}
 */
function noCookLoteSirve(lote, d) {
  if (!lote || !(lote.sobra >= 1)) return false;
  if (lote.desde <= d && d <= lote.hasta) return true;
  return !!lote.primero && d < lote.desde && (lote.n === null || lote.n === undefined || lote.ultimo - d <= lote.n);
}

/**
 * Pone en cada día el ticket de noCookCuentas: lo que se compra ESE día (lo
 * heredado de otro día ya está pagado), cuántos productos y si se pasa del
 * presupuesto. Muta los planes.
 *
 * En un plan de varios días el presupuesto es del plan entero (ver «Un
 * presupuesto para todo el plan»): `budgetOverrun` es lo que la compra de
 * todos los días pasa de N x presupuesto, la misma cifra en cada día. Que el
 * día 1 compre más que su presupuesto no es pasarse.
 * @param {object[]} dias
 * @returns {object[]} los mismos días
 */
function noCookAplicarCuentas(dias) {
  var lista = dias || [];
  var cuentas = noCookCuentas(lista).dias;
  lista.forEach(function (plan, d) {
    if (!plan || !cuentas[d]) return;
    plan.shoppingCost = cuentas[d].ticket;
    plan.productCount = cuentas[d].comprados;
  });
  var delPlan = noCookCompraDelPlan(lista);
  lista.forEach(function (plan) {
    if (!plan) return;
    var exceso = delPlan ? delPlan.compra - delPlan.presupuesto
      : (plan.budget ? plan.shoppingCost - plan.budget : 0);
    plan.budgetOverrun = exceso > 0.005 ? Math.round(exceso * 100) / 100 : 0;
  });
  return dias;
}

/**
 * La compra de un plan de varios días frente a su presupuesto, N x el de cada
 * día. null con un solo día o sin presupuesto.
 * @param {object[]} dias - con su `shoppingCost` ya puesto
 * @returns {{dias:number, compra:number, presupuesto:number}|null}
 */
function noCookCompraDelPlan(dias) {
  var lista = dias || [];
  if (lista.length < 2) return null;
  if (!lista.every(function (p) { return p && p.budget > 0; })) return null;
  var compra = 0, presupuesto = 0;
  lista.forEach(function (p) { compra += p.shoppingCost || 0; presupuesto += p.budget; });
  return { dias: lista.length, compra: Math.round(compra * 100) / 100, presupuesto: Math.round(presupuesto * 100) / 100 };
}

/**
 * El techo de lo que se compra hoy: el presupuesto del día o, en un plan de
 * varios días, el que le toca de la compra del plan (noCookTechoDelDia, o
 * noCookTechoParaCambiar en «Cambiar»). Nunca 0 ni negativo: un día al que ya
 * no le queda nada compra solo lo imprescindible (la última pasada de
 * buildSlot).
 * @param {number} presupuesto - por día; Infinity sin presupuesto
 * @param {number} [techo]
 * @returns {number}
 */
function _techoDelDia(presupuesto, techo) {
  if (presupuesto === Infinity || typeof techo !== "number" || !isFinite(techo)) return presupuesto;
  return Math.max(0.01, techo);
}

/**
 * Lo que puede comprar el día `d` (desde 0) de un plan de `n` días: lo que
 * queda de la compra del plan (n x presupuesto, menos lo que compran los días
 * de antes) menos lo que se aparta para los que faltan, `reserva` de un
 * presupuesto por día (NO_COOK_RESERVAS_DIAS).
 * @param {number} presupuesto - por día
 * @param {number} n
 * @param {number} d
 * @param {{ticket:number}[]} cuentas - noCookCuentas(días ya hechos).dias
 * @param {number} reserva
 * @returns {number}
 */
function noCookTechoDelDia(presupuesto, n, d, cuentas, reserva) {
  var gastado = 0;
  for (var i = 0; i < d && i < cuentas.length; i++) gastado += cuentas[i].ticket || 0;
  return n * presupuesto - gastado - reserva * presupuesto * (n - d - 1);
}

/**
 * El techo del día `d` al «Cambiar» una de sus tomas en un plan de varios
 * días: lo que deja la compra de los OTROS días tal como están. undefined con
 * un solo día o sin presupuesto (entonces manda el del día).
 * @param {object[]} dias - con su `shoppingCost` ya puesto
 * @param {number} d
 * @returns {number|undefined}
 */
function noCookTechoParaCambiar(dias, d) {
  var lista = dias || [];
  var delPlan = noCookCompraDelPlan(lista);
  if (!delPlan || !lista[d]) return undefined;
  return delPlan.presupuesto - (delPlan.compra - (lista[d].shoppingCost || 0));
}

/**
 * Lo heredado (`{id: {servings}}`, de noCookCuentas) con su entrada del pool,
 * listo para reutilizar. Fuera lo que no está en el pool (un «no me gusta»
 * puesto después), lo «fresh» y lo que no llega a una ración.
 * @returns {Object} id -> {entry, servings}
 */
function _heredadoDelPool(pool, heredado) {
  var out = {};
  if (!heredado || typeof heredado !== "object") return out;
  var porId = {};
  for (var i = 0; i < pool.length; i++) porId[pool[i].product.id] = pool[i];
  Object.keys(heredado).forEach(function (id) {
    var h = heredado[id];
    var entry = porId[id];
    if (!entry || !h || !(h.servings >= 1) || entry.serving.policy === "fresh") return;
    out[id] = { entry: entry, servings: h.servings };
  });
  return out;
}

/** Macros de una toma a partir de sus filas. */
function _totalDeToma(slot) {
  var t = emptyMacros();
  ((slot && slot.items) || []).forEach(function (it) {
    t.kcal += it.kcal || 0; t.protein += it.protein || 0; t.carbs += it.carbs || 0; t.fat += it.fat || 0;
  });
  return t;
}

/** Macros del día a partir de sus tomas. */
function _totalDelDia(plan) {
  var t = emptyMacros();
  ((plan && plan.slots) || []).forEach(function (s) { addMacros(t, s.total || _totalDeToma(s)); });
  return t;
}

/** La toma a la que va un producto que sobra y no sale ese día (ver ROLES_DE_DESAYUNO). */
function _tomaParaSobra(slots, rol) {
  function masLigera(lista) {
    return lista.reduce(function (a, s) {
      return (!a || _totalDeToma(s).kcal < _totalDeToma(a).kcal) ? s : a;
    }, null);
  }
  function deClave(claves) { return slots.filter(function (s) { return claves.indexOf(s.key) !== -1; }); }
  var snacks = deClave(["snack", "snack2"]);
  if (snacks.length) return masLigera(snacks);
  var desayuno = deClave(["breakfast"]);
  if (desayuno.length && ROLES_DE_DESAYUNO.indexOf(rol) !== -1) return desayuno[0];
  var principales = deClave(["lunch", "dinner"]);
  return masLigera(principales.length ? principales : slots);
}

/**
 * Una ración más de un producto que sobra, en el día: en su misma fila si ya
 * sale ese día, y si no, en una fila nueva (_tomaParaSobra).
 */
function _ponerRacionDeSobra(plan, entry) {
  var id = entry.product.id;
  var slots = plan.slots || [];
  for (var i = 0; i < slots.length; i++) {
    var items = slots[i].items || [];
    for (var j = 0; j < items.length; j++) {
      if (items[j].id !== id) continue;
      var it = items[j];
      var conMas = buildNoCookItem(entry, (it.servings || 0) + 1, it.buysPackage);
      Object.keys(conMas).forEach(function (k) { it[k] = conMas[k]; });
      it.deSobras = (it.deSobras || 0) + 1;
      slots[i].total = _totalDeToma(slots[i]);
      return;
    }
  }
  var destino = _tomaParaSobra(slots, entry.serving.role);
  if (!destino) return;
  var nuevo = buildNoCookItem(entry, 1, false);
  nuevo.deSobras = 1;
  destino.items = (destino.items || []).concat([nuevo]);
  destino.total = _totalDeToma(destino);
}

/**
 * Rellena con lo que sobra los días que se quedan cortos de calorías (por
 * debajo de NO_COOK_KCAL_LOW del objetivo), sin pasar de NO_COOK_KCAL_HIGH.
 *
 * Solo coge raciones que NINGÚN día va a comer (`lotes` de noCookCuentas),
 * en días en que se pueden comer (noCookLoteSirve): también antes de que el
 * menú abra ese envase (el día 1 no hereda nada y suele ser el más corto),
 * si abierto aguanta hasta lo que el menú come de él. No cambia el ticket de
 * ningún día: lo puesto de más lo paga el envase que el menú ya compraba
 * (ver noCookCuentas).
 *
 * Elige como scaleToTarget: lo que deja el día más cerca del objetivo y, si
 * va corto de proteína, lo más proteico.
 *
 * @param {object[]} planes
 * @param {object[]} pool
 * @param {{calories?:number, protein?:number}} opts
 * @returns {number} raciones añadidas
 */
function _rellenarConSobras(planes, pool, opts) {
  var objetivo = (typeof opts.calories === "number" && opts.calories > 0) ? opts.calories : NO_COOK_DEFAULT_CALORIES;
  var proteina = (typeof opts.protein === "number" && opts.protein > 0) ? opts.protein : 0;
  var tope = Math.max(1, Math.round(NO_COOK_EXTRA_RACIONES * noCookFactorRaciones(objetivo)));
  var porId = {};
  for (var i = 0; i < pool.length; i++) porId[pool[i].product.id] = pool[i];
  var lotes = noCookCuentas(planes).lotes;
  var anadidas = 0;

  planes.forEach(function (plan, d) {
    var total = _totalDelDia(plan);
    var puestas = {};
    var guard = 0;
    while (total.kcal < objetivo * NO_COOK_KCAL_LOW && guard++ < 60) {
      var corto = proteina > 0 && total.protein < proteina;
      var mejor = null;
      var mejorNota = -Infinity;
      lotes.forEach(function (lote) {
        if (!noCookLoteSirve(lote, d)) return;
        var entry = porId[lote.id];
        if (!entry || entry.serving.policy === "fresh") return;
        if ((puestas[lote.id] || 0) >= tope) return;
        if (ROLES_SOLO_CON_ALGO.indexOf(entry.serving.role) !== -1 && !_saleEnElDia(plan, entry.product.id)) return;
        // Solo lo que se come suelto entra en una fila nueva (una lata de
        // guisantes en la merienda, no), y una fila no pasa del tope de su
        // tipo (2026-11-04, _racionesQueCaben).
        var fila = _filaDelDia(plan, entry.product.id);
        if (!fila && ROLES_SUELTOS.indexOf(entry.serving.role) === -1) return;
        if (fila && _racionesQueCaben(entry, noCookFactorRaciones(objetivo)) < (fila.servings || 0) + 1) return;
        var m = servingMacros(entry, 1);
        if (!(m.kcal > 0) || objetivo * NO_COOK_KCAL_HIGH < total.kcal + m.kcal) return;
        var nota = -Math.abs(total.kcal + m.kcal - objetivo);
        if (corto) nota += (m.protein / Math.max(1, m.kcal)) * objetivo;
        if (mejorNota < nota) { mejorNota = nota; mejor = { lote: lote, entry: entry, m: m }; }
      });
      if (!mejor) break;
      _ponerRacionDeSobra(plan, mejor.entry);
      if (d < mejor.lote.desde) {
        // Se abre hoy: desde hoy vale, y caduca antes si la tienda lo dice.
        mejor.lote.desde = d;
        if (mejor.lote.n !== null && mejor.lote.n !== undefined) mejor.lote.hasta = Math.min(mejor.lote.hasta, d + mejor.lote.n);
      }
      mejor.lote.sobra -= 1;
      puestas[mejor.lote.id] = (puestas[mejor.lote.id] || 0) + 1;
      addMacros(total, mejor.m);
      if (typeof costForGrams === "function") {
        plan.consumedCost = Math.round(((plan.consumedCost || 0)
          + costForGrams(mejor.entry.product, mejor.entry.serving.servingG)) * 100) / 100;
      }
      anadidas++;
    }
    if (Object.keys(puestas).length) plan.total = _totalDelDia(plan);
  });

  return anadidas;
}

var _noCookEligiblePoolByStore = {};

/**
 * ¿Este producto tiene nutrición utilizable? Un producto sin kcal aporta
 * `null` a los totales y ocupa un hueco que podría llevar comida real
 * (medido el 2026-08-25: con Alcampo, 67% del pool no tenía kcal).
 */
function hasUsableNutrition(p) {
  return !!p && typeof p.kcal === "number" && isFinite(p.kcal) && p.kcal > 0;
}

/**
 * Pool elegible de la tienda, con ración y papel resueltos. Cacheado POR
 * TIENDA (una caché global serviría productos de la tienda anterior).
 * @param {string} [storeId]
 * @returns {object[]} entradas {product, level, unit, serving}
 */
function getNoCookEligiblePool(storeId) {
  var resolvedStoreId = storeId || (typeof DEFAULT_STORE_ID !== "undefined" ? DEFAULT_STORE_ID : "mercadona");
  if (_noCookEligiblePoolByStore[resolvedStoreId]) return _noCookEligiblePoolByStore[resolvedStoreId];

  var products = (typeof getRealProductsForStore === "function")
    ? getRealProductsForStore(resolvedStoreId)
    : (typeof REAL_PRODUCTS !== "undefined" ? REAL_PRODUCTS : []);

  var pool = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    if (!hasUsableNutrition(p)) continue;
    var classification = classifyNoCookProduct(p);
    if (!classification) continue;
    var serving = (typeof resolveServing === "function") ? resolveServing(p) : null;
    var unit = (serving && serving.unit) ? serving.unit : classification.unit;
    // Descarta emparejamientos de nutrición imposibles para el papel (el
    // "Banana" de 528 kcal/100 g que en realidad son chips de plátano).
    // Ver ROLE_KCAL_CEILING en serving-sizes.js.
    if (serving && typeof isPlausibleForRole === "function"
        && !isPlausibleForRole(p, serving.role, serving.maxKcal)) continue;
    // Sin tamaño de envase no se puede calcular ni ración ni coste: el
    // precio que trae es basura. Un solo producto del catálogo está así,
    // "Langostino cocido", con price 1084,05 EUR y size null (es el precio
    // por kilo mal capturado). Fuera.
    if (!serving || serving.packageG == null) continue;
    // Y descarta el registro que se contradice a sí mismo ("Pomelo",
    // 15 kcal con P10/C20/F10). Ver hasConsistentMacros en serving-sizes.js.
    if (typeof hasConsistentMacros === "function" && !hasConsistentMacros(p)) continue;
    // El TIPO (2026-11-04, noCookTipo en serving-sizes.js): afina el papel
    // (un bote de garbanzos pasa a ser la base de una ensalada) y deja fuera
    // lo que hay que cocinar (huevos crudos, bacón, empanados, tomate para
    // guisar) o no es comida para una toma (crema de leche para el café).
    var tipo = null;
    if (typeof noCookRolAjustado === "function" && typeof noCookTipo === "function") {
      serving.role = noCookRolAjustado(p, serving.role);
      if (serving.role) {
        tipo = noCookTipo(p, serving.role);
        if (!tipo) continue;
      }
    }
    pool.push({ product: p, level: classification.level, unit: unit, serving: serving, tipo: tipo });
  }

  _noCookEligiblePoolByStore[resolvedStoreId] = pool;
  return pool;
}

function servingMacros(entry, servings) {
  return macrosForGrams(entry.product, entry.serving.servingG * servings);
}

function addMacros(a, b) {
  a.kcal += b.kcal; a.protein += b.protein; a.carbs += b.carbs; a.fat += b.fat;
  return a;
}

function emptyMacros() {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

/**
 * Ítem final de una toma. Lleva los gramos y macros REALES de lo que se
 * come, no los de 100 g del catálogo (ver la cabecera de este archivo).
 */
function buildNoCookItem(entry, servings, buysPackage) {
  var p = entry.product;
  var sv = entry.serving;
  var grams = sv.servingG * servings;
  var m = macrosForGrams(p, grams);

  return {
    id: p.id, ean: p.ean, name: p.name, brand: p.brand,
    category: p.category, leafCategory: p.leafCategory,
    role: sv.role,
    servings: servings,
    // `quantity` se conserva como alias de `servings`: pantry.js
    // (saveNoCookPlanForToday) y los planes ya guardados lo leen con ese
    // nombre. Renombrarlo a secas habría roto la despensa en silencio.
    quantity: servings,
    servingG: sv.servingG,
    grams: Math.round(grams),
    unit: entry.unit,
    level: entry.level,
    policy: sv.policy,
    servingsPerPackage: sv.servingsPerPackage,
    // Envase entero consumido en esta toma -- lo que el usuario pidió ver
    // explícitamente para la pizza ("úsala entera, no una ración").
    wholePackage: sv.servingsPerPackage > 0 && servings >= sv.servingsPerPackage,
    size: p.size, sizeUnit: p.sizeUnit, price: p.price,
    buysPackage: !!buysPackage,
    kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
    // Procedencia de esos macros, para que la UI pueda advertir cuando son
    // una aproximación sin revisar (renderNutritionTrustBadge). Se arrastra
    // aquí porque si no, se pierde en esta frontera: el item ya no tiene
    // forma de volver al producto del catálogo, y la tarjeta acababa
    // enseñando una conjetura con la misma cara que un dato real. No
    // participa en elegir ni puntuar nada.
    nutritionSource: p.nutritionSource || null,
    nutritionConfidence: p.nutritionConfidence || null,
    needsReview: !!p.needsReview,
  };
}

/**
 * Elige una entrada del pool para un papel. Prioridad, y este orden ES la
 * funcionalidad:
 *   1. un producto YA pagado con ese papel (comprado hoy o sobrado de otro
 *      día) que hoy aún no ha salido lo que puede (_vecesAlDia) ni salió ayer
 *      en esta toma -- así se aprovecha lo abierto sin comer lo mismo en cada
 *      toma (ver «Variedad dentro del día y entre días», arriba);
 *   2. si no, uno nuevo que quepa en el presupuesto restante;
 *   3. si nada nuevo cabe: lo ya pagado aunque se repita (_repetirLoPagado);
 *   4. y si tampoco: null para un papel opcional, y el envase más barato solo
 *      si el papel es `required` (allowOverrun).
 *
 * `tipos` (2026-11-04): los tipos que admite el hueco (ver noCookTipo en
 * serving-sizes.js); sin ellos, cualquiera del papel. `yaEnLaToma`: ids que
 * esta misma toma ya lleva, para no poner el mismo producto en dos huecos.
 * `variedad`: `soloGratis` (un extra opcional que no puede abrir nada nuevo:
 * solo lo ya pagado) y `repetirSinTope` (en las últimas pasadas de buildSlot,
 * repetir lo pagado las veces que haga falta antes que pasarse).
 * @returns {{entry:object, reused:boolean}|null}
 */
function pickForRole(role, pool, day, allowFresh, allowOverrun, priorityOverride, tipos, yaEnLaToma, variedad) {
  var v = variedad || {};
  function tipoVale(e) {
    if (yaEnLaToma && yaEnLaToma[e.product.id]) return false;
    return !tipos || !tipos.length || tipos.indexOf(e.tipo) !== -1;
  }
  var repetibles = [];
  function repetir() { return _repetirLoPagado(repetibles, role, day, v.repetirSinTope === true); }
  if (REUSABLE_ROLES.indexOf(role) !== -1) {
    // Sólo se reutiliza mientras quede envase: un paquete de tortillas de
    // 5 raciones da para 5 usos hoy, no para diez. Sin este tope el
    // reaprovechamiento compraba paquetes de más del mismo producto.
    var reusable = day.order
      .map(function (id) { return day.bought[id]; })
      .filter(function (b) {
        // Lo heredado de otro día, mientras quede de lo ya pagado.
        var cabe = b && b.gratis ? b.gratis : (b ? (b.entry.serving.servingsPerPackage || 1) : 0);
        return b && b.entry.serving.role === role
          && b.entry.serving.policy !== "fresh"
          && b.servingsUsed < cabe
          && tipoVale(b.entry)
          && !(day.avoidIds && day.avoidIds[b.entry.product.id]);
      });
    // Y lo que sobró de los días anteriores y hoy aún no ha salido: también
    // gratis (ver «Lo que sobra de un día sirve a los demás»).
    Object.keys(day.heredado || {}).forEach(function (id) {
      var h = day.heredado[id];
      if (day.bought[id] || h.entry.serving.role !== role || !tipoVale(h.entry)) return;
      if (day.avoidIds && day.avoidIds[id]) return;
      reusable.push({ entry: h.entry });
    });
    if (reusable.length) {
      var tope = _vecesAlDia(role);
      var ayerAqui = _deAyerEnEstaToma(day);
      var sinRepetir = reusable.filter(function (r) {
        return _vecesHoy(day, r.entry.product.id) < tope && !ayerAqui[r.entry.product.id];
      });
      if (sinRepetir.length) {
        // Primero lo que hoy no ha salido nada (lo que sobra de otro día).
        var nuevoHoy = sinRepetir.filter(function (r) { return _vecesHoy(day, r.entry.product.id) === 0; });
        var de = nuevoHoy.length ? nuevoHoy : sinRepetir;
        return { entry: de[Math.floor(Math.random() * de.length)].entry, reused: true };
      }
      repetibles = reusable;
    }
  }
  if (v.soloGratis) return repetir();

  var candidates = [];
  var avoided = [];
  for (var i = 0; i < pool.length; i++) {
    var e = pool[i];
    if (!e.serving || e.serving.role !== role) continue;
    if (!tipoVale(e)) continue;
    if (day.bought[e.product.id]) continue;
    if (day.usedNames[e.product.name]) continue;
    if (!allowFresh && e.serving.policy === "fresh") continue;
    // `avoidIds` son los productos que la toma traía ANTES de pulsar
    // "Cambiar": el objetivo del botón es ofrecer algo DISTINTO (por
    // ejemplo porque ese producto no está en tu Mercadona), así que se
    // apartan. Se recuperan solo si sin ellos el papel no se puede llenar.
    if (day.avoidIds && day.avoidIds[e.product.id]) { avoided.push(e); continue; }
    candidates.push(e);
  }
  if (!candidates.length) candidates = avoided;
  if (!candidates.length) return repetir();

  // TECHO DURO: el envase tiene que caber en lo que queda del presupuesto.
  // Reutilizar no pasa por aquí (cuesta 0 €), así que con poco dinero el
  // plan se apoya en lo ya comprado en vez de abrir productos nuevos.
  // `pendingSpend` son los envases ya elegidos en ESTA toma pero todavía
  // sin contabilizar (se eligen todos los componentes y luego se confirman).
  // Sin sumarlo, los 4 componentes de una plantilla comprobaban el techo
  // contra el mismo `day.spent` viejo y entre los cuatro se lo saltaban:
  // era la fuga que dejaba 154 de 200 planes por encima del presupuesto.
  var committed = day.spent + (day.pendingSpend || 0);
  // Se guarda dinero para las tomas que aún no se han construido. Comida y
  // cena se montan primero y, sin esta reserva, se comían el presupuesto
  // entero y el desayuno no tenía con qué: era la última fuente de planes
  // por encima del techo.
  var cap = day.budget - (day.reserve || 0);
  // Algo nuevo SOLO por variedad (hay algo ya pagado que serviría): dentro de
  // la parte del presupuesto que le toca a esta toma (`reservaExtra`, lo de
  // las tomas que faltan por sus calorías). Sin esto la cena del día 1
  // compraba su propia verdura y su fruta y el desayuno se quedaba sin nada.
  // La proteína puede tirar de parte de lo apartado (NO_COOK_VARIEDAD_PROTEINA):
  // comida y cena con la misma es lo que más se nota.
  if (repetibles.length) {
    var apartado = (role === "protein" ? NO_COOK_VARIEDAD_PROTEINA : 1) * (day.reservaExtra || 0);
    cap = Math.min(cap, day.budget - Math.max(day.reserve || 0, apartado));
  }
  var affordable = candidates.filter(function (e) {
    if (typeof e.product.price !== "number") return true;
    return (committed + e.product.price) <= cap;
  });

  // Si NADA cabe, no se inventa dinero: solo un papel `required` justifica
  // pasarse, y aun así se coge el envase más barato que existe. El exceso
  // se reporta (budgetOverrun) en vez de esconderse.
  var from = affordable;
  if (!from.length) {
    // Antes repetir lo ya pagado que pasarse del presupuesto.
    var repetido = repetir();
    if (repetido) return repetido;
    if (!allowOverrun) return null;
    from = candidates.slice().sort(function (a, b) {
      return (a.product.price || 0) - (b.product.price || 0);
    }).slice(0, 3);
  }

  // En modo "barato" manda el precio, y se aplica ANTES que las
  // preferencias blandas (si "marca propia" o "envase grande" fueran
  // primero podrían dejar fuera justo la mejor opción).
  //
  // La métrica es COMIDA POR EURO (€ por 100 kcal del envase), no el precio
  // del envase. Ordenar por precio a secas prefería un Pan Viena de 0,40 €
  // que trae UNA ración frente a una barra de 1,19 € que trae nueve: el
  // ticket bajaba pero el plan se quedaba en 1.747 kcal de 2.600 y encima
  // dejaba 5,57 € del presupuesto sin usar. "Comer por 5 €" es comida por
  // euro, no envases baratos.
  var priority = priorityOverride || day.priority || "balanced";
  if (priority === "cheap" && from.length > 3) {
    var byValue = from.slice().sort(function (a, b) {
      return costPer100Kcal(a) - costPer100Kcal(b);
    });
    from = byValue.slice(0, Math.max(3, Math.ceil(byValue.length / 4)));
  }

  // Productos que están en CUALQUIER Mercadona. El catálogo se capturó en
  // una sola tienda y el usuario se encontró con "no disponible en tu código
  // postal"; no hay dato de disponibilidad por tienda en ninguna parte del
  // pipeline, así que la mejor aproximación honesta es la marca propia:
  // Hacendado está en todas las tiendas y es el 77% del pool con papel.
  var common = from.filter(function (e) {
    return /hacendado/i.test(e.product.brand || "") || /hacendado/i.test(e.product.name || "");
  });
  if (common.length >= 3) from = common;

  // Envases que dan para VARIAS raciones: permiten reutilizar más tarde,
  // que es lo que baja el número de productos distintos del día.
  var roomy = from.filter(function (e) { return (e.serving.servingsPerPackage || 1) >= 3; });
  if (roomy.length >= 3) from = roomy;

  // ── El eje "prioridad" (2026-09-01) ─────────────────────────────────
  // Precio y proteína están MEDIDOS como opuestos en este catálogo: elegir
  // entre el 25% más barato baja el ticket de 24,71 € a 12,93 € y la
  // proteína de 146 g a 107 g. No hay un ajuste que gane en los dos lados,
  // así que lo elige el usuario en vez de decidirlo yo por él.
  if (priority === "balanced" && from.length > 3) {
    var byPrice = from.slice().sort(function (a, b) {
      return (a.product.price || 0) - (b.product.price || 0);
    });
    from = byPrice.slice(0, Math.max(3, Math.ceil(byPrice.length / 2)));
  }

  // Sesgo de proteína, salvo en modo "barato" (ahí manda el precio). El
  // techo no es el sesgo sino el catálogo: la comida lista para comer rinde
  // ~0,11 g de proteína por kcal, así que 160 g a 2.600 kcal no se alcanza
  // sin cocinar -- la UI lo dice en vez de fingir que lo cumple.
  if (role === "protein" && priority !== "cheap" && from.length > 3) {
    var ranked = from.slice().sort(function (a, b) {
      return (b.product.protein || 0) - (a.product.protein || 0);
    });
    var share = priority === "protein" ? 5 : 3;
    from = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / share)));
  }

  // En modo "barato" el sorteo se sesga hacia el principio de la lista ya
  // ordenada por precio (r^2 concentra la probabilidad en los primeros):
  // un sorteo plano dentro del 25% más barato dejaba el ticket en 8,87 €
  // de mediana cuando el suelo real de un día coherente es 4,40 €. Sigue
  // habiendo variedad, pero lo barato sale mucho más a menudo.
  var idx = (day.priority === "cheap")
    ? Math.floor(Math.pow(Math.random(), 2) * from.length)
    : Math.floor(Math.random() * from.length);
  return { entry: from[Math.min(idx, from.length - 1)], reused: false };
}

/**
 * Coste del ENVASE por cada 100 kcal que trae. Es la medida de "comida por
 * euro": un envase caro que da para muchas raciones puede alimentar más
 * barato que uno barato de una sola ración.
 * @param {object} entry - entrada del pool
 * @returns {number} EUR/100 kcal, o Infinity si no se puede calcular
 */
function costPer100Kcal(entry) {
  var price = entry.product.price;
  if (typeof price !== "number" || !entry.serving || !entry.serving.packageG) return Infinity;
  var kcalInPackage = macrosForGrams(entry.product, entry.serving.packageG).kcal;
  if (!(kcalInPackage > 0)) return Infinity;
  return price / (kcalInPackage / 100);
}

function picksKcal(picks) {
  var k = 0;
  for (var i = 0; i < picks.length; i++) k += servingMacros(picks[i].entry, picks[i].servings).kcal;
  return k;
}

function picksProtein(picks) {
  var g = 0;
  for (var i = 0; i < picks.length; i++) g += servingMacros(picks[i].entry, picks[i].servings).protein;
  return g;
}

/**
 * Ajusta las raciones de una toma hacia su objetivo de calorías, subiendo
 * o bajando de ración en ración. Los componentes `fixed` (un envase
 * "fresh" cuyo reparto ya está decidido) no se tocan.
 *
 * Al bajar se recortan primero los componentes OPCIONALES: si hay que
 * quitar calorías, sobra antes el queso extra que la proteína que hace
 * que la comida sea una comida.
 */
// Lo que crece con un día de muchas kcal (noCookFactorRaciones): quien come
// 4.000 kcal come más pan, más arroz, más yogur, más fruta y más pescado o
// pavo. No más guisantes de lata, más chorizo ni más mermelada: eso no lo
// pide nadie por mucha hambre que tenga (2026-11-04).
var TIPOS_QUE_CRECEN = ["pan", "tortilla", "tostado", "base", "legumbre", "fruta", "lacteo", "cereal",
  "hoja", "crudo", "cocida", "ensalada_lista", "fiambre", "pescado", "huevo", "queso_fresco",
  "marisco_cocido", "surimi", "sopa", "frutos_secos"];

/**
 * Raciones de un producto que caben en UNA toma según su tipo
 * (NO_COOK_MAX_G_POR_TIPO, serving-sizes.js), o Infinity si no hay tope.
 * Nunca menos de una: si una ración ya pasa del tope, la ración manda.
 * @param {object} entry
 * @param {number} [factor] - noCookFactorRaciones del día (solo para TIPOS_QUE_CRECEN)
 */
function _racionesQueCaben(entry, factor) {
  if (typeof NO_COOK_MAX_G_POR_TIPO === "undefined" || !entry || !entry.serving) return Infinity;
  var cap = NO_COOK_MAX_G_POR_TIPO[entry.tipo];
  if (!cap || entry.serving.role === "principal" || !(entry.serving.servingG > 0)) return Infinity;
  if (1 < factor && TIPOS_QUE_CRECEN.indexOf(entry.tipo) !== -1) cap *= factor;
  return Math.max(1, Math.floor(cap / entry.serving.servingG + 1e-9));
}

function scaleToTarget(picks, target, targetProtein, factorRaciones) {
  var factor = factorRaciones > 1 ? factorRaciones : 1;
  var guard = 0;
  while (picksKcal(picks) < target * NO_COOK_KCAL_LOW && guard++ < 40) {
    var best = null, bestScore = -Infinity;
    var fallback = null, fallbackKcal = Infinity;
    var proteinShort = targetProtein > 0 && picksProtein(picks) < targetProtein;

    for (var i = 0; i < picks.length; i++) {
      var pk = picks[i];
      var tope = pk.comp.maxServings || 1;
      if (factor > 1) tope = Math.max(tope, Math.round(tope * factor));
      // Ni con muchas kcal que poner: dos latas de guisantes no se comen
      // (2026-11-04). Lo que falte lo pone otro componente u otra toma.
      tope = Math.min(tope, _racionesQueCaben(pk.entry, factor));
      if (pk.fixed || pk.servings >= tope) continue;
      var m = servingMacros(pk.entry, 1);
      if (m.kcal <= 0) continue;
      var after = picksKcal(picks) + m.kcal;

      if (after <= target * NO_COOK_KCAL_HIGH) {
        // Cuanto más cerca deje del objetivo, mejor; a igualdad, gana lo
        // que más proteína aporta cuando la toma va corta de proteína.
        var score = -Math.abs(after - target);
        if (proteinShort) score += (m.protein / Math.max(1, m.kcal)) * target;
        if (score > bestScore) { bestScore = score; best = pk; }
      } else if (m.kcal < fallbackKcal) {
        fallback = pk; fallbackKcal = m.kcal;
      }
    }

    // Si NINGUNA ración cabe sin pasarse del techo pero seguimos por
    // debajo del suelo, se añade la más pequeña igualmente: pasarse un
    // poco es mejor que dejar la toma un 30% corta. Sin este escape el
    // día entero se quedaba sistemáticamente bajo (medido: 2.242 kcal de
    // media frente a un objetivo de 2.600).
    if (!best && fallback) best = fallback;
    if (!best) break;
    best.servings++;
  }

  guard = 0;
  while (picksKcal(picks) > target * NO_COOK_KCAL_HIGH && guard++ < 40) {
    var shrinkable = picks.filter(function (pk) { return !pk.fixed && pk.servings > 1; });
    var optional = shrinkable.filter(function (pk) { return !pk.comp.required; });
    var list = optional.length ? optional : shrinkable;

    if (!list.length) {
      // Nada que reducir: se quita entero el opcional más calórico. Los
      // `required` nunca se quitan -- sin ellos deja de ser la comida que
      // la plantilla prometía.
      var dropIdx = -1, dropKcal = -1;
      for (var j = 0; j < picks.length; j++) {
        if (picks[j].fixed || picks[j].comp.required) continue;
        var k = servingMacros(picks[j].entry, picks[j].servings).kcal;
        if (k > dropKcal) { dropKcal = k; dropIdx = j; }
      }
      if (dropIdx === -1) break;
      picks.splice(dropIdx, 1);
      continue;
    }

    list.sort(function (a, b) { return servingMacros(b.entry, 1).kcal - servingMacros(a.entry, 1).kcal; });
    list[0].servings--;
  }
}

/**
 * Monta UNA toma a partir de una plantilla.
 *
 * @param {object} tpl
 * @param {object} slotDef
 * @param {number} targetKcal
 * @param {object[]} pool
 * @param {object} day
 * @param {{allowSplitFresh?:boolean}} [opts]
 * @returns {object|null} null si falta un componente `required`.
 */
function buildSlotFromTemplate(tpl, slotDef, targetKcal, pool, day, opts) {
  var allowSplitFresh = !!(opts && opts.allowSplitFresh);
  var allowOverrun = !!(opts && opts.allowOverrun);
  day.pendingSpend = 0;
  // La toma que se monta: pickForRole mira qué salió en ella ayer.
  day.toma = slotDef.key;
  var isMain = slotDef.key === "lunch" || slotDef.key === "dinner";
  var picks = [];

  // 1) Un envase "fresh" a medias de otra toma de HOY se termina aquí
  //    antes que abrir nada nuevo. Solo se acepta si la plantilla tiene un
  //    hueco de ese papel: media pizza NUNCA se cuela dentro de un wrap.
  var pending = null;
  if (isMain && day.freshPending.length) {
    for (var pi = 0; pi < day.freshPending.length; pi++) {
      var cand = day.freshPending[pi];
      var fits = tpl.components.some(function (c) { return c.role === cand.entry.serving.role; });
      if (fits) { pending = day.freshPending.splice(pi, 1)[0]; break; }
    }
  }

  for (var i = 0; i < tpl.components.length; i++) {
    var comp = tpl.components[i];

    if (pending && pending.entry.serving.role === comp.role) {
      picks.push({ entry: pending.entry, comp: comp, servings: pending.servings, fixed: true });
      pending = null;
      continue;
    }

    // Sólo comida y cena pueden abrir un plato preparado.
    var enLaToma = {};
    picks.forEach(function (pk0) { enLaToma[pk0.entry.product.id] = true; });
    // Un extra opcional que no puede abrir nada nuevo (ver justo debajo)
    // solo puede salir de lo ya pagado: se le dice a pickForRole para que
    // repita lo pagado en vez de proponer algo que luego se tira.
    var soloGratis = !comp.required &&
      (day.priority === "cheap" || day.order.length >= NO_COOK_SOFT_PRODUCT_CAP);
    var picked = pickForRole(comp.role, pool, day, isMain,
      !!comp.required && !!(opts && opts.allowOverrun),
      opts && opts.priorityOverride, comp.tipos, enLaToma,
      { soloGratis: soloGratis, repetirSinTope: !!(opts && opts.repetirSinTope) });
    if (!picked) {
      if (comp.required) { day.pendingSpend = 0; return null; }   // plantilla imposible
      continue;
    }
    // Un extra opcional no justifica abrir el producto número ocho del día
    // (ver NO_COOK_SOFT_PRODUCT_CAP). Si no se puede reutilizar algo ya
    // comprado, se deja fuera y la comida sigue completa igualmente.
    //
    // En modo "barato" el listón es total: un opcional SOLO entra si sale
    // gratis (reutilizando un envase ya abierto). Comprar un producto más
    // para un extra es justo lo que dispara el ticket.
    if (!comp.required && !picked.reused) {
      if (day.priority === "cheap") continue;
      if (day.order.length >= NO_COOK_SOFT_PRODUCT_CAP) continue;
    }
    if (!picked.reused && !day.bought[picked.entry.product.id]
        && typeof picked.entry.product.price === "number") {
      day.pendingSpend = (day.pendingSpend || 0) + picked.entry.product.price;
    }
    picks.push({ entry: picked.entry, comp: comp, servings: 1, fixed: false });
  }

  if (!picks.length) { day.pendingSpend = 0; return null; }

  // 2) Política del envase "fresh": se consume ENTERO el mismo día. Si las
  //    raciones que encajan aquí llegan al envase, se come entero ahora;
  //    si no, y esta toma admite reparto, lo que sobra queda apuntado para
  //    la otra toma principal de hoy. Nunca se guarda para mañana.
  for (var f = 0; f < picks.length; f++) {
    var pk = picks[f];
    var sv = pk.entry.serving;
    if (pk.fixed || sv.policy !== "fresh") continue;

    var perServing = servingMacros(pk.entry, 1).kcal;
    var fit = perServing > 0 ? Math.round(targetKcal / perServing) : 1;
    fit = Math.max(1, Math.min(sv.servingsPerPackage, fit));

    if (!allowSplitFresh || fit >= sv.servingsPerPackage) {
      pk.servings = sv.servingsPerPackage;             // envase entero, una toma
    } else {
      pk.servings = fit;
      day.freshPending.push({ entry: pk.entry, servings: sv.servingsPerPackage - fit });
    }
    pk.fixed = true;   // el envase manda: no se reescala por calorías
  }

  scaleToTarget(picks, targetKcal, opts && opts.targetProtein, opts && opts.factorRaciones);

  day.pendingSpend = 0;   // a partir de aquí manda `day.spent` de verdad
  var items = [];
  var total = emptyMacros();
  for (var c = 0; c < picks.length; c++) {
    var p2 = picks[c];
    var perPack = p2.entry.serving.servingsPerPackage || 1;
    var price = p2.entry.product.price;

    // TECHO DURO también al ESCALAR. Aquí estaba la fuga real del
    // presupuesto: subir a 3 raciones de un envase que trae 1 compra tres
    // envases, y eso se sumaba a `day.spent` sin comprobar nada. El pick
    // respetaba el techo y el escalado se lo saltaba -- 156 de 200 planes
    // se pasaban con 14 € de tope. Se recorta a las raciones que el dinero
    // que queda permite, nunca por debajo de una.
    var existing = day.bought[p2.entry.product.id];
    // Lo heredado de otro día (ver «Lo que sobra de un día sirve a los
    // demás»): esas raciones ya están pagadas.
    var heredado = (!existing && day.heredado && day.heredado[p2.entry.product.id]) || null;
    var gratis = existing ? (existing.gratis || 0) : (heredado ? heredado.servings : 0);
    var alreadyUsed = existing ? existing.servingsUsed : 0;
    var packsBefore = existing ? _envasesPagados(alreadyUsed, gratis, perPack) : 0;
    if (typeof price === "number" && price > 0 && day.budget !== Infinity && !allowOverrun) {
      var affordablePacks = Math.floor((day.budget - day.spent) / price) + packsBefore;
      var maxServings = Math.max(1, gratis + affordablePacks * perPack - alreadyUsed);
      if (p2.servings > maxServings) p2.servings = maxServings;
      // Las raciones de más que da un objetivo alto (noCookFactorRaciones),
      // solo con el dinero que no está apartado para las tomas que faltan
      // (`reservaExtra`: su parte del presupuesto según sus calorías). Si no,
      // la comida grande deja sin nada al resto del día y el día acaba
      // pasándose (medido el 2026-10-26: con 12 € y 4.160 kcal, de 16 a 32
      // días de 40 pasados del presupuesto).
      var base = p2.comp.maxServings || 1;
      if (!p2.fixed && p2.servings > base) {
        var apartado = Math.max(day.reserve || 0, day.reservaExtra || 0);
        var conReserva = Math.floor((day.budget - day.spent - apartado) / price) + packsBefore;
        p2.servings = Math.max(base, Math.min(p2.servings, gratis + conReserva * perPack - alreadyUsed));
      }
    }

    var buys;
    if (heredado) {
      // Entra en el día sin pagar nada: ya lo pagó el día que lo abrió.
      day.bought[p2.entry.product.id] = { entry: p2.entry, servingsUsed: 0, gratis: heredado.servings };
      day.order.push(p2.entry.product.id);
      day.usedNames[p2.entry.product.name] = true;
      buys = false;
    } else {
      buys = registerPurchase(day, p2.entry);
    }
    var bought = day.bought[p2.entry.product.id];
    packsBefore = _envasesPagados(bought.servingsUsed, bought.gratis || 0, perPack);
    bought.servingsUsed += p2.servings;
    var packsAfter = _envasesPagados(bought.servingsUsed, bought.gratis || 0, perPack);
    // Gastar más raciones de las que trae un envase significa comprar OTRO
    // envase, y eso se paga. Sin esto el presupuesto se contaba una sola
    // vez por producto y el día real acababa costando más de lo pedido
    // (medido: 18,99 € con un tope de 14 €).
    if (packsAfter > packsBefore && typeof p2.entry.product.price === "number") {
      day.spent += p2.entry.product.price * (packsAfter - packsBefore);
    }
    if (typeof costForGrams === "function") {
      day.consumed += costForGrams(p2.entry.product, p2.entry.serving.servingG * p2.servings);
    }
    items.push(buildNoCookItem(p2.entry, p2.servings, buys));
    addMacros(total, servingMacros(p2.entry, p2.servings));
  }

  // En cuántas tomas de hoy sale cada producto (ver _vecesAlDia).
  day.vecesHoy = day.vecesHoy || {};
  var contados = {};
  items.forEach(function (it) {
    if (contados[it.id]) return;
    contados[it.id] = true;
    day.vecesHoy[it.id] = (day.vecesHoy[it.id] || 0) + 1;
  });

  return {
    items: items, total: total, assembly: tpl.assembly,
    templateKey: tpl.key, templateLabel: tpl.label,
    makeAhead: tpl.makeAhead === true,
  };
}

/** Registra la compra de un producto nuevo. @returns {boolean} si es nuevo */
function registerPurchase(day, entry) {
  var id = entry.product.id;
  if (day.bought[id]) return false;
  day.bought[id] = { entry: entry, servingsUsed: 0 };
  day.order.push(id);
  day.usedNames[entry.product.name] = true;
  if (typeof entry.product.price === "number") day.spent += entry.product.price;
  return true;
}

/** Elige una plantilla al azar ponderada por `weight`. */
function pickTemplate(templates) {
  var totalWeight = templates.reduce(function (s, t) { return s + (t.weight || 1); }, 0);
  var r = Math.random() * totalWeight;
  for (var i = 0; i < templates.length; i++) {
    r -= (templates[i].weight || 1);
    if (r <= 0) return templates[i];
  }
  return templates[templates.length - 1];
}

/** Prueba plantillas hasta que una se monte entera. */
/**
 * Reserva estimada para las tomas que quedan por montar. Se apoya en el
 * envase más barato del pool: con eso una toma posterior siempre puede al
 * menos completar sus papeles obligatorios (y muchas veces ni gasta, porque
 * reutiliza lo ya comprado, que es gratis).
 */
function budgetReserveFor(remainingSlots, pool, day) {
  if (day.budget === Infinity || remainingSlots <= 0) return 0;
  if (day.minPackagePrice == null) {
    var min = Infinity;
    for (var i = 0; i < pool.length; i++) {
      var pr = pool[i].product.price;
      if (typeof pr === "number" && pr > 0 && pr < min) min = pr;
    }
    day.minPackagePrice = isFinite(min) ? min : 0;
  }
  // Dos papeles obligatorios por toma como mucho; se limita a un tercio del
  // presupuesto para no estrangular la comida y la cena.
  var reserve = day.minPackagePrice * 2 * remainingSlots;
  return Math.min(reserve, day.budget / 3);
}

function buildSlot(slotKey, targetKcal, pool, day, opts) {
  var slotDef = NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === slotKey; })[0];
  // allowMakeAhead: las plantillas "de la noche antes" (avena remojada)
  // solo entran en el día 2+ de un plan de varios días (lo pone
  // generateNoCookPlanDays) -- misma regla que los platos makeAhead del modo
  // cocinado.
  var templates = (typeof templatesForSlot === "function")
    ? templatesForSlot(slotKey, opts && opts.allowMakeAhead === true)
    : [];
  if (opts && opts.forceTemplateKey) {
    var forced = templates.filter(function (t) { return t.key === opts.forceTemplateKey; });
    if (forced.length) templates = forced;
  }
  // La cena no repite la plantilla de la comida (2026-11-04): con lo ya
  // comprado a mano, salía el mismo wrap dos veces el mismo día. El segundo
  // snack tampoco la del primero (2026-11-06).
  if (opts && opts.evitarPlantilla && !(opts.forceTemplateKey)) {
    var otras = templates.filter(function (t) { return t.key !== opts.evitarPlantilla; });
    if (otras.length) templates = otras;
  }
  // Ni la de esta toma ayer (2026-11-06; la comida, ni la de la cena de
  // ayer): ver «Variedad dentro del día y entre días», arriba.
  if (opts && opts.plantillasDeAyer && opts.plantillasDeAyer.length && !(opts.forceTemplateKey)) {
    var deHoy = templates.filter(function (t) { return opts.plantillasDeAyer.indexOf(t.key) === -1; });
    if (deHoy.length) templates = deHoy;
  }

  // CUATRO pasadas, de más a menos exigente. El presupuesto es un techo duro,
  // así que antes de saltárselo se renuncia a TODO lo demás:
  //   1. todas las plantillas, con la prioridad elegida, dentro del techo y
  //      sin repetir un producto más de una vez de lo normal en el día;
  //   2. igual, repitiendo lo ya pagado lo que haga falta (2026-11-06): antes
  //      que dejar la toma vacía o renunciar a la prioridad;
  //   3. igual, pero renunciando a la prioridad (se compra por precio):
  //      preferir proteína cara no vale un ticket incumplido;
  //   4. solo entonces, pasarse, y con el envase más barato que exista.
  //
  // Medido: con la pasada de «por precio», los planes que se pasaban del
  // presupuesto cayeron de 159/200 a una fracción, sin tocar el techo.
  var PASSES = [
    { allowOverrun: false, priorityOverride: null,    repetirSinTope: false },
    { allowOverrun: false, priorityOverride: null,    repetirSinTope: true },
    { allowOverrun: false, priorityOverride: "cheap", repetirSinTope: true },
    { allowOverrun: true,  priorityOverride: "cheap", repetirSinTope: true },
  ];
  for (var pass = 0; pass < PASSES.length; pass++) {
    var passOpts = {};
    for (var k in opts) passOpts[k] = opts[k];
    passOpts.allowOverrun = PASSES[pass].allowOverrun;
    passOpts.priorityOverride = PASSES[pass].priorityOverride;
    passOpts.repetirSinTope = PASSES[pass].repetirSinTope;

    var remaining = templates.slice();
    // En la pasada que se puede pasar del presupuesto, la plantilla más
    // barata primero (2026-11-06), no la que salga en el sorteo: si hay que
    // pasarse, lo menos posible, y muchas veces la más barata ni se pasa.
    var porPrecio = PASSES[pass].allowOverrun;
    if (porPrecio) {
      var esPrincipal = slotKey === "lunch" || slotKey === "dinner";
      remaining.sort(function (a, b) {
        return _costeMinimoDePlantilla(a, pool, esPrincipal) - _costeMinimoDePlantilla(b, pool, esPrincipal);
      });
    }
    while (remaining.length) {
      var tpl = porPrecio ? remaining[0] : pickTemplate(remaining);
      remaining = remaining.filter(function (t) { return t !== tpl; });
      var result = buildSlotFromTemplate(tpl, slotDef, targetKcal, pool, day, passOpts);
      if (result) return result;
    }
  }
  return { items: [], total: emptyMacros(), assembly: "", templateKey: null, templateLabel: null, makeAhead: false };
}


/**
 * Genera un plan "sin cocinar" completo. Nunca lanza: si una toma no se
 * puede montar con ninguna plantilla se devuelve vacía, no rompe el plan.
 *
 * @param {string} [storeId]
 * @param {{calories?:number, protein?:number, budget?:number}} [options]
 * @returns {{slots, poolSize, total, target, shoppingCost, productCount}}
 */
function _poolSinCocinar(storeId) {
  var pool = getNoCookEligiblePool(storeId);

  // "No me gusta" se aplica AQUÍ y no dentro de getNoCookEligiblePool() a
  // propósito: ese pool está cacheado por tienda y las preferencias cambian
  // sin que cambie el catálogo. Es una preferencia BLANDA. Las alergias NO
  // se filtran aquí (js/core/allergens.js: son etiqueta, nunca filtro).
  if (typeof filterDislikedProducts === "function" && typeof getDislikes === "function") {
    pool = filterDislikedProducts(pool, getDislikes());
  }
  return pool;
}

function generateNoCookPlan(storeId, options) {
  var opts = options || {};
  var pool = _poolSinCocinar(storeId);

  var targetKcal = (typeof opts.calories === "number" && opts.calories > 0)
    ? opts.calories : NO_COOK_DEFAULT_CALORIES;

  // El presupuesto por día que eligió el usuario y el TECHO de lo que se
  // compra hoy. Con un día suelto son lo mismo; en un plan de varios días el
  // techo lo pone generateNoCookPlanDays (ver «Un presupuesto para todo el
  // plan»). `day.budget` es el techo: es lo que miran pickForRole y las
  // raciones.
  var presupuesto = (typeof opts.budget === "number" && opts.budget > 0) ? opts.budget : Infinity;
  var techo = _techoDelDia(presupuesto, opts.techo);

  var day = {
    bought: {}, order: [], usedNames: {},
    spent: 0,       // ticket: envases completos que hay que comprar hoy (TECHO)
    consumed: 0,    // valor de lo que realmente se come hoy (informativo)
    // "satiety" es el nombre nuevo (2026-09-01) de lo que aquí se llamaba
    // "cheap": el mismo criterio, más comida por euro. Se aceptan los dos.
    priority: (opts.priority === "cheap" || opts.priority === "satiety") ? "cheap"
      : (opts.priority === "protein" ? "protein" : "balanced"),
    budget: techo,
    freshPending: [],
    // Lo que sobra de los días anteriores del plan, ya pagado (lo pone
    // generateNoCookPlanDays con noCookCuentas).
    heredado: _heredadoDelPool(pool, opts.heredado),
    // En cuántas tomas de hoy sale cada producto, y qué salió ayer en cada
    // toma (opts.ayer, el día anterior del plan): ver «Variedad dentro del
    // día y entre días».
    vecesHoy: {},
    ayer: _ayerPorToma(opts.ayer),
  };
  var plantillasDeAyer = function (key) { return (day.ayer[key] && day.ayer[key].plantillas) || []; };

  var targetProtein = (typeof opts.protein === "number" && opts.protein > 0) ? opts.protein : 0;
  // Lo «de la noche antes» (avena remojada) solo en el día 2+ de un plan de
  // varios días: lo decide generateNoCookPlanDays. Antes esta opción no
  // llegaba a ninguna toma y solo la miraba «Cambiar».
  var allowMakeAhead = opts.allowMakeAhead === true;

  // Con poco dinero, 3 tomas en vez de 5: repartir un presupuesto ajustado
  // entre cinco tomas deja las principales flojas y encima obliga a abrir
  // productos extra solo para los snacks. Petición explícita del usuario. Lo
  // decide el presupuesto por día, no el techo: todos los días del plan, igual.
  var slotKeys = (presupuesto < NO_COOK_MIN_BUDGET_FOR_SNACKS)
    ? ["breakfast", "lunch", "dinner"]
    : ["breakfast", "lunch", "snack", "dinner", "snack2"];
  var threeMealDay = slotKeys.length === 3;
  // Tomas que NO son comida/cena: se construyen después y absorben lo que
  // esas dos se hayan pasado (ver más abajo).
  var restKeysAll = slotKeys.filter(function (k) { return k !== "lunch" && k !== "dinner"; });
  // Las kcal del día no cambian: se reparten entre las tomas que haya, así
  // que en modo 3 tomas cada una es más grande en vez de comer menos.
  var ratioSum = slotKeys.reduce(function (a, k) {
    return a + NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === k; })[0].ratio;
  }, 0);
  var ratioFor = function (key) {
    return NO_COOK_SLOT_DEFS.filter(function (x) { return x.key === key; })[0].ratio / ratioSum;
  };
  var kcalFor = function (key) { return targetKcal * ratioFor(key); };
  var protFor = function (key) { return targetProtein * ratioFor(key); };
  var factorRaciones = noCookFactorRaciones(targetKcal);
  // La parte del presupuesto de las tomas que aún faltan, por sus calorías:
  // las raciones de más de una toma no pueden gastarla (ver arriba), ni lo
  // que se compra solo por variedad (pickForRole, 2026-11-06).
  var porMontar = slotKeys.slice();
  var apartarPara = function (key) {
    porMontar = porMontar.filter(function (k) { return k !== key; });
    day.reservaExtra = day.budget === Infinity ? 0
      : day.budget * porMontar.reduce(function (a, k) { return a + ratioFor(k); }, 0);
  };

  var built = {};

  // Comida y cena van EMPAREJADAS y primero. La comida puede abrir un
  // plato preparado y repartirlo; si lo hace, la cena queda obligada a la
  // plantilla "principal" para terminárselo. La cena, al ser la última
  // toma principal del día, nunca reparte: lo que abre, se lo acaba.
  day.reserve = budgetReserveFor(slotKeys.length - 1, pool, day);
  apartarPara("lunch");
  built.lunch = buildSlot("lunch", kcalFor("lunch"), pool, day, {
    allowSplitFresh: true, targetProtein: protFor("lunch"), allowMakeAhead: allowMakeAhead,
    factorRaciones: factorRaciones,
    plantillasDeAyer: plantillasDeAyer("lunch"),
  });
  day.reserve = budgetReserveFor(slotKeys.length - 2, pool, day);
  apartarPara("dinner");
  built.dinner = buildSlot("dinner", kcalFor("dinner"), pool, day, {
    allowSplitFresh: false,
    targetProtein: protFor("dinner"),
    forceTemplateKey: day.freshPending.length ? "principal" : null,
    evitarPlantilla: built.lunch.templateKey,
    plantillasDeAyer: plantillasDeAyer("dinner"),
    allowMakeAhead: allowMakeAhead,
    factorRaciones: factorRaciones,
  });

  // Desayuno y snacks se reparten lo que QUEDA del día, no su cuota
  // teórica. Comida y cena pueden pasarse bastante de su cuota cuando
  // abren un envase "fresh" que hay que acabarse (una pizza entera son
  // ~1.050 kcal); si el resto del día siguiera apuntando a su ratio fijo,
  // el total se disparaba -- medido: máximos de 4.059 kcal sobre un
  // objetivo de 2.600. Así el exceso se absorbe en vez de acumularse.
  var restKeys = restKeysAll;
  var restRatio = restKeys.reduce(function (a, k) { return a + ratioFor(k); }, 0);
  var usedKcal = built.lunch.total.kcal + built.dinner.total.kcal;
  var remainingKcal = Math.max(0, targetKcal - usedKcal);
  var usedProtein = built.lunch.total.protein + built.dinner.total.protein;
  var remainingProtein = Math.max(0, targetProtein - usedProtein);

  restKeys.forEach(function (key) {
    apartarPara(key);
    var share = ratioFor(key) / restRatio;
    built[key] = buildSlot(key, remainingKcal * share, pool, day, {
      allowSplitFresh: false,
      targetProtein: remainingProtein * share,
      allowMakeAhead: allowMakeAhead,
      factorRaciones: factorRaciones,
      evitarPlantilla: (key === "snack2" && built.snack) ? built.snack.templateKey : null,
      plantillasDeAyer: plantillasDeAyer(key),
    });
  });

  // Red de seguridad: si algún envase "fresh" siguiera pendiente (formatos
  // de 3+ raciones), se suma a la toma que ya lo tiene. Se come hoy, como
  // pidió el usuario, en vez de quedarse a medias en la despensa.
  if (day.freshPending.length) {
    day.freshPending.forEach(function (pend) {
      var target = built.dinner.items.some(function (it) { return it.id === pend.entry.product.id; })
        ? built.dinner : built.lunch;
      var existing = target.items.filter(function (it) { return it.id === pend.entry.product.id; })[0];
      if (existing) {
        existing.servings += pend.servings;
        existing.grams = Math.round(existing.servingG * existing.servings);
        var m = macrosForGrams(pend.entry.product, existing.grams);
        existing.kcal = m.kcal; existing.protein = m.protein; existing.carbs = m.carbs; existing.fat = m.fat;
        existing.wholePackage = existing.servings >= existing.servingsPerPackage;
        addMacros(target.total, servingMacros(pend.entry, pend.servings));
      }
    });
    day.freshPending = [];
  }

  // Coste real de la compra: un producto del que se usan más raciones de
  // las que trae un envase necesita MÁS DE UN envase, y eso se paga. Lo
  // heredado de otro día solo paga lo que pase de lo que ya había.
  var shoppingCost = 0;
  var comprados = 0;
  day.order.forEach(function (id) {
    var b = day.bought[id];
    var perPack = b.entry.serving.servingsPerPackage || 1;
    var packs = _envasesPagados(b.servingsUsed, b.gratis || 0, perPack);
    if (packs > 0) comprados++;
    if (typeof b.entry.product.price === "number") shoppingCost += b.entry.product.price * packs;
  });

  var total = emptyMacros();
  var slots = NO_COOK_SLOT_DEFS.filter(function (def) {
    return slotKeys.indexOf(def.key) !== -1;
  }).map(function (def) {
    var b = built[def.key];
    addMacros(total, b.total);
    return {
      key: def.key, label: def.label, items: b.items, total: b.total,
      assembly: b.assembly, templateKey: b.templateKey, templateLabel: b.templateLabel,
      makeAhead: b.makeAhead === true,
    };
  });

  return {
    slots: slots,
    poolSize: pool.length,
    total: total,
    target: { kcal: targetKcal, protein: opts.protein || null },
    shoppingCost: Math.round(shoppingCost * 100) / 100,
    consumedCost: Math.round(day.consumed * 100) / 100,
    // Productos que se COMPRAN hoy (lo heredado ya está en casa). Sin nada
    // heredado son todos los del día, como siempre.
    productCount: comprados,
    budget: presupuesto === Infinity ? null : presupuesto,
    // Se pasó del presupuesto: solo puede ocurrir cuando ni el envase más
    // barato de un papel OBLIGATORIO cabía. Se dice, no se esconde. En un plan
    // de varios días lo rehace noCookAplicarCuentas con la compra del plan.
    budgetOverrun: (presupuesto !== Infinity && shoppingCost > presupuesto)
      ? Math.round((shoppingCost - presupuesto) * 100) / 100 : 0,
    threeMealDay: threeMealDay,
    priority: day.priority,
  };
}

/**
 * Un plan "sin cocinar" de VARIOS días (2026-10-21), como el plan normal
 * (generateDietPlanDays): una llamada al generador por día. Las kcal son
 * DIARIAS; el presupuesto, desde el 2026-11-06, del plan entero (ver «Un
 * presupuesto para todo el plan»): cada día recibe su techo de la compra del
 * plan. Y la regla de lo «de la noche antes»: nunca en el día 1 (no lo
 * pudiste dejar hecho ayer) y nunca en un plan de 1 día.
 *
 * No hace falta apartar lo de los días anteriores: el sorteo ya da días
 * distintos. Medido el 2026-10-21 con 100 planes de 7 días (2.200 kcal,
 * 12 €): 0 días idénticos de 2.100 pares y un 1,2% de tomas que repiten
 * exactamente los mismos productos que otro día.
 *
 * Desde el 2026-10-27 los días SÍ se pasan lo que sobra (ver «Lo que sobra
 * de un día sirve a los demás», arriba): cada día recibe lo pagado y sin
 * comer de los anteriores, al final se rellenan con lo que sobra los días
 * que se quedan cortos, y el ticket de cada día sale de noCookCuentas.
 *
 * @param {string} [storeId]
 * @param {object} [options] - las de generateNoCookPlan
 * @param {number} dias - 1..7 (lo que no sea un número válido cuenta como 1)
 * @returns {object[]} un plan de generateNoCookPlan por día
 */
function generateNoCookPlanDays(storeId, options, dias) {
  var n = Math.floor(Number(dias));
  if (!(n >= 1)) n = 1;
  if (n > 7) n = 7;
  var base = options || {};
  var presupuesto = (typeof base.budget === "number" && base.budget > 0) ? base.budget : null;
  // Un plan por cada reserva y el mejor de los que caben en el presupuesto
  // del plan; si no cabe ninguno, el que menos se pasa. Con un solo día o sin
  // presupuesto, uno, como siempre.
  var reservas = (presupuesto !== null && n > 1) ? NO_COOK_RESERVAS_DIAS : [null];
  var mejor = null;
  reservas.forEach(function (reserva) {
    var planes = _noCookDias(storeId, base, n, presupuesto, reserva);
    var delPlan = noCookCompraDelPlan(planes);
    var exceso = delPlan ? Math.max(0, delPlan.compra - delPlan.presupuesto) : 0;
    var este = { planes: planes, exceso: exceso, cabe: exceso <= 0.005, nota: _notaDelPlan(planes, base) };
    if (!mejor || (este.cabe !== mejor.cabe ? este.cabe
        : (este.cabe ? este.nota > mejor.nota : este.exceso < mejor.exceso))) mejor = este;
  });
  return mejor.planes;
}

/**
 * Lo bueno que es un plan de varios días, para elegir entre los que hace
 * generateNoCookPlanDays: resta, por día y con los pesos de NO_COOK_NOTA, lo
 * que falta de proteína, lo que se apartan las kcal del objetivo, cada
 * producto que sale en 3 tomas o más y la misma proteína en comida y cena
 * (ver «Variedad dentro del día y entre días»). Más alto, mejor.
 * @param {object[]} planes
 * @param {{calories?:number, protein?:number}} opts
 * @returns {number}
 */
function _notaDelPlan(planes, opts) {
  var kcal = (typeof opts.calories === "number" && opts.calories > 0) ? opts.calories : NO_COOK_DEFAULT_CALORIES;
  var proteina = (typeof opts.protein === "number" && opts.protein > 0) ? opts.protein : 0;
  function principal(slot) {
    var items = (slot && slot.items) || [];
    if (!items.length) return null;
    return items.reduce(function (a, b) { return (b.protein || 0) > (a.protein || 0) ? b : a; }).id;
  }
  var nota = 0;
  planes.forEach(function (plan) {
    var t = plan.total || _totalDelDia(plan);
    if (proteina) nota -= NO_COOK_NOTA.proteina * Math.max(0, 1 - t.protein / proteina);
    nota -= NO_COOK_NOTA.kcal * Math.abs(t.kcal / kcal - 1);
    var veces = {};
    var porClave = {};
    (plan.slots || []).forEach(function (slot) {
      porClave[slot.key] = slot;
      var aqui = {};
      (slot.items || []).forEach(function (it) {
        if (aqui[it.id]) return;
        aqui[it.id] = true;
        veces[it.id] = (veces[it.id] || 0) + 1;
      });
    });
    Object.keys(veces).forEach(function (id) { if (veces[id] >= 3) nota -= NO_COOK_NOTA.tresTomas; });
    var comida = principal(porClave.lunch);
    if (comida !== null && comida === principal(porClave.dinner)) nota -= NO_COOK_NOTA.mismaProteina;
  });
  return planes.length ? nota / planes.length : 0;
}

/** Los `n` días de generateNoCookPlanDays con una reserva (null: el techo es el presupuesto del día). */
function _noCookDias(storeId, base, n, presupuesto, reserva) {
  var planes = [];
  for (var d = 0; d < n; d++) {
    var opts = {};
    for (var k in base) opts[k] = base[k];
    opts.allowMakeAhead = n > 1 && d > 0;
    var cuentas = d > 0 ? noCookCuentas(planes) : null;
    if (cuentas) {
      opts.heredado = cuentas.siguiente;
      // Para no repetir en cada toma lo de esa misma toma ayer (2026-11-06).
      opts.ayer = planes[d - 1];
    }
    if (reserva !== null) opts.techo = noCookTechoDelDia(presupuesto, n, d, cuentas ? cuentas.dias : [], reserva);
    planes.push(generateNoCookPlan(storeId, opts));
  }
  _rellenarConSobras(planes, _poolSinCocinar(storeId), base);
  return noCookAplicarCuentas(planes);
}

/**
 * "Cambiar SOLO esta toma" del plan sin cocinar, sin tocar las demás.
 *
 * El usuario lo pidió como su red de seguridad contra el problema de
 * disponibilidad por tienda: no hay dato de qué hay en CADA Mercadona (no
 * existe en el pipeline), así que si un producto no está en la suya, vuelve
 * a tirar esa toma y con el sesgo hacia marca propia es muy improbable que
 * la siguiente tampoco esté.
 *
 * A diferencia del motor de platos, aquí no se guarda el estado del día
 * entre llamadas: se RECONSTRUYE a partir de las otras tomas (qué está
 * comprado, cuántas raciones se han usado y cuánto se lleva gastado) para
 * que la toma nueva reutilice lo ya comprado y siga respetando el
 * presupuesto del día completo.
 *
 * @param {object} plan - plan devuelto por generateNoCookPlan()
 * @param {string} slotKey
 * @param {string} [storeId]
 * @param {{calories?:number, protein?:number, budget?:number, priority?:string}} [options]
 * @returns {{slot:object}|{error:string}}
 */
function regenerateNoCookSlot(plan, slotKey, storeId, options) {
  if (!plan || !Array.isArray(plan.slots)) return { error: "no_plan" };
  var slotDef = NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === slotKey; })[0];
  if (!slotDef) return { error: "unknown_slot_key" };
  var idx = -1;
  for (var i = 0; i < plan.slots.length; i++) if (plan.slots[i].key === slotKey) idx = i;
  if (idx === -1) return { error: "slot_not_found" };

  var opts = options || {};
  var pool = _poolSinCocinar(storeId);
  var byId = {};
  for (var j = 0; j < pool.length; j++) byId[pool[j].product.id] = pool[j];

  var day = {
    bought: {}, order: [], usedNames: {}, spent: 0, consumed: 0,
    // "satiety" es el nombre nuevo (2026-09-01) de lo que aquí se llamaba
    // "cheap": el mismo criterio, más comida por euro. Se aceptan los dos.
    priority: (opts.priority === "cheap" || opts.priority === "satiety") ? "cheap"
      : (opts.priority === "protein" ? "protein" : "balanced"),
    // En un plan de varios días, el techo del día que pasa quien llama
    // (noCookTechoParaCambiar): lo que deja la compra de los otros días.
    budget: _techoDelDia((typeof opts.budget === "number" && opts.budget > 0) ? opts.budget : Infinity, opts.techo),
    freshPending: [], reserve: 0, pendingSpend: 0,
    avoidIds: {},
    // Lo que sobra de los días anteriores (2026-10-27): quien llama pasa el
    // `heredado` de ESTE día (noCookCuentas(dias).dias[d].heredado).
    heredado: _heredadoDelPool(pool, opts.heredado),
  };

  // Todo lo que había en ESTA toma se aparta: pulsar "Cambiar" tiene que
  // dar otra cosa. Sin esto el reroll devolvía los mismos productos una y
  // otra vez (solo cambiaba la plantilla), y entonces no sirve para lo que
  // el usuario lo quiere: esquivar un producto que su tienda no tiene.
  plan.slots[idx].items.forEach(function (it) { day.avoidIds[it.id] = true; });

  // Estado del día a partir de las OTRAS tomas, también en cuántas sale cada
  // producto: lo nuevo no repite lo que ya sale en el resto del día.
  day.vecesHoy = {};
  plan.slots.forEach(function (slot) {
    if (slot.key === slotKey) return;
    var contados = {};
    slot.items.forEach(function (it) {
      if (contados[it.id]) return;
      contados[it.id] = true;
      day.vecesHoy[it.id] = (day.vecesHoy[it.id] || 0) + 1;
    });
    slot.items.forEach(function (it) {
      var entry = byId[it.id];
      if (!entry) return;
      if (!day.bought[it.id]) {
        var h = day.heredado[it.id];
        day.bought[it.id] = { entry: entry, servingsUsed: 0, gratis: h ? h.servings : 0 };
        day.order.push(it.id);
        day.usedNames[it.name] = true;
      }
      day.bought[it.id].servingsUsed += (it.servings || 1);
    });
  });
  day.order.forEach(function (id) {
    var b = day.bought[id];
    var perPack = b.entry.serving.servingsPerPackage || 1;
    var packs = _envasesPagados(b.servingsUsed, b.gratis || 0, perPack);
    if (typeof b.entry.product.price === "number") day.spent += b.entry.product.price * packs;
  });

  var targetKcal = (typeof opts.calories === "number" && opts.calories > 0)
    ? opts.calories : NO_COOK_DEFAULT_CALORIES;
  var ratioSum = plan.slots.reduce(function (a, s) {
    var d = NO_COOK_SLOT_DEFS.filter(function (x) { return x.key === s.key; })[0];
    return a + (d ? d.ratio : 0);
  }, 0) || 1;
  var share = slotDef.ratio / ratioSum;

  var built = buildSlot(slotKey, targetKcal * share, pool, day, {
    allowSplitFresh: false,
    targetProtein: (opts.protein || 0) * share,
    // Un re-roll respeta la misma regla que la generación: nada "de la
    // noche antes" salvo día 2+ de un plan de varios días.
    allowMakeAhead: opts.allowMakeAhead === true,
    factorRaciones: noCookFactorRaciones(targetKcal),
  });
  if (!built.items.length) return { error: "no_alternative_found" };

  // El horario de la toma no cambia porque cambie el plato.
  if (typeof plan.slots[idx].time === "string") built.time = plan.slots[idx].time;
  if (typeof plan.slots[idx].timeMinutes === "number") built.timeMinutes = plan.slots[idx].timeMinutes;
  built.key = slotKey;
  built.label = slotDef.label;
  return { slot: built };
}

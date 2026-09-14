/**
 * js/core/servings.js
 * ─────────────────────────────────────────────────────────────────────────
 * Traduce gramos a raciones de casa: "568 g de yogur" -> "4 yogures".
 *
 * ── UN SOLO DUEÑO DE LA PREGUNTA ────────────────────────────────────────
 * "¿Cuánto es UNA unidad de esto?" se contesta AQUÍ y en ningún otro sitio.
 * El motor (`plan-generator.js`) y la pantalla (`render.js`) llaman los dos
 * a `resolveServingUnit()`, así que no pueden discrepar.
 *
 * No es una precaución abstracta: este proyecto ya pagó ese error dos veces
 * (HANDOFF.md §7.3, y §7.10 — la pantalla juzgando el plan con reglas
 * propias en paralelo a las del motor, y las dos discrepando en silencio).
 * Si algún día hace falta la cuenta en un tercer sitio, se llama a esto; no
 * se reimplementa.
 *
 * La respuesta sale de TRES sitios, en este orden, y el primero que
 * conteste gana:
 *
 *   1. `SERVING_UNITS` (js/data/servings.js) — la tabla explícita.
 *   2. `PACKAGING_INFO` type "perUnit"  — ya tiene gramsPerUnit/unitLabel.
 *   3. `PACKAGING_INFO` type "spoonable" — la cucharadita.
 *
 * 2 y 3 se DERIVAN en vez de copiarse a la tabla: duplicar el gramaje del
 * huevo en dos ficheros es justo cómo empiezan las desincronizaciones.
 *
 * Sin respuesta se devuelve `null`, y quien llame se queda en gramos. Es lo
 * correcto para la carne y el pescado frescos, que se compran al peso.
 *
 * ── POR QUÉ LA CUCHARADITA Y NO LA CUCHARADA ────────────────────────────
 * Para `spoonable` se cuantiza con la cucharadita (~4,6 g) y no con la
 * cucharada: el aceite se vierte, no se cuenta, y el paso fino deja el
 * redondeo por debajo de lo perceptible. La PANTALLA sigue eligiendo por su
 * cuenta si enseña cucharadas o cucharaditas — eso es presentación, y el
 * valor que enseña sale igualmente de aquí.
 *
 * Consumido por: js/engine/plan-generator.js, js/ui/render.js
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * La unidad de casa de un ingrediente, o null si no tiene una honesta.
 *
 * @param {string} name - nombre del ingrediente tal cual viene del plato
 * @returns {{g: number, label: string, split: string}|null}
 */
function resolveServingUnit(name) {
  if (typeof normalizeIngredientKey !== "function") return null;
  var key = normalizeIngredientKey(name);

  if (typeof SERVING_UNITS !== "undefined" && SERVING_UNITS[key]) {
    return SERVING_UNITS[key];
  }

  if (typeof PACKAGING_INFO === "undefined") return null;
  var info = PACKAGING_INFO[key];
  if (!info) return null;

  if (info.type === "perUnit" && info.gramsPerUnit > 0) {
    return { g: info.gramsPerUnit, label: info.unitLabel, split: "media" };
  }
  if (info.type === "spoonable" && info.teaspoonG > 0) {
    return { g: info.teaspoonG, label: "cucharadita", split: "media" };
  }
  return null;
}

/**
 * Redondea un número de unidades a lo que de verdad se puede servir.
 *
 * El SUELO es lo que hace que esto no pueda devolver "0 yogures": por
 * debajo de media unidad (o de una entera, si no se parte) se sube. Comer
 * un poco de más es un plan; comer cero de un ingrediente que la receta
 * pide es una receta rota.
 *
 * @param {number} count - unidades exactas (gramos / gramos por unidad)
 * @param {string} split - "entera" | "media" | "cuarto"
 * @returns {number}
 */
function quantizeServingCount(count, split) {
  if (!(count > 0)) return 0;

  if (split === "entera") {
    return Math.max(1, Math.round(count));
  }
  if (split === "cuarto") {
    // Cuartos Y tercios: se queda el que caiga más cerca, porque "1/3 de
    // bote" y "1/4 de bote" son igual de fáciles de servir y tener las dos
    // opciones reduce a la mitad el error del redondeo.
    var enCuartos = Math.round(count * 4) / 4;
    var enTercios = Math.round(count * 3) / 3;
    var elegido = (Math.abs(count - enCuartos) <= Math.abs(count - enTercios))
      ? enCuartos
      : enTercios;
    return Math.max(0.25, elegido);
  }
  return Math.max(0.5, Math.round(count * 2) / 2);
}

/**
 * Los gramos de un ingrediente, redondeados a raciones servibles.
 * Devuelve los gramos de entrada sin tocar si no hay unidad de casa.
 *
 * @param {number} grams
 * @param {string} name
 * @returns {number}
 */
function quantizeGramsToServing(grams, name) {
  var unit = resolveServingUnit(name);
  if (!unit || !(unit.g > 0) || !(grams > 0)) return grams;
  return quantizeServingCount(grams / unit.g, unit.split) * unit.g;
}

/**
 * La ración legal INMEDIATAMENTE ANTERIOR a `count`, o null si ya está en
 * el mínimo.
 *
 * Existe porque restar "un paso" a mano no vale, y costó un test: el modo
 * "cuarto" admite cuartos Y tercios, así que su rejilla no es regular.
 * Quitarle 2 x 0,25 a 4/3 de bote da 5/6, que no es ninguna de las dos
 * cosas -- en pantalla salían 333 g de lentejas, que no es ni un tercio ni
 * un cuarto de nada. Quien conoce la rejilla es este fichero, así que la
 * pregunta se hace aquí en vez de reconstruirla en el motor.
 *
 * @param {number} count
 * @param {string} split
 * @returns {number|null}
 */
function previousServingCount(count, split) {
  var candidatos = [];
  var i;
  if (split === "entera") {
    for (i = 1; i <= Math.ceil(count) + 1; i++) candidatos.push(i);
  } else if (split === "cuarto") {
    for (i = 1; i <= Math.ceil(count * 4) + 4; i++) candidatos.push(i / 4);
    for (i = 1; i <= Math.ceil(count * 3) + 3; i++) candidatos.push(i / 3);
  } else {
    for (i = 1; i <= Math.ceil(count * 2) + 2; i++) candidatos.push(i / 2);
  }

  var mejor = null;
  for (i = 0; i < candidatos.length; i++) {
    var c = candidatos[i];
    if (c < count - 1e-6 && (mejor === null || c > mejor)) mejor = c;
  }
  return mejor;
}

/**
 * Los gramos de la ración legal anterior a `grams`, o null si ya no se
 * puede bajar sin quedarse por debajo de una ración.
 *
 * @param {number} grams
 * @param {string} name
 * @returns {number|null}
 */
function previousServingGrams(grams, name) {
  var unit = resolveServingUnit(name);
  if (!unit || !(unit.g > 0) || !(grams > 0)) return null;

  // Se baja por la rejilla hasta que el resultado sea de verdad MENOR en
  // gramos enteros, que es como se guardan.
  //
  // Sin esto había un paso que no daba un paso: 221 g de huevo son 3,508
  // raciones, la anterior es 3,5 = 220,5 g... que vuelve a redondear a 221.
  // Quien llamaba se quedaba en bucle creyendo que bajaba, agotaba su tope
  // de intentos y acababa recortando 5 g a pelo -- dejando 216 g, que no es
  // ni 3 huevos ni 3 y medio. El síntoma estaba lejísimos de la causa.
  var cuenta = grams / unit.g;
  for (var i = 0; i < 64; i++) {
    var anterior = previousServingCount(cuenta, unit.split);
    if (anterior === null) return null;
    var enGramos = anterior * unit.g;
    if (Math.round(enGramos) < Math.round(grams)) return enGramos;
    cuenta = anterior;
  }
  return null;
}

/**
 * Cuántas unidades son estos gramos, ya redondeado.
 * @param {number} grams
 * @param {{g: number, split: string}} unit
 * @returns {number}
 */
function servingCountFor(grams, unit) {
  if (!unit || !(unit.g > 0)) return 0;
  return quantizeServingCount(grams / unit.g, unit.split);
}

/**
 * El plural español de una etiqueta de ración.
 *
 * La regla por defecto es añadir "s", y las excepciones están escritas en
 * `SERVING_PLURALS` en vez de deducirse. Misma decisión que `packages-en.js`
 * tomó para el inglés, y por el mismo motivo: una regla automática acierta
 * casi siempre, y el "casi" sale en pantalla sin dar ningún error.
 *
 * @param {string} label
 * @param {number} n
 * @returns {string}
 */
function pluralizeServingLabel(label, n) {
  if (n <= 1) return label;
  if (typeof SERVING_PLURALS !== "undefined" && SERVING_PLURALS[label]) {
    return SERVING_PLURALS[label];
  }
  return label + "s";
}

/**
 * js/core/plan-store.js
 * ─────────────────────────────────────────────────────────────────────────
 * Guarda en ESTE dispositivo el plan que se muestra, para que sobreviva a
 * una recarga de la página. Solo guarda, lee y borra: no genera nada ni
 * decide nada del plan. Un plan nuevo sale únicamente de "Generar plan".
 *
 *   - Sin almacenamiento (modo privado, cookies bloqueadas, cuota llena),
 *     todo se queda como estaba: las funciones nunca lanzan, solo devuelven
 *     false o null.
 *   - Lo que se lee del almacenamiento se valida como si viniera de fuera:
 *     un JSON roto o de otra versión se ignora en vez de pintar basura.
 *
 * Expone (globales):
 *   PLAN_STORAGE_KEY
 *   planAlmacen()                 -> localStorage o null
 *   planGuardar(storage, estado)  -> boolean
 *   planLeer(storage)             -> estado o null
 *   planBorrar(storage)
 *   PLAN_SIN_COCINAR_KEY, planSinCocinarGuardar / planSinCocinarLeer /
 *   planSinCocinarBorrar, planSinCocinarDiaValido   lo mismo para «sin cocinar»
 * ─────────────────────────────────────────────────────────────────────────
 */

// De la persona activa (js/core/perfiles.js, 2026-10-26): el titular, la de siempre.
var PLAN_STORAGE_KEY = (typeof perfilClave === "function") ? perfilClave("weekplate-plan-v1") : "weekplate-plan-v1";
var PLAN_STORAGE_VERSION = 1;

/** Un plan válido tiene al menos un día, y cada día al menos una toma. */
function planDiasValidos(dias) {
  return Array.isArray(dias) && dias.length > 0 && dias.every(function (d) {
    return !!d && Array.isArray(d.meals) && d.meals.length > 0;
  });
}

/** localStorage del navegador, o null si no se puede tocar (nunca lanza). */
function planAlmacen() {
  try {
    return (typeof window !== "undefined" && window.localStorage) || null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object|null} storage - normalmente localStorage
 * @param {object} estado - { dias, store, dayOptions, profile, data, report, familia }
 * @returns {boolean} true si quedó guardado
 */
function planGuardar(storage, estado) {
  if (!storage || !estado || !planDiasValidos(estado.dias)) return false;
  try {
    storage.setItem(PLAN_STORAGE_KEY, JSON.stringify({
      version: PLAN_STORAGE_VERSION,
      dias: estado.dias,
      store: estado.store || null,
      dayOptions: estado.dayOptions || null,
      profile: estado.profile || null,
      data: estado.data || null,
      report: estado.report || null,
      // El menú de varias personas (2026-10-26, js/core/familia.js), si lo hay.
      familia: estado.familia || null
    }));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * @param {object|null} storage
 * @returns {object|null} el estado guardado, o null si no hay o no es válido
 */
function planLeer(storage) {
  if (!storage) return null;
  try {
    var texto = storage.getItem(PLAN_STORAGE_KEY);
    if (!texto) return null;
    var p = JSON.parse(texto);
    if (!p || p.version !== PLAN_STORAGE_VERSION) return null;
    if (!planDiasValidos(p.dias)) return null;
    if (!p.profile || typeof p.profile !== "object") return null;
    if (!p.data || typeof p.data !== "object") return null;
    return {
      dias: p.dias,
      store: p.store || null,
      dayOptions: p.dayOptions || null,
      profile: p.profile,
      data: p.data,
      report: p.report || null,
      familia: planFamiliaValida(p.familia) ? p.familia : null
    };
  } catch (e) {
    return null;
  }
}

/** Una familia guardada que se pueda volver a pintar: personas con id y ración, y, si hay planes, válidos. */
function planFamiliaValida(f) {
  if (!f || typeof f !== "object" || !Array.isArray(f.personas) || !f.personas.length) return false;
  var personasBien = f.personas.every(function (p) { return p && typeof p.id === "string" && typeof p.escala === "number"; });
  if (!personasBien || !(f.suma > 0)) return false;
  if (f.modo !== "cada") return true;
  return !!f.planes && f.personas.every(function (p) { return f.planes[p.id] && planDiasValidos(f.planes[p.id].dias); });
}

/** @param {object|null} storage */
function planBorrar(storage) {
  if (!storage) return;
  try {
    storage.removeItem(PLAN_STORAGE_KEY);
  } catch (e) {
    // Sin almacenamiento no hay nada que borrar.
  }
}

// ── El plan «sin cocinar» (2026-10-21) ───────────────────────────────────
// Mismo trato que el plan normal, en su propia clave: los dos se pueden
// tener a la vez en pantalla y cada uno se rehace por su lado. Cada día es
// un plan de generateNoCookPlan (js/engine/no-cook-generator.js).

// De la persona activa (js/core/perfiles.js, 2026-10-26): el titular, la de siempre.
var PLAN_SIN_COCINAR_KEY = (typeof perfilClave === "function") ? perfilClave("weekplate-plan-sincocinar-v1") : "weekplate-plan-sincocinar-v1";
var PLAN_SIN_COCINAR_MAX_DIAS = 7;

/** Un día válido: tomas con su clave, y productos con id y nombre. */
function planSinCocinarDiaValido(dia) {
  if (!dia || typeof dia !== "object" || !Array.isArray(dia.slots) || !dia.slots.length) return false;
  return dia.slots.every(function (slot) {
    return !!slot && typeof slot.key === "string" && Array.isArray(slot.items) &&
      slot.items.every(function (it) {
        return !!it && (typeof it.id === "string" || typeof it.id === "number") && typeof it.name === "string";
      });
  });
}

function _planSinCocinarDiasValidos(dias) {
  return Array.isArray(dias) && dias.length > 0 && dias.length <= PLAN_SIN_COCINAR_MAX_DIAS &&
    dias.every(planSinCocinarDiaValido);
}

/**
 * @param {object|null} storage
 * @param {object} estado - { dias, store, options }
 * @returns {boolean} true si quedó guardado
 */
function planSinCocinarGuardar(storage, estado) {
  if (!storage || !estado || !_planSinCocinarDiasValidos(estado.dias)) return false;
  try {
    storage.setItem(PLAN_SIN_COCINAR_KEY, JSON.stringify({
      version: PLAN_STORAGE_VERSION,
      dias: estado.dias,
      store: estado.store || null,
      options: estado.options || null
    }));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * @param {object|null} storage
 * @returns {object|null} { dias, store, options }, o null si no hay o no es válido
 */
function planSinCocinarLeer(storage) {
  if (!storage) return null;
  try {
    var texto = storage.getItem(PLAN_SIN_COCINAR_KEY);
    if (!texto) return null;
    var p = JSON.parse(texto);
    if (!p || p.version !== PLAN_STORAGE_VERSION || !_planSinCocinarDiasValidos(p.dias)) return null;
    return {
      dias: p.dias,
      store: typeof p.store === "string" ? p.store : null,
      options: (p.options && typeof p.options === "object" && !Array.isArray(p.options)) ? p.options : null
    };
  } catch (e) {
    return null;
  }
}

/** @param {object|null} storage */
function planSinCocinarBorrar(storage) {
  if (!storage) return;
  try {
    storage.removeItem(PLAN_SIN_COCINAR_KEY);
  } catch (e) {
    // Sin almacenamiento no hay nada que borrar.
  }
}

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
 * ─────────────────────────────────────────────────────────────────────────
 */

var PLAN_STORAGE_KEY = "weekplate-plan-v1";
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
 * @param {object} estado - { dias, store, dayOptions, profile, data, report }
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
      report: estado.report || null
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
      report: p.report || null
    };
  } catch (e) {
    return null;
  }
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

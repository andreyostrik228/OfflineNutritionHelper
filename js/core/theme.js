/**
 * js/core/theme.js
 * ─────────────────────────────────────────────────────────────────────────
 * Qué tema quiere el usuario. SIN DOM: aquí solo se guarda, se valida y se
 * resuelve. Quien pinta es `js/ui/render-menu.js`, y quien lo aplica antes
 * de que se vea nada es el IIFE del <head> de index.html.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────
 * El modo oscuro colgaba de `@media (prefers-color-scheme: dark)`, así que
 * un móvil con el sistema en oscuro recibía el sitio negro sin haberlo
 * pedido. El dueño abrió la aplicación en su móvil y se encontró algo que
 * no reconocía. La preferencia del sistema es una buena SUGERENCIA y una
 * mala IMPOSICIÓN: ahora se elige, y por defecto es clara.
 *
 * ── Las tres opciones ───────────────────────────────────────────────────
 *   "claro"    siempre claro          (por defecto)
 *   "oscuro"   siempre oscuro
 *   "sistema"  lo que diga el móvil, y cambia con él en caliente
 *
 * `resolveTheme()` NO consulta `matchMedia`: recibe la respuesta como
 * argumento. Así se puede probar sin navegador, que es la separación que
 * hace útiles los tests de este proyecto.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Clave propia, NO dentro de los ajustes. Ver la nota de abajo. */
var THEME_STORAGE_KEY = "nutritionPlanner.theme.v1";

/**
 * Los únicos valores que se aceptan. Cualquier otra cosa cae al primero.
 * El valor sale de localStorage y acaba en un atributo del DOM que el CSS
 * selecciona, así que se valida antes de creérselo -- mismo criterio que
 * `data-store`.
 */
var THEME_MODES = ["claro", "oscuro", "sistema"];
var DEFAULT_THEME_MODE = "claro";

/** Lo que de verdad puede valer `data-theme` en <html>. */
var THEME_RESOLVED = ["claro", "oscuro"];

// Igual que en settings.js: solo se usa cuando no hay localStorage en
// absoluto (tests, entorno sin navegador).
var _themeMemoryState = null;

/**
 * Deja un modo en algo seguro de usar.
 * @param {*} valor
 * @returns {string} uno de THEME_MODES
 */
function sanitizeThemeMode(valor) {
  return THEME_MODES.indexOf(valor) === -1 ? DEFAULT_THEME_MODE : valor;
}

/**
 * El modo elegido, ya validado.
 *
 * Vive en su PROPIA clave y no dentro de `nutritionPlanner.settings.v1` a
 * propósito: `saveSettings()` reemplaza el objeto entero, y el llamador lo
 * construye desde los campos del formulario. Cualquier ajuste que no sea un
 * campo del formulario se borraba en cada generación de plan -- pasó ya con
 * la nota de "1 día" (ver STATE, 2026-09-08). El tema no es un campo del
 * formulario, así que ahí no puede estar.
 *
 * @returns {string}
 */
function getThemeMode() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) {
      return sanitizeThemeMode(_themeMemoryState);
    }
    return sanitizeThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
  } catch (e) {
    // Un navegador con el almacenamiento bloqueado no es un error: es un
    // usuario en ventana privada. Se queda con el tema por defecto.
    return sanitizeThemeMode(_themeMemoryState);
  }
}

/**
 * Guarda el modo. Devuelve el que ha quedado, que puede no ser el que se
 * pidió si venía basura.
 * @param {string} modo
 * @returns {string}
 */
function saveThemeMode(modo) {
  var limpio = sanitizeThemeMode(modo);
  _themeMemoryState = limpio;
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(THEME_STORAGE_KEY, limpio);
    }
  } catch (e) { /* ventana privada: se queda en memoria y ya */ }
  return limpio;
}

/**
 * De "qué quiere el usuario" a "qué hay que pintar".
 *
 * @param {string} modo - uno de THEME_MODES (se valida igual)
 * @param {boolean} sistemaPrefiereOscuro - lo que conteste matchMedia; el
 *   navegador NO se consulta aquí, se pasa desde fuera para poder probarlo.
 * @returns {string} "claro" u "oscuro"
 */
function resolveTheme(modo, sistemaPrefiereOscuro) {
  var limpio = sanitizeThemeMode(modo);
  if (limpio === "sistema") return sistemaPrefiereOscuro ? "oscuro" : "claro";
  return limpio;
}

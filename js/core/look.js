/**
 * js/core/look.js
 * ─────────────────────────────────────────────────────────────────────────
 * Qué ASPECTO (apariencia) quiere el usuario. SIN DOM: aquí solo se guarda,
 * se valida y se resuelve a una hoja de estilos. Quien lo pinta en el menú de
 * ajustes es `js/ui/render-menu.js`, y quien lo aplica ANTES de que se vea
 * nada es el IIFE "ASPECTO" del <head> de index.html.
 *
 * ── Qué es un aspecto ───────────────────────────────────────────────────
 * Una hoja de estilos de assets/css/temas/ que se carga ENCIMA de
 * assets/css/style.css y cambia el aspecto entero: fondo, botones, tarjetas,
 * tipografías. El aspecto por defecto, "entreno", ES style.css y no tiene
 * hoja propia. Las hojas se GENERAN (scripts/temas/construir.py); no se
 * editan a mano.
 *
 * ── Por qué es distinto del "tema" claro/oscuro ─────────────────────────
 * `js/core/theme.js` guarda claro/oscuro/sistema y sigue ahí, escondido (el
 * dueño descartó el modo oscuro el 2026-10-05). Esto es otra cosa: elegir
 * entre diseños completos. Va en su PROPIA clave por la misma razón que el
 * tema: `saveSettings()` reemplaza el objeto de ajustes entero y todo lo que
 * no sea un campo del formulario se perdía en cada plan.
 *
 * ── La lista está repetida en el <head>, a propósito ────────────────────
 * El IIFE del <head> no puede esperar a este archivo (corre antes de pintar),
 * así que repite los ids y el color de la barra del navegador de cada uno.
 * tests/look.test.js comprueba que las dos copias no se separan.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Clave propia, NO dentro de los ajustes. */
var LOOK_STORAGE_KEY = "nutritionPlanner.look.v1";

/** El aspecto por defecto: el diseño de style.css, sin hoja de aspecto. */
var DEFAULT_LOOK = "entreno";

/**
 * Los aspectos, en el orden en que salen en el menú. El por defecto va el
 * PRIMERO (arriba a la izquierda): decisión del dueño, 2026-10-06.
 *
 *   id      lo que se guarda y lo que lleva `data-look` en <html>
 *   file    la hoja, o null para el aspecto por defecto
 *   color   el `theme-color` de la barra del navegador (el lienzo del aspecto)
 *   dark    true si el lienzo es oscuro (decide el icono/contraste de las ayudas)
 */
var LOOKS = [
  { id: "entreno",    file: null,                            color: "#edeff3", dark: false },
  { id: "hojas",      file: "assets/css/temas/hojas.css",      color: "#E9F1E3", dark: false },
  { id: "cristal",    file: "assets/css/temas/cristal.css",    color: "#EEF5F2", dark: false },
  { id: "avena",      file: "assets/css/temas/avena.css",      color: "#F1E9DA", dark: false },
  { id: "relieve",    file: "assets/css/temas/relieve.css",    color: "#E4EBE3", dark: false },
  { id: "pegatinas",  file: "assets/css/temas/pegatinas.css",  color: "#FFF1CC", dark: false },
  { id: "mercadillo", file: "assets/css/temas/mercadillo.css", color: "#D2B68E", dark: false },
  { id: "revista",    file: "assets/css/temas/revista.css",    color: "#F6F1E8", dark: false },
  { id: "noche",      file: "assets/css/temas/noche.css",      color: "#0C1713", dark: true }
];

// Igual que en settings.js y theme.js: solo se usa cuando no hay localStorage
// en absoluto (tests, ventana privada).
var _lookMemoryState = null;

/** Los ids, en orden. */
function lookIds() {
  var out = [];
  for (var i = 0; i < LOOKS.length; i++) out.push(LOOKS[i].id);
  return out;
}

/**
 * Deja un id en algo seguro de usar. El valor sale de localStorage y acaba en
 * un atributo del DOM que el CSS selecciona y en la ruta de una hoja de
 * estilos, así que se valida contra la lista antes de creérselo.
 * @param {*} valor
 * @returns {string} un id de LOOKS
 */
function sanitizeLook(valor) {
  for (var i = 0; i < LOOKS.length; i++) {
    if (LOOKS[i].id === valor) return valor;
  }
  return DEFAULT_LOOK;
}

/** La ficha de un aspecto (la del por defecto si el id no existe). */
function lookInfo(id) {
  var limpio = sanitizeLook(id);
  for (var i = 0; i < LOOKS.length; i++) {
    if (LOOKS[i].id === limpio) return LOOKS[i];
  }
  return LOOKS[0];
}

/**
 * El aspecto elegido, ya validado.
 * @returns {string}
 */
function getLook() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) {
      return sanitizeLook(_lookMemoryState);
    }
    return sanitizeLook(localStorage.getItem(LOOK_STORAGE_KEY));
  } catch (e) {
    // Almacenamiento bloqueado (ventana privada): no es un error.
    return sanitizeLook(_lookMemoryState);
  }
}

/**
 * Guarda el aspecto. Devuelve el que ha quedado, que puede no ser el pedido
 * si venía basura.
 * @param {string} id
 * @returns {string}
 */
function saveLook(id) {
  var limpio = sanitizeLook(id);
  _lookMemoryState = limpio;
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(LOOK_STORAGE_KEY, limpio);
    }
  } catch (e) { /* se queda en memoria y ya */ }
  return limpio;
}

/**
 * La URL de la hoja de un aspecto, con el sello `?v=` de los demás recursos.
 *
 * El sello es lo que hace que el service worker la guarde para el modo
 * offline (sw.js: "recurso con sello: inmutable, cache primero") y que un
 * despliegue nuevo no la mezcle con la vieja. null para el aspecto por
 * defecto, que no tiene hoja.
 *
 * @param {string} id
 * @param {string} [sello] - el `v` de style.css (el IIFE del <head> y el menú
 *   lo sacan del enlace de la hoja, así no hay un segundo sitio que subir).
 * @returns {string|null}
 */
function lookCssHref(id, sello) {
  var info = lookInfo(id);
  if (!info.file) return null;
  return info.file + (sello && /^[0-9a-z]+$/.test(sello) ? "?v=" + sello : "");
}

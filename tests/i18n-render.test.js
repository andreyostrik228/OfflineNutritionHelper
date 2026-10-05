/**
 * tests/i18n-render.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lo que la interfaz ESCRIBE en pantalla cuando el idioma no es el español.
 *
 * tests/i18n.test.js vigila las tablas (que no falte ninguna clave). Esto
 * vigila lo contrario: que el código de js/ui y del motor PIDA las claves en
 * vez de escribir español a pelo. Es el fallo de siempre y no da ningún
 * error: "Invitado" o " kcal" salen igual en una pantalla en ruso, y los
 * tests de las tablas pasan porque la clave que nadie pide no falta en
 * ningún sitio.
 *
 * Se mira con el código de PRODUCCIÓN cargado en un sandbox `vm`, sin DOM:
 * donde hace falta un elemento se pasa uno de mentira con lo mínimo.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

/** Los idiomas que se sirven hoy, sacados de los ficheros (como i18n.test.js). */
var IDIOMAS_HECHOS = fs.readdirSync(projPath("js/i18n"))
  .map(function (f) { var m = /^([a-z]{2})\.js$/.exec(f); return m && m[1]; })
  .filter(function (l) { return l && l !== "es"; })
  .sort();

/** i18n.js con las tablas de interfaz de todos los idiomas servidos. */
function archivos(extra) {
  var base = [projPath("js/core/utils.js"), projPath("js/core/i18n.js"), projPath("js/i18n/es.js")]
    .concat(IDIOMAS_HECHOS.map(function (l) { return projPath("js/i18n/" + l + ".js"); }));
  return base.concat((extra || []).map(projPath));
}

/** Un elemento de mentira con lo que usan los renderers de texto. */
function elementoFalso() {
  var attrs = {};
  return {
    textContent: "",
    innerHTML: "",
    hidden: false,
    setAttribute: function (k, v) { attrs[k] = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    removeAttribute: function (k) { delete attrs[k]; }
  };
}

function run(t) {

  // ── La etiqueta del botón de perfil ────────────────────────────────────

  t.test("el botón de perfil dice «Guest» / «Гость» en inglés y en ruso, no «Invitado»", function () {
    var s = loadBrowserGlobals(archivos(["js/ui/render-auth.js"]));
    var esperado = { es: "Invitado", en: "Guest", ru: "Гость" };
    Object.keys(esperado).forEach(function (lang) {
      s.saveLang(lang);
      s.authProfileLabel = elementoFalso();
      s.authUserMenu = elementoFalso();
      // Sin cuentas disponibles (isAuthAvailable no existe en el sandbox) =
      // modo invitado, que es lo que ve quien no tiene sesión.
      s.renderProfileButton(null);
      assert.strictEqual(s.authProfileLabel.textContent, esperado[lang], lang);
    });
  });

  t.test("la etiqueta lleva su clave en data-i18n: cambiar de idioma la repinta sola", function () {
    // renderProfileButton solo corre cuando cambia la SESIÓN. Cambiar de
    // idioma no la cambia, así que el texto se quedaba en el idioma de antes.
    // Lo que lo arregla es la clave puesta en `data-i18n`, que
    // applyI18nToDom() relee. Se prueba el contrato: la clave está y apunta a
    // una cadena distinta en cada idioma.
    var s = loadBrowserGlobals(archivos(["js/ui/render-auth.js"]));
    s.authProfileLabel = elementoFalso();
    s.authUserMenu = elementoFalso();
    s.renderProfileButton(null);
    var clave = s.authProfileLabel.getAttribute("data-i18n");
    assert.strictEqual(clave, "ui.invitado");
    assert.notStrictEqual(s.t(clave, "ru"), s.t(clave, "es"));
    assert.notStrictEqual(s.t(clave, "en"), s.t(clave, "es"));
  });

  t.test("el nombre de una persona no se traduce: se quita el data-i18n", function () {
    var s = loadBrowserGlobals(archivos(["js/ui/render-auth.js"]));
    s.isAuthAvailable = function () { return true; };
    s.authProfileLabel = elementoFalso();
    s.authUserMenu = elementoFalso();
    s.authUserEmailEl = elementoFalso();
    s.renderProfileButton(null);                                   // sin sesión: «Iniciar sesión»
    assert.strictEqual(s.authProfileLabel.getAttribute("data-i18n"), "ui.iniciar_sesion");
    s.renderProfileButton({ email: "ana@example.com", user_metadata: { full_name: "Ana" } });
    assert.strictEqual(s.authProfileLabel.textContent, "Ana");
    assert.strictEqual(s.authProfileLabel.getAttribute("data-i18n"), null,
      "con data-i18n, applyI18nToDom() la sustituiría por «Iniciar sesión» al cambiar de idioma");
    s.renderProfileButton({ email: "x@example.com", user_metadata: {} });   // sin nombre: el email
    assert.strictEqual(s.authProfileLabel.textContent, "x@example.com");
    assert.strictEqual(s.authProfileLabel.getAttribute("data-i18n"), null);
  });
}

module.exports = { run: run };

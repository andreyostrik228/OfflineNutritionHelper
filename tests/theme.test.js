/**
 * tests/theme.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/theme.js -- qué tema quiere el usuario.
 *
 * Por qué se puede probar sin navegador, que es el punto de todo esto:
 * `resolveTheme()` NO consulta `matchMedia`, recibe la respuesta del
 * sistema como argumento. La consulta al navegador vive en la capa de UI,
 * donde los tests no llegan; aquí queda la decisión, que es lo que puede
 * equivocarse.
 *
 * El valor acaba en un atributo del DOM que el CSS selecciona, así que la
 * validación no es cosmética: un valor inventado en localStorage no puede
 * llegar a `data-theme`.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshThemeSandbox() {
  return loadBrowserGlobals([projPath("js/core/theme.js")]);
}

/** Mismo patrón de fake localStorage que settings.test.js. */
function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function run(t) {

  // ── Por defecto ────────────────────────────────────────────────────────

  t.test("sin nada guardado el tema es CLARO", function () {
    var s = freshThemeSandbox();
    assert.strictEqual(s.getThemeMode(), "claro");
  });

  t.test("claro es el valor por defecto declarado, no una casualidad", function () {
    var s = freshThemeSandbox();
    assert.strictEqual(s.DEFAULT_THEME_MODE, "claro");
    // JSON.parse(JSON.stringify(...)): el array viene del sandbox `vm`, que
    // es OTRO realm, y deepStrictEqual contra un literal de aqui falla con
    // "same structure but not reference-equal". Esta escrito en HANDOFF 5 y
    // aun asi me lo he comido escribiendo este test.
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(s.THEME_MODES)), ["claro", "oscuro", "sistema"]);
  });

  // ── Validación: esto acaba en un atributo del DOM ──────────────────────

  t.test("un modo inventado cae a claro y NO llega al atributo", function () {
    var s = freshThemeSandbox();
    ["azul", "dark", "", "  ", "oscuro ", "OSCURO"].forEach(function (basura) {
      assert.strictEqual(s.sanitizeThemeMode(basura), "claro",
        "deberia rechazar " + JSON.stringify(basura));
    });
  });

  t.test("tampoco cuela un valor que no sea texto", function () {
    var s = freshThemeSandbox();
    [null, undefined, 0, 1, {}, [], true].forEach(function (basura) {
      assert.strictEqual(s.sanitizeThemeMode(basura), "claro");
    });
  });

  t.test("localStorage con basura dentro devuelve claro, no la basura", function () {
    var s = freshThemeSandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.theme.v1", "javascript:alert(1)");
    assert.strictEqual(s.getThemeMode(), "claro");
  });

  // ── Guardar y leer ─────────────────────────────────────────────────────

  t.test("guarda y devuelve los tres modos validos", function () {
    ["claro", "oscuro", "sistema"].forEach(function (modo) {
      var s = freshThemeSandbox();
      s.localStorage = createFakeLocalStorage();
      assert.strictEqual(s.saveThemeMode(modo), modo);
      assert.strictEqual(s.getThemeMode(), modo);
    });
  });

  t.test("saveThemeMode devuelve lo que QUEDO, no lo que se pidio", function () {
    var s = freshThemeSandbox();
    s.localStorage = createFakeLocalStorage();
    assert.strictEqual(s.saveThemeMode("verde"), "claro");
    assert.strictEqual(s.getThemeMode(), "claro");
  });

  t.test("sin localStorage se recuerda en memoria y no lanza", function () {
    var s = freshThemeSandbox();
    s.localStorage = undefined;
    assert.doesNotThrow(function () { s.saveThemeMode("oscuro"); });
    assert.strictEqual(s.getThemeMode(), "oscuro");
  });

  t.test("un localStorage que LANZA (ventana privada) no rompe nada", function () {
    var s = freshThemeSandbox();
    s.localStorage = {
      getItem: function () { throw new Error("bloqueado"); },
      setItem: function () { throw new Error("bloqueado"); }
    };
    assert.doesNotThrow(function () { s.saveThemeMode("oscuro"); });
    // Se guardo en memoria aunque el almacenamiento reviente.
    assert.strictEqual(s.getThemeMode(), "oscuro");
  });

  // ── Resolver: de "lo que quiere" a "lo que se pinta" ───────────────────

  t.test("claro y oscuro ignoran lo que diga el sistema", function () {
    var s = freshThemeSandbox();
    assert.strictEqual(s.resolveTheme("claro", true), "claro");
    assert.strictEqual(s.resolveTheme("claro", false), "claro");
    assert.strictEqual(s.resolveTheme("oscuro", true), "oscuro");
    assert.strictEqual(s.resolveTheme("oscuro", false), "oscuro");
  });

  t.test("sistema sigue al sistema", function () {
    var s = freshThemeSandbox();
    assert.strictEqual(s.resolveTheme("sistema", true), "oscuro");
    assert.strictEqual(s.resolveTheme("sistema", false), "claro");
  });

  t.test("resolveTheme SOLO devuelve valores que el CSS entiende", function () {
    var s = freshThemeSandbox();
    ["claro", "oscuro", "sistema", "basura", null].forEach(function (modo) {
      [true, false].forEach(function (sistema) {
        var r = s.resolveTheme(modo, sistema);
        assert.ok(s.THEME_RESOLVED.indexOf(r) !== -1,
          "resolveTheme(" + JSON.stringify(modo) + ", " + sistema + ") dio " + r);
      });
    });
  });

  t.test("un modo invalido resuelve a claro, no a lo que diga el sistema", function () {
    var s = freshThemeSandbox();
    // Esto importa: si un valor corrupto cayera en "sistema", el usuario
    // que eligio claro veria oscuro de noche sin haberlo pedido -- que es
    // exactamente el problema que este modulo existe para arreglar.
    assert.strictEqual(s.resolveTheme("basura", true), "claro");
  });
}

module.exports = { run: run };

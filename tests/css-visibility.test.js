/**
 * tests/css-visibility.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Una sola regla: NADA puede ser invisible en reposo.
 *
 * ── De dónde sale este archivo ──────────────────────────────────────────
 * El usuario informó tres veces de que la aplicación se le quedaba en
 * "просто пустой экран" -- una pantalla vacía que además se podía
 * desplazar. Aquí no se reprodujo ni una sola vez, y el motivo resultó ser
 * el propio entorno de pruebas: el navegador declara
 * `prefers-reduced-motion: reduce`, así que toda la sección de animaciones
 * de entrada -- que vive dentro de un `@media (prefers-reduced-motion:
 * no-preference)` -- sencillamente no se aplicaba. La comprobación
 * esquivaba el fallo por construcción.
 *
 * La causa era esta combinación:
 *
 *     @keyframes pageIn { from { opacity: 0 } ... }
 *     .hero, .field, .actions, .panel--results {
 *       animation: pageIn 0.5s ... both;
 *     }
 *
 * `animation-fill-mode: both` hace que el elemento adopte el fotograma
 * INICIAL antes de empezar, y que se quede ahí para siempre si la
 * animación no llega a ejecutarse. Un móvil con el ahorro de batería de
 * Android, o con "duración de animación" a cero, no la ejecuta. Con
 * `.field` en la lista, eso son los 26 campos del formulario invisibles.
 *
 * Este test lee el CSS de producción y prohíbe esa combinación. No
 * comprueba estética: comprueba que la aplicación se pueda VER, que es
 * la única cosa que no puede fallar nunca.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");

function cssPath() {
  return path.join(__dirname, "..", "assets", "css", "style.css");
}

/** Los @keyframes cuyo fotograma `from`/`0%` deja el elemento invisible. */
function keyframesQueEmpiezanInvisibles(css) {
  var invisibles = [];
  var re = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{([\s\S]*?)\n\}/g;
  var m;
  while ((m = re.exec(css))) {
    var nombre = m[1];
    var cuerpo = m[2];
    // El primer fotograma: `from {...}` o `0% {...}`.
    var primero = cuerpo.match(/(?:^|\n)\s*(?:from|0%)\s*\{([^}]*)\}/);
    if (!primero) continue;
    if (/opacity\s*:\s*0(?!\.\d*[1-9])/.test(primero[1])) {
      invisibles.push(nombre);
    }
  }
  return invisibles;
}

/**
 * Reglas que aplican una animación reteniendo el fotograma inicial
 * (`both` o `backwards`), con el nombre de la animación usada.
 */
function reglasQueRetienenElInicio(css) {
  var usos = [];
  var re = /animation:\s*([A-Za-z0-9_-]+)[^;]*\b(both|backwards)\b[^;]*;/g;
  var m;
  while ((m = re.exec(css))) {
    usos.push({ animacion: m[1], modo: m[2], indice: m.index });
  }
  return usos;
}

function run(t) {

  t.test("ninguna animación de entrada puede dejar algo invisible si no se ejecuta", function () {
    var css = fs.readFileSync(cssPath(), "utf8");
    var invisibles = keyframesQueEmpiezanInvisibles(css);
    var retenidas = reglasQueRetienenElInicio(css);

    var peligrosas = retenidas.filter(function (uso) {
      return invisibles.indexOf(uso.animacion) !== -1;
    });

    // `onboarding-out` es la excepción legítima y por eso se nombra: es una
    // animación de SALIDA, termina en invisible a propósito y el módulo
    // pone `hidden` al acabar. Retener su último fotograma es lo correcto.
    peligrosas = peligrosas.filter(function (uso) {
      return uso.animacion !== "onboarding-out";
    });

    var mensajes = peligrosas.map(function (uso) {
      return uso.animacion + " (fill-mode " + uso.modo + ")";
    });

    assert.deepStrictEqual(mensajes, [],
      "estas animaciones dejan el elemento en `opacity: 0` mientras no se " +
      "ejecuten, y hay móviles que no las ejecutan: " + mensajes.join(", "));
  });

  // El caso concreto que rompió la aplicación, fijado por su nombre para
  // que no vuelva por la puerta de atrás.
  t.test("pageIn anima el desplazamiento, nunca la opacidad", function () {
    var css = fs.readFileSync(cssPath(), "utf8");
    var m = css.match(/@keyframes\s+pageIn\s*\{([\s\S]*?)\n\}/);
    assert.ok(m, "pageIn debería seguir existiendo");
    assert.strictEqual(/opacity/.test(m[1]), false,
      "pageIn se aplica a .hero, .field (los 26 campos), .actions y " +
      ".panel--results: si vuelve a tocar la opacidad, un móvil sin " +
      "animaciones se queda sin interfaz");
  });

  t.test("la bienvenida tampoco depende de que su animación corra", function () {
    var css = fs.readFileSync(cssPath(), "utf8");
    // `.onboarding` y `.onboarding__step` no pueden llevar fill-mode con
    // una animación que empiece invisible.
    [".onboarding {", ".onboarding__step {"].forEach(function (selector) {
      var i = css.indexOf(selector);
      assert.ok(i !== -1, "falta la regla " + selector);
      var bloque = css.slice(i, css.indexOf("\n}", i));
      var anim = bloque.match(/animation:\s*([^;]+);/);
      if (!anim) return;
      assert.strictEqual(/\b(both|backwards)\b/.test(anim[1]), false,
        selector + " retiene el fotograma inicial de su animación: si no " +
        "se ejecuta, la pantalla de bienvenida se queda en blanco");
    });
  });
}

module.exports = { run: run };

/**
 * tests/textos-coherencia.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Coherencia de las tablas de interfaz (es, en, ru, uk): cada clave en
 * español existe en las otras tres, no hay valores vacíos salvo los dos
 * separadores que son vacíos a propósito, y el ruso y el ucraniano no dejan
 * español donde no toca. Las excepciones están listadas aquí y motivadas.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");

function projPath(rel) { return path.join(__dirname, "..", rel); }

function tabla(lang) {
  var txt = fs.readFileSync(projPath("js/i18n/" + lang + ".js"), "utf8");
  var mapa = {};
  var re = /^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm;
  var m;
  while ((m = re.exec(txt))) mapa[m[1]] = JSON.parse('"' + m[2] + '"');
  return mapa;
}

// Valores vacíos a propósito: separador entre número y unidad, y conector de fracciones.
var VACIOS_PERMITIDOS = ["unit.sep_pegada", "ui.fraccion_conector"];

// Iguales al español en ru/uk a propósito: marcas, abreviaturas, formatos y ejemplos
// que se buscan contra el catálogo español (ver la cabecera de js/i18n/ru.js).
var IGUALES_PERMITIDOS = [
  "ui.mercadona", "ui.weekplate", "ui.email", "ui.aspecto_kitty", "ent.col_rir", "ent.series_linea",
  "ui.cebolla_queso_azul_salmon", "ui.que_tienes_ej_arroz_blanco_cocido"
];

// Ejemplos que se teclean y se buscan contra el catálogo español: van en español a propósito.
var EJEMPLOS_EN_ESPANOL = ["ui.cebolla_queso_azul_salmon", "ui.que_tienes_ej_arroz_blanco_cocido"];

function run(t) {
  var es = tabla("es");
  var en = tabla("en");
  var ru = tabla("ru");
  var uk = tabla("uk");

  t.test("cada clave en español existe en inglés, ruso y ucraniano", function () {
    ["en", "ru", "uk"].forEach(function (lang) {
      var tb = { en: en, ru: ru, uk: uk }[lang];
      var faltan = Object.keys(es).filter(function (k) { return !(k in tb); });
      assert.deepStrictEqual(faltan, [], lang + " no tiene estas claves");
    });
  });

  t.test("ningún valor de interfaz está vacío, salvo los separadores previstos", function () {
    [["es", es], ["en", en], ["ru", ru], ["uk", uk]].forEach(function (par) {
      var vacios = Object.keys(par[1]).filter(function (k) {
        return !String(par[1][k]).trim() && VACIOS_PERMITIDOS.indexOf(k) === -1;
      });
      assert.deepStrictEqual(vacios, [], par[0] + ": valores vacíos");
    });
  });

  t.test("el ruso y el ucraniano no llevan marcas del español (ñ, ¿, ¡, acentos agudos)", function () {
    [["ru", ru], ["uk", uk]].forEach(function (par) {
      var conMarca = Object.keys(par[1]).filter(function (k) {
        return /[áéíóúñ¿¡ÁÉÍÓÚÑ]/.test(par[1][k]) && EJEMPLOS_EN_ESPANOL.indexOf(k) === -1;
      });
      assert.deepStrictEqual(conMarca, [], par[0] + ": valores con marcas del español");
    });
  });

  t.test("en ruso y ucraniano, un valor igual al español solo es una excepción prevista", function () {
    [["ru", ru], ["uk", uk]].forEach(function (par) {
      var iguales = Object.keys(es).filter(function (k) {
        return par[1][k] === es[k] && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(es[k]);
      });
      var sinExcepcion = iguales.filter(function (k) { return IGUALES_PERMITIDOS.indexOf(k) === -1; });
      assert.deepStrictEqual(sinExcepcion, [], par[0] + ": sigue en español sin motivo");
    });
  });

  t.test("las excepciones de ejemplos siguen estando en la tabla (si no, la lista miente)", function () {
    IGUALES_PERMITIDOS.forEach(function (k) {
      assert.ok(k in es, k + " no existe en es");
    });
  });

  t.test("la tabla de comida en ruso y ucraniano no deja nombres sin traducir", function () {
    var txt = function (lang) {
      var f = fs.readFileSync(projPath("js/i18n/food-" + lang + ".js"), "utf8");
      var mapa = {};
      var re = /^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm;
      var m;
      while ((m = re.exec(f))) mapa[JSON.parse('"' + m[1] + '"')] = JSON.parse('"' + m[2] + '"');
      return mapa;
    };
    ["ru", "uk"].forEach(function (lang) {
      var mapa = txt(lang);
      var iguales = Object.keys(mapa).filter(function (k) { return mapa[k] === k && /[a-záéíóúñ]/i.test(k); });
      assert.deepStrictEqual(iguales, [], "food-" + lang + ": entradas sin traducir");
    });
  });
}

module.exports = { run: run };

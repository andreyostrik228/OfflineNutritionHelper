/**
 * tests/vacios.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los estados vacíos enseñan un texto, no una pantalla en blanco: sin plan,
 * con la despensa vacía y sin ningún peso guardado. Cada texto existe en las
 * cuatro lenguas, no está vacío y en ruso y ucraniano no es el español.
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

// Cada estado vacío y la clave de su texto.
var ESTADOS_VACIOS = {
  "sin plan (tarjeta de espera)": "html.esperando_parametros",
  "sin plan (cómo empezar)": "html.configura_tus_datos_en_el_panel_lateral_y_pu",
  "despensa vacía (cuerpo)": "html.tu_despensa_esta_vacia_aqui_guardas_lo_que_y",
  "despensa vacía (lista)": "ui.tu_despensa_esta_vacia",
  "sin pesos guardados": "ui.peso_registro_vacio_total"
};

function run(t) {
  var es = tabla("es");
  var en = tabla("en");
  var ru = tabla("ru");
  var uk = tabla("uk");

  t.test("cada estado vacío tiene su texto en español, inglés, ruso y ucraniano, sin vacíos", function () {
    Object.keys(ESTADOS_VACIOS).forEach(function (nombre) {
      var k = ESTADOS_VACIOS[nombre];
      [["es", es], ["en", en], ["ru", ru], ["uk", uk]].forEach(function (par) {
        assert.ok(k in par[1], nombre + ": falta " + k + " en " + par[0]);
        assert.ok(String(par[1][k]).trim().length > 0, nombre + ": " + k + " está vacío en " + par[0]);
      });
    });
  });

  t.test("en ruso y ucraniano el texto está traducido (no es el español)", function () {
    Object.keys(ESTADOS_VACIOS).forEach(function (nombre) {
      var k = ESTADOS_VACIOS[nombre];
      assert.notStrictEqual(ru[k], es[k], nombre + ": el ruso sigue en español");
      assert.notStrictEqual(uk[k], es[k], nombre + ": el ucraniano sigue en español");
    });
  });

  t.test("la pantalla usa esos textos: la espera y la despensa en el marcado o el código, el de pesos en render-weight", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    var pantalla = fs.readFileSync(projPath("js/ui/render-pantry.js"), "utf8");
    var pesos = fs.readFileSync(projPath("js/ui/render-weight.js"), "utf8");
    assert.ok(html.indexOf('data-i18n-html="html.esperando_parametros"') !== -1 || app.indexOf("html.esperando_parametros") !== -1,
      "la tarjeta de espera usa html.esperando_parametros");
    assert.ok(html.indexOf("html.tu_despensa_esta_vacia_aqui_guardas_lo_que_y") !== -1 || pantalla.indexOf("html.tu_despensa_esta_vacia_aqui_guardas_lo_que_y") !== -1,
      "la despensa vacía usa su texto");
    assert.ok(pesos.indexOf("ui.peso_registro_vacio_total") !== -1, "el gráfico sin pesos usa su texto");
  });
}

module.exports = { run: run };

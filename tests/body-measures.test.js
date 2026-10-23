/**
 * tests/body-measures.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Medidas del cuerpo (js/core/body-measures.js, 2026-10-23): lectura de la
 * cifra, una entrada por día que se MEZCLA con lo de hoy, fusión con la nube,
 * límite de fechas, almacenamiento roto y el viaje dentro de `settings`
 * (`_medidas`) sin tocar las reglas de Firestore.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function cargar() {
  var s = loadBrowserGlobals([projPath("js/core/body-measures.js")]);
  var mapa = {};
  s.window = {
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mapa, k) ? mapa[k] : null; },
      setItem: function (k, v) { mapa[k] = String(v); },
      removeItem: function (k) { delete mapa[k]; }
    }
  };
  s._mapa = mapa;
  return s;
}

function almacenRoto() {
  function fallar() { throw new Error("SecurityError"); }
  return { getItem: fallar, setItem: fallar, removeItem: fallar };
}

function comoJson(v) { return JSON.parse(JSON.stringify(v)); }

function run(t) {

  t.test("una medida escrita a mano: coma o punto, una cifra decimal, de 10 a 250 cm; vacío es «no se midió»", function () {
    var s = cargar();
    assert.strictEqual(JSON.stringify(s.medidaAnalizar("")), '{"ok":true,"cm":null}');
    assert.strictEqual(JSON.stringify(s.medidaAnalizar("  ")), '{"ok":true,"cm":null}');
    assert.strictEqual(s.medidaAnalizar("82").cm, 82);
    assert.strictEqual(s.medidaAnalizar("82,5").cm, 82.5);
    assert.strictEqual(s.medidaAnalizar(" 36.5 ").cm, 36.5);
    assert.strictEqual(s.medidaAnalizar("82,55").error, "paso");
    assert.strictEqual(s.medidaAnalizar("5").error, "rango");
    assert.strictEqual(s.medidaAnalizar("300").error, "rango");
    assert.strictEqual(s.medidaAnalizar("8a").error, "formato");
    assert.strictEqual(s.medidaAnalizar("-80").error, "formato");
  });

  t.test("limpiar: fuera lo mal formado, una entrada por fecha (gana la de mayor t), en orden", function () {
    var s = cargar();
    var lista = s.medidasLimpiar([
      { fecha: "2026-10-20", t: 5, m: { cintura: 82, oreja: 9, pecho: "100" } },
      { fecha: "2026-10-20", t: 9, m: { cintura: 81.5 } },
      { fecha: "2026-10-01", t: 1, m: { brazo: 36.44 } },
      { fecha: "2026-02-30", t: 1, m: { cintura: 80 } },
      { fecha: "2026-10-02", t: -1, m: { cintura: 80 } },
      { fecha: "2026-10-03", t: 1, m: { cintura: 5 } },
      { fecha: "2026-10-04", t: 1, m: [] },
      null, "texto"
    ]);
    assert.deepStrictEqual(comoJson(lista), [
      { fecha: "2026-10-01", t: 1, m: { brazo: 36.4 } },
      { fecha: "2026-10-20", t: 9, m: { cintura: 81.5 } }
    ]);
    var muchas = [];
    for (var i = 0; i < 400; i++) {
      var d = new Date(2025, 0, 1 + i);
      muchas.push({ fecha: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"), t: i, m: { cintura: 80 } });
    }
    var limpias = s.medidasLimpiar(muchas);
    assert.strictEqual(limpias.length, s.MEDIDAS_MAX_ENTRADAS);
    assert.strictEqual(limpias[limpias.length - 1].t, 399, "se quedan las más recientes");
  });

  t.test("guardar hoy mezcla con lo de hoy: lo vacío conserva lo de antes; sin nada válido no cambia nada", function () {
    var s = cargar();
    var lista = [{ fecha: "2026-10-20", t: 1, m: { cintura: 83 } }];
    var manana = s.medidasGuardarHoy(lista, { cintura: 82.5 }, 10, "2026-10-21");
    var tarde = s.medidasGuardarHoy(manana, { brazo: 36, cintura: null }, 20, "2026-10-21");
    assert.deepStrictEqual(comoJson(tarde), [
      { fecha: "2026-10-20", t: 1, m: { cintura: 83 } },
      { fecha: "2026-10-21", t: 20, m: { cintura: 82.5, brazo: 36 } }
    ]);
    assert.deepStrictEqual(comoJson(s.medidasGuardarHoy(lista, {}, 30, "2026-10-21")), comoJson(lista), "nada que guardar");
    assert.deepStrictEqual(comoJson(s.medidasGuardarHoy(lista, { cintura: 80 }, 30, "2026-13-01")), comoJson(lista), "fecha imposible");
    assert.deepStrictEqual(comoJson(s.medidasSerie(tarde, "cintura")), [{ fecha: "2026-10-20", cm: 83 }, { fecha: "2026-10-21", cm: 82.5 }]);
    assert.deepStrictEqual(comoJson(s.medidasSerie(tarde, "muslo")), []);
  });

  t.test("fusión con la nube: se unen las fechas; en la misma, gana la de mayor t y, si empatan, la del dispositivo", function () {
    var s = cargar();
    var local = [{ fecha: "2026-10-01", t: 5, m: { cintura: 82 } }, { fecha: "2026-10-02", t: 5, m: { cintura: 81 } }];
    var nube = [{ fecha: "2026-10-01", t: 9, m: { cintura: 90 } }, { fecha: "2026-10-02", t: 5, m: { cintura: 70 } }, { fecha: "2026-10-03", t: 1, m: { pecho: 100 } }];
    var f = s.medidasFusionar(local, nube);
    assert.deepStrictEqual(comoJson(f.map(function (e) { return e.m; })), [{ cintura: 90 }, { cintura: 81 }, { pecho: 100 }]);
    assert.strictEqual(s.medidasFusionar(null, undefined).length, 0);
  });

  t.test("almacenamiento: guarda y lee; roto o sin él, nada lanza", function () {
    var s = cargar();
    var almacen = s.medidasAlmacen();
    assert.strictEqual(s.medidasEscribir(almacen, [{ fecha: "2026-10-21", t: 1, m: { cintura: 82 } }]), true);
    assert.strictEqual(s.medidasLeer(almacen).length, 1);
    s._mapa[s.MEDIDAS_CLAVE] = "{roto";
    assert.strictEqual(s.medidasLeer(almacen).length, 0);
    assert.strictEqual(s.medidasLeer(almacenRoto()).length, 0);
    assert.strictEqual(s.medidasEscribir(almacenRoto(), []), false);
    assert.strictEqual(s.medidasLeer(null).length, 0);
    s.medidasBorrarAlmacen(almacenRoto());
    s.medidasBorrarAlmacen(almacen);
    assert.strictEqual(s._mapa[s.MEDIDAS_CLAVE], undefined);
    assert.ok(/^weekplate-/.test(s.MEDIDAS_CLAVE), "entra en «Descargar mis datos» (prefijos de js/core/data-backup.js)");
  });

  t.test("la nube: los ajustes llevan `_medidas` sin tocar el original, y al bajar se mezclan", function () {
    var s = cargar();
    var ajustes = { goal: "bulk" };
    var copia = s.settingsWithMeasures(ajustes, [{ fecha: "2026-10-21", t: 1, m: { cintura: 82 } }]);
    assert.strictEqual(copia.goal, "bulk");
    assert.strictEqual(copia._medidas.length, 1);
    assert.strictEqual(ajustes._medidas, undefined);
    s.medidasEscribir(s.medidasAlmacen(), [{ fecha: "2026-10-20", t: 1, m: { pecho: 100 } }]);
    assert.strictEqual(s.mergeMeasuresFromCloud([{ fecha: "2026-10-21", t: 1, m: { cintura: 82 } }]), true);
    assert.strictEqual(s.medidasLeer(s.medidasAlmacen()).length, 2);
    assert.strictEqual(s.mergeMeasuresFromCloud(undefined), false, "sin `_medidas` no cambia nada");
    assert.strictEqual(s.medidasLeer(s.medidasAlmacen()).length, 2);
  });

  t.test("cableado: sube con los ajustes, se mezcla al bajar, se borra al salir; las reglas no cambian", function () {
    var cloud = fs.readFileSync(projPath("js/core/cloud-sync.js"), "utf8");
    var mig = fs.readFileSync(projPath("js/core/migration.js"), "utf8");
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var reglas = fs.readFileSync(projPath("firebase/firestore.rules"), "utf8");
    assert.ok(cloud.indexOf("settingsWithMeasures(conSinCocinar") !== -1);
    assert.ok(mig.indexOf("mergeMeasuresFromCloud(row.settings && row.settings._medidas)") !== -1, "al hidratar");
    assert.ok(mig.indexOf("mergeMeasuresFromCloud(cloud.settings && cloud.settings._medidas)") !== -1, "al fusionar");
    assert.ok(mig.indexOf("medidasBorrarAlmacen(medidasAlmacen())") !== -1, "al cerrar sesión");
    assert.strictEqual(reglas.indexOf("_medidas"), -1);
    var pesos = html.indexOf('src="js/core/weight-log.js');
    var medidas = html.indexOf('src="js/core/body-measures.js');
    assert.ok(pesos !== -1 && pesos < medidas && medidas < html.indexOf('src="js/core/cloud-sync.js'), "carga tras el peso y antes de la nube");
    assert.ok(html.indexOf('src="js/ui/entreno-medidas.js') !== -1 && html.indexOf('src="js/ui/entreno-calendario.js') !== -1);
  });
}

module.exports = { run: run };

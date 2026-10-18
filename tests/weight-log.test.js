/**
 * tests/weight-log.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Registro de peso (js/core/weight-log.js y js/ui/render-weight.js): lectura
 * de la cifra, un peso por día, fusión con la nube, límite de 365 fechas,
 * gráfico y cableado con la nube sin tocar las reglas de Firestore.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function cargar() {
  var s = loadBrowserGlobals([projPath("js/core/weight-log.js")]);
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

/** Almacenamiento que lanza, como uno bloqueado o con la cuota llena. */
function almacenRoto() {
  function fallar() { throw new Error("SecurityError"); }
  return { getItem: fallar, setItem: fallar, removeItem: fallar };
}

function entrada(fecha, kg, t) { return { fecha: fecha, kg: kg, t: t === undefined ? 1 : t }; }

/** Los datos tal como vuelven de JSON (ver nota en plan-store.test.js). */
function comoJson(v) { return JSON.parse(JSON.stringify(v)); }

function run(t) {

  // ── Lectura de la cifra ───────────────────────────────────────────────

  t.test("el peso acepta coma o punto y redondea a una décima", function () {
    var s = cargar();
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("72,5")), { ok: true, kg: 72.5 });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("72.5")), { ok: true, kg: 72.5 });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar(" 72,50 ")), { ok: true, kg: 72.5 });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("72")), { ok: true, kg: 72 });
  });

  t.test("los extremos 30 y 300 se aceptan; fuera de rango se rechaza", function () {
    var s = cargar();
    assert.strictEqual(s.pesoAnalizar("30").ok, true);
    assert.strictEqual(s.pesoAnalizar("300").ok, true);
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("29,9")), { ok: false, error: "rango" });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("300,1")), { ok: false, error: "rango" });
  });

  t.test("con paso de 0.1: más de una cifra decimal se rechaza", function () {
    var s = cargar();
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("72,55")), { ok: false, error: "paso" });
  });

  t.test("vacío, letras, negativos y notación científica no pasan", function () {
    var s = cargar();
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("")), { ok: false, error: "vacio" });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("   ")), { ok: false, error: "vacio" });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("abc")), { ok: false, error: "formato" });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("-5")), { ok: false, error: "formato" });
    assert.deepStrictEqual(comoJson(s.pesoAnalizar("1e2")), { ok: false, error: "formato" });
  });

  t.test("la fecha de hoy sale como YYYY-MM-DD con ceros", function () {
    var s = cargar();
    assert.strictEqual(s.fechaHoy(new Date(2026, 0, 5, 10, 30)), "2026-01-05");
    assert.strictEqual(s.fechaHoy(new Date(2026, 9, 18, 23, 59)), "2026-10-18");
  });

  // ── Un peso por día ───────────────────────────────────────────────────

  t.test("guardar hoy reemplaza la entrada de hoy y deja las demás", function () {
    var s = cargar();
    var lista = [entrada("2026-10-16", 73, 1), entrada("2026-10-17", 72.8, 2), entrada("2026-10-18", 72.5, 3)];
    var nueva = s.pesosGuardarHoy(lista, 72.1, 99, "2026-10-18");
    assert.strictEqual(nueva.length, 3, "sigue habiendo una entrada por fecha");
    assert.deepStrictEqual(comoJson(nueva[2]), { fecha: "2026-10-18", kg: 72.1, t: 99 });
    assert.deepStrictEqual(comoJson(nueva[0]), comoJson(lista[0]), "los días anteriores no cambian");
  });

  t.test("guardar hoy sin entrada previa añade una, en orden de fecha", function () {
    var s = cargar();
    var nueva = s.pesosGuardarHoy([entrada("2026-10-10", 74, 1)], 72.4, 5, "2026-10-18");
    assert.deepStrictEqual(comoJson(nueva.map(function (e) { return e.fecha; })), ["2026-10-10", "2026-10-18"]);
  });

  t.test("un peso no válido no toca el registro", function () {
    var s = cargar();
    var lista = [entrada("2026-10-17", 72.8, 2)];
    var nueva = s.pesosGuardarHoy(lista, 12, 9, "2026-10-18");
    assert.deepStrictEqual(comoJson(nueva), comoJson(lista));
  });

  // ── Fusión con la nube ────────────────────────────────────────────────

  t.test("al fusionar, para la misma fecha gana la de mayor t", function () {
    var s = cargar();
    var local = [entrada("2026-10-18", 72.5, 100)];
    var nube = [entrada("2026-10-18", 71.9, 200)];
    assert.deepStrictEqual(comoJson(s.pesosFusionar(local, nube)), [entrada("2026-10-18", 71.9, 200)]);
    var nubeVieja = [entrada("2026-10-18", 71.9, 50)];
    assert.deepStrictEqual(comoJson(s.pesosFusionar(local, nubeVieja)), [entrada("2026-10-18", 72.5, 100)]);
  });

  t.test("si t empata, gana la del dispositivo", function () {
    var s = cargar();
    var fusion = s.pesosFusionar([entrada("2026-10-18", 72.5, 100)], [entrada("2026-10-18", 71.9, 100)]);
    assert.strictEqual(fusion[0].kg, 72.5);
  });

  t.test("fechas distintas en uno y otro lado se conservan todas, ordenadas", function () {
    var s = cargar();
    var fusion = s.pesosFusionar([entrada("2026-10-18", 72.5, 1)], [entrada("2026-10-15", 73.2, 1)]);
    assert.deepStrictEqual(comoJson(fusion.map(function (e) { return e.fecha; })), ["2026-10-15", "2026-10-18"]);
  });

  t.test("una lista de la nube con basura no rompe la fusión: se descarta lo malo", function () {
    var s = cargar();
    var fusion = s.pesosFusionar([entrada("2026-10-18", 72.5, 1)], [
      null, "texto", { fecha: "18/10/2026", kg: 72, t: 1 }, { fecha: "2026-10-17", kg: 500, t: 1 }, entrada("2026-10-17", 72.9, 1)
    ]);
    assert.deepStrictEqual(comoJson(fusion.map(function (e) { return e.kg; })), [72.9, 72.5]);
  });

  // ── Límite de 365 ─────────────────────────────────────────────────────

  t.test("se conservan las últimas 365 fechas: lo más viejo se descarta", function () {
    var s = cargar();
    var lista = [];
    for (var i = 0; i < 400; i++) {
      var d = new Date(2025, 0, 1 + i);
      lista.push(entrada(s.fechaHoy(d), 70 + (i % 10) / 10, i));
    }
    var limpia = s.pesosLimpiar(lista);
    assert.strictEqual(limpia.length, 365, "tope de 365 fechas");
    assert.strictEqual(limpia[0].fecha, s.fechaHoy(new Date(2025, 0, 1 + 35)), "la más vieja que queda es la 36ª");
    assert.strictEqual(limpia[364].fecha, s.fechaHoy(new Date(2025, 0, 1 + 399)), "la más nueva se conserva");
  });

  // ── Sin almacenamiento ────────────────────────────────────────────────

  t.test("sin almacenamiento, nada lanza: [] al leer, false al escribir", function () {
    var s = cargar();
    s.window = {};
    assert.deepStrictEqual(comoJson(s.pesosLeer(null)), []);
    assert.strictEqual(s.pesosEscribir(null, [entrada("2026-10-18", 72.5, 1)]), false);
    assert.doesNotThrow(function () { s.pesosBorrarAlmacen(null); });
    assert.strictEqual(s.mergeWeightLogFromCloud([entrada("2026-10-18", 72.5, 1)]), false);
  });

  t.test("con un almacenamiento que lanza (bloqueado o cuota), tampoco se cae", function () {
    var s = cargar();
    var roto = almacenRoto();
    assert.deepStrictEqual(comoJson(s.pesosLeer(roto)), []);
    assert.strictEqual(s.pesosEscribir(roto, [entrada("2026-10-18", 72.5, 1)]), false);
    assert.doesNotThrow(function () { s.pesosBorrarAlmacen(roto); });
  });

  t.test("lo guardado vuelve igual al leerlo", function () {
    var s = cargar();
    var lista = [entrada("2026-10-17", 72.8, 2), entrada("2026-10-18", 72.5, 3)];
    assert.strictEqual(s.pesosEscribir(s.window.localStorage, lista), true);
    assert.deepStrictEqual(comoJson(s.pesosLeer(s.window.localStorage)), comoJson(lista));
  });

  // ── Gráfico ───────────────────────────────────────────────────────────

  t.test("con menos de dos pesos no hay gráfico, y el texto lo dice", function () {
    var s = cargar();
    assert.strictEqual(s.pesosGrafico([], 320, 120), null);
    assert.strictEqual(s.pesosGrafico([entrada("2026-10-18", 72.5, 1)], 320, 120), null);
    assert.ok(fs.readFileSync(projPath("js/i18n/es.js"), "utf8").indexOf("Añade al menos dos pesajes") !== -1, "texto en es");
  });

  t.test("el gráfico toma las últimas 30 entradas, o todas si hay menos", function () {
    var s = cargar();
    var muchas = [];
    for (var i = 0; i < 40; i++) muchas.push(entrada(s.fechaHoy(new Date(2026, 8, 1 + i)), 72, i));
    assert.strictEqual(s.pesosParaGrafico(muchas).length, 30);
    assert.strictEqual(s.pesosParaGrafico(muchas)[0].fecha, s.fechaHoy(new Date(2026, 8, 11)));
    assert.strictEqual(s.pesosParaGrafico(muchas.slice(0, 10)).length, 10);
  });

  t.test("el gráfico da la línea, mínimo y máximo, y primera y última fecha", function () {
    var s = cargar();
    var g = s.pesosGrafico([entrada("2026-10-16", 73, 1), entrada("2026-10-17", 72.2, 2), entrada("2026-10-18", 72.8, 3)], 320, 120);
    assert.ok(g.path.charAt(0) === "M" && g.path.indexOf("L") !== -1, "es una línea M…L…");
    assert.strictEqual(g.min, 72.2);
    assert.strictEqual(g.max, 73);
    assert.strictEqual(g.primera, "2026-10-16");
    assert.strictEqual(g.ultima, "2026-10-18");
  });

  // ── Nube ──────────────────────────────────────────────────────────────

  t.test("los ajustes que suben llevan el registro en `_pesos` y no tocan el original", function () {
    var s = cargar();
    var ajustes = { age: 32, weight: 78 };
    var lista = [entrada("2026-10-18", 72.5, 1)];
    var copia = s.settingsWithWeightLog(ajustes, lista);
    assert.deepStrictEqual(comoJson(copia._pesos), comoJson(lista));
    assert.strictEqual(copia.age, 32);
    assert.strictEqual(ajustes._pesos, undefined, "el objeto original no se toca");
  });

  t.test("mergeWeightLogFromCloud junta lo de la nube con lo del dispositivo", function () {
    var s = cargar();
    s.pesosEscribir(s.window.localStorage, [entrada("2026-10-17", 72.8, 1)]);
    assert.strictEqual(s.mergeWeightLogFromCloud([entrada("2026-10-18", 72.1, 2)]), true);
    var fechas = s.pesosLeer(s.window.localStorage).map(function (e) { return e.fecha; });
    assert.deepStrictEqual(comoJson(fechas), ["2026-10-17", "2026-10-18"]);
    assert.strictEqual(s.mergeWeightLogFromCloud(undefined), false, "sin `_pesos` no cambia nada");
  });

  t.test("las reglas de Firestore no cambian: siguen solo los cuatro campos", function () {
    var reglas = fs.readFileSync(projPath("firebase/firestore.rules"), "utf8");
    assert.ok(reglas.indexOf("['pantry_state', 'pantry_history', 'settings', 'migrated_at']") !== -1);
    assert.strictEqual(reglas.indexOf("_pesos"), -1, "el registro viaja dentro de settings, no en una regla nueva");
  });

  t.test("cloud-sync y migration llevan el registro a la nube, lo mezclan al bajar y lo borran al salir", function () {
    var cloud = fs.readFileSync(projPath("js/core/cloud-sync.js"), "utf8");
    var mig = fs.readFileSync(projPath("js/core/migration.js"), "utf8");
    assert.ok(cloud.indexOf("settingsWithWeightLog(conPrefs") !== -1, "_ajustesParaNube añade el registro");
    assert.ok(mig.indexOf("mergeWeightLogFromCloud(row.settings") !== -1, "al hidratar se mezcla");
    assert.ok(mig.indexOf("mergeWeightLogFromCloud(cloud.settings") !== -1, "al fusionar se mezcla");
    assert.ok(mig.indexOf("pesosBorrarAlmacen(pesosAlmacen())") !== -1, "al cerrar sesión se borra");
  });

  // ── Cableado de la pantalla ───────────────────────────────────────────

  t.test("el bloque va justo debajo de «Peso (kg)» y el campo de peso sigue igual", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var peso = html.indexOf('id="weight"');
    var bloque = html.indexOf('id="weightLogInput"');
    var altura = html.indexOf('id="height"');
    assert.ok(peso !== -1 && bloque > peso && bloque < altura, "el bloque va entre el peso y la altura");
    assert.ok(html.indexOf('id="weight" type="number" min="35" max="250" step="0.1" value="78" required') !== -1, "el campo «Peso (kg)» no cambia");
    assert.ok(html.indexOf('id="weightLogSaveBtn"') !== -1 && html.indexOf('type="button" class="btn-secondary" id="weightLogSaveBtn"') !== -1,
      "Guardar es type=button: no envía el plan");
    ["weightLogMsg", "weightLogChart"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta " + id);
    });
  });

  t.test("los scripts nuevos cargan antes que app.js", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var app = html.indexOf('src="js/app.js');
    assert.ok(html.indexOf('src="js/core/weight-log.js') < app, "weight-log.js antes de app.js");
    assert.ok(html.indexOf('src="js/ui/render-weight.js') < app, "render-weight.js antes de app.js");
  });

  t.test("app.js arranca el registro con safeInit", function () {
    var app = fs.readFileSync(projPath("js/app.js"), "utf8").replace(/\r\n/g, "\n");
    assert.ok(app.indexOf('safeInit("weight-log", function () {') !== -1);
    assert.ok(app.indexOf("initWeightLog()") !== -1);
  });

  t.test("las claves nuevas existen en es, en, ru y uk", function () {
    var claves = ["ui.peso_registro_titulo", "ui.peso_registro_placeholder", "ui.peso_guardar", "ui.peso_registro_vacio",
      "ui.peso_registro_formato", "ui.peso_registro_rango", "ui.peso_registro_paso", "ui.peso_registro_guardado",
      "ui.peso_registro_sin_guardar", "ui.peso_registro_dos", "ui.peso_registro_grafico", "ui.peso_registro_min", "ui.peso_registro_max"];
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var txt = fs.readFileSync(projPath("js/i18n/" + lang + ".js"), "utf8");
      claves.forEach(function (k) {
        assert.ok(txt.indexOf('"' + k + '"') !== -1, lang + " no tiene " + k);
      });
    });
  });
}

module.exports = { run: run };

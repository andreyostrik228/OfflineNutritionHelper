/**
 * tests/entreno-nube.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El diario de entrenamiento y el cuestionario en la cuenta
 * (js/core/workout-sync.js): la forma compacta va y vuelve sin perder nada,
 * cabe en un documento, se une con lo del dispositivo sin resucitar lo
 * borrado, el cuestionario más nuevo gana, se sube lo que la nube no tiene y
 * al cerrar sesión se borra del dispositivo. Y que cloud-sync y migration lo
 * llevan por `settings`, sin reglas nuevas en Firestore.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function almacen(inicial) {
  var datos = {};
  Object.keys(inicial || {}).forEach(function (k) { datos[k] = inicial[k]; });
  return {
    datos: datos,
    get length() { return Object.keys(datos).length; },
    key: function (i) { return Object.keys(datos)[i] || null; },
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
    setItem: function (k, v) { datos[k] = String(v); },
    removeItem: function (k) { delete datos[k]; }
  };
}

function sandbox() {
  var s = loadBrowserGlobals([
    projPath("js/core/i18n.js"),
    projPath("js/i18n/es.js"),
    projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"),
    projPath("js/engine/workout-generator.js"),
    projPath("js/core/workout-log.js"),
    projPath("js/ui/render-entreno.js"),
    projPath("js/core/workout-sync.js")
  ]);
  s.localStorage = almacen({});
  // Sin esperar: la subida agrupada sale en el acto.
  s.setTimeout = function (fn) { fn(); return 1; };
  s.clearTimeout = function () {};
  return s;
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;
var HOY = new Date(2026, 9, 18, 12).getTime();

function sesion(inicio, extra) {
  var s = {
    id: "s" + inicio, clave: "superior_A", nombre: "Superior A", semana: 2, inicio: inicio, fin: inicio + HORA,
    ejercicios: [
      { id: "press_banca_barra", name: "Press de banca con barra", muscle: "pecho", reps: "6-10", compound: true, descanso: 150, grupo: "A",
        nota: "agarre medio",
        series: [{ kg: 40, reps: 8, hecha: true, tipo: "c" }, { kg: 60, reps: 8, hecha: true }, { kg: 50, reps: 10, hecha: true, tipo: "d" }] },
      { id: "remo_mancuerna", name: "Remo con mancuerna a una mano", muscle: "espalda", reps: "8-12", compound: true, descanso: 90, grupo: "A",
        series: [{ kg: 22, reps: 10, hecha: true, tipo: "f" }] }
    ]
  };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}

function sinTiempos(log) {
  // `t` de cada serie no viaja (solo hace falta en la sesión en curso).
  var copia = JSON.parse(JSON.stringify(log));
  copia.sesiones.forEach(function (s) { s.ejercicios.forEach(function (e) { e.series.forEach(function (x) { delete x.t; }); }); });
  return copia;
}

function run(t) {

  t.test("la forma compacta va y vuelve sin perder series, tipos, superseries, notas, pausas ni correcciones", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({ sesiones: [sesion(HOY - 2 * DIA, { pausas: 300000, editado: HOY - DIA }), sesion(HOY - DIA)], borradas: [{ id: "x", t: 7 }] });
    var bloque = JSON.parse(JSON.stringify(s.entrenoNubeBloque(log, { nivel: "avanzado", t: 99 })));
    var vuelta = s.entrenoNubeLeerBloque(bloque);
    assert.deepStrictEqual(sinTiempos(vuelta.log), sinTiempos(log));
    assert.strictEqual(vuelta.prefs.nivel, "avanzado");
    assert.strictEqual(vuelta.prefsT, 99);
    assert.strictEqual(JSON.stringify(bloque).indexOf("Press de banca"), -1, "los nombres del catálogo no viajan: se sacan del catálogo");
  });

  t.test("400 sesiones caben de sobra; con un tope pequeño suben las más recientes", function () {
    var s = sandbox();
    var muchas = [];
    for (var i = 0; i < 400; i++) {
      var ses = sesion(HOY - (400 - i) * DIA);
      ses.ejercicios = [0, 1, 2].map(function () { return JSON.parse(JSON.stringify(ses.ejercicios[0])); })
        .concat([0, 1, 2].map(function () { return JSON.parse(JSON.stringify(ses.ejercicios[1])); }))
        .map(function (e, k) { e.id = s.EXERCISE_CATALOG[k].id; e.series = [1, 2, 3, 4].map(function () { return { kg: 62.5, reps: 8, hecha: true }; }); return e; });
      muchas.push(ses);
    }
    var log = s.entrenoLogLimpiar({ sesiones: muchas });
    var bloque = s.entrenoNubeBloque(log, null);
    var bytes = JSON.stringify(bloque).length;
    assert.strictEqual(bloque.s.length, 400, "las 400");
    assert.ok(bytes < s.ENTRENO_NUBE_MAX_BYTES, "pesa " + bytes);
    var corto = s.entrenoNubeBloque(log, null, 5000);
    assert.ok(0 < corto.s.length && corto.s.length < 400);
    assert.strictEqual(corto.s[corto.s.length - 1][0], log.sesiones[399].id, "la última es la más reciente");
  });

  t.test("unir: lo de los dos lados, la corrección más nueva gana, lo borrado en cualquiera no vuelve y la sesión en curso es la de aquí", function () {
    var s = sandbox();
    var local = s.entrenoLogLimpiar({
      sesiones: [sesion(HOY - 3 * DIA), sesion(HOY - 2 * DIA, { editado: HOY - 5 })],
      enCurso: { id: "aqui", inicio: HOY, ejercicios: [{ id: "plancha", series: [{ kg: null, reps: 30 }] }] },
      borradas: [{ id: "s" + (HOY - 5 * DIA), t: HOY }]
    });
    var remoto = s.entrenoLogLimpiar({
      sesiones: [sesion(HOY - 5 * DIA), sesion(HOY - 2 * DIA, { editado: HOY - 10 }), sesion(HOY - DIA)],
      borradas: [{ id: "s" + (HOY - 3 * DIA), t: HOY }]
    });
    remoto.sesiones[1].ejercicios[0].series[1].kg = 999;
    var unido = s.entrenoNubeFusionar(local, remoto);
    assert.strictEqual(unido.sesiones.map(function (x) { return x.id; }).join(","), ["s" + (HOY - 2 * DIA), "s" + (HOY - DIA)].join(","));
    assert.strictEqual(unido.sesiones[0].ejercicios[0].series[1].kg, 60, "la corrección de aquí era más nueva");
    assert.strictEqual(unido.enCurso.id, "aqui");
    assert.strictEqual(unido.borradas.length, 2, "las borradas se unen");
  });

  t.test("settingsWithWorkouts mete el bloque en `_entrenos` sin tocar los ajustes de origen", function () {
    var s = sandbox();
    s.localStorage.setItem(s.ENTRENO_LOG_CLAVE, JSON.stringify({ v: 1, sesiones: [sesion(HOY - DIA)] }));
    var origen = { age: 30 };
    var copia = s.settingsWithWorkouts(origen);
    assert.strictEqual(origen._entrenos, undefined);
    assert.strictEqual(copia.age, 30);
    assert.strictEqual(copia._entrenos.s.length, 1);
  });

  t.test("al bajar: se une el diario, el cuestionario más nuevo gana y lo que solo había aquí se sube una vez", function () {
    var s = sandbox();
    var subidas = 0;
    s.getCurrentUser = function () { return { id: "u1" }; };
    s.getCloudSyncedUserId = function () { return "u1"; };
    s.pushSettingsToCloud = function () { subidas++; return Promise.resolve({}); };
    s.localStorage.setItem(s.ENTRENO_LOG_CLAVE, JSON.stringify({ v: 1, sesiones: [sesion(HOY - 3 * DIA)] }));
    s.localStorage.setItem(s.ENTRENO_CLAVE_PREFS, JSON.stringify({ nivel: "principiante", t: 10 }));
    var nube = s.entrenoNubeBloque(s.entrenoLogLimpiar({ sesiones: [sesion(HOY - DIA)] }), { nivel: "avanzado", configurado: true, t: 20 });
    assert.ok(s.mergeWorkoutsFromCloud(JSON.parse(JSON.stringify(nube))));
    var log = s.entrenoLogLeer();
    assert.strictEqual(log.sesiones.length, 2, "las de aquí y las de la nube");
    var prefs = s.entrenoLeerPrefs();
    assert.strictEqual(prefs.nivel, "avanzado");
    assert.strictEqual(prefs.configurado, true);
    assert.strictEqual(prefs.t, 20, "lo de la nube no se vuelve a fechar");
    s.pushWorkoutsIfPending();
    assert.strictEqual(subidas, 1, "aquí había una sesión que la nube no tenía");
    s.pushWorkoutsIfPending();
    assert.strictEqual(subidas, 1, "y solo una vez");
  });

  t.test("si la nube ya lo tiene todo, no se sube nada; un cuestionario viejo de la nube no pisa el de aquí", function () {
    var s = sandbox();
    var subidas = 0;
    s.getCurrentUser = function () { return { id: "u1" }; };
    s.getCloudSyncedUserId = function () { return "u1"; };
    s.pushSettingsToCloud = function () { subidas++; };
    var prefsAqui = s.entrenoPrefsLimpiar({ nivel: "intermedio", t: 50 });
    s.localStorage.setItem(s.ENTRENO_CLAVE_PREFS, JSON.stringify(prefsAqui));
    var log = s.entrenoLogLimpiar({ sesiones: [sesion(HOY - DIA)] });
    s.localStorage.setItem(s.ENTRENO_LOG_CLAVE, JSON.stringify(log));
    var nube = JSON.parse(JSON.stringify(s.entrenoNubeBloque(log, s.entrenoLeerPrefs())));
    nube.p.nivel = "avanzado";
    nube.pt = 40;
    s.mergeWorkoutsFromCloud(nube);
    assert.strictEqual(s.entrenoLeerPrefs().nivel, "intermedio");
    s.pushWorkoutsIfPending();
    assert.strictEqual(subidas, 1, "la nube tenía un cuestionario más viejo: se sube el de aquí");
    var igual = JSON.parse(JSON.stringify(s.entrenoNubeBloque(s.entrenoLogLeer(), s.entrenoLeerPrefs())));
    s.mergeWorkoutsFromCloud(igual);
    s.pushWorkoutsIfPending();
    assert.strictEqual(subidas, 1, "con todo igual, nada");
  });

  t.test("un bloque roto no rompe nada; sin cuenta no se sube; al cerrar sesión se borra del dispositivo", function () {
    var s = sandbox();
    s.localStorage.setItem(s.ENTRENO_LOG_CLAVE, JSON.stringify({ v: 1, sesiones: [sesion(HOY - DIA)] }));
    assert.strictEqual(s.entrenoNubeLeerBloque({ s: "no" }), null);
    assert.strictEqual(s.entrenoNubeLeerBloque(null), null);
    s.mergeWorkoutsFromCloud({ s: [[1, 2, 3], "x", null] });
    assert.strictEqual(s.entrenoLogLeer().sesiones.length, 1, "lo de aquí sigue");
    var subidas = 0;
    s.pushSettingsToCloud = function () { subidas++; };
    s.getCurrentUser = function () { return null; };
    s.pushWorkoutsToCloud();
    assert.strictEqual(subidas, 0);
    s.getCurrentUser = function () { return { id: "u1" }; };
    s.getCloudSyncedUserId = function () { return "otro"; };
    s.pushWorkoutsToCloud();
    assert.strictEqual(subidas, 0, "la cuenta aún no está sincronizada");
    s.localStorage.setItem(s.ENTRENO_CLAVE_PREFS, "{}");
    s.entrenoNubeBorrarDispositivo();
    assert.strictEqual(s.localStorage.getItem(s.ENTRENO_LOG_CLAVE), null);
    assert.strictEqual(s.localStorage.getItem(s.ENTRENO_CLAVE_PREFS), null);
  });

  t.test("cloud-sync lo sube dentro de settings, migration lo une al bajar y lo borra al salir; las reglas no cambian", function () {
    var cloud = fs.readFileSync(projPath("js/core/cloud-sync.js"), "utf8");
    var mig = fs.readFileSync(projPath("js/core/migration.js"), "utf8");
    var reglas = fs.readFileSync(projPath("firebase/firestore.rules"), "utf8");
    assert.ok(cloud.indexOf("settingsWithWorkouts(conPrefs)") !== -1);
    assert.ok(mig.indexOf("mergeWorkoutsFromCloud(row.settings && row.settings._entrenos)") !== -1, "al hidratar");
    assert.ok(mig.indexOf("mergeWorkoutsFromCloud(cloud.settings && cloud.settings._entrenos)") !== -1, "al combinar");
    assert.ok(mig.indexOf("entrenoNubeBorrarDispositivo()") !== -1, "al salir");
    assert.ok(mig.indexOf("_pushWorkoutsIfPending()") !== -1, "tras fijar el marcador");
    assert.strictEqual(reglas.indexOf("_entrenos"), -1, "viaja dentro de settings, no en una regla nueva");
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(html.indexOf('<script src="js/core/workout-sync.js') !== -1);
  });
}

module.exports = { run: run };

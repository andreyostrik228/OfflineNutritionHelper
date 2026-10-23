/**
 * tests/entreno-programas.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * «Plan» a la medida (2026-10-23): la semana montada a mano (añadir, copiar,
 * renombrar, quitar y cambiar de día una sesión), los programas listos con
 * filtros y las plantillas. El generador (js/engine/workout-generator.js), las
 * respuestas guardadas (js/ui/render-entreno.js) y las operaciones y el marcado
 * (js/ui/entreno-programas.js).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox(lang) {
  var s = loadBrowserGlobals([
    "js/core/i18n.js", "js/i18n/es.js", "js/i18n/en.js", "js/i18n/ru.js", "js/i18n/uk.js",
    "js/core/utils.js", "js/data/exercises.js", "js/engine/workout-generator.js",
    "js/core/workout-log.js", "js/ui/render-entreno.js", "js/ui/entreno-programas.js"
  ].map(projPath));
  s._langMemoryState = lang || "ru";
  return s;
}

function plano(x) { return JSON.parse(JSON.stringify(x)); }

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent.", "[object"].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

/** El plan de unas respuestas, con 4 días si no hay estructura. */
function planDe(s, prefs, dias) {
  return s.entrenoPlanParaDatos({
    dias: dias || 4, objetivo: "bulk", nivel: prefs.nivel || "intermedio", equipamiento: "gimnasio",
    cambios: prefs.cambios, quitados: prefs.quitados, extras: prefs.extras,
    estructura: prefs.estructura, programa: prefs.programa, semana: 1
  });
}

function prefsBase(s, extra) {
  var p = s.entrenoPrefsLimpiar(extra || {});
  p.nivel = "intermedio";
  return p;
}

function run(t) {

  // ── El generador ──────────────────────────────────────────────────────

  t.test("con estructura, el plan son sus sesiones: en su orden, con su nombre y su día, y los días de «Mis datos» no cuentan", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 2, goal: "bulk" }, { nivel: "intermedio", estructura: [
      { i: "p1", k: "superior_A", n: "", d: 1 },
      { i: "p2", k: "inferior_A", n: "Piernas del jueves", d: 4 },
      { i: "p3", k: "superior_A", n: "", d: 6 }
    ] });
    assert.strictEqual(plan.ok, true);
    assert.strictEqual(plan.sesiones.length, 3);
    assert.deepStrictEqual(plano(plan.sesiones.map(function (x) { return x.dia; })), [1, 4, 6]);
    assert.strictEqual(plan.sesiones[1].name, "Piernas del jueves");
    assert.strictEqual(plan.sesiones[1].nombrePropio, true);
    assert.strictEqual(plan.sesiones[2].instancia, "p3");
    assert.strictEqual(plan.division, "propia");
    assert.ok(plan.sesiones.every(function (x) { return x.exercises.length > 0; }));
  });

  t.test("dos copias de la misma plantilla se cambian cada una por su lado (lo añadido y lo quitado va por su id)", function () {
    var s = sandbox();
    var opciones = { nivel: "intermedio", estructura: [{ i: "p1", k: "superior_A", n: "", d: 1 }, { i: "p2", k: "superior_A", n: "", d: 3 }],
      extras: { p2: ["curl_martillo"] }, quitados: ["p1:tiron_vertical"] };
    var plan = s.generateWorkoutPlan({ goal: "bulk" }, opciones);
    var ids = function (x) { return x.exercises.map(function (e) { return e.id; }); };
    assert.strictEqual(ids(plan.sesiones[0]).indexOf("curl_martillo"), -1, "lo añadido a p2 no sale en p1");
    assert.ok(ids(plan.sesiones[1]).indexOf("curl_martillo") !== -1, "y sí en p2");
    var patrones = function (x) { return x.exercises.map(function (e) { return e.patron; }); };
    assert.strictEqual(patrones(plan.sesiones[0]).indexOf("tiron_vertical"), -1, "el hueco quitado en p1");
    assert.ok(patrones(plan.sesiones[1]).indexOf("tiron_vertical") !== -1, "sigue en p2");
  });

  t.test("una sesión libre sale vacía (ni el acento le mete nada) y con lo añadido a mano lleva solo eso", function () {
    var s = sandbox();
    var vacia = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "intermedio", enfoque: ["brazos"],
      estructura: [{ i: "p1", k: "libre", n: "", d: 2 }] });
    assert.strictEqual(vacia.sesiones[0].exercises.length, 0);
    var conAlgo = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "intermedio",
      estructura: [{ i: "p1", k: "libre", n: "", d: 2 }], extras: { p1: ["plancha"] } });
    assert.deepStrictEqual(plano(conAlgo.sesiones[0].exercises.map(function (e) { return e.id; })), ["plancha"]);
  });

  t.test("5×5: los compuestos llevan 5 series de 5 con 3 min de descanso, y «5-5» se lee «5»", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "principiante", programa: "cinco_por_cinco",
      estructura: s.estructuraDePrograma("cinco_por_cinco") });
    assert.strictEqual(plan.programa, "cinco_por_cinco");
    plan.sesiones.forEach(function (x) {
      x.exercises.filter(function (e) { return e.compound; }).forEach(function (e) {
        assert.strictEqual(e.sets, 5, e.id);
        assert.strictEqual(e.reps, "5-5", e.id);
        assert.strictEqual(e.restSeconds, 180, e.id);
      });
    });
    assert.strictEqual(s.entrenoRepsTexto("5-5"), "5");
    assert.strictEqual(s.entrenoRepsTexto("6-10"), "6–10");
  });

  t.test("cada programa listo: sesiones que existen, de 2 a 6 días, niveles y objetivos conocidos y un plan sin avisos de huecos en el gimnasio", function () {
    var s = sandbox();
    s.WORKOUT_PROGRAMAS.forEach(function (p) {
      assert.ok(p.sesiones.length >= 2 && p.sesiones.length <= 6, p.id);
      p.sesiones.forEach(function (k) { assert.ok(Object.prototype.hasOwnProperty.call(s.WORKOUT_SESIONES, k), p.id + ": " + k); });
      p.niveles.forEach(function (n) { assert.ok(s.WORKOUT_LEVELS.indexOf(n) !== -1, p.id); });
      p.objetivos.forEach(function (o) { assert.ok(["masa", "fuerza", "forma"].indexOf(o) !== -1, p.id); });
      var plan = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "avanzado", programa: p.id, estructura: s.estructuraDePrograma(p.id) });
      assert.strictEqual(plan.sesiones.length, p.sesiones.length, p.id);
      assert.deepStrictEqual(plano(plan.warnings.filter(function (w) { return w.indexOf("falta_ejercicio") === 0; })), [], p.id);
    });
    var dias = s.estructuraDePrograma("superior_inferior_4", [2, 3, 5, 6]).map(function (x) { return x.d; });
    assert.deepStrictEqual(plano(dias), [2, 3, 5, 6], "los días elegidos en el cuestionario, si son tantos");
    assert.deepStrictEqual(plano(s.estructuraDePrograma("superior_inferior_4", [1, 2]).map(function (x) { return x.d; })), [1, 2, 4, 5]);
  });

  // ── Las respuestas guardadas ──────────────────────────────────────────

  t.test("las respuestas guardan estructura, programa y plantillas válidos; lo roto se cae sin romper lo demás", function () {
    var s = sandbox();
    var p = s.entrenoPrefsLimpiar({
      estructura: [{ i: "p1", k: "superior_A", n: " Lunes <b>fuerte</b>\n", d: 1 }, { i: "p1", k: "inferior_A" },
        { i: "X!", k: "inferior_A" }, { i: "p2", k: "no_existe" }, { i: "p3", k: "libre", d: 9 }],
      programa: "no_existe",
      extras: { p1: ["plancha"], p9: ["plancha"], constructor: ["plancha"] },
      quitados: ["p1:core", "p9:core", "superior_A:core"],
      plantillas: [{ nombre: "Zal", estructura: [{ i: "p1", k: "superior_A" }] }, { nombre: "", estructura: [{ i: "p1", k: "superior_A" }] },
        { nombre: "Sin semana" }, "basura"]
    });
    assert.deepStrictEqual(plano(p.estructura), [{ i: "p1", k: "superior_A", n: "Lunes bfuerte/b", d: 1 }, { i: "p3", k: "libre", n: "", d: 0 }]);
    assert.strictEqual(p.programa, "");
    assert.deepStrictEqual(plano(p.extras), { p1: ["plancha"] }, "solo las sesiones que existen");
    assert.deepStrictEqual(plano(p.quitados), ["p1:core", "superior_A:core"]);
    assert.strictEqual(p.plantillas.length, 1);
    assert.strictEqual(p.plantillas[0].nombre, "Zal");
  });

  // ── Las operaciones ───────────────────────────────────────────────────

  t.test("la primera acción fija la semana: ids p1…, sus días, y lo añadido y quitado de cada plantilla pasa a cada sesión", function () {
    var s = sandbox();
    var prefs = prefsBase(s, { extras: { superior_A: ["plancha"] }, quitados: ["inferior_A:core"] });
    var plan = planDe(s, prefs, 4);
    var nuevas = s.entrenoEstructuraOperar(prefs, plan, "renombrar", { i: "p1", nombre: "Pecho y espalda" });
    assert.deepStrictEqual(plano(nuevas.estructura.map(function (x) { return x.i + ":" + x.k + ":" + x.d; })),
      ["p1:superior_A:1", "p2:inferior_A:2", "p3:superior_B:4", "p4:inferior_B:5"]);
    assert.strictEqual(nuevas.estructura[0].n, "Pecho y espalda");
    assert.deepStrictEqual(plano(nuevas.extras), { p1: ["plancha"] });
    assert.deepStrictEqual(plano(nuevas.quitados), ["p2:core"]);
    assert.strictEqual(prefs.estructura, null, "las respuestas de entrada no se tocan");
    var plan2 = planDe(s, nuevas);
    assert.strictEqual(plan2.sesiones[0].name, "Pecho y espalda");
    assert.ok(plan2.sesiones[0].exercises.some(function (e) { return e.id === "plancha"; }), "lo añadido sigue");
  });

  t.test("copiar pone la copia detrás, en el primer día libre, con su nombre y lo añadido a mano; quitar no deja la semana vacía", function () {
    var s = sandbox();
    var prefs = prefsBase(s, { estructura: [{ i: "p1", k: "superior_A", n: "", d: 1 }, { i: "p2", k: "inferior_A", n: "", d: 2 }],
      extras: { p1: ["plancha"] } });
    var plan = planDe(s, prefs);
    var c = s.entrenoEstructuraOperar(prefs, plan, "copiar", { i: "p1", nombre: "Верх A (копия)" });
    assert.deepStrictEqual(plano(c.estructura.map(function (x) { return x.i + ":" + x.d; })), ["p1:1", "p2:2", "p3:3"],
      "la copia al primer día libre (el 2 está ocupado), y la semana en orden de días");
    assert.strictEqual(c.estructura[2].n, "Верх A (копия)");
    assert.deepStrictEqual(plano(c.extras.p3), ["plancha"]);
    var q = s.entrenoEstructuraOperar(c, planDe(s, c), "quitar", { i: "p1" });
    assert.deepStrictEqual(plano(q.estructura.map(function (x) { return x.i; })), ["p2", "p3"]);
    assert.strictEqual(q.extras.p1, undefined, "lo de la sesión quitada se va");
    var una = prefsBase(s, { estructura: [{ i: "p1", k: "superior_A", n: "", d: 1 }] });
    assert.strictEqual(s.entrenoEstructuraOperar(una, planDe(s, una), "quitar", { i: "p1" }), null);
  });

  t.test("cambiar de día a uno ocupado intercambia los días; añadir llega hasta 7 sesiones y no más", function () {
    var s = sandbox();
    var prefs = prefsBase(s, { estructura: [{ i: "p1", k: "superior_A", n: "", d: 1 }, { i: "p2", k: "inferior_A", n: "", d: 3 }] });
    var d = s.entrenoEstructuraOperar(prefs, planDe(s, prefs), "dia", { i: "p1", d: 3 });
    assert.deepStrictEqual(plano(d.estructura.map(function (x) { return x.i + ":" + x.d; })), ["p2:1", "p1:3"], "se cambian el sitio y quedan en orden");
    assert.deepStrictEqual(plano(d.diasSemana), [1, 3]);
    assert.strictEqual(s.entrenoEstructuraOperar(prefs, planDe(s, prefs), "dia", { i: "p1", d: 8 }), null);
    var p = prefs;
    for (var k = 0; k < 5; k++) p = s.entrenoEstructuraOperar(p, planDe(s, p), "nueva", { k: "libre" });
    assert.strictEqual(p.estructura.length, 7);
    assert.deepStrictEqual(plano(p.estructura.map(function (x) { return x.d; }).sort()), [1, 2, 3, 4, 5, 6, 7]);
    assert.strictEqual(s.entrenoEstructuraOperar(p, planDe(s, p), "nueva", { k: "libre" }), null);
    assert.strictEqual(s.entrenoEstructuraOperar(prefs, planDe(s, prefs), "nueva", { k: "no_existe" }), null);
  });

  t.test("elegir un programa listo cambia la semana y quita lo de dentro de las sesiones, pero deja los ejercicios cambiados", function () {
    var s = sandbox();
    var prefs = prefsBase(s, { cambios: { press_banca_barra: "press_banca_mancuernas" }, extras: { superior_A: ["plancha"] } });
    var p = s.entrenoEstructuraOperar(prefs, planDe(s, prefs), "programa", { id: "empuje_tiron_piernas_3" });
    assert.strictEqual(p.programa, "empuje_tiron_piernas_3");
    assert.deepStrictEqual(plano(p.estructura.map(function (x) { return x.k; })), ["empuje_A", "tiron_A", "piernas_A"]);
    assert.deepStrictEqual(plano(p.extras), {});
    assert.deepStrictEqual(plano(p.cambios), { press_banca_barra: "press_banca_mancuernas" });
    assert.strictEqual(s.entrenoEstructuraOperar(prefs, planDe(s, prefs), "programa", { id: "no_existe" }), null);
    var r = s.entrenoEstructuraOperar(p, planDe(s, p), "rehacer");
    assert.strictEqual(r.estructura, null);
    assert.strictEqual(r.programa, "");
  });

  t.test("plantillas: guardar (el mismo nombre sustituye), aplicar trae la semana entera, borrar, y como mucho 8", function () {
    var s = sandbox();
    var prefs = prefsBase(s, { estructura: [{ i: "p1", k: "superior_A", n: "Lunes", d: 1 }], extras: { p1: ["plancha"] } });
    var g = s.entrenoEstructuraOperar(prefs, planDe(s, prefs), "plantilla_guardar", { nombre: "Зал" });
    assert.strictEqual(g.plantillas.length, 1);
    var g2 = s.entrenoEstructuraOperar(g, planDe(s, g), "plantilla_guardar", { nombre: "зал" });
    assert.strictEqual(g2.plantillas.length, 1, "mismo nombre sin distinguir mayúsculas");
    assert.strictEqual(s.entrenoEstructuraOperar(g, planDe(s, g), "plantilla_guardar", { nombre: "  " }), null);
    var otra = s.entrenoEstructuraOperar(g, planDe(s, g), "programa", { id: "superior_inferior_4" });
    var vuelta = s.entrenoEstructuraOperar(otra, planDe(s, otra), "plantilla_aplicar", { n: 0 });
    assert.deepStrictEqual(plano(vuelta.estructura), [{ i: "p1", k: "superior_A", n: "Lunes", d: 1 }]);
    assert.deepStrictEqual(plano(vuelta.extras), { p1: ["plancha"] });
    assert.strictEqual(vuelta.programa, "");
    var b = s.entrenoEstructuraOperar(vuelta, planDe(s, vuelta), "plantilla_borrar", { n: 0 });
    assert.strictEqual(b.plantillas.length, 0);
    var llena = g;
    for (var k = 0; k < 7; k++) llena = s.entrenoEstructuraOperar(llena, planDe(s, llena), "plantilla_guardar", { nombre: "T" + k });
    assert.strictEqual(llena.plantillas.length, 8);
    assert.strictEqual(s.entrenoEstructuraOperar(llena, planDe(s, llena), "plantilla_guardar", { nombre: "Una más" }), null);
    // Y sobreviven a guardarse y leerse
    var leidas = s.entrenoPrefsLimpiar(JSON.parse(JSON.stringify(llena)));
    assert.strictEqual(leidas.plantillas.length, 8);
  });

  // ── El diario con nombre propio ──────────────────────────────────────

  t.test("una sesión con nombre propio queda en el diario con ese nombre (en la clave, que es lo que viaja a la cuenta)", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "intermedio", estructura: [{ i: "p1", k: "superior_A", n: "Día de pecho", d: 1 }] });
    var log = s.entrenoLogVacio();
    var curso = s.entrenoLogIniciar(log, plan.sesiones[0], 1, 1e12);
    assert.strictEqual(curso.clave, "~Día de pecho");
    assert.strictEqual(s.entrenoLogNombreSesion(curso), "Día de pecho");
    assert.strictEqual(s.entrenoLogNombreSesion({ clave: "superior_A", nombre: "Superior A" }), "Верх A");
  });

  // ── El marcado ────────────────────────────────────────────────────────

  t.test("programas y plantillas en los cuatro idiomas: filtros, tarjetas con «Выбрать», el actual marcado, sin huecos", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var prefs = prefsBase(s, { plantillas: [{ nombre: "Зал", estructura: [{ i: "p1", k: "superior_A" }] }] });
      var plan = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "intermedio", programa: "superior_inferior_4",
        estructura: s.estructuraDePrograma("superior_inferior_4") });
      var html = s.entrenoProgramasHtml(prefs, plan, { dias: 0, nivel: "", objetivo: "" }, "");
      assert.strictEqual(html.split('class="entreno__programa"').length - 1 + html.split('class="entreno__programa is-actual"').length - 1,
        s.WORKOUT_PROGRAMAS.length, lang);
      assert.strictEqual(html.split("is-actual").length - 1, 1, lang + ": el de ahora, uno");
      assert.ok(html.indexOf('data-prog="plantilla_aplicar"') !== -1, lang);
      sinHuecos(html, lang);
      var filtrado = s.entrenoProgramasHtml(prefs, plan, { dias: 3, nivel: "", objetivo: "fuerza" }, "");
      var esperados = s.entrenoProgramasLista({ dias: 3, objetivo: "fuerza" }).length;
      assert.ok(esperados >= 1);
      assert.strictEqual(filtrado.split("entreno__programa-nombre").length - 1, esperados, lang + ": filtro");
      var nada = s.entrenoProgramasHtml(prefs, plan, { dias: 6, nivel: "principiante", objetivo: "" }, "");
      assert.ok(nada.indexOf(s.t("ent.prog_ninguno")) !== -1, lang + ": sin resultados lo dice");
    });
  });

  t.test("cada sesión trae su día, renombrar, copiar y quitar; «Añadir entrenamiento»; el aviso si «Mis datos» dice otros días", function () {
    var s = sandbox("ru");
    var plan = s.generateWorkoutPlan({ goal: "bulk" }, { nivel: "intermedio", estructura: [{ i: "p1", k: "superior_A", n: "", d: 1 }] });
    var herr = s.entrenoSesionHerramientasHtml(plan.sesiones[0]);
    ["data-prog-dia=\"p1\"", "data-prog=\"renombrar\"", "data-prog=\"copiar\"", "data-prog=\"quitar_sesion\""].forEach(function (x) {
      assert.ok(herr.indexOf(x) !== -1, x);
    });
    sinHuecos(herr, "herramientas");
    var nueva = s.entrenoNuevaSesionHtml(plan);
    assert.ok(nueva.indexOf(s.t("ent.prog_nueva")) !== -1);
    var prefs = prefsBase(s, { estructura: [{ i: "p1", k: "superior_A" }, { i: "p2", k: "inferior_A" }] });
    var aviso = s.entrenoProgramasAvisoHtml(prefs, 4);
    assert.ok(aviso.indexOf('data-prog="dias_mantener"') !== -1 && aviso.indexOf('data-prog="dias_rehacer"') !== -1);
    assert.strictEqual(s.entrenoProgramasAvisoHtml(prefs, 2), "", "si cuadran, nada");
    assert.strictEqual(s.entrenoProgramasAvisoHtml(prefs, 0).indexOf("dias_rehacer"), -1, "con 0 días no se puede rehacer");
    assert.strictEqual(s.entrenoProgramasAvisoHtml(s.entrenoPrefsLimpiar({}), 4), "", "sin semana propia, nada");
  });

  t.test("index.html trae la caja de programas en «Plan» y carga entreno-programas.js detrás del catálogo", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(/<section class="entreno__programas" id="entrenoProgramas" data-en="plan" hidden>/.test(html));
    var cat = html.indexOf('<script src="js/ui/entreno-catalogo.js');
    var prog = html.indexOf('<script src="js/ui/entreno-programas.js');
    assert.ok(cat !== -1 && cat < prog && prog < html.indexOf('<script src="js/app.js'));
  });
}

module.exports = { run: run };

/**
 * tests/entreno-cuestionario.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lo que pregunta el cuestionario de entrenamiento llega al generador
 * (js/engine/workout-generator.js): material marcado uno a uno, objetivo
 * propio (con «fuerza»), músculos en los que poner el acento, molestias que
 * quitan ejercicios y días concretos de la semana.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([projPath("js/data/exercises.js"), projPath("js/engine/workout-generator.js")]);
}

/** Con la pantalla: textos, preferencias y el cuestionario (sin DOM). */
function sandboxPantalla() {
  var s = loadBrowserGlobals([
    projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/i18n/en.js"),
    projPath("js/i18n/ru.js"), projPath("js/i18n/uk.js"), projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"), projPath("js/engine/workout-generator.js"),
    projPath("js/ui/render-entreno.js"), projPath("js/ui/entreno-cuestionario.js")
  ]);
  s._langMemoryState = "ru";
  return s;
}

function almacen(valor) {
  return { getItem: function () { return valor === undefined ? null : JSON.stringify(valor); }, setItem: function () {}, removeItem: function () {} };
}

function plan(s, dias, opciones, goal) {
  var o = { nivel: "intermedio", equipamiento: "gimnasio" };
  Object.keys(opciones || {}).forEach(function (k) { o[k] = opciones[k]; });
  return s.generateWorkoutPlan({ entrenamientos: dias, goal: goal || "bulk" }, o);
}

function ids(p) {
  var r = [];
  p.sesiones.forEach(function (x) { x.exercises.forEach(function (e) { r.push(e.id); }); });
  return r;
}

function catalogo(s, id) { return s.EXERCISE_CATALOG.filter(function (e) { return e.id === id; })[0]; }

function seriesDe(p, musculos) {
  var n = 0;
  p.sesiones.forEach(function (x) { x.exercises.forEach(function (e) { if (musculos.indexOf(e.muscle) !== -1) n += e.sets; }); });
  return n;
}

function run(t) {

  t.test("material uno a uno: solo sale lo que se puede hacer con lo marcado (y sin material siempre vale)", function () {
    var s = sandbox();
    var p = plan(s, 4, { material: ["mancuernas", "dominadas"] });
    assert.ok(ids(p).length > 0);
    ids(p).forEach(function (id) {
      catalogo(s, id).equipment.forEach(function (m) {
        assert.ok(["mancuernas", "dominadas", "sin_material"].indexOf(m) !== -1, id + " pide " + m);
      });
    });
    assert.ok(ids(p).indexOf("dominadas") !== -1 || ids(p).indexOf("dominadas_negativas") !== -1, "con barra de dominadas, salen dominadas");
    assert.strictEqual(p.equipamiento, "personalizado");
  });

  t.test("un material desconocido se ignora, y el juego que coincide se reconoce por su nombre", function () {
    var s = sandbox();
    var p = plan(s, 3, { material: ["mancuernas", "banco", "jacuzzi"] });
    assert.strictEqual(p.equipamiento, "mancuernas", "mancuernas + banco es el juego «mancuernas»");
    assert.strictEqual(JSON.stringify(p.material.slice().sort()), JSON.stringify(["banco", "mancuernas", "sin_material"]));
    var nada = plan(s, 3, { material: [] });
    assert.strictEqual(nada.equipamiento, "sin_material");
  });

  t.test("el objetivo del cuestionario manda: «fuerza» da compuestos de 3-6 con 3 minutos de descanso", function () {
    var s = sandbox();
    var p = plan(s, 3, { objetivo: "fuerza" }, "cut");
    assert.strictEqual(p.objetivo, "fuerza");
    var compuesto = p.sesiones[0].exercises.filter(function (e) { return e.compound; })[0];
    assert.strictEqual(compuesto.reps, "3-6");
    assert.strictEqual(compuesto.restSeconds, 180);
    var novato = plan(s, 3, { objetivo: "fuerza", nivel: "principiante" });
    assert.strictEqual(novato.sesiones[0].exercises.filter(function (e) { return e.compound; })[0].reps, "5-8",
      "el principiante empieza la fuerza con algo más de repeticiones");
  });

  t.test("objetivo «auto» o vacío deja el de «Mis datos»; uno desconocido avisa y no cambia nada", function () {
    var s = sandbox();
    assert.strictEqual(plan(s, 3, { objetivo: "auto" }, "cut").objetivo, "cut");
    assert.strictEqual(plan(s, 3, { objetivo: "" }, "cut").objetivo, "cut");
    var raro = plan(s, 3, { objetivo: "volar" }, "cut");
    assert.strictEqual(raro.objetivo, "cut");
    assert.ok(raro.warnings.indexOf("objetivo_desconocido") !== -1);
  });

  t.test("acento en brazos: más series de bíceps y tríceps a la semana que sin acento", function () {
    var s = sandbox();
    var sin = plan(s, 4, {});
    var con = plan(s, 4, { enfoque: ["brazos"] });
    assert.ok(seriesDe(con, ["biceps", "triceps"]) > seriesDe(sin, ["biceps", "triceps"]),
      seriesDe(con, ["biceps", "triceps"]) + " no supera " + seriesDe(sin, ["biceps", "triceps"]));
    assert.ok(con.sesiones.some(function (x) { return x.exercises.some(function (e) { return e.enfoque; }); }), "se añade algún ejercicio marcado");
    assert.strictEqual(JSON.stringify(con.enfoque), JSON.stringify(["brazos"]));
  });

  t.test("con 3 días de cuerpo completo el acento en brazos mete brazos (la plantilla no los trae)", function () {
    var s = sandbox();
    var con = plan(s, 3, { enfoque: ["brazos"] });
    assert.ok(seriesDe(con, ["biceps", "triceps"]) > 0);
  });

  t.test("en empuje/tirón/piernas el acento respeta el día: el tirón no recibe tríceps ni el empuje bíceps", function () {
    var s = sandbox();
    var p = plan(s, 6, { enfoque: ["brazos"] });
    p.sesiones.forEach(function (x) {
      x.exercises.filter(function (e) { return e.enfoque; }).forEach(function (e) {
        if (/^tiron_/.test(x.key)) assert.notStrictEqual(e.muscle, "triceps", x.key + " recibe " + e.id);
        if (/^empuje_/.test(x.key)) assert.notStrictEqual(e.muscle, "biceps", x.key + " recibe " + e.id);
        if (/^piernas_/.test(x.key)) assert.fail(x.key + " recibe " + e.id);
      });
    });
  });

  t.test("acento en glúteos y pecho suma series de esos grupos; grupos raros se ignoran y como mucho van tres", function () {
    var s = sandbox();
    var sin = plan(s, 4, {});
    var con = plan(s, 4, { enfoque: ["gluteos", "pecho", "nadar"] });
    assert.ok(seriesDe(con, ["gluteos"]) > seriesDe(sin, ["gluteos"]));
    assert.ok(seriesDe(con, ["pecho"]) > seriesDe(sin, ["pecho"]));
    assert.strictEqual(JSON.stringify(con.enfoque), JSON.stringify(["gluteos", "pecho"]));
    var muchos = plan(s, 4, { enfoque: ["pecho", "espalda", "hombros", "brazos", "piernas"] });
    assert.strictEqual(muchos.enfoque.length, 3);
  });

  t.test("con acento en brazos y 45 minutos entran bíceps y tríceps aunque la duración recorte la sesión", function () {
    var s = sandbox();
    var p = plan(s, 4, { duracion: 45, enfoque: ["brazos"], material: ["mancuernas", "banco", "dominadas"] });
    var musculos = {};
    p.sesiones.forEach(function (x) { x.exercises.forEach(function (e) { musculos[e.muscle] = true; }); });
    assert.ok(musculos.biceps && musculos.triceps, "faltan brazos: " + Object.keys(musculos).join(", "));
    p.sesiones.forEach(function (x) { assert.ok(x.exercises.length <= 5, x.key); });
  });

  t.test("material propio con el juego «personalizado» no avisa de material desconocido", function () {
    var s = sandbox();
    var p = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" },
      { nivel: "intermedio", equipamiento: "personalizado", material: ["mancuernas", "dominadas"] });
    assert.strictEqual(p.warnings.indexOf("equipamiento_desconocido"), -1);
  });

  t.test("un sustituto por molestia no le quita su ejercicio a un patrón que viene después en la sesión", function () {
    var s = sandbox();
    var p = plan(s, 4, { limitaciones: ["rodillas"], material: ["mancuernas", "banco", "dominadas"] });
    assert.strictEqual(p.warnings.indexOf("falta_ejercicio:curl_isquio"), -1, p.warnings.join(", "));
  });

  t.test("el acento no se salta la duración: con 30 minutos las sesiones siguen en 4 ejercicios", function () {
    var s = sandbox();
    var p = plan(s, 4, { duracion: 30, enfoque: ["brazos", "abdomen"] });
    p.sesiones.forEach(function (x) { assert.ok(x.exercises.length <= 4, x.key + ": " + x.exercises.length); });
  });

  t.test("molestias: rodillas quita zancadas y extensiones; espalda, peso muerto, sentadilla y remo con barra; hombros, fondos y press militar", function () {
    var s = sandbox();
    var rodillas = ids(plan(s, 4, { limitaciones: ["rodillas"] }));
    s.WORKOUT_LIMITACIONES.rodillas.forEach(function (id) { assert.strictEqual(rodillas.indexOf(id), -1, "sale " + id); });
    var espalda = ids(plan(s, 4, { limitaciones: ["espalda"] }));
    ["peso_muerto_barra", "sentadilla_barra", "remo_barra", "press_militar_barra"].forEach(function (id) {
      assert.strictEqual(espalda.indexOf(id), -1, "sale " + id);
    });
    var hombros = ids(plan(s, 6, { limitaciones: ["hombros"] }));
    ["fondos_paralelas", "press_militar_barra", "press_arnold"].forEach(function (id) { assert.strictEqual(hombros.indexOf(id), -1, "sale " + id); });
  });

  t.test("si una molestia vacía un patrón, entra un sustituto en vez de quedarse sin ejercicio", function () {
    var s = sandbox();
    var p = plan(s, 3, { material: [], limitaciones: ["rodillas"] });
    assert.strictEqual(p.warnings.indexOf("falta_ejercicio:zancada"), -1, "sin material y rodillas, la zancada se sustituye");
    assert.ok(ids(p).some(function (id) { return catalogo(s, id).pattern === "gluteo"; }), "entra un ejercicio de glúteo");
  });

  t.test("las molestias desconocidas se ignoran y el plan devuelve las que se aplicaron", function () {
    var s = sandbox();
    var p = plan(s, 3, { limitaciones: ["rodillas", "codos", "rodillas"] });
    assert.strictEqual(JSON.stringify(p.limitaciones), JSON.stringify(["rodillas"]));
  });

  t.test("días elegidos: las sesiones caen en esos días, en orden; si no cuadran con el número, los de siempre", function () {
    var s = sandbox();
    var p = plan(s, 3, { diasSemana: [6, 2, 4] });
    assert.strictEqual(JSON.stringify(p.sesiones.map(function (x) { return x.dia; })), JSON.stringify([2, 4, 6]));
    assert.strictEqual(p.diasElegidos, true);
    var mal = plan(s, 3, { diasSemana: [1, 2] });
    assert.strictEqual(JSON.stringify(mal.sesiones.map(function (x) { return x.dia; })), JSON.stringify([1, 3, 5]));
    assert.strictEqual(mal.diasElegidos, false);
    var raro = plan(s, 2, { diasSemana: [0, 9, 3, 3, 7] });
    assert.strictEqual(JSON.stringify(raro.sesiones.map(function (x) { return x.dia; })), JSON.stringify([3, 7]), "los valores fuera de 1-7 y repetidos no cuentan");
  });

  t.test("las respuestas guardadas se limpian: objetivo, material, acento (máx. 3), molestias y días raros", function () {
    var s = sandboxPantalla();
    s.localStorage = almacen({
      objetivo: "fuerza", material: ["barra", "jacuzzi", "barra", "polea"],
      enfoque: ["pecho", "brazos", "piernas", "gluteos", "nadar"], limitaciones: ["rodillas", "codos"],
      diasSemana: [5, "1", 9, 3, 3], configurado: true, equipamiento: "personalizado"
    });
    var p = s.entrenoLeerPrefs();
    assert.strictEqual(p.objetivo, "fuerza");
    assert.strictEqual(JSON.stringify(p.material), JSON.stringify(["barra", "polea"]));
    assert.strictEqual(JSON.stringify(p.enfoque), JSON.stringify(["pecho", "brazos", "piernas"]));
    assert.strictEqual(JSON.stringify(p.limitaciones), JSON.stringify(["rodillas"]));
    assert.strictEqual(JSON.stringify(p.diasSemana), JSON.stringify([1, 3, 5]));
    assert.strictEqual(p.configurado, true);
    assert.strictEqual(p.equipamiento, "personalizado");

    s.localStorage = almacen({ objetivo: "volar", configurado: "sí", equipamiento: "personalizado" });
    var mal = s.entrenoLeerPrefs();
    assert.strictEqual(mal.objetivo, "auto");
    assert.strictEqual(mal.configurado, false, "solo true cuenta como contestado");
    assert.strictEqual(mal.equipamiento, "gimnasio", "«personalizado» sin lista de material no sirve");
  });

  t.test("en la pantalla de días se puede seguir sin marcar ninguno o con tantos como entrenamientos", function () {
    var s = sandboxPantalla();
    assert.strictEqual(s.entrenoCuestionarioValido({ dias: 3, diasSemana: [] }, 3), true);
    assert.strictEqual(s.entrenoCuestionarioValido({ dias: 3, diasSemana: [1, 3, 5] }, 3), true);
    assert.strictEqual(s.entrenoCuestionarioValido({ dias: 3, diasSemana: [1, 3] }, 3), false);
    assert.strictEqual(s.entrenoCuestionarioValido({ dias: 3, diasSemana: [1, 3] }, 4), true, "las demás pantallas no dependen de eso");
  });

  t.test("«Tu programa» en ruso: objetivo, días elegidos, material propio, acento y molestias, sin huecos", function () {
    var s = sandboxPantalla();
    var plan = s.entrenoPlanParaDatos({
      dias: 3, objetivo: "bulk", objetivoEntreno: "fuerza", nivel: "intermedio", material: ["mancuernas", "dominadas"],
      duracion: 45, enfoque: ["brazos", "gluteos"], limitaciones: ["rodillas", "espalda"], diasSemana: [2, 4, 6], semana: 1
    });
    var fichas = s.entrenoResumenFichasHtml(plan, { duracion: 45 });
    assert.ok(fichas.indexOf("Сила") !== -1, "objetivo fuerza, con mayúscula en la primera ficha");
    assert.ok(fichas.indexOf("Вт, Чт, Сб") !== -1, "los días elegidos");
    assert.ok(fichas.indexOf("Своё: гантели, турник") !== -1, "el material propio");
    assert.ok(fichas.indexOf("Акцент: руки, ягодицы") !== -1, "el acento");
    assert.ok(fichas.indexOf("Бережём колени, поясницу") !== -1, "las molestias");
    var notas = s.entrenoResumenNotasHtml(plan);
    assert.ok(notas.indexOf("руки, ягодицы") !== -1 && notas.indexOf("врачом") !== -1);
    [fichas, notas].forEach(function (h) {
      assert.ok(!/undefined|NaN|ent\.|\{/.test(h), "hueco: " + h.slice(0, 200));
    });
  });

  t.test("sin días de entrenamiento «Tu programa» sigue saliendo, sin días ni división", function () {
    var s = sandboxPantalla();
    var plan = s.entrenoPlanParaDatos({ dias: 0, objetivo: "cut", objetivoEntreno: "auto", nivel: "principiante", duracion: 60, semana: 1 });
    var fichas = s.entrenoResumenFichasHtml(plan, { duracion: 60 });
    assert.ok(fichas.indexOf("Похудение") !== -1);
    assert.ok(fichas.indexOf("дн.") === -1, "no hay días que contar");
  });

  t.test("el marcado trae las seis pantallas y cada opción que entiende el generador", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    for (var n = 1; n <= 6; n++) assert.ok(html.indexOf('data-paso="' + n + '"') !== -1, "falta la pantalla " + n);
    var grupos = {
      entObjetivo: ["bulk", "fuerza", "recomp", "cut", "maintain"],
      entNivel: ["principiante", "intermedio", "avanzado"],
      entDias: ["1", "2", "3", "4", "5", "6"],
      entDiasSemana: ["1", "2", "3", "4", "5", "6", "7"],
      entDuracion: ["30", "45", "60"],
      entEquipo: ["gimnasio", "mancuernas", "sin_material"],
      entMaterial: ["barra", "banco", "mancuernas", "maquina", "polea", "dominadas", "paralelas"],
      entEnfoque: ["pecho", "espalda", "hombros", "brazos", "piernas", "gluteos", "abdomen"],
      entLimites: ["rodillas", "espalda", "hombros"]
    };
    Object.keys(grupos).forEach(function (id) {
      var i = html.indexOf('id="' + id + '"');
      assert.ok(i !== -1, "falta el grupo " + id);
      var trozo = html.slice(i, html.indexOf("</div>", i));
      grupos[id].forEach(function (v) {
        assert.ok(trozo.indexOf('data-valor="' + v + '"') !== -1, id + " sin la opción " + v);
      });
    });
    ["cuestAtras", "cuestSiguiente", "cuestCerrar", "entEditar", "entrenoResumenFichas", "entExcluir"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta id=\"" + id + "\"");
    });
    assert.ok(html.indexOf("js/ui/entreno-cuestionario.js") !== -1, "no se carga el cuestionario");
  });

  t.test("las listas del cuestionario son las mismas que entiende el generador", function () {
    var s = sandboxPantalla();
    assert.strictEqual(JSON.stringify(s.ENTRENO_MATERIALES), JSON.stringify(s.WORKOUT_MATERIALES));
    assert.strictEqual(JSON.stringify(s.ENTRENO_ENFOQUES.slice().sort()), JSON.stringify(Object.keys(s.WORKOUT_ENFOQUES).sort()));
    assert.strictEqual(JSON.stringify(s.ENTRENO_LIMITACIONES.slice().sort()), JSON.stringify(Object.keys(s.WORKOUT_LIMITACIONES).sort()));
    s.ENTRENO_OBJETIVOS.forEach(function (o) { assert.ok(s.WORKOUT_PRESCRIPCION[o], o); });
    assert.strictEqual(s.ENTRENO_ENFOQUE_MAX, s.WORKOUT_ENFOQUE_MAX);
  });

  t.test("sin las opciones nuevas el plan es exactamente el de antes", function () {
    var s = sandbox();
    var antes = plan(s, 4, {});
    var nuevo = plan(s, 4, { enfoque: [], limitaciones: [], objetivo: "auto" });
    assert.strictEqual(JSON.stringify(ids(nuevo)), JSON.stringify(ids(antes)));
    assert.strictEqual(JSON.stringify(nuevo.sesiones.map(function (x) { return x.dia; })), JSON.stringify(antes.sesiones.map(function (x) { return x.dia; })));
  });
}

module.exports = { run: run };

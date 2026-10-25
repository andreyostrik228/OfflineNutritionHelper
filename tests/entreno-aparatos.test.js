/**
 * tests/entreno-aparatos.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los aparatos concretos de cada material (2026-10-25): el catálogo y
 * WORKOUT_APARATOS se corresponden, cada aparato tiene su botón y su texto,
 * el plan y el catálogo no proponen lo que pide un aparato que no hay, y las
 * respuestas guardadas solo admiten aparatos conocidos. Sin DOM.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox(lang) {
  var s = loadBrowserGlobals([
    projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/i18n/en.js"),
    projPath("js/i18n/ru.js"), projPath("js/i18n/uk.js"), projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"), projPath("js/engine/workout-generator.js"),
    projPath("js/ui/render-entreno.js"), projPath("js/ui/entreno-catalogo.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

function plan(s, dias, opciones) {
  var o = { nivel: "avanzado", equipamiento: "gimnasio" };
  Object.keys(opciones || {}).forEach(function (k) { o[k] = opciones[k]; });
  return s.generateWorkoutPlan({ entrenamientos: dias, goal: "bulk" }, o);
}

function ids(p) {
  var r = [];
  p.sesiones.forEach(function (x) { x.exercises.forEach(function (e) { r.push(e.id); }); });
  return r;
}

function run(t) {

  t.test("cada aparato del catálogo es de un material que el ejercicio pide, y cada aparato lo pide algún ejercicio", function () {
    var s = sandbox();
    var usados = {};
    s.EXERCISE_CATALOG.forEach(function (e) {
      (e.aparato || []).forEach(function (grupo) {
        assert.ok(Array.isArray(grupo) && grupo.length, e.id + ": grupo vacío");
        grupo.forEach(function (a) {
          usados[a] = true;
          var deSuMaterial = e.equipment.some(function (m) { return (s.WORKOUT_APARATOS[m] || []).indexOf(a) !== -1; });
          assert.ok(deSuMaterial, e.id + ": «" + a + "» no es de " + e.equipment.join("+"));
        });
      });
    });
    s.aparatosConocidos().forEach(function (a) {
      assert.ok(usados[a], "«" + a + "» no lo pide ningún ejercicio: sería un botón que no hace nada");
    });
  });

  t.test("cada aparato tiene su botón en el cuestionario, en el grupo de su material, y su texto en los cuatro idiomas", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      Object.keys(s.WORKOUT_APARATOS).forEach(function (m) {
        var inicio = html.indexOf('id="entAparatos-' + m + '"');
        assert.ok(inicio !== -1, "falta el grupo de " + m);
        var trozo = html.slice(inicio, html.indexOf("</div>", inicio));
        s.WORKOUT_APARATOS[m].forEach(function (a) {
          assert.ok(trozo.indexOf('data-valor="' + a + '"') !== -1, m + ": falta el botón de " + a);
          var texto = s.t("ent.aparato_" + a);
          assert.ok(texto && texto.indexOf("ent.") === -1, lang + ": sin texto para " + a);
        });
      });
    });
  });

  t.test("los que faltan: solo los conocidos, sin repetir y en orden; los materiales traen sus aparatos menos esos", function () {
    var s = sandbox();
    assert.strictEqual(JSON.stringify(s.normalizarAparatosFaltan(["hack", "jacuzzi", "rack", "hack"])), '["rack","hack"]');
    assert.strictEqual(s.normalizarAparatosFaltan("hack").length, 0);
    assert.strictEqual(s.normalizarAparatosFaltan(null).length, 0);
    var casa = s.materialConAparatos(["mancuernas", "banco", "sin_material"], []);
    assert.ok(casa.indexOf("banco_inclinable") !== -1 && casa.indexOf("prensa") === -1, "en casa, los del banco; ninguna máquina");
    var gym = s.materialConAparatos(s.EQUIPAMIENTO_DISPONIBLE.gimnasio, ["hack", "gravitron"]);
    assert.ok(gym.indexOf("prensa") !== -1 && gym.indexOf("hack") === -1 && gym.indexOf("gravitron") === -1);
    var hack = s.EXERCISE_CATALOG.filter(function (e) { return e.id === "sentadilla_hack_maquina"; })[0];
    assert.strictEqual(s.puedeHacerse(hack, gym), false);
    assert.strictEqual(s.puedeHacerse(hack, s.materialConAparatos(s.EQUIPAMIENTO_DISPONIBLE.gimnasio, [])), true);
    var face = s.EXERCISE_CATALOG.filter(function (e) { return e.id === "face_pull"; })[0];
    assert.strictEqual(s.puedeHacerse(face, s.materialConAparatos(s.EQUIPAMIENTO_DISPONIBLE.gimnasio, ["cruce_poleas"])), true, "con el jalón basta");
    assert.strictEqual(s.puedeHacerse(face, s.materialConAparatos(s.EQUIPAMIENTO_DISPONIBLE.gimnasio, ["cruce_poleas", "polea_alta"])), false);
  });

  t.test("el plan no propone nada que pida un aparato que no hay, con 1 a 6 días", function () {
    var s = sandbox();
    var faltan = ["rack", "hack", "gravitron", "prensa", "cruce_poleas", "banco_inclinable", "maq_pecho", "femoral_tumbado"];
    for (var dias = 1; dias <= 6; dias++) {
      var p = plan(s, dias, { aparatosFaltan: faltan });
      assert.strictEqual(JSON.stringify(p.aparatosFaltan), JSON.stringify(s.normalizarAparatosFaltan(faltan)));
      assert.ok(ids(p).length > 0, dias + " días: sin ejercicios");
      ids(p).forEach(function (id) {
        var e = s.EXERCISE_CATALOG.filter(function (x) { return x.id === id; })[0];
        assert.ok(s.puedeHacerse(e, p.disponible), dias + " días: " + id + " pide un aparato que no hay");
        assert.ok(["sentadilla_barra", "press_banca_barra", "sentadilla_hack_maquina", "prensa_piernas", "dominadas_asistidas"].indexOf(id) === -1, id);
      });
    }
    var todo = plan(s, 4, {});
    assert.ok(todo.disponible.indexOf("rack") !== -1, "sin desmarcar nada, el gimnasio lo tiene todo");
    assert.strictEqual(todo.aparatosFaltan.length, 0);
    assert.strictEqual(JSON.stringify(todo.material), JSON.stringify(s.EQUIPAMIENTO_DISPONIBLE.gimnasio), "plan.material sigue siendo solo los materiales");
  });

  t.test("las respuestas guardadas: aparatosFaltan solo con aparatos conocidos; sin nada, ninguno", function () {
    var s = sandbox();
    assert.strictEqual(s.entrenoPrefsLimpiar(null).aparatosFaltan.length, 0);
    assert.strictEqual(JSON.stringify(s.entrenoPrefsLimpiar({ aparatosFaltan: ["hack", "constructor", 7, "prensa"] }).aparatosFaltan), '["prensa","hack"]');
    assert.strictEqual(s.entrenoPrefsLimpiar({ aparatosFaltan: "hack" }).aparatosFaltan.length, 0);
  });

  t.test("el catálogo: «solo lo mío» quita lo que pide un aparato que no hay, y la ficha dice el aparato", function () {
    var s = sandbox("ru");
    var material = s.materialConAparatos(s.EQUIPAMIENTO_DISPONIBLE.gimnasio, ["hack"]);
    var lista = s.entrenoCatalogoLista({}, { soloMio: true }, material).map(function (x) { return x.ejercicio.id; });
    assert.strictEqual(lista.indexOf("sentadilla_hack_maquina"), -1);
    assert.ok(lista.indexOf("prensa_piernas") !== -1);
    var html = s.entrenoCatalogoHtml({}, { busqueda: "гакк" }, material);
    assert.ok(html.indexOf("Тренажёры: гакк-машина") !== -1, "la línea del ejercicio dice el aparato");
    var cara = s.entrenoCatalogoHtml({}, { busqueda: "face" }, material);
    assert.ok(cara.indexOf("кроссовер / верхний блок") !== -1, "las alternativas, con barra");
  });

  t.test("«Ваша программа» dice qué aparatos no hay (solo de los materiales marcados)", function () {
    var s = sandbox("ru");
    var p = plan(s, 3, { aparatosFaltan: ["hack", "gravitron"] });
    var fichas = s.entrenoResumenFichasHtml(p, s.entrenoPrefsLimpiar({ duracion: 60 }));
    assert.ok(fichas.indexOf("Нет: гравитрон, гакк-машина") !== -1, fichas);
    var casa = plan(s, 3, { material: ["mancuernas", "banco"], aparatosFaltan: ["hack", "banco_declinable"] });
    var fichasCasa = s.entrenoResumenFichasHtml(casa, s.entrenoPrefsLimpiar({ duracion: 60 }));
    assert.ok(fichasCasa.indexOf("Нет: скамья с наклоном вниз") !== -1, "lo de la máquina no se dice: no hay máquinas");
    assert.strictEqual(fichasCasa.indexOf("гакк"), -1);
  });
}

module.exports = { run: run };

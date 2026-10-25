/**
 * tests/entreno-figura.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Animaciones de los ejercicios (js/ui/entreno-figura.js con las posturas de
 * js/data/exercise-poses.js), sin DOM: que cada ejercicio del catálogo tenga
 * la suya, que ningún instante salga roto, que los músculos y las cámaras
 * sean de verdad, y que la pantalla las pinte donde toca.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox(conPantalla) {
  var archivos = [
    projPath("js/core/i18n.js"),
    projPath("js/i18n/es.js"),
    projPath("js/i18n/en.js"),
    projPath("js/i18n/ru.js"),
    projPath("js/i18n/uk.js"),
    projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"),
    projPath("js/data/exercise-poses.js"),
    projPath("js/engine/workout-generator.js"),
    projPath("js/core/workout-log.js"),
    projPath("js/ui/entreno-figura.js")
  ];
  if (conPantalla) archivos.push(projPath("js/ui/render-entreno.js"), projPath("js/ui/entreno-sesion.js"));
  var s = loadBrowserGlobals(archivos);
  s._langMemoryState = "ru";
  return s;
}

var INSTANTES = [0, 0.2, 0.5, 0.8, 1];

function run(t) {

  t.test("cada ejercicio del catálogo tiene su animación, y no sobra ninguna", function () {
    var s = sandbox();
    var ids = s.EXERCISE_CATALOG.map(function (e) { return e.id; });
    var faltan = ids.filter(function (id) { return !s.entrenoAnimacionTiene(id); });
    assert.strictEqual(faltan.length, 0, "sin animación: " + faltan.join(", "));
    var sobran = Object.keys(s.EJERCICIO_POSES).filter(function (id) { return ids.indexOf(id) === -1; });
    assert.strictEqual(sobran.length, 0, "animación de un ejercicio que no existe: " + sobran.join(", "));
  });

  t.test("ningún instante de ninguna animación sale con NaN, Infinity o undefined (grande y pequeña, los dos lados)", function () {
    var s = sandbox();
    var rotos = [];
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var lados = s.EJERCICIO_POSES[id].ritmo === "alterno" ? ["D", "I"] : ["D"];
      lados.forEach(function (lado) {
        INSTANTES.forEach(function (x) {
          ["completo", "mini"].forEach(function (d) {
            var svg = s.entrenoFiguraSvg(id, x, d, lado);
            if (!svg || /NaN|Infinity|undefined/.test(svg)) rotos.push(id + " s=" + x + " " + d + " " + lado);
          });
        });
      });
    });
    assert.strictEqual(rotos.length, 0, rotos.slice(0, 10).join("; "));
  });

  t.test("cada animación declara músculos que existen, una cámara, una articulación medible y un ritmo conocido", function () {
    var s = sandbox();
    var angulos = ["rodilla", "cadera", "codo", "hombro", "tobillo"];
    var ritmos = ["rep", "mantener", "alterno", "negativa"];
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var spec = s.EJERCICIO_POSES[id];
      assert.ok(spec.musculos && spec.musculos.p && spec.musculos.p.length, id + ": sin músculos que trabajen");
      spec.musculos.p.concat(spec.musculos.s || []).forEach(function (z) {
        assert.ok(s.FIG_ZONAS[z], id + ": zona de músculo desconocida «" + z + "»");
      });
      assert.ok(spec.camara && typeof spec.camara.yaw === "number", id + ": sin cámara");
      assert.ok(angulos.indexOf(spec.angulo) !== -1, id + ": articulación «" + spec.angulo + "»");
      assert.ok(ritmos.indexOf(spec.ritmo || "rep") !== -1, id + ": ritmo «" + spec.ritmo + "»");
    });
  });

  t.test("cada zona de músculo tiene nombre en los cuatro idiomas", function () {
    var s = sandbox();
    Object.keys(s.FIG_ZONAS).forEach(function (z) {
      ["es", "en", "ru", "uk"].forEach(function (lang) {
        assert.notStrictEqual(s.tOr("ent.musculo_" + z, "SIN", lang), "SIN", "falta ent.musculo_" + z + " en " + lang);
      });
    });
  });

  t.test("la grande trae cuadrícula, fantasma de salida y marcas; la pequeña solo figura y músculos", function () {
    var s = sandbox();
    var grande = s.entrenoFiguraSvg("sentadilla_barra", 0.6, "completo", "D");
    var pequena = s.entrenoFiguraSvg("sentadilla_barra", 0.6, "mini", "D");
    assert.ok(grande.indexOf("anim__rejilla") !== -1, "cuadrícula");
    assert.ok(grande.indexOf("anim__marca") !== -1, "marcas en las articulaciones");
    assert.ok(grande.indexOf("anim__grados") !== -1, "grados de la rodilla");
    assert.ok(grande.indexOf("anim__musculo") !== -1 && pequena.indexOf("anim__musculo") !== -1, "músculos en las dos");
    assert.ok(pequena.indexOf("anim__rejilla") === -1 && pequena.indexOf("anim__marca") === -1, "la pequeña va limpia");
  });

  t.test("el ángulo que se mide cambia con el gesto: la rodilla se dobla al bajar en la sentadilla", function () {
    var s = sandbox();
    var arriba = s.entrenoFiguraEscena("sentadilla_barra", 0, "completo", "D").angulo;
    var abajo = s.entrenoFiguraEscena("sentadilla_barra", 1, "completo", "D").angulo;
    var g0 = parseInt(arriba.texto, 10);
    var g1 = parseInt(abajo.texto, 10);
    assert.ok(g0 > 165, "de pie la rodilla casi recta: " + g0);
    assert.ok(g1 < 100, "abajo la rodilla doblada: " + g1);
  });

  t.test("las manos llegan a la barra: en el press de banca la barra va entre las dos manos", function () {
    var s = sandbox();
    [0, 0.5, 1].forEach(function (x) {
      var spec = s.EJERCICIO_POSES.press_banca_barra;
      var P = spec.pose(x, s._fAyuda(), "D");
      var j = s._fEsqueleto(P);
      var barra = P.clave;
      var dist = function (a) { return Math.sqrt(Math.pow(a[0] - barra[0], 2) + Math.pow(a[1] - barra[1], 2)); };
      assert.ok(dist(j.munecaD) < 8 && dist(j.munecaI) < 8, "s=" + x + ": las muñecas se quedan lejos de la barra");
    });
  });

  t.test("los pies que pisan el suelo no se hunden ni flotan en la sentadilla", function () {
    var s = sandbox();
    INSTANTES.forEach(function (x) {
      var P = s.EJERCICIO_POSES.sentadilla_barra.pose(x, s._fAyuda(), "D");
      var j = s._fEsqueleto(P);
      ["D", "I"].forEach(function (L) {
        assert.ok(Math.abs(j["tobillo" + L][1] - 6) < 0.6, "s=" + x + " tobillo" + L + " a " + j["tobillo" + L][1]);
        assert.ok(Math.abs(j["punta" + L][1] - 3) < 1, "s=" + x + " punta" + L + " a " + j["punta" + L][1]);
      });
    });
  });

  // ── 2026-10-25: posturas sin cuerpo bajo el suelo, ojos, sombra, discos y encuadre ──

  t.test("nada del cuerpo se hunde en el suelo en ninguna postura (como mucho la punta del pie lo roza)", function () {
    var s = sandbox();
    var hundidos = [];
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var spec = s.EJERCICIO_POSES[id];
      if (spec.sinSuelo) return;
      (spec.ritmo === "alterno" ? ["D", "I"] : ["D"]).forEach(function (lado) {
        for (var k = 0; k <= 10; k++) {
          var j = s._fEsqueleto(s._fPostura(spec, k / 10, lado));
          Object.keys(j).forEach(function (n) {
            if (n.charAt(0) === "_" || !Array.isArray(j[n])) return;
            var fondo = j[n][1] - (n === "cabeza" ? s.FIG.cab : 0);
            if (fondo < (/^punta/.test(n) ? -4 : -1.5)) hundidos.push(id + " " + n + " " + Math.round(fondo) + " s=" + k / 10);
          });
        }
      });
    });
    assert.strictEqual(hundidos.length, 0, hundidos.slice(0, 8).join("; "));
  });

  t.test("puente y hip thrust: los hombros se quedan en el suelo o en el banco y sube la cadera", function () {
    var s = sandbox();
    function juntas(id, x) { return s._fEsqueleto(s._fPostura(s.EJERCICIO_POSES[id], x, "D")); }
    ["hip_thrust_barra", "hip_thrust_maquina"].forEach(function (id) {
      [0, 0.5, 1].forEach(function (x) {
        assert.ok(Math.abs(juntas(id, x).hombroD[1] - 50) < 1.5, id + " s=" + x + ": hombros en el banco (" + juntas(id, x).hombroD[1] + ")");
      });
      assert.ok(juntas(id, 1).pelvis[1] - juntas(id, 0).pelvis[1] > 20, id + ": la cadera sube");
    });
    ["puente_gluteo", "puente_gluteo_una_pierna", "curl_femoral_toalla"].forEach(function (id) {
      [0, 1].forEach(function (x) {
        assert.ok(Math.abs(juntas(id, x).hombroD[1] - 10) < 2, id + " s=" + x + ": hombros en el suelo (" + juntas(id, x).hombroD[1] + ")");
      });
    });
  });

  t.test("la grande lleva ojos hacia donde mira y sombra en el suelo; la pequeña, sombra sin ojos; sin suelo, sin sombra", function () {
    var s = sandbox();
    var grande = s.entrenoFiguraEscena("sentadilla_barra", 0.3, "completo", "D");
    var cabeza = grande.items.filter(function (it) { return it.id === "cabeza"; })[0];
    var ojos = cabeza.formas.filter(function (f) { return f.t === "ojo"; });
    assert.ok(1 <= ojos.length && ojos.length <= 2, "de perfil, uno o dos ojos: " + ojos.length);
    var caraX = ojos[0].cx - cabeza.formas[0].cx;
    var delanteX = s._fProy(grande.camara, s._fEsqueleto(s._fPostura(s.EJERCICIO_POSES.sentadilla_barra, 0.3, "D"))._cara.X).x;
    assert.ok(caraX * delanteX > 0, "los ojos, del lado hacia el que mira");
    assert.ok(grande.items.some(function (it) { return it.id === "sombra"; }));
    var mini = s.entrenoFiguraEscena("sentadilla_barra", 0.3, "mini", "D");
    assert.ok(mini.items.filter(function (it) { return it.id === "cabeza"; })[0].formas.every(function (f) { return f.t !== "ojo"; }), "la pequeña, sin ojos");
    assert.ok(mini.items.some(function (it) { return it.id === "sombra"; }));
    assert.ok(!s.entrenoFiguraEscena("dominadas", 0.3, "completo", "D").items.some(function (it) { return it.id === "sombra"; }), "colgado no hay suelo");
    assert.ok(s.entrenoFiguraSvg("sentadilla_barra", 0.3, "completo", "D").indexOf("anim__ojo") !== -1);
  });

  t.test("los discos dejan ver el cuerpo (borde, aro y eje); las mancuernas siguen macizas", function () {
    var s = sandbox();
    var barra = s.entrenoFiguraSvg("sentadilla_barra", 0.5, "completo", "D");
    assert.ok(barra.indexOf("anim__disco-eje") !== -1 && barra.indexOf("anim__disco-aro") !== -1);
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8");
    assert.ok(/\.anim__disco \{[^}]*fill-opacity: 0\.\d+/.test(css), "el plato, traslúcido");
    var mancuernas = s.entrenoFiguraSvg("curl_biceps_mancuernas", 0.5, "completo", "D");
    assert.ok(mancuernas.indexOf("anim__pesa") !== -1);
  });

  t.test("la grande de un gesto tumbado va apaisada (hasta 1,6), la de pie cuadrada; la pequeña, siempre cuadrada", function () {
    var s = sandbox();
    function proporcion(id, d) {
      var vb = /viewBox="([^"]+)"/.exec(s.entrenoFiguraSvg(id, 0.5, d, "D"))[1].split(" ").map(Number);
      return vb[2] / vb[3];
    }
    ["plancha", "flexiones"].forEach(function (id) {
      var p = proporcion(id, "completo");
      // El viewBox va redondeado a centésimas: 1,6 puede salir 1,6001.
      assert.ok(1.2 < p && p <= s.FIG_APAISADO + 0.005, id + ": apaisada (" + p.toFixed(3) + ")");
      assert.ok(Math.abs(proporcion(id, "mini") - 1) < 1e-6, id + ": la pequeña, cuadrada");
    });
    assert.ok(Math.abs(proporcion("sentadilla_barra", "completo") - 1) < 1e-6, "de pie, cuadrada");
    assert.ok(/style="aspect-ratio: [\d.]+ \/ [\d.]+"/.test(s.entrenoFiguraSvg("plancha", 0.5, "completo", "D")), "el alto sigue al encuadre");
    // Y nada se sale del cuadro: todo el cuerpo, dentro, en todo el gesto.
    var fuera = [];
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var vb = /viewBox="([^"]+)"/.exec(s.entrenoFiguraSvg(id, 0, "completo", "D"))[1].split(" ").map(Number);
      for (var k = 0; k <= 10; k++) {
        s.entrenoFiguraEscena(id, k / 10, "completo", "D").items.forEach(function (it) {
          if (it.prop) return;
          it.formas.forEach(function (f) {
            if (f.t !== "seg") return;
            [[f.x1, f.y1], [f.x2, f.y2]].forEach(function (p) {
              if (p[0] < vb[0] || p[0] > vb[0] + vb[2] || p[1] < vb[1] || p[1] > vb[1] + vb[3]) fuera.push(id + " s=" + k / 10);
            });
          });
        });
      }
    });
    assert.strictEqual(fuera.length, 0, fuera.slice(0, 6).join("; "));
  });

  // ── 2026-10-25: brazos que se doblan como se dobla un brazo ──

  function resta(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function punto(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function unidad(a) { var l = Math.sqrt(punto(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; }
  function perp(v, u) { var k = punto(v, u); return unidad([v[0] - u[0] * k, v[1] - u[1] * k, v[2] - u[2] * k]); }
  /** Cada brazo de cada ejercicio en 21 instantes (y por los dos lados si alterna). */
  function cadaBrazo(s, fn) {
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var spec = s.EJERCICIO_POSES[id];
      (spec.ritmo === "alterno" ? ["D", "I"] : ["D"]).forEach(function (lado) {
        for (var k = 0; k <= 20; k++) {
          var P = s._fPostura(spec, k / 20, lado);
          var j = s._fEsqueleto(P);
          ["D", "I"].forEach(function (L) { fn(id, k / 20, L, j, P["brazo" + L] || {}); });
        }
      });
    });
  }

  t.test("ningún codo se dobla al revés: el antebrazo va hacia donde el hombro deja girar el brazo", function () {
    var s = sandbox();
    var malos = {};
    cadaBrazo(s, function (id, x, L, j) {
      var T = j._T;
      var signo = L === "D" ? 1 : -1;
      var u1 = unidad(resta(j["codo" + L], j["hombro" + L]));
      var u2 = unidad(resta(j["muneca" + L], j["codo" + L]));
      if (Math.acos(Math.max(-1, Math.min(1, punto(u1, u2)))) * 180 / Math.PI < 20) return;
      var f = perp(u2, u1);
      var elev = Math.acos(Math.max(-1, Math.min(1, -punto(u1, T.Y)))) * 180 / Math.PI;
      var mal;
      if (elev > 135) {
        // Brazo por encima de la cabeza: el antebrazo no puede doblarse por delante de la cara.
        mal = punto(f, T.X) > 0.5;
      } else {
        // La cara de delante del brazo, llevada desde «colgando» por el giro más corto;
        // el codo puede girar de ahí unos 110° hacia dentro y 145° hacia fuera (las
        // manos en la nuca, con los codos abiertos, dan ~140 con esta cuenta).
        var abajo = [-T.Y[0], -T.Y[1], -T.Y[2]];
        var c = punto(abajo, u1);
        var n = T.X;
        if (c < 0.9999) {
          var eje = unidad(cruz(abajo, u1));
          var a = Math.acos(c);
          var kv = cruz(eje, T.X);
          var kd = punto(eje, T.X);
          n = perp([0, 1, 2].map(function (i) { return T.X[i] * Math.cos(a) + kv[i] * Math.sin(a) + eje[i] * kd * (1 - Math.cos(a)); }), u1);
        }
        var giro = Math.atan2(punto(cruz(n, f), u1), punto(n, f)) * 180 / Math.PI * signo;
        mal = giro > 145 || giro < -110;
      }
      if (mal) malos[id + " " + L] = x;
    });
    assert.deepStrictEqual(malos, {});
  });

  t.test("el codo no queda al azar: el polo nunca va a lo largo del brazo, y la mano llega a lo que agarra", function () {
    var s = sandbox();
    var largo = s.FIG.brazo + s.FIG.ante + s.FIG.mano / 2;
    var alineados = {};
    var lejos = {};
    cadaBrazo(s, function (id, x, L, j, b) {
      if (!b.mano) return;
      var u = resta(b.mano, j["hombro" + L]);
      var d = Math.sqrt(punto(u, u));
      if (d > largo + 1) lejos[id + " " + L] = Math.round(d - largo);
      var flex = Math.acos(Math.max(-1, Math.min(1, punto(unidad(resta(j["codo" + L], j["hombro" + L])), unidad(resta(j["muneca" + L], j["codo" + L])))))) * 180 / Math.PI;
      if (b.polo && flex > 20 && Math.abs(punto(unidad(b.polo), unidad(u))) > 0.9) alineados[id + " " + L] = x;
    });
    assert.deepStrictEqual(lejos, {}, "manos que se quedan cortas");
    assert.deepStrictEqual(alineados, {}, "polos a lo largo del brazo");
  });

  t.test("plancha sobre antebrazos, hip thrust y manos en la cintura: los brazos como de verdad", function () {
    var s = sandbox();
    function juntas(id, x) { return s._fEsqueleto(s._fPostura(s.EJERCICIO_POSES[id], x, "D")); }
    var p = juntas("plancha", 0.5);
    assert.ok(Math.abs(p.codoD[0] - p.hombroD[0]) < 6, "el codo, bajo el hombro");
    assert.ok(p.codoD[1] < 9 && p.munecaD[1] < 9, "el antebrazo, en el suelo");
    assert.ok(p.munecaD[0] - p.codoD[0] > 15, "y hacia delante");
    ["hip_thrust_barra", "hip_thrust_maquina"].forEach(function (id) {
      [0, 0.5, 1].forEach(function (x) {
        var j = juntas(id, x);
        assert.ok(j.codoD[1] < j.manoD[1], id + " s=" + x + ": el codo, por debajo de la mano (no hacia el techo)");
      });
    });
    ["zancadas", "sentadilla_bulgara_sin_material"].forEach(function (id) {
      var j = juntas(id, 0.5);
      var u = unidad(resta(j.codoD, j.hombroD));
      assert.ok(punto(u, j._T.Z) > 3 * Math.abs(punto(u, j._T.X)), id + ": el codo sale hacia fuera, no hacia atrás");
    });
  });

  t.test("el marcado para la pantalla: grande con nombre para el lector, pequeña oculta dentro de su botón", function () {
    var s = sandbox();
    var grande = s.entrenoAnimacionHtml("flexiones", "completo", "Анимация: Отжимания");
    assert.ok(/data-anim="flexiones"/.test(grande) && /role="img"/.test(grande) && /aria-label="Анимация: Отжимания"/.test(grande));
    var pequena = s.entrenoAnimacionHtml("flexiones", "mini", "");
    assert.ok(/aria-hidden="true"/.test(pequena) && /data-detalle="mini"/.test(pequena));
    assert.strictEqual(s.entrenoAnimacionHtml("no_existe", "mini", ""), "");
  });

  t.test("el plan y la sesión llevan la pequeña de cada ejercicio, y la técnica de la sesión la grande", function () {
    var s = sandbox(true);
    var plan = s.entrenoPlanParaDatos({ dias: 3, objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio", semana: 1 });
    var html = s.entrenoPlanHtml(plan, s.entrenoLogVacio());
    var ejercicios = 0;
    plan.sesiones.forEach(function (x) { ejercicios += x.exercises.length; });
    assert.strictEqual(html.split("data-anim-abrir=").length - 1, ejercicios, "una pequeña por ejercicio del plan");
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, plan.sesiones[0], 1, 1e12);
    var pantalla = s.entrenoSesionPantallaHtml(sesion, log, 1e12);
    assert.strictEqual(pantalla.split('data-detalle="mini"').length - 1, sesion.ejercicios.length);
    assert.strictEqual(pantalla.split('data-detalle="completo"').length - 1, sesion.ejercicios.length);
  });

  t.test("index.html carga las posturas y el motor antes de la pantalla de entrenamientos, y trae la ventana", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var posturas = html.indexOf('<script src="js/data/exercise-poses.js');
    var motor = html.indexOf('<script src="js/ui/entreno-figura.js');
    var pantalla = html.indexOf('<script src="js/ui/render-entreno.js');
    assert.ok(posturas !== -1 && motor !== -1, "faltan los ficheros de las animaciones");
    assert.ok(posturas < pantalla && motor < pantalla, "deben ir antes de render-entreno.js");
    assert.ok(/<dialog[^>]*id="entrenoAnimDialogo"[^>]*aria-labelledby="entrenoAnimTitulo"/.test(html), "falta la ventana con título");
  });
}

module.exports = { run: run };

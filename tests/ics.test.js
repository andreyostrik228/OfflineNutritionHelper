/**
 * tests/ics.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Exportación .ics (js/core/ics-export.js). Todas las fechas son fijas
 * ("2026-10-19", un lunes) y el resultado no depende de la hora ni de la
 * zona horaria de la máquina: se comprueba también cambiando TZ a mano.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/core/i18n.js"),
    projPath("js/i18n/es.js"),
    projPath("js/i18n/ru.js"),
    projPath("js/core/ics-export.js")
  ]);
}

/** Sello fijo en UTC: no depende de la hora de la máquina. */
function selloFijo() {
  return new Date(Date.UTC(2026, 9, 18, 9, 5, 7));
}

/** Octetos UTF-8 de un texto (para comprobar el plegado). */
function octetos(texto) {
  return Buffer.byteLength(texto, "utf8");
}

/** Comidas de prueba: desayuno a las 8:30 con un ingrediente que lleva coma. */
function comidasDePrueba() {
  return [
    { key: "breakfast", label: "Desayuno", timeMinutes: 510, items: [{ name: "Avena, copos", grams: 60 }] },
    { key: "lunch", label: "Comida", timeMinutes: 840, items: [] },
    { key: "dinner", label: "Cena", items: [] }
  ];
}

/** Plan de entrenamiento de prueba: dos sesiones en lunes y miércoles. */
function planDePrueba() {
  return {
    sesiones: [
      {
        key: "superior_A", name: "Superior A", dia: 1,
        exercises: [{ name: "Press de banca", sets: 3, reps: "8-12", restSeconds: 150 }]
      },
      {
        key: "inferior_A", name: "Inferior A", dia: 3,
        exercises: [{ name: "Sentadilla", sets: 3, reps: "6-10", restSeconds: 120 }]
      }
    ]
  };
}

/** Líneas del calendario (sin plegar), para buscar propiedades concretas. */
function lineasDe(texto) {
  return texto.split("\r\n").filter(function (l) { return 0 < l.length; });
}

function run(t) {

  t.test("el escape de TEXT sigue RFC 5545: barra invertida primero, después coma, punto y coma y salto de línea", function () {
    var s = sandbox();
    assert.strictEqual(s.icsEscapar("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
    assert.strictEqual(s.icsEscapar("uno\r\ndos"), "uno\\ndos");
    assert.strictEqual(s.icsEscapar("solo\rcr"), "solo\\ncr");
    assert.strictEqual(s.icsEscapar(""), "");
  });

  t.test("una línea de más de 75 octetos se parte; al desplegarla vuelve el texto original", function () {
    var s = sandbox();
    var original = "SUMMARY:" + "abcdefghij".repeat(10);
    var plegada = s.icsPlegar(original);
    var partes = plegada.split("\r\n");
    assert.ok(1 < partes.length, "debía partirse");
    assert.strictEqual(octetos(partes[0]), 75, "la primera parte ocupa 75 octetos");
    partes.forEach(function (p, i) {
      if (0 < i) assert.strictEqual(p.charAt(0), " ", "la continuación empieza por espacio");
      assert.ok(octetos(p) <= 75, "parte " + i + " con " + octetos(p) + " octetos");
    });
    assert.strictEqual(plegada.split("\r\n ").join(""), original);
  });

  t.test("con acentos cirílicos (2 octetos por letra) ninguna parte pasa de 75 octetos ni corta una letra", function () {
    var s = sandbox();
    var original = "DESCRIPTION:" + "Тренировка".repeat(6);
    var plegada = s.icsPlegar(original);
    plegada.split("\r\n").forEach(function (p) {
      assert.ok(octetos(p) <= 75, "parte de " + octetos(p) + " octetos: " + p);
    });
    assert.strictEqual(plegada.split("\r\n ").join(""), original);
  });

  t.test("la fecha y hora son flotantes: AAAAMMDDTHHMMSS, sin Z ni zona", function () {
    var s = sandbox();
    assert.strictEqual(s.icsFechaHora(2026, 10, 9, 510), "20261009T083000");
    assert.strictEqual(s.icsFechaHora(2026, 1, 5, 1439), "20260105T235900");
    assert.strictEqual(s.icsFechaHora(2026, 10, 9, 0), "20261009T000000");
  });

  t.test("sumar días cruza meses, años y bisiestos sin depender de la zona", function () {
    var s = sandbox();
    assert.strictEqual(s.icsSumarDias("2026-10-31", 1), "2026-11-01");
    assert.strictEqual(s.icsSumarDias("2026-12-31", 1), "2027-01-01");
    assert.strictEqual(s.icsSumarDias("2028-02-28", 1), "2028-02-29");
    assert.strictEqual(s.icsSumarDias("2026-10-19", 0), "2026-10-19");
  });

  t.test("el día de la semana sale con lunes = 0 y domingo = 6", function () {
    var s = sandbox();
    assert.strictEqual(s.icsDiaSemana("2026-10-19"), 0);
    assert.strictEqual(s.icsDiaSemana("2026-10-21"), 2);
    assert.strictEqual(s.icsDiaSemana("2026-10-22"), 3);
    assert.strictEqual(s.icsDiaSemana("2026-10-18"), 6);
  });

  t.test("la fecha de hoy se arma con los componentes locales, con ceros", function () {
    var s = sandbox();
    assert.strictEqual(s.icsFechaDeHoy(2026, 1, 5), "2026-01-05");
  });

  t.test("las comidas: un VEVENT por toma con hora, a la hora justa y con el ingrediente escapado", function () {
    var s = sandbox();
    var texto = s.icsComidas(comidasDePrueba(), "2026-10-19", { sello: selloFijo() });
    assert.strictEqual((texto.match(/BEGIN:VEVENT/g) || []).length, 2, "la cena no tiene hora y no entra");
    var lineas = lineasDe(texto);
    assert.ok(lineas.indexOf("DTSTART:20261019T083000") !== -1, "desayuno a las 8:30");
    assert.ok(lineas.indexOf("DTEND:20261019T090000") !== -1, "30 minutos por defecto");
    assert.ok(lineas.indexOf("UID:comida-2026-10-19-breakfast@weekplate") !== -1, "UID fijo");
    assert.ok(lineas.indexOf("DESCRIPTION:Avena\\, copos: 60 g") !== -1, "la coma del ingrediente va escapada");
    assert.ok(lineas.indexOf("SUMMARY:Desayuno") !== -1);
  });

  t.test("la comida del final del día no pasa de las 23:59", function () {
    var s = sandbox();
    var texto = s.icsComidas([{ key: "snack", label: "Snack", timeMinutes: 1435, items: [] }], "2026-10-19", {
      sello: selloFijo(), duracionMin: 30
    });
    assert.ok(lineasDe(texto).indexOf("DTEND:20261019T235900") !== -1, texto);
  });

  t.test("el calendario va entero con CRLF: cabecera, cierre y ningún salto de línea suelto", function () {
    var s = sandbox();
    var texto = s.icsComidas(comidasDePrueba(), "2026-10-19", { sello: selloFijo() });
    assert.ok(texto.indexOf("BEGIN:VCALENDAR\r\n") === 0, "empieza por BEGIN:VCALENDAR");
    assert.ok(texto.slice(-("END:VCALENDAR\r\n").length) === "END:VCALENDAR\r\n", "acaba en END:VCALENDAR");
    assert.ok(texto.indexOf("VERSION:2.0") !== -1 && texto.indexOf("CALSCALE:GREGORIAN") !== -1);
    assert.strictEqual(texto.replace(/\r\n/g, "").indexOf("\n"), -1, "hay un LF suelto");
  });

  t.test("DTSTAMP va en UTC con la Z, aunque la zona de la máquina sea otra", function () {
    var s = sandbox();
    var texto = s.icsComidas(comidasDePrueba(), "2026-10-19", { sello: selloFijo() });
    assert.ok(lineasDe(texto).indexOf("DTSTAMP:20261018T090507Z") !== -1);
  });

  t.test("el entrenamiento: cada sesión cae en su día de la semana y repite cada semana", function () {
    var s = sandbox();
    var texto = s.icsEntreno(planDePrueba(), "2026-10-19", { sello: selloFijo() });
    var lineas = lineasDe(texto);
    assert.ok(lineas.indexOf("DTSTART:20261019T180000") !== -1, "superior el lunes a las 18:00");
    assert.ok(lineas.indexOf("RRULE:FREQ=WEEKLY;BYDAY=MO") !== -1);
    assert.ok(lineas.indexOf("DTSTART:20261021T180000") !== -1, "inferior el miércoles");
    assert.ok(lineas.indexOf("RRULE:FREQ=WEEKLY;BYDAY=WE") !== -1);
    assert.ok(lineas.indexOf("DTEND:20261019T190000") !== -1, "una hora por defecto");
  });

  t.test("si la fecha de inicio es miércoles, el lunes de esa misma semana cae en el lunes siguiente", function () {
    var s = sandbox();
    var texto = s.icsEntreno(planDePrueba(), "2026-10-21", { sello: selloFijo() });
    assert.ok(lineasDe(texto).indexOf("DTSTART:20261026T180000") !== -1, "el lunes ya pasó: va el 26");
    assert.ok(lineasDe(texto).indexOf("DTSTART:20261021T180000") !== -1, "el miércoles es hoy");
  });

  t.test("el entrenamiento escribe la hora elegida y las líneas de ejercicios con la coma escapada", function () {
    var s = sandbox();
    var texto = s.icsEntreno(planDePrueba(), "2026-10-19", {
      sello: selloFijo(),
      horaMinutos: 19 * 60 + 30,
      titulo: function (sesion) { return "Entreno: " + sesion.name + "; fuerza"; },
      linea: function (e) { return e.name + ": " + e.sets + " x " + e.reps + ", descanso 2:30"; }
    });
    var lineas = lineasDe(texto);
    assert.ok(lineas.indexOf("DTSTART:20261019T193000") !== -1, "hora personalizada");
    assert.ok(lineas.indexOf("SUMMARY:Entreno: Superior A\\; fuerza") !== -1, "el punto y coma va escapado");
    assert.ok(lineas.indexOf("DESCRIPTION:Press de banca: 3 x 8-12\\, descanso 2:30") !== -1, "la coma de la línea va escapada");
  });

  t.test("sin función de línea el entrenamiento no escribe nombres en español: el evento sale sin descripción", function () {
    var s = sandbox();
    var texto = s.icsEntreno(planDePrueba(), "2026-10-19", { sello: selloFijo() });
    var lineas = lineasDe(texto);
    assert.ok(lineas.indexOf("DTSTART:20261019T180000") !== -1, "el evento sigue ahí");
    assert.strictEqual(lineas.filter(function (l) { return l.indexOf("DESCRIPTION:") === 0; }).length, 0, "sin descripción");
    assert.ok(texto.indexOf("Press de banca") === -1 && texto.indexOf("Sentadilla") === -1, "ningún nombre de ejercicio en español");
  });

  t.test("sin función de título el resumen sale vacío, sin el nombre de la sesión en español", function () {
    var s = sandbox();
    var texto = s.icsEntreno(planDePrueba(), "2026-10-19", { sello: selloFijo() });
    var lineas = lineasDe(texto);
    assert.ok(lineas.indexOf("SUMMARY:") !== -1, "el resumen queda vacío");
    assert.ok(texto.indexOf("Superior A") === -1 && texto.indexOf("Inferior A") === -1, "ningún nombre de sesión en español");
  });

  t.test("sin fecha válida o sin plan no sale ningún evento, solo la cabecera y el cierre", function () {
    var s = sandbox();
    var sinFecha = s.icsEntreno(planDePrueba(), "19/10/2026", { sello: selloFijo() });
    assert.strictEqual((sinFecha.match(/BEGIN:VEVENT/g) || []).length, 0);
    var sinPlan = s.icsEntreno(null, "2026-10-19", { sello: selloFijo() });
    assert.strictEqual((sinPlan.match(/BEGIN:VEVENT/g) || []).length, 0);
  });

  t.test("el resultado es el mismo con cualquier zona horaria de la máquina (zona fijada a mano)", function () {
    var antes = process.env.TZ;
    var s = sandbox();
    function generar(zona) {
      process.env.TZ = zona;
      return s.icsComidas(comidasDePrueba(), "2026-10-19", { sello: selloFijo() }) +
        s.icsEntreno(planDePrueba(), "2026-10-19", { sello: selloFijo() });
    }
    try {
      var madrid = generar("Europe/Madrid");
      var losAngeles = generar("America/Los_Angeles");
      var tokio = generar("Asia/Tokyo");
      assert.strictEqual(madrid, losAngeles, "Madrid y Los Ángeles deben dar lo mismo");
      assert.strictEqual(madrid, tokio, "Madrid y Tokio deben dar lo mismo");
    } finally {
      if (antes === undefined) delete process.env.TZ; else process.env.TZ = antes;
    }
  });

  t.test("los textos del calendario existen en ruso y no llevan emojis", function () {
    var s = sandbox();
    ["ics.boton_comidas", "ics.boton_entreno", "ics.entreno_titulo", "ics.linea_ejercicio"].forEach(function (k) {
      var texto = s.t(k, "ru");
      assert.notStrictEqual(texto, k, "falta " + k + " en ruso");
      assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(texto), k + " lleva emoji: " + texto);
    });
  });

  t.test("un plan de 3 días da 3 fechas en DTSTART: cada toma en su día y a su hora", function () {
    var s = sandbox();
    var dias = [{ meals: comidasDePrueba() }, { meals: comidasDePrueba() }, { meals: comidasDePrueba() }];
    var texto = s.icsComidasDias(dias, "2026-10-19", { sello: selloFijo() });
    var lineas = lineasDe(texto);
    var inicios = lineas.filter(function (l) { return l.indexOf("DTSTART:") === 0; });
    assert.strictEqual(inicios.length, 6, "dos tomas con hora por día");
    var fechas = inicios.map(function (l) { return l.slice(8, 16); }).filter(function (f, i, todas) { return todas.indexOf(f) === i; });
    assert.deepStrictEqual(fechas, ["20261019", "20261020", "20261021"]);
    assert.ok(lineas.indexOf("DTSTART:20261020T083000") !== -1, "desayuno del día 2 a las 8:30");
    assert.ok(lineas.indexOf("DTSTART:20261021T140000") !== -1, "comida del día 3 a las 14:00");
  });

  t.test("el plan de 3 días cruza el fin de mes: 30 de octubre, 31 de octubre y 1 de noviembre", function () {
    var s = sandbox();
    var dias = [{ meals: comidasDePrueba() }, { meals: comidasDePrueba() }, { meals: comidasDePrueba() }];
    var lineas = lineasDe(s.icsComidasDias(dias, "2026-10-30", { sello: selloFijo() }));
    var fechas = lineas.filter(function (l) { return l.indexOf("DTSTART:") === 0; }).map(function (l) { return l.slice(8, 16); });
    assert.deepStrictEqual(fechas.filter(function (f, i) { return i % 2 === 0; }), ["20261030", "20261031", "20261101"]);
  });

  t.test("con un solo día, la salida es la misma que la de icsComidas", function () {
    var s = sandbox();
    var uno = s.icsComidasDias([{ meals: comidasDePrueba() }], "2026-10-19", { sello: selloFijo() });
    var clasico = s.icsComidas(comidasDePrueba(), "2026-10-19", { sello: selloFijo() });
    assert.strictEqual(uno, clasico);
  });

  t.test("cada toma de cada día tiene su UID propio: no se repiten entre días", function () {
    var s = sandbox();
    var dias = [{ meals: comidasDePrueba() }, { meals: comidasDePrueba() }];
    var uids = lineasDe(s.icsComidasDias(dias, "2026-10-19", { sello: selloFijo() })).filter(function (l) { return l.indexOf("UID:") === 0; });
    assert.strictEqual(uids.length, 4);
    assert.strictEqual(uids.filter(function (u, i) { return uids.indexOf(u) === i; }).length, 4, "hay UID repetidos");
  });

  t.test("sin días válidos, sin fecha o con días sin tomas con hora, el calendario sale sin eventos", function () {
    var s = sandbox();
    var sinEventos = function (texto) { return (texto.match(/BEGIN:VEVENT/g) || []).length === 0; };
    assert.ok(sinEventos(s.icsComidasDias([], "2026-10-19", { sello: selloFijo() })), "lista vacía");
    assert.ok(sinEventos(s.icsComidasDias(null, "2026-10-19", { sello: selloFijo() })), "sin lista");
    assert.ok(sinEventos(s.icsComidasDias([{ meals: [] }, {}], "2026-10-19", { sello: selloFijo() })), "días sin tomas");
    assert.ok(sinEventos(s.icsComidasDias([{ meals: comidasDePrueba() }], "19/10/2026", { sello: selloFijo() })), "fecha no válida");
  });

  t.test("la hora del entreno: 07:30 da DTSTART a las 07:30 y acaba a las 08:30 (60 minutos)", function () {
    var s = sandbox();
    var texto = s.icsEntreno(planDePrueba(), "2026-10-19", { sello: selloFijo(), horaMinutos: s.icsHoraEntreno("07:30") });
    var lineas = lineasDe(texto);
    assert.ok(lineas.indexOf("DTSTART:20261019T073000") !== -1, "DTSTART con 0730");
    assert.ok(lineas.indexOf("DTEND:20261019T083000") !== -1, "la duración sigue siendo de 60 minutos");
  });

  t.test("sin hora válida (vacía, texto, fuera de rango o nula) se vuelve a las 18:00", function () {
    var s = sandbox();
    ["", "abc", "25:00", "12:60", "7:3x", null, undefined].forEach(function (valor) {
      assert.strictEqual(s.icsHoraEntreno(valor), 18 * 60, "valor " + JSON.stringify(valor));
    });
    var texto = s.icsEntreno(planDePrueba(), "2026-10-19", { sello: selloFijo(), horaMinutos: s.icsHoraEntreno("") });
    assert.ok(lineasDe(texto).indexOf("DTSTART:20261019T180000") !== -1, "cae a las 18:00");
  });

  t.test("las horas válidas en los extremos se leen bien: 7:30, 00:00 y 23:59", function () {
    var s = sandbox();
    assert.strictEqual(s.icsHoraEntreno("7:30"), 450);
    assert.strictEqual(s.icsHoraEntreno("00:00"), 0);
    assert.strictEqual(s.icsHoraEntreno("23:59"), 1439);
  });

  t.test("la hora no se guarda: el id del campo aparece una sola vez en la pantalla, al exportar", function () {
    var fuente = fs.readFileSync(projPath("js/ui/render-entreno.js"), "utf8");
    assert.strictEqual(fuente.split("entHora").length - 1, 1, "entHora solo debe leerse al exportar");
  });

  t.test("el campo de hora está en el marcado con 18:00 por defecto y sin recordar el valor", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(html.indexOf('id="entHora" type="time" value="18:00" autocomplete="off"') !== -1, "falta el campo de hora");
  });

  t.test("la interfaz tiene los botones de descarga y los módulos que los llaman", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(html.indexOf('id="entIcs"') !== -1, "falta el botón de entrenamientos en index.html");
    assert.ok(html.indexOf("js/core/ics-export.js") !== -1, "index.html no carga ics-export.js");
    var entreno = fs.readFileSync(projPath("js/ui/render-entreno.js"), "utf8");
    assert.ok(entreno.indexOf("icsEntreno(") !== -1, "render-entreno.js no exporta el entrenamiento");
    var horario = fs.readFileSync(projPath("js/ui/render-schedule.js"), "utf8");
    assert.ok(horario.indexOf('data-accion="ics"') !== -1, "la línea horaria no tiene el botón de comidas");
    assert.ok(horario.indexOf("icsComidasDias(") !== -1, "render-schedule.js no exporta las comidas de todos los días");
  });
}

module.exports = { run: run };

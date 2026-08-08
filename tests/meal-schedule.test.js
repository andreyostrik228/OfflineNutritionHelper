/**
 * tests/meal-schedule.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/meal-schedule.js (horario de comidas): saneamiento de
 * preferencias despertar/dormir, orden cronológico, reparto uniforme de
 * horas, marcador de "próxima comida", nota de horario comprimido, hora de
 * empezar a cocinar, y persistencia de la hora a través de la despensa
 * (savePlanForToday).
 *
 * Carga el código de PRODUCCIÓN real (vm, sin copiar) — mismo patrón que
 * tests/pantry.test.js / tests/budget-mode.test.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshScheduleSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/core/meal-schedule.js")
  ]);
}

function freshPantryScheduleSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/meal-schedule.js"),
    projPath("js/core/pantry.js")
  ]);
}

function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function meal(key, label, prep) {
  return { key: key, label: label, items: [], prep: prep || 0 };
}

function run(t) {

  // ── parseTimeToMinutes / formatMinutesToTime ───────────────────────────

  t.test("parseTimeToMinutes: 'HH:MM' válido se convierte a minutos desde medianoche", function () {
    var s = freshScheduleSandbox();
    assert.strictEqual(s.parseTimeToMinutes("08:00"), 480);
    assert.strictEqual(s.parseTimeToMinutes("23:45"), 1425);
    assert.strictEqual(s.parseTimeToMinutes("00:00"), 0);
  });

  t.test("parseTimeToMinutes: entradas inválidas devuelven null, nunca lanzan", function () {
    var s = freshScheduleSandbox();
    assert.strictEqual(s.parseTimeToMinutes(""), null);
    assert.strictEqual(s.parseTimeToMinutes(null), null);
    assert.strictEqual(s.parseTimeToMinutes(undefined), null);
    assert.strictEqual(s.parseTimeToMinutes("25:00"), null);
    assert.strictEqual(s.parseTimeToMinutes("10:70"), null);
    assert.strictEqual(s.parseTimeToMinutes("no-es-una-hora"), null);
    assert.strictEqual(s.parseTimeToMinutes(480), null);
  });

  t.test("formatMinutesToTime: redondea y envuelve medianoche en ambas direcciones", function () {
    var s = freshScheduleSandbox();
    assert.strictEqual(s.formatMinutesToTime(480), "08:00");
    assert.strictEqual(s.formatMinutesToTime(1440), "00:00");
    assert.strictEqual(s.formatMinutesToTime(1500), "01:00");
    assert.strictEqual(s.formatMinutesToTime(-30), "23:30");
  });

  // ── sanitizeScheduleSettings ────────────────────────────────────────────

  t.test("sanitizeScheduleSettings: sin preferencias -> usa los valores por defecto", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings(undefined);
    assert.strictEqual(settings.wakeMinutes, s.parseTimeToMinutes(s.DEFAULT_WAKE_TIME));
    assert.strictEqual(settings.sleepMinutes, s.parseTimeToMinutes(s.DEFAULT_SLEEP_TIME));
    assert.strictEqual(settings.usedFallback, true);
  });

  t.test("sanitizeScheduleSettings: solo un campo inválido -> solo ESE cae al valor por defecto", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings({ wakeTime: "06:00", sleepTime: "no-valida" });
    assert.strictEqual(settings.wakeMinutes, 360); // se respeta la hora de despertar dada
    assert.strictEqual(settings.sleepMinutes, s.parseTimeToMinutes(s.DEFAULT_SLEEP_TIME));
    assert.strictEqual(settings.usedFallback, true);
  });

  t.test("sanitizeScheduleSettings: preferencias válidas se usan tal cual (con colchón aplicado)", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings({ wakeTime: "07:00", sleepTime: "23:00" });
    assert.strictEqual(settings.usedFallback, false);
    assert.strictEqual(settings.windowStart, 420 + s.WAKE_BUFFER_MIN);
    assert.strictEqual(settings.windowLen, (1380 - 420) - s.WAKE_BUFFER_MIN - s.SLEEP_BUFFER_MIN);
  });

  t.test("sanitizeScheduleSettings: turno de noche (dormir antes que despertar en el reloj) envuelve medianoche sin romperse", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings({ wakeTime: "22:00", sleepTime: "06:00" });
    assert.strictEqual(settings.usedFallback, false);
    // ventana cruda: 22:00 -> 06:00 (envolviendo medianoche) = 8h = 480 min
    var bufferedExpected = 480 - s.WAKE_BUFFER_MIN - s.SLEEP_BUFFER_MIN;
    assert.strictEqual(settings.windowLen, bufferedExpected);
    assert.ok(settings.windowLen > 0);
  });

  t.test("sanitizeScheduleSettings: despertar y dormir casi coinciden (ventana < 60 min) -> fallback total a los valores por defecto", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings({ wakeTime: "08:00", sleepTime: "08:10" });
    assert.strictEqual(settings.usedFallback, true);
    assert.strictEqual(settings.wakeMinutes, s.parseTimeToMinutes(s.DEFAULT_WAKE_TIME));
    assert.strictEqual(settings.sleepMinutes, s.parseTimeToMinutes(s.DEFAULT_SLEEP_TIME));
  });

  t.test("sanitizeScheduleSettings: despertar === dormir se trata como 'despierto todo el día' (24h), no como error", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings({ wakeTime: "09:00", sleepTime: "09:00" });
    assert.strictEqual(settings.usedFallback, false);
    assert.ok(settings.windowLen > 0);
  });

  t.test("sanitizeScheduleSettings: ventana muy corta (colchones no caben) -> usa la ventana cruda sin colchón en vez de negativa", function () {
    var s = freshScheduleSandbox();
    var settings = s.sanitizeScheduleSettings({ wakeTime: "07:00", sleepTime: "08:30" }); // 90 min crudos
    assert.strictEqual(settings.windowStart, 420); // sin colchón de despertar
    assert.strictEqual(settings.windowLen, 90);
    assert.ok(settings.windowLen > 0);
  });

  // ── Orden cronológico ───────────────────────────────────────────────────

  t.test("sortMealsChronologically: reordena las 5 tomas del generador principal (categoría -> reloj)", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner"), meal("snack"), meal("snack2")];
    var sorted = s.sortMealsChronologically(meals).map(function (m) { return m.key; });
    assert.deepStrictEqual(sorted, ["breakfast", "snack", "lunch", "snack2", "dinner"]);
  });

  t.test("sortMealsChronologically: las 4 tomas de 'sin cocinar' ya están en orden y se conservan", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("snack"), meal("dinner")];
    var sorted = s.sortMealsChronologically(meals).map(function (m) { return m.key; });
    assert.deepStrictEqual(sorted, ["breakfast", "snack", "lunch", "dinner"]);
  });

  t.test("sortMealsChronologically: 3 tomas sin snacks quedan igual (ya cronológicas)", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner")];
    var sorted = s.sortMealsChronologically(meals).map(function (m) { return m.key; });
    assert.deepStrictEqual(sorted, ["breakfast", "lunch", "dinner"]);
  });

  t.test("sortMealsChronologically: clave desconocida no rompe el orden -- se reparte por posición original, con empate estable", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("brunch"), meal("lunch")];
    var sorted = s.sortMealsChronologically(meals).map(function (m) { return m.key; });
    assert.deepStrictEqual(sorted, ["breakfast", "brunch", "lunch"]);
  });

  t.test("sortMealsChronologically: devuelve las MISMAS referencias de objeto (no copias)", function () {
    var s = freshScheduleSandbox();
    var b = meal("breakfast");
    var l = meal("lunch");
    var sorted = s.sortMealsChronologically([l, b]);
    assert.strictEqual(sorted[0], b);
    assert.strictEqual(sorted[1], l);
  });

  // ── computeMealSchedule ──────────────────────────────────────────────────

  t.test("computeMealSchedule: array vacío o no-array siempre devuelve un array, nunca lanza", function () {
    // Comprobación por Array.isArray+length, no deepStrictEqual contra un
    // literal []: el array que devuelve la función se construye DENTRO
    // del contexto vm (otro realm), y Node considera que dos arrays vacíos
    // de realms distintos no son "reference-equal" a efectos de
    // deepStrictEqual aunque tengan la misma forma -- mismo motivo que en
    // readScheduleSettings más abajo.
    var s = freshScheduleSandbox();
    [s.computeMealSchedule([], {}), s.computeMealSchedule(null, {}), s.computeMealSchedule(undefined, {})]
      .forEach(function (result) {
        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 0);
      });
  });

  t.test("computeMealSchedule: 5 tomas -- reordena cronológicamente y reparte horas crecientes con intervalos iguales", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner"), meal("snack"), meal("snack2")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "07:00", sleepTime: "23:00" });

    assert.deepStrictEqual(scheduled.map(function (m) { return m.key; }),
      ["breakfast", "snack", "lunch", "snack2", "dinner"]);

    scheduled.forEach(function (m) {
      assert.strictEqual(typeof m.time, "string");
      assert.ok(/^\d{2}:\d{2}$/.test(m.time));
      assert.strictEqual(typeof m.timeMinutes, "number");
    });

    // Horas crecientes (primera = desayuno, última = cena)
    for (var i = 1; i < scheduled.length; i++) {
      assert.ok(scheduled[i].timeMinutes > scheduled[i - 1].timeMinutes,
        scheduled[i - 1].key + " (" + scheduled[i - 1].time + ") debería ir antes que " +
        scheduled[i].key + " (" + scheduled[i].time + ")");
    }

    // Intervalos iguales (±5 min por el redondeo a múltiplos de 5)
    var gap0 = scheduled[1].timeMinutes - scheduled[0].timeMinutes;
    for (var j = 2; j < scheduled.length; j++) {
      var gap = scheduled[j].timeMinutes - scheduled[j - 1].timeMinutes;
      assert.ok(Math.abs(gap - gap0) <= 5, "los intervalos deberían ser aproximadamente iguales");
    }
  });

  t.test("computeMealSchedule: 3 tomas (sin snacks) también funcionan -- no asume 5 fijas", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "07:00", sleepTime: "22:00" });
    assert.strictEqual(scheduled.length, 3);
    assert.ok(scheduled[0].timeMinutes < scheduled[1].timeMinutes);
    assert.ok(scheduled[1].timeMinutes < scheduled[2].timeMinutes);
  });

  t.test("computeMealSchedule: 4 tomas de 'sin cocinar' funcionan igual que las del generador principal", function () {
    var s = freshScheduleSandbox();
    var slots = [meal("breakfast"), meal("lunch"), meal("snack"), meal("dinner")];
    var scheduled = s.computeMealSchedule(slots, {});
    assert.deepStrictEqual(scheduled.map(function (m) { return m.key; }), ["breakfast", "snack", "lunch", "dinner"]);
  });

  t.test("computeMealSchedule: una sola toma -- se coloca en el punto medio de la ventana", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("lunch")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "07:00", sleepTime: "23:00" });
    var settings = s.sanitizeScheduleSettings({ wakeTime: "07:00", sleepTime: "23:00" });
    var expectedMid = Math.round((settings.windowStart + settings.windowLen / 2) / 5) * 5;
    assert.strictEqual(scheduled[0].timeMinutes, expectedMid % 1440);
  });

  t.test("computeMealSchedule: muta los objetos meal originales (mismas referencias, resto de campos intacto)", function () {
    var s = freshScheduleSandbox();
    var b = meal("breakfast");
    b.items = [{ name: "Avena", grams: 80 }];
    var scheduled = s.computeMealSchedule([b], {});
    assert.strictEqual(scheduled[0], b);
    assert.strictEqual(scheduled[0].items[0].name, "Avena");
  });

  t.test("computeMealSchedule: preferencias inválidas no bloquean el cálculo -- cae a los valores por defecto", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "no-valida", sleepTime: "" });
    scheduled.forEach(function (m) { assert.ok(/^\d{2}:\d{2}$/.test(m.time)); });
  });

  // ── isScheduleCompact ─────────────────────────────────────────────────

  t.test("isScheduleCompact: ventana amplia -> false", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "07:00", sleepTime: "23:00" });
    assert.strictEqual(s.isScheduleCompact(scheduled), false);
  });

  t.test("isScheduleCompact: día muy corto con 5 tomas -> true (aviso, no bloqueo)", function () {
    var s = freshScheduleSandbox();
    var meals = [meal("breakfast"), meal("lunch"), meal("dinner"), meal("snack"), meal("snack2")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "09:00", sleepTime: "12:30" }); // 3.5h crudas para 5 tomas
    assert.strictEqual(s.isScheduleCompact(scheduled), true);
  });

  t.test("isScheduleCompact: menos de 2 comidas con hora -> false (no hay intervalo que medir)", function () {
    var s = freshScheduleSandbox();
    assert.strictEqual(s.isScheduleCompact([]), false);
    assert.strictEqual(s.isScheduleCompact([{ key: "lunch", timeMinutes: 780 }]), false);
  });

  // ── findNextMealIndex ─────────────────────────────────────────────────

  t.test("findNextMealIndex: elige la comida con la hora más próxima que aún no ha pasado", function () {
    var s = freshScheduleSandbox();
    var meals = [
      { key: "breakfast", timeMinutes: 450 },
      { key: "lunch", timeMinutes: 780 },
      { key: "dinner", timeMinutes: 1260 }
    ];
    assert.strictEqual(s.findNextMealIndex(meals, 500), 1);  // tras desayuno, antes de comida
    assert.strictEqual(s.findNextMealIndex(meals, 780), 1);  // justo a la hora de comer
    assert.strictEqual(s.findNextMealIndex(meals, 0), 0);    // antes de todas
  });

  t.test("findNextMealIndex: si ya pasaron todas hoy, envuelve a la primera (mañana)", function () {
    var s = freshScheduleSandbox();
    var meals = [
      { key: "breakfast", timeMinutes: 450 },
      { key: "dinner", timeMinutes: 1260 }
    ];
    assert.strictEqual(s.findNextMealIndex(meals, 1300), 0);
  });

  t.test("findNextMealIndex: ninguna comida con hora calculada -> -1", function () {
    var s = freshScheduleSandbox();
    assert.strictEqual(s.findNextMealIndex([{ key: "lunch" }], 600), -1);
    assert.strictEqual(s.findNextMealIndex([], 600), -1);
  });

  // ── getCookStartMinutes / getCookStartTime (preparado para recordatorios futuros) ─

  t.test("getCookStartTime: resta el tiempo de preparación a la hora de comer", function () {
    var s = freshScheduleSandbox();
    var m = { key: "lunch", timeMinutes: 780, prep: 25 }; // 13:00, 25 min prep
    assert.strictEqual(s.getCookStartMinutes(m), 755);
    assert.strictEqual(s.getCookStartTime(m), "12:35");
  });

  t.test("getCookStartTime: null si no hay hora calculada, o si no requiere preparación", function () {
    var s = freshScheduleSandbox();
    assert.strictEqual(s.getCookStartTime({ key: "lunch", prep: 25 }), null); // sin timeMinutes
    assert.strictEqual(s.getCookStartTime({ key: "lunch", timeMinutes: 780, prep: 0 }), null);
    assert.strictEqual(s.getCookStartTime({ key: "lunch", timeMinutes: 780 }), null);
  });

  t.test("getCookStartTime: envuelve medianoche hacia atrás sin romperse (comida muy temprano con prep largo)", function () {
    var s = freshScheduleSandbox();
    var m = { key: "breakfast", timeMinutes: 10, prep: 30 }; // 00:10, 30 min prep -> 23:40 del día anterior
    assert.strictEqual(s.getCookStartTime(m), "23:40");
  });

  // ── readScheduleSettings (lectura del DOM, con document simulado) ──────

  // Nota: se comparan los campos uno a uno, no con assert.deepStrictEqual
  // sobre el objeto completo -- el objeto lo construye código que corre
  // DENTRO del contexto vm (un realm distinto al de este test), y
  // deepStrictEqual exige prototipos idénticos, que nunca lo son entre dos
  // realms aunque la forma sea idéntica. Los valores en sí (strings/null)
  // son primitivos y no tienen ese problema.
  t.test("readScheduleSettings: sin document -> ambos campos null, no lanza", function () {
    var s = freshScheduleSandbox();
    var settings = s.readScheduleSettings();
    assert.strictEqual(settings.wakeTime, null);
    assert.strictEqual(settings.sleepTime, null);
  });

  t.test("readScheduleSettings: lee #wakeTime/#sleepTime cuando existen y tienen valor", function () {
    var s = freshScheduleSandbox();
    var elements = {
      wakeTime: { value: "06:30" },
      sleepTime: { value: "22:15" }
    };
    s.document = { getElementById: function (id) { return elements[id] || null; } };
    var settings = s.readScheduleSettings();
    assert.strictEqual(settings.wakeTime, "06:30");
    assert.strictEqual(settings.sleepTime, "22:15");
  });

  t.test("readScheduleSettings: input presente pero vacío (usuario lo borró) -> null, no cadena vacía", function () {
    var s = freshScheduleSandbox();
    var elements = { wakeTime: { value: "" }, sleepTime: { value: "22:15" } };
    s.document = { getElementById: function (id) { return elements[id] || null; } };
    var settings = s.readScheduleSettings();
    assert.strictEqual(settings.wakeTime, null);
    assert.strictEqual(settings.sleepTime, "22:15");
  });

  // ── Integración con la despensa: la hora sobrevive a savePlanForToday ──

  t.test("integración: savePlanForToday conserva meal.time calculado por computeMealSchedule", function () {
    var s = freshPantryScheduleSandbox();
    s.localStorage = createFakeLocalStorage();

    var meals = [meal("breakfast"), meal("lunch"), meal("dinner")];
    var scheduled = s.computeMealSchedule(meals, { wakeTime: "07:00", sleepTime: "22:00" });

    var result = s.savePlanForToday(scheduled, "mercadona");
    assert.strictEqual(result.historySaved, true);

    var expectedByKey = {};
    scheduled.forEach(function (m) { expectedByKey[m.key] = m.time; });

    result.entry.meals.forEach(function (m) {
      assert.strictEqual(m.time, expectedByKey[m.key]);
      assert.ok(/^\d{2}:\d{2}$/.test(m.time));
    });
  });

  t.test("integración: un plan SIN horario (meal.time nunca calculado) se guarda con time:null, no rompe savePlanForToday", function () {
    var s = freshPantryScheduleSandbox();
    s.localStorage = createFakeLocalStorage();

    var meals = [meal("breakfast"), meal("lunch"), meal("dinner")]; // nunca pasa por computeMealSchedule

    var result = s.savePlanForToday(meals, "mercadona");
    assert.strictEqual(result.historySaved, true);
    result.entry.meals.forEach(function (m) { assert.strictEqual(m.time, null); });

    // Y una entrada de historial ya guardada así (plan "viejo") sigue siendo válida al releerla
    var history = s.getPantryHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].meals[0].time, null);
  });
}

module.exports = { run: run };

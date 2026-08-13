/**
 * tests/settings.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/settings.js -- persistencia del perfil/formulario
 * (edad, sexo, peso, ... presupuesto, horario). Mismo patrón defensivo
 * que pantry.js: nunca lanza, sanea campo a campo, cae a memoria sin
 * localStorage. Carga el código de PRODUCCIÓN real (vm, sin copiar).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshSettingsSandbox() {
  return loadBrowserGlobals([projPath("js/core/settings.js")]);
}

/** Mismo patrón de fake localStorage que pantry.test.js. */
function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function run(t) {

  // ── Fallback en memoria (sin localStorage) ──────────────────────────

  t.test("getSettings() devuelve {} cuando nunca se ha guardado nada (fallback en memoria)", function () {
    var s = freshSettingsSandbox();
    assert.strictEqual(Object.keys(s.getSettings()).length, 0);
  });

  t.test("saveSettings()/getSettings() hacen round-trip usando solo el fallback en memoria", function () {
    var s = freshSettingsSandbox();
    s.saveSettings({ age: 28, sex: "male", goal: "bulk" });
    var read = s.getSettings();
    assert.strictEqual(read.age, 28);
    assert.strictEqual(read.sex, "male");
    assert.strictEqual(read.goal, "bulk");
  });

  // ── Round-trip con localStorage real (inyectado) ────────────────────

  t.test("saveSettings()/getSettings() hacen round-trip con TODOS los campos de perfil", function () {
    var s = freshSettingsSandbox();
    s.localStorage = createFakeLocalStorage();

    var full = {
      age: 27, sex: "female", weight: 63.5, height: 168, activity: 1.55,
      workouts: 4, goal: "recomp", budgetMode: "medium", budgetCustom: 22,
      cookTime: 35, taste: "sweet", wakeTime: "07:00", sleepTime: "23:30"
    };
    s.saveSettings(full);
    var read = s.getSettings();

    Object.keys(full).forEach(function (key) {
      assert.strictEqual(read[key], full[key], "campo " + key + " no sobrevivió al round-trip");
    });
  });

  t.test("saveSettings() sella updatedAt como string ISO", function () {
    var s = freshSettingsSandbox();
    s.localStorage = createFakeLocalStorage();
    s.saveSettings({ age: 30 });
    var read = s.getSettings();
    assert.strictEqual(typeof read.updatedAt, "string");
    assert.ok(!isNaN(Date.parse(read.updatedAt)));
  });

  // ── Saneado por campo, nunca por objeto entero ───────────────────────

  t.test("un campo con tipo equivocado se descarta SOLO ese campo, el resto del objeto sobrevive", function () {
    var s = freshSettingsSandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.settings.v1", JSON.stringify({
      age: "veintiocho", // debería ser number -- se descarta
      sex: "male",       // válido -- sobrevive
      weight: 80,        // válido -- sobrevive
      goal: 123           // debería ser string -- se descarta
    }));

    var read = s.getSettings();
    assert.strictEqual(read.age, undefined);
    assert.strictEqual(read.sex, "male");
    assert.strictEqual(read.weight, 80);
    assert.strictEqual(read.goal, undefined);
  });

  t.test("sanitizeSettings() descarta campos desconocidos sin lanzar", function () {
    var s = freshSettingsSandbox();
    var clean = s.sanitizeSettings({ age: 25, evilField: "<script>alert(1)</script>" });
    assert.strictEqual(clean.age, 25);
    assert.strictEqual(clean.evilField, undefined);
  });

  // ── Nunca lanza con datos corruptos / localStorage roto ──────────────

  t.test("getSettings() con JSON corrupto en localStorage devuelve {} sin lanzar", function () {
    var s = freshSettingsSandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.settings.v1", "{ esto no es json");
    assert.strictEqual(Object.keys(s.getSettings()).length, 0);
  });

  t.test("getSettings() con un valor que no es objeto (array/número) devuelve {} sin lanzar", function () {
    var s = freshSettingsSandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.settings.v1", JSON.stringify([1, 2, 3]));
    assert.strictEqual(Object.keys(s.getSettings()).length, 0);
  });

  t.test("saveSettings() no lanza si localStorage.setItem lanza (cuota superada)", function () {
    var s = freshSettingsSandbox();
    s.localStorage = {
      getItem: function () { return null; },
      setItem: function () { throw new Error("QuotaExceededError"); },
      removeItem: function () {}
    };
    var result = s.saveSettings({ age: 25 });
    assert.strictEqual(result, false);
  });

  // ── clearSettings() ──────────────────────────────────────────────────

  t.test("clearSettings() vacía lo guardado -- getSettings() vuelve a devolver {}", function () {
    var s = freshSettingsSandbox();
    s.localStorage = createFakeLocalStorage();
    s.saveSettings({ age: 40, sex: "male" });
    assert.strictEqual(s.getSettings().age, 40);

    s.clearSettings();
    assert.strictEqual(Object.keys(s.getSettings()).length, 0);
  });

  t.test("clearSettings() con solo el fallback en memoria también vacía correctamente", function () {
    var s = freshSettingsSandbox();
    s.saveSettings({ age: 40 });
    s.clearSettings();
    assert.strictEqual(Object.keys(s.getSettings()).length, 0);
  });

}

module.exports = { run: run };

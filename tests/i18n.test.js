/**
 * tests/i18n.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/i18n.js.
 *
 * Lo que de verdad puede salir mal aquí no es "traducir mal" -- eso lo ve
 * una persona -- sino que el mecanismo deje HUECOS: una clave que falta en
 * un idioma y nadie se entera, o un valor corrupto en localStorage que
 * acaba en el atributo `lang` del <html>.
 *
 * `detectLang()` recibe la lista de idiomas del navegador en vez de leer
 * `navigator`, por lo mismo que `resolveTheme()` recibe la respuesta de
 * matchMedia: para que la decisión se pueda probar sin navegador.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshI18nSandbox() {
  return loadBrowserGlobals([projPath("js/core/i18n.js")]);
}

function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function run(t) {

  // ── El idioma elegido ──────────────────────────────────────────────────

  t.test("sin nada guardado el idioma es español", function () {
    var s = freshI18nSandbox();
    assert.strictEqual(s.getLang(), "es");
    assert.strictEqual(s.DEFAULT_LANG, "es");
  });

  t.test("es va PRIMERO en la lista: es el origen, no una traducción más", function () {
    var s = freshI18nSandbox();
    assert.strictEqual(s.LANGS[0], "es");
  });

  t.test("un idioma inventado cae a español y NO llega al atributo lang", function () {
    var s = freshI18nSandbox();
    ["klingon", "zz", "", "EN", "en-US", null, undefined, 7, {}].forEach(function (basura) {
      assert.strictEqual(s.sanitizeLang(basura), "es",
        "deberia rechazar " + JSON.stringify(basura));
    });
  });

  t.test("guarda y devuelve cada idioma admitido", function () {
    var s0 = freshI18nSandbox();
    s0.LANGS.forEach(function (lang) {
      var s = freshI18nSandbox();
      s.localStorage = createFakeLocalStorage();
      assert.strictEqual(s.saveLang(lang), lang);
      assert.strictEqual(s.getLang(), lang);
    });
  });

  t.test("un localStorage que LANZA no rompe nada y recuerda en memoria", function () {
    var s = freshI18nSandbox();
    s.localStorage = {
      getItem: function () { throw new Error("bloqueado"); },
      setItem: function () { throw new Error("bloqueado"); }
    };
    assert.doesNotThrow(function () { s.saveLang("de"); });
    assert.strictEqual(s.getLang(), "de");
  });

  // ── Detección desde el navegador ───────────────────────────────────────

  t.test("detectLang coge la primera que conocemos, ignorando la región", function () {
    var s = freshI18nSandbox();
    assert.strictEqual(s.detectLang(["de-AT", "en-US"]), "de");
    assert.strictEqual(s.detectLang(["en-GB"]), "en");
    assert.strictEqual(s.detectLang(["uk"]), "uk");
  });

  t.test("detectLang salta los idiomas que no tenemos", function () {
    var s = freshI18nSandbox();
    assert.strictEqual(s.detectLang(["ja", "zh-CN", "fr-CA"]), "fr");
  });

  t.test("detectLang cae a español si no conoce ninguno, y con lista vacía", function () {
    var s = freshI18nSandbox();
    assert.strictEqual(s.detectLang(["ja", "zh"]), "es");
    assert.strictEqual(s.detectLang([]), "es");
    assert.strictEqual(s.detectLang(null), "es");
  });

  // ── Buscar la cadena ───────────────────────────────────────────────────

  t.test("t() devuelve la cadena del idioma elegido", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "saludo": "Hola" });
    s.registerI18nTable("en", { "saludo": "Hello" });
    assert.strictEqual(s.t("saludo", "en"), "Hello");
    assert.strictEqual(s.t("saludo", "es"), "Hola");
  });

  t.test("una clave que falta en la traducción cae al ESPAÑOL, no a vacío", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "saludo": "Hola", "despedida": "Adiós" });
    s.registerI18nTable("en", { "saludo": "Hello" });
    assert.strictEqual(s.t("despedida", "en"), "Adiós");
  });

  t.test("una clave que no existe en NINGÚN sitio se devuelve tal cual, para que SE VEA", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "saludo": "Hola" });
    // Cadena vacía sería peor: un hueco en blanco no se nota y esto sí.
    assert.strictEqual(s.t("menu.inventado", "en"), "menu.inventado");
  });

  t.test("t() con un idioma inventado usa el español, no revienta", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "saludo": "Hola" });
    assert.strictEqual(s.t("saludo", "klingon"), "Hola");
  });

  t.test("t() sin idioma usa el guardado", function () {
    var s = freshI18nSandbox();
    s.localStorage = createFakeLocalStorage();
    s.registerI18nTable("es", { "saludo": "Hola" });
    s.registerI18nTable("fr", { "saludo": "Bonjour" });
    s.saveLang("fr");
    assert.strictEqual(s.t("saludo"), "Bonjour");
  });

  // ── Registro de tablas ─────────────────────────────────────────────────

  t.test("registerI18nTable rechaza idiomas desconocidos y valores que no son tabla", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("klingon", { "saludo": "nuqneH" });
    s.registerI18nTable("en", null);
    s.registerI18nTable("en", "no soy una tabla");
    assert.strictEqual(typeof s.I18N_TABLES["klingon"], "undefined");
    assert.strictEqual(typeof s.I18N_TABLES["en"], "undefined");
  });

  // ── Las tablas de verdad, no inventadas ────────────────────────────────
  // Estos cargan js/i18n/*.js REALES. Sin esto los tests de arriba prueban
  // un mecanismo perfecto sobre tablas de mentira.

  function sandboxConTablas(langs) {
    var ficheros = [projPath("js/core/i18n.js")];
    langs.forEach(function (l) { ficheros.push(projPath("js/i18n/" + l + ".js")); });
    return loadBrowserGlobals(ficheros);
  }

  t.test("el español carga y trae cadenas", function () {
    var s = sandboxConTablas(["es"]);
    var claves = Object.keys(s.I18N_TABLES["es"] || {});
    assert.ok(claves.length > 100, "solo " + claves.length + " cadenas en es");
  });

  t.test("NINGUNA traducción deja claves sin cubrir", function () {
    // El repliegue al español existe para que un hueco no se vea en
    // pantalla, no para que nadie lo arregle. Este test es quien lo
    // convierte en trabajo pendiente en vez de en deuda invisible.
    var IDIOMAS_HECHOS = ["en"];
    var s = sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
    var claveEs = Object.keys(s.I18N_TABLES["es"]);
    IDIOMAS_HECHOS.forEach(function (lang) {
      var tabla = s.I18N_TABLES[lang];
      assert.ok(tabla, "no se ha cargado la tabla de " + lang);
      var faltan = claveEs.filter(function (k) { return typeof tabla[k] !== "string"; });
      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(faltan)), [],
        lang + " no traduce " + faltan.length + " claves: " + faltan.slice(0, 6).join(", "));
    });
  });

  /**
   * Claves cuyo ESPAÑOL vive fuera de js/i18n/es.js, a propósito.
   *
   * El resumen legal está en `LEGAL_SUMMARY` (js/data/legal.js) y no se
   * copia aquí: dos copias de un texto legal se separan solas y la que
   * queda vieja es la que el usuario acepta. El renderer pide la
   * traducción y, si no la hay, usa el original.
   */
  var CLAVES_CON_ORIGEN_FUERA = ["ui.legal_resumen_1", "ui.legal_resumen_2", "ui.legal_resumen_3"];

  t.test("una traducción no inventa claves que el español no tiene", function () {
    // Una clave de más es una cadena que ya no se usa y que nadie borra, o
    // una errata en el nombre que hace que la traducción no salga nunca.
    var s = sandboxConTablas(["es", "en"]);
    var claveEs = Object.keys(s.I18N_TABLES["es"]);
    var sobran = Object.keys(s.I18N_TABLES["en"]).filter(function (k) {
      return claveEs.indexOf(k) === -1 && CLAVES_CON_ORIGEN_FUERA.indexOf(k) === -1;
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sobran)), [],
      "en tiene claves que es no: " + sobran.join(", "));
  });

  t.test("las claves con el origen fuera están TODAS traducidas", function () {
    // Estas no las cubre el test de cobertura, porque no están en es.js.
    // Sin este test serían el único hueco que nadie vigila.
    var s = sandboxConTablas(["es", "en"]);
    CLAVES_CON_ORIGEN_FUERA.forEach(function (k) {
      assert.strictEqual(typeof s.I18N_TABLES["en"][k], "string",
        "en no traduce " + k);
    });
  });

  t.test("los EJEMPLOS que el usuario teclea siguen en español dentro de la traducción", function () {
    // Se buscan contra el catálogo español, así que un ejemplo traducido
    // enseñaría a escribir "onion" en un campo donde "onion" no encuentra
    // nada. Lo que NO puede quedarse sin traducir es la frase alrededor:
    // "¿Qué tienes?" sí se traduce, "Arroz blanco cocido" no.
    var s = sandboxConTablas(["es", "en"]);
    var ejemplos = {
      "ui.cebolla_queso_azul_salmon": "cebolla, queso azul, salmón",
      "ui.que_tienes_ej_arroz_blanco_cocido": "Arroz blanco cocido"
    };
    Object.keys(ejemplos).forEach(function (k) {
      assert.ok(s.I18N_TABLES["en"][k].indexOf(ejemplos[k]) !== -1,
        k + ": el ejemplo español tiene que sobrevivir en la traducción, y pone "
        + JSON.stringify(s.I18N_TABLES["en"][k]));
    });
  });

  t.test("la palabra de confirmar el borrado NO se traduce", function () {
    // Quien la compara es código que este trabajo todavía no ha tocado.
    // Traducir la etiqueta sin traducir la comprobación deja la cuenta
    // imposible de borrar: el usuario teclea lo que pone en pantalla y no
    // pasa nada, para siempre.
    var s = sandboxConTablas(["es", "en"]);
    assert.strictEqual(s.I18N_TABLES["en"]["ui.borrar"], s.I18N_TABLES["es"]["ui.borrar"]);
  });

  // ── Declarado no es lo mismo que disponible ────────────────────────────

  t.test("availableLangs solo devuelve los idiomas CON tabla", function () {
    var s = freshI18nSandbox();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.availableLangs())), []);
    s.registerI18nTable("es", { "a": "a" });
    s.registerI18nTable("de", { "a": "a" });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.availableLangs())), ["es", "de"]);
  });

  t.test("un idioma declarado pero SIN traducir no está disponible", function () {
    // Esto no es un detalle: ofrecer "Français" sin tabla guardaba "fr" y
    // dejaba la pantalla igual. Medido en el navegador antes de existir
    // esta comprobación.
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "a": "a" });
    assert.strictEqual(s.LANGS.indexOf("fr") !== -1, true, "fr tiene que estar declarado");
    assert.strictEqual(s.isLangAvailable("fr"), false);
    assert.strictEqual(s.isLangAvailable("es"), true);
  });

  t.test("los idiomas que HOY se sirven están disponibles de verdad", function () {
    var s = sandboxConTablas(["es", "en"]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.availableLangs())), ["es", "en"]);
  });

  t.test("cada idioma admitido tiene nombre en SU propio idioma", function () {
    var s = freshI18nSandbox();
    s.LANGS.forEach(function (lang) {
      assert.strictEqual(typeof s.LANG_NAMES[lang], "string",
        "falta el nombre de " + lang);
      assert.ok(s.LANG_NAMES[lang].length > 0);
    });
  });
}

module.exports = { run: run };

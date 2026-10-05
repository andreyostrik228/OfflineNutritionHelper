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

/**
 * Los idiomas que la aplicación SIRVE hoy, sacados de los ficheros y no de
 * una lista a mano: existe `js/i18n/<idioma>.js`, luego se ofrece en el
 * selector, luego tiene que estar entero. Con una lista a mano, un idioma
 * nuevo entraba en la web sin que ningún test mirara si le faltaba algo.
 */
var IDIOMAS_HECHOS = require("fs").readdirSync(projPath("js/i18n"))
  .map(function (f) { var m = /^([a-z]{2})\.js$/.exec(f); return m && m[1]; })
  .filter(function (l) { return l && l !== "es"; })
  .sort();

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

  // ── Cadenas con huecos: tFormat ────────────────────────────────────────

  t.test("tFormat rellena TODAS las apariciones de un hueco, no solo la primera", function () {
    // `"a {n} b {n}".replace("{n}", 3)` con una cadena solo cambia la
    // primera. Era la trampa de los `.replace` encadenados a mano.
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "x": "{n} de {total}, otra vez {n}" });
    assert.strictEqual(s.tFormat("x", { n: 2, total: 5 }, "es"), "2 de 5, otra vez 2");
  });

  t.test("tFormat deja a la vista un hueco sin valor, y no toca lo que no es hueco", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "x": "Faltan {n} g ({otro}) {} { n }" });
    // Un hueco sin valor se queda tal cual: un fallo tiene que notarse.
    assert.strictEqual(s.tFormat("x", { n: 3 }, "es"), "Faltan 3 g ({otro}) {} { n }");
    // Sin parámetros, la cadena sale igual que t().
    assert.strictEqual(s.tFormat("x", undefined, "es"), s.t("x", "es"));
    // Una clave que no existe se devuelve entera, con sus llaves si las lleva.
    assert.strictEqual(s.tFormat("no.existe", { n: 1 }, "es"), "no.existe");
  });

  t.test("tFormat inserta el valor LITERAL: un \"$&\" no reescribe la frase", function () {
    // Un nombre de producto con "$&" o "$1" no puede interpretarse como patrón
    // de reemplazo. Con `String.prototype.replace` y una cadena de reemplazo
    // sí lo sería.
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "x": "Ver {producto} en Mercadona" });
    assert.strictEqual(s.tFormat("x", { producto: "Oferta $& $1 $$" }, "es"), "Ver Oferta $& $1 $$ en Mercadona");
  });

  t.test("tFormat usa el idioma pedido y repliega al español como t()", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "a": "Hola {n}", "b": "Solo en español {n}" });
    s.registerI18nTable("en", { "a": "Hello {n}" });
    assert.strictEqual(s.tFormat("a", { n: 1 }, "en"), "Hello 1");
    assert.strictEqual(s.tFormat("b", { n: 1 }, "en"), "Solo en español 1");
  });

  // ── Unidades ───────────────────────────────────────────────────────────

  /** Las unidades de verdad: i18n.js más las tablas de cada idioma servido. */
  function sandboxDeUnidades() {
    return sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
  }

  t.test("cada unidad está traducida en cada idioma servido", function () {
    var s = sandboxDeUnidades();
    s.UNIT_CODES.forEach(function (code) {
      ["es"].concat(IDIOMAS_HECHOS).forEach(function (lang) {
        var u = s.tUnit(code, lang);
        assert.ok(u && u !== "unit." + code, lang + ": la unidad «" + code + "» no está en la tabla");
      });
    });
    // El separador de la unidad pegada tiene que existir en TODOS (puede ser "").
    ["es"].concat(IDIOMAS_HECHOS).forEach(function (lang) {
      assert.strictEqual(typeof s.I18N_TABLES[lang]["unit.sep_pegada"], "string", lang + ": falta unit.sep_pegada");
    });
  });

  t.test("las unidades en ruso son rusas y las de español e inglés se quedan como estaban", function () {
    var s = sandboxDeUnidades();
    var ru = {};
    s.UNIT_CODES.forEach(function (code) { ru[code] = s.tUnit(code, "ru"); });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(ru)),
      { kcal: "ккал", g: "г", kg: "кг", min: "мин", ml: "мл", cm: "см" });
    ["es", "en"].forEach(function (lang) {
      s.UNIT_CODES.forEach(function (code) {
        assert.strictEqual(s.tUnit(code, lang), code, lang + " " + code);
      });
    });
  });

  t.test("fmtUnit separa con espacio; fmtUnitJunto conserva la unidad pegada en es y en", function () {
    var s = sandboxDeUnidades();
    assert.strictEqual(s.fmtUnit(840, "g", "es"), "840 g");
    assert.strictEqual(s.fmtUnit(840, "g", "en"), "840 g");
    assert.strictEqual(s.fmtUnit(840, "g", "ru"), "840 г");
    assert.strictEqual(s.fmtUnit(2499, "kcal", "ru"), "2499 ккал");
    // Donde iba pegada ("(500g)") sigue pegada en español e inglés...
    assert.strictEqual(s.fmtUnitJunto(500, "g", "es"), "500g");
    assert.strictEqual(s.fmtUnitJunto(0.25, "kg", "en"), "0.25kg");
    // ...y en ruso se escribe con espacio.
    assert.strictEqual(s.fmtUnitJunto(500, "g", "ru"), "500 г");
  });

  t.test("fmtUnitHtml: número, y pegada detrás la unidad en <span class=\"u\">, sin espacios", function () {
    var s = sandboxDeUnidades();
    assert.strictEqual(s.fmtUnitHtml(2499, "kcal", "ru"), '2499<span class="u">ккал</span>');
    assert.strictEqual(s.fmtUnitHtml(70, "g", "es"), '70<span class="u">g</span>');
    assert.strictEqual(s.fmtUnitHtml(2, "min", "en"), '2<span class="u">min</span>');
    // «Sin ningún carácter de espacio»: ni dentro del span ni entre el número
    // y el span (el hueco lo pone el CSS). `\s` incluye el espacio duro.
    ["es", "en", "ru"].forEach(function (lang) {
      s.UNIT_CODES.forEach(function (code) {
        var h = s.fmtUnitHtml(123, code, lang);
        assert.strictEqual(/\s/.test(h.replace('<span class="u">', "")), false, lang + " " + code + ": hay un espacio en " + JSON.stringify(h));
        assert.ok(/^123<span class="u">[^<>]+<\/span>$/.test(h), lang + " " + code + ": forma inesperada " + h);
      });
    });
  });

  t.test("fmtUnitHtml escapa: el valor y la unidad acaban en innerHTML", function () {
    var s = freshI18nSandbox();
    s.registerI18nTable("es", { "unit.g": "<img src=x onerror=alert(1)>" });
    var h = s.fmtUnitHtml('<b>7</b>', "g", "es");
    assert.strictEqual(h.indexOf("<img"), -1, h);
    assert.strictEqual(h.indexOf("<b>"), -1, h);
    assert.strictEqual(h, '&lt;b&gt;7&lt;/b&gt;<span class="u">&lt;img src=x onerror=alert(1)&gt;</span>');
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

  /** i18n.js con el diccionario de comida de cada idioma servido. */
  function sandboxDeComida() {
    return loadBrowserGlobals([projPath("js/core/i18n.js")].concat(
      IDIOMAS_HECHOS.map(function (l) { return projPath("js/i18n/food-" + l + ".js"); })));
  }

  /** El catálogo de platos, con sus ingredientes. */
  function catalogoDePlatos() {
    var vm = require("vm");
    var c = {}; vm.createContext(c);
    vm.runInContext(require("fs").readFileSync(projPath("js/data/dishes.js"), "utf8"), c);
    return c;
  }

  t.test("tPackageLabel: con formas de CLDR, la que toca según el número", function () {
    // El ruso no tiene UN plural: 1 банка, 2 банки, 5 банок, 21 банка, y
    // la fracción otra vez "банки". Con [singular, plural] salía "5 банки".
    var s = freshI18nSandbox();
    s.registerPackageTable("ru", { "lata": { one: "банка", few: "банки", many: "банок", other: "банки" } });
    var sale = [1, 2, 4, 5, 11, 12, 21, 22, 25, 0.5, 1.5].map(function (n) {
      return n + " " + s.tPackageLabel("lata", n, "ru");
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sale)), [
      "1 банка", "2 банки", "4 банки", "5 банок", "11 банок", "12 банок",
      "21 банка", "22 банки", "25 банок", "0.5 банки", "1.5 банки"]);
    // Si falta la forma que toca, "other"; nunca null ni undefined.
    s.registerPackageTable("ru", { "lata": { one: "банка", other: "банки" } });
    assert.strictEqual(s.tPackageLabel("lata", 5, "ru"), "банки");
    // Y el par de siempre sigue igual.
    s.registerPackageTable("en", { "barra": ["loaf", "loaves"] });
    assert.strictEqual(s.tPackageLabel("barra", 1, "en"), "loaf");
    assert.strictEqual(s.tPackageLabel("barra", 1.5, "en"), "loaves");
  });

  t.test("cada idioma traduce los MISMOS envases que el inglés", function () {
    // El inglés es la referencia: sus etiquetas las vigila tests/servings
    // y el uso de años. Una que falte aquí sale en español ("2 barra")
    // dentro de la lista de la compra traducida, sin ningún error.
    var s = loadBrowserGlobals([projPath("js/core/i18n.js")].concat(
      IDIOMAS_HECHOS.map(function (l) { return projPath("js/i18n/packages-" + l + ".js"); })));
    var ref = Object.keys(s.PACKAGE_TABLES["en"]).sort();
    IDIOMAS_HECHOS.forEach(function (lang) {
      var suyas = Object.keys(s.PACKAGE_TABLES[lang] || {}).sort();
      var faltan = ref.filter(function (k) { return suyas.indexOf(k) === -1; });
      var sobran = suyas.filter(function (k) { return ref.indexOf(k) === -1; });
      assert.deepStrictEqual(faltan.concat(sobran.map(function (k) { return "+" + k; })), [],
        lang + ": envases que faltan (o sobran, con +): " + faltan.concat(sobran).join(", "));
    });
  });

  t.test("cada etiqueta de envase de packaging.js tiene traducción en inglés", function () {
    // El inglés es la referencia de los demás (test de arriba), así que
    // tiene que estar completo contra los DATOS, no contra sí mismo. Se
    // escapó "docena (12 huevos)": la compra de huevos salía en español.
    var s = loadBrowserGlobals([projPath("js/core/i18n.js"), projPath("js/i18n/packages-en.js"),
      projPath("js/data/packaging.js")]);
    var faltan = [];
    function mira(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === "string" && /label/i.test(k)) {
          if (!s.PACKAGE_TABLES["en"][v] && faltan.indexOf(v) === -1) faltan.push(v);
        } else if (v && typeof v === "object") mira(v);
      });
    }
    mira(s.PACKAGING_CATALOGS);
    assert.deepStrictEqual(faltan, [], "sin traducción en packages-en.js: " + faltan.join(", "));
  });

  t.test("cada envase de un idioma de varios plurales trae TODAS sus formas", function () {
    // Una forma que falta cae a "other" en silencio: "5 банки" se lee,
    // pero está mal, y lo ve cualquiera que hable ruso.
    var FORMAS = { ru: ["one", "few", "many", "other"], uk: ["one", "few", "many", "other"],
      pl: ["one", "few", "many", "other"], ro: ["one", "few", "other"] };
    var s = loadBrowserGlobals([projPath("js/core/i18n.js")].concat(
      IDIOMAS_HECHOS.map(function (l) { return projPath("js/i18n/packages-" + l + ".js"); })));
    var malas = [];
    IDIOMAS_HECHOS.forEach(function (lang) {
      var tabla = s.PACKAGE_TABLES[lang] || {};
      Object.keys(tabla).forEach(function (k) {
        var v = tabla[k];
        if (FORMAS[lang]) {
          FORMAS[lang].forEach(function (f) {
            if (!v || typeof v[f] !== "string" || !v[f]) malas.push(lang + " " + k + " sin " + f);
          });
        } else if (Object.prototype.toString.call(v) !== "[object Array]" || !v[0] || !v[1]) {
          malas.push(lang + " " + k + " no es [singular, plural]");
        }
      });
    });
    assert.deepStrictEqual(malas, [], malas.slice(0, 8).join(" | "));
  });

  t.test("el español carga y trae cadenas", function () {
    var s = sandboxConTablas(["es"]);
    var claves = Object.keys(s.I18N_TABLES["es"] || {});
    assert.ok(claves.length > 100, "solo " + claves.length + " cadenas en es");
  });

  t.test("NINGUNA traducción deja claves sin cubrir", function () {
    // El repliegue al español existe para que un hueco no se vea en
    // pantalla, no para que nadie lo arregle. Este test es quien lo
    // convierte en trabajo pendiente en vez de en deuda invisible.
    assert.ok(IDIOMAS_HECHOS.indexOf("en") !== -1, "no se ha encontrado ni el inglés: " + IDIOMAS_HECHOS);
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
   *
   * Los textos del recorrido están en `TOUR_STEPS` (js/data/tour-steps.js)
   * por lo mismo, y además porque ahí viven pegados al comentario que
   * explica por qué cada paso existe: separarlos deja veintidós cadenas
   * huérfanas que nadie sabe si puede tocar.
   *
   * Las del recorrido NO se listan a mano: se derivan de TOUR_STEPS, así
   * que un paso nuevo exige su traducción el día que se añade, en vez de
   * salir en castellano hasta que alguien se dé cuenta.
   */
  function clavesDelRecorrido() {
    var s = loadBrowserGlobals([projPath("js/data/tour-steps.js")]);
    var claves = [];
    (s.TOUR_STEPS || []).forEach(function (paso) {
      claves.push("tour." + paso.id + "_titulo");
      claves.push("tour." + paso.id + "_cuerpo");
    });
    return claves;
  }

  var CLAVES_CON_ORIGEN_FUERA = ["ui.legal_resumen_1", "ui.legal_resumen_2", "ui.legal_resumen_3"]
    .concat(clavesDelRecorrido());

  t.test("cada paso del recorrido aporta sus dos claves de traducción", function () {
    // Si TOUR_STEPS deja de cargar en el sandbox, la lista sale vacía y los
    // dos tests de abajo pasarían sin comprobar nada.
    var claves = clavesDelRecorrido();
    assert.ok(claves.length >= 22,
      "solo " + claves.length + " claves derivadas de TOUR_STEPS");
    assert.strictEqual(claves.length % 2, 0, "cada paso son dos claves");
  });

  t.test("una traducción no inventa claves que el español no tiene", function () {
    // Una clave de más es una cadena que ya no se usa y que nadie borra, o
    // una errata en el nombre que hace que la traducción no salga nunca.
    var s = sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
    var claveEs = Object.keys(s.I18N_TABLES["es"]);
    IDIOMAS_HECHOS.forEach(function (lang) {
      var sobran = Object.keys(s.I18N_TABLES[lang]).filter(function (k) {
        return claveEs.indexOf(k) === -1 && CLAVES_CON_ORIGEN_FUERA.indexOf(k) === -1;
      });
      assert.deepStrictEqual(JSON.parse(JSON.stringify(sobran)), [],
        lang + " tiene claves que es no: " + sobran.join(", "));
    });
  });

  t.test("las claves con el origen fuera están TODAS traducidas", function () {
    // Estas no las cubre el test de cobertura, porque no están en es.js.
    // Sin este test serían el único hueco que nadie vigila.
    var s = sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
    IDIOMAS_HECHOS.forEach(function (lang) {
      CLAVES_CON_ORIGEN_FUERA.forEach(function (k) {
        assert.strictEqual(typeof s.I18N_TABLES[lang][k], "string",
          lang + " no traduce " + k);
      });
    });
  });

  t.test("los EJEMPLOS que el usuario teclea siguen en español dentro de la traducción", function () {
    // Se buscan contra el catálogo español, así que un ejemplo traducido
    // enseñaría a escribir "onion" en un campo donde "onion" no encuentra
    // nada. Lo que NO puede quedarse sin traducir es la frase alrededor:
    // "¿Qué tienes?" sí se traduce, "Arroz blanco cocido" no.
    var s = sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
    var ejemplos = {
      "ui.cebolla_queso_azul_salmon": "cebolla, queso azul, salmón",
      "ui.que_tienes_ej_arroz_blanco_cocido": "Arroz blanco cocido"
    };
    IDIOMAS_HECHOS.forEach(function (lang) {
      Object.keys(ejemplos).forEach(function (k) {
        assert.ok(s.I18N_TABLES[lang][k].indexOf(ejemplos[k]) !== -1,
          lang + " " + k + ": el ejemplo español tiene que sobrevivir en la traducción, y pone "
          + JSON.stringify(s.I18N_TABLES[lang][k]));
      });
    });
  });

  t.test("la palabra de confirmar el borrado NO se traduce", function () {
    // Quien la compara es código que este trabajo todavía no ha tocado.
    // Traducir la etiqueta sin traducir la comprobación deja la cuenta
    // imposible de borrar: el usuario teclea lo que pone en pantalla y no
    // pasa nada, para siempre.
    var s = sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
    IDIOMAS_HECHOS.forEach(function (lang) {
      assert.strictEqual(s.I18N_TABLES[lang]["ui.borrar"], s.I18N_TABLES["es"]["ui.borrar"], lang);
    });
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
    var s = sandboxConTablas(["es"].concat(IDIOMAS_HECHOS));
    var esperados = s.LANGS.filter(function (l) { return l === "es" || IDIOMAS_HECHOS.indexOf(l) !== -1; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.availableLangs())), JSON.parse(JSON.stringify(esperados)));
  });

  t.test("cada idioma servido trae sus cuatro tablas, no solo la interfaz", function () {
    // Sin esto, un ru.js suelto pone "Русский" en el selector con la
    // interfaz traducida y los platos, las raciones y las recetas en
    // español, y ningún test lo ve: todos los repliegues callan.
    var fs = require("fs");
    var faltan = [];
    IDIOMAS_HECHOS.forEach(function (lang) {
      ["food-", "packages-", "steps-"].forEach(function (pre) {
        if (!fs.existsSync(projPath("js/i18n/" + pre + lang + ".js"))) faltan.push(pre + lang + ".js");
      });
    });
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    IDIOMAS_HECHOS.forEach(function (lang) {
      ["", "food-", "packages-", "steps-"].forEach(function (pre) {
        if (html.indexOf('src="js/i18n/' + pre + lang + '.js') === -1) faltan.push("<script> de " + pre + lang + ".js");
      });
    });
    assert.deepStrictEqual(faltan, [], "le falta a algún idioma: " + faltan.join(", "));
  });

  // ── Los nombres de comida ──────────────────────────────────────────────

  t.test("TODOS los ingredientes del catálogo tienen traducción", function () {
    // Sin este test, un ingrediente nuevo entra en el catálogo y aparece en
    // español dentro de una lista en inglés sin que nadie se entere: tFood()
    // devuelve el original y no falla nada.
    var s = sandboxDeComida();
    var c = catalogoDePlatos();

    var ingredientes = {};
    c.DISH_DB.forEach(function (d) {
      (d.items || []).forEach(function (i) { ingredientes[i.name] = 1; });
    });
    IDIOMAS_HECHOS.forEach(function (lang) {
      var faltan = Object.keys(ingredientes).filter(function (n) {
        return typeof s.FOOD_TABLES[lang][n] !== "string";
      }).sort();
      assert.deepStrictEqual(JSON.parse(JSON.stringify(faltan)), [],
        lang + ": " + faltan.length + " ingredientes sin traducir: " + faltan.slice(0, 8).join(" | "));
    });
  });

  t.test("donde el nombre del plato NO se compone, TODOS los platos van enteros", function () {
    // El inglés compone el nombre pieza a pieza (tDish). Los demás no
    // pueden -- en ruso "con arroz" es "с рисом", con la palabra en otro
    // caso -- y llevan cada plato entero en food-<idioma>.js. Sin este
    // test, un plato nuevo del generador sale en español dentro del ruso y
    // no se entera nadie. Con él, el plato nuevo es trabajo pendiente.
    var s = sandboxDeComida();
    var c = catalogoDePlatos();
    IDIOMAS_HECHOS.filter(function (l) { return !s.DISH_COMPOSABLE[l]; }).forEach(function (lang) {
      var faltan = c.DISH_DB.map(function (d) { return d.name; }).filter(function (n) {
        return typeof s.FOOD_TABLES[lang][n] !== "string";
      });
      assert.deepStrictEqual(JSON.parse(JSON.stringify(faltan)), [],
        lang + ": " + faltan.length + " platos sin nombre traducido: " + faltan.slice(0, 6).join(" | "));
    });
  });

  t.test("fuera del inglés tDish NO compone: o el nombre entero o el original", function () {
    // Los conectores de la composición son ingleses. Componer en ruso
    // daba "Курица with рис".
    var s = freshI18nSandbox();
    s.registerDishWords("ru", { "pollo": "курица", "arroz": "рис" });
    assert.strictEqual(s.tDish("Pollo con arroz", "ru"), "Pollo con arroz");
    // La pieza suelta sí: es como llegan las fuentes de proteína a las notas.
    assert.strictEqual(s.tDish("pollo", "ru"), "курица");
    s.registerFoodTable("ru", { "Pollo con arroz": "Курица с рисом" });
    assert.strictEqual(s.tDish("Pollo con arroz", "ru"), "Курица с рисом");
  });

  t.test("las fuentes de proteína de las notas del plan salen traducidas", function () {
    // `mainProt` ("pollo", "legumbre") pasa por tDish como pieza suelta.
    // Sin su entrada, las notas decían "Fuentes de proteína: pollo, atun"
    // en medio de una frase en otro idioma.
    var s = sandboxDeComida();
    var c = catalogoDePlatos();
    var etiquetas = {};
    c.DISH_DB.forEach(function (d) { if (d.mainProt) etiquetas[d.mainProt] = 1; });
    IDIOMAS_HECHOS.forEach(function (lang) {
      // Se mira que haya ENTRADA, no que cambie: "tofu" es "tofu" en inglés.
      var palabras = s.DISH_WORD_TABLES[lang] || {};
      var faltan = Object.keys(etiquetas).filter(function (p) { return typeof palabras[p] !== "string"; });
      assert.deepStrictEqual(JSON.parse(JSON.stringify(faltan)), [],
        lang + ": fuentes de proteína sin traducir: " + faltan.join(", "));
    });
  });

  t.test("tFood devuelve el ORIGINAL cuando no hay traducción, no un hueco", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/i18n.js"), projPath("js/i18n/food-en.js")
    ]);
    // Un nombre inventado: "Aguacate" en español es mejor que nada para
    // quien lee en inglés. Es al revés que t(), donde ver la clave avisa.
    assert.strictEqual(s.tFood("Nombre que no existe", "en"), "Nombre que no existe");
    assert.strictEqual(s.tFood("Aguacate", "en"), "Avocado");
    // En español no se toca nada, ni siquiera se mira la tabla.
    assert.strictEqual(s.tFood("Aguacate", "es"), "Aguacate");
  });

  t.test("tFood aguanta lo que no es un nombre", function () {
    var s = loadBrowserGlobals([projPath("js/core/i18n.js")]);
    assert.strictEqual(s.tFood("", "en"), "");
    assert.strictEqual(s.tFood(null, "en"), null);
    assert.strictEqual(s.tFood(undefined, "en"), undefined);
  });

  t.test("el diccionario de comida SOLO traduce nombres del catálogo de platos", function () {
    // Primero se escribió al revés -- "ningún nombre comercial puede estar
    // en el diccionario" -- y falló, con razón: Mercadona vende productos
    // que se llaman literalmente "Piña", "Fresas" o "Aguacate". El solape
    // es inevitable y no hace daño.
    //
    // La regla de verdad no es QUÉ hay en el diccionario, es DÓNDE se
    // aplica: a los ingredientes y platos sí, a `real-products.js` nunca.
    // Eso lo vigila el test de más abajo sobre el código que pinta.
    //
    // Lo que sí se puede comprobar aquí: que no se haya colado nada que no
    // sea un nombre del catálogo de platos, o sea que el diccionario no
    // crezca por su cuenta con cosas que nadie usa.
    var s = sandboxDeComida();
    var c = catalogoDePlatos();

    var delCatalogo = {};
    c.DISH_DB.forEach(function (d) {
      delCatalogo[d.name] = 1;
      (d.items || []).forEach(function (i) { delCatalogo[i.name] = 1; });
    });
    IDIOMAS_HECHOS.forEach(function (lang) {
      var sobran = Object.keys(s.FOOD_TABLES[lang]).filter(function (n) {
        return !delCatalogo[n];
      });
      assert.deepStrictEqual(JSON.parse(JSON.stringify(sobran)), [],
        lang + ": el diccionario traduce nombres que no están en el catálogo: " + sobran.slice(0, 6).join(" | "));
    });
  });

  t.test("el código que pinta PRODUCTOS no pasa por el diccionario", function () {
    // La lista de la compra y las fichas de producto tienen que decir lo
    // que pone en la estantería. Si alguien envuelve `producto.name` en
    // tFood(), la lista deja de servir para lo único que existe, y no
    // fallaría nada: saldría traducido y con buena pinta.
    var fs = require("fs");
    var sospechosos = [];
    ["js/ui/render-real-products.js", "js/ui/render-shopping-list.js",
     "js/ui/render-no-cook.js"].forEach(function (rel) {
      var src = fs.readFileSync(projPath(rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      // tFood aplicado a algo que se llama producto/product
      var re = /tFood\s*\(\s*[a-zA-Z_$][\w$]*(\.[\w$]+)*/g, m;
      while ((m = re.exec(src))) {
        if (/produc/i.test(m[0])) sospechosos.push(rel + ": " + m[0]);
      }
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sospechosos)), [],
      "nombre comercial pasando por el diccionario: " + sospechosos.join(" | "));
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

/**
 * tests/i18n-render.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lo que la interfaz ESCRIBE en pantalla cuando el idioma no es el español.
 *
 * tests/i18n.test.js vigila las tablas (que no falte ninguna clave). Esto
 * vigila lo contrario: que el código de js/ui y del motor PIDA las claves en
 * vez de escribir español a pelo. Es el fallo de siempre y no da ningún
 * error: "Invitado" o " kcal" salen igual en una pantalla en ruso, y los
 * tests de las tablas pasan porque la clave que nadie pide no falta en
 * ningún sitio.
 *
 * Se mira con el código de PRODUCCIÓN cargado en un sandbox `vm`, sin DOM:
 * donde hace falta un elemento se pasa uno de mentira con lo mínimo.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

/** Los idiomas que se sirven hoy, sacados de los ficheros (como i18n.test.js). */
var IDIOMAS_HECHOS = fs.readdirSync(projPath("js/i18n"))
  .map(function (f) { var m = /^([a-z]{2})\.js$/.exec(f); return m && m[1]; })
  .filter(function (l) { return l && l !== "es"; })
  .sort();

/** i18n.js con las tablas de interfaz de todos los idiomas servidos. */
function archivos(extra) {
  var base = [projPath("js/core/utils.js"), projPath("js/core/i18n.js"), projPath("js/i18n/es.js")]
    .concat(IDIOMAS_HECHOS.map(function (l) { return projPath("js/i18n/" + l + ".js"); }));
  return base.concat((extra || []).map(projPath));
}

var detector = require("../scripts/i18n/detector");
var seedRandomInContext = require("./lib/seed-random").seedRandomInContext;

/**
 * El sandbox COMPLETO: datos, motor, tablas de TODOS los idiomas servidos y
 * los renderers de js/ui que devuelven HTML. Es lo que permite generar un plan
 * de verdad y pintarlo en ruso sin navegador, y por eso es la prueba que más
 * vale de este fichero: un literal español en un renderer sale aquí aunque
 * ninguna prueba de las tablas lo vea.
 */
function sandboxCompleto() {
  var ficheros = [
    "js/data/dishes.js", "js/data/dish-instructions.js", "js/data/real-products.js",
    "js/data/packaging.js", "js/data/servings.js", "js/data/real-ingredient-matches.js",
    "js/data/product-links.js", "js/data/ingredient-nutrition.js", "js/data/no-cook-classifier.js",
    "js/data/serving-sizes.js", "js/data/no-cook-templates.js", "js/data/prices/mercadona.js",
    "js/data/budget-presets.js", "js/data/product-allergens.js",
    "js/core/utils.js", "js/core/i18n.js", "js/i18n/es.js"
  ];
  IDIOMAS_HECHOS.forEach(function (l) {
    ["", "food-", "packages-", "steps-"].forEach(function (pre) { ficheros.push("js/i18n/" + pre + l + ".js"); });
  });
  ficheros = ficheros.concat([
    "js/core/pricing.js", "js/core/servings.js", "js/core/nutrition.js", "js/core/budget.js",
    "js/core/calculator.js", "js/core/meal-helpers.js", "js/core/meal-schedule.js",
    "js/core/allergens.js", "js/data/shelf-life.js", "js/data/product-storage.js",
    "js/core/expiry.js", "js/core/pantry.js",
    "js/engine/dish-selector.js", "js/engine/plan-generator.js", "js/engine/no-cook-generator.js",
    "js/ui/render.js", "js/ui/render-schedule.js", "js/ui/render-shopping-list.js",
    "js/ui/render-insights.js", "js/ui/render-no-cook.js", "js/ui/render-real-products.js",
    "js/ui/render-pantry.js"
  ]);
  var s = loadBrowserGlobals(ficheros.map(projPath));
  // Math.random sembrado: el motor es aleatorio y una prueba no puede serlo.
  seedRandomInContext(s, 12345);
  return s;
}

/** Un día de plan real. `datos` pisa los del perfil de prueba (volumen, 8 €). */
function planReal(s, datos) {
  var perfil = s.calculateProfile({
    age: 28, sex: "male", weight: 78, height: 178, activity: 1.55, workouts: 4, goal: "bulk"
  });
  var d = Object.assign({ budget: 8, cookTime: 35, taste: "sweet", store: "mercadona", planDays: 1 }, datos || {});
  var r = s.generateDietPlan(perfil, d);
  return { profile: perfil, data: d, result: r };
}

/** Un contenedor DOM de mentira que recuerda lo que se le escribe. */
function contenedor() {
  return elementoFalso();
}

/** Texto visible de un trozo de HTML de los renderers, sin nombres de producto. */
function visible(html) { return detector.textoDeHtml(html); }

/** localStorage en memoria. */
function almacenFalso() {
  var datos = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
    setItem: function (k, v) { datos[k] = String(v); },
    removeItem: function (k) { delete datos[k]; }
  };
}

/** Un elemento de mentira con lo que usan los renderers de texto. */
function elementoFalso() {
  var attrs = {};
  return {
    textContent: "",
    innerHTML: "",
    hidden: false,
    classList: { toggle: function () {}, add: function () {}, remove: function () {}, contains: function () { return false; } },
    addEventListener: function () {},
    scrollIntoView: function () {},
    showModal: function () { this.open = true; },
    close: function () { this.open = false; },
    setAttribute: function (k, v) { attrs[k] = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    removeAttribute: function (k) { delete attrs[k]; }
  };
}

function run(t) {

  // ── La etiqueta del botón de perfil ────────────────────────────────────

  t.test("el botón de perfil dice «Guest» / «Гость» en inglés y en ruso, no «Invitado»", function () {
    var s = loadBrowserGlobals(archivos(["js/ui/render-auth.js"]));
    var esperado = { es: "Invitado", en: "Guest", ru: "Гость" };
    Object.keys(esperado).forEach(function (lang) {
      s.saveLang(lang);
      s.authProfileLabel = elementoFalso();
      s.authUserMenu = elementoFalso();
      // Sin cuentas disponibles (isAuthAvailable no existe en el sandbox) =
      // modo invitado, que es lo que ve quien no tiene sesión.
      s.renderProfileButton(null);
      assert.strictEqual(s.authProfileLabel.textContent, esperado[lang], lang);
    });
  });

  t.test("la etiqueta lleva su clave en data-i18n: cambiar de idioma la repinta sola", function () {
    // renderProfileButton solo corre cuando cambia la SESIÓN. Cambiar de
    // idioma no la cambia, así que el texto se quedaba en el idioma de antes.
    // Lo que lo arregla es la clave puesta en `data-i18n`, que
    // applyI18nToDom() relee. Se prueba el contrato: la clave está y apunta a
    // una cadena distinta en cada idioma.
    var s = loadBrowserGlobals(archivos(["js/ui/render-auth.js"]));
    s.authProfileLabel = elementoFalso();
    s.authUserMenu = elementoFalso();
    s.renderProfileButton(null);
    var clave = s.authProfileLabel.getAttribute("data-i18n");
    assert.strictEqual(clave, "ui.invitado");
    assert.notStrictEqual(s.t(clave, "ru"), s.t(clave, "es"));
    assert.notStrictEqual(s.t(clave, "en"), s.t(clave, "es"));
  });

  t.test("el nombre de una persona no se traduce: se quita el data-i18n", function () {
    var s = loadBrowserGlobals(archivos(["js/ui/render-auth.js"]));
    s.isAuthAvailable = function () { return true; };
    s.authProfileLabel = elementoFalso();
    s.authUserMenu = elementoFalso();
    s.authUserEmailEl = elementoFalso();
    s.renderProfileButton(null);                                   // sin sesión: «Iniciar sesión»
    assert.strictEqual(s.authProfileLabel.getAttribute("data-i18n"), "ui.iniciar_sesion");
    s.renderProfileButton({ email: "ana@example.com", user_metadata: { full_name: "Ana" } });
    assert.strictEqual(s.authProfileLabel.textContent, "Ana");
    assert.strictEqual(s.authProfileLabel.getAttribute("data-i18n"), null,
      "con data-i18n, applyI18nToDom() la sustituiría por «Iniciar sesión» al cambiar de idioma");
    s.renderProfileButton({ email: "x@example.com", user_metadata: {} });   // sin nombre: el email
    assert.strictEqual(s.authProfileLabel.textContent, "x@example.com");
    assert.strictEqual(s.authProfileLabel.getAttribute("data-i18n"), null);
  });

  t.test("el diálogo de acceso: contraseña corta, «Borrando…» y errores del servidor salen en el idioma de la pantalla", function () {
    var s = loadBrowserGlobals(archivos(["js/core/auth.js", "js/ui/render-auth.js"]));
    // 8 desde el 2026-10-27 para las cuentas nuevas (AUTH_MIN_PASSWORD).
    var corta = {
      es: "La contraseña necesita al menos 8 caracteres.",
      en: "The password needs at least 8 characters.",
      ru: "В пароле должно быть не меньше 8 символов."
    };
    // Un idioma detrás de otro: el borrado contesta en un microtask y la
    // lengua de la pantalla tiene que seguir siendo la de ese idioma.
    var cadena = Promise.resolve();
    ["es", "en", "ru"].forEach(function (lang) {
      cadena = cadena.then(function () {
        s.saveLang(lang);
        // Crear cuenta con una contraseña de 3 letras: el aviso sale sin ir a la red.
        s.authErrorEl = elementoFalso();
        s.authNoticeEl = elementoFalso();
        s.authEmailInput = { value: "ana@example.com", focus: function () {} };
        s.authPasswordInput = { value: "abc", focus: function () {}, setAttribute: function () {} };
        s._authMode = "register";
        s.handleEmailFormSubmit({ preventDefault: function () {} });
        assert.strictEqual(s.authErrorEl.textContent, corta[lang], lang);

        // Borrar la cuenta: mientras se borra, y si el servidor contesta con un error.
        // Cada idioma teclea SU palabra (BORRAR, DELETE, УДАЛИТЬ), la que sale en pantalla.
        s.authDeleteConfirmInput = { value: s.t("ui.borrar", lang) };
        s.authDeleteConfirmBtn = elementoFalso();
        s.authDeleteErrorEl = elementoFalso();
        s.deleteOwnAccount = function () { return Promise.resolve({ error: { code: "auth/requires-recent-login" } }); };
        s.handleDeleteAccountConfirm();
        assert.strictEqual(s.authDeleteConfirmBtn.textContent, s.t("ui.borrando", lang), lang + ": «Borrando…»");
        return Promise.resolve().then(function () {}).then(function () {}).then(function () {
          assert.strictEqual(s.authDeleteErrorEl.textContent, s.t("ui.auth_sesion_caducada", lang), lang + ": error del borrado");
          assert.strictEqual(s.authDeleteConfirmBtn.textContent, s.t("ui.si_borrar_mi_cuenta", lang), lang);
        });
      });
    });
    return cadena.then(function () { s.saveLang("es"); });
  });

  t.test("las validaciones del cuestionario y del formulario salen en el idioma de la pantalla; en español, igual", function () {
    var s = loadBrowserGlobals(archivos(["js/data/budget-presets.js", "js/core/calculator.js",
      "js/data/onboarding-steps.js", "js/data/legal.js", "js/ui/onboarding-ui.js"]));
    var edad = s.ONBOARDING_STEPS.filter(function (p) { return p.id === "age"; })[0];
    var peso = s.ONBOARDING_STEPS.filter(function (p) { return p.id === "weight"; })[0];
    var malo = { age: 5, weight: 70, height: 170, workouts: 3, budgetMode: "medium" };
    var sinPresupuesto = { age: 30, weight: 70, height: 170, workouts: 3, budgetMode: null };

    s.saveLang("es");
    assert.strictEqual(s._obValidateNumber(edad, "abc"), "Escribe un número.");
    assert.strictEqual(s._obValidateNumber(edad, "5"), "Tiene que estar entre 14 y 90 años.");
    assert.strictEqual(s._obValidateNumber(peso, "5"), "Tiene que estar entre 35 y 250 kg.");
    assert.strictEqual(s.validateInput(malo), "Edad no válida.");
    assert.strictEqual(s.validateInput(sinPresupuesto), "Elige un presupuesto: Ajustado, Equilibrado, Amplio, o introduce una cantidad exacta.");

    var detector2 = detector;
    ["ru", "en"].forEach(function (lang) {
      s.saveLang(lang);
      var base = { age: 30, weight: 70, height: 170, workouts: 3, budgetMode: "medium" };
      var otros = [{ weight: 5 }, { height: 5 }, { workouts: 40 }, { budgetMode: "custom", budgetCustom: 1 }, { budgetMode: "inventado" }]
        .map(function (cambio) { return s.validateInput(Object.assign({}, base, cambio)); });
      otros.forEach(function (m) { assert.ok(m.length > 10, lang + ": mensaje vacío"); });
      assert.strictEqual(new Set(otros).size, 5, lang + ": mensajes repetidos o sin traducir: " + otros.join(" | "));
      var textos = [s._obValidateNumber(edad, "abc"), s._obValidateNumber(edad, "5"), s._obValidateNumber(peso, "5"),
                    s.validateInput(malo), s.validateInput(sinPresupuesto)].concat(otros);
      textos.forEach(function (txt) {
        assert.ok(!/\{[a-z]+\}|\bui\./.test(txt), lang + ": hueco o clave en «" + txt + "»");
        assert.deepStrictEqual(detector2.analizarTexto(txt, lang), [], lang + ": " + txt);
      });
      assert.ok(textos[1].indexOf(s.t("ui.ob_unidad_anos", lang)) !== -1, textos[1]);
      assert.ok(textos[2].indexOf(s.t("unit.kg", lang)) !== -1, textos[2]);
    });
    s.saveLang("es");
  });

  t.test("la fecha de la última revisión del texto legal es la misma en ISO y en castellano", function () {
    var s = loadBrowserGlobals(archivos(["js/data/legal.js"]));
    var d = new Date(s.LEGAL_UPDATED_ISO + "T12:00:00");
    assert.strictEqual(d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }), s.LEGAL_UPDATED_AT);
  });

  // ── Unidades y cifras ──────────────────────────────────────────────────
  //
  // La unidad de una cifra grande va en <span class="u"> detrás del número,
  // sin espacios (el hueco lo pone el CSS), y en el idioma de la pantalla.

  var UNIDAD = {
    es: { kcal: "kcal", g: "g", min: "min" },
    en: { kcal: "kcal", g: "g", min: "min" },
    ru: { kcal: "ккал", g: "г", min: "мин" }
  };

  t.test("renderSummary: la cifra grande lleva <span class=\"u\"> y la línea de debajo es texto", function () {
    var s = sandboxCompleto();
    ["es", "en", "ru"].forEach(function (lang) {
      s.saveLang(lang);
      var els = { calories: contenedor(), caloriesSub: contenedor(), protein: contenedor(), proteinSub: contenedor(),
                  carbs: contenedor(), carbsSub: contenedor(), fats: contenedor(), fatsSub: contenedor() };
      s.initRenderRefs({ mealsContainer: contenedor(), summaryEls: els });
      s.renderSummary({ calories: 3114.4, protein: 148.2, carbs: 472, fats: 70 },
                      { kcal: 3201.2, protein: 137, carbs: 457, fat: 84 });
      var u = UNIDAD[lang];
      assert.strictEqual(els.calories.innerHTML, '3114<span class="u">' + u.kcal + '</span>', lang);
      assert.strictEqual(els.protein.innerHTML, '148<span class="u">' + u.g + '</span>', lang);
      assert.strictEqual(els.carbs.innerHTML, '472<span class="u">' + u.g + '</span>', lang);
      assert.strictEqual(els.fats.innerHTML, '70<span class="u">' + u.g + '</span>', lang);
      // La línea pequeña es una frase: texto con la unidad traducida, no HTML.
      assert.strictEqual(els.caloriesSub.textContent, s.t("ui.plan_real") + " 3201 " + u.kcal, lang);
      assert.strictEqual(els.fatsSub.textContent, s.t("ui.plan_real") + " 84 " + u.g, lang);
      assert.strictEqual(els.caloriesSub.innerHTML, "", "textContent, no innerHTML");
    });
    s.saveLang("es");
  });

  t.test("un plan real pintado: cada cifra de kcal, del pie y de cada ingrediente lleva su <span class=\"u\">", function () {
    var s = sandboxCompleto();
    var p = planReal(s);
    ["es", "en", "ru"].forEach(function (lang) {
      s.saveLang(lang);
      var cont = contenedor();
      s.initRenderRefs({ mealsContainer: cont, summaryEls: {} });
      s.renderDayPlans([{ meals: p.result.meals }]);
      var html = cont.innerHTML;
      var u = UNIDAD[lang];
      var num = '\\d+(?:\\.\\d+)?';

      // .meal-kcal
      var kcalToma = html.match(/<div class="meal-kcal">[^]*?<\/div>/g) || [];
      assert.ok(kcalToma.length >= 3, lang + ": no hay tarjetas");
      kcalToma.forEach(function (d) {
        assert.ok(new RegExp('^<div class="meal-kcal">' + num + '<span class="u">' + u.kcal + '</span></div>$').test(d), lang + ": " + d);
      });
      // .food-right > div:first-child
      var primeros = html.match(/<div class="food-right"><div>[^]*?<\/div>/g) || [];
      assert.ok(primeros.length >= 3, lang + ": no hay filas de ingrediente");
      primeros.forEach(function (d) {
        assert.ok(new RegExp('^<div class="food-right"><div>' + num + '<span class="u">' + u.kcal + '</span></div>$').test(d), lang + ": " + d);
      });
      // .meal-footer strong: tres en gramos, uno en euros, uno en minutos
      var fuertes = html.match(/<div class="meal-footer">[^]*?<\/div><\/div>/g) || [];
      assert.ok(fuertes.length >= 3, lang + ": no hay pies de tarjeta");
      fuertes.forEach(function (pie) {
        var strongs = pie.match(/<strong>[^]*?<\/strong>/g);
        assert.strictEqual(strongs.length, 5, lang + ": " + pie);
        [0, 1, 2].forEach(function (i) {
          assert.ok(new RegExp('^<strong>' + num + '<span class="u">' + u.g + '</span></strong>$').test(strongs[i]), lang + ": " + strongs[i]);
        });
        assert.ok(/^<strong>&euro;[\d.]+<\/strong>$/.test(strongs[3]), lang + ": " + strongs[3]);
        assert.ok(new RegExp('^<strong>\\d+<span class="u">' + u.min + '</span></strong>$').test(strongs[4]), lang + ": " + strongs[4]);
      });
      // Ningún espacio entre el número y el <span>, ni dentro de él.
      assert.strictEqual(/\d\s+<span class="u">/.test(html), false, lang + ": hay un espacio delante de la unidad");
      var unidades = html.match(/<span class="u">[^<]*<\/span>/g) || [];
      assert.ok(unidades.length >= 10, lang + ": faltan cifras con unidad");
      unidades.forEach(function (sp) {
        assert.ok(/^<span class="u">\S+<\/span>$/.test(sp), lang + ": espacio dentro de " + JSON.stringify(sp));
      });
    });
    s.saveLang("es");
  });

  t.test("en ruso un plan real no deja ninguna unidad en latín: ni en las tarjetas ni en la compra", function () {
    var s = sandboxCompleto();
    var p = planReal(s);
    s.saveLang("ru");
    var cont = contenedor();
    s.initRenderRefs({ mealsContainer: cont, summaryEls: {} });
    s.renderDayPlans([{ meals: p.result.meals }]);
    var malos = [];
    function revisa(donde, html) {
      var texto = visible(html);
      var trozos = texto.split(/(?<=[.;·—])\s+|\s{2,}/);
      detector.analizarTexto(texto, "ru").forEach(function (m) {
        if (/unidad/.test(m)) malos.push(donde + ": " + m + "  <-  " + texto.slice(0, 160));
      });
    }
    revisa("tarjetas", cont.innerHTML);

    // La lista de la compra, fila a fila, y su versión en texto plano.
    var items = s.buildShoppingItems(p.result.meals, "mercadona");
    assert.ok(items.length > 3);
    items.forEach(function (e) { revisa("compra", s.renderShoppingRow(e, "mercadona", false)); });
    var plano = s.shoppingListAsText(items, 1);
    if (/\d\s*(g|kg|kcal|ml|min)\b/.test(plano)) malos.push("texto plano: " + plano.slice(0, 200));
    assert.ok(/\d г/.test(plano), "el texto para compartir debe decir «г»: " + plano.slice(0, 200));
    assert.deepStrictEqual(malos, [], malos.slice(0, 4).join("\n"));
    s.saveLang("es");
  });

  t.test("en español el plan pintado dice lo mismo que antes: «500g» pegado donde iba pegado", function () {
    // Español e inglés no cambian ni una coma: las formas pegadas ("(500g)",
    // "2x 400g paquete") siguen pegadas, y las separadas ("120 g") separadas.
    var s = sandboxCompleto();
    ["es", "en"].forEach(function (lang) {
      s.saveLang(lang);
      assert.strictEqual(s.formatQuantityPhrase(120, { type: "spoonable", tablespoonG: 15, teaspoonG: 5 }, "Aceite de oliva", "mercadona"),
        "&asymp; 8 " + s.etiquetaDeRacion("cucharada", 8) + " (120g)", lang);
      assert.strictEqual(s.formatQuantityPhrase(123.4, null, "Ingrediente sin ración", "mercadona"), "123 g", lang);
    });
    s.saveLang("ru");
    assert.strictEqual(s.formatQuantityPhrase(123.4, null, "Ingrediente sin ración", "mercadona"), "123 г");
    assert.ok(/\(120 г\)$/.test(s.formatQuantityPhrase(120, { type: "spoonable", tablespoonG: 15, teaspoonG: 5 }, "Aceite de oliva", "mercadona")));
    s.saveLang("es");
  });

  // ── La despensa y «Mis planes» ─────────────────────────────────────────

  /**
   * Una despensa con de todo: un plan de platos comprado y con una toma
   * cocinada (los envases abiertos llevan fecha ESTIMADA desde la apertura),
   * otro sin cocinar, y un stock con fecha a mano. Devuelve los contenedores
   * ya conectados al render.
   */
  function despensaConDeTodo(s) {
    s.localStorage = almacenFalso();
    s.saveLang("es");
    var p = planReal(s, { budget: 16, taste: "mixed" });
    var guardado = s.savePlanForToday(p.result.meals, "mercadona", { budget: 16, cookTime: 35, taste: "mixed" });
    s.markPurchaseDone(guardado.entry.id, []);
    s.markMealCooked(guardado.entry.id, p.result.meals[0].key, true);
    var sinCocinar = s.generateNoCookPlan("mercadona", { calories: 2100, protein: 120, budget: 14 });
    s.saveNoCookPlanForToday(sinCocinar.slots, "mercadona");
    // Otro día, con un plan de platos sin comprar ni cocinar: es el que lleva
    // «Ya compré todo esto», «¿Te faltó algo?» y el enlace «cambiar».
    var otro = planReal(s, { budget: 16, taste: "mixed" });
    var pendiente = s.savePlanForToday(otro.result.meals, "mercadona", { budget: 16, cookTime: 35, taste: "mixed" }, "2026-10-04");
    s.adjustStock("Arroz blanco cocido", 500);
    s.adjustStock("Leche semidesnatada", 1000);
    s.setExpiry("Arroz blanco cocido", "2026-12-30");

    var c = { lista: contenedor(), vacia: contenedor(), planes: contenedor(), fechas: contenedor(),
              aviso: contenedor(), vacioPlanes: contenedor(), dialogo: contenedor(), cuerpo: contenedor(),
              error: contenedor(), opciones: contenedor() };
    s.initPantryRefs({
      pantryListContainer: c.lista, pantryEmptyEl: c.vacia, pantryAddForm: contenedor(),
      pantryAddNameInput: contenedor(), pantryAddGrams: contenedor(), pantryIngredientOptionsList: c.opciones,
      pantryAddError: c.error, todayPlansPanel: contenedor(), todayPlansContainer: c.planes,
      dateStripEl: c.fechas, plansEmptyNoteEl: c.vacioPlanes, pantryCountEl: contenedor(),
      planSavedNoticeEl: c.aviso, planReplaceDialogEl: c.dialogo, planReplaceBodyEl: c.cuerpo,
      planReplaceFullBtn: contenedor(), planReplaceCancelBtn: contenedor(),
      despensaDialogEl: contenedor(), despensaCloseBtn: contenedor()
    });
    return {
      c: c, p: p, otroDia: "2026-10-04", pendienteId: pendiente.entry.id,
      // La entrada tal como está AHORA en el historial: la que devolvió
      // savePlanForToday es una copia anterior a comprar y cocinar.
      get entry() { return s.getPantryHistory().filter(function (e) { return e.id === guardado.entry.id; })[0]; }
    };
  }

  /** Pinta «Mis planes» con hoy elegido y luego con el otro día; devuelve todo el HTML. */
  function planesDeLosDosDias(s, d) {
    var hoy = s.formatLocalDateKey(new Date());
    s.selectPlanDate(hoy);
    s.renderPantryPanel();
    var html = d.c.planes.innerHTML;
    s.selectPlanDate(d.otroDia);
    s.renderPantryPanel();
    html += d.c.planes.innerHTML;
    s.selectPlanDate(hoy);
    s.renderPantryPanel();
    return html;
  }

  t.test("«Mis planes» y la despensa en español dicen lo de siempre", function () {
    var s = sandboxCompleto();
    var d = despensaConDeTodo(s);
    var planes = planesDeLosDosDias(s, d), lista = d.c.lista.innerHTML;
    var planesTexto = visible(planes);
    // Lo que el dueño vio en ruso mezclado con español: en español sigue igual.
    assert.ok(/¿Te faltó algo\?/.test(planesTexto), planesTexto.slice(0, 400));
    assert.ok(/class="pantry-link-btn"[^>]*>cambiar<\/button>/.test(planes), "el enlace «cambiar»");
    assert.ok(/Ya compraste esto/.test(planesTexto) && /Registrar otra compra/.test(planesTexto));
    assert.ok(/\d+ ingredientes/.test(planesTexto) && /\d+ productos — sin cocinar/.test(planesTexto), planesTexto.slice(0, 500));
    assert.ok(/Comidas/.test(planesTexto) && /Tomas/.test(planesTexto));
    assert.ok(/ya en tu despensa/.test(planesTexto));
    assert.ok(/Borrar<\/button>/.test(planes));
    assert.ok(/>Hoy<\/label>/.test(d.c.fechas.innerHTML));
    assert.ok(/Editar cantidad de Arroz blanco cocido: /.test(lista) && /aria-label="Quitar Arroz blanco cocido"/.test(lista), lista.slice(0, 600));
    assert.ok(/ESTIMADA/.test(lista) && /Caduca el 2026-12-30 \(fecha introducida a mano\)/.test(lista));
    // Y la estimación dice DÓNDE se guarda: «en nevera», como siempre.
    assert.ok(/en (nevera|despensa|congelador)/.test(lista), lista.slice(0, 800));
  });

  t.test("«Mis planes» y la despensa en ruso y en inglés: ni español ni unidades en latín, y los nombres traducidos", function () {
    var s = sandboxCompleto();
    var d = despensaConDeTodo(s);
    ["ru", "en"].forEach(function (lang) {
      s.saveLang(lang);
      s.populatePantryIngredientOptions();
      var planesHtml = planesDeLosDosDias(s, d);
      var malos = [];
      [["planes", planesHtml], ["lista", d.c.lista.innerHTML], ["fechas", d.c.fechas.innerHTML]].forEach(function (par) {
        var texto = visible(par[1]);
        detector.analizarTexto(texto, lang).forEach(function (m) { malos.push(lang + " " + par[0] + ": " + m + "  <-  " + texto.slice(0, 200)); });
      });
      assert.deepStrictEqual(malos, [], malos.slice(0, 3).join("\n"));
    });
    // En ruso, el nombre que se lee es «traducción / original» y la CLAVE sigue en español.
    s.saveLang("ru");
    s.renderPantryPanel();
    var lista = d.c.lista.innerHTML;
    assert.ok(/data-name="Arroz blanco cocido"/.test(lista), "la clave tiene que seguir en español");
    assert.ok(lista.indexOf('pantry-item__name">' + s.tFood("Arroz blanco cocido") + " / Arroz blanco cocido<") !== -1, lista.slice(0, 500));
    s.saveLang("es");
  });

  t.test("la fecha de un plan sale en el idioma de la pantalla (mes incluido)", function () {
    var s = sandboxCompleto();
    var iso = "2026-10-05T17:38:23.000Z";
    s.saveLang("es");
    assert.ok(/oct/.test(s.formatEntryDateTime(iso)), s.formatEntryDateTime(iso));
    s.saveLang("ru");
    var ru = s.formatEntryDateTime(iso);
    assert.ok(/окт/.test(ru), ru);
    assert.ok(!/[a-z]/i.test(ru), "sin letras latinas: " + ru);
    assert.ok(/окт/.test(s.formatDateChipLabel("2026-10-05")), s.formatDateChipLabel("2026-10-05"));
    s.saveLang("en");
    assert.ok(/Oct/.test(s.formatEntryDateTime(iso)), s.formatEntryDateTime(iso));
    s.saveLang("es");
  });

  t.test("el aviso de «plan confirmado» señala en negrita los nombres REALES del botón y de la pestaña", function () {
    var s = sandboxCompleto();
    var d = despensaConDeTodo(s);
    var modos = [["created", undefined], ["draft-updated", undefined], ["active-replaced", undefined], ["created", 3]];
    ["es", "en", "ru"].forEach(function (lang) {
      s.saveLang(lang);
      modos.forEach(function (m) {
        d.c.aviso.innerHTML = "";
        s.renderPlanSavedNotice(d.entry, true, m[0], m[1]);
        var html = d.c.aviso.innerHTML;
        assert.ok(html.length > 40, lang + " " + m[0]);
        assert.ok(!/\{[a-z]+\}/.test(html), lang + " " + m[0] + ": hueco sin rellenar en " + html);
        assert.ok(html.indexOf("<strong>" + s.t("ui.pestana_planes") + "</strong>") !== -1, lang + " " + m[0] + ": falta el nombre de la pestaña en " + html);
        if (m[0] !== "draft-updated") {
          assert.ok(html.indexOf("<strong>" + s.t("ui.planes_ya_compre_todo") + "</strong>") !== -1, lang + " " + m[0] + ": falta el nombre del botón en " + html);
        }
        if (lang !== "es") {
          var motivos = detector.analizarTexto(visible(html), lang);
          assert.deepStrictEqual(motivos, [], lang + " " + m[0] + ": " + motivos.join("; ") + "  <-  " + visible(html));
        }
      });
    });
    // El aviso de «no se pudo guardar» también.
    s.saveLang("ru");
    s.renderPlanSavedNotice(d.entry, false, "created");
    assert.deepStrictEqual(detector.analizarTexto(visible(d.c.aviso.innerHTML), "ru"), []);
    s.saveLang("es");
  });

  t.test("el diálogo «ya tienes un plan activo» sale en el idioma de la pantalla", function () {
    var s = sandboxCompleto();
    var d = despensaConDeTodo(s);
    s.saveLang("ru");
    s.showPlanReplaceDialog(d.entry);
    var texto = visible(d.c.cuerpo.innerHTML);
    assert.ok(!/\{[a-z]+\}/.test(texto), texto);
    assert.deepStrictEqual(detector.analizarTexto(texto, "ru"), [], texto);
    // «Ya cocinaste …»: la primera toma está cocinada.
    assert.ok(/уже приготовили/.test(texto), texto);
    s.saveLang("es");
  });

  t.test("el diálogo de plan activo con un plan sin cocinar: tomas traducidas y «ya comiste», no «ya cocinaste» (2026-10-21)", function () {
    var s = sandboxCompleto();
    var d = despensaConDeTodo(s);
    s.saveLang("ru");
    var entrada = {
      id: "sc1", type: "nocook", createdAt: new Date().toISOString(), purchase: { done: true, runs: [] },
      slots: [
        { key: "breakfast", label: "Desayuno", consumed: true, items: [] },
        { key: "lunch", label: "Comida", consumed: false, items: [] }
      ]
    };
    s.showPlanReplaceDialog(entrada);
    var texto = visible(d.c.cuerpo.innerHTML);
    assert.ok(/уже съели/.test(texto), texto);
    assert.ok(texto.indexOf("Desayuno") === -1 && texto.indexOf("Comida") === -1, "las tomas en ruso: " + texto);
    assert.deepStrictEqual(detector.analizarTexto(texto, "ru"), [], texto);
    s.saveLang("es");
  });

  t.test("la despensa pinta lo comprado sin cocinar: nombre, cantidad con su unidad en ruso y la «x», sin botón de fecha (2026-10-21)", function () {
    var s = sandboxCompleto();
    s.saveLang("ru");
    var fila = s.renderNoCookStockRow({ id: "1234", name: "Pan hot dog Hacendado", quantity: 3, unit: "unidad", expiryDate: null });
    assert.ok(fila.indexOf('data-nocook-id="1234"') !== -1);
    assert.ok(fila.indexOf("Pan hot dog Hacendado") !== -1);
    assert.ok(/3 шт|3 штук/.test(fila), "la unidad en ruso: " + fila);
    assert.ok(fila.indexOf('data-action="remove-nocook"') !== -1);
    assert.strictEqual(fila.indexOf('data-action="expiry"'), -1, "sin fecha no se ofrece «+ fecha»: no hay dónde guardarla");
    var conFecha = s.renderNoCookStockRow({ id: "1", name: "Hummus", quantity: 1, unit: null, expiryDate: "2026-10-24",
      expirySource: "store", expiryDaysLeft: 3, expiryTotalDays: 4, expiryTier: "pronto", storage: "nevera" });
    assert.ok(/<span class="pantry-item__expiry pantry-item__expiry--pronto"/.test(conFecha), "la fecha, de solo lectura: " + conFecha);
    s.saveLang("es");
  });

  t.test("lo que se teclea en el alta de la despensa se entiende en el idioma de la pantalla Y en español", function () {
    var s = sandboxCompleto();
    var d = despensaConDeTodo(s);
    s.saveLang("ru");
    s.populatePantryIngredientOptions();
    var ruso = s.tFood("Arroz blanco cocido");
    assert.notStrictEqual(ruso, "Arroz blanco cocido");
    assert.strictEqual(s.resolveTypedIngredientName(ruso), "Arroz blanco cocido");
    assert.strictEqual(s.resolveTypedIngredientName(ruso.toUpperCase()), "Arroz blanco cocido");
    assert.strictEqual(s.resolveTypedIngredientName("arroz blanco cocido"), "Arroz blanco cocido");
    assert.strictEqual(s.resolveTypedIngredientName("palabra que no existe"), null);
    // Las sugerencias que se ofrecen salen en el idioma de la pantalla: la
    // traducción está, y el nombre español (que es la clave) no.
    var opciones = d.c.opciones.innerHTML;
    assert.ok(opciones.indexOf('value="' + ruso + '"') !== -1, "falta la sugerencia en ruso");
    assert.ok(opciones.indexOf('value="Arroz blanco cocido"') === -1, "sigue ofreciendo el nombre español");
    // Y en español, lo de siempre.
    s.saveLang("es");
    s.populatePantryIngredientOptions();
    assert.ok(d.c.opciones.innerHTML.indexOf('value="Arroz blanco cocido"') !== -1);
  });

  // ── «Sin cocinar» ──────────────────────────────────────────────────────

  /** Pinta un plan «sin cocinar» de verdad (motor sembrado) y devuelve el HTML. */
  function pintaSinCocinar(s, lang, opciones) {
    s.saveLang(lang);
    seedRandomInContext(s, 777);
    var cont = contenedor();
    var estado = contenedor();
    s.initNoCookRefs({ noCookResults: cont, noCookCount: contenedor(), noCookStatus: estado });
    s.runNoCookGenerator("mercadona", opciones || { calories: 2100, protein: 120, budget: 14 });
    return { html: cont.innerHTML, estado: estado.textContent };
  }

  /** El resumen del día con TODAS sus ramas (se pasa, proteína corta, 3 tomas). */
  function planConAvisos(priority, conPresupuesto) {
    return {
      total: { kcal: 2100.4, protein: 80.2 }, target: { kcal: 2200, protein: 120 },
      shoppingCost: 12.5, budget: conPresupuesto ? 14 : 0, productCount: 7, consumedCost: 8.25,
      threeMealDay: true, budgetOverrun: 2.5, priority: priority, slots: []
    };
  }

  t.test("«sin cocinar» de 3 días: una diapositiva por día con «День N из 3», y «Cambiar» sabe su día (2026-10-21)", function () {
    var s = sandboxCompleto();
    s.saveLang("ru");
    seedRandomInContext(s, 31);
    var cont = contenedor();
    s.initNoCookRefs({ noCookResults: cont, noCookCount: contenedor(), noCookStatus: contenedor() });
    s.runNoCookGenerator("mercadona", { calories: 2100, protein: 120, budget: 14 }, 3);
    var html = cont.innerHTML;
    assert.strictEqual(html.split('<section class="day-slide"').length - 1, 3, "tres días");
    assert.ok(html.indexOf("День 3") !== -1 && html.indexOf("из 3") !== -1, "la cabecera de cada día");
    assert.ok(/data-action="swap-nocook-slot"[^]*?data-day="2"/.test(html), "las tomas del día 3 llevan su día");
    assert.strictEqual(s.lastNoCookDays.length, 3);
    assert.strictEqual(s.lastNoCookPlan, s.lastNoCookDays[0], "«Confirmar» sigue con el día 1, que es hoy");
    // Con un día, como siempre: sin diapositivas.
    s.runNoCookGenerator("mercadona", { calories: 2100, protein: 120, budget: 14 }, 1);
    assert.strictEqual(cont.innerHTML.indexOf("day-slide"), -1);
    assert.ok(cont.innerHTML.indexOf('data-day="0"') !== -1);
  });

  t.test("«sin cocinar»: la compra de 3 días junta cada producto una vez y cuesta lo mismo que los 3 tickets (2026-10-21, 2026-10-27)", function () {
    var s = sandboxCompleto();
    s.saveLang("ru");
    seedRandomInContext(s, 41);
    var dias = s.generateNoCookPlanDays("mercadona", { calories: 2100, protein: 120, budget: 14 }, 3);
    // El día 1 no hereda nada: su ticket es el de sus productos solos. Los
    // demás pagan solo lo que no sobraba de antes (noCookCuentas).
    var uno = s.noCookCompraItems([dias[0]]).reduce(function (a, x) { return a + x.cost; }, 0);
    assert.strictEqual(Math.round(uno * 100) / 100, dias[0].shoppingCost, "día 1");
    var cuentas = s.noCookCuentas(dias);
    dias.forEach(function (plan, i) {
      assert.strictEqual(plan.shoppingCost, cuentas.dias[i].ticket, "día " + (i + 1));
    });
    var items = s.noCookCompraItems(dias);
    var vistos = {};
    items.forEach(function (x) {
      assert.ok(!vistos[x.id], "producto repetido: " + x.name);
      vistos[x.id] = true;
      // Al menos los envases que piden sus raciones; más solo si uno abierto
      // ya no aguanta hasta el día que se vuelve a usar.
      assert.ok(x.packs >= Math.max(1, Math.ceil(x.servings / x.perPack)), x.name);
      assert.strictEqual(x.packs, cuentas.envases[x.id], x.name);
      assert.strictEqual(x.purchase.packagesToBuy, x.packs);
    });
    var junto = items.reduce(function (a, x) { return a + x.cost; }, 0);
    var separado = dias.reduce(function (a, p) { return a + p.shoppingCost; }, 0);
    assert.ok(Math.abs(junto - separado) < 0.02, "juntos " + junto + " frente a " + separado + " por días");

    var panel = contenedor(), lista = contenedor(), resumen = contenedor(), ojo = contenedor();
    s.initNoCookRefs({ noCookResults: contenedor(), noCookShoppingPanel: panel, noCookShoppingList: lista,
      noCookShoppingSummary: resumen, noCookShoppingCount: contenedor(), noCookShoppingEyebrow: ojo });
    s.renderNoCookShoppingList(dias);
    assert.strictEqual(panel.hidden, false);
    assert.strictEqual(lista.innerHTML.split('<li class="shopping-item').length - 1, items.length, "una fila por producto");
    assert.ok(lista.innerHTML.indexOf("Купить: ") !== -1 && lista.innerHTML.indexOf("product-find-btn") !== -1);
    assert.ok(resumen.innerHTML.indexOf("(3 ") !== -1, "el coste lleva los 3 días");
    assert.strictEqual(ojo.getAttribute("data-i18n"), null, "con la cifra dentro, sin data-i18n");
    ["undefined", "NaN", "null"].forEach(function (malo) {
      assert.strictEqual((lista.innerHTML + resumen.innerHTML).indexOf(malo), -1, "aparece «" + malo + "»");
    });
    s.renderNoCookShoppingList([]);
    assert.strictEqual(panel.hidden, true, "sin plan, sin panel");
  });

  t.test("«sin cocinar»: «si no te llenas» dice lo que sobra y se puede comer ESE día, y lo puesto de más lleva su marca (2026-10-27)", function () {
    var s = sandboxCompleto();
    function lote(id, nombre, rol, desde, hasta, sobra) {
      return { id: id, desde: desde, hasta: hasta, sobra: sobra, item: { id: id, name: nombre, role: rol, unit: "porción" } };
    }
    var yogur = lote("1", "Yogur natural Hacendado", "lacteo", 0, 2, 3);
    var pate = lote("2", "Paté de cerdo Hacendado", "untable", 0, 2, 4);
    var galletas = lote("3", "Galletas María Hacendado", "dulce", 2, 2, 5);
    var migas = lote("4", "Picos camperos Hacendado", "carrier", 0, 2, 0.5);
    var pan = lote("5", "Pan de molde Hacendado", "carrier", 1, 2, 6);
    // Primer envase del plan, que el menú abre el día 3: la compra es una
    // sola, así que también se puede comer antes... si abierto aguanta.
    var pina = lote("6", "Piña en su jugo Hacendado rodajas", "fruta", 2, 2, 4);
    pina.primero = true; pina.n = null; pina.ultimo = 2;
    pina.item.unit = "lata"; pina.item.servingsPerPackage = 5; pina.item.servingG = 120;
    var natillas = lote("7", "Natillas de vainilla Hacendado", "lacteo", 2, 2, 2);
    natillas.primero = true; natillas.n = 1; natillas.ultimo = 2;
    ["ru", "en", "es"].forEach(function (lang) {
      s.saveLang(lang);
      var html = s._noCookSobrasHtml([yogur, pate, galletas, migas, pina, natillas], 0);
      var texto = visible(html);
      assert.ok(html.indexOf("nocook-sobras__producto") !== -1, lang + ": " + html);
      assert.ok(texto.indexOf("— 3 ") !== -1, lang + ": las raciones que quedan: " + texto);
      assert.strictEqual(html.indexOf("Paté"), -1, lang + ": la crema sola no se propone");
      assert.strictEqual(html.indexOf("Galletas"), -1, lang + ": lo de otro envase posterior no se ofrece el día 1");
      assert.strictEqual(html.indexOf("Picos"), -1, lang + ": media ración no es nada que comer");
      assert.ok(texto.indexOf("— 480 ") !== -1, lang + ": una lata de 5 raciones se dice en gramos, no «4 latas»: " + texto);
      assert.strictEqual(html.indexOf("Natillas"), -1, lang + ": abiertas el día 1 no llegarían buenas al día 3");
      assert.ok(s._noCookSobrasHtml([natillas], 1).indexOf("Natillas") !== -1, lang + ": el día 2 sí");
      if (lang !== "es") {
        assert.deepStrictEqual(detector.analizarTexto(texto, lang), [], lang + ": " + texto);
        assert.strictEqual(/\d (porci[oó]n|porciones)\b/.test(texto), false, lang + ": unidad en español: " + texto);
      }
      // Con algo donde untarla, la crema sí.
      assert.ok(s._noCookSobrasHtml([pate, pan], 1).indexOf("Paté") !== -1, lang);
      assert.strictEqual(s._noCookSobrasHtml([], 0), "");
      assert.strictEqual(s._noCookSobrasHtml([galletas], 1), "");
    });
    s.saveLang("ru");
    assert.ok(s._noCookSobrasHtml([yogur], 0).indexOf("Если не наелись") !== -1);
    // Una pista, no un inventario: cuatro, lo que más llena primero, y «и ещё N».
    var muchos = [1, 2, 3, 4, 5, 6].map(function (i) {
      var l = lote("m" + i, "Producto " + i, "lacteo", 0, 2, 2);
      l.item.kcal = 100 * i; l.item.servings = 1;
      return l;
    });
    var corta = s._noCookSobrasHtml(muchos, 0);
    assert.ok(visible(corta).indexOf("и ещё 2.") !== -1, visible(corta));
    assert.ok(corta.indexOf("Producto 6") < corta.indexOf("Producto 3"), "lo que más llena, primero");
    assert.strictEqual(corta.indexOf("Producto 2"), -1);
    assert.strictEqual(corta.indexOf("Producto 1"), -1);
    var fila = { id: "1", name: "Yogur natural Hacendado", servings: 3, unit: "porción", level: 0, deSobras: 2, kcal: 300, protein: 9, carbs: 12, fat: 3 };
    assert.ok(s.renderNoCookItem(fila).indexOf("+2 из остатков") !== -1, "la marca de lo puesto de más");
    delete fila.deSobras;
    assert.strictEqual(s.renderNoCookItem(fila).indexOf("nocook-item__sobras"), -1, "sin nada de más, sin marca");
    s.saveLang("es");
    fila.deSobras = 1;
    assert.ok(s.renderNoCookItem(fila).indexOf("+1 de lo que sobra") !== -1);
  });

  t.test("plan con platos: «Если не наелись…» propone solo lo que sobra de la compra y se come tal cual (2026-10-27)", function () {
    var s = sandboxCompleto();
    function lote(nombre, gramos, desde) {
      return { key: s.normalizeIngredientKey(nombre), name: nombre, grams: gramos, desde: desde, ultimo: desde,
        entry: { grams: gramos, displayName: nombre, acquiredAt: "2026-10-27", openedAt: "2026-10-27" } };
    }
    var despensa = { inicio: "2026-10-27", lotes: [
      lote("Yogur griego ligero", 500, 0), lote("Arroz blanco cocido", 2000, 0), lote("Mermelada light", 300, 0)
    ] };
    ["ru", "en", "es"].forEach(function (lang) {
      s.saveLang(lang);
      var html = s._sobrasDelDiaHtml(despensa, 0);
      var texto = visible(html);
      assert.ok(html.indexOf("plan-sobras") !== -1, lang + ": " + html);
      assert.ok(texto.indexOf(s.nombreComida("Yogur griego ligero")) !== -1, lang + ": " + texto);
      assert.strictEqual(texto.indexOf(s.nombreComida("Arroz blanco cocido")), -1, lang + ": el arroz no se come tal cual");
      assert.strictEqual(texto.indexOf(s.nombreComida("Mermelada light")), -1, lang + ": sin pan, la mermelada no");
      if (lang !== "es") assert.deepStrictEqual(detector.analizarTexto(texto, lang), [], lang + ": " + texto);
    });
    s.saveLang("ru");
    var conPan = { inicio: "2026-10-27", lotes: despensa.lotes.concat([lote("Pan integral", 210, 0)]) };
    assert.ok(visible(s._sobrasDelDiaHtml(conPan, 0)).indexOf(s.nombreComida("Mermelada light")) !== -1, "con pan, sí");
    assert.ok(visible(s._sobrasDelDiaHtml(despensa, 0)).indexOf("Если не наелись") !== -1);
    assert.strictEqual(s._sobrasDelDiaHtml(null, 0), "");
    assert.strictEqual(s._sobrasDelDiaHtml({ inicio: "2026-10-27", lotes: [] }, 0), "");
    s.saveLang("es");
  });

  t.test("«No me gusta» en un producto sin cocinar: sale de los 3 días, queda en la lista y lo demás no cambia (2026-10-22)", function () {
    var s = sandboxCompleto();
    var vm = require("vm");
    ["js/data/dislike-groups.js", "js/core/preferences.js"].forEach(function (f) {
      vm.runInContext(fs.readFileSync(projPath(f), "utf8"), s, { filename: f });
    });
    var campo = { value: "" };
    s.document = { getElementById: function (id) { return id === "dislikes" ? campo : null; } };
    s.saveLang("ru");
    seedRandomInContext(s, 77);
    s.initNoCookRefs({ noCookResults: contenedor(), noCookCount: contenedor(), noCookStatus: contenedor() });
    s.runNoCookGenerator("mercadona", { calories: 2100, protein: 120, budget: 14 }, 3);
    var dias = s.lastNoCookDays;
    var it = dias[0].slots[1].items[0];
    function tomasCon(id) {
      var r = [];
      s.lastNoCookDays.forEach(function (plan, d) {
        plan.slots.forEach(function (sl) { if (sl.items.some(function (x) { return String(x.id) === String(id); })) r.push(d + ":" + sl.key); });
      });
      return r;
    }
    var antes = tomasCon(it.id);
    var intactas = [];
    s.lastNoCookDays.forEach(function (plan, d) {
      plan.slots.forEach(function (sl) { if (antes.indexOf(d + ":" + sl.key) === -1) intactas.push(JSON.stringify(sl.items.map(function (x) { return x.id; }))); });
    });
    assert.ok(antes.length, "el producto sale en el plan");
    s.quitarProductoSinCocinar(it.id, it.name);
    assert.deepStrictEqual(tomasCon(it.id), [], "ya no sale en ningún día");
    assert.ok(campo.value.indexOf(it.name.replace(/,/g, " ").replace(/\s+/g, " ").trim()) !== -1, "queda en «no me gusta»: " + campo.value);
    var despues = [];
    s.lastNoCookDays.forEach(function (plan, d) {
      plan.slots.forEach(function (sl) { if (antes.indexOf(d + ":" + sl.key) === -1) despues.push(JSON.stringify(sl.items.map(function (x) { return x.id; }))); });
    });
    assert.deepStrictEqual(despues, intactas, "las tomas sin ese producto no se tocan");
    s.saveLang("es");
  });

  t.test("sin cocinar en ruso con su tabla: «перевод / etiqueta» en tarjetas y compra, y «Не нравится» guarda el nombre en ruso (2026-10-22)", function () {
    var s = sandboxCompleto();
    var vm = require("vm");
    ["js/data/dislike-groups.js", "js/core/preferences.js", "js/i18n/productos-ru.js"].forEach(function (f) {
      vm.runInContext(fs.readFileSync(projPath(f), "utf8"), s, { filename: f });
    });
    var campo = { value: "" };
    s.document = { getElementById: function (id) { return id === "dislikes" ? campo : null; } };
    s.saveLang("ru");
    seedRandomInContext(s, 77);
    var resultados = contenedor(), lista = contenedor();
    s.initNoCookRefs({ noCookResults: resultados, noCookCount: contenedor(), noCookStatus: contenedor(),
      noCookShoppingPanel: contenedor(), noCookShoppingList: lista });
    s.runNoCookGenerator("mercadona", { calories: 2100, protein: 120, budget: 14 }, 2);
    var it = s.lastNoCookDays[0].slots[1].items[0];
    var ru = s.PRODUCT_TABLES.ru[it.name];
    assert.ok(ru, "el producto tiene traducción: " + it.name);
    var doble = s.escapeHtml(ru + " / " + it.name);
    assert.ok(resultados.innerHTML.indexOf(doble) !== -1, "la tarjeta dice «" + ru + " / " + it.name + "»");
    assert.ok(lista.innerHTML.indexOf(doble) !== -1, "y la lista de la compra también");
    assert.ok(lista.innerHTML.indexOf('data-nombre="' + s.escapeHtml(it.name) + '"') !== -1, "el botón lleva la etiqueta como clave");
    s.quitarProductoSinCocinar(it.id, it.name);
    assert.strictEqual(campo.value, ru, "en «no me gusta», tal como se lee");
    s.lastNoCookDays.forEach(function (plan) {
      plan.slots.forEach(function (sl) {
        assert.ok(!sl.items.some(function (x) { return String(x.id) === String(it.id); }), "sigue en el plan");
      });
    });
    s.saveLang("es");
  });

  t.test("los botones «No me gusta» van en las tarjetas y en la compra, y app.js los escucha (en captura en la lista)", function () {
    var s = sandboxCompleto();
    s.saveLang("ru");
    var fila = s.renderFoodRow({ name: "Arroz blanco cocido", grams: 150, kcal: 190, cost: 0.2, protein: 4, carbs: 40, fat: 0.5, nutritionSource: "real" }, "mercadona");
    assert.ok(fila.indexOf('data-action="quitar-ingrediente"') !== -1 && fila.indexOf('data-nombre="Arroz blanco cocido"') !== -1, fila);
    assert.ok(fila.indexOf("Не нравится") !== -1);
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    assert.ok(app.indexOf('mealsContainer.addEventListener("click", handleQuitarIngrediente)') !== -1);
    assert.ok(app.indexOf('shoppingListContainerEl.addEventListener("click", handleQuitarIngrediente, true)') !== -1);
    var lista = fs.readFileSync(projPath("js/ui/render-shopping-list.js"), "utf8");
    assert.ok(lista.indexOf("renderBotonNoMeGusta(entry.name") !== -1);
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var aviso = html.indexOf('<script src="js/ui/aviso-deshacer.js');
    assert.ok(aviso !== -1 && aviso < html.indexOf('<script src="js/app.js'), "el aviso carga antes de app.js");
    s.saveLang("es");
  });

  t.test("«Confirmar plan sin cocinar» está en su lista de la compra y guarda cada día con su fecha (2026-10-21)", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var panel = html.indexOf('id="noCookShoppingPanel"');
    var boton = html.indexOf('id="usePlanTodayNoCookBtn"');
    var fin = html.indexOf("</section>", panel);
    assert.ok(panel !== -1 && panel < boton && boton < fin, "el botón va dentro de #noCookShoppingPanel");
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    assert.ok(app.indexOf("saveNoCookPlanForToday(dias[d].slots, storeForEntry, formatLocalDateKey(fecha))") !== -1);
    var pestanas = fs.readFileSync(projPath("js/ui/pestanas.js"), "utf8");
    assert.ok(pestanas.indexOf('["#noCookShoppingPanel", "compra"]') !== -1, "en la pestaña «Compra»");
  });

  t.test("«sin cocinar» en español dice lo de siempre, y solo la kcal de la toma gana su <span class=\"u\">", function () {
    var s = sandboxCompleto();
    s.saveLang("es");
    var resumen = s.renderNoCookSummary(planConAvisos("balanced", true));
    [
      '<strong>2100 kcal <span class="nocook-summary__target">de 2200</span></strong>',
      '80 g proteína <span class="nocook-summary__target">de 120</span>',
      'La compra son <strong>&euro;12.5</strong> <span class="nocook-summary__target">de 14</span> en 7 productos &middot; hoy te comes &euro;8.25 (el resto queda en la despensa)',
      'Con este presupuesto el plan son <strong>3 tomas</strong> sin snacks: las calorías del día se reparten entre ellas en vez de gastar en picoteo.',
      'Este plan se pasa <strong>&euro;2.5</strong> de tu presupuesto: con menos no salía una comida completa. Prueba a subir el presupuesto, o pon la prioridad en «lo más barato posible».',
      'Este plan se queda en 80 g de proteína, por debajo de tus 120 g. Sin cocinar es un techo real: los productos listos para comer rinden poca proteína por caloría. Para llegar más arriba hace falta cocinar.'
    ].forEach(function (trozo) {
      assert.ok(resumen.indexOf(trozo) !== -1, "falta en el resumen: " + trozo + "\n" + resumen);
    });
    // Con la prioridad en «barato» el consejo es otro, y la proteína añade su coletilla.
    var barato = s.renderNoCookSummary(planConAvisos("cheap", false));
    assert.ok(barato.indexOf("Con este catálogo no se puede bajar más sin dejar una toma coja.") !== -1, barato);
    assert.ok(barato.indexOf("por caloría, y con la prioridad en «lo más barato» baja todavía más. Para llegar") !== -1, barato);
    assert.ok(barato.indexOf("nocook-summary__target\">de 14") === -1, "sin presupuesto no hay «de 14»");

    var p = pintaSinCocinar(s, "es");
    assert.strictEqual(p.estado, "Plan sin cocinar generado.");
    assert.ok(/<span class="nocook-slot__kcal">\d+<span class="u">kcal<\/span><\/span>/.test(p.html), "la kcal de la toma, con su span");
    assert.ok(!/<span class="nocook-slot__kcal">[^<]* kcal/.test(p.html), "la kcal de la toma no puede llevar la unidad suelta");
    ["Envase: ", "Los alérgenos que se muestran vienen de la etiqueta de Mercadona",
     "&#8635; Cambiar", "Cambiar solo esta toma (por ejemplo si un producto no está en tu tienda)", "Contiene:"].forEach(function (frase) {
      assert.ok(p.html.indexOf(frase) !== -1, "falta «" + frase + "» en español");
    });
    // Qué nivel toca depende de los productos que salgan: basta con que haya alguno.
    assert.ok(/Listo para comer|Preparación mínima|Calentar rápido/.test(p.html), "ningún nivel de preparación");
    assert.ok(/&middot; \d+ g<\/span>/.test(p.html) && /P \d+(\.\d)?g \/ C \d+(\.\d)?g \/ G \d+(\.\d)?g/.test(p.html),
      "los gramos y los macros siguen pegados como siempre");
  });

  t.test("«sin cocinar» en ruso y en inglés: ni español ni unidades en latín, y la kcal de la toma con su <span class=\"u\">", function () {
    var s = sandboxCompleto();
    var casos = [{ calories: 2100, protein: 120, budget: 14 },
                 { calories: 2600, protein: 190, budget: 6, priority: "cheap" },
                 { calories: 3000, protein: 100, budget: 30 }];
    ["ru", "en"].forEach(function (lang) {
      casos.forEach(function (opciones, i) {
        var p = pintaSinCocinar(s, lang, opciones);
        var donde = lang + " caso " + i;
        assert.ok(p.html.length > 3000, donde + ": no se pintó el plan");
        assert.ok(!/\{[a-z]+\}/.test(p.html), donde + ": hueco sin rellenar");
        assert.ok(!/\b(ui|html|nocook|unit)\.[a-z_0-9]+/.test(visible(p.html)), donde + ": se ve una clave de traducción");
        var malos = detector.analizarTexto(visible(p.html), lang);
        assert.deepStrictEqual(malos, [], donde + ": " + malos.slice(0, 4).join(" | "));
        // La unidad de consumo ("2 porciones", "1 unidad"…) también va traducida.
        var suelta = /\d(?:\.\d+)? (porci[oó]n|porciones|raci[oó]n|raciones|unidad|unidades|trozos?|tazas?|rebanadas?|puñados?|vasos?|latas?|bolsas?|tarrinas?|huevos?)\b/i.exec(visible(p.html));
        assert.strictEqual(suelta, null, donde + ": unidad de consumo en español: " + (suelta && suelta[0]));
        assert.strictEqual(p.estado, s.t("ui.nocook_plan_generado", lang), donde);
        var u = UNIDAD[lang];
        var kcalToma = p.html.match(/<span class="nocook-slot__kcal">[^]*?<\/span><\/span>/g) || [];
        assert.ok(kcalToma.length >= 3, donde + ": no hay tomas");
        kcalToma.forEach(function (d) {
          assert.ok(new RegExp('^<span class="nocook-slot__kcal">\\d+<span class="u">' + u.kcal + '</span></span>$').test(d), donde + ": " + d);
        });
        assert.strictEqual(/\d\s+<span class="u">/.test(p.html), false, donde + ": espacio delante de la unidad");
      });
    });
    s.saveLang("es");
  });

  t.test("«sin cocinar»: las plantillas, el nivel, la unidad de consumo y los avisos salen en ruso", function () {
    var s = sandboxCompleto();
    var p = pintaSinCocinar(s, "ru", { calories: 2100, protein: 120, budget: 14 });
    // El nombre y el montaje de la plantilla son los de la tabla, no los de la plantilla.
    var plantillas = s.NO_COOK_TEMPLATES.filter(function (tpl) { return p.html.indexOf(">" + s.t("nocook." + tpl.key + "_nombre", "ru") + "<") !== -1; });
    assert.ok(plantillas.length >= 3, "ninguna plantilla salió traducida");
    plantillas.forEach(function (tpl) {
      assert.ok(p.html.indexOf(">" + tpl.label + "<") === -1, "sigue el nombre español " + tpl.label);
      assert.ok(p.html.indexOf(tpl.assembly) === -1, "sigue el montaje en español de " + tpl.key);
    });
    assert.ok(/Содержит:/.test(p.html), "los alérgenos de la etiqueta, en ruso");
    assert.ok(/Показанные аллергены/.test(p.html), "el aviso de alérgenos, en ruso");
    // El resumen con todas sus ramas.
    ["ru", "en"].forEach(function (lang) {
      s.saveLang(lang);
      [planConAvisos("balanced", true), planConAvisos("cheap", false)].forEach(function (plan) {
        var resumen = s.renderNoCookSummary(plan);
        var texto = visible(resumen);
        assert.ok(!/\{[a-z]+\}/.test(resumen), lang + ": hueco sin rellenar en " + resumen);
        assert.deepStrictEqual(detector.analizarTexto(texto, lang), [], lang + ": " + texto);
        assert.ok(texto.indexOf(s.fmtUnit(2100, "kcal", lang)) !== -1, lang + ": " + texto);
        assert.ok(texto.indexOf(s.fmtUnit(80, "g", lang)) !== -1, lang + ": " + texto);
      });
    });
    s.saveLang("es");
  });

  t.test("«sin cocinar»: el aviso de «~ sin verificar» y el botón de cambiar toma salen en el idioma de la pantalla", function () {
    var s = sandboxCompleto();
    ["es", "en", "ru"].forEach(function (lang) {
      var p = pintaSinCocinar(s, lang);
      var plan = s.lastNoCookPlan;
      plan.slots[0].items[0].needsReview = true;
      plan.slots[0].items[0].wholePackage = true;     // la pizza: la toma se acaba el paquete
      plan.slots[0].items[0].policy = "fresh";
      s.paintNoCookDays([plan]);
      var html = s.noCookResults.innerHTML;
      assert.ok(html.indexOf('<span class="nocook-item__whole">' + s.t("ui.nocook_envase_entero", lang) + "</span>") !== -1, lang + ": «envase entero»");
      var marca = '<span class="nutrition-approx">' + s.t("ui.sin_verificar_tilde", lang) + "</span>";
      assert.ok(html.indexOf(marca) !== -1, lang + ": falta la marca explicada en el aviso");
      assert.ok(html.indexOf('title="' + s.t("ui.cambiar_solo_esta_toma_producto_no_en_tu_tienda", lang) + '"') !== -1, lang + ": título del botón");
      assert.ok(html.indexOf("&#8635; " + s.t("ui.cambiar", lang) + "</button>") !== -1, lang + ": texto del botón");
      if (lang !== "es") assert.deepStrictEqual(detector.analizarTexto(visible(html), lang), [], lang);

      // «sin más opciones» cuando no hay otra toma que ofrecer, y vuelve a «Cambiar».
      var boton = { dataset: { slotKey: plan.slots[0].key }, disabled: false, textContent: "", innerHTML: "" };
      var pendiente = null;
      s.setTimeout = function (fn) { pendiente = fn; };
      s.regenerateNoCookSlot = function () { return { error: "sin opciones" }; };
      s.handleSwapNoCookSlot({ target: { closest: function () { return boton; } } });
      assert.strictEqual(boton.textContent, s.t("ui.sin_mas_opciones", lang), lang);
      pendiente();
      assert.strictEqual(boton.innerHTML, "&#8635; " + s.t("ui.cambiar", lang), lang);
    });
    s.saveLang("es");
  });

  t.test("los alérgenos de la etiqueta salen en el idioma de la pantalla; en español, igual que antes", function () {
    var s = sandboxCompleto();
    var id = Object.keys(s.PRODUCT_ALLERGENS).filter(function (k) {
      var e = s.PRODUCT_ALLERGENS[k];
      return e.contains && e.contains.length && e.may && e.may.length;
    })[0];
    assert.ok(id, "ningún producto con «contiene» y «puede contener» en la tabla");
    var info = s.getProductAllergens(id);
    var es = function (claves) { return claves.map(function (k) { return s.EU_ALLERGEN_LABELS[k]; }).join(", "); };
    s.saveLang("es");
    assert.strictEqual(s.formatAllergenSummary(info), "Contiene: " + es(info.contains) + " · Puede contener: " + es(info.may));
    assert.strictEqual(s.renderAllergenLine(id),
      '<div class="nocook-item__allergens"><strong>Contiene:</strong> ' + s.escapeHtml(es(info.contains)) +
      ' · <span class="nocook-item__allergens-may">Puede contener: ' + s.escapeHtml(es(info.may)) + "</span></div>");
    ["ru", "en"].forEach(function (lang) {
      s.saveLang(lang);
      var linea = visible(s.renderAllergenLine(id));
      var resumen = s.formatAllergenSummary(info);
      assert.deepStrictEqual(detector.analizarTexto(linea, lang), [], lang + ": " + linea);
      assert.deepStrictEqual(detector.analizarTexto(resumen, lang), [], lang + ": " + resumen);
      assert.ok(resumen.indexOf(s.t("ui.alergenos_contiene", lang)) === 0, lang + ": " + resumen);
      info.contains.forEach(function (k) {
        assert.ok(resumen.indexOf(s.t("ui.alergeno_" + k, lang)) !== -1, lang + ": falta " + k);
      });
    });
    s.saveLang("es");
  });

  t.test("cada alérgeno y cada unidad de consumo de «sin cocinar» tiene su traducción", function () {
    var s = sandboxCompleto();
    // Las 14 categorías: la clave existe, en español dice lo que dice EU_ALLERGEN_LABELS, y en ruso y en inglés es otra palabra.
    Object.keys(s.EU_ALLERGEN_LABELS).forEach(function (k) {
      assert.strictEqual(s.t("ui.alergeno_" + k, "es"), s.EU_ALLERGEN_LABELS[k], k);
      ["ru", "en"].forEach(function (lang) {
        var tr = s.t("ui.alergeno_" + k, lang);
        assert.notStrictEqual(tr, "ui.alergeno_" + k, lang + " no traduce " + k);
        if (lang === "ru") assert.notStrictEqual(tr, s.EU_ALLERGEN_LABELS[k], k);
      });
    });
    // Toda unidad que el clasificador o las raciones pueden poner en una tarjeta.
    var unidades = [];
    ["js/data/no-cook-classifier.js", "js/data/serving-sizes.js"].forEach(function (f) {
      var re = /unit: "([^"]+)"/g, m;
      var src = fs.readFileSync(projPath(f), "utf8");
      while ((m = re.exec(src))) if (unidades.indexOf(m[1]) === -1) unidades.push(m[1]);
    });
    assert.ok(unidades.length >= 10, "solo " + unidades.length + " unidades leídas de los datos");
    var faltan = [];
    ["en", "ru"].forEach(function (lang) {
      unidades.forEach(function (u) {
        if (s.tPackageLabel(u, 1, lang) === null) faltan.push(lang + " " + u);
      });
    });
    assert.deepStrictEqual(faltan, [], "unidades de consumo sin traducción: " + faltan.join(", "));
    // Y el plural ruso concuerda con el número.
    assert.strictEqual(s.tPackageLabel("porción", 1, "ru"), "порция");
    assert.strictEqual(s.tPackageLabel("porción", 2, "ru"), "порции");
    assert.strictEqual(s.tPackageLabel("porción", 5, "ru"), "порций");
    assert.strictEqual(s.tPackageLabel("unidad", 2, "en"), "units");
  });

  t.test("la animación de las cifras escribe lo mismo que renderSummary: con su <span class=\"u\">", function () {
    // animateSummaryNumbers() reescribía la cifra con `n + " kcal"` en cada
    // frame y al terminar. Con GSAP cargado -- o sea, SIEMPRE en producción --
    // la cifra volvía a "3114 kcal" en inglés y el span desaparecía. Ninguna
    // otra prueba carga GSAP, por eso no se veía.
    var vm = require("vm");
    var fs = require("fs");
    var sandbox = {};
    vm.createContext(sandbox);
    sandbox.gsap = {
      matchMedia: function () { return { add: function (c, fn) { fn({ conditions: { motionOK: true } }); } }; },
      timeline: function () { return { from: function () { return this; } }; },
      from: function () {},
      to: function (obj, v) { obj.val = v.val / 2; v.onUpdate(); obj.val = v.val; v.onUpdate(); v.onComplete(); }
    };
    ["js/core/utils.js", "js/core/i18n.js", "js/i18n/es.js", "js/i18n/ru.js", "js/ui/animations.js"].forEach(function (f) {
      vm.runInContext(fs.readFileSync(projPath(f), "utf8"), sandbox, { filename: f });
    });
    ["es", "ru"].forEach(function (lang) {
      sandbox.saveLang(lang);
      var els = { calories: elementoFalso(), protein: elementoFalso(), carbs: elementoFalso(), fats: elementoFalso() };
      sandbox.summaryEls = els;
      els.calories.closest = els.protein.closest = els.carbs.closest = els.fats.closest = function () { return null; };
      sandbox.animateSummaryNumbers({ calories: 3114.4, protein: 148.2, carbs: 472, fats: 70 }, {});
      var u = UNIDAD[lang];
      assert.strictEqual(els.calories.innerHTML, '3114<span class="u">' + u.kcal + '</span>', lang);
      assert.strictEqual(els.fats.innerHTML, '70<span class="u">' + u.g + '</span>', lang);
    });
  });

  // ── Tomas plegadas (2026-10-28) ────────────────────────────────────────
  // El dueño: la toma que toca ahora, entera; las demás, pequeñas, con una
  // flecha a la derecha que las abre (js/ui/render.js, «Tomas plegadas»).

  /** Pone hora a las tomas: 07:30, 11:00, 14:30, 18:00 y 21:30. */
  function conHorario(tomas) {
    var horas = [450, 660, 870, 1080, 1290];
    tomas.forEach(function (m, i) {
      m.timeMinutes = horas[i % horas.length];
      m.time = ("0" + Math.floor(m.timeMinutes / 60)).slice(-2) + ":" + ("0" + (m.timeMinutes % 60)).slice(-2);
    });
    return tomas;
  }

  /** Ejecuta `fn` con el reloj del sandbox parado a las hh:mm (render.js mira `new Date()`). */
  function aLas(s, hh, mm, fn) {
    var tenia = Object.prototype.hasOwnProperty.call(s, "Date");
    var antes = s.Date;
    s.Date = function () { return new Date(2026, 9, 28, hh, mm); };
    try { return fn(); } finally { if (tenia) s.Date = antes; else delete s.Date; }
  }

  function tarjetasPintadas(html) { return html.match(/<div class="meal-card[^"]*"/g) || []; }

  t.test("tomas plegadas: la que toca es la primera que no ha pasado, con 45 min de gracia", function () {
    var s = sandboxCompleto();
    var tomas = conHorario([{}, {}, {}, {}, {}]);
    assert.strictEqual(s.tomaQueToca(tomas, 6 * 60), 0, "antes del desayuno, el desayuno");
    assert.strictEqual(s.tomaQueToca(tomas, 7 * 60 + 50), 0, "comiéndolo, todavía el desayuno");
    assert.strictEqual(s.tomaQueToca(tomas, 8 * 60 + 20), 1, "pasada la gracia, el tentempié de las 11:00");
    assert.strictEqual(s.tomaQueToca(tomas, 22 * 60 + 10), 4, "la cena, hasta 45 min después");
    assert.strictEqual(s.tomaQueToca(tomas, 22 * 60 + 30), -1, "pasadas todas, ninguna");
    assert.strictEqual(s.tomaQueToca([{}, {}], 600), -1, "sin hora, ninguna");
    assert.strictEqual(s.tomaQueToca([{ timeMinutes: 870 }, { timeMinutes: 450 }], 400), 1, "por la hora, no por el orden");
  });

  t.test("tomas plegadas: hoy la que toca; pasadas todas, la primera de mañana; sin horario, todas abiertas", function () {
    var s = sandboxCompleto();
    function dia() { return { meals: conHorario([{}, {}, {}, {}, {}]) }; }
    assert.deepStrictEqual(Array.from(s.tomasQueSalenAbiertas([dia()], 8 * 60 + 20, "meals")), [1]);
    assert.deepStrictEqual(Array.from(s.tomasQueSalenAbiertas([dia(), dia(), dia()], 8 * 60 + 20, "meals")), [1, -1, -1],
      "los días que vienen, plegados enteros");
    assert.deepStrictEqual(Array.from(s.tomasQueSalenAbiertas([dia(), dia(), dia()], 23 * 60, "meals")), [-1, 0, -1],
      "de noche, el desayuno de mañana");
    assert.deepStrictEqual(Array.from(s.tomasQueSalenAbiertas([dia()], 23 * 60, "meals")), [0],
      "con un solo día, su desayuno: es el siguiente");
    assert.strictEqual(s.tomasQueSalenAbiertas([{ meals: [{}, {}] }], 600, "meals"), null, "sin horario no se pliega nada");
    assert.deepStrictEqual(Array.from(s.tomasQueSalenAbiertas([{ slots: conHorario([{}, {}, {}, {}]) }], 15 * 60 + 20, "slots")), [3],
      "y con las tomas del sin cocinar");
  });

  t.test("tomas plegadas: el plan pintado deja abierta solo la que toca, cada una con su flecha y su cuerpo dentro", function () {
    var s = sandboxCompleto();
    var tomas = conHorario(planReal(s).result.meals);
    assert.ok(tomas.length >= 3, "un plan con varias tomas");
    s.saveLang("ru");
    var cont = contenedor();
    s.initRenderRefs({ mealsContainer: cont, summaryEls: {} });
    aLas(s, 8, 20, function () { s.renderDayPlans([{ meals: tomas }]); });
    var html = cont.innerHTML;
    var tarjetas = tarjetasPintadas(html);
    assert.strictEqual(tarjetas.length, tomas.length);
    assert.strictEqual(tarjetas.filter(function (c) { return c.indexOf("is-plegada") !== -1; }).length, tomas.length - 1,
      "todas plegadas menos una");
    assert.strictEqual(tarjetas[1].indexOf("is-plegada"), -1, "a las 08:20 toca la de las 11:00");
    var flechas = html.match(/<button type="button" class="meal-toggle"[^>]*>/g) || [];
    assert.strictEqual(flechas.length, tomas.length, "una flecha por toma");
    assert.strictEqual(flechas.filter(function (b) { return b.indexOf('aria-expanded="true"') !== -1; }).length, 1);
    flechas.forEach(function (b) {
      var id = b.match(/aria-controls="([^"]+)"/)[1];
      assert.ok(html.indexOf('<div class="meal-body" id="' + id + '">') !== -1, "la flecha apunta a su cuerpo: " + id);
      assert.ok(/aria-label="(Развернуть|Свернуть): [^"]+"/.test(b), "nombre accesible en ruso: " + b);
    });
    // Plegada no es borrada: los ingredientes siguen en la tarjeta (los oculta el CSS).
    assert.strictEqual((html.match(/<div class="meal-items">/g) || []).length, tomas.length);
    s.saveLang("es");
  });

  t.test("tomas plegadas: lo que abre el usuario se recuerda al repintar el mismo plan; un plan nuevo empieza de cero", function () {
    var s = sandboxCompleto();
    var dias = [{ meals: conHorario(planReal(s).result.meals) }];
    var cont = contenedor();
    s.initRenderRefs({ mealsContainer: cont, summaryEls: {} });
    function desayunoPlegado() { return tarjetasPintadas(cont.innerHTML)[0].indexOf("is-plegada") !== -1; }
    aLas(s, 8, 20, function () { s.renderDayPlans(dias); });
    assert.strictEqual(desayunoPlegado(), true, "el desayuno ya pasó: plegado");
    // El usuario lo abre con la flecha (alTocarToma → tomaAlternar).
    var clave = s.claveDeToma("normal", 0, dias[0].meals[0].key);
    s.tomaAlternar({ classList: { toggle: function () {} }, querySelector: function () { return null; },
      getAttribute: function (k) { return k === "data-toma-clave" ? clave : null; } }, true);
    // «Cambiar» repinta el MISMO plan: el desayuno no se le vuelve a plegar.
    aLas(s, 8, 20, function () { s.renderDayPlans(dias); });
    assert.strictEqual(desayunoPlegado(), false, "repintado, sigue abierto");
    // Un plan nuevo (otros arrays): otra vez solo la que toca.
    aLas(s, 8, 20, function () { s.renderDayPlans([{ meals: dias[0].meals.slice() }]); });
    assert.strictEqual(desayunoPlegado(), true, "en un plan nuevo, plegado otra vez");
  });

  t.test("tomas plegadas: el sin cocinar igual, y sin decir nada la toma sale abierta como siempre", function () {
    var s = sandboxCompleto();
    s.saveLang("uk");
    var toma = { key: "desayuno", label: "Desayuno", items: [], time: "07:30", timeMinutes: 450, total: { kcal: 500 } };
    var plegada = s.renderNoCookSlot(toma, 1, false);
    assert.strictEqual(plegada.indexOf('<div class="nocook-slot is-plegada"'), 0, plegada.slice(0, 80));
    assert.ok(plegada.indexOf('aria-expanded="false"') !== -1 && plegada.indexOf('aria-controls="toma-s-1-desayuno"') !== -1);
    assert.ok(plegada.indexOf('<div class="nocook-slot__body" id="toma-s-1-desayuno">') !== -1, "el cuerpo, con su id");
    assert.ok(/aria-label="Розгорнути: [^"]+"/.test(plegada), "nombre accesible en ucraniano");
    var abierta = s.renderNoCookSlot(toma, 1);
    assert.ok(abierta.indexOf('<div class="nocook-slot"') === 0 && abierta.indexOf('aria-expanded="true"') !== -1);
    s.saveLang("es");
  });

  t.test("tomas plegadas: tocar su chip del horario (o «Далее») abre la toma plegada antes de ir a ella", function () {
    var s = sandboxCompleto();
    var clases = { "is-plegada": true };
    var tarjeta = {
      classList: { contains: function (c) { return !!clases[c]; }, toggle: function (c, on) { clases[c] = on; } },
      querySelector: function () { return null; },
      getAttribute: function (k) { return k === "data-meal-key" ? "comida" : null; },
      scrollIntoView: function () { tarjeta.vista = true; }
    };
    var cont = contenedor();
    cont.querySelectorAll = function () { return [tarjeta]; };
    s.initRenderRefs({ mealsContainer: cont, summaryEls: {} });
    s.scrollToMealCard("comida");
    assert.strictEqual(clases["is-plegada"], false, "abierta");
    assert.strictEqual(tarjeta.vista, true, "y a la vista");
  });

  t.test("tomas plegadas: el CSS esconde el cuerpo de la plegada, y al imprimir sale todo", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8");
    assert.ok(/\.meal-card\.is-plegada \.meal-body,\s*\.nocook-slot\.is-plegada \.nocook-slot__body \{ display: none; \}/.test(css));
    assert.ok(css.indexOf(".meal-toggle {") !== -1, "la flecha tiene su estilo");
    assert.ok(/@media print \{\s*\.meal-card\.is-plegada \.meal-body,\s*\.nocook-slot\.is-plegada \.nocook-slot__body \{ display: block; \}/.test(css),
      "al imprimir, todo abierto");
  });
}

module.exports = { run: run };

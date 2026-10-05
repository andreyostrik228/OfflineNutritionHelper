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
    // En ruso, el nombre que se lee es el traducido y la CLAVE sigue en español.
    s.saveLang("ru");
    s.renderPantryPanel();
    var lista = d.c.lista.innerHTML;
    assert.ok(/data-name="Arroz blanco cocido"/.test(lista), "la clave tiene que seguir en español");
    assert.ok(lista.indexOf('pantry-item__name">' + s.tFood("Arroz blanco cocido") + "<") !== -1, lista.slice(0, 500));
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
      s.paintNoCookPlan(plan);
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
}

module.exports = { run: run };

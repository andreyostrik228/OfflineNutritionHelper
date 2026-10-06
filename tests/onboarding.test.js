/**
 * tests/onboarding.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/onboarding.js -- la máquina de estados de la primera
 * visita. Carga el código de PRODUCCIÓN real (vm, sin copiar), mismo
 * patrón que settings.test.js / pantry.test.js.
 *
 * Lo que de verdad se protege aquí no es "¿guarda un campo?", sino las
 * dos formas de hacerle daño a un usuario con una pantalla de bienvenida:
 *
 *   1. Enseñarle un cuestionario que YA contestó. Le castiga por haber
 *      llegado antes que la función.
 *   2. Dar por aceptadas unas condiciones que NO ha leído -- porque no
 *      existían cuando entró, o porque han cambiado desde entonces.
 *
 * Cada una tiene su bloque de tests más abajo.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/legal.js"),
    projPath("js/data/onboarding-steps.js"),
    projPath("js/data/tour-steps.js"),
    projPath("js/core/onboarding.js"),
    projPath("js/core/settings.js")
  ]);
}

/** Mismo patrón de fake localStorage que settings.test.js. */
/**
 * Los objetos que devuelve el sandbox son de OTRO realm (vm): comparar
 * `{}` del sandbox con `{}` del host falla con "same structure but not
 * reference-equal". Mismo round-trip que usa plan-generator.characterization.
 */
function plain(x) {
  return JSON.parse(JSON.stringify(x));
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

  // ── Persistencia: nunca lanza, sanea, cae a memoria ──────────────────

  t.test("getOnboardingState() devuelve {} en la primera visita", function () {
    var s = freshSandbox();
    assert.deepStrictEqual(plain(Object.keys(s.getOnboardingState())), []);
  });

  t.test("saveOnboardingState() MEZCLA en vez de reemplazar (un paso no borra los anteriores)", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    s.acceptTerms("1.0");
    s.completeIntake();
    var st = s.getOnboardingState();
    assert.strictEqual(st.termsVersion, "1.0", "la aceptación sobrevive al paso siguiente");
    assert.ok(st.intakeDoneAt);
  });

  t.test("un localStorage corrupto no tumba nada: se trata como primera visita", function () {
    var s = freshSandbox();
    var fake = createFakeLocalStorage();
    fake.setItem("nutritionPlanner.onboarding.v1", "{esto no es json");
    s.localStorage = fake;
    assert.deepStrictEqual(plain(s.getOnboardingState()), {});
  });

  t.test("un localStorage que lanza al escribir devuelve false, no una excepción", function () {
    var s = freshSandbox();
    s.localStorage = {
      getItem: function () { return null; },
      setItem: function () { throw new Error("QuotaExceededError"); },
      removeItem: function () {}
    };
    assert.strictEqual(s.acceptTerms("1.0"), false);
  });

  t.test("un accountChoice desconocido se descarta (estado seguro: no ha elegido)", function () {
    var s = freshSandbox();
    var fake = createFakeLocalStorage();
    fake.setItem("nutritionPlanner.onboarding.v1",
      JSON.stringify({ accountChoice: "premium-gold", termsVersion: "1.0" }));
    s.localStorage = fake;
    var st = s.getOnboardingState();
    assert.strictEqual(st.accountChoice, undefined);
    assert.strictEqual(st.termsVersion, "1.0", "el resto del objeto sobrevive");
  });

  t.test("recordAccountChoice() acepta las tres respuestas reales y rechaza el resto", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    ["created", "signed-in", "skipped"].forEach(function (c) {
      assert.strictEqual(s.recordAccountChoice(c), true, c + " debería aceptarse");
    });
    assert.strictEqual(s.recordAccountChoice("maybe"), false);
    assert.strictEqual(s.recordAccountChoice(null), false);
  });

  // ── "Continuar sin cuenta" es una RESPUESTA, no un silencio ──────────
  // Sin distinguirlas, la aplicación no puede saber si volver a ofrecer la
  // cuenta o si el usuario ya dijo que no.

  t.test("saltarse la cuenta queda registrado y no se confunde con no haber contestado", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    assert.strictEqual(s.getOnboardingState().accountChoice, undefined, "todavía no ha contestado");
    s.recordAccountChoice("skipped");
    assert.strictEqual(s.getOnboardingState().accountChoice, "skipped", "ha contestado que no");
  });

  // ── Las condiciones: aceptadas SIEMPRE con su versión ────────────────

  t.test("sin nada guardado hay que pedir las condiciones", function () {
    var s = freshSandbox();
    assert.strictEqual(s.needsTermsAcceptance({}, "1.0"), true);
  });

  t.test("aceptadas en la versión actual, no se vuelve a preguntar", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    s.acceptTerms("1.0");
    assert.strictEqual(s.needsTermsAcceptance(s.getOnboardingState(), "1.0"), false);
  });

  t.test("si el texto cambia de versión, se vuelve a preguntar", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    s.acceptTerms("1.0");
    assert.strictEqual(s.needsTermsAcceptance(s.getOnboardingState(), "2.0"), true);
  });

  // Se compara por DESIGUALDAD, no por "es anterior": si se comparara como
  // número, un estado corrupto con una versión altísima daría las
  // condiciones por aceptadas para siempre.
  t.test("una versión guardada MAYOR que la actual tampoco cuenta como aceptada", function () {
    var s = freshSandbox();
    assert.strictEqual(
      s.needsTermsAcceptance({ termsVersion: "99.0", termsAcceptedAt: "2026-01-01T00:00:00Z" }, "1.0"),
      true);
  });

  t.test("una fecha de aceptación sin versión NO vale como aceptación", function () {
    var s = freshSandbox();
    assert.strictEqual(
      s.needsTermsAcceptance({ termsAcceptedAt: "2026-01-01T00:00:00Z" }, "1.0"), true);
  });

  t.test("acceptTerms() sin versión no guarda nada", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    assert.strictEqual(s.acceptTerms(""), false);
    assert.strictEqual(s.acceptTerms(undefined), false);
    assert.deepStrictEqual(plain(s.getOnboardingState()), {});
  });

  // ── El orden de los pasos ────────────────────────────────────────────

  t.test("primera visita: lo primero es la bienvenida, pase lo que pase", function () {
    var s = freshSandbox();
    assert.strictEqual(s.nextOnboardingStep({}, { currentVersion: "1.0" }), "welcome");
    // ni siquiera teniendo ya perfil y plan se salta: las condiciones
    // bloquean, es lo único que bloquea.
    assert.strictEqual(
      s.nextOnboardingStep({}, { currentVersion: "1.0", hasProfile: true, hasPlan: true }),
      "welcome");
  });

  t.test("aceptadas las condiciones y sin perfil, toca la anécdota", function () {
    var s = freshSandbox();
    var st = { termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z" };
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true }), "intake");
  });

  t.test("el recorrido guiado espera a que haya un plan que señalar", function () {
    var s = freshSandbox();
    var st = {
      termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
      intakeDoneAt: "2026-09-02T00:01:00Z"
    };
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true, hasPlan: false }), "done",
      "sin plan no hay nada que señalar; no se estorba al usuario");
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true, hasPlan: true }), "tour");
  });

  t.test("terminado todo, la aplicación se queda limpia", function () {
    var s = freshSandbox();
    var st = {
      termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
      intakeDoneAt: "2026-09-02T00:01:00Z", tourDoneAt: "2026-09-02T00:02:00Z"
    };
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true, hasPlan: true }), "done");
  });

  // ── EL USUARIO QUE YA EXISTÍA ───────────────────────────────────────
  // Esta pantalla llega a una aplicación que ya tiene usuarios con su
  // perfil guardado (el propio autor, entre otros). Son los dos tests que
  // de verdad importan de todo el archivo.

  t.test("con cuenta, a quien ya tiene perfil NO se le hace repetir la anécdota", function () {
    var s = freshSandbox();
    var st = { termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z" };
    assert.strictEqual(
      s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true, hasProfile: true, hasPlan: false }),
      "done",
      "ya contestó esas preguntas: repetírselas sería castigarle por llegar antes");
  });

  // ── SIN CUENTA se pregunta SIEMPRE (decisión del dueño, 2026-09-02) ──
  // Cambia la regla de arriba a propósito: la bienvenida vuelve en cada
  // visita mientras no haya cuenta, y con ella la anécdota. Es fricción
  // buscada -- "если кто-то не хочет его создавать то пусть постоянно
  // кликает на не создавать аккаунт" -- y por eso está fijada con un test
  // en vez de quedar como un efecto secundario que alguien "arregle".
  t.test("sin cuenta, la bienvenida vuelve aunque ya se contestara todo", function () {
    var s = freshSandbox();
    var todoHecho = {
      termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
      intakeDoneAt: "2026-09-02T00:01:00Z", tourDoneAt: "2026-09-02T00:02:00Z",
      accountChoice: "skipped"
    };
    assert.strictEqual(
      s.nextOnboardingStep(todoHecho, { currentVersion: "1.0", hasAccount: false, hasProfile: true, hasPlan: true }),
      "welcome",
      "sin cuenta se le vuelve a ofrecer, por muchas veces que ya la haya rechazado");
  });

  t.test("crear la cuenta es lo que hace que la bienvenida deje de salir", function () {
    var s = freshSandbox();
    var st = {
      termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
      intakeDoneAt: "2026-09-02T00:01:00Z", tourDoneAt: "2026-09-02T00:02:00Z"
    };
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: false }), "welcome");
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true }), "done",
      "con cuenta, la aplicación se abre limpia: ese es el premio");
  });

  // Y al revés: borrar la cuenta devuelve al usuario al principio, que es
  // lo que el usuario esperaba y no ocurría.
  t.test("borrar la cuenta devuelve la bienvenida", function () {
    var s = freshSandbox();
    var st = {
      termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
      intakeDoneAt: "2026-09-02T00:01:00Z", accountChoice: "created"
    };
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: true }), "done");
    // tras el borrado ya no hay sesión:
    assert.strictEqual(s.nextOnboardingStep(st, { currentVersion: "1.0", hasAccount: false }), "welcome");
  });

  t.test("a quien ya tiene perfil SÍ se le piden las condiciones (son nuevas)", function () {
    var s = freshSandbox();
    assert.strictEqual(
      s.nextOnboardingStep({}, { currentVersion: "1.0", hasProfile: true }),
      "welcome",
      "nadie ha aceptado todavía un texto que no existía; darlo por aceptado " +
      "en silencio es lo contrario de lo que significa un aviso de privacidad");
  });

  // ── Volver a empezar ────────────────────────────────────────────────

  t.test("resetOnboarding() devuelve al estado de primera visita", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();
    s.acceptTerms("1.0");
    s.completeIntake();
    s.completeTour();
    s.resetOnboarding();
    assert.deepStrictEqual(plain(s.getOnboardingState()), {});
    assert.strictEqual(s.nextOnboardingStep(s.getOnboardingState(), { currentVersion: "1.0" }), "welcome");
  });

  // ── El texto legal es coherente consigo mismo ───────────────────────

  t.test("legal.js expone versión, resumen y secciones con contenido", function () {
    var s = freshSandbox();
    assert.strictEqual(typeof s.LEGAL_VERSION, "string");
    assert.ok(s.LEGAL_VERSION.length > 0);
    assert.ok(Array.isArray(s.LEGAL_SUMMARY) && s.LEGAL_SUMMARY.length >= 3,
      "el resumen honesto de cabecera no puede quedarse vacío");
    assert.ok(Array.isArray(s.LEGAL_SECTIONS) && s.LEGAL_SECTIONS.length >= 6);
    s.LEGAL_SECTIONS.forEach(function (sec) {
      assert.ok(typeof sec.title === "string" && sec.title.length > 0);
      assert.ok(Array.isArray(sec.paragraphs) && sec.paragraphs.length > 0,
        "sección sin texto: " + sec.title);
      sec.paragraphs.forEach(function (p) {
        assert.ok(typeof p === "string" && p.length > 0, "párrafo vacío en: " + sec.title);
      });
    });
  });

  // El texto promete cosas concretas sobre alérgenos, precios y datos. Si
  // alguien recorta una de esas secciones, la aplicación deja de avisar de
  // un riesgo real y nadie se entera.
  t.test("las advertencias que no pueden desaparecer siguen ahí", function () {
    var s = freshSandbox();
    var todo = s.LEGAL_SECTIONS.map(function (sec) {
      return sec.title + " " + sec.paragraphs.join(" ");
    }).join(" ").toLowerCase();

    [
      ["no sustituye", "que no reemplaza a un profesional sanitario"],
      ["alérgen", "el aviso de alérgenos"],
      ["etiqueta", "que la etiqueta manda sobre la aplicación"],
      ["orientativ", "que los precios son orientativos"],
      ["mercadona", "de dónde salen los precios"],
      ["navegador", "dónde se guardan los datos sin cuenta"],
      ["firebase", "quién guarda los datos con cuenta"],
      ["borrar", "cómo borrar los datos"]
    ].forEach(function (pair) {
      assert.ok(todo.indexOf(pair[0]) !== -1, "falta " + pair[1] + " (\"" + pair[0] + "\")");
    });
  });

  // Un marcador sin rellenar en un texto legal publicado es peor que no
  // tener la sección: promete un canal de contacto que no existe.
  t.test("no queda ningún marcador de plantilla sin rellenar", function () {
    var s = freshSandbox();
    var todo = s.LEGAL_SECTIONS.map(function (sec) {
      return sec.paragraphs.join(" ");
    }).join(" ");
    assert.strictEqual(todo.indexOf("{{"), -1,
      "hay un marcador {{...}} sin sustituir en el texto legal");
  });

  // ── El asistente contra el formulario REAL ──────────────────────────
  // ONBOARDING_STEPS es una fachada sobre los controles de index.html: no
  // guarda nada por su cuenta, escribe en ellos. Esa es la parte que se
  // pudre sin avisar -- alguien cambia una opción del formulario, el
  // asistente sigue ofreciendo la vieja, y el usuario acaba con un perfil
  // que el motor no entiende. Estos tests leen el HTML de producción.

  function readIndexHtml() {
    return require("fs").readFileSync(projPath("index.html"), "utf8");
  }

  t.test("cada paso del alta apunta a un control que existe en index.html", function () {
    var s = freshSandbox();
    var html = readIndexHtml();
    var faltan = s.ONBOARDING_STEPS.filter(function (step) {
      // Los pasos de META (el idioma) no escriben en el formulario: no
      // son datos del perfil. Ver PASOS_META mas abajo.
      if (!step.field) return false;
      // budgetMode son radios: se identifican por name, no por id.
      if (step.field === "budgetMode") {
        return html.indexOf('name="budgetMode"') === -1;
      }
      return html.indexOf('id="' + step.field + '"') === -1;
    }).map(function (step) { return step.id + " -> " + step.field; });
    assert.deepStrictEqual(plain(faltan), [],
      "el asistente escribiría en un control inexistente: " + faltan.join(", "));
  });

  t.test("cada opción que ofrece el alta es una opción REAL del formulario", function () {
    var s = freshSandbox();
    var html = readIndexHtml();
    var malas = [];
    s.ONBOARDING_STEPS.forEach(function (step) {
      if (step.kind !== "choice") return;
      // Las opciones dinamicas (los idiomas disponibles) no salen del
      // formulario: se piden a availableLangs() al pintar.
      if (step.optionsFrom) return;
      step.options.forEach(function (opt) {
        if (html.indexOf('value="' + opt.value + '"') === -1) {
          malas.push(step.id + ": " + opt.value);
        }
      });
    });
    assert.deepStrictEqual(plain(malas), [],
      "opciones que el formulario no conoce: " + malas.join(", "));
  });

  t.test("los límites numéricos del alta coinciden con los del formulario", function () {
    var s = freshSandbox();
    var html = readIndexHtml();
    var malos = [];
    s.ONBOARDING_STEPS.forEach(function (step) {
      if (step.kind !== "number") return;
      // <input id="age" type="number" min="14" max="90" ...>
      var re = new RegExp('<input[^>]*id="' + step.field + '"[^>]*>');
      var tag = (html.match(re) || [""])[0];
      var min = (tag.match(/min="([\d.]+)"/) || [])[1];
      var max = (tag.match(/max="([\d.]+)"/) || [])[1];
      if (String(step.min) !== min) malos.push(step.id + ": min " + step.min + " vs " + min);
      if (String(step.max) !== max) malos.push(step.id + ": max " + step.max + " vs " + max);
    });
    assert.deepStrictEqual(plain(malos), [],
      "el alta dejaría meter valores que el formulario rechaza: " + malos.join(", "));
  });

  t.test("el alta pregunta lo que el cálculo necesita, y no más", function () {
    var s = freshSandbox();
    var ids = s.ONBOARDING_STEPS.map(function (x) { return x.id; });
    ["sex", "age", "weight", "height", "activity", "goal"].forEach(function (need) {
      assert.ok(ids.indexOf(need) !== -1, "sin " + need + " no se puede calcular nada");
    });
    // El tope subió de 8 a 15 el 2026-09-03: el usuario pidió que se
    // preguntara todo lo que cambia el plan, porque un valor por defecto
    // razonable no es lo mismo que una respuesta (ver la cabecera de
    // onboarding-steps.js). Sigue habiendo tope: el muro de 26 campos era
    // un problema real y no ha dejado de serlo.
    // 16 desde que el idioma es la primera pregunta: sin ella, quien no
    // lee español tiene que atravesar el alta entera a ciegas.
    assert.ok(s.ONBOARDING_STEPS.length <= 16,
      "el muro de 26 campos era el problema; " + s.ONBOARDING_STEPS.length + " pasos ya es demasiado");
  });

  t.test("cada paso tiene una pregunta escrita y una forma conocida", function () {
    var s = freshSandbox();
    s.ONBOARDING_STEPS.forEach(function (step) {
      assert.ok(step.title && step.title.length > 0, "paso sin pregunta: " + step.id);
      assert.ok(["choice", "number", "time", "text"].indexOf(step.kind) !== -1,
        "tipo raro en " + step.id);
      if (step.kind === "choice") {
        // Las que se rellenan al pintar declaran de DONDE salen; exigirles
        // dos opciones escritas obligaria a duplicar aqui la lista de
        // idiomas, que es justo lo que `optionsFrom` evita.
        if (step.optionsFrom) {
          assert.strictEqual(step.optionsFrom, "langs", "origen de opciones desconocido en " + step.id);
        } else {
          assert.ok(step.options && step.options.length >= 2, "elección con menos de 2 opciones: " + step.id);
          step.options.forEach(function (o) {
            assert.ok(o.value && o.label, "opción incompleta en " + step.id);
          });
        }
      } else if (step.kind === "time" || step.kind === "text") {
        // No llevan límites ni opciones: los valida el propio <input> (la
        // hora) o se admite vacío a propósito (el texto libre).
        assert.ok(step.min === undefined && step.max === undefined,
          "un paso de hora/texto no debe traer límites numéricos: " + step.id);
      } else {
        assert.ok(typeof step.min === "number" && typeof step.max === "number",
          "paso numérico sin límites: " + step.id);
        assert.ok(step.min < step.max, "límites al revés en " + step.id);
      }
    });
  });

  // ── Quién pregunta, y qué pregunta ──────────────────────────────────
  // maybeStartTour() consultaba a nextOnboardingStep() para saber si tocaba
  // el recorrido. Dejó de funcionar en silencio el día que se añadió "sin
  // cuenta, la bienvenida sale siempre": esa función pasó a contestar
  // "welcome" a todo el que no tuviera sesión, y el recorrido no volvió a
  // salir. Los tests de aquí abajo seguían verdes porque comprueban la
  // máquina de estados, no quién la llama ni con qué contexto.
  //
  // Se arregló haciendo que pregunte lo único que le importa -- si el
  // recorrido ya se vio -- y este test fija esa separación.
  t.test("saber si toca el recorrido NO depende de tener cuenta", function () {
    var s = freshSandbox();
    var sinVerlo = { termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
                     intakeDoneAt: "2026-09-02T00:01:00Z" };
    var visto = { termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z",
                  intakeDoneAt: "2026-09-02T00:01:00Z", tourDoneAt: "2026-09-02T00:02:00Z" };

    // La condición real que usa js/ui/tour.js: `estado.tourDoneAt`.
    assert.strictEqual(!!sinVerlo.tourDoneAt, false, "no lo ha visto: toca");
    assert.strictEqual(!!visto.tourDoneAt, true, "ya lo vio: no toca");

    // Y la trampa que lo rompió: nextOnboardingStep dice "welcome" a un
    // invitado aunque el recorrido esté pendiente. Por eso no sirve para
    // esta pregunta, y queda escrito aquí para que nadie lo vuelva a atar.
    assert.strictEqual(
      s.nextOnboardingStep(sinVerlo, { currentVersion: "1.0", hasAccount: false, hasPlan: true }),
      "welcome",
      "sigue contestando 'welcome' a un invitado: por eso el recorrido no puede colgar de aquí");
  });

  // ── El recorrido guiado (rehecho el 2026-10-08) ─────────────────────
  // Ya no señala la página de verdad: es una hoja con una ESCENA animada por
  // paso (js/ui/tour-scenes.js). Lo que se vigila aquí es que los datos
  // (TOUR_STEPS, TOUR_MOCK), las escenas y las traducciones no se separen.

  // Un DOM de mentira, lo justo para montar las escenas y el recorrido en Node.
  function FakeNodo(tag) {
    this.tag = tag;
    this.nodeType = 1;
    this.className = "";
    this.childNodes = [];
    this.children = [];
    this.parentNode = null;
    this.handlers = {};
    this.style = { setProperty: function () {} };
    this.attrs = {};
    this._texto = "";
    this.hidden = false;
    this.open = false;
    var self = this;
    this.classList = {
      add: function (c) { if (!self.classList.contains(c)) self.className = (self.className + " " + c).trim(); },
      remove: function (c) { self.className = self.className.split(" ").filter(function (x) { return x && x !== c; }).join(" "); },
      contains: function (c) { return (" " + self.className + " ").indexOf(" " + c + " ") !== -1; },
      toggle: function (c, on) { if (on === undefined) on = !self.classList.contains(c); if (on) self.classList.add(c); else self.classList.remove(c); }
    };
  }
  FakeNodo.prototype.appendChild = function (h) {
    if (h.parentNode && h.parentNode.removeChild) h.parentNode.removeChild(h);
    h.parentNode = this;
    this.childNodes.push(h);
    if (h.nodeType === 1) this.children.push(h);
    return h;
  };
  FakeNodo.prototype.removeChild = function (h) {
    this.childNodes = this.childNodes.filter(function (x) { return x !== h; });
    this.children = this.children.filter(function (x) { return x !== h; });
    h.parentNode = null;
    return h;
  };
  FakeNodo.prototype.insertBefore = function (h, ref) {
    var i = this.childNodes.indexOf(ref);
    h.parentNode = this;
    if (i === -1) this.childNodes.push(h); else this.childNodes.splice(i, 0, h);
    if (h.nodeType === 1) this.children = this.childNodes.filter(function (x) { return x.nodeType === 1; });
    return h;
  };
  Object.defineProperty(FakeNodo.prototype, "firstChild", { get: function () { return this.childNodes[0] || null; } });
  Object.defineProperty(FakeNodo.prototype, "lastChild", { get: function () { return this.childNodes[this.childNodes.length - 1] || null; } });
  Object.defineProperty(FakeNodo.prototype, "textContent", {
    get: function () { return this._texto + this.childNodes.map(function (n) { return n.textContent; }).join(""); },
    set: function (v) { this._texto = String(v); this.childNodes = []; this.children = []; }
  });
  FakeNodo.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === "class") this.className = String(v); };
  FakeNodo.prototype.removeAttribute = function (k) { delete this.attrs[k]; if (k === "open") this.open = false; };
  FakeNodo.prototype.addEventListener = function (tipo, fn) { (this.handlers[tipo] = this.handlers[tipo] || []).push(fn); };
  FakeNodo.prototype.focus = function () {};
  FakeNodo.prototype.closest = function () { return null; };
  FakeNodo.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40 }; };
  FakeNodo.prototype.querySelector = function (sel) {
    var clase = sel.charAt(0) === "." ? sel.slice(1) : null;
    var pila = this.children.slice();
    while (pila.length) {
      var n = pila.shift();
      if (clase && n.classList.contains(clase)) return n;
      pila = pila.concat(n.children);
    }
    return null;
  };
  FakeNodo.prototype.showModal = function () { this.open = true; };
  FakeNodo.prototype.close = function () { this.open = false; };
  FakeNodo.prototype.click = function () { this.disparar("click"); };
  FakeNodo.prototype.disparar = function (tipo, ev) {
    var e = ev || {};
    if (!e.preventDefault) e.preventDefault = function () {};
    (this.handlers[tipo] || []).forEach(function (fn) { fn(e); });
  };
  Object.defineProperty(FakeNodo.prototype, "innerHTML", { set: function (v) { this._html = v; this.childNodes = []; this.children = []; }, get: function () { return this._html || ""; } });

  function entornoTour(opciones) {
    opciones = opciones || {};
    var fs = require("fs");
    var vm = require("vm");
    var temporizadores = [];
    var teclas = [];
    var cuerpo = new FakeNodo("body");
    var raiz = new FakeNodo("html");
    var doc = {
      body: cuerpo,
      documentElement: raiz,
      createElement: function (tag) { return new FakeNodo(tag); },
      createElementNS: function (ns, tag) { return new FakeNodo(tag); },
      createTextNode: function (txt) { var n = new FakeNodo("#text"); n.nodeType = 3; n._texto = txt; return n; },
      addEventListener: function (tipo, fn) { if (tipo === "keydown") teclas.push(fn); },
      getElementById: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    };
    var win = {
      setTimeout: function (fn) { temporizadores.push(fn); return temporizadores.length; },
      clearTimeout: function () {},
      matchMedia: function () { return { matches: false }; },
      innerWidth: 390, innerHeight: 844
    };
    var pedidas = [];
    var ctx = vm.createContext({ window: win, document: doc, console: console, Date: Date });
    ctx.t = function (clave) { pedidas.push(clave); return clave; };
    [].concat(opciones.sinDatos ? [] : ["js/data/tour-steps.js"], ["js/ui/tour-scenes.js", "js/ui/tour-fx.js", "js/ui/tour.js"]).forEach(function (f) {
      vm.runInContext(fs.readFileSync(projPath(f), "utf8"), ctx, { filename: f });
    });
    var llamadas = { start: 0, completo: 0, opts: null };
    ctx.completeTour = function () { llamadas.completo++; };
    ctx.getOnboardingState = function () { return opciones.estado || {}; };
    function buscar(nodo, clase) {
      if (nodo.classList && nodo.classList.contains(clase)) return nodo;
      for (var i = 0; i < nodo.children.length; i++) {
        var r = buscar(nodo.children[i], clase);
        if (r) return r;
      }
      return null;
    }
    return {
      ctx: ctx, llamadas: llamadas, raiz: raiz, cuerpo: cuerpo, teclas: teclas, pedidas: pedidas,
      buscar: function (clase) { return buscar(cuerpo, clase); },
      correrTemporizadores: function () { var l = temporizadores.splice(0); l.forEach(function (fn) { fn(); }); },
      espiarStartTour: function () { ctx.startTour = function (o) { llamadas.start++; llamadas.opts = o || null; }; }
    };
  }

  t.test("el id de cada escena es una palabra: de él sale la clave de traducción", function () {
    var s = freshSandbox();
    s.TOUR_STEPS.forEach(function (paso) {
      assert.ok(/^[a-z]+$/.test(paso.id), "id con guiones o mayúsculas: " + paso.id);
      assert.ok(paso.title && paso.body, "escena sin texto: " + paso.id);
    });
  });

  t.test("cada escena del recorrido tiene su maqueta, y no sobra ninguna", function () {
    var e = entornoTour();
    var ids = e.ctx.TOUR_STEPS.map(function (p) { return p.id; });
    var escenas = Object.keys(e.ctx.TOUR_SCENES);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(ids.slice().sort())), JSON.parse(JSON.stringify(escenas.slice().sort())),
      "TOUR_STEPS y TOUR_SCENES no coinciden");
  });

  t.test("cada maqueta se monta sin GSAP en su estado final, y todas sus palabras existen en TOUR_MOCK", function () {
    var e = entornoTour();
    e.ctx.TOUR_STEPS.forEach(function (paso) {
      var escena = new FakeNodo("div");
      var ctl = e.ctx.tourEscenaMontar(paso.id, escena, false);
      assert.strictEqual(typeof ctl.parar, "function", paso.id + ": sin parar()");
      assert.ok(escena.children.length >= 1, paso.id + ": la maqueta no pintó nada");
      ctl.parar();
    });
    var usadas = {};
    e.pedidas.forEach(function (k) {
      if (k.indexOf("tour.m_") === 0) usadas[k.slice(7)] = true;
    });
    Object.keys(usadas).forEach(function (k) {
      assert.ok(e.ctx.TOUR_MOCK[k] !== undefined, "una maqueta pide la palabra «" + k + "» y no está en TOUR_MOCK");
    });
    Object.keys(e.ctx.TOUR_MOCK).forEach(function (k) {
      assert.ok(usadas[k], "TOUR_MOCK trae «" + k + "» y ninguna maqueta la usa");
    });
  });

  t.test("sin GSAP la maqueta de la compra queda con lo marcado ya tachado (estado final)", function () {
    var e = entornoTour();
    var escena = new FakeNodo("div");
    e.ctx.tourEscenaMontar("compra", escena, false);
    var lista = escena.children[0].children[1];
    var hechas = lista.children.filter(function (f) { return f.classList.contains("is-hecha"); });
    assert.strictEqual(hechas.length, 2, "las dos primeras filas tienen que verse marcadas");
    assert.ok(lista.children[2].classList.contains("is-hecha") && lista.children[3].classList.contains("is-hecha"),
      "lo marcado baja al final de la lista");
  });

  t.test("el recorrido no explica lo que el dueño dejó fuera", function () {
    // Pedido el 2026-10-06: «Compartir» e «Imprimir» la lista no se explican.
    var s = freshSandbox();
    var texto = s.TOUR_STEPS.map(function (p) { return p.id + " " + p.title + " " + p.body; })
      .concat(Object.keys(s.TOUR_MOCK).map(function (k) { return s.TOUR_MOCK[k]; })).join(" ").toLowerCase();
    ["compartir", "imprimir"].forEach(function (palabra) {
      assert.strictEqual(texto.indexOf(palabra), -1, "no se explica: " + palabra);
    });
  });

  t.test("el recorrido es corto y cada escena dice para qué sirve la función", function () {
    var s = freshSandbox();
    // Tope 12: el dueño pidió «más corto» el 2026-10-07 y rehacerlo el
    // 2026-10-08. Si hace falta subirlo, que sea quitando una escena antes de
    // añadir otra: un recorrido que no se termina no enseña nada.
    assert.ok(s.TOUR_STEPS.length <= 12, "demasiadas escenas: " + s.TOUR_STEPS.length);
    assert.ok(s.TOUR_STEPS.length >= 6, "demasiado pocas escenas para cubrir lo que se usa a menudo");
    s.TOUR_STEPS.forEach(function (paso) {
      assert.ok(paso.title.length >= 8 && paso.title.length <= 45, "titular raro en " + paso.id);
      assert.ok(paso.body.length >= 50 && paso.body.length <= 200, "texto muy corto o muy largo en " + paso.id + " (" + paso.body.length + ")");
    });
  });

  t.test("el recorrido nombra cada botón de uso frecuente", function () {
    var s = freshSandbox();
    var texto = s.TOUR_STEPS.map(function (p) { return p.title + " " + p.body; }).join(" ").toLowerCase();
    ["«cambiar»", "«cómo se hace»", "cámara", "«confirmar plan de hoy»", "«generar plan»", "«sin cocinar»",
     "«despensa»", "1, 3 o 7", "idioma", "aspecto", "mis planes", "macros"].forEach(function (palabra) {
      assert.ok(texto.indexOf(palabra) !== -1, "el recorrido ya no nombra: " + palabra);
    });
  });

  // ── Las respuestas TIENEN que poder guardarse ───────────────────────
  // El fallo que lo motivó: el cuestionario escribía las siete respuestas
  // solo en el formulario en pantalla. La aplicación guardaba el perfil
  // únicamente al generar un plan, así que bastaba con que la página se
  // recargara -- y entrar con Google recarga, porque vuelve de un
  // redirect -- para perderlo todo y volver a empezar por la pregunta 1.
  //
  // Ahora cada respuesta se guarda en el acto con saveSettings(), lo que
  // solo funciona si la clave del paso es una que settings.js reconoce:
  // sanitizeSettings() descarta lo que no conoce, y lo haría en silencio.

  t.test("el alta pregunta TODO lo que cambia el plan (2026-09-03)", function () {
    var s = freshSandbox();
    var campos = s.ONBOARDING_STEPS.map(function (x) { return x.field; });
    // Un valor por defecto razonable NO es una respuesta: con 35 minutos de
    // cocina, sin nada excluido y con el horario de otra persona, el plan
    // que sale del alta no es el de este usuario. Estas ocho se añadieron
    // porque el usuario avisó de que no se le preguntaban.
    ["workouts", "cookTime", "priority", "taste", "cuisine",
     "wakeTime", "sleepTime", "dislikes"].forEach(function (need) {
      assert.ok(campos.indexOf(need) !== -1, "el alta ya no pregunta: " + need);
    });
  });

  t.test("settings.js EXIGE un array en un campo de lista -- una cadena se pierde", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();

    // Este es el contrato que obliga a _obCoerceForSettings() a partir la
    // cadena del <input> antes de guardar. Sin eso, la respuesta se veía
    // escrita en el formulario y desaparecía al recargar, sin ningún aviso.
    s.saveSettings({ dislikes: "cebolla, queso azul" });
    var guardado = s.getSettings().dislikes;
    // Se pierde ENTERO: sanitizeSettings() ni siquiera deja la clave. Da
    // igual la forma exacta de perderse -- lo que fija este test es que la
    // cadena NO llega, que es lo que obliga a partirla antes.
    assert.ok(!guardado || guardado.length === 0,
      "una cadena debería perderse aquí y llegó como: " + JSON.stringify(guardado));

    s.saveSettings({ dislikes: ["cebolla", "queso azul"] });
    assert.deepStrictEqual(plain(s.getSettings().dislikes), ["cebolla", "queso azul"]);
  });

  t.test("cada campo del alta es una clave que settings.js sabe guardar", function () {
    var s = freshSandbox();
    // Las de LISTA cuentan igual (dislikes): settings.js las guarda, solo
    // que como array. Faltaban aquí, y por eso este test señaló `dislikes`
    // como huérfano cuando en realidad el problema era otro -- que la
    // respuesta llegaba como cadena y sanitizeStringList() la convertía en
    // [] sin avisar. Eso se arregló en _obCoerceForSettings(); el test de
    // más abajo lo fija.
    var conocidas = [].concat(s.SETTINGS_NUMERIC_FIELDS, s.SETTINGS_STRING_FIELDS,
                              s.SETTINGS_LIST_FIELDS || []);
    // Un paso sin `field` no se guarda en los ajustes porque no es un dato
    // del perfil. La lista blanca esta escrita a mano a proposito: sin
    // ella, olvidarse de poner `field` en un paso de perfil dejaria de
    // fallar aqui y la respuesta se perderia en silencio.
    var PASOS_META = ["lang"];
    var huerfanas = s.ONBOARDING_STEPS
      .filter(function (step) {
        if (!step.field) return PASOS_META.indexOf(step.id) === -1;
        return conocidas.indexOf(step.field) === -1;
      })
      .map(function (step) { return step.id + " -> " + step.field; });
    assert.deepStrictEqual(plain(huerfanas), [],
      "settings.js descartaría estas respuestas al sanear, sin avisar: " + huerfanas.join(", "));
  });

  // El test de arriba comprueba el NOMBRE de la clave. No basta: el valor
  // también tiene que llegar con el TIPO correcto. Una pregunta de
  // opciones devuelve siempre texto (es lo que vale un `value` de HTML) y
  // sanitizeSettings() descarta en silencio un campo numérico que llegue
  // como cadena. Pasó de verdad con el nivel de actividad: se perdía en
  // producción mientras los otros seis pasos se guardaban bien.
  t.test("una respuesta de opciones a un campo NUMÉRICO se guarda como número", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();

    var numericos = s.SETTINGS_NUMERIC_FIELDS;
    var deOpciones = s.ONBOARDING_STEPS.filter(function (step) {
      return step.kind === "choice" && numericos.indexOf(step.field) !== -1;
    });
    assert.ok(deOpciones.length >= 1,
      "si ya no hay ningún paso de opciones numérico, este test sobra");

    deOpciones.forEach(function (step) {
      // Tal cual sale del HTML: una cadena.
      var comoTexto = step.options[0].value;
      assert.strictEqual(typeof comoTexto, "string");

      // Guardado sin convertir -> settings.js lo tira.
      s.saveSettings({ age: 30, weight: 70, height: 175 });
      var sinConvertir = {};
      var base = s.getSettings();
      Object.keys(base).forEach(function (k) { sinConvertir[k] = base[k]; });
      sinConvertir[step.field] = comoTexto;
      s.saveSettings(sinConvertir);
      assert.strictEqual(s.getSettings()[step.field], undefined,
        "settings.js debería seguir rechazando un número en forma de texto");

      // Convertido -> se guarda.
      var convertido = {};
      Object.keys(base).forEach(function (k) { convertido[k] = base[k]; });
      convertido[step.field] = parseFloat(comoTexto);
      s.saveSettings(convertido);
      assert.strictEqual(s.getSettings()[step.field], parseFloat(comoTexto),
        "el alta tiene que convertir " + step.field + " antes de guardarlo");
    });
  });

  t.test("guardar las respuestas del alta reconstruye un perfil completo", function () {
    var s = freshSandbox();
    s.localStorage = createFakeLocalStorage();

    // Simula el alta entera: cada paso guarda su respuesta.
    var respuestas = { sex: "female", age: 31, weight: 64.5, height: 170,
                       activity: 1.725, goal: "cut", budgetMode: "small" };
    s.ONBOARDING_STEPS.forEach(function (step) {
      var actual = s.getSettings() || {};
      var merged = {};
      Object.keys(actual).forEach(function (k) { merged[k] = actual[k]; });
      merged[step.field] = respuestas[step.field];
      s.saveSettings(merged);
    });

    var guardado = s.getSettings();
    Object.keys(respuestas).forEach(function (k) {
      assert.strictEqual(guardado[k], respuestas[k], "se perdió al guardar: " + k);
    });

    // Y lo que de verdad importa: con eso, la aplicación ya sabe que este
    // usuario contestó, así que no le vuelve a enseñar el cuestionario.
    var hasProfile = !!(guardado.age && guardado.weight && guardado.height);
    assert.strictEqual(hasProfile, true);
    var estado = { termsVersion: "1.0", termsAcceptedAt: "2026-09-02T00:00:00Z" };
    assert.strictEqual(
      s.nextOnboardingStep(estado, { currentVersion: "1.0", hasAccount: true, hasProfile: hasProfile }),
      "done",
      "tras contestar, una recarga no puede devolverle a la pregunta 1");
  });

  // El presupuesto es el ÚNICO paso que puede quedarse sin contestar, y por
  // eso "Terminar" se podía pulsar dejándolo vacío: después, el botón de
  // generar respondía "Elige un presupuesto" y para el usuario "Terminar
  // no hacía nada".
  //
  // La razón está en el TIPO de control, no en el HTML: un <select> y un
  // <input value="..."> siempre tienen un valor -- aunque nadie los toque,
  // el navegador da el primero. Un grupo de radios sin `checked` no tiene
  // ninguno. Si algún día otro paso pasa a ser radios, hereda el mismo
  // problema y este test lo dice.
  t.test("solo el presupuesto puede quedarse sin contestar (es el único grupo de radios)", function () {
    var s = freshSandbox();
    var html = readIndexHtml();

    var puedenQuedarVacios = s.ONBOARDING_STEPS.filter(function (step) {
      var esGrupoDeRadios = html.indexOf('name="' + step.field + '"') !== -1 &&
                            html.indexOf('id="' + step.field + '"') === -1;
      if (!esGrupoDeRadios) return false;
      // ...y ninguno de sus radios viene marcado de fábrica.
      var marcado = new RegExp('name="' + step.field + '"[^>]*checked').test(html);
      return !marcado;
    }).map(function (step) { return step.id; });

    assert.deepStrictEqual(plain(puedenQuedarVacios), ["budget"],
      "cambió qué pasos pueden quedarse vacíos: revisar la validación de _obNext()");
  });
  // ── La pregunta sale ANTES que el plan, y el recorrido es un <dialog> ──
  // 2026-10-07: tras el cuestionario sale «¿Quieres ver un recorrido?» al
  // instante y el plan se genera DESPUÉS. 2026-10-08: con el recorrido rehecho,
  // «sí» abre el recorrido (no necesita plan) y el plan se genera cuando se
  // cierra; ambos son <dialog> modales, así que ningún otro diálogo los tapa.
  function entornoPregunta(estado) {
    var e = entornoTour({ estado: estado });
    e.espiarStartTour();
    e.si = function () { e.buscar("tour__next").click(); };
    e.no = function () { e.buscar("tour__prev").click(); };
    e.visible = function () { var r = e.buscar("tour-ask"); return !!r && !r.hidden; };
    return e;
  }

  t.test("«Sí» abre el recorrido y el plan se genera cuando el recorrido se cierra", function () {
    var e = entornoPregunta({});
    var respuestas = [];
    e.ctx.offerTour(function (q) { respuestas.push(q); });
    assert.strictEqual(e.visible(), true, "la pregunta tiene que salir al instante");
    assert.deepStrictEqual(respuestas, [], "todavía no ha contestado");
    e.si();
    assert.strictEqual(e.visible(), false, "la pregunta se cierra");
    assert.strictEqual(e.llamadas.start, 1, "«Sí» abre el recorrido en el acto: ya no hace falta un plan");
    assert.deepStrictEqual(respuestas, [], "el plan no se genera mientras suena el recorrido");
    e.llamadas.opts.alCerrar();
    assert.deepStrictEqual(respuestas, [true], "al cerrarse el recorrido (acabado o saltado) se genera el plan");
  });

  t.test("«No» y Escape avisan para generar el plan al momento, lo recuerdan y NO abren el recorrido", function () {
    var e = entornoPregunta({});
    var respuestas = [];
    e.ctx.offerTour(function (q) { respuestas.push(q); });
    e.no();
    assert.deepStrictEqual(respuestas, [false]);
    assert.strictEqual(e.llamadas.completo, 1, "el «No» se guarda para siempre");
    assert.strictEqual(e.llamadas.start, 0);

    // Escape en un <dialog> llega como `cancel`; sin <dialog> de verdad, como keydown.
    var e2 = entornoPregunta({});
    var r2 = [];
    e2.ctx.offerTour(function (q) { r2.push(q); });
    e2.buscar("tour-ask").disparar("cancel");
    assert.deepStrictEqual(r2, [false], "Escape es «No»: de una pregunta hay que poder salir");

    var e3 = entornoPregunta({});
    var r3 = [];
    e3.ctx.offerTour(function (q) { r3.push(q); });
    e3.teclas.forEach(function (fn) { fn({ key: "Escape" }); });
    assert.deepStrictEqual(r3, [false]);
  });

  t.test("si la pregunta no puede mostrarse, quien espera se entera igual (el plan se genera)", function () {
    var e = entornoPregunta({});
    e.ctx._tourEls = { root: { hidden: false } };   // ya hay un recorrido en pantalla
    var respuestas = [];
    e.ctx.offerTour(function (q) { respuestas.push(q); });
    assert.deepStrictEqual(respuestas, [false]);
    assert.strictEqual(e.visible(), false);
  });

  t.test("la pregunta y el recorrido son <dialog> modales (capa superior: nada los tapa)", function () {
    var e = entornoPregunta({});
    e.ctx.offerTour(function () {});
    var pregunta = e.buscar("tour-ask");
    assert.strictEqual(pregunta.tag, "dialog");
    assert.strictEqual(pregunta.open, true, "showModal() tiene que haberse llamado");
    var e2 = entornoTour();
    e2.ctx.startTour();
    var hoja = e2.buscar("tour");
    assert.strictEqual(hoja.tag, "dialog");
    assert.strictEqual(hoja.open, true);
  });

  t.test("el final del cuestionario pregunta ANTES de pulsar «Generar plan»", function () {
    var fs = require("fs");
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    var pregunta = app.indexOf("offerTour(generarElPlan)");
    var genera = app.indexOf("generar.click()", app.indexOf("function generarElPlan"));
    assert.ok(pregunta !== -1, "js/app.js tiene que llamar a offerTour(generarElPlan) al terminar el cuestionario");
    assert.ok(genera !== -1, "no se encuentra el clic que genera el plan");
    assert.ok(app.indexOf("function generarElPlan") < pregunta,
      "el plan se genera dentro de generarElPlan, que es lo que ejecuta la respuesta");
    assert.ok(app.indexOf("generar.click()") === genera,
      "no puede haber otro generar.click() antes: la pregunta sale antes que el plan");
  });

  t.test("«Ver la explicación otra vez» abre el recorrido: ya no repite el alta (bienvenida) si no hay plan", function () {
    // Reportado el 2026-10-08: sin plan en pantalla, el botón del menú echaba a
    // «elegir o crear cuenta» y solo funcionaba al volver a entrar.
    var app = require("fs").readFileSync(projPath("js/app.js"), "utf8");
    var i = app.indexOf("function repetirExplicacion()");
    assert.ok(i !== -1);
    var cuerpo = app.slice(i, app.indexOf("\n}", i));
    assert.ok(cuerpo.indexOf("startTour()") !== -1, "tiene que abrir el recorrido");
    assert.ok(cuerpo.indexOf("restartOnboarding") === -1, "no puede volver a repetir el alta");
  });

  t.test("quien vio el recorrido VIEJO (antes del 2026-10-06) vuelve a recibir la oferta, una vez", function () {
    function oferta(estado) {
      var e = entornoTour({ estado: estado });
      var n = 0;
      e.ctx.offerTour = function () { n++; };
      e.ctx.maybeStartTour();
      e.correrTemporizadores();
      return n;
    }
    assert.strictEqual(oferta({}), 1, "no lo ha visto");
    assert.strictEqual(oferta({ tourDoneAt: "2026-10-01T10:00:00.000Z" }), 1, "vio el viejo");
    assert.strictEqual(oferta({ tourDoneAt: "2026-10-07T10:00:00.000Z" }), 0, "ya vio o rechazó el actual");
    assert.strictEqual(oferta({ tourDoneAt: "no-es-una-fecha" }), 0, "ante la duda no se molesta");
  });

  t.test("el recorrido: abre, avanza escena a escena, retrocede y al terminar se cierra y se da por visto", function () {
    var e = entornoTour();
    var cerrados = 0;
    e.ctx.startTour({ alCerrar: function () { cerrados++; } });
    var hoja = e.buscar("tour");
    assert.strictEqual(hoja.hidden, false);
    assert.strictEqual(hoja.open, true);
    assert.ok(e.raiz.classList.contains("tour-abierto"), "la página queda bloqueada mientras dura");
    var total = e.ctx.TOUR_STEPS.length;
    var siguiente = e.buscar("tour__next");
    var atras = e.buscar("tour__prev");
    assert.strictEqual(atras.hidden, true, "en la primera no hay «Atrás»");
    siguiente.click();
    assert.strictEqual(e.ctx._tourIndex, 1);
    assert.strictEqual(atras.hidden, false);
    atras.click();
    assert.strictEqual(e.ctx._tourIndex, 0);
    for (var i = 0; i < total - 1; i++) siguiente.click();
    assert.strictEqual(e.ctx._tourIndex, total - 1, "llega a la última escena");
    assert.strictEqual(hoja.hidden, false);
    siguiente.click();                 // «Entendido»
    assert.strictEqual(hoja.hidden, true, "se cierra");
    assert.strictEqual(hoja.open, false);
    assert.ok(!e.raiz.classList.contains("tour-abierto"), "la página se desbloquea");
    assert.strictEqual(e.llamadas.completo, 1, "se da por visto, una vez");
    assert.strictEqual(cerrados, 1, "avisa a quien esperaba, una vez");
  });

  t.test("saltar, la X y Escape cierran el recorrido y lo dan por visto; no hace falta plan", function () {
    ["skip", "x", "cancel"].forEach(function (via) {
      var e = entornoTour();
      var cerrados = 0;
      e.ctx.startTour({ alCerrar: function () { cerrados++; } });
      var hoja = e.buscar("tour");
      if (via === "skip") e.buscar("tour__skip").click();
      else if (via === "x") e.buscar("tour__x").click();
      else hoja.disparar("cancel");
      assert.strictEqual(hoja.hidden, true, via + ": se cierra");
      assert.strictEqual(e.llamadas.completo, 1, via + ": se da por visto");
      assert.strictEqual(cerrados, 1, via + ": avisa a quien esperaba");
      // y se puede volver a abrir
      e.ctx.startTour();
      assert.strictEqual(hoja.hidden, false, via + ": se reabre");
    });
  });

  t.test("sin escenas (datos que no cargan) el recorrido no se abre, pero quien esperaba se entera", function () {
    var e = entornoTour({ sinDatos: true });
    var cerrados = 0;
    e.ctx.startTour({ alCerrar: function () { cerrados++; } });
    assert.strictEqual(cerrados, 1, "si no hay recorrido, que se genere el plan igualmente");
    var hoja = e.buscar("tour");
    assert.ok(!hoja || hoja.hidden, "no queda nada abierto");
  });

  // ── Sin emojis, y la animación es opcional ─────────────────────────────
  // El dueño los descartó el 2026-10-07 («убери нахуй эти иишные смайлики»):
  // las maquetas usan los iconos de la propia aplicación, no emojis.
  function tieneEmoji(texto) {
    for (var i = 0; i < texto.length; i++) {
      var cp = texto.codePointAt(i);
      if (cp > 0xFFFF) i++;
      // ☰ (U+2630) es el símbolo del menú de la propia aplicación, no un emoji.
      if (cp === 0x2630) continue;
      if ((cp >= 0x1F000 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x27BF) || cp === 0xFE0F) return true;
    }
    return false;
  }

  t.test("el recorrido no lleva emojis: ni en los textos, ni en las traducciones, ni en el código", function () {
    var fs = require("fs");
    ["js/ui/tour.js", "js/ui/tour-fx.js", "js/ui/tour-scenes.js", "js/data/tour-steps.js", "js/i18n/en.js", "js/i18n/ru.js", "js/i18n/es.js"].forEach(function (f) {
      var lineas = fs.readFileSync(projPath(f), "utf8").split(String.fromCharCode(10));
      lineas.forEach(function (l, i) {
        if (l.indexOf("tour") === -1 && f.indexOf("i18n") !== -1) return;   // en las tablas solo las claves del recorrido
        assert.ok(!tieneEmoji(l), f + ":" + (i + 1) + " tiene un emoji: " + l.trim().slice(0, 80));
      });
    });
  });

  t.test("tour.js solo usa las animaciones si existen: sin GSAP el recorrido es el de siempre", function () {
    var fs = require("fs");
    var src = fs.readFileSync(projPath("js/ui/tour.js"), "utf8");
    var fx = fs.readFileSync(projPath("js/ui/tour-fx.js"), "utf8") + fs.readFileSync(projPath("js/ui/tour-scenes.js"), "utf8");
    ["tourFxActivo", "tourFxPalabras", "tourFxFondo", "tourFxConfeti", "tourEscenaMontar"].forEach(function (nombre) {
      assert.ok(src.indexOf('typeof ' + nombre + ' === "function"') !== -1 || src.indexOf('typeof ' + nombre + ' !== "function"') !== -1,
        nombre + " se llama sin comprobar antes que existe");
      assert.ok(fx.indexOf("function " + nombre + "(") !== -1, nombre + " no está definida");
    });
    // GSAP solo se toca detrás de tourFxActivo()
    assert.ok(src.indexOf("gsap.") !== -1);
  });

  t.test("el recorrido es un <dialog> con showModal(), y la página se bloquea con una clase", function () {
    var src = require("fs").readFileSync(projPath("js/ui/tour.js"), "utf8");
    assert.ok(src.indexOf('createElement("dialog")') !== -1);
    assert.ok(src.indexOf("showModal") !== -1);
    assert.ok(src.indexOf("tour-abierto") !== -1);
    var css = require("fs").readFileSync(projPath("assets/css/style.css"), "utf8");
    assert.ok(css.indexOf("html.tour-abierto") !== -1, "falta el CSS que bloquea el desplazamiento");
    assert.ok(css.indexOf("backdrop-filter:") === -1 || css.indexOf("backdrop-filter:") > css.indexOf("/* ══ 16."),
      "el recorrido no debe usar backdrop-filter: desenfocar un fondo que se mueve da tirones en el móvil");
  });

  t.test("tour-fx.js y tour-scenes.js se cargan ANTES que tour.js, y GSAP antes que todos", function () {
    var html = require("fs").readFileSync(projPath("index.html"), "utf8");
    var g = html.indexOf("gsap.min.js");
    var fx = html.indexOf("js/ui/tour-fx.js?v=");
    var esc = html.indexOf("js/ui/tour-scenes.js?v=");
    var tour = html.indexOf("js/ui/tour.js?v=");
    assert.ok(g !== -1 && fx !== -1 && esc !== -1 && tour !== -1 && g < fx && fx < esc && esc < tour);
  });

}

module.exports = { run: run };

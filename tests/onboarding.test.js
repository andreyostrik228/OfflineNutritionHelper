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

  // ── El recorrido guiado ─────────────────────────────────────────────
  // Mismo peligro que el alta: apunta a elementos del index.html real. Un
  // id que alguien renombre convierte un paso del tutorial en un foco
  // sobre la nada.

  t.test("cada paso del recorrido señala un elemento que existe en index.html", function () {
    var s = freshSandbox();
    var html = readIndexHtml();
    var rotos = s.TOUR_STEPS.filter(function (step) {
      // Los pasos `dynamic` apuntan a algo que pinta el JavaScript, así que
      // no puede estar en index.html: los comprueba el test de abajo,
      // contra el archivo que los genera.
      if (step.dynamic) return false;
      var id = step.target.replace(/^#/, "");
      return html.indexOf('id="' + id + '"') === -1;
    }).map(function (step) { return step.id + " -> " + step.target; });
    assert.deepStrictEqual(plain(rotos), [],
      "el recorrido iluminaría un hueco vacío: " + rotos.join(", "));
  });

  t.test("los pasos del recorrido no se atan a clases de estilo", function () {
    var s = freshSandbox();
    // Dos formas válidas, y las dos son un contrato explícito: un id del
    // HTML, o un ancla `data-tour` puesta a propósito para el recorrido.
    // Lo que sigue prohibido es apuntar a una clase CSS o a una posición:
    // eso ata el tutorial a la maquetación y se rompe en silencio al
    // reestilizar.
    var frágiles = s.TOUR_STEPS.filter(function (step) {
      var porId = /^#[A-Za-z][\w-]*$/.test(step.target);
      var porAncla = /^\[data-tour="[a-z-]+"\]$/.test(step.target);
      return !porId && !porAncla;
    }).map(function (step) { return step.id + ": " + step.target; });
    assert.deepStrictEqual(plain(frágiles), [],
      "un selector por clase o por posición se rompe al mover el HTML: " + frágiles.join(", "));
  });

  t.test("cada ancla `data-tour` la pinta de verdad el renderizador", function () {
    var s = freshSandbox();
    // Las pintan varios ficheros: las tarjetas (render.js), la lista de la
    // compra y el resumen de datos del móvil (pestanas.js).
    var fs = require("fs");
    var render = ["render.js", "render-shopping-list.js", "pestanas.js"].map(function (f) {
      return fs.readFileSync(projPath("js/ui/" + f), "utf8");
    }).join(" ");
    var rotas = s.TOUR_STEPS.filter(function (step) {
      if (!step.dynamic) return false;
      var ancla = (step.target.match(/data-tour="([a-z-]+)"/) || [])[1];
      return !ancla || render.indexOf('data-tour="' + ancla + '"') === -1;
    }).map(function (step) { return step.id + " -> " + step.target; });
    assert.deepStrictEqual(plain(rotas), [],
      "el ancla no existe en render.js, el paso apuntaría a la nada: " + rotas.join(", "));
  });

  t.test("un paso `dynamic` es siempre `optional`", function () {
    var s = freshSandbox();
    // Su elemento no existe hasta que hay un plan pintado. Sin `optional`,
    // el recorrido se rompería en la primera visita en vez de saltárselo.
    var mal = s.TOUR_STEPS.filter(function (step) {
      return step.dynamic && !step.optional;
    }).map(function (step) { return step.id; });
    assert.deepStrictEqual(plain(mal), [],
      "sin `optional` apuntarían a una tarjeta que aún no existe: " + mal.join(", "));
  });

  // Los pasos que dependen de que haya un plan generado TIENEN que estar
  // marcados como opcionales: si no, en la primera visita el recorrido
  // apuntaría a paneles que todavía están ocultos.
  t.test("lo que solo existe con un plan generado está marcado como opcional", function () {
    var s = freshSandbox();
    var dependenDelPlan = ["#shoppingPanel", "#usePlanTodayBtn"];
    var mal = s.TOUR_STEPS.filter(function (step) {
      return dependenDelPlan.indexOf(step.target) !== -1 && !step.optional;
    }).map(function (step) { return step.id; });
    assert.deepStrictEqual(plain(mal), [], "sin `optional` apuntarían a un panel oculto: " + mal.join(", "));
  });

  t.test("el id de cada paso es una palabra: de él sale la clave de traducción", function () {
    var s = freshSandbox();
    var mal = s.TOUR_STEPS.filter(function (step) { return !/^[a-z]+$/.test(step.id); })
      .map(function (step) { return step.id; });
    assert.deepStrictEqual(plain(mal), [], "ids con guiones o mayúsculas: " + mal.join(", "));
    var ids = s.TOUR_STEPS.map(function (step) { return step.id; });
    assert.strictEqual(new Set(ids).size, ids.length, "ids repetidos");
  });

  t.test("cada pestaña del recorrido es una de las cuatro, y cada una se visita UNA sola vez", function () {
    // En el móvil cada paso abre la pestaña de su elemento (js/ui/pestanas.js).
    // Si los pasos van mezclados -- menu, compra, menu, compra --, la pantalla
    // da un salto en cada uno, que es justo lo que había que evitar. Los
    // pasos sin pestaña (el menú ☰ se ve en todas) no cuentan.
    var s = freshSandbox();
    var validas = ["menu", "compra", "planes", "datos"];
    var mal = s.TOUR_STEPS.filter(function (step) { return step.tab && validas.indexOf(step.tab) === -1; })
      .map(function (step) { return step.id + ": " + step.tab; });
    assert.deepStrictEqual(plain(mal), [], "pestaña desconocida: " + mal.join(", "));

    var secuencia = [];
    s.TOUR_STEPS.forEach(function (step) {
      if (!step.tab) return;
      if (secuencia[secuencia.length - 1] !== step.tab) secuencia.push(step.tab);
    });
    var vistas = {};
    secuencia.forEach(function (tab) {
      assert.ok(!vistas[tab], "la pestaña \"" + tab + "\" se visita dos veces separadas: " + secuencia.join(" > "));
      vistas[tab] = true;
    });
  });

  t.test("el recorrido no explica lo que el dueño dejó fuera", function () {
    // Pedido el 2026-10-06: «Compartir» e «Imprimir» la lista no se explican,
    // y el catálogo sale en UN paso para decir que existe y nada más.
    var s = freshSandbox();
    var texto = s.TOUR_STEPS.map(function (step) { return step.id + " " + step.target + " " + step.title + " " + step.body; }).join(" ").toLowerCase();
    ["shareListBtn", "printListBtn", "compartir", "imprimir"].forEach(function (palabra) {
      assert.strictEqual(texto.indexOf(palabra.toLowerCase()), -1, "no se explica: " + palabra);
    });
    var catalogo = s.TOUR_STEPS.filter(function (step) { return step.id === "catalog"; });
    assert.strictEqual(catalogo.length, 1, "el catálogo sale en un solo paso");
  });

  t.test("el recorrido es corto y cada paso dice para qué sirve la función", function () {
    var s = freshSandbox();
    // El tope subió de 8 a 11 el 2026-09-03, cuando el usuario pidió cubrir
    // las funciones que faltaban (recetas, "↻ Cambiar", horario, catálogo y
    // "Mis planes"). Sigue habiendo tope, y a propósito: la razón original
    // -- un recorrido que no se termina no enseña nada -- no ha dejado de
    // ser cierta, solo se ha movido la raya. Si hace falta subirla otra vez,
    // que sea quitando un paso antes de añadir dos.
    // Tope 20 desde el 2026-10-06: el dueño pidió que se explique TODO botón
    // de uso frecuente (el de cambiar una comida, la cámara de Mercadona, las
    // casillas de la compra...), no solo lo que no se descubre solo. El
    // recorrido pasó de 11 a 18 pasos, y a cambio no arranca solo: se pregunta.
    assert.ok(s.TOUR_STEPS.length >= 4 && s.TOUR_STEPS.length <= 20,
      "un recorrido que no se termina no enseña nada; hay " + s.TOUR_STEPS.length + " pasos");
    s.TOUR_STEPS.forEach(function (step) {
      assert.ok(step.title && step.title.length > 0, "paso sin título: " + step.id);
      assert.ok(step.body && step.body.length >= 40,
        "el paso \"" + step.id + "\" no explica para qué sirve, solo lo nombra");
    });
  });

  t.test("el recorrido cubre las funciones que un recién llegado no descubriría solo", function () {
    var s = freshSandbox();
    var ids = s.TOUR_STEPS.map(function (x) { return x.id; });
    // La despensa, el modo sin cocinar y los planes de varios días viven
    // detrás de botones que no cuentan lo que hacen: son justo las que hay
    // que enseñar.
    ["pantry", "nocook", "days", "shopping"].forEach(function (need) {
      assert.ok(ids.indexOf(need) !== -1, "el recorrido no enseña: " + need);
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
  // ── La pregunta del recorrido espera a que se pueda ─────────────────
  // Reportado el 2026-10-07: «el tutorial simplemente no aparece». Con un
  // plan de hoy ya empezado, «Generar plan» no genera: abre el diálogo
  // «Ya tienes un plan activo». La pregunta se decidía con UNA mirada a los
  // 0,9 s y se perdía (o salía debajo del diálogo modal). Ahora espera.
  t.test("offerTourWhenReady espera a que haya plan y ningún diálogo abierto", function () {
    var fs = require("fs");
    var vm = require("vm");
    var estado = { plan: false, dialogoAbierto: false, ahora: 0, preguntas: 0 };
    var relojes = [];
    var win = {
      setInterval: function (fn) { relojes.push(fn); return relojes.length; },
      clearInterval: function (id) { relojes[id - 1] = null; }
    };
    var doc = {
      querySelectorAll: function (sel) {
        if (sel === "dialog") return [{ open: estado.dialogoAbierto }];
        if (sel.indexOf(".meal-card") !== -1) return estado.plan ? [{}] : [];
        return [];
      }
    };
    var ctx = vm.createContext({ window: win, document: doc, console: console,
      Date: { now: function () { return estado.ahora; } } });
    vm.runInContext(fs.readFileSync(projPath("js/ui/tour.js"), "utf8"), ctx);
    ctx.offerTour = function () { estado.preguntas++; };

    function pasar(veces) {
      for (var i = 0; i < veces; i++) {
        estado.ahora += 400;
        relojes.forEach(function (fn) { if (fn) fn(); });
      }
    }

    // 1. Sin plan: no pregunta, por mucho que pase.
    ctx.offerTourWhenReady();
    pasar(5);
    assert.strictEqual(estado.preguntas, 0, "sin plan no hay nada que enseñar");

    // 2. Con plan pero con un diálogo modal encima: espera.
    estado.plan = true;
    estado.dialogoAbierto = true;
    pasar(5);
    assert.strictEqual(estado.preguntas, 0, "con un diálogo abierto la pregunta quedaría debajo");

    // 3. Se cierra el diálogo: pregunta, y UNA sola vez.
    estado.dialogoAbierto = false;
    pasar(6);
    assert.strictEqual(estado.preguntas, 1, "tiene que preguntar en cuanto se pueda, una vez");
  });

  t.test("offerTourWhenReady se rinde si el diálogo se cierra sin que haya plan", function () {
    var fs = require("fs");
    var vm = require("vm");
    var estado = { plan: false, dialogoAbierto: true, ahora: 0, preguntas: 0 };
    var relojes = [];
    var win = {
      setInterval: function (fn) { relojes.push(fn); return relojes.length; },
      clearInterval: function (id) { relojes[id - 1] = null; }
    };
    var doc = {
      querySelectorAll: function (sel) {
        if (sel === "dialog") return [{ open: estado.dialogoAbierto }];
        if (sel.indexOf(".meal-card") !== -1) return estado.plan ? [{}] : [];
        return [];
      }
    };
    var ctx = vm.createContext({ window: win, document: doc, console: console,
      Date: { now: function () { return estado.ahora; } } });
    vm.runInContext(fs.readFileSync(projPath("js/ui/tour.js"), "utf8"), ctx);
    ctx.offerTour = function () { estado.preguntas++; };

    ctx.offerTourWhenReady();
    estado.ahora += 400; relojes.forEach(function (fn) { if (fn) fn(); });   // ve el diálogo
    estado.dialogoAbierto = false;                                          // «Cancelar»: sigue sin plan
    estado.ahora += 400; relojes.forEach(function (fn) { if (fn) fn(); });
    // Aunque luego aparezca un plan por otro camino, ya no se pregunta.
    estado.plan = true;
    for (var i = 0; i < 6; i++) { estado.ahora += 400; relojes.forEach(function (fn) { if (fn) fn(); }); }
    assert.strictEqual(estado.preguntas, 0, "tras «Cancelar» no hay que preguntar nada");
  });
  // ── La pregunta sale ANTES que el plan ──────────────────────────────
  // 2026-10-07, a petición del usuario: tras el cuestionario la pregunta del
  // recorrido tiene que salir al instante, no después de crear el plan. El
  // plan se genera cuando contesta (offerTour(alResponder)) y, si dijo «Sí»,
  // el recorrido arranca al pintarse (maybeStartTour).
  function entornoPregunta(estadoOnboarding) {
    var fs = require("fs");
    var vm = require("vm");
    function el(tag) {
      return {
        tag: tag, className: "", id: "", hidden: false, children: [], handlers: {}, style: {},
        textContent: "", type: "",
        appendChild: function (c) { this.children.push(c); return c; },
        addEventListener: function (tipo, fn) { (this.handlers[tipo] = this.handlers[tipo] || []).push(fn); },
        setAttribute: function () {}, focus: function () {},
        click: function () { (this.handlers.click || []).forEach(function (fn) { fn(); }); },
        classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
      };
    }
    function buscar(nodo, clase) {
      if ((" " + nodo.className + " ").indexOf(" " + clase + " ") !== -1) return nodo;
      for (var i = 0; i < nodo.children.length; i++) {
        var r = buscar(nodo.children[i], clase);
        if (r) return r;
      }
      return null;
    }
    var teclas = [];
    var temporizadores = [];
    var cuerpo = el("body");
    var doc = {
      body: cuerpo,
      createElement: el,
      addEventListener: function (tipo, fn) { if (tipo === "keydown") teclas.push(fn); },
      getElementById: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    };
    var win = {
      setTimeout: function (fn) { temporizadores.push(fn); return temporizadores.length; },
      clearTimeout: function () {}, setInterval: function () { return 1; }, clearInterval: function () {},
      addEventListener: function () {}, removeEventListener: function () {},
      requestAnimationFrame: function () { return 1; }, cancelAnimationFrame: function () {}
    };
    var ctx = vm.createContext({ window: win, document: doc, console: console, Date: Date });
    vm.runInContext(fs.readFileSync(projPath("js/ui/tour.js"), "utf8"), ctx);
    var llamadas = { start: 0, completo: 0 };
    ctx.startTour = function () { llamadas.start++; };
    ctx.completeTour = function () { llamadas.completo++; };
    ctx.getOnboardingState = function () { return estadoOnboarding || {}; };
    return {
      ctx: ctx, llamadas: llamadas, teclas: teclas,
      si: function () { buscar(cuerpo, "tour-ask").children[0].children[2].children[1].handlers.click[0](); },
      no: function () { buscar(cuerpo, "tour-ask").children[0].children[2].children[0].handlers.click[0](); },
      visible: function () { var r = buscar(cuerpo, "tour-ask"); return !!r && !r.hidden; },
      correrTemporizadores: function () { var l = temporizadores.splice(0); l.forEach(function (fn) { fn(); }); }
    };
  }

  t.test("«Sí» a la pregunta del cuestionario avisa para generar el plan y el recorrido arranca al pintarse", function () {
    var e = entornoPregunta({});
    var respuestas = [];
    e.ctx.offerTour(function (q) { respuestas.push(q); });
    assert.strictEqual(e.visible(), true, "la pregunta tiene que salir al instante");
    assert.deepStrictEqual(respuestas, [], "todavía no ha contestado");
    e.si();
    assert.deepStrictEqual(respuestas, [true], "«Sí» avisa UNA vez, para que se genere el plan");
    assert.strictEqual(e.visible(), false, "la pregunta se cierra");
    assert.strictEqual(e.llamadas.start, 0, "aún no hay plan que señalar: el recorrido no arranca todavía");
    // El plan se pinta: app.js llama a maybeStartTour() al final de cada generación.
    e.ctx.maybeStartTour();
    e.correrTemporizadores();
    assert.strictEqual(e.llamadas.start, 1, "al pintarse el plan arranca el recorrido que pidió");
    // Y solo esa vez: el siguiente plan no vuelve a arrancarlo.
    e.ctx.maybeStartTour();
    e.correrTemporizadores();
    assert.strictEqual(e.llamadas.start, 1, "el «Sí» se gasta con un solo recorrido");
  });

  t.test("«Sí» arranca el recorrido aunque ya lo hubiera visto antes (repetir el alta)", function () {
    var e = entornoPregunta({ tourDoneAt: "2026-10-01T00:00:00Z" });
    e.ctx.offerTour(function () {});
    e.si();
    e.ctx.maybeStartTour();
    e.correrTemporizadores();
    assert.strictEqual(e.llamadas.start, 1);
  });

  t.test("«No» y Escape avisan para generar el plan, lo recuerdan y NO arrancan el recorrido", function () {
    var e = entornoPregunta({});
    var respuestas = [];
    e.ctx.offerTour(function (q) { respuestas.push(q); });
    e.no();
    assert.deepStrictEqual(respuestas, [false]);
    assert.strictEqual(e.llamadas.completo, 1, "el «No» se guarda para siempre");
    e.ctx.maybeStartTour();
    e.correrTemporizadores();
    assert.strictEqual(e.llamadas.start, 0);

    var e2 = entornoPregunta({});
    var r2 = [];
    e2.ctx.offerTour(function (q) { r2.push(q); });
    e2.teclas.forEach(function (fn) { fn({ key: "Escape" }); });
    assert.deepStrictEqual(r2, [false], "Escape es «No»: de una pregunta hay que poder salir");
  });

  t.test("si la pregunta no puede mostrarse, quien espera se entera igual (el plan se genera)", function () {
    var e = entornoPregunta({});
    e.ctx._tourEls = { root: { hidden: false } };   // ya hay un recorrido en pantalla
    var respuestas = [];
    e.ctx.offerTour(function (q) { respuestas.push(q); });
    assert.deepStrictEqual(respuestas, [false]);
    assert.strictEqual(e.visible(), false);
  });

  t.test("un «Sí» que nunca llega a un plan caduca y no arranca el recorrido de otro plan", function () {
    var e = entornoPregunta({ tourDoneAt: "2026-10-01T00:00:00Z" });
    e.ctx.offerTour(function () {});
    e.si();
    e.ctx._tourQuiereVerlo = Date.now() - 3 * 60 * 1000;   // «Cancelar» en el diálogo: 3 min después...
    e.ctx.maybeStartTour();
    e.correrTemporizadores();
    assert.strictEqual(e.llamadas.start, 0);
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
    assert.ok(app.indexOf("offerTourWhenReady") === -1,
      "al final del cuestionario ya no se espera al plan para preguntar");
  });

}

module.exports = { run: run };

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
      ["supabase", "quién guarda los datos con cuenta"],
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
    assert.ok(s.ONBOARDING_STEPS.length <= 8,
      "el muro de 26 campos era el problema; " + s.ONBOARDING_STEPS.length + " pasos ya es demasiado");
  });

  t.test("cada paso tiene una pregunta escrita y una forma conocida", function () {
    var s = freshSandbox();
    s.ONBOARDING_STEPS.forEach(function (step) {
      assert.ok(step.title && step.title.length > 0, "paso sin pregunta: " + step.id);
      assert.ok(["choice", "number"].indexOf(step.kind) !== -1, "tipo raro en " + step.id);
      if (step.kind === "choice") {
        assert.ok(step.options && step.options.length >= 2, "elección con menos de 2 opciones: " + step.id);
        step.options.forEach(function (o) {
          assert.ok(o.value && o.label, "opción incompleta en " + step.id);
        });
      } else {
        assert.ok(typeof step.min === "number" && typeof step.max === "number",
          "paso numérico sin límites: " + step.id);
        assert.ok(step.min < step.max, "límites al revés en " + step.id);
      }
    });
  });

  // ── El recorrido guiado ─────────────────────────────────────────────
  // Mismo peligro que el alta: apunta a elementos del index.html real. Un
  // id que alguien renombre convierte un paso del tutorial en un foco
  // sobre la nada.

  t.test("cada paso del recorrido señala un elemento que existe en index.html", function () {
    var s = freshSandbox();
    var html = readIndexHtml();
    var rotos = s.TOUR_STEPS.filter(function (step) {
      // Todos los objetivos son selectores de id: "#loQueSea".
      var id = step.target.replace(/^#/, "");
      return html.indexOf('id="' + id + '"') === -1;
    }).map(function (step) { return step.id + " -> " + step.target; });
    assert.deepStrictEqual(plain(rotos), [],
      "el recorrido iluminaría un hueco vacío: " + rotos.join(", "));
  });

  t.test("los pasos del recorrido usan selectores de id, no rutas frágiles", function () {
    var s = freshSandbox();
    var frágiles = s.TOUR_STEPS.filter(function (step) {
      return !/^#[A-Za-z][\w-]*$/.test(step.target);
    }).map(function (step) { return step.id + ": " + step.target; });
    assert.deepStrictEqual(plain(frágiles), [],
      "un selector por clase o por posición se rompe al mover el HTML: " + frágiles.join(", "));
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

  t.test("el recorrido es corto y cada paso dice para qué sirve la función", function () {
    var s = freshSandbox();
    assert.ok(s.TOUR_STEPS.length >= 4 && s.TOUR_STEPS.length <= 8,
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

  t.test("cada campo del alta es una clave que settings.js sabe guardar", function () {
    var s = freshSandbox();
    var conocidas = [].concat(s.SETTINGS_NUMERIC_FIELDS, s.SETTINGS_STRING_FIELDS);
    var huerfanas = s.ONBOARDING_STEPS
      .filter(function (step) { return conocidas.indexOf(step.field) === -1; })
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
}

module.exports = { run: run };

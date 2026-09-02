/**
 * js/ui/onboarding-ui.js
 * ─────────────────────────────────────────────────────────────────────────
 * Pinta la primera visita: bienvenida con cuenta y condiciones, y luego
 * una pregunta por pantalla hasta tener el perfil.
 *
 * La lógica de "a quién se le enseña qué" NO está aquí: vive en
 * js/core/onboarding.js y tiene sus propios tests sin navegador. Este
 * archivo es deliberadamente tonto -- lee un paso, pinta un paso, escribe
 * en el formulario y pasa al siguiente.
 *
 * ── Escribe en el formulario de verdad ──────────────────────────────────
 * Cada respuesta se escribe en el control real de index.html y se dispara
 * su evento `change`, como si el usuario lo hubiera tecleado. Así el resto
 * de la aplicación (settings.js, calculator.js, el generador) no se entera
 * de que existe un alta guiada, y no hay dos sitios donde viva el mismo
 * dato. Ver la cabecera de js/data/onboarding-steps.js.
 *
 * ── Por qué no se genera el plan al terminar ────────────────────────────
 * Al acabar las preguntas, el alta desaparece y deja al usuario delante
 * del formulario relleno, con el botón de generar esperando. Generar
 * automáticamente daría un plan salido de la nada, sin que se haya visto
 * de dónde salen los números -- justo la sensación de "esto es mágico y no
 * lo entiendo" que había que quitar.
 *
 * Depende de: js/core/onboarding.js, js/data/onboarding-steps.js,
 *   js/data/legal.js, y (opcionalmente) el diálogo de acceso de
 *   js/ui/render-auth.js.
 *
 * Expone (globales):
 *   initOnboarding(opts) → arranca el flujo si toca; no hace nada si no
 *   openLegalDialog()    → abre el texto legal completo (también desde el pie)
 *   restartOnboarding()  → vuelve a lanzarlo (para "ver el tutorial otra vez")
 * ─────────────────────────────────────────────────────────────────────────
 */

// Red de seguridad. La marca `esperando-bienvenida` la pone un script del
// <head> y la quita este módulo; si por lo que sea este módulo no llegara
// a cargarse o fallara antes de decidir, el usuario se quedaría mirando un
// fondo liso para siempre. Un fallo así no puede depender de que todo lo
// demás funcione, así que el propio script se desarma solo pasados unos
// segundos. Es puro seguro: en un arranque normal la marca ya no está.
if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
  window.setTimeout(function () {
    // Si la bienvenida está delante, todo va bien y no hay nada que
    // rescatar: quitar la marca aquí solo serviría para devolverle el
    // desplazamiento al documento de detrás, que es justo el "hueco" que
    // el usuario veía al arrastrar en el móvil.
    var alta = document.getElementById("onboarding");
    if (alta && !alta.hidden) return;
    if (document.documentElement) {
      document.documentElement.classList.remove("esperando-bienvenida");
    }
  }, 3000);
}

// Se pone al abrir el diálogo de acceso y se consume al entrar: es lo que
// separa "este usuario acaba de pedir entrar" de "Supabase ha restaurado
// una sesión que ya existía".
var _obEsperandoEntrada = false;

// Se pone cuando _obDecidirYPintar() ha llegado a una conclusión. Sirve
// para que nadie tome decisiones sobre esta pantalla antes que ella.
var _obYaDecidido = false;

var _onboardingIndex = 0;
var _onboardingEls = null;
var _onboardingOnFinish = null;

function _obEl(id) {
  return document.getElementById(id);
}

function _obCacheEls() {
  _onboardingEls = {
    root:        _obEl("onboarding"),
    welcome:     _obEl("onboardingWelcome"),
    start:       _obEl("onboardingStart"),
    intake:      _obEl("onboardingIntake"),
    summary:     _obEl("onboardingSummary"),
    accept:      _obEl("onboardingAcceptTerms"),
    openTerms:   _obEl("onboardingOpenTerms"),
    createBtn:   _obEl("onboardingCreateAccountBtn"),
    signInBtn:   _obEl("onboardingSignInBtn"),
    skipBtn:     _obEl("onboardingSkipAccountBtn"),
    startBtn:    _obEl("onboardingStartBtn"),
    progressBar: _obEl("onboardingProgressBar"),
    progressLbl: _obEl("onboardingProgressLabel"),
    question:    _obEl("onboardingQuestion"),
    hint:        _obEl("onboardingHint"),
    answer:      _obEl("onboardingAnswer"),
    error:       _obEl("onboardingIntakeError"),
    backBtn:     _obEl("onboardingBackBtn"),
    nextBtn:     _obEl("onboardingNextBtn"),
    legalDialog: _obEl("legalDialog"),
    legalBody:   _obEl("legalDialogBody"),
    legalClose:  _obEl("legalDialogCloseBtn")
  };
  return _onboardingEls;
}

/**
 * Enseña una de las tres secciones y esconde las otras dos.
 *
 * Y marca la pantalla como abierta. Hace falta porque antes de que el
 * JavaScript decida nada, la bienvenida ya se ve gracias a la marca del
 * <head>: el usuario puede pulsar un botón y entrar en el cuestionario
 * mientras la decisión sobre la sesión sigue pendiente. Si esa decisión
 * llegaba después y era "no hay nada que enseñar", quitaba la marca y el
 * cuestionario se esfumaba a media frase.
 */
function _obShowStep(name) {
  var e = _onboardingEls;
  if (e && e.root) e.root.classList.add("is-open");
  [["welcome", e.welcome], ["start", e.start], ["intake", e.intake]].forEach(function (pair) {
    if (pair[1]) pair[1].hidden = (pair[0] !== name);
  });
}

/** Pinta el resumen honesto de tres líneas de la bienvenida. */
function _obRenderSummary() {
  var box = _onboardingEls.summary;
  if (!box || typeof LEGAL_SUMMARY === "undefined") return;
  box.innerHTML = "";
  LEGAL_SUMMARY.forEach(function (line) {
    var li = document.createElement("li");
    li.textContent = line;
    box.appendChild(li);
  });
}

/**
 * Vuelca el texto legal completo en su diálogo. Se construye con
 * createElement y textContent -- nunca innerHTML con el texto -- para que
 * un futuro párrafo con un `<` no pueda romper la página.
 */
function _obRenderLegal() {
  var body = _onboardingEls.legalBody;
  if (!body || typeof LEGAL_SECTIONS === "undefined") return;
  body.innerHTML = "";

  var intro = document.createElement("p");
  intro.className = "legal-dialog__version";
  intro.textContent = "Versión " + LEGAL_VERSION + " · " + LEGAL_UPDATED_AT;
  body.appendChild(intro);

  LEGAL_SECTIONS.forEach(function (section) {
    var h = document.createElement("h3");
    h.textContent = section.title;
    body.appendChild(h);
    section.paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      body.appendChild(p);
    });
  });
}

function openLegalDialog() {
  var d = _onboardingEls && _onboardingEls.legalDialog;
  if (!d) return;
  _obRenderLegal();
  if (typeof d.showModal === "function") {
    d.showModal();
  } else {
    d.setAttribute("open", "");
  }
}

function _obCloseLegalDialog() {
  var d = _onboardingEls && _onboardingEls.legalDialog;
  if (!d) return;
  if (typeof d.close === "function") {
    d.close();
  } else {
    d.removeAttribute("open");
  }
}

/**
 * Las tres acciones de cuenta están apagadas hasta que se marca la
 * casilla. Es lo que convierte la aceptación en un requisito de verdad y
 * no en una casilla que se puede ignorar -- incluso "continuar sin
 * cuenta" pasa por ahí, porque las condiciones no van de la cuenta, van
 * de usar la aplicación.
 */
function _obSyncTermsGate() {
  var e = _onboardingEls;
  var ok = !!(e.accept && e.accept.checked);
  [e.createBtn, e.signInBtn, e.skipBtn].forEach(function (btn) {
    if (btn) btn.disabled = !ok;
  });
}

/** Sella la aceptación y anota qué eligió el usuario sobre la cuenta. */
function _obAcceptAnd(choice) {
  if (typeof acceptTerms === "function" && typeof LEGAL_VERSION === "string") {
    acceptTerms(LEGAL_VERSION);
  }
  if (typeof recordAccountChoice === "function") {
    recordAccountChoice(choice);
  }
}

// ── Las preguntas ─────────────────────────────────────────────────────

function _obSteps() {
  return typeof ONBOARDING_STEPS !== "undefined" ? ONBOARDING_STEPS : [];
}

/** El control de index.html donde vive la respuesta de este paso. */
function _obFieldEl(step) {
  if (step.field === "budgetMode") {
    return document.querySelector('input[name="budgetMode"]:checked');
  }
  return _obEl(step.field);
}

/** Lee lo que ya hay en el formulario, para precargar la respuesta. */
function _obCurrentValue(step) {
  var el = _obFieldEl(step);
  return el ? el.value : "";
}

/**
 * "€12/día" para el tramo de presupuesto, o "" para cualquier otro paso.
 * Sin la cifra, "Ajustado" no le dice nada a quien entra por primera vez
 * -- que es justo el público de esta pantalla.
 */
function _obBudgetAmount(step, value) {
  if (step.field !== "budgetMode") return "";
  if (typeof BUDGET_PRESETS === "undefined" || typeof DEFAULT_BUDGET_PERIOD === "undefined") return "";
  var presets = BUDGET_PRESETS[DEFAULT_BUDGET_PERIOD];
  var preset = presets && presets[value];
  return preset ? "€" + preset.amount + "/día" : "";
}

function _obRenderStep() {
  var steps = _obSteps();
  var step = steps[_onboardingIndex];
  var e = _onboardingEls;
  if (!step) return;

  var pct = Math.round((_onboardingIndex / steps.length) * 100);
  if (e.progressBar) e.progressBar.style.width = pct + "%";
  if (e.progressLbl) {
    e.progressLbl.textContent = "Pregunta " + (_onboardingIndex + 1) + " de " + steps.length;
  }

  if (e.question) e.question.textContent = step.title;
  if (e.hint) {
    e.hint.textContent = step.hint || "";
    e.hint.hidden = !step.hint;
  }
  if (e.error) e.error.hidden = true;
  if (e.backBtn) e.backBtn.disabled = (_onboardingIndex === 0);
  if (e.nextBtn) {
    e.nextBtn.textContent = (_onboardingIndex === steps.length - 1) ? "Terminar" : "Siguiente";
  }

  var box = e.answer;
  if (!box) return;
  box.innerHTML = "";
  var current = _obCurrentValue(step);

  if (step.kind === "choice") {
    box.className = "onboarding__answer onboarding__answer--choices";
    step.options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "onboarding__choice";
      btn.setAttribute("data-value", opt.value);
      if (String(current) === String(opt.value)) {
        btn.classList.add("is-selected");
      }

      var label = document.createElement("span");
      label.className = "onboarding__choice-label";
      label.textContent = opt.label;
      btn.appendChild(label);

      // El importe del presupuesto se lee de BUDGET_PRESETS, la MISMA
      // fuente que rellena las pastillas del formulario. Escribirlo a mano
      // en onboarding-steps.js habría creado un segundo sitio donde vive
      // la cifra, y el día que alguien recalibre los tramos el asistente
      // seguiría prometiendo los viejos.
      var amount = _obBudgetAmount(step, opt.value);
      if (amount) {
        var money = document.createElement("span");
        money.className = "onboarding__choice-amount";
        money.textContent = amount;
        btn.appendChild(money);
      }

      if (opt.note) {
        var note = document.createElement("span");
        note.className = "onboarding__choice-note";
        note.textContent = opt.note;
        btn.appendChild(note);
      }

      // Elegir una opción avanza sola: en una pregunta de un solo toque,
      // obligar además a pulsar "Siguiente" es un clic de más por pantalla.
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove("is-selected"); });
        btn.classList.add("is-selected");
        _obWriteAnswer(step, opt.value);
        window.setTimeout(_obNext, 160);
      });
      box.appendChild(btn);
    });
    return;
  }

  box.className = "onboarding__answer onboarding__answer--number";
  var input = document.createElement("input");
  input.type = "number";
  input.className = "onboarding__number";
  input.id = "onboardingNumberInput";
  input.min = step.min;
  input.max = step.max;
  if (step.step) input.step = step.step;
  input.value = current;
  input.setAttribute("inputmode", "decimal");
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      _obNext();
    }
  });
  box.appendChild(input);

  if (step.unit) {
    var unit = document.createElement("span");
    unit.className = "onboarding__unit";
    unit.textContent = step.unit;
    box.appendChild(unit);
  }
  // Sin focus() automático: en móvil abriría el teclado de golpe y taparía
  // la pregunta que se acaba de hacer.
}

/**
 * Escribe la respuesta en el control real y dispara `change`, que es lo
 * que hace que el resto de la aplicación se entere (recálculo de los
 * importes del presupuesto...).
 *
 * ── Y la GUARDA, en el acto ─────────────────────────────────────────────
 * Esto faltaba, y costó un fallo que el usuario notó enseguida: la
 * aplicación solo guardaba el perfil al generar un plan, así que las siete
 * respuestas vivían únicamente en el formulario en pantalla. Bastaba con
 * que la página se recargara -- y entrar con Google recarga la página
 * entera, porque vuelve de un redirect -- para que todo lo contestado
 * desapareciera y el cuestionario volviera a empezar desde la primera
 * pregunta. Su descripción fue exacta: "окно пропадает на чуть-чуть но
 * потом снова появляется".
 *
 * Guardar respuesta a respuesta también arregla la causa de fondo:
 * `hasProfile` se calcula leyendo los ajustes guardados, así que hasta que
 * no se guardaba nada, para la aplicación este usuario nunca había
 * contestado.
 */
function _obWriteAnswer(step, value) {
  if (step.field === "budgetMode") {
    var radio = document.querySelector('input[name="budgetMode"][value="' + value + '"]');
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else {
    var el = _obEl(step.field);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  _obPersistAnswer(step, value);
}

/**
 * Le da al valor el TIPO que settings.js espera para esa clave.
 *
 * Hace falta porque una pregunta de opciones devuelve siempre texto (es
 * lo que vale un `value` de HTML), y sanitizeSettings() exige
 * `typeof === "number"` para los campos numéricos: descarta el resto sin
 * decir nada. El nivel de actividad es el único paso que es a la vez de
 * opciones y numérico, y se perdía por eso -- comprobado en producción,
 * `activity` no aparecía entre los ajustes guardados mientras los otros
 * seis sí.
 */
function _obCoerceForSettings(field, value) {
  var numericos = (typeof SETTINGS_NUMERIC_FIELDS !== "undefined") ? SETTINGS_NUMERIC_FIELDS : [];
  if (numericos.indexOf(field) === -1) return value;
  var n = (typeof value === "number") ? value : parseFloat(String(value).replace(",", "."));
  return isFinite(n) ? n : value;
}

/**
 * Mete la respuesta en los ajustes guardados sin tocar el resto. Las
 * claves de ONBOARDING_STEPS.field coinciden a propósito con las que usa
 * settings.js (`sex`, `age`, ..., `budgetMode`), así que no hace falta
 * traducir nada -- y si algún día dejaran de coincidir, el valor se
 * descartaría al sanear en vez de corromper el perfil.
 */
function _obPersistAnswer(step, value) {
  if (typeof saveSettings !== "function" || typeof getSettings !== "function") return;
  var actual = getSettings() || {};
  var merged = {};
  Object.keys(actual).forEach(function (k) { merged[k] = actual[k]; });
  merged[step.field] = _obCoerceForSettings(step.field, value);
  saveSettings(merged);

  // Con sesión iniciada, además a la nube: si no, al entrar desde otro
  // dispositivo el perfil recién contestado no estaría.
  if (typeof pushSettingsToCloud === "function") {
    try { pushSettingsToCloud(); } catch (err) { /* la copia local ya está */ }
  }
}

/**
 * Valida un paso numérico contra SUS PROPIOS límites (los mismos que el
 * <input> del formulario, comprobado por tests). Devuelve "" si vale.
 */
function _obValidateNumber(step, raw) {
  var n = parseFloat(String(raw).replace(",", "."));
  if (!isFinite(n)) {
    return "Escribe un número.";
  }
  if (n < step.min || n > step.max) {
    return "Tiene que estar entre " + step.min + " y " + step.max + " " + (step.unit || "") + ".";
  }
  return "";
}

function _obNext() {
  var steps = _obSteps();
  var step = steps[_onboardingIndex];
  var e = _onboardingEls;
  if (!step) return;

  if (step.kind === "number") {
    var input = _obEl("onboardingNumberInput");
    var problem = _obValidateNumber(step, input ? input.value : "");
    if (problem) {
      if (e.error) {
        e.error.textContent = problem;
        e.error.hidden = false;
      }
      if (input) input.focus();
      return;
    }
    _obWriteAnswer(step, parseFloat(String(input.value).replace(",", ".")));
  }

  // Una pregunta de opciones tiene que estar CONTESTADA para avanzar.
  //
  // Sin esto, el presupuesto se colaba sin elegir: pulsar "Terminar"
  // cerraba el cuestionario dejando el formulario sin ningún tramo
  // marcado, y el botón de generar respondía "Elige un presupuesto".
  // Para el usuario, "Terminar" simplemente no hacía nada. Los otros seis
  // pasos no lo enseñaban porque el formulario ya trae un valor por
  // defecto para todos ellos; el presupuesto es el único que nace vacío.
  if (step.kind === "choice") {
    var elegido = _obEl("onboardingAnswer") &&
                  _obEl("onboardingAnswer").querySelector(".is-selected");
    if (!elegido) {
      if (e.error) {
        e.error.textContent = "Elige una opción para continuar.";
        e.error.hidden = false;
      }
      return;
    }
  }

  if (_onboardingIndex >= steps.length - 1) {
    _obFinishIntake();
    return;
  }
  _onboardingIndex++;
  _obRenderStep();
}

function _obBack() {
  if (_onboardingIndex === 0) return;
  _onboardingIndex--;
  _obRenderStep();
}

function _obFinishIntake() {
  if (typeof completeIntake === "function") {
    completeIntake();
  }
  _obHide();
  if (typeof _onboardingOnFinish === "function") {
    _onboardingOnFinish();
  }
}

/**
 * Devuelve la aplicación a la vista.
 *
 * El script del <head> marca `esperando-bienvenida` en el <html> antes de
 * pintar, para que no se vea la aplicación un instante antes de la
 * bienvenida. Esa marca la quita SIEMPRE este módulo, en cuanto decide
 * que no hay (o ya no hay) nada que enseñar. Olvidarlo dejaría la
 * aplicación escondida para siempre, que es un fallo mucho peor que el
 * destello que se estaba arreglando -- por eso se llama desde los dos
 * caminos: al esconder el alta y al decidir no enseñarla.
 */
function _obRevealApp() {
  if (!document.documentElement) return;
  // LAS DOS marcas que esconden la aplicación, no solo una. Quitar
  // `esperando-bienvenida` y dejarse `is-onboarding` deja la pantalla
  // igual de vacía -- comprobado forzando el fallo: el overlay se
  // escondía solo, correctamente, y detrás seguía sin haber nada.
  document.documentElement.classList.remove("esperando-bienvenida");
  document.documentElement.classList.remove("is-onboarding");
  document.body.classList.remove("is-onboarding");
}

function _obHide() {
  _obRevealApp();
  var root = _onboardingEls && _onboardingEls.root;
  if (!root) return;
  root.classList.add("is-leaving");
  window.setTimeout(function () {
    root.hidden = true;
    root.classList.remove("is-open");
    root.classList.remove("is-leaving");
    document.body.classList.remove("is-onboarding");
    if (document.documentElement) {
      document.documentElement.classList.remove("is-onboarding");
    }
  }, 260);
}

function _obShow() {
  var root = _onboardingEls && _onboardingEls.root;
  if (!root) return;
  // `is-open` es el ÚNICO interruptor de esta pantalla (ver style.css).
  root.classList.add("is-open");

  // Un overlay a pantalla completa con las tres secciones escondidas es,
  // literalmente, una pantalla en blanco: tapa la aplicación y no enseña
  // nada. No debería poder pasar, y justo por eso se comprueba -- un fallo
  // que "no debería poder pasar" y que deja al usuario sin nada delante
  // vale más comprobarlo que razonarlo.
  var e = _onboardingEls;
  var hayAlgoQueEnsenar =
    (e.welcome && !e.welcome.hidden) ||
    (e.start && !e.start.hidden) ||
    (e.intake && !e.intake.hidden);
  if (!hayAlgoQueEnsenar) {
    root.classList.remove("is-open");
    _obRevealApp();
    root.hidden = true;
    return;
  }

  root.hidden = false;
  // En <html> además de en <body>: en móvil el rebote elástico lo produce
  // el elemento raíz, y bloquear solo el <body> dejaba asomar la página
  // de debajo al arrastrar rápido.
  document.body.classList.add("is-onboarding");
  if (document.documentElement) {
    document.documentElement.classList.add("is-onboarding");
  }
}

/**
 * Qué hacer después de la pantalla de cuenta.
 *
 * NO es "ir siempre a las preguntas". Se le vuelve a preguntar a la
 * máquina de estados, porque a quien ya tiene perfil (todos los usuarios
 * anteriores a esta pantalla) le tocaba aceptar las condiciones y nada
 * más. Estuvo mal escrito un rato: la lógica decía "done" y la interfaz
 * le mandaba igualmente a rellenar siete preguntas que ya había
 * contestado -- justo el maltrato que el test
 * "a quien ya tiene perfil NO se le hace repetir la anécdota" protege un
 * piso más abajo. La lección es que ese test no basta si la interfaz
 * decide por su cuenta.
 */
/**
 * Qué hacer después de la pantalla de cuenta: SIEMPRE las preguntas.
 *
 * ── Por qué "siempre" y no "si hacen falta" ─────────────────────────────
 * Antes se le volvía a preguntar a `nextOnboardingStep`, y con un perfil
 * ya guardado la respuesta era "done": el usuario creaba la cuenta y la
 * aplicación se abría sin más. Desde fuera eso es un botón que no lleva a
 * ninguna parte -- "после создания аккаунта не кидает на вопросы" -- y
 * pasaba justo a quien más tiempo llevaba usando esto, porque es quien
 * tiene perfil guardado.
 *
 * `nextOnboardingStep` sigue decidiendo si esta pantalla se enseña o no,
 * que es su trabajo. Pero una vez enseñada, el recorrido se termina: la
 * bienvenida existe para llevar a las preguntas, y cortarla por la mitad
 * según un estado que el usuario no puede ver es justo lo que hace que
 * una interfaz parezca rota.
 *
 * Repetirlas es barato: cada respuesta viene precargada con lo que ya
 * contestó, así que son siete toques, no siete decisiones.
 */
function _obAfterAccountChoice() {
  _obGoToIntake();
}

/**
 * "Ya tiene perfil" = hay guardadas las tres medidas que no tienen un
 * valor por defecto razonable. Mirar solo si existe el objeto de ajustes
 * no valdría: se crea en cuanto se toca cualquier campo.
 */
/** ¿Constan ya unas condiciones aceptadas, de esta misma versión? */
function e_yaAcepto(state) {
  if (typeof needsTermsAcceptance !== "function") return false;
  var version = (typeof LEGAL_VERSION === "string") ? LEGAL_VERSION : "";
  return !needsTermsAcceptance(state, version);
}

function _obHayCuenta() {
  return typeof getCurrentUser === "function" && !!getCurrentUser();
}

/** Pasa de la bienvenida al botón único, y de ahí a las preguntas. */
function _obGoToIntake() {
  _onboardingIndex = 0;
  _obShowStep("start");
}

/**
 * Cablea los botones UNA sola vez.
 *
 * initOnboarding() se llama más de una vez -- al arrancar y otra vez al
 * cerrar sesión o borrar la cuenta -- y cada llamada volvía a añadir los
 * mismos `addEventListener`. Medido: tras la segunda llamada, un solo
 * clic en "Crear una cuenta" abría el diálogo DOS veces. Los listeners no
 * se sustituyen, se acumulan.
 */
var _obCableado = false;

function _obWire() {
  if (_obCableado) return;
  _obCableado = true;
  var e = _onboardingEls;

  if (e.accept) e.accept.addEventListener("change", _obSyncTermsGate);
  if (e.openTerms) e.openTerms.addEventListener("click", openLegalDialog);
  if (e.legalClose) e.legalClose.addEventListener("click", _obCloseLegalDialog);

  var legalDone = _obEl("legalDialogDoneBtn");
  if (legalDone) legalDone.addEventListener("click", _obCloseLegalDialog);

  // Tocar FUERA del diálogo también cierra. Un <dialog> no lo hace solo, y
  // ese es el gesto que todo el mundo prueba primero en un móvil: sin
  // esto, quien abría las condiciones se quedaba con un modal encima que
  // se tragaba los toques dirigidos a los botones de debajo.
  if (e.legalDialog) {
    e.legalDialog.addEventListener("click", function (ev) {
      // El propio <dialog> ocupa solo su caja; un clic cuyo `target` es el
      // diálogo (y no algo de dentro) viene del backdrop.
      if (ev.target === e.legalDialog) _obCloseLegalDialog();
    });
  }

  if (e.skipBtn) {
    e.skipBtn.addEventListener("click", function () {
      _obAcceptAnd("skipped");
      _obAfterAccountChoice();
    });
  }

  // Crear cuenta / iniciar sesión reutilizan el diálogo de acceso que ya
  // existe (js/ui/render-auth.js) en vez de duplicar el formulario. El
  // alta continúa por debajo: si la cuenta se crea, el usuario vuelve
  // aquí y sigue con sus datos; si se lo piensa, tampoco pierde el sitio.
  // Crear cuenta / iniciar sesión reutilizan el diálogo de acceso que ya
  // existe (js/ui/render-auth.js) en vez de duplicar el formulario.
  //
  // Y se ESPERA a que ese diálogo se cierre antes de seguir. Antes se
  // pasaba a las preguntas en el acto, con el diálogo de acceso encima:
  // quien entraba con Google se iba de la página a mitad del
  // cuestionario y, al volver del redirect, se lo encontraba otra vez
  // desde la primera pregunta. Además, al iniciar sesión la aplicación
  // reconcilia el perfil con la nube, y esa reconciliación reescribía el
  // formulario por debajo mientras el usuario lo estaba rellenando.
  // Los tres botones hacen LO MISMO: pasar a las preguntas en el acto.
  // Los dos de cuenta, además, abren el diálogo de acceso por encima.
  //
  // Antes esperaban a que el diálogo se cerrara para avanzar, y esa espera
  // es lo que fallaba: el evento `close` no siempre llega, la sesión
  // aparece cuando quiere, y cada camino (email, Google, cerrar sin hacer
  // nada) cerraba el diálogo de una forma distinta. "Continuar sin cuenta"
  // era el único que funcionaba siempre, y era justamente el único que no
  // esperaba a nada. Lo dijo el usuario: "ты не можешь сделать также как и
  // с sin cuenta? потому что только эта кнопка нормально работает".
  //
  // Sin espera no hay nada que se pueda perder: las preguntas quedan
  // detrás del diálogo, y al cerrarlo -- entre o no entre -- ya están ahí.
  function _obConCuenta(choice, mode) {
    return function () {
      _obAcceptAnd(choice);
      _obAfterAccountChoice();
      _obEsperandoEntrada = true;
      if (typeof openAuthDialog === "function") {
        openAuthDialog(mode);
      }
    };
  }

  if (e.createBtn) e.createBtn.addEventListener("click", _obConCuenta("created", "register"));
  if (e.signInBtn) e.signInBtn.addEventListener("click", _obConCuenta("signed-in", "login"));

  if (e.startBtn) {
    e.startBtn.addEventListener("click", function () {
      _obShowStep("intake");
      _obRenderStep();
    });
  }
  if (e.nextBtn) e.nextBtn.addEventListener("click", _obNext);
  if (e.backBtn) e.backBtn.addEventListener("click", _obBack);
}

/**
 * Arranca el alta si al usuario le toca verla. Si no, no toca nada: no
 * enseña el contenedor ni siquiera un instante.
 *
 * @param {{ hasProfile?: boolean, onFinish?: function }} opts
 */
function initOnboarding(opts) {
  var o = opts || {};
  // Si no existe el esqueleto del alta, la marca del <head> se quedaría
  // puesta y la aplicación invisible. Se descubre antes que nada.
  if (!_obEl("onboarding")) { _obRevealApp(); return; }

  _obCacheEls();
  _obWire();
  _onboardingOnFinish = typeof o.onFinish === "function" ? o.onFinish : null;

  // ── No decidir mientras no se sepa si hay sesión ────────────────────
  // getCurrentUser() no vale al arrancar: se rellena cuando Supabase
  // emite su primer evento, y eso llega DESPUÉS de DOMContentLoaded. Al
  // preguntarlo aquí sin más, la respuesta era siempre "no hay cuenta", y
  // un usuario con la sesión iniciada se encontraba la pantalla de
  // "inicia sesión" cada vez que recargaba. No era intermitente: pasaba
  // siempre, porque la carrera la perdía siempre el mismo.
  //
  // "sin cuenta" y "todavía no lo sé" son cosas distintas y hay que
  // tratarlas distinto: ante la duda se espera, que es lo único honesto.
  // Mientras se espera, la aplicación sigue tapada por la marca del
  // <head>, así que no se ve nada a medias; y si el evento no llegara
  // nunca, el temporizador decide igualmente.
  if (_obSesionDesconocida()) {
    _obCuandoSeSepaLaSesion(function () { _obDecidirYPintar(o); });
    return;
  }
  _obDecidirYPintar(o);
}

/**
 * ¿Están las cuentas disponibles pero todavía no sabemos si hay sesión?
 */
function _obSesionDesconocida() {
  if (typeof isAuthSessionResolved !== "function") return false;
  return !isAuthSessionResolved();
}

/**
 * Llama a `luego` en cuanto llegue el primer evento de sesión, o pasado un
 * tiempo prudencial si no llega. Una sola vez.
 */
function _obCuandoSeSepaLaSesion(luego) {
  var yaFue = false;
  var cancelar = null;

  function seguir() {
    if (yaFue) return;
    yaFue = true;
    if (typeof cancelar === "function") cancelar();
    if (espera) window.clearTimeout(espera);
    luego();
  }

  if (typeof onAuthStateChange === "function") {
    cancelar = onAuthStateChange(function () { seguir(); });
  }
  // Si Supabase no contesta, se decide igual: mejor enseñar la bienvenida
  // de más que dejar al usuario esperando delante de un fondo liso.
  var espera = window.setTimeout(seguir, 2000);

}

function _obDecidirYPintar(o) {
  _obYaDecidido = true;
  // Si el usuario ya está dentro (pulsó un botón mientras se esperaba a
  // saber si había sesión), esta decisión llega tarde y no manda: cerrarle
  // el cuestionario a media frase es peor que cualquier respuesta que
  // pudiéramos dar aquí.
  if (_onboardingEls && _onboardingEls.root &&
      _onboardingEls.root.classList.contains("is-open")) {
    return;
  }

  var state = typeof getOnboardingState === "function" ? getOnboardingState() : {};
  var step = typeof nextOnboardingStep === "function"
    ? nextOnboardingStep(state, { hasProfile: !!o.hasProfile, hasAccount: _obHayCuenta() })
    : "done";

  if (step === "welcome") {
    _obRenderSummary();
    // Si ya aceptó las condiciones en una visita anterior, la casilla sale
    // marcada: se le vuelve a ofrecer la cuenta, no se le vuelve a pedir
    // que acepte algo que ya aceptó.
    if (e_yaAcepto(state) && _onboardingEls.accept) {
      _onboardingEls.accept.checked = true;
    }
    _obSyncTermsGate();
    _obShowStep("welcome");
    _obShow();
    return;
  }
  if (step === "intake") {
    _obGoToIntake();
    _obShow();
    return;
  }
  // "tour" y "done" no pintan nada aquí: el recorrido guiado es otro
  // módulo. Este usuario no ve la bienvenida, así que la aplicación tiene
  // que aparecer ya.
  _obRevealApp();
}

/**
 * Lleva a las preguntas después de que aparezca una sesión, venga de donde
 * venga.
 *
 * Antes esto colgaba SOLO de los botones de la pantalla de bienvenida: si
 * la sesión llegaba por otro camino -- el botón de la cabecera, una vuelta
 * de Google, una sesión que se restaura -- no había nadie escuchando y la
 * aplicación se abría sin preguntar nada. El usuario lo describió exacto:
 * "просто заходит на обычный сайт сразу без вопросов, и там стандартные
 * ответы".
 *
 * Colgarlo del HECHO (hay sesión nueva) en vez de del GESTO (se pulsó tal
 * botón) es lo que hace que el comportamiento sea el mismo por todos los
 * caminos.
 */
/**
 * Marca que el usuario ha pedido entrar. Lo llama openAuthDialog(), así
 * que vale para los dos caminos: los botones de la bienvenida y el de la
 * cabecera. Abrir ese diálogo es siempre una petición deliberada; una
 * sesión restaurada al cargar la página no lo es.
 */
var _OB_INTENCION = "nutritionPlanner.pidiendoEntrar";

/**
 * Marca que el usuario ha pedido entrar, EN DISCO.
 *
 * En memoria no vale: entrar con Google se va de la página entera y
 * vuelve, así que cualquier variable se pierde por el camino. Es
 * exactamente lo que pasaba -- en la traza del usuario se ve
 * `markSignInRequested` y, dos líneas después, el reloj empezando de cero
 * porque la página se había recargado.
 */
function markSignInRequested() {
  _obEsperandoEntrada = true;
  try { sessionStorage.setItem(_OB_INTENCION, "1"); } catch (err) {}
}

/** ¿Consta que el usuario pidió entrar? Se consume al leerla. */
function _obConsumirIntencion() {
  var enDisco = false;
  try { enDisco = sessionStorage.getItem(_OB_INTENCION) === "1"; } catch (err) {}
  var habia = _obEsperandoEntrada || enDisco;
  _obEsperandoEntrada = false;
  try { sessionStorage.removeItem(_OB_INTENCION); } catch (err) {}
  return habia;
}

function startIntakeAfterSignIn() {
  
  // Solo si el usuario ACABA de pedir entrar desde esta pantalla.
  //
  // Supabase emite SIGNED_IN también al restaurar una sesión al cargar la
  // página -- se vio en la traza del usuario: `startIntakeAfterSignIn` a
  // los 800 ms de arrancar, sin que él hubiera tocado nada. Sin este
  // filtro, el cuestionario sale en cada recarga a quien tiene cuenta.
  //
  // El evento no distingue las dos cosas, así que la distinción la pone
  // quien sí la sabe: la interfaz, cuando abre el diálogo de acceso.
  var pedido = _obConsumirIntencion();
  if (!pedido) return false;
  if (!_obEl("onboarding")) return;
  if (!_onboardingEls) _obCacheEls();
  _obWire();

  // Si ya está en el cuestionario, NO se toca. Ahora el diálogo de acceso
  // se abre POR ENCIMA de las preguntas, así que iniciar sesión en mitad
  // de ellas es lo normal -- y reiniciarlo aquí devolvería al usuario a la
  // pregunta 1 borrándole lo que llevara contestado.
  var yaEnElCuestionario =
    (_onboardingEls.start && !_onboardingEls.start.hidden) ||
    (_onboardingEls.intake && !_onboardingEls.intake.hidden);
  if (yaEnElCuestionario && !_onboardingEls.root.hidden &&
      _onboardingEls.root.classList.contains("is-open")) {
    return true;
  }

  _obGoToIntake();
  _obShow();
  return true;
}

/**
 * Si la bienvenida está delante ofreciendo cuenta y resulta que YA hay
 * sesión, sobra: se quita.
 *
 * Pasa cuando la sesión se resuelve tarde. La bienvenida espera hasta dos
 * segundos a saber si hay cuenta y, si no le contestan, decide que no la
 * hay -- es lo correcto, porque dejar a alguien mirando un fondo liso es
 * peor. Pero si la respuesta llega justo después, el usuario se queda
 * mirando "inicia sesión" con la sesión ya iniciada. Esto lo corrige en
 * cuanto se sabe.
 */
function dismissWelcomeIfSignedIn() {
  if (!_onboardingEls || !_onboardingEls.root) return;
  if (_onboardingEls.root.hidden) return;

  // Solo DESPUÉS de que se haya decidido qué enseñar.
  //
  // Antes se adelantaba, y en la vuelta de un inicio de sesión con Google
  // eso era fatal: la página se recarga, la sección de bienvenida todavía
  // no lleva el atributo `hidden` -- no lo lleva nunca, para que la
  // pantalla se vea sin JavaScript -- y esta función lo leía como "está
  // enseñándose la bienvenida" y lo cerraba todo. Se ve en la traza del
  // usuario: INITIAL_SESSION, dismissWelcomeIfSignedIn, _obHide, y solo
  // entonces _obDecidirYPintar, ya sin nada que decidir.
  if (!_obYaDecidido) return;
  // Solo la pantalla de la cuenta: si está en las preguntas, se le deja
  // terminar.
  if (!_onboardingEls.welcome || _onboardingEls.welcome.hidden) return;
  if (!_obHayCuenta()) return;
  _obHide();
}

/**
 * Vuelve a lanzar el alta desde el principio -- para el enlace de "ver la
 * introducción otra vez". No borra los datos del usuario, solo el registro
 * de que ya la vio.
 */
function restartOnboarding() {
  if (typeof resetOnboarding === "function") {
    resetOnboarding();
  }
  _onboardingIndex = 0;
  if (!_onboardingEls) _obCacheEls();
  _obRenderSummary();
  if (_onboardingEls.accept) _onboardingEls.accept.checked = false;
  _obSyncTermsGate();
  _obShowStep("welcome");
  _obShow();
}

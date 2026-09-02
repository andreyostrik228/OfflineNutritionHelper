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

var _onboardingIndex = 0;
var _onboardingEls = null;
var _onboardingOnFinish = null;
// Se recuerda desde initOnboarding(): la pantalla de cuenta tiene que
// poder volver a preguntar "¿y ahora qué?" con el mismo contexto.
var _onboardingHasProfile = false;

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

/** Enseña una de las tres secciones y esconde las otras dos. */
function _obShowStep(name) {
  var e = _onboardingEls;
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
 * que hace que el resto de la aplicación se entere (guardado de ajustes,
 * recálculo de los importes del presupuesto...).
 */
function _obWriteAnswer(step, value) {
  if (step.field === "budgetMode") {
    var radio = document.querySelector('input[name="budgetMode"][value="' + value + '"]');
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }
  var el = _obEl(step.field);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("input", { bubbles: true }));
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

function _obHide() {
  var root = _onboardingEls && _onboardingEls.root;
  if (!root) return;
  root.classList.add("is-leaving");
  window.setTimeout(function () {
    root.hidden = true;
    root.classList.remove("is-leaving");
    document.body.classList.remove("is-onboarding");
  }, 260);
}

function _obShow() {
  var root = _onboardingEls && _onboardingEls.root;
  if (!root) return;
  root.hidden = false;
  document.body.classList.add("is-onboarding");
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
function _obAfterAccountChoice() {
  var next = "intake";
  if (typeof nextOnboardingStep === "function" && typeof getOnboardingState === "function") {
    next = nextOnboardingStep(getOnboardingState(), { hasProfile: _onboardingHasProfile });
  }
  if (next === "intake") {
    _obGoToIntake();
    return;
  }
  _obHide();
}

/** Pasa de la bienvenida al botón único, y de ahí a las preguntas. */
function _obGoToIntake() {
  _onboardingIndex = 0;
  _obShowStep("start");
}

function _obWire() {
  var e = _onboardingEls;

  if (e.accept) e.accept.addEventListener("change", _obSyncTermsGate);
  if (e.openTerms) e.openTerms.addEventListener("click", openLegalDialog);
  if (e.legalClose) e.legalClose.addEventListener("click", _obCloseLegalDialog);

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
  if (e.createBtn) {
    e.createBtn.addEventListener("click", function () {
      _obAcceptAnd("created");
      if (typeof openAuthDialog === "function") {
        openAuthDialog("register");
      }
      _obAfterAccountChoice();
    });
  }
  if (e.signInBtn) {
    e.signInBtn.addEventListener("click", function () {
      _obAcceptAnd("signed-in");
      if (typeof openAuthDialog === "function") {
        openAuthDialog("login");
      }
      _obAfterAccountChoice();
    });
  }

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
  if (!_obEl("onboarding")) return;

  _obCacheEls();
  _obWire();
  _onboardingOnFinish = typeof o.onFinish === "function" ? o.onFinish : null;
  _onboardingHasProfile = !!o.hasProfile;

  var state = typeof getOnboardingState === "function" ? getOnboardingState() : {};
  var step = typeof nextOnboardingStep === "function"
    ? nextOnboardingStep(state, { hasProfile: !!o.hasProfile })
    : "done";

  if (step === "welcome") {
    _obRenderSummary();
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
  // "tour" y "done" no pintan nada aquí: el recorrido guiado es otro módulo.
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

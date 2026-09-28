/**
 * js/ui/form-controls.js
 * ─────────────────────────────────────────────────────────────────────────
 * Controles táctiles del formulario (2026-09-28). Pedido del dueño: "que los
 * botones sean más cómodos, no solo otro color".
 *
 *   - Cada <select> corto (2 a 5 opciones: sexo, objetivo, actividad,
 *     tiempo, gusto, cocina, prioridad) se enseña como BALDOSAS que se
 *     tocan con el pulgar, en vez de un desplegable que abre una rueda.
 *   - Edad, peso, altura y entrenamientos llevan botones − y + a los lados.
 *
 * Es MEJORA PROGRESIVA: el <select> y el <input> siguen siendo la fuente de
 * verdad y los lee el resto de la aplicación como siempre. Sin este fichero
 * (o sin JavaScript) el formulario funciona exactamente igual que antes.
 *
 * Lo delicado es la sincronía: la aplicación escribe `select.value` por su
 * cuenta (al restaurar los ajustes, al terminar el cuestionario de la
 * bienvenida, al pulsar Resetear) y eso NO dispara ningún evento. Por eso
 * se intercepta el setter de `value` y `selectedIndex` de ESE select, y un
 * MutationObserver repinta las etiquetas cuando cambia el idioma.
 *
 * Expone (globales):
 *   initFormControls()
 * ─────────────────────────────────────────────────────────────────────────
 */

var FORM_BALDOSAS = ["sex", "goal", "activity", "cookTime", "taste", "cuisine", "priority"];
var FORM_PASOS = { age: 1, weight: 1, height: 1, workouts: 1 };

function initFormControls() {
  FORM_BALDOSAS.forEach(function (id) {
    var s = document.getElementById(id);
    if (s && s.tagName === "SELECT") mejorarSelectConBaldosas(s);
  });
  Object.keys(FORM_PASOS).forEach(function (id) {
    var i = document.getElementById(id);
    if (i && i.tagName === "INPUT") mejorarNumeroConBotones(i, FORM_PASOS[id]);
  });
}

function _etiquetaDe(campo) {
  var label = document.querySelector('label[for="' + campo.id + '"]');
  return label ? label.textContent.trim() : campo.id;
}

function _avisarCambio(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ── Baldosas ─────────────────────────────────────────────────────────────

function mejorarSelectConBaldosas(select) {
  if (select._baldosas) return;
  var campo = select.closest(".field");

  var label = document.querySelector('label[for="' + select.id + '"]');
  if (label) {
    if (!label.id) label.id = select.id + "Etiqueta";
    // Con el <select> escondido, `for` mandaría el foco a un control
    // invisible al tocar la etiqueta.
    label.removeAttribute("for");
  }

  var grupo = document.createElement("div");
  grupo.className = "baldosas";
  grupo.setAttribute("role", "radiogroup");
  if (label) grupo.setAttribute("aria-labelledby", label.id);
  select.parentNode.insertBefore(grupo, select.nextSibling);
  select._baldosas = grupo;

  select.classList.add("select--baldosas");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  if (campo) campo.classList.add("field--ancho");

  function construir() {
    grupo.innerHTML = "";
    Array.prototype.forEach.call(select.options, function (op) {
      if (op.disabled || op.hidden) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "baldosa";
      b.setAttribute("role", "radio");
      b.setAttribute("data-valor", op.value);
      b.textContent = op.textContent.trim();
      grupo.appendChild(b);
    });
    sincronizar();
  }

  function sincronizar() {
    var actual = _valorOriginal.get.call(select);
    var botones = grupo.querySelectorAll(".baldosa");
    var hayActivo = false;
    Array.prototype.forEach.call(botones, function (b) {
      var si = b.getAttribute("data-valor") === actual;
      if (si) hayActivo = true;
      b.classList.toggle("is-activa", si);
      b.setAttribute("aria-checked", si ? "true" : "false");
      b.tabIndex = si ? 0 : -1;
    });
    if (!hayActivo && botones.length) botones[0].tabIndex = 0;
    // Las etiquetas se releen de las <option>: la traducción las cambia.
    Array.prototype.forEach.call(select.options, function (op) {
      var b = grupo.querySelector('.baldosa[data-valor="' + (window.CSS && CSS.escape ? CSS.escape(op.value) : op.value) + '"]');
      if (b && b.textContent !== op.textContent.trim()) b.textContent = op.textContent.trim();
    });
  }

  function elegir(valor, enfocar) {
    _valorOriginal.set.call(select, valor);
    sincronizar();
    _avisarCambio(select);
    if (enfocar) {
      var b = grupo.querySelector(".baldosa.is-activa");
      if (b) b.focus();
    }
  }

  grupo.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".baldosa") : null;
    if (b) elegir(b.getAttribute("data-valor"), false);
  });

  // Flechas dentro del grupo, como en cualquier radiogroup.
  grupo.addEventListener("keydown", function (ev) {
    var teclas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(ev.key in teclas)) return;
    ev.preventDefault();
    var botones = Array.prototype.slice.call(grupo.querySelectorAll(".baldosa"));
    var i = botones.indexOf(document.activeElement);
    if (i === -1) i = 0;
    var j = (i + teclas[ev.key] + botones.length) % botones.length;
    elegir(botones[j].getAttribute("data-valor"), true);
  });

  // Lo que la aplicación escriba a mano en el select también se ve.
  var _valorOriginal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  var _indiceOriginal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");
  Object.defineProperty(select, "value", {
    configurable: true,
    get: function () { return _valorOriginal.get.call(this); },
    set: function (v) { _valorOriginal.set.call(this, v); sincronizar(); }
  });
  Object.defineProperty(select, "selectedIndex", {
    configurable: true,
    get: function () { return _indiceOriginal.get.call(this); },
    set: function (v) { _indiceOriginal.set.call(this, v); sincronizar(); }
  });
  select.addEventListener("change", sincronizar);
  if (select.form) select.form.addEventListener("reset", function () { setTimeout(sincronizar, 0); });

  if (typeof MutationObserver === "function") {
    new MutationObserver(function (cambios) {
      var cambiaronOpciones = cambios.some(function (c) { return c.type === "childList" && c.target === select; });
      if (cambiaronOpciones) construir(); else sincronizar();
    }).observe(select, { childList: true, subtree: true, characterData: true });
  }

  construir();
}

// ── Botones − y + ────────────────────────────────────────────────────────

function mejorarNumeroConBotones(input, paso) {
  if (input._pasos) return;
  input._pasos = true;
  var campo = input.closest(".field");
  if (campo) campo.classList.add("field--ancho");
  input.setAttribute("inputmode", input.step && input.step.indexOf(".") !== -1 ? "decimal" : "numeric");

  var caja = document.createElement("div");
  caja.className = "paso-a-paso";
  input.parentNode.insertBefore(caja, input);

  function boton(signo, clave) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "paso-a-paso__btn";
    b.tabIndex = -1; // con teclado ya están las flechas del propio campo
    b.textContent = signo > 0 ? "+" : "−";
    b.setAttribute("aria-label", (typeof t === "function" ? t(clave) : "{campo}").replace("{campo}", _etiquetaDe(input)));
    b.setAttribute("data-signo", String(signo));
    return b;
  }
  var menos = boton(-1, "ui.quitar_uno");
  var mas = boton(1, "ui.sumar_uno");
  caja.appendChild(menos);
  caja.appendChild(input);
  caja.appendChild(mas);

  function mover(signo) {
    var v = parseFloat(String(input.value).replace(",", "."));
    if (isNaN(v)) v = parseFloat(input.min) || 0;
    v = v + signo * paso;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    if (!isNaN(min) && v < min) v = min;
    if (!isNaN(max) && v > max) v = max;
    input.value = String(Math.round(v * 10) / 10);
    _avisarCambio(input);
  }

  // Mantener pulsado repite: de 70 a 95 kg no son 25 toques.
  var espera = null;
  var repetir = null;
  function parar() {
    clearTimeout(espera);
    clearInterval(repetir);
    espera = repetir = null;
  }
  [menos, mas].forEach(function (b) {
    var signo = parseInt(b.getAttribute("data-signo"), 10);
    b.addEventListener("pointerdown", function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      mover(signo);
      parar();
      espera = setTimeout(function () { repetir = setInterval(function () { mover(signo); }, 90); }, 420);
    });
    ["pointerup", "pointerleave", "pointercancel", "blur"].forEach(function (tipo) { b.addEventListener(tipo, parar); });
    // Teclado o lector de pantalla: un `click` sin puntero antes.
    b.addEventListener("click", function (ev) { if (ev.detail === 0) mover(signo); });
  });
}

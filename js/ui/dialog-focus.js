/**
 * js/ui/dialog-focus.js
 * ─────────────────────────────────────────────────────────────────────────
 * Foco en los diálogos (<dialog>): al abrir un diálogo modal se guarda qué
 * elemento tenía el foco (el botón que lo abrió) y, al cerrarlo, el foco
 * vuelve ahí. El navegador ya mantiene el foco dentro del diálogo mientras
 * está abierto (es modal); esto asegura la vuelta, que no todos los
 * navegadores hacen igual.
 *
 * Se instala una sola vez, envolviendo showModal() de HTMLDialogElement. Sin
 * soporte de <dialog> no hace nada.
 *
 * Expone (globales):
 *   dialogFocusRecordar(dialogo)   guarda el elemento con foco
 *   dialogFocusRestaurar(dialogo)  devuelve el foco al guardado
 *   dialogFocusInstalar(entorno)   instala la envoltura (entorno = window, o uno falso en tests)
 * ─────────────────────────────────────────────────────────────────────────
 */

function dialogFocusRecordar(dialogo, doc) {
  var d = doc || (typeof document !== "undefined" ? document : null);
  if (!dialogo || !d) return;
  dialogo._origenFoco = d.activeElement || null;
}

function dialogFocusRestaurar(dialogo, doc) {
  var d = doc || (typeof document !== "undefined" ? document : null);
  if (!dialogo || !d) return;
  var origen = dialogo._origenFoco;
  dialogo._origenFoco = null;
  if (origen && typeof origen.focus === "function" && d.contains(origen)) {
    origen.focus();
  }
}

/**
 * @param {object} entorno - { HTMLDialogElement, document }; por defecto, el del navegador
 * @returns {boolean} true si quedó instalado
 */
function dialogFocusInstalar(entorno) {
  var env = entorno || (typeof window !== "undefined" ? { HTMLDialogElement: window.HTMLDialogElement, document: document } : null);
  if (!env || typeof env.HTMLDialogElement === "undefined" || !env.HTMLDialogElement) return false;
  var proto = env.HTMLDialogElement.prototype;
  if (typeof proto.showModal !== "function" || proto.showModal._focoAdaptado) return false;

  var original = proto.showModal;
  proto.showModal = function () {
    dialogFocusRecordar(this, env.document);
    return original.apply(this, arguments);
  };
  proto.showModal._focoAdaptado = true;

  // «close» no burbujea, pero sí pasa por la fase de captura del documento.
  env.document.addEventListener("close", function (ev) {
    if (ev.target && ev.target.tagName === "DIALOG") dialogFocusRestaurar(ev.target, env.document);
  }, true);
  return true;
}

dialogFocusInstalar();

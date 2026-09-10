/**
 * js/ui/render-menu.js
 * ─────────────────────────────────────────────────────────────────────────
 * El menú de ajustes: el botón de la esquina superior izquierda y su
 * diálogo. Aquí vive el DOM; el estado del tema está en js/core/theme.js,
 * sin DOM, para que se pueda probar sin navegador.
 *
 * ── Lo que este archivo NO hace ─────────────────────────────────────────
 * No implementa "descargar mis datos" ni "ver la explicación otra vez": los
 * mismos botones existen en el pie de página desde antes, y dos copias del
 * mismo comportamiento se separan sola. Llama a `exportarMisDatos()` y a
 * `repetirExplicacion()` de js/app.js, que es donde viven y de donde tiran
 * también los del pie. Un dueño, una implementación (7.10).
 *
 * ── Y el tema se aplica en DOS sitios, a propósito ──────────────────────
 * El IIFE del <head> de index.html pone `data-theme` antes de pintar; esto
 * lo cambia cuando el usuario elige. Sin el primero la página se pintaría
 * clara y saltaría a oscura a la vista; sin el segundo habría que recargar
 * para ver el cambio.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** El <html>, que es quien lleva `data-theme`. */
function _menuRaiz() {
  return document.documentElement;
}

/** ¿El sistema pide oscuro? Envuelto porque matchMedia puede no existir. */
function _menuSistemaPrefiereOscuro() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  } catch (e) {
    return false;
  }
}

/**
 * Escribe en el DOM el tema que toca ahora mismo, resolviendo "sistema".
 * @param {string} [modo] - si no se pasa, se lee el guardado.
 */
function applyThemeToDom(modo) {
  if (typeof resolveTheme !== "function") return;
  var elegido = (typeof modo === "string") ? modo
    : (typeof getThemeMode === "function" ? getThemeMode() : "claro");
  _menuRaiz().setAttribute("data-theme",
    resolveTheme(elegido, _menuSistemaPrefiereOscuro()));
}

/** Deja marcado el botón que corresponde al modo guardado. */
function _menuPintarTema() {
  var grupo = document.getElementById("ajustesTema");
  if (!grupo || typeof getThemeMode !== "function") return;
  var actual = getThemeMode();
  var botones = grupo.querySelectorAll("[data-tema]");
  for (var i = 0; i < botones.length; i++) {
    var esteEs = botones[i].getAttribute("data-tema") === actual;
    botones[i].setAttribute("aria-checked", esteEs ? "true" : "false");
    // `is-active` y no solo aria: el color tiene que verse, no solo leerse.
    if (esteEs) botones[i].classList.add("is-active");
    else botones[i].classList.remove("is-active");
  }
}

function openAjustesDialog() {
  var d = document.getElementById("ajustesDialog");
  if (!d) return;
  _menuPintarTema();
  if (typeof d.showModal === "function") d.showModal();
  else d.setAttribute("open", "");    // navegador sin <dialog>: al menos se ve
}

function closeAjustesDialog() {
  var d = document.getElementById("ajustesDialog");
  if (!d) return;
  if (typeof d.close === "function") d.close();
  else d.removeAttribute("open");
}

/**
 * Cablea el menú entero. Idempotente por si se llamara dos veces.
 */
function initAjustesMenu() {
  var btn = document.getElementById("ajustesBtn");
  var dialogo = document.getElementById("ajustesDialog");
  if (!btn || !dialogo || btn.getAttribute("data-cableado") === "1") return;
  btn.setAttribute("data-cableado", "1");

  btn.addEventListener("click", openAjustesDialog);

  var cerrar = document.getElementById("ajustesCloseBtn");
  if (cerrar) cerrar.addEventListener("click", closeAjustesDialog);

  // Clic en el fondo oscuro: el <dialog> recibe el clic cuando cae fuera
  // de su caja, así que se compara con el rectángulo en vez de fiarse de
  // event.target, que también es el diálogo al pulsar dentro.
  dialogo.addEventListener("click", function (ev) {
    var r = dialogo.getBoundingClientRect();
    var fuera = ev.clientX < r.left || ev.clientX > r.right ||
                ev.clientY < r.top || ev.clientY > r.bottom;
    if (fuera) closeAjustesDialog();
  });

  var grupo = document.getElementById("ajustesTema");
  if (grupo) {
    grupo.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("[data-tema]") : null;
      if (!b) return;
      var modo = b.getAttribute("data-tema");
      if (typeof saveThemeMode === "function") saveThemeMode(modo);
      applyThemeToDom(modo);
      _menuPintarTema();
    });
  }

  var exportar = document.getElementById("ajustesExportBtn");
  if (exportar && typeof exportarMisDatos === "function") {
    exportar.addEventListener("click", exportarMisDatos);
  }

  var tour = document.getElementById("ajustesTourBtn");
  if (tour && typeof repetirExplicacion === "function") {
    tour.addEventListener("click", function () {
      // El recorrido señala elementos de la página: con el diálogo abierto
      // encima, señalaría detrás de una cortina.
      closeAjustesDialog();
      repetirExplicacion();
    });
  }

  var legal = document.getElementById("ajustesLegalBtn");
  if (legal && typeof openLegalDialog === "function") {
    legal.addEventListener("click", function () {
      // Dos <dialog> modales a la vez: el segundo se abre y el primero se
      // queda debajo, atrapando el foco. Se cierra este antes.
      closeAjustesDialog();
      openLegalDialog();
    });
  }

  // "Del sistema" tiene que cambiar EN CALIENTE, sin recargar: es lo que
  // hace que la opción signifique algo cuando el móvil cambia solo de tema
  // al anochecer.
  try {
    var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (mq) {
      var alCambiar = function () {
        if (typeof getThemeMode === "function" && getThemeMode() === "sistema") {
          applyThemeToDom("sistema");
        }
      };
      // addEventListener es lo moderno; addListener sigue siendo lo único
      // que entienden los Safari antiguos, que son justo los móviles que
      // más tiempo aguantan sin actualizar.
      if (typeof mq.addEventListener === "function") mq.addEventListener("change", alCambiar);
      else if (typeof mq.addListener === "function") mq.addListener(alCambiar);
    }
  } catch (e) { /* sin matchMedia, "sistema" se queda en lo que resolvió al cargar */ }
}

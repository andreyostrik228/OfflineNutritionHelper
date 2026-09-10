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

// ── Idioma ───────────────────────────────────────────────────────────────

/** Los atributos que se traducen, marcados como `data-i18n-title="clave"`. */
var I18N_ATRIBUTOS = ["title", "placeholder", "aria-label", "alt"];

/**
 * Escribe en el DOM las cadenas del idioma elegido.
 *
 * El texto español SIGUE en el HTML, así que esto no rellena huecos: los
 * sustituye. Sin JavaScript la página se ve entera y en español, que es un
 * estado válido — 7.2, el estado en reposo es el visible.
 *
 * Puede quedar un parpadeo del español al idioma elegido en un móvil lento,
 * porque el texto ya está pintado cuando esto corre. Se acepta a propósito:
 * la alternativa era esconder la página hasta traducirla, y esconder es
 * exactamente lo que 7.2 prohíbe. Para quien lee en español no hay ningún
 * parpadeo, que es el caso mayoritario.
 *
 * @param {string} [lang]
 */
function applyI18nToDom(lang) {
  if (typeof t !== "function") return;
  var idioma = (typeof lang === "string") ? lang
    : (typeof getLang === "function" ? getLang() : "es");

  // `lang` en <html> no es decorativo: de él dependen la separación de
  // sílabas, las comillas tipográficas y qué voz usa un lector de pantalla.
  document.documentElement.setAttribute("lang", idioma);

  // Frases con etiquetas dentro ("Es una <strong>preferencia</strong>: …").
  // Van enteras porque una frase partida en trozos no se traduce: el orden
  // de las palabras cambia con el idioma y los trozos no se pueden mover.
  //
  // Es innerHTML, así que el marcado SOLO se pone en elementos cuyo interior
  // es texto y etiquetas inertes -- nada con id, ni botones, ni campos: al
  // sustituir el interior se destruiría el elemento y con él su manejador,
  // y eso es un botón que deja de funcionar sin dar ningún error. Lo
  // garantiza el script que puso las marcas. Las tablas son ficheros
  // nuestros; aquí no entra nada escrito por un usuario.
  var conHtml = document.querySelectorAll("[data-i18n-html]");
  for (var h = 0; h < conHtml.length; h++) {
    conHtml[h].innerHTML = t(conHtml[h].getAttribute("data-i18n-html"), idioma);
  }

  var nodos = document.querySelectorAll("[data-i18n]");
  for (var i = 0; i < nodos.length; i++) {
    // Guarda: `textContent` sobre un elemento con hijos se los lleva por
    // delante. El extractor solo marcó elementos de texto puro, pero esto
    // es barato y convierte un futuro error de marcado en "no traduce"
    // en vez de en "borra media pantalla".
    if (nodos[i].children.length) continue;
    nodos[i].textContent = t(nodos[i].getAttribute("data-i18n"), idioma);
  }

  for (var a = 0; a < I18N_ATRIBUTOS.length; a++) {
    var attr = I18N_ATRIBUTOS[a];
    var conAttr = document.querySelectorAll("[data-i18n-" + attr + "]");
    for (var j = 0; j < conAttr.length; j++) {
      conAttr[j].setAttribute(attr, t(conAttr[j].getAttribute("data-i18n-" + attr), idioma));
    }
  }
}

// ── Cuando el navegador traduce la página por su cuenta ──────────────────

/** Para no volver a ofrecerlo en la misma visita si ya dijo que no. */
var TRADUCCION_AVISO_KEY = "nutritionPlanner.avisoTraduccion.v1";

/**
 * ¿El navegador ha traducido la página a un idioma que YA hablamos?
 *
 * Chrome (y los demás basados en él) marcan `<html>` con la clase
 * `translated-ltr` o `translated-rtl` y ponen el idioma destino en el
 * atributo `lang`. Esa clase es la señal: nosotros nunca la ponemos, así
 * que no se confunde con nuestro propio cambio de `lang`.
 *
 * Devuelve null cuando NO hay que ofrecer nada, que es la mayoría de los
 * casos: sin traducir, traducido a un idioma que no tenemos (que lo haga
 * el navegador, es mejor que nada), o traducido al que ya está puesto.
 *
 * @returns {string|null}
 */
function idiomaDeTraduccionAutomatica() {
  if (typeof LANGS === "undefined" || typeof getLang !== "function") return null;
  var raiz = document.documentElement;
  var clases = " " + (raiz.className || "") + " ";
  if (clases.indexOf("translated-") === -1) return null;
  var destino = String(raiz.getAttribute("lang") || "").toLowerCase().split("-")[0];
  if (!destino) return null;
  // `isLangAvailable` y no `LANGS`: un idioma declarado pero todavia sin
  // traducir no se ofrece. Ofrecerlo cambiaba el ajuste y dejaba la
  // pantalla igual, que es peor que no ofrecer nada.
  if (typeof isLangAvailable !== "function" || !isLangAvailable(destino)) return null;
  if (destino === getLang()) return null;           // ya estamos ahí
  return destino;
}

/** Enseña el aviso, con el nombre del idioma dentro. */
function _mostrarAvisoTraduccion(lang) {
  var caja = document.getElementById("traduccionAviso");
  var texto = document.getElementById("traduccionAvisoTexto");
  var si = document.getElementById("traduccionAvisoSi");
  if (!caja || !texto || !si) return;

  var nombre = (typeof LANG_NAMES !== "undefined" && LANG_NAMES[lang]) || lang;
  // Se compone con t() para que el aviso salga en el idioma al que están
  // traduciendo, no en el que está la página ahora mismo.
  texto.textContent = t("ui.esta_pagina_ya_existe_en", lang).replace("{idioma}", nombre);
  si.textContent = t("ui.usar_la_version_en", lang).replace("{idioma}", nombre);
  si.setAttribute("data-lang", lang);

  // El "no" también, y por eso se le quita `data-i18n`: si se lo dejara,
  // el siguiente applyI18nToDom() lo devolvería al idioma de la página y
  // el aviso quedaría medio en un idioma y medio en otro. Se veía.
  var no = document.getElementById("traduccionAvisoNo");
  if (no) {
    no.removeAttribute("data-i18n");
    no.textContent = t("ui.no_gracias", lang);
  }

  caja.hidden = false;
}

function _ocultarAvisoTraduccion() {
  var caja = document.getElementById("traduccionAviso");
  if (caja) caja.hidden = true;
}

/**
 * Vigila el <html> por si el navegador lo traduce. Es un observador y no
 * una comprobación al cargar porque traducir es algo que el usuario hace
 * DESPUÉS, cuando le apetece.
 */
function initAvisoTraduccion() {
  var caja = document.getElementById("traduccionAviso");
  if (!caja || typeof MutationObserver !== "function") return;

  var yaDijoQueNo = false;
  try { yaDijoQueNo = sessionStorage.getItem(TRADUCCION_AVISO_KEY) === "no"; }
  catch (e) { /* sin sessionStorage se vuelve a ofrecer, no pasa nada */ }

  var si = document.getElementById("traduccionAvisoSi");
  if (si) {
    si.addEventListener("click", function () {
      var lang = si.getAttribute("data-lang");
      if (lang && typeof saveLang === "function") {
        saveLang(lang);
        applyI18nToDom(lang);
        _menuPintarIdioma();
      }
      _ocultarAvisoTraduccion();
    });
  }
  var no = document.getElementById("traduccionAvisoNo");
  if (no) {
    no.addEventListener("click", function () {
      yaDijoQueNo = true;
      try { sessionStorage.setItem(TRADUCCION_AVISO_KEY, "no"); } catch (e) { /* da igual */ }
      _ocultarAvisoTraduccion();
    });
  }

  var revisar = function () {
    if (yaDijoQueNo) return;
    var lang = idiomaDeTraduccionAutomatica();
    if (lang) _mostrarAvisoTraduccion(lang);
    else _ocultarAvisoTraduccion();
  };

  new MutationObserver(revisar).observe(document.documentElement, {
    attributes: true, attributeFilter: ["class", "lang"]
  });
  // Por si ya venía traducida de una visita anterior en la misma pestaña.
  revisar();
}

/**
 * Deja en la lista SOLO los idiomas que de verdad se pueden usar hoy, y
 * marca el actual.
 *
 * El <select> del HTML lleva los diez que la aplicación admite, que es la
 * intención escrita; aquí se quitan los que todavía no tienen traducción.
 * Se hace así y no al revés —lista corta en el HTML y crecerla desde JS—
 * porque sin JavaScript lo que queda es un desplegable con el idioma que
 * de verdad está puesto, en vez de uno vacío.
 */
function _menuPintarIdioma() {
  var sel = document.getElementById("ajustesIdioma");
  if (!sel || typeof getLang !== "function") return;
  if (typeof isLangAvailable === "function") {
    for (var i = sel.options.length - 1; i >= 0; i--) {
      if (!isLangAvailable(sel.options[i].value)) sel.remove(i);
    }
  }
  sel.value = getLang();
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
  _menuPintarIdioma();
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

  // Se poda la lista YA, no solo al abrir el diálogo: así nunca existe un
  // momento en el que el <select> ofrezca un idioma sin traducir.
  _menuPintarIdioma();

  var idioma = document.getElementById("ajustesIdioma");
  if (idioma) {
    idioma.addEventListener("change", function () {
      if (typeof saveLang !== "function") return;
      var elegido = saveLang(idioma.value);
      applyI18nToDom(elegido);
      // El <select> se vuelve a pintar por si el valor pedido no era
      // válido y saveLang() lo dejó en otro: la pantalla tiene que
      // enseñar lo que de verdad ha quedado guardado, no lo que se pulsó.
      _menuPintarIdioma();
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

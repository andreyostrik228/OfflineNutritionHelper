/**
 * js/ui/render-ayuno.js
 * ─────────────────────────────────────────────────────────────────────────
 * Ventana de ayuno intermitente (2026-10-17). Bajo el horario de comidas
 * muestra cuánto falta para la siguiente toma o para que cierre la ventana.
 *
 * La ventana NO se elige aparte: sale de las horas que ya calcula
 * js/core/meal-schedule.js (primera y última toma del plan). Así el ayuno y
 * el horario no pueden contradecirse. Todo es local: no se guarda nada y no
 * se envía a ningún sitio.
 *
 * Mejora progresiva: sin este fichero el horario se ve igual que antes.
 *
 * Expone (globales):
 *   ayunoVentana(meals)                 { inicio, fin } en minutos del día, o null
 *   ayunoEstado(inicio, fin, ahora)     { tipo: "comida" | "ayuno", minutos, porcentaje }
 *   ayunoDuracion(minutos)              texto traducido, p. ej. "1 h 30 min"
 *   ayunoRenderizar(meals)              muestra la tarjeta y la refresca cada minuto
 *   ayunoOcultar()                      la oculta y para el refresco
 * ─────────────────────────────────────────────────────────────────────────
 */

var AYUNO_MINUTOS_DIA = 1440;
var AYUNO_INTERVALO_MS = 60000;

var _ayunoTimer = null;
var _ayunoComidas = null;

/** Ventana de comidas: de la primera toma a la última. Hacen falta al menos dos tomas con hora. */
function ayunoVentana(meals) {
  var minutos = (meals || []).filter(function (m) {
    return m && typeof m.timeMinutes === "number" && isFinite(m.timeMinutes);
  }).map(function (m) { return m.timeMinutes; });
  if (minutos.length < 2) return null;
  return { inicio: Math.min.apply(null, minutos), fin: Math.max.apply(null, minutos) };
}

/**
 * Dónde está el usuario respecto a la ventana. Dentro de la ventana se come
 * y cuenta hasta el cierre; fuera, se ayuna y cuenta hasta la primera toma
 * (que puede ser la del día siguiente).
 */
function ayunoEstado(inicio, fin, ahora) {
  var duracionVentana = fin - inicio;
  var duracionAyuno = AYUNO_MINUTOS_DIA - duracionVentana;

  if (inicio <= ahora && ahora <= fin) {
    var porcionComida = 0 < duracionVentana ? (ahora - inicio) / duracionVentana : 1;
    return { tipo: "comida", minutos: fin - ahora, porcentaje: porcionComida };
  }

  var faltan = ahora < inicio ? inicio - ahora : AYUNO_MINUTOS_DIA - ahora + inicio;
  var transcurrido = duracionAyuno - faltan;
  var porcionAyuno = 0 < duracionAyuno ? transcurrido / duracionAyuno : 1;
  return { tipo: "ayuno", minutos: faltan, porcentaje: porcionAyuno };
}

/** Duración en texto del idioma actual: "2 h", "1 h 30 min". */
function ayunoDuracion(minutos) {
  var total = Math.max(0, Math.round(minutos));
  var horas = Math.floor(total / 60);
  var resto = total % 60;
  return resto === 0 ? tFormat("ayu.h", { h: horas }) : tFormat("ayu.hm", { h: horas, m: resto });
}

/** Pinta el estado de ahora y la ventana del día. Se llama al mostrar y cada minuto. */
function ayunoPintar() {
  var tarjeta = document.getElementById("ayunoCard");
  if (!tarjeta || tarjeta.hidden || !_ayunoComidas) return;

  var ventana = ayunoVentana(_ayunoComidas);
  if (!ventana) {
    ayunoOcultar();
    return;
  }

  var ahora = new Date();
  var estado = ayunoEstado(ventana.inicio, ventana.fin, ahora.getHours() * 60 + ahora.getMinutes());
  var clave = estado.tipo === "comida" ? "ayu.ahora_comida" : "ayu.ahora_ayuno";
  var ayunoDia = ayunoDuracion(AYUNO_MINUTOS_DIA - (ventana.fin - ventana.inicio));

  document.getElementById("ayunoEstado").textContent = tFormat(clave, { tiempo: ayunoDuracion(estado.minutos) });
  document.getElementById("ayunoVentana").textContent =
    tFormat("ayu.ventana", { inicio: formatMinutesToTime(ventana.inicio), fin: formatMinutesToTime(ventana.fin) }) +
    " · " + tFormat("ayu.ayuno_dia", { tiempo: ayunoDia });
  document.getElementById("ayunoRelleno").style.width = Math.round(Math.min(1, Math.max(0, estado.porcentaje)) * 100) + "%";
  tarjeta.classList.toggle("ayuno--comida", estado.tipo === "comida");
}

/** Muestra la tarjeta con las tomas del plan actual y la refresca cada minuto. */
function ayunoRenderizar(meals) {
  var tarjeta = document.getElementById("ayunoCard");
  if (!tarjeta) return;
  if (!ayunoVentana(meals)) {
    ayunoOcultar();
    return;
  }
  _ayunoComidas = meals;
  tarjeta.hidden = false;
  ayunoPintar();
  if (_ayunoTimer === null) _ayunoTimer = setInterval(ayunoPintar, AYUNO_INTERVALO_MS);
}

/** Oculta la tarjeta y para el refresco (se llama al quitar el plan de la pantalla). */
function ayunoOcultar() {
  if (_ayunoTimer !== null) {
    clearInterval(_ayunoTimer);
    _ayunoTimer = null;
  }
  _ayunoComidas = null;
  var tarjeta = document.getElementById("ayunoCard");
  if (tarjeta) tarjeta.hidden = true;
}

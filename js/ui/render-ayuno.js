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

/**
 * Ventana de comidas: de la primera toma del día a la última. Hacen falta al
 * menos dos tomas con hora.
 *
 * El día de quien come no tiene por qué caber entre las 00:00 y las 24:00
 * (2026-11-07, el dueño se levanta a las 11:30 y cena a la 01:00): con la
 * primera y la última hora del reloj la ventana salía de 01:00 a 21:45, con
 * 3 h 15 min de ayuno, cuando come de 12:00 a 01:00 y ayuna 11 h. El ayuno es
 * el hueco más largo entre dos tomas seguidas, contando el de la noche; la
 * ventana es el resto. `fin` pasa de 1440 si la ventana cruza la medianoche.
 * @returns {{inicio:number, fin:number}|null} minutos desde las 00:00
 */
function ayunoVentana(meals) {
  var minutos = (meals || []).filter(function (m) {
    return m && typeof m.timeMinutes === "number" && isFinite(m.timeMinutes);
  }).map(function (m) {
    return ((m.timeMinutes % AYUNO_MINUTOS_DIA) + AYUNO_MINUTOS_DIA) % AYUNO_MINUTOS_DIA;
  });
  if (minutos.length < 2) return null;
  minutos.sort(function (a, b) { return a - b; });
  var n = minutos.length;
  // De la última toma del reloj a la primera del día siguiente…
  var ultima = n - 1;
  var hueco = minutos[0] + AYUNO_MINUTOS_DIA - minutos[n - 1];
  // …salvo que haya un hueco más largo dentro del día.
  for (var i = 0; i < n - 1; i++) {
    if (minutos[i + 1] - minutos[i] > hueco) {
      hueco = minutos[i + 1] - minutos[i];
      ultima = i;
    }
  }
  var inicio = minutos[(ultima + 1) % n];
  var fin = minutos[ultima];
  if (fin < inicio) fin += AYUNO_MINUTOS_DIA;
  return { inicio: inicio, fin: fin };
}

/**
 * Dónde está el usuario respecto a la ventana. Dentro de la ventana se come
 * y cuenta hasta el cierre; fuera, se ayuna y cuenta hasta la primera toma
 * (que puede ser la del día siguiente). Vale con una ventana que cruza la
 * medianoche (`fin` mayor que 1440): «ahora» se cuenta desde el inicio.
 */
function ayunoEstado(inicio, fin, ahora) {
  var duracionVentana = fin - inicio;
  var duracionAyuno = AYUNO_MINUTOS_DIA - duracionVentana;
  var desdeInicio = (((ahora - inicio) % AYUNO_MINUTOS_DIA) + AYUNO_MINUTOS_DIA) % AYUNO_MINUTOS_DIA;

  if (desdeInicio <= duracionVentana) {
    var porcionComida = 0 < duracionVentana ? desdeInicio / duracionVentana : 1;
    return { tipo: "comida", minutos: duracionVentana - desdeInicio, porcentaje: porcionComida };
  }

  var faltan = AYUNO_MINUTOS_DIA - desdeInicio;
  var transcurrido = desdeInicio - duracionVentana;
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
    tFormat("ayu.ventana", { inicio: formatMinutesToTime(ventana.inicio), fin: formatMinutesToTime(ventana.fin % AYUNO_MINUTOS_DIA) }) +
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

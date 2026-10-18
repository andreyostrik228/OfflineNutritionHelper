/**
 * js/core/ics-export.js
 * ─────────────────────────────────────────────────────────────────────────
 * Exportación a calendario (.ics, RFC 5545): las comidas de un día y el plan
 * de entrenamiento semanal. Son funciones puras; solo icsDescargar toca el
 * navegador.
 *
 * FORMATO DE FECHA: hora flotante (sin Z y sin TZID). Las comidas y los
 * entrenamientos son horas de la vida diaria ("a las 14:00"), no momentos
 * del mundo. Con hora flotante el calendario muestra 14:00 en cualquier zona
 * horaria y no hace falta un bloque VTIMEZONE. Usar Europe/Madrid obligaría
 * a copiar sus reglas de cambio de hora, y una regla mal copiada desplaza
 * todos los eventos una hora.
 *
 * Las fechas de DTSTAMP sí van en UTC (exige la norma). Todas las cuentas
 * de fechas se hacen con Date.UTC, sin depender de la zona de la máquina.
 *
 * Expone (globales):
 *   icsEscapar(texto)                       escapa TEXT según RFC 5545
 *   icsPlegar(linea)                        parte las líneas de más de 75 octetos
 *   icsFechaHora(anio, mes, dia, minutos)   "AAAAMMDDTHHMMSS" (hora flotante)
 *   icsSumarDias(fecha, dias)               "AAAA-MM-DD" + dias
 *   icsDiaSemana(fecha)                     0 = lunes … 6 = domingo
 *   icsEvento(datos)                        texto de un VEVENT
 *   icsCalendario(eventos)                  texto VCALENDAR completo (CRLF)
 *   icsComidas(comidas, fecha, opciones)    calendario con las comidas de un día
 *   icsComidasDias(dias, fecha, opciones)   calendario con todos los días del plan
 *   icsEntreno(plan, fecha, opciones)       calendario con el entrenamiento semanal
 *   icsFechaDeHoy(anio, mes, dia)           "AAAA-MM-DD" con los componentes locales
 *   icsHoraEntreno(valor)                   minutos del día de un campo HH:MM (18:00 si no es válido)
 *   icsDescargar(texto, nombre)             descarga el fichero (solo navegador)
 * ─────────────────────────────────────────────────────────────────────────
 */

var ICS_FIN_DE_LINEA = "\r\n";
var ICS_DIAS_RRULE = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/** Rellena con ceros a la izquierda hasta `largo` caracteres. */
function icsRellenar(valor, largo) {
  var s = String(valor);
  while (s.length < largo) s = "0" + s;
  return s;
}

/**
 * Escapa un texto para una propiedad TEXT (RFC 5545 §3.3.11): la barra
 * invertida primero, después la coma, el punto y coma y el salto de línea.
 */
function icsEscapar(texto) {
  return String(texto)
    .split("\\").join("\\\\")
    .split(";").join("\\;")
    .split(",").join("\\,")
    .split("\r\n").join("\\n")
    .split("\r").join("\\n")
    .split("\n").join("\\n");
}

/** Octetos que ocupa un carácter en UTF-8. */
function icsOctetos(caracter) {
  var cp = caracter.codePointAt(0);
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/**
 * Parte una línea que pasa de 75 octetos: la continuación empieza por un
 * espacio y no se corta nunca dentro de un carácter multibyte.
 */
function icsPlegar(linea) {
  var partes = [];
  var actual = "";
  var octetos = 0;
  var primera = true;
  Array.from(String(linea)).forEach(function (caracter) {
    var n = icsOctetos(caracter);
    var limite = primera ? 75 : 74;
    if (limite < octetos + n) {
      partes.push(actual);
      actual = "";
      octetos = 0;
      primera = false;
    }
    actual += caracter;
    octetos += n;
  });
  partes.push(actual);
  return partes.map(function (p, i) { return i === 0 ? p : " " + p; }).join(ICS_FIN_DE_LINEA);
}

/** "AAAAMMDDTHHMMSS" en hora flotante. `minutos` es la hora del día (0 a 1439). */
function icsFechaHora(anio, mes, dia, minutos) {
  var horas = Math.floor(minutos / 60);
  var resto = minutos % 60;
  return icsRellenar(anio, 4) + icsRellenar(mes, 2) + icsRellenar(dia, 2) +
    "T" + icsRellenar(horas, 2) + icsRellenar(resto, 2) + "00";
}

/** Sella en UTC: "AAAAMMDDTHHMMSSZ". Lo usa DTSTAMP. */
function icsSelloUtc(fecha) {
  return icsRellenar(fecha.getUTCFullYear(), 4) + icsRellenar(fecha.getUTCMonth() + 1, 2) +
    icsRellenar(fecha.getUTCDate(), 2) + "T" + icsRellenar(fecha.getUTCHours(), 2) +
    icsRellenar(fecha.getUTCMinutes(), 2) + icsRellenar(fecha.getUTCSeconds(), 2) + "Z";
}

/** Separa "AAAA-MM-DD" en sus tres números. */
function icsPartirFecha(fecha) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha));
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** "AAAA-MM-DD" + dias, con la aritmética en UTC para no depender de la zona. */
function icsSumarDias(fecha, dias) {
  var p = icsPartirFecha(fecha);
  if (!p) return null;
  var d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia + dias));
  return icsRellenar(d.getUTCFullYear(), 4) + "-" + icsRellenar(d.getUTCMonth() + 1, 2) + "-" + icsRellenar(d.getUTCDate(), 2);
}

/** Día de la semana de una fecha "AAAA-MM-DD": 0 = lunes, 6 = domingo. */
function icsDiaSemana(fecha) {
  var p = icsPartirFecha(fecha);
  if (!p) return null;
  var d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
  return (d.getUTCDay() + 6) % 7;
}

/** Fecha "AAAA-MM-DD" a partir de los componentes locales de hoy (lo llama la interfaz). */
function icsFechaDeHoy(anio, mes, dia) {
  return icsRellenar(anio, 4) + "-" + icsRellenar(mes, 2) + "-" + icsRellenar(dia, 2);
}

/**
 * Un VEVENT. `datos`: uid, comienzo y fin ("AAAAMMDDTHHMMSS"), sello (Date),
 * titulo, descripcion (opcional) y rrule (opcional, p. ej. "FREQ=WEEKLY;BYDAY=MO").
 */
function icsEvento(datos) {
  var lineas = [
    "BEGIN:VEVENT",
    "UID:" + datos.uid,
    "DTSTAMP:" + icsSelloUtc(datos.sello),
    "DTSTART:" + datos.comienzo,
    "DTEND:" + datos.fin
  ];
  if (datos.rrule) lineas.push("RRULE:" + datos.rrule);
  lineas.push("SUMMARY:" + icsEscapar(datos.titulo));
  if (datos.descripcion) lineas.push("DESCRIPTION:" + icsEscapar(datos.descripcion));
  lineas.push("END:VEVENT");
  return lineas.map(icsPlegar).join(ICS_FIN_DE_LINEA);
}

/** Calendario completo: cabecera, los eventos y el cierre, con CRLF como manda la norma. */
function icsCalendario(eventos) {
  var cabecera = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Weekplate//Planificador//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ].map(icsPlegar);
  return cabecera.concat(eventos).concat(["END:VCALENDAR"]).join(ICS_FIN_DE_LINEA) + ICS_FIN_DE_LINEA;
}

/**
 * Eventos de las comidas de UN día. `comidas` son las tomas con timeMinutes
 * (salida de computeMealSchedule). Opciones: titulo(comida) → texto (por
 * defecto, el label), duracionMin (30 por defecto), sello (Date).
 */
function icsEventosComidas(comidas, fecha, opciones) {
  var o = opciones || {};
  var duracion = typeof o.duracionMin === "number" ? o.duracionMin : 30;
  var sello = o.sello || new Date(0);
  var p = icsPartirFecha(fecha);
  if (!p || !Array.isArray(comidas)) return [];

  return comidas.filter(function (c) {
    return c && typeof c.timeMinutes === "number" && 0 <= c.timeMinutes && c.timeMinutes < 1440;
  }).map(function (c) {
    var inicio = c.timeMinutes;
    var fin = Math.min(1439, inicio + duracion);
    var items = (c.items || []).filter(function (it) { return it && it.name; }).map(function (it) {
      return it.grams ? it.name + ": " + it.grams + " g" : it.name;
    });
    return icsEvento({
      uid: "comida-" + fecha + "-" + c.key + "@weekplate",
      comienzo: icsFechaHora(p.anio, p.mes, p.dia, inicio),
      fin: icsFechaHora(p.anio, p.mes, p.dia, fin),
      sello: sello,
      titulo: o.titulo ? o.titulo(c) : c.label,
      descripcion: items.join("\n")
    });
  });
}

/** Calendario de las comidas de un día. */
function icsComidas(comidas, fecha, opciones) {
  return icsCalendario(icsEventosComidas(comidas, fecha, opciones));
}

/**
 * Calendario de TODOS los días del plan. `dias` es la lista de días (cada uno
 * con su .meals) y `fecha` la del primer día: el día i cae en fecha + i.
 * Con un solo día sale lo mismo que icsComidas.
 */
function icsComidasDias(dias, fecha, opciones) {
  var eventos = [];
  if (!Array.isArray(dias)) return icsCalendario(eventos);
  dias.forEach(function (dia, i) {
    var fechaDia = icsSumarDias(fecha, i);
    if (!fechaDia || !dia) return;
    eventos = eventos.concat(icsEventosComidas(dia.meals, fechaDia, opciones));
  });
  return icsCalendario(eventos);
}

/**
 * Eventos del entrenamiento semanal: una serie semanal por sesión, en el
 * primer día que cae en la misma semana (lunes = 1 … domingo = 7, como en el
 * generador). Opciones: horaMinutos (18:00 por defecto), duracionMin (60),
 * titulo(sesion), linea(ejercicio) → texto, sello (Date).
 */
function icsEntreno(plan, fecha, opciones) {
  var o = opciones || {};
  var hora = typeof o.horaMinutos === "number" ? o.horaMinutos : 18 * 60;
  var duracion = typeof o.duracionMin === "number" ? o.duracionMin : 60;
  var sello = o.sello || new Date(0);
  var base = icsDiaSemana(fecha);
  if (base === null || !plan || !plan.sesiones) return icsCalendario([]);

  var eventos = plan.sesiones.filter(function (s) {
    return s && typeof s.dia === "number" && 1 <= s.dia && s.dia <= 7;
  }).map(function (s) {
    var desplazamiento = (s.dia - 1 - base + 7) % 7;
    var primera = icsSumarDias(fecha, desplazamiento);
    var p = icsPartirFecha(primera);
    var fin = Math.min(1439, hora + duracion);
    var lineas = (s.exercises || []).map(function (e) {
      return o.linea ? o.linea(e) : e.name;
    });
    return icsEvento({
      uid: "entreno-" + s.key + "@weekplate",
      comienzo: icsFechaHora(p.anio, p.mes, p.dia, hora),
      fin: icsFechaHora(p.anio, p.mes, p.dia, fin),
      sello: sello,
      titulo: o.titulo ? o.titulo(s) : s.name,
      descripcion: lineas.join("\n"),
      rrule: "FREQ=WEEKLY;BYDAY=" + ICS_DIAS_RRULE[s.dia - 1]
    });
  });
  return icsCalendario(eventos);
}

/**
 * Hora de inicio del entrenamiento a partir del campo de la interfaz ("HH:MM").
 * Lo que no sea una hora válida (vacío, texto, 25:00) vuelve a las 18:00.
 * Devuelve minutos del día. La hora no se guarda en ningún sitio.
 */
var ICS_HORA_ENTRENO_POR_DEFECTO = 18 * 60;

function icsHoraEntreno(valor) {
  var texto = valor === null || valor === undefined ? "" : String(valor).trim();
  var m = /^(\d{1,2}):(\d{2})$/.exec(texto);
  if (!m) return ICS_HORA_ENTRENO_POR_DEFECTO;
  var horas = Number(m[1]);
  var minutos = Number(m[2]);
  if (horas < 0 || 23 < horas || minutos < 0 || 59 < minutos) return ICS_HORA_ENTRENO_POR_DEFECTO;
  return horas * 60 + minutos;
}

/** Descarga el texto como fichero. Solo navegador; no lo usan los tests. */
function icsDescargar(texto, nombre) {
  var blob = new Blob([texto], { type: "text/calendar;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

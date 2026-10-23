/**
 * js/ui/entreno-cuestionario.js
 * ─────────────────────────────────────────────────────────────────────────
 * CUESTIONARIO DE ENTRENAMIENTO (2026-10-18), como en las apps de gimnasio:
 * una pregunta por pantalla, con barra de progreso, «Atrás» y «Siguiente».
 *   1. objetivo (ganar músculo, fuerza, tonificar, perder grasa, salud)
 *   2. experiencia
 *   3. cuántos días, cuáles (opcional) y cuánto dura cada sesión
 *   4. dónde entrena y qué material tiene, uno a uno
 *   5. qué quiere trabajar más (hasta tres grupos)
 *   6. molestias (rodillas, lumbar, hombros) y ejercicios que no quiere
 *
 * La primera vez que se abre el panel sale solo; después, con «Cambiar» en
 * «Tu programa». Lo contestado se guarda al terminar (entrenoGuardarPrefs,
 * en js/ui/render-entreno.js) con `configurado: true`; cerrar con la × lo
 * da por visto y deja las respuestas como estaban. Los días van al campo de
 * «Mis datos» (entrenoGuardarDias), que también cuenta para las calorías.
 *
 * El marcado está en index.html (#entrenoCuestionario); con .is-cuestionario
 * en el panel solo se ve esto.
 *
 * Expone (globales):
 *   initEntrenoCuestionario()        cablea los botones (una vez; lo llama initEntreno)
 *   entrenoCuestionarioAbrir()       abre en la primera pantalla con lo ya guardado
 *   entrenoCuestionarioCerrar(guardar)  cierra; con guardar, aplica las respuestas
 *   entrenoCuestionarioDatos()       las respuestas en curso (o null), para los tests
 *   entrenoCuestionarioValido(datos, paso)  ¿se puede pasar de esa pantalla?
 * ─────────────────────────────────────────────────────────────────────────
 */

var CUEST_PASOS = 6;
var _cuest = null;
var _cuestCableado = false;

/** Material del juego elegido, sin «sin_material» (eso se tiene siempre). */
function _cuestMaterialDe(equipamiento) {
  var juego = (typeof EQUIPAMIENTO_DISPONIBLE !== "undefined" && EQUIPAMIENTO_DISPONIBLE[equipamiento]) || [];
  return juego.filter(function (m) { return m !== "sin_material"; });
}

/** El juego que coincide con el material marcado, o "personalizado". */
function _cuestJuegoDe(material) {
  var clave = material.slice().sort().join(",");
  var juego = "personalizado";
  ["gimnasio", "mancuernas", "sin_material"].forEach(function (k) {
    if (_cuestMaterialDe(k).slice().sort().join(",") === clave) juego = k;
  });
  return juego;
}

/** Respuestas de partida: lo guardado, y lo que falte, de «Mis datos» o por defecto. */
function _cuestDatosIniciales() {
  var prefs = entrenoLeerPrefs();
  var dias = Math.floor(Number((document.getElementById("workouts") || {}).value));
  // Con la semana montada a mano, los días son sus sesiones (2026-10-23).
  if (prefs.estructura) dias = prefs.estructura.length;
  if (!(dias >= 1)) dias = 3;
  if (dias > 6) dias = 6;
  var objetivo = prefs.objetivo;
  if (objetivo === "auto") {
    var meta = (document.getElementById("goal") || {}).value;
    objetivo = ENTRENO_OBJETIVOS.indexOf(meta) !== -1 ? meta : "maintain";
  }
  var material = prefs.material ? prefs.material.slice() : _cuestMaterialDe(prefs.equipamiento);
  return {
    objetivo: objetivo,
    nivel: prefs.nivel,
    dias: dias,
    diasIniciales: dias,
    diasSemana: prefs.diasSemana && prefs.diasSemana.length === dias ? prefs.diasSemana.slice() : [],
    duracion: prefs.duracion,
    equipamiento: _cuestJuegoDe(material),
    material: material,
    enfoque: prefs.enfoque.slice(),
    limitaciones: prefs.limitaciones.slice(),
    excluir: prefs.excluir
  };
}

/** ¿Se puede pasar de esta pantalla? Solo los días piden algo: ninguno marcado, o tantos como entrenamientos. */
function entrenoCuestionarioValido(datos, paso) {
  if (paso === 3) return datos.diasSemana.length === 0 || datos.diasSemana.length === datos.dias;
  return true;
}

function entrenoCuestionarioDatos() {
  return _cuest ? _cuest.datos : null;
}

function _cuestCaja() { return document.getElementById("entrenoCuestionario"); }

/** Marca los botones de un grupo según los valores elegidos (uno o varios). */
function _cuestMarcar(grupoId, valores) {
  var lista = Array.isArray(valores) ? valores.map(String) : [String(valores)];
  Array.prototype.forEach.call(document.querySelectorAll("#" + grupoId + " [data-valor]"), function (b) {
    var on = lista.indexOf(b.getAttribute("data-valor")) !== -1;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function _cuestPintar(enfocar) {
  var caja = _cuestCaja();
  if (!caja || !_cuest) return;
  var d = _cuest.datos;
  var paso = _cuest.paso;
  Array.prototype.forEach.call(caja.querySelectorAll(".cuestionario__pantalla"), function (p) {
    p.hidden = Number(p.getAttribute("data-paso")) !== paso;
  });
  document.getElementById("cuestPaso").textContent = tFormat("ent.cuest_paso", { n: paso, total: CUEST_PASOS });
  document.getElementById("cuestBarra").style.width = Math.round(paso / CUEST_PASOS * 100) + "%";

  _cuestMarcar("entObjetivo", d.objetivo);
  _cuestMarcar("entNivel", d.nivel);
  _cuestMarcar("entDias", d.dias);
  _cuestMarcar("entDiasSemana", d.diasSemana);
  _cuestMarcar("entDuracion", d.duracion);
  _cuestMarcar("entEquipo", d.equipamiento);
  _cuestMarcar("entMaterial", d.material);
  _cuestMarcar("entEnfoque", d.enfoque);
  _cuestMarcar("entLimites", d.limitaciones);

  // Días: el aviso dice cuántos van marcados si no cuadran con los entrenamientos.
  var ayudaDias = document.getElementById("cuestDiasAyuda");
  var diasOk = entrenoCuestionarioValido(d, 3);
  ayudaDias.textContent = diasOk ? t("ent.cuest_dias_cuales_a") : tFormat("ent.cuest_dias_faltan", { marcados: d.diasSemana.length, n: d.dias });
  ayudaDias.classList.toggle("is-aviso", !diasOk);
  // Acento: al llegar a tres, se recuerda el tope.
  var ayudaEnfoque = document.getElementById("cuestEnfoqueAyuda");
  ayudaEnfoque.textContent = d.enfoque.length >= ENTRENO_ENFOQUE_MAX ? t("ent.cuest_enfoque_max") : t("ent.cuest_enfoque_a");

  var atras = document.getElementById("cuestAtras");
  var siguiente = document.getElementById("cuestSiguiente");
  atras.hidden = paso === 1;
  siguiente.textContent = t(paso === CUEST_PASOS ? "ent.cuest_crear" : "ent.cuest_siguiente");
  siguiente.disabled = !entrenoCuestionarioValido(d, paso);

  if (enfocar) {
    var titulo = document.getElementById("cuestT" + paso);
    if (titulo) {
      try { titulo.focus({ preventScroll: true }); } catch (e) { titulo.focus(); }
    }
  }
}

/** Un toque en una opción: una sola en su grupo, o varias (días, material, acento, molestias). */
function _cuestElegir(grupo, valor) {
  var d = _cuest.datos;
  function alternar(lista, v) {
    var i = lista.indexOf(v);
    if (i === -1) lista.push(v); else lista.splice(i, 1);
  }
  if (grupo === "entObjetivo") d.objetivo = valor;
  else if (grupo === "entNivel") d.nivel = valor;
  else if (grupo === "entDias") {
    d.dias = Number(valor);
    // Si los días marcados ya no cuadran, se quitan: mejor elegir de nuevo que un plan que no sale.
    if (d.diasSemana.length && d.diasSemana.length !== d.dias) d.diasSemana = [];
  } else if (grupo === "entDiasSemana") {
    alternar(d.diasSemana, Number(valor));
    d.diasSemana.sort(function (a, b) { return a - b; });
  } else if (grupo === "entDuracion") d.duracion = Number(valor);
  else if (grupo === "entEquipo") {
    d.equipamiento = valor;
    d.material = _cuestMaterialDe(valor);
  } else if (grupo === "entMaterial") {
    alternar(d.material, valor);
    d.equipamiento = _cuestJuegoDe(d.material);
  } else if (grupo === "entEnfoque") {
    if (d.enfoque.indexOf(valor) === -1 && d.enfoque.length >= ENTRENO_ENFOQUE_MAX) return;
    alternar(d.enfoque, valor);
  } else if (grupo === "entLimites") alternar(d.limitaciones, valor);
  if (typeof entrenoVibrar === "function") entrenoVibrar();
  _cuestPintar(false);
}

/** Abre el cuestionario en la primera pantalla con lo que ya estaba guardado. */
function entrenoCuestionarioAbrir() {
  var caja = _cuestCaja();
  var panel = document.getElementById("entrenoPanel");
  if (!caja || !panel) return;
  _cuest = { paso: 1, datos: _cuestDatosIniciales() };
  document.getElementById("entExcluir").value = _cuest.datos.excluir;
  panel.classList.add("is-cuestionario");
  document.body.classList.add("modo-cuestionario");
  caja.hidden = false;
  _cuestPintar(true);
  window.scrollTo(0, 0);
}

/**
 * Cierra el cuestionario. Con guardar, aplica las respuestas; sin guardar
 * (la ×) deja todo como estaba, pero no vuelve a salir solo.
 */
function entrenoCuestionarioCerrar(guardar) {
  var caja = _cuestCaja();
  var panel = document.getElementById("entrenoPanel");
  var prefs = entrenoLeerPrefs();
  if (guardar && _cuest) {
    var d = _cuest.datos;
    prefs.objetivo = d.objetivo;
    prefs.nivel = d.nivel;
    prefs.duracion = d.duracion;
    prefs.material = d.material.slice();
    prefs.equipamiento = d.equipamiento;
    prefs.enfoque = d.enfoque.slice(0, ENTRENO_ENFOQUE_MAX);
    prefs.limitaciones = d.limitaciones.slice();
    prefs.diasSemana = d.diasSemana.length === d.dias ? d.diasSemana.slice() : null;
    prefs.excluir = String(document.getElementById("entExcluir").value || "").trim().slice(0, 200);
    if (d.dias !== d.diasIniciales) {
      entrenoGuardarDias(d.dias);
      // Otro número de días es otra semana: la montada a mano (o el programa
      // listo) se deja y el plan vuelve a salir solo. Lo cambiado en los
      // ejercicios sueltos se queda.
      prefs.estructura = null;
      prefs.programa = "";
    }
  }
  prefs.configurado = true;
  entrenoGuardarPrefs(prefs);
  _cuest = null;
  if (panel) panel.classList.remove("is-cuestionario");
  document.body.classList.remove("modo-cuestionario");
  if (caja) caja.hidden = true;
  if (typeof renderEntreno === "function") renderEntreno();
  window.scrollTo(0, 0);
  var resumen = document.getElementById("entrenoResumenTitulo");
  if (resumen && guardar) {
    resumen.setAttribute("tabindex", "-1");
    try { resumen.focus({ preventScroll: true }); } catch (e) { resumen.focus(); }
  }
}

function _cuestMover(paso) {
  if (!_cuest) return;
  if (paso > 0 && !entrenoCuestionarioValido(_cuest.datos, _cuest.paso)) return;
  if (paso > 0 && _cuest.paso === CUEST_PASOS) { entrenoCuestionarioCerrar(true); return; }
  _cuest.paso = Math.max(1, Math.min(CUEST_PASOS, _cuest.paso + paso));
  _cuestPintar(true);
  window.scrollTo(0, 0);
}

function initEntrenoCuestionario() {
  var caja = _cuestCaja();
  if (!caja || _cuestCableado) return;
  _cuestCableado = true;
  caja.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-valor]");
    var grupo = b && b.parentElement && b.parentElement.id;
    if (b && grupo && _cuest) { _cuestElegir(grupo, b.getAttribute("data-valor")); return; }
    if (ev.target.closest("#cuestSiguiente")) _cuestMover(1);
    else if (ev.target.closest("#cuestAtras")) _cuestMover(-1);
    else if (ev.target.closest("#cuestCerrar")) entrenoCuestionarioCerrar(false);
  });
  document.getElementById("entExcluir").addEventListener("input", function () {
    if (_cuest) _cuest.datos.excluir = this.value;
  });
}

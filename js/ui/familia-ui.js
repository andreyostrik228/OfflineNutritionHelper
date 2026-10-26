/**
 * js/ui/familia-ui.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las personas de la casa en pantalla (2026-10-26). Ver js/core/perfiles.js
 * (quién hay y de quién es cada dato) y js/core/familia.js (el menú de
 * varias personas).
 *
 *   - Arriba, el botón con la inicial de quien está ahora; abre «¿Quién
 *     come?»: elegir persona (recarga, como Netflix), añadir, renombrar y
 *     borrar.
 *   - En «Mis datos», «Para quién es el menú»: las demás personas, los
 *     invitados sin perfil, menú común o cada uno el suyo, y el presupuesto
 *     por persona o para toda la familia.
 *   - En el menú, encima del resumen, quién come y con qué ración; si cada
 *     uno tiene su menú, botones para ver el de cada persona.
 *
 * Expone (globales):
 *   initPersonas(), initFamiliaCampo(), pintarFamiliaPlan(familia, viendo, alElegir)
 * ─────────────────────────────────────────────────────────────────────────
 */

function _famT(clave, respaldo) {
  if (typeof t !== "function") return respaldo;
  var s = t(clave);
  return s && s !== clave ? s : respaldo;
}

function _famInicial(nombre) {
  var n = String(nombre || "").trim();
  return n ? n.charAt(0).toUpperCase() : "?";
}

function _famAvatar(perfil, clase) {
  var nombre = perfilNombre(perfil);
  return '<span class="persona-avatar' + (clase ? " " + clase : "") + '" style="background:' + escapeHtml(perfil.color) + '" aria-hidden="true">' +
    escapeHtml(_famInicial(nombre)) + "</span>";
}

/** ¿Tiene esta persona lo que hace falta para calcular su menú? */
function _famTieneDatos(id) {
  if (id === perfilActivoId()) return true;
  return !!familiaDatosPersona(perfilLeerDatos(id, "nutritionPlanner.settings.v1"), {});
}

// ── Botón de arriba y «¿Quién come?» ────────────────────────────────────

var _personaBorrarArmado = null;

function initPersonas() {
  if (typeof perfilesLeer !== "function") return;
  var boton = document.getElementById("personaBtn");
  var dialogo = document.getElementById("personasDialogo");
  if (!boton || !dialogo) return;
  pintarBotonPersona();
  boton.addEventListener("click", abrirPersonas);
  var cerrar = document.getElementById("personasCerrar");
  if (cerrar) cerrar.addEventListener("click", function () { dialogo.close(); });
  var lista = document.getElementById("personasLista");
  if (lista) lista.addEventListener("click", _personasClic);
  var form = document.getElementById("personasNueva");
  if (form) form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var campo = document.getElementById("personasNombre");
    var nueva = perfilCrear(campo ? campo.value : "");
    if (!nueva) {
      _personasError(perfilesLeer().lista.length >= PERFILES_MAX
        ? tFormat("ui.personas_max", { n: PERFILES_MAX }) : _famT("ui.personas_nombre_falta", "Escribe un nombre."));
      return;
    }
    if (campo) campo.value = "";
    _personasError("");
    pintarPersonas();
    if (typeof initFamiliaCampo === "function") pintarFamiliaCampo();
    if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
  });
}

function pintarBotonPersona() {
  var boton = document.getElementById("personaBtn");
  if (!boton) return;
  var estado = perfilesLeer();
  var activo = estado.lista.filter(function (p) { return p.id === estado.activo; })[0];
  // Sin nombre propio («Я») basta el círculo: «Я Я» sobra.
  boton.innerHTML = _famAvatar(activo) +
    (activo.nombre ? '<span class="topbar__persona-nombre">' + escapeHtml(activo.nombre) + "</span>" : "");
  boton.setAttribute("aria-label", tFormat("ui.personas_boton", { nombre: perfilNombre(activo) }));
  document.body.classList.toggle("con-personas", estado.lista.length > 1);
}

function abrirPersonas() {
  var dialogo = document.getElementById("personasDialogo");
  pintarPersonas();
  _personasError("");
  if (typeof dialogo.showModal === "function") dialogo.showModal(); else dialogo.setAttribute("open", "");
}

function pintarPersonas() {
  var lista = document.getElementById("personasLista");
  if (!lista) return;
  var estado = perfilesLeer();
  lista.innerHTML = estado.lista.map(function (p) {
    var ahora = p.id === estado.activo;
    var nombre = perfilNombre(p);
    var sinDatos = !_famTieneDatos(p.id);
    return '<li class="persona' + (ahora ? " is-ahora" : "") + '" data-id="' + escapeHtml(p.id) + '">' +
      '<button type="button" class="persona__elegir" data-accion="elegir"' + (ahora ? ' aria-current="true"' : "") + ">" +
        _famAvatar(p, "persona-avatar--grande") +
        '<span class="persona__texto"><span class="persona__nombre">' + escapeHtml(nombre) + "</span>" +
        '<span class="persona__nota">' + escapeHtml(ahora ? _famT("ui.personas_ahora", "Ahora")
          : (sinDatos ? _famT("ui.personas_sin_datos", "Sin datos todavía") : _famT("ui.personas_cambiar_a", "Pasar a esta persona"))) + "</span></span>" +
      "</button>" +
      '<button type="button" class="persona__accion" data-accion="renombrar">' + escapeHtml(_famT("ui.personas_renombrar", "Nombre")) + "</button>" +
      (p.id === PERFIL_TITULAR ? "" :
        '<button type="button" class="persona__accion persona__accion--borrar" data-accion="borrar" aria-label="' +
          escapeHtml(tFormat("ui.personas_borrar_a", { nombre: nombre })) + '">' + escapeHtml(_famT("ui.personas_borrar", "Borrar")) + "</button>") +
    "</li>";
  }).join("");
}

function _personasError(texto) {
  var el = document.getElementById("personasError");
  if (!el) return;
  el.textContent = texto;
  el.hidden = !texto;
}

function _personasClic(ev) {
  var b = ev.target.closest ? ev.target.closest("button[data-accion]") : null;
  if (!b) return;
  var li = b.closest(".persona");
  var id = li && li.getAttribute("data-id");
  var accion = b.getAttribute("data-accion");
  if (accion === "elegir") {
    if (id === perfilActivoId()) { document.getElementById("personasDialogo").close(); return; }
    // Como en Netflix: cambiar de persona es otra pantalla entera. Cada módulo
    // lee sus claves al cargar, así que se recarga. Antes, lo escrito en «Mis
    // datos» se guarda (si no, solo se guardaba al generar un plan).
    if (typeof window.guardarDatosDelFormulario === "function") {
      try { window.guardarDatosDelFormulario(); } catch (e) { /* se cambia igual */ }
    }
    if (perfilElegir(id)) location.reload();
    return;
  }
  if (accion === "renombrar") {
    var nombreEl = li.querySelector(".persona__nombre");
    var actual = (perfilesLeer().lista.filter(function (p) { return p.id === id; })[0] || {}).nombre || "";
    var input = document.createElement("input");
    input.type = "text";
    input.className = "persona__input";
    input.maxLength = 24;
    input.value = actual;
    input.setAttribute("aria-label", _famT("ui.personas_renombrar", "Nombre"));
    var hecho = false;
    var guardar = function () {
      if (hecho) return;
      hecho = true;
      if (perfilRenombrar(id, input.value) && typeof pushSettingsToCloud === "function") pushSettingsToCloud();
      pintarPersonas();
      pintarBotonPersona();
      pintarFamiliaCampo();
    };
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); guardar(); }
      if (e.key === "Escape") { e.preventDefault(); hecho = true; pintarPersonas(); }
    });
    input.addEventListener("blur", guardar);
    li.querySelector(".persona__elegir").replaceWith(input);
    input.focus();
    return;
  }
  if (accion === "borrar") {
    // Dos toques: borra también su peso, sus entrenamientos y su menú.
    if (_personaBorrarArmado !== id) {
      _personaBorrarArmado = id;
      b.textContent = _famT("ui.personas_borrar_seguro", "¿Seguro?");
      b.classList.add("is-armado");
      setTimeout(function () { if (_personaBorrarArmado === id) { _personaBorrarArmado = null; pintarPersonas(); } }, 4000);
      return;
    }
    _personaBorrarArmado = null;
    var eraActiva = id === perfilActivoId();
    perfilBorrar(id);
    var f = familiaLeer();
    f.quienes = f.quienes.filter(function (x) { return x !== id; });
    familiaGuardar(f);
    if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
    if (eraActiva) { location.reload(); return; }
    pintarPersonas();
    pintarBotonPersona();
    pintarFamiliaCampo();
  }
}

// ── «Para quién es el menú», en «Mis datos» ─────────────────────────────

function initFamiliaCampo() {
  var campo = document.getElementById("familiaCampo");
  if (!campo || typeof familiaLeer !== "function" || typeof perfilesLeer !== "function") return;
  campo.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button") : null;
    if (!b || !campo.contains(b)) return;
    var f = familiaLeer();
    if (b.hasAttribute("data-persona")) {
      var id = b.getAttribute("data-persona");
      var i = f.quienes.indexOf(id);
      if (i === -1) f.quienes.push(id); else f.quienes.splice(i, 1);
    } else if (b.hasAttribute("data-invitados")) {
      f.invitados = Math.max(0, Math.min(FAMILIA_INVITADOS_MAX, f.invitados + Number(b.getAttribute("data-invitados"))));
    } else if (b.hasAttribute("data-modo")) {
      f.modo = b.getAttribute("data-modo");
    } else if (b.hasAttribute("data-presupuesto")) {
      f.presupuesto = b.getAttribute("data-presupuesto");
    } else if (b.hasAttribute("data-anadir")) {
      abrirPersonas();
      return;
    } else {
      return;
    }
    familiaGuardar(f);
    pintarFamiliaCampo();
  });
  pintarFamiliaCampo();
}

function pintarFamiliaCampo() {
  var quienesEl = document.getElementById("familiaQuienes");
  var opcionesEl = document.getElementById("familiaOpciones");
  var pistaEl = document.getElementById("familiaPista");
  if (!quienesEl) return;
  var f = familiaLeer();
  var estado = perfilesLeer();
  var personas = 1;
  quienesEl.innerHTML = estado.lista.map(function (p) {
    var ahora = p.id === estado.activo;
    var elegida = ahora || f.quienes.indexOf(p.id) !== -1;
    var conDatos = _famTieneDatos(p.id);
    if (!ahora && elegida && conDatos) personas++;
    return '<button type="button" class="familia-chip' + (elegida && conDatos ? " is-on" : "") + '"' +
      (ahora ? ' disabled aria-pressed="true"' : ' data-persona="' + escapeHtml(p.id) + '" aria-pressed="' + (elegida ? "true" : "false") + '"') + ">" +
      _famAvatar(p) + '<span class="familia-chip__nombre">' + escapeHtml(perfilNombre(p)) + "</span>" +
      (!conDatos ? '<span class="familia-chip__nota">' + escapeHtml(_famT("ui.personas_sin_datos", "Sin datos todavía")) + "</span>" : "") +
    "</button>";
  }).join("") +
    '<button type="button" class="familia-chip familia-chip--anadir" data-anadir>' +
      '<span class="persona-avatar persona-avatar--mas" aria-hidden="true">+</span>' +
      '<span class="familia-chip__nombre">' + escapeHtml(_famT("ui.personas_anadir_corto", "Añadir")) + "</span></button>";

  var inv = document.getElementById("familiaInvitadosN");
  if (inv) inv.textContent = String(f.invitados);
  var menos = document.querySelector('#familiaCampo [data-invitados="-1"]');
  if (menos) menos.disabled = f.invitados <= 0;
  var mas = document.querySelector('#familiaCampo [data-invitados="1"]');
  if (mas) mas.disabled = f.invitados >= FAMILIA_INVITADOS_MAX;

  var total = personas + f.invitados;
  if (opcionesEl) opcionesEl.hidden = total < 2;
  Array.prototype.forEach.call(document.querySelectorAll("#familiaCampo [data-modo]"), function (b) {
    var si = b.getAttribute("data-modo") === f.modo;
    b.classList.toggle("is-on", si);
    b.setAttribute("aria-checked", si ? "true" : "false");
  });
  Array.prototype.forEach.call(document.querySelectorAll("#familiaCampo [data-presupuesto]"), function (b) {
    var si = b.getAttribute("data-presupuesto") === f.presupuesto;
    b.classList.toggle("is-on", si);
    b.setAttribute("aria-checked", si ? "true" : "false");
  });
  if (pistaEl) {
    pistaEl.textContent = total < 2 ? _famT("ui.familia_pista_solo", "")
      : tFormat(f.modo === "cada" ? "ui.familia_pista_cada" : "ui.familia_pista_comun", { n: total });
  }
}

// ── En el menú: quién come y con qué ración ─────────────────────────────

/**
 * @param {object|null} familia - la del plan en pantalla (app.js)
 * @param {string} viendo - id de la persona cuyo menú se ve (modo «cada»)
 * @param {function(string)} alElegir - ver el menú de otra persona
 */
function pintarFamiliaPlan(familia, viendo, alElegir) {
  var caja = document.getElementById("familiaPlan");
  if (!caja) return;
  if (!familia || !familia.personas || (familia.personas.length < 2 && !familia.invitados)) {
    caja.hidden = true;
    caja.innerHTML = "";
    return;
  }
  var fmt = function (x) { return (typeof fmtNum === "function") ? fmtNum(x) : String(x); };
  var html;
  if (familia.modo === "cada") {
    html = '<p class="familia-plan__titulo">' + escapeHtml(tFormat("ui.familia_plan_cada", { n: familia.personas.length + familia.invitados })) + "</p>" +
      '<div class="familia-plan__ver" role="group" aria-label="' + escapeHtml(_famT("ui.familia_ver_menu_de", "Ver el menú de")) + '">' +
      familia.personas.map(function (p) {
        var si = p.id === viendo;
        return '<button type="button" class="familia-chip' + (si ? " is-on" : "") + '" data-ver="' + escapeHtml(p.id) + '" aria-pressed="' + (si ? "true" : "false") + '">' +
          _famAvatar(p) + '<span class="familia-chip__nombre">' + escapeHtml(p.nombre) + "</span></button>";
      }).join("") + "</div>" +
      (familia.invitados ? '<p class="familia-plan__nota">' + escapeHtml(tFormat("ui.familia_invitados_como", { n: familia.invitados, nombre: familia.personas[0].nombre })) + "</p>" : "");
  } else {
    var partes = familia.personas.map(function (p) { return p.nombre + " ×" + fmt(p.escala); });
    if (familia.invitados) partes.push(tFormat("ui.familia_invitados_n", { n: familia.invitados }) + " ×1");
    html = '<p class="familia-plan__titulo">' + escapeHtml(tFormat("ui.familia_plan_comun", { n: familia.personas.length + familia.invitados })) + "</p>" +
      '<p class="familia-plan__raciones">' + escapeHtml(_famT("ui.familia_raciones", "Raciones") + ": " + partes.join(" · ")) + "</p>" +
      '<p class="familia-plan__nota">' + escapeHtml(tFormat("ui.familia_tarjetas_de", { nombre: familia.personas[0].nombre })) + "</p>";
  }
  html += '<p class="familia-plan__nota">' + escapeHtml(_famT("ui.familia_compra_todos", "La compra es para todos.")) + "</p>";
  caja.innerHTML = html;
  caja.hidden = false;
  caja.onclick = function (ev) {
    var b = ev.target.closest ? ev.target.closest("[data-ver]") : null;
    if (b && typeof alElegir === "function") alElegir(b.getAttribute("data-ver"));
  };
}

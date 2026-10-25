/**
 * js/ui/hora-selector.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tambor de horas y minutos (2026-10-25). Pedido del dueño: «выбор времени
 * подъёма и сна одинаковый для iOS и Android… на андроиде это сейчас просто
 * ужас». El <input type="time"> abre la rueda de iOS en un iPhone y la esfera
 * de reloj en Android; este tambor es el mismo en los dos.
 *
 * Dos columnas que se deslizan (scroll-snap): horas de 00 a 23 y minutos de 5
 * en 5. Si la hora guardada trae otro minuto (07:10 sí, 07:12 no), ese minuto
 * se añade a la lista: elegir con el tambor nunca cambia a escondidas lo que
 * ya había.
 *
 * Cada columna es un `spinbutton`: con el teclado, las flechas, Re Pág/Av Pág
 * e Inicio/Fin; con un lector de pantalla táctil, los botones «más/menos» que
 * solo él ve.
 *
 * Lo usan el cuestionario de la bienvenida (el tambor en la pregunta) y el
 * formulario (form-controls.js: un botón que lo abre en una hoja).
 *
 * Expone (globales):
 *   horaRueda(valor, opciones) → { el, valor(), poner(v), ajustar(), enfocar() }
 *   horaPartes(texto) → { h, m } | null
 *   horaTexto(h, m) → "HH:MM"
 *   horaMinutos(m) → los minutos de la columna (de 5 en 5, más m si falta)
 * ─────────────────────────────────────────────────────────────────────────
 */

var HORA_FILA = 44;   // alto de cada fila, en px (el mismo que .hora-rueda__item)
var HORA_PASO = 5;    // los minutos, de 5 en 5
var HORA_VISTAS = 5;  // filas a la vista: la elegida y dos por encima y por debajo

function _horaDos(n) { return (n < 10 ? "0" : "") + n; }

/** "7:05", "07:05" o "07:05:00" → { h: 7, m: 5 }; lo demás, null. */
function horaPartes(texto) {
  var m = /^\s*(\d{1,2}):(\d{2})/.exec(String(texto == null ? "" : texto));
  if (!m) return null;
  var h = parseInt(m[1], 10);
  var mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59) return null;
  return { h: h, m: mi };
}

function horaTexto(h, m) { return _horaDos(h) + ":" + _horaDos(m); }

function horaMinutos(m) {
  var lista = [];
  for (var i = 0; i < 60; i += HORA_PASO) lista.push(i);
  if (typeof m === "number" && m >= 0 && m < 60 && lista.indexOf(m) === -1) {
    lista.push(m);
    lista.sort(function (a, b) { return a - b; });
  }
  return lista;
}

function _horaT(clave, respaldo) {
  if (typeof t !== "function") return respaldo;
  var s = t(clave);
  return s && s !== clave ? s : respaldo;
}

function _horaSinMovimiento() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Una columna del tambor. `valores` son números; `alCambiar(i)` se llama cada
 * vez que cambia la fila del centro (también a mitad de un deslizamiento, para
 * que «Siguiente» lea siempre lo que se ve).
 *
 * Da la vuelta, como un reloj: tras 23 viene 00 (para acostarse a las 00:30
 * no hay que volver a subir por todo el día). La lista va repetida
 * HORA_VUELTAS veces y, al soltar, se recoloca sin que se note en la copia del
 * medio, con el mismo valor.
 */
var HORA_VUELTAS = 5;

function _horaColumna(valores, nombre, alCambiar) {
  var n = valores.length;
  var total = n * HORA_VUELTAS;
  var medio = Math.floor(HORA_VUELTAS / 2) * n;

  var col = document.createElement("div");
  col.className = "hora-rueda__col";
  col.tabIndex = 0;
  col.setAttribute("role", "spinbutton");
  col.setAttribute("aria-label", nombre);
  col.setAttribute("aria-valuemin", String(valores[0]));
  col.setAttribute("aria-valuemax", String(valores[n - 1]));

  var lista = document.createElement("div");
  lista.className = "hora-rueda__lista";
  lista.setAttribute("aria-hidden", "true");
  var filas = [];
  for (var k = 0; k < total; k++) {
    var f = document.createElement("div");
    f.className = "hora-rueda__item";
    f.textContent = _horaDos(valores[k % n]);
    f.setAttribute("data-k", String(k));
    lista.appendChild(f);
    filas.push(f);
  }
  col.appendChild(lista);

  var indice = 0;      // el valor elegido, de 0 a n − 1
  var pintado = -1;    // la fila (de 0 a total − 1) marcada como elegida
  var cuadro = 0;
  var quieto = null;
  var tocando = false;

  function anunciar() {
    col.setAttribute("aria-valuenow", String(valores[indice]));
    col.setAttribute("aria-valuetext", _horaDos(valores[indice]));
  }
  function filaCentro() {
    return Math.max(0, Math.min(total - 1, Math.round(col.scrollTop / HORA_FILA)));
  }

  // Cada fila se inclina y se apaga según lo lejos que quede del centro: la
  // rueda de un reloj, no una lista.
  function pintar() {
    cuadro = 0;
    // Sin medidas (dentro de un <dialog> cerrado) scrollTop vale 0: no se lee.
    if (!col.clientHeight) return;
    var pos = col.scrollTop / HORA_FILA;
    var centro = filaCentro();
    var plano = _horaSinMovimiento();
    var desde = Math.max(0, Math.floor(pos) - 4);
    var hasta = Math.min(total - 1, Math.ceil(pos) + 4);
    for (var i = desde; i <= hasta; i++) {
      var d = i - pos;
      var a = Math.min(Math.abs(d), 3);
      filas[i].style.opacity = String(Math.max(0.22, 1 - a * 0.3));
      filas[i].style.transform = plano ? "" : "perspective(260px) rotateX(" + (-d * 22).toFixed(1) + "deg) scale(" + (1 - a * 0.05).toFixed(3) + ")";
    }
    if (centro !== pintado) {
      if (pintado !== -1) filas[pintado].classList.remove("is-sel");
      filas[centro].classList.add("is-sel");
      pintado = centro;
    }
    if (centro % n !== indice) {
      indice = centro % n;
      anunciar();
      alCambiar(indice);
    }
  }

  // De vuelta a la copia del medio, con el mismo valor: así nunca se llega al
  // final de la lista. Solo con el dedo fuera, que mover el scroll mientras se
  // arrastra da tirones en iOS.
  function recolocar() {
    quieto = null;
    if (tocando || !col.clientHeight) return;
    var centro = filaCentro();
    if (centro >= medio && centro < medio + n) return;
    col.scrollTop = (medio + centro % n) * HORA_FILA;
    pintar();
  }
  function alParar() {
    clearTimeout(quieto);
    quieto = setTimeout(recolocar, 160);
  }

  function ir(fila, suave) {
    fila = Math.max(0, Math.min(total - 1, fila));
    if (!col.clientHeight) {
      if (fila % n !== indice) { indice = fila % n; anunciar(); alCambiar(indice); }
      return;
    }
    if (suave && !_horaSinMovimiento() && typeof col.scrollTo === "function") {
      col.scrollTo({ top: fila * HORA_FILA, behavior: "smooth" });
      return;
    }
    col.scrollTop = fila * HORA_FILA;
    pintar();
    alParar();
  }
  // El teclado y los botones del lector van de golpe, para que dos
  // pulsaciones seguidas sumen dos.
  function mover(paso) {
    ir((col.clientHeight ? filaCentro() : medio + indice) + paso, false);
  }

  col.addEventListener("scroll", function () {
    if (!cuadro) cuadro = (window.requestAnimationFrame || setTimeout)(pintar);
    alParar();
  });
  col.addEventListener("touchstart", function () { tocando = true; }, { passive: true });
  ["touchend", "touchcancel"].forEach(function (tipo) {
    col.addEventListener(tipo, function () { tocando = false; alParar(); }, { passive: true });
  });
  // Tocar una fila la trae al centro.
  lista.addEventListener("click", function (ev) {
    var fila = ev.target.closest ? ev.target.closest(".hora-rueda__item") : null;
    if (fila) ir(parseInt(fila.getAttribute("data-k"), 10), true);
  });
  col.addEventListener("keydown", function (ev) {
    var salto = { ArrowUp: 1, ArrowDown: -1, PageUp: 3, PageDown: -3 }[ev.key];
    if (ev.key === "Home") { ev.preventDefault(); ir(medio, false); return; }
    if (ev.key === "End") { ev.preventDefault(); ir(medio + n - 1, false); return; }
    if (!salto) return;
    ev.preventDefault();
    mover(salto);
  });

  return {
    el: col,
    // Lo que se ve en el centro ahora mismo, aunque el dedo aún no haya soltado.
    centro: function () { return col.clientHeight ? filaCentro() % n : indice; },
    mover: mover,
    poner: function (i) {
      indice = Math.max(0, Math.min(n - 1, i));
      anunciar();
      if (!col.clientHeight) return;
      col.scrollTop = (medio + indice) * HORA_FILA;
      pintar();
    }
  };
}

/** Un botón que solo ve el lector de pantalla: en el móvil no hay flechas. */
function _horaBotonLector(texto, alPulsar) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "solo-lectores";
  b.textContent = texto;
  b.addEventListener("click", alPulsar);
  return b;
}

/**
 * El tambor entero. opciones: { alCambiar(valor), etiquetadoPor: id, nombre }.
 * Se puede crear fuera de la página: `ajustar()` vuelve a colocar las columnas
 * cuando ya se ven (un <dialog> cerrado no tiene medidas).
 */
function horaRueda(valor, opciones) {
  var o = opciones || {};
  var p = horaPartes(valor) || { h: 7, m: 0 };
  var horas = [];
  for (var h = 0; h < 24; h++) horas.push(h);
  var minutos = horaMinutos(p.m);

  var caja = document.createElement("div");
  caja.className = "hora-rueda";
  caja.setAttribute("role", "group");
  if (o.etiquetadoPor) caja.setAttribute("aria-labelledby", o.etiquetadoPor);
  else if (o.nombre) caja.setAttribute("aria-label", o.nombre);

  var banda = document.createElement("div");
  banda.className = "hora-rueda__banda";
  banda.setAttribute("aria-hidden", "true");
  caja.appendChild(banda);

  function avisar() {
    if (typeof o.alCambiar === "function") o.alCambiar(leer());
  }
  var nombreH = _horaT("ui.hora_horas", "Horas");
  var nombreM = _horaT("ui.hora_minutos", "Minutos");
  var colH = _horaColumna(horas, nombreH, avisar);
  var colM = _horaColumna(minutos, nombreM, avisar);

  function leer() { return horaTexto(horas[colH.centro()], minutos[colM.centro()]); }

  function paso(col, n) { return function () { col.mover(n); }; }
  var mas = _horaT("ui.hora_mas", "{col}: más");
  var menos = _horaT("ui.hora_menos", "{col}: menos");

  caja.appendChild(_horaBotonLector(menos.replace("{col}", nombreH), paso(colH, -1)));
  caja.appendChild(colH.el);
  caja.appendChild(_horaBotonLector(mas.replace("{col}", nombreH), paso(colH, 1)));
  var dos = document.createElement("span");
  dos.className = "hora-rueda__dos";
  dos.setAttribute("aria-hidden", "true");
  dos.textContent = ":";
  caja.appendChild(dos);
  caja.appendChild(_horaBotonLector(menos.replace("{col}", nombreM), paso(colM, -1)));
  caja.appendChild(colM.el);
  caja.appendChild(_horaBotonLector(mas.replace("{col}", nombreM), paso(colM, 1)));

  var pedido = p;
  function ajustar() {
    colH.poner(horas.indexOf(pedido.h));
    colM.poner(minutos.indexOf(pedido.m));
  }
  ajustar();
  // Recién creado aún no está en la página: se recoloca en cuanto se pinte.
  if (typeof window !== "undefined" && window.requestAnimationFrame) window.requestAnimationFrame(ajustar);

  return {
    el: caja,
    valor: leer,
    poner: function (v) {
      var q = horaPartes(v);
      if (!q) return;
      if (minutos.indexOf(q.m) === -1) return; // un minuto fuera de la lista: se crea otro tambor
      pedido = q;
      ajustar();
    },
    ajustar: ajustar,
    enfocar: function () { colH.el.focus({ preventScroll: true }); }
  };
}

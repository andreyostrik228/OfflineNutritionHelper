/**
 * js/ui/entreno-figura.js
 * ─────────────────────────────────────────────────────────────────────────
 * ANIMACIONES DE LOS EJERCICIOS (2026-10-18). Un «hombre gris» que hace cada
 * ejercicio del catálogo, con el estilo que eligió el dueño en la página de
 * ejemplos (mezcla de los números 2, 6, 7 y 12):
 *   - silueta de un solo gris con una línea fina del color del fondo entre
 *     las partes del cuerpo (2);
 *   - los músculos que trabajan en naranja, y más claros los que ayudan (6);
 *   - la postura de salida en fantasma, el camino punteado del punto que
 *     manda (barra, manos, cadera…) y una flecha con el sentido (7);
 *   - cuadrícula, marcas en las articulaciones del lado cercano y el ángulo
 *     de la articulación principal (12).
 * En pequeño ("mini", en las listas) solo van la silueta, los músculos y el
 * material.
 *
 * Cómo funciona: un esqueleto en 3D (x hacia delante de la persona, y hacia
 * arriba, z hacia su derecha) que cada ejercicio coloca en cada instante
 * (js/data/exercise-poses.js); cinemática inversa de dos huesos para los
 * brazos y piernas que agarran algo o pisan el suelo; proyección ortográfica
 * desde la cámara del ejercicio; y se pinta de lo lejano a lo cercano.
 *
 * Solo se mueve lo que está a la vista (IntersectionObserver), a unos 30
 * cuadros por segundo. Con «reducir movimiento» queda quieta cerca de la
 * postura final; el fantasma y el camino ya explican el gesto.
 *
 * Expone (globales):
 *   entrenoAnimacionTiene(id)                  ¿hay animación para ese ejercicio?
 *   entrenoAnimacionHtml(id, detalle, etiqueta)  un <svg> vacío, listo para animar
 *   entrenoAnimacionesActivar(raiz)            prepara y mueve los <svg data-anim> de raiz
 *   entrenoFiguraEscena(id, s, detalle, lado)  un instante como lista de formas (sin DOM)
 *   entrenoFiguraSvg(id, s, detalle, lado)     un instante como texto <svg> (tests, impresión)
 * ─────────────────────────────────────────────────────────────────────────
 */

var FIG = {
  cab: 9.5, cuello: 5.5, tronco: 45, hombroAlto: 42, hombroAncho: 13, cadera: 8.5,
  brazo: 25.5, ante: 22.5, mano: 6, muslo: 37, pierna: 37, tobillo: 6, punta: 13, talon: 4
};
var FIG_ANCHO = { tronco: 19, cuello: 7.5, brazo: 9.5, ante: 8, mano: 6.5, muslo: 14, pierna: 10.5, pie: 6 };
var FIG_SEPARACION = 2.6;
var FIG_PERIODO_MS = 3200;
/** Lo más apaisado que va la grande (ancho / alto). */
var FIG_APAISADO = 1.6;
var FIG_RAD = Math.PI / 180;

/**
 * Dónde va cada músculo: [segmento, cara, desde, hasta]. Cara 1 = delante,
 * -1 = detrás, 0 = el lado de fuera. desde/hasta, a lo largo del segmento.
 */
var FIG_ZONAS = {
  pecho: [["tronco", 1, 0.6, 0.93]],
  abdomen: [["tronco", 1, 0.08, 0.55]],
  oblicuos: [["tronco", 0, 0.1, 0.55]],
  dorsal: [["tronco", -1, 0.42, 0.86]],
  trapecio: [["tronco", -1, 0.84, 1], ["cuello", -1, 0, 1]],
  lumbar: [["tronco", -1, 0.04, 0.38]],
  deltoide_ant: [["brazo", 1, 0, 0.3]],
  deltoide_lat: [["brazo", 0, 0, 0.32]],
  deltoide_post: [["brazo", -1, 0, 0.3]],
  biceps: [["brazo", 1, 0.32, 0.9]],
  triceps: [["brazo", -1, 0.22, 0.9]],
  antebrazo: [["ante", 1, 0.08, 0.62]],
  cuadriceps: [["muslo", 1, 0.12, 0.88]],
  isquios: [["muslo", -1, 0.2, 0.86]],
  gluteos: [["muslo", -1, 0, 0.26]],
  aductores: [["muslo", 0, 0.18, 0.62]],
  gemelos: [["pierna", -1, 0.06, 0.5]]
};

// ── Vectores ────────────────────────────────────────────────────────────

function _fv(x, y, z) { return [x, y, z]; }
function _fSuma(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function _fResta(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function _fEscala(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function _fPunto(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function _fCruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function _fLargo(a) { return Math.sqrt(_fPunto(a, a)); }
function _fUnidad(a) { var l = _fLargo(a); return l > 1e-9 ? _fEscala(a, 1 / l) : [0, 0, 0]; }
/** Suma de vectores con pesos: _fMezcla([v1, k1], [v2, k2]…). */
function _fMezcla() {
  var r = [0, 0, 0];
  for (var i = 0; i < arguments.length; i++) {
    var par = arguments[i];
    r[0] += par[0][0] * par[1]; r[1] += par[0][1] * par[1]; r[2] += par[0][2] * par[1];
  }
  return r;
}
/** Gira v alrededor del eje (unitario) los grados que se pidan (Rodrigues). */
function _fRotar(v, eje, grados) {
  var a = grados * FIG_RAD;
  var c = Math.cos(a);
  var s = Math.sin(a);
  return _fMezcla([v, c], [_fCruz(eje, v), s], [eje, _fPunto(eje, v) * (1 - c)]);
}

// ── Marcos: el del cuerpo y el del tronco ───────────────────────────────

/** Cuerpo girado: pitch = se inclina hacia delante, roll = hacia su derecha, yaw = se vuelve. */
function _fMarco(giro) {
  var X = [1, 0, 0];
  var Y = [0, 1, 0];
  var Z = [0, 0, 1];
  var g = giro || {};
  if (g.pitch) { X = _fRotar(X, Z, -g.pitch); Y = _fRotar(Y, Z, -g.pitch); }
  if (g.roll) { Y = _fRotar(Y, X, g.roll); Z = _fRotar(Z, X, g.roll); }
  if (g.yaw) {
    var arriba = [0, 1, 0];
    X = _fRotar(X, arriba, g.yaw); Y = _fRotar(Y, arriba, g.yaw); Z = _fRotar(Z, arriba, g.yaw);
  }
  return { X: X, Y: Y, Z: Z };
}

/** El tronco sobre la pelvis: flex = se dobla hacia delante, lat = hacia su derecha, giro = rota. */
function _fMarcoTronco(B, t) {
  var X = B.X;
  var Y = B.Y;
  var Z = B.Z;
  var r = t || {};
  if (r.flex) { X = _fRotar(X, Z, -r.flex); Y = _fRotar(Y, Z, -r.flex); }
  if (r.lat) { Y = _fRotar(Y, X, r.lat); Z = _fRotar(Z, X, r.lat); }
  if (r.giro) { X = _fRotar(X, Y, r.giro); Z = _fRotar(Z, Y, r.giro); }
  return { X: X, Y: Y, Z: Z };
}

/**
 * Dirección dentro de un marco: f = cuánto va hacia delante y arriba (0 =
 * hacia abajo, 90 = al frente, 180 = arriba); s = cuánto se abre hacia fuera
 * (lado: 1 derecha, -1 izquierda).
 */
function _fDir(M, f, s, lado) {
  var rf = (f || 0) * FIG_RAD;
  var rs = (s || 0) * FIG_RAD;
  return _fUnidad(_fMezcla([M.X, Math.sin(rf) * Math.cos(rs)], [M.Y, -Math.cos(rf) * Math.cos(rs)], [M.Z, Math.sin(rs) * lado]));
}

/** La cara de delante de un segmento con ángulo f: gira con él (de pie mira al frente). */
function _fDelante(M, f) {
  var rf = (f || 0) * FIG_RAD;
  return _fUnidad(_fMezcla([M.X, Math.cos(rf)], [M.Y, Math.sin(rf)]));
}

/** Perpendicular de v respecto a u (unitario); si salen paralelos, la de respaldo. */
function _fPerp(v, u, respaldo) {
  var p = _fResta(v, _fEscala(u, _fPunto(v, u)));
  if (_fLargo(p) < 1e-6) p = _fResta(respaldo, _fEscala(u, _fPunto(respaldo, u)));
  return _fUnidad(p);
}

/**
 * Cinemática inversa de dos huesos: desde A hacia el objetivo T, el codo o la
 * rodilla sale hacia «polo». Si T no se alcanza, el miembro se estira hacia él.
 */
function _fIk(A, T, l1, l2, polo) {
  var d = _fResta(T, A);
  var dist = _fLargo(d);
  var u = dist > 1e-6 ? _fEscala(d, 1 / dist) : [0, -1, 0];
  var dd = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, dist));
  var cosA = (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd);
  var sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  var p = _fPerp(polo, u, Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  return { medio: _fMezcla([A, 1], [u, l1 * cosA], [p, l1 * sinA]), fin: _fMezcla([A, 1], [u, dd]), polo: p };
}

// ── El esqueleto de un instante ─────────────────────────────────────────

function _fBrazo(j, T, b, lado, signo) {
  var hombro = j["hombro" + lado];
  var codo;
  var muneca;
  var mano;
  var delanteBrazo;
  var delanteAnte;
  if (b.mano) {
    var polo = b.polo || _fMezcla([T.X, -0.45], [T.Y, -1], [T.Z, 0.35 * signo]);
    var r = _fIk(hombro, b.mano, FIG.brazo, FIG.ante + FIG.mano / 2, polo);
    codo = r.medio;
    var u = _fUnidad(_fResta(r.fin, codo));
    muneca = _fMezcla([codo, 1], [u, FIG.ante]);
    mano = _fMezcla([muneca, 1], [u, FIG.mano]);
    delanteBrazo = _fEscala(r.polo, -1);
    delanteAnte = _fPerp(_fEscala(r.polo, -1), u, T.X);
  } else {
    var d1 = _fDir(T, b.f, b.s, signo);
    var d2 = _fDir(T, b.cf !== undefined ? b.cf : b.f, b.cs !== undefined ? b.cs : b.s, signo);
    var d3 = b.mf !== undefined ? _fDir(T, b.mf, b.ms || 0, signo) : d2;
    codo = _fMezcla([hombro, 1], [d1, FIG.brazo]);
    muneca = _fMezcla([codo, 1], [d2, FIG.ante]);
    mano = _fMezcla([muneca, 1], [d3, FIG.mano]);
    delanteBrazo = _fPerp(_fDelante(T, b.f), d1, T.X);
    delanteAnte = _fPerp(_fDelante(T, b.cf !== undefined ? b.cf : b.f), d2, T.X);
  }
  j["codo" + lado] = codo;
  j["muneca" + lado] = muneca;
  j["mano" + lado] = mano;
  j._delante["brazo" + lado] = delanteBrazo;
  j._delante["ante" + lado] = delanteAnte;
}

function _fPierna(j, B, p, lado, signo) {
  var cadera = j["cadera" + lado];
  var rodilla;
  var tobillo;
  var delanteMuslo;
  var delantePierna;
  var dirPie;
  var arribaPie;
  if (p.tobillo) {
    var polo = p.polo || _fMezcla([B.X, 1], [B.Z, 0.12 * signo]);
    var r = _fIk(cadera, p.tobillo, FIG.muslo, FIG.pierna, polo);
    rodilla = r.medio;
    tobillo = r.fin;
    var uPierna = _fUnidad(_fResta(tobillo, rodilla));
    delanteMuslo = r.polo;
    delantePierna = _fPerp(r.polo, uPierna, B.X);
    var plano = [B.X[0], 0, B.X[2]];
    dirPie = _fUnidad(p.pieDir || (_fLargo(plano) > 0.2 ? plano : [1, 0, 0]));
    arribaPie = _fPerp(p.pieArriba || [0, 1, 0], dirPie, [0, 1, 0]);
  } else {
    var fr = p.rf !== undefined ? p.rf : p.f;
    var d1 = _fDir(B, p.f, p.s, signo);
    var d2 = _fDir(B, fr, p.rs !== undefined ? p.rs : p.s, signo);
    rodilla = _fMezcla([cadera, 1], [d1, FIG.muslo]);
    tobillo = _fMezcla([rodilla, 1], [d2, FIG.pierna]);
    delanteMuslo = _fPerp(_fDelante(B, p.f), d1, B.X);
    delantePierna = _fPerp(_fDelante(B, fr), d2, B.X);
    if (p.pieDir) {
      dirPie = _fUnidad(p.pieDir);
      arribaPie = _fPerp(p.pieArriba || [0, 1, 0], dirPie, [0, 1, 0]);
    } else {
      // El pie, en ángulo recto con la espinilla; «pie» lo estira (punta abajo) en grados.
      var frente = _fDelante(B, fr);
      dirPie = _fRotar(frente, B.Z, -(p.pie || 0));
      arribaPie = _fEscala(_fRotar(d2, B.Z, -(p.pie || 0)), -1);
    }
  }
  j["rodilla" + lado] = rodilla;
  j["tobillo" + lado] = tobillo;
  j["punta" + lado] = _fMezcla([tobillo, 1], [dirPie, FIG.punta], [arribaPie, -FIG.tobillo / 2]);
  j["talon" + lado] = _fMezcla([tobillo, 1], [dirPie, -FIG.talon], [arribaPie, -FIG.tobillo / 2]);
  j._delante["muslo" + lado] = delanteMuslo;
  j._delante["pierna" + lado] = delantePierna;
}

/** Todas las articulaciones (en el mundo) de una postura. */
function _fEsqueleto(P) {
  // P.marco da el cuerpo ya orientado ({X, Y, Z}), para posturas que no salen
  // cómodas con pitch/roll/yaw (la plancha lateral).
  var B = P.marco || _fMarco(P.giro);
  var T = _fMarcoTronco(B, P.tronco);
  var pelvis = P.pelvis;
  var j = { pelvis: pelvis, _delante: {}, _B: B, _T: T };
  j.caderaD = _fMezcla([pelvis, 1], [B.Z, FIG.cadera]);
  j.caderaI = _fMezcla([pelvis, 1], [B.Z, -FIG.cadera]);
  j.cuello = _fMezcla([pelvis, 1], [T.Y, FIG.tronco]);
  var alto = _fMezcla([pelvis, 1], [T.Y, FIG.hombroAlto]);
  j.hombroD = _fMezcla([alto, 1], [T.Z, FIG.hombroAncho]);
  j.hombroI = _fMezcla([alto, 1], [T.Z, -FIG.hombroAncho]);
  var flexCabeza = (P.cabeza && P.cabeza.flex) || 0;
  var dirCuello = flexCabeza ? _fRotar(T.Y, T.Z, -flexCabeza) : T.Y;
  j.cabeza = _fMezcla([j.cuello, 1], [dirCuello, FIG.cuello + FIG.cab]);
  j.cuelloTope = _fMezcla([j.cuello, 1], [dirCuello, FIG.cuello + 2]);
  // Hacia dónde mira la cara (2026-10-25): los ojos dicen hacia dónde va la persona.
  j._cara = { X: flexCabeza ? _fRotar(T.X, T.Z, -flexCabeza) : T.X, Y: dirCuello, Z: T.Z };
  _fBrazo(j, T, P.brazoD || {}, "D", 1);
  _fBrazo(j, T, P.brazoI || {}, "I", -1);
  _fPierna(j, B, P.piernaD || {}, "D", 1);
  _fPierna(j, B, P.piernaI || {}, "I", -1);
  j._delante.tronco = T.X;
  j._fuera = { D: T.Z, I: _fEscala(T.Z, -1), tronco: T.Z };
  return j;
}

// ── Cámara ──────────────────────────────────────────────────────────────

/** yaw 0 = de perfil desde la derecha de la persona; 90 = de frente. elev = un poco desde arriba. */
function _fCamara(yaw, elev) {
  var t = (yaw || 0) * FIG_RAD;
  var e = (elev || 0) * FIG_RAD;
  var d = [Math.sin(t), 0, Math.cos(t)];
  return {
    r: [Math.cos(t), 0, -Math.sin(t)],
    u: [-Math.sin(e) * d[0], Math.cos(e), -Math.sin(e) * d[2]],
    v: [Math.cos(e) * d[0], Math.sin(e), Math.cos(e) * d[2]]
  };
}

function _fProy(c, p) {
  return { x: _fPunto(p, c.r), y: -_fPunto(p, c.u), z: _fPunto(p, c.v) };
}

// ── La escena de un instante: formas 2D ordenadas por profundidad ──────

function _fSegmento(c, a, b, ancho, clase, prof) {
  var pa = _fProy(c, a);
  var pb = _fProy(c, b);
  return { pa: pa, pb: pb, ancho: ancho, clase: clase, prof: prof !== undefined ? prof : (pa.z + pb.z) / 2 };
}

/** Las rayas naranjas de un músculo sobre un segmento, por la cara que toca. */
function _fMusculo(c, a, b, ancho, delante, fuera, cara, t0, t1, fuerte) {
  var cara3 = cara === 0 ? fuera : _fEscala(delante, cara);
  if (!cara3) return null;
  var hacia = _fPunto(cara3, c.v);
  var pa = _fProy(c, a);
  var pb = _fProy(c, b);
  var dx = pb.x - pa.x;
  var dy = pb.y - pa.y;
  var l = Math.sqrt(dx * dx + dy * dy) || 1;
  var nx = _fPunto(cara3, c.r);
  var ny = -_fPunto(cara3, c.u);
  var paralelo = (nx * dx + ny * dy) / l;
  nx -= paralelo * dx / l;
  ny -= paralelo * dy / l;
  var m = Math.sqrt(nx * nx + ny * ny);
  if (hacia < -0.35 && m < 0.75) return null;   // mira hacia el otro lado: no se ve
  var desplaza = m > 1e-3 ? ancho * 0.24 * Math.min(1, m * 1.25) / m : 0;
  return {
    x1: pa.x + dx * t0 + nx * desplaza, y1: pa.y + dy * t0 + ny * desplaza,
    x2: pa.x + dx * t1 + nx * desplaza, y2: pa.y + dy * t1 + ny * desplaza,
    ancho: ancho * (cara === 0 ? 0.55 : 0.48), fuerte: fuerte
  };
}

function _fCasco(puntos) {
  // Envolvente convexa (cadena monótona) de puntos 2D.
  var p = puntos.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
  if (p.length < 3) return p;
  function giro(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
  var abajo = [];
  var arriba = [];
  p.forEach(function (q) {
    while (abajo.length >= 2 && giro(abajo[abajo.length - 2], abajo[abajo.length - 1], q) <= 0) abajo.pop();
    abajo.push(q);
  });
  p.slice().reverse().forEach(function (q) {
    while (arriba.length >= 2 && giro(arriba[arriba.length - 2], arriba[arriba.length - 1], q) <= 0) arriba.pop();
    arriba.push(q);
  });
  return abajo.slice(0, -1).concat(arriba.slice(0, -1));
}

/** Elipse de un disco de radio r con su eje (normal) en 3D. */
function _fDisco(c, centro, eje, r) {
  var p = _fProy(c, centro);
  var n = _fUnidad(eje);
  var nx = _fPunto(n, c.r);
  var ny = -_fPunto(n, c.u);
  var m = Math.sqrt(nx * nx + ny * ny);
  var menor = Math.max(0.12, Math.abs(_fPunto(n, c.v)));
  var giro = m > 1e-3 ? Math.atan2(ny, nx) / FIG_RAD + 90 : 0;
  return { cx: p.x, cy: p.y, rx: r, ry: m > 1e-3 ? r * menor : r, giro: giro, z: p.z };
}

/** Las formas del material de un instante (barras, discos, mancuernas, bancos, poleas…). */
function _fProps(c, props) {
  var items = [];
  (props || []).forEach(function (pr, i) {
    var fondo = pr.capa === "fondo" || pr.tipo === "caja" || pr.tipo === "poste";
    var it = { id: "p" + i, prof: 0, formas: [], fondo: fondo && pr.capa !== "medio", prop: true };
    if (pr.tipo === "barra" || pr.tipo === "cable" || pr.tipo === "poste") {
      var s = _fSegmento(c, pr.a, pr.b, pr.ancho || (pr.tipo === "cable" ? 1.1 : pr.tipo === "poste" ? 4 : 3));
      it.prof = s.prof + (pr.sesgo || 0);
      it.formas.push({ t: "l", x1: s.pa.x, y1: s.pa.y, x2: s.pb.x, y2: s.pb.y, w: s.ancho,
        c: pr.clase || (pr.tipo === "cable" ? "anim__cable" : pr.tipo === "poste" ? "anim__mueble-l" : "anim__metal") });
    } else if (pr.tipo === "disco") {
      var e = _fDisco(c, pr.c, pr.eje || [0, 0, 1], pr.r || 15);
      it.prof = e.z;
      // El disco deja ver el cuerpo detrás (2026-10-25): borde, aro y eje firmes, el plato traslúcido.
      it.formas.push({ t: "e", cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, g: e.giro, c: "anim__disco" });
      it.formas.push({ t: "e", cx: e.cx, cy: e.cy, rx: e.rx * 0.62, ry: e.ry * 0.62, g: e.giro, c: "anim__disco-aro" });
      it.formas.push({ t: "e", cx: e.cx, cy: e.cy, rx: e.rx * 0.2, ry: e.ry * 0.2, g: e.giro, c: "anim__disco-eje" });
    } else if (pr.tipo === "mancuerna") {
      var eje = _fUnidad(pr.eje || [0, 0, 1]);
      var medio = (pr.largo || 11) / 2;
      var a = _fMezcla([pr.c, 1], [eje, -medio]);
      var b = _fMezcla([pr.c, 1], [eje, medio]);
      var asa = _fSegmento(c, a, b, 2.6);
      var ea = _fDisco(c, a, eje, pr.r || 5);
      var eb = _fDisco(c, b, eje, pr.r || 5);
      it.prof = asa.prof + 0.4;
      it.formas.push({ t: "l", x1: asa.pa.x, y1: asa.pa.y, x2: asa.pb.x, y2: asa.pb.y, w: 2.6, c: "anim__metal" });
      [ea, eb].forEach(function (d) { it.formas.push({ t: "e", cx: d.cx, cy: d.cy, rx: d.rx, ry: Math.max(d.ry, 1.6), g: d.giro, c: "anim__pesa" }); });
    } else if (pr.tipo === "caja") {
      var t = pr.t || [10, 2, 10];
      var M = _fMarco({ pitch: pr.pitch || 0, roll: pr.roll || 0, yaw: pr.yaw || 0 });
      var esquinas = [];
      [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sy) { [-1, 1].forEach(function (sz) {
        esquinas.push(_fProy(c, _fMezcla([pr.c, 1], [M.X, sx * t[0]], [M.Y, sy * t[1]], [M.Z, sz * t[2]])));
      }); }); });
      var casco = _fCasco(esquinas);
      it.prof = _fProy(c, pr.c).z;
      it.formas.push({ t: "p", puntos: casco, c: pr.clase || "anim__mueble" });
    } else if (pr.tipo === "polea") {
      var q = _fProy(c, pr.c);
      it.prof = q.z;
      it.formas.push({ t: "c", cx: q.x, cy: q.y, r: pr.r || 3.5, c: "anim__polea" });
    }
    items.push(it);
  });
  return items;
}

/** Postura de un ejercicio en un instante s (0 salida … 1 final). lado: "D" o "I" en los alternos. */
function _fPostura(spec, s, lado) {
  return spec.pose(Math.max(0, Math.min(1, s)), _fAyuda(), lado || "D");
}

var _fAyudaUnica = null;

/** Lo que reciben las posturas: medidas, vectores y marcos (sin depender del orden de carga). */
function _fAyuda() {
  if (_fAyudaUnica) return _fAyudaUnica;
  _fAyudaUnica = {
    FIG: FIG, suma: _fSuma, resta: _fResta, escala: _fEscala, mezcla: _fMezcla, unidad: _fUnidad,
    rotar: _fRotar, marco: _fMarco, marcoTronco: _fMarcoTronco, dir: _fDir, ik: _fIk, cruz: _fCruz,
    largo: _fLargo, punto: _fPunto,
    lerp: function (a, b, t) { return a + (b - a) * t; },
    suave: function (x) { return x * x * (3 - 2 * x); },
    /** Punto pegado al tronco: adelante, arriba (desde la pelvis) y a la derecha. */
    enTronco: function (pelvis, giro, tronco, adelante, arriba, derecha) {
      var T = _fMarcoTronco(_fMarco(giro), tronco);
      return _fMezcla([pelvis, 1], [T.X, adelante || 0], [T.Y, arriba || 0], [T.Z, derecha || 0]);
    },
    /** El hombro del lado pedido (1 derecha, -1 izquierda) para esa pelvis, giro y tronco. */
    hombro: function (pelvis, giro, tronco, lado) {
      var T = _fMarcoTronco(_fMarco(giro), tronco);
      return _fMezcla([pelvis, 1], [T.Y, FIG.hombroAlto], [T.Z, FIG.hombroAncho * lado]);
    },
    cadera: function (pelvis, giro, lado) {
      var B = _fMarco(giro);
      return _fMezcla([pelvis, 1], [B.Z, FIG.cadera * lado]);
    },
    B: function (giro) { return _fMarco(giro); },
    T: function (giro, tronco) { return _fMarcoTronco(_fMarco(giro), tronco); },
    /** Dónde queda el agarre (mitad de la mano) de un brazo dado por ángulos {f, s, cf, cs}. */
    agarre: function (pelvis, giro, tronco, lado, b) {
      var T = _fMarcoTronco(_fMarco(giro), tronco);
      var signo = lado === "I" ? -1 : 1;
      var hombro = _fMezcla([pelvis, 1], [T.Y, FIG.hombroAlto], [T.Z, FIG.hombroAncho * signo]);
      var d1 = _fDir(T, b.f, b.s, signo);
      var d2 = _fDir(T, b.cf !== undefined ? b.cf : b.f, b.cs !== undefined ? b.cs : b.s, signo);
      return _fMezcla([hombro, 1], [d1, FIG.brazo], [d2, FIG.ante + FIG.mano / 2]);
    },
    /** Dirección del antebrazo de ese brazo (para orientar mancuernas). */
    dirAnte: function (giro, tronco, lado, b) {
      var T = _fMarcoTronco(_fMarco(giro), tronco);
      return _fDir(T, b.cf !== undefined ? b.cf : b.f, b.cs !== undefined ? b.cs : b.s, lado === "I" ? -1 : 1);
    }
  };
  return _fAyudaUnica;
}

/**
 * Los elementos de la figura de una postura, ya proyectados y con su
 * profundidad: segmentos con su línea de separación, tronco, cabeza y las
 * rayas de los músculos.
 */
function _fFigura(c, j, musculos, conMusculos, conCara) {
  var items = [];
  var zonas = [];
  if (conMusculos && musculos) {
    (musculos.p || []).forEach(function (z) { (FIG_ZONAS[z] || []).forEach(function (d) { zonas.push([d, true]); }); });
    (musculos.s || []).forEach(function (z) { (FIG_ZONAS[z] || []).forEach(function (d) { zonas.push([d, false]); }); });
  }
  function rayas(nombre, a, b, ancho, delante, fuera) {
    var r = [];
    zonas.forEach(function (z) {
      if (z[0][0] !== nombre) return;
      var m = _fMusculo(c, a, b, ancho, delante, fuera, z[0][1], z[0][2], z[0][3], z[1]);
      if (m) r.push(m);
    });
    return r;
  }
  function seg(id, a, b, ancho, nombre, lado, sesgo) {
    var s = _fSegmento(c, a, b, ancho);
    var delante = j._delante[nombre + lado];
    items.push({
      id: id, prof: s.prof + (sesgo || 0),
      formas: [{ t: "seg", x1: s.pa.x, y1: s.pa.y, x2: s.pb.x, y2: s.pb.y, w: ancho }],
      musculos: rayas(nombre, a, b, ancho, delante, j._fuera[lado])
    });
  }
  ["D", "I"].forEach(function (L) {
    seg("muslo" + L, j["cadera" + L], j["rodilla" + L], FIG_ANCHO.muslo, "muslo", L);
    seg("pierna" + L, j["rodilla" + L], j["tobillo" + L], FIG_ANCHO.pierna, "pierna", L);
    seg("pie" + L, j["talon" + L], j["punta" + L], FIG_ANCHO.pie, "pie", L);
    seg("brazo" + L, j["hombro" + L], j["codo" + L], FIG_ANCHO.brazo, "brazo", L, 0.3);
    seg("ante" + L, j["codo" + L], j["muneca" + L], FIG_ANCHO.ante, "ante", L, 0.35);
    seg("mano" + L, j["muneca" + L], j["mano" + L], FIG_ANCHO.mano, "mano", L, 0.4);
  });
  // Tronco: un polígono de caderas a hombros, con borde redondo y grueso.
  var esquinas = [j.caderaI, j.caderaD, j.hombroD, j.hombroI].map(function (p) { return _fProy(c, p); });
  var pp = _fProy(c, j.pelvis);
  var pc = _fProy(c, j.cuello);
  var tronco = {
    id: "tronco", prof: (pp.z + pc.z) / 2,
    formas: [{ t: "tronco", puntos: _fCasco(esquinas), w: FIG_ANCHO.tronco }],
    musculos: rayas("tronco", j.pelvis, j.cuello, FIG_ANCHO.tronco + 4, j._delante.tronco, j._fuera.tronco)
  };
  items.push(tronco);
  var cuello = _fSegmento(c, j.cuello, j.cuelloTope, FIG_ANCHO.cuello);
  items.push({
    id: "cuello", prof: cuello.prof + 0.2,
    formas: [{ t: "seg", x1: cuello.pa.x, y1: cuello.pa.y, x2: cuello.pb.x, y2: cuello.pb.y, w: FIG_ANCHO.cuello }],
    musculos: rayas("cuello", j.cuello, j.cuelloTope, FIG_ANCHO.cuello, j._delante.tronco, j._fuera.tronco)
  });
  var cab = _fProy(c, j.cabeza);
  var formasCabeza = [{ t: "cab", cx: cab.x, cy: cab.y, r: FIG.cab }];
  if (conCara && j._cara) formasCabeza = formasCabeza.concat(_fOjos(c, j));
  items.push({ id: "cabeza", prof: cab.z + 0.5, formas: formasCabeza, musculos: [] });
  return items;
}

/**
 * Los ojos (2026-10-25): dos puntos del color del fondo en la cara, solo los
 * que miran a la cámara. De perfil se ve uno; de frente, los dos.
 */
function _fOjos(c, j) {
  var ojos = [];
  [1, -1].forEach(function (lado) {
    var p = _fMezcla([j.cabeza, 1], [j._cara.X, FIG.cab * 0.62], [j._cara.Y, FIG.cab * 0.14], [j._cara.Z, FIG.cab * 0.36 * lado]);
    if (_fPunto(_fUnidad(_fResta(p, j.cabeza)), c.v) <= 0.05) return;
    var q = _fProy(c, p);
    ojos.push({ t: "ojo", cx: q.x, cy: q.y, r: FIG.cab * 0.17 });
  });
  return ojos;
}

/**
 * La sombra en el suelo (2026-10-25): una elipse bajo lo que ocupa el cuerpo
 * visto desde arriba. Asienta la figura; va detrás de todo, también del material.
 */
function _fSombra(c, j) {
  var x0 = Infinity;
  var x1 = -Infinity;
  Object.keys(j).forEach(function (n) {
    if (n.charAt(0) === "_" || !Array.isArray(j[n])) return;
    var q = _fProy(c, [j[n][0], 0, j[n][2]]);
    if (q.x < x0) x0 = q.x;
    if (q.x > x1) x1 = q.x;
  });
  var centro = _fProy(c, [j.pelvis[0], 0, j.pelvis[2]]);
  return {
    id: "sombra", prof: -1e6, fondo: true, prop: true,
    formas: [{ t: "e", cx: (x0 + x1) / 2, cy: centro.y, rx: (x1 - x0) / 2 + 5, ry: 2.6, g: 0, c: "anim__sombra" }]
  };
}

/** El lado que mira a la cámara en este instante ("D" o "I"). */
function _fLadoCercano(c, j) {
  return _fProy(c, j.hombroD).z + _fProy(c, j.caderaD).z >= _fProy(c, j.hombroI).z + _fProy(c, j.caderaI).z ? "D" : "I";
}

var _FIG_ANGULOS = {
  rodilla: ["rodilla", "cadera", "tobillo"],
  cadera: ["cadera", "hombro", "rodilla"],
  codo: ["codo", "hombro", "muneca"],
  hombro: ["hombro", "cadera", "codo"],
  tobillo: ["tobillo", "rodilla", "punta"]
};

/** El arco y los grados de la articulación principal, en el lado cercano. */
function _fAngulo(c, j, nombre, lado) {
  var trio = _FIG_ANGULOS[nombre];
  if (!trio) return null;
  var v = j[trio[0] + lado];
  var a = j[trio[1] + lado];
  var b = j[trio[2] + lado];
  var u1 = _fUnidad(_fResta(a, v));
  var u2 = _fUnidad(_fResta(b, v));
  var grados = Math.round(Math.acos(Math.max(-1, Math.min(1, _fPunto(u1, u2)))) / FIG_RAD);
  var pv = _fProy(c, v);
  var pa = _fProy(c, a);
  var pb = _fProy(c, b);
  var a1 = Math.atan2(pa.y - pv.y, pa.x - pv.x);
  var a2 = Math.atan2(pb.y - pv.y, pb.x - pv.x);
  var d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  var r = 12;
  var medio = a1 + d / 2;
  return {
    x1: pv.x + r * Math.cos(a1), y1: pv.y + r * Math.sin(a1),
    x2: pv.x + r * Math.cos(a1 + d), y2: pv.y + r * Math.sin(a1 + d),
    r: r, barrido: d > 0 ? 1 : 0, grande: 0,
    tx: pv.x - 23 * Math.cos(medio), ty: pv.y - 23 * Math.sin(medio) + 3.5,
    texto: grados + "°"
  };
}

/**
 * Un instante de un ejercicio como lista de formas, sin DOM.
 * @returns {{ items: Array, marcas: Array, angulo: (object|null), clave: (object|null), cercano: string }}
 */
function entrenoFiguraEscena(id, s, detalle, lado) {
  var spec = typeof EJERCICIO_POSES !== "undefined" ? EJERCICIO_POSES[id] : null;
  if (!spec) return null;
  var c = _fCamara(spec.camara && spec.camara.yaw, spec.camara && spec.camara.elev);
  var P = _fPostura(spec, s, lado);
  var j = _fEsqueleto(P);
  var completo = detalle !== "mini";
  var items = _fFigura(c, j, spec.musculos, true, completo).concat(_fProps(c, P.props));
  if (!spec.sinSuelo) items.push(_fSombra(c, j));
  var cercano = _fLadoCercano(c, j);
  var escena = { items: items, marcas: [], angulo: null, clave: null, cercano: cercano, camara: c };
  if (completo) {
    ["hombro", "codo", "muneca", "cadera", "rodilla", "tobillo"].forEach(function (n) {
      var p = _fProy(c, j[n + cercano]);
      escena.marcas.push({ x: p.x, y: p.y });
    });
    if (spec.angulo) escena.angulo = _fAngulo(c, j, spec.angulo, cercano);
  }
  if (P.clave) escena.clave = _fProy(c, P.clave);
  return escena;
}

// ── Encuadre, fantasma y camino: lo que no cambia en todo el gesto ──────

function _fMuestras(spec) {
  var lados = spec.ritmo === "alterno" ? ["D", "I"] : ["D"];
  var r = [];
  lados.forEach(function (lado) { for (var i = 0; i <= 12; i++) r.push([i / 12, lado]); });
  return r;
}

/**
 * El cuadro que abarca todo el gesto. En pequeño (soloCuerpo) se ajusta al
 * cuerpo y el material puede quedar cortado: así la figura llena la miniatura.
 */
function _fEncuadre(id, soloCuerpo) {
  var spec = EJERCICIO_POSES[id];
  var c = _fCamara(spec.camara && spec.camara.yaw, spec.camara && spec.camara.elev);
  var x0 = Infinity;
  var x1 = -Infinity;
  var y0 = Infinity;
  var y1 = -Infinity;
  function ver(p, m) {
    x0 = Math.min(x0, p.x - m); x1 = Math.max(x1, p.x + m);
    y0 = Math.min(y0, p.y - m); y1 = Math.max(y1, p.y + m);
  }
  _fMuestras(spec).forEach(function (m) {
    var P = _fPostura(spec, m[0], m[1]);
    var j = _fEsqueleto(P);
    Object.keys(j).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      ver(_fProy(c, j[k]), k === "cabeza" ? FIG.cab + 2 : 8);
    });
    _fProps(c, soloCuerpo ? [] : P.props).forEach(function (it) {
      it.formas.forEach(function (f) {
        if (f.t === "l") { ver({ x: f.x1, y: f.y1 }, 3); ver({ x: f.x2, y: f.y2 }, 3); }
        else if (f.t === "e") ver({ x: f.cx, y: f.cy }, Math.max(f.rx, f.ry));
        else if (f.t === "c") ver({ x: f.cx, y: f.cy }, f.r);
        else if (f.t === "p") f.puntos.forEach(function (q) { ver(q, 2); });
      });
    });
  });
  var suelo = _fProy(c, [0, 0, 0]).y;
  if (!spec.sinSuelo) y1 = Math.max(y1, suelo + 4);
  var pad = soloCuerpo ? 4 : 8;
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  var cx = (x0 + x1) / 2;
  var cy = (y0 + y1) / 2;
  // La grande de un gesto tumbado o a lo largo (plancha, flexiones, banco) va
  // más ancha que alta, hasta FIG_APAISADO (2026-10-25): en un cuadrado la
  // figura ocupaba el tercio de abajo. La pequeña y las de pie, cuadradas.
  var ancho = Math.max(x1 - x0, soloCuerpo ? 90 : 120);
  var alto = Math.max(y1 - y0, soloCuerpo ? 90 : 120);
  if (soloCuerpo || alto >= ancho) {
    ancho = alto = Math.max(ancho, alto);
  } else {
    alto = Math.max(y1 - y0, ancho / FIG_APAISADO, 72);
  }
  var vy = spec.sinSuelo ? cy - alto / 2 : Math.min(cy - alto / 2, y1 - alto);
  return { x: cx - ancho / 2, y: vy, w: ancho, h: alto, suelo: spec.sinSuelo ? null : suelo, camara: c };
}

var _fCajas = {};

/** El encuadre no cambia en todo el gesto: se calcula una vez por ejercicio (y tamaño). */
function _fEncuadreGuardado(id, mini) {
  var clave = id + (mini ? "|mini" : "");
  if (!_fCajas[clave]) _fCajas[clave] = _fEncuadre(id, !!mini);
  return _fCajas[clave];
}

// ── El ritmo: de la hora a la postura ───────────────────────────────────

function _fSuave(x) { return x * x * (3 - 2 * x); }

/** De u (0…1 del periodo) a {s, sentido, lado}. */
function _fRitmo(spec, u) {
  var ritmo = spec.ritmo || "rep";
  if (ritmo === "mantener") return { s: 0.5 - 0.5 * Math.cos(u * 2 * Math.PI), sentido: 0, lado: "D" };
  if (ritmo === "alterno") {
    var mitad = u < 0.5;
    var r = _fRitmo({ ritmo: "rep" }, mitad ? u * 2 : u * 2 - 1);
    r.lado = mitad ? "D" : "I";
    return r;
  }
  if (ritmo === "negativa") {
    if (u < 0.12) return { s: _fSuave(u / 0.12), sentido: 1, lado: "D" };
    if (u < 0.22) return { s: 1, sentido: 0, lado: "D" };
    if (u < 0.9) return { s: 1 - _fSuave((u - 0.22) / 0.68), sentido: -1, lado: "D" };
    return { s: 0, sentido: 0, lado: "D" };
  }
  if (u < 0.12) return { s: 0, sentido: 0, lado: "D" };
  if (u < 0.5) return { s: _fSuave((u - 0.12) / 0.38), sentido: 1, lado: "D" };
  if (u < 0.6) return { s: 1, sentido: 0, lado: "D" };
  if (u < 0.92) return { s: 1 - _fSuave((u - 0.6) / 0.32), sentido: -1, lado: "D" };
  return { s: 0, sentido: 0, lado: "D" };
}

function _fPeriodo(spec) {
  return spec.periodo || (spec.ritmo === "alterno" ? FIG_PERIODO_MS * 1.8 : spec.ritmo === "negativa" ? FIG_PERIODO_MS * 1.5 : FIG_PERIODO_MS);
}

// ── Pintar: el mismo dibujo como texto (tests) y en el DOM (pantalla) ───

function _fNum(n) { return Math.round(n * 100) / 100; }

function _fPuntosTexto(puntos) {
  return puntos.map(function (q) { return _fNum(q.x) + "," + _fNum(q.y); }).join(" ");
}

/** Las formas SVG de un item: [etiqueta, atributos]. */
function _fFormasSvg(it, conMusculos) {
  var r = [];
  it.formas.forEach(function (f) {
    if (f.t === "seg") {
      r.push(["line", { x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, "stroke-width": f.w + FIG_SEPARACION, "class": "anim__sep" }]);
      r.push(["line", { x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, "stroke-width": f.w, "class": "anim__cuerpo" }]);
    } else if (f.t === "tronco") {
      var pts = _fPuntosTexto(f.puntos);
      r.push(["polygon", { points: pts, "stroke-width": f.w + FIG_SEPARACION, "class": "anim__sep anim__sep-relleno" }]);
      r.push(["polygon", { points: pts, "stroke-width": f.w, "class": "anim__cuerpo anim__cuerpo-relleno" }]);
    } else if (f.t === "cab") {
      r.push(["circle", { cx: f.cx, cy: f.cy, r: f.r + FIG_SEPARACION / 2, "class": "anim__sep-relleno" }]);
      r.push(["circle", { cx: f.cx, cy: f.cy, r: f.r, "class": "anim__cuerpo-relleno" }]);
    } else if (f.t === "ojo") {
      if (conMusculos) r.push(["circle", { cx: f.cx, cy: f.cy, r: f.r, "class": "anim__ojo" }]);
    } else if (f.t === "l") {
      r.push(["line", { x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, "stroke-width": f.w, "class": f.c }]);
    } else if (f.t === "e") {
      r.push(["ellipse", { cx: f.cx, cy: f.cy, rx: Math.max(0.1, f.rx), ry: Math.max(0.1, f.ry),
        transform: "rotate(" + _fNum(f.g) + " " + _fNum(f.cx) + " " + _fNum(f.cy) + ")", "class": f.c }]);
    } else if (f.t === "c") {
      r.push(["circle", { cx: f.cx, cy: f.cy, r: f.r, "class": f.c }]);
    } else if (f.t === "p") {
      r.push(["polygon", { points: _fPuntosTexto(f.puntos), "class": f.c }]);
    }
  });
  if (conMusculos) {
    (it.musculos || []).forEach(function (m) {
      r.push(["line", { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2, "stroke-width": m.ancho,
        "class": m.fuerte ? "anim__musculo" : "anim__musculo anim__musculo--ayuda" }]);
    });
  }
  return r;
}

/** Items ordenados para pintar: primero el material de fondo, luego todo por profundidad. */
function _fOrden(items) {
  return items.slice().sort(function (a, b) {
    if (a.fondo !== b.fondo) return a.fondo ? -1 : 1;
    return a.prof - b.prof;
  });
}

function _fAtributos(attrs) {
  return Object.keys(attrs).map(function (k) {
    var v = attrs[k];
    return k + '="' + (typeof v === "number" ? _fNum(v) : String(v).replace(/"/g, "&quot;")) + '"';
  }).join(" ");
}

function _fRejilla(caja) {
  var lineas = [];
  var paso = 10;
  for (var x = Math.ceil(caja.x / paso) * paso; x < caja.x + caja.w; x += paso) lineas.push({ x1: x, y1: caja.y, x2: x, y2: caja.y + caja.h });
  for (var y = Math.ceil(caja.y / paso) * paso; y < caja.y + caja.h; y += paso) lineas.push({ x1: caja.x, y1: y, x2: caja.x + caja.w, y2: y });
  return lineas;
}

var _fCaminos = {};

/** El camino del punto que manda (barra, manos…) en todo el gesto. Se calcula una vez por ejercicio. */
function _fCamino(id) {
  if (!_fCaminos[id]) _fCaminos[id] = _fCaminoNuevo(id);
  return _fCaminos[id];
}

function _fCaminoNuevo(id) {
  var spec = EJERCICIO_POSES[id];
  if (spec.camino === false) return [];
  var c = _fCamara(spec.camara && spec.camara.yaw, spec.camara && spec.camara.elev);
  var puntos = [];
  for (var i = 0; i <= 24; i++) {
    var P = _fPostura(spec, i / 24, "D");
    if (P.clave) puntos.push(_fProy(c, P.clave));
  }
  return puntos;
}

function _fFlecha(p, q, sentido) {
  if (!p || !q) return null;
  var dx = (q.x - p.x) * (sentido || 1);
  var dy = (q.y - p.y) * (sentido || 1);
  var l = Math.sqrt(dx * dx + dy * dy);
  if (l < 0.05) return null;
  dx /= l; dy /= l;
  var px = -dy;
  var py = dx;
  var x = p.x + dx * 9 + px * 9;
  var y = p.y + dy * 9 + py * 9;
  return "M" + _fNum(x + dx * 5) + " " + _fNum(y + dy * 5) +
    " L" + _fNum(x - dx * 3 + px * 4) + " " + _fNum(y - dy * 3 + py * 4) +
    " L" + _fNum(x - dx * 3 - px * 4) + " " + _fNum(y - dy * 3 - py * 4) + " Z";
}

/** El SVG de un instante, como texto. Sirve a los tests y a quien no tiene DOM. */
function entrenoFiguraSvg(id, s, detalle, lado) {
  var escena = entrenoFiguraEscena(id, s, detalle, lado);
  if (!escena) return "";
  var completo = detalle !== "mini";
  var caja = _fEncuadreGuardado(id, !completo);
  var h = ['<svg xmlns="http://www.w3.org/2000/svg" class="anim anim--' + (completo ? "completo" : "mini") + '" viewBox="' +
    [caja.x, caja.y, caja.w, caja.h].map(_fNum).join(" ") + '" style="aspect-ratio: ' + _fNum(caja.w) + " / " + _fNum(caja.h) + '">'];
  if (completo) _fRejilla(caja).forEach(function (l) { h.push("<line " + _fAtributos({ x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, "class": "anim__rejilla" }) + "/>"); });
  if (caja.suelo !== null) h.push("<line " + _fAtributos({ x1: caja.x, y1: caja.suelo, x2: caja.x + caja.w, y2: caja.suelo, "class": "anim__suelo" }) + "/>");
  _fOrden(escena.items).forEach(function (it) {
    _fFormasSvg(it, true).forEach(function (f) { h.push("<" + f[0] + " " + _fAtributos(f[1]) + "/>"); });
  });
  if (completo) {
    escena.marcas.forEach(function (m) { h.push("<circle " + _fAtributos({ cx: m.x, cy: m.y, r: 2.6, "class": "anim__marca" }) + "/>"); });
    if (escena.angulo) {
      var a = escena.angulo;
      h.push('<path class="anim__arco" d="M' + _fNum(a.x1) + " " + _fNum(a.y1) + " A" + a.r + " " + a.r + " 0 0 " + a.barrido + " " + _fNum(a.x2) + " " + _fNum(a.y2) + '"/>');
      h.push('<text class="anim__grados" x="' + _fNum(a.tx) + '" y="' + _fNum(a.ty) + '" font-size="9.5" text-anchor="middle">' + a.texto + "</text>");
    }
  }
  h.push("</svg>");
  return h.join("");
}

// ── En la pantalla: elementos que se crean una vez y luego se mueven ────

var FIG_NS = "http://www.w3.org/2000/svg";
var _figInstancias = [];
var _figObservador = null;
var _figBucle = null;
var _figUltimo = 0;
var _figReducir = false;

function entrenoAnimacionTiene(id) {
  return typeof EJERCICIO_POSES !== "undefined" && Object.prototype.hasOwnProperty.call(EJERCICIO_POSES, id);
}

/**
 * Un <svg> vacío con lo que necesita para animarse luego (entrenoAnimacionesActivar).
 * Sin etiqueta queda oculto al lector de pantalla (va dentro de un botón que ya la tiene).
 * "" si el ejercicio no tiene animación.
 */
function entrenoAnimacionHtml(id, detalle, etiqueta) {
  if (!entrenoAnimacionTiene(id)) return "";
  var esc = typeof escapeHtml === "function" ? escapeHtml : function (x) { return String(x); };
  var d = detalle === "mini" ? "mini" : "completo";
  var nombre = etiqueta ? ' role="img" aria-label="' + esc(etiqueta) + '"' : ' aria-hidden="true"';
  return '<svg class="anim anim--' + d + '" data-anim="' + esc(id) + '" data-detalle="' + d + '"' +
    ' viewBox="0 0 100 100" focusable="false"' + nombre + '></svg>';
}

function _figElem(padre, tag, clase) {
  var e = document.createElementNS(FIG_NS, tag);
  if (clase) e.setAttribute("class", clase);
  padre.appendChild(e);
  return e;
}

function _figPoner(e, attrs) {
  Object.keys(attrs).forEach(function (k) {
    var v = attrs[k];
    var texto = typeof v === "number" ? String(_fNum(v)) : String(v);
    if (e.getAttribute(k) !== texto) e.setAttribute(k, texto);
  });
}

/** Prepara un <svg data-anim>: encuadre, cuadrícula, fantasma y camino (lo fijo), y capas para lo que se mueve. */
function _figPreparar(svg) {
  var id = svg.getAttribute("data-anim");
  if (!entrenoAnimacionTiene(id)) return null;
  var spec = EJERCICIO_POSES[id];
  var completo = svg.getAttribute("data-detalle") !== "mini";
  var caja = _fEncuadreGuardado(id, !completo);
  var inst0 = { camino: [] };
  svg.setAttribute("viewBox", [caja.x, caja.y, caja.w, caja.h].map(_fNum).join(" "));
  // El alto sale del encuadre: las tumbadas van apaisadas (la hoja de estilos pone 1 / 1).
  svg.style.aspectRatio = _fNum(caja.w) + " / " + _fNum(caja.h);
  svg.textContent = "";
  var fondo = _figElem(svg, "g", "anim__fondo");
  if (completo) {
    _fRejilla(caja).forEach(function (l) { _figPoner(_figElem(fondo, "line", "anim__rejilla"), l); });
  }
  if (caja.suelo !== null) _figPoner(_figElem(fondo, "line", "anim__suelo"), { x1: caja.x, y1: caja.suelo, x2: caja.x + caja.w, y2: caja.suelo });
  if (completo) {
    var fantasma = _figElem(fondo, "g", "anim__fantasma");
    var inicio = entrenoFiguraEscena(id, 0, "mini", "D");
    _fOrden(inicio.items.filter(function (it) { return !it.prop; })).forEach(function (it) {
      _fFormasSvg(it, false).forEach(function (f) { _figPoner(_figElem(fantasma, f[0], f[1]["class"]), f[1]); });
    });
    var camino = _fCamino(id);
    inst0.camino = camino;
    if (camino.length > 1) {
      var d = camino.map(function (p, i) { return (i ? "L" : "M") + _fNum(p.x) + " " + _fNum(p.y); }).join(" ");
      _figPoner(_figElem(fondo, "path", "anim__camino"), { d: d });
    }
  }
  var figura = _figElem(svg, "g", "anim__figura");
  var encima = _figElem(svg, "g", "anim__encima");
  var inst = {
    svg: svg, id: id, spec: spec, completo: completo, caja: caja, figura: figura, encima: encima,
    grupos: {}, orden: "", visible: false, desfase: (_figInstancias.length * 370) % 1000, camino: inst0.camino
  };
  if (completo) {
    inst.flecha = _figElem(encima, "path", "anim__flecha");
    inst.marcas = [0, 1, 2, 3, 4, 5].map(function () { return _figElem(encima, "circle", "anim__marca"); });
    inst.arco = _figElem(encima, "path", "anim__arco");
    inst.grados = _figElem(encima, "text", "anim__grados");
    inst.grados.setAttribute("text-anchor", "middle");
    inst.grados.setAttribute("font-size", "9.5");
  }
  svg.setAttribute("data-anim-listo", "1");
  return inst;
}

/** Pinta un instante en un <svg> ya preparado: crea lo que falte, mueve lo que hay y reordena por profundidad. */
function _figPintar(inst, s, sentido, lado) {
  var escena = entrenoFiguraEscena(inst.id, s, inst.completo ? "completo" : "mini", lado);
  if (!escena) return;
  var ordenados = _fOrden(escena.items);
  var claveOrden = ordenados.map(function (it) { return it.id; }).join(",");
  var vistos = {};
  ordenados.forEach(function (it) {
    vistos[it.id] = true;
    var g = inst.grupos[it.id];
    if (!g) {
      g = { el: document.createElementNS(FIG_NS, "g"), hijos: [] };
      inst.figura.appendChild(g.el);
      inst.grupos[it.id] = g;
    }
    var formas = _fFormasSvg(it, true);
    formas.forEach(function (f, k) {
      var hijo = g.hijos[k];
      if (!hijo || hijo.tagName !== f[0]) {
        var nuevo = document.createElementNS(FIG_NS, f[0]);
        if (hijo) g.el.replaceChild(nuevo, hijo); else g.el.appendChild(nuevo);
        g.hijos[k] = nuevo;
        hijo = nuevo;
      }
      _figPoner(hijo, f[1]);
    });
    while (g.hijos.length > formas.length) g.el.removeChild(g.hijos.pop());
  });
  Object.keys(inst.grupos).forEach(function (k) {
    if (!vistos[k]) { inst.figura.removeChild(inst.grupos[k].el); delete inst.grupos[k]; }
  });
  if (claveOrden !== inst.orden) {
    ordenados.forEach(function (it) { inst.figura.appendChild(inst.grupos[it.id].el); });
    inst.orden = claveOrden;
  }
  if (inst.completo) {
    escena.marcas.forEach(function (m, k) { _figPoner(inst.marcas[k], { cx: m.x, cy: m.y, r: 2.6 }); });
    var a = escena.angulo;
    if (a) {
      _figPoner(inst.arco, { d: "M" + _fNum(a.x1) + " " + _fNum(a.y1) + " A" + a.r + " " + a.r + " 0 0 " + a.barrido + " " + _fNum(a.x2) + " " + _fNum(a.y2) });
      _figPoner(inst.grados, { x: a.tx, y: a.ty });
      if (inst.grados.textContent !== a.texto) inst.grados.textContent = a.texto;
    }
    var flecha = null;
    var cam = inst.camino;
    if (escena.clave && sentido && cam.length > 2) {
      // El sentido sale del camino ya calculado: el tramo en el que va ahora.
      var k = Math.min(cam.length - 2, Math.floor(s * (cam.length - 1)));
      flecha = _fFlecha(escena.clave, { x: escena.clave.x + cam[k + 1].x - cam[k].x, y: escena.clave.y + cam[k + 1].y - cam[k].y }, sentido);
    }
    _figPoner(inst.flecha, { d: flecha || "M0 0", opacity: flecha ? 1 : 0 });
  }
}

function _figTic(ahora) {
  _figBucle = null;
  if (ahora - _figUltimo < 30) { _figPedir(); return; }   // unos 30 cuadros por segundo
  _figUltimo = ahora;
  var vivos = [];
  _figInstancias.forEach(function (inst) {
    if (!inst.svg.isConnected) {
      if (_figObservador) _figObservador.unobserve(inst.svg);
      return;
    }
    vivos.push(inst);
    if (!inst.visible || inst.roto) return;
    var periodo = _fPeriodo(inst.spec);
    var u = ((ahora + inst.desfase * periodo / 1000) % periodo) / periodo;
    var r = _fRitmo(inst.spec, u);
    try {
      _figPintar(inst, r.s, r.sentido, r.lado);
    } catch (e) {
      // Una postura rota no para las demás: esa se queda quieta.
      inst.roto = true;
      if (typeof console !== "undefined") console.error("animación " + inst.id, e);
    }
  });
  _figInstancias = vivos;
  if (vivos.some(function (i) { return i.visible; })) _figPedir();
}

function _figPedir() {
  if (_figBucle === null && !_figReducir && typeof requestAnimationFrame === "function") _figBucle = requestAnimationFrame(_figTic);
}

/** Prepara y pone en marcha las animaciones de raiz (lo que acaba de pintarse con innerHTML). */
function entrenoAnimacionesActivar(raiz) {
  if (!raiz || typeof document === "undefined" || typeof EJERCICIO_POSES === "undefined") return;
  try {
    _figReducir = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { _figReducir = false; }
  if (!_figObservador && typeof IntersectionObserver === "function") {
    _figObservador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        var inst = _figInstancias.filter(function (i) { return i.svg === en.target; })[0];
        if (inst) inst.visible = en.isIntersecting;
      });
      _figPedir();
    }, { rootMargin: "80px" });
  }
  Array.prototype.forEach.call(raiz.querySelectorAll("svg[data-anim]:not([data-anim-listo])"), function (svg) {
    var inst;
    try {
      inst = _figPreparar(svg);
      // Quieta: cerca del final, con el fantasma y el camino (con «reducir movimiento», se queda así).
      if (inst) _figPintar(inst, 0.85, 0, "D");
    } catch (e) {
      inst = null;
      if (typeof console !== "undefined") console.error("animación " + svg.getAttribute("data-anim"), e);
    }
    if (!inst) return;
    _figInstancias.push(inst);
    if (_figReducir) return;
    if (_figObservador) _figObservador.observe(svg);
    else inst.visible = true;
  });
  _figPedir();
}

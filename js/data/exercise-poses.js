/**
 * js/data/exercise-poses.js
 * ─────────────────────────────────────────────────────────────────────────
 * CÓMO SE MUEVE CADA EJERCICIO en su animación (2026-10-18). Lo pinta
 * js/ui/entreno-figura.js; aquí solo están las posturas. Una entrada por
 * cada ejercicio de js/data/exercises.js (tests/entreno-figura.test.js
 * comprueba que no falte ninguno).
 *
 * Coordenadas: x hacia delante de la persona, y hacia arriba (suelo = 0),
 * z hacia su derecha. De pie, la pelvis queda a 80 y la cabeza llega a 150.
 *
 * Cada ejercicio:
 *   camara    { yaw, elev }: 0 = de perfil desde su derecha, 90 = de frente
 *   musculos  { p: [los que trabajan], s: [los que ayudan] } (zonas de FIG_ZONAS)
 *   angulo    articulación que se mide: rodilla, cadera, codo, hombro, tobillo
 *   ritmo     "rep" (baja y sube), "mantener", "alterno" (un lado y otro), "negativa"
 *   camino    false si no hay un punto que siga una trayectoria
 *   sinSuelo  true si el suelo queda lejos (dominadas)
 *   pose(s, h, lado)  la postura en el instante s (0 = salida, 1 = final);
 *             h trae medidas, vectores y marcos (ver _fAyuda en entreno-figura.js)
 *
 * La postura: { pelvis, giro {pitch, roll, yaw} o marco {X, Y, Z}, tronco
 * {flex, lat, giro}, cabeza {flex}, brazoD/brazoI, piernaD/piernaI, props,
 * clave }. Un brazo va por ángulos {f, s, cf, cs} o por objetivo {mano, polo};
 * una pierna, {f, s, rf, rs, pie} o {tobillo, polo, pieDir, pieArriba}.
 * ─────────────────────────────────────────────────────────────────────────
 */

var EJERCICIO_POSES = {};

var _P_CAMARA = { yaw: 30, elev: 8 };

function _pLerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function _pMedio(a, b) { return _pLerp3(a, b, 0.5); }

function _pCon(base, extra) {
  Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
  return base;
}

/** Las dos piernas pisando el suelo: tobillos en x, separados ±z, puntas abiertas «abre» grados. */
function _pPiernas(x, z, abre, polo) {
  var a = (abre === undefined ? 10 : abre) * Math.PI / 180;
  return {
    piernaD: { tobillo: [x, 6, z], pieDir: [Math.cos(a), 0, Math.sin(a)], polo: polo },
    piernaI: { tobillo: [x, 6, -z], pieDir: [Math.cos(a), 0, -Math.sin(a)], polo: polo ? [polo[0], polo[1], -polo[2]] : undefined }
  };
}

/** Un objetivo de mano para la derecha y el mismo, reflejado en z, para la izquierda. */
function _pSimetrico(objetivo, extra) {
  var d = _pCon({ mano: objetivo }, extra || {});
  var i = _pCon({ mano: [objetivo[0], objetivo[1], -objetivo[2]] }, {});
  if (d.polo) i.polo = [d.polo[0], d.polo[1], -d.polo[2]];
  return { D: d, I: i };
}

/** Las dos manos a un objetivo simétrico en z, con codos hacia «polo» (z hacia fuera del lado derecho). */
function _pManos(P, objetivo, polo) {
  var m = _pSimetrico(objetivo, { polo: polo });
  P.brazoD = m.D;
  P.brazoI = m.I;
  return P;
}

/** Barra con discos: centro c, media longitud, radio de los discos (sin discos si r es 0). */
function _pBarra(c, mitad, r) {
  var m = mitad || 32;
  var props = [{ tipo: "barra", a: [c[0], c[1], c[2] - m], b: [c[0], c[1], c[2] + m], ancho: 2.4 }];
  if (r) {
    [-1, 1].forEach(function (lado) {
      props.push({ tipo: "disco", c: [c[0], c[1], c[2] + lado * (m - 7)], eje: [0, 0, 1], r: r });
    });
  }
  return props;
}

function _pMancuerna(c, eje, r) {
  return { tipo: "mancuerna", c: c, eje: eje || [0, 0, 1], largo: 11, r: r || 5 };
}

/** Banco plano: de x0 a x1, con la cara de arriba a «alto». */
function _pBanco(x0, x1, alto, ancho) {
  var w = ancho || 9;
  return [
    { tipo: "caja", c: [(x0 + x1) / 2, alto - 3, 0], t: [(x1 - x0) / 2, 3, w] },
    { tipo: "poste", a: [x0 + 8, 0, 0], b: [x0 + 8, alto - 5, 0] },
    { tipo: "poste", a: [x1 - 8, 0, 0], b: [x1 - 8, alto - 5, 0] }
  ];
}

/** Columna de polea con su rueda en c. */
function _pPolea(c, alto) {
  return [
    { tipo: "poste", a: [c[0] + 4, 0, c[2]], b: [c[0] + 4, alto || 190, c[2]], ancho: 6 },
    { tipo: "polea", c: c, r: 3.5, capa: "fondo" }
  ];
}

function _pCable(a, b) { return { tipo: "cable", a: a, b: b }; }

/** Una tirada larga de material: concatena listas de props. */
function _pProps() {
  var r = [];
  for (var i = 0; i < arguments.length; i++) r = r.concat(arguments[i]);
  return r;
}

/** De pie, sin nada en las manos: la base de muchas posturas. */
function _pDePie(pelvis, flex, extra) {
  return _pCon(_pCon({ pelvis: pelvis, giro: {}, tronco: { flex: flex || 0 }, cabeza: { flex: 0 } }, _pPiernas(1, 11, 12)), extra || {});
}

/** Sentado en un banco o asiento: muslos al frente y pies en el suelo. */
function _pSentado(pelvis, flex, abre) {
  var x = pelvis[0] + 34;
  return _pCon({ pelvis: pelvis, giro: {}, tronco: { flex: flex || 0 }, cabeza: { flex: 0 } },
    _pPiernas(x, 13 + (abre || 0), 8, [0.3, 1, 0.25]));
}

/** Tumbado boca arriba en un banco plano: la espalda a la altura «alto». */
function _pTumbado(alto) {
  return {
    pelvis: [0, alto, 0], giro: { pitch: -90 }, tronco: {}, cabeza: { flex: 0 },
    piernaD: { tobillo: [40, 6, 17], pieDir: [0.98, 0, 0.2], polo: [0.3, 1, 0.3] },
    piernaI: { tobillo: [40, 6, -17], pieDir: [0.98, 0, -0.2], polo: [0.3, 1, -0.3] }
  };
}

// ── Pierna: sentadillas ──────────────────────────────────────────────────

function _pSentadilla(s, h, o) {
  var pelvis = [-(o.atras || 15) * s, 80 - (o.prof || 36) * s, 0];
  var tronco = { flex: (o.flex0 || 6) + (o.flex || 34) * s };
  var P = _pCon({ pelvis: pelvis, giro: {}, tronco: tronco, cabeza: { flex: -10 * s } },
    _pPiernas(1, o.ancho || 12, o.abre || 14, [1, 0, 0.35]));
  return P;
}

EJERCICIO_POSES.sentadilla_barra = {
  camara: { yaw: 42, elev: 8 }, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios", "lumbar", "abdomen"] },
  pose: function (s, h) {
    var P = _pSentadilla(s, h, {});
    var barra = h.enTronco(P.pelvis, P.giro, P.tronco, -6.5, 43.5, 0);
    _pManos(P, [barra[0], barra[1], 22], [-0.6, -1, 0.5]);
    P.props = _pBarra(barra, 38, 13);
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.sentadilla_goblet = {
  camara: { yaw: 38, elev: 8 }, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["abdomen", "isquios"] },
  pose: function (s, h) {
    var P = _pSentadilla(s, h, { atras: 12, prof: 38, flex: 24, ancho: 15, abre: 22 });
    var T = h.T(P.giro, P.tronco);
    var pesa = h.enTronco(P.pelvis, P.giro, P.tronco, 15, 35, 0);
    var arriba = h.mezcla([pesa, 1], [T.Y, 5]);
    _pManos(P, [arriba[0], arriba[1], 4.5], [0.3, -1, 0.9]);
    P.props = [_pMancuerna(pesa, T.Y, 5.5)];
    P.clave = pesa;
    return P;
  }
};

EJERCICIO_POSES.sentadilla_libre = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios", "abdomen"] },
  pose: function (s, h) {
    var P = _pSentadilla(s, h, { flex: 30 });
    var f = 15 + 110 * s;
    P.brazoD = { f: f, s: 8 };
    P.brazoI = { f: f, s: 8 };
    P.clave = h.cadera(P.pelvis, P.giro, 1);
    return P;
  }
};

EJERCICIO_POSES.sentadilla_hack_maquina = {
  camara: { yaw: 26, elev: 8 }, angulo: "rodilla",
  musculos: { p: ["cuadriceps"], s: ["gluteos", "isquios"] },
  pose: function (s, h) {
    var pelvis = [-14 * s, 80 - 35 * s, 0];
    var giro = { pitch: -22 };
    var P = { pelvis: pelvis, giro: giro, tronco: {}, cabeza: { flex: 8 } };
    var a = 15 * Math.PI / 180;
    P.piernaD = { tobillo: [17, 14, 12], pieDir: [Math.cos(a), Math.sin(a), 0.15], polo: [1, 0.2, 0.3] };
    P.piernaI = { tobillo: [17, 14, -12], pieDir: [Math.cos(a), Math.sin(a), -0.15], polo: [1, 0.2, -0.3] };
    var asa = h.enTronco(pelvis, giro, {}, 7, 43, 0);
    _pManos(P, [asa[0], asa[1], 20], [0.2, -1, 0.6]);
    var respaldo = h.enTronco(pelvis, giro, {}, -13, 24, 0);
    var hombros = h.enTronco(pelvis, giro, {}, 0, 50, 0);
    P.props = [
      { tipo: "poste", a: [-30, 0, 0], b: [8, 92, 0], ancho: 5 },
      { tipo: "caja", c: [20, 9, 0], t: [16, 2.5, 22], pitch: -15 },
      { tipo: "caja", c: respaldo, t: [2.5, 30, 12], pitch: -22, capa: "fondo" },
      { tipo: "caja", c: [hombros[0], hombros[1], 15], t: [6, 3, 6], pitch: -22, capa: "medio" },
      { tipo: "caja", c: [hombros[0], hombros[1], -15], t: [6, 3, 6], pitch: -22 }
    ];
    P.clave = h.cadera(pelvis, giro, 1);
    return P;
  }
};

EJERCICIO_POSES.prensa_piernas = {
  camara: { yaw: 22, elev: 10 }, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var pelvis = [0, 42, 0];
    var giro = { pitch: -55 };
    var P = { pelvis: pelvis, giro: giro, tronco: {}, cabeza: { flex: 22 } };
    var dir = [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4), 0];
    var d = 70 - 32 * s;
    var tob = function (z) { return [pelvis[0] + dir[0] * d, pelvis[1] + dir[1] * d, z]; };
    var pie = [-dir[1], dir[0], 0];
    P.piernaD = { tobillo: tob(12), pieDir: pie, pieArriba: [-dir[0], -dir[1], 0], polo: [0, 1, 0.4] };
    P.piernaI = { tobillo: tob(-12), pieDir: pie, pieArriba: [-dir[0], -dir[1], 0], polo: [0, 1, -0.4] };
    _pManos(P, [6, 44, 24], [-0.5, 0.4, 1]);
    var plataforma = [pelvis[0] + dir[0] * (d + 8), pelvis[1] + dir[1] * (d + 8), 0];
    P.props = [
      { tipo: "poste", a: [10, 18, 0], b: [100, 108, 0], ancho: 5 },
      { tipo: "caja", c: [-4, 33, 0], t: [16, 3, 14] },
      { tipo: "caja", c: h.enTronco(pelvis, giro, {}, -13, 24, 0), t: [2.5, 30, 13], pitch: -55 },
      { tipo: "caja", c: plataforma, t: [2.5, 20, 22], pitch: 45, capa: "medio" }
    ];
    P.clave = [P.piernaD.tobillo[0], P.piernaD.tobillo[1], 0];
    return P;
  }
};

EJERCICIO_POSES.sentadilla_isometrica_pared = {
  camara: _P_CAMARA, angulo: "rodilla", ritmo: "mantener", camino: false,
  musculos: { p: ["cuadriceps"], s: ["gluteos"] },
  pose: function (s, h) {
    var pelvis = [-1, 44 + 1.2 * (s - 0.5), 0];
    var P = _pCon({ pelvis: pelvis, giro: {}, tronco: {}, cabeza: { flex: 0 } }, _pPiernas(35, 11, 6, [1, 0.3, 0.2]));
    P.brazoD = { f: 52, s: 10, cf: 78 };
    P.brazoI = { f: 52, s: 10, cf: 78 };
    P.props = [{ tipo: "caja", c: [-13, 85, 0], t: [1.5, 85, 40] }];
    return P;
  }
};

// ── Pierna: bisagra de cadera ────────────────────────────────────────────

function _pBisagra(s, o) {
  var pelvis = [-(o.atras || 22) * s, 80 - (o.baja || 9) * s, 0];
  return _pCon({ pelvis: pelvis, giro: {}, tronco: { flex: 4 + (o.flex || 70) * s }, cabeza: { flex: -14 * s } },
    _pPiernas(2, 11, 8, [1, 0, 0.12]));
}

function _pBrazoColgando(P, s) {
  return { f: P.tronco.flex + 10 - 26 * s, s: 3, cf: P.tronco.flex + 10 - 26 * s };
}

EJERCICIO_POSES.peso_muerto_barra = {
  camara: _P_CAMARA, angulo: "cadera",
  musculos: { p: ["isquios", "gluteos"], s: ["lumbar", "antebrazo"] },
  pose: function (s, h) {
    var P = _pBisagra(s, {});
    var b = _pBrazoColgando(P, s);
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var agarre = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var barra = [agarre[0], agarre[1], 0];
    P.props = _pBarra(barra, 36, 14);
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.peso_muerto_mancuernas = {
  camara: { yaw: 34, elev: 8 }, angulo: "cadera",
  musculos: { p: ["isquios", "gluteos"], s: ["lumbar", "antebrazo"] },
  pose: function (s, h) {
    var P = _pBisagra(s, { atras: 20 });
    var b = _pBrazoColgando(P, s);
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    P.props = [_pMancuerna(d, [0, 0, 1]), _pMancuerna(i, [0, 0, 1])];
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.buenos_dias_sin_material = {
  camara: _P_CAMARA, angulo: "cadera",
  musculos: { p: ["isquios", "lumbar"], s: ["gluteos"] },
  pose: function (s, h) {
    var P = _pBisagra(s, { atras: 17, baja: 6, flex: 64 });
    var nuca = h.enTronco(P.pelvis, P.giro, P.tronco, -7, 56, 0);
    _pManos(P, [nuca[0], nuca[1], 6], [0.25, 0.1, 1]);
    P.clave = h.hombro(P.pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

// ── Pierna: zancadas y búlgaras ──────────────────────────────────────────

function _pZancada(s, o) {
  var pelvis = [o.px || -1, (o.alto || 73) - (o.baja || 28) * s, 0];
  var P = { pelvis: pelvis, giro: {}, tronco: { flex: (o.flex0 || 4) + (o.flex || 0) * s }, cabeza: { flex: 0 } };
  P.piernaD = { tobillo: [o.delante || 28, 6, 9], pieDir: [1, 0, 0.08], polo: [1, 0, 0.1] };
  P.piernaI = o.atrasPie || { tobillo: [-30, 10, -9], pieDir: [0.8, -0.6, 0], pieArriba: [0.6, 0.8, 0], polo: [1, -0.6, 0] };
  return P;
}

function _pManosCadera(P, h) {
  var d = h.cadera(P.pelvis, P.giro, 1);
  var i = h.cadera(P.pelvis, P.giro, -1);
  P.brazoD = { mano: [d[0] - 1, d[1] + 9, d[2] + 6], polo: [-0.6, 0, 1] };
  P.brazoI = { mano: [i[0] - 1, i[1] + 9, i[2] - 6], polo: [-0.6, 0, -1] };
}

function _pMancuernasColgando(P, h, extraF) {
  var b = { f: (P.tronco.flex || 0) + (extraF || 0), s: 5, cf: (P.tronco.flex || 0) + (extraF || 0) };
  P.brazoD = _pCon({}, b);
  P.brazoI = _pCon({}, b);
  var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
  var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
  return [_pMancuerna(d, [1, 0, 0]), _pMancuerna(i, [1, 0, 0])];
}

EJERCICIO_POSES.zancadas = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var P = _pZancada(s, {});
    _pManosCadera(P, h);
    P.clave = P.pelvis;
    return P;
  }
};

EJERCICIO_POSES.zancada_mancuernas = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios", "antebrazo"] },
  pose: function (s, h) {
    var P = _pZancada(s, {});
    P.props = _pMancuernasColgando(P, h, 2);
    P.clave = P.pelvis;
    return P;
  }
};

var _P_PIE_BANCO = { tobillo: [-32, 51, -9], pieDir: [-0.94, -0.34, 0], pieArriba: [-0.34, 0.94, 0], polo: [0.3, -1, 0] };

EJERCICIO_POSES.sentadilla_bulgara = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var P = _pZancada(s, { px: -4, alto: 74, baja: 28, delante: 22, flex0: 8, flex: 10, atrasPie: _P_PIE_BANCO });
    P.props = _pProps(_pBanco(-62, -24, 44, 10), _pMancuernasColgando(P, h, 2));
    P.clave = P.pelvis;
    return P;
  }
};

EJERCICIO_POSES.sentadilla_bulgara_sin_material = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["cuadriceps", "gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var P = _pZancada(s, { px: -4, alto: 74, baja: 28, delante: 22, flex0: 8, flex: 10, atrasPie: _P_PIE_BANCO });
    _pManosCadera(P, h);
    P.props = [
      { tipo: "caja", c: [-42, 42, 0], t: [13, 2, 15] },
      { tipo: "caja", c: [-54, 66, 0], t: [2, 22, 15] },
      { tipo: "poste", a: [-31, 0, 0], b: [-31, 40, 0] },
      { tipo: "poste", a: [-53, 0, 0], b: [-53, 40, 0] }
    ];
    P.clave = P.pelvis;
    return P;
  }
};

// ── Pierna: gemelos ──────────────────────────────────────────────────────

/** Tobillo de un pie que se pone de puntillas con la punta fija en «punta». */
function _pTobilloPuntillas(punta, grados) {
  var a = grados * Math.PI / 180;
  var dir = [Math.cos(a), -Math.sin(a), 0];
  var arriba = [Math.sin(a), Math.cos(a), 0];
  return {
    tobillo: [punta[0] - 13 * dir[0] + 3 * arriba[0], punta[1] - 13 * dir[1] + 3 * arriba[1], punta[2]],
    pieDir: dir, pieArriba: arriba
  };
}

EJERCICIO_POSES.gemelos_maquina = {
  camara: _P_CAMARA, angulo: "tobillo",
  musculos: { p: ["gemelos"], s: [] },
  pose: function (s, h) {
    var grados = -12 + 44 * s;
    var d = _pTobilloPuntillas([10, 15, 10], grados);
    var i = _pTobilloPuntillas([10, 15, -10], grados);
    var pelvis = [d.tobillo[0] - 1, d.tobillo[1] + 73.9, 0];
    var P = { pelvis: pelvis, giro: {}, tronco: {}, cabeza: {} };
    P.piernaD = _pCon(d, { polo: [1, 0, 0] });
    P.piernaI = _pCon(i, { polo: [1, 0, 0] });
    var almohadilla = [pelvis[0], pelvis[1] + 48, 0];
    _pManos(P, [pelvis[0] + 7, pelvis[1] + 47, 20], [0, -1, 0.6]);
    P.props = [
      { tipo: "caja", c: [6, 6, 0], t: [8, 6, 18] },
      { tipo: "poste", a: [-24, 0, 0], b: [-24, 175, 0], ancho: 6 },
      { tipo: "caja", c: [almohadilla[0], almohadilla[1], 15], t: [7, 3, 6], capa: "medio" },
      { tipo: "caja", c: [almohadilla[0], almohadilla[1], -15], t: [7, 3, 6] }
    ];
    P.clave = P.piernaD.tobillo;
    return P;
  }
};

EJERCICIO_POSES.gemelos_sin_material = {
  camara: { yaw: 34, elev: 8 }, angulo: "tobillo",
  musculos: { p: ["gemelos"], s: [] },
  pose: function (s, h) {
    var d = _pTobilloPuntillas([10, 15, 9], -12 + 44 * s);
    var pelvis = [d.tobillo[0] - 1, d.tobillo[1] + 73.9, 0.5];
    var P = { pelvis: pelvis, giro: {}, tronco: {}, cabeza: {} };
    P.piernaD = _pCon(d, { polo: [1, 0, 0] });
    P.piernaI = { f: 10, rf: -70 };
    P.brazoD = { mano: [37, pelvis[1] + 40, 15], polo: [0, -1, 0.5] };
    var cadI = h.cadera(pelvis, {}, -1);
    P.brazoI = { mano: [cadI[0] - 1, cadI[1] + 9, cadI[2] - 6], polo: [-0.6, 0, -1] };
    P.props = [{ tipo: "caja", c: [6, 6, 0], t: [9, 6, 18] }, { tipo: "caja", c: [41, 90, 0], t: [2, 90, 36] }];
    P.clave = P.piernaD.tobillo;
    return P;
  }
};

EJERCICIO_POSES.gemelos_sentado_maquina = {
  camara: _P_CAMARA, angulo: "tobillo",
  musculos: { p: ["gemelos"], s: [] },
  pose: function (s, h) {
    var grados = -12 + 42 * s;
    var d = _pTobilloPuntillas([12, 15, 10], grados);
    var i = _pTobilloPuntillas([12, 15, -10], grados);
    var pelvis = [-36, 50, 0];
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: 6 }, cabeza: {} };
    P.piernaD = _pCon(d, { polo: [0.6, 1, 0.15] });
    P.piernaI = _pCon(i, { polo: [0.6, 1, -0.15] });
    // La rodilla sube con el tobillo: el apoyo va encima de ella (se calcula como el motor, con la misma IK).
    var rod = h.ik(h.cadera(pelvis, {}, 1), d.tobillo, h.FIG.muslo, h.FIG.pierna, [0.6, 1, 0.15]).medio;
    _pManos(P, [rod[0] - 4, rod[1] + 13, 21], [0, -1, 0.7]);
    P.props = [
      { tipo: "caja", c: [-38, 40, 0], t: [15, 3, 14] },
      { tipo: "poste", a: [-38, 0, 0], b: [-38, 37, 0], ancho: 5 },
      { tipo: "caja", c: [10, 6, 0], t: [7, 6, 18] },
      { tipo: "caja", c: [rod[0] - 2, rod[1] + 9, 0], t: [7, 2.5, 18], capa: "medio" }
    ];
    P.clave = d.tobillo;
    return P;
  }
};

// ── Pierna: máquinas sentado y tumbado ───────────────────────────────────

EJERCICIO_POSES.extension_cuadriceps = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["cuadriceps"], s: [] },
  pose: function (s, h) {
    var pelvis = [-30, 50, 0];
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: -8 }, cabeza: { flex: 4 } };
    var rf = -6 + 92 * s;
    P.piernaD = { f: 88, s: 4, rf: rf, pie: 10 };
    P.piernaI = { f: 88, s: 4, rf: rf, pie: 10 };
    _pManos(P, [-26, 50, 21], [-0.5, -0.3, 1]);
    var dir = h.dir(h.B({}), rf, 4, 1);
    var rod = [pelvis[0] + 37, pelvis[1] - 1, 0];
    var almohadilla = [rod[0] + dir[0] * 31, rod[1] + dir[1] * 31, 0];
    P.props = [
      { tipo: "caja", c: [-30, 40, 0], t: [17, 3, 14] },
      { tipo: "caja", c: [-50, 70, 0], t: [3, 26, 14], pitch: -8 },
      { tipo: "poste", a: [-30, 0, 0], b: [-30, 37, 0], ancho: 5 },
      { tipo: "barra", a: [almohadilla[0] + 3, almohadilla[1], -16], b: [almohadilla[0] + 3, almohadilla[1], 16], ancho: 7, clase: "anim__almohadilla" },
      { tipo: "poste", a: rod, b: [almohadilla[0] + 3, almohadilla[1], 0], ancho: 3, capa: "fondo" }
    ];
    P.clave = [almohadilla[0], almohadilla[1], 9];
    return P;
  }
};

EJERCICIO_POSES.curl_femoral_sentado = {
  camara: _P_CAMARA, angulo: "rodilla",
  musculos: { p: ["isquios"], s: ["gemelos"] },
  pose: function (s, h) {
    var pelvis = [-30, 50, 0];
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: -10 }, cabeza: { flex: 4 } };
    var rf = 84 - 100 * s;
    P.piernaD = { f: 88, s: 4, rf: rf, pie: 10 };
    P.piernaI = { f: 88, s: 4, rf: rf, pie: 10 };
    _pManos(P, [-26, 50, 21], [-0.5, -0.3, 1]);
    var dir = h.dir(h.B({}), rf, 4, 1);
    var rod = [pelvis[0] + 37, pelvis[1] - 1, 0];
    var rodillo = [rod[0] + dir[0] * 31, rod[1] + dir[1] * 31, 0];
    P.props = [
      { tipo: "caja", c: [-30, 40, 0], t: [17, 3, 14] },
      { tipo: "caja", c: [-50, 70, 0], t: [3, 26, 14], pitch: -10 },
      { tipo: "poste", a: [-30, 0, 0], b: [-30, 37, 0], ancho: 5 },
      { tipo: "barra", a: [rod[0] - 2, rod[1] + 9, -17], b: [rod[0] - 2, rod[1] + 9, 17], ancho: 7, clase: "anim__almohadilla" },
      { tipo: "barra", a: [rodillo[0] - 3, rodillo[1] - 2, -16], b: [rodillo[0] - 3, rodillo[1] - 2, 16], ancho: 7, clase: "anim__almohadilla" }
    ];
    P.clave = [rodillo[0], rodillo[1], 9];
    return P;
  }
};

EJERCICIO_POSES.curl_femoral = {
  camara: { yaw: 26, elev: 12 }, angulo: "rodilla",
  musculos: { p: ["isquios"], s: ["gemelos", "gluteos"] },
  pose: function (s, h) {
    var pelvis = [0, 59, 0];
    var giro = { pitch: 90 };
    var P = { pelvis: pelvis, giro: giro, tronco: {}, cabeza: { flex: -18 } };
    var rf = -112 * s;
    P.piernaD = { f: 2, s: 3, rf: rf, pie: 0 };
    P.piernaI = { f: 2, s: 3, rf: rf, pie: 0 };
    _pManos(P, [52, 44, 18], [-0.4, -1, 0.8]);
    var B = h.B(giro);
    var rodilla = h.mezcla([pelvis, 1], [h.dir(B, 2, 3, 1), 37]);
    var dir = h.dir(B, rf, 3, 1);
    var rodillo = h.mezcla([rodilla, 1], [dir, 33], [h.rotar(dir, B.Z, 90), 6]);
    P.props = [
      { tipo: "caja", c: [8, 47, 0], t: [52, 3, 10] },
      { tipo: "poste", a: [-30, 0, 0], b: [-30, 44, 0] },
      { tipo: "poste", a: [44, 0, 0], b: [44, 44, 0] },
      { tipo: "barra", a: [rodillo[0], rodillo[1], -16], b: [rodillo[0], rodillo[1], 16], ancho: 7, clase: "anim__almohadilla" }
    ];
    P.clave = [rodillo[0], rodillo[1], 9];
    return P;
  }
};

EJERCICIO_POSES.curl_femoral_toalla = {
  camara: { yaw: 26, elev: 12 }, angulo: "rodilla",
  musculos: { p: ["isquios"], s: ["gluteos"] },
  pose: function (s, h) {
    // Boca arriba, talones sobre la toalla: la cadera sube y los talones vienen hacia los glúteos.
    var hombro = [-40, 9.5, 0];
    var ang = (8 + 20 * s) * Math.PI / 180;
    var pelvis = [hombro[0] + 42 * Math.cos(ang), hombro[1] + 42 * Math.sin(ang), 0];
    var giro = { pitch: -90 + (8 + 20 * s) };
    var P = { pelvis: pelvis, giro: giro, tronco: {}, cabeza: { flex: 18 } };
    var talonX = 66 - 34 * s;
    P.piernaD = { tobillo: [talonX, 7, 11], pieDir: [0.3, 0.95, 0.05], pieArriba: [-0.95, 0.3, 0], polo: [0.2, 1, 0.2] };
    P.piernaI = { tobillo: [talonX, 7, -11], pieDir: [0.3, 0.95, -0.05], pieArriba: [-0.95, 0.3, 0], polo: [0.2, 1, -0.2] };
    P.brazoD = { f: 4, s: 14 };
    P.brazoI = { f: 4, s: 14 };
    P.props = [{ tipo: "caja", c: [talonX, 0.8, 0], t: [9, 0.8, 18], clase: "anim__toalla-caja" }];
    P.clave = [talonX, 7, 11];
    return P;
  }
};

// ── Glúteo ───────────────────────────────────────────────────────────────

/** Puente de glúteo o hip thrust: los hombros quietos en «hombro», la cadera sube. */
function _pPuente(s, hombro, a0, a1, pies) {
  var grados = a0 + (a1 - a0) * s;
  var ang = grados * Math.PI / 180;
  var pelvis = [hombro[0] + 42 * Math.cos(ang), hombro[1] + 42 * Math.sin(ang), 0];
  var P = { pelvis: pelvis, giro: { pitch: -90 + grados }, tronco: {}, cabeza: { flex: 20 + grados * 0.4 } };
  P.piernaD = { tobillo: [pies, 6, 13], pieDir: [0.98, 0, 0.15], polo: [0.3, 1, 0.3] };
  P.piernaI = { tobillo: [pies, 6, -13], pieDir: [0.98, 0, -0.15], polo: [0.3, 1, -0.3] };
  return P;
}

EJERCICIO_POSES.hip_thrust_barra = {
  camara: { yaw: 28, elev: 10 }, angulo: "cadera",
  musculos: { p: ["gluteos"], s: ["isquios", "cuadriceps"] },
  pose: function (s, h) {
    var P = _pPuente(s, [-34, 50, 0], -40, 0, 30);
    var B = h.B(P.giro);
    var barra = h.mezcla([P.pelvis, 1], [B.X, 13.5]);
    _pManos(P, [barra[0] - 2, barra[1] + 1, 22], [-0.3, 1, 0.6]);
    P.props = _pProps(
      [{ tipo: "caja", c: [-52, 33, 0], t: [16, 9, 18] }],
      _pBarra(barra, 36, 15)
    );
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.hip_thrust_maquina = {
  camara: { yaw: 28, elev: 10 }, angulo: "cadera",
  musculos: { p: ["gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var P = _pPuente(s, [-34, 50, 0], -40, 0, 30);
    var B = h.B(P.giro);
    var almohadilla = h.mezcla([P.pelvis, 1], [B.X, 14]);
    _pManos(P, [almohadilla[0] - 3, almohadilla[1] + 1, 21], [-0.3, 1, 0.6]);
    P.props = [
      { tipo: "caja", c: [-52, 33, 0], t: [16, 9, 18] },
      { tipo: "barra", a: [almohadilla[0], almohadilla[1], -17], b: [almohadilla[0], almohadilla[1], 17], ancho: 8, clase: "anim__almohadilla" },
      { tipo: "poste", a: [almohadilla[0] + 4, almohadilla[1], -19], b: [-30, 30, -19], ancho: 4, capa: "fondo" }
    ];
    P.clave = almohadilla;
    return P;
  }
};

EJERCICIO_POSES.puente_gluteo = {
  camara: { yaw: 26, elev: 12 }, angulo: "cadera",
  musculos: { p: ["gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var P = _pPuente(s, [-40, 9.5, 0], 0, 30, 28);
    P.brazoD = { f: 2, s: 14 };
    P.brazoI = { f: 2, s: 14 };
    P.clave = P.pelvis;
    return P;
  }
};

EJERCICIO_POSES.puente_gluteo_una_pierna = {
  camara: { yaw: 26, elev: 12 }, angulo: "cadera",
  musculos: { p: ["gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var P = _pPuente(s, [-40, 9.5, 0], 0, 30, 28);
    // La pierna libre va estirada y en línea con el muslo de la que empuja.
    var caderaD = h.cadera(P.pelvis, P.giro, 1);
    var rodD = h.ik(caderaD, P.piernaD.tobillo, h.FIG.muslo, h.FIG.pierna, P.piernaD.polo).medio;
    var dir = h.unidad(h.resta(rodD, caderaD));
    var caderaI = h.cadera(P.pelvis, P.giro, -1);
    P.piernaI = { tobillo: h.mezcla([caderaI, 1], [dir, 73.8]), pieDir: [-dir[1], dir[0], 0], pieArriba: [-dir[0], -dir[1], 0], polo: [-dir[1], dir[0], 0] };
    P.brazoD = { f: 2, s: 14 };
    P.brazoI = { f: 2, s: 14 };
    P.clave = P.pelvis;
    return P;
  }
};

EJERCICIO_POSES.patada_gluteo_polea = {
  camara: { yaw: 22, elev: 8 }, angulo: "cadera",
  musculos: { p: ["gluteos"], s: ["isquios"] },
  pose: function (s, h) {
    var pelvis = [-2, 79, 0];
    var giro = {};
    var P = { pelvis: pelvis, giro: giro, tronco: { flex: 24 }, cabeza: { flex: -10 } };
    P.piernaI = { tobillo: [2, 6, -10], pieDir: [1, 0, -0.1], polo: [1, 0, -0.1] };
    var f = 8 - 42 * s;
    P.piernaD = { f: f, s: 3, rf: f - 22, pie: 20 };
    _pManos(P, [44, 102, 18], [0, -1, 0.5]);
    var B = h.B(giro);
    var rod = h.mezcla([h.cadera(pelvis, giro, 1), 1], [h.dir(B, f, 3, 1), 37]);
    var tob = h.mezcla([rod, 1], [h.dir(B, f - 22, 3, 1), 37]);
    P.props = _pProps(_pPolea([60, 8, 0], 175), [
      { tipo: "barra", a: [48, 100, -20], b: [48, 100, 20], ancho: 3, capa: "fondo" },
      _pCable([60, 8, 0], tob)
    ]);
    P.clave = tob;
    return P;
  }
};

// ── Empuje: banca y suelo ────────────────────────────────────────────────

function _pBancaPlana() {
  return _pBanco(-70, 12, 47, 9);
}

EJERCICIO_POSES.press_banca_barra = {
  camara: { yaw: 22, elev: 14 }, angulo: "codo",
  musculos: { p: ["pecho", "triceps"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = _pTumbado(57);
    var barra = [-40 + 7 * s, 106 - 36 * s, 0];
    _pManos(P, [barra[0], barra[1], 25], [0.45, -1, 0.7]);
    P.props = _pProps(_pBancaPlana(), _pBarra(barra, 38, 14));
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.press_cerrado_barra = {
  camara: { yaw: 22, elev: 14 }, angulo: "codo",
  musculos: { p: ["triceps", "pecho"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = _pTumbado(57);
    var barra = [-40 + 9 * s, 106 - 36 * s, 0];
    _pManos(P, [barra[0], barra[1], 12], [0.8, -1, 0.15]);
    P.props = _pProps(_pBancaPlana(), _pBarra(barra, 38, 14));
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.press_banca_mancuernas = {
  camara: { yaw: 26, elev: 14 }, angulo: "codo",
  musculos: { p: ["pecho", "triceps"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = _pTumbado(57);
    var d = [-39 + 5 * s, 105 - 33 * s, 14 + 13 * s];
    _pManos(P, d, [0.45, -1, 0.8]);
    P.props = _pProps(_pBancaPlana(), [_pMancuerna(d, [0, 0, 1], 5.5), _pMancuerna([d[0], d[1], -d[2]], [0, 0, 1], 5.5)]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.aperturas_mancuernas = {
  camara: { yaw: 58, elev: 24 }, angulo: "hombro",
  musculos: { p: ["pecho"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = _pTumbado(57);
    var abre = 8 + 70 * s;
    var b = { f: 90, s: abre, cf: 90, cs: abre - 16 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    P.props = _pProps(_pBancaPlana(), [_pMancuerna(d, [1, 0, 0], 5), _pMancuerna(i, [1, 0, 0], 5)]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.press_frances = {
  camara: { yaw: 22, elev: 14 }, angulo: "codo",
  musculos: { p: ["triceps"], s: [] },
  pose: function (s, h) {
    var P = _pTumbado(57);
    var cf = 98 + 72 * s;
    var b = { f: 100, s: -13, cf: cf, cs: -2 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    var pesa = _pMedio(d, i);
    P.props = _pProps(_pBancaPlana(), [_pMancuerna(pesa, h.dirAnte(P.giro, P.tronco, "D", b), 5.5)]);
    P.clave = pesa;
    return P;
  }
};

EJERCICIO_POSES.pullover_mancuerna = {
  camara: { yaw: 22, elev: 14 }, angulo: "hombro",
  musculos: { p: ["dorsal", "pecho"], s: ["triceps"] },
  pose: function (s, h) {
    var P = _pTumbado(57);
    var f = 92 + 78 * s;
    var b = { f: f, s: -14.5, cf: f + 10, cs: -16 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    var pesa = _pMedio(d, i);
    P.props = _pProps(_pBancaPlana(), [_pMancuerna(pesa, h.dirAnte(P.giro, P.tronco, "D", b), 6)]);
    P.clave = pesa;
    return P;
  }
};

/** Inclinado (sentado y recostado «grados» respecto a la vertical). */
function _pRecostado(grados, alto) {
  return {
    pelvis: [0, alto || 46, 0], giro: { pitch: -grados }, tronco: {}, cabeza: { flex: Math.min(30, grados * 0.45) },
    piernaD: { tobillo: [36, 6, 16], pieDir: [0.98, 0, 0.18], polo: [0.4, 1, 0.3] },
    piernaI: { tobillo: [36, 6, -16], pieDir: [0.98, 0, -0.18], polo: [0.4, 1, -0.3] }
  };
}

function _pBancoInclinado(h, P, grados) {
  return [
    { tipo: "caja", c: [-2, 37, 0], t: [15, 3, 13] },
    { tipo: "caja", c: h.enTronco(P.pelvis, P.giro, {}, -12.5, 24, 0), t: [2.5, 30, 12], pitch: -grados },
    { tipo: "poste", a: [-2, 0, 0], b: [-2, 34, 0], ancho: 5 },
    { tipo: "poste", a: [-30, 0, 0], b: h.enTronco(P.pelvis, P.giro, {}, -12, 30, 0), ancho: 4 }
  ];
}

EJERCICIO_POSES.press_inclinado_mancuernas = {
  camara: { yaw: 26, elev: 12 }, angulo: "codo",
  musculos: { p: ["pecho", "deltoide_ant"], s: ["triceps"] },
  pose: function (s, h) {
    var P = _pRecostado(55);
    var hom = h.hombro(P.pelvis, P.giro, P.tronco, 1);
    var arriba = [hom[0], hom[1] + 47, 14];
    var abajo = h.mezcla([hom, 1], [h.T(P.giro, P.tronco).X, 10], [[0, 0, 1], 14]);
    var d = _pLerp3(arriba, abajo, s);
    _pManos(P, d, [0.4, -1, 0.8]);
    P.props = _pProps(_pBancoInclinado(h, P, 55), [_pMancuerna(d, [0, 0, 1], 5.5), _pMancuerna([d[0], d[1], -d[2]], [0, 0, 1], 5.5)]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.press_inclinado_maquina = {
  camara: { yaw: 26, elev: 12 }, angulo: "codo",
  musculos: { p: ["pecho", "deltoide_ant"], s: ["triceps"] },
  pose: function (s, h) {
    var P = _pRecostado(50);
    var T = h.T(P.giro, P.tronco);
    var pecho = h.enTronco(P.pelvis, P.giro, P.tronco, 14, 36, 0);
    var lejos = h.mezcla([pecho, 1], [T.X, 38], [T.Y, 4]);
    var c = _pLerp3(lejos, pecho, s);
    var asa = [c[0], c[1], 22];
    _pManos(P, asa, [0.3, -1, 0.7]);
    P.props = _pProps(_pBancoInclinado(h, P, 50), [
      { tipo: "barra", a: [asa[0], asa[1] - 4, 22], b: [asa[0], asa[1] + 5, 22], ancho: 3.5, capa: "medio" },
      { tipo: "barra", a: [asa[0], asa[1] - 4, -22], b: [asa[0], asa[1] + 5, -22], ancho: 3.5 },
      { tipo: "poste", a: [-40, 0, -30], b: [-40, 150, -30], ancho: 6 }
    ]);
    P.clave = asa;
    return P;
  }
};

EJERCICIO_POSES.press_declinado_barra = {
  camara: { yaw: 22, elev: 14 }, angulo: "codo",
  musculos: { p: ["pecho", "triceps"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var giro = { pitch: -110 };
    var pelvis = [2, 62, 0];
    var P = { pelvis: pelvis, giro: giro, tronco: {}, cabeza: { flex: 12 } };
    P.piernaD = { tobillo: [34, 50, 11], pieDir: [0.2, -0.98, 0.1], pieArriba: [0.98, 0.2, 0], polo: [0.4, 1, 0.2] };
    P.piernaI = { tobillo: [34, 50, -11], pieDir: [0.2, -0.98, -0.1], pieArriba: [0.98, 0.2, 0], polo: [0.4, 1, -0.2] };
    var hom = h.hombro(pelvis, giro, {}, 1);
    var pecho = h.enTronco(pelvis, giro, {}, 12, 30, 0);
    var barra = _pLerp3([hom[0] + 3, hom[1] + 48, 0], [pecho[0], pecho[1] + 2, 0], s);
    _pManos(P, [barra[0], barra[1], 25], [0.45, -1, 0.7]);
    P.props = _pProps([
      { tipo: "caja", c: h.enTronco(pelvis, giro, {}, -12.5, 20, 0), t: [2.5, 36, 9], pitch: -110 },
      { tipo: "poste", a: [-20, 0, 0], b: [-20, 50, 0], ancho: 5 },
      { tipo: "barra", a: [38, 47, -14], b: [38, 47, 14], ancho: 7, clase: "anim__almohadilla", capa: "fondo" },
      { tipo: "poste", a: [30, 0, 0], b: [38, 45, 0], ancho: 4 }
    ], _pBarra(barra, 38, 14));
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.press_pecho_maquina = {
  camara: { yaw: 30, elev: 10 }, angulo: "codo",
  musculos: { p: ["pecho", "triceps"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = _pSentado([0, 46, 0], -4, 0);
    var asa = [52 - 42 * s, 84, 22];
    _pManos(P, asa, [-0.4, -1, 0.7]);
    P.props = [
      { tipo: "caja", c: [2, 37, 0], t: [15, 3, 14] },
      { tipo: "caja", c: [-13, 72, 0], t: [2.5, 28, 13], pitch: 4 },
      { tipo: "poste", a: [2, 0, 0], b: [2, 34, 0], ancho: 5 },
      { tipo: "barra", a: [asa[0], asa[1] - 5, 22], b: [asa[0], asa[1] + 5, 22], ancho: 3.5, capa: "medio" },
      { tipo: "barra", a: [asa[0], asa[1] - 5, -22], b: [asa[0], asa[1] + 5, -22], ancho: 3.5 },
      { tipo: "poste", a: [-24, 0, -30], b: [-24, 150, -30], ancho: 6 }
    ];
    P.clave = asa;
    return P;
  }
};

/** Prono con las manos en el suelo: el cuerpo recto bascula sobre las puntas de los pies. */
function _pFlexion(alfa, tob, manosX, ancho) {
  var a = alfa * Math.PI / 180;
  var pelvis = [tob[0] + 74 * Math.cos(a), tob[1] + 74 * Math.sin(a), 0];
  var P = { pelvis: pelvis, giro: { pitch: 90 - alfa }, tronco: {}, cabeza: { flex: -6 } };
  P.piernaD = { f: 0, s: 1, pie: 50 };
  P.piernaI = { f: 0, s: 1, pie: 50 };
  P.brazoD = { mano: [manosX, 4.5, ancho], polo: [-0.6, 1, 0.55] };
  P.brazoI = { mano: [manosX, 4.5, -ancho], polo: [-0.6, 1, -0.55] };
  return P;
}

EJERCICIO_POSES.flexiones = {
  camara: { yaw: 26, elev: 10 }, angulo: "codo",
  musculos: { p: ["pecho", "triceps"], s: ["deltoide_ant", "abdomen"] },
  pose: function (s, h) {
    var P = _pFlexion(24 - 16 * s, [-60, 8, 0], 46, 21);
    P.clave = h.hombro(P.pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

EJERCICIO_POSES.flexiones_pies_elevados = {
  camara: { yaw: 26, elev: 10 }, angulo: "codo",
  musculos: { p: ["pecho", "deltoide_ant"], s: ["triceps", "abdomen"] },
  pose: function (s, h) {
    var P = _pFlexion(4.5 - 17.5 * s, [-62, 46, 0], 52, 21);
    P.props = _pBanco(-80, -42, 42, 11);
    P.clave = h.hombro(P.pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

EJERCICIO_POSES.pike_flexiones = {
  camara: { yaw: 26, elev: 10 }, angulo: "codo",
  musculos: { p: ["deltoide_ant", "triceps"], s: ["pecho", "trapecio"] },
  pose: function (s, h) {
    var pelvis = [8 * s, 76 - 4 * s, 0];
    var theta = 34.8 + 23 * s;
    var P = { pelvis: pelvis, giro: { pitch: 90 + theta }, tronco: {}, cabeza: { flex: -10 } };
    P.piernaD = { tobillo: [-26, 9, 10], pieDir: [0.6, -0.8, 0], pieArriba: [0.8, 0.6, 0], polo: [1, -0.4, 0.1] };
    P.piernaI = { tobillo: [-26, 9, -10], pieDir: [0.6, -0.8, 0], pieArriba: [0.8, 0.6, 0], polo: [1, -0.4, -0.1] };
    P.brazoD = { mano: [35, 4.5, 19], polo: [-0.6, 0.6, 0.8] };
    P.brazoI = { mano: [35, 4.5, -19], polo: [-0.6, 0.6, -0.8] };
    P.clave = h.enTronco(pelvis, P.giro, {}, 0, 57, 0);
    return P;
  }
};

EJERCICIO_POSES.fondos_paralelas = {
  camara: { yaw: 32, elev: 8 }, angulo: "codo",
  musculos: { p: ["pecho", "triceps"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var flex = 8 + 17 * s;
    var hom = [-1 + 7 * s, 152 - 30 * s];
    var r = flex * Math.PI / 180;
    var pelvis = [hom[0] - 42 * Math.sin(r), hom[1] - 42 * Math.cos(r), 0];
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: flex }, cabeza: { flex: -8 } };
    P.piernaD = { f: 16, s: 2, rf: -72, pie: 30 };
    P.piernaI = { f: 22, s: -2, rf: -66, pie: 30 };
    _pManos(P, [0, 103, 23], [-1, 0, 0.35]);
    P.props = [
      { tipo: "barra", a: [-34, 101, 23], b: [34, 101, 23], ancho: 3.5 },
      { tipo: "barra", a: [-34, 101, -23], b: [34, 101, -23], ancho: 3.5 },
      { tipo: "poste", a: [-30, 0, 23], b: [-30, 100, 23] },
      { tipo: "poste", a: [30, 0, 23], b: [30, 100, 23] },
      { tipo: "poste", a: [-30, 0, -23], b: [-30, 100, -23] },
      { tipo: "poste", a: [30, 0, -23], b: [30, 100, -23] }
    ];
    P.clave = h.hombro(pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

EJERCICIO_POSES.fondos_silla = {
  camara: { yaw: 30, elev: 10 }, angulo: "codo",
  musculos: { p: ["triceps"], s: ["deltoide_ant", "pecho"] },
  pose: function (s, h) {
    var pelvis = [-12 + 3 * s, 53 - 23 * s, 0];
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: 4 }, cabeza: { flex: 0 } };
    P.piernaD = { tobillo: [42, 7.5, 10], pieDir: [0.25, 0.97, 0.05], pieArriba: [-0.97, 0.25, 0], polo: [0.3, 1, 0.1] };
    P.piernaI = { tobillo: [42, 7.5, -10], pieDir: [0.25, 0.97, -0.05], pieArriba: [-0.97, 0.25, 0], polo: [0.3, 1, -0.1] };
    _pManos(P, [-15, 47, 17], [-1, 0.2, 0.3]);
    P.props = [
      { tipo: "caja", c: [-26, 42, 0], t: [13, 2, 19] },
      { tipo: "caja", c: [-38, 64, 0], t: [2, 20, 19] },
      { tipo: "poste", a: [-15, 0, 0], b: [-15, 40, 0] },
      { tipo: "poste", a: [-37, 0, 0], b: [-37, 40, 0] }
    ];
    P.clave = h.hombro(pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

// ── Empuje vertical y hombro ─────────────────────────────────────────────

EJERCICIO_POSES.press_militar_barra = {
  camara: { yaw: 34, elev: 8 }, angulo: "codo",
  musculos: { p: ["deltoide_ant", "deltoide_lat", "triceps"], s: ["trapecio", "abdomen"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    P.cabeza = { flex: -8 * Math.sin(Math.PI * s) };
    var barra = [7 + 5 * Math.sin(Math.PI * s) - 9 * s, 124 + 46 * s, 0];
    _pManos(P, [barra[0], barra[1], 18], [0.6, -1, 0.35]);
    P.props = _pBarra(barra, 36, 13);
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.press_hombro_mancuernas = {
  camara: { yaw: 48, elev: 8 }, angulo: "codo",
  musculos: { p: ["deltoide_ant", "deltoide_lat"], s: ["triceps", "trapecio"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    var d = [2 - 2 * s, 128 + 44 * s, 24 - 11 * s];
    _pManos(P, d, [0.1, -1, 1]);
    P.props = [_pMancuerna(d, [0, 0, 1], 5), _pMancuerna([d[0], d[1], -d[2]], [0, 0, 1], 5)];
    P.clave = d;
    return P;
  }
};

/** Sentado en banco con respaldo recto. */
function _pBancoRespaldo() {
  return [
    { tipo: "caja", c: [0, 37, 0], t: [15, 3, 14] },
    { tipo: "caja", c: [-13, 66, 0], t: [2.5, 26, 12] },
    { tipo: "poste", a: [0, 0, 0], b: [0, 34, 0], ancho: 5 }
  ];
}

EJERCICIO_POSES.press_militar_sentado_mancuernas = {
  camara: { yaw: 48, elev: 8 }, angulo: "codo",
  musculos: { p: ["deltoide_ant", "deltoide_lat"], s: ["triceps"] },
  pose: function (s, h) {
    var P = _pSentado([0, 46, 0], 0, 2);
    var d = [2 - 2 * s, 94 + 44 * s, 24 - 11 * s];
    _pManos(P, d, [0.1, -1, 1]);
    P.props = _pProps(_pBancoRespaldo(), [_pMancuerna(d, [0, 0, 1], 5), _pMancuerna([d[0], d[1], -d[2]], [0, 0, 1], 5)]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.press_arnold = {
  camara: { yaw: 40, elev: 8 }, angulo: "codo",
  musculos: { p: ["deltoide_ant", "deltoide_lat"], s: ["triceps"] },
  pose: function (s, h) {
    var P = _pSentado([0, 46, 0], 0, 2);
    // Empieza con las palmas hacia uno y los codos delante; al subir giran y se abren.
    var giroCodo = Math.min(1, s * 1.6);
    var d = [10 - 10 * s, 92 + 46 * s, 7 + 6 * s + 9 * Math.sin(Math.PI * s)];
    var polo = [0.9 * (1 - giroCodo), -1, 0.15 + 0.9 * giroCodo];
    _pManos(P, d, polo);
    var eje = h.unidad([1 - giroCodo, 0, giroCodo + 0.01]);
    P.props = _pProps(_pBancoRespaldo(), [_pMancuerna(d, eje, 5), _pMancuerna([d[0], d[1], -d[2]], [eje[0], eje[1], -eje[2]], 5)]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.press_hombro_maquina = {
  camara: { yaw: 40, elev: 8 }, angulo: "codo",
  musculos: { p: ["deltoide_ant", "deltoide_lat"], s: ["triceps"] },
  pose: function (s, h) {
    var P = _pSentado([0, 46, 0], 0, 2);
    var asa = [5 - 3 * s, 92 + 42 * s, 24 - 6 * s];
    _pManos(P, asa, [0.3, -1, 0.9]);
    P.props = _pProps(_pBancoRespaldo(), [
      { tipo: "barra", a: [asa[0] - 5, asa[1], asa[2]], b: [asa[0] + 5, asa[1], asa[2]], ancho: 3.5, capa: "medio" },
      { tipo: "barra", a: [asa[0] - 5, asa[1], -asa[2]], b: [asa[0] + 5, asa[1], -asa[2]], ancho: 3.5 },
      { tipo: "poste", a: [-6, asa[1], -asa[2] - 3], b: [-16, 30, -26], ancho: 4, capa: "fondo" }
    ]);
    P.clave = asa;
    return P;
  }
};

function _pLaterales(s, h, conPeso) {
  var P = _pDePie([0, 80, 0], 6);
  var abre = 10 + 76 * s;
  var b = { f: 10, s: abre, cf: 18, cs: abre - 10 };
  P.brazoD = _pCon({}, b);
  P.brazoI = _pCon({}, b);
  var T = h.T(P.giro, P.tronco);
  var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
  var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
  if (conPeso === "mancuerna") P.props = [_pMancuerna(d, T.X, 4.5), _pMancuerna(i, T.X, 4.5)];
  if (conPeso === "botella") {
    P.props = [d, i].map(function (m) {
      return { tipo: "barra", a: h.mezcla([m, 1], [T.X, -5]), b: h.mezcla([m, 1], [T.X, 6]), ancho: 6.5, clase: "anim__botella" };
    });
  }
  P.clave = d;
  return P;
}

EJERCICIO_POSES.elevaciones_laterales = {
  camara: { yaw: 68, elev: 6 }, angulo: "hombro",
  musculos: { p: ["deltoide_lat"], s: ["trapecio"] },
  pose: function (s, h) { return _pLaterales(s, h, "mancuerna"); }
};

EJERCICIO_POSES.elevaciones_laterales_botellas = {
  camara: { yaw: 68, elev: 6 }, angulo: "hombro",
  musculos: { p: ["deltoide_lat"], s: ["trapecio"] },
  pose: function (s, h) { return _pLaterales(s, h, "botella"); }
};

EJERCICIO_POSES.elevaciones_laterales_polea = {
  camara: { yaw: 66, elev: 6 }, angulo: "hombro",
  musculos: { p: ["deltoide_lat"], s: ["trapecio"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 4);
    var abre = -14 + 96 * s;
    var b = { f: 12, s: abre, cf: 18, cs: abre - 8 };
    P.brazoD = b;
    P.brazoI = { mano: [6, 104, -40], polo: [0, -1, -1] };
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    P.props = _pProps(_pPolea([6, 10, -44], 180), [_pCable([6, 10, -44], d)]);
    P.clave = d;
    return P;
  }
};

function _pPajaros(s, h, conPeso) {
  var pelvis = [-14, 74, 0];
  var P = _pCon({ pelvis: pelvis, giro: {}, tronco: { flex: 70 }, cabeza: { flex: -20 } }, _pPiernas(2, 12, 10, [1, 0, 0.15]));
  var abre = 6 + 76 * s;
  var b = { f: 72, s: abre, cf: 74, cs: abre - 14 };
  P.brazoD = _pCon({}, b);
  P.brazoI = _pCon({}, b);
  var T = h.T(P.giro, P.tronco);
  var d = h.agarre(pelvis, P.giro, P.tronco, "D", b);
  var i = h.agarre(pelvis, P.giro, P.tronco, "I", b);
  if (conPeso) P.props = [_pMancuerna(d, T.Y, 4.5), _pMancuerna(i, T.Y, 4.5)];
  P.clave = d;
  return P;
}

EJERCICIO_POSES.pajaros = {
  camara: { yaw: 58, elev: 10 }, angulo: "hombro",
  musculos: { p: ["deltoide_post"], s: ["trapecio", "dorsal"] },
  pose: function (s, h) { return _pPajaros(s, h, true); }
};

EJERCICIO_POSES.pajaros_sin_peso = {
  camara: { yaw: 58, elev: 10 }, angulo: "hombro",
  musculos: { p: ["deltoide_post"], s: ["trapecio"] },
  pose: function (s, h) { return _pPajaros(s, h, false); }
};

EJERCICIO_POSES.pajaros_polea = {
  camara: { yaw: 60, elev: 12 }, angulo: "hombro",
  musculos: { p: ["deltoide_post"], s: ["trapecio"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 2);
    var abre = -22 + 100 * s;
    var b = { f: 88, s: abre, cf: 88, cs: abre - 8 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    // Brazos cruzados: la mano derecha lleva el cable de la polea izquierda y al revés.
    P.props = _pProps(_pPolea([62, 120, -44], 175), _pPolea([62, 120, 44], 175), [_pCable([62, 120, -44], d), _pCable([62, 120, 44], i)]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.face_pull = {
  camara: { yaw: 40, elev: 10 }, angulo: "codo",
  musculos: { p: ["deltoide_post"], s: ["trapecio", "biceps"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], -2);
    var mano = _pLerp3([42, 134, 6], [7, 141, 22], s);
    _pManos(P, mano, [-0.3, 0.7, 1]);
    var nudo = [56, 138, 0];
    P.props = _pProps(_pPolea([70, 140, 0], 185), [_pCable([70, 140, 0], nudo), _pCable(nudo, mano), _pCable(nudo, [mano[0], mano[1], -mano[2]])]);
    P.clave = mano;
    return P;
  }
};

// ── Tirón: remos ─────────────────────────────────────────────────────────

EJERCICIO_POSES.remo_barra = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["dorsal"], s: ["biceps", "deltoide_post", "lumbar"] },
  pose: function (s, h) {
    var pelvis = [-14, 70, 0];
    var P = _pCon({ pelvis: pelvis, giro: {}, tronco: { flex: 65 }, cabeza: { flex: -22 } }, _pPiernas(2, 11, 8, [1, 0, 0.15]));
    var hom = h.hombro(pelvis, P.giro, P.tronco, 1);
    var abajo = [hom[0] + 1, hom[1] - 49.5, 19];
    var arriba = h.enTronco(pelvis, P.giro, P.tronco, 13, 22, 19);
    var mano = _pLerp3(abajo, arriba, s);
    _pManos(P, mano, [-0.6, 1, 0.25]);
    var barra = [mano[0], mano[1], 0];
    P.props = _pBarra(barra, 36, 13);
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.remo_mancuerna = {
  camara: { yaw: 20, elev: 10 }, angulo: "codo",
  musculos: { p: ["dorsal"], s: ["biceps", "deltoide_post"] },
  pose: function (s, h) {
    var pelvis = [-8, 78, 0];
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: 79 }, cabeza: { flex: -24 } };
    P.piernaD = { tobillo: [-6, 6, 20], pieDir: [1, 0, 0.15], polo: [1, 0, 0.2] };
    P.piernaI = { f: 0, s: 0, rf: -90, pie: 40 };
    P.brazoI = { mano: [34, 39, -11], polo: [-0.3, -0.2, -1] };
    var hom = h.hombro(pelvis, P.giro, P.tronco, 1);
    var abajo = [hom[0] + 1, hom[1] - 49.5, 15];
    var arriba = h.enTronco(pelvis, P.giro, P.tronco, 11, 10, 15);
    var mano = _pLerp3(abajo, arriba, s);
    P.brazoD = { mano: mano, polo: [-0.5, 1, 0.3] };
    P.props = _pProps(_pBanco(-46, 46, 36, 9), [_pMancuerna(mano, [1, 0, 0], 5.5)]);
    P.clave = mano;
    return P;
  }
};

EJERCICIO_POSES.remo_polea = {
  camara: { yaw: 26, elev: 10 }, angulo: "codo",
  musculos: { p: ["dorsal"], s: ["biceps", "trapecio"] },
  pose: function (s, h) {
    var pelvis = [0, 30, 0];
    var flex = 18 - 24 * s;
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: flex }, cabeza: { flex: -flex * 0.5 } };
    P.piernaD = { tobillo: [58, 20, 11], pieDir: [0.3, 0.95, 0.05], pieArriba: [-0.95, 0.3, 0], polo: [0.2, 1, 0.2] };
    P.piernaI = { tobillo: [58, 20, -11], pieDir: [0.3, 0.95, -0.05], pieArriba: [-0.95, 0.3, 0], polo: [0.2, 1, -0.2] };
    var lejos = [50, 58, 4];
    var cerca = h.enTronco(pelvis, P.giro, { flex: -6 }, 14, 18, 4);
    var mano = _pLerp3(lejos, cerca, s);
    _pManos(P, mano, [-0.7, -0.5, 0.4]);
    var asa = [mano[0] + 3, mano[1], 0];
    P.props = [
      { tipo: "caja", c: [-2, 20, 0], t: [26, 3, 13] },
      { tipo: "caja", c: [64, 18, 0], t: [2, 12, 16], pitch: -15 },
      { tipo: "poste", a: [84, 0, 0], b: [84, 120, 0], ancho: 6 },
      { tipo: "polea", c: [80, 36, 0], r: 3.5, capa: "fondo" },
      _pCable([80, 36, 0], asa),
      { tipo: "barra", a: [asa[0], asa[1], -5], b: [asa[0], asa[1], 5], ancho: 3 }
    ];
    P.clave = asa;
    return P;
  }
};

EJERCICIO_POSES.remo_maquina = {
  camara: { yaw: 26, elev: 10 }, angulo: "codo",
  musculos: { p: ["dorsal"], s: ["biceps", "trapecio"] },
  pose: function (s, h) {
    var P = _pSentado([0, 46, 0], 26, 0);
    P.cabeza = { flex: -16 };
    var lejos = [52, 92, 18];
    var cerca = h.enTronco(P.pelvis, P.giro, P.tronco, 12, 24, 19);
    var mano = _pLerp3(lejos, cerca, s);
    _pManos(P, mano, [-0.6, 0.2, 0.7]);
    P.props = [
      { tipo: "caja", c: [2, 37, 0], t: [14, 3, 13] },
      { tipo: "poste", a: [2, 0, 0], b: [2, 34, 0], ancho: 5 },
      { tipo: "caja", c: h.enTronco(P.pelvis, P.giro, P.tronco, 14, 30, 0), t: [2.5, 17, 12], pitch: 26 },
      { tipo: "poste", a: [40, 0, 0], b: [34, 76, 0], ancho: 5 },
      { tipo: "barra", a: [mano[0], mano[1] - 5, 18], b: [mano[0], mano[1] + 5, 18], ancho: 3.5, capa: "medio" },
      { tipo: "barra", a: [mano[0], mano[1] - 5, -18], b: [mano[0], mano[1] + 5, -18], ancho: 3.5 }
    ];
    P.clave = mano;
    return P;
  }
};

// ── Tirón: jalones y dominadas ───────────────────────────────────────────

function _pJalon(s, h, ancho, abajoZ) {
  var P = _pSentado([0, 46, 0], -10, 2);
  P.cabeza = { flex: -6 };
  var arriba = [5, 160, ancho];
  var abajo = h.enTronco(P.pelvis, P.giro, P.tronco, 13, 40, abajoZ);
  var mano = _pLerp3(arriba, abajo, s);
  _pManos(P, mano, [-0.3, -1, abajoZ > 10 ? 0.9 : 0.25]);
  var barra = [mano[0], mano[1], 0];
  P.props = [
    { tipo: "caja", c: [2, 37, 0], t: [14, 3, 13] },
    { tipo: "poste", a: [2, 0, 0], b: [2, 34, 0], ancho: 5 },
    { tipo: "barra", a: [30, 54, -16], b: [30, 54, 16], ancho: 7, clase: "anim__almohadilla", capa: "fondo" },
    { tipo: "poste", a: [-30, 0, 0], b: [-30, 210, 0], ancho: 6 },
    { tipo: "polea", c: [5, 205, 0], r: 3.5, capa: "fondo" },
    _pCable([5, 205, 0], barra),
    { tipo: "barra", a: [barra[0], barra[1], -mano[2] - 6], b: [barra[0], barra[1], mano[2] + 6], ancho: 2.6 }
  ];
  P.clave = barra;
  return P;
}

EJERCICIO_POSES.jalon_pecho = {
  camara: { yaw: 40, elev: 8 }, angulo: "codo",
  musculos: { p: ["dorsal"], s: ["biceps", "deltoide_post"] },
  pose: function (s, h) { return _pJalon(s, h, 32, 29); }
};

EJERCICIO_POSES.jalon_agarre_estrecho = {
  camara: { yaw: 34, elev: 8 }, angulo: "codo",
  musculos: { p: ["dorsal"], s: ["biceps"] },
  pose: function (s, h) {
    var P = _pJalon(s, h, 5, 5);
    var abajo = h.enTronco(P.pelvis, P.giro, P.tronco, 13, 33, 5);
    var mano = _pLerp3([5, 160, 5], abajo, s);
    _pManos(P, mano, [-0.5, -1, 0.15]);
    P.props[P.props.length - 1] = { tipo: "barra", a: [mano[0], mano[1], -7], b: [mano[0], mano[1], 7], ancho: 3 };
    P.props[P.props.length - 2] = _pCable([5, 205, 0], [mano[0], mano[1] + 4, 0]);
    P.clave = [mano[0], mano[1], 0];
    return P;
  }
};

function _pDominada(s, h, kneeling) {
  var subida = 36 * s;
  var flex = -4 - 8 * s;
  var hom = [-2 + 3 * s, 155 + subida];
  var r = flex * Math.PI / 180;
  var pelvis = [hom[0] - 42 * Math.sin(r), hom[1] - 42 * Math.cos(r), 0];
  var P = { pelvis: pelvis, giro: {}, tronco: { flex: flex }, cabeza: { flex: -10 * s } };
  if (kneeling) {
    P.piernaD = { f: 4, s: 2, rf: -88, pie: 40 };
    P.piernaI = { f: 4, s: 2, rf: -88, pie: 40 };
  } else {
    P.piernaD = { f: 16, s: 2, rf: -48, pie: 30 };
    P.piernaI = { f: 22, s: -3, rf: -42, pie: 30 };
  }
  _pManos(P, [0, 205, 24], [0, -1, 0.9]);
  P.props = [
    { tipo: "barra", a: [0, 205, -42], b: [0, 205, 42], ancho: 3 },
    { tipo: "poste", a: [-4, 205, -42], b: [-28, 110, -42], ancho: 4 },
    { tipo: "poste", a: [-4, 205, 42], b: [-28, 110, 42], ancho: 4 }
  ];
  P.clave = h.hombro(pelvis, P.giro, P.tronco, 1);
  return P;
}

EJERCICIO_POSES.dominadas = {
  camara: { yaw: 40, elev: 6 }, angulo: "codo", sinSuelo: true,
  musculos: { p: ["dorsal", "biceps"], s: ["antebrazo", "deltoide_post"] },
  pose: function (s, h) { return _pDominada(s, h, false); }
};

EJERCICIO_POSES.dominadas_negativas = {
  camara: { yaw: 40, elev: 6 }, angulo: "codo", sinSuelo: true, ritmo: "negativa",
  musculos: { p: ["dorsal", "biceps"], s: ["antebrazo"] },
  pose: function (s, h) { return _pDominada(s, h, false); }
};

EJERCICIO_POSES.dominadas_asistidas = {
  camara: { yaw: 36, elev: 6 }, angulo: "codo", sinSuelo: true,
  musculos: { p: ["dorsal"], s: ["biceps"] },
  pose: function (s, h) {
    var P = _pDominada(s, h, true);
    var rod = [P.pelvis[0] + 1, P.pelvis[1] - 37, 0];
    P.props.push({ tipo: "caja", c: [rod[0] - 12, rod[1] - 6.5, 0], t: [18, 2, 16], capa: "medio" });
    P.props.push({ tipo: "poste", a: [rod[0] - 12, rod[1] - 9, 0], b: [-34, 40, 0], ancho: 5 });
    return P;
  }
};

EJERCICIO_POSES.pullover_polea = {
  camara: { yaw: 30, elev: 8 }, angulo: "hombro",
  musculos: { p: ["dorsal"], s: ["triceps", "abdomen"] },
  pose: function (s, h) {
    var P = _pDePie([-8, 78, 0], 28);
    P.cabeza = { flex: -16 };
    var f = 160 - 132 * s;
    var b = { f: f, s: 9, cf: f + 4 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var barra = [d[0], d[1], 0];
    P.props = _pProps(_pPolea([70, 185, 0], 190), [_pCable([70, 185, 0], barra), { tipo: "barra", a: [barra[0], barra[1], -22], b: [barra[0], barra[1], 22], ancho: 2.6 }]);
    P.clave = barra;
    return P;
  }
};

// ── Brazos ───────────────────────────────────────────────────────────────

function _pCurl(s, h, P, extra) {
  var o = extra || {};
  var flex = P.tronco.flex || 0;
  var f = flex + (o.f0 || 4) + 8 * s;
  var b = { f: f, s: o.s || 5, cf: f + 2 + 138 * s, cs: o.cs || 4 };
  P.brazoD = _pCon({}, b);
  P.brazoI = _pCon({}, b);
  return {
    b: b,
    d: h.agarre(P.pelvis, P.giro, P.tronco, "D", b),
    i: h.agarre(P.pelvis, P.giro, P.tronco, "I", b)
  };
}

EJERCICIO_POSES.curl_biceps_barra = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["biceps"], s: ["antebrazo"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    var c = _pCurl(s, h, P, { s: 4, cs: 2 });
    var barra = [c.d[0], c.d[1], 0];
    P.props = _pBarra(barra, 30, 10);
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.curl_biceps_mancuernas = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["biceps"], s: ["antebrazo"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    var c = _pCurl(s, h, P, { s: 7, cs: 6 });
    P.props = [_pMancuerna(c.d, [0, 0, 1]), _pMancuerna(c.i, [0, 0, 1])];
    P.clave = c.d;
    return P;
  }
};

EJERCICIO_POSES.curl_martillo = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["biceps", "antebrazo"], s: [] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    var c = _pCurl(s, h, P, { s: 7, cs: 6 });
    var T = h.T(P.giro, P.tronco);
    var eje = h.dir(T, c.b.cf + 90, 0, 1);
    P.props = [_pMancuerna(c.d, eje), _pMancuerna(c.i, eje)];
    P.clave = c.d;
    return P;
  }
};

EJERCICIO_POSES.curl_toalla = {
  camara: { yaw: 34, elev: 8 }, angulo: "codo",
  musculos: { p: ["biceps"], s: ["antebrazo"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 2);
    var c = _pCurl(s, h, P, { s: 6, cs: 4 });
    var pieD = [6, 1.5, 11];
    var pieI = [6, 1.5, -11];
    P.props = [
      { tipo: "barra", a: pieD, b: c.d, ancho: 3.5, clase: "anim__toalla" },
      { tipo: "barra", a: c.d, b: c.i, ancho: 3.5, clase: "anim__toalla" },
      { tipo: "barra", a: c.i, b: pieI, ancho: 3.5, clase: "anim__toalla" }
    ];
    P.clave = c.d;
    return P;
  }
};

EJERCICIO_POSES.curl_biceps_polea = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["biceps"], s: ["antebrazo"] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    var c = _pCurl(s, h, P, { s: 4, cs: 2 });
    var barra = [c.d[0], c.d[1], 0];
    P.props = _pProps(_pPolea([44, 8, 0], 175), [_pCable([44, 8, 0], barra)], _pBarra(barra, 18, 0));
    P.clave = barra;
    return P;
  }
};

EJERCICIO_POSES.curl_concentrado = {
  camara: { yaw: 40, elev: 10 }, angulo: "codo",
  musculos: { p: ["biceps"], s: ["antebrazo"] },
  pose: function (s, h) {
    var pelvis = [-10, 48, 0];
    var flex = 36;
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: flex }, cabeza: { flex: -8 } };
    P.piernaD = { tobillo: [26, 6, 22], pieDir: [0.95, 0, 0.3], polo: [0.4, 1, 0.5] };
    P.piernaI = { tobillo: [26, 6, -22], pieDir: [0.95, 0, -0.3], polo: [0.4, 1, -0.5] };
    var b = { f: flex + 6, s: -10, cf: flex + 6 + 132 * s, cs: -14 };
    P.brazoD = b;
    var rodI = [pelvis[0] + 32, 44, -18];
    P.brazoI = { mano: rodI, polo: [-0.2, -0.3, -1] };
    var d = h.agarre(pelvis, P.giro, P.tronco, "D", b);
    P.props = _pProps([{ tipo: "caja", c: [-12, 39, 0], t: [16, 3, 13] }, { tipo: "poste", a: [-12, 0, 0], b: [-12, 36, 0], ancho: 5 }],
      [_pMancuerna(d, [0, 0, 1])]);
    P.clave = d;
    return P;
  }
};

EJERCICIO_POSES.curl_banco_inclinado = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["biceps"], s: ["antebrazo"] },
  pose: function (s, h) {
    var P = _pRecostado(40);
    var f = -40;
    var b = { f: f - 2, s: 9, cf: f + 136 * s, cs: 8 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    P.props = _pProps(_pBancoInclinado(h, P, 40), [_pMancuerna(d, [0, 0, 1]), _pMancuerna(i, [0, 0, 1])]);
    P.clave = d;
    return P;
  }
};

function _pTricepsPolea(s, h, cuerda) {
  var P = _pDePie([0, 80, 0], 10);
  var flex = 10;
  var b = { f: flex + 6, s: 6, cf: flex + 112 - 104 * s, cs: cuerda ? 2 + 22 * s : 2 };
  P.brazoD = _pCon({}, b);
  P.brazoI = _pCon({}, b);
  var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
  var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
  var polea = [34, 192, 0];
  if (cuerda) {
    var nudo = [(d[0] + i[0]) / 2 + 2, Math.max(d[1], i[1]) + 9, 0];
    P.props = _pProps(_pPolea(polea, 196), [_pCable(polea, nudo), { tipo: "barra", a: nudo, b: d, ancho: 2.6, clase: "anim__cuerda" }, { tipo: "barra", a: nudo, b: i, ancho: 2.6, clase: "anim__cuerda" }]);
  } else {
    var barra = [d[0], d[1], 0];
    P.props = _pProps(_pPolea(polea, 196), [_pCable(polea, barra)], _pBarra(barra, 14, 0));
  }
  P.clave = d;
  return P;
}

EJERCICIO_POSES.extension_triceps_polea = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["triceps"], s: [] },
  pose: function (s, h) { return _pTricepsPolea(s, h, false); }
};

EJERCICIO_POSES.extension_triceps_cuerda = {
  camara: { yaw: 36, elev: 8 }, angulo: "codo",
  musculos: { p: ["triceps"], s: [] },
  pose: function (s, h) { return _pTricepsPolea(s, h, true); }
};

EJERCICIO_POSES.extension_triceps_mancuerna = {
  camara: _P_CAMARA, angulo: "codo",
  musculos: { p: ["triceps"], s: [] },
  pose: function (s, h) {
    var P = _pDePie([0, 80, 0], 0);
    var cf = 172 + 158 * s;
    var b = { f: 168, s: -8, cf: cf, cs: -22 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    var pesa = _pMedio(d, i);
    P.props = [_pMancuerna(pesa, h.dirAnte(P.giro, P.tronco, "D", b), 5.5)];
    P.clave = pesa;
    return P;
  }
};

// ── Pecho con poleas ─────────────────────────────────────────────────────

EJERCICIO_POSES.cruces_polea = {
  camara: { yaw: 64, elev: 12 }, angulo: "hombro",
  musculos: { p: ["pecho"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = { pelvis: [0, 78, 0], giro: {}, tronco: { flex: 14 }, cabeza: { flex: -4 } };
    P.piernaD = { tobillo: [16, 6, 11], pieDir: [1, 0, 0.1], polo: [1, 0, 0.1] };
    P.piernaI = { tobillo: [-16, 10, -11], pieDir: [0.85, -0.5, -0.1], pieArriba: [0.5, 0.85, 0], polo: [1, -0.3, -0.1] };
    var abre = 72 - 66 * s;
    var b = { f: 72 + 12 * s, s: abre, cf: 78 + 12 * s, cs: abre - 16 };
    P.brazoD = _pCon({}, b);
    P.brazoI = _pCon({}, b);
    var d = h.agarre(P.pelvis, P.giro, P.tronco, "D", b);
    var i = h.agarre(P.pelvis, P.giro, P.tronco, "I", b);
    P.props = _pProps(_pPolea([-4, 176, 70], 186), _pPolea([-4, 176, -70], 186), [_pCable([-4, 176, 70], d), _pCable([-4, 176, -70], i)]);
    P.clave = d;
    return P;
  }
};

// ── Abdomen y tronco ─────────────────────────────────────────────────────

EJERCICIO_POSES.plancha = {
  camara: { yaw: 26, elev: 10 }, angulo: "cadera", ritmo: "mantener", camino: false,
  musculos: { p: ["abdomen"], s: ["deltoide_ant", "gluteos", "cuadriceps"] },
  pose: function (s, h) {
    var alfa = 11.5 + 0.6 * (s - 0.5);
    var a = alfa * Math.PI / 180;
    var tob = [-62, 8, 0];
    var pelvis = [tob[0] + 74 * Math.cos(a), tob[1] + 74 * Math.sin(a), 0];
    var P = { pelvis: pelvis, giro: { pitch: 90 - alfa }, tronco: {}, cabeza: { flex: -6 } };
    P.piernaD = { f: 0, s: 1, pie: 50 };
    P.piernaI = { f: 0, s: 1, pie: 50 };
    var hom = h.hombro(pelvis, P.giro, {}, 1);
    var codo = [hom[0] - 1, 4, 14];
    P.brazoD = { mano: [codo[0] + 24, 4, 7], polo: [-0.2, 1, 0.3] };
    P.brazoI = { mano: [codo[0] + 24, 4, -7], polo: [-0.2, 1, -0.3] };
    return P;
  }
};

EJERCICIO_POSES.plancha_lateral = {
  camara: { yaw: 0, elev: 12 }, angulo: "cadera", ritmo: "mantener", camino: false,
  musculos: { p: ["oblicuos"], s: ["abdomen", "gluteos", "deltoide_lat"] },
  pose: function (s, h) {
    // Tumbado sobre el lado izquierdo, mirando a la cámara, la cabeza a la derecha.
    var a = (13 + 1 * (s - 0.5)) * Math.PI / 180;
    var X = [0, 0, 1];
    var Y = [Math.cos(a), Math.sin(a), 0];
    var Z = [-Math.sin(a), Math.cos(a), 0];
    var marco = { X: X, Y: Y, Z: Z };
    var hombroI = [36, 31, 0];
    var pelvis = h.mezcla([hombroI, 1], [Y, -h.FIG.hombroAlto], [Z, h.FIG.hombroAncho]);
    var P = { pelvis: pelvis, marco: marco, tronco: {}, cabeza: { flex: 0 } };
    P.piernaD = { f: 0, s: -3, rf: 0, pie: 0 };
    P.piernaI = { f: 0, s: 3, rf: 0, pie: 0 };
    P.brazoI = { f: 0, s: 90, cf: 90, cs: 0 };
    P.brazoD = { f: 0, s: 88, cf: 0, cs: 92 };
    return P;
  }
};

EJERCICIO_POSES.crunch_suelo = {
  camara: { yaw: 26, elev: 12 }, angulo: "cadera",
  musculos: { p: ["abdomen"], s: ["oblicuos"] },
  pose: function (s, h) {
    var pelvis = [0, 10, 0];
    var P = { pelvis: pelvis, giro: { pitch: -90 }, tronco: { flex: 34 * s }, cabeza: { flex: 10 + 14 * s } };
    P.piernaD = { tobillo: [34, 6, 12], pieDir: [0.98, 0, 0.18], polo: [0.3, 1, 0.25] };
    P.piernaI = { tobillo: [34, 6, -12], pieDir: [0.98, 0, -0.18], polo: [0.3, 1, -0.25] };
    var nuca = h.enTronco(pelvis, P.giro, P.tronco, -6, 54, 0);
    _pManos(P, [nuca[0], nuca[1], 6], [0.2, 0.2, 1]);
    P.clave = h.hombro(pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

EJERCICIO_POSES.elevacion_piernas = {
  camara: { yaw: 26, elev: 12 }, angulo: "cadera",
  musculos: { p: ["abdomen"], s: ["cuadriceps"] },
  pose: function (s, h) {
    var P = { pelvis: [0, 10, 0], giro: { pitch: -90 }, tronco: {}, cabeza: { flex: 8 } };
    var f = 6 + 80 * s;
    P.piernaD = { f: f, s: 2, rf: f, pie: 10 };
    P.piernaI = { f: f, s: 2, rf: f, pie: 10 };
    P.brazoD = { f: 2, s: 16 };
    P.brazoI = { f: 2, s: 16 };
    var B = h.B(P.giro);
    P.clave = h.mezcla([h.cadera(P.pelvis, P.giro, 1), 1], [h.dir(B, f, 2, 1), 74]);
    return P;
  }
};

EJERCICIO_POSES.dead_bug = {
  camara: { yaw: 30, elev: 16 }, angulo: "cadera", ritmo: "alterno",
  musculos: { p: ["abdomen"], s: ["oblicuos"] },
  pose: function (s, h, lado) {
    // Brazo y pierna contrarios: con lado "D" baja el brazo derecho y la pierna izquierda.
    var P = { pelvis: [0, 10, 0], giro: { pitch: -90 }, tronco: {}, cabeza: { flex: 6 } };
    var der = lado === "D";
    var piernaMueve = der ? "piernaI" : "piernaD";
    P[der ? "brazoI" : "brazoD"] = { f: 90, s: 6 };
    P[der ? "brazoD" : "brazoI"] = { f: 90 + 80 * s, s: 6 };
    P[der ? "piernaD" : "piernaI"] = { f: 90, s: 3, rf: 0, pie: 10 };
    P[piernaMueve] = { f: 90 - 76 * s, s: 3, rf: 14 * s, pie: 10 };
    var B = h.B(P.giro);
    var signo = der ? -1 : 1;
    var rod = h.mezcla([h.cadera(P.pelvis, P.giro, signo), 1], [h.dir(B, P[piernaMueve].f, 3, signo), 37]);
    P.clave = h.mezcla([rod, 1], [h.dir(B, P[piernaMueve].rf, 3, signo), 37]);
    return P;
  }
};

EJERCICIO_POSES.bird_dog = {
  camara: { yaw: 30, elev: 12 }, angulo: "cadera", ritmo: "alterno",
  musculos: { p: ["lumbar", "gluteos"], s: ["abdomen", "deltoide_ant"] },
  pose: function (s, h, lado) {
    // A cuatro patas; con lado "D" se estiran el brazo derecho (al frente) y la pierna izquierda (atrás).
    var P = { pelvis: [-2, 42, 0], giro: { pitch: 77.6 }, tronco: {}, cabeza: { flex: -8 } };
    var der = lado === "D";
    var brazoMueve = der ? "brazoD" : "brazoI";
    P[der ? "brazoI" : "brazoD"] = { f: 102, s: 2 };
    P[brazoMueve] = { f: 102 + 78 * s, s: 2 };
    P[der ? "piernaD" : "piernaI"] = { f: 90, s: 2, rf: 0, pie: 40 };
    P[der ? "piernaI" : "piernaD"] = { f: 90 - 90 * s, s: 2, rf: 0, pie: 40 - 20 * s };
    P.clave = h.agarre(P.pelvis, P.giro, P.tronco, lado, P[brazoMueve]);
    return P;
  }
};

EJERCICIO_POSES.crunch_polea = {
  camara: { yaw: 28, elev: 8 }, angulo: "cadera",
  musculos: { p: ["abdomen"], s: ["oblicuos"] },
  pose: function (s, h) {
    var pelvis = [0, 42, 0];
    var flex = 22 + 58 * s;
    var P = { pelvis: pelvis, giro: {}, tronco: { flex: flex }, cabeza: { flex: 12 + 10 * s } };
    P.piernaD = { f: -4, s: 4, rf: -90, pie: 50 };
    P.piernaI = { f: -4, s: 4, rf: -90, pie: 50 };
    var sien = h.enTronco(pelvis, P.giro, P.tronco, 9, 51, 7);
    _pManos(P, sien, [0.5, -1, 0.5]);
    var nudo = h.enTronco(pelvis, P.giro, P.tronco, 14, 60, 0);
    P.props = _pProps(_pPolea([52, 192, 0], 196), [
      _pCable([52, 192, 0], nudo),
      { tipo: "barra", a: nudo, b: sien, ancho: 2.6, clase: "anim__cuerda" },
      { tipo: "barra", a: nudo, b: [sien[0], sien[1], -sien[2]], ancho: 2.6, clase: "anim__cuerda" }
    ]);
    P.clave = h.hombro(pelvis, P.giro, P.tronco, 1);
    return P;
  }
};

EJERCICIO_POSES.pallof_press = {
  camara: { yaw: 30, elev: 10 }, angulo: "codo",
  musculos: { p: ["oblicuos", "abdomen"], s: ["deltoide_ant"] },
  pose: function (s, h) {
    var P = _pDePie([0, 78, 0], 0);
    P.piernaD = { tobillo: [1, 6, 15], pieDir: [1, 0, 0.12], polo: [1, 0, 0.3] };
    P.piernaI = { tobillo: [1, 6, -15], pieDir: [1, 0, -0.12], polo: [1, 0, -0.3] };
    var mano = [10 + 38 * s, 108, 0];
    P.brazoD = { mano: [mano[0], mano[1], 1.5], polo: [-0.4, -1, 0.5] };
    P.brazoI = { mano: [mano[0], mano[1], -1.5], polo: [-0.4, -1, -0.5] };
    P.props = _pProps(_pPolea([10, 108, -66], 180), [_pCable([10, 108, -66], mano)]);
    P.clave = mano;
    return P;
  }
};

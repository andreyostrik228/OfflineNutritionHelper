/**
 * tests/expiry.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Caducidad de despensa (2026-08-25). Cubre las tres cosas que pueden
 * romperse en silencio:
 *   1. que una fecha ESTIMADA nunca se confunda con una real (`source`),
 *   2. que los campos de caducidad sobrevivan a comprar/cocinar -- los 7
 *      sitios que reescriben stock construyen la entrada de cero,
 *   3. que el término de urgencia sea un empujón y no una restricción, y
 *      que valga exactamente 0 sin datos de caducidad (los golden-master
 *      del generador dependen de eso).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/shelf-life.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/expiry.js")
  ]);
}

/** Sandbox con la cadena de coste completa, para probar que la despensa
 *  proyectada llega de verdad al presupuesto. */
function costSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/shelf-life.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/expiry.js"),
    projPath("js/core/pantry.js"),
    projPath("js/core/budget.js")
  ]);
}

/**
 * Sandbox con datos REALES de tienda inyectados.
 *
 * No se usa loadBrowserGlobals() porque solo acepta rutas y crea su propio
 * contexto: aquí hace falta sembrar PRODUCT_STORAGE ANTES de cargar
 * expiry.js, para probar la rama de datos de tienda sin depender del
 * product-storage.js real (que cambia cada vez que se regenera).
 */
function sandboxWithStore(storeData) {
  var fs = require("fs");
  var vm = require("vm");
  var s = {};
  vm.createContext(s);
  s.PRODUCT_STORAGE = storeData;
  [
    "js/core/utils.js",
    "js/data/shelf-life.js",
    "js/core/pricing.js",
    "js/core/expiry.js"
  ].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(projPath(rel), "utf8"), s, { filename: rel });
  });
  return s;
}

function run(t) {

  // ── Aritmética de fechas ───────────────────────────────────────────

  t.test("daysBetween cuenta por dia natural LOCAL, no por instante", function () {
    var s = sandbox();
    assert.strictEqual(s.daysBetween("2026-08-25", "2026-08-27"), 2);
    assert.strictEqual(s.daysBetween("2026-08-25", "2026-08-25"), 0);
    assert.strictEqual(s.daysBetween("2026-08-27", "2026-08-25"), -2);

    // Dos instantes del MISMO dia local son 0 dias, por lejos que esten
    // en horas. Se compara el dia local a proposito: quien pregunta "¿esto
    // caduca hoy?" lo pregunta en su huso, no en UTC. Construido con
    // fechas locales en vez de literales con Z para que el test no dependa
    // del huso de la maquina que lo ejecuta -- una version anterior de
    // este test asumia UTC y solo pasaba fuera de +02:00.
    var manana = new Date(2026, 7, 26, 1, 0, 0);
    var noche = new Date(2026, 7, 26, 23, 0, 0);
    assert.strictEqual(s.daysBetween(manana.toISOString(), noche.toISOString()), 0);
  });

  t.test("daysBetween devuelve null ante basura en vez de NaN", function () {
    var s = sandbox();
    assert.strictEqual(s.daysBetween("no-es-fecha", "2026-08-25"), null);
    assert.strictEqual(s.daysBetween(null, "2026-08-25"), null);
  });

  t.test("expiryTier clasifica los cuatro tramos", function () {
    var s = sandbox();
    assert.strictEqual(s.expiryTier(-1), "caducado");
    assert.strictEqual(s.expiryTier(0), "urgente");
    assert.strictEqual(s.expiryTier(2), "urgente");
    assert.strictEqual(s.expiryTier(3), "pronto");
    assert.strictEqual(s.expiryTier(5), "pronto");
    assert.strictEqual(s.expiryTier(6), "ok");
    assert.strictEqual(s.expiryTier(null), "desconocido");
  });

  // ── Origen de la fecha: lo que nunca se debe confundir ─────────────

  t.test("una fecha puesta a mano se marca source:'user'", function () {
    var s = sandbox();
    var r = s.resolveExpiry({ grams: 100, expiresAt: "2026-08-27" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.source, "user");
    assert.strictEqual(r.daysLeft, 2);
    assert.strictEqual(r.tier, "urgente");
  });

  t.test("sin fecha pero con acquiredAt se ESTIMA, y se marca como estimada", function () {
    var s = sandbox();
    // zanahoria: nevera, 28 dias -> comprada el 01 caduca (estimado) el 29,
    // que el dia 25 son 4 dias -> "pronto", no "ok" (el umbral de "pronto"
    // es <=5).
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-01" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.source, "estimated");
    assert.strictEqual(r.date, "2026-08-29");
    assert.strictEqual(r.daysLeft, 4);
    assert.strictEqual(r.tier, "pronto");

    // Recien comprada, la misma zanahoria esta holgadamente "ok".
    var fresca = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-25" }, "zanahoria", "2026-08-25");
    assert.strictEqual(fresca.tier, "ok");
    assert.strictEqual(fresca.daysLeft, 28);
  });

  t.test("la fecha del usuario GANA sobre la estimacion, nunca al reves", function () {
    var s = sandbox();
    var r = s.resolveExpiry(
      { grams: 100, acquiredAt: "2026-08-01", expiresAt: "2026-08-26" },
      "zanahoria",
      "2026-08-25"
    );
    assert.strictEqual(r.source, "user");
    assert.strictEqual(r.date, "2026-08-26");
  });

  t.test("sin fecha ni estimacion posible NO se inventa nada", function () {
    var s = sandbox();
    var r = s.resolveExpiry({ grams: 100 }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.source, "unknown");
    assert.strictEqual(r.date, null);
    assert.strictEqual(r.tier, "desconocido");
  });

  t.test("un ingrediente sin entrada en shelf-life queda 'unknown', no a 0 dias", function () {
    var s = sandbox();
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-01" }, "ingrediente inventado", "2026-08-25");
    assert.strictEqual(r.source, "unknown");
    assert.strictEqual(r.date, null);
  });

  // ── Datos REALES de tienda (product-storage.js) ───────────────────

  t.test("los días publicados por la TIENDA ganan a la estimación, y se marcan source:'store'", function () {
    var s = sandboxWithStore({ "10005": { storage: "nevera", daysAfterOpening: 3 } });
    // zanahoria estimaría 28 días; la tienda dice 3 para este producto
    var r = s.resolveExpiry({ quantity: 1, acquiredAt: "2026-08-25", productId: "10005" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.source, "store");
    assert.strictEqual(r.daysLeft, 3);
    assert.strictEqual(r.date, "2026-08-28");
  });

  t.test("una fecha del usuario sigue ganando incluso a los datos de la tienda", function () {
    var s = sandboxWithStore({ "10005": { storage: "nevera", daysAfterOpening: 3 } });
    var r = s.resolveExpiry(
      { quantity: 1, acquiredAt: "2026-08-25", productId: "10005", expiresAt: "2026-08-26" },
      "zanahoria",
      "2026-08-25"
    );
    assert.strictEqual(r.source, "user");
    assert.strictEqual(r.daysLeft, 1);
  });

  t.test("un producto SIN datos de tienda cae en la estimación, no en 'unknown'", function () {
    var s = sandboxWithStore({ "99999": { storage: "nevera", daysAfterOpening: 3 } });
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-25" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.source, "estimated");
    assert.strictEqual(r.daysLeft, 28);
  });

  t.test("sin product-storage.js cargado todo sigue funcionando con estimaciones", function () {
    var s = sandbox(); // PRODUCT_STORAGE no existe en este sandbox
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-25" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.source, "estimated");
  });

  t.test("la tienda aporta el sitio de conservación cuando la entrada no lo trae", function () {
    var s = sandboxWithStore({ "10005": { storage: "congelador", daysAfterOpening: 2 } });
    var r = s.resolveExpiry({ quantity: 1, acquiredAt: "2026-08-25", productId: "10005" }, "x", "2026-08-25");
    assert.strictEqual(r.storage, "congelador");
  });

  // ── Almacenamiento ────────────────────────────────────────────────

  t.test("cambiar de sitio cambia la estimacion (congelador la alarga)", function () {
    var s = sandbox();
    var nevera = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-25" }, "salmon", "2026-08-25");
    var congelado = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-25", storage: "congelador" }, "salmon", "2026-08-25");
    assert.strictEqual(nevera.daysLeft, 2);
    assert.ok(congelado.daysLeft >= 180, "congelado deberia durar mucho mas, dio " + congelado.daysLeft);
  });

  // ── Puntuacion: empujon, no restriccion ───────────────────────────

  t.test("sin datos de caducidad la urgencia es EXACTAMENTE 0 (golden-masters intactos)", function () {
    var s = sandbox();
    var items = [{ name: "Zanahoria", g: 100 }, { name: "Pollo", g: 150 }];
    var pantry = { zanahoria: { grams: 200 }, pollo: { grams: 300 } };
    assert.strictEqual(s.dishExpiryUrgency(items, pantry, "2026-08-25"), 0);
  });

  t.test("despensa vacia o plato sin items da 0, nunca lanza", function () {
    var s = sandbox();
    assert.strictEqual(s.dishExpiryUrgency([], {}, "2026-08-25"), 0);
    assert.strictEqual(s.dishExpiryUrgency(null, {}, "2026-08-25"), 0);
    assert.strictEqual(s.dishExpiryUrgency([{ name: "Zanahoria" }], null, "2026-08-25"), 0);
  });

  t.test("un ingrediente urgente en despensa sube la urgencia del plato", function () {
    var s = sandbox();
    var items = [{ name: "Zanahoria", g: 100 }, { name: "Arroz blanco cocido", g: 150 }];
    var pantry = { zanahoria: { grams: 200, expiresAt: "2026-08-26" } };
    var score = s.dishExpiryUrgency(items, pantry, "2026-08-25");
    assert.ok(score > 0, "deberia ser > 0, dio " + score);
    assert.ok(score <= 1, "debe estar acotado a 1, dio " + score);
  });

  t.test("lo caducado vale 0 SEA CUAL SEA el peso del empujon", function () {
    var s = sandbox();
    // Guardia de seguridad, no de rendimiento. El peso subio de 60 a 2500
    // el 2026-08-26 tras medir que a 60 era inerte; esta prueba fija que
    // subirlo NO puede empujar a nadie hacia comida en mal estado, porque
    // el termino es 0 antes de multiplicarse por nada.
    var items = [{ name: "Zanahoria", g: 100 }];
    var caducada = { zanahoria: { grams: 200, expiresAt: "2026-08-01" } };
    var urgencia = s.dishExpiryUrgency(items, caducada, "2026-08-26");

    assert.strictEqual(urgencia, 0, "un ingrediente caducado no puede sumar urgencia");
    // 0 x cualquier peso sigue siendo 0: la propiedad se mantiene sola.
    [60, 2500, 9000, 1e6].forEach(function (peso) {
      assert.strictEqual(urgencia * peso, 0, "con peso " + peso + " deberia seguir siendo 0");
    });
  });

  t.test("lo CADUCADO no puntua -- no se empuja a comer comida en mal estado", function () {
    var s = sandbox();
    var items = [{ name: "Zanahoria", g: 100 }];
    var caducado = { zanahoria: { grams: 200, expiresAt: "2026-08-20" } };
    var urgente = { zanahoria: { grams: 200, expiresAt: "2026-08-26" } };
    assert.strictEqual(s.dishExpiryUrgency(items, caducado, "2026-08-25"), 0);
    assert.ok(s.dishExpiryUrgency(items, urgente, "2026-08-25") > 0);
  });

  t.test("'urgente' pesa mas que 'pronto'", function () {
    var s = sandbox();
    var items = [{ name: "Zanahoria", g: 100 }];
    var urgente = s.dishExpiryUrgency(items, { zanahoria: { grams: 200, expiresAt: "2026-08-26" } }, "2026-08-25");
    var pronto = s.dishExpiryUrgency(items, { zanahoria: { grams: 200, expiresAt: "2026-08-29" } }, "2026-08-25");
    assert.ok(urgente > pronto, "urgente(" + urgente + ") deberia superar a pronto(" + pronto + ")");
  });

  // ── Listado para la UI ────────────────────────────────────────────

  t.test("listExpiringEntries omite lo que esta 'ok' y lo desconocido, y ordena por urgencia", function () {
    var s = sandbox();
    var pantry = {
      zanahoria: { grams: 100, displayName: "Zanahoria", expiresAt: "2026-08-29" },
      salmon: { grams: 100, displayName: "Salmón", expiresAt: "2026-08-26" },
      miel: { grams: 100, displayName: "Miel", expiresAt: "2027-01-01" },
      avena: { grams: 100, displayName: "Avena" }
    };
    var out = JSON.parse(JSON.stringify(s.listExpiringEntries(pantry, "2026-08-25")));
    assert.strictEqual(out.length, 2, "solo salmon y zanahoria");
    assert.strictEqual(out[0].name, "Salmón");
    assert.strictEqual(out[1].name, "Zanahoria");
  });


  // ── Ventana de frescura para perecederos (2026-08-25) ──────────────
  // "Caduca en 2 días" es la señal equivocada para un plátano: se quiere
  // gastar el día 2 de 5, no el día 4. Pasada la MITAD de su vida útil un
  // perecedero entra en el tramo "pasado".

  t.test("perecedero pasada la mitad de su vida util -> 'pasado'", function () {
    var s = sandbox();
    // Zanahoria: 28 días de vida, comprada hace 15 -> quedan 13.
    // 13 días es holgado en absoluto ("ok"), pero ya pasó la mitad.
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-10" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.daysLeft, 13, "quedan 13 dias");
    assert.strictEqual(r.totalDays, 28);
    assert.strictEqual(r.tier, "pasado");
  });

  t.test("perecedero DENTRO de la primera mitad sigue 'ok'", function () {
    var s = sandbox();
    // Comprada hace 5 de 28 días: bien dentro de la ventana fresca.
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-20" }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.tier, "ok");
  });

  t.test("NO perecedero pasada la mitad NO cambia de tramo", function () {
    var s = sandbox();
    // Batata: 30 días, comprada hace 16 -> quedan 14, media vida pasada.
    // No es perecedero, así que se queda "ok": una lata de atún al mes 12
    // de 24 no debe parecer urgente.
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-09" }, "batata", "2026-08-25");
    assert.strictEqual(r.daysLeft, 14);
    assert.strictEqual(s.isPerishable("batata"), false, "fixture debe ser NO perecedero");
    assert.strictEqual(r.tier, "ok");
  });

  t.test("'pasado' nunca pisa un tramo absoluto mas urgente", function () {
    var s = sandbox();
    // Plátano: 5 días, comprado hace 4 -> queda 1. Ha pasado la media vida
    // Y ADEMÁS queda 1 día: manda el tramo absoluto, que es más urgente.
    var r = s.resolveExpiry({ grams: 100, acquiredAt: "2026-08-21" }, "platano", "2026-08-25");
    assert.strictEqual(r.daysLeft, 1);
    assert.strictEqual(r.tier, "urgente", "1 dia manda sobre la media vida");
  });

  t.test("applyFreshnessWindow solo asciende desde 'ok'", function () {
    var s = sandbox();
    // Nunca debilita un aviso ya emitido, sea cual sea el solape.
    assert.strictEqual(s.applyFreshnessWindow("caducado", -1, 28, "zanahoria"), "caducado");
    assert.strictEqual(s.applyFreshnessWindow("urgente", 1, 28, "zanahoria"), "urgente");
    assert.strictEqual(s.applyFreshnessWindow("pronto", 4, 28, "zanahoria"), "pronto");
    assert.strictEqual(s.applyFreshnessWindow("desconocido", null, 28, "zanahoria"), "desconocido");
  });

  t.test("sin acquiredAt la ventana de frescura no aplica y la urgencia sigue siendo 0", function () {
    var s = sandbox();
    // Los golden-master del generador dependen de que sin datos de
    // caducidad el termino valga EXACTAMENTE 0.
    var r = s.resolveExpiry({ grams: 100 }, "zanahoria", "2026-08-25");
    assert.strictEqual(r.tier, "desconocido");
    assert.strictEqual(r.totalDays, null);
    var urgency = s.dishExpiryUrgency(
      [{ name: "Zanahoria" }],
      { zanahoria: { grams: 100 } },
      "2026-08-25"
    );
    assert.strictEqual(urgency, 0, "sin caducidad el empujon es exactamente 0");
  });

  t.test("una fecha del USUARIO tambien respeta la ventana si se sabe cuando se compro", function () {
    var s = sandbox();
    // Fecha real del envase + fecha de compra -> vida total conocida.
    var r = s.resolveExpiry(
      { grams: 100, acquiredAt: "2026-08-05", expiresAt: "2026-09-04" },
      "zanahoria",
      "2026-08-25"
    );
    assert.strictEqual(r.source, "user", "la fecha del usuario sigue mandando");
    assert.strictEqual(r.totalDays, 30);
    assert.strictEqual(r.tier, "pasado", "20 de 30 dias consumidos");

    // Sin acquiredAt no hay vida total que calcular -> no se inventa.
    var sinCompra = s.resolveExpiry({ grams: 100, expiresAt: "2026-09-04" }, "zanahoria", "2026-08-25");
    assert.strictEqual(sinCompra.totalDays, null);
    assert.strictEqual(sinCompra.tier, "ok");
  });

  t.test("el peso de 'pasado' queda entre 'pronto' y 'ok', y caducado sigue en 0", function () {
    var s = sandbox();
    var w = s.EXPIRY_TIER_WEIGHT;
    assert.ok(w.pasado < w.pronto, "menos urgente que pronto");
    assert.ok(w.pasado > w.ok, "mas que ok");
    assert.strictEqual(w.caducado, 0, "nunca empujar a comer caducado");
  });


  // ── Despensa proyectada a una fecha (2026-08-25) ───────────────────
  // Nace de un bug REAL: el stock caducado descontaba del coste de
  // compra. Ver projectPantryState() para la medición.

  t.test("REGRESION: las zanahorias caducadas en ENERO ya no cubren la compra", function () {
    var s = costSandbox();
    var meals = [{ items: [{ name: "Zanahoria", grams: 300 }] }];
    var caducadas = {
      zanahoria: {
        grams: 500, displayName: "Zanahoria",
        acquiredAt: "2026-01-01", expiresAt: "2026-01-15"
      }
    };

    // Lo que hacía ANTES (estado crudo): el stock caducado cubría todo.
    var crudo = s.computeDayPurchaseCost(meals, "mercadona", caducadas).purchaseCost;
    assert.strictEqual(crudo, 0, "documenta el comportamiento ROTO que motivó esto");

    // Lo que hace AHORA: proyectado, hay que comprarlas.
    var proyectado = s.computeDayPurchaseCost(
      meals, "mercadona", s.projectPantryState(caducadas, "2026-08-25")
    ).purchaseCost;
    assert.ok(proyectado > 0, "el stock caducado NO puede cubrir nada");

    // Antes esto era `strictEqual(proyectado, 1.7)`, es decir, el precio de
    // la zanahoria escrito a mano. Se rompía cada vez que se refrescaba el
    // catálogo (0,17 -> 0,12 el 2026-09-01) sin que hubiera ningún fallo:
    // ruido puro. Lo que de verdad afirma esta regresión es que el stock
    // caducado se comporta EXACTAMENTE igual que no tener nada, y eso se
    // puede comprobar sin nombrar ningún precio.
    var sinDespensa = s.computeDayPurchaseCost(meals, "mercadona", {}).purchaseCost;
    assert.strictEqual(proyectado, sinDespensa,
      "caducado == despensa vacía: se paga la compra entera");
  });

  t.test("el stock fresco SIGUE descontando del coste", function () {
    var s = costSandbox();
    var meals = [{ items: [{ name: "Zanahoria", grams: 300 }] }];
    var fresco = { zanahoria: { grams: 500, displayName: "Zanahoria", acquiredAt: "2026-08-24" } };
    var cost = s.computeDayPurchaseCost(
      meals, "mercadona", s.projectPantryState(fresco, "2026-08-25")
    ).purchaseCost;
    assert.strictEqual(cost, 0, "lo fresco sigue cubriendo");
  });

  t.test("stock SIN datos de caducidad se conserva -- nunca se tira lo que no se puede probar", function () {
    var s = costSandbox();
    var meals = [{ items: [{ name: "Zanahoria", grams: 300 }] }];
    // Sin acquiredAt ni expiresAt no hay forma de saber su edad. Tirarlo
    // seria el fallo espejo del bug: descartar lo que no sabemos.
    var desconocido = { zanahoria: { grams: 500, displayName: "Zanahoria" } };
    var projected = s.projectPantryState(desconocido, "2026-08-25");
    assert.ok(projected.zanahoria, "la entrada sigue ahi");
    assert.strictEqual(
      s.computeDayPurchaseCost(meals, "mercadona", projected).purchaseCost, 0
    );
  });

  t.test("planificar un dia FUTURO no cuenta lo que para entonces habra caducado", function () {
    var s = costSandbox();
    var meals = [{ items: [{ name: "Leche entera", grams: 500 }] }];
    var leche = {
      "leche entera": {
        grams: 1000, displayName: "Leche entera",
        acquiredAt: "2026-08-25", expiresAt: "2026-08-28"
      }
    };
    var cerca = s.computeDayPurchaseCost(
      meals, "mercadona", s.projectPantryState(leche, "2026-08-26")
    ).purchaseCost;
    var lejos = s.computeDayPurchaseCost(
      meals, "mercadona", s.projectPantryState(leche, "2026-08-30")
    ).purchaseCost;

    assert.strictEqual(cerca, 0, "el 26 la leche aun sirve");
    assert.ok(lejos > 0, "el 30 ya habra caducado: hay que comprarla");
  });

  t.test("una despensa SIN datos de caducidad se proyecta identica (protege los golden-master)", function () {
    var s = sandbox();
    // Los fixtures de los golden-master son anteriores a los campos de
    // caducidad, asi que resuelven a "desconocido" y deben pasar intactos.
    var sinDatos = {
      zanahoria: { grams: 500, displayName: "Zanahoria" },
      avena: { grams: 300, displayName: "Avena" },
      salmon: { grams: 200, displayName: "Salmón" }
    };
    var projected = s.projectPantryState(sinDatos, "2026-08-25");
    assert.deepStrictEqual(
      Object.keys(projected).sort(), Object.keys(sinDatos).sort(),
      "no se pierde ninguna entrada"
    );
    Object.keys(sinDatos).forEach(function (k) {
      assert.strictEqual(projected[k], sinDatos[k], "misma entrada, sin copiar ni alterar");
    });
  });

  t.test("projectPantryState no muta la despensa original", function () {
    var s = sandbox();
    var original = {
      zanahoria: { grams: 500, displayName: "Zanahoria", acquiredAt: "2026-01-01", expiresAt: "2026-01-15" }
    };
    var antes = Object.keys(original).length;
    s.projectPantryState(original, "2026-08-25");
    assert.strictEqual(Object.keys(original).length, antes, "la original se queda igual");
    assert.ok(original.zanahoria, "no se borra de la original");
  });

  t.test("projectPantryState degrada con seguridad ante entradas basura", function () {
    var s = sandbox();
    assert.strictEqual(s.projectPantryState(null, "2026-08-25"), null);
    assert.strictEqual(s.projectPantryState(undefined, "2026-08-25"), undefined);
    // Comparado por claves, no con deepStrictEqual: el objeto viene del
    // sandbox vm y su prototipo es de OTRO realm, asi que deepStrictEqual
    // falla por prototipo aunque el contenido sea idéntico.
    var vacio = s.projectPantryState({}, "2026-08-25");
    assert.strictEqual(typeof vacio, "object");
    assert.strictEqual(Object.keys(vacio).length, 0);
  });

  // ── Envase abierto (2026-09-04) ────────────────────────────────────
  // Abrir reinicia el reloj. La app lo marca sola al cocinar; el usuario
  // no tiene que tocar nada.

  t.test("abrir un envase acorta la vida de un perecedero", function () {
    var s = sandbox();
    var cerrado = { grams: 300, acquiredAt: "2026-09-01" };
    var abierto = { grams: 300, acquiredAt: "2026-09-01", openedAt: "2026-09-03" };

    var a = s.resolveExpiry(cerrado, "zanahoria", "2026-09-04");
    var b = s.resolveExpiry(abierto, "zanahoria", "2026-09-04");

    // Zanahoria: 28 d cerrada. Recien comprada no corre ninguna prisa.
    assert.strictEqual(a.tier, "ok");
    assert.strictEqual(a.daysLeft, 25);
    // Abierta ayer: quedan 2 dias y pasa a ser lo primero que gastar.
    assert.strictEqual(b.tier, "urgente");
    assert.strictEqual(b.daysLeft, 2);
    assert.strictEqual(b.date, "2026-09-06");
  });

  t.test("abrir un envase NUNCA alarga la vida", function () {
    var s = sandbox();
    // Leche: 5 d. Comprada el 1 caducaba el 6; abrirla el 4 daria hasta el
    // 7. Manda la fecha corta -- abrir algo no puede volverlo mas fresco.
    var e = { grams: 500, acquiredAt: "2026-09-01", openedAt: "2026-09-04" };
    var r = s.resolveExpiry(e, "leche semidesnatada", "2026-09-04");
    assert.strictEqual(r.date, "2026-09-06");
    assert.strictEqual(r.daysLeft, 2);
    // totalDays delata que la rama de "abierto" SI corrio y luego recorto:
    // sin ella el total seria la vida cerrada (5 d), no la ventana de
    // abierto (3 d). Sin esta comprobacion el test pasaria igual SIN la
    // funcion, que es exactamente lo que no queremos de un test.
    assert.strictEqual(r.totalDays, 3);
  });

  t.test("abrir no toca lo que no se degrada progresivamente", function () {
    var s = sandbox();
    var e = { grams: 500, acquiredAt: "2026-09-01", openedAt: "2026-09-03" };
    var r = s.resolveExpiry(e, "miel", "2026-09-04");
    // La miel no esta en PERISHABLE_KEYS: sigue contando desde la compra.
    assert.strictEqual(r.source, "estimated");
    assert.ok(r.daysLeft > 1000, "un bote de miel abierto no es una urgencia");
  });

  t.test("una fecha del envase sigue ganando a un envase abierto", function () {
    var s = sandbox();
    var e = { grams: 300, acquiredAt: "2026-09-01", openedAt: "2026-09-03", expiresAt: "2026-09-20" };
    var r = s.resolveExpiry(e, "zanahoria", "2026-09-04");
    assert.strictEqual(r.source, "user");
    assert.strictEqual(r.date, "2026-09-20");
  });

  t.test("sin openedAt la caducidad se resuelve exactamente como antes", function () {
    var s = sandbox();
    var a = s.resolveExpiry({ grams: 300, acquiredAt: "2026-09-01" }, "zanahoria", "2026-09-04");
    var b = s.resolveExpiry({ grams: 300, acquiredAt: "2026-09-01", openedAt: null }, "zanahoria", "2026-09-04");
    assert.strictEqual(a.source, "estimated");
    assert.strictEqual(a.date, b.date);
    assert.strictEqual(a.tier, b.tier);
    assert.strictEqual(a.daysLeft, b.daysLeft);
  });

}

module.exports = { run: run };

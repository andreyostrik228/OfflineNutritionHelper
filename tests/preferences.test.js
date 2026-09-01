/**
 * tests/preferences.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * "No me gusta" — PREFERENCIA BLANDA (2026-08-26).
 *
 * Lo que estos tests protegen, por orden de importancia:
 *   1. que una lista vacía no cambie NADA (los golden-master del generador
 *      dependen de que el pool de candidatos sea idéntico sin preferencias),
 *   2. que se filtre, no se puntúe -- una preferencia se respeta, no se
 *      pondera,
 *   3. que esto NO se convierta nunca en el camino de alergias: son
 *      restricciones de naturaleza opuesta y viven aparte a propósito.
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
    projPath("js/data/dishes.js"),
    projPath("js/data/dish-instructions.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/core/pricing.js"),
    projPath("js/data/dislike-groups.js"),
    projPath("js/core/preferences.js"),
    projPath("js/engine/no-cook-generator.js"),
    projPath("js/data/dish-cuisine.js"),
    projPath("js/ui/ingredient-suggest.js")
  ]);
}

function settingsSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/core/settings.js")
  ]);
}

function run(t) {

  // ── Coincidencia ──────────────────────────────────────────────────

  t.test("matchesDislike casa por subcadena, sin acentos y sin mayusculas", function () {
    var s = sandbox();
    // El usuario escribe "cebolla" y espera tapar todas sus formas.
    assert.strictEqual(s.matchesDislike("Crema de cebolla", ["cebolla"]), true);
    assert.strictEqual(s.matchesDislike("Aros de Cebolla", ["CEBOLLA"]), true);
    assert.strictEqual(s.matchesDislike("Plátano de Canarias", ["platano"]), true, "sin acento debe casar");
    assert.strictEqual(s.matchesDislike("Yogur natural", ["cebolla"]), false);
  });

  t.test("matchesDislike ignora entradas vacias o basura de la lista", function () {
    var s = sandbox();
    assert.strictEqual(s.matchesDislike("Yogur", ["", "   ", null, 42]), false);
    assert.strictEqual(s.matchesDislike("", ["yogur"]), false);
    assert.strictEqual(s.matchesDislike("Yogur", null), false);
  });

  // ── El invariante que protege los golden-master ───────────────────

  t.test("lista VACIA no quita nada -- ni productos ni platos", function () {
    var s = sandbox();
    var pool = s.getNoCookEligiblePool();
    assert.strictEqual(s.filterDislikedProducts(pool, []).length, pool.length);
    assert.strictEqual(s.filterDislikedProducts(pool, null).length, pool.length);
    // Sin lista, el filtro es literalmente el mismo array.
    assert.strictEqual(s.filterDislikedProducts(pool, []), pool, "sin lista devuelve el mismo pool, sin copiar");
  });

  // ── Filtrado real ─────────────────────────────────────────────────

  t.test("filterDislikedProducts acepta las DOS formas de entrada", function () {
    var s = sandbox();
    // catálogo: {name}. Pool de "sin cocinar": {product:{name}}.
    var pelado = [{ name: "Crema de cebolla" }, { name: "Yogur natural" }];
    var envuelto = [{ product: { name: "Crema de cebolla" } }, { product: { name: "Yogur natural" } }];
    assert.strictEqual(s.filterDislikedProducts(pelado, ["cebolla"]).length, 1);
    assert.strictEqual(s.filterDislikedProducts(envuelto, ["cebolla"]).length, 1);
  });

  t.test("filtrar no muta el pool original", function () {
    var s = sandbox();
    var pool = s.getNoCookEligiblePool();
    var antes = pool.length;
    s.filterDislikedProducts(pool, ["queso"]);
    assert.strictEqual(pool.length, antes, "el pool original se queda igual");
  });

  t.test("un ingrediente no deseado descarta el PLATO entero", function () {
    var s = sandbox();
    // "Tomate" es un rol real de dishes.js.
    var conTomate = s.DISH_DB.filter(function (d) {
      return (d.items || []).some(function (i) { return s.matchesDislike(i.name, ["tomate"]); });
    });
    assert.ok(conTomate.length > 0, "fixture: debe haber platos con tomate");
    // Y ninguno de ellos debe sobrevivir al filtro.
    conTomate.forEach(function (d) {
      var sobrevive = !(d.items || []).some(function (i) { return s.matchesDislike(i.name, ["tomate"]); });
      assert.strictEqual(sobrevive, false);
    });
  });

  // ── Límite honesto de cobertura ───────────────────────────────────

  t.test("LIMITACION CONOCIDA: el filtro de dislikes trabaja sobre el NOMBRE del plato, no sobre items[]", function () {
    var s = sandbox();
    var roles = {};
    s.DISH_DB.forEach(function (d) {
      (d.items || []).forEach(function (i) { roles[i.name.toLowerCase()] = true; });
    });
    // Desde 2026-08-31 (T4) cebolla y ajo SÍ existen como rol: los platos
    // españoles nuevos los usan. Pero matchesDislike() compara contra el
    // NOMBRE del plato, no contra sus ingredientes -- escribir "cebolla" en
    // "no me gusta" NO filtra un "Pisto con huevo", porque su nombre no
    // lleva "cebolla". Es una limitación de ALCANCE del filtro, no del
    // matching, y se documenta aquí para que nadie la "arregle" creyendo
    // que el matching falla.
    assert.strictEqual(roles["cebolla"], true, "T4 añadió platos con rol de cebolla");
    assert.strictEqual(roles["ajo"], true, "T4 añadió platos con rol de ajo");
    var pisto = s.DISH_DB.find(function (d) { return d.name === "Pisto con huevo"; });
    assert.ok(pisto && pisto.items.some(function (i) { return i.name.toLowerCase() === "cebolla"; }));
    assert.strictEqual(s.matchesDislike(pisto.name, ["cebolla"]), false, "el filtro por nombre no ve la cebolla de los items");
    // Los pescados concretos SI son roles (sin cambio).
    var haySalmon = Object.keys(roles).some(function (r) { return r.indexOf("salm") !== -1; });
    assert.strictEqual(haySalmon, true);
  });

  // ── Persistencia ──────────────────────────────────────────────────

  t.test("los settings sanean la lista: recortan, deduplican y descartan basura", function () {
    var s = settingsSandbox();
    s.saveSettings({ dislikes: ["  Cebolla  ", "cebolla", "CEBOLLA", "", null, 7, "Queso"] });
    var out = s.getSettings().dislikes;
    // Comparado elemento a elemento, no con deepStrictEqual: el array viene
    // del sandbox vm y su prototipo es de OTRO realm, asi que
    // deepStrictEqual falla por prototipo aunque el contenido sea igual.
    assert.strictEqual(out.length, 2, "recortado y deduplicado sin distinguir mayusculas");
    assert.strictEqual(out[0], "Cebolla");
    assert.strictEqual(out[1], "Queso");
  });

  t.test("una lista corrupta en localStorage no tumba los settings", function () {
    var s = settingsSandbox();
    s.saveSettings({ dislikes: "no soy un array" });
    assert.deepStrictEqual(s.getSettings().dislikes, undefined, "se ignora, no lanza");
  });

  // ── La separación dura/blanda ─────────────────────────────────────

  t.test("dislikes NO comparte campo con las alergias", function () {
    var s = settingsSandbox();
    // Si algun dia alguien fusiona ambas en una lista con flag de
    // severidad, este test cae -- y esa es exactamente su razon de ser.
    assert.ok(s.SETTINGS_LIST_FIELDS.indexOf("dislikes") !== -1);
    assert.strictEqual(
      s.SETTINGS_LIST_FIELDS.indexOf("allergens"), -1,
      "las alergias son una restriccion DURA: no pueden compartir el camino blando de dislikes"
    );
  });


  // ── Pasos / equipo / dificultad (2026-08-26) ──────────────────────
  // Nacen de un fallo real: una usuaria no pudo cocinar con la app. Los
  // platos no son complejos (3 ingredientes, 15 min de mediana) -- lo que
  // faltaba era CÓMO hacerlos.

  t.test("EL INVARIANTE: un plato SIN instrucciones se comporta igual que antes", function () {
    var s = sandbox();
    // Antes esto exigia ademas "mas de 300 platos sin instrucciones", como
    // guardia de que el piloto seguia siendo pequeno. Se ha quitado a
    // proposito el 2026-08-26: la fase 2 existe precisamente para que ese
    // numero BAJE, asi que la asercion se volvia falsa segun avanzaba el
    // trabajo previsto. El invariante de verdad -- el que protegen los
    // golden-master -- nunca fue el recuento, sino que un plato sin
    // instrucciones no cambie de comportamiento. Eso es lo que se prueba.
    var sinInstrucciones = s.DISH_DB.filter(function (d) {
      return !s.getDishInstructions(d.name);
    });
    assert.ok(sinInstrucciones.length > 0, "deberia quedar algun plato sin instrucciones que probar");

    var d = sinInstrucciones[0];
    // Ni el equipo ni la dificultad pueden filtrarlo, digan lo que digan
    // los ajustes del usuario.
    assert.strictEqual(s.canCookWithEquipment(d, []), true);
    assert.strictEqual(s.canCookWithEquipment(d, ["microondas"]), true);
    assert.strictEqual(s.isWithinDifficulty(d, 1), true, "sin dato de dificultad NO se filtra");
  });

  t.test("los platos del piloto declaran equipo y dificultad validos", function () {
    var s = sandbox();
    var vocab = s.EQUIPMENT_TOKENS;
    var conInstrucciones = s.DISH_DB.filter(function (d) { return s.getDishInstructions(d.name); });
    assert.ok(conInstrucciones.length >= 15, "deberia haber instrucciones que validar");

    conInstrucciones.forEach(function (d) {
      var info = s.getDishInstructions(d.name);
      assert.ok(Array.isArray(info.steps) && info.steps.length >= 3, d.name + ": necesita pasos de verdad");
      assert.ok(info.difficulty >= 1 && info.difficulty <= 3, d.name + ": dificultad fuera de rango");
      assert.ok(Array.isArray(info.equipment) && info.equipment.length, d.name + ": sin equipo declarado");
      info.equipment.forEach(function (tok) {
        assert.ok(vocab.indexOf(tok) !== -1, d.name + ": '" + tok + "' no esta en el vocabulario cerrado");
      });
    });
  });

  t.test("TODO plato del catalogo tiene una cocina del vocabulario cerrado", function () {
    var s = sandbox();
    // Cubre los 334, no solo los del piloto: dish-cuisine.js existe
    // precisamente para no depender de que se hayan escrito los pasos.
    s.DISH_DB.forEach(function (d) {
      var c = s.getDishCuisine(d.name);
      assert.ok(
        s.CUISINE_TOKENS.indexOf(c) !== -1,
        d.name + ": cuisine '" + c + "' no esta en " + s.CUISINE_TOKENS.join("/")
      );
    });
  });

  t.test("un plato desconocido es 'neutra', nunca undefined ni un error", function () {
    var s = sandbox();
    // Regla de fallo por defecto: sin dato, el sesgo no toca el plato.
    assert.strictEqual(s.getDishCuisine("Plato que no existe"), "neutra");
    assert.strictEqual(s.getDishCuisine(""), "neutra");
    assert.strictEqual(s.getDishCuisine(null), "neutra");
  });

  t.test("la cocina se decide por IDENTIDAD, no por ingredientes", function () {
    var s = sandbox();
    // La regla que separa este archivo de una lista de ingredientes. Si
    // alguien vuelve a marcar por ingrediente, esto rompe.
    assert.strictEqual(s.getDishCuisine("Skyr con kiwi"), "neutra",
      "el skyr es un producto de super, no hace islandes al plato");
    assert.strictEqual(s.getDishCuisine("Gambas con quinoa y verduras salteadas"), "neutra",
      "las gambas son un ingrediente, no una nacionalidad");
    assert.strictEqual(s.getDishCuisine("Tortilla espanola con ensalada".replace("espanola", "española")), "espanola",
      "esto SI es identidad de plato");
    assert.strictEqual(s.getDishCuisine("Pollo tikka masala con arroz integral"), "internacional");
  });

  t.test("sin preferencia de cocina el sesgo es EXACTAMENTE 0 (golden-masters intactos)", function () {
    var s = sandbox();
    // El defecto no debe cambiar nada para quien no ha pedido nada. Si
    // esto se rompiera, los golden-master del generador se moverian.
    assert.strictEqual(s.getCuisinePreference(), "mixta");
  });

  t.test("la cocina es una PREFERENCIA: no filtra nada por si sola", function () {
    var s = sandbox();
    // Guardia de diseno. Si alguien convierte el sesgo en filtro, estas
    // funciones empezaran a excluir platos por su cocina y esto rompera.
    var espanol = s.DISH_DB.filter(function (d) {
      return s.getDishCuisine(d.name) === "espanola";
    })[0];
    var internacional = s.DISH_DB.filter(function (d) {
      return s.getDishCuisine(d.name) === "internacional";
    })[0];

    assert.ok(espanol && internacional, "el piloto necesita ambas cocinas para esta prueba");
    // Ninguna via de preferencias debe descartar un plato por su cocina.
    assert.strictEqual(s.canCookWithEquipment(internacional, []), true);
    assert.strictEqual(s.isWithinDifficulty(internacional, 0), true);
    assert.strictEqual(s.matchesDislike(internacional.name, []), false);
  });

  t.test("los pasos son para principiantes: llevan cantidades o tiempos concretos", function () {
    var s = sandbox();
    // "Cuece la pasta" es justo la instruccion que fallo. Cada plato que
    // requiere coccion debe decir CUANTO o COMO saber que esta listo.
    var conFuego = ["Porridge de avena con plátano y miel", "Pasta con atún y tomate",
                    "Tortilla francesa con tostadas integrales"];
    conFuego.forEach(function (name) {
      var info = s.getDishInstructions(name);
      assert.ok(info, name + " deberia estar en el piloto");
      var texto = info.steps.join(" ");
      assert.ok(/\d/.test(texto), name + ": sin una sola cifra concreta no sirve a un principiante");
      assert.ok(
        /minuto|segundos|hasta que|cuando/i.test(texto),
        name + ": debe decir cuanto tiempo o como saber que esta listo"
      );
    });
  });

  t.test("'ninguno' nunca se filtra por equipo -- es la respuesta a 'no tengo cacharros'", function () {
    var s = sandbox();
    var sinCacharros = s.DISH_DB.filter(function (d) {
      var i = s.getDishInstructions(d.name);
      return i && i.equipment.length === 1 && i.equipment[0] === "ninguno";
    });
    assert.ok(sinCacharros.length >= 5, "el piloto necesita varios platos sin equipo");
    sinCacharros.forEach(function (d) {
      // Ni siquiera con una lista de equipo que no incluye nada relevante.
      assert.strictEqual(s.canCookWithEquipment(d, ["horno"]), true, d.name);
    });
  });

  t.test("falta UNA sola pieza de equipo y el plato no se puede cocinar", function () {
    var s = sandbox();
    // "Tortilla francesa" necesita sarten Y tostadora.
    var d = s.DISH_DB.find(function (x) { return x.name === "Tortilla francesa con tostadas integrales"; });
    assert.ok(d);
    assert.strictEqual(s.canCookWithEquipment(d, ["sarten", "tostadora"]), true, "con las dos, si");
    assert.strictEqual(s.canCookWithEquipment(d, ["sarten"]), false, "falta la tostadora");
    assert.strictEqual(s.canCookWithEquipment(d, ["tostadora"]), false, "falta la sarten");
  });

  t.test("la dificultad filtra por nivel, y sin limite no filtra nada", function () {
    var s = sandbox();
    var facil = s.DISH_DB.find(function (x) { return x.name === "Almendras y manzana"; });
    var dificil = s.DISH_DB.find(function (x) { return x.name === "Tostadas con aguacate y huevo escalfado"; });
    assert.strictEqual(s.getDishInstructions(dificil.name).difficulty, 3);

    assert.strictEqual(s.isWithinDifficulty(facil, 1), true);
    assert.strictEqual(s.isWithinDifficulty(dificil, 1), false, "avanzado fuera si pides solo facil");
    assert.strictEqual(s.isWithinDifficulty(dificil, 3), true);
    assert.strictEqual(s.isWithinDifficulty(dificil, 0), true, "sin limite configurado no se filtra");
  });

  t.test("sin ajustes de equipo el usuario no pierde platos en silencio", function () {
    var s = sandbox();
    var dificil = s.DISH_DB.find(function (x) { return x.name === "Tostadas con aguacate y huevo escalfado"; });
    // Lista vacia = "no me filtres", no "no tengo nada".
    assert.strictEqual(s.canCookWithEquipment(dificil, []), true);
  });

  // ── Sugerencias del campo "no me gusta" (js/ui/ingredient-suggest.js) ───
  // Solo la LÓGICA pura (trocear el texto y elegir candidatos). El DOM se
  // verifica en el navegador, no aquí.

  // matchDislikeSuggestions devuelve objetos { label, value, kind } desde
  // 2026-09-01 (entrada de grupo). Los tests comparan .value.
  function values(hits) { return hits.map(function (h) { return h.value; }); }

  t.test("sugiere por prefijo: 'lente' -> lentejas (el caso que pidió el usuario)", function () {
    var s = sandbox();
    var hits = s.matchDislikeSuggestions("lente");
    assert.ok(hits.length > 0, "no sugirió nada para 'lente'");
    assert.ok(
      values(hits).some(function (v) { return v.toLowerCase().indexOf("lentejas") !== -1; }),
      "esperaba lentejas entre: " + values(hits).join(", ")
    );
  });

  t.test("las sugerencias son insensibles a acentos, igual que matchesDislike()", function () {
    var s = sandbox();
    // Este es el motivo entero de no usar <datalist> nativo: sin esto,
    // 13 de los 81 ingredientes serían inalcanzables escribiendo sin tilde.
    [["platano", "plátano"], ["brocoli", "brócoli"], ["pina", "piña"],
     ["salmon", "salmón"], ["atun", "atún"], ["jamon", "jamón"]].forEach(function (pair) {
      var hits = s.matchDislikeSuggestions(pair[0]);
      assert.ok(
        values(hits).some(function (v) { return v.toLowerCase().indexOf(pair[1]) !== -1; }),
        "escribir '" + pair[0] + "' debería ofrecer '" + pair[1] + "'; ofreció: " + values(hits).join(", ")
      );
    });
  });

  t.test("sugerir sobre el ÚLTIMO término no toca lo ya escrito", function () {
    var s = sandbox();
    var parts = s.splitDislikesInput("cebolla, queso azul, lente");
    assert.strictEqual(parts.term, "lente");
    assert.strictEqual(parts.prefix, "cebolla, queso azul, ");
    // Reconstruir como hace accept(): lo anterior sobrevive intacto.
    assert.strictEqual(parts.prefix + "Lentejas cocidas" + ", ",
                       "cebolla, queso azul, Lentejas cocidas, ");
  });

  t.test("no vuelve a sugerir algo que ya está en la lista", function () {
    var s = sandbox();
    var all = s.matchDislikeSuggestions("platano");
    assert.ok(all.length > 0);
    var again = s.matchDislikeSuggestions("platano", values(all));
    assert.strictEqual(again.length, 0, "repitió una entrada ya escrita: " + values(again).join(", "));
  });

  t.test("un término vacío no sugiere nada (no se abre la lista al poner una coma)", function () {
    var s = sandbox();
    // .length y no deepStrictEqual([]): los arrays creados dentro del
    // sandbox vm son de otro realm y nunca son reference-equal con un
    // literal del host (mismo motivo documentado en shopping-cost.test.js).
    assert.strictEqual(s.matchDislikeSuggestions("").length, 0);
    assert.strictEqual(s.matchDislikeSuggestions("   ").length, 0);
    assert.strictEqual(s.matchDislikeSuggestions(s.splitDislikesInput("cebolla, ").term).length, 0);
  });

  // ── Grupos de "no me gusta" (js/data/dislike-groups.js) ──────────────

  t.test("escribir 'pescado' ofrece la entrada de grupo la PRIMERA y debajo cada pescado del catálogo", function () {
    var s = sandbox();
    var hits = s.matchDislikeSuggestions("pescado");
    assert.ok(hits.length > 1, "grupo + miembros");
    assert.strictEqual(hits[0].kind, "group");
    assert.strictEqual(hits[0].value, "pescado");
    assert.ok(hits[0].label.indexOf("Todos") === 0, "la etiqueta debe dejar claro que es 'todos': " + hits[0].label);
    // "pescado" no es subcadena de "Merluza", pero Merluza es del grupo:
    // debe aparecer igualmente como ítem debajo del botón.
    var itemValues = hits.slice(1).map(function (h) { return h.value; });
    assert.ok(itemValues.indexOf("Merluza") !== -1, "esperaba Merluza entre: " + itemValues.join(", "));
    assert.ok(itemValues.some(function (v) { return v.indexOf("Atún") === 0; }), "esperaba atún: " + itemValues.join(", "));
    assert.ok(hits.slice(1).every(function (h) { return h.kind === "item"; }));
  });

  t.test("un token de grupo en la lista de dislikes filtra TODOS sus miembros", function () {
    var s = sandbox();
    // "pescado" no es el nombre de ningún ingrediente, pero como grupo debe
    // tapar merluza, atún, salmón, bacalao...
    assert.strictEqual(s.matchesDislike("Merluza a rodajas", ["pescado"]), true);
    assert.strictEqual(s.matchesDislike("Atún claro al natural Hacendado", ["pescado"]), true);
    assert.strictEqual(s.matchesDislike("Filetes de caballa del sur en tomate Hacendado", ["pescado"]), true);
    // "Cola de caballo" (infusión) NO cae en pescado -- stem es "caballa".
    assert.strictEqual(s.matchesDislike("Infusión Cola de caballo Hacendado", ["pescado"]), false);
    // Lo que no es del grupo, no se toca.
    assert.strictEqual(s.matchesDislike("Yogur griego natural", ["pescado"]), false);
  });

  t.test("filterDislikedProducts con 'lácteos' quita leche/yogur/queso y deja el resto", function () {
    var s = sandbox();
    var pool = [
      { name: "Leche semidesnatada Hacendado" },
      { name: "Yogur natural azucarado Hacendado" },
      { name: "Queso rallado Hacendado" },
      { name: "Merluza a rodajas" },
      { name: "Arroz redondo Hacendado" },
    ];
    var kept = s.filterDislikedProducts(pool, ["lácteos"]).map(function (p) { return p.name; });
    assert.deepStrictEqual(kept.sort(), ["Arroz redondo Hacendado", "Merluza a rodajas"]);
  });

  t.test("si el grupo ya está en la lista, no se vuelve a ofrecer", function () {
    var s = sandbox();
    var hits = s.matchDislikeSuggestions("pesc", ["pescado"]);
    assert.ok(hits.every(function (h) { return h.kind !== "group"; }), "el grupo pescado ya estaba escrito");
  });

  t.test("un solo carácter no dispara la entrada de grupo (evita ruido)", function () {
    var s = sandbox();
    var hits = s.matchDislikeSuggestions("p");
    assert.ok(hits.every(function (h) { return h.kind !== "group"; }));
  });


  // ── Eje "que buscas al comer" (2026-09-01) ───────────────────────────
  // Es un eje DISTINTO de `goal`: goal fija cuantas calorias, esto con que
  // se llenan. "Estoy definiendo y voy justo de dinero" tiene que poder
  // decirse, y con un solo desplegable no se podria.

  t.test("getEatingPriority(): por defecto 'balanced' (sin select ni ajustes)", function () {
    var s = sandbox();
    assert.strictEqual(s.getEatingPriority(), "balanced");
  });

  t.test("getEatingPriority(): 'cheap' (nombre viejo) se traduce a 'satiety'", function () {
    var s = sandbox();
    s.getSettings = function () { return { priority: "cheap" }; };
    assert.strictEqual(s.getEatingPriority(), "satiety");
  });

  t.test("getEatingPriority(): acepta 'satiety' y 'protein', y rechaza cualquier otra cosa", function () {
    var s = sandbox();
    s.getSettings = function () { return { priority: "satiety" }; };
    assert.strictEqual(s.getEatingPriority(), "satiety");
    s.getSettings = function () { return { priority: "protein" }; };
    assert.strictEqual(s.getEatingPriority(), "protein");
    s.getSettings = function () { return { priority: "inventado" }; };
    assert.strictEqual(s.getEatingPriority(), "balanced");
    s.getSettings = function () { return {}; };
    assert.strictEqual(s.getEatingPriority(), "balanced");
  });
}

module.exports = { run: run };
"use strict";
var path = require("path"), fs = require("fs");
var SP = __dirname;
var REPO = path.resolve(__dirname, "..", "..");
var L = require(path.join(REPO, "tests/lib/load-browser-globals")).loadBrowserGlobals;
var T = require(path.join(SP, "gen_platos_tablas.js"));
var TEC = require(path.join(SP, "gen_platos_tecnicas.js")).TECNICAS;

var sb = L([
  "js/data/dishes.js", "js/data/real-products.js", "js/data/packaging.js",
  "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js",
  "js/data/no-cook-classifier.js", "js/data/prices/mercadona.js",
  "js/data/budget-presets.js", "js/core/utils.js", "js/core/pricing.js",
  "js/core/nutrition.js", "js/core/meal-helpers.js"
].map(function (f) { return path.join(REPO, f); }));

// ── Estado actual: nombres y firmas de ingredientes ya usadas ───────────
function firma(items) { return items.map(function (i) { return i.name; }).sort().join("|"); }
var nombresUsados = {}, firmasUsadas = {};
sb.DISH_DB.forEach(function (d) {
  nombresUsados[d.name.toLowerCase()] = true;
  firmasUsadas[firma(d.items)] = true;
});

// ── Rangos de kcal por categoria observados, para no salirse ────────────
var rango = {};
sb.DISH_DB.forEach(function (d) {
  var r = rango[d.category] || (rango[d.category] = { min: 1e9, max: 0 });
  if (d.kcal < r.min) r.min = d.kcal;
  if (d.kcal > r.max) r.max = d.kcal;
});

// ── Tablas de desayuno y snack ──────────────────────────────────────────
var BASES_DULCES = [
  { name: "Avena", g: 60, label: "porridge de avena", eq: ["olla"], dif: 1, paso: "Pon la avena con 200 ml de leche o agua en un cazo y cuece a fuego medio 5 minutos, removiendo y rascando el fondo para que no se pegue." },
  { name: "Skyr natural", g: 200, label: "skyr", eq: ["ninguno"], dif: 1, paso: "Pon el skyr en un bol y remuévelo un poco: sale muy compacto del envase y así queda cremoso." },
  { name: "Yogur griego ligero", g: 200, label: "yogur griego", eq: ["ninguno"], dif: 1, paso: "Vuelca el yogur en un bol y alísalo con el dorso de la cuchara." },
  { name: "Queso fresco batido 0%", g: 150, label: "queso batido", eq: ["ninguno"], dif: 1, paso: "Bate el queso fresco unos segundos con la cuchara para que quede suelto y aireado." },
  { name: "Requesón", g: 150, label: "requesón", eq: ["ninguno"], dif: 1, paso: "Escurre el requesón si trae suero y desmígalo con el tenedor." },
  { name: "Copos de maíz", g: 40, label: "copos de maíz", eq: ["ninguno"], dif: 1, paso: "Sirve los copos en el bol y añade el líquido AL FINAL, justo antes de comer, o se reblandecen." },
  { name: "Granola", g: 50, label: "granola", eq: ["ninguno"], dif: 1, paso: "Reparte la granola en el bol. Si la quieres más crujiente, tuéstala 3 minutos en una sartén sin aceite." }
];

var FRUTAS = [
  { name: "Plátano", g: 100, label: "plátano", paso: "Corta el plátano en rodajas de medio centímetro justo antes de servir: cortado con antelación se oxida y amarga." },
  { name: "Manzana", g: 100, label: "manzana", paso: "Lava la manzana, quítale el corazón y córtala en dados. No la peles: la piel es casi toda la fibra." },
  { name: "Kiwi", g: 100, label: "kiwi", paso: "Parte el kiwi por la mitad y saca la pulpa con una cuchara: es más rápido que pelarlo y se desperdicia menos." },
  { name: "Fresas", g: 100, label: "fresas", paso: "Lava las fresas ANTES de quitarles el rabito: al revés se llenan de agua y pierden sabor." },
  { name: "Naranja", g: 120, label: "naranja", paso: "Pela la naranja a lo vivo con un cuchillo, quitando también la piel blanca, y sepárala en gajos." },
  { name: "Frutos rojos congelados", g: 80, label: "frutos rojos", paso: "Saca los frutos rojos 10 minutos antes. Semicongelados están en su punto: enteros y fríos, sin haber soltado todo el jugo." },
  { name: "Piña", g: 100, label: "piña", paso: "Corta la piña en dados quitando el tronco central, que es fibroso." }
];

var TOPPINGS = [
  { name: "Miel", g: 10, label: "miel", paso: "Añade la miel al final y en hilo, ya fuera del fuego: en caliente se disuelve y deja de notarse." },
  { name: "Almendras", g: 20, label: "almendras", paso: "Pica las almendras en trozos gruesos con el cuchillo: enteras se comen aparte, picadas se reparten por todo el bol." },
  { name: "Nueces", g: 20, label: "nueces", paso: "Rompe las nueces con la mano en trozos grandes y espárcelas por encima." },
  { name: "Mantequilla de cacahuete", g: 25, label: "crema de cacahuete", paso: "Pon la crema de cacahuete en el centro; si está muy dura, 10 segundos de microondas la dejan manejable." },
  { name: "Mermelada light", g: 20, label: "mermelada", paso: "Reparte la mermelada por encima con la punta de la cuchara, sin llegar a mezclarla del todo." },
  { name: "Cacahuetes", g: 20, label: "cacahuetes", paso: "Espolvorea los cacahuetes justo antes de comer para que no se ablanden." }
];

var PANES = [
  { name: "Pan integral", g: 70, label: "pan integral", eq: ["tostadora"], paso: "Tuesta el pan hasta que esté dorado y firme: si queda blando se empapa y se rompe al morderlo." },
  { name: "Pan de molde integral", g: 80, label: "pan de molde", eq: ["tostadora"], paso: "Tuesta las rebanadas 2 minutos por cara. El pan de molde se tuesta antes de lo que parece." },
  { name: "Pan de centeno", g: 70, label: "pan de centeno", eq: ["tostadora"], paso: "El centeno es denso: tuéstalo un punto más que el pan blanco o queda gomoso." },
  { name: "Tortitas de arroz", g: 40, label: "tortitas de arroz", eq: ["ninguno"], paso: "Las tortitas no se tuestan: sácalas del paquete y ciérralo bien, que se ablandan con la humedad." },
  { name: "Tortillas de trigo", g: 80, label: "tortilla de trigo", eq: ["sarten"], paso: "Calienta la tortilla 30 segundos por cara en una sartén sin aceite: fría se agrieta al enrollarla." }
];

var FIAMBRES = [
  { name: "Pavo loncheado", g: 120, label: "pavo", paso: "Reparte las lonchas de pavo sin amontonarlas, para que se note en cada bocado." },
  { name: "Jamón cocido extra", g: 80, label: "jamón cocido", paso: "Coloca el jamón cocido en capas sueltas, no aplastado." },
  { name: "Jamón serrano", g: 60, label: "jamón serrano", paso: "Saca el jamón serrano de la nevera 5 minutos antes: en frío la grasa está dura y no sabe a nada." },
  { name: "Queso light", g: 60, label: "queso", paso: "Pon el queso sobre el pan aún caliente para que se ablande sin llegar a fundirse." },
  { name: "Mozzarella light", g: 120, label: "mozzarella", paso: "Escurre la mozzarella y sécala con papel: viene en agua y la soltaría toda sobre el pan." },
  { name: "Hummus", g: 120, label: "hummus", paso: "Extiende el hummus con el dorso de la cuchara formando un surco en el centro." }
];

var VERDES_FRIAS = [
  { name: "Tomate", g: 80, label: "tomate", paso: "Corta el tomate en rodajas finas y sálalo justo antes de montar, no antes: la sal le saca el agua." },
  { name: "Pepino", g: 80, label: "pepino", paso: "Corta el pepino en láminas finas con el pelador: así no hace bulto ni se cae." },
  { name: "Espinacas", g: 40, label: "espinacas", paso: "Usa las espinacas en crudo, como una cama de hoja fresca debajo del resto." },
  { name: "Aguacate", g: 70, label: "aguacate", paso: "Lamina el aguacate y colócalo en abanico por encima." }
];

// ── Principales SIN carne ni pescado ────────────────────────────────────
// Una legumbre sola no llega al suelo de proteina del catalogo (45 g en
// comida), asi que el lote salia con CERO platos vegetarianos. La salida no
// es bajar el suelo: es hacer lo que hace la cocina vegetariana de verdad,
// juntar dos fuentes en el mismo plato.
var BASES_VEG = [
  { name: "Lentejas cocidas", g: 250, label: "lentejas", mainProt: "legumbre", paso: "Enjuaga las lentejas de bote bajo el grifo hasta que el agua salga clara: se va el liquido de conserva y con el el sabor a lata." },
  { name: "Garbanzos cocidos", g: 220, label: "garbanzos", mainProt: "legumbre", paso: "Escurre y enjuaga los garbanzos, y sécalos un poco: mojados no se doran y quedan sosos." },
  { name: "Alubias cocidas", g: 220, label: "alubias", mainProt: "legumbre", paso: "Enjuaga las alubias con cuidado, que se deshacen: mueve el colador, no las remuevas con la cuchara." },
  { name: "Tofu firme", g: 200, label: "tofu", mainProt: "tofu", paso: "Prensa el tofu 10 minutos entre dos platos con peso encima y córtalo en dados: sin ese paso suelta agua y no se dora nunca." }
];
var SEGUNDAS_VEG = [
  { name: "Huevos enteros", g: 200, label: "huevo", eq: ["sarten"], paso: "Cuaja los huevos a fuego MEDIO-BAJO removiendo despacio: el calor fuerte es lo que los deja gomosos." },
  { name: "Claras de huevo", g: 220, label: "claras", eq: ["sarten"], paso: "Cuaja las claras a fuego suave; sin la yema se secan mucho antes, asi que retíralas cuando aun brillen." },
  { name: "Queso light", g: 60, label: "queso", eq: ["ninguno"], paso: "Añade el queso al final y con el fuego apagado: con el calor residual se funde sin soltar aceite." },
  { name: "Edamame", g: 150, label: "edamame", eq: ["olla"], paso: "Hierve el edamame 5 minutos directamente congelado y escúrrelo bien." }
];

function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// PRNG reproducible (mulberry32), el mismo que usa el proyecto en tests.
function rng(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function baraja(arr, rand) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function construirCandidatos(semilla) {
  var rand = rng(semilla);
  var out = [];
  baraja(T.PROTEINAS, rand).forEach(function (p) {
    baraja(T.GRANOS, rand).forEach(function (g) {
      baraja(T.VERDURAS, rand).forEach(function (v) {
        var frio = (p.tec === "lata" || p.tec === "edamame");
        var nombre = frio
          ? "Ensalada de " + g.label + " con " + p.label + " y " + v.label
          : mayus(p.label) + " con " + g.label + " y " + v.label;
        out.push({ tipo: "principal", nombre: nombre, p: p, g: g, v: v });
      });
    });
  });
  baraja(BASES_VEG, rand).forEach(function (bv) {
    baraja(SEGUNDAS_VEG, rand).forEach(function (sv) {
      baraja(T.VERDURAS, rand).forEach(function (v) {
        out.push({ tipo: "veg", nombre: mayus(bv.label) + " con " + sv.label + " y " + v.label, bv: bv, sv: sv, v: v });
      });
    });
  });
  baraja(BASES_DULCES, rand).forEach(function (b) {
    baraja(FRUTAS, rand).forEach(function (f) {
      baraja(TOPPINGS, rand).forEach(function (t) {
        out.push({ tipo: "dulce", nombre: mayus(b.label) + " con " + f.label + " y " + t.label, b: b, f: f, t: t });
      });
    });
  });
  baraja(PANES, rand).forEach(function (pan) {
    baraja(FIAMBRES, rand).forEach(function (fi) {
      baraja(VERDES_FRIAS, rand).forEach(function (ve) {
        if (fi.name === ve.name) return;
        // Una tortilla de trigo no se tuesta, se enrolla: llamarlo "tostada"
        // describia mal el plato y sonaba raro en espanol.
        var titulo = (pan.name === "Tortillas de trigo")
          ? "Wrap de " + fi.label + " con " + ve.label
          : "Tostada de " + pan.label + " con " + fi.label + " y " + ve.label;
        out.push({ tipo: "salado", nombre: titulo, pan: pan, fi: fi, ve: ve });
      });
    });
  });
  baraja(FRUTAS, rand).forEach(function (f) {
    baraja(TOPPINGS, rand).forEach(function (t) {
      out.push({ tipo: "snack", nombre: mayus(f.label) + " con " + t.label, a: f, b2: t });
    });
  });
  baraja(BASES_DULCES, rand).forEach(function (b) {
    baraja(FRUTAS, rand).forEach(function (f) {
      out.push({ tipo: "snack", nombre: mayus(b.label) + " con " + f.label, a: b, b2: f });
    });
  });
  // Snack de TRES piezas sobre base lactea. Existe porque el suelo de
  // proteina deja fuera casi todos los de fruta + fruto seco, y sin esto
  // la cuota de snack no se llenaba con nada decente.
  baraja(BASES_DULCES, rand).forEach(function (b) {
    baraja(FRUTAS, rand).forEach(function (f) {
      baraja(TOPPINGS, rand).forEach(function (tp) {
        out.push({ tipo: "snack3", nombre: "Bol de " + b.label + " con " + f.label + " y " + tp.label, b: b, f: f, t: tp });
      });
    });
  });
  return out;
}

module.exports = {
  sb: sb, T: T, TEC: TEC, firma: firma, mayus: mayus, rango: rango,
  nombresUsados: nombresUsados, firmasUsadas: firmasUsadas,
  construirCandidatos: construirCandidatos,
  BASES_DULCES: BASES_DULCES, FRUTAS: FRUTAS, TOPPINGS: TOPPINGS,
  PANES: PANES, FIAMBRES: FIAMBRES, VERDES_FRIAS: VERDES_FRIAS,
  BASES_VEG: BASES_VEG, SEGUNDAS_VEG: SEGUNDAS_VEG
};

/**
 * Tablas de componentes. Todo `name` es un ROL QUE YA EXISTE en dishes.js:
 * no se inventa ningun ingrediente nuevo, asi que la cobertura de
 * nutricion, precio, envase, enlace y caducidad sigue completa por
 * construccion.
 */
"use strict";

// ── PROTEINAS ────────────────────────────────────────────────────────────
// g = racion tipica ya usada en el catalogo (mediana observada).
var PROTEINAS = [
  { name:"Pechuga de pollo", g:200, mainProt:"pollo", label:"pollo a la plancha", tec:"plancha_ave", dif:2, eq:["sarten"] },
  { name:"Muslo de pollo deshuesado", g:200, mainProt:"pollo", label:"muslo de pollo", tec:"plancha_ave", dif:2, eq:["sarten"] },
  { name:"Pechuga de pavo", g:190, mainProt:"pavo", label:"pavo a la plancha", tec:"plancha_ave", dif:2, eq:["sarten"] },
  { name:"Lomo de cerdo", g:190, mainProt:"cerdo", label:"lomo de cerdo", tec:"plancha_carne", dif:2, eq:["sarten"] },
  { name:"Ternera magra", g:190, mainProt:"ternera", label:"ternera", tec:"plancha_carne", dif:2, eq:["sarten"] },
  { name:"Solomillo de ternera", g:180, mainProt:"ternera", label:"solomillo", tec:"plancha_carne", dif:2, eq:["sarten"] },
  { name:"Conejo", g:220, mainProt:"conejo", label:"conejo", tec:"guiso_carne", dif:2, eq:["sarten"] },
  { name:"Carne picada 5% grasa", g:190, mainProt:"ternera", label:"carne picada", tec:"picada", dif:1, eq:["sarten"] },
  { name:"Carne picada mixta", g:180, mainProt:"ternera", label:"picada mixta", tec:"picada", dif:1, eq:["sarten"] },
  { name:"Salchichas", g:130, mainProt:"salchicha", label:"salchichas", tec:"salchicha", dif:1, eq:["sarten"] },
  { name:"Merluza", g:220, mainProt:"merluza", label:"merluza", tec:"horno_pescado", dif:2, eq:["horno"] },
  { name:"Bacalao", g:220, mainProt:"bacalao", label:"bacalao", tec:"horno_pescado", dif:2, eq:["horno"] },
  { name:"Lubina", g:200, mainProt:"lubina", label:"lubina", tec:"horno_pescado", dif:2, eq:["horno"] },
  { name:"Rape", g:200, mainProt:"rape", label:"rape", tec:"plancha_pescado", dif:2, eq:["sarten"] },
  { name:"Salmón", g:180, mainProt:"salmon", label:"salmón", tec:"plancha_pescado", dif:2, eq:["sarten"] },
  { name:"Gamba cocida", g:180, mainProt:"gamba", label:"gambas", tec:"marisco", dif:1, eq:["sarten"] },
  { name:"Langostino cocido", g:180, mainProt:"gamba", label:"langostinos", tec:"marisco", dif:1, eq:["sarten"] },
  { name:"Atún al natural", g:160, mainProt:"atun", label:"atún", tec:"lata", dif:1, eq:["ninguno"] },
  { name:"Sardinas en lata", g:180, mainProt:"sardinas", label:"sardinas", tec:"lata", dif:1, eq:["ninguno"] },
  { name:"Caballa en lata", g:160, mainProt:"caballa", label:"caballa", tec:"lata", dif:1, eq:["ninguno"] },
  { name:"Huevos enteros", g:200, mainProt:"huevo", label:"huevos", tec:"huevo", dif:1, eq:["sarten"] },
  { name:"Claras de huevo", g:220, mainProt:"huevo", label:"claras", tec:"huevo", dif:1, eq:["sarten"] },
  { name:"Tofu firme", g:200, mainProt:"tofu", label:"tofu", tec:"tofu", dif:2, eq:["sarten"] },
  { name:"Garbanzos cocidos", g:220, mainProt:"legumbre", label:"garbanzos", tec:"legumbre", dif:1, eq:["sarten"] },
  { name:"Lentejas cocidas", g:250, mainProt:"legumbre", label:"lentejas", tec:"legumbre", dif:1, eq:["sarten"] },
  { name:"Alubias cocidas", g:220, mainProt:"legumbre", label:"alubias", tec:"legumbre", dif:1, eq:["sarten"] },
  { name:"Edamame", g:150, mainProt:"legumbre", label:"edamame", tec:"edamame", dif:1, eq:["olla"] }
];

// ── GRANOS Y FECULAS ─────────────────────────────────────────────────────
var GRANOS = [
  { name:"Arroz blanco cocido", g:200, label:"arroz", paso:"Cuece el arroz en el doble de agua con sal: 15 minutos a fuego suave y tapado, y otros 5 de reposo fuera del fuego sin destapar." },
  { name:"Arroz integral cocido", g:200, label:"arroz integral", paso:"El arroz integral necesita bastante más: 35 minutos en abundante agua con sal. Pruébalo antes de escurrir, tiene que ceder pero no deshacerse." },
  { name:"Pasta cocida", g:210, label:"pasta", paso:"Cuece la pasta en agua con sal el tiempo que diga el paquete menos un minuto: acaba de hacerse en el plato con el calor que lleva dentro." },
  { name:"Quinoa cocida", g:180, label:"quinoa", paso:"Enjuaga la quinoa bajo el grifo antes de cocerla (le quita el amargor de la cáscara) y hiérvela 15 minutos en el doble de agua." },
  { name:"Cuscús cocido", g:200, label:"cuscús", paso:"El cuscús no se cuece: cúbrelo con el mismo volumen de agua hirviendo con sal, tapa 5 minutos y suéltalo con un tenedor." },
  { name:"Patata cocida", g:220, label:"patata", paso:"Cuece la patata en trozos parejos 18 minutos desde que hierve. Está lista cuando el cuchillo entra sin resistencia y sale limpio." },
  { name:"Batata", g:200, label:"batata", paso:"Cuece la batata en trozos 15 minutos: tarda menos que la patata y se pasa antes, así que pínchala a los 12." }
];

// ── VERDURAS ─────────────────────────────────────────────────────────────
var VERDURAS = [
  { name:"Brócoli", g:130, label:"brócoli", paso:"Cuece el brócoli en agua hirviendo con sal 4 minutos: verde vivo y que ceda al pincharlo, no blando." },
  { name:"Espinacas", g:80, label:"espinacas", paso:"Saltea las espinacas 2 minutos en la sartén caliente. Abultan mucho y se reducen a nada: caben aunque no lo parezca." },
  { name:"Verduras congeladas salteado", g:130, label:"verduras salteadas", paso:"Las verduras congeladas van a la sartén SIN descongelar y a fuego fuerte: descongeladas sueltan agua y se cuecen en vez de dorarse." },
  { name:"Calabacín", g:100, label:"calabacín", paso:"Corta el calabacín en medias lunas de un centímetro y saltéalo 5 minutos a fuego medio-alto, sin amontonarlo." },
  { name:"Coliflor", g:130, label:"coliflor", paso:"Cuece la coliflor en ramilletes 6 minutos. Si el agua huele fuerte es que se ha pasado: sácala antes." },
  { name:"Zanahoria", g:90, label:"zanahoria", paso:"Corta la zanahoria en rodajas finas y saltéala 6 minutos: en rodajas gruesas queda cruda por dentro." },
  { name:"Pimiento", g:90, label:"pimiento", paso:"Corta el pimiento en tiras y saltéalo 6 minutos hasta que los bordes empiecen a tostarse." },
  { name:"Champiñones", g:90, label:"champiñones", paso:"Los champiñones a fuego fuerte y en una sola capa: amontonados sueltan agua y se cuecen. No los sales hasta el final." },
  { name:"Tomate", g:80, label:"tomate", paso:"Corta el tomate en gajos y añádelo al final, fuera del fuego, para que no se deshaga." },
  { name:"Cebolla", g:60, label:"cebolla", paso:"Pocha la cebolla en juliana a fuego medio 8 minutos, hasta que esté transparente y dulce." },
  { name:"Maíz dulce", g:60, label:"maíz", paso:"El maíz ya viene cocido: escúrrelo bien y añádelo al final solo para que se caliente." },
  { name:"Pepino", g:80, label:"pepino", paso:"Corta el pepino en medias lunas y déjalo en crudo: es el contrapunto fresco del plato." }
];

module.exports = { PROTEINAS: PROTEINAS, GRANOS: GRANOS, VERDURAS: VERDURAS };

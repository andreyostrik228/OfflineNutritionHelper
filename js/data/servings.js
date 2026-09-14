/**
 * js/data/servings.js
 * ─────────────────────────────────────────────────────────────────────────
 * La RACIÓN de casa de cada ingrediente: la cosa que uno cuenta cuando
 * sirve, no cuando compra.
 *
 * `packaging.js` contesta "¿qué compro?" (una bolsa, un bote, una docena).
 * Esto contesta otra pregunta distinta: "¿cuánto me pongo?" — y casi nunca
 * es la misma unidad. El yogur griego se compra en un pack de 750 g y se
 * come de 125 en 125. Decirle a alguien "cómete 568 g de yogur" cuando cada
 * tarrina son 125 g es pedirle que haga una división con la nevera abierta.
 *
 * ── POR QUÉ ESTO ES UN FICHERO APARTE ───────────────────────────────────
 * Se valoró meter un campo `serving` dentro de cada entrada de
 * `packaging.js`. Son dos preguntas distintas sobre el mismo ingrediente y
 * se leen mejor separadas — pero el riesgo real es que las dos tablas se
 * desincronicen sin avisar, así que `tests/servings.test.js` exige que cada
 * clave de aquí exista también allí. Sin ese test, esto sería peor que un
 * campo más.
 *
 * ── DE DÓNDE SALEN LOS GRAMOS ───────────────────────────────────────────
 * Cuando el envase ya lo dice, se dividen sus propios números y se cita el
 * comentario de `packaging.js` que lo respalda (el yogur son 750/6, el atún
 * 360/6, las lonchas de queso 300/12). Cuando no, es una MEDIA RAZONABLE de
 * cocina, exactamente con el mismo estatus que `gramsPerUnit` en
 * `packaging.js`: "no un valor exacto".
 *
 * Esto NO contradice la regla de "nunca un valor nutricional inventado"
 * (PROJECT.md): aquí no se inventa nutrición ninguna. Los macros se siguen
 * calculando desde los gramos reales — lo único que cambia es que los
 * gramos se redondean a una cantidad que se puede servir.
 *
 * ── POR QUÉ LA UNIDAD IMPORTA MÁS DE LO QUE PARECE (medido 2026-09-13) ──
 * El primer intento usó el ENVASE como unidad también para lo seco: "1/4 de
 * la caja de avena". Una caja son 800 g, así que la ración mínima pasaba a
 * ser 200 g de avena — 760 kcal de desayuno. Medido sobre 100 semillas x 3
 * perfiles, el día entero se iba a +9,3% / +11,6% / +7,0% de kcal, y la
 * avena ella sola aportaba el 46% de todo ese exceso.
 *
 * Con la unidad correcta (cucharada, puñado, vaso) el mismo experimento da
 * +0,6% / -0,1% / -0,2%: los redondeos hacia arriba y hacia abajo se
 * cancelan entre las ~12 filas de un día. La lección, que vale para
 * cualquier ingrediente que se añada aquí: **la unidad tiene que ser del
 * tamaño de una ración, no del tamaño del envase.** Si la ración típica es
 * menos de un cuarto de la unidad, la unidad está mal elegida.
 *
 * ── LAS TRES FORMAS DE PARTIR UNA UNIDAD ────────────────────────────────
 *   "entera"  no se parte. Una lata, un yogur, una rebanada, un huevo.
 *             Se redondea a números enteros, mínimo 1.
 *   "media"   admite mitades. Una pieza de fruta, un vaso.
 *   "cuarto"  admite cuartos Y tercios. Envases que se abren y se usan a
 *             trozos, y verduras grandes.
 *
 * ── LO QUE SE QUEDA EN GRAMOS A PROPÓSITO ───────────────────────────────
 * No todo tiene una unidad de casa honesta, y forzarla sería inventarla:
 *
 *   carne y pescado frescos (bandeja)  se compran y se cortan al peso; los
 *       gramos YA son la unidad correcta. Son el 1,1% de las filas.
 *   carne picada                       se pesa, no se cuenta.
 *   coliflor                           la pieza son 1.040 g y la ración
 *       mediana 178 g: ni un cuarto se le acerca (+46%). Con 6 filas de
 *       3.565 medidas, inventarle una unidad cuesta más de lo que da.
 *
 * Consumido por: js/core/servings.js (el único que lo lee).
 * ─────────────────────────────────────────────────────────────────────────
 */

var SERVING_UNITS = {

  // ── Lo que no se parte ────────────────────────────────────────────────
  // Los gramos salen del propio envase de packaging.js, dividido por las
  // unidades que su comentario declara.
  "yogur griego ligero":       { g: 125, label: "yogur",      split: "entera" },  // pack de 6 x 125 g
  "atun al natural":           { g: 60,  label: "lata",       split: "entera" },  // 6 latas, 60 g escurrido
  "sardinas en lata":          { g: 84,  label: "lata",       split: "entera" },  // 2 latas, 84 g escurrido
  "caballa en lata":           { g: 82,  label: "lata",       split: "entera" },  // 2 latas, 82 g escurrido
  "maiz dulce":                { g: 140, label: "lata",       split: "entera" },  // 3 latas, 140 g escurrido
  "queso light":               { g: 25,  label: "loncha",     split: "entera" },  // paquete de 12 lonchas / 300 g
  "mozzarella light":          { g: 125, label: "bola",       split: "entera" },  // el envase YA es una bola
  "jamon cocido extra":        { g: 25,  label: "loncha",     split: "entera" },
  "pavo loncheado":            { g: 25,  label: "loncha",     split: "entera" },
  "jamon serrano":             { g: 15,  label: "loncha",     split: "entera" },  // el serrano se corta mas fino
  "pan integral":              { g: 30,  label: "rebanada",   split: "entera" },
  "pan blanco":                { g: 25,  label: "rebanada",   split: "entera" },
  "pan de molde integral":     { g: 26,  label: "rebanada",   split: "entera" },  // 460 g / 18 rebanadas
  "pan de centeno":            { g: 35,  label: "rebanada",   split: "entera" },
  "tortillas de trigo":        { g: 60,  label: "tortilla",   split: "entera" },  // 360 g / 6
  "tortitas de arroz":         { g: 9,   label: "tortita",    split: "entera" },
  "salchichas":                { g: 40,  label: "salchicha",  split: "entera" },  // 200 g / 5 por paquete
  "claras de huevo":           { g: 33,  label: "clara",      split: "entera" },  // una clara de un huevo M
  "ajo":                       { g: 5,   label: "diente",     split: "entera" },

  // Lo de cuchara. `packaging.js` abre su cabecera con este caso exacto
  // ("miel 23g -- nadie compra ni mide asi la miel") pero solo el aceite
  // llego a tener type:"spoonable"; estos tres se quedaron en gramos.
  "avena":                     { g: 15,  label: "cucharada",  split: "entera" },
  "granola":                   { g: 15,  label: "cucharada",  split: "entera" },
  "miel":                      { g: 21,  label: "cucharada",  split: "entera" },
  "mermelada light":           { g: 20,  label: "cucharada",  split: "entera" },
  "mantequilla de cacahuete":  { g: 16,  label: "cucharada",  split: "entera" },

  // ── Lo que admite mitades ─────────────────────────────────────────────
  // Piezas de fruta y verdura: el gramaje es el de packaging.js, que ya es
  // el peso de UNA pieza.
  "platano":                   { g: 154, label: "plátano",    split: "media" },
  "manzana":                   { g: 190, label: "manzana",    split: "media" },
  "naranja":                   { g: 285, label: "naranja",    split: "media" },
  "tomate":                    { g: 125, label: "tomate",     split: "media" },
  "kiwi":                      { g: 109, label: "kiwi",       split: "media" },
  "pimiento":                  { g: 200, label: "pimiento",   split: "media" },
  "pepino":                    { g: 204, label: "pepino",     split: "media" },
  "aguacate":                  { g: 200, label: "aguacate",   split: "media" },
  "calabacin":                 { g: 403, label: "calabacín",  split: "media" },
  "batata":                    { g: 424, label: "batata",     split: "media" },
  "patata cocida":             { g: 150, label: "patata",     split: "media" },
  "pina":                      { g: 110, label: "rodaja",     split: "media" },  // la pieza son 1,83 kg: se sirve en rodajas

  // Frutos secos: el puñado es la unidad de verdad. El paquete (200-400 g)
  // como unidad es lo que disparaba las kcal -- ver la cabecera.
  // 20 g y no 25 porque UNA RECETA YA LO DICE, y está publicada y traducida:
  // "Un puñado de almendras son unos 20 gramos, más o menos lo que cabe en
  // el hueco de la mano cerrada" (Puñado de almendras y frutos rojos). Si la
  // tabla dijera 25, el mismo plato se contradiría a sí mismo en la misma
  // pantalla. Se cambia el dato, nunca el paso: la clave de traducción es la
  // frase entera y tocarla la dejaría sin traducir sin dar ningún error.
  // Las otras dos se quedan en 25: un puñado de nueces o de cacahuetes no
  // pesa lo mismo que uno de almendras, y de esas no hay ninguna receta que
  // se moje.
  "almendras":                 { g: 20,  label: "puñado",     split: "media" },
  "nueces":                    { g: 25,  label: "puñado",     split: "media" },
  "cacahuetes":                { g: 25,  label: "puñado",     split: "media" },

  // Grano y liquido: el vaso. El arroz y la pasta van en gramos COCIDOS
  // (ver el aviso de packaging.js), asi que este vaso tambien.
  "copos de maiz":             { g: 40,  label: "vaso",       split: "media" },
  "arroz blanco cocido":       { g: 180, label: "vaso",       split: "media" },
  "arroz integral cocido":     { g: 180, label: "vaso",       split: "media" },
  "pasta cocida":              { g: 180, label: "vaso",       split: "media" },
  "cuscus cocido":             { g: 180, label: "vaso",       split: "media" },
  "quinoa cocida":             { g: 180, label: "vaso",       split: "media" },
  "leche semidesnatada":       { g: 200, label: "vaso",       split: "media" },

  // ── Lo que se abre y se gasta a trozos ────────────────────────────────
  "zanahoria":                 { g: 65,  label: "zanahoria",  split: "cuarto" },  // la bolsa es de 1 kg; esto es UNA zanahoria
  "brocoli":                   { g: 420, label: "brócoli",    split: "cuarto" },
  "lentejas cocidas":          { g: 400, label: "bote",       split: "cuarto" },
  "garbanzos cocidos":         { g: 400, label: "bote",       split: "cuarto" },
  "alubias cocidas":           { g: 400, label: "bote",       split: "cuarto" },
  "requeson":                  { g: 200, label: "tarrina",    split: "cuarto" },
  "skyr natural":              { g: 450, label: "tarrina",    split: "cuarto" },
  "queso fresco batido 0%":    { g: 500, label: "tarrina",    split: "cuarto" },
  "hummus":                    { g: 240, label: "tarrina",    split: "cuarto" },
  "tofu firme":                { g: 275, label: "paquete",    split: "cuarto" },
  "champinones":               { g: 300, label: "bandeja",    split: "cuarto" },
  "gamba cocida":              { g: 300, label: "bandeja",    split: "cuarto" },
  "langostino cocido":         { g: 600, label: "bandeja",    split: "cuarto" },
  "fresas":                    { g: 470, label: "bandeja",    split: "cuarto" },
  "espinacas":                 { g: 500, label: "bolsa",      split: "cuarto" },
  "lechuga":                   { g: 250, label: "bolsa",      split: "cuarto" },
  "verduras congeladas salteado": { g: 600, label: "bolsa",   split: "cuarto" },
  "edamame":                   { g: 500, label: "bolsa",      split: "cuarto" },
  "frutos rojos congelados":   { g: 300, label: "bolsa",      split: "cuarto" }
};

/**
 * El plural español de cada etiqueta, cuando NO es la etiqueta + "s".
 *
 * Misma lección que `packages-en.js` aprendió con el inglés (`loaf` ->
 * `loaves`): el plural no se forma añadiendo una "s" y punto. En español
 * lo que acaba en CONSONANTE pide "-es", y si además es aguda acabada en
 * -n pierde el acento. Una regla automática no acierta ninguna de las dos.
 *
 * Lo que sí sigue la regla ("lata" -> "latas") no hace falta escribirlo.
 * Las dos que no la siguen las encontró el test, no yo: "yogurs" ya había
 * llegado a pasar por bueno una vez.
 */
var SERVING_PLURALS = {
  "calabacín": "calabacines",
  "yogur":     "yogures"
};

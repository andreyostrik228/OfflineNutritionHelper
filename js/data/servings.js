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

var SERVING_UNITS_MERCADONA = {

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
  // `comoPlato`: la MISMA comida medida de otra forma cuando ES el plato.
  //
  // El pan tiene dos papeles y una sola unidad no sirve para los dos. Medido
  // sobre los 30 platos que llevan pan integral: en 28 es guarnición de
  // 20-70 g (pan con la sopa, con la ensalada, picatostes en el gazpacho) y
  // ahí la rebanada es correcta; en 2 es un bocadillo de 90-100 g, y ahí un
  // bocadillo "de 3 rebanadas" es tan absurdo como lo era el de nueve.
  //
  // NO se deduce del gramaje. La idea tentadora era "a partir de 90 g es el
  // plato", y el reparto la desmonta: hay NUEVE platos en 80 g, justo debajo
  // del umbral. Alguien edita una receta de 80 a 90 y la unidad se da la
  // vuelta sola, sin error y sin aviso -- la clase de fallo que este
  // proyecto lleva pagando desde §7.6. El papel lo DECLARA el plato
  // (`papel: "plato"` en su item, ver js/data/dishes.js), igual que en el
  // proyecto de formas coherentes la composición se declara en vez de
  // buscarse.
  "pan integral":              { g: 30,  label: "rebanada",   split: "entera",
                                 comoPlato: { g: 350, label: "barra", split: "cuarto" } },
  // ── La barra NO se vende en rebanadas (2026-09-14) ────────────────────
  // Lo cazó el usuario mirando una tarjeta que se contradecía sola:
  // "Pan blanco -- 9 rebanadas (225 g)" junto al paso 2 de esa misma
  // receta, que dice "Abre el pan por la mitad sin llegar a separarlo del
  // todo". Un bocadillo de nueve rebanadas. Y 225 g de una barra de 250 es
  // el 90% de la barra: "casi una barra entera" es lo honesto.
  //
  // Una barra se parte, no se rebana; rebanadas tienen el pan de molde y la
  // hogaza, y esos dos ya estaban bien. Se pasa a cuartos de barra, que es
  // como lo pidió el usuario ("por partes de 4, o sea 1/2 son 2/4").
  // `split: "cuarto"` admite además tercios, así que un tercio de barra
  // sale solo cuando cae más cerca.
  //
  // SOLO el pan blanco. `pan integral` es también una barra y NO se toca:
  // está en 30 platos y en 28 de ellos es una GUARNICIÓN de 20-70 g -- pan
  // con la sopa, con la ensalada, picatostes en el gazpacho. Con cuartos de
  // barra el mínimo servible sería 87,5 g, y ocho de esos usos se
  // hincharían 1,5 veces o más; los picatostes del gazpacho, 3,5 veces.
  // Medido, no supuesto. El pan tiene DOS papeles -- es el plato o es el
  // acompañamiento -- y una sola unidad no sirve para los dos. Esa decisión
  // está esperando al usuario.
  //
  // El pan blanco no tiene ese problema: sus 4 platos son todos "el pan ES
  // el plato" (100-130 g), así que un cuarto de barra siempre le queda bien.
  "pan blanco":                { g: 250, label: "barra",      split: "cuarto" },
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

// ── Registro por tienda ──────────────────────────────────────────────────
// Mismo patrón que PACKAGING_CATALOGS y PRICE_CATALOGS.
//
// ── QUÉ DE UNA RACIÓN DEPENDE DE LA TIENDA, Y QUÉ NO ────────────────────
// No es obvio y conviene dejarlo escrito, porque la respuesta intuitiva
// falla en la mitad de los casos.
//
// NO depende de la tienda lo que es una medida de COCINA o una pieza de
// fruta: una cucharada son ~15 g de avena en cualquier sitio, y un plátano
// pesa lo que pesa un plátano. Esas entradas podrían compartirse.
//
// SÍ depende de la tienda todo lo que sale de un envase, y son mayoría
// aquí: el yogur son 125 g porque el pack de Mercadona trae 6 x 125; la
// lata de atún son 60 g escurridos porque ese es su formato; la rebanada
// son 30 g porque la barra pesa 350.
//
// El caso de la REBANADA merece una nota, porque se propuso como ejemplo de
// medida independiente y los datos dicen lo contrario: el pan de molde de
// Dia pesa 820 g y el de Mercadona 460 g. Si las dos traen un número
// parecido de rebanadas, la rebanada NO puede pesar lo mismo. No se toca
// hoy —no hay datos de Dia y este cambio no añade tiendas— pero queda
// dicho para que nadie lo dé por evidente.
//
// Por eso la tabla entera se registra como de Mercadona, sin partirla en
// "compartido" y "propio". Partirla exige decidir 65 casos uno a uno, y
// hacerlo sin una segunda tienda delante sería inventar la mitad. Cuando
// exista la segunda, la comparación dirá cuáles coinciden de verdad.
//
// `SERVING_PLURALS` se queda GLOBAL a propósito: es gramática española, no
// tiene nada que ver con el supermercado.
var SERVING_CATALOGS = (typeof SERVING_CATALOGS === "undefined") ? {} : SERVING_CATALOGS;

SERVING_CATALOGS.mercadona = {
  storeId:   "mercadona",
  storeName: "Mercadona",
  sourceNote:
    "Raciones derivadas de los envases de Mercadona (ver PACKAGING_CATALOGS) " +
    "y de medidas de cocina. Las que salen del envase cambian con la tienda.",
  units:     SERVING_UNITS_MERCADONA
};

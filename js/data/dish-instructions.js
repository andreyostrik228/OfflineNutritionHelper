/**
 * js/data/dish-instructions.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cómo se cocina cada plato: pasos, equipo necesario y dificultad.
 *
 * ── Por qué esto existe (feedback de una usuaria real, 2026-08-26) ───────
 * Alguien intentó cocinar con la app y no pudo. Dijo tres cosas: que los
 * platos eran difíciles, que no tenía el equipo, y que no sabía CÓMO
 * hacerlos. Los datos dicen que lo primero no es cierto en términos
 * objetivos -- la mediana de `prep` es 15 minutos y un plato tiene 3
 * ingredientes de media, máximo 4. Lo que faltaba era lo tercero:
 * `dishes.js` no tenía NI UN paso de elaboración. "Porridge de avena" es
 * trivial si sabes la proporción de líquido y el tiempo, e imposible si
 * nunca lo has hecho.
 *
 * ── Por qué un archivo APARTE y no campos en dishes.js ───────────────────
 * Mismo patrón aditivo que ya funcionó con product-storage.js: dishes.js
 * son 334 entradas curadas a mano de las que dependen los golden-master
 * del generador. Tocarlas para añadir texto de cocina arriesga mover
 * resultados del motor por un cambio que no tiene NADA que ver con la
 * selección. Aquí no: si este archivo falta o un plato no está, el plato
 * se comporta exactamente igual que hoy.
 *
 * ── Estado: PILOTO ──────────────────────────────────────────────────────
 * 17 platos de 334. Elegidos para cubrir el MECANISMO (los seis tokens de
 * equipo, los tres niveles de dificultad, las cuatro categorías, de 1 a 15
 * minutos), no por ser "los más conocidos" -- eso es un juicio de curación
 * cultural y lo decide el usuario, no este archivo.
 *
 * (Decía "18" y eran 17: el recuento se había hecho contando apariciones
 * de `steps:`, y una de ellas está en el JSDoc de getDishInstructions.)
 *
 * ── Cómo se escriben los pasos ──────────────────────────────────────────
 * Redacción ORIGINAL, nunca copiada de webs ni libros de cocina: las
 * técnicas no se pueden registrar, la expresión sí, y esta app puede
 * publicarse.
 *
 * Y para principiantes de verdad. "Cuece la pasta" es justo la
 * instrucción que falló. Cada paso lleva, cuando aplica: cantidad
 * concreta, tiempo concreto, y CÓMO SABER que está listo. Quien lee esto
 * no ha cocinado nunca.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Vocabulario CERRADO de equipo. Cerrado a propósito: con texto libre el
 * filtro "no tengo esto" nunca funcionaría, porque "sartén"/"sarten"/
 * "una sartén" serían tres cosas distintas.
 *
 * `ninguno` es el más valioso de todos: significa que no hace falta nada
 * más que un cuchillo y un bol, que se dan por supuestos en cualquier
 * cocina. Es la respuesta directa a "no tengo el equipo".
 */
var EQUIPMENT_TOKENS = [
  "ninguno",
  "tostadora",
  "microondas",
  "sarten",
  "olla",
  "horno",
  "batidora"
];

/** 1 fácil · 2 medio · 3 avanzado. */
var DIFFICULTY_LEVELS = { FACIL: 1, MEDIO: 2, AVANZADO: 3 };

/**
 * Instrucciones por NOMBRE de plato (la clave de dishes.js).
 * Cualquier plato ausente simplemente no muestra pasos.
 */
var DISH_INSTRUCTIONS = {

  // ── Sin equipo: solo cuchillo y bol ──────────────────────────────────
  "Almendras y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava la manzana bajo el grifo y sécala.",
      "Córtala en cuartos, quita el corazón con las pepitas y trocea cada cuarto en 3 o 4 gajos.",
      "Sirve los gajos en un bol con las almendras al lado. No hace falta pelar la manzana: la piel tiene fibra."
    ]
  },

  "Yogur griego con frutos secos y miel": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Vuelca el yogur en un bol.",
      "Pica las almendras en trozos grandes: ponlas en la tabla y aplástalas con el lado plano de un cuchillo ancho, o pártelas con los dedos.",
      "Espárcelas por encima del yogur.",
      "Riega con un hilo de miel. Si la miel está muy espesa, mete el bote 10 segundos en agua caliente y saldrá sola."
    ]
  },

  "Skyr con frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador 10 minutos antes: se descongelan solos y sueltan un jugo que endulza el skyr.",
      "Pon el skyr en un bol y remueve un poco para que quede cremoso.",
      "Añade los frutos rojos por encima y mézclalo si te gusta que se tiña de color."
    ]
  },

  "Muesli con leche y fruta": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon la granola en un bol hondo.",
      "Vierte la leche por encima hasta cubrirla más o menos hasta la mitad; si la echas toda de golpe la granola flota y se reblandece enseguida.",
      "Lava la manzana, quítale el corazón y córtala en dados pequeños.",
      "Reparte la manzana por encima y come sin esperar, mientras la granola sigue crujiente."
    ]
  },

  "Ensalada caprese con jamón": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava los tomates y córtalos en rodajas de aproximadamente medio centímetro.",
      "Escurre la mozzarella y córtala en rodajas de grosor parecido al del tomate.",
      "Ve alternando en el plato una rodaja de tomate y una de mozzarella, superpuestas como tejas.",
      "Corta el jamón cocido en tiras anchas y repártelo por encima.",
      "Sal justo antes de comer: si salas antes, el tomate suelta agua y el plato queda aguado."
    ]
  },

  "Bocadillo integral de atún y tomate": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Abre el pan por la mitad a lo largo.",
      "Escurre bien el atún: aprieta la tapa de la lata contra el pescado sobre el fregadero hasta que deje de caer líquido. Si no lo escurres, el pan se empapa.",
      "Reparte el atún sobre la base del pan y aplástalo un poco con el tenedor para que no se caiga al morder.",
      "Lava el tomate, córtalo en rodajas finas y ponlas encima.",
      "Cierra el bocadillo y presiónalo con la palma unos segundos para que se compacte."
    ]
  },

  "Hummus con wrap proteico y verduras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Extiende el wrap sobre un plato liso.",
      "Unta el hummus por toda la superficie con el dorso de una cuchara, dejando dos dedos libres en el borde más alejado de ti.",
      "Lava y pela la zanahoria y el pepino, y córtalos en bastones finos, del largo del wrap.",
      "Coloca los bastones en una sola línea sobre el tercio más cercano a ti.",
      "Enrolla apretando desde ese lado. El borde sin hummus queda fuera y cierra el rollo.",
      "Córtalo por la mitad en diagonal para que se sostenga de pie."
    ]
  },

  "Ensalada de queso fresco con atún": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre el atún apretando la tapa de la lata contra el pescado.",
      "Lava el tomate y córtalo en dados de un par de centímetros.",
      "Mezcla en un bol el queso fresco batido con el atún hasta que quede una crema uniforme.",
      "Añade el tomate y remueve con cuidado, sin machacarlo.",
      "Sirve frío. Si lo preparas con antelación, guárdalo en la nevera y añade el tomate justo antes de comer."
    ]
  },

  // ── Tostadora ────────────────────────────────────────────────────────
  "Queso fresco con mermelada y tostadas": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta las tortitas de arroz solo si te gustan más crujientes; si no, sáltate este paso.",
      "Remueve el queso fresco batido en un bol hasta que quede liso.",
      "Repártelo sobre las tortitas con una cuchara.",
      "Pon un punto de mermelada encima de cada una. Con poca cantidad basta: es lo que más azúcar aporta del plato."
    ]
  },

  // ── Microondas ───────────────────────────────────────────────────────
  "Avena con leche y plátano": {
    difficulty: 1,
    equipment: ["microondas"],
    steps: [
      "Pon la avena y la leche en un bol hondo apto para microondas. El bol debe estar medio vacío: la avena sube al hervir y se desborda con facilidad.",
      "Calienta 90 segundos a máxima potencia.",
      "Saca el bol con cuidado (quema) y remueve. Debe haber espesado hasta parecer unas gachas; si aún está líquido, calienta de 30 en 30 segundos.",
      "Corta el plátano en rodajas y repártelo por encima."
    ]
  },

  // ── Olla ─────────────────────────────────────────────────────────────
  "Porridge de avena con plátano y miel": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Pon la avena y la leche en un cazo. La proporción que funciona es aproximadamente el doble de líquido que de avena.",
      "Calienta a fuego medio, no fuerte: si va muy rápido se pega al fondo.",
      "Remueve de vez en cuando con una cuchara de madera, rascando el fondo.",
      "En unos 4 o 5 minutos empezará a espesar. Está listo cuando al pasar la cuchara por el fondo se abre un surco que tarda un segundo en cerrarse.",
      "Aparta del fuego, pásalo a un bol y deja reposar un minuto: espesa un poco más al enfriarse.",
      "Corta el plátano en rodajas, ponlo por encima y añade la miel al final, ya fuera del fuego."
    ]
  },

  // ── Sartén ───────────────────────────────────────────────────────────
  "Claras revueltas express con jamón": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el jamón cocido en tiras de un dedo de ancho.",
      "Calienta una sartén antiadherente a fuego MEDIO-BAJO con unas gotas de aceite. Las claras se vuelven gomosas con el fuego fuerte: aquí la paciencia es la técnica.",
      "Vierte las claras y espera sin tocarlas unos 20 segundos, hasta que el borde empiece a cuajar.",
      "Remueve despacio con una espátula, arrastrando desde el borde hacia el centro, formando pliegues grandes.",
      "Cuando estén casi cuajadas pero todavía brillantes y algo húmedas, añade el jamón y apaga el fuego. El calor que queda en la sartén termina de cuajarlas.",
      "Sirve enseguida: si las dejas en la sartén caliente siguen cocinándose y se secan."
    ]
  },

  "Tortilla francesa con tostadas integrales": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Casca los huevos en un bol y bátelos con un tenedor unos 20 segundos, hasta que la clara y la yema sean un único color amarillo. Añade una pizca de sal.",
      "Pon el pan a tostar.",
      "Calienta una sartén pequeña antiadherente a fuego medio con un poco de aceite. Está a punto cuando una gota de huevo chisporrotea suavemente al caer.",
      "Vierte el huevo. Espera unos 15 segundos y empieza a llevar el huevo cuajado del borde hacia el centro, inclinando la sartén para que el huevo líquido ocupe el hueco.",
      "Cuando la superficie esté casi cuajada pero aún un poco brillante, dobla la tortilla por la mitad con la espátula.",
      "Déjala 15 segundos más y pásala al plato. Debe quedar jugosa por dentro, no seca.",
      "Lava el tomate, córtalo en rodajas y sírvelo junto a la tostada."
    ]
  },

  "Tostadas con aguacate y huevo escalfado": {
    difficulty: 3,
    equipment: ["olla", "tostadora"],
    steps: [
      "Pon a calentar en un cazo unos 8 cm de agua. Cuando empiece a soltar burbujas pequeñas del fondo, sin llegar a hervir a borbotones, baja el fuego. Si hierve fuerte, el huevo se deshace.",
      "Añade al agua una cucharada de vinagre: ayuda a que la clara cuaje junta.",
      "Casca el huevo en una taza (nunca directamente al agua, así controlas la caída).",
      "Remueve el agua con una cuchara haciendo un remolino y deja caer el huevo en el centro. El giro envuelve la clara alrededor de la yema.",
      "Cocina 3 minutos exactos para que la yema quede líquida. Sácalo con una espumadera y déjalo un momento sobre papel de cocina.",
      "Mientras, tuesta el pan y machaca el aguacate con un tenedor directamente sobre la tostada, con una pizca de sal.",
      "Pon el huevo encima y rómpelo al comer. Es el paso más delicado de esta lista: si el primer intento se deshace, no has hecho nada mal."
    ]
  },

  // ── Horno ────────────────────────────────────────────────────────────
  "Sardinas al horno con ensalada": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 °C con calor arriba y abajo. Necesita unos 10 minutos para llegar: enciéndelo antes de preparar nada.",
      "Escurre las sardinas y colócalas separadas en una bandeja con papel de hornear.",
      "Hornea 8 minutos. Solo se están calentando y dorando, ya vienen cocinadas de la lata.",
      "Mientras, lava la lechuga hoja a hoja, sécala y trocéala con las manos.",
      "Lava y corta el tomate en gajos y mézclalo con la lechuga.",
      "Saca la bandeja con un paño (quema mucho) y sirve las sardinas sobre la ensalada."
    ]
  },

  "Pechuga de pollo a la plancha con ensalada": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Saca el pollo de la nevera 10 minutos antes: muy frío se cocina desigual, dorado por fuera y crudo dentro.",
      "Si la pechuga es gruesa, ábrela por la mitad a lo ancho como un libro para que quede de un dedo de grosor.",
      "Sálala por las dos caras justo antes de cocinarla.",
      "Calienta la sartén a fuego medio-alto con un poco de aceite hasta que humee muy ligeramente.",
      "Pon el pollo y NO lo toques durante 4 minutos: si lo mueves no se dora.",
      "Dale la vuelta y haz 3 o 4 minutos más. Está hecho cuando al pinchar la parte más gruesa sale jugo transparente, no rosado.",
      "Déjalo reposar 2 minutos en el plato antes de cortarlo, o se le escapa el jugo.",
      "Sirve con la lechuga y el tomate lavados y troceados."
    ]
  },

  "Pasta con atún y tomate": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Llena una olla con aproximadamente un litro de agua por cada 100 g de pasta y ponla a fuego fuerte.",
      "Cuando hierva a borbotones, añade una cucharada colmada de sal y luego la pasta.",
      "Remueve al echarla y otra vez al minuto, para que no se pegue entre sí.",
      "Cuécela el tiempo que diga el paquete, pero prueba un trozo un minuto ANTES: debe estar tierna pero con una ligera resistencia al morder.",
      "Antes de escurrir, guarda medio vaso del agua de cocción.",
      "Escurre la pasta en un colador.",
      "En la misma olla, mezcla la pasta con el atún escurrido y el tomate troceado. Si queda seca, añade un poco del agua reservada: lleva almidón y liga la salsa."
    ]
  },

  // ══ LOTE 1 (2026-08-26) ═══════════════════════════════════════════════
  // Los 25 platos más cortos que no tenían nada. No es solo por los pasos:
  // `equipment` y `difficulty` SOLO existen para los platos con entrada
  // aquí, así que hasta ahora el filtro "no tengo equipo" -- la queja
  // literal de la usuaria -- no tenía casi nada sobre lo que actuar. Estos
  // 25 son casi todos `ninguno`, que es justo la respuesta a esa queja.

  "Cacahuetes con plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Elige un plátano con la piel amarilla y algún punto marrón: si está verde en las puntas sabe a harina y cuesta digerirlo.",
      "Pélalo y córtalo en rodajas de un dedo de grosor, o cómelo entero si te da igual.",
      "Pon los cacahuetes al lado en un plato pequeño. Si son con cáscara, pélalos antes: 25 g de cacahuete pelado es un puñado que cabe en la palma cerrada."
    ]
  },

  "Nueces y naranja": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Corta los dos extremos de la naranja para que se apoye plana en la tabla y no ruede mientras la pelas.",
      "Pela de arriba abajo siguiendo la curva, quitando la parte blanca: es la que amarga.",
      "Sepárala en gajos con los dedos y sirve las nueces al lado. Si las nueces saben rancias o amargas, están viejas: no es tu culpa, tíralas."
    ]
  },

  "Almendras con frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador y déjalos 10 minutos en un bol a temperatura ambiente.",
      "No los pongas bajo el grifo con agua caliente para acelerar: se deshacen y sueltan todo el jugo.",
      "Cuando estén blandos por fuera pero aún fríos, añade las almendras por encima y cómelo. El jugo que han soltado se bebe."
    ]
  },

  "Skyr con manzana y canela": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el skyr en un bol y remuévelo 10 segundos con una cuchara: viene muy compacto y así queda cremoso en vez de en bloque.",
      "Lava la manzana, quítale el corazón con las pepitas y córtala en dados pequeños, del tamaño de un dado de parchís.",
      "Mézclala con el skyr y espolvorea canela por encima. Con media cucharadita sobra: la canela tapa el resto de sabores si te pasas."
    ]
  },

  "Mantequilla de cacahuete con tortitas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Remueve el bote de mantequilla de cacahuete antes de servir: el aceite se separa y sube arriba, y si no lo mezclas la primera cucharada es solo aceite.",
      "Pon las tortitas de arroz en un plato y reparte la mantequilla por encima con el dorso de una cuchara.",
      "Extiéndela con cuidado y sin apretar: las tortitas se rompen con nada. Cómelas enseguida o se ablandan."
    ]
  },

  "Jamón cocido con mozzarella": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre bien la mozzarella: viene en agua y si no la escurres el plato queda aguado.",
      "Córtala en rodajas de medio centímetro, o pártela con las manos si prefieres trozos irregulares.",
      "Corta el jamón cocido en tiras anchas y sírvelo junto a la mozzarella. Sácalo de la nevera 5 minutos antes: muy frío casi no sabe a nada."
    ]
  },

  "Sardinas con pan integral": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Abre la lata y escúrrela inclinándola sobre el fregadero con la tapa medio puesta, sujetándola bien.",
      "Corta el pan en dos rebanadas y reparte las sardinas encima, aplastándolas un poco con el tenedor para que no se caigan al morder.",
      "Si te molestan las espinas, abre la sardina por la mitad a lo largo con el tenedor y tira del hilo central: sale entero de una vez. Son blandas y se pueden comer, pero no hay obligación."
    ]
  },

  "Caballa en lata con tostadas": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta las dos rebanadas de pan hasta que estén doradas y firmes al tacto.",
      "Mientras, escurre la lata de caballa inclinándola con la tapa medio puesta.",
      "Reparte la caballa sobre el pan ya tostado, nunca sobre pan tibio recién sacado: el pan caliente y blando se empapa y se rompe al cogerlo."
    ]
  },

  "Queso light con tomate cherry": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava los tomates y córtalos por la mitad. Si ruedan al cortarlos, apóyalos sobre la parte ya cortada.",
      "Corta el queso en dados o en lonchas, como prefieras.",
      "Sirve juntos en un plato. Un pellizco de sal sobre el tomate 5 minutos antes de comer le saca el jugo y sabe mucho más."
    ]
  },

  "Yogur griego con plátano y cacao": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el yogur en un bol.",
      "Añade el cacao en polvo ANTES que el plátano y remueve hasta que no queden grumos secos: echado sobre la fruta se queda en polvo flotando y no se integra.",
      "Corta el plátano en rodajas y repártelas por encima. Usa cacao puro sin azúcar, no un preparado soluble para leche: ese es casi todo azúcar."
    ]
  },

  "Requesón con piña": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Si la piña es de lata, escúrrela bien; si es fresca, córtale la base y la corona, pélala de arriba abajo y quita los puntitos marrones que queden.",
      "Córtala en trozos y retira el tronco central si está duro.",
      "Pon el requesón en un bol y reparte la piña por encima. Mézclalo justo antes de comer: la piña fresca vuelve líquido el requesón si se queda mezclado un buen rato."
    ]
  },

  "Mantequilla de cacahuete con manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava la manzana, quítale el corazón y córtala en gajos de un dedo de grosor.",
      "Remueve el bote de mantequilla de cacahuete para reintegrar el aceite que se ha separado arriba.",
      "Sirve la mantequilla en un montoncito al lado y ve mojando los gajos. Untarla encima de cada gajo es más lento y se cae."
    ]
  },

  "Skyr con kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Comprueba el kiwi apretándolo suavemente: debe ceder un poco. Duro como una piedra está ácido y raspa la lengua.",
      "Córtalo por la mitad y saca la pulpa con una cuchara directamente de la piel, como si fuera un huevo pasado por agua. Es más rápido que pelarlo.",
      "Remueve el skyr en un bol para soltarlo y reparte el kiwi por encima."
    ]
  },

  "Yogur griego con fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava las fresas ENTERAS, con el rabito puesto, y sécalas: si les quitas el rabito antes de lavarlas se llenan de agua por dentro y quedan sosas.",
      "Ahora sí, quítales el rabito y córtalas por la mitad o en cuartos según el tamaño.",
      "Pon el yogur en un bol y reparte las fresas por encima."
    ]
  },

  "Atún con manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre bien la lata de atún: presiona la tapa contra el pescado sobre el fregadero hasta que deje de caer líquido.",
      "Lava la manzana, quítale el corazón y córtala en dados pequeños. Déjale la piel: sujeta el dado y aporta fibra.",
      "Mezcla los dos en un bol. La combinación funciona por el contraste, así que corta la manzana justo antes de comer para que siga crujiente."
    ]
  },

  "Jamón serrano con manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca el jamón de la nevera 10 minutos antes: en frío la grasa está dura y sabe a poco; a temperatura ambiente se suelta el aroma.",
      "Lava la manzana, quítale el corazón y córtala en gajos finos.",
      "Sirve las lonchas extendidas junto a los gajos, sin amontonarlas: apiladas se pegan entre sí y luego se rompen al separarlas."
    ]
  },

  "Huevo duro con zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Pon los huevos en una olla pequeña y cúbrelos con agua fría, dos dedos por encima. Empezar en agua fría evita que se rajen al entrar.",
      "Lleva a hervor a fuego fuerte y, desde que borbotea, cuenta 10 minutos exactos para que la yema quede cuajada pero no gris.",
      "Sácalos y ponlos en un bol con agua fría 2 minutos: se cortan de cocer y la cáscara sale mucho mejor.",
      "Mientras, lava la zanahoria, pélala y córtala en bastones. Pela los huevos empezando por la parte gorda, que es donde está la cámara de aire."
    ]
  },

  "Hummus con zanahoria y pepino": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava y pela la zanahoria y córtala en bastones de un dedo de grosor, lo bastante firmes para no romperse al mojar.",
      "Lava el pepino y córtalo en bastones parecidos. Si la piel es muy gruesa o amarga, pélalo a tiras dejando parte de la piel.",
      "Pon el hummus en un cuenco pequeño y coloca los bastones alrededor. Sírvelo aparte y no por encima: mezclado, las verduras se ablandan."
    ]
  },

  "Edamame con sal": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Pon agua a hervir con una cucharada de sal. No hace falta descongelar el edamame antes.",
      "Échalo congelado al agua hirviendo y cuécelo 5 minutos: debe quedar tierno pero con el grano entero, no deshecho.",
      "Escúrrelo y espolvorea sal gorda por encima estando aún caliente, que es cuando se agarra.",
      "Se come sacando el grano con los dientes y apretando la vaina. La vaina NO se come, se tira."
    ]
  },

  "Queso fresco con jamón y pepino": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el queso fresco batido en un bol y remuévelo un poco para que quede suelto.",
      "Lava el pepino y córtalo en dados pequeños. Si suelta mucha agua, déjalo 5 minutos en un colador con un pellizco de sal y escúrrelo.",
      "Corta el jamón cocido en tiras y mézclalo todo. Sala con cuidado al final: el jamón ya sala bastante por su cuenta."
    ]
  },

  "Pavo loncheado con queso y tortitas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon las tortitas de arroz en un plato.",
      "Reparte encima el queso primero y el pavo después: el queso hace de pegamento y evita que el pavo se resbale al cogerlo.",
      "Monta las tortitas justo antes de comer. Si las dejas hechas, la humedad del pavo las ablanda en 10 minutos."
    ]
  },

  "Huevo duro con sal y tortita": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Cubre los huevos con agua fría en una olla pequeña, dos dedos por encima, y ponlos a fuego fuerte.",
      "Desde que el agua hierve a borbotones, cuenta 10 minutos exactos.",
      "Pásalos a un bol con agua fría 2 minutos y pélalos empezando por el extremo gordo.",
      "Córtalos en rodajas sobre las tortitas de arroz y sala por encima. Si la yema tiene un anillo verdoso, se han pasado de tiempo: se comen igual, solo que saben más a azufre."
    ]
  },

  "Atún con tostadas integrales": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta las rebanadas hasta que estén doradas y suenen huecas al golpearlas.",
      "Escurre el atún apretando la tapa contra el pescado sobre el fregadero.",
      "Repártelo sobre el pan ya tostado y aplástalo un poco con el tenedor para que no se caiga al morder."
    ]
  },

  "Tortitas con queso fresco y mermelada": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon las tortitas de arroz en un plato.",
      "Reparte el queso fresco batido por encima con el dorso de una cuchara, sin apretar: las tortitas se parten con muy poca fuerza.",
      "Añade la mermelada en puntos por encima en vez de extenderla: así cada bocado lleva algo y no se empapa la tortita entera.",
      "Cómelas al momento. Montadas y guardadas se ablandan enseguida."
    ]
  },

  "Pan de molde con queso fresco y pavo": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Extiende el queso fresco batido sobre las dos rebanadas, llegando hasta los bordes: así el pavo no se desliza al morder.",
      "Reparte las lonchas de pavo por encima, dobladas sobre sí mismas en vez de estiradas, para que quede más jugoso al morder.",
      "Ciérralo y córtalo en diagonal si lo vas a llevar encima: aguanta mejor y es más cómodo de comer."
    ]
  },

  // ══ LOTE 2 (2026-08-26) ═══════════════════════════════════════════════
  // Aquí empieza el problema de verdad. El lote 1 eran platos de montar; en
  // estos hay que COCINAR, que es literalmente lo que ella no pudo hacer.
  // Todos llevan sartén, olla u horno, y todos dicen CÓMO SABER que está
  // hecho -- que es el dato que falta cuando nunca has cocinado: el tiempo
  // del paquete no sirve si no sabes qué estás buscando.

  "Pollo a la plancha con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Saca el pollo de la nevera 10 minutos antes. Frío por dentro se hace por fuera antes de estar listo por dentro.",
      "Si la pechuga es muy gruesa, ábrela por la mitad a lo ancho como un libro: así se hace en la mitad de tiempo y sin quedar cruda en el centro.",
      "Sécala con papel de cocina. Es el paso que más se salta y el que decide si se dora o se cuece en su propia agua.",
      "Pon la sartén a fuego medio-alto con una cucharada de aceite y espera a que el aceite brille y se mueva con facilidad.",
      "Coloca el pollo y NO LO TOQUES 4 minutos. Moverlo antes impide que se forme la costra dorada y lo pega a la sartén.",
      "Dale la vuelta y haz 4 minutos más. Está hecho cuando al pinchar la parte más gruesa sale jugo transparente, no rosado.",
      "Mientras, cuece el brócoli en agua hirviendo con sal 4 minutos: debe quedar verde vivo y ceder al pincharlo, no blando.",
      "Deja reposar el pollo 2 minutos antes de cortarlo, o todo el jugo se queda en la tabla. Sirve con el arroz."
    ]
  },

  "Huevos revueltos con pavo y tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Casca los huevos en un bol y bátelos con un pellizco de sal hasta que no queden hilos de clara transparente.",
      "Pon el pan a tostar ahora: los huevos revueltos se hacen en dos minutos y no esperan a nadie.",
      "Calienta la sartén a fuego BAJO con unas gotas de aceite. El fuego fuerte es el error clásico: cuaja el huevo en grumos secos.",
      "Echa el huevo y espera 20 segundos sin tocar. Cuando empiece a cuajar por abajo, remueve despacio llevando el cuajado hacia el centro.",
      "Añade el pavo cortado en tiras cuando el huevo esté a medio hacer, todavía brillante.",
      "Retíralos del fuego cuando aún parezcan un poco crudos: el calor de la sartén termina de cuajarlos en el plato. Si esperas a que parezcan listos, llegan secos."
    ]
  },

  "Claras revueltas con espinacas y tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Pon el pan a tostar.",
      "Saltea las espinacas 1 minuto en la sartén caliente con unas gotas de aceite, hasta que se vengan abajo. Reducen muchísimo: el puñado enorme se queda en nada, es normal.",
      "Si han soltado agua, escúrrela o apártalas: esa agua aguaría las claras.",
      "Baja el fuego, echa las claras con un pellizco de sal y remueve despacio.",
      "Las claras cuajan más rápido que el huevo entero y se secan con nada. Sácalas en cuanto no quede líquido transparente, todavía brillantes.",
      "Devuelve las espinacas, mezcla y sirve sobre el pan tostado."
    ]
  },

  "Lentejas con verduras y arroz": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Las lentejas ya vienen cocidas de bote: enjuágalas en un colador bajo el grifo hasta que el agua salga clara. Ese líquido espeso del bote sabe a lata.",
      "Lava y pela la zanahoria y córtala en rodajas finas, de medio centímetro: más gruesas no se hacen en el tiempo que lleva esto.",
      "Pon la zanahoria en una olla con un dedo de agua y una cucharada de aceite, tapa y cuece 6 minutos a fuego medio.",
      "Añade las lentejas escurridas y el arroz, remueve y calienta 3 minutos más. Remueve poco y con suavidad: las lentejas de bote se deshacen enseguida.",
      "Prueba de sal antes de servir. Las de bote suelen venir sosas."
    ]
  },

  "Carne picada con arroz y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calienta la sartén a fuego alto con una cucharada de aceite antes de echar la carne. En sartén fría suelta agua y se cuece gris en vez de dorarse.",
      "Echa la carne y espárcela, pero no la remuevas durante el primer minuto: deja que se dore por abajo.",
      "Rómpela con la cuchara en trozos pequeños y saltea 4 o 5 minutos, hasta que no quede nada rosa.",
      "Si suelta mucha agua, sube el fuego y deja que se evapore antes de seguir, o el plato queda aguado.",
      "Añade las verduras congeladas SIN descongelar y saltea 4 minutos más a fuego fuerte. Descongelarlas antes las deja blandas.",
      "Incorpora el arroz, mezcla 1 minuto para que coja el sabor de la sartén y sala al final."
    ]
  },

  "Salmón con patatas al horno y brócoli": {
    difficulty: 2,
    equipment: ["horno", "olla"],
    steps: [
      "Enciende el horno a 200 grados con calor arriba y abajo. Espera a que llegue: meter comida en un horno frío cambia todos los tiempos.",
      "Corta la patata en rodajas de un centímetro, extiéndelas en la bandeja con una cucharada de aceite y sal, y hornea 15 minutos.",
      "Seca el salmón con papel de cocina y sálalo por los dos lados.",
      "Ponlo sobre las patatas, con la piel hacia abajo, y hornea 12 minutos más.",
      "Está listo cuando al presionar con el dedo se abre en láminas y el centro ha pasado de rojo intenso a rosa mate. Si esperas a que esté igual por todas partes, ya está seco.",
      "Mientras, cuece el brócoli 4 minutos en agua hirviendo con sal y escúrrelo bien."
    ]
  },

  "Garbanzos con espinacas y huevo": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Enjuaga los garbanzos de bote en un colador hasta que el agua salga limpia.",
      "Pon el huevo a cocer: cúbrelo con agua fría, lleva a hervor y cuenta 10 minutos desde que borbotea.",
      "En una sartén con una cucharada de aceite a fuego medio, saltea las espinacas 1 minuto, solo hasta que se vengan abajo.",
      "Añade los garbanzos escurridos y saltea 3 minutos removiendo con suavidad, para que cojan calor sin romperse.",
      "Enfría el huevo 2 minutos en agua fría, pélalo empezando por el extremo gordo y córtalo en cuartos.",
      "Sirve el huevo encima. Sala al final: los garbanzos de bote ya llevan sal."
    ]
  },

  "Tofu salteado con arroz y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "ESCURRE EL TOFU EN SERIO: envuélvelo en papel de cocina, ponle encima un plato con algo de peso y déjalo 10 minutos. El tofu está lleno de agua y sin este paso es imposible que se dore.",
      "Córtalo en dados de dos centímetros y sálalos.",
      "Calienta la sartén a fuego alto con una cucharada de aceite, hasta que el aceite brille.",
      "Echa los dados separados, sin amontonar, y déjalos 3 minutos sin tocar hasta que se despeguen solos. Si tiras de ellos antes, se rompen y dejan la costra pegada.",
      "Dales la vuelta y dora otros 3 minutos. Sácalos a un plato.",
      "En la misma sartén saltea las verduras congeladas 4 minutos a fuego fuerte, devuelve el tofu, añade el arroz y mezcla 1 minuto."
    ]
  },

  "Merluza al vapor con verduras": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Pon dos dedos de agua en una olla con un colador metálico encima, sin que el agua toque el colador, y lleva a hervor.",
      "Sala la merluza por los dos lados y ponla en el colador con las verduras y la patata en trozos alrededor.",
      "Tapa y cuece al vapor 8 minutos. No destapes cada poco: cada vez que levantas la tapa se escapa el vapor y hay que volver a empezar.",
      "Está lista cuando la carne pasa de translúcida a blanca opaca y se separa en lascas al empujarla con el tenedor.",
      "La merluza al vapor se pasa en menos de un minuto y queda seca y correosa, así que compruébala al minuto 7."
    ]
  },

  "Ternera salteada con pasta y tomate": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Corta la ternera en tiras finas A CONTRAVETA, es decir cruzando las líneas que se ven en la carne y no siguiéndolas. Cortada a favor queda dura por mucho que la hagas.",
      "Pon la pasta a cocer en abundante agua hirviendo con una cucharada colmada de sal.",
      "Calienta la sartén a fuego MUY alto con una cucharada de aceite. La ternera necesita más calor que el pollo.",
      "Echa las tiras en una sola capa y hazlas 2 minutos por cada lado, no más. Se hace en nada y pasarse la endurece.",
      "Retírala a un plato mientras terminas, y añade el tomate troceado a la sartén 2 minutos para que se deshaga.",
      "Escurre la pasta reservando medio vaso del agua, mézclala con el tomate y devuelve la carne con su jugo. Si queda seca, añade agua de cocción: el almidón liga la salsa."
    ]
  },

  "Caballa con patata cocida y verduras": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Corta la patata en dados de tres centímetros y cuécela en agua con sal 12 minutos, hasta que un cuchillo entre sin resistencia.",
      "Escurre la lata de caballa inclinándola con la tapa medio puesta.",
      "En el último minuto de cocción, echa las espinacas al mismo agua: se hacen en 30 segundos.",
      "Escurre todo bien y deja que salga el vapor 1 minuto, o la humedad aguará el plato.",
      "Sirve la caballa por encima en trozos grandes, sin removerla: se deshace en migas si insistes."
    ]
  },

  "Pasta con pavo y tomate": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon una olla con un litro de agua por cada 100 g de pasta a fuego fuerte.",
      "Corta el pavo en tiras y sécalo con papel. Sálalo justo antes de la sartén, no antes: la sal lo hace soltar agua.",
      "Cuando el agua hierva a borbotones, añade una cucharada colmada de sal y luego la pasta. Remueve al echarla y otra vez al minuto.",
      "En una sartén a fuego medio-alto con una cucharada de aceite, haz el pavo 3 minutos por cada lado. El pavo es muy magro y se seca antes que el pollo: en cuanto pierde el rosa, fuera.",
      "Añade el tomate troceado y deja 3 minutos a fuego medio hasta que se deshaga.",
      "Prueba la pasta un minuto ANTES de lo que diga el paquete: tierna pero con resistencia al morder. Escúrrela guardando medio vaso del agua y mézclalo todo."
    ]
  },

  "Bowl de arroz con atún y aguacate": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Comprueba el aguacate apretando cerca del rabito: debe ceder un poco. Duro como una piedra no madura en el plato.",
      "Ábrelo rodeándolo con el cuchillo a lo largo hasta el hueso, gira las dos mitades en sentidos contrarios y sepáralas.",
      "Saca la carne con una cuchara pegada a la piel y córtala en láminas. Hazlo AL FINAL: el aguacate cortado se oscurece en minutos.",
      "Escurre bien el atún y corta el pepino en medias lunas.",
      "Monta el arroz de base y coloca encima el atún, el aguacate y el pepino en zonas separadas en vez de mezclarlo todo: así cada cucharada la eliges tú."
    ]
  },

  "Pollo al limón con batata y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "horno"],
    steps: [
      "Enciende el horno a 200 grados. Corta la batata en dados de dos centímetros, extiéndela con una cucharada de aceite y sal, y hornea 25 minutos.",
      "La batata se dora antes que la patata porque lleva más azúcar: si ves los bordes muy oscuros a media cocción, baja a 180.",
      "Abre la pechuga por la mitad a lo ancho si es gruesa, sécala y sálala.",
      "Hazla en la sartén a fuego medio-alto, 4 minutos por lado, sin moverla el primer par de minutos.",
      "Exprime medio limón sobre el pollo en la sartén ya fuera del fuego. Añadirlo al principio corta la cocción y el pollo queda pálido.",
      "Cuece el brócoli 4 minutos en agua hirviendo con sal. Está listo cuando el cuchillo entra pero el tallo aún ofrece resistencia."
    ]
  },

  "Muslos de pollo al horno con patatas": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 grados y espera a que llegue.",
      "Corta las patatas en rodajas de un centímetro y ponlas en la bandeja con una cucharada de aceite y sal, formando una capa.",
      "Seca los muslos con papel, sálalos y colócalos SOBRE las patatas: su grasa cae encima y las hace mucho mejores.",
      "Hornea 35 minutos. El muslo aguanta el horno mucho mejor que la pechuga, así que no tengas prisa: quedarse corto es peor que pasarse.",
      "Está hecho cuando al pinchar junto al hueso sale jugo transparente. Si sale rosado, 5 minutos más.",
      "Saltea las espinacas 1 minuto en una sartén o échalas a la bandeja los últimos 2 minutos."
    ]
  },

  "Tortilla de claras con queso y vegetales": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Lava y corta el tomate en dados pequeños y escúrrelo un momento: si va empapado, la tortilla no cuaja.",
      "Saltea las espinacas 1 minuto en la sartén con unas gotas de aceite y resérvalas.",
      "Bate las claras con un pellizco de sal 30 segundos, hasta que hagan un poco de espuma.",
      "Con la sartén a fuego MEDIO-BAJO y bien untada de aceite, echa las claras y reparte por encima las espinacas, el tomate y el queso.",
      "Deja 3 minutos sin tocar. Las claras solas se pegan mucho más que el huevo entero, así que no intentes moverla antes de tiempo.",
      "Cuando la superficie deje de estar líquida, dóblala por la mitad con una espátula y hazla 1 minuto más. Doblarla es más fácil que darle la vuelta entera y se rompe menos."
    ]
  },

  "Huevos al plato con espinacas y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Lava y trocea el tomate. Saltéalo en la sartén con una cucharada de aceite 4 minutos a fuego medio, hasta que se deshaga.",
      "Añade las espinacas y remueve 1 minuto, hasta que bajen.",
      "Haz dos huecos en la verdura con la cuchara y casca un huevo en cada uno. Cáscalos primero en una taza si no tienes práctica: así una cáscara rota no arruina la sartén.",
      "Baja el fuego, tapa la sartén y deja 4 minutos.",
      "Están listos cuando la clara está blanca y firme pero la yema todavía tiembla al mover la sartén. Sala solo la clara: la sal sobre la yema le deja puntitos blancos.",
      "Si te gusta la yema cuajada, 2 minutos más tapado."
    ]
  },

  "Pavo salteado con pasta y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon la pasta a cocer en agua hirviendo con una cucharada colmada de sal.",
      "Corta el pavo en tiras, sécalo con papel y sálalo justo antes de cocinarlo.",
      "Saltéalo en la sartén a fuego medio-alto con una cucharada de aceite, 3 minutos por lado. En cuanto pierde el color rosa está hecho: el pavo pasado queda como serrín.",
      "Añade las espinacas y remueve 1 minuto, solo hasta que bajen.",
      "Escurre la pasta reservando medio vaso del agua y mézclala en la sartén.",
      "Si queda seca, añade un poco del agua reservada: lleva almidón y liga el conjunto mucho mejor que el aceite."
    ]
  },

  "Sopa de lentejas con pan integral": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Enjuaga las lentejas de bote en un colador hasta que el agua salga clara.",
      "Pela y corta la zanahoria en rodajas finas y ponla en la olla con medio litro de agua y una cucharada de aceite.",
      "Cuece 8 minutos a fuego medio, hasta que la zanahoria ceda al pincharla.",
      "Añade las lentejas y calienta 5 minutos más. No la dejes hervir fuerte: a borbotones las lentejas de bote se deshacen y la sopa se vuelve puré.",
      "Prueba de sal, que suele hacer falta, y sirve con el pan aparte para mojar."
    ]
  },

  "Crema de lentejas con pan integral": {
    difficulty: 2,
    equipment: ["olla", "batidora"],
    steps: [
      "Enjuaga las lentejas de bote hasta que el agua salga clara.",
      "Pela y trocea la zanahoria y cuécela 10 minutos en la olla con medio litro de agua, hasta que esté muy blanda. Para triturar tiene que estar MÁS hecha que para comerla entera.",
      "Añade las lentejas, calienta 3 minutos y retira del fuego.",
      "Tritura con la batidora dentro de la olla, con la olla fuera del fuego y la batidora bien hundida antes de encenderla: si la enciendes a media altura, salpica crema hirviendo.",
      "Si queda demasiado espesa, añade agua caliente poco a poco. Añadirla fría de golpe corta la textura.",
      "Sala al final y sirve con el pan."
    ]
  },

  "Salmón a la plancha con espinacas y limón": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca el salmón muy bien con papel de cocina, sobre todo la piel. La piel húmeda no queda crujiente nunca.",
      "Sálalo por los dos lados justo antes de cocinarlo.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite y pon el salmón CON LA PIEL HACIA ABAJO.",
      "Presiona el lomo con la espátula los primeros 20 segundos: el salmón se curva al calentarse y así la piel toca la sartén entera.",
      "Hazlo 4 minutos por el lado de la piel sin moverlo, y 2 minutos por el otro lado. Verás el color pálido subir por el lateral: cuando llega a media altura, dale la vuelta.",
      "Saltea las espinacas y el brócoli en la misma sartén 2 minutos y exprime limón por encima al servir, fuera del fuego."
    ]
  },

  "Atún con brócoli y patata": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Corta la patata en dados de tres centímetros y ponla a cocer en agua con sal 12 minutos.",
      "Añade el brócoli en ramilletes a la MISMA olla en los últimos 4 minutos. Un cacharro menos que fregar y el resultado es el mismo.",
      "Comprueba con la punta de un cuchillo: debe entrar en la patata sin esfuerzo y encontrar algo de resistencia en el tallo del brócoli.",
      "Escurre y deja escapar el vapor 1 minuto antes de servir.",
      "Escurre el atún y repártelo por encima en trozos grandes, sin deshacerlo."
    ]
  },

  "Hamburguesa de pavo con ensalada": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Sala el pavo picado y compáctalo en un disco un poco más ancho que el pan: al hacerse encoge y sube por el centro.",
      "Hazle un hoyo con el pulgar en el medio. Sin ese hoyo la hamburguesa se abomba y queda como una pelota.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite y pon la hamburguesa sin tocarla 4 minutos.",
      "Dale UNA sola vuelta y haz 4 minutos más. Aplastarla con la espátula, que es lo que todo el mundo hace, exprime el jugo y la deja seca.",
      "El pavo tiene que quedar hecho del todo, sin rosa en el centro, a diferencia de la ternera.",
      "Monta con el tomate en rodajas y las espinacas, y deja reposar 1 minuto antes de cerrar."
    ]
  },

  "Lomo de cerdo asado con batata": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 grados. Saca el lomo de la nevera mientras calienta.",
      "Corta la batata en dados de dos centímetros y extiéndela en la bandeja con una cucharada de aceite y sal.",
      "Seca el lomo, sálalo por todos lados y ponlo entero en el centro de la bandeja. Entero y no en filetes: así conserva el jugo.",
      "Asa 25 minutos. El lomo es magrísimo y pasarse lo deja seco y harinoso, así que quédate corto antes que largo.",
      "Está hecho cuando al pincharlo en el centro sale jugo transparente. Un puntito rosa pálido en el centro es correcto en el cerdo actual.",
      "Déjalo reposar 5 minutos ANTES de cortarlo: es el paso que más cambia el resultado en una pieza entera. Añade las espinacas crudas o salteadas al servir."
    ]
  },

  "Arroz con pollo y pimiento": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el pollo en dados de dos centímetros, sécalos con papel y sálalos.",
      "Calienta la sartén a fuego alto con una cucharada de aceite y dora el pollo 5 minutos, removiendo solo de vez en cuando para que llegue a dorarse.",
      "Baja a fuego medio y añade el maíz escurrido, salteando 2 minutos.",
      "Incorpora el arroz ya cocido y remueve 2 minutos, separándolo con la cuchara si viene apelmazado.",
      "Deja el último minuto sin remover para que el arroz del fondo se tueste un poco: es la parte buena y no pasa si lo mueves todo el rato.",
      "Prueba de sal antes de servir."
    ]
  },

  // ══ LOTE 3 (2026-08-26) ═══════════════════════════════════════════════
  // Elegidos por VARIEDAD DE TÉCNICA, no por orden de lista: cada uno
  // enseña algo que no se deduce solo (el cuscús se hace fuera del fuego,
  // el pil-pil liga con la gelatina del propio bacalao, la pasta de curry
  // hay que freírla antes de mojarla). Ninguno lleva cebolla ni ajo: esos
  // roles siguen sin nutrición hasta que llegue USDA.

  "Huevos al plato con jamón y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Trocea el tomate y saltéalo en la sartén con una cucharada de aceite de oliva 4 minutos a fuego medio, hasta que se deshaga.",
      "Añade el jamón cocido en tiras y remueve 1 minuto, solo para que coja calor. Si lo fríes se pone correoso.",
      "Haz dos huecos con la cuchara y casca un huevo en cada uno. Cáscalos antes en una taza si no tienes práctica.",
      "Baja el fuego, tapa y deja 4 minutos.",
      "Listos cuando la clara está blanca y firme pero la yema tiembla al mover la sartén. Sala solo la clara: la sal sobre la yema deja puntos blancos."
    ]
  },

  "Wrap de desayuno con huevo y pavo": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Bate los huevos con un pellizco de sal.",
      "Cuájalos a fuego BAJO removiendo despacio y sácalos cuando aún parezcan poco hechos: seguirán cuajando con su propio calor.",
      "Calienta la tortilla de trigo 20 segundos por cada lado en la sartén seca, sin aceite. Fría se agrieta al doblarla; caliente se dobla sin romperse.",
      "Pon el relleno en el TERCIO INFERIOR de la tortilla, no en el centro: es lo que permite cerrarla sin que se salga.",
      "Añade el huevo, el pavo y el tomate en dados, dobla los dos lados hacia dentro y enrolla desde abajo apretando un poco.",
      "Si lo vas a llevar, envuélvelo en papel de horno: aguanta cerrado mucho mejor."
    ]
  },

  "Crepes de avena con requesón y fruta": {
    difficulty: 2,
    equipment: ["sarten", "batidora"],
    steps: [
      "Tritura la avena con los huevos y un pellizco de sal hasta que no queden grumos. Debe quedar como una nata líquida: si está espesa, añade un chorrito de agua.",
      "DEJA REPOSAR LA MASA 10 MINUTOS. La avena absorbe líquido y espesa; sin reposo la primera crepe sale con la textura mal y la última bien.",
      "Saca los frutos rojos del congelador ahora, para que se descongelen mientras.",
      "Calienta la sartén a fuego medio y úntala con una gota de aceite extendida con papel de cocina. Charco de aceite = crepe frita, no crepe.",
      "Echa un cucharón y gira la sartén enseguida para repartir la masa fina y pareja.",
      "Dale la vuelta cuando los bordes se despeguen solos y la superficie deje de brillar, alrededor de 2 minutos. Si tiras antes, se rompe.",
      "Haz 1 minuto por el otro lado y rellena con el requesón y la fruta."
    ]
  },

  "French toast proteico con yogur": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Bate los huevos en un plato hondo, ancho como el pan.",
      "Moja el pan 10 segundos POR CADA LADO, no más. Es el error clásico: dejarlo en remojo lo empapa hasta el centro y se deshace en la sartén.",
      "Escúrrelo un momento sobre el plato antes de llevarlo a la sartén.",
      "Con la sartén a fuego MEDIO-BAJO y una gota de aceite, hazlo 3 minutos por cada lado. A fuego fuerte se quema por fuera con el huevo aún crudo dentro.",
      "Está listo cuando la superficie está dorada y firme al tocarla, no blanda.",
      "Sirve con el yogur por encima."
    ]
  },

  "Pollo al curry con arroz basmati": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el pollo en dados de dos centímetros, sécalos y sálalos.",
      "Dóralos en la sartén a fuego alto con una cucharada de aceite, 5 minutos, y sácalos a un plato.",
      "Baja a fuego medio y FRÍE EL CURRY EN EL ACEITE 30 segundos antes de añadir nada líquido. Es el paso que todo el mundo se salta: en crudo el curry sabe a polvo, y al freírse suelta el aroma.",
      "Añade las verduras congeladas y saltea 4 minutos.",
      "Devuelve el pollo con el jugo que haya soltado en el plato, mezcla y deja 2 minutos más.",
      "Sirve sobre el arroz. Prueba de sal al final: el curry ya lleva bastante."
    ]
  },

  "Lentejas estofadas con muslos de pollo": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Seca los muslos y sálalos. Dóralos en la olla con una cucharada de aceite, 3 minutos por cada lado, hasta que cojan color.",
      "Ese dorado no es decorativo: deja pegado en el fondo lo que dará sabor al guiso entero.",
      "Añade la zanahoria en rodajas y un vaso de agua, y raspa el fondo con la cuchara para despegar lo dorado.",
      "Tapa y cuece 15 minutos a fuego medio-bajo, para que el muslo se ablande.",
      "Enjuaga las lentejas de bote, añádelas y calienta 5 minutos más SIN remover apenas: de bote se deshacen enseguida.",
      "Si queda caldoso, destapa y sube el fuego 2 minutos. Prueba de sal antes de servir."
    ]
  },

  "Wrap de pavo con queso y lechuga": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Calienta el wrap 20 segundos por cada lado en la sartén seca. Frío se parte al doblarlo.",
      "Extiende el queso sobre el wrap templado, hasta cerca de los bordes: hace de pegamento y evita que el relleno resbale.",
      "Pon el pavo y el tomate en dados en el tercio inferior, no en el centro.",
      "Dobla los dos lados hacia dentro PRIMERO y luego enrolla desde abajo. Si enrollas sin doblar los lados, se sale todo por los extremos.",
      "Córtalo en diagonal para comerlo más cómodo."
    ]
  },

  "Ternera con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Si la quinoa no viene ya cocida, ENJUÁGALA en un colador fino un minuto bajo el grifo. Lleva una capa natural amarga y sin quitarla el plato sabe a jabón.",
      "Corta la ternera en tiras finas a contraveta, cruzando las líneas de la carne y no siguiéndolas.",
      "Cuece el brócoli 4 minutos en agua hirviendo con sal: verde vivo y con resistencia al pincharlo.",
      "Calienta la sartén a fuego MUY alto con una cucharada de aceite.",
      "Haz la ternera en una sola capa, 2 minutos por lado y fuera. Amontonada suelta agua y se cuece gris en vez de dorarse.",
      "Mezcla con la quinoa y el brócoli, y sala al final."
    ]
  },

  "Spaghetti boloñesa ligera": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon el agua de la pasta a hervir con una cucharada colmada de sal.",
      "Calienta la sartén a fuego alto con una cucharada de aceite y echa la carne picada SIN removerla el primer minuto, para que se dore por abajo.",
      "Rómpela en trozos pequeños y saltea 5 minutos hasta que no quede rosa.",
      "Si suelta agua, sube el fuego y espera a que se evapore antes de seguir: mientras haya agua, la carne se cuece en vez de dorarse.",
      "Añade el tomate troceado y deja 8 minutos a fuego medio-bajo. Cuanto más tiempo, mejor la salsa; es el ingrediente que de verdad mejora esperando.",
      "Cuece la pasta un minuto menos de lo que diga el paquete, escúrrela guardando medio vaso de agua y termínala 1 minuto EN LA SARTÉN con la salsa. Así se impregna, en vez de quedar la salsa encima."
    ]
  },

  "Lomo de cerdo con patatas al horno y ensalada": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 grados y espera a que llegue.",
      "Corta las patatas en rodajas de un centímetro y extiéndelas en la bandeja con una cucharada de aceite y sal, en una sola capa. Amontonadas se cuecen al vapor y no se doran.",
      "Seca el lomo, sálalo y ponlo entero encima de las patatas.",
      "Asa 25 minutos. Entero y no en filetes: en pieza conserva el jugo.",
      "Está hecho cuando al pinchar el centro sale jugo transparente; un rosa pálido en el medio es correcto en el cerdo de hoy.",
      "Deja reposar 5 minutos antes de cortarlo. Sirve con el tomate en rodajas y sal."
    ]
  },

  "Salmón con cuscús y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "EL CUSCÚS NO SE CUECE. Ponlo en un bol, cúbrelo con agua hirviendo justo un dedo por encima, tapa con un plato y déjalo 5 minutos FUERA del fuego.",
      "Sepáralo con un tenedor, nunca con cuchara: la cuchara lo apelmaza en pasta.",
      "Seca el salmón y sálalo por los dos lados.",
      "Hazlo en la sartén a fuego medio-alto con una cucharada de aceite, con la piel abajo, 4 minutos sin moverlo, presionándolo los primeros segundos porque se curva.",
      "Dale la vuelta y 2 minutos más. Verás el color pálido subir por el lateral: cuando llega a media altura, está.",
      "Saltea las verduras congeladas 4 minutos a fuego fuerte en la misma sartén y mézclalas con el cuscús."
    ]
  },

  "Merluza al horno con arroz y limón": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 190 grados.",
      "Seca la merluza, sálala y ponla en una fuente con una cucharada de aceite y unas rodajas de limón por encima.",
      "Hornea 12 minutos. El pescado blanco pasa de crudo a seco en un par de minutos, así que empieza a mirarlo al minuto 10.",
      "Está lista cuando la carne pasa de translúcida a blanca opaca y se separa en lascas al empujar con el tenedor.",
      "Saltea las espinacas 1 minuto aparte, o mételas en la fuente los últimos 2 minutos.",
      "Sirve con el arroz y riega con el jugo de la fuente: lleva el limón y el aceite."
    ]
  },

  "Bacalao al pil-pil con patatas": {
    difficulty: 3,
    equipment: ["sarten", "olla"],
    steps: [
      "Cuece la patata en dados 12 minutos en agua con sal, hasta que el cuchillo entre sin esfuerzo.",
      "Seca el bacalao. Si es salado, tiene que estar YA desalado: 24 horas en la nevera en agua, cambiándola tres veces. Sin eso el plato es incomible.",
      "Calienta dos cucharadas de aceite en una sartén a fuego BAJO. El pil-pil se hace a fuego bajo o no se hace.",
      "Pon el bacalao con la piel hacia abajo y déjalo 8 minutos a fuego suave. La piel va soltando una gelatina que enturbia el aceite: ESA gelatina es la salsa.",
      "Saca el pescado y retira la sartén del fuego. Deja que el aceite se temple un minuto, porque hirviendo no liga.",
      "Mueve la sartén en círculos, sin parar, 2 o 3 minutos. El aceite y la gelatina se van uniendo en una salsa clara y espesa. Es cuestión de insistir: parece que no pasa nada hasta que de pronto liga.",
      "Si se corta, añade una cucharada de agua fría y sigue moviendo. Devuelve el bacalao a la salsa y sirve con la patata y el tomate."
    ]
  },

  "Ensalada de atún con quinoa y tomate": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre el atún apretando la tapa sobre el fregadero hasta que deje de caer líquido.",
      "Lava y corta el tomate y el pepino en dados del mismo tamaño: en una ensalada de cuchara todo debe caber junto.",
      "Si el pepino suelta mucha agua, déjalo 5 minutos en un colador con un pellizco de sal y escúrrelo.",
      "Mezcla la quinoa con las verduras y el atún y aliña con una cucharada de aceite de oliva y sal.",
      "Alíñala JUSTO antes de comer. Aliñada con antelación, la sal saca el agua de las verduras y queda un charco en el fondo."
    ]
  },

  "Ensalada mediterránea con garbanzos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Enjuaga los garbanzos de bote en un colador hasta que el agua salga clara: el líquido del bote sabe a lata y espesa el aliño.",
      "Escúrrelos bien y déjalos secar un momento sobre papel.",
      "Corta el tomate y el pepino en dados.",
      "Abre el aguacate rodeándolo con el cuchillo hasta el hueso, gira las mitades en sentidos contrarios y saca la carne con una cuchara pegada a la piel.",
      "Córtalo AL FINAL, justo antes de servir: se oscurece en minutos.",
      "Aliña con una cucharada de aceite de oliva y sal, y mezcla con suavidad para no deshacer el aguacate."
    ]
  },

  "Alubias con carne picada y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Enjuaga las alubias de bote hasta que el agua salga limpia y escúrrelas.",
      "Calienta la sartén a fuego alto con una cucharada de aceite y dora la carne sin tocarla el primer minuto.",
      "Rómpela y saltea 4 minutos hasta que pierda el rosa.",
      "Añade la zanahoria en rodajas finas y saltea 5 minutos: cortada gruesa no se hace en este tiempo y queda cruda.",
      "Incorpora las alubias y calienta 3 minutos removiendo POCO y con suavidad. Las de bote se rompen con nada y el plato se vuelve puré.",
      "Prueba de sal al final."
    ]
  },

  "Tempeh con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "El tempeh amarga un poco de origen. Si lo cueces al vapor o hervido 5 minutos antes de dorarlo, ese amargor se va: es un paso opcional que cambia mucho el resultado.",
      "Córtalo en láminas de medio centímetro.",
      "Cuece el brócoli 4 minutos en agua hirviendo con sal.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite y dora el tempeh 3 minutos por cada lado, hasta que quede tostado.",
      "Es más firme que el tofu y no se deshace, así que puedes darle la vuelta sin miedo.",
      "Sirve sobre la quinoa con el brócoli y sala al final."
    ]
  },

  "Cuscús con sardinas y tomate": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Calienta agua hasta que hierva. El cuscús no se cuece: se hidrata.",
      "Ponlo en un bol, cúbrelo con el agua hirviendo un dedo por encima, añade una cucharada de aceite y un pellizco de sal, tapa con un plato y espera 5 minutos fuera del fuego.",
      "Sepáralo con un tenedor. Con cuchara se apelmaza.",
      "Escurre las sardinas y trocea el tomate.",
      "Mézclalo todo con cuidado. Si te molestan las espinas, ábrelas a lo largo con el tenedor y tira del hilo central: sale entero."
    ]
  },

  "Bowl de arroz con caballa y verduras": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Saltea las verduras congeladas SIN descongelar, 4 minutos a fuego fuerte con una cucharada de aceite. Descongeladas antes sueltan agua y quedan blandas.",
      "Añade el arroz y remueve 2 minutos, separándolo con la cuchara si viene apelmazado.",
      "Escurre la caballa inclinando la lata con la tapa medio puesta.",
      "Sirve el arroz de base y la caballa por encima en trozos grandes, sin removerla dentro: se deshace en migas.",
      "Prueba de sal: la caballa en lata ya sala."
    ]
  },

  "Muslos de pollo al horno con cuscús": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 grados.",
      "Seca los muslos, sálalos y ponlos en la bandeja con una cucharada de aceite, con la piel hacia arriba si la tienen.",
      "Asa 35 minutos. El muslo perdona mucho más que la pechuga: quedarse corto es peor que pasarse.",
      "Está hecho cuando al pinchar cerca del hueso sale jugo transparente, no rosado.",
      "En los últimos 5 minutos, hidrata el cuscús: agua hirviendo un dedo por encima, tapado, fuera del fuego, y sepáralo con un tenedor.",
      "Cuece el brócoli 4 minutos aparte y riega el cuscús con el jugo de la bandeja."
    ]
  },

  "Pollo tikka masala con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el pollo en dados de dos centímetros, sécalos y sálalos.",
      "Dóralos a fuego alto con una cucharada de aceite, 5 minutos, y resérvalos en un plato.",
      "Baja a fuego medio y fríe la pasta o el polvo de tikka masala 30 segundos en el aceite antes de mojarlo. Sin ese paso sabe a especia cruda.",
      "Añade las verduras congeladas y saltea 4 minutos.",
      "Devuelve el pollo con su jugo y deja 3 minutos a fuego bajo para que se junten los sabores.",
      "Sirve con el arroz integral, que es más firme que el blanco: si viene seco, un chorrito de agua y 1 minuto tapado lo suelta."
    ]
  },

  "Salmón con patata y brócoli al vapor": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Pon dos dedos de agua en la olla con un colador metálico encima, sin que el agua lo toque, y lleva a hervor.",
      "Corta la patata en rodajas finas y ponlas en el colador 8 minutos: es lo que más tarda, así que va primero.",
      "Sala el salmón y colócalo sobre las patatas con el brócoli alrededor. Tapa y cuece 8 minutos más.",
      "No destapes cada poco: cada vez que levantas la tapa escapa el vapor y hay que volver a acumularlo.",
      "El salmón está cuando se abre en láminas al presionarlo y el centro ha pasado de rojo a rosa mate.",
      "Al vapor no hay dorado que dé sabor, así que sala y riega con aceite de oliva crudo al servir. Sin eso sabe a poco."
    ]
  },

  "Merluza a la plancha con arroz y limón": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca muy bien la merluza con papel. Húmeda no se dora: se cuece en su propia agua.",
      "Sálala justo antes de la sartén, no antes: la sal la hace soltar agua.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite hasta que el aceite brille.",
      "Pon la merluza y no la toques 3 minutos. Es un pescado que se rompe con facilidad y moverlo pronto lo deshace.",
      "Dale UNA vuelta con una espátula ancha y hazla 2 minutos más.",
      "Está cuando la carne se separa en lascas al empujarla. Exprime limón fuera del fuego y sirve con el arroz y las espinacas."
    ]
  },

  "Revuelto de atún con claras y tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Pon el pan a tostar y escurre bien el atún.",
      "Bate las claras con un pellizco de sal.",
      "Calienta la sartén a fuego BAJO con unas gotas de aceite. Las claras solas cuajan y se secan más rápido que el huevo entero.",
      "Echa las claras y remueve despacio, llevando lo cuajado hacia el centro.",
      "Añade el atún cuando las claras estén a medio hacer, todavía brillantes, y mezcla con suavidad.",
      "Sácalo del fuego cuando aún parezca un poco crudo. En el plato termina de cuajarse; si esperas, llega seco."
    ]
  },

  "Filete de ternera con ensalada y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Saca el filete de la nevera 15 minutos antes. Frío por dentro se quema por fuera antes de calentarse en el centro.",
      "Sécalo bien y sálalo por los dos lados justo antes de cocinarlo.",
      "Cuece el brócoli 4 minutos en agua hirviendo con sal.",
      "Calienta la sartén a fuego MUY alto con una cucharada de aceite, hasta que el aceite esté a punto de humear. La ternera necesita más calor que cualquier otra carne.",
      "Pon el filete y no lo toques: 2 minutos para poco hecho, 3 para al punto, 4 para hecho. Una sola vuelta.",
      "DÉJALO REPOSAR 3 MINUTOS antes de cortarlo. Es el paso que más cambia el resultado: cortado al momento suelta todo el jugo en el plato.",
      "Sirve con el tomate en rodajas aliñado con aceite y sal."
    ]
  },

  // ══ LOTE 4 (2026-08-26) ═══════════════════════════════════════════════
  // Desayunos y platos de cuchara fríos. Parecen fáciles y es justo donde
  // fallan por PROPORCIÓN y por TIEMPO: la avena necesita una relación de
  // líquido que nadie te dice, el porridge se pega si lo dejas solo, la
  // granola se reblandece si la echas antes de tiempo. Nada de esto se
  // deduce de la lista de ingredientes.

  "Porridge de avena con frutos rojos y skyr": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "La proporción es lo único que importa en un porridge: TRES partes de líquido por UNA de avena. Con 70 g de avena, unos 210 ml de agua o leche.",
      "Pon los dos juntos en la olla EN FRÍO y llévalo a fuego medio. Echar la avena al líquido ya hirviendo hace grumos.",
      "Remueve cada poco durante 5 minutos, rascando el fondo. La avena se pega ahí en cuanto la dejas sola un minuto.",
      "Está cuando la cuchara deja un surco que tarda un segundo en cerrarse. Si queda espesa, un chorro de líquido caliente; si líquida, 1 minuto más.",
      "Retíralo del fuego y espera 2 minutos: sigue espesando fuera del fuego, así que conviene dejarlo un punto más suelto de lo que lo quieres.",
      "Sirve con el skyr encima y los frutos rojos, que habrás sacado del congelador al empezar."
    ]
  },

  "Porridge de avena con mantequilla de cacahuete": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Pon la avena y la leche juntas en la olla en frío, tres partes de leche por una de avena, y lleva a fuego medio.",
      "Remueve cada poco 5 minutos rascando el fondo, que es donde se pega.",
      "Con leche se pega MÁS que con agua y puede subirse de golpe: baja el fuego si ves que borbotea por los bordes.",
      "Fuera del fuego, añade la mantequilla de cacahuete y remueve hasta que se funda del todo. Dentro del fuego se queda hecha una bola pegada al fondo.",
      "Corta el plátano en rodajas y ponlo por encima al servir."
    ]
  },

  "Overnight oats con yogur y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Esto se prepara LA NOCHE ANTES, no es un desayuno para hacer con prisa por la mañana.",
      "Mezcla la avena con el yogur en un bote o un bol. Aquí la proporción es UNA de avena por DOS de yogur, la mitad de líquido que en un porridge caliente.",
      "Si queda como una pasta seca, añade un chorro de leche o agua: tiene que quedar cubierto, porque la avena absorbe mucho durante la noche.",
      "Tapa y deja en la nevera un mínimo de 6 horas. En menos, la avena sigue dura por dentro.",
      "Por la mañana remueve y añade la manzana en dados AL MOMENTO. Cortada la noche antes se oxida y queda marrón y blanda."
    ]
  },

  "Avena con huevo y canela": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Cuece la avena con la leche 5 minutos a fuego medio, removiendo, tres partes de leche por una de avena.",
      "Bate el huevo aparte en un bol, muy bien batido.",
      "RETIRA LA OLLA DEL FUEGO y añade el huevo en un hilo fino mientras remueves sin parar. Echado de golpe o al fuego, el huevo se cuaja en hebras y parece una sopa de huevo.",
      "Vuelve a poner al fuego MUY bajo 1 minuto, removiendo, hasta que espese y quede cremoso.",
      "Añade la canela fuera del fuego. Media cucharadita basta.",
      "Bien hecho no sabe a huevo: queda como unas natas. Si ves hebras blancas, el huevo entró demasiado caliente."
    ]
  },

  "Tostadas con queso fresco y tomate": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta el pan hasta que esté dorado y firme.",
      "Extiende el queso fresco batido sobre el pan TOSTADO Y AÚN CALIENTE, que se extiende mucho mejor.",
      "Lava el tomate y córtalo en rodajas finas, o rállalo si lo prefieres al estilo de la tostada de siempre.",
      "Ponlo encima justo antes de comer. El tomate suelta agua y reblandece el pan en cuestión de minutos.",
      "Sal por encima y, si te gusta, un hilo de aceite de oliva."
    ]
  },

  "Tostadas con pavo y queso lonchas": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta el pan de molde. El de molde se tuesta antes que el de barra: vigílalo, pasa de dorado a quemado muy rápido.",
      "Pon el queso sobre el pan recién salido de la tostadora: el calor lo ablanda y hace de pegamento.",
      "Coloca el pavo encima, doblando las lonchas sobre sí mismas en vez de estiradas: se come mejor y no se resbala.",
      "Si lo quieres tipo mixto, mete el conjunto 30 segundos más en la tostadora, pero solo si es de las que admiten bandeja."
    ]
  },

  "Tostadas con jamón cocido y tomate": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta las rebanadas hasta que estén doradas.",
      "Lava el tomate y córtalo en rodajas finas, o rállalo con el rallador grueso sujetándolo por la piel.",
      "Reparte el tomate sobre el pan y sala ligeramente: la sal es lo que le saca el sabor.",
      "Pon el jamón cocido por encima en tiras anchas.",
      "Móntalo justo antes de comer: montado con antelación, el pan se empapa y se dobla al cogerlo."
    ]
  },

  "Tostadas con mantequilla de cacahuete y plátano": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Remueve el bote de mantequilla de cacahuete antes de usarlo: el aceite se separa arriba y la primera cucharada sin mezclar es solo aceite.",
      "Tuesta el pan y extiende la mantequilla mientras sigue caliente. Sobre pan frío cuesta el doble y rompe la rebanada.",
      "Corta el plátano en rodajas finas y colócalas superpuestas como tejas, para que no se caigan al morder.",
      "Cómelo al momento. Si lo dejas hecho, el plátano se oxida y el pan se ablanda."
    ]
  },

  "Tostadas con ricotta y mermelada": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta el pan de molde vigilándolo, que se quema rápido.",
      "Extiende el requesón sobre el pan caliente, dejando un dedo libre en el borde: al morder se desplaza hacia fuera.",
      "Añade la mermelada en puntos por encima en vez de extenderla en capa: así cada bocado lleva algo y no empapa el pan entero.",
      "Cómelo enseguida, mientras el contraste entre el pan crujiente y el requesón frío todavía existe."
    ]
  },

  "Yogur griego con granola y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador 10 minutos antes y déjalos en un bol a temperatura ambiente.",
      "Pon el yogur en un bol y remuévelo un poco para soltarlo.",
      "Añade los frutos rojos con el jugo que hayan soltado: ese jugo endulza el yogur y no hay que tirarlo.",
      "LA GRANOLA VA LA ÚLTIMA Y JUSTO ANTES DE COMER. Mezclada con antelación se reblandece y pierde lo único que aporta, que es el crujiente."
    ]
  },

  "Skyr con plátano y almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Remueve el skyr en un bol 10 segundos: viene muy compacto y así queda cremoso en vez de en bloque.",
      "Elige un plátano amarillo con algún punto marrón; verde en las puntas sabe a harina.",
      "Córtalo en rodajas y repártelas por encima.",
      "Pica las almendras aplastándolas con el lado plano de un cuchillo ancho sobre la tabla, o pártelas con los dedos, y espárcelas al final."
    ]
  },

  "Skyr con avena y miel": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Aquí la avena va CRUDA, no cocida: absorbe la humedad del skyr y se ablanda sola.",
      "Remueve el skyr para soltarlo y mézclalo con la avena.",
      "Déjalo reposar 5 minutos si puedes esperar. Recién mezclada, la avena cruda raspa un poco; con 5 minutos queda tierna.",
      "Riega con un hilo de miel. Si está muy espesa, mete el bote 10 segundos en agua caliente y sale sola."
    ]
  },

  "Bowl de yogur con fruta y semillas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador al empezar, para que se vayan descongelando.",
      "Pon el yogur en un bol ancho y extiéndelo con el dorso de la cuchara formando una capa lisa.",
      "Corta el plátano en rodajas y colócalo por zonas, junto a los frutos rojos, en vez de mezclarlo todo: así cada cucharada la eliges tú.",
      "Las almendras van al final para que no se humedezcan."
    ]
  },

  "Queso fresco con muesli y naranja": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Corta los dos extremos de la naranja para que se apoye plana y no ruede al pelarla.",
      "Pela de arriba abajo siguiendo la curva, quitando toda la parte blanca, que es la que amarga.",
      "Sepárala en gajos y córtalos por la mitad si son muy grandes.",
      "Pon el queso fresco batido en un bol, añade la naranja y deja la granola para el final, justo antes de comer, o se reblandece."
    ]
  },

  "Bagel integral con queso y salmón ahumado": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Abre el pan por la mitad y tuéstalo por la cara del corte.",
      "Extiende el queso fresco batido sobre el pan aún caliente, hasta los bordes.",
      "Coloca el salmón ahumado por encima formando pliegues sueltos, no estirado plano: así se nota más en boca y no se desliza.",
      "Sácalo de la nevera unos minutos antes: muy frío el salmón ahumado sabe a poco y tiene la grasa dura.",
      "No lo sales. El ahumado ya viene bastante salado."
    ]
  },

  "Bowl de skyr con cacao y nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el skyr en un bol y añade el cacao en polvo ANTES que la fruta, removiendo hasta que no queden grumos secos.",
      "Sobre la fruta el cacao se queda en polvo flotando y no se integra nunca.",
      "Usa cacao puro sin azúcar, no un soluble para leche: ese es casi todo azúcar.",
      "Corta el plátano en rodajas, repártelo por encima y termina con las nueces partidas con los dedos.",
      "Si las nueces amargan mucho, están rancias: es cuestión del fruto seco, no tuya."
    ]
  },

  "Pan integral con atún y tomate": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre el atún apretando la tapa contra el pescado sobre el fregadero hasta que deje de caer líquido.",
      "Lava el tomate y córtalo en rodajas finas.",
      "Reparte el tomate sobre el pan y sálalo ligeramente antes de poner el atún: si salas al final, la sal se queda toda arriba.",
      "Pon el atún por encima y aplástalo un poco con el tenedor para que no se caiga al morder."
    ]
  },

  "Requesón con piña y copos de maíz": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Si la piña es de lata, escúrrela bien; si es fresca, quítale base y corona, pélala de arriba abajo y retira los puntitos marrones.",
      "Corta en trozos y quita el tronco central si está duro.",
      "Pon el requesón en un bol y añade la piña.",
      "Mézclalo JUSTO antes de comer: la piña fresca vuelve líquido el requesón si lo dejas reposar mezclado.",
      "Los copos de maíz, al final del todo, o se ablandan en dos minutos."
    ]
  },

  "Smoothie bowl de skyr con frutos rojos": {
    difficulty: 1,
    equipment: ["batidora"],
    steps: [
      "Un smoothie bowl es más ESPESO que un batido: se come con cuchara, así que va poco líquido.",
      "Pon en el vaso el skyr, los frutos rojos AÚN CONGELADOS y el plátano. El congelado es lo que da la textura; con fruta descongelada sale un batido líquido.",
      "Tritura empezando a velocidad baja y subiendo. Si la batidora se atasca, para y empuja la fruta hacia abajo con una espátula, nunca con la batidora en marcha.",
      "Si no arranca, añade una cucharada de leche, no más: es muy fácil pasarse y ya no hay vuelta atrás.",
      "Vuélcalo en un bol y pon la granola por encima justo antes de comer."
    ]
  },

  "Tostadas con aguacate y atún": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Comprueba el aguacate apretando cerca del rabito: debe ceder un poco. Duro no madura en el plato.",
      "Tuesta el pan.",
      "Abre el aguacate rodeándolo con el cuchillo hasta el hueso, gira las mitades en sentidos contrarios y saca la carne con una cuchara pegada a la piel.",
      "Aplástalo directamente sobre el pan tostado con el tenedor y sálalo. Aplastado en un bol aparte es un cacharro más para nada.",
      "Escurre el atún y repártelo encima. Prepáralo al momento: el aguacate se oscurece en minutos."
    ]
  },

  "Requesón con nueces y plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el requesón en un bol y remuévelo un poco para soltarlo.",
      "Corta el plátano en rodajas y repártelo por encima.",
      "Parte las nueces con los dedos en trozos grandes, no las piques: en trozo grande se notan, picadas desaparecen.",
      "Añádelas al final para que no se humedezcan con el requesón."
    ]
  },

  "Requesón con cacahuetes y miel": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el requesón en un bol.",
      "Riega con la miel PRIMERO y remueve un poco: así se reparte por todo en vez de quedarse en un hilo dulce en un solo punto.",
      "Si la miel está cristalizada o muy espesa, mete el bote 10 segundos en agua caliente.",
      "Termina con los cacahuetes por encima, para que se mantengan crujientes."
    ]
  },

  "Yogur griego con semillas y fruta": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela la naranja quitando toda la parte blanca, que amarga, y sepárala en gajos.",
      "Córtalos por la mitad para que se coman con cuchara sin pelearse con ellos.",
      "Pon el yogur en un bol y añade la naranja con el jugo que haya soltado al cortarla.",
      "Reparte las almendras por encima al final."
    ]
  },

  "Bol de cereales con leche y fruta": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon los copos de maíz en un bol hondo.",
      "Vierte la leche hasta cubrirlos MÁS O MENOS HASTA LA MITAD, no del todo: si los cubres enteros de golpe, flotan y se reblandecen antes de que empieces.",
      "Corta el plátano en rodajas y repártelas por encima.",
      "Cómelo sin esperar, mientras los copos siguen crujientes. Es un desayuno con fecha de caducidad de tres minutos."
    ]
  },

  "Yogur griego con avena y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "La avena va cruda: absorbe la humedad del yogur y se ablanda sola.",
      "Mezcla el yogur con la avena y déjalo reposar 5 minutos si puedes.",
      "Lava la manzana, quítale el corazón y córtala en dados pequeños. Déjale la piel: sujeta el dado y aporta fibra.",
      "Añádela al final y mezcla. Cortada con antelación se oxida y queda marrón."
    ]
  },

  // ══ LOTE 5 (2026-08-26) ═══════════════════════════════════════════════
  // Platos principales. Incluye la TORTILLA ESPAÑOLA, que resultó estar
  // desbloqueada: sus ingredientes en dishes.js son huevo, patata, tomate y
  // pepino -- no lleva cebolla, así que no depende de los roles que siguen
  // sin nutrición. Es el plato más español del catálogo y ya se puede
  // explicar entero.

  "Bowl de arroz con pollo teriyaki y edamame": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Cuece el edamame congelado 5 minutos en agua hirviendo con sal. La vaina no se come: se aprieta con los dientes para sacar el grano.",
      "Corta el pollo en dados, sécalos y sálalos ligeramente. Poca sal: la salsa teriyaki ya sala mucho.",
      "Dora el pollo a fuego alto con una cucharada de aceite, 5 minutos, hasta que no quede rosa.",
      "BAJA EL FUEGO ANTES DE ECHAR LA SALSA. El teriyaki lleva azúcar y a fuego fuerte se quema en segundos, dejando un amargor que ya no se quita.",
      "Añade la salsa y remueve 1 minuto: espesa sola y se pega al pollo formando un brillo.",
      "Monta el arroz de base con el pollo y el edamame encima."
    ]
  },

  "Wrap de pollo con lechuga y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el pollo en tiras, sécalas y sálalas.",
      "Dóralas en la sartén a fuego medio-alto con una cucharada de aceite, 4 minutos, hasta que no quede rosa. Déjalas templar un poco.",
      "Calienta la tortilla 20 segundos por cada lado en la sartén seca: fría se agrieta al doblarla.",
      "Pon el relleno en el tercio inferior, no en el centro. La lechuga va DEBAJO del pollo, haciendo de barrera: si el pollo caliente toca la tortilla, la humedece y se rompe.",
      "Dobla los dos lados hacia dentro y enrolla desde abajo apretando un poco."
    ]
  },

  "Ensalada de pollo con quinoa y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Si la quinoa no viene cocida, enjuágala un minuto en un colador fino: lleva saponinas y sin quitarlas sabe a jabón.",
      "Corta el pollo en tiras, sécalo, sálalo y dóralo 4 minutos por lado en la sartén con una cucharada de aceite.",
      "DÉJALO TEMPLAR antes de mezclarlo con las espinacas. Puesto caliente sobre la hoja cruda, la mustia al instante y queda lacia.",
      "Mezcla la quinoa con las espinacas crudas y el pollo templado.",
      "Aliña con aceite de oliva y sal justo antes de comer."
    ]
  },

  "Pechuga de pollo con cuscús y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Abre la pechuga por la mitad a lo ancho si es gruesa, sécala y sálala.",
      "Dórala en la sartén a fuego medio-alto con una cucharada de aceite, 4 minutos por lado, sin moverla los primeros minutos.",
      "Está cuando al pinchar la parte más gruesa sale jugo transparente.",
      "Mientras, hidrata el cuscús: en un bol, cubierto con agua hirviendo un dedo por encima, tapado con un plato, 5 minutos FUERA del fuego.",
      "Sepáralo con un tenedor, nunca con cuchara, que lo apelmaza.",
      "Saltea las verduras congeladas 4 minutos a fuego fuerte y deja reposar el pollo 2 minutos antes de cortarlo."
    ]
  },

  "Burrito de pollo con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el pollo en dados pequeños, sécalos, sálalos y dóralos 5 minutos a fuego alto con una cucharada de aceite.",
      "Añade el maíz escurrido y el arroz integral y saltea 2 minutos, para que todo vaya a la misma temperatura.",
      "DEJA QUE EL RELLENO PIERDA EL VAPOR un par de minutos antes de montar. Relleno humeante dentro de una tortilla cerrada la empapa y la rompe.",
      "Calienta la tortilla 20 segundos por lado en la sartén seca.",
      "Pon el relleno en el tercio inferior sin pasarte de cantidad — un burrito se rompe por exceso mucho más que por defecto.",
      "Dobla los lados hacia dentro, enrolla apretando desde abajo, y ciérralo con el pliegue hacia abajo para que no se abra."
    ]
  },

  "Pavo salteado con batata y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Pela la batata y córtala en dados de dos centímetros. Cuécela 12 minutos en agua con sal, hasta que el cuchillo entre sin esfuerzo.",
      "La batata se deshace antes que la patata, así que compruébala al minuto 10.",
      "Corta el pavo en tiras, sécalo y sálalo justo antes de la sartén.",
      "Saltéalo a fuego medio-alto con una cucharada de aceite, 3 minutos por lado. En cuanto pierde el rosa, fuera: el pavo pasado queda seco.",
      "Añade las espinacas y remueve 1 minuto hasta que bajen.",
      "Incorpora la batata escurrida y mezcla con suavidad para no deshacerla."
    ]
  },

  "Ensalada mediterránea con pavo y garbanzos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Enjuaga los garbanzos de bote hasta que el agua salga clara y escúrrelos bien.",
      "Corta el tomate y el pepino en dados del mismo tamaño.",
      "Si el pepino suelta mucha agua, déjalo 5 minutos en un colador con sal y escúrrelo.",
      "Corta el pavo en tiras y mézclalo todo.",
      "Aliña con aceite de oliva y sal JUSTO antes de comer: aliñada antes, la sal saca el agua de las verduras y queda un charco."
    ]
  },

  "Cerdo al horno con batata y espinacas": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 grados y espera a que llegue.",
      "Pela la batata y córtala en dados de dos centímetros. Extiéndela en la bandeja con una cucharada de aceite y sal, en una sola capa.",
      "La batata lleva más azúcar que la patata y se dora antes: si a media cocción ves los bordes muy oscuros, baja a 180.",
      "Seca el lomo, sálalo y ponlo entero encima de la batata.",
      "Asa 25 minutos. Está cuando al pincharlo sale jugo transparente; un rosa pálido en el centro es correcto.",
      "Deja reposar 5 minutos antes de cortar y añade las espinacas salteadas o crudas al servir."
    ]
  },

  "Poke bowl de salmón con arroz y aguacate": {
    difficulty: 2,
    equipment: ["ninguno"],
    steps: [
      "IMPORTANTE, ES SEGURIDAD ALIMENTARIA: si el salmón va crudo, tiene que haber estado CONGELADO al menos 5 días a -18 grados, por el anisakis. El salmón de supermercado etiquetado para consumo en crudo ya viene tratado; si no lo pone, congélalo tú o cocínalo.",
      "Descongélalo en la nevera, nunca a temperatura ambiente.",
      "Córtalo en dados de dos centímetros con el cuchillo más afilado que tengas, en un solo movimiento largo: serrando se deshace.",
      "Corta el pepino en medias lunas y el aguacate en láminas, al final para que no se oscurezca.",
      "Monta el arroz de base, ya frío o templado, y coloca encima el salmón, el aguacate y el pepino en zonas separadas.",
      "Si prefieres no arriesgarte con el crudo, saltea el salmón 3 minutos por lado y móntalo igual: el plato funciona igual de bien."
    ]
  },

  "Garbanzos con pollo y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Enjuaga los garbanzos de bote hasta que el agua salga clara y déjalos escurrir bien.",
      "Corta el pollo en dados, sécalos, sálalos y dóralos 5 minutos a fuego alto con una cucharada de aceite.",
      "Añade las espinacas y remueve 1 minuto hasta que bajen.",
      "Incorpora los garbanzos y saltea 3 minutos removiendo POCO: los de bote se rompen con facilidad y el plato acaba en puré.",
      "Si quieres que queden algo tostados, déjalos medio minuto sin remover contra el fondo de la sartén.",
      "Prueba de sal al final: los de bote ya vienen salados."
    ]
  },

  "Arroz integral con atún y maíz": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "El arroz integral viene más firme y suele estar apelmazado: sepáralo con un tenedor antes de mezclar nada.",
      "Si está muy seco, un chorrito de agua y 30 segundos de microondas lo sueltan.",
      "Escurre el atún y el maíz por separado, apretando bien.",
      "Mézclalo todo y aliña con aceite de oliva y sal.",
      "Se come igual de bien frío o templado, así que sirve para llevar."
    ]
  },

  "Ensalada de pasta con pavo y queso": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Cuece la pasta en abundante agua hirviendo con una cucharada colmada de sal, un minuto MÁS de lo que diga el paquete: en frío la pasta endurece, así que al dente se queda dura al enfriarse.",
      "Escúrrela y pásala por agua fría para cortar la cocción. Es la única ensalada de pasta en que enjuagar es correcto: quita el almidón que la apelmazaría.",
      "Escúrrela otra vez muy bien y déjala secar unos minutos.",
      "Corta el pavo y el queso en tiras y el tomate en dados.",
      "Mézclalo todo y aliña con aceite de oliva y sal justo antes de comer."
    ]
  },

  "Pechuga de pollo empapelada con verduras": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 200 grados.",
      "Corta un trozo grande de papel de horno, del doble del tamaño que crees que necesitas.",
      "Pon la pechuga en el centro con las verduras congeladas y el tomate alrededor, sala y añade una cucharada de aceite.",
      "CIERRA EL PAQUETE BIEN, doblando los bordes varias veces sobre sí mismos. Todo esto funciona porque el vapor queda dentro: un paquete mal cerrado lo deja escapar y el pollo sale seco.",
      "Hornea 20 minutos sin abrirlo. No puedes ir mirando, y esa es la gracia: se hace solo.",
      "Ábrelo con cuidado y APARTA LA CARA: sale una nube de vapor hirviendo. El jugo del fondo es la salsa."
    ]
  },

  "Pavo con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el pavo en tiras, sécalo y sálalo justo antes de cocinarlo.",
      "Saltea las verduras congeladas a fuego FUERTE 4 minutos, sin remover mucho. Los champiñones sueltan agua y hasta que no se evapora no empiezan a dorarse: si bajas el fuego, se quedan hervidos y grises.",
      "Aparta las verduras a un lado de la sartén y haz el pavo en el hueco, 3 minutos por lado.",
      "En cuanto el pavo pierde el rosa está hecho; pasado queda como serrín.",
      "Mezcla todo con la quinoa y prueba de sal."
    ]
  },

  "Ensalada templada de atún con quinoa": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Templa la quinoa 2 minutos en la sartén con unas gotas de aceite, removiendo. Templada, no caliente: es lo que diferencia una ensalada templada de un salteado.",
      "Añade las espinacas y remueve 30 segundos, solo hasta que empiecen a bajar sin llegar a deshacerse.",
      "Retira del fuego y pasa todo a un bol.",
      "Escurre el atún y corta el tomate en dados; añádelos EN FRÍO sobre la base templada.",
      "El contraste entre la base tibia y el atún y el tomate fríos es el plato entero. Si lo calientas todo junto, es otra cosa.",
      "Aliña con aceite de oliva y sal."
    ]
  },

  "Bacalao con espinacas y patata": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Si el bacalao es salado, tiene que estar YA desalado: 24 horas en la nevera en agua, cambiándola tres veces. Sin eso no hay plato.",
      "Cuece la patata en dados 12 minutos en agua con sal.",
      "Seca muy bien el bacalao. Es un pescado que suelta mucha agua y, húmedo, se cuece en vez de dorarse.",
      "Hazlo en la sartén a fuego medio con una cucharada de aceite, con la piel abajo, 5 minutos, y 2 minutos por el otro lado.",
      "Se separa en lascas gruesas cuando está: si aún se resiste, le falta.",
      "Saltea las espinacas 1 minuto en la misma sartén, aprovechando el jugo que ha soltado el pescado."
    ]
  },

  "Solomillo de cerdo con cuscús y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Saca la carne de la nevera 15 minutos antes y sécala bien.",
      "Sálala justo antes de cocinarla y córtala en medallones de dos dedos de grosor.",
      "Calienta la sartén a fuego alto con una cucharada de aceite y sella los medallones 3 minutos por cada lado sin moverlos.",
      "Baja el fuego y déjalos 2 minutos más: el cerdo magro necesita hacerse por dentro sin quemarse por fuera.",
      "Mientras, hidrata el cuscús con agua hirviendo un dedo por encima, tapado, 5 minutos fuera del fuego, y sepáralo con un tenedor.",
      "Saltea las verduras congeladas 4 minutos a fuego fuerte. Deja reposar la carne 3 minutos antes de servir."
    ]
  },

  "Carne picada con brócoli y arroz": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Cuece el brócoli en ramilletes 4 minutos en agua hirviendo con sal: verde vivo y con resistencia al pincharlo.",
      "Calienta la sartén a fuego alto con una cucharada de aceite ANTES de echar la carne. En sartén fría suelta agua y se cuece gris.",
      "Echa la carne, espárcela y no la toques el primer minuto.",
      "Rómpela en trozos pequeños y saltea 5 minutos hasta que no quede rosa. Si suelta agua, sube el fuego hasta que se evapore.",
      "Añade el arroz y el brócoli escurrido y mezcla 1 minuto.",
      "Prueba de sal al final."
    ]
  },

  "Tortilla española con ensalada": {
    difficulty: 3,
    equipment: ["sarten"],
    steps: [
      "Corta la patata ya cocida en rodajas o dados y sécala con papel: mojada, la tortilla no cuaja bien.",
      "Bate los huevos con sal en un bol GRANDE, más de lo que parece necesario, porque la patata va a ir dentro.",
      "Mezcla la patata con el huevo batido y DÉJALA REPOSAR 10 MINUTOS. Ese reposo es lo que hace que sepa a tortilla y no a huevo con patatas al lado.",
      "Calienta una sartén pequeña a fuego medio con una cucharada de aceite, bien repartido por el fondo y las paredes.",
      "Vuelca la mezcla, baja el fuego y deja 4 minutos. Ve separando los bordes con una espátula: si se pega el borde, la vuelta es imposible.",
      "LA VUELTA: pon un plato plano más ancho que la sartén encima, sujétalo con la palma, y gira las dos cosas juntas de golpe y con decisión. La duda es lo que la rompe.",
      "Deslízala de nuevo a la sartén con la parte cruda hacia abajo y haz 3 minutos más.",
      "Déjala reposar 5 minutos antes de cortarla. Sirve con el tomate y el pepino aliñados con aceite y sal."
    ]
  },

  "Tortilla de claras con pavo y queso": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Bate las claras con un pellizco de sal 30 segundos, hasta que hagan algo de espuma.",
      "Corta el pavo y el queso en tiras.",
      "Calienta la sartén a fuego MEDIO-BAJO y úntala bien de aceite, también las paredes: las claras solas se pegan mucho más que el huevo entero.",
      "Echa las claras y reparte el pavo y el queso por encima enseguida.",
      "Deja 3 minutos sin tocar, hasta que la superficie deje de estar líquida.",
      "Dóblala por la mitad con la espátula en vez de darle la vuelta entera: se rompe mucho menos. Un minuto más y fuera."
    ]
  },

  "Shakshuka ligera con tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Trocea el tomate y ponlo en la sartén con una cucharada de aceite a fuego medio.",
      "DÉJALO 10 MINUTOS hasta que espese y deje de ser aguado. Es lo que más se salta la gente y por eso les sale una sopa: el huevo tiene que apoyarse en la salsa, no nadar en ella.",
      "Sala la salsa AHORA, antes de meter los huevos: después ya no se puede remover.",
      "Haz dos huecos con la cuchara y casca un huevo en cada uno. Cáscalos antes en una taza si no tienes práctica.",
      "Tapa la sartén y baja el fuego. 5 minutos: la clara blanca y firme, la yema todavía temblando.",
      "Pon el pan a tostar mientras y sírvelo al lado para mojar, que es como se come."
    ]
  },

  "Revuelto de huevos con verduras y jamón": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Saltea las verduras congeladas 4 minutos a fuego fuerte, hasta que se evapore el agua que sueltan.",
      "ESCURRE O EVAPORA ESA AGUA antes de echar el huevo. Si queda líquido en la sartén, el revuelto sale aguado y no cuaja.",
      "Añade el jamón en tiras y remueve 30 segundos.",
      "Baja a fuego BAJO, echa los huevos batidos con sal y espera 20 segundos sin tocar.",
      "Remueve despacio llevando lo cuajado hacia el centro.",
      "Sácalo cuando aún parezca poco hecho: termina de cuajarse en el plato con su propio calor."
    ]
  },

  "Lentejas con verduras y huevo duro": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Pon el huevo a cocer cubierto de agua fría, dos dedos por encima, y cuenta 10 minutos desde que hierve a borbotones.",
      "Enjuaga las lentejas de bote hasta que el agua salga clara.",
      "Pela la zanahoria, córtala en rodajas finas y cuécela 8 minutos en otra olla con un dedo de agua y una cucharada de aceite.",
      "Añade las lentejas y calienta 3 minutos, removiendo lo justo para no deshacerlas.",
      "Pasa el huevo a agua fría 2 minutos y pélalo empezando por el extremo gordo, donde está la cámara de aire.",
      "Córtalo en cuartos y ponlo encima al servir. Prueba de sal."
    ]
  },

  "Tofu a la plancha con verduras y arroz": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "PRENSA EL TOFU: envuélvelo en papel de cocina, ponle encima un plato con peso y déjalo 10 minutos. Está lleno de agua y sin esto no hay manera de que se dore.",
      "Córtalo en filetes de un centímetro y sálalos.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite hasta que brille.",
      "Pon los filetes separados y NO LOS TOQUES 4 minutos. Se despegan solos cuando tienen costra; si tiras antes, se rompen y dejan la costra pegada a la sartén.",
      "Dales la vuelta y haz 3 minutos más.",
      "Sácalos, saltea las verduras 4 minutos a fuego fuerte en la misma sartén y sirve con el arroz."
    ]
  },

  "Edamame con arroz y huevo al vapor": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Pon dos dedos de agua en una olla con un colador metálico encima, sin que el agua lo toque, y lleva a hervor.",
      "El huevo al vapor sale más tierno que cocido y se pela mejor: ponlo entero con cáscara en el colador y cuécelo tapado 12 minutos.",
      "Añade el edamame congelado en los últimos 5 minutos, en el mismo colador.",
      "Pasa el huevo a agua fría 2 minutos y pélalo desde el extremo gordo.",
      "Sirve el arroz de base con el edamame y el huevo cortado por la mitad.",
      "Sal por encima. El edamame se come apretando la vaina con los dientes; la vaina se tira."
    ]
  }
};

/**
 * @param {string} dishName
 * @returns {{steps:string[], equipment:string[], difficulty:number}|null}
 *   La COCINA del plato no vive aquí: está en js/data/dish-cuisine.js, que
 *   cubre los 334 platos y no depende de que se hayan escrito los pasos.
 *   null si el plato todavía no tiene instrucciones (la mayoría, durante
 *   el piloto) -- quien llame debe seguir funcionando igual en ese caso.
 */
function getDishInstructions(dishName) {
  if (!dishName) return null;
  return DISH_INSTRUCTIONS[dishName] || null;
}

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
 * ── Estado: 333 de 334 (2026-08-31) ────────────────────────────────────
 * Completo salvo "Merluza al ajillo con verduras", que necesita ajo y ese
 * rol sigue sin resolver (ver STATE.md, T2). getDishInstructions devuelve
 * null para ese plato y se renderiza sin pasos, igual que antes.
 *
 * Se escribió en ocho tandas (commits `af96985`..`26fd6af`). El piloto
 * inicial (17 platos) se eligió para cubrir el MECANISMO -- los seis
 * tokens de equipo, los tres niveles de dificultad, las cuatro
 * categorías. Las tandas siguientes se ordenaron por VARIEDAD DE TÉCNICA
 * (cada receta enseña algo que no se deduce de otra) hasta agotar lo
 * distinto; el resto del catálogo son permutaciones "proteína + grano +
 * verdura" y sus recetas reutilizan a propósito los mismos bloques, más
 * cortas, pero siguen llevando cantidades, tiempos y una señal de "hecho".
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

  "Wrap de hummus con verduras": {
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

  "Carne picada con quinoa y brócoli": {
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
    // Necesita 6 h de nevera SÍ o SÍ: no se puede montar y comer el mismo
    // rato. El motor lo trata aparte -- nunca en un plan de 1 día, nunca en
    // el día 1 de un plan de varios, y con aviso "prepáralo la noche antes"
    // cuando sí sale (ver isMakeAheadDish en preferences.js).
    makeAhead: true,
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
  },

  // ── Tanda 2026-08-31 (142 → 166 platos) ─────────────────────────────
  // Elegidos por TÉCNICA que no se pueda deducir de otra receta ya
  // escrita, no por orden de lista: marisco cocido que solo hay que
  // templar, pescado firme vs. pescado que se deshace, carne magra y su
  // reposo, salsas con azúcar que se queman, un grano nuevo (trigo
  // sarraceno), el huevo duro sin cerco gris, la fruta congelada que
  // atasca la batidora, el vaso de arroz que revienta en el microondas.
  // Nada con cebolla ni ajo: esos roles siguen sin resolver (ver T2).

  "Gambas con arroz y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Cuece el brócoli en ramilletes 4 minutos en agua hirviendo con sal. Escúrrelo en cuanto el cuchillo entre pero el tallo aún resista.",
      "Las gambas YA VIENEN COCIDAS: solo hay que templarlas. Ponlas en una sartén con una cucharadita de aceite a fuego medio.",
      "Remueve 45 segundos, hasta que estén calientes al tacto, y ni un segundo más. Si las tienes 2 o 3 minutos \"para asegurar\", se encogen y quedan como gomas.",
      "Aparta la sartén del fuego. Calienta el arroz aparte, en el microondas o con un chorrito de agua tapado en un cazo 1 minuto.",
      "Monta el arroz de base, el brócoli al lado y las gambas por encima.",
      "Un chorro de limón y prueba de sal antes de añadir más: las gambas cocidas ya llevan bastante."
    ]
  },

  "Langostinos con arroz integral y espinacas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Si los langostinos vienen con cáscara: arranca la cabeza, tira de las patitas y pela el cuerpo, con las manos y sobre un plato.",
      "Ponlos en una sartén con una cucharadita de aceite a fuego medio SOLO para templarlos, 1 minuto. Ya están cocidos; recocerlos los vuelve correosos.",
      "Sácalos a un plato. En la misma sartén, con el fuego apagado y el calor que queda, echa las espinacas y remueve: se hacen en 30 segundos con el vapor.",
      "Calienta el arroz integral aparte con un chorrito de agua, tapado, 1 minuto: viene más seco que el blanco.",
      "Mezcla el arroz con las espinacas y pon los langostinos encima.",
      "Sal y un hilo de aceite crudo al final."
    ]
  },

  "Solomillo de ternera con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Saca la carne de la nevera 15 minutos antes: fría por dentro se cocina desigual.",
      "Sécala muy bien con papel y sálala por las dos caras. Mojada no se dora, se cuece gris.",
      "Calienta la sartén a fuego ALTO con una cucharada de aceite hasta que humee ligeramente. Marca el solomillo 2 minutos por cada lado sin moverlo, para una pieza de unos 3 cm.",
      "PÁSALO A UN PLATO Y DÉJALO REPOSAR 5 MINUTOS antes de cortar. Si lo cortas recién salido, el jugo se va entero al plato y la carne queda seca. Este paso es la mitad del resultado.",
      "Córtalo en lonchas contra la fibra: fíjate en las líneas que recorren la carne y corta cruzándolas.",
      "Sirve con el arroz caliente y el brócoli cocido 4 minutos en agua con sal."
    ]
  },

  "Cerdo a la plancha con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta el lomo en filetes de un dedo de grosor, sécalos y sálalos.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite.",
      "Haz los filetes 3 minutos por un lado sin tocarlos, hasta ver el borde dorado.",
      "Dales la vuelta y 2 minutos más. EL LOMO ES MUY MAGRO Y SE SECA EN NADA: retíralo cuando el centro haya pasado de rosa a pálido, no cuando esté del todo blanco. Se termina de hacer con su calor en el plato.",
      "Cuece el brócoli 4 minutos en agua hirviendo con sal.",
      "Sirve con el arroz y el brócoli. Un poco de pimienta le va bien al cerdo."
    ]
  },

  "Rape con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "El rape es un pescado FIRME y grueso: no se deshace como la merluza y necesita más tiempo del que parece.",
      "Sécalo, córtalo en medallones de unos 3 cm si viene en cola, y sálalo.",
      "Limpia los champiñones con papel húmedo (no bajo el grifo, chupan agua) y córtalos en láminas. Saltéalos en la sartén con una cucharada de aceite a fuego fuerte 4 minutos, hasta que suelten el agua y se vuelva a evaporar. Sácalos.",
      "En la misma sartén, haz el rape a fuego medio-alto 3 o 4 minutos por lado.",
      "ESTÁ HECHO CUANDO ESTÁ OPACO Y BLANCO HASTA EL CENTRO, no cuando la superficie cambia de color: por dentro tarda. Ábrelo con el cuchillo para comprobarlo.",
      "Calienta la quinoa, mézclala con los champiñones y sirve el rape encima. Sal al final."
    ]
  },

  "Lubina con quinoa y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de lubina y sálalos. Si tienen piel, hazle dos cortes superficiales con el cuchillo para que no se encoja.",
      "Corta el calabacín en medias lunas de medio centímetro.",
      "Calienta la sartén a fuego medio-alto con una cucharada de aceite.",
      "Pon la lubina CON LA PIEL HACIA ABAJO y aprieta los lomos con la espátula 10 segundos para que no se curven. Déjala así 4 minutos, el 80% de la cocción: la piel queda crujiente y protege la carne.",
      "Dale la vuelta solo 1 minuto y sácala. Si la mueves mucho, se rompe.",
      "Saltea el calabacín en la misma sartén 4 minutos con sal, mézclalo con la quinoa caliente y pon la lubina encima."
    ]
  },

  "Conejo con arroz integral y brócoli": {
    difficulty: 3,
    equipment: ["olla"],
    steps: [
      "El conejo es carne muy magra y con huesos finos: hecho rápido queda como suela. Va dorado y luego a fuego bajo y tapado.",
      "Trocéalo por las junturas (el carnicero suele darlo ya troceado), sécalo y sálalo.",
      "Dóralo en una olla ancha con dos cucharadas de aceite a fuego fuerte, por tandas para que no se amontone, hasta que tenga color por todos lados. Unos 6 minutos.",
      "Baja el fuego al mínimo, añade medio vaso de agua, tapa y deja 35 minutos. A media cocción, si se ha quedado seco, añade otro poco de agua.",
      "Está listo cuando la carne se separa del hueso sin esfuerzo. OJO CON LOS HUESOS FINOS al comer, sobre todo en las patas.",
      "Cuece el brócoli 4 minutos aparte y calienta el arroz integral. Sirve el conejo con su jugo por encima."
    ]
  },

  "Pollo en salsa de yogur con cuscús": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en tiras, sécalas y sálalas.",
      "Dóralas en una sartén con una cucharada de aceite a fuego medio-alto 5 minutos, hasta que no queden rosas por dentro.",
      "Añade las espinacas y remueve hasta que bajen, 1 minuto.",
      "APAGA EL FUEGO. Espera un minuto a que la sartén pierda el hervor y entonces añade dos cucharadas colmadas de yogur natural, removiendo. El yogur se corta y se agruma si hierve; fuera del fuego queda una salsa cremosa.",
      "Prueba de sal y añade pimienta, o un poco de pimentón si tienes.",
      "Sirve sobre el cuscús caliente, que se ahueca con un tenedor, nunca con cuchara."
    ]
  },

  "Pollo a la naranja con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pela la zanahoria y córtala en rodajas finas. Cuécela 6 minutos en agua hirviendo con sal, tierna pero entera.",
      "Corta la pechuga en dados, sécalos y sálalos.",
      "Dóralos en una sartén con una cucharada de aceite a fuego alto 5 minutos, hasta que no queden rosas.",
      "Baja a fuego medio. Exprime el zumo de una naranja en la sartén, con una cucharadita de miel si quieres. AÑADE EL ZUMO AL FINAL, NO AL PRINCIPIO: lleva azúcar y a fuego fuerte o mucho rato se quema y amarga.",
      "Deja que borbotee 2 o 3 minutos hasta que espese y bañe el pollo con un brillo. Remueve para que no se pegue.",
      "Añade la zanahoria escurrida, mezcla y sirve sobre el arroz integral caliente."
    ]
  },

  "Garbanzos al curry con espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Escurre los garbanzos de bote y enjuágalos hasta que el agua salga clara. El líquido del bote sabe a lata.",
      "Trocea el tomate en dados pequeños.",
      "Calienta una sartén con una cucharada de aceite a fuego medio. Echa una cucharadita de curry en polvo y FRÍELO 30 SEGUNDOS EN EL ACEITE antes de añadir nada más: en crudo sabe a polvo, al freírse suelta el aroma. Esta versión rápida va sin sofrito.",
      "Añade el tomate y deja 4 minutos, aplastándolo con la cuchara hasta que sea una salsa espesa.",
      "Añade los garbanzos y medio vaso de agua, y deja 5 minutos a fuego medio-bajo. Los garbanzos de bote ya están tiernos: solo cogen sabor, no hay que cocerlos más.",
      "Echa las espinacas, remueve hasta que bajen y prueba de sal."
    ]
  },

  "Pavo con arroz y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "El trigo sarraceno es un grano con sabor a nuez, más terroso que el arroz. Viene cocido: solo se calienta.",
      "Corta la pechuga de pavo en tiras finas, sécalas y sálalas. El pavo es más seco que el pollo: fino y poco tiempo.",
      "Dóralo en una sartén con una cucharada de aceite a fuego medio-alto 4 minutos, hasta que pierda el rosa. Retíralo.",
      "En la misma sartén echa las espinacas con una pizca de sal y remueve 1 minuto hasta que bajen.",
      "Añade el trigo sarraceno con un chorrito de agua, calienta 2 minutos y SEPÁRALO CON UN TENEDOR, sin machacar: removido en caliente con cuchara se apelmaza.",
      "Devuelve el pavo, mezcla todo y sirve. Pimienta al final."
    ]
  },

  "Sardinas con cuscús y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Corta el calabacín en dados de un centímetro.",
      "Saltéalo en una sartén con una cucharada de aceite y sal a fuego medio-alto 5 minutos, hasta que se dore por algunas caras.",
      "Calienta el cuscús: si es de sobre ya cocido, un chorrito de agua caliente por encima y tapado 2 minutos.",
      "AHUÉCALO CON UN TENEDOR, NUNCA CON CUCHARA. La cuchara lo apelmaza en una masa; el tenedor lo deja suelto, que es la gracia del cuscús.",
      "Abre la lata de sardinas, escúrrelas del aceite y, si te molesta, quítales la espina central tirando con los dedos (es blanda y se come).",
      "Mezcla el cuscús con el calabacín, pon las sardinas encima en trozos y un chorro de limón."
    ]
  },

  "Huevos rellenos de atún con ensalada": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Pon los huevos en un cazo cubiertos de agua fría, dos dedos por encima. Llévalos a hervor y cuenta 10 minutos exactos desde que borbotea.",
      "NADA MÁS APAGAR, pásalos a un bol con agua y hielo (o agua muy fría del grifo) 5 minutos. Esto corta la cocción: sin el agua fría, la yema coge un cerco gris verdoso y sabe a azufre.",
      "Pélalos bajo un hilo de agua, empezando por el extremo gordo.",
      "Córtalos por la mitad a lo largo y saca las yemas a un bol.",
      "Aplasta las yemas con un tenedor y mézclalas con el atún escurrido y una cucharadita de aceite hasta que se pueda moldear. Rellena las claras con esa pasta.",
      "Sirve sobre una cama de tomate y pepino en dados con sal y aceite."
    ]
  },

  "Ensalada templada con atún y garbanzos": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Escurre y enjuaga los garbanzos de bote hasta que el agua salga clara.",
      "Caliéntalos 2 minutos en un cazo con un dedo de agua, o 1 minuto en el microondas. Solo templados, no hirviendo.",
      "Escúrrelos y, EN CALIENTE, mézclalos con una cucharada de aceite, un chorro de vinagre y sal. Templados absorben el aliño; fríos lo repelen y queda todo en el fondo del bol.",
      "Trocea el tomate en dados y añádelo.",
      "Escurre el atún y añádelo en trozos grandes, mezclando con suavidad para que no se deshaga del todo.",
      "Deja reposar 5 minutos antes de comer. Está mejor templada que recién hecha o que fría de nevera."
    ]
  },

  "Pollo salteado con verduras y arroz": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en dados pequeños y del mismo tamaño, para que se hagan a la vez. Sécalos y sálalos.",
      "Calienta la sartén a fuego ALTO con una cucharada de aceite hasta que brille.",
      "Echa el pollo y saltéalo 5 minutos hasta que esté dorado y sin rosa. SÁCALO A UN PLATO.",
      "En la misma sartén, aún a fuego fuerte, echa las verduras congeladas directamente sin descongelar y saltéalas 5 minutos, hasta que se evapore el agua que sueltan.",
      "Devuelve el pollo con su jugo, remueve 1 minuto y apaga. Si dejas el pollo dentro todo el rato mientras se hacen las verduras, se reseca esperando.",
      "Sirve sobre el arroz. Una cucharadita de salsa de soja en lugar de sal le va bien."
    ]
  },

  "Carne picada con pasta y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calienta una sartén a fuego alto con una cucharada de aceite.",
      "Echa el pavo picado y EXTIÉNDELO SIN TOCARLO el primer minuto, para que se dore por debajo en vez de cocerse gris.",
      "Rómpelo en trozos con la cuchara y saltéalo 4 minutos. El pavo picado es aún más magro que el de vacuno: en cuanto pierde el rosa ya está; pasado, queda seco y arenoso.",
      "Añade las verduras congeladas y saltea 5 minutos más, hasta que se evapore su agua.",
      "Añade la pasta ya cocida con dos cucharadas de agua y remueve 1 minuto para que se junte todo.",
      "Prueba de sal y añade pimienta. Un poco de tomate frito o concentrado da jugosidad si lo tienes."
    ]
  },

  "Salmón teriyaki con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de salmón con papel y sálalos poco: la salsa teriyaki sala mucho.",
      "Calienta la sartén a fuego medio-alto con una cucharadita de aceite.",
      "Haz el salmón con la piel hacia abajo 4 minutos sin moverlo, luego 2 minutos por el otro lado. Está hecho cuando al apretar se abre en láminas y el centro ha pasado de rojo intenso a rosa.",
      "Saltea las verduras congeladas en un hueco de la sartén o aparte, 4 minutos.",
      "BAJA EL FUEGO AL MÍNIMO y solo entonces pincela el salmón con una cucharada de salsa teriyaki, 30 segundos por cada lado para que se pegue y brille. Si echas la salsa al principio o a fuego fuerte, el azúcar se quema negro y amarga.",
      "Sirve sobre el arroz integral caliente con las verduras al lado."
    ]
  },

  "Batido de proteína con avena y plátano": {
    difficulty: 1,
    equipment: ["batidora"],
    steps: [
      "Echa PRIMERO el líquido en el vaso de la batidora: el skyr y un buen chorro de agua o leche, unos 150 ml. Con los líquidos abajo las cuchillas agarran; con la avena y el plátano abajo se quedan girando en el aire.",
      "Añade el plátano en trozos, la avena y la mantequilla de cacahuete.",
      "TAPA SIEMPRE ANTES DE ENCENDER, y sujeta la tapa con la mano la primera vez.",
      "Tritura 30 segundos, para, y si quedan grumos de avena dale otros 20 segundos: cruda tarda en deshacerse y si no, queda arenosa.",
      "Si está demasiado espeso para beber, añade agua de 20 en 20 ml y vuelve a triturar un momento.",
      "Bébelo recién hecho: reposado, la avena sigue absorbiendo y se vuelve un pudin."
    ]
  },

  "Batido de requesón con frutos rojos": {
    difficulty: 1,
    equipment: ["batidora"],
    steps: [
      "Echa el requesón y unos 150 ml de agua o leche en el vaso de la batidora, el líquido primero.",
      "Añade los frutos rojos AÚN CONGELADOS.",
      "Tapa antes de encender y tritura. Es normal que al principio se atasque: la fruta congelada forma un bloque.",
      "SI SE QUEDA GIRANDO SIN TRITURAR: para, empuja la fruta hacia las cuchillas con una cuchara, añade un chorro más de líquido y vuelve a triturar. Insistir con la batidora atascada solo calienta el motor.",
      "Tritura 40 segundos en total, hasta que no queden trozos.",
      "Pruébalo: los frutos rojos son ácidos, y si lo quieres más dulce va bien media cucharadita de miel."
    ]
  },

  "Atún con arroz y maíz dulce": {
    difficulty: 1,
    equipment: ["microondas"],
    steps: [
      "Si el arroz es de vaso o bolsa para microondas: HAZ UN CORTE O UN PINCHAZO EN EL FILM antes de meterlo. Sellado, el vapor lo hincha y revienta salpicando todo el microondas.",
      "Caliéntalo 90 segundos a máxima potencia.",
      "Sácalo con cuidado (el vaso quema), ahuécalo con un tenedor y déjalo tapado 1 minuto: termina de hacerse con su propio vapor.",
      "Escurre el atún y el maíz dulce de sus latas.",
      "Mezcla el arroz con el maíz y pon el atún por encima en trozos.",
      "Aliña con una cucharada de aceite, un chorro de vinagre o limón y sal. Frío también está bueno, como ensalada de arroz."
    ]
  },

  "Ternera con patata y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la ternera en tiras FINAS y CONTRA LA FIBRA: fíjate en las líneas que recorren la carne y corta cruzándolas. A favor de la fibra queda dura por bien que la hagas.",
      "Sécala, sálala y déjala fuera de la nevera mientras preparas lo demás.",
      "Corta la patata ya cocida en rodajas gruesas. Dórala en una sartén con una cucharada de aceite a fuego medio-alto 4 minutos por lado y sácala.",
      "Sube el fuego al máximo. Echa la ternera en una sola capa y saltéala 2 minutos: en tiras finas se hace en nada y, pasada de ese punto, se seca y se endurece.",
      "Añade las espinacas y una pizca de sal, y remueve 30 segundos: bajan solas con el calor de la carne y la sartén.",
      "Sirve la ternera y las espinacas sobre las patatas. Pimienta al final."
    ]
  },

  "Tortilla de claras con champiñones y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Las verduras congeladas y el tomate sueltan mucha agua. Si van directas a las claras, la tortilla queda un caldo.",
      "Saltea las verduras congeladas en una sartén con una cucharadita de aceite a fuego fuerte 5 minutos, HASTA QUE SE EVAPORE TODA EL AGUA y empiecen a dorarse.",
      "Añade el tomate en dados y deja 2 minutos más, hasta que también pierda el jugo. Saca todo a un plato.",
      "Bate las claras con una pizca de sal. Cuajan más rápido y más gomosas que el huevo entero, así que fuego medio, no fuerte.",
      "Echa una gota de aceite en la sartén, vuelca las claras y, cuando el borde cuaje, reparte las verduras por una mitad.",
      "Dobla la otra mitad encima con la espátula, 30 segundos más y al plato. Sácala cuando el centro aún parezca poco hecho: de tierna a seca va un momento."
    ]
  },

  "Wrap de desayuno con claras y aguacate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Bate las claras con una pizca de sal.",
      "Cuájalas en una sartén con una gota de aceite a fuego medio-bajo, removiendo despacio, y SÁCALAS CUANDO AÚN BRILLEN Y PAREZCAN POCO HECHAS: siguen cuajando con su calor y en el wrap acaban perfectas. Secas aquí, quedan gomosas.",
      "Calienta la tortilla de trigo 10 segundos por lado en la sartén sin nada, o 10 segundos en el microondas. Fría se raja al doblarla; templada se enrolla sin romperse.",
      "Machaca el aguacate con un tenedor y un poco de sal, y úntalo por el centro de la tortilla dejando 3 cm de borde libre.",
      "Pon las claras sobre el aguacate SIN PASARTE DE RELLENO: un wrap demasiado lleno se abre por abajo al morderlo.",
      "Dobla los dos lados cortos hacia dentro y enrolla desde el borde más cercano, apretando un poco. Córtalo en diagonal."
    ]
  },

  "Pollo asado con patata y brócoli": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Enciende el horno a 210 grados.",
      "Corta la patata ya cocida en gajos y el pollo en trozos grandes. Que todo tenga un tamaño parecido para que se haga a la vez.",
      "Extiéndelo en la bandeja EN UNA SOLA CAPA, sin que las piezas se toquen, con dos cucharadas de aceite y sal. Amontonado se cuece al vapor y sale pálido y blando en vez de dorado.",
      "Hornea 15 minutos.",
      "Saca la bandeja, añade el brócoli en ramilletes con un poco más de aceite y sal, remueve todo y hornea otros 12 minutos. Si el brócoli entra al principio, se quema y amarga antes de que el pollo esté hecho.",
      "El pollo está listo cuando al abrir el trozo más gordo el jugo sale claro, no rosa."
    ]
  },

  // ── Tanda 2026-08-31 (b) (166 → 182 platos) ──────────────────────────
  // Segunda tanda. A partir de aquí el catálogo restante es en gran parte
  // permutaciones de "proteína + grano cocido + verdura" cuya técnica ya
  // está escrita en un plato hermano. Estos 16 son los que aún enseñaban
  // algo propio: la coliflor que se hace puré en un minuto, el pimiento y
  // sus venas amargas, la regla del bacalao salado, la lata de caballa
  // que ya está cocida, las legumbres de bote que no se remueven, el
  // muslo (carne oscura) frente a la pechuga, el jamón curado que NO se
  // cocina, el huevo frito con aceite por encima en vez de vuelta.

  "Garbanzos con arroz y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "La coliflor pasa de cruda a puré en un minuto, y de más se hace babosa y huele a azufre. Se cuece poco o se asa.",
      "Separa la coliflor en ramilletes pequeños. Cuécela 5 minutos en agua hirviendo con sal y escúrrela EN CUANTO el cuchillo entre con algo de resistencia, no cuando entre solo.",
      "Escurre y enjuaga los garbanzos de bote hasta que el agua salga clara.",
      "Calienta una sartén con una cucharada de aceite a fuego medio-alto. Saltea la coliflor 3 minutos para que coja algún tostado, que es donde está el sabor.",
      "Añade los garbanzos y un cucharón del agua de cocción, y deja 3 minutos a fuego medio para que se junten.",
      "Sirve sobre el arroz caliente con sal y pimienta. Un poco de pimentón le va muy bien."
    ]
  },

  "Pavo con quinoa y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Al pimiento quítale el tallo, ábrelo y ARRANCA TODAS LAS SEMILLAS Y LAS VENAS BLANCAS del interior: esa parte blanca amarga. Córtalo en tiras.",
      "Corta el pavo en tiras finas, sécalo y sálalo.",
      "Calienta una sartén con una cucharada de aceite a fuego alto. Echa los pimientos y saltéalos 6 minutos sin moverlos mucho, hasta que se ablanden y les salgan manchas oscuras. Esas manchas son sabor, no están quemados.",
      "Aparta los pimientos a un lado, echa el pavo en el hueco y hazlo 4 minutos hasta que pierda el rosa. El pavo es seco: en cuanto está, fuera.",
      "Mezcla el pavo con los pimientos 1 minuto y apaga.",
      "Sirve sobre la quinoa caliente. Sal al final, prueba primero."
    ]
  },

  "Bacalao con garbanzos y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "IMPORTANTE: si tu bacalao es salado (en tacos, muy blanco y duro), tiene que estar ya DESALADO: 24 a 36 horas en la nevera cubierto de agua, cambiándola tres veces. Sin desalar es incomible. El bacalao fresco o congelado sin sal se usa directo.",
      "Seca el bacalao y quítale las espinas que notes pasando el dedo.",
      "Calienta una sartén con una cucharada de aceite a fuego MEDIO, no fuerte: el bacalao se hace suave o se pone estropajoso.",
      "Ponlo con la piel hacia abajo 4 minutos, y luego 2 minutos por el otro lado. Está hecho cuando se abre en lascas grandes al empujar con el tenedor.",
      "Sácalo. En la misma sartén echa los garbanzos escurridos y enjuagados con medio vaso de agua, 3 minutos, y luego las espinacas hasta que bajen.",
      "Sirve los garbanzos de base y el bacalao encima, en lascas. Sal con cuidado: el bacalao, aun desalado, todavía sala."
    ]
  },

  "Caballa con pasta y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "La caballa en lata YA ESTÁ COCINADA. No se fríe: solo se desmiga en trozos con el tenedor. Escúrrela un poco del aceite. Las espinas que veas son blandas y se comen.",
      "Calienta la pasta ya cocida en un cazo o sartén con un chorrito de agua, 1 minuto.",
      "Fuera del fuego, añade las espinacas frescas y remueve: el calor de la pasta las baja en 30 segundos, sin cocinarlas aparte.",
      "Añade la caballa desmigada y mezcla con suavidad para no hacerla papilla.",
      "Un chorro de limón, pimienta y un hilo de aceite crudo.",
      "La caballa es fuerte de sabor y no necesita mucho más. Prueba de sal: la lata ya lleva."
    ]
  },

  "Lentejas con arroz integral y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Escurre las lentejas de bote y enjuágalas en un colador hasta que el agua salga clara. El caldo del bote es espeso y sabe a lata.",
      "Pela la zanahoria y córtala en dados pequeños. Cuécela 8 minutos en un cazo con un dedo de agua y una cucharada de aceite, hasta que esté tierna.",
      "Añade las lentejas y calienta 3 minutos a fuego suave. REMUEVE LO JUSTO: las de bote ya están cocidas y se deshacen en puré si las trabajas mucho.",
      "Fuera del fuego, añade un chorrito de vinagre: un punto ácido que levanta el plato entero.",
      "Calienta el arroz integral aparte con un poco de agua, tapado, 1 minuto.",
      "Sirve las lentejas sobre el arroz. Sal y pimienta al final."
    ]
  },

  "Muslo de pollo con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "El muslo es carne oscura: más jugosa y difícil de secar que la pechuga, pero necesita más rato porque es más gruesa y tiene tejido que ablandar.",
      "Seca los muslos y sálalos. Si tienen piel, empieza con la piel hacia abajo.",
      "Calienta una sartén con una cucharadita de aceite a fuego medio. Pon los muslos y déjalos 6 o 7 minutos por el lado de la piel, sin moverlos, hasta que la piel esté dorada y crujiente y haya soltado su grasa.",
      "Dales la vuelta y 5 minutos más. Están hechos cuando al pinchar la parte más gruesa el jugo sale claro, no rosado, y la carne cede.",
      "Pela la zanahoria, córtala en rodajas y cuécela 6 minutos en agua con sal.",
      "Sirve los muslos sobre la quinoa caliente con la zanahoria, y riega con la grasa dorada de la sartén."
    ]
  },

  "Claras con espinacas y queso": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Las espinacas frescas sueltan mucha agua. Si van directas a las claras, el revuelto queda aguado.",
      "Ponlas en la sartén con una gota de aceite a fuego medio SIN nada más y remueve: en 1 o 2 minutos bajan y sueltan el agua. Sube el fuego un momento para que esa agua se evapore.",
      "Bate las claras con una pizca de sal.",
      "Baja el fuego a medio-bajo, echa las claras sobre las espinacas y remueve despacio con la espátula, llevando el borde cuajado hacia el centro.",
      "Cuando estén casi cuajadas pero aún brillantes, apaga y esparce el queso en trozos por encima: se funde con el calor que queda.",
      "Sirve enseguida. Las claras se pasan de tiernas a gomosas en segundos."
    ]
  },

  "Sandwich integral de pavo y queso": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "El enemigo de un sándwich es el pan mojado. Todo lo que sigue es para evitarlo.",
      "Unta las dos rebanadas por dentro con una capa muy fina de aceite o de queso batido: hace de barrera y el pan no se empapa.",
      "Pon el queso pegado al pan: sella la miga.",
      "El pavo en lonchas va en el centro. El tomate en rodajas, ESCURRIDO sobre un papel de cocina, también en el centro, nunca tocando el pan.",
      "Cierra, aprieta con la palma unos segundos y córtalo en diagonal: se coge y se come mejor.",
      "Cómelo pronto. Si es para llevar, envuélvelo bien y añade el tomate justo antes de comer."
    ]
  },

  "Poke bowl de tofu con arroz y aguacate": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "El tempeh crudo amarga. Cuécelo primero: 10 minutos en un cazo con agua hirviendo cubriéndolo. Le quita el amargor y lo deja listo para dorar.",
      "Escúrrelo, sécalo y córtalo en dados de dos centímetros.",
      "Dóralos en una sartén con una cucharada de aceite a fuego medio-alto 5 minutos, dándoles vueltas para que cojan color por varias caras. Si tienes salsa de soja, un chorrito al final que se pegue.",
      "Corta el aguacate: ábrelo, quita el hueso y saca la carne con una cuchara pegada a la piel. Córtalo en láminas SIN aplastarlo.",
      "Pela y corta el pepino en medias lunas finas.",
      "Monta el bol: arroz de base templado o a temperatura ambiente, y encima el tempeh, el aguacate y el pepino en montones separados. Es un plato frío sobre base templada, no un salteado."
    ]
  },

  "Pollo con fideos y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Si los fideos vienen ya cocidos, suéltalos: ponlos en un colador y pásales agua caliente por encima mientras los separas con los dedos. Apelmazados se rompen al saltear.",
      "Corta el muslo de pollo en tiras, sécalo y sálalo.",
      "Cuece el brócoli en ramilletes 3 minutos en agua con sal, que quede firme: va a terminar en la sartén.",
      "Dora el pollo en una sartén grande o wok con una cucharada de aceite a fuego ALTO, 5 minutos, hasta que no quede rosa.",
      "Añade el brócoli escurrido y saltea 2 minutos; luego los fideos con un chorrito de agua o de salsa de soja.",
      "Saltea todo junto 1 o 2 minutos, moviendo la sartén para mezclar sin romper los fideos. Sirve enseguida."
    ]
  },

  "Huevos con pan integral y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Cuece el brócoli en ramilletes 4 minutos en agua hirviendo con sal y escúrrelo.",
      "Para el huevo frito: calienta una sartén pequeña con una cucharada de aceite a fuego medio-alto hasta que una gota de agua chisporrotee.",
      "Casca el huevo en una taza y deslízalo en la sartén desde cerca, para que no salpique.",
      "NO LO TOQUES. Con una cuchara, ve echando el aceite caliente de la sartén por encima de la clara: cuaja la parte de arriba sin darle la vuelta y la yema queda líquida.",
      "Está listo en 2 minutos, cuando la clara está firme y los bordes dorados y con puntilla. Sácalo con la espátula escurriendo el aceite.",
      "Tuesta el pan y sirve el huevo encima con el brócoli al lado. Sal sobre la clara, no sobre la yema."
    ]
  },

  "Atún con pasta y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "El atún de lata ya está cocido: no se cocina, se añade al final. Escúrrelo bien.",
      "Limpia los champiñones con papel húmedo y córtalos en láminas.",
      "Saltéalos en una sartén con una cucharada de aceite a fuego fuerte 5 minutos, hasta que suelten el agua, se evapore y queden dorados. Sin ese punto saben a nada.",
      "Calienta la pasta ya cocida en la misma sartén con dos cucharadas de agua, removiendo 1 minuto.",
      "Apaga el fuego y añade el atún desmigado, mezclando con suavidad para que no se haga polvo.",
      "Pimienta, un hilo de aceite crudo y, si tienes, una pizca de guindilla u orégano. Prueba de sal: el atún ya lleva."
    ]
  },

  "Jamón serrano con cuscús y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "El jamón serrano es curado, NO se cocina: en la sartén se encoge, se endurece y suelta toda su sal. Va crudo, al final, encima del plato.",
      "Limpia los champiñones con papel húmedo y córtalos en láminas.",
      "Saltéalos en una sartén con una cucharada de aceite a fuego fuerte 5 minutos, hasta que suelten el agua, se evapore y se doren.",
      "Calienta el cuscús: un chorrito de agua caliente, tapado 2 minutos, y ahuécalo con un tenedor.",
      "Mezcla el cuscús con los champiñones y una pizca de pimienta.",
      "Reparte las lonchas de jamón por encima, sin trocearlas mucho. El calor del cuscús las atempera lo justo. No añadas sal: el jamón la pone toda."
    ]
  },

  "Yogur griego con granola y kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela el kiwi con una cuchara: clava la punta entre la piel y la carne y ve girando la fruta. Sale entero y limpio, sin desperdiciar.",
      "Córtalo en rodajas.",
      "Pon el yogur en un bol.",
      "AÑADE LA GRANOLA JUSTO ANTES DE COMER, no antes: en contacto con el yogur se reblandece en minutos y pierde lo crujiente.",
      "Reparte el kiwi por encima.",
      "Si lo quieres más dulce, un hilo de miel; el kiwi ya aporta acidez."
    ]
  },

  "Tortitas de arroz con mantequilla de cacahuete": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "La tortita de arroz se parte si aprietas: es aire prensado. Todo esto es para no romperla.",
      "La mantequilla de cacahuete tiene que estar a temperatura ambiente, blanda. Si está dura de la nevera, mete la cuchara 10 segundos en agua caliente.",
      "Deja caer una cucharada en el centro de la tortita y EXTIÉNDELA DEL CENTRO HACIA FUERA con el dorso de la cuchara, la tortita apoyada en la mano abierta, sin presionar.",
      "Corta el plátano en rodajas finas y colócalas encima; el peso ligero no la rompe.",
      "Come sobre un plato: al morder suelta trozos.",
      "Dos tortitas hacen un desayuno; una sola se queda corta."
    ]
  },

  "Alubias con cuscús y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Escurre y enjuaga las alubias de bote. Son AÚN MÁS FRÁGILES que las lentejas: casi no hay que removerlas o se hacen crema.",
      "Saltea las verduras congeladas en una sartén con una cucharada de aceite a fuego fuerte 6 minutos, hasta que suelten el agua y se evapore.",
      "Baja el fuego a medio, añade las alubias y dos cucharadas de agua, y calienta 2 minutos moviendo la sartén en vez de remover con cuchara.",
      "Calienta el cuscús aparte: agua caliente por encima, tapado 2 minutos.",
      "Ahueca el cuscús con un tenedor, nunca con cuchara, y mézclalo con las alubias y las verduras con cuidado.",
      "Sal, pimienta y un hilo de aceite crudo. Un poco de pimentón le sienta bien."
    ]
  },

  // ── Tanda 2026-08-31 (c) (182 → 207 platos) ──────────────────────────
  // Pescado. A partir de aquí el catálogo son permutaciones: la técnica
  // de cada proteína ya está escrita en un plato hermano, así que estos
  // son más cortos y reutilizan las mismas frases a propósito. Siguen
  // llevando cantidades, tiempos y una señal de "está hecho". Bloques
  // que se repiten: salmón (piel abajo 4+2 min, láminas), merluza (una
  // sola vuelta, se deshace), bacalao (aviso de desalado), lata (ya
  // cocida, al final), coliflor (se pasa a puré en un minuto).

  "Salmón con espinacas y pasta": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de salmón y sálalos. Sartén a fuego medio-alto con una cucharadita de aceite.",
      "Salmón con la piel hacia abajo 4 minutos sin moverlo, luego 2 minutos por el otro lado. Hecho cuando se abre en láminas y el centro ha pasado de rojo a rosa.",
      "Sácalo. En la misma sartén, fuego bajo, echa las espinacas y remueve 1 minuto hasta que bajen.",
      "Añade la pasta ya cocida con dos cucharadas de agua y mezcla 1 minuto.",
      "Sirve la pasta con el salmón encima en trozos. Limón y pimienta."
    ]
  },

  "Salmón horneado con quinoa y espinacas": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Horno a 200 grados. Pon los lomos de salmón en una fuente sobre papel de hornear, con un hilo de aceite y sal.",
      "Hornea 12 minutos para un lomo de dos dedos. Hecho cuando al apretar se abre en láminas.",
      "Calienta la quinoa; si está apelmazada, un poco de agua y ahuécala con un tenedor.",
      "Saltea las espinacas 1 minuto en una sartén con una gota de aceite, o escáldalas 30 segundos, hasta que bajen.",
      "Mezcla la quinoa con las espinacas y pon el salmón encima. Limón al final."
    ]
  },

  "Salmón con patatas y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua hirviendo con sal; escúrrela EN CUANTO ceda, que pasa a puré en nada.",
      "Corta la patata ya cocida en rodajas y dórala en una sartén con una cucharada de aceite 3 minutos por lado. Sácala.",
      "En la misma sartén, salmón con la piel abajo 4 minutos, vuelta 2 minutos. Hecho cuando se abre en láminas.",
      "Da a la coliflor un salteado rápido de 2 minutos en la grasa de la sartén para que coja tostado.",
      "Sirve las patatas y la coliflor con el salmón encima. Sal y pimienta."
    ]
  },

  "Salmón con quinoa y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calabacín en medias lunas de medio centímetro. Saltéalo en la sartén con una cucharada de aceite y sal a fuego medio-alto 5 minutos hasta dorar. Sácalo.",
      "En la misma sartén, salmón con la piel abajo 4 minutos, vuelta 2 minutos. Hecho cuando se abre en láminas y el centro pasó de rojo a rosa.",
      "Calienta la quinoa con un chorrito de agua y ahuécala con un tenedor.",
      "Mezcla la quinoa con el calabacín y pon el salmón encima. Limón y pimienta."
    ]
  },

  "Salmón con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua hirviendo con sal; escúrrelo cuando el cuchillo entre pero el tallo resista.",
      "Seca los lomos de salmón y sálalos. Sartén a fuego medio-alto con una cucharadita de aceite: piel abajo 4 minutos, vuelta 2 minutos.",
      "Calienta el trigo sarraceno (tiene sabor a nuez); sepáralo con un tenedor, no lo machaques.",
      "Sirve el trigo sarraceno de base con el brócoli y el salmón encima. Limón al final."
    ]
  },

  "Merluza con quinoa y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de merluza y sálalos. Es un pescado que se DESHACE: una sola vuelta y con cuidado.",
      "Sartén a fuego medio con una cucharada de aceite. Merluza 3 minutos por lado. Hecha cuando está opaca y se separa en lascas.",
      "Sácala. Echa el tomate en dados en la sartén, 5 minutos a fuego medio hasta salsa espesa, aplastándolo.",
      "Calienta la quinoa y ahuécala con un tenedor.",
      "Sirve la quinoa con la salsa de tomate y la merluza encima. Sal al final."
    ]
  },

  "Merluza con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin las venas blancas (amargan), en tiras. Saltéalo a fuego fuerte 6 minutos hasta que le salgan manchas oscuras. Sácalo.",
      "Patata cocida en rodajas, dorada en la sartén 3 minutos por lado. Sácala.",
      "Merluza seca y salada, a fuego medio 3 minutos por lado, UNA sola vuelta con cuidado. Hecha cuando se separa en lascas.",
      "Sirve las patatas y los pimientos con la merluza encima. Limón y sal."
    ]
  },

  "Merluza con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (límpialos con papel, no bajo el grifo). Saltéalos a fuego fuerte 5 minutos hasta que suelten el agua y se vuelva a evaporar. Sácalos.",
      "Merluza seca y salada, a fuego medio con una cucharada de aceite, 3 minutos por lado. Una sola vuelta: se deshace. Lascas = hecha.",
      "Calienta la quinoa y ahuécala con un tenedor; mézclala con los champiñones.",
      "Pon la merluza encima. Pimienta y limón."
    ]
  },

  "Merluza con arroz y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Zanahoria en rodajas finas, 6 minutos en agua hirviendo con sal.",
      "Merluza seca y salada, sartén a fuego medio con una cucharada de aceite, 3 minutos por lado. Una sola vuelta con cuidado. Lascas = hecha.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor.",
      "Sirve el trigo sarraceno con la zanahoria y la merluza encima. Sal y limón."
    ]
  },

  "Bacalao con espinacas y arroz": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Si tu bacalao es salado, tiene que estar ya DESALADO (24-36 h en agua en la nevera, cambiándola 3 veces). El fresco o congelado sin sal, directo.",
      "Seca el bacalao. Sartén a fuego MEDIO (no fuerte, o se pone estropajoso) con una cucharada de aceite: piel abajo 4 minutos, vuelta 2 minutos. Lascas grandes = hecho.",
      "Sácalo. Echa las espinacas en la sartén, 1 minuto hasta que bajen.",
      "Calienta el arroz con un chorrito de agua, tapado 1 minuto.",
      "Sirve el arroz con las espinacas y el bacalao en lascas. Sal con cuidado: aun desalado, sala."
    ]
  },

  "Bacalao con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Bacalao salado = ya desalado (24-36 h, 3 cambios de agua). Fresco o sin sal, directo.",
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo aún resista.",
      "Bacalao seco, sartén a fuego medio con una cucharada de aceite, piel abajo 4 minutos + 2 minutos. Lascas = hecho.",
      "Sirve el arroz caliente con el brócoli y el bacalao encima. Un hilo de aceite crudo y pimienta."
    ]
  },

  "Bacalao con patatas y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Bacalao salado = ya desalado. Fresco o sin sal, directo.",
      "Calabacín en medias lunas de medio centímetro y patata cocida en rodajas: dóralos juntos en la sartén con una cucharada de aceite y sal, 5 minutos. Sácalos.",
      "Bacalao seco, fuego medio, piel abajo 4 minutos + 2 minutos. Suave o se pone estropajoso. Lascas = hecho.",
      "Sirve las patatas y el calabacín con el bacalao encima. Sal con cuidado."
    ]
  },

  "Bacalao con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Bacalao salado = ya desalado (24-36 h). Fresco o sin sal, directo.",
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Bacalao seco, fuego medio con una cucharada de aceite, piel abajo 4 minutos + 2 minutos. Lascas = hecho.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor; mézclalo con la coliflor.",
      "Pon el bacalao encima en lascas. Pimienta."
    ]
  },

  "Bacalao con arroz integral y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Bacalao salado = ya desalado. Fresco o sin sal, directo.",
      "Verduras congeladas directas a fuego fuerte con una cucharada de aceite, 5 minutos hasta que evaporen su agua. Sácalas.",
      "Bacalao seco, fuego medio, piel abajo 4 minutos + 2 minutos. Suave. Lascas = hecho.",
      "Calienta el arroz integral con un chorrito de agua, tapado 1 minuto; mézclalo con las verduras.",
      "Pon el bacalao encima. Sal con cuidado, aun desalado sala."
    ]
  },

  "Lubina con pasta y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Seca los lomos de lubina y sálalos. Si tienen piel, dos cortes superficiales para que no se encoja.",
      "Sartén a fuego medio-alto con una cucharada de aceite. Lubina con la PIEL ABAJO, aprieta 10 segundos con la espátula para que no se curve; 4 minutos así, 1 minuto por el otro lado.",
      "Calienta la pasta con dos cucharadas de agua; mézclala con el brócoli.",
      "Pon la lubina encima. Limón y aceite crudo."
    ]
  },

  "Lubina con cuscús y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Verduras congeladas directas a fuego fuerte 5 minutos hasta que evaporen su agua. Sácalas.",
      "Lubina seca y salada, con dos cortes en la piel. Piel abajo, aprieta 10 segundos, 4 minutos; vuelta 1 minuto.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR nunca cuchara.",
      "Mezcla el cuscús con las verduras y pon la lubina encima. Limón."
    ]
  },

  "Lubina con patatas y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Patata cocida en rodajas, dorada en la sartén 3 minutos por lado. Sácala.",
      "Lubina seca y salada, piel abajo con la espátula apretando 10 segundos, 4 minutos; vuelta 1 minuto.",
      "Sirve las patatas y la coliflor con la lubina encima. Sal y limón."
    ]
  },

  "Rape con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "El rape es FIRME y grueso: necesita más tiempo del que parece. Córtalo en medallones de 3 centímetros y sálalo.",
      "Zanahoria en rodajas finas, 6 minutos en agua con sal.",
      "Sartén a fuego medio-alto con una cucharada de aceite. Rape 3 o 4 minutos por lado. Hecho cuando está BLANCO HASTA EL CENTRO (ábrelo con el cuchillo), no cuando cambia la superficie.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor; mézclalo con la zanahoria.",
      "Pon el rape encima. Pimienta y limón."
    ]
  },

  "Rape con cuscús y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Rape en medallones de 3 centímetros, salado. Firme y grueso, tarda por dentro.",
      "Sartén a fuego medio-alto con una cucharada de aceite. 3 o 4 minutos por lado. Ábrelo: blanco hasta el centro = hecho.",
      "Sácalo. Echa las espinacas en la sartén, 1 minuto hasta que bajen.",
      "Cuscús: agua caliente, tapado 2 minutos, ahueca con tenedor. Mézclalo con las espinacas.",
      "Pon el rape encima. Limón."
    ]
  },

  "Rape con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin venas blancas en tiras, salteado a fuego fuerte 6 minutos hasta manchas oscuras. Sácalo.",
      "Patata cocida en rodajas, dorada 3 minutos por lado. Sácala.",
      "Rape en medallones de 3 cm, 3 o 4 minutos por lado. Blanco hasta el centro (ábrelo) = hecho.",
      "Sirve las patatas y los pimientos con el rape encima. Sal y limón."
    ]
  },

  "Pasta con sardinas y tomate": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Las sardinas de lata YA ESTÁN cocidas: se escurren y se desmigan, van al final. La espina es blanda y se come.",
      "Echa el tomate en dados en una sartén con una cucharada de aceite, 6 minutos a fuego medio hasta salsa espesa.",
      "Calienta la pasta ya cocida en la sartén con dos cucharadas de agua, mezclando con el tomate 1 minuto.",
      "Apaga y añade las sardinas desmigadas, con suavidad. Pimienta, limón y aceite crudo."
    ]
  },

  "Sardinas con tomate y arroz": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Sardinas de lata: escúrrelas y desmígalas, van al final. Espina blanda, se come.",
      "Tomate en dados, 6 minutos en una sartén con aceite hasta salsa espesa.",
      "Calienta el arroz con un chorrito de agua, tapado 1 minuto; mézclalo con el tomate.",
      "Añade las sardinas por encima en trozos. Limón y pimienta."
    ]
  },

  "Sardinas con arroz y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Saltéala 3 minutos en una sartén con una cucharada de aceite para que coja tostado.",
      "Calienta el arroz con un chorrito de agua; mézclalo con la coliflor.",
      "Escurre las sardinas de lata, desmígalas y repártelas por encima. Limón, pimienta, aceite crudo."
    ]
  },

  "Sardinas con pasta y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Verduras congeladas directas a fuego fuerte con una cucharada de aceite, 5 minutos hasta que evaporen su agua.",
      "Calienta la pasta ya cocida en la sartén con dos cucharadas de agua, mezclando con las verduras 1 minuto.",
      "Apaga y añade las sardinas de lata escurridas y desmigadas, con suavidad.",
      "Limón, pimienta y un hilo de aceite crudo."
    ]
  },

  "Sardinas con arroz integral y brócoli": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Calienta el arroz integral con un chorrito de agua, tapado 1 minuto (viene seco).",
      "Mezcla el arroz con el brócoli.",
      "Escurre y desmiga las sardinas de lata y repártelas por encima. Limón y aceite crudo."
    ]
  },

  // ── Tanda 2026-08-31 (d) (207 → 235 platos) ──────────────────────────
  // Carne. Mismo criterio que la tanda de pescado: la técnica de cada
  // corte ya está escrita, así que estos reutilizan los bloques a
  // propósito. Frases que se repiten: ternera CONTRA LA FIBRA, solomillo
  // que REPOSA 5 min, lomo de cerdo que se retira "de rosa a pálido",
  // picada que se dora SIN remover el primer minuto, jamón serrano que NO
  // se cocina, conejo dorado + 35 min tapado.

  "Poke bowl de pollo con arroz y aguacate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en dados, sécalos y sálalos. Sartén a fuego alto con una cucharada de aceite, 5 minutos, hasta que no queden rosas. Si tienes salsa de soja, un chorrito al final.",
      "Pela la zanahoria y córtala en tiras finas o rállala en grueso: va cruda, aporta el punto crujiente.",
      "Abre el aguacate, quita el hueso, saca la carne con una cuchara y córtalo en láminas SIN aplastarlo.",
      "Monta el bol: arroz de base templado o a temperatura ambiente, y encima el pollo, el aguacate y la zanahoria en montones separados. Es un plato de contrastes, no un salteado."
    ]
  },

  "Quinoa con verduras asadas y pollo": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Horno a 200 grados. Extiende las verduras congeladas en una bandeja con una cucharada de aceite y sal, EN UNA SOLA CAPA. Amontonadas se cuecen al vapor y no se asan.",
      "Corta la pechuga en trozos grandes, sécala, sálala y ponla en la misma bandeja.",
      "Hornea 20 minutos, removiendo a la mitad. El pollo está hecho cuando al abrir el trozo más gordo el jugo sale claro.",
      "Calienta la quinoa, ahuécala con un tenedor y mézclala con las verduras y el pollo, con todo el jugo de la bandeja."
    ]
  },

  "Ensalada de pollo con aguacate y quinoa": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en tiras, sécalas y sálalas. Sartén a fuego medio-alto con una cucharada de aceite, 5 minutos, hasta que no queden rosas. Déjala templar.",
      "Calienta la quinoa, ahuécala con un tenedor y déjala templar también: caliente, aguaría las espinacas.",
      "Abre el aguacate y córtalo en dados sin aplastarlo.",
      "Mezcla la quinoa, las espinacas crudas, el pollo y el aguacate con una cucharada de aceite, un chorro de limón y sal. Se come templada o fría."
    ]
  },

  "Pavo con pasta integral y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pon el agua de la pasta a hervir con una cucharada colmada de sal (si viene ya cocida, sáltatelo).",
      "Corta el pavo en tiras finas, sécalo y sálalo. Es más seco que el pollo: fino y poco tiempo.",
      "Dóralo en una sartén con una cucharada de aceite a fuego medio-alto 4 minutos, hasta que pierda el rosa. Retíralo.",
      "Echa el tomate en dados en la misma sartén, 6 minutos hasta salsa espesa. Devuelve el pavo, mezcla con la pasta y una cucharada de su agua, y sirve."
    ]
  },

  "Carne picada al wok con arroz": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Sartén o wok a fuego ALTO con una cucharada de aceite. Echa la carne picada y NO LA REMUEVAS el primer minuto para que se dore por debajo.",
      "Rómpela en trozos y saltea 4 minutos. Si suelta agua, sube el fuego y espera a que se evapore: mientras haya agua, se cuece gris en vez de dorarse.",
      "Aparta la carne a un lado, echa las verduras congeladas en el hueco y saltéalas 4 minutos a fuego fuerte.",
      "Mezcla todo con el arroz caliente y un chorrito de salsa de soja o sal."
    ]
  },

  "Cerdo con cuscús y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Zanahoria en rodajas finas, 7 minutos en agua hirviendo con sal.",
      "Corta el lomo en filetes de un dedo, secos y salados. Sartén a fuego medio-alto con una cucharada de aceite, 3 minutos + 2 minutos.",
      "Retira el cerdo cuando el centro pase de rosa a pálido, no del todo blanco: es muy magro y se seca. Termina en el plato con su calor.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR. Mézclalo con la zanahoria y sirve con el cerdo."
    ]
  },

  "Pollo con pasta y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calabacín en medias lunas de medio centímetro. Saltéalo con una cucharada de aceite y sal a fuego medio-alto 5 minutos hasta dorar. Sácalo.",
      "Corta la pechuga en dados, secos y salados. En la misma sartén, fuego alto, 5 minutos hasta que no queden rosas.",
      "Devuelve el calabacín, añade la pasta ya cocida con dos cucharadas de agua y mezcla 1 minuto.",
      "Pimienta, un hilo de aceite crudo y queso rallado si tienes."
    ]
  },

  "Muslo de pollo con pasta y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), salteados a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua. Sácalos.",
      "Muslos secos y salados, piel abajo en la misma sartén 6 o 7 minutos sin mover hasta que la piel esté crujiente, vuelta 5 minutos. Jugo claro al pinchar = hecho.",
      "Trocea el pollo, devuélvelo con los champiñones, añade la pasta con dos cucharadas de agua y mezcla 1 minuto.",
      "Pimienta y el jugo dorado de la sartén por encima."
    ]
  },

  "Carne picada con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela EN CUANTO ceda, pasa a puré en nada.",
      "Extiende el pavo picado en una sartén a fuego alto SIN tocarlo 1 minuto. Rómpelo y saltea 4 minutos. En cuanto pierde el rosa, ya está: pasado queda seco y arenoso.",
      "Añade la coliflor y saltea 2 minutos para que coja algo de tostado.",
      "Mezcla con la quinoa caliente. Sal, pimienta, pimentón si tienes."
    ]
  },

  "Carne picada con quinoa y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calabacín en dados de un centímetro, salteado con una cucharada de aceite y sal a fuego fuerte 5 minutos hasta dorar. Sácalo.",
      "En la misma sartén, carne picada a fuego alto SIN remover 1 minuto; rómpela y saltea 5 minutos. Si suelta agua, sube el fuego hasta que se evapore.",
      "Devuelve el calabacín, mezcla con la quinoa caliente.",
      "Sal, pimienta y un poco de tomate frito si quieres jugosidad."
    ]
  },

  "Carne picada con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Carne picada a fuego alto SIN remover 1 minuto; rómpela y saltea 5 minutos hasta que no quede rosa y el agua se evapore.",
      "Añade el brócoli y el trigo sarraceno con un chorrito de agua, saltea 2 minutos. Separa el grano con tenedor.",
      "Sal, pimienta y salsa de soja o un poco de tomate concentrado."
    ]
  },

  "Ternera con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Zanahoria en rodajas finas, 6 minutos en agua con sal.",
      "Corta la ternera en tiras FINAS y CONTRA LA FIBRA (cruza las líneas de la carne, o queda dura). Sécala y sálala.",
      "Sartén a fuego MÁXIMO con una cucharada de aceite. Ternera en una sola capa, 2 minutos. Pasada de ahí se seca y endurece.",
      "Mezcla con el trigo sarraceno caliente (sepáralo con tenedor) y la zanahoria. Pimienta."
    ]
  },

  "Ternera con arroz integral y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua. Sácalos.",
      "Ternera en tiras finas CONTRA LA FIBRA, seca y salada. Fuego máximo, 2 minutos en una sola capa. No más.",
      "Devuelve los champiñones, mezcla con el arroz integral caliente (un chorrito de agua, tapado 1 minuto).",
      "Pimienta y un hilo de aceite crudo."
    ]
  },

  "Solomillo de ternera con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Saca el solomillo 15 minutos antes, sécalo y sálalo. Fuego ALTO, 2 minutos por lado para una pieza de 3 cm.",
      "REPOSA la carne 5 minutos en un plato antes de cortar, o todo el jugo se va al plato. Córtala contra la fibra.",
      "Saltea la coliflor 2 minutos en la sartén, mézclala con el trigo sarraceno (sepáralo con tenedor) y sirve con el solomillo en lonchas."
    ]
  },

  "Solomillo de ternera con arroz integral y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Saca el solomillo 15 minutos antes, sécalo y sálalo.",
      "Verduras congeladas directas a fuego fuerte con una cucharada de aceite, 5 minutos hasta que evaporen su agua. Sácalas.",
      "Solomillo a fuego ALTO 2 minutos por lado (3 cm). REPOSA 5 minutos antes de cortar. Córtalo contra la fibra.",
      "Calienta el arroz integral (chorrito de agua, tapado 1 minuto), mézclalo con las verduras y sirve con la carne."
    ]
  },

  "Lomo de cerdo con arroz integral y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Filetes de lomo de un dedo, secos y salados. Sartén a fuego medio-alto con una cucharada de aceite, 3 minutos + 2 minutos.",
      "Retíralo cuando el centro pase de rosa a pálido: es muy magro, del todo blanco queda seco.",
      "Echa las espinacas en la sartén, 1 minuto hasta que bajen.",
      "Calienta el arroz integral (chorrito de agua, tapado 1 minuto), mézclalo con las espinacas y sirve con el cerdo. Pimienta."
    ]
  },

  "Lomo de cerdo con cuscús y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin las venas blancas (amargan), en tiras. Fuego fuerte 6 minutos hasta manchas oscuras. Sácalo.",
      "Filetes de lomo de un dedo, secos y salados. Misma sartén, 3 minutos + 2 minutos. Fuera cuando el centro pasa de rosa a pálido.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR.",
      "Mezcla el cuscús con los pimientos y sirve con el cerdo. Pimienta."
    ]
  },

  "Conejo con cuscús y calabacín": {
    difficulty: 3,
    equipment: ["olla"],
    steps: [
      "El conejo es muy magro y con huesos finos: hecho rápido queda como suela. Trocéalo, sécalo y sálalo.",
      "Dóralo en una olla ancha con dos cucharadas de aceite a fuego fuerte, por tandas, 6 minutos.",
      "Fuego al mínimo, medio vaso de agua, tapa, 35 minutos. Añade agua a media cocción si se seca. Se separa del hueso = hecho. OJO CON LAS ESPINAS FINAS.",
      "Saltea el calabacín en dados 5 minutos aparte. Cuscús con agua caliente, tapado 2 minutos, tenedor. Sirve el conejo con su jugo."
    ]
  },

  "Jamón serrano con patatas y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "El jamón serrano es curado, NO se cocina: va crudo al final, encima. Si lo salteas se endurece y suelta toda su sal.",
      "Zanahoria en rodajas, 8 minutos en agua hirviendo con sal.",
      "Corta la patata cocida en dados y saltéala con una cucharada de aceite 5 minutos hasta dorar, o caliéntala con la zanahoria el último minuto.",
      "Sirve patata y zanahoria, reparte el jamón por encima sin trocearlo mucho. NO añadas sal: la pone toda el jamón. Un hilo de aceite crudo."
    ]
  },

  "Pechuga de pollo al vapor con quinoa": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Pon la pechuga entera en un colador metálico sobre una olla con dos dedos de agua hirviendo, sin que el agua la toque. Tapa.",
      "12 minutos para una pechuga normal. Hecha cuando al cortar por el centro es blanca sin rastro de rosa. El vapor la deja jugosa sin dorarla.",
      "Añade el brócoli en ramilletes al colador los últimos 5 minutos.",
      "Calienta la quinoa, ahuécala con un tenedor. Sirve con la pechuga en lonchas y el brócoli. Sal, pimienta, limón y un hilo de aceite crudo (no se ha usado grasa hasta aquí)."
    ]
  },

  "Pollo mediterráneo con cuscús y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en dados, secos y salados. Sartén a fuego alto con una cucharada de aceite, 5 minutos, hasta que no queden rosas. Con orégano si tienes.",
      "Baja el fuego, echa el tomate en dados y deja 5 minutos hasta salsa espesa, aplastándolo.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR.",
      "Mezcla el cuscús con el pollo y el tomate. Aceite crudo y pimienta."
    ]
  },

  "Ternera salteada con espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la ternera en tiras FINAS y CONTRA LA FIBRA (cruza las líneas o queda dura), seca y salada.",
      "Sartén a fuego MÁXIMO con una cucharada de aceite. Ternera en una sola capa, 2 minutos. Pasada de ahí se seca.",
      "Añade el tomate en dados, 2 minutos, y luego las espinacas: bajan en 30 segundos con el calor.",
      "Pimienta y sirve enseguida."
    ]
  },

  "Carne picada con cuscús y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Zanahoria en dados pequeños, 8 minutos en agua con sal (o rallada, cruda, para textura).",
      "Carne picada a fuego alto SIN remover 1 minuto; rómpela y saltea 5 minutos. Si suelta agua, súbelo hasta que se evapore o se cuece gris.",
      "Cuscús: agua caliente, tapado 2 minutos, tenedor.",
      "Mezcla cuscús, carne y zanahoria. Sal, pimienta, pimentón o comino si tienes."
    ]
  },

  "Pavo al horno con quinoa y verduras": {
    difficulty: 2,
    equipment: ["horno"],
    steps: [
      "Horno a 200 grados. Pon la pechuga de pavo entera en una bandeja con las verduras congeladas alrededor, un hilo de aceite y sal.",
      "Hornea 25 minutos. El pavo es seco: sácalo en cuanto el centro esté blanco al cortar, no lo pases.",
      "Deja reposar el pavo 5 minutos antes de cortar en lonchas.",
      "Calienta la quinoa, ahuécala con un tenedor y mézclala con las verduras y su jugo. Sirve con el pavo."
    ]
  },

  "Pollo con cuscús y coliflor": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Corta la pechuga en dados, secos y salados. Sartén a fuego alto, 5 minutos, hasta que no queden rosas.",
      "Añade la coliflor y saltea 2 minutos para que coja tostado.",
      "Cuscús: agua caliente, tapado 2 minutos, tenedor. Mézclalo con todo. Pimentón y pimienta."
    ]
  },

  "Muslo de pollo con arroz integral y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Muslos secos y salados, piel abajo en una sartén con una cucharadita de aceite 6 o 7 minutos sin mover hasta que la piel esté crujiente, vuelta 5 minutos. Jugo claro = hecho.",
      "Trocea el pollo, resérvalo. Echa las espinacas en la sartén, 1 minuto hasta que bajen.",
      "Calienta el arroz integral (chorrito de agua, tapado 1 minuto), mézclalo con las espinacas.",
      "Pon el pollo encima con el jugo dorado de la sartén."
    ]
  },

  "Muslo de pollo con cuscús y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin venas blancas en tiras, fuego fuerte 6 minutos hasta manchas oscuras. Sácalo.",
      "Muslos secos y salados, piel abajo 6 o 7 minutos sin mover hasta piel crujiente, vuelta 5 minutos. Jugo claro = hecho.",
      "Cuscús: agua caliente, tapado 2 minutos, tenedor. Mézclalo con los pimientos.",
      "Trocea el pollo y sírvelo encima con su jugo."
    ]
  },

  // ── Tanda 2026-08-31 (e) (234 → 264 platos) ──────────────────────────
  // Latas, marisco cocido, legumbres de bote, tofu y tempeh, y los
  // montados (wrap, bocadillo). Bloques repetidos: lata (ya cocida, al
  // final, no se fríe), marisco cocido (45 s a 1 min o goma), legumbre de
  // bote (enjuagar, calentar suave, REMOVER LO JUSTO, vinagre al final),
  // tofu (PRENSAR 15 min, no tocar 4 min), tempeh (hervir 10 min contra
  // el amargor), pan que no se moja (barrera de grasa, tomate al centro).

  "Wrap de salmón con aguacate y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de salmón y sálalos. Sartén a fuego medio-alto con una cucharadita de aceite: piel abajo 4 minutos, vuelta 2 minutos. Se abre en láminas = hecho.",
      "Desmenúzalo en trozos grandes quitando la piel.",
      "Calienta el wrap 10 segundos por lado en la sartén o en el microondas: frío se raja al doblarlo.",
      "Machaca el aguacate con sal, úntalo por el centro dejando 3 cm de borde. Pon las espinacas crudas y el salmón sin pasarte de relleno, dobla los lados y enrolla apretando."
    ]
  },

  "Macarrones con atún y verduras": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Verduras congeladas directas a fuego fuerte con una cucharada de aceite, 5 minutos hasta que evaporen su agua.",
      "Calienta los macarrones ya cocidos en la sartén con dos cucharadas de agua, mezclando con las verduras 1 minuto.",
      "Apaga y añade el atún de lata escurrido, sin remover mucho para que no se haga polvo.",
      "Pimienta, un hilo de aceite crudo y tomate frito si quieres jugosidad."
    ]
  },

  "Bocadillo de pavo con queso y verduras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "El enemigo del bocadillo es el pan mojado. Abre el pan y unta las dos caras con una capa fina de aceite: hace de barrera.",
      "Pon el queso pegado al pan por los dos lados: sella la miga.",
      "El pavo en lonchas en el centro. El tomate en rodajas ESCURRIDO en papel de cocina, también en el centro, nunca tocando el pan.",
      "Cierra, aprieta con la palma unos segundos y cómelo pronto."
    ]
  },

  "Atún con arroz y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Zanahoria en rodajas finas, 7 minutos en agua hirviendo con sal.",
      "Calienta el arroz con un chorrito de agua, tapado 1 minuto; mézclalo con la zanahoria.",
      "Escurre bien el atún y repártelo por encima en trozos, sin remover mucho.",
      "Aceite, un chorro de vinagre o limón y sal. Frío también vale, de ensalada de arroz."
    ]
  },

  "Caballa con quinoa y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin las venas blancas (amargan) en tiras, salteado a fuego fuerte 6 minutos hasta manchas oscuras.",
      "Calienta la quinoa y ahuécala con un tenedor; mézclala con el pimiento.",
      "Escurre la caballa de lata y desmígala por encima. Ya está cocida, va al final; no la frías.",
      "Limón y pimienta. La caballa ya sala, prueba antes."
    ]
  },

  "Gambas con quinoa y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Verduras congeladas directas a fuego fuerte 5 minutos hasta que evaporen su agua.",
      "Las gambas YA ESTÁN COCIDAS: 45 segundos en la sartén solo para templarlas, ni un segundo más o se vuelven gomas.",
      "Calienta la quinoa y ahuécala con un tenedor; mézclala con las verduras.",
      "Pon las gambas encima. Limón y sal con cuidado, ya llevan."
    ]
  },

  "Gambas con quinoa y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda, pasa a puré en nada.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor; mézclalo con la coliflor.",
      "Gambas cocidas: 45 segundos en la sartén con una cucharadita de aceite solo para templar. Más = goma.",
      "Pon las gambas encima. Limón, pimienta."
    ]
  },

  "Langostinos con quinoa y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin venas blancas en tiras, salteado a fuego fuerte 6 minutos hasta manchas oscuras.",
      "Pela los langostinos cocidos si vienen con cáscara (cabeza, patas, cuerpo), con las manos.",
      "Échalos a la sartén 1 minuto solo para templar. Ya están cocidos; recocerlos los vuelve correosos.",
      "Calienta el trigo sarraceno, sepáralo con tenedor y mézclalo con el pimiento. Langostinos encima. Limón."
    ]
  },

  "Garbanzos con arroz y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Calabacín en dados de un centímetro, salteado con una cucharada de aceite y sal a fuego medio-alto 5 minutos hasta dorar.",
      "Escurre y enjuaga los garbanzos de bote hasta que el agua salga clara. Añádelos a la sartén con medio vaso de agua, 3 minutos. Ya están tiernos: solo cogen sabor.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor; mézclalo con todo.",
      "Sal, pimienta y pimentón. Un hilo de aceite crudo."
    ]
  },

  "Garbanzos con arroz integral y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Escurre y enjuaga los garbanzos de bote. Caliéntalos en una sartén con una cucharada de aceite y medio vaso de agua, 3 minutos, removiendo poco para no deshacerlos.",
      "Calienta el arroz integral (chorrito de agua, tapado 1 minuto).",
      "Mezcla arroz, garbanzos y brócoli. Sal, pimienta, pimentón, aceite crudo."
    ]
  },

  "Lentejas con cuscús y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua.",
      "Escurre y enjuaga las lentejas de bote hasta que el agua salga clara. Añádelas a la sartén y calienta 3 minutos a fuego suave, REMOVIENDO LO JUSTO o se hacen puré.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR.",
      "Mezcla todo con cuidado. Un chorrito de vinagre al final levanta las lentejas. Sal y pimienta."
    ]
  },

  "Alubias con arroz integral y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Escurre y enjuaga las alubias de bote. Son MUY FRÁGILES: casi no se remueven o se hacen crema.",
      "Caliéntalas en una sartén con una cucharada de aceite y dos cucharadas de agua, 2 minutos, moviendo la sartén en vez de remover.",
      "Mezcla con el arroz integral caliente y la coliflor. Sal, pimienta, pimentón, aceite crudo."
    ]
  },

  "Tofu con cuscús y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "PRENSA el tofu 15 minutos con un plato con peso encima: está lleno de agua y sin esto no dora y salpica.",
      "Córtalo en dados, sálalos. Sartén a fuego medio-alto con una cucharada de aceite; NO LOS TOQUES 4 minutos hasta que tengan costra, luego 3 minutos más dándoles vueltas.",
      "Echa las espinacas en la sartén, 1 minuto hasta que bajen.",
      "Cuscús: agua caliente, tapado 2 minutos, tenedor. Mézclalo con el tofu y las espinacas. Soja o sal."
    ]
  },

  "Tofu con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Prensa el tofu 15 minutos con un peso encima. Dados, sal.",
      "Pimiento sin venas blancas en tiras, salteado a fuego fuerte 6 minutos hasta manchas oscuras. Sácalo.",
      "Patata cocida en rodajas, dorada 3 minutos por lado. Sácala.",
      "Tofu en la misma sartén, sin tocarlo 4 minutos hasta costra, vuelta 3 minutos. Mezcla con patata y pimiento. Soja o sal, pimentón."
    ]
  },

  "Carne picada con cuscús y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "El tempeh crudo amarga. Cuécelo 10 minutos en agua hirviendo cubriéndolo. Escúrrelo y sécalo.",
      "Córtalo en dados y dóralos en una sartén con una cucharada de aceite a fuego medio-alto 5 minutos. Chorrito de soja al final que se pegue.",
      "Brócoli en ramilletes, 4 minutos en agua con sal.",
      "Cuscús: agua caliente, tapado 2 minutos, tenedor. Mezcla todo. Pimienta."
    ]
  },

  "Carne picada con patatas y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Cuece el tempeh 10 minutos en agua hirviendo cubriéndolo (le quita el amargor). Sécalo, dados.",
      "Calabacín en medias lunas y patata cocida en rodajas: dóralos juntos con una cucharada de aceite y sal, 5 minutos. Sácalos.",
      "Dora el tempeh en la misma sartén 5 minutos, con un chorrito de soja al final.",
      "Mezcla con la patata y el calabacín. Pimienta."
    ]
  },

  "Skyr con sardinas y tostadas": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Es una combinación tipo pan escandinavo: sardinas sobre pan, y el skyr untado de base.",
      "Tuesta el pan.",
      "Escurre las sardinas de lata y quítales la espina central tirando con los dedos si te molesta (es blanda, se come).",
      "Unta el pan con una capa fina de skyr, pon las sardinas encima y unas rodajas de tomate. Pimienta y un chorro de limón."
    ]
  },

  "Tortilla de claras con atún y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Escurre el atún de lata. El tomate en dados pequeños, y quítale parte del jugo apretándolo en un colador: si no, la tortilla queda aguada.",
      "Bate las claras con una pizca de sal. Cuajan más rápido y más gomosas que el huevo entero: fuego medio, no fuerte.",
      "Gota de aceite en la sartén, vuelca las claras y, cuando el borde cuaje, reparte el atún y el tomate por una mitad.",
      "Dobla la otra mitad encima, 30 segundos más y al plato. Sácala cuando el centro aún parezca poco hecho."
    ]
  },

  "Claras revueltas con pavo y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Echa las espinacas en la sartén con una gota de aceite a fuego medio, sin nada más, y remueve hasta que bajen y suelten el agua; sube el fuego para que se evapore.",
      "Añade el pavo en lonchas cortado en tiras, 1 minuto solo para templarlo.",
      "Baja el fuego a medio-bajo, echa las claras batidas con una pizca de sal y remueve despacio, llevando el borde cuajado al centro.",
      "Apaga cuando aún brillen y parezcan poco hechas: siguen cuajando en el plato. Pimienta."
    ]
  },

  "Tofu estofado con arroz y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "PRENSA el tofu 15 minutos con un peso encima. Córtalo en dados y sálalos.",
      "Dóralos en una sartén con una cucharada de aceite a fuego medio-alto, sin tocarlos 4 minutos hasta que tengan costra, luego 3 minutos más.",
      "Añade las verduras congeladas y saltea 4 minutos. Luego medio vaso de agua con una cucharada de tomate frito o de soja, y deja que el tofu la ABSORBA 4 minutos, moviendo la sartén, no la cuchara.",
      "Sirve sobre el arroz caliente."
    ]
  },

  "Caballa con patata y brócoli": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "La caballa de lata YA ESTÁ cocida: escúrrela del aceite y desmígala, va al final. No se fríe.",
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Corta la patata cocida en dados y caliéntala con el brócoli el último minuto, o en el microondas.",
      "Mezcla patata y brócoli, reparte la caballa por encima. Limón, pimienta, aceite crudo."
    ]
  },

  "Caballa con arroz integral y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Zanahoria en rodajas finas, 7 minutos en agua con sal.",
      "Calienta el arroz integral con un chorrito de agua, tapado 1 minuto.",
      "Mezcla el arroz con la zanahoria.",
      "Escurre la caballa de lata, desmígala y repártela por encima. Fuerte de sabor: solo limón y pimienta."
    ]
  },

  "Caballa con cuscús y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR.",
      "Mezcla el cuscús con los champiñones.",
      "Escurre la caballa de lata y desmígala por encima. No la frías, ya está hecha. Limón, pimienta."
    ]
  },

  "Gambas con patatas y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Calabacín en medias lunas y patata cocida en rodajas: dóralos juntos con una cucharada de aceite y sal, 5 minutos.",
      "Aparta a un lado. Echa las gambas cocidas en el hueco, 45 segundos solo para templar. Recocidas = gomas.",
      "Mezcla todo 30 segundos y sirve. Limón y pimienta."
    ]
  },

  "Langostinos con patatas y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua.",
      "Patata cocida en rodajas, dorada 3 minutos por lado en la misma sartén.",
      "Langostinos cocidos pelados, 1 minuto solo para templar. Recocidos = correosos.",
      "Mezcla y sirve. Limón, pimienta, aceite crudo."
    ]
  },

  "Langostinos con arroz y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Zanahoria en rodajas finas, 7 minutos en agua con sal.",
      "Calienta el arroz con un chorrito de agua, tapado 1 minuto; mézclalo con la zanahoria.",
      "Langostinos cocidos pelados, templados 1 minuto en una sartén con una cucharadita de aceite. No más.",
      "Ponlos encima. Limón y sal con cuidado."
    ]
  },

  "Atún con arroz y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin venas blancas en tiras, salteado a fuego fuerte 6 minutos hasta manchas oscuras.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor; mézclalo con el pimiento.",
      "Escurre bien el atún de lata y añádelo al final en trozos, sin deshacerlo.",
      "Aceite crudo, pimienta y limón. El atún ya lleva sal."
    ]
  },

  "Atún con arroz integral y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Saltea las espinacas 1 minuto en una sartén con una gota de aceite, hasta que bajen.",
      "Calienta el arroz integral con un chorrito de agua, tapado 1 minuto; mézclalo con las espinacas.",
      "Escurre el atún de lata y añádelo al final en trozos.",
      "Aceite, limón y pimienta."
    ]
  },

  "Garbanzos con pasta y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Verduras congeladas directas a fuego fuerte con una cucharada de aceite, 5 minutos hasta que evaporen su agua.",
      "Escurre y enjuaga los garbanzos de bote. Añádelos a la sartén, 2 minutos, removiendo poco para no deshacerlos.",
      "Añade la pasta ya cocida con dos cucharadas de agua y mezcla 1 minuto.",
      "Sal, pimienta, pimentón y un hilo de aceite crudo."
    ]
  },

  "Lentejas con arroz y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin venas blancas en tiras, salteado a fuego fuerte 6 minutos hasta manchas oscuras.",
      "Escurre y enjuaga las lentejas de bote hasta que el agua salga clara. Añádelas a la sartén y calienta 3 minutos a fuego suave, REMOVIENDO LO JUSTO o se hacen puré.",
      "Calienta el arroz con un chorrito de agua, tapado 1 minuto.",
      "Mezcla todo. Un chorrito de vinagre levanta las lentejas. Sal y pimienta."
    ]
  },

  // ── Tanda 2026-08-31 (f) (264 → 285 platos) ──────────────────────────
  // Últimas permutaciones de cena (proteína + grano + verdura). Mismos
  // bloques. "Merluza al ajillo con verduras" se queda SIN instrucciones:
  // necesita ajo y ese rol sigue sin resolver (T2).

  "Carne picada con cuscús y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calabacín en dados de un centímetro, salteado con una cucharada de aceite y sal a fuego fuerte 5 minutos hasta dorar.",
      "Extiende el pavo picado en la sartén SIN tocarlo 1 minuto; rómpelo y saltea 4 minutos. En cuanto pierde el rosa, ya está: pasado queda seco.",
      "Cuscús: agua caliente por encima, tapado 2 minutos, ahueca con TENEDOR.",
      "Mezcla cuscús, pavo y calabacín. Sal, pimienta, pimentón."
    ]
  },

  "Carne picada con patatas y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Patata cocida en rodajas, dorada en una sartén con una cucharada de aceite 3 minutos por lado. Sácala.",
      "Pavo picado en la misma sartén SIN tocarlo 1 minuto; rómpelo y saltea 4 minutos. En cuanto pierde el rosa, fuera.",
      "Mezcla con la patata y el brócoli. Sal, pimienta, un poco de tomate frito da jugosidad."
    ]
  },

  "Pavo con cuscús y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua. Sácalos.",
      "Pavo en tiras finas, seco y salado. Misma sartén, fuego medio-alto, 4 minutos hasta que pierda el rosa. En cuanto está, fuera: es seco.",
      "Cuscús: agua caliente, tapado 2 minutos, tenedor.",
      "Mezcla cuscús, pavo y champiñones. Pimienta y aceite crudo."
    ]
  },

  "Pavo con patatas y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Zanahoria en rodajas, 8 minutos en agua con sal.",
      "Patata cocida en rodajas, dorada en una sartén 3 minutos por lado. Sácala.",
      "Pavo en tiras finas, seco y salado, en la misma sartén 4 minutos hasta que pierda el rosa. Fuera enseguida.",
      "Sirve pavo, patata y zanahoria. Sal, pimienta, un hilo de aceite crudo."
    ]
  },

  "Carne picada con patatas y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda, pasa a puré en nada.",
      "Patata cocida en rodajas, dorada 3 minutos por lado. Sácala.",
      "Carne picada en la misma sartén a fuego alto SIN remover 1 minuto; rómpela y saltea 5 minutos. Si suelta agua, sube el fuego hasta que se evapore.",
      "Mezcla con la patata y la coliflor. Sal, pimienta, pimentón."
    ]
  },

  "Ternera con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin las venas blancas (amargan) en tiras, a fuego fuerte 6 minutos hasta manchas oscuras. Sácalo.",
      "Patata cocida en rodajas, dorada 3 minutos por lado. Sácala.",
      "Corta la ternera en tiras FINAS y CONTRA LA FIBRA (cruza las líneas o queda dura), seca y salada. Fuego máximo, 2 minutos. No más.",
      "Mezcla con patata y pimiento. Pimienta."
    ]
  },

  "Ternera con arroz y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la ternera en tiras FINAS y CONTRA LA FIBRA, seca y salada.",
      "Sartén a fuego MÁXIMO con una cucharada de aceite. Ternera en una sola capa, 2 minutos. Pasada de ahí se seca.",
      "Echa las espinacas, bajan en 30 segundos con el calor.",
      "Mezcla con el arroz caliente. Sal y pimienta."
    ]
  },

  "Solomillo de ternera con pasta y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Calabacín en medias lunas, salteado con una cucharada de aceite y sal a fuego medio-alto 5 minutos hasta dorar. Sácalo.",
      "Saca el solomillo 15 minutos antes, sécalo y sálalo. Fuego ALTO, 2 minutos por lado (3 cm).",
      "REPOSA la carne 5 minutos antes de cortar, o el jugo se va al plato. Córtala contra la fibra.",
      "Mezcla la pasta ya cocida con el calabacín y dos cucharadas de agua; sirve con el solomillo en lonchas."
    ]
  },

  "Lomo de cerdo con arroz y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Zanahoria en rodajas, 8 minutos en agua con sal.",
      "Filetes de lomo de un dedo, secos y salados. Sartén a fuego medio-alto, 3 minutos + 2 minutos.",
      "Retíralo cuando el centro pase de rosa a pálido: es muy magro, del todo blanco queda seco.",
      "Calienta el arroz (chorrito de agua, tapado 1 minuto), sirve con la zanahoria y el cerdo. Pimienta."
    ]
  },

  "Lomo de cerdo con pasta y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua. Sácalos.",
      "Filetes de lomo de un dedo, secos y salados. Misma sartén, 3 minutos + 2 minutos. Fuera cuando el centro pasa de rosa a pálido.",
      "Devuelve los champiñones, añade la pasta ya cocida con dos cucharadas de agua, mezcla 1 minuto.",
      "Trocea el cerdo encima. Pimienta y aceite crudo."
    ]
  },

  "Conejo con pasta y verduras salteadas": {
    difficulty: 3,
    equipment: ["olla"],
    steps: [
      "El conejo es muy magro y con huesos finos: hecho rápido queda como suela. Trocéalo, sécalo y sálalo.",
      "Dóralo en una olla ancha con dos cucharadas de aceite a fuego fuerte, por tandas, 6 minutos.",
      "Fuego al mínimo, medio vaso de agua, tapa, 35 minutos. Se separa del hueso = hecho. OJO CON LAS ESPINAS FINAS.",
      "Saltea las verduras congeladas 5 minutos aparte, mézclalas con la pasta ya cocida y sirve con el conejo y su jugo."
    ]
  },

  "Conejo con quinoa y coliflor": {
    difficulty: 3,
    equipment: ["olla"],
    steps: [
      "Trocea el conejo, sécalo y sálalo. Muy magro: dorado y luego fuego bajo tapado, o queda como suela.",
      "Dóralo en una olla con dos cucharadas de aceite a fuego fuerte, por tandas, 6 minutos. Fuego al mínimo, medio vaso de agua, tapa, 35 minutos.",
      "Se separa del hueso = hecho. Ojo con las espinas finas.",
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda. Mézclala con la quinoa caliente y sirve con el conejo."
    ]
  },

  "Jamón serrano con pasta y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "El jamón serrano es curado, NO se cocina: va crudo al final, encima. Salteado se endurece y suelta toda su sal.",
      "Echa las espinacas en una sartén con una cucharadita de aceite, 1 minuto hasta que bajen.",
      "Añade la pasta ya cocida con dos cucharadas de agua y mezcla 1 minuto.",
      "Sirve y reparte el jamón por encima sin trocearlo mucho. NO añadas sal: la pone toda el jamón. Aceite crudo y pimienta."
    ]
  },

  "Jamón serrano con quinoa y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Pimiento sin venas blancas en tiras, a fuego fuerte 6 minutos hasta manchas oscuras.",
      "Calienta la quinoa y ahuécala con un tenedor; mézclala con el pimiento.",
      "El jamón serrano va crudo, NO se cocina. Repártelo por encima en lonchas sin trocear.",
      "NO añadas sal: la pone toda el jamón. Un hilo de aceite crudo y pimienta."
    ]
  },

  "Lentejas con pasta y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Escurre y enjuaga las lentejas de bote hasta que el agua salga clara.",
      "Echa las espinacas en una sartén con una cucharadita de aceite, 1 minuto hasta que bajen.",
      "Añade las lentejas y calienta 3 minutos a fuego suave, REMOVIENDO LO JUSTO o se hacen puré. Luego la pasta con dos cucharadas de agua.",
      "Un chorrito de vinagre levanta las lentejas. Sal, pimienta, aceite crudo."
    ]
  },

  "Alubias con pasta y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Brócoli en ramilletes, 4 minutos en agua con sal; escúrrelo cuando el tallo resista.",
      "Escurre y enjuaga las alubias de bote. Son MUY FRÁGILES: casi no se remueven o se hacen crema.",
      "Caliéntalas en una sartén con una cucharada de aceite y dos cucharadas de agua, 2 minutos, moviendo la sartén; añade la pasta ya cocida y mezcla con cuidado.",
      "Incorpora el brócoli. Sal, pimienta, pimentón, aceite crudo."
    ]
  },

  "Alubias con quinoa y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Calabacín en dados de un centímetro, salteado con una cucharada de aceite y sal a fuego fuerte 5 minutos hasta dorar.",
      "Escurre y enjuaga las alubias de bote. Añádelas con dos cucharadas de agua, 2 minutos, moviendo la sartén en vez de remover: son frágiles.",
      "Mezcla con la quinoa caliente (ahuécala con tenedor).",
      "Sal, pimienta, pimentón y un hilo de aceite crudo."
    ]
  },

  "Tofu con pasta y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "PRENSA el tofu 15 minutos con un peso encima. Dados, sal.",
      "Zanahoria en rodajas finas, 6 minutos en agua con sal.",
      "Dora el tofu en una sartén con una cucharada de aceite a fuego medio-alto, sin tocarlo 4 minutos hasta que tenga costra, luego 3 minutos más.",
      "Mezcla la pasta ya cocida con la zanahoria, el tofu y dos cucharadas de agua. Soja o sal, pimienta."
    ]
  },

  "Tofu con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Prensa el tofu 15 minutos con un peso encima. Dados, sal.",
      "Champiñones en láminas (papel, no agua), a fuego fuerte 5 minutos hasta que suelten y reevaporen el agua. Sácalos.",
      "Tofu en la misma sartén, sin tocarlo 4 minutos hasta costra, vuelta 3 minutos.",
      "Mezcla con los champiñones y la quinoa caliente. Soja o sal, pimienta."
    ]
  },

  "Carne picada con quinoa y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Cuece el tempeh 10 minutos en agua hirviendo cubriéndolo (le quita el amargor). Sécalo, dados.",
      "Verduras congeladas directas a fuego fuerte con una cucharada de aceite, 5 minutos hasta que evaporen su agua. Sácalas.",
      "Dora el tempeh en la misma sartén 5 minutos, con un chorrito de soja al final.",
      "Mezcla con las verduras y la quinoa caliente. Pimienta."
    ]
  },

  "Carne picada con arroz y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Cuece el tempeh 10 minutos en agua hirviendo cubriéndolo. Sécalo, dados.",
      "Coliflor en ramilletes pequeños, 5 minutos en agua con sal; escúrrela en cuanto ceda.",
      "Dora el tempeh en una sartén con una cucharada de aceite 5 minutos, con un chorrito de soja al final.",
      "Calienta el trigo sarraceno y sepáralo con un tenedor; mézclalo con el tempeh y la coliflor. Pimienta."
    ]
  },

  // ── Tanda 2026-08-31 (g) (285 → 309 platos) ──────────────────────────
  // Desayunos. Los de tazón (yogur/skyr/requesón/queso batido) son de
  // montar, con un solo consejo cada uno: los copos y la granola JUSTO
  // antes de comer o se reblandecen, la avena cruda necesita reposo o
  // queda arenosa, los frutos rojos congelados fuera 10 min sueltan jugo
  // que endulza. Y los de huevo, tostada y pan con embutido.

  "Skyr con piña y frutos secos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el skyr en un bol y remueve un poco para que quede cremoso.",
      "Si la piña es de lata, escúrrela bien del almíbar; si es fresca, córtala en dados pequeños quitando el corazón, que es duro.",
      "Pica las nueces en trozos grandes con el lado plano del cuchillo o con los dedos: enteras cuesta repartirlas.",
      "Monta el skyr, la piña y las nueces. La piña ya es dulce; no necesita más."
    ]
  },

  "Bowl proteico de skyr con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador 10 minutos antes: se descongelan solos y sueltan un jugo que endulza el skyr.",
      "Pon el skyr en un bol y remuévelo hasta que quede cremoso.",
      "Pica las almendras en trozos grandes.",
      "Añade los frutos rojos con su jugo y las almendras. Un hilo de miel si lo quieres más dulce."
    ]
  },

  "Queso fresco batido con copos y naranja": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela la naranja a lo vivo: corta los dos extremos, apóyala y ve quitando la piel de arriba abajo con el cuchillo, incluida la parte blanca (amarga). Córtala en rodajas.",
      "Pon el queso fresco batido en un bol.",
      "AÑADE LA GRANOLA JUSTO ANTES DE COMER: en contacto con el líquido se reblandece en minutos.",
      "Reparte la naranja por encima."
    ]
  },

  "Yogur griego con avena y plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el yogur en un bol y añade la avena. DÉJALO REPOSAR 5 O 10 MINUTOS (o toda la noche en la nevera): la avena cruda recién echada queda arenosa; con el reposo se ablanda y espesa el yogur.",
      "Corta el plátano en rodajas.",
      "Repártelo por encima al servir.",
      "Un hilo de miel si lo quieres más dulce."
    ]
  },

  "Yogur griego con copos de maíz y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador 10 minutos antes: sueltan un jugo que endulza.",
      "Pon el yogur en un bol.",
      "Añade los frutos rojos con su jugo.",
      "LOS COPOS DE MAÍZ, JUSTO ANTES DE COMER: en el yogur se reblandecen enseguida y pierden lo crujiente."
    ]
  },

  "Skyr con granola y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava la manzana, quítale el corazón y córtala en dados pequeños. No hace falta pelarla: la piel tiene fibra.",
      "Pon el skyr en un bol y remuévelo para que quede cremoso.",
      "Reparte la manzana.",
      "La granola, por encima y JUSTO ANTES DE COMER, para que llegue crujiente."
    ]
  },

  "Skyr con copos de maíz y fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava las fresas, quítales el rabito y córtalas en cuartos.",
      "Pon el skyr en un bol.",
      "Reparte las fresas.",
      "Los copos de maíz por encima al final: en el skyr se ablandan en un par de minutos."
    ]
  },

  "Queso fresco batido con copos de maíz y kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela el kiwi con una cuchara: clava la punta entre la piel y la carne y gira la fruta. Sale entero y limpio.",
      "Córtalo en rodajas.",
      "Pon el queso fresco batido en un bol y reparte el kiwi.",
      "Los copos de maíz, al final y justo antes de comer."
    ]
  },

  "Queso fresco batido con avena y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Mezcla el queso fresco batido con la avena en un bol y déjalo reposar 5 o 10 minutos: la avena cruda recién echada queda arenosa.",
      "Saca los frutos rojos del congelador 10 minutos antes.",
      "Añádelos con su jugo por encima.",
      "Un hilo de miel si lo quieres más dulce."
    ]
  },

  "Queso fresco batido con granola y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava la manzana, quítale el corazón y córtala en dados pequeños con la piel.",
      "Pon el queso fresco batido en un bol y reparte la manzana.",
      "La granola, por encima y JUSTO ANTES DE COMER.",
      "Miel al gusto."
    ]
  },

  "Requesón con avena y fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Mezcla el requesón con la avena en un bol y deja reposar 5 o 10 minutos para que la avena se ablande.",
      "Lava las fresas, quítales el rabito y córtalas en cuartos.",
      "Repártelas por encima.",
      "Miel si lo quieres más dulce."
    ]
  },

  "Requesón con granola y plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el requesón en un bol.",
      "Corta el plátano en rodajas y repártelo.",
      "La granola, por encima y justo antes de comer, para que llegue crujiente.",
      "Un hilo de miel si te gusta más dulce."
    ]
  },

  "Requesón con copos de maíz y kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela el kiwi con una cuchara (gira la fruta entre la piel y la carne) y córtalo en rodajas.",
      "Pon el requesón en un bol y reparte el kiwi.",
      "Los copos de maíz al final, justo antes de comer.",
      "Miel al gusto."
    ]
  },

  "Porridge de avena con nueces y canela": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Pon la avena en un cazo con la leche (unas 2,5 veces el volumen de la avena) y una pizca de sal.",
      "Lleva a fuego medio removiendo, y cuando empiece a hervir baja el fuego. 4 o 5 minutos removiendo a menudo, hasta que espese como unas gachas.",
      "Fuera del fuego, añade la canela y remueve. Sigue espesando al reposar: si lo quieres más suelto, un chorrito más de leche.",
      "Pica las nueces y repártelas por encima con un hilo de miel."
    ]
  },

  "Revuelto de huevos con jamón y pan": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Bate los huevos con una pizca de sal. Corta el jamón cocido en tiras.",
      "Sartén a fuego MEDIO-BAJO con una nuez de mantequilla o una gota de aceite. Echa el jamón 30 segundos y luego los huevos.",
      "Remueve despacio y constante con una espátula, llevando el huevo cuajado del borde al centro. Fuego bajo: a fuego fuerte se hace gomoso y seco.",
      "APÁGALO Y SÁCALO CUANDO TODAVÍA PAREZCA UN POCO LÍQUIDO: termina de cuajar con su calor en el plato. Sirve con el pan tostado."
    ]
  },

  "Huevos con pan de molde y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Echa las espinacas en la sartén con una gota de aceite a fuego medio, sin nada más, y remueve hasta que bajen y suelten el agua; sube el fuego para evaporarla. Sácalas.",
      "Para el huevo frito: sube el aceite (una cucharada) a fuego medio-alto hasta que una gota de agua chisporrotee.",
      "Casca el huevo en una taza y deslízalo en la sartén. NO LO TOQUES; con una cuchara, echa el aceite caliente por encima de la clara para que cuaje sin darle la vuelta. 2 minutos, yema líquida.",
      "Tuesta el pan, ponle las espinacas y el huevo encima. Sal sobre la clara, no sobre la yema."
    ]
  },

  "Claras de huevo con pan de centeno y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Verduras congeladas directas a fuego fuerte con una cucharadita de aceite, 5 minutos hasta que suelten el agua y se evapore. Si no, las claras quedan aguadas.",
      "Bate las claras con una pizca de sal. Cuajan rápido y gomosas: fuego medio-bajo.",
      "Echa las claras sobre las verduras y remueve despacio, del borde al centro.",
      "Apaga cuando aún brillen y parezcan poco hechas. Sirve sobre el pan de centeno tostado."
    ]
  },

  "Pan integral con atún y queso fresco": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre bien el atún de lata: aprieta la tapa contra el pescado sobre el fregadero hasta que deje de caer líquido. Si no, el pan se empapa.",
      "Mézclalo en un bol con el queso fresco batido hasta que se pueda untar.",
      "Tuesta el pan si quieres, o úsalo tal cual.",
      "Unta la mezcla, pimienta y un chorro de limón."
    ]
  },

  "Tostadas con salmón y queso fresco": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta el pan.",
      "Unta cada tostada con una capa de queso fresco batido.",
      "Reparte el salmón por encima. Si es salmón ahumado, va tal cual; si es cocido, desmígalo y quítale la piel.",
      "Pimienta, unas gotas de limón y eneldo si tienes."
    ]
  },

  "Pan tostado con hummus y tomate": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta el pan.",
      "Unta una capa generosa de hummus.",
      "Corta el tomate en rodajas finas, escúrrelas un momento en papel de cocina y ponlas encima. Sin escurrir, el pan se ablanda.",
      "Sal en escamas, un hilo de aceite y pimienta."
    ]
  },

  "Jamón serrano con pan de centeno y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Verduras congeladas directas a fuego fuerte con una cucharadita de aceite, 5 minutos hasta que suelten el agua y se evapore.",
      "Tuesta el pan de centeno.",
      "El jamón serrano va crudo, NO se cocina.",
      "Monta: pan tostado, las verduras salteadas encima y el jamón por encima sin trocear. NO añadas sal: la pone el jamón."
    ]
  },

  "Jamón serrano con pan integral y champiñones": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Champiñones en láminas (límpialos con papel, no bajo el grifo). A fuego fuerte con una cucharadita de aceite 5 minutos, hasta que suelten el agua y se evapore.",
      "Tuesta el pan.",
      "Pon los champiñones sobre el pan y el jamón serrano crudo por encima.",
      "Pimienta. NO añadas sal: la pone el jamón."
    ]
  },

  "Pavo con pan integral y champiñones": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Champiñones en láminas (papel, no agua), a fuego fuerte con una cucharadita de aceite 5 minutos hasta que suelten y se evapore el agua.",
      "Tuesta el pan.",
      "Pon el pavo en lonchas sobre el pan y los champiñones calientes encima.",
      "Pimienta y un hilo de aceite crudo. Sal al gusto (el pavo loncheado ya lleva algo)."
    ]
  },

  "Pavo con pan de molde y calabacín": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
    steps: [
      "Calabacín en rodajas finas, salteado en una sartén con una cucharadita de aceite y sal a fuego medio-alto 4 minutos hasta dorar.",
      "Tuesta el pan de molde.",
      "Pon el pavo en lonchas y el calabacín encima.",
      "Pimienta y un chorro de limón."
    ]
  },

  // ── Tanda 2026-08-31 (h) (309 → 333 platos) ──────────────────────────
  // Snacks: casi todo lácteo + fruta/fruto seco, de montar. Cierra el
  // catálogo salvo "Merluza al ajillo con verduras", que necesita ajo
  // (rol sin resolver, T2). getDishInstructions devuelve null para ese y
  // el plato se renderiza sin pasos, exactamente como antes.

  "Batido proteico de yogur con plátano": {
    difficulty: 1,
    equipment: ["batidora"],
    steps: [
      "Echa el yogur y un chorro de agua o leche (unos 100 ml) en el vaso de la batidora, el líquido primero para que las cuchillas agarren.",
      "Añade el plátano en trozos. Tapa SIEMPRE antes de encender.",
      "Tritura 20 o 30 segundos hasta que quede fino. Si está muy espeso, más líquido y otro golpe de batidora. Bébelo recién hecho."
    ]
  },

  "Batido de skyr con fruta y avena": {
    difficulty: 1,
    equipment: ["batidora"],
    steps: [
      "Líquido primero: el skyr y unos 120 ml de agua o leche en el vaso.",
      "Añade el plátano en trozos y la avena. Tapa antes de encender.",
      "Tritura 30 segundos, y si quedan grumos de avena otros 20: cruda tarda en deshacerse o queda arenosa. Bébelo al momento, reposado se hace pudin."
    ]
  },

  "Skyr con miel y almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pon el skyr en un bol y remuévelo para que quede cremoso.",
      "Pica las almendras en trozos grandes.",
      "Repártelas por encima y riega con un hilo de miel. Si la miel está muy dura, mete el bote 10 segundos en agua caliente y sale sola."
    ]
  },

  "Pavo con tomatitos y queso": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava los tomatitos y córtalos por la mitad.",
      "Corta la mozzarella en dados o rásgala con las manos.",
      "Enrolla o dobla las lonchas de pavo y móntalo todo en el plato con un hilo de aceite, sal y pimienta. Como una ensalada caprese rápida."
    ]
  },

  "Mozzarella con tomate y pan": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava el tomate y córtalo en rodajas de medio centímetro.",
      "Escurre la mozzarella y córtala en rodajas parecidas.",
      "Alterna tomate y mozzarella en el plato, con el pan al lado. Sal JUSTO ANTES DE COMER (antes, el tomate suelta agua), aceite y pimienta."
    ]
  },

  "Atún con pepino y queso": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre bien el atún de lata.",
      "Pela el pepino a tiras (dejando algo de piel) y córtalo en medias lunas.",
      "Mezcla el atún con el queso fresco batido para que ligue, y sírvelo con el pepino al lado o encima. Pimienta y limón."
    ]
  },

  "Cacahuetes tostados y naranja": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Si los cacahuetes son crudos, tuéstalos: sartén SIN aceite a fuego medio, moviéndolos a menudo 4 o 5 minutos, hasta que huelan a tostado y cojan algo de color. Se queman rápido, no los dejes solos. Si ya vienen tostados, sáltate esto.",
      "Sácalos a un plato: en la sartén caliente siguen tostándose.",
      "Pela la naranja y sepárala en gajos. Come los cacahuetes con la naranja."
    ]
  },

  "Puñado de almendras y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador 10 minutos antes: se descongelan solos y quedan jugosos.",
      "Ponlos en un bol con las almendras al lado.",
      "Un puñado de almendras son unos 20 gramos, más o menos lo que cabe en el hueco de la mano cerrada."
    ]
  },

  "Queso fresco con frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Saca los frutos rojos del congelador 10 minutos antes.",
      "Pon el queso fresco batido en un bol.",
      "Añade los frutos rojos con el jugo que hayan soltado. Un hilo de miel si lo quieres más dulce."
    ]
  },

  "Tofu con pepino y salsa": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "El tempeh crudo amarga: cuécelo 10 minutos en agua hirviendo cubriéndolo, escúrrelo y sécalo. Córtalo en dados.",
      "Dóralo en una sartén con una cucharadita de aceite 5 minutos, con un chorrito de salsa de soja al final que se pegue.",
      "Pela el pepino a tiras y córtalo en bastones. Come el tempeh templado con el pepino y la soja de mojar."
    ]
  },

  "Edamame con tortitas de arroz": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Cuece el edamame congelado 5 minutos en agua hirviendo con sal.",
      "Escúrrelo. La vaina no se come: se aprieta con los dientes para sacar el grano y se tira.",
      "Come los granos con las tortitas de arroz al lado. Sal en escamas sobre el edamame."
    ]
  },

  "Skyr con fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava las fresas, quítales el rabito y córtalas en cuartos.",
      "Pon el skyr en un bol y remuévelo para que quede cremoso.",
      "Reparte las fresas. Están más dulces si las dejas 5 minutos con una pizca de miel antes."
    ]
  },

  "Yogur griego con kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela el kiwi con una cuchara: clava la punta entre la piel y la carne y gira la fruta.",
      "Córtalo en rodajas.",
      "Pon el yogur en un bol y reparte el kiwi por encima."
    ]
  },

  "Yogur griego con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pica las almendras en trozos grandes: enteras cuesta comerlas con la cuchara.",
      "Pon el yogur en un bol.",
      "Reparte las almendras. Un hilo de miel si lo quieres más dulce."
    ]
  },

  "Requesón con fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Lava las fresas, quítales el rabito y córtalas en cuartos.",
      "Pon el requesón en un bol.",
      "Reparte las fresas. Miel al gusto."
    ]
  },

  "Requesón con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pica las almendras en trozos grandes.",
      "Pon el requesón en un bol.",
      "Reparte las almendras y un hilo de miel."
    ]
  },

  "Requesón con nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Parte las nueces en trozos con los dedos o con el lado plano del cuchillo.",
      "Pon el requesón en un bol.",
      "Reparte las nueces. Un hilo de miel si lo quieres más dulce."
    ]
  },

  "Queso fresco batido con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pica las almendras en trozos grandes.",
      "Pon el queso fresco batido en un bol.",
      "Reparte las almendras. Miel o canela por encima si te apetece."
    ]
  },

  "Queso fresco batido con nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Parte las nueces en trozos con los dedos.",
      "Pon el queso fresco batido en un bol.",
      "Reparte las nueces y un hilo de miel."
    ]
  },

  "Queso fresco batido con cacahuetes": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Si los cacahuetes tienen sal, sacúdela un poco; si son crudos, mejor tostados (sartén sin aceite 4 minutos moviendo).",
      "Pon el queso fresco batido en un bol.",
      "Reparte los cacahuetes. Contrastan bien con un hilo de miel."
    ]
  },

  "Atún con nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre bien el atún de lata.",
      "Parte las nueces en trozos.",
      "Mézclalos y aliña con una cucharadita de aceite y unas gotas de limón. Pimienta."
    ]
  },

  "Atún con cacahuetes": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Escurre bien el atún de lata.",
      "Mézclalo con los cacahuetes (mejor sin sal o sacudiéndola).",
      "Unas gotas de limón y pimienta. Es un snack seco y proteico, no una ensalada."
    ]
  },

  "Jamón serrano con cacahuetes": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "El jamón serrano va tal cual, sin cocinar.",
      "Ponlo en el plato con los cacahuetes al lado.",
      "Si los cacahuetes llevan sal, ten en cuenta que el jamón ya sala bastante: no necesitas más."
    ]
  },

  "Jamón serrano con kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
    steps: [
      "Pela el kiwi con una cuchara (gira la fruta entre la piel y la carne) y córtalo en gajos.",
      "Enrolla las lonchas de jamón serrano.",
      "Come el jamón con el kiwi: lo dulce y ácido de la fruta corta lo salado del jamón, como el melón con jamón."
    ]
  },

  // ── Platos españoles nuevos (2026-08-31) ─────────────────────────────
  // Añadidos con T4, tras resolver cebolla/ajo/aceite en T2. El sofrito
  // (cebolla/pimiento pochados despacio) y el ajo dorado a fuego bajo son
  // la base de casi todos: el error típico es tener prisa o el fuego alto.

  "Tortilla de patatas": {
    difficulty: 3,
    equipment: ["sarten"],
    steps: [
      "Corta la patata ya cocida en rodajas y sécala con papel: mojada, la tortilla no cuaja.",
      "Pica la cebolla fina y póchala en una sartén con una cucharada de aceite a fuego medio-bajo 10 minutos, hasta que esté blanda y dorada. Sin prisa: ahí está el sabor.",
      "Bate los huevos con sal en un bol GRANDE. Añade la patata y la cebolla escurrida, mezcla y DÉJALO REPOSAR 10 MINUTOS: ese reposo es lo que hace que sepa a tortilla y no a huevo con patata.",
      "Calienta una sartén pequeña a fuego medio con una cucharada de aceite. Vuelca la mezcla, baja el fuego y deja 4 minutos, separando el borde con la espátula.",
      "LA VUELTA: pon un plato plano más ancho que la sartén encima, sujétalo con la palma y gira las dos cosas de golpe y con decisión. La duda es lo que la rompe.",
      "Desliza la tortilla de vuelta a la sartén y hazla 2 minutos más por el otro lado."
    ]
  },

  "Pollo al ajillo con patatas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en trozos de dos centímetros, sécalos y sálalos.",
      "Lamina 4 o 5 dientes de ajo. Ponlos en una sartén con dos cucharadas de aceite a fuego MEDIO-BAJO y déjalos dorar despacio 2 minutos: con el aceite muy caliente el ajo se quema y amarga.",
      "Sube a fuego fuerte, echa el pollo y saltéalo 6 minutos hasta que esté dorado y sin rosa por dentro.",
      "Añade la patata cocida en dados y saltea 3 minutos más para que coja color y se mezcle con el ajo.",
      "Un chorro de vino blanco o de agua para despegar el fondo de la sartén, 1 minuto. Perejil picado si tienes."
    ]
  },

  "Pollo al ajillo con arroz": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la pechuga en trozos, sécalos y sálalos.",
      "Lamina 4 o 5 dientes de ajo y dóralos DESPACIO en dos cucharadas de aceite a fuego medio-bajo, 2 minutos, sin que se quemen.",
      "Sube el fuego, echa el pollo y saltéalo 6 minutos hasta que no quede rosa.",
      "Un chorro de vino blanco o agua para despegar el fondo, 1 minuto.",
      "Calienta el arroz aparte con un chorrito de agua tapado 1 minuto y sírvelo con el pollo por encima, con todo su aceite."
    ]
  },

  "Pisto con huevo": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Corta la cebolla, el pimiento y el calabacín en dados de un centímetro, cada verdura por separado.",
      "En una sartén honda con dos cucharadas de aceite a fuego medio, pocha primero la cebolla 5 minutos, luego el pimiento 5 minutos, y por último el calabacín 5 minutos. En ese orden: cada uno tarda distinto.",
      "Añade el tomate troceado y una pizca de sal, y deja 15 minutos a fuego medio-bajo, removiendo de vez en cuando, hasta que sea una salsa espesa sin líquido suelto.",
      "Haz un hueco en el centro, casca el huevo dentro y tápalo 3 minutos, hasta que la clara cuaje y la yema quede blanda."
    ]
  },

  "Lentejas guisadas con verduras": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Escurre y enjuaga las lentejas de bote hasta que el agua salga clara.",
      "Pica fina la cebolla, la zanahoria y el pimiento. Póchalos en una olla con una cucharada de aceite a fuego medio 8 minutos, hasta que la cebolla esté transparente.",
      "Añade un diente de ajo picado y una cucharadita de pimentón, remueve 20 segundos FUERA del fuego (el pimentón se quema en nada) y vuelve al fuego.",
      "Echa las lentejas y un vaso de agua, y deja 10 minutos a fuego suave para que cojan sabor. REMUEVE POCO o se deshacen.",
      "Prueba de sal y añade un chorrito de vinagre al final: le da el punto."
    ]
  },

  "Garbanzos con espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Escurre y enjuaga los garbanzos de bote.",
      "Pica la cebolla fina y póchala en una sartén con una cucharada de aceite a fuego medio 6 minutos. Añade el ajo picado 30 segundos más.",
      "Echa una cucharadita de pimentón y, enseguida, el pan integral desmigado y un vaso de agua: el pan espesa la salsa, es el truco del potaje.",
      "Añade los garbanzos y deja 5 minutos a fuego suave.",
      "Incorpora las espinacas y remueve hasta que bajen, 2 minutos. Sal y un chorrito de vinagre."
    ]
  },

  "Bacalao con tomate": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Si el bacalao es salado, tiene que estar ya DESALADO (24-36 h en agua en la nevera, 3 cambios). Fresco o sin sal, directo. Sécalo.",
      "Pica la cebolla y el pimiento y póchalos en una sartén con dos cucharadas de aceite a fuego medio 8 minutos. Añade el ajo picado 30 segundos.",
      "Echa el tomate troceado y deja 12 minutos a fuego medio-bajo hasta que sea una salsa espesa.",
      "Coloca los lomos de bacalao sobre la salsa, tapa y deja 8 minutos a fuego suave: se hace con el vapor de la salsa, no hay que darle la vuelta.",
      "Está listo cuando se abre en lascas. Sal con cuidado."
    ]
  },

  "Merluza a la plancha con ensalada": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de merluza y sálalos.",
      "Calienta una sartén o plancha a fuego medio-alto con una cucharadita de aceite. Haz la merluza 3 minutos por lado, UNA sola vuelta con cuidado: se deshace. Hecha cuando se separa en lascas.",
      "Corta el tomate y el pepino en trozos y alíñalos con el resto del aceite, sal y un chorro de limón o vinagre.",
      "Sirve la merluza con la ensalada al lado y limón por encima."
    ]
  },

  "Merluza en salsa verde con espinacas": {
    difficulty: 3,
    equipment: ["sarten"],
    steps: [
      "Seca los lomos de merluza y sálalos.",
      "Lamina el ajo y dóralo despacio en una sartén ancha con dos cucharadas de aceite a fuego medio-bajo, 2 minutos.",
      "Aparta del fuego, añade una cucharadita de harina y remueve; vuelve al fuego con medio vaso de agua caliente, moviendo la SARTÉN en círculos (no con cuchara) hasta que ligue una salsa clara. Es cuestión de insistir.",
      "Pon la merluza en la salsa y deja 4 minutos, moviendo la sartén de vez en cuando y regando el pescado con la salsa.",
      "Añade las espinacas alrededor el último minuto, hasta que bajen. Perejil si tienes."
    ]
  },

  "Huevos a la flamenca": {
    difficulty: 2,
    equipment: ["sarten", "horno"],
    steps: [
      "Pica la cebolla y el pimiento y póchalos en una sartén (si es apta para horno mejor, si no luego pasas a una fuente) con dos cucharadas de aceite a fuego medio 8 minutos.",
      "Añade el tomate troceado y el jamón serrano en tiras, y deja 10 minutos hasta que sea una salsa espesa.",
      "Enciende el horno a 200 grados. Haz dos huecos en la salsa y casca un huevo en cada uno.",
      "Hornea 6 u 8 minutos, hasta que la clara cuaje y la yema quede blanda. Sin horno: tapa la sartén a fuego suave 4 minutos."
    ]
  },

  "Sopa de ajo castellana": {
    difficulty: 2,
    equipment: ["olla"],
    steps: [
      "Lamina 3 o 4 dientes de ajo y dóralos en una olla con tres cucharadas de aceite a fuego medio-bajo, 2 minutos, sin quemarlos.",
      "Añade el pan integral en trozos y remueve 1 minuto para que se empape del aceite.",
      "Fuera del fuego, echa una cucharadita de pimentón y remueve rápido (se quema en segundos). Vuelve al fuego, añade tres vasos de agua caliente y sal.",
      "Deja hervir 10 minutos a fuego suave.",
      "Baja el fuego, casca los huevos dentro y deja 3 minutos: cuajan escalfados en la sopa. Sirve enseguida."
    ]
  },

  "Ensaladilla de atún": {
    difficulty: 1,
    equipment: ["olla"],
    steps: [
      "Si la patata y la zanahoria no vienen ya cocidas, cuécelas en dados 12 minutos en agua con sal. Déjalas enfriar del todo: en caliente, la ensaladilla se estropea.",
      "Cuece el huevo 10 minutos, pásalo a agua fría, pélalo y pícalo.",
      "En un bol, mezcla la patata y la zanahoria en dados, el maíz escurrido, el atún escurrido y el huevo.",
      "Aliña con el aceite, un chorro de vinagre y sal (o una cucharada de mayonesa si la tienes, que es lo clásico). Mezcla con suavidad.",
      "Deja en la nevera 30 minutos antes de comer: mejora reposada y fría."
    ]
  },

  "Champiñones al ajillo": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Limpia los champiñones con papel húmedo (no bajo el grifo, chupan agua) y córtalos en cuartos.",
      "Lamina el ajo y ponlo en una sartén con dos cucharadas de aceite a fuego medio-bajo; en cuanto empiece a dorarse, sube el fuego y echa los champiñones.",
      "Saltea 6 o 7 minutos a fuego fuerte: SUELTAN MUCHA AGUA, hay que esperar a que se evapore y empiecen a dorarse, o quedan hervidos.",
      "Sal al final y perejil picado. Un chorro de limón si te gusta."
    ]
  },

  "Gazpacho con picatostes": {
    difficulty: 1,
    equipment: ["batidora"],
    steps: [
      "Lava el tomate, el pepino y el pimiento y trocéalos. Quita las semillas y la parte blanca del pimiento (amarga).",
      "Mete todo en el vaso de la batidora ANTES de encenderla, con el ajo, el pan integral en trozos, el aceite, un chorro de vinagre y sal.",
      "Tapa y tritura 2 minutos, hasta que quede muy fino. Si lo quieres más suelto, un poco de agua fría.",
      "Pruébalo: el gazpacho pide más sal y vinagre de lo que parece en frío. Cuélalo si lo quieres sin pieles.",
      "A la nevera al menos 1 hora. Sírvelo muy frío con trozos de pan tostado (picatostes) por encima."
    ]
  },

  // ── Platos llanos: proteína + guarnición (2026-09-01) ────────────────
  // Lo que come de verdad quien se cocina para la semana: una plancha y una
  // olla. Sin marinados, sin salsas, sin nada que haya que comprar aparte.
  // Los pasos son cortos a propósito: quien hace pollo con arroz no necesita
  // que le cuenten quince cosas.

  "Pollo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon el arroz a hervir con el doble de agua y una pizca de sal: 15-18 minutos, hasta que se beba el agua.",
      "Mientras, saca la pechuga de la nevera y sécala con papel. Si está muy gruesa, ábrela por la mitad a lo ancho para que se haga por dentro.",
      "Sartén bien caliente, sal por las dos caras, 4-5 minutos por lado. Está lista cuando al apretarla suelta jugo transparente, no rosa.",
      "Déjala reposar 2 minutos antes de cortarla y sírvela sobre el arroz."
    ]
  },

  "Pollo con quinoa": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Enjuaga el trigo sarraceno bajo el grifo y hiérvelo 12-15 minutos con el doble de agua y sal, hasta que esté tierno pero entero.",
      "Seca la pechuga con papel y sálala por las dos caras.",
      "Sartén caliente sin miedo: 4-5 minutos por lado. No la muevas cada poco, se dora sola si la dejas quieta.",
      "Escurre el sarraceno si le queda agua y sirve el pollo encima, cortado en tiras."
    ]
  },

  "Pollo con pasta": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon la pasta en agua hirviendo con sal y cuécela el tiempo del paquete, un minuto menos si la quieres al dente.",
      "Mientras hierve, seca la pechuga, sálala y hazla a la plancha 4-5 minutos por lado.",
      "Guarda medio vaso del agua de la pasta antes de escurrirla: liga el plato sin necesidad de salsa.",
      "Mezcla la pasta con el pollo cortado y un chorrito de esa agua."
    ]
  },

  "Pollo con patatas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Trocea las patatas en dados grandes y hiérvelas 15-20 minutos, hasta que un cuchillo entre sin esfuerzo.",
      "Seca la pechuga, sálala y hazla a la plancha 4-5 minutos por lado.",
      "Escurre bien las patatas y déjalas un minuto en la olla caliente para que se sequen: así no quedan aguadas.",
      "Sirve el pollo cortado junto a las patatas."
    ]
  },

  "Cerdo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Arroz a hervir con el doble de agua y sal, 15-18 minutos.",
      "Sala el lomo por las dos caras. El cerdo va más fino que el pollo: con 3-4 minutos por lado sobra.",
      "No lo pases: cuando deja de estar rosa por fuera y suelta jugo claro, está.",
      "Sirve el lomo sobre el arroz."
    ]
  },

  "Pavo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon el arroz a hervir con el doble de agua y sal, 15-18 minutos.",
      "El pavo es más seco que el pollo: sécalo, sálalo y hazlo 3-4 minutos por lado, ni uno más.",
      "Retíralo en cuanto pierda el rosa por dentro; si se pasa queda estropajoso.",
      "Córtalo y sírvelo sobre el arroz."
    ]
  },

  "Ternera con arroz": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
    steps: [
      "Arroz a hervir con el doble de agua y sal, 15-18 minutos.",
      "Saca la ternera de la nevera 15 minutos antes y sécala bien: fría o mojada no se dora, se cuece.",
      "Sartén muy caliente, 2-3 minutos por lado para que quede jugosa por dentro.",
      "Déjala reposar 3 minutos, córtala contra la fibra y sírvela con el arroz."
    ]
  },

  "Huevos con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Pon el arroz a hervir con el doble de agua y sal, 15-18 minutos.",
      "Bate los huevos con una pizca de sal.",
      "Sartén a fuego medio-bajo: echa los huevos y remueve despacio hasta que cuajen pero sigan brillantes. El fuego fuerte los deja gomosos.",
      "Sírvelos sobre el arroz recién escurrido."
    ]
  },

  "Pollo con arroz integral": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "El integral tarda más: hiérvelo 25-30 minutos con el doble de agua y sal.",
      "Cuando le queden 10 minutos, seca la pechuga, sálala y ponla en la sartén caliente.",
      "4-5 minutos por lado, hasta que el jugo salga transparente.",
      "Escurre el arroz y sirve el pollo cortado encima."
    ]
  },

  "Pollo con arroz y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Enjuaga el sarraceno y hiérvelo 12-15 minutos con el doble de agua y sal.",
      "En los últimos 5 minutos echa el brócoli en la misma olla: se hace con esa agua y no ensucias otra.",
      "Mientras, plancha la pechuga seca y salada 4-5 minutos por lado.",
      "Escurre todo junto y sirve con el pollo cortado por encima."
    ]
  },

  "Cerdo con quinoa": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Enjuaga el sarraceno y hiérvelo 12-15 minutos con el doble de agua y sal.",
      "Sala el lomo y hazlo a la plancha 3-4 minutos por lado.",
      "Deja reposar la carne 2 minutos antes de cortarla: si la abres al momento pierde el jugo.",
      "Sirve el cerdo sobre el sarraceno escurrido."
    ]
  },

  "Pavo con patatas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Patatas en dados grandes a hervir 15-20 minutos, hasta que entren con el cuchillo.",
      "Seca el pavo, sálalo y hazlo 3-4 minutos por lado. Es muy magro: se pasa enseguida.",
      "Escurre las patatas y déjalas un minuto en la olla caliente para que suelten el vapor.",
      "Sirve el pavo cortado junto a las patatas."
    ]
  },

  "Pollo con pasta y tomate": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Pasta en agua hirviendo con sal, el tiempo del paquete.",
      "Trocea el tomate en dados mientras se hace.",
      "Plancha la pechuga seca y salada 4-5 minutos por lado y córtala en tiras.",
      "Mezcla la pasta escurrida con el tomate crudo y el pollo: el calor de la pasta basta para el tomate."
    ]
  },

  "Muslo de pollo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Arroz a hervir con el doble de agua y sal, 15-18 minutos.",
      "El muslo tiene más grasa que la pechuga y aguanta mejor: sálalo y hazlo 6-7 minutos por lado a fuego medio.",
      "Está cuando la carne se separa fácil y el jugo sale claro.",
      "Sírvelo sobre el arroz."
    ]
  },

  "Cerdo con pasta": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Pasta en agua hirviendo con sal, el tiempo del paquete.",
      "Sala el lomo y hazlo a la plancha 3-4 minutos por lado.",
      "Guarda medio vaso del agua de cocción antes de escurrir.",
      "Mezcla la pasta con el cerdo cortado y un chorrito del agua reservada."
    ]
  },

  "Huevos con patatas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
    steps: [
      "Patatas en dados a hervir 15-20 minutos, hasta que entren con el cuchillo.",
      "Escúrrelas y déjalas secar un minuto en la olla caliente.",
      "Bate los huevos con sal y cuájalos a fuego medio-bajo, removiendo despacio.",
      "Échalos sobre las patatas y mezcla."
    ]
  },

  // ── La ultima que faltaba (2026-09-01) ───────────────────────────────
  // Estuvo sin pasos desde T3 porque el ajo no existia como rol; se
  // resolvio en T2 (USDA) y ya se puede escribir de verdad.
  "Merluza al ajillo con verduras": {
    difficulty: 2,
    equipment: ["sarten"],
    steps: [
      "Saca la merluza de la nevera 10 minutos antes y sécala bien con papel. El pescado mojado se cuece en su propia agua en vez de dorarse.",
      "Dora un par de dientes de ajo laminados en la sartén a fuego medio, sin prisa: cuando empiecen a tomar color dorado claro, retíralos y resérvalos. Si se queman amargan todo el plato.",
      "En esa misma sartén, pon la merluza con la piel hacia abajo y sal. 3-4 minutos sin tocarla, luego dale la vuelta y 2-3 minutos más.",
      "Está lista cuando la carne pasa de translúcida a blanca y se separa en lascas al empujarla con el tenedor. Pasada queda seca, así que quédate corto antes que largo.",
      "Saltea las verduras y el tomate en la misma sartén 4-5 minutos y sirve con el ajo reservado por encima."
    ]
  },

  // ── Platos baratos (2026-09-02) ───────────────────────────────────────
  // Cocina de andar por casa: sartén, olla y poco más. Lo mismo que el
  // resto del archivo -- cantidades, tiempos y una señal de que está listo.

  "Pasta con salchichas y tomate": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
    steps: [
      "Pon la pasta a cocer en agua con sal abundante, los minutos que diga el paquete menos uno: termina de hacerse en la sartén.",
      "Mientras, corta las salchichas en rodajas de un dedo y dóralas en la sartén SIN aceite, 3-4 minutos: sueltan bastante grasa ellas solas. Que cojan color; crudas sueltan agua y el plato queda soso.",
      "Añade el tomate en dados y deja que se deshaga 4-5 minutos a fuego medio, aplastándolo con la cuchara.",
      "Escurre la pasta guardando medio vaso del agua de cocción y échala a la sartén.",
      "Remueve un minuto con un chorrito de esa agua: el almidón liga la salsa y deja de resbalar sobre la pasta."
    ]
  },

  "Macarrones con salchichas": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
    steps: [
      "Cuece los macarrones en agua con sal el tiempo del paquete.",
      "Corta las salchichas en rodajas y dóralas en la sartén a fuego medio-alto, 4 minutos, hasta que estén tostadas por fuera. No hace falta aceite: lo suelta la propia salchicha.",
      "Escurre la pasta y échala a la sartén con las salchichas.",
      "Saltea todo junto un par de minutos para que la pasta coja el sabor de la grasa de la sartén. Ese paso es la diferencia entre 'pasta con salchichas al lado' y un plato."
    ]
  },

  "Pan con tomate y aceite": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Corta el pan por la mitad a lo largo y tuéstalo hasta que esté dorado y firme. Blando no aguanta el tomate.",
      "Parte el tomate por la mitad y frótalo contra la miga con fuerza, hasta que solo te quede la piel en la mano.",
      "Riega con el aceite en hilo, de borde a borde, y sal por encima.",
      "El orden importa: tomate primero, aceite después. Al revés el pan se impermeabiliza y el tomate resbala."
    ]
  },

  "Pan con tomate y queso": {
    difficulty: 1,
    equipment: ["tostadora"],
    steps: [
      "Tuesta el pan abierto por la mitad.",
      "Frota el tomate sobre la miga caliente hasta que quede empapada, y sal.",
      "Pon las lonchas de queso encima del pan AÚN CALIENTE: se ablanda un poco y se pega, en vez de quedar tieso encima.",
      "Si lo quieres fundido, 30 segundos de microondas bastan; más y el pan se pone correoso."
    ]
  },

  "Arroz con huevo y tomate": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
    steps: [
      "Pon los huevos a cocer en agua fría; desde que hierve, 10 minutos.",
      "En otra olla, cuece el arroz en el doble de agua que arroz, con sal, hasta que se beba el agua (unos 15 minutos).",
      "Pela los huevos bajo el grifo con agua fría: la cáscara sale de una pieza.",
      "Corta el tomate en dados y mézclalo con el arroz caliente, con sal. El calor del arroz basta para que suelte su jugo, no hace falta sofreírlo.",
      "Sirve con los huevos partidos por la mitad encima."
    ]
  },

  "Bocadillo de salchichas": {
    difficulty: 1,
    equipment: ["sarten"],
    steps: [
      "Dora las salchichas enteras en la sartén a fuego medio, dándoles vueltas, 5-6 minutos.",
      "Abre el pan por la mitad sin llegar a separarlo del todo.",
      "Frota el tomate por dentro del pan, o córtalo en rodajas finas y repártelo.",
      "Mete las salchichas y aprieta el bocadillo con la mano unos segundos: compactarlo evita que se salga todo al primer mordisco."
    ]
  },

  "Salchichas con patatas": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
    steps: [
      "Cuece las patatas peladas y en trozos grandes en agua con sal, 18-20 minutos, hasta que un cuchillo entre sin resistencia.",
      "Escúrrelas y déjalas secar un minuto en la olla apagada: la patata seca se dora, la mojada se cuece otra vez.",
      "Empieza dorando las salchichas en rodajas en la sartén, que sueltan grasa, y retíralas.",
      "En esa grasa, dora las patatas a fuego fuerte sin moverlas mucho, hasta que tengan costra por varias caras, y devuelve las salchichas al final."
    ]
  },

  "Fideos con salchichas y zanahoria": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
    steps: [
      "Cuece los fideos en agua con sal; son finos, así que vigila desde el minuto 4.",
      "Corta las salchichas en rodajas y ponlas en la sartén a fuego medio: sueltan grasa suficiente para lo demás.",
      "Añade la zanahoria en rodajas finas y saltea 5 minutos: cuanto más fina, antes se hace.",
      "Escurre los fideos, échalos a la sartén y saltea un minuto para mezclarlo todo."
    ]
  },

  "Pan con huevo duro y tomate": {
    difficulty: 1,
    equipment: ["olla", "tostadora"],
    steps: [
      "Pon los huevos en agua fría, llévalos a hervir y cuenta 10 minutos desde que empieza a burbujear.",
      "Pásalos a agua fría y pélalos ahí dentro: el agua se mete entre la cáscara y la clara y sale de una pieza.",
      "Tuesta el pan y frota el tomate sobre la miga.",
      "Corta los huevos en rodajas, repártelos por encima y sal."
    ]
  },

  "Arroz con salchichas y zanahoria": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
    steps: [
      "Cuece el arroz en el doble de agua que arroz, con sal, hasta que se beba el agua.",
      "Pon las salchichas en rodajas en la sartén a fuego medio hasta que suelten grasa, 3 minutos.",
      "Añade la zanahoria en rodajas finas y saltea 5 minutos en esa grasa.",
      "Echa el arroz ya cocido a la sartén y saltéalo todo junto un par de minutos, removiendo, para que coja el sabor."
    ]
  },

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

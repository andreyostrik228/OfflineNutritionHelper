/** Bloques de pasos por TECNICA. El plato se compone: tecnica + grano +
 *  verdura + emplatado. Cada paso dice el porque, como los ya escritos. */
"use strict";

var TECNICAS = {
  plancha_ave: { prep:18, pasos:function(p){ return [
    "Saca " + p.art + " de la nevera 10 minutos antes: frío por dentro se hace por fuera antes de estar listo por dentro.",
    "Si la pieza es gruesa, ábrela por la mitad a lo ancho como un libro. Se hace en la mitad de tiempo y sin quedar cruda en el centro.",
    "Sécala con papel de cocina. Es el paso que más se salta y el que decide si se dora o se cuece en su propia agua.",
    "Sartén a fuego medio-alto con una cucharada de aceite; espera a que el aceite brille y se mueva con facilidad.",
    "Coloca la carne y NO LA TOQUES 4 minutos: moverla antes impide que se forme la costra y la pega a la sartén.",
    "Dale la vuelta y haz 4 minutos más. Está lista cuando al pinchar la parte más gruesa sale jugo transparente, no rosado.",
    "Deja reposar 2 minutos antes de cortar, o el jugo se queda en la tabla."
  ];}},
  plancha_carne: { prep:18, pasos:function(p){ return [
    "Saca la carne de la nevera 15 minutos antes y sécala bien: una superficie húmeda no se dora, se cuece.",
    "Sala justo antes de que toque la sartén. Salada con antelación suelta agua y pierde el dorado.",
    "Sartén bien caliente con una cucharada de aceite. Si la carne no chisporrotea al entrar, la sartén no estaba lista.",
    "3 minutos por cada cara para un punto jugoso; un minuto más por cara si la quieres bien hecha.",
    "Retira a un plato y deja reposar 3 minutos tapada sin apretar. Es lo que la diferencia de una suela."
  ];}},
  guiso_carne: { prep:35, pasos:function(p){ return [
    "Trocea la carne y séllala en la sartén con una cucharada de aceite a fuego fuerte, 5 minutos, hasta que esté dorada por fuera.",
    "Baja a fuego medio, cubre con un dedo de agua y tapa.",
    "Guisa 25 minutos. Es carne magra y con hueso fino: si se pasa queda seca, así que píncala a los 20."
  ];}},
  picada: { prep:15, pasos:function(p){ return [
    "Calienta la sartén a fuego fuerte con una cucharada de aceite ANTES de echar la carne.",
    "Echa la picada y deshazla con la cuchara, pero déjala quieta el primer minuto: así se dora en vez de hervir.",
    "Sofríe 7 minutos removiendo, hasta que no quede nada rosado y el fondo empiece a tostarse.",
    "Si suelta mucha agua, sube el fuego y espera a que se evapore: el sabor está en lo que queda pegado al fondo."
  ];}},
  salchicha: { prep:15, pasos:function(p){ return [
    "No pinches las salchichas: los agujeros dejan escapar el jugo y quedan secas.",
    "Sartén a fuego medio con unas gotas de aceite. A fuego fuerte se queman por fuera y quedan crudas dentro.",
    "Dales vueltas cada par de minutos durante 10, hasta que estén doradas por todos lados.",
    "Córtalas en rodajas al gusto para repartirlas mejor por el plato."
  ];}},
  horno_pescado: { prep:25, pasos:function(p){ return [
    "Precalienta el horno a 200 grados. Meter el pescado en un horno frío lo reseca mientras el horno sube.",
    "Seca el pescado con papel, ponlo en una fuente con un hilo de aceite y sal.",
    "Hornea 12 minutos. La regla es 10 minutos por cada 2,5 cm de grosor en la parte más alta.",
    "Está hecho cuando la carne pasa de traslúcida a blanca opaca y se separa en lascas al empujarla con un tenedor. Un minuto de más lo seca."
  ];}},
  plancha_pescado: { prep:15, pasos:function(p){ return [
    "Seca bien el pescado y sálalo justo antes: es el truco para que la piel quede crujiente y no se pegue.",
    "Sartén a fuego medio-alto con una cucharada de aceite.",
    "Ponlo con la piel hacia abajo y aprieta suavemente 10 segundos con la espátula, o la piel se encoge y el centro no toca la sartén.",
    "4 minutos sin moverlo; verás cómo el color opaco sube por el lomo desde abajo.",
    "Dale la vuelta y 2 minutos más. El pescado sigue haciéndose fuera del fuego, así que sácalo un punto antes."
  ];}},
  marisco: { prep:12, pasos:function(p){ return [
    "Ya vienen cocidos: aquí solo se calientan. Cocinarlos otra vez los deja gomosos.",
    "Sartén a fuego medio con una cucharada de aceite y, si quieres, un diente de ajo laminado.",
    "Saltea 2 minutos, lo justo para que cojan temperatura y el ajo perfume el aceite."
  ];}},
  lata: { prep:8, pasos:function(p){ return [
    "Escurre bien la lata: el líquido aguaría el plato entero.",
    "Desmígala con un tenedor en trozos grandes, sin machacarla."
  ];}},
  huevo: { prep:12, pasos:function(p){ return [
    "Bate los huevos con una pizca de sal hasta que no queden hilos de clara sin mezclar.",
    "Sartén a fuego MEDIO-BAJO con unas gotas de aceite. El calor fuerte es lo que hace el huevo gomoso.",
    "Echa el huevo y remueve despacio con una espátula, llevando el cuajado del borde hacia el centro.",
    "Retira cuando aún se vea algo brillante: termina de cuajar con su propio calor en el plato."
  ];}},
  tofu: { prep:20, pasos:function(p){ return [
    "Escurre el tofu y prénsalo 10 minutos entre dos platos con algo de peso encima. Sin este paso suelta agua y no se dora nunca.",
    "Córtalo en dados de dos centímetros y sécalos con papel.",
    "Sartén a fuego medio-alto con una cucharada de aceite; dora los dados 3 minutos por cada cara ancha sin moverlos.",
    "Sala al final: la sal antes le saca el agua que acabas de quitarle."
  ];}},
  legumbre: { prep:15, pasos:function(p){ return [
    "Enjuaga la legumbre de bote bajo el grifo hasta que el agua salga clara: se va el líquido de conserva y con él el sabor a lata.",
    "Escúrrela bien y déjala reposar en el colador mientras haces el resto.",
    "Saltéala 3 minutos al final con el resto del plato, solo para que coja temperatura y sabor. Removida de más se deshace."
  ];}},
  edamame: { prep:10, pasos:function(p){ return [
    "Hierve el edamame 5 minutos en agua con sal, directamente congelado.",
    "Escurre y, si viene en vaina, saca los granos apretando la vaina con los dedos."
  ];}}
};

module.exports = { TECNICAS: TECNICAS };

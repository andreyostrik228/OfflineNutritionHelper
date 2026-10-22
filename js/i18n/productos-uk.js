/**
 * js/i18n/productos-uk.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los nombres de producto del modo "sin cocinar", en ucraniano (2026-10-22).
 *
 * La clave es el nombre del catálogo tal cual (js/data/real-products.js) y
 * la pantalla enseña los dos: "traducción / etiqueta" (nombreProductoDoble,
 * js/ui/render.js). Las marcas (Hacendado, Danone...) no se traducen.
 *
 * Son los 1274 nombres distintos que el generador puede elegir
 * (getNoCookEligiblePool), agrupados por la categoría del catálogo. Un
 * producto nuevo sale con su etiqueta hasta que se añada aquí; el test
 * "cada producto del modo sin cocinar tiene traducción" lo convierte en un
 * fallo en vez de en un hueco silencioso.
 *
 * No se carga con el resto de tablas: lo pide js/core/productos-idioma.js,
 * solo para el idioma en uso.
 * ─────────────────────────────────────────────────────────────────────────
 */

registerProductTable("uk", {
  // ── Aceitunas negras
  "Aceitunas negras en rodajas Hacendado": "Чорні оливки кільцями Hacendado",
  "Aceitunas negras sin hueso Hacendado": "Чорні оливки без кісточок Hacendado",

  // ── Aceitunas verdes
  "Aceitunas verdes Chupadedos Huerta de Barros partidas aliñadas": "Зелені оливки Chupadedos Huerta de Barros надрізані мариновані",
  "Aceitunas verdes con hueso Hacendado": "Зелені оливки з кісточкою Hacendado",
  "Aceitunas verdes estilo casero Hacendado partidas aliñadas": "Зелені оливки по-домашньому Hacendado надрізані мариновані",
  "Aceitunas verdes partidas Olives Garcia": "Зелені оливки надрізані Olives Garcia",
  "Aceitunas verdes Picadedos sin hueso Hacendado aliñadas": "Зелені оливки Picadedos без кісточок Hacendado мариновані",
  "Aceitunas verdes rellenas de anchoa Hacendado": "Зелені оливки з анчоусом Hacendado",
  "Aceitunas verdes rellenas de jalapeño Hacendado": "Зелені оливки з халапеньо Hacendado",
  "Aceitunas verdes rellenas de pepinillo Hacendado": "Зелені оливки з корнішоном Hacendado",
  "Aceitunas verdes rellenas de pimiento asado Hacendado": "Зелені оливки з печеним перцем Hacendado",
  "Aceitunas verdes sin hueso aliñadas Hacendado": "Зелені оливки без кісточок мариновані Hacendado",
  "Aceitunas verdes sin hueso Hacendado": "Зелені оливки без кісточок Hacendado",

  // ── Agua sin gas
  "Agua de coco 100% Hacendado": "Кокосова вода 100% Hacendado",

  // ── Ahumados
  "Bacalao ahumado Hacendado en aceite de girasol": "Копчена тріска Hacendado в соняшниковій олії",
  "Filetes de sardina ahumada Hacendado en aceite de girasol": "Філе копченої сардини Hacendado в соняшниковій олії",
  "Mojama de atún extra Hacendado lonchas": "В'ялений тунець мохама екстра Hacendado скибочки",
  "Salmón ahumado Hacendado": "Копчений лосось Hacendado",
  "Salmón marinado Hacendado": "Маринований лосось Hacendado",
  "Taquitos de salmón ahumado Hacendado": "Кубики копченого лосося Hacendado",

  // ── Alubias
  "Alubia cocida blanca Hacendado": "Біла квасоля варена Hacendado",
  "Alubia cocida granja Hacendado": "Квасоля гранха варена Hacendado",
  "Alubia cocida pinta Hacendado": "Строката квасоля варена Hacendado",
  "Alubia cocida roja Hacendado": "Червона квасоля варена Hacendado",

  // ── Arroz
  "Arroz cocido basmati Sabroz": "Готовий рис басматі Sabroz",
  "Arroz cocido integral Sabroz": "Готовий бурий рис Sabroz",
  "Arroz cocido redondo Sabroz": "Готовий круглий рис Sabroz",
  "Arroz de pescado Hacendado": "Рис з рибою Hacendado",
  "Arroz de secreto ibérico con setas Hacendado": "Рис з іберійською свининою секрето та грибами Hacendado",
  "Arroz de verduras Hacendado": "Рис з овочами Hacendado",
  "Pollo al curry Hacendado con arroz basmati": "Курка карі Hacendado з рисом басматі",

  // ── Atún
  "Atún claro al natural Hacendado": "Світлий тунець у власному соку Hacendado",
  "Atún claro en aceite de girasol Hacendado": "Світлий тунець у соняшниковій олії Hacendado",
  "Atún claro en escabeche blanco Hacendado": "Світлий тунець у маринаді ескабече Hacendado",
  "Atún en aceite de girasol Hacendado": "Тунець у соняшниковій олії Hacendado",
  "Atún en aceite de oliva Hacendado": "Тунець в оливковій олії Hacendado",
  "Atún en salsa de tomate Hacendado": "Тунець у томатному соусі Hacendado",
  "Ventresca de atún claro en aceite de oliva Hacendado": "Черевце світлого тунця в оливковій олії Hacendado",

  // ── Azúcar
  "Azúcar blanco en sobres Hacendado": "Білий цукор у пакетиках Hacendado",
  "Azúcar blanco Hacendado": "Білий цукор Hacendado",
  "Azúcar glas Hacendado": "Цукрова пудра Hacendado",
  "Azúcar moreno de caña Hacendado": "Коричневий тростинний цукор Hacendado",
  "Azúcar moreno en sobres Hacendado": "Коричневий цукор у пакетиках Hacendado",
  "Panela azúcar moreno de caña integral Hacendado": "Панела, нерафінований тростинний цукор Hacendado",

  // ── Bacón
  "Bacón ahumado La Selva lonchas": "Копчений бекон La Selva скибочки",
  "Bacón ahumado sin corteza La Selva": "Копчений бекон без шкірки La Selva",
  "Bacón Hacendado cintas": "Бекон Hacendado смужки",
  "Bacón Oscar Mayer lonchas": "Бекон Oscar Mayer скибочки",
  "Lomo back bacon Hacendado": "Корейка, бекон бек Hacendado",
  "Panceta curada sin corteza La Selva lonchas": "В'ялена грудинка без шкірки La Selva скибочки",
  "Panceta salada ibérica La Hacienda del ibérico": "Солона іберійська грудинка La Hacienda del ibérico",

  // ── Barra de pan
  "2 Baguettes para hornear": "2 багети для випікання",
  "3 Barras de pan": "3 батони хліба",
  "3 Barras de pan aceite de oliva": "3 батони хліба на оливковій олії",
  "Baguette masa madre": "Багет на заквасці",
  "Baguette sin gluten": "Багет без глютену",
  "Barra de pan": "Батон хліба",
  "Barra de pan campesina masa madre": "Сільський батон на заквасці",
  "Barra de pan espiga": "Батон «колосок»",
  "Barra pan de aceite de oliva": "Батон на оливковій олії",
  "Barra pan de agua": "Водяний батон",
  "Barra pan de pueblo": "Сільський батон",
  "Barra pan integral de espelta 100%": "Батон з цільнозернової спельти 100%",
  "Hogaza de centeno 50%": "Житній коровай 50%",
  "Pan campeón del mundo": "Хліб «Чемпіон світу»",
  "Pan integral trigo 100%": "Цільнозерновий пшеничний хліб 100%",

  // ── Barritas de cereales
  "Barrita con proteínas sabor chocolate con leche Enervit Sport": "Протеїновий батончик зі смаком молочного шоколаду Enervit Sport",
  "Barritas con proteínas sabor coco y chocolate Enervit Sport": "Протеїнові батончики зі смаком кокоса та шоколаду Enervit Sport",
  "Barritas de avena y chocolate negro Crunchy Nature Valley": "Батончики з вівсом і чорним шоколадом Crunchy Nature Valley",
  "Barritas de cereales avena y cacao Hacendado": "Злакові батончики з вівсом і какао Hacendado",
  "Barritas de cereales muesli y chocolate Hacendado": "Злакові батончики з мюслі та шоколадом Hacendado",
  "Barritas de cereales sabor mandarina Hacendado": "Злакові батончики зі смаком мандарина Hacendado",
  "Barritas de cereales y chocolate blanco Hacendado": "Злакові батончики з білим шоколадом Hacendado",
  "Barritas de cereales y chocolate con leche Hacendado": "Злакові батончики з молочним шоколадом Hacendado",
  "Barritas de cereales y frutos secos Hacendado": "Злакові батончики з горіхами Hacendado",
  "Barritas de galleta y arándanos Hacendado": "Печиво-батончики з журавлиною Hacendado",

  // ── Batidos
  "Batido de chocolate 90% leche Hacendado": "Шоколадний коктейль 90% молока Hacendado",
  "Batido de chocolate 90% leche Puleva": "Шоколадний коктейль 90% молока Puleva",
  "Batido de chocolate Hacendado": "Шоколадний коктейль Hacendado",
  "Batido de chocolate Hacendado 0% sin azúcares añadidos": "Шоколадний коктейль Hacendado 0% без доданого цукру",
  "Batido de vainilla Hacendado": "Ванільний коктейль Hacendado",
  "Batido sabor fresa Hacendado": "Коктейль зі смаком полуниці Hacendado",
  "Batido sabor vainilla Hacendado": "Коктейль зі смаком ванілі Hacendado",

  // ── Bebidas frías
  "Café con leche cappuccino Hacendado": "Холодна кава з молоком капучино Hacendado",
  "Café con leche descafeinado Hacendado": "Холодна кава з молоком без кофеїну Hacendado",
  "Café con leche espresso Hacendado": "Холодна кава з молоком еспресо Hacendado",
  "Café con leche light sin lactosa Hacendado": "Холодна кава з молоком лайт без лактози Hacendado",

  // ── Bebidas vegetales
  "Bebida de almendras 0% azúcar Hacendado": "Мигдальний напій 0% цукру Hacendado",
  "Bebida de almendras con calcio Hacendado": "Мигдальний напій з кальцієм Hacendado",
  "Bebida de arroz sin azúcares añadidos Hacendado": "Рисовий напій без доданого цукру Hacendado",
  "Bebida de avellana y arroz sin azúcares añadidos Hacendado": "Напій з фундука та рису без доданого цукру Hacendado",
  "Bebida de avena Alitey": "Вівсяний напій Alitey",
  "Bebida de avena con café Hacendado": "Вівсяний напій з кавою Hacendado",
  "Bebida de avena con calcio sin azúcares añadidos Hacendado": "Вівсяний напій з кальцієм без доданого цукру Hacendado",
  "Bebida de avena con chocolate sin azúcares añadidos Hacendado": "Вівсяний напій з шоколадом без доданого цукру Hacendado",
  "Bebida de avena Hacendado 0% azúcar": "Вівсяний напій Hacendado 0% цукру",
  "Bebida de coco y arroz sin azúcares añadidos Hacendado": "Напій з кокоса та рису без доданого цукру Hacendado",
  "Bebida de soja 0% azúcar Hacendado": "Соєвий напій 0% цукру Hacendado",
  "Bebida de soja con calcio y vitaminas sin azúcares añadidos Hacendado": "Соєвий напій з кальцієм і вітамінами без доданого цукру Hacendado",
  "Bebida de soja sabor vainilla Hacendado 0% azúcar": "Соєвий напій зі смаком ванілі Hacendado 0% цукру",
  "Horchata de chufa Hacendado": "Орчата з чуфи Hacendado",
  "Horchata de chufa sin azúcares añadidos Hacendado": "Орчата з чуфи без доданого цукру Hacendado",
  "Horchata fresca Hacendado": "Свіжа орчата Hacendado",
  "Preparado de coco Hacendado": "Кокосовий напій Hacendado",

  // ── Berberechos y almejas
  "Almejones al natural Hacendado": "Великі молюски альмехони у власному соку Hacendado",
  "Berberecho al natural XS Hacendado": "Серцевидки у власному соку XS Hacendado",
  "Berberechos al natural M Hacendado": "Серцевидки у власному соку M Hacendado",
  "Berberechos al natural S Hacendado": "Серцевидки у власному соку S Hacendado",
  "Zamburiñas en salsa de vieira Hacendado": "Гребінці самбуріньяс у соусі Hacendado",

  // ── Bífidus de sabores
  "Bífidus con cereales y fibras probióticos Hacendado": "Біфідойогурт зі злаками та клітковиною, з пробіотиками Hacendado",
  "Bífidus con ciruelas pasas probióticos Hacendado": "Біфідойогурт з чорносливом, з пробіотиками Hacendado",
  "Bífidus con frutos silvestres probióticos Hacendado 0% MG 0% azúcares añadidos": "Біфідойогурт з лісовими ягодами, з пробіотиками Hacendado 0% жирності, без доданого цукру",
  "Bífidus con kiwi probióticos Hacendado 0% MG 0% azúcares añadidos": "Біфідойогурт з ківі, з пробіотиками Hacendado 0% жирності, без доданого цукру",
  "Bífidus con mango probióticos Hacendado": "Біфідойогурт з манго, з пробіотиками Hacendado",
  "Bífidus con nueces y cereales probióticos Hacendado 0% MG": "Біфідойогурт з горіхами та злаками, з пробіотиками Hacendado 0% жирності",
  "Bífidus con pera probióticos Hacendado 0% MG 0% azúcares añadidos": "Біфідойогурт з грушею, з пробіотиками Hacendado 0% жирності, без доданого цукру",
  "Bífidus con piña probióticos Hacendado 0% MG 0% azúcares añadidos": "Біфідойогурт з ананасом, з пробіотиками Hacendado 0% жирності, без доданого цукру",
  "Bífidus cremoso con coco probióticos Hacendado": "Вершковий біфідойогурт з кокосом, з пробіотиками Hacendado",

  // ── Bífidus naturales
  "Bífidus cremoso natural edulcorado probióticos Hacendado 0% MG 0% azúcares añadidos": "Вершковий натуральний біфідойогурт з підсолоджувачем, з пробіотиками Hacendado 0% жирності, без доданого цукру",
  "Bífidus natural azucarado probióticos Hacendado con cereales y fresas deshidratadas": "Натуральний солодкий біфідойогурт з пробіотиками Hacendado зі злаками та сушеною полуницею",
  "Bífidus natural edulcorado probióticos Activia 0% MG 0% azúcares añadidos": "Натуральний біфідойогурт з підсолоджувачем, з пробіотиками Activia 0% жирності, без доданого цукру",
  "Bífidus natural probióticos Activia 0% MG  0% azúcares añadidos": "Натуральний біфідойогурт з пробіотиками Activia 0% жирності, без доданого цукру",
  "Bífidus natural probióticos Hacendado": "Натуральний біфідойогурт з пробіотиками Hacendado",
  "Bífidus natural probióticos Hacendado 0% MG 0% azúcares añadidos": "Натуральний біфідойогурт з пробіотиками Hacendado 0% жирності, без доданого цукру",
  "Bífidus natural probióticos Hacendado con coco, almendras y chocolate": "Натуральний біфідойогурт з пробіотиками Hacendado з кокосом, мигдалем і шоколадом",

  // ── Bollería dulce
  "12 Mini croissants de mantequilla": "12 міні-круасанів на вершковому маслі",
  "6 Croissant rellenos de cacao": "6 круасанів з какао-начинкою",
  "Berlina al cacao": "Пончик берлінер з какао",
  "Berlina glacé": "Пончик берлінер у глазурі",
  "Bizcocho azúcar sin gluten": "Бісквіт із цукром без глютену",
  "Bizcocho con azúcar moreno y nueces": "Бісквіт з коричневим цукром і горіхами",
  "Bizcocho de cacao": "Какао-бісквіт",
  "Bizcocho de chocolate sin gluten y sin lactosa": "Шоколадний бісквіт без глютену та без лактози",
  "Bizcocho de manzana": "Яблучний бісквіт",
  "Bizcocho de yogur Hacendado": "Йогуртовий бісквіт Hacendado",
  "Bizcocho relleno de caramelo salado": "Бісквіт з начинкою із солоної карамелі",
  "Ensaimada": "Енсаймада (спіральна булочка)",
  "Fartons": "Фартони (солодкі булочки)",
  "Magdalenas con azúcar": "Кекси магдалени з цукром",
  "Magdalenas con pepitas de chocolate": "Кекси магдалени з шоколадною крихтою",
  "Napolitana de chocolate": "Листкова наполітана з шоколадом",
  "Napolitana de crema": "Листкова наполітана з кремом",
  "Pastel de crema 65%": "Тістечко з кремом 65%",
  "Pepito de crema": "Булочка пепіто з кремом",
  "Rosquillas al cacao": "Пончики-кільця з какао",
  "Trenza con nueces pecán": "Плетінка з горіхами пекан",

  // ── Bollería envasada
  "Bizcocho Hacendado": "Бісквіт Hacendado",
  "Bizcochos de huevo Hacendado": "Яєчні бісквіти Hacendado",
  "Bizcochos Hacendado": "Бісквіти Hacendado",
  "Bocaditos bañados al cacao Hacendado": "Тістечка в какао-глазурі Hacendado",
  "Bollo con pepitas de chocolate Hacendado Choco Buns": "Булочки з шоколадною крихтою Hacendado Choco Buns",
  "Caña de hojaldre rellena de crema sabor vainilla Hacendado con cobertura de cacao": "Листкова трубочка з ванільним кремом Hacendado в какао-глазурі",
  "Crepes rellenos de chocolate Hacendado": "Млинці з шоколадною начинкою Hacendado",
  "Croissant Hacendado": "Круасан Hacendado",
  "Croissant relleno de crema al cacao Hacendado": "Круасан з какао-кремом Hacendado",
  "Ensaimadas Hacendado": "Енсаймади Hacendado",
  "Fartons tradicionales Polo": "Традиційні фартони Polo",
  "Gofres clásicos Hacendado": "Класичні вафлі Hacendado",
  "Gofres con chocolate Hacendado": "Вафлі з шоколадом Hacendado",
  "Magdalenas al cacao Hacendado": "Кекси магдалени з какао Hacendado",
  "Magdalenas Hacendado": "Кекси магдалени Hacendado",
  "Magdalenas integrales 0% azúcares añadidos Hacendado": "Цільнозернові кекси магдалени без доданого цукру Hacendado",
  "Magdalenas sin gluten Hacendado": "Кекси магдалени без глютену Hacendado",
  "Mantecadas Hacendado": "Кекси мантекадас Hacendado",
  "Mini magdalenas con pepitas de chocolate con leche Hacendado": "Міні-кекси зі шматочками молочного шоколаду Hacendado",
  "Napolitanas con relleno de cacao Hacendado": "Листкові наполітани з какао-начинкою Hacendado",
  "Napolitanas con relleno sabor crema Hacendado": "Листкові наполітани з начинкою зі смаком крему Hacendado",
  "Palmeritas Hacendado": "Міні-пальмери (листкове печиво) Hacendado",
  "Pan de leche Hacendado": "Молочні булочки Hacendado",
  "Rosegones pasta de almendras Hacendado": "Росегони з мигдальною пастою Hacendado",
  "Sobaos Hacendado": "Кекси собаос Hacendado",
  "Tortas de aceite Inés Rosales": "Коржики на оливковій олії Inés Rosales",
  "Tortas de aceite Inés Rosales sin azúcar": "Коржики на оливковій олії Inés Rosales без цукру",
  "Valencianas Hacendado": "Бісквітні кекси валенсіанас Hacendado",

  // ── Bollería salada
  "24 Mini saladas surtidas": "24 міні-закуски асорті",
  "6 Mini empanadillas de pisto": "6 міні-пиріжків з овочевим пісто",
  "Empanada de atún": "Емпанада з тунцем",
  "Empanada de atún grande": "Велика емпанада з тунцем",
  "Empanada de carne": "Емпанада з м'ясом",
  "Empanadilla de atún": "Пиріжок емпанаділья з тунцем",
  "Empanadilla de bacon y queso": "Пиріжок емпанаділья з беконом і сиром",
  "Empanadilla de espinacas 26%": "Пиріжок емпанаділья зі шпинатом 26%",
  "Empanadilla de pollo y bechamel": "Пиріжок емпанаділья з куркою та бешамелем",
  "Empanadilla de tomate": "Пиріжок емпанаділья з томатом",
  "Napolitana mixta": "Листкова наполітана з шинкою та сиром",

  // ── Bonito
  "Bonito del norte en aceite de oliva Hacendado": "Північний тунець боніто в оливковій олії Hacendado",
  "Filetes de bonito del norte en aceite de oliva Hacendado": "Філе північного тунця боніто в оливковій олії Hacendado",
  "Migas de bonito del norte en aceite de oliva Hacendado": "Шматочки північного тунця боніто в оливковій олії Hacendado",

  // ── Caballa y melva
  "Filetes de caballa del sur contenido reducido en sal Hacendado en aceite de oliva": "Філе південної скумбрії зі зниженим вмістом солі Hacendado в оливковій олії",
  "Filetes de caballa del sur en tomate Hacendado": "Філе південної скумбрії в томаті Hacendado",
  "Filetes de melva canutera con pimientos del piquillo Hacendado en aceite de oliva": "Філе мелви канутери з перцем пікільо Hacendado в оливковій олії",
  "Filetes de melva en aceite de oliva Hacendado": "Філе мелви в оливковій олії Hacendado",

  // ── Cacao soluble
  "Cacao soluble ColaCao original": "Розчинне какао ColaCao оригінальне",
  "Cacao soluble Hacendado": "Розчинне какао Hacendado",
  "Cacao soluble instantáneo Hacendado": "Швидкорозчинне какао Hacendado",
  "Cacao soluble instantáneo Nesquik": "Швидкорозчинне какао Nesquik",

  // ── Café soluble
  "Café soluble cappuccino Hacendado": "Розчинна кава капучино Hacendado",
  "Café soluble Classic Hacendado": "Розчинна кава Classic Hacendado",
  "Café soluble descafeinado Hacendado": "Розчинна кава без кофеїну Hacendado",
  "Café soluble Espresso Creme Hacendado": "Розчинна кава Espresso Creme Hacendado",

  // ── Caldo líquido
  "Caldo de marisco o fideuá para paella Hacendado con sofrito": "Бульйон з морепродуктів для паельї або фідеуа Hacendado з софрито",
  "Caldo de pollo casero Gallina Blanca": "Домашній курячий бульйон Gallina Blanca",
  "Caldo de verduras Hacendado": "Овочевий бульйон Hacendado",
  "Fumet caldo de pescado Hacendado": "Рибний бульйон фюме Hacendado",

  // ── Cápsulas compatibles Dolce gusto
  "Café con leche en cápsula descafeinado Hacendado": "Кава з молоком у капсулах без кофеїну Hacendado",
  "Café con leche en cápsula Dolce Gusto": "Кава з молоком у капсулах Dolce Gusto",
  "Café con leche en cápsula Hacendado": "Кава з молоком у капсулах Hacendado",
  "Café cortado en cápsula Hacendado": "Кава кортадо в капсулах Hacendado",
  "Café en cápsula cappuccino Hacendado": "Кава капучино в капсулах Hacendado",
  "Café en cápsula cortado Dolce Gusto": "Кава кортадо в капсулах Dolce Gusto",
  "Café en cápsula extra forte Hacendado": "Кава в капсулах екстра форте Hacendado",
  "Café en cápsula forte Hacendado": "Кава в капсулах форте Hacendado",
  "Cortado en cápsula descafeinado Hacendado": "Кортадо в капсулах без кофеїну Hacendado",

  // ── Cápsulas compatibles Nespresso
  "Café en cápsula ristretto Hacendado": "Кава ристрето в капсулах Hacendado",

  // ── Carne
  "Albóndigas guisadas Hacendado": "Тушковані фрикадельки Hacendado",
  "Alitas de pollo asadas Hacendado": "Запечені курячі крильця Hacendado",
  "Carne de cerdo Pulled Pork Hacendado sabor barbacoa": "Рвана свинина Pulled Pork Hacendado зі смаком барбекю",
  "Codillo de cerdo asado Hacendado": "Запечена свиняча рулька Hacendado",
  "Costillas de cerdo a la barbacoa cortadas Hacendado": "Свинячі реберця барбекю нарізані Hacendado",
  "Migas Hacendado": "Мігас (смажені хлібні крихти) Hacendado",
  "Muslo de pato confitado Hacendado": "Качина ніжка конфі Hacendado",
  "Pollo asado Hacendado": "Запечена курка Hacendado",
  "Pollo asado troceado Hacendado": "Запечена курка шматочками Hacendado",
  "Roti de pollo relleno de jamón y queso Hacendado": "Курячий рулет з шинкою та сиром Hacendado",

  // ── Cerdo
  "Fiambre de magreta de cerdo adobada": "Маринована свиняча лопатка, нарізка",
  "Fiambre de magro de cerdo adobado": "Маринована пісна свинина, нарізка",

  // ── Cereales
  "Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos": "Кукурудзяні пластівці Corn Flakes Hacendado без доданого цукру",
  "Cereales copos de maíz Corn Flakes Kellogg's": "Кукурудзяні пластівці Corn Flakes Kellogg's",
  "Cereales copos de trigo Chocodays Hacendado con chocolate": "Пшеничні пластівці Chocodays Hacendado з шоколадом",
  "Cereales de arroz inflado Choco Krispies Kellogg's con chocolate": "Повітряний рис Choco Krispies Kellogg's з шоколадом",
  "Cereales estrellas de maíz Stars Hacendado con miel": "Кукурудзяні зірочки Stars Hacendado з медом",
  "Cereales rellenos de cacao y avellana Hacendado": "Подушечки з какао та фундуком Hacendado",
  "Cereales rellenos de crema de cacao y avellana Hacendado sin gluten": "Подушечки з кремом з какао та фундука Hacendado без глютену",
  "Cereales rellenos de leche Hacendado": "Подушечки з молочною начинкою Hacendado",
  "Mini cereales rellenos de leche Hacendado": "Міні-подушечки з молочною начинкою Hacendado",

  // ── Cereales integrales y muesli
  "Avena molida Hacendado": "Мелена вівсянка Hacendado",
  "Cereales avena Crunchy Hacendado": "Вівсяні пластівці Crunchy Hacendado",
  "Cereales avena Crunchy Hacendado de cacao": "Вівсяні пластівці Crunchy Hacendado з какао",
  "Cereales Cereal Mix Hacendado 0% azúcares añadidos": "Пластівці Cereal Mix Hacendado без доданого цукру",
  "Cereales con salvado de trigo Fibra Sticks Hacendado": "Пластівці з пшеничними висівками Fibra Sticks Hacendado",
  "Cereales copos de trigo espelta integral Hacendado 0% azúcares añadidos": "Пластівці з цільнозернової спельти Hacendado без доданого цукру",
  "Cereales copos de trigo integral y arroz Hacendado 0% azúcares añadidos": "Пластівці з цільної пшениці та рису Hacendado без доданого цукру",
  "Cereales copos de trigo integral y arroz Hacendado bañados en chocolate con leche": "Пластівці з цільної пшениці та рису Hacendado в молочному шоколаді",
  "Cereales copos de trigo integral y arroz Special K Classic": "Пластівці з цільної пшениці та рису Special K Classic",
  "Cereales copos tostados de trigo integral y arroz Hacendado con chocolate": "Підсмажені пластівці з цільної пшениці та рису Hacendado з шоколадом",
  "Copos avena tostada Hacendado con semillas y frutos secos": "Підсмажені вівсяні пластівці Hacendado з насінням і горіхами",
  "Copos de avena Brüggen": "Вівсяні пластівці Brüggen",
  "Copos de avena integral con chocolate Hacendado": "Цільнозернові вівсяні пластівці з шоколадом Hacendado",
  "Copos de avena sin gluten Hacendado": "Вівсяні пластівці без глютену Hacendado",
  "Muesli Crunchy Hacendado con chocolate": "Мюслі Crunchy Hacendado з шоколадом",
  "Muesli Crunchy Hacendado con fruta": "Мюслі Crunchy Hacendado з фруктами",
  "Muesli Crunchy Hacendado con frutos secos": "Мюслі Crunchy Hacendado з горіхами",
  "Muesli Crunchy Hacendado sin azúcares añadidos": "Мюслі Crunchy Hacendado без доданого цукру",
  "Muesli Hacendado 50% frutas y frutos secos": "Мюслі Hacendado 50% фруктів і горіхів",
  "Muesli Hacendado con frutas": "Мюслі Hacendado з фруктами",
  "Muesli Hacendado con quinoa, chía y chocolate negro": "Мюслі Hacendado з кіноа, чіа та чорним шоколадом",

  // ── Chocolate a la taza
  "Cacao en polvo a la taza Hacendado": "Какао-порошок для гарячого шоколаду Hacendado",
  "Cacao puro en polvo La Chocolatera": "Чистий какао-порошок La Chocolatera",
  "Chocolate líquido a la taza Hacendado": "Рідкий гарячий шоколад Hacendado",

  // ── Chocolate blanco
  "Chocolate blanco fundir Hacendado": "Білий шоколад для розтоплювання Hacendado",
  "Chocolate blanco Fussion Hacendado relleno de crema de galleta y cacao": "Білий шоколад Fussion Hacendado з кремом з печива та какао",
  "Chocolate blanco Hacendado": "Білий шоколад Hacendado",

  // ── Chocolate con leche
  "Chocolate con leche classic Hacendado extrafino": "Молочний шоколад classic Hacendado екстрафайн",
  "Chocolate con leche extrafino Nestlé": "Молочний шоколад екстрафайн Nestlé",
  "Chocolate con leche fundir Hacendado": "Молочний шоколад для розтоплювання Hacendado",
  "Chocolate con leche Fussion Hacendado relleno crema de fresa": "Молочний шоколад Fussion Hacendado з полуничним кремом",
  "Chocolate con leche Fussion Hacendado relleno de crema de pistacho y masa filo tostada": "Молочний шоколад Fussion Hacendado з фісташковим кремом і хрустким тістом філо",
  "Chocolate con leche Hacendado almendras enteras": "Молочний шоколад Hacendado з цілим мигдалем",
  "Chocolate con leche Hacendado avellanas troceadas": "Молочний шоколад Hacendado з подрібненим фундуком",
  "Chocolate con leche Milka": "Молочний шоколад Milka",
  "Chocolate con leche Milka galleta": "Молочний шоколад Milka з печивом",
  "Chocolate con leche Milka galleta Oreo": "Молочний шоколад Milka з печивом Oreo",
  "Chocolate con leche Valor almendras enteras": "Молочний шоколад Valor з цілим мигдалем",
  "Chocolate extrafino con leche Hacendado 0% azúcares añadidos": "Молочний шоколад екстрафайн Hacendado без доданого цукру",
  "Chocolate extrafino con leche Hacendado almendras enteras": "Молочний шоколад екстрафайн Hacendado з цілим мигдалем",
  "Fideos de chocolate Hacendado": "Шоколадна посипка Hacendado",

  // ── Chocolate negro
  "99% cacao negro Hacendado": "Чорний шоколад 99% какао Hacendado",
  "Chocolate negro 55% cacao Hacendado": "Чорний шоколад 55% какао Hacendado",
  "Chocolate negro 55% cacao Hacendado con almendras": "Чорний шоколад 55% какао Hacendado з мигдалем",
  "Chocolate negro 70% cacao fundir Hacendado 0% azúcares añadidos": "Чорний шоколад 70% какао для розтоплювання Hacendado без доданого цукру",
  "Chocolate negro 72% cacao Hacendado con trozos de naranja": "Чорний шоколад 72% какао Hacendado зі шматочками апельсина",
  "Chocolate negro 72% de cacao Hacendado": "Чорний шоколад 72% какао Hacendado",
  "Chocolate negro 72% de cacao Hacendado con almendras enteras": "Чорний шоколад 72% какао Hacendado з цілим мигдалем",
  "Chocolate negro 85% cacao extrafino y edulcorante Hacendado 0% azúcares añadidos": "Чорний шоколад 85% какао екстрафайн з підсолоджувачем Hacendado без доданого цукру",
  "Chocolate negro 85% cacao Hacendado": "Чорний шоколад 85% какао Hacendado",
  "Chocolate negro fundir Hacendado": "Чорний шоколад для розтоплювання Hacendado",
  "Chocolate puro Valor": "Гіркий шоколад Valor",
  "Gotas de chocolate negro para fundir Hacendado": "Краплі чорного шоколаду для розтоплювання Hacendado",
  "Porciones de chocolate negro 72% cacao extrafino Hacendado": "Порційний чорний шоколад 72% какао екстрафайн Hacendado",
  "Porciones de Chocolate negro 85% cacao extrafino Hacendado": "Порційний чорний шоколад 85% какао екстрафайн Hacendado",

  // ── Chocolatinas
  "Barritas crujientes Hacendado recubiertas de chocolate con leche": "Хрусткі батончики Hacendado в молочному шоколаді",
  "Barritas de barquillo Hacendado con relleno de avellana cubiertas de chocolate con leche": "Вафельні батончики Hacendado з горіховою начинкою в молочному шоколаді",
  "Barritas de barquillo Huesitos bañadas de chocolate con leche": "Вафельні батончики Huesitos в молочному шоколаді",
  "Barritas de barquillo Kit-Kat bañadas de chocolate con leche": "Вафельні батончики Kit-Kat в молочному шоколаді",
  "Barritas de barquillo Meivel rellenas de turrón Viena y cacahuete": "Вафельні батончики Meivel з нугою туррон Viena та арахісом",
  "Barritas de barquillo Tokke original": "Вафельні батончики Tokke оригінальні",
  "Barritas de chocolate con leche Hacendado rellenas de leche": "Батончики з молочного шоколаду Hacendado з молочною начинкою",
  "Barritas Peanuts Hacendado bañadas de chocolate con leche y rellenas con caramelo, cacahuetes tostados y crema azucarada": "Батончики Peanuts Hacendado в молочному шоколаді з карамеллю, смаженим арахісом і солодким кремом",
  "Cacahuetes Chocoiris Hacendado bañados de chocolate con leche coloreados": "Арахіс Chocoiris Hacendado в кольоровому молочному шоколаді",
  "Cacahuetes Hacendado chocolate con leche": "Арахіс Hacendado в молочному шоколаді",
  "Cacahuetes Hacendado chocolate negro": "Арахіс Hacendado в чорному шоколаді",
  "Disquitos Pintarolas de chocolate con leche coloreados": "Кольорові драже Pintarolas з молочного шоколаду",
  "Huevo sorpresa de chocolate Hacendado": "Шоколадне яйце з сюрпризом Hacendado",
  "Huevos sorpresa de chocolate Hacendado dibujo": "Шоколадні яйця з сюрпризом Hacendado з малюнком",
  "Mix mini barritas de chocolate Hacendado": "Асорті міні-батончиків із шоколаду Hacendado",
  "Pistachos bañados de chocolate con leche Hacendado": "Фісташки в молочному шоколаді Hacendado",

  // ── Chopped
  "Chopped cerdo Hacendado lonchas": "Свинячий чоппед Hacendado скибочки",
  "Chopped cocido en lata Hacendado finas lonchas": "Варений чоппед у банці Hacendado тонкі скибочки",
  "Chopped Hacendado": "Чоппед Hacendado",

  // ── Chorizo
  "Chorizo cular ibérico extra La Hacienda del ibérico": "Іберійське чорізо кулар екстра La Hacienda del ibérico",
  "Chorizo de bellota ibérico cortado a máquina": "Іберійське чорізо з жолудевої свинини, машинна нарізка",
  "Chorizo de pavo extra Hacendado lonchas": "Чорізо з індички екстра Hacendado скибочки",
  "Chorizo de Tarancón Bricio": "Чорізо з Таранкона Bricio",
  "Chorizo dulce extra Hacendado": "Солодке чорізо екстра Hacendado",
  "Chorizo extra Hacendado lonchas": "Чорізо екстра Hacendado скибочки",
  "Chorizo extra pimienta Hacendado finas lonchas": "Чорізо екстра з перцем Hacendado тонкі скибочки",
  "Chorizo ibérico extra La Hacienda del ibérico lonchas": "Іберійське чорізо екстра La Hacienda del ibérico скибочки",
  "Chorizo ibérico La Hacienda del ibérico": "Іберійське чорізо La Hacienda del ibérico",
  "Chorizo Pamplona extra Hacendado lonchas": "Чорізо Памплона екстра Hacendado скибочки",
  "Chorizo picante extra Hacendado": "Гостре чорізо екстра Hacendado",
  "Chorizo picante extra Hacendado lonchas": "Гостре чорізо екстра Hacendado скибочки",
  "Chorizo sarta dulce extra de León Hacendado": "Солодке чорізо підковою екстра з Леона Hacendado",
  "Chorizo sarta picante extra de León Hacendado": "Гостре чорізо підковою екстра з Леона Hacendado",
  "Mini chorizo ibérico extra La Hacienda del ibérico": "Міні-чорізо іберійське екстра La Hacienda del ibérico",
  "Taquitos de chorizo extra Revilla": "Кубики чорізо екстра Revilla",

  // ── Cítricos
  "Mandarina": "Мандарин",
  "Naranja de mesa": "Столовий апельсин",
  "Naranjas": "Апельсини",

  // ── Cocktails
  "Cocktail de fruta deshidratada Hacendado": "Асорті сушених фруктів Hacendado",
  "Cocktail frutos secos Crunchy Hacendado sabores a barbacoa, Tex-Mex, miel y sal": "Горіховий мікс Crunchy Hacendado зі смаками барбекю, Tex-Mex, меду та солі",
  "Cocktail frutos secos mezcla Hacendado": "Горіховий мікс Hacendado",
  "Cocktail frutos secos natural Hacendado": "Натуральний горіховий мікс Hacendado",
  "Cocktail frutos secos Rodeo Hacendado": "Горіховий мікс Rodeo Hacendado",
  "Cocktail frutos secos Rumba Hacendado": "Горіховий мікс Rumba Hacendado",
  "Cocktail frutos secos tostados 0% sal añadida Hacendado": "Смажений горіховий мікс без доданої солі Hacendado",
  "Cocktail frutos secos tostados Hacendado sabor ahumado": "Смажений горіховий мікс Hacendado зі смаком копчення",
  "Combinado frutos secos Hacendado": "Горіхове асорті Hacendado",

  // ── Cóctel y banderillas
  "Banderillas dulces Hacendado": "Солодкі шпажки з маринадів Hacendado",
  "Banderillas picantes Hacendado": "Гострі шпажки з маринадів Hacendado",
  "Mix de encurtidos Hacendado": "Асорті маринованих овочів Hacendado",

  // ── Cola clásica
  "Refresco Coca-Cola": "Газований напій Coca-Cola",

  // ── Cola zero
  "Refresco Coca-Cola light": "Газований напій Coca-Cola light",
  "Refresco Coca-Cola zero azúcar": "Газований напій Coca-Cola zero без цукру",
  "Refresco Coca-Cola zero azúcar zero cafeína": "Газований напій Coca-Cola zero без цукру та без кофеїну",
  "Refresco cola Hacendado zero azúcar": "Кола Hacendado без цукру",
  "Refresco cola Hacendado zero azúcar zero cafeína": "Кола Hacendado без цукру та без кофеїну",

  // ── Colesterol y otros
  "Bebida Kéfir de coco Hacendado": "Кокосовий кефір Hacendado",
  "Bebida Kéfir de fresa y plátano Hacendado": "Кефір з полуницею та бананом Hacendado",
  "Bebida Kéfir natural Hacendado 0% MG": "Натуральний кефір Hacendado 0% жирності",
  "Bebida láctea de fresa Cuidacol 0% azúcares añadidos": "Молочний напій з полуницею Cuidacol без доданого цукру",
  "Bebida láctea de fresa Danacol 0% azúcares añadidos 0% MG": "Молочний напій з полуницею Danacol без доданого цукру, 0% жирності",
  "Bebida láctea natural Danacol 0% azúcares añadidos 0% MG": "Натуральний молочний напій Danacol без доданого цукру, 0% жирності",

  // ── Con chocolate y rellenas
  "Barquillos con crema de avellanas Hacendado": "Вафельні трубочки з горіховим кремом Hacendado",
  "Barquillos de cacao rellenos con crema de leche y de avellanas Knoppers": "Какао-вафлі з молочним і горіховим кремом Knoppers",
  "Barquillos rellenos con crema de cacao Hacendado": "Вафельні трубочки з какао-кремом Hacendado",
  "Barquillos rellenos de nata Hacendado 0% azúcares añadidos": "Вафельні трубочки з вершками Hacendado без доданого цукру",
  "Barquillos rellenos sabor nata Hacendado": "Вафельні трубочки зі смаком вершків Hacendado",
  "Barritas de galleta bañadas en chocolate con leche Chips Ahoy": "Печиво-батончики в молочному шоколаді Chips Ahoy",
  "Galletas Choco leche con chocolatina Hacendado": "Печиво Choco leche з плиткою молочного шоколаду Hacendado",
  "Galletas Choco negro con chocolatina Hacendado": "Печиво Choco negro з плиткою чорного шоколаду Hacendado",
  "Galletas Chocominis sabor chocolate Hacendado": "Печиво Chocominis зі смаком шоколаду Hacendado",
  "Galletas Classic Choc Hacendado": "Печиво Classic Choc Hacendado",
  "Galletas con chocolate blanco Hacendado": "Печиво з білим шоколадом Hacendado",
  "Galletas con chocolate y crema de leche Hacendado": "Печиво з шоколадом і молочним кремом Hacendado",
  "Galletas Cookies Hacendado": "Печиво Cookies Hacendado",
  "Galletas cookies sin gluten y sin lactosa Hacendado": "Печиво cookies без глютену та без лактози Hacendado",
  "Galletas Crunchy Choc Hacendado": "Печиво Crunchy Choc Hacendado",
  "Galletas de cacao Caocream bañadas de chocolate blanco Hacendado rellenas de crema": "Какао-печиво Caocream у білому шоколаді Hacendado з кремовою начинкою",
  "Galletas de cacao Caocream Hacendado rellenas de crema": "Какао-печиво Caocream Hacendado з кремовою начинкою",
  "Galletas Digestive avena chocolate con leche Hacendado": "Печиво Digestive з вівсом і молочним шоколадом Hacendado",
  "Galletas Digestive chocolate con leche Hacendado": "Печиво Digestive з молочним шоколадом Hacendado",
  "Galletas Diverkao Hacendado": "Печиво Diverkao Hacendado",
  "Galletas Divertidas chocolate con leche Hacendado": "Печиво Divertidas з молочним шоколадом Hacendado",
  "Galletas rebuenas Hacendado rellenas de chocolate": "Печиво rebuenas Hacendado з шоколадною начинкою",
  "Galletas rellenas de chocolate Hacendado 0% azúcares añadidos": "Печиво з шоколадною начинкою Hacendado без доданого цукру",
  "Galletas Roditas bañadas con chocolate blanco Hacendado": "Печиво Roditas у білому шоколаді Hacendado",
  "Mini galletas caritas Hacendado con crema de cacao": "Міні-печиво «пички» Hacendado з какао-кремом",
  "Mini galletas Cookies Hacendado": "Міні-печиво Cookies Hacendado",
  "Mini galletas de cacao Caocream Hacendado rellenas de crema": "Міні-печиво какао Caocream Hacendado з кремовою начинкою",
  "Rosquillas de chocolate con leche y coco Hacendado": "Пончики-кільця в молочному шоколаді з кокосом Hacendado",
  "Tartaletas con relleno de fresa Hacendado": "Тарталетки з полуничною начинкою Hacendado",

  // ── Conservas fruta
  "Dulce de membrillo Hacendado 0% azúcares añadidos": "Мармелад з айви Hacendado без доданого цукру",
  "Macedonia mix de frutas en almíbar Hacendado": "Фруктовий салат-асорті в сиропі Hacendado",
  "Melocotón en almíbar Hacendado": "Персики в сиропі Hacendado",
  "Melocotón light Hacendado sin azúcares añadidos": "Персики лайт Hacendado без доданого цукру",
  "Piña en su jugo Hacendado rodajas": "Ананас у власному соку Hacendado кільцями",
  "Postre de manzana Jamar": "Яблучний десерт Jamar",

  // ── Conservas verdura
  "Acelgas troceadas Hacendado": "Мангольд нарізаний Hacendado",
  "Champiñón entero Hacendado": "Цілі печериці Hacendado",
  "Champiñón laminado Hacendado": "Печериці пластинками Hacendado",
  "Chucrut al estilo bávaro Hengstenberg": "Квашена капуста по-баварськи Hengstenberg",
  "Corazones de alcachofa Hacendado": "Серцевини артишоків Hacendado",
  "Ensalada china Hacendado con mazorquitas": "Китайський салат Hacendado з міні-кукурудзою",
  "Espárragos blancos delgados Hacendado cortos": "Тонка біла спаржа Hacendado коротка",
  "Espárragos blancos gruesos Hacendado cortos": "Товста біла спаржа Hacendado коротка",
  "Espárragos blancos medianos Hacendado": "Середня біла спаржа Hacendado",
  "Espárragos blancos muy gruesos Hacendado enteros": "Дуже товста біла спаржа Hacendado ціла",
  "Guisantes extra Hacendado": "Зелений горошок екстра Hacendado",
  "Judías verdes planas Hacendado": "Пласка стручкова квасоля Hacendado",
  "Judías verdes redondas Hacendado": "Кругла стручкова квасоля Hacendado",
  "Macedonia de verduras Hacendado": "Овочеве асорті Hacendado",
  "Maíz dulce Hacendado": "Солодка кукурудза Hacendado",
  "Mazorquitas de maíz agridulce Hacendado": "Міні-кукурудза кисло-солодка Hacendado",
  "Palmito al natural entero Hacendado": "Пальмова серцевина ціла Hacendado",
  "Patatas cocidas Hacendado": "Варена картопля Hacendado",
  "Pimientos asados en tiras Hacendado": "Печений перець смужками Hacendado",
  "Pimientos del piquillo enteros Hacendado extra": "Перець пікільо цілий Hacendado екстра",
  "Pimientos en tiras condimentados Hacendado": "Приправлений перець смужками Hacendado",
  "Remolacha en tiras Hacendado": "Буряк соломкою Hacendado",
  "Verduras asadas Hacendado": "Печені овочі Hacendado",
  "Zanahoria en tiras Hacendado": "Морква соломкою Hacendado",

  // ── Crakers y tartaletas
  "Crackers 30% integral": "Крекери 30% цільнозернові",
  "Crackers con sal Hacendado": "Солоні крекери Hacendado",
  "Crackers integrales de espelta Bachman": "Цільнозернові крекери зі спельти Bachman",
  "Crackers sin gluten Hacendado con romero": "Крекери без глютену Hacendado з розмарином",
  "Galletas saladas salpicks Galbusera": "Солоне печиво salpicks Galbusera",
  "Pan de fibra y sésamo Hacendado": "Хлібці з клітковиною та кунжутом Hacendado",
  "Tostadas de arroz y maíz Hacendado": "Рисово-кукурудзяні хлібці Hacendado",

  // ── Cremas de untar
  "Crema al cacao con avellanas Hacendado": "Какао-крем з фундуком Hacendado",
  "Crema al cacao con avellanas Nocilla original": "Какао-крем з фундуком Nocilla оригінальний",
  "Crema al cacao con avellanas Nutella": "Какао-крем з фундуком Nutella",
  "Crema al cacao y leche con avellanas Nocilla": "Какао-молочний крем з фундуком Nocilla",
  "Crema de avellanas y cacao Hacendado": "Крем з фундука та какао Hacendado",
  "Crema de cacahuete 100% Hacendado": "Арахісова паста 100% Hacendado",
  "Dulce de leche Chimbote": "Варене згущене молоко дульсе де лече Chimbote",

  // ── Cremas y puré
  "Crema de calabacín Hacendado": "Крем-суп з кабачків Hacendado",
  "Crema de calabaza Hacendado": "Гарбузовий крем-суп Hacendado",
  "Crema de calabaza y zanahoria Hacendado": "Крем-суп з гарбуза та моркви Hacendado",
  "Crema de espárragos Hacendado": "Крем-суп зі спаржі Hacendado",
  "Crema de lentejas Hacendado": "Сочевичний крем-суп Hacendado",
  "Crema de setas Starlux con champiñones": "Грибний крем-суп Starlux з печерицями",
  "Crema de verduras Hacendado": "Овочевий крем-суп Hacendado",

  // ── Edulcorante y otros
  "Edulcorante en pastillas stevia Hacendado": "Підсолоджувач стевія в таблетках Hacendado",
  "Edulcorante sacarina en sobres Hacendado": "Підсолоджувач сахарин у пакетиках Hacendado",
  "Sirope de agave Hacendado": "Сироп агави Hacendado",

  // ── Empanados y elaborados
  "Lomo de cerdo marinado empanado sin gluten": "Маринована свиняча корейка в паніровці без глютену",
  "Oreja de cerdo cocida adobada Rogusa": "Варене мариноване свиняче вухо Rogusa",

  // ── Empanados y rebozados congelados
  "Croquetas de cocido Hacendado ultracongeladas": "Крокети з косідо Hacendado швидкозаморожені",
  "Pollo marinado rebozado Crispy American Style Hacendado ultracongelado": "Маринована курка в клярі Crispy American Style Hacendado швидкозаморожена",

  // ── Energético
  "Bebida energética Energy Drink Hacendado": "Енергетичний напій Energy Drink Hacendado",
  "Bebida energética Energy Monster": "Енергетичний напій Energy Monster",
  "Bebida energética Furious Energy drink Hacendado": "Енергетичний напій Furious Energy drink Hacendado",
  "Bebida energética Red Bull": "Енергетичний напій Red Bull",
  "Bebida energética Zero Energy Drink Hacendado": "Енергетичний напій Zero Energy Drink Hacendado",

  // ── Ensalada preparada
  "Ensalada César": "Салат «Цезар»",
  "Ensalada de la casa": "Фірмовий салат",
  "Ensalada de pasta": "Салат з пастою",
  "Ensalada de pasta Listo para Comer": "Салат з пастою Listo para Comer",
  "Ensalada de pollo, queso y frutos secos Listo para Comer": "Салат з куркою, сиром і горіхами Listo para Comer",
  "Ensalada ensatún": "Салат з тунцем енсатун",
  "Ensalada queso de cabra": "Салат з козячим сиром",
  "Wraps Texas": "Роли Texas",

  // ── Ensaladilla
  "Ensaladilla americana Hacendado": "Американський салат Hacendado",
  "Ensaladilla Delicias del mar Hacendado": "Салат «Морські делікатеси» Hacendado",
  "Ensaladilla rusa Hacendado": "Салат олів'є Hacendado",
  "Patatas con allioli Hacendado": "Картопля з айолі Hacendado",

  // ── Fideos orientales
  "Fideos orientales sabor pollo Hacendado": "Східна локшина зі смаком курки Hacendado",

  // ── Flan
  "Flan de café Hacendado": "Кавовий флан Hacendado",
  "Flan de huevo +Proteínas 10 g 0% MG 0% azúcares añadidos": "Яєчний флан +Протеїн 10 г, 0% жирності, без доданого цукру",
  "Flan de huevo Hacendado": "Яєчний флан Hacendado",
  "Flan de huevo sin azúcares añadidos Hacendado": "Яєчний флан без доданого цукру Hacendado",
  "Flan de queso Hacendado": "Сирний флан Hacendado",
  "Flan de vainilla con caramelo Hacendado": "Ванільний флан з карамеллю Hacendado",

  // ── Fruta + leche
  "Fruta + leche caribe Don Simón sin azúcares añadidos y zero materia grasa": "Фрукти + молоко «Карибі» Don Simón без доданого цукру та жиру",
  "Fruta + leche caribe Hacendado sin azúcares añadidos": "Фрукти + молоко «Карибі» Hacendado без доданого цукру",
  "Fruta + leche mediterráneo Hacendado sin azúcares añadidos": "Фрукти + молоко «Середземномор'я» Hacendado без доданого цукру",
  "Fruta + leche piña y coco Hacendado sin azúcares añadidos": "Фрукти + молоко ананас і кокос Hacendado без доданого цукру",
  "Fruta + leche tropical Bifrutas": "Фрукти + молоко тропічні Bifrutas",
  "Fruta + leche tropical Hacendado sin azúcares añadidos": "Фрукти + молоко тропічні Hacendado без доданого цукру",

  // ── Fruta desecada
  "Arándanos deshidratados Hacendado": "Сушена журавлина Hacendado",
  "Ciruelas desecadas sin hueso Hacendado": "Чорнослив без кісточок Hacendado",
  "Dátiles desecados sin hueso Hacendado": "Сушені фініки без кісточок Hacendado",
  "Dátiles en rama Hacendado": "Фініки на гілці Hacendado",
  "Dátiles Medjoul con hueso Hacendado": "Фініки меджул з кісточкою Hacendado",
  "Orejones albaricoque Hacendado": "Курага Hacendado",
  "Pasas moscatel sin semillas Hacendado": "Родзинки мускатні без кісточок Hacendado",
  "Pasas sultanas sin semillas Hacendado": "Родзинки султана без кісточок Hacendado",
  "Piña deshidratada Hacendado": "Сушений ананас Hacendado",

  // ── Fruta tropical
  "Kiwis amarillos": "Жовті ківі",
  "Piña": "Ананас",
  "Piña natural a rodajas": "Ананас натуральний кільцями",

  // ── Fruta variada y otros sabores
  "Bebida 5 frutas Hacendado sin azúcares añadidos": "Напій «5 фруктів» Hacendado без доданого цукру",
  "Bebida Bahamas Hacendado": "Напій «Багами» Hacendado",
  "Bebida de arándanos y frutas rojas Hacendado sin azúcares añadidos": "Напій з журавлини та червоних ягід Hacendado без доданого цукру",
  "Bebida de frutas rojas antioxidante Hacendado sin azúcares añadidos": "Антиоксидантний напій з червоних ягід Hacendado без доданого цукру",
  "Bebida de zumo de naranja, mango y zanahoria La Verja sin azúcares añadidos": "Напій з апельсинового соку, манго та моркви La Verja без доданого цукру",
  "Bebida multivitaminas Hacendado sin azúcares añadidos": "Мультивітамінний напій Hacendado без доданого цукру",
  "Bebida tropical Hacendado sin azúcares añadidos": "Тропічний напій Hacendado без доданого цукру",

  // ── Frutos secos
  "Almendra frita y salada Hacendado pelada": "Смажений солоний мигдаль Hacendado очищений",
  "Almendra marcona Hacendado frita con sal": "Мигдаль маркона Hacendado смажений із сіллю",
  "Almendra natural Hacendado": "Натуральний мигдаль Hacendado",
  "Almendra tostada Hacendado 0% sal añadida con piel": "Смажений мигдаль Hacendado без доданої солі, у шкірці",
  "Almendra tostada y salada Hacendado con piel": "Смажений солоний мигдаль Hacendado у шкірці",
  "Anacardo frito salado Hacendado": "Смажений солоний кеш'ю Hacendado",
  "Anacardo natural Hacendado": "Натуральний кеш'ю Hacendado",
  "Avellana tostada Hacendado 0% sal añadida": "Смажений фундук Hacendado без доданої солі",
  "Cacahuete en polvo desgrasado +Proteínas 14 g 70% reducido en grasa": "Знежирений арахісовий порошок +Протеїн 14 г, на 70% менше жиру",
  "Cacahuete frito con miel Hacendado": "Смажений арахіс з медом Hacendado",
  "Cacahuete frito con sal Hacendado pelado": "Смажений арахіс із сіллю Hacendado очищений",
  "Cacahuete frito y salado Hacendado con piel": "Смажений солоний арахіс Hacendado у шкірці",
  "Cacahuete tostado con sal Hacendado": "Обсмажений арахіс із сіллю Hacendado",
  "Cacahuete tostado Hacendado 0% sal añadida": "Обсмажений арахіс Hacendado без доданої солі",
  "Cacahuete tostado Hacendado 0% sal añadida pelado": "Обсмажений арахіс Hacendado без доданої солі, очищений",
  "Castañas cocidas y peladas Hacendado": "Варені очищені каштани Hacendado",
  "Maíz frito crujiente y tierno Hacendado": "Смажена кукурудза хрустка й ніжна Hacendado",
  "Maíz frito gigante Hacendado": "Смажена кукурудза гігант Hacendado",
  "Mezcla semillas Hacendado": "Суміш насіння Hacendado",
  "Nuez de Brasil natural Hacendado": "Натуральний бразильський горіх Hacendado",
  "Nuez natural Hacendado": "Натуральний волоський горіх Hacendado",
  "Nuez natural Hacendado pelada": "Натуральний волоський горіх Hacendado очищений",
  "Nuez Pecana natural Hacendado pelada": "Натуральний горіх пекан Hacendado очищений",
  "Nuez troceada pelada Hacendado": "Подрібнений очищений волоський горіх Hacendado",
  "Palomitas de maíz con sal Hacendado para microondas": "Попкорн із сіллю Hacendado для мікрохвильовки",
  "Palomitas de maíz sabor mantequilla Hacendado para microondas": "Попкорн зі смаком вершкового масла Hacendado для мікрохвильовки",
  "Pipas calabaza tostadas Hacendado aguasal": "Обсмажене гарбузове насіння Hacendado в солоній воді",
  "Pipas de calabaza natural Hacendado peladas": "Натуральне гарбузове насіння Hacendado очищене",
  "Pipas de girasol fritas Hacendado peladas": "Смажене соняшникове насіння Hacendado очищене",
  "Pipas girasol barbacoa Hacendado": "Соняшникове насіння барбекю Hacendado",
  "Pipas girasol naturales Hacendado peladas": "Натуральне соняшникове насіння Hacendado очищене",
  "Pipas girasol tostadas Hacendado 0% sal añadida": "Обсмажене соняшникове насіння Hacendado без доданої солі",
  "Pipas girasol tostadas Hacendado gigante aguasal": "Обсмажене соняшникове насіння Hacendado гігант у солоній воді",
  "Pipas girasol tostadas Hacendado gigante con sal": "Обсмажене соняшникове насіння Hacendado гігант із сіллю",
  "Pistacho natural Hacendado pelado": "Натуральні фісташки Hacendado очищені",
  "Pistacho tostado Hacendado 0% sal añadida": "Обсмажені фісташки Hacendado без доданої солі",
  "Pistacho tostado Hacendado con sal": "Обсмажені фісташки Hacendado із сіллю",
  "Semillas de chía Hacendado": "Насіння чіа Hacendado",
  "Semillas lino dorado Hacendado": "Золотисте насіння льону Hacendado",
  "Semillas sésamo tostado Hacendado": "Обсмажене насіння кунжуту Hacendado",

  // ── Galletas desayuno
  "Galletas canela Hacendado": "Печиво з корицею Hacendado",
  "Galletas caramelizadas Lotus Biscoff": "Карамелізоване печиво Lotus Biscoff",
  "Galletas de mantequilla Hacendado Belgas": "Бельгійське печиво на вершковому маслі Hacendado",
  "Galletas Divertidas con cereales Hacendado": "Печиво Divertidas зі злаками Hacendado",
  "Galletas María dorada Hacendado": "Печиво «Марія» золотисте Hacendado",
  "Galletas María dorada Hacendado 0% azúcares añadidos": "Печиво «Марія» золотисте Hacendado без доданого цукру",
  "Galletas María Hacendado": "Печиво «Марія» Hacendado",
  "Galletas María sin gluten y sin lactosa Hacendado": "Печиво «Марія» без глютену та без лактози Hacendado",
  "Galletas Relieve Hacendado": "Печиво Relieve Hacendado",
  "Galletas tostadas Animadas Hacendado": "Підрум'яне печиво Animadas Hacendado",
  "Galletas tostadas Hacendado": "Підрум'яне печиво Hacendado",
  "Galletas tostadas Tosta Rica": "Підрум'яне печиво Tosta Rica",
  "Galletas tradicionales Hacendado": "Традиційне печиво Hacendado",
  "Pastas de aceite Hacendado": "Печиво на олії Hacendado",

  // ── Galletas integrales y digestive
  "Galletas avena Hacendado": "Вівсяне печиво Hacendado",
  "Galletas de espelta Hacendado 0% azúcares añadidos": "Печиво зі спельти Hacendado без доданого цукру",
  "Galletas Digestive 0% azúcares añadidos Hacendado": "Печиво Digestive без доданого цукру Hacendado",
  "Galletas Digestive Hacendado": "Печиво Digestive Hacendado",
  "Galletas Digestive manzana & avena Hacendado": "Печиво Digestive яблуко та овес Hacendado",
  "Galletas María Integral Hacendado": "Цільнозернове печиво «Марія» Hacendado",

  // ── Galletas surtidas
  "Obleas para helado Hacendado": "Вафлі для морозива Hacendado",
  "Surtido de galletas y barquillos Hacendado": "Асорті печива та вафель Hacendado",
  "Surtido de pastas artesanas Hacendado": "Асорті домашнього печива Hacendado",

  // ── Garbanzos
  "Garbanzo cocido Hacendado": "Варений нут Hacendado",
  "Garbanzo cocido Pedrosillano Hacendado": "Варений нут педросильяно Hacendado",

  // ── Gaseosa
  "Gaseosa pequeña Hacendado": "Газованка маленька Hacendado",

  // ── Gazpacho y salmorejo
  "Gazpacho fresco Hacendado": "Свіже гаспачо Hacendado",
  "Gazpacho tradicional Hacendado": "Традиційне гаспачо Hacendado",
  "Salmorejo al estilo cordobés Hacendado": "Сальморехо по-кордовськи Hacendado",
  "Salmorejo fresco Hacendado": "Свіже сальморехо Hacendado",

  // ── Gelatina
  "Gelatina 0% azúcar sabor cereza, cola y sandía Hacendado": "Желе 0% цукру зі смаком вишні, коли та кавуна Hacendado",
  "Gelatina sabor a frutos silvestres +Proteínas 10 g 0% azúcar": "Желе зі смаком лісових ягід +Протеїн 10 г, 0% цукру",
  "Gelatina sabor fresa Hacendado": "Желе зі смаком полуниці Hacendado",

  // ── Huevos
  "Claras de huevo líquidas pasteurizadas": "Рідкі пастеризовані яєчні білки",
  "Huevos": "Яйця",
  "Huevos cocidos": "Варені яйця",
  "Huevos de codorniz": "Перепелині яйця",
  "Huevos de gallinas camperas": "Яйця курей вільного вигулу",
  "Huevos grandes L": "Великі яйця L",
  "Huevos medianos M": "Середні яйця M",
  "Huevos super grandes XL": "Дуже великі яйця XL",

  // ── Hummus y otros
  "Hummus de garbanzos Hacendado con pimiento del piquillo asado": "Хумус з нуту Hacendado з печеним перцем пікільо",
  "Hummus de garbanzos Hacendado receta clásica": "Хумус з нуту Hacendado класичний рецепт",
  "Pastel de atún Hacendado": "Паштет з тунця Hacendado",
  "Tabulé oriental Hacendado": "Східний табуле Hacendado",
  "Tofu firme Hacendado": "Твердий тофу Hacendado",
  "Tsatsiki Hacendado": "Цацики Hacendado",

  // ── Infusiones
  "Infusión fría Hacendado con sabor a piña y coco": "Холодний трав'яний чай Hacendado зі смаком ананаса та кокоса",
  "Infusión Laxsen sabor menta Hacendado": "Трав'яний чай Laxsen зі смаком м'яти Hacendado",
  "Infusión manzana y canela Hacendado": "Трав'яний чай яблуко та кориця Hacendado",
  "Infusión Manzanilla sabor a miel Hacendado": "Ромашковий чай зі смаком меду Hacendado",
  "Infusión Menta Poleo Hacendado": "Трав'яний чай м'ята болотна Hacendado",
  "Infusión quema grasas Hacendado": "Жироспалювальний трав'яний чай Hacendado",
  "Infusión Respir Hacendado": "Трав'яний чай Respir Hacendado",
  "Infusión Tomillo Hacendado": "Чай з чебрецем Hacendado",

  // ── Isotónico
  "Bebida isotónica de naranja Iso drink": "Ізотонік апельсиновий Iso drink",
  "Bebida isotónica Iso On blue Hacendado": "Ізотонік Iso On blue Hacendado",
  "Bebida isotónica naranja Aquarius": "Ізотонік апельсиновий Aquarius",
  "Bebida isotónica sabor cítrico Iso drink": "Ізотонік зі смаком цитрусів Iso drink",
  "Bebida isotónica Zero sabor cítrico Iso drink": "Ізотонік Zero зі смаком цитрусів Iso drink",

  // ── Jamón cocido
  "Jamón cocido braseado Noel lonchas": "Тушкована варена шинка Noel скибочки",
  "Jamón cocido extra 50% raza ibérica Noel lonchas": "Варена шинка екстра 50% іберійської породи Noel скибочки",
  "Jamón cocido extra cortado a mano Noel": "Варена шинка екстра ручної нарізки Noel",
  "Jamón cocido extra Hacendado finas lonchas": "Варена шинка екстра Hacendado тонкі скибочки",
  "Jamón cocido extra Noel lonchas": "Варена шинка екстра Noel скибочки",
  "Jamón cocido extrafino Hacendado lonchas": "Варена шинка екстрафайн Hacendado скибочки",
  "Jamón cocido Hacendado finas lonchas": "Варена шинка Hacendado тонкі скибочки",
  "Jamón cocido Hacendado lonchas": "Варена шинка Hacendado скибочки",
  "Jamón cocido sándwich Hacendado lonchas": "Варена шинка для сендвічів Hacendado скибочки",
  "Lacón al horno Noel lonchas": "Запечена свиняча лопатка лакон Noel скибочки",
  "Magro de cerdo cocido Coren": "Варена пісна свинина Coren",
  "Maxi york Hacendado": "Шинка «Максі Йорк» Hacendado",
  "Maxi york Hacendado finas lonchas": "Шинка «Максі Йорк» Hacendado тонкі скибочки",
  "Pechuga de pollo 92% Hacendado lonchas": "Куряча грудка 92% Hacendado скибочки",

  // ── Jamón serrano
  "Jamón de bellota ibérico 100% cortado a tapas": "Хамон із жолудевої іберійської свинини 100% нарізка для тапас",
  "Jamón de bellota ibérico 100% Covap": "Хамон із жолудевої іберійської свинини 100% Covap",
  "Jamón de bellota ibérico cortado a tapas": "Хамон із жолудевої іберійської свинини нарізка для тапас",
  "Jamón de cebo ibérico 50% La Hacienda del Ibérico": "Іберійський хамон себо 50% La Hacienda del Ibérico",
  "Jamón de cebo ibérico 50% raza ibérica La Hacienda del Ibérico lonchas": "Іберійський хамон себо 50% іберійської породи La Hacienda del Ibérico скибочки",
  "Jamón de cebo ibérico cortado a tapas": "Іберійський хамон себо нарізка для тапас",
  "Jamón de Teruel D.O.P El Cierzo lonchas": "Хамон з Теруеля D.O.P El Cierzo скибочки",
  "Jamón de Trevélez Antonio Álvarez lonchas extra finas": "Хамон з Тревелеса Antonio Álvarez дуже тонкі скибочки",
  "Jamón serrano cortado a máquina": "Хамон серрано машинної нарізки",
  "Jamón serrano gran reserva Hacendado sin aditivos lonchas": "Хамон серрано гран резерва Hacendado без добавок скибочки",
  "Jamón serrano Incarlopsa": "Хамон серрано Incarlopsa",
  "Jamón serrano Incarlopsa lonchas": "Хамон серрано Incarlopsa скибочки",
  "Jamón serrano Incarlopsa lonchas extrafinas": "Хамон серрано Incarlopsa дуже тонкі скибочки",
  "Jamón serrano Jamcal medias lonchas": "Хамон серрано Jamcal половинки скибочок",
  "Jamón serrano reserva cortado a tapas": "Хамон серрано резерва нарізка для тапас",
  "Paleta curada Paletas Marpa lonchas": "В'ялена лопатка Paletas Marpa скибочки",
  "Paleta de cebo ibérica 50% La Hacienda del Ibérico": "Іберійська лопатка себо 50% La Hacienda del Ibérico",
  "Paleta de cerdo curada Incarlopsa": "В'ялена свиняча лопатка Incarlopsa",
  "Taco jamón curado": "Шматок в'яленого хамона",
  "Taquitos de jamón Incarlopsa": "Кубики хамона Incarlopsa",

  // ── L-Casei
  "Bebida láctea de fresa L-casei": "Молочний напій з полуницею L-casei",
  "Bebida láctea natural Actimel": "Натуральний молочний напій Actimel",
  "Bebida láctea natural Actimel 0% MG 0% azúcares añadidos": "Натуральний молочний напій Actimel 0% жирності, без доданого цукру",

  // ── Lasaña y canelones
  "Placas para lasaña precocidas El Pavo": "Листи для лазаньї швидкого приготування El Pavo",

  // ── Leche condensada y otros
  "Leche condensada desnatada Hacendado": "Знежирене згущене молоко Hacendado",
  "Leche condensada Hacendado": "Згущене молоко Hacendado",

  // ── Leche desnatada
  "Bebida láctea desnatada omega 3 Hacendado": "Знежирений молочний напій з омега-3 Hacendado",
  "Bebida láctea Omega 3 Puleva con leche desnatada": "Молочний напій Omega 3 Puleva зі знежиреним молоком",
  "Bebida láctea Omega 3 Puleva con nueces y leche desnatada": "Молочний напій Omega 3 Puleva з горіхами та знежиреним молоком",
  "Leche desnatada +Proteínas & calcio": "Знежирене молоко +Протеїн і кальцій",
  "Leche desnatada Asturiana": "Знежирене молоко Asturiana",
  "Leche desnatada calcio Hacendado": "Знежирене молоко з кальцієм Hacendado",
  "Leche desnatada Hacendado": "Знежирене молоко Hacendado",
  "Leche desnatada sin lactosa Hacendado": "Знежирене молоко без лактози Hacendado",
  "Leche en polvo desnatada Hacendado": "Сухе знежирене молоко Hacendado",

  // ── Leche entera
  "Leche entera Asturiana": "Цільне молоко Asturiana",
  "Leche entera Hacendado": "Цільне молоко Hacendado",
  "Leche entera sin lactosa Hacendado": "Цільне молоко без лактози Hacendado",

  // ── Leche semidesnatada
  "Bebida láctea semidesnatada con fibra Hacendado": "Напівзнежирений молочний напій з клітковиною Hacendado",
  "Leche semidesnatada Asturiana": "Напівзнежирене молоко Asturiana",
  "Leche semidesnatada calcio Hacendado": "Напівзнежирене молоко з кальцієм Hacendado",
  "Leche semidesnatada de cabra Hacendado": "Напівзнежирене козяче молоко Hacendado",
  "Leche semidesnatada Hacendado": "Напівзнежирене молоко Hacendado",
  "Leche semidesnatada sin lactosa Hacendado": "Напівзнежирене молоко без лактози Hacendado",

  // ── Lechuga
  "Canónigos lavados": "Митий салат корн",
  "Ensalada mezcla brotes tiernos lavada": "Митий салатний мікс з молодого листя",
  "Ensalada mezcla brotes tiernos maxi lavada": "Митий салатний мікс з молодого листя максі",
  "Ensalada mezcla dúo canónigos y rúcula lavada": "Митий салатний мікс дует: корн і рукола",
  "Ensalada mezcla gourmet lavada": "Митий салатний мікс гурме",
  "Ensalada mezcla gourmet maxi lavada": "Митий салатний мікс гурме максі",
  "Ensalada mezcla tierna lavada": "Митий ніжний салатний мікс",
  "Espinacas baby lavadas": "Митий молодий шпинат",
  "Lechuga corazón romana": "Серцевина салату ромен",
  "Lechuga hoja roble": "Салат дубовий лист",
  "Lechuga Iceberg": "Салат айсберг",
  "Lechuga romana cortada y lavada": "Нарізаний митий салат ромен",
  "Lechugas corazón romana": "Серцевини салату ромен",
  "Rúcula lavada": "Мита рукола",

  // ── Lentejas y otros
  "Lenteja cocida Hacendado": "Варена сочевиця Hacendado",

  // ── Lomo y otros
  "Cabecero de lomo Hacendado lonchas": "Свиняча шийка Hacendado скибочки",
  "Lomo de bellota ibérico 50% raza ibérica cortado a máquina": "В'ялена корейка з жолудевої свинини 50% іберійської породи, машинна нарізка",
  "Lomo de cebo ibérico 50% raza ibérica cortado a máquina": "В'ялена іберійська корейка себо 50% іберійської породи, машинна нарізка",
  "Lomo de pavo Hacendado lonchas": "Філе індички Hacendado скибочки",
  "Lomo embuchado Hacendado lonchas": "В'ялена корейка ломо ембучадо Hacendado скибочки",
  "Lomo Hacendado": "В'ялена корейка Hacendado",
  "Surtido de ibéricos La Hacienda del ibérico lonchas": "Асорті іберійських делікатесів La Hacienda del ibérico скибочки",

  // ── Mantequilla
  "Mantequilla con sal Hacendado": "Солоне вершкове масло Hacendado",
  "Mantequilla en porciones Hacendado sin sal añadida": "Порційне вершкове масло Hacendado без доданої солі",
  "Mantequilla light Hacendado": "Вершкове масло лайт Hacendado",
  "Mantequilla sin lactosa Hacendado": "Вершкове масло без лактози Hacendado",
  "Mantequilla sin sal añadida Hacendado": "Вершкове масло без доданої солі Hacendado",

  // ── Manzana y pera
  "Manzana Golden": "Яблуко голден",
  "Manzana Granny Smith": "Яблуко гренні сміт",
  "Manzanas Golden": "Яблука голден",
  "Pera Conferencia": "Груша конференція",
  "Peras Conferencia": "Груші конференція",

  // ── Margarina
  "Margarina 100% vegetal Hacendado": "Маргарин 100% рослинний Hacendado",
  "Margarina con sal Hacendado": "Солоний маргарин Hacendado",
  "Margarina Flora Original": "Маргарин Flora Original",
  "Margarina Flora Proactiv": "Маргарин Flora Proactiv",
  "Margarina Hacendado": "Маргарин Hacendado",
  "Margarina Tulipán Original": "Маргарин Tulipán Original",

  // ── Marisco
  "Gamba cocida": "Варені креветки",
  "Langostino cocido": "Варені лангустини",

  // ── Mejillones
  "Mejillones al natural Hacendado pequeños": "Мідії у власному соку Hacendado дрібні",
  "Mejillones de Chile en escabeche Hacendado pequeños": "Чилійські мідії в маринаді ескабече Hacendado дрібні",
  "Mejillones en escabeche Hacendado medianos": "Мідії в маринаді ескабече Hacendado середні",
  "Mejillones en escabeche Hacendado pequeños": "Мідії в маринаді ескабече Hacendado дрібні",
  "Mejillones en salsa de vieira Hacendado pequeños": "Мідії в соусі з гребінців Hacendado дрібні",
  "Mejillones picantes en escabeche Hacendado pequeños": "Гострі мідії в маринаді ескабече Hacendado дрібні",

  // ── Melocotón
  "Bebida de melocotón Hacendado sin azúcares añadidos": "Персиковий напій Hacendado без доданого цукру",

  // ── Melón y sandía
  "Medio melón piel de sapo": "Половина дині п'єль де сапо",
  "Melón piel de sapo": "Диня п'єль де сапо",

  // ── Mermelada
  "Mermelada de albaricoque Hacendado": "Абрикосовий джем Hacendado",
  "Mermelada de arándanos Hacendado": "Чорничний джем Hacendado",
  "Mermelada de ciruela y kiwi Hacendado": "Джем зі сливи та ківі Hacendado",
  "Mermelada de frambuesa Hacendado": "Малиновий джем Hacendado",
  "Mermelada de fresa Hacendado": "Полуничний джем Hacendado",
  "Mermelada de fresa monodosis Hacendado": "Полуничний джем порційний Hacendado",
  "Mermelada de higo Hacendado": "Інжирний джем Hacendado",
  "Mermelada de melocotón monodosis Hacendado": "Персиковий джем порційний Hacendado",
  "Mermelada de naranja amarga Hacendado": "Джем з гіркого апельсина Hacendado",
  "Mermelada de tomate Hacendado": "Томатний джем Hacendado",

  // ── Miel
  "Miel de flores Hacendado": "Квітковий мед Hacendado",
  "Miel de naranjo Hacendado": "Апельсиновий мед Hacendado",

  // ── Monodosis
  "Café monodosis natural Hacendado": "Кава в порційних капсулах натуральна Hacendado",

  // ── Mortadela
  "Galantina con pistacho y trufa Hacendado finas lonchas": "Галантин з фісташками та трюфелем Hacendado тонкі скибочки",
  "Mortadela con aceitunas Hacendado lonchas": "Мортаделла з оливками Hacendado скибочки",
  "Mortadela de pavo con aceitunas Hacendado finas lonchas": "Мортаделла з індички з оливками Hacendado тонкі скибочки",
  "Mortadela de pavo Hacendado finas lonchas": "Мортаделла з індички Hacendado тонкі скибочки",
  "Mortadela Hacendado": "Мортаделла Hacendado",
  "Mortadela Hacendado lonchas": "Мортаделла Hacendado скибочки",
  "Mortadela italiana Hacendado finas lonchas": "Італійська мортаделла Hacendado тонкі скибочки",

  // ── Naranja
  "Bebida de naranja Hacendado sin azúcares añadidos": "Апельсиновий напій Hacendado без доданого цукру",
  "Bebida Florida Hacendado": "Напій «Флорида» Hacendado",
  "Refresco Fanta naranja": "Газований напій Fanta апельсин",
  "Refresco Fanta naranja zero azúcares añadidos": "Газований напій Fanta апельсин без доданого цукру",
  "Zumo pura naranja con pulpa Hacendado": "100% апельсиновий сік з м'якоттю Hacendado",
  "Zumo pura naranja Hacendado": "100% апельсиновий сік Hacendado",

  // ── Nata
  "Crema de soja Hacendado": "Соєві вершки Hacendado",
  "Nata fresca para cocinar Hacendado": "Свіжі вершки для готування Hacendado",
  "Nata ligera para cocinar Hacendado": "Легкі вершки для готування Hacendado",
  "Nata ligera para cocinar sin lactosa Hacendado": "Легкі вершки для готування без лактози Hacendado",
  "Nata montada azucarada Hacendado": "Збиті солодкі вершки Hacendado",
  "Nata para montar Hacendado": "Вершки для збивання Hacendado",

  // ── Natillas
  "Natillas con chocolate +Proteínas 10 g 1,3 g MG": "Заварний крем із шоколадом +Протеїн 10 г, 1,3 г жиру",
  "Natillas de chocolate Danet": "Шоколадний заварний крем Danet",
  "Natillas de vainilla Danet": "Ванільний заварний крем Danet",
  "Natillas sabor vainilla +Proteínas 12 g": "Заварний крем зі смаком ванілі +Протеїн 12 г",
  "Natillas sabor vainilla con galleta Hacendado": "Заварний крем зі смаком ванілі з печивом Hacendado",
  "Natillas sabor vainilla Hacendado": "Заварний крем зі смаком ванілі Hacendado",

  // ── Otras conservas de pescado
  "Calamar en salsa americana Hacendado": "Кальмар в американському соусі Hacendado",
  "Calamar en tinta Hacendado": "Кальмар у власному чорнилі Hacendado",
  "Chipirones rellenos enteros en aceite de girasol Hacendado": "Фаршировані цілі кальмарчики в соняшниковій олії Hacendado",
  "Salmón al natural Hacendado": "Лосось у власному соку Hacendado",
  "Tacos de pota al ajillo Hacendado": "Шматочки кальмара пота з часником Hacendado",

  // ── Otras frutas
  "Arándanos": "Чорниця",
  "Ciruelas Claudia": "Сливи ренклод",
  "Fresas": "Полуниця",
  "Melocotón amarillo": "Жовтий персик",

  // ── Otros
  "Burgers vegetales Hacendado con calabaza": "Овочеві бургери Hacendado з гарбузом",
  "Cereales solubles con achicoria Hacendado": "Розчинний злаковий напій з цикорієм Hacendado",
  "Crema de leche para café Campina": "Вершки для кави Campina",
  "Empanados vegetales con proteína de soja Tivall": "Рослинні котлети в паніровці з соєвим білком Tivall",
  "Mini burgers vegetales Hacendado con espinacas y zanahoria": "Міні-бургери овочеві Hacendado зі шпинатом і морквою",
  "Patatas bravas con allioli y salsa picante Hacendado": "Картопля бравас з айолі та гострим соусом Hacendado",
  "Patatas fritas con carne kebab y salsa Hacendado": "Картопля фрі з м'ясом кебаб і соусом Hacendado",
  "Sándwiches jamón y queso Hacendado": "Сендвічі з шинкою та сиром Hacendado",
  "Seitán Soria Natural lonchas": "Сейтан Soria Natural скибочки",

  // ── Otros panes
  "Barra de pan tradicional": "Традиційний батон хліба",
  "Hogaza sin gluten": "Коровай без глютену",
  "Media Hogaza integral de avena, semillas de girasol y sésamo Hacendado rebanado": "Половина цільнозернового короваю з вівсом, насінням соняшнику та кунжуту Hacendado нарізаний",
  "Pan 5 semillas": "Хліб «5 насінин»",
  "Pan Brioche Hacendado": "Бріош Hacendado",
  "Pan de molde 12 cereales y semillas Hacendado": "Тостовий хліб 12 злаків і насіння Hacendado",
  "Pan de molde 15% maíz Hacendado": "Тостовий хліб 15% кукурудзи Hacendado",
  "Pan de molde con 35% avena Hacendado 0% azúcares añadidos con harina 100% integral": "Тостовий хліб 35% вівса Hacendado без доданого цукру, зі 100% цільнозернового борошна",
  "Pan de molde con 55% centeno Hacendado": "Тостовий хліб 55% жита Hacendado",
  "Pan de molde espelta 100% integral Hacendado natural": "Тостовий хліб зі спельти 100% цільнозерновий Hacendado натуральний",
  "Pan de molde semillas y pipas de calabaza Hacendado": "Тостовий хліб з насінням і гарбузовим насінням Hacendado",
  "Pan redondo sin gluten Hacendado": "Круглий хліб без глютену Hacendado",

  // ── Otros postres
  "Arroz con leche Hacendado": "Рисовий пудинг на молоці Hacendado",
  "Cheesecake con arándanos Hacendado": "Чизкейк з чорницею Hacendado",
  "Copa crema de chocolate y nata Hacendado": "Десерт із шоколадним кремом і вершками Hacendado",
  "Coulant de chocolate Hacendado": "Шоколадний фондан Hacendado",
  "Crema catalana Hacendado": "Каталонський крем Hacendado",
  "Cuajada Hacendado": "Кисле молоко кахада Hacendado",
  "Mousse de chocolate Hacendado": "Шоколадний мус Hacendado",
  "Mousse sabor chocolate +Proteínas 10 g": "Мус зі смаком шоколаду +Протеїн 10 г",
  "Panna Cotta con caramelo Hacendado": "Панна-котта з карамеллю Hacendado",
  "Pudding sabor caramelo +Proteínas 12 g": "Пудинг зі смаком карамелі +Протеїн 12 г",
  "Tarta de queso Hacendado": "Сирний торт Hacendado",
  "Tiramisú Hacendado": "Тірамісу Hacendado",
  "Yogur azucarado YogoMix Bolitas Hacendado con bolitas chocolateadas": "Солодкий йогурт YogoMix Bolitas Hacendado з шоколадними кульками",
  "Yogur azucarado YogoMix Discos Hacendado con disquitos chocolateados": "Солодкий йогурт YogoMix Discos Hacendado з шоколадними дисками",
  "Yogur azucarado YogoMix Hacendado variado de copos maíz, bolitas y disquitos chocolateados": "Солодкий йогурт YogoMix Hacendado з асорті кукурудзяних пластівців, шоколадних кульок і дисків",

  // ── Otros refrescos sin gas
  "Bebida Florida Sunny Delight": "Напій «Флорида» Sunny Delight",
  "Refresco sin gas cero fusión de frutas Hacendado": "Негазований напій без цукру фруктовий мікс Hacendado",
  "Refresco sin gas cero piña-coco Hacendado": "Негазований напій без цукру ананас-кокос Hacendado",
  "Refresco sin gas de naranja Hacendado": "Негазований апельсиновий напій Hacendado",
  "Refresco sin gas de naranja Simon Life": "Негазований апельсиновий напій Simon Life",
  "Refresco sin gas Tropical Hacendado": "Негазований напій «Тропік» Hacendado",

  // ── Otros sabores
  "Bebida de pomelo Hacendado sin azúcares añadidos": "Грейпфрутовий напій Hacendado без доданого цукру",
  "Néctar de guayaba Hacendado": "Нектар гуави Hacendado",
  "Néctar de maracuyá Hacendado fruta de la pasión, mango, uva y manzana": "Нектар маракуї Hacendado: маракуя, манго, виноград і яблуко",
  "Zumo de manzana Hacendado": "Яблучний сік Hacendado",
  "Zumo de tomate Hacendado": "Томатний сік Hacendado",

  // ── Pan de bocadillo
  "11 Panecillos": "11 булочок",
  "3 Bocadillos": "3 батони для бутербродів",
  "5 Barras de pan 51% integral": "5 батонів хліба 51% цільнозернові",
  "6 Panecillos integrales 100%": "6 цільнозернових булочок 100%",
  "6 Panes de centeno 51%": "6 житніх хлібців 51%",
  "6 Panes de leche 3%": "6 молочних булочок 3%",
  "Pan mini semillas": "Міні-хліб із насінням",
  "Pan Viena": "Віденський хліб",
  "Panecillo de trigo integral 30%": "Булочка з цільної пшениці 30%",
  "Panecillo harina integral 50% de trigo sin sal añadida": "Булочка з 50% цільнозернового пшеничного борошна без доданої солі",
  "Panecillo sin sal añadida": "Булочка без доданої солі",
  "Panes chapata de cristal": "Хрустка чіабата «кристал»",
  "Panes con semillas": "Булочки з насінням",
  "Panes de cristal redondos cortados 100 % natural": "Круглі хрусткі булочки «кристал» нарізані, 100% натуральні",
  "Panes integrales 100% fino": "Тонкі цільнозернові булочки 100%",

  // ── Pan de hamburguesa y wrap
  "Maxi pan de burger Hacendado": "Максі-булочки для бургерів Hacendado",
  "Maxi tortillas de trigo Hacendado": "Максі-коржі пшеничні тортильї Hacendado",
  "Mini pan de burger Hacendado": "Міні-булочки для бургерів Hacendado",
  "Mini tortillas de trigo Hacendado": "Міні-коржі пшеничні тортильї Hacendado",
  "Pan de burger Brioche Hacendado": "Булочки для бургерів бріош Hacendado",
  "Pan de pita Mission": "Піта Mission",
  "Pan hot dog Hacendado": "Булочки для хот-догів Hacendado",
  "Piadina Hacendado": "П'ядина Hacendado",
  "Tortillas de avena 51% Hacendado": "Тортильї з вівсом 51% Hacendado",
  "Tortillas de maíz Hacendado": "Кукурудзяні тортильї Hacendado",
  "Tortillas de trigo Hacendado": "Пшеничні тортильї Hacendado",
  "Tortillas de trigo integrales Hacendado": "Цільнозернові пшеничні тортильї Hacendado",

  // ── Pan de molde
  "Pan de molde 100% integral familiar Hacendado": "Тостовий хліб 100% цільнозерновий сімейний Hacendado",
  "Pan de molde 100% integral Hacendado": "Тостовий хліб 100% цільнозерновий Hacendado",
  "Pan de molde 100% integral sin corteza Hacendado": "Тостовий хліб 100% цільнозерновий без скоринки Hacendado",
  "Pan de molde blanco familiar Hacendado": "Білий тостовий хліб сімейний Hacendado",
  "Pan de molde blanco Hacendado": "Білий тостовий хліб Hacendado",
  "Pan de molde blanco natural rústico Hacendado": "Білий тостовий хліб натуральний сільський Hacendado",
  "Pan de molde blanco rebanada gruesa Hacendado": "Білий тостовий хліб товстими скибками Hacendado",
  "Pan de molde blanco sin corteza Hacendado": "Білий тостовий хліб без скоринки Hacendado",
  "Pan de molde cereales sin gluten Hacendado": "Тостовий хліб зі злаками без глютену Hacendado",
  "Pan de molde sin gluten blanco Hacendado": "Білий тостовий хліб без глютену Hacendado",

  // ── Pan rallado
  "Pan rallado casero Hacendado": "Домашні панірувальні сухарі Hacendado",
  "Pan rallado de arroz Hacendado": "Рисові панірувальні сухарі Hacendado",
  "Pan rallado Hacendado": "Панірувальні сухарі Hacendado",
  "Preparado crujiente Hacendado": "Хрустка паніровка Hacendado",

  // ── Pan rebanado
  "3 Barras de pan aceite de oliva rebanadas": "3 батони на оливковій олії нарізані",
  "3 Barras de pan rebanadas": "3 батони хліба нарізані",
  "Barra de pan espiga rebanado": "Батон «колосок» нарізаний",
  "Barra de pan rebanada": "Батон хліба нарізаний",
  "Barra pan de aceite de oliva rebanada": "Батон на оливковій олії нарізаний",
  "Barra pan integral de espelta 100% rebanado": "Батон з цільнозернової спельти 100% нарізаний",
  "Hogaza de centeno 50% rebanado": "Житній коровай 50% нарізаний",
  "Pan campeón del mundo rebanado": "Хліб «Чемпіон світу» нарізаний",
  "Pan integral de trigo 100% rebanado": "Цільнозерновий пшеничний хліб 100% нарізаний",

  // ── Pan tostado
  "Mini biscotes de trigo Hacendado": "Міні-сухарики пшеничні Hacendado",
  "Mini tostadas de trigo Hacendado extra finas": "Міні-тости пшеничні Hacendado дуже тонкі",
  "Pan tostado 100% espelta integral Hacendado": "Хрусткі тости зі 100% цільнозернової спельти Hacendado",
  "Pan tostado 100% integral": "Хрусткі тости 100% цільнозернові",
  "Pan tostado 100% integral bajo en sal y en azúcares Hacendado": "Хрусткі тости 100% цільнозернові з низьким вмістом солі та цукру Hacendado",
  "Pan tostado cereales y semillas Hacendado": "Хрусткі тости зі злаками та насінням Hacendado",
  "Pan tostado classic Hacendado": "Хрусткі тости classic Hacendado",
  "Pan tostado pasas Hacendado": "Хрусткі тости з родзинками Hacendado",
  "Panecillo tostado 100% integral de trigo Hacendado": "Хрусткі булочки 100% з цільної пшениці Hacendado",
  "Panecillo tostado classic Hacendado": "Хрусткі булочки classic Hacendado",
  "Panecillos tostados cereales y semillas Hacendado": "Хрусткі булочки зі злаками та насінням Hacendado",
  "Tortas cenceñas para gazpacho manchego Ruiz": "Прісні коржі для гаспачо по-ламанчськи Ruiz",

  // ── Pasta
  "Canelones de carne Hacendado": "Канелоні з м'ясом Hacendado",
  "Lasaña boloñesa familiar Hacendado": "Лазанья болоньєзе сімейна Hacendado",
  "Lasaña boloñesa Hacendado": "Лазанья болоньєзе Hacendado",
  "Lasaña de espinacas y requesón Hacendado": "Лазанья зі шпинатом і сиром Hacendado",
  "Lasaña de pollo Hacendado": "Лазанья з куркою Hacendado",
  "Macarrones Mac & Cheese Bacon Hacendado gratinados": "Макарони Mac & Cheese Bacon Hacendado запечені",
  "Pasta tiburón Mac & Cheese Hacendado con salsa de queso": "Паста «акули» Mac & Cheese Hacendado з сирним соусом",
  "Spaghetti carbonara Hacendado": "Спагеті карбонара Hacendado",

  // ── Pastelitos surtidos
  "Bizcocho con baño de cacao Hacendado": "Бісквіт у какао-глазурі Hacendado",
  "Coquito": "Кокосове печиво кокіто",
  "Espiral al cacao Hacendado": "Спіраль з какао Hacendado",
  "Hojaldre cabello de Ángel Hacendado": "Листкова з гарбузовим джемом «волосся ангела» Hacendado",
  "Hojaldre relleno de crema de cacao Hacendado": "Листкова з какао-кремом Hacendado",
  "Pasta de almendra Hacendado": "Мигдальне тістечко Hacendado",
  "Rollo con sabor avellana Hacendado": "Рулет зі смаком фундука Hacendado",
  "Rosquilla al cacao Hacendado": "Пончик-кільце з какао Hacendado",

  // ── Patatas fritas
  "Aperitivo de patata con sabor a nata agria y cebolla": "Картопляні чипси зі смаком сметани та цибулі",
  "Aperitivo de patata sabor barbacoa Hacendado": "Картопляні чипси зі смаком барбекю Hacendado",
  "Aperitivo de patata sabor crema agria y cebolla Pringles": "Картопляні чипси зі смаком сметани та цибулі Pringles",
  "Aperitivo de patata sabor original Pringles": "Картопляні чипси оригінальні Pringles",
  "Patatas fritas 0% sal añadida Hacendado": "Чипси без доданої солі Hacendado",
  "Patatas fritas clásicas Hacendado": "Класичні чипси Hacendado",
  "Patatas fritas corte ondulado Hacendado": "Рифлені чипси Hacendado",
  "Patatas fritas extra crujientes Hacendado": "Дуже хрусткі чипси Hacendado",
  "Patatas fritas onduladas sabor jamón serrano Hacendado": "Рифлені чипси зі смаком хамона серрано Hacendado",
  "Patatas fritas onduladas sabor queso de cabra y cebolla caramelizada Hacendado": "Рифлені чипси зі смаком козячого сиру та карамелізованої цибулі Hacendado",
  "Patatas fritas sabor sal y vinagre Hacendado": "Чипси зі смаком солі та оцту Hacendado",
  "Patatas light Hacendado": "Чипси лайт Hacendado",

  // ── Paté
  "Bloc foie gras de pato Hacendado": "Блок качиного фуа-гра Hacendado",
  "Foie gras entero de pato Hacendado": "Ціле качине фуа-гра Hacendado",
  "Mousse de pato Hacendado": "Качиний мус Hacendado",
  "Paté de cerdo con finas hierbas Hacendado": "Свинячий паштет з травами Hacendado",
  "Paté de cerdo con pimienta Hacendado": "Свинячий паштет з перцем Hacendado",
  "Paté de cerdo con pimienta verde Hacendado": "Свинячий паштет із зеленим перцем Hacendado",
  "Paté de cerdo La Piara tapa negra": "Свинячий паштет La Piara чорна кришка",
  "Paté de cerdo sabor suave Hacendado": "Свинячий паштет м'який смак Hacendado",
  "Paté de cerdo y pollo con trufa y arándanos Hacendado": "Паштет зі свинини та курки з трюфелем і журавлиною Hacendado",
  "Paté de hígado de cerdo ibérico Hacendado": "Паштет з печінки іберійської свині Hacendado",
  "Paté de hígado de cerdo sabor intenso Hacendado": "Паштет зі свинячої печінки насичений смак Hacendado",
  "Paté de jamón Hacendado": "Шинковий паштет Hacendado",
  "Paté de lomo de atún Hacendado": "Паштет з філе тунця Hacendado",
  "Paté de pollo asado Hacendado": "Паштет із запеченої курки Hacendado",
  "Paté de salmón Hacendado": "Паштет з лосося Hacendado",

  // ── Pavo y otros
  "Cabeza de cerdo Hacendado finas lonchas": "Свиняча голова (зельц) Hacendado тонкі скибочки",
  "Jamón de pavo Hacendado": "Шинка з індички Hacendado",
  "Jamón de pavo Hacendado finas lonchas": "Шинка з індички Hacendado тонкі скибочки",
  "Lomo asado La Carloteña lonchas": "Запечена корейка La Carloteña скибочки",
  "Longaniza de pavo extra Hacendado lonchas": "Ковбаса лонганіса з індички екстра Hacendado скибочки",
  "Mini muslo de pollo 98% La Carloteña asado al horno": "Міні-гомілка куряча 98% La Carloteña запечена в духовці",
  "Muslito de pollo 97% La Carloteña asado al horno lonchas": "Куряча гомілка 97% La Carloteña запечена в духовці скибочки",
  "Pechuga 92% pavo Hacendado lonchas": "Грудка індички 92% Hacendado скибочки",
  "Pechuga de pavo al horno de leña Campofrío lonchas": "Грудка індички, запечена на дровах Campofrío скибочки",
  "Pechuga de pavo Hacendado finas lonchas": "Грудка індички Hacendado тонкі скибочки",
  "Pechuga de pavo Noel lonchas muy finas": "Грудка індички Noel дуже тонкі скибочки",
  "Pechuga de pavo reducido en sal Hacendado finas lonchas": "Грудка індички зі зниженим вмістом солі Hacendado тонкі скибочки",
  "Pechuga de pollo braseada extrafino Hacendado lonchas": "Тушкована куряча грудка екстрафайн Hacendado скибочки",
  "Pechuga pavo cocida extrafino Hacendado lonchas": "Варена грудка індички екстрафайн Hacendado скибочки",
  "Pechuguita de pollo 99% La Carloteña asada al horno lonchas": "Куряча грудка 99% La Carloteña запечена в духовці скибочки",
  "Salchichón de pavo extra Hacendado lonchas": "Сальчічон з індички екстра Hacendado скибочки",
  "Sticks longaniza de pavo extra Hacendado": "Палички лонганіси з індички екстра Hacendado",
  "Tiras de pechuga de pollo 99% Hacendado al natural": "Смужки курячої грудки 99% Hacendado натуральні",
  "Tiras de pechuga pollo 99% al horno Hacendado": "Смужки курячої грудки 99% запечені Hacendado",

  // ── Pepinillos y otros encurtidos
  "Ajos aliñados Hacendado": "Маринований часник Hacendado",
  "Alcaparras Hacendado": "Каперси Hacendado",
  "Altramuces Hacendado": "Люпин Hacendado",
  "Cebollitas Hacendado": "Маленькі цибулинки Hacendado",
  "Jalapeños picantes en vinagre Hacendado": "Гострі халапеньо в оцті Hacendado",
  "Mix de pepinillos y cebollitas Hacendado": "Мікс корнішонів і цибулинок Hacendado",
  "Pepinillos agridulces Hacendado": "Кисло-солодкі корнішони Hacendado",
  "Pepinillos en vinagre Hacendado": "Корнішони в оцті Hacendado",
  "Pepinillos pequeños Hacendado": "Маленькі корнішони Hacendado",
  "Picadillo de variantes Hacendado": "Асорті дрібно нарізаних маринадів Hacendado",
  "Piparra Hacendado": "Перчики піпарра Hacendado",

  // ── Pepino y zanahoria
  "Palitos de zanahoria": "Морквяні палички",
  "Pepino holandés": "Голландський огірок",
  "Zanahoria rallada lavada": "Терта мита морква",
  "Zanahorias": "Морква",

  // ── Picatostes
  "Picatostes fritos con ajo Hacendado": "Смажені грінки з часником Hacendado",
  "Picatostes fritos Hacendado": "Смажені грінки Hacendado",
  "Picatostes tostados Hacendado": "Підсмажені грінки Hacendado",

  // ── Picos
  "Grissini palitos de pan Hacendado": "Хлібні палички гриссіні Hacendado",
  "Picos 100% integral de trigo Hacendado": "Хлібні палички пікос 100% з цільної пшениці Hacendado",
  "Picos camperos Hacendado": "Сільські хлібні палички пікос Hacendado",
  "Picos Hacendado": "Хлібні палички пікос Hacendado",
  "Picos saladitos Hacendado": "Солоні хлібні палички пікос Hacendado",
  "Picos sin gluten Hacendado": "Хлібні палички пікос без глютену Hacendado",
  "Piquitos bajos en sal Hacendado con orégano y tomillo": "Міні-палички зі зниженою сіллю Hacendado з орегано та чебрецем",
  "Piquitos con salvado San Roque": "Міні-палички з висівками San Roque",
  "Regañá artesana Hacendado": "Хрусткі хлібці регання ремісничі Hacendado",
  "Regañá Hacendado": "Хрусткі хлібці регання Hacendado",

  // ── Piña
  "Bebida de piña Hacendado sin azúcares añadidos": "Ананасовий напій Hacendado без доданого цукру",
  "Néctar de piña La Verja": "Ананасовий нектар La Verja",
  "Zumo de piña Hacendado": "Ананасовий сік Hacendado",
  "Zumo de piña selección Hacendado": "Ананасовий сік «Селекція» Hacendado",
  "Zumo de piña y uva Hacendado": "Сік ананас і виноград Hacendado",

  // ── Pizzas refrigeradas
  "Pizza 4 quesos familiar Hacendado": "Піца «4 сири» сімейна Hacendado",
  "Pizza 4 quesos Hacendado": "Піца «4 сири» Hacendado",
  "Pizza atún y bacón Hacendado": "Піца з тунцем і беконом Hacendado",
  "Pizza barbacoa familiar Hacendado": "Піца барбекю сімейна Hacendado",
  "Pizza barbacoa Hacendado": "Піца барбекю Hacendado",
  "Pizza carbonara familiar Hacendado": "Піца карбонара сімейна Hacendado",
  "Pizza carbonara Hacendado": "Піца карбонара Hacendado",
  "Pizza carnívora Hacendado": "М'ясна піца Hacendado",
  "Pizza Formaggi Hacendado 4 quesos": "Піца Formaggi Hacendado «4 сири»",
  "Pizza Frankfurt Hacendado": "Піца «Франкфурт» Hacendado",
  "Pizza jamón y queso familiar Hacendado": "Піца з шинкою та сиром сімейна Hacendado",
  "Pizza jamón y queso Hacendado": "Піца з шинкою та сиром Hacendado",
  "Pizza jamón y queso sin gluten y sin lactosa Hacendado": "Піца з шинкою та сиром без глютену та без лактози Hacendado",
  "Pizza pepperoni Hacendado": "Піца пепероні Hacendado",
  "Pizza pollo Hacendado": "Піца з куркою Hacendado",
  "Pizza pollo y bacón Hacendado": "Піца з куркою та беконом Hacendado",
  "Pizza Prosciutto Hacendado jamón y queso": "Піца Prosciutto Hacendado з шинкою та сиром",
  "Pizza romana Hacendado con champiñones salteados": "Піца «Романа» Hacendado зі смаженими печерицями",
  "Pizza serrana Hacendado": "Піца «Серрана» Hacendado",

  // ── Plátano y uva
  "Plátano de Canarias IGP": "Канарські банани IGP",
  "Plátano macho": "Плантан (овочевий банан)",
  "Uva blanca sin semillas": "Білий виноград без кісточок",
  "Uva roja sin semillas": "Червоний виноград без кісточок",

  // ── Platos calientes
  "Salmón con verduras Listo para Comer": "Лосось з овочами Listo para Comer",
  "Tortilla de patata con calabacín Listo para Comer": "Картопляна тортилья з кабачком Listo para Comer",
  "Tortilla de patata con cebolla Listo para Comer": "Картопляна тортилья з цибулею Listo para Comer",

  // ── Platos de cuchara
  "Albóndigas en salsa Hacendado": "Фрикадельки в соусі Hacendado",
  "Alubias a la jardinera Hacendado": "Квасоля з овочами Hacendado",
  "Alubias con tomate Heinz": "Квасоля в томатному соусі Heinz",
  "Callos a la madrileña Hacendado": "Рубець по-мадридськи Hacendado",
  "Cocido Hacendado": "Косідо (м'ясна юшка з нутом) Hacendado",
  "Fabada Hacendado": "Фабада (квасоля з ковбасками) Hacendado",
  "Garbanzos a la jardinera Hacendado": "Нут з овочами Hacendado",
  "Garbanzos a la riojana Hacendado": "Нут по-ріохськи Hacendado",
  "Lentejas a la jardinera Hacendado": "Сочевиця з овочами Hacendado",
  "Lentejas a la riojana Hacendado": "Сочевиця по-ріохськи Hacendado",

  // ── Platos fríos
  "Ensalada de marisco Listo para Comer": "Салат з морепродуктами Listo para Comer",
  "Poke salmón": "Поке з лососем",
  "Surtido sushi Bento mix": "Асорті суші Bento mix",
  "Surtido sushi Bento pequeño": "Асорті суші Bento маленьке",

  // ── Pollo
  "Empanados de pollo picantes sin gluten": "Гострі курячі шматочки в паніровці без глютену",
  "Filetes solomillos de pollo marinados empanados sin gluten": "Мариноване куряче філе в паніровці без глютену",

  // ── Postres de soja
  "Postre de coco natural Alpro sin azúcares añadidos": "Натуральний кокосовий десерт Alpro без доданого цукру",
  "Postre de soja natural Hacendado": "Натуральний соєвий десерт Hacendado",
  "Postre de soja sabor arándanos Alpro": "Соєвий десерт зі смаком чорниці Alpro",
  "Postre de soja sabor chocolate Hacendado": "Соєвий десерт зі смаком шоколаду Hacendado",
  "Postre de soja sabor mango Alpro sin azúcares añadidos": "Соєвий десерт зі смаком манго Alpro без доданого цукру",
  "Postre de soja sabor natural con coco Alpro": "Соєвий десерт натуральний з кокосом Alpro",
  "Postre de soja sabor vainilla Hacendado": "Соєвий десерт зі смаком ванілі Hacendado",

  // ── Queso curado
  "Queso añejo de oveja al romero Hacendado": "Витриманий овечий сир з розмарином Hacendado",
  "Queso añejo fuerte de oveja Hacendado": "Витриманий гострий овечий сир Hacendado",
  "Queso añejo fuerte de oveja Hacendado cortado en cuñitas": "Витриманий гострий овечий сир Hacendado нарізаний клинцями",
  "Queso Arzúa-Ulloa de vaca Punteiro": "Коров'ячий сир Арсуа-Ульоа Punteiro",
  "Queso curado cheddar Hacendado": "Витриманий чедер Hacendado",
  "Queso curado DOP manchego de oveja Hacendado": "Витриманий овечий сир манчего DOP Hacendado",
  "Queso curado mezcla afrutado Hacendado cortado en cuñitas": "Витриманий змішаний сир фруктовий Hacendado нарізаний клинцями",
  "Queso curado mezcla Hacendado": "Витриманий змішаний сир Hacendado",
  "Queso curado mezcla Hacendado cortado en cuñitas": "Витриманий змішаний сир Hacendado нарізаний клинцями",
  "Queso curado mezcla madurado en madera Hacendado": "Витриманий змішаний сир, що визрівав у дереві Hacendado",
  "Queso curado y cheddar Hacendado en dados": "Витриманий сир і чедер Hacendado кубиками",
  "Queso grana padano Hacendado en escamas": "Сир грана падано Hacendado пластівцями",
  "Queso grana padano Zanetti": "Сир грана падано Zanetti",
  "Queso viejo ahumado de oveja Hacendado": "Старий копчений овечий сир Hacendado",
  "Queso viejo de oveja Hacendado": "Старий овечий сир Hacendado",
  "Queso viejo tostado mezcla Hacendado": "Старий обсмажений змішаний сир Hacendado",
  "Tabla de quesos nacionales Hacendado": "Сирна тарілка іспанських сирів Hacendado",

  // ── Queso en porciones
  "Queso en porciones Hacendado": "Плавлений сир порціями Hacendado",
  "Queso en porciones light Hacendado": "Плавлений сир порціями лайт Hacendado",
  "Queso en porciones mini Babybel": "Сир порціями міні Babybel",
  "Queso fundido con palitos La vaca que ríe": "Плавлений сир з паличками La vaca que ríe",

  // ── Queso especialidades
  "Queso azul de vaca Hacendado": "Блакитний коров'ячий сир Hacendado",
  "Queso brie marcillat de vaca Plaisir de Roy": "Коров'ячий сир брі Marcillat Plaisir de Roy",
  "Queso camembert de vaca Marcillat": "Коров'ячий сир камамбер Marcillat",
  "Queso gorgonzola de vaca Hacendado": "Коров'ячий сир горгонзола Hacendado",
  "Queso precortado de cabra Hacendado": "Козячий сир у нарізці Hacendado",
  "Queso provolone de vaca Hacendado": "Коров'ячий сир проволоне Hacendado",
  "Queso roquefort  de oveja Hacendado": "Овечий сир рокфор Hacendado",
  "Queso rulo con piña y almendra Liptana": "Сирний рулет з ананасом і мигдалем Liptana",
  "Queso rulo de cabra Hacendado": "Рулет з козячого сиру Hacendado",

  // ── Queso fresco
  "Burrata fresca Hacendado": "Свіжа буррата Hacendado",
  "Mozzarella fresca de vaca Hacendado": "Свіжа коров'яча моцарела Hacendado",
  "Mozzarella fresca di bufala campana Hacendado": "Свіжа моцарела ді буфала кампана Hacendado",
  "Mozzarella fresca light de vaca Hacendado": "Свіжа коров'яча моцарела лайт Hacendado",
  "Queso cottage Valblu": "Сир котедж Valblu",
  "Queso feta mezcla Hacendado en dados": "Змішаний сир фета Hacendado кубиками",
  "Queso fresco 0% MG de vaca Burgo de Arias": "Свіжий коров'ячий сир 0% жирності Burgo de Arias",
  "Queso fresco batido desnatado 0% MG Hacendado": "Збитий свіжий сир знежирений 0% жирності Hacendado",
  "Queso fresco Burgos desnatado 0% MG Hacendado": "Свіжий сир Бургос знежирений 0% жирності Hacendado",
  "Queso fresco Burgos natural Hacendado": "Свіжий сир Бургос натуральний Hacendado",
  "Queso fresco Burgos sin lactosa Hacendado": "Свіжий сир Бургос без лактози Hacendado",
  "Queso fresco de cabra Hacendado": "Свіжий козячий сир Hacendado",
  "Queso fresco de vaca Burgo de Arias": "Свіжий коров'ячий сир Burgo de Arias",
  "Queso fresco de vaca Hacendado": "Свіжий коров'ячий сир Hacendado",
  "Queso fresco light de vaca Hacendado": "Свіжий коров'ячий сир лайт Hacendado",
  "Queso fresco mascarpone de vaca Hacendado": "Свіжий коров'ячий сир маскарпоне Hacendado",
  "Queso fresco servilleta tradicional de vaca Hacendado": "Свіжий коров'ячий сир у серветці традиційний Hacendado",
  "Queso ricotta mezcla Hacendado": "Змішаний сир рікота Hacendado",
  "Requesón mezcla Hacendado": "Змішаний сир кисломолочний Hacendado",

  // ── Queso lonchas
  "Queso lonchas cheddar de vaca Hacendado": "Коров'ячий сир чедер скибочками Hacendado",
  "Queso lonchas cremoso de vaca Hacendado": "Вершковий коров'ячий сир скибочками Hacendado",
  "Queso lonchas cremoso light de vaca Hacendado": "Вершковий коров'ячий сир лайт скибочками Hacendado",
  "Queso lonchas de cabra Hacendado": "Козячий сир скибочками Hacendado",
  "Queso lonchas de oveja Hacendado": "Овечий сир скибочками Hacendado",
  "Queso lonchas edam de vaca Holland Corona": "Коров'ячий сир едам скибочками Holland Corona",
  "Queso lonchas emmental de vaca Hacendado": "Коров'ячий сир ементаль скибочками Hacendado",
  "Queso lonchas fundido burger mezcla Hacendado": "Плавлений змішаний сир скибочками для бургерів Hacendado",
  "Queso lonchas fundido sándwich mezcla Hacendado": "Плавлений змішаний сир скибочками для сендвічів Hacendado",
  "Queso lonchas fundido suave mezcla Hacendado": "Плавлений змішаний сир скибочками м'який Hacendado",
  "Queso lonchas semicurado mezcla Hacendado": "Напіввитриманий змішаний сир скибочками Hacendado",
  "Queso lonchas sin lactosa de vaca Hacendado": "Коров'ячий сир без лактози скибочками Hacendado",
  "Queso lonchas tierno de vaca Hacendado": "Молодий коров'ячий сир скибочками Hacendado",
  "Queso lonchas tierno mezcla Hacendado": "Молодий змішаний сир скибочками Hacendado",

  // ── Queso rallado
  "Queso en polvo especial pasta mezcla Hacendado": "Тертий сир у порошку для пасти змішаний Hacendado",
  "Queso en polvo grana padano Hacendado": "Тертий сир грана падано в порошку Hacendado",
  "Queso rallado emmental gratinar Hacendado": "Тертий ементаль для запікання Hacendado",
  "Queso rallado especial fundir mezcla Hacendado": "Тертий змішаний сир для плавлення Hacendado",
  "Queso rallado mozzarella pizza-Roma de vaca Hacendado": "Терта коров'яча моцарела для піци Roma Hacendado",
  "Queso rallado sin lactosa de vaca Hacendado": "Тертий коров'ячий сир без лактози Hacendado",

  // ── Queso semicurado
  "Queso semicurado de cabra Hacendado": "Напіввитриманий козячий сир Hacendado",
  "Queso semicurado de oveja Hacendado cortado en cuñitas": "Напіввитриманий овечий сир Hacendado нарізаний клинцями",
  "Queso semicurado mezcla Hacendado": "Напіввитриманий змішаний сир Hacendado",
  "Queso semicurado mezcla Hacendado cortado en cuñitas": "Напіввитриманий змішаний сир Hacendado нарізаний клинцями",
  "Queso semicurado sin lactosa mezcla Hacendado": "Напіввитриманий змішаний сир без лактози Hacendado",

  // ── Queso tierno
  "Queso emmental de vaca Hacendado": "Коров'ячий сир ементаль Hacendado",
  "Queso tierno bajo en sal mezcla Hacendado": "Молодий змішаний сир зі зниженим вмістом солі Hacendado",
  "Queso tierno bola edam de vaca Holland Corona": "Молодий коров'ячий сир едам кулею Holland Corona",
  "Queso tierno de cabra Hacendado": "Молодий козячий сир Hacendado",
  "Queso tierno de vaca Hacendado cortado en cuñitas": "Молодий коров'ячий сир Hacendado нарізаний клинцями",
  "Queso tierno maasdam de vaca Holland Corona": "Молодий коров'ячий сир маасдам Holland Corona",
  "Queso tierno mezcla Hacendado": "Молодий змішаний сир Hacendado",
  "Queso tierno mezcla Hacendado cortado en cuñitas": "Молодий змішаний сир Hacendado нарізаний клинцями",
  "Queso tierno tronchón mezcla Hacendado": "Молодий змішаний сир трончон Hacendado",

  // ── Queso untable
  "Crema de queso camembert Hacendado": "Сирний крем камамбер Hacendado",
  "Crema de queso viejo tostado mezcla Hacendado": "Сирний крем зі старого обсмаженого змішаного сиру Hacendado",
  "Mousse de queso de vaca con ajo y finas hierbas Hacendado": "Сирний мус з коров'ячого молока з часником і травами Hacendado",
  "Queso untar con queso azul de vaca Hacendado": "Сир для намазування з блакитним сиром Hacendado",
  "Queso untar de vaca con finas hierbas Hacendado": "Коров'ячий сир для намазування з травами Hacendado",
  "Queso untar light de vaca Hacendado": "Коров'ячий сир для намазування лайт Hacendado",
  "Queso untar light Philadelphia": "Сир для намазування лайт Philadelphia",
  "Queso untar original Philadelphia": "Сир для намазування оригінальний Philadelphia",
  "Queso untar sin lactosa de vaca Hacendado": "Коров'ячий сир для намазування без лактози Hacendado",
  "Queso untar suave de vaca Hacendado": "М'який коров'ячий сир для намазування Hacendado",

  // ── Roscas, quiche y baguettes
  "Focaccia con tomates cherry Hacendado": "Фокача з помідорами чері Hacendado",
  "Rosca jamón serrano y queso emmental Hacendado": "Кільце з хамоном серрано та ементалем Hacendado",
  "Rosca lomo, bacón y queso emmental Hacendado": "Кільце з корейкою, беконом і ементалем Hacendado",

  // ── Rosquilletas
  "Palitos con frutos secos Hacendado": "Хлібні палички з горіхами Hacendado",
  "Palitos de pan con aceitunas Hacendado": "Хлібні палички з оливками Hacendado",
  "Palitos de pan con chocolate Anitin": "Хлібні палички з шоколадом Anitin",
  "Panes especiales con tomate y orégano Hacendado": "Хлібні снеки з томатом і орегано Hacendado",
  "Panes especiales sabor fuet Hacendado": "Хлібні снеки зі смаком фуета Hacendado",
  "Panes especiales sabor pizza con queso Hacendado": "Хлібні снеки зі смаком піци з сиром Hacendado",
  "Rosquilletas de horno Anitin": "Запечені кільця роскільєтас Anitin",
  "Rosquilletas de horno saladitas Anitin": "Запечені солоні кільця роскільєтас Anitin",
  "Rosquilletas tradicionales Hacendado": "Традиційні кільця роскільєтас Hacendado",

  // ── Salazones
  "Boquerones al vinagre Hacendado en aceite de girasol": "Анчоуси бокерони в оцті Hacendado в соняшниковій олії",
  "Boquerones aliñados Hacendado": "Мариновані анчоуси бокерони Hacendado",
  "Boquerones en vinagre Hacendado en aceite de girasol": "Анчоуси бокерони в оцті Hacendado в соняшниковій олії",
  "Filetes de anchoa en aceite de girasol Hacendado": "Філе анчоусів у соняшниковій олії Hacendado",
  "Filetes de anchoa en aceite de oliva Hacendado": "Філе анчоусів в оливковій олії Hacendado",
  "Migas de bacalao al estilo inglés Hacendado": "Шматочки тріски по-англійськи Hacendado",
  "Migas de bacalao desaladas Hacendado": "Вимочені шматочки солоної тріски Hacendado",
  "Sucedáneo de caviar negro Ubago Caviartic": "Замінник чорної ікри Ubago Caviartic",

  // ── Salchichas
  "Salchichas cocidas bocata gourmet Hacendado de cerdo sabor ahumado": "Варені сосиски для бутербродів гурме Hacendado свинячі зі смаком копчення",
  "Salchichas cocidas bocata Hacendado": "Варені сосиски для бутербродів Hacendado",
  "Salchichas cocidas bocata Hacendado de pollo y pavo sabor ahumado": "Варені сосиски для бутербродів Hacendado з курки та індички зі смаком копчення",
  "Salchichas cocidas bocata queso Hacendado": "Варені сосиски для бутербродів із сиром Hacendado",
  "Salchichas cocidas de cerdo estilo Bratwurst Hacendado": "Варені свинячі сосиски в стилі братвурст Hacendado",
  "Salchichas cocidas de cerdo Hacendado estilo parrillero": "Варені свинячі сосиски для гриля Hacendado",
  "Salchichas cocidas estilo Frankfurt Campofrío sabor ahumado": "Варені сосиски франкфуртські Campofrío зі смаком копчення",
  "Salchichas cocidas estilo Frankfurt con queso Hacendado de pollo y cerdo sabor ahumado": "Варені сосиски франкфуртські із сиром Hacendado з курки та свинини зі смаком копчення",
  "Salchichas cocidas estilo Frankfurt Hacendado de pollo y cerdo sabor ahumado": "Варені сосиски франкфуртські Hacendado з курки та свинини зі смаком копчення",
  "Salchichas cocidas estilo Viena con queso Hacendado de pollo y cerdo sabor ahumado": "Варені сосиски віденські із сиром Hacendado з курки та свинини зі смаком копчення",
  "Salchichas cocidas Frankfurt La Selva": "Варені франкфуртські сосиски La Selva",
  "Salchichas cocidas Hacendado de pollo y pavo sabor ahumado": "Варені сосиски Hacendado з курки та індички зі смаком копчення",
  "Salchichas cocidas hot dog bocadillo Oscar Mayer Classic de pollo y cerdo sabor ahumado": "Варені сосиски для хот-догів Oscar Mayer Classic з курки та свинини зі смаком копчення",
  "Salchichas cocidas Schara de cerdo ahumadas": "Варені копчені свинячі сосиски Schara",

  // ── Salchichón
  "Fuet espetec Hacendado": "Фует еспетек Hacendado",
  "Longaniza clásica extra Hacendado": "Ковбаса лонганіса класична екстра Hacendado",
  "Longaniza de Aragón extra Cárnicas Gállego": "Ковбаса лонганіса арагонська екстра Cárnicas Gállego",
  "Longaniza de Pascua extra Hacendado": "Великодня ковбаса лонганіса екстра Hacendado",
  "Longaniza de payés extra Hacendado": "Сільська ковбаса лонганіса екстра Hacendado",
  "Longaniza de payés extra Hacendado lonchas": "Сільська ковбаса лонганіса екстра Hacendado скибочки",
  "Mini salchichón ibérico extra La Hacienda del ibérico": "Міні-сальчічон іберійський екстра La Hacienda del ibérico",
  "Pepperoni Hacendado lonchas": "Пепероні Hacendado скибочки",
  "Salami extra Hacendado lonchas": "Салямі екстра Hacendado скибочки",
  "Salami extra pimienta Hacendado finas lonchas": "Салямі екстра з перцем Hacendado тонкі скибочки",
  "Salami montañés extra El Pozo": "Гірська салямі екстра El Pozo",
  "Salchichón cular ibérico extra La Hacienda del ibérico": "Сальчічон кулар іберійський екстра La Hacienda del ibérico",
  "Salchichón de bellota ibérico cortado a máquina": "Сальчічон із жолудевої іберійської свинини, машинна нарізка",
  "Salchichón extra Hacendado lonchas": "Сальчічон екстра Hacendado скибочки",
  "Salchichón extra pimienta Hacendado finas lonchas": "Сальчічон екстра з перцем Hacendado тонкі скибочки",
  "Salchichón ibérico extra La Hacienda del ibérico lonchas": "Сальчічон іберійський екстра La Hacienda del ibérico скибочки",
  "Sticks longaniza extra Hacendado": "Палички ковбаси лонганіса екстра Hacendado",

  // ── Sándwich
  "Sándwich atún y huevo Hacendado": "Сендвіч з тунцем і яйцем Hacendado",
  "Sándwich pollo y queso Hacendado": "Сендвіч з куркою та сиром Hacendado",

  // ── Sardinas
  "Sardinas en aceite de oliva Hacendado": "Сардини в оливковій олії Hacendado",
  "Sardinillas en aceite de oliva Hacendado": "Дрібні сардини в оливковій олії Hacendado",
  "Sardinillas en escabeche Hacendado": "Дрібні сардини в маринаді ескабече Hacendado",
  "Sardinillas en tomate Hacendado": "Дрібні сардини в томаті Hacendado",
  "Sardinillas picantes en aceite de girasol Hacendado": "Гострі дрібні сардини в соняшниковій олії Hacendado",
  "Sardinillas reducidas en sal en aceite de oliva Hacendado": "Дрібні сардини зі зниженим вмістом солі в оливковій олії Hacendado",

  // ── Sepia, pulpo y calamar
  "Patas de pulpo cocido": "Варені щупальця восьминога",

  // ── Snacks
  "Aros de maíz Hacendado": "Кукурудзяні кільця Hacendado",
  "Combinado de aperitivos Hacendado": "Асорті закусок Hacendado",
  "Conos sabor bacón y queso Hacendado": "Ріжки зі смаком бекону та сиру Hacendado",
  "Cortezas de cerdo fritas sabor barbacoa Hacendado": "Смажені свинячі шкварки зі смаком барбекю Hacendado",
  "Cuquis Hacendado": "Снеки Cuquis Hacendado",
  "Cuquitos sabor queso Hacendado": "Снеки Cuquitos зі смаком сиру Hacendado",
  "Galletas saladas con semillas y orégano Hacendado": "Солоне печиво з насінням і орегано Hacendado",
  "Galletitas saladas Hacendado": "Солоне міні-печиво Hacendado",
  "Garfitos de maíz sabor queso Hacendado": "Кукурудзяні снеки Garfitos зі смаком сиру Hacendado",
  "Nachos Hacendado": "Начос Hacendado",
  "Nachos tex-mex sabor queso Hacendado": "Начос текс-мекс зі смаком сиру Hacendado",
  "Palomitas caramelo Hacendado": "Карамельний попкорн Hacendado",
  "Patatas fritas paja Hacendado": "Картопля соломкою Hacendado",
  "Snack Balls sabor queso Hacendado": "Сирні кульки Snack Balls Hacendado",
  "Snack de maíz Crunchy sabor agridulce picante Hacendado": "Кукурудзяний снек Crunchy кисло-солодкий гострий Hacendado",
  "Snack de maíz Redes sabor barbacoa Hacendado": "Кукурудзяний снек Redes зі смаком барбекю Hacendado",
  "Snack de maíz Stars sabor mantequilla Hacendado": "Кукурудзяний снек Stars зі смаком вершкового масла Hacendado",
  "Snack frito Binkies sabor queso Hacendado": "Смажений снек Binkies зі смаком сиру Hacendado",
  "Sticks de patata Hacendado": "Картопляні палички Hacendado",
  "Sticks vegetales Hacendado": "Овочеві палички Hacendado",
  "Súper Cuquis": "Снеки Súper Cuquis",
  "Tiras de maíz frito sabor barbacoa Hacendado": "Смажені кукурудзяні смужки зі смаком барбекю Hacendado",
  "Torreznillos Hacendado cortezas de cerdo fritas ahumadas": "Шкварки торезнільос Hacendado, смажена копчена свиняча шкірка",
  "Torreznos Hacendado": "Шкварки торезнос Hacendado",
  "Trigo snack sabor ahumado Hacendado": "Пшеничний снек зі смаком копчення Hacendado",

  // ── Sobrasada
  "Sobrasada con miel L'Illa especialidades": "Собрасада з медом L'Illa especialidades",
  "Sobrasada de Mallorca Can Pere Joan": "Майоркська собрасада Can Pere Joan",
  "Sobrasada ibérica L'Illa especialidades": "Іберійська собрасада L'Illa especialidades",
  "Sobrasada selecta L'Illa especialidades": "Добірна собрасада L'Illa especialidades",

  // ── Sopa
  "Sopa de miso": "Суп місо",
  "Sopa de pollo Gallina Blanca con fideos finos": "Курячий суп Gallina Blanca з тонкою вермішеллю",
  "Sopa de pollo Hacendado con fideos finos": "Курячий суп Hacendado з тонкою вермішеллю",

  // ── Surimi y otros
  "Palitos de surimi Hacendado": "Крабові палички сурімі Hacendado",

  // ── Tartas
  "Tarta delicia de fresa Hacendado congelada": "Торт «Полунична насолода» Hacendado заморожений",

  // ── Té
  "Refresco té  zero sabor melocotón Hacendado": "Холодний чай без цукру зі смаком персика Hacendado",
  "Refresco té sabor mango y piña Hacendado": "Холодний чай зі смаком манго та ананаса Hacendado",
  "Refresco té sabor melocotón Hacendado": "Холодний чай зі смаком персика Hacendado",
  "Refresco té verde Hacendado": "Холодний зелений чай Hacendado",
  "Té Chai Hacendado": "Чай масала Hacendado",
  "Té negro con canela Hacendado": "Чорний чай з корицею Hacendado",
  "Té negro Hacendado": "Чорний чай Hacendado",

  // ── Tomate
  "Fritada pisto Hacendado": "Овочеве рагу пісто Hacendado",
  "Rama de Tomates": "Помідори на гілці",
  "Tomate doble concentrado Hacendado extra": "Томатна паста подвійної концентрації Hacendado екстра",
  "Tomate entero pelado Hacendado": "Цілі очищені помідори Hacendado",
  "Tomate para untar Hacendado con aceite de oliva": "Томат для намазування Hacendado з оливковою олією",
  "Tomate rallado": "Терті помідори",
  "Tomate seco Hacendado en aceite de oliva": "В'ялені томати Hacendado в оливковій олії",
  "Tomate tamizado sin piel Hacendado": "Протерті томати без шкірки Hacendado",
  "Tomate triturado Hacendado": "Подрібнені томати Hacendado",
  "Tomate troceado pelado Hacendado": "Нарізані очищені томати Hacendado",
  "Tomates": "Помідори",
  "Tomates cherry": "Помідори чері",
  "Tomates cherry en rama Dulcita": "Помідори чері на гілці Dulcita",

  // ── Tónica y bitter
  "Bitter Kas sin alcohol": "Біттер Kas безалкогольний",
  "Tónica original Schweppes": "Тонік оригінальний Schweppes",
  "Tónica Zero Schweppes": "Тонік Zero Schweppes",

  // ── Tortilla
  "Tortilla de patata Hacendado": "Картопляна тортилья Hacendado",
  "Tortilla de patata y cebolla Hacendado": "Картопляна тортилья з цибулею Hacendado",

  // ── Tortitas
  "Tortitas de arroz con chocolate blanco sabor yogur Hacendado": "Рисові хлібці в білому шоколаді зі смаком йогурту Hacendado",
  "Tortitas de arroz con chocolate con leche Hacendado": "Рисові хлібці в молочному шоколаді Hacendado",
  "Tortitas de arroz Hacendado": "Рисові хлібці Hacendado",
  "Tortitas de legumbres y arroz Hacendado": "Хлібці з бобових і рису Hacendado",
  "Tortitas de maíz campestre Hacendado": "Кукурудзяні хлібці сільські Hacendado",
  "Tortitas de maíz con chocolate Hacendado": "Кукурудзяні хлібці з шоколадом Hacendado",
  "Tortitas de maíz con sabor a jamón Hacendado": "Кукурудзяні хлібці зі смаком хамона Hacendado",
  "Tortitas de maíz Hacendado": "Кукурудзяні хлібці Hacendado",

  // ── Verduras al vapor
  "3 Vegetales para microondas lavados": "3 митих овочі для мікрохвильовки",
  "Batatas para microondas": "Батат для мікрохвильовки",
  "Floretas de brócoli para microondas lavadas": "Миті суцвіття броколі для мікрохвильовки",
  "Patatas para microondas": "Картопля для мікрохвильовки",

  // ── Yogures de sabores
  "Postre lácteo sabor fresa sin lactosa Hacendado": "Молочний десерт зі смаком полуниці без лактози Hacendado",
  "Yogur con frutas Hacendado": "Йогурт з фруктами Hacendado",
  "Yogur cremoso con frutos silvestres Hacendado": "Вершковий йогурт з лісовими ягодами Hacendado",
  "Yogur cremoso con melocotón y maracuya Hacendado": "Вершковий йогурт з персиком і маракуєю Hacendado",
  "Yogur sabor coco Danone": "Йогурт зі смаком кокоса Danone",
  "Yogur sabor coco Hacendado": "Йогурт зі смаком кокоса Hacendado",
  "Yogur sabor fresa Danone": "Йогурт зі смаком полуниці Danone",
  "Yogur sabor fresa Hacendado": "Йогурт зі смаком полуниці Hacendado",
  "Yogur sabor macedonia Danone": "Йогурт зі смаком фруктового асорті Danone",
  "Yogur sabor macedonia Hacendado": "Йогурт зі смаком фруктового асорті Hacendado",
  "Yogur sabores Hacendado": "Фруктові йогурти асорті Hacendado",

  // ── Yogures desnatados
  "Postre lácteo con arándanos +Proteínas 10 g 0% MG": "Молочний десерт з чорницею +Протеїн 10 г, 0% жирності",
  "Postre lácteo con fresa +Proteínas 10 g 0% MG": "Молочний десерт з полуницею +Протеїн 10 г, 0% жирності",
  "Postre lácteo con fruta Hacendado 0% MG 0% azúcares añadidos": "Молочний десерт з фруктами Hacendado 0% жирності, без доданого цукру",
  "Postre lácteo con puré mango y maracuya +Proteínas 10 g 0% MG": "Молочний десерт з пюре манго та маракуї +Протеїн 10 г, 0% жирності",
  "Postre lácteo cremoso natural edulcorado Hacendado 0% MG 0% azúcares añadidos": "Вершковий натуральний молочний десерт з підсолоджувачем Hacendado 0% жирності, без доданого цукру",
  "Postre lácteo natural +Proteínas 10 g 0% MG": "Натуральний молочний десерт +Протеїн 10 г, 0% жирності",
  "Postre lácteo natural +Proteínas 12 g 0% MG": "Натуральний молочний десерт +Протеїн 12 г, 0% жирності",
  "Postre lácteo natural sin lactosa Hacendado 0% MG 0% azúcares añadidos": "Натуральний молочний десерт без лактози Hacendado 0% жирності, без доданого цукру",
  "Postre lácteo sabor coco +Proteínas 10 g 0% MG": "Молочний десерт зі смаком кокоса +Протеїн 10 г, 0% жирності",
  "Yogur natural edulcorado Hacendado 0% MG 0% azúcares añadidos": "Натуральний йогурт з підсолоджувачем Hacendado 0% жирності, без доданого цукру",
  "Yogur natural Hacendado 0% MG 0% azúcares añadidos": "Натуральний йогурт Hacendado 0% жирності, без доданого цукру",
  "Yogur sabor fresa Hacendado 0% MG 0% azúcares añadidos": "Йогурт зі смаком полуниці Hacendado 0% жирності, без доданого цукру",
  "Yogur sabores Hacendado 0% MG 0% azúcares añadidos": "Фруктові йогурти асорті Hacendado 0% жирності, без доданого цукру",

  // ── Yogures griegos
  "Yogur griego con fresa Hacendado": "Грецький йогурт з полуницею Hacendado",
  "Yogur griego con mango Hacendado": "Грецький йогурт з манго Hacendado",
  "Yogur griego natural Hacendado": "Натуральний грецький йогурт Hacendado",
  "Yogur griego natural Hacendado con azúcar de caña": "Натуральний грецький йогурт Hacendado з тростинним цукром",
  "Yogur griego natural ligero Hacendado": "Натуральний легкий грецький йогурт Hacendado",
  "Yogur griego natural ligero Hacendado 2% MG": "Натуральний легкий грецький йогурт Hacendado 2% жирності",
  "Yogur griego sabor fresa Hacendado": "Грецький йогурт зі смаком полуниці Hacendado",
  "Yogur griego stracciatella Hacendado": "Грецький йогурт страчателла Hacendado",

  // ── Yogures líquidos
  "Batido lácteo sabor café +Proteínas 30 g": "Молочний коктейль зі смаком кави +Протеїн 30 г",
  "Batido lácteo sabor chocolate +Proteínas 30 g": "Молочний коктейль зі смаком шоколаду +Протеїн 30 г",
  "Batido lácteo sabor vainilla +Proteínas 30 g": "Молочний коктейль зі смаком ванілі +Протеїн 30 г",
  "Bebida láctea de fresa Hacendado": "Молочний напій з полуницею Hacendado",
  "Bebida láctea de fresa y plátano Hacendado": "Молочний напій з полуницею та бананом Hacendado",
  "Bebida láctea de frutas del bosque Hacendado": "Молочний напій з лісовими ягодами Hacendado",
  "Bebida láctea de piña y coco Hacendado": "Молочний напій з ананасом і кокосом Hacendado",
  "Bebida láctea natural azucarada Hacendado": "Натуральний солодкий молочний напій Hacendado",
  "Bebida láctea sabor açaí plátano +Proteínas 20 g 0% MG": "Молочний напій зі смаком асаї та банана +Протеїн 20 г, 0% жирності",
  "Bebida láctea sabor fresa +Proteínas 20 g 0% MG": "Молочний напій зі смаком полуниці +Протеїн 20 г, 0% жирності",
  "Bebida láctea sabor fresa y plátano +Proteínas 17,4 g 0% MG 0% azúcares añadidos": "Молочний напій зі смаком полуниці та банана +Протеїн 17,4 г, 0% жирності, без доданого цукру",
  "Bebida láctea sabor stracciatella +Proteínas 20 g 0% azúcares añadidos": "Молочний напій зі смаком страчателли +Протеїн 20 г, без доданого цукру",
  "Bebida láctea sabor tropical +Proteínas 20 g 0% MG": "Молочний напій тропічний +Протеїн 20 г, 0% жирності",
  "Yogur líquido de fresa Hacendado": "Питний йогурт з полуницею Hacendado",
  "Yogur líquido frutos silvestres Hacendado 0% MG 0% azúcares añadidos": "Питний йогурт з лісовими ягодами Hacendado 0% жирності, без доданого цукру",
  "Yogur líquido natural Hacendado con azúcar de caña": "Натуральний питний йогурт Hacendado з тростинним цукром",
  "Yogur líquido piña y coco Hacendado 0% MG 0% azúcares añadidos": "Питний йогурт з ананасом і кокосом Hacendado 0% жирності, без доданого цукру",

  // ── Yogures naturales
  "Kéfir natural sabor suave": "Натуральний кефір м'який смак",
  "Postre lácteo cremoso natural azucarado sin lactosa Hacendado": "Вершковий натуральний солодкий молочний десерт без лактози Hacendado",
  "Yogur natural con azúcar de caña Hacendado": "Натуральний йогурт з тростинним цукром Hacendado",
  "Yogur natural Danone": "Натуральний йогурт Danone",
  "Yogur natural de cabra Hacendado": "Натуральний козячий йогурт Hacendado",
  "Yogur natural Hacendado": "Натуральний йогурт Hacendado"
});

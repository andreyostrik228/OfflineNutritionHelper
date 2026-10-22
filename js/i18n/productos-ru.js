/**
 * js/i18n/productos-ru.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los nombres de producto del modo "sin cocinar", en ruso (2026-10-22).
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

registerProductTable("ru", {
  // ── Aceitunas negras
  "Aceitunas negras en rodajas Hacendado": "Чёрные оливки кольцами Hacendado",
  "Aceitunas negras sin hueso Hacendado": "Чёрные оливки без косточек Hacendado",

  // ── Aceitunas verdes
  "Aceitunas verdes Chupadedos Huerta de Barros partidas aliñadas": "Зелёные оливки Chupadedos Huerta de Barros надрезанные маринованные",
  "Aceitunas verdes con hueso Hacendado": "Зелёные оливки с косточкой Hacendado",
  "Aceitunas verdes estilo casero Hacendado partidas aliñadas": "Зелёные оливки по-домашнему Hacendado надрезанные маринованные",
  "Aceitunas verdes partidas Olives Garcia": "Зелёные оливки надрезанные Olives Garcia",
  "Aceitunas verdes Picadedos sin hueso Hacendado aliñadas": "Зелёные оливки Picadedos без косточек Hacendado маринованные",
  "Aceitunas verdes rellenas de anchoa Hacendado": "Зелёные оливки с анчоусом Hacendado",
  "Aceitunas verdes rellenas de jalapeño Hacendado": "Зелёные оливки с халапеньо Hacendado",
  "Aceitunas verdes rellenas de pepinillo Hacendado": "Зелёные оливки с корнишоном Hacendado",
  "Aceitunas verdes rellenas de pimiento asado Hacendado": "Зелёные оливки с печёным перцем Hacendado",
  "Aceitunas verdes sin hueso aliñadas Hacendado": "Зелёные оливки без косточек маринованные Hacendado",
  "Aceitunas verdes sin hueso Hacendado": "Зелёные оливки без косточек Hacendado",

  // ── Agua sin gas
  "Agua de coco 100% Hacendado": "Кокосовая вода 100% Hacendado",

  // ── Ahumados
  "Bacalao ahumado Hacendado en aceite de girasol": "Копчёная треска Hacendado в подсолнечном масле",
  "Filetes de sardina ahumada Hacendado en aceite de girasol": "Филе копчёной сардины Hacendado в подсолнечном масле",
  "Mojama de atún extra Hacendado lonchas": "Вяленый тунец мохама экстра Hacendado ломтики",
  "Salmón ahumado Hacendado": "Копчёный лосось Hacendado",
  "Salmón marinado Hacendado": "Маринованный лосось Hacendado",
  "Taquitos de salmón ahumado Hacendado": "Кубики копчёного лосося Hacendado",

  // ── Alubias
  "Alubia cocida blanca Hacendado": "Белая фасоль варёная Hacendado",
  "Alubia cocida granja Hacendado": "Фасоль гранха варёная Hacendado",
  "Alubia cocida pinta Hacendado": "Пёстрая фасоль варёная Hacendado",
  "Alubia cocida roja Hacendado": "Красная фасоль варёная Hacendado",

  // ── Arroz
  "Arroz cocido basmati Sabroz": "Готовый рис басмати Sabroz",
  "Arroz cocido integral Sabroz": "Готовый бурый рис Sabroz",
  "Arroz cocido redondo Sabroz": "Готовый круглый рис Sabroz",
  "Arroz de pescado Hacendado": "Рис с рыбой Hacendado",
  "Arroz de secreto ibérico con setas Hacendado": "Рис с иберийской свининой секрето и грибами Hacendado",
  "Arroz de verduras Hacendado": "Рис с овощами Hacendado",
  "Pollo al curry Hacendado con arroz basmati": "Курица карри Hacendado с рисом басмати",

  // ── Atún
  "Atún claro al natural Hacendado": "Светлый тунец в собственном соку Hacendado",
  "Atún claro en aceite de girasol Hacendado": "Светлый тунец в подсолнечном масле Hacendado",
  "Atún claro en escabeche blanco Hacendado": "Светлый тунец в маринаде эскабече Hacendado",
  "Atún en aceite de girasol Hacendado": "Тунец в подсолнечном масле Hacendado",
  "Atún en aceite de oliva Hacendado": "Тунец в оливковом масле Hacendado",
  "Atún en salsa de tomate Hacendado": "Тунец в томатном соусе Hacendado",
  "Ventresca de atún claro en aceite de oliva Hacendado": "Брюшко светлого тунца в оливковом масле Hacendado",

  // ── Azúcar
  "Azúcar blanco en sobres Hacendado": "Белый сахар в пакетиках Hacendado",
  "Azúcar blanco Hacendado": "Белый сахар Hacendado",
  "Azúcar glas Hacendado": "Сахарная пудра Hacendado",
  "Azúcar moreno de caña Hacendado": "Коричневый тростниковый сахар Hacendado",
  "Azúcar moreno en sobres Hacendado": "Коричневый сахар в пакетиках Hacendado",
  "Panela azúcar moreno de caña integral Hacendado": "Панела, нерафинированный тростниковый сахар Hacendado",

  // ── Bacón
  "Bacón ahumado La Selva lonchas": "Копчёный бекон La Selva ломтики",
  "Bacón ahumado sin corteza La Selva": "Копчёный бекон без шкурки La Selva",
  "Bacón Hacendado cintas": "Бекон Hacendado полоски",
  "Bacón Oscar Mayer lonchas": "Бекон Oscar Mayer ломтики",
  "Lomo back bacon Hacendado": "Корейка, бекон бэк Hacendado",
  "Panceta curada sin corteza La Selva lonchas": "Вяленая грудинка без шкурки La Selva ломтики",
  "Panceta salada ibérica La Hacienda del ibérico": "Солёная иберийская грудинка La Hacienda del ibérico",

  // ── Barra de pan
  "2 Baguettes para hornear": "2 багета для выпекания",
  "3 Barras de pan": "3 батона хлеба",
  "3 Barras de pan aceite de oliva": "3 батона хлеба на оливковом масле",
  "Baguette masa madre": "Багет на закваске",
  "Baguette sin gluten": "Багет без глютена",
  "Barra de pan": "Батон хлеба",
  "Barra de pan campesina masa madre": "Деревенский батон на закваске",
  "Barra de pan espiga": "Батон «колосок»",
  "Barra pan de aceite de oliva": "Батон на оливковом масле",
  "Barra pan de agua": "Водный батон",
  "Barra pan de pueblo": "Деревенский батон",
  "Barra pan integral de espelta 100%": "Батон из цельнозерновой полбы 100%",
  "Hogaza de centeno 50%": "Ржаной каравай 50%",
  "Pan campeón del mundo": "Хлеб «Чемпион мира»",
  "Pan integral trigo 100%": "Цельнозерновой пшеничный хлеб 100%",

  // ── Barritas de cereales
  "Barrita con proteínas sabor chocolate con leche Enervit Sport": "Протеиновый батончик со вкусом молочного шоколада Enervit Sport",
  "Barritas con proteínas sabor coco y chocolate Enervit Sport": "Протеиновые батончики со вкусом кокоса и шоколада Enervit Sport",
  "Barritas de avena y chocolate negro Crunchy Nature Valley": "Батончики с овсом и тёмным шоколадом Crunchy Nature Valley",
  "Barritas de cereales avena y cacao Hacendado": "Злаковые батончики с овсом и какао Hacendado",
  "Barritas de cereales muesli y chocolate Hacendado": "Злаковые батончики с мюсли и шоколадом Hacendado",
  "Barritas de cereales sabor mandarina Hacendado": "Злаковые батончики со вкусом мандарина Hacendado",
  "Barritas de cereales y chocolate blanco Hacendado": "Злаковые батончики с белым шоколадом Hacendado",
  "Barritas de cereales y chocolate con leche Hacendado": "Злаковые батончики с молочным шоколадом Hacendado",
  "Barritas de cereales y frutos secos Hacendado": "Злаковые батончики с орехами Hacendado",
  "Barritas de galleta y arándanos Hacendado": "Печенье-батончики с клюквой Hacendado",

  // ── Batidos
  "Batido de chocolate 90% leche Hacendado": "Шоколадный коктейль 90% молока Hacendado",
  "Batido de chocolate 90% leche Puleva": "Шоколадный коктейль 90% молока Puleva",
  "Batido de chocolate Hacendado": "Шоколадный коктейль Hacendado",
  "Batido de chocolate Hacendado 0% sin azúcares añadidos": "Шоколадный коктейль Hacendado 0% без добавленного сахара",
  "Batido de vainilla Hacendado": "Ванильный коктейль Hacendado",
  "Batido sabor fresa Hacendado": "Коктейль со вкусом клубники Hacendado",
  "Batido sabor vainilla Hacendado": "Коктейль со вкусом ванили Hacendado",

  // ── Bebidas frías
  "Café con leche cappuccino Hacendado": "Холодный кофе с молоком капучино Hacendado",
  "Café con leche descafeinado Hacendado": "Холодный кофе с молоком без кофеина Hacendado",
  "Café con leche espresso Hacendado": "Холодный кофе с молоком эспрессо Hacendado",
  "Café con leche light sin lactosa Hacendado": "Холодный кофе с молоком лайт без лактозы Hacendado",

  // ── Bebidas vegetales
  "Bebida de almendras 0% azúcar Hacendado": "Миндальный напиток 0% сахара Hacendado",
  "Bebida de almendras con calcio Hacendado": "Миндальный напиток с кальцием Hacendado",
  "Bebida de arroz sin azúcares añadidos Hacendado": "Рисовый напиток без добавленного сахара Hacendado",
  "Bebida de avellana y arroz sin azúcares añadidos Hacendado": "Напиток из фундука и риса без добавленного сахара Hacendado",
  "Bebida de avena Alitey": "Овсяный напиток Alitey",
  "Bebida de avena con café Hacendado": "Овсяный напиток с кофе Hacendado",
  "Bebida de avena con calcio sin azúcares añadidos Hacendado": "Овсяный напиток с кальцием без добавленного сахара Hacendado",
  "Bebida de avena con chocolate sin azúcares añadidos Hacendado": "Овсяный напиток с шоколадом без добавленного сахара Hacendado",
  "Bebida de avena Hacendado 0% azúcar": "Овсяный напиток Hacendado 0% сахара",
  "Bebida de coco y arroz sin azúcares añadidos Hacendado": "Напиток из кокоса и риса без добавленного сахара Hacendado",
  "Bebida de soja 0% azúcar Hacendado": "Соевый напиток 0% сахара Hacendado",
  "Bebida de soja con calcio y vitaminas sin azúcares añadidos Hacendado": "Соевый напиток с кальцием и витаминами без добавленного сахара Hacendado",
  "Bebida de soja sabor vainilla Hacendado 0% azúcar": "Соевый напиток со вкусом ванили Hacendado 0% сахара",
  "Horchata de chufa Hacendado": "Орчата из чуфы Hacendado",
  "Horchata de chufa sin azúcares añadidos Hacendado": "Орчата из чуфы без добавленного сахара Hacendado",
  "Horchata fresca Hacendado": "Свежая орчата Hacendado",
  "Preparado de coco Hacendado": "Кокосовый напиток Hacendado",

  // ── Berberechos y almejas
  "Almejones al natural Hacendado": "Крупные моллюски альмехоны в собственном соку Hacendado",
  "Berberecho al natural XS Hacendado": "Сердцевидки в собственном соку XS Hacendado",
  "Berberechos al natural M Hacendado": "Сердцевидки в собственном соку M Hacendado",
  "Berberechos al natural S Hacendado": "Сердцевидки в собственном соку S Hacendado",
  "Zamburiñas en salsa de vieira Hacendado": "Гребешки самбуриньяс в соусе Hacendado",

  // ── Bífidus de sabores
  "Bífidus con cereales y fibras probióticos Hacendado": "Бифидойогурт со злаками и клетчаткой, с пробиотиками Hacendado",
  "Bífidus con ciruelas pasas probióticos Hacendado": "Бифидойогурт с черносливом, с пробиотиками Hacendado",
  "Bífidus con frutos silvestres probióticos Hacendado 0% MG 0% azúcares añadidos": "Бифидойогурт с лесными ягодами, с пробиотиками Hacendado 0% жирности, без добавленного сахара",
  "Bífidus con kiwi probióticos Hacendado 0% MG 0% azúcares añadidos": "Бифидойогурт с киви, с пробиотиками Hacendado 0% жирности, без добавленного сахара",
  "Bífidus con mango probióticos Hacendado": "Бифидойогурт с манго, с пробиотиками Hacendado",
  "Bífidus con nueces y cereales probióticos Hacendado 0% MG": "Бифидойогурт с орехами и злаками, с пробиотиками Hacendado 0% жирности",
  "Bífidus con pera probióticos Hacendado 0% MG 0% azúcares añadidos": "Бифидойогурт с грушей, с пробиотиками Hacendado 0% жирности, без добавленного сахара",
  "Bífidus con piña probióticos Hacendado 0% MG 0% azúcares añadidos": "Бифидойогурт с ананасом, с пробиотиками Hacendado 0% жирности, без добавленного сахара",
  "Bífidus cremoso con coco probióticos Hacendado": "Сливочный бифидойогурт с кокосом, с пробиотиками Hacendado",

  // ── Bífidus naturales
  "Bífidus cremoso natural edulcorado probióticos Hacendado 0% MG 0% azúcares añadidos": "Сливочный натуральный бифидойогурт с подсластителем, с пробиотиками Hacendado 0% жирности, без добавленного сахара",
  "Bífidus natural azucarado probióticos Hacendado con cereales y fresas deshidratadas": "Натуральный сладкий бифидойогурт с пробиотиками Hacendado со злаками и сушёной клубникой",
  "Bífidus natural edulcorado probióticos Activia 0% MG 0% azúcares añadidos": "Натуральный бифидойогурт с подсластителем, с пробиотиками Activia 0% жирности, без добавленного сахара",
  "Bífidus natural probióticos Activia 0% MG  0% azúcares añadidos": "Натуральный бифидойогурт с пробиотиками Activia 0% жирности, без добавленного сахара",
  "Bífidus natural probióticos Hacendado": "Натуральный бифидойогурт с пробиотиками Hacendado",
  "Bífidus natural probióticos Hacendado 0% MG 0% azúcares añadidos": "Натуральный бифидойогурт с пробиотиками Hacendado 0% жирности, без добавленного сахара",
  "Bífidus natural probióticos Hacendado con coco, almendras y chocolate": "Натуральный бифидойогурт с пробиотиками Hacendado с кокосом, миндалём и шоколадом",

  // ── Bollería dulce
  "12 Mini croissants de mantequilla": "12 мини-круассанов на сливочном масле",
  "6 Croissant rellenos de cacao": "6 круассанов с какао-начинкой",
  "Berlina al cacao": "Пончик берлинер с какао",
  "Berlina glacé": "Пончик берлинер в глазури",
  "Bizcocho azúcar sin gluten": "Бисквит с сахаром без глютена",
  "Bizcocho con azúcar moreno y nueces": "Бисквит с коричневым сахаром и орехами",
  "Bizcocho de cacao": "Какао-бисквит",
  "Bizcocho de chocolate sin gluten y sin lactosa": "Шоколадный бисквит без глютена и без лактозы",
  "Bizcocho de manzana": "Яблочный бисквит",
  "Bizcocho de yogur Hacendado": "Йогуртовый бисквит Hacendado",
  "Bizcocho relleno de caramelo salado": "Бисквит с начинкой из солёной карамели",
  "Ensaimada": "Энсаймада (спиральная булочка)",
  "Fartons": "Фартоны (сладкие булочки)",
  "Magdalenas con azúcar": "Кексы магдалены с сахаром",
  "Magdalenas con pepitas de chocolate": "Кексы магдалены с шоколадной крошкой",
  "Napolitana de chocolate": "Слойка наполитана с шоколадом",
  "Napolitana de crema": "Слойка наполитана с кремом",
  "Pastel de crema 65%": "Пирожное с кремом 65%",
  "Pepito de crema": "Булочка пепито с кремом",
  "Rosquillas al cacao": "Пончики-колечки с какао",
  "Trenza con nueces pecán": "Плетёнка с орехами пекан",

  // ── Bollería envasada
  "Bizcocho Hacendado": "Бисквит Hacendado",
  "Bizcochos de huevo Hacendado": "Яичные бисквиты Hacendado",
  "Bizcochos Hacendado": "Бисквиты Hacendado",
  "Bocaditos bañados al cacao Hacendado": "Пирожные в какао-глазури Hacendado",
  "Bollo con pepitas de chocolate Hacendado Choco Buns": "Булочки с шоколадной крошкой Hacendado Choco Buns",
  "Caña de hojaldre rellena de crema sabor vainilla Hacendado con cobertura de cacao": "Слоёная трубочка с ванильным кремом Hacendado в какао-глазури",
  "Crepes rellenos de chocolate Hacendado": "Блинчики с шоколадной начинкой Hacendado",
  "Croissant Hacendado": "Круассан Hacendado",
  "Croissant relleno de crema al cacao Hacendado": "Круассан с какао-кремом Hacendado",
  "Ensaimadas Hacendado": "Энсаймады Hacendado",
  "Fartons tradicionales Polo": "Традиционные фартоны Polo",
  "Gofres clásicos Hacendado": "Классические вафли Hacendado",
  "Gofres con chocolate Hacendado": "Вафли с шоколадом Hacendado",
  "Magdalenas al cacao Hacendado": "Кексы магдалены с какао Hacendado",
  "Magdalenas Hacendado": "Кексы магдалены Hacendado",
  "Magdalenas integrales 0% azúcares añadidos Hacendado": "Цельнозерновые кексы магдалены без добавленного сахара Hacendado",
  "Magdalenas sin gluten Hacendado": "Кексы магдалены без глютена Hacendado",
  "Mantecadas Hacendado": "Кексы мантекадас Hacendado",
  "Mini magdalenas con pepitas de chocolate con leche Hacendado": "Мини-кексы с кусочками молочного шоколада Hacendado",
  "Napolitanas con relleno de cacao Hacendado": "Слойки наполитана с какао-начинкой Hacendado",
  "Napolitanas con relleno sabor crema Hacendado": "Слойки наполитана с начинкой со вкусом крема Hacendado",
  "Palmeritas Hacendado": "Мини-пальмеры (слоёное печенье) Hacendado",
  "Pan de leche Hacendado": "Молочные булочки Hacendado",
  "Rosegones pasta de almendras Hacendado": "Росегоны с миндальной пастой Hacendado",
  "Sobaos Hacendado": "Кексы собаос Hacendado",
  "Tortas de aceite Inés Rosales": "Лепёшки на оливковом масле Inés Rosales",
  "Tortas de aceite Inés Rosales sin azúcar": "Лепёшки на оливковом масле Inés Rosales без сахара",
  "Valencianas Hacendado": "Бисквитные кексы валенсианас Hacendado",

  // ── Bollería salada
  "24 Mini saladas surtidas": "24 мини-закуски ассорти",
  "6 Mini empanadillas de pisto": "6 мини-пирожков с овощным писто",
  "Empanada de atún": "Эмпанада с тунцом",
  "Empanada de atún grande": "Большая эмпанада с тунцом",
  "Empanada de carne": "Эмпанада с мясом",
  "Empanadilla de atún": "Пирожок эмпанадилья с тунцом",
  "Empanadilla de bacon y queso": "Пирожок эмпанадилья с беконом и сыром",
  "Empanadilla de espinacas 26%": "Пирожок эмпанадилья со шпинатом 26%",
  "Empanadilla de pollo y bechamel": "Пирожок эмпанадилья с курицей и бешамелем",
  "Empanadilla de tomate": "Пирожок эмпанадилья с томатом",
  "Napolitana mixta": "Слойка наполитана с ветчиной и сыром",

  // ── Bonito
  "Bonito del norte en aceite de oliva Hacendado": "Северный тунец бонито в оливковом масле Hacendado",
  "Filetes de bonito del norte en aceite de oliva Hacendado": "Филе северного тунца бонито в оливковом масле Hacendado",
  "Migas de bonito del norte en aceite de oliva Hacendado": "Кусочки северного тунца бонито в оливковом масле Hacendado",

  // ── Caballa y melva
  "Filetes de caballa del sur contenido reducido en sal Hacendado en aceite de oliva": "Филе южной скумбрии с пониженным содержанием соли Hacendado в оливковом масле",
  "Filetes de caballa del sur en tomate Hacendado": "Филе южной скумбрии в томате Hacendado",
  "Filetes de melva canutera con pimientos del piquillo Hacendado en aceite de oliva": "Филе мелвы канутеры с перцем пикильо Hacendado в оливковом масле",
  "Filetes de melva en aceite de oliva Hacendado": "Филе мелвы в оливковом масле Hacendado",

  // ── Cacao soluble
  "Cacao soluble ColaCao original": "Растворимое какао ColaCao оригинальное",
  "Cacao soluble Hacendado": "Растворимое какао Hacendado",
  "Cacao soluble instantáneo Hacendado": "Быстрорастворимое какао Hacendado",
  "Cacao soluble instantáneo Nesquik": "Быстрорастворимое какао Nesquik",

  // ── Café soluble
  "Café soluble cappuccino Hacendado": "Растворимый кофе капучино Hacendado",
  "Café soluble Classic Hacendado": "Растворимый кофе Classic Hacendado",
  "Café soluble descafeinado Hacendado": "Растворимый кофе без кофеина Hacendado",
  "Café soluble Espresso Creme Hacendado": "Растворимый кофе Espresso Creme Hacendado",

  // ── Caldo líquido
  "Caldo de marisco o fideuá para paella Hacendado con sofrito": "Бульон из морепродуктов для паэльи или фидеуа Hacendado с софрито",
  "Caldo de pollo casero Gallina Blanca": "Домашний куриный бульон Gallina Blanca",
  "Caldo de verduras Hacendado": "Овощной бульон Hacendado",
  "Fumet caldo de pescado Hacendado": "Рыбный бульон фюме Hacendado",

  // ── Cápsulas compatibles Dolce gusto
  "Café con leche en cápsula descafeinado Hacendado": "Кофе с молоком в капсулах без кофеина Hacendado",
  "Café con leche en cápsula Dolce Gusto": "Кофе с молоком в капсулах Dolce Gusto",
  "Café con leche en cápsula Hacendado": "Кофе с молоком в капсулах Hacendado",
  "Café cortado en cápsula Hacendado": "Кофе кортадо в капсулах Hacendado",
  "Café en cápsula cappuccino Hacendado": "Кофе капучино в капсулах Hacendado",
  "Café en cápsula cortado Dolce Gusto": "Кофе кортадо в капсулах Dolce Gusto",
  "Café en cápsula extra forte Hacendado": "Кофе в капсулах экстра форте Hacendado",
  "Café en cápsula forte Hacendado": "Кофе в капсулах форте Hacendado",
  "Cortado en cápsula descafeinado Hacendado": "Кортадо в капсулах без кофеина Hacendado",

  // ── Cápsulas compatibles Nespresso
  "Café en cápsula ristretto Hacendado": "Кофе ристретто в капсулах Hacendado",

  // ── Carne
  "Albóndigas guisadas Hacendado": "Тушёные фрикадельки Hacendado",
  "Alitas de pollo asadas Hacendado": "Запечённые куриные крылышки Hacendado",
  "Carne de cerdo Pulled Pork Hacendado sabor barbacoa": "Рваная свинина Pulled Pork Hacendado со вкусом барбекю",
  "Codillo de cerdo asado Hacendado": "Запечённая свиная рулька Hacendado",
  "Costillas de cerdo a la barbacoa cortadas Hacendado": "Свиные рёбрышки барбекю нарезанные Hacendado",
  "Migas Hacendado": "Мигас (жареные хлебные крошки) Hacendado",
  "Muslo de pato confitado Hacendado": "Утиная ножка конфи Hacendado",
  "Pollo asado Hacendado": "Запечённая курица Hacendado",
  "Pollo asado troceado Hacendado": "Запечённая курица кусочками Hacendado",
  "Roti de pollo relleno de jamón y queso Hacendado": "Куриный рулет с ветчиной и сыром Hacendado",

  // ── Cerdo
  "Fiambre de magreta de cerdo adobada": "Маринованная свиная лопатка, нарезка",
  "Fiambre de magro de cerdo adobado": "Маринованная постная свинина, нарезка",

  // ── Cereales
  "Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos": "Кукурузные хлопья Corn Flakes Hacendado без добавленного сахара",
  "Cereales copos de maíz Corn Flakes Kellogg's": "Кукурузные хлопья Corn Flakes Kellogg's",
  "Cereales copos de trigo Chocodays Hacendado con chocolate": "Пшеничные хлопья Chocodays Hacendado с шоколадом",
  "Cereales de arroz inflado Choco Krispies Kellogg's con chocolate": "Воздушный рис Choco Krispies Kellogg's с шоколадом",
  "Cereales estrellas de maíz Stars Hacendado con miel": "Кукурузные звёздочки Stars Hacendado с мёдом",
  "Cereales rellenos de cacao y avellana Hacendado": "Подушечки с какао и фундуком Hacendado",
  "Cereales rellenos de crema de cacao y avellana Hacendado sin gluten": "Подушечки с кремом из какао и фундука Hacendado без глютена",
  "Cereales rellenos de leche Hacendado": "Подушечки с молочной начинкой Hacendado",
  "Mini cereales rellenos de leche Hacendado": "Мини-подушечки с молочной начинкой Hacendado",

  // ── Cereales integrales y muesli
  "Avena molida Hacendado": "Молотая овсянка Hacendado",
  "Cereales avena Crunchy Hacendado": "Овсяные хлопья Crunchy Hacendado",
  "Cereales avena Crunchy Hacendado de cacao": "Овсяные хлопья Crunchy Hacendado с какао",
  "Cereales Cereal Mix Hacendado 0% azúcares añadidos": "Хлопья Cereal Mix Hacendado без добавленного сахара",
  "Cereales con salvado de trigo Fibra Sticks Hacendado": "Хлопья с пшеничными отрубями Fibra Sticks Hacendado",
  "Cereales copos de trigo espelta integral Hacendado 0% azúcares añadidos": "Хлопья из цельнозерновой полбы Hacendado без добавленного сахара",
  "Cereales copos de trigo integral y arroz Hacendado 0% azúcares añadidos": "Хлопья из цельной пшеницы и риса Hacendado без добавленного сахара",
  "Cereales copos de trigo integral y arroz Hacendado bañados en chocolate con leche": "Хлопья из цельной пшеницы и риса Hacendado в молочном шоколаде",
  "Cereales copos de trigo integral y arroz Special K Classic": "Хлопья из цельной пшеницы и риса Special K Classic",
  "Cereales copos tostados de trigo integral y arroz Hacendado con chocolate": "Поджаренные хлопья из цельной пшеницы и риса Hacendado с шоколадом",
  "Copos avena tostada Hacendado con semillas y frutos secos": "Поджаренные овсяные хлопья Hacendado с семенами и орехами",
  "Copos de avena Brüggen": "Овсяные хлопья Brüggen",
  "Copos de avena integral con chocolate Hacendado": "Цельнозерновые овсяные хлопья с шоколадом Hacendado",
  "Copos de avena sin gluten Hacendado": "Овсяные хлопья без глютена Hacendado",
  "Muesli Crunchy Hacendado con chocolate": "Мюсли Crunchy Hacendado с шоколадом",
  "Muesli Crunchy Hacendado con fruta": "Мюсли Crunchy Hacendado с фруктами",
  "Muesli Crunchy Hacendado con frutos secos": "Мюсли Crunchy Hacendado с орехами",
  "Muesli Crunchy Hacendado sin azúcares añadidos": "Мюсли Crunchy Hacendado без добавленного сахара",
  "Muesli Hacendado 50% frutas y frutos secos": "Мюсли Hacendado 50% фруктов и орехов",
  "Muesli Hacendado con frutas": "Мюсли Hacendado с фруктами",
  "Muesli Hacendado con quinoa, chía y chocolate negro": "Мюсли Hacendado с киноа, чиа и тёмным шоколадом",

  // ── Chocolate a la taza
  "Cacao en polvo a la taza Hacendado": "Какао-порошок для горячего шоколада Hacendado",
  "Cacao puro en polvo La Chocolatera": "Чистый какао-порошок La Chocolatera",
  "Chocolate líquido a la taza Hacendado": "Жидкий горячий шоколад Hacendado",

  // ── Chocolate blanco
  "Chocolate blanco fundir Hacendado": "Белый шоколад для растапливания Hacendado",
  "Chocolate blanco Fussion Hacendado relleno de crema de galleta y cacao": "Белый шоколад Fussion Hacendado с кремом из печенья и какао",
  "Chocolate blanco Hacendado": "Белый шоколад Hacendado",

  // ── Chocolate con leche
  "Chocolate con leche classic Hacendado extrafino": "Молочный шоколад classic Hacendado экстрафайн",
  "Chocolate con leche extrafino Nestlé": "Молочный шоколад экстрафайн Nestlé",
  "Chocolate con leche fundir Hacendado": "Молочный шоколад для растапливания Hacendado",
  "Chocolate con leche Fussion Hacendado relleno crema de fresa": "Молочный шоколад Fussion Hacendado с клубничным кремом",
  "Chocolate con leche Fussion Hacendado relleno de crema de pistacho y masa filo tostada": "Молочный шоколад Fussion Hacendado с фисташковым кремом и хрустящим тестом фило",
  "Chocolate con leche Hacendado almendras enteras": "Молочный шоколад Hacendado с цельным миндалём",
  "Chocolate con leche Hacendado avellanas troceadas": "Молочный шоколад Hacendado с дроблёным фундуком",
  "Chocolate con leche Milka": "Молочный шоколад Milka",
  "Chocolate con leche Milka galleta": "Молочный шоколад Milka с печеньем",
  "Chocolate con leche Milka galleta Oreo": "Молочный шоколад Milka с печеньем Oreo",
  "Chocolate con leche Valor almendras enteras": "Молочный шоколад Valor с цельным миндалём",
  "Chocolate extrafino con leche Hacendado 0% azúcares añadidos": "Молочный шоколад экстрафайн Hacendado без добавленного сахара",
  "Chocolate extrafino con leche Hacendado almendras enteras": "Молочный шоколад экстрафайн Hacendado с цельным миндалём",
  "Fideos de chocolate Hacendado": "Шоколадная посыпка Hacendado",

  // ── Chocolate negro
  "99% cacao negro Hacendado": "Тёмный шоколад 99% какао Hacendado",
  "Chocolate negro 55% cacao Hacendado": "Тёмный шоколад 55% какао Hacendado",
  "Chocolate negro 55% cacao Hacendado con almendras": "Тёмный шоколад 55% какао Hacendado с миндалём",
  "Chocolate negro 70% cacao fundir Hacendado 0% azúcares añadidos": "Тёмный шоколад 70% какао для растапливания Hacendado без добавленного сахара",
  "Chocolate negro 72% cacao Hacendado con trozos de naranja": "Тёмный шоколад 72% какао Hacendado с кусочками апельсина",
  "Chocolate negro 72% de cacao Hacendado": "Тёмный шоколад 72% какао Hacendado",
  "Chocolate negro 72% de cacao Hacendado con almendras enteras": "Тёмный шоколад 72% какао Hacendado с цельным миндалём",
  "Chocolate negro 85% cacao extrafino y edulcorante Hacendado 0% azúcares añadidos": "Тёмный шоколад 85% какао экстрафайн с подсластителем Hacendado без добавленного сахара",
  "Chocolate negro 85% cacao Hacendado": "Тёмный шоколад 85% какао Hacendado",
  "Chocolate negro fundir Hacendado": "Тёмный шоколад для растапливания Hacendado",
  "Chocolate puro Valor": "Горький шоколад Valor",
  "Gotas de chocolate negro para fundir Hacendado": "Капли тёмного шоколада для растапливания Hacendado",
  "Porciones de chocolate negro 72% cacao extrafino Hacendado": "Порционный тёмный шоколад 72% какао экстрафайн Hacendado",
  "Porciones de Chocolate negro 85% cacao extrafino Hacendado": "Порционный тёмный шоколад 85% какао экстрафайн Hacendado",

  // ── Chocolatinas
  "Barritas crujientes Hacendado recubiertas de chocolate con leche": "Хрустящие батончики Hacendado в молочном шоколаде",
  "Barritas de barquillo Hacendado con relleno de avellana cubiertas de chocolate con leche": "Вафельные батончики Hacendado с ореховой начинкой в молочном шоколаде",
  "Barritas de barquillo Huesitos bañadas de chocolate con leche": "Вафельные батончики Huesitos в молочном шоколаде",
  "Barritas de barquillo Kit-Kat bañadas de chocolate con leche": "Вафельные батончики Kit-Kat в молочном шоколаде",
  "Barritas de barquillo Meivel rellenas de turrón Viena y cacahuete": "Вафельные батончики Meivel с нугой туррон Viena и арахисом",
  "Barritas de barquillo Tokke original": "Вафельные батончики Tokke оригинальные",
  "Barritas de chocolate con leche Hacendado rellenas de leche": "Батончики из молочного шоколада Hacendado с молочной начинкой",
  "Barritas Peanuts Hacendado bañadas de chocolate con leche y rellenas con caramelo, cacahuetes tostados y crema azucarada": "Батончики Peanuts Hacendado в молочном шоколаде с карамелью, жареным арахисом и сладким кремом",
  "Cacahuetes Chocoiris Hacendado bañados de chocolate con leche coloreados": "Арахис Chocoiris Hacendado в цветном молочном шоколаде",
  "Cacahuetes Hacendado chocolate con leche": "Арахис Hacendado в молочном шоколаде",
  "Cacahuetes Hacendado chocolate negro": "Арахис Hacendado в тёмном шоколаде",
  "Disquitos Pintarolas de chocolate con leche coloreados": "Цветные драже Pintarolas из молочного шоколада",
  "Huevo sorpresa de chocolate Hacendado": "Шоколадное яйцо с сюрпризом Hacendado",
  "Huevos sorpresa de chocolate Hacendado dibujo": "Шоколадные яйца с сюрпризом Hacendado с рисунком",
  "Mix mini barritas de chocolate Hacendado": "Ассорти мини-батончиков из шоколада Hacendado",
  "Pistachos bañados de chocolate con leche Hacendado": "Фисташки в молочном шоколаде Hacendado",

  // ── Chopped
  "Chopped cerdo Hacendado lonchas": "Свиной чоппед Hacendado ломтики",
  "Chopped cocido en lata Hacendado finas lonchas": "Варёный чоппед в банке Hacendado тонкие ломтики",
  "Chopped Hacendado": "Чоппед Hacendado",

  // ── Chorizo
  "Chorizo cular ibérico extra La Hacienda del ibérico": "Иберийское чоризо кулар экстра La Hacienda del ibérico",
  "Chorizo de bellota ibérico cortado a máquina": "Иберийское чоризо из желудёвой свинины, машинная нарезка",
  "Chorizo de pavo extra Hacendado lonchas": "Чоризо из индейки экстра Hacendado ломтики",
  "Chorizo de Tarancón Bricio": "Чоризо из Таранкона Bricio",
  "Chorizo dulce extra Hacendado": "Сладкое чоризо экстра Hacendado",
  "Chorizo extra Hacendado lonchas": "Чоризо экстра Hacendado ломтики",
  "Chorizo extra pimienta Hacendado finas lonchas": "Чоризо экстра с перцем Hacendado тонкие ломтики",
  "Chorizo ibérico extra La Hacienda del ibérico lonchas": "Иберийское чоризо экстра La Hacienda del ibérico ломтики",
  "Chorizo ibérico La Hacienda del ibérico": "Иберийское чоризо La Hacienda del ibérico",
  "Chorizo Pamplona extra Hacendado lonchas": "Чоризо Памплона экстра Hacendado ломтики",
  "Chorizo picante extra Hacendado": "Острое чоризо экстра Hacendado",
  "Chorizo picante extra Hacendado lonchas": "Острое чоризо экстра Hacendado ломтики",
  "Chorizo sarta dulce extra de León Hacendado": "Сладкое чоризо подковой экстра из Леона Hacendado",
  "Chorizo sarta picante extra de León Hacendado": "Острое чоризо подковой экстра из Леона Hacendado",
  "Mini chorizo ibérico extra La Hacienda del ibérico": "Мини-чоризо иберийское экстра La Hacienda del ibérico",
  "Taquitos de chorizo extra Revilla": "Кубики чоризо экстра Revilla",

  // ── Cítricos
  "Mandarina": "Мандарин",
  "Naranja de mesa": "Столовый апельсин",
  "Naranjas": "Апельсины",

  // ── Cocktails
  "Cocktail de fruta deshidratada Hacendado": "Ассорти сушёных фруктов Hacendado",
  "Cocktail frutos secos Crunchy Hacendado sabores a barbacoa, Tex-Mex, miel y sal": "Ореховый микс Crunchy Hacendado со вкусами барбекю, Tex-Mex, мёда и соли",
  "Cocktail frutos secos mezcla Hacendado": "Ореховый микс Hacendado",
  "Cocktail frutos secos natural Hacendado": "Натуральный ореховый микс Hacendado",
  "Cocktail frutos secos Rodeo Hacendado": "Ореховый микс Rodeo Hacendado",
  "Cocktail frutos secos Rumba Hacendado": "Ореховый микс Rumba Hacendado",
  "Cocktail frutos secos tostados 0% sal añadida Hacendado": "Жареный ореховый микс без добавленной соли Hacendado",
  "Cocktail frutos secos tostados Hacendado sabor ahumado": "Жареный ореховый микс Hacendado со вкусом копчения",
  "Combinado frutos secos Hacendado": "Ореховое ассорти Hacendado",

  // ── Cóctel y banderillas
  "Banderillas dulces Hacendado": "Сладкие шпажки из маринадов Hacendado",
  "Banderillas picantes Hacendado": "Острые шпажки из маринадов Hacendado",
  "Mix de encurtidos Hacendado": "Ассорти маринованных овощей Hacendado",

  // ── Cola clásica
  "Refresco Coca-Cola": "Газированный напиток Coca-Cola",

  // ── Cola zero
  "Refresco Coca-Cola light": "Газированный напиток Coca-Cola light",
  "Refresco Coca-Cola zero azúcar": "Газированный напиток Coca-Cola zero без сахара",
  "Refresco Coca-Cola zero azúcar zero cafeína": "Газированный напиток Coca-Cola zero без сахара и без кофеина",
  "Refresco cola Hacendado zero azúcar": "Кола Hacendado без сахара",
  "Refresco cola Hacendado zero azúcar zero cafeína": "Кола Hacendado без сахара и без кофеина",

  // ── Colesterol y otros
  "Bebida Kéfir de coco Hacendado": "Кокосовый кефир Hacendado",
  "Bebida Kéfir de fresa y plátano Hacendado": "Кефир с клубникой и бананом Hacendado",
  "Bebida Kéfir natural Hacendado 0% MG": "Натуральный кефир Hacendado 0% жирности",
  "Bebida láctea de fresa Cuidacol 0% azúcares añadidos": "Молочный напиток с клубникой Cuidacol без добавленного сахара",
  "Bebida láctea de fresa Danacol 0% azúcares añadidos 0% MG": "Молочный напиток с клубникой Danacol без добавленного сахара, 0% жирности",
  "Bebida láctea natural Danacol 0% azúcares añadidos 0% MG": "Натуральный молочный напиток Danacol без добавленного сахара, 0% жирности",

  // ── Con chocolate y rellenas
  "Barquillos con crema de avellanas Hacendado": "Вафельные трубочки с ореховым кремом Hacendado",
  "Barquillos de cacao rellenos con crema de leche y de avellanas Knoppers": "Какао-вафли с молочным и ореховым кремом Knoppers",
  "Barquillos rellenos con crema de cacao Hacendado": "Вафельные трубочки с какао-кремом Hacendado",
  "Barquillos rellenos de nata Hacendado 0% azúcares añadidos": "Вафельные трубочки со сливками Hacendado без добавленного сахара",
  "Barquillos rellenos sabor nata Hacendado": "Вафельные трубочки со вкусом сливок Hacendado",
  "Barritas de galleta bañadas en chocolate con leche Chips Ahoy": "Печенье-батончики в молочном шоколаде Chips Ahoy",
  "Galletas Choco leche con chocolatina Hacendado": "Печенье Choco leche с плиткой молочного шоколада Hacendado",
  "Galletas Choco negro con chocolatina Hacendado": "Печенье Choco negro с плиткой тёмного шоколада Hacendado",
  "Galletas Chocominis sabor chocolate Hacendado": "Печенье Chocominis со вкусом шоколада Hacendado",
  "Galletas Classic Choc Hacendado": "Печенье Classic Choc Hacendado",
  "Galletas con chocolate blanco Hacendado": "Печенье с белым шоколадом Hacendado",
  "Galletas con chocolate y crema de leche Hacendado": "Печенье с шоколадом и молочным кремом Hacendado",
  "Galletas Cookies Hacendado": "Печенье Cookies Hacendado",
  "Galletas cookies sin gluten y sin lactosa Hacendado": "Печенье cookies без глютена и без лактозы Hacendado",
  "Galletas Crunchy Choc Hacendado": "Печенье Crunchy Choc Hacendado",
  "Galletas de cacao Caocream bañadas de chocolate blanco Hacendado rellenas de crema": "Какао-печенье Caocream в белом шоколаде Hacendado с кремовой начинкой",
  "Galletas de cacao Caocream Hacendado rellenas de crema": "Какао-печенье Caocream Hacendado с кремовой начинкой",
  "Galletas Digestive avena chocolate con leche Hacendado": "Печенье Digestive с овсом и молочным шоколадом Hacendado",
  "Galletas Digestive chocolate con leche Hacendado": "Печенье Digestive с молочным шоколадом Hacendado",
  "Galletas Diverkao Hacendado": "Печенье Diverkao Hacendado",
  "Galletas Divertidas chocolate con leche Hacendado": "Печенье Divertidas с молочным шоколадом Hacendado",
  "Galletas rebuenas Hacendado rellenas de chocolate": "Печенье rebuenas Hacendado с шоколадной начинкой",
  "Galletas rellenas de chocolate Hacendado 0% azúcares añadidos": "Печенье с шоколадной начинкой Hacendado без добавленного сахара",
  "Galletas Roditas bañadas con chocolate blanco Hacendado": "Печенье Roditas в белом шоколаде Hacendado",
  "Mini galletas caritas Hacendado con crema de cacao": "Мини-печенье «рожицы» Hacendado с какао-кремом",
  "Mini galletas Cookies Hacendado": "Мини-печенье Cookies Hacendado",
  "Mini galletas de cacao Caocream Hacendado rellenas de crema": "Мини-печенье какао Caocream Hacendado с кремовой начинкой",
  "Rosquillas de chocolate con leche y coco Hacendado": "Пончики-колечки в молочном шоколаде с кокосом Hacendado",
  "Tartaletas con relleno de fresa Hacendado": "Тарталетки с клубничной начинкой Hacendado",

  // ── Conservas fruta
  "Dulce de membrillo Hacendado 0% azúcares añadidos": "Мармелад из айвы Hacendado без добавленного сахара",
  "Macedonia mix de frutas en almíbar Hacendado": "Фруктовый салат-ассорти в сиропе Hacendado",
  "Melocotón en almíbar Hacendado": "Персики в сиропе Hacendado",
  "Melocotón light Hacendado sin azúcares añadidos": "Персики лайт Hacendado без добавленного сахара",
  "Piña en su jugo Hacendado rodajas": "Ананас в собственном соку Hacendado кольцами",
  "Postre de manzana Jamar": "Яблочный десерт Jamar",

  // ── Conservas verdura
  "Acelgas troceadas Hacendado": "Мангольд нарезанный Hacendado",
  "Champiñón entero Hacendado": "Целые шампиньоны Hacendado",
  "Champiñón laminado Hacendado": "Шампиньоны пластинками Hacendado",
  "Chucrut al estilo bávaro Hengstenberg": "Квашеная капуста по-баварски Hengstenberg",
  "Corazones de alcachofa Hacendado": "Сердцевины артишоков Hacendado",
  "Ensalada china Hacendado con mazorquitas": "Китайский салат Hacendado с мини-кукурузой",
  "Espárragos blancos delgados Hacendado cortos": "Тонкая белая спаржа Hacendado короткая",
  "Espárragos blancos gruesos Hacendado cortos": "Толстая белая спаржа Hacendado короткая",
  "Espárragos blancos medianos Hacendado": "Средняя белая спаржа Hacendado",
  "Espárragos blancos muy gruesos Hacendado enteros": "Очень толстая белая спаржа Hacendado целая",
  "Guisantes extra Hacendado": "Зелёный горошек экстра Hacendado",
  "Judías verdes planas Hacendado": "Плоская стручковая фасоль Hacendado",
  "Judías verdes redondas Hacendado": "Круглая стручковая фасоль Hacendado",
  "Macedonia de verduras Hacendado": "Овощное ассорти Hacendado",
  "Maíz dulce Hacendado": "Сладкая кукуруза Hacendado",
  "Mazorquitas de maíz agridulce Hacendado": "Мини-кукуруза кисло-сладкая Hacendado",
  "Palmito al natural entero Hacendado": "Пальмовая сердцевина целая Hacendado",
  "Patatas cocidas Hacendado": "Варёный картофель Hacendado",
  "Pimientos asados en tiras Hacendado": "Печёный перец полосками Hacendado",
  "Pimientos del piquillo enteros Hacendado extra": "Перец пикильо целый Hacendado экстра",
  "Pimientos en tiras condimentados Hacendado": "Приправленный перец полосками Hacendado",
  "Remolacha en tiras Hacendado": "Свёкла соломкой Hacendado",
  "Verduras asadas Hacendado": "Печёные овощи Hacendado",
  "Zanahoria en tiras Hacendado": "Морковь соломкой Hacendado",

  // ── Crakers y tartaletas
  "Crackers 30% integral": "Крекеры 30% цельнозерновые",
  "Crackers con sal Hacendado": "Солёные крекеры Hacendado",
  "Crackers integrales de espelta Bachman": "Цельнозерновые крекеры из полбы Bachman",
  "Crackers sin gluten Hacendado con romero": "Крекеры без глютена Hacendado с розмарином",
  "Galletas saladas salpicks Galbusera": "Солёное печенье salpicks Galbusera",
  "Pan de fibra y sésamo Hacendado": "Хлебцы с клетчаткой и кунжутом Hacendado",
  "Tostadas de arroz y maíz Hacendado": "Рисово-кукурузные хлебцы Hacendado",

  // ── Cremas de untar
  "Crema al cacao con avellanas Hacendado": "Какао-крем с фундуком Hacendado",
  "Crema al cacao con avellanas Nocilla original": "Какао-крем с фундуком Nocilla оригинальный",
  "Crema al cacao con avellanas Nutella": "Какао-крем с фундуком Nutella",
  "Crema al cacao y leche con avellanas Nocilla": "Какао-молочный крем с фундуком Nocilla",
  "Crema de avellanas y cacao Hacendado": "Крем из фундука и какао Hacendado",
  "Crema de cacahuete 100% Hacendado": "Арахисовая паста 100% Hacendado",
  "Dulce de leche Chimbote": "Варёная сгущёнка дульсе де лече Chimbote",

  // ── Cremas y puré
  "Crema de calabacín Hacendado": "Крем-суп из кабачков Hacendado",
  "Crema de calabaza Hacendado": "Тыквенный крем-суп Hacendado",
  "Crema de calabaza y zanahoria Hacendado": "Крем-суп из тыквы и моркови Hacendado",
  "Crema de espárragos Hacendado": "Крем-суп из спаржи Hacendado",
  "Crema de lentejas Hacendado": "Чечевичный крем-суп Hacendado",
  "Crema de setas Starlux con champiñones": "Грибной крем-суп Starlux с шампиньонами",
  "Crema de verduras Hacendado": "Овощной крем-суп Hacendado",

  // ── Edulcorante y otros
  "Edulcorante en pastillas stevia Hacendado": "Подсластитель стевия в таблетках Hacendado",
  "Edulcorante sacarina en sobres Hacendado": "Подсластитель сахарин в пакетиках Hacendado",
  "Sirope de agave Hacendado": "Сироп агавы Hacendado",

  // ── Empanados y elaborados
  "Lomo de cerdo marinado empanado sin gluten": "Маринованная свиная корейка в панировке без глютена",
  "Oreja de cerdo cocida adobada Rogusa": "Варёное маринованное свиное ухо Rogusa",

  // ── Empanados y rebozados congelados
  "Croquetas de cocido Hacendado ultracongeladas": "Крокеты из косидо Hacendado быстрозамороженные",
  "Pollo marinado rebozado Crispy American Style Hacendado ultracongelado": "Маринованная курица в кляре Crispy American Style Hacendado быстрозамороженная",

  // ── Energético
  "Bebida energética Energy Drink Hacendado": "Энергетический напиток Energy Drink Hacendado",
  "Bebida energética Energy Monster": "Энергетический напиток Energy Monster",
  "Bebida energética Furious Energy drink Hacendado": "Энергетический напиток Furious Energy drink Hacendado",
  "Bebida energética Red Bull": "Энергетический напиток Red Bull",
  "Bebida energética Zero Energy Drink Hacendado": "Энергетический напиток Zero Energy Drink Hacendado",

  // ── Ensalada preparada
  "Ensalada César": "Салат «Цезарь»",
  "Ensalada de la casa": "Фирменный салат",
  "Ensalada de pasta": "Салат с пастой",
  "Ensalada de pasta Listo para Comer": "Салат с пастой Listo para Comer",
  "Ensalada de pollo, queso y frutos secos Listo para Comer": "Салат с курицей, сыром и орехами Listo para Comer",
  "Ensalada ensatún": "Салат с тунцом энсатун",
  "Ensalada queso de cabra": "Салат с козьим сыром",
  "Wraps Texas": "Роллы Texas",

  // ── Ensaladilla
  "Ensaladilla americana Hacendado": "Американский салат Hacendado",
  "Ensaladilla Delicias del mar Hacendado": "Салат «Морские деликатесы» Hacendado",
  "Ensaladilla rusa Hacendado": "Салат оливье Hacendado",
  "Patatas con allioli Hacendado": "Картофель с айоли Hacendado",

  // ── Fideos orientales
  "Fideos orientales sabor pollo Hacendado": "Восточная лапша со вкусом курицы Hacendado",

  // ── Flan
  "Flan de café Hacendado": "Кофейный флан Hacendado",
  "Flan de huevo +Proteínas 10 g 0% MG 0% azúcares añadidos": "Яичный флан +Протеин 10 г, 0% жирности, без добавленного сахара",
  "Flan de huevo Hacendado": "Яичный флан Hacendado",
  "Flan de huevo sin azúcares añadidos Hacendado": "Яичный флан без добавленного сахара Hacendado",
  "Flan de queso Hacendado": "Сырный флан Hacendado",
  "Flan de vainilla con caramelo Hacendado": "Ванильный флан с карамелью Hacendado",

  // ── Fruta + leche
  "Fruta + leche caribe Don Simón sin azúcares añadidos y zero materia grasa": "Фрукты + молоко «Карибы» Don Simón без добавленного сахара и жира",
  "Fruta + leche caribe Hacendado sin azúcares añadidos": "Фрукты + молоко «Карибы» Hacendado без добавленного сахара",
  "Fruta + leche mediterráneo Hacendado sin azúcares añadidos": "Фрукты + молоко «Средиземноморье» Hacendado без добавленного сахара",
  "Fruta + leche piña y coco Hacendado sin azúcares añadidos": "Фрукты + молоко ананас и кокос Hacendado без добавленного сахара",
  "Fruta + leche tropical Bifrutas": "Фрукты + молоко тропические Bifrutas",
  "Fruta + leche tropical Hacendado sin azúcares añadidos": "Фрукты + молоко тропические Hacendado без добавленного сахара",

  // ── Fruta desecada
  "Arándanos deshidratados Hacendado": "Сушёная клюква Hacendado",
  "Ciruelas desecadas sin hueso Hacendado": "Чернослив без косточек Hacendado",
  "Dátiles desecados sin hueso Hacendado": "Сушёные финики без косточек Hacendado",
  "Dátiles en rama Hacendado": "Финики на ветке Hacendado",
  "Dátiles Medjoul con hueso Hacendado": "Финики меджул с косточкой Hacendado",
  "Orejones albaricoque Hacendado": "Курага Hacendado",
  "Pasas moscatel sin semillas Hacendado": "Изюм мускатный без косточек Hacendado",
  "Pasas sultanas sin semillas Hacendado": "Изюм султана без косточек Hacendado",
  "Piña deshidratada Hacendado": "Сушёный ананас Hacendado",

  // ── Fruta tropical
  "Kiwis amarillos": "Жёлтые киви",
  "Piña": "Ананас",
  "Piña natural a rodajas": "Ананас натуральный кольцами",

  // ── Fruta variada y otros sabores
  "Bebida 5 frutas Hacendado sin azúcares añadidos": "Напиток «5 фруктов» Hacendado без добавленного сахара",
  "Bebida Bahamas Hacendado": "Напиток «Багамы» Hacendado",
  "Bebida de arándanos y frutas rojas Hacendado sin azúcares añadidos": "Напиток из клюквы и красных ягод Hacendado без добавленного сахара",
  "Bebida de frutas rojas antioxidante Hacendado sin azúcares añadidos": "Антиоксидантный напиток из красных ягод Hacendado без добавленного сахара",
  "Bebida de zumo de naranja, mango y zanahoria La Verja sin azúcares añadidos": "Напиток из апельсинового сока, манго и моркови La Verja без добавленного сахара",
  "Bebida multivitaminas Hacendado sin azúcares añadidos": "Мультивитаминный напиток Hacendado без добавленного сахара",
  "Bebida tropical Hacendado sin azúcares añadidos": "Тропический напиток Hacendado без добавленного сахара",

  // ── Frutos secos
  "Almendra frita y salada Hacendado pelada": "Жареный солёный миндаль Hacendado очищенный",
  "Almendra marcona Hacendado frita con sal": "Миндаль маркона Hacendado жареный с солью",
  "Almendra natural Hacendado": "Натуральный миндаль Hacendado",
  "Almendra tostada Hacendado 0% sal añadida con piel": "Жареный миндаль Hacendado без добавленной соли, в кожуре",
  "Almendra tostada y salada Hacendado con piel": "Жареный солёный миндаль Hacendado в кожуре",
  "Anacardo frito salado Hacendado": "Жареный солёный кешью Hacendado",
  "Anacardo natural Hacendado": "Натуральный кешью Hacendado",
  "Avellana tostada Hacendado 0% sal añadida": "Жареный фундук Hacendado без добавленной соли",
  "Cacahuete en polvo desgrasado +Proteínas 14 g 70% reducido en grasa": "Обезжиренный арахисовый порошок +Протеин 14 г, на 70% меньше жира",
  "Cacahuete frito con miel Hacendado": "Жареный арахис с мёдом Hacendado",
  "Cacahuete frito con sal Hacendado pelado": "Жареный арахис с солью Hacendado очищенный",
  "Cacahuete frito y salado Hacendado con piel": "Жареный солёный арахис Hacendado в кожуре",
  "Cacahuete tostado con sal Hacendado": "Обжаренный арахис с солью Hacendado",
  "Cacahuete tostado Hacendado 0% sal añadida": "Обжаренный арахис Hacendado без добавленной соли",
  "Cacahuete tostado Hacendado 0% sal añadida pelado": "Обжаренный арахис Hacendado без добавленной соли, очищенный",
  "Castañas cocidas y peladas Hacendado": "Варёные очищенные каштаны Hacendado",
  "Maíz frito crujiente y tierno Hacendado": "Жареная кукуруза хрустящая и нежная Hacendado",
  "Maíz frito gigante Hacendado": "Жареная кукуруза гигант Hacendado",
  "Mezcla semillas Hacendado": "Смесь семян Hacendado",
  "Nuez de Brasil natural Hacendado": "Натуральный бразильский орех Hacendado",
  "Nuez natural Hacendado": "Натуральный грецкий орех Hacendado",
  "Nuez natural Hacendado pelada": "Натуральный грецкий орех Hacendado очищенный",
  "Nuez Pecana natural Hacendado pelada": "Натуральный орех пекан Hacendado очищенный",
  "Nuez troceada pelada Hacendado": "Дроблёный очищенный грецкий орех Hacendado",
  "Palomitas de maíz con sal Hacendado para microondas": "Попкорн с солью Hacendado для микроволновки",
  "Palomitas de maíz sabor mantequilla Hacendado para microondas": "Попкорн со вкусом сливочного масла Hacendado для микроволновки",
  "Pipas calabaza tostadas Hacendado aguasal": "Обжаренные тыквенные семечки Hacendado в солёной воде",
  "Pipas de calabaza natural Hacendado peladas": "Натуральные тыквенные семечки Hacendado очищенные",
  "Pipas de girasol fritas Hacendado peladas": "Жареные подсолнечные семечки Hacendado очищенные",
  "Pipas girasol barbacoa Hacendado": "Подсолнечные семечки барбекю Hacendado",
  "Pipas girasol naturales Hacendado peladas": "Натуральные подсолнечные семечки Hacendado очищенные",
  "Pipas girasol tostadas Hacendado 0% sal añadida": "Обжаренные подсолнечные семечки Hacendado без добавленной соли",
  "Pipas girasol tostadas Hacendado gigante aguasal": "Обжаренные подсолнечные семечки Hacendado гигант в солёной воде",
  "Pipas girasol tostadas Hacendado gigante con sal": "Обжаренные подсолнечные семечки Hacendado гигант с солью",
  "Pistacho natural Hacendado pelado": "Натуральные фисташки Hacendado очищенные",
  "Pistacho tostado Hacendado 0% sal añadida": "Обжаренные фисташки Hacendado без добавленной соли",
  "Pistacho tostado Hacendado con sal": "Обжаренные фисташки Hacendado с солью",
  "Semillas de chía Hacendado": "Семена чиа Hacendado",
  "Semillas lino dorado Hacendado": "Золотистые семена льна Hacendado",
  "Semillas sésamo tostado Hacendado": "Обжаренные семена кунжута Hacendado",

  // ── Galletas desayuno
  "Galletas canela Hacendado": "Печенье с корицей Hacendado",
  "Galletas caramelizadas Lotus Biscoff": "Карамелизированное печенье Lotus Biscoff",
  "Galletas de mantequilla Hacendado Belgas": "Бельгийское печенье на сливочном масле Hacendado",
  "Galletas Divertidas con cereales Hacendado": "Печенье Divertidas со злаками Hacendado",
  "Galletas María dorada Hacendado": "Печенье «Мария» золотистое Hacendado",
  "Galletas María dorada Hacendado 0% azúcares añadidos": "Печенье «Мария» золотистое Hacendado без добавленного сахара",
  "Galletas María Hacendado": "Печенье «Мария» Hacendado",
  "Galletas María sin gluten y sin lactosa Hacendado": "Печенье «Мария» без глютена и без лактозы Hacendado",
  "Galletas Relieve Hacendado": "Печенье Relieve Hacendado",
  "Galletas tostadas Animadas Hacendado": "Поджаристое печенье Animadas Hacendado",
  "Galletas tostadas Hacendado": "Поджаристое печенье Hacendado",
  "Galletas tostadas Tosta Rica": "Поджаристое печенье Tosta Rica",
  "Galletas tradicionales Hacendado": "Традиционное печенье Hacendado",
  "Pastas de aceite Hacendado": "Печенье на растительном масле Hacendado",

  // ── Galletas integrales y digestive
  "Galletas avena Hacendado": "Овсяное печенье Hacendado",
  "Galletas de espelta Hacendado 0% azúcares añadidos": "Печенье из полбы Hacendado без добавленного сахара",
  "Galletas Digestive 0% azúcares añadidos Hacendado": "Печенье Digestive без добавленного сахара Hacendado",
  "Galletas Digestive Hacendado": "Печенье Digestive Hacendado",
  "Galletas Digestive manzana & avena Hacendado": "Печенье Digestive яблоко и овёс Hacendado",
  "Galletas María Integral Hacendado": "Цельнозерновое печенье «Мария» Hacendado",

  // ── Galletas surtidas
  "Obleas para helado Hacendado": "Вафли для мороженого Hacendado",
  "Surtido de galletas y barquillos Hacendado": "Ассорти печенья и вафель Hacendado",
  "Surtido de pastas artesanas Hacendado": "Ассорти домашнего печенья Hacendado",

  // ── Garbanzos
  "Garbanzo cocido Hacendado": "Варёный нут Hacendado",
  "Garbanzo cocido Pedrosillano Hacendado": "Варёный нут педросильяно Hacendado",

  // ── Gaseosa
  "Gaseosa pequeña Hacendado": "Газировка маленькая Hacendado",

  // ── Gazpacho y salmorejo
  "Gazpacho fresco Hacendado": "Свежий гаспачо Hacendado",
  "Gazpacho tradicional Hacendado": "Традиционный гаспачо Hacendado",
  "Salmorejo al estilo cordobés Hacendado": "Сальморехо по-кордовски Hacendado",
  "Salmorejo fresco Hacendado": "Свежий сальморехо Hacendado",

  // ── Gelatina
  "Gelatina 0% azúcar sabor cereza, cola y sandía Hacendado": "Желе 0% сахара со вкусом вишни, колы и арбуза Hacendado",
  "Gelatina sabor a frutos silvestres +Proteínas 10 g 0% azúcar": "Желе со вкусом лесных ягод +Протеин 10 г, 0% сахара",
  "Gelatina sabor fresa Hacendado": "Желе со вкусом клубники Hacendado",

  // ── Huevos
  "Claras de huevo líquidas pasteurizadas": "Жидкие пастеризованные яичные белки",
  "Huevos": "Яйца",
  "Huevos cocidos": "Варёные яйца",
  "Huevos de codorniz": "Перепелиные яйца",
  "Huevos de gallinas camperas": "Яйца кур свободного выгула",
  "Huevos grandes L": "Крупные яйца L",
  "Huevos medianos M": "Средние яйца M",
  "Huevos super grandes XL": "Очень крупные яйца XL",

  // ── Hummus y otros
  "Hummus de garbanzos Hacendado con pimiento del piquillo asado": "Хумус из нута Hacendado с печёным перцем пикильо",
  "Hummus de garbanzos Hacendado receta clásica": "Хумус из нута Hacendado классический рецепт",
  "Pastel de atún Hacendado": "Паштет из тунца Hacendado",
  "Tabulé oriental Hacendado": "Восточный табуле Hacendado",
  "Tofu firme Hacendado": "Твёрдый тофу Hacendado",
  "Tsatsiki Hacendado": "Цацики Hacendado",

  // ── Infusiones
  "Infusión fría Hacendado con sabor a piña y coco": "Холодный травяной чай Hacendado со вкусом ананаса и кокоса",
  "Infusión Laxsen sabor menta Hacendado": "Травяной чай Laxsen со вкусом мяты Hacendado",
  "Infusión manzana y canela Hacendado": "Травяной чай яблоко и корица Hacendado",
  "Infusión Manzanilla sabor a miel Hacendado": "Ромашковый чай со вкусом мёда Hacendado",
  "Infusión Menta Poleo Hacendado": "Травяной чай мята болотная Hacendado",
  "Infusión quema grasas Hacendado": "Жиросжигающий травяной чай Hacendado",
  "Infusión Respir Hacendado": "Травяной чай Respir Hacendado",
  "Infusión Tomillo Hacendado": "Чай с тимьяном Hacendado",

  // ── Isotónico
  "Bebida isotónica de naranja Iso drink": "Изотоник апельсиновый Iso drink",
  "Bebida isotónica Iso On blue Hacendado": "Изотоник Iso On blue Hacendado",
  "Bebida isotónica naranja Aquarius": "Изотоник апельсиновый Aquarius",
  "Bebida isotónica sabor cítrico Iso drink": "Изотоник со вкусом цитрусов Iso drink",
  "Bebida isotónica Zero sabor cítrico Iso drink": "Изотоник Zero со вкусом цитрусов Iso drink",

  // ── Jamón cocido
  "Jamón cocido braseado Noel lonchas": "Тушёная варёная ветчина Noel ломтики",
  "Jamón cocido extra 50% raza ibérica Noel lonchas": "Варёная ветчина экстра 50% иберийской породы Noel ломтики",
  "Jamón cocido extra cortado a mano Noel": "Варёная ветчина экстра ручной нарезки Noel",
  "Jamón cocido extra Hacendado finas lonchas": "Варёная ветчина экстра Hacendado тонкие ломтики",
  "Jamón cocido extra Noel lonchas": "Варёная ветчина экстра Noel ломтики",
  "Jamón cocido extrafino Hacendado lonchas": "Варёная ветчина экстрафайн Hacendado ломтики",
  "Jamón cocido Hacendado finas lonchas": "Варёная ветчина Hacendado тонкие ломтики",
  "Jamón cocido Hacendado lonchas": "Варёная ветчина Hacendado ломтики",
  "Jamón cocido sándwich Hacendado lonchas": "Варёная ветчина для сэндвичей Hacendado ломтики",
  "Lacón al horno Noel lonchas": "Запечённая свиная лопатка лакон Noel ломтики",
  "Magro de cerdo cocido Coren": "Варёная постная свинина Coren",
  "Maxi york Hacendado": "Ветчина «Макси Йорк» Hacendado",
  "Maxi york Hacendado finas lonchas": "Ветчина «Макси Йорк» Hacendado тонкие ломтики",
  "Pechuga de pollo 92% Hacendado lonchas": "Куриная грудка 92% Hacendado ломтики",

  // ── Jamón serrano
  "Jamón de bellota ibérico 100% cortado a tapas": "Хамон из желудёвой иберийской свинины 100% нарезка для тапас",
  "Jamón de bellota ibérico 100% Covap": "Хамон из желудёвой иберийской свинины 100% Covap",
  "Jamón de bellota ibérico cortado a tapas": "Хамон из желудёвой иберийской свинины нарезка для тапас",
  "Jamón de cebo ibérico 50% La Hacienda del Ibérico": "Иберийский хамон себо 50% La Hacienda del Ibérico",
  "Jamón de cebo ibérico 50% raza ibérica La Hacienda del Ibérico lonchas": "Иберийский хамон себо 50% иберийской породы La Hacienda del Ibérico ломтики",
  "Jamón de cebo ibérico cortado a tapas": "Иберийский хамон себо нарезка для тапас",
  "Jamón de Teruel D.O.P El Cierzo lonchas": "Хамон из Теруэля D.O.P El Cierzo ломтики",
  "Jamón de Trevélez Antonio Álvarez lonchas extra finas": "Хамон из Тревелеса Antonio Álvarez очень тонкие ломтики",
  "Jamón serrano cortado a máquina": "Хамон серрано машинной нарезки",
  "Jamón serrano gran reserva Hacendado sin aditivos lonchas": "Хамон серрано гран резерва Hacendado без добавок ломтики",
  "Jamón serrano Incarlopsa": "Хамон серрано Incarlopsa",
  "Jamón serrano Incarlopsa lonchas": "Хамон серрано Incarlopsa ломтики",
  "Jamón serrano Incarlopsa lonchas extrafinas": "Хамон серрано Incarlopsa очень тонкие ломтики",
  "Jamón serrano Jamcal medias lonchas": "Хамон серрано Jamcal половинки ломтиков",
  "Jamón serrano reserva cortado a tapas": "Хамон серрано резерва нарезка для тапас",
  "Paleta curada Paletas Marpa lonchas": "Вяленая лопатка Paletas Marpa ломтики",
  "Paleta de cebo ibérica 50% La Hacienda del Ibérico": "Иберийская лопатка себо 50% La Hacienda del Ibérico",
  "Paleta de cerdo curada Incarlopsa": "Вяленая свиная лопатка Incarlopsa",
  "Taco jamón curado": "Кусок вяленого хамона",
  "Taquitos de jamón Incarlopsa": "Кубики хамона Incarlopsa",

  // ── L-Casei
  "Bebida láctea de fresa L-casei": "Молочный напиток с клубникой L-casei",
  "Bebida láctea natural Actimel": "Натуральный молочный напиток Actimel",
  "Bebida láctea natural Actimel 0% MG 0% azúcares añadidos": "Натуральный молочный напиток Actimel 0% жирности, без добавленного сахара",

  // ── Lasaña y canelones
  "Placas para lasaña precocidas El Pavo": "Листы для лазаньи быстрого приготовления El Pavo",

  // ── Leche condensada y otros
  "Leche condensada desnatada Hacendado": "Обезжиренное сгущённое молоко Hacendado",
  "Leche condensada Hacendado": "Сгущённое молоко Hacendado",

  // ── Leche desnatada
  "Bebida láctea desnatada omega 3 Hacendado": "Обезжиренный молочный напиток с омега-3 Hacendado",
  "Bebida láctea Omega 3 Puleva con leche desnatada": "Молочный напиток Omega 3 Puleva с обезжиренным молоком",
  "Bebida láctea Omega 3 Puleva con nueces y leche desnatada": "Молочный напиток Omega 3 Puleva с орехами и обезжиренным молоком",
  "Leche desnatada +Proteínas & calcio": "Обезжиренное молоко +Протеин и кальций",
  "Leche desnatada Asturiana": "Обезжиренное молоко Asturiana",
  "Leche desnatada calcio Hacendado": "Обезжиренное молоко с кальцием Hacendado",
  "Leche desnatada Hacendado": "Обезжиренное молоко Hacendado",
  "Leche desnatada sin lactosa Hacendado": "Обезжиренное молоко без лактозы Hacendado",
  "Leche en polvo desnatada Hacendado": "Сухое обезжиренное молоко Hacendado",

  // ── Leche entera
  "Leche entera Asturiana": "Цельное молоко Asturiana",
  "Leche entera Hacendado": "Цельное молоко Hacendado",
  "Leche entera sin lactosa Hacendado": "Цельное молоко без лактозы Hacendado",

  // ── Leche semidesnatada
  "Bebida láctea semidesnatada con fibra Hacendado": "Полуобезжиренный молочный напиток с клетчаткой Hacendado",
  "Leche semidesnatada Asturiana": "Полуобезжиренное молоко Asturiana",
  "Leche semidesnatada calcio Hacendado": "Полуобезжиренное молоко с кальцием Hacendado",
  "Leche semidesnatada de cabra Hacendado": "Полуобезжиренное козье молоко Hacendado",
  "Leche semidesnatada Hacendado": "Полуобезжиренное молоко Hacendado",
  "Leche semidesnatada sin lactosa Hacendado": "Полуобезжиренное молоко без лактозы Hacendado",

  // ── Lechuga
  "Canónigos lavados": "Мытый салат корн",
  "Ensalada mezcla brotes tiernos lavada": "Мытый салатный микс из молодых листьев",
  "Ensalada mezcla brotes tiernos maxi lavada": "Мытый салатный микс из молодых листьев макси",
  "Ensalada mezcla dúo canónigos y rúcula lavada": "Мытый салатный микс дуэт: корн и руккола",
  "Ensalada mezcla gourmet lavada": "Мытый салатный микс гурмэ",
  "Ensalada mezcla gourmet maxi lavada": "Мытый салатный микс гурмэ макси",
  "Ensalada mezcla tierna lavada": "Мытый нежный салатный микс",
  "Espinacas baby lavadas": "Мытый молодой шпинат",
  "Lechuga corazón romana": "Сердцевина салата ромэн",
  "Lechuga hoja roble": "Салат дубовый лист",
  "Lechuga Iceberg": "Салат айсберг",
  "Lechuga romana cortada y lavada": "Нарезанный мытый салат ромэн",
  "Lechugas corazón romana": "Сердцевины салата ромэн",
  "Rúcula lavada": "Мытая руккола",

  // ── Lentejas y otros
  "Lenteja cocida Hacendado": "Варёная чечевица Hacendado",

  // ── Lomo y otros
  "Cabecero de lomo Hacendado lonchas": "Свиная шейка Hacendado ломтики",
  "Lomo de bellota ibérico 50% raza ibérica cortado a máquina": "Вяленая корейка из желудёвой свинины 50% иберийской породы, машинная нарезка",
  "Lomo de cebo ibérico 50% raza ibérica cortado a máquina": "Вяленая иберийская корейка себо 50% иберийской породы, машинная нарезка",
  "Lomo de pavo Hacendado lonchas": "Филе индейки Hacendado ломтики",
  "Lomo embuchado Hacendado lonchas": "Вяленая корейка ломо эмбучадо Hacendado ломтики",
  "Lomo Hacendado": "Вяленая корейка Hacendado",
  "Surtido de ibéricos La Hacienda del ibérico lonchas": "Ассорти иберийских деликатесов La Hacienda del ibérico ломтики",

  // ── Mantequilla
  "Mantequilla con sal Hacendado": "Солёное сливочное масло Hacendado",
  "Mantequilla en porciones Hacendado sin sal añadida": "Порционное сливочное масло Hacendado без добавленной соли",
  "Mantequilla light Hacendado": "Сливочное масло лайт Hacendado",
  "Mantequilla sin lactosa Hacendado": "Сливочное масло без лактозы Hacendado",
  "Mantequilla sin sal añadida Hacendado": "Сливочное масло без добавленной соли Hacendado",

  // ── Manzana y pera
  "Manzana Golden": "Яблоко голден",
  "Manzana Granny Smith": "Яблоко гренни смит",
  "Manzanas Golden": "Яблоки голден",
  "Pera Conferencia": "Груша конференция",
  "Peras Conferencia": "Груши конференция",

  // ── Margarina
  "Margarina 100% vegetal Hacendado": "Маргарин 100% растительный Hacendado",
  "Margarina con sal Hacendado": "Солёный маргарин Hacendado",
  "Margarina Flora Original": "Маргарин Flora Original",
  "Margarina Flora Proactiv": "Маргарин Flora Proactiv",
  "Margarina Hacendado": "Маргарин Hacendado",
  "Margarina Tulipán Original": "Маргарин Tulipán Original",

  // ── Marisco
  "Gamba cocida": "Варёные креветки",
  "Langostino cocido": "Варёные лангустины",

  // ── Mejillones
  "Mejillones al natural Hacendado pequeños": "Мидии в собственном соку Hacendado мелкие",
  "Mejillones de Chile en escabeche Hacendado pequeños": "Чилийские мидии в маринаде эскабече Hacendado мелкие",
  "Mejillones en escabeche Hacendado medianos": "Мидии в маринаде эскабече Hacendado средние",
  "Mejillones en escabeche Hacendado pequeños": "Мидии в маринаде эскабече Hacendado мелкие",
  "Mejillones en salsa de vieira Hacendado pequeños": "Мидии в соусе из гребешков Hacendado мелкие",
  "Mejillones picantes en escabeche Hacendado pequeños": "Острые мидии в маринаде эскабече Hacendado мелкие",

  // ── Melocotón
  "Bebida de melocotón Hacendado sin azúcares añadidos": "Персиковый напиток Hacendado без добавленного сахара",

  // ── Melón y sandía
  "Medio melón piel de sapo": "Половина дыни пьель де сапо",
  "Melón piel de sapo": "Дыня пьель де сапо",

  // ── Mermelada
  "Mermelada de albaricoque Hacendado": "Абрикосовый джем Hacendado",
  "Mermelada de arándanos Hacendado": "Черничный джем Hacendado",
  "Mermelada de ciruela y kiwi Hacendado": "Джем из сливы и киви Hacendado",
  "Mermelada de frambuesa Hacendado": "Малиновый джем Hacendado",
  "Mermelada de fresa Hacendado": "Клубничный джем Hacendado",
  "Mermelada de fresa monodosis Hacendado": "Клубничный джем порционный Hacendado",
  "Mermelada de higo Hacendado": "Инжирный джем Hacendado",
  "Mermelada de melocotón monodosis Hacendado": "Персиковый джем порционный Hacendado",
  "Mermelada de naranja amarga Hacendado": "Джем из горького апельсина Hacendado",
  "Mermelada de tomate Hacendado": "Томатный джем Hacendado",

  // ── Miel
  "Miel de flores Hacendado": "Цветочный мёд Hacendado",
  "Miel de naranjo Hacendado": "Апельсиновый мёд Hacendado",

  // ── Monodosis
  "Café monodosis natural Hacendado": "Кофе в порционных капсулах натуральный Hacendado",

  // ── Mortadela
  "Galantina con pistacho y trufa Hacendado finas lonchas": "Галантин с фисташками и трюфелем Hacendado тонкие ломтики",
  "Mortadela con aceitunas Hacendado lonchas": "Мортаделла с оливками Hacendado ломтики",
  "Mortadela de pavo con aceitunas Hacendado finas lonchas": "Мортаделла из индейки с оливками Hacendado тонкие ломтики",
  "Mortadela de pavo Hacendado finas lonchas": "Мортаделла из индейки Hacendado тонкие ломтики",
  "Mortadela Hacendado": "Мортаделла Hacendado",
  "Mortadela Hacendado lonchas": "Мортаделла Hacendado ломтики",
  "Mortadela italiana Hacendado finas lonchas": "Итальянская мортаделла Hacendado тонкие ломтики",

  // ── Naranja
  "Bebida de naranja Hacendado sin azúcares añadidos": "Апельсиновый напиток Hacendado без добавленного сахара",
  "Bebida Florida Hacendado": "Напиток «Флорида» Hacendado",
  "Refresco Fanta naranja": "Газированный напиток Fanta апельсин",
  "Refresco Fanta naranja zero azúcares añadidos": "Газированный напиток Fanta апельсин без добавленного сахара",
  "Zumo pura naranja con pulpa Hacendado": "100% апельсиновый сок с мякотью Hacendado",
  "Zumo pura naranja Hacendado": "100% апельсиновый сок Hacendado",

  // ── Nata
  "Crema de soja Hacendado": "Соевые сливки Hacendado",
  "Nata fresca para cocinar Hacendado": "Свежие сливки для готовки Hacendado",
  "Nata ligera para cocinar Hacendado": "Лёгкие сливки для готовки Hacendado",
  "Nata ligera para cocinar sin lactosa Hacendado": "Лёгкие сливки для готовки без лактозы Hacendado",
  "Nata montada azucarada Hacendado": "Взбитые сладкие сливки Hacendado",
  "Nata para montar Hacendado": "Сливки для взбивания Hacendado",

  // ── Natillas
  "Natillas con chocolate +Proteínas 10 g 1,3 g MG": "Заварной крем с шоколадом +Протеин 10 г, 1,3 г жира",
  "Natillas de chocolate Danet": "Шоколадный заварной крем Danet",
  "Natillas de vainilla Danet": "Ванильный заварной крем Danet",
  "Natillas sabor vainilla +Proteínas 12 g": "Заварной крем со вкусом ванили +Протеин 12 г",
  "Natillas sabor vainilla con galleta Hacendado": "Заварной крем со вкусом ванили с печеньем Hacendado",
  "Natillas sabor vainilla Hacendado": "Заварной крем со вкусом ванили Hacendado",

  // ── Otras conservas de pescado
  "Calamar en salsa americana Hacendado": "Кальмар в американском соусе Hacendado",
  "Calamar en tinta Hacendado": "Кальмар в собственных чернилах Hacendado",
  "Chipirones rellenos enteros en aceite de girasol Hacendado": "Фаршированные целые кальмарчики в подсолнечном масле Hacendado",
  "Salmón al natural Hacendado": "Лосось в собственном соку Hacendado",
  "Tacos de pota al ajillo Hacendado": "Кусочки кальмара пота с чесноком Hacendado",

  // ── Otras frutas
  "Arándanos": "Черника",
  "Ciruelas Claudia": "Сливы ренклод",
  "Fresas": "Клубника",
  "Melocotón amarillo": "Жёлтый персик",

  // ── Otros
  "Burgers vegetales Hacendado con calabaza": "Овощные бургеры Hacendado с тыквой",
  "Cereales solubles con achicoria Hacendado": "Растворимый злаковый напиток с цикорием Hacendado",
  "Crema de leche para café Campina": "Сливки для кофе Campina",
  "Empanados vegetales con proteína de soja Tivall": "Растительные котлеты в панировке с соевым белком Tivall",
  "Mini burgers vegetales Hacendado con espinacas y zanahoria": "Мини-бургеры овощные Hacendado со шпинатом и морковью",
  "Patatas bravas con allioli y salsa picante Hacendado": "Картофель бравас с айоли и острым соусом Hacendado",
  "Patatas fritas con carne kebab y salsa Hacendado": "Картофель фри с мясом кебаб и соусом Hacendado",
  "Sándwiches jamón y queso Hacendado": "Сэндвичи с ветчиной и сыром Hacendado",
  "Seitán Soria Natural lonchas": "Сейтан Soria Natural ломтики",

  // ── Otros panes
  "Barra de pan tradicional": "Традиционный батон хлеба",
  "Hogaza sin gluten": "Каравай без глютена",
  "Media Hogaza integral de avena, semillas de girasol y sésamo Hacendado rebanado": "Половина цельнозернового каравая с овсом, семенами подсолнечника и кунжутом Hacendado нарезанный",
  "Pan 5 semillas": "Хлеб «5 семян»",
  "Pan Brioche Hacendado": "Бриошь Hacendado",
  "Pan de molde 12 cereales y semillas Hacendado": "Тостовый хлеб 12 злаков и семян Hacendado",
  "Pan de molde 15% maíz Hacendado": "Тостовый хлеб 15% кукурузы Hacendado",
  "Pan de molde con 35% avena Hacendado 0% azúcares añadidos con harina 100% integral": "Тостовый хлеб 35% овса Hacendado без добавленного сахара, из 100% цельнозерновой муки",
  "Pan de molde con 55% centeno Hacendado": "Тостовый хлеб 55% ржи Hacendado",
  "Pan de molde espelta 100% integral Hacendado natural": "Тостовый хлеб из полбы 100% цельнозерновой Hacendado натуральный",
  "Pan de molde semillas y pipas de calabaza Hacendado": "Тостовый хлеб с семенами и тыквенными семечками Hacendado",
  "Pan redondo sin gluten Hacendado": "Круглый хлеб без глютена Hacendado",

  // ── Otros postres
  "Arroz con leche Hacendado": "Рисовый пудинг на молоке Hacendado",
  "Cheesecake con arándanos Hacendado": "Чизкейк с черникой Hacendado",
  "Copa crema de chocolate y nata Hacendado": "Десерт с шоколадным кремом и сливками Hacendado",
  "Coulant de chocolate Hacendado": "Шоколадный фондан Hacendado",
  "Crema catalana Hacendado": "Каталонский крем Hacendado",
  "Cuajada Hacendado": "Простокваша кахада Hacendado",
  "Mousse de chocolate Hacendado": "Шоколадный мусс Hacendado",
  "Mousse sabor chocolate +Proteínas 10 g": "Мусс со вкусом шоколада +Протеин 10 г",
  "Panna Cotta con caramelo Hacendado": "Панна-котта с карамелью Hacendado",
  "Pudding sabor caramelo +Proteínas 12 g": "Пудинг со вкусом карамели +Протеин 12 г",
  "Tarta de queso Hacendado": "Сырный торт Hacendado",
  "Tiramisú Hacendado": "Тирамису Hacendado",
  "Yogur azucarado YogoMix Bolitas Hacendado con bolitas chocolateadas": "Сладкий йогурт YogoMix Bolitas Hacendado с шоколадными шариками",
  "Yogur azucarado YogoMix Discos Hacendado con disquitos chocolateados": "Сладкий йогурт YogoMix Discos Hacendado с шоколадными дисками",
  "Yogur azucarado YogoMix Hacendado variado de copos maíz, bolitas y disquitos chocolateados": "Сладкий йогурт YogoMix Hacendado с ассорти из кукурузных хлопьев, шоколадных шариков и дисков",

  // ── Otros refrescos sin gas
  "Bebida Florida Sunny Delight": "Напиток «Флорида» Sunny Delight",
  "Refresco sin gas cero fusión de frutas Hacendado": "Негазированный напиток без сахара фруктовый микс Hacendado",
  "Refresco sin gas cero piña-coco Hacendado": "Негазированный напиток без сахара ананас-кокос Hacendado",
  "Refresco sin gas de naranja Hacendado": "Негазированный апельсиновый напиток Hacendado",
  "Refresco sin gas de naranja Simon Life": "Негазированный апельсиновый напиток Simon Life",
  "Refresco sin gas Tropical Hacendado": "Негазированный напиток «Тропик» Hacendado",

  // ── Otros sabores
  "Bebida de pomelo Hacendado sin azúcares añadidos": "Грейпфрутовый напиток Hacendado без добавленного сахара",
  "Néctar de guayaba Hacendado": "Нектар гуавы Hacendado",
  "Néctar de maracuyá Hacendado fruta de la pasión, mango, uva y manzana": "Нектар маракуйи Hacendado: маракуйя, манго, виноград и яблоко",
  "Zumo de manzana Hacendado": "Яблочный сок Hacendado",
  "Zumo de tomate Hacendado": "Томатный сок Hacendado",

  // ── Pan de bocadillo
  "11 Panecillos": "11 булочек",
  "3 Bocadillos": "3 батона для бутербродов",
  "5 Barras de pan 51% integral": "5 батонов хлеба 51% цельнозерновые",
  "6 Panecillos integrales 100%": "6 цельнозерновых булочек 100%",
  "6 Panes de centeno 51%": "6 ржаных хлебцев 51%",
  "6 Panes de leche 3%": "6 молочных булочек 3%",
  "Pan mini semillas": "Мини-хлеб с семенами",
  "Pan Viena": "Венский хлеб",
  "Panecillo de trigo integral 30%": "Булочка из цельной пшеницы 30%",
  "Panecillo harina integral 50% de trigo sin sal añadida": "Булочка из 50% цельнозерновой пшеничной муки без добавленной соли",
  "Panecillo sin sal añadida": "Булочка без добавленной соли",
  "Panes chapata de cristal": "Хрустящая чиабатта «кристалл»",
  "Panes con semillas": "Булочки с семенами",
  "Panes de cristal redondos cortados 100 % natural": "Круглые хрустящие булочки «кристалл» нарезанные, 100% натуральные",
  "Panes integrales 100% fino": "Тонкие цельнозерновые булочки 100%",

  // ── Pan de hamburguesa y wrap
  "Maxi pan de burger Hacendado": "Макси-булочки для бургеров Hacendado",
  "Maxi tortillas de trigo Hacendado": "Макси-лепёшки пшеничные тортильи Hacendado",
  "Mini pan de burger Hacendado": "Мини-булочки для бургеров Hacendado",
  "Mini tortillas de trigo Hacendado": "Мини-лепёшки пшеничные тортильи Hacendado",
  "Pan de burger Brioche Hacendado": "Булочки для бургеров бриошь Hacendado",
  "Pan de pita Mission": "Пита Mission",
  "Pan hot dog Hacendado": "Булочки для хот-догов Hacendado",
  "Piadina Hacendado": "Пьядина Hacendado",
  "Tortillas de avena 51% Hacendado": "Тортильи с овсом 51% Hacendado",
  "Tortillas de maíz Hacendado": "Кукурузные тортильи Hacendado",
  "Tortillas de trigo Hacendado": "Пшеничные тортильи Hacendado",
  "Tortillas de trigo integrales Hacendado": "Цельнозерновые пшеничные тортильи Hacendado",

  // ── Pan de molde
  "Pan de molde 100% integral familiar Hacendado": "Тостовый хлеб 100% цельнозерновой семейный Hacendado",
  "Pan de molde 100% integral Hacendado": "Тостовый хлеб 100% цельнозерновой Hacendado",
  "Pan de molde 100% integral sin corteza Hacendado": "Тостовый хлеб 100% цельнозерновой без корки Hacendado",
  "Pan de molde blanco familiar Hacendado": "Белый тостовый хлеб семейный Hacendado",
  "Pan de molde blanco Hacendado": "Белый тостовый хлеб Hacendado",
  "Pan de molde blanco natural rústico Hacendado": "Белый тостовый хлеб натуральный деревенский Hacendado",
  "Pan de molde blanco rebanada gruesa Hacendado": "Белый тостовый хлеб толстыми ломтиками Hacendado",
  "Pan de molde blanco sin corteza Hacendado": "Белый тостовый хлеб без корки Hacendado",
  "Pan de molde cereales sin gluten Hacendado": "Тостовый хлеб со злаками без глютена Hacendado",
  "Pan de molde sin gluten blanco Hacendado": "Белый тостовый хлеб без глютена Hacendado",

  // ── Pan rallado
  "Pan rallado casero Hacendado": "Домашние панировочные сухари Hacendado",
  "Pan rallado de arroz Hacendado": "Рисовые панировочные сухари Hacendado",
  "Pan rallado Hacendado": "Панировочные сухари Hacendado",
  "Preparado crujiente Hacendado": "Хрустящая панировка Hacendado",

  // ── Pan rebanado
  "3 Barras de pan aceite de oliva rebanadas": "3 батона на оливковом масле нарезанные",
  "3 Barras de pan rebanadas": "3 батона хлеба нарезанные",
  "Barra de pan espiga rebanado": "Батон «колосок» нарезанный",
  "Barra de pan rebanada": "Батон хлеба нарезанный",
  "Barra pan de aceite de oliva rebanada": "Батон на оливковом масле нарезанный",
  "Barra pan integral de espelta 100% rebanado": "Батон из цельнозерновой полбы 100% нарезанный",
  "Hogaza de centeno 50% rebanado": "Ржаной каравай 50% нарезанный",
  "Pan campeón del mundo rebanado": "Хлеб «Чемпион мира» нарезанный",
  "Pan integral de trigo 100% rebanado": "Цельнозерновой пшеничный хлеб 100% нарезанный",

  // ── Pan tostado
  "Mini biscotes de trigo Hacendado": "Мини-сухарики пшеничные Hacendado",
  "Mini tostadas de trigo Hacendado extra finas": "Мини-тосты пшеничные Hacendado очень тонкие",
  "Pan tostado 100% espelta integral Hacendado": "Хрустящие тосты из 100% цельнозерновой полбы Hacendado",
  "Pan tostado 100% integral": "Хрустящие тосты 100% цельнозерновые",
  "Pan tostado 100% integral bajo en sal y en azúcares Hacendado": "Хрустящие тосты 100% цельнозерновые с низким содержанием соли и сахара Hacendado",
  "Pan tostado cereales y semillas Hacendado": "Хрустящие тосты со злаками и семенами Hacendado",
  "Pan tostado classic Hacendado": "Хрустящие тосты classic Hacendado",
  "Pan tostado pasas Hacendado": "Хрустящие тосты с изюмом Hacendado",
  "Panecillo tostado 100% integral de trigo Hacendado": "Хрустящие булочки 100% из цельной пшеницы Hacendado",
  "Panecillo tostado classic Hacendado": "Хрустящие булочки classic Hacendado",
  "Panecillos tostados cereales y semillas Hacendado": "Хрустящие булочки со злаками и семенами Hacendado",
  "Tortas cenceñas para gazpacho manchego Ruiz": "Пресные лепёшки для гаспачо по-ламанчски Ruiz",

  // ── Pasta
  "Canelones de carne Hacendado": "Каннеллони с мясом Hacendado",
  "Lasaña boloñesa familiar Hacendado": "Лазанья болоньезе семейная Hacendado",
  "Lasaña boloñesa Hacendado": "Лазанья болоньезе Hacendado",
  "Lasaña de espinacas y requesón Hacendado": "Лазанья со шпинатом и творогом Hacendado",
  "Lasaña de pollo Hacendado": "Лазанья с курицей Hacendado",
  "Macarrones Mac & Cheese Bacon Hacendado gratinados": "Макароны Mac & Cheese Bacon Hacendado запечённые",
  "Pasta tiburón Mac & Cheese Hacendado con salsa de queso": "Паста «акулы» Mac & Cheese Hacendado с сырным соусом",
  "Spaghetti carbonara Hacendado": "Спагетти карбонара Hacendado",

  // ── Pastelitos surtidos
  "Bizcocho con baño de cacao Hacendado": "Бисквит в какао-глазури Hacendado",
  "Coquito": "Кокосовое печенье кокито",
  "Espiral al cacao Hacendado": "Спираль с какао Hacendado",
  "Hojaldre cabello de Ángel Hacendado": "Слойка с тыквенным джемом «волосы ангела» Hacendado",
  "Hojaldre relleno de crema de cacao Hacendado": "Слойка с какао-кремом Hacendado",
  "Pasta de almendra Hacendado": "Миндальное пирожное Hacendado",
  "Rollo con sabor avellana Hacendado": "Рулет со вкусом фундука Hacendado",
  "Rosquilla al cacao Hacendado": "Пончик-колечко с какао Hacendado",

  // ── Patatas fritas
  "Aperitivo de patata con sabor a nata agria y cebolla": "Картофельные чипсы со вкусом сметаны и лука",
  "Aperitivo de patata sabor barbacoa Hacendado": "Картофельные чипсы со вкусом барбекю Hacendado",
  "Aperitivo de patata sabor crema agria y cebolla Pringles": "Картофельные чипсы со вкусом сметаны и лука Pringles",
  "Aperitivo de patata sabor original Pringles": "Картофельные чипсы оригинальные Pringles",
  "Patatas fritas 0% sal añadida Hacendado": "Чипсы без добавленной соли Hacendado",
  "Patatas fritas clásicas Hacendado": "Классические чипсы Hacendado",
  "Patatas fritas corte ondulado Hacendado": "Рифлёные чипсы Hacendado",
  "Patatas fritas extra crujientes Hacendado": "Очень хрустящие чипсы Hacendado",
  "Patatas fritas onduladas sabor jamón serrano Hacendado": "Рифлёные чипсы со вкусом хамона серрано Hacendado",
  "Patatas fritas onduladas sabor queso de cabra y cebolla caramelizada Hacendado": "Рифлёные чипсы со вкусом козьего сыра и карамелизированного лука Hacendado",
  "Patatas fritas sabor sal y vinagre Hacendado": "Чипсы со вкусом соли и уксуса Hacendado",
  "Patatas light Hacendado": "Чипсы лайт Hacendado",

  // ── Paté
  "Bloc foie gras de pato Hacendado": "Блок утиного фуа-гра Hacendado",
  "Foie gras entero de pato Hacendado": "Цельное утиное фуа-гра Hacendado",
  "Mousse de pato Hacendado": "Утиный мусс Hacendado",
  "Paté de cerdo con finas hierbas Hacendado": "Свиной паштет с травами Hacendado",
  "Paté de cerdo con pimienta Hacendado": "Свиной паштет с перцем Hacendado",
  "Paté de cerdo con pimienta verde Hacendado": "Свиной паштет с зелёным перцем Hacendado",
  "Paté de cerdo La Piara tapa negra": "Свиной паштет La Piara чёрная крышка",
  "Paté de cerdo sabor suave Hacendado": "Свиной паштет мягкий вкус Hacendado",
  "Paté de cerdo y pollo con trufa y arándanos Hacendado": "Паштет из свинины и курицы с трюфелем и клюквой Hacendado",
  "Paté de hígado de cerdo ibérico Hacendado": "Паштет из печени иберийской свиньи Hacendado",
  "Paté de hígado de cerdo sabor intenso Hacendado": "Паштет из свиной печени насыщенный вкус Hacendado",
  "Paté de jamón Hacendado": "Ветчинный паштет Hacendado",
  "Paté de lomo de atún Hacendado": "Паштет из филе тунца Hacendado",
  "Paté de pollo asado Hacendado": "Паштет из запечённой курицы Hacendado",
  "Paté de salmón Hacendado": "Паштет из лосося Hacendado",

  // ── Pavo y otros
  "Cabeza de cerdo Hacendado finas lonchas": "Свиная голова (зельц) Hacendado тонкие ломтики",
  "Jamón de pavo Hacendado": "Ветчина из индейки Hacendado",
  "Jamón de pavo Hacendado finas lonchas": "Ветчина из индейки Hacendado тонкие ломтики",
  "Lomo asado La Carloteña lonchas": "Запечённая корейка La Carloteña ломтики",
  "Longaniza de pavo extra Hacendado lonchas": "Колбаса лонганиса из индейки экстра Hacendado ломтики",
  "Mini muslo de pollo 98% La Carloteña asado al horno": "Мини-голень куриная 98% La Carloteña запечённая в духовке",
  "Muslito de pollo 97% La Carloteña asado al horno lonchas": "Куриная голень 97% La Carloteña запечённая в духовке ломтики",
  "Pechuga 92% pavo Hacendado lonchas": "Грудка индейки 92% Hacendado ломтики",
  "Pechuga de pavo al horno de leña Campofrío lonchas": "Грудка индейки, запечённая на дровах Campofrío ломтики",
  "Pechuga de pavo Hacendado finas lonchas": "Грудка индейки Hacendado тонкие ломтики",
  "Pechuga de pavo Noel lonchas muy finas": "Грудка индейки Noel очень тонкие ломтики",
  "Pechuga de pavo reducido en sal Hacendado finas lonchas": "Грудка индейки с пониженным содержанием соли Hacendado тонкие ломтики",
  "Pechuga de pollo braseada extrafino Hacendado lonchas": "Тушёная куриная грудка экстрафайн Hacendado ломтики",
  "Pechuga pavo cocida extrafino Hacendado lonchas": "Варёная грудка индейки экстрафайн Hacendado ломтики",
  "Pechuguita de pollo 99% La Carloteña asada al horno lonchas": "Куриная грудка 99% La Carloteña запечённая в духовке ломтики",
  "Salchichón de pavo extra Hacendado lonchas": "Сальчичон из индейки экстра Hacendado ломтики",
  "Sticks longaniza de pavo extra Hacendado": "Палочки лонганисы из индейки экстра Hacendado",
  "Tiras de pechuga de pollo 99% Hacendado al natural": "Полоски куриной грудки 99% Hacendado натуральные",
  "Tiras de pechuga pollo 99% al horno Hacendado": "Полоски куриной грудки 99% запечённые Hacendado",

  // ── Pepinillos y otros encurtidos
  "Ajos aliñados Hacendado": "Маринованный чеснок Hacendado",
  "Alcaparras Hacendado": "Каперсы Hacendado",
  "Altramuces Hacendado": "Люпин Hacendado",
  "Cebollitas Hacendado": "Маленькие луковички Hacendado",
  "Jalapeños picantes en vinagre Hacendado": "Острые халапеньо в уксусе Hacendado",
  "Mix de pepinillos y cebollitas Hacendado": "Микс корнишонов и луковичек Hacendado",
  "Pepinillos agridulces Hacendado": "Кисло-сладкие корнишоны Hacendado",
  "Pepinillos en vinagre Hacendado": "Корнишоны в уксусе Hacendado",
  "Pepinillos pequeños Hacendado": "Маленькие корнишоны Hacendado",
  "Picadillo de variantes Hacendado": "Ассорти мелко нарезанных маринадов Hacendado",
  "Piparra Hacendado": "Перчики пипарра Hacendado",

  // ── Pepino y zanahoria
  "Palitos de zanahoria": "Морковные палочки",
  "Pepino holandés": "Голландский огурец",
  "Zanahoria rallada lavada": "Тёртая мытая морковь",
  "Zanahorias": "Морковь",

  // ── Picatostes
  "Picatostes fritos con ajo Hacendado": "Жареные гренки с чесноком Hacendado",
  "Picatostes fritos Hacendado": "Жареные гренки Hacendado",
  "Picatostes tostados Hacendado": "Поджаренные гренки Hacendado",

  // ── Picos
  "Grissini palitos de pan Hacendado": "Хлебные палочки гриссини Hacendado",
  "Picos 100% integral de trigo Hacendado": "Хлебные палочки пикос 100% из цельной пшеницы Hacendado",
  "Picos camperos Hacendado": "Деревенские хлебные палочки пикос Hacendado",
  "Picos Hacendado": "Хлебные палочки пикос Hacendado",
  "Picos saladitos Hacendado": "Солёные хлебные палочки пикос Hacendado",
  "Picos sin gluten Hacendado": "Хлебные палочки пикос без глютена Hacendado",
  "Piquitos bajos en sal Hacendado con orégano y tomillo": "Мини-палочки с пониженной солью Hacendado с орегано и тимьяном",
  "Piquitos con salvado San Roque": "Мини-палочки с отрубями San Roque",
  "Regañá artesana Hacendado": "Хрустящие хлебцы реганья ремесленные Hacendado",
  "Regañá Hacendado": "Хрустящие хлебцы реганья Hacendado",

  // ── Piña
  "Bebida de piña Hacendado sin azúcares añadidos": "Ананасовый напиток Hacendado без добавленного сахара",
  "Néctar de piña La Verja": "Ананасовый нектар La Verja",
  "Zumo de piña Hacendado": "Ананасовый сок Hacendado",
  "Zumo de piña selección Hacendado": "Ананасовый сок «Селекция» Hacendado",
  "Zumo de piña y uva Hacendado": "Сок ананас и виноград Hacendado",

  // ── Pizzas refrigeradas
  "Pizza 4 quesos familiar Hacendado": "Пицца «4 сыра» семейная Hacendado",
  "Pizza 4 quesos Hacendado": "Пицца «4 сыра» Hacendado",
  "Pizza atún y bacón Hacendado": "Пицца с тунцом и беконом Hacendado",
  "Pizza barbacoa familiar Hacendado": "Пицца барбекю семейная Hacendado",
  "Pizza barbacoa Hacendado": "Пицца барбекю Hacendado",
  "Pizza carbonara familiar Hacendado": "Пицца карбонара семейная Hacendado",
  "Pizza carbonara Hacendado": "Пицца карбонара Hacendado",
  "Pizza carnívora Hacendado": "Мясная пицца Hacendado",
  "Pizza Formaggi Hacendado 4 quesos": "Пицца Formaggi Hacendado «4 сыра»",
  "Pizza Frankfurt Hacendado": "Пицца «Франкфурт» Hacendado",
  "Pizza jamón y queso familiar Hacendado": "Пицца с ветчиной и сыром семейная Hacendado",
  "Pizza jamón y queso Hacendado": "Пицца с ветчиной и сыром Hacendado",
  "Pizza jamón y queso sin gluten y sin lactosa Hacendado": "Пицца с ветчиной и сыром без глютена и без лактозы Hacendado",
  "Pizza pepperoni Hacendado": "Пицца пепперони Hacendado",
  "Pizza pollo Hacendado": "Пицца с курицей Hacendado",
  "Pizza pollo y bacón Hacendado": "Пицца с курицей и беконом Hacendado",
  "Pizza Prosciutto Hacendado jamón y queso": "Пицца Prosciutto Hacendado с ветчиной и сыром",
  "Pizza romana Hacendado con champiñones salteados": "Пицца «Романа» Hacendado с жареными шампиньонами",
  "Pizza serrana Hacendado": "Пицца «Серрана» Hacendado",

  // ── Plátano y uva
  "Plátano de Canarias IGP": "Канарские бананы IGP",
  "Plátano macho": "Плантан (овощной банан)",
  "Uva blanca sin semillas": "Белый виноград без косточек",
  "Uva roja sin semillas": "Красный виноград без косточек",

  // ── Platos calientes
  "Salmón con verduras Listo para Comer": "Лосось с овощами Listo para Comer",
  "Tortilla de patata con calabacín Listo para Comer": "Картофельная тортилья с кабачком Listo para Comer",
  "Tortilla de patata con cebolla Listo para Comer": "Картофельная тортилья с луком Listo para Comer",

  // ── Platos de cuchara
  "Albóndigas en salsa Hacendado": "Фрикадельки в соусе Hacendado",
  "Alubias a la jardinera Hacendado": "Фасоль с овощами Hacendado",
  "Alubias con tomate Heinz": "Фасоль в томатном соусе Heinz",
  "Callos a la madrileña Hacendado": "Рубец по-мадридски Hacendado",
  "Cocido Hacendado": "Косидо (мясная похлёбка с нутом) Hacendado",
  "Fabada Hacendado": "Фабада (фасоль с колбасками) Hacendado",
  "Garbanzos a la jardinera Hacendado": "Нут с овощами Hacendado",
  "Garbanzos a la riojana Hacendado": "Нут по-риохски Hacendado",
  "Lentejas a la jardinera Hacendado": "Чечевица с овощами Hacendado",
  "Lentejas a la riojana Hacendado": "Чечевица по-риохски Hacendado",

  // ── Platos fríos
  "Ensalada de marisco Listo para Comer": "Салат с морепродуктами Listo para Comer",
  "Poke salmón": "Поке с лососем",
  "Surtido sushi Bento mix": "Ассорти суши Bento mix",
  "Surtido sushi Bento pequeño": "Ассорти суши Bento маленькое",

  // ── Pollo
  "Empanados de pollo picantes sin gluten": "Острые куриные кусочки в панировке без глютена",
  "Filetes solomillos de pollo marinados empanados sin gluten": "Маринованное куриное филе в панировке без глютена",

  // ── Postres de soja
  "Postre de coco natural Alpro sin azúcares añadidos": "Натуральный кокосовый десерт Alpro без добавленного сахара",
  "Postre de soja natural Hacendado": "Натуральный соевый десерт Hacendado",
  "Postre de soja sabor arándanos Alpro": "Соевый десерт со вкусом черники Alpro",
  "Postre de soja sabor chocolate Hacendado": "Соевый десерт со вкусом шоколада Hacendado",
  "Postre de soja sabor mango Alpro sin azúcares añadidos": "Соевый десерт со вкусом манго Alpro без добавленного сахара",
  "Postre de soja sabor natural con coco Alpro": "Соевый десерт натуральный с кокосом Alpro",
  "Postre de soja sabor vainilla Hacendado": "Соевый десерт со вкусом ванили Hacendado",

  // ── Queso curado
  "Queso añejo de oveja al romero Hacendado": "Выдержанный овечий сыр с розмарином Hacendado",
  "Queso añejo fuerte de oveja Hacendado": "Выдержанный острый овечий сыр Hacendado",
  "Queso añejo fuerte de oveja Hacendado cortado en cuñitas": "Выдержанный острый овечий сыр Hacendado нарезанный клинышками",
  "Queso Arzúa-Ulloa de vaca Punteiro": "Коровий сыр Арсуа-Ульоа Punteiro",
  "Queso curado cheddar Hacendado": "Выдержанный чеддер Hacendado",
  "Queso curado DOP manchego de oveja Hacendado": "Выдержанный овечий сыр манчего DOP Hacendado",
  "Queso curado mezcla afrutado Hacendado cortado en cuñitas": "Выдержанный смешанный сыр фруктовый Hacendado нарезанный клинышками",
  "Queso curado mezcla Hacendado": "Выдержанный смешанный сыр Hacendado",
  "Queso curado mezcla Hacendado cortado en cuñitas": "Выдержанный смешанный сыр Hacendado нарезанный клинышками",
  "Queso curado mezcla madurado en madera Hacendado": "Выдержанный смешанный сыр, созревший в дереве Hacendado",
  "Queso curado y cheddar Hacendado en dados": "Выдержанный сыр и чеддер Hacendado кубиками",
  "Queso grana padano Hacendado en escamas": "Сыр грана падано Hacendado хлопьями",
  "Queso grana padano Zanetti": "Сыр грана падано Zanetti",
  "Queso viejo ahumado de oveja Hacendado": "Старый копчёный овечий сыр Hacendado",
  "Queso viejo de oveja Hacendado": "Старый овечий сыр Hacendado",
  "Queso viejo tostado mezcla Hacendado": "Старый обжаренный смешанный сыр Hacendado",
  "Tabla de quesos nacionales Hacendado": "Сырная тарелка испанских сыров Hacendado",

  // ── Queso en porciones
  "Queso en porciones Hacendado": "Плавленый сыр порциями Hacendado",
  "Queso en porciones light Hacendado": "Плавленый сыр порциями лайт Hacendado",
  "Queso en porciones mini Babybel": "Сыр порциями мини Babybel",
  "Queso fundido con palitos La vaca que ríe": "Плавленый сыр с палочками La vaca que ríe",

  // ── Queso especialidades
  "Queso azul de vaca Hacendado": "Голубой коровий сыр Hacendado",
  "Queso brie marcillat de vaca Plaisir de Roy": "Коровий сыр бри Marcillat Plaisir de Roy",
  "Queso camembert de vaca Marcillat": "Коровий сыр камамбер Marcillat",
  "Queso gorgonzola de vaca Hacendado": "Коровий сыр горгонзола Hacendado",
  "Queso precortado de cabra Hacendado": "Козий сыр в нарезке Hacendado",
  "Queso provolone de vaca Hacendado": "Коровий сыр проволоне Hacendado",
  "Queso roquefort  de oveja Hacendado": "Овечий сыр рокфор Hacendado",
  "Queso rulo con piña y almendra Liptana": "Сырный рулет с ананасом и миндалём Liptana",
  "Queso rulo de cabra Hacendado": "Рулет из козьего сыра Hacendado",

  // ── Queso fresco
  "Burrata fresca Hacendado": "Свежая буррата Hacendado",
  "Mozzarella fresca de vaca Hacendado": "Свежая коровья моцарелла Hacendado",
  "Mozzarella fresca di bufala campana Hacendado": "Свежая моцарелла ди буфала кампана Hacendado",
  "Mozzarella fresca light de vaca Hacendado": "Свежая коровья моцарелла лайт Hacendado",
  "Queso cottage Valblu": "Творожный сыр коттедж Valblu",
  "Queso feta mezcla Hacendado en dados": "Смешанный сыр фета Hacendado кубиками",
  "Queso fresco 0% MG de vaca Burgo de Arias": "Свежий коровий сыр 0% жирности Burgo de Arias",
  "Queso fresco batido desnatado 0% MG Hacendado": "Взбитый свежий сыр обезжиренный 0% жирности Hacendado",
  "Queso fresco Burgos desnatado 0% MG Hacendado": "Свежий сыр Бургос обезжиренный 0% жирности Hacendado",
  "Queso fresco Burgos natural Hacendado": "Свежий сыр Бургос натуральный Hacendado",
  "Queso fresco Burgos sin lactosa Hacendado": "Свежий сыр Бургос без лактозы Hacendado",
  "Queso fresco de cabra Hacendado": "Свежий козий сыр Hacendado",
  "Queso fresco de vaca Burgo de Arias": "Свежий коровий сыр Burgo de Arias",
  "Queso fresco de vaca Hacendado": "Свежий коровий сыр Hacendado",
  "Queso fresco light de vaca Hacendado": "Свежий коровий сыр лайт Hacendado",
  "Queso fresco mascarpone de vaca Hacendado": "Свежий коровий сыр маскарпоне Hacendado",
  "Queso fresco servilleta tradicional de vaca Hacendado": "Свежий коровий сыр в салфетке традиционный Hacendado",
  "Queso ricotta mezcla Hacendado": "Смешанный сыр рикотта Hacendado",
  "Requesón mezcla Hacendado": "Смешанный творог Hacendado",

  // ── Queso lonchas
  "Queso lonchas cheddar de vaca Hacendado": "Коровий сыр чеддер ломтиками Hacendado",
  "Queso lonchas cremoso de vaca Hacendado": "Сливочный коровий сыр ломтиками Hacendado",
  "Queso lonchas cremoso light de vaca Hacendado": "Сливочный коровий сыр лайт ломтиками Hacendado",
  "Queso lonchas de cabra Hacendado": "Козий сыр ломтиками Hacendado",
  "Queso lonchas de oveja Hacendado": "Овечий сыр ломтиками Hacendado",
  "Queso lonchas edam de vaca Holland Corona": "Коровий сыр эдам ломтиками Holland Corona",
  "Queso lonchas emmental de vaca Hacendado": "Коровий сыр эмменталь ломтиками Hacendado",
  "Queso lonchas fundido burger mezcla Hacendado": "Плавленый смешанный сыр ломтиками для бургеров Hacendado",
  "Queso lonchas fundido sándwich mezcla Hacendado": "Плавленый смешанный сыр ломтиками для сэндвичей Hacendado",
  "Queso lonchas fundido suave mezcla Hacendado": "Плавленый смешанный сыр ломтиками мягкий Hacendado",
  "Queso lonchas semicurado mezcla Hacendado": "Полувыдержанный смешанный сыр ломтиками Hacendado",
  "Queso lonchas sin lactosa de vaca Hacendado": "Коровий сыр без лактозы ломтиками Hacendado",
  "Queso lonchas tierno de vaca Hacendado": "Молодой коровий сыр ломтиками Hacendado",
  "Queso lonchas tierno mezcla Hacendado": "Молодой смешанный сыр ломтиками Hacendado",

  // ── Queso rallado
  "Queso en polvo especial pasta mezcla Hacendado": "Тёртый сыр в порошке для пасты смешанный Hacendado",
  "Queso en polvo grana padano Hacendado": "Тёртый сыр грана падано в порошке Hacendado",
  "Queso rallado emmental gratinar Hacendado": "Тёртый эмменталь для запекания Hacendado",
  "Queso rallado especial fundir mezcla Hacendado": "Тёртый смешанный сыр для плавления Hacendado",
  "Queso rallado mozzarella pizza-Roma de vaca Hacendado": "Тёртая коровья моцарелла для пиццы Roma Hacendado",
  "Queso rallado sin lactosa de vaca Hacendado": "Тёртый коровий сыр без лактозы Hacendado",

  // ── Queso semicurado
  "Queso semicurado de cabra Hacendado": "Полувыдержанный козий сыр Hacendado",
  "Queso semicurado de oveja Hacendado cortado en cuñitas": "Полувыдержанный овечий сыр Hacendado нарезанный клинышками",
  "Queso semicurado mezcla Hacendado": "Полувыдержанный смешанный сыр Hacendado",
  "Queso semicurado mezcla Hacendado cortado en cuñitas": "Полувыдержанный смешанный сыр Hacendado нарезанный клинышками",
  "Queso semicurado sin lactosa mezcla Hacendado": "Полувыдержанный смешанный сыр без лактозы Hacendado",

  // ── Queso tierno
  "Queso emmental de vaca Hacendado": "Коровий сыр эмменталь Hacendado",
  "Queso tierno bajo en sal mezcla Hacendado": "Молодой смешанный сыр с пониженным содержанием соли Hacendado",
  "Queso tierno bola edam de vaca Holland Corona": "Молодой коровий сыр эдам шаром Holland Corona",
  "Queso tierno de cabra Hacendado": "Молодой козий сыр Hacendado",
  "Queso tierno de vaca Hacendado cortado en cuñitas": "Молодой коровий сыр Hacendado нарезанный клинышками",
  "Queso tierno maasdam de vaca Holland Corona": "Молодой коровий сыр маасдам Holland Corona",
  "Queso tierno mezcla Hacendado": "Молодой смешанный сыр Hacendado",
  "Queso tierno mezcla Hacendado cortado en cuñitas": "Молодой смешанный сыр Hacendado нарезанный клинышками",
  "Queso tierno tronchón mezcla Hacendado": "Молодой смешанный сыр трончон Hacendado",

  // ── Queso untable
  "Crema de queso camembert Hacendado": "Сырный крем камамбер Hacendado",
  "Crema de queso viejo tostado mezcla Hacendado": "Сырный крем из старого обжаренного смешанного сыра Hacendado",
  "Mousse de queso de vaca con ajo y finas hierbas Hacendado": "Сырный мусс из коровьего молока с чесноком и травами Hacendado",
  "Queso untar con queso azul de vaca Hacendado": "Сыр для намазывания с голубым сыром Hacendado",
  "Queso untar de vaca con finas hierbas Hacendado": "Коровий сыр для намазывания с травами Hacendado",
  "Queso untar light de vaca Hacendado": "Коровий сыр для намазывания лайт Hacendado",
  "Queso untar light Philadelphia": "Сыр для намазывания лайт Philadelphia",
  "Queso untar original Philadelphia": "Сыр для намазывания оригинальный Philadelphia",
  "Queso untar sin lactosa de vaca Hacendado": "Коровий сыр для намазывания без лактозы Hacendado",
  "Queso untar suave de vaca Hacendado": "Мягкий коровий сыр для намазывания Hacendado",

  // ── Roscas, quiche y baguettes
  "Focaccia con tomates cherry Hacendado": "Фокачча с помидорами черри Hacendado",
  "Rosca jamón serrano y queso emmental Hacendado": "Кольцо с хамоном серрано и эмменталем Hacendado",
  "Rosca lomo, bacón y queso emmental Hacendado": "Кольцо с корейкой, беконом и эмменталем Hacendado",

  // ── Rosquilletas
  "Palitos con frutos secos Hacendado": "Хлебные палочки с орехами Hacendado",
  "Palitos de pan con aceitunas Hacendado": "Хлебные палочки с оливками Hacendado",
  "Palitos de pan con chocolate Anitin": "Хлебные палочки с шоколадом Anitin",
  "Panes especiales con tomate y orégano Hacendado": "Хлебные снеки с томатом и орегано Hacendado",
  "Panes especiales sabor fuet Hacendado": "Хлебные снеки со вкусом фуэта Hacendado",
  "Panes especiales sabor pizza con queso Hacendado": "Хлебные снеки со вкусом пиццы с сыром Hacendado",
  "Rosquilletas de horno Anitin": "Запечённые кольца роскильетас Anitin",
  "Rosquilletas de horno saladitas Anitin": "Запечённые солёные кольца роскильетас Anitin",
  "Rosquilletas tradicionales Hacendado": "Традиционные кольца роскильетас Hacendado",

  // ── Salazones
  "Boquerones al vinagre Hacendado en aceite de girasol": "Анчоусы бокероны в уксусе Hacendado в подсолнечном масле",
  "Boquerones aliñados Hacendado": "Маринованные анчоусы бокероны Hacendado",
  "Boquerones en vinagre Hacendado en aceite de girasol": "Анчоусы бокероны в уксусе Hacendado в подсолнечном масле",
  "Filetes de anchoa en aceite de girasol Hacendado": "Филе анчоусов в подсолнечном масле Hacendado",
  "Filetes de anchoa en aceite de oliva Hacendado": "Филе анчоусов в оливковом масле Hacendado",
  "Migas de bacalao al estilo inglés Hacendado": "Кусочки трески по-английски Hacendado",
  "Migas de bacalao desaladas Hacendado": "Вымоченные кусочки солёной трески Hacendado",
  "Sucedáneo de caviar negro Ubago Caviartic": "Заменитель чёрной икры Ubago Caviartic",

  // ── Salchichas
  "Salchichas cocidas bocata gourmet Hacendado de cerdo sabor ahumado": "Варёные сосиски для бутербродов гурмэ Hacendado свиные со вкусом копчения",
  "Salchichas cocidas bocata Hacendado": "Варёные сосиски для бутербродов Hacendado",
  "Salchichas cocidas bocata Hacendado de pollo y pavo sabor ahumado": "Варёные сосиски для бутербродов Hacendado из курицы и индейки со вкусом копчения",
  "Salchichas cocidas bocata queso Hacendado": "Варёные сосиски для бутербродов с сыром Hacendado",
  "Salchichas cocidas de cerdo estilo Bratwurst Hacendado": "Варёные свиные сосиски в стиле братвурст Hacendado",
  "Salchichas cocidas de cerdo Hacendado estilo parrillero": "Варёные свиные сосиски для гриля Hacendado",
  "Salchichas cocidas estilo Frankfurt Campofrío sabor ahumado": "Варёные сосиски франкфуртские Campofrío со вкусом копчения",
  "Salchichas cocidas estilo Frankfurt con queso Hacendado de pollo y cerdo sabor ahumado": "Варёные сосиски франкфуртские с сыром Hacendado из курицы и свинины со вкусом копчения",
  "Salchichas cocidas estilo Frankfurt Hacendado de pollo y cerdo sabor ahumado": "Варёные сосиски франкфуртские Hacendado из курицы и свинины со вкусом копчения",
  "Salchichas cocidas estilo Viena con queso Hacendado de pollo y cerdo sabor ahumado": "Варёные сосиски венские с сыром Hacendado из курицы и свинины со вкусом копчения",
  "Salchichas cocidas Frankfurt La Selva": "Варёные франкфуртские сосиски La Selva",
  "Salchichas cocidas Hacendado de pollo y pavo sabor ahumado": "Варёные сосиски Hacendado из курицы и индейки со вкусом копчения",
  "Salchichas cocidas hot dog bocadillo Oscar Mayer Classic de pollo y cerdo sabor ahumado": "Варёные сосиски для хот-догов Oscar Mayer Classic из курицы и свинины со вкусом копчения",
  "Salchichas cocidas Schara de cerdo ahumadas": "Варёные копчёные свиные сосиски Schara",

  // ── Salchichón
  "Fuet espetec Hacendado": "Фуэт эспетек Hacendado",
  "Longaniza clásica extra Hacendado": "Колбаса лонганиса классическая экстра Hacendado",
  "Longaniza de Aragón extra Cárnicas Gállego": "Колбаса лонганиса арагонская экстра Cárnicas Gállego",
  "Longaniza de Pascua extra Hacendado": "Пасхальная колбаса лонганиса экстра Hacendado",
  "Longaniza de payés extra Hacendado": "Деревенская колбаса лонганиса экстра Hacendado",
  "Longaniza de payés extra Hacendado lonchas": "Деревенская колбаса лонганиса экстра Hacendado ломтики",
  "Mini salchichón ibérico extra La Hacienda del ibérico": "Мини-сальчичон иберийский экстра La Hacienda del ibérico",
  "Pepperoni Hacendado lonchas": "Пепперони Hacendado ломтики",
  "Salami extra Hacendado lonchas": "Салями экстра Hacendado ломтики",
  "Salami extra pimienta Hacendado finas lonchas": "Салями экстра с перцем Hacendado тонкие ломтики",
  "Salami montañés extra El Pozo": "Горная салями экстра El Pozo",
  "Salchichón cular ibérico extra La Hacienda del ibérico": "Сальчичон кулар иберийский экстра La Hacienda del ibérico",
  "Salchichón de bellota ibérico cortado a máquina": "Сальчичон из желудёвой иберийской свинины, машинная нарезка",
  "Salchichón extra Hacendado lonchas": "Сальчичон экстра Hacendado ломтики",
  "Salchichón extra pimienta Hacendado finas lonchas": "Сальчичон экстра с перцем Hacendado тонкие ломтики",
  "Salchichón ibérico extra La Hacienda del ibérico lonchas": "Сальчичон иберийский экстра La Hacienda del ibérico ломтики",
  "Sticks longaniza extra Hacendado": "Палочки колбасы лонганиса экстра Hacendado",

  // ── Sándwich
  "Sándwich atún y huevo Hacendado": "Сэндвич с тунцом и яйцом Hacendado",
  "Sándwich pollo y queso Hacendado": "Сэндвич с курицей и сыром Hacendado",

  // ── Sardinas
  "Sardinas en aceite de oliva Hacendado": "Сардины в оливковом масле Hacendado",
  "Sardinillas en aceite de oliva Hacendado": "Мелкие сардины в оливковом масле Hacendado",
  "Sardinillas en escabeche Hacendado": "Мелкие сардины в маринаде эскабече Hacendado",
  "Sardinillas en tomate Hacendado": "Мелкие сардины в томате Hacendado",
  "Sardinillas picantes en aceite de girasol Hacendado": "Острые мелкие сардины в подсолнечном масле Hacendado",
  "Sardinillas reducidas en sal en aceite de oliva Hacendado": "Мелкие сардины с пониженным содержанием соли в оливковом масле Hacendado",

  // ── Sepia, pulpo y calamar
  "Patas de pulpo cocido": "Варёные щупальца осьминога",

  // ── Snacks
  "Aros de maíz Hacendado": "Кукурузные колечки Hacendado",
  "Combinado de aperitivos Hacendado": "Ассорти закусок Hacendado",
  "Conos sabor bacón y queso Hacendado": "Рожки со вкусом бекона и сыра Hacendado",
  "Cortezas de cerdo fritas sabor barbacoa Hacendado": "Жареные свиные шкварки со вкусом барбекю Hacendado",
  "Cuquis Hacendado": "Снеки Cuquis Hacendado",
  "Cuquitos sabor queso Hacendado": "Снеки Cuquitos со вкусом сыра Hacendado",
  "Galletas saladas con semillas y orégano Hacendado": "Солёное печенье с семенами и орегано Hacendado",
  "Galletitas saladas Hacendado": "Солёное мини-печенье Hacendado",
  "Garfitos de maíz sabor queso Hacendado": "Кукурузные снеки Garfitos со вкусом сыра Hacendado",
  "Nachos Hacendado": "Начос Hacendado",
  "Nachos tex-mex sabor queso Hacendado": "Начос тех-мекс со вкусом сыра Hacendado",
  "Palomitas caramelo Hacendado": "Карамельный попкорн Hacendado",
  "Patatas fritas paja Hacendado": "Картофель соломкой Hacendado",
  "Snack Balls sabor queso Hacendado": "Сырные шарики Snack Balls Hacendado",
  "Snack de maíz Crunchy sabor agridulce picante Hacendado": "Кукурузный снек Crunchy кисло-сладкий острый Hacendado",
  "Snack de maíz Redes sabor barbacoa Hacendado": "Кукурузный снек Redes со вкусом барбекю Hacendado",
  "Snack de maíz Stars sabor mantequilla Hacendado": "Кукурузный снек Stars со вкусом сливочного масла Hacendado",
  "Snack frito Binkies sabor queso Hacendado": "Жареный снек Binkies со вкусом сыра Hacendado",
  "Sticks de patata Hacendado": "Картофельные палочки Hacendado",
  "Sticks vegetales Hacendado": "Овощные палочки Hacendado",
  "Súper Cuquis": "Снеки Súper Cuquis",
  "Tiras de maíz frito sabor barbacoa Hacendado": "Жареные кукурузные полоски со вкусом барбекю Hacendado",
  "Torreznillos Hacendado cortezas de cerdo fritas ahumadas": "Шкварки торрезнильос Hacendado, жареная копчёная свиная шкурка",
  "Torreznos Hacendado": "Шкварки торрезнос Hacendado",
  "Trigo snack sabor ahumado Hacendado": "Пшеничный снек со вкусом копчения Hacendado",

  // ── Sobrasada
  "Sobrasada con miel L'Illa especialidades": "Собрасада с мёдом L'Illa especialidades",
  "Sobrasada de Mallorca Can Pere Joan": "Майоркская собрасада Can Pere Joan",
  "Sobrasada ibérica L'Illa especialidades": "Иберийская собрасада L'Illa especialidades",
  "Sobrasada selecta L'Illa especialidades": "Отборная собрасада L'Illa especialidades",

  // ── Sopa
  "Sopa de miso": "Суп мисо",
  "Sopa de pollo Gallina Blanca con fideos finos": "Куриный суп Gallina Blanca с тонкой вермишелью",
  "Sopa de pollo Hacendado con fideos finos": "Куриный суп Hacendado с тонкой вермишелью",

  // ── Surimi y otros
  "Palitos de surimi Hacendado": "Крабовые палочки сурими Hacendado",

  // ── Tartas
  "Tarta delicia de fresa Hacendado congelada": "Торт «Клубничное наслаждение» Hacendado замороженный",

  // ── Té
  "Refresco té  zero sabor melocotón Hacendado": "Холодный чай без сахара со вкусом персика Hacendado",
  "Refresco té sabor mango y piña Hacendado": "Холодный чай со вкусом манго и ананаса Hacendado",
  "Refresco té sabor melocotón Hacendado": "Холодный чай со вкусом персика Hacendado",
  "Refresco té verde Hacendado": "Холодный зелёный чай Hacendado",
  "Té Chai Hacendado": "Чай масала Hacendado",
  "Té negro con canela Hacendado": "Чёрный чай с корицей Hacendado",
  "Té negro Hacendado": "Чёрный чай Hacendado",

  // ── Tomate
  "Fritada pisto Hacendado": "Овощное рагу писто Hacendado",
  "Rama de Tomates": "Помидоры на ветке",
  "Tomate doble concentrado Hacendado extra": "Томатная паста двойной концентрации Hacendado экстра",
  "Tomate entero pelado Hacendado": "Целые очищенные помидоры Hacendado",
  "Tomate para untar Hacendado con aceite de oliva": "Томат для намазывания Hacendado с оливковым маслом",
  "Tomate rallado": "Тёртые помидоры",
  "Tomate seco Hacendado en aceite de oliva": "Вяленые томаты Hacendado в оливковом масле",
  "Tomate tamizado sin piel Hacendado": "Протёртые томаты без кожицы Hacendado",
  "Tomate triturado Hacendado": "Измельчённые томаты Hacendado",
  "Tomate troceado pelado Hacendado": "Нарезанные очищенные томаты Hacendado",
  "Tomates": "Помидоры",
  "Tomates cherry": "Помидоры черри",
  "Tomates cherry en rama Dulcita": "Помидоры черри на ветке Dulcita",

  // ── Tónica y bitter
  "Bitter Kas sin alcohol": "Биттер Kas безалкогольный",
  "Tónica original Schweppes": "Тоник оригинальный Schweppes",
  "Tónica Zero Schweppes": "Тоник Zero Schweppes",

  // ── Tortilla
  "Tortilla de patata Hacendado": "Картофельная тортилья Hacendado",
  "Tortilla de patata y cebolla Hacendado": "Картофельная тортилья с луком Hacendado",

  // ── Tortitas
  "Tortitas de arroz con chocolate blanco sabor yogur Hacendado": "Рисовые хлебцы в белом шоколаде со вкусом йогурта Hacendado",
  "Tortitas de arroz con chocolate con leche Hacendado": "Рисовые хлебцы в молочном шоколаде Hacendado",
  "Tortitas de arroz Hacendado": "Рисовые хлебцы Hacendado",
  "Tortitas de legumbres y arroz Hacendado": "Хлебцы из бобовых и риса Hacendado",
  "Tortitas de maíz campestre Hacendado": "Кукурузные хлебцы деревенские Hacendado",
  "Tortitas de maíz con chocolate Hacendado": "Кукурузные хлебцы с шоколадом Hacendado",
  "Tortitas de maíz con sabor a jamón Hacendado": "Кукурузные хлебцы со вкусом хамона Hacendado",
  "Tortitas de maíz Hacendado": "Кукурузные хлебцы Hacendado",

  // ── Verduras al vapor
  "3 Vegetales para microondas lavados": "3 мытых овоща для микроволновки",
  "Batatas para microondas": "Батат для микроволновки",
  "Floretas de brócoli para microondas lavadas": "Мытые соцветия брокколи для микроволновки",
  "Patatas para microondas": "Картофель для микроволновки",

  // ── Yogures de sabores
  "Postre lácteo sabor fresa sin lactosa Hacendado": "Молочный десерт со вкусом клубники без лактозы Hacendado",
  "Yogur con frutas Hacendado": "Йогурт с фруктами Hacendado",
  "Yogur cremoso con frutos silvestres Hacendado": "Сливочный йогурт с лесными ягодами Hacendado",
  "Yogur cremoso con melocotón y maracuya Hacendado": "Сливочный йогурт с персиком и маракуйей Hacendado",
  "Yogur sabor coco Danone": "Йогурт со вкусом кокоса Danone",
  "Yogur sabor coco Hacendado": "Йогурт со вкусом кокоса Hacendado",
  "Yogur sabor fresa Danone": "Йогурт со вкусом клубники Danone",
  "Yogur sabor fresa Hacendado": "Йогурт со вкусом клубники Hacendado",
  "Yogur sabor macedonia Danone": "Йогурт со вкусом фруктового ассорти Danone",
  "Yogur sabor macedonia Hacendado": "Йогурт со вкусом фруктового ассорти Hacendado",
  "Yogur sabores Hacendado": "Фруктовые йогурты ассорти Hacendado",

  // ── Yogures desnatados
  "Postre lácteo con arándanos +Proteínas 10 g 0% MG": "Молочный десерт с черникой +Протеин 10 г, 0% жирности",
  "Postre lácteo con fresa +Proteínas 10 g 0% MG": "Молочный десерт с клубникой +Протеин 10 г, 0% жирности",
  "Postre lácteo con fruta Hacendado 0% MG 0% azúcares añadidos": "Молочный десерт с фруктами Hacendado 0% жирности, без добавленного сахара",
  "Postre lácteo con puré mango y maracuya +Proteínas 10 g 0% MG": "Молочный десерт с пюре манго и маракуйи +Протеин 10 г, 0% жирности",
  "Postre lácteo cremoso natural edulcorado Hacendado 0% MG 0% azúcares añadidos": "Сливочный натуральный молочный десерт с подсластителем Hacendado 0% жирности, без добавленного сахара",
  "Postre lácteo natural +Proteínas 10 g 0% MG": "Натуральный молочный десерт +Протеин 10 г, 0% жирности",
  "Postre lácteo natural +Proteínas 12 g 0% MG": "Натуральный молочный десерт +Протеин 12 г, 0% жирности",
  "Postre lácteo natural sin lactosa Hacendado 0% MG 0% azúcares añadidos": "Натуральный молочный десерт без лактозы Hacendado 0% жирности, без добавленного сахара",
  "Postre lácteo sabor coco +Proteínas 10 g 0% MG": "Молочный десерт со вкусом кокоса +Протеин 10 г, 0% жирности",
  "Yogur natural edulcorado Hacendado 0% MG 0% azúcares añadidos": "Натуральный йогурт с подсластителем Hacendado 0% жирности, без добавленного сахара",
  "Yogur natural Hacendado 0% MG 0% azúcares añadidos": "Натуральный йогурт Hacendado 0% жирности, без добавленного сахара",
  "Yogur sabor fresa Hacendado 0% MG 0% azúcares añadidos": "Йогурт со вкусом клубники Hacendado 0% жирности, без добавленного сахара",
  "Yogur sabores Hacendado 0% MG 0% azúcares añadidos": "Фруктовые йогурты ассорти Hacendado 0% жирности, без добавленного сахара",

  // ── Yogures griegos
  "Yogur griego con fresa Hacendado": "Греческий йогурт с клубникой Hacendado",
  "Yogur griego con mango Hacendado": "Греческий йогурт с манго Hacendado",
  "Yogur griego natural Hacendado": "Натуральный греческий йогурт Hacendado",
  "Yogur griego natural Hacendado con azúcar de caña": "Натуральный греческий йогурт Hacendado с тростниковым сахаром",
  "Yogur griego natural ligero Hacendado": "Натуральный лёгкий греческий йогурт Hacendado",
  "Yogur griego natural ligero Hacendado 2% MG": "Натуральный лёгкий греческий йогурт Hacendado 2% жирности",
  "Yogur griego sabor fresa Hacendado": "Греческий йогурт со вкусом клубники Hacendado",
  "Yogur griego stracciatella Hacendado": "Греческий йогурт страчателла Hacendado",

  // ── Yogures líquidos
  "Batido lácteo sabor café +Proteínas 30 g": "Молочный коктейль со вкусом кофе +Протеин 30 г",
  "Batido lácteo sabor chocolate +Proteínas 30 g": "Молочный коктейль со вкусом шоколада +Протеин 30 г",
  "Batido lácteo sabor vainilla +Proteínas 30 g": "Молочный коктейль со вкусом ванили +Протеин 30 г",
  "Bebida láctea de fresa Hacendado": "Молочный напиток с клубникой Hacendado",
  "Bebida láctea de fresa y plátano Hacendado": "Молочный напиток с клубникой и бананом Hacendado",
  "Bebida láctea de frutas del bosque Hacendado": "Молочный напиток с лесными ягодами Hacendado",
  "Bebida láctea de piña y coco Hacendado": "Молочный напиток с ананасом и кокосом Hacendado",
  "Bebida láctea natural azucarada Hacendado": "Натуральный сладкий молочный напиток Hacendado",
  "Bebida láctea sabor açaí plátano +Proteínas 20 g 0% MG": "Молочный напиток со вкусом асаи и банана +Протеин 20 г, 0% жирности",
  "Bebida láctea sabor fresa +Proteínas 20 g 0% MG": "Молочный напиток со вкусом клубники +Протеин 20 г, 0% жирности",
  "Bebida láctea sabor fresa y plátano +Proteínas 17,4 g 0% MG 0% azúcares añadidos": "Молочный напиток со вкусом клубники и банана +Протеин 17,4 г, 0% жирности, без добавленного сахара",
  "Bebida láctea sabor stracciatella +Proteínas 20 g 0% azúcares añadidos": "Молочный напиток со вкусом страчателлы +Протеин 20 г, без добавленного сахара",
  "Bebida láctea sabor tropical +Proteínas 20 g 0% MG": "Молочный напиток тропический +Протеин 20 г, 0% жирности",
  "Yogur líquido de fresa Hacendado": "Питьевой йогурт с клубникой Hacendado",
  "Yogur líquido frutos silvestres Hacendado 0% MG 0% azúcares añadidos": "Питьевой йогурт с лесными ягодами Hacendado 0% жирности, без добавленного сахара",
  "Yogur líquido natural Hacendado con azúcar de caña": "Натуральный питьевой йогурт Hacendado с тростниковым сахаром",
  "Yogur líquido piña y coco Hacendado 0% MG 0% azúcares añadidos": "Питьевой йогурт с ананасом и кокосом Hacendado 0% жирности, без добавленного сахара",

  // ── Yogures naturales
  "Kéfir natural sabor suave": "Натуральный кефир мягкий вкус",
  "Postre lácteo cremoso natural azucarado sin lactosa Hacendado": "Сливочный натуральный сладкий молочный десерт без лактозы Hacendado",
  "Yogur natural con azúcar de caña Hacendado": "Натуральный йогурт с тростниковым сахаром Hacendado",
  "Yogur natural Danone": "Натуральный йогурт Danone",
  "Yogur natural de cabra Hacendado": "Натуральный козий йогурт Hacendado",
  "Yogur natural Hacendado": "Натуральный йогурт Hacendado"
});

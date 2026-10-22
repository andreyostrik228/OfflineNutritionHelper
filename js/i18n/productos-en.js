/**
 * js/i18n/productos-en.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los nombres de producto del modo "sin cocinar", en inglés (2026-10-22).
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

registerProductTable("en", {
  // ── Aceitunas negras
  "Aceitunas negras en rodajas Hacendado": "Sliced black olives Hacendado",
  "Aceitunas negras sin hueso Hacendado": "Pitted black olives Hacendado",

  // ── Aceitunas verdes
  "Aceitunas verdes Chupadedos Huerta de Barros partidas aliñadas": "Green olives Chupadedos Huerta de Barros, cracked and seasoned",
  "Aceitunas verdes con hueso Hacendado": "Green olives with pits Hacendado",
  "Aceitunas verdes estilo casero Hacendado partidas aliñadas": "Homestyle green olives Hacendado, cracked and seasoned",
  "Aceitunas verdes partidas Olives Garcia": "Cracked green olives Olives Garcia",
  "Aceitunas verdes Picadedos sin hueso Hacendado aliñadas": "Green olives Picadedos, pitted and seasoned Hacendado",
  "Aceitunas verdes rellenas de anchoa Hacendado": "Green olives stuffed with anchovy Hacendado",
  "Aceitunas verdes rellenas de jalapeño Hacendado": "Green olives stuffed with jalapeño Hacendado",
  "Aceitunas verdes rellenas de pepinillo Hacendado": "Green olives stuffed with gherkin Hacendado",
  "Aceitunas verdes rellenas de pimiento asado Hacendado": "Green olives stuffed with roasted pepper Hacendado",
  "Aceitunas verdes sin hueso aliñadas Hacendado": "Pitted seasoned green olives Hacendado",
  "Aceitunas verdes sin hueso Hacendado": "Pitted green olives Hacendado",

  // ── Agua sin gas
  "Agua de coco 100% Hacendado": "100% coconut water Hacendado",

  // ── Ahumados
  "Bacalao ahumado Hacendado en aceite de girasol": "Smoked cod in sunflower oil Hacendado",
  "Filetes de sardina ahumada Hacendado en aceite de girasol": "Smoked sardine fillets in sunflower oil Hacendado",
  "Mojama de atún extra Hacendado lonchas": "Extra cured tuna mojama Hacendado, sliced",
  "Salmón ahumado Hacendado": "Smoked salmon Hacendado",
  "Salmón marinado Hacendado": "Marinated salmon Hacendado",
  "Taquitos de salmón ahumado Hacendado": "Smoked salmon cubes Hacendado",

  // ── Alubias
  "Alubia cocida blanca Hacendado": "Cooked white beans Hacendado",
  "Alubia cocida granja Hacendado": "Cooked granja beans Hacendado",
  "Alubia cocida pinta Hacendado": "Cooked pinto beans Hacendado",
  "Alubia cocida roja Hacendado": "Cooked red beans Hacendado",

  // ── Arroz
  "Arroz cocido basmati Sabroz": "Cooked basmati rice Sabroz",
  "Arroz cocido integral Sabroz": "Cooked brown rice Sabroz",
  "Arroz cocido redondo Sabroz": "Cooked round rice Sabroz",
  "Arroz de pescado Hacendado": "Fish rice Hacendado",
  "Arroz de secreto ibérico con setas Hacendado": "Rice with Iberian secreto pork and mushrooms Hacendado",
  "Arroz de verduras Hacendado": "Vegetable rice Hacendado",
  "Pollo al curry Hacendado con arroz basmati": "Chicken curry with basmati rice Hacendado",

  // ── Atún
  "Atún claro al natural Hacendado": "Light tuna in water Hacendado",
  "Atún claro en aceite de girasol Hacendado": "Light tuna in sunflower oil Hacendado",
  "Atún claro en escabeche blanco Hacendado": "Light tuna in escabeche marinade Hacendado",
  "Atún en aceite de girasol Hacendado": "Tuna in sunflower oil Hacendado",
  "Atún en aceite de oliva Hacendado": "Tuna in olive oil Hacendado",
  "Atún en salsa de tomate Hacendado": "Tuna in tomato sauce Hacendado",
  "Ventresca de atún claro en aceite de oliva Hacendado": "Light tuna belly in olive oil Hacendado",

  // ── Azúcar
  "Azúcar blanco en sobres Hacendado": "White sugar sachets Hacendado",
  "Azúcar blanco Hacendado": "White sugar Hacendado",
  "Azúcar glas Hacendado": "Icing sugar Hacendado",
  "Azúcar moreno de caña Hacendado": "Brown cane sugar Hacendado",
  "Azúcar moreno en sobres Hacendado": "Brown sugar sachets Hacendado",
  "Panela azúcar moreno de caña integral Hacendado": "Panela, whole cane brown sugar Hacendado",

  // ── Bacón
  "Bacón ahumado La Selva lonchas": "Smoked bacon La Selva, sliced",
  "Bacón ahumado sin corteza La Selva": "Rindless smoked bacon La Selva",
  "Bacón Hacendado cintas": "Bacon strips Hacendado",
  "Bacón Oscar Mayer lonchas": "Bacon Oscar Mayer, sliced",
  "Lomo back bacon Hacendado": "Back bacon loin Hacendado",
  "Panceta curada sin corteza La Selva lonchas": "Rindless cured pork belly La Selva, sliced",
  "Panceta salada ibérica La Hacienda del ibérico": "Salted Iberian pork belly La Hacienda del ibérico",

  // ── Barra de pan
  "2 Baguettes para hornear": "2 bake-at-home baguettes",
  "3 Barras de pan": "3 bread loaves",
  "3 Barras de pan aceite de oliva": "3 olive oil bread loaves",
  "Baguette masa madre": "Sourdough baguette",
  "Baguette sin gluten": "Gluten-free baguette",
  "Barra de pan": "Bread loaf",
  "Barra de pan campesina masa madre": "Country sourdough loaf",
  "Barra de pan espiga": "Wheat-ear bread loaf",
  "Barra pan de aceite de oliva": "Olive oil bread loaf",
  "Barra pan de agua": "Water bread loaf",
  "Barra pan de pueblo": "Village bread loaf",
  "Barra pan integral de espelta 100%": "100% wholegrain spelt loaf",
  "Hogaza de centeno 50%": "50% rye loaf",
  "Pan campeón del mundo": "\"World champion\" bread",
  "Pan integral trigo 100%": "100% wholewheat bread",

  // ── Barritas de cereales
  "Barrita con proteínas sabor chocolate con leche Enervit Sport": "Protein bar, milk chocolate flavour Enervit Sport",
  "Barritas con proteínas sabor coco y chocolate Enervit Sport": "Protein bars, coconut and chocolate flavour Enervit Sport",
  "Barritas de avena y chocolate negro Crunchy Nature Valley": "Oat and dark chocolate bars Crunchy Nature Valley",
  "Barritas de cereales avena y cacao Hacendado": "Oat and cocoa cereal bars Hacendado",
  "Barritas de cereales muesli y chocolate Hacendado": "Muesli and chocolate cereal bars Hacendado",
  "Barritas de cereales sabor mandarina Hacendado": "Mandarin-flavoured cereal bars Hacendado",
  "Barritas de cereales y chocolate blanco Hacendado": "Cereal bars with white chocolate Hacendado",
  "Barritas de cereales y chocolate con leche Hacendado": "Cereal bars with milk chocolate Hacendado",
  "Barritas de cereales y frutos secos Hacendado": "Cereal and nut bars Hacendado",
  "Barritas de galleta y arándanos Hacendado": "Biscuit and cranberry bars Hacendado",

  // ── Batidos
  "Batido de chocolate 90% leche Hacendado": "Chocolate milkshake, 90% milk Hacendado",
  "Batido de chocolate 90% leche Puleva": "Chocolate milkshake, 90% milk Puleva",
  "Batido de chocolate Hacendado": "Chocolate milkshake Hacendado",
  "Batido de chocolate Hacendado 0% sin azúcares añadidos": "Chocolate milkshake Hacendado, no added sugar",
  "Batido de vainilla Hacendado": "Vanilla milkshake Hacendado",
  "Batido sabor fresa Hacendado": "Strawberry-flavoured milkshake Hacendado",
  "Batido sabor vainilla Hacendado": "Vanilla-flavoured milkshake Hacendado",

  // ── Bebidas frías
  "Café con leche cappuccino Hacendado": "Iced cappuccino coffee with milk Hacendado",
  "Café con leche descafeinado Hacendado": "Iced decaf coffee with milk Hacendado",
  "Café con leche espresso Hacendado": "Iced espresso coffee with milk Hacendado",
  "Café con leche light sin lactosa Hacendado": "Iced light lactose-free coffee with milk Hacendado",

  // ── Bebidas vegetales
  "Bebida de almendras 0% azúcar Hacendado": "Almond drink, 0% sugar Hacendado",
  "Bebida de almendras con calcio Hacendado": "Almond drink with calcium Hacendado",
  "Bebida de arroz sin azúcares añadidos Hacendado": "Rice drink, no added sugar Hacendado",
  "Bebida de avellana y arroz sin azúcares añadidos Hacendado": "Hazelnut and rice drink, no added sugar Hacendado",
  "Bebida de avena Alitey": "Oat drink Alitey",
  "Bebida de avena con café Hacendado": "Oat drink with coffee Hacendado",
  "Bebida de avena con calcio sin azúcares añadidos Hacendado": "Oat drink with calcium, no added sugar Hacendado",
  "Bebida de avena con chocolate sin azúcares añadidos Hacendado": "Chocolate oat drink, no added sugar Hacendado",
  "Bebida de avena Hacendado 0% azúcar": "Oat drink, 0% sugar Hacendado",
  "Bebida de coco y arroz sin azúcares añadidos Hacendado": "Coconut and rice drink, no added sugar Hacendado",
  "Bebida de soja 0% azúcar Hacendado": "Soy drink, 0% sugar Hacendado",
  "Bebida de soja con calcio y vitaminas sin azúcares añadidos Hacendado": "Soy drink with calcium and vitamins, no added sugar Hacendado",
  "Bebida de soja sabor vainilla Hacendado 0% azúcar": "Vanilla soy drink, 0% sugar Hacendado",
  "Horchata de chufa Hacendado": "Tiger nut horchata Hacendado",
  "Horchata de chufa sin azúcares añadidos Hacendado": "Tiger nut horchata, no added sugar Hacendado",
  "Horchata fresca Hacendado": "Fresh horchata Hacendado",
  "Preparado de coco Hacendado": "Coconut preparation Hacendado",

  // ── Berberechos y almejas
  "Almejones al natural Hacendado": "Large clams in brine Hacendado",
  "Berberecho al natural XS Hacendado": "Cockles in brine XS Hacendado",
  "Berberechos al natural M Hacendado": "Cockles in brine M Hacendado",
  "Berberechos al natural S Hacendado": "Cockles in brine S Hacendado",
  "Zamburiñas en salsa de vieira Hacendado": "Queen scallops in scallop sauce Hacendado",

  // ── Bífidus de sabores
  "Bífidus con cereales y fibras probióticos Hacendado": "Probiotic bifidus with cereals and fibre Hacendado",
  "Bífidus con ciruelas pasas probióticos Hacendado": "Probiotic bifidus with prunes Hacendado",
  "Bífidus con frutos silvestres probióticos Hacendado 0% MG 0% azúcares añadidos": "Probiotic bifidus with wild berries Hacendado, 0% fat, no added sugar",
  "Bífidus con kiwi probióticos Hacendado 0% MG 0% azúcares añadidos": "Probiotic bifidus with kiwi Hacendado, 0% fat, no added sugar",
  "Bífidus con mango probióticos Hacendado": "Probiotic bifidus with mango Hacendado",
  "Bífidus con nueces y cereales probióticos Hacendado 0% MG": "Probiotic bifidus with walnuts and cereals Hacendado, 0% fat",
  "Bífidus con pera probióticos Hacendado 0% MG 0% azúcares añadidos": "Probiotic bifidus with pear Hacendado, 0% fat, no added sugar",
  "Bífidus con piña probióticos Hacendado 0% MG 0% azúcares añadidos": "Probiotic bifidus with pineapple Hacendado, 0% fat, no added sugar",
  "Bífidus cremoso con coco probióticos Hacendado": "Creamy probiotic bifidus with coconut Hacendado",

  // ── Bífidus naturales
  "Bífidus cremoso natural edulcorado probióticos Hacendado 0% MG 0% azúcares añadidos": "Creamy natural sweetened probiotic bifidus Hacendado, 0% fat, no added sugar",
  "Bífidus natural azucarado probióticos Hacendado con cereales y fresas deshidratadas": "Sweetened natural probiotic bifidus Hacendado with cereals and dried strawberries",
  "Bífidus natural edulcorado probióticos Activia 0% MG 0% azúcares añadidos": "Natural sweetened probiotic bifidus Activia, 0% fat, no added sugar",
  "Bífidus natural probióticos Activia 0% MG  0% azúcares añadidos": "Natural probiotic bifidus Activia, 0% fat, no added sugar",
  "Bífidus natural probióticos Hacendado": "Natural probiotic bifidus Hacendado",
  "Bífidus natural probióticos Hacendado 0% MG 0% azúcares añadidos": "Natural probiotic bifidus Hacendado, 0% fat, no added sugar",
  "Bífidus natural probióticos Hacendado con coco, almendras y chocolate": "Natural probiotic bifidus Hacendado with coconut, almonds and chocolate",

  // ── Bollería dulce
  "12 Mini croissants de mantequilla": "12 mini butter croissants",
  "6 Croissant rellenos de cacao": "6 cocoa-filled croissants",
  "Berlina al cacao": "Cocoa Berliner doughnut",
  "Berlina glacé": "Glazed Berliner doughnut",
  "Bizcocho azúcar sin gluten": "Gluten-free sugar sponge cake",
  "Bizcocho con azúcar moreno y nueces": "Sponge cake with brown sugar and walnuts",
  "Bizcocho de cacao": "Cocoa sponge cake",
  "Bizcocho de chocolate sin gluten y sin lactosa": "Gluten-free, lactose-free chocolate sponge cake",
  "Bizcocho de manzana": "Apple sponge cake",
  "Bizcocho de yogur Hacendado": "Yogurt sponge cake Hacendado",
  "Bizcocho relleno de caramelo salado": "Salted caramel filled sponge cake",
  "Ensaimada": "Ensaimada (spiral pastry)",
  "Fartons": "Fartons (sweet buns)",
  "Magdalenas con azúcar": "Magdalena muffins with sugar",
  "Magdalenas con pepitas de chocolate": "Chocolate chip magdalena muffins",
  "Napolitana de chocolate": "Chocolate napolitana pastry",
  "Napolitana de crema": "Cream napolitana pastry",
  "Pastel de crema 65%": "Cream cake 65%",
  "Pepito de crema": "Cream-filled pepito bun",
  "Rosquillas al cacao": "Cocoa ring doughnuts",
  "Trenza con nueces pecán": "Pecan nut braid",

  // ── Bollería envasada
  "Bizcocho Hacendado": "Sponge cake Hacendado",
  "Bizcochos de huevo Hacendado": "Egg sponge biscuits Hacendado",
  "Bizcochos Hacendado": "Sponge biscuits Hacendado",
  "Bocaditos bañados al cacao Hacendado": "Cocoa-coated bites Hacendado",
  "Bollo con pepitas de chocolate Hacendado Choco Buns": "Chocolate chip buns Hacendado Choco Buns",
  "Caña de hojaldre rellena de crema sabor vainilla Hacendado con cobertura de cacao": "Puff pastry horn with vanilla cream and cocoa coating Hacendado",
  "Crepes rellenos de chocolate Hacendado": "Chocolate-filled crepes Hacendado",
  "Croissant Hacendado": "Croissant Hacendado",
  "Croissant relleno de crema al cacao Hacendado": "Cocoa cream croissant Hacendado",
  "Ensaimadas Hacendado": "Ensaimadas Hacendado",
  "Fartons tradicionales Polo": "Traditional fartons Polo",
  "Gofres clásicos Hacendado": "Classic waffles Hacendado",
  "Gofres con chocolate Hacendado": "Chocolate waffles Hacendado",
  "Magdalenas al cacao Hacendado": "Cocoa magdalena muffins Hacendado",
  "Magdalenas Hacendado": "Magdalena muffins Hacendado",
  "Magdalenas integrales 0% azúcares añadidos Hacendado": "Wholegrain magdalena muffins, no added sugar Hacendado",
  "Magdalenas sin gluten Hacendado": "Gluten-free magdalena muffins Hacendado",
  "Mantecadas Hacendado": "Mantecada cakes Hacendado",
  "Mini magdalenas con pepitas de chocolate con leche Hacendado": "Mini muffins with milk chocolate chips Hacendado",
  "Napolitanas con relleno de cacao Hacendado": "Cocoa-filled napolitanas Hacendado",
  "Napolitanas con relleno sabor crema Hacendado": "Custard-flavour filled napolitanas Hacendado",
  "Palmeritas Hacendado": "Mini palmiers Hacendado",
  "Pan de leche Hacendado": "Milk bread rolls Hacendado",
  "Rosegones pasta de almendras Hacendado": "Rosegones with almond paste Hacendado",
  "Sobaos Hacendado": "Sobao sponge cakes Hacendado",
  "Tortas de aceite Inés Rosales": "Olive oil tortas Inés Rosales",
  "Tortas de aceite Inés Rosales sin azúcar": "Sugar-free olive oil tortas Inés Rosales",
  "Valencianas Hacendado": "Valencianas sponge cakes Hacendado",

  // ── Bollería salada
  "24 Mini saladas surtidas": "24 assorted mini savoury pastries",
  "6 Mini empanadillas de pisto": "6 mini pisto vegetable pasties",
  "Empanada de atún": "Tuna empanada",
  "Empanada de atún grande": "Large tuna empanada",
  "Empanada de carne": "Meat empanada",
  "Empanadilla de atún": "Tuna empanadilla",
  "Empanadilla de bacon y queso": "Bacon and cheese empanadilla",
  "Empanadilla de espinacas 26%": "Spinach empanadilla 26%",
  "Empanadilla de pollo y bechamel": "Chicken and béchamel empanadilla",
  "Empanadilla de tomate": "Tomato empanadilla",
  "Napolitana mixta": "Ham and cheese napolitana",

  // ── Bonito
  "Bonito del norte en aceite de oliva Hacendado": "Albacore tuna in olive oil Hacendado",
  "Filetes de bonito del norte en aceite de oliva Hacendado": "Albacore tuna fillets in olive oil Hacendado",
  "Migas de bonito del norte en aceite de oliva Hacendado": "Albacore tuna flakes in olive oil Hacendado",

  // ── Caballa y melva
  "Filetes de caballa del sur contenido reducido en sal Hacendado en aceite de oliva": "Southern mackerel fillets, reduced salt, in olive oil Hacendado",
  "Filetes de caballa del sur en tomate Hacendado": "Southern mackerel fillets in tomato Hacendado",
  "Filetes de melva canutera con pimientos del piquillo Hacendado en aceite de oliva": "Bullet tuna fillets with piquillo peppers in olive oil Hacendado",
  "Filetes de melva en aceite de oliva Hacendado": "Bullet tuna fillets in olive oil Hacendado",

  // ── Cacao soluble
  "Cacao soluble ColaCao original": "Instant cocoa ColaCao original",
  "Cacao soluble Hacendado": "Instant cocoa Hacendado",
  "Cacao soluble instantáneo Hacendado": "Quick-dissolve cocoa Hacendado",
  "Cacao soluble instantáneo Nesquik": "Quick-dissolve cocoa Nesquik",

  // ── Café soluble
  "Café soluble cappuccino Hacendado": "Instant cappuccino coffee Hacendado",
  "Café soluble Classic Hacendado": "Instant coffee Classic Hacendado",
  "Café soluble descafeinado Hacendado": "Instant decaf coffee Hacendado",
  "Café soluble Espresso Creme Hacendado": "Instant coffee Espresso Creme Hacendado",

  // ── Caldo líquido
  "Caldo de marisco o fideuá para paella Hacendado con sofrito": "Seafood stock for paella or fideuá with sofrito Hacendado",
  "Caldo de pollo casero Gallina Blanca": "Homemade chicken broth Gallina Blanca",
  "Caldo de verduras Hacendado": "Vegetable broth Hacendado",
  "Fumet caldo de pescado Hacendado": "Fish stock fumet Hacendado",

  // ── Cápsulas compatibles Dolce gusto
  "Café con leche en cápsula descafeinado Hacendado": "Decaf latte capsules Hacendado",
  "Café con leche en cápsula Dolce Gusto": "Latte capsules Dolce Gusto",
  "Café con leche en cápsula Hacendado": "Latte capsules Hacendado",
  "Café cortado en cápsula Hacendado": "Cortado coffee capsules Hacendado",
  "Café en cápsula cappuccino Hacendado": "Cappuccino coffee capsules Hacendado",
  "Café en cápsula cortado Dolce Gusto": "Cortado coffee capsules Dolce Gusto",
  "Café en cápsula extra forte Hacendado": "Extra forte coffee capsules Hacendado",
  "Café en cápsula forte Hacendado": "Forte coffee capsules Hacendado",
  "Cortado en cápsula descafeinado Hacendado": "Decaf cortado capsules Hacendado",

  // ── Cápsulas compatibles Nespresso
  "Café en cápsula ristretto Hacendado": "Ristretto coffee capsules Hacendado",

  // ── Carne
  "Albóndigas guisadas Hacendado": "Stewed meatballs Hacendado",
  "Alitas de pollo asadas Hacendado": "Roast chicken wings Hacendado",
  "Carne de cerdo Pulled Pork Hacendado sabor barbacoa": "Pulled pork, barbecue flavour Hacendado",
  "Codillo de cerdo asado Hacendado": "Roast pork knuckle Hacendado",
  "Costillas de cerdo a la barbacoa cortadas Hacendado": "Cut barbecue pork ribs Hacendado",
  "Migas Hacendado": "Migas (fried breadcrumbs) Hacendado",
  "Muslo de pato confitado Hacendado": "Duck leg confit Hacendado",
  "Pollo asado Hacendado": "Roast chicken Hacendado",
  "Pollo asado troceado Hacendado": "Roast chicken pieces Hacendado",
  "Roti de pollo relleno de jamón y queso Hacendado": "Chicken roll stuffed with ham and cheese Hacendado",

  // ── Cerdo
  "Fiambre de magreta de cerdo adobada": "Marinated pork shoulder cold cut",
  "Fiambre de magro de cerdo adobado": "Marinated lean pork cold cut",

  // ── Cereales
  "Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos": "Corn Flakes Hacendado, no added sugar",
  "Cereales copos de maíz Corn Flakes Kellogg's": "Corn Flakes Kellogg's",
  "Cereales copos de trigo Chocodays Hacendado con chocolate": "Wheat flakes Chocodays with chocolate Hacendado",
  "Cereales de arroz inflado Choco Krispies Kellogg's con chocolate": "Puffed rice Choco Krispies with chocolate Kellogg's",
  "Cereales estrellas de maíz Stars Hacendado con miel": "Corn stars Stars with honey Hacendado",
  "Cereales rellenos de cacao y avellana Hacendado": "Cocoa and hazelnut filled pillows Hacendado",
  "Cereales rellenos de crema de cacao y avellana Hacendado sin gluten": "Gluten-free cocoa hazelnut cream pillows Hacendado",
  "Cereales rellenos de leche Hacendado": "Milk-filled pillows Hacendado",
  "Mini cereales rellenos de leche Hacendado": "Mini milk-filled pillows Hacendado",

  // ── Cereales integrales y muesli
  "Avena molida Hacendado": "Ground oats Hacendado",
  "Cereales avena Crunchy Hacendado": "Oat cereal Crunchy Hacendado",
  "Cereales avena Crunchy Hacendado de cacao": "Cocoa oat cereal Crunchy Hacendado",
  "Cereales Cereal Mix Hacendado 0% azúcares añadidos": "Cereal Mix Hacendado, no added sugar",
  "Cereales con salvado de trigo Fibra Sticks Hacendado": "Wheat bran sticks Fibra Sticks Hacendado",
  "Cereales copos de trigo espelta integral Hacendado 0% azúcares añadidos": "Wholegrain spelt flakes Hacendado, no added sugar",
  "Cereales copos de trigo integral y arroz Hacendado 0% azúcares añadidos": "Wholewheat and rice flakes Hacendado, no added sugar",
  "Cereales copos de trigo integral y arroz Hacendado bañados en chocolate con leche": "Wholewheat and rice flakes coated in milk chocolate Hacendado",
  "Cereales copos de trigo integral y arroz Special K Classic": "Wholewheat and rice flakes Special K Classic",
  "Cereales copos tostados de trigo integral y arroz Hacendado con chocolate": "Toasted wholewheat and rice flakes with chocolate Hacendado",
  "Copos avena tostada Hacendado con semillas y frutos secos": "Toasted oat flakes with seeds and nuts Hacendado",
  "Copos de avena Brüggen": "Oat flakes Brüggen",
  "Copos de avena integral con chocolate Hacendado": "Wholegrain oat flakes with chocolate Hacendado",
  "Copos de avena sin gluten Hacendado": "Gluten-free oat flakes Hacendado",
  "Muesli Crunchy Hacendado con chocolate": "Crunchy muesli with chocolate Hacendado",
  "Muesli Crunchy Hacendado con fruta": "Crunchy muesli with fruit Hacendado",
  "Muesli Crunchy Hacendado con frutos secos": "Crunchy muesli with nuts Hacendado",
  "Muesli Crunchy Hacendado sin azúcares añadidos": "Crunchy muesli, no added sugar Hacendado",
  "Muesli Hacendado 50% frutas y frutos secos": "Muesli 50% fruit and nuts Hacendado",
  "Muesli Hacendado con frutas": "Muesli with fruit Hacendado",
  "Muesli Hacendado con quinoa, chía y chocolate negro": "Muesli with quinoa, chia and dark chocolate Hacendado",

  // ── Chocolate a la taza
  "Cacao en polvo a la taza Hacendado": "Cocoa powder for hot chocolate Hacendado",
  "Cacao puro en polvo La Chocolatera": "Pure cocoa powder La Chocolatera",
  "Chocolate líquido a la taza Hacendado": "Liquid hot chocolate Hacendado",

  // ── Chocolate blanco
  "Chocolate blanco fundir Hacendado": "White cooking chocolate Hacendado",
  "Chocolate blanco Fussion Hacendado relleno de crema de galleta y cacao": "White chocolate Fussion with biscuit and cocoa cream Hacendado",
  "Chocolate blanco Hacendado": "White chocolate Hacendado",

  // ── Chocolate con leche
  "Chocolate con leche classic Hacendado extrafino": "Extra fine milk chocolate classic Hacendado",
  "Chocolate con leche extrafino Nestlé": "Extra fine milk chocolate Nestlé",
  "Chocolate con leche fundir Hacendado": "Milk cooking chocolate Hacendado",
  "Chocolate con leche Fussion Hacendado relleno crema de fresa": "Milk chocolate Fussion with strawberry cream Hacendado",
  "Chocolate con leche Fussion Hacendado relleno de crema de pistacho y masa filo tostada": "Milk chocolate Fussion with pistachio cream and toasted filo Hacendado",
  "Chocolate con leche Hacendado almendras enteras": "Milk chocolate with whole almonds Hacendado",
  "Chocolate con leche Hacendado avellanas troceadas": "Milk chocolate with chopped hazelnuts Hacendado",
  "Chocolate con leche Milka": "Milk chocolate Milka",
  "Chocolate con leche Milka galleta": "Milk chocolate with biscuit Milka",
  "Chocolate con leche Milka galleta Oreo": "Milk chocolate with Oreo biscuit Milka",
  "Chocolate con leche Valor almendras enteras": "Milk chocolate with whole almonds Valor",
  "Chocolate extrafino con leche Hacendado 0% azúcares añadidos": "Extra fine milk chocolate, no added sugar Hacendado",
  "Chocolate extrafino con leche Hacendado almendras enteras": "Extra fine milk chocolate with whole almonds Hacendado",
  "Fideos de chocolate Hacendado": "Chocolate sprinkles Hacendado",

  // ── Chocolate negro
  "99% cacao negro Hacendado": "99% dark cocoa chocolate Hacendado",
  "Chocolate negro 55% cacao Hacendado": "Dark chocolate 55% cocoa Hacendado",
  "Chocolate negro 55% cacao Hacendado con almendras": "Dark chocolate 55% cocoa with almonds Hacendado",
  "Chocolate negro 70% cacao fundir Hacendado 0% azúcares añadidos": "Dark cooking chocolate 70% cocoa, no added sugar Hacendado",
  "Chocolate negro 72% cacao Hacendado con trozos de naranja": "Dark chocolate 72% cocoa with orange pieces Hacendado",
  "Chocolate negro 72% de cacao Hacendado": "Dark chocolate 72% cocoa Hacendado",
  "Chocolate negro 72% de cacao Hacendado con almendras enteras": "Dark chocolate 72% cocoa with whole almonds Hacendado",
  "Chocolate negro 85% cacao extrafino y edulcorante Hacendado 0% azúcares añadidos": "Extra fine dark chocolate 85% cocoa with sweetener, no added sugar Hacendado",
  "Chocolate negro 85% cacao Hacendado": "Dark chocolate 85% cocoa Hacendado",
  "Chocolate negro fundir Hacendado": "Dark cooking chocolate Hacendado",
  "Chocolate puro Valor": "Pure chocolate Valor",
  "Gotas de chocolate negro para fundir Hacendado": "Dark chocolate drops for melting Hacendado",
  "Porciones de chocolate negro 72% cacao extrafino Hacendado": "Extra fine dark chocolate portions 72% cocoa Hacendado",
  "Porciones de Chocolate negro 85% cacao extrafino Hacendado": "Extra fine dark chocolate portions 85% cocoa Hacendado",

  // ── Chocolatinas
  "Barritas crujientes Hacendado recubiertas de chocolate con leche": "Crispy bars coated in milk chocolate Hacendado",
  "Barritas de barquillo Hacendado con relleno de avellana cubiertas de chocolate con leche": "Wafer bars with hazelnut filling in milk chocolate Hacendado",
  "Barritas de barquillo Huesitos bañadas de chocolate con leche": "Wafer bars Huesitos in milk chocolate",
  "Barritas de barquillo Kit-Kat bañadas de chocolate con leche": "Wafer bars Kit-Kat in milk chocolate",
  "Barritas de barquillo Meivel rellenas de turrón Viena y cacahuete": "Wafer bars Meivel with Viena turrón and peanut",
  "Barritas de barquillo Tokke original": "Wafer bars Tokke original",
  "Barritas de chocolate con leche Hacendado rellenas de leche": "Milk chocolate bars with milk filling Hacendado",
  "Barritas Peanuts Hacendado bañadas de chocolate con leche y rellenas con caramelo, cacahuetes tostados y crema azucarada": "Peanuts bars Hacendado in milk chocolate with caramel, roasted peanuts and sweet cream",
  "Cacahuetes Chocoiris Hacendado bañados de chocolate con leche coloreados": "Peanuts Chocoiris in coloured milk chocolate Hacendado",
  "Cacahuetes Hacendado chocolate con leche": "Milk chocolate peanuts Hacendado",
  "Cacahuetes Hacendado chocolate negro": "Dark chocolate peanuts Hacendado",
  "Disquitos Pintarolas de chocolate con leche coloreados": "Coloured milk chocolate buttons Pintarolas",
  "Huevo sorpresa de chocolate Hacendado": "Chocolate surprise egg Hacendado",
  "Huevos sorpresa de chocolate Hacendado dibujo": "Chocolate surprise eggs with design Hacendado",
  "Mix mini barritas de chocolate Hacendado": "Mini chocolate bar mix Hacendado",
  "Pistachos bañados de chocolate con leche Hacendado": "Milk chocolate coated pistachios Hacendado",

  // ── Chopped
  "Chopped cerdo Hacendado lonchas": "Pork chopped luncheon meat Hacendado, sliced",
  "Chopped cocido en lata Hacendado finas lonchas": "Canned chopped luncheon meat, thin slices Hacendado",
  "Chopped Hacendado": "Chopped luncheon meat Hacendado",

  // ── Chorizo
  "Chorizo cular ibérico extra La Hacienda del ibérico": "Extra Iberian chorizo cular La Hacienda del ibérico",
  "Chorizo de bellota ibérico cortado a máquina": "Acorn-fed Iberian chorizo, machine-sliced",
  "Chorizo de pavo extra Hacendado lonchas": "Extra turkey chorizo Hacendado, sliced",
  "Chorizo de Tarancón Bricio": "Tarancón chorizo Bricio",
  "Chorizo dulce extra Hacendado": "Extra sweet chorizo Hacendado",
  "Chorizo extra Hacendado lonchas": "Extra chorizo Hacendado, sliced",
  "Chorizo extra pimienta Hacendado finas lonchas": "Extra pepper chorizo Hacendado, thin slices",
  "Chorizo ibérico extra La Hacienda del ibérico lonchas": "Extra Iberian chorizo La Hacienda del ibérico, sliced",
  "Chorizo ibérico La Hacienda del ibérico": "Iberian chorizo La Hacienda del ibérico",
  "Chorizo Pamplona extra Hacendado lonchas": "Extra Pamplona chorizo Hacendado, sliced",
  "Chorizo picante extra Hacendado": "Extra spicy chorizo Hacendado",
  "Chorizo picante extra Hacendado lonchas": "Extra spicy chorizo Hacendado, sliced",
  "Chorizo sarta dulce extra de León Hacendado": "Extra sweet chorizo ring from León Hacendado",
  "Chorizo sarta picante extra de León Hacendado": "Extra spicy chorizo ring from León Hacendado",
  "Mini chorizo ibérico extra La Hacienda del ibérico": "Extra Iberian mini chorizo La Hacienda del ibérico",
  "Taquitos de chorizo extra Revilla": "Extra chorizo cubes Revilla",

  // ── Cítricos
  "Mandarina": "Mandarin",
  "Naranja de mesa": "Eating orange",
  "Naranjas": "Oranges",

  // ── Cocktails
  "Cocktail de fruta deshidratada Hacendado": "Dried fruit mix Hacendado",
  "Cocktail frutos secos Crunchy Hacendado sabores a barbacoa, Tex-Mex, miel y sal": "Crunchy nut mix with barbecue, Tex-Mex, honey and salt flavours Hacendado",
  "Cocktail frutos secos mezcla Hacendado": "Nut mix Hacendado",
  "Cocktail frutos secos natural Hacendado": "Natural nut mix Hacendado",
  "Cocktail frutos secos Rodeo Hacendado": "Nut mix Rodeo Hacendado",
  "Cocktail frutos secos Rumba Hacendado": "Nut mix Rumba Hacendado",
  "Cocktail frutos secos tostados 0% sal añadida Hacendado": "Roasted nut mix, no added salt Hacendado",
  "Cocktail frutos secos tostados Hacendado sabor ahumado": "Roasted nut mix, smoky flavour Hacendado",
  "Combinado frutos secos Hacendado": "Mixed nuts Hacendado",

  // ── Cóctel y banderillas
  "Banderillas dulces Hacendado": "Sweet pickle skewers Hacendado",
  "Banderillas picantes Hacendado": "Spicy pickle skewers Hacendado",
  "Mix de encurtidos Hacendado": "Mixed pickles Hacendado",

  // ── Cola clásica
  "Refresco Coca-Cola": "Coca-Cola soft drink",

  // ── Cola zero
  "Refresco Coca-Cola light": "Coca-Cola light soft drink",
  "Refresco Coca-Cola zero azúcar": "Coca-Cola zero sugar soft drink",
  "Refresco Coca-Cola zero azúcar zero cafeína": "Coca-Cola zero sugar zero caffeine soft drink",
  "Refresco cola Hacendado zero azúcar": "Cola zero sugar Hacendado",
  "Refresco cola Hacendado zero azúcar zero cafeína": "Cola zero sugar zero caffeine Hacendado",

  // ── Colesterol y otros
  "Bebida Kéfir de coco Hacendado": "Coconut kefir drink Hacendado",
  "Bebida Kéfir de fresa y plátano Hacendado": "Strawberry and banana kefir drink Hacendado",
  "Bebida Kéfir natural Hacendado 0% MG": "Natural kefir drink, 0% fat Hacendado",
  "Bebida láctea de fresa Cuidacol 0% azúcares añadidos": "Strawberry dairy drink Cuidacol, no added sugar",
  "Bebida láctea de fresa Danacol 0% azúcares añadidos 0% MG": "Strawberry dairy drink Danacol, no added sugar, 0% fat",
  "Bebida láctea natural Danacol 0% azúcares añadidos 0% MG": "Natural dairy drink Danacol, no added sugar, 0% fat",

  // ── Con chocolate y rellenas
  "Barquillos con crema de avellanas Hacendado": "Wafer rolls with hazelnut cream Hacendado",
  "Barquillos de cacao rellenos con crema de leche y de avellanas Knoppers": "Cocoa wafers with milk and hazelnut cream Knoppers",
  "Barquillos rellenos con crema de cacao Hacendado": "Wafer rolls filled with cocoa cream Hacendado",
  "Barquillos rellenos de nata Hacendado 0% azúcares añadidos": "Cream-filled wafer rolls, no added sugar Hacendado",
  "Barquillos rellenos sabor nata Hacendado": "Cream-flavour wafer rolls Hacendado",
  "Barritas de galleta bañadas en chocolate con leche Chips Ahoy": "Biscuit bars in milk chocolate Chips Ahoy",
  "Galletas Choco leche con chocolatina Hacendado": "Biscuits with milk chocolate bar Choco leche Hacendado",
  "Galletas Choco negro con chocolatina Hacendado": "Biscuits with dark chocolate bar Choco negro Hacendado",
  "Galletas Chocominis sabor chocolate Hacendado": "Chocolate-flavour biscuits Chocominis Hacendado",
  "Galletas Classic Choc Hacendado": "Biscuits Classic Choc Hacendado",
  "Galletas con chocolate blanco Hacendado": "Biscuits with white chocolate Hacendado",
  "Galletas con chocolate y crema de leche Hacendado": "Biscuits with chocolate and milk cream Hacendado",
  "Galletas Cookies Hacendado": "Cookies Hacendado",
  "Galletas cookies sin gluten y sin lactosa Hacendado": "Gluten-free, lactose-free cookies Hacendado",
  "Galletas Crunchy Choc Hacendado": "Biscuits Crunchy Choc Hacendado",
  "Galletas de cacao Caocream bañadas de chocolate blanco Hacendado rellenas de crema": "Cocoa biscuits Caocream in white chocolate with cream filling Hacendado",
  "Galletas de cacao Caocream Hacendado rellenas de crema": "Cocoa biscuits Caocream with cream filling Hacendado",
  "Galletas Digestive avena chocolate con leche Hacendado": "Digestive biscuits with oats and milk chocolate Hacendado",
  "Galletas Digestive chocolate con leche Hacendado": "Digestive biscuits with milk chocolate Hacendado",
  "Galletas Diverkao Hacendado": "Biscuits Diverkao Hacendado",
  "Galletas Divertidas chocolate con leche Hacendado": "Biscuits Divertidas with milk chocolate Hacendado",
  "Galletas rebuenas Hacendado rellenas de chocolate": "Biscuits rebuenas with chocolate filling Hacendado",
  "Galletas rellenas de chocolate Hacendado 0% azúcares añadidos": "Chocolate-filled biscuits, no added sugar Hacendado",
  "Galletas Roditas bañadas con chocolate blanco Hacendado": "Roditas biscuits coated in white chocolate Hacendado",
  "Mini galletas caritas Hacendado con crema de cacao": "Mini smiley-face biscuits with cocoa cream Hacendado",
  "Mini galletas Cookies Hacendado": "Mini cookies Hacendado",
  "Mini galletas de cacao Caocream Hacendado rellenas de crema": "Mini cocoa biscuits Caocream with cream filling Hacendado",
  "Rosquillas de chocolate con leche y coco Hacendado": "Milk chocolate and coconut ring doughnuts Hacendado",
  "Tartaletas con relleno de fresa Hacendado": "Strawberry-filled tartlets Hacendado",

  // ── Conservas fruta
  "Dulce de membrillo Hacendado 0% azúcares añadidos": "Quince paste, no added sugar Hacendado",
  "Macedonia mix de frutas en almíbar Hacendado": "Mixed fruit salad in syrup Hacendado",
  "Melocotón en almíbar Hacendado": "Peaches in syrup Hacendado",
  "Melocotón light Hacendado sin azúcares añadidos": "Light peaches, no added sugar Hacendado",
  "Piña en su jugo Hacendado rodajas": "Pineapple slices in juice Hacendado",
  "Postre de manzana Jamar": "Apple dessert Jamar",

  // ── Conservas verdura
  "Acelgas troceadas Hacendado": "Chopped chard Hacendado",
  "Champiñón entero Hacendado": "Whole mushrooms Hacendado",
  "Champiñón laminado Hacendado": "Sliced mushrooms Hacendado",
  "Chucrut al estilo bávaro Hengstenberg": "Bavarian-style sauerkraut Hengstenberg",
  "Corazones de alcachofa Hacendado": "Artichoke hearts Hacendado",
  "Ensalada china Hacendado con mazorquitas": "Chinese salad with baby corn Hacendado",
  "Espárragos blancos delgados Hacendado cortos": "Thin white asparagus, short Hacendado",
  "Espárragos blancos gruesos Hacendado cortos": "Thick white asparagus, short Hacendado",
  "Espárragos blancos medianos Hacendado": "Medium white asparagus Hacendado",
  "Espárragos blancos muy gruesos Hacendado enteros": "Extra thick whole white asparagus Hacendado",
  "Guisantes extra Hacendado": "Extra peas Hacendado",
  "Judías verdes planas Hacendado": "Flat green beans Hacendado",
  "Judías verdes redondas Hacendado": "Round green beans Hacendado",
  "Macedonia de verduras Hacendado": "Mixed vegetables Hacendado",
  "Maíz dulce Hacendado": "Sweetcorn Hacendado",
  "Mazorquitas de maíz agridulce Hacendado": "Sweet and sour baby corn Hacendado",
  "Palmito al natural entero Hacendado": "Whole hearts of palm Hacendado",
  "Patatas cocidas Hacendado": "Cooked potatoes Hacendado",
  "Pimientos asados en tiras Hacendado": "Roasted pepper strips Hacendado",
  "Pimientos del piquillo enteros Hacendado extra": "Extra whole piquillo peppers Hacendado",
  "Pimientos en tiras condimentados Hacendado": "Seasoned pepper strips Hacendado",
  "Remolacha en tiras Hacendado": "Beetroot strips Hacendado",
  "Verduras asadas Hacendado": "Roasted vegetables Hacendado",
  "Zanahoria en tiras Hacendado": "Carrot strips Hacendado",

  // ── Crakers y tartaletas
  "Crackers 30% integral": "30% wholegrain crackers",
  "Crackers con sal Hacendado": "Salted crackers Hacendado",
  "Crackers integrales de espelta Bachman": "Wholegrain spelt crackers Bachman",
  "Crackers sin gluten Hacendado con romero": "Gluten-free crackers with rosemary Hacendado",
  "Galletas saladas salpicks Galbusera": "Salpicks savoury crackers Galbusera",
  "Pan de fibra y sésamo Hacendado": "Fibre and sesame crispbread Hacendado",
  "Tostadas de arroz y maíz Hacendado": "Rice and corn cakes Hacendado",

  // ── Cremas de untar
  "Crema al cacao con avellanas Hacendado": "Cocoa hazelnut spread Hacendado",
  "Crema al cacao con avellanas Nocilla original": "Cocoa hazelnut spread Nocilla original",
  "Crema al cacao con avellanas Nutella": "Cocoa hazelnut spread Nutella",
  "Crema al cacao y leche con avellanas Nocilla": "Cocoa and milk hazelnut spread Nocilla",
  "Crema de avellanas y cacao Hacendado": "Hazelnut and cocoa spread Hacendado",
  "Crema de cacahuete 100% Hacendado": "100% peanut butter Hacendado",
  "Dulce de leche Chimbote": "Dulce de leche Chimbote",

  // ── Cremas y puré
  "Crema de calabacín Hacendado": "Courgette soup Hacendado",
  "Crema de calabaza Hacendado": "Pumpkin soup Hacendado",
  "Crema de calabaza y zanahoria Hacendado": "Pumpkin and carrot soup Hacendado",
  "Crema de espárragos Hacendado": "Asparagus soup Hacendado",
  "Crema de lentejas Hacendado": "Lentil soup Hacendado",
  "Crema de setas Starlux con champiñones": "Mushroom soup with button mushrooms Starlux",
  "Crema de verduras Hacendado": "Vegetable soup Hacendado",

  // ── Edulcorante y otros
  "Edulcorante en pastillas stevia Hacendado": "Stevia sweetener tablets Hacendado",
  "Edulcorante sacarina en sobres Hacendado": "Saccharin sweetener sachets Hacendado",
  "Sirope de agave Hacendado": "Agave syrup Hacendado",

  // ── Empanados y elaborados
  "Lomo de cerdo marinado empanado sin gluten": "Gluten-free breaded marinated pork loin",
  "Oreja de cerdo cocida adobada Rogusa": "Cooked marinated pork ear Rogusa",

  // ── Empanados y rebozados congelados
  "Croquetas de cocido Hacendado ultracongeladas": "Frozen cocido croquettes Hacendado",
  "Pollo marinado rebozado Crispy American Style Hacendado ultracongelado": "Frozen battered marinated chicken Crispy American Style Hacendado",

  // ── Energético
  "Bebida energética Energy Drink Hacendado": "Energy drink Energy Drink Hacendado",
  "Bebida energética Energy Monster": "Energy drink Energy Monster",
  "Bebida energética Furious Energy drink Hacendado": "Energy drink Furious Energy drink Hacendado",
  "Bebida energética Red Bull": "Energy drink Red Bull",
  "Bebida energética Zero Energy Drink Hacendado": "Energy drink Zero Energy Drink Hacendado",

  // ── Ensalada preparada
  "Ensalada César": "Caesar salad",
  "Ensalada de la casa": "House salad",
  "Ensalada de pasta": "Pasta salad",
  "Ensalada de pasta Listo para Comer": "Pasta salad Listo para Comer",
  "Ensalada de pollo, queso y frutos secos Listo para Comer": "Chicken, cheese and nut salad Listo para Comer",
  "Ensalada ensatún": "Ensatún tuna salad",
  "Ensalada queso de cabra": "Goat cheese salad",
  "Wraps Texas": "Texas wraps",

  // ── Ensaladilla
  "Ensaladilla americana Hacendado": "American salad Hacendado",
  "Ensaladilla Delicias del mar Hacendado": "Seafood delights salad Hacendado",
  "Ensaladilla rusa Hacendado": "Russian salad Hacendado",
  "Patatas con allioli Hacendado": "Potatoes with aioli Hacendado",

  // ── Fideos orientales
  "Fideos orientales sabor pollo Hacendado": "Chicken-flavour oriental noodles Hacendado",

  // ── Flan
  "Flan de café Hacendado": "Coffee flan Hacendado",
  "Flan de huevo +Proteínas 10 g 0% MG 0% azúcares añadidos": "Egg flan +Protein 10 g, 0% fat, no added sugar",
  "Flan de huevo Hacendado": "Egg flan Hacendado",
  "Flan de huevo sin azúcares añadidos Hacendado": "Egg flan, no added sugar Hacendado",
  "Flan de queso Hacendado": "Cheese flan Hacendado",
  "Flan de vainilla con caramelo Hacendado": "Vanilla flan with caramel Hacendado",

  // ── Fruta + leche
  "Fruta + leche caribe Don Simón sin azúcares añadidos y zero materia grasa": "Fruit + milk Caribbean Don Simón, no added sugar, zero fat",
  "Fruta + leche caribe Hacendado sin azúcares añadidos": "Fruit + milk Caribbean Hacendado, no added sugar",
  "Fruta + leche mediterráneo Hacendado sin azúcares añadidos": "Fruit + milk Mediterranean Hacendado, no added sugar",
  "Fruta + leche piña y coco Hacendado sin azúcares añadidos": "Fruit + milk pineapple and coconut Hacendado, no added sugar",
  "Fruta + leche tropical Bifrutas": "Fruit + milk tropical Bifrutas",
  "Fruta + leche tropical Hacendado sin azúcares añadidos": "Fruit + milk tropical Hacendado, no added sugar",

  // ── Fruta desecada
  "Arándanos deshidratados Hacendado": "Dried cranberries Hacendado",
  "Ciruelas desecadas sin hueso Hacendado": "Pitted prunes Hacendado",
  "Dátiles desecados sin hueso Hacendado": "Pitted dried dates Hacendado",
  "Dátiles en rama Hacendado": "Dates on the branch Hacendado",
  "Dátiles Medjoul con hueso Hacendado": "Medjool dates with pits Hacendado",
  "Orejones albaricoque Hacendado": "Dried apricots Hacendado",
  "Pasas moscatel sin semillas Hacendado": "Seedless muscatel raisins Hacendado",
  "Pasas sultanas sin semillas Hacendado": "Seedless sultanas Hacendado",
  "Piña deshidratada Hacendado": "Dried pineapple Hacendado",

  // ── Fruta tropical
  "Kiwis amarillos": "Golden kiwis",
  "Piña": "Pineapple",
  "Piña natural a rodajas": "Fresh pineapple slices",

  // ── Fruta variada y otros sabores
  "Bebida 5 frutas Hacendado sin azúcares añadidos": "5-fruit drink Hacendado, no added sugar",
  "Bebida Bahamas Hacendado": "Bahamas drink Hacendado",
  "Bebida de arándanos y frutas rojas Hacendado sin azúcares añadidos": "Cranberry and red berry drink Hacendado, no added sugar",
  "Bebida de frutas rojas antioxidante Hacendado sin azúcares añadidos": "Antioxidant red berry drink Hacendado, no added sugar",
  "Bebida de zumo de naranja, mango y zanahoria La Verja sin azúcares añadidos": "Orange, mango and carrot juice drink La Verja, no added sugar",
  "Bebida multivitaminas Hacendado sin azúcares añadidos": "Multivitamin drink Hacendado, no added sugar",
  "Bebida tropical Hacendado sin azúcares añadidos": "Tropical drink Hacendado, no added sugar",

  // ── Frutos secos
  "Almendra frita y salada Hacendado pelada": "Fried salted peeled almonds Hacendado",
  "Almendra marcona Hacendado frita con sal": "Fried salted Marcona almonds Hacendado",
  "Almendra natural Hacendado": "Natural almonds Hacendado",
  "Almendra tostada Hacendado 0% sal añadida con piel": "Roasted skin-on almonds, no added salt Hacendado",
  "Almendra tostada y salada Hacendado con piel": "Roasted salted skin-on almonds Hacendado",
  "Anacardo frito salado Hacendado": "Fried salted cashews Hacendado",
  "Anacardo natural Hacendado": "Natural cashews Hacendado",
  "Avellana tostada Hacendado 0% sal añadida": "Roasted hazelnuts, no added salt Hacendado",
  "Cacahuete en polvo desgrasado +Proteínas 14 g 70% reducido en grasa": "Defatted peanut powder +Protein 14 g, 70% less fat",
  "Cacahuete frito con miel Hacendado": "Honey fried peanuts Hacendado",
  "Cacahuete frito con sal Hacendado pelado": "Fried salted peeled peanuts Hacendado",
  "Cacahuete frito y salado Hacendado con piel": "Fried salted skin-on peanuts Hacendado",
  "Cacahuete tostado con sal Hacendado": "Roasted salted peanuts Hacendado",
  "Cacahuete tostado Hacendado 0% sal añadida": "Roasted peanuts, no added salt Hacendado",
  "Cacahuete tostado Hacendado 0% sal añadida pelado": "Roasted peeled peanuts, no added salt Hacendado",
  "Castañas cocidas y peladas Hacendado": "Cooked peeled chestnuts Hacendado",
  "Maíz frito crujiente y tierno Hacendado": "Crunchy and tender fried corn Hacendado",
  "Maíz frito gigante Hacendado": "Giant fried corn Hacendado",
  "Mezcla semillas Hacendado": "Seed mix Hacendado",
  "Nuez de Brasil natural Hacendado": "Natural Brazil nuts Hacendado",
  "Nuez natural Hacendado": "Natural walnuts Hacendado",
  "Nuez natural Hacendado pelada": "Natural shelled walnuts Hacendado",
  "Nuez Pecana natural Hacendado pelada": "Natural shelled pecans Hacendado",
  "Nuez troceada pelada Hacendado": "Chopped shelled walnuts Hacendado",
  "Palomitas de maíz con sal Hacendado para microondas": "Salted microwave popcorn Hacendado",
  "Palomitas de maíz sabor mantequilla Hacendado para microondas": "Butter-flavour microwave popcorn Hacendado",
  "Pipas calabaza tostadas Hacendado aguasal": "Roasted pumpkin seeds in brine Hacendado",
  "Pipas de calabaza natural Hacendado peladas": "Natural shelled pumpkin seeds Hacendado",
  "Pipas de girasol fritas Hacendado peladas": "Fried shelled sunflower seeds Hacendado",
  "Pipas girasol barbacoa Hacendado": "Barbecue sunflower seeds Hacendado",
  "Pipas girasol naturales Hacendado peladas": "Natural shelled sunflower seeds Hacendado",
  "Pipas girasol tostadas Hacendado 0% sal añadida": "Roasted sunflower seeds, no added salt Hacendado",
  "Pipas girasol tostadas Hacendado gigante aguasal": "Giant roasted sunflower seeds in brine Hacendado",
  "Pipas girasol tostadas Hacendado gigante con sal": "Giant roasted salted sunflower seeds Hacendado",
  "Pistacho natural Hacendado pelado": "Natural shelled pistachios Hacendado",
  "Pistacho tostado Hacendado 0% sal añadida": "Roasted pistachios, no added salt Hacendado",
  "Pistacho tostado Hacendado con sal": "Roasted salted pistachios Hacendado",
  "Semillas de chía Hacendado": "Chia seeds Hacendado",
  "Semillas lino dorado Hacendado": "Golden flax seeds Hacendado",
  "Semillas sésamo tostado Hacendado": "Toasted sesame seeds Hacendado",

  // ── Galletas desayuno
  "Galletas canela Hacendado": "Cinnamon biscuits Hacendado",
  "Galletas caramelizadas Lotus Biscoff": "Caramelised biscuits Lotus Biscoff",
  "Galletas de mantequilla Hacendado Belgas": "Belgian butter biscuits Hacendado",
  "Galletas Divertidas con cereales Hacendado": "Biscuits Divertidas with cereals Hacendado",
  "Galletas María dorada Hacendado": "Golden Maria biscuits Hacendado",
  "Galletas María dorada Hacendado 0% azúcares añadidos": "Golden Maria biscuits, no added sugar Hacendado",
  "Galletas María Hacendado": "Maria biscuits Hacendado",
  "Galletas María sin gluten y sin lactosa Hacendado": "Gluten-free, lactose-free Maria biscuits Hacendado",
  "Galletas Relieve Hacendado": "Relieve biscuits Hacendado",
  "Galletas tostadas Animadas Hacendado": "Toasted biscuits Animadas Hacendado",
  "Galletas tostadas Hacendado": "Toasted biscuits Hacendado",
  "Galletas tostadas Tosta Rica": "Toasted biscuits Tosta Rica",
  "Galletas tradicionales Hacendado": "Traditional biscuits Hacendado",
  "Pastas de aceite Hacendado": "Oil biscuits Hacendado",

  // ── Galletas integrales y digestive
  "Galletas avena Hacendado": "Oat biscuits Hacendado",
  "Galletas de espelta Hacendado 0% azúcares añadidos": "Spelt biscuits, no added sugar Hacendado",
  "Galletas Digestive 0% azúcares añadidos Hacendado": "Digestive biscuits, no added sugar Hacendado",
  "Galletas Digestive Hacendado": "Digestive biscuits Hacendado",
  "Galletas Digestive manzana & avena Hacendado": "Digestive biscuits apple and oat Hacendado",
  "Galletas María Integral Hacendado": "Wholegrain Maria biscuits Hacendado",

  // ── Galletas surtidas
  "Obleas para helado Hacendado": "Ice cream wafers Hacendado",
  "Surtido de galletas y barquillos Hacendado": "Assorted biscuits and wafers Hacendado",
  "Surtido de pastas artesanas Hacendado": "Assorted artisan biscuits Hacendado",

  // ── Garbanzos
  "Garbanzo cocido Hacendado": "Cooked chickpeas Hacendado",
  "Garbanzo cocido Pedrosillano Hacendado": "Cooked Pedrosillano chickpeas Hacendado",

  // ── Gaseosa
  "Gaseosa pequeña Hacendado": "Small lemonade soda Hacendado",

  // ── Gazpacho y salmorejo
  "Gazpacho fresco Hacendado": "Fresh gazpacho Hacendado",
  "Gazpacho tradicional Hacendado": "Traditional gazpacho Hacendado",
  "Salmorejo al estilo cordobés Hacendado": "Córdoba-style salmorejo Hacendado",
  "Salmorejo fresco Hacendado": "Fresh salmorejo Hacendado",

  // ── Gelatina
  "Gelatina 0% azúcar sabor cereza, cola y sandía Hacendado": "Jelly 0% sugar, cherry, cola and watermelon Hacendado",
  "Gelatina sabor a frutos silvestres +Proteínas 10 g 0% azúcar": "Wild berry jelly +Protein 10 g, 0% sugar",
  "Gelatina sabor fresa Hacendado": "Strawberry jelly Hacendado",

  // ── Huevos
  "Claras de huevo líquidas pasteurizadas": "Pasteurised liquid egg whites",
  "Huevos": "Eggs",
  "Huevos cocidos": "Boiled eggs",
  "Huevos de codorniz": "Quail eggs",
  "Huevos de gallinas camperas": "Free-range eggs",
  "Huevos grandes L": "Large eggs L",
  "Huevos medianos M": "Medium eggs M",
  "Huevos super grandes XL": "Extra large eggs XL",

  // ── Hummus y otros
  "Hummus de garbanzos Hacendado con pimiento del piquillo asado": "Chickpea hummus with roasted piquillo pepper Hacendado",
  "Hummus de garbanzos Hacendado receta clásica": "Classic chickpea hummus Hacendado",
  "Pastel de atún Hacendado": "Tuna pâté Hacendado",
  "Tabulé oriental Hacendado": "Oriental tabbouleh Hacendado",
  "Tofu firme Hacendado": "Firm tofu Hacendado",
  "Tsatsiki Hacendado": "Tzatziki Hacendado",

  // ── Infusiones
  "Infusión fría Hacendado con sabor a piña y coco": "Cold infusion with pineapple and coconut flavour Hacendado",
  "Infusión Laxsen sabor menta Hacendado": "Laxsen mint-flavour infusion Hacendado",
  "Infusión manzana y canela Hacendado": "Apple and cinnamon infusion Hacendado",
  "Infusión Manzanilla sabor a miel Hacendado": "Chamomile infusion with honey flavour Hacendado",
  "Infusión Menta Poleo Hacendado": "Pennyroyal mint infusion Hacendado",
  "Infusión quema grasas Hacendado": "Fat-burning infusion Hacendado",
  "Infusión Respir Hacendado": "Respir infusion Hacendado",
  "Infusión Tomillo Hacendado": "Thyme infusion Hacendado",

  // ── Isotónico
  "Bebida isotónica de naranja Iso drink": "Orange isotonic drink Iso drink",
  "Bebida isotónica Iso On blue Hacendado": "Isotonic drink Iso On blue Hacendado",
  "Bebida isotónica naranja Aquarius": "Orange isotonic drink Aquarius",
  "Bebida isotónica sabor cítrico Iso drink": "Citrus isotonic drink Iso drink",
  "Bebida isotónica Zero sabor cítrico Iso drink": "Zero citrus isotonic drink Iso drink",

  // ── Jamón cocido
  "Jamón cocido braseado Noel lonchas": "Braised cooked ham Noel, sliced",
  "Jamón cocido extra 50% raza ibérica Noel lonchas": "Extra cooked ham, 50% Iberian breed Noel, sliced",
  "Jamón cocido extra cortado a mano Noel": "Extra hand-carved cooked ham Noel",
  "Jamón cocido extra Hacendado finas lonchas": "Extra cooked ham Hacendado, thin slices",
  "Jamón cocido extra Noel lonchas": "Extra cooked ham Noel, sliced",
  "Jamón cocido extrafino Hacendado lonchas": "Extra fine cooked ham Hacendado, sliced",
  "Jamón cocido Hacendado finas lonchas": "Cooked ham Hacendado, thin slices",
  "Jamón cocido Hacendado lonchas": "Cooked ham Hacendado, sliced",
  "Jamón cocido sándwich Hacendado lonchas": "Sandwich cooked ham Hacendado, sliced",
  "Lacón al horno Noel lonchas": "Oven-baked lacón Noel, sliced",
  "Magro de cerdo cocido Coren": "Cooked lean pork Coren",
  "Maxi york Hacendado": "Maxi York ham Hacendado",
  "Maxi york Hacendado finas lonchas": "Maxi York ham Hacendado, thin slices",
  "Pechuga de pollo 92% Hacendado lonchas": "Chicken breast 92% Hacendado, sliced",

  // ── Jamón serrano
  "Jamón de bellota ibérico 100% cortado a tapas": "100% Iberian acorn-fed ham, cut for tapas",
  "Jamón de bellota ibérico 100% Covap": "100% Iberian acorn-fed ham Covap",
  "Jamón de bellota ibérico cortado a tapas": "Iberian acorn-fed ham, cut for tapas",
  "Jamón de cebo ibérico 50% La Hacienda del Ibérico": "50% Iberian cebo ham La Hacienda del Ibérico",
  "Jamón de cebo ibérico 50% raza ibérica La Hacienda del Ibérico lonchas": "50% Iberian breed cebo ham La Hacienda del Ibérico, sliced",
  "Jamón de cebo ibérico cortado a tapas": "Iberian cebo ham, cut for tapas",
  "Jamón de Teruel D.O.P El Cierzo lonchas": "Teruel ham PDO El Cierzo, sliced",
  "Jamón de Trevélez Antonio Álvarez lonchas extra finas": "Trevélez ham Antonio Álvarez, extra thin slices",
  "Jamón serrano cortado a máquina": "Machine-sliced serrano ham",
  "Jamón serrano gran reserva Hacendado sin aditivos lonchas": "Gran reserva serrano ham, no additives Hacendado, sliced",
  "Jamón serrano Incarlopsa": "Serrano ham Incarlopsa",
  "Jamón serrano Incarlopsa lonchas": "Serrano ham Incarlopsa, sliced",
  "Jamón serrano Incarlopsa lonchas extrafinas": "Serrano ham Incarlopsa, extra thin slices",
  "Jamón serrano Jamcal medias lonchas": "Serrano ham Jamcal, half slices",
  "Jamón serrano reserva cortado a tapas": "Reserva serrano ham, cut for tapas",
  "Paleta curada Paletas Marpa lonchas": "Cured pork shoulder Paletas Marpa, sliced",
  "Paleta de cebo ibérica 50% La Hacienda del Ibérico": "50% Iberian cebo shoulder ham La Hacienda del Ibérico",
  "Paleta de cerdo curada Incarlopsa": "Cured pork shoulder Incarlopsa",
  "Taco jamón curado": "Cured ham block",
  "Taquitos de jamón Incarlopsa": "Ham cubes Incarlopsa",

  // ── L-Casei
  "Bebida láctea de fresa L-casei": "Strawberry dairy drink L-casei",
  "Bebida láctea natural Actimel": "Natural dairy drink Actimel",
  "Bebida láctea natural Actimel 0% MG 0% azúcares añadidos": "Natural dairy drink Actimel, 0% fat, no added sugar",

  // ── Lasaña y canelones
  "Placas para lasaña precocidas El Pavo": "Pre-cooked lasagne sheets El Pavo",

  // ── Leche condensada y otros
  "Leche condensada desnatada Hacendado": "Skimmed condensed milk Hacendado",
  "Leche condensada Hacendado": "Condensed milk Hacendado",

  // ── Leche desnatada
  "Bebida láctea desnatada omega 3 Hacendado": "Skimmed omega 3 dairy drink Hacendado",
  "Bebida láctea Omega 3 Puleva con leche desnatada": "Omega 3 dairy drink with skimmed milk Puleva",
  "Bebida láctea Omega 3 Puleva con nueces y leche desnatada": "Omega 3 dairy drink with walnuts and skimmed milk Puleva",
  "Leche desnatada +Proteínas & calcio": "Skimmed milk +Protein & calcium",
  "Leche desnatada Asturiana": "Skimmed milk Asturiana",
  "Leche desnatada calcio Hacendado": "Skimmed milk with calcium Hacendado",
  "Leche desnatada Hacendado": "Skimmed milk Hacendado",
  "Leche desnatada sin lactosa Hacendado": "Lactose-free skimmed milk Hacendado",
  "Leche en polvo desnatada Hacendado": "Skimmed milk powder Hacendado",

  // ── Leche entera
  "Leche entera Asturiana": "Whole milk Asturiana",
  "Leche entera Hacendado": "Whole milk Hacendado",
  "Leche entera sin lactosa Hacendado": "Lactose-free whole milk Hacendado",

  // ── Leche semidesnatada
  "Bebida láctea semidesnatada con fibra Hacendado": "Semi-skimmed dairy drink with fibre Hacendado",
  "Leche semidesnatada Asturiana": "Semi-skimmed milk Asturiana",
  "Leche semidesnatada calcio Hacendado": "Semi-skimmed milk with calcium Hacendado",
  "Leche semidesnatada de cabra Hacendado": "Semi-skimmed goat milk Hacendado",
  "Leche semidesnatada Hacendado": "Semi-skimmed milk Hacendado",
  "Leche semidesnatada sin lactosa Hacendado": "Lactose-free semi-skimmed milk Hacendado",

  // ── Lechuga
  "Canónigos lavados": "Washed lamb's lettuce",
  "Ensalada mezcla brotes tiernos lavada": "Washed baby leaf salad mix",
  "Ensalada mezcla brotes tiernos maxi lavada": "Washed baby leaf salad mix, maxi",
  "Ensalada mezcla dúo canónigos y rúcula lavada": "Washed salad duo: lamb's lettuce and rocket",
  "Ensalada mezcla gourmet lavada": "Washed gourmet salad mix",
  "Ensalada mezcla gourmet maxi lavada": "Washed gourmet salad mix, maxi",
  "Ensalada mezcla tierna lavada": "Washed tender salad mix",
  "Espinacas baby lavadas": "Washed baby spinach",
  "Lechuga corazón romana": "Romaine lettuce heart",
  "Lechuga hoja roble": "Oak leaf lettuce",
  "Lechuga Iceberg": "Iceberg lettuce",
  "Lechuga romana cortada y lavada": "Cut and washed romaine lettuce",
  "Lechugas corazón romana": "Romaine lettuce hearts",
  "Rúcula lavada": "Washed rocket",

  // ── Lentejas y otros
  "Lenteja cocida Hacendado": "Cooked lentils Hacendado",

  // ── Lomo y otros
  "Cabecero de lomo Hacendado lonchas": "Pork neck loin Hacendado, sliced",
  "Lomo de bellota ibérico 50% raza ibérica cortado a máquina": "Acorn-fed loin, 50% Iberian breed, machine-sliced",
  "Lomo de cebo ibérico 50% raza ibérica cortado a máquina": "Cebo Iberian loin, 50% Iberian breed, machine-sliced",
  "Lomo de pavo Hacendado lonchas": "Turkey loin Hacendado, sliced",
  "Lomo embuchado Hacendado lonchas": "Cured lomo embuchado Hacendado, sliced",
  "Lomo Hacendado": "Cured pork loin Hacendado",
  "Surtido de ibéricos La Hacienda del ibérico lonchas": "Iberian cold cuts assortment La Hacienda del ibérico, sliced",

  // ── Mantequilla
  "Mantequilla con sal Hacendado": "Salted butter Hacendado",
  "Mantequilla en porciones Hacendado sin sal añadida": "Butter portions, no added salt Hacendado",
  "Mantequilla light Hacendado": "Light butter Hacendado",
  "Mantequilla sin lactosa Hacendado": "Lactose-free butter Hacendado",
  "Mantequilla sin sal añadida Hacendado": "Unsalted butter Hacendado",

  // ── Manzana y pera
  "Manzana Golden": "Golden apple",
  "Manzana Granny Smith": "Granny Smith apple",
  "Manzanas Golden": "Golden apples",
  "Pera Conferencia": "Conference pear",
  "Peras Conferencia": "Conference pears",

  // ── Margarina
  "Margarina 100% vegetal Hacendado": "100% vegetable margarine Hacendado",
  "Margarina con sal Hacendado": "Salted margarine Hacendado",
  "Margarina Flora Original": "Margarine Flora Original",
  "Margarina Flora Proactiv": "Margarine Flora Proactiv",
  "Margarina Hacendado": "Margarine Hacendado",
  "Margarina Tulipán Original": "Margarine Tulipán Original",

  // ── Marisco
  "Gamba cocida": "Cooked shrimp",
  "Langostino cocido": "Cooked king prawns",

  // ── Mejillones
  "Mejillones al natural Hacendado pequeños": "Small mussels in brine Hacendado",
  "Mejillones de Chile en escabeche Hacendado pequeños": "Small Chilean mussels in escabeche Hacendado",
  "Mejillones en escabeche Hacendado medianos": "Medium mussels in escabeche Hacendado",
  "Mejillones en escabeche Hacendado pequeños": "Small mussels in escabeche Hacendado",
  "Mejillones en salsa de vieira Hacendado pequeños": "Small mussels in scallop sauce Hacendado",
  "Mejillones picantes en escabeche Hacendado pequeños": "Small spicy mussels in escabeche Hacendado",

  // ── Melocotón
  "Bebida de melocotón Hacendado sin azúcares añadidos": "Peach drink Hacendado, no added sugar",

  // ── Melón y sandía
  "Medio melón piel de sapo": "Half piel de sapo melon",
  "Melón piel de sapo": "Piel de sapo melon",

  // ── Mermelada
  "Mermelada de albaricoque Hacendado": "Apricot jam Hacendado",
  "Mermelada de arándanos Hacendado": "Blueberry jam Hacendado",
  "Mermelada de ciruela y kiwi Hacendado": "Plum and kiwi jam Hacendado",
  "Mermelada de frambuesa Hacendado": "Raspberry jam Hacendado",
  "Mermelada de fresa Hacendado": "Strawberry jam Hacendado",
  "Mermelada de fresa monodosis Hacendado": "Strawberry jam portions Hacendado",
  "Mermelada de higo Hacendado": "Fig jam Hacendado",
  "Mermelada de melocotón monodosis Hacendado": "Peach jam portions Hacendado",
  "Mermelada de naranja amarga Hacendado": "Bitter orange marmalade Hacendado",
  "Mermelada de tomate Hacendado": "Tomato jam Hacendado",

  // ── Miel
  "Miel de flores Hacendado": "Flower honey Hacendado",
  "Miel de naranjo Hacendado": "Orange blossom honey Hacendado",

  // ── Monodosis
  "Café monodosis natural Hacendado": "Natural single-serve coffee Hacendado",

  // ── Mortadela
  "Galantina con pistacho y trufa Hacendado finas lonchas": "Galantine with pistachio and truffle Hacendado, thin slices",
  "Mortadela con aceitunas Hacendado lonchas": "Mortadella with olives Hacendado, sliced",
  "Mortadela de pavo con aceitunas Hacendado finas lonchas": "Turkey mortadella with olives Hacendado, thin slices",
  "Mortadela de pavo Hacendado finas lonchas": "Turkey mortadella Hacendado, thin slices",
  "Mortadela Hacendado": "Mortadella Hacendado",
  "Mortadela Hacendado lonchas": "Mortadella Hacendado, sliced",
  "Mortadela italiana Hacendado finas lonchas": "Italian mortadella Hacendado, thin slices",

  // ── Naranja
  "Bebida de naranja Hacendado sin azúcares añadidos": "Orange drink Hacendado, no added sugar",
  "Bebida Florida Hacendado": "Florida drink Hacendado",
  "Refresco Fanta naranja": "Fanta orange soft drink",
  "Refresco Fanta naranja zero azúcares añadidos": "Fanta orange zero added sugar soft drink",
  "Zumo pura naranja con pulpa Hacendado": "100% orange juice with pulp Hacendado",
  "Zumo pura naranja Hacendado": "100% orange juice Hacendado",

  // ── Nata
  "Crema de soja Hacendado": "Soy cream Hacendado",
  "Nata fresca para cocinar Hacendado": "Fresh cooking cream Hacendado",
  "Nata ligera para cocinar Hacendado": "Light cooking cream Hacendado",
  "Nata ligera para cocinar sin lactosa Hacendado": "Lactose-free light cooking cream Hacendado",
  "Nata montada azucarada Hacendado": "Sweetened whipped cream Hacendado",
  "Nata para montar Hacendado": "Whipping cream Hacendado",

  // ── Natillas
  "Natillas con chocolate +Proteínas 10 g 1,3 g MG": "Chocolate custard +Protein 10 g, 1.3 g fat",
  "Natillas de chocolate Danet": "Chocolate custard Danet",
  "Natillas de vainilla Danet": "Vanilla custard Danet",
  "Natillas sabor vainilla +Proteínas 12 g": "Vanilla-flavour custard +Protein 12 g",
  "Natillas sabor vainilla con galleta Hacendado": "Vanilla-flavour custard with biscuit Hacendado",
  "Natillas sabor vainilla Hacendado": "Vanilla-flavour custard Hacendado",

  // ── Otras conservas de pescado
  "Calamar en salsa americana Hacendado": "Squid in American sauce Hacendado",
  "Calamar en tinta Hacendado": "Squid in its ink Hacendado",
  "Chipirones rellenos enteros en aceite de girasol Hacendado": "Whole stuffed baby squid in sunflower oil Hacendado",
  "Salmón al natural Hacendado": "Salmon in brine Hacendado",
  "Tacos de pota al ajillo Hacendado": "Garlic squid chunks Hacendado",

  // ── Otras frutas
  "Arándanos": "Blueberries",
  "Ciruelas Claudia": "Greengage plums",
  "Fresas": "Strawberries",
  "Melocotón amarillo": "Yellow peach",

  // ── Otros
  "Burgers vegetales Hacendado con calabaza": "Vegetable burgers with pumpkin Hacendado",
  "Cereales solubles con achicoria Hacendado": "Instant cereal drink with chicory Hacendado",
  "Crema de leche para café Campina": "Coffee creamer Campina",
  "Empanados vegetales con proteína de soja Tivall": "Breaded vegetable bites with soy protein Tivall",
  "Mini burgers vegetales Hacendado con espinacas y zanahoria": "Mini vegetable burgers with spinach and carrot Hacendado",
  "Patatas bravas con allioli y salsa picante Hacendado": "Patatas bravas with aioli and spicy sauce Hacendado",
  "Patatas fritas con carne kebab y salsa Hacendado": "Chips with kebab meat and sauce Hacendado",
  "Sándwiches jamón y queso Hacendado": "Ham and cheese sandwiches Hacendado",
  "Seitán Soria Natural lonchas": "Seitan Soria Natural, sliced",

  // ── Otros panes
  "Barra de pan tradicional": "Traditional bread loaf",
  "Hogaza sin gluten": "Gluten-free round loaf",
  "Media Hogaza integral de avena, semillas de girasol y sésamo Hacendado rebanado": "Half wholegrain oat loaf with sunflower and sesame seeds Hacendado, sliced",
  "Pan 5 semillas": "5-seed bread",
  "Pan Brioche Hacendado": "Brioche bread Hacendado",
  "Pan de molde 12 cereales y semillas Hacendado": "12 grains and seeds sandwich bread Hacendado",
  "Pan de molde 15% maíz Hacendado": "15% corn sandwich bread Hacendado",
  "Pan de molde con 35% avena Hacendado 0% azúcares añadidos con harina 100% integral": "35% oat sandwich bread with 100% wholemeal flour, no added sugar Hacendado",
  "Pan de molde con 55% centeno Hacendado": "55% rye sandwich bread Hacendado",
  "Pan de molde espelta 100% integral Hacendado natural": "100% wholegrain spelt sandwich bread Hacendado",
  "Pan de molde semillas y pipas de calabaza Hacendado": "Sandwich bread with seeds and pumpkin seeds Hacendado",
  "Pan redondo sin gluten Hacendado": "Gluten-free round bread Hacendado",

  // ── Otros postres
  "Arroz con leche Hacendado": "Rice pudding Hacendado",
  "Cheesecake con arándanos Hacendado": "Blueberry cheesecake Hacendado",
  "Copa crema de chocolate y nata Hacendado": "Chocolate cream and whipped cream cup Hacendado",
  "Coulant de chocolate Hacendado": "Chocolate coulant Hacendado",
  "Crema catalana Hacendado": "Crema catalana Hacendado",
  "Cuajada Hacendado": "Cuajada (curd dessert) Hacendado",
  "Mousse de chocolate Hacendado": "Chocolate mousse Hacendado",
  "Mousse sabor chocolate +Proteínas 10 g": "Chocolate-flavour mousse +Protein 10 g",
  "Panna Cotta con caramelo Hacendado": "Panna cotta with caramel Hacendado",
  "Pudding sabor caramelo +Proteínas 12 g": "Caramel-flavour pudding +Protein 12 g",
  "Tarta de queso Hacendado": "Cheesecake Hacendado",
  "Tiramisú Hacendado": "Tiramisu Hacendado",
  "Yogur azucarado YogoMix Bolitas Hacendado con bolitas chocolateadas": "Sweetened yogurt YogoMix Bolitas with chocolate balls Hacendado",
  "Yogur azucarado YogoMix Discos Hacendado con disquitos chocolateados": "Sweetened yogurt YogoMix Discos with chocolate discs Hacendado",
  "Yogur azucarado YogoMix Hacendado variado de copos maíz, bolitas y disquitos chocolateados": "Sweetened yogurt YogoMix with corn flakes, chocolate balls and discs Hacendado",

  // ── Otros refrescos sin gas
  "Bebida Florida Sunny Delight": "Florida drink Sunny Delight",
  "Refresco sin gas cero fusión de frutas Hacendado": "Still zero fruit fusion drink Hacendado",
  "Refresco sin gas cero piña-coco Hacendado": "Still zero pineapple-coconut drink Hacendado",
  "Refresco sin gas de naranja Hacendado": "Still orange drink Hacendado",
  "Refresco sin gas de naranja Simon Life": "Still orange drink Simon Life",
  "Refresco sin gas Tropical Hacendado": "Still tropical drink Hacendado",

  // ── Otros sabores
  "Bebida de pomelo Hacendado sin azúcares añadidos": "Grapefruit drink Hacendado, no added sugar",
  "Néctar de guayaba Hacendado": "Guava nectar Hacendado",
  "Néctar de maracuyá Hacendado fruta de la pasión, mango, uva y manzana": "Passion fruit nectar with mango, grape and apple Hacendado",
  "Zumo de manzana Hacendado": "Apple juice Hacendado",
  "Zumo de tomate Hacendado": "Tomato juice Hacendado",

  // ── Pan de bocadillo
  "11 Panecillos": "11 bread rolls",
  "3 Bocadillos": "3 sandwich rolls",
  "5 Barras de pan 51% integral": "5 bread loaves, 51% wholegrain",
  "6 Panecillos integrales 100%": "6 wholegrain rolls 100%",
  "6 Panes de centeno 51%": "6 rye breads 51%",
  "6 Panes de leche 3%": "6 milk rolls 3%",
  "Pan mini semillas": "Mini seed bread",
  "Pan Viena": "Vienna bread",
  "Panecillo de trigo integral 30%": "30% wholewheat roll",
  "Panecillo harina integral 50% de trigo sin sal añadida": "50% wholewheat flour roll, no added salt",
  "Panecillo sin sal añadida": "Roll, no added salt",
  "Panes chapata de cristal": "Crystal ciabatta rolls",
  "Panes con semillas": "Seeded rolls",
  "Panes de cristal redondos cortados 100 % natural": "Round crystal bread rolls, cut, 100% natural",
  "Panes integrales 100% fino": "Thin 100% wholegrain rolls",

  // ── Pan de hamburguesa y wrap
  "Maxi pan de burger Hacendado": "Maxi burger buns Hacendado",
  "Maxi tortillas de trigo Hacendado": "Maxi wheat tortillas Hacendado",
  "Mini pan de burger Hacendado": "Mini burger buns Hacendado",
  "Mini tortillas de trigo Hacendado": "Mini wheat tortillas Hacendado",
  "Pan de burger Brioche Hacendado": "Brioche burger buns Hacendado",
  "Pan de pita Mission": "Pita bread Mission",
  "Pan hot dog Hacendado": "Hot dog buns Hacendado",
  "Piadina Hacendado": "Piadina Hacendado",
  "Tortillas de avena 51% Hacendado": "51% oat tortillas Hacendado",
  "Tortillas de maíz Hacendado": "Corn tortillas Hacendado",
  "Tortillas de trigo Hacendado": "Wheat tortillas Hacendado",
  "Tortillas de trigo integrales Hacendado": "Wholewheat tortillas Hacendado",

  // ── Pan de molde
  "Pan de molde 100% integral familiar Hacendado": "100% wholegrain family sandwich bread Hacendado",
  "Pan de molde 100% integral Hacendado": "100% wholegrain sandwich bread Hacendado",
  "Pan de molde 100% integral sin corteza Hacendado": "100% wholegrain crustless sandwich bread Hacendado",
  "Pan de molde blanco familiar Hacendado": "White family sandwich bread Hacendado",
  "Pan de molde blanco Hacendado": "White sandwich bread Hacendado",
  "Pan de molde blanco natural rústico Hacendado": "Rustic natural white sandwich bread Hacendado",
  "Pan de molde blanco rebanada gruesa Hacendado": "Thick-sliced white sandwich bread Hacendado",
  "Pan de molde blanco sin corteza Hacendado": "Crustless white sandwich bread Hacendado",
  "Pan de molde cereales sin gluten Hacendado": "Gluten-free multigrain sandwich bread Hacendado",
  "Pan de molde sin gluten blanco Hacendado": "Gluten-free white sandwich bread Hacendado",

  // ── Pan rallado
  "Pan rallado casero Hacendado": "Homemade breadcrumbs Hacendado",
  "Pan rallado de arroz Hacendado": "Rice breadcrumbs Hacendado",
  "Pan rallado Hacendado": "Breadcrumbs Hacendado",
  "Preparado crujiente Hacendado": "Crispy coating mix Hacendado",

  // ── Pan rebanado
  "3 Barras de pan aceite de oliva rebanadas": "3 olive oil loaves, sliced",
  "3 Barras de pan rebanadas": "3 bread loaves, sliced",
  "Barra de pan espiga rebanado": "Wheat-ear loaf, sliced",
  "Barra de pan rebanada": "Bread loaf, sliced",
  "Barra pan de aceite de oliva rebanada": "Olive oil loaf, sliced",
  "Barra pan integral de espelta 100% rebanado": "100% wholegrain spelt loaf, sliced",
  "Hogaza de centeno 50% rebanado": "50% rye loaf, sliced",
  "Pan campeón del mundo rebanado": "\"World champion\" bread, sliced",
  "Pan integral de trigo 100% rebanado": "100% wholewheat bread, sliced",

  // ── Pan tostado
  "Mini biscotes de trigo Hacendado": "Mini wheat rusks Hacendado",
  "Mini tostadas de trigo Hacendado extra finas": "Extra thin mini wheat toasts Hacendado",
  "Pan tostado 100% espelta integral Hacendado": "100% wholegrain spelt toasts Hacendado",
  "Pan tostado 100% integral": "100% wholegrain toasts",
  "Pan tostado 100% integral bajo en sal y en azúcares Hacendado": "100% wholegrain toasts, low salt and sugar Hacendado",
  "Pan tostado cereales y semillas Hacendado": "Toasts with grains and seeds Hacendado",
  "Pan tostado classic Hacendado": "Classic toasts Hacendado",
  "Pan tostado pasas Hacendado": "Raisin toasts Hacendado",
  "Panecillo tostado 100% integral de trigo Hacendado": "100% wholewheat toasted rolls Hacendado",
  "Panecillo tostado classic Hacendado": "Classic toasted rolls Hacendado",
  "Panecillos tostados cereales y semillas Hacendado": "Toasted rolls with grains and seeds Hacendado",
  "Tortas cenceñas para gazpacho manchego Ruiz": "Unleavened flatbreads for gazpacho manchego Ruiz",

  // ── Pasta
  "Canelones de carne Hacendado": "Meat cannelloni Hacendado",
  "Lasaña boloñesa familiar Hacendado": "Family bolognese lasagne Hacendado",
  "Lasaña boloñesa Hacendado": "Bolognese lasagne Hacendado",
  "Lasaña de espinacas y requesón Hacendado": "Spinach and ricotta lasagne Hacendado",
  "Lasaña de pollo Hacendado": "Chicken lasagne Hacendado",
  "Macarrones Mac & Cheese Bacon Hacendado gratinados": "Baked Mac & Cheese Bacon macaroni Hacendado",
  "Pasta tiburón Mac & Cheese Hacendado con salsa de queso": "Shark pasta Mac & Cheese with cheese sauce Hacendado",
  "Spaghetti carbonara Hacendado": "Spaghetti carbonara Hacendado",

  // ── Pastelitos surtidos
  "Bizcocho con baño de cacao Hacendado": "Cocoa-glazed sponge cake Hacendado",
  "Coquito": "Coconut macaroon",
  "Espiral al cacao Hacendado": "Cocoa swirl Hacendado",
  "Hojaldre cabello de Ángel Hacendado": "Puff pastry with angel hair squash jam Hacendado",
  "Hojaldre relleno de crema de cacao Hacendado": "Puff pastry with cocoa cream Hacendado",
  "Pasta de almendra Hacendado": "Almond paste cake Hacendado",
  "Rollo con sabor avellana Hacendado": "Hazelnut-flavour roll Hacendado",
  "Rosquilla al cacao Hacendado": "Cocoa ring doughnut Hacendado",

  // ── Patatas fritas
  "Aperitivo de patata con sabor a nata agria y cebolla": "Potato snack, sour cream and onion flavour",
  "Aperitivo de patata sabor barbacoa Hacendado": "Barbecue potato snack Hacendado",
  "Aperitivo de patata sabor crema agria y cebolla Pringles": "Sour cream and onion potato snack Pringles",
  "Aperitivo de patata sabor original Pringles": "Original potato snack Pringles",
  "Patatas fritas 0% sal añadida Hacendado": "Crisps, no added salt Hacendado",
  "Patatas fritas clásicas Hacendado": "Classic crisps Hacendado",
  "Patatas fritas corte ondulado Hacendado": "Ridged crisps Hacendado",
  "Patatas fritas extra crujientes Hacendado": "Extra crunchy crisps Hacendado",
  "Patatas fritas onduladas sabor jamón serrano Hacendado": "Serrano ham flavour ridged crisps Hacendado",
  "Patatas fritas onduladas sabor queso de cabra y cebolla caramelizada Hacendado": "Goat cheese and caramelised onion ridged crisps Hacendado",
  "Patatas fritas sabor sal y vinagre Hacendado": "Salt and vinegar crisps Hacendado",
  "Patatas light Hacendado": "Light crisps Hacendado",

  // ── Paté
  "Bloc foie gras de pato Hacendado": "Duck foie gras block Hacendado",
  "Foie gras entero de pato Hacendado": "Whole duck foie gras Hacendado",
  "Mousse de pato Hacendado": "Duck mousse Hacendado",
  "Paté de cerdo con finas hierbas Hacendado": "Pork pâté with herbs Hacendado",
  "Paté de cerdo con pimienta Hacendado": "Pork pâté with pepper Hacendado",
  "Paté de cerdo con pimienta verde Hacendado": "Pork pâté with green pepper Hacendado",
  "Paté de cerdo La Piara tapa negra": "Pork pâté La Piara black lid",
  "Paté de cerdo sabor suave Hacendado": "Mild pork pâté Hacendado",
  "Paté de cerdo y pollo con trufa y arándanos Hacendado": "Pork and chicken pâté with truffle and cranberries Hacendado",
  "Paté de hígado de cerdo ibérico Hacendado": "Iberian pork liver pâté Hacendado",
  "Paté de hígado de cerdo sabor intenso Hacendado": "Strong pork liver pâté Hacendado",
  "Paté de jamón Hacendado": "Ham pâté Hacendado",
  "Paté de lomo de atún Hacendado": "Tuna loin pâté Hacendado",
  "Paté de pollo asado Hacendado": "Roast chicken pâté Hacendado",
  "Paté de salmón Hacendado": "Salmon pâté Hacendado",

  // ── Pavo y otros
  "Cabeza de cerdo Hacendado finas lonchas": "Pork head cheese Hacendado, thin slices",
  "Jamón de pavo Hacendado": "Turkey ham Hacendado",
  "Jamón de pavo Hacendado finas lonchas": "Turkey ham Hacendado, thin slices",
  "Lomo asado La Carloteña lonchas": "Roast pork loin La Carloteña, sliced",
  "Longaniza de pavo extra Hacendado lonchas": "Extra turkey longaniza sausage Hacendado, sliced",
  "Mini muslo de pollo 98% La Carloteña asado al horno": "Mini chicken drumstick 98% oven roasted La Carloteña",
  "Muslito de pollo 97% La Carloteña asado al horno lonchas": "Chicken drumstick 97% oven roasted La Carloteña, sliced",
  "Pechuga 92% pavo Hacendado lonchas": "Turkey breast 92% Hacendado, sliced",
  "Pechuga de pavo al horno de leña Campofrío lonchas": "Wood-fired turkey breast Campofrío, sliced",
  "Pechuga de pavo Hacendado finas lonchas": "Turkey breast Hacendado, thin slices",
  "Pechuga de pavo Noel lonchas muy finas": "Turkey breast Noel, very thin slices",
  "Pechuga de pavo reducido en sal Hacendado finas lonchas": "Reduced-salt turkey breast Hacendado, thin slices",
  "Pechuga de pollo braseada extrafino Hacendado lonchas": "Extra fine braised chicken breast Hacendado, sliced",
  "Pechuga pavo cocida extrafino Hacendado lonchas": "Extra fine cooked turkey breast Hacendado, sliced",
  "Pechuguita de pollo 99% La Carloteña asada al horno lonchas": "Chicken breast 99% oven roasted La Carloteña, sliced",
  "Salchichón de pavo extra Hacendado lonchas": "Extra turkey salchichón Hacendado, sliced",
  "Sticks longaniza de pavo extra Hacendado": "Extra turkey longaniza sticks Hacendado",
  "Tiras de pechuga de pollo 99% Hacendado al natural": "Natural chicken breast strips 99% Hacendado",
  "Tiras de pechuga pollo 99% al horno Hacendado": "Oven-roasted chicken breast strips 99% Hacendado",

  // ── Pepinillos y otros encurtidos
  "Ajos aliñados Hacendado": "Seasoned garlic Hacendado",
  "Alcaparras Hacendado": "Capers Hacendado",
  "Altramuces Hacendado": "Lupin beans Hacendado",
  "Cebollitas Hacendado": "Pearl onions Hacendado",
  "Jalapeños picantes en vinagre Hacendado": "Spicy jalapeños in vinegar Hacendado",
  "Mix de pepinillos y cebollitas Hacendado": "Gherkin and pearl onion mix Hacendado",
  "Pepinillos agridulces Hacendado": "Sweet and sour gherkins Hacendado",
  "Pepinillos en vinagre Hacendado": "Gherkins in vinegar Hacendado",
  "Pepinillos pequeños Hacendado": "Small gherkins Hacendado",
  "Picadillo de variantes Hacendado": "Chopped mixed pickles Hacendado",
  "Piparra Hacendado": "Piparra peppers Hacendado",

  // ── Pepino y zanahoria
  "Palitos de zanahoria": "Carrot sticks",
  "Pepino holandés": "Dutch cucumber",
  "Zanahoria rallada lavada": "Grated washed carrot",
  "Zanahorias": "Carrots",

  // ── Picatostes
  "Picatostes fritos con ajo Hacendado": "Fried garlic croutons Hacendado",
  "Picatostes fritos Hacendado": "Fried croutons Hacendado",
  "Picatostes tostados Hacendado": "Toasted croutons Hacendado",

  // ── Picos
  "Grissini palitos de pan Hacendado": "Grissini breadsticks Hacendado",
  "Picos 100% integral de trigo Hacendado": "100% wholewheat picos breadsticks Hacendado",
  "Picos camperos Hacendado": "Country picos breadsticks Hacendado",
  "Picos Hacendado": "Picos breadsticks Hacendado",
  "Picos saladitos Hacendado": "Salted picos breadsticks Hacendado",
  "Picos sin gluten Hacendado": "Gluten-free picos breadsticks Hacendado",
  "Piquitos bajos en sal Hacendado con orégano y tomillo": "Low-salt mini breadsticks with oregano and thyme Hacendado",
  "Piquitos con salvado San Roque": "Mini breadsticks with bran San Roque",
  "Regañá artesana Hacendado": "Artisan regañá crispbread Hacendado",
  "Regañá Hacendado": "Regañá crispbread Hacendado",

  // ── Piña
  "Bebida de piña Hacendado sin azúcares añadidos": "Pineapple drink Hacendado, no added sugar",
  "Néctar de piña La Verja": "Pineapple nectar La Verja",
  "Zumo de piña Hacendado": "Pineapple juice Hacendado",
  "Zumo de piña selección Hacendado": "Selection pineapple juice Hacendado",
  "Zumo de piña y uva Hacendado": "Pineapple and grape juice Hacendado",

  // ── Pizzas refrigeradas
  "Pizza 4 quesos familiar Hacendado": "Family 4-cheese pizza Hacendado",
  "Pizza 4 quesos Hacendado": "4-cheese pizza Hacendado",
  "Pizza atún y bacón Hacendado": "Tuna and bacon pizza Hacendado",
  "Pizza barbacoa familiar Hacendado": "Family barbecue pizza Hacendado",
  "Pizza barbacoa Hacendado": "Barbecue pizza Hacendado",
  "Pizza carbonara familiar Hacendado": "Family carbonara pizza Hacendado",
  "Pizza carbonara Hacendado": "Carbonara pizza Hacendado",
  "Pizza carnívora Hacendado": "Meat lovers pizza Hacendado",
  "Pizza Formaggi Hacendado 4 quesos": "Formaggi 4-cheese pizza Hacendado",
  "Pizza Frankfurt Hacendado": "Frankfurt pizza Hacendado",
  "Pizza jamón y queso familiar Hacendado": "Family ham and cheese pizza Hacendado",
  "Pizza jamón y queso Hacendado": "Ham and cheese pizza Hacendado",
  "Pizza jamón y queso sin gluten y sin lactosa Hacendado": "Gluten-free, lactose-free ham and cheese pizza Hacendado",
  "Pizza pepperoni Hacendado": "Pepperoni pizza Hacendado",
  "Pizza pollo Hacendado": "Chicken pizza Hacendado",
  "Pizza pollo y bacón Hacendado": "Chicken and bacon pizza Hacendado",
  "Pizza Prosciutto Hacendado jamón y queso": "Prosciutto pizza with ham and cheese Hacendado",
  "Pizza romana Hacendado con champiñones salteados": "Romana pizza with sautéed mushrooms Hacendado",
  "Pizza serrana Hacendado": "Serrana pizza Hacendado",

  // ── Plátano y uva
  "Plátano de Canarias IGP": "Canary Islands bananas PGI",
  "Plátano macho": "Plantain",
  "Uva blanca sin semillas": "Seedless white grapes",
  "Uva roja sin semillas": "Seedless red grapes",

  // ── Platos calientes
  "Salmón con verduras Listo para Comer": "Salmon with vegetables Listo para Comer",
  "Tortilla de patata con calabacín Listo para Comer": "Potato omelette with courgette Listo para Comer",
  "Tortilla de patata con cebolla Listo para Comer": "Potato omelette with onion Listo para Comer",

  // ── Platos de cuchara
  "Albóndigas en salsa Hacendado": "Meatballs in sauce Hacendado",
  "Alubias a la jardinera Hacendado": "Beans with vegetables Hacendado",
  "Alubias con tomate Heinz": "Baked beans in tomato sauce Heinz",
  "Callos a la madrileña Hacendado": "Madrid-style tripe Hacendado",
  "Cocido Hacendado": "Cocido stew Hacendado",
  "Fabada Hacendado": "Fabada bean stew Hacendado",
  "Garbanzos a la jardinera Hacendado": "Chickpeas with vegetables Hacendado",
  "Garbanzos a la riojana Hacendado": "Rioja-style chickpeas Hacendado",
  "Lentejas a la jardinera Hacendado": "Lentils with vegetables Hacendado",
  "Lentejas a la riojana Hacendado": "Rioja-style lentils Hacendado",

  // ── Platos fríos
  "Ensalada de marisco Listo para Comer": "Seafood salad Listo para Comer",
  "Poke salmón": "Salmon poke",
  "Surtido sushi Bento mix": "Bento mix sushi assortment",
  "Surtido sushi Bento pequeño": "Small Bento sushi assortment",

  // ── Pollo
  "Empanados de pollo picantes sin gluten": "Gluten-free spicy breaded chicken",
  "Filetes solomillos de pollo marinados empanados sin gluten": "Gluten-free breaded marinated chicken tenderloins",

  // ── Postres de soja
  "Postre de coco natural Alpro sin azúcares añadidos": "Natural coconut dessert Alpro, no added sugar",
  "Postre de soja natural Hacendado": "Natural soy dessert Hacendado",
  "Postre de soja sabor arándanos Alpro": "Blueberry soy dessert Alpro",
  "Postre de soja sabor chocolate Hacendado": "Chocolate soy dessert Hacendado",
  "Postre de soja sabor mango Alpro sin azúcares añadidos": "Mango soy dessert Alpro, no added sugar",
  "Postre de soja sabor natural con coco Alpro": "Natural soy dessert with coconut Alpro",
  "Postre de soja sabor vainilla Hacendado": "Vanilla soy dessert Hacendado",

  // ── Queso curado
  "Queso añejo de oveja al romero Hacendado": "Aged sheep cheese with rosemary Hacendado",
  "Queso añejo fuerte de oveja Hacendado": "Strong aged sheep cheese Hacendado",
  "Queso añejo fuerte de oveja Hacendado cortado en cuñitas": "Strong aged sheep cheese Hacendado, cut in wedges",
  "Queso Arzúa-Ulloa de vaca Punteiro": "Arzúa-Ulloa cow cheese Punteiro",
  "Queso curado cheddar Hacendado": "Mature cheddar Hacendado",
  "Queso curado DOP manchego de oveja Hacendado": "Cured Manchego sheep cheese PDO Hacendado",
  "Queso curado mezcla afrutado Hacendado cortado en cuñitas": "Fruity cured mixed-milk cheese Hacendado, cut in wedges",
  "Queso curado mezcla Hacendado": "Cured mixed-milk cheese Hacendado",
  "Queso curado mezcla Hacendado cortado en cuñitas": "Cured mixed-milk cheese Hacendado, cut in wedges",
  "Queso curado mezcla madurado en madera Hacendado": "Wood-aged cured mixed-milk cheese Hacendado",
  "Queso curado y cheddar Hacendado en dados": "Cured and cheddar cheese cubes Hacendado",
  "Queso grana padano Hacendado en escamas": "Grana Padano cheese shavings Hacendado",
  "Queso grana padano Zanetti": "Grana Padano cheese Zanetti",
  "Queso viejo ahumado de oveja Hacendado": "Smoked old sheep cheese Hacendado",
  "Queso viejo de oveja Hacendado": "Old sheep cheese Hacendado",
  "Queso viejo tostado mezcla Hacendado": "Toasted old mixed-milk cheese Hacendado",
  "Tabla de quesos nacionales Hacendado": "Spanish cheese board Hacendado",

  // ── Queso en porciones
  "Queso en porciones Hacendado": "Cheese portions Hacendado",
  "Queso en porciones light Hacendado": "Light cheese portions Hacendado",
  "Queso en porciones mini Babybel": "Mini cheese portions Babybel",
  "Queso fundido con palitos La vaca que ríe": "Processed cheese with breadsticks La vaca que ríe",

  // ── Queso especialidades
  "Queso azul de vaca Hacendado": "Blue cow cheese Hacendado",
  "Queso brie marcillat de vaca Plaisir de Roy": "Brie Marcillat cow cheese Plaisir de Roy",
  "Queso camembert de vaca Marcillat": "Camembert cow cheese Marcillat",
  "Queso gorgonzola de vaca Hacendado": "Gorgonzola cow cheese Hacendado",
  "Queso precortado de cabra Hacendado": "Pre-cut goat cheese Hacendado",
  "Queso provolone de vaca Hacendado": "Provolone cow cheese Hacendado",
  "Queso roquefort  de oveja Hacendado": "Roquefort sheep cheese Hacendado",
  "Queso rulo con piña y almendra Liptana": "Cheese log with pineapple and almond Liptana",
  "Queso rulo de cabra Hacendado": "Goat cheese log Hacendado",

  // ── Queso fresco
  "Burrata fresca Hacendado": "Fresh burrata Hacendado",
  "Mozzarella fresca de vaca Hacendado": "Fresh cow mozzarella Hacendado",
  "Mozzarella fresca di bufala campana Hacendado": "Fresh mozzarella di bufala campana Hacendado",
  "Mozzarella fresca light de vaca Hacendado": "Light fresh cow mozzarella Hacendado",
  "Queso cottage Valblu": "Cottage cheese Valblu",
  "Queso feta mezcla Hacendado en dados": "Mixed-milk feta cheese cubes Hacendado",
  "Queso fresco 0% MG de vaca Burgo de Arias": "Fresh cow cheese 0% fat Burgo de Arias",
  "Queso fresco batido desnatado 0% MG Hacendado": "Skimmed whipped fresh cheese 0% fat Hacendado",
  "Queso fresco Burgos desnatado 0% MG Hacendado": "Skimmed fresh Burgos cheese 0% fat Hacendado",
  "Queso fresco Burgos natural Hacendado": "Natural fresh Burgos cheese Hacendado",
  "Queso fresco Burgos sin lactosa Hacendado": "Lactose-free fresh Burgos cheese Hacendado",
  "Queso fresco de cabra Hacendado": "Fresh goat cheese Hacendado",
  "Queso fresco de vaca Burgo de Arias": "Fresh cow cheese Burgo de Arias",
  "Queso fresco de vaca Hacendado": "Fresh cow cheese Hacendado",
  "Queso fresco light de vaca Hacendado": "Light fresh cow cheese Hacendado",
  "Queso fresco mascarpone de vaca Hacendado": "Fresh mascarpone cow cheese Hacendado",
  "Queso fresco servilleta tradicional de vaca Hacendado": "Traditional napkin-wrapped fresh cow cheese Hacendado",
  "Queso ricotta mezcla Hacendado": "Mixed-milk ricotta Hacendado",
  "Requesón mezcla Hacendado": "Mixed-milk curd cheese Hacendado",

  // ── Queso lonchas
  "Queso lonchas cheddar de vaca Hacendado": "Sliced cheddar cow cheese Hacendado",
  "Queso lonchas cremoso de vaca Hacendado": "Sliced creamy cow cheese Hacendado",
  "Queso lonchas cremoso light de vaca Hacendado": "Sliced light creamy cow cheese Hacendado",
  "Queso lonchas de cabra Hacendado": "Sliced goat cheese Hacendado",
  "Queso lonchas de oveja Hacendado": "Sliced sheep cheese Hacendado",
  "Queso lonchas edam de vaca Holland Corona": "Sliced edam cow cheese Holland Corona",
  "Queso lonchas emmental de vaca Hacendado": "Sliced emmental cow cheese Hacendado",
  "Queso lonchas fundido burger mezcla Hacendado": "Sliced processed burger cheese Hacendado",
  "Queso lonchas fundido sándwich mezcla Hacendado": "Sliced processed sandwich cheese Hacendado",
  "Queso lonchas fundido suave mezcla Hacendado": "Sliced mild processed cheese Hacendado",
  "Queso lonchas semicurado mezcla Hacendado": "Sliced semi-cured mixed-milk cheese Hacendado",
  "Queso lonchas sin lactosa de vaca Hacendado": "Sliced lactose-free cow cheese Hacendado",
  "Queso lonchas tierno de vaca Hacendado": "Sliced young cow cheese Hacendado",
  "Queso lonchas tierno mezcla Hacendado": "Sliced young mixed-milk cheese Hacendado",

  // ── Queso rallado
  "Queso en polvo especial pasta mezcla Hacendado": "Powdered pasta cheese Hacendado",
  "Queso en polvo grana padano Hacendado": "Powdered Grana Padano cheese Hacendado",
  "Queso rallado emmental gratinar Hacendado": "Grated emmental for gratin Hacendado",
  "Queso rallado especial fundir mezcla Hacendado": "Grated melting cheese mix Hacendado",
  "Queso rallado mozzarella pizza-Roma de vaca Hacendado": "Grated mozzarella for pizza Roma Hacendado",
  "Queso rallado sin lactosa de vaca Hacendado": "Grated lactose-free cow cheese Hacendado",

  // ── Queso semicurado
  "Queso semicurado de cabra Hacendado": "Semi-cured goat cheese Hacendado",
  "Queso semicurado de oveja Hacendado cortado en cuñitas": "Semi-cured sheep cheese Hacendado, cut in wedges",
  "Queso semicurado mezcla Hacendado": "Semi-cured mixed-milk cheese Hacendado",
  "Queso semicurado mezcla Hacendado cortado en cuñitas": "Semi-cured mixed-milk cheese Hacendado, cut in wedges",
  "Queso semicurado sin lactosa mezcla Hacendado": "Lactose-free semi-cured mixed-milk cheese Hacendado",

  // ── Queso tierno
  "Queso emmental de vaca Hacendado": "Emmental cow cheese Hacendado",
  "Queso tierno bajo en sal mezcla Hacendado": "Low-salt young mixed-milk cheese Hacendado",
  "Queso tierno bola edam de vaca Holland Corona": "Young edam cow cheese ball Holland Corona",
  "Queso tierno de cabra Hacendado": "Young goat cheese Hacendado",
  "Queso tierno de vaca Hacendado cortado en cuñitas": "Young cow cheese Hacendado, cut in wedges",
  "Queso tierno maasdam de vaca Holland Corona": "Young maasdam cow cheese Holland Corona",
  "Queso tierno mezcla Hacendado": "Young mixed-milk cheese Hacendado",
  "Queso tierno mezcla Hacendado cortado en cuñitas": "Young mixed-milk cheese Hacendado, cut in wedges",
  "Queso tierno tronchón mezcla Hacendado": "Young Tronchón mixed-milk cheese Hacendado",

  // ── Queso untable
  "Crema de queso camembert Hacendado": "Camembert cheese spread Hacendado",
  "Crema de queso viejo tostado mezcla Hacendado": "Toasted old mixed-milk cheese spread Hacendado",
  "Mousse de queso de vaca con ajo y finas hierbas Hacendado": "Cow cheese mousse with garlic and herbs Hacendado",
  "Queso untar con queso azul de vaca Hacendado": "Cheese spread with blue cheese Hacendado",
  "Queso untar de vaca con finas hierbas Hacendado": "Cow cheese spread with herbs Hacendado",
  "Queso untar light de vaca Hacendado": "Light cow cheese spread Hacendado",
  "Queso untar light Philadelphia": "Light cream cheese Philadelphia",
  "Queso untar original Philadelphia": "Original cream cheese Philadelphia",
  "Queso untar sin lactosa de vaca Hacendado": "Lactose-free cow cheese spread Hacendado",
  "Queso untar suave de vaca Hacendado": "Mild cow cheese spread Hacendado",

  // ── Roscas, quiche y baguettes
  "Focaccia con tomates cherry Hacendado": "Focaccia with cherry tomatoes Hacendado",
  "Rosca jamón serrano y queso emmental Hacendado": "Ring bread with serrano ham and emmental Hacendado",
  "Rosca lomo, bacón y queso emmental Hacendado": "Ring bread with pork loin, bacon and emmental Hacendado",

  // ── Rosquilletas
  "Palitos con frutos secos Hacendado": "Breadsticks with nuts Hacendado",
  "Palitos de pan con aceitunas Hacendado": "Breadsticks with olives Hacendado",
  "Palitos de pan con chocolate Anitin": "Breadsticks with chocolate Anitin",
  "Panes especiales con tomate y orégano Hacendado": "Special breads with tomato and oregano Hacendado",
  "Panes especiales sabor fuet Hacendado": "Fuet-flavour special breads Hacendado",
  "Panes especiales sabor pizza con queso Hacendado": "Pizza and cheese flavour special breads Hacendado",
  "Rosquilletas de horno Anitin": "Baked rosquilletas Anitin",
  "Rosquilletas de horno saladitas Anitin": "Salted baked rosquilletas Anitin",
  "Rosquilletas tradicionales Hacendado": "Traditional rosquilletas Hacendado",

  // ── Salazones
  "Boquerones al vinagre Hacendado en aceite de girasol": "Anchovies in vinegar, in sunflower oil Hacendado",
  "Boquerones aliñados Hacendado": "Seasoned fresh anchovies Hacendado",
  "Boquerones en vinagre Hacendado en aceite de girasol": "Pickled anchovies in sunflower oil Hacendado",
  "Filetes de anchoa en aceite de girasol Hacendado": "Anchovy fillets in sunflower oil Hacendado",
  "Filetes de anchoa en aceite de oliva Hacendado": "Anchovy fillets in olive oil Hacendado",
  "Migas de bacalao al estilo inglés Hacendado": "English-style cod flakes Hacendado",
  "Migas de bacalao desaladas Hacendado": "Desalted cod flakes Hacendado",
  "Sucedáneo de caviar negro Ubago Caviartic": "Black caviar substitute Ubago Caviartic",

  // ── Salchichas
  "Salchichas cocidas bocata gourmet Hacendado de cerdo sabor ahumado": "Gourmet cooked pork sandwich sausages, smoky flavour Hacendado",
  "Salchichas cocidas bocata Hacendado": "Cooked sandwich sausages Hacendado",
  "Salchichas cocidas bocata Hacendado de pollo y pavo sabor ahumado": "Cooked chicken and turkey sandwich sausages, smoky flavour Hacendado",
  "Salchichas cocidas bocata queso Hacendado": "Cooked cheese sandwich sausages Hacendado",
  "Salchichas cocidas de cerdo estilo Bratwurst Hacendado": "Cooked pork Bratwurst-style sausages Hacendado",
  "Salchichas cocidas de cerdo Hacendado estilo parrillero": "Cooked pork grill-style sausages Hacendado",
  "Salchichas cocidas estilo Frankfurt Campofrío sabor ahumado": "Cooked Frankfurt-style sausages, smoky flavour Campofrío",
  "Salchichas cocidas estilo Frankfurt con queso Hacendado de pollo y cerdo sabor ahumado": "Cooked Frankfurt-style chicken and pork sausages with cheese, smoky flavour Hacendado",
  "Salchichas cocidas estilo Frankfurt Hacendado de pollo y cerdo sabor ahumado": "Cooked Frankfurt-style chicken and pork sausages, smoky flavour Hacendado",
  "Salchichas cocidas estilo Viena con queso Hacendado de pollo y cerdo sabor ahumado": "Cooked Vienna-style chicken and pork sausages with cheese, smoky flavour Hacendado",
  "Salchichas cocidas Frankfurt La Selva": "Cooked Frankfurt sausages La Selva",
  "Salchichas cocidas Hacendado de pollo y pavo sabor ahumado": "Cooked chicken and turkey sausages, smoky flavour Hacendado",
  "Salchichas cocidas hot dog bocadillo Oscar Mayer Classic de pollo y cerdo sabor ahumado": "Cooked hot dog sausages Oscar Mayer Classic, chicken and pork, smoky flavour",
  "Salchichas cocidas Schara de cerdo ahumadas": "Cooked smoked pork sausages Schara",

  // ── Salchichón
  "Fuet espetec Hacendado": "Fuet espetec Hacendado",
  "Longaniza clásica extra Hacendado": "Extra classic longaniza Hacendado",
  "Longaniza de Aragón extra Cárnicas Gállego": "Extra Aragon longaniza Cárnicas Gállego",
  "Longaniza de Pascua extra Hacendado": "Extra Easter longaniza Hacendado",
  "Longaniza de payés extra Hacendado": "Extra country longaniza Hacendado",
  "Longaniza de payés extra Hacendado lonchas": "Extra country longaniza Hacendado, sliced",
  "Mini salchichón ibérico extra La Hacienda del ibérico": "Extra Iberian mini salchichón La Hacienda del ibérico",
  "Pepperoni Hacendado lonchas": "Pepperoni Hacendado, sliced",
  "Salami extra Hacendado lonchas": "Extra salami Hacendado, sliced",
  "Salami extra pimienta Hacendado finas lonchas": "Extra pepper salami Hacendado, thin slices",
  "Salami montañés extra El Pozo": "Extra mountain salami El Pozo",
  "Salchichón cular ibérico extra La Hacienda del ibérico": "Extra Iberian salchichón cular La Hacienda del ibérico",
  "Salchichón de bellota ibérico cortado a máquina": "Acorn-fed Iberian salchichón, machine-sliced",
  "Salchichón extra Hacendado lonchas": "Extra salchichón Hacendado, sliced",
  "Salchichón extra pimienta Hacendado finas lonchas": "Extra pepper salchichón Hacendado, thin slices",
  "Salchichón ibérico extra La Hacienda del ibérico lonchas": "Extra Iberian salchichón La Hacienda del ibérico, sliced",
  "Sticks longaniza extra Hacendado": "Extra longaniza sticks Hacendado",

  // ── Sándwich
  "Sándwich atún y huevo Hacendado": "Tuna and egg sandwich Hacendado",
  "Sándwich pollo y queso Hacendado": "Chicken and cheese sandwich Hacendado",

  // ── Sardinas
  "Sardinas en aceite de oliva Hacendado": "Sardines in olive oil Hacendado",
  "Sardinillas en aceite de oliva Hacendado": "Small sardines in olive oil Hacendado",
  "Sardinillas en escabeche Hacendado": "Small sardines in escabeche Hacendado",
  "Sardinillas en tomate Hacendado": "Small sardines in tomato Hacendado",
  "Sardinillas picantes en aceite de girasol Hacendado": "Spicy small sardines in sunflower oil Hacendado",
  "Sardinillas reducidas en sal en aceite de oliva Hacendado": "Reduced-salt small sardines in olive oil Hacendado",

  // ── Sepia, pulpo y calamar
  "Patas de pulpo cocido": "Cooked octopus legs",

  // ── Snacks
  "Aros de maíz Hacendado": "Corn rings Hacendado",
  "Combinado de aperitivos Hacendado": "Snack mix Hacendado",
  "Conos sabor bacón y queso Hacendado": "Bacon and cheese flavour cones Hacendado",
  "Cortezas de cerdo fritas sabor barbacoa Hacendado": "Barbecue fried pork rinds Hacendado",
  "Cuquis Hacendado": "Cuquis snacks Hacendado",
  "Cuquitos sabor queso Hacendado": "Cheese-flavour Cuquitos Hacendado",
  "Galletas saladas con semillas y orégano Hacendado": "Savoury crackers with seeds and oregano Hacendado",
  "Galletitas saladas Hacendado": "Mini savoury crackers Hacendado",
  "Garfitos de maíz sabor queso Hacendado": "Cheese-flavour corn Garfitos Hacendado",
  "Nachos Hacendado": "Nachos Hacendado",
  "Nachos tex-mex sabor queso Hacendado": "Tex-mex cheese nachos Hacendado",
  "Palomitas caramelo Hacendado": "Caramel popcorn Hacendado",
  "Patatas fritas paja Hacendado": "Shoestring potato crisps Hacendado",
  "Snack Balls sabor queso Hacendado": "Cheese Snack Balls Hacendado",
  "Snack de maíz Crunchy sabor agridulce picante Hacendado": "Crunchy corn snack, sweet and sour spicy Hacendado",
  "Snack de maíz Redes sabor barbacoa Hacendado": "Redes corn snack, barbecue flavour Hacendado",
  "Snack de maíz Stars sabor mantequilla Hacendado": "Stars corn snack, butter flavour Hacendado",
  "Snack frito Binkies sabor queso Hacendado": "Binkies fried snack, cheese flavour Hacendado",
  "Sticks de patata Hacendado": "Potato sticks Hacendado",
  "Sticks vegetales Hacendado": "Vegetable sticks Hacendado",
  "Súper Cuquis": "Súper Cuquis snacks",
  "Tiras de maíz frito sabor barbacoa Hacendado": "Barbecue fried corn strips Hacendado",
  "Torreznillos Hacendado cortezas de cerdo fritas ahumadas": "Torreznillos smoked fried pork rinds Hacendado",
  "Torreznos Hacendado": "Torreznos pork crackling Hacendado",
  "Trigo snack sabor ahumado Hacendado": "Smoky wheat snack Hacendado",

  // ── Sobrasada
  "Sobrasada con miel L'Illa especialidades": "Sobrasada with honey L'Illa especialidades",
  "Sobrasada de Mallorca Can Pere Joan": "Mallorca sobrasada Can Pere Joan",
  "Sobrasada ibérica L'Illa especialidades": "Iberian sobrasada L'Illa especialidades",
  "Sobrasada selecta L'Illa especialidades": "Select sobrasada L'Illa especialidades",

  // ── Sopa
  "Sopa de miso": "Miso soup",
  "Sopa de pollo Gallina Blanca con fideos finos": "Chicken soup with thin noodles Gallina Blanca",
  "Sopa de pollo Hacendado con fideos finos": "Chicken soup with thin noodles Hacendado",

  // ── Surimi y otros
  "Palitos de surimi Hacendado": "Surimi sticks Hacendado",

  // ── Tartas
  "Tarta delicia de fresa Hacendado congelada": "Frozen strawberry delight cake Hacendado",

  // ── Té
  "Refresco té  zero sabor melocotón Hacendado": "Zero peach iced tea Hacendado",
  "Refresco té sabor mango y piña Hacendado": "Mango and pineapple iced tea Hacendado",
  "Refresco té sabor melocotón Hacendado": "Peach iced tea Hacendado",
  "Refresco té verde Hacendado": "Green iced tea Hacendado",
  "Té Chai Hacendado": "Chai tea Hacendado",
  "Té negro con canela Hacendado": "Black tea with cinnamon Hacendado",
  "Té negro Hacendado": "Black tea Hacendado",

  // ── Tomate
  "Fritada pisto Hacendado": "Pisto vegetable stew Hacendado",
  "Rama de Tomates": "Vine tomatoes",
  "Tomate doble concentrado Hacendado extra": "Extra double concentrated tomato paste Hacendado",
  "Tomate entero pelado Hacendado": "Whole peeled tomatoes Hacendado",
  "Tomate para untar Hacendado con aceite de oliva": "Tomato spread with olive oil Hacendado",
  "Tomate rallado": "Grated tomato",
  "Tomate seco Hacendado en aceite de oliva": "Sun-dried tomatoes in olive oil Hacendado",
  "Tomate tamizado sin piel Hacendado": "Sieved skinless tomato Hacendado",
  "Tomate triturado Hacendado": "Crushed tomatoes Hacendado",
  "Tomate troceado pelado Hacendado": "Chopped peeled tomatoes Hacendado",
  "Tomates": "Tomatoes",
  "Tomates cherry": "Cherry tomatoes",
  "Tomates cherry en rama Dulcita": "Cherry tomatoes on the vine Dulcita",

  // ── Tónica y bitter
  "Bitter Kas sin alcohol": "Non-alcoholic Bitter Kas",
  "Tónica original Schweppes": "Original tonic Schweppes",
  "Tónica Zero Schweppes": "Zero tonic Schweppes",

  // ── Tortilla
  "Tortilla de patata Hacendado": "Potato omelette Hacendado",
  "Tortilla de patata y cebolla Hacendado": "Potato and onion omelette Hacendado",

  // ── Tortitas
  "Tortitas de arroz con chocolate blanco sabor yogur Hacendado": "Rice cakes with yogurt-flavour white chocolate Hacendado",
  "Tortitas de arroz con chocolate con leche Hacendado": "Rice cakes with milk chocolate Hacendado",
  "Tortitas de arroz Hacendado": "Rice cakes Hacendado",
  "Tortitas de legumbres y arroz Hacendado": "Legume and rice cakes Hacendado",
  "Tortitas de maíz campestre Hacendado": "Country corn cakes Hacendado",
  "Tortitas de maíz con chocolate Hacendado": "Corn cakes with chocolate Hacendado",
  "Tortitas de maíz con sabor a jamón Hacendado": "Ham-flavour corn cakes Hacendado",
  "Tortitas de maíz Hacendado": "Corn cakes Hacendado",

  // ── Verduras al vapor
  "3 Vegetales para microondas lavados": "3 washed vegetables for the microwave",
  "Batatas para microondas": "Microwave sweet potatoes",
  "Floretas de brócoli para microondas lavadas": "Washed microwave broccoli florets",
  "Patatas para microondas": "Microwave potatoes",

  // ── Yogures de sabores
  "Postre lácteo sabor fresa sin lactosa Hacendado": "Lactose-free strawberry dairy dessert Hacendado",
  "Yogur con frutas Hacendado": "Fruit yogurt Hacendado",
  "Yogur cremoso con frutos silvestres Hacendado": "Creamy wild berry yogurt Hacendado",
  "Yogur cremoso con melocotón y maracuya Hacendado": "Creamy peach and passion fruit yogurt Hacendado",
  "Yogur sabor coco Danone": "Coconut yogurt Danone",
  "Yogur sabor coco Hacendado": "Coconut yogurt Hacendado",
  "Yogur sabor fresa Danone": "Strawberry yogurt Danone",
  "Yogur sabor fresa Hacendado": "Strawberry yogurt Hacendado",
  "Yogur sabor macedonia Danone": "Fruit salad yogurt Danone",
  "Yogur sabor macedonia Hacendado": "Fruit salad yogurt Hacendado",
  "Yogur sabores Hacendado": "Flavoured yogurts Hacendado",

  // ── Yogures desnatados
  "Postre lácteo con arándanos +Proteínas 10 g 0% MG": "Blueberry dairy dessert +Protein 10 g, 0% fat",
  "Postre lácteo con fresa +Proteínas 10 g 0% MG": "Strawberry dairy dessert +Protein 10 g, 0% fat",
  "Postre lácteo con fruta Hacendado 0% MG 0% azúcares añadidos": "Fruit dairy dessert Hacendado, 0% fat, no added sugar",
  "Postre lácteo con puré mango y maracuya +Proteínas 10 g 0% MG": "Mango and passion fruit dairy dessert +Protein 10 g, 0% fat",
  "Postre lácteo cremoso natural edulcorado Hacendado 0% MG 0% azúcares añadidos": "Creamy natural sweetened dairy dessert Hacendado, 0% fat, no added sugar",
  "Postre lácteo natural +Proteínas 10 g 0% MG": "Natural dairy dessert +Protein 10 g, 0% fat",
  "Postre lácteo natural +Proteínas 12 g 0% MG": "Natural dairy dessert +Protein 12 g, 0% fat",
  "Postre lácteo natural sin lactosa Hacendado 0% MG 0% azúcares añadidos": "Lactose-free natural dairy dessert Hacendado, 0% fat, no added sugar",
  "Postre lácteo sabor coco +Proteínas 10 g 0% MG": "Coconut dairy dessert +Protein 10 g, 0% fat",
  "Yogur natural edulcorado Hacendado 0% MG 0% azúcares añadidos": "Natural sweetened yogurt Hacendado, 0% fat, no added sugar",
  "Yogur natural Hacendado 0% MG 0% azúcares añadidos": "Natural yogurt Hacendado, 0% fat, no added sugar",
  "Yogur sabor fresa Hacendado 0% MG 0% azúcares añadidos": "Strawberry yogurt Hacendado, 0% fat, no added sugar",
  "Yogur sabores Hacendado 0% MG 0% azúcares añadidos": "Flavoured yogurts Hacendado, 0% fat, no added sugar",

  // ── Yogures griegos
  "Yogur griego con fresa Hacendado": "Greek yogurt with strawberry Hacendado",
  "Yogur griego con mango Hacendado": "Greek yogurt with mango Hacendado",
  "Yogur griego natural Hacendado": "Natural Greek yogurt Hacendado",
  "Yogur griego natural Hacendado con azúcar de caña": "Natural Greek yogurt with cane sugar Hacendado",
  "Yogur griego natural ligero Hacendado": "Natural light Greek yogurt Hacendado",
  "Yogur griego natural ligero Hacendado 2% MG": "Natural light Greek yogurt Hacendado, 2% fat",
  "Yogur griego sabor fresa Hacendado": "Strawberry-flavour Greek yogurt Hacendado",
  "Yogur griego stracciatella Hacendado": "Stracciatella Greek yogurt Hacendado",

  // ── Yogures líquidos
  "Batido lácteo sabor café +Proteínas 30 g": "Coffee-flavour milkshake +Protein 30 g",
  "Batido lácteo sabor chocolate +Proteínas 30 g": "Chocolate-flavour milkshake +Protein 30 g",
  "Batido lácteo sabor vainilla +Proteínas 30 g": "Vanilla-flavour milkshake +Protein 30 g",
  "Bebida láctea de fresa Hacendado": "Strawberry dairy drink Hacendado",
  "Bebida láctea de fresa y plátano Hacendado": "Strawberry and banana dairy drink Hacendado",
  "Bebida láctea de frutas del bosque Hacendado": "Forest fruit dairy drink Hacendado",
  "Bebida láctea de piña y coco Hacendado": "Pineapple and coconut dairy drink Hacendado",
  "Bebida láctea natural azucarada Hacendado": "Sweetened natural dairy drink Hacendado",
  "Bebida láctea sabor açaí plátano +Proteínas 20 g 0% MG": "Açaí and banana dairy drink +Protein 20 g, 0% fat",
  "Bebida láctea sabor fresa +Proteínas 20 g 0% MG": "Strawberry dairy drink +Protein 20 g, 0% fat",
  "Bebida láctea sabor fresa y plátano +Proteínas 17,4 g 0% MG 0% azúcares añadidos": "Strawberry and banana dairy drink +Protein 17.4 g, 0% fat, no added sugar",
  "Bebida láctea sabor stracciatella +Proteínas 20 g 0% azúcares añadidos": "Stracciatella dairy drink +Protein 20 g, no added sugar",
  "Bebida láctea sabor tropical +Proteínas 20 g 0% MG": "Tropical dairy drink +Protein 20 g, 0% fat",
  "Yogur líquido de fresa Hacendado": "Strawberry drinking yogurt Hacendado",
  "Yogur líquido frutos silvestres Hacendado 0% MG 0% azúcares añadidos": "Wild berry drinking yogurt Hacendado, 0% fat, no added sugar",
  "Yogur líquido natural Hacendado con azúcar de caña": "Natural drinking yogurt with cane sugar Hacendado",
  "Yogur líquido piña y coco Hacendado 0% MG 0% azúcares añadidos": "Pineapple and coconut drinking yogurt Hacendado, 0% fat, no added sugar",

  // ── Yogures naturales
  "Kéfir natural sabor suave": "Mild natural kefir",
  "Postre lácteo cremoso natural azucarado sin lactosa Hacendado": "Lactose-free creamy sweetened natural dairy dessert Hacendado",
  "Yogur natural con azúcar de caña Hacendado": "Natural yogurt with cane sugar Hacendado",
  "Yogur natural Danone": "Natural yogurt Danone",
  "Yogur natural de cabra Hacendado": "Natural goat yogurt Hacendado",
  "Yogur natural Hacendado": "Natural yogurt Hacendado"
});

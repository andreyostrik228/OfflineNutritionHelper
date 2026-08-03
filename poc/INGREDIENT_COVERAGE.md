# Auditoría de cobertura: ingredientes de `dishes.js` vs. productos reales de Mercadona

Generado en esta sesión, verificado contra el estado actual de `js/data/dishes.js`
y `js/data/real-products.js` (sin modificar ninguno de los dos). El registro de
reglas completo está en [`poc/data/ingredient-rules-full.js`](data/ingredient-rules-full.js);
este documento es su resumen legible. Verificado por
[`poc/tests/ingredient-coverage.test.js`](tests/ingredient-coverage.test.js) — ver
sección "Cómo se verificó" al final.

## Nota importante: el dataset creció

`dishes.js` tiene hoy **334 platos** y **81** ingredient roles únicos —no 204
platos / 65 ingredientes como documentaban `STATE.md` / `real-ingredient-matches.js`.
Ambos números fueron extraídos programáticamente (`poc/core/load-dishes.js`,
carga real de `DISH_DB` vía `vm`, no transcripción manual), así que son exactos
a día de hoy. La documentación existente está desactualizada en esta cifra;
no se ha corregido porque no se pidió tocar documentación en esta tarea.

## Resumen

| Métrica | Valor |
|---|---|
| Ingredient roles únicos auditados | **81** |
| Resueltos (producto real fiable encontrado) | **50** (61.7%) |
| No resueltos (sin sustituto forzado) | **31** (38.3%) |
| Resueltos por `exact_ean` | 17 |
| Resueltos por `name` (nombre, sin EAN exacto) | 26 |
| Resueltos por `legacy` (nutrición previa al pipeline, sin `nutritionSource`) | 7 |

Motivo de los 31 no resueltos:

| Motivo | Cuenta | Significado |
|---|---|---|
| `no_existe` | 12 | Cero productos con ese nombre/concepto en el catálogo |
| `sin_nutricion` | 10 | Existe el producto correcto pero `kcal=null` (nunca verificado por el pipeline) |
| `solo_producto_no_apto` | 3 | Existen productos con ese nombre, pero son de un formato/preparación que no corresponde al rol culinario (ready-meal, ahumado, conserva, fresco en vez de congelado...) |
| `match_ambiguo` | 3 | El candidato coincide por texto pero es una variante distinta (subespecie, tipo de carne, "light" vs. normal) que cambiaría el resultado nutricional de forma engañosa |
| `needsReview` | 1 | Único candidato marcado `needsReview=true` por el propio pipeline Python |
| `otra` | 2 | Caso especial (macros implausibles verificadas a mano; bug de datos en `dishes.js`) |

**Ninguno de los 31 fue sustituido por un producto aproximado.** Cada uno queda
explícitamente `unresolved` con motivo y detalle verificable.

## Tabla completa

| Ingredient | Usos en dishes.js | Status | Producto real de Mercadona | Match method | EAN | Reason |
|---|---|---|---|---|---|---|
| Aguacate | 10 | ❌ unresolved | — | — | — | **otra** — único candidato con nutrición no nula ("Aguacates", id 3858) tiene macros implausibles para aguacate: carbs=0.83g/100g (un aguacate real ronda 6-9g/100g). El otro candidato ("Aguacate", id 3830) tiene kcal=null. |
| Almendras | 12 | ✅ resolved | Almendra tostada Hacendado 0% sal añadida con piel (id 34014) | exact_ean | 8480000340146 | — |
| Alubias cocidas | 5 | ✅ resolved | Alubia cocida blanca Hacendado (id 26019) | exact_ean | 8480000260192 | — |
| Arroz blanco cocido | 34 | ✅ resolved | Arroz cocido redondo Sabroz (id 22279) | exact_ean | 8410184040723 | — |
| Arroz integral cocido | 18 | ❌ unresolved | — | — | — | **sin_nutricion** — existe "Arroz cocido integral Sabroz" (medido cocido) pero kcal=null; la alternativa con nutrición es arroz CRUDO (350kcal/100g), usarla triplicaría las calorías reales. |
| Atún al natural | 26 | ✅ resolved | Atún claro al natural Hacendado (id 18018) | exact_ean | 8480000180186 | — |
| Avena | 15 | ❌ unresolved | — | — | — | **needsReview** — único candidato ("Avena molida Hacendado") con needsReview=true, confidence "low". |
| Bacalao | 8 | ❌ unresolved | — | — | — | **solo_producto_no_apto** — único candidato con nutrición es ahumado; los cortes frescos tienen kcal=null. |
| Batata | 4 | ✅ resolved | Batatas para microondas (id 69465) | legacy | 8424717004014 | — |
| Brócoli | 29 | ❌ unresolved | — | — | — | **sin_nutricion** — único candidato ("Brócoli") kcal=null. |
| Caballa en lata | 8 | ❌ unresolved | — | — | — | **no_existe** — ningún producto "Caballa" (0 candidatos). |
| Cacahuetes | 6 | ✅ resolved | Cacahuete tostado Hacendado 0% sal añadida (id 34031) | exact_ean | 8480000340313 | — |
| Calabacín | 14 | ❌ unresolved | — | — | — | **sin_nutricion** — fresco kcal=null; solo existe con nutrición como "Crema de calabacín" (puré, producto distinto). |
| Carne picada 5% grasa | 9 | ❌ unresolved | — | — | — | **match_ambiguo** — la carne picada real (vacuno/cerdo) tiene 11-14g grasa/100g, no "5%"; la única opción baja en grasa es de POLLO, carne distinta. |
| Champiñones | 14 | ✅ resolved | Champiñones laminados Hacendado (id 16618) | name | 8480000166180 | — |
| Claras de huevo | 11 | ✅ resolved | Claras de huevo líquidas pasteurizadas (id 31309) | name | 8411384009855 | — |
| Coliflor | 13 | ✅ resolved | Coliflor (id 69220) | name | 2105480692207 | — |
| Conejo | 4 | ❌ unresolved | — | — | — | **sin_nutricion** — único candidato ("Conejo entero") kcal=null. |
| Copos de maíz | 6 | ❌ unresolved | — | — | — | **no_existe** — no hay corn flakes en el catálogo; Muesli existe pero es un producto distinto. |
| Cuscús cocido | 24 | ❌ unresolved | — | — | — | **sin_nutricion** — el único cuscús real es SECO (ya usado en real-ingredient-matches.js solo para nombre/precio, `priceIsUsable:false`); no hay cuscús cocido con nutrición. |
| Edamame | 4 | ❌ unresolved | — | — | — | **no_existe** — 0 candidatos. |
| Espinacas | 43 | ✅ resolved | Espinacas baby lavadas (id 69984) | legacy | 8425779044451 | — |
| Fresas | 5 | ❌ unresolved | — | — | — | **no_existe** — 0 candidatos. |
| Frutos rojos congelados | 13 | ❌ unresolved | — | — | — | **no_existe** — 0 candidatos. |
| Gamba cocida | 4 | ✅ resolved | Gamba cocida (id 87278) | name | 8402001049279 | — |
| Garbanzos cocidos | 11 | ✅ resolved | Garbanzo cocido Hacendado (id 26029) | exact_ean | 8480000260291 | — |
| Granola | 9 | ❌ unresolved | — | — | — | **no_existe** — no hay "Granola"; Muesli es un producto distinto (no se sustituye sin verificación). |
| Huevos enteros | 21 | ✅ resolved | Huevos de gallinas camperas (id 15768) | name | 8410603125215 | — |
| Hummus | 3 | ❌ unresolved | — | — | — | **sin_nutricion** — los 2 candidatos tienen kcal=null. |
| Jamón cocido extra | 8 | ✅ resolved | Jamón cocido extra Noel lonchas (id 59143) | exact_ean | 8410783320813 | — |
| Jamón serrano | 9 | ✅ resolved | Jamón serrano lonchas Incarlopsa (id 59124) | exact_ean | 8421384009724 | — |
| Kiwi | 6 | ❌ unresolved | — | — | — | **sin_nutricion** — únicos candidatos kcal=null. |
| Langostino cocido | 4 | ✅ resolved | Langostino cocido (id 87292) | name | 8402001025433 | — |
| Leche semidesnatada | 7 | ✅ resolved | Leche semidesnatada Hacendado (id 10382) | legacy | 8402001002106 | — |
| Lechuga: Pepino | 1 | ❌ unresolved | — | — | — | **otra** — bug de datos en `dishes.js`: nombre corrupto "Lechuga: Pepino" (dos ingredientes concatenados), no matchea ningún producto. |
| Lentejas cocidas | 9 | ✅ resolved | Lenteja cocida Hacendado (id 26011) | exact_ean | 8480000053329 | — |
| Lomo de cerdo | 10 | ✅ resolved | Lomo de cerdo trozo (id 4590) | name | 2105100045901 | — |
| Lubina | 4 | ❌ unresolved | — | — | — | **sin_nutricion** — los 5 candidatos kcal=null. |
| Mantequilla de cacahuete | 6 | ✅ resolved | Crema de cacahuete 100% Hacendado (id 16883) | name | 8480000168832 | — |
| Manzana | 10 | ✅ resolved | Manzanas Golden (id 3269) | name | 2105400032694 | — |
| Maíz dulce | 4 | ✅ resolved | Maíz dulce Hacendado (id 16712) | name | 8480000167125 | — |
| Merluza | 8 | ✅ resolved | Merluza a rodajas (id 82610.1) | name | 8480000826107 | — |
| Mermelada light | 3 | ❌ unresolved | — | — | — | **no_existe** — solo hay mermeladas normales (con azúcar completo). |
| Miel | 5 | ✅ resolved | Miel de naranjo Hacendado (id 15448) | legacy | 8480000154484 | — |
| Mozzarella light | 4 | ✅ resolved | Mozzarella fresca light de vaca Hacendado (id 51230) | exact_ean | 8480000512307 | — |
| Muslo de pollo deshuesado | 9 | ✅ resolved | Muslos de pollo deshuesados con piel (id 2788) | name | 2105100027884 | — |
| Naranja | 5 | ✅ resolved | Naranja de mesa (id 3235) | name | 2105456032358 | — |
| Nueces | 8 | ✅ resolved | Nuez natural Hacendado pelada (id 34024) | name | 8402001001345 | — |
| Pan de centeno | 2 | ✅ resolved | Pan de molde con 55% centeno Hacendado (id 82302) | exact_ean | 8402001037870 | — |
| Pan de molde integral | 10 | ✅ resolved | Pan de molde 100% integral Hacendado (id 82328) | legacy | 8402001024184 | — |
| Pan integral | 27 | ✅ resolved | Pan integral trigo 100% (id 12049.1) | name | 8402001030161 | — |
| Pasta cocida | 26 | ❌ unresolved | — | — | — | **sin_nutricion** — toda la pasta del catálogo es SECA (330-361kcal/100g); ninguna está medida cocida. |
| Patata cocida | 27 | ✅ resolved | Patatas cocidas Hacendado (id 15534) | name | 8402001014253 | — |
| Pavo loncheado | 12 | ✅ resolved | Maxi pavo Hacendado finas lonchas (id 22430) | legacy | 8480000224309 | — |
| Pavo picado | 4 | ❌ unresolved | — | — | — | **no_existe** — no hay picada de pavo (solo de pollo/vacuno/cerdo). |
| Pechuga de pavo | 14 | ✅ resolved | Filetes pechuga de pavo (id 2794) | name | 2105100027945 | — |
| Pechuga de pollo | 23 | ✅ resolved | Pechugas enteras de pollo (id 3724) | exact_ean | 2105100037241 | — |
| Pepino | 16 | ❌ unresolved | — | — | — | **sin_nutricion** — únicos candidatos kcal=null. |
| Pimiento | 12 | ✅ resolved | Pimiento rojo (id 69310) | name | 2105470693108 | — |
| Piña | 3 | ✅ resolved | Piña natural a rodajas (id 3024) | name | 2105400030249 | — |
| Plátano | 18 | ❌ unresolved | — | — | — | **match_ambiguo** — único candidato con nutrición es plátano MACHO (plantain, subespecie distinta); el plátano de mesa correcto tiene kcal=null. |
| Queso fresco batido 0% | 19 | ✅ resolved | Queso fresco batido desnatado 0% MG Hacendado (id 51071) | exact_ean | 8480000510716 | — |
| Queso light | 10 | ✅ resolved | Queso fresco Burgos desnatado 0% MG Hacendado (id 52409) | legacy | 8480000524096 | — |
| Quinoa cocida | 27 | ✅ resolved | Quinoa cocida blanca y roja Sabroz (id 22278) | exact_ean | 8410184040754 | — |
| Rape | 4 | ❌ unresolved | — | — | — | **no_existe** — 0 candidatos. |
| Requesón | 13 | ✅ resolved | Requesón mezcla Hacendado (id 51012) | name | 8413556010324 | — |
| Salmón | 14 | ❌ unresolved | — | — | — | **solo_producto_no_apto** — los 4 candidatos son plato preparado, conserva, o ahumado; ninguno es filete fresco. |
| Sardinas en lata | 10 | ✅ resolved | Sardinillas reducidas en sal en aceite de oliva Hacendado (id 18214) | exact_ean | 8480000182142 | — |
| Skyr natural | 16 | ❌ unresolved | — | — | — | **no_existe** — no hay ningún producto "Skyr" en el catálogo. |
| Solomillo de ternera | 4 | ✅ resolved | Solomillo de vacuno (id 8931) | name | 8436569263419 | — |
| Tempeh | 7 | ❌ unresolved | — | — | — | **no_existe** — 0 candidatos. |
| Ternera magra | 9 | ✅ resolved | Filetes de vacuno añojo para plancha (id 8936) | name | 8436569263464 | — |
| Tofu firme | 7 | ✅ resolved | Tofu firme Hacendado (id 51097) | name | 8410789140118 | — |
| Tomate | 51 | ✅ resolved | Tomates (id 69971) | name | 5600084699715 | — |
| Tortillas de trigo | 4 | ✅ resolved | Tortillas de trigo Hacendado (id 80859) | exact_ean | 8480000808592 | — |
| Tortitas de arroz | 7 | ✅ resolved | Tortitas de arroz Hacendado (id 14013) | name | 8480000140135 | — |
| Trigo sarraceno cocido | 13 | ❌ unresolved | — | — | — | **no_existe** — 0 candidatos (buckwheat). |
| Verduras congeladas salteado | 34 | ❌ unresolved | — | — | — | **solo_producto_no_apto** — los candidatos encontrados son frescos/refrigerados, no congelados, y uno tiene kcal=null. |
| Wrap proteico | 3 | ❌ unresolved | — | — | — | **match_ambiguo** — único candidato es un wrap ya relleno (ready-to-eat), no una tortilla base alta en proteína; su proteína (9.6g/100g) tampoco justifica "proteico". |
| Yogur griego ligero | 15 | ✅ resolved | Yogur griego natural ligero Hacendado 2% MG (id 21358) | exact_ean | 8480000213587 | — |
| Zanahoria | 25 | ✅ resolved | Zanahoria en tiras Hacendado (id 13328) | name | 8402001034718 | — |

## Validación cruzada con `real-ingredient-matches.js`

8 de los 50 roles resueltos coinciden **exactamente** (mismo EAN) con matches
que ya existían, curados a mano en sesiones anteriores, en
`js/data/real-ingredient-matches.js`: Pechuga de pollo, Atún al natural,
Yogur griego ligero, Tortillas de trigo, Jamón cocido extra, Mozzarella
light, Lentejas cocidas, Alubias cocidas. Ningún caso contradice al archivo
existente — es una señal fuerte de que el método de esta auditoría (categoría
+ leafCategory + revisión manual de nombre/needsReview/plausibilidad) es
consistente con el criterio ya validado en el proyecto.

Un caso revela una diferencia de rigor: **Cuscús cocido**. El archivo
existente lo marca como match válido para nombre/precio
(`priceIsUsable: false`, siguen usándose los macros fabricados de `dishes.js`).
Bajo el criterio de esta auditoría (los macros deben venir del producto real,
no de `dishes.js`), no hay ningún cuscús *cocido* con nutrición verificada —
se marca `unresolved`. Esto no es una contradicción sino una exigencia mayor:
el archivo viejo resuelve *precio*, esta auditoría exige resolver *nutrición*.

## Patrones detectados (útiles para decidir cómo cerrar la brecha)

1. **Medido cocido vs. producto seco** (5 casos: Arroz integral cocido, Cuscús
   cocido, Pasta cocida, y en menor medida evitado en Arroz blanco/Quinoa
   porque sí existe la versión cocida): `dishes.js` mide varios ingredientes
   en peso ya cocido, pero el catálogo de Mercadona a menudo solo tiene la
   nutrición verificada del producto SECO. Sustituir sin ajustar por el
   factor de cocción sobreestimaría las calorías 2-3x. Esto ya lo anticipaba
   `real-ingredient-matches.js` para el cuscús; aquí se confirma que afecta a
   más ingredientes de los que ese archivo cubría.
2. **Solo existe la versión "no apta"** (Bacalao, Salmón, Verduras
   congeladas): el catálogo tiene el producto pero en una preparación que no
   corresponde al rol de la receta (ahumado/conserva/fresco en vez de
   crudo/congelado).
3. **Especificidad nutricional no disponible** (Carne picada 5% grasa,
   Mermelada light, Wrap proteico): el catálogo solo tiene la versión
   "normal", no la variante baja en grasa/azúcar que la receta pide
   explícitamente en su propio nombre.
4. **Simplemente no existe** (12 casos): productos de nicho (Tempeh, Edamame,
   Rape, Trigo sarraceno, Skyr, Caballa, Copos de maíz, Granola, Fresas,
   Frutos rojos, Kiwi con nutrición, Conejo con nutrición) que este catálogo
   de Mercadona no cubre en absoluto o no tiene verificados.
5. **Bug de datos en `dishes.js`** (1 caso): "Lechuga: Pepino" es un nombre de
   ingrediente corrupto, no relacionado con la resolución de productos.

## Cómo se verificó

`poc/tests/ingredient-coverage.test.js` (9 aserciones) comprueba, cargando
`dishes.js` y `real-products.js` reales vía `vm` (nunca copias/transcripciones):

- Los 81 roles reales de `dishes.js` tienen regla en el registro (ni uno sin cubrir).
- El registro no tiene reglas huérfanas de ingredientes que ya no existen.
- Todo `productId` de una regla `resolved` existe de verdad en `REAL_PRODUCTS`.
- Todo producto resuelto tiene `needsReview=false` y macros no nulos.
- Los macros anotados en la regla coinciden EXACTAMENTE con los del producto real (detecta valores fabricados a mano).
- Toda regla `unresolved` tiene un motivo válido de una lista cerrada, y una explicación.
- Ninguna regla `unresolved` tiene `productId` — estructuralmente imposible que se cuele un fallback silencioso.

## Archivos de este trabajo

- `poc/data/ingredient-rules-full.js` — registro completo (81 roles), fuente de verdad de esta auditoría.
- `poc/core/load-dishes.js` — loader de `dishes.js` vía `vm` + extractor de roles únicos.
- `poc/INGREDIENT_COVERAGE.md` — este documento.
- `poc/tests/ingredient-coverage.test.js` — test de completitud/consistencia (9 aserciones).
- `poc/tests/run-tests.js` — actualizado para incluir la suite anterior.

**No se modificó**: `dishes.js`, `real-products.js`, `plan-generator.js`,
`dish-selector.js`, ningún archivo de UI, ni `poc/data/ingredient-rules.js`
(el registro de 17 roles del proof-of-concept anterior, que sigue intacto y
funcionando de forma independiente).

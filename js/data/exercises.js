/**
 * js/data/exercises.js
 * ─────────────────────────────────────────────────────────────────────────
 * Catálogo de EJERCICIOS para el plan de entrenamiento. Solo datos: quien los
 * usa es js/engine/workout-generator.js.
 *
 * Campos de cada ejercicio:
 *   id          identificador estable (no cambia aunque cambie el nombre)
 *   name        nombre en español
 *   muscle      grupo principal: pecho, espalda, hombros, biceps, triceps,
 *               cuadriceps, isquios, gluteos, gemelos, core
 *   pattern     patrón de movimiento: el generador elige por patrón, no por
 *               ejercicio concreto, así se cambia de ejercicio sin tocar el
 *               plan (ver WORKOUT_SESIONES en js/engine/workout-generator.js)
 *   equipment   material NECESARIO (todos deben estar disponibles). Ver
 *               EQUIPAMIENTO_DISPONIBLE más abajo
 *   level       "principiante" | "intermedio" | "avanzado": el nivel mínimo
 *   compound    true si mueve varias articulaciones (van primero y con más
 *               series y descanso)
 *   repsOverride  (opcional) repeticiones fijas en vez de las del objetivo:
 *               ejercicios de tiempo (plancha) o de pantorrilla
 *
 * Sin nombres comerciales: son ejercicios genéricos que cualquier gimnasio o
 * casa puede hacer con el material indicado.
 * ─────────────────────────────────────────────────────────────────────────
 */

var EXERCISE_CATALOG = [
  // ── Pecho y empuje horizontal ─────────────────────────────────────────
  { id: "press_banca_barra", tecnica: "Escápulas juntas y pies firmes; baja la barra al pecho bajo y empuja sin rebotar.", name: "Press de banca con barra", muscle: "pecho", pattern: "empuje_horizontal", equipment: ["barra", "banco"], level: "intermedio", compound: true },
  { id: "press_banca_mancuernas", tecnica: "Mancuernas a la altura del pecho; empuja hacia arriba sin chocarlas.", name: "Press de banca con mancuernas", muscle: "pecho", pattern: "empuje_horizontal", equipment: ["mancuernas", "banco"], level: "principiante", compound: true },
  { id: "press_pecho_maquina", tecnica: "Ajusta el asiento para que los agarres queden a la altura del pecho; movimiento controlado.", name: "Press de pecho en máquina", muscle: "pecho", pattern: "empuje_horizontal", equipment: ["maquina"], level: "principiante", compound: true },
  { id: "press_inclinado_mancuernas", tecnica: "Banco a 30-45 grados; baja hasta notar el estiramiento en el pecho alto.", name: "Press inclinado con mancuernas", muscle: "pecho", pattern: "empuje_horizontal", equipment: ["mancuernas", "banco"], level: "intermedio", compound: true },
  { id: "flexiones", tecnica: "Cuerpo recto de cabeza a talones; baja con los codos a unos 45 grados del tronco.", name: "Flexiones", muscle: "pecho", pattern: "empuje_horizontal", equipment: ["sin_material"], level: "principiante", compound: true },
  { id: "fondos_paralelas", tecnica: "Inclínate un poco hacia delante para cargar más el pecho; no encojas los hombros.", name: "Fondos en paralelas", muscle: "pecho", pattern: "empuje_horizontal", equipment: ["paralelas"], level: "intermedio", compound: true },
  { id: "aperturas_mancuernas", tecnica: "Codos ligeramente flexionados y fijos; abre hasta notar el estiramiento sin dejar caer el peso.", name: "Aperturas con mancuernas", muscle: "pecho", pattern: "pecho_aislado", equipment: ["mancuernas", "banco"], level: "principiante", compound: false },

  // ── Hombros ───────────────────────────────────────────────────────────
  { id: "press_militar_barra", tecnica: "Glúteos y abdomen apretados; sube la barra en línea recta sobre la cabeza.", name: "Press militar con barra", muscle: "hombros", pattern: "empuje_vertical", equipment: ["barra"], level: "intermedio", compound: true },
  { id: "press_hombro_mancuernas", tecnica: "Espalda apoyada y codos bajo las muñecas; no arquees la zona lumbar.", name: "Press de hombro con mancuernas", muscle: "hombros", pattern: "empuje_vertical", equipment: ["mancuernas"], level: "principiante", compound: true },
  { id: "pike_flexiones", tecnica: "Cadera alta formando una V invertida; baja la cabeza entre las manos.", name: "Flexiones en pica", muscle: "hombros", pattern: "empuje_vertical", equipment: ["sin_material"], level: "intermedio", compound: true },
  { id: "elevaciones_laterales", tecnica: "Sube hasta la altura del hombro con el codo algo flexionado; no encojas los hombros.", name: "Elevaciones laterales con mancuernas", muscle: "hombros", pattern: "elevacion_lateral", equipment: ["mancuernas"], level: "principiante", compound: false },
  { id: "pajaros", tecnica: "Tronco inclinado; abre los brazos a los lados con codos flexionados, sin impulso.", name: "Pájaros con mancuernas (deltoides posterior)", muscle: "hombros", pattern: "hombro_posterior", equipment: ["mancuernas"], level: "principiante", compound: false },
  { id: "face_pull", tecnica: "Tira de la cuerda hacia la cara separando las manos; codos altos.", name: "Face pull en polea", muscle: "hombros", pattern: "hombro_posterior", equipment: ["polea"], level: "principiante", compound: false },

  // ── Espalda y tirón ───────────────────────────────────────────────────
  { id: "remo_barra", tecnica: "Espalda plana a unos 45 grados; tira de la barra hacia el ombligo.", name: "Remo con barra", muscle: "espalda", pattern: "tiron_horizontal", equipment: ["barra"], level: "intermedio", compound: true },
  { id: "remo_mancuerna", tecnica: "Apoya una mano y una rodilla en el banco; tira hacia la cadera, no hacia el hombro.", name: "Remo con mancuerna a una mano", muscle: "espalda", pattern: "tiron_horizontal", equipment: ["mancuernas", "banco"], level: "principiante", compound: true },
  { id: "remo_polea", tecnica: "Pecho alto y espalda recta; tira hacia el abdomen juntando las escápulas.", name: "Remo en polea baja", muscle: "espalda", pattern: "tiron_horizontal", equipment: ["polea"], level: "principiante", compound: true },
  { id: "jalon_pecho", tecnica: "Tira de la barra hacia la parte alta del pecho; no balancees el tronco.", name: "Jalón al pecho", muscle: "espalda", pattern: "tiron_vertical", equipment: ["polea"], level: "principiante", compound: true },
  { id: "dominadas", tecnica: "Agarre algo más ancho que los hombros; sube hasta que la barbilla pase la barra.", name: "Dominadas", muscle: "espalda", pattern: "tiron_vertical", equipment: ["dominadas"], level: "intermedio", compound: true },
  { id: "dominadas_asistidas", tecnica: "Elige una asistencia que te permita controlar la subida y la bajada.", name: "Dominadas asistidas en máquina", muscle: "espalda", pattern: "tiron_vertical", equipment: ["maquina"], level: "principiante", compound: true },

  // ── Piernas ───────────────────────────────────────────────────────────
  { id: "sentadilla_barra", tecnica: "Barra sobre el trapecio; rodillas en la línea de los pies y talones firmes.", name: "Sentadilla trasera con barra", muscle: "cuadriceps", pattern: "sentadilla", equipment: ["barra"], level: "intermedio", compound: true },
  { id: "sentadilla_goblet", tecnica: "Mancuerna pegada al pecho; baja con el tronco erguido y los codos dentro de las rodillas.", name: "Sentadilla goblet con mancuerna", muscle: "cuadriceps", pattern: "sentadilla", equipment: ["mancuernas"], level: "principiante", compound: true },
  { id: "prensa_piernas", tecnica: "Pies a la anchura de hombros; no separes la zona lumbar del respaldo.", name: "Prensa de piernas", muscle: "cuadriceps", pattern: "sentadilla", equipment: ["maquina"], level: "principiante", compound: true },
  { id: "sentadilla_bulgara", tecnica: "Pie trasero sobre el banco; el peso va en el delantero y la rodilla sigue la línea del pie.", name: "Sentadilla búlgara con mancuernas", muscle: "cuadriceps", pattern: "zancada", equipment: ["mancuernas", "banco"], level: "intermedio", compound: true },
  { id: "zancadas", tecnica: "Paso largo; baja hasta que la rodilla de atrás casi toque el suelo, sin golpearlo.", name: "Zancadas", muscle: "cuadriceps", pattern: "zancada", equipment: ["sin_material"], level: "principiante", compound: true },
  { id: "peso_muerto_barra", tecnica: "Barra pegada a las piernas; empuja las caderas atrás con la espalda neutra.", name: "Peso muerto rumano con barra", muscle: "isquios", pattern: "bisagra", equipment: ["barra"], level: "intermedio", compound: true },
  { id: "peso_muerto_mancuernas", tecnica: "Rodillas algo flexionadas; la mancuerna baja rozando los muslos.", name: "Peso muerto rumano con mancuernas", muscle: "isquios", pattern: "bisagra", equipment: ["mancuernas"], level: "principiante", compound: true },
  { id: "curl_femoral", tecnica: "Ajusta el rodillo justo encima del tobillo; sube sin despegar la cadera del banco.", name: "Curl femoral tumbado en máquina", muscle: "isquios", pattern: "curl_isquio", equipment: ["maquina"], level: "principiante", compound: false },
  { id: "extension_cuadriceps", tecnica: "Ajusta el asiento para que la rodilla quede alineada con el eje de la máquina.", name: "Extensión de cuádriceps en máquina", muscle: "cuadriceps", pattern: "aislado_pierna", equipment: ["maquina"], level: "principiante", compound: false },
  { id: "hip_thrust_barra", tecnica: "Espalda alta apoyada en el banco; empuja con los talones y aprieta los glúteos arriba.", name: "Hip thrust con barra", muscle: "gluteos", pattern: "gluteo", equipment: ["barra", "banco"], level: "intermedio", compound: true },
  { id: "puente_gluteo", tecnica: "Empuja con los talones y sube la cadera hasta alinear hombros, caderas y rodillas.", name: "Puente de glúteo", muscle: "gluteos", pattern: "gluteo", equipment: ["sin_material"], level: "principiante", compound: false },
  { id: "gemelos_maquina", tecnica: "Sube de puntillas, haz una pausa arriba y baja hasta notar el estiramiento.", name: "Elevación de gemelos de pie en máquina", muscle: "gemelos", pattern: "pantorrilla", equipment: ["maquina"], level: "principiante", compound: false, repsOverride: "12-20" },
  { id: "gemelos_sin_material", tecnica: "Apóyate en algo para el equilibrio; sube despacio y baja hasta estirar bien.", name: "Elevación de gemelos a una pierna", muscle: "gemelos", pattern: "pantorrilla", equipment: ["sin_material"], level: "principiante", compound: false, repsOverride: "12-20" },

  // ── Brazos ────────────────────────────────────────────────────────────
  { id: "curl_biceps_barra", tecnica: "Codos pegados al cuerpo; no balancees el tronco para subir la barra.", name: "Curl de bíceps con barra", muscle: "biceps", pattern: "curl_biceps", equipment: ["barra"], level: "principiante", compound: false },
  { id: "curl_biceps_mancuernas", tecnica: "Gira la muñeca hacia fuera al subir; codos fijos.", name: "Curl de bíceps con mancuernas", muscle: "biceps", pattern: "curl_biceps", equipment: ["mancuernas"], level: "principiante", compound: false },
  { id: "curl_martillo", tecnica: "Palmas enfrentadas durante todo el movimiento; baja despacio.", name: "Curl martillo con mancuernas", muscle: "biceps", pattern: "curl_biceps", equipment: ["mancuernas"], level: "principiante", compound: false },
  { id: "extension_triceps_polea", tecnica: "Codos pegados a las costillas; extiende del todo sin despegarlos.", name: "Extensión de tríceps en polea", muscle: "triceps", pattern: "extension_triceps", equipment: ["polea"], level: "principiante", compound: false },
  { id: "press_frances", tecnica: "Codos apuntando al techo; baja la mancuerna hacia la frente sin mover los codos.", name: "Press francés con mancuerna", muscle: "triceps", pattern: "extension_triceps", equipment: ["mancuernas", "banco"], level: "intermedio", compound: false },

  // ── Core ──────────────────────────────────────────────────────────────
  { id: "plancha", tecnica: "Cuerpo en línea recta; aprieta abdomen y glúteos y respira sin hundir la cadera.", name: "Plancha", muscle: "core", pattern: "core", equipment: ["sin_material"], level: "principiante", compound: false, repsOverride: "30-45 s" },
  { id: "dead_bug", tecnica: "Lumbar pegada al suelo; baja despacio el brazo y la pierna contrarios.", name: "Dead bug", muscle: "core", pattern: "core", equipment: ["sin_material"], level: "principiante", compound: false, repsOverride: "8-10 por lado" },
  { id: "crunch_polea", tecnica: "Enrolla el tronco hacia las rodillas; no tires de los brazos.", name: "Crunch en polea alta", muscle: "core", pattern: "core", equipment: ["polea"], level: "principiante", compound: false, repsOverride: "10-15" },
  { id: "pallof_press", tecnica: "Empuja el agarre hacia delante y resiste el giro; el tronco no debe rotar.", name: "Press Pallof en polea", muscle: "core", pattern: "core", equipment: ["polea"], level: "intermedio", compound: false, repsOverride: "10-12 por lado" },
  { id: "sentadilla_libre", tecnica: "Pies a la anchura de hombros; baja hasta donde controles y sube empujando el suelo.", name: "Sentadilla libre (sin material)", muscle: "cuadriceps", pattern: "sentadilla", equipment: ["sin_material"], level: "principiante", compound: true },
  { id: "buenos_dias_sin_material", tecnica: "Espalda neutra y rodillas algo flexionadas; empuja la cadera atrás y vuelve.", name: "Buenos días sin material (bisagra de cadera)", muscle: "isquios", pattern: "bisagra", equipment: ["sin_material"], level: "principiante", compound: true },
  { id: "pullover_mancuerna", tecnica: "Tumbado en el banco, lleva la mancuerna detrás de la cabeza en arco y vuelve controlando.", name: "Pullover con mancuerna", muscle: "espalda", pattern: "tiron_vertical", equipment: ["mancuernas", "banco"], level: "principiante", compound: false },
  { id: "extension_triceps_mancuerna", tecnica: "Sujeta una mancuerna con las dos manos sobre la cabeza y baja hacia la nuca; codos cerca de la cabeza.", name: "Extensión de tríceps sobre la cabeza con mancuerna", muscle: "triceps", pattern: "extension_triceps", equipment: ["mancuernas"], level: "principiante", compound: false },
  { id: "fondos_silla", tecnica: "Manos en el borde de una silla firme, cadera cerca del borde; baja doblando los codos hacia atrás sin encogerte de hombros.", name: "Fondos de tríceps en silla o banco", muscle: "triceps", pattern: "extension_triceps", equipment: ["sin_material"], level: "principiante", compound: false },
  { id: "curl_toalla", tecnica: "Pisa los extremos de una toalla y tira hacia los hombros con los codos pegados al cuerpo.", name: "Curl de bíceps con toalla", muscle: "biceps", pattern: "curl_biceps", equipment: ["sin_material"], level: "principiante", compound: false },
  { id: "elevaciones_laterales_botellas", tecnica: "Botellas de agua o bolsas con peso en las manos; sube hasta la altura del hombro sin encoger los hombros.", name: "Elevaciones laterales con botellas de agua", muscle: "hombros", pattern: "elevacion_lateral", equipment: ["sin_material"], level: "principiante", compound: false },
  { id: "pajaros_sin_peso", tecnica: "Inclina el tronco con los codos ligeramente doblados y abre los brazos a los lados sin impulso.", name: "Pájaros sin peso (deltoides posterior)", muscle: "hombros", pattern: "hombro_posterior", equipment: ["sin_material"], level: "principiante", compound: false },
  { id: "sentadilla_isometrica_pared", tecnica: "Espalda contra la pared y rodillas a 90 grados; mantén la postura apretando los muslos.", name: "Sentadilla isométrica contra la pared", muscle: "cuadriceps", pattern: "aislado_pierna", equipment: ["sin_material"], level: "principiante", compound: false, repsOverride: "30-45 s" },
  { id: "curl_femoral_toalla", tecnica: "Tumbado boca arriba, talones sobre una toalla en el suelo: eleva la cadera y lleva los talones hacia los glúteos.", name: "Curl femoral con toalla", muscle: "isquios", pattern: "curl_isquio", equipment: ["sin_material"], level: "principiante", compound: false }
];

/**
 * Qué material tiene cada opción de equipamiento. Un ejercicio se ofrece solo
 * si TODO su material está en la lista. "banco" y "sin_material" van con
 * "mancuernas": un gimnasio pequeño con mancuernas casi siempre tiene banco.
 */
var EQUIPAMIENTO_DISPONIBLE = {
  gimnasio: ["barra", "banco", "mancuernas", "maquina", "polea", "dominadas", "paralelas", "sin_material"],
  mancuernas: ["mancuernas", "banco", "sin_material"],
  sin_material: ["sin_material"]
};

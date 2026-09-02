/**
 * js/data/legal.js
 * ─────────────────────────────────────────────────────────────────────────
 * Condiciones de uso y privacidad, como DATOS y no como HTML suelto.
 *
 * Vive aquí, y no escrito a mano dentro de index.html, por tres motivos
 * concretos:
 *
 *   1. Se enseña en DOS sitios (la bienvenida del primer día y el enlace
 *      permanente del pie). Duplicar el texto garantiza que un día digan
 *      cosas distintas.
 *   2. `LEGAL_VERSION` se guarda junto a la aceptación del usuario
 *      (js/core/onboarding.js). Si algún día cambia algo sustancial, se
 *      sube la versión y a quien aceptó la anterior se le vuelve a
 *      preguntar. Sin versión no hay forma honesta de saber QUÉ aceptó.
 *   3. Es texto legal: tiene que poder revisarse de un vistazo, en un
 *      archivo, sin buscarlo entre etiquetas.
 *
 * ── Regla de contenido ──────────────────────────────────────────────────
 * Aquí NO se promete nada que la aplicación no haga. Cada afirmación sobre
 * datos es comprobable en el código:
 *   - "solo en tu navegador"  -> js/core/settings.js y js/core/pantry.js
 *                                (localStorage, claves nutritionPlanner.*)
 *   - "si creas cuenta, ..."   -> js/core/cloud-sync.js + supabase/schema.sql
 *   - "puedes borrarlo"        -> botón Resetear y cierre de sesión
 *                                (js/core/migration.js, onAuthSignOut)
 * Si el comportamiento cambia, este texto cambia con él.
 *
 * Depende de: nada.
 *
 * Expone (globales):
 *   LEGAL_VERSION      → string, la versión que se guarda al aceptar
 *   LEGAL_UPDATED_AT   → string, fecha legible de la última revisión
 *   LEGAL_SECTIONS     → array de { title, paragraphs[] }
 *   LEGAL_SUMMARY      → array de string: el resumen honesto de 3 líneas
 *                        que se ve SIN desplegar nada
 * ─────────────────────────────────────────────────────────────────────────
 */

var LEGAL_VERSION = "1.0";
var LEGAL_UPDATED_AT = "2 de septiembre de 2026";

/**
 * Lo que se ve sin abrir nada. Nadie lee doce párrafos antes de probar una
 * aplicación, así que lo importante de verdad va aquí arriba, en tres
 * frases, y el texto completo queda a un clic. Ocultar lo esencial detrás
 * de un desplegable sería cumplir la forma y no el fondo.
 */
var LEGAL_SUMMARY = [
  "Esto es un planificador de menús, no un consejo médico ni dietético.",
  "Tus datos se quedan en este navegador. Solo salen de aquí si creas una cuenta a propósito.",
  "Los precios son orientativos y de Mercadona; comprueba siempre la etiqueta y el precio reales."
];

var LEGAL_SECTIONS = [
  {
    title: "Qué es esta aplicación",
    paragraphs: [
      "Es un planificador de menús personal y gratuito. A partir de tus datos (edad, sexo, peso, altura, actividad y objetivo) calcula unas necesidades aproximadas de calorías y macronutrientes, y compone días de comidas con productos reales de Mercadona ajustándose al presupuesto que le indiques.",
      "Funciona con un motor de reglas que se ejecuta enteramente en tu navegador. No hay ningún modelo de inteligencia artificial decidiendo lo que comes, ni ninguna consulta a un servidor para generar el plan.",
      "Es un proyecto personal, sin ánimo de lucro y sin relación con ninguna empresa, tienda ni marca."
    ]
  },
  {
    title: "No es consejo médico ni dietético",
    paragraphs: [
      "Los cálculos usan fórmulas estándar de población general (Mifflin-St Jeor y factores de actividad). Son estimaciones estadísticas: no conocen tu historial, tu analítica, tu medicación ni tu composición corporal, y pueden equivocarse contigo en concreto.",
      "Esta aplicación no diagnostica, no trata y no sustituye a un médico, a un dietista-nutricionista ni a ningún otro profesional sanitario. Antes de cambiar tu alimentación de forma significativa, consúltalo con uno.",
      "Habla con un profesional antes de usarla si estás embarazada o en período de lactancia, si tienes diabetes, una enfermedad renal, hepática, cardíaca o digestiva, si tomas medicación que interactúe con la dieta, o si tienes o has tenido un trastorno de la conducta alimentaria. Esta aplicación no está pensada para menores de 14 años.",
      "Si algún día un plan te propone algo que te parece excesivo, insuficiente o simplemente raro, hazle caso a tu criterio y no al programa."
    ]
  },
  {
    title: "Precios y productos",
    paragraphs: [
      "Los precios provienen de la API pública de Mercadona y corresponden al almacén que sirve a Granada. Se recogieron en una fecha concreta y no se actualizan solos: cuando los mires, pueden llevar semanas sin revisar.",
      "Además hay dos aproximaciones deliberadas. La carne y el pescado se cobran al precio MEDIO de sus cortes reales, porque bajo un mismo nombre (\"lomo de cerdo\") la tienda vende varios productos a precios distintos. Y muchos productos se venden en formato cerrado, así que el coste de la compra cuenta el envase entero aunque la receta use una parte.",
      "El total que calcula esta aplicación es por tanto orientativo: una estimación razonada, no un presupuesto exacto. El precio bueno es siempre el de la tienda.",
      "Ni esta aplicación ni su autor tienen relación alguna con Mercadona. Los nombres de productos y marcas pertenecen a sus titulares y se usan solo para identificar qué comprar."
    ]
  },
  {
    title: "Alérgenos e intolerancias",
    paragraphs: [
      "Las etiquetas de alérgenos que muestra la aplicación son informativas y pueden estar incompletas o desactualizadas. No cubren las trazas ni la contaminación cruzada en fábrica.",
      "Si tienes una alergia o una intolerancia, la única fuente válida es la etiqueta del envase que tengas en la mano. No uses esta aplicación como filtro de seguridad."
    ]
  },
  {
    title: "Qué datos se guardan, y dónde",
    paragraphs: [
      "Sin cuenta: todo se guarda únicamente en el almacenamiento local de este navegador (tus datos de perfil, tu despensa y tu plan del día). No se envía a ningún servidor, no hay analítica, no hay cookies de seguimiento y no hay publicidad. Si borras los datos del navegador, desaparecen; nadie tiene otra copia.",
      "Con cuenta: para poder recuperar tus ajustes en otro dispositivo se guardan, en un proyecto de Supabase, tu correo electrónico y esos mismos datos de perfil, despensa y plan. Nada más. No se guarda tu contraseña en claro (de eso se encarga Supabase) y no se comparte ni se vende nada a terceros.",
      "Crear la cuenta es opcional y siempre lo será. La aplicación funciona entera sin ella."
    ]
  },
  {
    title: "Cómo borrar tus datos",
    paragraphs: [
      "Los datos de este navegador se borran con el botón \"Resetear\" del formulario, o borrando los datos del sitio desde tu navegador.",
      "Si tienes cuenta, al cerrar sesión se limpia la copia local de este dispositivo.",
      "Para eliminar la cuenta entera, entra en tu menú de usuario (arriba a la derecha) y pulsa \"Borrar mi cuenta\". Se borran en el mismo momento tu cuenta y todo lo que hubiera guardado en la nube. No hace falta pedírselo a nadie ni esperar, y no se puede deshacer."
    ]
  },
  {
    title: "Servicios de terceros",
    paragraphs: [
      "Si creas una cuenta, la autenticación y el almacenamiento los proporciona Supabase, y quedan sujetos a sus propias condiciones y política de privacidad. Si entras con Google, Google recibe la información propia de ese proceso de identificación.",
      "Sin cuenta, la aplicación no contacta con ningún tercero para funcionar."
    ]
  },
  {
    title: "Garantías y responsabilidad",
    paragraphs: [
      "La aplicación se ofrece tal cual, sin garantía de que los cálculos, los precios o la disponibilidad de los productos sean correctos, y sin compromiso de que siga funcionando o de que tus datos en la nube se conserven.",
      "El uso es bajo tu propia responsabilidad. En la medida que permita la ley, el autor no responde de los daños que puedan derivarse del uso de la aplicación ni de las decisiones que tomes a partir de ella.",
      "Nada de lo anterior limita los derechos que te reconozca la normativa de consumo aplicable, ni la responsabilidad que por ley no pueda excluirse."
    ]
  },
  {
    title: "Cambios en estas condiciones",
    paragraphs: [
      "Si estas condiciones cambian en algo sustancial, se te pedirá que las aceptes de nuevo antes de seguir usando la aplicación. La versión que aceptaste queda guardada junto a la fecha, para que el aviso solo aparezca cuando el texto cambie de verdad.",
      "Esta aplicación no te pide ningún dato de contacto ni te lo va a pedir: todo lo que puedes necesitar hacer con tus datos, incluido borrarlos, se hace desde la propia aplicación y sin intermediarios.",
      "Última revisión: " + LEGAL_UPDATED_AT + ". Versión " + LEGAL_VERSION + "."
    ]
  }
];

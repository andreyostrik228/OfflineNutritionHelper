// Pinta a PNG el icono del gato (todos los tamaños) y la imagen de compartir,
// directamente en assets/img. Hace falta la web servida en local desde la raíz
// del proyecto (configuración «static-site» de .claude/launch.json):
//   node scripts/marca/exportar.mjs [http://127.0.0.1:8000/]
//
// Los nombres llevan «gato» a propósito: los iconos no tienen sello ?v=, y un
// icono nuevo con el nombre de antes se queda en la caché de quien ya entró.
// Si se cambia el dibujo, nombre nuevo (y cambiarlo en index.html, el
// manifiesto, 404.html y las tres páginas de comparación).
import { lanzar, sleep } from "../qa/cdp.mjs";
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8000/";
const SALIDA = new URL("../../assets/img/", import.meta.url);
const PIEZAS = [
  ["icono.html", "gato-32.png", 32, 32],
  ["icono.html", "gato-180.png", 180, 180],
  ["icono.html", "gato-192.png", 192, 192],
  ["icono.html", "gato-512.png", 512, 512],
  ["icono.html?mascara=1", "gato-maskable-192.png", 192, 192],
  ["icono.html?mascara=1", "gato-maskable-512.png", 512, 512],
  ["og-gato.html", "og-gato.png", 1200, 630]
];

for (const [pagina, nombre, ancho, alto] of PIEZAS) {
  const b = await lanzar({ ancho, alto, escala: 1, movimiento: false });
  try {
    // lanzar() emula un móvil por debajo de 700 px de ancho, y un móvil encoge
    // la página para que quepa: el icono de 32 salía casi vacío.
    await b.cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false });
    await b.ir(BASE + "scripts/marca/" + pagina, 400);
    await b.js("document.fonts.ready.then(function () { return 1; })");
    await sleep(200);
    const r = await b.cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(new URL(nombre, SALIDA), Buffer.from(r.data, "base64"));
    console.log(nombre, ancho + "x" + alto, b.errores.length ? "ERRORES: " + b.errores.join(" | ") : "");
  } finally { b.cerrar(); }
}

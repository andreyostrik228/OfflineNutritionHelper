// Comprueba por HASH que lo desplegado es lo que hay en la carpeta que se subió.
//   node scripts/qa/produccion.mjs <carpeta-desplegada> <url-base-con-barra-final>
//   node scripts/qa/produccion.mjs "$TEMP/deploy" https://offline-nutrition-helper.pages.dev/
// Tras un despliegue un fichero puede tardar unos segundos en llegar a todos los nodos:
// cada fichero se reintenta 6 veces antes de darlo por distinto. `_headers` no se sirve (se compara a mano).
// Sale con código 1 si algo difiere, falta o no se pudo comprobar.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const [DIR, BASE] = process.argv.slice(2);
if (!DIR || !BASE) { console.error("uso: node scripts/qa/produccion.mjs <carpeta> <url-base/>"); process.exit(2); }
const md5 = (buf) => crypto.createHash("md5").update(buf).digest("hex");
const ficheros = [];
(function recorrer(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? recorrer(p) : ficheros.push(p); } })(DIR);

async function bajar(rel) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(BASE + rel + "?x=" + Date.now(), { cache: "no-store" });
      if (r.status === 404) return { st: 404 };
      if (r.ok) return { st: 200, buf: Buffer.from(await r.arrayBuffer()) };
    } catch { /* reintento */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  return { st: "error" };
}
let bien = 0;
const distintos = [], faltan = [], sinComprobar = [];
for (const f of ficheros) {
  const rel = path.relative(DIR, f).split(path.sep).join("/");
  if (rel === "_headers") continue;
  const r = await bajar(rel);
  if (r.st === 404) faltan.push(rel);
  else if (r.st === "error") sinComprobar.push(rel);
  else if (md5(r.buf) !== md5(fs.readFileSync(f))) distintos.push(rel);
  else bien++;
}
console.log("idénticos:", bien, "de", ficheros.length - 1, "| distintos:", distintos, "| no están:", faltan, "| sin comprobar:", sinComprobar);
const inicio = await bajar("");
const html = inicio.buf ? inicio.buf.toString("utf8") : "";
console.log("sello:", (html.match(/\?v=(\d+[a-z])/) || [])[1]);
process.exit(distintos.length || faltan.length || sinComprobar.length ? 1 : 0);

// Aspecto y marcas del alta POR CUENTA, con la nube SIMULADA (no toca Firebase).
//   node scripts/qa/cuenta.mjs <url> <carpeta> [ancho] [alto]
// Recorre: cuenta A con «noche» y alta hecha -> cerrar sesión (vuelve de fábrica: hojas, alta vacía) ->
// entra B, nueva (sube {look:"hojas"}) -> entra C, con `_prefs` en la nube (kitty y marcas suyas, sin subir nada).
// Lo que NO prueba: Firebase de verdad (HANDOFF, sección 11). Sale con código 1 si algo no es lo esperado.
import { lanzar, QUITAR_BIENVENIDA, sleep } from "./cdp.mjs";

const [URL_APP, SALIDA, ANCHO = "390", ALTO = "844"] = process.argv.slice(2);
if (!URL_APP || !SALIDA) { console.error("uso: node scripts/qa/cuenta.mjs <url> <carpeta> [ancho] [alto]"); process.exit(2); }
const b = await lanzar({ ancho: ANCHO, alto: ALTO, salida: SALIDA });
const { js, ir, foto } = b;
const VER = `JSON.stringify({ look: document.documentElement.getAttribute("data-look"), hoja: ((document.getElementById("aspectoCss")||{}).href||"").split("/").pop().split("?")[0] || null, guardado: localStorage.getItem("nutritionPlanner.look.v1"), alta: JSON.parse(localStorage.getItem("nutritionPlanner.onboarding.v1")||"{}") })`;
let fallos = 0;
function esperar(nombre, real, ok) { const bien = ok(real); if (!bien) fallos++; console.log((bien ? "OK   " : "FALLA ") + nombre, JSON.stringify(real)); }
try {
  await ir(URL_APP);
  // Cuenta A en el dispositivo: eligió «noche», hizo el cuestionario y vio el recorrido
  await js(`localStorage.clear(); localStorage.setItem("nutritionPlanner.lang.v1","es"); localStorage.setItem("nutritionPlanner.look.v1","noche"); localStorage.setItem("nutritionPlanner.cloudSyncedUserId.v1","user-A"); localStorage.setItem("nutritionPlanner.onboarding.v1", JSON.stringify({termsVersion:"x",termsAcceptedAt:"2026-10-01T00:00:00Z",intakeDoneAt:"2026-10-01T00:00:00Z",tourDoneAt:"2026-10-01T00:00:00Z"})); 1`);
  await ir(URL_APP);
  await js(QUITAR_BIENVENIDA);
  esperar("1. cuenta A: «noche» + alta hecha", JSON.parse(await js(VER)), (v) => v.look === "noche" && v.alta.intakeDoneAt && v.alta.tourDoneAt);

  await js("onAuthSignOut(); authOnDataReconciled(); 1");
  await sleep(1500);
  esperar("2. tras CERRAR SESIÓN: de fábrica (hojas, alta vacía)", JSON.parse(await js(VER)), (v) => v.look === "hojas" && !v.alta.intakeDoneAt && !v.alta.tourDoneAt);

  // Entra B, recién creada: la nube está vacía
  await js(`window.__subidas = []; getCurrentUser = function(){ return {id:"user-B"}; }; pullCloudUserData = function(){ return Promise.resolve({pantry_state:{},pantry_history:[],settings:{},migrated_at:null}); }; pushSettingsToCloud = function(){ window.__subidas.push(JSON.parse(JSON.stringify(settingsWithAccountPrefs(getSettings())))); return Promise.resolve({error:null,skipped:false}); }; 1`);
  const estadoB = await js("runReconciliation().then(function(r){ authOnDataReconciled(); return r.status; })");
  await sleep(1500);
  const subidasB = JSON.parse(await js("JSON.stringify(window.__subidas.map(function(s){return s._prefs;}))"));
  esperar("3. entra B (nueva, " + estadoB + "): hojas, sin marcas, sube su aspecto", { ...JSON.parse(await js(VER)), subidasB }, (v) => v.look === "hojas" && !v.alta.tourDoneAt && subidasB.length >= 1 && subidasB[0].look === "hojas");

  // Cierra B y entra C, que ya tenía sus preferencias en la nube
  await js("onAuthSignOut(); authOnDataReconciled(); 1");
  await js(`window.__subidas = []; getCurrentUser = function(){ return {id:"user-C"}; }; pullCloudUserData = function(){ return Promise.resolve({pantry_state:{},pantry_history:[],settings:{_prefs:{look:"kitty",intakeDoneAt:"2026-09-01T00:00:00Z",tourDoneAt:"2026-09-01T00:00:00Z"}},migrated_at:null}); }; 1`);
  const estadoC = await js("runReconciliation().then(function(r){ authOnDataReconciled(); return r.status; })");
  await sleep(2000);
  const subidasC = await js("window.__subidas.length");
  esperar("4. entra C (" + estadoC + "): kitty y marcas suyas, NO sube nada", { ...JSON.parse(await js(VER)), subidasC }, (v) => v.look === "kitty" && v.alta.tourDoneAt === "2026-09-01T00:00:00Z" && subidasC === 0);
  await foto("cuenta-C-kitty");
  console.log("ERRORES JS:", b.errores.length ? b.errores.join(" | ") : "ninguno");
  if (b.errores.length) fallos++;
} finally { b.cerrar(); }
process.exit(fallos ? 1 : 0);

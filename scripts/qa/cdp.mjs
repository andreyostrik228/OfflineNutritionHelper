// Arnés común de las pruebas con Chrome SIN interfaz (protocolo CDP, sin dependencias).
//
//   import { lanzar, QUITAR_BIENVENIDA } from "./cdp.mjs";
//   const b = await lanzar({ ancho: 390, alto: 844, salida: "capturas" });
//   try { await b.ir(url); console.log(await b.js("document.title")); } finally { b.cerrar(); }
//
// Hace falta Chrome (variable CHROME si no está en la ruta de abajo) y Node 22+
// (WebSocket y fetch globales). La web se sirve en local con
//   python -m http.server 8000 --directory <raiz del proyecto>
// y la dirección es http://127.0.0.1:8000/ (la configuración «static-site» de
// .claude/launch.json hace justo eso).
//
// TRES TRAMPAS que ya costaron horas (HANDOFF, sección 12):
//  1. Este Chrome arranca con `prefers-reduced-motion: reduce`; sin forzar
//     `no-preference` GSAP no corre y el recorrido sale quieto. `lanzar` lo
//     fuerza salvo que pidas `movimiento: false` (o la variable REDUCIDO=1).
//  2. Saltarse la bienvenida con `QUITAR_BIENVENIDA` deja la página `inert`;
//     hay que quitar el atributo (lo hace) y usar scroll instantáneo.
//  3. El emulador de ventana de las herramientas del navegador de la app
//     falsea el desbordamiento: aquí se mide con `Emulation.setDeviceMetricsOverride`
//     y se comprueba `clientWidth === innerWidth`.
import { spawn } from "node:child_process";
import { rmSync, writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import os from "node:os";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

export { sleep };

export const QUITAR_BIENVENIDA = `(function(){["esperando-bienvenida","is-onboarding"].forEach(function(c){document.documentElement.classList.remove(c);document.body.classList.remove(c);}); var o=document.getElementById("onboarding"); if(o) o.hidden=true; Array.prototype.forEach.call(document.querySelectorAll("[inert]"),function(n){n.removeAttribute("inert");}); return 1;})()`;

export async function lanzar(opciones = {}) {
  const { ancho = 390, alto = 844, salida = null, movimiento = !process.env.REDUCIDO, escala = 2 } = opciones;
  if (salida) mkdirSync(salida, { recursive: true });
  const puerto = 9700 + Math.floor(Math.random() * 200);
  const perfil = os.tmpdir() + "/qa-perfil-" + puerto;
  rmSync(perfil, { recursive: true, force: true });
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`,
    "--no-first-run", "--hide-scrollbars", "--lang=es-ES", "about:blank"], { stdio: "ignore" });
  let wsUrl = null;
  for (let i = 0; i < 150 && !wsUrl; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
      const pag = lista.find((x) => x.type === "page");
      if (pag) wsUrl = pag.webSocketDebuggerUrl;
    } catch { /* Chrome aún arrancando */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { proc.kill(); throw new Error("Chrome no arrancó (¿ruta en CHROME?)"); }
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pendientes = new Map();
  let eventos = [];
  const errores = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m.result); pendientes.delete(m.id); return; }
    eventos.push(m);
    if (m.method === "Runtime.exceptionThrown") errores.push((m.params.exceptionDetails.exception || {}).description);
  };
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pendientes.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const js = async (expresion) => {
    const r = await cdp("Runtime.evaluate", { expression: expresion, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || "error en la página");
    return r.result.value;
  };
  /** Navega y espera a `load` + 2,5 s (los scripts son 70 y el service worker tarda). */
  async function ir(url, espera = 2500) {
    eventos = [];
    await cdp("Page.navigate", { url });
    for (let i = 0; i < 150; i++) { if (eventos.some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
    await sleep(espera);
  }
  async function foto(nombre) {
    if (!salida) return;
    await sleep(400);
    const r = await cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${salida}/${nombre}.png`, Buffer.from(r.data, "base64"));
  }
  /** Clic REAL (ratón) en el centro del primer elemento que case; false si no existe. */
  async function clic(selector) {
    const p = await js("(function(){var e=document.querySelector(" + JSON.stringify(selector) + "); if(!e) return null; var b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2};})()");
    if (!p) return false;
    for (const type of ["mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: "left", clickCount: 1 });
    return true;
  }
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  if (movimiento) await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await cdp("Emulation.setDeviceMetricsOverride", { width: Number(ancho), height: Number(alto), deviceScaleFactor: escala, mobile: Number(ancho) < 700 });
  return { cdp, js, ir, foto, clic, sleep, errores, cerrar: () => { try { ws.close(); } catch { /* ya cerrado */ } proc.kill(); } };
}

/** Deja el navegador como el de una persona que YA hizo el cuestionario y vio el recorrido. */
export function prepararAltaHecha(lang, look) {
  return `localStorage.clear(); localStorage.setItem("nutritionPlanner.lang.v1", ${JSON.stringify(lang)}); localStorage.setItem("nutritionPlanner.onboarding.v1", JSON.stringify({intakeDoneAt:"2026-10-01T00:00:00Z", tourDoneAt:"2026-10-08T00:00:00Z"})); ${look ? `localStorage.setItem("nutritionPlanner.look.v1", ${JSON.stringify(look)});` : ""} 1`;
}

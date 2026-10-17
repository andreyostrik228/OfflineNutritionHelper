// Recorre las 9 escenas del recorrido guiado y las mide (fotogramas lentos, desbordes, botones).
//   node scripts/qa/tour.mjs <url> <carpeta> <lang> <ancho> <alto>
//   env: MEDIR=1 (comprueba geometría de cada escena)  LOOK=<aspecto>  ESCENAS=1,4,6 (solo capturas de esas)
//        TIEMPOS=1200,3300 (ms en que se captura dentro de cada escena)  REDUCIDO=1 (sin GSAP, estado final)
// Ejemplo (con el servidor local en marcha):
//   MEDIR=1 LOOK=revista node scripts/qa/tour.mjs http://127.0.0.1:8000/ capturas ru 320 568
// Sale con código 1 si alguna escena da PROBLEMAS o hay errores de JavaScript.
import { lanzar, QUITAR_BIENVENIDA, prepararAltaHecha, sleep } from "./cdp.mjs";

const [URL_APP, SALIDA, LANG = "es", ANCHO = "390", ALTO = "844"] = process.argv.slice(2);
if (!URL_APP || !SALIDA) { console.error("uso: node scripts/qa/tour.mjs <url> <carpeta> <lang> <ancho> <alto>"); process.exit(2); }
const b = await lanzar({ ancho: ANCHO, alto: ALTO, salida: SALIDA });
const { js, foto, ir } = b;
let problemas = 0;
try {
  await ir(URL_APP);
  await js(prepararAltaHecha(LANG, process.env.LOOK));
  await ir(URL_APP);
  await js(QUITAR_BIENVENIDA);
  console.log("GSAP:", await js(`typeof gsap + " | fx: " + tourFxActivo() + " | escenas: " + TOUR_STEPS.length`));
  // SIN plan en pantalla tiene que abrirse igual (era el bug de «Ver la explicación otra vez»)
  await js("startTour(); 1");
  await sleep(300);
  await foto("00-entrada");
  const tiempos = (process.env.TIEMPOS || "3300").split(",").map(Number);
  const solo = process.env.ESCENAS ? process.env.ESCENAS.split(",").map(Number) : null;
  const total = await js("TOUR_STEPS.length");
  for (let i = 0; i < total; i++) {
    let antes = 0;
    await js(`window.__f=[]; (function m(){ var t0=performance.now(); requestAnimationFrame(function(t1){ window.__f.push(t1-t0); if(window.__f.length<400 && !window.__stop) m(); }); })(); 1`);
    if (solo && !solo.includes(i + 1)) await sleep(process.env.MEDIR ? 1700 : 500);
    else for (const ms of tiempos) { await sleep(ms - antes); antes = ms; await foto(String(i + 1).padStart(2, "0") + "-" + ms); }
    const fps = JSON.parse(await js(`window.__stop=true; JSON.stringify((function(){ var f=window.__f.filter(function(x){return x>0}); var s=f.reduce(function(a,b){return a+b;},0); return {n:f.length, medio:Math.round(s/f.length), max:Math.round(Math.max.apply(null,f)), lentos:f.filter(function(x){return x>50}).length}; })())`));
    console.log("escena " + (i + 1) + " fotogramas:", JSON.stringify(fps));
    await js("window.__stop=false; 1");
    if (process.env.MEDIR) {
      const m = JSON.parse(await js(`JSON.stringify((function(){ var q=function(s){return document.querySelector(s)}; var c=q("#tour .tour__card").getBoundingClientRect(); var n=q("#tour .tour__nav").getBoundingClientRect(); var tx=q("#tour .tour__texto"); var es=q("#tour .tour__escena").getBoundingClientRect(); var st=q("#tour .tg-stage"); var hijo=st&&st.firstElementChild; var sh=hijo?hijo.getBoundingClientRect():null; var sb=st.getBoundingClientRect(); var botonNext=q("#tour .tour__next").getBoundingClientRect(); return {vw:innerWidth, vh:innerHeight, cardTop:Math.round(c.top), cardBottom:Math.round(c.bottom), navBottom:Math.round(n.bottom), nextRight:Math.round(botonNext.right), stageH:Math.round(es.height), textoOverflow: tx.scrollHeight>tx.clientHeight+1, escenaDesborda: sh? (sh.height>sb.height+2 || sh.width>sb.width+2):false, escenaH: sh?Math.round(sh.height):0, botonesDesbordan: Array.prototype.filter.call(document.querySelectorAll("#tour .tg-btn"), function(b){ return b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1; }).map(function(b){ return b.textContent.trim().slice(0,30); })}; })())`));
      const prob = [];
      if (m.cardTop < 0 || m.cardBottom > m.vh + 1) prob.push("la hoja se sale de la pantalla");
      if (m.navBottom > m.vh + 1) prob.push("los botones se salen");
      if (m.nextRight > m.vw + 1) prob.push("Siguiente se sale por la derecha");
      if (m.textoOverflow) prob.push("el texto no cabe en su caja");
      if (m.escenaDesborda) prob.push("la maqueta (" + m.escenaH + "px) no cabe en la escena (" + m.stageH + "px)");
      if (m.botonesDesbordan.length) prob.push("texto fuera del botón: " + m.botonesDesbordan.join(" | "));
      if (m.stageH < 150) prob.push("escena muy baja: " + m.stageH);
      if (prob.length) problemas++;
      console.log("escena " + (i + 1) + ": escena " + m.stageH + "px, maqueta " + m.escenaH + "px | " + (prob.length ? "PROBLEMAS: " + prob.join("; ") : "ok"));
    }
    if (i === 0 || i === total - 1) console.log(await js(`JSON.stringify({i:_tourIndex, id:_tourPasos[_tourIndex].id, titulo:document.querySelector("#tour .tour__title").textContent, abierto: document.getElementById("tour").open, scrollLock: document.documentElement.classList.contains("tour-abierto")})`));
    if (i < total - 1) await js(`document.querySelector("#tour .tour__next").click(); 1`);
  }
  await js(`document.querySelector("#tour .tour__next").click(); 1`);
  await sleep(700);
  await foto("99-confeti");
  await sleep(2500);
  console.log("tras el final:", await js(`JSON.stringify({abierto: document.getElementById("tour").open, oculto: document.getElementById("tour").hidden, lock: document.documentElement.classList.contains("tour-abierto"), visto: !!getOnboardingState().tourDoneAt, y: pageYOffset})`));
  console.log("ERRORES JS:", b.errores.length ? b.errores.join(" | ") : "ninguno");
  if (b.errores.length) problemas++;
} finally { b.cerrar(); }
process.exit(problemas ? 1 : 0);

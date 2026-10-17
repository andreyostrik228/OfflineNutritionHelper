// Pasa el cuestionario entero como una persona nueva y comprueba el orden:
//   cuestionario -> pregunta «¿Quieres ver un recorrido?» (SIN plan todavía) -> recorrido (si dice sí) -> plan.
//   node scripts/qa/alta.mjs <url> <carpeta> <lang> <ancho> <alto>
//   env: RESP=si|no|esc   qué contesta a la pregunta (por defecto si)
//        ACTIVO=1         con un plan de hoy ya empezado (sale el diálogo «plan activo»; debe salir DESPUÉS del recorrido)
//        CANCELAR=1       con ACTIVO: pulsa «Cancelar» en vez de «Cambiar el plan completo»
//        SALTAR=1         salta el recorrido con «Saltar» y mira que se genere el plan
import { lanzar, QUITAR_BIENVENIDA, sleep } from "./cdp.mjs";

const [URL_APP, SALIDA, LANG = "es", ANCHO = "390", ALTO = "844"] = process.argv.slice(2);
if (!URL_APP || !SALIDA) { console.error("uso: node scripts/qa/alta.mjs <url> <carpeta> <lang> <ancho> <alto>"); process.exit(2); }
const RESP = process.env.RESP || "si";
const b = await lanzar({ ancho: ANCHO, alto: ALTO, salida: SALIDA });
const { js, ir, foto, clic, cdp } = b;
const ESTADO = `JSON.stringify({
  pregunta: !!(document.getElementById("tourAsk") && document.getElementById("tourAsk").open),
  tour: !!(document.getElementById("tour") && document.getElementById("tour").open),
  plan: document.querySelectorAll("#mealsContainer .meal-card:not([data-empty])").length,
  dialogo: Array.prototype.filter.call(document.querySelectorAll("dialog"),function(d){return d.open;}).map(function(d){return d.id || d.className;}),
  visto: !!(getOnboardingState()||{}).tourDoneAt,
  escena: (document.querySelector("#tour .tour__title")||{}).textContent || null
})`;
let fallos = 0;
try {
  await ir(URL_APP);
  await js(`localStorage.clear(); localStorage.setItem("nutritionPlanner.lang.v1", ${JSON.stringify(LANG)}); localStorage.setItem("nutritionPlanner.onboarding.v1", JSON.stringify({intakeDoneAt:"2026-10-01T00:00:00Z", tourDoneAt:"2026-10-01T00:00:00Z"})); 1`);
  await ir(URL_APP);
  if (process.env.ACTIVO) {
    await js(QUITAR_BIENVENIDA);
    await js(`document.querySelector("#budgetModeMedium + .budget-chip").click(); document.getElementById("generatePlanBtn").click(); 1`);
    await sleep(4000);
    await js(`document.getElementById("usePlanTodayBtn").click(); 1`);
    await sleep(1500);
    console.log("plan activo:", await js(`(function(){var e=findTodayEntry(); var m=e.meals[0]; markMealCooked(e.id,m.mealKey||m.key||m.slot||m.id,true); return hasRealPantryAction(findTodayEntry());})()`));
    await ir(URL_APP);
  }
  // Acepta las condiciones y arranca el cuestionario
  await js(`(function(){var skip=document.querySelector(".onboarding__skip"); var terms=document.querySelector("#onboarding input[type=checkbox]"); if(terms && !terms.checked) terms.click(); if(skip) skip.click(); return 1;})()`);
  await sleep(900);
  await js(`(function(){var b=document.getElementById("onboardingStartBtn"); if(b) b.click(); return 1;})()`);
  await sleep(700);
  for (let n = 0; n < 25; n++) {
    const info = await js(`(function(){ var s=_obSteps()[_onboardingIndex]; if(!s) return null;
      if(s.kind==="choice"){ var box=document.getElementById("onboardingAnswer"); if(!box.querySelector(".is-selected")){ var b=box.querySelector(".onboarding__choice"); if(b) b.click(); } }
      return {i:_onboardingIndex, de:_obSteps().length}; })()`);
    if (!info) break;
    await sleep(200);
    const ultimo = info.i === info.de - 1;
    await js("_obNext(); 1");
    if (ultimo) break;
    await sleep(200);
  }
  const t0 = Date.now();
  let primera = null;
  for (let i = 0; i < 60; i++) { const e = JSON.parse(await js(ESTADO)); if (e.pregunta) { primera = { ms: Date.now() - t0, ...e }; break; } await sleep(50); }
  console.log("PREGUNTA VISIBLE a los", primera ? primera.ms + " ms" : "NUNCA", "| tarjetas de plan en ese momento:", primera ? primera.plan : "-", "| diálogos:", primera ? JSON.stringify(primera.dialogo) : "-");
  if (!primera) fallos++;
  await sleep(1500);
  const sinContestar = JSON.parse(await js(ESTADO));
  console.log("1,5 s después, sin contestar (el plan NO debe haberse generado):", JSON.stringify(sinContestar));
  if (sinContestar.plan) fallos++;
  await foto("2-pregunta");
  if (RESP === "esc") await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  else await clic(RESP === "si" ? "#tourAsk .tour__next" : "#tourAsk .tour__prev");
  console.log("contesta:", RESP);
  for (const ms of [1000, 2000, 3000]) { await sleep(ms); console.log("  +" + ms + "ms:", await js(ESTADO)); }
  if (process.env.SALTAR) {
    console.log("SALTAR el recorrido:", await clic("#tour .tour__skip"));
    for (const ms of [1200, 1300]) { await sleep(ms); console.log("  tras saltar:", await js(ESTADO)); }
  }
  if (process.env.ACTIVO) {
    console.log("ACTIVO: pulsa", process.env.CANCELAR ? "Cancelar" : "Cambiar el plan completo", await clic(process.env.CANCELAR ? "#planReplaceCancelBtn" : "#planReplaceFullBtn"));
    for (const ms of [1500, 2500]) { await sleep(ms); console.log("  +" + ms + "ms:", await js(ESTADO)); }
  }
  await foto("3-final");
  console.log("ERRORES JS:", b.errores.length ? b.errores.join(" | ") : "ninguno");
  if (b.errores.length) fallos++;
} finally { b.cerrar(); }
process.exit(fallos ? 1 : 0);

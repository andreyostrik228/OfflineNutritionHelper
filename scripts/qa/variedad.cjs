// Variedad entre los días de un plan, medida en el MOTOR (sin navegador), sobre cualquier copia del proyecto.
//   node scripts/qa/variedad.cjs <raiz-del-proyecto> [corridas]     (la raíz suele ser «.»)
//   env: SOLO=minimal,small (presupuestos 8/12/16/20)  DIAS=3|7  PERFIL=0|1 (hombre gana músculo / mujer pierde grasa)
// Mira «los N días IGUALES» (tiene que ser 0), «platos distintos/total» y «día1→día2 repetido».
// Para comparar con el motor de otro commit: git show <commit>:ruta > copia, o git worktree, y pasa esa raíz.
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const RAIZ = process.argv[2];
const N = Number(process.argv[3] || 60);
const FILES = [
  "js/data/dishes.js", "js/data/real-products.js", "js/data/packaging.js", "js/data/servings.js",
  "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js", "js/data/no-cook-classifier.js",
  "js/data/prices/mercadona.js", "js/data/budget-presets.js",
  "js/core/utils.js", "js/core/pricing.js", "js/core/servings.js", "js/core/nutrition.js", "js/core/budget.js",
  "js/core/calculator.js", "js/core/meal-helpers.js", "js/engine/dish-selector.js", "js/engine/plan-generator.js"
].filter((f) => fs.existsSync(path.join(RAIZ, f)));
const sb = {};
vm.createContext(sb);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(RAIZ, f), "utf8"), sb, { filename: f });

const PERFILES = [
  { nombre: "hombre 28a 78kg gana músculo", raw: { age: 28, sex: "male", weight: 78, height: 178, activity: 1.55, workouts: 4, goal: "bulk" } },
  { nombre: "mujer 32a 62kg pierde grasa", raw: { age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" } }
];
const MODOS = process.env.SOLO ? process.env.SOLO.split(",") : ["minimal", "small", "medium", "high"];
const DIAS = Number(process.env.DIAS || 3);
console.log("   presupuestos:", ["minimal","small","medium","high"].map(function (m) { try { return m + "=" + sb.resolveBudget({ budgetMode: m, budgetCustom: NaN }); } catch (e) { return m + "=?"; } }).join(" "));
function dishId(m) { return m.dishName || m.key; }
for (const perfil of (process.env.PERFIL ? [PERFILES[Number(process.env.PERFIL)]] : PERFILES)) {
  for (const modo of MODOS) {
    const acum = { kcal: 0, prot: 0, coste: 0, dias: 0, violaciones: 0 };
    let iguales = 0, sumaComunes = 0, sumaDistintos = 0, sumaTomas = 0, errores = 0, hechos = 0;
    for (let i = 0; i < N; i++) {
      try {
        const profile = sb.calculateProfile(perfil.raw);
        const budget = sb.resolveBudget({ budgetMode: modo, budgetCustom: NaN });
        const data = { budget, cookTime: 30, taste: "mixed", store: "mercadona", planDays: DIAS };
        let dias = [];
        if (sb.generateDietPlanDays) dias = sb.generateDietPlanDays(profile, data, DIAS);
        else for (let d = 0; d < DIAS; d++) { data.dayIndex = d; dias.push(sb.generateDietPlan(profile, data)); }
        dias.forEach((x) => {
          acum.kcal += x.total.kcal / profile.calories; acum.prot += x.total.protein / profile.protein;
          acum.coste += (x.total.purchaseCost != null ? x.total.purchaseCost : x.total.cost); acum.dias++;
          if (x.report && x.report.violations && x.report.violations.length) acum.violaciones++;
        });
        const platos = dias.map((x) => x.meals.map(dishId));
        const firmas = platos.map((p) => p.slice().sort().join("|"));
        if (new Set(firmas).size === 1) iguales++;
        const todos = [].concat.apply([], platos);
        sumaDistintos += new Set(todos).size; sumaTomas += todos.length;
        sumaComunes += platos[0].filter((p) => platos[1].includes(p)).length / platos[0].length;
        hechos++;
      } catch (e) { errores++; if (errores === 1) console.log("   error:", e.message.slice(0, 100)); }
    }
    console.log((perfil.nombre + " | " + modo).padEnd(48),
      "planes=" + hechos, "| los 3 días IGUALES:", iguales,
      "| platos distintos/total:", (sumaDistintos / hechos).toFixed(1) + "/" + (sumaTomas / hechos).toFixed(1),
      "| día1→día2 repetido:", Math.round(100 * sumaComunes / hechos) + "%",
      "| kcal:", Math.round(100 * acum.kcal / acum.dias) + "%", "prot:", Math.round(100 * acum.prot / acum.dias) + "%",
      "coste/día:", (acum.coste / acum.dias).toFixed(2), "| días con avisos:", Math.round(100 * acum.violaciones / acum.dias) + "%");
  }
}

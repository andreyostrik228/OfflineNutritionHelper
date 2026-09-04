# -*- coding: utf-8 -*-
"""Inserta lote_platos.json en dishes.js y dish-instructions.js.

Respeta el estilo de cada fichero al pie de la letra y renormaliza a CRLF,
como manda la regla del repo.
"""
import json, os, sys, io

SP = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SP, "..", ".."))
LOTE = os.path.join(SP, "lote_platos.json")
ETIQUETA = sys.argv[1] if len(sys.argv) > 1 else "lote 1"
FECHA = sys.argv[2] if len(sys.argv) > 2 else "2026-09-04"

datos = json.load(io.open(LOTE, encoding="utf-8"))


def num(x):
    """JS imprime 0.8, no 0.80; y 21 en vez de 21.0."""
    if isinstance(x, float) and x == int(x):
        return str(int(x))
    return repr(x)


def linea_plato(p):
    items = ",".join('{name:"%s",g:%s}' % (i["name"], num(i["g"])) for i in p["items"])
    return (
        '  { name:"%s", category:"%s", kcal:%s, protein:%s, carbs:%s, fat:%s, cost:%s, prep:%s, mainProt:"%s", taste:"%s",\n'
        "    items:[%s] },"
    ) % (
        p["name"], p["category"], num(p["kcal"]), num(p["protein"]), num(p["carbs"]),
        num(p["fat"]), num(p["cost"]), num(p["prep"]), p["mainProt"], p["taste"], items,
    )


def bloque_receta(nombre, r):
    pasos = "\n".join('      "%s"%s' % (s.replace('"', "'"), "," if i < len(r["steps"]) - 1 else "")
                      for i, s in enumerate(r["steps"]))
    equipo = ", ".join('"%s"' % e for e in r["equipment"])
    return (
        '  "%s": {\n'
        "    difficulty: %d,\n"
        "    equipment: [%s],\n"
        "    steps: [\n%s\n"
        "    ]\n"
        "  },"
    ) % (nombre, r["difficulty"], equipo, pasos)


# ── dishes.js ───────────────────────────────────────────────────────────
ruta = os.path.join(REPO, "js/data/dishes.js")
t = io.open(ruta, "rb").read().decode("utf-8").replace("\r\n", "\n")
ancla = "\n];"
if t.count(ancla) != 1:
    print("ABORTA dishes.js: el ancla aparece %d veces" % t.count(ancla)); sys.exit(1)
nuevos = "\n".join(linea_plato(d["plato"]) for d in datos)
cabecera = "\n  // ── Ampliacion del catalogo, %s (%s): %d platos ──────────────\n" % (
    ETIQUETA, FECHA, len(datos))
t = t.replace(ancla, "\n" + cabecera + nuevos + "\n];")
io.open(ruta, "wb").write(t.replace("\n", "\r\n").encode("utf-8"))
print("dishes.js: +%d platos" % len(datos))

# ── dish-instructions.js ────────────────────────────────────────────────
ruta = os.path.join(REPO, "js/data/dish-instructions.js")
t = io.open(ruta, "rb").read().decode("utf-8").replace("\r\n", "\n")
corte = t.find("function getDishInstructions")
if corte < 0:
    print("ABORTA: no encuentro getDishInstructions"); sys.exit(1)
cierre = t.rfind("\n};\n", 0, corte)
if cierre < 0:
    print("ABORTA: no encuentro el cierre de DISH_INSTRUCTIONS"); sys.exit(1)
bloques = "\n\n".join(bloque_receta(d["plato"]["name"], d["receta"]) for d in datos)
cab = "\n  // ── Recetas de la ampliacion, %s (%s) ────────────────────────\n" % (ETIQUETA, FECHA)
t = t[:cierre] + "\n" + cab + bloques + t[cierre:]
io.open(ruta, "wb").write(t.replace("\n", "\r\n").encode("utf-8"))
print("dish-instructions.js: +%d recetas" % len(datos))

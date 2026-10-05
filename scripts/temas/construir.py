#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera assets/css/temas/<aspecto>.css a partir de scripts/temas/aspectos/<aspecto>.py.

    python3 scripts/temas/construir.py            # todos
    python3 scripts/temas/construir.py hojas noche

Después de cambiar un aspecto (o style.css, de donde sale la parte "neutralizar"):
volver a generar, subir el sello ?v= de index.html y pasar los tests. Ver LEEME.md.
"""
import importlib.util, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import nucleo  # noqa: E402

SALIDA = os.path.join(nucleo.RAIZ, "assets", "css", "temas")
FUENTES = os.path.join(nucleo.RAIZ, "assets", "fonts")


def cargar(id_):
    ruta = os.path.join(AQUI, "aspectos", id_ + ".py")
    spec = importlib.util.spec_from_file_location("aspecto_" + id_, ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if mod.V["id"] != id_:
        raise SystemExit("%s: V['id'] vale %r, debería ser %r" % (ruta, mod.V["id"], id_))
    return mod


def ids():
    return sorted(f[:-3] for f in os.listdir(os.path.join(AQUI, "aspectos")) if f.endswith(".py") and not f.startswith("_"))


def main(argv):
    pedidos = argv or ids()
    os.makedirs(SALIDA, exist_ok=True)
    for id_ in pedidos:
        css = nucleo.generar(cargar(id_))
        # toda tipografía que cita tiene que estar en assets/fonts/
        for f in re.findall(r'url\("\.\./\.\./fonts/([^"]+)"\)', css):
            if not os.path.exists(os.path.join(FUENTES, f)):
                raise SystemExit("%s: falta assets/fonts/%s" % (id_, f))
        destino = os.path.join(SALIDA, id_ + ".css")
        with open(destino, "w", encoding="utf-8", newline="\r\n") as fh:
            fh.write(css)
        print("%-12s %6.1f KB  -> %s" % (id_, len(css.encode("utf-8")) / 1024, os.path.relpath(destino, nucleo.RAIZ)))


if __name__ == "__main__":
    main(sys.argv[1:])

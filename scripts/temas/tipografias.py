#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baja una familia de Google Fonts a assets/fonts/ y escribe su @font-face.

    python3 scripts/temas/tipografias.py "Nunito:wght@400..900" "Comfortaa:wght@500..700"

Por cada familia:
  - baja los subconjuntos latin, latin-ext, cyrillic y cyrillic-ext (los que
    cubren los idiomas de la aplicación) a assets/fonts/<familia>-<estilo>-<subconjunto>-<hash>.woff2
  - escribe scripts/temas/tipografias/<familia>.css con sus @font-face, con la URL
    RELATIVA a la hoja del aspecto (../../fonts/...). Los aspectos las usan con
    `fonts=["<familia>"]` en su módulo de scripts/temas/aspectos/.

Imprime `cyr=True` si la familia tiene cirílico: sin él no sirve para el ruso.
Hace falta red. Las licencias de lo que se baje van en assets/fonts/LEEME.md.
"""
import hashlib, os, re, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTES = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "fonts"))
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
SUBCONJUNTOS = ("latin", "latin-ext", "cyrillic", "cyrillic-ext")


def curl(args):
    return subprocess.run(["curl", "-sS", "-m", "40"] + args, capture_output=True, text=True).stdout


def familia(spec):
    nombre = spec.split(":")[0].replace("+", " ")
    slug = nombre.lower().replace(" ", "-")
    css = curl(["-A", UA, "https://fonts.googleapis.com/css2?family=%s&display=swap" % spec])
    if "@font-face" not in css:
        print("!! sin CSS para", spec, css[:120])
        return
    bloques = re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, flags=re.S)
    reglas = []
    for sub, cuerpo in bloques:
        if sub not in SUBCONJUNTOS:
            continue
        estilo = re.search(r"font-style: (\w+)", cuerpo).group(1)
        peso = re.search(r"font-weight: ([^;]+);", cuerpo).group(1)
        origen = re.search(r"url\((https[^)]+)\)", cuerpo).group(1)
        rango = re.search(r"unicode-range: ([^;]+);", cuerpo).group(1)
        fichero = "%s-%s-%s-%s.woff2" % (slug, estilo, sub, hashlib.md5(origen.encode()).hexdigest()[:6])
        destino = os.path.join(FUENTES, fichero)
        if not os.path.exists(destino):
            subprocess.check_call(["curl", "-sS", "-m", "60", "-o", destino, origen])
        reglas.append('@font-face { font-family: "%s"; font-style: %s; font-weight: %s; font-display: swap; '
                      'src: url("../../fonts/%s") format("woff2"); unicode-range: %s; }' % (nombre, estilo, peso, fichero, rango))
    with open(os.path.join(AQUI, "tipografias", slug + ".css"), "w", encoding="utf-8") as f:
        f.write("\n".join(reglas) + "\n")
    print("%-28s subconjuntos=%s  cyr=%s" % (nombre, ",".join(s for s, _ in bloques), "cyrillic" in [s for s, _ in bloques]))


if __name__ == "__main__":
    os.makedirs(FUENTES, exist_ok=True)
    for spec in sys.argv[1:]:
        familia(spec)

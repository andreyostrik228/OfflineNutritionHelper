# Tipografías

Alojadas aquí para que la aplicación se vea igual sin conexión. Las dos primeras son las del diseño por defecto (sección 0 de `assets/css/style.css`); el resto, cada una de un *aspecto* de `assets/css/temas/` (se cargan solo si el usuario elige ese aspecto).

| Familia | Uso | Origen | Licencia |
|---|---|---|---|
| Onest | texto corrido | https://fonts.google.com/specimen/Onest | SIL Open Font License 1.1 |
| Sofia Sans Extra Condensed | titulares y cifras | https://fonts.google.com/specimen/Sofia+Sans+Extra+Condensed | SIL Open Font License 1.1 |
| Nunito | aspecto *hojas* | https://fonts.google.com/specimen/Nunito | SIL Open Font License 1.1 |
| Manrope | aspecto *cristal* | https://fonts.google.com/specimen/Manrope | SIL Open Font License 1.1 |
| Bitter, Source Sans 3, Caveat | aspecto *avena* | https://fonts.google.com/specimen/Bitter · /Source+Sans+3 · /Caveat | SIL Open Font License 1.1 |
| Rubik | aspecto *relieve* | https://fonts.google.com/specimen/Rubik | SIL Open Font License 1.1 |
| Unbounded, Golos Text | aspecto *pegatinas* | https://fonts.google.com/specimen/Unbounded · /Golos+Text | SIL Open Font License 1.1 |
| Oswald, IBM Plex Mono, Source Sans 3 | aspecto *mercadillo* | https://fonts.google.com/specimen/Oswald · /IBM+Plex+Mono | SIL Open Font License 1.1 |
| Cormorant Garamond, Inter | aspecto *revista* | https://fonts.google.com/specimen/Cormorant+Garamond · /Inter | SIL Open Font License 1.1 |
| Exo 2, Onest | aspecto *noche* | https://fonts.google.com/specimen/Exo+2 | SIL Open Font License 1.1 |

Los `.woff2` son los que sirve Google Fonts (los de los aspectos llevan un sufijo de 6 letras: es el hash de la URL de origen), subconjuntos `latin`, `latin-ext`, `cyrillic` y `cyrillic-ext` (fuentes variables: Onest 400–700, Sofia Sans Extra Condensed 700–900). Texto de la licencia: https://openfontlicense.org

Para añadir un idioma con otro alfabeto (griego, vietnamita...) hay que bajar su subconjunto y añadir el `@font-face` correspondiente.

Los `@font-face` de cada aspecto salen de `scripts/temas/tipografias/*.css` (URL relativa a la hoja del aspecto: `../../fonts/...`); la herramienta para bajar una familia nueva y escribir su `.css` está descrita en `scripts/temas/LEEME.md`.

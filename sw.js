/**
 * sw.js — el Service Worker que hace que "Offline Nutrition Helper" sea
 * de verdad offline.
 * ─────────────────────────────────────────────────────────────────────────
 * Hasta el 2026-09-07 la aplicacion se llamaba "offline" y no lo era: sin
 * red, pantalla en blanco. Y el sitio donde mas falta hace es justo donde
 * peor va la cobertura, dentro del supermercado, con la lista de la compra
 * abierta.
 *
 * ── COMO CONVIVE CON EL SELLO `?v=` ─────────────────────────────────────
 * Cada script y la hoja de estilos llevan `?v=AAAAMMDDx`, que se sube a
 * mano en cada despliegue (ver la cabecera de index.html). Eso, que era una
 * molestia, aqui es exactamente lo que hace falta:
 *
 *   - Una URL con sello es INMUTABLE por construccion: si el contenido
 *     cambia, cambia la URL. Asi que se sirve desde cache sin preguntar,
 *     sin revalidar y sin riesgo de mezclar versiones.
 *   - `index.html` NO lleva sello, porque es la puerta de entrada. Va
 *     SIEMPRE a red primero: es lo unico que puede anunciar que hay un
 *     despliegue nuevo. Si la red falla, se sirve la copia guardada.
 *
 * De ahi sale la propiedad importante: **este fichero no hay que tocarlo en
 * cada despliegue.** No lleva dentro ninguna lista de recursos ni ningun
 * numero de version que se quede viejo. La lista de precache la deduce el
 * propio worker leyendo index.html, y el nombre de la cache sale del sello
 * que encuentre ahi. Un sello nuevo => una cache nueva => la vieja se borra
 * al activar. Si hiciera falta mantener a mano una lista de 55 URLs, se
 * quedaria desincronizada el primer dia con prisa.
 *
 * ── LO QUE NO SE CACHEA, A PROPOSITO ────────────────────────────────────
 * Supabase (cuentas, sincronizacion) y cualquier peticion que no sea GET.
 * Servir una respuesta de autenticacion desde cache es una forma excelente
 * de dejar a alguien dentro de una sesion que ya no existe.
 */
"use strict";

var PREFIJO = "onh-";
var CACHE_FUENTES = "onh-fuentes-v1";

/** Saca el sello `?v=...` del HTML para nombrar la cache de esta version. */
function selloDe(html) {
  var m = html.match(/\?v=([0-9a-z]+)/);
  return m ? m[1] : "sin-sello";
}

/** Todas las URLs con sello que declara index.html, mas la propia entrada. */
function recursosDe(html) {
  var urls = ["./"], visto = { "./": true };
  var re = /(?:src|href)="([^"]+\?v=[0-9a-z]+)"/g, m;
  while ((m = re.exec(html)) !== null) {
    if (!visto[m[1]]) { visto[m[1]] = true; urls.push(m[1]); }
  }
  return urls;
}

/** Nombre de la cache que le toca a un sello. */
function cacheDeSello(sello) {
  return PREFIJO + sello;
}

/**
 * Deja la cache de ESTE sello completa y borra las de sellos viejos.
 *
 * Se llama desde `install` y TAMBIEN desde cada navegacion, y esa segunda
 * llamada es la que arregla un fallo real (medido el 2026-09-08).
 *
 * El worker se disenio a proposito para no tocarse en cada despliegue: no
 * lleva dentro ni version ni lista de recursos. La consecuencia no prevista
 * es que, si solo cambia el sello de index.html, `sw.js` sigue siendo
 * IDENTICO byte a byte -- asi que el navegador no reinstala nada, `install`
 * y `activate` no vuelven a correr, y la cache nunca cambia de nombre ni se
 * limpia.
 *
 * Lo medido en el navegador tras subir el sello de `c` a `d`: la cache
 * seguia llamandose `onh-20260908c` y contenia 111 entradas -- 55 del sello
 * viejo y 55 del nuevo, porque el `fetch` guardaba lo nuevo en la primera
 * cache que encontraba. **2,9 MB de entradas muertas que ya no pedia
 * nadie**, y otro tanto en cada despliegue siguiente, para siempre, en el
 * movil de quien usa la aplicacion todos los dias.
 *
 * No causaba versiones mezcladas: una URL con sello nuevo no esta en la
 * cache, se pide a la red y llega bien. Lo que se rompia era la limpieza.
 *
 * El disparador correcto es el sello del HTML, que es lo unico que cambia
 * de verdad en un despliegue -- y la navegacion ya lo trae de la red.
 */
function sincronizarCache(html) {
  var vigente = cacheDeSello(selloDe(html));
  var esperados = recursosDe(html).length;
  // Existir no basta: una llenada anterior pudo cortarse a medias (sin red,
  // pestana cerrada). Se comprueba el RECUENTO, asi se cura sola.
  return caches.open(vigente).then(function (cache) {
    return cache.keys().then(function (k) { return k.length >= esperados; });
  }).then(function (completa) {
    var llenar = completa ? Promise.resolve() : caches.open(vigente).then(function (cache) {
      // De uno en uno y tolerando fallos sueltos: addAll es todo-o-nada y
      // un solo recurso caido dejaria al usuario sin offline sin avisar.
      return Promise.all(recursosDe(html).map(function (u) {
        if (u === "./") return null;
        return cache.add(u)["catch"](function () { return null; });
      }));
    });
    return llenar.then(function () {
      return caches.keys().then(function (nombres) {
        return Promise.all(nombres.map(function (n) {
          if (n === CACHE_FUENTES || n.indexOf(PREFIJO) !== 0 || n === vigente) return null;
          return caches["delete"](n);
        }));
      });
    });
  });
}
self.addEventListener("install", function (e) {
  e.waitUntil(
    // `cache: "reload"` para que el propio index.html no venga de la cache
    // HTTP del navegador: si viniera viejo, se precachearia la version
    // anterior entera y el despliegue nuevo no llegaria nunca.
    fetch("./", { cache: "reload" })
      .then(function (r) {
        // El clon se saca ANTES de leer el cuerpo. Al reves no funciona: el
        // cuerpo de una Response se consume una sola vez, asi que llamar a
        // clone() despues de text() lanza y la instalacion entera se cae en
        // silencio -- la cache se creaba con el nombre correcto y con CERO
        // entradas. Medido en produccion el 2026-09-07.
        var copia = r.clone();
        return r.text().then(function (html) { return { copia: copia, html: html }; });
      })
      .then(function (x) {
        var nombre = PREFIJO + selloDe(x.html);
        return caches.open(nombre).then(function (cache) {
          return cache.put("./", x.copia)
            .then(function () {
              // addAll es todo-o-nada: si un solo recurso falla, no se
              // instala nada y el usuario se queda sin offline sin saberlo.
              // Se cachean de uno en uno y se toleran los fallos sueltos.
              return Promise.all(recursosDe(x.html).map(function (u) {
                if (u === "./") return null;
                return cache.add(u)["catch"](function () { return null; });
              }));
            });
        });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    fetch("./", { cache: "reload" })
      .then(function (r) { return r.text(); })
      .then(function (html) { return PREFIJO + selloDe(html); })
      ["catch"](function () { return null; })
      .then(function (vigente) {
        return caches.keys().then(function (nombres) {
          return Promise.all(nombres.map(function (n) {
            if (n === CACHE_FUENTES) return null;
            if (n.indexOf(PREFIJO) !== 0) return null;
            // Sin red no se sabe cual es la vigente: no se borra nada.
            if (!vigente || n === vigente) return null;
            return caches["delete"](n);
          }));
        });
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Cuentas y sincronizacion NUNCA se cachean.
  if (url.hostname.indexOf("supabase") !== -1) return;

  // La entrada: red primero, cache como red de seguridad.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(function (r) {
          // Dos clones: uno para guardar la entrada y otro para LEER el
          // sello. El cuerpo de una Response se consume una sola vez.
          var paraCache = r.clone(), paraSello = r.clone();
          e.waitUntil(
            paraSello.text().then(function (html) {
              return caches.open(cacheDeSello(selloDe(html))).then(function (c) {
                return c.put("./", paraCache);
              }).then(function () { return sincronizarCache(html); });
            })["catch"](function () { return null; })
          );
          return r;
        })
        ["catch"](function () {
          return caches.match("./").then(function (c) {
            return c || new Response(
              "<!doctype html><meta charset=utf-8><title>Sin conexion</title>" +
              "<body style=\"font-family:system-ui;padding:2rem;max-width:32rem;margin:auto\">" +
              "<h1>Sin conexion</h1><p>Abre la aplicacion una vez con datos o wifi y " +
              "a partir de ahi funcionara tambien sin cobertura.</p>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } });
          });
        })
    );
    return;
  }

  // Recurso con sello: inmutable, cache primero y sin revalidar.
  if (url.search.indexOf("v=") !== -1 && url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r && r.ok) {
            // A la cache de SU PROPIO sello. Antes iba "a la primera cache
            // onh- que hubiera", que tras un despliegue era la VIEJA: por eso
            // acababa con dos generaciones de ficheros dentro.
            var copia = r.clone();
            var sello = (url.search.match(/v=([0-9a-z]+)/) || [])[1];
            if (sello) {
              caches.open(cacheDeSello(sello)).then(function (c) { c.put(req, copia); });
            }
          }
          return r;
        });
      })
    );
    return;
  }

  // Tipografias de Google y el SDK de Supabase: URLs ya versionadas por
  // quien las publica, asi que valen las mismas reglas que un recurso con
  // sello propio.
  //
  // El SDK importa mas de lo que parece. Sin el, getSupabaseClient()
  // devuelve null y la aplicacion contesta "las cuentas todavia no estan
  // disponibles en este sitio" -- que sin red es sencillamente falso: lo que
  // falta es la conexion, no la funcion. Guardandolo, quien ya entro una vez
  // conserva su sesion sin cobertura.
  if (url.hostname.indexOf("fonts.googleapis.com") !== -1 ||
      url.hostname.indexOf("fonts.gstatic.com") !== -1 ||
      url.hostname.indexOf("cdn.jsdelivr.net") !== -1) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r && (r.ok || r.type === "opaque")) {
            var copia = r.clone();
            caches.open(CACHE_FUENTES).then(function (c) { c.put(req, copia); });
          }
          return r;
        })["catch"](function () { return hit; });
      })
    );
    return;
  }

  // Todo lo demas (icono, manifiesto...): red, y cache si la red no esta.
  e.respondWith(
    fetch(req)["catch"](function () { return caches.match(req); })
  );
});

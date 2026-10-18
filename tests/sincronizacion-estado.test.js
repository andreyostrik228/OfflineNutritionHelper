/**
 * tests/sincronizacion-estado.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Estado de la cuenta al entrar (pasos 14 y 15). Mientras se lee la nube
 * aparece un texto, no una pantalla vacía; si la lectura o el guardado
 * fallan, el aviso lo dice con palabras de usuario, sin códigos ni detalles
 * técnicos. Comprobación estática: cada texto existe en es, en, ru y uk, y
 * el código lo muestra en el momento correcto.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");

function projPath(rel) { return path.join(__dirname, "..", rel); }

function leer(rel) {
  return fs.readFileSync(projPath(rel), "utf8").replace(/\r\n/g, "\n");
}

var IDIOMAS = ["es", "en", "ru", "uk"];
var CLAVES = [
  "ui.auth_entrando",
  "ui.auth_creando_cuenta",
  "ui.sync_sincronizando",
  "ui.sync_nube_no_disponible",
  "ui.sync_no_se_guardo",
  "ui.nube_fallo_guardado"
];

/** El valor de una clave en una tabla de i18n, o null si no está. */
function valorDe(tabla, clave) {
  var m = new RegExp('"' + clave.replace(/\./g, "\\.") + '": "([^"]*)"').exec(tabla);
  return m ? m[1] : null;
}

function run(t) {

  t.test("cada texto nuevo existe en es, en, ru y uk, y no está vacío", function () {
    IDIOMAS.forEach(function (lang) {
      var tabla = leer("js/i18n/" + lang + ".js");
      CLAVES.forEach(function (clave) {
        var v = valorDe(tabla, clave);
        assert.ok(v !== null, clave + " falta en " + lang);
        assert.ok(v.trim().length > 0, clave + " está vacía en " + lang);
      });
    });
  });

  t.test("en ruso y ucraniano los textos no son el español copiado tal cual", function () {
    var es = leer("js/i18n/es.js");
    ["ru", "uk"].forEach(function (lang) {
      var tabla = leer("js/i18n/" + lang + ".js");
      CLAVES.forEach(function (clave) {
        assert.notStrictEqual(valorDe(tabla, clave), valorDe(es, clave), clave + " en " + lang + " es el español");
      });
    });
  });

  t.test("el banner de la cuenta existe en la página: role=status y oculto al cargar", function () {
    var html = leer("index.html");
    assert.ok(/<p class="sync-banner" id="syncBanner" role="status" hidden><\/p>/.test(html),
      "falta el banner #syncBanner con role=status, oculto al cargar");
  });

  t.test("el texto de sincronización sale antes de leer la nube (no hay pantalla vacía)", function () {
    var src = leer("js/ui/render-auth.js");
    var muestra = src.indexOf('showSyncBanner(t("ui.sync_sincronizando"))');
    var lee = src.indexOf("runReconciliation().then(");
    assert.ok(muestra !== -1 && lee !== -1 && muestra < lee,
      "el texto de sincronización tiene que mostrarse antes de runReconciliation()");
  });

  t.test("el formulario y el botón de Google muestran su texto de espera mientras responde Firebase", function () {
    var src = leer("js/ui/render-auth.js");
    assert.ok(src.indexOf('showAuthNotice(t("ui.auth_entrando"))') !== -1,
      "falta el texto de espera del inicio de sesión con Google");
    assert.ok(src.indexOf('showAuthNotice(t(_authMode === "register" ? "ui.auth_creando_cuenta" : "ui.auth_entrando"))') !== -1,
      "falta el texto de espera del formulario (entrar o crear cuenta)");
  });

  t.test("si la nube no se lee o no guarda, el aviso sale aunque la promesa falle, y dice qué pasa con los datos", function () {
    var src = leer("js/ui/render-auth.js");
    assert.ok(src.indexOf('if (status === "cloud_unavailable") showSyncBanner(t("ui.sync_nube_no_disponible")') !== -1,
      "la lectura fallida tiene su aviso");
    assert.ok(src.indexOf('else if (status === "push_failed") showSyncBanner(t("ui.sync_no_se_guardo")') !== -1,
      "el guardado fallido tiene su aviso");
    assert.ok(src.indexOf('mostrarResultadoSync("cloud_unavailable");') !== -1,
      "si la promesa rechaza, el banner no se queda en 'Sincronizando…'");
    IDIOMAS.forEach(function (lang) {
      var tabla = leer("js/i18n/" + lang + ".js");
      ["ui.sync_nube_no_disponible", "ui.sync_no_se_guardo", "ui.nube_fallo_guardado"].forEach(function (clave) {
        assert.ok(!/HTTP|auth\/|sin_token|Error|\b\d{3}\b/.test(valorDe(tabla, clave)),
          clave + " en " + lang + " no debe llevar detalles técnicos");
      });
    });
  });
  t.test("un fallo de escritura en uso normal llega al banner, y un guardado correcto posterior lo quita", function () {
    var render = leer("js/ui/render-auth.js");
    var nube = leer("js/core/cloud-sync.js");
    assert.ok(render.indexOf("onCloudWriteStatus(alResultadoEscritura)") !== -1, "render-auth se suscribe a las escrituras");
    assert.ok(nube.indexOf("_notificarEscritura(false)") !== -1, "cloud-sync avisa cuando la escritura se rinde");
    assert.ok(nube.indexOf("_notificarEscritura(true)") !== -1, "cloud-sync avisa cuando una escritura llega");
    assert.ok(render.indexOf('showSyncBanner(t("ui.nube_fallo_guardado"), true)') !== -1, "el fallo muestra el texto de escritura");
  });
}

module.exports = { run: run };

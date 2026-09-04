/**
 * js/ui/render-auth.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de presentación de cuentas: botón de perfil, diálogo de acceso
 * (email+contraseña / "Continuar con Google" / alternar registro), menú
 * de usuario autenticado, y el diálogo de resolución de conflicto de
 * migración. Es también el ÚNICO módulo que decide CUÁNDO reconciliar
 * datos (js/core/migration.js) en respuesta a los eventos de
 * onAuthStateChange (js/core/auth.js) -- ni auth.js ni migration.js se
 * llaman entre sí directamente, esta es la capa que los conecta,
 * exactamente igual que app.js conecta pantry.js con render-pantry.js sin
 * que ninguno de los dos módulos de dominio se conozca entre sí.
 *
 * Reconciliación: se dispara en 'SIGNED_IN'/'INITIAL_SESSION' (una sola
 * vez por usuario que aparece -- ver _reconciledForUserId), nunca en
 * 'TOKEN_REFRESHED' (eso no es un nuevo inicio de sesión, y volver a
 * tirar de la nube ahí podría pisar una edición local que aún no se
 * había empujado). Si el resultado es 'conflict', se abre el diálogo de
 * elección; en cualquier otro caso, o tras resolver el conflicto, se
 * llama a `authOnDataReconciled` (inyectado desde app.js) para que la
 * despensa/el formulario visibles se refresquen con los datos ya
 * reconciliados -- este módulo no sabe pintar la despensa ni el
 * formulario, solo avisa de que cambiaron.
 *
 * Sin componente de diálogo/modal previo en el proyecto -- se usa
 * `<dialog>` nativo (.showModal()/.close()), mismo principio que ya
 * sigue `.disclosure` (envolver <details> nativo en vez de un widget
 * hecho a mano), con una reserva por si el navegador no soporta
 * showModal() (fallback a mostrar/ocultar sin backdrop).
 *
 * Depende de:
 *   js/core/auth.js       (isAuthAvailable, getCurrentUser, onAuthStateChange,
 *                           signUpWithEmail, signInWithEmail, signInWithGoogle,
 *                           signOut, authErrorMessage)
 *   js/core/migration.js  (runReconciliation, resolveConflictKeepCloud,
 *                           resolveConflictKeepLocal, resolveConflictMerge,
 *                           onAuthSignOut)
 *   js/core/utils.js      (escapeHtml)
 *
 * Inicialización obligatoria:
 *   Llamar a initAuthRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initAuthRefs(refs)
 * ─────────────────────────────────────────────────────────────────────────
 */

var authProfileBtn, authProfileLabel, authUserMenu, authUserEmailEl, authLogoutBtn;
var authDialogEl, authDialogTitle, authDialogCloseBtn;
var authGoogleBtn, authEmailForm, authEmailInput, authPasswordInput, authErrorEl, authNoticeEl,
    authPassword2Field, authPassword2Input, authPasswordHint,
    authEmailField, authPasswordField, authForgotRow, authForgotBtn, authSwitchRow,
    authSubmitBtn, authSwitchPrompt, authSwitchModeBtn, authUnavailableBox, authAvailableBox;
var authConflictDialogEl, authConflictKeepCloudBtn, authConflictMergeBtn, authConflictKeepLocalBtn;
var authDeleteAccountBtn, authDeleteDialogEl, authDeleteConfirmBtn, authDeleteCancelBtn, authDeleteErrorEl;
var authDeleteConfirmInput;
// La palabra que hay que teclear para poder borrar. En mayúsculas y sin
// acentos a propósito: tiene que poder escribirse en cualquier teclado.
var AUTH_DELETE_WORD = "BORRAR";

var authOnDataReconciled; // callback de app.js -- ver cabecera del archivo
var _authMode = "login"; // 'login' | 'register'
var _reconciledForUserId = null;
var _pendingConflictCloudRow = null;

/**
 * @param {object} refs - todos los nodos DOM que este módulo necesita
 * @param {function} [refs.onDataReconciled] - se llama cuando pull/push/
 *   merge cambian los datos locales, para que app.js refresque la
 *   despensa/el formulario visibles
 */
function initAuthRefs(refs) {
  authProfileBtn      = refs.authProfileBtn;
  authProfileLabel    = refs.authProfileLabel;
  authUserMenu        = refs.authUserMenu;
  authUserEmailEl     = refs.authUserEmailEl;
  authLogoutBtn       = refs.authLogoutBtn;

  authDialogEl        = refs.authDialogEl;
  authDialogTitle     = refs.authDialogTitle;
  authDialogCloseBtn  = refs.authDialogCloseBtn;
  authGoogleBtn       = refs.authGoogleBtn;
  authEmailForm       = refs.authEmailForm;
  authEmailInput      = refs.authEmailInput;
  authPasswordInput   = refs.authPasswordInput;
  authPassword2Field  = refs.authPassword2Field;
  authPassword2Input  = refs.authPassword2Input;
  authPasswordHint    = refs.authPasswordHint;
  authEmailField      = refs.authEmailField;
  authPasswordField   = refs.authPasswordField;
  authForgotRow       = refs.authForgotRow;
  authForgotBtn       = refs.authForgotBtn;
  authSwitchRow       = refs.authSwitchRow;
  authErrorEl         = refs.authErrorEl;
  authNoticeEl        = refs.authNoticeEl;
  authSubmitBtn       = refs.authSubmitBtn;
  authSwitchPrompt    = refs.authSwitchPrompt;
  authSwitchModeBtn   = refs.authSwitchModeBtn;
  authUnavailableBox  = refs.authUnavailableBox;
  authAvailableBox    = refs.authAvailableBox;

  authConflictDialogEl        = refs.authConflictDialogEl;
  authConflictKeepCloudBtn    = refs.authConflictKeepCloudBtn;
  authConflictMergeBtn        = refs.authConflictMergeBtn;
  authConflictKeepLocalBtn    = refs.authConflictKeepLocalBtn;

  authDeleteAccountBtn = refs.authDeleteAccountBtn;
  authDeleteDialogEl   = refs.authDeleteDialogEl;
  authDeleteConfirmBtn = refs.authDeleteConfirmBtn;
  authDeleteCancelBtn  = refs.authDeleteCancelBtn;
  authDeleteErrorEl    = refs.authDeleteErrorEl;
  authDeleteConfirmInput = refs.authDeleteConfirmInput;

  authOnDataReconciled = typeof refs.onDataReconciled === "function" ? refs.onDataReconciled : function () {};

  var available = (typeof isAuthAvailable === "function") && isAuthAvailable();
  if (authUnavailableBox) authUnavailableBox.hidden = available;
  if (authAvailableBox)   authAvailableBox.hidden = !available;

  // Pinta el botón de perfil de inmediato ("Invitado" si Supabase no está
  // configurado, o mientras llega el primer evento de sesión) -- sin esto
  // se quedaría en "…" para siempre cuando no hay cliente, porque
  // handleAuthStateChange (la única otra vía que pinta el botón) solo se
  // dispara si _ensureSubscribed() logra suscribirse de verdad (auth.js).
  renderProfileButton(available ? getCurrentUser() : null);

  if (authProfileBtn)     authProfileBtn.addEventListener("click", handleProfileBtnClick);
  if (authDialogCloseBtn) authDialogCloseBtn.addEventListener("click", closeAuthDialog);
  if (authGoogleBtn)      authGoogleBtn.addEventListener("click", handleGoogleClick);
  if (authEmailForm)      authEmailForm.addEventListener("submit", handleEmailFormSubmit);
  if (authSwitchModeBtn)  authSwitchModeBtn.addEventListener("click", handleSwitchMode);
  if (authForgotBtn)      authForgotBtn.addEventListener("click", function () {
    clearAuthFeedback();
    setAuthMode("recover");
  });
  if (authLogoutBtn)      authLogoutBtn.addEventListener("click", handleLogoutClick);
  if (authDeleteAccountBtn) authDeleteAccountBtn.addEventListener("click", openDeleteAccountDialog);
  if (authDeleteCancelBtn)  authDeleteCancelBtn.addEventListener("click", closeDeleteAccountDialog);
  if (authDeleteConfirmBtn) authDeleteConfirmBtn.addEventListener("click", handleDeleteAccountConfirm);
  if (authDeleteConfirmInput) authDeleteConfirmInput.addEventListener("input", syncDeleteGate);

  if (authConflictKeepCloudBtn) authConflictKeepCloudBtn.addEventListener("click", function () { handleConflictChoice("cloud"); });
  if (authConflictMergeBtn)     authConflictMergeBtn.addEventListener("click", function () { handleConflictChoice("merge"); });
  if (authConflictKeepLocalBtn) authConflictKeepLocalBtn.addEventListener("click", function () { handleConflictChoice("local"); });

  document.addEventListener("click", function (event) {
    if (!authUserMenu || authUserMenu.hidden) return;
    if (authUserMenu.contains(event.target) || (authProfileBtn && authProfileBtn.contains(event.target))) return;
    authUserMenu.hidden = true;
  });

  if (typeof onAuthStateChange === "function") {
    onAuthStateChange(handleAuthStateChange);
  } else {
    renderProfileButton(null);
  }
}

// ── Reacción a cambios de sesión ─────────────────────────────────────────

function handleAuthStateChange(event, user) {
  renderProfileButton(user);

  // ── Se vuelve del enlace del correo ────────────────────────────────────
  //
  // El SDK ya ha canjeado el token y HAY SESION. Sin interceptarlo aqui, el
  // usuario entraria como si hubiera iniciado sesion normalmente y seguiria
  // sin saber su contrasena: pidio recuperarla y acabaria dentro sin
  // haberla cambiado. Asi que se le pide la nueva antes de nada.
  //
  // Va ANTES del bloque de SIGNED_IN/INITIAL_SESSION a proposito: ahi se
  // lanza el cuestionario y la reconciliacion con la nube, y ninguna de las
  // dos cosas es lo que toca en mitad de un cambio de contrasena.
  //
  // El dialogo se abre con showModal(), que lo pone en la capa superior del
  // navegador -- por encima de la bienvenida (z-index 200) y del recorrido
  // (210). Importa: se vuelve del correo con una CARGA NUEVA de la pagina,
  // y a un invitado la bienvenida le sale siempre. Sin la capa superior,
  // esto quedaria tapado justo cuando hace falta.
  if (event === "PASSWORD_RECOVERY") {
    if (authDialogEl && !authDialogEl.open) {
      if (typeof authDialogEl.showModal === "function") authDialogEl.showModal();
      else authDialogEl.setAttribute("open", "");
    }
    clearAuthFeedback();
    setAuthMode("reset");
    showAuthNotice("Escribe una contraseña nueva para tu cuenta.");
    return;
  }

  if (!user) {
    _reconciledForUserId = null;
    if (event === "SIGNED_OUT") {
      if (typeof onAuthSignOut === "function") {
        onAuthSignOut();
        authOnDataReconciled();
      }
      // Sin cuenta, la bienvenida vuelve (ver nextOnboardingStep). Aquí y
      // no solo en la siguiente carga: al borrar la cuenta el usuario se
      // quedaba mirando la aplicación como si nada hubiera pasado, cuando
      // acababa de dejar de tener cuenta y de perder su perfil. Que
      // reaparezca es la confirmación visible de que ha ocurrido.
      if (typeof initOnboarding === "function") {
        initOnboarding({ hasProfile: false });
      }
    }
    return;
  }

  if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && _reconciledForUserId !== user.id) {
    _reconciledForUserId = user.id;
    closeAuthDialog();
    // Se ACABA de iniciar sesión: toca el cuestionario, sin importar por
    // dónde haya entrado (bienvenida, botón de la cabecera, vuelta de
    // Google...). Ver startIntakeAfterSignIn() en js/ui/onboarding-ui.js.
    //
    // SIGNED_IN y no INITIAL_SESSION: el segundo es "ya había sesión y se
    // ha restaurado al cargar la página", y preguntar ahí sacaría el
    // cuestionario en cada recarga a quien tiene cuenta -- justo lo que se
    // acaba de arreglar en sentido contrario.
    // Se intenta en LOS DOS eventos, no solo en SIGNED_IN.
    //
    // Al volver de un inicio de sesión con Google, el primero que llega es
    // INITIAL_SESSION -- la sesión ya viene hecha en la recarga -- y este
    // bloque solo se ejecuta una vez por usuario, así que el SIGNED_IN
    // posterior ya no entra. Colgarlo solo de SIGNED_IN dejaba fuera
    // justo el camino de Google, que es por donde entra el usuario.
    //
    // Quién decide ahora es startIntakeAfterSignIn(): mira si consta que
    // el usuario PIDIÓ entrar (una marca que sobrevive al redirect). Si no
    // consta, esto es una sesión restaurada sin más y no se pregunta nada.
    var haEmpezadoElCuestionario = false;
    if (typeof startIntakeAfterSignIn === "function") {
      haEmpezadoElCuestionario = startIntakeAfterSignIn() === true;
    }
    if (!haEmpezadoElCuestionario && typeof dismissWelcomeIfSignedIn === "function") {
      dismissWelcomeIfSignedIn();
    }
    if (typeof runReconciliation !== "function") return;
    runReconciliation().then(function (result) {
      if (result.status === "conflict") {
        _pendingConflictCloudRow = result.cloudRow;
        openConflictDialog();
      } else {
        authOnDataReconciled();
      }
    });
  }
}

// ── Botón de perfil / menú ────────────────────────────────────────────────

function renderProfileButton(user) {
  if (!authProfileLabel) return;

  if (!(typeof isAuthAvailable === "function" && isAuthAvailable())) {
    authProfileLabel.textContent = "Invitado";
    if (authUserMenu) authUserMenu.hidden = true;
    return;
  }

  if (user) {
    var name = (user.user_metadata && user.user_metadata.full_name) ? user.user_metadata.full_name : user.email;
    authProfileLabel.textContent = name || "Mi cuenta";
    if (authUserEmailEl) authUserEmailEl.textContent = user.email || "";
  } else {
    authProfileLabel.textContent = "Iniciar sesión";
    if (authUserMenu) authUserMenu.hidden = true;
  }
}

function handleProfileBtnClick() {
  var user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (user) {
    if (authUserMenu) authUserMenu.hidden = !authUserMenu.hidden;
    return;
  }
  openAuthDialog();
}

function handleLogoutClick() {
  if (authUserMenu) authUserMenu.hidden = true;
  if (typeof signOut !== "function") return;
  signOut(); // onAuthStateChange('SIGNED_OUT') hace el resto (ver handleAuthStateChange)
}

// ── Borrar la cuenta ─────────────────────────────────────────────────────
// Lo prometen las condiciones de uso ("entra en tu menú de usuario y pulsa
// Borrar mi cuenta"), así que este botón no es un extra: es la forma en que
// esta aplicación cumple el derecho a que borren tus datos. Ver
// js/core/auth.js (deleteOwnAccount) y supabase/delete-account.sql.

function openDeleteAccountDialog() {
  if (authUserMenu) authUserMenu.hidden = true;
  if (!authDeleteDialogEl) return;
  if (authDeleteErrorEl) authDeleteErrorEl.hidden = true;
  if (authDeleteConfirmInput) authDeleteConfirmInput.value = "";
  if (authDeleteConfirmBtn) {
    authDeleteConfirmBtn.textContent = "Borrar mi cuenta para siempre";
  }
  syncDeleteGate();
  if (typeof authDeleteDialogEl.showModal === "function") {
    authDeleteDialogEl.showModal();
  } else {
    authDeleteDialogEl.setAttribute("open", "");
  }
}

/**
 * El botón de borrar solo se enciende cuando la palabra está escrita.
 *
 * Dos toques seguidos eran pocos para lo único irreversible que hay aquí:
 * el "sí" caía casi donde estaba el botón del menú, así que se podía
 * llegar al final sin leer una línea. Teclear obliga a detenerse, y de
 * paso hace imposible borrar la cuenta con un toque accidental en el
 * bolsillo.
 */
function syncDeleteGate() {
  if (!authDeleteConfirmBtn) return;
  var escrito = authDeleteConfirmInput ? String(authDeleteConfirmInput.value || "") : "";
  var vale = escrito.trim().toUpperCase() === AUTH_DELETE_WORD;
  authDeleteConfirmBtn.disabled = !vale;
}

function closeDeleteAccountDialog() {
  if (!authDeleteDialogEl) return;
  if (typeof authDeleteDialogEl.close === "function" && authDeleteDialogEl.open) {
    authDeleteDialogEl.close();
  } else {
    authDeleteDialogEl.removeAttribute("open");
  }
}

function handleDeleteAccountConfirm() {
  if (typeof deleteOwnAccount !== "function") return;

  // Se vuelve a comprobar aquí, no solo en el `disabled` del botón: un
  // atributo se puede quitar desde la consola, y esto no tiene deshacer.
  var escrito = authDeleteConfirmInput ? String(authDeleteConfirmInput.value || "") : "";
  if (escrito.trim().toUpperCase() !== AUTH_DELETE_WORD) {
    syncDeleteGate();
    return;
  }

  // Se bloquea el botón antes de empezar: un doble clic mandaría dos
  // borrados, y el segundo llegaría cuando la sesión ya no existe --
  // fallaría, y el usuario vería un error rojo justo después de que todo
  // haya salido bien.
  if (authDeleteConfirmBtn) {
    authDeleteConfirmBtn.disabled = true;
    authDeleteConfirmBtn.textContent = "Borrando…";
  }
  if (authDeleteErrorEl) authDeleteErrorEl.hidden = true;

  deleteOwnAccount().then(function (result) {
    if (result && result.error) {
      if (authDeleteErrorEl) {
        authDeleteErrorEl.textContent = (typeof authErrorMessage === "function")
          ? authErrorMessage(result.error)
          : "No se pudo borrar la cuenta.";
        authDeleteErrorEl.hidden = false;
      }
      if (authDeleteConfirmBtn) {
        authDeleteConfirmBtn.disabled = false;
        authDeleteConfirmBtn.textContent = "Sí, borrar mi cuenta";
      }
      return;
    }
    // deleteOwnAccount() ya ha cerrado la sesión, así que
    // onAuthStateChange('SIGNED_OUT') se encarga de volver a modo invitado
    // y de limpiar la copia local (migration.js). Aquí solo se cierra el
    // diálogo.
    closeDeleteAccountDialog();
  });
}

// ── Diálogo de acceso ─────────────────────────────────────────────────────

/**
 * @param {"login"|"register"} [mode] - por defecto "login", que es como se
 *   llamaba desde el botón de perfil desde siempre. El parámetro lo añadió
 *   la pantalla de bienvenida (js/ui/onboarding-ui.js), donde "Crear una
 *   cuenta" y "Ya tengo cuenta" son dos botones distintos y abrir siempre
 *   en "iniciar sesión" obligaría a cambiar de modo a mano justo después
 *   de haber dicho cuál querías.
 */
function openAuthDialog(mode) {
  if (!authDialogEl) return;
  // Abrir esto es siempre una petición deliberada de entrar. Sirve para
  // que el alta sepa distinguirla de una sesión que Supabase restaura
  // sola al cargar la página -- las dos llegan como SIGNED_IN.
  if (typeof markSignInRequested === "function") markSignInRequested();
  setAuthMode(mode === "register" ? "register" : "login");
  clearAuthFeedback();
  if (typeof authDialogEl.showModal === "function") {
    authDialogEl.showModal();
  } else {
    authDialogEl.setAttribute("open", "");
  }
}

function closeAuthDialog() {
  if (!authDialogEl) return;
  if (typeof authDialogEl.close === "function" && authDialogEl.open) {
    authDialogEl.close();
  } else {
    authDialogEl.removeAttribute("open");
  }
}

/** Mínimo que exige Supabase por defecto. Se comprueba AQUÍ además de en
 *  el servidor: el formulario es `novalidate`, así que el `minlength` del
 *  HTML no lo aplica nadie, y una contraseña corta viajaba hasta Supabase
 *  para volver como un error en inglés. */
var AUTH_MIN_PASSWORD = 6;

/**
 * Cuatro estados, un solo formulario.
 *
 *   login     email + contrasena
 *   register  email + contrasena + repetir
 *   recover   SOLO email -- "mandame el enlace"
 *   reset     SOLO contrasena + repetir -- al volver del correo
 *
 * Todo se decide aqui, en un sitio, en vez de repartir `hidden` por los
 * manejadores: con cuatro modos y seis trozos que aparecen y desaparecen,
 * el reparto es como se acaba llegando a un formulario que pide la
 * contrasena para mandarte un enlace.
 */
function setAuthMode(mode) {
  _authMode = mode;
  var isRegister = mode === "register";
  var isRecover  = mode === "recover";
  var isReset    = mode === "reset";

  var titulo = isRegister ? "Crear cuenta"
             : isRecover  ? "Recuperar contraseña"
             : isReset    ? "Elige una contraseña nueva"
             : "Iniciar sesión";
  var boton  = isRegister ? "Crear cuenta"
             : isRecover  ? "Enviar enlace"
             : isReset    ? "Guardar contraseña"
             : "Iniciar sesión";

  if (authDialogTitle) authDialogTitle.textContent = titulo;
  if (authSubmitBtn)   authSubmitBtn.textContent = boton;

  // El email no se pide al poner la contrasena nueva: ahi ya se sabe quien
  // eres (hay sesion), y volver a pedirlo solo da ocasion de equivocarse.
  if (authEmailField)    authEmailField.hidden = isReset;
  // La contrasena no se pide para MANDAR el enlace, que es justo lo que
  // se pide cuando no se recuerda.
  if (authPasswordField) authPasswordField.hidden = isRecover;
  // Repetirla, solo donde se escribe una nueva.
  if (authPassword2Field) authPassword2Field.hidden = !(isRegister || isReset);
  if (authPasswordHint)   authPasswordHint.hidden   = !(isRegister || isReset);
  // Y el enlace de "la he olvidado" solo al iniciar sesion: en el resto de
  // pasos o no hay contrasena todavia, o se esta poniendo una.
  if (authForgotRow) authForgotRow.hidden = (mode !== "login");

  if (authSwitchPrompt)  authSwitchPrompt.textContent = isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
  if (authSwitchModeBtn) authSwitchModeBtn.textContent = isRegister ? "Iniciar sesión" : "Crear cuenta";
  // Desde "recover" lo util es volver, no crear otra cuenta.
  if (authSwitchModeBtn && isRecover) authSwitchModeBtn.textContent = "Volver a iniciar sesión";
  if (authSwitchPrompt && isRecover)  authSwitchPrompt.textContent = "";
  // Al poner la contrasena nueva no hay a donde ir: primero se guarda.
  if (authSwitchRow) authSwitchRow.hidden = isReset;

  // Se vacia lo que deja de verse: un campo oculto con algo escrito dentro
  // acaba viajando en un envio que nadie esperaba.
  if (authPassword2Input && !(isRegister || isReset)) authPassword2Input.value = "";
  if (authPasswordInput && isRecover) authPasswordInput.value = "";

  // `autocomplete` correcto para cada modo. No es cosmetico: con
  // "current-password" el gestor de contrasenas ofrece la GUARDADA cuando
  // lo que toca es inventar una nueva, y no se ofrece a generarla ni a
  // guardarla.
  if (authPasswordInput) {
    authPasswordInput.setAttribute("autocomplete",
      (isRegister || isReset) ? "new-password" : "current-password");
  }
}

function handleSwitchMode() {
  clearAuthFeedback();
  // Desde "recover" (y desde cualquier modo que no sea registro) el destino
  // util es iniciar sesion, no crear otra cuenta.
  setAuthMode(_authMode === "register" ? "login"
            : _authMode === "recover"  ? "login"
            : "register");
}

function clearAuthFeedback() {
  if (authErrorEl)  { authErrorEl.hidden = true; authErrorEl.textContent = ""; }
  if (authNoticeEl) { authNoticeEl.hidden = true; authNoticeEl.textContent = ""; }
}

function showAuthError(message) {
  if (!authErrorEl || !message) return;
  authErrorEl.textContent = message;
  authErrorEl.hidden = false;
}

function showAuthNotice(message) {
  if (!authNoticeEl || !message) return;
  authNoticeEl.textContent = message;
  authNoticeEl.hidden = false;
}

function setAuthBusy(busy) {
  if (authSubmitBtn) authSubmitBtn.disabled = busy;
  if (authGoogleBtn) authGoogleBtn.disabled = busy;
}

function handleGoogleClick() {
  clearAuthFeedback();
  if (typeof signInWithGoogle !== "function") return;
  setAuthBusy(true);
  signInWithGoogle().then(function (result) {
    // Un signInWithOAuth con éxito normalmente ya redirigió la página
    // entera antes de que esto llegue a ejecutarse -- si llegamos aquí
    // con error, es que ni siquiera pudo iniciar la redirección.
    setAuthBusy(false);
    if (result.error) showAuthError(authErrorMessage(result.error));
  });
}

/**
 * Quita de la URL el token que trae el enlace del correo.
 *
 * Supabase lo deja en el hash (`#access_token=...&type=recovery`). Si se
 * queda ahi: se guarda en el historial, viaja si alguien comparte el
 * enlace, y al recargar vuelve a disparar PASSWORD_RECOVERY -- volviendo a
 * pedir una contrasena nueva a quien acaba de ponerla.
 *
 * `replaceState` y no `location.hash = ""`: lo segundo recarga y anade una
 * entrada al historial, y este proyecto ya sabe lo que cuesta una recarga
 * inesperada a mitad de un flujo (ver HANDOFF.md 7.1).
 */
function _limpiarTokenDeLaUrl() {
  try {
    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  } catch (err) { /* sin historial manipulable, el token se queda: no es fatal */ }
}

function handleEmailFormSubmit(event) {
  event.preventDefault();
  clearAuthFeedback();

  var email = authEmailInput ? authEmailInput.value.trim() : "";
  var password = authPasswordInput ? authPasswordInput.value : "";

  // ── "Mandame el enlace" ────────────────────────────────────────────────
  if (_authMode === "recover") {
    if (!email) { showAuthError("Introduce tu email."); return; }
    setAuthBusy(true);
    sendPasswordReset(email).then(function (result) {
      setAuthBusy(false);
      if (result.error) { showAuthError(authErrorMessage(result.error)); return; }
      // A proposito NO se dice si ese email tiene cuenta: contestarlo
      // convertiria esto en una forma de averiguar quien esta registrado.
      showAuthNotice("Si esa dirección tiene cuenta, te llega un correo con un enlace. " +
                     "Ábrelo en este mismo móvil y podrás poner una contraseña nueva.");
    });
    return;
  }

  // ── "Pon una contrasena nueva" (se vuelve del correo) ──────────────────
  if (_authMode === "reset") {
    var nueva = password;
    var nueva2 = authPassword2Input ? authPassword2Input.value : "";
    if (!nueva) { showAuthError("Escribe la contraseña nueva."); return; }
    if (nueva.length < AUTH_MIN_PASSWORD) {
      showAuthError("La contraseña necesita al menos " + AUTH_MIN_PASSWORD + " caracteres.");
      return;
    }
    if (nueva !== nueva2) {
      showAuthError("Las dos contraseñas no coinciden.");
      if (authPassword2Input) { authPassword2Input.value = ""; authPassword2Input.focus(); }
      return;
    }
    setAuthBusy(true);
    updatePassword(nueva).then(function (result) {
      setAuthBusy(false);
      if (result.error) { showAuthError(authErrorMessage(result.error)); return; }
      // La sesion ya esta activa (la creo el enlace), asi que aqui se acaba:
      // se limpia la URL para que el token no se quede en el historial ni
      // vuelva a dispararse al recargar.
      _limpiarTokenDeLaUrl();
      if (authPasswordInput)  authPasswordInput.value = "";
      if (authPassword2Input) authPassword2Input.value = "";
      showAuthNotice("Contraseña cambiada. Ya has entrado con ella.");
      window.setTimeout(closeAuthDialog, 1400);
    });
    return;
  }

  if (!email || !password) {
    showAuthError("Introduce email y contraseña.");
    return;
  }

  // Al CREAR cuenta se comprueba aquí, antes de salir a la red: un error
  // que puede verse sin preguntar a nadie no debería costar un viaje al
  // servidor ni volver traducido a medias.
  if (_authMode === "register") {
    if (password.length < AUTH_MIN_PASSWORD) {
      showAuthError("La contraseña necesita al menos " + AUTH_MIN_PASSWORD + " caracteres.");
      if (authPasswordInput) authPasswordInput.focus();
      return;
    }
    var password2 = authPassword2Input ? authPassword2Input.value : "";
    if (password !== password2) {
      // Escribir a ciegas una contraseña nueva y equivocarse deja fuera de
      // una cuenta recién creada, sin saber en qué se falló.
      showAuthError("Las dos contraseñas no coinciden.");
      if (authPassword2Input) { authPassword2Input.value = ""; authPassword2Input.focus(); }
      return;
    }
  }

  setAuthBusy(true);
  var action = _authMode === "register" ? signUpWithEmail : signInWithEmail;

  action(email, password).then(function (result) {
    setAuthBusy(false);

    if (result.error) {
      showAuthError(authErrorMessage(result.error));
      return;
    }

    // Registro con confirmación de email activada (por defecto en
    // Supabase): hay `user` pero SIN sesión activa todavía -- distinto de
    // un error, necesita su propio aviso en vez de cerrarse como si ya
    // hubiera iniciado sesión.
    if (_authMode === "register" && result.user && !result.user.email_confirmed_at) {
      showAuthNotice("Cuenta creada -- revisa tu correo para confirmarla antes de iniciar sesión.");
      return;
    }

    // Login (o registro sin confirmación de email requerida): el propio
    // onAuthStateChange('SIGNED_IN') cierra el diálogo y dispara la
    // reconciliación -- ver handleAuthStateChange.
  });
}

// ── Diálogo de conflicto de migración ────────────────────────────────────

function openConflictDialog() {
  if (!authConflictDialogEl) return;
  if (typeof authConflictDialogEl.showModal === "function") {
    authConflictDialogEl.showModal();
  } else {
    authConflictDialogEl.setAttribute("open", "");
  }
}

function closeConflictDialog() {
  if (!authConflictDialogEl) return;
  if (typeof authConflictDialogEl.close === "function" && authConflictDialogEl.open) {
    authConflictDialogEl.close();
  } else {
    authConflictDialogEl.removeAttribute("open");
  }
}

function handleConflictChoice(choice) {
  var cloudRow = _pendingConflictCloudRow;
  _pendingConflictCloudRow = null;

  var action;
  if (choice === "cloud") action = resolveConflictKeepCloud;
  else if (choice === "local") action = resolveConflictKeepLocal;
  else action = function () { return resolveConflictMerge(cloudRow); };

  if (typeof action !== "function") { closeConflictDialog(); return; }

  action().then(function () {
    closeConflictDialog();
    authOnDataReconciled();
  });
}

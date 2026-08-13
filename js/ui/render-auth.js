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
    authSubmitBtn, authSwitchPrompt, authSwitchModeBtn, authUnavailableBox, authAvailableBox;
var authConflictDialogEl, authConflictKeepCloudBtn, authConflictMergeBtn, authConflictKeepLocalBtn;

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
  if (authLogoutBtn)      authLogoutBtn.addEventListener("click", handleLogoutClick);

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

  if (!user) {
    _reconciledForUserId = null;
    if (event === "SIGNED_OUT" && typeof onAuthSignOut === "function") {
      onAuthSignOut();
      authOnDataReconciled();
    }
    return;
  }

  if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && _reconciledForUserId !== user.id) {
    _reconciledForUserId = user.id;
    closeAuthDialog();
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

// ── Diálogo de acceso ─────────────────────────────────────────────────────

function openAuthDialog() {
  if (!authDialogEl) return;
  setAuthMode("login");
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

function setAuthMode(mode) {
  _authMode = mode;
  var isRegister = mode === "register";
  if (authDialogTitle)  authDialogTitle.textContent = isRegister ? "Crear cuenta" : "Iniciar sesión";
  if (authSubmitBtn)    authSubmitBtn.textContent = isRegister ? "Crear cuenta" : "Iniciar sesión";
  if (authSwitchPrompt) authSwitchPrompt.textContent = isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
  if (authSwitchModeBtn) authSwitchModeBtn.textContent = isRegister ? "Iniciar sesión" : "Crear cuenta";
}

function handleSwitchMode() {
  clearAuthFeedback();
  setAuthMode(_authMode === "register" ? "login" : "register");
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

function handleEmailFormSubmit(event) {
  event.preventDefault();
  clearAuthFeedback();

  var email = authEmailInput ? authEmailInput.value.trim() : "";
  var password = authPasswordInput ? authPasswordInput.value : "";
  if (!email || !password) {
    showAuthError("Introduce email y contraseña.");
    return;
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

// ============================================================
// AUTH-GATE.JS
// Pantallas de acceso: Login / Registro / "Revisá tu mail" /
// Olvidé mi contraseña / Nueva contraseña. Se muestran a pantalla
// completa, ANTES de montar el shell de la app (sidebar/tabbar/
// vistas). app.js decide cuándo mostrar esto vs. la app real.
// ============================================================

(function (GT) {
  'use strict';

  let view = 'login'; // login | register | check-email | forgot | forgot-sent | reset
  let pendingEmail = '';

  function render(root, initialView) {
    if (initialView) view = initialView;
    root.hidden = false;
    paint(root);
  }

  function hide(root) {
    root.hidden = true;
  }

  function paint(root) {
    root.innerHTML = `
      <div class="auth-shell">
        <div class="auth-card">
          <div class="auth-brand">
            <svg class="brand-icon" viewBox="0 0 200 200" width="34" height="34" aria-hidden="true">
              <defs><clipPath id="bic-auth"><circle cx="100" cy="82" r="52"/></clipPath></defs>
              <circle cx="100" cy="82" r="52" fill="none" stroke="var(--color-accent)" stroke-width="9"/>
              <g clip-path="url(#bic-auth)" fill="var(--color-accent)">
                <circle cx="58" cy="45" r="5"/><circle cx="70" cy="38" r="5"/><circle cx="84" cy="34" r="5"/>
                <circle cx="50" cy="58" r="5.5"/><circle cx="63" cy="52" r="5.5"/><circle cx="77" cy="47" r="5.5"/><circle cx="92" cy="45" r="5"/>
                <circle cx="47" cy="72" r="6"/><circle cx="60" cy="67" r="6"/><circle cx="74" cy="62" r="5.5"/><circle cx="89" cy="59" r="5"/><circle cx="103" cy="58" r="4.5"/>
                <circle cx="48" cy="86" r="6"/><circle cx="62" cy="82" r="6"/><circle cx="76" cy="78" r="5.5"/><circle cx="91" cy="75" r="5"/><circle cx="105" cy="74" r="4"/>
                <circle cx="52" cy="100" r="5.5"/><circle cx="66" cy="97" r="5.5"/><circle cx="80" cy="93" r="5"/><circle cx="94" cy="91" r="4"/>
                <circle cx="59" cy="112" r="5"/><circle cx="72" cy="110" r="4.5"/><circle cx="85" cy="107" r="4"/>
              </g>
              <path d="M75 130 L125 130 L118 148 L82 148 Z" fill="none" stroke="var(--color-accent)" stroke-width="9" stroke-linejoin="round"/>
              <line x1="100" y1="148" x2="100" y2="188" stroke="var(--color-accent)" stroke-width="9" stroke-linecap="round"/>
            </svg>
            <span class="brand-word"><span class="brand-word-fair">FAIR</span><span class="brand-word-wise">WISE</span></span>
          </div>
          <div id="auth-body"></div>
        </div>
      </div>
    `;
    const body = root.querySelector('#auth-body');
    if (view === 'login') paintLogin(body, root);
    else if (view === 'register') paintRegister(body, root);
    else if (view === 'check-email') paintCheckEmail(body, root);
    else if (view === 'forgot') paintForgot(body, root);
    else if (view === 'forgot-sent') paintForgotSent(body);
    else if (view === 'reset') paintReset(body, root);
  }

  function passwordFieldHTML(id, label, extraAttrs) {
    return `
      <div class="field" style="margin-bottom: var(--space-2);">
        <label class="field__label" for="${id}">${label}</label>
        <div class="password-field">
          <input class="input" type="password" id="${id}" ${extraAttrs || ''} />
          <button type="button" class="password-toggle" data-toggle-pass="${id}" aria-label="Mostrar contraseña">${eyeIcon()}</button>
        </div>
      </div>
    `;
  }

  function wirePasswordToggles(root) {
    root.querySelectorAll('[data-toggle-pass]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = root.querySelector('#' + btn.dataset.togglePass);
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.innerHTML = showing ? eyeIcon() : eyeOffIcon();
        btn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
      });
    });
  }

  function eyeIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  function eyeOffIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-7-11-7a20.3 20.3 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a20.5 20.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
  }

  function paintLogin(body, root) {
    body.innerHTML = `
      <h1 class="topbar__title" style="margin-bottom: 4px;">Iniciar sesión</h1>
      <p class="card__meta" style="margin-bottom: var(--space-5);">Tus entrenamientos y vueltas te esperan.</p>
      <form id="form-login">
        <div class="field" style="margin-bottom: var(--space-3);">
          <label class="field__label" for="li-email">Email</label>
          <input class="input" type="email" id="li-email" required autocomplete="email" />
        </div>
        ${passwordFieldHTML('li-pass', 'Contraseña', 'required autocomplete="current-password"')}
        <div style="text-align:right; margin-bottom: var(--space-4);">
          <button type="button" class="btn btn--ghost btn--sm" id="link-forgot">Olvidé mi contraseña</button>
        </div>
        <div id="login-error" class="auth-error" hidden></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Iniciar sesión</button>
      </form>
      <p style="text-align:center; margin-top: var(--space-5); font-size: var(--fs-small); color: var(--color-text-secondary);">
        ¿No tenés cuenta? <button class="btn btn--ghost btn--sm" id="link-register">Registrate</button>
      </p>
    `;
    wirePasswordToggles(body);
    body.querySelector('#link-forgot').addEventListener('click', () => { view = 'forgot'; paint(root); });
    body.querySelector('#link-register').addEventListener('click', () => { view = 'register'; paint(root); });

    body.querySelector('#form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = body.querySelector('#li-email').value.trim();
      const pass = body.querySelector('#li-pass').value;
      const errEl = body.querySelector('#login-error');
      errEl.hidden = true;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Ingresando…';
      try {
        await GT.auth.signIn(email, pass);
        // el cambio de sesión lo procesa app.js vía onAuthStateChange
      } catch (err) {
        errEl.textContent = translateError(err);
        errEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar sesión';
      }
    });
  }

  function paintRegister(body, root) {
    body.innerHTML = `
      <h1 class="topbar__title" style="margin-bottom: 4px;">Crear cuenta</h1>
      <p class="card__meta" style="margin-bottom: var(--space-5);">Vas a recibir un mail para confirmar tu cuenta.</p>
      <form id="form-register">
        <div class="field" style="margin-bottom: var(--space-3);">
          <label class="field__label" for="re-email">Email</label>
          <input class="input" type="email" id="re-email" required autocomplete="email" />
        </div>
        ${passwordFieldHTML('re-pass', 'Contraseña', 'required minlength="6" autocomplete="new-password"')}
        <span class="field__hint" style="display:block; margin-bottom: var(--space-3);">Mínimo 6 caracteres</span>
        ${passwordFieldHTML('re-pass2', 'Repetir contraseña', 'required autocomplete="new-password"')}
        <div style="margin-bottom: var(--space-2);"></div>
        <div id="register-error" class="auth-error" hidden></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Crear cuenta</button>
      </form>
      <p style="text-align:center; margin-top: var(--space-5); font-size: var(--fs-small); color: var(--color-text-secondary);">
        ¿Ya tenés cuenta? <button class="btn btn--ghost btn--sm" id="link-login">Iniciar sesión</button>
      </p>
    `;
    wirePasswordToggles(body);
    body.querySelector('#link-login').addEventListener('click', () => { view = 'login'; paint(root); });

    body.querySelector('#form-register').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = body.querySelector('#re-email').value.trim();
      const pass = body.querySelector('#re-pass').value;
      const pass2 = body.querySelector('#re-pass2').value;
      const errEl = body.querySelector('#register-error');
      errEl.hidden = true;

      if (pass !== pass2) {
        errEl.textContent = 'Las contraseñas no coinciden.';
        errEl.hidden = false;
        return;
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando cuenta…';
      try {
        await GT.auth.signUp(email, pass);
        pendingEmail = email;
        view = 'check-email';
        paint(root);
      } catch (err) {
        errEl.textContent = translateError(err);
        errEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear cuenta';
      }
    });
  }

  function paintCheckEmail(body, root) {
    body.innerHTML = `
      <div style="text-align:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-accent);margin-bottom:var(--space-4);">
          <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
        </svg>
        <h1 class="topbar__title">Revisá tu mail</h1>
        <p class="card__meta" style="margin: var(--space-3) 0 var(--space-5);">
          Te mandamos un link de confirmación a <strong>${pendingEmail}</strong>. Tocalo para activar tu cuenta y después iniciá sesión acá.
        </p>
        <button class="btn btn--ghost" id="btn-resend" style="width:100%; margin-bottom: var(--space-3);">Reenviar mail</button>
        <button class="btn btn--primary" id="btn-to-login" style="width:100%;">Ya confirmé, iniciar sesión</button>
      </div>
    `;
    body.querySelector('#btn-to-login').addEventListener('click', () => { view = 'login'; paint(root); });
    body.querySelector('#btn-resend').addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Enviando…';
      try {
        await GT.auth.resendVerification(pendingEmail);
        GT.utils.showToast('Mail reenviado');
      } catch (err) {
        GT.utils.showToast('No se pudo reenviar: ' + translateError(err));
      }
      e.target.disabled = false;
      e.target.textContent = 'Reenviar mail';
    });
  }

  function paintForgot(body, root) {
    body.innerHTML = `
      <h1 class="topbar__title" style="margin-bottom: 4px;">Recuperar contraseña</h1>
      <p class="card__meta" style="margin-bottom: var(--space-5);">Te mandamos un link para elegir una nueva.</p>
      <form id="form-forgot">
        <div class="field" style="margin-bottom: var(--space-4);">
          <label class="field__label" for="fg-email">Email</label>
          <input class="input" type="email" id="fg-email" required autocomplete="email" />
        </div>
        <div id="forgot-error" class="auth-error" hidden></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Enviar link</button>
      </form>
      <p style="text-align:center; margin-top: var(--space-5);">
        <button class="btn btn--ghost btn--sm" id="link-back">Volver a iniciar sesión</button>
      </p>
    `;
    body.querySelector('#link-back').addEventListener('click', () => { view = 'login'; paint(root); });
    body.querySelector('#form-forgot').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = body.querySelector('#fg-email').value.trim();
      const errEl = body.querySelector('#forgot-error');
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
      try {
        await GT.auth.sendPasswordReset(email);
        pendingEmail = email;
        view = 'forgot-sent';
        paint(root);
      } catch (err) {
        errEl.textContent = translateError(err);
        errEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar link';
      }
    });
  }

  function paintForgotSent(body) {
    body.innerHTML = `
      <div style="text-align:center;">
        <h1 class="topbar__title">Listo</h1>
        <p class="card__meta" style="margin: var(--space-3) 0;">Te mandamos un link a <strong>${pendingEmail}</strong> para elegir una nueva contraseña.</p>
      </div>
    `;
  }

  function paintReset(body, root) {
    body.innerHTML = `
      <h1 class="topbar__title" style="margin-bottom: 4px;">Nueva contraseña</h1>
      <p class="card__meta" style="margin-bottom: var(--space-5);">Elegí una contraseña nueva para tu cuenta.</p>
      <form id="form-reset">
        ${passwordFieldHTML('rs-pass', 'Contraseña nueva', 'required minlength="6" autocomplete="new-password"')}
        <div id="reset-error" class="auth-error" hidden></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Actualizar contraseña</button>
      </form>
    `;
    wirePasswordToggles(body);
    body.querySelector('#form-reset').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = body.querySelector('#rs-pass').value;
      const errEl = body.querySelector('#reset-error');
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Actualizando…';
      try {
        await GT.auth.updatePassword(pass);
        GT.utils.showToast('Contraseña actualizada, ya podés usarla');
        view = 'login';
        paint(root);
      } catch (err) {
        errEl.textContent = translateError(err);
        errEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Actualizar contraseña';
      }
    });
  }

  function translateError(err) {
    const msg = (err && err.message) || String(err);
    if (/already registered|already exists/i.test(msg)) return 'Ese email ya tiene una cuenta creada.';
    if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
    if (/email not confirmed/i.test(msg)) return 'Todavía no confirmaste tu mail — revisá tu bandeja de entrada.';
    if (/password should be at least/i.test(msg)) return 'La contraseña es muy corta (mínimo 6 caracteres).';
    return msg;
  }

  GT.authGate = { render: render, hide: hide, setView: function (v) { view = v; } };
})(window.GT = window.GT || {});

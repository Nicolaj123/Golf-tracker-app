// ============================================================
// SETTINGS.JS
// Tema claro/oscuro + Backup/Restore en JSON (Etapa 1).
// Export a CSV/Excel y el resto de las opciones de datos llegan
// en la Etapa 10.
// ============================================================

(function (GT) {
  'use strict';

  function render(container) {
    const settings = GT.storage.getSettings();
    const snapshot = GT.storage.getFullSnapshot();
    const totalRegistros = snapshot.sessions.length + snapshot.rounds.length + snapshot.clubs.length;
    const cloud = GT.auth && GT.auth.isCloudMode();

    container.innerHTML = `
      ${cloud ? `
        <div class="card" style="max-width: 560px; margin-bottom: var(--space-5);">
          <div class="card__header"><h2 class="card__title">Cuenta</h2></div>
          <p id="account-email" style="color: var(--color-text-secondary); font-size: var(--fs-small);">Cargando…</p>
        </div>
      ` : ''}

      <div class="card" style="max-width: 560px; margin-bottom: var(--space-5);">
        <div class="card__header"><h2 class="card__title">Tu juego</h2></div>
        <div class="field">
          <label class="field__label" for="f-handicap">Hándicap actual</label>
          <input class="input" type="number" step="0.1" id="f-handicap" value="${settings.handicap !== null && settings.handicap !== undefined ? settings.handicap : ''}" placeholder="Ej: 18.4" style="max-width:160px;" />
          <span class="field__hint">Se carga a mano — viene de la Asociación Argentina de Golf, la app no lo calcula.</span>
        </div>
      </div>

      <div class="card" style="max-width: 560px;">
        <div class="card__header"><h2 class="card__title">Apariencia</h2></div>
        <div class="theme-toggle" role="group" aria-label="Tema de la aplicación">
          <button data-theme-option="dark" aria-pressed="${settings.theme === 'dark'}">Oscuro</button>
          <button data-theme-option="light" aria-pressed="${settings.theme === 'light'}">Claro</button>
        </div>
      </div>

      <div class="card" style="max-width: 560px; margin-top: var(--space-5);">
        <div class="card__header">
          <h2 class="card__title">Backup</h2>
          <span class="card__meta">${totalRegistros} registros guardados</span>
        </div>
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small); margin-bottom: var(--space-4);">
          ${cloud ? 'Tus datos ya están sincronizados en la nube con tu cuenta. Igual conviene exportar un backup de tanto en tanto.' : 'Toda tu información vive en este navegador. Exportá un backup seguido, sobre todo antes de borrar caché o cambiar de equipo — nada se sincroniza solo.'}
        </p>
        <div style="display:flex; gap: var(--space-2); flex-wrap: wrap;">
          <button class="btn btn--primary" id="btn-export">Exportar backup (JSON)</button>
          <button class="btn btn--ghost" id="btn-import">Importar backup</button>
          <input type="file" accept="application/json" id="file-import" style="display:none;" />
        </div>
      </div>

      <div class="card" style="max-width: 560px; margin-top: var(--space-5);">
        <div class="card__header"><h2 class="card__title">Exportar a planilla</h2></div>
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small); margin-bottom: var(--space-4);">
          CSV con codificación compatible: se abre directo en Excel, Google Sheets o Numbers.
        </p>
        <div style="display:flex; gap: var(--space-2); flex-wrap: wrap;">
          <button class="btn btn--ghost" id="btn-export-sessions-csv">Entrenamientos (CSV)</button>
          <button class="btn btn--ghost" id="btn-export-rounds-csv">Vueltas (CSV)</button>
        </div>
      </div>

      <div class="card" style="max-width: 560px; margin-top: var(--space-5); border-color: var(--color-bad-dim);">
        <div class="card__header"><h2 class="card__title">Zona de peligro</h2></div>
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small); margin-bottom: var(--space-4);">
          Borra absolutamente todo lo guardado en esta app (entrenamientos, vueltas, bolsa, objetivos). No se puede deshacer.
        </p>
        <button class="btn btn--danger" id="btn-wipe">Borrar todos los datos</button>
      </div>
    `;

    const handicapInput = container.querySelector('#f-handicap');
    handicapInput.addEventListener('change', () => {
      const val = handicapInput.value.trim();
      GT.storage.updateSettings({ handicap: val === '' ? null : Number(val) });
      GT.utils.showToast('Hándicap actualizado');
    });

    container.querySelectorAll('[data-theme-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.themeOption;
        GT.storage.updateSettings({ theme: theme });
        GT.app.applyTheme(theme);
        container.querySelectorAll('[data-theme-option]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b.dataset.themeOption === theme));
        });
      });
    });

    if (cloud) {
      GT.auth.getSession().then((session) => {
        const emailEl = container.querySelector('#account-email');
        if (emailEl && session) emailEl.textContent = session.user.email;
      });
    }

    container.querySelector('#btn-export').addEventListener('click', () => {
      const data = JSON.stringify(GT.storage.getFullSnapshot(), null, 2);
      const filename = 'golf-tracker-backup-' + GT.utils.todayISO() + '.json';
      GT.storage.exportAdapters.local.export(data, filename);
      GT.utils.showToast('Backup descargado');
    });

    const fileInput = container.querySelector('#file-import');
    container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const confirmMsg = '¿Importar este backup? Va a REEMPLAZAR todos los datos actuales en este navegador.';
          if (!window.confirm(confirmMsg)) return;
          GT.storage.restoreSnapshot(parsed);
          GT.utils.showToast('Backup restaurado');
          render(container);
        } catch (err) {
          console.error('[settings] Error importando backup', err);
          window.alert('El archivo no es un backup válido de Fairwise.');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    container.querySelector('#btn-wipe').addEventListener('click', () => {
      if (!window.confirm('Esto borra TODOS los datos guardados (entrenamientos, vueltas, bolsa, objetivos). ¿Confirmás?')) return;
      if (!window.confirm('Última confirmación: no hay forma de deshacer esto. ¿Borrar todo?')) return;
      GT.storage.wipeDatabase();
      GT.utils.showToast('Todos los datos fueron borrados');
      render(container);
    });

    container.querySelector('#btn-export-sessions-csv').addEventListener('click', () => {
      GT.backup.exportSessionsCSV();
      GT.utils.showToast('CSV de entrenamientos descargado');
    });

    container.querySelector('#btn-export-rounds-csv').addEventListener('click', () => {
      GT.backup.exportRoundsCSV();
      GT.utils.showToast('CSV de vueltas descargado');
    });
  }

  GT.modules = GT.modules || {};
  GT.modules['settings'] = { render: render };
})(window.GT = window.GT || {});

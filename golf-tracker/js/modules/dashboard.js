// ============================================================
// DASHBOARD.JS
// Vista de inicio: KPIs reales, semáforo por área de juego y
// últimos entrenamientos/vueltas — clickeables como shortcut
// directo al módulo correspondiente. Todo sale de GT.engine.stats.
// ============================================================

(function (GT) {
  'use strict';

  function render(container) {
    const kpiData = GT.engine.stats.getDashboardKPIs();
    const areas = GT.engine.stats.getAreaStatuses();
    const settings = GT.storage.getSettings();
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS);
    const rounds = GT.storage.getAll(GT.schema.COLLECTIONS.ROUNDS);
    const hasData = sessions.length > 0 || rounds.length > 0;

    const kpis = [
      { label: 'Hándicap', value: (settings.handicap !== null && settings.handicap !== undefined) ? settings.handicap : '—' },
      { label: 'Entrenamientos', value: kpiData.entrenamientos },
      { label: 'Vueltas jugadas', value: kpiData.vueltas },
      { label: 'Horas entrenadas', value: kpiData.horas || 0 },
      { label: 'Golpes registrados', value: kpiData.golpes },
      { label: 'Promedio de putts', value: kpiData.promedioPutts !== null ? kpiData.promedioPutts : '—' },
      { label: 'Score promedio', value: kpiData.promedioScore !== null ? formatRelative(kpiData.promedioScore) : '—' },
    ];

    container.innerHTML = `
      <div class="grid-kpi" style="margin-bottom: var(--space-6);">
        ${kpis.map(kpiTile).join('')}
      </div>

      <div class="card" style="margin-bottom: var(--space-6);">
        <div class="card__header">
          <h2 class="card__title">Estado por área de juego</h2>
          <span class="card__meta">% de acierto reciente</span>
        </div>
        <div class="signal-board">
          ${areas.map((a) => signalTile(a.label, a.status, a.pct !== null ? a.pct + '%' : 'Sin datos')).join('')}
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card__header"><h2 class="card__title">Últimos entrenamientos</h2></div>
          ${hasData && sessions.length ? lastSessionsList(sessions) : emptyBlock('Todavía no registraste entrenamientos.')}
        </div>
        <div class="card">
          <div class="card__header"><h2 class="card__title">Últimas vueltas</h2></div>
          ${rounds.length ? lastRoundsList(rounds) : emptyBlock('Todavía no cargaste ninguna vuelta.')}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-shortcut-session]').forEach((row) => {
      row.addEventListener('click', () => {
        GT.dashboardTarget = { type: 'session', tipo: row.dataset.shortcutTipo, id: row.dataset.shortcutSession };
        GT.app.navigate('entrenamiento');
      });
    });

    container.querySelectorAll('[data-shortcut-round]').forEach((row) => {
      row.addEventListener('click', () => {
        GT.app.navigate('rounds');
        // el editor de vueltas se abre después de que rounds.js ya renderizó su lista.
        setTimeout(() => {
          const rootView = document.getElementById('view-root');
          if (GT.modules.rounds && GT.modules.rounds.openExisting) {
            GT.modules.rounds.openExisting(rootView, row.dataset.shortcutRound);
          }
        }, 30);
      });
    });
  }

  function formatRelative(n) {
    if (n === 0) return 'E';
    return n > 0 ? '+' + n : String(n);
  }

  function kpiTile(k) {
    return `<div class="kpi"><span class="kpi__label">${k.label}</span><span class="kpi__value">${k.value}</span></div>`;
  }

  function signalTile(label, status, value) {
    return `
      <div class="signal" data-status="${status}">
        <div class="signal__label">${label}</div>
        <span class="signal__dot"></span><span class="signal__value">${value}</span>
      </div>
    `;
  }

  function emptyBlock(text) {
    return `<p style="color: var(--color-text-secondary); font-size: var(--fs-small);">${text}</p>`;
  }

  function lastSessionsList(sessions) {
    const last = sessions.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 5);
    return `
      <ul style="display:flex; flex-direction:column; gap: var(--space-1);">
        ${last.map((s) => `
          <li class="dashboard-shortcut" data-shortcut-session="${s.id}" data-shortcut-tipo="${s.tipoEntrenamiento}" style="display:flex; justify-content:space-between; font-size: var(--fs-small); cursor:pointer; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm);">
            <span style="text-transform:capitalize;">${s.tipoEntrenamiento || 'Entrenamiento'}</span>
            <span class="card__meta">${GT.utils.formatDate(s.fecha)}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function lastRoundsList(rounds) {
    const last = rounds.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 5);
    return `
      <ul style="display:flex; flex-direction:column; gap: var(--space-1);">
        ${last.map((r) => `
          <li class="dashboard-shortcut" data-shortcut-round="${r.id}" style="display:flex; justify-content:space-between; font-size: var(--fs-small); cursor:pointer; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm);">
            <span>${r.cancha || 'Vuelta'} · ${r.tipo}</span>
            <span class="card__meta">${GT.utils.formatDate(r.fecha)} · ${formatRelative(r.scoreRelativo)}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  GT.modules = GT.modules || {};
  GT.modules['dashboard'] = { render: render };
})(window.GT = window.GT || {});

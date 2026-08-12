// ============================================================
// GOALS.JS
// CRUD de objetivos. El valor actual siempre se recalcula en vivo
// desde las vueltas registradas — nunca se pisa a mano. El progreso
// se mide contra el valor que tenías el día que creaste el objetivo.
// ============================================================

(function (GT) {
  'use strict';

  function currentValueFor(metricKey) {
    const rounds = GT.storage.getAll(GT.schema.COLLECTIONS.ROUNDS);
    if (!rounds.length) return null;
    switch (metricKey) {
      case 'putts_promedio': return GT.utils.round(GT.utils.average(rounds.map((r) => r.puttsTotal)), 1);
      case 'fairways_pct': return GT.utils.round(GT.utils.average(rounds.map((r) => r.fairwaysPct).filter((v) => v !== null && v !== undefined)), 0);
      case 'gir_pct': return GT.utils.round(GT.utils.average(rounds.map((r) => r.girPct)), 0);
      case 'score_promedio': return GT.utils.round(GT.utils.average(rounds.map((r) => r.scoreRelativo)), 1);
      case 'triples_promedio': return GT.utils.round(GT.utils.average(rounds.map((r) => r.triples)), 2);
      default: return null;
    }
  }

  function render(container) {
    const goals = GT.storage.getAll(GT.schema.COLLECTIONS.GOALS);

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-5);">
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small);">${goals.length ? goals.length + ' objetivo(s) activos.' : 'Definí tu primera meta.'}</p>
        <button class="btn btn--primary" id="btn-new-goal">+ Nuevo objetivo</button>
      </div>
      <div class="grid-cards" id="goals-list"></div>
    `;

    renderList(container.querySelector('#goals-list'), goals);
    container.querySelector('#btn-new-goal').addEventListener('click', () => openGoalForm(container));
  }

  function renderList(el, goals) {
    if (!goals.length) {
      el.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle></svg>
          <h2 class="empty-state__title">Sin objetivos todavía</h2>
          <p>Definí una meta medible, por ejemplo "reducir promedio de putts a 33".</p>
        </div>
      `;
      return;
    }
    el.innerHTML = goals.map(goalCard).join('');
    el.querySelectorAll('[data-delete-goal]').forEach((btn) => btn.addEventListener('click', () => {
      if (!window.confirm('¿Eliminar este objetivo?')) return;
      GT.storage.remove(GT.schema.COLLECTIONS.GOALS, btn.dataset.deleteGoal);
      GT.utils.showToast('Objetivo eliminado');
      render(el.closest('.view'));
    }));
  }

  function goalCard(goal) {
    const metric = GT.schema.GOAL_METRICS.find((m) => m.key === goal.metrica) || { label: goal.metrica, higherIsBetter: true };
    const actual = currentValueFor(goal.metrica);
    const progress = computeProgress(goal, actual, metric.higherIsBetter);

    return `
      <div class="card card--tight">
        <div class="card__header">
          <h2 class="card__title" style="font-size: var(--fs-body);">${metric.label}</h2>
          <button class="btn btn--icon" data-delete-goal="${goal.id}" aria-label="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: var(--space-2);">
          <span class="kpi__value" style="font-size:1.4rem;">${actual !== null ? actual : '—'}</span>
          <span class="card__meta">objetivo: ${goal.valorObjetivo}</span>
        </div>
        <div style="height:8px; background: var(--color-bg-elevated); border-radius: var(--radius-pill); overflow:hidden;">
          <div style="height:100%; width:${progress}%; background: var(--color-accent); transition: width var(--transition-base);"></div>
        </div>
        <div class="card__meta" style="margin-top: var(--space-2);">${progress}% cumplido · creado ${GT.utils.formatDate(goal.fechaCreacion)}</div>
      </div>
    `;
  }

  function computeProgress(goal, actual, higherIsBetter) {
    if (actual === null || goal.valorInicial === undefined) return 0;
    const inicial = goal.valorInicial;
    const objetivo = goal.valorObjetivo;
    let denom = higherIsBetter ? (objetivo - inicial) : (inicial - objetivo);
    let num = higherIsBetter ? (actual - inicial) : (inicial - actual);
    if (denom === 0) return actual === objetivo ? 100 : 0;
    return Math.round(GT.utils.clamp((num / denom) * 100, 0, 100));
  }

  function openGoalForm(rootView) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width: 480px;">
        <div class="modal__header">
          <h2 class="card__title">Nuevo objetivo</h2>
          <button class="btn btn--icon" id="modal-close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="field" style="margin-bottom: var(--space-4);">
          <label class="field__label">Métrica</label>
          <select class="select" id="f-metrica">
            ${GT.schema.GOAL_METRICS.map((m) => `<option value="${m.key}">${m.label}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom: var(--space-4);">
          <label class="field__label">Valor objetivo</label>
          <input class="input" type="number" step="0.1" id="f-valor" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" id="modal-cancel">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-save-goal">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    function close() { backdrop.remove(); }
    backdrop.querySelector('#modal-close').addEventListener('click', close);
    backdrop.querySelector('#modal-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#btn-save-goal').addEventListener('click', () => {
      const metrica = backdrop.querySelector('#f-metrica').value;
      const valorObjetivo = Number(backdrop.querySelector('#f-valor').value);
      if (!valorObjetivo && valorObjetivo !== 0) { window.alert('Ingresá un valor objetivo.'); return; }
      const valorInicial = currentValueFor(metrica) || 0;
      GT.storage.insert(GT.schema.COLLECTIONS.GOALS, { metrica: metrica, valorObjetivo: valorObjetivo, valorInicial: valorInicial, fechaCreacion: GT.utils.todayISO() });
      GT.utils.showToast('Objetivo creado');
      close();
      render(rootView);
    });
  }

  GT.modules = GT.modules || {};
  GT.modules['goals'] = { render: render };
})(window.GT = window.GT || {});

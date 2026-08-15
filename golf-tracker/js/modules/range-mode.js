// ============================================================
// RANGE-MODE.JS — Modo Driving Range
// Un palo elegido, después todo por botones grandes: Bueno /
// Regular / Malo. Cada golpe se guarda en un draft (localStorage
// plano) y al finalizar se vuelca como un entrenamiento más en
// GT.storage, reutilizando el mismo modelo de datos que el resto
// de los módulos de entrenamiento.
// ============================================================

(function (GT) {
  'use strict';

  const DRAFT_KEY = 'golfTrackerRangeDraft';

  const CLUB_OPTIONS = ['Driver', 'Madera']
    .concat(GT.schema.IRON_NUMBERS.map((n) => 'Hierro ' + n))
    .concat(GT.schema.WEDGE_LOFTS.map((l) => 'Wedge ' + l));

  function loadDraft() {
    try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
  function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

  function render(container) {
    const draft = loadDraft();
    if (draft) renderTapScreen(container, draft);
    else renderClubPicker(container);
  }

  function renderClubPicker(container) {
    container.innerHTML = `
      <div style="max-width: 480px; margin: 0 auto;">
        <p style="text-align:center; color: var(--color-text-secondary); font-size: var(--fs-small); margin-bottom: var(--space-4);">Elegí el palo con el que vas a pegar</p>
        <div class="chip-select" style="justify-content:center;" id="club-picker">
          ${CLUB_OPTIONS.map((c) => `<button type="button" class="chip toggle-lg" data-club="${c}">${c}</button>`).join('')}
        </div>
      </div>
    `;
    container.querySelectorAll('[data-club]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const draft = { club: btn.dataset.club, bueno: 0, regular: 0, malo: 0, inicio: new Date().toISOString() };
        saveDraft(draft);
        renderTapScreen(container, draft);
      });
    });
  }

  function renderTapScreen(container, draft) {
    const total = draft.bueno + draft.regular + draft.malo;
    container.innerHTML = `
      <div style="max-width: 420px; margin: 0 auto; text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-5);">
          <span class="badge badge--data">${draft.club}</span>
          <button class="btn btn--ghost btn--sm" id="btn-change-club">Cambiar palo</button>
        </div>

        <div class="kpi__value" style="font-size: 3rem;">${total}</div>
        <div class="card__meta" style="margin-bottom: var(--space-6);">golpes en esta sesión</div>

        <div style="display:flex; flex-direction:column; gap: var(--space-3);">
          <button type="button" class="btn btn--primary" data-tap="bueno" style="padding: var(--space-5); font-size: 1.2rem;">Bueno (${draft.bueno})</button>
          <button type="button" class="btn btn--ghost" data-tap="regular" style="padding: var(--space-5); font-size: 1.2rem;">Regular (${draft.regular})</button>
          <button type="button" class="btn btn--danger" data-tap="malo" style="padding: var(--space-5); font-size: 1.2rem;">Malo (${draft.malo})</button>
        </div>

        <button class="btn btn--ghost" id="btn-finish" style="width:100%; margin-top: var(--space-6);">Finalizar sesión</button>
      </div>
    `;

    container.querySelectorAll('[data-tap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft[btn.dataset.tap]++;
        saveDraft(draft);
        renderTapScreen(container, draft);
      });
    });

    container.querySelector('#btn-change-club').addEventListener('click', () => {
      if (draft.bueno + draft.regular + draft.malo > 0 && !window.confirm('Cambiar de palo cierra esta sesión de ' + draft.club + '. ¿Continuar?')) return;
      finishSession(draft, false);
      clearDraft();
      renderClubPicker(container);
    });

    container.querySelector('#btn-finish').addEventListener('click', () => {
      finishSession(draft, true);
      clearDraft();
      GT.utils.showToast('Sesión de range guardada');
      renderClubPicker(container);
    });
  }

  function finishSession(draft, showEmpty) {
    const total = draft.bueno + draft.regular + draft.malo;
    if (!total) return;

    const tipo = inferTipo(draft.club);
    const ejercicio = {
      categoria: null,
      nombre: 'Driving range',
      palo: draft.club,
      distancia: null,
      aciertos: draft.bueno,
      errores: draft.regular + draft.malo,
      golpes: total,
      contactCounts: {},
      directionCounts: {},
      notas: 'Bueno: ' + draft.bueno + ' · Regular: ' + draft.regular + ' · Malo: ' + draft.malo,
    };

    GT.storage.insert(GT.schema.COLLECTIONS.SESSIONS, {
      tipoEntrenamiento: tipo,
      fecha: GT.utils.todayISO(),
      hora: GT.utils.nowHHMM(),
      duracionMin: 0,
      condiciones: {},
      notasGenerales: 'Cargado desde Modo Driving Range',
      ejercicios: [ejercicio],
    });
  }

  function inferTipo(club) {
    if (club === 'Driver') return 'driver';
    if (club === 'Madera') return 'madera';
    if (club.indexOf('Hierro') === 0) return 'hierros';
    if (club.indexOf('Wedge') === 0) return 'wedges';
    return 'driver';
  }

  GT.modules = GT.modules || {};
  GT.modules['range-mode'] = { render: render };
})(window.GT = window.GT || {});

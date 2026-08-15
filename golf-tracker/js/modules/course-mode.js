// ============================================================
// COURSE-MODE.JS — Modo En Cancha
// Un hoyo por pantalla, botones grandes, mínimo texto. El progreso
// de la vuelta en curso se guarda en un draft aparte (localStorage
// plano, fuera del esquema principal) para no perder nada si se
// cierra el navegador a mitad de la vuelta.
//
// "Modo práctica" (toggle, arranca apagado): oculta Penalty, Arena,
// Chip, Up&Down, Sand Save y el hándicap del hoyo — deja solo Par,
// Golpes, Putts, Fairway y Green para cargar más rápido. Se puede
// prender/apagar en cualquier momento sin perder lo ya cargado.
// ============================================================

(function (GT) {
  'use strict';

  const DRAFT_KEY = 'golfTrackerCourseModeDraft';
  const PRACTICE_KEY = 'golfTrackerCourseModePractice';
  const TIPO_HOYOS = { '9': 9, '18': 18, 'par3': 9 };

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveDraft(draft) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function isPracticeMode() {
    return localStorage.getItem(PRACTICE_KEY) === '1';
  }

  function setPracticeMode(on) {
    localStorage.setItem(PRACTICE_KEY, on ? '1' : '0');
  }

  function render(container) {
    document.documentElement.setAttribute('data-theme', 'dark'); // Course Mode fuerza oscuro (uso a pleno sol)

    const draft = loadDraft();
    if (draft) {
      renderHoleScreen(container, draft);
    } else {
      renderStartScreen(container);
    }
  }

  function renderStartScreen(container) {
    container.innerHTML = `
      <div style="max-width: 420px; margin: 0 auto;">
        <div class="card">
          <div class="card__header"><h2 class="card__title">Empezar vuelta</h2></div>
          <div class="field" style="margin-bottom: var(--space-3);">
            <label class="field__label">Cancha</label>
            <input class="input" id="f-cancha" placeholder="Opcional" />
          </div>
          <div class="field" style="margin-bottom: var(--space-4);">
            <label class="field__label">Tipo</label>
            <select class="select" id="f-tipo">
              <option value="18">18 hoyos</option>
              <option value="9">9 hoyos</option>
              <option value="par3">Par 3</option>
            </select>
          </div>
          <button class="btn btn--primary" id="btn-start" style="width:100%;">Arrancar</button>
        </div>
      </div>
    `;
    container.querySelector('#btn-start').addEventListener('click', () => {
      const tipo = container.querySelector('#f-tipo').value;
      const draft = {
        tipo: tipo,
        cancha: container.querySelector('#f-cancha').value.trim(),
        fecha: GT.utils.todayISO(),
        totalHoyos: TIPO_HOYOS[tipo],
        holeIndex: 0,
        holes: [],
        current: emptyHole(1, tipo),
      };
      saveDraft(draft);
      renderHoleScreen(container, draft);
    });
  }

  function emptyHole(numero, tipo) {
    return { numero: numero, par: tipo === 'par3' ? 3 : 4, handicap: 0, golpes: 0, putts: 0, fairway: false, green: false, penalty: false, arena: false, chip: false, upDown: false, sandSave: false };
  }

  function renderHoleScreen(container, draft) {
    const h = draft.current;
    const isLast = draft.holeIndex + 1 >= draft.totalHoyos;
    const parFijo = draft.tipo === 'par3';
    const practice = isPracticeMode();

    container.innerHTML = `
      <div style="max-width: 480px; margin: 0 auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-4); gap: var(--space-2); flex-wrap:wrap;">
          <span class="badge badge--data">Hoyo ${h.numero} / ${draft.totalHoyos}</span>
          <div style="display:flex; align-items:center; gap: var(--space-3);">
            <button type="button" class="chip ${practice ? 'is-active' : ''}" id="btn-practice-toggle">Modo práctica</button>
            <button class="btn btn--ghost btn--sm" id="btn-abandon">Abandonar</button>
          </div>
        </div>

        <div class="card" style="text-align:center;">
          <span class="field__label">Par</span>
          ${parFijo
            ? `<div style="margin: var(--space-2) 0 var(--space-5);"><span class="badge badge--neutral" style="font-size:1.1rem; padding:10px 22px;">3 (fijo — cancha Par 3)</span></div>`
            : `<div class="chip-select" style="justify-content:center; margin: var(--space-2) 0 var(--space-5);" id="par-select">
                ${[3, 4, 5].map((p) => `<button type="button" class="chip ${h.par === p ? 'is-active' : ''}" data-par="${p}" style="font-size:1.1rem; padding: 10px 22px;">${p}</button>`).join('')}
              </div>`}

          <div class="grid-2" style="gap: var(--space-4);">
            <div>
              <span class="field__label">Golpes</span>
              <div class="stepper" id="stepper-golpes">
                <button type="button" class="btn btn--icon" data-step="golpes" data-dir="-1">−</button>
                <span class="kpi__value" id="val-golpes">${h.golpes}</span>
                <button type="button" class="btn btn--icon" data-step="golpes" data-dir="1">+</button>
              </div>
            </div>
            <div>
              <span class="field__label">Putts</span>
              <div class="stepper" id="stepper-putts">
                <button type="button" class="btn btn--icon" data-step="putts" data-dir="-1">−</button>
                <span class="kpi__value" id="val-putts">${h.putts}</span>
                <button type="button" class="btn btn--icon" data-step="putts" data-dir="1">+</button>
              </div>
            </div>
          </div>

          ${practice ? '' : `
            <div style="margin-top: var(--space-4);">
              <span class="field__label">Hándicap del hoyo</span>
              <div class="stepper" id="stepper-handicap">
                <button type="button" class="btn btn--icon" data-step="handicap" data-dir="-1">−</button>
                <span class="kpi__value" id="val-handicap">${h.handicap || '—'}</span>
                <button type="button" class="btn btn--icon" data-step="handicap" data-dir="1">+</button>
              </div>
            </div>
          `}

          <div class="chip-select" style="justify-content:center; margin-top: var(--space-5);">
            ${h.par !== 3 ? `<button type="button" class="chip toggle-lg ${h.fairway ? 'is-active' : ''}" data-toggle="fairway">Fairway</button>` : ''}
            <button type="button" class="chip toggle-lg ${h.green ? 'is-active' : ''}" data-toggle="green">Green</button>
            ${practice ? '' : `
              <button type="button" class="chip toggle-lg ${h.penalty ? 'is-active' : ''}" data-toggle="penalty">Penalty</button>
              <button type="button" class="chip toggle-lg ${h.arena ? 'is-active' : ''}" data-toggle="arena">Arena</button>
              <button type="button" class="chip toggle-lg ${h.chip ? 'is-active' : ''}" data-toggle="chip">Chip</button>
              <button type="button" class="chip toggle-lg ${h.upDown ? 'is-active' : ''}" data-toggle="upDown">Up&amp;Down</button>
              <button type="button" class="chip toggle-lg ${h.sandSave ? 'is-active' : ''}" data-toggle="sandSave">Sand Save</button>
            `}
          </div>
        </div>

        <button class="btn btn--primary" id="btn-next-hole" style="width:100%; margin-top: var(--space-5); padding: var(--space-4); font-size: 1.05rem;">
          ${isLast ? 'Finalizar vuelta' : 'Guardar hoyo y seguir →'}
        </button>
      </div>
    `;

    container.querySelector('#btn-practice-toggle').addEventListener('click', () => {
      setPracticeMode(!practice);
      renderHoleScreen(container, draft);
    });

    if (!parFijo) {
      container.querySelectorAll('[data-par]').forEach((btn) => {
        btn.addEventListener('click', () => {
          h.par = Number(btn.dataset.par);
          renderHoleScreen(container, draft);
        });
      });
    }

    container.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.step;
        const dir = Number(btn.dataset.dir);
        const max = field === 'handicap' ? 18 : 99;
        h[field] = GT.utils.clamp((h[field] || 0) + dir, 0, max);
        const el = container.querySelector('#val-' + field);
        el.textContent = field === 'handicap' ? (h[field] || '—') : h[field];
      });
    });

    container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        h[key] = !h[key];
        btn.classList.toggle('is-active', h[key]);
      });
    });

    container.querySelector('#btn-abandon').addEventListener('click', () => {
      if (!window.confirm('¿Abandonar la vuelta en curso? Se pierde el progreso.')) return;
      clearDraft();
      render(container);
    });

    container.querySelector('#btn-next-hole').addEventListener('click', () => {
      draft.holes.push(h);
      if (isLast) {
        finishRound(container, draft);
      } else {
        draft.holeIndex++;
        draft.current = emptyHole(h.numero + 1, draft.tipo);
        saveDraft(draft);
        renderHoleScreen(container, draft);
      }
    });
  }

  function finishRound(container, draft) {
    const computed = GT.engine.stats.computeRoundStats(draft.holes);
    const payload = Object.assign({
      tipo: draft.tipo,
      fecha: draft.fecha,
      cancha: draft.cancha,
      holes: draft.holes,
    }, computed);
    GT.storage.insert(GT.schema.COLLECTIONS.ROUNDS, payload);
    clearDraft();
    GT.utils.showToast('Vuelta guardada');

    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
        <h2 class="empty-state__title">Vuelta guardada</h2>
        <p>Score ${computed.scoreTotal} (${computed.scoreRelativo === 0 ? 'E' : (computed.scoreRelativo > 0 ? '+' + computed.scoreRelativo : computed.scoreRelativo)}) · ${computed.puttsTotal} putts</p>
        <button class="btn btn--primary" id="btn-back" style="margin-top: var(--space-3);">Volver a Vueltas</button>
      </div>
    `;
    container.querySelector('#btn-back').addEventListener('click', () => GT.app.navigate('rounds'));
  }

  GT.modules = GT.modules || {};
  GT.modules['course-mode'] = { render: render };
})(window.GT = window.GT || {});

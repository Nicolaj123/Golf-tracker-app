// ============================================================
// ROUNDS.JS — Vueltas de golf
// Carga de una ronda completa, hoyo por hoyo, con todos los
// totales calculados automáticamente por GT.engine.stats.computeRoundStats.
//
// Reglas de negocio:
// - "Cancha completa" se sacó del selector (era redundante con "18 hoyos").
// - Si el tipo es "Par 3", todos los hoyos arrancan y quedan fijos en
//   par 3 — no tiene sentido elegir otro par en una cancha de Par 3.
// ============================================================

(function (GT) {
  'use strict';

  const TIPO_HOYOS = { '9': 9, '18': 18, 'par3': 9 };
  const TIPO_LABELS = { '9': '9 hoyos', '18': '18 hoyos', 'par3': 'Par 3' };

  function render(container) {
    const rounds = GT.storage.getAll(GT.schema.COLLECTIONS.ROUNDS).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-5); flex-wrap:wrap; gap: var(--space-3);">
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small);">${rounds.length ? rounds.length + ' vueltas registradas.' : 'Cargá tu primera vuelta completa.'}</p>
        <button class="btn btn--primary" id="btn-new-round">+ Nueva vuelta</button>
      </div>
      <div id="rounds-list"></div>
    `;

    renderList(container.querySelector('#rounds-list'), rounds);
    container.querySelector('#btn-new-round').addEventListener('click', () => openRoundForm(container, null));
  }

  function renderList(el, rounds) {
    if (!rounds.length) {
      el.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v18"></path><path d="M12 4l7 3-7 3"></path></svg>
          <h2 class="empty-state__title">Sin vueltas cargadas</h2>
          <p>Registrá tu próxima vuelta hoyo por hoyo.</p>
        </div>
      `;
      return;
    }
    el.innerHTML = `<div style="display:flex; flex-direction:column; gap: var(--space-3);">${rounds.map((r) => roundCard(r)).join('')}</div>`;
    el.querySelectorAll('[data-edit-round]').forEach((btn) => btn.addEventListener('click', () => openRoundForm(el.closest('.view'), btn.dataset.editRound)));
    el.querySelectorAll('[data-delete-round]').forEach((btn) => btn.addEventListener('click', () => {
      if (!window.confirm('¿Eliminar esta vuelta?')) return;
      GT.storage.remove(GT.schema.COLLECTIONS.ROUNDS, btn.dataset.deleteRound);
      GT.utils.showToast('Vuelta eliminada');
      render(el.closest('.view'));
    }));
  }

  function roundCard(r) {
    const rel = r.scoreRelativo === 0 ? 'E' : (r.scoreRelativo > 0 ? '+' + r.scoreRelativo : r.scoreRelativo);
    return `
      <div class="item-card" id="round-${r.id}">
        <div class="item-card__main">
          <div class="item-card__glyph">${flagIcon()}</div>
          <div style="min-width:0;">
            <div class="item-card__title">${r.cancha || 'Cancha sin nombre'} · ${TIPO_LABELS[r.tipo] || r.tipo}</div>
            <div class="item-card__subtitle">${GT.utils.formatDate(r.fecha)} · Score ${r.scoreTotal} (${rel}) · ${r.puttsTotal} putts</div>
          </div>
        </div>
        <div class="item-card__actions">
          <button class="btn btn--icon" data-edit-round="${r.id}" aria-label="Editar">${editIcon()}</button>
          <button class="btn btn--icon" data-delete-round="${r.id}" aria-label="Eliminar">${trashIcon()}</button>
        </div>
      </div>
    `;
  }

  function openRoundForm(rootView, roundId) {
    const existing = roundId ? GT.storage.getById(GT.schema.COLLECTIONS.ROUNDS, roundId) : null;
    const base = existing || { tipo: '18', fecha: GT.utils.todayISO(), cancha: '', holes: [] };
    let tipoActual = base.tipo;
    let holes = base.holes && base.holes.length ? base.holes.slice() : buildDefaultHoles(TIPO_HOYOS[tipoActual], tipoActual);

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width: 720px;">
        <div class="modal__header">
          <h2 class="card__title">${existing ? 'Editar' : 'Nueva'} vuelta</h2>
          <button class="btn btn--icon" id="modal-close">${closeIcon()}</button>
        </div>

        <div class="form-grid" style="margin-bottom: var(--space-4);">
          <div class="field">
            <label class="field__label">Fecha</label>
            <input class="input" type="date" id="f-fecha" value="${base.fecha}" />
          </div>
          <div class="field">
            <label class="field__label">Cancha</label>
            <input class="input" id="f-cancha" value="${(base.cancha || '').replace(/"/g, '&quot;')}" />
          </div>
          <div class="field">
            <label class="field__label">Tipo de vuelta</label>
            <select class="select" id="f-tipo">
              ${Object.keys(TIPO_LABELS).map((k) => `<option value="${k}" ${base.tipo === k ? 'selected' : ''}>${TIPO_LABELS[k]}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="holes-editor"></div>

        <div class="form-actions">
          ${existing ? '<button type="button" class="btn btn--danger" id="btn-delete-inline">Eliminar</button>' : ''}
          <button type="button" class="btn btn--ghost" id="modal-cancel">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-save-round">Guardar vuelta</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const holesEditor = backdrop.querySelector('#holes-editor');
    renderHolesEditor(holesEditor, holes, tipoActual);

    backdrop.querySelector('#f-tipo').addEventListener('change', (e) => {
      tipoActual = e.target.value;
      holes = buildDefaultHoles(TIPO_HOYOS[tipoActual], tipoActual);
      renderHolesEditor(holesEditor, holes, tipoActual);
    });

    function close() { backdrop.remove(); }
    backdrop.querySelector('#modal-close').addEventListener('click', close);
    backdrop.querySelector('#modal-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    if (existing) {
      backdrop.querySelector('#btn-delete-inline').addEventListener('click', () => {
        GT.storage.remove(GT.schema.COLLECTIONS.ROUNDS, existing.id);
        GT.utils.showToast('Vuelta eliminada');
        close();
        render(rootView);
      });
    }

    backdrop.querySelector('#btn-save-round').addEventListener('click', () => {
      readHolesFromEditor(holesEditor, holes, tipoActual);
      const computed = GT.engine.stats.computeRoundStats(holes);
      const payload = Object.assign({
        tipo: tipoActual,
        fecha: backdrop.querySelector('#f-fecha').value || GT.utils.todayISO(),
        cancha: backdrop.querySelector('#f-cancha').value.trim(),
        holes: holes,
      }, computed);

      if (existing) {
        GT.storage.update(GT.schema.COLLECTIONS.ROUNDS, existing.id, payload);
        GT.utils.showToast('Vuelta actualizada');
      } else {
        GT.storage.insert(GT.schema.COLLECTIONS.ROUNDS, payload);
        GT.utils.showToast('Vuelta guardada');
      }
      close();
      render(rootView);
    });
  }

  function buildDefaultHoles(n, tipo) {
    const parFijo = tipo === 'par3' ? 3 : 4;
    const holes = [];
    for (let i = 1; i <= n; i++) {
      holes.push({ numero: i, par: parFijo, handicap: '', yardas: '', golpes: '', putts: '', fairway: false, green: false, penalty: false, arena: false, chip: false, upDown: false, sandSave: false, approach: '', observaciones: '' });
    }
    return holes;
  }

  function renderHolesEditor(el, holes, tipo) {
    el.innerHTML = `
      <div class="card__header" style="padding:0;"><h2 class="card__title" style="font-size: var(--fs-body);">Hoyo por hoyo</h2></div>
      ${tipo === 'par3' ? '<p class="field__hint" style="display:block; margin-bottom: var(--space-2);">Cancha Par 3: todos los hoyos quedan fijos en par 3.</p>' : ''}
      <div style="display:flex; flex-direction:column; gap: var(--space-2); max-height: 420px; overflow-y:auto; padding-right: 4px;">
        ${holes.map((h) => holeRow(h, tipo)).join('')}
      </div>
    `;
    el.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => btn.classList.toggle('is-active'));
    });
  }

  function holeRow(h, tipo) {
    const parFijo = tipo === 'par3';
    return `
      <div class="card card--tight" data-hole="${h.numero}">
        <div style="display:flex; align-items:center; gap: var(--space-3); flex-wrap:wrap;">
          <strong style="width: 32px;">#${h.numero}</strong>
          <div class="field" style="width:70px;"><label class="field__label">Par</label>
            ${parFijo
              ? `<input class="input" type="text" value="3" disabled data-h="par-fijo" style="text-align:center;" />`
              : `<select class="select" data-h="par">${[3, 4, 5].map((p) => `<option value="${p}" ${h.par === p ? 'selected' : ''}>${p}</option>`).join('')}</select>`}
          </div>
          <div class="field" style="width:80px;"><label class="field__label">Golpes</label><input class="input" type="number" min="1" data-h="golpes" value="${h.golpes}" /></div>
          <div class="field" style="width:80px;"><label class="field__label">Putts</label><input class="input" type="number" min="0" data-h="putts" value="${h.putts}" /></div>
          <div class="field" style="width:90px;"><label class="field__label">Yardas</label><input class="input" type="number" min="0" data-h="yardas" value="${h.yardas}" /></div>
          <div class="field" style="width:90px;"><label class="field__label">Hándicap</label><input class="input" type="number" min="1" max="18" data-h="handicap" value="${h.handicap || ''}" placeholder="1-18" /></div>
        </div>
        <div class="chip-select" style="margin-top: var(--space-2);">
          <button type="button" class="chip ${h.fairway ? 'is-active' : ''}" data-toggle="fairway">Fairway</button>
          <button type="button" class="chip ${h.green ? 'is-active' : ''}" data-toggle="green">Green (GIR)</button>
          <button type="button" class="chip ${h.penalty ? 'is-active' : ''}" data-toggle="penalty">Penalty</button>
          <button type="button" class="chip ${h.arena ? 'is-active' : ''}" data-toggle="arena">Arena</button>
          <button type="button" class="chip ${h.chip ? 'is-active' : ''}" data-toggle="chip">Chip</button>
          <button type="button" class="chip ${h.upDown ? 'is-active' : ''}" data-toggle="upDown">Up &amp; Down</button>
          <button type="button" class="chip ${h.sandSave ? 'is-active' : ''}" data-toggle="sandSave">Sand Save</button>
        </div>
      </div>
    `;
  }

  function readHolesFromEditor(el, holes, tipo) {
    holes.forEach((h) => {
      const row = el.querySelector(`[data-hole="${h.numero}"]`);
      if (!row) return;
      h.par = tipo === 'par3' ? 3 : (Number(row.querySelector('[data-h="par"]').value) || 4);
      h.handicap = row.querySelector('[data-h="handicap"]').value ? Number(row.querySelector('[data-h="handicap"]').value) : '';
      h.golpes = Number(row.querySelector('[data-h="golpes"]').value) || 0;
      h.putts = Number(row.querySelector('[data-h="putts"]').value) || 0;
      h.yardas = row.querySelector('[data-h="yardas"]').value;
      h.fairway = row.querySelector('[data-toggle="fairway"]').classList.contains('is-active');
      h.green = row.querySelector('[data-toggle="green"]').classList.contains('is-active');
      h.penalty = row.querySelector('[data-toggle="penalty"]').classList.contains('is-active');
      h.arena = row.querySelector('[data-toggle="arena"]').classList.contains('is-active');
      h.chip = row.querySelector('[data-toggle="chip"]').classList.contains('is-active');
      h.upDown = row.querySelector('[data-toggle="upDown"]').classList.contains('is-active');
      h.sandSave = row.querySelector('[data-toggle="sandSave"]').classList.contains('is-active');
    });
  }

  function flagIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v18"/><path d="M12 4l7 3-7 3"/></svg>'; }
  function editIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>'; }
  function trashIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'; }
  function closeIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>'; }

  function openExisting(rootView, roundId) {
    openRoundForm(rootView, roundId);
  }

  GT.modules = GT.modules || {};
  GT.modules['rounds'] = { render: render, openExisting: openExisting };
})(window.GT = window.GT || {});

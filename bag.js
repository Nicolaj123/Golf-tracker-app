// ============================================================
// BAG.JS — Mi Bolsa
// CRUD completo del equipamiento. Los palos "de golpe" (driver,
// madera, hierro, wedge, putter) muestran specs técnicas (lie,
// loft, flex, etc). Los accesorios (pelota, guante, grips)
// muestran un formulario simplificado.
//
// El índice de confianza por palo es solo un placeholder acá:
// se calcula de verdad en la Etapa 7 con datos reales de golpes.
// ============================================================

(function (GT) {
  'use strict';

  const CLUB_TYPES = [
    { value: 'driver', label: 'Driver' },
    { value: 'madera', label: 'Madera' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'hierro', label: 'Hierro' },
    { value: 'wedge', label: 'Wedge' },
    { value: 'putter', label: 'Putter' },
    { value: 'pelota', label: 'Pelota' },
    { value: 'guante', label: 'Guante' },
    { value: 'grips', label: 'Grips' },
  ];

  const TECH_TYPES = ['driver', 'madera', 'hibrido', 'hierro', 'wedge', 'putter'];
  const FLEX_OPTIONS = ['Ladies', 'Senior', 'Regular', 'Stiff', 'X-Stiff'];

  let editingId = null;

  function typeLabel(value) {
    const t = CLUB_TYPES.find((c) => c.value === value);
    return t ? t.label : value;
  }

  function render(container) {
    const clubs = GT.storage.getAll(GT.schema.COLLECTIONS.CLUBS);

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-5);">
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small); max-width: 60ch;">
          Registrá cada palo y accesorio de tu bolsa. El índice de confianza se activa en la Etapa 7, cuando haya golpes registrados con cada palo.
        </p>
        <button class="btn btn--primary" id="btn-add-club">+ Agregar</button>
      </div>
      <div id="bag-list"></div>
    `;

    renderList(container.querySelector('#bag-list'), clubs);
    container.querySelector('#btn-add-club').addEventListener('click', () => openForm(container, null));
  }

  function renderList(listEl, clubs) {
    if (!clubs.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="5" y="9" width="14" height="12" rx="2"></rect>
            <path d="M9 9V6a3 3 0 016 0v3"></path>
          </svg>
          <h2 class="empty-state__title">Tu bolsa está vacía</h2>
          <p>Agregá tu driver, hierros, wedges y putter para arrancar.</p>
        </div>
      `;
      return;
    }

    // Agrupar por tipo, respetando el orden de CLUB_TYPES.
    const groups = CLUB_TYPES.map((t) => ({
      type: t,
      items: clubs.filter((c) => c.tipo === t.value),
    })).filter((g) => g.items.length);

    listEl.innerHTML = groups.map((g) => `
      <div style="margin-bottom: var(--space-6);">
        <div class="sidebar__group-label" style="padding:0; margin-bottom: var(--space-3);">${g.type.label} (${g.items.length})</div>
        <div style="display:flex; flex-direction:column; gap: var(--space-3);">
          ${g.items.map(clubRow).join('')}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openForm(listEl.closest('.view'), btn.dataset.edit));
    });
    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => confirmDelete(listEl.closest('.view'), btn.dataset.delete));
    });
  }

  function clubRow(club) {
    const subtitleParts = [];
    if (club.marca) subtitleParts.push(club.marca);
    if (club.modelo) subtitleParts.push(club.modelo);
    if (club.numero) subtitleParts.push('#' + club.numero);
    if (club.flex) subtitleParts.push(club.flex);

    const confidenceLabel = TECH_TYPES.indexOf(club.tipo) !== -1 ? confidenceBadge(club) : '';

    return `
      <div class="item-card">
        <div class="item-card__main">
          <div class="item-card__glyph">${golfIcon(club.tipo)}</div>
          <div style="min-width:0;">
            <div class="item-card__title">${club.nombre || typeLabel(club.tipo)}</div>
            <div class="item-card__subtitle">${subtitleParts.join(' · ') || 'Sin datos técnicos cargados'}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          ${confidenceLabel}
          <div class="item-card__actions">
            <button class="btn btn--icon" data-edit="${club.id}" title="Editar" aria-label="Editar">${editIcon()}</button>
            <button class="btn btn--icon" data-delete="${club.id}" title="Eliminar" aria-label="Eliminar">${trashIcon()}</button>
          </div>
        </div>
      </div>
    `;
  }

  function confidenceBadge(club) {
    if (!GT.engine.confidence) return '';
    // Hierro/Wedge se liga al número/loft específico (campo "palo" del ejercicio).
    // Driver/Madera/Híbrido/Putter se liga al tipo de entrenamiento completo,
    // porque esos ejercicios no tienen selector de palo específico.
    const opts = (club.tipo === 'hierro' || club.tipo === 'wedge')
      ? { palo: club.numero }
      : { tipo: TIPO_ENTRENAMIENTO_POR_CLUB[club.tipo] };
    if ((club.tipo === 'hierro' || club.tipo === 'wedge') && !club.numero) {
      return '<span class="badge badge--neutral">Cargá el número/loft</span>';
    }
    const result = GT.engine.confidence.compute(opts);
    if (result.score === null) return `<span class="badge badge--neutral">Sin datos (${result.stats.muestras}/5)</span>`;
    const variant = result.status === 'good' ? 'badge--good' : result.status === 'warn' ? 'badge--warn' : 'badge--bad';
    return `<span class="badge ${variant}">Confianza ${result.score}</span>`;
  }

  const TIPO_ENTRENAMIENTO_POR_CLUB = {
    driver: 'driver',
    madera: 'madera',
    hibrido: 'hibrido',
    putter: 'putting',
  };

  function openForm(rootView, clubId) {
    editingId = clubId;
    const existing = clubId ? GT.storage.getById(GT.schema.COLLECTIONS.CLUBS, clubId) : null;
    const data = existing || { tipo: 'driver' };

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal__header">
          <h2 class="card__title" id="modal-title">${existing ? 'Editar' : 'Agregar'} equipamiento</h2>
          <button class="btn btn--icon" id="modal-close" aria-label="Cerrar">${closeIcon()}</button>
        </div>
        <form id="club-form">
          <div class="field" style="margin-bottom: var(--space-4);">
            <span class="field__label">Tipo</span>
            <div class="chip-select" id="chip-tipo">
              ${CLUB_TYPES.map((t) => `<button type="button" class="chip ${t.value === data.tipo ? 'is-active' : ''}" data-tipo="${t.value}">${t.label}</button>`).join('')}
            </div>
          </div>

          <div class="form-grid" style="margin-bottom: var(--space-4);">
            <div class="field">
              <label class="field__label" for="f-nombre">Nombre / apodo</label>
              <input class="input" id="f-nombre" value="${escapeAttr(data.nombre)}" placeholder="Ej: Driver de juego" />
            </div>
            <div class="field">
              <label class="field__label" for="f-marca">Marca</label>
              <input class="input" id="f-marca" value="${escapeAttr(data.marca)}" />
            </div>
            <div class="field">
              <label class="field__label" for="f-modelo">Modelo</label>
              <input class="input" id="f-modelo" value="${escapeAttr(data.modelo)}" />
            </div>
            <div class="field">
              <label class="field__label" for="f-numero">Número / loft de palo</label>
              <input class="input" id="f-numero" value="${escapeAttr(data.numero)}" placeholder="Ej: 7, PW, 54°" />
            </div>
          </div>

          <div id="tech-fields"></div>

          <div class="field" style="margin-top: var(--space-4);">
            <label class="field__label" for="f-comentarios">Comentarios</label>
            <textarea class="textarea" id="f-comentarios">${data.comentarios || ''}</textarea>
          </div>

          <div class="form-actions">
            ${existing ? '<button type="button" class="btn btn--danger" id="btn-delete-inline">Eliminar</button>' : ''}
            <button type="button" class="btn btn--ghost" id="modal-cancel">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const techFieldsEl = backdrop.querySelector('#tech-fields');
    let currentTipo = data.tipo;
    renderTechFields(techFieldsEl, currentTipo, data);

    backdrop.querySelectorAll('[data-tipo]').forEach((chip) => {
      chip.addEventListener('click', () => {
        currentTipo = chip.dataset.tipo;
        backdrop.querySelectorAll('[data-tipo]').forEach((c) => c.classList.toggle('is-active', c === chip));
        renderTechFields(techFieldsEl, currentTipo, data);
      });
    });

    function close() {
      backdrop.remove();
      editingId = null;
    }

    backdrop.querySelector('#modal-close').addEventListener('click', close);
    backdrop.querySelector('#modal-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    if (existing) {
      backdrop.querySelector('#btn-delete-inline').addEventListener('click', () => {
        GT.storage.remove(GT.schema.COLLECTIONS.CLUBS, existing.id);
        GT.utils.showToast('Eliminado de la bolsa');
        close();
        render(rootView);
      });
    }

    backdrop.querySelector('#club-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        tipo: currentTipo,
        nombre: backdrop.querySelector('#f-nombre').value.trim(),
        marca: backdrop.querySelector('#f-marca').value.trim(),
        modelo: backdrop.querySelector('#f-modelo').value.trim(),
        numero: backdrop.querySelector('#f-numero').value.trim(),
        comentarios: backdrop.querySelector('#f-comentarios').value.trim(),
      };
      if (TECH_TYPES.indexOf(currentTipo) !== -1) {
        payload.lie = readVal(backdrop, '#f-lie');
        payload.loft = readVal(backdrop, '#f-loft');
        payload.longitud = readVal(backdrop, '#f-longitud');
        payload.bounce = readVal(backdrop, '#f-bounce');
        payload.grind = readVal(backdrop, '#f-grind');
        payload.pesoVara = readVal(backdrop, '#f-peso');
        payload.flex = readVal(backdrop, '#f-flex');
      }

      if (existing) {
        GT.storage.update(GT.schema.COLLECTIONS.CLUBS, existing.id, payload);
        GT.utils.showToast('Cambios guardados');
      } else {
        GT.storage.insert(GT.schema.COLLECTIONS.CLUBS, payload);
        GT.utils.showToast('Agregado a la bolsa');
      }
      close();
      render(rootView);
    });
  }

  function readVal(root, selector) {
    const el = root.querySelector(selector);
    return el ? el.value.trim() : '';
  }

  function renderTechFields(container, tipo, data) {
    if (TECH_TYPES.indexOf(tipo) === -1) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <div class="form-grid">
        <div class="field">
          <label class="field__label" for="f-lie">Lie</label>
          <input class="input" id="f-lie" value="${escapeAttr(data.lie)}" />
        </div>
        <div class="field">
          <label class="field__label" for="f-loft">Loft</label>
          <input class="input" id="f-loft" value="${escapeAttr(data.loft)}" />
        </div>
        <div class="field">
          <label class="field__label" for="f-longitud">Longitud</label>
          <input class="input" id="f-longitud" value="${escapeAttr(data.longitud)}" />
        </div>
        <div class="field">
          <label class="field__label" for="f-bounce">Bounce</label>
          <input class="input" id="f-bounce" value="${escapeAttr(data.bounce)}" />
        </div>
        <div class="field">
          <label class="field__label" for="f-grind">Grind</label>
          <input class="input" id="f-grind" value="${escapeAttr(data.grind)}" />
        </div>
        <div class="field">
          <label class="field__label" for="f-peso">Peso de la vara</label>
          <input class="input" id="f-peso" value="${escapeAttr(data.pesoVara)}" />
        </div>
        <div class="field">
          <label class="field__label" for="f-flex">Flex</label>
          <select class="select" id="f-flex">
            <option value="">—</option>
            ${FLEX_OPTIONS.map((f) => `<option value="${f}" ${data.flex === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }

  function confirmDelete(rootView, id) {
    const club = GT.storage.getById(GT.schema.COLLECTIONS.CLUBS, id);
    if (!club) return;
    if (!window.confirm(`¿Eliminar "${club.nombre || typeLabel(club.tipo)}" de la bolsa? Esta acción no se puede deshacer.`)) return;
    GT.storage.remove(GT.schema.COLLECTIONS.CLUBS, id);
    GT.utils.showToast('Eliminado de la bolsa');
    render(rootView);
  }

  function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
  }

  function golfIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20l8-16 4 2-8 16-4-2z"/></svg>';
  }
  function editIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
  }
  function trashIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
  }
  function closeIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  }

  GT.modules = GT.modules || {};
  GT.modules['bag'] = { render: render };
})(window.GT = window.GT || {});

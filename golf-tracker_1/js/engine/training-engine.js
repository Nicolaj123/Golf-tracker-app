// ============================================================
// TRAINING-ENGINE.JS
// Motor único que renderiza el flujo de "cargar un entrenamiento"
// para cualquiera de los 7 tipos definidos en TRAINING_CONFIGS.
// Los módulos putting.js / driver.js / etc. son wrappers de una
// línea que llaman a renderTrainingModule(container, tipo).
//
// SIMPLIFICACIÓN DE DISEÑO (documentada a propósito): en vez de
// guardar cada golpe individual como un Shot con coordenadas x/y,
// cada ejercicio guarda contadores agregados (aciertos, errores,
// conteo por tipo de contacto, conteo por dirección). Esto alcanza
// para todas las estadísticas y el índice de confianza. El mapa de
// dispersión con coordenadas reales queda como punto de integración
// futura (Garmin/Arccos/TrackMan), tal como está previsto en la
// arquitectura original.
// ============================================================

(function (GT) {
  'use strict';

  const PRACTICE_KEY = 'golfTrackerEntrenamientoPractice';
  // Estado del panel de Modo práctica — se reinicia cada vez que se cambia de categoría o se finaliza.
  let practiceState = { tipo: null, palo: null, aciertos: 0, errores: 0 };

  function isPracticeMode() {
    return localStorage.getItem(PRACTICE_KEY) === '1';
  }

  function setPracticeMode(on) {
    localStorage.setItem(PRACTICE_KEY, on ? '1' : '0');
  }

  function renderTrainingModule(container, tipo) {
    const config = GT.schema.TRAINING_CONFIGS[tipo];
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS).filter((s) => s.tipoEntrenamiento === tipo);
    const practice = isPracticeMode();
    if (practiceState.tipo !== tipo) practiceState = { tipo: tipo, palo: null, aciertos: 0, errores: 0 };

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: var(--space-5); gap: var(--space-3); flex-wrap:wrap;">
        <p style="color: var(--color-text-secondary); font-size: var(--fs-small); max-width: 60ch;">
          ${sessions.length ? sessions.length + ' entrenamientos registrados.' : 'Todavía no registraste entrenamientos de ' + config.label.toLowerCase() + '.'}
        </p>
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <button type="button" class="chip ${practice ? 'is-active' : ''}" id="btn-practice-toggle">Modo práctica</button>
          ${practice ? '' : '<button class="btn btn--primary" id="btn-new-session">+ Nuevo entrenamiento</button>'}
        </div>
      </div>
      ${practice ? '<div id="practice-panel" style="margin-bottom: var(--space-6);"></div>' : '<div id="session-summary"></div>'}
      <div id="session-history" style="margin-top: var(--space-6);"></div>
    `;

    container.querySelector('#btn-practice-toggle').addEventListener('click', () => {
      setPracticeMode(!practice);
      renderTrainingModule(container, tipo);
    });

    if (practice) {
      renderPracticePanel(container.querySelector('#practice-panel'), tipo, config, container);
    } else {
      renderQuickStats(container.querySelector('#session-summary'), sessions);
      container.querySelector('#btn-new-session').addEventListener('click', () => openSessionForm(container, tipo));
    }

    renderHistory(container.querySelector('#session-history'), sessions, tipo);
  }

  // ------------------------------------------------------------
  // Modo práctica: mismo patrón que Driving Range pero dentro de
  // cada categoría — elegís palo si corresponde, después son solo
  // botones grandes de Acierto/Error con autoguardado al finalizar.
  // ------------------------------------------------------------
  function renderPracticePanel(el, tipo, config, rootContainer) {
    const needsPalo = config.clubSelector && !practiceState.palo;

    if (needsPalo) {
      el.innerHTML = `
        <div class="card" style="text-align:center;">
          <p class="field__label" style="margin-bottom: var(--space-3);">Elegí el palo</p>
          <div class="chip-select" style="justify-content:center;">
            ${config.clubOptions.map((c) => `<button type="button" class="chip toggle-lg" data-palo="${c}">${c}</button>`).join('')}
          </div>
        </div>
      `;
      el.querySelectorAll('[data-palo]').forEach((btn) => {
        btn.addEventListener('click', () => {
          practiceState.palo = btn.dataset.palo;
          renderPracticePanel(el, tipo, config, rootContainer);
        });
      });
      return;
    }

    const total = practiceState.aciertos + practiceState.errores;
    el.innerHTML = `
      <div class="card" style="text-align:center;">
        ${practiceState.palo ? `<span class="badge badge--data" style="margin-bottom: var(--space-3); display:inline-block;">${practiceState.palo}</span>` : ''}
        <div class="kpi__value" style="font-size: 2.4rem;">${total}</div>
        <div class="card__meta" style="margin-bottom: var(--space-5);">golpes en esta sesión</div>
        <div style="display:flex; flex-direction:column; gap: var(--space-3); max-width: 360px; margin: 0 auto;">
          <button type="button" class="btn btn--primary" data-tap="aciertos" style="padding: var(--space-4); font-size: 1.1rem;">+ Acierto (${practiceState.aciertos})</button>
          <button type="button" class="btn btn--ghost" data-tap="errores" style="padding: var(--space-4); font-size: 1.1rem;">+ Error (${practiceState.errores})</button>
        </div>
        <div style="display:flex; justify-content:center; gap: var(--space-3); margin-top: var(--space-5);">
          ${config.clubSelector ? '<button type="button" class="btn btn--ghost btn--sm" id="btn-change-palo">Cambiar palo</button>' : ''}
          <button type="button" class="btn btn--primary" id="btn-finish-practice">Finalizar sesión</button>
        </div>
      </div>
    `;

    el.querySelectorAll('[data-tap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        practiceState[btn.dataset.tap]++;
        renderPracticePanel(el, tipo, config, rootContainer);
      });
    });

    const changePaloBtn = el.querySelector('#btn-change-palo');
    if (changePaloBtn) {
      changePaloBtn.addEventListener('click', () => {
        if (total > 0 && !window.confirm('Cambiar de palo cierra esta sesión de ' + practiceState.palo + '. ¿Continuar?')) return;
        finishPracticeSession(tipo, config, rootContainer, false);
        practiceState = { tipo: tipo, palo: null, aciertos: 0, errores: 0 };
        renderTrainingModule(rootContainer, tipo);
      });
    }

    el.querySelector('#btn-finish-practice').addEventListener('click', () => {
      finishPracticeSession(tipo, config, rootContainer, true);
      practiceState = { tipo: tipo, palo: null, aciertos: 0, errores: 0 };
      renderTrainingModule(rootContainer, tipo);
    });
  }

  function finishPracticeSession(tipo, config, rootContainer, showToast) {
    const total = practiceState.aciertos + practiceState.errores;
    if (!total) return;

    const ejercicio = {
      categoria: null,
      nombre: config.label + ' (modo práctica)',
      palo: practiceState.palo || null,
      distancia: null,
      carryPromedio: null,
      totalPromedio: null,
      calidad: null,
      aciertos: practiceState.aciertos,
      errores: practiceState.errores,
      golpes: total,
      contactCounts: {},
      directionCounts: {},
      notas: '',
    };

    GT.storage.insert(GT.schema.COLLECTIONS.SESSIONS, {
      tipoEntrenamiento: tipo,
      fecha: GT.utils.todayISO(),
      hora: GT.utils.nowHHMM(),
      duracionMin: 0,
      condiciones: {},
      notasGenerales: 'Cargado en Modo práctica',
      ejercicios: [ejercicio],
    });

    if (showToast) GT.utils.showToast('Entrenamiento guardado');
  }

  function renderQuickStats(el, sessions) {
    if (!sessions.length) { el.innerHTML = ''; return; }
    let totalGolpes = 0, totalAciertos = 0;
    sessions.forEach((s) => (s.ejercicios || []).forEach((ex) => {
      totalGolpes += ex.golpes || 0;
      totalAciertos += ex.aciertos || 0;
    }));
    const pct = totalGolpes ? GT.utils.round((totalAciertos / totalGolpes) * 100, 0) : null;

    el.innerHTML = `
      <div class="grid-kpi">
        <div class="kpi"><span class="kpi__label">Entrenamientos</span><span class="kpi__value">${sessions.length}</span></div>
        <div class="kpi"><span class="kpi__label">Golpes totales</span><span class="kpi__value">${totalGolpes}</span></div>
        <div class="kpi"><span class="kpi__label">% de acierto</span><span class="kpi__value">${pct !== null ? pct + '%' : '—'}</span></div>
      </div>
    `;
  }

  function renderHistory(el, sessions, tipo) {
    if (!sessions.length) {
      el.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l2.5 2.5"></path></svg>
          <h2 class="empty-state__title">Sin historial todavía</h2>
          <p>Registrá tu primer entrenamiento con el botón de arriba.</p>
        </div>
      `;
      return;
    }
    const sorted = sessions.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    el.innerHTML = `
      <div class="card__header" style="padding:0; margin-bottom: var(--space-3);"><h2 class="card__title">Historial</h2></div>
      <div style="display:flex; flex-direction:column; gap: var(--space-3);">
        ${sorted.map((s) => sessionCard(s)).join('')}
      </div>
    `;
    el.querySelectorAll('[data-delete-session]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!window.confirm('¿Eliminar este entrenamiento?')) return;
        GT.storage.remove(GT.schema.COLLECTIONS.SESSIONS, btn.dataset.deleteSession);
        GT.utils.showToast('Entrenamiento eliminado');
        renderTrainingModule(el.closest('.view'), tipo);
      });
    });
  }

  function sessionCard(session) {
    const ejercicios = session.ejercicios || [];
    const totalGolpes = ejercicios.reduce((sum, e) => sum + (e.golpes || 0), 0);
    const totalAciertos = ejercicios.reduce((sum, e) => sum + (e.aciertos || 0), 0);
    const pct = totalGolpes ? GT.utils.round((totalAciertos / totalGolpes) * 100, 0) + '%' : '—';
    return `
      <div class="card card--tight" id="session-${session.id}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div class="item-card__title">${GT.utils.formatDate(session.fecha)} ${session.hora ? '· ' + session.hora : ''}</div>
            <div class="item-card__subtitle">${ejercicios.length} ejercicio(s) · ${totalGolpes} golpes · ${pct} de acierto${session.duracionMin ? ' · ' + session.duracionMin + ' min' : ''}</div>
          </div>
          <button class="btn btn--icon" data-delete-session="${session.id}" aria-label="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
        ${ejercicios.length ? `
          <div style="margin-top: var(--space-3); display:flex; flex-direction:column; gap: 6px;">
            ${ejercicios.map((e) => `
              <div style="display:flex; justify-content:space-between; font-size: var(--fs-small); color: var(--color-text-secondary);">
                <span>${e.nombre}${e.palo ? ' (' + e.palo + ')' : ''}</span>
                <span>${e.aciertos || 0}/${e.golpes || 0} ${e.golpes ? '(' + GT.utils.pct(e.aciertos, e.golpes) + ')' : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${session.notasGenerales ? `<p style="margin-top: var(--space-3); font-size: var(--fs-small); color: var(--color-text-muted);">"${session.notasGenerales}"</p>` : ''}
      </div>
    `;
  }

  // ------------------------------------------------------------
  // Formulario de carga de un entrenamiento nuevo
  // ------------------------------------------------------------
  function openSessionForm(rootView, tipo) {
    const config = GT.schema.TRAINING_CONFIGS[tipo];
    const session = {
      fecha: GT.utils.todayISO(),
      hora: GT.utils.nowHHMM(),
      duracionMin: '',
      condiciones: {},
      ejercicios: [],
      notasGenerales: '',
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="max-width: 640px;">
        <div class="modal__header">
          <h2 class="card__title">Nuevo entrenamiento · ${config.label}</h2>
          <button class="btn btn--icon" id="modal-close">${closeIcon()}</button>
        </div>

        <div class="form-grid" style="margin-bottom: var(--space-5);">
          <div class="field">
            <label class="field__label" for="f-fecha">Fecha</label>
            <input class="input" type="date" id="f-fecha" value="${session.fecha}" />
          </div>
          <div class="field">
            <label class="field__label" for="f-hora">Hora</label>
            <input class="input" type="time" id="f-hora" value="${session.hora}" />
          </div>
          <div class="field">
            <label class="field__label" for="f-duracion">Duración (min)</label>
            <input class="input" type="number" min="0" id="f-duracion" placeholder="60" />
          </div>
          <div class="field">
            <label class="field__label" for="f-cancha">Cancha</label>
            <input class="input" id="f-cancha" placeholder="Opcional" />
          </div>
        </div>

        <div class="card__header" style="padding:0;">
          <h2 class="card__title" style="font-size: var(--fs-body);">Ejercicios</h2>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-add-exercise">+ Agregar ejercicio</button>
        </div>
        <div id="exercise-list" style="display:flex; flex-direction:column; gap: var(--space-3); margin: var(--space-3) 0;"></div>

        <div class="field" style="margin-top: var(--space-3);">
          <label class="field__label" for="f-notas">Notas generales</label>
          <textarea class="textarea" id="f-notas"></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn--ghost" id="modal-cancel">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-save-session">Guardar entrenamiento</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const exerciseListEl = backdrop.querySelector('#exercise-list');
    const exercises = []; // estado local del form

    function addExerciseRow() {
      const rowId = GT.utils.generateId('row');
      exercises.push({ rowId: rowId, aciertos: 0, errores: 0, contactCounts: {}, directionCounts: {} });
      renderExerciseRows();
    }

    function renderExerciseRows() {
      exerciseListEl.innerHTML = exercises.map((ex) => exerciseRowTemplate(ex, config)).join('');
      exercises.forEach((ex) => wireExerciseRow(ex, config));
    }

    function wireExerciseRow(ex, config) {
      const row = exerciseListEl.querySelector(`[data-row="${ex.rowId}"]`);
      if (!row) return;

      const nombreSel = row.querySelector('[data-field="nombre"]');
      if (nombreSel) nombreSel.addEventListener('change', () => { ex.nombre = nombreSel.value; });

      const paloSel = row.querySelector('[data-field="palo"]');
      if (paloSel) paloSel.addEventListener('change', () => { ex.palo = paloSel.value; });

      const distInput = row.querySelector('[data-field="distancia"]');
      if (distInput) distInput.addEventListener('input', () => { ex.distancia = distInput.value; });

      const carryInput = row.querySelector('[data-field="carry"]');
      if (carryInput) carryInput.addEventListener('input', () => { ex.carryPromedio = carryInput.value; });

      const totalInput = row.querySelector('[data-field="total"]');
      if (totalInput) totalInput.addEventListener('input', () => { ex.totalPromedio = totalInput.value; });

      const notesInput = row.querySelector('[data-field="notas"]');
      if (notesInput) notesInput.addEventListener('input', () => { ex.notas = notesInput.value; });

      const acBtn = row.querySelector('[data-tap="acierto"]');
      const erBtn = row.querySelector('[data-tap="error"]');
      const counterEl = row.querySelector('[data-counter]');
      function refreshCounter() {
        const total = ex.aciertos + ex.errores;
        counterEl.textContent = ex.aciertos + '/' + total + (total ? ' (' + GT.utils.pct(ex.aciertos, total) + ')' : '');
      }
      if (acBtn) acBtn.addEventListener('click', () => { ex.aciertos++; refreshCounter(); });
      if (erBtn) erBtn.addEventListener('click', () => { ex.errores++; refreshCounter(); });

      row.querySelectorAll('[data-quality]').forEach((btn) => {
        btn.addEventListener('click', () => {
          ex.calidad = ex.calidad === btn.dataset.quality ? null : btn.dataset.quality;
          row.querySelectorAll('[data-quality]').forEach((b) => b.classList.toggle('is-active', b === btn && ex.calidad));
        });
      });

      row.querySelectorAll('[data-contact]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.contact;
          ex.contactCounts[key] = (ex.contactCounts[key] || 0) + 1;
          btn.querySelector('.chip-count').textContent = ex.contactCounts[key];
        });
      });

      row.querySelectorAll('[data-direction]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.direction;
          ex.directionCounts[key] = (ex.directionCounts[key] || 0) + 1;
          btn.querySelector('.chip-count').textContent = ex.directionCounts[key];
        });
      });

      const removeBtn = row.querySelector('[data-remove-row]');
      if (removeBtn) removeBtn.addEventListener('click', () => {
        const idx = exercises.findIndex((e) => e.rowId === ex.rowId);
        if (idx !== -1) exercises.splice(idx, 1);
        renderExerciseRows();
      });
    }

    backdrop.querySelector('#btn-add-exercise').addEventListener('click', addExerciseRow);
    addExerciseRow(); // arranca con un ejercicio ya listo para cargar

    function close() { backdrop.remove(); }
    backdrop.querySelector('#modal-close').addEventListener('click', close);
    backdrop.querySelector('#modal-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#btn-save-session').addEventListener('click', () => {
      const payload = {
        tipoEntrenamiento: tipo,
        fecha: backdrop.querySelector('#f-fecha').value || GT.utils.todayISO(),
        hora: backdrop.querySelector('#f-hora').value,
        duracionMin: Number(backdrop.querySelector('#f-duracion').value) || 0,
        condiciones: { cancha: backdrop.querySelector('#f-cancha').value.trim() },
        notasGenerales: backdrop.querySelector('#f-notas').value.trim(),
        ejercicios: exercises
          .filter((e) => e.nombre || e.aciertos || e.errores)
          .map((e) => ({
            categoria: e.categoria || null,
            nombre: e.nombre || config.label,
            palo: e.palo || null,
            distancia: e.distancia || null,
            carryPromedio: e.carryPromedio || null,
            totalPromedio: e.totalPromedio || null,
            calidad: e.calidad || null,
            aciertos: e.aciertos || 0,
            errores: e.errores || 0,
            golpes: (e.aciertos || 0) + (e.errores || 0),
            contactCounts: e.contactCounts,
            directionCounts: e.directionCounts,
            notas: e.notas || '',
          })),
      };

      if (!payload.ejercicios.length) {
        window.alert('Cargá al menos un ejercicio con resultados antes de guardar.');
        return;
      }

      GT.storage.insert(GT.schema.COLLECTIONS.SESSIONS, payload);
      GT.utils.showToast('Entrenamiento guardado');
      close();
      renderTrainingModule(rootView, tipo);
    });
  }

  function exerciseRowTemplate(ex, config) {
    const nameOptions = buildNameOptions(config);
    return `
      <div class="card card--tight" data-row="${ex.rowId}">
        <div class="form-grid">
          ${nameOptions}
          ${config.clubSelector ? `
            <div class="field">
              <label class="field__label">Palo</label>
              <select class="select" data-field="palo">
                <option value="">—</option>
                ${config.clubOptions.map((c) => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          ${config.trackDistance ? `
            <div class="field">
              <label class="field__label">Distancia objetivo</label>
              <input class="input" type="text" data-field="distancia" placeholder="m / yd" />
            </div>
          ` : ''}
        </div>

        ${config.trackDistance && (config.label === 'Driver' || config.label === 'Madera' || config.label === 'Híbrido' || config.label === 'Hierros' || config.label === 'Wedges' || config.label === 'Bunker' || config.label === 'Chipping') ? `
          <div class="form-grid" style="margin-top: var(--space-3);">
            <div class="field">
              <label class="field__label">Carry promedio logrado</label>
              <input class="input" type="text" data-field="carry" placeholder="Opcional" />
            </div>
            <div class="field">
              <label class="field__label">Total promedio logrado</label>
              <input class="input" type="text" data-field="total" placeholder="Opcional" />
            </div>
          </div>
        ` : ''}

        <div style="margin-top: var(--space-4); display:flex; align-items:center; gap: var(--space-3); flex-wrap:wrap;">
          <button type="button" class="btn btn--primary btn--sm" data-tap="acierto">+ Acierto</button>
          <button type="button" class="btn btn--ghost btn--sm" data-tap="error">+ Error</button>
          <span data-counter style="font-family: var(--font-display); font-weight:600;">0/0</span>
          <button type="button" class="btn btn--icon" data-remove-row style="margin-left:auto;" aria-label="Quitar ejercicio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        ${config.trackQuality ? `
          <div class="chip-select" style="margin-top: var(--space-3);">
            ${GT.schema.QUALITY_LEVELS.map((q) => `<button type="button" class="chip" data-quality="${q}">${q}</button>`).join('')}
          </div>
        ` : ''}

        ${config.trackContact ? `
          <div style="margin-top: var(--space-3);">
            <span class="field__hint">Tipo de contacto (tocá para sumar)</span>
            <div class="chip-select" style="margin-top: 6px;">
              ${GT.schema.CONTACT_TYPES.map((c) => `<button type="button" class="chip" data-contact="${c}">${c} <span class="chip-count">0</span></button>`).join('')}
            </div>
          </div>
        ` : ''}

        ${config.trackDirection ? `
          <div style="margin-top: var(--space-3);">
            <span class="field__hint">Patrón de dirección (tocá para sumar)</span>
            <div class="chip-select" style="margin-top: 6px;">
              ${config.trackDirection.map((d) => `<button type="button" class="chip" data-direction="${d}">${d} <span class="chip-count">0</span></button>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="field" style="margin-top: var(--space-3);">
          <label class="field__label">Notas del ejercicio</label>
          <input class="input" data-field="notas" placeholder="Opcional" />
        </div>
      </div>
    `;
  }

  function buildNameOptions(config) {
    if (config.categories) {
      const groups = Object.keys(config.categories);
      return `
        <div class="field">
          <label class="field__label">Ejercicio</label>
          <select class="select" data-field="nombre">
            <option value="">Elegí un ejercicio</option>
            ${groups.map((g) => `
              <optgroup label="${g.replace(/_/g, ' ')}">
                ${config.categories[g].map((name) => `<option value="${name}">${name}</option>`).join('')}
              </optgroup>
            `).join('')}
          </select>
        </div>
      `;
    }
    if (config.exercises) {
      return `
        <div class="field">
          <label class="field__label">Ejercicio</label>
          <select class="select" data-field="nombre">
            <option value="">Elegí un ejercicio</option>
            ${config.exercises.map((name) => `<option value="${name}">${name}</option>`).join('')}
          </select>
        </div>
      `;
    }
    // Sin lista predefinida (ej. hierros: el "ejercicio" es el palo elegido)
    return `
      <div class="field">
        <label class="field__label">Ejercicio / descripción</label>
        <input class="input" data-field="nombre" placeholder="Ej: Approach a green" />
      </div>
    `;
  }

  function closeIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  }

  GT.engine = GT.engine || {};
  GT.engine.renderTrainingModule = renderTrainingModule;
})(window.GT = window.GT || {});

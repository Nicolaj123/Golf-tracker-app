// ============================================================
// ENTRENAMIENTO-PALOS.JS
// Sección única "Entrenamiento": agrupa las 8 categorías (Driver,
// Madera, Híbrido, Hierros, Wedges, Bunker, Chipping, Putting) en
// una sola pantalla con un selector interno, en vez de tener cada
// una como pestaña separada del menú.
//
// Orden pedido por Nico: de palo más largo a más corto, con Putting
// al final (es el "palo" más corto).
//
// Cada categoría sigue guardando sus sesiones bajo su propio
// tipoEntrenamiento, así que el Dashboard, Estadísticas y Récords
// no se enteran del cambio de navegación: siguen leyendo los mismos
// datos de siempre.
// ============================================================

(function (GT) {
  'use strict';

  const CATEGORIES = [
    { tipo: 'driver', label: 'Driver' },
    { tipo: 'madera', label: 'Madera' },
    { tipo: 'hibrido', label: 'Híbrido' },
    { tipo: 'hierros', label: 'Hierros (3 a PW)' },
    { tipo: 'wedges', label: 'Wedges' },
    { tipo: 'bunker', label: 'Bunker' },
    { tipo: 'chipping', label: 'Chipping' },
    { tipo: 'putting', label: 'Putting' },
  ];

  // Se mantiene entre renders mientras la pestaña sigue abierta,
  // para no volver siempre a "Driver" al agregar un ejercicio.
  let activeTipo = 'driver';

  function render(container) {
    // Shortcut desde el Dashboard: llega con la categoría y la sesión puntual a mostrar.
    const target = GT.dashboardTarget && GT.dashboardTarget.type === 'session' ? GT.dashboardTarget : null;
    if (target) {
      activeTipo = target.tipo;
      GT.dashboardTarget = null;
    }

    container.innerHTML = `
      <div class="chip-select" id="cat-switch" style="margin-bottom: var(--space-5);">
        ${CATEGORIES.map((c) => `<button type="button" class="chip toggle-lg ${c.tipo === activeTipo ? 'is-active' : ''}" data-cat="${c.tipo}">${c.label}</button>`).join('')}
      </div>
      <div id="cat-content"></div>
    `;

    container.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTipo = btn.dataset.cat;
        container.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('is-active', b === btn));
        GT.engine.renderTrainingModule(container.querySelector('#cat-content'), activeTipo);
      });
    });

    GT.engine.renderTrainingModule(container.querySelector('#cat-content'), activeTipo);

    if (target) {
      setTimeout(() => {
        const card = document.getElementById('session-' + target.id);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('is-highlighted');
          setTimeout(() => card.classList.remove('is-highlighted'), 1700);
        }
      }, 60);
    }
  }

  GT.modules = GT.modules || {};
  GT.modules['entrenamiento'] = { render: render };
})(window.GT = window.GT || {});

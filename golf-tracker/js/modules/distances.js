// ============================================================
// DISTANCES.JS
// Tabla de distancias, 100% derivada de los "carry/total promedio
// logrado" que se cargan al finalizar un ejercicio de Driver,
// Madera, Hierros o Wedges. No hay carga manual acá: se actualiza
// sola con cada entrenamiento nuevo.
// ============================================================

(function (GT) {
  'use strict';

  function render(container) {
    const rows = [];

    rows.push(rowFor('Driver', GT.engine.stats.getTypeExerciseStats('driver')));
    rows.push(rowFor('Madera', GT.engine.stats.getTypeExerciseStats('madera')));
    rows.push(rowFor('Híbrido', GT.engine.stats.getTypeExerciseStats('hibrido')));
    GT.schema.IRON_NUMBERS.forEach((n) => rows.push(rowFor('Hierro ' + n, GT.engine.stats.getClubExerciseStats(n))));
    GT.schema.WEDGE_LOFTS.forEach((l) => rows.push(rowFor('Wedge ' + l, GT.engine.stats.getClubExerciseStats(l))));

    const withData = rows.filter((r) => r.muestras);

    container.innerHTML = `
      <p style="color: var(--color-text-secondary); font-size: var(--fs-small); margin-bottom: var(--space-5); max-width: 60ch;">
        Se completa sola con el campo "Carry / Total promedio logrado" que cargás al final de cada ejercicio de Driver, Madera, Híbrido, Hierros o Wedges.
      </p>
      ${withData.length ? tableHTML(rows) : emptyState()}
    `;
  }


  function rowFor(label, stats) {
    return { label: label, carryAvg: stats.carryAvg, carryMax: stats.carryMax, carryStdDev: stats.carryStdDev, totalAvg: stats.totalAvg, totalMax: stats.totalMax, muestras: stats.muestras };
  }

  function tableHTML(rows) {
    return `
      <div class="card" style="overflow-x:auto;">
        <table style="width:100%; border-collapse: collapse; font-size: var(--fs-small); white-space: nowrap;">
          <thead>
            <tr style="text-align:left; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border);">
              <th style="padding: var(--space-2) var(--space-3);">Palo</th>
              <th style="padding: var(--space-2) var(--space-3);">Carry prom.</th>
              <th style="padding: var(--space-2) var(--space-3);">Carry máx.</th>
              <th style="padding: var(--space-2) var(--space-3);">Dispersión</th>
              <th style="padding: var(--space-2) var(--space-3);">Total prom.</th>
              <th style="padding: var(--space-2) var(--space-3);">Total máx.</th>
              <th style="padding: var(--space-2) var(--space-3);">Golpes</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr style="border-bottom: 1px solid var(--color-border);">
                <td style="padding: var(--space-2) var(--space-3); font-weight:600;">${r.label}</td>
                <td style="padding: var(--space-2) var(--space-3);">${fmt(r.carryAvg)}</td>
                <td style="padding: var(--space-2) var(--space-3);">${fmt(r.carryMax)}</td>
                <td style="padding: var(--space-2) var(--space-3);">${fmt(r.carryStdDev)}</td>
                <td style="padding: var(--space-2) var(--space-3);">${fmt(r.totalAvg)}</td>
                <td style="padding: var(--space-2) var(--space-3);">${fmt(r.totalMax)}</td>
                <td style="padding: var(--space-2) var(--space-3); color: var(--color-text-muted);">${r.muestras || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function fmt(v) { return v === null || v === undefined ? '—' : v; }

  function emptyState() {
    return `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h18"></path><path d="M6 8l-3 4 3 4"></path><path d="M18 8l3 4-3 4"></path></svg>
        <h2 class="empty-state__title">Todavía no hay distancias cargadas</h2>
        <p>Registrá "carry / total promedio" en tus próximos entrenamientos de palos largos.</p>
      </div>
    `;
  }

  GT.modules = GT.modules || {};
  GT.modules['distances'] = { render: render };
})(window.GT = window.GT || {});

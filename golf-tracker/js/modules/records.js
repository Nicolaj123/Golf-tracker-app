// ============================================================
// RECORDS.JS
// Récords 100% calculados en vivo a partir de rounds/sessions.
// No se persisten ni se editan a mano — siempre reflejan la
// realidad actual de los datos.
// ============================================================

(function (GT) {
  'use strict';

  function render(container) {
    const rounds = GT.storage.getAll(GT.schema.COLLECTIONS.ROUNDS);

    if (!rounds.length) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M6 4h12v4a6 6 0 01-12 0V4z"></path></svg>
          <h2 class="empty-state__title">Todavía no hay récords</h2>
          <p>Se generan solos apenas cargues tu primera vuelta.</p>
        </div>
      `;
      return;
    }

    const records = computeRecords(rounds);

    container.innerHTML = `
      <div class="grid-kpi">
        ${records.map((r) => `
          <div class="kpi">
            <span class="kpi__label">${r.label}</span>
            <span class="kpi__value">${r.value}</span>
            ${r.meta ? `<span class="card__meta">${r.meta}</span>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="card" style="margin-top: var(--space-6);">
        <div class="card__header"><h2 class="card__title">Mayor distancia registrada por palo</h2></div>
        <div id="distance-records"></div>
      </div>
    `;

    renderDistanceRecords(container.querySelector('#distance-records'));
  }

  function computeRecords(rounds) {
    const relFmt = (n) => n === 0 ? 'E' : (n > 0 ? '+' + n : String(n));
    const best = (arr, fn, better) => arr.reduce((acc, r) => (acc === null || better(fn(r), fn(acc)) ? r : acc), null);

    const bestScore = best(rounds, (r) => r.scoreRelativo, (a, b) => a < b);
    const nine = rounds.filter((r) => r.tipo === '9' || r.tipo === 'par3');
    const eighteen = rounds.filter((r) => r.tipo === '18' || r.tipo === 'completa');
    const best9 = nine.length ? best(nine, (r) => r.scoreTotal, (a, b) => a < b) : null;
    const best18 = eighteen.length ? best(eighteen, (r) => r.scoreTotal, (a, b) => a < b) : null;
    const mostGIR = best(rounds, (r) => r.girPct || 0, (a, b) => a > b);
    const mostFairways = best(rounds, (r) => r.fairwaysPct || 0, (a, b) => a > b);
    const fewestPutts = best(rounds, (r) => r.puttsTotal, (a, b) => a < b);
    const mostBirdies = best(rounds, (r) => r.birdies || 0, (a, b) => a > b);
    const mostPars = best(rounds, (r) => r.pars || 0, (a, b) => a > b);
    const bestUpDown = rounds.filter((r) => r.upDownPct !== null && r.upDownPct !== undefined);
    const bestUpDownRound = bestUpDown.length ? best(bestUpDown, (r) => r.upDownPct, (a, b) => a > b) : null;
    const bestSand = rounds.filter((r) => r.sandSavePct !== null && r.sandSavePct !== undefined);
    const bestSandRound = bestSand.length ? best(bestSand, (r) => r.sandSavePct, (a, b) => a > b) : null;

    const records = [
      { label: 'Mejor score', value: bestScore ? relFmt(bestScore.scoreRelativo) : '—', meta: bestScore ? GT.utils.formatDate(bestScore.fecha) : '' },
      { label: 'Mejor vuelta 9 hoyos', value: best9 ? best9.scoreTotal : '—', meta: best9 ? GT.utils.formatDate(best9.fecha) : '' },
      { label: 'Mejor vuelta 18 hoyos', value: best18 ? best18.scoreTotal : '—', meta: best18 ? GT.utils.formatDate(best18.fecha) : '' },
      { label: 'Mayor GIR%', value: mostGIR ? mostGIR.girPct + '%' : '—', meta: mostGIR ? GT.utils.formatDate(mostGIR.fecha) : '' },
      { label: 'Mayor Fairways%', value: mostFairways ? mostFairways.fairwaysPct + '%' : '—', meta: mostFairways ? GT.utils.formatDate(mostFairways.fecha) : '' },
      { label: 'Menos putts', value: fewestPutts ? fewestPutts.puttsTotal : '—', meta: fewestPutts ? GT.utils.formatDate(fewestPutts.fecha) : '' },
      { label: 'Más birdies', value: mostBirdies ? mostBirdies.birdies : '—', meta: mostBirdies ? GT.utils.formatDate(mostBirdies.fecha) : '' },
      { label: 'Más pares', value: mostPars ? mostPars.pars : '—', meta: mostPars ? GT.utils.formatDate(mostPars.fecha) : '' },
      { label: 'Mejor Up & Down%', value: bestUpDownRound ? bestUpDownRound.upDownPct + '%' : '—', meta: bestUpDownRound ? GT.utils.formatDate(bestUpDownRound.fecha) : '' },
      { label: 'Mejor Sand Save%', value: bestSandRound ? bestSandRound.sandSavePct + '%' : '—', meta: bestSandRound ? GT.utils.formatDate(bestSandRound.fecha) : '' },
    ];
    return records;
  }

  function renderDistanceRecords(el) {
    const labels = ['driver', 'madera', 'hibrido'].concat(GT.schema.IRON_NUMBERS.map((n) => n)).concat(GT.schema.WEDGE_LOFTS);
    const displayNames = { driver: 'Driver', madera: 'Madera', hibrido: 'Híbrido' };

    const rows = labels.map((l) => {
      const stats = (l === 'driver' || l === 'madera' || l === 'hibrido')
        ? GT.engine.stats.getTypeExerciseStats(l)
        : GT.engine.stats.getClubExerciseStats(l);
      return { label: displayNames[l] || (GT.schema.IRON_NUMBERS.indexOf(l) !== -1 ? 'Hierro ' + l : 'Wedge ' + l), max: stats.carryMax };
    }).filter((r) => r.max !== null && r.max !== undefined);

    if (!rows.length) {
      el.innerHTML = `<p style="color: var(--color-text-secondary); font-size: var(--fs-small);">Todavía no hay carry registrado en ningún palo.</p>`;
      return;
    }

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; gap: var(--space-2);">
        ${rows.map((r) => `
          <div style="display:flex; justify-content:space-between; font-size: var(--fs-small); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border);">
            <span>${r.label}</span><span style="font-family: var(--font-display); font-weight:600;">${r.max}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  GT.modules = GT.modules || {};
  GT.modules['records'] = { render: render };
})(window.GT = window.GT || {});

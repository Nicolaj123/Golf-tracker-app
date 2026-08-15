// ============================================================
// PLANNER.JS
// Analiza las estadísticas ya calculadas por stats-engine y genera:
//   1) Insights en lenguaje natural (basados en reglas, no en IA
//      real — no hay backend ni modelo detrás, es lógica if/else
//      sobre los números que ya tenés cargados).
//   2) Un entrenamiento sugerido para la próxima sesión, repartiendo
//      un presupuesto de tiempo priorizando tus áreas más débiles.
// ============================================================

(function (GT) {
  'use strict';

  const TIME_BUDGET_MIN = 90;
  const TRAINING_TYPES_BY_AREA = {
    putting: ['putting'],
    approach: ['wedges', 'chipping'],
    hierros: ['hierros'],
    driver: ['driver'],
    juego_corto: ['chipping', 'bunker'],
    bunker: ['bunker'],
  };

  function render(container) {
    const areas = GT.engine.stats.getAreaStatuses();
    const withData = areas.filter((a) => a.pct !== null);

    if (withData.length < 2) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>
          <h2 class="empty-state__title">Necesito más datos</h2>
          <p>Registrá entrenamientos en al menos dos áreas distintas para que el planificador pueda comparar y sugerirte algo útil.</p>
        </div>
      `;
      return;
    }

    const insights = buildInsights(areas);
    const plan = buildPlan(areas);

    container.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-6);">
        <div class="card__header"><h2 class="card__title">Lo que dicen tus números</h2></div>
        <ul style="display:flex; flex-direction:column; gap: var(--space-3);">
          ${insights.map((i) => `
            <li style="display:flex; gap: var(--space-3); font-size: var(--fs-small);">
              <span class="badge ${badgeVariant(i.tone)}" style="flex-shrink:0;">${i.tone === 'good' ? '↑' : i.tone === 'bad' ? '↓' : 'i'}</span>
              <span>${i.text}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="card">
        <div class="card__header">
          <h2 class="card__title">Entrenamiento sugerido</h2>
          <span class="card__meta">${TIME_BUDGET_MIN} minutos</span>
        </div>
        <div style="display:flex; flex-direction:column; gap: var(--space-2);">
          ${plan.map((p) => `
            <div class="item-card" style="padding: var(--space-3) var(--space-4);">
              <div class="item-card__main">
                <div class="item-card__glyph">${p.minutos}'</div>
                <div>
                  <div class="item-card__title">${p.label}</div>
                  <div class="item-card__subtitle">${p.pct !== null ? p.pct + '% de acierto actual' : 'Sin datos todavía'}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function badgeVariant(tone) {
    if (tone === 'good') return 'badge--good';
    if (tone === 'bad') return 'badge--bad';
    return 'badge--data';
  }

  function buildInsights(areas) {
    const insights = [];
    const withData = areas.filter((a) => a.pct !== null);
    if (!withData.length) return insights;

    const sorted = withData.slice().sort((a, b) => a.pct - b.pct);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    insights.push({ tone: 'bad', text: weakest.label + ' es tu punto más débil, con ' + weakest.pct + '% de acierto en tus últimos entrenamientos.' });
    if (strongest.key !== weakest.key) {
      insights.push({ tone: 'good', text: strongest.label + ' es tu área más consistente, con ' + strongest.pct + '% de acierto.' });
    }

    areas.forEach((a) => {
      (TRAINING_TYPES_BY_AREA[a.key] || []).forEach((tipo) => {
        const trend = GT.engine.stats.getTrend(tipo);
        if (!trend || trend.direction === 'flat') return;
        const label = GT.schema.TRAINING_CONFIGS[tipo] ? GT.schema.TRAINING_CONFIGS[tipo].label : tipo;
        if (trend.direction === 'up') {
          insights.push({ tone: 'good', text: 'Tu ' + label + ' mejoró ' + Math.abs(trend.diff) + ' puntos en tus últimos entrenamientos respecto a los anteriores.' });
        } else {
          insights.push({ tone: 'bad', text: 'Tu ' + label + ' bajó ' + Math.abs(trend.diff) + ' puntos respecto a entrenamientos anteriores — convendría prestarle atención.' });
        }
      });
    });

    return insights.slice(0, 6);
  }

  function buildPlan(areas) {
    // Peso inverso al % de acierto: cuanto peor está, más minutos recibe.
    // Las áreas sin datos reciben un peso alto (60) para incentivar a probarlas.
    const weighted = areas.map((a) => ({ area: a, weight: a.pct === null ? 60 : Math.max(100 - a.pct, 10) }));
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

    const withMinutes = weighted
      .map((w) => ({ area: w.area, minutos: Math.round((w.weight / totalWeight) * TIME_BUDGET_MIN / 5) * 5 }))
      .filter((w) => w.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 5);

    return withMinutes.map((w) => ({ label: w.area.label, minutos: w.minutos, pct: w.area.pct }));
  }

  GT.modules = GT.modules || {};
  GT.modules['planner'] = { render: render };
})(window.GT = window.GT || {});

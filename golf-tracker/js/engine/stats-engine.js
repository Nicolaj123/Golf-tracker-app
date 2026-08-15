// ============================================================
// STATS-ENGINE.JS
// Única fuente de métricas derivadas. Ningún módulo de UI debe
// recalcular promedios/porcentajes por su cuenta: todo pasa por
// estas funciones para que Dashboard, Estadísticas, Objetivos y
// Récords siempre muestren el mismo número.
// ============================================================

(function (GT) {
  'use strict';

  const AREA_LABELS = {
    putting: 'Putting',
    driver: 'Driver',
    hierros: 'Hierros',
    approach: 'Approach', // wedges + chipping combinados
    bunker: 'Bunker',
    juego_corto: 'Juego corto', // chipping + bunker combinados
  };

  /** % de acierto global de un tipo de entrenamiento, sobre todas sus sesiones. */
  function getTrainingStats(tipo, sessions) {
    sessions = sessions || GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS);
    const filtered = sessions.filter((s) => s.tipoEntrenamiento === tipo);
    let golpes = 0, aciertos = 0, minutos = 0;
    filtered.forEach((s) => {
      minutos += s.duracionMin || 0;
      (s.ejercicios || []).forEach((e) => { golpes += e.golpes || 0; aciertos += e.aciertos || 0; });
    });
    const pct = golpes ? GT.utils.round((aciertos / golpes) * 100, 0) : null;
    return { tipo: tipo, sessionsCount: filtered.length, golpes: golpes, aciertos: aciertos, pct: pct, minutos: minutos, sessions: filtered };
  }

  /** Compara el % de las últimas N sesiones contra las N anteriores. Devuelve 'up' | 'down' | 'flat' | null. */
  function getTrend(tipo, n) {
    n = n || 5;
    const stats = getTrainingStats(tipo);
    const sorted = stats.sessions.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    if (sorted.length < 4) return null;
    const recent = sorted.slice(-n);
    const previous = sorted.slice(-n * 2, -n);
    const pctOf = (arr) => {
      let g = 0, a = 0;
      arr.forEach((s) => (s.ejercicios || []).forEach((e) => { g += e.golpes || 0; a += e.aciertos || 0; }));
      return g ? (a / g) * 100 : null;
    };
    const recentPct = pctOf(recent);
    const prevPct = pctOf(previous);
    if (recentPct === null || prevPct === null) return null;
    const diff = recentPct - prevPct;
    if (Math.abs(diff) < 2) return { direction: 'flat', diff: GT.utils.round(diff, 1) };
    return { direction: diff > 0 ? 'up' : 'down', diff: GT.utils.round(diff, 1) };
  }

  /** Estado de semáforo (good/warn/bad/none) para un % de acierto, con umbrales estándar de la app. */
  function statusFromPct(pct) {
    return GT.utils.semaforo(pct, { warnBelow: 75, badBelow: 55, higherIsBetter: true });
  }

  /** Estado de semáforo por área de juego, tal como se muestra en el Dashboard. */
  function getAreaStatuses() {
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS);
    const putting = getTrainingStats('putting', sessions);
    const driver = getTrainingStats('driver', sessions);
    const hierros = getTrainingStats('hierros', sessions);
    const wedges = getTrainingStats('wedges', sessions);
    const chipping = getTrainingStats('chipping', sessions);
    const bunker = getTrainingStats('bunker', sessions);

    // Approach = wedges + chipping combinados; Juego corto = chipping + bunker.
    const approachPct = combinePct([wedges, chipping]);
    const juegoCortoPct = combinePct([chipping, bunker]);

    return [
      { key: 'putting', label: AREA_LABELS.putting, pct: putting.pct, status: statusFromPct(putting.pct) },
      { key: 'approach', label: AREA_LABELS.approach, pct: approachPct, status: statusFromPct(approachPct) },
      { key: 'hierros', label: AREA_LABELS.hierros, pct: hierros.pct, status: statusFromPct(hierros.pct) },
      { key: 'driver', label: AREA_LABELS.driver, pct: driver.pct, status: statusFromPct(driver.pct) },
      { key: 'juego_corto', label: AREA_LABELS.juego_corto, pct: juegoCortoPct, status: statusFromPct(juegoCortoPct) },
      { key: 'bunker', label: AREA_LABELS.bunker, pct: bunker.pct, status: statusFromPct(bunker.pct) },
    ];
  }

  function combinePct(statsList) {
    let g = 0, a = 0;
    statsList.forEach((s) => { g += s.golpes; a += s.aciertos; });
    return g ? GT.utils.round((a / g) * 100, 0) : null;
  }

  /** KPIs del Dashboard. */
  function getDashboardKPIs() {
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS);
    const rounds = GT.storage.getAll(GT.schema.COLLECTIONS.ROUNDS);

    let golpes = 0, minutos = 0;
    sessions.forEach((s) => {
      minutos += s.duracionMin || 0;
      (s.ejercicios || []).forEach((e) => { golpes += e.golpes || 0; });
    });

    const putts = rounds.map((r) => r.puttsTotal).filter((v) => v !== undefined && v !== null);
    const scores = rounds.map((r) => r.scoreRelativo).filter((v) => v !== undefined && v !== null);

    return {
      entrenamientos: sessions.length,
      vueltas: rounds.length,
      horas: GT.utils.round(minutos / 60, 1),
      golpes: golpes,
      promedioPutts: putts.length ? GT.utils.round(GT.utils.average(putts), 1) : null,
      promedioScore: scores.length ? GT.utils.round(GT.utils.average(scores), 1) : null,
    };
  }

  /** Estadísticas agregadas por palo específico (hierro N° o loft de wedge), usadas por confidence.js y distances.js. */
  function getClubExerciseStats(clubLabel) {
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS);
    let golpes = 0, aciertos = 0;
    const carries = [];
    const totals = [];
    const fechas = [];
    sessions.forEach((s) => {
      (s.ejercicios || []).forEach((e) => {
        if (e.palo !== clubLabel && e.nombre !== clubLabel) return;
        golpes += e.golpes || 0;
        aciertos += e.aciertos || 0;
        if (e.carryPromedio) carries.push(Number(e.carryPromedio));
        if (e.totalPromedio) totals.push(Number(e.totalPromedio));
        fechas.push(s.fecha);
      });
    });
    return {
      golpes: golpes,
      aciertos: aciertos,
      pct: golpes ? GT.utils.round((aciertos / golpes) * 100, 0) : null,
      carryAvg: carries.length ? GT.utils.round(GT.utils.average(carries), 1) : null,
      carryMax: carries.length ? Math.max.apply(null, carries) : null,
      carryStdDev: carries.length ? GT.utils.round(GT.utils.stdDev(carries), 1) : null,
      totalAvg: totals.length ? GT.utils.round(GT.utils.average(totals), 1) : null,
      totalMax: totals.length ? Math.max.apply(null, totals) : null,
      muestras: golpes,
      fechas: fechas,
    };
  }

  /**
   * Estadísticas agregadas por TIPO de entrenamiento completo (todas las
   * sesiones de 'driver', 'madera', 'hibrido' o 'putting'), sin filtrar por
   * palo/nombre de ejercicio. Se usa para los tipos donde no tiene sentido
   * un selector de palo específico dentro del ejercicio (a diferencia de
   * hierros/wedges, que sí lo tienen vía el campo "palo").
   */
  function getTypeExerciseStats(tipo) {
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS).filter((s) => s.tipoEntrenamiento === tipo);
    let golpes = 0, aciertos = 0;
    const carries = [];
    const totals = [];
    const fechas = [];
    sessions.forEach((s) => (s.ejercicios || []).forEach((e) => {
      golpes += e.golpes || 0;
      aciertos += e.aciertos || 0;
      if (e.carryPromedio) carries.push(Number(e.carryPromedio));
      if (e.totalPromedio) totals.push(Number(e.totalPromedio));
      fechas.push(s.fecha);
    }));
    return {
      golpes: golpes,
      aciertos: aciertos,
      pct: golpes ? GT.utils.round((aciertos / golpes) * 100, 0) : null,
      carryAvg: carries.length ? GT.utils.round(GT.utils.average(carries), 1) : null,
      carryMax: carries.length ? Math.max.apply(null, carries) : null,
      carryStdDev: carries.length ? GT.utils.round(GT.utils.stdDev(carries), 1) : null,
      totalAvg: totals.length ? GT.utils.round(GT.utils.average(totals), 1) : null,
      totalMax: totals.length ? Math.max.apply(null, totals) : null,
      muestras: golpes,
      fechas: fechas,
    };
  }

  /** Calcula todos los totales derivados de una vuelta a partir de sus hoyos. Reutilizado por rounds.js y course-mode.js. */
  function computeRoundStats(holes) {
    holes = holes || [];
    let scoreTotal = 0, parTotal = 0, puttsTotal = 0, penales = 0;
    let birdies = 0, pars = 0, bogeys = 0, dobles = 0, triples = 0;
    let fairwayHits = 0, fairwayEligible = 0, greenHits = 0;
    let upDownHits = 0, upDownOpp = 0, sandHits = 0, sandOpp = 0;

    holes.forEach((h) => {
      const golpes = Number(h.golpes) || 0;
      const par = Number(h.par) || 0;
      scoreTotal += golpes;
      parTotal += par;
      puttsTotal += Number(h.putts) || 0;
      if (h.penalty) penales++;

      const diff = golpes - par;
      if (golpes) {
        if (diff <= -1) birdies++;
        else if (diff === 0) pars++;
        else if (diff === 1) bogeys++;
        else if (diff === 2) dobles++;
        else if (diff >= 3) triples++;
      }

      if (par !== 3) { // el fairway no aplica en par 3
        fairwayEligible++;
        if (h.fairway) fairwayHits++;
      }
      if (h.green) greenHits++;

      if (h.chip || h.arena) {
        upDownOpp++;
        if (h.upDown) upDownHits++;
      }
      if (h.arena) {
        sandOpp++;
        if (h.sandSave) sandHits++;
      }
    });

    const totalHoles = holes.length;
    return {
      scoreTotal: scoreTotal,
      parTotal: parTotal,
      scoreRelativo: scoreTotal - parTotal,
      puttsTotal: puttsTotal,
      promedioPutts: totalHoles ? GT.utils.round(puttsTotal / totalHoles, 2) : null,
      penales: penales,
      birdies: birdies, pars: pars, bogeys: bogeys, dobles: dobles, triples: triples,
      fairwaysPct: fairwayEligible ? GT.utils.round((fairwayHits / fairwayEligible) * 100, 0) : null,
      girPct: totalHoles ? GT.utils.round((greenHits / totalHoles) * 100, 0) : null,
      upDownPct: upDownOpp ? GT.utils.round((upDownHits / upDownOpp) * 100, 0) : null,
      sandSavePct: sandOpp ? GT.utils.round((sandHits / sandOpp) * 100, 0) : null,
    };
  }

  GT.engine = GT.engine || {};
  GT.engine.stats = {
    getTrainingStats: getTrainingStats,
    getTrend: getTrend,
    statusFromPct: statusFromPct,
    getAreaStatuses: getAreaStatuses,
    getDashboardKPIs: getDashboardKPIs,
    getClubExerciseStats: getClubExerciseStats,
    getTypeExerciseStats: getTypeExerciseStats,
    computeRoundStats: computeRoundStats,
    AREA_LABELS: AREA_LABELS,
  };
})(window.GT = window.GT || {});
